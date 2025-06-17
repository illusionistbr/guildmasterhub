
"use client";

import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot, writeBatch, arrayUnion, increment as firebaseIncrement, serverTimestamp, Timestamp } from '@/lib/firebase';
import type { Guild, Application, GuildMemberRoleInfo, UserProfile } from '@/types/guildmaster';
import { AuditActionType, TLRole, TLWeapon, GuildPermission } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, CheckCircle, XCircle, UserPlus, Users, Loader2, ShieldAlert, MessageSquare, CalendarIcon as CalendarIconLucide, Shield, Heart, Swords, Gamepad2 } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { logGuildActivity } from '@/lib/auditLogService';
import { useHeader } from '@/contexts/HeaderContext';
import Link from 'next/link';
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
import { hasPermission } from '@/lib/permissions'; // Import the helper

const getWeaponIconPath = (weapon?: TLWeapon): string => {
  if (!weapon) return "https://placehold.co/24x24.png?text=N/A";
  switch (weapon) {
    case TLWeapon.SwordAndShield: return "https://i.imgur.com/jPEqyNb.png";
    case TLWeapon.Greatsword: return "https://i.imgur.com/Tf1LymG.png";
    case TLWeapon.Daggers: return "https://i.imgur.com/CEM1Oij.png";
    case TLWeapon.Crossbow: return "https://i.imgur.com/u7pqt5H.png";
    case TLWeapon.Bow: return "https://i.imgur.com/73c5Rl4.png";
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


function ApplicationsPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [processingApplicationId, setProcessingApplicationId] = useState<string | null>(null);

  const [applicationToConfirm, setApplicationToConfirm] = useState<Application | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<"accept" | "reject" | null>(null);


  const guildId = searchParams.get('guildId');

  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  const canUserProcessApplications = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_RECRUITMENT_PROCESS_APPLICATIONS
    );
  }, [currentUserRoleInfo, guild?.customRoles]);

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

    const fetchGuildDetails = async () => {
      setLoadingData(true);
      setAccessDenied(false); 
      try {
        const guildDocRef = doc(db, "guilds", guildId);
        const guildSnap = await getDoc(guildDocRef);
        if (guildSnap.exists()) {
          const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;
          setGuild(guildData);
          setHeaderTitle(`Candidaturas: ${guildData.name}`);
          
          const userRoleInfo = guildData.roles?.[currentUser.uid];
          if (!userRoleInfo || !hasPermission(userRoleInfo.roleName, guildData.customRoles, GuildPermission.MANAGE_RECRUITMENT_VIEW_APPLICATIONS)) {
            setAccessDenied(true);
            setLoadingData(false);
            return;
          }
        } else {
          toast({ title: "Guilda nao encontrada", variant: "destructive" });
          router.push('/guild-selection');
          setLoadingData(false); 
          return;
        }
      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro ao carregar dados da guilda", variant: "destructive" });
      }
    };
    fetchGuildDetails();
    
    return () => {
        setHeaderTitle(null);
    }
  }, [guildId, currentUser, authLoading, router, toast, setHeaderTitle]);


  useEffect(() => {
    if (!guildId || !currentUser || authLoading || accessDenied || !guild) {
      if (!authLoading && (accessDenied || !guild)) { 
          setLoadingData(false); 
          setApplications([]); 
      }
      return;
    }
    
    // Check for view permission before fetching
    const userRoleInfo = guild.roles?.[currentUser.uid];
    if (!userRoleInfo || !hasPermission(userRoleInfo.roleName, guild.customRoles, GuildPermission.MANAGE_RECRUITMENT_VIEW_APPLICATIONS)) {
      setAccessDenied(true);
      setLoadingData(false);
      setApplications([]);
      return;
    }
    
    setLoadingData(true); 
    const applicationsRef = collection(db, `guilds/${guildId}/applications`);
    const q = query(applicationsRef, orderBy("submittedAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedApplications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
      setApplications(fetchedApplications);
      setLoadingData(false);
    }, (error) => {
      console.error("Erro ao buscar candidaturas:", error);
      toast({ title: "Erro ao Carregar Candidaturas", variant: "destructive" });
      setApplications([]);
      setLoadingData(false);
    });

    return () => unsubscribe();

  }, [guildId, currentUser, authLoading, accessDenied, guild, toast]);


  const handleProcessApplication = async (application: Application, action: 'accept' | 'reject') => {
    if (!currentUser || !guild || !guildId || !canUserProcessApplications) {
       toast({ title: "Permissao Negada", description: "Voce nao tem permissao para processar candidaturas.", variant: "destructive"});
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
            toast({title: "Erro ao Aceitar", description: "Perfil do candidato nao encontrado no sistema.", variant: "destructive"});
            setProcessingApplicationId(null);
            return;
        }

        if (guild.memberIds?.includes(application.applicantId)) {
           toast({ title: "Ja e Membro", description: `${application.applicantName} ja faz parte da guilda. Marcando como aprovada.`, variant: "default" });
           batch.update(applicationRef, { status: 'approved', reviewedBy: currentUser.uid, reviewedAt: serverTimestamp() });
        } else {
            const memberRoleInfo: GuildMemberRoleInfo = {
                roleName: "Membro", // Default role for new members
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
            
            await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.MEMBER_JOINED, { 
                targetUserId: application.applicantId, targetUserDisplayName: application.applicantName, details: {joinMethod: "application_approved"} as any
            });
        }
        
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.APPLICATION_ACCEPTED, { 
            applicationId: application.id, targetUserId: application.applicantId, targetUserDisplayName: application.applicantName 
        });
        toast({ title: "Candidatura Aceita!", description: `${application.applicantName} agora e membro da guilda.` });

      } else { // Reject
        batch.update(applicationRef, { status: 'rejected', reviewedBy: currentUser.uid, reviewedAt: serverTimestamp() });
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.APPLICATION_REJECTED, { 
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

  if (authLoading || loadingData) { 
    return (
        <div className="space-y-4 p-4 md:p-6">
            <PageTitle title="Candidaturas" icon={<FileText className="h-8 w-8 text-primary" />} />
            {[...Array(3)].map((_, i) => (
                <Card key={i} className="card-bg">
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
      <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10">
        <ShieldAlert className="h-24 w-24 text-destructive animate-pulse" />
        <h2 className="text-3xl font-headline text-destructive">Acesso Negado</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Voce nao tem permissao para visualizar as candidaturas desta guilda.
        </p>
        <Button onClick={() => router.back()} variant="outline">Voltar</Button>
      </div>
    );
  }
  
  if (!guild && !loadingData) { 
     return <div className="p-6 text-center">Guilda nao carregada ou nao encontrada.</div>;
  }

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const reviewedApplications = applications.filter(app => app.status !== 'pending');

  return (
    <div className="space-y-8">
      <PageTitle 
        title={`Candidaturas para ${guild?.name || 'Guilda'}`}
        description="Revise e gerencie as candidaturas de novos membros."
        icon={<FileText className="h-8 w-8 text-primary" />}
      />

      {applications.length === 0 && !loadingData && (
        <Card className="card-bg text-center py-10">
          <CardHeader>
            <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl">Nenhuma Candidatura Recebida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Ainda nao ha candidaturas para esta guilda. Compartilhe o <Link href={`/dashboard/recruitment?guildId=${guildId}`} className="text-primary hover:underline">link de recrutamento</Link>!
            </p>
          </CardContent>
        </Card>
      )}

      {pendingApplications.length > 0 && (
        <div>
          <h2 className="text-2xl font-headline text-primary mb-4">Candidaturas Pendentes ({pendingApplications.length})</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingApplications.map(app => (
              <Card key={app.id} className="card-bg flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={app.applicantPhotoURL || `https://placehold.co/64x64.png?text=${app.applicantName.substring(0,1)}`} alt={app.applicantName} data-ai-hint="user avatar" />
                      <AvatarFallback>{app.applicantName.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-xl">{app.applicantName}</CardTitle>
                      <CardDescription>Enviado {app.submittedAt ? formatDistanceToNowStrict(app.submittedAt.toDate(), { addSuffix: true, locale: ptBR }) : "Data indisponivel"}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <p className="text-sm"><strong>GS:</strong> {app.gearScore} 
                    {app.gearScoreScreenshotUrl && 
                      <Button variant="link" size="sm" asChild className="p-0 ml-1 h-auto"><Link href={app.gearScoreScreenshotUrl} target="_blank" rel="noopener noreferrer">(Ver Print)</Link></Button>}
                  </p>
                  {guild?.game === "Throne and Liberty" && (
                    <>
                        <p className="text-sm flex items-center gap-1"><strong>Funcao:</strong> {getTLRoleIcon(app.tlRole)} {app.tlRole || 'N/A'}</p>
                        <div className="text-sm"><strong>Armas:</strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {app.tlPrimaryWeapon && <Image src={getWeaponIconPath(app.tlPrimaryWeapon)} alt={app.tlPrimaryWeapon} width={20} height={20} data-ai-hint="weapon" />}
                                {app.tlSecondaryWeapon && <Image src={getWeaponIconPath(app.tlSecondaryWeapon)} alt={app.tlSecondaryWeapon} width={20} height={20} data-ai-hint="weapon" />}
                                {!app.tlPrimaryWeapon && !app.tlSecondaryWeapon && <span className="text-muted-foreground text-xs">N/A</span>}
                            </div>
                        </div>
                    </>
                  )}
                  <p className="text-sm"><strong>Discord:</strong> {app.discordNick}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => openConfirmationDialog(app, 'reject')} disabled={processingApplicationId === app.id || !canUserProcessApplications}>
                    {processingApplicationId === app.id && confirmationAction === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <XCircle className="mr-2 h-4 w-4" />} Rejeitar
                  </Button>
                  <Button onClick={() => openConfirmationDialog(app, 'accept')} disabled={processingApplicationId === app.id || !canUserProcessApplications} className="btn-gradient btn-style-primary">
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
          <h2 className="text-2xl font-headline text-muted-foreground mt-10 mb-4">Candidaturas Revisadas ({reviewedApplications.length})</h2>
           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviewedApplications.map(app => (
              <Card key={app.id} className={`card-bg flex flex-col opacity-70 ${app.status === 'approved' || app.status === 'auto_approved' ? 'border-green-500/30' : 'border-red-500/30'}`}>
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
                  <p className="text-sm"><strong>GS:</strong> {app.gearScore}
                    {app.gearScoreScreenshotUrl && 
                      <Button variant="link" size="sm" asChild className="p-0 ml-1 h-auto"><Link href={app.gearScoreScreenshotUrl} target="_blank" rel="noopener noreferrer">(Ver Print)</Link></Button>}
                  </p>
                  {guild?.game === "Throne and Liberty" && (
                     <>
                        <p className="text-sm flex items-center gap-1"><strong>Funcao:</strong> {getTLRoleIcon(app.tlRole)} {app.tlRole || 'N/A'}</p>
                        <div className="text-sm"><strong>Armas:</strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {app.tlPrimaryWeapon && <Image src={getWeaponIconPath(app.tlPrimaryWeapon)} alt={app.tlPrimaryWeapon} width={20} height={20} data-ai-hint="weapon"/>}
                                {app.tlSecondaryWeapon && <Image src={getWeaponIconPath(app.tlSecondaryWeapon)} alt={app.tlSecondaryWeapon} width={20} height={20} data-ai-hint="weapon"/>}
                                 {!app.tlPrimaryWeapon && !app.tlSecondaryWeapon && <span className="text-muted-foreground text-xs">N/A</span>}
                            </div>
                        </div>
                    </>
                  )}
                  <p className="text-sm"><strong>Discord:</strong> {app.discordNick}</p>
                   <Badge variant={app.status === 'approved' || app.status === 'auto_approved' ? 'default' : 'destructive'} className={app.status === 'approved' || app.status === 'auto_approved' ? 'bg-green-600/80' : 'bg-red-600/80'}>
                    {app.status === 'approved' ? 'Aprovado' : (app.status === 'auto_approved' ? 'Entrada Automatica' : 'Rejeitado')}
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
              <AlertDialogTitle>Confirmar {confirmationAction === 'accept' ? 'Aceitacao' : 'Rejeicao'}</AlertDialogTitle>
              <AlertDialogDescription>
                Voce tem certeza que deseja {confirmationAction === 'accept' ? 'aceitar' : 'rejeitar'} a candidatura de {applicationToConfirm.applicantName}?
                {confirmationAction === 'accept' && ` Isso o(a) adicionara a guilda (se ja nao for membro).`}
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

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <ApplicationsPageContent />
    </Suspense>
  );
}
