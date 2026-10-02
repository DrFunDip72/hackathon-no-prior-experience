import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The database tests run only when TEST_DATABASE_URL points at a throwaway Postgres (never production):
//   TEST_DATABASE_URL=postgres://postgres@localhost:54329/doorway_test npm test
const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const { classify, isNonCareerEvent } = await import('../src/classify.js');
const { toEventRow } = await import('../src/event.js');

const FHE = 'Programs at 7:00 and 7:30 PM. Refreshments: Crumbl cookies. Families and FHE groups welcome.';

test('clock times are not read as "PM = product manager"', () => {
  for (const text of [FHE, 'Join us from 4 to 8 pm', 'Doors at 7:00 PM', 'Meet at 6 P.M.', 'Sketching specimens from 7-9 PM!']) {
    assert.deepEqual(classify('Evening event', text).fields, [], text);
  }
  assert.deepEqual(classify('PM club meetup', 'Talk to a PM about product management').fields, ['product']);
});

test('non-career events are recognized, career events that mention them are kept', () => {
  assert.equal(isNonCareerEvent('Secret Agent Dash FHE', FHE), true);
  assert.equal(isNonCareerEvent('Craft Night: Paper Dinos'), true);
  assert.equal(isNonCareerEvent('Homecoming Dance: A Night at the Bayou'), true);
  assert.equal(isNonCareerEvent('BYU Devotional', 'Speaker: a general authority'), true);
  assert.equal(isNonCareerEvent('Ward service project'), true);
  assert.equal(isNonCareerEvent('Career Fair', 'Stay for the dance after'), false);
  assert.equal(isNonCareerEvent('Qualtrics Info Session', 'Pizza and game night after'), false);
  assert.equal(isNonCareerEvent('Stakeholder Management Workshop'), false);
  assert.equal(isNonCareerEvent('Sketching Dead Things', 'sketching specimens'), false);
});

test('Redo at a FHE-like title is still treated as career because a known company is named', () => {
  assert.equal(isNonCareerEvent('Redo game night', 'Recruiters from Redo attend'), false);
});

const { pool, upsertEvent } = TEST_DB ? await import('../src/db.js') : {};
const { cleanByuEvents } = TEST_DB ? await import('../src/backfill.js') : {};

describe('against a real database (set TEST_DATABASE_URL)', { skip: !TEST_DB }, () => {
  after(async () => { await pool.end(); });

  async function freshDb() {
    await pool.query('drop table if exists events, companies');
    await pool.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
  }
  
  const byuRow = (fields, extra = {}) => toEventRow({
    title: 'Secret Agent Dash FHE', start: '2026-10-05 19:00:00', location: 'EiZ Gallery', source: 'byu_calendar',
    description: FHE, fields, ...extra
  });
  
  test('a corrected classification replaces the old bad tag on a second ingest', async () => {
    await freshDb();
    await upsertEvent(byuRow(['product'])); // stored by the old, buggy classifier
    const second = await upsertEvent(byuRow([]), pool, { replace: ['fields', 'companies', 'programs'] });
    assert.deepEqual(second.fields, []);
    const { rows } = await pool.query('select fields from events');
    assert.deepEqual(rows[0].fields, []);
  });
  
  test('without replace the lists still union (curated and manual sources keep their data)', async () => {
    await freshDb();
    await upsertEvent(byuRow(['product']));
    const merged = await upsertEvent(byuRow(['data']));
    assert.deepEqual(merged.fields, ['data', 'product']);
  });
  
  test('replace never wipes tags another source added to the same event', async () => {
    await freshDb();
    await upsertEvent(byuRow(['software engineering'], { source: 'cs_dept', companies: ['Redo', 'Neighbor'] }));
    const out = await upsertEvent(byuRow([], { source: 'byu_calendar' }), pool, { replace: ['fields', 'companies'] });
    assert.deepEqual(out.fields, ['software engineering']);
    assert.deepEqual(out.companies, ['Neighbor', 'Redo']);
  });
  
  test('boot clean-up deletes stored non-career BYU events and retags the rest, and is idempotent', async () => {
    await freshDb();
    await upsertEvent(byuRow(['product']));
    await upsertEvent(toEventRow({ title: 'Craft Night: Paper Dinos', start: '2026-10-06 19:00:00', location: 'HBLL', source: 'byu_calendar', description: 'Craft night at 7:00 PM', fields: ['product'] }));
    await upsertEvent(toEventRow({ title: 'Redo Info Session', start: '2026-10-07 18:00:00', location: 'TMCB', source: 'byu_calendar', description: 'Redo recruiters', type: 'other', fields: ['product'] }));
    await upsertEvent(toEventRow({ title: 'Homecoming Hackathon', start: '2026-10-02 08:00:00', location: 'ESC Annex', source: 'cs_dept', fields: ['product'], companies: ['Redo'] }));
  
    const first = await cleanByuEvents();
    assert.equal(first.removed, 2); // both FHE and craft night
    const { rows } = await pool.query('select title, type, fields, companies from events order by title');
    assert.deepEqual(rows.map((r) => r.title), ['Homecoming Hackathon', 'Redo Info Session']);
    const info = rows.find((r) => r.title === 'Redo Info Session');
    assert.equal(info.type, 'info_session');
    assert.deepEqual(info.fields, []);
    assert.deepEqual(info.companies, ['Redo']);
    // another source's curated tags are untouched
    assert.deepEqual(rows.find((r) => r.title === 'Homecoming Hackathon').fields, ['product']);
  
    const again = await cleanByuEvents();
    assert.deepEqual(again, { removed: 0, retagged: 0 });
  });

  test('clean-up retags sponsor-less CS department events but leaves curated ones alone', async () => {
    await freshDb();
    await upsertEvent(toEventRow({ title: 'Grad School Fair', start: '2026-10-15 11:00:00', location: 'WSC Ballroom', source: 'cs_dept', fields: ['product'] }));
    await upsertEvent(toEventRow({ title: 'Homecoming Hackathon', start: '2026-10-02 08:00:00', location: 'ESC Annex', source: 'cs_dept', fields: ['product'], companies: ['Redo'] }));
    await cleanByuEvents();
    const { rows } = await pool.query('select title, type, fields from events order by title');
    assert.deepEqual(rows.find((r) => r.title === 'Grad School Fair'), { title: 'Grad School Fair', type: 'career_fair', fields: [] });
    assert.deepEqual(rows.find((r) => r.title === 'Homecoming Hackathon').fields, ['product']);
  });
});
