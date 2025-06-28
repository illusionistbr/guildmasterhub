

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter as useNavigationRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users, Loader2, UserPlus, CheckCircle, ShieldAlert, ArrowLeft, ServerIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query, getDocs as getFirestoreDocs, doc, writeBatch, arrayUnion, increment as firebaseIncrement, orderBy } from '@/lib/firebase';
import type { Guild, AuditActionType, GuildMemberRoleInfo } from '@/types/guildmaster';
import { useToast } from '@/hooks/use-toast';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { logGuildActivity } from '@/lib/auditLogService';

const GUILDS_PER_PAGE = 15;

function ExploreGuildsContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useNavigationRouter();

  const [allGuilds, setAllGuilds] = useState<Guild[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [guildToConfirm, setGuildToConfirm] = useState<Guild | null>(null);
  const [isJoining, setIsJoining] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuilds = async () => {
      setLoadingGuilds(true);
      try {
        const guildsQuery = query(collection(db, "guilds"), orderBy("name"));
        const querySnapshot = await getFirestoreDocs(guildsQuery);
        const guildsData = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Guild));
        setAllGuilds(guildsData);
      } catch (error) {
        console.error("Error fetching guilds:", error);
        toast({ title: "Erro ao Buscar Guildas", description: "Não foi possível carregar a lista de guildas.", variant: "destructive" });
      } finally {
        setLoadingGuilds(false);
      }
    };
    fetchGuilds();
  }, [toast]);

  const filteredGuilds = useMemo(() => {
    return allGuilds.filter(guild =>
      guild.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allGuilds, searchTerm]);

  const paginatedGuilds = useMemo(() => {
    const startIndex = (currentPage - 1) * GUILDS_PER_PAGE;
    return filteredGuilds.slice(startIndex, startIndex + GUILDS_PER_PAGE);
  }, [filteredGuilds, currentPage]);

  const totalPages = Math.ceil(filteredGuilds.length / GUILDS_PER_PAGE);

  const processGuildJoin = async (guildToJoin: Guild) => {
    if (!user) return;
    setIsJoining(guildToJoin.id);

    try {
      const guildRef = doc(db, "guilds", guildToJoin.id);
      const batch = writeBatch(db);

      const memberRoleInfo: GuildMemberRoleInfo = {
        roleName: "Membro",
        notes: "Entrou diretamente (guilda pública, não-TL).",
        dkpBalance: 0,
        status: 'Ativo',
      };

      batch.update(guildRef, {
        memberIds: arrayUnion(user.uid),
        memberCount: firebaseIncrement(1),
        [`roles.${user.uid}`]: memberRoleInfo
      });

      await batch.commit();

      await logGuildActivity(
        guildToJoin.id,
        user.uid,
        user.displayName,
        AuditActionType.MEMBER_JOINED,
        {
          targetUserId: user.uid,
          targetUserDisplayName: user.displayName || user.email || user.uid,
          details: { joinMethod: 'direct_public_non_tl' } as any,
        }
      );

      toast({
        title: "Bem-vindo(a) à Guilda!",
        description: `Você entrou na guilda ${guildToJoin.name}.`,
        action: <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard?guildId=${guildToJoin.id}`)}>Ver Dashboard</Button>
      });

      setAllGuilds(prevGuilds =>
        prevGuilds.map(g =>
          g.id === guildToJoin.id
            ? {
                ...g,
                memberIds: [...(g.memberIds || []), user.uid],
                memberCount: (g.memberCount || 0) + 1,
                roles: { ...(g.roles || {}), [user.uid]: memberRoleInfo }
              }
            : g
        )
      );

    } catch (error) {
      console.error("Error joining guild:", error);
      toast({ title: "Erro ao Entrar na Guilda", description: "Não foi possível processar sua entrada.", variant: "destructive" });
    } finally {
      setIsJoining(null);
    }
  };

  const handleApplyToGuild = (guild: Guild) => {
    if (!user) {
      toast({ title: "Não Autenticado", description: "Você precisa estar logado para interagir com guildas.", variant: "destructive" });
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (guild.memberIds?.includes(user.uid)) {
        toast({ title: "Já é Membro", description: `Você já faz parte da guilda ${guild.name}.`, variant: "default" });
        return;
    }

    if (guild.game === "Throne and Liberty") {
      setGuildToConfirm(guild);
    } else if (guild.isOpen === false) { 
      router.push(`/apply?guildId=${guild.id}`);
    } else {
      processGuildJoin(guild);
    }
  };


  const renderGuildCard = (guild: Guild) => {
    const isUserMember = guild.memberIds?.includes(user?.uid || "");
    const isLoadingThisGuild = isJoining === guild.id;
    const buttonText = isUserMember ? "Membro" : "Aplicar";
    const ButtonIcon = isUserMember ? CheckCircle : UserPlus;

    return (
      <Card key={guild.id} className="static-card-container overflow-hidden">
        <CardContent className="p-3 sm:p-4 grid grid-cols-[auto_1fr_1fr_auto] items-center gap-x-3 sm:gap-x-4 relative z-10">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary">
            <AvatarImage src={guild.logoUrl || `https://placehold.co/64x64.png?text=${guild.name.substring(0,1)}`} alt={`${guild.name} logo`} data-ai-hint="guild logo"/>
            <AvatarFallback>{guild.name.substring(0,1).toUpperCase()}</AvatarFallback>
          </Avatar>

          <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">
            {guild.name}
          </h3>

          <p className="text-xs sm:text-sm text-muted-foreground truncate text-center px-1 sm:px-2">
            Líder: {guild.ownerDisplayName || 'Desconhecido'}
          </p>

          <Button
            onClick={() => !isUserMember && handleApplyToGuild(guild)}
            disabled={isLoadingThisGuild || isUserMember}
            className={`btn-gradient ${isUserMember ? 'bg-green-600 hover:bg-green-700' : 'btn-style-secondary'} whitespace-nowrap justify-self-end`}
            size="sm"
          >
            {isLoadingThisGuild ? <Loader2 className="h-4 w-4 animate-spin" /> : <ButtonIcon className="h-4 w-4 sm:mr-1" />}
            <span className="hidden sm:inline">
              {isLoadingThisGuild ? "Processando..." : buttonText}
            </span>
            {!isLoadingThisGuild && <span className="sm:hidden"><ButtonIcon className="h-4 w-4" /></span>}
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (loadingGuilds) {
    return (
      <div className="space-y-4">
        <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input placeholder="Buscar pelo nome da guilda..." className="form-input pl-10 text-base" disabled value="" onChange={() => {}}/>
        </div>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
                type="text"
                placeholder="Buscar pelo nome da guilda..."
                value={searchTerm || ""}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="form-input pl-10 text-base"
            />
        </div>
      {paginatedGuilds.length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {paginatedGuilds.map(renderGuildCard)}
        </div>
      ) : (
        <div className="text-center py-10">
          <ShieldAlert className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-xl font-semibold text-foreground">Nenhuma Guilda Encontrada</p>
          <p className="text-muted-foreground mt-2">
            Não há guildas correspondentes à sua busca ou nenhuma guilda foi criada ainda.
            {searchTerm && " Tente refinar sua busca."}
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline">
            Anterior
          </Button>
          <span className="text-muted-foreground">Página {currentPage} de {totalPages}</span>
          <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline">
            Próxima
          </Button>
        </div>
      )}

      {guildToConfirm && (
         <AlertDialog open={!!guildToConfirm} onOpenChange={() => setGuildToConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <ServerIcon className="h-5 w-5 text-primary"/>
                      Confirmação de Servidor
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                       Para se candidatar à guilda "{guildToConfirm.name}", você precisa estar no mesmo servidor. Você joga no servidor <strong>{guildToConfirm.server}</strong>?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => { setGuildToConfirm(null); toast({ title: "Aplicação Cancelada", description: "Para se candidatar, você precisa estar no mesmo servidor da guilda."})}}>Não</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                        router.push(`/apply?guildId=${guildToConfirm.id}`);
                        setGuildToConfirm(null);
                    }}>
                        Sim, eu jogo neste servidor
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}

export default function GuildsPage() {
  const router = useNavigationRouter();
  return (
    <div className="space-y-8">
      <PageTitle
        title="Explorar Guildas"
        description="Encontre e junte-se a novas guildas para suas aventuras."
        icon={<Users className="h-8 w-8 text-primary" />}
        action={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        }
      />
      <Card className="static-card-container">
        <CardHeader className="relative z-10">
          <CardTitle>Lista de Guildas Disponíveis</CardTitle>
          <CardDescription>Navegue pelas guildas, use a busca para filtrar e encontre sua próxima comunidade.</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <ExploreGuildsContent />
        </CardContent>
      </Card>
    </div>
  );
}
