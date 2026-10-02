import React, { useRef, useState } from 'react';
import { ArrowUpIcon, FileTextIcon, ImagePlusIcon, Loader2Icon, XIcon } from 'lucide-react';
import { isPdf, readAsDataUrl, resizeImage } from '../../utils/files';
import type { OnboardingDraft, OnboardingStep } from '../../types/onboarding';

interface ComposerProps {
  step: OnboardingStep;
  initialValue: string;
  isEditing: boolean;
  onSubmit: (value: string, extra?: Partial<OnboardingDraft>) => void;
  onSkip: () => void;
  onCancelEdit: () => void;
}

const HANDSHAKE_RE = /^(https?:\/\/)?([\w-]+\.)*joinhandshake\.com\/\S+/i;
const LINKEDIN_RE = /^(https?:\/\/)?([\w-]+\.)*linkedin\.com\/in\/[\w%-]+\/?/i;
const MAX_BYTES = 5 * 1024 * 1024;
const STORE_LIMIT = 1.5 * 1024 * 1024;

export function Composer({ step, initialValue, isEditing, onSubmit, onSkip, onCancelEdit }: ComposerProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submitText = () => {
    const v = value.trim();
    if (!v) return setError('Type an answer, or skip this one for now.');
    if (step.validate === 'handshake' && !HANDSHAKE_RE.test(v))
    return setError('That doesn’t look like a Handshake link. It should include joinhandshake.com.');
    if (step.validate === 'linkedin' && !LINKEDIN_RE.test(v))
    return setError('That doesn’t look like a LinkedIn profile. It should look like linkedin.com/in/your-name.');
    onSubmit(step.kind === 'url' && !/^https?:\/\//i.test(v) ? `https://${v}` : v);
  };

  const handleResume = async (file: File) => {
    setError(null);
    if (!isPdf(file)) return setError('Please upload a PDF. Word docs and images aren’t supported yet.');
    if (file.size > MAX_BYTES) return setError('That file is over 5 MB. Try exporting a smaller PDF.');
    setBusy(true);
    try {
      const dataUrl = file.size <= STORE_LIMIT ? await readAsDataUrl(file) : null;
      await new Promise((r) => setTimeout(r, 700));
      onSubmit(file.name, { resumeFileName: file.name, resumeDataUrl: dataUrl });
    } catch {
      setError('We couldn’t read that file. Try another.');
      setBusy(false);
    }
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

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (step.kind === 'resume') void handleResume(file);else
    void handlePhoto(file);
  };

  const fileInput =
  <input
    ref={fileRef}
    type="file"
    className="sr-only"
    accept={step.kind === 'resume' ? '.pdf,application/pdf' : 'image/*'}
    onChange={(e) => {
      onFile(e.target.files?.[0]);
      e.target.value = '';
    }}
    tabIndex={-1}
    aria-hidden="true" />;



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
          {fileInput}
          <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFile(e.dataTransfer.files[0]);
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors duration-150 ${
          dragging ? 'border-navy bg-navy-50' : 'border-line hover:border-navy-200 hover:bg-canvas'}`
          }>
          
            {busy ?
          <>
                <Loader2Icon className="h-5 w-5 animate-spin text-navy" aria-hidden="true" />
                <span className="text-sm font-medium text-ink">Reading your resume…</span>
              </> :

          <>
                <FileTextIcon className="h-5 w-5 text-muted" aria-hidden="true" />
                <span className="text-sm font-medium text-ink">
                  Drop your resume here, or <span className="text-navy underline underline-offset-2">browse</span>
                </span>
                <span className="text-xs text-muted">{step.helper}</span>
              </>
          }
          </button>
        </>
      }

      {step.kind === 'photo' &&
      <>
          {fileInput}
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
        </div>
      }

      {(step.kind === 'text' || step.kind === 'url') &&
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
          autoFocus
          rows={step.multiline ? 3 : 1}
          value={value}
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
          className="min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none" />
        
          <button
          type="submit"
          aria-label="Send answer"
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors duration-150 hover:bg-navy">
          
            <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      }

      <div className="mt-1 flex min-h-[28px] items-center justify-between gap-3 px-1">
        {error ?
        <p role="alert" className="text-xs text-danger">
            {error}
          </p> :

        <span className="text-xs text-muted">{step.kind === 'text' || step.kind === 'url' ? 'Enter to send' : ''}</span>
        }
        {step.kind !== 'photo' &&
        <button type="button" onClick={onSkip} className="shrink-0 text-xs font-medium text-muted transition-colors duration-150 hover:text-ink">
            Skip for now
          </button>
        }
      </div>
    </div>);

}