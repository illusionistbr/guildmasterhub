

"use client";

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, collection, query, where, orderBy, onSnapshot, writeBatch, arrayUnion, increment as firebaseIncrement, serverTimestamp, Timestamp, updateDoc } from '@/lib/firebase';
import type { Guild, Application, GuildMemberRoleInfo, UserProfile } from '@/types/guildmaster';
import { AuditActionType, TLRole, TLWeapon, GuildPermission } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Link2 as LinkIcon, Copy, Loader2, FileText, CheckCircle, XCircle, Users, ShieldAlert, MessageSquare, CalendarIcon as CalendarIconLucide, Shield, Heart, Swords, Gamepad2, Info, Clock, PlayCircle, Sun, Moon, BrainCircuit } from 'lucide-react';
import { useHeader } from '@/contexts/HeaderContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logGuildActivity } from '@/lib/auditLogService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { hasPermission } from '@/lib/permissions';

const getWeaponIconPath = (weapon?: TLWeapon): string => {
  if (!weapon) return "https://placehold.co/24x24.png?text=N/A";
  switch (weapon) {
    case TLWeapon.SwordAndShield: return "https://i.imgur.com/jPEqyNb.png";
    case TLWeapon.Greatsword: return "https://i.imgur.com/Tf1LymG.png";
    case TLWeapon.Daggers: return "https://i.imgur.com/CEM1Oij.png";
    case TLWeapon.Crossbow: return "https://i.imgur.com/u7pqt5H.png";
    case TLWeapon.Longbow: return "https://i.imgur.com/73c5Rl4.png";
    case TLWeapon.Staff: return "https://i.imgur.com/wgjWVvI.png";
    case TLWeapon.WandAndTome: return "https://i.imgur.com/BdYPLee.png";
    case TLWeapon.Spear: return "https://i.imgur.com/l2oHYwY.png";
    default: return "https://placehold.co/24x24.png?text=WPN";
  }
};

const getTLRoleIcon = (role?: TLRole) => {
    if (!role) return null;
    switch (role) {
      case TLRole.Tank: return <Shield className="h-4 w-4 text-sky-500" />;
      case TLRole.Healer: return <Heart className="h-4 w-4 text-emerald-500" />;
      case TLRole.DPS: return <Swords className="h-4 w-4 text-rose-500" />;
      default: return <Gamepad2 className="h-4 w-4" />;
    }
};

interface FixedFormFieldDisplay {
  id: string;
  text: string;
  isTLSpecific?: boolean;
}

const fixedApplicationFields: FixedFormFieldDisplay[] = [
  { id: 'fixed_char_nick', text: 'Nick do Personagem' },
  { id: 'fixed_gear_score', text: 'Gearscore' },
  { id: 'fixed_gear_score_ss', text: 'Link para Screenshot do Gearscore' },
  { id: 'fixed_discord_nick', text: 'Seu Nick no Discord' },
  { id: 'fixed_tl_role', text: 'Sua Função (Tank/Healer/DPS)', isTLSpecific: true },
  { id: 'fixed_tl_primary_weapon', text: 'Arma Primária', isTLSpecific: true },
  { id: 'fixed_tl_secondary_weapon', text: 'Arma Secundária', isTLSpecific: true },
];


function RecruitmentQuestionnaireSettings({ guild }: { guild: Guild | null; }) {
  const isTLGuild = guild?.game === "Throne and Liberty";

  if (!guild) {
    return <div className="text-center py-10">Carregando configurações do questionário...</div>;
  }

  return (
    <Card className="static-card-container mt-8">
      <CardHeader>
        <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Questionário de Recrutamento</CardTitle>
        <CardDescription>Abaixo estão os campos padrão que os candidatos preencherão ao se candidatarem à sua guilda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-3">Campos Padrão do Formulário</h4>
          <div className="space-y-2">
            {fixedApplicationFields.filter(field => !field.isTLSpecific || isTLGuild).map(field => (
              <div key={field.id} className="flex items-center p-3 bg-muted/30 rounded-md border border-input">
                <Info className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-foreground flex-1">{field.text}</p>
              </div>
            ))}
          </div>
           <p className="text-xs text-muted-foreground mt-3">Estes campos fazem parte do formulário de aplicação padrão e não podem ser removidos.</p>
        </div>
      </CardContent>
    </Card>
  );
}


function RecruitmentLinkTabContent({ guild, guildId, recruitmentLink, copyLinkToClipboard, currentUser }: { guild: Guild | null; guildId: string | null; recruitmentLink: string | null; copyLinkToClipboard: () => void; currentUser: UserProfile | null; }) {
  if (!guild || !guildId) {
    return <div className="text-center py-10">Carregando informações da guilda...</div>;
  }

  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  const canManageQuestionnaire = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_RECRUITMENT_PROCESS_APPLICATIONS
    );
  }, [currentUserRoleInfo, guild?.customRoles]);


  return (
    <div className="space-y-6 pt-6">
      <Card className="static-card-container">
        <CardHeader>
          <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-primary" />Link de Recrutamento Único</CardTitle>
          <CardDescription>Compartilhe este link com potenciais recrutas para que eles possam se candidatar à sua guilda. Guildas públicas permitirão entrada imediata após o preenchimento do formulário.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              id="recruitmentLink"
              type="text"
              value={recruitmentLink || "Gerando link..."}
              readOnly
              className="form-input flex-1"
            />
            <Button
              onClick={copyLinkToClipboard}
              disabled={!recruitmentLink}
              variant="outline"
              className="btn-gradient btn-style-secondary"
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar Link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Este link direciona os candidatos para um formulário de aplicação específico da sua guilda.
          </p>
        </CardContent>
      </Card>
      {canManageQuestionnaire && <RecruitmentQuestionnaireSettings guild={guild} />}
    </div>
  );
}


function ApplicationsTabContent({ guild, guildId, currentUser }: { guild: Guild | null; guildId: string | null; currentUser: UserProfile | null }) {
  const router = useRouter();
  const { toast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [processingApplicationId, setProcessingApplicationId] = useState<string | null>(null);
  const [applicationToConfirm, setApplicationToConfirm] = useState<Application | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<"accept" | "reject" | null>(null);

  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  const canViewApplications = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_RECRUITMENT_VIEW_APPLICATIONS
    );
  }, [currentUserRoleInfo, guild?.customRoles]);

  const canProcessApplications = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_RECRUITMENT_PROCESS_APPLICATIONS
    );
  }, [currentUserRoleInfo, guild?.customRoles]);


  useEffect(() => {
    if (!guildId || !currentUser || !guild) {
      setLoadingApplications(false);
      setApplications([]);
      return;
    }

    if (!canViewApplications) {
      setAccessDenied(true);
      setLoadingApplications(false);
      setApplications([]);
      return;
    }
    setAccessDenied(false);

    setLoadingApplications(true);
    const applicationsRef = collection(db, `guilds/${guildId}/applications`);
    const q = query(applicationsRef, orderBy("submittedAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedApplications = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Application));
      setApplications(fetchedApplications);
      setLoadingApplications(false);
    }, (error) => {
      console.error("Erro ao buscar candidaturas:", error);
      toast({ title: "Erro ao Carregar Candidaturas", variant: "destructive" });
      setApplications([]);
      setLoadingApplications(false);
    });

    return () => unsubscribe();
  }, [guildId, currentUser, guild, toast, canViewApplications]);

  const handleProcessApplication = async (application: Application, action: 'accept' | 'reject') => {
    if (!currentUser || !guild || !guildId || !canProcessApplications) {
       toast({ title: "Permissão Negada", description: "Você não tem permissão para processar candidaturas.", variant: "destructive"});
       return;
    }

    setProcessingApplicationId(application.id);
    try {
      const applicationRef = doc(db, `guilds/${guildId}/applications`, application.id);
      const guildRef = doc(db, "guilds", guildId);
      const batch = writeBatch(db);

      if (action === 'accept') {
        const applicantProfileRef = doc(db, "users", application.applicantId);
        const applicantProfileSnap = await getDoc(applicantProfileRef);
        if (!applicantProfileSnap.exists()) {
            toast({title: "Erro ao Aceitar", description: "Perfil do candidato não encontrado no sistema.", variant: "destructive"});
            setProcessingApplicationId(null);
            return;
        }

        if (guild.memberIds?.includes(application.applicantId)) {
           toast({ title: "Já é Membro", description: `${application.applicantName} já faz parte da guilda. Marcando como aprovada.`, variant: "default" });
           batch.update(applicationRef, { status: 'approved', reviewedBy: currentUser.uid, reviewedAt: serverTimestamp() });
        } else {
            const memberRoleInfo: GuildMemberRoleInfo = {
                roleName: "Membro",
                characterNickname: application.applicantName,
                gearScore: application.gearScore,
                gearScoreScreenshotUrl: application.gearScoreScreenshotUrl || null,
                gearBuildLink: application.gearBuildLink || null,
                skillBuildLink: application.skillBuildLink || null,
                notes: `Aceito via candidatura. Discord: ${application.discordNick}`,
                tlRole: application.tlRole,
                tlPrimaryWeapon: application.tlPrimaryWeapon,
                tlSecondaryWeapon: application.tlSecondaryWeapon,
                dkpBalance: 0,
                status: 'Ativo',
            };
            batch.update(guildRef, {
                memberIds: arrayUnion(application.applicantId),
                memberCount: firebaseIncrement(1),
                [`roles.${application.applicantId}`]: memberRoleInfo
            });
            batch.update(applicationRef, { status: 'approved', reviewedBy: currentUser.uid, reviewedAt: serverTimestamp() });

            await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || 'Usuário', AuditActionType.MEMBER_JOINED, {
                targetUserId: application.applicantId, targetUserDisplayName: application.applicantName, details: {joinMethod: "application_approved"} as any
            });
        }

        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || 'Usuário', AuditActionType.APPLICATION_ACCEPTED, {
            applicationId: application.id, targetUserId: application.applicantId, targetUserDisplayName: application.applicantName
        });
        toast({ title: "Candidatura Aceita!", description: `${application.applicantName} agora é membro da guilda.` });

      } else { // Reject
        batch.update(applicationRef, { status: 'rejected', reviewedBy: currentUser.uid, reviewedAt: serverTimestamp() });
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName || 'Usuário', AuditActionType.APPLICATION_REJECTED, {
            applicationId: application.id, targetUserId: application.applicantId, targetUserDisplayName: application.applicantName
        });
        toast({ title: "Candidatura Rejeitada.", description: `A candidatura de ${application.applicantName} foi rejeitada.` });
      }
      await batch.commit();
    } catch (error) {
      console.error(`Erro ao ${action === 'accept' ? 'aceitar' : 'rejeitar'} candidatura:`, error);
      toast({ title: `Erro ao ${action === 'accept' ? 'Aceitar' : 'Rejeitar'}`, description: "Ocorreu um erro ao processar a candidatura.", variant: "destructive" });
    } finally {
      setProcessingApplicationId(null);
      setApplicationToConfirm(null);
      setConfirmationAction(null);
    }
  };

  const openConfirmationDialog = (application: Application, action: "accept" | "reject") => {
    setApplicationToConfirm(application);
    setConfirmationAction(action);
  };

  if (loadingApplications) {
    return (
      <div className="space-y-4 pt-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="static-card-container">
            <CardHeader><div className="h-6 w-1/2 bg-muted rounded animate-pulse"></div></CardHeader>
            <CardContent className="space-y-2">
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
              <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
            </CardContent>
            <CardFooter><div className="h-10 w-24 bg-muted rounded ml-auto animate-pulse"></div></CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-6">
        <ShieldAlert className="h-24 w-24 text-destructive animate-pulse" />
        <h2 className="text-3xl font-headline text-destructive">Acesso Negado</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Você não tem permissão para visualizar as candidaturas desta guilda.
        </p>
        <Button onClick={() => router.back()} variant="outline">Voltar</Button>
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const reviewedApplications = applications.filter(app => app.status !== 'pending');

  return (
    <div className="space-y-8 pt-6">
      {applications.length === 0 && !loadingApplications && (
        <Card className="static-card-container text-center py-10">
          <CardHeader>
            <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl">Nenhuma Candidatura Recebida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Ainda não há candidaturas para esta guilda.
            </p>
          </CardContent>
        </Card>
      )}

      {pendingApplications.length > 0 && (
        <div>
          <h3 className="text-xl font-headline text-primary mb-4">Candidaturas Pendentes ({pendingApplications.length})</h3>
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {pendingApplications.map(app => (
              <Card key={app.id} className="static-card-container flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={app.applicantPhotoURL || `https://placehold.co/64x64.png?text=${app.applicantName.substring(0,1)}`} alt={app.applicantName} data-ai-hint="user avatar" />
                      <AvatarFallback>{app.applicantName.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{app.applicantName}</CardTitle>
                      <CardDescription>Enviado {app.submittedAt ? formatDistanceToNowStrict(app.submittedAt.toDate(), { addSuffix: true, locale: ptBR }) : "Data indisponível"}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <p className="text-sm"><strong>GS:</strong> {app.gearScore}
                    {app.gearScoreScreenshotUrl &&
                      <Button variant="link" size="sm" asChild className="p-0 ml-1 h-auto"><Link href={app.gearScoreScreenshotUrl} target="_blank" rel="noopener noreferrer">(Ver Print)</Link></Button>}
                  </p>
                  <p className="text-sm"><strong>Discord:</strong> {app.discordNick}</p>
                   {app.knowsSomeoneInGuild && <p className="text-sm"><strong>Conhece:</strong> {app.knowsSomeoneInGuild}</p>}
                   {app.additionalNotes && <p className="text-sm italic text-muted-foreground"><strong>Notas:</strong> "{app.additionalNotes}"</p>}

                  {guild?.game === "Throne and Liberty" && (
                    <div className="border-t border-border pt-3 mt-3 space-y-3">
                        <p className="text-sm flex items-center gap-1"><strong>Função:</strong> {getTLRoleIcon(app.tlRole)} {app.tlRole || 'N/A'}</p>
                        <div className="text-sm"><strong>Armas:</strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {app.tlPrimaryWeapon && <Image src={getWeaponIconPath(app.tlPrimaryWeapon)} alt={app.tlPrimaryWeapon} width={20} height={20} data-ai-hint="weapon" />}
                                {app.tlSecondaryWeapon && <Image src={getWeaponIconPath(app.tlSecondaryWeapon)} alt={app.tlSecondaryWeapon} width={20} height={20} data-ai-hint="weapon" />}
                                {!app.tlPrimaryWeapon && !app.tlSecondaryWeapon && <span className="text-muted-foreground text-xs">N/A</span>}
                            </div>
                        </div>
                        {app.gearBuildLink && <p className="text-sm"><strong>Build de Gear:</strong> <Button variant="link" size="sm" asChild className="p-0 h-auto"><Link href={app.gearBuildLink} target="_blank" rel="noopener noreferrer">Ver Link</Link></Button></p>}
                        {app.skillBuildLink && <p className="text-sm"><strong>Build de Skill:</strong> <Button variant="link" size="sm" asChild className="p-0 h-auto"><Link href={app.skillBuildLink} target="_blank" rel="noopener noreferrer">Ver Link</Link></Button></p>}
                        {app.playHoursPerDay && <p className="text-sm flex items-center gap-1.5"><Clock className="h-4 w-4"/> {app.playHoursPerDay} horas/dia</p>}
                        {app.playDaysOfWeek && app.playDaysOfWeek.length > 0 && <p className="text-sm flex items-center gap-1.5"><CalendarIconLucide className="h-4 w-4"/> {app.playDaysOfWeek.join(', ')}</p>}
                        {app.playPeriod && app.playPeriod.length > 0 && <p className="text-sm flex items-center gap-1.5"><PlayCircle className="h-4 w-4"/> {app.playPeriod.join(', ')}</p>}
                    </div>
                  )}

                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => openConfirmationDialog(app, 'reject')} disabled={processingApplicationId === app.id || !canProcessApplications}>
                    {processingApplicationId === app.id && confirmationAction === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />} Rejeitar
                  </Button>
                  <Button onClick={() => openConfirmationDialog(app, 'accept')} disabled={processingApplicationId === app.id || !canProcessApplications} className="btn-gradient btn-style-primary">
                    {processingApplicationId === app.id && confirmationAction === 'accept' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle className="mr-2 h-4 w-4" />} Aceitar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {reviewedApplications.length > 0 && (
         <div>
          <h3 className="text-xl font-headline text-muted-foreground mt-10 mb-4">Candidaturas Revisadas ({reviewedApplications.length})</h3>
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviewedApplications.map(app => (
              <Card key={app.id} className={`static-card-container flex flex-col opacity-70 ${app.status === 'approved' || app.status === 'auto_approved' ? 'border-green-500/30' : 'border-red-500/30'}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={app.applicantPhotoURL || `https://placehold.co/64x64.png?text=${app.applicantName.substring(0,1)}`} alt={app.applicantName} data-ai-hint="user avatar"/>
                      <AvatarFallback>{app.applicantName.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{app.applicantName}</CardTitle>
                       <CardDescription>Revisado {app.reviewedAt ? formatDistanceToNowStrict(app.reviewedAt.toDate(), { addSuffix: true, locale: ptBR }) : (app.status === 'auto_approved' && app.submittedAt ? formatDistanceToNowStrict(app.submittedAt.toDate(), { addSuffix: true, locale: ptBR }) : 'N/A')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                   <p className="text-sm"><strong>GS:</strong> {app.gearScore}</p>
                   <p className="text-sm"><strong>Discord:</strong> {app.discordNick}</p>
                   <Badge variant={app.status === 'approved' || app.status === 'auto_approved' ? 'default' : 'destructive'} className={app.status === 'approved' || app.status === 'auto_approved' ? 'bg-green-600/80' : 'bg-red-600/80'}>
                    {app.status === 'approved' ? 'Aprovado' : (app.status === 'auto_approved' ? 'Entrada Automática' : 'Rejeitado')}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {applicationToConfirm && confirmationAction && (
        <AlertDialog open={!!applicationToConfirm} onOpenChange={() => { setApplicationToConfirm(null); setConfirmationAction(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar {confirmationAction === 'accept' ? 'Aceitação' : 'Rejeição'}</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja {confirmationAction === 'accept' ? 'aceitar' : 'rejeitar'} a candidatura de {applicationToConfirm.applicantName}?
                {confirmationAction === 'accept' && ` Isso o(a) adicionará à guilda (se já não for membro).`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setApplicationToConfirm(null); setConfirmationAction(null); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleProcessApplication(applicationToConfirm, confirmationAction)}
                className={confirmationAction === 'reject' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function RecruitmentPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  const [recruitmentLink, setRecruitmentLink] = useState<string | null>(null);

  const initialTab = searchParams.get('tab') || "recruitment";
  const [activeTab, setActiveTab] = useState(initialTab);

  const guildId = searchParams.get('guildId');

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && (currentTab === "recruitment" || currentTab === "applications")) {
      setActiveTab(currentTab);
    } else {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('tab', 'recruitment');
      router.replace(`${window.location.pathname}?${newSearchParams.toString()}`, { scroll: false });
      setActiveTab("recruitment");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!guildId) {
      toast({ title: "ID da Guilda Ausente", variant: "destructive" });
      router.push('/guild-selection');
      return;
    }

    const fetchGuildData = async () => {
      setLoadingGuildData(true);
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
        setHeaderTitle(`Recrutamento: ${guildData.name}`);

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setRecruitmentLink(`${origin}/apply?guildId=${guildData.id}`);

      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      } finally {
        setLoadingGuildData(false);
      }
    };

    fetchGuildData();

    return () => {
      setHeaderTitle(null);
    };
  }, [guildId, user, authLoading, router, toast, setHeaderTitle]);

  const copyLinkToClipboard = () => {
    if (recruitmentLink) {
      navigator.clipboard.writeText(recruitmentLink)
        .then(() => {
          toast({ title: "Link Copiado!", description: "O link de recrutamento foi copiado para sua área de transferência." });
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          toast({ title: "Erro ao Copiar", description: "Não foi possível copiar o link.", variant: "destructive" });
        });
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('tab', newTab);
    router.push(`${window.location.pathname}?${newSearchParams.toString()}`, { scroll: false });
  };

  if (authLoading || loadingGuildData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!guild) {
    return (
      <PageTitle title="Recrutamento" icon={<UserPlus className="h-8 w-8 text-primary" />}>
        <div className="text-center py-10">Guilda não encontrada ou não carregada.</div>
      </PageTitle>
    );
  }

  return (
    <div className="space-y-8">
      <PageTitle
        title={`Recrutamento para ${guild.name}`}
        description="Gerencie o processo de recrutamento e as candidaturas da sua guilda."
        icon={<UserPlus className="h-8 w-8 text-primary" />}
      />
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recruitment">Configurações</TabsTrigger>
          <TabsTrigger value="applications">Candidaturas</TabsTrigger>
        </TabsList>
        <TabsContent value="recruitment">
          <RecruitmentLinkTabContent
            guild={guild}
            guildId={guildId}
            recruitmentLink={recruitmentLink}
            copyLinkToClipboard={copyLinkToClipboard}
            currentUser={user}
          />
        </TabsContent>
        <TabsContent value="applications">
          <ApplicationsTabContent guild={guild} guildId={guildId} currentUser={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function RecruitmentPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <RecruitmentPage />
    </Suspense>
  );
}

