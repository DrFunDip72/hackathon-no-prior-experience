import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { calendarSources } from '../data/calendarSources';
import { buildSchedule } from '../data/schedule';
import { api } from '../utils/api';
import { API_URL, fetchEventsByIds, fetchRecommendedEvents, toApiProfile } from '../utils/backend';
import { daysFromToday } from '../utils/dates';
import { AI_GOOD_MATCH, AI_STRONG_MATCH, getProfileTerms, isHiddenFromFeed, scoreEvent } from '../utils/matching';
import { cachedScores, fetchAiScores, rankKey, type AiScores } from '../utils/aiRank';
import { unique } from '../utils/text';
import type { CalendarSourceId } from '../types/calendar';
import type { CampusEvent, EventType, ScoredEvent } from '../types/event';
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

/**
 * AI percents for the API's feed (src/utils/aiRank.ts), or null while loading / when AI is unavailable.
 * One call per profile ranking fields + event set; a cached result shows on the first render.
 */
function useAiScores(profile: Profile, items: ScoredEvent[]): AiScores | null {
  const key = useMemo(() => API_URL && profile && items.length ? rankKey(profile, items) : '', [profile, items]);
  const [fetched, setFetched] = useState<{ key: string; scores: AiScores } | null>(null);
  const cached = useMemo(() => key ? cachedScores(key) : null, [key]);

  useEffect(() => {
    if (!key || cached) return;
    let alive = true;
    fetchAiScores(profile, items, key).then((scores) => alive && scores && setFetched({ key, scores }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, cached]);

  if (!key) return null;
  return cached ?? (fetched?.key === key ? fetched.scores : null);
}

/** The API's generic reason when nothing matched, e.g. "Upcoming info session, worth a look." */
const GENERIC_REASON = /worth a look\.?$/i;

/** A plain description from the event's own data, for when there's no real match to explain. */
function neutralLine(item: ScoredEvent): string {
  const { type, location } = item.event;
  const names = item.employers.map((e) => e.name);
  if (names.length) {
    const more = names.length > 2 ? ` and ${names.length - 2} more` : '';
    return `${type} with ${names.slice(0, 2).join(names.length === 2 ? ' and ' : ', ')}${more}.`;
  }
  if (item.people.length) return `${type} with ${item.people.length} ${item.people.length === 1 ? 'person' : 'people'} you can meet.`;
  return location && location !== 'Location TBA' ? `${type} at ${location}.` : `Campus ${type.toLowerCase()}.`;
}

/**
 * Keeps the API's reason when it names real matches; otherwise, for events the AI rates Good or better,
 * says what they fit (until Phase 2's per-event AI reasons replace this). A field-only API reason
 * ("Covers product…") on an event the AI rates below Good is often a mis-tag, so it gets a neutral line.
 */
function aiWhyLine(item: ScoredEvent, percent: number, profile: Profile): string | undefined {
  if (!item.targetCompanies.length && percent < AI_GOOD_MATCH) return neutralLine(item);
  const hasApiReason = item.reason && item.reasons.length > 0 && !GENERIC_REASON.test(item.reason);
  if (hasApiReason || percent < AI_GOOD_MATCH) return item.reason;
  const role = profile.lookingFor.roleTypes[0]?.trim();
  const industry = profile.interests.industries[0]?.trim();
  const topic = role ? `${role.toLowerCase()} roles` : industry ? industry.toLowerCase() : '';
  if (!topic) return percent >= AI_STRONG_MATCH ? 'Closely matches your profile.' : 'Related to your profile.';
  return percent >= AI_STRONG_MATCH ? `Closely matches your interest in ${topic}.` : `Related to your interest in ${topic}.`;
}

export function useEventFeed() {
  const { state } = useSession();
  const profile = state.profile as Profile;
  const [raw, setRaw] = useState<CampusEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [filters, setFilters] = useState<FeedFilters>(defaultFilters);
  // Refetch only when the fields the API ranks on change, not on every profile edit or render.
  const profileKey = API_URL && profile ? JSON.stringify(toApiProfile(profile)) : '';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, profileKey]);

  // Saved events that dropped out of the ranked feed (outside its window, or relevant_only) are loaded by id,
  // so "My plan" doesn't silently lose them. Each id is requested once per page load; `retry` clears that.
  // Sample data never needs this (nothing drops out).
  const [saved, setSaved] = useState<CampusEvent[]>([]);
  const [savedError, setSavedError] = useState(false);
  const requested = useRef(new Set<string>());
  const missingKey = API_URL && raw ?
  state.addedEventIds.filter((id) => !requested.current.has(id) && !raw.some((e) => e.id === id)).join(',') :
  '';

  useEffect(() => {
    if (!missingKey) return;
    const ids = missingKey.split(',');
    ids.forEach((id) => requested.current.add(id));
    setSavedError(false);
    // No cancel-on-cleanup: missingKey empties on the very next render (the ids are now requested),
    // and that must not drop the response. Setting state late is harmless.
    fetchEventsByIds(ids).
    then((result) => setSaved((prev) => [...prev.filter((p) => !ids.includes(p.id)), ...result])).
    catch(() => setSavedError(true));
  }, [missingKey]);

  const googleConnected = Boolean(state.connections.google);
  // Google Calendar is a preview: a sample week built from the student's major and target role.
  const schedule = useMemo(() => googleConnected ? buildSchedule(profile) : null, [googleConnected, profile]);
  // Only live sources narrow the feed: someone who connected a "soon" source (Clubs, Athletics) earlier
  // would otherwise get an empty feed, since no events come from it yet.
  const connectedSources = calendarSources.
  filter((s) => s.provider === 'BYU' && s.status === 'live' && state.connections[s.id]).
  map((s) => s.id as CalendarSourceId);
  const sourcesKey = connectedSources.join(',');
  const showingAllSources = connectedSources.length === 0;

  // Ended events drop out; in-progress ones stay (the API returns them, shown as "Happening now").
  const apiScored = useMemo(() => {
    if (!raw) return [];
    const terms = getProfileTerms(profile);
    const now = new Date();
    const scored = raw.
    map((e) => scoreEvent(e, profile, terms, schedule)).
    filter((e) => e.end > now);
    // API results arrive ranked best-first; keep that order. Only sample data is ranked here.
    return API_URL ? scored : scored.sort((a, b) => b.score - a.score);
  }, [raw, profile, schedule]);

  const aiScores = useAiScores(profile, apiScored);

  // With AI percents: best fit first (stable, so the API's order breaks ties), labels from the percent,
  // and a why line for events the API had nothing specific to say about. Without: the API's feed as is.
  const allScored = useMemo(() => {
    if (!aiScores) return apiScored;
    return apiScored.
    map((item) => {
      const aiPercent = aiScores[item.event.id];
      if (aiPercent === undefined) return item;
      return { ...item, aiPercent, score: aiPercent, reason: aiWhyLine(item, aiPercent, profile) };
    }).
    sort((a, b) => (b.aiPercent ?? -1) - (a.aiPercent ?? -1));
  }, [apiScored, aiScores, profile]);

  // Saved events loaded by id feed only "My plan" below, never "For you": they exist so a saved event
  // doesn't vanish when it drops out of the ranked feed, not to compete for feed placement.
  const savedScored = useMemo(() => {
    const terms = getProfileTerms(profile);
    const now = new Date();
    return saved.map((e) => scoreEvent(e, profile, terms, schedule)).filter((e) => e.end > now);
  }, [saved, profile, schedule]);

  const fromSources = useMemo(
    () => allScored.filter((s) => showingAllSources || connectedSources.includes(s.event.sourceId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allScored, sourcesKey]
  );
  // Off-topic events (FHE nights, dances, AI percent < 20) leave the feed; "My plan" below still shows saved ones.
  const scored = useMemo(() => fromSources.filter((s) => !isHiddenFromFeed(s)), [fromSources]);

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
    () => {
      const ranked = allScored.filter((s) => state.addedEventIds.includes(s.event.id));
      const extra = savedScored.filter((s) => state.addedEventIds.includes(s.event.id) && !ranked.some((r) => r.event.id === s.event.id));
      return [...ranked, ...extra].sort((a, b) => a.start.getTime() - b.start.getTime());
    },
    [allScored, savedScored, state.addedEventIds]
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
    retry: () => {
      requested.current.clear();
      setSavedError(false);
      setAttempt((a) => a + 1);
    },
    items,
    total: scored.length,
    /** Events left out of the feed as off-topic (see isHiddenFromFeed). */
    hiddenCount: fromSources.length - scored.length,
    planned,
    /** Some saved events couldn't be loaded by id; `retry` tries again. */
    plannedError: savedError,
    filters,
    setFilters,
    resetFilters: () => setFilters(defaultFilters),
    filtersActive,
    availableIndustries,
    googleConnected,
    schedule,
    connectedSources,
    showingAllSources
  };
}