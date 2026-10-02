import React from 'react';
import { SectionCard, type SectionProps } from './SectionCard';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';
import { useSectionEditor } from '../../hooks/useSectionEditor';
import { joinList, splitList } from '../../utils/text';

export function EducationSection({ profile, editable, onSave }: SectionProps) {
  const edu = profile.education;
  const ed = useSectionEditor(
    () => ({ ...edu, coursework: joinList(edu.coursework) }),
    (f) => onSave({ education: { ...f, coursework: splitList(f.coursework) } })
  );

  return (
    <SectionCard
      title="Education"
      editable={editable}
      editing={ed.editing}
      saving={ed.saving}
      onEdit={ed.start}
      onSave={ed.save}
      onCancel={ed.cancel}>
      
      {ed.editing ?
      <div className="space-y-4">
          <TextField label="School" value={ed.form.school} onChange={(v) => ed.setForm({ ...ed.form, school: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Degree" value={ed.form.degree} onChange={(v) => ed.setForm({ ...ed.form, degree: v })} />
            <TextField label="Major" value={ed.form.major} onChange={(v) => ed.setForm({ ...ed.form, major: v })} />
            <TextField label="Graduation year" value={ed.form.gradYear} onChange={(v) => ed.setForm({ ...ed.form, gradYear: v })} />
            <TextField label="GPA" value={ed.form.gpa} onChange={(v) => ed.setForm({ ...ed.form, gpa: v })} hint="Optional" />
          </div>
          <TextField label="Relevant coursework" value={ed.form.coursework} onChange={(v) => ed.setForm({ ...ed.form, coursework: v })} hint="Separate with commas." />
        </div> :

      <div className="flex gap-4">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy text-xs font-bold text-white">
            BYU
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-ink">{edu.school}</h3>
            <p className="text-sm text-ink">
              {[edu.degree, edu.major].filter(Boolean).join(', ') || (editable ? 'Add your degree' : '')}
            </p>
            <p className="text-sm text-muted">
              {[edu.gradYear && `Class of ${edu.gradYear}`, edu.gpa && `GPA ${edu.gpa}`].filter(Boolean).join(' · ')}
            </p>
            {edu.coursework.length > 0 &&
          <div className="mt-3 flex flex-wrap gap-1.5">
                {edu.coursework.map((c) =>
            <Chip key={c}>{c}</Chip>
            )}
              </div>
          }
          </div>
        </div>
      }
    </SectionCard>);

}