import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { scoreStudent } from '../utils/employerMatching';
import { employerStore } from '../utils/employerStore';
import { reachOutHref } from '../utils/reachOut';
import { firstName } from '../utils/text';

const readOnly = async () => {};

/** A student's profile as an employer sees it: the student's own profile sections, read-only, plus their fit for the role. */
export function EmployerStudent() {
  const { id } = useParams();
  const student = mockStudents.find((s) => s.id === id);
  const query = employerStore.search();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const back =
  <Link
    to={query ? '/employer/matches' : '/employer'}
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
  const role = query ? [query.jobTitle || 'your role', query.companyName].filter(Boolean).join(' at ') : '';
  const sectionProps = { profile: student.profile, editable: false, onSave: readOnly };

  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppHeader audience="employer" />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {back}
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="order-2 min-w-0 space-y-4 lg:order-1">
            <ProfileHeader {...sectionProps} />
            <AtAGlance {...sectionProps} />
            <AboutSection {...sectionProps} />
            <ExperienceSection {...sectionProps} />
            <ProjectsSection {...sectionProps} />
            <EducationSection {...sectionProps} />
            <SkillsSection {...sectionProps} />
            <InterestsSection {...sectionProps} />
          </div>

          <aside className="order-1 space-y-4 lg:sticky lg:top-20 lg:order-2 lg:self-start">
            {fit && query ?
            <FitPanel item={fit} role={role} mailto={reachOutHref(fit, query, employerStore.account())} /> :

            <section className="rounded-xl border border-line bg-white p-5 text-sm text-muted">
                <Link to="/employer" className="font-medium text-navy hover:underline">
                  Describe a role
                </Link>{' '}
                to see how well {firstName(student.profile.name)} fits it.
              </section>
            }
          </aside>
        </div>
      </main>
    </div>);

}
