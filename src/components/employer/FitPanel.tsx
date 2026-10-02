import React from 'react';
import { ExternalLinkIcon, MailIcon } from 'lucide-react';
import { matchLabel } from '../../utils/matching';
import type { ScoredStudent } from '../../types/employer';

interface FitPanelProps {
  item: ScoredStudent;
  /** "Product Manager Intern at Qualtrics" */
  role: string;
  mailto: string;
}

/** On a student's profile, for the employer: how well they fit the role, why, and how to reach them. */
export function FitPanel({ item, role, mailto }: FitPanelProps) {
  const fit = matchLabel(item.percent, true);
  const linkedin = item.student.profile.linkedinUrl;

  return (
    <section aria-labelledby="fit-heading" className="rounded-xl border border-line bg-white p-5">
      <h2 id="fit-heading" className="text-xs font-semibold text-navy">
        Fit for {role}
      </h2>
      <p className="mt-1 flex items-baseline gap-2">
        <span className={`text-4xl font-semibold tabular-nums tracking-tight ${fit.className}`}>{item.percent}%</span>
        <span className="text-sm text-muted">{fit.label.toLowerCase()}</span>
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={mailto}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">

          <MailIcon className="h-4 w-4" aria-hidden="true" />
          Reach out
        </a>
        {linkedin &&
        <a
          href={linkedin}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">

            Message on LinkedIn
            <ExternalLinkIcon className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
          </a>
        }
      </div>

      <ul className="mt-5 border-t border-line pt-4 space-y-3" aria-label="Why this fit">
        {item.parts.map((part) =>
        <li key={part.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">{part.label}</span>
              <span className="tabular-nums text-xs text-muted">
                {Math.round(part.points)}/{part.max}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
              <div className="h-full rounded-full bg-navy" style={{ width: `${part.points / part.max * 100}%` }} />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{part.detail}</p>
          </li>
        )}
      </ul>

      {item.missingSkills.length > 0 &&
      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
          Not on their profile yet: {item.missingSkills.join(', ')}
        </p>
      }

    </section>);

}
