
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTitle } from '@/components/shared/PageTitle';
import { ShieldPlus, Users, Home, Eye, Settings as SettingsIcon } from 'lucide-react'; 
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, query, where, getDocs } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function GuildSelectionPage() {
  const { user, loading: authLoading } = useAuth();
  const [ownedGuilds, setOwnedGuilds] = useState<Guild[]>([]);
  const [memberGuilds, setMemberGuilds] = useState<Guild[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(true);

  useEffect(() => {
    if (user && !authLoading) {
      const fetchGuilds = async () => {
        setLoadingGuilds(true);
        try {
          // Fetch owned guilds
          const ownedQuery = query(collection(db, "guilds"), where("ownerId", "==", user.uid));
          const ownedSnapshot = await getDocs(ownedQuery);
          const fetchedOwnedGuilds = ownedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guild));
          setOwnedGuilds(fetchedOwnedGuilds);

          // Fetch member guilds (excluding those already owned)
          const memberQuery = query(collection(db, "guilds"), where("memberIds", "array-contains", user.uid));
          const memberSnapshot = await getDocs(memberQuery);
          const fetchedMemberGuilds = memberSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Guild))
            .filter(guild => guild.ownerId !== user.uid); // Exclude guilds where user is owner
          setMemberGuilds(fetchedMemberGuilds);

        } catch (error) {
          console.error("Error fetching guilds:", error);
          // Potentially set an error state here and show a toast
        } finally {
          setLoadingGuilds(false);
        }
      };
      fetchGuilds();
    } else if (!authLoading && !user) { 
        setLoadingGuilds(false); 
    }
  }, [user, authLoading]);

  const isLoading = authLoading || loadingGuilds;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageTitle title="Bem-vindo ao GuildMasterHub!" description="Escolha sua guilda ou crie uma nova para começar." icon={<Home className="h-8 w-8 text-primary" />} />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-40 w-full" /> 
          <Skeleton className="h-40 w-full" />
        </div>
        <div>
          <h2 className="text-2xl font-headline text-primary mt-8 mb-4">Suas Guildas</h2>
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
      return (
        <div className="text-center py-10">
            <p className="text-lg text-muted-foreground">Você precisa estar logado para ver esta página.</p>
            <Button asChild className="mt-4">
                <Link href="/login">Fazer Login</Link>
            </Button>
        </div>
      )
  }
  
  const allUserGuilds = [...ownedGuilds, ...memberGuilds].sort((a,b) => (a.name || "").localeCompare(b.name || ""));


  return (
    <div className="space-y-10">
      <PageTitle 
        title={`Olá, ${user.displayName || 'Aventureiro'}!`} 
        description="Pronto para sua próxima jornada? Escolha uma guilda existente ou crie uma nova."
        icon={<Home className="h-8 w-8 text-primary" />}
      />

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="card-bg hover:shadow-primary/50 transition-shadow duration-300">
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center text-2xl"><ShieldPlus className="mr-3 h-8 w-8 text-primary" /> Criar Nova Guilda</CardTitle>
            <CardDescription>Forje sua própria lenda! Comece uma nova guilda e recrute seus campeões.</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <Link
              href="/create-guild"
              className="block w-full text-center btn-gradient btn-style-primary text-lg py-3 rounded-md"
            >
              Criar Guilda
            </Link>
          </CardContent>
        </Card>

        <Card className="card-bg hover:shadow-accent/50 transition-shadow duration-300">
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center text-2xl"><Users className="mr-3 h-8 w-8 text-accent" /> Juntar-se a uma Guilda</CardTitle>
            <CardDescription>Encontre guildas existentes, explore comunidades e solicite para entrar.</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
             <Link
                href="/guilds"
                className="block w-full text-center btn-gradient btn-style-primary text-lg py-3 rounded-md"
              >
                Explorar Guildas
              </Link>
          </CardContent>
        </Card>
      </div>

      {allUserGuilds.length > 0 && (
        <div>
          <h2 className="text-3xl font-headline text-primary mt-12 mb-6 text-center md:text-left">Ou continue de onde parou:</h2>
          <div className="space-y-4">
            {allUserGuilds.map(guild => {
              const isOwner = guild.ownerId === user.uid;
              const buttonText = isOwner ? "GERENCIAR" : "ACESSAR";
              const IconForButton = isOwner ? SettingsIcon : Eye;

              return (
                <Card key={guild.id} className="card-bg overflow-hidden">
                  <Link href={`/dashboard?guildId=${guild.id}`} className="block hover:bg-card/50 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between gap-4 relative z-10">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-primary">
                          <AvatarImage src={guild.logoUrl || `https://placehold.co/64x64.png?text=${guild.name.substring(0,1)}`} alt={`${guild.name} logo`} data-ai-hint="guild logo"/>
                          <AvatarFallback>{guild.name.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{guild.name}</h3>
                          <p className="text-sm text-muted-foreground">{isOwner ? "Você é o Dono(a)" : "Você é Membro"}</p>
                        </div>
                      </div>
                      <Button variant={isOwner ? "default" : "outline"} size="sm" className={isOwner ? "btn-gradient btn-style-secondary" : "border-primary text-primary hover:bg-primary/10 hover:text-primary-foreground"}>
                        {buttonText} <IconForButton className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
