// One-off-safe clean-up of stored keyword-classified events, run on every boot (idempotent and cheap):
// deletes non-career BYU calendar events (FHE, craft nights, dances...) and re-runs the current classifier on
// the rest, so a classifier fix reaches events that were stored before it.
import { pool } from './db.js';
import { classify, isNonCareerEvent } from './classify.js';
import { sortNames } from './aliases.js';

async function retag(client, e, { keepCompanies }) {
  const { type, companies, fields } = classify(e.title, e.description ?? '');
  const res = await client.query(
    keepCompanies
      ? `update events set type = $2, fields = $3, updated_at = now() where id = $1 and (type <> $2 or fields <> $3::text[])`
      : `update events set type = $2, fields = $3, companies = $4, updated_at = now()
         where id = $1 and (type <> $2 or fields <> $3::text[] or companies <> $4::text[])`,
    keepCompanies ? [e.id, type, fields] : [e.id, type, fields, sortNames(companies)]
  );
  return res.rowCount;
}

export async function cleanByuEvents(client = pool) {
  let removed = 0;
  let retagged = 0;

  const byu = await client.query("select id, title, description from events where source = 'byu_calendar'");
  for (const e of byu.rows) {
    if (isNonCareerEvent(e.title, e.description ?? '')) {
      await client.query('delete from events where id = $1', [e.id]);
      removed++;
    } else {
      retagged += await retag(client, e, { keepCompanies: false });
    }
  }

  // CS department events with no sponsors listed were tagged from whole-page text; retag them from title and
  // description. Events that list companies (the hackathon) carry curated data and are left alone.
  const cs = await client.query("select id, title, description from events where source = 'cs_dept' and cardinality(companies) = 0");
  for (const e of cs.rows) retagged += await retag(client, e, { keepCompanies: true });

  if (removed || retagged) console.log(`event clean-up: removed ${removed} non-career, retagged ${retagged}`);
  return { removed, retagged };
}
