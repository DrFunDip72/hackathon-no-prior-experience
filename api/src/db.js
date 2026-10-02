import pg from 'pg';
import { isNearDuplicate, START_WINDOW_MS } from './similar.js';

const url = process.env.DATABASE_URL;
const local = !url || /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);

export const pool = new pg.Pool({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false }
});

const COLS = [
  'id', 'title', 'start_at', 'end_at', 'location', 'type', 'companies', 'programs', 'fields', 'source', 'source_url',
  'description', 'verified', 'people', 'registration_url', 'rsvp_required', 'registration_deadline', 'sources', 'dedupe_hash'
];

// How a re-ingest merges into an existing row. Lists are unioned (never lose curated data), optional facts only
// fill gaps, and an event stays verified once any trusted source has listed it.
const unionList = (c) => `${c} = array(select distinct u from unnest(events.${c} || excluded.${c}) u order by u)`;
const MERGE = {
  // Every source that has listed the event, so the front end can show where it came from.
  sources: unionList,
  // A verified listing's title wins; an unverified one (pasted text, an LLM read) never overwrites it.
  title: (c) => `${c} = case when events.verified or not excluded.verified then events.${c} else excluded.${c} end`,
  companies: (c) => `${c} = array(select distinct u from unnest(events.${c} || excluded.${c}) u order by u)`,
  programs: (c) => `${c} = array(select distinct u from unnest(events.${c} || excluded.${c}) u order by u)`,
  fields: (c) => `${c} = array(select distinct u from unnest(events.${c} || excluded.${c}) u order by u)`,
  verified: (c) => `${c} = events.${c} or excluded.${c}`,
  source: (c) => `${c} = case when events.verified and not excluded.verified then events.${c} else excluded.${c} end`,
  source_url: (c) => `${c} = coalesce(excluded.${c}, events.${c})`,
  description: (c) => `${c} = coalesce(excluded.${c}, events.${c})`,
  people: (c) => `${c} = case when jsonb_array_length(excluded.${c}) > 0 then excluded.${c} else events.${c} end`,
  registration_url: (c) => `${c} = coalesce(excluded.${c}, events.${c})`,
  rsvp_required: (c) => `${c} = coalesce(excluded.${c}, events.${c})`,
  registration_deadline: (c) => `${c} = coalesce(excluded.${c}, events.${c})`
};

// Lists a source's own keyword classification can be wrong, and a union would keep a bad tag forever. A source that
// classifies by keyword passes `replace` (e.g. ['fields']); those lists are then overwritten, but only when the existing
// row came from the same source, so curated data from other sources still merges in.
const LIST_COLS = ['companies', 'programs', 'fields'];
const mergeClause = (c, replace) => {
  if (!LIST_COLS.includes(c) || !replace.includes(c)) return MERGE[c] ? MERGE[c](c) : `${c} = excluded.${c}`;
  return `${c} = case when events.source = excluded.source then excluded.${c} else array(select distinct u from unnest(events.${c} || excluded.${c}) u order by u) end`;
};

// If a near-duplicate already exists (same place, start within 30 minutes, very similar title), fold this row into it:
// reuse its id and hash so the upsert below merges instead of inserting a second copy.
async function adoptNearDuplicate(row, client) {
  const { rows } = await client.query(
    `select id, title, start_at, location, dedupe_hash from events
     where dedupe_hash <> $1 and start_at between $2::timestamptz - $3 * interval '1 millisecond' and $2::timestamptz + $3 * interval '1 millisecond'`,
    [row.dedupe_hash, row.start_at, START_WINDOW_MS]
  );
  const twin = rows.find((c) => isNearDuplicate(c, row));
  return twin ? { ...row, id: twin.id, dedupe_hash: twin.dedupe_hash } : row;
}

export async function upsertEvent(input, client = pool, { replace = [] } = {}) {
  const row = { ...(await adoptNearDuplicate(input, client)) };
  row.sources = [...new Set([...(row.sources ?? []), row.source])];
  const placeholders = COLS.map((c, i) => (c === 'people' ? `$${i + 1}::jsonb` : `$${i + 1}`)).join(', ');
  const updates = COLS.filter((c) => !['id', 'dedupe_hash'].includes(c))
    .map((c) => mergeClause(c, replace)).join(', ');
  const { rows } = await client.query(
    `insert into events (${COLS.join(', ')}) values (${placeholders})
     on conflict (dedupe_hash) do update set ${updates}, updated_at = now()
     returning *`,
    COLS.map((c) => (c === 'people' ? JSON.stringify(row.people ?? []) : row[c] ?? (c === 'programs' ? [] : null)))
  );
  return rows[0];
}

// An event is "in window" while it is still happening: it ends after `from` and starts before `to`.
// Events with no end time count as one hour long.
const IN_WINDOW = 'coalesce(end_at, start_at + interval \'1 hour\') > $1 and start_at < $2';

export async function queryEvents({ from, to, company } = {}) {
  const params = [from, to];
  let sql = `select * from events where ${IN_WINDOW}`;
  if (company) {
    params.push(company.toLowerCase());
    sql += ` and exists (select 1 from unnest(companies) c where lower(c) = $${params.length})`;
  }
  const { rows } = await pool.query(`${sql} order by start_at`, params);
  return rows;
}

export async function queryEventsByIds(ids) {
  const { rows } = await pool.query('select * from events where id = any($1) order by start_at', [ids]);
  return rows;
}

// Curated company rows plus every company/program seen on an upcoming event, with how many events each has.
export async function queryCompanies() {
  const [curated, counts] = await Promise.all([
    pool.query('select * from companies'),
    pool.query(`
      select name, kind, count(*)::int as upcoming_event_count from (
        select unnest(companies) as name, 'employer' as kind from events where coalesce(end_at, start_at + interval '1 hour') > now()
        union all
        select unnest(programs), 'grad_program' from events where coalesce(end_at, start_at + interval '1 hour') > now()
      ) t group by name, kind`)
  ]);
  const byName = new Map(curated.rows.map((r) => [r.name.toLowerCase(), r]));
  const out = new Map();
  for (const c of counts.rows) {
    const row = byName.get(c.name.toLowerCase());
    out.set(c.name.toLowerCase(), { ...blankCompany(c.name, c.kind), ...row, kind: row?.kind ?? c.kind, upcoming_event_count: c.upcoming_event_count });
  }
  for (const row of curated.rows) {
    if (!out.has(row.name.toLowerCase())) out.set(row.name.toLowerCase(), { ...blankCompany(row.name, row.kind), ...row, upcoming_event_count: 0 });
  }
  return [...out.values()].sort((a, b) => b.upcoming_event_count - a.upcoming_event_count || a.name.localeCompare(b.name));
}

const blankCompany = (name, kind) => ({
  name, aliases: [], kind, industry: null, website: null, careers_url: null, logo_url: null, brand_color: null
});

export async function upsertCompany(c) {
  await pool.query(
    `insert into companies (name, aliases, kind, industry, website, careers_url, logo_url, brand_color)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (name) do update set aliases = excluded.aliases, kind = excluded.kind,
       industry = coalesce(excluded.industry, companies.industry), website = coalesce(excluded.website, companies.website),
       careers_url = coalesce(excluded.careers_url, companies.careers_url), logo_url = coalesce(excluded.logo_url, companies.logo_url),
       brand_color = coalesce(excluded.brand_color, companies.brand_color)`,
    [c.name, c.aliases ?? [], c.kind ?? 'employer', c.industry ?? null, c.website ?? null, c.careers_url ?? null, c.logo_url ?? null, c.brand_color ?? null]
  );
}

// Cleans up duplicates stored before near-duplicate merging existed (runs on boot; cheap and idempotent).
// Keeps one row per cluster (a verified one first, then the oldest), unions the rest into it, deletes the extras.
export async function mergeNearDuplicates() {
  const { rows } = await pool.query('select * from events order by verified desc, created_at, id');
  const gone = new Set();
  let merged = 0;
  for (const keeper of rows) {
    if (gone.has(keeper.id)) continue;
    for (const dup of rows) {
      if (dup.id === keeper.id || gone.has(dup.id) || !isNearDuplicate(keeper, dup)) continue;
      await pool.query(
        `update events set
           companies = array(select distinct u from unnest(companies || $2::text[]) u order by u),
           programs = array(select distinct u from unnest(programs || $3::text[]) u order by u),
           fields = array(select distinct u from unnest(fields || $4::text[]) u order by u),
           sources = array(select distinct u from unnest(sources || $5::text[]) u order by u),
           registration_url = coalesce(registration_url, $6),
           source_url = coalesce(source_url, $7),
           updated_at = now()
         where id = $1`,
        [keeper.id, dup.companies, dup.programs, dup.fields, [...new Set([...dup.sources, dup.source])], dup.registration_url, dup.source_url]
      );
      await pool.query('delete from events where id = $1', [dup.id]);
      gone.add(dup.id);
      merged++;
    }
  }
  if (merged) console.log(`merged ${merged} near-duplicate event(s)`);
  return merged;
}
