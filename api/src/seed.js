import { pool, upsertEvent, upsertCompany } from './db.js';
import { toEventRow, dedupeHash } from './event.js';
import { aliasesFor } from './aliases.js';
import { seedEvents, retiredEvents } from './seed-events.js';
import { seedCompanies } from './seed-companies.js';

const retired = retiredEvents.map((e) => dedupeHash(e.title, e.start, e.location));
await pool.query('delete from events where dedupe_hash = any($1)', [retired]);
for (const event of seedEvents) await upsertEvent(toEventRow(event));
for (const c of seedCompanies) await upsertCompany({ ...c, aliases: aliasesFor(c.name) });
console.log(`seeded ${seedEvents.length} events and ${seedCompanies.length} companies`);
await pool.end();
