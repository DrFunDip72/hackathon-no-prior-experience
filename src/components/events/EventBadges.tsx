import { formatDateTime, isHappeningNow } from '../../utils/dates';
import type { ScoredEvent } from '../../types/event';

/** Status tags that only appear when the data supports them: live now, unconfirmed, RSVP and registration deadline. */
export function EventBadges({ item, className = '' }: {item: ScoredEvent;className?: string;}) {
  const { event } = item;
  const live = isHappeningNow(item.start, item.end);
  const deadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
  const registerBy = deadline && deadline > new Date() ? formatDateTime(deadline) : null;
  if (!live && event.verified !== false && !event.rsvpRequired && !registerBy) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {live &&
      <span className="inline-flex items-center gap-1.5 rounded-md bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          Happening now
        </span>
      }
      {event.verified === false &&
      <span
        title="Submitted by a student or read automatically, not yet confirmed by the organizer. Check the original listing."
        className="rounded-md border border-line px-2 py-0.5 text-xs font-medium text-muted">

          Unconfirmed
        </span>
      }
      {registerBy ?
      <span className="rounded-md bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning">Register by {registerBy}</span> :
      event.rsvpRequired &&
      <span className="rounded-md bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning">RSVP required</span>
      }
    </span>);

}
