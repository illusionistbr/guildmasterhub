
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query as firestoreQuery, orderBy, where, Timestamp } from '@/lib/firebase';
import type { Guild, GuildMember, UserProfile, BankItem, BankItemStatus } from '@/types/guildmaster';
import { PageTitle } from '@/components/shared/PageTitle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gem, PackagePlus, Axe, Shield as ShieldLucideIcon, Wand2Icon, Bow, Dices, Wrench, Diamond, Sparkles, Package, Tag, CheckSquare, Eye, Users, UserCircle, Shirt, Hand, Footprints, Heart, Search, Filter, Calendar as CalendarIconLucide, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { ComingSoon } from '@/components/shared/ComingSoon';
import { useHeader } from '@/contexts/HeaderContext';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from "react-day-picker";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 15;

interface TLItem {
  name: string;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

const TL_SWORD_ITEMS: TLItem[] = [
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
].filter(item => item.rarity === 'epic');

const TL_GREATSWORD_ITEMS: TLItem[] = [
  { name: 'Immortal Titanic Quakeblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00007.webp', rarity: 'epic' },
  { name: 'Celestial Cyclone Warblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00010.webp', rarity: 'epic' },
  { name: 'Morokai\'s Greatblade of Corruption', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00027.webp', rarity: 'epic' },
  { name: 'Duke Magna\'s Provoking Warblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00022.webp', rarity: 'epic' },
  { name: 'Adentus\'s Gargantuan Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00028.webp', rarity: 'epic' },
  { name: 'Junobote\'s Juggernaut Warblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00039.webp', rarity: 'epic' },
  { name: 'Naru\'s Frenzied Greatblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00034.webp', rarity: 'epic' },
  { name: 'Duke Magna\'s Fury Warblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00031.webp', rarity: 'epic' },
  { name: 'Heroic Broadsword of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00038.webp', rarity: 'epic' },
  { name: 'Greatsword of the Banshee', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00018.webp', rarity: 'epic' },
  { name: 'Tevent\'s Warblade of Despair', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00036.webp', rarity: 'epic' },
  { name: 'Broadsword of the Juggernaught', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00014.webp', rarity: 'epic' },
  { name: 'Greatblade of the Black Anvil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00049.webp', rarity: 'epic' },
  { name: 'Grayeye\'s Bloodlust Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00050.webp', rarity: 'epic' },
  { name: 'Cordy\'s Warblade of Creeping Doom', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00052.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_DAGGER_ITEMS: TLItem[] = [
  { name: 'Lequirus\'s Wicked Thorns', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00014.webp', rarity: 'epic' },
  { name: 'Rex Chimaerus\'s Fangs', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00038.webp', rarity: 'epic' },
  { name: 'Minezerok\'s Daggers of Crippling', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00039.webp', rarity: 'epic' },
  { name: 'Kowazan\'s Twilight Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00037.webp', rarity: 'epic' },
  { name: 'Darkslayer Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00036.webp', rarity: 'epic' },
  { name: 'Heroic Daggers of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00013.webp', rarity: 'epic' },
  { name: 'Tevent\'s Fangs of Fury', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00035.webp', rarity: 'epic' },
  { name: 'Peerless Obsidian Razors', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00027.webp', rarity: 'epic' },
  { name: 'Destiny Binders', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00017.webp', rarity: 'epic' },
  { name: 'Bercant\'s Whispering Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00034.webp', rarity: 'epic' },
  { name: 'Razorthorn Shredders', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00010.webp', rarity: 'epic' },
  { name: 'Blades of the Black Anvil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00049.webp', rarity: 'epic' },
  { name: 'Deluzhnoa\'s Permafrost Razors', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00052.webp', rarity: 'epic' },
  { name: 'Leviathan\'s Bladed Tendrils', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00051.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_BOW_ITEMS: TLItem[] = [
  { name: 'Shaikal\'s Deepmind Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00009.webp', rarity: 'epic' },
  { name: 'Toublek\'s Deathmark Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00033.webp', rarity: 'epic' },
  { name: 'Aelon\'s Rejuvenating Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00034.webp', rarity: 'epic' },
  { name: 'Karnix\'s Netherbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00032.webp', rarity: 'epic' },
  { name: 'Heroic Longbow of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00030.webp', rarity: 'epic' },
  { name: 'Tevent\'s Arc of Wailing Death', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00018.webp', rarity: 'epic' },
  { name: 'Longbow of the World Tree', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00020.webp', rarity: 'epic' },
  { name: 'Titanspine Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00011.webp', rarity: 'epic' },
  { name: 'Arc of Lunar Radiance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00007A.webp', rarity: 'epic' },
  { name: 'Bercant\'s Steelstring Bow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00028.webp', rarity: 'epic' },
  { name: 'Deluzhnoa\'s Arc of Frozen Death', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00017.webp', rarity: 'epic' },
  { name: 'Mystic Truestrike Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00010.webp', rarity: 'epic' },
  { name: 'Longbow of the Black Anvil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00049.webp', rarity: 'epic' },
  { name: 'Leviathan\'s Bloodstorm Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00051.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_CROSSBOW_ITEMS: TLItem[] = [
  { name: 'Rex Chimaerus\'s Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00007C.webp', rarity: 'epic' },
  { name: 'Kowazan\'s Sunflare Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00035.webp', rarity: 'epic' },
  { name: 'Malakar\'s Energizing Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00034.webp', rarity: 'epic' },
  { name: 'Crossbows of Infinite Steel', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00028.webp', rarity: 'epic' },
  { name: 'Stormbringer Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00017.webp', rarity: 'epic' },
  { name: 'Heroic Crossbows of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00022.webp', rarity: 'epic' },
  { name: 'Queen Bellandir\'s Toxic Spine Throwers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00033.webp', rarity: 'epic' },
  { name: 'Crossbows of the Darkest Night', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00023.webp', rarity: 'epic' },
  { name: 'Unrelenting Annihilation Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00020.webp', rarity: 'epic' },
  { name: 'Akman\'s Bloodletting Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00031.webp', rarity: 'epic' },
  { name: 'Cordy\'s Stormspore Spike Slingers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00030.webp', rarity: 'epic' },
  { name: 'Moonlight Echo Repeaters', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00018.webp', rarity: 'epic' },
  { name: 'Crossbows of the Black Anvil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00049.webp', rarity: 'epic' },
  { name: 'Bercant\'s Spineflower Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00050.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_WAND_ITEMS: TLItem[] = [
  { name: 'Excavator\'s Mysterious Scepter', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00012.webp', rarity: 'epic' },
  { name: 'Heroic Scepter of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00004C.webp', rarity: 'epic' },
  { name: 'Lequirus\'s Coveted Tome', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00013.webp', rarity: 'epic' },
  { name: 'Sacred Manuscript', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00001C.webp', rarity: 'epic' },
  { name: 'Shaikal\'s Mindfire Scepter', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00014.webp', rarity: 'epic' },
  { name: 'Tevent\'s Grasp of Withering', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00011.webp', rarity: 'epic' },
  { name: 'Tome of Proximate Remedy', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00008A.webp', rarity: 'epic' },
  { name: 'Codex of Deep Secrets', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00002B.webp', rarity: 'epic' },
  { name: 'Cordy\'s Grasp of Manipulation', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00015.webp', rarity: 'epic' },
  { name: 'Deckman\'s Balefire Scepter', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00003C.webp', rarity: 'epic' },
  { name: 'Forbidden Demonic Lexicon', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00008B.webp', rarity: 'epic' },
  { name: 'Khanzaizin\'s Valorous Wand', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00017.webp', rarity: 'epic' },
  { name: 'Overture of Eternal Salvation', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00006A.webp', rarity: 'epic' },
  { name: 'Rod of the Black Anvil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00049.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_STAFF_ITEMS: TLItem[] = [
  { name: 'Aridus\'s Gnarled Voidstaff', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00033.webp', rarity: 'epic' },
  { name: 'Heroic Staff of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00016.webp', rarity: 'epic' },
  { name: 'Queen Bellandir\'s Hivemind Staff', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00019.webp', rarity: 'epic' },
  { name: 'Staff of Lucid Light', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00028.webp', rarity: 'epic' },
  { name: 'Staff of the Umbramancer', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00027.webp', rarity: 'epic' },
  { name: 'Talus\'s Crystalline Staff', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00032.webp', rarity: 'epic' },
  { name: 'Toublek\'s Shattering Quarterstaff', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00014.webp', rarity: 'epic' },
  { name: 'Abyssal Renaissance Foci', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00009.webp', rarity: 'epic' },
  { name: 'Archstaff of the Black Anvil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00049.webp', rarity: 'epic' },
  { name: 'Daigon\'s Charred Emberstaff', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_staff_00036.webp', rarity: 'epic' },
  { name: 'Deluzhnoa\'s Ancient Petrified Staff', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00018A.webp', rarity: 'epic' },
  { name: 'Ebon Soulwind Archstaff', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00010.webp', rarity: 'epic' },
  { name: 'Grayeye\'s Electrified Staff', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00017A.webp', rarity: 'epic' },
  { name: 'Staff of Enlightened Reform', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00031.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_SPEAR_ITEMS: TLItem[] = [
  { name: 'Skull Severing Spear', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00019.webp', rarity: 'epic' },
  { name: 'Junobote\'s Smoldering Ranseur', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00021.webp', rarity: 'epic' },
  { name: 'Shaikal\'s Mindveil Harpoon', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00016.webp', rarity: 'epic' },
  { name: 'Queen Bellandir\'s Serrated Spike', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00018.webp', rarity: 'epic' },
  { name: 'Heroic Polearm of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00015.webp', rarity: 'epic' },
  { name: 'Ranseur of Murderous Glee', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00013.webp', rarity: 'epic' },
  { name: 'Naru\'s Sawfang Spear', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00030.webp', rarity: 'epic' },
  { name: 'Spear of Unhinged Horror', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00029.webp', rarity: 'epic' },
  { name: 'Crimson Hellskewer', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00027.webp', rarity: 'epic' },
  { name: 'Deluzhnoa\'s Serrated Shard', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00026.webp', rarity: 'epic' },
  { name: 'Polearm of the Black Anvil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00022.webp', rarity: 'epic' },
  { name: 'Windsheer Spear', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00024.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_HEAD_ARMOR_ITEMS: TLItem[] = [
  { name: 'Shock Commander Visor', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_05002.webp', rarity: 'epic' },
  { name: 'Heroic Helmet of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_06002.webp', rarity: 'epic' },
  { name: 'Blessed Templar Helmet', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_HM_00016.webp', rarity: 'epic' },
  { name: 'Helm of the Field General', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_00018.webp', rarity: 'epic' },
  { name: 'Visor of the Infernal Herald', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_HM_00019.webp', rarity: 'epic' },
  { name: 'Phantom Wolf Mask', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00005.webp', rarity: 'epic' },
  { name: 'Heroic Hood of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00014.webp', rarity: 'epic' },
  { name: 'Heroic Tricorne of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_05003.webp', rarity: 'epic' },
  { name: 'Shadow Harvester Mask', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00008.webp', rarity: 'epic' },
  { name: 'Visage of the Executioner', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00006.webp', rarity: 'epic' },
  { name: 'Swirling Essence Hat', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_05001.webp', rarity: 'epic' },
  { name: 'Heroic Hat of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00005A.webp', rarity: 'epic' },
  { name: 'Ascended Guardian Hood', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_00011A.webp', rarity: 'epic' },
  { name: 'Arcane Shadow Hat', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_00022.webp', rarity: 'epic' },
  { name: 'Divine Justiciar Mask', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_06001.webp', rarity: 'epic' },
  { name: 'Gilded Raven Mask', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_00012A.webp', rarity: 'epic' },
  { name: 'Oblivion\'s Wrath Barbute', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_00016.webp', rarity: 'epic' },
  { name: 'Void Stalker\'s Mask', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00007.webp', rarity: 'epic' },
  { name: 'Transcendent Tempest\'s Cowl', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_00014.webp', rarity: 'epic' },
  { name: 'Crown of Icebound Infinity', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00010.webp', rarity: 'epic' },
  { name: 'Ardent Herald\'s Crown', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00001.webp', rarity: 'epic' },
  { name: 'Immortal Legionnaire\'s Helm', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_00019A.webp', rarity: 'epic' },
  { name: 'First Light\'s Halo', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00006A.webp', rarity: 'epic' },
  { name: 'Chosen Vanquisher\'s Visage', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_06001A.webp', rarity: 'epic' },
  { name: 'Royal Praetor\'s Visor', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_HM_00017.webp', rarity: 'epic' },
  { name: 'Forgotten Lotus Mask', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_00008.webp', rarity: 'epic' },
  { name: 'Dread Admiral\'s Bicorne', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_00021.webp', rarity: 'epic' },
  { name: 'Sacred Repose Circle', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00015.webp', rarity: 'epic' },
  { name: 'Eternal Warlord\'s Faceguard', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00012A.webp', rarity: 'epic' },
  { name: 'Spectral Overseer\'s Mask', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00016.webp', rarity: 'epic' },
  { name: 'Imperial Seeker\'s Circlet', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00003.webp', rarity: 'epic' },
  { name: 'Feral Prophet\'s Crown', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00002.webp', rarity: 'epic' },
  { name: 'Visage of the Infernal Tyrant', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_HM_00026.webp', rarity: 'epic' },
  { name: 'Crowned Skull of Victory', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00026.webp', rarity: 'epic' },
  { name: 'Paramount Visor of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_06002A.webp', rarity: 'epic' },
  { name: 'Ossuary Hood of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00014A.webp', rarity: 'epic' },
  { name: 'Scaled Tricorne of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_05003A.webp', rarity: 'epic' },
  { name: 'Hallowed Hat of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00005B.webp', rarity: 'epic' },
  { name: 'Auric Vanguard\'s Barbute', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_HM_00014A.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_CHEST_ARMOR_ITEMS: TLItem[] = [
  { name: 'Shock Commander Plate Armor', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_05002.webp', rarity: 'epic' },
  { name: 'Blessed Templar Plate Mail', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_TS_00015.webp', rarity: 'epic' },
  { name: 'Heroic Armor of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_06002.webp', rarity: 'epic' },
  { name: 'Plate of the Field General', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00018.webp', rarity: 'epic' },
  { name: 'Plate of the Infernal Herald', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_TS_00019.webp', rarity: 'epic' },
  { name: 'Phantom Wolf Tunic', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_TS_00010.webp', rarity: 'epic' },
  { name: 'Heroic Tunic of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_05003.webp', rarity: 'epic' },
  { name: 'Shadow Harvester Tunic', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_TS_00013.webp', rarity: 'epic' },
  { name: 'Heroic Garb of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_05002.webp', rarity: 'epic' },
  { name: 'Coat of the Executioner', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00022.webp', rarity: 'epic' },
  { name: 'Swirling Essence Robe', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_05001.webp', rarity: 'epic' },
  { name: 'Ascended Guardian Raiment', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00010.webp', rarity: 'epic' },
  { name: 'Heroic Robes of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00005.webp', rarity: 'epic' },
  { name: 'Arcane Shadow Robes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00023.webp', rarity: 'epic' },
  { name: 'Divine Justiciar Attire', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_06001.webp', rarity: 'epic' },
  { name: 'Gilded Raven Tunic', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_TS_00014A.webp', rarity: 'epic' },
  { name: 'Kingslayer\'s Banded Platemail', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00014A.webp', rarity: 'epic' },
  { name: 'Oblivion\'s Wrath Chest Plate', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00016.webp', rarity: 'epic' },
  { name: 'Void Stalker\'s Overcoat', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_TS_00015A.webp', rarity: 'epic' },
  { name: 'Transcendent Tempest\'s Armor', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00014.webp', rarity: 'epic' },
  { name: 'Ardent Herald\'s Gown', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00011.webp', rarity: 'epic' },
  { name: 'Immortal Legionnaire\'s Armor', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00019A.webp', rarity: 'epic' },
  { name: 'First Light\'s Tunic', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00022A.webp', rarity: 'epic' },
  { name: 'Chosen Vanquisher\'s Armor', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_06001A.webp', rarity: 'epic' },
  { name: 'Royal Praetor\'s Plate Armor', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_TS_00011.webp', rarity: 'epic' },
  { name: 'Forgotten Lotus Garb', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_00008.webp', rarity: 'epic' },
  { name: 'Dread Admiral\'s Uniform', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_00021.webp', rarity: 'epic' },
  { name: 'Sacred Repose Garb', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00004.webp', rarity: 'epic' },
  { name: 'Eternal Warlord\'s Plate', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00017.webp', rarity: 'epic' },
  { name: 'Spectral Overseer\'s Tunic', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_00023.webp', rarity: 'epic' },
  { name: 'Imperial Seeker\'s Tunic', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_00015.webp', rarity: 'epic' },
  { name: 'Feral Prophet\'s Overcoat', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00008.webp', rarity: 'epic' },
  { name: 'Golden Blossom Regalia', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00026.webp', rarity: 'epic' },
  { name: 'Paramount Full Plate of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_06002A.webp', rarity: 'epic' },
  { name: 'Scaled Armor of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_05003A.webp', rarity: 'epic' },
  { name: 'Ossuary Tunic of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_05002A.webp', rarity: 'epic' },
  { name: 'Hallowed Robes of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00005A.webp', rarity: 'epic' },
  { name: 'Auric Vanguard\'s Full Plate', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00005A.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_CLOAK_ITEMS: TLItem[] = [
  { name: 'Eldritch Whispers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00008.webp', rarity: 'epic' },
  { name: 'Bile Drenched Veil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00013.webp', rarity: 'epic' },
  { name: 'Relentless Assault', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00014.webp', rarity: 'epic' },
  { name: 'Blessed Templar Cloak', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00019.webp', rarity: 'epic' },
  { name: 'Forsaken Embrace', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00017.webp', rarity: 'epic' },
  { name: 'Supreme Devotion', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00018.webp', rarity: 'epic' },
  { name: 'Ancient Tapestry Mantle', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00016.webp', rarity: 'epic' },
  { name: 'Immortal Reckoning', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00020.webp', rarity: 'epic' },
  { name: 'Howling Wind Shroud', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00003.webp', rarity: 'epic' },
  { name: 'Cloak of Victorious Destiny', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00002.webp', rarity: 'epic' },
  { name: 'Steadfast Commander\'s Cape', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00015.webp', rarity: 'epic' },
  { name: 'Royal Spineflower Drape', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00021.webp', rarity: 'epic' },
  { name: 'Forward General\'s Cloak', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00026.webp', rarity: 'epic' },
  { name: 'Starlight Fur Cloak', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00027.webp', rarity: 'epic' },
  { name: 'Grieving Vengeance Cloak', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00024.webp', rarity: 'epic' },
  { name: 'Opulent Noble\'s Mantle', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00023.webp', rarity: 'epic' },
  { name: 'Cloak of the Frozen Expanse', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00025.webp', rarity: 'epic' },
  { name: 'Emperor\'s Golden Wing', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00033.webp', rarity: 'epic' },
  { name: 'Iron Lord\'s Veil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00034.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_GLOVES_ITEMS: TLItem[] = [
  { name: 'Shock Commander Gauntlets', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_05002.webp', rarity: 'epic' },
  { name: 'Ebon Roar Gauntlets', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_05001.webp', rarity: 'epic' },
  { name: 'Heroic Gauntlets of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_06002.webp', rarity: 'epic' },
  { name: 'Gauntlets of the Field General', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_00018.webp', rarity: 'epic' },
  { name: 'Gauntlets of the Infernal Herald', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_GL_00019.webp', rarity: 'epic' },
  { name: 'Phantom Wolf Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_GL_00001B.webp', rarity: 'epic' },
  { name: 'Heroic Grips of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_05002.webp', rarity: 'epic' },
  { name: 'Shadow Harvester Grips', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00017A.webp', rarity: 'epic' },
  { name: 'Heroic Gloves of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_05003.webp', rarity: 'epic' },
  { name: 'Grip of the Executioner', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_GL_00004.webp', rarity: 'epic' },
  { name: 'Swirling Essence Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00020.webp', rarity: 'epic' },
  { name: 'Ascended Guardian Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00011.webp', rarity: 'epic' },
  { name: 'Heroic Mitts of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00010.webp', rarity: 'epic' },
  { name: 'Arcane Shadow Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00005B.webp', rarity: 'epic' },
  { name: 'Divine Justiciar Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_06001.webp', rarity: 'epic' },
  { name: 'Gilded Raven Grips', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00022B.webp', rarity: 'epic' },
  { name: 'Oblivion\'s Wrath Gauntlets', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_05004.webp', rarity: 'epic' },
  { name: 'Void Stalker\'s Caress', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00023.webp', rarity: 'epic' },
  { name: 'Transcendent Tempest\'s Touch', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00014.webp', rarity: 'epic' },
  { name: 'Ardent Herald\'s Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00022.webp', rarity: 'epic' },
  { name: 'Immortal Legionnaire\'s Gauntlets', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_00019A.webp', rarity: 'epic' },
  { name: 'First Light\'s Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00022A.webp', rarity: 'epic' },
  { name: 'Chosen Vanquisher\'s Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_06001A.webp', rarity: 'epic' },
  { name: 'Royal Praetor\'s Gauntlets', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_GL_00006.webp', rarity: 'epic' },
  { name: 'Forgotten Lotus Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00008.webp', rarity: 'epic' },
  { name: 'Dread Admiral\'s Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00021.webp', rarity: 'epic' },
  { name: 'Sacred Repose Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_GL_00005B.webp', rarity: 'epic' },
  { name: 'Eternal Warlord\'s Gauntlets', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_00017.webp', rarity: 'epic' },
  { name: 'Spectral Overseer\'s Handguards', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00023.webp', rarity: 'epic' },
  { name: 'Imperial Seeker\'s Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00015.webp', rarity: 'epic' },
  { name: 'Feral Prophet\'s Gloves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00014.webp', rarity: 'epic' },
  { name: 'Infernal Demonpact Grasp', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_GL_00026.webp', rarity: 'epic' },
  { name: 'Deep Fathom Grasp', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_GL_00026.webp', rarity: 'epic' },
  { name: 'Devious Hellfire Grips', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_GL_00026.webp', rarity: 'epic' },
  { name: 'Paramount Gauntlets of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_06002A.webp', rarity: 'epic' },
  { name: 'Ossuary Gloves of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_05002B.webp', rarity: 'epic' },
  { name: 'Scaled Gloves of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_05003A.webp', rarity: 'epic' },
  { name: 'Hallowed Gloves of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00010A.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_FEET_ARMOR_ITEMS: TLItem[] = [
  { name: 'Shock Commander Sabatons', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_05002.webp', rarity: 'epic' },
  { name: 'Ebon Roar Sabatons', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00017.webp', rarity: 'epic' },
  { name: 'Heroic Sabatons of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_06002.webp', rarity: 'epic' },
  { name: 'Sabatons of the Field General', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00018.webp', rarity: 'epic' },
  { name: 'Boots of the Infernal Herald', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_BT_00019.webp', rarity: 'epic' },
  { name: 'Phantom Wolf Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_BT_00005.webp', rarity: 'epic' },
  { name: 'Heroic Footguards of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_05002.webp', rarity: 'epic' },
  { name: 'Shadow Harvester Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_BT_00002.webp', rarity: 'epic' },
  { name: 'Heroic Boots of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_05003.webp', rarity: 'epic' },
  { name: 'Boots of the Executioner', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00022.webp', rarity: 'epic' },
  { name: 'Swirling Essence Shoes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00008C.webp', rarity: 'epic' },
  { name: 'Ascended Guardian Shoes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00011.webp', rarity: 'epic' },
  { name: 'Heroic Shoes of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00010.webp', rarity: 'epic' },
  { name: 'Arcane Shadow Shoes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_06001.webp', rarity: 'epic' },
  { name: 'Divine Justiciar Shoes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00014A.webp', rarity: 'epic' },
  { name: 'Gilded Raven Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_00022A.webp', rarity: 'epic' },
  { name: 'Oblivion\'s Wrath Stompers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00016.webp', rarity: 'epic' },
  { name: 'Void Stalker\'s Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00023.webp', rarity: 'epic' },
  { name: 'Transcendent Tempest\'s Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00014.webp', rarity: 'epic' },
  { name: 'Ardent Herald\'s Shoes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00012.webp', rarity: 'epic' },
  { name: 'Immortal Legionnaire\'s Sabatons', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00019A.webp', rarity: 'epic' },
  { name: 'First Light\'s Shoes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00022A.webp', rarity: 'epic' },
  { name: 'Chosen Vanquisher\'s Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_06001A.webp', rarity: 'epic' },
  { name: 'Royal Praetor\'s Sabatons', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00009.webp', rarity: 'epic' },
  { name: 'Forgotten Lotus Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_BT_00008.webp', rarity: 'epic' },
  { name: 'Dread Admiral\'s Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_00021.webp', rarity: 'epic' },
  { name: 'Sacred Repose Shoes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00020.webp', rarity: 'epic' },
  { name: 'Eternal Warlord\'s Sabatons', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_BT_00003.webp', rarity: 'epic' },
  { name: 'Spectral Overseer\'s Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_00023.webp', rarity: 'epic' },
  { name: 'Imperial Seeker\'s Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_00017.webp', rarity: 'epic' },
  { name: 'Feral Prophet\'s Shoes', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00008A.webp', rarity: 'epic' },
  { name: 'Infernal Demonpact Steps', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_BT_00026.webp', rarity: 'epic' },
  { name: 'Deep Fathom Kicks', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_BT_00026.webp', rarity: 'epic' },
  { name: 'Violent Demonic Beast\'s Fur Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_BT_00026.webp', rarity: 'epic' },
  { name: 'Paramount Sabatons of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_06002A.webp', rarity: 'epic' },
  { name: 'Ossuary Boots of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_05002B.webp', rarity: 'epic' },
  { name: 'Scaled Boots of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_05003A.webp', rarity: 'epic' },
  { name: 'Hallowed Shoes of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00010A.webp', rarity: 'epic' },
  { name: 'Auric Vanguards Plate Boots', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00005A.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_LEGS_ARMOR_ITEMS: TLItem[] = [
  { name: 'Shock Commander Greaves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_05002.webp', rarity: 'epic' },
  { name: 'Ebon Roar Greaves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00017.webp', rarity: 'epic' },
  { name: 'Heroic Greaves of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_06002.webp', rarity: 'epic' },
  { name: 'Greaves of the Field General', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00018.webp', rarity: 'epic' },
  { name: 'Greaves of the Infernal Herald', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_PT_00019.webp', rarity: 'epic' },
  { name: 'Phantom Wolf Breeches', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_05002.webp', rarity: 'epic' },
  { name: 'Heroic Trousers of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_05003.webp', rarity: 'epic' },
  { name: 'Shadow Harvester Trousers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00007.webp', rarity: 'epic' },
  { name: 'Heroic Breeches of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00004A.webp', rarity: 'epic' },
  { name: 'Breeches of the Executioner', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00022A.webp', rarity: 'epic' },
  { name: 'Swirling Essence Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_PT_00003.webp', rarity: 'epic' },
  { name: 'Ascended Guardian Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00005B.webp', rarity: 'epic' },
  { name: 'Heroic Pants of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_06001.webp', rarity: 'epic' },
  { name: 'Arcane Shadow Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00023.webp', rarity: 'epic' },
  { name: 'Divine Justiciar Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00022.webp', rarity: 'epic' },
  { name: 'Gilded Raven Trousers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00022B.webp', rarity: 'epic' },
  { name: 'Oblivion\'s Wrath Leggings', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00016.webp', rarity: 'epic' },
  { name: 'Void Stalker\'s Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00001D.webp', rarity: 'epic' },
  { name: 'Transcendent Tempest\'s Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00014.webp', rarity: 'epic' },
  { name: 'Ardent Herald\'s Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00004A.webp', rarity: 'epic' },
  { name: 'Immortal Legionnaire\'s Greaves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00019A.webp', rarity: 'epic' },
  { name: 'First Light\'s Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00022A.webp', rarity: 'epic' },
  { name: 'Chosen Vanquisher\'s Trousers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_06001A.webp', rarity: 'epic' },
  { name: 'Royal Praetor\'s Gaiters', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00006A.webp', rarity: 'epic' },
  { name: 'Forgotten Lotus Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00008.webp', rarity: 'epic' },
  { name: 'Dread Admiral\'s Trousers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00021.webp', rarity: 'epic' },
  { name: 'Sacred Repose Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00020.webp', rarity: 'epic' },
  { name: 'Eternal Warlord\'s Greaves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00010.webp', rarity: 'epic' },
  { name: 'Spectral Overseer\'s Trousers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00023.webp', rarity: 'epic' },
  { name: 'Imperial Seeker\'s Trousers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00005.webp', rarity: 'epic' },
  { name: 'Feral Prophet\'s Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00014.webp', rarity: 'epic' },
  { name: 'Pristine Primalfang Pants', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00026.webp', rarity: 'epic' },
  { name: 'Trophy Adorned Leg Guards', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_PT_00026.webp', rarity: 'epic' },
  { name: 'Effortless Victory Greaves', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_PT_00026.webp', rarity: 'epic' },
  { name: 'Paramount Greaves of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_06002A.webp', rarity: 'epic' },
  { name: 'Scaled Trousers of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_05003A.webp', rarity: 'epic' },
  { name: 'Ossuary Trousers of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00004B.webp', rarity: 'epic' },
  { name: 'Hallowed Pants of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_06001A.webp', rarity: 'epic' },
  { name: 'Auric Vanguard\'s Gaiters', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_05004A.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_NECKLACE_ITEMS: TLItem[] = [
  { name: 'Slayer\'s Quicksilver Pendant', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00002.webp', rarity: 'epic'},
  { name: 'Bindings of the Unstoppable', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00008.webp', rarity: 'epic'},
  { name: 'Thunderstorm Necklace', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00023.webp', rarity: 'epic'},
  { name: 'Abyssal Grace Pendant', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00015.webp', rarity: 'epic'},
  { name: 'Blessed Templar Choker', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00003.webp', rarity: 'epic'},
  { name: 'Collar of Decimation', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00001.webp', rarity: 'epic'},
  { name: 'Wrapped Coin Necklace', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00006.webp', rarity: 'epic'},
  { name: 'Clasp of the Overlord', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00019.webp', rarity: 'epic'},
  { name: 'Clasp of the Conqueror', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00017.webp', rarity: 'epic'},
  { name: 'Icy Necklace of Strength', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00015.webp', rarity: 'epic'},
  { name: 'Icy Necklace of Dexterity', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00011.webp', rarity: 'epic'},
  { name: 'Icy Necklace of Wisdom', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00014.webp', rarity: 'epic'},
  { name: 'Icy Necklace of Perception', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00010.webp', rarity: 'epic'},
  { name: 'Noble Birthright Brooch', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00035.webp', rarity: 'epic'},
  { name: 'Collar of Nature\'s Wrath', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00036.webp', rarity: 'epic'},
  { name: 'Deep Draconic Gorget', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00041.webp', rarity: 'epic'},
  { name: 'Death Knell Gorget', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00040.webp', rarity: 'epic'},
  { name: 'Primal Ritual Collar', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00042.webp', rarity: 'epic'},
  { name: 'Pendant of Barbaric Rage', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00043.webp', rarity: 'epic'},
  { name: 'Pendant of Frozen Tears', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00044.webp', rarity: 'epic'},
  { name: 'Pendant of Eternal Flames', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00045.webp', rarity: 'epic'},
  { name: 'Lunar Conjunction Necklace', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00046.webp', rarity: 'epic'},
].filter(item => item.rarity === 'epic');

const TL_BRACELET_ITEMS: TLItem[] = [
  { name: 'Bracers of Unrelenting', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00004.webp', rarity: 'epic' },
  { name: 'Ascended Guardian Bracelet', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00003.webp', rarity: 'epic' },
  { name: 'Eternal Champion Bindings', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00001.webp', rarity: 'epic' },
  { name: 'Abyssal Grace Charm', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00018.webp', rarity: 'epic' },
  { name: 'Forged Golden Bangle', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00013.webp', rarity: 'epic' },
  { name: 'Ancient Saurodoma Bracers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00010.webp', rarity: 'epic' },
  { name: 'Gilded Infernal Wristlet', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00008.webp', rarity: 'epic' },
  { name: 'Bracers of the Primal King', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00023.webp', rarity: 'epic' },
  { name: 'Skillful Shock Bracelet', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00002A.webp', rarity: 'epic' },
  { name: 'Skillful Corrupted Bracelet', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00004A.webp', rarity: 'epic' },
  { name: 'Skillful Oppress Bracelet', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00007A.webp', rarity: 'epic' },
  { name: 'Skillful Charging Bracelet', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00010A.webp', rarity: 'epic' },
  { name: 'Skillful Silence Bracelet', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00011A.webp', rarity: 'epic' },
  { name: 'Restraints of the Glacial Queen', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00035.webp', rarity: 'epic' },
  { name: 'Bangle of the Clearest Night', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00034.webp', rarity: 'epic' },
  { name: 'Coil of the Verdant Sovereign', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00033.webp', rarity: 'epic' },
  { name: 'Infernal Demonpact Cuffs', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00040.webp', rarity: 'epic' },
  { name: 'Primal Golden Cuffs', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00042.webp', rarity: 'epic' },
  { name: 'Bracelet of the Violent Undertow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00041.webp', rarity: 'epic' },
  { name: 'Barbed Cuffs of the Tormentor', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00043.webp', rarity: 'epic' },
  { name: 'Bracelet of Agony', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00044.webp', rarity: 'epic' },
  { name: 'Bracelet of Fractured Worlds', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00045.webp', rarity: 'epic' },
  { name: 'Twisted Coil of the Enduring', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00046.webp', rarity: 'epic' },
].filter(item => item.rarity === 'epic');

const TL_RING_ITEMS: TLItem[] = [
  { name: "Dark Seraph Ring", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00021.webp', rarity: 'epic'},
  { name: "Band of the Chosen One", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00024.webp', rarity: 'epic'},
  { name: "Band of the Silent One", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00002.webp', rarity: 'epic'},
  { name: "Abyssal Grace Band", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00018.webp', rarity: 'epic'},
  { name: "Embossed Granite Band", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00014.webp', rarity: 'epic'},
  { name: "Eldritch Ice Band", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00004.webp', rarity: 'epic'},
  { name: "Band of Universal Power", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00005.webp', rarity: 'epic'},
  { name: "Etched Alabaster Band", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00003.webp', rarity: 'epic'},
  { name: "Amber Dimensional Band", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00032.webp', rarity: 'epic'},
  { name: "Sapphire Dimensional Band", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00033.webp', rarity: 'epic'},
  { name: "Solitare of Purity", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00020.webp', rarity: 'epic'},
  { name: "Honor's Promise Signet", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00038.webp', rarity: 'epic'},
  { name: "Ring of Eternal Flames", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00039.webp', rarity: 'epic'},
  { name: "Ring of Celestial Light", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00043.webp', rarity: 'epic'},
  { name: "Symbol of Nature's Advance", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00044.webp', rarity: 'epic'},
  { name: "Signet of the Treant Lord", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00034.webp', rarity: 'epic'},
  { name: "Sinking Sun Signet", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00040.webp', rarity: 'epic'},
  { name: "Band of Ancestor's Blood", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00041.webp', rarity: 'epic'},
  { name: "Runed Band of the Black Anvil", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00042.webp', rarity: 'epic'},
  { name: "Signet of the First Snow", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00036.webp', rarity: 'epic'},
  { name: "Ring of Spirited Desire", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00045.webp', rarity: 'epic'},
  { name: "Band of the Resistance Leader", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00046.webp', rarity: 'epic'},
  { name: "Astral Bond", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00047.webp', rarity: 'epic'},
  { name: "Distant Echoes Band", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00048.webp', rarity: 'epic'},
  { name: "Ring of Stalwart Determination", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00049.webp', rarity: 'epic'},
  { name: "Coil of Endless Hunger", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00050.webp', rarity: 'epic'},
  { name: "Ring of Song of Punishment", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00051.webp', rarity: 'epic'},
  { name: "Ring of Divine Instruction", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00052.webp', rarity: 'epic'},
].filter(item => item.rarity === 'epic');

const TL_BELT_ITEMS: TLItem[] = [
  { name: 'Forbidden Eternal Chain', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00013.webp', rarity: 'epic'},
  { name: 'Forbidden Arcane Chain', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00014.webp', rarity: 'epic'},
  { name: 'Forbidden Sacred Chain', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00015.webp', rarity: 'epic'},
  { name: 'Demonic Beast King\'s Belt', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00018.webp', rarity: 'epic'},
  { name: 'Flamewrought Bindings', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00019.webp', rarity: 'epic'},
  { name: 'Girdle of Spectral Skulls', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00021.webp', rarity: 'epic'},
  { name: 'Belt of Bloodlust', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00022.webp', rarity: 'epic'},
  { name: 'Butcher\'s Belt', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00031.webp', rarity: 'epic'},
  { name: 'Girdle of Treant Strength', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00030.webp', rarity: 'epic'},
  { name: 'Elusive Nymph Coil', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00036.webp', rarity: 'epic'},
  { name: 'Burnt Silk Warsash', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00037.webp', rarity: 'epic'},
  { name: 'Hero\'s Legacy Warbelt', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00041.webp', rarity: 'epic'},
  { name: 'Cunning Ogre Girdle', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00040.webp', rarity: 'epic'},
  { name: 'Belt of Claimed Trophies', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00043.webp', rarity: 'epic'},
  { name: 'Undisputed Champion\'s Belt', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00044.webp', rarity: 'epic'},
  { name: 'Entranced Apostle\'s Belt', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00045.webp', rarity: 'epic'},
  { name: 'Belt of the Knight Master', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00046.webp', rarity: 'epic'},
].filter(item => item.rarity === 'epic');

const TL_EARRING_ITEMS: TLItem[] = [
  { name: "Gilded Granite Teardrops", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00001.webp', rarity: 'epic'},
  { name: "Bloodbright Earrings", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00004.webp', rarity: 'epic'},
  { name: "Earrings of Primal Foresight", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00002.webp', rarity: 'epic'},
  { name: "Earrings of Glimmering Dew", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00003.webp', rarity: 'epic'},
  { name: "Earrings of Forlorn Elegance", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00051.webp', rarity: 'epic'},
  { name: "Brilliant Regal Earrings", imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00052.webp', rarity: 'epic'},
].filter(item => item.rarity === 'epic');


const WEAPON_ITEMS_MAP: Record<string, TLItem[]> = {
  "Sword": TL_SWORD_ITEMS,
  "Greatsword": TL_GREATSWORD_ITEMS,
  "Dagger": TL_DAGGER_ITEMS,
  "Bow": TL_BOW_ITEMS,
  "Crossbow": TL_CROSSBOW_ITEMS,
  "Wand": TL_WAND_ITEMS,
  "Staff": TL_STAFF_ITEMS,
  "Spear": TL_SPEAR_ITEMS,
};

const ARMOR_ITEMS_MAP: Record<string, TLItem[]> = {
  "Head": TL_HEAD_ARMOR_ITEMS,
  "Chest": TL_CHEST_ARMOR_ITEMS,
  "Cloak": TL_CLOAK_ITEMS,
  "Gloves": TL_GLOVES_ITEMS,
  "Feet": TL_FEET_ARMOR_ITEMS,
  "Legs": TL_LEGS_ARMOR_ITEMS,
};

const ACCESSORY_ITEMS_MAP: Record<string, TLItem[]> = {
  "Necklace": TL_NECKLACE_ITEMS,
  "Bracelet": TL_BRACELET_ITEMS,
  "Ring": TL_RING_ITEMS,
  "Belt": TL_BELT_ITEMS,
  "Earrings": TL_EARRING_ITEMS,
};

const itemCategoryOptions = [
  { value: "weapon", label: "Arma", icon: Axe },
  { value: "armor", label: "Armadura", icon: Shirt },
  { value: "accessory", label: "Acessório", icon: Diamond },
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

const armorTypeOptions = [
  { value: "Head", label: "Cabeça" },
  { value: "Chest", label: "Peitoral" },
  { value: "Cloak", label: "Manto" },
  { value: "Gloves", label: "Luvas" },
  { value: "Feet", label: "Pés" },
  { value: "Legs", label: "Calças" },
];

const accessoryTypeOptions = [
  { value: "Necklace", label: "Colar" },
  { value: "Bracelet", label: "Bracelete" },
  { value: "Ring", label: "Anel" },
  { value: "Belt", label: "Cinto" },
  { value: "Earrings", label: "Brincos" },
];

const traitOptions = [
  { value: "Attack Speed", label: "Attack Speed" },
  { value: "Back Critical Hit", label: "Back Critical Hit" },
  { value: "Back Heavy Attack Chance", label: "Back Heavy Attack Chance" },
  { value: "Back Hit Chance", label: "Back Hit Chance" },
  { value: "Bind Chance", label: "Bind Chance" },
  { value: "Buff Duration", label: "Buff Duration" },
  { value: "Collision Chance", label: "Collision Chance" },
  { value: "Collision Resistance", label: "Collision Resistance" },
  { value: "Construct Bonus Damage", label: "Construct Bonus Damage" },
  { value: "Cooldown Speed", label: "Cooldown Speed" },
  { value: "Critical Hit Chance", label: "Critical Hit Chance" },
  { value: "Debuff Duration", label: "Debuff Duration" },
  { value: "Demon Bonus Damage", label: "Demon Bonus Damage" },
  { value: "Front Critical Hit Chance", label: "Front Critical Hit Chance" },
  { value: "Front Heavy Attack Chance", label: "Front Heavy Attack Chance" },
  { value: "Front Hit Chance", label: "Front Hit Chance" },
  { value: "Health Regen", label: "Health Regen" },
  { value: "Heavy Attack Chance", label: "Heavy Attack Chance" },
  { value: "Hit Chance", label: "Hit Chance" },
  { value: "Humanoid Bonus Damage", label: "Humanoid Bonus Damage" },
  { value: "Magic Endurance", label: "Magic Endurance" },
  { value: "Magic Evasion", label: "Magic Evasion" },
  { value: "Mana Cost Efficiency", label: "Mana Cost Efficiency" },
  { value: "Mana Regen", label: "Mana Regen" },
  { value: "Max Health", label: "Max Health" },
  { value: "Max Mana", label: "Max Mana" },
  { value: "Max Stamina", label: "Max Stamina" },
  { value: "Melee Endurance", label: "Melee Endurance" },
  { value: "Melee Evasion", label: "Melee Evasion" },
  { value: "Movement Speed", label: "Movement Speed" },
  { value: "Petrification Chance", label: "Petrification Chance" },
  { value: "Petrification Resistance", label: "Petrification Resistance" },
  { value: "Range", label: "Range" },
  { value: "Side Critical Hit", label: "Side Critical Hit" },
  { value: "Side Heavy Attack Chance", label: "Side Heavy Attack Chance" },
  { value: "Side Hit Chance", label: "Side Hit Chance" },
  { value: "Silence Chance", label: "Silence Chance" },
  { value: "Silence Resistance", label: "Silence Resistance" },
  { value: "Skill Damage Boost", label: "Skill Damage Boost" },
  { value: "Skill Damage Resistance", label: "Skill Damage Resistance" },
  { value: "Stun Chance", label: "Stun Chance" },
  { value: "Stun Resistance", label: "Stun Resistance" },
  { value: "Undead Bonus Damage", label: "Undead Bonus Damage" },
  { value: "Weaken Chance", label: "Weaken Chance" },
  { value: "Wildkin Bonus Damage", label: "Wildkin Bonus Damage" },
].sort((a, b) => a.label.localeCompare(b.label));


const rarityBackgrounds: Record<TLItem['rarity'], string> = {
  common: 'bg-slate-700',
  uncommon: 'bg-emerald-600',
  rare: 'bg-sky-600',
  epic: 'bg-violet-600',
  legendary: 'bg-amber-500',
};

const statusBadgeClasses: Record<BankItemStatus, string> = {
  'Disponível': 'bg-green-500/20 text-green-600 border-green-500/50',
  'Distribuído': 'bg-orange-500/20 text-orange-600 border-orange-500/50',
  'Em leilão': 'bg-blue-500/20 text-blue-600 border-blue-500/50',
  'Em rolagem': 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50',
  'Aguardando leilão': 'bg-sky-500/20 text-sky-600 border-sky-500/50',
  'Aguardando rolagem': 'bg-amber-500/20 text-amber-600 border-amber-500/50',
};

const NO_DROPPER_ID = "NO_DROPPER_SPECIFIED";
const itemSubTypesRequiringTrait = [
  "Sword", "Greatsword", "Dagger", "Bow", "Crossbow", "Wand", "Staff", "Spear",
  "Head", "Chest", "Cloak", "Gloves", "Feet", "Legs",
  "Necklace", "Bracelet", "Ring", "Belt", "Earrings",
];

const lootFormSchema = z.object({
  itemCategory: z.string().min(1, "Categoria é obrigatória."),
  weaponType: z.string().optional(),
  armorType: z.string().optional(),
  accessoryType: z.string().optional(),
  itemName: z.string().optional(),
  trait: z.string().optional(),
  droppedByMemberId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.itemCategory === 'weapon') {
    if (!data.weaponType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de arma é obrigatório.", path: ["weaponType"] });
    } else if (WEAPON_ITEMS_MAP[data.weaponType]?.length > 0 && !data.itemName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome do item é obrigatório.", path: ["itemName"] });
    }
    if (data.weaponType && itemSubTypesRequiringTrait.includes(data.weaponType) && !data.trait) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Trait é obrigatório para ${data.weaponType}.`, path: ["trait"] });
    }
  } else if (data.itemCategory === 'armor') {
    if (!data.armorType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de armadura é obrigatório.", path: ["armorType"] });
    } else if (ARMOR_ITEMS_MAP[data.armorType]?.length > 0 && !data.itemName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome do item é obrigatório.", path: ["itemName"] });
    }
    if (data.armorType && itemSubTypesRequiringTrait.includes(data.armorType) && !data.trait) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Trait é obrigatório para ${armorTypeOptions.find(opt => opt.value === data.armorType)?.label || data.armorType}.`, path: ["trait"] });
    }
  } else if (data.itemCategory === 'accessory') {
    if (!data.accessoryType) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de acessório é obrigatório.", path: ["accessoryType"] });
    } else if (ACCESSORY_ITEMS_MAP[data.accessoryType]?.length > 0 && !data.itemName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome do item é obrigatório.", path: ["itemName"] });
    }
    if (data.accessoryType && itemSubTypesRequiringTrait.includes(data.accessoryType) && !data.trait) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Trait é obrigatório para ${accessoryTypeOptions.find(opt => opt.value === data.accessoryType)?.label || data.accessoryType}.`, path: ["trait"] });
    }
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

  const [bankItems, setBankItems] = useState<BankItem[]>([]);
  const [loadingBankItems, setLoadingBankItems] = useState(true);

  const [guildMembersForDropdown, setGuildMembersForDropdown] = useState<{ value: string; label: string }[]>([]);

  // Filters and Pagination State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<BankItemStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);

  const guildId = searchParams.get('guildId');

  const form = useForm<LootFormValues>({
    resolver: zodResolver(lootFormSchema),
    defaultValues: {
      itemCategory: "",
      weaponType: undefined,
      armorType: undefined,
      accessoryType: undefined,
      itemName: undefined,
      trait: undefined,
      droppedByMemberId: NO_DROPPER_ID,
    },
  });

  const watchedItemCategory = form.watch("itemCategory");
  const watchedWeaponType = form.watch("weaponType");
  const watchedArmorType = form.watch("armorType");
  const watchedAccessoryType = form.watch("accessoryType");
  const watchedItemName = form.watch("itemName");

  useEffect(() => {
    form.resetField('weaponType');
    form.resetField('armorType');
    form.resetField('accessoryType');
    form.resetField('itemName');
    form.resetField('trait');
    setSelectedItemForPreview(null);
  }, [watchedItemCategory, form]);

  useEffect(() => {
    form.resetField('itemName');
    form.resetField('trait');
    setSelectedItemForPreview(null);
  }, [watchedWeaponType, watchedArmorType, watchedAccessoryType, form]);

  useEffect(() => {
    if (watchedItemCategory === 'weapon' && watchedWeaponType && watchedItemName) {
      const items = WEAPON_ITEMS_MAP[watchedWeaponType] || [];
      const item = items.find(i => i.name === watchedItemName);
      setSelectedItemForPreview(item || null);
    } else if (watchedItemCategory === 'armor' && watchedArmorType && watchedItemName) {
      const items = ARMOR_ITEMS_MAP[watchedArmorType] || [];
      const item = items.find(i => i.name === watchedItemName);
      setSelectedItemForPreview(item || null);
    } else if (watchedItemCategory === 'accessory' && watchedAccessoryType && watchedItemName) {
      const items = ACCESSORY_ITEMS_MAP[watchedAccessoryType] || [];
      const item = items.find(i => i.name === watchedItemName);
      setSelectedItemForPreview(item || null);
    } else {
      setSelectedItemForPreview(null);
    }
  }, [watchedItemCategory, watchedWeaponType, watchedArmorType, watchedAccessoryType, watchedItemName]);


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

        const membersDropdownData: { value: string; label: string }[] = [];
        if (guildData.memberIds && guildData.roles) {
          for (const memberId of guildData.memberIds) {
            const roleInfo = guildData.roles[memberId];
            if (roleInfo) {
              membersDropdownData.push({
                value: memberId,
                label: roleInfo.characterNickname || `Membro ${memberId.substring(0, 6)}`,
              });
            }
          }
        }
        membersDropdownData.sort((a, b) => a.label.localeCompare(b.label));
        setGuildMembersForDropdown(membersDropdownData);

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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as BankItem));
      setBankItems(fetchedItems);
      setLoadingBankItems(false);
    }, (error) => {
      console.error("Error fetching bank items: ", error);
      toast({ title: "Erro ao carregar banco", variant: "destructive" });
      setLoadingBankItems(false);
    });

    return () => unsubscribe();
  }, [guildId, toast]);

  const onSubmit: SubmitHandler<LootFormValues> = async (data) => {
    if (!guildId || !user) {
        toast({title: "Erro", description: "Guilda ou usuário não identificado.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);

    let imageUrlToUse = `https://placehold.co/80x80.png?text=${data.itemName ? data.itemName.substring(0,2) : 'Itm'}`;
    let rarityToUse: TLItem['rarity'] = 'common';
    let itemSubType: string | undefined = undefined;
    
    let itemsListSource;
    if (data.itemCategory === 'weapon' && data.weaponType) {
        itemsListSource = WEAPON_ITEMS_MAP[data.weaponType];
        itemSubType = data.weaponType;
    } else if (data.itemCategory === 'armor' && data.armorType) {
        itemsListSource = ARMOR_ITEMS_MAP[data.armorType];
        itemSubType = data.armorType;
    } else if (data.itemCategory === 'accessory' && data.accessoryType) {
        itemsListSource = ACCESSORY_ITEMS_MAP[data.accessoryType];
        itemSubType = data.accessoryType;
    }

    if (itemsListSource && data.itemName) {
        const specificItem = itemsListSource.find(s => s.name === data.itemName);
        if (specificItem) {
            imageUrlToUse = specificItem.imageUrl;
            rarityToUse = specificItem.rarity;
        }
    }
    
    let finalDroppedByMemberId: string | undefined = data.droppedByMemberId;
    let finalDroppedByMemberName: string | undefined = undefined;

    if (data.droppedByMemberId && data.droppedByMemberId !== NO_DROPPER_ID) {
        const droppedByMember = guildMembersForDropdown.find(m => m.value === data.droppedByMemberId);
        finalDroppedByMemberName = droppedByMember?.label;
    } else {
        finalDroppedByMemberId = undefined;
    }

    const newItemPayload: Omit<BankItem, 'id'> = {
      createdAt: serverTimestamp() as Timestamp,
      itemCategory: itemCategoryOptions.find(opt => opt.value === data.itemCategory)?.label || data.itemCategory,
      itemName: data.itemName,
      imageUrl: imageUrlToUse,
      rarity: rarityToUse,
      status: 'Disponível',
      droppedByMemberId: finalDroppedByMemberId,
      droppedByMemberName: finalDroppedByMemberName,
      weaponType: data.weaponType,
      armorType: data.armorType,
      accessoryType: data.accessoryType,
      trait: data.trait,
    };
    
    try {
        const bankItemsCollectionRef = collection(db, `guilds/${guildId}/bankItems`);
        await addDoc(bankItemsCollectionRef, newItemPayload);
        toast({ title: "Item Registrado no Banco!", description: `Item ${newItemPayload.itemName || itemSubType || newItemPayload.itemCategory} adicionado.` });
        setShowAddItemDialog(false);
        form.reset({ itemCategory: "", weaponType: undefined, armorType: undefined, accessoryType: undefined, itemName: undefined, trait: undefined, droppedByMemberId: NO_DROPPER_ID });
        setSelectedItemForPreview(null);
    } catch (error) {
        console.error("Error saving item to Firestore:", error);
        toast({title: "Erro ao Salvar Item", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

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

  const currentItemNameOptions =
    watchedItemCategory === 'weapon' && watchedWeaponType ? WEAPON_ITEMS_MAP[watchedWeaponType] || [] :
    watchedItemCategory === 'armor' && watchedArmorType ? ARMOR_ITEMS_MAP[watchedArmorType] || [] :
    watchedItemCategory === 'accessory' && watchedAccessoryType ? ACCESSORY_ITEMS_MAP[watchedAccessoryType] || [] : [];

  const isTraitMandatory =
    (watchedItemCategory === 'weapon' && watchedWeaponType && itemSubTypesRequiringTrait.includes(watchedWeaponType)) ||
    (watchedItemCategory === 'armor' && watchedArmorType && itemSubTypesRequiringTrait.includes(watchedArmorType)) ||
    (watchedItemCategory === 'accessory' && watchedAccessoryType && itemSubTypesRequiringTrait.includes(watchedAccessoryType));

  const subTypeLabel =
    watchedItemCategory === 'weapon' && watchedWeaponType ? watchedWeaponType :
    watchedItemCategory === 'armor' && watchedArmorType ? (armorTypeOptions.find(opt => opt.value === watchedArmorType)?.label || watchedArmorType) :
    watchedItemCategory === 'accessory' && watchedAccessoryType ? (accessoryTypeOptions.find(opt => opt.value === watchedAccessoryType)?.label || watchedAccessoryType) :
    'item';

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

          <div className="mb-6 flex justify-end">
            <Dialog open={showAddItemDialog} onOpenChange={(isOpen) => {
                setShowAddItemDialog(isOpen);
                if (!isOpen) {
                    form.reset({ itemCategory: "", weaponType: undefined, armorType: undefined, accessoryType: undefined, itemName: undefined, trait: undefined, droppedByMemberId: NO_DROPPER_ID });
                    setSelectedItemForPreview(null);
                }
            }}>
              <DialogTrigger asChild>
                <Button className="btn-gradient btn-style-secondary"><PackagePlus className="mr-2 h-5 w-5" />Cadastrar Item no Banco</Button>
              </DialogTrigger>
              <DialogContent className="flex flex-col sm:max-w-2xl bg-card border-border max-h-[90vh]">
                <DialogHeader className="pb-4 p-6 border-b border-border shrink-0">
                  <DialogTitle className="font-headline text-primary">Cadastrar Novo Item no Banco da Guilda</DialogTitle>
                  <DialogDescription>Preencha os detalhes do item a ser adicionado ao banco.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto px-6 py-4 space-y-5">
                    <FormField control={form.control} name="itemCategory" render={({ field }) => ( <FormItem> <FormLabel>Tipo de Item <span className="text-destructive">*</span></FormLabel> <Select onValueChange={field.onChange} value={field.value}> <FormControl> <SelectTrigger className="form-input"> {field.value ? ( <div className="flex items-center"> {React.createElement(itemCategoryOptions.find(opt => opt.value === field.value)?.icon || Tag, { className: "mr-2 h-5 w-5 text-muted-foreground"})} <SelectValue placeholder="Selecione a categoria do item" /> </div> ) : ( <SelectValue placeholder="Selecione a categoria do item" /> )} </SelectTrigger> </FormControl> <SelectContent> {itemCategoryOptions.map(opt => ( <SelectItem key={opt.value} value={opt.value}> <div className="flex items-center"> {React.createElement(opt.icon || Tag, { className: "mr-2 h-5 w-5"})} {opt.label} </div> </SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                    {watchedItemCategory === 'weapon' && ( <FormField control={form.control} name="weaponType" render={({ field }) => ( <FormItem> <FormLabel>Tipo de Arma <span className="text-destructive">*</span></FormLabel> <Select onValueChange={field.onChange} value={field.value || ""}> <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione o tipo da arma" /></SelectTrigger></FormControl> <SelectContent> {weaponTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/> )}
                    {watchedItemCategory === 'armor' && ( <FormField control={form.control} name="armorType" render={({ field }) => ( <FormItem> <FormLabel>Tipo de Armadura <span className="text-destructive">*</span></FormLabel> <Select onValueChange={field.onChange} value={field.value || ""}> <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione o tipo da armadura" /></SelectTrigger></FormControl> <SelectContent> {armorTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/> )}
                    {watchedItemCategory === 'accessory' && ( <FormField control={form.control} name="accessoryType" render={({ field }) => ( <FormItem> <FormLabel>Tipo de Acessório <span className="text-destructive">*</span></FormLabel> <Select onValueChange={field.onChange} value={field.value || ""}> <FormControl><SelectTrigger className="form-input"><SelectValue placeholder="Selecione o tipo de acessório" /></SelectTrigger></FormControl> <SelectContent> {accessoryTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/> )}
                    {( (watchedItemCategory === 'weapon' && watchedWeaponType && currentItemNameOptions.length > 0) || (watchedItemCategory === 'armor' && watchedArmorType && currentItemNameOptions.length > 0) || (watchedItemCategory === 'accessory' && watchedAccessoryType && currentItemNameOptions.length > 0) ) && ( <FormField control={form.control} name="itemName" render={({ field }) => ( <FormItem> <FormLabel> Nome do Item ({subTypeLabel}) <span className="text-destructive">*</span> </FormLabel> <Select onValueChange={field.onChange} value={field.value || ""}> <FormControl><SelectTrigger className="form-input"><SelectValue placeholder={`Selecione o nome d${subTypeLabel.toLowerCase().endsWith('a') || ['staff', 'spear', 'head', 'peitoral', 'manto', 'luvas', 'pés', 'calças', 'colar', 'anel'].includes(subTypeLabel.toLowerCase()) ? 'a' : 'o'} ${subTypeLabel.toLowerCase()}`} /></SelectTrigger></FormControl> <SelectContent> {currentItemNameOptions.map(item => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/> )}
                    {isTraitMandatory && ( <FormField control={form.control} name="trait" render={({ field }) => ( <FormItem> <FormLabel> Trait do Item ({subTypeLabel}) {isTraitMandatory && <span className="text-destructive">*</span>} </FormLabel> <div className="relative flex items-center"> <Sparkles className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" /> <Select onValueChange={field.onChange} value={field.value || ""}> <FormControl><SelectTrigger className="form-input pl-10"><SelectValue placeholder={`Selecione o trait d${subTypeLabel.toLowerCase().endsWith('a') || ['staff', 'spear', 'head', 'peitoral', 'manto', 'luvas', 'pés', 'calças', 'colar', 'anel'].includes(subTypeLabel.toLowerCase()) ? 'a' : 'o'} ${subTypeLabel.toLowerCase()}`} /></SelectTrigger></FormControl> <SelectContent> {traitOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)} </SelectContent> </Select> </div> <FormMessage /> </FormItem> )}/> )}
                    {selectedItemForPreview && ( <div className="mt-4 space-y-2"> <FormLabel>Prévia do Item</FormLabel> <div className={cn( "w-24 h-24 p-2 rounded-md flex items-center justify-center border border-border", rarityBackgrounds[selectedItemForPreview.rarity] || 'bg-muted' )} > <Image src={selectedItemForPreview.imageUrl} alt={selectedItemForPreview.name} width={80} height={80} className="object-contain" data-ai-hint={watchedItemCategory === 'weapon' ? "game item weapon" : (watchedItemCategory === 'armor' ? "game item armor" : (watchedItemCategory === 'accessory' ? "game item accessory" : "game item"))}/> </div> </div> )}
                    <FormField control={form.control} name="droppedByMemberId" render={({ field }) => ( <FormItem> <FormLabel>Dropado por (Opcional)</FormLabel> <div className="relative flex items-center"> <UserCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" /> <Select onValueChange={field.onChange} value={field.value || NO_DROPPER_ID} defaultValue={field.value || NO_DROPPER_ID}> <FormControl><SelectTrigger className="form-input pl-10"><SelectValue placeholder="Selecione quem dropou o item" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value={NO_DROPPER_ID}>Ninguém / Não especificado</SelectItem> {guildMembersForDropdown.map(member => ( <SelectItem key={member.value} value={member.value}> <div className="flex items-center"> <Avatar className="h-6 w-6 mr-2"> <AvatarImage src={guild?.roles?.[member.value]?.characterNickname ? `https://placehold.co/32x32.png?text=${guild.roles[member.value].characterNickname!.substring(0,1)}` : `https://placehold.co/32x32.png?text=${member.label.substring(0,1)}`} alt={member.label} data-ai-hint="user avatar"/> <AvatarFallback>{member.label.substring(0,1).toUpperCase()}</AvatarFallback> </Avatar> {member.label} </div> </SelectItem> ))} </SelectContent> </Select> </div> <FormMessage /> </FormItem> )}/>
                    <DialogFooter className="p-0 pt-6 bg-card sticky bottom-0">
                      <Button type="button" variant="outline" onClick={() => { setShowAddItemDialog(false); form.reset({ itemCategory: "", weaponType: undefined, armorType: undefined, accessoryType: undefined, itemName: undefined, trait: undefined, droppedByMemberId: NO_DROPPER_ID }); setSelectedItemForPreview(null); }} disabled={isSubmitting}>Cancelar</Button>
                      <Button type="submit" className="btn-gradient btn-style-primary" disabled={isSubmitting}> {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />} Registrar Item </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          {loadingBankItems ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
          ) : paginatedItems.length === 0 ? (
            <Card className="static-card-container text-center py-10">
              <CardHeader><Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" /></CardHeader>
              <CardContent>
                <CardTitle className="text-2xl">Banco da Guilda Vazio</CardTitle>
                <CardDescription className="mt-2">
                  {searchTerm || statusFilter !== 'all' || dateFilter ? 'Nenhum item encontrado com os filtros aplicados.' : 'Nenhum item registrado no banco ainda. Clique em "Cadastrar Item no Banco" para adicionar o primeiro.'}
                </CardDescription>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedItems.map(item => (
                  <Card key={item.id} className="static-card-container flex flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold truncate text-center" title={item.itemName || item.weaponType || item.armorType || item.accessoryType || item.itemCategory}>
                        {item.itemName || item.weaponType || (armorTypeOptions.find(opt => opt.value === item.armorType)?.label || item.armorType) || (accessoryTypeOptions.find(opt => opt.value === item.accessoryType)?.label || item.accessoryType) || "Item Genérico"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col items-center justify-center p-4">
                      <div className={cn("w-28 h-28 p-2 rounded-md flex items-center justify-center border border-border", rarityBackgrounds[item.rarity])}>
                        <Image src={item.imageUrl} alt={item.itemName || "Item"} width={96} height={96} className="object-contain" data-ai-hint={item.itemCategory === "Arma" ? "game item weapon" : (item.itemCategory === "Armadura" ? "game item armor" : (item.itemCategory === "Acessório" ? "game item accessory" : "game item"))}/>
                      </div>
                      <Badge variant={item.status === 'Disponível' ? 'default' : 'secondary'} className={cn("mt-2 mb-2 text-xs px-2 py-0.5", statusBadgeClasses[item.status])}>
                        {item.status}
                      </Badge>
                      <div className="space-y-0.5 text-xs text-muted-foreground text-center">
                        <p><strong>Tipo:</strong> {item.itemCategory}</p>
                        {item.weaponType && <p><strong>Arma:</strong> {item.weaponType}</p>}
                        {item.armorType && <p><strong>Armadura:</strong> {armorTypeOptions.find(opt => opt.value === item.armorType)?.label || item.armorType}</p>}
                        {item.accessoryType && <p><strong>Acessório:</strong> {accessoryTypeOptions.find(opt => opt.value === item.accessoryType)?.label || item.accessoryType}</p>}
                        {item.trait && <p><strong>Trait:</strong> {item.trait}</p>}
                        {item.droppedByMemberName && <p><strong>Dropado por:</strong> {item.droppedByMemberName}</p>}
                        {item.createdAt && <p><strong>Cadastrado em:</strong> {format(item.createdAt.toDate(), 'dd/MM/yy HH:mm')}</p>}
                      </div>
                    </CardContent>
                    <CardFooter className="p-3 border-t border-border">
                      <Button variant="outline" size="sm" className="w-full text-xs"> <Eye className="mr-1.5 h-3.5 w-3.5"/> Ver Detalhes </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 bg-card rounded-lg shadow mt-4">
                <div className="text-sm text-muted-foreground">
                  {filteredAndSortedItems.length} item(s) no total.
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground"> Página {totalPages > 0 ? currentPage : 0} de {totalPages} </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1 || totalPages === 0}> <ChevronsLeft className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || totalPages === 0}> <ChevronLeft className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}> <ChevronRight className="h-4 w-4" /> </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}> <ChevronsRight className="h-4 w-4" /> </Button>
                  </div>
                </div>
              </div>
            </>
          )}
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
