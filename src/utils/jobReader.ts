import type { JobExtract, JobSources, ReadJobResult } from '../types/job';

/** Sends a job posting / company blurb to the AI reader. Never throws. Mirrors resumeReader.ts. */
export async function readJobSource(sources: JobSources): Promise<ReadJobResult> {
  try {
    const res = await fetch('/api/parse-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'job', ...sources })
    });
    if (res.ok) {
      const body = (await res.json()) as { job?: JobExtract };
      return body.job ? { ok: true, data: body.job } : { ok: false, reason: 'unreadable' };
    }
    if (res.status === 503 || res.status === 404) return { ok: false, reason: 'unavailable' };
    if (res.status === 400 || res.status === 422) return { ok: false, reason: 'unreadable' };
    return { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** "data:application/pdf;base64,AAAA" -> "AAAA" */
export function stripDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}
