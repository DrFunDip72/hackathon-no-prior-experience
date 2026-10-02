import React from 'react';
import { CheckIcon } from 'lucide-react';
import { Chip } from '../ui/Chip';
import type { Attendance } from '../../types/session';

export interface AttendanceControl {
  /** Unset until the student says whether they went. */
  status?: Attendance;
  onMark: (status: Attendance) => void;
  /** Clears the answer so it can be given again. */
  onClear: () => void;
}

interface AttendanceActionsProps extends AttendanceControl {
  title: string;
  className?: string;
}

/** For an ended event: "I went" / "Didn't make it", or the answer as a chip with a Change link. */
export function AttendanceActions({ title, status, onMark, onClear, className = '' }: AttendanceActionsProps) {
  // Cards open the detail panel on click; these controls shouldn't.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  if (status) {
    return (
      <div onClick={stop} className={`flex items-center justify-between gap-3 ${className}`}>
        {status === 'attended' ?
        <Chip tone="success">
            <CheckIcon className="h-3 w-3" aria-hidden="true" />
            Attended
          </Chip> :

        <Chip>Missed</Chip>
        }
        <button
          type="button"
          onClick={onClear}
          aria-label={`Change whether you went to ${title}`}
          className="tap-target text-sm font-medium text-navy hover:underline">
          Change
        </button>
      </div>);

  }

  const base =
  'inline-flex min-h-[44px] flex-1 items-center sm:flex-none justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2';
  return (
    <div role="group" aria-label={`Did you go to ${title}?`} onClick={stop} className={`flex gap-2 ${className}`}>
      <button type="button" onClick={() => onMark('attended')} className={`${base} bg-navy text-white hover:bg-navy-700`}>
        <CheckIcon className="h-4 w-4" aria-hidden="true" />
        I went
      </button>
      <button type="button" onClick={() => onMark('missed')} className={`${base} border border-line bg-white text-ink hover:bg-canvas`}>
        Didn’t make it
      </button>
    </div>);

}
