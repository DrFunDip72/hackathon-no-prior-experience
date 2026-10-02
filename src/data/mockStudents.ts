import { studentSeeds } from './studentSeeds';
import { gradYearFor } from '../utils/profileBuilder';
import type { PoolStudent, StudentSeed } from '../types/employer';
import type { Profile } from '../types/profile';

/**
 * The sample pool of BYU students for the employer demo. There is no real student directory yet (each
 * student's profile lives only in their own browser), so this stands in for one; see docs/api-requests.md.
 * Everyone here is fictional except Will Holland, a teammate who agreed to be in the demo pool. Emails use the
 * reserved byu.example domain so nothing reaches a real inbox.
 */

/** "Maya O'Neil" -> "maya.o.neil" with sep '.' */
const slug = (name: string, sep: string) => name.toLowerCase().split(/[^a-z]+/).filter(Boolean).join(sep);

function toProfile(seed: StudentSeed): Profile {
  return {
    name: seed.name,
    email: `${slug(seed.name, '.')}@byu.example`,
    photoUrl: null,
    headline: seed.headline,
    summary: seed.summary,
    year: seed.year,
    handshakeUrl: '',
    // Fictional students have no LinkedIn link (a made-up URL would open a dead page in a demo); only a real
    // teammate who shared his has one.
    linkedinUrl: seed.linkedinUrl ?? '',
    resumeFileName: null,
    resumeDataUrl: null,
    lookingFor: {
      roleTypes: seed.roles,
      employmentType: seed.employmentType,
      startDate: seed.startDate,
      locations: seed.locations
    },
    workAuthorization: 'Authorized to work in the US',
    topSkills: seed.topSkills,
    experience: seed.experience.map((e, i) => ({ ...e, id: `${seed.id}_exp${i}` })),
    projects: seed.projects.map((p, i) => ({ ...p, id: `${seed.id}_proj${i}` })),
    education: {
      school: 'Brigham Young University',
      degree: 'BS',
      major: seed.major,
      gradYear: gradYearFor(seed.year),
      gpa: seed.gpa,
      coursework: seed.coursework
    },
    skillGroups: seed.skillGroups,
    interests: { industries: seed.industries, companies: seed.companies },
    visibleToEmployers: seed.visible
  };
}

export const mockStudents: PoolStudent[] = studentSeeds.map((seed) => ({
  id: seed.id,
  profile: toProfile(seed),
  attendedEvents: seed.attendedEvents
}));

/** Only students who said yes to "want employers to be able to find your profile?" */
export const visibleStudents = mockStudents.filter((s) => s.profile.visibleToEmployers);
