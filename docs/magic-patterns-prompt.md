# Magic Patterns build prompt

Paste everything below the line into Magic Patterns. The product name "Doorway" is a working title and is easy to change.

---

Build a complete, polished, mobile-first web app called **Doorway**. Use React, TypeScript, Tailwind CSS and React Router, in a standard Vite project structure so it deploys cleanly to Vercel. No backend: all data comes through one small data layer described below.

## What it is

Doorway helps college seniors land jobs through networking, which is how most people really get hired. The events that matter (career fairs, hackathons, club meetings, info sessions, lecture series, alumni panels) are scattered across dozens of university websites, so students miss them. Doorway pulls them into one place, filters them to the student's goals, and for each event says exactly **who to talk to and what to say**. It also builds the student's profile from a quick chat instead of a long form.

The first audience is **BYU computer science seniors** looking for full-time software or product roles. Keep the code general so other schools and majors can be added later.

It is **not** a job board and has no job applications. The line the whole product runs on: *"Find who you need to find."*

## Design

- Calm, friendly, confident. Light and dark mode that follow the system setting. Deep blue accent, generous white space, rounded cards, clear type hierarchy.
- Mobile-first. Students use this on their phones at 11 PM with 20 spare minutes, so every flow must work one-handed on a 375px screen. Desktop is a centered column up to about 880px wide.
- Absurdly simple. No walls of form fields. One thing per screen. Large tap targets. Accessible: visible focus rings, sufficient contrast, labelled controls.
- Do not copy any existing brand (BYU, Handshake, LinkedIn).

## Screens and routes

### 1. Landing page (`/`)
- Headline: **Find who you need to find.**
- Subhead: one sentence saying Doorway turns scattered campus events into a personal plan, with who to talk to and what to say.
- Two buttons: **Get started** (goes to `/onboarding`) and **Try the demo** (loads a pre-filled demo profile and goes to `/home`).
- Three-step "how it works" cards: 1 Tell us about you (chat, no forms). 2 See where to be this week. 3 Walk in knowing who to talk to and what to say.
- A short "Why not just apply?" section: everyone applies to hundreds of jobs and almost nobody hears back; referrals and conversations are what work.
- Footer note: "Built at a hackathon."

### 2. Chat onboarding (`/onboarding`)
A single chat screen with a progress bar at the top and a composer fixed at the bottom. The assistant is friendly and brief and asks **one question at a time**. Quick-reply chips sit above the text box; multi-select questions have a **Continue** button. Every question can be skipped.

Question sequence:
1. "Paste your resume or LinkedIn link, or just tell me about yourself. You can skip this and answer questions instead." (large textarea, a **Skip** button, and an **Upload resume** button that accepts PDF or DOCX and reads only the file name for now.) Parse the pasted text for a name, email, LinkedIn URL and a list of known skills (JavaScript, TypeScript, Python, React, SQL, Java, C#, AWS, Figma and similar).
2. "What kind of role are you after?" Chips: Software engineer, Product manager, Data / analytics, Design, Not sure yet. If "Not sure yet", ask "What do you enjoy working on?" with a text box, and infer a role from keywords.
3. "What are you looking for?" Chips: Full-time after graduation, Internship, Part-time.
4. "What kind of company sounds right?" Chips: Early-stage startup, Growth-stage company, Big established company, Show me all.
5. "Any companies on your list?" Text input (comma separated) plus suggestion chips: Neighbor, Redo, Waystar, Lucid.
6. "What matters most in a team?" Multi-select chips: Ownership, Learning fast, Mission, Work-life balance, Pay, Collaboration.
7. "Want employers to be able to find your profile?" Chips: Yes, Not yet. Add a one-line explanation that they can change this any time.

After the last answer show a short "Building your profile…" state (about 1.5 seconds), then go straight to `/profile?welcome=1`.

**There is no sign-in, no account creation and no authentication anywhere in this app.** This is a clickable walkthrough: nothing leaves the browser, and the chat answers are saved only in `localStorage` so the next screens can show them. Do not add Google, email or password buttons.

Show a gentle success message on `/profile?welcome=1`: "That was it. You're set."

### 3. Profile (`/profile`)
- Header with avatar (photo upload, falls back to initials), name, target role, and a short auto-written summary of the student.
- Editable sections, each inline-editable with a save button: Target roles, Looking for (full-time/internship/part-time), Company preference, Companies on my list, What I value, Skills, Links (LinkedIn, resume file name).
- A clearly worded **"Let employers find my profile"** toggle with the explanation: "When on, employers can see your profile and the events you attend. You can turn this off any time."
- A **Delete my data** link that clears everything after a confirm dialog.
- Everything persists to `localStorage` through the data layer.

### 4. Home, "Your week" (`/home`)
This is the heart of the product.
- Greeting with the student's first name and a one-line summary of their focus.
- A **Subscribe to my calendar** card with a copyable link and short instructions for Google Calendar and Apple Calendar. The link can be a placeholder URL for now.
- Filter chips: All, Career fairs, Hackathons, Clubs, Info sessions, Lectures. Plus a toggle **"Only my companies"**.
- A list of event cards sorted by date, then by match. Each card shows: title, date and time, location, type tag, company chips (highlight the ones on the student's list), a **match line** such as "Strong match: 3 of your companies will be there" or "Good fit for product roles", and these actions:
  - **I'm going** toggle (adds the event to the student's timeline).
  - **Add to Google Calendar** (builds a Google Calendar template link from the event data).
  - **Download .ics** (generates a valid iCalendar file in the browser).
  - **Who to talk to and what to say** expandable section. It lists 2 to 4 people or roles to look for, 3 good questions to ask, and a ready-to-use elevator pitch that fills in the student's name, role, and one or two of their skills.
- An **Add all to calendar** button that downloads one .ics containing every event the student marked "I'm going".
- A **Your timeline** section below the list: events the student marked as going or attended, newest first, with the line "Employers can see this if your profile is visible."

Matching rules (implement as a plain function in `src/lib/match.ts`, easy to read and change):
- +3 for each company on the student's list that is attending
- +2 if the event's roles include the student's target role
- +1 if the event is tagged as startup friendly and the student prefers early-stage or growth-stage
- +1 for the student's preferred event types
- Score 5 or more is "Strong match", 2 to 4 is "Good fit", below 2 is "Might be worth it".
- The "why" text must be generated from the rules that actually fired.

### 5. Event detail (`/events/:id`)
Full details for one event with the same actions, the full who-to-talk-to and script content, and a back button.

### 6. Employer preview (`/employers/preview`) — "Coming soon" phase two
A static, clearly labelled preview of what an employer would see: a candidate card with the student's summary, skills, values, and the timeline of events attended ("Attended 5 events with your company"), plus a **Reach out** button that does nothing. Banner at the top: "Phase two preview. Not live yet." This exists to support the pitch.

## Data layer (important)

Put **all** data access in `src/lib/api.ts` so a teammate can swap sample data for a real service without touching the UI:

```ts
export async function getEvents(): Promise<Event[]>        // uses VITE_EVENTS_API_URL if set, else sample data
export async function getProfile(): Promise<Profile | null> // localStorage
export async function saveProfile(p: Profile): Promise<void>
export async function setGoing(eventId: string, going: boolean): Promise<void>
export async function getGoing(): Promise<string[]>
```

Types in `src/types.ts`:

```ts
type Event = {
  id: string; title: string;
  type: 'career-fair' | 'hackathon' | 'club' | 'info-session' | 'lecture' | 'alumni';
  start: string; end: string;            // ISO 8601 local time
  location: string; url?: string; blurb: string;
  companies: string[]; roles: string[];  // roles like 'software-engineer', 'product', 'data', 'design'
  startupFriendly: boolean;
  talkTo: string[]; questions: string[]; pitchTemplate: string; // {name} {role} {skills} placeholders
}
type Profile = {
  name: string; email?: string; linkedin?: string; photo?: string; summary: string;
  roles: string[]; lookingFor: string[]; companyStyle: string[];
  targetCompanies: string[]; values: string[]; skills: string[];
  visibleToEmployers: boolean;
}
```

Include a **sample dataset of 10 events** in `src/data/sampleEvents.ts`, dated across the next three weeks from October 2, 2026, with believable titles, locations on a university campus, and complete talk-to, questions, and pitch content. Include these: a hackathon today (October 2, 2026) sponsored by Neighbor, Redo and Waystar; a career fair; a product management club meeting; a tech entrepreneurship lecture; two company info sessions; and an alumni panel. Add a visible, unobtrusive label in the footer: **"Sample data. Live event feed coming soon."**

Also include a **demo profile** used by "Try the demo": a senior studying computer science who wants a full-time software engineer role at an early-stage or growth-stage company, with Neighbor and Redo on their list.

## Quality bar
- Every screen has loading, empty and error states that look intentional.
- No dead buttons: anything not built yet either works with mock behavior or is clearly marked "coming soon".
- Responsive, keyboard accessible, no console errors.
- Clean file structure: `src/pages`, `src/components`, `src/lib`, `src/data`, `src/types.ts`.
- Include a short README explaining how to run it and where to plug in the real events API.
