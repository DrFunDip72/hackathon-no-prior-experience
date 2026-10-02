// Reads the standard weekly events message the AIS officers post, without any AI:
//
//   Anglepoint Info Session
//   What: Learn about the company and what opportunities are available for IS students
//   When: Tuesday 9/15 6-7pm
//   Where: TNRB 2051
//   Food: Jdawgs :hotdog:
//
// Each event is a title line followed by What / When / Where / Food lines. Headings, intro text and items that
// have no When line (e.g. "See #channel for details") are not events; the ones that look like events are reported
// back as skipped so a person can add them by hand.
import { parseTimeRange } from './ingest-sheet.js';
import { classify } from './classify.js';

const FIELD_RE = /^(what|when|where|food|who|cost)\s*:\s*(.*)$/i;
const DETAIL_RE = /^(register|rsvp|see\s|https?:\/\/)/i;
const SHORTCODE_RE = /:[a-z0-9_+-]+:/gi;
const URL_RE = /https?:\/\/[^\s)>\]]+/gi;
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const clean = (s) => String(s ?? '').replace(SHORTCODE_RE, ' ').replace(/\s+/g, ' ').trim();

// "Tuesday 9/15 6-7pm" -> { date: "2026-09-15", range: { start: "18:00", end: "19:00" } }, or null.
// The message has no year, so pick the year in which the weekday matches and the date is nearest to `now`.
export function parseWhen(text, now = new Date()) {
  const m = /(?:(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*,?\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(.*)$/i.exec(clean(text));
  if (!m) return null;
  const [, weekday, month, day, explicitYear, rest] = m;
  const range = parseTimeRange(rest);
  if (!range) return null;
  const years = explicitYear
    ? [explicitYear.length === 2 ? 2000 + Number(explicitYear) : Number(explicitYear)]
    : [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const candidates = years
    .map((y) => ({ y, at: Date.UTC(y, Number(month) - 1, Number(day)) }))
    .filter(({ at }) => new Date(at).getUTCMonth() === Number(month) - 1) // rejects 2/30 and the like
    .filter(({ at }) => !weekday || WEEKDAYS[new Date(at).getUTCDay()] === weekday.toLowerCase());
  if (!candidates.length) return null;
  const best = candidates.sort((a, b) => Math.abs(a.at - now.getTime()) - Math.abs(b.at - now.getTime()))[0];
  const date = `${best.y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { date, range };
}

function buildEvent(rec, now) {
  const when = parseWhen(rec.fields.when, now);
  if (!when) return { skipped: `${rec.title}: could not read the date/time "${rec.fields.when}"` };

  const what = clean(rec.fields.what);
  const food = clean(rec.fields.food);
  const isFair = /career fair|expo/i.test(rec.title);
  const isSession = !isFair && (/info(rmation)? session/i.test(rec.title) || /learn about the company/i.test(what));
  const type = isFair ? 'career_fair' : isSession ? 'info_session' : /a-?team/i.test(rec.title) ? 'club_event' : classify(rec.title, what).type;

  // Sponsor sessions are titled by company ("Credera", "Anglepoint Info Session").
  const company = isSession ? rec.title.replace(/info(rmation)? session/i, '').replace(/\s+/g, ' ').trim() : '';
  const title = isSession && !/info(rmation)? session/i.test(rec.title) ? `${rec.title} Info Session` : rec.title;
  // Slack links are private to the workspace, so only other links are kept.
  const url = (rec.extra.join(' ').match(URL_RE) ?? []).find((u) => !/slack\.com/i.test(u)) ?? '';

  return {
    event: {
      title,
      start: `${when.date} ${when.range.start}:00`,
      end: when.range.end ? `${when.date} ${when.range.end}:00` : '',
      location: clean(rec.fields.where),
      type,
      companies: company ? [company] : [],
      // These messages are written for IS students, so every event is tagged for the major.
      fields: [...new Set(['information systems', ...classify(rec.title, what).fields])],
      url,
      description: [what, food && `Food: ${food}.`].filter(Boolean).join(' ')
    }
  };
}

// Returns { events, skipped }. `events` is empty when the text isn't in this format, so callers can fall back.
export function parseWeeklyDump(text, { now = new Date() } = {}) {
  const records = [];
  let cur = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const field = FIELD_RE.exec(line);
    if (field && cur) {
      cur.fields[field[1].toLowerCase()] = field[2].trim();
    } else if (DETAIL_RE.test(line) && cur) {
      cur.extra.push(line);
    } else if (!field) {
      cur = { title: clean(line), fields: {}, extra: [] };
      records.push(cur);
    }
  }

  const events = [];
  const skipped = [];
  for (const rec of records) {
    if (!rec.title) continue;
    if (rec.fields.when) {
      const { event, skipped: why } = buildEvent(rec, now);
      if (event) events.push(event);
      else skipped.push(why);
    } else if (Object.keys(rec.fields).length || rec.extra.length) {
      // Looks like an event but has no date (usually "See #channel for details"): report it instead of guessing.
      skipped.push(`${rec.title}: no date in the message`);
    }
    // Headings and intro text (no fields, no details) are ignored silently.
  }
  return { events, skipped };
}
