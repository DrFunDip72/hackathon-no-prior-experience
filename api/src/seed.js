import { pool, upsertEvent } from './db.js';
import { toEventRow, dedupeHash } from './event.js';
import { seedEvents, retiredEvents } from './seed-events.js';

const retired = retiredEvents.map((e) => dedupeHash(e.title, e.start, e.location));
await pool.query('delete from events where dedupe_hash = any($1)', [retired]);
for (const event of seedEvents) await upsertEvent(toEventRow(event));
console.log(`seeded ${seedEvents.length} events`);
await pool.end();
