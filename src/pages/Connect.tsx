import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '../components/AppHeader';
import { ConsentDialog } from '../components/connect/ConsentDialog';
import { SourceRow } from '../components/connect/SourceRow';
import { useSession } from '../contexts/SessionContext';
import { calendarSources } from '../data/calendarSources';
import { api } from '../utils/api';
import type { CalendarId, CalendarSource } from '../types/calendar';

export function Connect() {
  const { state, updateState } = useSession();
  const [consentFor, setConsentFor] = useState<CalendarSource | null>(null);
  const [syncing, setSyncing] = useState<Partial<Record<CalendarId, boolean>>>({});
  const navigate = useNavigate();
  // Links from the Events page use /connect?from=events, so turning on the schedule sends them straight back.
  const [params] = useSearchParams();
  const returnTo = params.get('from') === 'events' ? '/events' : null;

  const google = calendarSources.filter((s) => s.provider === 'Google');
  const byu = calendarSources.filter((s) => s.provider === 'BYU');
  const anyConnected = Object.values(state.connections).some(Boolean);

  const setConnected = (id: CalendarId, on: boolean) =>
  updateState((s) => ({ ...s, connections: { ...s.connections, [id]: on } }));

  // Preview sources (Google, on the sample schedule) confirm first; live BYU calendars are public, so they just turn on.
  const connect = (source: CalendarSource) => {
    if (source.status === 'soon') return;
    if (source.status === 'preview') {
      setConsentFor(source);
      return;
    }
    setConnected(source.id, true);
    toast.success(`${source.name} connected`, { description: 'Your feed now focuses on its events.' });
  };

  const allow = async (source: CalendarSource) => {
    setConsentFor(null);
    setSyncing((s) => ({ ...s, [source.id]: true }));
    try {
      await api.syncCalendar(source.id);
      setConnected(source.id, true);
      toast.success(`${source.name} preview on`, { description: 'Events now show conflicts with a sample schedule.' });
      if (returnTo) navigate(returnTo, { replace: true });
    } catch {
      toast.error(`Couldn’t turn on the ${source.name} preview. Try again.`);
    } finally {
      setSyncing((s) => ({ ...s, [source.id]: false }));
    }
  };

  const disconnect = (source: CalendarSource) => {
    setConnected(source.id, false);
    toast(source.status === 'preview' ? `${source.name} preview off` : `${source.name} disconnected`);
  };

  const cancel = useCallback(() => setConsentFor(null), []);

  const renderRows = (sources: CalendarSource[]) =>
  sources.map((source) =>
  <SourceRow
    key={source.id}
    source={source}
    connected={Boolean(state.connections[source.id])}
    syncing={Boolean(syncing[source.id])}
    onConnect={() => connect(source)}
    onDisconnect={() => disconnect(source)} />

  );

  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Connect your calendars</h1>
        <p className="mt-1.5 max-w-xl text-muted">
          BYU calendars are where your events come from. The Google Calendar preview shows how we flag events that clash with your classes.
        </p>

        <section aria-labelledby="personal-heading" className="mt-10">
          <h2 id="personal-heading" className="mb-3 text-sm font-semibold text-ink">
            Your schedule
          </h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-white">{renderRows(google)}</ul>
        </section>

        <section aria-labelledby="byu-heading" className="mt-8">
          <h2 id="byu-heading" className="text-sm font-semibold text-ink">
            BYU calendars
          </h2>
          <p className="mb-3 mt-0.5 text-sm text-muted">Your feed includes every live BYU calendar. Connect specific ones to focus it.</p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">{renderRows(byu)}</ul>
        </section>

        <div className="mt-10 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
          {!anyConnected &&
          <Link to="/events" className="text-sm text-muted transition-colors duration-150 hover:text-ink">
              Skip for now
            </Link>
          }
          <Link
            to="/events"
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors duration-150 sm:w-auto ${
            anyConnected ? 'bg-ink text-white hover:bg-navy' : 'border border-line bg-white text-ink hover:bg-canvas'}`
            }>
            
            See my events
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </main>

      <ConsentDialog source={consentFor} onAllow={allow} onCancel={cancel} />
    </div>);

}