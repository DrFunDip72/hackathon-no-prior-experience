import { employers } from '../data/employers';
import { people } from '../data/people';
import type { CampusEvent, Employer, Person, ScheduleBlock, ScoredEvent, ScoredPerson } from '../types/event';
import type { Profile } from '../types/profile';
import { campusParts, getEventTimes, toMinutes } from './dates';
import { termMatch, unique } from './text';

export interface ProfileTerms {
  skills: string[];
  roles: string[];
  industries: string[];
  companies: string[];
}

export function getProfileTerms(profile: Profile): ProfileTerms {
  return {
    skills: unique([
    ...profile.topSkills,
    ...profile.skillGroups.flatMap((g) => g.skills),
    ...profile.experience.flatMap((e) => e.skills),
    ...profile.projects.flatMap((p) => p.skills)]
    ),
    roles: profile.lookingFor.roleTypes,
    industries: profile.interests.industries,
    companies: profile.interests.companies
  };
}

function matchesAny(term: string, list: string[]): boolean {
  return list.some((item) => termMatch(term, item));
}

function getTalkingPoints(person: Person, profile: Profile, companyHit: boolean, tagHits: string[]): string[] {
  const points: string[] = [];
  if (companyHit) {
    const type = profile.lookingFor.employmentType === 'Either' ? 'student' : profile.lookingFor.employmentType.toLowerCase();
    points.push(`You listed ${person.org} as a target. Ask what their ${type} recruiting timeline looks like this year.`);
  }
  const relevantRole = profile.experience.find((exp) => exp.skills.some((s) => person.tags.some((t) => termMatch(s, t))));
  if (relevantRole) {
    const sharedTag = person.tags.find((t) => relevantRole.skills.some((s) => termMatch(s, t))) ?? person.tags[0];
    points.push(
      `Bring up your ${relevantRole.title} work${relevantRole.org ? ` at ${relevantRole.org}` : ''}. It maps directly to their focus on ${sharedTag.toLowerCase()}.`
    );
  }
  if (person.byuConnection) {
    points.push(`Open with the shared BYU connection: they’re ${person.byuConnection}.`);
  }
  if (points.length < 2) {
    const topic = tagHits[0] ?? person.tags[0];
    points.push(topic ?
    `Ask what sets apart the students they’ve seen succeed in ${topic.toLowerCase()}.` :
    'Ask what sets apart the students they’ve seen succeed in their field.');
  }
  return points.slice(0, 2);
}

export function scorePerson(person: Person, profile: Profile, terms: ProfileTerms): ScoredPerson {
  const companyHit = terms.companies.some((c) => termMatch(c, person.org));
  const tagHits = person.tags.filter((t) => matchesAny(t, [...terms.skills, ...terms.roles, ...terms.industries]));
  const score = Math.min(
    99,
    20 + (companyHit ? 35 : 0) + tagHits.length * 14 + (person.kind === 'Recruiter' ? 8 : 0) + (person.byuConnection ? 5 : 0)
  );
  let reason = [person.kind, person.org].filter(Boolean).join(' · ');
  if (companyHit) reason = `Works at ${person.org}, one of your target companies`;else
  if (tagHits.length) reason = `Shares your focus on ${tagHits.slice(0, 2).join(' and ')}`;else
  if (person.kind === 'Recruiter' && person.org) reason = `Hires students for ${person.org}`;

  return { person, score, reason, talkingPoints: getTalkingPoints(person, profile, companyHit, tagHits) };
}

/** Score cut-offs for the match labels; also used for the Events page's "no good matches" state. */
export const STRONG_MATCH = 55;
export const GOOD_MATCH = 30;

/**
 * Plain-language match label. The API sends a raw relevance score (not a true percentage), so showing
 * "29%" made good matches look bad. Every event in the feed is already relevant; this just ranks how strongly.
 * Switch to the API's `percent` once it ships (requested in docs/api-requests.md).
 */
export function matchLabel(score: number, ai = false): { label: string; className: string } {
  if (score >= (ai ? AI_STRONG_MATCH : STRONG_MATCH)) return { label: 'Strong match', className: 'text-success-700' };
  if (score >= (ai ? AI_GOOD_MATCH : GOOD_MATCH)) return { label: 'Good match', className: 'text-navy' };
  return { label: 'Worth a look', className: 'text-muted' };
}

/** Cut-offs for the AI percent from /api/rank-events (see the formula there), used instead of the ones above when it answered. */
export const AI_STRONG_MATCH = 65;
export const AI_GOOD_MATCH = 40;

/**
 * The match percent to show for a feed item ("82%"), colored by matchLabel's thresholds, or null for "—".
 * With an AI percent every event gets one; without it (AI unavailable), an event with no API match
 * reasons stays "—" as before.
 */
export function eventMatch(item: ScoredEvent): { percent: number; className: string } | null {
  if (item.aiPercent !== undefined) return { percent: item.aiPercent, className: matchLabel(item.aiPercent, true).className };
  return item.reasons.length ? { percent: item.score, className: matchLabel(item.score).className } : null;
}

/** "Good match" or better; the Events page shows NoGoodMatches when nothing in the feed is. */
export function isGoodMatch(item: ScoredEvent): boolean {
  if (item.aiPercent !== undefined) return item.aiPercent >= AI_GOOD_MATCH;
  return item.reasons.length > 0 && item.score >= GOOD_MATCH;
}

/** Below this AI percent an event is off-topic for the student (FHE nights, dances score ~10), unless a target company attends. */
export const AI_HIDE_BELOW = 20;

/** Clearly non-career campus events (ward/stake socials, devotionals, dances). */
const NON_CAREER =
/\bFHE\b|family home evening|\bdevotional\b|\bcraft night\b|\bgame night\b|\bdances?\b|\bward (?:activity|social)\b|\bstake (?:activity|social|dance)\b/i;

/**
 * Title always; description only when no company is listed, so a career event that merely mentions
 * "after the devotional" in its blurb isn't dropped.
 */
function looksNonCareer(item: ScoredEvent): boolean {
  if (NON_CAREER.test(item.event.title)) return true;
  return item.employers.length === 0 && NON_CAREER.test(item.event.description);
}

/**
 * True for events the feed hides: the AI rates them off-topic, or they're plainly not career events
 * (works without AI). A target company attending always keeps an event.
 */
export function isHiddenFromFeed(item: ScoredEvent): boolean {
  if (item.targetCompanies.length) return false;
  if (item.aiPercent !== undefined && item.aiPercent < AI_HIDE_BELOW) return true;
  return looksNonCareer(item);
}

/** Class schedule blocks are campus wall-clock times, so compare in campus time. */
export function findConflict(schedule: ScheduleBlock[], start: Date, end: Date): ScheduleBlock | null {
  const { weekday, hour, minute } = campusParts(start);
  const startMin = hour * 60 + minute;
  const endMin = startMin + (end.getTime() - start.getTime()) / 60000;
  return (
    schedule.find((b) => b.days.includes(weekday) && toMinutes(b.start) < endMin && toMinutes(b.end) > startMin) ?? null);

}

export function scheduleForDay(schedule: ScheduleBlock[], date: Date): ScheduleBlock[] {
  const { weekday } = campusParts(date);
  return schedule.
  filter((b) => b.days.includes(weekday)).
  sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** `schedule` is the student's calendar to check conflicts against, or null when none is connected. */
export function scoreEvent(event: CampusEvent, profile: Profile, terms: ProfileTerms, schedule: ScheduleBlock[] | null): ScoredEvent {
  const { start, end } = getEventTimes(event);
  const eventEmployers = event.employerIds.
  map((id) => employers.find((e) => e.id === id)).
  filter((e): e is Employer => Boolean(e));

  const companyHits = eventEmployers.filter((e) => terms.companies.some((c) => termMatch(c, e.name)));
  const industryHits = event.industries.filter((i) => terms.industries.some((t) => termMatch(t, i)));
  const tagHits = event.tags.filter((t) => matchesAny(t, [...terms.skills, ...terms.roles]));

  const raw =
  28 +
  companyHits.length * 18 +
  industryHits.length * 10 +
  Math.min(tagHits.length, 4) * 9 + (
  event.type === 'Career fair' ? 6 : 0);

  // API events carry their people inline; sample events reference src/data/people.ts.
  const eventPeople = event.people ?? event.attendeeIds.
  map((id) => people.find((p) => p.id === id)).
  filter((p): p is Person => Boolean(p));
  const scoredPeople = eventPeople.
  map((p) => scorePerson(p, profile, terms)).
  sort((a, b) => b.score - a.score);

  const fromApi = Boolean(event.startAt);
  // The API's reasons are matched_companies followed by matched_fields; split them back apart.
  const isEventCompany = (term: string) => eventEmployers.some((e) => termMatch(term, e.name));
  const apiCompanyNames = (event.apiReasons ?? []).
  filter(isEventCompany).
  map((r) => eventEmployers.find((e) => termMatch(r, e.name))?.name ?? r);

  return {
    event,
    start,
    end,
    // API events arrive pre-ranked; the API score tops out near 30, so scale it to a percentage.
    // A saved API event loaded by id has no ranking, so it gets no score (shown as "—").
    score: fromApi ? Math.min(99, Math.round((event.apiScore ?? 0) * 3)) : Math.min(98, raw),
    reasons: event.apiReasons ?? unique([...companyHits.map((e) => e.name), ...tagHits, ...industryHits]).slice(0, 3),
    reason: event.apiReason,
    targetCompanies: unique([...companyHits.map((e) => e.name), ...apiCompanyNames]),
    matchedFields: event.apiReasons ? event.apiReasons.filter((r) => !isEventCompany(r)) : unique([...tagHits, ...industryHits]),
    conflict: schedule ? findConflict(schedule, start, end)?.title ?? null : null,
    employers: eventEmployers,
    people: scoredPeople
  };
}