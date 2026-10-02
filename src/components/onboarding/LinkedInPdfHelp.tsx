import { useEffect, useId, useRef, useState } from 'react';
import { CircleHelpIcon } from 'lucide-react';

const steps = ['On LinkedIn, open your profile.', 'Click Resources (or More).', 'Choose Save to PDF.', 'Upload the file here.'];

/**
 * "How do I get this?" disclosure for the LinkedIn PDF. Opens upward because it lives in the
 * composer pinned to the bottom of the screen. Tap or click toggles it; Escape or a tap outside closes it.
 */
export function LinkedInPdfHelp() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-navy transition-colors duration-150 hover:bg-navy-50">

        <CircleHelpIcon className="h-4 w-4" aria-hidden="true" />
        How do I get this?
      </button>
      {open &&
      <div
        id={panelId}
        role="region"
        aria-label="How to get your LinkedIn PDF"
        className="absolute bottom-full left-0 z-20 mb-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-line bg-white p-4 text-sm text-ink shadow-[0_8px_24px_-8px_rgba(15,23,42,0.25)]">

          <p className="font-medium">Get your LinkedIn PDF</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
            {steps.map((s) =>
          <li key={s}>{s}</li>
          )}
          </ol>
        </div>
      }
    </div>);

}
