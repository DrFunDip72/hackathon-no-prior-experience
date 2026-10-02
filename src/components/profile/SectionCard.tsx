import React from 'react';
import { Loader2Icon, PencilIcon } from 'lucide-react';
import type { Profile } from '../../types/profile';

export interface SectionProps {
  profile: Profile;
  editable: boolean;
  onSave: (patch: Partial<Profile>) => Promise<void>;
}

interface SectionCardProps {
  title: string;
  description?: string;
  editable: boolean;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

export function SectionCard({ title, description, editable, editing, saving, onEdit, onSave, onCancel, children }: SectionCardProps) {
  return (
    <section aria-label={title} className="rounded-xl border border-line bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {editable && !editing &&
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${title}`}
          className="-mr-2 -mt-1 rounded-md p-2 text-muted transition-colors duration-150 hover:bg-canvas hover:text-ink">
          
            <PencilIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        }
      </div>
      {children}
      {editing &&
      <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
          
            Cancel
          </button>
          <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy disabled:opacity-60">
          
            {saving && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save
          </button>
        </div>
      }
    </section>);

}