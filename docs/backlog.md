# Backlog

Priority: **P0** is the demo. **P1** if time allows. **P2** is future or pitch only. Deadline is 4 PM, October 2, 2026.

## P0: demo path (landing, account, home with events)

- [ ] Generate the front end from `docs/magic-patterns-prompt.md` and commit it
- [ ] Deploy to Vercel with auto-deploy on every push to `main`
- [ ] Landing page, chat onboarding, profile, home, event detail all working with sample data
- [ ] Demo profile ("Try the demo") so judges skip onboarding
- [ ] Add to Google Calendar and .ics download work
- [ ] Pitch deck (see list below)

## P0: data (Will and James)

- [ ] Pull events from the BYU calendar API
- [ ] Scrape club and department sites (cs.byu.edu, PMA, IS and others)
- [ ] Normalize into the `Event` shape in `src/types.ts`
- [ ] Expose as a JSON endpoint and set `VITE_EVENTS_API_URL`
- [ ] Add companies and roles tags (can be AI-assisted)

## P1

- [ ] Real AI in onboarding: send chat to Claude, return a structured profile (use the hackathon API key, never commit it)
- [ ] AI-generated talking points per event, personalized to the profile
- [ ] iCalendar subscription feed so one link keeps a calendar up to date
- [ ] Weekly email digest: "Here is what to go to this week"
- [ ] Post-event nudge: "You went to the hackathon. Add it to your resume?"

## P2

- [ ] Employer side: set role values, search the opted-in student pool, view timelines
- [ ] Pull LinkedIn connections to suggest warm introductions
- [ ] MCP endpoint so a student's own Claude can use Doorway
- [ ] Other schools and majors

## Pitch deck outline

1. The problem: everyone applies, nobody hears back. Networking works, but it is hard to find.
2. The insight: the events exist, but they are fragmented.
3. The product (live demo): chat onboarding, then your week, then who to talk to and what to say.
4. How AI is used (Best Use of AI).
5. Employer preview: opted-in profile with an event timeline.
6. Why now and what is next: BYU first, then other schools. Sold to universities.
