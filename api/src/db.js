import pg from 'pg';

const url = process.env.DATABASE_URL;
const local = !url || /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);

export const pool = new pg.Pool({
  connectionString: url,
  ssl: local ? false : { rejectUnauthorized: false }
});

const COLS = ['id', 'title', 'start_at', 'end_at', 'location', 'type', 'companies', 'fields', 'source', 'source_url', 'description', 'dedupe_hash'];

export async function upsertEvent(row, client = pool) {
  const placeholders = COLS.map((_, i) => `$${i + 1}`).join(', ');
  // companies and fields are unioned, not overwritten, so curated sponsors survive a re-ingest from a source that doesn't list them.
  const union = (c) => `${c} = array(select distinct unnest(events.${c} || excluded.${c}))`;
  const updates = COLS.filter((c) => !['id', 'dedupe_hash'].includes(c))
    .map((c) => (c === 'companies' || c === 'fields' ? union(c) : `${c} = excluded.${c}`)).join(', ');
  const { rows } = await client.query(
    `insert into events (${COLS.join(', ')}) values (${placeholders})
     on conflict (dedupe_hash) do update set ${updates}, updated_at = now()
     returning *`,
    COLS.map((c) => row[c])
  );
  return rows[0];
}

export async function queryEvents({ from, to, company } = {}) {
  const params = [from, to];
  let sql = 'select * from events where start_at >= $1 and start_at < $2';
  if (company) {
    params.push(company.toLowerCase());
    sql += ` and exists (select 1 from unnest(companies) c where lower(c) = $${params.length})`;
  }
  const { rows } = await pool.query(`${sql} order by start_at`, params);
  return rows;
}
