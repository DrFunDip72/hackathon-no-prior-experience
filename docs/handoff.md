# Handoff: events backend and front-end adapter

Paste this into a new chat to continue.

## Goal
Doorway (Vite/React front end in `src/`) recommends BYU campus events to CS/IS seniors based on target companies and fields. My scope: event ingestion, storage, and the recommendations API (`api/`). Justin and Stetson own the profile/front end. One-day hackathon: favor working end to end. Timezone is America/Denver everywhere. Keep changes minimal.

## Infrastructure (Railway)
- Project: **No-Prior Experience Hackathon** (id `db631160-42e6-4d93-aa1d-364c4848bf06`), env `production`. The folder is linked via the Railway CLI (logged in as will@hollandfam.com). The ID `6317b083-...` the user first pasted was wrong.
- Services: `hackathon-no-prior-experience` (the front end, auto-deploys from GitHub `DrFunDip72/hackathon-no-prior-experience` on push to `main`), `Postgres`, and `doorway-api` (new).
- **API URL:** https://doorway-api-production-db29.up.railway.app
- Deploy the API with the **archive root set to the api folder**, run from the repo root:
  `railway up ./api --path-as-root --service doorway-api --ci`
  (without `--path-as-root` it uploads the whole repo and builds the front end).
- `doorway-api` variables: `DATABASE_URL` (reference to Postgres), `SEED_ON_START=1`, `INGEST_BYU=1`. `ANTHROPIC_API_KEY` is **not set yet** (the user is getting one at console.anthropic.com and will set it themselves; never ask them to paste it in chat).
- The DB is only reachable from inside Railway (internal URL); `railway ssh` fails (no registered key). So seeding and ingest run on API boot, not locally.

## API (`api/`, plain Node ESM, only dependency `pg`)
- `src/server.js`: `GET /health`, `GET /events?from=&to=&company=`, `POST /recommendations` (profile + optional `from`/`to`/`relevant_only`), `POST /submit` (`{text}` or `{image_base64, media_type}`). CORS is open. When `INGEST_BYU` is set it ingests on boot and then every 24h.
- `src/scoring.js`: +10 per matched company, +3 per matched field/role (word-aware, so "software" matches "software engineering"), +1 for career_fair/info_session/hackathon, recency boost `3*(1-days/window)`. Drops score <1. `relevant_only` also drops events with no match that aren't a boosted type. Always returns a `reason` string. Aliases are in `src/aliases.js`.
- `src/event.js` (dedupe hash, `denverIso` DST handling, `toEventRow`), `src/db.js` (upsert on `dedupe_hash`), `src/migrate.js` plus `db/schema.sql`, `src/seed.js` plus `src/seed-events.js` (17 events), `src/classify.js` (keyword type/company/field tagging, `KNOWN_COMPANIES` list), `src/ingest-byu.js` (weekly chunks because the API caps responses at ~100 events), `src/extract.js` (Claude call, default model `claude-haiku-4-5-20251001`).
- Tests: `cd api && npm test` (9 passing).

## State
- Verified live: the demo path works. A Redo/Neighbor/Qualtrics profile gets the CS Hackathon on top (score 26.9) with reason "Redo and Neighbor reps attending, matches 2 of your 3 target companies...". The BYU Calendar ingest works from Railway (no CloudFront 403), ~50 live events in 30 days; most are type `other` with no companies.
- **Deployed:** the API as of the `classify`/weekly-ingest change. **Not yet redeployed:** the word-aware field matching and `relevant_only` change (code and tests done locally). Redeploy it.
- **Uncommitted and unpushed on `main`:** all of `api/`, plus front-end changes: new `src/utils/backend.ts` (calls `/recommendations`, maps to `CampusEvent`), `src/vite-env.d.ts`, `.env.example`, `docs/handoff.md`, and edits to `src/types/event.ts`, `src/utils/dates.ts`, `src/utils/matching.ts`, `src/hooks/useEventFeed.ts`, `EventCard.tsx`, `EventDetail.tsx`. `npm run build` passes; `tsc` only shows pre-existing unused-`React` import warnings.
- The adapter is gated on `VITE_API_URL`: unset means the app uses the old sample data. The Railway front-end service needs `VITE_API_URL` set to the API URL as a build variable. The Profile page's "top events" still uses the static sample events.

## Update (later the same day)
- Merged to `main` (commit `8c296eb`) and the API redeployed with word-aware field matching. Added the BYU Career Services Google Sheet source (`api/src/ingest-sheet.js`, env `INGEST_SHEET_URLS`, 17 October events, refreshed every 6 h). `docs/api.md` is now the full API reference; keep it updated. Responses are UTC; display in America/Denver.
- Open question: is the sheet's "Homecoming Hackathon" the same as the seeded "CS Hackathon"? The seed events are placeholders and should be replaced with real ones.
- Org browsing policy blocks docs.google.com, cs.byu.edu, calendar.byu.edu docs and the Vercel preview in the browser pane; the user is working on getting them allowed.

## Remaining work
1. **Merge to main** (the user asked for it; not done yet). Commit the changes, push `main`. This redeploys the front end. Set `VITE_API_URL` on the front-end service first so it uses the real API. Confirm with the user before pushing, since the repo is shared with Justin and Stetson. Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
2. Redeploy the API with the latest scoring change, then re-run the demo check against the live URL.
3. **CS department scraper** (`cs.byu.edu/department/event-calendar`, no API, RSS empty). The org policy blocks the browser pane from cs.byu.edu and calendar.byu.edu; do not work around it with other fetch tools. Plan: fetch the page server-side, strip HTML to text, send it to Claude to extract an events array, upsert with `source=cs_dept`. It needs `ANTHROPIC_API_KEY`.
4. Test `/submit` once the key exists (use only fake or public event text).
5. Replace placeholder seed events in `api/src/seed-events.js` with real ones. Only the CS Hackathon (Fri Oct 2, 2026, TMCB, Redo/Neighbor/Waystar) is confirmed.
6. Optional: unset `SEED_ON_START` (it reseeds on every restart), n8n workflow exports, and a note to the profile team about the endpoint contract.

## Org policy reminders
Per the organization's instructions, do not enter company documents, client or vendor names, or real work emails into AI tools; use only fake or public data when testing. Do not draft legal, claim or liability material.
