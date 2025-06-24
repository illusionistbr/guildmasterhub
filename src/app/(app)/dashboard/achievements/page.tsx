
"use client";

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Trophy, Castle, Award, User, Lock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { db, doc, getDoc, Timestamp } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  points: number;
  color: 'amber' | 'silver' | 'orange';
  requiredMembers: number;
}

const allAchievements: Achievement[] = [
    { id: 'guild_founded', title: 'Guild fundada', description: 'Parabéns a nova guild que acabou de ser fundada.', icon: Castle, points: 50, color: 'amber', requiredMembers: 1 },
    { id: 'one_member', title: 'Guild com 1 membro', description: 'Toda grande jornada começa com um único passo. E o primeiro membro!', icon: User, points: 10, color: 'orange', requiredMembers: 1 },
    { id: '10_members', title: 'Guild com 10 membros', description: 'Dez heróis unidos sob o mesmo estandarte.', icon: User, points: 100, color: 'orange', requiredMembers: 10 },
    { id: '25_members', title: 'Guild com 25 membros', description: 'Um pelotão formado e pronto para a batalha.', icon: User, points: 250, color: 'orange', requiredMembers: 25 },
    { id: '50_members', title: 'Guild com 50 membros', description: 'Meio exército! A guilda se torna uma força a ser reconhecida.', icon: User, points: 500, color: 'orange', requiredMembers: 50 },
    { id: '100_members', title: 'Guild com 100 membros', description: 'Uma legião inteira! Seu nome ecoa pelos reinos.', icon: User, points: 1000, color: 'silver', requiredMembers: 100 },
    { id: '150_members', title: 'Guild com 150 membros', description: 'A guilda cresce e se torna uma potência continental.', icon: User, points: 1500, color: 'silver', requiredMembers: 150 },
    { id: '200_members', title: 'Guild com 200 membros', description: 'Uma força imparável, temida e respeitada por todos.', icon: User, points: 2000, color: 'amber', requiredMembers: 200 },
    { id: '300_members', title: 'Guild com 300 membros', description: 'Um império de heróis! Sua lenda será contada por eras.', icon: User, points: 3000, color: 'amber', requiredMembers: 300 },
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
  const unlockedAchievements = allAchievements.filter(ach => currentMemberCount >= ach.requiredMembers);
  const lockedAchievements = allAchievements.filter(ach => currentMemberCount < ach.requiredMembers);

  const renderAchievementCard = (achievement: Achievement, locked: boolean) => {
    const colors = colorVariants[achievement.color] || colorVariants.amber;
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
                <Lock className="h-3 w-3"/> Requer {achievement.requiredMembers} membros
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
