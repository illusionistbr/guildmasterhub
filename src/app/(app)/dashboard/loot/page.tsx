
"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, collection, addDoc, serverTimestamp, query as firestoreQuery, Timestamp, onSnapshot, orderBy, writeBatch, updateDoc, arrayUnion, increment as firebaseIncrement, deleteField, getDocs as getFirestoreDocs, where } from '@/lib/firebase';
import type { Guild, UserProfile, BankItem, BankItemStatus, GuildMemberRoleInfo, Auction, AuctionStatus, AuctionBid, RecruitmentQuestion } from '@/types/guildmaster';
import { GuildPermission, TLRole, TLWeapon } from '@/types/guildmaster';
import { hasPermission } from '@/lib/permissions';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as ShadCnAlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Gem, PackagePlus, Axe, Shield as ShieldLucideIcon, Wand2Icon, Bow, Dices, Wrench, Diamond, Sparkles, Package, Tag, CheckSquare, Eye, Users, UserCircle, Shirt, Hand, Footprints, Heart, Search, Filter, Calendar as CalendarIconLucide, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Gavel, MoreHorizontal, ArrowUpDown, Clock, Timer, X, ArrowRight, UserCheck, Armchair } from 'lucide-react';
import { ComingSoon } from '@/components/shared/ComingSoon';
import { useHeader } from '@/contexts/HeaderContext';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from "react-day-picker";
import { format, addHours, addDays, formatDistanceToNow, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

const ITEMS_PER_PAGE = 15;

const rarityBackgrounds: Record<BankItem['rarity'], string> = {
    common: 'bg-slate-800 border-slate-600',
    uncommon: 'bg-emerald-800 border-emerald-600',
    rare: 'bg-sky-800 border-sky-600',
    epic: 'bg-gradient-to-b from-purple-900 to-purple-700 border-purple-500',
    legendary: 'bg-gradient-to-b from-amber-800 to-amber-600 border-amber-500',
};

const statusBadgeClasses: Record<BankItemStatus, string> = {
  'Disponível': 'bg-green-500/20 text-green-600 border-green-500/50',
  'Distribuído': 'bg-orange-500/20 text-orange-600 border-orange-500/50',
  'Em leilão': 'bg-blue-500/20 text-blue-600 border-blue-500/50',
  'Em rolagem': 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50',
  'Aguardando leilão': 'bg-sky-500/20 text-sky-600 border-sky-500/50',
  'Aguardando rolagem': 'bg-amber-500/20 text-amber-600 border-amber-500/50',
};

function LootPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  
  const [bankItems, setBankItems] = useState<BankItem[]>([]);
  const [loadingBankItems, setLoadingBankItems] = useState(true);

  // Filters and Pagination State for Bank
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BankItemStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  const guildId = searchParams.get('guildId');

  const currentUserRoleInfo = useMemo(() => {
    if (!user || !guild || !guild.roles) return null;
    return guild.roles[user.uid];
  }, [user, guild]);

  const canAddBankItem = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_LOOT_BANK_ADD
    );
  }, [currentUserRoleInfo, guild]);

  const canCreateAuctions = useMemo(() => {
    if (!currentUserRoleInfo || !guild?.customRoles) return false;
    return hasPermission(
      currentUserRoleInfo.roleName,
      guild.customRoles,
      GuildPermission.MANAGE_LOOT_AUCTIONS_CREATE
    );
  }, [currentUserRoleInfo, guild]);


  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!guildId) { toast({ title: "ID da Guilda Ausente", variant: "destructive" }); router.push('/guild-selection'); return; }

    const fetchGuildData = async () => {
      setLoadingGuildData(true);
      try {
        const guildDocRef = doc(db, "guilds", guildId);
        const guildSnap = await getDoc(guildDocRef);
        if (!guildSnap.exists()) { toast({ title: "Guilda não encontrada", variant: "destructive" }); router.push('/guild-selection'); return; }
        const guildData = { id: guildSnap.id, ...guildSnap.data() } as Guild;
        setGuild(guildData);
        setHeaderTitle(`Loot: ${guildData.name}`);
      } catch (error) { console.error("Erro ao buscar dados da guilda:", error); toast({ title: "Erro ao carregar dados", variant: "destructive" });
      } finally { setLoadingGuildData(false); }
    };
    fetchGuildData();
    return () => setHeaderTitle(null);
  }, [guildId, user, authLoading, router, toast, setHeaderTitle]);

  useEffect(() => {
    if (!guildId) return;
    setLoadingBankItems(true);
    const bankItemsRef = collection(db, `guilds/${guildId}/bankItems`);
    const q = firestoreQuery(bankItemsRef, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedItems = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as BankItem));
        setBankItems(fetchedItems);
        setLoadingBankItems(false);
      }, (error: any) => {
        console.error("Error fetching bank items: ", error);
        toast({
          title: "Erro ao Carregar Banco",
          description: "Não foi possível carregar os itens do banco. Verifique suas permissões no Firestore.",
          variant: "destructive",
          duration: 9000
        });
        setLoadingBankItems(false);
      });
      return () => unsubscribe();
  }, [guildId, toast]);
  

  const filteredAndSortedItems = useMemo(() => {
    let items = [...bankItems];
    if (searchTerm) {
        items = items.filter(item => item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (statusFilter !== 'all') {
        items = items.filter(item => item.status === statusFilter);
    }
    if (dateFilter?.from) {
         const fromDateStartOfDay = new Date(dateFilter.from);
         fromDateStartOfDay.setHours(0,0,0,0);
         items = items.filter(item => item.createdAt && item.createdAt.toDate() >= fromDateStartOfDay);
    }
    if (dateFilter?.to) {
        const toDateEndOfDay = new Date(dateFilter.to);
        toDateEndOfDay.setHours(23,59,59,999);
        items = items.filter(item => item.createdAt && item.createdAt.toDate() <= toDateEndOfDay);
    }
    return items;
  }, [bankItems, searchTerm, statusFilter, dateFilter]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedItems, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / ITEMS_PER_PAGE);

  if (authLoading || loadingGuildData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  if (!guild) {
    return <PageTitle title="Loot" icon={<Gem className="h-8 w-8 text-primary" />}><div className="text-center py-10">Guilda não encontrada.</div></PageTitle>;
  }

  const statusOptions: (BankItemStatus | 'all')[] = ['all', 'Disponível', 'Distribuído', 'Em leilão', 'Em rolagem', 'Aguardando leilão', 'Aguardando rolagem'];

  return (
    <div className="space-y-8">
      <PageTitle title={`Gerenciamento de Loot de ${guild.name}`} icon={<Gem className="h-8 w-8 text-primary" />} />
      <Tabs defaultValue="banco" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="banco">Banco</TabsTrigger>
          <TabsTrigger value="leiloes">Leilões</TabsTrigger>
          <TabsTrigger value="rolagem">Rolagem</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="banco" className="mt-6">
          <Card className="static-card-container mb-6">
            <CardHeader><CardTitle>Filtros do Banco</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div className="space-y-1">
                  <Label htmlFor="searchItemName">Buscar por Nome</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="searchItemName" placeholder="Nome do item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                  </div>
               </div>
               <div className="space-y-1">
                 <Label htmlFor="statusFilter">Filtrar por Status</Label>
                 <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as BankItemStatus | 'all')}>
                    <SelectTrigger id="statusFilter"><SelectValue placeholder="Filtrar por status..." /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'Todos os Status' : s}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1">
                <Label htmlFor="dateFilter">Filtrar por Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="dateFilter" variant={"outline"} className={cn("w-full justify-start text-left font-normal form-input", !dateFilter && "text-muted-foreground")}>
                      <CalendarIconLucide className="mr-2 h-4 w-4" />
                      {dateFilter?.from ? (dateFilter.to ? <>{format(dateFilter.from, "LLL dd, y")} - {format(dateFilter.to, "LLL dd, y")}</> : format(dateFilter.from, "LLL dd, y")) : <span>Escolha um intervalo</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={dateFilter?.from} selected={dateFilter} onSelect={setDateFilter} numberOfMonths={2} />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
             <CardFooter className="justify-end">
                <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setDateFilter(undefined); setCurrentPage(1);}}>Limpar Filtros</Button>
            </CardFooter>
          </Card>

          {/* This section will be for displaying bank items */}
        </TabsContent>

        <TabsContent value="leiloes" className="mt-6">
          <AuctionsTabContent guild={guild} guildId={guildId} currentUser={user} canCreateAuctions={canCreateAuctions} bankItems={bankItems} />
        </TabsContent>
        <TabsContent value="rolagem" className="mt-6">
          <ComingSoon pageName="Sistemas de Rolagem de Loot" icon={<Dices className="h-8 w-8 text-primary" />} />
        </TabsContent>
        <TabsContent value="configuracoes" className="mt-6">
          <ComingSoon pageName="Configurações do Módulo de Loot" icon={<Wrench className="h-8 w-8 text-primary" />} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeaturedAuctionCard({ auction, currentUser }: { auction: Auction, currentUser: UserProfile | null }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const endTime = auction.endTime.toDate();
      const startTime = auction.startTime.toDate();
      
      if (isAfter(now, endTime)) {
        setTimeLeft("Encerrado");
        setProgress(100);
        return;
      }
      
      const totalDuration = endTime.getTime() - startTime.getTime();
      const elapsedDuration = now.getTime() - startTime.getTime();
      const currentProgress = Math.min(100, (elapsedDuration / totalDuration) * 100);
      setProgress(currentProgress > 0 ? currentProgress : 0);
      setTimeLeft(formatDistanceToNow(endTime, { locale: ptBR, addSuffix: true }));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000 * 60); 
    return () => clearInterval(interval);
  }, [auction]);

  const yourBid = useMemo(() => {
    if (!currentUser) return undefined;
    return auction.bids
      .filter(b => b.bidderId === currentUser.uid)
      .reduce((max, bid) => bid.amount > max ? bid.amount : max, 0);
  }, [auction.bids, currentUser]);

  const isWinning = auction.currentWinnerId === currentUser?.uid;

  return (
    <Card className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-gradient-to-br from-card to-background/50">
      <div className="md:col-span-1 flex items-center justify-center">
        <div className={cn(
          "w-48 h-48 p-3 rounded-lg flex items-center justify-center border-2",
          rarityBackgrounds[auction.item.rarity]
        )}>
          <Image src={auction.item.imageUrl} alt={auction.item.itemName || "Item"} width={160} height={160} className="object-contain" data-ai-hint="auctioned item"/>
        </div>
      </div>
      <div className="md:col-span-2 space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-2xl font-bold text-foreground">{auction.item.itemName}</h3>
          <Badge className={cn(auction.status === 'active' ? "bg-green-500/20 text-green-500 border-green-500/50" : "bg-muted text-muted-foreground")}>
            {auction.status === 'active' ? 'Aberto' : auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
          </Badge>
        </div>
        
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm text-muted-foreground">Tempo restante</span>
            <span className="text-sm font-semibold text-primary">{timeLeft}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Seu Lance</p>
            <p className="text-lg font-bold text-foreground">{yourBid ? `${yourBid} DKP` : 'Nenhum lance'}</p>
          </div>
           <div className="space-y-1">
            <p className="text-muted-foreground">Lance Mais Alto</p>
            <p className="text-lg font-bold text-foreground">{auction.currentBid} DKP</p>
          </div>
        </div>

        {isWinning && (
          <div className="bg-green-500/10 text-green-500 text-sm font-semibold p-3 rounded-md text-center">
            Você está ganhando este leilão!
          </div>
        )}
      </div>
    </Card>
  )
}

function AuctionsTabContent({ guild, guildId, currentUser, canCreateAuctions, bankItems }: { guild: Guild, guildId: string | null, currentUser: UserProfile | null, canCreateAuctions: boolean, bankItems: BankItem[] }) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showNoItemsAlert, setShowNoItemsAlert] = useState(false);

  const availableBankItems = useMemo(() => bankItems.filter(item => item.status === 'Disponível'), [bankItems]);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    const auctionsRef = collection(db, `guilds/${guildId}/auctions`);
    const q = firestoreQuery(auctionsRef, where("status", "in", ["active", "scheduled"]), orderBy("endTime", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAuctions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auction));
      setAuctions(fetchedAuctions);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching auctions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [guildId]);
  
  if (loading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
  }
  
  const featuredAuction = auctions.find(a => a.status === 'active') || (auctions.length > 0 ? auctions[0] : null);

  const getLatestBidder = (bids: AuctionBid[]) => {
    if (bids.length === 0) return 'N/A';
    return [...bids].sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())[0]?.bidderName || 'N/A';
  }

  const handleNewAuctionClick = () => {
    if (availableBankItems.length === 0) {
      setShowNoItemsAlert(true);
    } else {
      setIsWizardOpen(true);
    }
  };

  return (
    <div className="space-y-6">
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Leilões Ativos</h2>
            <p className="text-sm text-muted-foreground">Última atualização: agora</p>
        </div>
        
        {featuredAuction && <FeaturedAuctionCard auction={featuredAuction} currentUser={currentUser} />}
        
        <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
                <Input placeholder="Buscar por nome..." className="w-48" />
                <Select defaultValue="all"><SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Todos Status</SelectItem><SelectItem value="active">Aberto</SelectItem><SelectItem value="ended">Encerrado</SelectItem></SelectContent></Select>
                 <Select defaultValue="all"><SelectTrigger className="w-36"><SelectValue placeholder="Trait" /></SelectTrigger><SelectContent><SelectItem value="all">Todos Traits</SelectItem></SelectContent></Select>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" disabled>Ações</Button>
                <Button onClick={handleNewAuctionClick} disabled={!canCreateAuctions} className="btn-gradient btn-style-secondary">
                    <Gavel className="mr-2 h-4 w-4" /> Novo Leilão
                </Button>
            </div>
        </div>

       <Card className="static-card-container">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"><Checkbox /></TableHead>
                        <TableHead>Item <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                        <TableHead>Lance Inicial</TableHead>
                        <TableHead>Último Lance</TableHead>
                        <TableHead>Fim <ArrowUpDown className="inline h-3 w-3" /></TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {auctions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                Nenhum leilão ativo ou agendado no momento.
                            </TableCell>
                        </TableRow>
                    ) : (
                        auctions.map(auction => (
                            <TableRow key={auction.id}>
                                <TableCell><Checkbox /></TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("w-8 h-8 p-1 rounded-md flex items-center justify-center border-2", rarityBackgrounds[auction.item.rarity])}>
                                            <Image src={auction.item.imageUrl} alt={auction.item.itemName || ""} width={24} height={24} data-ai-hint="auctioned item icon" />
                                        </div>
                                        <span className="font-medium truncate max-w-[150px]">{auction.item.itemName}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{auction.startingBid}</TableCell>
                                <TableCell>{auction.currentBid}</TableCell>
                                <TableCell>{formatDistanceToNow(auction.endTime.toDate(), { locale: ptBR, addSuffix: true })}</TableCell>
                                <TableCell><Badge variant={auction.status === 'active' ? 'default' : 'outline'} className={auction.status === 'active' ? 'bg-green-500/80' : ''}>{auction.status === 'active' ? 'Aberto' : 'Agendado'}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
          </div>
       </Card>
      
      <AuctionCreationWizard
        isOpen={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        guild={guild}
        guildId={guildId}
        currentUser={currentUser}
        bankItems={availableBankItems}
      />
      
      <AlertDialog open={showNoItemsAlert} onOpenChange={setShowNoItemsAlert}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Nenhum Item Disponível no Banco</AlertDialogTitle>
                <ShadCnAlertDialogDescription>
                    Para criar um leilão, você precisa primeiro cadastrar um item no banco da guilda e garantir que seu status esteja "Disponível".
                </ShadCnAlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Entendi</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// New Wizard component for creating auctions
function AuctionCreationWizard({ isOpen, onOpenChange, guild, guildId, currentUser, bankItems }: { isOpen: boolean, onOpenChange: (open: boolean) => void, guild: Guild, guildId: string | null, currentUser: UserProfile | null, bankItems: BankItem[] }) {
    const { toast } = useToast();
    const [step, setStep] = useState<'select' | 'startBid' | 'increment' | 'role' | 'weapon'>('select');
    const [selectedItem, setSelectedItem] = useState<BankItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const allWeaponOptions = Object.values(TLWeapon);

    const [config, setConfig] = useState({
        startBid: 1,
        minIncrement: 1,
        roleRestriction: 'Geral',
        weaponRestriction: 'Geral',
        startTime: new Date(),
        endTime: addHours(new Date(), 24),
    });

    const resetWizard = () => {
        setStep('select');
        setSelectedItem(null);
        setConfig({
            startBid: 1,
            minIncrement: 1,
            roleRestriction: 'Geral',
            weaponRestriction: 'Geral',
            startTime: new Date(),
            endTime: addHours(new Date(), 24),
        });
        onOpenChange(false);
    };

    const handleNextStep = () => {
        if (step === 'select') setStep('startBid');
        if (step === 'startBid') setStep('increment');
        if (step === 'increment') setStep('role');
        if (step === 'role') setStep('weapon');
    };

    const handlePrevStep = () => {
        if (step === 'weapon') setStep('role');
        if (step === 'role') setStep('increment');
        if (step === 'increment') setStep('startBid');
        if (step === 'startBid') {
            setSelectedItem(null);
            setStep('select');
        }
    };
    
    const handleCreateAuction = async () => {
        if (!guildId || !currentUser || !selectedItem) return;
        setIsSubmitting(true);
        
        const batch = writeBatch(db);
        const auctionRef = doc(collection(db, `guilds/${guildId}/auctions`));
        const bankItemRef = doc(db, `guilds/${guildId}/bankItems`, selectedItem.id);

        try {
            const { id, status, createdAt, ...itemData } = selectedItem;

            const newAuctionData: Omit<Auction, 'id' | 'createdAt'> = {
                guildId,
                item: itemData,
                bankItemId: id,
                status: config.startTime <= new Date() ? 'active' : 'scheduled',
                startingBid: config.startBid,
                minBidIncrement: config.minIncrement,
                currentBid: config.startBid,
                bids: [],
                startTime: Timestamp.fromDate(config.startTime),
                endTime: Timestamp.fromDate(config.endTime),
                createdBy: currentUser.uid,
                createdByName: currentUser.displayName || 'N/A',
                isDistributed: false,
                roleRestriction: config.roleRestriction as TLRole | 'Geral',
                weaponRestriction: config.weaponRestriction as TLWeapon | 'Geral',
            };

            batch.set(auctionRef, { ...newAuctionData, createdAt: serverTimestamp() as Timestamp });
            batch.update(bankItemRef, { status: 'Em leilão' });
            
            await batch.commit();
            toast({ title: "Leilão Criado!", description: `O leilão para "${selectedItem.itemName}" foi agendado.` });
            resetWizard();

        } catch (error) {
            console.error("Error creating auction:", error);
            toast({ title: "Erro ao Criar Leilão", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const renderContent = () => {
        switch (step) {
            case 'select':
                return <>
                    <DialogHeader>
                        <DialogTitle>Passo 1: Selecione um Item do Banco</DialogTitle>
                        <DialogDescription>Escolha um item com status "Disponível" para iniciar o leilão.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-80 my-4">
                        <div className="space-y-2 pr-4">
                            {bankItems.map(item => (
                                <div key={item.id} className="border p-2 rounded-md flex items-center justify-between gap-2 hover:bg-muted/50 cursor-pointer" onClick={() => { setSelectedItem(item); handleNextStep(); }}>
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={cn("w-12 h-12 p-1 rounded-md flex items-center justify-center border", rarityBackgrounds[item.rarity])}>
                                            <Image src={item.imageUrl} alt={item.itemName || "Item"} width={40} height={40} className="object-contain" data-ai-hint="game item"/>
                                        </div>
                                        <div>
                                            <p className="font-semibold truncate text-sm">{item.itemName}</p>
                                            <p className="text-xs text-muted-foreground truncate">{item.trait}</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-primary"/>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </>;

            case 'startBid':
                return <>
                    <DialogHeader><DialogTitle>Passo 2: Lance Inicial</DialogTitle></DialogHeader>
                    <div className="py-4"><Label>Lance inicial (DKP)</Label><Input type="number" value={config.startBid} onChange={e => setConfig(c => ({...c, startBid: Number(e.target.value)}))} min="1"/></div>
                    <DialogFooter><Button variant="outline" onClick={handlePrevStep}>Voltar</Button><Button onClick={handleNextStep}>Próximo</Button></DialogFooter>
                </>;

            case 'increment':
                 return <>
                    <DialogHeader><DialogTitle>Passo 3: Incremento Mínimo</DialogTitle></DialogHeader>
                    <div className="py-4"><Label>Aumento mínimo por lance (DKP)</Label><Input type="number" value={config.minIncrement} onChange={e => setConfig(c => ({...c, minIncrement: Number(e.target.value)}))} min="1"/></div>
                    <DialogFooter><Button variant="outline" onClick={handlePrevStep}>Voltar</Button><Button onClick={handleNextStep}>Próximo</Button></DialogFooter>
                </>;

            case 'role':
                 return <>
                    <DialogHeader><DialogTitle>Passo 4: Restrição por Função</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-2"><Label>Leilão exclusivo para:</Label>
                        <Select value={config.roleRestriction} onValueChange={v => setConfig(c => ({...c, roleRestriction: v}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Geral"><div className="flex items-center gap-2"><Users className="h-4 w-4"/>Geral (Todos)</div></SelectItem>
                                <SelectItem value={TLRole.Tank}><div className="flex items-center gap-2"><ShieldLucideIcon className="h-4 w-4 text-sky-500"/>{TLRole.Tank}</div></SelectItem>
                                <SelectItem value={TLRole.DPS}><div className="flex items-center gap-2"><Swords className="h-4 w-4 text-rose-500"/>{TLRole.DPS}</div></SelectItem>
                                <SelectItem value={TLRole.Healer}><div className="flex items-center gap-2"><Heart className="h-4 w-4 text-emerald-500"/>{TLRole.Healer}</div></SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={handlePrevStep}>Voltar</Button><Button onClick={handleNextStep}>Próximo</Button></DialogFooter>
                </>;
                
            case 'weapon':
                return <>
                    <DialogHeader><DialogTitle>Passo 5: Restrição por Arma</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-2"><Label>Leilão exclusivo para usuários de:</Label>
                        <Select value={config.weaponRestriction} onValueChange={v => setConfig(c => ({...c, weaponRestriction: v}))}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Geral"><div className="flex items-center gap-2"><Armchair className="h-4 w-4"/>Geral (Todas as armas)</div></SelectItem>
                                {allWeaponOptions.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={handlePrevStep}>Voltar</Button><Button onClick={handleCreateAuction} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'Finalizar e Criar Leilão'}</Button></DialogFooter>
                </>;
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetWizard(); else onOpenChange(open); }}>
            <DialogContent className="sm:max-w-md bg-card border-border">
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
}


const LootPageWrapper = () => {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <LootPageContent />
    </Suspense>
  );
}
export default LootPageWrapper;
