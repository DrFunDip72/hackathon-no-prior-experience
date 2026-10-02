import type { CampusEvent } from '../types/event';

/** Every date and time in the UI is shown in campus time, whatever zone the browser is in (docs/api.md, "Time zone"). */
export const CAMPUS_TZ = 'America/Denver';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CAMPUS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23'
});

/** Wall-clock parts of an instant on campus. `dayIndex` counts calendar days, so differences are whole days. */
export function campusParts(date: Date) {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  return {
    year,
    month,
    day,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
    dayIndex: Date.UTC(year, month - 1, day) / 86_400_000
  };
}

/** The instant at which campus clocks read the given wall time (DST-aware). */
function fromCampusTime(year: number, month: number, day: number, hour: number, minute: number): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const p = campusParts(new Date(asUtc));
  const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - asUtc;
  return new Date(asUtc - offset);
}

export function getEventTimes(event: CampusEvent): {start: Date;end: Date;} {
  if (event.startAt) {
    const start = new Date(event.startAt);
    return { start, end: new Date(start.getTime() + event.durationMin * 60000) };
  }
  // Sample events: a day offset from today plus a campus wall-clock time.
  const today = campusParts(new Date());
  const day = new Date(Date.UTC(today.year, today.month - 1, today.day + event.dayOffset));
  if (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1); // no Sunday events at BYU
  const [hours, minutes] = event.startTime.split(':').map(Number);
  const start = fromCampusTime(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hours, minutes);
  return { start, end: new Date(start.getTime() + event.durationMin * 60000) };
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function daysFromToday(date: Date): number {
  return campusParts(date).dayIndex - campusParts(new Date()).dayIndex;
}

/** True while the event is under way (it has started and not yet ended). */
export function isHappeningNow(start: Date, end: Date, now = new Date()): boolean {
  return start <= now && now < end;
}

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: CAMPUS_TZ, ...options });
const dayFormatter = fmt({ weekday: 'short', month: 'short', day: 'numeric' });
const monthFormatter = fmt({ month: 'short' });
const dateFormatter = fmt({ day: 'numeric' });
const clockFormatter = fmt({ hour: 'numeric', minute: '2-digit' });
const deadlineFormatter = fmt({ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** "Today", "Tomorrow", or "Fri, Oct 2". */
export function formatDay(date: Date): string {
  const diff = daysFromToday(date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return dayFormatter.format(date);
}

/** "Oct" and "2", for the date badge on event rows. */
export const formatMonth = (date: Date) => monthFormatter.format(date);
export const formatDayOfMonth = (date: Date) => dateFormatter.format(date);

/** "Oct 5, 5:00 PM". */
export const formatDateTime = (date: Date) => deadlineFormatter.format(date);

/** "HH:mm" on campus, for sorting against class schedule blocks. */
export function campusTime(date: Date): string {
  const { hour, minute } = campusParts(date);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** "9:00–11:00 AM", or "11:00 AM–1:00 PM" when the range crosses noon. */
export function formatTimeRange(start: Date, end: Date): string {
  const s = clockFormatter.format(start);
  const e = clockFormatter.format(end);
  const half = (t: string) => t.slice(-2);
  return `${half(s) === half(e) ? s.slice(0, -3) : s}–${e}`;
}

/** "14:30" -> "2:30 PM". A wall-clock string, so no time zone is involved. */
export function formatClock(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}
