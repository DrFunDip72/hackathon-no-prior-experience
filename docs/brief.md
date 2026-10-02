# Project brief: Doorway (working title)

Synthesized from the kickoff session and the team's planning conversations on October 2, 2026. Raw recordings are intentionally not in this repo.

## The challenge

> The prompt is: **Improving the job hunt.**

- Deadline: **4 PM today**. Judging is by sponsor and company judges.
- Prize categories (3 places each, 9 winners): **Best Use of AI**, **Most Creative**, **Overall**.
- Teams can request AI API keys with a **$10 to $20** limit. Ask the organizers.
- Sponsors in the room: Neighbor, Redo, Waystar. Neighbor's engineering manager asked to talk to product people too.

## How we landed on the problem

We brainstormed every angle: students, employers, resumes, AI interviews, applications.

| Angle we considered | Why we dropped or deferred it |
| --- | --- |
| Agents that auto-apply to jobs | Everyone is building it. "Everyone's applying, so no one's applying." |
| AI screening interviews | Feels inhuman and is a turnoff for candidates. |
| Visual LinkedIn network graph | Candidates would still hit "sent requests, no response." |
| Resume tailoring | Useful but easy to do already with any AI tool. |
| Employer-side values matching | Strong idea, but deferred. Needs employers on the platform. |

What every one of us had in common:

> Almost every single job I've ever gotten was because of some sort of network.

> I've never gotten a single job from an application.

An outside perspective from a former BYU STEM career services director confirmed it: **networking is the number one job search strategy**, but it feels ambiguous to students. The winning product would simplify it, ideally something a student can do "at 11:00 at night when they have 20 minutes."

## The problem we picked

> You don't know how to find the people you need to find.

The events and people that lead to jobs exist, but the information is **fragmented**. Each college has its own calendar, and clubs have their own separate sites. One teammate did not know this hackathon existed until a friend told them, and that chance conversation is exactly the kind of connection the product should create on purpose.

## The solution

**A single place that shows a student where to be, who to talk to, and what to say.**

1. **Profile via chat.** Paste a resume or LinkedIn link, or just talk. No long forms. "Absurdly simple." Claude turns the conversation into a profile. Always editable.
2. **Events, filtered to you.** A unified calendar of career fairs, hackathons, club meetings, info sessions and lectures, matched to the student's role, companies and preferences. Delivered as a calendar subscription plus add-to-calendar.
3. **Who and how.** For each event: which companies and people to look for, good questions, and an elevator pitch.
4. **Timeline.** Events a student attends form a visible track record, so effort is rewarded. Employers can see it if the student opts in.

### Scope decisions (made by the team)

- **Students first.** Employer features are "book two of the trilogy" and are shown as a preview slide or page.
- **Niche down:** BYU computer science seniors seeking full-time roles. We target the companies in the room (Neighbor, Redo, Waystar) so judges see themselves in the demo.
- **Ring one is BYU only.** Scraping external sources like Handshake and LinkedIn is a later ring.
- **Not a job board and no applications.** Referrals and conversations are the point.
- **Opt-in visibility.** Students choose whether employers can find their profile, like LinkedIn.
- **Cut for now:** resume improvement coaching, AI interviews, per-job resume rewriting.

### Success (definition of done)

- The student finishes and thinks *"I can't believe it was that easy."*
- The profile is editable.
- They feel **confident** they know **which events to attend, when and where they are, who to connect with, and how.**
- For the demo: a landing page, then account creation, then a home page with real-looking events and scripts.

## Differentiation vs. Handshake

Handshake is "a necessary evil": applications disappear, with no response. We drop applications entirely and optimize for the conversation that actually gets someone hired.

## Open questions

- Can we legally and technically scrape club sites and BYU subdomains? What does the BYU calendar API cover?
- Should students be able to contact employers, or only the reverse? (Messaging can get noisy.)
- How do we keep it fair so employers don't all chase the same 20% of students?
- Business model: build it good for free, then sell to universities.

## Roles

| Workstream | Owner |
| --- | --- |
| Data: gather BYU events (calendar API, club sites, subdomains) and expose them as an API | Will and James |
| Profile and UX: chat onboarding, profile, home | Justin and Stetson |
| Prototype race: each builds a first version, compare, merge the best | Justin and Stetson |

## Delivery plan

- Front end generated with Magic Patterns from [`magic-patterns-prompt.md`](./magic-patterns-prompt.md).
- Code lives in this repo and deploys to Vercel on every push.
- The data team's events API replaces the sample data through `src/lib/api.ts` (`VITE_EVENTS_API_URL`).
- AI use (for Best Use of AI): conversational profile building and per-event talking points.
