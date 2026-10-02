/** What the AI reader (POST /api/parse-resume, kind: 'job') pulls out of a job posting or company/role blurb. */
export interface JobExtract {
  companyName: string;
  jobTitle: string;
  /** '' when the posting doesn't say or imply one. */
  employmentType: '' | 'Internship' | 'Full-time' | 'Part-time';
  requiredSkills: string[];
  summary: string;
}

/** What the employer gave us to read: a PDF (base64, no data: prefix) or pasted text. */
export interface JobSources {
  job?: { pdfBase64?: string; text?: string };
}

export type ReadJobResult =
  | { ok: true; data: JobExtract }
  /** unavailable: no AI key configured; unreadable: AI couldn't use the input; error: network or AI failure. */
  | { ok: false; reason: 'unavailable' | 'unreadable' | 'error' };
