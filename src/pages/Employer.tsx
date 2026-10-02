import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon } from 'lucide-react';
import { Logo } from '../components/Logo';
import { TextField } from '../components/ui/TextField';
import { TextAreaField } from '../components/ui/TextAreaField';
import { StudentResultCard } from '../components/employer/StudentResultCard';
import { mockStudents } from '../data/mockStudents';
import { rankStudents } from '../utils/employerMatching';
import type { EmployerQuery } from '../types/employer';

const emptyQuery: EmployerQuery = { companyName: '', jobTitle: '', lookingFor: '', jobDescription: '' };

/**
 * Employer side of the demo. No sign-in or verification yet — "for now let us toggle" — this is a
 * publicly reachable page, same spirit as skipping onboarding on the student side.
 */
export function Employer() {
  const [query, setQuery] = useState<EmployerQuery>(emptyQuery);
  const [submitted, setSubmitted] = useState<EmployerQuery | null>(null);

  const set = <K extends keyof EmployerQuery,>(key: K, value: EmployerQuery[K]) => setQuery((q) => ({ ...q, [key]: value }));

  const canSubmit = query.companyName.trim() && query.jobTitle.trim() && (query.lookingFor.trim() || query.jobDescription.trim());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitted(query);
  };

  const results = submitted ? rankStudents(mockStudents, submitted) : [];

  return (
    <div className="min-h-screen w-full bg-canvas">
      <header className="bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Logo />
          <nav aria-label="Primary" className="flex items-center gap-2">
            <span className="hidden rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy sm:inline-block">
              Employer view
            </span>
            <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
              Back to student site
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Find students for your role</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Describe who you're looking for and paste the job or company description. We'll match it against student resumes,
          their target companies, the role they want, and campus events they've attended — no sign-in required for this demo.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4 rounded-xl border border-line bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Company name"
              value={query.companyName}
              onChange={(v) => set('companyName', v)}
              placeholder="Qualtrics" />

            <TextField
              label="Job title"
              value={query.jobTitle}
              onChange={(v) => set('jobTitle', v)}
              placeholder="Product Manager" />

          </div>
          <TextAreaField
            label="What are you looking for?"
            value={query.lookingFor}
            onChange={(v) => set('lookingFor', v)}
            placeholder="A junior PM who can run user research and is comfortable with SQL..."
            rows={3} />

          <TextAreaField
            label="Paste the job or company description"
            value={query.jobDescription}
            onChange={(v) => set('jobDescription', v)}
            placeholder="Paste the full posting or a company blurb here."
            rows={5} />

          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50">

            <SearchIcon className="h-4 w-4" aria-hidden="true" />
            Find matching students
          </button>
          {!canSubmit &&
          <p className="text-xs text-muted">Company name, job title, and at least one of the two text fields are needed.</p>
          }
        </form>

        {submitted &&
        <section aria-label="Matching students" className="mt-8">
            <h2 className="text-sm font-semibold text-ink">
              {results.filter((r) => r.score > 0).length} of {results.length} students have a real match
            </h2>
            <div className="mt-3 space-y-3">
              {results.map((item) => <StudentResultCard key={item.student.id} item={item} />)}
            </div>
          </section>
        }
      </main>
    </div>);

}
