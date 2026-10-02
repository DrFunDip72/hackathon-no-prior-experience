import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { calendarSources } from '../data/calendarSources';
import { api } from '../utils/api';
import { API_URL, fetchRecommendedEvents } from '../utils/backend';
import { daysFromToday } from '../utils/dates';
import { getProfileTerms, scoreEvent } from '../utils/matching';
import { unique } from '../utils/text';
import type { CalendarSourceId } from '../types/calendar';
import type { CampusEvent, EventType } from '../types/event';
import type { Profile } from '../types/profile';

export type DateRange = 'week' | 'twoWeeks' | 'month';

export interface FeedFilters {
  range: DateRange;
  types: EventType[];
  industries: string[];
  hideConflicts: boolean;
}

export const defaultFilters: FeedFilters = { range: 'month', types: [], industries: [], hideConflicts: false };

const RANGE_DAYS: Record<DateRange, number> = { week: 7, twoWeeks: 14, month: 31 };

export function useEventFeed() {
  const { state } = useSession();
  const profile = state.profile as Profile;
  const [raw, setRaw] = useState<CampusEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState<FeedFilters>(defaultFilters);

  useEffect(() => {
    let alive = true;
    setError(false);
    setRaw(null);
    (API_URL ? fetchRecommendedEvents(profile) : api.fetchEvents()).
    then((result) => alive && setRaw(result)).
    catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const googleConnected = Boolean(state.connections.google);
  const connectedSources = calendarSources.
  filter((s) => s.provider === 'BYU' && state.connections[s.id]).
  map((s) => s.id as CalendarSourceId);
  const sourcesKey = connectedSources.join(',');
  const showingAllSources = connectedSources.length === 0;

  const allScored = useMemo(() => {
    if (!raw) return [];
    const terms = getProfileTerms(profile);
    const now = new Date();
    return raw.
    map((e) => scoreEvent(e, profile, terms, googleConnected)).
    filter((e) => e.end > now).
    sort((a, b) => b.score - a.score);
  }, [raw, profile, googleConnected]);

  const scored = useMemo(
    () => allScored.filter((s) => showingAllSources || connectedSources.includes(s.event.sourceId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allScored, sourcesKey]
  );

  const items = useMemo(
    () =>
    scored.filter((s) => {
      if (daysFromToday(s.start) >= RANGE_DAYS[filters.range]) return false;
      if (filters.types.length && !filters.types.includes(s.event.type)) return false;
      if (filters.industries.length && !s.event.industries.some((i) => filters.industries.includes(i))) return false;
      if (filters.hideConflicts && s.conflict) return false;
      return true;
    }),
    [scored, filters]
  );

  const planned = useMemo(
    () =>
    allScored.
    filter((s) => state.addedEventIds.includes(s.event.id)).
    sort((a, b) => a.start.getTime() - b.start.getTime()),
    [allScored, state.addedEventIds]
  );

  const availableIndustries = useMemo(() => unique(scored.flatMap((s) => s.event.industries)).sort(), [scored]);

  const filtersActive =
  filters.range !== defaultFilters.range ||
  filters.types.length > 0 ||
  filters.industries.length > 0 ||
  filters.hideConflicts;

  return {
    loading: raw === null && !error,
    error,
    retry: () => setAttempt((a) => a + 1),
    items,
    total: scored.length,
    planned,
    filters,
    setFilters,
    resetFilters: () => setFilters(defaultFilters),
    filtersActive,
    availableIndustries,
    googleConnected,
    connectedSources,
    showingAllSources
  };
}