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

-- Added after launch; all idempotent.
alter table events add column if not exists programs text[] not null default '{}';
alter table events add column if not exists verified boolean not null default true;
alter table events add column if not exists people jsonb not null default '[]';
alter table events add column if not exists registration_url text;
alter table events add column if not exists rsvp_required boolean;
alter table events add column if not exists registration_deadline timestamptz;

create table if not exists companies (
  name text primary key,
  aliases text[] not null default '{}',
  kind text not null default 'employer',
  industry text,
  website text,
  careers_url text,
  logo_url text,
  brand_color text
);

-- One-time-safe cleanup of rows ingested before graduate programs and "Company - subtitle" names were handled:
-- drops programs from companies (the ingest re-adds them under `programs`), strips subtitles, sorts and dedupes.
update events
set companies = array(
  select distinct regexp_replace(c, ' - .*$', '') from unnest(companies) c
  where c !~* '(university|grad school|graduate school|mscf)' order by 1)
where exists (
  select 1 from unnest(companies) c
  where c ~* '(university|grad school|graduate school|mscf)' or c like '% - %');
