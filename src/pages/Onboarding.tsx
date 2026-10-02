import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { ClipboardPasteIcon, FileTextIcon, RotateCcwIcon, SparklesIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { ChatBubble } from '../components/onboarding/ChatBubble';
import { Composer } from '../components/onboarding/Composer';
import { BuildingProfile } from '../components/onboarding/BuildingProfile';
import { AccountStep } from '../components/onboarding/AccountStep';
import { useSession } from '../contexts/SessionContext';
import { onboardingSteps } from '../data/onboardingSteps';
import { useOnboarding } from '../hooks/useOnboarding';
import { firstName } from '../utils/text';
import type { OnboardingStep } from '../types/onboarding';

export function Onboarding() {
  const { state } = useSession();
  const ob = useOnboarding();
  const endRef = useRef<HTMLDivElement>(null);
  const answeredSteps = onboardingSteps.slice(0, ob.draft.stepIndex);
  const progress = Math.min(ob.draft.stepIndex / onboardingSteps.length, 1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [ob.draft.stepIndex, ob.editing]);

  // Signed in with a profile already: never overwrite it from here.
  if (ob.user && state.profile) return <Navigate to="/profile" replace />;

  if (ob.phase === 'building') {
    return (
      <div className="flex min-h-screen w-full flex-col bg-white">
        <AppHeader />
        <BuildingProfile usedResume={Boolean(ob.draft.extract)} />
      </div>);

  }

  if (ob.phase === 'account' && ob.builtProfile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-canvas">
        <AppHeader />
        <AccountStep profile={ob.builtProfile} onCreated={ob.finish} onBack={ob.backToChat} />
      </div>);

  }

  const sourceLine = (icon: 'file' | 'paste', text: string) =>
  <span className="flex items-center gap-2">
      {icon === 'file' ?
    <FileTextIcon className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" /> :
    <ClipboardPasteIcon className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
    }
      <span className="break-all">{text}</span>
    </span>;


  const renderAnswer = (step: OnboardingStep) => {
    const answer = ob.draft.answers[step.id];
    if (!answer || answer.skipped) return <span className="italic text-muted">Skipped</span>;
    if (step.kind === 'resume') return sourceLine(ob.draft.resumeText ? 'paste' : 'file', answer.value);
    if (step.kind === 'linkedin') {
      return (
        <span className="flex flex-col gap-1">
          {answer.value && <span className="break-all">{answer.value}</span>}
          {ob.draft.linkedinFileName && sourceLine('file', ob.draft.linkedinFileName)}
          {ob.draft.linkedinText && sourceLine('paste', 'Pasted LinkedIn text')}
        </span>);

    }
    if (step.kind === 'photo' && ob.draft.photoUrl)
    return <img src={ob.draft.photoUrl} alt="Your profile photo" className="h-16 w-16 rounded-full object-cover" />;
    return <span className="whitespace-pre-wrap break-words">{answer.value}</span>;
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <AppHeader />
      <div className="h-0.5 w-full bg-canvas" role="progressbar" aria-label="Onboarding progress" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-navy transition-[width] duration-300 ease-out" style={{ width: `${progress * 100}%` }} />
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex-1 space-y-6 py-10" aria-live="polite">
          <ChatBubble role="assistant">
            <p>
              Hi {firstName(ob.user?.name ?? '') || 'there'}. Let’s build a profile employers can scan in seconds, then find the
              campus events where they’ll be. Skip anything you don’t have handy. You’ll create an account at the end to save it.
            </p>
            {ob.resumed && <p className="mt-2 text-sm text-muted">Welcome back. We picked up where you left off.</p>}
          </ChatBubble>

          {answeredSteps.map((step) => {
            const note = ob.draft.notes?.[step.id];
            return (
              <div key={step.id} className="space-y-3">
                <ChatBubble role="assistant">{step.prompt}</ChatBubble>
                <ChatBubble role="user" onEdit={() => ob.setEditing(step.id)} isEditing={ob.editing === step.id}>
                  {renderAnswer(step)}
                </ChatBubble>
                {note && <ChatBubble role="assistant">{note}</ChatBubble>}
              </div>);

          })}

          {!ob.complete && ob.activeStep && !ob.editing &&
          <ChatBubble key={ob.activeStep.id} role="assistant">
              {ob.activeStep.prompt}
            </ChatBubble>
          }

          {ob.complete && !ob.editing &&
          <ChatBubble role="assistant">
              That’s everything I need. I’ll turn this into a profile you can edit anytime. Then you’ll create an account to save it.
            </ChatBubble>
          }
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 bg-white pb-6 pt-2">
          {ob.buildError &&
          <p role="alert" className="mb-3 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {ob.buildError}
            </p>
          }
          {ob.activeStep && (!ob.complete || ob.editing) ?
          <Composer
            key={`${ob.activeStep.id}-${ob.editing ?? 'new'}`}
            step={ob.activeStep}
            initial={ob.initialValueFor(ob.activeStep.id)}
            isEditing={Boolean(ob.editing)}
            onSubmit={ob.submit}
            onSubmitSource={ob.submitSource}
            onSkip={ob.skip}
            onCancelEdit={() => ob.setEditing(null)} /> :


          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <button
              type="button"
              onClick={ob.restart}
              className="flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-ink">

                <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Start over
              </button>
              <button
              type="button"
              onClick={ob.build}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy sm:w-auto">

                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                Build my profile
              </button>
            </div>
          }
        </div>
      </main>
    </div>);

}
