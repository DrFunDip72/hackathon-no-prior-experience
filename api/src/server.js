import { createServer } from 'node:http';
import { pool, queryEvents, queryEventsByIds, queryCompanies, upsertEvent } from './db.js';
import { recommend, DEFAULT_WINDOW_DAYS } from './scoring.js';
import { readFileSync } from 'node:fs';
import { submitEvent, submitBulk } from './submit.js';
import { checkSubmitToken, createRateLimiter, clientIp } from './guard.js';
import { ingestByu } from './ingest-byu.js';
import { ingestSheets, discoverTabUrls } from './ingest-sheet.js';
import { ingestCs } from './ingest-cs.js';
import { cleanByuEvents } from './backfill.js';

const DAY_MS = 86_400_000;
const PORT = process.env.PORT ?? 3000;

const fail = (status, message) => Object.assign(new Error(message), { status });

// /submit and /submit/bulk spend LLM credit, so they need SUBMIT_TOKEN and are rate limited per client.
const submitAllowed = createRateLimiter({ max: 30, windowMs: 3_600_000 });
function guardSubmit(req) {
  const check = checkSubmitToken(req.headers, process.env.SUBMIT_TOKEN);
  if (!check.ok) throw fail(check.status, check.error);
  if (!submitAllowed(clientIp(req))) throw fail(429, 'too many submissions; try again later');
}

const pasteHtml = readFileSync(new URL('./paste.html', import.meta.url), 'utf8');

const send = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type,x-submit-token,authorization',
    'access-control-allow-methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(body));
};

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 12_000_000) throw fail(413, 'body too large');
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw fail(400, 'invalid JSON');
  }
}

// from/to default to today through 21 days out.
function dateWindow({ from, to }) {
  const start = from ? new Date(from) : new Date();
  const end = to ? new Date(to) : new Date(start.getTime() + DEFAULT_WINDOW_DAYS * DAY_MS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw fail(400, 'invalid from/to date');
  return { start, end };
}

const routes = {
  'GET /health': async () => {
    await pool.query('select 1');
    return { ok: true };
  },

  'GET /events': async (req, url) => {
    const ids = url.searchParams.get('ids');
    if (ids) return queryEventsByIds(ids.split(',').map((i) => i.trim()).filter(Boolean).slice(0, 100));
    const { start, end } = dateWindow({ from: url.searchParams.get('from'), to: url.searchParams.get('to') });
    return queryEvents({ from: start, to: end, company: url.searchParams.get('company') });
  },

  'GET /companies': async () => queryCompanies(),

  'POST /recommendations': async (req) => {
    const { from, to, relevant_only: relevantOnly, ...profile } = await readJson(req);
    if (!Array.isArray(profile.target_companies)) throw fail(400, 'profile.target_companies is required');
    const { start, end } = dateWindow({ from, to });
    return recommend(await queryEvents({ from: start, to: end }), profile, { from: start, to: end, relevantOnly: Boolean(relevantOnly) });
  },

  // Many events from one pasted dump (e.g. a Slack channel copied into /paste). Stores only the extracted events.
  'POST /submit/bulk': async (req) => {
    guardSubmit(req);
    return submitBulk(await readJson(req), { save: upsertEvent });
  },

  'POST /submit': async (req) => {
    guardSubmit(req);
    return submitEvent(await readJson(req), { save: upsertEvent });
  }
};

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/paste') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(pasteHtml);
  }
  const byId = req.method === 'GET' ? /^\/events\/([\w-]+)$/.exec(url.pathname) : null;
  const handler = byId ? async () => {
    const [event] = await queryEventsByIds([byId[1]]);
    if (!event) throw fail(404, 'event not found');
    return event;
  } : routes[`${req.method} ${url.pathname}`];
  if (!handler) return send(res, 404, { error: 'not found' });
  try {
    send(res, 200, await handler(req, url));
  } catch (err) {
    // Provider and database errors can contain submitted text; never log those details.
    if (!err.status) console.error(url.pathname.startsWith('/submit') ? 'submission failed' : err);
    send(res, err.status ?? 500, { error: err.status ? err.message : 'internal error' });
  }
}).listen(PORT, () => console.log(`api listening on :${PORT}`));

// Fix events stored before the current classifier (and drop non-career ones) before the ingests run.
cleanByuEvents().catch((err) => console.error('byu clean-up failed:', err.message));

// Refresh from the BYU calendar on boot and then daily. Failures are logged, never fatal.
if (process.env.INGEST_BYU) {
  const run = () => ingestByu(30).catch((err) => console.error('byu ingest failed:', err.message));
  run();
  setInterval(run, DAY_MS);
}

// The career-services sheet is hand-edited, so refresh it often. INGEST_SHEET_BASE (the published sheet's
// https://docs.google.com/spreadsheets/d/e/<id>) auto-discovers every tab; INGEST_SHEET_URLS lists CSV links explicitly.
if (process.env.INGEST_SHEET_BASE || process.env.INGEST_SHEET_URLS) {
  const explicit = (process.env.INGEST_SHEET_URLS ?? '').split(',').map((u) => u.trim()).filter(Boolean);
  const run = async () => {
    const discovered = process.env.INGEST_SHEET_BASE ? await discoverTabUrls(process.env.INGEST_SHEET_BASE).catch((err) => (console.error(err.message), [])) : [];
    await ingestSheets([...new Set([...explicit, ...discovered])]);
  };
  const safeRun = () => run().catch((err) => console.error('sheet ingest failed:', err.message));
  safeRun();
  setInterval(safeRun, 6 * 3_600_000);
}

// CS department calendar (event pages plus per-event ICS), every 6 hours.
if (process.env.INGEST_CS) {
  const run = () => ingestCs().catch((err) => console.error('cs ingest failed:', err.message));
  run();
  setInterval(run, 6 * 3_600_000);
}
