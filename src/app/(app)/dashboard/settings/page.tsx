
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc, deleteDoc, collection, getDocs as getFirestoreDocs, writeBatch } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { AuditActionType } from '@/types/guildmaster'; // Importação adicionada aqui
import { PageTitle } from '@/components/shared/PageTitle';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, ShieldAlert, Loader2, Trash2, Save, KeyRound, VenetianMask } from 'lucide-react';
import { logGuildActivity } from '@/lib/auditLogService';
import { useHeader } from '@/contexts/HeaderContext';
import { cn } from '@/lib/utils';

const guildNameSchema = z.object({
  name: z.string().min(3, "Nome da guilda deve ter pelo menos 3 caracteres.").max(50, "Nome da guilda deve ter no máximo 50 caracteres."),
});
type GuildNameFormValues = z.infer<typeof guildNameSchema>;

const guildPasswordSchema = z.object({
  password: z.string().max(50, "Senha deve ter no máximo 50 caracteres.").optional().transform(val => val === "" ? undefined : val),
});
type GuildPasswordFormValues = z.infer<typeof guildPasswordSchema>;


function GuildSettingsPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isSubmittingName, setIsSubmittingName] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const guildId = searchParams.get('guildId');

  const nameForm = useForm<GuildNameFormValues>({
    resolver: zodResolver(guildNameSchema),
    defaultValues: { name: "" },
  });

  const passwordForm = useForm<GuildPasswordFormValues>({
    resolver: zodResolver(guildPasswordSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!guildId) {
      toast({ title: "ID da Guilda Ausente", variant: "destructive" });
      router.push('/guild-selection');
      return;
    }

    const fetchData = async () => {
      setLoadingData(true);
      setAccessDenied(false);
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
        setHeaderTitle(`Configurações: ${guildData.name}`);

        if (guildData.ownerId !== currentUser.uid) {
          setAccessDenied(true);
          setLoadingData(false);
          return;
        }
        
        nameForm.reset({ name: guildData.name });
        passwordForm.reset({ password: guildData.password || "" });

      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
    
    return () => {
      setHeaderTitle(null); 
    };
  }, [guildId, currentUser, authLoading, router, toast, nameForm, passwordForm, setHeaderTitle]);

  const handleNameSubmit: SubmitHandler<GuildNameFormValues> = async (data) => {
    if (!guild || !currentUser || guild.ownerId !== currentUser.uid) return;
    setIsSubmittingName(true);
    const oldName = guild.name;
    try {
      const guildRef = doc(db, "guilds", guild.id);
      await updateDoc(guildRef, { name: data.name });

      await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.GUILD_NAME_UPDATED, {
        oldValue: oldName,
        newValue: data.name,
        changedField: 'name',
      });

      setGuild(prev => prev ? { ...prev, name: data.name } : null);
      nameForm.reset({ name: data.name }); 
      setHeaderTitle(`Configurações: ${data.name}`); 
      toast({ title: "Nome da Guilda Atualizado!", description: `O nome da guilda foi alterado para ${data.name}.` });
    } catch (error) {
      console.error("Erro ao atualizar nome da guilda:", error);
      toast({ title: "Erro ao Atualizar Nome", variant: "destructive" });
    } finally {
      setIsSubmittingName(false);
    }
  };

  const handlePasswordSubmit: SubmitHandler<GuildPasswordFormValues> = async (data) => {
    if (!guild || !currentUser || guild.ownerId !== currentUser.uid) return;
    setIsSubmittingPassword(true);
    const oldPasswordExists = !!guild.password;
    const newPasswordExists = !!data.password;

    try {
      const guildRef = doc(db, "guilds", guild.id);
      await updateDoc(guildRef, { 
        password: data.password || null, 
        isOpen: !data.password 
      });
      
      let logMessageToast = "";
      if (oldPasswordExists && newPasswordExists && guild.password !== data.password) {
        logMessageToast = "Senha da guilda alterada.";
      } else if (!oldPasswordExists && newPasswordExists) {
        logMessageToast = "Senha definida para a guilda (agora é privada).";
      } else if (oldPasswordExists && !newPasswordExists) {
        logMessageToast = "Senha da guilda removida (agora é aberta).";
      }


      await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.GUILD_PASSWORD_UPDATED, {
        oldValue: oldPasswordExists ? "Senha Definida" : "Sem Senha",
        newValue: newPasswordExists ? "Senha Definida" : "Sem Senha",
        changedField: 'password',
      });
       await logGuildActivity(guild.id, currentUser.uid, currentUser.displayName, AuditActionType.GUILD_VISIBILITY_CHANGED, {
        oldValue: guild.isOpen,
        newValue: !data.password,
        changedField: 'visibility',
      });


      setGuild(prev => prev ? { ...prev, password: data.password, isOpen: !data.password } : null);
      passwordForm.reset({ password: data.password || "" });
      toast({ title: "Senha da Guilda Atualizada!", description: logMessageToast || "Configuração de senha salva." });
    } catch (error) {
      console.error("Erro ao atualizar senha da guilda:", error);
      toast({ title: "Erro ao Atualizar Senha", variant: "destructive" });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleDeleteGuild = async () => {
    if (!guild || !currentUser || guild.ownerId !== currentUser.uid) {
        toast({ title: "Ação não permitida", description: "Você não pode excluir esta guilda ou os dados da guilda não estão carregados.", variant: "destructive" });
        return;
    }
    setIsDeleting(true);
    try {
      const auditLogsRef = collection(db, `guilds/${guild.id}/auditLogs`);
      const auditLogsSnap = await getFirestoreDocs(auditLogsRef);
      if (!auditLogsSnap.empty) {
          const batch = writeBatch(db);
          auditLogsSnap.docs.forEach(logDoc => batch.delete(logDoc.ref));
          await batch.commit();
      }

      const guildRef = doc(db, "guilds", guild.id);
      await deleteDoc(guildRef);
      
      toast({ title: "Guilda Excluída!", description: `A guilda ${guild.name} foi permanentemente excluída.` });
      setHeaderTitle(null);
      router.push('/guild-selection'); 
    } catch (error) {
      console.error("Erro ao excluir guilda:", error);
      toast({ title: "Erro ao Excluir Guilda", description: "Não foi possível excluir a guilda. Verifique o console para mais detalhes.", variant: "destructive" });
      setIsDeleting(false); 
    }
  };

  if (loadingData || authLoading) {
    return (
      <div className="space-y-8 p-4 md:p-6">
        <PageTitle title="Configurações da Guilda" icon={<SettingsIcon className="h-8 w-8 text-primary" />} />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10">
        <ShieldAlert className="h-24 w-24 text-destructive animate-pulse" />
        <h2 className="text-3xl font-headline text-destructive">Acesso Negado</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Você não tem permissão para acessar as configurações desta guilda. Apenas o Líder pode.
        </p>
        <Button onClick={() => router.back()} variant="outline">Voltar</Button>
      </div>
    );
  }
  
  if (!guild) {
     return (
        <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10">
            <VenetianMask className="h-24 w-24 text-primary" />
            <h2 className="text-3xl font-headline">Guilda Não Encontrada</h2>
            <p className="text-lg text-muted-foreground max-w-md">
            Não foi possível carregar os dados da guilda.
            </p>
            <Button onClick={() => router.push('/guild-selection')} variant="outline">Selecionar Guilda</Button>
        </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <PageTitle 
        title={`Configurações de ${guild.name}`}
        description="Gerencie as informações básicas e configurações de segurança da sua guilda."
        icon={<SettingsIcon className="h-8 w-8 text-primary" />}
      />

      <Card className="static-card-container">
        <CardHeader>
          <CardTitle>Alterar Nome da Guilda</CardTitle>
        </CardHeader>
        <Form {...nameForm}>
          <form onSubmit={nameForm.handleSubmit(handleNameSubmit)}>
            <CardContent>
              <FormField
                control={nameForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="guildName">Nome da Guilda</FormLabel>
                    <FormControl>
                      <Input id="guildName" {...field} className="form-input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="btn-gradient btn-style-secondary" disabled={isSubmittingName}>
                {isSubmittingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Nome
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="static-card-container">
        <CardHeader>
          <CardTitle>Alterar Senha da Guilda</CardTitle>
          <CardDescription>Deixe em branco para tornar a guilda aberta (sem senha para entrar).</CardDescription>
        </CardHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
            <CardContent>
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="guildPassword">Nova Senha (Opcional)</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input id="guildPassword" type="password" {...field} placeholder="Deixe em branco para guilda aberta" className="form-input pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="btn-gradient btn-style-secondary" disabled={isSubmittingPassword}>
                {isSubmittingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Senha
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      <Card className="static-card-container border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">
            A exclusão da guilda é uma ação permanente e não pode ser desfeita. 
            Todos os dados associados, incluindo membros (de suas listas na guilda, não contas de usuário), eventos e logs, serão perdidos.
          </CardDescription>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Excluir Guilda Permanentemente
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">Tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente a guilda "{guild.name}"
                  e todos os seus dados associados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsDeleting(false)} disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteGuild}
                  className={cn(buttonVariants({ variant: "destructive" }))}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sim, excluir esta guilda
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}


export default function GuildSettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <GuildSettingsPageContent />
    </Suspense>
  );
}
