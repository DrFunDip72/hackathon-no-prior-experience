import React, { useEffect, useRef, useState } from 'react';
import { ArrowRightIcon, ArrowUpIcon, ClipboardPasteIcon, FileTextIcon, ImagePlusIcon, Loader2Icon, XIcon } from 'lucide-react';
import { isPdf, readAsDataUrl, resizeImage } from '../../utils/files';
import { takePendingResume } from '../../utils/pendingResume';
import { splitList, unique } from '../../utils/text';
import type { OnboardingDraft, OnboardingStep, SourceSubmission } from '../../types/onboarding';
import type { InitialValue } from '../../hooks/useOnboarding';
import { PdfDropZone } from './PdfDropZone';
import { LinkedInPdfHelp } from './LinkedInPdfHelp';

interface ComposerProps {
  step: OnboardingStep;
  initial: InitialValue;
  isEditing: boolean;
  onSubmit: (value: string, extra?: Partial<OnboardingDraft>) => void;
  /** Resume and LinkedIn: saves the input and waits for the AI reader. */
  onSubmitSource: (input: SourceSubmission) => Promise<void>;
  onSkip: () => void;
  onCancelEdit: () => void;
}

const LINKEDIN_RE = /^(https?:\/\/)?([\w-]+\.)*linkedin\.com\/in\/[\w%-]+\/?/i;
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_PASTE = 80;

const withProtocol = (url: string) => !url || /^https?:\/\//i.test(url) ? url : `https://${url}`;

export function Composer({ step, initial, isEditing, onSubmit, onSubmitSource, onSkip, onCancelEdit }: ComposerProps) {
  const [value, setValue] = useState(initial.value);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState('');
  const [attachment, setAttachment] = useState<{name: string;dataUrl: string;} | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Chips: options the student picked, plus anything typed under "Something else".
  const options = step.options ?? [];
  const initialList = splitList(initial.value);
  const [picked, setPicked] = useState(() => initialList.filter((v) => options.includes(v)));
  const [other, setOther] = useState(() => initialList.filter((v) => !options.includes(v)).join(', '));
  const [showOther, setShowOther] = useState(() => other !== '');

  const knownLinkedin = step.kind === 'linkedin' && Boolean(step.knownUrl);
  const isTyped = step.kind === 'text' || step.kind === 'linkedin' && !knownLinkedin;
  const readingLabel = step.kind === 'resume' ? 'Reading your resume…' : 'Reading your LinkedIn…';

  const read = async (input: SourceSubmission) => {
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

  const loadPdf = async (file: File): Promise<string | null> => {
    setError(null);
    if (!isPdf(file)) {
      setError('Please upload a PDF. Word docs and images aren’t supported yet.');
      return null;
    }
    if (file.size > MAX_BYTES) {
      setError('That file is over 5 MB. Try exporting a smaller PDF.');
      return null;
    }
    try {
      return await readAsDataUrl(file);
    } catch {
      setError('We couldn’t open that file. Try another.');
      return null;
    }
  };

  const validUrl = (v: string): boolean => {
    if (step.validate === 'linkedin' && !LINKEDIN_RE.test(v)) {
      setError('That doesn’t look like a LinkedIn profile. It should look like linkedin.com/in/your-name.');
      return false;
    }
    return true;
  };

  const submitChips = () => {
    const chosen = unique([...options.filter((o) => picked.includes(o)), ...(showOther ? splitList(other) : [])]);
    if (!chosen.length) return setError('Pick at least one, or skip this one for now.');
    onSubmit(chosen.join(', '));
  };

  const togglePick = (option: string) => {
    setError(null);
    setPicked((p) => p.includes(option) ? p.filter((o) => o !== option) : [...p, option]);
  };

  const submitText = () => {
    const v = step.knownUrl ?? value.trim();
    if (step.kind === 'linkedin') {
      const text = pasting ? pasted.trim() : '';
      if (!v && !attachment && !text) return setError('Add your LinkedIn URL or PDF, or skip this one for now.');
      if (v && !step.knownUrl && !validUrl(v)) return;
      if (pasting && text && text.length < MIN_PASTE) return setError('That’s a bit short. Paste your whole LinkedIn profile, or clear it.');
      void read({
        step: 'linkedin',
        label: withProtocol(v),
        fileName: attachment?.name,
        dataUrl: attachment?.dataUrl,
        text: !attachment && text ? text : undefined
      });
      return;
    }
    if (!v) return setError('Type an answer, or skip this one for now.');
    onSubmit(v);
  };

  const submitPastedResume = () => {
    const text = pasted.trim();
    if (text.length < MIN_PASTE) return setError('That’s a bit short for a resume. Paste the whole thing, or skip for now.');
    void read({ step: 'resume', label: 'Pasted resume text', text });
  };

  const handlePhoto = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) return setError('Choose a JPG or PNG image.');
    setBusy(true);
    try {
      onSubmit('Photo added', { photoUrl: await resizeImage(file) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That image couldn’t be used.');
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (step.kind === 'photo') return handlePhoto(file);
    const dataUrl = await loadPdf(file);
    if (!dataUrl) return;
    if (step.kind === 'resume') return read({ step: 'resume', label: file.name, fileName: file.name, dataUrl });
    setAttachment({ name: file.name, dataUrl });
    setPasting(false);
  };

  // A resume picked on the landing page: start reading it as soon as the resume step is on screen.
  useEffect(() => {
    if (step.kind !== 'resume') return;
    const file = takePendingResume();
    if (file) void onFile(file);
    // Runs once per mount; the pending file is consumed on first read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photoInput =
  <input
    ref={fileRef}
    type="file"
    className="sr-only"
    accept="image/*"
    onChange={(e) => {
      void onFile(e.target.files?.[0]);
      e.target.value = '';
    }}
    tabIndex={-1}
    aria-hidden="true" />;



  const pasteBox = (label: string, placeholder: string, onSend?: () => void) =>
  <div className="mt-2">
      <label htmlFor={`paste-${step.id}`} className="sr-only">
        {label}
      </label>
      <textarea
      id={`paste-${step.id}`}
      autoFocus
      rows={6}
      value={pasted}
      disabled={busy}
      onChange={(e) => {
        setPasted(e.target.value);
        if (error) setError(null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          (onSend ?? submitText)();
        }
      }}
      placeholder={placeholder}
      className="w-full resize-y rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-60" />

    </div>;


  const linkButton = 'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink disabled:opacity-60';

  const footerHint = busy ?
  '' :
  knownLinkedin ?
  'Optional' :
  step.kind === 'chips' ?
  initial.suggested ? 'Picked from what you shared. Tap to change.' : 'Pick as many as you like' :
  initial.suggested && value === initial.value ?
  'Filled in from what you shared. Press Enter to keep it, or edit.' :
  step.kind === 'resume' && pasting ?
  'Ctrl + Enter to send' :
  isTyped ?
  'Enter to send' :
  '';

  return (
    <div className="rounded-2xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]">
      {isEditing &&
      <div className="mb-2 flex items-center justify-between rounded-lg bg-navy-50 px-3 py-1.5 text-xs text-navy">
          <span className="font-medium">Editing your answer</span>
          <button type="button" onClick={onCancelEdit} className="flex items-center gap-1 hover:underline">
            <XIcon className="h-3 w-3" aria-hidden="true" /> Cancel
          </button>
        </div>
      }

      {step.kind === 'resume' &&
      <>
          {busy ?
        <div className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 bg-canvas px-4 py-8 text-center" role="status">
              <Loader2Icon className="h-5 w-5 animate-spin text-navy" aria-hidden="true" />
              <span className="text-sm font-medium text-ink">{readingLabel}</span>
            </div> :
        pasting ?
        <>
              {pasteBox('Paste your resume text', 'Paste the full text of your resume here…', submitPastedResume)}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button type="button" onClick={() => setPasting(false)} className={linkButton}>
                  <FileTextIcon className="h-4 w-4" aria-hidden="true" />
                  Upload a PDF instead
                </button>
                <button
              type="button"
              onClick={submitPastedResume}
              aria-label="Send resume text"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors duration-150 hover:bg-navy">

                  <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </> :

        <>
              <PdfDropZone what="resume" helper={step.helper} onFile={(file) => void onFile(file)} />
              <div className="pt-1">
                <button type="button" onClick={() => setPasting(true)} className={linkButton}>
                  <ClipboardPasteIcon className="h-4 w-4" aria-hidden="true" />
                  or paste your resume text
                </button>
              </div>
            </>
        }
        </>
      }

      {step.kind === 'photo' &&
      <>
          {photoInput}
          <div className="flex flex-wrap items-center gap-2 p-1">
            <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy disabled:opacity-60">

              {busy ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlusIcon className="h-4 w-4" aria-hidden="true" />}
              Upload a photo
            </button>
            <button
            type="button"
            onClick={onSkip}
            className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">

              Add later
            </button>
          </div>
        </>
      }

      {step.kind === 'choice' &&
      <div className="flex flex-wrap gap-2 p-1">
          {step.options?.map((option) =>
        <button
          key={option}
          type="button"
          onClick={() => onSubmit(option)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-150 ${
          value === option ? 'border-navy bg-navy-50 text-navy' : 'border-line text-ink hover:border-navy-200 hover:bg-canvas'}`
          }>

              {option}
            </button>
        )}
          {step.helper && <p className="w-full px-1 pt-1 text-xs text-muted">{step.helper}</p>}
        </div>
      }

      {step.kind === 'chips' &&
      <div className="p-1">
          <div className="flex flex-wrap gap-2" role="group" aria-label={step.prompt}>
            {options.map((option) => {
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
              <label htmlFor={`other-${step.id}`} className="sr-only">
                {step.placeholder}
              </label>
              <input
            id={`other-${step.id}`}
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
          <div className="flex justify-end pt-3">
            <button
            type="button"
            onClick={submitChips}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">

              Continue
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      }

      {isTyped &&
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitText();
        }}
        className="flex items-end gap-2">

          <label htmlFor={`answer-${step.id}`} className="sr-only">
            {step.prompt}
          </label>
          <textarea
          id={`answer-${step.id}`}
          autoFocus={!pasting}
          rows={step.multiline ? 3 : 1}
          value={value}
          disabled={busy}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submitText();
            }
          }}
          placeholder={step.placeholder}
          aria-invalid={Boolean(error)}
          className="min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none disabled:opacity-60" />

          <button
          type="submit"
          disabled={busy}
          aria-label="Send answer"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors duration-150 hover:bg-navy disabled:opacity-60">

            {busy ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />}
          </button>
        </form>
      }

      {step.kind === 'linkedin' &&
      <div className={knownLinkedin ? 'p-1' : 'border-t border-line pt-2'}>
          {attachment ?
        <div className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-sm text-ink">
              <span className="flex min-w-0 items-center gap-2">
                <FileTextIcon className="h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
                <span className="truncate">{attachment.name}</span>
              </span>
              <button
            type="button"
            disabled={busy}
            onClick={() => setAttachment(null)}
            aria-label="Remove LinkedIn PDF"
            className="shrink-0 rounded p-1 text-muted hover:text-ink">

                <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div> :

        <>
              <PdfDropZone what="LinkedIn PDF" helper="PDF, up to 5 MB" size="compact" disabled={busy} onFile={(file) => void onFile(file)} />
              <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                <LinkedInPdfHelp />
                <button type="button" disabled={busy} onClick={() => setPasting((p) => !p)} className={linkButton}>
                  <ClipboardPasteIcon className="h-4 w-4" aria-hidden="true" />
                  {pasting ? 'Hide pasted text' : 'or paste profile text'}
                </button>
              </div>
            </>
        }
          {pasting && !attachment && pasteBox('Paste your LinkedIn profile text', 'Paste your LinkedIn About, Experience, and Skills sections…')}
          <p className="px-1 pt-1.5 text-xs text-muted">{step.helper}</p>
          {busy &&
        <p className="flex items-center gap-2 px-1 pt-1.5 text-sm font-medium text-ink" role="status">
              <Loader2Icon className="h-4 w-4 animate-spin text-navy" aria-hidden="true" />
              {attachment || pasted.trim() ? readingLabel : 'Saving…'}
            </p>
        }
          {knownLinkedin &&
        <div className="flex justify-end pt-3">
              <button
            type="button"
            disabled={busy}
            onClick={submitText}
            className="flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy disabled:opacity-60">

                {attachment || pasting && pasted.trim() ? 'Read it and continue' : 'Continue'}
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
        }
        </div>
      }

      <div className="mt-1 flex min-h-[28px] items-center justify-between gap-3 px-1">
        {error ?
        <p role="alert" className="text-xs text-danger">
            {error}
          </p> :

        <span className="text-xs text-muted">{footerHint}</span>
        }
        {step.kind !== 'photo' && step.id !== 'visibility' && !knownLinkedin &&
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="shrink-0 text-xs font-medium text-muted transition-colors duration-150 hover:text-ink disabled:opacity-60">

            Skip for now
          </button>
        }
      </div>
    </div>);

}
