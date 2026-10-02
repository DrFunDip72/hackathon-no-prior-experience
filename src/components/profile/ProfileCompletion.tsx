import React, { useState } from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { useSession } from '../../contexts/SessionContext';
import { EditRequestContext, type EditRequest, type ProfileEditTarget } from '../../hooks/useSectionEditor';
import type { Profile } from '../../types/profile';

interface MissingItem {
  key: string;
  label: string;
  target: ProfileEditTarget;
}

/** What's worth finishing: the fields recruiters look at and that sharpen event matches. */
export function missingProfileItems(profile: Profile): MissingItem[] {
  const items: (MissingItem | false)[] = [
  !profile.photoUrl && { key: 'photo', label: 'Add a photo', target: 'photo' },
  !profile.summary.trim() && { key: 'about', label: 'Write a short About', target: 'about' },
  !profile.lookingFor.roleTypes.length && { key: 'roles', label: 'Add roles you want', target: 'glance' },
  !profile.lookingFor.startDate.trim() && { key: 'start', label: 'Add when you can start', target: 'glance' },
  !profile.handshakeUrl.trim() && { key: 'handshake', label: 'Add your Handshake link', target: 'intro' },
  !profile.skillGroups.some((g) => g.skills.length) && { key: 'skills', label: 'Add skills', target: 'skills' },
  !profile.experience.length && { key: 'experience', label: 'Add experience', target: 'experience' }];

  return items.filter((i): i is MissingItem => Boolean(i));
}

// Where each editor lives on the page (ids set on the sections).
const ANCHOR: Record<ProfileEditTarget, string> = {
  photo: 'profile-intro',
  intro: 'profile-intro',
  glance: 'profile-glance',
  about: 'profile-about',
  experience: 'profile-experience',
  skills: 'profile-skills'
};

const dismissKey = (email: string) => `cc_profile_nudge_dismissed_${email}`;

function readDismissed(email: string): boolean {
  try {
    return localStorage.getItem(dismissKey(email)) === '1';
  } catch {
    return false;
  }
}

interface ProfileCompletionProps {
  profile: Profile;
  editable: boolean;
  children: React.ReactNode;
}

/**
 * The finish-your-profile card, shown above the profile sections (`children`). Each missing item
 * opens its section's editor. Owner view only; dismissal is remembered per user on this device.
 */
export function ProfileCompletion({ profile, editable, children }: ProfileCompletionProps) {
  const email = useSession().user?.email ?? profile.email;
  const [request, setRequest] = useState<EditRequest | null>(null);
  const [dismissed, setDismissed] = useState(() => readDismissed(email));
  const missing = missingProfileItems(profile);
  const show = editable && !dismissed && missing.length > 0;

  const open = (target: ProfileEditTarget) => {
    setRequest((r) => ({ target, seq: (r?.seq ?? 0) + 1 }));
    document.getElementById(ANCHOR[target])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissKey(email), '1');
    } catch {
      /* storage unavailable: hidden for this visit only */
    }
  };

  const n = missing.length;

  return (
    <EditRequestContext.Provider value={request}>
      {show &&
      <section aria-labelledby="finish-profile-heading" className="rounded-xl border border-navy/20 bg-navy-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="finish-profile-heading" className="text-sm font-semibold text-ink">
                You have {n} {n === 1 ? 'thing' : 'things'} left to finish your profile
              </h2>
              <p className="mt-0.5 text-sm text-muted">Recruiters see these first, and they sharpen your event matches.</p>
            </div>
            <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="-mr-2 -mt-1 rounded-md p-2 text-muted transition-colors duration-150 hover:bg-white hover:text-ink">

              <XIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {missing.map((item) =>
          <li key={item.key}>
                <button
              type="button"
              onClick={() => open(item.target)}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:border-navy hover:text-navy">

                  <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                </button>
              </li>
          )}
          </ul>
        </section>
      }
      {children}
    </EditRequestContext.Provider>);

}
