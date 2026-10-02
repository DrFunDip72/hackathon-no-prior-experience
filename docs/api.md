# Events API

The backend for Doorway's events page. It collects campus recruiting and networking events from several sources, stores them in Postgres, and ranks them against a student's profile. **Agents: read this file before touching anything that talks to the API, and update it whenever the API, its sources, or its data change** (see [Maintaining this doc](#maintaining-this-doc)).

- **Base URL (production):** `https://doorway-api-production-db29.up.railway.app`
- **Code:** [`api/`](../api) (plain Node ESM, one dependency: `pg`). Hosted on Railway as the `doorway-api` service, with a Railway Postgres database. The front end never talks to the database or to n8n, only to this API.
- **Auth:** none. CORS is open (`*`). Don't send secrets or anything sensitive in requests.
- **Format:** JSON in, JSON out. Errors are `{ "error": "message" }` with an HTTP status.
- **Time zone:** the data is America/Denver (MDT, UTC-6, until Nov 1 2026; then MST, UTC-7). **Responses return timestamps in UTC** (`2026-10-02T15:00:00.000Z`); the instants are correct. Parse with `new Date(iso)` and **display in Denver time**, e.g. `date.toLocaleString('en-US', { timeZone: 'America/Denver' })` or `date-fns-tz`, so students see the same clock time regardless of their browser's zone. Requests may send `from`/`to` with any offset.

---

## Quick start for the front end

The goal is a feed of events ranked for the signed-in student. One call does it:

```ts
const res = await fetch(`${API_URL}/recommendations`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    user_id: 'u_1',
    target_companies: ['Redo', 'Neighbor', 'Qualtrics'],
    target_roles: ['backend engineer'],
    fields: ['software engineering', 'data'],
    grad_date: '2027-04',
    from: new Date().toISOString(),                                  // optional
    to: new Date(Date.now() + 31 * 86_400_000).toISOString(),        // optional
    relevant_only: true                                              // recommended for a feed
  })
});
const recs = await res.json(); // Recommendation[], already sorted best-first
```

Render `recs` in order. For each item show `event.title`, the date from `event.start_at`, `event.location`, and **always show `reason`**: it is the key UX element ("Redo rep attending, matches 1 of your target companies."). Show `matched_companies` as chips.

Test it from a terminal:

```bash
curl -s https://doorway-api-production-db29.up.railway.app/health
curl -s -X POST https://doorway-api-production-db29.up.railway.app/recommendations \
  -H 'content-type: application/json' \
  -d '{"target_companies":["Redo"],"fields":["software engineering"],"relevant_only":true}'
```

---

## Endpoints

### `GET /health`
`{ "ok": true }` when the API and database are up.

### `GET /events`
Raw events, no scoring. For debugging and for any plain list or calendar view.

| Query param | Meaning | Default |
| --- | --- | --- |
| `from` | ISO date/time, inclusive lower bound on `start_at` | now |
| `to` | ISO date/time, exclusive upper bound | `from` + 21 days |
| `company` | Only events listing this company (case-insensitive, exact name) | none |

Returns `Event[]` ordered by `start_at`. Example: `GET /events?company=redo&to=2026-12-01`.

### `POST /recommendations`
Ranks events for one student. Request body is the **profile contract** plus options:

| Field | Type | Notes |
| --- | --- | --- |
| `target_companies` | `string[]` | **Required.** Matched case-insensitively. Aliases are resolved (e.g. "Redo Tech" matches "Redo"). Roughly 40 expected. |
| `target_roles` | `string[]` | Keywords like `"backend engineer"`. Matched against an event's fields, title and description. |
| `fields` | `string[]` | Career fields like `"software engineering"`, `"data"`, `"product"`. Matched loosely: `"software"` matches `"software engineering"`. |
| `user_id`, `grad_date` | `string` | Accepted, not used for scoring yet. |
| `from`, `to` | ISO strings | Window. Default: now through 21 days out. The recency boost scales with the window length. |
| `relevant_only` | `boolean` | If true, drops events that matched nothing and are not a career fair, info session or hackathon. **Use this for the main feed**, otherwise unrelated campus events (devotionals, concerts) can appear on their recency boost alone. |

Response: `Recommendation[]`, sorted by `score` descending, events scoring below 1 excluded.

### `POST /submit`
Turns pasted text (an email, a flyer's text) or a flyer photo into a stored event using an LLM.

Body: `{ "text": "..." }` or `{ "image_base64": "<base64>", "media_type": "image/jpeg" }` (optionally both).
Response: `{ "event": Event, "extracted": true|false }`. `extracted: false` means the model's output could not be parsed, so the event was stored with empty `companies`/`fields` and the first line of the text as its title.
Errors: `422` if no title and start time could be found; `500` if `ANTHROPIC_API_KEY` is not configured on the server (**currently not set**, so `/submit` will fail until it is).
Submitted events have `source: "user_submission"`. Body size limit is about 12 MB.

---

## Data shapes

```ts
interface Event {
  id: string;                 // "evt_<12 hex>", stable per event
  title: string;
  start_at: string;           // ISO 8601, UTC ("...Z")
  end_at: string | null;
  location: string | null;
  type: EventType;
  companies: string[];        // canonical names, only companies explicitly named as attending/sponsoring/recruiting
  fields: string[];           // lowercase career fields
  source: Source;
  source_url: string | null;  // link back to the original listing
  description: string | null; // raw text, can be long, may contain stray whitespace
  dedupe_hash: string;        // sha256(lower(title) + local date + lower(location))
  created_at: string;
  updated_at: string;
}

type EventType = 'career_fair' | 'hackathon' | 'info_session' | 'lecture' | 'tabling'
               | 'club_event' | 'case_competition' | 'networking' | 'other';

type Source = 'byu_calendar' | 'cs_dept' | 'careerlaunch' | 'rollins' | 'byusa'
            | 'clubs' | 'handshake_manual' | 'email' | 'user_submission';

interface Recommendation {
  event: Event;
  score: number;              // see Scoring; roughly 1 to 30
  matched_companies: string[];
  matched_fields: string[];   // includes matched roles
  reason: string;             // human-readable sentence, always present
}
```

### Scoring
- +10 per matched target company
- +3 per matched field or role keyword
- +1 if type is `career_fair`, `info_session` or `hackathon`
- Recency boost: `3 * (1 - days_until / window_days)`, so sooner is better, up to +3
- Events below 1 are dropped. Result is sorted by score, high to low.

A single company match (10+) always outranks field-only matches, so the student's target employers surface first. The `reason` string is built from the same matches, e.g. `"Redo and Neighbor reps attending, matches 2 of your 3 target companies. Covers software engineering, which matches your interests."`

---

## Using it in this repo's front end

Wiring already exists; extend it rather than duplicating it.

| File | Role |
| --- | --- |
| [`src/utils/backend.ts`](../src/utils/backend.ts) | Calls `POST /recommendations`, maps the response to the UI's `CampusEvent` type, and maps the Doorway `Profile` onto the profile contract. Exports `API_URL` and `fetchRecommendedEvents(profile)`. |
| [`src/hooks/useEventFeed.ts`](../src/hooks/useEventFeed.ts) | Uses `fetchRecommendedEvents` when `VITE_API_URL` is set, otherwise falls back to the simulated sample events (`api.fetchEvents`). |
| [`src/utils/matching.ts`](../src/utils/matching.ts) | `scoreEvent` uses the API's score and reasons when the event carries `apiScore`. |
| [`src/types/event.ts`](../src/types/event.ts) | `CampusEvent` has optional `startAt`, `apiScore`, `apiReasons`, `apiReason`. `ScoredEvent` has optional `reason`. |

**Configuration:** set `VITE_API_URL` (build-time, Vite) to the base URL above. See `.env.example`. On Railway, set it as a variable on the front-end service; locally, copy `.env.example` to `.env.local`. Without it the app runs on sample data, which is useful for offline UI work.

**Field mapping (API to UI):**
- `type`: `career_fair`→Career fair, `info_session`→Info session, `hackathon`/`case_competition`→Workshop, `lecture`→Talk, `club_event`→Club, `networking`/`tabling`→Networking, `other`→Talk.
- `source`→calendar source filter: `careerlaunch`/`rollins`/`handshake_manual`→`byu-careers`; `clubs`/`byusa`→`byu-clubs`; everything else→`byu-departments`.
- `companies`→`employerIds`. Companies not in `src/data/employers.ts` are registered on the fly with a gray placeholder logo and initials. Add a real entry to `employers.ts` to give a company a color or industry.
- `fields`→`tags` and `industries`.
- The score shown in the UI is `round(apiScore * 3)` capped at 99, because the API score tops out near 30.

**Known gaps and gotchas**
- `attendeeIds` is always empty for API events, so the "people to meet" section is empty. The API has no people data yet.
- The Profile page's "top events" still scores the static sample events from `src/data/events.ts`; it hasn't been switched to the API. Reuse `fetchRecommendedEvents` there.
- The profile-to-contract mapping is approximate: `fields` is built from `interests.industries` plus `topSkills`, and `target_roles` from `lookingFor.roleTypes`. If the profile team adds explicit target roles or fields, update `toApiProfile` in `backend.ts`.
- `description` can be long and contain boilerplate. Truncate in cards.
- Events are only returned inside the `from`/`to` window. The UI currently asks for 31 days. If you add a "next 90 days" filter, change the window in `fetchRecommendedEvents`, not just a client-side filter.
- Do not call the API once per keystroke or per card. Fetch once per page load or profile change.
- Handle failure: the API can be cold or down. `useEventFeed` already exposes `error` and `retry`; keep using them.

---

## Sources and how events get in

Everything is normalized to the `Event` shape, deduped by `dedupe_hash`, and upserted (`on conflict (dedupe_hash) do update`), so re-running an ingest never creates duplicates.

| Source value | Status | How |
| --- | --- | --- |
| `byu_calendar` | **Live.** Runs on API boot and every 24 h (env `INGEST_BYU`). | `api/src/ingest-byu.js` calls the public BYU Calendar JSON API one week at a time (the API caps at ~100 events per response), categories Student Life (49), Education (4), Conferences (1006), next 30 days. `api/src/classify.js` tags `type`, `companies` and `fields` by keyword, so most general-calendar events are `other` with no companies. |
| `careerlaunch`, `cs_dept` (from the sheet) | **Live.** Refreshed on API boot and every 6 h (env `INGEST_SHEET_URLS`). | `api/src/ingest-sheet.js` reads the BYU Career Services "Hiring & Networking Events (F2026)" Google Sheet, published as CSV, one tab per month (page: https://careers.byu.edu/hiring-and-networking-events). Rows are info sessions, tabling and hackathons with a named **company**, time, location and host. Each event is listed under several major groups (Engineering, "CS, IS, Math, Data...", Business, All Majors, ...), so duplicates are merged and the groups become `fields`. Host "BYU CS Department" sets `source=cs_dept`, everything else `careerlaunch`. Hackathon rows have no sponsor, so `companies` is empty. Unreadable rows are skipped and logged. **Only the October tab is configured**; add each new month's CSV link (its `gid`) to `INGEST_SHEET_URLS`, comma-separated. |
| `rollins`, `clubs`, `cs_dept` (scraped) | **Seed data only** (17 events in `api/src/seed-events.js`, mostly placeholders; only the Oct 2 2026 CS Hackathon is confirmed). Scrapers not built yet. | Planned: fetch page text, send to the LLM extraction step (needs `ANTHROPIC_API_KEY`). Treat page structure as unstable. |
| `user_submission`, `email` | **Built, untested** (`POST /submit`). Blocked on `ANTHROPIC_API_KEY`. | LLM extraction, see `api/src/extract.js`. |
| `handshake_manual` | Manual entry only. No scraping of Handshake or LinkedIn. | |
| `byusa` | Not started. | |

The seed script runs on API boot while `SEED_ON_START` is set, so seeded events are re-upserted on every restart.

---

## Running and deploying the API

```bash
cd api
npm install
npm test            # unit tests (scoring, dedupe, DST, classifier, extraction parsing)
```

The database is only reachable from inside Railway (internal hostname), so there is no local database by default. To run locally, set `DATABASE_URL` to any Postgres, then `npm run migrate && npm run seed && npm start`.

Deploy (from the repo root, with the Railway CLI linked to the project):

```bash
railway up ./api --path-as-root --service doorway-api --ci
```

`--path-as-root` matters: without it the CLI uploads the whole repo and builds the front end instead. The start command runs migrations, optionally seeds (`SEED_ON_START`), then starts the server. Service variables: `DATABASE_URL` (reference to the Postgres service), `SEED_ON_START`, `INGEST_BYU`, `INGEST_SHEET_URLS` (comma-separated published-sheet CSV links), optional `SHEET_PAGE_URL`, and `ANTHROPIC_API_KEY` (not set yet; optional `EXTRACT_MODEL`, default `claude-haiku-4-5-20251001`). Never commit keys; set them with `railway variables`.

---

## Adding a source or changing the API

1. New ingest: normalize to the `Event` shape using `toEventRow` from `api/src/event.js` (it validates, canonicalizes companies, and computes the dedupe hash), then `upsertEvent` from `api/src/db.js`. Use `classify` from `api/src/classify.js` when there is no LLM in the loop.
2. Add a new `source` or `type` value to `SOURCES`/`TYPES` in `api/src/event.js` and to the lists in this doc.
3. Add company aliases in `api/src/aliases.js` and known company names in `api/src/classify.js` (`KNOWN_COMPANIES`).
4. Add tests in `api/test/` and run `npm test`.
5. Update this doc, then deploy.

## Maintaining this doc

Keep this file in sync with the code. Update it in the same change whenever you:
- add, remove or change an endpoint, request field, response field, or error
- add a source, change how a source is ingested, or change its status in the Sources table
- change scoring weights or the `reason` wording
- change env vars, deploy steps, or the base URL
- change how the front end consumes the API (`backend.ts`, `useEventFeed.ts`, field mappings)

Add a line to the changelog below for each change.

## Changelog

- 2026-10-02: Added the BYU Career Services sheet source (17 October events: Boeing, Sodexo, Ensign Peak, HXP, Disney College Program, and more) and corrected the docs: responses are UTC, display in America/Denver. The seeded "CS Hackathon" was confirmed to be the sheet's "Homecoming Hackathon" (Oct 2, ESC Annex, 8 AM-8 PM) and was renamed to match, keeping its Redo/Neighbor/Waystar sponsors.
- 2026-10-02: Upserts now **union** `companies` and `fields` instead of overwriting, so curated sponsors survive re-ingests from sources that don't list them (side effect: a company can't be removed by re-ingesting; delete or edit the row). `seed.js` also deletes retired seed rows listed in `retiredEvents`.
- 2026-10-02: Initial API: `/health`, `/events`, `/recommendations`, `/submit`; BYU Calendar ingest (daily); 17 seed events; front-end adapter behind `VITE_API_URL`; `relevant_only` option and word-aware field matching.
