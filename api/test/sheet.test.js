import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseSheet, parseTimeRange } from '../src/ingest-sheet.js';
import { toEventRow } from '../src/event.js';

const CSV = `Hiring & Networking Events,,,,,,
,,,,,,
Day,Date,Event Type,Company,Time,Location,Host
Engineering,,,,,,
Thursday ,10/15/2026,Info Session,Sodexo ,6:00pm - 8:00pm,"Engineering Building (EB), EB 325",BYU Career Services
,,,,,,
"CS, IS, Math, Data, Technology, Actuarial",,,,,,
Friday,10/2/2026,Hackathon,Homecoming Hackathon,8 AM–8 PM MDT,ESC Annex,BYU CS Department
Business Majors (Economics),,,,,,
Thursday ,10/15/2026,Info Session ,Sodexo ,6:00pm - 8:00pm,"Engineering Building (EB), EB 325",BYU Career Services
Tuesday,10/6/2026,Info Session,Layton Construction,someday,B66 120,BYU Career Services
`;

test('parseTimeRange handles the sheet formats', () => {
  assert.deepEqual(parseTimeRange('6:00pm - 7:00pm'), { start: '18:00', end: '19:00' });
  assert.deepEqual(parseTimeRange('5:00 - 6:00pm'), { start: '17:00', end: '18:00' });
  assert.deepEqual(parseTimeRange('8 AM–8 PM MDT'), { start: '08:00', end: '20:00' });
  assert.deepEqual(parseTimeRange('2:30 PM–3:15 PM'), { start: '14:30', end: '15:15' });
  assert.deepEqual(parseTimeRange('11:00 - 1:00pm'), { start: '11:00', end: '13:00' });
  assert.equal(parseTimeRange('TBD'), null);
});

test('parseCsv keeps commas inside quotes', () => {
  assert.deepEqual(parseCsv('a,"b, c",d\n')[0], ['a', 'b, c', 'd']);
});

test('parseSheet merges duplicates across groups, tags fields, and reports bad rows', () => {
  const { events, skipped } = parseSheet(CSV);
  assert.equal(events.length, 2);
  const sodexo = events.find((e) => e.title === 'Sodexo Info Session');
  assert.deepEqual(sodexo.companies, ['Sodexo']);
  assert.deepEqual(sodexo.fields.sort(), ['business', 'engineering']);
  const hack = events.find((e) => e.title === 'Homecoming Hackathon');
  assert.equal(hack.type, 'hackathon');
  assert.equal(hack.source, 'cs_dept');
  assert.deepEqual(hack.companies, []);
  assert.equal(skipped.length, 1);
  const row = toEventRow(sodexo);
  assert.equal(row.start_at, '2026-10-15T18:00:00-06:00');
});
