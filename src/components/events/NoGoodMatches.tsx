import React, { useState } from 'react';
import { MailIcon } from 'lucide-react';
import { toast } from 'sonner';
import { isEmail } from '../../utils/text';

const SUBSCRIPTIONS_KEY = 'cc_match_subscriptions';

interface StoredSubscription {
  email: string;
  threshold: number;
  createdAt: string;
}

/**
 * No backend endpoint exists for this yet (see docs/api-requests.md, "POST /subscriptions").
 * Saves locally so the flow is honest about what it does today, rather than pretending to send email.
 */
function saveSubscription(email: string, threshold: number): void {
  try {
    const raw = localStorage.getItem(SUBSCRIPTIONS_KEY);
    const list: StoredSubscription[] = raw ? JSON.parse(raw) : [];
    list.push({ email: email.trim().toLowerCase(), threshold, createdAt: new Date().toISOString() });
    localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable: still show the confirmation below so the demo isn't blocked by it.
  }
}

/** Shown on the Events page instead of the list when nothing this week scores as a real match. */
export function NoGoodMatches({ threshold }: {threshold: number;}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    saveSubscription(email, threshold);
    setSubscribed(true);
    toast('Saved on this device. Email alerts are coming soon, so nothing will be sent yet.');
  };

  return (
    <div className="rounded-xl border border-line bg-white px-6 py-14 text-center">
      <MailIcon className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
      <p className="mt-3 font-medium text-ink">Nothing great for you this week</p>
      <p className="mt-1 text-sm text-muted">We’ll email you when a good match shows up.</p>

      {subscribed ?
      <p className="mx-auto mt-5 max-w-xs text-sm text-ink">
          <span className="font-medium">You’re on the list.</span> Alerts are coming soon — this just saved your email on this
          device for now.
        </p> :

      <form onSubmit={onSubmit} noValidate className="mx-auto mt-5 flex max-w-xs flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1 text-left">
            <label htmlFor="match-alert-email" className="sr-only">
              Email address
            </label>
            <input
            id="match-alert-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@byu.edu"
            aria-invalid={Boolean(error)}
            className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-navy ${
            error ? 'border-danger' : 'border-line'}`
            } />

            {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
          </div>
          <button
          type="submit"
          className="shrink-0 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">

            Subscribe
          </button>
        </form>
      }
      <p className="mt-3 text-xs text-muted">No alerts are sent yet — there’s no backend for them.</p>
    </div>);

}
