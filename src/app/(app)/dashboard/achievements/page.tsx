
"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/shared/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Trophy, Crown, Skull, Castle, Gem, Map, Sparkles, Swords, Lock } from 'lucide-react';
import { cn } from "@/lib/utils";

// Lista de conquistas pré-definidas. O status 'earned' ou 'locked'
// viria do banco de dados da guilda em uma aplicação real.
const predefinedAchievements = [
  { id: '1', title: 'Rei da Colina', description: 'Defendeu o castelo por 3 semanas consecutivas.', icon: 'crown', status: 'earned' },
  { id: '2', title: 'Matador de Dragões', description: 'Derrotou o dragão ancestral Kael\'thuzad.', icon: 'skull', status: 'earned' },
  { id: '3', title: 'Mestre do Tesouro', description: 'Acumulou 1 milhão de ouro no banco da guilda.', icon: 'gem', status: 'earned' },
  { id: '4', title: 'Campeão do Torneio', description: 'Venceu o grande torneio de guildas do servidor.', icon: 'trophy', status: 'locked' },
  { id: '5', title: 'Fundador do Reino', description: 'Conquistou e manteve o controle do castelo principal.', icon: 'castle', status: 'locked' },
  { id: '6', title: 'Exploradores Intrépidos', description: 'Descobriu todas as zonas secretas do mapa.', icon: 'map', status: 'locked' },
  { id: '7', title: 'Lendários Unidos', description: 'Todos os membros ativos equiparam um item lendário.', icon: 'sparkles', status: 'locked' },
  { id: '8', title: 'Força Imparável', description: 'Venceu 10 batalhas de guilda consecutivas.', icon: 'swords', status: 'locked' },
];

const iconMap: { [key: string]: React.ElementType } = {
  crown: Crown,
  skull: Skull,
  trophy: Trophy,
  castle: Castle,
  gem: Gem,
  map: Map,
  sparkles: Sparkles,
  swords: Swords,
};

function AchievementsPageContent() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId');

  // Em uma aplicação real, você buscaria o status de cada conquista pré-definida
  // para a guilda atual (guildId) e atualizaria a lista.

  return (
    <div className="space-y-8">
      <PageTitle
        title="Galeria de Conquistas"
        description="Aqui estão todos os feitos épicos que sua guilda pode alcançar. A glória aguarda!"
        icon={<Trophy className="h-8 w-8 text-primary" />}
        // O botão de ação foi removido conforme solicitado.
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {predefinedAchievements.map((ach) => {
          const IconComponent = iconMap[ach.icon] || Trophy;
          const isLocked = ach.status === 'locked';

          return (
            <Card key={ach.id} className={cn(
              "card-bg flex flex-col text-center transition-all duration-300",
              isLocked && "grayscale opacity-70 hover:grayscale-0 hover:opacity-100"
            )}>
              <CardHeader className="pt-6">
                <div className={cn(
                  "mx-auto bg-primary/10 p-4 rounded-full border-2 border-primary/30",
                  isLocked && "bg-muted/10 border-muted/30"
                )}>
                  <IconComponent size={48} className={cn("text-primary", isLocked && "text-muted-foreground")} />
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-4">
                <CardTitle className={cn("text-xl text-foreground", isLocked && "text-muted-foreground")}>{ach.title}</CardTitle>
                <CardDescription className="mt-2 text-muted-foreground">{ach.description}</CardDescription>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-border/50 pt-3 pb-4">
                {isLocked ? (
                  <p className="text-xs text-amber-500 font-semibold flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    Bloqueada
                  </p>
                ) : (
                  <p className="text-xs text-green-500 font-semibold">Conquistada</p>
                )}
              </CardFooter>
            </Card>
          );
        })}
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
