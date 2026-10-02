import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import { ClipboardPasteIcon, FileTextIcon, RotateCcwIcon, SparklesIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { HeroBackground, isHeroBackgroundVariant } from '../components/landing/HeroBackground';
import { ChatBubble } from '../components/onboarding/ChatBubble';
import { Composer } from '../components/onboarding/Composer';
import { BuildingProfile } from '../components/onboarding/BuildingProfile';
import { AccountStep } from '../components/onboarding/AccountStep';
import { ReadyDialog } from '../components/onboarding/ReadyDialog';
import { useSession } from '../contexts/SessionContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { firstName } from '../utils/text';
import { hasPendingResume } from '../utils/pendingResume';
import type { OnboardingStep } from '../types/onboarding';

/** Gap kept between the newest message and the top of the pinned composer. */
const COMPOSER_GAP = 12;

export function Onboarding() {
  const { state } = useSession();
  const ob = useOnboarding();
  const [params] = useSearchParams();
  const reduceMotion = useReducedMotion();
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const readyButtonRef = useRef<HTMLButtonElement>(null);
  const firstScroll = useRef(true);
  const [readyOpen, setReadyOpen] = useState(false);
  const { answeredSteps, progress } = ob;

  const bgParam = params.get('bg');
  const bg = isHeroBackgroundVariant(bgParam) ? bgParam : undefined;

  // Keep the newest message (or, while editing, the answer being edited) and the composer in view whenever the
  // conversation moves on. The target's scroll margin is the pinned composer's height, so it never ends up underneath it.
  const scrollKey = [answeredSteps.length, ob.activeStep?.id, ob.editing, ob.complete, Object.keys(ob.draft.notes ?? {}).length].join('|');
  useEffect(() => {
    const target = ob.editing ? document.getElementById(`step-${ob.editing}`) : endRef.current;
    if (ob.phase !== 'chat' || !target) return;
    // Runs after commit, so the new composer is in the DOM and its height is final.
    target.style.scrollMarginBottom = `${(composerRef.current?.offsetHeight ?? 0) + COMPOSER_GAP}px`;
    // A hidden tab (e.g. the student switched away during a resume read) never runs a smooth scroll, so jump instead.
    const instant = firstScroll.current || reduceMotion || document.hidden;
    target.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'end' });
    firstScroll.current = false;
  }, [scrollKey, ob.phase, reduceMotion]);

  // A resume picked on the landing page replaces an earlier answer: reopen the resume step so the Composer reads it.
  useEffect(() => {
    if (hasPendingResume() && ob.draft.answers.resume) ob.setEditing('resume');
    // Once, on arrival from the landing page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every question answered (and not mid-edit): offer to build, after a beat so the closing message is seen.
  const readyNow = ob.complete && !ob.editing;
  useEffect(() => {
    if (!readyNow) {
      setReadyOpen(false);
      return;
    }
    const t = setTimeout(() => setReadyOpen(true), reduceMotion ? 0 : 450);
    return () => clearTimeout(t);
  }, [readyNow, reduceMotion]);

  // Signed in with a profile already: never overwrite it from here.
  if (ob.user && state.profile) return <Navigate to="/events" replace />;

  const page = (children: React.ReactNode) =>
  <div className="relative isolate flex min-h-screen w-full flex-col bg-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <HeroBackground variant={bg} />
      </div>
      <AppHeader />
      {children}
    </div>;


  if (ob.phase === 'building') return page(<BuildingProfile usedResume={Boolean(ob.draft.extract)} />);

  if (ob.phase === 'account' && ob.builtProfile) {
    return page(<AccountStep profile={ob.builtProfile} onCreated={ob.finish} onBack={ob.backToChat} />);
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

  const answeredCount = answeredSteps.filter((s) => !ob.draft.answers[s.id]?.skipped).length;
  const summary = `${answeredCount} of ${answeredSteps.length} questions answered${
  ob.draft.extract ? ', plus what I read from your resume' : ''}. You can edit anything later, then create an account to save it.`;

  const startBuild = () => {
    setReadyOpen(false);
    void ob.build();
  };

  return page(
    <>
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
              <div key={step.id} id={`step-${step.id}`} className="space-y-3">
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
          <div ref={endRef} aria-hidden="true" />
        </div>

        <div ref={composerRef} className="sticky bottom-0 z-10 bg-gradient-to-t from-white from-70% to-white/0 pb-6 pt-6">
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


          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3">
              <button
              type="button"
              onClick={ob.restart}
              className="flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-ink">

                <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Start over
              </button>
              <button
              ref={readyButtonRef}
              type="button"
              onClick={() => setReadyOpen(true)}
              aria-haspopup="dialog"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-navy transition-colors duration-150 hover:bg-navy-50">

                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                I’m ready
              </button>
            </div>
          }
        </div>
      </main>

      <ReadyDialog
        open={readyOpen && ob.phase === 'chat'}
        summary={summary}
        onBuild={startBuild}
        onClose={() => setReadyOpen(false)}
        fallbackFocus={readyButtonRef} />

    </>
  );
}
