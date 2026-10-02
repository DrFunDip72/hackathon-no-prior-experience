# Sample student: Jordan Ellis

A fictional BYU computer science senior we use to test and demo Doorway. **Everything here is made up**: the person, the contact details, the internship company and the accounts. No real LinkedIn or other account exists for Jordan, and none should be created. The phone number (555-01xx) and email domain (example.com) are reserved for fiction.

| File | Use it for |
| --- | --- |
| [`resume.md`](resume.md) | Reading on GitHub, and pasting into the onboarding chat |
| [`jordan-ellis-resume.pdf`](jordan-ellis-resume.pdf) | Testing "Upload resume", and showing a real-looking resume in the pitch |
| [`linkedin.md`](linkedin.md) | What Jordan's LinkedIn profile would contain |
| [`profile.json`](profile.json) | Structured data: the exact profile the app stores, plus resume and LinkedIn details |

## Who Jordan is

- CS senior at BYU, graduating April 2027
- Wants a full-time software engineering role at an early-stage or growth-stage startup
- Strongest skills: React, TypeScript, Python, SQL and AWS
- Values ownership and learning fast
- Has Neighbor and Redo on their company list
- Summer 2026 software engineering intern, CS 240 teaching assistant, fluent in Spanish

## How to use it

- **In the app:** "Try the demo" on the landing page loads Jordan. It is the same data as `profile.json` → `profile`.
- **Onboarding test:** copy all of `resume.md`, paste it into the first chat question, and press Ctrl + Enter. Doorway should pick up Jordan's name, email, LinkedIn link and skills.
- **Data team:** `profile.json` → `profile` is exactly the shape `js/api.js` saves, so it works as a test fixture for matching. The `education`, `experience`, `projects` and `linkedin` sections are the richer data a future AI parser or employer view would use.

`jordan-ellis-resume.pdf` is generated from `resume.md`. If you change one, regenerate the other.
