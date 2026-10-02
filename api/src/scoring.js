import { companyKey, canonicalCompany, sortNames } from './aliases.js';

const DAY_MS = 86_400_000;
const BOOSTED_TYPES = ['career_fair', 'info_session', 'hackathon'];
export const DEFAULT_WINDOW_DAYS = 21;

const lower = (s) => String(s).trim().toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, word) => new RegExp(`(^|\\W)${escapeRe(word)}($|\\W)`).test(text);
// Loose, word-aware match: "software" ~ "software engineering".
const termMatch = (a, b) => lower(a) === lower(b) || hasWord(lower(a), lower(b)) || hasWord(lower(b), lower(a));
const joinNames = (names) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')}, and ${names.at(-1)}`);

export function scoreEvent(event, profile, { now = new Date(), windowDays = DEFAULT_WINDOW_DAYS } = {}) {
  const targets = new Map((profile.target_companies ?? []).map((c) => [companyKey(c), canonicalCompany(c)]));
  const matchedCompanies = [...new Set((event.companies ?? []).map(canonicalCompany))].filter((c) => targets.has(c.toLowerCase()));

  // Profile fields match event fields loosely; roles match as keywords in the fields, title or description.
  const eventFields = (event.fields ?? []).map(lower);
  const haystack = lower([...eventFields, event.title, event.description ?? ''].join(' '));
  const matchedFields = [
    ...(profile.fields ?? []).filter((f) => f.trim() && eventFields.some((ef) => termMatch(f, ef))),
    ...(profile.target_roles ?? []).filter((r) => r.trim() && haystack.includes(lower(r)))
  ].map(lower).filter((v, i, all) => all.indexOf(v) === i);

  const start = new Date(event.start_at ?? event.start);
  const daysUntil = Math.max(0, (start - now) / DAY_MS);
  const recency = 3 * Math.max(0, 1 - daysUntil / windowDays);
  const typeBoost = BOOSTED_TYPES.includes(event.type) ? 1 : 0;

  const score = 10 * matchedCompanies.length + 3 * matchedFields.length + typeBoost + recency;
  return {
    score: Math.round(score * 10) / 10,
    matched_companies: matchedCompanies,
    matched_fields: matchedFields,
    reason: buildReason(event, matchedCompanies, matchedFields, targets.size)
  };
}

function buildReason(event, companies, fields, targetCount) {
  const parts = [];
  if (companies.length) {
    const rep = companies.length === 1 ? 'rep' : 'reps';
    parts.push(`${joinNames(companies)} ${rep} attending, matches ${companies.length} of your ${targetCount} target companies.`);
  }
  if (fields.length) parts.push(`Covers ${joinNames(fields)}, which matches your interests.`);
  if (!parts.length) parts.push(`Upcoming ${event.type.replace(/_/g, ' ')}, worth a look.`);
  return parts.join(' ');
}

// Matched target companies first, then the rest alphabetically, so cards lead with what the student cares about.
const orderCompanies = (companies, matched) => {
  const hit = new Set(matched.map((c) => c.toLowerCase()));
  return [...sortNames(companies.filter((c) => hit.has(c.toLowerCase()))), ...sortNames(companies.filter((c) => !hit.has(c.toLowerCase())))];
};

// Events still happening count as in the window; no end time means one hour.
const endOf = (e) => (e.end_at ? new Date(e.end_at) : new Date(new Date(e.start_at).getTime() + 3_600_000));

// relevantOnly drops events that match nothing and aren't a fair/info session/hackathon (keeps a feed free of noise).
export function recommend(events, profile, { from, to, now = new Date(), relevantOnly = false } = {}) {
  const start = from ? new Date(from) : now;
  const end = to ? new Date(to) : new Date(start.getTime() + DEFAULT_WINDOW_DAYS * DAY_MS);
  const windowDays = Math.max(1, (end - start) / DAY_MS);
  return events
    .filter((e) => endOf(e) > start && new Date(e.start_at) < end)
    .map((event) => ({ event, ...scoreEvent(event, profile, { now: start, windowDays }) }))
    .map((r) => ({ ...r, event: { ...r.event, companies: orderCompanies(r.event.companies ?? [], r.matched_companies) } }))
    .filter((r) => r.score >= 1)
    .filter((r) => !relevantOnly || r.matched_companies.length || r.matched_fields.length || BOOSTED_TYPES.includes(r.event.type))
    .sort((a, b) => b.score - a.score);
}
