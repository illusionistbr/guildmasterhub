
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mockEvents } from '@/lib/mock-data'; 
import type { Event as GuildEvent } from '@/types/guildmaster';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CalendarEventCard } from './CalendarEventCard';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';
import { db, collection, addDoc, serverTimestamp, Timestamp } from '@/lib/firebase';

interface ThroneAndLibertyCalendarViewProps {
  guildId: string;
  guildName: string;
}

const HOVER_CELL_HEIGHT = 60; // px, for 1-hour slots
const TIME_GUTTER_WIDTH_CLASS = "w-16"; 

const TL_EVENT_CATEGORIES = [
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
  world_event: ['Peace', 'Conflict', 'Guild'],
  world_boss: ['Peace', 'Conflict', 'Guild'],
  arch_boss: ['Peace', 'Conflict', 'Guild'],
};

const TL_ACTIVITIES: Record<string, string[]> = {
  world_event: [
    'Blood Mushroom Gathering', 'Dark Destroyers', 'Desert Caravan', 'Festival of Fire',
    'Hidden Brown Mica', 'Lantern Seed Festival', 'Lift the Moonlight Spell',
    'Operation: Talisman Delivery', 'Requiem of Light', 'Starlight Stones Ritual',
    'Stop the Mana Frenzy', 'Wolf Hunting Contest', "Quietis' Demesne",
    'Forest of the Great Tree', 'Swamp of Silence', 'Black Anvil Forge',
    'Bercant Manor', 'Crimson Manor',
  ],
  world_dungeon: [
    'Ant Nest', 'Sanctum of Desire', 'Saurodoma Island', 'Shadowed Crypt',
    "Syleus's Abyss", 'Temple of Sylaveth', 'Temple of Truth',
    'Bercant Estate', 'Crimson Mansion',
  ],
  world_boss: [
    'Adentus', 'Ahzreil', 'Aridus', 'Bellandir', 'Chernobog', 'Cornelius', 'Daigon',
    'Excavator-9', 'Grand Aelon', 'Junobote', 'Kowazan', 'Malakar', 'Minezerok',
    'Morokai', 'Nirma', 'Talus', 'Tevent', 'Leviathan', 'Pakilo Naru',
    'Manticus Brothers',
  ],
  arch_boss: [
    'Queen Bellandir', "Courte's Wraith Tevent", 'Deluzhnoa', 'Giant Cordy',
  ],
  boonstone: [
    'Abandoned Stonemason', 'Akidu Valley', 'Blackhowl Plains', 'Carmine Forest',
    'Daybreak Shore', 'Fonos Basin', 'Golden Rye Pastures', 'Grayclaw Forest',
    'Manawastes', 'Moonlight Desert', 'Monolith Wastelands', 'Nesting Grounds', 
    'Purelight Hills', 'Raging Wilds', 'Ruins of Turayne', 'Sandworm Lair',
    'Shattered Temple', 'Urstella Fields', 'Windhill Shores', "Quietis' Demesne",
    'Forest of the Great Tree', 'Swamp of Silence', 'Black Anvil Forge',
    'Bercant Manor', 'Crimson Manor',
  ],
  riftstone: [
    'Adentus Riftstone', 'Azhreil Riftstone', 'Chernobog Riftstone',
    'Excavator Riftstone', 'Grand Aelon Riftstone', 'Kowazan Riftstone',
    'Malakar Riftstone', 'Morokai Riftstone', 'Talus Riftstone',
    'Daigon Riftstone', 'Leviathan Riftstone', 'Pakilo Naru Riftstone',
    'Manticus Brothers Riftstone',
  ],
  war: [
    'Nebula Island', 'Riftstone War', 'Boonstone War',
    'Riftstone/Boonstone War', 'Inter-Server Riftstone', 'Inter-Server Boonstone',
  ],
  siege: [
    'Stonegard Castle',
  ],
  guild_contract: [
    'A Blade for the Creator', 'Against the Principles of Nature', 'Another Day Survived',
    'Ant Nest Sweep', 'Attack of the Returned Ones', 'Balance of Life',
    'Before the Full Moon Rises', 'Between Life and Death', 'Blessings and Curses',
    'Collect Golden Sand', 'Collect Lizard Tails', 'Created Life', 'Cycle of Life',
    'Dangerous Monsters', 'Dark Collusion', 'Deep-Rooted Evil', 'Demonic Conspiracy',
    'Demons and Creations', 'Demons and Descendants of God', "Demons' Rampage",
    "Ecosystem's Balance", 'Eliminate Dangerous Spores', 'End of the Abyss',
    'End the Mana Frenzy', 'Enraged Beings', 'Evil-Minded Beings',
    'Gatekeepers of Diabolica', 'Gem-Fashioning Monument Stones', "God's Creations",
    'Insect Overgrowth', 'Middle of the Abyss', 'Moon Lantern Flower Seed',
    "Nature's Invasion", "Nature's Merciless Retort",
    'Night of the Walking Corpses and Stones', 'Orc Talent', 'Protector of Solisium',
    'Protector of the Plains', 'Public Enemy', 'Raid Sanctuary',
    'Resolve Mana Depletion', 'Resurrected Beasts', 'Revenge of the Variants',
    'Seal the Dark Rift', 'Sparkling and Shining', 'Start of the Abyss',
    'Steel Your Nerves', 'Steel, Steel, and More Steel!', 'Stolen Peace',
    'Stop the Abnormal Growth', 'Stop the Evil Faction', 'Supply and Demand',
    'Sweep Sanctuary', "Sylaveth's Children", 'Temple Sweep Team',
    'The Danger of Fire Orcs', 'The Malice that Never Sleeps',
    'The Manastone is Charging', 'The Spinning Wheel Spins', 'Tomb Expedition',
    'War in the Middle Realm', 'What Beasts Leave Behind', 'Wood Needed',
    'Zombie and Bandit Eradication',
  ],
  raid: [
    'Morokai', 'Excavator-9', 'Chernobog', 'Talus', 'Malakar', 'Cornelius',
    'Ahzreil', 'Minezerok', 'Kowazan', 'Adentus', 'Junobote', 'Grand Aelon',
    'Nirma', 'Aridus',
  ],
  tax_delivery: [
    'Vienta village',
  ],
  war_games: [
    'War Games',
  ],
  lawless_wilds: [
    'Nebula Island',
  ],
};

const hoursArray = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutesArray = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));


export function ThroneAndLibertyCalendarView({ guildId, guildName }: ThroneAndLibertyCalendarViewProps) {
  const { user } = useAuth();
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
  const [attendanceValue, setAttendanceValue] = useState<number>(1);

  const [activityDescription, setActivityDescription] = useState<string>("");
  const [announcementChannel, setAnnouncementChannel] = useState<string>("Canal Padrão");
  const [announcementTimeOption, setAnnouncementTimeOption] = useState<"instant" | "scheduled">("instant");
  const [announcementTimeValue, setAnnouncementTimeValue] = useState<number>(1);
  const [announcementTimeUnit, setAnnouncementTimeUnit] = useState<"Hrs" | "Mins">("Hrs");
  const [announceOnDiscord, setAnnounceOnDiscord] = useState<boolean>(true);
  const [generatePinCode, setGeneratePinCode] = useState<boolean>(false);

  const [createdEvents, setCreatedEvents] = useState<GuildEvent[]>([]);

  const weekStartsOn = 1; // Monday

  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn });
  const currentWeekEnd = endOfWeek(currentDate, { weekStartsOn });
  const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const hours = Array.from({ length: 24 }, (_, i) => i); 

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
    const allEvents = [...mockEvents, ...createdEvents];
    return allEvents.filter(event => {
      const eventDate = new Date(event.date);
      const endOfDay_currentWeekEnd = setHours(setMinutes(setSeconds(setMilliseconds(currentWeekEnd, 999), 59), 59), 23);
      return event.guildId === guildId && 
             eventDate >= currentWeekStart && 
             eventDate <= endOfDay_currentWeekEnd;
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
  };

  const combineDateTime = (date: Date, time: string): Date => {
    const [h, m] = time.split(':').map(Number);
    return setHours(setMinutes(setSeconds(setMilliseconds(date, 0), 0), m), h);
  };

  const formatDateTimeForDisplay = (dateVal: Date | undefined, timeVal: string): string | null => {
    if (!dateVal) return null;
    const combined = combineDateTime(dateVal, timeVal);
    return format(combined, "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
  };
  
  const handleSaveActivity = async () => {
    let activityTitleToSave = selectedActivity;
    if (selectedCategory === 'other') {
      activityTitleToSave = customActivityName.trim();
    }

    if (!activityTitleToSave || !selectedStartDate || !user) {
      // Add validation feedback to the user if necessary
      console.error("Missing required fields to save activity.");
      return;
    }
    
    const newActivity: GuildEvent = {
      id: `evt-${new Date().getTime()}-${Math.random().toString(36).substr(2, 9)}`, // Simple unique ID
      guildId: guildId,
      title: activityTitleToSave,
      description: activityDescription,
      date: selectedStartDate.toISOString(), // Store as ISO string
      time: selectedStartTime, // HH:mm format
      organizerId: user.uid,
      // location: undefined, // Add if/when a location field is implemented
      // attendeeIds: [], // Initialize if needed
    };

    setCreatedEvents(prevEvents => [...prevEvents, newActivity]);

    console.log("New activity to be (conceptually) saved:", {
      category: selectedCategory,
      subcategory: selectedSubcategory,
      activity: activityTitleToSave,
      startDate: format(selectedStartDate, "yyyy-MM-dd"),
      startTime: selectedStartTime,
      endDate: selectedEndDate ? format(selectedEndDate, "yyyy-MM-dd") : null,
      endTime: selectedEndTime,
      isMandatory,
      attendanceValue,
      activityDescription,
      announcementChannel,
      announcementTimeOption,
      announcementTimeValue,
      announcementTimeUnit,
      announceOnDiscord,
      generatePinCode,
      guildId: guildId, 
    });
    
    // TODO: Integrate with Firebase to save the event
    // For example:
    // try {
    //   await addDoc(collection(db, `guilds/${guildId}/events`), { ...newActivity, createdAt: serverTimestamp() });
    //   // Show success toast
    // } catch (error) {
    //   // Show error toast
    // }

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
          },
          createdByUserId: user.uid,
          createdByUserDisplayname: user.displayName || user.email,
        });
        console.log("Mandatory activity notification created with ID: ", newNotificationRef.id);
      } catch (error) {
        console.error("Error creating mandatory activity notification:", error);
      }
    }
    
    setDialogIsOpen(false);
    // Resetting states is now handled by onOpenChange of Dialog
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
    setAttendanceValue(1);
    setActivityDescription("");
    setAnnouncementChannel("Canal Padrão");
    setAnnouncementTimeOption("instant");
    setAnnouncementTimeValue(1);
    setAnnouncementTimeUnit("Hrs");
    setAnnounceOnDiscord(true);
    setGeneratePinCode(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,10rem))] bg-card p-4 rounded-lg shadow-lg">
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

      <ScrollArea className="flex-1 h-full">
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
                      const eventDate = new Date(event.date);
                      const [eventHourValue] = event.time.split(':').map(Number);
                      return isSameDay(eventDate, day) && eventHourValue === hour;
                    });
                  return (
                    <div
                      key={`cell-${day.toString()}-${hour}`}
                      className="border-b border-border relative"
                      style={{ height: `${HOVER_CELL_HEIGHT}px` }}
                    >
                      {eventsInCell.map(event => (
                        <CalendarEventCard key={event.id} event={event} cellHeight={HOVER_CELL_HEIGHT} />
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
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      <Dialog open={dialogIsOpen} onOpenChange={(isOpen) => {
        setDialogIsOpen(isOpen);
        if (!isOpen) { 
          resetDialogStates();
        }
      }}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle className="font-headline text-primary">Registrar Nova Atividade</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da atividade para adicioná-la ao calendário.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6"> {/* Inner div for padding */}
              <TooltipProvider>
                <div className="grid gap-6 py-4">
                  {/* Category, Subcategory, Activity */}
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
                            <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
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
                              <SelectItem key={act} value={act}>{act}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {/* Date and Time Pickers */}
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

                  {/* Mandatory and Attendance Value */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                     <div className="space-y-2">
                      <Label htmlFor="mandatory-switch" className="text-foreground font-semibold">Obrigatório</Label>
                      <div className="flex items-center justify-start space-x-2 bg-background px-3 py-2 rounded-md border border-input h-10">
                        <Switch
                          id="mandatory-switch"
                          checked={isMandatory}
                          onCheckedChange={setIsMandatory}
                        />
                        <span className="text-sm text-foreground">{isMandatory ? "Sim" : "Não"}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label htmlFor="attendance-value" className="text-foreground font-semibold">Valor de Presença</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground">
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-popover text-popover-foreground max-w-xs">
                            <p>A quantidade de pontos de atividade e DKP que serão concedidos aos membros que participarem desta atividade.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="attendance-value"
                        type="number"
                        value={attendanceValue}
                        onChange={(e) => setAttendanceValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        min="0"
                        className="h-10"
                      />
                    </div>
                  </div>
                  
                  {/* New Fields from Image */}
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="activity-description" className="text-foreground font-semibold mb-1 block">Descrição (Opcional)</Label>
                      <Textarea
                        id="activity-description"
                        placeholder="Descrição da atividade..."
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
                          {/* TODO: Populate with actual Discord channels if integration exists */}
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
                        <div className="flex items-center justify-between space-x-2 bg-background px-3 py-2 rounded-md border border-input h-10">
                            <Label htmlFor="announce-discord-switch" className="text-foreground text-sm">Anunciar criação no Discord</Label>
                            <Switch
                                id="announce-discord-switch"
                                checked={announceOnDiscord}
                                onCheckedChange={setAnnounceOnDiscord}
                            />
                        </div>
                        <div className="flex items-center justify-between space-x-2 bg-background px-3 py-2 rounded-md border border-input h-10">
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
                    </div>

                  </div>
                </div>
              </TooltipProvider>
            </div>
          </ScrollArea>
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
    </div>
  );
}

