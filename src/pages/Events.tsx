import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarIcon, ChevronDownIcon, RefreshCwIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '../components/AppHeader';
import { EventCard } from '../components/events/EventCard';
import { EventDetail } from '../components/events/EventDetail';
import { EventFilters } from '../components/events/EventFilters';
import { EventSkeleton } from '../components/events/EventSkeleton';
import { NoGoodMatches } from '../components/events/NoGoodMatches';
import { GoogleIcon } from '../components/ui/GoogleIcon';
import { useSession } from '../contexts/SessionContext';
import { useEventFeed } from '../hooks/useEventFeed';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { usePageTitle } from '../hooks/usePageTitle';
import { AI_GOOD_MATCH, GOOD_MATCH, isGoodMatch } from '../utils/matching';
import type { ScoredEvent } from '../types/event';

type Tab = 'forYou' | 'plan';

const CONNECT_DISMISSED_KEY = 'doorway_connect_banner_dismissed';

/** The Connect Google Calendar suggestion stays dismissed on this device. Storage can be blocked, so never throw. */
function readConnectDismissed(): boolean {
  try {
    return localStorage.getItem(CONNECT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function saveConnectDismissed(): void {
  try {
    localStorage.setItem(CONNECT_DISMISSED_KEY, '1');
  } catch {
    // Dismissed for this visit only.
  }
}

export function Events() {
  usePageTitle('Events');
  const feed = useEventFeed();
  const { state, updateState } = useSession();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [tab, setTab] = useState<Tab>('forYou');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showWeaker, setShowWeaker] = useState(false);
  const [connectDismissed, setConnectDismissed] = useState(readConnectDismissed);

  const list = tab === 'forYou' ? feed.items : feed.planned;
  const added = new Set(state.addedEventIds);
  // Same thresholds as the labels (isGoodMatch): nothing reaching "Good match" means nothing better than "Worth a look".
  // Without AI, an event with no match reasons (shown as "—") counts as no match, not a weak one.
  const noGoodMatches = tab === 'forYou' && list.length > 0 && !list.some(isGoodMatch);
  const aiRanked = list.some((i) => i.aiPercent !== undefined);
  // "For you" shows Good-or-better fits; weaker ones (AI only) wait behind the expander at the bottom.
  const weaker = tab === 'forYou' ? feed.weaker : [];
  const lead = tab === 'plan' ? feed.planned : noGoodMatches ? [] : feed.top;
  const visible = showWeaker ? [...lead, ...weaker] : lead;
  const selected = visible.find((i) => i.event.id === selectedId) ?? visible[0] ?? null;

  // Clicking "Events" (nav or logo) while already here is a navigation to the same path with a new key:
  // go back to the default view, the "For you" tab at the top with no filters.
  const { key: locationKey } = useLocation();
  const firstLocation = useRef(locationKey);
  useEffect(() => {
    if (locationKey === firstLocation.current) return;
    firstLocation.current = locationKey;
    setTab('forYou');
    setSelectedId(null);
    setShowWeaker(false);
    setSheetOpen(false);
    setFiltersOpen(false);
    feed.resetFilters();
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey]);

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

  const card = (item: ScoredEvent, variant: 'hero' | 'row') =>
  <EventCard
    key={item.event.id}
    item={item}
    variant={variant}
    selected={isDesktop && selected?.event.id === item.event.id}
    added={added.has(item.event.id)}
    googleConnected={feed.googleConnected}
    onSelect={() => select(item.event.id)}
    onAdd={() => markAdded(item.event.id)} />;


  // Counts what's actually listed: the tab, the filters, and (with AI) the Good-or-better fits shown up top.
  const count = (n: number, noun: string, plural = `${noun}s`) => `${n} ${n === 1 ? noun : plural}`;
  const subtitle = feed.loading ?
  'Syncing BYU calendars…' :
  tab === 'plan' ?
  feed.planned.length ? `${count(feed.planned.length, 'event')} in your plan, in date order` : 'Nothing in your plan yet' :
  [
  feed.filtersActive ?
  `${feed.items.length} of ${count(feed.total, 'event')} ${feed.items.length === 1 ? 'matches' : 'match'} your filters` :
  weaker.length ?
  `${count(feed.top.length, 'good match', 'good matches')} out of ${count(feed.items.length, 'upcoming event')}` :
  `${count(feed.items.length, 'upcoming event')}, ranked by how well ${feed.items.length === 1 ? 'it fits' : 'they fit'} your profile`,
  feed.hiddenCount ? `${feed.hiddenCount} off-topic hidden` : ''].
  filter(Boolean).
  join(' · ');

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
    schedule={feed.schedule}
    onAdd={() => markAdded(selected.event.id)}
    onRemove={() => remove(selected.event.id)}
    onClose={isDesktop ? undefined : () => setSheetOpen(false)} />;



  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Events for you</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(`webcal://${window.location.host}/calendar.ics`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-target inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas sm:px-3.5 sm:py-2">
                <GoogleIcon className="h-4 w-4" />
                Subscribe in Google Calendar
              </a>
              <button
                type="button"
                onClick={() =>
                navigator.clipboard.writeText(`${window.location.origin}/calendar.ics`).then(
                  () => toast.success('Calendar link copied', { description: 'Paste it into Apple Calendar or Outlook.' }),
                  () => toast.error('Could not copy the link')
                )}
                className="tap-target text-sm font-medium text-navy hover:underline">
                Copy link
              </button>
            </div>
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
                setShowWeaker(false);
              }}
              className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
              tab === id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`
              }>
              
                {label}
              </button>
            )}
          </div>
        </div>

        {!feed.googleConnected && !connectDismissed &&
        // One line on phones (so the first event is in view), a fuller card from sm up.
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-white py-2 pl-3 pr-1.5 sm:mt-6 sm:p-4">
            <span className="flex shrink-0 items-center justify-center sm:h-9 sm:w-9 sm:rounded-lg sm:bg-canvas">
              <GoogleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm text-ink sm:whitespace-normal">
              <span className="font-medium">Connect Google Calendar</span>
              <span className="hidden text-muted sm:inline"> (preview) to see how conflict checks work, using a sample class schedule.</span>
            </p>
            <Link to="/connect?from=events" className="tap-target shrink-0 rounded-lg bg-ink px-3 py-1.5 text-center text-sm font-medium text-white transition-colors duration-150 hover:bg-navy sm:px-3.5 sm:py-2">
              Connect
            </Link>
            <button
            type="button"
            onClick={() => {
              setConnectDismissed(true);
              saveConnectDismissed();
            }}
            aria-label="Dismiss the Google Calendar suggestion"
            className="tap-target shrink-0 rounded-md p-1.5 text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink">
              <XIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        }
        {feed.showingAllSources && !feed.loading &&
        <p className="mt-2 text-xs text-muted sm:mt-3">
            Showing every public BYU calendar.{' '}
            <Link to="/connect?from=events" className="tap-target inline-block font-medium text-navy hover:underline">
              Choose sources
            </Link>
          </p>
        }

        <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[200px_minmax(0,1fr)_380px]">
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
            <>
                {noGoodMatches && <NoGoodMatches threshold={aiRanked ? AI_GOOD_MATCH : GOOD_MATCH} />}
                {lead.map((item, i) => card(item, tab === 'forYou' && i === 0 ? 'hero' : 'row'))}
                {weaker.length > 0 &&
              <div className="flex justify-center pt-2">
                    <button
                  type="button"
                  onClick={() => setShowWeaker((s) => !s)}
                  aria-expanded={showWeaker}
                  className="tap-target inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-150 hover:bg-white hover:text-ink">
                      <ChevronDownIcon className={`h-4 w-4 transition-transform duration-150 ${showWeaker ? 'rotate-180' : ''}`} aria-hidden="true" />
                      {showWeaker ?
                  'Hide weaker fits' :
                  `Show ${weaker.length} more ${weaker.length === 1 ? 'event' : 'events'} (weaker fit)`}
                    </button>
                  </div>
              }
                {showWeaker && weaker.map((item) => card(item, 'row'))}
              </>
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