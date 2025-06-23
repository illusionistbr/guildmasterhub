

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
import { Loader2, Gem, PackagePlus, Shield as ShieldLucideIcon, Wand2Icon, Bow, Dices, Wrench, Diamond, Sparkles, Package, Tag, CheckSquare, Eye, Users, UserCircle, Shirt, Hand, Footprints, Heart, Search, Filter, Calendar as CalendarIconLucide, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Gavel, MoreHorizontal, ArrowUpDown, Clock, Timer, X, ArrowRight, UserCheck, Armchair, Swords, Trash2, UploadCloud, Axe, ImageIcon } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


const ITEMS_PER_PAGE = 15;

const rarityBackgrounds: Record<BankItem['rarity'], string> = {
    common: 'bg-slate-700/50',
    uncommon: 'bg-emerald-700/50',
    rare: 'bg-sky-700/50',
    epic: 'bg-purple-700/50',
    legendary: 'bg-amber-700/50',
};

const statusBadgeClasses: Record<BankItemStatus, string> = {
  'Disponível': 'bg-green-500/20 text-green-600 border-green-500/50',
  'Distribuído': 'bg-orange-500/20 text-orange-600 border-orange-500/50',
  'Em leilão': 'bg-blue-500/20 text-blue-600 border-blue-500/50',
  'Em rolagem': 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50',
  'Aguardando leilão': 'bg-sky-500/20 text-sky-600 border-sky-500/50',
  'Aguardando rolagem': 'bg-amber-500/20 text-amber-600 border-amber-500/50',
};


interface ItemDetails {
  name: string;
  imageUrl: string;
}

const ITEM_DATABASE: Record<string, Record<string, Record<string, ItemDetails>>> = {
  weapon: {
    Sword: {
      "karnixs-netherblade": { name: "Karnix's Netherblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00015.webp" },
      "blade-of-fiendish-fortitude": { name: "Blade of Fiendish Fortitude", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00017.webp" },
      "corneliuss-animated-edge": { name: "Cornelius's Animated Edge", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00008A.webp" },
      "bulwark-of-invulnerability": { name: "Bulwark of Invulnerability", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00016.webp" },
      "ahzreils-siphoning-sword": { name: "Ahzreil's Siphoning Sword", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00026.webp" },
      "nirmas-sword-of-echoes": { name: "Nirma's Sword of Echoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00035.webp" },
      "crimson-doomblade": { name: "Crimson Doomblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00038.webp" },
      "heroic-blade-of-the-resistance": { name: "Heroic Blade of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00032.webp" },
      "chernobogs-blade-of-beheading": { name: "Chernobog's Blade of Beheading", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00033.webp" },
      "queen-bellandirs-languishing-blade": { name: "Queen Bellandir's Languishing Blade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00034.webp" },
      "daigons-stormblade": { name: "Daigon's Stormblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00017A.webp" },
      "unshakeable-knights-sword": { name: "Unshakeable Knight's Sword", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00010A.webp" },
      "bulwark-of-the-black-anvil": { name: "Bulwark of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00049.webp" },
      "deluzhnoas-edge-of-eternal-frost": { name: "Deluzhnoa's Edge of Eternal Frost", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00052.webp" },
    },
    Greatsword: {
      "immortal-titanic-quakeblade": { name: "Immortal Titanic Quakeblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00007.webp" },
      "celestial-cyclone-warblade": { name: "Celestial Cyclone Warblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00010.webp" },
      "morokais-greatblade-of-corruption": { name: "Morokai's Greatblade of Corruption", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00027.webp" },
      "duke-magnas-provoking-warblade": { name: "Duke Magna's Provoking Warblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00022.webp" },
      "adentuss-gargantuan-greatsword": { name: "Adentus's Gargantuan Greatsword", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00028.webp" },
      "junobotes-juggernaut-warblade": { name: "Junobote's Juggernaut Warblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00039.webp" },
      "narus-frenzied-greatblade": { name: "Naru's Frenzied Greatblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00034.webp" },
      "duke-magnas-fury-warblade": { name: "Duke Magna's Fury Warblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00031.webp" },
      "heroic-broadsword-of-the-resistance": { name: "Heroic Broadsword of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00038.webp" },
      "greatsword-of-the-banshee": { name: "Greatsword of the Banshee", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00018.webp" },
      "tevents-warblade-of-despair": { name: "Tevent's Warblade of Despair", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00036.webp" },
      "broadsword-of-the-juggernaught": { name: "Broadsword of the Juggernaught", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00014.webp" },
      "greatblade-of-the-black-anvil": { name: "Greatblade of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00049.webp" },
      "grayeyes-bloodlust-greatsword": { name: "Grayeye's Bloodlust Greatsword", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00050.webp" },
      "cordys-warblade-of-creeping-doom": { name: "Cordy's Warblade of Creeping Doom", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00052.webp" },
    },
    Dagger: {}, Bow: {}, Crossbow: {}, Wand: {}, Staff: {}, Spear: {}
  },
  armor: {},
  accessory: {
    earring: {
      'gilded-granite-teardrops': { name: "Gilded Granite Teardrops", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00001.webp" },
      'bloodbright-earrings': { name: "Bloodbright Earrings", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00004.webp" },
      'earrings-of-primal-foresight': { name: "Earrings of Primal Foresight", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00002.webp" },
      'earrings-of-glimmering-dew': { name: "Earrings of Glimmering Dew", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00003.webp" },
      'earrings-of-forlorn-elegance': { name: "Earrings of Forlorn Elegance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00051.webp" },
      'brilliant-regal-earrings': { name: "Brilliant Regal Earrings", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00052.webp" },
    },
    belt: {
      'forbidden-eternal-chain': { name: "Forbidden Eternal Chain", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00013.webp" },
      'forbidden-arcane-chain': { name: "Forbidden Arcane Chain", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00014.webp" },
      'forbidden-sacred-chain': { name: "Forbidden Sacred Chain", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00015.webp" },
      'demonic-beast-kings-belt': { name: "Demonic Beast King's Belt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00018.webp" },
      'flamewrought-bindings': { name: "Flamewrought Bindings", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00019.webp" },
      'girdle-of-spectral-skulls': { name: "Girdle of Spectral Skulls", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00021.webp" },
      'belt-of-bloodlust': { name: "Belt of Bloodlust", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00022.webp" },
      'butchers-belt': { name: "Butcher's Belt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00031.webp" },
      'girdle-of-treant-strength': { name: "Girdle of Treant Strength", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00030.webp" },
      'elusive-nymph-coil': { name: "Elusive Nymph Coil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00036.webp" },
      'burnt-silk-warsash': { name: "Burnt Silk Warsash", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00037.webp" },
      'heros-legacy-warbelt': { name: "Hero's Legacy Warbelt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00041.webp" },
      'cunning-ogre-girdle': { name: "Cunning Ogre Girdle", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00040.webp" },
      'belt-of-claimed-trophies': { name: "Belt of Claimed Trophies", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00043.webp" },
      'undisputed-champions-belt': { name: "Undisputed Champion's Belt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00044.webp" },
      'entranced-apostles-belt': { name: "Entranced Apostle's Belt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00045.webp" },
      'belt-of-the-knight-master': { name: "Belt of the Knight Master", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00046.webp" },
    },
    ring: {
      'dark-seraph-ring': { name: "Dark Seraph Ring", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00021.webp" },
      'band-of-the-chosen-one': { name: "Band of the Chosen One", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00024.webp" },
      'band-of-the-silent-one': { name: "Band of the Silent One", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00002.webp" },
      'abyssal-grace-band': { name: "Abyssal Grace Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00018.webp" },
      'embossed-granite-band': { name: "Embossed Granite Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00014.webp" },
      'eldritch-ice-band': { name: "Eldritch Ice Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00004.webp" },
      'band-of-universal-power': { name: "Band of Universal Power", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00005.webp" },
      'etched-alabaster-band': { name: "Etched Alabaster Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00003.webp" },
      'amber-dimensional-band': { name: "Amber Dimensional Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00032.webp" },
      'sapphire-dimensional-band': { name: "Sapphire Dimensional Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00033.webp" },
      'solitare-of-purity': { name: "Solitare of Purity", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00020.webp" },
      'honors-promise-signet': { name: "Honor's Promise Signet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00038.webp" },
      'ring-of-eternal-flames': { name: "Ring of Eternal Flames", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00039.webp" },
      'ring-of-celestial-light': { name: "Ring of Celestial Light", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00043.webp" },
      'symbol-of-natures-advance': { name: "Symbol of Nature's Advance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00044.webp" },
      'signet-of-the-treant-lord': { name: "Signet of the Treant Lord", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00034.webp" },
      'sinking-sun-signet': { name: "Sinking Sun Signet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00040.webp" },
      'band-of-ancestors-blood': { name: "Band of Ancestor's Blood", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00041.webp" },
      'runed-band-of-the-black-anvil': { name: "Runed Band of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00042.webp" },
      'signet-of-the-first-snow': { name: "Signet of the First Snow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00036.webp" },
      'ring-of-spirited-desire': { name: "Ring of Spirited Desire", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00045.webp" },
      'band-of-the-resistance-leader': { name: "Band of the Resistance Leader", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00046.webp" },
      'astral-bond': { name: "Astral Bond", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00047.webp" },
      'distant-echoes-band': { name: "Distant Echoes Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00048.webp" },
      'ring-of-stalwart-determination': { name: "Ring of Stalwart Determination", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00049.webp" },
      'coil-of-endless-hunger': { name: "Coil of Endless Hunger", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00050.webp" },
      'ring-of-song-of-punishment': { name: "Ring of Song of Punishment", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00051.webp" },
      'ring-of-divine-instruction': { name: "Ring of Divine Instruction", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00052.webp" },
    },
    bracelet: {
      'bracers-of-unrelenting': { name: "Bracers of Unrelenting", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00004.webp" },
      'ascended-guardian-bracelet': { name: "Ascended Guardian Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00003.webp" },
      'eternal-champion-bindings': { name: "Eternal Champion Bindings", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00001.webp" },
      'abyssal-grace-charm': { name: "Abyssal Grace Charm", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00018.webp" },
      'forged-golden-bangle': { name: "Forged Golden Bangle", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00013.webp" },
      'ancient-saurodoma-bracers': { name: "Ancient Saurodoma Bracers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00010.webp" },
      'gilded-infernal-wristlet': { name: "Gilded Infernal Wristlet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00008.webp" },
      'bracers-of-the-primal-king': { name: "Bracers of the Primal King", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00023.webp" },
      'skillful-shock-bracelet': { name: "Skillful Shock Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00002A.webp" },
      'skillful-corrupted-bracelet': { name: "Skillful Corrupted Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00004A.webp" },
      'skillful-oppress-bracelet': { name: "Skillful Oppress Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00007A.webp" },
      'skillful-charging-bracelet': { name: "Skillful Charging Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00010A.webp" },
      'skillful-silence-bracelet': { name: "Skillful Silence Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00011A.webp" },
      'restraints-of-the-glacial-queen': { name: "Restraints of the Glacial Queen", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00035.webp" },
      'bangle-of-the-clearest-night': { name: "Bangle of the Clearest Night", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00034.webp" },
      'coil-of-the-verdant-sovereign': { name: "Coil of the Verdant Sovereign", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00033.webp" },
      'infernal-demonpact-cuffs': { name: "Infernal Demonpact Cuffs", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00040.webp" },
      'primal-golden-cuffs': { name: "Primal Golden Cuffs", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00042.webp" },
      'bracelet-of-the-violent-undertow': { name: "Bracelet of the Violent Undertow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00041.webp" },
      'barbed-cuffs-of-the-tormentor': { name: "Barbed Cuffs of the Tormentor", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00043.webp" },
      'bracelet-of-agony': { name: "Bracelet of Agony", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00044.webp" },
      'bracelet-of-fractured-worlds': { name: "Bracelet of Fractured Worlds", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00045.webp" },
      'twisted-coil-of-the-enduring': { name: "Twisted Coil of the Enduring", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00046.webp" },
    },
    necklace: {
      'slayers-quicksilver-pendant': { name: "Slayer's Quicksilver Pendant", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00002.webp" },
      'bindings-of-the-unstoppable': { name: "Bindings of the Unstoppable", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00008.webp" },
      'thunderstorm-necklace': { name: "Thunderstorm Necklace", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00023.webp" },
      'abyssal-grace-pendant': { name: "Abyssal Grace Pendant", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00015.webp" },
      'blessed-templar-choker': { name: "Blessed Templar Choker", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00003.webp" },
      'collar-of-decimation': { name: "Collar of Decimation", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00001.webp" },
      'wrapped-coin-necklace': { name: "Wrapped Coin Necklace", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00006.webp" },
      'clasp-of-the-overlord': { name: "Clasp of the Overlord", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00019.webp" },
      'clasp-of-the-conqueror': { name: "Clasp of the Conqueror", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00017.webp" },
      'icy-necklace-of-strength': { name: "Icy Necklace of Strength", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00015.webp" },
      'icy-necklace-of-dexterity': { name: "Icy Necklace of Dexterity", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00011.webp" },
      'icy-necklace-of-wisdom': { name: "Icy Necklace of Wisdom", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00014.webp" },
      'icy-necklace-of-perception': { name: "Icy Necklace of Perception", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00010.webp" },
      'noble-birthright-brooch': { name: "Noble Birthright Brooch", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00035.webp" },
      'collar-of-natures-wrath': { name: "Collar of Nature's Wrath", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00036.webp" },
      'deep-draconic-gorget': { name: "Deep Draconic Gorget", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00041.webp" },
      'death-knell-gorget': { name: "Death Knell Gorget", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00040.webp" },
      'primal-ritual-collar': { name: "Primal Ritual Collar", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00042.webp" },
      'pendant-of-barbaric-rage': { name: "Pendant of Barbaric Rage", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00043.webp" },
      'pendant-of-frozen-tears': { name: "Pendant of Frozen Tears", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00044.webp" },
      'pendant-of-eternal-flames': { name: "Pendant of Eternal Flames", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00045.webp" },
      'lunar-conjunction-necklace': { name: "Lunar Conjunction Necklace", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00046.webp" },
    },
  },
};

const WEAPON_TYPES = Object.keys(ITEM_DATABASE.weapon);
const ARMOR_TYPES: string[] = [];
const ACCESSORY_TYPES = ['earring', 'belt', 'ring', 'bracelet', 'necklace'];

const itemFormSchema = z.object({
  itemCategory: z.string().min(1, "Categoria é obrigatória."),
  weaponType: z.string().optional(),
  armorType: z.string().optional(),
  accessoryType: z.string().optional(),
  selectedItemKey: z.string().min(1, "É obrigatório selecionar um item da lista."),
  itemName: z.string().optional(),
  imageUrl: z.string().optional(),
  trait: z.string().optional(),
  droppedByMemberName: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.itemCategory === 'weapon' && !data.weaponType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de arma é obrigatório.", path: ["weaponType"] });
    }
    if (data.itemCategory === 'accessory' && !data.accessoryType) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tipo de acessório é obrigatório.", path: ["accessoryType"] });
    }
});
type ItemFormValues = z.infer<typeof itemFormSchema>;


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
        <Card className="static-card-container bg-card/80 flex flex-col group transition-all duration-300">
            <CardHeader className={cn("p-2 text-center", rarityBackgrounds[item.rarity])}>
                <h3 className="font-semibold text-white text-sm leading-tight truncate">{item.itemName}</h3>
            </CardHeader>

            <CardContent className="p-2 flex-grow flex flex-col">
                <div className="w-full aspect-square rounded-md flex items-center justify-center p-1 relative transition-all duration-300 bg-muted/20 mb-2">
                    <Image
                        src={item.imageUrl}
                        alt={item.itemName || "Item"}
                        width={150} 
                        height={150}
                        className="object-contain transition-transform duration-300 group-hover:scale-110"
                        data-ai-hint="game item"
                    />
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
                </div>
                
                <Badge className={cn("text-xs w-full justify-center", statusBadgeClasses[item.status])}>{item.status}</Badge>
                
                <div className="mt-auto pt-2 space-y-1 text-center">
                    {item.trait && <p className="text-xs text-muted-foreground truncate" title={item.trait}>{item.trait}</p>}
                    
                    {item.status === 'Disponível' && canStartAuction && (
                        <Button size="sm" variant="outline" className="h-7 text-xs w-full" onClick={() => {
                            const event = new CustomEvent('openAuctionWizard', { detail: item });
                            window.dispatchEvent(event);
                        }}>
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
        defaultValues: { itemCategory: "", selectedItemKey: "" }
    });

    const { watch, reset, setValue, control } = form;
    const watchedItemCategory = watch('itemCategory');
    const watchedWeaponType = watch('weaponType');
    const watchedAccessoryType = watch('accessoryType');
    const watchedArmorType = watch('armorType');
    const watchedSelectedItemKey = watch('selectedItemKey');

    const currentItemOptions = useMemo(() => {
        if (watchedItemCategory === 'weapon' && watchedWeaponType && ITEM_DATABASE.weapon[watchedWeaponType]) {
            return ITEM_DATABASE.weapon[watchedWeaponType];
        }
        if (watchedItemCategory === 'accessory' && watchedAccessoryType && ITEM_DATABASE.accessory[watchedAccessoryType]) {
            return ITEM_DATABASE.accessory[watchedAccessoryType];
        }
        return {};
    }, [watchedItemCategory, watchedWeaponType, watchedArmorType, watchedAccessoryType]);
    
    const selectedItemData = useMemo(() => {
        if (watchedItemCategory === 'weapon' && watchedWeaponType && watchedSelectedItemKey) {
            return ITEM_DATABASE.weapon?.[watchedWeaponType]?.[watchedSelectedItemKey];
        }
        if (watchedItemCategory === 'accessory' && watchedAccessoryType && watchedSelectedItemKey) {
            return ITEM_DATABASE.accessory?.[watchedAccessoryType]?.[watchedSelectedItemKey];
        }
        return null;
    }, [watchedItemCategory, watchedWeaponType, watchedAccessoryType, watchedSelectedItemKey]);

    useEffect(() => {
        if (selectedItemData) {
            setValue('itemName', selectedItemData.name);
            setValue('imageUrl', selectedItemData.imageUrl);
        } else {
            setValue('itemName', '');
            setValue('imageUrl', '');
        }
    }, [selectedItemData, setValue]);

    const onSubmit: SubmitHandler<ItemFormValues> = async (data) => {
        if (!guildId || !currentUser || !data.itemName || !data.imageUrl) {
            toast({ title: "Erro", description: "Dados incompletos para adicionar item.", variant: "destructive"});
            return;
        };
        setIsSubmitting(true);
        
        try {
            const newBankItem: Omit<BankItem, 'id'> = {
                createdAt: serverTimestamp() as Timestamp,
                itemCategory: data.itemCategory,
                weaponType: data.weaponType,
                armorType: data.armorType,
                accessoryType: data.accessoryType,
                itemName: data.itemName,
                trait: data.trait,
                imageUrl: data.imageUrl,
                rarity: 'epic',
                status: 'Disponível',
                droppedByMemberId: currentUser.uid,
                droppedByMemberName: data.droppedByMemberName || currentUser.displayName || 'N/A'
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
    
    useEffect(() => {
        setValue('selectedItemKey', '');
    }, [watchedItemCategory, watchedWeaponType, watchedArmorType, watchedAccessoryType, setValue]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
            <DialogTrigger asChild>
                <Button className="btn-gradient btn-style-secondary"><PackagePlus className="mr-2 h-4 w-4" /> Novo Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Adicionar Item ao Banco da Guilda</DialogTitle>
                    <DialogDescription>Selecione um item pré-definido para adicioná-lo ao banco.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
                        <div className="space-y-4">
                            <FormField name="itemCategory" control={control} render={({ field }) => (
                                <FormItem><FormLabel>Categoria do Item *</FormLabel><Select onValueChange={(val) => { field.onChange(val); setValue('weaponType', undefined); setValue('accessoryType', undefined); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="weapon">Arma</SelectItem><SelectItem value="armor" disabled>Armadura (em breve)</SelectItem><SelectItem value="accessory">Acessório</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )}/>
                            {watchedItemCategory === 'weapon' && <FormField name="weaponType" control={control} render={({ field }) => (<FormItem><FormLabel>Tipo de Arma *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{WEAPON_TYPES.map(t => <SelectItem key={t} value={t} disabled={Object.keys(ITEM_DATABASE.weapon[t] || {}).length === 0}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                            {watchedItemCategory === 'accessory' && <FormField name="accessoryType" control={control} render={({ field }) => (<FormItem><FormLabel>Tipo de Acessório *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{ACCESSORY_TYPES.map(t => <SelectItem key={t} value={t} disabled={Object.keys(ITEM_DATABASE.accessory[t] || {}).length === 0}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                            
                            <FormField
                                control={form.control}
                                name="selectedItemKey"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Item *</FormLabel>
                                    <ScrollArea className="h-64 border rounded-md p-2 bg-muted/20">
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-1">
                                            {Object.entries(currentItemOptions).length > 0 ? (
                                                Object.entries(currentItemOptions).map(([key, itemData]) => (
                                                    <FormItem key={key} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted cursor-pointer has-[:checked]:bg-primary/20 has-[:checked]:border-primary border border-transparent">
                                                        <FormControl>
                                                            <RadioGroupItem value={key} />
                                                        </FormControl>
                                                        <Image src={itemData.imageUrl} alt={itemData.name} width={40} height={40} className="rounded-md bg-purple-900/30 p-1" data-ai-hint="game item"/>
                                                        <FormLabel className="font-normal cursor-pointer flex-1">{itemData.name}</FormLabel>
                                                    </FormItem>
                                                ))
                                            ) : (
                                                <div className="text-center text-muted-foreground py-10 h-full flex items-center justify-center">Selecione uma categoria e tipo acima.</div>
                                            )}
                                        </RadioGroup>
                                    </ScrollArea>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <Label>Prévia do Item</Label>
                            <div className="w-full aspect-square bg-muted/30 rounded-lg flex items-center justify-center p-4 border border-dashed border-purple-500/30 bg-purple-950/20">
                                {selectedItemData ? (
                                    <Image src={selectedItemData.imageUrl} alt={selectedItemData.name} width={128} height={128} data-ai-hint="game item preview"/>
                                ) : (
                                    <ImageIcon className="h-24 w-24 text-muted-foreground"/>
                                )}
                            </div>

                            <FormField name="trait" control={control} render={({ field }) => (<FormItem><FormLabel>Trait</FormLabel><FormControl><Input {...field} placeholder="Ex: Precise, Impenetrable..."/></FormControl><FormMessage /></FormItem>)}/>
                            <FormField name="droppedByMemberName" control={control} render={({ field }) => (<FormItem><FormLabel>Dropado por (opcional)</FormLabel><FormControl><Input {...field} placeholder="Nome do membro"/></FormControl><FormMessage /></FormItem>)}/>
                        </div>
                        
                        <div className="md:col-span-2">
                             <DialogFooter className="pt-4 border-t"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin"/> : "Adicionar Item"}</Button></DialogFooter>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AuctionsTabContent({ guild, guildId, currentUser, canCreateAuctions, bankItems }: { guild: Guild, guildId: string | null, currentUser: UserProfile | null, canCreateAuctions: boolean, bankItems: BankItem[] }) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showNoItemsAlert, setShowNoItemsAlert] = useState(false);
  const [initialItemForWizard, setInitialItemForWizard] = useState<BankItem | null>(null);

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

    const handleOpenWizard = (event: Event) => {
      const customEvent = event as CustomEvent;
      setInitialItemForWizard(customEvent.detail);
      setIsWizardOpen(true);
    };
    
    window.addEventListener('openAuctionWizard', handleOpenWizard);

    return () => {
      unsubscribe();
      window.removeEventListener('openAuctionWizard', handleOpenWizard);
    };
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
    setInitialItemForWizard(null);
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
        initialItem={initialItemForWizard}
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

function AuctionCreationWizard({ isOpen, onOpenChange, guild, guildId, currentUser, bankItems, initialItem }: { isOpen: boolean, onOpenChange: (open: boolean) => void, guild: Guild, guildId: string | null, currentUser: UserProfile | null, bankItems: BankItem[], initialItem: BankItem | null }) {
    const { toast } = useToast();
    const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');
    const [selectedItem, setSelectedItem] = useState<BankItem | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (isOpen && initialItem) {
            setSelectedItem(initialItem);
            setStep('details');
        } else if (isOpen) {
            setStep('select');
        }
    }, [isOpen, initialItem]);

    const [config, setConfig] = useState({
        startBid: 1,
        minIncrement: 1,
        startTime: new Date(),
        endTime: addHours(new Date(), 24),
        roleRestriction: 'Geral' as TLRole | 'Geral',
        weaponRestriction: 'Geral' as TLWeapon | 'Geral',
    });

    const resetWizard = () => {
        setStep('select');
        setSelectedItem(null);
        setConfig({
            startBid: 1,
            minIncrement: 1,
            startTime: new Date(),
            endTime: addHours(new Date(), 24),
            roleRestriction: 'Geral',
            weaponRestriction: 'Geral',
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
            if (initialItem) { 
                resetWizard();
            } else { 
                setSelectedItem(null);
                setStep('select');
            }
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
                roleRestriction: config.roleRestriction,
                weaponRestriction: config.weaponRestriction,
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Lance inicial (DKP)</Label>
                            <Input type="number" value={config.startBid} onChange={(e) => setConfig((c) => ({ ...c, startBid: Number(e.target.value) }))} min="1"/>
                          </div>
                          <div>
                            <Label>Aumento mínimo por lance (DKP)</Label>
                            <Input type="number" value={config.minIncrement} onChange={(e) => setConfig((c) => ({ ...c, minIncrement: Number(e.target.value) }))} min="1"/>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Restrição de Função (Opcional)</Label>
                                <Select onValueChange={(value) => setConfig(c => ({...c, roleRestriction: value as TLRole | 'Geral'}))} value={config.roleRestriction}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Geral"><div className="flex items-center gap-2"><Users className="h-4 w-4"/>Geral (Todos)</div></SelectItem>
                                        <SelectItem value={TLRole.Tank}><div className="flex items-center gap-2"><ShieldLucideIcon className="h-4 w-4 text-sky-500"/>{TLRole.Tank}</div></SelectItem>
                                        <SelectItem value={TLRole.DPS}><div className="flex items-center gap-2"><Swords className="h-4 w-4 text-rose-500"/>{TLRole.DPS}</div></SelectItem>
                                        <SelectItem value={TLRole.Healer}><div className="flex items-center gap-2"><Heart className="h-4 w-4 text-emerald-500"/>{TLRole.Healer}</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Restrição de Arma (Opcional)</Label>
                                <Select onValueChange={(value) => setConfig(c => ({...c, weaponRestriction: value as TLWeapon | 'Geral'}))} value={config.weaponRestriction}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Geral"><div className="flex items-center gap-2"><Users className="h-4 w-4"/>Geral (Todas)</div></SelectItem>
                                        {Object.values(TLWeapon).map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !config.startTime && "text-muted-foreground")}>
                                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                                        {config.startTime ? format(config.startTime, "PP") : <span>Data de início</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={config.startTime} onSelect={(d) => d && setConfig(c => ({...c, startTime: d}))} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !config.endTime && "text-muted-foreground")}>
                                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                                        {config.endTime ? format(config.endTime, "PP") : <span>Data de fim</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={config.endTime} onSelect={(d) => d && setConfig(c => ({...c, endTime: d}))} initialFocus />
                                </PopoverContent>
                            </Popover>
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
                        <p><strong>Restrição de Função:</strong> {config.roleRestriction}</p>
                        <p><strong>Restrição de Arma:</strong> {config.weaponRestriction}</p>
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


