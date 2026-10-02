import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarIcon, RefreshCwIcon, SlidersHorizontalIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '../components/AppHeader';
import { EventCard } from '../components/events/EventCard';
import { EventDetail } from '../components/events/EventDetail';
import { EventFilters } from '../components/events/EventFilters';
import { EventSkeleton } from '../components/events/EventSkeleton';
import { GoogleIcon } from '../components/ui/GoogleIcon';
import { useSession } from '../contexts/SessionContext';
import { useEventFeed } from '../hooks/useEventFeed';
import { useMediaQuery } from '../hooks/useMediaQuery';

type Tab = 'forYou' | 'plan';

export function Events() {
  const feed = useEventFeed();
  const { state, updateState } = useSession();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [tab, setTab] = useState<Tab>('forYou');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const list = tab === 'forYou' ? feed.items : feed.planned;
  const selected = list.find((i) => i.event.id === selectedId) ?? list[0] ?? null;
  const added = new Set(state.addedEventIds);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const markAdded = (id: string) => {
    if (added.has(id)) return;
    updateState((s) => ({ ...s, addedEventIds: [...s.addedEventIds, id] }));
    toast.success('Added to your plan', { description: 'Hit Save in the Google Calendar tab to finish.' });
  };

  const remove = (id: string) => {
    updateState((s) => ({ ...s, addedEventIds: s.addedEventIds.filter((x) => x !== id) }));
    toast('Removed from your plan');
  };

  const select = (id: string) => {
    setSelectedId(id);
    if (!isDesktop) setSheetOpen(true);
  };

  const filterPanel =
  <EventFilters
    filters={feed.filters}
    onChange={feed.setFilters}
    onReset={feed.resetFilters}
    filtersActive={feed.filtersActive}
    availableIndustries={feed.availableIndustries}
    googleConnected={feed.googleConnected}
    connectedSources={feed.connectedSources} />;



  const detail = selected &&
  <EventDetail
    item={selected}
    added={added.has(selected.event.id)}
    googleConnected={feed.googleConnected}
    onAdd={() => markAdded(selected.event.id)}
    onRemove={() => remove(selected.event.id)}
    onClose={isDesktop ? undefined : () => setSheetOpen(false)} />;



  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Events for you</h1>
            <p className="mt-1 text-sm text-muted">
              {feed.loading ?
              'Syncing BYU calendars…' :
              `${feed.total} upcoming events ranked by how well they fit your profile`}
            </p>
          </div>
          <div role="tablist" aria-label="Event lists" className="flex rounded-lg bg-white p-0.5 ring-1 ring-line">
            {([
            ['forYou', 'For you'],
            ['plan', `My plan${feed.planned.length ? ` (${feed.planned.length})` : ''}`]] as
            [Tab, string][]).map(([id, label]) =>
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                setSelectedId(null);
              }}
              className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
              tab === id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`
              }>
              
                {label}
              </button>
            )}
          </div>
        </div>

        {!feed.googleConnected &&
        <div className="mt-6 flex flex-col gap-3 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas">
                <GoogleIcon className="h-5 w-5" />
              </span>
              <p className="text-sm text-ink">
                <span className="font-medium">Connect Google Calendar</span>
                <span className="text-muted"> to flag events that clash with your classes and shifts.</span>
              </p>
            </div>
            <Link to="/connect" className="shrink-0 rounded-lg bg-ink px-3.5 py-2 text-center text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">
              Connect
            </Link>
          </div>
        }
        {feed.showingAllSources && !feed.loading &&
        <p className="mt-3 text-xs text-muted">
            Showing every public BYU calendar.{' '}
            <Link to="/connect" className="font-medium text-navy hover:underline">
              Choose sources
            </Link>
          </p>
        }

        <div className="mt-6 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)_380px]">
          <aside aria-label="Filters" className={tab === 'plan' ? 'hidden lg:block lg:invisible' : ''}>
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm font-medium text-ink lg:hidden">
              
              <SlidersHorizontalIcon className="h-4 w-4" aria-hidden="true" />
              {filtersOpen ? 'Hide filters' : 'Filters'}
            </button>
            <div className={`${filtersOpen ? 'mt-4 block rounded-xl border border-line bg-white p-4' : 'hidden'} lg:sticky lg:top-20 lg:mt-0 lg:block lg:border-0 lg:bg-transparent lg:p-0`}>
              {filterPanel}
            </div>
          </aside>

          <section aria-label={tab === 'forYou' ? 'Recommended events' : 'My plan'} className="min-w-0 space-y-3">
            {tab === 'plan' && feed.plannedError && !feed.loading &&
            <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm">
                <span className="text-muted">Some saved events couldn’t be loaded.</span>
                <button type="button" onClick={feed.retry} className="inline-flex shrink-0 items-center gap-1 font-medium text-navy hover:underline">
                  <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Retry
                </button>
              </div>
            }
            {feed.loading ?
            <>
                <EventSkeleton hero />
                <EventSkeleton />
                <EventSkeleton />
                <EventSkeleton />
              </> :
            feed.error ?
            <div className="rounded-xl border border-line bg-white px-6 py-14 text-center">
                <p className="font-medium text-ink">We couldn’t reach BYU calendars</p>
                <p className="mt-1 text-sm text-muted">Check your connection and try again.</p>
                <button type="button" onClick={feed.retry} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-navy">
                  <RefreshCwIcon className="h-4 w-4" aria-hidden="true" /> Retry
                </button>
              </div> :
            list.length === 0 ?
            <div className="rounded-xl border border-line bg-white px-6 py-14 text-center">
                <CalendarIcon className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
                {tab === 'forYou' ?
              <>
                    <p className="mt-3 font-medium text-ink">No events match these filters</p>
                    <p className="mt-1 text-sm text-muted">Try a wider date range or fewer types.</p>
                    <button type="button" onClick={feed.resetFilters} className="mt-5 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
                      Clear filters
                    </button>
                  </> :

              <>
                    <p className="mt-3 font-medium text-ink">Nothing in your plan yet</p>
                    <p className="mt-1 text-sm text-muted">Events you add to Google Calendar show up here.</p>
                    <button type="button" onClick={() => setTab('forYou')} className="mt-5 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-canvas">
                      Browse events
                    </button>
                  </>
              }
              </div> :

            list.map((item, i) =>
            <EventCard
              key={item.event.id}
              item={item}
              variant={tab === 'forYou' && i === 0 ? 'hero' : 'row'}
              selected={isDesktop && selected?.event.id === item.event.id}
              added={added.has(item.event.id)}
              googleConnected={feed.googleConnected}
              onSelect={() => select(item.event.id)}
              onAdd={() => markAdded(item.event.id)} />

            )
            }
          </section>

          <aside aria-label="Event details" className="hidden lg:block">
            {detail && !feed.loading &&
            <div className="sticky top-20 h-[calc(100vh-6rem)] overflow-hidden rounded-xl border border-line bg-white">{detail}</div>
            }
          </aside>
        </div>
      </main>

      <AnimatePresence>
        {!isDesktop && sheetOpen && detail &&
        <>
            <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSheetOpen(false)}
            className="fixed inset-0 z-40 bg-ink/40" />
          
            <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Event details"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 h-[85vh] overflow-hidden rounded-t-2xl bg-white">
            
              {detail}
            </motion.div>
          </>
        }
      </AnimatePresence>
    </div>);

}