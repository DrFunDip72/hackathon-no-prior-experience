import React, { useState } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import type { EmployerStep } from '../../data/employerSteps';

interface EmployerComposerProps {
  step: EmployerStep;
  /** Pre-filled recommended text for this step, or '' when there's nothing to suggest (e.g. company name). */
  initial: string;
  isEditing: boolean;
  onSubmit: (value: string) => void;
  onSkip: () => void;
  onCancelEdit: () => void;
}

/**
 * Same interaction as the student onboarding composer (src/components/onboarding/Composer.tsx): a
 * suggested answer is pre-filled rather than left as a placeholder, so accepting it is one keystroke.
 * Own copy, not imported -- that file is owned by a parallel session.
 *
 * Accepts the suggestion (or whatever's been typed) on Enter *or* Tab, so tabbing through the form
 * confirms each field and advances instead of just moving focus off it.
 */
export function EmployerComposer({ step, initial, isEditing, onSubmit, onSkip, onCancelEdit }: EmployerComposerProps) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const v = value.trim();
    if (!v) {
      if (step.optional) return onSkip();
      setError('Type an answer, or press Tab to use the example.');
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

      <div className="mt-1 flex min-h-[28px] items-center justify-between gap-3 px-1">
        {error ?
        <p role="alert" className="text-xs text-danger">
            {error}
          </p> :

        <span className="text-xs text-muted">
            {wasSuggested ? 'Example filled in. Press Enter or Tab to use it, or edit it first.' : 'Enter or Tab to send'}
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
