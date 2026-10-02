import { EMPLOYMENT_OPTIONS } from './onboardingSteps';
import { suggestedSkillsFor } from '../utils/employerMatching';
import { unique } from '../utils/text';
import type { ChatStep } from '../types/onboarding';
import type { JobExtract } from '../types/job';

export type EmployerStepId = 'jobPosting' | 'company' | 'title' | 'employmentType' | 'skills' | 'lookingFor';

/** Same step shape, Composer and chat as student onboarding; only the questions differ. */
export type EmployerStep = ChatStep<EmployerStepId>;

const jobPosting: EmployerStep = {
  id: 'jobPosting',
  kind: 'resume',
  document: 'job posting',
  prompt: 'First, drop in the job posting. I’ll pull out the company, role, and skills so you don’t have to retype them.',
  helper: 'PDF, up to 5 MB'
};

/** Companies and roles the sample student pool actually targets, so a tapped suggestion produces real matches. */
const COMPANIES = ['Qualtrics', 'Redo', 'Domo', 'Podium', 'Adobe', 'Goldman Sachs', 'Deloitte'];
const TITLES = ['Software Engineer Intern', 'Product Manager Intern', 'Data Scientist Intern', 'Product Designer', 'Marketing Associate', 'Financial Analyst'];

const company: EmployerStep = {
  id: 'company',
  kind: 'text',
  prompt: 'What company are you hiring for?',
  placeholder: 'Qualtrics',
  suggestions: COMPANIES,
  required: true
};

const title: EmployerStep = {
  id: 'title',
  kind: 'text',
  prompt: 'What role do you want filled?',
  placeholder: 'Product Manager Intern',
  suggestions: TITLES,
  required: true
};

const employmentType: EmployerStep = {
  id: 'employmentType',
  kind: 'choice',
  prompt: 'Is it an internship, full-time, or part-time role?',
  options: EMPLOYMENT_OPTIONS,
  required: true
};

/** Pre-picked from the posting when there is one; otherwise suggested from the role. */
function skillsStep(extract: JobExtract | null, jobTitle: string): EmployerStep {
  const read = extract?.requiredSkills.filter((s) => s.trim()) ?? [];
  return {
    id: 'skills',
    kind: 'chips',
    prompt: read.length ?
    'Which skills matter most? I picked these from the posting. Tap to change them.' :
    'Which skills matter most for this role? Pick any that fit.',
    options: unique([...read, ...suggestedSkillsFor(jobTitle || extract?.jobTitle || '')]).slice(0, 10),
    placeholder: 'Other skills, separated by commas',
    required: true
  };
}

const lookingFor: EmployerStep = {
  id: 'lookingFor',
  kind: 'text',
  prompt: 'Anything else about the ideal candidate? Optional.',
  placeholder: 'Comfortable running user interviews and writing SQL…',
  multiline: true
};

/**
 * The questions to ask, given what the AI reader found. Mirrors stepsFor() in onboardingSteps.ts:
 * without a read we ask everything; after a read we only ask what's missing, plus the skills to confirm.
 */
export function employerStepsFor(extract: JobExtract | null, jobTitle = ''): EmployerStep[] {
  const x = extract;
  const steps: (EmployerStep | false)[] = [
  jobPosting,
  !x?.companyName && company,
  !x?.jobTitle && title,
  !x?.employmentType && employmentType,
  skillsStep(x, jobTitle),
  !x?.summary && lookingFor];

  return steps.filter((s): s is EmployerStep => Boolean(s));
}
