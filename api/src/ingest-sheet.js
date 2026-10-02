// Ingests the BYU "Hiring & Networking Events" Google Sheet (published as CSV, one tab per month).
// Layout: a header row, then blocks that start with a major-group row ("Engineering", "All Majors", ...)
// followed by event rows: Day, Date, Event Type, Company, Time, Location, Host.
// The same event is listed under every group it applies to, so rows are merged and the groups become `fields`.
import { upsertEvent } from './db.js';
import { toEventRow } from './event.js';

// Group heading (lowercase, matched by substring) -> career fields. Unknown headings fall back to the heading text.
const GROUP_FIELDS = [
  ['cs, is', ['software engineering', 'data', 'technology']],
  ['civil', ['civil engineering', 'construction']],
  ['engineering', ['engineering']],
  ['business', ['business']],
  ['nursing', ['healthcare']],
  ['social science', ['social science']],
  ['life sciences', ['life sciences']],
  ['humanities', ['humanities']],
  ['all majors', []]
];

// Human-readable page the sheet is published from; stored as each event's source_url.
const SOURCE_PAGE = process.env.SHEET_PAGE_URL ?? 'https://careers.byu.edu/hiring-and-networking-events';

const EVENT_TYPES = { 'info session': 'info_session', tabling: 'tabling', hackathon: 'hackathon', 'career fair': 'career_fair', networking: 'networking' };

// Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// "5:00 - 6:00pm", "8 AM–8 PM MDT", "6 PM–7 PM", "2:30 PM–3:15 PM" -> { start: "17:00", end: "18:00" }
export function parseTimeRange(raw) {
  const parts = clean(raw).replace(/\b(MDT|MST|MT)\b/gi, '').split(/\s*[-–—]\s*/);
  const parse = (s) => {
    const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?$/i.exec(s.trim());
    return m ? { h: Number(m[1]), min: Number(m[2] ?? 0), mer: m[3]?.toLowerCase() } : null;
  };
  const a = parse(parts[0] ?? '');
  const b = parts[1] ? parse(parts[1]) : null;
  if (!a) return null;
  const to24 = (t, mer) => (t.h % 12) + (mer === 'p' ? 12 : 0);
  let startMer = a.mer ?? b?.mer;
  let start = to24(a, startMer) * 60 + a.min;
  const end = b ? to24(b, b.mer ?? a.mer) * 60 + b.min : null;
  // "11:00 - 1:00pm": a start without am/pm inherits the end's, so flip to am if that puts it after the end.
  if (!a.mer && end !== null && start > end) start -= 12 * 60;
  const fmt = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  return { start: fmt(start), end: end === null ? null : fmt(end) };
}

const SOURCE_BY_HOST = [[/cs department|computer science/i, 'cs_dept'], [/career|rollins/i, 'careerlaunch']];

// CSV text -> merged event inputs (not yet normalized). Returns { events, skipped }.
export function parseSheet(csv) {
  const events = new Map();
  const skipped = [];
  let fields = [];
  for (const cells of parseCsv(csv)) {
    const [day, date, kind, company, time, location, host] = cells.map(clean);
    const dateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date ?? '');
    if (!dateMatch) {
      // A group heading has text in the first cell only.
      if (day && !date && !kind && !['Day', 'Hiring & Networking Events'].includes(day)) {
        const heading = day.toLowerCase();
        fields = GROUP_FIELDS.find(([key]) => heading.includes(key))?.[1] ?? [heading];
      }
      continue;
    }
    const range = parseTimeRange(time);
    if (!range || !company) {
      skipped.push(`${company || '(no company)'} on ${date}: unreadable time "${time}"`);
      continue;
    }
    const iso = `${dateMatch[3]}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
    const type = EVENT_TYPES[kind.toLowerCase()] ?? 'other';
    // Hackathon rows put the event name in the Company column; they have no sponsor listed.
    const isNamedEvent = type === 'hackathon';
    const title = isNamedEvent ? company : `${company} ${kind}`;
    const event = {
      title,
      start: `${iso} ${range.start}:00`,
      end: range.end ? `${iso} ${range.end}:00` : null,
      location,
      type,
      companies: isNamedEvent ? [] : [company],
      fields: [...fields],
      source: SOURCE_BY_HOST.find(([re]) => re.test(host))?.[1] ?? 'careerlaunch',
      description: `${kind}${isNamedEvent ? '' : ` with ${company}`}, hosted by ${host || 'BYU'}.`
    };
    const key = `${title.toLowerCase()}|${iso}|${location.toLowerCase()}`;
    const existing = events.get(key);
    if (existing) existing.fields = [...new Set([...existing.fields, ...event.fields])];
    else events.set(key, event);
  }
  return { events: [...events.values()], skipped };
}

// A published sheet's main page lists every tab (with its gid), so new month tabs are picked up without config.
// base: https://docs.google.com/spreadsheets/d/e/<id>   Returns CSV urls, or [] if no tabs could be found.
export async function discoverTabUrls(base) {
  const res = await fetch(`${base}/pubhtml`);
  if (!res.ok) throw new Error(`sheet discovery ${res.status}`);
  const html = await res.text();
  const gids = [...new Set([...html.matchAll(/(?:sheet-button-|[?&;]gid=|"gid":"?)(\d{3,})/g)].map((m) => m[1]))];
  console.log(`sheet discovery: found ${gids.length} tab(s): ${gids.join(', ') || 'none'}`);
  return gids.map((gid) => `${base}/pub?gid=${gid}&single=true&output=csv`);
}

// urls: published-sheet CSV links (one per month tab), e.g. https://docs.google.com/spreadsheets/d/e/<id>/pub?gid=<gid>&single=true&output=csv
export async function ingestSheets(urls) {
  for (const url of urls) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`sheet ${res.status} for ${url}`);
    const { events, skipped } = parseSheet(await res.text());
    let saved = 0;
    for (const e of events) {
      try {
        await upsertEvent(toEventRow({ ...e, source_url: SOURCE_PAGE }));
        saved++;
      } catch (err) {
        skipped.push(`${e.title}: ${err.message}`);
      }
    }
    console.log(`sheet ingest: upserted ${saved} of ${events.length} events from one tab`);
    for (const s of skipped) console.warn(`sheet ingest skipped ${s}`);
  }
}
