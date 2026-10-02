import React, { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, EyeOffIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { FitPanel } from '../components/employer/FitPanel';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { AtAGlance } from '../components/profile/AtAGlance';
import { AboutSection } from '../components/profile/AboutSection';
import { ExperienceSection } from '../components/profile/ExperienceSection';
import { ProjectsSection } from '../components/profile/ProjectsSection';
import { EducationSection } from '../components/profile/EducationSection';
import { SkillsSection } from '../components/profile/SkillsSection';
import { InterestsSection } from '../components/profile/InterestsSection';
import { mockStudents } from '../data/mockStudents';
import { EventEngagement } from '../components/employer/EventEngagement';
import { eventEngagement, scoreStudent } from '../utils/employerMatching';
import { employerStore, matchesHref, NEW_ROLE } from '../utils/employerStore';
import { reachOutHref } from '../utils/reachOut';
import { firstName } from '../utils/text';

const readOnly = async () => {};

/** A student's profile as an employer sees it: the student's own profile sections, read-only, plus their fit for the role. */
export function EmployerStudent() {
  const { id } = useParams();
  const student = mockStudents.find((s) => s.id === id);
  const [params] = useSearchParams();
  // The role this profile is scored against: the tab it was opened from, else the last one open.
  const role = employerStore.role(params.get('role')) ?? employerStore.activeRole();
  const query = role?.query ?? null;
  // Signed up but every role removed: add one inline rather than repeating the full sign-up.
  const describeHref = employerStore.account() ? matchesHref(NEW_ROLE) : '/employer';
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const back =
  <Link
    to={role ? matchesHref(role.id) : describeHref}
    className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-ink">

      <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />
      {query ? 'Back to matches' : 'Find students'}
    </Link>;


  if (!student?.profile.visibleToEmployers) {
    return (
      <div className="min-h-screen w-full bg-canvas">
        <AppHeader audience="employer" />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {back}
          <section className="mt-4 rounded-xl border border-line bg-white px-6 py-16 text-center">
            <EyeOffIcon className="mx-auto h-6 w-6 text-muted" aria-hidden="true" />
            <h1 className="mt-4 text-lg font-semibold text-ink">This profile isn’t available</h1>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">The student hasn’t chosen to be found by employers.</p>
          </section>
        </main>
      </div>);

  }

  const fit = query ? scoreStudent(student, query) : null;
  const roleName = query ? [query.jobTitle || 'your role', query.companyName].filter(Boolean).join(' at ') : '';
  const sectionProps = { profile: student.profile, editable: false, onSave: readOnly };

  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppHeader audience="employer" />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {back}
        {/*
          Phone: who the student is (header), then their fit, then the rest of the profile.
          Desktop: the profile on the left, the fit panel pinned on the right across both rows.
         */}
        <div className="mt-4 grid gap-x-6 gap-y-4 lg:grid-cols-[1fr_320px] lg:grid-rows-[auto_1fr]">
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            <ProfileHeader {...sectionProps} />
          </div>
          {/*
            Pinned only within the viewport: below the sticky AppHeader (top-20) and never taller than what's left of
            the screen, scrolling inside itself when the panel is longer. Without the max height, a pinned panel taller
            than the viewport hides its bottom until the whole page has scrolled past.
           */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:rounded-xl">
            {fit && query ?
            <FitPanel item={fit} role={roleName} mailto={reachOutHref(fit, query, employerStore.account())}>
                <EventEngagement engagement={eventEngagement(student, query.companyName)} company={query.companyName.trim()} />
              </FitPanel> :

            <>
                <section className="rounded-xl border border-line bg-white p-5 text-sm text-muted">
                  <Link to={describeHref} className="font-medium text-navy hover:underline">
                    Describe a role
                  </Link>{' '}
                  to see how well {firstName(student.profile.name)} fits it.
                </section>
                <section className="rounded-xl border border-line bg-white p-5">
                  <EventEngagement engagement={eventEngagement(student, '')} company="" />
                </section>
              </>
            }
          </aside>

          <div className="min-w-0 space-y-4 lg:col-start-1 lg:row-start-2">
            <AtAGlance {...sectionProps} />
            <AboutSection {...sectionProps} />
            <ExperienceSection {...sectionProps} />
            <ProjectsSection {...sectionProps} />
            <EducationSection {...sectionProps} />
            <SkillsSection {...sectionProps} />
            <InterestsSection {...sectionProps} />
          </div>
        </div>
      </main>
    </div>);

}
