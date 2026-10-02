import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SparklesIcon } from 'lucide-react';
import { Logo } from '../components/Logo';
import { EmployerChatBubble } from '../components/employer/EmployerChatBubble';
import { EmployerComposer } from '../components/employer/EmployerComposer';
import { BuildingMatches } from '../components/employer/BuildingMatches';
import { StudentResultCard } from '../components/employer/StudentResultCard';
import { employerSteps } from '../data/employerSteps';
import { mockStudents } from '../data/mockStudents';
import { rankStudents } from '../utils/employerMatching';
import type { EmployerStepId } from '../data/employerSteps';
import type { EmployerQuery } from '../types/employer';

type Phase = 'chat' | 'building' | 'results';
type Answers = Partial<Record<EmployerStepId, string>>;

/**
 * Employer side of the demo, built as the same one-question-at-a-time chat flow as student
 * onboarding (its own components under src/components/employer/, not imported from
 * src/components/onboarding/ -- that folder is owned by a parallel session). No sign-in or
 * verification yet -- "for now let us toggle" -- so this stays publicly reachable.
 */
export function Employer() {
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [editing, setEditing] = useState<EmployerStepId | null>(null);
  const [phase, setPhase] = useState<Phase>('chat');
  const endRef = useRef<HTMLDivElement>(null);

  const answeredSteps = employerSteps.slice(0, stepIndex);
  const activeIndex = editing ? employerSteps.findIndex((s) => s.id === editing) : stepIndex;
  const activeStep = employerSteps[activeIndex] ?? null;
  const complete = stepIndex >= employerSteps.length;
  const progress = Math.min(stepIndex / employerSteps.length, 1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [stepIndex, editing]);

  const record = (id: EmployerStepId, value: string, wasEditing: boolean) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    if (wasEditing) setEditing(null);else
    setStepIndex((i) => i + 1);
  };

  const submit = (value: string) => {
    if (activeStep) record(activeStep.id, value, editing !== null);
  };

  const skip = () => {
    if (activeStep) record(activeStep.id, '', editing !== null);
  };

  const initialFor = (step: typeof employerSteps[number]): string => answers[step.id] ?? step.suggested;

  const query: EmployerQuery = {
    companyName: answers.company ?? '',
    jobTitle: answers.title ?? '',
    lookingFor: answers.lookingFor ?? '',
    jobDescription: answers.description ?? ''
  };
  const results = phase === 'results' ? rankStudents(mockStudents, query) : [];

  const findMatches = () => {
    setPhase('building');
    setTimeout(() => setPhase('results'), 900);
  };

  const header =
  <header className="bg-white">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-6">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-2">
          <span className="hidden rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy sm:inline-block">
            Employer view
          </span>
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
            Back to student site
          </Link>
        </nav>
      </div>
    </header>;


  if (phase === 'building') {
    return (
      <div className="flex min-h-screen w-full flex-col bg-white">
        {header}
        <BuildingMatches />
      </div>);

  }

  if (phase === 'results') {
    return (
      <div className="min-h-screen w-full bg-canvas">
        {header}
        <main className="mx-auto max-w-2xl px-6 py-8">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Matches for {query.jobTitle} at {query.companyName}
            </h1>
            <button
              type="button"
              onClick={() => {
                setPhase('chat');
                setStepIndex(0);
                setAnswers({});
              }}
              className="shrink-0 text-sm font-medium text-navy hover:underline">

              Start over
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">
            {results.filter((r) => r.score > 0).length} of {results.length} students have a real match.
          </p>
          <div className="mt-5 space-y-3">
            {results.map((item) => <StudentResultCard key={item.student.id} item={item} />)}
          </div>
        </main>
      </div>);

  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      {header}
      <div className="h-0.5 w-full bg-canvas" role="progressbar" aria-label="Employer intake progress" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-navy transition-[width] duration-300 ease-out" style={{ width: `${progress * 100}%` }} />
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex-1 space-y-6 py-10" aria-live="polite">
          <EmployerChatBubble role="assistant">
            <p>
              Tell me about the role, and I'll match it against campus students -- their resume, their target companies, the
              role they're after, and events they've attended.
            </p>
          </EmployerChatBubble>

          {answeredSteps.map((step) => {
            const answer = answers[step.id];
            return (
              <div key={step.id} className="space-y-3">
                <EmployerChatBubble role="assistant">{step.prompt}</EmployerChatBubble>
                <EmployerChatBubble role="user" onEdit={() => setEditing(step.id)} isEditing={editing === step.id}>
                  {answer ? <span className="whitespace-pre-wrap break-words">{answer}</span> : <span className="italic text-muted">Skipped</span>}
                </EmployerChatBubble>
              </div>);

          })}

          {!complete && activeStep && !editing &&
          <EmployerChatBubble key={activeStep.id} role="assistant">
              {activeStep.prompt}
            </EmployerChatBubble>
          }

          {complete && !editing &&
          <EmployerChatBubble role="assistant">Got it. Ready to see who's a fit?</EmployerChatBubble>
          }
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-0 bg-white pb-6 pt-2">
          {activeStep && (!complete || editing) ?
          <EmployerComposer
            key={`${activeStep.id}-${editing ?? 'new'}`}
            step={activeStep}
            initial={initialFor(activeStep)}
            isEditing={Boolean(editing)}
            onSubmit={submit}
            onSkip={skip}
            onCancelEdit={() => setEditing(null)} /> :


          <div className="flex items-center justify-end rounded-2xl border border-line bg-white px-4 py-3">
              <button
              type="button"
              onClick={findMatches}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">

                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                Find matching students
              </button>
            </div>
          }
        </div>
      </main>
    </div>);

}
