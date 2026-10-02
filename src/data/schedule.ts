import type { ScheduleBlock } from '../types/event';
import type { Profile } from '../types/profile';

// Sample personal schedule used as the connected "Google Calendar" (preview). Built from the student's
// profile so it looks like their week: classes from their major, one from the role they're after.
// days: 0 = Sunday … 6 = Saturday

interface Track {
  match: RegExp;
  building: string;
  /** Freshman/sophomore classes. */
  intro: string[];
  /** Junior and up. */
  upper: string[];
}

// Order matters: the first match wins, so specific tracks come before broad ones.
const TRACKS: Track[] = [
{
  match: /product/i,
  building: 'Tanner',
  intro: ['ENT 381 · Entrepreneurial Process', 'MKTG 201 · Marketing Management', 'IS 201 · Intro to Information Systems'],
  upper: ['IS 565 · Product Management', 'ENT 415 · Product Discovery', 'STRAT 401 · Business Strategy']
},
{
  match: /information systems|\bMISM\b/i,
  building: 'Tanner',
  intro: ['IS 201 · Intro to Information Systems', 'IS 303 · Business Programming', 'ACC 200 · Principles of Accounting'],
  upper: ['IS 402 · Database Systems', 'IS 413 · Enterprise Software', 'IS 455 · Machine Learning']
},
{
  match: /data scien|statistic|analytic|data analy/i,
  building: 'TMCB',
  intro: ['STAT 240 · Intro to Data Science', 'STAT 121 · Statistics', 'MATH 213 · Linear Algebra'],
  upper: ['STAT 330 · Statistical Computing', 'STAT 386 · Data Science Process', 'CS 470 · Machine Learning']
},
{
  match: /computer science|computer engineering|software|\bCS\b|developer|programm/i,
  building: 'TMCB',
  intro: ['CS 235 · Data Structures', 'CS 224 · Computer Systems', 'MATH 213 · Linear Algebra'],
  upper: ['CS 340 · Software Design', 'CS 312 · Algorithm Design', 'CS 452 · Database Modeling']
},
{
  match: /engineer/i,
  building: 'EB',
  intro: ['ME 273 · Mechanics of Materials', 'EC EN 220 · Circuits', 'MATH 302 · Engineering Math'],
  upper: ['ME 340 · Dynamic Systems', 'EC EN 330 · Digital Systems', 'ME 475 · Capstone Design']
},
{
  match: /accounting|audit|\btax\b/i,
  building: 'Tanner',
  intro: ['ACC 200 · Principles of Accounting', 'ACC 310 · Intro to Accounting', 'IS 201 · Intro to Information Systems'],
  upper: ['ACC 401 · Financial Accounting', 'ACC 402 · Cost Accounting', 'ACC 405 · Auditing']
},
{
  match: /financ|invest|banking|wealth/i,
  building: 'Tanner',
  intro: ['FIN 201 · Principles of Finance', 'ACC 200 · Principles of Accounting', 'ECON 110 · Economic Principles'],
  upper: ['FIN 410 · Corporate Finance', 'FIN 415 · Investments', 'FIN 413 · Financial Modeling']
},
{
  match: /marketing|brand|advertis/i,
  building: 'Tanner',
  intro: ['MKTG 201 · Marketing Management', 'STAT 121 · Statistics', 'COMMS 101 · Mass Communication'],
  upper: ['MKTG 411 · Consumer Behavior', 'MKTG 412 · Marketing Research', 'MKTG 470 · Brand Strategy']
},
{
  match: /econ/i,
  building: 'FOB',
  intro: ['ECON 110 · Economic Principles', 'STAT 121 · Statistics', 'MATH 112 · Calculus 1'],
  upper: ['ECON 380 · Intermediate Microeconomics', 'ECON 381 · Intermediate Macroeconomics', 'ECON 388 · Econometrics']
},
{
  match: /design|\bux\b|\bui\b|user experience/i,
  building: 'BRMB',
  intro: ['DESIGN 210 · UX Foundations', 'DESIGN 230 · Typography', 'DESIGN 250 · Visual Design'],
  upper: ['DESIGN 381 · Interaction Design', 'DESIGN 384 · UX Research', 'DESIGN 489 · Design Studio']
},
{
  match: /construction/i,
  building: 'CTB',
  intro: ['CM 110 · Intro to Construction', 'CM 213 · Estimating', 'CE 203 · Statics'],
  upper: ['CM 320 · Project Management', 'CM 412 · Construction Scheduling', 'CM 470 · Capstone']
},
{
  match: /psych/i,
  building: 'TLRB',
  intro: ['PSYCH 111 · General Psychology', 'PSYCH 301 · Psychological Statistics', 'PSYCH 210 · Psychology of Personality'],
  upper: ['PSYCH 304 · Research Methods', 'PSYCH 341 · Organizational Psychology', 'PSYCH 375 · Cognition']
},
{
  match: /health|nurs|pre-?med|biolog|exercise/i,
  building: 'MARB',
  intro: ['BIO 130 · Biology', 'CHEM 105 · General Chemistry', 'HLTH 130 · Personal Health'],
  upper: ['PH 300 · Epidemiology', 'PH 360 · Health Policy', 'PDBIO 305 · Human Physiology']
},
{
  match: /business|management|strateg|entrepreneur|consult|operations|\bHR\b|human resource/i,
  building: 'Tanner',
  intro: ['MCOM 320 · Business Communication', 'ACC 200 · Principles of Accounting', 'ECON 110 · Economic Principles'],
  upper: ['STRAT 401 · Business Strategy', 'GSCM 201 · Operations Management', 'ENT 381 · Entrepreneurial Process']
}];


const GENERAL: Track = {
  match: /$^/,
  building: 'JFSB',
  intro: ['WRTG 150 · Writing and Rhetoric', 'STAT 121 · Statistics', 'ECON 110 · Economic Principles'],
  upper: ['WRTG 316 · Technical Writing', 'STAT 121 · Statistics', 'ECON 110 · Economic Principles']
};

/** Class slots, in order; the times stay fixed so conflicts look the same for every student. */
const SLOTS = [
{ days: [1, 3, 5], start: '11:00', end: '11:50', room: '1170' },
{ days: [2, 4], start: '09:30', end: '10:45', room: '260' },
{ days: [2, 4], start: '15:30', end: '16:45', room: '2110' }];


function trackFor(text: string): Track | undefined {
  return text.trim() ? TRACKS.find((t) => t.match.test(text)) : undefined;
}

function isUpperclass(year: string): boolean {
  return !/freshman|sophomore/i.test(year);
}

/** A believable week for this student: two classes from their major, one from the role they want, religion, a campus job. */
export function buildSchedule(profile: Profile): ScheduleBlock[] {
  const roleText = [...profile.lookingFor.roleTypes, ...profile.experience.map((e) => e.title), profile.headline].join(' · ');
  const major = trackFor(profile.education.major) ?? trackFor(roleText) ?? GENERAL;
  const role = trackFor(profile.lookingFor.roleTypes.join(' · ')) ?? trackFor(roleText);
  const upper = isUpperclass(profile.year);
  const level = (t: Track) => upper ? t.upper : t.intro;

  const classes: {title: string;building: string;}[] =
  role && role !== major ?
  [
  { title: level(major)[0], building: major.building },
  { title: level(major)[1], building: major.building },
  { title: level(role).find((c) => !level(major).includes(c)) ?? level(role)[0], building: role.building }] :

  level(major).slice(0, 3).map((title) => ({ title, building: major.building }));

  return [
  ...classes.map((c, i) => ({
    id: `s${i + 1}`,
    title: c.title,
    days: SLOTS[i].days,
    start: SLOTS[i].start,
    end: SLOTS[i].end,
    location: `${c.building} ${SLOTS[i].room}`
  })),
  { id: 's4', title: 'REL C 225 · Foundations of the Restoration', days: [2, 4], start: '12:00', end: '12:50', location: 'JSB 140' },
  upper ?
  { id: 's5', title: `TA shift · ${major.intro[0].split(' · ')[0]}`, days: [1, 3], start: '17:00', end: '19:00', location: `${major.building} lab` } :
  { id: 's5', title: 'Shift · Harold B. Lee Library', days: [1, 3], start: '17:00', end: '19:00', location: 'HBLL Help Desk' },
  { id: 's6', title: 'FHE group', days: [1], start: '19:30', end: '21:00', location: 'Heritage Halls' }];

}
