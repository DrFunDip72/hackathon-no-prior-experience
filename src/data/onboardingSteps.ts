import type { OnboardingStep } from '../types/onboarding';

export const onboardingSteps: OnboardingStep[] = [
{
  id: 'resume',
  kind: 'resume',
  prompt: 'First, drop in your resume. I’ll pull out your experience, projects, and skills so you don’t have to retype them.',
  helper: 'PDF, up to 5 MB'
},
{
  id: 'handshake',
  kind: 'url',
  prompt: 'What’s your Handshake profile URL?',
  placeholder: 'https://byu.joinhandshake.com/profiles/…',
  validate: 'handshake'
},
{
  id: 'linkedin',
  kind: 'url',
  prompt: 'And your LinkedIn?',
  placeholder: 'https://www.linkedin.com/in/…',
  validate: 'linkedin'
},
{
  id: 'majorYear',
  kind: 'text',
  prompt: 'What are you studying, and what year are you in?',
  placeholder: 'Information Systems, junior'
},
{
  id: 'experience',
  kind: 'text',
  prompt: 'Tell me about the experience you’re proudest of: a job, project, or role. What did you do, and what changed because of it?',
  placeholder: 'I ran usability tests on the MyBYU redesign and cut task time by a third…',
  multiline: true
},
{
  id: 'skills',
  kind: 'text',
  prompt: 'Which skills do you most want employers to notice? Separate them with commas.',
  placeholder: 'Product management, Figma, SQL, user research'
},
{
  id: 'goals',
  kind: 'text',
  prompt: 'What are you looking for? Roles, industries, or specific companies you’d love to meet.',
  placeholder: 'Product design internships, Adobe, Qualtrics, anything in SaaS',
  multiline: true
},
{
  id: 'employmentType',
  kind: 'choice',
  prompt: 'Are you after an internship or a full-time role?',
  options: ['Internship', 'Full-time', 'Either']
},
{
  id: 'photo',
  kind: 'photo',
  prompt: 'Last one: want to add a profile photo? Recruiters remember faces. You can always add it later.'
}];