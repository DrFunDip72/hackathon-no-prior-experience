import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardPasteIcon, FileTextIcon, SparklesIcon } from 'lucide-react';
import { Logo } from '../components/Logo';
import { EmployerChatBubble } from '../components/employer/EmployerChatBubble';
import { EmployerComposer } from '../components/employer/EmployerComposer';
import { BuildingMatches } from '../components/employer/BuildingMatches';
import { StudentResultCard } from '../components/employer/StudentResultCard';
import { employerStepsFor } from '../data/employerSteps';
import { mockStudents } from '../data/mockStudents';
import { rankStudents } from '../utils/employerMatching';
import { readJobSource, stripDataUrl } from '../utils/jobReader';
import { splitList } from '../utils/text';
import type { JobSourceInput } from '../components/employer/EmployerComposer';
import type { EmployerStep, EmployerStepId } from '../data/employerSteps';
import type { JobExtract } from '../types/job';
import type { EmployerQuery } from '../types/employer';

type Phase = 'chat' | 'building' | 'results';
type Answers = Partial<Record<EmployerStepId, string>>;

/**
 * Employer side of the demo, built as the same pipeline as student onboarding
 * (src/pages/Onboarding.tsx + src/hooks/useOnboarding.ts, read for reference): upload a document,
 * send it to the same Gemini-backed /api/parse-resume endpoint (kind: 'job'), and pre-fill the rest
 * of the questions from what it finds, exactly as a resume pre-fills a student's roles/companies/
 * skills. No sign-in or verification yet -- "for now let us toggle" -- so this stays publicly
 * reachable.
 */
export function Employer() {
  const [extract, setExtract] = useState<JobExtract | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [notes, setNotes] = useState<Partial<Record<EmployerStepId, string>>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [editing, setEditing] = useState<EmployerStepId | null>(null);
  const [phase, setPhase] = useState<Phase>('chat');
  const endRef = useRef<HTMLDivElement>(null);

  // Recomputed from the extract every render, same as stepsFor(draft) on the student side: once the
  // posting states an employment type, that question drops out of the list entirely.
  const steps = employerStepsFor(extract);
  const answeredSteps = steps.slice(0, stepIndex);
  const activeIndex = editing ? steps.findIndex((s) => s.id === editing) : stepIndex;
  const activeStep = steps[activeIndex] ?? null;
  const complete = stepIndex >= steps.length;
  const progress = Math.min(stepIndex / steps.length, 1);

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

  /** The job-posting upload step: reads it with the AI reader, same shape as useOnboarding's submitSource. */
  const submitSource = async (input: JobSourceInput) => {
    const wasEditing = editing !== null;
    const result = await readJobSource(
      input.dataUrl ? { job: { pdfBase64: stripDataUrl(input.dataUrl) } } : { job: { text: input.text } }
    );
    let note: string;
    if (result.ok) {
      setExtract(result.data);
      const { companyName, jobTitle } = result.data;
      note = companyName || jobTitle ?
      `Got it: ${[companyName, jobTitle].filter(Boolean).join(' · ')}. I've filled in the next answers from it, so press Enter or Tab to keep each one or edit it.` :
      "Read it, but couldn't find a clear company or title -- I'll ask a few quick questions.";
    } else if (result.reason === 'unavailable') {
      note = "The AI reader isn't configured right now, so I'll ask a few quick questions instead.";
    } else {
      note = "I couldn't read that automatically, so I'll ask a few quick questions.";
    }
    setNotes((n) => ({ ...n, jobPosting: note }));
    record('jobPosting', input.fileName ?? 'Pasted text', wasEditing);
  };

  const initialFor = (step: EmployerStep): string => {
    if (answers[step.id] !== undefined) return answers[step.id]!;
    if (step.kind === 'text') return step.suggested;
    // The skills chips step pre-picks whatever the job-posting extract found.
    if (step.kind === 'chips' && step.id === 'skills') return (extract?.requiredSkills ?? []).join(', ');
    return '';
  };

  const query: EmployerQuery = {
    companyName: answers.company ?? '',
    jobTitle: answers.title ?? '',
    employmentType: (answers.employmentType as EmployerQuery['employmentType']) ?? (extract?.employmentType || ''),
    skills: splitList(answers.skills ?? ''),
    lookingFor: answers.lookingFor ?? ''
  };
  const results = phase === 'results' ? rankStudents(mockStudents, query) : [];

  const findMatches = () => {
    setPhase('building');
    setTimeout(() => setPhase('results'), 900);
  };

  const renderAnswer = (step: EmployerStep) => {
    const answer = answers[step.id];
    if (step.kind === 'upload') {
      if (!answer) return <span className="italic text-muted">Skipped</span>;
      const pasted = answer === 'Pasted text';
      return (
        <span className="flex items-center gap-2">
          {pasted ? <ClipboardPasteIcon className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" /> : <FileTextIcon className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />}
          <span className="break-all">{answer}</span>
        </span>);

    }
    if (!answer) return <span className="italic text-muted">Skipped</span>;
    return <span className="whitespace-pre-wrap break-words">{answer}</span>;
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
        <BuildingMatches usedExtract={Boolean(extract)} />
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
                setExtract(null);
                setNotes({});
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
            const note = notes[step.id];
            return (
              <div key={step.id} className="space-y-3">
                <EmployerChatBubble role="assistant">{step.prompt}</EmployerChatBubble>
                <EmployerChatBubble role="user" onEdit={() => setEditing(step.id)} isEditing={editing === step.id}>
                  {renderAnswer(step)}
                </EmployerChatBubble>
                {note && <EmployerChatBubble role="assistant">{note}</EmployerChatBubble>}
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
            onSubmitSource={submitSource}
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
