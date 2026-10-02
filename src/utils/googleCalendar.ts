import type { ScoredEvent } from '../types/event';
import { CAMPUS_TZ } from './dates';

function toGoogleStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Builds a real, prefilled Google Calendar "create event" link. */
export function googleCalendarUrl(item: ScoredEvent): string {
  const peopleLine = item.people.
  slice(0, 3).
  map((p) => {
    const role = [p.person.title, p.person.org].filter(Boolean).join(', ');
    return role ? `${p.person.name} (${role})` : p.person.name;
  }).
  join('\n• ');
  const details = [
  item.event.description,
  peopleLine ? `People to meet:\n• ${peopleLine}` : '',
  item.event.registrationUrl ? `Register: ${item.event.registrationUrl}` : '',
  item.event.sourceUrl ? `Details: ${item.event.sourceUrl}` : '',
  'Added with Doorway'].

  filter(Boolean).
  join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.event.title,
    dates: `${toGoogleStamp(item.start)}/${toGoogleStamp(item.end)}`,
    details,
    location: `${item.event.location}, Brigham Young University, Provo, UT`,
    // The stamps are UTC instants; ctz makes Google show and save the event in campus time.
    ctz: CAMPUS_TZ
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}