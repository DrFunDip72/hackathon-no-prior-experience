import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { employerStepsFor, type EmployerStepId } from '../data/employerSteps';
import { readJobSource, stripDataUrl } from '../utils/jobReader';
import { employerStore, matchesHref } from '../utils/employerStore';
import { splitList } from '../utils/text';
import type { InitialValue } from './useOnboarding';
import type { Answer, SourceSubmission } from '../types/onboarding';
import type { EmployerAccount, EmployerQuery, EmploymentType } from '../types/employer';
import type { JobExtract } from '../types/job';

type Answers = Partial<Record<EmployerStepId, Answer>>;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** "Got it: Product Manager Intern at Qualtrics, internship." */
function describeJob(x: JobExtract): string {
  const role = [x.jobTitle, x.companyName].filter(Boolean).join(' at ');
  return [role, x.employmentType.toLowerCase()].filter(Boolean).join(', ');
}

/**
 * The employer intake's state, the same shape as useOnboarding: the step list is recomputed from what the
 * AI reader found, the active step is the first one unanswered, and answers can be edited in place.
 */
export function useEmployerIntake() {
  const navigate = useNavigate();
  const [extract, setExtract] = useState<JobExtract | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const answersRef = useRef(answers);
  const [notes, setNotes] = useState<Partial<Record<EmployerStepId, string>>>({});
  const [pasted, setPasted] = useState(false);
  const [editing, setEditing] = useState<EmployerStepId | null>(null);
  const [phase, setPhase] = useState<'chat' | 'building' | 'account'>('chat');
  const roleIdRef = useRef<string | null>(null);

  const steps = employerStepsFor(extract, answers.title?.value);
  const openIndex = steps.findIndex((s) => !answers[s.id]);
  const complete = openIndex === -1;
  const answeredSteps = complete ? steps : steps.slice(0, openIndex);
  const activeStep = (editing ? steps.find((s) => s.id === editing) : steps[openIndex]) ?? null;
  const progress = answeredSteps.length / steps.length;

  const record = (id: EmployerStepId, answer: Answer) => {
    const next = { ...answersRef.current, [id]: answer };
    answersRef.current = next;
    setAnswers(next);
    setEditing(null);
  };

  const setNote = (id: EmployerStepId, note: string | null) =>
  setNotes((n) => {
    const next = { ...n };
    if (note) next[id] = note;else
    delete next[id];
    return next;
  });

  const submit = (value: string) => {
    if (activeStep) record(activeStep.id, { value, skipped: false });
  };

  const skip = () => {
    if (!activeStep) return;
    if (activeStep.id === 'jobPosting') {
      setExtract(null);
      setNote('jobPosting', null);
    }
    record(activeStep.id, { value: '', skipped: true });
  };

  /** The job posting: read by the same AI reader as a student's resume (POST /api/parse-resume, kind 'job'). */
  const submitSource = async (input: SourceSubmission) => {
    const result = await readJobSource(
      input.dataUrl ? { job: { pdfBase64: stripDataUrl(input.dataUrl) } } : { job: { text: input.text } }
    );
    const x = result.ok ? result.data : null;
    setExtract(x);
    setPasted(!input.dataUrl);
    setNote(
      'jobPosting',
      x && (x.companyName || x.jobTitle) ?
      `Got it: ${describeJob(x)}. I filled in what I could, so there’s just a little left.` :
      'I couldn’t read it automatically, so I’ll ask a few quick questions.'
    );
    record('jobPosting', { value: input.label, skipped: false });
  };

  const initialValueFor = (id: EmployerStepId): InitialValue => {
    const existing = answers[id];
    if (existing && !existing.skipped) return { value: existing.value, suggested: false };
    const read = id === 'skills' ? extract?.requiredSkills.join(', ') ?? '' : '';
    return { value: read, suggested: Boolean(read) };
  };

  const value = (id: EmployerStepId) => answers[id]?.skipped ? '' : answers[id]?.value ?? '';
  const query: EmployerQuery = {
    companyName: value('company') || extract?.companyName || '',
    jobTitle: value('title') || extract?.jobTitle || '',
    employmentType: (value('employmentType') || extract?.employmentType || '') as EmploymentType,
    skills: splitList(value('skills')),
    lookingFor: value('lookingFor') || extract?.summary || ''
  };

  const restart = () => {
    setEditing(null);
    setExtract(null);
    setNotes({});
    answersRef.current = {};
    setAnswers({});
  };

  /** Role saved: land on its tab of ranked students. */
  const finish = () => {
    navigate(matchesHref(roleIdRef.current), { replace: true });
    toast.success('Here are your matches', { description: 'Students who opted in, ranked by fit for this role.' });
  };

  const build = async () => {
    setPhase('building');
    // Back from the account step and built again: replace this intake's role rather than adding a second tab.
    if (roleIdRef.current) employerStore.removeRole(roleIdRef.current);
    roleIdRef.current = employerStore.addRole(query).id;
    await wait(1000);
    // Already has a recruiter account in this browser: straight to the matches, as a signed-in student goes to events.
    if (employerStore.account()) finish();else
    setPhase('account');
  };

  const saveAccount = async (account: EmployerAccount) => {
    await wait(600);
    employerStore.saveAccount(account);
  };

  return {
    extract,
    answers,
    notes,
    pasted,
    editing,
    setEditing,
    phase,
    backToChat: () => setPhase('chat'),
    complete,
    answeredSteps,
    activeStep,
    progress,
    query,
    submit,
    skip,
    submitSource,
    initialValueFor,
    restart,
    build,
    saveAccount,
    finish
  };
}
