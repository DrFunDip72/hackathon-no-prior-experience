import React, { useEffect, useRef, useState } from 'react';
import { Loader2Icon, SearchIcon } from 'lucide-react';
import { PdfDropZone } from '../onboarding/PdfDropZone';
import { TextField } from '../ui/TextField';
import { TextAreaField } from '../ui/TextAreaField';
import { Chip } from '../ui/Chip';
import { isPdf, readAsDataUrl } from '../../utils/files';
import { readJobSource, stripDataUrl } from '../../utils/jobReader';
import { splitList } from '../../utils/text';
import type { EmployerQuery } from '../../types/employer';
import type { JobExtract, JobSources } from '../../types/job';

const MAX_BYTES = 5 * 1024 * 1024;

type Stage =
{ kind: 'input' } |
{ kind: 'reading'; what: string } |
/** extract is null when the AI reader couldn't help and the employer types the role in. */
{ kind: 'confirm'; extract: JobExtract | null };

/**
 * "+ New role", inline on the matches page: drop the posting PDF or paste it, the AI reader
 * (POST /api/parse-resume, kind 'job') fills in the role, the employer checks the title and company,
 * and "Find students" saves it as a new tab. If the read fails, they type the title and skills instead.
 */
export function NewRolePanel({ onCreate }: {onCreate: (query: EmployerQuery) => void;}) {
  const [stage, setStage] = useState<Stage>({ kind: 'input' });
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [skills, setSkills] = useState('');
  const fieldsRef = useRef<HTMLDivElement>(null);

  // Once the posting is read (or they chose to type it), put the cursor in the job title.
  useEffect(() => {
    if (stage.kind === 'confirm') fieldsRef.current?.querySelector('input')?.focus();
  }, [stage.kind]);

  const read = async (sources: JobSources, what: string) => {
    setError(null);
    setStage({ kind: 'reading', what });
    const result = await readJobSource(sources);
    const x = result.ok && (result.data.jobTitle || result.data.companyName || result.data.requiredSkills.length) ? result.data : null;
    setTitle(x?.jobTitle ?? '');
    setCompany(x?.companyName ?? '');
    setSkills(x?.requiredSkills.join(', ') ?? '');
    setStage({ kind: 'confirm', extract: x });
  };

  const onFile = async (file: File) => {
    setError(null);
    if (!isPdf(file)) return setError('Please upload a PDF, or paste the posting below.');
    if (file.size > MAX_BYTES) return setError('That file is over 5 MB. Try a smaller PDF, or paste the posting below.');
    try {
      const dataUrl = await readAsDataUrl(file);
      await read({ job: { pdfBase64: stripDataUrl(dataUrl) } }, file.name);
    } catch {
      setError('We couldn’t open that file. Try another, or paste the posting below.');
    }
  };

  const typeItIn = () => {
    setTitle('');
    setCompany('');
    setSkills('');
    setStage({ kind: 'confirm', extract: null });
  };

  const reset = () => {
    setError(null);
    setStage({ kind: 'input' });
  };

  const skillList = splitList(skills);
  const canCreate = Boolean(title.trim() || skillList.length);
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (stage.kind !== 'confirm') return;
    if (!canCreate) return setError('Add a job title or a few skills so we know who to look for.');
    const x = stage.extract;
    onCreate({
      jobTitle: title.trim(),
      companyName: company.trim(),
      employmentType: x?.employmentType ?? '',
      skills: skillList,
      lookingFor: x?.summary ?? ''
    });
  };

  return (
    <section className="rounded-xl border border-line bg-white p-5 sm:p-6">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Add a role</h1>
      <p className="mt-1 text-sm text-muted">
        Drop in the job posting and we’ll rank every student who opted in to being found against it.
      </p>

      {stage.kind === 'input' &&
      <div className="mt-5 space-y-4">
          <PdfDropZone what="job posting PDF" helper="PDF, up to 5 MB" onFile={(f) => void onFile(f)} />
          <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pasted.trim()) void read({ job: { text: pasted.trim() } }, 'your posting');
          }}>

            <TextAreaField
            label="Or paste the posting"
            value={pasted}
            onChange={setPasted}
            rows={6}
            placeholder="Paste the job description, or a few lines about the role and the skills it needs." />
            {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
              type="button"
              onClick={typeItIn}
              className="min-h-[44px] rounded-lg px-2 text-sm text-muted transition-colors duration-150 hover:text-ink">

                No posting? Type the role in
              </button>
              <button
              type="submit"
              disabled={!pasted.trim()}
              className="min-h-[44px] rounded-lg bg-navy px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-700 disabled:opacity-50">

                Read posting
              </button>
            </div>
          </form>
        </div>
      }

      {stage.kind === 'reading' &&
      <p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-canvas px-4 py-6 text-sm text-ink">
          <Loader2Icon className="h-4 w-4 animate-spin text-navy" aria-hidden="true" />
          Reading {stage.what}…
        </p>
      }

      {stage.kind === 'confirm' &&
      <form onSubmit={create} className="mt-5" noValidate>
          <p role="status" className="text-sm text-ink">
            {stage.extract ?
          'Here’s what we read. Fix anything that’s off, then find your students.' :
          'We couldn’t read that automatically. Type the title and the key skills, and we’ll take it from there.'}
          </p>
          <div ref={fieldsRef} className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField label="Job title" value={title} onChange={setTitle} placeholder="Product Manager Intern" autoComplete="off" />
            <TextField label="Company" value={company} onChange={setCompany} placeholder="Qualtrics" autoComplete="organization" />
          </div>
          {stage.extract && stage.extract.requiredSkills.length > 0 ?
        <div className="mt-3">
              <p className="text-xs font-medium text-muted">Skills we’ll weigh</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {stage.extract.requiredSkills.map((s) => <Chip key={s} tone="navy">{s}</Chip>)}
              </div>
            </div> :

        <TextField
          className="mt-3"
          label="Key skills"
          value={skills}
          onChange={setSkills}
          placeholder="SQL, Figma, user research"
          hint="Separate with commas." />

        }
          {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={reset} className="min-h-[44px] rounded-lg px-2 text-sm text-muted transition-colors duration-150 hover:text-ink">
              Use a different posting
            </button>
            <button
            type="submit"
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-navy px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-700">

              <SearchIcon className="h-4 w-4" aria-hidden="true" />
              Find students
            </button>
          </div>
        </form>
      }
    </section>);

}
