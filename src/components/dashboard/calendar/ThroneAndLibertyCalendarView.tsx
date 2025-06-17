
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, CalendarPlus, CalendarIcon as CalendarIconLucide, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  format,
  isToday,
  isSameDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  addMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Event as GuildEvent, Guild, GuildMemberRoleInfo } from '@/types/guildmaster';
// GuildRole não é usado, pode ser removido se não houver outros usos.
// import { GuildRole } from '@/types/guildmaster';
import { CalendarEventCard } from './CalendarEventCard';
import { EventPinDialog } from './EventPinDialog';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, addDoc, serverTimestamp, Timestamp, onSnapshot, query as firestoreQuery, orderBy } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface ThroneAndLibertyCalendarViewProps {
  guildId: string;
  guildName: string;
  guild: Guild | null;
}

const HOVER_CELL_HEIGHT = 60; // px, for 1-hour slots
const TIME_GUTTER_WIDTH_CLASS = "w-16";

export const TL_EVENT_CATEGORIES = [
  { id: 'world_event', label: 'World Event' },
  { id: 'world_dungeon', label: 'World Dungeon' },
  { id: 'world_boss', label: 'World Boss' },
  { id: 'arch_boss', label: 'Arch Boss' },
  { id: 'boonstone', label: 'Boonstone' },
  { id: 'riftstone', label: 'Riftstone' },
  { id: 'war', label: 'War' },
  { id: 'siege', label: 'Siege' },
  { id: 'guild_contract', label: 'Guild Contract' },
  { id: 'raid', label: 'Raid' },
  { id: 'tax_delivery', label: 'Tax Delivery' },
  { id: 'war_games', label: 'War Games' },
  { id: 'other', label: 'Other' },
  { id: 'lawless_wilds', label: 'Lawless Wilds' },
];

const TL_SUB_CATEGORIES: Record<string, string[]> = {
  world_event: ['Paz', 'Conflito', 'Guilda'],
  world_boss: ['Paz', 'Conflito', 'Guilda'],
  arch_boss: ['Paz', 'Conflito', 'Guilda'],
};

const TL_ACTIVITIES: Record<string, string[]> = {
  world_event: [
    'Melhor Forma de Prevenir o Pior',
    'Coleta de Cogumelos Sangrentos',
    'Destruidores Sombrios',
    'Caravana do Deserto',
    'Festival do Fogo',
    'Mica Marrom Escondida',
    'Festival da Semente Lanterna',
    'Levantar o Feitiço Lunar',
    'Operação: Entrega de Talismã',
    'Réquiem da Luz',
    'Ritual das Pedras da Luz Estrelar',
    'Impedir o Frenesi de Mana',
    'Para Curar uma Besta Divina',
    'Concurso de Caça ao Lobo',
  ],
  world_dungeon: [
    'Ninho de Formigas', 'Santuário do Desejo', 'Ilha Saurodoma', 'Cripta Sombria',
    'Abismo de Syleus', 'Templo de Sylaveth', 'Templo da Verdade',
    'Propriedade Bercant', 'Mansão Carmesim',
  ],
  world_boss: [
    'Adentus', 'Ahzreil', 'Aridus', 'Bellandir', 'Chernobog', 'Cornelius', 'Daigon',
    'Exodus', 'Grande Aelon', 'Grimturg', 'Junobote', 'Kowazan', 'Leviatã', 'Malakar',
    'Irmãos Manticus', 'Minezerok', 'Morokai', 'Nirma', 'Pakilo Naru', 'Talus', 'Tevent',
  ],
  arch_boss: [
    'Rainha Bellandir', "Espectro de Courte Tevent", 'Deluzhnoa', 'Cordy Gigante',
  ],
  boonstone: [
    'Pedreiro Abandonado', 'Vale Akidu', 'Planícies Uivonegro', 'Floresta Carmesim',
    'Costa da Alvorada', 'Bacia de Fonos', 'Pastos de Centeio Dourado',
    'Floresta Garra Cinzenta', 'Baldios de Mana', 'Deserto Lunar', 'Baldios do Monólito',
    'Território de Ninhada', 'Colinas da Luz Pura', 'Selva Furiosa', 'Ruínas de Turayne',
    'Covil do Verme da Areia', 'Templo Estilhaçado', 'Campos de Urstella',
    'Costas do Vento Sibilante', "Domínio de Quietis",
    'Floresta da Grande Árvore', 'Pântano do Silêncio', 'Forja da Bigorna Negra',
    'Propriedade Bercant', 'Mansão Carmesim',
  ],
  riftstone: [
    'Pedra de Fenda de Adentus', 'Pedra de Fenda de Azhreil', 'Pedra de Fenda de Chernobog',
    'Pedra de Fenda do Escavador', 'Pedra de Fenda do Grande Aelon', 'Pedra de Fenda de Kowazan',
    'Pedra de Fenda de Malakar', 'Pedra de Fenda de Morokai', 'Pedra de Fenda de Talus',
    'Pedra de Fenda de Daigon', 'Pedra de Fenda do Leviatã', 'Pedra de Fenda de Pakilo Naru',
    'Pedra de Fenda dos Irmãos Manticus',
  ],
  war: [
    'Ilha Nebulosa', 'Guerra da Pedra de Fenda', 'Guerra da Pedra de Oferenda',
    'Guerra da Pedra de Fenda/Oferenda', 'Pedra de Fenda Inter-Servidor', 'Pedra de Oferenda Inter-Servidor',
  ],
  siege: [
    'Castelo Guardapedra',
  ],
  guild_contract: [
    'Uma Lâmina para o Criador', 'Contra os Princípios da Natureza', 'Mais um Dia Sobrevivido',
    'Limpeza do Ninho de Formigas', 'Ataque dos Retornados', 'Equilíbrio da Vida',
    'Antes que a Lua Cheia Surja', 'Entre a Vida e a Morte', 'Bênçãos e Maldições',
    'Coletar Areia Dourada', 'Coletar Caudas de Lagarto', 'Vida Criada', 'Ciclo da Vida',
    'Monstros Perigosos', 'Conluio Sombrio', 'Mal Profundamente Enraizado', 'Conspiração Demoníaca',
    'Demônios e Criações', 'Demônios e Descendentes de Deus', "Fúria dos Demônios",
    "Equilíbrio do Ecossistema", 'Eliminar Esporos Perigosos', 'Fim do Abismo',
    'Acabar com o Frenesi de Mana', 'Seres Enfurecidos', 'Seres Mal-Intencionados',
    'Guardiões do Portão de Diabólica', 'Pedras Monumentais para Modelar Gemas', "Criações de Deus",
    'Superpopulação de Insetos', 'Meio do Abismo', 'Semente da Flor Lanterna Lunar',
    "Invasão da Natureza", "Retaliação Impiedosa da Natureza",
    'Noite dos Cadáveres e Pedras Andantes', 'Talento Órquico', 'Protetor de Solisium',
    'Protetor das Planícies', 'Inimigo Público', 'Invadir Santuário',
    'Resolver Depleção de Mana', 'Bestas Ressuscitadas', 'Vingança das Variantes',
    'Selar a Fenda Sombria', 'Cintilante e Brilhante', 'Início do Abismo',
    'Firme Seus Nervos', 'Aço, Aço e Mais Aço!', 'Paz Roubada',
    'Impedir o Crescimento Anormal', 'Impedir a Facção Maligna', 'Oferta e Demanda',
    'Varredura do Santuário', "Filhos de Sylaveth", 'Equipe de Varredura do Templo',
    'O Perigo dos Orcs de Fogo', 'A Malícia que Nunca Dorme',
    'A Pedra de Mana Está Carregando', 'A Roda Fiandeira Gira', 'Expedição à Tumba',
    'Guerra no Reino Intermediário', 'O Que as Bestas Deixam Para Trás', 'Madeira Necessária',
    'Erradicação de Zumbis e Bandidos',
  ],
  raid: [
    'Morokai', 'Escavador-9', 'Chernobog', 'Talus', 'Malakar', 'Cornelius',
    'Ahzreil', 'Minezerok', 'Kowazan', 'Adentus', 'Junobote', 'Grande Aelon',
    'Nirma', 'Aridus',
  ],
  tax_delivery: [
    'Vila Vienta',
  ],
  war_games: [
    'War Games',
  ],
  lawless_wilds: [
    'Ilha Nebulosa',
  ],
};

const ACTIVITY_ICONS: Record<string, string> = {
  'Wolf Hunting Contest': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_WolfHuntingContest_On_Sprite.webp",
  'Festival of Fire': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_FestivalofFire_On_Sprite.webp",
  'Requiem of Light': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_RequiemofLight_On_Sprite.webp",
  'Hidden Brown Mica': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_Phlogopite_On_Sprite.webp",
  'Lantern Seed Festival': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_BellFlowerSeed_001_On_Sprite.webp",
  'Lift the Moonlight Spell': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_Moonlight_On_Sprite.webp",
  'Desert Caravan': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_Caravan_On_Sprite.webp",
  'Operation: Talisman Delivery': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_TalismanMission_001_On_Sprite.webp",
  'Stop the Mana Frenzy': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_Manaflood_On_Sprite.webp",
  'Starlight Stones Ritual': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_StarlightStonesRitual_On_Sprite.webp",
  'Blood Mushroom Gathering': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_Mushroom_On_Sprite.webp",
  'Dark Destroyers': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_DarkDestroyers_On_Sprite.webp",
  'To Heal a Divine Beast': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_HealingTouch_001_On_Sprite.webp",
  'Best Way to Prevent the Worst': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_DE_BestWorst_On_Sprite.webp",
  'Adentus': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_BugbearWarder_On_Sprite.webp",
  'Talus': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_GolemTalus_Target.webp",
  'Grand Aelon': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_SpiritTreeGuardian_On_Sprite.webp",
  'Chernobog': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_BasiliskDarkness_Target.webp",
  'Cornelius': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_LivingArmorCornelus_Target.webp",
  'Junobote': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_LesserDemonJunoboat_Target.webp",
  'Daigon': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_Dagon_On.webp",
  'Morokai': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_ElderTurncoat_Target.webp",
  'Malakar': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_EvilEyeSurveilant_Target.webp",
  'Kowazan': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_LycanthropeNSmuggler_On_Sprite.webp",
  'Minezerok': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_LichMaenZerok_Target.webp",
  'Nirma': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_ElderSema_On_Sprite.webp",
  'Aridus': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_ElderBlathasar_On_Sprite.webp",
  'Ahzreil': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_DeathAzrael_On.webp",
  'Leviathan': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_Leviathan_On.webp",
  'Manticus Brothers': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_Manticus_On.webp",
  'Pakilo Naru': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_PakiloNaru_On.webp",
  'Exodus': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_EvilEyeSurveilant_On_Sprite.webp",
  'Grimturg': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_BugbearWarder_On_Sprite.webp",
  'Bellandir': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_WB_QueenBlendy_On_Sprite.webp",
  'Tevent': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_WB_Tevent_On_Sprite.webp",
  'Queen Bellandir': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_WB_QueenBlendy_On_Sprite.webp",
  "Courte's Wraith Tevent": "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_WB_Tevent_On_Sprite.webp",
  'Giant Cordy': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WB_WB_GiantBroork_On_Sprite.webp",
  'Deluzhnoa': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_WB_DelugeNoah_On_Sprite.webp",
  'Excavator-9': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_FB_KingmineBoom_Target.webp",
  'Vienta village': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/IMG_WoodBeckTaxDelivery_Sprite.webp",
  'Stonegard Castle': "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/Siege/WM_Siege_Stongard_Sprite.webp",
  ...Object.fromEntries(TL_ACTIVITIES.boonstone.map(act => [act, "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_GuildOccupation_Portal_Sprite1.webp"])),
  ...Object.fromEntries(TL_ACTIVITIES.riftstone.map(act => [act, "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_GuildOccupation_Portal_Sprite1.webp"])),
  ...Object.fromEntries(TL_ACTIVITIES.world_dungeon.map(act => [act, 'https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/WM_LandMark_Dungeon_UsePoint_Sprite.webp'])),
  ...Object.fromEntries(TL_ACTIVITIES.guild_contract.map(act => [act, 'https://i.imgur.com/I34gDeO.png'])),
  ...Object.fromEntries(
    Object.values(TL_ACTIVITIES).flat().filter(act => act.toLowerCase().includes("boonstone")).map(act => [act, "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_GuildOccupation_Origin_Sprite1.webp"])
  ),
  ...Object.fromEntries(
    Object.values(TL_ACTIVITIES).flat().filter(act => act.toLowerCase().includes("riftstone")).map(act => [act, "https://cdn.questlog.gg/throne-and-liberty/assets/Game/Image/MapIcon/DE/WM_GuildOccupation_Portal_Sprite1.webp"])
  ),
  'Nebula Island': 'https://i.imgur.com/UdzIUPx.png',
  'War Games': 'https://i.imgur.com/UdzIUPx.png',
};

const SUBCATEGORY_ICONS: Record<string, string> = {
  'Paz': 'https://i.imgur.com/1Q5gZK0.png',
  'Guilda': 'https://i.imgur.com/I34gDeO.png',
  'Conflito': 'https://i.imgur.com/UdzIUPx.png',
};

const hoursArray = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutesArray = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

const parseLocalDateFromString = (dateString: string): Date => {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(Date.UTC(year, month, day));
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  console.error("Invalid date string format for parseLocalDateFromString:", dateString);
  const fallbackDate = new Date(dateString);
  return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate());
};

const getEventColorClass = (event: GuildEvent): string => {
  const category = event.category;
  const subCategory = event.subCategory;
  const title = event.title;

  const baseClasses = "text-white";

  if (category === 'world_event') {
    if (subCategory === 'Paz') return `bg-sky-500/70 hover:bg-sky-600 ${baseClasses}`;
    if (subCategory === 'Conflito') return `bg-red-500/70 hover:bg-red-600 ${baseClasses}`;
    if (subCategory === 'Guilda') return `bg-green-500/70 hover:bg-green-600 ${baseClasses}`;
  }
  if (category === 'world_dungeon') return `bg-yellow-600/70 hover:bg-yellow-700 ${baseClasses}`;
  if (category === 'world_boss' || category === 'arch_boss') {
    if (subCategory === 'Paz') return `bg-blue-500/70 hover:bg-blue-600 ${baseClasses}`;
    if (subCategory === 'Conflito') return `bg-red-500/70 hover:bg-red-600 ${baseClasses}`;
    if (subCategory === 'Guilda') return `bg-green-500/70 hover:bg-green-600 ${baseClasses}`;
  }
  if (category === 'boonstone' || category === 'riftstone') return `bg-gray-500/70 hover:bg-gray-600 ${baseClasses}`;
  if (category === 'war' || title === 'Ilha Nebulosa' || category === 'lawless_wilds' || category === 'war_games' || category === 'raid') {
     return `bg-red-500/70 hover:bg-red-600 ${baseClasses}`;
  }
  if (category === 'siege' || category === 'tax_delivery') return `bg-orange-500/70 hover:bg-orange-600 ${baseClasses}`;
  if (category === 'guild_contract') return `bg-green-500/70 hover:bg-green-600 ${baseClasses}`;
  if (category === 'other') return `bg-purple-500/70 hover:bg-purple-600 ${baseClasses}`;

  return "bg-primary/70 hover:bg-primary text-primary-foreground";
};


export function ThroneAndLibertyCalendarView({ guildId, guildName, guild }: ThroneAndLibertyCalendarViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTimePercentage, setCurrentTimePercentage] = useState(0);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [customActivityName, setCustomActivityName] = useState<string>("");
  const [currentSubcategories, setCurrentSubcategories] = useState<string[]>([]);
  const [currentActivities, setCurrentActivities] = useState<string[]>([]);

  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(undefined);
  const [selectedStartTime, setSelectedStartTime] = useState<string>("00:00");
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);
  const [selectedEndTime, setSelectedEndTime] = useState<string>("00:00");

  const [isMandatory, setIsMandatory] = useState(false);
  const [dkpValueForEvent, setDkpValueForEvent] = useState<number>(0); // Default to 0

  const [activityDescription, setActivityDescription] = useState<string>("");
  const [announcementChannel, setAnnouncementChannel] = useState<string>("Canal Padrão");
  const [announcementTimeOption, setAnnouncementTimeOption] = useState<"instant" | "scheduled">("instant");
  const [announcementTimeValue, setAnnouncementTimeValue] = useState<number>(1);
  const [announcementTimeUnit, setAnnouncementTimeUnit] = useState<"Hrs" | "Mins">("Hrs");
  const [announceOnDiscord, setAnnounceOnDiscord] = useState<boolean>(true);
  const [generatePinCode, setGeneratePinCode] = useState<boolean>(false);

  const [createdEvents, setCreatedEvents] = useState<GuildEvent[]>([]);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [selectedEventForPinDialog, setSelectedEventForPinDialog] = useState<GuildEvent | null>(null);

  const weekStartsOn = 1; // Monday
  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn });
  const currentWeekEnd = endOfWeek(currentDate, { weekStartsOn });
  const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const currentUserRoleInfo = useMemo(() => {
    if (!user || !guild || !guild.roles) return null;
    return guild.roles[user.uid] as GuildMemberRoleInfo | null;
  }, [user, guild]);

  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const totalMinutesInDay = 24 * 60;
      const currentMinutesVal = now.getHours() * 60 + now.getMinutes();
      setCurrentTimePercentage((currentMinutesVal / totalMinutesInDay) * 100);
    };
    updateCurrentTime();
    const intervalId = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!guildId) return;
    const eventsRef = collection(db, `guilds/${guildId}/events`);
    const q = firestoreQuery(eventsRef, orderBy("date", "asc"), orderBy("time", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedEvents: GuildEvent[] = [];
        querySnapshot.forEach((doc) => {
            fetchedEvents.push({ id: doc.id, ...doc.data() } as GuildEvent);
        });
        setCreatedEvents(fetchedEvents);
    }, (error: any) => {
        console.error("Error fetching events: ", error);
        if (error.code === 'failed-precondition' || error.message.toLowerCase().includes('index')) {
            toast({
                title: "Erro ao buscar eventos",
                description: "Um índice necessário para esta consulta não existe. Verifique o console do Firebase para criar o índice.",
                variant: "destructive",
                duration: 10000,
            });
        } else {
            toast({ title: "Erro ao buscar eventos", variant: "destructive" });
        }
    });
    return () => unsubscribe();
  }, [guildId, toast]);


  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const dateRangeText = useMemo(() => {
    const startMonth = format(currentWeekStart, 'MMMM', { locale: ptBR });
    const endMonth = format(currentWeekEnd, 'MMMM', { locale: ptBR });
    if (startMonth === endMonth) {
      return `${format(currentWeekStart, 'd')} - ${format(currentWeekEnd, 'd \'de\' MMMM \'de\' yyyy', { locale: ptBR })}`;
    }
    return `${format(currentWeekStart, 'd \'de\' MMMM', { locale: ptBR })} - ${format(currentWeekEnd, 'd \'de\' MMMM \'de\' yyyy', { locale: ptBR })}`;
  }, [currentWeekStart, currentWeekEnd]);

  const eventsForWeek = useMemo(() => {
    return createdEvents.filter(event => {
      if (!event.date || !event.guildId) return false;
      const eventDateLocal = parseLocalDateFromString(event.date);

      const localWeekStartNormalized = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate());
      const localWeekEndNormalized = new Date(currentWeekEnd.getFullYear(), currentWeekEnd.getMonth(), currentWeekEnd.getDate());

      return event.guildId === guildId &&
             eventDateLocal >= localWeekStartNormalized &&
             eventDateLocal <= localWeekEndNormalized;
    });
  }, [guildId, currentWeekStart, currentWeekEnd, createdEvents]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setSelectedActivity(null);
    setCustomActivityName("");
    setCurrentSubcategories(TL_SUB_CATEGORIES[categoryId] || []);
    if (categoryId === 'other') {
      setCurrentActivities([]);
    } else {
      setCurrentActivities(TL_ACTIVITIES[categoryId] || []);
    }
    // Set default DKP value if system is enabled and a default exists for this category
    if (guild?.dkpSystemEnabled && guild.dkpDefaultsPerCategory && guild.dkpDefaultsPerCategory[categoryId] !== undefined) {
        setDkpValueForEvent(guild.dkpDefaultsPerCategory[categoryId]);
    } else {
        setDkpValueForEvent(0); // Reset to 0 or some other default if no category default
    }
  };

  const combineDateTime = (date: Date, time: string): Date => {
    const [h, m] = time.split(':').map(Number);
    return setHours(setMinutes(setSeconds(setMilliseconds(date, 0), 0), m), h);
  };

 useEffect(() => {
    if (selectedStartDate && selectedStartTime && !selectedEndDate) {
      let defaultDurationMinutes: number | null = null;
      if (selectedCategory === 'world_event') defaultDurationMinutes = 20;
      else if (selectedCategory === 'world_boss') defaultDurationMinutes = 50;
      else if (selectedCategory === 'arch_boss') defaultDurationMinutes = 50;
      else if (selectedCategory === 'boonstone') defaultDurationMinutes = 20;
      else if (selectedCategory === 'riftstone') defaultDurationMinutes = 20;
      else if (selectedCategory === 'siege') defaultDurationMinutes = 55;
      else if (selectedCategory === 'tax_delivery') defaultDurationMinutes = 20;
      else if (selectedCategory === 'war') {
        if (selectedActivity === 'Inter-Server Boonstone' || selectedActivity === 'Inter-Server Riftstone') {
          defaultDurationMinutes = 20;
        }
      }
      if (defaultDurationMinutes !== null) {
        const startTimeObj = combineDateTime(selectedStartDate, selectedStartTime);
        const endTimeObj = addMinutes(startTimeObj, defaultDurationMinutes);
        setSelectedEndDate(endTimeObj);
        setSelectedEndTime(format(endTimeObj, 'HH:mm'));
      }
    }
  }, [selectedCategory, selectedActivity, selectedStartDate, selectedStartTime, selectedEndDate]);

  const formatDateTimeForDisplay = (dateVal: Date | undefined, timeVal: string): string | null => {
    if (!dateVal) return null;
    const combined = combineDateTime(dateVal, timeVal);
    return format(combined, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  };

  const generateNumericPin = (length: number = 6): string => {
    let pin = '';
    for (let i = 0; i < length; i++) {
      pin += Math.floor(Math.random() * 10).toString();
    }
    return pin;
  };

  const handleSaveActivity = async () => {
    let activityTitleToSave = selectedActivity;
    if (selectedCategory === 'other') {
      activityTitleToSave = customActivityName.trim();
    }
    if (!activityTitleToSave || !selectedStartDate || !user || !guild) {
      toast({ title: "Erro", description: "Campos obrigatórios não preenchidos para salvar a atividade.", variant: "destructive" });
      return;
    }

    const activityDataToSave: { [key: string]: any } = {
        guildId: guildId,
        title: activityTitleToSave,
        date: selectedStartDate.toISOString().split('T')[0],
        time: selectedStartTime,
        organizerId: user.uid,
        requiresPin: guild.dkpSystemEnabled ? generatePinCode : false, // Only set requiresPin if DKP system is on
        createdAt: serverTimestamp() as Timestamp,
    };

    if (selectedCategory) activityDataToSave.category = selectedCategory;
    if (selectedSubcategory) activityDataToSave.subCategory = selectedSubcategory;

    const trimmedDescription = activityDescription.trim();
    if (trimmedDescription) activityDataToSave.description = trimmedDescription;

    if (selectedEndDate) {
        activityDataToSave.endDate = selectedEndDate.toISOString().split('T')[0];
        activityDataToSave.endTime = selectedEndTime;
    }

    if (guild.dkpSystemEnabled && dkpValueForEvent > 0) { // Only save DKP if system is enabled
        activityDataToSave.dkpValue = dkpValueForEvent;
    }

    if (guild.dkpSystemEnabled && generatePinCode) { // Only save PIN if system is enabled AND user wants a PIN
        activityDataToSave.pinCode = generateNumericPin(6);
    }

    try {
      const eventsCollectionRef = collection(db, `guilds/${guildId}/events`);
      const docRef = await addDoc(eventsCollectionRef, activityDataToSave);
      toast({ title: "Atividade Salva!", description: `"${activityTitleToSave}" foi adicionado ao calendário.` });

      if (isMandatory && activityTitleToSave && selectedStartDate && guildId && user) {
        const activityDateFormatted = formatDateTimeForDisplay(selectedStartDate, selectedStartTime);
        const notificationMessage = `Nova atividade obrigatória: "${activityTitleToSave}" em ${activityDateFormatted}.`;
        const notificationLink = `/dashboard/calendar?guildId=${guildId}`;
        try {
          const newNotificationRef = await addDoc(collection(db, `guilds/${guildId}/notifications`), {
            guildId: guildId,
            message: notificationMessage,
            link: notificationLink,
            type: "MANDATORY_ACTIVITY_CREATED",
            timestamp: serverTimestamp() as Timestamp,
            details: {
              activityTitle: activityTitleToSave,
              activityDate: activityDateFormatted,
              eventId: docRef.id,
            },
            createdByUserId: user.uid,
            createdByUserDisplayname: user.displayName || user.email,
          });
          console.log("Mandatory activity notification created with ID: ", newNotificationRef.id);
        } catch (error) {
          console.error("Error creating mandatory activity notification:", error);
          toast({ title: "Erro na Notificação", description: "Não foi possível criar a notificação de atividade obrigatória.", variant: "destructive" });
        }
      }
      setDialogIsOpen(false);
      resetDialogStates();
    } catch (error: any) {
        console.error("Error saving activity to Firestore:", error, "Data:", activityDataToSave);
        const errorMessage = error.message || "Não foi possível salvar a atividade no banco de dados.";
        toast({ title: "Erro ao Salvar", description: errorMessage, variant: "destructive"});
    }
  };

  const resetDialogStates = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedActivity(null);
    setCustomActivityName("");
    setCurrentSubcategories([]);
    setCurrentActivities([]);
    setSelectedStartDate(undefined);
    setSelectedStartTime("00:00");
    setSelectedEndDate(undefined);
    setSelectedEndTime("00:00");
    setIsMandatory(false);
    setDkpValueForEvent(0); // Reset to 0
    setActivityDescription("");
    setAnnouncementChannel("Canal Padrão");
    setAnnouncementTimeOption("instant");
    setAnnouncementTimeValue(1);
    setAnnouncementTimeUnit("Hrs");
    setAnnounceOnDiscord(true);
    setGeneratePinCode(false);
  };

  const handleEventCardClick = (event: GuildEvent) => {
    setSelectedEventForPinDialog(event);
    setIsPinDialogOpen(true);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--header-height))] bg-card p-4 rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-y-3 gap-x-2">
        <div className="w-full sm:w-auto order-2 sm:order-1">
          <Button onClick={() => setDialogIsOpen(true)} className="w-full sm:w-auto btn-gradient btn-style-secondary">
            <CalendarPlus className="mr-2 h-4 w-4" />
            Nova Atividade
          </Button>
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground text-center order-first sm:order-2 sm:flex-grow sm:text-center whitespace-nowrap px-2">
          {dateRangeText}
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end order-3">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'week'|'day')} disabled>
            <SelectTrigger className="w-[100px] bg-input border-border">
              <SelectValue placeholder="Visualizar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleToday} className="border-primary text-primary hover:bg-primary/10">Hoje</Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek} className="border-border"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek} className="border-border"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-template-columns-calendar">
        <div className={cn("sticky top-0 z-30 bg-card h-10 border-b border-r border-border", TIME_GUTTER_WIDTH_CLASS)}>&nbsp;</div>
        <div className="sticky top-0 z-20 bg-card grid grid-cols-7 col-start-2">
          {daysInWeek.map(day => (
            <div key={`header-${day.toString()}`} className="h-10 border-b border-r border-border p-2 text-center flex flex-col justify-center">
              <div className={cn("text-xs font-medium", isToday(day) ? "text-primary" : "text-foreground")}>
                {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
              </div>
              <div className={cn("text-base font-semibold", isToday(day) ? "text-primary" : "text-foreground")}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className={cn("row-start-2", TIME_GUTTER_WIDTH_CLASS)}>
          {hours.map(hour => (
            <div
              key={`time-${hour}`}
              className="flex-none text-xs text-muted-foreground text-right pr-2 border-b border-r border-border"
              style={{ height: `${HOVER_CELL_HEIGHT}px`, lineHeight: `${HOVER_CELL_HEIGHT}px` }}
            >
              {format(setHours(setMinutes(new Date(), 0), hour), 'HH:mm')}
            </div>
          ))}
        </div>
        <div className="row-start-2 grid grid-cols-7 col-start-2">
          {daysInWeek.map(day => (
            <div key={`event-col-${day.toString()}`} className="relative border-r border-border">
              {hours.map(hour => {
                const eventsInCell = eventsForWeek.filter(event => {
                    if (!event.date || !event.time) return false;
                    const eventDateLocal = parseLocalDateFromString(event.date);
                    const [eventHourValue] = event.time.split(':').map(Number);
                    return isSameDay(eventDateLocal, day) && eventHourValue === hour;
                  });
                return (
                  <div
                    key={`cell-${day.toString()}-${hour}`}
                    className="border-b border-border relative"
                    style={{ height: `${HOVER_CELL_HEIGHT}px` }}
                  >
                    {eventsInCell.map(event => (
                      <CalendarEventCard
                        key={event.id}
                        event={event}
                        cellHeight={HOVER_CELL_HEIGHT}
                        onClick={() => handleEventCardClick(event)}
                        colorClass={getEventColorClass(event)}
                      />
                    ))}
                  </div>
                );
              })}
              {isToday(day) && (
                <div
                  className="absolute w-full h-0.5 bg-destructive z-10"
                  style={{ top: `${currentTimePercentage}%` }}
                  title={`Hora atual: ${format(new Date(), 'HH:mm')}`}
                >
                  <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-destructive"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogIsOpen} onOpenChange={(isOpen) => {
        setDialogIsOpen(isOpen);
        if (!isOpen) {
          resetDialogStates();
        }
      }}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-4 shrink-0 border-b border-border">
                <DialogTitle className="font-headline text-primary">Registrar Nova Atividade</DialogTitle>
                <DialogDescription>
                    Preencha os detalhes da atividade para adicioná-la ao calendário.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto">
                <div className="px-6 py-4">
                    <TooltipProvider>
                        <div className="grid gap-6">
                            <div className="grid grid-cols-1 gap-y-4">
                                <div>
                                <Label htmlFor="category" className="text-foreground font-semibold mb-1 block">Categoria</Label>
                                <Select onValueChange={handleCategoryChange} value={selectedCategory || ""}>
                                    <SelectTrigger id="category" disabled={!TL_EVENT_CATEGORIES || TL_EVENT_CATEGORIES.length === 0}><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                                    <SelectContent>
                                    {TL_EVENT_CATEGORIES.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                </div>
                                <div>
                                <Label htmlFor="subcategory" className="text-foreground font-semibold mb-1 block">Subcategoria</Label>
                                <Select
                                    onValueChange={setSelectedSubcategory}
                                    value={selectedSubcategory || ""}
                                    disabled={!selectedCategory || currentSubcategories.length === 0}
                                >
                                    <SelectTrigger id="subcategory"><SelectValue placeholder="Selecione (se aplicável)" /></SelectTrigger>
                                    <SelectContent>
                                    {currentSubcategories.map(subcat => (
                                        <SelectItem key={subcat} value={subcat}>
                                          <div className="flex items-center">
                                            {SUBCATEGORY_ICONS[subcat] ? (
                                                <Image
                                                    src={SUBCATEGORY_ICONS[subcat]!}
                                                    alt={`${subcat} icon`}
                                                    width={16}
                                                    height={16}
                                                    className="mr-2"
                                                    data-ai-hint="category icon"
                                                />
                                            ) : null}
                                            <span>{subcat}</span>
                                          </div>
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                </div>
                                {selectedCategory === 'other' ? (
                                <div>
                                    <Label htmlFor="customActivity" className="text-foreground font-semibold mb-1 block">Atividade/Evento</Label>
                                    <Input
                                    id="customActivity"
                                    placeholder="Digite o nome da atividade"
                                    value={customActivityName}
                                    onChange={(e) => setCustomActivityName(e.target.value)}
                                    disabled={selectedCategory !== 'other'}
                                    />
                                </div>
                                ) : (
                                <div>
                                    <Label htmlFor="activity" className="text-foreground font-semibold mb-1 block">Atividade/Evento</Label>
                                    <Select
                                    onValueChange={setSelectedActivity}
                                    value={selectedActivity || ""}
                                    disabled={
                                        selectedCategory === 'other' ||
                                        !selectedCategory ||
                                        (currentSubcategories.length > 0 && !selectedSubcategory && !!TL_SUB_CATEGORIES[selectedCategory || ""]) ||
                                        currentActivities.length === 0
                                    }
                                    >
                                    <SelectTrigger id="activity"><SelectValue placeholder="Selecione uma atividade/evento" /></SelectTrigger>
                                    <SelectContent>
                                        {currentActivities.map(act => (
                                        <SelectItem key={act} value={act}>
                                           <div className="flex items-center">
                                            {ACTIVITY_ICONS[act] ? (
                                                <Image
                                                    src={ACTIVITY_ICONS[act]!}
                                                    alt={`${act} icon`}
                                                    width={16}
                                                    height={16}
                                                    className="mr-2"
                                                    data-ai-hint="activity event"
                                                />
                                            ) : null}
                                            <span>{act}</span>
                                          </div>
                                        </SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                                <div className="space-y-2">
                                <Label htmlFor="start-datetime-trigger" className="text-foreground font-semibold">Data e Hora de Início (Local)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        id="start-datetime-trigger"
                                        variant={"outline"}
                                        className={cn(
                                        "w-full justify-start text-left font-normal h-10 px-3 py-2 rounded-md border border-input bg-background",
                                        !selectedStartDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                                        {formatDateTimeForDisplay(selectedStartDate, selectedStartTime) || <span>Escolha data e hora</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedStartDate}
                                        onSelect={setSelectedStartDate}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                    <div className="p-4 border-t border-border">
                                        <p className="text-sm font-medium mb-2 text-foreground">Horário Início</p>
                                        <div className="flex gap-2">
                                        <Select
                                            value={selectedStartTime.split(':')[0]}
                                            onValueChange={(h) => setSelectedStartTime(`${h.padStart(2, '0')}:${selectedStartTime.split(':')[1]}`)}
                                        >
                                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>{hoursArray.map(h => <SelectItem key={`start-h-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select
                                            value={selectedStartTime.split(':')[1]}
                                            onValueChange={(m) => setSelectedStartTime(`${selectedStartTime.split(':')[0]}:${m.padStart(2, '0')}`)}
                                        >
                                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>{minutesArray.map(m => <SelectItem key={`start-m-${m}`} value={m}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                        </div>
                                    </div>
                                    </PopoverContent>
                                </Popover>
                                <p className="text-xs text-muted-foreground">Selecione data e hora de início no seu fuso horário local.</p>
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="end-datetime-trigger" className="text-foreground font-semibold">Data e Hora de Fim (Opcional)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        id="end-datetime-trigger"
                                        variant={"outline"}
                                        className={cn(
                                        "w-full justify-start text-left font-normal h-10 px-3 py-2 rounded-md border border-input bg-background",
                                        !selectedEndDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIconLucide className="mr-2 h-4 w-4" />
                                        {formatDateTimeForDisplay(selectedEndDate, selectedEndTime) || <span>Escolha data e hora (opcional)</span>}
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedEndDate}
                                        onSelect={setSelectedEndDate}
                                        disabled={(date) => selectedStartDate ? date < selectedStartDate : false}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                    <div className="p-4 border-t border-border">
                                        <p className="text-sm font-medium mb-2 text-foreground">Horário Fim</p>
                                        <div className="flex gap-2">
                                        <Select
                                            value={selectedEndTime.split(':')[0]}
                                            onValueChange={(h) => setSelectedEndTime(`${h.padStart(2, '0')}:${selectedEndTime.split(':')[1]}`)}
                                        >
                                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>{hoursArray.map(h => <SelectItem key={`end-h-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
                                        </Select>
                                        <Select
                                            value={selectedEndTime.split(':')[1]}
                                            onValueChange={(m) => setSelectedEndTime(`${selectedEndTime.split(':')[0]}:${m.padStart(2, '0')}`)}
                                        >
                                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>{minutesArray.map(m => <SelectItem key={`end-m-${m}`} value={m}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                        </div>
                                    </div>
                                    </PopoverContent>
                                </Popover>
                                <p className="text-xs text-muted-foreground">Deixe em branco para usar duração padrão ou se não aplicável.</p>
                                </div>
                            </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                                <div className="space-y-2">
                                    <div className="flex items-center mb-1">
                                        <Label htmlFor="mandatory-switch" className="text-foreground font-semibold">Obrigatório</Label>
                                    </div>
                                    <div className="flex items-center justify-start space-x-2 bg-background px-3 rounded-md border border-input h-10">
                                        <Switch
                                            id="mandatory-switch"
                                            checked={isMandatory}
                                            onCheckedChange={setIsMandatory}
                                        />
                                        <span className="text-sm text-foreground">{isMandatory ? "Sim" : "Não"}</span>
                                    </div>
                                </div>
                                {guild?.dkpSystemEnabled && (
                                <div className="space-y-2">
                                   <div className="flex items-center gap-1 mb-1">
                                        <Label htmlFor="dkpValueForEvent" className="text-foreground font-semibold">Valor de Presença (DKP)</Label>
                                        <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground">
                                            <Info className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="bg-popover text-popover-foreground max-w-xs">
                                            <p>A quantidade de DKP que será concedida aos membros que participarem desta atividade.</p>
                                        </TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input
                                        id="dkpValueForEvent"
                                        type="number"
                                        value={dkpValueForEvent}
                                        onChange={(e) => setDkpValueForEvent(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                        min="0"
                                        className="h-10"
                                    />
                                </div>
                                )}
                            </div>
                            <div className="space-y-4 pt-4">
                                <div>
                                <Label htmlFor="activity-description" className="text-foreground font-semibold mb-1 block">Descrição (Opcional)</Label>
                                <Textarea
                                    id="activity-description"
                                    placeholder="Detalhes adicionais sobre a atividade..."
                                    value={activityDescription}
                                    onChange={(e) => setActivityDescription(e.target.value)}
                                    rows={3}
                                />
                                </div>
                                <div>
                                <div className="flex items-center gap-1 mb-1">
                                    <Label htmlFor="announcement-channel" className="text-foreground font-semibold">Canal de Anúncio</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"><Info className="h-4 w-4" /></Button></TooltipTrigger>
                                        <TooltipContent side="top" className="bg-popover text-popover-foreground max-w-xs"><p>Canal do Discord onde o anúncio do evento será enviado.</p></TooltipContent>
                                    </Tooltip>
                                </div>
                                <Select value={announcementChannel} onValueChange={setAnnouncementChannel}>
                                    <SelectTrigger id="announcement-channel"><SelectValue placeholder="Selecione um canal" /></SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="Canal Padrão">Canal Padrão</SelectItem>
                                    </SelectContent>
                                </Select>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1 mb-1">
                                        <Label className="text-foreground font-semibold">Horário do Anúncio</Label>
                                        <Tooltip>
                                            <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"><Info className="h-4 w-4" /></Button></TooltipTrigger>
                                            <TooltipContent side="top" className="bg-popover text-popover-foreground max-w-xs"><p>Quando o anúncio deve ser enviado no canal do Discord.</p></TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Button
                                            variant={announcementTimeOption === "instant" ? "default" : "outline"}
                                            onClick={() => setAnnouncementTimeOption("instant")}
                                            className={cn("h-10", announcementTimeOption === "instant" && "bg-primary text-primary-foreground")}
                                        >
                                            Enviar Instantaneamente
                                        </Button>
                                        <span className="text-muted-foreground">ou</span>
                                        <Input
                                            type="number"
                                            value={announcementTimeValue}
                                            onChange={(e) => setAnnouncementTimeValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                            onClick={() => setAnnouncementTimeOption("scheduled")}
                                            className={cn("w-20 h-10 text-center", announcementTimeOption === "scheduled" ? "border-primary ring-1 ring-primary" : "")}
                                            min="1"
                                        />
                                        <div className="flex rounded-md border border-input h-10">
                                            <Button
                                                variant={announcementTimeUnit === "Hrs" && announcementTimeOption === "scheduled" ? "default" : "ghost"}
                                                onClick={() => { setAnnouncementTimeUnit("Hrs"); setAnnouncementTimeOption("scheduled"); }}
                                                className={cn("rounded-r-none border-r", announcementTimeUnit === "Hrs" && announcementTimeOption === "scheduled" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted")}
                                            >
                                                Hrs
                                            </Button>
                                            <Button
                                                variant={announcementTimeUnit === "Mins" && announcementTimeOption === "scheduled" ? "default" : "ghost"}
                                                onClick={() => { setAnnouncementTimeUnit("Mins"); setAnnouncementTimeOption("scheduled"); }}
                                                className={cn("rounded-l-none", announcementTimeUnit === "Mins" && announcementTimeOption === "scheduled" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted")}
                                            >
                                                Mins
                                            </Button>
                                        </div>
                                        <span className="text-muted-foreground">antes do evento</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Selecione quanto tempo antes do evento o anúncio deve ser enviado (mínimo 10 minutos se agendado).</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                                    <div className="flex items-center justify-between space-x-2 bg-background px-3 rounded-md border border-input h-10">
                                        <Label htmlFor="announce-discord-switch" className="text-foreground text-sm">Anunciar criação no Discord</Label>
                                        <Switch
                                            id="announce-discord-switch"
                                            checked={announceOnDiscord}
                                            onCheckedChange={setAnnounceOnDiscord}
                                        />
                                    </div>
                                   {guild?.dkpSystemEnabled && (
                                    <div className="flex items-center justify-between space-x-2 bg-background px-3 rounded-md border border-input h-10">
                                        <div className="flex items-center gap-1">
                                            <Label htmlFor="generate-pin-switch" className="text-foreground text-sm">Gerar código PIN</Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"><Info className="h-4 w-4" /></Button></TooltipTrigger>
                                                <TooltipContent side="top" className="bg-popover text-popover-foreground max-w-xs"><p>Gera um código PIN único para os membros usarem para confirmar presença ou para acesso especial ao evento.</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <Switch
                                            id="generate-pin-switch"
                                            checked={generatePinCode}
                                            onCheckedChange={setGeneratePinCode}
                                        />
                                    </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TooltipProvider>
                </div>
            </div>
            <DialogFooter className="p-6 pt-4 border-t border-border shrink-0">
                <Button variant="outline" onClick={() => setDialogIsOpen(false)}>Cancelar</Button>
                <Button
                onClick={handleSaveActivity}
                className="btn-gradient btn-style-primary"
                disabled={
                    !selectedCategory ||
                    (currentSubcategories.length > 0 && !selectedSubcategory && !!TL_SUB_CATEGORIES[selectedCategory || ""]) ||
                    (selectedCategory === 'other' ? !customActivityName.trim() : !selectedActivity) ||
                    !selectedStartDate
                }
                >
                Salvar Atividade
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventPinDialog
        event={selectedEventForPinDialog}
        guild={guild}
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        currentUserRole={currentUserRoleInfo}
        guildId={guildId}
      />
    </div>
  );
}

// Export TL_EVENT_CATEGORIES so it can be imported by settings page
export { TL_EVENT_CATEGORIES as defaultTLEventCategories };

