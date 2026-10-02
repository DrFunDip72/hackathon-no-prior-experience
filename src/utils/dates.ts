import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import type { CampusEvent } from '../types/event';

export function getEventTimes(event: CampusEvent): {start: Date;end: Date;} {
  if (event.startAt) {
    const start = new Date(event.startAt);
    return { start, end: new Date(start.getTime() + event.durationMin * 60000) };
  }
  let day = addDays(startOfDay(new Date()), event.dayOffset);
  if (day.getDay() === 0) day = addDays(day, 1); // no Sunday events at BYU
  const [hours, minutes] = event.startTime.split(':').map(Number);
  const start = new Date(day);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + event.durationMin * 60000);
  return { start, end };
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function daysFromToday(date: Date): number {
  return differenceInCalendarDays(date, new Date());
}

export function formatDay(date: Date): string {
  const diff = daysFromToday(date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

export function formatTimeRange(start: Date, end: Date): string {
  const sameHalf = format(start, 'a') === format(end, 'a');
  return `${format(start, sameHalf ? 'h:mm' : 'h:mm a')}–${format(end, 'h:mm a')}`;
}

export function formatClock(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, 'h:mm a');
}