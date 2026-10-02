import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSession } from '../contexts/SessionContext';
import { stepsFor } from '../data/onboardingSteps';
import { api } from '../utils/api';
import { buildProfile, describeExtract, suggestedAnswer } from '../utils/profileBuilder';
import { readProfileSources, stripDataUrl } from '../utils/resumeReader';
import { clearLandingPrompt, takeLandingPrompt } from '../utils/landingPrompt';
import type { Answer, OnboardingDraft, SourceSubmission, StepId } from '../types/onboarding';
import type { Profile } from '../types/profile';
import type { ProfileSources } from '../types/resume';

const emptyDraft: OnboardingDraft = {
  answers: {},
  resumeFileName: null,
  resumeDataUrl: null,
  photoUrl: null
};

/** Data URLs above this (~1.5 MB of PDF) are read but not kept in browser storage. */
const STORE_LIMIT = 2_000_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface InitialValue {
  value: string;
  /** True when the value was suggested from the student's resume or LinkedIn. */
  suggested: boolean;
}

export function useOnboarding() {
  const { user, state, updateState, saveProfile } = useSession();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OnboardingDraft>(
    () => (user ? state.draft : null) ?? api.loadGuestDraft() ?? emptyDraft
  );
  const draftRef = useRef(draft);
  // PDFs too big for storage stay in memory so LinkedIn can still be read together with the resume.
  const pdfs = useRef<{resume?: string;linkedin?: string;}>({});
  const [resumed] = useState(() => Object.keys(draft.answers).length > 0);
  const [editing, setEditing] = useState<StepId | null>(null);
  const [phase, setPhase] = useState<'chat' | 'building' | 'account'>('chat');
  const [builtProfile, setBuiltProfile] = useState<Profile | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  // The step list shrinks once the AI reader has filled things in; the next question is the first one unanswered.
  const steps = stepsFor(draft);
  const openIndex = steps.findIndex((s) => !draft.answers[s.id]);
  const complete = openIndex === -1;
  const answeredSteps = complete ? steps : steps.slice(0, openIndex);
  const activeStep = (editing ? steps.find((s) => s.id === editing) : steps[openIndex]) ?? null;
  const progress = answeredSteps.length / steps.length;

  const persist = (next: OnboardingDraft) => {
    draftRef.current = next;
    setDraft(next);
    if (user) updateState((s) => ({ ...s, draft: next }));else
    api.saveGuestDraft(next);
  };

  /** Records an answer for a step, which moves the chat on (or closes the edit). */
  const record = (id: StepId, answer: Answer, extra: Partial<OnboardingDraft>) => {
    const current = draftRef.current;
    persist({ ...current, ...extra, answers: { ...current.answers, [id]: answer } });
    setEditing(null);
  };

  const submit = (value: string, extra: Partial<OnboardingDraft> = {}) => {
    if (activeStep) record(activeStep.id, { value, skipped: false }, extra);
  };

  const skip = () => {
    if (!activeStep) return;
    const notes = { ...draftRef.current.notes };
    delete notes[activeStep.id];
    const cleared: Partial<OnboardingDraft> =
    activeStep.kind === 'resume' ?
    { resumeFileName: null, resumeDataUrl: null, resumeText: null, extract: null, notes } :
    activeStep.kind === 'linkedin' ?
    { linkedinFileName: null, linkedinText: null, notes } :
    activeStep.kind === 'photo' ?
    { photoUrl: null } :
    {};
    if (activeStep.kind === 'resume') delete pdfs.current.resume;
    if (activeStep.kind === 'linkedin') delete pdfs.current.linkedin;
    record(activeStep.id, { value: '', skipped: true }, cleared);
  };

  /** Saves what the student gave us on the resume or LinkedIn step and asks the AI reader to read it. */
  const submitSource = async (input: SourceSubmission) => {
    const current = draftRef.current;
    const pdf = input.dataUrl ? stripDataUrl(input.dataUrl) : undefined;
    pdfs.current[input.step] = pdf;

    const next: Partial<OnboardingDraft> =
    input.step === 'resume' ?
    {
      resumeFileName: input.fileName ?? null,
      resumeDataUrl: input.dataUrl && input.dataUrl.length <= STORE_LIMIT ? input.dataUrl : null,
      resumeText: input.text ?? null
    } :
    { linkedinFileName: input.fileName ?? null, linkedinText: input.text ?? null };
    const merged = { ...current, ...next };

    const resumePdf = pdfs.current.resume ?? (merged.resumeDataUrl ? stripDataUrl(merged.resumeDataUrl) : undefined);
    const sources: ProfileSources = {};
    if (resumePdf || merged.resumeText) sources.resume = merged.resumeText ? { text: merged.resumeText } : { pdfBase64: resumePdf };
    if (pdfs.current.linkedin || merged.linkedinText) {
      sources.linkedin = merged.linkedinText ? { text: merged.linkedinText } : { pdfBase64: pdfs.current.linkedin };
    }
    const linkedinUrl = input.step === 'linkedin' ? input.label : current.answers.linkedin?.value;
    if (sources.linkedin && linkedinUrl) sources.linkedin.url = linkedinUrl;

    let extract = merged.extract ?? null;
    let note: string | undefined;
    if (pdf || input.text) {
      const result = await readProfileSources(sources);
      if (result.ok) {
        extract = result.data;
        note =
        input.step === 'resume' ?
        `Got it: ${describeExtract(result.data)}. That covers most of your profile, so I just have a few quick questions.` :
        `Read your LinkedIn too. Now I have: ${describeExtract(result.data)}.`;
      } else if (input.step === 'resume') {
        extract = null;
        note = 'I couldn’t read it automatically, so I’ll ask a few quick questions.';
      } else {
        note = extract ?
        'I couldn’t read your LinkedIn automatically, so I’ll stick with what I got from your resume.' :
        'I couldn’t read it automatically, so I’ll ask a few quick questions.';
      }
    } else if (!activeStep?.knownUrl) {
      note = 'Saved. I can’t open LinkedIn links myself since they need a login, so I’ll just show it on your profile.';
    }
    // A LinkedIn URL the reader found needs no reply: the prompt already said it's linked.

    const notes = { ...current.notes };
    if (note) notes[input.step] = note;else
    delete notes[input.step];
    record(input.step, { value: input.label, skipped: false }, { ...next, extract, notes });
  };

  const initialValueFor = (id: StepId): InitialValue => {
    const existing = draft.answers[id];
    if (existing && !existing.skipped) return { value: existing.value, suggested: false };
    if (id === 'goals') {
      const fromLanding = takeLandingPrompt();
      if (fromLanding) return { value: fromLanding, suggested: false };
    }
    const value = suggestedAnswer(id, draft.extract, takeLandingPrompt());
    return { value, suggested: Boolean(value) };
  };

  const restart = () => {
    setEditing(null);
    pdfs.current = {};
    persist(emptyDraft);
  };

  /** Profile saved: land on the events picked for it. */
  const finish = () => {
    api.clearGuestDraft();
    clearLandingPrompt();
    navigate('/events', { replace: true });
    toast.success('Welcome to Doorway', { description: 'Here are the events that fit your profile.' });
  };

  const build = async () => {
    setBuildError(null);
    setPhase('building');
    try {
      const profile = buildProfile(draft, user);
      if (user) {
        // Already signed in (e.g. an account made before onboarding existed): save straight away.
        await Promise.all([saveProfile(profile), wait(1000)]);
        updateState((s) => ({ ...s, draft: null }));
        finish();
        return;
      }
      await wait(1000);
      setBuiltProfile(profile);
      setPhase('account');
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : 'We couldn’t build your profile. Try again.');
      setPhase('chat');
    }
  };

  return {
    user,
    draft,
    editing,
    setEditing,
    phase,
    backToChat: () => setPhase('chat'),
    builtProfile,
    buildError,
    resumed,
    complete,
    answeredSteps,
    progress,
    activeStep,
    submit,
    submitSource,
    skip,
    initialValueFor,
    restart,
    build,
    finish
  };
}
