# Events API

The backend for Doorway's events page. It collects campus recruiting and networking events from several sources, stores them in Postgres, and ranks them against a student's profile. **Agents: read this file before touching anything that talks to the API, and update it whenever the API, its sources, or its data change** (see [Maintaining this doc](#maintaining-this-doc)).

- **Base URL (production):** `https://doorway-api-production-db29.up.railway.app`
- **Code:** [`api/`](../api) (plain Node ESM, one dependency: `pg`). Hosted on Railway as the `doorway-api` service, with a Railway Postgres database. The front end never talks to the database or to n8n, only to this API.
- **Auth:** read endpoints and recommendations are public. `/submit` and `/submit/bulk` require `SUBMIT_TOKEN` in `x-submit-token` or a Bearer header. CORS is open (`*`) and permits both auth headers. Never send Railway/Anthropic credentials or unrelated personal information in requests.
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

### `POST /submit/bulk`
Pulls **many** events out of one pasted dump (e.g. messages copied from a Slack channel) using the LLM, and stores them. **Not for the public front end**: it needs the `x-submit-token` header (or `Authorization: Bearer <token>`) matching the server's `SUBMIT_TOKEN`, and is limited to 30 requests per hour per client. With no `SUBMIT_TOKEN` configured it is off (503).

**Two ways it reads the text.** (1) The **standard weekly AIS message** (a title line, then `What:` / `When:` / `Where:` / `Food:` lines, see `api/src/weekly-dump.js`) is parsed directly: no AI, no `ANTHROPIC_API_KEY` needed, nothing leaves the server. Dates have no year, so the year whose weekday matches and is nearest today is used; `:emoji:` codes are stripped; sponsor sessions get `companies` from the title, career fairs get none; every event gets the `information systems` field; Slack links are never kept, other links become `registration_url`; items with no `When:` ("See #channel for details") are not saved and appear in `skipped`. (2) **Any other text** goes to the LLM and needs `ANTHROPIC_API_KEY`. The response says which: `"method": "format"` or `"llm"`.

Body: `{ "text": "<pasted messages>", "source": "slack", "dry_run": false }` (`source` optional, default `user_submission`; `dry_run: true` returns the events without saving; max ~200,000 characters). Response: `{ "saved": n, "skipped": ["Old Fair: already past", "2026 SLC DevFest: no date in the message", ...], "events": Event[], "method": "format" | "llm" }`. Optional `dry_run: true` performs extraction without database writes: `{ "saved": 0, "skipped": [...], "events": EventPreview[], "dry_run": true }`. Preview rows have no `created_at`/`updated_at`; timestamps may carry a Denver offset instead of UTC. Computed ids do not mean a stored event exists. Previews still use LLM credit and require the submit token.
- Only career events are kept (career fairs, info sessions, networking, hackathons, case competitions, tabling, speakers); job postings and chatter are ignored. Missing/ambiguous dates or start times must not be guessed; relative dates use dated message context. Undated and old events are skipped.
- New events are `verified: false` and carry the model's short event summary as `description` plus a public HTTP(S) registration/details link as `registration_url`. Private Slack links and credential-bearing/unsafe URLs are discarded. Only allowlisted event fields are stored; `people` is empty and model-supplied ids/source URLs/metadata are discarded. The prompt excludes poster names, personal names and contact information. Raw messages are never saved; provider/database error details are never logged for submit routes. Existing verified duplicates retain their trusted source and optional facts when absent from new input.
- Errors: `400` invalid input, `401` wrong/missing token, `413` oversize paste, `503` token or `ANTHROPIC_API_KEY` not configured, `422` unreadable model output, `429` rate limited, `502` provider HTTP error, `500` other failures.

### `GET /paste`
A small web page (`api/src/paste.html`) for the owner: enter the submit token once (kept in that browser), paste Slack messages, click Extract. It calls `/submit/bulk` with `source: "slack"`. Not linked from anywhere; `noindex`.

### `POST /events/import`
Saves events that are **already structured**, for example transcribed from a calendar image. No AI involved. Same protection as `/submit/bulk`: needs `x-submit-token`, rate limited.

Body: `{ "events": [ { "title", "start", "end", "location", "type", "companies", "fields", "url", "description" } ], "source": "clubs", "verified": false, "dry_run": false }`. `start`/`end` are ISO with an offset or America/Denver wall time (`"2026-10-14 18:00"`). `source` is one of the Source values (default `user_submission`). Rows are **unverified unless `verified: true`**. At most 500 events per request. Only the listed fields are kept; links must be public (private Slack links are dropped); past events and rows without a title or date are skipped and reported. Response: `{ "saved", "skipped": [...], "events": Event[] }` (`dry_run: true` returns the events without saving). Re-importing is safe (events dedupe, see below).

### `POST /submit`
Turns pasted text (an email, a flyer's text) or a flyer photo into an event using an LLM. Only extracted event facts are stored; raw text/images and model-supplied people/metadata are discarded. New single submissions have null `description`/`source_url` and empty `people`.

Body: `{ "text": "..." }` or `{ "image_base64": "<base64>", "media_type": "image/jpeg" }` (optionally both). Supported image types: JPEG (default), PNG, GIF, WebP. Optional `dry_run: true` performs extraction without writing an event.
Response: `{ "event": Event, "extracted": true }`; with `dry_run: true`, `{ "event": EventPreview, "extracted": true, "dry_run": true }` (same preview omissions as bulk). Invalid extraction returns `422` and never falls back to storing raw text.
Needs the same token and shares the rate limit with `/submit/bulk`. Errors: `400` invalid input, `401`/`503`/`429` as above, `413` for bodies over about 12 MB, `422` if no valid title/start could be found, `502` provider HTTP error, `500` other failures. **`ANTHROPIC_API_KEY` is still absent**, so authenticated extraction tests remain blocked.
New submitted events have `source: "user_submission"`, `verified: false`. Verified duplicates keep their verification, source, listing URL and existing description.

See [`slack-setup.md`](./slack-setup.md) for secure configuration and public-text smoke tests with `dry_run: true`.

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
  description: string | null; // public listing text, extracted bulk summary, or null; never raw submitted messages
  verified: boolean;          // false = unconfirmed (submissions, Slack or LLM extraction); true once a trusted public source confirms it
  people: EventPerson[];      // recruiters/alumni/speakers named on the listing; EMPTY for now (no source provides them yet)
  registration_url: string | null;      // sign-up link; null when no source has one (source_url is the listing page)
  rsvp_required: boolean | null;
  registration_deadline: string | null; // ISO, UTC
  dedupe_hash: string;        // sha256(lower(title) + local date + lower(location))
  sources: Source[];          // every source that listed this event (merged near-duplicates have 2+); `source` is the primary one
  created_at: string;
  updated_at: string;
}

type EventType = 'career_fair' | 'hackathon' | 'info_session' | 'lecture' | 'tabling'
               | 'club_event' | 'case_competition' | 'networking' | 'other';

type Source = 'byu_calendar' | 'cs_dept' | 'careerlaunch' | 'rollins' | 'byusa'
            | 'clubs' | 'handshake_manual' | 'email' | 'slack' | 'user_submission';

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
| [`src/utils/backend.ts`](../src/utils/backend.ts) | Calls `POST /recommendations` and `GET /events?ids=`, loads `GET /companies` once per page load, maps responses to the UI's `CampusEvent` type, and maps the Doorway `Profile` onto the profile contract. Exports `API_URL`, `fetchRecommendedEvents(profile)`, `fetchEventsByIds(ids)` and `fetchRecentEvents(days)` (`GET /events?from=&to=now`: ended events for "My plan", where a student marks attendance; attendance is stored only in the browser). |
| [`src/hooks/useEventFeed.ts`](../src/hooks/useEventFeed.ts) | Uses `fetchRecommendedEvents` when `VITE_API_URL` is set, otherwise falls back to the simulated sample events (`api.fetchEvents`). Loads saved "My plan" ids missing from the feed with `fetchEventsByIds`, once per id per page load (`retry` tries again). |
| [`src/utils/matching.ts`](../src/utils/matching.ts) | `scoreEvent` uses the API's score and reasons when the event carries `apiScore`, and the event's `people` when present. `matchLabel` turns a score into "Strong match" / "Good match" / "Worth a look". |
| [`src/utils/dates.ts`](../src/utils/dates.ts) | All date/time formatting, in America/Denver via `Intl`. |
| [`src/components/events/EventBadges.tsx`](../src/components/events/EventBadges.tsx) | The one place for status tags: "Happening now", "Unconfirmed", "RSVP required", "Register by …", each shown only when the data supports it. |
| [`src/components/events/NoGoodMatches.tsx`](../src/components/events/NoGoodMatches.tsx) | Replaces the "For you" list when nothing is better than "Worth a look". |
| [`src/types/event.ts`](../src/types/event.ts) | `CampusEvent` has optional `startAt`, `apiScore`, `apiReasons`, `apiReason`, `verified`, `programs`, `people`, `registrationUrl`, `rsvpRequired`, `registrationDeadline`. `ScoredEvent` has optional `reason`. `PersonKind` includes `'Host'`. |

**Configuration:** set `VITE_API_URL` (build-time, Vite) to the base URL above. See `.env.example`. On Railway, set it as a variable on the front-end service; locally, copy `.env.example` to `.env.local`. Without it the app runs on sample data, which is useful for offline UI work.

**Field mapping (API to UI):**
- `type`: `career_fair`→Career fair, `info_session`→Info session, `hackathon`/`case_competition`→Workshop, `lecture`→Talk, `club_event`→Club, `networking`/`tabling`→Networking, `other`→Talk.
- `source`→calendar source filter: `careerlaunch`/`rollins`/`handshake_manual`→`byu-careers`; `clubs`/`byusa`→`byu-clubs`; everything else→`byu-departments`.
- `source_url`→`sourceUrl` (the "View original listing" link in the detail sheet and the Google Calendar event).
- `companies`→`employerIds`, in the API's order (no client re-sort). Colors, industries and logos come from `GET /companies` (employers only, fetched once per page load, retried on the next fetch if it failed), falling back to `src/data/employers.ts`; unknown companies get a gray tile with initials. `logo_url` is null for every company as of this writing.
- `programs`→`programs`, shown as a "Programs: …" line in the detail panel, never as logos.
- `fields`→`tags` and `industries`.
- `people`→`people` (mapped to the UI's `Person` shape; `kind` maps 1:1, including `host`→`'Host'`). `scoreEvent` uses it in place of the sample-data `attendeeIds` lookup, so "People to meet" and the hero card's "Meet X and N more" populate once a listing names anyone. Hidden while empty.
- `registration_url`→`registrationUrl` (a "Register" button in the event detail sheet). `rsvp_required`/`registration_deadline`→"RSVP required" / "Register by …" tags. All hidden while null.
- `verified: false`→an "Unconfirmed" tag on the card and detail sheet (not hidden, since hiding would make the student's plan silently shrink).
- Scores: `round(apiScore * 3)` capped at 99, because the API score tops out near 30. It is not a true percentage, so the UI never shows it as one: `matchLabel` shows "Strong match" (55+), "Good match" (30+), or "Worth a look", and "—" when an event has no match reasons. Same labels on event cards, the detail sheet, Profile's "Events that fit this profile" and the homepage preview. Switch to the API's `percent` once it ships (requested in `api-requests.md`).
- When nothing in "For you" reaches "Good match" (score 30), the Events page shows a "No good matches right now" state with a local-only email signup instead of the list (`NoGoodMatches.tsx`); it says plainly that no alerts are sent yet. See `api-requests.md` (P1-8) for the `POST /subscriptions` it stands in for.
- `GET /events?ids=` keeps a saved event in "My plan" after it drops out of the ranked `/recommendations` feed (outside the window, or filtered by `relevant_only`). These events have no ranking, so they show "—" instead of a label. They feed only "My plan", never "For you".

**Known gaps and gotchas**
- `people` is empty for every event today, so "People to meet" stays hidden and the top card shows the attending companies instead.
- In-progress events stay in the feed with a "Happening now" tag; only ended events are dropped client-side.
- The Profile page's "Events that fit this profile" uses `useEventFeed` (same request as the Events page) and shows the top 3 with their `reason`.
- `toApiProfile` (exported from `backend.ts`) maps `interests.companies` to `target_companies`; `lookingFor.roleTypes` plus `employmentType` ("internship" or "full-time") to `target_roles`; and `interests.industries` (split into words, so "Data & Analytics" becomes "data" and "analytics"), `education.major` and `topSkills` (or the first grouped skills) to `fields`. `education.gradYear` becomes `grad_date` (`YYYY` or `YYYY-MM`). `user_id` is not sent, because the only id is the student's email.
- `useEventFeed` keeps the API's order (no client re-sort) and refetches only when the `toApiProfile` output changes, unless AI ranking answers (next section).

**AI ranking on the front end (Vercel, not this API).** The API's `/recommendations` result is the candidate set; [`api/rank-events.ts`](../api/rank-events.ts) (a Vercel function, `GEMINI_API_KEY`) re-scores it with Gemini embeddings (`gemini-embedding-2`, falling back to `gemini-embedding-001`), one batch call per profile + event set, cached in `localStorage` (`doorway_ai_rank_v1`, 6 entries, 12 h) by [`src/utils/aiRank.ts`](../src/utils/aiRank.ts). When it answers, `useEventFeed` sorts by the AI percent (stable, API order breaks ties) and every event gets a label: Strong 65+, Good 40+, else Worth a look (`AI_STRONG_MATCH`/`AI_GOOD_MATCH` in `matching.ts`), so "—" no longer appears in "For you". The formula (similarity relative to a generic "info session" anchor, +25 when a target company attends) is documented in the function. The API's `reason` is kept unless it's the generic "Upcoming …, worth a look." and the AI rates the event Good or better. On any failure (no key → 503, 429, offline) the feed is exactly the API's order and labels described above.
- `start_at`/`end_at` are UTC `Z` strings; the UI formats them in America/Denver (`src/utils/dates.ts`), and the Google Calendar link passes `ctz=America/Denver`.
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
| `slack` | **Built via owner paste flow; live extraction blocked on `ANTHROPIC_API_KEY`.** | Copy selected BYU IS jobs/internships and `a_team` event announcements into `/paste`, which calls `/submit/bulk`. The workspace blocks custom Slack apps, so there is no polling bot. Only extracted events/summary/public event link are stored; no raw messages or poster metadata. |
| `user_submission`, `email` | **Built, locally tested** (`POST /submit` and `/submit/bulk`). Live extraction blocked on `ANTHROPIC_API_KEY`. | Single/bulk LLM extraction with `dry_run` previews; see `api/src/extract.js` and `submit.js`. No email connector; single submissions use `user_submission`. |
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

`--path-as-root` matters: without it the CLI uploads the whole repo and builds the front end instead. The start command runs migrations, optionally seeds (`SEED_ON_START`), then starts the server. Service variables: `DATABASE_URL` (reference to the Postgres service), `SEED_ON_START`, `INGEST_BYU`, `INGEST_SHEET_BASE` (published sheet base URL), `INGEST_SHEET_URLS` (optional explicit CSV links), `INGEST_CS`, `SUBMIT_TOKEN` (required for `/submit` and `/submit/bulk`; read it with `railway variables --service doorway-api`), optional `SHEET_PAGE_URL`, and `ANTHROPIC_API_KEY` (not set yet; optional `EXTRACT_MODEL`, default `claude-haiku-4-5-20251001`). Never commit keys; set them with `railway variables`.

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

- 2026-10-02: Added one event by hand from Handshake via `POST /events/import` (`source: handshake_manual`, verified): **2026 BYU Marriott Product Management Career Fair**, Wed Oct 21 2026, 6-8 PM MDT, in person in Provo, employers BambooHR, LeaderFactor and Lucid (only these three were visible on the page, so the list may be incomplete). Added the alias `Lucid Software` -> `Lucid` so students who target Lucid match it.
- 2026-10-02: **Near-duplicate events are merged**, and `sources: Source[]` lists every source that listed an event. Two events are the same when they start within 30 minutes, are in the same place and their titles share 80% of their words after expanding abbreviations (Grad/Graduate, Info/Information, ...). Places match when the names match, one contains the other ("TNRB 2051" in "Tanner Building, TNRB 2051 (251)"), building abbreviations expand (WSC, TNRB, TMCB, HBLL, ...), or one is unknown/TBD. Merging happens on every upsert and once on boot for rows stored earlier: the merged row keeps one id (the oldest verified row's), unions companies/fields/sources, and a verified listing's title wins over an unverified one. The id of a merged-away duplicate stops existing (`GET /events?ids=` just omits unknown ids). Different events at the same time and place ("HXP Tabling" vs "HXP Info Session") stay separate, and so do sessions more than 30 minutes apart (the two Disney sessions an hour apart). New `POST /events/import` for already-structured events.
- 2026-10-02: `/submit/bulk` now reads the standard weekly AIS events message with a plain parser (`api/src/weekly-dump.js`): no AI and no Anthropic key needed for that format, and `method` in the response says which path was used. Other text still falls back to the LLM.
- 2026-10-02: Fixed wrong `product` tags on FHE/craft/dance events. Root cause: list fields were unioned on re-ingest, so a bad tag could never be removed, and the classifier read clock times ("7:30 PM") as "PM = product manager". Now: (1) the BYU calendar ingest **drops non-career events** (FHE / Family Home Evening, devotional, dance, craft night, game night, ward/stake activity, service project) unless they also look like a career event or name a known company; (2) keyword-classified sources replace their own `fields`/`companies` on re-ingest (a source only replaces rows it wrote itself; other sources' data still unions in); (3) on every boot the API deletes stored non-career BYU events and re-runs the classifier over stored BYU events and sponsor-less CS department events; (4) CS department events are classified from title + ICS description only (page text is used just to find sponsors). Tests include real-database checks (see `backend-handoff.md`).
- 2026-10-02: Preserved the Slack paste flow and submit-token protection while adding `dry_run` previews to both submission endpoints. Removed single-submission raw-text fallback/storage; allowlisted extracted fields for single/bulk rows, discarded people/metadata and private Slack/unsafe links, and kept LLM rows unverified. Provider errors are sanitized, submission error logs omit values, and auth headers are permitted by CORS. Upserts preserve trusted source attribution and missing optional descriptions/links. Added privacy, validation, preview and provider-error tests; live extraction still awaits the Anthropic key.
- 2026-10-02: BYU IS Slack source, built for a workspace where custom apps are blocked: `POST /submit/bulk` (many events from a pasted dump) and the `/paste` page. Submit endpoints now require `SUBMIT_TOKEN` and are rate limited (they spend LLM credit); fail closed if the token is unset. New `slack` source value. Needs `ANTHROPIC_API_KEY` to actually extract (503 until set).
- 2026-10-02: Front-end team's requests (see `docs/api-requests.md`): `/events` and `/recommendations` now include events still in progress; `verified` flag (false for submissions and unconfirmed rows); `companies` cleaned (deduped, alphabetical, matched-first in `/recommendations`, subtitles like "- Networking Readiness" stripped, graduate programs moved to new `programs`); new `people`, `registration_url`, `rsvp_required`, `registration_deadline` fields (empty until a source provides them; upserts only fill gaps); new `GET /events/:id`, `GET /events?ids=`, `GET /companies`. Upserts merge `verified` as "verified once any trusted source lists it".
- 2026-10-02: Added the CS department source (`ingest-cs.js`: listing, event pages, per-event ICS) and automatic sheet tab discovery (the September tab added 5 events). BYU Calendar events are now classified using their `TagsNames` too. Removed the 16 fake placeholder seed events; the only seed left is the real Homecoming Hackathon with its sponsors. The live event count is now about 80 for Sep 1 to Dec 31.
- 2026-10-02: Added the BYU Career Services sheet source (17 October events: Boeing, Sodexo, Ensign Peak, HXP, Disney College Program, and more) and corrected the docs: responses are UTC, display in America/Denver. The seeded "CS Hackathon" was confirmed to be the sheet's "Homecoming Hackathon" (Oct 2, ESC Annex, 8 AM-8 PM) and was renamed to match, keeping its Redo/Neighbor/Waystar sponsors.
- 2026-10-02: Upserts now **union** `companies` and `fields` instead of overwriting, so curated sponsors survive re-ingests from sources that don't list them (side effect: a company can't be removed by re-ingesting; delete or edit the row). `seed.js` also deletes retired seed rows listed in `retiredEvents`.
- 2026-10-02: Initial API: `/health`, `/events`, `/recommendations`, `/submit`; BYU Calendar ingest (daily); 17 seed events; front-end adapter behind `VITE_API_URL`; `relevant_only` option and word-aware field matching.
- 2026-10-02: Front end: Profile top events on the live API; API order preserved; refetch on profile change; richer `toApiProfile`; `source_url` shown; matched companies first; employer entries for the live companies (Redo, Neighbor, Waystar and others). The data gap report for the API owner is in [`api-requests.md`](./api-requests.md).
- 2026-10-02: Front end consumes the new API: "Happening now" for in-progress events; one "Unconfirmed" tag for `verified: false`; API `companies` order kept (client re-sort removed); `programs` shown separately; `people` populate "People to meet"; "Register" button and RSVP/register-by tags (all hidden while empty); `GET /events?ids=` keeps saved events in "My plan"; `GET /companies` for colors (cached per page load); Denver time everywhere; match labels (Strong / Good / Worth a look) instead of percentages; a "No good matches right now" state with a local-only (no backend yet) email signup on Events. API: fixed `classify.js` tagging evening events `product` off a clock time ("7:00 PM") instead of the Product Manager abbreviation; `scoring.js` now also matches a `target_role` against an event's classified `fields`, not just a literal phrase in its text (both found while investigating a Product Manager profile's weak matches, written up in `api-requests.md`). New `POST /subscriptions` requested (P1-8) for when the alert signup gets a real backend.
