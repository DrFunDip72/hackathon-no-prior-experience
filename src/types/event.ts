import type { CalendarSourceId } from './calendar';

export type EventType =
'Career fair' |
'Info session' |
'Workshop' |
'Club' |
'Talk' |
'Networking';

export interface CampusEvent {
  id: string;
  title: string;
  type: EventType;
  sourceId: CalendarSourceId;
  dayOffset: number;
  startTime: string;
  durationMin: number;
  location: string;
  description: string;
  tags: string[];
  industries: string[];
  employerIds: string[];
  attendeeIds: string[];
  /** Set when the event came from the real API: exact start time and its ranking. */
  startAt?: string;
  /** Link back to the original listing (API events). */
  sourceUrl?: string;
  apiScore?: number;
  apiReasons?: string[];
  apiReason?: string;
  /** Sign-up link, when the source has one (distinct from sourceUrl, which is the listing page). */
  registrationUrl?: string;
  /** false = unconfirmed (a submission, or an unverified seed row). Undefined for sample data, which is always treated as confirmed. */
  verified?: boolean;
  /** People named on the API listing, already shaped for the UI. Undefined for sample data (attendeeIds is used instead). */
  apiPeople?: Person[];
}

export interface Employer {
  id: string;
  name: string;
  industry: string;
  initials: string;
  color: string;
}

export type PersonKind = 'Recruiter' | 'Alumni' | 'Speaker' | 'Club lead' | 'Host';

export interface Person {
  id: string;
  name: string;
  title: string;
  org: string;
  employerId?: string;
  kind: PersonKind;
  byuConnection?: string;
  tags: string[];
}

export interface ScheduleBlock {
  id: string;
  title: string;
  days: number[];
  start: string;
  end: string;
  location: string;
}

export interface ScoredPerson {
  person: Person;
  score: number;
  reason: string;
  talkingPoints: string[];
}

export interface ScoredEvent {
  event: CampusEvent;
  start: Date;
  end: Date;
  score: number;
  reasons: string[];
  /** Full sentence explaining the match, when the API provided one. */
  reason?: string;
  conflict: string | null;
  employers: Employer[];
  people: ScoredPerson[];
}