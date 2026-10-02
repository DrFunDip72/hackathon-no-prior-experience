import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreEvent, recommend } from '../src/scoring.js';
import { denverIso, dedupeHash, toEventRow, normalizePeople } from '../src/event.js';
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

test('classify does not mistake a clock time for the Product Manager abbreviation', async () => {
  const { classify } = await import('../src/classify.js');
  // Real example from the live calendar: an FHE activity whose only "pm" is its start time.
  const fhe = classify('Amazing Race FHE', 'Families welcome. Programs at 7:00 and 7:30 PM. Refreshments provided.');
  assert.ok(!fhe.fields.includes('product'), 'a clock time alone should not tag an event "product"');

  const pm = classify('Product Night', 'Meet our PM team and learn what product managers do.');
  assert.ok(pm.fields.includes('product'), 'a real PM mention should still tag the event "product"');
});

test('a target role matches an event by its classified field, not just a literal phrase', () => {
  const productEvent = {
    title: 'Qualtrics Product Night', start_at: '2026-10-05T18:00:00-06:00', type: 'networking',
    companies: ['Qualtrics'], fields: ['product'], description: ''
  };
  // "Product Manager" never appears verbatim in the event text, only the classified field "product".
  const p = { target_companies: [], target_roles: ['Product Manager'], fields: [] };
  assert.deepEqual(scoreEvent(productEvent, p, { now }).matched_fields, ['product manager']);
});

test('in-progress events stay in the window and companies lead with matches', () => {
  const live = { ...hackathon, end_at: '2026-10-02T20:00:00-06:00', companies: ['Waystar', 'Neighbor', 'Redo'] };
  const later = new Date('2026-10-02T15:00:00-06:00');
  const out = recommend([live], { target_companies: ['Redo'] }, { now: later, from: later.toISOString() });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].event.companies, ['Redo', 'Neighbor', 'Waystar']);
  const ended = recommend([live], { target_companies: ['Redo'] }, { from: '2026-10-02T21:00:00-06:00' });
  assert.equal(ended.length, 0);
});

test('toEventRow separates grad programs, strips subtitles, sorts, and flags submissions unverified', () => {
  const row = toEventRow({
    title: 'X', start: '2026-10-28 16:00:00', source: 'careerlaunch',
    companies: ['Sodexo', 'Disney College Program - Networking Readiness', 'Duke University Pratt School of Engineering Graduate School', 'Carnegie Mellon MSCF', 'Disney College Program']
  });
  assert.deepEqual(row.companies, ['Disney College Program', 'Sodexo']);
  assert.deepEqual(row.programs, ['Carnegie Mellon MSCF', 'Duke Pratt School of Engineering']);
  assert.equal(row.verified, true);
  assert.equal(toEventRow({ title: 'Y', start: '2026-10-28 16:00:00', source: 'user_submission' }).verified, false);
});

test('people are normalized with stable ids and only kept when named', () => {
  const people = normalizePeople([{ name: ' Ash Nguyen ', company: 'Qualtrics Inc', kind: 'recruiter', tags: ['Product'] }, { title: 'no name' }]);
  assert.equal(people.length, 1);
  assert.equal(people[0].name, 'Ash Nguyen');
  assert.match(people[0].id, /^per_[0-9a-f]{8}$/);
  assert.deepEqual(people[0].tags, ['product']);
  assert.equal(people[0].kind, 'recruiter');
});

test('submit token guard fails closed and compares exactly', async () => {
  const { checkSubmitToken, createRateLimiter } = await import('../src/guard.js');
  assert.equal(checkSubmitToken({}, undefined).status, 503);
  assert.equal(checkSubmitToken({ 'x-submit-token': 'nope' }, 'secret').status, 401);
  assert.equal(checkSubmitToken({}, 'secret').status, 401);
  assert.equal(checkSubmitToken({ 'x-submit-token': 'secret' }, 'secret').ok, true);
  assert.equal(checkSubmitToken({ authorization: 'Bearer secret' }, 'secret').ok, true);
  const allow = createRateLimiter({ max: 2, windowMs: 1000 });
  assert.deepEqual([allow('a', 0), allow('a', 1), allow('a', 2), allow('b', 2), allow('a', 1500)], [true, true, false, true, true]);
});

test('parseExtractionList reads arrays, wrapped objects, and fenced output', async () => {
  const { parseExtractionList } = await import('../src/extract.js');
  assert.equal(parseExtractionList('```json\n[{"title":"A"},{"title":"B"}]\n```').length, 2);
  assert.equal(parseExtractionList('{"events":[{"title":"A"}]}').length, 1);
  assert.equal(parseExtractionList('[]').length, 0);
  assert.equal(parseExtractionList('no events here'), null);
});

test('bulk rows are unverified, keep the summary not raw text, and drop past or undated events', async () => {
  const { buildBulkRows } = await import('../src/extract.js');
  const now = new Date('2026-10-02T12:00:00-06:00');
  const { rows, skipped } = buildBulkRows([
    { title: 'Qualtrics Info Session', start: '2026-10-08T18:00:00-06:00', type: 'info_session', companies: ['Qualtrics'], url: 'https://example.com/rsvp', description: 'Product roles overview.' },
    { title: 'Old Fair', start: '2026-09-01T10:00:00-06:00' },
    { title: 'No date' }
  ], { source: 'slack', now });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].verified, false);
  assert.equal(rows[0].source, 'slack');
  assert.equal(rows[0].registration_url, 'https://example.com/rsvp');
  assert.equal(rows[0].description, 'Product roles overview.');
  assert.equal(skipped.length, 2);
});
