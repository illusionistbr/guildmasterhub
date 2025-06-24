
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, setDoc, firebaseUpdateProfile } from '@/lib/firebase';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Loader2, Save, ArrowLeft, User as UserIcon, Link2 as LinkIcon } from 'lucide-react';
import { useHeader } from '@/contexts/HeaderContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const profileSchema = z.object({
  displayName: z.string().min(2, "O nickname deve ter pelo menos 2 caracteres.").max(50, "Nickname muito longo."),
  photoURL: z.string().url("Por favor, insira uma URL de imagem válida.").max(300, "URL da foto muito longa.").optional().or(z.literal('')),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

function ProfilePageContent() {
  const { user: currentUser, loading: authLoading, auth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      photoURL: "",
    },
  });

  useEffect(() => {
    setHeaderTitle("Editar Perfil");
    return () => setHeaderTitle(null);
  }, [setHeaderTitle]);

  useEffect(() => {
    if (currentUser) {
        const initialPhotoURL = currentUser.photoURL || "";
        form.reset({
            displayName: currentUser.displayName || "",
            photoURL: initialPhotoURL,
        });
        setPhotoPreview(initialPhotoURL);
    }
  }, [currentUser, form]);

  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!currentUser || !auth.currentUser) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const finalPhotoUrl = data.photoURL || null;

    try {
      // Update Firebase Auth profile
      await firebaseUpdateProfile(auth.currentUser, {
        displayName: data.displayName,
        photoURL: finalPhotoUrl,
      });

      // Update Firestore user document
      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, {
        displayName: data.displayName,
        photoURL: finalPhotoUrl,
      }, { merge: true });
      
      toast({ title: "Perfil Atualizado!", description: "Suas informações foram salvas com sucesso." });
      
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível atualizar seu perfil.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-8 p-4 md:p-6">
        <PageTitle title="Editar Perfil" icon={<UserCog className="h-8 w-8 text-primary" />} />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-6 text-center">
        <p>Você precisa estar logado para editar seu perfil.</p>
        <Button onClick={() => router.push('/login')} variant="outline" className="mt-4">Login</Button>
      </div>
    );
  }
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "GM";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
       <PageTitle
        title="Editar Perfil"
        description="Atualize seu nome de usuário e foto de perfil."
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
              <CardTitle>Suas Informações</CardTitle>
              <CardDescription>Estes dados são usados em todo o aplicativo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex justify-center">
                <Avatar className="h-24 w-24 border-4 border-primary">
                    <AvatarImage src={photoPreview || undefined} alt={form.getValues("displayName") || "User"} data-ai-hint="user avatar"/>
                    <AvatarFallback className="text-3xl bg-muted">{getInitials(form.getValues("displayName"))}</AvatarFallback>
                </Avatar>
               </div>
               <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname</FormLabel>
                    <FormControl>
                        <div className="relative flex items-center">
                         <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                         <Input {...field} value={field.value ?? ""} placeholder="Seu nome de usuário" className="form-input pl-10" />
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="photoURL"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>URL da Foto de Perfil (Opcional)</FormLabel>
                    <FormControl>
                        <div className="relative flex items-center">
                            <LinkIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                                {...field} 
                                value={field.value ?? ""} 
                                placeholder="https://i.imgur.com/..." 
                                className="form-input pl-10"
                                onChange={(e) => {
                                    field.onChange(e);
                                    setPhotoPreview(e.target.value);
                                }}
                            />
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
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


export default function ProfilePage() {
    return (
      <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
        <ProfilePageContent />
      </Suspense>
    );
  }
