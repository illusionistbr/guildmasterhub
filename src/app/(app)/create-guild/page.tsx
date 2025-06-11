
"use client";

import React, { useState } from 'react';
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
import { ShieldPlus, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, addDoc, serverTimestamp } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const guildSchema = z.object({
  name: z.string().min(3, "Nome da guilda deve ter pelo menos 3 caracteres.").max(50, "Nome da guilda deve ter no máximo 50 caracteres."),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres.").optional(),
  game: z.string().max(50, "Nome do jogo deve ter no máximo 50 caracteres.").optional(),
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

  const onSubmit: SubmitHandler<GuildFormValues> = async (data) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para criar uma guilda.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const newGuildRef = await addDoc(collection(db, "guilds"), {
        name: data.name,
        description: data.description || "",
        game: data.game || "",
        ownerId: user.uid,
        memberIds: [user.uid],
        memberCount: 1,
        createdAt: serverTimestamp(),
        // Default banner and logo, user can change later
        bannerUrl: `https://placehold.co/1200x300.png?text=${encodeURIComponent(data.name + ' Banner')}`,
        logoUrl: `https://placehold.co/150x150.png?text=${encodeURIComponent(data.name.substring(0,2).toUpperCase())}`,
      });

      toast({
        title: "Guilda Criada com Sucesso!",
        description: `${data.name} está pronta para a aventura!`,
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
    // No setIsSubmitting(false) here if navigation occurs, to prevent state update on unmounted component
  };
  
  if (authLoading) {
      return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!user && !authLoading) {
      // Redirect or show message if not logged in
      router.push('/login'); // Or a dedicated "access denied" page
      return null; // Avoid rendering the rest of the component
  }


  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <PageTitle 
        title="Forjar Nova Guilda"
        description="Defina os alicerces da sua nova comunidade de heróis."
        icon={ShieldPlus}
      />
      <Card className="card-bg">
        <CardHeader>
          <CardTitle>Detalhes da Guilda</CardTitle>
          <CardDescription>Preencha as informações abaixo para registrar sua guilda.</CardDescription>
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
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea 
                id="description" 
                {...register("description")} 
                placeholder="Ex: Uma guilda focada em exploração e desafios épicos."
                rows={4}
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
