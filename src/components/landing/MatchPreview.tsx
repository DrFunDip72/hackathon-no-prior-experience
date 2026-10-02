import React from 'react';
import { CalendarPlusIcon, CheckCircle2Icon } from 'lucide-react';
import { EmployerLogo } from '../ui/EmployerLogo';
import { employers } from '../../data/employers';
import { matchLabel } from '../../utils/matching';

/** A realistic example of how an event from the live API reads on the Events page. */
const example = {
  reason: 'Redo and Neighbor reps attending, matches 2 of your target companies.',
  title: 'Startup Career Fair',
  meta: 'Career fair · Thu, Oct 8, 10:00 AM – 2:00 PM · Wilkinson Student Center',
  score: 86,
  companyIds: ['redo', 'neighbor', 'waystar', 'scalar', 'hxp']
};

const attending = example.companyIds.
map((id) => employers.find((e) => e.id === id)).
filter((e): e is (typeof employers)[number] => Boolean(e));


export function MatchPreview() {
  return (
    <section aria-labelledby="preview-heading" className="border-t border-line bg-canvas">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <h2 id="preview-heading" className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Know who’ll be in the room before you walk in.
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
            Every event is scored against your resume and target companies, checked against your calendar, and tells you
            in one line why it’s worth your time.
          </p>
        </div>

        <div aria-hidden="true" className="rounded-2xl border border-line bg-white p-5 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.25)] sm:p-6">
          <div className="flex items-start justify-between gap-4 sm:gap-6">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-navy">Your top match</p>
              <p className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-ink sm:text-xl">{example.reason}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl ${matchLabel(example.score).className}`}>{example.score}%</p>
              <p className="text-xs text-muted">match</p>
            </div>
          </div>

          <p className="mt-3 text-[15px] font-medium text-ink">{example.title}</p>
          <p className="mt-0.5 text-sm text-muted">{example.meta}</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-md bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">
            <CheckCircle2Icon className="h-3 w-3" /> You’re free
          </span>

          <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex -space-x-1.5">
                {attending.slice(0, 4).map((e) =>
                <span key={e.id} className="rounded-md ring-2 ring-white">
                    <EmployerLogo employer={e} size="sm" />
                  </span>
                )}
              </div>
              <p className="min-w-0 text-sm text-ink">
                <span className="font-medium">
                  {attending[0].name}, {attending[1].name}
                </span>
                <span className="text-muted"> and {attending.length - 2} more attending</span>
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white">
              <CalendarPlusIcon className="h-4 w-4" /> Add to Google Calendar
            </span>
          </div>
        </div>
      </div>
    </section>);

}
