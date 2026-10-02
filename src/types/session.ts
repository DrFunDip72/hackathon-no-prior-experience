import type { CalendarId } from './calendar';
import type { OnboardingDraft } from './onboarding';
import type { Profile } from './profile';

export interface SessionUser {
  name: string;
  email: string;
}

export interface UserState {
  profile: Profile | null;
  draft: OnboardingDraft | null;
  connections: Partial<Record<CalendarId, boolean>>;
  addedEventIds: string[];
  /** Whether the student went to a past event, by event id. Unmarked events aren't listed. */
  attendance: Record<string, Attendance>;
}

export type Attendance = 'attended' | 'missed';