import type { ProfileSources, ReadResult, ResumeExtract } from '../types/resume';

/** Sends the student's resume and LinkedIn to the AI reader. Never throws. */
export async function readProfileSources(sources: ProfileSources): Promise<ReadResult> {
  try {
    const res = await fetch('/api/parse-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sources)
    });
    if (res.ok) {
      const body = (await res.json()) as { resume?: ResumeExtract };
      return body.resume ? { ok: true, data: body.resume } : { ok: false, reason: 'unreadable' };
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
