// Ingests BYU Computer Science department events (https://cs.byu.edu/department/event-calendar).
// The listing links to one page per event (".../<slug>-YYYY-MM-DD"), and each event page links a
// structured ICS file ("/_event.ics?e=<id>"), so no LLM or CSS selectors are needed.
import { upsertEvent } from './db.js';
import { toEventRow } from './event.js';
import { classify } from './classify.js';

const BASE = 'https://cs.byu.edu';
const LISTING = `${BASE}/department/event-calendar`;

const unescapeIcs = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

// Event page links look like "/homecoming-hackathon-2026-10-02" (absolute or relative).
export function extractEventLinks(html) {
  const links = new Set();
  for (const m of html.matchAll(/href=["']((?:https?:\/\/cs\.byu\.edu)?\/[a-z0-9-]+-\d{4}-\d{2}-\d{2})\/?["']/gi)) {
    links.add(m[1].startsWith('http') ? m[1] : `${BASE}${m[1]}`);
  }
  return [...links];
}

export function extractIcsLink(html) {
  const m = /href=["']((?:https?:\/\/cs\.byu\.edu)?\/_event\.ics\?e=[\w-]+)["']/i.exec(html);
  if (!m) return null;
  return (m[1].startsWith('http') ? m[1] : `${BASE}${m[1]}`).replace(/&amp;/g, '&');
}

// Page text without scripts, navigation and footers, so company names found in it come from the event itself.
export function htmlToText(html) {
  return html
    .replace(/<(script|style|nav|header|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// ICS date -> "YYYY-MM-DD HH:MM:SS" Denver wall time (or null). Handles UTC ("...Z"), TZID and floating values.
export function icsToDenver(value, params = '') {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z?)$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00', z] = m;
  if (z) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Denver', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)));
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
  }
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`; // TZID=America/Denver or floating: already Denver wall time
}

// Minimal VEVENT reader: SUMMARY, DTSTART, DTEND, LOCATION, DESCRIPTION, URL.
export function parseIcs(ics) {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const body = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/.exec(unfolded)?.[1];
  if (!body) return null;
  const props = {};
  for (const line of body.split(/\r?\n/)) {
    const m = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/.exec(line);
    if (m) props[m[1]] = { params: m[2], value: m[3] };
  }
  const text = (k) => (props[k] ? unescapeIcs(props[k].value).trim() : '');
  const date = (k) => (props[k] ? icsToDenver(props[k].value, props[k].params) : null);
  return { title: text('SUMMARY'), start: date('DTSTART'), end: date('DTEND'), location: text('LOCATION'), description: text('DESCRIPTION'), url: text('URL') };
}

async function getText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'doorway-events-bot' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

export async function ingestCs() {
  const links = extractEventLinks(await getText(LISTING));
  console.log(`cs ingest: found ${links.length} event link(s): ${links.map((l) => l.split('/').pop()).join(', ')}`);
  let saved = 0;
  for (const link of links) {
    try {
      const html = await getText(link);
      const icsUrl = extractIcsLink(html);
      if (!icsUrl) throw new Error('no ICS link on page');
      const ev = parseIcs(await getText(icsUrl));
      if (!ev?.title || !ev.start) throw new Error('ICS missing title or start');
      const text = `${ev.description} ${htmlToText(html)}`;
      await upsertEvent(toEventRow({
        ...ev,
        ...classify(ev.title, text),
        source: 'cs_dept',
        source_url: link,
        description: ev.description || null
      }));
      saved++;
    } catch (err) {
      console.warn(`cs ingest skipped ${link}: ${err.message}`);
    }
  }
  console.log(`cs ingest: upserted ${saved} of ${links.length} events`);
}
