import { createHash } from 'node:crypto';
import { canonicalCompany } from './aliases.js';

export const TYPES = ['career_fair', 'hackathon', 'info_session', 'lecture', 'tabling', 'club_event', 'case_competition', 'networking', 'other'];
export const SOURCES = ['byu_calendar', 'cs_dept', 'careerlaunch', 'rollins', 'byusa', 'clubs', 'handshake_manual', 'email', 'user_submission'];

// sha256(lower(title) + date(start) + lower(location)); date is the local (Denver) calendar date.
export function dedupeHash(title, start, location) {
  const date = String(start).slice(0, 10);
  const raw = `${String(title).toLowerCase()}${date}${String(location ?? '').toLowerCase()}`;
  return createHash('sha256').update(raw).digest('hex');
}

// "2026-10-05 19:00:00" (America/Denver wall time) -> "2026-10-05T19:00:00-06:00"
export function denverIso(local) {
  if (!local) return null;
  const s = String(local).trim().replace(' ', 'T');
  if (/(Z|[+-]\d\d:?\d\d)$/.test(s)) return s;
  const guess = new Date(`${s}Z`);
  if (Number.isNaN(guess.getTime())) return null;
  const part = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', timeZoneName: 'longOffset' })
    .formatToParts(guess).find((p) => p.type === 'timeZoneName').value; // "GMT-06:00"
  const offset = part.replace('GMT', '') || '+00:00';
  return `${s.length === 16 ? `${s}:00` : s}${offset}`;
}

const cleanList = (list) => [...new Set((Array.isArray(list) ? list : []).map((x) => String(x).trim()).filter(Boolean))];

// Turn loose input into a row ready for upsert. Throws if title or start is unusable.
export function toEventRow(input) {
  const title = String(input.title ?? '').trim();
  const start = denverIso(input.start);
  if (!title || !start || Number.isNaN(new Date(start).getTime())) throw new Error('event needs a title and a valid start');
  const location = input.location ? String(input.location).trim() : null;
  const hash = dedupeHash(title, start, location);
  return {
    id: input.id ?? `evt_${hash.slice(0, 12)}`,
    title,
    start_at: start,
    end_at: denverIso(input.end),
    location,
    type: TYPES.includes(input.type) ? input.type : 'other',
    companies: cleanList(cleanList(input.companies).map(canonicalCompany)),
    fields: cleanList(input.fields).map((f) => f.toLowerCase()),
    source: SOURCES.includes(input.source) ? input.source : 'user_submission',
    source_url: input.source_url ?? null,
    description: input.description ?? null,
    dedupe_hash: hash
  };
}
