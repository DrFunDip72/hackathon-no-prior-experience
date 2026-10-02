/**
 * Real events API (Railway). Set VITE_API_URL to turn it on; without it the app
 * keeps using the sample events in src/data/events.ts. Contract: docs/api.md.
 */
import { employers as knownEmployers } from '../data/employers';
import type { CalendarSourceId } from '../types/calendar';
import type { CampusEvent, EventType, Person, PersonKind } from '../types/event';
import type { Profile } from '../types/profile';
import { campusParts } from './dates';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

const WINDOW_DAYS = 31;

interface ApiPerson {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  kind: 'recruiter' | 'alumni' | 'speaker' | 'club_lead' | 'host';
  byu_connection: string | null;
  tags: string[];
  linkedin_url: string | null;
}

interface ApiEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  type: string;
  companies: string[];
  programs?: string[];
  fields: string[];
  source: string;
  source_url: string | null;
  description: string | null;
  verified?: boolean;
  people?: ApiPerson[];
  registration_url?: string | null;
  rsvp_required?: boolean | null;
  registration_deadline?: string | null;
}

interface ApiRecommendation {
  event: ApiEvent;
  score: number;
  matched_companies: string[];
  matched_fields: string[];
  reason: string;
}

interface ApiCompany {
  name: string;
  kind: 'employer' | 'grad_program' | 'campus_org';
  industry: string | null;
  logo_url: string | null;
  brand_color: string | null;
}

const TYPE_MAP: Record<string, EventType> = {
  career_fair: 'Career fair',
  info_session: 'Info session',
  hackathon: 'Workshop',
  case_competition: 'Workshop',
  lecture: 'Talk',
  club_event: 'Club',
  networking: 'Networking',
  tabling: 'Networking'
};

const SOURCE_MAP: Record<string, CalendarSourceId> = {
  careerlaunch: 'byu-careers',
  rollins: 'byu-careers',
  handshake_manual: 'byu-careers',
  clubs: 'byu-clubs',
  byusa: 'byu-clubs'
};

const PERSON_KIND: Record<ApiPerson['kind'], PersonKind> = {
  recruiter: 'Recruiter',
  alumni: 'Alumni',
  speaker: 'Speaker',
  club_lead: 'Club lead',
  host: 'Host'
};

const GRAY = '#475569';

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "Ensign Peak Advisors" -> "EP", "Sodexo" -> "So". */
function initialsFor(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2);
}

const findEmployer = (name: string) => knownEmployers.find((e) => e.name.toLowerCase() === name.toLowerCase());

/** Every company needs an employer entry for its logo tile, so register unknown ones on first sight. */
function employerIdFor(name: string): string {
  const known = findEmployer(name);
  if (known) return known.id;
  const id = slug(name);
  if (!knownEmployers.some((e) => e.id === id)) {
    knownEmployers.push({ id, name, industry: 'Employer', initials: initialsFor(name), color: GRAY });
  }
  return id;
}

let directory: Promise<void> | null = null;

/**
 * GET /companies, once per page load: brand colors, industries and (later) logos.
 * src/data/employers.ts stays the fallback when the call fails or a field is null.
 */
function loadCompanyDirectory(): Promise<void> {
  directory ??= fetch(`${API_URL}/companies`).
  then((res) => res.ok ? res.json() as Promise<ApiCompany[]> : []).
  then((companies) => {
    for (const c of companies) {
      if (c.kind !== 'employer') continue;
      const existing = findEmployer(c.name);
      const patch = {
        ...(c.brand_color ? { color: c.brand_color } : {}),
        ...(c.industry ? { industry: c.industry } : {}),
        ...(c.logo_url ? { logoUrl: c.logo_url } : {})
      };
      if (existing) Object.assign(existing, patch);else
      knownEmployers.push({ id: slug(c.name), name: c.name, industry: 'Employer', initials: initialsFor(c.name), color: GRAY, ...patch });
    }
  }).
  catch(() => {
    directory = null; // try again on the next fetch
  });
  return directory;
}

const pad = (n: number) => String(n).padStart(2, '0');
const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

function toPerson(p: ApiPerson): Person {
  return {
    id: p.id,
    name: clean(p.name),
    title: clean(p.title),
    org: clean(p.company),
    employerId: p.company ? employerIdFor(p.company) : undefined,
    kind: PERSON_KIND[p.kind] ?? 'Speaker',
    byuConnection: p.byu_connection ?? undefined,
    tags: p.tags ?? [],
    linkedinUrl: p.linkedin_url ?? undefined
  };
}

/** Maps an API event (and its ranking, when it came from /recommendations) to the UI's event type. */
function toCampusEvent(e: ApiEvent, rec?: Omit<ApiRecommendation, 'event'>): CampusEvent {
  const start = new Date(e.start_at);
  const end = e.end_at ? new Date(e.end_at) : new Date(start.getTime() + 60 * 60000);
  const campusStart = campusParts(start);
  return {
    id: e.id,
    title: clean(e.title),
    type: TYPE_MAP[e.type] ?? 'Talk',
    sourceId: SOURCE_MAP[e.source] ?? 'byu-departments',
    dayOffset: campusStart.dayIndex - campusParts(new Date()).dayIndex,
    startTime: `${pad(campusStart.hour)}:${pad(campusStart.minute)}`,
    durationMin: Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)),
    startAt: e.start_at,
    location: clean(e.location) || 'Location TBA',
    description: clean(e.description),
    tags: e.fields,
    industries: e.fields,
    // The API orders companies (matched targets first in /recommendations, then alphabetical); keep it.
    employerIds: e.companies.map(employerIdFor),
    attendeeIds: [],
    people: (e.people ?? []).map(toPerson),
    programs: e.programs ?? [],
    verified: e.verified,
    registrationUrl: e.registration_url ?? undefined,
    rsvpRequired: e.rsvp_required ?? undefined,
    registrationDeadline: e.registration_deadline ?? undefined,
    sourceUrl: e.source_url ?? undefined,
    apiScore: rec?.score,
    apiReasons: rec ? [...rec.matched_companies, ...rec.matched_fields] : [],
    apiReason: rec?.reason ?? 'Saved to your plan. It isn’t in your current ranked matches.'
  };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "2027", "2027-04", "April 2027" -> "2027" / "2027-04"; anything else -> undefined. */
function toGradDate(gradYear: string): string | undefined {
  const year = gradYear.match(/\b(20\d{2})\b/)?.[1];
  if (!year) return undefined;
  const numericMonth = gradYear.match(/\b20\d{2}-(\d{2})\b/)?.[1];
  const namedMonth = MONTHS.findIndex((m) => gradYear.toLowerCase().includes(m));
  if (numericMonth) return `${year}-${numericMonth}`;
  if (namedMonth >= 0) return `${year}-${pad(namedMonth + 1)}`;
  return year;
}

const norm = (list: string[]) => [...new Set(list.map((s) => s.trim().toLowerCase()).filter(Boolean))];

/** "Product & Design" -> ["product", "design"], so the API's word-aware matching can hit its lowercase fields. */
const splitIndustry = (name: string) => name.split(/\s*(?:&|,|\/|\band\b)\s*/i);

/** Maps the Doorway profile onto the recommendations contract (docs/api.md, "POST /recommendations"). */
export function toApiProfile(profile: Profile) {
  const { lookingFor, interests, education } = profile;
  const employment = lookingFor.employmentType && lookingFor.employmentType !== 'Either' ? [lookingFor.employmentType] : [];
  // topSkills is the curated short list; fall back to the first few grouped skills when it's empty.
  const skills = profile.topSkills.length ? profile.topSkills : profile.skillGroups.flatMap((g) => g.skills).slice(0, 6);
  // No user_id: the API doesn't use it yet, and the email is the only id we have (keep PII out of requests).
  return {
    target_companies: [...new Set(interests.companies.map((c) => c.trim()).filter(Boolean))],
    target_roles: norm([...lookingFor.roleTypes, ...employment]),
    fields: norm([...interests.industries.flatMap(splitIndustry), education.major, ...skills]),
    grad_date: toGradDate(education.gradYear)
  };
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error('VITE_API_URL is not set');
  const [res] = await Promise.all([fetch(`${API_URL}${path}`, init), loadCompanyDirectory()]);
  if (!res.ok) throw new Error(`Events API ${res.status}`);
  return res.json() as Promise<T>;
}

/** POST /recommendations: the ranked feed, best first. In-progress events are included. */
export async function fetchRecommendedEvents(profile: Profile): Promise<CampusEvent[]> {
  const now = new Date();
  const recs = await getJson<ApiRecommendation[]>('/recommendations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...toApiProfile(profile),
      from: now.toISOString(),
      to: new Date(now.getTime() + WINDOW_DAYS * 86_400_000).toISOString(),
      relevant_only: true
    })
  });
  return recs.map(({ event, ...rec }) => toCampusEvent(event, rec));
}

/** GET /events?ids=: saved events, so "My plan" keeps them after they drop out of the ranked feed. Unknown ids are omitted. */
export async function fetchEventsByIds(ids: string[]): Promise<CampusEvent[]> {
  if (!ids.length) return [];
  const events = await getJson<ApiEvent[]>(`/events?ids=${ids.slice(0, 100).map(encodeURIComponent).join(',')}`);
  return events.map((e) => toCampusEvent(e));
}

/** GET /events for the last `days` days: recent events, so a student can mark one they went to without saving it first. */
export async function fetchRecentEvents(days: number): Promise<CampusEvent[]> {
  const now = new Date();
  const from = new Date(now.getTime() - days * 86_400_000).toISOString();
  const events = await getJson<ApiEvent[]>(`/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(now.toISOString())}`);
  return events.map((e) => toCampusEvent(e));
}
