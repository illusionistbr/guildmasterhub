
"use client";

import React, { useState, useEffect, useMemo, Suspense, Fragment } from 'react';
import { db, collection, getDocs, query, Timestamp, updateDoc, doc, deleteField } from '@/lib/firebase';
import type { Guild, AuditActionType } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Shield, MoreHorizontal, Search, Users, Gamepad2, Award, Zap, CalendarPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNowStrict, addDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { logGuildActivity } from '@/lib/auditLogService';

const GUILDS_PER_PAGE = 15;

function AdminGuildsContent() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [guildToUpdate, setGuildToUpdate] = useState<Guild | null>(null);
  const [planAction, setPlanAction] = useState<'add' | 'remove' | 'set_pro' | null>(null);
  const [planDays, setPlanDays] = useState<number>(0);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  useEffect(() => {
    const fetchGuilds = async () => {
      setLoading(true);
      try {
        const guildsRef = collection(db, 'guilds');
        const q = query(guildsRef);
        const querySnapshot = await getDocs(q);
        const guildsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guild));
        
        guildsData.sort((a, b) => {
            const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        setGuilds(guildsData);
      } catch (error) {
        console.error("Error fetching guilds:", error);
        toast({ title: "Erro ao buscar guildas", description: "Não foi possível carregar a lista de guildas. Verifique as permissões do Firestore.", variant: "destructive", duration: 7000 });
      } finally {
        setLoading(false);
      }
    };
    fetchGuilds();
  }, [toast]);

  const handleOpenPlanDialog = (guild: Guild, action: 'add' | 'remove' | 'set_pro', days: number = 0) => {
    setGuildToUpdate(guild);
    setPlanAction(action);
    setPlanDays(days);
  };
  
  const handleUpdatePlan = async () => {
    if (!guildToUpdate || !planAction || !user) return;

    setIsUpdatingPlan(true);

    const guildRef = doc(db, 'guilds', guildToUpdate.id);
    const updatePayload: { [key: string]: any } = {};
    const oldPlan = guildToUpdate.plan || 'free';
    let newPlan = 'pro';
    let newTrialEndDate: Date | null = null;
    let logDetails: any = { actorId: user.uid, actorDisplayName: user.displayName, details: {} };

    try {
        if (planAction === 'add') {
            const currentTrialEnd = (guildToUpdate.plan === 'pro' && guildToUpdate.trialEndsAt) ? guildToUpdate.trialEndsAt.toDate() : new Date();
            const startDate = isAfter(new Date(), currentTrialEnd) ? new Date() : currentTrialEnd;
            newTrialEndDate = addDays(startDate, planDays);
            updatePayload.plan = 'pro';
            updatePayload.trialEndsAt = Timestamp.fromDate(newTrialEndDate);
            logDetails.oldValue = oldPlan;
            logDetails.newValue = 'pro';
            logDetails.details = { daysAdded: planDays, newEndDate: newTrialEndDate.toISOString() };
        } else if (planAction === 'set_pro') {
            updatePayload.plan = 'pro';
            updatePayload.trialEndsAt = deleteField(); // Permanent pro plan
            logDetails.oldValue = oldPlan;
            logDetails.newValue = 'pro';
            logDetails.details = { type: 'permanent' };
        } else if (planAction === 'remove') {
            newPlan = 'free';
            updatePayload.plan = 'free';
            updatePayload.trialEndsAt = deleteField();
            logDetails.oldValue = oldPlan;
            logDetails.newValue = 'free';
        }

        await updateDoc(guildRef, updatePayload);
        
        await logGuildActivity(
            guildToUpdate.id,
            user.uid,
            user.displayName,
            AuditActionType.GUILD_PLAN_CHANGED,
            logDetails
        );

        setGuilds(prevGuilds => prevGuilds.map(g => {
            if (g.id === guildToUpdate.id) {
                const updatedGuild = { ...g, plan: newPlan as 'free' | 'pro' };
                if (newTrialEndDate) {
                    updatedGuild.trialEndsAt = Timestamp.fromDate(newTrialEndDate);
                } else if (planAction !== 'add') {
                    delete updatedGuild.trialEndsAt;
                }
                return updatedGuild;
            }
            return g;
        }));

        toast({ title: "Plano da Guilda Atualizado!", description: `O plano de "${guildToUpdate.name}" foi atualizado.` });

    } catch (error) {
        console.error("Error updating guild plan:", error);
        toast({ title: "Erro ao atualizar plano", variant: "destructive" });
    } finally {
        setIsUpdatingPlan(false);
        setGuildToUpdate(null);
        setPlanAction(null);
    }
  };

  const filteredGuilds = useMemo(() => {
    if (!searchTerm) return guilds;
    return guilds.filter(guild =>
      guild.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guild.ownerDisplayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [guilds, searchTerm]);

  const paginatedGuilds = useMemo(() => {
    const startIndex = (currentPage - 1) * GUILDS_PER_PAGE;
    return filteredGuilds.slice(startIndex, startIndex + GUILDS_PER_PAGE);
  }, [filteredGuilds, currentPage]);

  const totalPages = Math.ceil(filteredGuilds.length / GUILDS_PER_PAGE);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "G";
    return name.substring(0, 1).toUpperCase();
  };

  const getDialogDescription = () => {
    if (!guildToUpdate || !planAction) return "";
    switch (planAction) {
        case 'add': return `Tem certeza que deseja adicionar ${planDays} dias de plano Pro para a guilda "${guildToUpdate.name}"?`;
        case 'set_pro': return `Tem certeza que deseja definir o plano da guilda "${guildToUpdate.name}" como Pro permanente?`;
        case 'remove': return `Tem certeza que deseja remover o plano Pro e reverter a guilda "${guildToUpdate.name}" para o plano Gratuito?`;
        default: return "Tem certeza?";
    }
  }

  const renderSkeleton = () => {
    return [...Array(5)].map((_, i) => (
      <TableRow key={`skel-${i}`}>
        <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
      </TableRow>
    ));
  };

  return (
    <Fragment>
      <div className="space-y-8">
        <PageTitle title="Gerenciamento de Guildas" icon={<Shield />} />

        <div className="flex items-center justify-between">
          <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nome da guilda ou dono..."
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                className="max-w-sm pl-10"
              />
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guilda</TableHead>
                <TableHead>Dono</TableHead>
                <TableHead><Users className="inline-block h-4 w-4 mr-1"/>Membros</TableHead>
                <TableHead><Gamepad2 className="inline-block h-4 w-4 mr-1"/>Jogo</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? renderSkeleton() : paginatedGuilds.length > 0 ? (
                paginatedGuilds.map(guild => (
                  <TableRow key={guild.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={guild.logoUrl || undefined} alt={guild.name || ""} data-ai-hint="guild logo"/>
                          <AvatarFallback>{getInitials(guild.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{guild.name || 'Nome Desconhecido'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{guild.ownerDisplayName || 'Dono Desconhecido'}</TableCell>
                    <TableCell>{guild.memberCount || 0}</TableCell>
                    <TableCell>{guild.game || 'N/A'}</TableCell>
                    <TableCell>
                      {guild.createdAt && guild.createdAt instanceof Timestamp ? format(guild.createdAt.toDate(), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={guild.plan === 'pro' ? 'default' : 'secondary'}>
                          {guild.plan === 'pro' ? <Zap className="h-3 w-3 mr-1"/> : null}
                          {guild.plan === 'pro' ? 'Pro' : 'Free'}
                          {guild.plan === 'pro' && guild.trialEndsAt && (
                              <span className="ml-1.5 text-xs opacity-80"> (Expira {formatDistanceToNowStrict(guild.trialEndsAt.toDate(), { locale: ptBR, addSuffix: true })})</span>
                          )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>Ver Detalhes</DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Award className="mr-2 h-4 w-4"/> Gerenciar Plano Pro
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <DropdownMenuItem onClick={() => handleOpenPlanDialog(guild, 'add', 7)}><CalendarPlus className="mr-2 h-4 w-4"/>Conceder 7 Dias</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenPlanDialog(guild, 'add', 30)}><CalendarPlus className="mr-2 h-4 w-4"/>Conceder 30 Dias</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenPlanDialog(guild, 'set_pro')}><Zap className="mr-2 h-4 w-4"/>Tornar Pro Permanente</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleOpenPlanDialog(guild, 'remove')} className="text-destructive focus:text-destructive">Remover Pro</DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuItem disabled>Enviar Notificação</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled className="text-destructive focus:text-destructive">Suspender Guilda</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhuma guilda encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 py-4">
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
              >
                  Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
              </span>
              <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
              >
                  Próxima
              </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!guildToUpdate} onOpenChange={(open) => !open && setGuildToUpdate(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
                <AlertDialogDescription>{getDialogDescription()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setGuildToUpdate(null)} disabled={isUpdatingPlan}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleUpdatePlan} disabled={isUpdatingPlan} className={planAction === 'remove' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
                    {isUpdatingPlan ? <div className="flex items-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div> Processando...</div> : "Confirmar"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Fragment>
  );
}

export default function AdminGuildsPage() {
    return (
        <Suspense>
            <AdminGuildsContent />
        </Suspense>
    );
}
