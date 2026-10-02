import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Database tests run only when TEST_DATABASE_URL points at a throwaway Postgres (never production).
const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const { titleSimilarity, sameLocation, isNearDuplicate } = await import('../src/similar.js');
const { toEventRow } = await import('../src/event.js');
const { importEvents } = await import('../src/submit.js');

test('titles: abbreviations expand and word overlap must reach 0.8', () => {
  assert.equal(titleSimilarity('Graduate School Fair', 'Grad School Fair'), 1);
  assert.equal(titleSimilarity('Qualtrics Info Session', 'Qualtrics Information Session'), 1);
  assert.ok(titleSimilarity('HXP Tabling', 'HXP Info Session') < 0.5);
  assert.ok(titleSimilarity('Career Fair', 'Grad School Fair') < 0.8);
  assert.equal(titleSimilarity('', 'Career Fair'), 0);
});

test('locations: same name, contained room, or unknown all match; different rooms do not', () => {
  assert.equal(sameLocation('WSC Ballroom', 'wsc ballroom'), true);
  assert.equal(sameLocation('TNRB 2051', 'Tanner Building, TNRB 2051 (251)'), true);
  assert.equal(sameLocation('Wilkinson Center Ballroom', 'WSC Ballroom'), true);
  assert.equal(sameLocation('WSC Ballroom', 'Wilkinson Student Center Ballroom'), true);
  assert.equal(sameLocation('TNRB 2051', 'Tanner Building 2051'), true);
  assert.equal(sameLocation('WSC Ballroom', 'TNRB 2051'), false);
  assert.equal(sameLocation('TBD', 'TNRB 2051'), true);
  assert.equal(sameLocation('', 'TNRB 2051'), true);
  assert.equal(sameLocation('TNRB 2051', 'TNRB 2124'), false);
  assert.equal(sameLocation('WSC Ballroom', 'Marriott Center'), false);
});

test('near-duplicates: 30-minute window, place and title all have to agree', () => {
  const a = { title: 'Graduate School Fair', start_at: '2026-10-15T17:00:00Z', location: 'WSC Ballroom' };
  assert.equal(isNearDuplicate(a, { ...a, title: 'Grad School Fair', start_at: '2026-10-15T17:25:00Z', location: 'wsc ballroom' }), true);
  assert.equal(isNearDuplicate(a, { ...a, title: 'Grad School Fair', start_at: '2026-10-15T17:45:00Z' }), false);
  assert.equal(isNearDuplicate(a, { ...a, title: 'Grad School Fair', location: 'Marriott Center' }), false);
  assert.equal(isNearDuplicate(a, { ...a, title: 'Career Fair' }), false);
});

test('importEvents saves structured events as unverified, skips past and unreadable ones, and validates input', async () => {
  const now = new Date('2026-10-02T12:00:00-06:00');
  const saved = [];
  const out = await importEvents({
    source: 'clubs',
    events: [
      { title: 'PwC: Info Session', start: '2026-10-14 18:00', end: '2026-10-14 19:00', location: 'TNRB 2051', type: 'info_session', companies: ['PwC'], fields: ['consulting'] },
      { title: 'Old Tabling', start: '2026-09-09 09:00' },
      { title: 'No date' }
    ]
  }, { now, save: async (r) => { saved.push(r); return r; } });
  assert.equal(out.saved, 1);
  assert.equal(saved[0].verified, false);
  assert.equal(saved[0].source, 'clubs');
  assert.equal(saved[0].start_at, '2026-10-14T18:00:00-06:00');
  assert.equal(out.skipped.length, 2);

  const trusted = await importEvents({ verified: true, events: [{ title: 'X Info Session', start: '2026-10-20 18:00' }] }, { now, save: async (r) => r });
  assert.equal(trusted.events[0].verified, true);

  const dry = await importEvents({ dry_run: true, events: [{ title: 'X', start: '2026-10-20 18:00' }] }, { now, save: async () => { throw new Error('must not save'); } });
  assert.equal(dry.saved, 0);
  assert.equal(dry.events.length, 1);

  await assert.rejects(importEvents({ events: [] }, { save: async () => {} }), /at least one event/);
  await assert.rejects(importEvents({ events: 'nope' }, { save: async () => {} }), /at least one event/);
  await assert.rejects(importEvents({ events: Array.from({ length: 501 }, () => ({})) }, { save: async () => {} }), /at most 500/);
  await assert.rejects(importEvents([], { save: async () => {} }), /JSON object/);
});

const { pool, upsertEvent, mergeNearDuplicates } = TEST_DB ? await import('../src/db.js') : {};

describe('against a real database (set TEST_DATABASE_URL)', { skip: !TEST_DB }, () => {
  after(async () => { await pool.end(); });

  async function freshDb() {
    await pool.query('drop table if exists events, companies');
    await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  }

  const fair = (extra = {}) => toEventRow({
    title: 'Graduate School Fair', start: '2026-10-15 11:00:00', end: '2026-10-15 15:00:00', location: 'WSC Ballroom', source: 'byu_calendar', type: 'career_fair', ...extra
  });

  test('the same event from two sources becomes one row with both sources listed', async () => {
    await freshDb();
    const first = await upsertEvent(fair());
    const second = await upsertEvent(fair({ title: 'Grad School Fair', source: 'cs_dept', location: 'wsc ballroom', companies: ['Duke Pratt'], fields: ['engineering'] }));
    const { rows } = await pool.query('select * from events');
    assert.equal(rows.length, 1);
    assert.equal(second.id, first.id); // one id is kept
    assert.equal(rows[0].title, 'Graduate School Fair'); // the verified listing's title stays
    assert.deepEqual(rows[0].sources, ['byu_calendar', 'cs_dept']);
    assert.deepEqual(rows[0].fields, ['engineering']);
  });

  test('re-ingesting the same source does not add sources or rows', async () => {
    await freshDb();
    await upsertEvent(fair());
    await upsertEvent(fair());
    const { rows } = await pool.query('select sources from events');
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].sources, ['byu_calendar']);
  });

  test('an unverified listing never overwrites a verified title, and a verified one replaces an unverified title', async () => {
    await freshDb();
    await upsertEvent(fair());
    await upsertEvent(fair({ title: 'Grad School Fair', source: 'slack', verified: false }));
    assert.equal((await pool.query('select title, verified from events')).rows[0].title, 'Graduate School Fair');

    await freshDb();
    await upsertEvent(fair({ title: 'Grad School Fair!!', source: 'slack', verified: false }));
    await upsertEvent(fair({ title: 'Graduate School Fair', source: 'cs_dept' }));
    const { rows } = await pool.query('select title, verified, sources from events');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'Graduate School Fair');
    assert.equal(rows[0].verified, true);
  });

  test('different events at the same time and place stay separate', async () => {
    await freshDb();
    await upsertEvent(fair({ title: 'HXP Tabling', location: 'TNRB Central' }));
    await upsertEvent(fair({ title: 'HXP Info Session', location: 'TNRB Central' }));
    await upsertEvent(fair({ title: 'Graduate School Fair', start: '2026-10-15 18:00:00', end: null }));
    assert.equal((await pool.query('select 1 from events')).rowCount, 3);
  });

  test('boot clean-up merges duplicates stored earlier, keeping a verified row, and is idempotent', async () => {
    await freshDb();
    // simulate rows stored before merging existed by inserting directly
    const a = fair({ source: 'byu_calendar' });
    const b = fair({ title: 'Grad School Fair', source: 'cs_dept', companies: ['Duke Pratt'] });
    for (const r of [a, b]) {
      await pool.query(
        `insert into events (id, title, start_at, end_at, location, type, companies, fields, source, dedupe_hash, sources)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [r.id, r.title, r.start_at, r.end_at, r.location, r.type, r.companies, r.fields, r.source, r.dedupe_hash, [r.source]]
      );
    }
    assert.equal(await mergeNearDuplicates(), 1);
    const { rows } = await pool.query('select title, companies, sources from events');
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].companies, ['Duke Pratt']);
    assert.deepEqual(rows[0].sources, ['byu_calendar', 'cs_dept']);
    assert.equal(await mergeNearDuplicates(), 0);
  });
});
