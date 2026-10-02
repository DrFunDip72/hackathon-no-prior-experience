import React from 'react';
import { Link } from 'react-router-dom';
import { Toggle } from '../ui/Toggle';
import { calendarSources } from '../../data/calendarSources';
import type { DateRange, FeedFilters } from '../../hooks/useEventFeed';
import type { CalendarSourceId } from '../../types/calendar';
import type { EventType } from '../../types/event';

interface EventFiltersProps {
  filters: FeedFilters;
  onChange: (filters: FeedFilters) => void;
  onReset: () => void;
  filtersActive: boolean;
  availableIndustries: string[];
  googleConnected: boolean;
  connectedSources: CalendarSourceId[];
}

const RANGES: {id: DateRange;label: string;}[] = [
{ id: 'week', label: 'Week' },
{ id: 'twoWeeks', label: '2 weeks' },
{ id: 'month', label: 'Month' }];


const TYPES: EventType[] = ['Career fair', 'Info session', 'Workshop', 'Club', 'Talk', 'Networking'];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function EventFilters({ filters, onChange, onReset, filtersActive, availableIndustries, googleConnected, connectedSources }: EventFiltersProps) {
  return (
    <div className="space-y-7">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-ink">When</legend>
        <div className="grid grid-cols-3 rounded-lg bg-white p-0.5 ring-1 ring-line">
          {RANGES.map((r) =>
          <button
            key={r.id}
            type="button"
            aria-pressed={filters.range === r.id}
            onClick={() => onChange({ ...filters, range: r.id })}
            className={`whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-150 ${
            filters.range === r.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`
            }>
            
              {r.label}
            </button>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-ink">Type</legend>
        <div className="space-y-1.5">
          {TYPES.map((t) =>
          <label key={t} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
              <input
              type="checkbox"
              checked={filters.types.includes(t)}
              onChange={() => onChange({ ...filters, types: toggle(filters.types, t) })}
              className="h-4 w-4 rounded border-line accent-navy" />
            
              {t}
            </label>
          )}
        </div>
      </fieldset>

      {availableIndustries.length > 0 &&
      <fieldset>
          <legend className="mb-2 text-xs font-semibold text-ink">Industry</legend>
          <div className="space-y-1.5">
            {availableIndustries.map((i) =>
          <label key={i} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
                <input
              type="checkbox"
              checked={filters.industries.includes(i)}
              onChange={() => onChange({ ...filters, industries: toggle(filters.industries, i) })}
              className="h-4 w-4 rounded border-line accent-navy" />
            
                {i}
              </label>
          )}
          </div>
        </fieldset>
      }

      <div>
        <div className="flex items-center justify-between gap-3">
          <span id="hide-conflicts" className="text-sm font-medium text-ink">
            Hide conflicts
          </span>
          <Toggle
            checked={filters.hideConflicts}
            disabled={!googleConnected}
            onChange={(v) => onChange({ ...filters, hideConflicts: v })}
            label="Hide events that conflict with your schedule" />
          
        </div>
        {!googleConnected && <p className="mt-1 text-xs text-muted">Needs Google Calendar.</p>}
      </div>

      {filtersActive &&
      <button type="button" onClick={onReset} className="text-sm font-medium text-navy hover:underline">
          Clear filters
        </button>
      }

      <div className="border-t border-line pt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-ink">Calendars</span>
          <Link to="/connect" className="text-xs font-medium text-navy hover:underline">
            Manage
          </Link>
        </div>
        <ul className="space-y-1.5">
          {calendarSources.map((s) => {
            const on = s.id === 'google' ? googleConnected : connectedSources.includes(s.id as CalendarSourceId);
            return (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 shrink-0 rounded-full ${on ? 'bg-success' : 'bg-line'}`} aria-hidden="true" />
                <span className={`truncate ${on ? 'text-ink' : 'text-muted'}`}>{s.name}</span>
                <span className="sr-only">{on ? 'connected' : 'not connected'}</span>
              </li>);

          })}
        </ul>
      </div>
    </div>);

}