
"use client";

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Trophy, Castle, Award, User, Lock, Gavel } from 'lucide-react';
import { cn } from "@/lib/utils";
import { db, doc, getDoc, Timestamp } from '@/lib/firebase';
import type { Guild, Achievement } from '@/types/guildmaster';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const allAchievements: Achievement[] = [
    // Member achievements
    { id: 'guild_founded', title: 'Guild fundada', description: 'Parabéns a nova guild que acabou de ser fundada.', icon: Castle, points: 50, color: 'amber', requiredCount: 1, type: 'members' },
    { id: 'one_member', title: 'Guild com 1 membro', description: 'Toda grande jornada começa com um único passo. E o primeiro membro!', icon: User, points: 10, color: 'orange', requiredCount: 1, type: 'members' },
    { id: '10_members', title: 'Guild com 10 membros', description: 'Dez heróis unidos sob o mesmo estandarte.', icon: User, points: 100, color: 'orange', requiredCount: 10, type: 'members' },
    { id: '25_members', title: 'Guild com 25 membros', description: 'Um pelotão formado e pronto para a batalha.', icon: User, points: 250, color: 'orange', requiredCount: 25, type: 'members' },
    { id: '50_members', title: 'Guild com 50 membros', description: 'Meio exército! A guilda se torna uma força a ser reconhecida.', icon: User, points: 500, color: 'orange', requiredCount: 50, type: 'members' },
    { id: '100_members', title: 'Guild com 100 membros', description: 'Uma legião inteira! Seu nome ecoa pelos reinos.', icon: User, points: 1000, color: 'silver', requiredCount: 100, type: 'members' },
    { id: '150_members', title: 'Guild com 150 membros', description: 'A guilda cresce e se torna uma potência continental.', icon: User, points: 1500, color: 'silver', requiredCount: 150, type: 'members' },
    { id: '200_members', title: 'Guild com 200 membros', description: 'Uma força imparável, temida e respeitada por todos.', icon: User, points: 2000, color: 'amber', requiredCount: 200, type: 'members' },
    { id: '300_members', title: 'Guild com 300 membros', description: 'Um império de heróis! Sua lenda será contada por eras.', icon: User, points: 3000, color: 'amber', requiredCount: 300, type: 'members' },

    // Auction achievements
    { id: '1_auction', title: 'Primeiro Leilão', description: 'A guilda realizou seu primeiro leilão de item.', icon: Gavel, points: 5, color: 'orange', requiredCount: 1, type: 'auctions'},
    { id: '10_auctions', title: '10 Leilões Realizados', description: 'Uma dezena de itens já encontrou um novo dono.', icon: Gavel, points: 50, color: 'orange', requiredCount: 10, type: 'auctions'},
    { id: '20_auctions', title: '20 Leilões Realizados', description: 'A guilda se torna um centro de comércio conhecido.', icon: Gavel, points: 200, color: 'orange', requiredCount: 20, type: 'auctions'},
    { id: '50_auctions', title: '50 Leilões Realizados', description: 'Meia centena de tesouros distribuídos com sucesso.', icon: Gavel, points: 250, color: 'silver', requiredCount: 50, type: 'auctions'},
    { id: '100_auctions', title: '100 Leilões Realizados', description: 'A marca de 100 leilões! Uma economia próspera.', icon: Gavel, points: 500, color: 'silver', requiredCount: 100, type: 'auctions'},
    { id: '200_auctions', title: '200 Leilões Realizados', description: 'Centenas de itens fortalecendo os membros da guilda.', icon: Gavel, points: 1000, color: 'silver', requiredCount: 200, type: 'auctions'},
    { id: '500_auctions', title: '500 Leilões Realizados', description: 'Um mercado lendário! A guilda é um poder econômico.', icon: Gavel, points: 2500, color: 'amber', requiredCount: 500, type: 'auctions'},
];

function AchievementsPageContent() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId');
  const { toast } = useToast();
  
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGuildData = useCallback(async () => {
    if (!guildId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const guildDoc = await getDoc(doc(db, 'guilds', guildId));
      if (guildDoc.exists()) {
        setGuild({ id: guildDoc.id, ...guildDoc.data() } as Guild);
      } else {
        toast({ title: "Erro", description: "Guilda não encontrada.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Erro ao buscar guilda:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados da guilda.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [guildId, toast]);

  useEffect(() => {
    fetchGuildData();
  }, [fetchGuildData]);
  
  if (loading) {
     return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  const colorVariants: Record<string, { icon: string; bg: string; border: string; award: string; }> = {
    amber: { // Gold
      icon: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      award: 'text-amber-500',
    },
    silver: { // Silver
      icon: 'text-gray-400',
      bg: 'bg-gray-400/10',
      border: 'border-gray-400/30',
      award: 'text-gray-400',
    },
    orange: { // Bronze
      icon: 'text-orange-600',
      bg: 'bg-orange-600/10',
      border: 'border-orange-600/30',
      award: 'text-orange-600',
    }
  };
  
  const currentMemberCount = guild?.memberCount || 0;
  const currentAuctionCount = guild?.auctionCount || 0;

  const unlockedAchievements = allAchievements.filter(ach => {
    if (ach.type === 'members') return currentMemberCount >= ach.requiredCount;
    if (ach.type === 'auctions') return currentAuctionCount >= ach.requiredCount;
    return false;
  });
  const lockedAchievements = allAchievements.filter(ach => {
    if (ach.type === 'members') return currentMemberCount < ach.requiredCount;
    if (ach.type === 'auctions') return currentAuctionCount < ach.requiredCount;
    return true;
  });

  const renderAchievementCard = (achievement: Achievement, locked: boolean) => {
    const colors = colorVariants[achievement.color] || colorVariants.amber;
    const requirementText = achievement.type === 'members' ? 'membros' : 'leilões';

    return (
      <div className="w-full max-w-sm" key={achievement.id}>
        <Card className={cn("card-bg flex flex-col text-center transition-all duration-300 h-full", locked && "opacity-60")}>
          <CardHeader className="pt-6">
            <div className={cn("mx-auto p-4 rounded-full border-2", colors.bg, colors.border)}>
              <achievement.icon size={48} className={cn(colors.icon)} />
            </div>
          </CardHeader>
          <CardContent className="flex-grow pt-4 flex flex-col items-center justify-center">
            <CardTitle className="text-xl text-foreground">{achievement.title}</CardTitle>
            <CardDescription className="mt-2 text-muted-foreground">{achievement.description}</CardDescription>
            <div className="mt-4 flex items-center justify-center gap-2 font-semibold text-foreground">
                <Award className={cn("h-5 w-5", colors.award)} />
                <span>{achievement.points} Pontos</span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-3 pb-4">
            {locked ? (
              <p className="text-xs text-yellow-400 font-semibold flex items-center gap-1">
                <Lock className="h-3 w-3"/> Requer {achievement.requiredCount} {requirementText}
              </p>
            ) : (
              <p className="text-xs text-green-400 font-semibold">
                  Conquistado em: {guild?.createdAt instanceof Timestamp ? format(guild.createdAt.toDate(), 'dd/MM/yyyy', { locale: ptBR }) : 'Data Indisponível'}
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <PageTitle
        title="Galeria de Conquistas"
        description="Aqui estão todos os feitos épicos que sua guilda pode alcançar. A glória aguarda!"
        icon={<Trophy className="h-8 w-8 text-primary" />}
      />
      
      <Tabs defaultValue="unlocked" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unlocked">Desbloqueadas ({unlockedAchievements.length})</TabsTrigger>
            <TabsTrigger value="locked">Bloqueadas ({lockedAchievements.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="unlocked" className="mt-6">
            <div className="flex justify-center flex-wrap gap-6">
                {unlockedAchievements.map(ach => renderAchievementCard(ach, false))}
            </div>
             {unlockedAchievements.length === 0 && <p className="text-center text-muted-foreground mt-10">Nenhuma conquista desbloqueada ainda.</p>}
        </TabsContent>
        <TabsContent value="locked" className="mt-6">
             <div className="flex justify-center flex-wrap gap-6">
                {lockedAchievements.map(ach => renderAchievementCard(ach, true))}
            </div>
            {lockedAchievements.length === 0 && <p className="text-center text-muted-foreground mt-10">Parabéns! Todas as conquistas foram desbloqueadas!</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AchievementsPage() {
    return (
      <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
        <AchievementsPageContent />
      </Suspense>
    );
}
