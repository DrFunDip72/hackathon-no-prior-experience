import type { OnboardingStep } from '../types/onboarding';

export const onboardingSteps: OnboardingStep[] = [
{
  id: 'resume',
  kind: 'resume',
  prompt: 'First, drop in your resume. I’ll try to pull out your experience, projects, and skills so you don’t have to retype them.',
  helper: 'PDF, up to 5 MB'
},
{
  id: 'linkedin',
  kind: 'linkedin',
  prompt: 'What’s your LinkedIn? Add your profile URL so recruiters can find you. If you want me to read it too, upload your LinkedIn PDF or paste the profile text.',
  helper: 'LinkedIn needs a login, so I can’t read a profile from its URL alone. On your profile, click More → Save to PDF.',
  placeholder: 'https://www.linkedin.com/in/…',
  validate: 'linkedin'
},
{
  id: 'handshake',
  kind: 'url',
  prompt: 'Got a Handshake profile? Paste the URL and I’ll link it on your profile.',
  placeholder: 'https://byu.joinhandshake.com/profiles/…',
  validate: 'handshake'
},
{
  id: 'majorYear',
  kind: 'text',
  prompt: 'What are you studying, and what year are you in?',
  placeholder: 'Computer Science, senior'
},
{
  id: 'experience',
  kind: 'text',
  prompt: 'In a sentence or two, what should employers know about you? Think of the work you’re proudest of and what changed because of it.',
  placeholder: 'I built a scheduling dashboard used by 120 property managers and cut its load time by more than half…',
  multiline: true
},
{
  id: 'skills',
  kind: 'text',
  prompt: 'Which skills do you most want employers to notice? Separate them with commas.',
  placeholder: 'React, TypeScript, Python, SQL'
},
{
  id: 'goals',
  kind: 'text',
  prompt: 'What are you looking for? Roles, industries, or specific companies you’d love to meet.',
  placeholder: 'Software engineering roles at startups, Qualtrics, anything in SaaS',
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
