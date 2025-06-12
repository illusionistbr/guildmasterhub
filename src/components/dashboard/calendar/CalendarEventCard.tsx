
"use client";

import type { Event as GuildEvent } from '@/types/guildmaster';
import { getMinutes } from 'date-fns';

interface CalendarEventCardProps {
  event: GuildEvent;
  cellHeight: number; // height of a 1-hour cell in px
}

export function CalendarEventCard({ event, cellHeight }: CalendarEventCardProps) {
  const [eventHour, eventMinute] = event.time.split(':').map(Number);
  
  // Calculate top position based on minutes within the hour
  const topPosition = (eventMinute / 60) * cellHeight;

  // For now, assume events are 1 hour long or fit within the cell.
  // More complex duration spanning multiple cells would require more logic.
  const eventHeight = cellHeight * 0.8; // Example: 80% of cell height

  return (
    <div
      className="absolute left-1 right-1 bg-primary/70 text-primary-foreground p-1 rounded shadow-md overflow-hidden z-10 cursor-pointer hover:bg-primary"
      style={{
        top: `${topPosition}px`,
        height: `${eventHeight}px`, 
      }}
      title={`${event.title} - ${event.time}`}
    >
      <p className="text-xs font-semibold truncate">{event.title}</p>
      <p className="text-xs truncate">{event.time}</p>
    </div>
  );
}
