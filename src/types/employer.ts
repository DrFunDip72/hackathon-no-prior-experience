import type { Profile } from './profile';

/**
 * The employer side of the demo: a recruiter describes a role, and we rank a pool of students
 * against it. Each student is a full student `Profile`, so the employer sees them through the same
 * profile components the student sees themselves through (read-only).
 */

export interface AttendedEvent {
  title: string;
  /** The company that hosted or sponsored it, if any. Cross-referenced against the employer's company name. */
  company: string | null;
  date: string;
}

export interface PoolStudent {
  id: string;
  profile: Profile;
  /** Events this student added to their calendar. */
  attendedEvents: AttendedEvent[];
}

/** Compact, hand-written form of a sample student; src/data/mockStudents.ts expands it into a full Profile. */
export interface StudentSeed {
  id: string;
  name: string;
  major: string;
  year: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';
  gradYear: string;
  gpa: string;
  headline: string;
  summary: string;
  roles: string[];
  employmentType: 'Internship' | 'Full-time' | 'Part-time' | 'Either';
  startDate: string;
  locations: string[];
  topSkills: string[];
  skillGroups: { label: string; skills: string[] }[];
  experience: { title: string; org: string; start: string; end: string; impact: string[]; skills: string[] }[];
  projects: { name: string; description: string; skills: string[] }[];
  coursework: string[];
  industries: string[];
  companies: string[];
  visible: boolean;
  attendedEvents: AttendedEvent[];
}

export type EmploymentType = 'Internship' | 'Full-time' | 'Part-time' | 'Either' | '';

/** What the employer's answers boil down to: the job the pool is ranked against. */
export interface EmployerQuery {
  companyName: string;
  jobTitle: string;
  employmentType: EmploymentType;
  /** From the skills chips step; either picked from the job-posting extract or typed. */
  skills: string[];
  /** Free text: anything else the employer wants known about the ideal candidate. */
  lookingFor: string;
}

/** One weighted part of a fit score: `points` out of `max`, plus a plain-language reason. */
export interface FitPart {
  key: 'skills' | 'role' | 'major' | 'academics' | 'interest' | 'experience' | 'timing';
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface ScoredStudent {
  student: PoolStudent;
  /** 0 to 100, computed from the parts below. */
  percent: number;
  parts: FitPart[];
  matchedSkills: string[];
  missingSkills: string[];
  /** The one-line "why" shown on the result card. */
  why: string;
}

/** A recruiter's demo account: kept in this browser only, separate from student sessions. */
export interface EmployerAccount {
  name: string;
  email: string;
}
