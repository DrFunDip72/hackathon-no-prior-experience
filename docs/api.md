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
Raw events, no scoring. For debugging, plain list or calendar views, and re-fetching saved events. **`from`/`to` match events that are still happening**: an event is in the window if it ends after `from` (no end time counts as 1 hour) and starts before `to`, so today's hackathon still shows at 3 pm.

| Query param | Meaning | Default |
| --- | --- | --- |
| `from` | ISO date/time, inclusive lower bound on `start_at` | now |
| `to` | ISO date/time, exclusive upper bound | `from` + 21 days |
| `company` | Only events listing this company (case-insensitive, exact name) | none |
| `ids` | Comma-separated event ids (max 100). Ignores `from`/`to`/`company`. Use it to load a student's saved events ("My plan") even when they've dropped out of the ranked feed. Unknown ids are silently omitted. | none |

Returns `Event[]` ordered by `start_at`. Example: `GET /events?company=redo&to=2026-12-01`.

### `GET /events/:id`
One event by id (`evt_...`), same shape as `Event`. `404 { "error": "event not found" }` if unknown. For shareable event links.

### `GET /companies`
The companies directory: curated rows plus every company and graduate program seen on an upcoming event, with how many upcoming events each has. Sorted by `upcoming_event_count` desc, then name. Use it for logos and brand colors, and for onboarding company pickers (names are canonical, so `target_companies` matches).

```ts
interface Company {
  name: string;               // canonical; matches Event.companies / Event.programs
  aliases: string[];          // lowercase variants the API resolves, e.g. "redo tech"
  kind: 'employer' | 'grad_program' | 'campus_org';
  industry: string | null;
  website: string | null;     // not filled yet
  careers_url: string | null; // not filled yet
  logo_url: string | null;    // not filled yet: use initials + brand_color until it is
  brand_color: string | null; // hex, e.g. "#E5484D"
  upcoming_event_count: number;
}
```
Industry and brand color are seeded from the front end's `src/data/employers.ts`. Logos and websites are `null` until someone supplies verified ones.

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
  companies: string[];        // canonical employer names, alphabetical (in /recommendations: matched companies first, then alphabetical). Deduped; no graduate programs
  programs: string[];         // graduate schools / degree programs (e.g. "Carnegie Mellon MSCF"), kept out of companies
  fields: string[];           // lowercase career fields
  source: Source;
  source_url: string | null;  // link back to the original listing
  description: string | null; // raw text, can be long, may contain stray whitespace
  verified: boolean;          // false = unconfirmed (submitted by a person or read by an LLM, or a placeholder). Show an "Unconfirmed" badge or hide. True for every ingested source
  people: EventPerson[];      // recruiters/alumni/speakers named on the listing; EMPTY for now (no source provides them yet)
  registration_url: string | null;      // sign-up link; null when no source has one (source_url is the listing page)
  rsvp_required: boolean | null;
  registration_deadline: string | null; // ISO, UTC
  dedupe_hash: string;        // sha256(lower(title) + local date + lower(location))
  created_at: string;
  updated_at: string;
}

type EventType = 'career_fair' | 'hackathon' | 'info_session' | 'lecture' | 'tabling'
               | 'club_event' | 'case_competition' | 'networking' | 'other';

type Source = 'byu_calendar' | 'cs_dept' | 'careerlaunch' | 'rollins' | 'byusa'
            | 'clubs' | 'handshake_manual' | 'email' | 'user_submission';

interface EventPerson {
  id: string;                    // "per_<8 hex>", stable per name + company
  name: string;
  title: string | null;
  company: string | null;        // canonical, matches Event.companies
  kind: 'recruiter' | 'alumni' | 'speaker' | 'club_lead' | 'host';
  byu_connection: string | null; // "BYU CS '20"
  tags: string[];                // lowercase focus areas
  linkedin_url: string | null;   // only if public on the listing
  source: 'listing' | 'employer_submitted' | 'manual';
}

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
| [`src/types/event.ts`](../src/types/event.ts) | `CampusEvent` has optional `startAt`, `apiScore`, `apiReasons`, `apiReason`, `registrationUrl`, `verified`, `apiPeople`. `ScoredEvent` has optional `reason`. `PersonKind` now includes `'Host'`. |

**Configuration:** set `VITE_API_URL` (build-time, Vite) to the base URL above. See `.env.example`. On Railway, set it as a variable on the front-end service; locally, copy `.env.example` to `.env.local`. Without it the app runs on sample data, which is useful for offline UI work.

**Field mapping (API to UI):**
- `type`: `career_fair`→Career fair, `info_session`→Info session, `hackathon`/`case_competition`→Workshop, `lecture`→Talk, `club_event`→Club, `networking`/`tabling`→Networking, `other`→Talk.
- `source`→calendar source filter: `careerlaunch`/`rollins`/`handshake_manual`→`byu-careers`; `clubs`/`byusa`→`byu-clubs`; everything else→`byu-departments`.
- `source_url`→`sourceUrl` (the "View original listing" link in the detail sheet and the Google Calendar event).
- `companies`→`employerIds`. Companies not in `src/data/employers.ts` are registered on the fly using `GET /companies`' `industry`/`brand_color` when available (fetched once, cached for the session), a gray placeholder otherwise. `logo_url` is null for every company as of this writing, so there's nothing to wire up there yet. Add a real entry to `employers.ts` to override with a hand-picked color or industry.
- `fields`→`tags` and `industries`.
- `people`→`apiPeople` (mapped to the UI's `Person` shape; `kind` values map 1:1, including the new `host`→`'Host'`). `scoreEvent` uses `apiPeople` in place of the sample-data `attendeeIds` lookup when present, so "People to meet" and the hero card's "Meet X and N more" now populate for API events once a listing names anyone.
- `registration_url`→`registrationUrl` (a "Register" button in the event detail sheet, shown next to "Add to Google Calendar" when present).
- `verified`→`verified` (an "Unconfirmed" badge on the event card and detail sheet when `false`; not hidden, since hiding would make the student's plan silently shrink).
- The score shown in the UI is `round(apiScore * 3)` capped at 99, because the API score tops out near 30. Color bands (`scoreColorClass` in `matching.ts`): under 25% red, 25-49% orange, 50-64% yellow, 65%+ green — applied everywhere a score shows (event cards, detail, Profile's "Events that fit this profile").
- When the top-ranked event scores under 25% (or has no real match reasons at all), the Events page shows a "Nothing great for you this week" state with a local-only email signup instead of the list (`NoGoodMatches.tsx`) — see `api-requests.md`'s P1-8 for the `POST /subscriptions` this is standing in for.
- `GET /events?ids=` recovers a saved event ("My plan") that dropped out of the ranked `/recommendations` feed (outside the window, or filtered by `relevant_only`), so a saved event no longer silently disappears. These recovered events have no `apiScore`/`apiReasons`, so `scoreEvent` falls back to its local heuristic for them (same as sample data) — expect "My plan" entries that lost their original ranking info to show a plain re-derived score, not the one originally shown in the feed.

**Known gaps and gotchas**
- The Profile page's "Events that fit this profile" uses `useEventFeed` (same request as the Events page) and shows the top 3 with their `reason`.
- `toApiProfile` (exported from `backend.ts`) maps `interests.companies` to `target_companies`; `lookingFor.roleTypes` plus `employmentType` ("internship" or "full-time") to `target_roles`; and `interests.industries` (split into words, so "Data & Analytics" becomes "data" and "analytics"), `education.major` and `topSkills` (or the first grouped skills) to `fields`. `education.gradYear` becomes `grad_date` (`YYYY` or `YYYY-MM`). `user_id` is not sent, because the only id is the student's email.
- `useEventFeed` keeps the API's order (no client re-sort) and refetches only when the `toApiProfile` output changes.
- `companies` order varies between calls, so `toCampusEvent` puts `matched_companies` first. `start_at`/`end_at` currently come back as UTC `Z` strings, not with the Denver offset described above; `new Date()` handles both.
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
| `careerlaunch`, `cs_dept` (from the sheet) | **Live.** Refreshed on API boot and every 6 h (env `INGEST_SHEET_BASE` for auto-discovery, optional `INGEST_SHEET_URLS`). | `api/src/ingest-sheet.js` reads the BYU Career Services "Hiring & Networking Events (F2026)" Google Sheet, published as CSV, one tab per month (page: https://careers.byu.edu/hiring-and-networking-events). Rows are info sessions, tabling and hackathons with a named **company**, time, location and host. Each event is listed under several major groups (Engineering, "CS, IS, Math, Data...", Business, All Majors, ...), so duplicates are merged and the groups become `fields`. Host "BYU CS Department" sets `source=cs_dept`, everything else `careerlaunch`. Hackathon rows have no sponsor, so `companies` is empty. Unreadable rows are skipped and logged. **New month tabs are picked up automatically**: the server reads the published sheet's main page (`INGEST_SHEET_BASE` = `https://docs.google.com/spreadsheets/d/e/<id>`) to discover every tab's `gid` on each run (currently 4 tabs: September, October and two empty ones). If discovery ever breaks, list CSV links explicitly in `INGEST_SHEET_URLS`. |
| `cs_dept` (department calendar) | **Live.** Refreshed on API boot and every 6 h (env `INGEST_CS`). | `api/src/ingest-cs.js` reads the listing at https://cs.byu.edu/department/event-calendar, follows each dated event page (`/<slug>-YYYY-MM-DD`), finds its `/_event.ics?e=<id>` link and parses the ICS (title, start/end, location, description). Sponsors are found by keyword against `KNOWN_COMPANIES` in the page text, so unfamiliar sponsor names are missed (add them to `classify.js`). The listing only exposes a few upcoming events, and some (e.g. the weekly seminar) are not linked from it. |
| `rollins`, `clubs`, `byusa` | **Not built.** No events yet. Planned: Rollins Center (https://marriott.byu.edu/cet) and club pages via page text plus the LLM extraction step (needs `ANTHROPIC_API_KEY`). | |
| `user_submission`, `email` | **Built, untested** (`POST /submit`). Blocked on `ANTHROPIC_API_KEY`. | LLM extraction, see `api/src/extract.js`. |
| `handshake_manual` | Manual entry only. No scraping of Handshake or LinkedIn. | |
| `byusa` | Not started. | |

`api/src/seed-events.js` now only holds curated facts the sources lack (the hackathon's sponsors: Redo, Neighbor, Waystar). The seed script runs on API boot while `SEED_ON_START` is set and also deletes retired seed rows (`retiredEvents`). Because upserts union `companies`/`fields`, seeded sponsors merge into ingested rows.

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

`--path-as-root` matters: without it the CLI uploads the whole repo and builds the front end instead. The start command runs migrations, optionally seeds (`SEED_ON_START`), then starts the server. Service variables: `DATABASE_URL` (reference to the Postgres service), `SEED_ON_START`, `INGEST_BYU`, `INGEST_SHEET_BASE` (published sheet base URL), `INGEST_SHEET_URLS` (optional explicit CSV links), `INGEST_CS`, optional `SHEET_PAGE_URL`, and `ANTHROPIC_API_KEY` (not set yet; optional `EXTRACT_MODEL`, default `claude-haiku-4-5-20251001`). Never commit keys; set them with `railway variables`.

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

- 2026-10-02: Front-end team's requests (see `docs/api-requests.md`): `/events` and `/recommendations` now include events still in progress; `verified` flag (false for submissions and unconfirmed rows); `companies` cleaned (deduped, alphabetical, matched-first in `/recommendations`, subtitles like "- Networking Readiness" stripped, graduate programs moved to new `programs`); new `people`, `registration_url`, `rsvp_required`, `registration_deadline` fields (empty until a source provides them; upserts only fill gaps); new `GET /events/:id`, `GET /events?ids=`, `GET /companies`. Upserts merge `verified` as "verified once any trusted source lists it".
- 2026-10-02: Added the CS department source (`ingest-cs.js`: listing, event pages, per-event ICS) and automatic sheet tab discovery (the September tab added 5 events). BYU Calendar events are now classified using their `TagsNames` too. Removed the 16 fake placeholder seed events; the only seed left is the real Homecoming Hackathon with its sponsors. The live event count is now about 80 for Sep 1 to Dec 31.
- 2026-10-02: Added the BYU Career Services sheet source (17 October events: Boeing, Sodexo, Ensign Peak, HXP, Disney College Program, and more) and corrected the docs: responses are UTC, display in America/Denver. The seeded "CS Hackathon" was confirmed to be the sheet's "Homecoming Hackathon" (Oct 2, ESC Annex, 8 AM-8 PM) and was renamed to match, keeping its Redo/Neighbor/Waystar sponsors.
- 2026-10-02: Upserts now **union** `companies` and `fields` instead of overwriting, so curated sponsors survive re-ingests from sources that don't list them (side effect: a company can't be removed by re-ingesting; delete or edit the row). `seed.js` also deletes retired seed rows listed in `retiredEvents`.
- 2026-10-02: Initial API: `/health`, `/events`, `/recommendations`, `/submit`; BYU Calendar ingest (daily); 17 seed events; front-end adapter behind `VITE_API_URL`; `relevant_only` option and word-aware field matching.
- 2026-10-02: Front end: Profile top events on the live API; API order preserved; refetch on profile change; richer `toApiProfile`; `source_url` shown; matched companies first; employer entries for the live companies (Redo, Neighbor, Waystar and others). The data gap report for the API owner is in [`api-requests.md`](./api-requests.md).
- 2026-10-02: Front end: wired in the newly shipped `people`, `registration_url`, `verified` and `GET /companies` fields (people populate "People to meet"; a "Register" button; an "Unconfirmed" badge; employer colors/industries from the companies directory, fetched once per session); `GET /events?ids=` recovers a saved event that drops out of the ranked feed so "My plan" doesn't lose it; match-score color bands (red/orange/yellow/green) everywhere a score shows; a "Nothing great for you this week" state with a local-only (no backend yet) email signup on Events. API: fixed `classify.js` tagging evening events `product` off a clock time ("7:00 PM") instead of the Product Manager abbreviation; `scoring.js` now also matches a `target_role` against an event's classified `fields`, not just a literal phrase in its text — both found while investigating a Product Manager profile's weak matches, written up in `api-requests.md`. New `POST /subscriptions` requested (P1-8) for when the local-only alert signup gets a real backend.
