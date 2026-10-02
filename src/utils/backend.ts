/**
 * Real events API (Railway). Set VITE_API_URL to turn it on; without it the app
 * keeps using the sample events in src/data/events.ts. Contract: docs/api.md.
 */
import { employers as knownEmployers } from '../data/employers';
import type { CalendarSourceId } from '../types/calendar';
import type { CampusEvent, EventType, Person, PersonKind } from '../types/event';
import type { Profile } from '../types/profile';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

const WINDOW_DAYS = 31;
const CAMPUS_TZ = 'America/Denver';

interface ApiEventPerson {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  kind: string;
  byu_connection: string | null;
  tags: string[];
}

interface ApiEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  type: string;
  companies: string[];
  fields: string[];
  source: string;
  source_url: string | null;
  description: string | null;
  verified?: boolean;
  people?: ApiEventPerson[];
  registration_url?: string | null;
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

const PERSON_KIND_MAP: Record<string, PersonKind> = {
  recruiter: 'Recruiter',
  alumni: 'Alumni',
  speaker: 'Speaker',
  club_lead: 'Club lead',
  host: 'Host'
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "Ensign Peak Advisors" -> "EP", "Sodexo" -> "So". */
function initialsFor(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2);
}

/** GET /companies, fetched once per page load (docs/api.md) and reused for every employer looked up after it resolves. */
let companiesPromise: Promise<Map<string, ApiCompany>> | null = null;
function loadCompanies(): Promise<Map<string, ApiCompany>> {
  if (!API_URL) return Promise.resolve(new Map());
  if (!companiesPromise) {
    companiesPromise = fetch(`${API_URL}/companies`).
    then((res) => (res.ok ? res.json() : [])).
    then((list: ApiCompany[]) => new Map(list.map((c) => [c.name.toLowerCase(), c]))).
    catch(() => new Map());
  }
  return companiesPromise;
}

/**
 * Employers we have no hand-curated entry for still need an id. `src/data/employers.ts`'s hand-picked
 * color stays authoritative when it exists; otherwise use the API's brand color/industry/logo when
 * `GET /companies` has them (logo_url is null for every company today, per docs/api.md), and a gray
 * placeholder only as a last resort.
 */
function employerIdFor(name: string, companies: Map<string, ApiCompany>): string {
  const known = knownEmployers.find((e) => e.name.toLowerCase() === name.toLowerCase());
  if (known) return known.id;
  const id = slug(name);
  if (!knownEmployers.some((e) => e.id === id)) {
    // logo_url is null for every company as of docs/api.md; nothing to wire up there yet.
    const company = companies.get(name.toLowerCase());
    knownEmployers.push({
      id,
      name,
      industry: company?.industry ?? 'Employer',
      initials: initialsFor(name),
      color: company?.brand_color ?? '#475569'
    });
  }
  return id;
}

/** Wall-clock parts of an instant on campus (America/Denver), independent of the browser's zone. */
function campusParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { dayIndex: Date.UTC(get('year'), get('month') - 1, get('day')) / 86_400_000, hour: get('hour'), minute: get('minute') };
}

const pad = (n: number) => String(n).padStart(2, '0');
const clean = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim();

function toUiPerson(p: ApiEventPerson): Person {
  return {
    id: p.id,
    name: p.name,
    title: p.title ?? '',
    org: p.company ?? 'Campus event',
    kind: PERSON_KIND_MAP[p.kind] ?? 'Speaker',
    byuConnection: p.byu_connection ?? undefined,
    tags: p.tags
  };
}

/** API timestamps are absolute instants; startTime/dayOffset are filled in campus time for code that reads them. */
function toCampusEvent(rec: ApiRecommendation, companies: Map<string, ApiCompany>): CampusEvent {
  const e = rec.event;
  const start = new Date(e.start_at);
  const end = e.end_at ? new Date(e.end_at) : new Date(start.getTime() + 60 * 60000);
  const campusStart = campusParts(start);
  // The student's matched target companies lead, so cards say "Redo, Neighbor and 2 more" rather than an arbitrary pick.
  const matched = new Set(rec.matched_companies.map((c) => c.toLowerCase()));
  const companyNames = [...e.companies].sort((a, b) => Number(matched.has(b.toLowerCase())) - Number(matched.has(a.toLowerCase())));
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
    employerIds: companyNames.map((name) => employerIdFor(name, companies)),
    attendeeIds: [],
    apiPeople: e.people?.length ? e.people.map(toUiPerson) : undefined,
    sourceUrl: e.source_url ?? undefined,
    registrationUrl: e.registration_url ?? undefined,
    verified: e.verified,
    apiScore: rec.score,
    apiReasons: [...rec.matched_companies, ...rec.matched_fields],
    apiReason: rec.reason
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

/**
 * Plain events (no ranking), fetched by id (docs/api.md GET /events?ids=). Used to keep a saved event
 * in "My plan" when it has dropped out of the ranked /recommendations feed (outside the window, or
 * filtered by relevant_only). These have no apiScore/apiReasons, so scoreEvent falls back to its local
 * heuristic for them, same as sample data.
 */
export async function fetchEventsByIds(ids: string[]): Promise<CampusEvent[]> {
  if (!API_URL || !ids.length) return [];
  const [res, companies] = await Promise.all([
  fetch(`${API_URL}/events?ids=${ids.map(encodeURIComponent).join(',')}`),
  loadCompanies()]
  );
  if (!res.ok) return [];
  const events = (await res.json()) as ApiEvent[];
  return events.map((e) => toCampusEvent({ event: e, score: 0, matched_companies: [], matched_fields: [], reason: '' }, companies));
}

export async function fetchRecommendedEvents(profile: Profile): Promise<CampusEvent[]> {
  if (!API_URL) throw new Error('VITE_API_URL is not set');
  const now = new Date();
  const [res, companies] = await Promise.all([
  fetch(`${API_URL}/recommendations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...toApiProfile(profile),
      from: now.toISOString(),
      to: new Date(now.getTime() + WINDOW_DAYS * 86_400_000).toISOString(),
      relevant_only: true
    })
  }),
  loadCompanies()]
  );
  if (!res.ok) throw new Error(`Events API ${res.status}`);
  return ((await res.json()) as ApiRecommendation[]).map((rec) => toCampusEvent(rec, companies));
}
