export type CalendarSourceId =
'byu-careers' |
'byu-clubs' |
'byu-departments' |
'byu-athletics';

export type CalendarId = 'google' | CalendarSourceId;

export interface CalendarSource {
  id: CalendarId;
  name: string;
  provider: 'Google' | 'BYU';
  description: string;
  eventCount: number;
  permissions: string[];
}