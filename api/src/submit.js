import { extractEvent, buildSubmissionRow, extractEvents, buildBulkRows } from './extract.js';
import { SOURCES } from './event.js';

const fail = (status, message) => Object.assign(new Error(message), { status });

// Dependencies are passed in so the submission path can be tested without a database or paid API.
export async function submitEvent(body, { save, extract = extractEvent }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'send a JSON object');
  const { text, image_base64: imageBase64, media_type: mediaType, dry_run: dryRun = false } = body;
  if ((text !== undefined && typeof text !== 'string') ||
      (imageBase64 !== undefined && typeof imageBase64 !== 'string') || typeof dryRun !== 'boolean') {
    throw fail(400, 'text and image_base64 must be strings; dry_run must be a boolean');
  }
  if (!text?.trim() && !imageBase64?.trim()) throw fail(400, 'send { text } or { image_base64 }');
  if (imageBase64 && mediaType !== undefined && !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType)) {
    throw fail(400, 'unsupported media_type');
  }
  const extracted = await extract({ text, imageBase64, mediaType });
  let row;
  try {
    row = buildSubmissionRow(extracted);
  } catch {
    throw fail(422, 'could not find a valid event with a title and start time');
  }
  if (dryRun) return { event: row, extracted: true, dry_run: true };
  return { event: await save(row), extracted: true };
}

export async function submitBulk(body, { save, extract = extractEvents, now = new Date() }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw fail(400, 'send a JSON object');
  const { text, source, dry_run: dryRun = false } = body;
  if (typeof text !== 'string' || text.trim().length < 20 || typeof dryRun !== 'boolean') {
    throw fail(400, 'send { text } with the pasted messages; dry_run must be a boolean');
  }
  if (text.length > 200_000) throw fail(413, 'paste is too long; split it into chunks of about 200,000 characters');
  const list = await extract({ text, now });
  if (!list) throw fail(422, 'could not read events from the model output; try again');
  const { rows, skipped } = buildBulkRows(list, { source: SOURCES.includes(source) ? source : 'user_submission', now });
  if (dryRun) return { saved: 0, skipped, events: rows, dry_run: true };
  const events = [];
  for (const row of rows) events.push(await save(row));
  return { saved: events.length, skipped, events };
}
