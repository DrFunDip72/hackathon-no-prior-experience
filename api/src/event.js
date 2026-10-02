import { createHash } from 'node:crypto';
import { canonicalCompany, isProgram, sortNames } from './aliases.js';

export const TYPES = ['career_fair', 'hackathon', 'info_session', 'lecture', 'tabling', 'club_event', 'case_competition', 'networking', 'other'];
export const SOURCES = ['byu_calendar', 'cs_dept', 'careerlaunch', 'rollins', 'byusa', 'clubs', 'handshake_manual', 'email', 'user_submission'];
export const PERSON_KINDS = ['recruiter', 'alumni', 'speaker', 'club_lead', 'host'];

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

// Splits names into employers and graduate programs (judged on the raw listing name, before aliasing);
// canonical, deduped, alphabetical.
function splitCompanies(names) {
  const entries = cleanList(names).map((raw) => ({ name: canonicalCompany(raw), program: isProgram(raw) || isProgram(canonicalCompany(raw)) }));
  const pick = (program) => sortNames([...new Set(entries.filter((e) => e.program === program).map((e) => e.name))]);
  return { companies: pick(false), programs: pick(true) };
}

// People named publicly on a listing. Only entries with a name are kept; ids are stable per name + company.
export function normalizePeople(list) {
  return (Array.isArray(list) ? list : []).filter((p) => p && String(p.name ?? '').trim()).map((p) => {
    const name = String(p.name).trim();
    const company = p.company ? canonicalCompany(p.company) : null;
    return {
      id: p.id ?? `per_${createHash('sha256').update(`${name.toLowerCase()}|${(company ?? '').toLowerCase()}`).digest('hex').slice(0, 8)}`,
      name,
      title: p.title ?? null,
      company,
      kind: PERSON_KINDS.includes(p.kind) ? p.kind : 'host',
      byu_connection: p.byu_connection ?? null,
      tags: cleanList(p.tags).map((t) => t.toLowerCase()),
      linkedin_url: p.linkedin_url ?? null,
      source: ['listing', 'employer_submitted', 'manual'].includes(p.source) ? p.source : 'listing'
    };
  });
}

// Turn loose input into a row ready for upsert. Throws if title or start is unusable.
export function toEventRow(input) {
  const title = String(input.title ?? '').trim();
  const start = denverIso(input.start);
  if (!title || !start || Number.isNaN(new Date(start).getTime())) throw new Error('event needs a title and a valid start');
  const location = input.location ? String(input.location).trim() : null;
  const hash = dedupeHash(title, start, location);
  const source = SOURCES.includes(input.source) ? input.source : 'user_submission';
  const { companies, programs } = splitCompanies([...(input.companies ?? []), ...(input.programs ?? [])]);
  return {
    id: input.id ?? `evt_${hash.slice(0, 12)}`,
    title,
    start_at: start,
    end_at: denverIso(input.end),
    location,
    type: TYPES.includes(input.type) ? input.type : 'other',
    companies,
    programs,
    fields: cleanList(input.fields).map((f) => f.toLowerCase()),
    source,
    source_url: input.source_url ?? null,
    description: input.description ?? null,
    // Events that came from a person or an LLM reading a message are unconfirmed until a trusted source lists them.
    verified: input.verified ?? !['user_submission', 'email'].includes(source),
    people: normalizePeople(input.people),
    registration_url: input.registration_url ?? null,
    rsvp_required: input.rsvp_required ?? null,
    registration_deadline: denverIso(input.registration_deadline),
    dedupe_hash: hash
  };
}
