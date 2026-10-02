export interface Experience {
  id: string;
  title: string;
  org: string;
  start: string;
  end: string;
  impact: string[];
  skills: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  skills: string[];
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  gradYear: string;
  gpa: string;
  coursework: string[];
}

export interface SkillGroup {
  label: string;
  skills: string[];
}

export interface LookingFor {
  roleTypes: string[];
  employmentType: string;
  startDate: string;
  locations: string[];
}

export interface Interests {
  industries: string[];
  companies: string[];
}

export interface Profile {
  name: string;
  email: string;
  photoUrl: string | null;
  headline: string;
  summary: string;
  year: string;
  handshakeUrl: string;
  linkedinUrl: string;
  resumeFileName: string | null;
  resumeDataUrl: string | null;
  lookingFor: LookingFor;
  workAuthorization: string;
  topSkills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education;
  skillGroups: SkillGroup[];
  interests: Interests;
  visibleToEmployers: boolean;
}