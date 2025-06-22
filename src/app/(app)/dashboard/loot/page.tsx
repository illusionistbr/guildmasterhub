
"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, doc, getDoc, collection, addDoc, serverTimestamp, query as firestoreQuery, Timestamp, onSnapshot, orderBy, writeBatch, updateDoc, arrayUnion, increment as firebaseIncrement, deleteField, getDocs as getFirestoreDocs, where, ref as storageFirebaseRef, uploadBytes, getDownloadURL, deleteDoc as deleteFirestoreDoc } from '@/lib/firebase';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Loader2, Gem, PackagePlus, Axe, Shield as ShieldLucideIcon, Wand2Icon, Bow, Dices, Wrench, Diamond, Sparkles, Package, Tag, CheckSquare, Eye, Users, UserCircle, Shirt, Hand, Footprints, Heart, Search, Filter, Calendar as CalendarIconLucide, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Gavel, MoreHorizontal, ArrowUpDown, Clock, Timer, X, ArrowRight, UserCheck, Armchair, Swords, Trash2, UploadCloud } from 'lucide-react';
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


const itemFormSchema = z.object({
  itemCategory: z.string().min(1, "Categoria é obrigatória."),
  weaponType: z.string().optional(),
  armorType: z.string().optional(),
  accessoryType: z.string().optional(),
  itemName: z.string().min(1, "Nome do item é obrigatório."),
  trait: z.string().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
  imageUrl: z.string().url("URL de imagem inválida.").optional().or(z.literal('')),
  imageFile: z.instanceof(File).optional(),
  droppedByMemberName: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.imageUrl && !data.imageFile) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Forneça uma URL ou faça upload de uma imagem.", path: ["imageUrl"] });
    }
    if (data.itemCategory === 'weapon' && !data.weaponType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de arma é obrigatório.", path: ["weaponType"] });
    }
    if (data.itemCategory === 'armor' && !data.armorType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de armadura é obrigatório.", path: ["armorType"] });
    }
    if (data.itemCategory === 'accessory' && !data.accessoryType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de acessório é obrigatório.", path: ["accessoryType"] });
    }
});
type ItemFormValues = z.infer<typeof itemFormSchema>;

const WEAPON_TYPES = ["Greatsword", "Longbow", "Daggers", "Crossbow", "Staff", "Wand & Tome", "Sword & Shield"];
const ARMOR_TYPES = ["Helmet", "Chestpiece", "Gloves", "Pants", "Shoes"];
const ACCESSORY_TYPES = ["Necklace", "Earring", "Ring", "Belt"];
const WEAPON_ITEMS_MAP: Record<string, string[]> = { "Greatsword": ["Claymore of Destruction"], "Longbow": ["Elven Bow of Precision"] };
const ARMOR_ITEMS_MAP: Record<string, string[]> = { "Helmet": ["Helm of Valor"], "Chestpiece": ["Cuirass of the Guardian"] };
const ACCESSORY_ITEMS_MAP: Record<string, string[]> = { "Ring": ["Ring of Power"], "Necklace": ["Amulet of Kings"] };
const itemSubTypesRequiringTrait = ["Greatsword", "Longbow", "Staff"];


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

            <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                    Mostrando {paginatedItems.length} de {filteredAndSortedItems.length} itens.
                </p>
                {canAddBankItem && (
                    <NewBankItemDialog
                        guildId={guildId}
                        currentUser={user}
                    />
                )}
            </div>

            {loadingBankItems ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {[...Array(ITEMS_PER_PAGE)].map((_, i) => <Skeleton key={i} className="h-52 w-full" />)}
                </div>
            ) : paginatedItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {paginatedItems.map(item => (
                        <BankItemCard key={item.id} item={item} guildId={guildId} guild={guild} currentUserRoleInfo={currentUserRoleInfo} />
                    ))}
                </div>
            ) : (
                <Card className="static-card-container text-center py-10 mt-6">
                    <CardHeader><Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" /></CardHeader>
                    <CardContent>
                        <p className="text-xl font-semibold text-foreground">O Banco da Guilda está Vazio</p>
                        <p className="text-muted-foreground mt-2">
                            {searchTerm || statusFilter !== 'all' || dateFilter?.from
                                ? "Nenhum item encontrado com os filtros atuais."
                                : "Adicione o primeiro item ao banco."}
                        </p>
                    </CardContent>
                </Card>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center p-4 mt-6">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground mx-4">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Próxima
                    </Button>
                </div>
            )}
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

function BankItemCard({ item, guildId, guild, currentUserRoleInfo }: { item: BankItem, guildId: string | null, guild: Guild | null, currentUserRoleInfo: GuildMemberRoleInfo | null }) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    
    const canManageBankItem = useMemo(() => {
        if (!currentUserRoleInfo || !guild?.customRoles) return false;
        return hasPermission(currentUserRoleInfo.roleName, guild.customRoles, GuildPermission.MANAGE_LOOT_BANK_MANAGE);
    }, [currentUserRoleInfo, guild]);

    const canStartAuction = useMemo(() => {
        if (!currentUserRoleInfo || !guild?.customRoles) return false;
        return hasPermission(currentUserRoleInfo.roleName, guild.customRoles, GuildPermission.MANAGE_LOOT_AUCTIONS_CREATE);
    }, [currentUserRoleInfo, guild]);


    const handleDelete = async () => {
        if (!guildId || !canManageBankItem) {
            toast({ title: "Permissão negada", variant: "destructive" });
            return;
        }
        setIsDeleting(true);
        try {
            await deleteFirestoreDoc(doc(db, `guilds/${guildId}/bankItems`, item.id));
            toast({ title: "Item excluído", description: `${item.itemName} foi removido do banco.` });
        } catch (error) {
            console.error("Error deleting item: ", error);
            toast({ title: "Erro ao excluir", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className="static-card-container flex flex-col group overflow-hidden">
            <CardHeader className={cn("p-2 relative aspect-square flex items-center justify-center border-2", rarityBackgrounds[item.rarity])}>
                <Image src={item.imageUrl} alt={item.itemName || "Item"} layout="fill" objectFit="contain" className="transition-transform duration-300 group-hover:scale-110" data-ai-hint="game item"/>
                <Badge variant="secondary" className="absolute top-2 left-2 z-10 capitalize">{item.rarity}</Badge>
                {canManageBankItem && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-black/30 hover:bg-black/60 text-white z-10">
                                <MoreHorizontal />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">Excluir</DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <ShadCnAlertDialogDescription>Tem certeza que quer excluir o item "{item.itemName}"? Esta ação não pode ser desfeita.</ShadCnAlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                                            {isDeleting ? <Loader2 className="animate-spin" /> : "Excluir"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>
            <CardContent className="p-3 flex-grow flex flex-col justify-between">
                <div>
                    <CardTitle className="text-base font-semibold leading-tight truncate">{item.itemName}</CardTitle>
                    {item.trait && <CardDescription className="text-xs truncate">{item.trait}</CardDescription>}
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <Badge className={cn("text-xs", statusBadgeClasses[item.status])}>{item.status}</Badge>
                    {item.status === 'Disponível' && canStartAuction && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled>
                           <Gavel className="mr-1 h-3 w-3"/> Leiloar
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function NewBankItemDialog({ guildId, currentUser }: { guildId: string | null; currentUser: UserProfile | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemFormSchema),
        defaultValues: { itemCategory: "", rarity: 'common', imageUrl: "" }
    });

    const { watch, reset, setValue } = form;
    const watchedItemCategory = watch('itemCategory');
    const watchedWeaponType = watch('weaponType');
    const watchedArmorType = watch('armorType');
    const watchedAccessoryType = watch('accessoryType');

    const currentItemNameOptions =
        watchedItemCategory === 'weapon' && watchedWeaponType ? WEAPON_ITEMS_MAP[watchedWeaponType] || [] :
        watchedItemCategory === 'armor' && watchedArmorType ? ARMOR_ITEMS_MAP[watchedArmorType] || [] :
        watchedItemCategory === 'accessory' && watchedAccessoryType ? ACCESSORY_ITEMS_MAP[watchedAccessoryType] || [] : [];
    
    const isTraitMandatory =
        (watchedItemCategory === 'weapon' && watchedWeaponType && itemSubTypesRequiringTrait.includes(watchedWeaponType)) ||
        (watchedItemCategory === 'armor' && watchedArmorType && itemSubTypesRequiringTrait.includes(watchedArmorType));


    const onSubmit: SubmitHandler<ItemFormValues> = async (data) => {
        if (!guildId || !currentUser) return;
        setIsSubmitting(true);
        
        try {
            let finalImageUrl = data.imageUrl || "";
            if (data.imageFile) {
                const file = data.imageFile;
                const filePath = `guilds/${guildId}/bank_items/${Date.now()}_${file.name}`;
                const fileRef = storageFirebaseRef(storage, filePath);
                await uploadBytes(fileRef, file);
                finalImageUrl = await getDownloadURL(fileRef);
            }

            const newBankItem: Omit<BankItem, 'id'> = {
                createdAt: serverTimestamp() as Timestamp,
                itemCategory: data.itemCategory,
                weaponType: data.weaponType,
                armorType: data.armorType,
                accessoryType: data.accessoryType,
                itemName: data.itemName,
                trait: data.trait,
                imageUrl: finalImageUrl,
                rarity: data.rarity,
                status: 'Disponível',
                droppedByMemberId: currentUser.uid,
                droppedByMemberName: currentUser.displayName || 'N/A'
            };

            await addDoc(collection(db, `guilds/${guildId}/bankItems`), newBankItem);
            toast({ title: "Item Adicionado!", description: `${data.itemName} foi adicionado ao banco.` });
            setIsOpen(false);
            reset();
        } catch (error) {
            console.error("Error adding item:", error);
            toast({ title: "Erro ao adicionar item", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="btn-gradient btn-style-secondary"><PackagePlus className="mr-2 h-4 w-4" /> Novo Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Adicionar Item ao Banco da Guilda</DialogTitle>
                    <DialogDescription>Preencha os detalhes do item para adicioná-lo ao banco.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
                    <FormField name="itemCategory" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Categoria do Item *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="weapon">Arma</SelectItem><SelectItem value="armor">Armadura</SelectItem><SelectItem value="accessory">Acessório</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                    {watchedItemCategory === 'weapon' && <FormField name="weaponType" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tipo de Arma *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{WEAPON_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                    {watchedItemCategory === 'armor' && <FormField name="armorType" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tipo de Armadura *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{ARMOR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                    {watchedItemCategory === 'accessory' && <FormField name="accessoryType" control={form.control} render={({ field }) => (<FormItem><FormLabel>Tipo de Acessório *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{ACCESSORY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                    
                    <FormField name="itemName" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Nome do Item *</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={currentItemNameOptions.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={currentItemNameOptions.length > 0 ? "Selecione o item..." : "Selecione um tipo primeiro"}/></SelectTrigger></FormControl><SelectContent>{currentItemNameOptions.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                    <FormField name="trait" control={form.control} render={({ field }) => (<FormItem><FormLabel>Trait {isTraitMandatory && '*'}</FormLabel><FormControl><Input {...field} placeholder="Ex: Precise, Impenetrable..."/></FormControl><FormMessage /></FormItem>)}/>
                    <FormField name="rarity" control={form.control} render={({ field }) => (<FormItem><FormLabel>Raridade *</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="common">Comum</SelectItem><SelectItem value="uncommon">Incomum</SelectItem><SelectItem value="rare">Raro</SelectItem><SelectItem value="epic">Épico</SelectItem><SelectItem value="legendary">Lendário</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                    
                    <FormField name="imageUrl" control={form.control} render={({ field }) => ( <FormItem><FormLabel>URL da Imagem</FormLabel><FormControl><Input {...field} placeholder="https://..." disabled={!!watch('imageFile')} /></FormControl><FormMessage /></FormItem>)}/>
                    <div className="text-center text-sm text-muted-foreground my-2">OU</div>
                    <FormField name="imageFile" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Upload da Imagem</FormLabel><FormControl><Input type="file" accept="image/*" onChange={e => setValue('imageFile', e.target.files?.[0])} disabled={!!watch('imageUrl')}/></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField name="droppedByMemberName" control={form.control} render={({ field }) => (<FormItem><FormLabel>Dropado por (opcional)</FormLabel><FormControl><Input {...field} placeholder="Nome do membro"/></FormControl><FormMessage /></FormItem>)}/>
                    
                    <DialogFooter className="pt-4"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin"/> : "Adicionar Item"}</Button></DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
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
                                <TableCell><Badge variant={auction.status === 'active' ? 'default' : 'outline'} className={auction.status === 'active' ? 'bg-green-600/80' : ''}>{auction.status === 'active' ? 'Aberto' : 'Agendado'}</Badge></TableCell>
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

function AuctionCreationWizard({ isOpen, onOpenChange, guild, guildId, currentUser, bankItems }: { isOpen: boolean, onOpenChange: (open: boolean) => void, guild: Guild, guildId: string | null, currentUser: UserProfile | null, bankItems: BankItem[] }) {
    const { toast } = useToast();
    const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');
    const [selectedItem, setSelectedItem] = useState<BankItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [config, setConfig] = useState({
        startBid: 1,
        minIncrement: 1,
        startTime: new Date(),
        endTime: addHours(new Date(), 24),
    });

    const resetWizard = () => {
        setStep('select');
        setSelectedItem(null);
        setConfig({
            startBid: 1,
            minIncrement: 1,
            startTime: new Date(),
            endTime: addHours(new Date(), 24),
        });
        onOpenChange(false);
    };

    const handleNextStep = () => {
        if (step === 'select' && selectedItem) setStep('details');
        else if (step === 'details') setStep('confirm');
    };

    const handlePrevStep = () => {
        if (step === 'confirm') setStep('details');
        else if (step === 'details') {
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
            case 'details':
                 return (
                    <>
                      <DialogHeader>
                        <DialogTitle>Passo 2: Detalhes do Leilão</DialogTitle>
                        <DialogDescription>Configure lances e duração para o item "{selectedItem?.itemName}".</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div>
                          <Label>Lance inicial (DKP)</Label>
                          <Input type="number" value={config.startBid} onChange={(e) => setConfig((c) => ({ ...c, startBid: Number(e.target.value) }))} min="1"/>
                        </div>
                        <div>
                          <Label>Aumento mínimo por lance (DKP)</Label>
                          <Input type="number" value={config.minIncrement} onChange={(e) => setConfig((c) => ({ ...c, minIncrement: Number(e.target.value) }))} min="1"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                                <Label>Data de Início</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !config.startTime && "text-muted-foreground")}>
                                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                                            {config.startTime ? format(config.startTime, "PPP") : <span>Data de início</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={config.startTime} onSelect={(d) => d && setConfig(c => ({...c, startTime: d}))} initialFocus /></PopoverContent>
                                </Popover>
                           </div>
                           <div>
                                <Label>Data de Fim</Label>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !config.endTime && "text-muted-foreground")}>
                                            <CalendarIconLucide className="mr-2 h-4 w-4" />
                                            {config.endTime ? format(config.endTime, "PPP") : <span>Data de fim</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={config.endTime} onSelect={(d) => d && setConfig(c => ({...c, endTime: d}))} initialFocus /></PopoverContent>
                                </Popover>
                           </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={handlePrevStep}>Voltar</Button>
                        <Button onClick={handleNextStep}>Próximo</Button>
                      </DialogFooter>
                    </>
                  );
            case 'confirm':
                return <>
                    <DialogHeader>
                        <DialogTitle>Passo 3: Confirmar e Criar Leilão</DialogTitle>
                        <DialogDescription>Revise os detalhes abaixo antes de criar o leilão.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3 text-sm">
                        <p><strong>Item:</strong> {selectedItem?.itemName}</p>
                        <p><strong>Lance Inicial:</strong> {config.startBid} DKP</p>
                        <p><strong>Incremento Mínimo:</strong> {config.minIncrement} DKP</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handlePrevStep} disabled={isSubmitting}>Voltar</Button>
                        <Button onClick={handleCreateAuction} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : 'Finalizar e Criar Leilão'}</Button>
                    </DialogFooter>
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
