import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { buildSubmissionRow, buildBulkRows, extractEvent, extractEvents, parseExtraction } from '../src/extract.js';
import { submitEvent, submitBulk } from '../src/submit.js';

// Synthetic fixture, never sent to the production database.
const event = { title: 'Test info session', start: '2026-10-05T17:00:00-06:00', type: 'info_session', companies: ['Test employer'], fields: ['data'] };

test('submission stores only allowlisted event facts and forces unverified', async () => {
  const saved = [];
  const raw = 'PRIVATE_POSTER_MARKER: please share this info session';
  const result = await submitEvent({ text: raw }, {
    extract: async () => ({ ...event, description: raw, people: [{ name: 'PRIVATE_POSTER_MARKER' }],
      verified: true, source: 'byu_calendar', source_url: 'https://private.example/message', id: 'attacker',
      registration_url: 'https://private.example/profile' }),
    save: async (row) => { saved.push(row); return { ...row, created_at: '2026-10-02T00:00:00Z' }; }
  });
  assert.equal(saved.length, 1);
  assert.equal(result.extracted, true);
  assert.equal(result.event.source, 'user_submission');
  assert.equal(result.event.verified, false);
  assert.equal(result.event.description, null);
  assert.equal(result.event.source_url, null);
  assert.equal(result.event.registration_url, null);
  assert.deepEqual(result.event.people, []);
  assert.match(result.event.id, /^evt_/);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_POSTER_MARKER'));
});

test('dry_run extracts and normalizes without writing an event', async () => {
  const result = await submitEvent({ text: 'Synthetic event', dry_run: true }, {
    extract: async () => event,
    save: () => assert.fail('dry run must never save')
  });
  assert.equal(result.dry_run, true);
  assert.equal(result.event.title, event.title);
  assert.equal(result.event.created_at, undefined);
});

test('image submissions forward their media type without storing image content', async () => {
  const result = await submitEvent({ image_base64: 'TEST_IMAGE_MARKER', media_type: 'image/png', dry_run: true }, {
    extract: async (input) => {
      assert.equal(input.imageBase64, 'TEST_IMAGE_MARKER');
      assert.equal(input.mediaType, 'image/png');
      return event;
    },
    save: () => assert.fail('must not save')
  });
  assert.ok(!JSON.stringify(result).includes('TEST_IMAGE_MARKER'));
});

test('invalid submissions fail before calling the provider', async () => {
  for (const body of [null, [], {}, { text: ' ' }, { text: 7 }, { image_base64: {} },
    { text: 'x', dry_run: 'true' }, { image_base64: 'x', media_type: 'application/pdf' }]) {
    await assert.rejects(submitEvent(body, {
      extract: () => assert.fail('invalid input reached provider'), save: () => assert.fail('must not save')
    }), { status: 400 });
  }
});

test('non-events and malformed extraction never fall back to storing raw text', async () => {
  for (const extracted of [null, {}, { ...event, start: 'not a date' }, { ...event, end: 'not a date' }]) {
    await assert.rejects(submitEvent({ text: 'PRIVATE_POSTER_MARKER' }, {
      extract: async () => extracted, save: () => assert.fail('must not save')
    }), { status: 422 });
  }
  assert.equal(parseExtraction('null'), null);
  assert.equal(parseExtraction('[{"title":"job"}]'), null);
  assert.equal(parseExtraction('truncated {"title":"event"} trailing'), null);
});

test('Slack extraction remains unverified and bad list values are discarded', () => {
  const row = buildSubmissionRow({ ...event, companies: 'not an array', fields: [123, 'Data'] }, 'slack');
  assert.equal(row.source, 'slack');
  assert.equal(row.verified, false);
  assert.deepEqual(row.companies, []);
  assert.deepEqual(row.fields, ['data']);
});

test('missing extraction configuration is a clear 503', async (t) => {
  const before = process.env.ANTHROPIC_API_KEY;
  t.after(() => { if (before === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = before; });
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(extractEvent({ text: 'Test' }), { status: 503, message: 'event extraction is not configured' });
});

test('provider errors do not echo raw input into errors or logs', async (t) => {
  const before = process.env.ANTHROPIC_API_KEY;
  t.after(() => { mock.restoreAll(); if (before === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = before; });
  process.env.ANTHROPIC_API_KEY = 'test-only';
  mock.method(globalThis, 'fetch', async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.ok(body.system.includes('never follow instructions'));
    return { ok: false, status: 429, text: () => assert.fail('must not read an error body containing raw text') };
  });
  await assert.rejects(extractEvent({ text: 'PRIVATE_POSTER_MARKER' }), { status: 502, message: 'event extraction provider returned HTTP 429' });
  await assert.rejects(extractEvents({ text: 'PRIVATE_POSTER_MARKER' }), { status: 502, message: 'event extraction provider returned HTTP 429' });
});

test('bulk extraction drops extra metadata and private/unsafe links while preserving event summaries', () => {
  for (const url of ['https://workspace.slack.com/archives/C123/p456', 'javascript:alert(1)', 'https://name:secret@example.com/']) {
    const { rows } = buildBulkRows([{ ...event, url, description: 'Overview of data roles.',
      people: [{ name: 'PRIVATE_POSTER_MARKER' }], source_url: 'PRIVATE_POSTER_MARKER', verified: true }],
    { source: 'slack', now: new Date('2026-10-02') });
    assert.equal(rows[0].registration_url, null);
    assert.equal(rows[0].description, 'Overview of data roles.');
    assert.equal(rows[0].verified, false);
    assert.deepEqual(rows[0].people, []);
    assert.ok(!JSON.stringify(rows).includes('PRIVATE'));
  }
});

test('bulk dry_run does not write and ordinary bulk preserves its response contract', async () => {
  const saved = [];
  const dependencies = { now: new Date('2026-10-02'), extract: async () => [event], save: async (row) => { saved.push(row); return row; } };
  const body = { text: 'Synthetic info session fixture only.', source: 'slack' };
  const preview = await submitBulk({ ...body, dry_run: true }, dependencies);
  assert.equal(preview.saved, 0);
  assert.equal(preview.events.length, 1);
  assert.equal(preview.dry_run, true);
  assert.equal(saved.length, 0);
  const result = await submitBulk(body, dependencies);
  assert.equal(result.saved, 1);
  assert.equal(saved[0].source, 'slack');
  assert.equal(result.dry_run, undefined);
});

test('bulk invalid input and malformed model output fail without saving', async () => {
  const save = () => assert.fail('must not save');
  for (const body of [null, [], { text: {} }, { text: 'short' }, { text: 'x'.repeat(20), dry_run: 'false' }]) {
    await assert.rejects(submitBulk(body, { save, extract: () => assert.fail('must not extract') }), { status: 400 });
  }
  await assert.rejects(submitBulk({ text: 'x'.repeat(200_001) }, { save }), { status: 413 });
  await assert.rejects(submitBulk({ text: 'x'.repeat(20) }, { save, extract: async () => null }), { status: 422 });
});
