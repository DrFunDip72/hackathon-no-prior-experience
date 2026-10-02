export type CalendarSourceId =
'byu-careers' |
'byu-clubs' |
'byu-departments' |
'byu-athletics';

export type CalendarId = 'google' | CalendarSourceId;

/**
 * How real a source is today:
 * - live: its real events are in the feed
 * - preview: works, but on sample data (Google Calendar uses data/schedule.ts until real OAuth exists)
 * - soon: not wired yet; shown disabled
 */
export type CalendarSourceStatus = 'live' | 'preview' | 'soon';

export interface CalendarSource {
  id: CalendarId;
  name: string;
  provider: 'Google' | 'BYU';
  status: CalendarSourceStatus;
  description: string;
  eventCount: number;
  permissions: string[];
}
