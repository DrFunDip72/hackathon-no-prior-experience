import { employers } from '../data/employers';
import { industries } from '../data/industries';
import { emptyResume, type ResumeData } from '../data/sampleResume';
import type { OnboardingDraft, StepId } from '../types/onboarding';
import type { Profile } from '../types/profile';
import type { ResumeExtract } from '../types/resume';
import type { SessionUser } from '../types/session';
import { capitalize, containsWord, newId, splitList, unique } from './text';

const YEARS = ['freshman', 'sophomore', 'junior', 'senior', 'graduate', 'alumni'];
const INDUSTRY_NAMES = new Set(industries.map((i) => i.name));

function gradYearFor(year: string): string {
  const now = new Date();
  const base = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const offsets: Record<string, number> = { Senior: 0, Graduate: 0, Junior: 1, Sophomore: 2, Freshman: 3 };
  const offset = offsets[year.split(' ')[0]];
  return offset === undefined ? '' : String(base + offset);
}

function parseMajorYear(input: string, fallbackMajor: string, fallbackYear: string) {
  if (!input) return { major: fallbackMajor, year: fallbackYear };
  const yearWord = YEARS.find((y) => containsWord(input, y));
  const major = input.
  replace(new RegExp(`\\b(${YEARS.join('|')})\\b`, 'gi'), '').
  replace(/\b(year|student|in|my)\b/gi, '').
  replace(/[,·\-–—]/g, ' ').
  replace(/\s{2,}/g, ' ').
  trim();
  const year = yearWord ? capitalize(yearWord) : fallbackYear;
  // Keep the reader's wording ("Graduate student") when the student just confirmed it.
  return { major: major ? capitalize(major) : fallbackMajor, year: fallbackYear.toLowerCase().startsWith(year.toLowerCase()) ? fallbackYear : year };
}

function detectCompanies(text: string): string[] {
  return employers.
  filter((e) => {
    const key = e.name.split(' ')[0];
    return containsWord(text, key.length >= 4 ? key : e.name);
  }).
  map((e) => e.name);
}

function detectIndustries(text: string): string[] {
  return industries.filter((i) => i.keywords.some((k) => containsWord(text, k))).map((i) => i.name);
}

function parseRoles(text: string, companies: string[]): string[] {
  return text.
  split(/[,;\n]|—|–| - | and /i).
  map((part) => part.replace(/\b(internships?|roles?|jobs?|positions?|full[- ]time)\b/gi, '').replace(/\s{2,}/g, ' ').trim()).
  filter(
    (part) =>
    part.length > 2 &&
    !/^(anything|any|maybe|probably|something)\b/i.test(part) &&
    !companies.some((c) => containsWord(part, c.split(' ')[0]))
  ).
  map(capitalize).
  slice(0, 3);
}

/** The profile body the AI reader found, or a blank one. Never another student's data. */
function baseFrom(extract: ResumeExtract | null | undefined): ResumeData {
  if (!extract) return emptyResume;
  const edu = extract.education;
  return {
    headline: extract.headline,
    summary: extract.summary,
    year: extract.year,
    lookingFor: { ...emptyResume.lookingFor, roleTypes: extract.suggestedRoles.slice(0, 3) },
    workAuthorization: '',
    topSkills: extract.topSkills.slice(0, 5),
    experience: extract.experience.map((x) => ({ ...x, id: newId('x') })),
    projects: extract.projects.map((p) => ({ ...p, id: newId('pr') })),
    education: {
      school: edu.school || emptyResume.education.school,
      degree: edu.degree,
      major: edu.major,
      gradYear: edu.gradYear,
      gpa: edu.gpa,
      coursework: edu.coursework
    },
    skillGroups: extract.skillGroups.filter((g) => g.skills.length > 0),
    interests: { industries: extract.suggestedIndustries.filter((i) => INDUSTRY_NAMES.has(i)), companies: [] }
  };
}

/** One line for the chat: "Jordan Ellis, Computer Science senior, 3 roles, 3 projects, 13 skills". */
export function describeExtract(extract: ResumeExtract): string {
  const count = (n: number, word: string) => n > 0 ? `${n} ${word}${n === 1 ? '' : 's'}` : '';
  const skills = unique([...extract.topSkills, ...extract.skillGroups.flatMap((g) => g.skills)]).length;
  return [
  extract.name,
  [extract.education.major, extract.year.toLowerCase()].filter(Boolean).join(' '),
  count(extract.experience.length, 'role'),
  count(extract.projects.length, 'project'),
  count(skills, 'skill')].
  filter(Boolean).
  join(', ');
}

/** Answers to prefill from the AI reader, so the student just confirms or edits them. */
export function suggestedAnswer(id: StepId, extract: ResumeExtract | null | undefined): string {
  if (!extract) return '';
  switch (id) {
    case 'linkedin':
      return extract.linkedinUrl;
    case 'handshake':
      return extract.handshakeUrl;
    case 'majorYear':
      return [extract.education.major, extract.year.toLowerCase()].filter(Boolean).join(', ');
    case 'experience':
      return extract.summary;
    case 'skills':
      return unique([...extract.topSkills, ...extract.skillGroups.flatMap((g) => g.skills)]).slice(0, 8).join(', ');
    case 'goals':
      return extract.suggestedRoles.join(', ');
    default:
      return '';
  }
}

export function buildProfile(draft: OnboardingDraft, user: SessionUser | null): Profile {
  const answer = (id: StepId) => {
    const a = draft.answers[id];
    return a && !a.skipped ? a.value.trim() : '';
  };

  const extract = draft.extract ?? null;
  const base = baseFrom(extract);
  const { major, year } = parseMajorYear(answer('majorYear'), base.education.major, base.year);
  const gradYear = base.education.gradYear && year === base.year ? base.education.gradYear : gradYearFor(year);

  const goals = answer('goals');
  const companies = unique(detectCompanies(goals));
  const detectedIndustries = detectIndustries(goals);
  const roleTypes = goals ? parseRoles(goals, companies) : [];
  const skills = splitList(answer('skills'));

  const knownSkills = new Set(base.skillGroups.flatMap((g) => g.skills.map((s) => s.toLowerCase())));
  const newSkills = skills.filter((s) => !knownSkills.has(s.toLowerCase()));
  const skillGroups = newSkills.length ? [{ label: 'Highlighted', skills: newSkills }, ...base.skillGroups] : base.skillGroups;

  const finalRoles = roleTypes.length ? roleTypes : base.lookingFor.roleTypes;
  const headlineFocus = finalRoles[0] ?? detectedIndustries[0];
  const headline =
  base.headline || `${major || 'BYU'} student${headlineFocus ? ` focused on ${headlineFocus.toLowerCase()}` : ''}`;

  return {
    name: user?.name || extract?.name || '',
    email: user?.email || extract?.email || '',
    photoUrl: draft.photoUrl,
    headline,
    summary: answer('experience') || base.summary,
    year,
    handshakeUrl: answer('handshake') || extract?.handshakeUrl || '',
    linkedinUrl: answer('linkedin') || extract?.linkedinUrl || '',
    resumeFileName: draft.resumeFileName,
    resumeDataUrl: draft.resumeDataUrl,
    lookingFor: {
      ...base.lookingFor,
      roleTypes: finalRoles,
      // matching.ts lowercases this and special-cases 'Either', so it is never empty.
      employmentType: answer('employmentType') || 'Either'
    },
    workAuthorization: base.workAuthorization,
    topSkills: unique([...skills, ...base.topSkills]).slice(0, 5),
    experience: base.experience,
    projects: base.projects,
    education: { ...base.education, major, gradYear },
    skillGroups,
    interests: {
      industries: unique([...detectedIndustries, ...base.interests.industries]),
      companies
    },
    visibleToEmployers: true
  };
}
