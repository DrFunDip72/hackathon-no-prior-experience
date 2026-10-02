import React from 'react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { SectionCard, type SectionProps } from './SectionCard';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';
import { useSectionEditor } from '../../hooks/useSectionEditor';
import { joinList, splitList } from '../../utils/text';

interface GroupForm {
  key: string;
  label: string;
  skills: string;
}

export function SkillsSection({ profile, editable, onSave }: SectionProps) {
  const ed = useSectionEditor<GroupForm[]>(
    () => profile.skillGroups.map((g, i) => ({ key: `g${i}`, label: g.label, skills: joinList(g.skills) })),
    (form) =>
    onSave({
      skillGroups: form.
      map((f) => ({ label: f.label.trim() || 'Other', skills: splitList(f.skills) })).
      filter((g) => g.skills.length)
    }),
    'skills'
  );

  if (!editable && profile.skillGroups.length === 0) return null;

  const update = (key: string, patch: Partial<GroupForm>) =>
  ed.setForm(ed.form.map((f) => f.key === key ? { ...f, ...patch } : f));

  return (
    <SectionCard
      id="profile-skills"
      title="Skills"
      editable={editable}
      editing={ed.editing}
      saving={ed.saving}
      onEdit={ed.start}
      onSave={ed.save}
      onCancel={ed.cancel}>
      
      {ed.editing ?
      <div className="space-y-4">
          {ed.form.map((f) =>
        <div key={f.key} className="grid items-end gap-3 sm:grid-cols-[180px_1fr_auto]">
              <TextField label="Group" value={f.label} onChange={(v) => update(f.key, { label: v })} />
              <TextField label="Skills" value={f.skills} onChange={(v) => update(f.key, { skills: v })} />
              <button
            type="button"
            aria-label={`Remove ${f.label || 'group'}`}
            onClick={() => ed.setForm(ed.form.filter((x) => x.key !== f.key))}
            className="mb-0.5 rounded-md p-2 text-muted transition-colors duration-150 hover:bg-canvas hover:text-danger">
            
                <Trash2Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
        )}
          <button
          type="button"
          onClick={() => ed.setForm([...ed.form, { key: `g${Date.now()}`, label: '', skills: '' }])}
          className="flex items-center gap-1.5 text-sm font-medium text-navy hover:underline">
          
            <PlusIcon className="h-4 w-4" aria-hidden="true" /> Add group
          </button>
        </div> :
      profile.skillGroups.length === 0 ?
      <button type="button" onClick={ed.start} className="text-sm font-medium text-navy hover:underline">
          Add skills
        </button> :

      <dl className="divide-y divide-line">
          {profile.skillGroups.map((g) =>
        <div key={g.label} className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[160px_1fr]">
              <dt className="text-sm font-medium text-muted">{g.label}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {g.skills.map((s) =>
            <Chip key={s} tone={profile.topSkills.includes(s) ? 'navy' : 'neutral'}>
                    {s}
                  </Chip>
            )}
              </dd>
            </div>
        )}
        </dl>
      }
    </SectionCard>);

}