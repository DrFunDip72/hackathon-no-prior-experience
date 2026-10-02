import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '../contexts/SessionContext';
import { calendarSources } from '../data/calendarSources';
import { buildSchedule } from '../data/schedule';
import { api } from '../utils/api';
import { API_URL, fetchEventsByIds, fetchRecentEvents, fetchRecommendedEvents, toApiProfile } from '../utils/backend';
import { daysFromToday } from '../utils/dates';
import { AI_GOOD_MATCH, AI_STRONG_MATCH, getProfileTerms, isGoodMatch, isHiddenFromFeed, scoreEvent } from '../utils/matching';
import { cachedScores, fetchAiScores, rankKey, type AiScores } from '../utils/aiRank';
import { containsWord, termMatch, unique } from '../utils/text';
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

/** How far back "My plan" lists ended events a student can mark as attended without having saved them. */
export const RECENT_DAYS = 14;

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

/** "a", "a and b", "a, b and c". */
function listOf(items: string[]): string {
  return items.length < 2 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const withArticle = (noun: string) => `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;

/**
 * Keeps the API's reason when it names real matches; otherwise, for events the AI rates Good or better,
 * says in plain words what connects the event to this student, using only facts we have (until Phase 2's
 * per-event AI reasons replace this): a target role the event covers, a listed skill it mentions,
 * an industry they picked, or else who's there. A field-only API reason ("Covers product…") on an event
 * the AI rates below Good is often a mis-tag, so it gets a neutral line.
 */
function aiWhyLine(item: ScoredEvent, percent: number, profile: Profile): string | undefined {
  if (!item.targetCompanies.length && percent < AI_GOOD_MATCH) return neutralLine(item);
  const hasApiReason = item.reason && item.reasons.length > 0 && !GENERIC_REASON.test(item.reason);
  if (hasApiReason || percent < AI_GOOD_MATCH) return item.reason;

  const { event } = item;
  const topics = event.tags.slice(0, 3);
  const close = percent >= AI_STRONG_MATCH;

  const role = profile.lookingFor.roleTypes.map((r) => r.trim()).find((r) => r && event.tags.some((t) => termMatch(r, t)));
  if (role) {
    return `Covers ${listOf(topics)}, ${close ? 'a close fit' : 'a fit'} for the ${role.toLowerCase()} roles you’re after.`;
  }

  const text = `${event.title} ${event.description}`;
  const skills = unique([...profile.topSkills, ...profile.skillGroups.flatMap((g) => g.skills)]).
  // Short skills ("Go", "SQL") must match case too, so "go to the lobby" doesn't count.
  filter((s) => s.trim().length > 1 && containsWord(text, s) && (s.length > 4 || text.includes(s))).
  slice(0, 2);
  if (skills.length) return `Puts ${listOf(skills)} to work, ${skills.length > 1 ? 'both skills' : 'a skill'} you listed.`;

  const industry = event.tags.find((t) => profile.interests.industries.some((i) => termMatch(i, t)));
  if (industry) return `Focused on ${industry}, one of the industries you picked.`;

  const names = item.employers.slice(0, 2).map((e) => e.name);
  const what = withArticle(event.type.toLowerCase());
  return `Close to what your profile describes: ${what}${names.length ? ` with ${listOf(names)}` : ''}.`;
}

/** For an ended event outside the ranked feed: a plain line instead of the "saved, not in your matches" note. */
const asPast = (item: ScoredEvent): ScoredEvent => ({ ...item, reason: neutralLine(item) });

/** `withRecent` also loads events that ended in the last RECENT_DAYS days (the Events page's "My plan"). */
export function useEventFeed({ withRecent = false } = {}) {
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

  // Recently ended events, so a student can say they went to one even if they never saved it.
  // Optional: if this fails the list just doesn't show. Sample data uses the sample events instead.
  const [recentRaw, setRecentRaw] = useState<CampusEvent[]>([]);
  useEffect(() => {
    if (!withRecent || !API_URL) return;
    let alive = true;
    fetchRecentEvents(RECENT_DAYS).
    then((result) => alive && setRecentRaw(result)).
    catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [withRecent, attempt]);

  // Saved events that dropped out of the ranked feed (outside its window, or relevant_only) are loaded by id,
  // so "My plan" doesn't silently lose them. Each id is requested once per page load; `retry` clears that.
  // Sample data never needs this (nothing drops out).
  const [saved, setSaved] = useState<CampusEvent[]>([]);
  const [savedError, setSavedError] = useState(false);
  const requested = useRef(new Set<string>());
  const missingKey = API_URL && raw ?
  state.addedEventIds.
  filter((id) => !requested.current.has(id) && !raw.some((e) => e.id === id) && !recentRaw.some((e) => e.id === id)).
  join(',') :
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

  // Every event the feed returned, ended ones included: "My plan" keeps those so the student can mark attendance.
  const rawScored = useMemo(() => {
    if (!raw) return [];
    const terms = getProfileTerms(profile);
    return raw.map((e) => scoreEvent(e, profile, terms, schedule));
  }, [raw, profile, schedule]);

  // The feed drops ended events; in-progress ones stay (the API returns them, shown as "Happening now").
  const apiScored = useMemo(() => {
    const now = new Date();
    const scored = rawScored.filter((e) => e.end > now);
    // API results arrive ranked best-first; keep that order. Only sample data is ranked here.
    return API_URL ? scored : scored.sort((a, b) => b.score - a.score);
  }, [rawScored]);

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
  // doesn't vanish when it drops out of the ranked feed (or ends), not to compete for feed placement.
  const savedScored = useMemo(() => {
    const terms = getProfileTerms(profile);
    const now = new Date();
    return saved.map((e) => scoreEvent(e, profile, terms, schedule)).map((e) => e.end <= now ? asPast(e) : e);
  }, [saved, profile, schedule]);

  // Events that ended in the last RECENT_DAYS days, newest first.
  const recentScored = useMemo(() => {
    const now = new Date();
    const since = now.getTime() - RECENT_DAYS * 86_400_000;
    const terms = getProfileTerms(profile);
    const pool = API_URL ? recentRaw.map((e) => scoreEvent(e, profile, terms, schedule)) : rawScored;
    return pool.
    filter((e) => e.end <= now && e.end.getTime() > since).
    map(asPast).
    sort((a, b) => b.start.getTime() - a.start.getTime());
  }, [recentRaw, rawScored, profile, schedule]);

  const fromSources = useMemo(
    () => allScored.filter((s) => showingAllSources || connectedSources.includes(s.event.sourceId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allScored, sourcesKey]
  );
  // Off-topic events (AI percent < 20) leave the feed; "My plan" below still shows saved ones.
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

  // With AI percents, "For you" leads with Good-or-better fits (isGoodMatch: AI percent >= 40) and keeps the
  // rest behind a "weaker fit" expander, so a 22% event never pads the list but nothing vanishes either.
  // Without AI (unavailable or still loading), every item stays in `top`, as before.
  const { top, weaker } = useMemo(() => {
    if (!items.some((i) => i.aiPercent !== undefined)) return { top: items, weaker: [] as ScoredEvent[] };
    return { top: items.filter(isGoodMatch), weaker: items.filter((i) => !isGoodMatch(i)) };
  }, [items]);

  // Every saved event, ended ones included (Events splits them into upcoming, to mark, and past).
  // Prefer the ranked copy (it has the AI percent), then any other copy we have.
  const planned = useMemo(
    () => {
      const byId = new Map<string, ScoredEvent>();
      for (const s of [...allScored, ...rawScored, ...recentScored, ...savedScored]) if (!byId.has(s.event.id)) byId.set(s.event.id, s);
      return state.addedEventIds.
      flatMap((id) => byId.get(id) ?? []).
      sort((a, b) => a.start.getTime() - b.start.getTime());
    },
    [allScored, rawScored, recentScored, savedScored, state.addedEventIds]
  );

  /** Recently ended events not in the plan, for "Went to something you didn't save?". */
  const recent = useMemo(
    () => recentScored.filter((s) => !state.addedEventIds.includes(s.event.id)),
    [recentScored, state.addedEventIds]
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
    /** Every event passing the filters, best first. */
    items,
    /** `items` split for "For you": Good-or-better AI fits first, the rest behind an expander (all in `top` without AI). */
    top,
    weaker,
    total: scored.length,
    /** Events left out of the feed as off-topic (see isHiddenFromFeed). */
    hiddenCount: fromSources.length - scored.length,
    planned,
    recent,
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