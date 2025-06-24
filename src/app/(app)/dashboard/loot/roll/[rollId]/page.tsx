
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, onSnapshot, updateDoc, arrayUnion, Timestamp, writeBatch, getDoc, increment } from '@/lib/firebase';
import type { Guild, LootRoll, LootRollEntry, GuildMemberRoleInfo, AuditActionType } from '@/types/guildmaster';
import { GuildPermission } from '@/types/guildmaster';
import { hasPermission } from '@/lib/permissions';
import { logGuildActivity } from '@/lib/auditLogService';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Gem, ArrowLeft, Info, RefreshCw, Dices, Bell, Edit, MoreHorizontal, Trophy, CheckSquare } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHeader } from '@/contexts/HeaderContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function LootRollPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const rollId = params.rollId as string;
  const guildId = searchParams.get('guildId');

  const [roll, setRoll] = useState<LootRoll | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRolling, setIsRolling] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  const currentUserRoleInfo = useMemo(() => {
    if (!currentUser || !guild || !guild.roles) return null;
    return guild.roles[currentUser.uid];
  }, [currentUser, guild]);

  const canEditRoll = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(currentUserRoleInfo.roleName, guild.customRoles, GuildPermission.MANAGE_LOOT_ROLLS_MANAGE);
  }, [currentUserRoleInfo, guild]);

  useEffect(() => {
    if (!guildId || !rollId) {
      toast({ title: "Erro", description: "IDs de guilda ou rolagem não encontrados.", variant: "destructive" });
      router.push(`/dashboard/loot?guildId=${guildId || ''}`);
      return;
    }

    const unsubGuild = onSnapshot(doc(db, 'guilds', guildId), (docSnap) => {
      if (docSnap.exists()) setGuild({ id: docSnap.id, ...docSnap.data() } as Guild);
      else {
        toast({ title: "Erro", description: "Guilda não encontrada.", variant: "destructive" });
        router.push('/guild-selection');
      }
    });

    const unsubRoll = onSnapshot(doc(db, `guilds/${guildId}/rolls`, rollId), (docSnap) => {
      if (docSnap.exists()) {
        const rollData = { id: docSnap.id, ...docSnap.data() } as LootRoll;
        setRoll(rollData);
        setHeaderTitle(`Rolagem: ${rollData.item.itemName}`);
        setLoading(false);
      } else {
        toast({ title: "Erro", description: "Rolagem de loot não encontrada.", variant: "destructive" });
        router.push(`/dashboard/loot?guildId=${guildId}`);
      }
    });

    return () => {
      unsubGuild();
      unsubRoll();
      setHeaderTitle(null);
    };
  }, [guildId, rollId, router, toast, setHeaderTitle]);

  useEffect(() => {
    if (!roll?.endTime) return;
    const interval = setInterval(() => {
      const now = new Date();
      const end = roll.endTime.toDate();
      const diffInSeconds = Math.floor((end.getTime() - now.getTime()) / 1000);

      if (diffInSeconds <= 0) {
        setTimeRemaining(roll.status === 'ended' ? "Rolagem Encerrada" : "Finalizando...");
        clearInterval(interval);
      } else {
        setTimeRemaining(formatDistanceToNowStrict(end, { locale: ptBR, addSuffix: true }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [roll?.endTime, roll?.status]);

    useEffect(() => {
    const handleAutomaticFinalization = async () => {
        if (!currentUser || !guild || !roll || !guildId || !roll.bankItemId) return;
        if (roll.status !== 'active' || new Date() < roll.endTime.toDate()) return;

        setIsFinalizing(true);
        toast({ title: "Finalizando rolagem...", description: "O tempo da rolagem acabou, processando os resultados." });

        const batch = writeBatch(db);
        const guildRef = doc(db, "guilds", guildId);
        const rollRef = doc(db, `guilds/${guildId}/rolls`, rollId);
        const bankItemRef = doc(db, `guilds/${guildId}/bankItems`, roll.bankItemId);

        try {
            const rolls = roll.rolls || [];
            if (rolls.length === 0) {
                batch.update(rollRef, { status: 'ended' });
                batch.update(bankItemRef, { status: 'Disponível' }); 
                await batch.commit();
                toast({ title: "Rolagem Encerrada", description: "Ninguém participou da rolagem. O item voltou para o banco." });
                setIsFinalizing(false);
                return;
            }

            const sortedRolls = [...rolls].sort((a, b) => b.rollValue - a.rollValue);
            const winner = sortedRolls[0];
            const winnerId = winner.rollerId;
            const winningRoll = winner.rollValue;

            if (roll.refundDkpToLosers) {
                const losers = rolls.filter(r => r.rollerId !== winnerId);
                losers.forEach(loser => {
                    const loserPath = `roles.${loser.rollerId}.dkpBalance`;
                    batch.update(guildRef, { [loserPath]: increment(roll.cost) });
                });
            }

            batch.update(rollRef, {
                status: 'ended',
                winnerId: winnerId,
                winningRoll: winningRoll
            });
            batch.update(bankItemRef, { status: 'Encerrado' }); 
            
            await batch.commit();

            await logGuildActivity(
                guildId, 'system', 'Sistema', AuditActionType.LOOT_ROLL_FINALIZED,
                { rollId: roll.id, itemName: roll.item.itemName, rollWinnerId: winnerId, rollWinningValue: winningRoll }
            );

            toast({ title: "Rolagem Finalizada!", description: `O vencedor é ${winner.rollerName} com uma rolagem de ${winningRoll}.` });
        } catch (error) {
            console.error("Error finalizing loot roll:", error);
            toast({ title: "Erro ao Finalizar", description: "Ocorreu um erro ao finalizar a rolagem.", variant: "destructive" });
        } finally {
            setIsFinalizing(false);
        }
    };

    const runFinalizationCheck = async () => {
        if (!roll || !guildId || !canEditRoll) return;

        const rollRef = doc(db, `guilds/${guildId}/rolls`, rollId);
        const rollSnap = await getDoc(rollRef);
        if (!rollSnap.exists()) return;
        const currentRollData = rollSnap.data() as LootRoll;
        
        if (currentRollData.status === 'active' && new Date() > currentRollData.endTime.toDate()) {
            await handleAutomaticFinalization();
        }
    };

    runFinalizationCheck();

  }, [roll, canEditRoll, currentUser, guild, guildId, toast, rollId]);


  const handleRollDice = async () => {
    if (!currentUser || !guild || !roll || !guildId || !currentUserRoleInfo) {
      toast({ title: "Erro", description: "Dados insuficientes para rolar os dados.", variant: "destructive" });
      return;
    }
    if (roll.status !== 'active') {
      toast({ title: "Rolagem não está ativa.", variant: "destructive" });
      return;
    }
    const userHasRolled = roll.rolls.some(r => r.rollerId === currentUser.uid);
    if (userHasRolled) {
      toast({ title: "Você já rolou", description: "Você já participou desta rolagem.", variant: "default" });
      return;
    }
    if ((currentUserRoleInfo.dkpBalance || 0) < roll.cost) {
      toast({ title: "DKP Insuficiente", description: `Você não tem ${roll.cost} DKP para participar.`, variant: "destructive" });
      return;
    }
    if (roll.roleRestriction && roll.roleRestriction !== 'Geral' && currentUserRoleInfo.tlRole !== roll.roleRestriction) {
        toast({ title: "Restrição de Função", description: `Apenas a função ${roll.roleRestriction} pode rolar este item.`, variant: "destructive"});
        return;
    }
    if (roll.weaponRestriction && roll.weaponRestriction !== 'Geral' && currentUserRoleInfo.tlPrimaryWeapon !== roll.weaponRestriction && currentUserRoleInfo.tlSecondaryWeapon !== roll.weaponRestriction) {
        toast({ title: "Restrição de Arma", description: `Apenas usuários com a arma ${roll.weaponRestriction} podem rolar este item.`, variant: "destructive"});
        return;
    }

    setIsRolling(true);

    try {
      const batch = writeBatch(db);
      const rollRef = doc(db, `guilds/${guildId}/rolls`, rollId);
      const guildRef = doc(db, "guilds", guildId);

      const hasHundredRolled = roll.rolls.some(r => r.rollValue === 100);
      const maxRoll = hasHundredRolled ? 99 : 100;
      const rollValue = Math.floor(Math.random() * maxRoll) + 1;

      const newRollEntry: LootRollEntry = {
        rollerId: currentUser.uid,
        rollerName: currentUserRoleInfo.characterNickname || currentUser.displayName || 'Desconhecido',
        rollValue: rollValue,
        timestamp: Timestamp.now(),
      };

      batch.update(guildRef, { [`roles.${currentUser.uid}.dkpBalance`]: increment(-roll.cost) });
      batch.update(rollRef, { rolls: arrayUnion(newRollEntry) });

      await batch.commit();

      await logGuildActivity(
        guildId,
        currentUser.uid,
        currentUser.displayName,
        AuditActionType.LOOT_ROLL_PARTICIPATED,
        {
          rollId: roll.id,
          itemName: roll.item.itemName,
          rollValue: rollValue,
          rollCost: roll.cost,
        }
      );

      toast({ title: "Rolagem Realizada!", description: `Você rolou ${rollValue} e pagou ${roll.cost} DKP.` });

    } catch (error) {
      console.error("Error rolling dice:", error);
      toast({ title: "Erro ao Rolar Dados", description: "Ocorreu um erro ao processar sua rolagem. Seu DKP não foi alterado.", variant: "destructive" });
    } finally {
      setIsRolling(false);
    }
  };

  const handleMarkAsDistributed = async () => {
    if (!currentUser || !guild || !roll || !guildId || !canEditRoll || !roll.bankItemId) {
      toast({ title: "Erro", description: "Dados insuficientes ou permissão negada.", variant: "destructive" });
      return;
    }

    setIsFinalizing(true);
    const batch = writeBatch(db);
    const rollRef = doc(db, `guilds/${guildId}/rolls`, rollId);
    const bankItemRef = doc(db, `guilds/${guildId}/bankItems`, roll.bankItemId);

    const bankItemSnap = await getDoc(bankItemRef);
    if (!bankItemSnap.exists()) {
        toast({ title: "Erro", description: "O item correspondente no banco não foi encontrado.", variant: "destructive" });
        setIsFinalizing(false);
        return;
    }

    try {
      batch.update(rollRef, { isDistributed: true });
      batch.update(bankItemRef, { status: 'Distribuído' });
      await batch.commit();
      
      const winnerInfo = roll.rolls.find(r => r.rollerId === roll.winnerId);

      await logGuildActivity(
        guildId,
        currentUser.uid,
        currentUser.displayName,
        AuditActionType.LOOT_ROLL_ITEM_DISTRIBUTED,
        {
          rollId: roll.id,
          itemName: roll.item.itemName,
          targetUserId: roll.winnerId,
          targetUserDisplayName: winnerInfo?.rollerName || 'N/A'
        }
      );

      toast({ title: "Item Distribuído!", description: `${roll.item.itemName} foi marcado como distribuído.` });
    } catch (error) {
      console.error("Error marking as distributed:", error);
      toast({ title: "Erro", description: "Ocorreu um erro ao marcar o item como distribuído.", variant: "destructive" });
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  if (!roll) {
    return <div className="text-center py-10">Rolagem de loot não encontrada.</div>;
  }
  
  const getStatusBadgeProps = (status: LootRoll['status']) => {
    switch (status) {
        case 'active': return { text: 'Aberta', className: 'bg-green-500/20 text-green-600 border-green-500/50' };
        case 'scheduled': return { text: 'Agendada', className: 'bg-sky-500/20 text-sky-600 border-sky-500/50' };
        case 'ended': return { text: 'Encerrada', className: 'bg-gray-500/20 text-gray-400 border-gray-500/50' };
        case 'cancelled': return { text: 'Cancelada', className: 'bg-red-500/20 text-red-600 border-red-500/50' };
        default: return { text: status, className: 'bg-gray-500/20 text-gray-400 border-gray-500/50' };
    }
  };

  const statusProps = getStatusBadgeProps(roll.status);
  const userDkp = currentUserRoleInfo?.dkpBalance || 0;
  const userHasRolled = roll.rolls.some(r => r.rollerId === currentUser?.uid);
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
            <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4"/> Voltar</Button>
            <div className="flex gap-2">
                {canEditRoll && <Button><Edit className="mr-2 h-4 w-4"/> Editar Rolagem</Button>}
            </div>
        </div>
        
        <Card className="static-card-container">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 flex justify-center items-center">
                    <div className="w-48 h-48 p-2 rounded-lg flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-black/40 border border-purple-400/50">
                        <Image src={roll.item.imageUrl} alt={roll.item.itemName || "Item"} width={160} height={160} className="object-contain" data-ai-hint="rolled item"/>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <h2 className="text-3xl font-bold text-foreground">{roll.item.itemName}</h2>
                        <p className="text-md text-muted-foreground">{roll.item.trait}</p>
                        <Badge variant="outline" className="mt-2 border-purple-500 text-purple-400">Épico</Badge>
                    </div>
                     <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-muted-foreground">Custo da Rolagem</p>
                            <p className="text-lg font-semibold flex items-center gap-1">{roll.cost} <Gem className="h-4 w-4 text-primary"/></p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Devolve DKP aos perdedores?</p>
                            <p className="text-lg font-semibold">{roll.refundDkpToLosers ? "Sim" : "Não"}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Início</p>
                            <p className="text-lg font-semibold">{format(roll.startTime.toDate(), "dd/MM/yy, HH:mm zzz", { locale: ptBR })}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Término</p>
                            <p className="text-lg font-semibold">{format(roll.endTime.toDate(), "dd/MM/yy, HH:mm zzz", { locale: ptBR })}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card className="static-card-container">
            <CardContent className="p-4 grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={cn("text-lg", statusProps.className)}>{statusProps.text}</Badge>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Tempo Restante</p>
                    <p className="text-lg font-semibold text-primary">{timeRemaining}</p>
                </div>
            </CardContent>
        </Card>
        
        {roll.status === 'ended' && roll.winnerId && (
            <Alert variant="default" className="border-amber-500 bg-amber-500/10 text-amber-500">
                <Trophy className="h-5 w-5" />
                <AlertTitle className="font-bold text-amber-400">Rolagem Encerrada!</AlertTitle>
                <AlertDescription className="text-amber-300">
                    O vencedor é <strong>{roll.rolls.find(r => r.rollerId === roll.winnerId)?.rollerName}</strong> com uma rolagem de <strong>{roll.winningRoll}</strong>.
                </AlertDescription>
            </Alert>
        )}
        
        {isFinalizing && (
             <Alert variant="default" className="border-blue-500 bg-blue-500/10 text-blue-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <AlertTitle className="font-bold text-blue-300">Processando...</AlertTitle>
                <AlertDescription className="text-blue-400">
                    A rolagem terminou. Finalizando resultados e atualizando o status.
                </AlertDescription>
            </Alert>
        )}

        {roll.status === 'ended' && !roll.isDistributed && canEditRoll && (
            <Card className="static-card-container border-amber-500/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckSquare className="h-5 w-5 text-amber-500"/>
                        Confirmar Distribuição do Item
                    </CardTitle>
                    <CardDescription>
                        Após entregar o item ao vencedor da rolagem, marque-o como distribuído para finalizar o processo e atualizar o status no banco da guilda.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleMarkAsDistributed} disabled={isFinalizing} className="btn-gradient btn-style-secondary">
                        {isFinalizing ? <Loader2 className="animate-spin"/> : 'Marcar como Distribuído'}
                    </Button>
                </CardFooter>
            </Card>
        )}

        <Card className="static-card-container">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><Dices className={cn("h-5 w-5", roll.status === 'active' ? "text-green-500" : "text-gray-500")}/> Rolagens de Dados</CardTitle>
                {roll.status !== 'active' && <CardDescription>Esta rolagem não está mais aceitando participações.</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium">DKP Disponível: <span className="text-primary font-bold">{userDkp}</span> / Custo: <span className="text-primary font-bold">{roll.cost}</span></p>
                    <Button onClick={handleRollDice} disabled={isRolling || roll.status !== 'active' || userHasRolled || userDkp < roll.cost}>
                        {isRolling ? <Loader2 className="animate-spin"/> : <Dices className="mr-2"/>}
                        {userHasRolled ? 'Você já rolou' : (userDkp < roll.cost ? 'DKP Insuficiente' : 'Rolar os Dados')}
                    </Button>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Resultado</TableHead>
                                <TableHead>Membro</TableHead>
                                <TableHead>Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roll.rolls && roll.rolls.length > 0 ? (
                                [...roll.rolls].sort((a,b) => b.rollValue - a.rollValue).map((entry, index) => (
                                    <TableRow key={index} className={cn(roll.winnerId === entry.rollerId && "bg-primary/10")}>
                                        <TableCell className="font-semibold text-primary">{entry.rollValue}</TableCell>
                                        <TableCell>{entry.rollerName}</TableCell>
                                        <TableCell>{formatDistanceToNowStrict(entry.timestamp.toDate(), { locale: ptBR, addSuffix: true })}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">Ninguém rolou os dados ainda.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}


export default function LootRollPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
            <LootRollPageContent />
        </Suspense>
    );
}
