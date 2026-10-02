import type { ResumeExtract } from './resume';

/** choice: tap one option to answer. chips: pick several, optionally add your own, then Continue. */
export type StepKind = 'resume' | 'linkedin' | 'text' | 'choice' | 'chips' | 'photo';

export type StepId =
'resume' |
'linkedin' |
'majorYear' |
'experience' |
'skills' |
'goals' |
'roles' |
'employmentType' |
'companies' |
'industries' |
'photo';

export interface OnboardingStep {
  id: StepId;
  kind: StepKind;
  prompt: string;
  helper?: string;
  placeholder?: string;
  options?: string[];
  validate?: 'linkedin';
  multiline?: boolean;
  /** LinkedIn step: the URL the AI reader already found, so the student isn't asked to type it. */
  knownUrl?: string;
}

export interface Answer {
  value: string;
  skipped: boolean;
}

/** What the student handed over on the resume or LinkedIn step, for the AI reader. */
export interface SourceSubmission {
  step: 'resume' | 'linkedin';
  /** Shown in the chat as the student's answer (file name, "Pasted resume text", or the LinkedIn URL). */
  label: string;
  fileName?: string;
  /** A PDF as a data: URL. */
  dataUrl?: string;
  /** Pasted text. */
  text?: string;
}

/**
 * Which steps are asked depends on what the AI reader found (see stepsFor), so progress is derived
 * from `answers`: the active step is the first visible one without an answer.
 */
export interface OnboardingDraft {
  answers: Partial<Record<StepId, Answer>>;
  resumeFileName: string | null;
  resumeDataUrl: string | null;
  photoUrl: string | null;
  /** Pasted resume text, when the student pasted instead of uploading. */
  resumeText?: string | null;
  linkedinFileName?: string | null;
  linkedinText?: string | null;
  /** What the AI reader pulled from the resume and LinkedIn. */
  extract?: ResumeExtract | null;
  /** Assistant replies shown right after the student's answer to a step. */
  notes?: Partial<Record<StepId, string>>;
}
