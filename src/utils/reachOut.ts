import { firstName } from './text';
import type { EmployerAccount, EmployerQuery, ScoredStudent } from '../types/employer';

/** A mailto: link with a short, prefilled note about the role. Opens the recruiter's own mail app; nothing is sent for them. */
export function reachOutHref(item: ScoredStudent, query: EmployerQuery, account: EmployerAccount | null): string {
  const p = item.student.profile;
  const role = query.jobTitle || 'an open role';
  const at = query.companyName ? ` at ${query.companyName}` : '';
  const skills = item.matchedSkills.slice(0, 2).join(' and ');
  const subject = `${role}${at}: would you like to chat?`;
  const body = [
  `Hi ${firstName(p.name)},`,
  '',
  `I'm ${account?.name || 'a recruiter'}${at ? `, hiring for the ${role} role${at}` : ''}. I found your profile on Doorway${
  skills ? ` and your ${skills} experience stood out` : ''}.`,
  '',
  'Would you be open to a quick 15-minute call this week?',
  '',
  'Thanks,',
  account?.name || ''].
  join('\n');
  return `mailto:${p.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
