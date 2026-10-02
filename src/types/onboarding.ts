export type StepKind = 'resume' | 'url' | 'text' | 'choice' | 'photo';

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

export interface OnboardingDraft {
  stepIndex: number;
  answers: Partial<Record<StepId, Answer>>;
  resumeFileName: string | null;
  resumeDataUrl: string | null;
  photoUrl: string | null;
}