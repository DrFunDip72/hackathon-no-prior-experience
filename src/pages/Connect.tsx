import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const { user, state, updateState } = useSession();
  const [consentFor, setConsentFor] = useState<CalendarSource | null>(null);
  const [syncing, setSyncing] = useState<Partial<Record<CalendarId, boolean>>>({});

  const google = calendarSources.filter((s) => s.provider === 'Google');
  const byu = calendarSources.filter((s) => s.provider === 'BYU');
  const anyConnected = Object.values(state.connections).some(Boolean);

  const allow = async (source: CalendarSource) => {
    setConsentFor(null);
    setSyncing((s) => ({ ...s, [source.id]: true }));
    try {
      const count = await api.syncCalendar(source.id);
      updateState((s) => ({ ...s, connections: { ...s.connections, [source.id]: true } }));
      toast.success(`${source.name} connected`, { description: `${count} events synced` });
    } catch {
      toast.error(`Couldn’t connect ${source.name}. Try again.`);
    } finally {
      setSyncing((s) => ({ ...s, [source.id]: false }));
    }
  };

  const disconnect = (source: CalendarSource) => {
    updateState((s) => ({ ...s, connections: { ...s.connections, [source.id]: false } }));
    toast(`${source.name} disconnected`);
  };

  const cancel = useCallback(() => setConsentFor(null), []);

  const renderRows = (sources: CalendarSource[]) =>
  sources.map((source) =>
  <SourceRow
    key={source.id}
    source={source}
    connected={Boolean(state.connections[source.id])}
    syncing={Boolean(syncing[source.id])}
    onConnect={() => setConsentFor(source)}
    onDisconnect={() => disconnect(source)} />

  );

  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Connect your calendars</h1>
        <p className="mt-1.5 max-w-xl text-muted">
          Your schedule tells us when you’re free. BYU calendars tell us what’s happening and who’s coming.
        </p>

        <section aria-labelledby="personal-heading" className="mt-10">
          <h2 id="personal-heading" className="mb-3 text-sm font-semibold text-ink">
            Your schedule
          </h2>
          <ul className="overflow-hidden rounded-xl border border-line bg-white">{renderRows(google)}</ul>
        </section>

        <section aria-labelledby="byu-heading" className="mt-8">
          <h2 id="byu-heading" className="mb-3 text-sm font-semibold text-ink">
            BYU calendars
          </h2>
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

      <ConsentDialog source={consentFor} accountEmail={user?.email ?? ''} onAllow={allow} onCancel={cancel} />
    </div>);

}