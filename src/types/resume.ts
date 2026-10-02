/** What the AI reader (POST /api/parse-resume) pulls out of a resume and LinkedIn profile. */
export interface ResumeExtract {
  name: string;
  email: string;
  headline: string;
  summary: string;
  /** Class standing, or '' when unclear. */
  year: '' | 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate student' | 'Alumni';
  linkedinUrl: string;
  handshakeUrl: string;
  education: {
    school: string;
    degree: string;
    major: string;
    gradYear: string;
    gpa: string;
    coursework: string[];
  };
  experience: { title: string; org: string; start: string; end: string; impact: string[]; skills: string[] }[];
  projects: { name: string; description: string; skills: string[] }[];
  skillGroups: { label: string; skills: string[] }[];
  topSkills: string[];
  suggestedRoles: string[];
  /** Only names from src/data/industries.ts, so event matching can score them. */
  suggestedIndustries: string[];
}

/** Everything the student gave us to read. Each source is a PDF (base64, no data: prefix) or pasted text. */
export interface ProfileSources {
  resume?: { pdfBase64?: string; text?: string };
  /** LinkedIn can't be fetched by URL (it requires a login), so students upload "Save to PDF" or paste the text. */
  linkedin?: { pdfBase64?: string; text?: string; url?: string };
}

export type ReadResult =
  | { ok: true; data: ResumeExtract }
  /** unavailable: no AI key configured; unreadable: AI couldn't use the input; error: network or AI failure. */
  | { ok: false; reason: 'unavailable' | 'unreadable' | 'error' };
