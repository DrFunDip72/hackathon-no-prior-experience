// Pulls the BYU Calendar API into the events table (server.js runs it daily when INGEST_BYU is set).
// The API caps each response at ~100 events, so we request one week at a time; upserts dedupe by hash.
// Category ids come from https://calendar.byu.edu/api/Categories (Student Life = 49, Education = 4, Conferences = 1006).
import { upsertEvent } from './db.js';
import { toEventRow } from './event.js';
import { classify, isNonCareerEvent } from './classify.js';

const CATEGORIES = process.env.BYU_CATEGORIES ?? '49+4+1006';
const DAY_MS = 86_400_000;
const CHUNK_DAYS = 7;
const ymd = (d) => d.toISOString().slice(0, 10);
const stripHtml = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function fetchWindow(min, max) {
  const url = `https://calendar.byu.edu/api/Events.json?categories=${CATEGORIES}` +
    `&event%5Bmin%5D%5Bdate%5D=${ymd(min)}&event%5Bmax%5D%5Bdate%5D=${ymd(max)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`BYU Calendar API ${res.status} (CloudFront 403s happen from some datacenter IPs; try running locally)`);
  return res.json();
}

export async function ingestByu(days = 30) {
  const today = new Date();
  let seen = 0;
  let saved = 0;
  let dropped = 0;
  for (let offset = 0; offset < days; offset += CHUNK_DAYS) {
    const min = new Date(today.getTime() + offset * DAY_MS);
    const max = new Date(today.getTime() + Math.min(offset + CHUNK_DAYS, days) * DAY_MS);
    const items = await fetchWindow(min, max);
    if (items.length >= 100) console.warn(`window ${ymd(min)}..${ymd(max)} returned ${items.length}; may be truncated`);
    seen += items.length;
    for (const e of items) {
      const description = stripHtml(e.Description);
      if (isNonCareerEvent(e.Title, `${description} ${e.TagsNames ?? ''}`)) {
        dropped++;
        continue;
      }
      try {
        await upsertEvent(toEventRow({
          title: e.Title,
          start: e.StartDateTime,
          end: e.EndDateTime,
          location: e.LocationName || e.field_event_location,
          ...classify(e.Title, `${description} ${e.TagsNames ?? ''}`),
          source: 'byu_calendar',
          source_url: e.FullUrl,
          description
        }), undefined, { replace: ['fields', 'companies', 'programs'] }); // keyword-classified: re-ingest corrects old tags
        saved++;
      } catch (err) {
        console.warn(`skipped "${e.Title}": ${err.message}`);
      }
    }
  }
  console.log(`byu ingest: upserted ${saved} of ${seen} events (${dropped} non-career dropped)`);
}
