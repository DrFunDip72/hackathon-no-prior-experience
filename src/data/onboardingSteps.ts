import { employers } from './employers';
import { industries } from './industries';
import { unique } from '../utils/text';
import type { OnboardingDraft, OnboardingStep } from '../types/onboarding';
import type { ResumeExtract } from '../types/resume';

const ROLE_OPTIONS = ['Software engineer', 'Product manager', 'Data / analytics', 'UX / design'];

/** 'Either' is special-cased by matching.ts and the profile page; the rest are shown as-is. */
export const EMPLOYMENT_OPTIONS = ['Internship', 'Full-time', 'Part-time', 'Either'];

const resume: OnboardingStep = {
  id: 'resume',
  kind: 'resume',
  prompt: 'First, drop in your resume. I’ll pull out your experience, projects, and skills so you don’t have to retype them.',
  helper: 'PDF, up to 5 MB'
};

const linkedin: OnboardingStep = {
  id: 'linkedin',
  kind: 'linkedin',
  prompt: 'What’s your LinkedIn? Add your profile URL so recruiters can find you. If you want me to read it too, upload your LinkedIn PDF or paste the profile text.',
  helper: 'LinkedIn needs a login, so I can’t read a profile from its URL alone. Its PDF lets me read it.',
  placeholder: 'https://www.linkedin.com/in/…',
  validate: 'linkedin'
};

const majorYear: OnboardingStep = {
  id: 'majorYear',
  kind: 'text',
  prompt: 'What are you studying, and what year are you in?',
  placeholder: 'Computer Science, senior'
};

const experience: OnboardingStep = {
  id: 'experience',
  kind: 'text',
  prompt: 'In a sentence or two, what should employers know about you? Think of the work you’re proudest of and what changed because of it.',
  placeholder: 'I built a scheduling dashboard used by 120 property managers and cut its load time by more than half…',
  multiline: true
};

const skills: OnboardingStep = {
  id: 'skills',
  kind: 'text',
  prompt: 'Which skills do you most want employers to notice? Separate them with commas.',
  placeholder: 'React, TypeScript, Python, SQL'
};

const goals: OnboardingStep = {
  id: 'goals',
  kind: 'text',
  prompt: 'What are you looking for? Roles, industries, or specific companies you’d love to meet.',
  placeholder: 'Software engineering roles at startups, Qualtrics, anything in SaaS',
  multiline: true
};

const employmentType: OnboardingStep = {
  id: 'employmentType',
  kind: 'choice',
  prompt: 'Are you after an internship, a full-time role, or part-time work?',
  options: EMPLOYMENT_OPTIONS
};

const photo: OnboardingStep = {
  id: 'photo',
  kind: 'photo',
  prompt: 'Last one: want to add a profile photo? Recruiters remember faces. You can always add it later.'
};

const withProtocol = (url: string) => /^https?:\/\//i.test(url) ? url : `https://${url}`;
const prettyUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

/** The reader found a LinkedIn URL: show it as done and only offer the optional PDF / pasted text. */
function foundLinkedin(url: string): OnboardingStep {
  return {
    ...linkedin,
    knownUrl: withProtocol(url),
    helper: 'Optional. The PDF gives me your full experience and skills.',
    prompt: `Found your LinkedIn: ${prettyUrl(url)}. It’ll be linked on your profile. Want me to read the full profile for more detail? Upload its PDF or paste the text, or just continue.`
  };
}

function rolesStep(extract: ResumeExtract): OnboardingStep {
  const suggested = extract.suggestedRoles.filter((r) => r.trim() && !r.includes(','));
  return {
    id: 'roles',
    kind: 'chips',
    prompt: suggested.length ?
    'What roles are you going for? I picked these from your resume. Tap to change them.' :
    'What roles are you going for? Pick any that fit.',
    options: unique([...suggested, ...ROLE_OPTIONS]),
    placeholder: 'Other roles, separated by commas'
  };
}

/** A short list of recruiting employers, those in the student's industries first. */
function companiesStep(extract: ResumeExtract): OnboardingStep {
  const fits = employers.filter((e) => extract.suggestedIndustries.includes(e.industry));
  return {
    id: 'companies',
    kind: 'chips',
    prompt: 'Any companies you’d love to meet? I’ll put their events first. Optional.',
    options: unique([...fits, ...employers].map((e) => e.name)).slice(0, 10),
    placeholder: 'Other companies, separated by commas'
  };
}

const industriesStep: OnboardingStep = {
  id: 'industries',
  kind: 'chips',
  prompt: 'Which industries interest you? Optional.',
  options: industries.map((i) => i.name),
  placeholder: 'Other industries, separated by commas'
};

/**
 * The questions to ask, given what the AI reader found. Without a read we ask everything;
 * after a read we only ask what's missing and what event ranking needs (roles, employment type, companies).
 */
export function stepsFor(draft: Pick<OnboardingDraft, 'extract'>): OnboardingStep[] {
  const x = draft.extract;
  if (!x) return [resume, linkedin, majorYear, experience, skills, goals, employmentType, photo];

  const hasSkills = x.topSkills.length > 0 || x.skillGroups.some((g) => g.skills.length > 0);
  const steps: (OnboardingStep | false)[] = [
  resume,
  x.linkedinUrl ? foundLinkedin(x.linkedinUrl) : linkedin,
  (!x.education.major || !x.year && !x.education.gradYear) && majorYear,
  !x.summary && x.experience.length === 0 && experience,
  !hasSkills && skills,
  rolesStep(x),
  employmentType,
  companiesStep(x),
  x.suggestedIndustries.length === 0 && industriesStep,
  photo];

  return steps.filter((s): s is OnboardingStep => Boolean(s));
}
