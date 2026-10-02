// Protection for the endpoints that spend LLM credit (/submit, /submit/bulk).
import { timingSafeEqual } from 'node:crypto';

// Fail closed: with no SUBMIT_TOKEN configured the endpoints are off, so they can never be open by accident.
export function checkSubmitToken(headers, expected) {
  if (!expected) return { ok: false, status: 503, error: 'submitting is disabled (SUBMIT_TOKEN is not set)' };
  const given = String(headers['x-submit-token'] ?? '').trim() || String(headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? { ok: true } : { ok: false, status: 401, error: 'missing or wrong submit token' };
}

// Small in-memory limiter per client (resets on restart; fine for one instance).
export function createRateLimiter({ max = 30, windowMs = 3_600_000 } = {}) {
  const hits = new Map();
  return (key, now = Date.now()) => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

export const clientIp = (req) => String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '').split(',')[0].trim();
