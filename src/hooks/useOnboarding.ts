import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { onboardingSteps } from '../data/onboardingSteps';
import { buildProfile } from '../utils/profileBuilder';
import { clearLandingPrompt, takeLandingPrompt } from '../utils/landingPrompt';
import type { Answer, OnboardingDraft, StepId } from '../types/onboarding';

const emptyDraft: OnboardingDraft = {
  stepIndex: 0,
  answers: {},
  resumeFileName: null,
  resumeDataUrl: null,
  photoUrl: null
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useOnboarding() {
  const { user, state, updateState, saveProfile } = useSession();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OnboardingDraft>(() => state.draft ?? emptyDraft);
  const [editing, setEditing] = useState<StepId | null>(null);
  const [phase, setPhase] = useState<'chat' | 'building'>('chat');
  const [buildError, setBuildError] = useState<string | null>(null);

  const resumed = Boolean(state.draft && state.draft.stepIndex > 0);
  const complete = draft.stepIndex >= onboardingSteps.length;
  const activeIndex = editing ? onboardingSteps.findIndex((s) => s.id === editing) : draft.stepIndex;
  const activeStep = onboardingSteps[activeIndex] ?? null;

  const persist = (next: OnboardingDraft) => {
    setDraft(next);
    updateState((s) => ({ ...s, draft: next }));
  };

  const record = (answer: Answer, extra: Partial<OnboardingDraft> = {}) => {
    if (!activeStep) return;
    persist({
      ...draft,
      ...extra,
      answers: { ...draft.answers, [activeStep.id]: answer },
      stepIndex: editing ? draft.stepIndex : draft.stepIndex + 1
    });
    setEditing(null);
  };

  const submit = (value: string, extra?: Partial<OnboardingDraft>) => record({ value, skipped: false }, extra);

  const skip = () => {
    if (!activeStep) return;
    const cleared: Partial<OnboardingDraft> =
    activeStep.kind === 'resume' ?
    { resumeFileName: null, resumeDataUrl: null } :
    activeStep.kind === 'photo' ?
    { photoUrl: null } :
    {};
    record({ value: '', skipped: true }, cleared);
  };

  const initialValueFor = (id: StepId): string => {
    const existing = draft.answers[id];
    if (existing && !existing.skipped) return existing.value;
    if (id === 'goals') return takeLandingPrompt();
    return '';
  };

  const restart = () => {
    setEditing(null);
    persist(emptyDraft);
  };

  const build = async () => {
    if (!user) return;
    setBuildError(null);
    setPhase('building');
    try {
      const profile = buildProfile(draft, user);
      await Promise.all([saveProfile(profile), wait(2400)]);
      updateState((s) => ({ ...s, draft: null }));
      clearLandingPrompt();
      navigate('/profile', { replace: true });
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
    buildError,
    resumed,
    complete,
    activeStep,
    submit,
    skip,
    initialValueFor,
    restart,
    build
  };
}