# Doorway

*Find who you need to find.*

Hackathon project for the **Improving the job hunt** challenge. Doorway pulls scattered campus events into one personal plan and tells students who to talk to and what to say, because networking, not applications, is what gets people hired.

- [`docs/brief.md`](docs/brief.md): the problem, the decisions, and why
- [`docs/backlog.md`](docs/backlog.md): what is built and what is next
- [`docs/magic-patterns-prompt.md`](docs/magic-patterns-prompt.md): the full product spec, also used to generate a Magic Patterns version

## Try it

It is a clickable walkthrough with sample data. There is no sign-in, and nothing leaves your browser.

- **Locally:** double-click `index.html`, or run `python -m http.server` in this folder and open http://localhost:8000.
- **Fastest path:** click **Try the demo** on the landing page to load a sample student, then explore **Your week**.

| Screen | URL |
| --- | --- |
| Landing | `#/` |
| Chat onboarding | `#/onboarding` |
| Profile | `#/profile` |
| Your week | `#/home` |
| Event detail | `#/events/<id>` |
| Employer preview (phase two) | `#/employers/preview` |

## Code map

Plain HTML, CSS and JavaScript. No build step and no dependencies.

| File | What it does |
| --- | --- |
| `index.html` | Page shell; loads the scripts in order |
| `css/style.css` | All styles, with light and dark mode |
| `js/data.js` | Sample events and the demo student (all made up) |
| `js/api.js` | **The data layer.** All reads and writes go through here |
| `js/match.js` | Event matching rules and the "why" text |
| `js/profile.js` | Labels, resume parsing, role inference, summary and pitch writing |
| `js/ics.js` | Calendar files and Google Calendar links |
| `js/ui.js` | DOM builder (text-safe), dates, toast, dialog, clipboard |
| `js/app.js` | Router and all screens |

### Plugging in the real events feed

Set `window.DOORWAY_EVENTS_API_URL` before the scripts load (there is a commented line in `index.html`). The endpoint returns a JSON array of events in the shape documented in `js/data.js`. If it fails, the app offers to fall back to the sample events.

## Team workflow

Pushing to `main` redeploys the site on Vercel. Open pull requests for larger changes. Never commit API keys; put them in Vercel environment variables.
