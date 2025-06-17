
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, collection, query, orderBy, onSnapshot, Timestamp } from '@/lib/firebase';
import type { Guild, Event as GuildEvent, GuildMemberRoleInfo } from '@/types/guildmaster';
import { GuildPermission } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, ShieldAlert, KeyRound, Eye, VenetianMask, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHeader } from '@/contexts/HeaderContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasPermission } from '@/lib/permissions';

const EVENTS_PER_PAGE_OPTIONS = [10, 25, 50];

function CalendarPinCodesPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [allEvents, setAllEvents] = useState<GuildEvent[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [visiblePinCodes, setVisiblePinCodes] = useState<Record<string, boolean>>({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage, setEventsPerPage] = useState(EVENTS_PER_PAGE_OPTIONS[0]);


  const guildId = searchParams.get('guildId');

  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  const canViewPins = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_EVENTS_VIEW_PIN
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

        if (!guildSnap.exists()) {
          toast({ title: "Guilda não encontrada", variant: "destructive" });
          router.push('/guild-selection');
          setLoadingData(false);
          return;
        }
        const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;
        setGuild(guildData);
        setHeaderTitle(`PIN Codes: ${guildData.name}`);

        const userRoleData = guildData.roles?.[currentUser.uid];
        if (!userRoleData || !hasPermission(userRoleData.roleName, guildData.customRoles, GuildPermission.MANAGE_EVENTS_VIEW_PIN)) {
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
    fetchGuildDetails();

    return () => {
        setHeaderTitle(null);
    }
  }, [guildId, currentUser, authLoading, router, toast, setHeaderTitle]);


  useEffect(() => {
    if (!guildId || !currentUser || authLoading || accessDenied || !guild || !canViewPins) {
      if (!authLoading && (accessDenied || !guild)) {
          setLoadingData(false);
          setAllEvents([]);
      }
      return;
    }

    setLoadingData(true);
    const eventsRef = collection(db, `guilds/${guildId}/events`);
    const q = query(eventsRef, orderBy("date", "desc"), orderBy("time", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedEvents = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as GuildEvent));
      setAllEvents(fetchedEvents);
      setLoadingData(false);
    }, (error) => {
      console.error("Erro ao buscar eventos:", error);
      toast({ title: "Erro ao Carregar Eventos", variant: "destructive" });
      setAllEvents([]);
      setLoadingData(false);
    });

    return () => unsubscribe();

  }, [guildId, currentUser, authLoading, accessDenied, guild, toast, canViewPins]);

  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * eventsPerPage;
    return allEvents.slice(startIndex, startIndex + eventsPerPage);
  }, [allEvents, currentPage, eventsPerPage]);

  const totalPages = Math.ceil(allEvents.length / eventsPerPage);

  const formatEventDateTime = (dateStr: string, timeStr: string): string => {
    try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        const localDate = new Date(year, month - 1, day, hours, minutes);
        return format(localDate, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch (e) {
        console.error("Error formatting date/time", e, "Input:", dateStr, timeStr);
        return "Data/Hora inválida";
    }
  };

  const togglePinVisibility = (eventId: string) => {
    setVisiblePinCodes(prev => ({...prev, [eventId]: !prev[eventId]}));
  }

  if (authLoading || (loadingData && !guild)) {
    return (
        <div className="space-y-4 p-4 md:p-6">
            <PageTitle title="PIN Codes dos Eventos" icon={<KeyRound className="h-8 w-8 text-primary" />} />
            <Skeleton className="h-12 w-full" />
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center text-center space-y-6 p-8 rounded-lg bg-card shadow-xl mt-10">
        <ShieldAlert className="h-24 w-24 text-destructive animate-pulse" />
        <h2 className="text-3xl font-headline text-destructive">Acesso Negado</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Você não tem permissão para visualizar os PIN codes dos eventos desta guilda.
        </p>
        <Button onClick={() => router.back()} variant="outline">Voltar</Button>
      </div>
    );
  }

  if (!guild && !loadingData) {
     return <div className="p-6 text-center">Guilda não carregada ou não encontrada.</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageTitle
        title={`PIN Codes de ${guild?.name || 'Guilda'}`}
        description="Visualize os códigos PIN dos eventos criados. Apenas usuários com permissão podem ver os códigos."
        icon={<KeyRound className="h-8 w-8 text-primary" />}
      />

      {loadingData && (
        <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      )}

      {!loadingData && allEvents.length === 0 && (
        <div className="text-center py-10 bg-card rounded-lg shadow">
            <VenetianMask className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-foreground">Nenhum Evento com PIN Criado</p>
            <p className="text-muted-foreground mt-2">
                Ainda não há eventos com códigos PIN para esta guilda, ou nenhum evento foi criado que requeira um.
            </p>
        </div>
      )}

      {!loadingData && allEvents.length > 0 && (
        <>
        <div className="overflow-x-auto bg-card p-4 sm:p-6 rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Data/Hora Início</TableHead>
                <TableHead>DKP</TableHead>
                <TableHead className="text-center">PIN Ativo</TableHead>
                <TableHead className="text-center">Código PIN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatEventDateTime(event.date, event.time)}
                  </TableCell>
                  <TableCell>{event.dkpValue || "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={event.requiresPin ? "default" : "outline"} className={event.requiresPin ? "bg-green-500/20 text-green-500 border-green-500/50" : ""}>
                      {event.requiresPin ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {event.requiresPin && event.pinCode ? (
                      <div className="flex items-center justify-center gap-2">
                        <span>{visiblePinCodes[event.id] ? event.pinCode : "••••••"}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => togglePinVisibility(event.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow mt-4">
            <div className="text-sm text-muted-foreground">
                {allEvents.length} evento(s) no total.
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Linhas/pág:</span>
                    <Select
                        value={eventsPerPage.toString()}
                        onValueChange={(value) => {
                            setEventsPerPage(Number(value));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[70px] h-8 text-xs form-input">
                            <SelectValue placeholder={eventsPerPage.toString()} />
                        </SelectTrigger>
                        <SelectContent>
                            {EVENTS_PER_PAGE_OPTIONS.map(size => (
                                <SelectItem key={size} value={size.toString()} className="text-xs">{size}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <span className="text-sm text-muted-foreground">
                    Página {totalPages > 0 ? currentPage : 0} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1 || totalPages === 0}
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || totalPages === 0}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages || totalPages === 0}
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
        </>
      )}
    </div>
  );
}

export default function CalendarPinCodesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <CalendarPinCodesPageContent />
    </Suspense>
  );
}

