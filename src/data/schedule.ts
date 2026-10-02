import type { ScheduleBlock } from '../types/event';

// Sample personal schedule used as the connected "Google Calendar".
// days: 0 = Sunday … 6 = Saturday
export const schedule: ScheduleBlock[] = [
{ id: 's1', title: 'CS 340 · Software Design', days: [1, 3, 5], start: '11:00', end: '11:50', location: 'TMCB 1170' },
{ id: 's2', title: 'STAT 121 · Statistics', days: [2, 4], start: '09:30', end: '10:45', location: 'JFSB B092' },
{ id: 's3', title: 'IS 303 · Business Programming', days: [2, 4], start: '15:30', end: '16:45', location: 'Tanner 260' },
{ id: 's4', title: 'Shift · Harold B. Lee Library', days: [1, 3], start: '17:00', end: '19:00', location: 'HBLL Help Desk' },
{ id: 's5', title: 'FHE group', days: [1], start: '19:30', end: '21:00', location: 'Heritage Halls' }];