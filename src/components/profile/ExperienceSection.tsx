import React from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { SectionCard, type SectionProps } from './SectionCard';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';
import { TextAreaField } from '../ui/TextAreaField';
import { useSectionEditor } from '../../hooks/useSectionEditor';
import { getInitials, joinList, newId, splitList } from '../../utils/text';

interface ExperienceForm {
  id: string;
  title: string;
  org: string;
  start: string;
  end: string;
  impact: string;
  skills: string;
}

export function ExperienceSection({ profile, editable, onSave }: SectionProps) {
  const ed = useSectionEditor<ExperienceForm[]>(
    () =>
    profile.experience.map((e) => ({ ...e, impact: e.impact.join('\n'), skills: joinList(e.skills) })),
    (form) =>
    onSave({
      experience: form.
      filter((f) => f.title.trim() || f.org.trim()).
      map((f) => ({
        ...f,
        impact: f.impact.split('\n').map((l) => l.replace(/^[•\-\s]+/, '').trim()).filter(Boolean),
        skills: splitList(f.skills)
      }))
    }),
    'experience'
  );

  if (!editable && profile.experience.length === 0) return null;

  const update = (id: string, patch: Partial<ExperienceForm>) =>
  ed.setForm(ed.form.map((f) => f.id === id ? { ...f, ...patch } : f));

  const addRole = () =>
  ed.setForm([...ed.form, { id: newId('x'), title: '', org: '', start: '', end: 'Present', impact: '', skills: '' }]);

  return (
    <SectionCard
      id="profile-experience"
      title="Experience"
      description={editable ? 'Results first, with the skills each role proves' : undefined}
      editable={editable}
      editing={ed.editing}
      saving={ed.saving}
      onEdit={ed.start}
      onSave={ed.save}
      onCancel={ed.cancel}>
      
      {ed.editing ?
      <div className="space-y-6">
          {ed.form.map((f) =>
        <div key={f.id} className="space-y-3 border-b border-line pb-6 last:border-0 last:pb-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Title" value={f.title} onChange={(v) => update(f.id, { title: v })} />
                <TextField label="Organization" value={f.org} onChange={(v) => update(f.id, { org: v })} />
                <TextField label="Start" value={f.start} onChange={(v) => update(f.id, { start: v })} placeholder="May 2026" />
                <TextField label="End" value={f.end} onChange={(v) => update(f.id, { end: v })} placeholder="Present" />
              </div>
              <TextAreaField label="Impact" value={f.impact} onChange={(v) => update(f.id, { impact: v })} hint="One result per line. Lead with numbers." rows={3} />
              <TextField label="Skills it proves" value={f.skills} onChange={(v) => update(f.id, { skills: v })} hint="Separate with commas." />
              <button
            type="button"
            onClick={() => ed.setForm(ed.form.filter((x) => x.id !== f.id))}
            className="flex items-center gap-1.5 text-sm text-danger hover:underline">
            
                <Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" /> Remove role
              </button>
            </div>
        )}
          <button type="button" onClick={addRole} className="flex items-center gap-1.5 text-sm font-medium text-navy hover:underline">
            <PlusIcon className="h-4 w-4" aria-hidden="true" /> Add role
          </button>
        </div> :
      profile.experience.length === 0 ?
      <button type="button" onClick={ed.start} className="text-sm font-medium text-navy hover:underline">
          Add your first role
        </button> :

      <ol className="space-y-6">
          {profile.experience.map((e, i) =>
        <li key={e.id} className="flex gap-4">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-canvas text-xs font-semibold text-muted">
                {getInitials(e.org || e.title)}
              </span>
              <div className={`min-w-0 flex-1 ${i < profile.experience.length - 1 ? 'border-b border-line pb-6' : ''}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-semibold text-ink">{e.title}</h3>
                  <span className="text-sm tabular-nums text-muted">
                    {e.start}
                    {e.end ? ` – ${e.end}` : ''}
                  </span>
                </div>
                <p className="text-sm text-muted">{e.org}</p>
                {e.impact.length > 0 &&
            <ul className="mt-3 space-y-1.5">
                    {e.impact.map((line) =>
              <li key={line} className="flex gap-2 text-[15px] leading-relaxed text-ink">
                        <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
                        {line}
                      </li>
              )}
                  </ul>
            }
                {e.skills.length > 0 &&
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs text-muted">Proves</span>
                    {e.skills.map((s) =>
              <Chip key={s} tone="navy">
                        {s}
                      </Chip>
              )}
                  </div>
            }
              </div>
            </li>
        )}
        </ol>
      }
    </SectionCard>);

}