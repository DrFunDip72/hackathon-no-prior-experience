import React from 'react';
import { SectionCard, type SectionProps } from './SectionCard';
import { Chip } from '../ui/Chip';
import { TextField } from '../ui/TextField';
import { useSectionEditor } from '../../hooks/useSectionEditor';
import { joinList, splitList } from '../../utils/text';
import { EMPLOYMENT_OPTIONS } from '../../data/onboardingSteps';

const START_HINT = 'When you can start working, e.g. May 2027';

export function AtAGlance({ profile, editable, onSave }: SectionProps) {
  const { lookingFor } = profile;
  const ed = useSectionEditor(
    () => ({
      roles: joinList(lookingFor.roleTypes),
      employmentType: lookingFor.employmentType,
      startDate: lookingFor.startDate,
      locations: joinList(lookingFor.locations),
      workAuthorization: profile.workAuthorization,
      topSkills: joinList(profile.topSkills)
    }),
    (f) =>
    onSave({
      lookingFor: {
        roleTypes: splitList(f.roles),
        employmentType: f.employmentType,
        startDate: f.startDate,
        locations: splitList(f.locations)
      },
      workAuthorization: f.workAuthorization,
      topSkills: splitList(f.topSkills).slice(0, 5)
    }),
    'glance'
  );

  const facts = [
  {
    label: 'Looking for',
    value: lookingFor.roleTypes.length ? lookingFor.roleTypes.join(', ') : 'Not set',
    sub: lookingFor.employmentType === 'Either' ? 'Internship or full-time' : lookingFor.employmentType
  },
  {
    label: 'Can start',
    value: lookingFor.startDate || 'Not set',
    // Owner-only hint; recruiters (and the employer preview) see just the date.
    sub: editable ? START_HINT : undefined
  },
  { label: 'Locations', value: lookingFor.locations.join(' · ') || 'Open' },
  { label: 'Work authorization', value: profile.workAuthorization || 'Not set' }];


  return (
    <SectionCard
      id="profile-glance"
      title="At a glance"
      description="What recruiters check first"
      editable={editable}
      editing={ed.editing}
      saving={ed.saving}
      onEdit={ed.start}
      onSave={ed.save}
      onCancel={ed.cancel}>
      
      {ed.editing ?
      <div className="space-y-4">
          <TextField label="Roles you want" value={ed.form.roles} onChange={(v) => ed.setForm({ ...ed.form, roles: v })} hint="Separate with commas." />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink">Type</legend>
            <div className="flex flex-wrap gap-2">
              {EMPLOYMENT_OPTIONS.map((t) =>
            <button
              key={t}
              type="button"
              aria-pressed={ed.form.employmentType === t}
              onClick={() => ed.setForm({ ...ed.form, employmentType: t })}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              ed.form.employmentType === t ? 'border-navy bg-navy-50 text-navy' : 'border-line text-ink hover:bg-canvas'}`
              }>
              
                  {t}
                </button>
            )}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Can start" value={ed.form.startDate} onChange={(v) => ed.setForm({ ...ed.form, startDate: v })} placeholder="May 2027" hint={START_HINT} />
            <TextField label="Locations" value={ed.form.locations} onChange={(v) => ed.setForm({ ...ed.form, locations: v })} />
          </div>
          <TextField label="Work authorization" value={ed.form.workAuthorization} onChange={(v) => ed.setForm({ ...ed.form, workAuthorization: v })} />
          <TextField label="Top skills" value={ed.form.topSkills} onChange={(v) => ed.setForm({ ...ed.form, topSkills: v })} hint="Up to 5, separated with commas." />
        </div> :

      <>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((f) =>
          <div key={f.label}>
                <dt className="text-xs font-medium text-muted">{f.label}</dt>
                <dd className="mt-1 text-[15px] font-medium leading-snug text-ink">{f.value}</dd>
                {f.sub && <dd className="text-sm text-muted">{f.sub}</dd>}
              </div>
          )}
          </dl>
          {profile.topSkills.length > 0 &&
        <div className="mt-6 border-t border-line pt-5">
              <p className="text-xs font-medium text-muted">Top skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.topSkills.map((s) =>
            <Chip key={s} tone="navy">
                    {s}
                  </Chip>
            )}
              </div>
            </div>
        }
        </>
      }
    </SectionCard>);

}