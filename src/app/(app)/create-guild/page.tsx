
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageTitle } from '@/components/shared/PageTitle';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldPlus, Loader2, CheckCircle, Lock, Facebook, Twitter, Youtube, Link2 as LinkIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { useToast } from '@/hooks/use-toast';

const guildSchema = z.object({
  name: z.string().min(3, "Nome da guilda deve ter pelo menos 3 caracteres.").max(50, "Nome da guilda deve ter no máximo 50 caracteres."),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres.").optional(),
  game: z.string().max(50, "Nome do jogo deve ter no máximo 50 caracteres.").optional(),
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

  const { register, handleSubmit, formState: { errors } } = useForm<GuildFormValues>({
    resolver: zodResolver(guildSchema),
  });

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

    const guildData: Partial<Guild> & { ownerId: string; memberIds: string[]; memberCount: number; createdAt: any; name: string; isOpen: boolean } = {
        name: data.name,
        description: data.description || "",
        game: data.game || "",
        ownerId: user.uid,
        memberIds: [user.uid],
        memberCount: 1,
        createdAt: serverTimestamp(),
        isOpen: !data.password,
        bannerUrl: `https://placehold.co/1200x300.png?text=${encodeURIComponent(data.name + ' Banner')}`,
        logoUrl: `https://placehold.co/150x150.png?text=${encodeURIComponent(data.name.substring(0,2).toUpperCase())}`,
    };

    if (data.password) {
        guildData.password = data.password;
    }
    if (Object.keys(socialLinks).length > 0) {
        guildData.socialLinks = socialLinks;
    }

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
      />
      <Card className="card-bg">
        <CardHeader>
          <CardTitle>Detalhes da Guilda</CardTitle>
          <CardDescription>
            Preencha as informações abaixo para registrar sua guilda. 
            Detalhes como logotipo, eventos e outros ajustes finos devem ser feitos diretamente no dashboard da guilda após a criação.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="name">Nome da Guilda <span className="text-destructive">*</span></Label>
              <Input 
                id="name" 
                {...register("name")} 
                placeholder="Ex: Os Guardiões Alados"
                className={`mt-1 form-input ${errors.name ? 'border-destructive focus:border-destructive' : ''}`}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="password">Senha da Guilda (Opcional)</Label>
              <div className="relative flex items-center mt-1">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="password"
                  type="password"
                  {...register("password")} 
                  placeholder="Deixe em branco para guilda aberta"
                  className={`form-input pl-10 ${errors.password ? 'border-destructive focus:border-destructive' : ''}`}
                />
              </div>
              {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">Guildas sem senha podem ficar abertas para qualquer usuário entrar.</p>
            </div>
            
            <div>
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea 
                id="description" 
                {...register("description")} 
                placeholder="Ex: Uma guilda focada em exploração e desafios épicos."
                rows={3}
                className={`mt-1 form-input ${errors.description ? 'border-destructive focus:border-destructive' : ''}`}
              />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <Label htmlFor="game">Jogo Principal (Opcional)</Label>
               <Input 
                id="game" 
                {...register("game")} 
                placeholder="Ex: World of Arcana"
                className={`mt-1 form-input ${errors.game ? 'border-destructive focus:border-destructive' : ''}`}
              />
              {errors.game && <p className="text-sm text-destructive mt-1">{errors.game.message}</p>}
            </div>

            <div className="space-y-1">
              <h3 className="text-md font-medium text-foreground">Links Sociais (Opcional)</h3>
              <div className="space-y-3">
                <div>
                    <Label htmlFor="socialFacebook">Facebook</Label>
                    <div className="relative flex items-center mt-1">
                        <Facebook className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input id="socialFacebook" {...register("socialFacebook")} placeholder="https://facebook.com/suaguilda" className={`form-input pl-10 ${errors.socialFacebook ? 'border-destructive focus:border-destructive' : ''}`} />
                    </div>
                    {errors.socialFacebook && <p className="text-sm text-destructive mt-1">{errors.socialFacebook.message}</p>}
                </div>
                <div>
                    <Label htmlFor="socialX">X (Twitter)</Label>
                    <div className="relative flex items-center mt-1">
                        <Twitter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input id="socialX" {...register("socialX")} placeholder="https://x.com/suaguilda" className={`form-input pl-10 ${errors.socialX ? 'border-destructive focus:border-destructive' : ''}`} />
                    </div>
                    {errors.socialX && <p className="text-sm text-destructive mt-1">{errors.socialX.message}</p>}
                </div>
                <div>
                    <Label htmlFor="socialYoutube">YouTube</Label>
                    <div className="relative flex items-center mt-1">
                        <Youtube className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input id="socialYoutube" {...register("socialYoutube")} placeholder="https://youtube.com/c/suaguilda" className={`form-input pl-10 ${errors.socialYoutube ? 'border-destructive focus:border-destructive' : ''}`} />
                    </div>
                    {errors.socialYoutube && <p className="text-sm text-destructive mt-1">{errors.socialYoutube.message}</p>}
                </div>
                <div>
                    <Label htmlFor="socialDiscord">Discord</Label>
                    <div className="relative flex items-center mt-1">
                        <LinkIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input id="socialDiscord" {...register("socialDiscord")} placeholder="https://discord.gg/suaguilda" className={`form-input pl-10 ${errors.socialDiscord ? 'border-destructive focus:border-destructive' : ''}`} />
                    </div>
                    {errors.socialDiscord && <p className="text-sm text-destructive mt-1">{errors.socialDiscord.message}</p>}
                </div>
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
          <CardFooter className="flex justify-end gap-4">
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
      </Card>
    </div>
  );
}

    