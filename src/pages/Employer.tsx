import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ClipboardPasteIcon, FileTextIcon, RotateCcwIcon, SparklesIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { HeroBackground } from '../components/landing/HeroBackground';
import { ChatBubble } from '../components/onboarding/ChatBubble';
import { Composer } from '../components/onboarding/Composer';
import { BuildingProfile } from '../components/onboarding/BuildingProfile';
import { AccountStep } from '../components/onboarding/AccountStep';
import { ReadyDialog } from '../components/onboarding/ReadyDialog';
import { useEmployerIntake } from '../hooks/useEmployerIntake';
import type { EmployerStep } from '../data/employerSteps';

/** Gap kept between the newest message and the top of the pinned composer. */
const COMPOSER_GAP = 12;

/**
 * Employer sign-up: the same page, chat, composer, ready dialog, building screen and account step as
 * student onboarding (src/pages/Onboarding.tsx), driven by useEmployerIntake instead of useOnboarding.
 * The job posting takes the resume's place: the AI reader fills in what it can and only the rest is asked.
 */
export function Employer() {
  const intake = useEmployerIntake();
  const reduceMotion = useReducedMotion();
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const readyButtonRef = useRef<HTMLButtonElement>(null);
  const firstScroll = useRef(true);
  const [readyOpen, setReadyOpen] = useState(false);
  const { answeredSteps, answers, notes, query } = intake;

  // Keep the newest message (or the answer being edited) and the composer in view, as onboarding does.
  const scrollKey = [answeredSteps.length, intake.activeStep?.id, intake.editing, intake.complete].join('|');
  useEffect(() => {
    const target = intake.editing ? document.getElementById(`step-${intake.editing}`) : endRef.current;
    if (intake.phase !== 'chat' || !target) return;
    target.style.scrollMarginBottom = `${(composerRef.current?.offsetHeight ?? 0) + COMPOSER_GAP}px`;
    const instant = firstScroll.current || reduceMotion || document.hidden;
    target.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'end' });
    firstScroll.current = false;
  }, [scrollKey, intake.phase, reduceMotion]);

  const readyNow = intake.complete && !intake.editing;
  useEffect(() => {
    if (!readyNow) {
      setReadyOpen(false);
      return;
    }
    const t = setTimeout(() => setReadyOpen(true), reduceMotion ? 0 : 450);
    return () => clearTimeout(t);
  }, [readyNow, reduceMotion]);

  const page = (children: React.ReactNode) =>
  <div className="relative isolate flex min-h-screen w-full flex-col bg-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <HeroBackground />
      </div>
      <AppHeader audience="employer" />
      {children}
    </div>;


  if (intake.phase === 'building') {
    return page(<BuildingProfile usedResume={Boolean(intake.extract)} title="Finding your matches" lastStep="Ranking students who opted in" />);
  }

  if (intake.phase === 'account') {
    return page(
      <AccountStep
        onSave={intake.saveAccount}
        onCreated={intake.finish}
        onBack={intake.backToChat}
        copy={{
          title: 'Save your search',
          blurb: `Your matches for ${query.jobTitle || 'this role'} are ready. Create a recruiter account to see them and reach out.`,
          submitLabel: 'Create account and see matches',
          namePlaceholder: 'Alex Rivera',
          emailPlaceholder: 'you@company.com'
        }} />

    );
  }

  const renderAnswer = (step: EmployerStep) => {
    const answer = answers[step.id];
    if (!answer || answer.skipped) return <span className="italic text-muted">Skipped</span>;
    if (step.kind === 'resume') {
      return (
        <span className="flex items-center gap-2">
          {intake.pasted ?
          <ClipboardPasteIcon className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" /> :
          <FileTextIcon className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
          }
          <span className="break-all">{answer.value}</span>
        </span>);

    }
    return <span className="whitespace-pre-wrap break-words">{answer.value}</span>;
  };

  const role = [query.jobTitle, query.companyName].filter(Boolean).join(' at ');
  const summary = `I’ll rank every student who opted in to being found${role ? ` against ${role}` : ''}${
  query.skills.length ? `, weighing ${query.skills.slice(0, 3).join(', ')}` : ''}. You can change the search anytime.`;

  return page(
    <>
      <div className="h-0.5 w-full bg-canvas" role="progressbar" aria-label="Sign-up progress" aria-valuenow={Math.round(intake.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-navy transition-[width] duration-300 ease-out" style={{ width: `${intake.progress * 100}%` }} />
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex-1 space-y-6 py-10" aria-live="polite">
          <ChatBubble role="assistant">
            <p>
              Hi there. Tell me about the role you’re hiring for, and I’ll rank BYU students who chose to be found by their skills,
              the roles they want, and the companies they’re interested in. Skip anything you don’t have handy.
            </p>
          </ChatBubble>

          {answeredSteps.map((step) => {
            const note = notes[step.id];
            return (
              <div key={step.id} id={`step-${step.id}`} className="space-y-3">
                <ChatBubble role="assistant">{step.prompt}</ChatBubble>
                <ChatBubble role="user" onEdit={() => intake.setEditing(step.id)} isEditing={intake.editing === step.id}>
                  {renderAnswer(step)}
                </ChatBubble>
                {note && <ChatBubble role="assistant">{note}</ChatBubble>}
              </div>);

          })}

          {!intake.complete && intake.activeStep && !intake.editing &&
          <ChatBubble key={intake.activeStep.id} role="assistant">
              {intake.activeStep.prompt}
            </ChatBubble>
          }

          {intake.complete && !intake.editing &&
          <ChatBubble role="assistant">That’s everything I need. Ready to see who fits?</ChatBubble>
          }
          <div ref={endRef} aria-hidden="true" />
        </div>

        <div ref={composerRef} className="sticky bottom-0 z-10 bg-gradient-to-t from-white from-70% to-white/0 pb-6 pt-6">
          {intake.activeStep && (!intake.complete || intake.editing) ?
          <Composer
            key={`${intake.activeStep.id}-${intake.editing ?? 'new'}`}
            step={intake.activeStep}
            initial={intake.initialValueFor(intake.activeStep.id)}
            isEditing={Boolean(intake.editing)}
            onSubmit={intake.submit}
            onSubmitSource={intake.submitSource}
            onSkip={intake.skip}
            onCancelEdit={() => intake.setEditing(null)} /> :


          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3">
              <button
              type="button"
              onClick={intake.restart}
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
        open={readyOpen && intake.phase === 'chat'}
        summary={summary}
        actionLabel="Find matching students"
        onBuild={() => {
          setReadyOpen(false);
          void intake.build();
        }}
        onClose={() => setReadyOpen(false)}
        fallbackFocus={readyButtonRef} />

    </>
  );
}
