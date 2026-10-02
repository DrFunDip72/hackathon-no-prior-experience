import React from 'react';
import { format } from 'date-fns';
import { Availability } from './Availability';
import { AddToCalendarButton } from './AddToCalendarButton';
import { Avatar } from '../ui/Avatar';
import { formatDay, formatTimeRange } from '../../utils/dates';
import type { ScoredEvent } from '../../types/event';

interface EventCardProps {
  item: ScoredEvent;
  variant: 'hero' | 'row';
  selected: boolean;
  added: boolean;
  googleConnected: boolean;
  onSelect: () => void;
  onAdd: () => void;
}

function whyLine(item: ScoredEvent): string {
  return item.reasons.length ? `Matches ${item.reasons.join(', ')}` : 'Open campus event, good for general networking';
}

export function EventCard({ item, variant, selected, added, googleConnected, onSelect, onAdd }: EventCardProps) {
  const { event } = item;
  const strong = item.score >= 75;
  const frame = `cursor-pointer rounded-xl border bg-white transition-colors duration-150 ${
  selected ? 'border-navy ring-1 ring-navy' : 'border-line hover:border-navy-200'}`;


  if (variant === 'hero') {
    const lead = item.people[0];
    return (
      <article onClick={onSelect} className={`${frame} p-6`}>
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-navy">Your top match</p>
            <h2 className="mt-1.5">
              <button type="button" onClick={onSelect} className="text-left text-xl font-semibold leading-snug tracking-tight text-ink focus:outline-none focus-visible:underline sm:text-2xl">
                {event.title}
              </button>
            </h2>
            <p className="mt-2 text-sm text-muted">
              {event.type} · {formatDay(item.start)}, {formatTimeRange(item.start, item.end)} · {event.location}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-success-700">{item.score}%</p>
            <p className="text-xs text-muted">match</p>
          </div>
        </div>

        <p className="mt-4 text-[15px] text-ink">{whyLine(item)}</p>
        <div className="mt-3">
          <Availability conflict={item.conflict} googleConnected={googleConnected} />
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          {lead ?
          <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {item.people.slice(0, 3).map((p) =>
              <Avatar key={p.person.id} name={p.person.name} size="sm" className="ring-2 ring-white" />
              )}
              </div>
              <p className="text-sm text-ink">
                Meet <span className="font-medium">{lead.person.name}</span>
                {item.people.length > 1 && <span className="text-muted"> and {item.people.length - 1} more</span>}
              </p>
            </div> :

          <span className="text-sm text-muted">Guest list not published yet</span>
          }
          <AddToCalendarButton item={item} added={added} onAdd={onAdd} />
        </div>
      </article>);

  }

  return (
    <article onClick={onSelect} className={`${frame} flex gap-4 p-4`}>
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-canvas py-1.5" aria-hidden="true">
        <span className="text-[11px] font-medium uppercase text-muted">{format(item.start, 'MMM')}</span>
        <span className="text-lg font-semibold tabular-nums leading-tight text-ink">{format(item.start, 'd')}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3>
          <button type="button" onClick={onSelect} className="text-left font-semibold leading-snug text-ink focus:outline-none focus-visible:underline">
            {event.title}
          </button>
        </h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {formatDay(item.start)}, {formatTimeRange(item.start, item.end)} · {event.location}
        </p>
        <p className="mt-1.5 truncate text-sm text-ink">{whyLine(item)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Availability conflict={item.conflict} googleConnected={googleConnected} />
          {item.people.length > 0 &&
          <span className="text-xs text-muted">
              {item.people.length} {item.people.length === 1 ? 'person' : 'people'} to meet
            </span>
          }
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-3">
        <span className={`text-base font-semibold tabular-nums ${strong ? 'text-success-700' : 'text-muted'}`}>{item.score}%</span>
        <AddToCalendarButton item={item} added={added} onAdd={onAdd} size="sm" />
      </div>
    </article>);

}