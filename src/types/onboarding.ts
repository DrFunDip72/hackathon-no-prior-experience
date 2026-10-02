import type { ResumeExtract } from './resume';

export type StepKind = 'resume' | 'linkedin' | 'url' | 'text' | 'choice' | 'photo';

export type StepId =
'resume' |
'handshake' |
'linkedin' |
'majorYear' |
'experience' |
'skills' |
'goals' |
'employmentType' |
'photo';

export interface OnboardingStep {
  id: StepId;
  kind: StepKind;
  prompt: string;
  helper?: string;
  placeholder?: string;
  options?: string[];
  validate?: 'handshake' | 'linkedin';
  multiline?: boolean;
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

export interface OnboardingDraft {
  stepIndex: number;
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
