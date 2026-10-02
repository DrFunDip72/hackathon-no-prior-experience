import React, { useEffect, useRef, useState } from 'react';
import { FileTextIcon, PaperclipIcon } from 'lucide-react';

interface PdfDropZoneProps {
  /** e.g. "resume" or "LinkedIn PDF": shown as "Drop your {what} here, or browse". */
  what: string;
  helper?: string;
  disabled?: boolean;
  /** `large` for the resume step, `compact` for the optional LinkedIn PDF. */
  size?: 'large' | 'compact';
  /** Called with the dropped or chosen file. Validation (PDF only, size) happens in the caller. */
  onFile: (file: File) => void;
}

const hasFiles = (e: DragEvent | React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/**
 * A click-or-drop target for one PDF. It's a real button, so Enter / Space open the file picker,
 * and while it's on screen a file dropped anywhere else on the page is ignored instead of
 * making the browser navigate away from the chat.
 */
export function PdfDropZone({ what, helper, disabled, size = 'large', onFile }: PdfDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const guard = (e: DragEvent) => {
      if (!hasFiles(e) || (e.target as Element | null)?.closest?.('[data-pdf-dropzone]:not(:disabled)')) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
    };
    window.addEventListener('dragover', guard);
    window.addEventListener('drop', guard);
    return () => {
      window.removeEventListener('dragover', guard);
      window.removeEventListener('drop', guard);
    };
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
    if (!disabled) setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    // Moving between the zone's own children fires dragleave too; only clear when the pointer really leaves.
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  };

  const tone = dragging ?
  'border-navy bg-navy-50' :
  'border-line bg-white hover:border-navy-200 hover:bg-canvas';
  const prompt = dragging ?
  `Drop your ${what} to add it` :
  <>
      Drop your {what} here, or <span className="text-navy underline underline-offset-2">browse</span>
    </>;


  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
        tabIndex={-1}
        aria-hidden="true" />

      <button
        type="button"
        data-pdf-dropzone=""
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full rounded-xl border border-dashed text-center transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 disabled:opacity-60 ${tone} ${
        size === 'large' ?
        'flex flex-col items-center justify-center gap-2 px-4 py-8' :
        'flex items-center justify-center gap-2 px-3 py-3'}`
        }>

        {size === 'large' ?
        <>
            <FileTextIcon className={`h-5 w-5 ${dragging ? 'text-navy' : 'text-muted'}`} aria-hidden="true" />
            <span className="text-sm font-medium text-ink">{prompt}</span>
            {helper && <span className="text-xs text-muted">{helper}</span>}
          </> :

        <>
            <PaperclipIcon className={`h-4 w-4 shrink-0 ${dragging ? 'text-navy' : 'text-muted'}`} aria-hidden="true" />
            <span className="text-sm text-ink">{prompt}</span>
            {helper && <span className="hidden text-xs text-muted sm:inline">· {helper}</span>}
          </>
        }
      </button>
    </>);

}
