
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Gem, CheckCircle, ExternalLink, AlertTriangle, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadStripe } from '@stripe/stripe-js';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const isStripeConfigured = stripePublishableKey && !stripePublishableKey.includes("YOUR_");

const stripePromise = isStripeConfigured
  ? loadStripe(stripePublishableKey)
  : Promise.resolve(null);

function BillingPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingGuild, setLoadingGuild] = useState(true);
  const [processingPriceId, setProcessingPriceId] = useState<string | null>(null);

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
    if (!isStripeConfigured) {
      toast({ title: "Erro de Configuração", description: "As chaves do Stripe não estão configuradas corretamente no arquivo .env.", variant: "destructive" });
      return;
    }
    if (!guild || !guild.stripeCustomerId) {
      toast({ title: "Erro", description: "Informações de assinatura não encontradas.", variant: "destructive" });
      return;
    }
    setProcessingPriceId('manage');
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
      setProcessingPriceId(null);
    }
  };

  const handleUpgradeToPro = async (priceId?: string) => {
    if (!priceId) {
      toast({ title: "Erro de Configuração", description: "ID do plano não especificado.", variant: "destructive" });
      return;
    }
    if (!isStripeConfigured) {
      toast({ title: "Erro de Configuração", description: "As chaves do Stripe não estão configuradas corretamente no arquivo .env.", variant: "destructive" });
      return;
    }
    if (!guild || !user) return;
    setProcessingPriceId(priceId);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: guild.id, userId: user.uid, priceId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { sessionId } = await res.json();
      
      const stripe = await stripePromise;
      if (!stripe) {
        toast({ title: "Erro", description: "Stripe.js falhou ao carregar. Verifique sua chave publicável no arquivo .env.", variant: "destructive" });
        setProcessingPriceId(null);
        return;
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw new Error(error.message);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setProcessingPriceId(null);
    }
  };

  if (authLoading || loadingGuild) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (!guild) {
    return <div className="text-center py-10">Não foi possível carregar as informações da guilda.</div>;
  }

  const isPro = guild.plan === 'pro';
  const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '';
  const quarterlyPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_QUARTERLY_PRICE_ID || '';
  const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '';
  const currentPriceId = guild.stripePriceId;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageTitle title="Plano e Cobrança" description={`Gerencie a assinatura para ${guild.name}`} icon={<Zap />} />
      
      {!isStripeConfigured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Stripe não Configurado</AlertTitle>
          <AlertDescription>
            As funcionalidades de pagamento estão desabilitadas. Por favor, configure suas chaves de API do Stripe no arquivo .env para habilitá-las.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
        {/* Free Plan */}
        <Card className={cn(
            "flex flex-col text-center",
            isPro ? 'border-border opacity-70' : 'border-primary ring-2 ring-primary'
        )}>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
                <Gem className="h-6 w-6 text-muted-foreground"/>
                Plano Gratuito
            </CardTitle>
            <CardDescription>Para guildas que estão começando.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <p className="text-4xl font-bold">R$0 <span className="text-sm font-normal text-muted-foreground">/mês</span></p>
            <ul className="space-y-2 text-sm text-muted-foreground text-left">
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Dashboard da Guilda</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Gerenciamento de Membros</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Sistema de Recrutamento</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500"/>Configurações da Guilda</li>
            </ul>
          </CardContent>
          <CardFooter>
            {isPro ? (
               <Button onClick={handleManageSubscription} className="w-full" disabled={processingPriceId === 'manage'}>
                {processingPriceId === 'manage' ? <Loader2 className="animate-spin" /> : 'Gerenciar Assinatura'}
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>Seu Plano Atual</Button>
            )}
          </CardFooter>
        </Card>

        {/* Monthly Plan */}
        <Card className={cn( "flex flex-col text-center", isPro && currentPriceId === monthlyPriceId && 'border-primary ring-2 ring-primary' )}>
            <CardHeader><CardTitle>Pro Mensal</CardTitle></CardHeader>
            <CardContent className="flex-grow space-y-4">
                <p className="text-4xl font-bold">R$79,90 <span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                <ul className="space-y-2 text-sm text-muted-foreground text-left">
                    <li className="flex items-center gap-2 font-semibold"><CheckCircle className="h-4 w-4 text-green-500"/>Tudo do plano Gratuito, mais:</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Calendário de Eventos Avançado</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Sistema de Loot e Leilões (DKP)</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Galeria de Conquistas</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Log de Auditoria Detalhado</li>
                </ul>
            </CardContent>
            <CardFooter>
                {isPro && currentPriceId === monthlyPriceId ? (
                    <Button variant="outline" className="w-full" disabled>Seu Plano Atual</Button>
                ) : (
                    <Button onClick={() => handleUpgradeToPro(monthlyPriceId)} className="w-full" disabled={!isStripeConfigured || !!processingPriceId}>
                        {processingPriceId === monthlyPriceId ? <Loader2 className="animate-spin" /> : 'Selecionar Mensal'}
                    </Button>
                )}
            </CardFooter>
        </Card>

        {/* Quarterly Plan */}
        <Card className={cn( "flex flex-col text-center", isPro && currentPriceId === quarterlyPriceId && 'border-primary ring-2 ring-primary' )}>
            <CardHeader>
                <CardTitle>Pro Trimestral</CardTitle>
                <Badge variant="secondary">Economize 15%</Badge>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <p className="text-lg text-muted-foreground line-through">R$239,70</p>
                <p className="text-4xl font-bold">R$203,70 <span className="text-sm font-normal text-muted-foreground">/trimestre</span></p>
                <p className="font-semibold text-primary">Equivalente a R$ 67,90/mês</p>
                 <ul className="space-y-2 text-sm text-muted-foreground text-left pt-4 border-t border-border/20">
                    <li className="flex items-center gap-2 font-semibold"><CheckCircle className="h-4 w-4 text-green-500"/>Tudo do plano Gratuito, mais:</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Calendário de Eventos Avançado</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Sistema de Loot e Leilões (DKP)</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Galeria de Conquistas</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Log de Auditoria Detalhado</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>E um SUPER desconto</li>
                </ul>
            </CardContent>
            <CardFooter>
                 {isPro && currentPriceId === quarterlyPriceId ? (
                    <Button variant="outline" className="w-full" disabled>Seu Plano Atual</Button>
                ) : (
                    <Button onClick={() => handleUpgradeToPro(quarterlyPriceId)} className="w-full" disabled={!isStripeConfigured || !!processingPriceId}>
                        {processingPriceId === quarterlyPriceId ? <Loader2 className="animate-spin" /> : 'Selecionar Trimestral'}
                    </Button>
                )}
            </CardFooter>
        </Card>

        {/* Annual Plan */}
        <Card className={cn( "flex flex-col text-center relative overflow-hidden bg-gradient-to-br from-primary/10 to-card", isPro && currentPriceId === annualPriceId && 'border-primary ring-2 ring-primary' )}>
            <Badge className="absolute top-2 right-2 bg-yellow-400 text-yellow-950 hover:bg-yellow-400/90"><Star className="h-3 w-3 mr-1"/>Melhor Valor</Badge>
            <CardHeader>
                <CardTitle>Pro Anual</CardTitle>
                <Badge variant="secondary">Economize 40%</Badge>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <p className="text-lg text-muted-foreground line-through">R$958,80</p>
                <p className="text-4xl font-bold">R$575,40 <span className="text-sm font-normal text-muted-foreground">/ano</span></p>
                <p className="font-semibold text-primary">Equivalente a R$ 47,95/mês</p>
                <ul className="space-y-2 text-sm text-muted-foreground text-left pt-4 border-t border-border/20">
                    <li className="flex items-center gap-2 font-semibold"><CheckCircle className="h-4 w-4 text-green-500"/>Tudo do plano Gratuito, mais:</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Calendário de Eventos Avançado</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Sistema de Loot e Leilões (DKP)</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Galeria de Conquistas</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>Log de Auditoria Detalhado</li>
                    <li className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-yellow-400"/>E um MEGA desconto</li>
                </ul>
            </CardContent>
            <CardFooter>
                {isPro && currentPriceId === annualPriceId ? (
                    <Button variant="outline" className="w-full" disabled>Seu Plano Atual</Button>
                ) : (
                    <Button onClick={() => handleUpgradeToPro(annualPriceId)} className="w-full btn-gradient btn-style-primary" disabled={!isStripeConfigured || !!processingPriceId}>
                       {processingPriceId === annualPriceId ? <Loader2 className="animate-spin" /> : 'Selecionar Anual'}
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
