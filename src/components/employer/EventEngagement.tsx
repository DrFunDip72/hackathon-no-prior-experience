import { CalendarCheckIcon } from 'lucide-react';
import type { AttendedEvent } from '../../types/employer';
import type { EventEngagement as Engagement } from '../../utils/employerMatching';

/** "2026-09-22" -> "Sep 22" (read as a calendar day, not a UTC instant). */
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One line an employer can read at a glance: how this student's attendance at your events compares. */
function takeaway(e: Engagement, company: string): string {
  const yours = e.withYou.length;
  const top = e.others[0];
  if (!company) return top ? `Most active with ${top.company} (${plural(top.count, 'event')}).` : 'Comes to general career events.';
  if (yours === 0) return top ? `Hasn’t been to a ${company} event yet; most active with ${top.company} (${top.count}).` : `Hasn’t been to a ${company} event yet.`;
  const lead = yours === 1 ? `Came to a ${company} event: ${e.withYou[0].title}` : `Came to ${yours} ${company} events`;
  if (!top || yours > top.count) return yours === 1 && !top ? `${lead}.` : `${lead}, more than any other company.`;
  if (yours === top.count) return `${lead}, tied with ${top.company} for their most.`;
  return `${lead}; most active with ${top.company} (${top.count}).`;
}

/**
 * For the employer, on a student's profile: how many Doorway events the student went to this semester, split
 * into the role's company (green), other companies and general career events, with the most recent few.
 * Plain divs, no chart library. Every color is paired with a text label and count.
 */
export function EventEngagement({ engagement: e, company }: {engagement: Engagement;company: string;}) {
  const yours = e.withYou.length;
  const otherCount = e.total - yours - e.general;
  const youLabel = company || 'Your company';

  if (e.total === 0) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-navy">Event engagement</h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          <CalendarCheckIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Hasn’t been to a Doorway event yet
        </p>
      </div>);

  }

  const segments = [
  { key: 'you', label: youLabel, count: yours, bar: 'bg-success', dot: 'bg-success' },
  {
    key: 'other',
    label: 'Other companies',
    count: otherCount,
    bar: 'bg-navy-200',
    dot: 'bg-navy-200',
    note: e.others.slice(0, 3).map((o) => `${o.company} ${o.count}`).join(' · ')
  },
  { key: 'general', label: 'Career events', count: e.general, bar: 'bg-muted/30', dot: 'bg-muted/30', note: 'Fairs, panels, workshops' }].
  filter((s) => s.count > 0);

  const summary = `${plural(e.total, 'event')} this semester: ${segments.map((s) => `${s.count} ${s.key === 'you' ? `with ${youLabel}` : s.label.toLowerCase()}`).join(', ')}.`;

  return (
    <div>
      <h3 className="text-xs font-semibold text-navy">Event engagement</h3>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{e.total}</span>
        <span className="text-sm text-muted">{e.total === 1 ? 'event' : 'events'} this semester</span>
      </p>

      <div role="img" aria-label={summary} className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) =>
        <div key={s.key} className={`h-full ${s.bar}`} style={{ flexGrow: s.count, flexBasis: 0 }} />
        )}
      </div>

      <ul className="mt-3 space-y-1.5 text-sm" aria-hidden="true">
        {segments.map((s) =>
        <li key={s.key} className="flex items-start gap-2">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
            <span className="min-w-0 flex-1">
              <span className={s.key === 'you' ? 'font-medium text-ink' : 'text-ink'}>{s.label}</span>
              {s.note && <span className="block truncate text-xs text-muted">{s.note}</span>}
            </span>
            <span className={`tabular-nums ${s.key === 'you' ? 'font-semibold text-success-700' : 'text-muted'}`}>{s.count}</span>
          </li>
        )}
      </ul>

      <p className={`mt-3 text-sm leading-snug ${yours ? 'font-medium text-success-700' : 'text-muted'}`}>{takeaway(e, company)}</p>

      <h4 className="mt-4 text-xs font-medium text-muted">Recent</h4>
      <ul className="mt-1.5 space-y-2" aria-label="Recent events">
        {e.recent.slice(0, 4).map((ev: AttendedEvent) => {
          const mine = e.withYou.includes(ev);
          return (
            <li key={`${ev.date}-${ev.title}`} className="flex gap-3 text-sm">
              <time dateTime={ev.date} className="w-12 shrink-0 tabular-nums text-xs leading-5 text-muted">
                {shortDate(ev.date)}
              </time>
              <span className="min-w-0">
                <span className="block leading-5 text-ink">{ev.title}</span>
                <span className={`block text-xs ${mine ? 'font-medium text-success-700' : 'text-muted'}`}>
                  {ev.company ?? 'Career event'}
                  {mine && <span className="sr-only"> (your company)</span>}
                </span>
              </span>
            </li>);

        })}
      </ul>
      {e.recent.length > 4 && <p className="mt-2 text-xs text-muted">and {plural(e.recent.length - 4, 'earlier event')}</p>}
    </div>);

}
