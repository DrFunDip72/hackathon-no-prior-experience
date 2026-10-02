import type { CalendarSource } from '../types/calendar';

export const calendarSources: CalendarSource[] = [
{
  id: 'google',
  name: 'Google Calendar',
  provider: 'Google',
  description: 'Your classes, shifts, and commitments. Used only to flag conflicts and add events you choose.',
  eventCount: 38,
  permissions: ['See the times of events on your calendars', 'Add events you choose to your calendar']
},
{
  id: 'byu-careers',
  name: 'BYU Career Services',
  provider: 'BYU',
  description: 'Career fairs, employer info sessions, and recruiting workshops.',
  eventCount: 64,
  permissions: ['Read public career events', 'See which employers and recruiters are attending']
},
{
  id: 'byu-clubs',
  name: 'BYUSA Clubs',
  provider: 'BYU',
  description: 'Club nights, networking events, and hackathons from 400+ student clubs.',
  eventCount: 112,
  permissions: ['Read public club events', 'See published guest lists']
},
{
  id: 'byu-departments',
  name: 'College & Department Events',
  provider: 'BYU',
  description: 'Guest lectures, design weeks, and alumni panels across BYU colleges.',
  eventCount: 87,
  permissions: ['Read public department events', 'See featured speakers']
},
{
  id: 'byu-athletics',
  name: 'BYU Athletics & Alumni',
  provider: 'BYU',
  description: 'Alumni tailgates and game-day mixers where employers show up.',
  eventCount: 21,
  permissions: ['Read alumni association events', 'See sponsoring employers']
}];