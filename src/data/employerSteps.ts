export type EmployerStepId = 'company' | 'title' | 'employmentType' | 'lookingFor' | 'description';

export const EMPLOYMENT_TYPE_OPTIONS = ['Internship', 'Full-time', 'Part-time', 'Either'] as const;
export type EmployerEmploymentType = (typeof EMPLOYMENT_TYPE_OPTIONS)[number];

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

export type EmployerStep = TextStep | ChoiceStep;

/** Grounded in the companies/roles the mock student pool actually targets, so a clicked chip produces real matches. */
const COMPANY_CHIPS = ['Qualtrics', 'Redo', 'Neighbor', 'Adobe', 'Domo', 'Waystar'];
const TITLE_CHIPS = ['Software Engineer', 'Product Manager', 'Data Scientist', 'Product Designer', 'Marketing Associate', 'Backend Engineer'];

export const employerSteps: EmployerStep[] = [
{
  kind: 'text',
  id: 'company',
  prompt: 'What company are you hiring for?',
  placeholder: 'Qualtrics',
  suggested: '',
  chips: COMPANY_CHIPS,
  multiline: false,
  optional: false
},
{
  kind: 'text',
  id: 'title',
  prompt: 'What job do you want filled?',
  placeholder: 'Product Manager',
  suggested: '',
  chips: TITLE_CHIPS,
  multiline: false,
  optional: false
},
{
  kind: 'choice',
  id: 'employmentType',
  prompt: 'Is this an internship, full-time, part-time, or open to any of those?',
  options: EMPLOYMENT_TYPE_OPTIONS,
  optional: false
},
{
  kind: 'text',
  id: 'lookingFor',
  prompt: 'What are you looking for in a candidate?',
  placeholder: 'A junior PM who can run user research and is comfortable with SQL...',
  suggested: 'A junior PM who can run user research, is comfortable with SQL and Figma, and can ship end to end.',
  multiline: true,
  optional: false
},
{
  kind: 'text',
  id: 'description',
  prompt: 'Paste the job or company description, if you have one.',
  placeholder: 'Paste the full posting or a company blurb here.',
  suggested: "We're a fast-growing team looking for someone who can work cross-functionally with engineering and design, run customer interviews, and ship features end to end.",
  multiline: true,
  optional: true
}];
