export type EmployerStepId = 'company' | 'title' | 'lookingFor' | 'description';

export interface EmployerStep {
  id: EmployerStepId;
  prompt: string;
  placeholder: string;
  /** Recommended text pre-filled into the field, accepted with Enter or Tab. '' means no suggestion exists. */
  suggested: string;
  multiline: boolean;
  optional: boolean;
}

export const employerSteps: EmployerStep[] = [
{
  id: 'company',
  prompt: 'What company are you hiring for?',
  placeholder: 'Qualtrics',
  suggested: '',
  multiline: false,
  optional: false
},
{
  id: 'title',
  prompt: "What's the job title?",
  placeholder: 'Product Manager',
  suggested: '',
  multiline: false,
  optional: false
},
{
  id: 'lookingFor',
  prompt: 'What are you looking for in a candidate?',
  placeholder: 'A junior PM who can run user research and is comfortable with SQL...',
  suggested: 'A junior PM who can run user research, is comfortable with SQL and Figma, and can ship end to end.',
  multiline: true,
  optional: false
},
{
  id: 'description',
  prompt: 'Paste the job or company description, if you have one.',
  placeholder: 'Paste the full posting or a company blurb here.',
  suggested: "We're a fast-growing team looking for someone who can work cross-functionally with engineering and design, run customer interviews, and ship features end to end.",
  multiline: true,
  optional: true
}];
