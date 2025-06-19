
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
// Textarea import removed as it's no longer used
import { PageTitle } from '@/components/shared/PageTitle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldPlus, Loader2, CheckCircle, Lock, Facebook, Twitter, Youtube, Link2 as LinkIcon, AlertCircle, Gamepad2, ArrowLeft, Globe, Server as ServerIcon, Crosshair } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import type { Guild, GuildMemberRoleInfo, CustomRole } from '@/types/guildmaster';
import { GuildPermission } from '@/types/guildmaster';
import { useToast } from '@/hooks/use-toast';

const tlRegions = [
  { value: "Korea", label: "Coreia" },
  { value: "NA East", label: "América do Norte (Leste)" },
  { value: "NA West", label: "América do Norte (Oeste)" },
  { value: "Europe", label: "Europa" },
  { value: "South America", label: "América do Sul" },
  { value: "Asia Pacific", label: "Ásia-Pacífico" },
];

const tlServers: Record<string, Array<{ value: string; label: string }>> = {
  "Korea": [ { value: "Belluatan", label: "Belluatan" }, { value: "Greedal", label: "Greedal" }, { value: "Kallis", label: "Kallis" }, { value: "Sienna", label: "Sienna" }, { value: "Solar", label: "Solar" }, { value: "Syleus", label: "Syleus" }, ],
  "NA East": [ { value: "Snowburn", label: "Snowburn" }, { value: "Carnage", label: "Carnage" }, { value: "Adrenaline", label: "Adrenaline" }, { value: "Ivory", label: "Ivory" }, { value: "Stellarite", label: "Stellarite" }, { value: "Pippin", label: "Pippin" }, ],
  "NA West": [ { value: "Oblivion", label: "Oblivion" }, { value: "Moonstone", label: "Moonstone" }, { value: "Invoker", label: "Invoker" }, { value: "Akidu", label: "Akidu" }, ],
  "Europe": [ { value: "Judgment", label: "Judgment" }, { value: "Obsidian", label: "Obsidian" }, { value: "Talon", label: "Talon" }, { value: "Paola", label: "Paola" }, { value: "Zephyr", label: "Zephyr" }, { value: "Cascade", label: "Cascade" }, { value: "Rebellion", label: "Rebellion" }, { value: "Fortune", label: "Fortune" }, { value: "Destiny", label: "Destiny" }, { value: "Arcane", label: "Arcane" }, { value: "Emerald", label: "Emerald" }, { value: "Conviction", label: "Conviction" }, ],
  "South America": [ { value: "Starlight", label: "Starlight" }, { value: "Resistance", label: "Resistance" }, { value: "Eldritch", label: "Eldritch" }, { value: "Chamir", label: "Chamir" }, ],
  "Asia Pacific": [ { value: "Valkarg", label: "Valkarg" }, { value: "Sunstorm", label: "Sunstorm" }, { value: "Amethyst", label: "Amethyst" }, { value: "Titanspine", label: "Titanspine" }, ],
};

// tlGuildFocusOptions moved to settings page, not needed here.

const guildSchemaBase = z.object({
  name: z.string().min(3, "Nome da guilda deve ter pelo menos 3 caracteres.").max(50, "Nome da guilda deve ter no máximo 50 caracteres."),
  // description field removed
  game: z.string().min(1, "Selecionar um jogo é obrigatório.").max(50, "Nome do jogo deve ter no máximo 50 caracteres."),
  password: z.string().max(50, "Senha deve ter no máximo 50 caracteres.").optional().transform(val => val === "" ? undefined : val),
  socialFacebook: z.string().url("URL do Facebook inválida.").max(200, "Link do Facebook muito longo.").optional().or(z.literal('')),
  socialX: z.string().url("URL do X (Twitter) inválida.").max(200, "Link do X (Twitter) muito longo.").optional().or(z.literal('')),
  socialYoutube: z.string().url("URL do YouTube inválida.").max(200, "Link do YouTube muito longo.").optional().or(z.literal('')),
  socialDiscord: z.string().url("URL do Discord inválida.").max(200, "Link do Discord muito longo.").optional().or(z.literal('')),
  region: z.string().optional(),
  server: z.string().optional(),
  // tlGuildFocus field removed
});

const guildSchema = guildSchemaBase.superRefine((data, ctx) => {
    if (data.game === "Throne and Liberty") {
        if (!data.region) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Região é obrigatória para Throne and Liberty.", path: ["region"] });
        } else if (data.region && tlServers[data.region]?.length > 0 && !data.server) {
             ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Servidor é obrigatório para esta região em Throne and Liberty.", path: ["server"] });
        }
        // tlGuildFocus validation removed
    }
});

type GuildFormValues = z.infer<typeof guildSchema>;

export default function CreateGuildPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GuildFormValues>({
    resolver: zodResolver(guildSchema),
    defaultValues: { name: "", game: "", password: "", socialFacebook: "", socialX: "", socialYoutube: "", socialDiscord: "", region: undefined, server: undefined }
    // description and tlGuildFocus removed from defaultValues
  });

  const { handleSubmit, control, formState: { errors }, watch, setValue } = form;
  const watchedGame = watch("game");
  const watchedRegion = watch("region");

  useEffect(() => {
    if (watchedGame !== "Throne and Liberty") {
      setValue("region", undefined);
      setValue("server", undefined);
      // setValue("tlGuildFocus", []); // tlGuildFocus removed
    }
  }, [watchedGame, setValue]);

  useEffect(() => {
    setValue("server", undefined);
  }, [watchedRegion, setValue]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const onSubmit: SubmitHandler<GuildFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para criar uma guilda.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const socialLinks: NonNullable<Guild['socialLinks']> = {};
    if (data.socialFacebook && data.socialFacebook.trim() !== "") socialLinks.facebook = data.socialFacebook.trim();
    if (data.socialX && data.socialX.trim() !== "") socialLinks.x = data.socialX.trim();
    if (data.socialYoutube && data.socialYoutube.trim() !== "") socialLinks.youtube = data.socialYoutube.trim();
    if (data.socialDiscord && data.socialDiscord.trim() !== "") socialLinks.discord = data.socialDiscord.trim();

    const ownerRoleInfo: GuildMemberRoleInfo = {
      roleName: "Lider",
      characterNickname: user.displayName || user.email || "Líder da Guilda",
      dkpBalance: 0,
      status: 'Ativo'
    };

    const guildMemberRoles: { [key: string]: GuildMemberRoleInfo } = {
      [user.uid]: ownerRoleInfo
    };

    const initialCustomRoles: { [roleName: string]: CustomRole } = {
      "Lider": {
        permissions: [...new Set([...Object.values(GuildPermission), GuildPermission.MANAGE_EVENTS_VIEW_PIN, GuildPermission.MANAGE_MANUAL_CONFIRMATIONS_APPROVE])],
        description: "Fundador e administrador principal da guilda."
      },
      "Membro": {
        permissions: [GuildPermission.MANAGE_MEMBERS_VIEW, GuildPermission.VIEW_MEMBER_DETAILED_INFO],
        description: "Membro padrão da guilda."
      }
    };

    const guildData: Omit<Guild, 'id' | 'description' | 'tlGuildFocus'> & { createdAt: any } = {
        name: data.name,
        // description field removed
        game: data.game,
        ownerId: user.uid,
        ownerDisplayName: user.displayName || user.email || "Dono Desconhecido",
        memberIds: [user.uid],
        memberCount: 1,
        createdAt: serverTimestamp() as any,
        isOpen: !data.password,
        bannerUrl: `https://placehold.co/1200x300.png`,
        logoUrl: `https://placehold.co/150x150.png`,
        roles: guildMemberRoles,
        customRoles: initialCustomRoles,
        dkpSystemEnabled: false,
        dkpRedemptionWindow: { value: 24, unit: 'hours' },
        dkpDefaultsPerCategory: {},
        dkpDecayEnabled: false,
        // tlGuildFocus removed
    };

    if (data.game === "Throne and Liberty") {
        if (data.region) guildData.region = data.region;
        if (data.server) guildData.server = data.server;
        // tlGuildFocus is not set at creation anymore
    }

    if (Object.keys(socialLinks).length > 0) {
        (guildData as Guild).socialLinks = socialLinks;
    }
    if (data.password) {
        (guildData as Guild).password = data.password;
    }

    try {
      const newGuildRef = await addDoc(collection(db, "guilds"), guildData);
      toast({
        title: "Guilda Criada com Sucesso!",
        description: `${data.name} está pronta para a aventura! Detalhes como logo, foco (para TL) e eventos podem ser configurados no painel de controle.`,
        duration: 7000,
        action: (
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard?guildId=${newGuildRef.id}`)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Ver Guilda
            </Button>
        )
      });
      router.push(`/dashboard?guildId=${newGuildRef.id}`);
    } catch (error) {
      console.error("Erro ao criar guilda:", error);
      toast({ title: "Erro ao Criar Guilda", description: "Não foi possível criar a guilda. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
      return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <PageTitle title="Forjar Nova Guilda" description="Defina os alicerces da sua nova comunidade de heróis." icon={<ShieldPlus className="h-8 w-8 text-primary" />} action={ <Button variant="outline" onClick={() => router.back()}> <ArrowLeft className="mr-2 h-4 w-4" /> Voltar </Button> } />
      <Card className="static-card-container">
        <CardHeader>
          <CardTitle>Detalhes da Guilda</CardTitle>
          <CardDescription>Preencha as informações abaixo para registrar sua guilda. Detalhes como logotipo, eventos e outros ajustes finos devem ser feitos diretamente no painel de controle da guilda após a criação.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="space-y-6">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Guilda <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Os Guardiões Alados" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description field removed */}

              <FormField
                control={control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha da Guilda (Opcional)</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                      <FormControl>
                        <Input type="password" {...field} placeholder="Deixe em branco para guilda aberta" className="pl-10" />
                      </FormControl>
                    </div>
                    <FormDescription>Guildas sem senha podem ficar abertas para qualquer usuário entrar.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="game"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jogo <span className="text-destructive">*</span></FormLabel>
                    <div className="relative">
                       <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Selecione um jogo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Throne and Liberty">Throne and Liberty</SelectItem>
                            <SelectItem value="Chrono Odyssey">Chrono Odyssey</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedGame === "Throne and Liberty" && (
                <>
                  <FormField
                    control={control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Região (Throne and Liberty) <span className="text-destructive">*</span></FormLabel>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="pl-10">
                                <SelectValue placeholder="Selecione uma região" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tlRegions.map(region => (
                                <SelectItem key={region.value} value={region.value}>{region.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {watchedRegion && tlServers[watchedRegion]?.length > 0 && (
                       <FormField
                        control={control}
                        name="server"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Servidor (Throne and Liberty) <span className="text-destructive">*</span></FormLabel>
                            <div className="relative">
                              <ServerIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                              <Select onValueChange={field.onChange} value={field.value || ""} disabled={!watchedRegion || (tlServers[watchedRegion]?.length === 0)}>
                                <FormControl>
                                  <SelectTrigger className="pl-10">
                                    <SelectValue placeholder={tlServers[watchedRegion]?.length > 0 ? "Selecione um servidor" : "Nenhum servidor para esta região"} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {tlServers[watchedRegion]?.length > 0 ? (
                                    tlServers[watchedRegion].map(server => (
                                      <SelectItem key={server.value} value={server.value}>{server.label}</SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="no-servers" disabled>Nenhum servidor listado</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {/* tlGuildFocus checkboxes removed */}
                </>
              )}

              <div className="space-y-4 pt-4">
                <h3 className="text-md font-medium text-foreground">Links Sociais (Opcional)</h3>
                <FormField control={control} name="socialFacebook" render={({ field }) => ( <FormItem> <FormLabel>Facebook</FormLabel> <div className="relative"><Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" /> <FormControl><Input {...field} placeholder="https://facebook.com/suaguilda" className="pl-10"/></FormControl></div> <FormMessage /> </FormItem> )}/>
                <FormField control={control} name="socialX" render={({ field }) => ( <FormItem> <FormLabel>X (Twitter)</FormLabel> <div className="relative"><Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" /> <FormControl><Input {...field} placeholder="https://x.com/suaguilda" className="pl-10"/></FormControl></div> <FormMessage /> </FormItem> )}/>
                <FormField control={control} name="socialYoutube" render={({ field }) => ( <FormItem> <FormLabel>YouTube</FormLabel> <div className="relative"><Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" /> <FormControl><Input {...field} placeholder="https://youtube.com/c/suaguilda" className="pl-10"/></FormControl></div> <FormMessage /> </FormItem> )}/>
                <FormField control={control} name="socialDiscord" render={({ field }) => ( <FormItem> <FormLabel>Discord</FormLabel> <div className="relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" /> <FormControl><Input {...field} placeholder="https://discord.gg/suaguilda" className="pl-10"/></FormControl></div> <FormMessage /> </FormItem> )}/>
              </div>
              <Alert variant="default" className="bg-background border-accent/30 !mt-8">
                  <AlertCircle className="h-4 w-4 text-accent" />
                  <AlertTitle className="font-semibold">Ajustes Finos no Painel de Controle</AlertTitle>
                  <AlertDescription className="text-xs">Lembre-se: O logotipo, banner, gerenciamento de membros, eventos e outras configurações detalhadas da guilda são gerenciados através do painel da guilda após sua criação.</AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="btn-gradient btn-style-primary">
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldPlus className="mr-2 h-5 w-5" />}
                {isSubmitting ? 'Criando Guilda...' : 'Criar Guilda'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
