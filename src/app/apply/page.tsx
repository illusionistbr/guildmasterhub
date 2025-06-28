
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, collection, addDoc, serverTimestamp, Timestamp, query as firestoreQuery, where, getDocs as getFirestoreDocs } from '@/lib/firebase';
import type { Guild, Application } from '@/types/guildmaster';
import { TLRole, TLWeapon } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ShieldEllipsis, CheckCircle, AlertTriangle, Loader2, ArrowLeft, ArrowRight, UserPlus as UserPlusIcon, Heart, Swords, Shield as ShieldIconLucide, Hourglass } from 'lucide-react';

const tlWeaponsList = Object.values(TLWeapon);

const applicationSchema = z.object({
  characterNickname: z.string().min(2, "Nickname deve ter pelo menos 2 caracteres.").max(50, "Nickname muito longo."),
  gearScore: z.coerce.number({invalid_type_error: "Gearscore deve ser um número."}).min(0, "Gearscore deve ser um número positivo."),
  gearScoreScreenshotUrl: z.string().url("URL da screenshot inválida.").optional().or(z.literal('')),
  gearBuildLink: z.string().url("URL da build inválida.").optional().or(z.literal('')),
  skillBuildLink: z.string().url("URL das skills inválida.").optional().or(z.literal('')),
  tlRole: z.nativeEnum(TLRole, { required_error: "Função é obrigatória." }),
  tlPrimaryWeapon: z.nativeEnum(TLWeapon, { required_error: "Arma primária é obrigatória." }),
  tlSecondaryWeapon: z.nativeEnum(TLWeapon, { required_error: "Arma secundária é obrigatória." }),
  gameFocus: z.string().min(1, "O foco de jogo é obrigatório."),
  playTimePerDay: z.string().min(1, "O tempo de jogo é obrigatório."),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

const TOTAL_STEPS = 8;

function ApplyPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasPendingApplication, setHasPendingApplication] = useState(false);
  
  const [step, setStep] = useState(1);

  const guildId = searchParams.get('guildId');

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    mode: "onChange",
    defaultValues: {
      characterNickname: "",
      gearScore: undefined, // Start as undefined to be controlled
      gearScoreScreenshotUrl: "",
      gearBuildLink: "",
      skillBuildLink: "",
      tlRole: undefined,
      tlPrimaryWeapon: undefined,
      tlSecondaryWeapon: undefined,
      gameFocus: "",
      playTimePerDay: "",
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      const currentPath = `/apply?guildId=${guildId}`;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    if (!guildId) {
      toast({ title: "ID da Guilda Ausente", variant: "destructive" });
      router.push('/guilds');
      return;
    }

    const fetchGuildData = async () => {
      setLoadingGuildData(true);
      setHasPendingApplication(false);
      try {
        const applicationsRef = collection(db, `guilds/${guildId}/applications`);
        const q = firestoreQuery(applicationsRef, 
            where("applicantId", "==", currentUser.uid), 
            where("status", "==", "pending")
        );
        const appSnapshot = await getFirestoreDocs(q);

        if (!appSnapshot.empty) {
          setHasPendingApplication(true);
        }

        const guildDocRef = doc(db, "guilds", guildId);
        const guildSnap = await getDoc(guildDocRef);
        if (!guildSnap.exists()) {
          toast({ title: "Guilda Não Encontrada", variant: "destructive" });
          router.push('/guilds');
          return;
        }
        const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;
        if (guildData.memberIds?.includes(currentUser.uid)) {
          toast({ title: "Você já é membro!", variant: "default" });
          router.push(`/dashboard?guildId=${guildId}`);
          return;
        }
        setGuild(guildData);
        if (currentUser.displayName) {
          form.setValue("characterNickname", currentUser.displayName);
        }
      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro ao Carregar Dados", variant: "destructive" });
      } finally {
        setLoadingGuildData(false);
      }
    };
    fetchGuildData();
  }, [guildId, currentUser, authLoading, router, toast, form]);

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof ApplicationFormValues)[] = [];
    switch (step) {
      case 1: fieldsToValidate = ['characterNickname']; break;
      case 2: fieldsToValidate = ['gearScore']; break;
      case 3: fieldsToValidate = ['gearScoreScreenshotUrl', 'gearBuildLink', 'skillBuildLink']; break;
      case 4: fieldsToValidate = ['tlRole']; break;
      case 5: fieldsToValidate = ['tlPrimaryWeapon', 'tlSecondaryWeapon']; break;
      case 6: fieldsToValidate = ['gameFocus']; break;
      case 7: fieldsToValidate = ['playTimePerDay']; break;
    }
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
    }
  };

  const onSubmit: SubmitHandler<ApplicationFormValues> = async (data) => {
    if (!currentUser || !guild || !guildId) return;
    setIsSubmitting(true);
    setSubmissionStatus('idle');

    try {
      const applicationsRef = collection(db, `guilds/${guildId}/applications`);
      await addDoc(applicationsRef, {
        ...data,
        guildId: guildId,
        applicantId: currentUser.uid,
        applicantDisplayName: currentUser.displayName,
        applicantPhotoURL: currentUser.photoURL,
        status: 'pending',
        submittedAt: serverTimestamp(),
      });
      
      setSubmissionStatus('success');
      toast({ title: "Candidatura Enviada!", description: `Sua candidatura para ${guild.name} foi enviada com sucesso.` });
      form.reset();
    } catch (error) {
      console.error("Erro ao enviar candidatura:", error);
      toast({ title: "Erro ao Enviar", description: "Ocorreu um erro ao enviar sua candidatura. Verifique suas permissões e tente novamente.", variant: "destructive" });
      setSubmissionStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loadingGuildData) {
    return <div className="min-h-screen flex items-center justify-center bg-landing-gradient"><Loader2 className="h-16 w-16 animate-spin text-primary"/></div>;
  }
  if (!guild || !currentUser) {
    return <div className="min-h-screen flex items-center justify-center bg-landing-gradient text-center"><AlertTriangle className="h-12 w-12 text-destructive mb-4" /><p className="text-xl text-foreground">Não foi possível carregar os dados.</p></div>;
  }

  if (hasPendingApplication) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-landing-gradient text-center">
        <Card className="w-full max-w-lg static-card-container">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-primary flex items-center justify-center">
              <Hourglass className="mr-3 h-8 w-8 text-yellow-500"/>
              Candidatura Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-foreground">Você já possui uma candidatura para {guild.name} que está aguardando revisão.</p>
            <p className="text-muted-foreground mt-2">
              A liderança da guilda revisará sua aplicação em breve. Por favor, aguarde.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full btn-gradient btn-style-primary"><Link href={`/dashboard`}>Ir para o Dashboard</Link></Button>
            <Button asChild variant="outline" className="w-full"><Link href="/guilds">Explorar Outras Guildas</Link></Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (submissionStatus === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-landing-gradient text-center">
        <Card className="w-full max-w-lg static-card-container">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-primary flex items-center justify-center">
              <CheckCircle className="mr-3 h-8 w-8 text-green-500"/>
              Candidatura Enviada!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-foreground">Sua candidatura para {guild.name} foi enviada com sucesso.</p>
            <p className="text-muted-foreground mt-2">
              A liderança da guilda revisará sua aplicação em breve. Um responsável entrará em contato.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full btn-gradient btn-style-primary"><Link href={`/dashboard`}>Ir para o Dashboard</Link></Button>
            <Button asChild variant="outline" className="w-full"><Link href="/guilds">Explorar Outras Guildas</Link></Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-landing-gradient">
       <div className="text-center mb-6 z-10">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <ShieldEllipsis className="h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-[15deg]" />
          <h1 className="text-2xl font-headline font-bold text-primary">GuildMasterHub</h1>
        </Link>
      </div>
      <Card className="w-full max-w-2xl z-10 bg-card p-6 sm:p-8 rounded-xl shadow-2xl shadow-primary/20 border border-border">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
                <Progress value={(step / TOTAL_STEPS) * 100} className="mb-4" />
                <div className="flex items-center justify-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary"><AvatarImage src={guild.logoUrl || undefined} alt={`${guild.name} logo`} data-ai-hint="guild logo"/><AvatarFallback>{guild.name.substring(0,1).toUpperCase()}</AvatarFallback></Avatar>
                    <CardTitle className="text-2xl font-headline text-primary">Candidatura para {guild.name}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 min-h-[250px] flex flex-col justify-center">
                {step === 1 && <FormField control={form.control} name="characterNickname" render={({ field }) => ( <FormItem> <FormLabel>Qual seu nick in-game?</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /> </FormItem> )}/>}
                {step === 2 && <FormField control={form.control} name="gearScore" render={({ field }) => ( <FormItem> <FormLabel>Qual seu gearscore?</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /> </FormItem> )}/>}
                {step === 3 && <div className="space-y-4">
                    <FormField control={form.control} name="gearScoreScreenshotUrl" render={({ field }) => ( <FormItem> <FormLabel>Link da screenshot do seu gear (Opcional)</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="https://imgur.com/..." /></FormControl><FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="gearBuildLink" render={({ field }) => ( <FormItem> <FormLabel>Link da sua build (Opcional)</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="https://questlog.gg" /></FormControl><FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="skillBuildLink" render={({ field }) => ( <FormItem> <FormLabel>Link das suas skills (Opcional)</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="https://questlog.gg" /></FormControl><FormMessage /> </FormItem> )}/>
                </div>}
                {step === 4 && <FormField control={form.control} name="tlRole" render={({ field }) => ( <FormItem> <FormLabel>Qual sua role?</FormLabel><FormControl><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{Object.values(TLRole).map(role => (<SelectItem key={role} value={role}>{role}</SelectItem>))}</SelectContent></Select></FormControl><FormMessage /> </FormItem> )}/>}
                {step === 5 && <div className="space-y-4">
                     <FormField control={form.control} name="tlPrimaryWeapon" render={({ field }) => ( <FormItem> <FormLabel>Arma primária</FormLabel><FormControl><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{tlWeaponsList.map(w => <SelectItem key={`pri-${w}`} value={w}>{w}</SelectItem>)}</SelectContent></Select></FormControl><FormMessage /> </FormItem> )}/>
                     <FormField control={form.control} name="tlSecondaryWeapon" render={({ field }) => ( <FormItem> <FormLabel>Arma secundária</FormLabel><FormControl><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{tlWeaponsList.map(w => <SelectItem key={`sec-${w}`} value={w}>{w}</SelectItem>)}</SelectContent></Select></FormControl><FormMessage /> </FormItem> )}/>
                </div>}
                {step === 6 && <FormField control={form.control} name="gameFocus" render={({ field }) => (<FormItem><FormLabel>Qual seu foco no jogo?</FormLabel><FormControl><Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="PvE Casual">PvE Casual</SelectItem>
                        <SelectItem value="PvE Semi-hardcore">PvE Semi-hardcore</SelectItem>
                        <SelectItem value="PvE Hardcore">PvE Hardcore</SelectItem>
                        <SelectItem value="PvP Casual">PvP Casual</SelectItem>
                        <SelectItem value="PvP Semi-hardcore">PvP Semi-hardcore</SelectItem>
                        <SelectItem value="PvP Hardcore">PvP Hardcore</SelectItem>
                        <SelectItem value="PvPe Casual">PvPe Casual</SelectItem>
                        <SelectItem value="PvPe Semi-hardcore">PvPe Semi-hardcore</SelectItem>
                        <SelectItem value="PvPe Hardcore">PvPe Hardcore</SelectItem>
                    </SelectContent>
                </Select></FormControl><FormMessage /></FormItem>)}/>}
                {step === 7 && <FormField control={form.control} name="playTimePerDay" render={({ field }) => ( <FormItem><FormLabel>Quanto tempo joga por dia?</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
                <ArrowLeft className="mr-2 h-4 w-4"/> Voltar
              </Button>
              {step < TOTAL_STEPS ? (
                <Button type="button" onClick={handleNextStep}>
                  Seguinte <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
              ) : (
                <Button type="submit" className="btn-gradient btn-style-primary" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UserPlusIcon className="mr-2 h-4 w-4"/>}
                    Enviar Candidatura
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
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

    