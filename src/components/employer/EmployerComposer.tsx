import React, { useRef, useState } from 'react';
import { ArrowRightIcon, ArrowUpIcon, ClipboardPasteIcon, FileTextIcon, Loader2Icon } from 'lucide-react';
import { PdfDropZone } from '../onboarding/PdfDropZone';
import { isPdf, readAsDataUrl } from '../../utils/files';
import { splitList, unique } from '../../utils/text';
import type { EmployerStep } from '../../data/employerSteps';

export interface JobSourceInput {
  fileName?: string;
  dataUrl?: string;
  text?: string;
}

interface EmployerComposerProps {
  step: EmployerStep;
  /** Pre-filled recommended text for a text/chips step, or the previously chosen option when editing a choice step. '' means no suggestion exists. */
  initial: string;
  isEditing: boolean;
  onSubmit: (value: string) => void;
  /** Resume-equivalent: saves the upload and waits for the AI reader. Required when step.kind === 'upload'. */
  onSubmitSource: (input: JobSourceInput) => Promise<void>;
  onSkip: () => void;
  onCancelEdit: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const MIN_PASTE = 80;

/**
 * Same interactions as the student onboarding composer (src/components/onboarding/Composer.tsx):
 * an 'upload' step is a PDF drop zone with a paste-text fallback that calls the AI reader and shows
 * a loading state; a 'chips' step is multi-select toggle buttons plus a freeform "Something else";
 * a 'choice' step is click-to-select buttons that answer instantly; a 'text' step pre-fills a
 * suggested answer rather than leaving it as a placeholder, so accepting it is one keystroke.
 *
 * New here (not in the student composer): quick-fill chips on a text step autofill the field on
 * click, and Tab (not just Enter) accepts a field's text and advances.
 */
export function EmployerComposer({ step, initial, isEditing, onSubmit, onSubmitSource, onSkip, onCancelEdit }: EmployerComposerProps) {
  const [value, setValue] = useState(step.kind === 'text' ? initial : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Chips: options the employer picked, plus anything typed under "Something else" -- same split as
  // Composer.tsx's chips kind (roles/companies/industries on the student side).
  const chipOptions = step.kind === 'chips' ? step.options : [];
  const initialList = splitList(initial);
  const [picked, setPicked] = useState<string[]>(() => initialList.filter((v) => chipOptions.includes(v)));
  const [other, setOther] = useState(() => initialList.filter((v) => !chipOptions.includes(v)).join(', '));
  const [showOther, setShowOther] = useState(() => other !== '');

  const card = 'rounded-2xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]';
  const linkButton = 'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink disabled:opacity-60';
  const editingBanner = isEditing &&
  <div className="mb-2 flex items-center justify-between rounded-lg bg-navy-50 px-3 py-1.5 text-xs text-navy">
      <span className="font-medium">Editing your answer</span>
      <button type="button" onClick={onCancelEdit} className="hover:underline">
        Cancel
      </button>
    </div>;


  if (step.kind === 'upload') {
    const read = async (input: JobSourceInput) => {
      setError(null);
      setBusy(true);
      try {
        await onSubmitSource(input);
      } catch {
        setError('Something went wrong reading that. Try again, or skip for now.');
      } finally {
        setBusy(false);
      }
    };

    const onFile = async (file: File) => {
      setError(null);
      if (!isPdf(file)) {
        setError('Please upload a PDF.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError('That file is over 5 MB. Try exporting a smaller PDF.');
        return;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        void read({ fileName: file.name, dataUrl });
      } catch {
        setError("We couldn't open that file. Try another.");
      }
    };

    const submitPasted = () => {
      const text = pasted.trim();
      if (text.length < MIN_PASTE) {
        setError("That's a bit short. Paste the whole posting, or clear it.");
        return;
      }
      void read({ text });
    };

    return (
      <div className={card}>
        {editingBanner}
        {busy ?
        <div className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 bg-canvas px-4 py-8 text-center" role="status">
            <Loader2Icon className="h-5 w-5 animate-spin text-navy" aria-hidden="true" />
            <span className="text-sm font-medium text-ink">Reading the posting…</span>
          </div> :
        pasting ?
        <>
            <label htmlFor="job-paste" className="sr-only">
              Paste the job posting
            </label>
            <textarea
            id="job-paste"
            autoFocus
            rows={6}
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submitPasted();
              }
            }}
            placeholder="Paste the job posting or a company/role blurb here…"
            className="w-full resize-y rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20" />

            <div className="flex items-center justify-between gap-2 pt-1">
              <button type="button" onClick={() => setPasting(false)} className={linkButton}>
                <FileTextIcon className="h-4 w-4" aria-hidden="true" />
                Upload a PDF instead
              </button>
              <button
              type="button"
              onClick={submitPasted}
              aria-label="Send posting text"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors duration-150 hover:bg-navy">

                <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </> :

        <>
            <PdfDropZone what="job posting" helper={step.helper} onFile={(file) => void onFile(file)} />
            <div className="pt-1">
              <button type="button" onClick={() => setPasting(true)} className={linkButton}>
                <ClipboardPasteIcon className="h-4 w-4" aria-hidden="true" />
                or paste the text
              </button>
            </div>
          </>
        }

        <div className="mt-1 flex min-h-[28px] items-center justify-between gap-3 px-1">
          {error ?
          <p role="alert" className="text-xs text-danger">
              {error}
            </p> :

          <span className="text-xs text-muted">{busy ? '' : 'Optional, but the rest fills in faster with it'}</span>
          }
          <button type="button" onClick={onSkip} disabled={busy} className="shrink-0 text-xs font-medium text-muted transition-colors duration-150 hover:text-ink disabled:opacity-60">
            Skip for now
          </button>
        </div>
      </div>);

  }

  if (step.kind === 'choice') {
    return (
      <div className={card}>
        {editingBanner}
        <div className="flex flex-wrap gap-2 p-1" role="group" aria-label={step.prompt}>
          {step.options.map((option) =>
          <button
            key={option}
            type="button"
            onClick={() => onSubmit(option)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-150 ${
            option === initial ? 'border-navy bg-navy-50 text-navy' : 'border-line text-ink hover:border-navy-200 hover:bg-canvas'}`
            }>

              {option}
            </button>
          )}
        </div>
      </div>);

  }

  if (step.kind === 'chips') {
    const submitChips = () => {
      const chosen = unique([...chipOptions.filter((o) => picked.includes(o)), ...(showOther ? splitList(other) : [])]);
      if (!chosen.length) {
        setError('Pick at least one, or skip this one for now.');
        return;
      }
      setError(null);
      onSubmit(chosen.join(', '));
    };

    const togglePick = (option: string) => {
      setError(null);
      setPicked((p) => p.includes(option) ? p.filter((o) => o !== option) : [...p, option]);
    };

    return (
      <div className={card}>
        {editingBanner}
        <div className="p-1">
          <div className="flex flex-wrap gap-2" role="group" aria-label={step.prompt}>
            {chipOptions.map((option) => {
              const on = picked.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={on}
                  onClick={() => togglePick(option)}
                  className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
                  on ? 'border-navy bg-navy-50 text-navy' : 'border-line text-ink hover:border-navy-200 hover:bg-canvas'}`
                  }>

                  {option}
                </button>);

            })}
            <button
              type="button"
              aria-pressed={showOther}
              onClick={() => setShowOther((s) => !s)}
              className={`rounded-lg border border-dashed px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
              showOther ? 'border-navy bg-navy-50 text-navy' : 'border-line text-muted hover:border-navy-200 hover:text-ink'}`
              }>

              Something else
            </button>
          </div>
          {showOther &&
          <div className="mt-2">
              <label htmlFor={`employer-other-${step.id}`} className="sr-only">
                {step.placeholder}
              </label>
              <input
              id={`employer-other-${step.id}`}
              autoFocus
              value={other}
              onChange={(e) => {
                setOther(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitChips();
                }
              }}
              placeholder={step.placeholder}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20" />

            </div>
          }
          <div className="mt-1 flex min-h-[28px] items-center justify-between gap-3 px-1 pt-2">
            {error ?
            <p role="alert" className="text-xs text-danger">
                {error}
              </p> :

            <span className="text-xs text-muted">Pick as many as apply, or add your own</span>
            }
            <button
              type="button"
              onClick={submitChips}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">

              Continue
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>);

  }

  // step.kind === 'text'
  const submit = () => {
    const v = value.trim();
    if (!v) {
      if (step.optional) return onSkip();
      setError(step.chips ? 'Type an answer, or click one of the options below.' : 'Type an answer, or press Tab to use the example.');
      return;
    }
    onSubmit(v);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const wasSuggested = initial !== '' && value === initial;

  return (
    <div className={card}>
      {editingBanner}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2">

        <label htmlFor={`employer-answer-${step.id}`} className="sr-only">
          {step.prompt}
        </label>
        <textarea
          ref={textareaRef}
          id={`employer-answer-${step.id}`}
          autoFocus
          rows={step.multiline ? 3 : 1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={step.placeholder}
          aria-invalid={Boolean(error)}
          className="min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none" />

        <button
          type="submit"
          aria-label="Send answer"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors duration-150 hover:bg-navy">

          <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      {step.chips &&
      <div className="flex flex-wrap gap-1.5 px-1 pt-2">
          {step.chips.map((chip) =>
        <button
          key={chip}
          type="button"
          onClick={() => {
            setValue(chip);
            setError(null);
            // Clicking a chip shouldn't strand focus on the chip itself -- back to the field, so
            // Tab/Enter immediately send what was just filled in instead of cycling to the next chip.
            textareaRef.current?.focus();
          }}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
          value === chip ? 'border-navy bg-navy-50 text-navy' : 'border-line text-muted hover:border-navy-200 hover:text-ink'}`
          }>

            {chip}
          </button>
        )}
        </div>
      }

      <div className="mt-1 flex min-h-[28px] items-center justify-between gap-3 px-1">
        {error ?
        <p role="alert" className="text-xs text-danger">
            {error}
          </p> :

        <span className="text-xs text-muted">
            {wasSuggested ?
          'Example filled in. Press Enter or Tab to use it, or edit it first.' :
          step.chips ?
          'Click an option to fill it in, or type your own. Enter or Tab to send.' :
          'Enter or Tab to send'}
          </span>
        }
        {step.optional &&
        <button type="button" onClick={onSkip} className="shrink-0 text-xs font-medium text-muted transition-colors duration-150 hover:text-ink">
            Skip for now
          </button>
        }
      </div>
    </div>);

}
