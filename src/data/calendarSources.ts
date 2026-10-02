import type { CalendarSource } from '../types/calendar';

// Statuses mirror docs/api.md "Sources": Career Services (careerlaunch) and the BYU/CS calendars
// (byu_calendar, cs_dept) are ingested; clubs and athletics have no ingest yet.
export const calendarSources: CalendarSource[] = [
{
  id: 'google',
  name: 'Google Calendar',
  provider: 'Google',
  status: 'preview',
  description: 'Uses a sample class schedule to flag conflicts. Real Google Calendar sync is coming.',
  eventCount: 38,
  permissions: [
  'Mark events that overlap the sample class schedule',
  'Show “You’re free” on events that don’t',
  'Let you hide conflicting events in your feed']

},
{
  id: 'byu-careers',
  name: 'BYU Career Services',
  provider: 'BYU',
  status: 'live',
  description: 'Employer info sessions, tabling, and hackathons from the Career Services events list.',
  eventCount: 64,
  permissions: []
},
{
  id: 'byu-departments',
  name: 'College & Department Events',
  provider: 'BYU',
  status: 'live',
  description: 'Lectures, workshops, and department events from the BYU Calendar and CS department.',
  eventCount: 87,
  permissions: []
},
{
  id: 'byu-clubs',
  name: 'BYUSA Clubs',
  provider: 'BYU',
  status: 'soon',
  description: 'Club nights, networking events, and hackathons from student clubs.',
  eventCount: 112,
  permissions: []
},
{
  id: 'byu-athletics',
  name: 'BYU Athletics & Alumni',
  provider: 'BYU',
  status: 'soon',
  description: 'Alumni tailgates and game-day mixers where employers show up.',
  eventCount: 21,
  permissions: []
}];
