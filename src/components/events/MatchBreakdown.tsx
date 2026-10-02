import { useEffect, useId, useRef, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { daysFromToday, isHappeningNow } from '../../utils/dates';
import { AI_GOOD_MATCH, AI_STRONG_MATCH, eventMatch } from '../../utils/matching';
import type { ScoredEvent } from '../../types/event';

interface MatchBreakdownProps {
  item: ScoredEvent;
  /** Size and weight of the "82% match" text; the color comes from eventMatch. */
  className?: string;
  /** Which edge of the button the popover lines up with. */
  align?: 'left' | 'right';
}

function timing(item: ScoredEvent): string {
  if (isHappeningNow(item.start, item.end)) return 'Happening now';
  const days = daysFromToday(item.start);
  if (days <= 0) return 'Later today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function fitLevel(percent: number): string {
  if (percent >= AI_STRONG_MATCH) return 'High';
  if (percent >= AI_GOOD_MATCH) return 'Medium';
  return 'Low';
}

/**
 * The match percent ("82% match") as a button that opens "Why this match?": the AI fit, target companies
 * attending, role fit, the API's matched fields and timing. Only real data; rows without data are left out.
 * Renders "—" (not a button) when there's no match to explain.
 */
export function MatchBreakdown({ item, className = 'text-sm font-semibold', align = 'right' }: MatchBreakdownProps) {
  const { state } = useSession();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const match = eventMatch(item);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    // Capture on window so Escape closes only this popover, not the event sheet behind it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  if (!match) return <span className={`${className} text-muted`}>—</span>;

  const profile = state.profile;
  const roles = profile?.lookingFor.roleTypes.filter((r) => r.trim()) ?? [];
  const hasTargets = Boolean(profile?.interests.companies.some((c) => c.trim()));
  const ai = item.aiPercent;

  return (
    <span ref={wrapRef} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={`whitespace-nowrap rounded tabular-nums underline decoration-dotted decoration-1 underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 ${className} ${match.className}`}>
        {match.percent}% match
        <span className="sr-only">, why this match?</span>
      </button>

      {open &&
      <div
        id={panelId}
        role="dialog"
        aria-label="Why this match?"
        className={`absolute top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white p-4 text-left shadow-lg ${
        align === 'right' ? 'right-0' : 'left-0'}`
        }>
          <p className="text-sm font-semibold text-ink">Why this match?</p>
          {ai !== undefined &&
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink">
              {ai} <span className="text-sm font-medium text-muted">/ 100 fit</span>
            </p>
        }

          <dl className="mt-3 space-y-2.5 text-sm">
            {(item.targetCompanies.length > 0 || hasTargets) &&
          <div>
                <dt className="text-xs font-medium text-muted">Target companies attending</dt>
                <dd className="mt-0.5 text-ink">
                  {item.targetCompanies.length ?
              <ul className="space-y-0.5">
                      {item.targetCompanies.map((name) =>
                <li key={name} className="flex items-center gap-1.5">
                          <CheckIcon className="h-3.5 w-3.5 shrink-0 text-success-700" aria-hidden="true" />
                          {name}
                        </li>
                )}
                    </ul> :
              <span className="text-muted">None of yours listed</span>
              }
                </dd>
              </div>
          }
            {ai !== undefined &&
          <div>
                <dt className="text-xs font-medium text-muted">Role & interest fit</dt>
                <dd className="mt-0.5 text-ink">
                  {fitLevel(ai)}
                  {roles.length > 0 && <span className="text-muted"> for {roles.slice(0, 3).join(', ')}</span>}
                </dd>
              </div>
          }
            {item.matchedFields.length > 0 &&
          <div>
                <dt className="text-xs font-medium text-muted">Matched skills & fields</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {item.matchedFields.slice(0, 6).map((f) =>
              <span key={f} className="rounded-md bg-canvas px-1.5 py-0.5 text-xs text-ink">{f}</span>
              )}
                </dd>
              </div>
          }
            <div>
              <dt className="text-xs font-medium text-muted">Timing</dt>
              <dd className="mt-0.5 text-ink">{timing(item)}</dd>
            </div>
          </dl>

          <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-muted">
            {ai !== undefined ?
          'Gemini compares this event with your profile, plus a boost for target companies attending.' :
          'Based on the companies and fields this event lists that match your profile.'}
          </p>
        </div>
      }
    </span>);

}
