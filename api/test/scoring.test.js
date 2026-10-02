import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreEvent, recommend } from '../src/scoring.js';
import { denverIso, dedupeHash, toEventRow } from '../src/event.js';
import { parseExtraction } from '../src/extract.js';

const now = new Date('2026-10-02T08:00:00-06:00');
const hackathon = {
  title: 'CS Hackathon', start_at: '2026-10-02T09:00:00-06:00', type: 'hackathon',
  companies: ['Redo', 'Neighbor', 'Waystar'], fields: ['software engineering', 'product'], description: ''
};
const profile = { target_companies: ['redo', 'Qualtrics'], target_roles: ['backend engineer'], fields: ['software engineering', 'data'] };

test('company match is case-insensitive and drives the reason string', () => {
  const r = scoreEvent(hackathon, profile, { now });
  assert.deepEqual(r.matched_companies, ['Redo']);
  assert.deepEqual(r.matched_fields, ['software engineering']);
  assert.match(r.reason, /^Redo rep attending, matches 1 of your 2 target companies\./);
  // 10 + 3 + 1 (hackathon) + ~3 recency (starts in an hour)
  assert.ok(r.score > 16.9 && r.score <= 17);
});

test('aliases map to the canonical company', () => {
  const r = scoreEvent({ ...hackathon, companies: ['Redo Tech'] }, { target_companies: ['Redo'] }, { now });
  assert.deepEqual(r.matched_companies, ['Redo']);
});

test('recommend sorts by score, drops events below 1, and respects the window', () => {
  const unrelated = { title: 'Poetry Night', start_at: '2026-10-10T19:00:00-06:00', type: 'other', companies: [], fields: [], description: '' };
  const late = { ...hackathon, title: 'Later', start_at: '2026-12-01T09:00:00-07:00', companies: ['Redo'] };
  const out = recommend([unrelated, late, hackathon], profile, { now });
  // "Later" is outside the 21-day window; the unrelated event only survives on its recency boost.
  assert.deepEqual(out.map((r) => r.event.title), ['CS Hackathon', 'Poetry Night']);
});

test('denverIso adds the right offset across DST', () => {
  assert.equal(denverIso('2026-10-05 19:00:00'), '2026-10-05T19:00:00-06:00');
  assert.equal(denverIso('2026-11-05 19:00:00'), '2026-11-05T19:00:00-07:00');
});

test('dedupe hash ignores case and uses the local date', () => {
  assert.equal(dedupeHash('CS Hackathon', '2026-10-02T09:00:00-06:00', 'TMCB'), dedupeHash('cs hackathon', '2026-10-02T21:00:00-06:00', 'tmcb'));
});

test('toEventRow normalizes and rejects events with no start', () => {
  const row = toEventRow({ title: ' X ', start: '2026-10-02 09:00:00', type: 'bogus', companies: ['redo tech', 'Redo'] });
  assert.equal(row.type, 'other');
  assert.deepEqual(row.companies, ['Redo']);
  assert.throws(() => toEventRow({ title: 'No date' }));
});

test('parseExtraction strips code fences and returns null on garbage', () => {
  assert.deepEqual(parseExtraction('```json\n{"title":"A"}\n```'), { title: 'A' });
  assert.equal(parseExtraction('sorry, no'), null);
});

test('classify tags type and only known companies', async () => {
  const { classify } = await import('../src/classify.js');
  const c = classify('CS Hackathon', 'Sponsored by Redo and Neighbor. Software engineering teams.');
  assert.equal(c.type, 'hackathon');
  assert.deepEqual(c.companies, ['Redo', 'Neighbor']);
  assert.ok(c.fields.includes('software engineering'));
  assert.equal(classify('Poetry Night').type, 'other');
});

test('field matching is word-aware and relevant_only drops unmatched noise', () => {
  const p = { target_companies: [], fields: ['software'] };
  assert.deepEqual(scoreEvent(hackathon, p, { now }).matched_fields, ['software']);
  const noise = { title: 'Poetry Night', start_at: '2026-10-03T19:00:00-06:00', type: 'other', companies: [], fields: [], description: '' };
  assert.equal(recommend([noise, hackathon], p, { now }).length, 2);
  assert.deepEqual(recommend([noise, hackathon], p, { now, relevantOnly: true }).map((r) => r.event.title), ['CS Hackathon']);
});
