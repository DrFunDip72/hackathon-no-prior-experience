create table if not exists events (
  id text primary key,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  type text not null default 'other',
  companies text[] not null default '{}',
  fields text[] not null default '{}',
  source text not null,
  source_url text,
  description text,
  dedupe_hash text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists events_start_at_idx on events (start_at);
create index if not exists events_companies_idx on events using gin (companies);
create index if not exists events_fields_idx on events using gin (fields);
