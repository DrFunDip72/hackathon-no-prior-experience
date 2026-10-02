# Doorway

*Find who you need to find.*

Hackathon project for the **Improving the job hunt** challenge. Doorway pulls scattered campus events into one personal plan and tells students who to talk to and what to say, because networking, not applications, is what gets people hired.

- [`docs/brief.md`](docs/brief.md): the problem, the decisions, and why
- [`docs/backlog.md`](docs/backlog.md): what is built and what is next
- [`docs/magic-patterns-prompt.md`](docs/magic-patterns-prompt.md): the full product spec, also used to generate a Magic Patterns version
- [`sample-profile/`](sample-profile/): Jordan Ellis, a fictional BYU CS senior for testing and demos (resume, PDF, LinkedIn mock, JSON)

## Try it

It is a clickable walkthrough with sample data. Accounts and profiles are simulated and stored only in your browser (localStorage); nothing leaves your device.

- **Live:** https://doorway-gray.vercel.app (redeploys on every push to `main`)
- **Locally:** run `npm install`, then `npm run dev`, and open the URL it prints.
- **Production build:** `npm run build` writes the site to `dist/`; `npm run preview` serves it.

| Screen | Path |
| --- | --- |
| Landing | `/` |
| Sign up / log in | `/signup`, `/login` |
| Chat onboarding | `/onboarding` |
| Profile | `/profile` |
| Events | `/events` |
| Connect calendars | `/connect` |

## Code map

Vite, React, TypeScript and Tailwind. The UI was generated with Magic Patterns from [`docs/magic-patterns-prompt.md`](docs/magic-patterns-prompt.md).

| Path | What it does |
| --- | --- |
| `index.html` | Vite entry page |
| `src/App.tsx` | Router and providers |
| `src/pages/` | One file per screen (Landing, Auth, Onboarding, Profile, Events, Connect) |
| `src/components/` | UI grouped by screen: landing, onboarding, profile, events, connect, ui |
| `src/data/` | Sample events, people, employers and the demo resume (all made up) |
| `src/utils/api.ts` | **The simulated back end.** All reads and writes go through here; swap for real endpoints later |
| `src/utils/matching.ts` | Event matching rules and the "why" text |
| `src/utils/profileBuilder.ts` | Builds a profile from the onboarding answers and resume |
| `src/utils/googleCalendar.ts` | Add-to-Google-Calendar links |
| `vercel.json` | Vite build settings and the single-page-app rewrite so deep links work |

## Team workflow

Pushing to `main` redeploys the site on Vercel. Open pull requests for larger changes. Never commit API keys; put them in Vercel environment variables.
