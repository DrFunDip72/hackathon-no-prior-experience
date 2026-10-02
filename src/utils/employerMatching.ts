import { containsWord, termMatch, unique } from './text';
import type { EmployerQuery, MockStudent, ScoredStudent } from '../types/employer';

/**
 * Scores one student against an employer's query. Mirrors the student-side rule in matching.ts:
 * no baseline floor. A student with zero real signal gets score 0, never a confident-looking
 * fake percentage (see matching.ts's matchLabel and its P0-fix history for why that matters).
 */
export function scoreStudent(student: MockStudent, query: EmployerQuery): ScoredStudent {
  const reasons: string[] = [];
  let raw = 0;

  // 1. The employer's company is on the student's target list.
  const companyHit = query.companyName.trim() && student.targetCompanies.some((c) => termMatch(c, query.companyName));
  if (companyHit) {
    raw += 30;
    reasons.push(`Has ${query.companyName.trim()} on their target companies`);
  }

  // 2. The role title matches what the student is looking for.
  const titleHit = query.jobTitle.trim() && termMatch(student.targetTitle, query.jobTitle);
  if (titleHit) {
    raw += 25;
    reasons.push(`Looking for a ${student.targetTitle} role`);
  }

  // 3. Skills show up in the job description or "what you're looking for" text.
  const text = `${query.jobTitle} ${query.lookingFor} ${query.jobDescription}`;
  const skillHits = student.skills.filter((s) => containsWord(text, s));
  if (skillHits.length) {
    raw += Math.min(skillHits.length, 4) * 8;
    reasons.push(`Skills match: ${skillHits.slice(0, 3).join(', ')}`);
  }

  // 4. The student attended an event this company hosted or sponsored on campus.
  const attended = student.attendedEvents.find((e) => e.company && query.companyName.trim() && termMatch(e.company, query.companyName));
  if (attended) {
    raw += 20;
    reasons.push(`Attended ${attended.title} (${attended.company}) on campus`);
  }

  return { student, score: raw > 0 ? Math.min(99, raw) : 0, reasons: unique(reasons) };
}

/** Ranks the whole mock pool, best match first. Zero-score students (no real signal) sort last. */
export function rankStudents(students: MockStudent[], query: EmployerQuery): ScoredStudent[] {
  return students.
  map((s) => scoreStudent(s, query)).
  sort((a, b) => b.score - a.score);
}
