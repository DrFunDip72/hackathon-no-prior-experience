/**
 * Real events API (Railway). Set VITE_API_URL to turn it on; without it the app
 * keeps using the sample events in src/data/events.ts.
 */
import { employers as knownEmployers } from '../data/employers';
import type { CalendarSourceId } from '../types/calendar';
import type { CampusEvent, EventType } from '../types/event';
import type { Profile } from '../types/profile';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

const WINDOW_DAYS = 31;

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
  description: string | null;
}

interface ApiRecommendation {
  event: ApiEvent;
  score: number;
  matched_companies: string[];
  matched_fields: string[];
  reason: string;
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

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Employers we have no logo data for still need an id, so register them on first sight. */
function employerIdFor(name: string): string {
  const id = slug(name);
  if (!knownEmployers.some((e) => e.id === id || e.name.toLowerCase() === name.toLowerCase())) {
    knownEmployers.push({ id, name, industry: 'Employer', initials: name.slice(0, 2), color: '#475569' });
  }
  return knownEmployers.find((e) => e.name.toLowerCase() === name.toLowerCase())?.id ?? id;
}

/** The API stores America/Denver wall times with an offset; the UI shows them in the browser's zone. */
function toCampusEvent(rec: ApiRecommendation): CampusEvent {
  const e = rec.event;
  const start = new Date(e.start_at);
  const end = e.end_at ? new Date(e.end_at) : new Date(start.getTime() + 60 * 60000);
  return {
    id: e.id,
    title: e.title,
    type: TYPE_MAP[e.type] ?? 'Talk',
    sourceId: SOURCE_MAP[e.source] ?? 'byu-departments',
    dayOffset: 0,
    startTime: '00:00',
    durationMin: Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)),
    startAt: e.start_at,
    location: e.location ?? 'TBA',
    description: e.description ?? '',
    tags: e.fields,
    industries: e.fields,
    employerIds: e.companies.map(employerIdFor),
    attendeeIds: [],
    apiScore: rec.score,
    apiReasons: [...rec.matched_companies, ...rec.matched_fields],
    apiReason: rec.reason
  };
}

/** Maps the Doorway profile onto the agreed recommendations contract. */
function toApiProfile(profile: Profile) {
  const lower = (list: string[]) => list.map((s) => s.trim().toLowerCase()).filter(Boolean);
  return {
    user_id: profile.email,
    target_companies: profile.interests.companies,
    target_roles: lower(profile.lookingFor.roleTypes),
    fields: lower([...profile.interests.industries, ...profile.topSkills]),
    grad_date: profile.education.gradYear
  };
}

export async function fetchRecommendedEvents(profile: Profile): Promise<CampusEvent[]> {
  if (!API_URL) throw new Error('VITE_API_URL is not set');
  const now = new Date();
  const res = await fetch(`${API_URL}/recommendations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...toApiProfile(profile),
      from: now.toISOString(),
      to: new Date(now.getTime() + WINDOW_DAYS * 86_400_000).toISOString(),
      relevant_only: true
    })
  });
  if (!res.ok) throw new Error(`Events API ${res.status}`);
  return ((await res.json()) as ApiRecommendation[]).map(toCampusEvent);
}
