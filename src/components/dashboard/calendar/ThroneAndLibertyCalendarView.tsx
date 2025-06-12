
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export function ThroneAndLibertyCalendarView({ guildId, guildName }: ThroneAndLibertyCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTimePercentage, setCurrentTimePercentage] = useState(0);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week'); 

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
      // Adjust currentWeekEnd to be end of the day for comparison
      const endOfDay_currentWeekEnd = setHours(setMinutes(setSeconds(setMilliseconds(currentWeekEnd, 999), 59), 59), 23);
      return event.guildId === guildId && 
             eventDate >= currentWeekStart && 
             eventDate <= endOfDay_currentWeekEnd;
    });
  }, [guildId, currentWeekStart, currentWeekEnd]);

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,10rem))] bg-card p-4 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <h2 className="text-xl font-semibold text-foreground">{dateRangeText}</h2>
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
          
          {/* Sticky Header Row: Time Gutter Spacer */}
          <div className={cn("sticky top-0 z-30 bg-card h-10 border-b border-r border-border", TIME_GUTTER_WIDTH_CLASS)}>&nbsp;</div>
          
          {/* Sticky Header Row: Day Headers */}
          <div className="sticky top-0 z-20 bg-card grid grid-cols-7">
            {daysInWeek.map(day => (
              <div key={`header-${day.toString()}`} className="h-10 border-b border-r border-border p-2 text-center">
                <div className={cn("text-sm font-medium", isToday(day) ? "text-primary" : "text-foreground")}>
                  {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                </div>
                <div className={cn("text-lg font-semibold", isToday(day) ? "text-primary" : "text-foreground")}>
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
                {format(setHours(new Date(), hour), 'HH:mm')}
              </div>
            ))}
          </div>

          {/* Scrollable Content: Event Cells Grid */}
          <div className="row-start-2 grid grid-cols-7">
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
      </ScrollArea>
    </div>
  );
}
