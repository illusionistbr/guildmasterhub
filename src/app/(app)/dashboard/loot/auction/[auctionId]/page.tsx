
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { useAuth } from '@/contexts/AuthContext';
import { db, doc, onSnapshot, updateDoc, arrayUnion, Timestamp, writeBatch, increment as firebaseIncrement } from '@/lib/firebase';
import type { Guild, Auction, AuctionBid, GuildMemberRoleInfo, AuditActionType } from '@/types/guildmaster';
import { GuildPermission } from '@/types/guildmaster';
import { hasPermission } from '@/lib/permissions';
import { logGuildActivity } from '@/lib/auditLogService';


import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Gem, ArrowLeft, Info, Minus, Plus, RefreshCw, Gavel, Bell, Edit, MoreHorizontal, Trophy } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useHeader } from '@/contexts/HeaderContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function AuctionPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const auctionId = params.auctionId as string;
  const guildId = searchParams.get('guildId');

  const [auction, setAuction] = useState<Auction | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState(1);
  const [isBidding, setIsBidding] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  const winner = useMemo(() => {
    if (!auction || auction.status !== 'ended' || !auction.currentWinnerId || !auction.bids || auction.bids.length === 0) {
        return null;
    }
    const winningBid = [...auction.bids].sort((a, b) => b.amount - a.amount).find(bid => bid.bidderId === auction.currentWinnerId);
    return winningBid || null;
  }, [auction]);


  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);
  
  const canEditAuction = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_LOOT_AUCTIONS_EDIT
    );
  }, [currentUserRoleInfo, guild]);
  
  useEffect(() => {
    if (!guildId) {
      toast({ title: "Erro", description: "ID da guilda não encontrado.", variant: "destructive" });
      router.push('/dashboard/loot');
      return;
    }
    if (!auctionId) {
      toast({ title: "Erro", description: "ID do leilão não encontrado.", variant: "destructive" });
      router.push(`/dashboard/loot?guildId=${guildId}`);
      return;
    }

    const guildDocRef = doc(db, 'guilds', guildId);
    const unsubGuild = onSnapshot(guildDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const guildData = { id: docSnap.id, ...docSnap.data() } as Guild;
            setGuild(guildData);
            setHeaderTitle(`Leilão: ${guildData.name}`);
        } else {
            toast({ title: "Erro", description: "Guilda não encontrada.", variant: "destructive" });
            router.push('/guild-selection');
        }
    });

    const auctionDocRef = doc(db, `guilds/${guildId}/auctions`, auctionId);
    const unsubAuction = onSnapshot(auctionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const auctionData = { id: docSnap.id, ...docSnap.data() } as Auction;
        setAuction(auctionData);
        setLoading(false);
      } else {
        toast({ title: "Erro", description: "Leilão não encontrado.", variant: "destructive" });
        router.push(`/dashboard/loot?guildId=${guildId}`);
      }
    });

    return () => {
      unsubGuild();
      unsubAuction();
      setHeaderTitle(null);
    };
  }, [guildId, auctionId, router, toast, setHeaderTitle]);
  
  useEffect(() => {
    if (auction) {
        const minNextBid = auction.currentBid > 0 
            ? auction.currentBid + auction.minBidIncrement 
            : auction.startingBid;
        if (bidAmount < minNextBid) {
            setBidAmount(minNextBid);
        }
    }
  }, [auction]);


  useEffect(() => {
    if (!auction?.endTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const end = auction.endTime.toDate();
      const diffInSeconds = Math.floor((end.getTime() - now.getTime()) / 1000);

      if (diffInSeconds <= 0) {
        setTimeRemaining(auction.status === 'ended' ? "Leilão Encerrado" : "Finalizando...");
        clearInterval(interval);
      } else if (diffInSeconds <= 60) {
        setTimeRemaining(`Termina em ${diffInSeconds}s`);
      } else {
        setTimeRemaining(formatDistanceToNowStrict(end, { locale: ptBR, addSuffix: true }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [auction?.endTime, auction?.status]);

  useEffect(() => {
    const handleAutomaticFinalization = async () => {
        if (!currentUser || !guild || !auction || !guildId || !auction.bankItemId) return;

        setIsFinalizing(true);
        toast({ title: "Finalizando leilão...", description: "O tempo do leilão acabou, processando os resultados." });

        const batch = writeBatch(db);
        const guildRef = doc(db, "guilds", guildId);
        const auctionRef = doc(db, `guilds/${guildId}/auctions`, auctionId);
        const bankItemRef = doc(db, `guilds/${guildId}/bankItems`, auction.bankItemId);

        try {
            const bids = auction.bids || [];
            const winnerId = auction.currentWinnerId;

            const highestBidsByBidder = bids.reduce((acc, bid) => {
                if (!acc[bid.bidderId] || bid.amount > acc[bid.bidderId]) {
                    acc[bid.bidderId] = bid.amount;
                }
                return acc;
            }, {} as Record<string, number>);

            for (const bidderId in highestBidsByBidder) {
                if (bidderId !== winnerId) {
                    const refundAmount = highestBidsByBidder[bidderId];
                    const bidderPath = `roles.${bidderId}.dkpBalance`;
                    batch.update(guildRef, { [bidderPath]: firebaseIncrement(refundAmount) });
                }
            }
            
            batch.update(auctionRef, { status: 'ended', isDistributed: true });
            batch.update(bankItemRef, { status: 'Distribuído' });
            await batch.commit();

            await logGuildActivity(
                guildId,
                'system', // Attributed to system as it's automatic
                'Sistema',
                'AUCTION_FINALIZED' as AuditActionType,
                {
                    itemName: auction.item.itemName,
                    auctionId: auction.id,
                    auctionWinnerId: winnerId,
                    auctionWinningBid: auction.currentBid
                }
            );
            
            toast({ title: "Leilão Finalizado!", description: "DKP dos perdedores foi reembolsado." });
        } catch (error) {
            console.error("Error finalizing auction:", error);
            toast({ title: "Erro ao Finalizar", description: "Ocorreu um erro ao finalizar o leilão.", variant: "destructive" });
        } finally {
            setIsFinalizing(false);
        }
    };

    if (auction?.status === 'active' && new Date() > auction.endTime.toDate() && canEditAuction) {
        handleAutomaticFinalization();
    }
  }, [auction, canEditAuction, currentUser, guild, guildId, toast]);

  const handlePlaceBid = async () => {
    if (!currentUser || !guild || !auction || !currentUserRoleInfo || !guildId) {
        toast({ title: "Erro", description: "Dados insuficientes para fazer o lance.", variant: "destructive" });
        return;
    }
    if (auction.status !== 'active') {
        toast({ title: "Leilão não está ativo.", variant: "destructive" });
        return;
    }
    if (bidAmount <= auction.currentBid) {
        toast({ title: "Lance Baixo", description: `Seu lance deve ser maior que ${auction.currentBid}.`, variant: "destructive" });
        return;
    }
    if (bidAmount < auction.currentBid + auction.minBidIncrement) {
        toast({ title: "Incremento Mínimo", description: `O lance mínimo deve ser de pelo menos ${auction.currentBid + auction.minBidIncrement} DKP.`, variant: "destructive" });
        return;
    }
    if (auction.currentWinnerId === currentUser.uid) {
        toast({ title: "Ação inválida", description: "Você já é o licitante com o maior lance.", variant: "default" });
        return;
    }

    setIsBidding(true);
    const batch = writeBatch(db);
    try {
        const guildRef = doc(db, "guilds", guildId);
        const auctionRef = doc(db, `guilds/${guildId}/auctions`, auctionId);

        const userPreviousBids = auction.bids?.filter(b => b.bidderId === currentUser.uid) || [];
        const userPreviousHighestBid = userPreviousBids.reduce((max, bid) => Math.max(max, bid.amount), 0);

        const dkpToAdjust = bidAmount - userPreviousHighestBid;
        const userDkp = currentUserRoleInfo.dkpBalance || 0;

        if (userDkp < dkpToAdjust) {
            toast({ title: "DKP Insuficiente", description: `Você precisa de mais ${dkpToAdjust - userDkp} DKP para fazer este lance.`, variant: "destructive" });
            setIsBidding(false);
            return;
        }
        
        const bidderPath = `roles.${currentUser.uid}.dkpBalance`;
        batch.update(guildRef, { [bidderPath]: firebaseIncrement(-dkpToAdjust) });

        const newBid: AuctionBid = {
            bidderId: currentUser.uid,
            bidderName: currentUserRoleInfo.characterNickname || currentUser.displayName || 'Desconhecido',
            amount: bidAmount,
            timestamp: Timestamp.now(),
        };
        
        const updatePayload: any = {
            bids: arrayUnion(newBid),
        };

        if (bidAmount > auction.currentBid) {
            updatePayload.currentBid = bidAmount;
            updatePayload.currentWinnerId = currentUser.uid;
        }
        
        // Anti-sniping logic
        const now = new Date();
        const end = auction.endTime.toDate();
        const diffInSeconds = (end.getTime() - now.getTime()) / 1000;

        if (diffInSeconds > 0 && diffInSeconds <= 60) {
            const newEndTime = new Date(now.getTime() + 60000); // Add 1 minute
            updatePayload.endTime = Timestamp.fromDate(newEndTime);
            
            toast({
                title: "Tempo Estendido!",
                description: "Lance no último minuto. O leilão foi estendido por 1 minuto.",
                variant: "default"
            });
        }
        
        batch.update(auctionRef, updatePayload);
        
        await batch.commit();

        toast({ title: "Lance Feito!", description: `Seu lance de ${bidAmount} DKP foi registrado e o valor foi retido.` });
        
    } catch (error) {
        console.error("Error placing bid:", error);
        toast({ title: "Erro ao Fazer Lance", description: "Ocorreu um erro. Seu DKP não foi alterado.", variant: "destructive" });
    } finally {
        setIsBidding(false);
    }
  };
  
  if (loading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (!auction) {
     return <div className="text-center py-10">Leilão não encontrado.</div>;
  }

  const getStatusBadgeProps = (status: Auction['status']) => {
    switch (status) {
        case 'active': return { text: 'Aberto', className: 'bg-green-600/80' };
        case 'scheduled': return { text: 'Agendado', className: 'bg-yellow-600/80 text-yellow-foreground' };
        case 'ended': return { text: 'Encerrado', className: 'bg-gray-500/80' };
        case 'cancelled': return { text: 'Cancelado', className: 'bg-red-600/80' };
        default: return { text: status, className: 'bg-muted' };
    }
  };

  const statusProps = getStatusBadgeProps(auction.status);
  const userDkp = currentUserRoleInfo?.dkpBalance || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Button>
            <div className="flex gap-2">
                <Button variant="outline"><Bell className="mr-2 h-4 w-4"/> Notificação</Button>
                {canEditAuction && <Button><Edit className="mr-2 h-4 w-4"/> Editar Leilão</Button>}
            </div>
        </div>
        
        <Card className="static-card-container">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 flex justify-center items-center">
                    <div className="w-48 h-48 p-2 rounded-lg flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-black/40 border border-purple-400/50">
                        <Image src={auction.item.imageUrl} alt={auction.item.itemName || "Item"} width={160} height={160} className="object-contain" data-ai-hint="auctioned item"/>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <h2 className="text-3xl font-bold text-foreground">{auction.item.itemName}</h2>
                        <p className="text-md text-muted-foreground">{auction.item.trait}</p>
                        <Badge variant="outline" className="mt-2 border-purple-500 text-purple-400">Épico</Badge>
                    </div>
                     <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Lance Inicial</p>
                            <p className="text-lg font-semibold flex items-center gap-1">{auction.startingBid} <Gem className="h-4 w-4 text-primary"/></p>
                        </div>
                         <div>
                            <p className="text-muted-foreground">Incremento Mínimo</p>
                            <p className="text-lg font-semibold flex items-center gap-1">{auction.minBidIncrement} <Gem className="h-4 w-4 text-primary"/></p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Início</p>
                            <p className="text-lg font-semibold">{format(auction.startTime.toDate(), "dd/MM/yy, HH:mm zzz", { locale: ptBR })}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Término</p>
                            <p className="text-lg font-semibold">{format(auction.endTime.toDate(), "dd/MM/yy, HH:mm zzz", { locale: ptBR })}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card className="static-card-container">
            <CardContent className="p-4 grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="default" className={cn("text-lg", statusProps.className)}>{statusProps.text}</Badge>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Tempo Restante</p>
                    <p className="text-lg font-semibold text-primary">{timeRemaining}</p>
                </div>
            </CardContent>
        </Card>
        
        {auction.status === 'ended' && winner && (
            <Alert variant="default" className="border-amber-500 bg-amber-500/10 text-amber-500">
                <Trophy className="h-5 w-5" />
                <AlertTitle className="font-bold text-amber-400">Leilão Encerrado!</AlertTitle>
                <AlertDescription className="text-amber-300">
                    O vencedor é <strong>{winner.bidderName}</strong> com um lance de <strong>{winner.amount} DKP</strong>.
                </AlertDescription>
            </Alert>
        )}
        
        {isFinalizing && (
             <Alert variant="default" className="border-blue-500 bg-blue-500/10 text-blue-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <AlertTitle className="font-bold text-blue-300">Processando...</AlertTitle>
                <AlertDescription className="text-blue-400">
                    O leilão terminou. Finalizando lances e atualizando o status.
                </AlertDescription>
            </Alert>
        )}

        <Card className="static-card-container">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><Gavel className={cn("h-5 w-5", auction.status === 'active' ? "text-green-500" : "text-gray-500")}/> Lances ao Vivo</CardTitle>
                {auction.status !== 'active' && <CardDescription>Este leilão não está mais aceitando lances.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium">DKP Disponível: <span className="text-primary font-bold">{userDkp}</span></p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setBidAmount(Math.max(auction.currentBid + auction.minBidIncrement, bidAmount - auction.minBidIncrement))} disabled={auction.status !== 'active'}><Minus/></Button>
                        <Input type="number" value={bidAmount} onChange={e => setBidAmount(Number(e.target.value))} className="w-24 text-center" disabled={auction.status !== 'active'}/>
                        <Button variant="outline" size="icon" onClick={() => setBidAmount(bidAmount + auction.minBidIncrement)} disabled={auction.status !== 'active'}><Plus/></Button>
                        <Button onClick={handlePlaceBid} disabled={isBidding || auction.status !== 'active'}>
                            {isBidding ? <Loader2 className="animate-spin"/> : 'Dar Lance'}
                        </Button>
                    </div>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Valor</TableHead>
                                <TableHead>Membro</TableHead>
                                <TableHead>Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auction.bids && auction.bids.length > 0 ? (
                                [...auction.bids].sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis()).map((bid, index) => (
                                    <TableRow key={index} className={cn(index === 0 && "bg-primary/10")}>
                                        <TableCell className="font-semibold text-primary">{bid.amount} DKP</TableCell>
                                        <TableCell>{bid.bidderName}</TableCell>
                                        <TableCell>{formatDistanceToNowStrict(bid.timestamp.toDate(), { locale: ptBR, addSuffix: true })}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">Nenhum lance ainda.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter>
                 <p className="text-xs text-muted-foreground">Lances são priorizados por valor e depois por data.</p>
            </CardFooter>
        </Card>

    </div>
  );
}


export default function AuctionPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
            <AuctionPageContent />
        </Suspense>
    );
}
