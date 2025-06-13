
"use client";

import type { Event as GuildEvent } from '@/types/guildmaster';

// Helper function to parse date and time into a Date object
const parseDateTime = (dateStr: string, timeStr: string): Date => {
  const date = new Date(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Use UTC methods to set hours and minutes to avoid timezone shifts from local time
  // This assumes dateStr is already in a format that new Date() parses as UTC or local but consistently
  // If dateStr is just YYYY-MM-DD, new Date() parses it as UTC. If it includes time/timezone, it's different.
  // For consistency, it's often better to parse components and use Date.UTC or a library.
  // However, for this use case, if event.date is consistently YYYY-MM-DD (from toISOString().split('T')[0]),
  // then new Date(dateStr) will be UTC midnight. Setting local hours/minutes might be fine if display is also local.
  // Let's stick to local time interpretation as it's simpler for now.
  date.setHours(hours, minutes, 0, 0); 
  return date;
};

interface CalendarEventCardProps {
  event: GuildEvent;
  cellHeight: number; // height of a 1-hour cell in px
}

export function CalendarEventCard({ event, cellHeight }: CalendarEventCardProps) {
  const startDateObj = parseDateTime(event.date, event.time);
  const eventStartMinute = startDateObj.getMinutes();
  
  // Calculate top position based on minutes within the hour
  const topPosition = (eventStartMinute / 60) * cellHeight;

  let durationInMinutes: number;

  if (event.endDate && event.endTime) {
    const endDateObj = parseDateTime(event.endDate, event.endTime);
    // Ensure endDateObj is after startDateObj
    if (endDateObj > startDateObj) {
      durationInMinutes = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60);
    } else {
      // Invalid end date/time (e.g., end before start), default to 1 hour
      durationInMinutes = 60;
    }
  } else {
    // Default duration if no explicit end date/time is specified (e.g., 1 hour)
    durationInMinutes = 60; 
  }

  // Ensure a minimum duration for visibility (e.g., 15 minutes)
  const clampedDurationInMinutes = Math.max(15, durationInMinutes);
  
  // Calculate height based on duration
  // If cellHeight is for 60 minutes, then height is (duration / 60) * cellHeight
  const eventHeight = (clampedDurationInMinutes / 60) * cellHeight;

  const displayEndTime = event.endDate && event.endTime ? event.endTime : null;

  return (
    <div
      className="absolute left-1 right-1 bg-primary/70 text-primary-foreground p-1 rounded shadow-md overflow-hidden z-10 cursor-pointer hover:bg-primary"
      style={{
        top: `${topPosition}px`,
        height: `${eventHeight}px`, 
      }}
      title={`${event.title} - ${event.time}${displayEndTime ? ` às ${displayEndTime}` : ''}`}
    >
      <p className="text-xs font-semibold truncate">{event.title}</p>
      <p className="text-xs truncate">{event.time}{displayEndTime ? ` - ${displayEndTime}` : ''}</p>
    </div>
  );
}

