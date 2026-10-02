/**
 * The employer side of the demo: a recruiter describes a role, and we rank a mock pool of
 * students against it. Deliberately its own lean shapes rather than reusing the student `Profile`
 * type — this never touches real student data or the onboarding flow.
 */

export interface MockAttendedEvent {
  title: string;
  /** The company that hosted or sponsored it, if any. Cross-referenced against the employer's company name. */
  company: string | null;
  date: string;
}

export interface MockStudent {
  id: string;
  name: string;
  major: string;
  gradYear: string;
  /** Short resume-style summary, used for keyword overlap against the pasted job description. */
  summary: string;
  skills: string[];
  /** Companies this student listed in their preferences ("their company in their preferences"). */
  targetCompanies: string[];
  /** The job title/role type this student is looking for. */
  targetTitle: string;
  /** Events this student clicked "Add to calendar" for. */
  attendedEvents: MockAttendedEvent[];
}

export interface EmployerQuery {
  companyName: string;
  jobTitle: string;
  /** Free text: what the employer is looking for in a candidate. */
  lookingFor: string;
  /** Pasted company/job description. */
  jobDescription: string;
}

export interface ScoredStudent {
  student: MockStudent;
  score: number;
  reasons: string[];
}
