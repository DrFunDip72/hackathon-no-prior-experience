import type { ScoredEvent } from '../types/event';

function toGoogleStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Builds a real, prefilled Google Calendar "create event" link. */
export function googleCalendarUrl(item: ScoredEvent): string {
  const peopleLine = item.people.
  slice(0, 3).
  map((p) => `${p.person.name} (${p.person.title}, ${p.person.org})`).
  join('\n• ');
  const details = [
  item.event.description,
  peopleLine ? `People to meet:\n• ${peopleLine}` : '',
  'Added with Campus Connect'].

  filter(Boolean).
  join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.event.title,
    dates: `${toGoogleStamp(item.start)}/${toGoogleStamp(item.end)}`,
    details,
    location: `${item.event.location}, Brigham Young University, Provo, UT`
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}