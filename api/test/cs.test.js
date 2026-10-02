import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractEventLinks, extractIcsLink, parseIcs, icsToDenver, htmlToText } from '../src/ingest-cs.js';
import { classify } from '../src/classify.js';
import { toEventRow } from '../src/event.js';

test('extractEventLinks finds dated event pages once, absolute or relative', () => {
  const html = `<a href="/homecoming-hackathon-2026-10-02">x</a><a href="https://cs.byu.edu/homecoming-hackathon-2026-10-02">y</a>
    <a href="/grad-school-fair-2026-10-15/">z</a><a href="/department/event-calendar">no</a>`;
  assert.deepEqual(extractEventLinks(html), ['https://cs.byu.edu/homecoming-hackathon-2026-10-02', 'https://cs.byu.edu/grad-school-fair-2026-10-15']);
});

test('extractIcsLink reads the per-event ICS url', () => {
  assert.equal(extractIcsLink('<a href="/_event.ics?e=000001a0-cf7f-d486-a9e1-cf7fa6c40001">Add</a>'), 'https://cs.byu.edu/_event.ics?e=000001a0-cf7f-d486-a9e1-cf7fa6c40001');
  assert.equal(extractIcsLink('<a href="/other">'), null);
});

test('ICS dates: UTC converts to Denver wall time, TZID and floating pass through', () => {
  assert.equal(icsToDenver('20261002T140000Z'), '2026-10-02 08:00:00');
  assert.equal(icsToDenver('20261202T140000Z'), '2026-12-02 07:00:00');
  assert.equal(icsToDenver('20261002T080000', ';TZID=America/Denver'), '2026-10-02 08:00:00');
});

test('parseIcs reads a folded VEVENT and the result becomes a valid event row', () => {
  const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'SUMMARY:Homecoming Hackathon', 'DTSTART:20261002T140000Z', 'DTEND:20261003T020000Z',
    'LOCATION:ESC Annex', 'DESCRIPTION:Sponsors: Neighbor\, Waystar and ', ' Redo.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const ev = parseIcs(ics);
  assert.equal(ev.title, 'Homecoming Hackathon');
  assert.equal(ev.description, 'Sponsors: Neighbor, Waystar and Redo.');
  const row = toEventRow({ ...ev, ...classify(ev.title, ev.description), source: 'cs_dept' });
  assert.equal(row.start_at, '2026-10-02T08:00:00-06:00');
  assert.equal(row.type, 'hackathon');
  assert.deepEqual(row.companies.sort(), ['Neighbor', 'Redo', 'Waystar']);
});

test('htmlToText drops nav and footer so their company names are not picked up', () => {
  assert.equal(htmlToText('<nav>Google</nav><p>Hello <b>there</b></p><footer>Amazon</footer>'), 'Hello there');
});

test('classify recognizes grad school fairs and seminars', () => {
  assert.equal(classify('Grad School Fair').type, 'career_fair');
  assert.equal(classify('Weekly Seminar - David Yarowsky').type, 'lecture');
});
