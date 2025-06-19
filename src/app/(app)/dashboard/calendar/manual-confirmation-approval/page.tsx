
"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, collection, query, where, orderBy, onSnapshot, writeBatch, serverTimestamp, Timestamp, updateDoc, increment, getDocs as getFirestoreDocs } from '@/lib/firebase';
import type { Guild, Event as GuildEvent, ManualConfirmation, GuildMemberRoleInfo } from '@/types/guildmaster';
import { GuildPermission, AuditActionType } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, ShieldAlert, CheckCircle, XCircle, Edit, ListChecks, ExternalLink, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { format, subHours, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { hasPermission } from '@/lib/permissions';
import { logGuildActivity } from '@/lib/auditLogService';
import { useHeader } from '@/contexts/HeaderContext';
import { Label } from '@/components/ui/label'; // Added Label import

interface ConfirmationWithRejection extends ManualConfirmation {
  rejectionReasonInput?: string;
}

interface EventWithConfirmations extends GuildEvent {
  pendingConfirmations: ConfirmationWithRejection[];
}

function ManualConfirmationApprovalPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [eventsWithPendingConfirmations, setEventsWithPendingConfirmations] = useState<EventWithConfirmations[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [processingConfirmationId, setProcessingConfirmationId] = useState<string | null>(null);
  
  const guildId = searchParams.get('guildId');

  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  const canManageConfirmations = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_MANUAL_CONFIRMATIONS_APPROVE
    );
  }, [currentUserRoleInfo, guild?.customRoles]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push(`/login?redirect=/dashboard/calendar/manual-confirmation-approval?guildId=${guildId || ''}`);
      return;
    }
    if (!guildId) {
      toast({ title: "ID da Guilda Ausente", variant: "destructive" });
      router.push('/guild-selection');
      return;
    }

    const fetchInitialData = async () => {
      setLoadingData(true);
      setAccessDenied(false);
      try {
        const guildDocRef = doc(db, "guilds", guildId);
        const guildSnap = await getDoc(guildDocRef);

        if (!guildSnap.exists()) {
          toast({ title: "Guilda não encontrada", variant: "destructive" });
          router.push('/guild-selection');
          setLoadingData(false);
          return;
        }
        const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;
        setGuild(guildData);
        setHeaderTitle(`Aprovar Confirmações: ${guildData.name}`);

        const userRole = guildData.roles?.[currentUser.uid];
        if (!userRole || !hasPermission(userRole.roleName, guildData.customRoles, GuildPermission.MANAGE_MANUAL_CONFIRMATIONS_APPROVE)) {
          setAccessDenied(true);
          setLoadingData(false);
          return;
        }
      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro ao carregar dados da guilda", variant: "destructive" });
        setLoadingData(false);
      }
    };
    fetchInitialData();
    
    return () => {
      setHeaderTitle(null);
    }
  }, [guildId, currentUser, authLoading, router, toast, setHeaderTitle]);


  const fetchEventsAndConfirmations = useCallback(async () => {
    if (!guildId || !canManageConfirmations || !guild) return;

    setLoadingData(true);
    try {
      const twentyFourHoursAgo = subHours(new Date(), 24);
      const eventsRef = collection(db, `guilds/${guildId}/events`);
      const qEvents = firestoreQuery(eventsRef, orderBy("date", "desc"), orderBy("time", "desc"), limit(50));

      const unsubscribe = onSnapshot(qEvents, async (snapshot) => {
        const fetchedEventsPromises = snapshot.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as GuildEvent))
          .filter(event => {
            const eventStartDateTime = new Date(`${event.date}T${event.time}`);
            return isAfter(eventStartDateTime, twentyFourHoursAgo);
          })
          .map(async (event) => {
            const confirmationsRef = collection(db, `guilds/${guildId}/events/${event.id}/manualConfirmations`);
            const qConfirmations = firestoreQuery(confirmationsRef, where("status", "==", "pending"));
            const confirmationsSnapshot = await getFirestoreDocs(qConfirmations);
            const pendingConfirmations = confirmationsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), rejectionReasonInput: "" } as ConfirmationWithRejection));
            return { ...event, pendingConfirmations };
          });
        
        const eventsWithData = await Promise.all(fetchedEventsPromises);
        setEventsWithPendingConfirmations(eventsWithData.filter(e => e.pendingConfirmations.length > 0));
        setLoadingData(false);
      }, (error) => {
        console.error("Erro ao buscar eventos e confirmações:", error);
        toast({ title: "Erro ao Carregar Dados", variant: "destructive" });
        setLoadingData(false);
      });
      return unsubscribe; 
    } catch (error) {
        console.error("Erro ao buscar eventos e confirmações:", error);
        toast({ title: "Erro ao Carregar Dados", variant: "destructive" });
        setLoadingData(false);
    }
  }, [guildId, canManageConfirmations, guild, toast]);


  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if(canManageConfirmations && guild){
        fetchEventsAndConfirmations().then(unsub => {
            unsubscribe = unsub;
        });
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [canManageConfirmations, guild, fetchEventsAndConfirmations]);


  const handleRejectionReasonChange = (eventId: string, confirmationId: string, reason: string) => {
    setEventsWithPendingConfirmations(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? {
              ...event,
              pendingConfirmations: event.pendingConfirmations.map(conf =>
                conf.id === confirmationId ? { ...conf, rejectionReasonInput: reason } : conf
              ),
            }
          : event
      )
    );
  };

  const handleProcessConfirmation = async (
    eventId: string,
    confirmation: ConfirmationWithRejection,
    action: 'approve' | 'reject'
  ) => {
    if (!currentUser || !guild || !guildId || !canManageConfirmations) return;
    setProcessingConfirmationId(confirmation.id!);

    try {
      const batch = writeBatch(db);
      const confirmationRef = doc(db, `guilds/${guildId}/events/${eventId}/manualConfirmations`, confirmation.id!);
      const eventData = eventsWithPendingConfirmations.find(e => e.id === eventId);

      if (action === 'approve') {
        let dkpAwarded = 0;
        if (guild.dkpSystemEnabled && eventData?.dkpValue && eventData.dkpValue > 0) {
          dkpAwarded = eventData.dkpValue;
          const userRolePath = `roles.${confirmation.userId}.dkpBalance`;
          const guildRef = doc(db, "guilds", guildId);
          batch.update(guildRef, { [userRolePath]: increment(dkpAwarded) });
        }
        batch.update(confirmationRef, {
          status: 'approved',
          reviewedBy: currentUser.uid,
          reviewedAt: serverTimestamp(),
          dkpAwarded: dkpAwarded > 0 ? dkpAwarded : null,
        });
        await logGuildActivity(guildId,currentUser.uid, currentUser.displayName, AuditActionType.MANUAL_CONFIRMATION_APPROVED,
          { eventId, eventName: eventData?.title || 'Evento desconhecido', targetUserId: confirmation.userId, targetUserDisplayName: confirmation.userDisplayName }
        );
        toast({ title: "Confirmação Aprovada!", description: `${confirmation.userDisplayName} teve a participação aprovada.` });
      } else { // Reject
        batch.update(confirmationRef, {
          status: 'rejected',
          reviewedBy: currentUser.uid,
          reviewedAt: serverTimestamp(),
          rejectionReason: confirmation.rejectionReasonInput || "Nenhum motivo fornecido.",
        });
        await logGuildActivity(guildId, currentUser.uid, currentUser.displayName, AuditActionType.MANUAL_CONFIRMATION_REJECTED,
          { eventId, eventName: eventData?.title || 'Evento desconhecido', targetUserId: confirmation.userId, targetUserDisplayName: confirmation.userDisplayName, details: { rejectionReason: confirmation.rejectionReasonInput } as any }
        );
        toast({ title: "Confirmação Rejeitada." });
      }
      await batch.commit();
      // No need to call fetchEventsAndConfirmations() explicitly, onSnapshot will handle it
    } catch (error) {
      console.error("Erro ao processar confirmação:", error);
      toast({ title: "Erro ao Processar", variant: "destructive" });
    } finally {
      setProcessingConfirmationId(null);
    }
  };


  if (authLoading || (loadingData && !guild)) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10">
        <ShieldAlert className="h-24 w-24 text-destructive animate-pulse" />
        <h2 className="text-3xl font-headline text-destructive">Acesso Negado</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Você não tem permissão para aprovar confirmações manuais nesta guilda.
        </p>
        <Button onClick={() => router.back()} variant="outline">Voltar</Button>
      </div>
    );
  }
  
  const eventsToList = eventsWithPendingConfirmations.filter(event => event.pendingConfirmations.length > 0);

  return (
    <div className="space-y-8 p-4 md:p-6">
      <PageTitle
        title="Aprovar Confirmações Manuais"
        description="Revise as submissões de participação manual dos membros para eventos recentes (últimas 24h)."
        icon={<ListChecks className="h-8 w-8 text-primary" />}
      />

      {loadingData && eventsToList.length === 0 && (
        <div className="text-center py-10"><Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />Carregando eventos...</div>
      )}
      {!loadingData && eventsToList.length === 0 && (
        <Card className="static-card-container text-center py-10">
           <CardHeader><CardTitle>Nenhuma Confirmação Pendente</CardTitle></CardHeader>
           <CardContent><p className="text-muted-foreground">Não há submissões manuais pendentes para eventos que iniciaram nas últimas 24 horas.</p></CardContent>
        </Card>
      )}

      {eventsToList.length > 0 && (
        <Accordion type="multiple" className="w-full space-y-4">
          {eventsToList.map((event) => (
            <AccordionItem value={event.id} key={event.id} className="static-card-container rounded-lg overflow-hidden border">
              <AccordionTrigger className="p-4 hover:no-underline text-left">
                <div className="flex-grow space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                    <p className="text-xs text-muted-foreground">
                        Início: {format(new Date(`${event.date}T${event.time}`), "dd/MM/yy HH:mm", { locale: ptBR })} - {event.pendingConfirmations.length} pendente(s)
                    </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <div className="space-y-4">
                  {event.pendingConfirmations.map((conf) => (
                    <Card key={conf.id} className="bg-background/50 border-border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-10 w-10">
                                <AvatarImage src={conf.applicantPhotoURL || `https://placehold.co/40x40.png?text=${(conf.userDisplayName || 'U').substring(0,1)}`} alt={conf.userDisplayName || "Usuário"} data-ai-hint="user avatar"/>
                                <AvatarFallback>{(conf.userDisplayName || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <CardTitle className="text-md">{conf.userDisplayName}</CardTitle>
                            </div>
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-500">Pendente</Badge>
                        </div>
                         <p className="text-xs text-muted-foreground pt-1">Enviado: {conf.submittedAt ? format(conf.submittedAt.toDate(), "dd/MM/yy HH:mm", { locale: ptBR }) : 'N/A'}</p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {conf.screenshotUrl && (
                          <div>
                            <Label className="text-sm font-medium">Screenshot:</Label>
                            <a href={conf.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-primary hover:underline truncate">
                                <ImageIcon className="inline h-4 w-4 mr-1" /> {conf.screenshotUrl} <ExternalLink className="inline h-3 w-3 ml-0.5" />
                            </a>
                          </div>
                        )}
                        {conf.notes && (
                          <div>
                            <Label className="text-sm font-medium">Notas do Usuário:</Label>
                            <p className="text-sm text-muted-foreground italic bg-muted/30 p-2 rounded-md mt-1">{conf.notes}</p>
                          </div>
                        )}
                        <div className="pt-2">
                            <Label htmlFor={`rejection-${conf.id}`} className="text-sm font-medium">Motivo da Rejeição (se aplicável):</Label>
                            <Textarea
                                id={`rejection-${conf.id}`}
                                placeholder="Insira o motivo se for rejeitar..."
                                value={conf.rejectionReasonInput}
                                onChange={(e) => handleRejectionReasonChange(event.id, conf.id!, e.target.value)}
                                rows={2}
                                className="mt-1 form-input"
                                disabled={processingConfirmationId === conf.id}
                            />
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleProcessConfirmation(event.id, conf, 'reject')}
                          disabled={processingConfirmationId === conf.id || !canManageConfirmations}
                          className="border-destructive text-destructive hover:bg-destructive/10"
                        >
                          {processingConfirmationId === conf.id && action === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                          Rejeitar
                        </Button>
                        <Button
                          onClick={() => handleProcessConfirmation(event.id, conf, 'approve')}
                          disabled={processingConfirmationId === conf.id || !canManageConfirmations}
                          className="btn-gradient btn-style-secondary"
                        >
                          {processingConfirmationId === conf.id && action === 'approve' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                          Aprovar
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

export default function ManualConfirmationApprovalPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <ManualConfirmationApprovalPageContent />
    </Suspense>
  );
}

