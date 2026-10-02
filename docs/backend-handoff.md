# Backend handoff: events API

For whoever takes over the events backend. Read this, then [`api.md`](./api.md) (the API reference: endpoints, data shapes, sources; keep it updated). [`api-requests.md`](./api-requests.md) is the front-end team's wishlist with a status table at the top.

## What this is
Doorway recommends BYU recruiting and networking events to CS/IS seniors. The backend (`api/`) collects events from several sources, stores them in Postgres, and ranks them against a student's profile. The front end (`src/`, Vite/React on Vercel) calls only `POST /recommendations` and a few read endpoints. Nothing but the API touches the database.

```
sources (BYU calendar API, career-services Google Sheet, CS dept pages + ICS)
   -> ingest jobs inside the API process (every 6-24 h)
   -> normalize (toEventRow) -> upsert into Railway Postgres (dedupe_hash)
Front end -> POST /recommendations, GET /events, /events/:id, /companies
```

Hackathon context: one-day build, favor working end to end, keep changes minimal and readable, no new frameworks without need. Everything is America/Denver; responses are UTC (`Z`), the front end formats in Denver time.

## Where things live
| What | Where |
| --- | --- |
| API code | `api/` (plain Node ESM, one dependency: `pg`). Entry `api/src/server.js` |
| Scoring and reason strings | `api/src/scoring.js` |
| Event normalization (company cleanup, dedupe hash, DST offsets, people) | `api/src/event.js`, `api/src/aliases.js` |
| Database layer and upsert merge rules | `api/src/db.js`, schema in `api/db/schema.sql` |
| Ingest jobs | `api/src/ingest-byu.js`, `ingest-sheet.js`, `ingest-cs.js` |
| Keyword tagging (type, companies, fields) | `api/src/classify.js` (`KNOWN_COMPANIES` is where new employers go) |
| LLM extraction for `/submit` | `api/src/extract.js` |
| Seed data | `api/src/seed-events.js`, `seed-companies.js`, `seed.js` |
| Tests | `api/test/*.test.js`, run `cd api && npm test` (37 tests) |
| Front-end adapter | `src/utils/backend.ts`, `src/hooks/useEventFeed.ts` |

Note: `api/parse-resume.ts` is the front end's Vercel function (resume parsing with Gemini). It shares the `api/` folder with this backend by accident of history; `.vercelignore` keeps the backend files out of Vercel. Don't move either without updating that file.

## Infrastructure (Railway)
- **Project:** No-Prior Experience Hackathon, id `db631160-42e6-4d93-aa1d-364c4848bf06`, environment `production`.
- **Services:**
  - `doorway-api`: this backend. Public URL **https://doorway-api-production-db29.up.railway.app**.
  - `Postgres`: the database (volume-backed).
  - `hackathon-no-prior-experience`: the front end; auto-deploys from GitHub `main`. (Vercel also deploys the front end; its `VITE_API_URL` points at the API URL above.)
- **`doorway-api` variables** (names only; read values with `railway variables --service doorway-api`):
  - `DATABASE_URL`: a reference to the Postgres service's internal URL.
  - `SEED_ON_START=1`: runs `seed.js` on every boot (idempotent). Safe to leave on.
  - `INGEST_BYU=1`: BYU calendar ingest on boot, then every 24 h.
  - `INGEST_SHEET_BASE`: the published career-services sheet (`https://docs.google.com/spreadsheets/d/e/<id>`); auto-discovers every tab, refreshed every 6 h. `INGEST_SHEET_URLS`: optional explicit CSV links.
  - `INGEST_CS=1`: CS department ingest every 6 h.
  - `SUBMIT_TOKEN`: shared secret required by `/submit` and `/submit/bulk` (LLM cost protection; the endpoints are off without it). The owner uses it on the `/paste` page.
  - **Not set yet:** `ANTHROPIC_API_KEY` (needed by `/submit` and any LLM-based source), optional `EXTRACT_MODEL` (default `claude-haiku-4-5-20251001`).
- **The start command** (`api/package.json`) runs migrations (`schema.sql`, idempotent, includes data cleanup), seeds if `SEED_ON_START`, then starts the server, which kicks off the ingest jobs.
- **The database is only reachable from inside Railway** (internal hostname), so you can't connect from a laptop. To inspect data, use the API (`/events`, `/companies`) or, if you need SQL, enable a TCP proxy on the Postgres service and use the public URL, or run a one-off job inside the service. `railway ssh` needs an SSH key registered to your Railway account.

### Working with a Railway token
You can use a project token instead of a login: set `RAILWAY_TOKEN` in your environment (never commit it), then the CLI works against the project without `railway link`. Commands used so far (from the repo root):

```bash
# deploy the API (archive root MUST be api/, otherwise it uploads the whole repo and builds the front end)
railway up ./api --path-as-root --service doorway-api --ci

railway logs --service doorway-api            # ingest summaries print here
railway variables --service doorway-api       # list; add --set KEY=value to change (changing a variable redeploys)
railway status                                # services and health
```
After a deploy, wait about 45-60 s, then check the logs for `schema applied`, `seeded ...`, `api listening`, and the `byu ingest`, `sheet ingest`, `cs ingest` lines. Test with `curl https://doorway-api-production-db29.up.railway.app/health`.

There is no CI for the API: deploys are manual with the command above. Commit and push to `main` as well, so the repo matches production. Pushing `main` also redeploys the front end (harmless).

## Current state (as of 2026-10-02)
- API live. ~80 events for Sep-Dec 2026, all from real sources: BYU calendar (~50 per 30 days, mostly `other`), career-services sheet (Sep + Oct tabs, ~22 events, company-named info sessions and tabling), CS department (3 events including the Homecoming Hackathon with Redo/Neighbor/Waystar sponsors).
- The demo path works: a profile targeting Redo gets the Homecoming Hackathon (Fri Oct 2, ESC Annex, 8 AM-8 PM) first, with a reason string.
- Done from the front-end wishlist: in-progress events, `verified`, cleaned `companies` plus `programs`, `GET /events/:id`, `GET /events?ids=`, `GET /companies`. See the status table in `api-requests.md`.
- 37 unit tests passing, including single/bulk extraction privacy, validation, no-write previews and provider error handling. Providers and database writes are mocked; no local database integration tests.
- Both submission endpoints support `dry_run: true` for fake/public text or image smoke tests without storing events. Raw text/images and model-supplied people/metadata are discarded; bulk keeps only the extracted event summary and a public event link. Live extraction remains blocked on the owner's Anthropic key. See `docs/slack-setup.md`.

## Not done / next steps (rough priority)
1. **Get an Anthropic API key** (https://console.anthropic.com, add a few dollars of credit), set it on `doorway-api` using `railway variables --set-from-stdin` (silent-input commands in `docs/slack-setup.md`), then test `POST /submit` with `dry_run: true`, a sample email and a flyer image. Use only fake or public event text when testing. The key also unblocks the sources below.
2. **BYU IS Slack source** (jobs/internships channel and `a_team`): career-fair and info-session posts. The workspace blocks custom Slack apps, so the owner copies channel text into the `/paste` page (`https://doorway-api-production-db29.up.railway.app/paste`), which calls `POST /submit/bulk` (built, deployed, tested up to the LLM call; needs `ANTHROPIC_API_KEY`). Only the extracted event is stored, never poster names or raw messages. If a Slack admin ever approves a read-only app, add a receiver that feeds the same extraction (`extractEvents` + `buildBulkRows` in `api/src/extract.js`). Job listings don't fit the events model and would need their own table and endpoint (not built; events only for now).
3. **More sources:** Rollins Center (https://marriott.byu.edu/cet), club pages, college calendars. They use page text plus LLM extraction. `source` values `rollins`, `clubs`, `byusa` are reserved.
4. **People per event:** `people` exists on every event and is empty. Fill it only from names public on a listing or employer-submitted. The shape is in `api.md`.
5. **Remaining wishlist** (`api-requests.md`, P1/P2): `percent` score on recommendations, audience/roles-hiring fields, extra profile fields in scoring (`majors`, `employment_type`, `exclude_event_ids`, `types`, `limit`), `GET /sources`, freshness on `/health`, logistics fields, better `type`/`fields` classification (44% of calendar events are `other`; "Amazing Race FHE" gets tagged `product`).
6. **Company logos and websites:** `companies.logo_url` and `website` are null; supply verified values, then `GET /companies` serves them.
7. **Aliases for company names:** the sheet's names go straight into `companies`. Add variants to `api/src/aliases.js` as students' target lists reveal mismatches.

## Conventions and gotchas
- **Keep `docs/api.md` updated in the same change** whenever an endpoint, field, source, env var, or the front-end wiring changes, and add a changelog line.
- **Upserts merge, not overwrite.** Re-ingesting never loses curated data: `companies`, `programs`, `fields` are unioned; `verified` stays true once any trusted source lists the event; `people` and registration fields only fill gaps. Side effect: a wrong company can't be removed by re-ingesting; fix the row or add a cleanup to `schema.sql` (it runs on every boot).
- **Dedupe key** is `sha256(lower(title) + local date + lower(location))`. The same event from two sources merges only if title, date and location match exactly. If a source spells a title or room differently you get two rows; align them in the ingest or seed.
- **Placeholder data is gone on purpose.** Don't re-add invented events; use `verified: false` if something unconfirmed must exist.
- **Hackathon sponsors** come from the seed (`seed-events.js`), because the sheet lists none. Keep curated facts there.
- **The BYU calendar API caps at ~100 events per response**, so the ingest asks one week at a time. It works from Railway (some datacenter IPs get a CloudFront 403; Railway's doesn't).
- **Windows line endings:** Git on Windows converts to CRLF, which can break multi-line string replacements in scripts. Prefer editing files with your editor tools.
- **Regex in generated code:** when writing regexes through a script, check the result (`\b` has been turned into a backspace character once). `npm test` plus `node --check` catches it.
- **Don't put secrets in the repo or in chat.** Set keys with `railway variables`.
- **Browser policy:** the original author's work environment blocked some sites in tooling (`calendar.byu.edu`, `cs.byu.edu`, `docs.google.com`, the Vercel front end). Nothing in the deployed system depends on that; it only limited what could be inspected during development.
- **Privacy:** only public events and publicly listed people. No scraping of Handshake or LinkedIn. Submitted text may contain personal info; don't store raw messages.

## Quick checklist for your first hour
1. Read `docs/api.md` end to end.
2. `cd api && npm install && npm test`.
3. Set `RAILWAY_TOKEN`, run `railway status` and `railway logs --service doorway-api`.
4. `curl https://doorway-api-production-db29.up.railway.app/health` and a `POST /recommendations` from `api.md`.
5. Get the Anthropic key set, test `/submit`, then pick up the Slack source.
