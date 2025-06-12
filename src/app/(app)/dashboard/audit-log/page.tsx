
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, collection, query, orderBy, getDocs as getFirestoreDocs, Timestamp } from '@/lib/firebase';
import { type Guild, GuildRole, type AuditLogEntry, AuditActionType } from '@/types/guildmaster';
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
import { ClipboardList, Loader2, ShieldAlert, VenetianMask, UserCog, UserX, BadgeCent } from 'lucide-react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function AuditLogPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const guildId = searchParams.get('guildId');

  const currentUserRoleInGuild = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid] || null;
  }, [currentUser, guild]);

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

        // Permission Check
        const userRole = guildData.roles?.[currentUser.uid];
        if (userRole !== GuildRole.Leader && userRole !== GuildRole.ViceLeader) {
          setAccessDenied(true);
          setLoadingData(false);
          return;
        }

        // Fetch Audit Logs
        const logsQuery = query(collection(db, `guilds/${guildId}/auditLogs`), orderBy("timestamp", "desc"));
        const logsSnapshot = await getFirestoreDocs(logsQuery);
        const fetchedLogs = logsSnapshot.docs.map(logDoc => ({ id: logDoc.id, ...logDoc.data() } as AuditLogEntry));
        setAuditLogs(fetchedLogs);

      } catch (error) {
        console.error("Erro ao buscar dados de auditoria:", error);
        toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar os logs de auditoria.", variant: "destructive" });
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [guildId, currentUser, authLoading, router, toast]);

  const formatLogTimestamp = (timestamp: Timestamp | Date): string => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    try {
      const relativeTime = formatDistanceToNowStrict(date, { addSuffix: true, locale: ptBR });
      const absoluteTime = format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
      return `${relativeTime} (${absoluteTime})`;
    } catch (e) {
      return "Data inválida";
    }
  };
  
  const getActionIcon = (action: AuditActionType) => {
    switch (action) {
      case AuditActionType.MEMBER_ROLE_CHANGED: return <UserCog className="h-5 w-5 text-blue-500" />;
      case AuditActionType.MEMBER_KICKED: return <UserX className="h-5 w-5 text-red-500" />;
      default: return <ClipboardList className="h-5 w-5 text-muted-foreground" />;
    }
  }

  const generateLogDescription = (log: AuditLogEntry): string => {
    const actor = log.actorDisplayName || log.actorId;
    const target = log.details?.targetUserDisplayName || log.details?.targetUserId;

    switch (log.action) {
      case AuditActionType.MEMBER_ROLE_CHANGED:
        return `${actor} alterou o cargo de ${target} de "${log.details?.oldValue}" para "${log.details?.newValue}".`;
      case AuditActionType.MEMBER_KICKED:
        return `${actor} removeu ${target} (cargo: "${log.details?.kickedUserRole || 'N/A'}") da guilda.`;
      // Add more cases as new log types are implemented
      default:
        return `Ação desconhecida: ${log.action}`;
    }
  };


  if (loadingData || authLoading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <PageTitle title="Auditoria da Guilda" icon={<ClipboardList className="h-8 w-8 text-primary" />} />
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
          Você não tem permissão para visualizar os logs de auditoria desta guilda.
          Apenas Líderes e Vice-Líderes podem acessar esta página.
        </p>
        <Button onClick={() => router.back()} variant="outline">Voltar</Button>
      </div>
    );
  }
  
  if (!guild) {
    return <div className="p-6 text-center">Guilda não carregada ou não encontrada.</div>;
  }


  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageTitle 
        title={`Logs de Auditoria de ${guild.name}`} 
        description="Visualize as atividades importantes da guilda. Apenas Líderes e Vice-Líderes têm acesso."
        icon={<ClipboardList className="h-8 w-8 text-primary" />}
      />
      
      {auditLogs.length === 0 && !loadingData && (
        <div className="text-center py-10 bg-card rounded-lg shadow">
            <VenetianMask className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold text-foreground">Nenhuma Atividade Registrada</p>
            <p className="text-muted-foreground mt-2">
                Ainda não há logs de auditoria para esta guilda.
            </p>
        </div>
      )}

      {auditLogs.length > 0 && (
        <div className="overflow-x-auto bg-card p-4 sm:p-6 rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] hidden sm:table-cell"></TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Descrição da Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="hidden sm:table-cell">{getActionIcon(log.action)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {log.timestamp ? formatLogTimestamp(log.timestamp) : 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">{log.actorDisplayName || log.actorId}</TableCell>
                  <TableCell>{generateLogDescription(log)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <AuditLogPageContent />
    </Suspense>
  );
}
