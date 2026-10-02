import React from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { Toggle } from '../ui/Toggle';

interface VisibilityPanelProps {
  visible: boolean;
  onToggle: (visible: boolean) => void;
  preview: boolean;
  onPreview: () => void;
}

export function VisibilityPanel({ visible, onToggle, preview, onPreview }: VisibilityPanelProps) {
  return (
    <section aria-labelledby="visibility-heading" className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="visibility-heading" className="text-sm font-semibold text-ink">
            Visible to employers
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {visible ?
            'Recruiters attending events you add can find your profile and reach out.' :
            'Hidden. Recruiters won’t see you, but your event matches still work.'}
          </p>
        </div>
        <Toggle checked={visible} onChange={onToggle} label="Visible to employers" />
      </div>
      <button
        type="button"
        onClick={onPreview}
        aria-pressed={preview}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
        
        {preview ? <EyeOffIcon className="h-4 w-4" aria-hidden="true" /> : <EyeIcon className="h-4 w-4" aria-hidden="true" />}
        {preview ? 'Exit employer preview' : 'Preview as employer'}
      </button>
    </section>);

}