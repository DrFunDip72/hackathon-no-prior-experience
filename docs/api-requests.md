# Events API: data gap report and requests

From the front-end team (Doorway) to the events API owner. Written 2026-10-02 after wiring the live API into the Events page and the Profile page's "Events that fit this profile" card. Source of truth for the current API: [`api.md`](./api.md).

## Summary (paste this to the API owner)

> The live API works well: `POST /recommendations` answers in about 0.15 s, returns 28 ranked events for a typical CS profile, and the `reason` string is now the headline on every card. We render results in your order and fetch once per page load.
>
> **For the demo today (P0):**
> 1. Include events that are **in progress** (`end_at > from`), so today's CS Hackathon shows up once it has started.
> 2. Mark **placeholder seed events** (`"verified": false`), so we don't present invented events as real.
> 3. Clean up `companies`: return a stable order (matched companies first), and drop grad programs and sub-titles that aren't employers ("Carnegie Mellon MSCF", "Disney College Program - Networking Readiness", two spellings of "Duke ... Pratt").
>
> **Next (P1):** people per event (recruiters, alumni, speakers) so "People to meet" works; `registration_url`; `GET /events?ids=` so saved events don't vanish from "My plan"; `GET /companies` with logo and brand color; a `percent` match score so we stop guessing a scale; audience fields (majors, class years, internship vs full-time, roles hiring).
>
> **Later (P2):** more sources (CS department, BYUSA clubs, college calendars, career-fair employer lists, Handshake exports), `GET /sources` with counts and freshness, virtual links, food, dress code, capacity, images, recurring series.
>
> Details, field shapes and examples are below.

## Status (updated by the API owner)

| Request | Status |
| --- | --- |
| P0-1 In-progress events | **Done.** `from`/`to` now include events that end after `from`. |
| P0-2 `verified` flag | **Done.** `verified: boolean` on every event. The 16 placeholder seed events were deleted, so only real sources remain. `false` is used for submissions (`/submit`, email). |
| P0-3 Clean `companies` | **Done.** Deduped and alphabetical (matched-first in `/recommendations`); graduate programs moved to new `programs`; subtitles stripped. |
| P1-1 People per event | **Field added, no data yet.** `people: []` on every event. No source lists recruiters publicly; it will fill as sources (listing text via LLM, employer submissions) are added. |
| P1-2 Registration | **Field added** (`registration_url`, `rsvp_required`, `registration_deadline`), all null for now. |
| P1-3 Fetch by id | **Done.** `GET /events/:id` and `GET /events?ids=`. |
| P1-4 `GET /companies` | **Done**, with industry and brand color; logos/websites are null until verified ones exist. |
| P1-5 percent, P1-6 audience, P1-7 profile fields | Not started. |
| P2 | Sources: BYU calendar, career-services sheet (all month tabs) and CS department are live. See `api.md`. |

---

## 1. What the API returns today (real payload)

`POST /recommendations` with a CS profile (Redo, Neighbor, Qualtrics, Waystar; `software engineering`, `data`; `relevant_only: true`; 31-day window). Status 200, 0.15 s, 28 results. First item:

```json
{
  "event": {
    "id": "evt_6823074647d7",
    "title": "Startup Career Fair",
    "start_at": "2026-10-15T17:00:00.000Z",
    "end_at": "2026-10-15T21:00:00.000Z",
    "location": "Wilkinson Student Center",
    "type": "career_fair",
    "companies": ["Redo", "Neighbor", "Podium", "Entrata"],
    "fields": ["software engineering", "product", "sales"],
    "source": "rollins",
    "source_url": "https://marriott.byu.edu/cet",
    "description": "Utah startups recruiting interns and new grads, hosted by the Rollins Center.",
    "dedupe_hash": "6823074647d7…",
    "created_at": "2026-10-02T17:25:23.577Z",
    "updated_at": "2026-10-02T18:44:51.565Z"
  },
  "score": 28.7,
  "matched_companies": ["Redo", "Neighbor"],
  "matched_fields": ["software engineering", "software engineer"],
  "reason": "Redo and Neighbor reps attending, matches 2 of your 4 target companies. Covers software engineering and software engineer, which matches your interests."
}
```

`GET /events` (now to Nov 15): 72 events. Sources: `byu_calendar` 44, `careerlaunch` 20, `cs_dept` 3, `clubs` 3, `rollins` 2. Types: `other` 32, `info_session` 17, `lecture` 11, `tabling` 4, `career_fair` 3, `networking` 2, `club_event` 2, `case_competition` 1. `end_at` is null on 5 events. `location` is never null but is sometimes the string `"TBD"`.

### Data issues we found

| Issue | Example | Impact |
| --- | --- | --- |
| Timestamps come back as UTC `Z`, not with the `-06:00` offset `api.md` describes | `"2026-10-15T17:00:00.000Z"` | None for parsing (`new Date()` is fine). Please update the doc or the serializer so they agree. |
| `companies` order changes between calls | Same event: `["Redo","Neighbor","Podium","Entrata"]` in one call, `["Redo","Podium","Entrata","Neighbor"]` in another | Cards would say "Redo, Podium and 2 more" for a Neighbor fan. We now sort matched companies first on the client; a stable server order is better. |
| Non-employers in `companies` | `"Carnegie Mellon MSCF"`, `"Duke University Pratt School of Engineering Grad School"` and `"... Graduate School"`, `"Disney College Program - Networking Readiness"` | Gray placeholder logos and duplicate "companies". Please alias or drop them, or add a `kind` (see `GET /companies`). |
| Classifier noise in `fields` | "Amazing Race FHE" is tagged `["product"]` | Unrelated events can match product-minded students. |
| Seed placeholders look like real events | 16 of 17 seed events are unconfirmed (per `api.md`) | Risky in a demo: a student could show up to an event that doesn't exist. |
| In-progress events are dropped | `from=now` filters on `start_at`, so the CS Hackathon (today) disappears after it starts | The headline event of the day is missing from the feed while it's happening. |
| `score` has no stated maximum | "roughly 1 to 30" | We show `round(score * 3)` capped at 99, which is a guess. |

---

## 2. Field inventory: what the UI uses versus what the API has

"Sample" means the offline sample data in `src/data/*` that the UI was designed around.

### Events

| Field (UI name) | Used where in the UI | Sample has it? | API returns it? | Gap / notes |
| --- | --- | --- | --- | --- |
| id | Keys, "My plan" (`addedEventIds`) | Yes | Yes (`id`) | No lookup by id (see `GET /events?ids=`). |
| title | Cards, detail, Profile card, Google Calendar link | Yes | Yes | None. |
| type | Card subtitle, detail, Type filter | Yes (6 UI types) | Yes (9 types, mapped) | 32 of 72 are `other`. Better classification wanted. |
| start / end | Date badge, time range, conflict check, calendar link | Yes | Yes (`start_at`, `end_at`) | `end_at` null on 5 events (we assume 1 h). |
| location | Cards, detail, calendar link | Yes | Yes | `"TBD"` string; no building code or map link. |
| description | Detail "About", calendar link | Yes | Yes | Fine. Can be long. |
| tags / industries | Industry filter, local matching | Yes | Partly (`fields`) | Only 10 distinct field values; no skills or topic tags. |
| employerIds (companies) | Logos and chips on cards and detail | Yes | Yes (`companies`) | Order, non-employers, no logos (see above). |
| attendeeIds (people) | "Meet X and 2 more" on cards, "People to meet" in detail, talking points, calendar link | Yes | **No** | Section is hidden for API events today. Biggest product gap. |
| sourceId (calendar source) | Source filtering on the Connect page | Yes | Yes (`source`, mapped) | No source metadata or counts. |
| match score | `%` on every card | Computed | Yes (`score`) | No max or percent. |
| match reason | Headline sentence on every card | Computed | Yes (`reason`) | Works. |
| match chips | Detail | Computed | Yes (`matched_companies`, `matched_fields`) | Works. |
| source_url | "View original listing" link (new) | No | Yes | Now shown. Points at a listing page, not a sign-up. |
| registration link / RSVP | Not built (would be the main CTA next to "Add to calendar") | No | No | Requested. |
| audience (majors, years, internship vs full-time) | Would power filters and better reasons | No | No | Requested. |
| roles hiring | Would power "Hiring: SWE intern, PM intern" chips | No | No | Requested. |
| virtual link, food, dress code, capacity, cost | Would show on the detail sheet | No (food is only in description text) | No | Requested (P2). |
| organizer (club, department, employer) | Would show "Hosted by ACM" | No | No | Requested. |
| image / logo | Card art, company logos | Initials and color only | No | Requested. |
| recurring series | Would collapse "Homecoming: Noonday Activities" x3 | No | No | Requested (P2). |
| updated_at | Not used yet ("Updated 2 h ago") | No | Yes | Available; we can use it. |

### People (per event)

| Field | Used where | Sample has it? | API? | Notes |
| --- | --- | --- | --- | --- |
| name, title, org | Person rows, avatars, calendar link | Yes | No | |
| employerId | Links a person to a company logo | Yes | No | |
| kind (Recruiter, Alumni, Speaker, Club lead) | Person row badge, ranking | Yes | No | |
| byuConnection ("BYU CS '20") | Talking point "Open with the shared BYU connection" | Yes | No | |
| tags (focus areas) | Matching people to the student, talking points | Yes | No | |
| reason, talkingPoints | Person row | Computed client-side | No | We can keep computing these if we get the fields above. |

### Companies

| Field | Used where | Sample has it? | API? | Notes |
| --- | --- | --- | --- | --- |
| name | Everywhere | Yes | Yes (in events) | |
| industry | Company chips, onboarding | Yes | No | |
| initials, brand color | Logo tile | Yes (hand-made, 27 entries in `src/data/employers.ts`) | No | We added Redo, Neighbor, Waystar and the other live companies by hand. |
| logo URL, website, careers URL | Not built | No | No | Requested. |
| aliases | Not built (the API resolves aliases internally) | No | Internal only | Expose so onboarding can suggest canonical names. |

### Calendar sources

| Field | Used where | Sample has it? | API? | Notes |
| --- | --- | --- | --- | --- |
| id, name, description | Connect page | Yes (5 sources) | Partly (`source` value only) | |
| eventCount | Connect page ("64 events") | Yes (hard-coded) | No | Requested via `GET /sources`. |
| last synced | Not built | No | No | Requested. |

The personal class schedule (`src/data/schedule.ts`) comes from the student's Google Calendar, not this API. No request there.

---

## 3. Requests, prioritized

Every shape below is a proposal. Rename freely, just tell us. All new fields are optional, so nothing breaks if they are absent.

### P0: for the demo today

**P0-1. Include in-progress events.** Treat `from` as a bound on `end_at` (or on `coalesce(end_at, start_at + 1h)`), not `start_at`.
- Why: today's CS Hackathon (Redo, Neighbor, Waystar) is the best demo event and disappears once it starts.
- Example: `from=2026-10-02T15:00:00-06:00` should still return an event with `start_at 09:00`, `end_at 21:00` that day.

**P0-2. Flag placeholder seed events.**
```ts
interface Event { /* … */ verified: boolean } // false for unconfirmed seed rows
```
- Why: we must not present invented events as real. The UI will show an "Unconfirmed" badge, or hide them.
- Example: `"verified": false` on "Waystar Recruiting Dinner" until it's confirmed; `true` for the CS Hackathon and every `byu_calendar` and `careerlaunch` row.

**P0-3. Clean `companies`.** Return a stable order (matched target companies first, then alphabetical) and drop or alias entries that aren't employers.
- Why: logos, chips, and "Redo, Neighbor and 2 more attending" on the top card.
- Example: `["Redo","Neighbor","Entrata","Podium"]`; `"Duke University Pratt School of Engineering Grad School"` folded into one canonical name, or moved to a separate `programs: string[]`.

### P1: next

**P1-1. People per event** (powers "People to meet", talking points, and the "Meet Megan and 2 more" line on cards).
```ts
interface EventPerson {
  id: string;                    // "per_<hex>", stable across events
  name: string;
  title: string | null;          // "University Recruiter"
  company: string | null;        // canonical company name, matches Event.companies
  kind: 'recruiter' | 'alumni' | 'speaker' | 'club_lead' | 'host';
  byu_connection: string | null; // "BYU CS '20"
  tags: string[];                // lowercase focus areas: ["software engineering", "internships"]
  linkedin_url: string | null;   // only if public on the listing
  source: 'listing' | 'employer_submitted' | 'manual';
}
interface Event { /* … */ people: EventPerson[] }   // empty array when unknown
```
Example:
```json
"people": [
  { "id": "per_91ab", "name": "Ashley Nguyen", "title": "Campus Recruiting Lead", "company": "Qualtrics",
    "kind": "recruiter", "byu_connection": null, "tags": ["internships", "product"], "linkedin_url": null, "source": "listing" }
]
```
Only people named publicly on a listing, or submitted by the employer. No scraping of LinkedIn or Handshake. Optionally rank them in `Recommendation.matched_people: { person_id: string; reason: string }[]`.

**P1-2. Registration and RSVP.**
```ts
interface Event { /* … */ registration_url: string | null; rsvp_required: boolean | null; registration_deadline: string | null /* ISO */ }
```
- Why: the main call to action beside "Add to Google Calendar". `source_url` points at a listing, not a sign-up.

**P1-3. Fetch events by id.** `GET /events/:id` and `GET /events?ids=evt_a,evt_b` returning `Event[]`.
- Why: "My plan" stores event ids. If a saved event drops out of the ranked feed (window or `relevant_only`), it disappears from the plan. Also needed for shareable event links.

**P1-4. Companies directory.** `GET /companies` returning:
```ts
interface Company {
  name: string;            // canonical, matches Event.companies
  aliases: string[];       // ["Redo Tech"]
  kind: 'employer' | 'grad_program' | 'campus_org';
  industry: string | null; // "Software"
  website: string | null;
  careers_url: string | null;
  logo_url: string | null;
  brand_color: string | null; // "#E5484D"
  upcoming_event_count: number;
}
```
- Why: real logos instead of initials; the onboarding company picker can suggest canonical names, so `target_companies` matches more often.

**P1-5. Match score as a percent.** Add `percent: number` (0 to 100) to `Recommendation`, or document the maximum score.
- Why: we currently show `round(score * 3)`, a guess. Optional `breakdown: { companies: number; fields: number; type: number; recency: number }` helps us explain a score.

**P1-6. Audience and hiring fields.**
```ts
interface Event { /* … */
  audience: { majors: string[]; class_years: ('freshman'|'sophomore'|'junior'|'senior'|'graduate')[]; employment_types: ('internship'|'full_time')[] } | null;
  roles_hiring: string[];  // ["software engineer intern", "product manager"]
}
```
- Why: "Hiring SWE interns" chips, filters, and better ranking. The profile already has `lookingFor.employmentType`, `education.major` and grad year, and we now send them (see P1-7).
- Example: `"audience": { "majors": ["computer science","information systems"], "class_years": ["junior","senior"], "employment_types": ["internship"] }`.

**P1-7. Use more of the profile in scoring.** We now send `target_roles` (role types plus "internship" or "full-time"), `fields` (industries split into words, the major, and top skills), and `grad_date` (`"2027"` or `"2027-04"`). We no longer send `user_id` (it would be the student's email). Please accept and score:
```ts
{ majors?: string[]; class_year?: string; employment_type?: 'internship' | 'full_time'; exclude_event_ids?: string[]; types?: string[]; limit?: number }
```

### P2: later

**P2-1. More sources** (in rough priority order):
- CS department calendar (`cs_dept`, planned, needs the LLM key).
- Career-fair employer lists with booth numbers and roles hiring (feeds P1-6 and companies).
- BYUSA club calendars (`byusa`) and club sites, plus organizer metadata.
- College and department calendars (Marriott, Engineering, Physical and Mathematical Sciences).
- Handshake: manual entry or CSV export only, no scraping.

**P2-2. Sources endpoint.** `GET /sources` returns `{ id: Source; name: string; description: string; status: 'live'|'seed'|'planned'; event_count: number; last_ingested_at: string | null }[]`.
- Why: the Connect page shows hard-coded event counts per calendar today.

**P2-3. Logistics and presentation fields.**
```ts
interface Event { /* … */
  organizer: { name: string; kind: 'club'|'department'|'employer'|'career_center'; url: string | null } | null;
  is_virtual: boolean; virtual_url: string | null;
  food: string | null;        // "Pizza", or null if unknown
  dress_code: string | null;  // "Business casual"
  capacity: number | null; cost: string | null;  // "Free"
  image_url: string | null;
  series_id: string | null;   // groups recurring events like "Homecoming: Noonday Activities"
}
```

**P2-4. Data freshness on `/health`.** Add `{ ok: true, last_ingest_at: string, event_count: number }`, so we can show "Updated 2 h ago" and spot a stale ingest.

**P2-5. Better `type` and `fields` classification.** 44% of events are `other`, and keyword tagging misfires ("Amazing Race FHE" tagged `product`). A small LLM pass during ingest would fix both.

---

## Front-end changes already made (no API change needed)

- `relevant_only: true`, results kept in API order, one request per page load or ranking-relevant profile change, error state with Retry.
- `reason` is the headline on every card, detail sheet and the Profile card.
- Matched companies are sorted first on the client (works around P0-3).
- "People to meet" is hidden when there's no data, and the top card shows attending companies instead.
- `source_url` is shown as "View original listing" and added to the Google Calendar event.
