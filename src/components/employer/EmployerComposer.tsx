import React, { useRef, useState } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import type { EmployerStep } from '../../data/employerSteps';

interface EmployerComposerProps {
  step: EmployerStep;
  /** Pre-filled recommended text for a text step, or the previously chosen option when editing a choice step. '' means no suggestion exists. */
  initial: string;
  isEditing: boolean;
  onSubmit: (value: string) => void;
  onSkip: () => void;
  onCancelEdit: () => void;
}

/**
 * Same interactions as the student onboarding composer (src/components/onboarding/Composer.tsx): a
 * 'choice' step is click-to-select buttons that answer instantly; a 'text' step pre-fills a suggested
 * answer rather than leaving it as a placeholder, so accepting it is one keystroke. Own copy, not
 * imported -- that file is owned by a parallel session.
 *
 * New here: quick-fill chips on a text step autofill the field on click (still editable before
 * sending), and Tab (not just Enter) accepts a field's text and advances.
 */
export function EmployerComposer({ step, initial, isEditing, onSubmit, onSkip, onCancelEdit }: EmployerComposerProps) {
  const [value, setValue] = useState(step.kind === 'text' ? initial : '');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (step.kind === 'choice') {
    return (
      <div className="rounded-2xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]">
        {isEditing &&
        <div className="mb-2 flex items-center justify-between rounded-lg bg-navy-50 px-3 py-1.5 text-xs text-navy">
            <span className="font-medium">Editing your answer</span>
            <button type="button" onClick={onCancelEdit} className="hover:underline">
              Cancel
            </button>
          </div>
        }
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
    <div className="rounded-2xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]">
      {isEditing &&
      <div className="mb-2 flex items-center justify-between rounded-lg bg-navy-50 px-3 py-1.5 text-xs text-navy">
          <span className="font-medium">Editing your answer</span>
          <button type="button" onClick={onCancelEdit} className="hover:underline">
            Cancel
          </button>
        </div>
      }

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
