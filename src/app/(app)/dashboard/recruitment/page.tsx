
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Link2 as LinkIcon, Copy, Loader2 } from 'lucide-react';
import { useHeader } from '@/contexts/HeaderContext';

function RecruitmentPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  const [recruitmentLink, setRecruitmentLink] = useState<string | null>(null);

  const guildId = searchParams.get('guildId');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
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
        setHeaderTitle(`Recrutamento: ${guildData.name}`);

        // Recruitment link is always available
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setRecruitmentLink(`${origin}/apply?guildId=${guildData.id}`);

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
    };
  }, [guildId, user, authLoading, router, toast, setHeaderTitle]);

  const copyLinkToClipboard = () => {
    if (recruitmentLink) {
      navigator.clipboard.writeText(recruitmentLink)
        .then(() => {
          toast({ title: "Link Copiado!", description: "O link de recrutamento foi copiado para sua área de transferência." });
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          toast({ title: "Erro ao Copiar", description: "Não foi possível copiar o link.", variant: "destructive" });
        });
    }
  };

  if (authLoading || loadingGuildData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  if (!guild) {
    return (
      <PageTitle title="Recrutamento" icon={<UserPlus className="h-8 w-8 text-primary" />}>
        <div className="text-center py-10">Guilda não encontrada ou não carregada.</div>
      </PageTitle>
    );
  }

  return (
    <div className="space-y-8">
      <PageTitle 
        title={`Recrutamento para ${guild.name}`}
        description="Gerencie o processo de recrutamento e compartilhe o link de candidatura da sua guilda."
        icon={<UserPlus className="h-8 w-8 text-primary" />}
      />

      <Card className="card-bg">
        <CardHeader>
          <CardTitle className="flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-primary" />Link de Recrutamento Único</CardTitle>
          <CardDescription>Compartilhe este link com potenciais recrutas para que eles possam se candidatar à sua guilda. Guildas públicas permitirão entrada imediata após o preenchimento do formulário.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              id="recruitmentLink"
              type="text"
              value={recruitmentLink || "Gerando link..."}
              readOnly
              className="form-input flex-1"
            />
            <Button 
              onClick={copyLinkToClipboard} 
              disabled={!recruitmentLink}
              variant="outline"
              className="btn-gradient btn-style-secondary"
            >
              <Copy className="mr-2 h-4 w-4" /> Copiar Link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Este link direciona os candidatos para um formulário de aplicação específico da sua guilda.
          </p>
        </CardContent>
      </Card>
     
      <Card className="card-bg">
        <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <Link href={`/dashboard/recruitment/applications?guildId=${guild.id}`} passHref>
                 <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                    Ver Candidaturas Recebidas
                </Button>
            </Link>
            {/* Futuramente: <Button variant="outline" className="w-full">Configurar Formulário de Aplicação</Button> */}
        </CardContent>
      </Card>
    </div>
  );
}

export default function RecruitmentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <RecruitmentPageContent />
    </Suspense>
  );
}
