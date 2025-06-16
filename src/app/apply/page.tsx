
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, collection, addDoc, serverTimestamp, Timestamp, updateDoc, arrayUnion, increment as firebaseIncrement, writeBatch } from '@/lib/firebase';
import type { Guild, Application, GuildMemberRoleInfo } from '@/types/guildmaster';
import { TLRole, TLWeapon, AuditActionType, GuildRole } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ShieldEllipsis, User, Hash, ImageIcon, MessageSquare, CheckCircle, AlertTriangle, Loader2, UserPlus } from 'lucide-react';
import { logGuildActivity } from '@/lib/auditLogService';

const tlWeaponsList = Object.values(TLWeapon);

const getBaseApplicationSchema = (isTLGuild: boolean) => {
  let schema = z.object({
    characterNickname: z.string().min(2, "Nickname do personagem deve ter pelo menos 2 caracteres.").max(50),
    gearScore: z.coerce.number().min(0, "Gearscore deve ser um número positivo.").max(10000, "Gearscore improvável."),
    gearScoreScreenshotUrl: z.string().url("Por favor, insira uma URL válida para a screenshot.").min(10, "URL da screenshot muito curta."),
    discordNick: z.string().min(2, "Nick do Discord deve ter pelo menos 2 caracteres.").max(50),
  });

  if (isTLGuild) {
    schema = schema.extend({
      tlRole: z.nativeEnum(TLRole, { required_error: "Função (Tank/Healer/DPS) é obrigatória." }),
      tlPrimaryWeapon: z.nativeEnum(TLWeapon, { required_error: "Arma primária é obrigatória." }),
      tlSecondaryWeapon: z.nativeEnum(TLWeapon, { required_error: "Arma secundária é obrigatória." }),
    });
  } else {
     schema = schema.extend({
      tlRole: z.nativeEnum(TLRole).optional(),
      tlPrimaryWeapon: z.nativeEnum(TLWeapon).optional(),
      tlSecondaryWeapon: z.nativeEnum(TLWeapon).optional(),
    });
  }
  return schema;
};

type ApplicationFormValues = z.infer<ReturnType<typeof getBaseApplicationSchema>>;


function ApplyPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [successMessage, setSuccessMessage] = useState<string>("");

  const guildId = searchParams.get('guildId');
  
  const isTLGuild = guild?.game === "Throne and Liberty";
  const applicationSchema = getBaseApplicationSchema(isTLGuild);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      characterNickname: "",
      gearScore: 0,
      gearScoreScreenshotUrl: "",
      discordNick: "",
      ...(isTLGuild && { tlRole: undefined, tlPrimaryWeapon: undefined, tlSecondaryWeapon: undefined }),
    },
  });
  
   useEffect(() => {
    if (currentUser?.displayName && !form.getValues("characterNickname")) {
      form.setValue("characterNickname", currentUser.displayName);
    }
  }, [currentUser, form]);


  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      const currentPath = `/apply?guildId=${guildId}`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!guildId) {
      toast({ title: "ID da Guilda Ausente", description: "Nenhum ID de guilda fornecido para aplicar.", variant: "destructive" });
      router.push('/guilds'); 
      return;
    }

    const fetchGuildData = async () => {
      setLoadingGuildData(true);
      try {
        const guildDocRef = doc(db, "guilds", guildId);
        const guildSnap = await getDoc(guildDocRef);

        if (!guildSnap.exists()) { 
          toast({ title: "Guilda Não Encontrada", description: "Esta guilda não pode receber aplicações ou não existe.", variant: "destructive" });
          router.push('/guilds');
          return;
        }
        const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;

        if(guildData.memberIds?.includes(currentUser.uid)){
            toast({title: "Você já é membro!", description: `Você já faz parte da guilda ${guildData.name}.`, variant: "default"});
            router.push(`/dashboard?guildId=${guildId}`);
            return;
        }
        
        setGuild(guildData);
        form.reset({ 
            characterNickname: currentUser?.displayName || "",
            gearScore: 0,
            gearScoreScreenshotUrl: "",
            discordNick: "",
            ...(guildData.game === "Throne and Liberty" && { tlRole: undefined, tlPrimaryWeapon: undefined, tlSecondaryWeapon: undefined }),
        });

      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro ao Carregar Dados", variant: "destructive" });
      } finally {
        setLoadingGuildData(false);
      }
    };

    fetchGuildData();
  }, [guildId, currentUser, authLoading, router, toast, form]);

  const onSubmit: SubmitHandler<ApplicationFormValues> = async (data) => {
    if (!currentUser || !guild || !guildId) {
      toast({ title: "Erro na Operação", description: "Informações do usuário ou guilda ausentes.", variant: "destructive" });
      return;
    }

    const guildDocRef = doc(db, "guilds", guildId);
    const freshGuildSnap = await getDoc(guildDocRef);
    if (!freshGuildSnap.exists()) {
        toast({ title: "Erro", description: "Guilda não encontrada.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    const freshGuildData = freshGuildSnap.data() as Guild;
    if (freshGuildData.memberIds?.includes(currentUser.uid)) {
        toast({ title: "Já é Membro", description: `Você já faz parte da guilda ${guild.name}.`, variant: "default" });
        router.push(`/dashboard?guildId=${guildId}`);
        setIsSubmitting(false);
        return;
    }


    setIsSubmitting(true);
    setSubmissionStatus('idle');

    const applicationBaseData: Omit<Application, 'id' | 'submittedAt' | 'applicantDisplayName' | 'applicantPhotoURL'> = {
      guildId: guildId,
      applicantId: currentUser.uid,
      applicantName: data.characterNickname,
      gearScore: data.gearScore,
      gearScoreScreenshotUrl: data.gearScoreScreenshotUrl,
      discordNick: data.discordNick,
      status: 'pending', 
      ...(data.tlRole && { tlRole: data.tlRole }),
      ...(data.tlPrimaryWeapon && { tlPrimaryWeapon: data.tlPrimaryWeapon }),
      ...(data.tlSecondaryWeapon && { tlSecondaryWeapon: data.tlSecondaryWeapon }),
    };

    try {
      const applicationsRef = collection(db, `guilds/${guildId}/applications`);
      const submittedAtTimestamp = serverTimestamp() as Timestamp;

      if (guild.isOpen === true || !guild.password) { 
        const batch = writeBatch(db);
        const guildRef = doc(db, "guilds", guildId);
        
        let memberRoleInfo: GuildMemberRoleInfo = {
          generalRole: GuildRole.Membro,
          notes: `Entrou via formulário público. Discord: ${data.discordNick}`,
          dkpBalance: 0, 
        };

        if (isTLGuild) {
          memberRoleInfo.tlRole = data.tlRole;
          memberRoleInfo.tlPrimaryWeapon = data.tlPrimaryWeapon;
          memberRoleInfo.tlSecondaryWeapon = data.tlSecondaryWeapon;
        }

        batch.update(guildRef, {
          memberIds: arrayUnion(currentUser.uid),
          memberCount: firebaseIncrement(1),
          [`roles.${currentUser.uid}`]: memberRoleInfo,
        });

        const appDocForPublicJoinRef = doc(applicationsRef); 
        batch.set(appDocForPublicJoinRef, {
          ...applicationBaseData,
          applicantDisplayName: currentUser.displayName || currentUser.email,
          applicantPhotoURL: currentUser.photoURL || null,
          submittedAt: submittedAtTimestamp,
          status: 'auto_approved',
          reviewedBy: 'system',
          reviewedAt: submittedAtTimestamp,
        });
        
        await batch.commit();

        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.MEMBER_JOINED, { 
            targetUserId: currentUser.uid, 
            targetUserDisplayName: data.characterNickname,
            details: { joinMethod: 'public_form_join' } as any,
        });

        setSuccessMessage(`Você entrou na guilda ${guild.name}! Bem-vindo(a)!`);
        setSubmissionStatus('success');
        toast({ title: "Bem-vindo(a) à Guilda!", description: `Você entrou na guilda ${guild.name}.` });
        form.reset();

      } else { 
        const newApplicationRef = await addDoc(applicationsRef, {
          ...applicationBaseData,
          applicantDisplayName: currentUser.displayName || currentUser.email,
          applicantPhotoURL: currentUser.photoURL || null,
          submittedAt: submittedAtTimestamp,
          status: 'pending', 
        });

        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.APPLICATION_SUBMITTED, {
          applicationId: newApplicationRef.id,
          targetUserDisplayName: data.characterNickname,
        });
        setSuccessMessage(`Sua candidatura para ${guild.name} foi enviada com sucesso.`);
        setSubmissionStatus('success');
        toast({ title: "Candidatura Enviada!", description: `Sua candidatura para ${guild.name} foi enviada com sucesso.` });
        form.reset(); 
      }
    } catch (error) {
      console.error("Erro ao processar candidatura:", error);
      setSubmissionStatus('error');
      toast({ title: "Erro ao Enviar/Entrar", description: "Não foi possível processar sua solicitação. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loadingGuildData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-landing-gradient">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-landing-gradient text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl text-foreground mb-4">Você precisa estar logado para se candidatar.</p>
        <Button asChild><Link href={`/login?redirect=/apply?guildId=${guildId}`}>Fazer Login</Link></Button>
      </div>
    );
  }
  
  if (!guild) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-landing-gradient text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-xl text-foreground">Não foi possível carregar informações da guilda.</p>
      </div>
    );
  }

  if (submissionStatus === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-landing-gradient text-center">
        <Card className="w-full max-w-lg card-bg">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-primary flex items-center justify-center">
              <CheckCircle className="mr-3 h-8 w-8 text-green-500"/> 
              {guild.isOpen || !guild.password ? "Entrada Confirmada!" : "Candidatura Enviada!"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-foreground">{successMessage}</p>
            <p className="text-muted-foreground mt-2">
              {guild.isOpen || !guild.password 
                ? "Você já pode acessar o dashboard da guilda." 
                : "A liderança da guilda revisará sua aplicação em breve. Você pode verificar o status em suas notificações ou na página da guilda se for aceito."}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full btn-gradient btn-style-primary">
              <Link href={`/dashboard?guildId=${guild.id}`}>Acessar Dashboard da Guilda</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/guilds">Explorar Outras Guildas</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-landing-gradient">
      <div className="text-center mb-8 z-10">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <ShieldEllipsis className="h-10 w-10 text-primary transition-transform duration-300 group-hover:rotate-[15deg] group-hover:scale-110" />
          <h1 className="text-3xl font-headline font-bold text-primary">
            GuildMasterHub
          </h1>
        </Link>
      </div>
      
      <Card className="w-full max-w-2xl z-10 bg-card p-6 sm:p-8 rounded-xl shadow-2xl shadow-primary/20 border border-border">
        <CardHeader className="text-center p-0 pb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
                <Avatar className="h-16 w-16 border-2 border-primary">
                    <AvatarImage src={guild.logoUrl || undefined} alt={`${guild.name} logo`} data-ai-hint="guild logo"/>
                    <AvatarFallback>{guild.name.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
                 <CardTitle className="text-3xl font-headline text-primary">
                   {guild.isOpen || !guild.password ? `Entrar em ${guild.name}` : `Candidatar-se para ${guild.name}`}
                 </CardTitle>
            </div>
          <CardDescription>
            {guild.isOpen || !guild.password 
                ? `Preencha o formulário abaixo para entrar na guilda ${guild.name}.`
                : `Preencha o formulário abaixo para enviar sua candidatura para ${guild.name}.`}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <CardContent className="p-0 space-y-5">
              <FormField
                control={form.control}
                name="characterNickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nick do Personagem <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} placeholder="SeuNicknameNoJogo" className="form-input pl-10"/>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="gearScore"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Gearscore <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                        <div className="relative flex items-center">
                            <Hash className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                            <Input type="number" {...field} placeholder="Ex: 5200" className="form-input pl-10"/>
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="discordNick"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Seu Nick no Discord <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                        <div className="relative flex items-center">
                            <MessageSquare className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                            <Input {...field} placeholder="usuario#1234" className="form-input pl-10"/>
                        </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="gearScoreScreenshotUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link para Screenshot do Gearscore (Ex: Imgur) <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <ImageIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input {...field} placeholder="https://i.imgur.com/..." className="form-input pl-10"/>
                      </div>
                    </FormControl>
                    <FormMessage />
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
                        <FormLabel>Sua Função (Tank/Healer/DPS) <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} >
                          <FormControl>
                            <SelectTrigger className="form-input">
                              <SelectValue placeholder="Selecione sua função principal..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(TLRole).map(role => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
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
                            <FormLabel>Arma Primária <span className="text-destructive">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""} >
                            <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Arma primária..." /></SelectTrigger></FormControl>
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
                            <FormLabel>Arma Secundária <span className="text-destructive">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""} >
                            <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Arma secundária..." /></SelectTrigger></FormControl>
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
            <CardFooter className="p-0 pt-6 flex flex-col sm:flex-row justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" className="btn-gradient btn-style-primary w-full sm:w-auto" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                    {isSubmitting 
                        ? (guild.isOpen || !guild.password ? 'Entrando...' : 'Enviando...') 
                        : (guild.isOpen || !guild.password ? 'Confirmar e Entrar' : 'Enviar Candidatura')}
                </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
       <footer className="mt-8 text-center text-sm text-muted-foreground z-10">
        <p>&copy; {new Date().getFullYear()} GuildMasterHub. Boa sorte!</p>
      </footer>
    </div>
  );
}


export default function ApplyPage() {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-landing-gradient"><Loader2 className="h-16 w-16 animate-spin text-primary"/></div>}>
        <ApplyPageContent />
      </Suspense>
    );
  }

