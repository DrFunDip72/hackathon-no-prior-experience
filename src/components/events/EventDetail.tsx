import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarIcon, ExternalLinkIcon, GraduationCapIcon, MapPinIcon, XIcon } from 'lucide-react';
import { AddToCalendarButton } from './AddToCalendarButton';
import { EventBadges } from './EventBadges';
import { PersonRow } from './PersonRow';
import { EmployerLogo } from '../ui/EmployerLogo';
import { campusTime, formatDay, formatClock, formatTimeRange, toMinutes } from '../../utils/dates';
import { matchLabel, scheduleForDay } from '../../utils/matching';
import type { ScoredEvent } from '../../types/event';

interface EventDetailProps {
  item: ScoredEvent;
  added: boolean;
  googleConnected: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onClose?: () => void;
}

export function EventDetail({ item, added, googleConnected, onAdd, onRemove, onClose }: EventDetailProps) {
  const { event } = item;
  const day = scheduleForDay(item.start);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-muted">{event.type}</p>
          {onClose &&
          <button type="button" onClick={onClose} aria-label="Close details" className="-m-1.5 rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink">
              <XIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          }
        </div>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-ink">{event.title}</h2>
        <div className="mt-3 space-y-1.5 text-sm text-ink">
          <p className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            {formatDay(item.start)}, {formatTimeRange(item.start, item.end)}
          </p>
          <p className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            {event.location}
          </p>
        </div>
        <EventBadges item={item} className="mt-3" />

        <div className="mt-5 flex items-baseline gap-2">
          {item.reasons.length > 0 ?
          <>
              <span className={`text-xl font-semibold ${matchLabel(item.score).className}`}>{matchLabel(item.score).label}</span>
            </> :

          <>
              <span className="text-2xl font-semibold tabular-nums text-muted">—</span>
              <span className="text-sm text-muted">match score needs your profile</span>
            </>
          }
        </div>
        <p className="mt-1 text-sm text-ink">
          {item.reason ? item.reason : item.reasons.length ? `Fits your interest in ${item.reasons.join(', ')}.` : 'A general campus event, worth it for broad networking.'}
        </p>

        <section className="mt-6" aria-labelledby="day-heading">
          <h3 id="day-heading" className="text-sm font-semibold text-ink">
            Your day
          </h3>
          {googleConnected ?
          <ul className="mt-2 space-y-1.5">
              {[
            ...day.map((b) => ({ key: b.id, start: b.start, title: b.title, isEvent: false, conflict: b.title === item.conflict })),
            { key: 'this', start: campusTime(item.start), title: event.title, isEvent: true, conflict: false }].

            sort((a, b) => toMinutes(a.start) - toMinutes(b.start)).
            map((row) => ({ ...row, time: formatClock(row.start) })).
            map((row) =>
            <li
              key={row.key}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              row.isEvent ? 'bg-navy-50 font-medium text-navy' : row.conflict ? 'bg-warning-50 text-warning' : 'bg-canvas text-ink'}`
              }>
              
                    <span className="w-16 shrink-0 tabular-nums">{row.time}</span>
                    <span className="truncate">{row.title}</span>
                  </li>
            )}
              {day.length === 0 && <li className="text-sm text-muted">Nothing else on your calendar that day.</li>}
            </ul> :

          <p className="mt-2 text-sm text-muted">
              <Link to="/connect" className="font-medium text-navy hover:underline">
                Connect Google Calendar
              </Link>{' '}
              to check this against your classes.
            </p>
          }
        </section>

        <section className="mt-6" aria-labelledby="about-heading">
          <h3 id="about-heading" className="text-sm font-semibold text-ink">
            About
          </h3>
          {event.description && <p className="mt-2 text-sm leading-relaxed text-muted">{event.description}</p>}
          {event.sourceUrl &&
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline">

              View original listing
              <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          }
          {item.employers.length > 0 &&
          <div className="mt-3 flex flex-wrap gap-2">
              {item.employers.map((e) =>
            <span key={e.id} className="flex items-center gap-1.5 rounded-lg border border-line py-1 pl-1 pr-2 text-xs font-medium text-ink">
                  <EmployerLogo employer={e} size="xs" />
                  {e.name}
                </span>
            )}
            </div>
          }
          {event.programs && event.programs.length > 0 &&
          <p className="mt-3 flex items-start gap-2 text-sm text-ink">
              <GraduationCapIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <span>
                <span className="text-muted">Programs: </span>
                {event.programs.join(', ')}
              </span>
            </p>
          }
        </section>

        {item.people.length > 0 &&
        <section className="mt-6" aria-labelledby="people-heading">
            <h3 id="people-heading" className="text-sm font-semibold text-ink">
              People to meet
            </h3>
            <ul className="mt-1 divide-y divide-line">
              {item.people.map((p) =>
            <PersonRow key={p.person.id} scored={p} />
            )}
            </ul>
          </section>
        }
      </div>

      <div className="border-t border-line bg-white p-4">
        {event.registrationUrl &&
        <a
          href={event.registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-navy px-4 py-2 text-sm font-medium text-navy transition-colors duration-150 hover:bg-navy-50">

            Register
            <ExternalLinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        }
        <AddToCalendarButton item={item} added={added} onAdd={onAdd} fullWidth />
        {added &&
        <button type="button" onClick={onRemove} className="mt-2 w-full text-center text-sm text-muted transition-colors duration-150 hover:text-ink">
            Remove from my plan
          </button>
        }
      </div>
    </div>);

}