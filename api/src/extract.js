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
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
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
