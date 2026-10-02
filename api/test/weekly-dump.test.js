import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWeeklyDump, parseWhen } from '../src/weekly-dump.js';
import { submitBulk } from '../src/submit.js';

// A real weekly message from the AIS officers (September 2026), with the private Slack link replaced.
const DUMP = `We’ve got a packed week for AIS! We have THREE :three: of our sponsors coming to campus. They want you to learn about their company and apply!

We will keep this message up to date for any changes about activities

Anglepoint Info Session
What: Learn about the company and what opportunities are available for IS students
When: Tuesday 9/15 6-7pm
Where: TNRB 2051
Food: Jdawgs :hotdog:

The Church of Jesus Christ Info Session
What: Learn about the company and what opportunities are available for IS students
When: Wednesday 9/16 5-6pm
Where: TNRB 4315/4325
Food: Pizza :pizza:

Credera
What: Learn about the company and what opportunities are available for IS students
When: Wednesday 9/16 6-7pm
Where: TNRB 710
Food: Chick-fli-a :chickfila:

STEM Career Fair
What: Meet with companies and learn about their opportunities
When: Thursday 9/17 9am - 3pm
Where: WSC Ballroom
Register HERE

IS Academy
What: Learn about the IS major
When: Thursday 9/17 7-8pm
Where: TNRB 3325
Food: Light refreshments

A-Team :a-team:
What: Come help out with AIS, including planning activities, marketing, and more!
When: Friday 9/18 9-10am
Where: TNRB 3319
Food: Breakfast

:blue_siren: AIS Software Innovation Challenge :blue_siren:
See https://example.slack.com/archives/C0HM9NNGK/p1789148654306089 for more details

Non-AIS events
Product Management Association Opening Social
See #emphasis_prod_mgmt for details

Collegiate Cyber Defense Competition Info Session
See #emphasis_cyber_security for details

2026 SLC DevFest
See #emphasis_software_dev for details

Next week
Tech Talk`;

const now = new Date('2026-09-14T12:00:00-06:00');

test('parseWhen reads the dump formats and picks the year whose weekday matches', () => {
  assert.deepEqual(parseWhen('Tuesday 9/15 6-7pm', now), { date: '2026-09-15', range: { start: '18:00', end: '19:00' } });
  assert.deepEqual(parseWhen('Thursday 9/17 9am - 3pm', now), { date: '2026-09-17', range: { start: '09:00', end: '15:00' } });
  assert.deepEqual(parseWhen('Friday 9/18 9-10am', now), { date: '2026-09-18', range: { start: '09:00', end: '10:00' } });
  // 9/15 is a Monday in 2025, a Tuesday in 2026 and a Wednesday in 2027, so a Friday matches no nearby year
  assert.equal(parseWhen('Friday 9/15 6-7pm', now), null);
  assert.equal(parseWhen('Monday 9/15 6-7pm', now).date, '2025-09-15');
  // with no weekday, the nearest year wins
  assert.equal(parseWhen('1/5 6-7pm', new Date('2026-12-20T12:00:00-07:00')).date, '2027-01-05');
  assert.equal(parseWhen('2/30 6-7pm', now), null);
  assert.equal(parseWhen('sometime soon', now), null);
});

test('the weekly dump yields six events and reports what it could not date', () => {
  const { events, skipped } = parseWeeklyDump(DUMP, { now });
  assert.deepEqual(events.map((e) => e.title), [
    'Anglepoint Info Session', 'The Church of Jesus Christ Info Session', 'Credera Info Session',
    'STEM Career Fair', 'IS Academy', 'A-Team'
  ]);
  const [anglepoint, church, credera, fair, academy, ateam] = events;
  assert.equal(anglepoint.start, '2026-09-15 18:00:00');
  assert.equal(anglepoint.end, '2026-09-15 19:00:00');
  assert.equal(anglepoint.location, 'TNRB 2051');
  assert.equal(anglepoint.type, 'info_session');
  assert.deepEqual(anglepoint.companies, ['Anglepoint']);
  assert.match(anglepoint.description, /Food: Jdawgs\./);
  assert.ok(!anglepoint.description.includes(':hotdog:'));
  assert.equal(church.location, 'TNRB 4315/4325');
  assert.deepEqual(church.companies, ['The Church of Jesus Christ']);
  assert.deepEqual(credera.companies, ['Credera']); // title gains "Info Session", company is just the name
  assert.equal(fair.type, 'career_fair');
  assert.deepEqual(fair.companies, []);
  assert.equal(fair.start, '2026-09-17 09:00:00');
  assert.equal(fair.end, '2026-09-17 15:00:00');
  assert.equal(academy.type, 'other');
  assert.equal(ateam.title, 'A-Team'); // emoji shortcode removed
  assert.equal(ateam.type, 'club_event');
  for (const e of events) assert.ok(e.fields.includes('information systems'));
  assert.deepEqual(skipped, [
    'AIS Software Innovation Challenge: no date in the message',
    'Product Management Association Opening Social: no date in the message',
    'Collegiate Cyber Defense Competition Info Session: no date in the message',
    '2026 SLC DevFest: no date in the message'
  ]);
});

test('private Slack links are never kept, other links become the registration link', () => {
  const withLinks = parseWeeklyDump(`Career Fair\nWhat: Meet employers\nWhen: Thursday 9/17 9am - 3pm\nWhere: WSC\nRegister https://byu.example.com/register and https://example.slack.com/archives/C1/p1`, { now }).events[0];
  assert.equal(withLinks.url, 'https://byu.example.com/register');
  const slackOnly = parseWeeklyDump(`Career Fair\nWhat: Meet employers\nWhen: Thursday 9/17 9am - 3pm\nSee https://example.slack.com/archives/C1/p1`, { now }).events[0];
  assert.equal(slackOnly.url, '');
});

test('text in another format is not claimed by the parser', () => {
  assert.deepEqual(parseWeeklyDump('Hey all, Qualtrics is hosting something next Thursday, come by if you can!', { now }).events, []);
});

test('submitBulk reads the format without calling the model, saves events as unverified, and skips past ones', async () => {
  let modelCalls = 0;
  const saved = [];
  const out = await submitBulk({ text: DUMP, source: 'slack' }, {
    now,
    extract: async () => { modelCalls++; return []; },
    save: async (row) => { saved.push(row); return row; }
  });
  assert.equal(modelCalls, 0);
  assert.equal(out.method, 'format');
  assert.equal(out.saved, 6);
  assert.ok(saved.every((r) => r.verified === false && r.source === 'slack'));
  assert.ok(out.skipped.some((s) => s.startsWith('2026 SLC DevFest')));

  // the same message a month later: every event is past and nothing is saved
  const late = await submitBulk({ text: DUMP }, { now: new Date('2026-10-20T12:00:00-06:00'), extract: async () => [], save: async (r) => r });
  assert.equal(late.saved, 0);
  assert.equal(late.skipped.filter((s) => s.endsWith('already past')).length, 6);

  // dry run saves nothing
  const dry = await submitBulk({ text: DUMP, dry_run: true }, { now, extract: async () => [], save: async () => { throw new Error('must not save'); } });
  assert.equal(dry.saved, 0);
  assert.equal(dry.events.length, 6);
  assert.equal(dry.dry_run, true);
});

test('submitBulk falls back to the model for other text', async () => {
  let modelCalls = 0;
  const out = await submitBulk({ text: 'Qualtrics hosts an info session on 10/8 at 6pm in the Tanner Building, everyone welcome' }, {
    now: new Date('2026-10-02T12:00:00-06:00'),
    extract: async () => { modelCalls++; return [{ title: 'Qualtrics Info Session', start: '2026-10-08T18:00:00-06:00', type: 'info_session', companies: ['Qualtrics'] }]; },
    save: async (r) => r
  });
  assert.equal(modelCalls, 1);
  assert.equal(out.method, 'llm');
  assert.equal(out.saved, 1);
});
