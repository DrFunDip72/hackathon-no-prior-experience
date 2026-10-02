import React, { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PencilIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { Chip } from '../components/ui/Chip';
import { StudentResultCard } from '../components/employer/StudentResultCard';
import { mockStudents } from '../data/mockStudents';
import { rankStudents } from '../utils/employerMatching';
import { employerStore } from '../utils/employerStore';
import { AI_GOOD_MATCH } from '../utils/matching';

/** The ranked students for the employer's saved search, laid out like the student Events page. */
export function EmployerMatches() {
  const query = employerStore.search();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  if (!query) return <Navigate to="/employer" replace />;

  const results = rankStudents(mockStudents, query);
  const good = results.filter((r) => r.percent >= AI_GOOD_MATCH).length;
  const role = [query.jobTitle || 'Your role', query.companyName].filter(Boolean).join(' at ');

  return (
    <div className="min-h-screen w-full bg-canvas">
      <AppHeader audience="employer" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Students for {role}</h1>
            <p className="mt-1 text-sm text-muted">
              {results.length} students who opted in, ranked by fit · {good} good {good === 1 ? 'fit' : 'fits'} or better
            </p>
          </div>
          <Link
            to="/employer"
            className="flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas sm:self-auto">

            <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
            New search
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-3">
            {results.map((item, i) => <StudentResultCard key={item.student.id} item={item} top={i === 0} />)}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <section aria-labelledby="role-heading" className="rounded-xl border border-line bg-white p-5">
              <h2 id="role-heading" className="text-sm font-semibold text-ink">
                The role
              </h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted">Role</dt>
                  <dd className="mt-0.5 text-ink">{role}</dd>
                </div>
                {query.employmentType &&
                <div>
                    <dt className="text-xs font-medium text-muted">Type</dt>
                    <dd className="mt-0.5 text-ink">{query.employmentType === 'Either' ? 'Internship or full-time' : query.employmentType}</dd>
                  </div>
                }
                {query.skills.length > 0 &&
                <div>
                    <dt className="text-xs font-medium text-muted">Skills</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {query.skills.map((s) => <Chip key={s} tone="navy">{s}</Chip>)}
                    </dd>
                  </div>
                }
                {query.lookingFor &&
                <div>
                    <dt className="text-xs font-medium text-muted">Ideal candidate</dt>
                    <dd className="mt-0.5 line-clamp-4 text-ink">{query.lookingFor}</dd>
                  </div>
                }
              </dl>
              <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
                Fit weighs skills most, then the role each student wants, their major, interest in your company, experience, and timing.
                Only students who chose to be found are shown.
              </p>
            </section>
          </aside>
        </div>
      </main>
    </div>);

}
