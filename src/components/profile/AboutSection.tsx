import React from 'react';
import { SectionCard, type SectionProps } from './SectionCard';
import { TextAreaField } from '../ui/TextAreaField';
import { useSectionEditor } from '../../hooks/useSectionEditor';

export function AboutSection({ profile, editable, onSave }: SectionProps) {
  const ed = useSectionEditor(() => profile.summary, (summary) => onSave({ summary: summary.trim() }), 'about');

  if (!editable && !profile.summary) return null;

  return (
    <SectionCard
      id="profile-about"
      title="About"
      editable={editable}
      editing={ed.editing}
      saving={ed.saving}
      onEdit={ed.start}
      onSave={ed.save}
      onCancel={ed.cancel}>
      
      {ed.editing ?
      <TextAreaField label="Summary" value={ed.form} onChange={ed.setForm} rows={5} hint="2–3 sentences on what you do and what you’re after." /> :
      profile.summary ?
      <p className="max-w-prose whitespace-pre-wrap leading-relaxed text-ink">{profile.summary}</p> :

      <button type="button" onClick={ed.start} className="tap-target text-sm font-medium text-navy hover:underline">
          Add a short summary
        </button>
      }
    </SectionCard>);

}