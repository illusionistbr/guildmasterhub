
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input"; // Added Input import
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  format,
  isToday,
  isSameDay,
  getHours,
  getMinutes,
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
import { cn } from '@/lib/utils';

interface ThroneAndLibertyCalendarViewProps {
  guildId: string;
  guildName: string;
}

const HOVER_CELL_HEIGHT = 60; // px, for 1-hour slots
const TIME_GUTTER_WIDTH_CLASS = "w-16"; // Tailwind class for width

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


export function ThroneAndLibertyCalendarView({ guildId, guildName }: ThroneAndLibertyCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTimePercentage, setCurrentTimePercentage] = useState(0);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week'); 

  // Dialog state
  const [dialogIsOpen, setDialogIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [customActivityName, setCustomActivityName] = useState<string>(""); // For 'Other' category
  const [currentSubcategories, setCurrentSubcategories] = useState<string[]>([]);
  const [currentActivities, setCurrentActivities] = useState<string[]>([]);


  const weekStartsOn = 1; // Monday

  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn });
  const currentWeekEnd = endOfWeek(currentDate, { weekStartsOn });
  const daysInWeek = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const hours = Array.from({ length: 24 }, (_, i) => i); // 00:00 to 23:00

  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const totalMinutesInDay = 24 * 60;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      setCurrentTimePercentage((currentMinutes / totalMinutesInDay) * 100);
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
    return mockEvents.filter(event => {
      const eventDate = new Date(event.date);
      const endOfDay_currentWeekEnd = setHours(setMinutes(setSeconds(setMilliseconds(currentWeekEnd, 999), 59), 59), 23);
      return event.guildId === guildId && 
             eventDate >= currentWeekStart && 
             eventDate <= endOfDay_currentWeekEnd;
    });
  }, [guildId, currentWeekStart, currentWeekEnd]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    
    if (categoryId === 'other') {
      setSelectedActivity(null); 
      setCurrentActivities([]); 
    } else {
      setCustomActivityName(""); 
      setCurrentActivities(TL_ACTIVITIES[categoryId] || []);
    }
    
    setCurrentSubcategories(TL_SUB_CATEGORIES[categoryId] || []);
    if (!TL_SUB_CATEGORIES[categoryId] || TL_SUB_CATEGORIES[categoryId].length === 0) {
        setSelectedActivity(null); 
    }
  };

  const handleSaveActivity = () => {
    let activityToSave = selectedActivity;
    if (selectedCategory === 'other') {
      activityToSave = customActivityName.trim();
      if (!activityToSave) {
        // TODO: Add a toast for validation if needed
        console.warn("Custom activity name cannot be empty for 'Other' category.");
        return; 
      }
    }

    console.log({
      category: selectedCategory,
      subcategory: selectedSubcategory,
      activity: activityToSave,
      // TODO: Add date, time, etc. to the actual event object for saving
    });
    // Reset form and close dialog
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedActivity(null);
    setCustomActivityName("");
    setCurrentSubcategories([]);
    setCurrentActivities([]);
    setDialogIsOpen(false);
  };


  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,10rem))] bg-card p-4 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <div className="flex items-center gap-2">
            <Button onClick={() => setDialogIsOpen(true)} className="form-input">
                <CalendarPlus className="mr-2 h-4 w-4" />
                Nova Atividade
            </Button>
            <h2 className="text-xl font-semibold text-foreground hidden md:block">{dateRangeText}</h2>
        </div>
        <h2 className="text-lg font-semibold text-foreground md:hidden text-center">{dateRangeText}</h2> {/* For mobile */}
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'week'|'day')} disabled>
            <SelectTrigger className="w-[100px] form-input">
              <SelectValue placeholder="Visualizar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleToday} className="form-input">Hoje</Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek} className="form-input"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek} className="form-input"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Calendar Grid Area */}
      <ScrollArea className="flex-1 h-full">
        <div className="grid grid-template-columns-calendar"> {/* Custom grid columns */}
          
          {/* Sticky Header Row: Time Gutter Spacer & Day Headers */}
          <div className={cn("sticky top-0 z-30 bg-card h-10 border-b border-r border-border", TIME_GUTTER_WIDTH_CLASS)}>&nbsp;</div>
          <div className="sticky top-0 z-20 bg-card grid grid-cols-7 col-start-2">
            {daysInWeek.map(day => (
              <div key={`header-${day.toString()}`} className="h-10 border-b border-r border-border p-2 text-center">
                <div className={cn("text-xs font-medium", isToday(day) ? "text-primary" : "text-foreground")}>
                  {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                </div>
                <div className={cn("text-base font-semibold", isToday(day) ? "text-primary" : "text-foreground")}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable Content: Time Labels Column */}
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

          {/* Scrollable Content: Event Cells Grid */}
          <div className="row-start-2 grid grid-cols-7 col-start-2">
            {daysInWeek.map(day => (
              <div key={`event-col-${day.toString()}`} className="relative border-r border-border"> {/* Day Column for events */}
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
                {/* Current Time Indicator for this day */}
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

      {/* Dialog for New Activity */}
      <Dialog open={dialogIsOpen} onOpenChange={(isOpen) => {
        setDialogIsOpen(isOpen);
        if (!isOpen) {
          // Reset form on close
          setSelectedCategory(null);
          setSelectedSubcategory(null);
          setSelectedActivity(null);
          setCustomActivityName("");
          setCurrentSubcategories([]);
          setCurrentActivities([]);
        }
      }}>
        <DialogContent className="sm:max-w-[525px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-headline text-primary">Registrar Nova Atividade</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da atividade para adicioná-la ao calendário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4"> {/* Increased gap for better spacing */}
            {/* Category Select */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right text-foreground">Categoria</Label>
              <Select onValueChange={handleCategoryChange} value={selectedCategory || ""}>
                <SelectTrigger id="category" className="col-span-3 form-input">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {TL_EVENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory Select (conditional) */}
            {selectedCategory && currentSubcategories.length > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="subcategory" className="text-right text-foreground">Subcategoria</Label>
                <Select onValueChange={setSelectedSubcategory} value={selectedSubcategory || ""}>
                  <SelectTrigger id="subcategory" className="col-span-3 form-input">
                    <SelectValue placeholder="Selecione uma subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentSubcategories.map(subcat => (
                      <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Activity/Event Select or Input (conditional) */}
            {selectedCategory && selectedCategory === 'other' ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customActivity" className="text-right text-foreground">Atividade/Evento</Label>
                <Input
                  id="customActivity"
                  className="col-span-3 form-input"
                  placeholder="Digite o nome da atividade"
                  value={customActivityName}
                  onChange={(e) => setCustomActivityName(e.target.value)}
                />
              </div>
            ) : selectedCategory && currentActivities.length > 0 && (
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="activity" className="text-right text-foreground">Atividade/Evento</Label>
                <Select onValueChange={setSelectedActivity} value={selectedActivity || ""}>
                  <SelectTrigger id="activity" className="col-span-3 form-input">
                    <SelectValue placeholder="Selecione uma atividade" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentActivities.map(act => (
                      <SelectItem key={act} value={act}>{act}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Future fields like date/time pickers would go here */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveActivity} className="btn-gradient btn-style-primary">Salvar Atividade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

