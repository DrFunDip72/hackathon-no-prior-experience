import { employers } from '../data/employers';
import { industries } from '../data/industries';
import { emptyResume, sampleResume } from '../data/sampleResume';
import type { OnboardingDraft, StepId } from '../types/onboarding';
import type { Profile } from '../types/profile';
import type { SessionUser } from '../types/session';
import { capitalize, containsWord, splitList, unique } from './text';

const YEARS = ['freshman', 'sophomore', 'junior', 'senior', 'graduate'];

function gradYearFor(year: string): string {
  const now = new Date();
  const base = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const offsets: Record<string, number> = { Senior: 0, Graduate: 0, Junior: 1, Sophomore: 2, Freshman: 3 };
  return String(base + (offsets[year] ?? 1));
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
  return { major: major ? capitalize(major) : fallbackMajor, year: yearWord ? capitalize(yearWord) : fallbackYear };
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
  map((part) => part.replace(/\b(internships?|roles?|jobs?|positions?|full[- ]time)\b/gi, '').trim()).
  filter(
    (part) =>
    part.length > 2 &&
    !/^(anything|any|maybe|probably|something)\b/i.test(part) &&
    !companies.some((c) => containsWord(part, c.split(' ')[0]))
  ).
  map(capitalize).
  slice(0, 3);
}

export function buildProfile(draft: OnboardingDraft, user: SessionUser): Profile {
  const answer = (id: StepId) => {
    const a = draft.answers[id];
    return a && !a.skipped ? a.value.trim() : '';
  };

  const hasResume = Boolean(draft.resumeFileName);
  const base = hasResume ? sampleResume : emptyResume;
  const { major, year } = parseMajorYear(answer('majorYear'), base.education.major, base.year || 'Junior');

  const goals = answer('goals');
  const companies = unique([...detectCompanies(goals), ...(goals ? [] : base.interests.companies)]);
  const detectedIndustries = detectIndustries(goals);
  const roleTypes = goals ? parseRoles(goals, companies) : [];
  const skills = splitList(answer('skills'));

  const knownSkills = new Set(base.skillGroups.flatMap((g) => g.skills.map((s) => s.toLowerCase())));
  const newSkills = skills.filter((s) => !knownSkills.has(s.toLowerCase()));
  const skillGroups = newSkills.length ? [{ label: 'Highlighted', skills: newSkills }, ...base.skillGroups] : base.skillGroups;

  const finalRoles = roleTypes.length ? roleTypes : base.lookingFor.roleTypes;
  const headlineFocus = finalRoles[0] ?? detectedIndustries[0];
  const headline = hasResume && !answer('majorYear') && !goals ?
  base.headline :
  `${major || 'BYU'} student${headlineFocus ? ` focused on ${headlineFocus.toLowerCase()}` : ''}`;

  return {
    name: user.name,
    email: user.email,
    photoUrl: draft.photoUrl,
    headline,
    summary: answer('experience') || base.summary,
    year,
    handshakeUrl: answer('handshake'),
    linkedinUrl: answer('linkedin'),
    resumeFileName: draft.resumeFileName,
    resumeDataUrl: draft.resumeDataUrl,
    lookingFor: {
      ...base.lookingFor,
      roleTypes: finalRoles,
      employmentType: answer('employmentType') || base.lookingFor.employmentType
    },
    workAuthorization: base.workAuthorization,
    topSkills: unique([...skills, ...base.topSkills]).slice(0, 5),
    experience: base.experience,
    projects: base.projects,
    education: { ...base.education, major, gradYear: gradYearFor(year) },
    skillGroups,
    interests: {
      industries: unique([...detectedIndustries, ...(detectedIndustries.length ? [] : base.interests.industries)]),
      companies
    },
    visibleToEmployers: true
  };
}