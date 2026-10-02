/**
 * AI ranking on the front end (Phase 1): asks /api/rank-events (Gemini embeddings, a Vercel function)
 * how well each event in the API's feed fits the student, as a 0-99 percent.
 * One call per profile + event set, cached in localStorage. Never throws: any failure (no key,
 * rate limit, offline) resolves to null and the feed keeps the API's own order and labels.
 */
import type { ScoredEvent } from '../types/event';
import type { Profile } from '../types/profile';

const ENDPOINT = '/api/rank-events';
const CACHE_KEY = 'doorway_ai_rank_v3'; // v2: role boost from the API's fields; v3: "engineer" ~ "engineering" in it
const CACHE_ENTRIES = 6;
const CACHE_TTL_MS = 12 * 3_600_000;
const MAX_EVENTS = 98;
const TIMEOUT_MS = 25_000;

export type AiScores = Record<string, number>;

/** The profile fields ranking reads, trimmed to the endpoint's limits. Also part of the cache key. */
export function rankProfile(profile: Profile) {
  const skills = profile.topSkills.length ? profile.topSkills : profile.skillGroups.flatMap((g) => g.skills);
  return {
    roles: profile.lookingFor.roleTypes.slice(0, 6),
    employmentType: profile.lookingFor.employmentType ?? '',
    major: profile.education.major ?? '',
    year: profile.year ?? '',
    skills: skills.slice(0, 12),
    industries: profile.interests.industries.slice(0, 8),
    companies: profile.interests.companies.slice(0, 12),
    headline: (profile.headline ?? '').slice(0, 200),
    summary: (profile.summary ?? '').slice(0, 700)
  };
}

/** Title, type, companies, fields and the start of the description: what the embedding compares. */
function eventText(item: ScoredEvent): string {
  const { event } = item;
  const companies = item.employers.map((e) => e.name);
  return [
    event.title,
    `Type: ${event.type}`,
    companies.length && `Companies attending: ${companies.join(', ')}`,
    event.programs?.length && `Programs: ${event.programs.join(', ')}`,
    event.tags.length && `Topics: ${event.tags.join(', ')}`,
    event.description.slice(0, 1000)
  ]
    .filter(Boolean)
    .join('\n');
}

/** FNV-1a, twice with different seeds: a short, stable cache key (not security-relevant). */
function hash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
  }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36);
}

export function rankKey(profile: Profile, items: ScoredEvent[]): string {
  const ids = items.map((i) => i.event.id).sort();
  return hash(JSON.stringify([rankProfile(profile), ids]));
}

interface CacheEntry {
  at: number;
  scores: AiScores;
}

function readCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

export function cachedScores(key: string): AiScores | null {
  const entry = readCache()[key];
  return entry && Date.now() - entry.at < CACHE_TTL_MS ? entry.scores : null;
}

function writeCache(key: string, scores: AiScores): void {
  try {
    const cache = readCache();
    cache[key] = { at: Date.now(), scores };
    const newest = Object.entries(cache)
      .sort(([, x], [, y]) => y.at - x.at)
      .slice(0, CACHE_ENTRIES);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(newest)));
  } catch {
    // Storage full or blocked: ranking still works, it just isn't cached.
  }
}

// One request per key per page load, shared by every hook instance (Events and Profile pages, StrictMode).
const inFlight = new Map<string, Promise<AiScores | null>>();
// 503 means AI isn't configured; don't keep asking during this page load.
let unavailable = false;

async function request(profile: Profile, items: ScoredEvent[], key: string): Promise<AiScores | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        profile: rankProfile(profile),
        events: items.slice(0, MAX_EVENTS).map((item) => ({
          id: item.event.id,
          text: eventText(item),
          companies: item.employers.map((e) => e.name).slice(0, 30),
          fields: item.event.tags.slice(0, 20).map((t) => t.slice(0, 80))
        }))
      })
    });
    if (res.status === 503) unavailable = true;
    if (!res.ok) return null;
    const data = (await res.json()) as { scores?: { id: string; percent: number }[] };
    const scores: AiScores = {};
    for (const s of data.scores ?? []) {
      if (typeof s.id === 'string' && Number.isFinite(s.percent)) scores[s.id] = Math.max(0, Math.min(99, Math.round(s.percent)));
    }
    if (!Object.keys(scores).length) return null;
    writeCache(key, scores);
    return scores;
  } catch {
    return null;
  }
}

/** AI percents for these feed items, from cache or one call. Resolves to null when AI isn't available. */
export function fetchAiScores(profile: Profile, items: ScoredEvent[], key = rankKey(profile, items)): Promise<AiScores | null> {
  const cached = cachedScores(key);
  if (cached) return Promise.resolve(cached);
  if (unavailable || !items.length) return Promise.resolve(null);
  let pending = inFlight.get(key);
  if (!pending) {
    pending = request(profile, items, key).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}
