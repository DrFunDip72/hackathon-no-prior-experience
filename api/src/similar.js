// Near-duplicate detection: the same event often arrives from two sources with slightly different titles or room
// names ("Graduate School Fair" vs "Grad School Fair", "TNRB 2051" vs "Tanner Building, TNRB 2051 (251)").
// Two events are the same when they start within 30 minutes of each other, are in the same place, and their
// normalized titles share at least 80% of their words.

const ABBREVIATIONS = {
  grad: 'graduate', info: 'information', eng: 'engineering', engr: 'engineering', univ: 'university',
  prof: 'professor', mgmt: 'management', cs: 'computer science', is: 'information systems', intro: 'introduction',
  comp: 'computer', sci: 'science', dept: 'department', recruiting: 'recruit', recruitment: 'recruit', sessions: 'session', fairs: 'fair'
};
const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'and', 'at', 'for', 'with', 'to', 'in', 'on', 'by', 'f2026']);

export function titleTokens(title) {
  const words = String(title ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  return new Set(words.flatMap((w) => (ABBREVIATIONS[w] ?? w).split(' ')).filter((w) => !STOPWORDS.has(w)));
}

// Jaccard overlap of the two titles' word sets, 0 to 1.
export function titleSimilarity(a, b) {
  const x = titleTokens(a);
  const y = titleTokens(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared);
}

export const SIMILARITY_THRESHOLD = 0.8;
export const START_WINDOW_MS = 30 * 60_000;

// Campus buildings are written both ways ("WSC Ballroom", "Wilkinson Center Ballroom"), so abbreviations are expanded.
const BUILDINGS = {
  wsc: 'wilkinson student center', tnrb: 'tanner building', tmcb: 'talmage math sciences computer building',
  hbll: 'harold b lee library', jfsb: 'joseph f smith building', jkb: 'joseph knight building', esc: 'engineering science computing'
};
const placeTokens = (loc) => new Set(
  String(loc ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).flatMap((w) => (BUILDINGS[w] ?? w).split(' '))
);
const unknownPlace = (tokens) => tokens.size === 0 || (tokens.size === 1 && tokens.has('tbd'));

// Same place when the names match, when one is contained in the other ("TNRB 2051" inside "Tanner Building, TNRB 2051 (251)"),
// or when either is unknown ("", "TBD"). The title and time checks still have to pass.
export function sameLocation(a, b) {
  const x = placeTokens(a);
  const y = placeTokens(b);
  if (unknownPlace(x) || unknownPlace(y)) return true;
  const [small, big] = x.size <= y.size ? [x, y] : [y, x];
  return [...small].every((t) => big.has(t));
}

export function isNearDuplicate(a, b) {
  const gap = Math.abs(new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  return gap <= START_WINDOW_MS && sameLocation(a.location, b.location) && titleSimilarity(a.title, b.title) >= SIMILARITY_THRESHOLD;
}
