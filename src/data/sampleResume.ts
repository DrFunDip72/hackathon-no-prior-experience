import type { Profile } from '../types/profile';

export type ResumeData = Omit<
  Profile,
  'name' | 'email' | 'photoUrl' | 'handshakeUrl' | 'linkedinUrl' | 'resumeFileName' | 'resumeDataUrl' | 'visibleToEmployers'>;


// Content returned by the simulated resume parser.
export const sampleResume: ResumeData = {
  headline: 'Information Systems student building data-informed products',
  summary:
  'I like turning messy user problems into shipped features. I’ve run research for BYU’s IT office, shipped onboarding improvements as a product intern at Podium, and automated reporting for the Marriott School.',
  year: 'Junior',
  lookingFor: {
    roleTypes: ['Product management', 'UX design'],
    employmentType: 'Internship',
    startDate: 'Summer 2027',
    locations: ['Lehi, UT', 'Salt Lake City, UT', 'Remote']
  },
  workAuthorization: 'U.S. citizen · no sponsorship needed',
  topSkills: ['Product management', 'UX research', 'Figma', 'SQL', 'Python'],
  experience: [
  {
    id: 'x1',
    title: 'UX Research Assistant',
    org: 'BYU Office of IT',
    start: 'Jan 2026',
    end: 'Present',
    impact: [
    'Ran 18 usability tests on the MyBYU redesign, cutting average task time 32%',
    'Built a Figma component library now used by 4 student designers'],

    skills: ['UX research', 'Figma', 'Usability testing']
  },
  {
    id: 'x2',
    title: 'Product Intern',
    org: 'Podium',
    start: 'May 2026',
    end: 'Aug 2026',
    impact: [
    'Shipped an onboarding checklist that lifted week-one activation 11%',
    'Wrote 20+ specs and ran sprint demos for a 6-person squad'],

    skills: ['Product management', 'SQL', 'Jira']
  },
  {
    id: 'x3',
    title: 'Data Analyst (part-time)',
    org: 'BYU Marriott School',
    start: 'Sep 2024',
    end: 'Dec 2025',
    impact: ['Automated weekly enrollment reports in Python, saving 6 hours a week'],
    skills: ['Python', 'SQL', 'Tableau']
  }],

  projects: [
  {
    id: 'pr1',
    name: 'Cougar Eats',
    description: 'Dining wait-time app used by 1,200 students in its first month. Designed in Figma, built with React Native.',
    skills: ['Product design', 'React']
  },
  {
    id: 'pr2',
    name: 'Capstone: Survey insights dashboard',
    description: 'Turned Qualtrics survey exports into a self-serve dashboard for the BYU Student Wellness Center.',
    skills: ['SQL', 'Data', 'Tableau']
  }],

  education: {
    school: 'Brigham Young University',
    degree: 'B.S.',
    major: 'Information Systems',
    gradYear: '2028',
    gpa: '3.78',
    coursework: ['IS 303 Business Programming', 'IS 455 Machine Learning', 'CS 340 Software Design', 'DESIGN 210 UX Foundations']
  },
  skillGroups: [
  { label: 'Product', skills: ['Product management', 'Roadmapping', 'A/B testing', 'Jira'] },
  { label: 'Design & research', skills: ['UX research', 'Figma', 'Usability testing', 'Prototyping'] },
  { label: 'Technical', skills: ['SQL', 'Python', 'Tableau', 'React'] }],

  interests: {
    industries: ['Product & Design', 'Software'],
    companies: ['Adobe', 'Qualtrics']
  }
};

// A blank profile body: nothing invented, so the student only sees what they actually told us.
export const emptyResume: ResumeData = {
  headline: '',
  summary: '',
  year: '',
  lookingFor: { roleTypes: [], employmentType: 'Either', startDate: '', locations: [] },
  workAuthorization: '',
  topSkills: [],
  experience: [],
  projects: [],
  education: {
    school: 'Brigham Young University',
    degree: '',
    major: '',
    gradYear: '',
    gpa: '',
    coursework: []
  },
  skillGroups: [],
  interests: { industries: [], companies: [] }
};