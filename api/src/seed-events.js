// Demo seed data. Real events now come from the ingests (BYU calendar, career-services sheet, CS department),
// so only curated facts the sources lack live here: the hackathon's sponsors. Upserts union companies/fields,
// so these merge into the ingested rows instead of replacing them.
export const seedEvents = [
  {
    // Same event as the career-services sheet's "Homecoming Hackathon" (same title/date/location, so they dedupe).
    title: "Homecoming Hackathon", start: "2026-10-02T08:00:00-06:00", end: "2026-10-02T20:00:00-06:00", location: "ESC Annex",
    type: 'hackathon', companies: ["Redo","Neighbor","Waystar"], fields: ["software engineering","product"],
    source: 'cs_dept', source_url: 'https://cs.byu.edu/homecoming-hackathon-2026-10-02',
    description: "All-day CS Department hackathon. Sponsors Redo, Neighbor, and Waystar have reps on site."
  }
];

// Retired seed rows (earlier renames and fake placeholder events); seed.js deletes them so they don't linger.
export const retiredEvents = [
  {
    "title": "CS Hackathon",
    "start": "2026-10-02T09:00:00-06:00",
    "location": "TMCB"
  },
  {
    "title": "Fall Career & Internship Fair",
    "start": "2026-10-06T10:00:00-06:00",
    "location": "Wilkinson Student Center Ballroom"
  },
  {
    "title": "Qualtrics Product Night",
    "start": "2026-10-05T18:00:00-06:00",
    "location": "Tanner Building W112"
  },
  {
    "title": "Microsoft Software Engineering Info Session",
    "start": "2026-10-08T16:00:00-06:00",
    "location": "Talmage Building 1170"
  },
  {
    "title": "Neighbor Engineering Office Hours",
    "start": "2026-10-07T12:00:00-06:00",
    "location": "TMCB Foyer"
  },
  {
    "title": "Domo Data Engineering Tech Talk",
    "start": "2026-10-09T11:00:00-06:00",
    "location": "Tanner Building 140"
  },
  {
    "title": "Waystar Recruiting Dinner",
    "start": "2026-10-13T18:00:00-06:00",
    "location": "Skyroom, Wilkinson Student Center"
  },
  {
    "title": "Redo Founder Fireside Chat",
    "start": "2026-10-14T17:00:00-06:00",
    "location": "Rollins Center, Tanner Building 260"
  },
  {
    "title": "Lucid Product Management Info Session",
    "start": "2026-10-12T17:00:00-06:00",
    "location": "Tanner Building 151"
  },
  {
    "title": "Startup Career Fair",
    "start": "2026-10-15T11:00:00-06:00",
    "location": "Wilkinson Student Center"
  },
  {
    "title": "Podium Engineering Info Session",
    "start": "2026-10-16T17:30:00-06:00",
    "location": "TMCB 1170"
  },
  {
    "title": "Entrata Tabling",
    "start": "2026-10-19T10:00:00-06:00",
    "location": "TMCB Foyer"
  },
  {
    "title": "ACM Club: Interview Prep Night",
    "start": "2026-10-08T19:00:00-06:00",
    "location": "TMCB 1102"
  },
  {
    "title": "Product Management Club: Breaking into PM",
    "start": "2026-10-06T19:00:00-06:00",
    "location": "Tanner Building 151"
  },
  {
    "title": "Instructure Alumni Panel",
    "start": "2026-10-20T16:00:00-06:00",
    "location": "Tanner Building 270"
  },
  {
    "title": "Data Science Case Competition",
    "start": "2026-10-17T09:00:00-06:00",
    "location": "Tanner Building W112"
  },
  {
    "title": "ECE Industry Career Fair",
    "start": "2026-10-21T10:00:00-06:00",
    "location": "Engineering Building Atrium"
  }
];
