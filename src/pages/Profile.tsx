import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightIcon, EyeIcon, EyeOffIcon, RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AppHeader } from '../components/AppHeader';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { AtAGlance } from '../components/profile/AtAGlance';
import { AboutSection } from '../components/profile/AboutSection';
import { ExperienceSection } from '../components/profile/ExperienceSection';
import { ProjectsSection } from '../components/profile/ProjectsSection';
import { EducationSection } from '../components/profile/EducationSection';
import { SkillsSection } from '../components/profile/SkillsSection';
import { InterestsSection } from '../components/profile/InterestsSection';
import { VisibilityPanel } from '../components/profile/VisibilityPanel';
import { useSession } from '../contexts/SessionContext';
import { useEventFeed } from '../hooks/useEventFeed';
import { formatDay, formatTimeRange, isHappeningNow } from '../utils/dates';
import { eventMatch } from '../utils/matching';
import type { Profile as ProfileData } from '../types/profile';

export function Profile() {
  const { state, saveProfile, updateState } = useSession();
  const profile = state.profile as ProfileData;
  const [preview, setPreview] = useState(false);
  const editable = !preview;

  const save = async (patch: Partial<ProfileData>) => {
    await saveProfile({ ...profile, ...patch });
  };

  const setVisible = (visible: boolean) => {
    updateState((s) => s.profile ? { ...s, profile: { ...s.profile, visibleToEmployers: visible } } : s);
    toast(visible ? 'Your profile is visible to employers' : 'Your profile is now hidden');
  };

  // Same ranked feed as the Events page (live API when VITE_API_URL is set), fetched once per profile change.
  const feed = useEventFeed();
  const topEvents = feed.items.slice(0, 3);

  const hasCalendars = Object.values(state.connections).some(Boolean);
  const sectionProps = { profile, editable, onSave: save };

  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppHeader />

      <AnimatePresence initial={false}>
        {preview &&
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden bg-ink text-white">
          
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 text-sm sm:px-6">
              <span className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4" aria-hidden="true" />
                Employer preview: this is exactly what recruiters see.
              </span>
              <button type="button" onClick={() => setPreview(false)} className="shrink-0 font-medium underline underline-offset-2">
                Exit preview
              </button>
            </div>
          </motion.div>
        }
      </AnimatePresence>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          {preview && !profile.visibleToEmployers ?
          <section className="rounded-xl border border-line bg-white px-6 py-16 text-center">
              <EyeOffIcon className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
              <h1 className="mt-4 text-lg font-semibold text-ink">This profile is hidden</h1>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Employers see this message instead of your profile while visibility is off.
              </p>
              <button
              type="button"
              onClick={() => setVisible(true)}
              className="mt-6 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">
              
                Make my profile visible
              </button>
            </section> :

          <>
              <ProfileHeader {...sectionProps} />
              <AtAGlance {...sectionProps} />
              <AboutSection {...sectionProps} />
              <ExperienceSection {...sectionProps} />
              <ProjectsSection {...sectionProps} />
              <EducationSection {...sectionProps} />
              <SkillsSection {...sectionProps} />
              <InterestsSection {...sectionProps} />
            </>
          }
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <VisibilityPanel
            visible={profile.visibleToEmployers}
            onToggle={setVisible}
            preview={preview}
            onPreview={() => setPreview((p) => !p)} />
          

          <section aria-labelledby="fit-heading" className="rounded-xl border border-line bg-white p-5">
            <h2 id="fit-heading" className="text-sm font-semibold text-ink">
              Events that fit this profile
            </h2>
            {feed.loading ?
            <ul className="mt-3 space-y-3" aria-label="Loading events">
                {[0, 1, 2].map((i) =>
              <li key={i} className="space-y-1.5 py-1">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-canvas" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-canvas" />
                  </li>
              )}
              </ul> :
            feed.error ?
            <div className="mt-3 text-sm text-muted">
                We couldn’t load events right now.{' '}
                <button type="button" onClick={feed.retry} className="inline-flex items-center gap-1 font-medium text-navy hover:underline">
                  <RefreshCwIcon className="h-3.5 w-3.5" aria-hidden="true" /> Retry
                </button>
              </div> :
            topEvents.length === 0 ?
            <p className="mt-3 text-sm text-muted">No upcoming events match yet. Add target companies to sharpen your matches.</p> :

            <ul className="mt-3 divide-y divide-line">
                {topEvents.map((item) =>
              <li key={item.event.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{item.event.title}</p>
                        <p className="text-xs text-muted">
                          {isHappeningNow(item.start, item.end) ?
                          <span className="font-medium text-success-700">Happening now</span> :
                          formatDay(item.start)}
                          , {formatTimeRange(item.start, item.end)}
                        </p>
                      </div>
                      <span className={`shrink-0 whitespace-nowrap text-sm font-semibold ${eventMatch(item)?.className ?? 'text-muted'}`}>
                        {eventMatch(item)?.label ?? '—'}
                      </span>
                    </div>
                    {item.reason && <p className="mt-1 line-clamp-2 text-xs text-ink">{item.reason}</p>}
                  </li>
              )}
              </ul>
            }
            <Link
              to={hasCalendars ? '/events' : '/connect'}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">
              
              {hasCalendars ? 'See all events' : 'Connect calendars'}
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </main>
    </div>);

}