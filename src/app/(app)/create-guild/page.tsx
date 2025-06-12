
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageTitle } from '@/components/shared/PageTitle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ShieldPlus, Loader2, CheckCircle, Lock, Facebook, Twitter, Youtube, Link2 as LinkIcon, AlertCircle, Gamepad2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { GuildRole } from '@/types/guildmaster';
import { useToast } from '@/hooks/use-toast';

const guildSchema = z.object({
  name: z.string().min(3, "Nome da guilda deve ter pelo menos 3 caracteres.").max(50, "Nome da guilda deve ter no máximo 50 caracteres."),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres.").optional(),
  game: z.string().min(1, "Selecionar um jogo é obrigatório.").max(50, "Nome do jogo deve ter no máximo 50 caracteres."),
  password: z.string().max(50, "Senha deve ter no máximo 50 caracteres.").optional().transform(val => val === "" ? undefined : val),
  socialFacebook: z.string().url("URL do Facebook inválida.").max(200, "Link do Facebook muito longo.").optional().or(z.literal('')),
  socialX: z.string().url("URL do X (Twitter) inválida.").max(200, "Link do X (Twitter) muito longo.").optional().or(z.literal('')),
  socialYoutube: z.string().url("URL do YouTube inválida.").max(200, "Link do YouTube muito longo.").optional().or(z.literal('')),
  socialDiscord: z.string().url("URL do Discord inválida.").max(200, "Link do Discord muito longo.").optional().or(z.literal('')),
});

type GuildFormValues = z.infer<typeof guildSchema>;

export default function CreateGuildPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<GuildFormValues>({
    resolver: zodResolver(guildSchema),
    defaultValues: {
      name: "",
      description: "",
      game: "",
      password: "",
      socialFacebook: "",
      socialX: "",
      socialYoutube: "",
      socialDiscord: "",
    }
  });

  const { handleSubmit, control, formState: { errors } } = form;


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

    const guildRoles: { [key: string]: GuildRole } = {
      [user.uid]: GuildRole.Leader
    };

    const guildData: Omit<Guild, 'id' | 'createdAt'> & { createdAt: any } = {
        name: data.name,
        description: data.description || "",
        game: data.game,
        ownerId: user.uid,
        ownerDisplayName: user.displayName || user.email || "Dono Desconhecido",
        memberIds: [user.uid],
        memberCount: 1,
        createdAt: serverTimestamp(),
        isOpen: !data.password,
        bannerUrl: `https://placehold.co/1200x300.png`,
        logoUrl: `https://placehold.co/150x150.png`,
        roles: guildRoles,
        socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        password: data.password || undefined,
    };
    
    if (!guildData.socialLinks) delete guildData.socialLinks;
    if (!guildData.password) delete guildData.password;
    if (!guildData.description) guildData.description = "";


    try {
      const newGuildRef = await addDoc(collection(db, "guilds"), guildData);

      toast({
        title: "Guilda Criada com Sucesso!",
        description: `${data.name} está pronta para a aventura! Detalhes como logo e eventos podem ser configurados no dashboard.`,
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
      console.error("Error creating guild:", error);
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
      <PageTitle 
        title="Forjar Nova Guilda"
        description="Defina os alicerces da sua nova comunidade de heróis."
        icon={<ShieldPlus className="h-8 w-8 text-primary" />}
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        }
      />
      <Card className="card-bg">
        <CardHeader className="relative z-10">
          <CardTitle>Detalhes da Guilda</CardTitle>
          <CardDescription>
            Preencha as informações abaixo para registrar sua guilda. 
            Detalhes como logotipo, eventos e outros ajustes finos devem ser feitos diretamente no dashboard da guilda após a criação.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-6 relative z-10">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Guilda <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: Os Guardiões Alados"
                        className={`mt-1 form-input ${errors.name ? 'border-destructive focus:border-destructive' : ''}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha da Guilda (Opcional)</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center mt-1">
                        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                          type="password"
                          {...field} 
                          placeholder="Deixe em branco para guilda aberta"
                          className={`form-input pl-10 ${errors.password ? 'border-destructive focus:border-destructive' : ''}`}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">Guildas sem senha podem ficar abertas para qualquer usuário entrar.</p>
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Ex: Uma guilda focada em exploração e desafios épicos."
                        rows={3}
                        className={`mt-1 form-input ${errors.description ? 'border-destructive focus:border-destructive' : ''}`}
                      />
                    </FormControl>
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
                    <div className="relative flex items-center mt-1">
                       <Gamepad2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className={`form-input pl-10 ${errors.game ? 'border-destructive focus:border-destructive' : ''}`}>
                              <SelectValue placeholder="Selecione um jogo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Throne and Liberty">Throne and Liberty</SelectItem>
                            {/* Adicione outras opções de jogo aqui no futuro */}
                          </SelectContent>
                        </Select>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="space-y-1">
                <h3 className="text-md font-medium text-foreground">Links Sociais (Opcional)</h3>
                <div className="space-y-3">
                  <FormField
                    control={control}
                    name="socialFacebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="socialFacebook">Facebook</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center mt-1">
                              <Facebook className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                              <Input id="socialFacebook" {...field} placeholder="https://facebook.com/suaguilda" className={`form-input pl-10 ${errors.socialFacebook ? 'border-destructive focus:border-destructive' : ''}`} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="socialX"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="socialX">X (Twitter)</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center mt-1">
                              <Twitter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                              <Input id="socialX" {...field} placeholder="https://x.com/suaguilda" className={`form-input pl-10 ${errors.socialX ? 'border-destructive focus:border-destructive' : ''}`} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="socialYoutube"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="socialYoutube">YouTube</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center mt-1">
                              <Youtube className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                              <Input id="socialYoutube" {...field} placeholder="https://youtube.com/c/suaguilda" className={`form-input pl-10 ${errors.socialYoutube ? 'border-destructive focus:border-destructive' : ''}`} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="socialDiscord"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="socialDiscord">Discord</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center mt-1">
                              <LinkIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                              <Input id="socialDiscord" {...field} placeholder="https://discord.gg/suaguilda" className={`form-input pl-10 ${errors.socialDiscord ? 'border-destructive focus:border-destructive' : ''}`} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <Alert variant="default" className="bg-background border-accent/30">
                  <AlertCircle className="h-4 w-4 text-accent" />
                  <AlertTitle className="font-semibold">Ajustes Finos no Dashboard</AlertTitle>
                  <AlertDescription className="text-xs">
                  Lembre-se: O logotipo, banner, gerenciamento de membros, eventos e outras configurações detalhadas da guilda são gerenciados através do painel da guilda após sua criação.
                  </AlertDescription>
              </Alert>

            </CardContent>
            <CardFooter className="flex justify-end gap-4 relative z-10">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" className="btn-gradient btn-style-primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <ShieldPlus className="mr-2 h-5 w-5" />
                )}
                {isSubmitting ? 'Criando Guilda...' : 'Criar Guilda'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
