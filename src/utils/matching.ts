import { employers } from '../data/employers';
import { people } from '../data/people';
import { schedule } from '../data/schedule';
import type { CampusEvent, Employer, Person, ScheduleBlock, ScoredEvent, ScoredPerson } from '../types/event';
import type { Profile } from '../types/profile';
import { getEventTimes, toMinutes } from './dates';
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
    points.push(`Ask what sets apart the students they’ve seen succeed in ${topic.toLowerCase()}.`);
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
  let reason = `${person.kind} · ${person.org}`;
  if (companyHit) reason = `Works at ${person.org}, one of your target companies`;else
  if (tagHits.length) reason = `Shares your focus on ${tagHits.slice(0, 2).join(' and ')}`;else
  if (person.kind === 'Recruiter') reason = `Hires students for ${person.org}`;

  return { person, score, reason, talkingPoints: getTalkingPoints(person, profile, companyHit, tagHits) };
}

export function findConflict(start: Date, end: Date): ScheduleBlock | null {
  const day = start.getDay();
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = startMin + (end.getTime() - start.getTime()) / 60000;
  return (
    schedule.find((b) => b.days.includes(day) && toMinutes(b.start) < endMin && toMinutes(b.end) > startMin) ?? null);

}

export function scheduleForDay(date: Date): ScheduleBlock[] {
  return schedule.
  filter((b) => b.days.includes(date.getDay())).
  sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

export function scoreEvent(event: CampusEvent, profile: Profile, terms: ProfileTerms, checkConflicts: boolean): ScoredEvent {
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

  const scoredPeople = event.attendeeIds.
  map((id) => people.find((p) => p.id === id)).
  filter((p): p is Person => Boolean(p)).
  map((p) => scorePerson(p, profile, terms)).
  sort((a, b) => b.score - a.score);

  return {
    event,
    start,
    end,
    // API events arrive pre-ranked; the API score tops out near 30, so scale it to a percentage.
    score: event.apiScore !== undefined ? Math.min(99, Math.round(event.apiScore * 3)) : Math.min(98, raw),
    reasons: event.apiReasons ?? unique([...companyHits.map((e) => e.name), ...tagHits, ...industryHits]).slice(0, 3),
    reason: event.apiReason,
    conflict: checkConflicts ? findConflict(start, end)?.title ?? null : null,
    employers: eventEmployers,
    people: scoredPeople
  };
}