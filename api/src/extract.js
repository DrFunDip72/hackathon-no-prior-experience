import { toEventRow } from './event.js';

const MODEL = process.env.EXTRACT_MODEL ?? 'claude-haiku-4-5-20251001';

const PROMPT = `Extract one campus event from the input below. Reply with JSON only, no prose, in this shape:
{"title":"","start":"ISO8601 with -06:00 or -07:00 offset (America/Denver)","end":"","location":"","type":"","companies":[],"fields":[]}
Rules:
- type is one of: career_fair, hackathon, info_session, lecture, tabling, club_event, case_competition, networking, other.
- companies: only companies explicitly named as attending, sponsoring, presenting, or recruiting. Do not guess. An empty array is fine.
- fields: career fields the event covers, lowercase (e.g. "software engineering", "product", "data").
- Use empty strings for unknown values.`;

export function parseExtraction(text) {
  const stripped = String(text).replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(stripped.slice(stripped.indexOf('{'), stripped.lastIndexOf('}') + 1));
  } catch {
    return null;
  }
}

// Calls Claude and returns a parsed object, or null if the model output is not valid JSON.
export async function extractEvent({ text, imageBase64, mediaType }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error('LLM extraction is not configured yet (ANTHROPIC_API_KEY is not set)'), { status: 503 });
  const content = [];
  if (imageBase64) content.push({ type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: imageBase64 } });
  content.push({ type: 'text', text: `${PROMPT}\n\nInput:\n${text ?? '(see image)'}` });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages: [{ role: 'user', content }] })
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return parseExtraction(data.content?.map((b) => b.text ?? '').join('') ?? '');
}

// Extraction -> upsert-ready row. A parse failure keeps the raw text with empty companies/fields.
export function buildSubmissionRow(extracted, rawText, source = 'user_submission') {
  const base = extracted ?? {};
  return toEventRow({
    ...base,
    title: base.title || String(rawText ?? '').split('\n')[0].slice(0, 120),
    companies: extracted ? base.companies : [],
    fields: extracted ? base.fields : [],
    description: rawText ?? null,
    source
  });
}

// ---- Bulk extraction: a pasted dump (e.g. copied from a Slack channel) may mention many events. ----

const todayDenver = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' }).format(now);

export const bulkPrompt = (now = new Date()) => `You are reading pasted chat messages from a university student channel. Find every campus career-related EVENT mentioned and return them as a JSON array, JSON only, no prose.
Today is ${todayDenver(now)} (America/Denver). Dates without a year mean the next occurrence on or after today.
Each item:
{"title":"","start":"ISO8601 with -06:00 or -07:00 offset (America/Denver)","end":"","location":"","type":"","companies":[],"fields":[],"url":"","description":""}
Rules:
- Events only: career fairs, info sessions, networking events, hackathons, case competitions, tabling, speaker events. IGNORE job or internship postings, questions, and chit-chat.
- type is one of: career_fair, hackathon, info_session, lecture, tabling, club_event, case_competition, networking, other.
- companies: only companies explicitly named as attending, sponsoring, presenting, or recruiting. Do not guess. An empty array is fine.
- fields: career fields the event covers, lowercase (e.g. "software engineering", "product", "data").
- url: a registration or details link from the message if there is one, else "".
- description: one or two sentences describing the event. Never include the names of people who posted or replied.
- Skip an event if you cannot tell its date. List each event once even if it is mentioned several times.
- If there are no events, return [].`;

// Accepts a JSON array, {"events":[...]}, or a single object, with or without code fences. null = unreadable.
export function parseExtractionList(text) {
  const stripped = String(text).replace(/```(?:json)?/gi, '').trim();
  const open = stripped.search(/[[{]/);
  if (open < 0) return null;
  const close = Math.max(stripped.lastIndexOf(']'), stripped.lastIndexOf('}'));
  try {
    const parsed = JSON.parse(stripped.slice(open, close + 1));
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.events) ? parsed.events : [parsed];
    return list.filter((e) => e && typeof e === 'object');
  } catch {
    return null;
  }
}

async function askClaude(content) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error('LLM extraction is not configured yet (ANTHROPIC_API_KEY is not set)'), { status: 503 });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 4096, messages: [{ role: 'user', content }] })
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.map((b) => b.text ?? '').join('') ?? '';
}

export async function extractEvents({ text, now = new Date() }) {
  return parseExtractionList(await askClaude([{ type: 'text', text: `${bulkPrompt(now)}\n\nMessages:\n${text}` }]));
}

// Extracted items -> upsert-ready rows. Past events and unreadable items are reported, not stored.
// The model's summary is stored instead of the raw text, so poster names and chatter never reach the database.
export function buildBulkRows(list, { source = 'user_submission', now = new Date() } = {}) {
  const rows = [];
  const skipped = [];
  for (const e of list) {
    try {
      const row = toEventRow({ ...e, source, registration_url: e.url || null, description: e.description || null, verified: false });
      if (new Date(row.end_at ?? row.start_at) < new Date(now.getTime() - 86_400_000)) skipped.push(`${row.title}: already past`);
      else rows.push(row);
    } catch (err) {
      skipped.push(`${e.title ?? '(untitled)'}: ${err.message}`);
    }
  }
  return { rows, skipped };
}
