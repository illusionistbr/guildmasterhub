
"use client";

import type { Event as GuildEvent } from '@/types/guildmaster';
import { cn } from "@/lib/utils";

// Helper function to parse date and time into a Date object
const parseDateTime = (dateStr: string, timeStr: string): Date => {
  const date = new Date(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0); 
  return date;
};

interface CalendarEventCardProps {
  event: GuildEvent;
  cellHeight: number; // height of a 1-hour cell in px
  onClick?: () => void;
  colorClass?: string; // Added colorClass prop
}

export function CalendarEventCard({ event, cellHeight, onClick, colorClass }: CalendarEventCardProps) {
  const startDateObj = parseDateTime(event.date, event.time);
  const eventStartMinute = startDateObj.getMinutes();
  
  const topPosition = (eventStartMinute / 60) * cellHeight;

  let durationInMinutes: number;

  if (event.endDate && event.endTime) {
    const endDateObj = parseDateTime(event.endDate, event.endTime);
    if (endDateObj > startDateObj) {
      durationInMinutes = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60);
    } else {
      durationInMinutes = 60; // Default to 1 hour if end is before start
    }
  } else {
    durationInMinutes = 60; // Default duration if no end date/time
  }

  const clampedDurationInMinutes = Math.max(15, durationInMinutes); // Min duration of 15 mins for visibility
  const eventHeight = (clampedDurationInMinutes / 60) * cellHeight;

  const displayEndTime = event.endDate && event.endTime ? event.endTime : null;

  const defaultColorClass = "bg-primary/70 text-primary-foreground hover:bg-primary";

  return (
    <div
      className={cn(
        "absolute left-1 right-1 p-1 rounded shadow-md overflow-hidden z-10 cursor-pointer",
        colorClass || defaultColorClass // Apply dynamic color or default
      )}
      style={{
        top: `${topPosition}px`,
        height: `${eventHeight}px`, 
      }}
      title={`${event.title} - ${event.time}${displayEndTime ? ` às ${displayEndTime}` : ''}`}
      onClick={onClick}
    >
      <p className="text-xs font-semibold truncate">{event.title}</p>
      <p className="text-xs truncate">{event.time}{displayEndTime ? ` - ${displayEndTime}` : ''}</p>
    </div>
  );
}
