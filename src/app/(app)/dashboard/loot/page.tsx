
"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc } from '@/lib/firebase';
import type { Guild } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gem, PackagePlus, Axe, Shield as ShieldLucideIcon, Wand2Icon, Bow, Dices, Wrench, Diamond, Sparkles } from 'lucide-react';
import { ComingSoon } from '@/components/shared/ComingSoon';
import { useHeader } from '@/contexts/HeaderContext';
import { cn } from '@/lib/utils';

interface TLItem {
  name: string;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

const TL_SWORD_ITEMS: TLItem[] = [
  { name: 'Sparring Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00001.webp', rarity: 'common' },
  { name: 'Reforged Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00002.webp', rarity: 'common' },
  { name: 'Sharpened Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00003.webp', rarity: 'common' },
  { name: 'Forged Iron Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00004.webp', rarity: 'common' },
  { name: 'Forgotten Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00004.webp', rarity: 'common' },
  { name: 'Manasteel Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00010.webp', rarity: 'uncommon' },
  { name: 'Pathfinder Blade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00007.webp', rarity: 'uncommon' },
  { name: 'Standard Issue Longsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00008.webp', rarity: 'uncommon' },
  { name: 'Arena Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00021.webp', rarity: 'uncommon' },
  { name: 'Sword of Undead Vanquishing', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00011.webp', rarity: 'rare' },
  { name: 'Blade of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00027.webp', rarity: 'rare' },
  { name: 'Sword of Striking', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00028.webp', rarity: 'rare' },
  { name: 'Resonance Blade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00022A.webp', rarity: 'rare' },
  { name: 'Golem Shattering Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00022.webp', rarity: 'rare' },
  { name: 'Hammer Forged Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00022B.webp', rarity: 'rare' },
  { name: 'Resistance Vanguard Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00027A.webp', rarity: 'rare' },
  { name: 'Karnix\'s Netherblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00015.webp', rarity: 'epic' },
  { name: 'Blade of Fiendish Fortitude', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00017.webp', rarity: 'epic' },
  { name: 'Cornelius\'s Animated Edge', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00008A.webp', rarity: 'epic' },
  { name: 'Bulwark of Invulnerability', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00016.webp', rarity: 'epic' },
  { name: 'Ahzreil\'s Siphoning Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00026.webp', rarity: 'epic' },
  { name: 'Nirma\'s Sword of Echoes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00035.webp', rarity: 'epic' },
  { name: 'Crimson Doomblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00038.webp', rarity: 'epic' },
  { name: 'Heroic Blade of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00032.webp', rarity: 'epic' },
  { name: 'Chernobog\'s Blade of Beheading', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00033.webp', rarity: 'epic' },
  { name: 'Queen Bellandir\'s Languishing Blade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00034.webp', rarity: 'epic' },
  { name: 'Daigon\'s Stormblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00017A.webp', rarity: 'epic' },
  { name: 'Unshakeable Knight\'s Sword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00010A.webp', rarity: 'epic' },
  { name: 'Bulwark of the Black Anvil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00049.webp', rarity: 'epic' },
  { name: 'Deluzhnoa\'s Edge of Eternal Frost', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00052.webp', rarity: 'epic' },
];

const WEAPON_ITEMS_MAP: Record<string, TLItem[]> = {
  "Sword": TL_SWORD_ITEMS,
  "Greatsword": [],
  "Dagger": [],
  "Bow": [],
  "Crossbow": [],
  "Wand": [],
  "Staff": [],
  "Spear": [],
};

const itemCategoryOptions = [
  { value: "weapon", label: "Arma" },
  { value: "armor", label: "Armadura" },
  { value: "accessory", label: "Acessório" },
];

const weaponTypeOptions = [
  { value: "Sword", label: "Sword" },
  { value: "Greatsword", label: "Greatsword" },
  { value: "Dagger", label: "Dagger" },
  { value: "Bow", label: "Bow" },
  { value: "Crossbow", label: "Crossbow" },
  { value: "Wand", label: "Wand" },
  { value: "Staff", label: "Staff" },
  { value: "Spear", label: "Spear" },
];

const traitOptions = [
  { value: "Max Health", label: "Max Health" },
  { value: "Hit Chance", label: "Hit Chance" },
  { value: "Heavy Attack Chance", label: "Heavy Attack Chance" },
  { value: "Critical Hit Chance", label: "Critical Hit Chance" },
  { value: "Collision Chance", label: "Collision Chance" },
  { value: "Humanoid Bonus Damage", label: "Humanoid Bonus Damage" },
  { value: "Max Mana", label: "Max Mana" },
  { value: "Undead Bonus Damage", label: "Undead Bonus Damage" },
  { value: "Buff Duration", label: "Buff Duration" },
];

const rarityBackgrounds: Record<TLItem['rarity'], string> = {
  common: 'bg-slate-700',
  uncommon: 'bg-emerald-600',
  rare: 'bg-sky-600',
  epic: 'bg-violet-600',
  legendary: 'bg-amber-500',
};

const lootFormSchema = z.object({
  itemCategory: z.string().min(1, "Categoria é obrigatória."),
  weaponType: z.string().optional(),
  itemName: z.string().optional(),
  trait: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.itemCategory === 'weapon' && !data.weaponType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de arma é obrigatório.", path: ["weaponType"] });
  }
  if (data.itemCategory === 'weapon' && data.weaponType && WEAPON_ITEMS_MAP[data.weaponType]?.length > 0 && !data.itemName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome do item é obrigatório.", path: ["itemName"] });
  }
});

type LootFormValues = z.infer<typeof lootFormSchema>;

function LootPageContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { setHeaderTitle } = useHeader();

  const [guild, setGuild] = useState<Guild | null>(null);
  const [loadingGuildData, setLoadingGuildData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedItemForPreview, setSelectedItemForPreview] = useState<TLItem | null>(null);


  const guildId = searchParams.get('guildId');

  const form = useForm<LootFormValues>({
    resolver: zodResolver(lootFormSchema),
    defaultValues: {
      itemCategory: "",
      weaponType: undefined,
      itemName: undefined,
      trait: undefined,
    },
  });

  const watchedItemCategory = form.watch("itemCategory");
  const watchedWeaponType = form.watch("weaponType");
  const watchedItemName = form.watch("itemName");

  useEffect(() => {
    if (watchedItemCategory !== 'weapon') {
      form.setValue('weaponType', undefined);
      form.setValue('itemName', undefined);
      form.setValue('trait', undefined);
    }
    setSelectedItemForPreview(null);
  }, [watchedItemCategory, form]);

  useEffect(() => {
    if (watchedWeaponType) {
      form.setValue('itemName', undefined);
      form.setValue('trait', undefined); // Reset trait if weapon type changes
    }
    setSelectedItemForPreview(null);
  }, [watchedWeaponType, form]);

  useEffect(() => {
    if (watchedWeaponType && watchedItemName) {
      const items = WEAPON_ITEMS_MAP[watchedWeaponType] || [];
      const item = items.find(i => i.name === watchedItemName);
      setSelectedItemForPreview(item || null);
    } else {
      setSelectedItemForPreview(null);
    }
  }, [watchedWeaponType, watchedItemName]);


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

  const onSubmit: SubmitHandler<LootFormValues> = async (data) => {
    setIsSubmitting(true);
    console.log("Dados do Item:", data);
    // TODO: Implement saving logic to Firestore
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    toast({ title: "Item Registrado (Simulado)", description: `Item ${data.itemName || data.weaponType || data.itemCategory} com trait ${data.trait || 'N/A'} foi registrado.` });
    setIsSubmitting(false);
    setShowAddItemDialog(false);
    form.reset();
    setSelectedItemForPreview(null);
  };

  if (authLoading || loadingGuildData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  if (!guild) {
    return <PageTitle title="Loot" icon={<Gem className="h-8 w-8 text-primary" />}><div className="text-center py-10">Guilda não encontrada.</div></PageTitle>;
  }

  const currentWeaponNameOptions = watchedWeaponType ? WEAPON_ITEMS_MAP[watchedWeaponType] || [] : [];

  return (
    <div className="space-y-8">
      <PageTitle title={`Gerenciamento de Loot de ${guild.name}`} icon={<Gem className="h-8 w-8 text-primary" />} />
      <Tabs defaultValue="banco" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="banco">Banco</TabsTrigger>
          <TabsTrigger value="leiloes">Leilões</TabsTrigger>
          <TabsTrigger value="rolagem">Rolagem</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="banco" className="mt-6">
          <div className="flex justify-end mb-4">
            <Dialog open={showAddItemDialog} onOpenChange={(isOpen) => {
                setShowAddItemDialog(isOpen);
                if (!isOpen) {
                    form.reset();
                    setSelectedItemForPreview(null);
                }
            }}>
              <DialogTrigger asChild>
                <Button className="btn-gradient btn-style-secondary"><PackagePlus className="mr-2 h-5 w-5" />Cadastrar Item no Banco</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-4 shrink-0 border-b border-border">
                  <DialogTitle className="font-headline text-primary">Cadastrar Novo Item no Banco da Guilda</DialogTitle>
                  <DialogDescription>Preencha os detalhes do item a ser adicionado ao banco.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto px-6 py-4 space-y-5">
                    <FormField
                      control={form.control}
                      name="itemCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Item <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione a categoria do item" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {itemCategoryOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {watchedItemCategory === 'weapon' && (
                      <>
                        <FormField
                          control={form.control}
                          name="weaponType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Arma <span className="text-destructive">*</span></FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione o tipo da arma" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {weaponTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="trait"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Trait da Arma</FormLabel>
                               <div className="relative flex items-center">
                                <Sparkles className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl><SelectTrigger className="form-input pl-10"><SelectValue placeholder="Selecione o trait da arma (opcional)" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {traitOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                    
                    {watchedItemCategory === 'weapon' && watchedWeaponType && currentWeaponNameOptions.length > 0 && (
                      <FormField
                        control={form.control}
                        name="itemName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Item ({watchedWeaponType}) <span className="text-destructive">*</span></FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl><SelectTrigger className="form-input"><SelectValue placeholder={`Selecione o nome d${watchedWeaponType && (watchedWeaponType.toLowerCase().endsWith('a') || ['staff', 'spear'].includes(watchedWeaponType.toLowerCase())) ? 'a' : 'o'} ${watchedWeaponType ? watchedWeaponType.toLowerCase() : 'item'}`} /></SelectTrigger></FormControl>
                              <SelectContent>
                                {currentWeaponNameOptions.map(item => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {selectedItemForPreview && (
                      <div className="mt-4 space-y-2">
                        <FormLabel>Prévia do Item</FormLabel>
                        <div className={cn(
                            "w-24 h-24 p-2 rounded-md flex items-center justify-center border border-border",
                            rarityBackgrounds[selectedItemForPreview.rarity] || 'bg-muted'
                          )}
                        >
                          <Image
                            src={selectedItemForPreview.imageUrl}
                            alt={selectedItemForPreview.name}
                            width={80}
                            height={80}
                            className="object-contain"
                            data-ai-hint="game item weapon"
                          />
                        </div>
                      </div>
                    )}
                    
                    <DialogFooter className="p-0 pt-6 sticky bottom-0 bg-card">
                      <Button type="button" variant="outline" onClick={() => setShowAddItemDialog(false)} disabled={isSubmitting}>Cancelar</Button>
                      <Button type="submit" className="btn-gradient btn-style-primary" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                        Registrar Item
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="text-center py-10">
            <p className="text-muted-foreground">Visualização do banco de itens da guilda aparecerá aqui.</p>
          </div>
        </TabsContent>

        <TabsContent value="leiloes" className="mt-6">
          <ComingSoon pageName="Leilões de Itens da Guilda" icon={<Dices className="h-8 w-8 text-primary" />} />
        </TabsContent>
        <TabsContent value="rolagem" className="mt-6">
          <ComingSoon pageName="Sistemas de Rolagem de Loot" icon={<Diamond className="h-8 w-8 text-primary" />} />
        </TabsContent>
        <TabsContent value="configuracoes" className="mt-6">
          <ComingSoon pageName="Configurações do Módulo de Loot" icon={<Wrench className="h-8 w-8 text-primary" />} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LootPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>}>
      <LootPageContent />
    </Suspense>
  );
}
    
