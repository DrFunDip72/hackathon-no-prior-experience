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
  /** API: false means unconfirmed (submitted by a person or read by an LLM). Undefined for sample events. */
  verified?: boolean;
  /** API: graduate schools and degree programs presenting. Never shown as employer logos. */
  programs?: string[];
  /** API: people named on the listing. Takes the place of attendeeIds when present. */
  people?: Person[];
  registrationUrl?: string;
  rsvpRequired?: boolean;
  /** ISO instant (UTC). */
  registrationDeadline?: string;
}

export interface Employer {
  id: string;
  name: string;
  industry: string;
  initials: string;
  color: string;
  logoUrl?: string;
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
  linkedinUrl?: string;
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