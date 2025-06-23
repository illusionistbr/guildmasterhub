

"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, doc, getDoc, collection, addDoc, serverTimestamp, query as firestoreQuery, Timestamp, onSnapshot, orderBy, writeBatch, updateDoc, arrayUnion, increment as firebaseIncrement, deleteField, getDocs as getFirestoreDocs, where, ref as storageFirebaseRef, uploadBytes, getDownloadURL, deleteDoc as deleteFirestoreDoc } from '@/lib/firebase';
import type { Guild, UserProfile, BankItem, BankItemStatus, GuildMemberRoleInfo, Auction, AuctionStatus, AuctionBid, RecruitmentQuestion, GuildMember } from '@/types/guildmaster';
import { GuildPermission, TLRole, TLWeapon } from '@/types/guildmaster';
import { hasPermission } from '@/lib/permissions';
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Gem, PackagePlus, Shield as ShieldLucideIcon, Wand2 as Wand2Icon, Bow, Dices, Wrench, Diamond, Sparkles, Package, Tag, CheckSquare, Eye, Users, UserCircle, Shirt, Hand, Footprints, Heart, Search, Filter, Calendar as CalendarIconLucide, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Gavel, MoreHorizontal, ArrowUpDown, Clock, Timer, X, ArrowRight, UserCheck, Armchair, Swords, Trash2, UploadCloud, Axe, ImageIcon } from 'lucide-react';
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
    epic: 'bg-purple-600/60',
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
      "ahzreils-siphoning-sword": { name: "Ahzreil's Siphoning Sword", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00026.webp" },
      "blade-of-fiendish-fortitude": { name: "Blade of Fiendish Fortitude", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00017.webp" },
      "bulwark-of-invulnerability": { name: "Bulwark of Invulnerability", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00016.webp" },
      "bulwark-of-the-black-anvil": { name: "Bulwark of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00049.webp" },
      "chernobogs-blade-of-beheading": { name: "Chernobog's Blade of Beheading", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00033.webp" },
      "corneliuss-animated-edge": { name: "Cornelius's Animated Edge", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00008A.webp" },
      "crimson-doomblade": { name: "Crimson Doomblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00038.webp" },
      "daigons-stormblade": { name: "Daigon's Stormblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00017A.webp" },
      "deluzhnoas-edge-of-eternal-frost": { name: "Deluzhnoa's Edge of Eternal Frost", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00052.webp" },
      "heroic-blade-of-the-resistance": { name: "Heroic Blade of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00032.webp" },
      "karnixs-netherblade": { name: "Karnix's Netherblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00015.webp" },
      "nirmas-sword-of-echoes": { name: "Nirma's Sword of Echoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00035.webp" },
      "queen-bellandirs-languishing-blade": { name: "Queen Bellandir's Languishing Blade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00034.webp" },
      "unshakeable-knights-sword": { name: "Unshakeable Knight's Sword", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword_00010A.webp" },
    },
    Greatsword: {
      "adentuss-gargantuan-greatsword": { name: "Adentus's Gargantuan Greatsword", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00028.webp" },
      "broadsword-of-the-juggernaut": { name: "Broadsword of the Juggernaut", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00014.webp" },
      "celestial-cyclone-warblade": { name: "Celestial Cyclone Warblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00010.webp" },
      "cordys-warblade-of-creeping-doom": { name: "Cordy's Warblade of Creeping Doom", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00052.webp" },
      "duke-magnas-fury-warblade": { name: "Duke Magna's Fury Warblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00031.webp" },
      "duke-magnas-provoking-warblade": { name: "Duke Magna's Provoking Warblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00022.webp" },
      "grayeyes-bloodlust-greatsword": { name: "Grayeye's Bloodlust Greatsword", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00050.webp" },
      "greatblade-of-the-black-anvil": { name: "Greatblade of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00049.webp" },
      "greatsword-of-the-banshee": { name: "Greatsword of the Banshee", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00018.webp" },
      "heroic-broadsword-of-the-resistance": { name: "Heroic Broadsword of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00038.webp" },
      "immortal-titanic-quakeblade": { name: "Immortal Titanic Quakeblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00007.webp" },
      "junobotes-juggernaut-warblade": { name: "Junobote's Juggernaut Warblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00039.webp" },
      "morokais-greatblade-of-corruption": { name: "Morokai's Greatblade of Corruption", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00027.webp" },
      "narus-frenzied-greatblade": { name: "Naru's Frenzied Greatblade", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00034.webp" },
      "tevents-warblade-of-despair": { name: "Tevent's Warblade of Despair", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Sword2h_00036.webp" },
    },
    Dagger: {
      "bercants-whispering-daggers": { name: "Bercant's Whispering Daggers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00034.webp" },
      "blades-of-the-black-anvil": { name: "Blades of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00049.webp" },
      "darkslayer-daggers": { name: "Darkslayer Daggers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00036.webp" },
      "deluzhnoas-permafrost-razors": { name: "Deluzhnoa's Permafrost Razors", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00052.webp" },
      "destiny-binders": { name: "Destiny Binders", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00017.webp" },
      "heroic-daggers-of-the-resistance": { name: "Heroic Daggers of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00013.webp" },
      "kowazans-twilight-daggers": { name: "Kowazan's Twilight Daggers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00037.webp" },
      "lequiruss-wicked-thorns": { name: "Lequirus's Wicked Thorns", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00014.webp" },
      "leviathans-bladed-tendrils": { name: "Leviathan's Bladed Tendrils", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00051.webp" },
      "minezeroks-daggers-of-crippling": { name: "Minezerok's Daggers of Crippling", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00039.webp" },
      "peerless-obsidian-razors": { name: "Peerless Obsidian Razors", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00027.webp" },
      "razorthorn-shredders": { name: "Razorthorn Shredders", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00010.webp" },
      "rex-chimaeruss-fangs": { name: "Rex Chimaerus's Fangs", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00038.webp" },
      "tevents-fangs-of-fury": { name: "Tevent's Fangs of Fury", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Dagger_00035.webp" },
    },
    Bow: {
      "aelons-rejuvenating-longbow": { name: "Aelon's Rejuvenating Longbow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00034.webp" },
      "arc-of-lunar-radiance": { name: "Arc of Lunar Radiance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00007A.webp" },
      "bercants-steelstring-bow": { name: "Bercant's Steelstring Bow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00028.webp" },
      "deluzhnoas-arc-of-frozen-death": { name: "Deluzhnoa's Arc of Frozen Death", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00017.webp" },
      "heroic-longbow-of-the-resistance": { name: "Heroic Longbow of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00030.webp" },
      "karnixs-netherbow": { name: "Karnix's Netherbow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00032.webp" },
      "leviathans-bloodstorm-longbow": { name: "Leviathan's Bloodstorm Longbow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00051.webp" },
      "longbow-of-the-black-anvil": { name: "Longbow of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00049.webp" },
      "longbow-of-the-world-tree": { name: "Longbow of the World Tree", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00020.webp" },
      "mystic-truestrike-longbow": { name: "Mystic Truestrike Longbow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00010.webp" },
      "shaikals-deepmind-longbow": { name: "Shaikal's Deepmind Longbow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00009.webp" },
      "tevents-arc-of-wailing-death": { name: "Tevent's Arc of Wailing Death", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00018.webp" },
      "titanspine-longbow": { name: "Titanspine Longbow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00011.webp" },
      "toubleks-deathmark-longbow": { name: "Toublek's Deathmark Longbow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Bow_00033.webp" },
    },
    Crossbow: {
      "akmans-bloodletting-crossbows": { name: "Akman's Bloodletting Crossbows", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00031.webp" },
      "bercants-spineflower-crossbows": { name: "Bercant's Spineflower Crossbows", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00050.webp" },
      "cordys-stormspore-spike-slingers": { name: "Cordy's Stormspore Spike Slingers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00030.webp" },
      "crossbows-of-infinite-steel": { name: "Crossbows of Infinite Steel", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00028.webp" },
      "crossbows-of-the-black-anvil": { name: "Crossbows of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00049.webp" },
      "crossbows-of-the-darkest-night": { name: "Crossbows of the Darkest Night", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00023.webp" },
      "heroic-crossbows-of-the-resistance": { name: "Heroic Crossbows of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00022.webp" },
      "kowazans-sunflare-crossbows": { name: "Kowazan's Sunflare Crossbows", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00035.webp" },
      "malakars-energizing-crossbows": { name: "Malakar's Energizing Crossbows", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00034.webp" },
      "moonlight-echo-repeaters": { name: "Moonlight Echo Repeaters", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00018.webp" },
      "queen-bellandirs-toxic-spine-throwers": { name: "Queen Bellandir's Toxic Spine Throwers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00033.webp" },
      "rex-chimaeruss-crossbows": { name: "Rex Chimaerus's Crossbows", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00007C.webp" },
      "stormbringer-crossbows": { name: "Stormbringer Crossbows", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00017.webp" },
      "unrelenting-annihilation-crossbows": { name: "Unrelenting Annihilation Crossbows", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Crossbow_00020.webp" },
    },
    Wand: {
      "codex-of-deep-secrets": { name: "Codex of Deep Secrets", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00002B.webp" },
      "cordys-grasp-of-manipulation": { name: "Cordy's Grasp of Manipulation", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00015.webp" },
      "deckmans-balefire-scepter": { name: "Deckman's Balefire Scepter", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00003C.webp" },
      "excavators-mysterious-scepter": { name: "Excavator's Mysterious Scepter", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00012.webp" },
      "forbidden-demonic-lexicon": { name: "Forbidden Demonic Lexicon", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00008B.webp" },
      "heroic-scepter-of-the-resistance": { name: "Heroic Scepter of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00004C.webp" },
      "khanzaizins-valorous-wand": { name: "Khanzaizin's Valorous Wand", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00017.webp" },
      "lequiruss-coveted-tome": { name: "Lequirus's Coveted Tome", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00013.webp" },
      "overture-of-eternal-salvation": { name: "Overture of Eternal Salvation", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00006A.webp" },
      "rod-of-the-black-anvil": { name: "Rod of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00049.webp" },
      "sacred-manuscript": { name: "Sacred Manuscript", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00001C.webp" },
      "shaikals-mindfire-scepter": { name: "Shaikal's Mindfire Scepter", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00014.webp" },
      "tevents-grasp-of-withering": { name: "Tevent's Grasp of Withering", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00011.webp" },
      "tome-of-proximate-remedy": { name: "Tome of Proximate Remedy", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Wand_00008A.webp" },
    },
    Staff: {
      "abyssal-renaissance-foci": { name: "Abyssal Renaissance Foci", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00009.webp" },
      "archstaff-of-the-black-anvil": { name: "Archstaff of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00049.webp" },
      "ariduss-gnarled-voidstaff": { name: "Aridus's Gnarled Voidstaff", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00033.webp" },
      "daigons-charred-emberstaff": { name: "Daigon's Charred Emberstaff", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_staff_00036.webp" },
      "deluzhnoas-ancient-petrified-staff": { name: "Deluzhnoa's Ancient Petrified Staff", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00018A.webp" },
      "ebon-soulwind-archstaff": { name: "Ebon Soulwind Archstaff", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00010.webp" },
      "grayeyes-electrified-staff": { name: "Grayeye's Electrified Staff", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00017A.webp" },
      "heroic-staff-of-the-resistance": { name: "Heroic Staff of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00016.webp" },
      "queen-bellandirs-hivemind-staff": { name: "Queen Bellandir's Hivemind Staff", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00019.webp" },
      "staff-of-enlightened-reform": { name: "Staff of Enlightened Reform", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00031.webp" },
      "staff-of-lucid-light": { name: "Staff of Lucid Light", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00028.webp" },
      "staff-of-the-umbramancer": { name: "Staff of the Umbramancer", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00027.webp" },
      "taluss-crystalline-staff": { name: "Talus's Crystalline Staff", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00032.webp" },
      "toubleks-shattering-quarterstaff": { name: "Toublek's Shattering Quarterstaff", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Staff_00014.webp" },
    },
    Spear: {
      "crimson-hellskewer": { name: "Crimson Hellskewer", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00027.webp" },
      "deluzhnoas-serrated-shard": { name: "Deluzhnoa's Serrated Shard", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00026.webp" },
      "heroic-polearm-of-the-resistance": { name: "Heroic Polearm of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00015.webp" },
      "junobotes-smoldering-ranseur": { name: "Junobote's Smoldering Ranseur", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00021.webp" },
      "narus-sawfang-spear": { name: "Naru's Sawfang Spear", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00030.webp" },
      "polearm-of-the-black-anvil": { name: "Polearm of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00022.webp" },
      "queen-bellandirs-serrated-spike": { name: "Queen Bellandir's Serrated Spike", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00018.webp" },
      "ranseur-of-murderous-glee": { name: "Ranseur of Murderous Glee", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00013.webp" },
      "shaikals-mindveil-harpoon": { name: "Shaikal's Mindveil Harpoon", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00016.webp" },
      "skull-severing-spear": { name: "Skull Severing Spear", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00019.webp" },
      "spear-of-unhinged-horror": { name: "Spear of Unhinged Horror", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00029.webp" },
      "windsheer-spear": { name: "Windsheer Spear", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Weapon/IT_P_Spear_00024.webp" },
    },
  },
  armor: {
    Legs: {
      "arcane-shadow-pants": { name: "Arcane Shadow Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00023.webp" },
      "ardent-heralds-pants": { name: "Ardent Herald's Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00004A.webp" },
      "ascended-guardian-pants": { name: "Ascended Guardian Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00005B.webp" },
      "auric-vanguards-gaiters": { name: "Auric Vanguard's Gaiters", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_05004A.webp" },
      "breeches-of-the-executioner": { name: "Breeches of the Executioner", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00022A.webp" },
      "chosen-vanquishers-trousers": { name: "Chosen Vanquisher's Trousers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_06001A.webp" },
      "divine-justiciar-pants": { name: "Divine Justiciar Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00022.webp" },
      "dread-admirals-trousers": { name: "Dread Admiral's Trousers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00021.webp" },
      "ebon-roar-greaves": { name: "Ebon Roar Greaves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00017.webp" },
      "effortless-victory-greaves": { name: "Effortless Victory Greaves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_PT_00026.webp" },
      "eternal-warlords-greaves": { name: "Eternal Warlord's Greaves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00010.webp" },
      "feral-prophets-pants": { name: "Feral Prophet's Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00014.webp" },
      "first-lights-pants": { name: "First Light's Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00022A.webp" },
      "forgotten-lotus-pants": { name: "Forgotten Lotus Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00008.webp" },
      "gilded-raven-trousers": { name: "Gilded Raven Trousers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00022B.webp" },
      "greaves-of-the-field-general": { name: "Greaves of the Field General", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00018.webp" },
      "greaves-of-the-infernal-herald": { name: "Greaves of the Infernal Herald", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_PT_00019.webp" },
      "hallowed-pants-of-the-resistance": { name: "Hallowed Pants of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_06001A.webp" },
      "heroic-breeches-of-the-resistance": { name: "Heroic Breeches of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00004A.webp" },
      "heroic-greaves-of-the-resistance": { name: "Heroic Greaves of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_06002.webp" },
      "heroic-pants-of-the-resistance": { name: "Heroic Pants of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_06001.webp" },
      "heroic-trousers-of-the-resistance": { name: "Heroic Trousers of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_05003.webp" },
      "immortal-legionnaires-greaves": { name: "Immortal Legionnaire's Greaves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00019A.webp" },
      "imperial-seekers-trousers": { name: "Imperial Seeker's Trousers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00005.webp" },
      "oblivions-wrath-leggings": { name: "Oblivion's Wrath Leggings", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00016.webp" },
      "ossuary-trousers-of-the-resistance": { name: "Ossuary Trousers of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00004B.webp" },
      "paramount-greaves-of-the-resistance": { name: "Paramount Greaves of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_06002A.webp" },
      "phantom-wolf-breeches": { name: "Phantom Wolf Breeches", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_05002.webp" },
      "pristine-primalfang-pants": { name: "Pristine Primalfang Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00026.webp" },
      "royal-praetors-gaiters": { name: "Royal Praetor's Gaiters", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_00006A.webp" },
      "sacred-repose-pants": { name: "Sacred Repose Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00020.webp" },
      "scaled-trousers-of-the-resistance": { name: "Scaled Trousers of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_05003A.webp" },
      "shadow-harvester-trousers": { name: "Shadow Harvester Trousers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00007.webp" },
      "shock-commander-greaves": { name: "Shock Commander Greaves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_PT_05002.webp" },
      "spectral-overseers-trousers": { name: "Spectral Overseer's Trousers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_PT_00023.webp" },
      "swirling-essence-pants": { name: "Swirling Essence Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_PT_00003.webp" },
      "transcendent-tempests-pants": { name: "Transcendent Tempest's Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_PT_00014.webp" },
      "trophy-adorned-leg-guards": { name: "Trophy Adorned Leg Guards", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_PT_00026.webp" },
      "void-stalkers-pants": { name: "Void Stalker's Pants", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_PT_00001D.webp" },
    },
    Feet: {
      "arcane-shadow-shoes": { name: "Arcane Shadow Shoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_06001.webp" },
      "ardent-heralds-shoes": { name: "Ardent Herald's Shoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00012.webp" },
      "ascended-guardian-shoes": { name: "Ascended Guardian Shoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00011.webp" },
      "auric-vanguards-plate-boots": { name: "Auric Vanguard's Plate Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00005A.webp" },
      "boots-of-the-executioner": { name: "Boots of the Executioner", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00022.webp" },
      "boots-of-the-infernal-herald": { name: "Boots of the Infernal Herald", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_BT_00019.webp" },
      "chosen-vanquishers-boots": { name: "Chosen Vanquisher's Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_06001A.webp" },
      "deep-fathom-kicks": { name: "Deep Fathom Kicks", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_BT_00026.webp" },
      "divine-justiciar-shoes": { name: "Divine Justiciar Shoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00014A.webp" },
      "dread-admirals-boots": { name: "Dread Admiral's Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_00021.webp" },
      "ebon-roar-sabatons": { name: "Ebon Roar Sabatons", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00017.webp" },
      "eternal-warlords-sabatons": { name: "Eternal Warlord's Sabatons", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_BT_00003.webp" },
      "feral-prophets-shoes": { name: "Feral Prophet's Shoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00008A.webp" },
      "first-lights-shoes": { name: "First Light's Shoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00022A.webp" },
      "forgotten-lotus-boots": { name: "Forgotten Lotus Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_BT_00008.webp" },
      "gilded-raven-boots": { name: "Gilded Raven Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_00022A.webp" },
      "hallowed-shoes-of-the-resistance": { name: "Hallowed Shoes of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00010A.webp" },
      "heroic-boots-of-the-resistance": { name: "Heroic Boots of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_05003.webp" },
      "heroic-footguards-of-the-resistance": { name: "Heroic Footguards of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_05002.webp" },
      "heroic-sabatons-of-the-resistance": { name: "Heroic Sabatons of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_06002.webp" },
      "heroic-shoes-of-the-resistance": { name: "Heroic Shoes of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00010.webp" },
      "immortal-legionnaires-sabatons": { name: "Immortal Legionnaire's Sabatons", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00019A.webp" },
      "imperial-seekers-boots": { name: "Imperial Seeker's Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_00017.webp" },
      "infernal-demonpact-steps": { name: "Infernal Demonpact Steps", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_BT_00026.webp" },
      "oblivions-wrath-stompers": { name: "Oblivion's Wrath Stompers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00016.webp" },
      "ossuary-boots-of-the-resistance": { name: "Ossuary Boots of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_05002B.webp" },
      "paramount-sabatons-of-the-resistance": { name: "Paramount Sabatons of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_06002A.webp" },
      "phantom-wolf-boots": { name: "Phantom Wolf Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_BT_00005.webp" },
      "royal-praetors-sabatons": { name: "Royal Praetor's Sabatons", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00009.webp" },
      "sabatons-of-the-field-general": { name: "Sabatons of the Field General", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_00018.webp" },
      "sacred-repose-shoes": { name: "Sacred Repose Shoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00020.webp" },
      "scaled-boots-of-the-resistance": { name: "Scaled Boots of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_05003A.webp" },
      "shadow-harvester-boots": { name: "Shadow Harvester Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_BT_00002.webp" },
      "shock-commander-sabatons": { name: "Shock Commander Sabatons", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_BT_05002.webp" },
      "spectral-overseers-boots": { name: "Spectral Overseer's Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_BT_00023.webp" },
      "swirling-essence-shoes": { name: "Swirling Essence Shoes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00008C.webp" },
      "transcendent-tempests-boots": { name: "Transcendent Tempest's Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00014.webp" },
      "violent-demonic-beasts-fur-boots": { name: "Violent Demonic Beast's Fur Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_BT_00026.webp" },
      "void-stalkers-boots": { name: "Void Stalker's Boots", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_BT_00023.webp" },
    },
    Gloves: {
      "arcane-shadow-gloves": { name: "Arcane Shadow Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00005B.webp" },
      "ardent-heralds-gloves": { name: "Ardent Herald's Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00022.webp" },
      "ascended-guardian-gloves": { name: "Ascended Guardian Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00011.webp" },
      "chosen-vanquishers-gloves": { name: "Chosen Vanquisher's Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_06001A.webp" },
      "deep-fathom-grasp": { name: "Deep Fathom Grasp", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_GL_00026.webp" },
      "devious-hellfire-grips": { name: "Devious Hellfire Grips", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_GL_00026.webp" },
      "divine-justiciar-gloves": { name: "Divine Justiciar Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_06001.webp" },
      "dread-admirals-gloves": { name: "Dread Admiral's Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00021.webp" },
      "ebon-roar-gauntlets": { name: "Ebon Roar Gauntlets", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_05001.webp" },
      "eternal-warlords-gauntlets": { name: "Eternal Warlord's Gauntlets", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_00017.webp" },
      "feral-prophets-gloves": { name: "Feral Prophet's Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00014.webp" },
      "first-lights-gloves": { name: "First Light's Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00022A.webp" },
      "forgotten-lotus-gloves": { name: "Forgotten Lotus Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00008.webp" },
      "gauntlets-of-the-field-general": { name: "Gauntlets of the Field General", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_00018.webp" },
      "gauntlets-of-the-infernal-herald": { name: "Gauntlets of the Infernal Herald", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_GL_00019.webp" },
      "gilded-raven-grips": { name: "Gilded Raven Grips", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00022B.webp" },
      "grip-of-the-executioner": { name: "Grip of the Executioner", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_GL_00004.webp" },
      "hallowed-gloves-of-the-resistance": { name: "Hallowed Gloves of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00010A.webp" },
      "heroic-gauntlets-of-the-resistance": { name: "Heroic Gauntlets of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_06002.webp" },
      "heroic-gloves-of-the-resistance": { name: "Heroic Gloves of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_05003.webp" },
      "heroic-grips-of-the-resistance": { name: "Heroic Grips of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_05002.webp" },
      "heroic-mitts-of-the-resistance": { name: "Heroic Mitts of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00010.webp" },
      "immortal-legionnaires-gauntlets": { name: "Immortal Legionnaire's Gauntlets", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_00019A.webp" },
      "imperial-seekers-gloves": { name: "Imperial Seeker's Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00015.webp" },
      "infernal-demonpact-grasp": { name: "Infernal Demonpact Grasp", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_GL_00026.webp" },
      "oblivions-wrath-gauntlets": { name: "Oblivion's Wrath Gauntlets", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_05004.webp" },
      "ossuary-gloves-of-the-resistance": { name: "Ossuary Gloves of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_05002B.webp" },
      "paramount-gauntlets-of-the-resistance": { name: "Paramount Gauntlets of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_06002A.webp" },
      "phantom-wolf-gloves": { name: "Phantom Wolf Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_GL_00001B.webp" },
      "royal-praetors-gauntlets": { name: "Royal Praetor's Gauntlets", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_GL_00006.webp" },
      "sacred-repose-gloves": { name: "Sacred Repose Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_GL_00005B.webp" },
      "scaled-gloves-of-the-resistance": { name: "Scaled Gloves of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_05003A.webp" },
      "shadow-harvester-grips": { name: "Shadow Harvester Grips", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00017A.webp" },
      "shock-commander-gauntlets": { name: "Shock Commander Gauntlets", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_GL_05002.webp" },
      "spectral-overseers-handguards": { name: "Spectral Overseer's Handguards", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_GL_00023.webp" },
      "swirling-essence-gloves": { name: "Swirling Essence Gloves", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00020.webp" },
      "transcendent-tempests-touch": { name: "Transcendent Tempest's Touch", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00014.webp" },
      "void-stalkers-caress": { name: "Void Stalker's Caress", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_GL_00023.webp" },
    },
    Cloak: {
      "ancient-tapestry-mantle": { name: "Ancient Tapestry Mantle", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00016.webp" },
      "bile-drenched-veil": { name: "Bile Drenched Veil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00013.webp" },
      "blessed-templar-cloak": { name: "Blessed Templar Cloak", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00019.webp" },
      "cloak-of-the-frozen-expanse": { name: "Cloak of the Frozen Expanse", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00025.webp" },
      "cloak-of-victorious-destiny": { name: "Cloak of Victorious Destiny", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00002.webp" },
      "eldritch-whispers": { name: "Eldritch Whispers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00008.webp" },
      "emperors-golden-wing": { name: "Emperor's Golden Wing", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00033.webp" },
      "forsaken-embrace": { name: "Forsaken Embrace", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00017.webp" },
      "forward-generals-cloak": { name: "Forward General's Cloak", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00026.webp" },
      "grieving-vengeance-cloak": { name: "Grieving Vengeance Cloak", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00024.webp" },
      "howling-wind-shroud": { name: "Howling Wind Shroud", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00003.webp" },
      "immortal-reckoning": { name: "Immortal Reckoning", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00020.webp" },
      "iron-lords-veil": { name: "Iron Lord's Veil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00034.webp" },
      "opulent-nobles-mantle": { name: "Opulent Noble's Mantle", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00023.webp" },
      "relentless-assault": { name: "Relentless Assault", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00014.webp" },
      "royal-spineflower-drape": { name: "Royal Spineflower Drape", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00021.webp" },
      "starlight-fur-cloak": { name: "Starlight Fur Cloak", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00027.webp" },
      "steadfast-commanders-cape": { name: "Steadfast Commander's Cape", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00015.webp" },
      "supreme-devotion": { name: "Supreme Devotion", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_M_CA_00018.webp" },
    },
    Chest: {
      "arcane-shadow-robes": { name: "Arcane Shadow Robes", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00023.webp" },
      "ardent-heralds-gown": { name: "Ardent Herald's Gown", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00011.webp" },
      "ascended-guardian-raiment": { name: "Ascended Guardian Raiment", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00010.webp" },
      "auric-vanguards-full-plate": { name: "Auric Vanguard's Full Plate", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00005A.webp" },
      "blessed-templar-plate-mail": { name: "Blessed Templar Plate Mail", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_TS_00015.webp" },
      "chosen-vanquishers-armor": { name: "Chosen Vanquisher's Armor", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_06001A.webp" },
      "coat-of-the-executioner": { name: "Coat of the Executioner", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00022.webp" },
      "divine-justiciar-attire": { name: "Divine Justiciar Attire", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_06001.webp" },
      "dread-admirals-uniform": { name: "Dread Admiral's Uniform", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_00021.webp" },
      "eternal-warlords-plate": { name: "Eternal Warlord's Plate", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00017.webp" },
      "feral-prophets-overcoat": { name: "Feral Prophet's Overcoat", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00008.webp" },
      "first-lights-tunic": { name: "First Light's Tunic", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00022A.webp" },
      "forgotten-lotus-garb": { name: "Forgotten Lotus Garb", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_00008.webp" },
      "gilded-raven-tunic": { name: "Gilded Raven Tunic", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_TS_00014A.webp" },
      "golden-blossom-regalia": { name: "Golden Blossom Regalia", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00026.webp" },
      "hallowed-robes-of-the-resistance": { name: "Hallowed Robes of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00005A.webp" },
      "heroic-armor-of-the-resistance": { name: "Heroic Armor of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_06002.webp" },
      "heroic-garb-of-the-resistance": { name: "Heroic Garb of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_05002.webp" },
      "heroic-robes-of-the-resistance": { name: "Heroic Robes of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00005.webp" },
      "heroic-tunic-of-the-resistance": { name: "Heroic Tunic of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_05003.webp" },
      "immortal-legionnaires-armor": { name: "Immortal Legionnaire's Armor", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00019A.webp" },
      "imperial-seekers-tunic": { name: "Imperial Seeker's Tunic", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_00015.webp" },
      "kingslayers-banded-platemail": { name: "Kingslayer's Banded Platemail", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00014A.webp" },
      "oblivions-wrath-chest-plate": { name: "Oblivion's Wrath Chest Plate", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00016.webp" },
      "ossuary-tunic-of-the-resistance": { name: "Ossuary Tunic of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_05002A.webp" },
      "paramount-full-plate-of-the-resistance": { name: "Paramount Full Plate of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_06002A.webp" },
      "phantom-wolf-tunic": { name: "Phantom Wolf Tunic", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_TS_00010.webp" },
      "plate-of-the-field-general": { name: "Plate of the Field General", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_00018.webp" },
      "plate-of-the-infernal-herald": { name: "Plate of the Infernal Herald", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_TS_00019.webp" },
      "royal-praetors-plate-armor": { name: "Royal Praetor's Plate Armor", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_TS_00011.webp" },
      "sacred-repose-garb": { name: "Sacred Repose Garb", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_TS_00004.webp" },
      "scaled-armor-of-the-resistance": { name: "Scaled Armor of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_05003A.webp" },
      "shadow-harvester-tunic": { name: "Shadow Harvester Tunic", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_TS_00013.webp" },
      "shock-commander-plate-armor": { name: "Shock Commander Plate Armor", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_TS_05002.webp" },
      "spectral-overseers-tunic": { name: "Spectral Overseer's Tunic", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_TS_00023.webp" },
      "swirling-essence-robe": { name: "Swirling Essence Robe", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_05001.webp" },
      "transcendent-tempests-armor": { name: "Transcendent Tempest's Armor", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_TS_00014.webp" },
      "void-stalkers-overcoat": { name: "Void Stalker's Overcoat", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_TS_00015A.webp" },
    },
    Head: {
      "arcane-shadow-hat": { name: "Arcane Shadow Hat", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_00022.webp" },
      "ardent-heralds-crown": { name: "Ardent Herald's Crown", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00001.webp" },
      "ascended-guardian-hood": { name: "Ascended Guardian Hood", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_00011A.webp" },
      "auric-vanguards-barbute": { name: "Auric Vanguard's Barbute", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_HM_00014A.webp" },
      "blessed-templar-helmet": { name: "Blessed Templar Helmet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_HM_00016.webp" },
      "chosen-vanquishers-visage": { name: "Chosen Vanquisher's Visage", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_06001A.webp" },
      "crown-of-icebound-infinity": { name: "Crown of Icebound Infinity", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00010.webp" },
      "crowned-skull-of-victory": { name: "Crowned Skull of Victory", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00026.webp" },
      "divine-justiciar-mask": { name: "Divine Justiciar Mask", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_06001.webp" },
      "dread-admirals-bicorne": { name: "Dread Admiral's Bicorne", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_00021.webp" },
      "eternal-warlords-faceguard": { name: "Eternal Warlord's Faceguard", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00012A.webp" },
      "feral-prophets-crown": { name: "Feral Prophet's Crown", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00002.webp" },
      "first-lights-halo": { name: "First Light's Halo", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00006A.webp" },
      "forgotten-lotus-mask": { name: "Forgotten Lotus Mask", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_00008.webp" },
      "gilded-raven-mask": { name: "Gilded Raven Mask", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_00012A.webp" },
      "hallowed-hat-of-the-resistance": { name: "Hallowed Hat of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00005B.webp" },
      "helm-of-the-field-general": { name: "Helm of the Field General", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_00018.webp" },
      "heroic-hat-of-the-resistance": { name: "Heroic Hat of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00005A.webp" },
      "heroic-helmet-of-the-resistance": { name: "Heroic Helmet of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_06002.webp" },
      "heroic-hood-of-the-resistance": { name: "Heroic Hood of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00014.webp" },
      "heroic-tricorne-of-the-resistance": { name: "Heroic Tricorne of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_05003.webp" },
      "immortal-legionnaires-helm": { name: "Immortal Legionnaire's Helm", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_00019A.webp" },
      "imperial-seekers-circlet": { name: "Imperial Seeker's Circlet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00003.webp" },
      "oblivions-wrath-barbute": { name: "Oblivion's Wrath Barbute", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_00016.webp" },
      "ossuary-hood-of-the-resistance": { name: "Ossuary Hood of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00014A.webp" },
      "paramount-visor-of-the-resistance": { name: "Paramount Visor of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_06002A.webp" },
      "phantom-wolf-mask": { name: "Phantom Wolf Mask", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00005.webp" },
      "royal-praetors-visor": { name: "Royal Praetor's Visor", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_HM_00017.webp" },
      "sacred-repose-circle": { name: "Sacred Repose Circle", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00015.webp" },
      "scaled-tricorne-of-the-resistance": { name: "Scaled Tricorne of the Resistance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_LE_M_HM_05003A.webp" },
      "shadow-harvester-mask": { name: "Shadow Harvester Mask", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00008.webp" },
      "shock-commander-visor": { name: "Shock Commander Visor", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_PL_M_HM_05002.webp" },
      "spectral-overseers-mask": { name: "Spectral Overseer's Mask", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00016.webp" },
      "swirling-essence-hat": { name: "Swirling Essence Hat", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_05001.webp" },
      "transcendent-tempests-cowl": { name: "Transcendent Tempest's Cowl", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Set_FA_M_HM_00014.webp" },
      "visage-of-the-executioner": { name: "Visage of the Executioner", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_FA_M_HM_00006.webp" },
      "visage-of-the-infernal-tyrant": { name: "Visage of the Infernal Tyrant", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_PL_M_HM_00026.webp" },
      "visor-of-the-infernal-herald": { name: "Visor of the Infernal Herald", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_set_PL_M_HM_00019.webp" },
      "void-stalkers-mask": { name: "Void Stalker's Mask", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Armor/P_Part_LE_M_HM_00007.webp" },
    },
  },
  accessory: {
    Earrings: {
      "bloodright-earrings": { name: "Bloodbright Earrings", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00004.webp" },
      "brilliant-regal-earrings": { name: "Brilliant Regal Earrings", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00052.webp" },
      "earrings-of-forlorn-elegance": { name: "Earrings of Forlorn Elegance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00051.webp" },
      "earrings-of-glimmering-dew": { name: "Earrings of Glimmering Dew", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00003.webp" },
      "earrings-of-primal-foresight": { name: "Earrings of Primal Foresight", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00002.webp" },
      "gilded-granite-teardrops": { name: "Gilded Granite Teardrops", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Earring_00001.webp" },
    },
    Belt: {
      "belt-of-bloodlust": { name: "Belt of Bloodlust", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00022.webp" },
      "belt-of-claimed-trophies": { name: "Belt of Claimed Trophies", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00043.webp" },
      "belt-of-the-knight-master": { name: "Belt of the Knight Master", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00046.webp" },
      "burnt-silk-warsash": { name: "Burnt Silk Warsash", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00037.webp" },
      "butchers-belt": { name: "Butcher's Belt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00031.webp" },
      "cunning-ogre-girdle": { name: "Cunning Ogre Girdle", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00040.webp" },
      "demonic-beast-kings-belt": { name: "Demonic Beast King's Belt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00018.webp" },
      "elusive-nymph-coil": { name: "Elusive Nymph Coil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00036.webp" },
      "entranced-apostles-belt": { name: "Entranced Apostle's Belt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00045.webp" },
      "flamewrought-bindings": { name: "Flamewrought Bindings", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00019.webp" },
      "forbidden-arcane-chain": { name: "Forbidden Arcane Chain", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00014.webp" },
      "forbidden-eternal-chain": { name: "Forbidden Eternal Chain", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00013.webp" },
      "forbidden-sacred-chain": { name: "Forbidden Sacred Chain", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00015.webp" },
      "girdle-of-spectral-skulls": { name: "Girdle of Spectral Skulls", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00021.webp" },
      "girdle-of-treant-strength": { name: "Girdle of Treant Strength", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00030.webp" },
      "heros-legacy-warbelt": { name: "Hero's Legacy Warbelt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00041.webp" },
      "undisputed-champions-belt": { name: "Undisputed Champion's Belt", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Belt_00044.webp" },
    },
    Ring: {
      "abyssal-grace-band": { name: "Abyssal Grace Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00018.webp" },
      "amber-dimensional-band": { name: "Amber Dimensional Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00032.webp" },
      "astral-bond": { name: "Astral Bond", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00047.webp" },
      "band-of-ancestors-blood": { name: "Band of Ancestor's Blood", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00041.webp" },
      "band-of-the-chosen-one": { name: "Band of the Chosen One", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00024.webp" },
      "band-of-the-resistance-leader": { name: "Band of the Resistance Leader", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00046.webp" },
      "band-of-the-silent-one": { name: "Band of the Silent One", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00002.webp" },
      "band-of-universal-power": { name: "Band of Universal Power", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00005.webp" },
      "coil-of-endless-hunger": { name: "Coil of Endless Hunger", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00050.webp" },
      "dark-seraph-ring": { name: "Dark Seraph Ring", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00021.webp" },
      "distant-echoes-band": { name: "Distant Echoes Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00048.webp" },
      "eldritch-ice-band": { name: "Eldritch Ice Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00004.webp" },
      "embossed-granite-band": { name: "Embossed Granite Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00014.webp" },
      "etched-alabaster-band": { name: "Etched Alabaster Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00003.webp" },
      "honors-promise-signet": { name: "Honor's Promise Signet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00038.webp" },
      "lunar-conjunction-necklace": { name: "Lunar Conjunction Necklace", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00046.webp" },
      "ring-of-celestial-light": { name: "Ring of Celestial Light", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00043.webp" },
      "ring-of-divine-instruction": { name: "Ring of Divine Instruction", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00052.webp" },
      "ring-of-eternal-flames": { name: "Ring of Eternal Flames", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00039.webp" },
      "ring-of-song-of-punishment": { name: "Ring of Song of Punishment", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00051.webp" },
      "ring-of-spirited-desire": { name: "Ring of Spirited Desire", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00045.webp" },
      "ring-of-stalwart-determination": { name: "Ring of Stalwart Determination", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00049.webp" },
      "runed-band-of-the-black-anvil": { name: "Runed Band of the Black Anvil", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00042.webp" },
      "sapphire-dimensional-band": { name: "Sapphire Dimensional Band", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00033.webp" },
      "signet-of-the-first-snow": { name: "Signet of the First Snow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00036.webp" },
      "signet-of-the-treant-lord": { name: "Signet of the Treant Lord", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00034.webp" },
      "sinking-sun-signet": { name: "Sinking Sun Signet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00040.webp" },
      "solitare-of-purity": { name: "Solitare of Purity", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00020.webp" },
      "symbol-of-natures-advance": { name: "Symbol of Nature's Advance", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Ring_00044.webp" },
    },
    Bracelet: {
      "abyssal-grace-charm": { name: "Abyssal Grace Charm", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00018.webp" },
      "ancient-saurodoma-bracers": { name: "Ancient Saurodoma Bracers", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00010.webp" },
      "ascended-guardian-bracelet": { name: "Ascended Guardian Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00003.webp" },
      "bangle-of-the-clearest-night": { name: "Bangle of the Clearest Night", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00034.webp" },
      "barbed-cuffs-of-the-tormentor": { name: "Barbed Cuffs of the Tormentor", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00043.webp" },
      "bracers-of-agony": { name: "Bracers of Agony", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00044.webp" },
      "bracers-of-fractured-worlds": { name: "Bracers of Fractured Worlds", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00045.webp" },
      "bracers-of-the-primal-king": { name: "Bracers of the Primal King", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00023.webp" },
      "bracers-of-the-violent-undertow": { name: "Bracers of the Violent Undertow", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00041.webp" },
      "bracers-of-unrelenting": { name: "Bracers of Unrelenting", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00004.webp" },
      "coil-of-the-verdant-sovereign": { name: "Coil of the Verdant Sovereign", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00033.webp" },
      "eternal-champion-bindings": { name: "Eternal Champion Bindings", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00001.webp" },
      "forged-golden-bangle": { name: "Forged Golden Bangle", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00013.webp" },
      "gilded-infernal-wristlet": { name: "Gilded Infernal Wristlet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00008.webp" },
      "infernal-demonpact-cuffs": { name: "Infernal Demonpact Cuffs", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00040.webp" },
      "primal-golden-cuffs": { name: "Primal Golden Cuffs", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00042.webp" },
      "restraints-of-the-glacial-queen": { name: "Restraints of the Glacial Queen", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00035.webp" },
      "skillful-charging-bracelet": { name: "Skillful Charging Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00010A.webp" },
      "skillful-corrupted-bracelet": { name: "Skillful Corrupted Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00004A.webp" },
      "skillful-oppress-bracelet": { name: "Skillful Oppress Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00007A.webp" },
      "skillful-shock-bracelet": { name: "Skillful Shock Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00002A.webp" },
      "skillful-silence-bracelet": { name: "Skillful Silence Bracelet", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Bracelet_00011A.webp" },
      "twisted-coil-of-the-enduring": { name: "Twisted Coil of the Enduring", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Bracelet_00046.webp" },
    },
    Necklace: {
      "abyssal-grace-pendant": { name: "Abyssal Grace Pendant", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00015.webp" },
      "bindings-of-the-unstoppable": { name: "Bindings of the Unstoppable", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00008.webp" },
      "blessed-templar-choker": { name: "Blessed Templar Choker", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00003.webp" },
      "clasp-of-the-conqueror": { name: "Clasp of the Conqueror", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00017.webp" },
      "clasp-of-the-overlord": { name: "Clasp of the Overlord", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00019.webp" },
      "collar-of-decimation": { name: "Collar of Decimation", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00001.webp" },
      "collar-of-natures-wrath": { name: "Collar of Nature's Wrath", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00036.webp" },
      "death-knell-gorget": { name: "Death Knell Gorget", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00040.webp" },
      "deep-draconic-gorget": { name: "Deep Draconic Gorget", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00041.webp" },
      "icy-necklace-of-dexterity": { name: "Icy Necklace of Dexterity", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00011.webp" },
      "icy-necklace-of-perception": { name: "Icy Necklace of Perception", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00010.webp" },
      "icy-necklace-of-strength": { name: "Icy Necklace of Strength", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00015.webp" },
      "icy-necklace-of-wisdom": { name: "Icy Necklace of Wisdom", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/PC_Necklace_00014.webp" },
      "noble-birthright-brooch": { name: "Noble Birthright Brooch", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00035.webp" },
      "pendant-of-barbaric-rage": { name: "Pendant of Barbaric Rage", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00043.webp" },
      "pendant-of-eternal-flames": { name: "Pendant of Eternal Flames", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00045.webp" },
      "pendant-of-frozen-tears": { name: "Pendant of Frozen Tears", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00044.webp" },
      "primal-ritual-collar": { name: "Primal Ritual Collar", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00042.webp" },
      "slayers-quicksilver-pendant": { name: "Slayer's Quicksilver Pendant", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00002.webp" },
      "thunderstorm-necklace": { name: "Thunderstorm Necklace", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00023.webp" },
      "wrapped-coin-necklace": { name: "Wrapped Coin Necklace", imageUrl: "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/Icon/Item_128/Equip/Acc/IT_P_Necklace_00006.webp" },
    },
  },
};

const WEAPON_TYPES = Object.keys(ITEM_DATABASE.weapon).sort();
const ARMOR_TYPES = Object.keys(ITEM_DATABASE.armor).sort();
const ACCESSORY_TYPES = Object.keys(ITEM_DATABASE.accessory).sort();

const TRAIT_OPTIONS = [
    "Attack Speed",
    "Barbarian Bonus Damage",
    "Bind Chance",
    "Bind Resistance",
    "Buff Duration",
    "Collision Chance",
    "Collision Resistance",
    "Construct Bonus Damage",
    "Cooldown Speed",
    "Critical Hit Chance",
    "Damage Dampening",
    "Debuff Duration",
    "Demon Bonus Damage",
    "Evasion %",
    "Health Regen",
    "Heavy Attack Chance",
    "Hit chance",
    "Magic Damage Boost %",
    "Magic Damage Resistance",
    "Magic Endurance",
    "Magic Evasion",
    "Magic Hit",
    "Mana Cost Efficiency",
    "Mana Regen",
    "Max Health",
    "Max Mana",
    "Max Stamina",
    "Melee Damage Boost %",
    "Melee Damage Resistance",
    "Melee Endurance",
    "Melee Evasion",
    "Movement Speed",
    "Petrification Chance",
    "Petrification Resistance",
    "Range %",
    "Ranged Damage Boost %",
    "Ranged Damage Resistance",
    "Ranged Endurance",
    "Ranged Evasion",
    "Silence Chance",
    "Silence Resistance",
    "Skill Damage Boost",
    "Skill Damage Resistance",
    "Sleep Chance",
    "Sleep Resistance",
    "Stun Chance",
    "Stun Resistance",
    "Undead Bonus Damage",
    "Weaken Chance",
    "Weaken Resistance",
    "Wildking Bonus Damage",
].sort();

const itemFormSchema = z.object({
  itemCategory: z.string().min(1, "Categoria é obrigatória."),
  weaponType: z.string().optional(),
  armorType: z.string().optional(),
  accessoryType: z.string().optional(),
  selectedItemKey: z.string().min(1, "É obrigatório selecionar um item da lista."),
  itemName: z.string().optional(),
  imageUrl: z.string().optional(),
  trait: z.string().min(1, "Trait é obrigatório."),
  droppedByMemberId: z.string().min(1, "É obrigatório selecionar quem obteve o item."),
}).superRefine((data, ctx) => {
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
  
  const [guildMembers, setGuildMembers] = useState<{ uid: string; name: string }[]>([]);

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
        
        if (guildData.roles && guildData.memberIds) {
            const membersList = guildData.memberIds.map(id => {
                const roleInfo = guildData.roles?.[id];
                const name = roleInfo?.characterNickname || `Membro (${id.substring(0, 6)})`;
                return { uid: id, name: name };
            }).sort((a, b) => a.name.localeCompare(b.name));
            setGuildMembers(membersList);
        }

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
                        guildMembers={guildMembers}
                    />
                )}
            </div>

            {loadingBankItems ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {[...Array(ITEMS_PER_PAGE)].map((_, i) => <Skeleton key={i} className="h-52 w-full" />)}
                </div>
            ) : paginatedItems.length > 0 ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
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
            <CardHeader className="p-2 text-center min-h-[56px] flex justify-center items-center">
              <h3 className="font-semibold text-white text-sm leading-tight break-words">{item.itemName}</h3>
            </CardHeader>

            <CardContent className="p-2 flex-grow flex flex-col">
                <div className="w-full aspect-square bg-gradient-to-br from-purple-900/40 to-black/40 rounded-lg flex items-center justify-center p-2 border border-purple-400/50 relative mb-2">
                    <Image
                        src={item.imageUrl}
                        alt={item.itemName || "Item"}
                        width={150} 
                        height={150}
                        className="object-contain"
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
                
                <div className="my-2 space-y-1 text-center text-xs px-1 flex-grow">
                    {item.trait && (
                        <p className="text-muted-foreground break-words" title={item.trait}>
                            <span className="font-bold text-foreground">Trait: </span>
                            {item.trait}
                        </p>
                    )}
                    <p className="text-muted-foreground">
                        <span className="font-bold text-foreground">Drop: </span>
                        {item.droppedByMemberName || 'N/A'}
                    </p>
                    <p className="text-muted-foreground">
                        <span className="font-bold text-foreground">Data: </span>
                        {item.createdAt ? format(item.createdAt.toDate(), "dd/MM/yy") : "N/A"}
                    </p>
                </div>
                
                <div className="mt-auto pt-2 space-y-1 text-center">
                    {item.status === 'Disponível' && canStartAuction && (
                        <Button size="sm" variant="outline" className="h-7 text-xs w-full mt-1" onClick={() => {
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

function NewBankItemDialog({ guildId, currentUser, guildMembers }: { guildId: string | null; currentUser: UserProfile | null, guildMembers: { uid: string, name: string }[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemFormSchema),
        defaultValues: { 
            itemCategory: "", 
            selectedItemKey: "", 
            trait: "", 
            droppedByMemberId: currentUser?.uid
        }
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
        if (watchedItemCategory === 'armor' && watchedArmorType && ITEM_DATABASE.armor[watchedArmorType]) {
            return ITEM_DATABASE.armor[watchedArmorType];
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
        if (watchedItemCategory === 'armor' && watchedArmorType && watchedSelectedItemKey) {
            return ITEM_DATABASE.armor?.[watchedArmorType]?.[watchedSelectedItemKey];
        }
        if (watchedItemCategory === 'accessory' && watchedAccessoryType && watchedSelectedItemKey) {
            return ITEM_DATABASE.accessory?.[watchedAccessoryType]?.[watchedSelectedItemKey];
        }
        return null;
    }, [watchedItemCategory, watchedWeaponType, watchedArmorType, watchedAccessoryType, watchedSelectedItemKey]);

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
        
        const droppedById = data.droppedByMemberId || currentUser.uid;
        const selectedMember = guildMembers.find(m => m.uid === droppedById);
        const droppedByName = selectedMember ? selectedMember.name : (currentUser.displayName || "N/A");

        try {
            const newBankItem: { [key: string]: any } = {
                createdAt: serverTimestamp() as Timestamp,
                itemCategory: data.itemCategory,
                itemName: data.itemName,
                trait: data.trait,
                imageUrl: data.imageUrl,
                rarity: 'epic',
                status: 'Disponível',
                droppedByMemberId: droppedById,
                droppedByMemberName: droppedByName
            };

            if (data.itemCategory === 'weapon' && data.weaponType) newBankItem.weaponType = data.weaponType;
            if (data.itemCategory === 'armor' && data.armorType) newBankItem.armorType = data.armorType;
            if (data.itemCategory === 'accessory' && data.accessoryType) newBankItem.accessoryType = data.accessoryType;
            
            // Clean up undefined fields
            Object.keys(newBankItem).forEach(key => {
                if (newBankItem[key] === undefined) {
                    delete newBankItem[key];
                }
            });


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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Adicionar Item ao Banco da Guilda</DialogTitle>
                    <DialogDescription>Selecione um item pré-definido para adicioná-lo ao banco.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
                        <FormField name="itemCategory" control={control} render={({ field }) => (
                            <FormItem><FormLabel>Categoria do Item *</FormLabel><Select onValueChange={(val) => { field.onChange(val); setValue('weaponType', undefined); setValue('armorType', undefined); setValue('accessoryType', undefined); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="weapon">Arma</SelectItem><SelectItem value="armor">Armadura</SelectItem><SelectItem value="accessory">Acessório</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}/>
                        {watchedItemCategory === 'weapon' && <FormField name="weaponType" control={control} render={({ field }) => (<FormItem><FormLabel>Tipo de Arma *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{WEAPON_TYPES.map(t => <SelectItem key={t} value={t} disabled={Object.keys(ITEM_DATABASE.weapon[t] || {}).length === 0}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
                        {watchedItemCategory === 'armor' && <FormField name="armorType" control={control} render={({ field }) => (<FormItem><FormLabel>Tipo de Armadura *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{ARMOR_TYPES.map(t => <SelectItem key={t} value={t} disabled={Object.keys(ITEM_DATABASE.armor[t] || {}).length === 0}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />}
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
                                            Object.entries(currentItemOptions)
                                                .sort(([, a], [, b]) => a.name.localeCompare(b.name))
                                                .map(([key, itemData]) => (
                                                <FormItem key={key} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted cursor-pointer has-[:checked]:bg-primary/20 has-[:checked]:border-primary border border-transparent">
                                                    <FormControl>
                                                        <RadioGroupItem value={key} />
                                                    </FormControl>
                                                    <div className="w-10 h-10 p-1 rounded-md flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-black/40 border border-purple-400/50">
                                                      <Image src={itemData.imageUrl} alt={itemData.name} width={32} height={32} className="object-contain" data-ai-hint="game item"/>
                                                    </div>
                                                    <FormLabel className="font-normal cursor-pointer flex-1 break-words">{itemData.name}</FormLabel>
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
                        <FormField
                            name="trait"
                            control={control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Trait *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um trait..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {TRAIT_OPTIONS.map((trait) => (
                                                <SelectItem key={trait} value={trait}>
                                                    {trait}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="droppedByMemberId"
                            control={control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Dropado por</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um membro..."/>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {guildMembers.map((member) => (
                                                <SelectItem key={member.uid} value={member.uid}>
                                                    {member.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        Selecione o membro que obteve o item. Por padrão, será você.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <DialogFooter className="pt-4 border-t"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin"/> : "Adicionar Item"}</Button></DialogFooter>
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




