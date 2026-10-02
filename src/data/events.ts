import type { CampusEvent } from '../types/event';

// dayOffset is relative to today so the feed always feels current.
export const events: CampusEvent[] = [
{
  id: 'e1', title: 'Adobe Product Design Info Session', type: 'Info session', sourceId: 'byu-careers',
  dayOffset: 2, startTime: '17:00', durationMin: 60, location: 'Tanner Building 260',
  description: 'Adobe’s design team walks through how they ship features across Creative Cloud, then opens the floor for portfolio questions. Internship applications for next summer are open.',
  tags: ['UX', 'Figma', 'Product design', 'UX research', 'Internships'], industries: ['Product & Design', 'Software'],
  employerIds: ['adobe'], attendeeIds: ['p1', 'p2', 'p3']
},
{
  id: 'e2', title: 'Fall Career & Internship Fair', type: 'Career fair', sourceId: 'byu-careers',
  dayOffset: 5, startTime: '10:00', durationMin: 300, location: 'Wilkinson Student Center Ballroom',
  description: 'BYU’s largest recruiting event of the semester, with 140+ employers hiring for internships and full-time roles. Bring printed resumes and check the employer map beforehand.',
  tags: ['Internships', 'Software engineering', 'Product management', 'Consulting', 'Data'], industries: ['Software', 'Consulting', 'Data & Analytics', 'Product & Design'],
  employerIds: ['adobe', 'qualtrics', 'domo', 'microsoft', 'deloitte', 'lucid', 'podium', 'northrop', 'entrata', 'instructure'],
  attendeeIds: ['p2', 'p5', 'p9', 'p11', 'p15', 'p22', 'p16', 'p20']
},
{
  id: 'e3', title: 'Qualtrics XM Product Night', type: 'Info session', sourceId: 'byu-careers',
  dayOffset: 3, startTime: '18:00', durationMin: 90, location: 'Tanner Building W112',
  description: 'Qualtrics PMs and designers demo the newest XM features and share what they look for in associate product managers. Pizza provided.',
  tags: ['Product management', 'SaaS', 'Data', 'UX'], industries: ['Software', 'Product & Design'],
  employerIds: ['qualtrics'], attendeeIds: ['p4', 'p5', 'p24']
},
{
  id: 'e4', title: 'Product Management Club: Breaking into PM', type: 'Club', sourceId: 'byu-clubs',
  dayOffset: 1, startTime: '19:00', durationMin: 60, location: 'Tanner Building 151',
  description: 'A practical panel on landing a first PM internship, from resume framing to product-sense interviews. Open to all majors.',
  tags: ['Product management', 'Internships', 'Networking'], industries: ['Product & Design', 'Software'],
  employerIds: ['qualtrics', 'lucid'], attendeeIds: ['p26', 'p4', 'p14']
},
{
  id: 'e5', title: 'Deloitte Case Interview Workshop', type: 'Workshop', sourceId: 'byu-careers',
  dayOffset: 4, startTime: '12:00', durationMin: 60, location: 'Tanner Building 270',
  description: 'Practice a live case with Deloitte consultants and get feedback on structure and communication.',
  tags: ['Consulting', 'Case interviews', 'Strategy'], industries: ['Consulting'],
  employerIds: ['deloitte'], attendeeIds: ['p8', 'p9']
},
{
  id: 'e6', title: 'AIS Tech Talk: Data Engineering at Domo', type: 'Talk', sourceId: 'byu-departments',
  dayOffset: 6, startTime: '11:00', durationMin: 50, location: 'Tanner Building 140',
  description: 'Domo’s product and data leaders on building pipelines that power real-time dashboards for 2,000+ companies.',
  tags: ['Data', 'SQL', 'Python', 'Analytics'], industries: ['Data & Analytics', 'Software'],
  employerIds: ['domo'], attendeeIds: ['p6', 'p7', 'p25']
},
{
  id: 'e7', title: 'Women in Business Networking Night', type: 'Networking', sourceId: 'byu-clubs',
  dayOffset: 8, startTime: '18:30', durationMin: 120, location: 'Wilkinson Student Center 3220',
  description: 'Speed-networking rounds with recruiters and alumni across finance, consulting, and consumer brands. All students welcome.',
  tags: ['Networking', 'Finance', 'Consulting', 'Marketing'], industries: ['Finance', 'Consulting', 'Consumer goods'],
  employerIds: ['goldman', 'nuskin', 'deloitte'], attendeeIds: ['p12', 'p17', 'p9']
},
{
  id: 'e8', title: 'Microsoft Software Engineering Info Session', type: 'Info session', sourceId: 'byu-careers',
  dayOffset: 9, startTime: '16:00', durationMin: 75, location: 'Talmage Building 1170',
  description: 'Engineers from Azure and Microsoft 365 explain the Explore and SWE internship programs and walk through a sample coding interview.',
  tags: ['Software engineering', 'Internships', 'Cloud', 'TypeScript'], industries: ['Software'],
  employerIds: ['microsoft'], attendeeIds: ['p10', 'p11']
},
{
  id: 'e9', title: 'Finance Society: Goldman Sachs Panel', type: 'Club', sourceId: 'byu-clubs',
  dayOffset: 10, startTime: '17:30', durationMin: 60, location: 'Tanner Building 260',
  description: 'Recent BYU grads at Goldman share what the first year in investment banking really looks like.',
  tags: ['Finance', 'Investment banking', 'Excel'], industries: ['Finance'],
  employerIds: ['goldman'], attendeeIds: ['p12']
},
{
  id: 'e10', title: 'BYU Design Week: Portfolio Reviews', type: 'Workshop', sourceId: 'byu-departments',
  dayOffset: 7, startTime: '14:00', durationMin: 180, location: 'Harris Fine Arts Center B-Wing',
  description: 'Sign up for 15-minute portfolio reviews with working product designers. Bring a laptop with two case studies ready.',
  tags: ['Product design', 'UX', 'Figma', 'Design systems'], industries: ['Product & Design'],
  employerIds: ['adobe', 'instructure', 'lucid'], attendeeIds: ['p1', 'p20', 'p15']
},
{
  id: 'e11', title: 'Pluralsight Engineering Coffee Chat', type: 'Info session', sourceId: 'byu-careers',
  dayOffset: 11, startTime: '09:00', durationMin: 60, location: 'Wilkinson Student Center Garden Court',
  description: 'Small-group coffee with Pluralsight engineering managers. Ten seats, first come first served.',
  tags: ['Software engineering', 'React', 'Mentorship'], industries: ['Software'],
  employerIds: ['pluralsight'], attendeeIds: ['p13']
},
{
  id: 'e12', title: 'Founder Fireside with Lucid’s CTO', type: 'Talk', sourceId: 'byu-departments',
  dayOffset: 12, startTime: '11:00', durationMin: 60, location: 'Tanner Building, Hawes Auditorium',
  description: 'Rollins Center for Entrepreneurship hosts Chris Morales on growing Lucid from a BYU side project to a 1,000-person company.',
  tags: ['Entrepreneurship', 'Product management', 'SaaS'], industries: ['Software', 'Product & Design'],
  employerIds: ['lucid'], attendeeIds: ['p14', 'p15']
},
{
  id: 'e13', title: 'Northrop Grumman Engineering Meet & Greet', type: 'Info session', sourceId: 'byu-careers',
  dayOffset: 13, startTime: '16:30', durationMin: 90, location: 'Eyring Science Center C215',
  description: 'Meet engineers from Northrop’s Roy, Utah site and learn about roles in systems, software, and test engineering.',
  tags: ['Systems engineering', 'Aerospace', 'Software engineering'], industries: ['Aerospace & Defense'],
  employerIds: ['northrop'], attendeeIds: ['p16']
},
{
  id: 'e14', title: 'Marketing Society: Brand Strategy at Nu Skin', type: 'Club', sourceId: 'byu-clubs',
  dayOffset: 14, startTime: '19:00', durationMin: 60, location: 'Tanner Building 151',
  description: 'Nu Skin’s brand team breaks down a global product launch from research to campaign.',
  tags: ['Marketing', 'Brand strategy'], industries: ['Marketing', 'Consumer goods'],
  employerIds: ['nuskin'], attendeeIds: ['p17']
},
{
  id: 'e15', title: 'Resume Review Drop-ins', type: 'Workshop', sourceId: 'byu-careers',
  dayOffset: 2, startTime: '13:00', durationMin: 120, location: 'Tanner Building 410, Business Career Center',
  description: 'Walk in for a 10-minute resume review with a career mentor before fair week.',
  tags: ['Internships'], industries: [],
  employerIds: [], attendeeIds: []
},
{
  id: 'e16', title: 'Bain & Company Consulting Info Session', type: 'Info session', sourceId: 'byu-careers',
  dayOffset: 15, startTime: '18:00', durationMin: 90, location: 'Tanner Building 260',
  description: 'Bain consultants share what associate consultants work on and how the recruiting timeline works.',
  tags: ['Consulting', 'Strategy', 'Case interviews'], industries: ['Consulting'],
  employerIds: ['bain'], attendeeIds: ['p18']
},
{
  id: 'e17', title: 'Data Science Club: ML in Production at Ancestry', type: 'Club', sourceId: 'byu-clubs',
  dayOffset: 16, startTime: '19:00', durationMin: 60, location: 'Talmage Building 1170',
  description: 'How Ancestry ships machine learning models that match billions of historical records.',
  tags: ['Machine learning', 'Python', 'Data'], industries: ['Data & Analytics'],
  employerIds: ['ancestry', 'domo'], attendeeIds: ['p19', 'p7']
},
{
  id: 'e18', title: 'Instructure EdTech Product Tour', type: 'Info session', sourceId: 'byu-careers',
  dayOffset: 17, startTime: '12:00', durationMin: 60, location: 'Tanner Building W112',
  description: 'See how the team behind Canvas designs for millions of students and teachers, with a look at their summer internship.',
  tags: ['Product design', 'UX', 'EdTech', 'Product management'], industries: ['Software', 'Product & Design'],
  employerIds: ['instructure'], attendeeIds: ['p20']
},
{
  id: 'e19', title: 'BYU Hackathon Kickoff, sponsored by Podium', type: 'Club', sourceId: 'byu-clubs',
  dayOffset: 19, startTime: '17:00', durationMin: 180, location: 'Engineering Building, 1st floor',
  description: '24-hour hackathon kickoff with mentor tables from Podium, Pluralsight, and Microsoft. Teams of up to four.',
  tags: ['Software engineering', 'Hackathons', 'APIs', 'React'], industries: ['Software'],
  employerIds: ['podium', 'pluralsight', 'microsoft'], attendeeIds: ['p21', 'p13', 'p10']
},
{
  id: 'e20', title: 'Entrata Sales & Customer Success Night', type: 'Info session', sourceId: 'byu-careers',
  dayOffset: 20, startTime: '18:00', durationMin: 60, location: 'Wilkinson Student Center 3228',
  description: 'Learn about Entrata’s rotational program in sales and customer success.',
  tags: ['Sales', 'Customer success'], industries: ['Software'],
  employerIds: ['entrata'], attendeeIds: ['p22']
},
{
  id: 'e21', title: 'Vivint Smart Home Engineering Lunch', type: 'Info session', sourceId: 'byu-careers',
  dayOffset: 22, startTime: '12:00', durationMin: 60, location: 'Clyde Building 260',
  description: 'Lunch and a hardware teardown with Vivint’s firmware and IoT engineers.',
  tags: ['Embedded', 'IoT', 'Software engineering'], industries: ['Consumer goods', 'Software'],
  employerIds: ['vivint'], attendeeIds: ['p23']
},
{
  id: 'e22', title: 'Silicon Slopes Alumni Panel', type: 'Talk', sourceId: 'byu-departments',
  dayOffset: 23, startTime: '17:00', durationMin: 90, location: 'Tanner Building, Hawes Auditorium',
  description: 'Product and engineering leaders from Utah’s biggest tech companies on careers in Silicon Slopes. Reception follows.',
  tags: ['Product management', 'SaaS', 'Software engineering', 'Data'], industries: ['Software', 'Product & Design', 'Data & Analytics'],
  employerIds: ['qualtrics', 'domo', 'lucid', 'podium'], attendeeIds: ['p24', 'p6', 'p14', 'p21']
},
{
  id: 'e23', title: 'Cougar Football Career Tailgate', type: 'Networking', sourceId: 'byu-athletics',
  dayOffset: 18, startTime: '15:00', durationMin: 120, location: 'LaVell Edwards Stadium, South Plaza',
  description: 'The Alumni Association’s pregame tailgate with sponsoring employers. Free food for students with ID.',
  tags: ['Networking', 'Software engineering', 'Finance'], industries: ['Software', 'Finance', 'Consumer goods'],
  employerIds: ['microsoft', 'goldman', 'vivint'], attendeeIds: ['p10', 'p12', 'p23']
},
{
  id: 'e24', title: 'Basketball Alumni Networking Mixer', type: 'Networking', sourceId: 'byu-athletics',
  dayOffset: 25, startTime: '18:00', durationMin: 90, location: 'Marriott Center, Club Level',
  description: 'Pregame mixer with alumni from consulting and design firms before tip-off.',
  tags: ['Networking', 'Consulting', 'Product design'], industries: ['Consulting', 'Product & Design'],
  employerIds: ['deloitte', 'bain', 'adobe'], attendeeIds: ['p8', 'p18', 'p1']
},
{
  id: 'e25', title: 'UX Club: Research Methods Workshop', type: 'Club', sourceId: 'byu-clubs',
  dayOffset: 26, startTime: '19:00', durationMin: 60, location: 'Tanner Building 151',
  description: 'Hands-on session on running usability tests and synthesizing interviews, led by an Adobe researcher.',
  tags: ['UX research', 'Usability testing', 'UX'], industries: ['Product & Design'],
  employerIds: ['adobe'], attendeeIds: ['p27', 'p3']
}];