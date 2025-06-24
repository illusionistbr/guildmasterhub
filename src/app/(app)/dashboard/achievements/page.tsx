
"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, PlusCircle, Trophy, Crown, Skull, Castle } from 'lucide-react';

const mockAchievements = [
  { id: '1', title: 'Rei da Colina', description: 'Defendeu o castelo por 3 semanas consecutivas.', icon: 'crown', dateAchieved: '2024-07-15' },
  { id: '2', title: 'Matador de Dragões', description: 'Derrotou o dragão ancestral Kael\'thuzad.', icon: 'skull', dateAchieved: '2024-07-01' },
  { id: '3', title: 'Campeão do Torneio', description: 'Venceu o grande torneio de guildas do servidor.', icon: 'trophy', dateAchieved: '2024-06-20' },
  { id: '4', title: 'Fundador do Reino', description: 'Conquistou e manteve o controle do castelo principal.', icon: 'castle', dateAchieved: '2024-05-10' },
];

const iconMap: { [key: string]: React.ElementType } = {
  crown: Crown,
  skull: Skull,
  trophy: Trophy,
  castle: Castle,
};


function AchievementsPageContent() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get('guildId');

  // In a real app, you would fetch achievements for the current guildId
  // const [achievements, setAchievements] = useState([]);
  // useEffect(() => { ... fetch logic ... }, [guildId]);

  return (
    <div className="space-y-8">
      <PageTitle
        title="Conquistas da Guilda"
        description="Celebre os grandes feitos e a glória da sua guilda."
        icon={<Trophy className="h-8 w-8 text-primary" />}
        action={
          <Button className="btn-gradient btn-style-secondary">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Conquista
          </Button>
        }
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockAchievements.map((ach) => {
          const IconComponent = iconMap[ach.icon] || Trophy; // Default to Trophy icon
          return (
            <Card key={ach.id} className="card-bg flex flex-col text-center">
              <CardHeader className="pt-6">
                <div className="mx-auto bg-primary/10 p-4 rounded-full border-2 border-primary/30">
                  <IconComponent size={48} className="text-primary" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow pt-4">
                <CardTitle className="text-xl text-foreground">{ach.title}</CardTitle>
                <CardDescription className="mt-2 text-muted-foreground">{ach.description}</CardDescription>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-border/50 pt-3 pb-4">
                <p className="text-xs text-muted-foreground">Conquistado em: {ach.dateAchieved}</p>
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
