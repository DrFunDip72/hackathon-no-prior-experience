import React from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { SectionCard, type SectionProps } from './SectionCard';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';
import { TextAreaField } from '../ui/TextAreaField';
import { useSectionEditor } from '../../hooks/useSectionEditor';
import { joinList, newId, splitList } from '../../utils/text';

interface ProjectForm {
  id: string;
  name: string;
  description: string;
  skills: string;
}

export function ProjectsSection({ profile, editable, onSave }: SectionProps) {
  const ed = useSectionEditor<ProjectForm[]>(
    () => profile.projects.map((p) => ({ ...p, skills: joinList(p.skills) })),
    (form) =>
    onSave({
      projects: form.filter((f) => f.name.trim()).map((f) => ({ ...f, skills: splitList(f.skills) }))
    })
  );

  if (!editable && profile.projects.length === 0) return null;

  const update = (id: string, patch: Partial<ProjectForm>) =>
  ed.setForm(ed.form.map((f) => f.id === id ? { ...f, ...patch } : f));

  return (
    <SectionCard
      title="Projects"
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
              <TextField label="Project name" value={f.name} onChange={(v) => update(f.id, { name: v })} />
              <TextAreaField label="What it is and what happened" value={f.description} onChange={(v) => update(f.id, { description: v })} rows={2} />
              <TextField label="Skills used" value={f.skills} onChange={(v) => update(f.id, { skills: v })} hint="Separate with commas." />
              <button
            type="button"
            onClick={() => ed.setForm(ed.form.filter((x) => x.id !== f.id))}
            className="flex items-center gap-1.5 text-sm text-danger hover:underline">
            
                <Trash2Icon className="h-3.5 w-3.5" aria-hidden="true" /> Remove project
              </button>
            </div>
        )}
          <button
          type="button"
          onClick={() => ed.setForm([...ed.form, { id: newId('pr'), name: '', description: '', skills: '' }])}
          className="flex items-center gap-1.5 text-sm font-medium text-navy hover:underline">
          
            <PlusIcon className="h-4 w-4" aria-hidden="true" /> Add project
          </button>
        </div> :
      profile.projects.length === 0 ?
      <button type="button" onClick={ed.start} className="text-sm font-medium text-navy hover:underline">
          Add a project
        </button> :

      <div className="grid gap-6 sm:grid-cols-2">
          {profile.projects.map((p) =>
        <article key={p.id} className="flex flex-col">
              <h3 className="font-semibold text-ink">{p.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{p.description}</p>
              {p.skills.length > 0 &&
          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                  {p.skills.map((s) =>
            <Chip key={s}>{s}</Chip>
            )}
                </div>
          }
            </article>
        )}
        </div>
      }
    </SectionCard>);

}