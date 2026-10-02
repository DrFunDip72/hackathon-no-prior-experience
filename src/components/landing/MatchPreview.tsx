import React from 'react';
import { CalendarPlusIcon, CheckCircle2Icon, MapPinIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { EmployerLogo } from '../ui/EmployerLogo';
import { employers } from '../../data/employers';
import { people } from '../../data/people';

const adobe = employers[0];
const attendees = people.slice(0, 3);

export function MatchPreview() {
  return (
    <section aria-labelledby="preview-heading" className="border-t border-line bg-canvas">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <h2 id="preview-heading" className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Know who’ll be in the room before you walk in.
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
            Every event is scored against your profile, checked against your schedule, and comes with the recruiters and
            alumni worth finding, plus what to say to them.
          </p>
        </div>

        <div aria-hidden="true" className="rounded-2xl border border-line bg-white p-6 shadow-[0_12px_40px_-20px_rgba(15,23,42,0.25)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <EmployerLogo employer={adobe} size="md" />
              <div>
                <p className="text-xs font-medium text-muted">Info session · Thu, 5:00 PM</p>
                <p className="text-lg font-semibold text-ink">Adobe Product Design Info Session</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tabular-nums text-success-700">94%</p>
              <p className="text-xs text-muted">match</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="h-4 w-4" /> Tanner Building 260
            </span>
            <span className="flex items-center gap-1.5 text-success-700">
              <CheckCircle2Icon className="h-4 w-4" /> You’re free
            </span>
          </div>
          <p className="mt-3 text-sm text-ink">
            <span className="text-muted">Why: </span>Adobe is on your list, plus UX and Figma
          </p>

          <div className="mt-5 space-y-3 border-t border-line pt-5">
            {attendees.map((p) =>
            <div key={p.id} className="flex items-center gap-3">
                <Avatar name={p.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{p.name}</p>
                  <p className="truncate text-xs text-muted">
                    {p.title}
                    {p.byuConnection ? ` · ${p.byuConnection}` : ''}
                  </p>
                </div>
                <span className="ml-auto rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">{p.kind}</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white">
            <CalendarPlusIcon className="h-4 w-4" /> Add to Google Calendar
          </div>
        </div>
      </div>
    </section>);

}