
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { ComingSoon } from "@/components/shared/ComingSoon";
import { ThroneAndLibertyCalendarView } from '@/components/dashboard/calendar/ThroneAndLibertyCalendarView';
import { Loader2, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useHeader } from '@/contexts/HeaderContext';

function CalendarPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  const [isThroneAndLibertyGuild, setIsThroneAndLibertyGuild] = useState(false);

  const guildId = searchParams.get('guildId');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { // Corrected: currentUser to user
      router.push('/login');
      return;
    }
    if (!guildId) {
      toast({ title: "ID da Guilda Ausente", variant: "destructive" });
      router.push('/guild-selection');
      return;
    }

    const fetchGuildData = async () => {
      setLoadingGuildData(true);
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
        setHeaderTitle(`Calendário: ${guildData.name}`);
        if (guildData.game === "Throne and Liberty") {
          setIsThroneAndLibertyGuild(true);
        } else {
          setIsThroneAndLibertyGuild(false);
        }
      } catch (error) {
        console.error("Erro ao buscar dados da guilda:", error);
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      } finally {
        setLoadingGuildData(false);
      }
    };

    fetchGuildData();
    
    return () => {
      setHeaderTitle(null);
    }
  }, [guildId, user, authLoading, router, toast, setHeaderTitle]); // Corrected: currentUser to user in dependencies

  if (authLoading || loadingGuildData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!guild) {
    return (
      <PageTitle title="Calendário" icon={<CalendarDays className="h-8 w-8 text-primary" />}>
        <div className="text-center py-10">Guilda não encontrada ou não carregada.</div>
      </PageTitle>
    );
  }

  if (isThroneAndLibertyGuild && guildId) {
    return <ThroneAndLibertyCalendarView guildId={guildId} guildName={guild.name} />;
  }

  return <ComingSoon pageName={`Calendário de ${guild.name}`} icon={<CalendarDays className="h-8 w-8 text-primary"/>} />;
}


export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <CalendarPageContent />
    </Suspense>
  );
}
