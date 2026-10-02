/**
 * GET /api/calendar  (public URL: /calendar.ics, rewritten in vercel.json)
 *
 * An iCalendar (RFC 5545) feed of upcoming Doorway events, for "Subscribe in Google Calendar"
 * on the Events page (Apple Calendar and Outlook take the same URL). It is the same for everyone:
 * career events from the events API (Railway) from today through 60 days out, no profile ranking.
 * "Career" = see isCareerEvent: the general BYU calendar also carries lectures, devotional-style talks and socials.
 * Google re-fetches subscribed feeds on its own schedule (often every few hours or longer).
 *
 * Responses:
 *   200 text/calendar
 *   502 the events API failed. Deliberately not an empty calendar, which would wipe subscribers' events.
 */

const API_URL = (process.env.VITE_API_URL || 'https://doorway-api-production-db29.up.railway.app').replace(/\/+$/, '');
const SITE_EVENTS_URL = 'https://byu-doorway.vercel.app/events';
const WINDOW_DAYS = 60;
const TIMEOUT_MS = 10_000;

interface ApiEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  companies: string[] | null;
  source: string;
  type: string;
  description: string | null;
  source_url: string | null;
  registration_url: string | null;
}

/** Career Services and CS department events always; general BYU calendar events only when a company comes or it's an info session or fair. */
function isCareerEvent(e: ApiEvent): boolean {
  if (e.source !== 'byu_calendar') return true;
  return (e.companies?.length ?? 0) > 0 || e.type === 'info_session' || e.type === 'career_fair';
}

/** 2026-10-02T14:00:00.000Z -> 20261002T140000Z */
function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** TEXT value escaping (RFC 5545 3.3.11). */
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n|\r/g, '\\n');
}

/** Folds a content line at 75 octets without splitting a UTF-8 character (RFC 5545 3.1). */
function fold(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8');
    if (bytes + size > 75) {
      parts.push(current);
      current = ' '; // continuation lines start with one space, which counts toward their 75
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

function vevent(event: ApiEvent, stamp: string): string[] {
  const start = new Date(event.start_at);
  // The events API treats a missing end as one hour long.
  const end = event.end_at ? new Date(event.end_at) : new Date(start.getTime() + 60 * 60 * 1000);
  const details = [
    event.description?.trim(),
    event.companies?.length ? `Companies: ${event.companies.join(', ')}` : '',
    `More BYU career events: ${SITE_EVENTS_URL}`
  ].filter(Boolean).join('\n\n');
  const url = event.registration_url || event.source_url;
  return [
    'BEGIN:VEVENT',
    `UID:${event.id}@byu-doorway`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `DESCRIPTION:${escapeText(details)}`,
    ...(url ? [`URL:${url}`] : []),
    'END:VEVENT'
  ];
}

export async function GET(): Promise<Response> {
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const to = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let events: ApiEvent[];
  try {
    const res = await fetch(`${API_URL}/events?from=${from}&to=${to}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`events API ${res.status}`);
    events = (await res.json()) as ApiEvent[];
    if (!Array.isArray(events)) throw new Error('events API returned a non-array');
  } catch (error) {
    console.error('calendar feed:', error);
    return new Response('Events are temporarily unavailable. Try again shortly.', {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const stamp = icsDate(now);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Doorway//BYU career events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText('Doorway · BYU career events')}`,
    'X-WR-TIMEZONE:America/Denver',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    ...events.filter((e) => e.id && e.title && !Number.isNaN(Date.parse(e.start_at)) && isCareerEvent(e)).flatMap((e) => vevent(e, stamp)),
    'END:VCALENDAR'
  ];

  return new Response(lines.map(fold).join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="doorway.ics"',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
    }
  });
}
