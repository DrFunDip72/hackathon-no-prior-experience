import { unique } from '../utils/text';
import type { JobExtract } from '../types/job';

export type EmployerStepId = 'jobPosting' | 'company' | 'title' | 'employmentType' | 'skills' | 'lookingFor';

export const EMPLOYMENT_TYPE_OPTIONS = ['Internship', 'Full-time', 'Part-time', 'Either'] as const;

interface UploadStep {
  kind: 'upload';
  id: 'jobPosting';
  prompt: string;
  helper: string;
}

interface TextStep {
  kind: 'text';
  id: EmployerStepId;
  prompt: string;
  placeholder: string;
  /** Recommended text pre-filled into the field, accepted with Enter or Tab. '' means no suggestion exists. */
  suggested: string;
  /** Quick-fill options shown as clickable chips below the field; clicking one fills the field with it. */
  chips?: string[];
  multiline: boolean;
  optional: boolean;
}

interface ChoiceStep {
  kind: 'choice';
  id: EmployerStepId;
  prompt: string;
  /** Click-to-select options. Clicking one answers the step immediately, same as student onboarding's employment-type step. */
  options: readonly string[];
  optional: boolean;
}

interface ChipsStep {
  kind: 'chips';
  id: EmployerStepId;
  prompt: string;
  /** Multi-select toggle options; clicked ones are joined into the answer. */
  options: string[];
  placeholder: string;
  optional: boolean;
}

export type EmployerStep = UploadStep | TextStep | ChoiceStep | ChipsStep;

const jobPosting: UploadStep = {
  kind: 'upload',
  id: 'jobPosting',
  prompt: "First, drop in the job posting or a company/role blurb. I'll pull out the company, title, employment type, and skills so you don't have to retype them.",
  helper: 'PDF, up to 5 MB'
};

/** Grounded in the companies/roles the mock student pool actually targets, so a clicked chip produces real matches. */
const COMPANY_CHIPS = ['Qualtrics', 'Redo', 'Neighbor', 'Adobe', 'Domo', 'Waystar'];
const TITLE_CHIPS = ['Software Engineer', 'Product Manager', 'Data Scientist', 'Product Designer', 'Marketing Associate', 'Backend Engineer'];
const SKILL_OPTIONS = ['SQL', 'Figma', 'React', 'Python', 'UX research', 'Financial modeling', 'Public speaking', 'Project scheduling'];

function companyStep(extract: JobExtract | null): TextStep {
  return {
    kind: 'text',
    id: 'company',
    prompt: 'What company are you hiring for?',
    placeholder: 'Qualtrics',
    suggested: extract?.companyName ?? '',
    chips: unique([...extract?.companyName ? [extract.companyName] : [], ...COMPANY_CHIPS]),
    multiline: false,
    optional: false
  };
}

function titleStep(extract: JobExtract | null): TextStep {
  return {
    kind: 'text',
    id: 'title',
    prompt: 'What job do you want filled?',
    placeholder: 'Product Manager',
    suggested: extract?.jobTitle ?? '',
    chips: unique([...extract?.jobTitle ? [extract.jobTitle] : [], ...TITLE_CHIPS]),
    multiline: false,
    optional: false
  };
}

const employmentType: ChoiceStep = {
  kind: 'choice',
  id: 'employmentType',
  prompt: 'Is this an internship, full-time, part-time, or open to any of those?',
  options: EMPLOYMENT_TYPE_OPTIONS,
  optional: false
};

function skillsStep(extract: JobExtract | null): ChipsStep {
  return {
    kind: 'chips',
    id: 'skills',
    prompt: extract?.requiredSkills.length ?
    "Which skills matter most? I picked these from the posting -- tap to change them." :
    'Which skills matter most for this role?',
    options: unique([...extract?.requiredSkills ?? [], ...SKILL_OPTIONS]),
    placeholder: 'Other skills, separated by commas',
    optional: false
  };
}

function lookingForStep(extract: JobExtract | null): TextStep {
  return {
    kind: 'text',
    id: 'lookingFor',
    prompt: 'Anything else you want us to know about the ideal candidate?',
    placeholder: 'A junior PM who can run user research and is comfortable with SQL...',
    suggested: extract?.summary ?? '',
    multiline: true,
    optional: true
  };
}

/**
 * The questions to ask, given what the AI reader found. Mirrors stepsFor() in
 * src/data/onboardingSteps.ts: without a read we ask everything with no prefill; after a read,
 * company/title/skills/looking-for are pre-filled (not skipped -- still worth a glance), and
 * employmentType is skipped outright when the posting already states it, same as onboarding
 * skips majorYear/experience/skills once the resume covers them.
 */
export function employerStepsFor(extract: JobExtract | null): EmployerStep[] {
  const steps: (EmployerStep | false)[] = [
  jobPosting,
  companyStep(extract),
  titleStep(extract),
  !extract?.employmentType && employmentType,
  skillsStep(extract),
  lookingForStep(extract)];

  return steps.filter((s): s is EmployerStep => Boolean(s));
}
