
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc } from '@/lib/firebase';
import type { Guild, GuildMemberRoleInfo, UserProfile } from '@/types/guildmaster';
import { AuditActionType, TLRole, TLWeapon } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; 
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Loader2, Save, Hash, ImageIcon, Shield, Swords, Wand2, ArrowLeft, Link2 as LinkIcon } from 'lucide-react';
import { logGuildActivity } from '@/lib/auditLogService';
import { useHeader } from '@/contexts/HeaderContext';

const tlWeaponsList = Object.values(TLWeapon);

const userGuildSettingsSchema = z.object({
  characterNickname: z.string().min(2, "Nickname deve ter pelo menos 2 caracteres.").max(50, "Nickname muito longo."),
  gearScore: z.coerce.number().min(0, "Gearscore deve ser positivo.").max(10000, "Gearscore improvável.").optional(),
  gearScoreScreenshotUrl: z.string().url("URL inválida. Use Imgur, etc.").max(250, "URL muito longa.").optional().or(z.literal('')),
  gearBuildLink: z.string().url("URL inválida para Gear Build Link.").max(250, "URL do Gear Build Link muito longa.").optional().or(z.literal('')),
  skillBuildLink: z.string().url("URL inválida para Skill Build Link.").max(250, "URL do Skill Build Link muito longa.").optional().or(z.literal('')),
  tlRole: z.nativeEnum(TLRole).optional(),
  tlPrimaryWeapon: z.nativeEnum(TLWeapon).optional(),
  tlSecondaryWeapon: z.nativeEnum(TLWeapon).optional(),
});

type UserGuildSettingsFormValues = z.infer<typeof userGuildSettingsSchema>;

function UserGuildSettingsPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [memberRoleInfo, setMemberRoleInfo] = useState<GuildMemberRoleInfo | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guildId = searchParams.get('guildId');
  const isTLGuild = useMemo(() => guild?.game === "Throne and Liberty", [guild]);

  const form = useForm<UserGuildSettingsFormValues>({
    resolver: zodResolver(userGuildSettingsSchema),
    defaultValues: {
      characterNickname: "",
      gearScore: 0,
      gearScoreScreenshotUrl: "",
      gearBuildLink: "",
      skillBuildLink: "",
      tlRole: undefined,
      tlPrimaryWeapon: undefined,
      tlSecondaryWeapon: undefined,
    },
  });

  useEffect(() => {
    if (guild?.name) setHeaderTitle(`Minhas Configs: ${guild.name}`);
    return () => setHeaderTitle(null);
  }, [guild?.name, setHeaderTitle]);

  useEffect(() => {
    if (authLoading || !currentUser || !guildId) {
        if(!authLoading && !currentUser) router.push('/login');
        if(!authLoading && !guildId) router.push('/guild-selection');
        return;
    }

    const fetchData = async () => {
      setLoadingData(true);
      try {
        const guildDocRef = doc(db, "guilds", guildId);
        const guildSnap = await getDoc(guildDocRef);

        if (!guildSnap.exists()) {
          toast({ title: "Guilda não encontrada", variant: "destructive" });
          router.push('/guild-selection');
          return;
        }
        const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;
        setGuild(guildData);

        const userRoleData = guildData.roles?.[currentUser.uid];
        if (!userRoleData) {
          toast({ title: "Erro", description: "Suas informações não foram encontradas nesta guilda.", variant: "destructive" });
          setMemberRoleInfo(null);
        } else {
          setMemberRoleInfo(userRoleData);
          form.reset({
            characterNickname: userRoleData.characterNickname || currentUser.displayName || "",
            gearScore: userRoleData.gearScore || 0,
            gearScoreScreenshotUrl: userRoleData.gearScoreScreenshotUrl || "",
            gearBuildLink: userRoleData.gearBuildLink || "",
            skillBuildLink: userRoleData.skillBuildLink || "",
            tlRole: userRoleData.tlRole,
            tlPrimaryWeapon: userRoleData.tlPrimaryWeapon,
            tlSecondaryWeapon: userRoleData.tlSecondaryWeapon,
          });
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [guildId, currentUser, authLoading, router, toast, form]);

  const onSubmit: SubmitHandler<UserGuildSettingsFormValues> = async (data) => {
    if (!guild || !currentUser || !guildId || !memberRoleInfo) {
      toast({ title: "Erro", description: "Não foi possível salvar. Dados ausentes.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const updatedFields: string[] = [];
    if (memberRoleInfo.characterNickname !== data.characterNickname) updatedFields.push('Nickname do Personagem');
    if (memberRoleInfo.gearScore !== data.gearScore) updatedFields.push('Gearscore');
    if (memberRoleInfo.gearScoreScreenshotUrl !== (data.gearScoreScreenshotUrl || null)) updatedFields.push('Screenshot do Gearscore');
    if (memberRoleInfo.gearBuildLink !== (data.gearBuildLink || null)) updatedFields.push('Gear Build Link');
    if (memberRoleInfo.skillBuildLink !== (data.skillBuildLink || null)) updatedFields.push('Skill Build Link');

    const updatedRoleInfo: GuildMemberRoleInfo = {
      ...memberRoleInfo, 
      characterNickname: data.characterNickname,
      gearScore: data.gearScore,
      gearScoreScreenshotUrl: data.gearScoreScreenshotUrl || null,
      gearBuildLink: data.gearBuildLink || null,
      skillBuildLink: data.skillBuildLink || null,
    };

    if (isTLGuild) {
      updatedRoleInfo.tlRole = data.tlRole;
      updatedRoleInfo.tlPrimaryWeapon = data.tlPrimaryWeapon;
      updatedRoleInfo.tlSecondaryWeapon = data.tlSecondaryWeapon;
      if (memberRoleInfo.tlRole !== data.tlRole) updatedFields.push('Função TL');
      if (memberRoleInfo.tlPrimaryWeapon !== data.tlPrimaryWeapon) updatedFields.push('Arma Primária TL');
      if (memberRoleInfo.tlSecondaryWeapon !== data.tlSecondaryWeapon) updatedFields.push('Arma Secundária TL');
    }

    try {
      const guildRef = doc(db, "guilds", guildId);
      await updateDoc(guildRef, {
        [`roles.${currentUser.uid}`]: updatedRoleInfo,
      });

      await logGuildActivity(guildId, currentUser.uid, data.characterNickname || currentUser.displayName, AuditActionType.MEMBER_GUILD_PROFILE_UPDATED, {
         targetUserId: currentUser.uid,
         targetUserDisplayName: data.characterNickname || currentUser.displayName || currentUser.email || "Usuário",
         details: { updatedFields }
      });
      
      setMemberRoleInfo(updatedRoleInfo); 
      toast({ title: "Informações Atualizadas!", description: "Suas configurações na guilda foram salvas." });
    } catch (error) {
      console.error("Erro ao atualizar informações:", error);
      toast({ title: "Erro ao Salvar", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData || authLoading) {
    return (
      <div className="space-y-8 p-4 md:p-6">
        <PageTitle title="Minhas Configurações na Guilda" icon={<UserCog className="h-8 w-8 text-primary" />} />
        <Skeleton className="h-64 w-full" />
        {isTLGuild && <Skeleton className="h-72 w-full" />}
      </div>
    );
  }

  if (!guild || !memberRoleInfo) {
    return (
      <div className="p-6 text-center">
        <p>Não foi possível carregar suas informações para esta guilda.</p>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <PageTitle
        title={`Minhas Configurações em ${guild.name}`}
        description="Atualize suas informações visíveis para os membros desta guilda."
        icon={<UserCog className="h-8 w-8 text-primary" />}
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        }
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="static-card-container">
            <CardHeader>
              <CardTitle>Informações do Personagem</CardTitle>
              <CardDescription>Como você aparecerá para outros membros desta guilda. Para guildas do jogo Throne and Liberty, campos adicionais específicos do jogo estarão disponíveis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="characterNickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname do Personagem na Guilda</FormLabel>
                    <FormControl><Input {...field} placeholder="Seu nome no jogo" className="form-input" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gearScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gearscore</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <Hash className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="number" {...field} placeholder="Ex: 5200" className="form-input pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gearScoreScreenshotUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link da Screenshot do Gearscore (Ex: Imgur)</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <ImageIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} placeholder="https://i.imgur.com/..." className="form-input pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gearBuildLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gear Build Link (Ex: Questlog.gg)</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <LinkIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} placeholder="https://questlog.gg/..." className="form-input pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                     <p className="text-xs text-muted-foreground mt-1">Insira o link para sua build de equipamentos.</p>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="skillBuildLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skill Build Link (Ex: Questlog.gg)</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <LinkIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} placeholder="https://questlog.gg/..." className="form-input pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                     <p className="text-xs text-muted-foreground mt-1">Insira o link para sua build de habilidades.</p>
                  </FormItem>
                )}
              />

              {isTLGuild && (
                <>
                  <FormField
                    control={form.control}
                    name="tlRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sua Função (Tank/Healer/DPS)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} >
                          <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione sua função" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {Object.values(TLRole).map(role => (
                              <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                      {role === TLRole.Tank && <Shield className="h-4 w-4 text-sky-500" />}
                                      {role === TLRole.Healer && <Wand2 className="h-4 w-4 text-emerald-500" />}
                                      {role === TLRole.DPS && <Swords className="h-4 w-4 text-rose-500" />}
                                      {role}
                                  </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tlPrimaryWeapon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arma Primária</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Arma primária" /></SelectTrigger></FormControl>
                            <SelectContent>{tlWeaponsList.map(w => <SelectItem key={`pri-${w}`} value={w}>{w}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tlSecondaryWeapon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Arma Secundária</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Arma secundária" /></SelectTrigger></FormControl>
                            <SelectContent>{tlWeaponsList.map(w => <SelectItem key={`sec-${w}`} value={w}>{w}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="btn-gradient btn-style-primary ml-auto" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

export default function UserGuildSettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <UserGuildSettingsPageContent />
    </Suspense>
  );
}
