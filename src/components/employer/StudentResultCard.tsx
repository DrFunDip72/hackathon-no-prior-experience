import React, { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Chip } from '../ui/Chip';
import { matchLabel } from '../../utils/matching';
import type { ScoredStudent } from '../../types/employer';

/** One ranked student result on the employer page. No real score hides behind a confident number. */
export function StudentResultCard({ item }: {item: ScoredStudent;}) {
  const [open, setOpen] = useState(false);
  const { student, score, reasons } = item;
  const panelId = `student-detail-${student.id}`;

  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar name={student.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{student.name}</p>
              <p className="text-sm text-muted">
                {student.major} · Class of {student.gradYear}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-lg font-semibold tracking-tight ${score > 0 ? matchLabel(score).className : 'text-muted'}`}>
                {score > 0 ? matchLabel(score).label : '—'}
              </p>
            </div>
          </div>

          <p className="mt-1.5 text-sm text-ink">
            {reasons.length ? reasons[0] : 'No overlap found with what you described yet.'}
          </p>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="mt-2 flex items-center gap-1 text-sm font-medium text-navy hover:underline">

            {open ? 'Hide details' : 'View details'}
            <ChevronDownIcon className={`h-4 w-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {open &&
          <div className="mt-3 space-y-3 border-t border-line pt-3">
              {reasons.length > 1 &&
            <div>
                  <p className="text-xs font-semibold text-ink">Why this match</p>
                  <ul className="mt-1 space-y-1 text-sm text-ink">
                    {reasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
            }
              <div>
                <p className="text-xs font-semibold text-ink">Summary</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{student.summary}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">Skills</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {student.skills.map((s) => <Chip key={s}>{s}</Chip>)}
                </div>
              </div>
              {student.attendedEvents.length > 0 &&
            <div>
                  <p className="text-xs font-semibold text-ink">Events attended</p>
                  <ul className="mt-1 space-y-0.5 text-sm text-muted">
                    {student.attendedEvents.map((e) =>
                <li key={e.title}>
                        {e.title}{e.company && ` (${e.company})`} · {e.date}
                      </li>
                )}
                  </ul>
                </div>
            }
            </div>
          }
        </div>
      </div>
    </article>);

}
