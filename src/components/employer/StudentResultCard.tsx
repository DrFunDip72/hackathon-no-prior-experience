import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Chip } from '../ui/Chip';
import { matchLabel } from '../../utils/matching';
import type { ScoredStudent } from '../../types/employer';

/** One ranked student, in the same card language as an event row on the Events page. */
export function StudentResultCard({ item, top, roleId }: {item: ScoredStudent;top?: boolean;roleId: string;}) {
  const navigate = useNavigate();
  const { student, percent, why, matchedSkills } = item;
  const p = student.profile;
  const href = `/employer/students/${student.id}?role=${roleId}`;
  const fit = matchLabel(percent, true);

  return (
    <article
      onClick={() => navigate(href)}
      className="flex cursor-pointer gap-4 rounded-xl border border-line bg-white p-4 transition-colors duration-150 hover:border-navy-200">

      <Avatar name={p.name} src={p.photoUrl} size="md" />

      <div className="min-w-0 flex-1">
        {top && <p className="text-xs font-semibold text-navy">Your top match</p>}
        <h3>
          <Link to={href} onClick={(e) => e.stopPropagation()} className="font-semibold leading-snug text-ink focus:outline-none focus-visible:underline">
            {p.name}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {p.education.major} · {p.year} · Class of {p.education.gradYear}
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm text-ink">{why}</p>
        {matchedSkills.length > 0 &&
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {matchedSkills.slice(0, 5).map((s) => <Chip key={s} tone="navy">{s}</Chip>)}
          </div>
        }
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-3">
        {/* Same size and weight as the top match's percent on the Events page (EventCard hero), colored by matchLabel. */}
        <span className={`whitespace-nowrap text-lg font-semibold tabular-nums tracking-tight sm:text-xl ${fit.className}`}>{percent}% fit</span>
        <span className="hidden items-center gap-1 text-sm font-medium text-navy sm:flex">
          Profile
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </article>);

}
