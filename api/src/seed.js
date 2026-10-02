import { pool, upsertEvent } from './db.js';
import { toEventRow } from './event.js';
import { seedEvents } from './seed-events.js';

for (const event of seedEvents) await upsertEvent(toEventRow(event));
console.log(`seeded ${seedEvents.length} events`);
await pool.end();
