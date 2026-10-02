import type { MockStudent } from '../types/employer';

/**
 * A mock pool of BYU students for the employer demo. There is no real student directory yet (each
 * student's profile and saved events live only in their own browser), so this stands in for one.
 * See docs/api-requests.md for the real fix: a backend student directory, opted into by students.
 */
export const mockStudents: MockStudent[] = [
{
  id: 'stu_jordan',
  name: 'Jordan Ellis',
  major: 'Computer Science',
  gradYear: '2027',
  summary: 'Full-stack intern experience shipping React/TypeScript features and internal tooling in Python and SQL.',
  skills: ['React', 'TypeScript', 'Python', 'SQL', 'Node.js', 'REST APIs'],
  targetCompanies: ['Redo', 'Neighbor', 'Qualtrics'],
  targetTitle: 'Software Engineer',
  attendedEvents: [
  { title: 'Homecoming Hackathon', company: 'Redo', date: 'Oct 2' },
  { title: 'Startup Career Fair', company: 'Neighbor', date: 'Oct 15' }]

},
{
  id: 'stu_maya',
  name: 'Maya Chen',
  major: 'Information Systems',
  gradYear: '2027',
  summary: 'Product-minded IS student who has run user research and shipped onboarding improvements as a product intern.',
  skills: ['Product management', 'UX research', 'Figma', 'SQL', 'Roadmapping'],
  targetCompanies: ['Podium', 'Qualtrics', 'Domo'],
  targetTitle: 'Product Manager',
  attendedEvents: [
  { title: 'Qualtrics Product Night', company: 'Qualtrics', date: 'Oct 5' },
  { title: 'PM Panel: Breaking into Product', company: null, date: 'Sep 29' }]

},
{
  id: 'stu_devon',
  name: 'Devon Park',
  major: 'Computer Science',
  gradYear: '2028',
  summary: 'Backend-focused engineer who has built data pipelines and APIs; comfortable in Go and Python.',
  skills: ['Go', 'Python', 'Postgres', 'Docker', 'System design'],
  targetCompanies: ['Qualtrics', 'Domo', 'Microsoft'],
  targetTitle: 'Backend Engineer',
  attendedEvents: [
  { title: 'Homecoming Hackathon', company: 'Waystar', date: 'Oct 2' }]

},
{
  id: 'stu_amara',
  name: 'Amara Okafor',
  major: 'Marketing',
  gradYear: '2027',
  summary: 'Growth marketing intern who ran paid-acquisition experiments and built lifecycle email campaigns.',
  skills: ['Growth marketing', 'SQL', 'A/B testing', 'Email lifecycle', 'Analytics'],
  targetCompanies: ['Adobe', 'Domo', 'Podium'],
  targetTitle: 'Marketing Associate',
  attendedEvents: [
  { title: 'Adobe Info Session', company: 'Adobe', date: 'Oct 8' }]

},
{
  id: 'stu_tyler',
  name: 'Tyler Nguyen',
  major: 'Finance',
  gradYear: '2027',
  summary: 'Finance student with two investment banking summer internships, strong in financial modeling and valuation.',
  skills: ['Financial modeling', 'Valuation', 'Excel', 'DCF', 'Pitch decks'],
  targetCompanies: ['Goldman Sachs', 'Ensign Peak Advisors'],
  targetTitle: 'Investment Banking Analyst',
  attendedEvents: [
  { title: 'Goldman Sachs Recruiting Dinner', company: 'Goldman Sachs', date: 'Oct 10' }]

},
{
  id: 'stu_priya',
  name: 'Priya Shah',
  major: 'Data Science',
  gradYear: '2028',
  summary: 'Machine learning coursework plus a research assistantship building forecasting models in Python.',
  skills: ['Python', 'Machine learning', 'Pandas', 'SQL', 'Statistics'],
  targetCompanies: ['Domo', 'Ancestry', 'Qualtrics'],
  targetTitle: 'Data Scientist',
  attendedEvents: [
  { title: 'Data & Analytics Mixer', company: 'Domo', date: 'Oct 12' },
  { title: 'Homecoming Hackathon', company: 'Neighbor', date: 'Oct 2' }]

},
{
  id: 'stu_caleb',
  name: 'Caleb Whitmore',
  major: 'Construction Management',
  gradYear: '2027',
  summary: 'Hands-on project coordination experience on two commercial job sites, strong in scheduling and bidding.',
  skills: ['Project scheduling', 'Cost estimation', 'Bluebeam', 'Procore'],
  targetCompanies: ['Layton Construction'],
  targetTitle: 'Project Engineer',
  attendedEvents: [
  { title: 'Construction Career Night', company: 'Layton Construction', date: 'Oct 9' }]

},
{
  id: 'stu_hannah',
  name: 'Hannah Reyes',
  major: 'Design',
  gradYear: '2027',
  summary: 'Product designer who has shipped mobile flows end-to-end, from research through hi-fi prototypes.',
  skills: ['Figma', 'UX design', 'Prototyping', 'Design systems', 'User research'],
  targetCompanies: ['Adobe', 'Lucid', 'Podium'],
  targetTitle: 'Product Designer',
  attendedEvents: [
  { title: 'Design Week Portfolio Review', company: null, date: 'Oct 6' }]

},
{
  id: 'stu_noah',
  name: 'Noah Bennett',
  major: 'Computer Science',
  gradYear: '2027',
  summary: 'Security-minded software engineer with a hackathon win and an internship hardening internal auth tooling.',
  skills: ['Security', 'Go', 'React', 'TypeScript', 'OAuth'],
  targetCompanies: ['Redo', 'Microsoft'],
  targetTitle: 'Software Engineer',
  attendedEvents: [
  { title: 'Homecoming Hackathon', company: 'Redo', date: 'Oct 2' }]

},
{
  id: 'stu_sofia',
  name: 'Sofia Martinez',
  major: 'Public Health',
  gradYear: '2028',
  summary: 'Health policy research assistant interested in healthcare operations and payer-provider technology.',
  skills: ['Health policy', 'Data analysis', 'SQL', 'Public speaking'],
  targetCompanies: ['Waystar', 'Larry H. Miller Senior Health'],
  targetTitle: 'Healthcare Operations Analyst',
  attendedEvents: [
  { title: 'Homecoming Hackathon', company: 'Waystar', date: 'Oct 2' }]

}];
