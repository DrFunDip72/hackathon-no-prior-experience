import { employers } from '../data/employers';
import { containsWord, termMatch, unique } from './text';
import type { AttendedEvent, EmployerQuery, FitPart, PoolStudent, ScoredStudent } from '../types/employer';
import type { Profile } from '../types/profile';

/**
 * How well a student fits an employer's job, from the job and the student's profile only (no AI call).
 * Seven weighted parts, each with partial credit, so the result lands on whatever it lands on (43%, 67%, 72%)
 * instead of stacking fixed bonuses into round numbers. A strong pair scores in the 70s to 90s; an unrelated
 * one in the teens to 30s.
 */

const WEIGHTS = { skills: 32, role: 20, major: 12, academics: 7, interest: 12, experience: 10, timing: 7 } as const;

interface Family {
  id: string;
  /** Words in a job title (or, failing that, its skills) that put the job in this family. */
  words: string[];
  /** How related each major is to the family, 0 to 1. Unlisted majors get MAJOR_FLOOR. */
  majors: Record<string, number>;
  /** Words in a student's target roles that count as wanting this kind of job. */
  roles: string[];
  industries: string[];
  /** Skills suggested on the employer's skills step when the posting didn't list any. */
  skills: string[];
}

/** Checked in order: the first family whose words appear in the job title wins ("Financial analyst" is finance, not data). */
const FAMILIES: Family[] = [
{
  id: 'accounting',
  skills: ['Accounting', 'Auditing', 'Tax', 'Excel', 'QuickBooks'],
  words: ['accounting', 'accountant', 'audit', 'auditor', 'tax', 'cpa'],
  majors: { Accounting: 1, Finance: 0.62, Economics: 0.41, 'Information Systems': 0.37 },
  roles: ['audit', 'tax', 'accounting', 'accountant'],
  industries: ['Finance', 'Consulting']
},
{
  id: 'finance',
  skills: ['Financial modeling', 'Valuation', 'Excel', 'Accounting', 'SQL'],
  words: ['financial', 'finance', 'investment', 'banking', 'equity', 'valuation', 'treasury'],
  majors: { Finance: 1, Economics: 0.83, Accounting: 0.74, Statistics: 0.42, 'Data Science': 0.39, 'Information Systems': 0.36 },
  roles: ['financial', 'finance', 'investment', 'banking'],
  industries: ['Finance']
},
{
  id: 'hardware',
  skills: ['SolidWorks', 'CAD', 'MATLAB', 'Embedded systems', 'C++'],
  words: ['mechanical', 'electrical', 'hardware', 'manufacturing', 'embedded', 'aerospace'],
  majors: { 'Mechanical Engineering': 1, 'Electrical Engineering': 0.93, 'Computer Science': 0.33 },
  roles: ['mechanical', 'hardware', 'electrical'],
  industries: ['Aerospace & Defense', 'Consumer goods']
},
{
  id: 'design',
  skills: ['Figma', 'Prototyping', 'UX research', 'Design systems', 'User testing'],
  words: ['designer', 'design', 'ux', 'ui', 'user experience'],
  majors: { 'Experience Design': 1, UX: 1, 'Graphic Design': 0.84, 'Information Systems': 0.48, 'Computer Science': 0.34, Marketing: 0.29 },
  roles: ['design', 'designer', 'ux'],
  industries: ['Product & Design', 'Software']
},
{
  id: 'product',
  skills: ['SQL', 'Figma', 'UX research', 'Roadmapping', 'A/B testing', 'Product management'],
  words: ['product manager', 'product management', 'product owner', 'program manager', 'pm', 'apm'],
  majors: {
    'Information Systems': 1,
    'Computer Science': 0.76,
    'Experience Design': 0.63,
    Economics: 0.56,
    Marketing: 0.51,
    'Data Science': 0.49,
    Statistics: 0.44,
    Finance: 0.38
  },
  roles: ['product manager', 'product management', 'product owner', 'pm', 'apm'],
  industries: ['Software', 'Product & Design']
},
{
  id: 'data',
  skills: ['Python', 'SQL', 'Machine learning', 'Statistics', 'Tableau'],
  words: ['data', 'analytics', 'machine learning', 'scientist', 'ml', 'bi'],
  majors: {
    'Data Science': 1,
    Statistics: 0.96,
    'Computer Science': 0.79,
    'Information Systems': 0.74,
    Economics: 0.58,
    Finance: 0.39,
    Accounting: 0.28
  },
  roles: ['data', 'analytics', 'analyst', 'scientist', 'machine learning'],
  industries: ['Data & Analytics', 'Software']
},
{
  id: 'marketing',
  skills: ['Growth marketing', 'SEO', 'Content strategy', 'Google Analytics', 'Social media'],
  words: ['marketing', 'brand', 'growth', 'content', 'seo', 'social media', 'communications', 'public relations'],
  majors: {
    Marketing: 1,
    'Public Relations': 0.88,
    Communications: 0.86,
    'Graphic Design': 0.47,
    Economics: 0.41,
    'Information Systems': 0.33
  },
  roles: ['marketing', 'growth', 'brand', 'communications', 'content'],
  industries: ['Marketing', 'Consumer goods', 'Software']
},
{
  id: 'software',
  skills: ['React', 'TypeScript', 'Node.js', 'SQL', 'Python', 'Git'],
  words: ['software', 'developer', 'engineer', 'engineering', 'backend', 'frontend', 'full-stack', 'full stack', 'web', 'mobile'],
  majors: { 'Computer Science': 1, 'Information Systems': 0.68, 'Data Science': 0.53, 'Electrical Engineering': 0.47, Statistics: 0.28 },
  roles: ['software', 'developer', 'engineer'],
  industries: ['Software']
},
{
  id: 'consulting',
  skills: ['Excel', 'SQL', 'Financial modeling', 'Public speaking', 'Project management'],
  words: ['consultant', 'consulting', 'strategy', 'business analyst', 'operations'],
  majors: { Economics: 0.91, Finance: 0.86, 'Information Systems': 0.84, Accounting: 0.69, Marketing: 0.54, Statistics: 0.48 },
  roles: ['consult', 'business analyst', 'strategy'],
  industries: ['Consulting']
}];


/** Some credit for an unrelated major: plenty of hires come from adjacent fields. */
const MAJOR_FLOOR = 0.24;

const hasAny = (text: string, words: string[]) => words.some((w) => containsWord(text, w));

function familyFor(query: EmployerQuery): Family | null {
  return (
    FAMILIES.find((f) => hasAny(query.jobTitle, f.words)) ??
    FAMILIES.find((f) => hasAny(`${query.skills.join(' ')} ${query.lookingFor}`, f.words)) ??
    null);

}

/** Every skill the student lists anywhere, and the ones backed by real work (experience or projects). */
function studentSkills(p: Profile): { all: string[]; proven: string[] } {
  const proven = unique([...p.experience.flatMap((e) => e.skills), ...p.projects.flatMap((x) => x.skills)]);
  return { all: unique([...p.topSkills, ...p.skillGroups.flatMap((g) => g.skills), ...proven]), proven };
}

/** Skills to offer on the employer's skills step for a role, e.g. "Product Manager" -> SQL, Figma, UX research… */
export function suggestedSkillsFor(jobTitle: string): string[] {
  const family = FAMILIES.find((f) => hasAny(jobTitle, f.words));
  return family?.skills ?? ['SQL', 'Python', 'Excel', 'Figma', 'Public speaking', 'Project management'];
}

const has = (list: string[], term: string) => list.some((s) => termMatch(s, term));

/** "Lucid Software, Inc." -> "lucid software": lowercase, no punctuation or legal suffix. */
const companyKey = (name: string) =>
name.toLowerCase().replace(/[.,]/g, ' ').replace(/\b(inc|llc|ltd|corp|corporation|co)\b/g, '').replace(/\s+/g, ' ').trim();

/** Same company, tolerant of case and suffixes: "Lucid" ~ "Lucid Software, Inc.", "Wasatch Labs" ~ "wasatch labs". */
export function sameCompany(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b) && termMatch(companyKey(a!), companyKey(b!));
}

export interface EventEngagement {
  total: number;
  /** Events hosted by the role's company, newest first. */
  withYou: AttendedEvent[];
  /** Other companies' events, by company, most attended first. */
  others: { company: string; count: number }[];
  /** General career events with no host company (career fairs, panels). */
  general: number;
  /** Every event, newest first. */
  recent: AttendedEvent[];
}

/** How many Doorway events a student went to, split into the role's company, other companies and general events. */
export function eventEngagement(student: PoolStudent, companyName: string): EventEngagement {
  const recent = [...student.attendedEvents].sort((a, b) => b.date.localeCompare(a.date));
  const withYou = recent.filter((e) => sameCompany(e.company, companyName));
  const counts = new Map<string, number>();
  for (const e of recent) if (e.company && !withYou.includes(e)) counts.set(e.company, (counts.get(e.company) ?? 0) + 1);
  const others = [...counts].map(([company, count]) => ({ company, count })).sort((a, b) => b.count - a.count);
  return { total: recent.length, withYou, others, general: recent.filter((e) => !e.company).length, recent };
}

/** Never a multiple of 5: when rounding lands on one, round the other way (stays within a point of the real value). */
function unround(raw: number): number {
  const r = Math.round(raw);
  if (r % 5 !== 0) return r;
  return raw >= r ? r + 1 : r - 1;
}

export function scoreStudent(student: PoolStudent, query: EmployerQuery): ScoredStudent {
  const p = student.profile;
  const family = familyFor(query);
  const skills = studentSkills(p);
  const required = unique(query.skills.filter((s) => s.trim()));
  const company = query.companyName.trim();
  const title = query.jobTitle.trim();
  const parts: FitPart[] = [];

  // 1. Skills: each required skill the student has, full credit when used in real work, most of it when only listed.
  const matchedSkills = required.filter((r) => has(skills.all, r));
  const missingSkills = required.filter((r) => !has(skills.all, r));
  const skillCredit = required.length ?
  matchedSkills.reduce((sum, r) => sum + (has(skills.proven, r) ? 1 : 0.78), 0) / required.length :
  0.35;
  parts.push({
    key: 'skills',
    label: 'Skills',
    points: WEIGHTS.skills * skillCredit,
    max: WEIGHTS.skills,
    detail: required.length ?
    matchedSkills.length ?
    `Has ${matchedSkills.length} of ${required.length}: ${matchedSkills.join(', ')}` :
    `None of ${required.join(', ')} yet` :
    'No specific skills listed for the job'
  });

  // 2. Role: the job is one of the roles the student is going for (their first choice counts most).
  const roles = p.lookingFor.roleTypes.filter((r) => r.trim());
  const roleCredit = Math.max(
    0,
    ...roles.map((r, i) => {
      const rank = i === 0 ? 1 : 0.86;
      if (title && termMatch(r, title)) return rank;
      if (family && hasAny(r, family.roles)) return 0.81 * rank;
      return 0;
    })
  );
  const wantedRole = roles.find((r) => title && termMatch(r, title)) ?? roles.find((r) => family && hasAny(r, family.roles));
  parts.push({
    key: 'role',
    label: 'Role they want',
    points: WEIGHTS.role * roleCredit,
    max: WEIGHTS.role,
    detail: wantedRole ? `Looking for ${wantedRole.toLowerCase()} roles` : roles.length ? `Wants ${roles.join(', ').toLowerCase()}` : 'No target role listed'
  });

  // 3. Major: how close their field of study is to this kind of job.
  const major = p.education.major;
  const majorCredit = family ?
  Math.max(MAJOR_FLOOR, ...Object.entries(family.majors).filter(([m]) => termMatch(major, m)).map(([, w]) => w)) :
  0.5;
  parts.push({
    key: 'major',
    label: 'Major',
    points: WEIGHTS.major * majorCredit,
    max: WEIGHTS.major,
    detail: majorCredit >= 0.9 ? `${major}, a direct fit` : majorCredit >= 0.45 ? `${major}, a related field` : `${major}, outside the usual path`
  });

  // 4. Academics: GPA, plus a class that lines up with the job.
  const gpa = Number(p.education.gpa) || 0;
  const course = p.education.coursework.find((c) => hasAny(c, [...required, ...family?.words ?? []]));
  const academicCredit = 0.7 * Math.min(1, Math.max(0, (gpa - 2.8) / 1.1)) + (course ? 0.3 : 0.06);
  parts.push({
    key: 'academics',
    label: 'Academics',
    points: WEIGHTS.academics * academicCredit,
    max: WEIGHTS.academics,
    detail: [gpa ? `${p.education.gpa} GPA` : 'No GPA listed', course && `took ${course}`].filter(Boolean).join(', ')
  });

  // 5. Interest in you: the company is on their list, they came to your event, or they want your industry.
  const targetsYou = Boolean(company) && has(p.interests.companies, company);
  const yourEvents = company ? student.attendedEvents.filter((e) => sameCompany(e.company, company)) : [];
  const attended = yourEvents.length;
  // Each of your events adds a little less than the last: 1 -> 2.3 points, 2 -> 3.7, 4 -> 5.0, 7 -> 5.4.
  const attendPoints = 5.6 * (1 - 0.58 ** attended);
  const attendedDetail =
  attended === 1 ? `came to ${yourEvents[0].title}` : attended > 1 ? `came to ${attended} of your events` : '';
  const jobIndustries = unique([
  ...employers.filter((e) => company && termMatch(e.name, company)).map((e) => e.industry),
  ...family?.industries ?? []]
  );
  const industryHit = p.interests.industries.find((i) => has(jobIndustries, i));
  const interestPoints = Math.min(
    WEIGHTS.interest,
    (targetsYou ? 7 : 0) + attendPoints + (industryHit ? targetsYou ? 1.5 : 4.3 : 0)
  );
  parts.push({
    key: 'interest',
    label: 'Interest in you',
    points: interestPoints,
    max: WEIGHTS.interest,
    detail: [
    targetsYou && `${company} is on their target list`,
    attendedDetail,
    !targetsYou && industryHit && `interested in ${industryHit}`].
    filter(Boolean).join('; ') || 'No sign of interest in this company or industry yet'
  });

  // 6. Experience: past work that used the job's skills or was this kind of job.
  const relevant = (s: string[], t: string) => s.some((x) => has(required, x)) || Boolean(family && hasAny(t, family.words));
  const relevantJobs = p.experience.filter((e) => relevant(e.skills, e.title));
  const relevantProjects = p.projects.filter((x) => relevant(x.skills, x.name));
  const expCredit = Math.min(
    1,
    relevantJobs.length * 0.46 + (p.experience.length - relevantJobs.length) * 0.21 + relevantProjects.length * 0.17
  );
  parts.push({
    key: 'experience',
    label: 'Experience',
    points: WEIGHTS.experience * expCredit,
    max: WEIGHTS.experience,
    detail: relevantJobs.length ?
    `${relevantJobs[0].title} at ${relevantJobs[0].org}${relevantJobs.length > 1 ? ` and ${relevantJobs.length - 1} more` : ''}` :
    relevantProjects.length ?
    `Built ${relevantProjects[0].name}` :
    p.experience.length ?
    'Work experience in other areas' :
    'No work experience listed yet'
  });

  // 7. Timing: wants this type of job, and graduates at the right time for it.
  const want = p.lookingFor.employmentType;
  const type = query.employmentType;
  const typeCredit = !type || type === 'Either' ? 0.83 : want === type ? 1 : want === 'Either' ? 0.87 : 0.31;
  const grad = Number(p.education.gradYear) || 0;
  const thisYear = new Date().getFullYear();
  const gradCredit =
  type === 'Full-time' ? grad <= thisYear + 1 ? 1 : grad === thisYear + 2 ? 0.52 : 0.27 :
  type === 'Internship' ? grad > thisYear ? 1 : 0.46 :
  0.88;
  parts.push({
    key: 'timing',
    label: 'Timing',
    points: WEIGHTS.timing * (0.62 * typeCredit + 0.38 * gradCredit),
    max: WEIGHTS.timing,
    detail: `Wants ${want === 'Either' ? 'an internship or full-time' : want.toLowerCase()} work, graduating ${p.education.gradYear}`
  });

  const raw = parts.reduce((sum, part) => sum + part.points, 0);
  const percent = Math.min(97, Math.max(3, unround(raw)));

  const why = [
  matchedSkills.length && `Has ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? ` +${matchedSkills.length - 3}` : ''}`,
  wantedRole && `wants ${wantedRole.toLowerCase()} roles`,
  targetsYou && `${company} is a target`,
  !targetsYou && attendedDetail].
  filter(Boolean).join(' · ') || `${major} student, little overlap with this role`;

  return { student, percent, parts, matchedSkills, missingSkills, why: why.charAt(0).toUpperCase() + why.slice(1) };
}

/** Ranks the students who opted in to being found, best fit first. */
export function rankStudents(students: PoolStudent[], query: EmployerQuery): ScoredStudent[] {
  return students.
  filter((s) => s.profile.visibleToEmployers).
  map((s) => scoreStudent(s, query)).
  sort((a, b) => b.percent - a.percent);
}
