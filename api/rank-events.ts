/**
 * POST /api/rank-events
 *
 * Phase 1 of AI ranking: scores how well each event fits a student with Gemini embeddings.
 * The events API (Railway) still picks the candidate events; this only re-scores them, so the
 * feed understands roles ("Associate Product Specialist" ~ product manager) that keyword
 * matching misses. One Gemini call per request: the profile and every event in one batch.
 *
 * Body:
 *   { profile: RankProfile, events: [{ id, text, companies? }] }   (1 to 98 events)
 * Responses:
 *   200 { scores: [{ id, percent }] }   percent is 0 to 99, see toPercent below
 *   400 bad input · 403 request from another website · 429 Gemini rate limited
 *   502 Gemini failing · 503 'ai_unavailable' (no or rejected GEMINI_API_KEY): the app keeps the API's own order
 */
import * as z from 'zod/v4';

const MAX_EVENTS = 98; // Gemini batches hold 100 texts; two are the profile and the anchor
const TIMEOUT_MS = 20_000;
const PER_MODEL_TIMEOUT_MS = 8_000;
const RETRYABLE_STATUS = new Set([404, 429, 500, 503]);
const DIMENSIONS = 768;

/**
 * A generic, nobody-in-particular info session. Raw cosine similarity drifts with how much the profile
 * says (adding "Junior Information Systems major" lifts every event by ~0.04), so events are scored
 * by how much closer they are to the student than this anchor is: delta = cos(profile, event) - cos(profile, ANCHOR).
 */
const ANCHOR = 'Info Session\nType: Info session\nA company presents to BYU students, hosted by the career center.';

/**
 * Tried in order; 404 means Google retired the name for this key, so try the next.
 * Each model has its own calibration band [lo, hi] for delta, measured on the live BYU feed
 * (Oct 2, 2026) with PM and SWE profiles (with and without a major) plus hand-written on-role events:
 *   gemini-embedding-2:   craft nights/FHE -0.05 to -0.08, other fields' info sessions -0.01 to +0.01,
 *                         on-role events ("Associate Product Specialist" for a PM) +0.05 to +0.09
 *   gemini-embedding-001: -0.05 to -0.11, -0.06 to 0, and +0.06 to +0.08 for the same groups
 * gemini-embedding-2 takes no taskType; it uses the documented in-text task prefixes instead.
 */
const MODELS = [
  { name: 'gemini-embedding-2', lo: -0.032, hi: 0.088, taskType: false },
  { name: 'gemini-embedding-001', lo: -0.05, hi: 0.08, taskType: true }
] as const;
type Model = (typeof MODELS)[number];

const embedUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`;

const shortText = (max: number) => z.string().trim().max(max);
const list = (maxItems: number, maxChars = 80) => z.array(shortText(maxChars)).max(maxItems).default([]);

const ProfileSchema = z.object({
  roles: list(6),
  employmentType: shortText(40).default(''),
  major: shortText(100).default(''),
  year: shortText(30).default(''),
  skills: list(12),
  industries: list(8),
  companies: list(12),
  headline: shortText(200).default(''),
  summary: shortText(700).default('')
});
type RankProfile = z.infer<typeof ProfileSchema>;

const BodySchema = z.object({
  profile: ProfileSchema,
  events: z
    .array(z.object({ id: z.string().min(1).max(100), text: z.string().max(4000), companies: list(30, 120) }))
    .min(1)
    .max(MAX_EVENTS)
});

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

// Blocks other websites from spending our API budget through visitors' browsers.
function isCrossSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

function profileText(p: RankProfile): string {
  const lines = [
    p.roles.length && `Target roles: ${p.roles.join(', ')}`,
    p.employmentType && p.employmentType !== 'Either' && `Looking for: ${p.employmentType}`,
    (p.major || p.year) && `Student: ${[p.year, p.major && `${p.major} major`].filter(Boolean).join(' ')}`,
    p.skills.length && `Skills: ${p.skills.join(', ')}`,
    p.industries.length && `Industries: ${p.industries.join(', ')}`,
    p.companies.length && `Target companies: ${p.companies.join(', ')}`,
    p.headline,
    p.summary
  ];
  return lines.filter(Boolean).join('\n');
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** True when a target company is the event's company, allowing "Microsoft" ~ "Microsoft Corporation". */
function sameCompany(target: string, company: string): boolean {
  const a = normName(target);
  const b = normName(company);
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 4 && ` ${long} `.includes(` ${short} `);
}

/**
 * percent = min(99, round(10 + 75 * s + companyBoost))
 *   s = clamp((delta - lo) / (hi - lo), 0, 1)         delta vs. ANCHOR, model-specific band, see MODELS
 *   companyBoost = 25 for the first target company attending, +8 for each additional
 * So unrelated events land around 10 to 30, clearly on-role ones around 60 to 85, and an event
 * with a target company (the strongest real signal) jumps to the top.
 */
function toPercent(delta: number, model: Model, targetHits: number): number {
  const s = Math.min(1, Math.max(0, (delta - model.lo) / (model.hi - model.lo)));
  const boost = targetHits > 0 ? 25 + (targetHits - 1) * 8 : 0;
  return Math.min(99, Math.round(10 + 75 * s + boost));
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function embedRequest(model: Model, texts: string[]) {
  return {
    requests: texts.map((text, i) => {
      const isQuery = i === 0;
      return {
        model: `models/${model.name}`,
        content: {
          parts: [{ text: model.taskType ? text : isQuery ? `task: search result | query: ${text}` : `title: none | text: ${text}` }]
        },
        ...(model.taskType ? { taskType: isQuery ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT' } : {}),
        outputDimensionality: DIMENSIONS
      };
    })
  };
}

export async function POST(request: Request): Promise<Response> {
  if (isCrossSite(request)) return json(403, { error: 'cross_site' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(503, { error: 'ai_unavailable' });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json(400, { error: 'invalid_body' });
  const { profile, events } = parsed.data;
  const query = profileText(profile);
  if (!query) return json(400, { error: 'empty_profile' });

  // [profile (query), anchor, ...events]
  const texts = [query, ANCHOR, ...events.map((e) => e.text.slice(0, 1500))];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let res: Response | undefined;
    let used: Model | undefined;
    for (const model of MODELS) {
      try {
        res = await fetch(embedUrl(model.name), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(PER_MODEL_TIMEOUT_MS)]),
          body: JSON.stringify(embedRequest(model, texts))
        });
      } catch (error) {
        if (controller.signal.aborted) throw error;
        console.warn(`rank-events: ${model.name} took too long, trying the next model`);
        res = undefined;
        continue;
      }
      used = model;
      if (!RETRYABLE_STATUS.has(res.status)) break;
      console.warn(`rank-events: ${model.name} answered ${res.status}, trying the next model`);
    }
    if (!res || !used) return json(502, { error: 'ai_error' });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      if (res.status === 401 || res.status === 403 || (res.status === 400 && /API_KEY_INVALID|API key not valid/i.test(detail))) {
        console.error(`rank-events: Gemini rejected the API key (${res.status})`);
        return json(503, { error: 'ai_unavailable' });
      }
      if (res.status === 429) return json(429, { error: 'rate_limited' });
      console.error(`rank-events: Gemini error ${res.status}`);
      return json(502, { error: 'ai_error' });
    }

    const data = (await res.json()) as { embeddings?: { values?: number[] }[] };
    const vectors = data.embeddings?.map((e) => e.values ?? []) ?? [];
    if (vectors.length !== texts.length || vectors.some((v) => !v.length)) {
      console.error('rank-events: Gemini returned the wrong number of embeddings');
      return json(502, { error: 'ai_error' });
    }

    const model = used;
    const baseline = cosine(vectors[0], vectors[1]);
    const scores = events.map((event, i) => {
      const hits = profile.companies.filter((t) => event.companies.some((c) => sameCompany(t, c))).length;
      return { id: event.id, percent: toPercent(cosine(vectors[0], vectors[i + 2]) - baseline, model, hits) };
    });
    return json(200, { scores, model: model.name });
  } catch (error) {
    if (controller.signal.aborted) {
      console.error('rank-events: Gemini timed out');
      return json(502, { error: 'ai_timeout' });
    }
    console.error('rank-events: unexpected error', error instanceof Error ? error.message : 'unknown');
    return json(502, { error: 'ai_error' });
  } finally {
    clearTimeout(timer);
  }
}
