
"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, doc, getDoc } from '@/lib/firebase'; 
import type { Guild, GuildMember, UserProfile } from '@/types/guildmaster'; 
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
import { Loader2, Gem, PackagePlus, Axe, Shield as ShieldLucideIcon, Wand2Icon, Bow, Dices, Wrench, Diamond, Sparkles, Package, Tag, CheckSquare, Eye, Users, UserCircle } from 'lucide-react';
import { ComingSoon } from '@/components/shared/ComingSoon';
import { useHeader } from '@/contexts/HeaderContext';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TLItem {
  name: string;
  imageUrl: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

type BankItemStatus = 'Disponível' | 'Distribuído' | 'Em leilão' | 'Em rolagem' | 'Aguardando leilão' | 'Aguardando rolagem';

interface BankItem {
  id: string;
  itemCategory: string;
  weaponType?: string;
  itemName?: string;
  trait?: string;
  imageUrl: string;
  rarity: TLItem['rarity'];
  status: BankItemStatus;
  droppedByMemberId?: string;
  droppedByMemberName?: string;
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

const TL_GREATSWORD_ITEMS: TLItem[] = [
  { name: 'Sparring Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00001.webp', rarity: 'common' },
  { name: 'Sharpened Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00003A.webp', rarity: 'common' },
  { name: 'Reforged Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00003.webp', rarity: 'common' },
  { name: 'Forged Iron Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00002.webp', rarity: 'common' },
  { name: 'Forgotten Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00037A.webp', rarity: 'common' },
  { name: 'Legionnaire Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00026.webp', rarity: 'uncommon' },
  { name: 'Guardian Warblade', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00004.webp', rarity: 'uncommon' },
  { name: 'Standard Issue Claymore', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00023.webp', rarity: 'uncommon' },
  { name: 'Charger Broadsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00006.webp', rarity: 'uncommon' },
  { name: 'Golem Grinding Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00005.webp', rarity: 'rare' },
  { name: 'Warblade of Undead Slaying', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00026C.webp', rarity: 'rare' },
  { name: 'Broadsword of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00019.webp', rarity: 'rare' },
  { name: 'Dead Reckoning Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00013.webp', rarity: 'rare' },
  { name: 'Relentless Cleaver', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00012.webp', rarity: 'rare' },
  { name: 'Greatsword of Punishing', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00013A.webp', rarity: 'rare' },
  { name: 'Resistance Vanguard Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00019B.webp', rarity: 'rare' },
  { name: 'Bound Resistance Vanguard Greatsword', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00019B.webp', rarity: 'rare' },
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
];

const TL_DAGGER_ITEMS: TLItem[] = [
  { name: 'Apprentice Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00001.webp', rarity: 'common' },
  { name: 'Reforged Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00002.webp', rarity: 'common' },
  { name: 'Sharpened Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00003.webp', rarity: 'common' },
  { name: 'Twin Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00004.webp', rarity: 'common' },
  { name: 'Forgotten Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00007.webp', rarity: 'common' },
  { name: 'Utility Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00005.webp', rarity: 'uncommon' },
  { name: 'Iron Dirks', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00006.webp', rarity: 'uncommon' },
  { name: 'Parrying Stilettos', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00007.webp', rarity: 'uncommon' },
  { name: 'Bloodletter Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00008.webp', rarity: 'uncommon' },
  { name: 'Golem Chiseling Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00016.webp', rarity: 'rare' },
  { name: 'Daggers of Undead Severing', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00009.webp', rarity: 'rare' },
  { name: 'Daggers of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00026.webp', rarity: 'rare' },
  { name: 'Daggers of Slaughtering', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00020.webp', rarity: 'rare' },
  { name: 'Shadewalker Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00022.webp', rarity: 'rare' },
  { name: 'Killing Spree Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00022B.webp', rarity: 'rare' },
  { name: 'Resistance Vanguard Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00026A.webp', rarity: 'rare' },
  { name: 'Bound Resistance Vanguard Daggers', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00026A.webp', rarity: 'rare' },
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
];

const TL_BOW_ITEMS: TLItem[] = [
  { name: 'Mystwood Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00001.webp', rarity: 'common' },
  { name: 'Petrified Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00001A.webp', rarity: 'common' },
  { name: 'Wooden Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00002A.webp', rarity: 'common' },
  { name: 'Driftwood Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00002.webp', rarity: 'common' },
  { name: 'Forgotten Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00002.webp', rarity: 'common' },
  { name: 'Sniper Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00003.webp', rarity: 'uncommon' },
  { name: 'Hunter Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00008.webp', rarity: 'uncommon' },
  { name: 'Standard Issue Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00003A.webp', rarity: 'uncommon' },
  { name: 'Birchwood Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00006.webp', rarity: 'uncommon' },
  { name: 'Golem Impaler Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00006A.webp', rarity: 'rare' },
  { name: 'Longbow of Undead Skewering', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00014.webp', rarity: 'rare' },
  { name: 'Longbow of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00007.webp', rarity: 'rare' },
  { name: 'Farshot Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00005A.webp', rarity: 'rare' },
  { name: 'First Blood Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00012.webp', rarity: 'rare' },
  { name: 'Blood Talon Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00012B.webp', rarity: 'rare' },
  { name: 'Resistance Vanguard Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00007B.webp', rarity: 'rare' },
  { name: 'Bound Resistance Vanguard Longbow', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00007B.webp', rarity: 'rare' },
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
];

const TL_CROSSBOW_ITEMS: TLItem[] = [
  { name: 'Mystwood Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00001.webp', rarity: 'common' },
  { name: 'Sturdy Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00002.webp', rarity: 'common' },
  { name: 'Silk Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00003.webp', rarity: 'common' },
  { name: 'Driftwood Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00004.webp', rarity: 'common' },
  { name: 'Forgotten Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00001.webp', rarity: 'common' },
  { name: 'Watchkeeper Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00007.webp', rarity: 'uncommon' },
  { name: 'Repeating Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00006.webp', rarity: 'uncommon' },
  { name: 'Birchwood Arbalests', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00005.webp', rarity: 'uncommon' },
  { name: 'Pathfinder Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00010.webp', rarity: 'uncommon' },
  { name: 'Golem Dismantler Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00009A.webp', rarity: 'rare' },
  { name: 'Crossbows of Undead Piercing', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00014.webp', rarity: 'rare' },
  { name: 'Crossbows of the Resistance', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00008B.webp', rarity: 'rare' },
  { name: 'Steel Flurry Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00006B.webp', rarity: 'rare' },
  { name: 'Viperstrike Arbalests', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00008A.webp', rarity: 'rare' },
  { name: 'First Strike Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00008D.webp', rarity: 'rare' },
  { name: 'Resistance Vanguard Crossbows', imageUrl: 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00008E.webp', rarity: 'rare' },
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
];


const WEAPON_ITEMS_MAP: Record<string, TLItem[]> = {
  "Sword": TL_SWORD_ITEMS,
  "Greatsword": TL_GREATSWORD_ITEMS,
  "Dagger": TL_DAGGER_ITEMS,
  "Bow": TL_BOW_ITEMS,
  "Crossbow": TL_CROSSBOW_ITEMS,
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
  { value: "Attack Speed", label: "Attack Speed"},
  { value: "Buff Duration", label: "Buff Duration" },
  { value: "Collision Chance", label: "Collision Chance" },
  { value: "Construct Bonus Damage", label: "Construct Bonus Damage"},
  { value: "Cooldown Speed", label: "Cooldown Speed"},
  { value: "Critical Hit Chance", label: "Critical Hit Chance" },
  { value: "Debuff Duration", label: "Debuff Duration" },
  { value: "Demon Bonus Damage", label: "Demon Bonus Damage"},
  { value: "Health Regen", label: "Health Regen"},
  { value: "Heavy Attack Chance", label: "Heavy Attack Chance" },
  { value: "Hit Chance", label: "Hit Chance" },
  { value: "Humanoid Bonus Damage", label: "Humanoid Bonus Damage" },
  { value: "Mana Cost Efficiency", label: "Mana Cost Efficiency"},
  { value: "Mana Regen", label: "Mana Regen"},
  { value: "Max Health", label: "Max Health" },
  { value: "Max Mana", label: "Max Mana" },
  { value: "Silence Chance", label: "Silence Chance" },
  { value: "Stun Chance", label: "Stun Chance"},
  { value: "Undead Bonus Damage", label: "Undead Bonus Damage" },
  { value: "Weaken Chance", label: "Weaken Chance"},
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

const lootFormSchema = z.object({
  itemCategory: z.string().min(1, "Categoria é obrigatória."),
  weaponType: z.string().optional(),
  itemName: z.string().optional(),
  trait: z.string().optional(),
  droppedByMemberId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.itemCategory === 'weapon' && !data.weaponType) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de arma é obrigatório.", path: ["weaponType"] });
  }
  if (data.itemCategory === 'weapon' && data.weaponType && WEAPON_ITEMS_MAP[data.weaponType]?.length > 0 && !data.itemName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome do item é obrigatório.", path: ["itemName"] });
  }
  const traitMandatoryWeaponTypes = ["Sword", "Greatsword", "Dagger", "Bow", "Crossbow"];
  if (data.itemCategory === 'weapon' && data.weaponType && traitMandatoryWeaponTypes.includes(data.weaponType) && !data.trait) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Trait é obrigatório para ${data.weaponType}.`, path: ["trait"] });
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
  const [guildMembersForDropdown, setGuildMembersForDropdown] = useState<{ value: string; label: string }[]>([]);

  const guildId = searchParams.get('guildId');

  const form = useForm<LootFormValues>({
    resolver: zodResolver(lootFormSchema),
    defaultValues: {
      itemCategory: "",
      weaponType: undefined,
      itemName: undefined,
      trait: undefined,
      droppedByMemberId: NO_DROPPER_ID,
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
      setSelectedItemForPreview(null);
    }
  }, [watchedItemCategory, form]);

  useEffect(() => {
    form.setValue('itemName', undefined);
    const traitMandatoryWeaponTypes = ["Sword", "Greatsword", "Dagger", "Bow", "Crossbow"];
    if (watchedWeaponType && !traitMandatoryWeaponTypes.includes(watchedWeaponType)) {
      form.setValue('trait', undefined);
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

  const onSubmit: SubmitHandler<LootFormValues> = async (data) => {
    setIsSubmitting(true);

    let imageUrlToUse = `https://placehold.co/80x80.png?text=${data.itemName ? data.itemName.substring(0,2) : 'Itm'}`;
    let rarityToUse: TLItem['rarity'] = 'common';

    if (data.itemCategory === 'weapon' && data.weaponType && data.itemName) {
        const itemsList = WEAPON_ITEMS_MAP[data.weaponType];
        if (itemsList) {
            const specificItem = itemsList.find(s => s.name === data.itemName);
            if (specificItem) {
                imageUrlToUse = specificItem.imageUrl;
                rarityToUse = specificItem.rarity;
            }
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

    const traitMandatoryWeaponTypes = ["Sword", "Greatsword", "Dagger", "Bow", "Crossbow"];
    const newItem: BankItem = {
      id: Date.now().toString(), 
      itemCategory: itemCategoryOptions.find(opt => opt.value === data.itemCategory)?.label || data.itemCategory,
      weaponType: data.weaponType,
      itemName: data.itemName,
      trait: data.itemCategory === 'weapon' && data.weaponType && traitMandatoryWeaponTypes.includes(data.weaponType) ? data.trait : undefined,
      imageUrl: imageUrlToUse,
      rarity: rarityToUse,
      status: 'Disponível',
      droppedByMemberId: finalDroppedByMemberId,
      droppedByMemberName: finalDroppedByMemberName,
    };

    setBankItems(prevItems => [...prevItems, newItem]);

    toast({ title: "Item Registrado no Banco!", description: `Item ${newItem.itemName || newItem.weaponType || newItem.itemCategory} adicionado.` });
    setIsSubmitting(false);
    setShowAddItemDialog(false);
    form.reset({ droppedByMemberId: NO_DROPPER_ID });
    setSelectedItemForPreview(null);
  };

  if (authLoading || loadingGuildData) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  if (!guild) {
    return <PageTitle title="Loot" icon={<Gem className="h-8 w-8 text-primary" />}><div className="text-center py-10">Guilda não encontrada.</div></PageTitle>;
  }

  const currentWeaponNameOptions = watchedWeaponType ? WEAPON_ITEMS_MAP[watchedWeaponType] || [] : [];

  const getCategoryLabel = (value: string) => itemCategoryOptions.find(opt => opt.value === value)?.label || value;
  const traitMandatoryWeaponTypes = ["Sword", "Greatsword", "Dagger", "Bow", "Crossbow"];
  const isTraitMandatory = watchedItemCategory === 'weapon' && watchedWeaponType && traitMandatoryWeaponTypes.includes(watchedWeaponType);


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
          <div className="flex justify-end mb-6">
            <Dialog open={showAddItemDialog} onOpenChange={(isOpen) => {
                setShowAddItemDialog(isOpen);
                if (!isOpen) {
                    form.reset({ droppedByMemberId: NO_DROPPER_ID });
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
                         {watchedWeaponType && currentWeaponNameOptions.length > 0 && (
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
                        {isTraitMandatory && (
                           <FormField
                            control={form.control}
                            name="trait"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Trait da Arma
                                  {isTraitMandatory && <span className="text-destructive">*</span>}
                                </FormLabel>
                                <div className="relative flex items-center">
                                  <Sparkles className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                  <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl><SelectTrigger className="form-input pl-10"><SelectValue placeholder="Selecione o trait da arma" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                      {traitOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                </div>
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
                      </>
                    )}
                    
                    <FormField
                      control={form.control}
                      name="droppedByMemberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dropado por (Opcional)</FormLabel>
                           <div className="relative flex items-center">
                                <UserCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                <Select onValueChange={field.onChange} value={field.value || NO_DROPPER_ID} defaultValue={field.value || NO_DROPPER_ID}>
                                    <FormControl><SelectTrigger className="form-input pl-10"><SelectValue placeholder="Selecione quem dropou o item" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    <SelectItem value={NO_DROPPER_ID}>Ninguém / Não especificado</SelectItem>
                                    {guildMembersForDropdown.map(member => (
                                        <SelectItem key={member.value} value={member.value}>
                                        <div className="flex items-center">
                                            <Avatar className="h-6 w-6 mr-2">
                                            <AvatarImage src={guild?.roles?.[member.value]?.characterNickname /* Placeholder for actual photoURL if available */ || `https://placehold.co/32x32.png?text=${member.label.substring(0,1)}`} alt={member.label} data-ai-hint="user avatar"/>
                                            <AvatarFallback>{member.label.substring(0,1).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {member.label}
                                        </div>
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                           </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="p-0 pt-6 sticky bottom-0 bg-card">
                      <Button type="button" variant="outline" onClick={() => {
                          setShowAddItemDialog(false);
                          form.reset({ droppedByMemberId: NO_DROPPER_ID });
                          setSelectedItemForPreview(null);
                      }} disabled={isSubmitting}>Cancelar</Button>
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

          {bankItems.length === 0 ? (
            <Card className="static-card-container text-center py-10">
              <CardHeader><Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" /></CardHeader>
              <CardContent>
                <CardTitle className="text-2xl">Banco da Guilda Vazio</CardTitle>
                <CardDescription className="mt-2">Nenhum item registrado no banco ainda. Clique em "Cadastrar Item no Banco" para adicionar o primeiro.</CardDescription>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {bankItems.map(item => (
                <Card key={item.id} className="static-card-container flex flex-col">
                  <CardHeader className="pb-2">
                     <CardTitle className="text-base font-semibold truncate text-center" title={item.itemName || item.weaponType || item.itemCategory}>
                        {item.itemName || item.weaponType || "Item Genérico"}
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col items-center justify-center p-4">
                    <div className={cn("w-28 h-28 p-2 rounded-md flex items-center justify-center border border-border", rarityBackgrounds[item.rarity])}>
                      <Image src={item.imageUrl} alt={item.itemName || "Item"} width={96} height={96} className="object-contain" data-ai-hint="game item icon"/>
                    </div>
                     <Badge
                        variant={item.status === 'Disponível' ? 'default' : 'secondary'}
                        className={cn(
                          "mt-2 mb-2 text-xs px-2 py-0.5",
                          statusBadgeClasses[item.status]
                        )}
                      >
                        {item.status}
                      </Badge>
                    <div className="text-xs text-muted-foreground space-y-0.5 text-center">
                      <p><strong>Tipo:</strong> {item.itemCategory}</p>
                      {item.weaponType && <p><strong>Arma:</strong> {item.weaponType}</p>}
                      {item.trait && <p><strong>Trait:</strong> {item.trait}</p>}
                      {item.droppedByMemberName && <p><strong>Dropado por:</strong> {item.droppedByMemberName}</p>}
                    </div>
                  </CardContent>
                   <CardFooter className="p-3 border-t border-border">
                        <Button variant="outline" size="sm" className="w-full text-xs">
                            <Eye className="mr-1.5 h-3.5 w-3.5"/> Ver Detalhes
                        </Button>
                    </CardFooter>
                </Card>
              ))}
            </div>
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
    

    
