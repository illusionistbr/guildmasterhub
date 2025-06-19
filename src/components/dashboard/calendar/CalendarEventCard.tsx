
"use client";

import type { Event as GuildEvent } from '@/types/guildmaster';
import { cn } from "@/lib/utils";

// Helper function to parse date and time into a Date object
const parseDateTime = (dateStr: string, timeStr: string): Date => {
  const date = new Date(dateStr); // This will be UTC midnight if dateStr is YYYY-MM-DD
  const [hours, minutes] = timeStr.split(':').map(Number);
  // To ensure it's treated as local time for calculations if needed, but for display, it's often fine
  date.setHours(hours, minutes, 0, 0); 
  return date;
};

interface CalendarEventCardProps {
  event: GuildEvent;
  cellHeight: number; // height of a 1-hour cell in px
  onClick?: () => void;
  colorClass?: string;
}

export function CalendarEventCard({ event, cellHeight, onClick, colorClass }: CalendarEventCardProps) {
  const startDateObj = parseDateTime(event.date, event.time);
  const startMinuteInHour = startDateObj.getMinutes();
  
  const topPosition = (startMinuteInHour / 60) * cellHeight;

  // Calculate actual total duration of the event
  let actualTotalDurationInMinutes: number;
  if (event.endDate && event.endTime) {
    const endDateObj = parseDateTime(event.endDate, event.endTime);
    if (endDateObj > startDateObj) {
      actualTotalDurationInMinutes = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60);
    } else {
      actualTotalDurationInMinutes = 60; // Default to 1 hour if end is before start or invalid
    }
  } else {
    actualTotalDurationInMinutes = 60; // Default duration if no end date/time
  }

  // Calculate minutes from event start until midnight of the start day
  const eventStartHour = startDateObj.getHours();
  const minutesFromDayStartToEventStart = eventStartHour * 60 + startMinuteInHour;
  const totalMinutesInDay = 24 * 60;
  const minutesFromEventStartToMidnight = totalMinutesInDay - minutesFromDayStartToEventStart;

  // Determine display duration, capped by midnight of the start day
  // Ensure that minutesFromEventStartToMidnight is not negative (e.g. if event starts at 23:59 and lasts 1 min, it should be 1)
  // A value of 0 for minutesFromEventStartToMidnight means the event starts exactly at midnight, should technically show full duration for that day if it fits.
  // If minutesFromEventStartToMidnight is 0 (event starts at 00:00), it means it has full 1440 minutes of the day.
  const effectivelyMinutesFromEventStartToMidnight = minutesFromEventStartToMidnight > 0 ? minutesFromEventStartToMidnight : (minutesFromDayStartToEventStart === 0 ? totalMinutesInDay : 0) ;


  const displayDurationCappedByDay = Math.min(actualTotalDurationInMinutes, effectivelyMinutesFromEventStartToMidnight);
  
  // Ensure a minimum duration for visibility
  const finalDurationForHeight = Math.max(15, displayDurationCappedByDay); 

  const eventHeight = (finalDurationForHeight / 60) * cellHeight;

  const displayEndTime = event.endDate && event.endTime ? event.endTime : null;

  const defaultColorClass = "bg-primary/70 text-primary-foreground hover:bg-primary";

  return (
    <div
      className={cn(
        "absolute left-1 right-1 p-1 rounded shadow-md overflow-hidden z-10 cursor-pointer",
        colorClass || defaultColorClass
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
