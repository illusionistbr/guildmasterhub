
"use client";

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Trophy, Castle, Award } from 'lucide-react';
import { cn } from "@/lib/utils";
import { db, doc, getDoc, Timestamp } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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

  const achievement = {
    id: 'guild_founded',
    title: 'Guild fundada',
    description: 'Parabéns a nova guild que acabou de ser fundada',
    icon: Castle,
    points: 50,
  };

  return (
    <div className="space-y-8">
      <PageTitle
        title="Galeria de Conquistas"
        description="Aqui estão todos os feitos épicos que sua guilda pode alcançar. A glória aguarda!"
        icon={<Trophy className="h-8 w-8 text-primary" />}
      />
      
      <div className="flex justify-center">
        <div className="w-full max-w-sm">
           <Card key={achievement.id} className="card-bg flex flex-col text-center transition-all duration-300">
              <CardHeader className="pt-6">
                <div className="mx-auto bg-amber-500/10 p-4 rounded-full border-2 border-amber-500/30">
                  <achievement.icon size={48} className="text-amber-500" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-4 flex flex-col items-center justify-center">
                <CardTitle className="text-xl text-foreground">{achievement.title}</CardTitle>
                <CardDescription className="mt-2 text-muted-foreground">{achievement.description}</CardDescription>
                <div className="mt-4 flex items-center justify-center gap-2 font-semibold text-foreground">
                    <Award className="h-5 w-5 text-amber-500" />
                    <span>{achievement.points} Pontos</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-border/50 pt-3 pb-4">
                <p className="text-xs text-green-400 font-semibold">
                    Conquistado em: {guild?.createdAt instanceof Timestamp ? format(guild.createdAt.toDate(), 'dd/MM/yyyy', { locale: ptBR }) : 'Data Indisponível'}
                </p>
              </CardFooter>
            </Card>
        </div>
      </div>
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

