import React from 'react';
import { SectionCard, type SectionProps } from './SectionCard';
import { Chip } from '../ui/Chip';
import { EmployerLogo } from '../ui/EmployerLogo';
import { TextField } from '../ui/TextField';
import { employers } from '../../data/employers';
import { useSectionEditor } from '../../hooks/useSectionEditor';
import { joinList, splitList, termMatch } from '../../utils/text';

export function InterestsSection({ profile, editable, onSave }: SectionProps) {
  const { interests } = profile;
  const ed = useSectionEditor(
    () => ({ industries: joinList(interests.industries), companies: joinList(interests.companies) }),
    (f) => onSave({ interests: { industries: splitList(f.industries), companies: splitList(f.companies) } })
  );

  if (!editable && !interests.industries.length && !interests.companies.length) return null;

  return (
    <SectionCard
      title="Interests"
      description="Used to rank events and people for you"
      editable={editable}
      editing={ed.editing}
      saving={ed.saving}
      onEdit={ed.start}
      onSave={ed.save}
      onCancel={ed.cancel}>
      
      {ed.editing ?
      <div className="space-y-4">
          <TextField label="Industries" value={ed.form.industries} onChange={(v) => ed.setForm({ ...ed.form, industries: v })} hint="e.g. Software, Consulting, Product & Design" />
          <TextField label="Target companies" value={ed.form.companies} onChange={(v) => ed.setForm({ ...ed.form, companies: v })} hint="e.g. Adobe, Qualtrics, Lucid" />
        </div> :

      <dl className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm font-medium text-muted">Industries</dt>
            <dd className="flex flex-wrap gap-1.5">
              {interests.industries.length ? interests.industries.map((i) => <Chip key={i}>{i}</Chip>) : <span className="text-sm text-muted">None yet</span>}
            </dd>
          </div>
          <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm font-medium text-muted">Target companies</dt>
            <dd className="flex flex-wrap gap-2">
              {interests.companies.length ?
            interests.companies.map((c) => {
              const known = employers.find((e) => termMatch(e.name, c));
              return (
                <span key={c} className="flex items-center gap-2 rounded-lg border border-line py-1 pl-1 pr-2.5 text-sm font-medium text-ink">
                      {known ? <EmployerLogo employer={known} size="xs" /> : null}
                      {c}
                    </span>);

            }) :

            <span className="text-sm text-muted">None yet</span>
            }
            </dd>
          </div>
        </dl>
      }
    </SectionCard>);

}