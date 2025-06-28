
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Gem, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function BillingPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingGuild, setLoadingGuild] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const guildId = searchParams.get('guildId');

  useEffect(() => {
    if (!guildId || !user) return;
    
    setLoadingGuild(true);
    const guildDocRef = doc(db, 'guilds', guildId);
    getDoc(guildDocRef).then(docSnap => {
      if (docSnap.exists()) {
        setGuild({ id: docSnap.id, ...docSnap.data() } as Guild);
      } else {
        toast({ title: "Guilda não encontrada", variant: "destructive" });
        router.push('/guild-selection');
      }
    }).catch(error => {
      console.error("Error fetching guild:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    }).finally(() => {
      setLoadingGuild(false);
    });

  }, [guildId, user, toast, router]);
  
  const handleManageSubscription = async () => {
    if (!guild || !guild.stripeCustomerId) {
      toast({ title: "Erro", description: "Informações de assinatura não encontradas.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: guild.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      window.location.href = url;
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgradeToPro = async () => {
    if (!guild || !user) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: guild.id, userId: user.uid }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { sessionId } = await res.json();
      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe.js failed to load.");
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw new Error(error.message);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || loadingGuild) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (!guild) {
    return <div className="text-center py-10">Não foi possível carregar as informações da guilda.</div>;
  }

  const isPro = guild.plan === 'pro';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageTitle title="Plano e Cobrança" description={`Gerencie a assinatura para ${guild.name}`} icon={<Zap />} />
      <div className="grid md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <Card className={cn(
            "flex flex-col",
            !isPro ? 'border-primary ring-2 ring-primary' : 'border-border opacity-70'
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Gem className="h-6 w-6 text-muted-foreground"/>
                Plano Gratuito
            </CardTitle>
            <CardDescription>Para guildas que estão começando.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <p className="text-4xl font-bold">R$0 <span className="text-sm font-normal text-muted-foreground">/mês</span></p>
            <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Dashboard da Guilda</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Gerenciamento de Membros</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Sistema de Recrutamento</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Configurações da Guilda</li>
            </ul>
          </CardContent>
          <CardFooter>
            {isPro ? (
              <Button variant="outline" className="w-full" disabled>Rebaixar</Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>Seu Plano Atual</Button>
            )}
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className={cn(
            "flex flex-col bg-gradient-to-br from-primary/10 to-card",
            isPro ? 'border-primary ring-2 ring-primary' : 'border-border'
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-400"/>
                Plano Pro
            </CardTitle>
            <CardDescription>Para guildas que buscam a dominação.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <p className="text-4xl font-bold">R$19,90 <span className="text-sm font-normal text-muted-foreground">/mês</span></p>
            <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 font-semibold"><CheckCircle className="h-4 w-4 text-green-500"/>Tudo do plano Gratuito, mais:</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Calendário de Eventos Avançado</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Sistema de Loot e Leilões (DKP)</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Galeria de Conquistas</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Log de Auditoria Detalhado</li>
            </ul>
          </CardContent>
          <CardFooter>
            {isPro ? (
               <Button onClick={handleManageSubscription} className="w-full btn-gradient btn-style-secondary" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin" /> : <><ExternalLink className="mr-2 h-4 w-4"/> Gerenciar Assinatura</>}
              </Button>
            ) : (
              <Button onClick={handleUpgradeToPro} className="w-full btn-gradient btn-style-primary" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin" /> : <><Zap className="mr-2 h-4 w-4"/> Upgrade para Pro</>}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function BillingPage() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
            <BillingPageContent />
        </React.Suspense>
    );
}
