/*
 * Doorway sample data.
 *
 * EVERYTHING in this file is made-up SAMPLE data for the prototype:
 * the events, the schedules, the company attendance, and the demo student.
 * Nothing here is a real listing, a real person, or a real contact.
 * The live event feed replaces this through js/api.js (see getEvents).
 *
 * Dates are ISO 8601 local time, spread over the three weeks from Fri Oct 2, 2026.
 */
(function (root) {
  'use strict';
  var D = (root.Doorway = root.Doorway || {});

  // "Today" for the sample dataset (the first event happens on this day).
  D.SAMPLE_TODAY = '2026-10-02T08:00:00';
  // If the real clock is inside this window we use it, otherwise we pretend it is SAMPLE_TODAY.
  D.SAMPLE_WINDOW = { from: '2026-10-02T00:00:00', to: '2026-10-23T23:59:59' };

  // Placeholder calendar subscription link (no real feed exists yet).
  D.CALENDAR_FEED_PLACEHOLDER = 'https://doorway.example/calendar/your-feed.ics';

  D.sampleEvents = [
    {
      id: 'fall-hackathon-2026',
      sample: true,
      title: 'Fall Hackathon: Improve the Job Hunt',
      type: 'hackathon',
      start: '2026-10-02T09:00:00',
      end: '2026-10-02T16:00:00',
      location: 'Talmage Building (TMCB), Room 1170',
      blurb: 'A one-day build sprint. Teams of up to four ship a working demo by 4 PM while sponsor engineers walk the room, give feedback and judge.',
      companies: ['Neighbor', 'Redo', 'Waystar'],
      roles: ['software-engineer', 'product', 'data', 'design'],
      startupFriendly: true,
      talkTo: [
        'The Neighbor engineering manager (they also want to meet product people)',
        'Redo engineers who walk the room during build time',
        'The Waystar recruiter or engineering lead at the sponsor table',
        'Other teams: your next referral may be sitting at the next table'
      ],
      questions: [
        'What is your team working on right now, and what is the hardest part?',
        'What does a strong new grad do in their first 90 days on your team?',
        'How do you decide who to bring in for a full-time interview?'
      ],
      pitchTemplate: "Hi, I'm {name}. I'm a CS senior looking for {role} roles. I've been building with {skills}, and I'm here to build something real today. Could I show you our demo and get your feedback?"
    },
    {
      id: 'redo-info-session',
      sample: true,
      title: 'Redo Info Session: Engineering at an Early-Stage Startup',
      type: 'info-session',
      start: '2026-10-05T18:00:00',
      end: '2026-10-05T19:00:00',
      location: 'Wilkinson Student Center, Room 3220',
      blurb: 'An evening Q&A about building software on a small team, what they look for in new grads, and how hiring works. Pizza provided.',
      companies: ['Redo'],
      roles: ['software-engineer', 'product'],
      startupFriendly: true,
      talkTo: [
        'The engineer giving the technical overview',
        'The recruiter or hiring manager running the Q&A',
        'A recent new-grad hire (ask what their first month was like)'
      ],
      questions: [
        'What does a typical week look like for a new engineer on your team?',
        'What kind of projects or experience stand out to you in a new grad?',
        'If I wanted to follow up after tonight, who is the best person to email?'
      ],
      pitchTemplate: "Hi, I'm {name}, a CS senior interested in {role} roles at an early-stage company. I work mostly with {skills}. I'd love to hear what the first six months look like for someone on your team. Could I follow up with you after tonight?"
    },
    {
      id: 'pm-club-meet-a-product-lead',
      sample: true,
      title: 'Product Management Club: Meet a Product Lead',
      type: 'club',
      start: '2026-10-07T18:30:00',
      end: '2026-10-07T19:30:00',
      location: 'Tanner Building, Room 150',
      blurb: 'A fireside chat with a product lead on how PMs and engineers work together, followed by open networking.',
      companies: ['Neighbor'],
      roles: ['product'],
      startupFriendly: true,
      talkTo: [
        'The Neighbor product lead (the featured guest)',
        'The club officers, who know every guest speaker',
        'Upperclassmen who recently landed product or associate PM roles'
      ],
      questions: [
        'How do you work with engineers day to day, and what makes a PM easy to work with?',
        'What is one thing a student could build or write this semester to show product sense?',
        'How did you get your first product role?'
      ],
      pitchTemplate: "Hi, I'm {name}, a CS senior focused on {role} roles and curious about product. I build with {skills}, and I like the part where you decide what is worth building. Could I ask you a few questions about how you got started?"
    },
    {
      id: 'entrepreneurship-lecture-first-ten-hires',
      sample: true,
      title: 'Tech Entrepreneurship Lecture: From Garage to First Ten Hires',
      type: 'lecture',
      start: '2026-10-08T11:00:00',
      end: '2026-10-08T12:15:00',
      location: 'Tanner Building, Auditorium',
      blurb: 'A guest founder explains how an early engineering team gets built, who gets hired first, and what they look for. Open to all majors.',
      companies: [],
      roles: ['software-engineer', 'product'],
      startupFriendly: true,
      talkTo: [
        'The guest founder, right after the lecture',
        'The professor, who often knows who is hiring',
        'Students from other majors who are building startups (future cofounders)'
      ],
      questions: [
        'Who was your first engineering hire, and what made you say yes?',
        'What is the fastest way for a new grad to be useful at a startup this small?',
        'Which skills do you wish more candidates had?'
      ],
      pitchTemplate: "Hi, I'm {name}, a CS senior looking for {role} roles at early-stage companies. I build with {skills}. I enjoyed the part about the first ten hires. Do you have five minutes after class?"
    },
    {
      id: 'waystar-info-session',
      sample: true,
      title: 'Waystar Info Session: Software in Healthcare Payments',
      type: 'info-session',
      start: '2026-10-13T17:30:00',
      end: '2026-10-13T18:30:00',
      location: 'Clyde Building, Room 150',
      blurb: 'Engineers and recruiters explain what they build, how teams are organized, and what their new-grad program looks like.',
      companies: ['Waystar'],
      roles: ['software-engineer', 'data'],
      startupFriendly: false,
      talkTo: [
        'The Waystar university recruiter',
        'A software engineer from the alumni group at the company',
        'The engineering manager presenting the team overview'
      ],
      questions: [
        'What does new-grad onboarding look like for engineers?',
        'How do teams decide what to build next?',
        'What would make a candidate stand out at the career fair tomorrow?'
      ],
      pitchTemplate: "Hi, I'm {name}, a CS senior looking for {role} roles. I work with {skills}. I'll be at the career fair tomorrow, so I'd like to know what to prepare before I stop by your booth."
    },
    {
      id: 'fall-career-fair-2026',
      sample: true,
      title: 'Fall Engineering and Technology Career Fair',
      type: 'career-fair',
      start: '2026-10-14T10:00:00',
      end: '2026-10-14T15:00:00',
      location: 'Wilkinson Student Center, Ballroom',
      blurb: 'Dozens of employers in one room. Bring a one-page resume and a plan: pick five booths and talk to the people, not just the QR codes.',
      companies: ['Neighbor', 'Redo', 'Waystar', 'Lucid', 'Qualtrics', 'Domo'],
      roles: ['software-engineer', 'product', 'data', 'design'],
      startupFriendly: true,
      talkTo: [
        'Recruiters at your target companies first, while you are fresh',
        'The engineers staffing booths: they are who you would work with',
        'Alumni wearing company badges',
        'Early-stage companies, which are often less crowded'
      ],
      questions: [
        'What are you hiring for this year, and what would the first project be?',
        'What do the engineers on your team enjoy most about the work?',
        'What is the best next step if I would like to keep talking after today?'
      ],
      pitchTemplate: "Hi, I'm {name}, a CS senior looking for {role} roles after graduation. I've been building with {skills}. I'd love to hear what your team is working on. Who would be the best person to talk to next?"
    },
    {
      id: 'dev-club-demo-night',
      sample: true,
      title: 'Software Dev Club: Demo Night and Mock Interviews',
      type: 'club',
      start: '2026-10-15T19:00:00',
      end: '2026-10-15T20:30:00',
      location: 'Engineering Building, Room 140',
      blurb: 'Members demo side projects, then pair up for mock technical interviews. A good place to practice your pitch before it matters.',
      companies: ['Lucid'],
      roles: ['software-engineer'],
      startupFriendly: false,
      talkTo: [
        'The Lucid engineer volunteering as a mock interviewer',
        'Club officers, who organize recruiting nights all year',
        'Classmates who just finished internships: ask where they interned and who to meet'
      ],
      questions: [
        'What do you wish you had practiced before your first interview?',
        'How did you find your internship team?',
        'Would you be willing to introduce me to someone at your company?'
      ],
      pitchTemplate: "Hi, I'm {name}, a CS senior working with {skills}. I'm aiming for {role} roles after graduation. Would you be willing to run a mock interview with me or give feedback on my project?"
    },
    {
      id: 'design-dev-weekend-sprint',
      sample: true,
      title: 'Design + Dev Weekend Sprint',
      type: 'hackathon',
      start: '2026-10-17T10:00:00',
      end: '2026-10-17T18:00:00',
      location: 'Harold B. Lee Library, Creative Space',
      blurb: 'Designers and engineers pair up to prototype one product in a day. Sponsors drop by to mentor and look at demos.',
      companies: ['Lucid', 'Domo'],
      roles: ['design', 'product'],
      startupFriendly: true,
      talkTo: [
        'Product designers from the sponsors who mentor teams',
        'The Domo engineering mentor',
        'Designers on other teams: the best engineers know good designers'
      ],
      questions: [
        'How do designers and engineers split the work on your team?',
        'What does a great design handoff look like to you?',
        'What would you build first if you had one week and two people?'
      ],
      pitchTemplate: "Hi, I'm {name}, a CS senior looking for {role} roles. I build with {skills} and I like working closely with designers. Could I show you what we are prototyping and hear what you think?"
    },
    {
      id: 'data-ai-seminar-ml-production',
      sample: true,
      title: 'Data and AI Seminar: Shipping Machine Learning to Production',
      type: 'lecture',
      start: '2026-10-20T15:00:00',
      end: '2026-10-20T16:15:00',
      location: 'Talmage Building (TMCB), Room 2100',
      blurb: 'Two practitioners describe how models get from a notebook to a product, and what breaks along the way.',
      companies: ['Qualtrics', 'Domo'],
      roles: ['data'],
      startupFriendly: false,
      talkTo: [
        'The practitioner from Qualtrics who presents the case study',
        'The Domo data engineer on the panel',
        'The professor who runs the seminar: they know which teams are hiring'
      ],
      questions: [
        'What is the most common reason a model never makes it to production?',
        'What should a new grad learn first: modeling or data pipelines?',
        'How do you evaluate a candidate for a data role?'
      ],
      pitchTemplate: "Hi, I'm {name}, a CS senior curious about {role} work. I've used {skills}. Your story about getting a model into production was helpful. Could I ask how new grads usually get started on your team?"
    },
    {
      id: 'alumni-panel-startups',
      sample: true,
      title: 'Alumni Panel: CS Grads Who Joined Startups',
      type: 'alumni',
      start: '2026-10-22T18:00:00',
      end: '2026-10-22T19:30:00',
      location: 'Wilkinson Student Center, Ballroom',
      blurb: 'Recent alumni talk about choosing a startup over a big company, what the first year was really like, and how they got the interview.',
      companies: ['Neighbor', 'Redo', 'Lucid'],
      roles: ['software-engineer', 'product', 'data', 'design'],
      startupFriendly: true,
      talkTo: [
        'The alumnus from Neighbor, who can say how their team really works',
        'The alumna from Redo who joined as one of the first engineers',
        'Any panelist who graduated within the last two years: they remember the search',
        'The student host, who can introduce you to the panelists'
      ],
      questions: [
        'How did you get your first conversation with the company?',
        'What surprised you most about your first year?',
        'Is there someone on your team I should meet before I apply?'
      ],
      pitchTemplate: "Hi, I'm {name}, a CS senior looking for {role} roles at early-stage companies. I build with {skills}. Your path is close to what I'm hoping for. Could I ask how you got your first conversation with the team?"
    }
  ];

  // Used by "Try the demo". A fictional student: no real person.
  D.demoProfile = {
    demo: true,
    name: 'Jordan Ellis',
    email: 'jordan.ellis@example.com',
    linkedin: '',
    photo: '',
    major: 'Computer science',
    summary: 'Computer science senior looking for full-time software engineer roles at early-stage or growth-stage companies. Builds with React, TypeScript, Python and SQL. Values ownership and learning fast. Hoping to meet Neighbor and Redo.',
    roles: ['software-engineer'],
    lookingFor: ['full-time'],
    companyStyle: ['early-stage', 'growth-stage'],
    targetCompanies: ['Neighbor', 'Redo'],
    values: ['Ownership', 'Learning fast'],
    skills: ['React', 'TypeScript', 'Python', 'SQL', 'AWS'],
    eventTypes: ['hackathon', 'career-fair', 'info-session', 'alumni'],
    resumeFile: 'jordan-ellis-resume.pdf',
    visibleToEmployers: true
  };
})(typeof window !== 'undefined' ? window : globalThis);
