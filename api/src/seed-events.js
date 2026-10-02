// Demo seed data. Only the CS Hackathon is confirmed; the rest are realistic placeholders
// (titles, dates, companies) to be checked against real BYU sources before the demo.
const o = '-06:00';
const at = (date, time) => `2026-${date}T${time}:00${o}`;

export const seedEvents = [
  {
    title: 'CS Hackathon', start: at('10-02', '09:00'), end: at('10-02', '21:00'), location: 'TMCB',
    type: 'hackathon', companies: ['Redo', 'Neighbor', 'Waystar'], fields: ['software engineering', 'product'],
    source: 'cs_dept', source_url: 'https://cs.byu.edu',
    description: 'All-day CS hackathon in the TMCB. Sponsors Redo, Neighbor, and Waystar have reps on site.'
  },
  {
    title: 'Fall Career & Internship Fair', start: at('10-06', '10:00'), end: at('10-06', '15:00'), location: 'Wilkinson Student Center Ballroom',
    type: 'career_fair', companies: ['Adobe', 'Qualtrics', 'Domo', 'Microsoft', 'Lucid', 'Podium', 'Entrata', 'Instructure'], fields: ['software engineering', 'product', 'data'],
    source: 'careerlaunch', source_url: 'https://careerlaunch.byu.edu',
    description: 'Campus-wide career fair with employers hiring for internships and full-time roles.'
  },
  {
    title: 'Qualtrics Product Night', start: at('10-05', '18:00'), end: at('10-05', '19:30'), location: 'Tanner Building W112',
    type: 'info_session', companies: ['Qualtrics'], fields: ['product', 'data'],
    source: 'careerlaunch', source_url: 'https://careerlaunch.byu.edu',
    description: 'Qualtrics PMs and designers demo new features and talk about hiring associate product managers.'
  },
  {
    title: 'Microsoft Software Engineering Info Session', start: at('10-08', '16:00'), end: at('10-08', '17:15'), location: 'Talmage Building 1170',
    type: 'info_session', companies: ['Microsoft'], fields: ['software engineering'],
    source: 'careerlaunch', source_url: 'https://careerlaunch.byu.edu',
    description: 'Azure and Microsoft 365 engineers cover internship programs and a sample coding interview.'
  },
  {
    title: 'Neighbor Engineering Office Hours', start: at('10-07', '12:00'), end: at('10-07', '13:00'), location: 'TMCB Foyer',
    type: 'tabling', companies: ['Neighbor'], fields: ['software engineering'],
    source: 'cs_dept', source_url: 'https://cs.byu.edu',
    description: 'Neighbor engineers tabling in the TMCB foyer to talk about internships.'
  },
  {
    title: 'Domo Data Engineering Tech Talk', start: at('10-09', '11:00'), end: at('10-09', '11:50'), location: 'Tanner Building 140',
    type: 'lecture', companies: ['Domo'], fields: ['data', 'software engineering'],
    source: 'byu_calendar', source_url: 'https://calendar.byu.edu',
    description: 'Domo leaders on building data pipelines behind real-time dashboards.'
  },
  {
    title: 'Waystar Recruiting Dinner', start: at('10-13', '18:00'), end: at('10-13', '20:00'), location: 'Skyroom, Wilkinson Student Center',
    type: 'networking', companies: ['Waystar'], fields: ['software engineering', 'data'],
    source: 'cs_dept', source_url: 'https://cs.byu.edu',
    description: 'Invite-only dinner with Waystar engineers and recruiters for CS and IS seniors.'
  },
  {
    title: 'Redo Founder Fireside Chat', start: at('10-14', '17:00'), end: at('10-14', '18:00'), location: 'Rollins Center, Tanner Building 260',
    type: 'lecture', companies: ['Redo'], fields: ['product', 'software engineering'],
    source: 'rollins', source_url: 'https://marriott.byu.edu/cet',
    description: 'Redo founders talk about building an ecommerce returns product and hiring early engineers.'
  },
  {
    title: 'Lucid Product Management Info Session', start: at('10-12', '17:00'), end: at('10-12', '18:00'), location: 'Tanner Building 151',
    type: 'info_session', companies: ['Lucid'], fields: ['product'],
    source: 'careerlaunch', source_url: 'https://careerlaunch.byu.edu',
    description: 'Lucid product managers discuss the associate PM internship.'
  },
  {
    title: 'Startup Career Fair', start: at('10-15', '11:00'), end: at('10-15', '15:00'), location: 'Wilkinson Student Center',
    type: 'career_fair', companies: ['Redo', 'Neighbor', 'Podium', 'Entrata'], fields: ['software engineering', 'product', 'sales'],
    source: 'rollins', source_url: 'https://marriott.byu.edu/cet',
    description: 'Utah startups recruiting interns and new grads, hosted by the Rollins Center.'
  },
  {
    title: 'Podium Engineering Info Session', start: at('10-16', '17:30'), end: at('10-16', '18:30'), location: 'TMCB 1170',
    type: 'info_session', companies: ['Podium'], fields: ['software engineering'],
    source: 'clubs', source_url: 'https://clubs.byu.edu',
    description: 'Podium engineers on their stack, internships, and the interview process.'
  },
  {
    title: 'Entrata Tabling', start: at('10-19', '10:00'), end: at('10-19', '14:00'), location: 'TMCB Foyer',
    type: 'tabling', companies: ['Entrata'], fields: ['software engineering', 'data'],
    source: 'cs_dept', source_url: 'https://cs.byu.edu',
    description: 'Entrata recruiters tabling for software and data internships.'
  },
  {
    title: 'ACM Club: Interview Prep Night', start: at('10-08', '19:00'), end: at('10-08', '20:30'), location: 'TMCB 1102',
    type: 'club_event', companies: [], fields: ['software engineering'],
    source: 'clubs', source_url: 'https://clubs.byu.edu',
    description: 'Mock technical interviews run by upperclassmen.'
  },
  {
    title: 'Product Management Club: Breaking into PM', start: at('10-06', '19:00'), end: at('10-06', '20:00'), location: 'Tanner Building 151',
    type: 'club_event', companies: [], fields: ['product'],
    source: 'clubs', source_url: 'https://clubs.byu.edu',
    description: 'Panel on landing a first PM internship. Open to all majors.'
  },
  {
    title: 'Instructure Alumni Panel', start: at('10-20', '16:00'), end: at('10-20', '17:00'), location: 'Tanner Building 270',
    type: 'networking', companies: ['Instructure'], fields: ['software engineering', 'product'],
    source: 'careerlaunch', source_url: 'https://careerlaunch.byu.edu',
    description: 'BYU alumni at Instructure share how they got hired and what the team looks for.'
  },
  {
    title: 'Data Science Case Competition', start: at('10-17', '09:00'), end: at('10-17', '17:00'), location: 'Tanner Building W112',
    type: 'case_competition', companies: ['Domo'], fields: ['data'],
    source: 'careerlaunch', source_url: 'https://careerlaunch.byu.edu',
    description: 'Teams analyze a real dataset and present recommendations. Domo judges.'
  },
  {
    title: 'ECE Industry Career Fair', start: at('10-21', '10:00'), end: at('10-21', '14:00'), location: 'Engineering Building Atrium',
    type: 'career_fair', companies: ['Microsoft', 'Adobe'], fields: ['hardware', 'software engineering'],
    source: 'byu_calendar', source_url: 'https://calendar.byu.edu',
    description: 'Electrical and computer engineering career fair.'
  }
];
