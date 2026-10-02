import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SparklesIcon } from 'lucide-react';

interface ReadyDialogProps {
  open: boolean;
  summary: string;
  onBuild: () => void;
  onClose: () => void;
  /** Where focus goes on close when whatever had it before opening is gone (e.g. the composer that just unmounted). */
  fallbackFocus: React.RefObject<HTMLElement>;
  /** The primary button; defaults to the student copy. */
  actionLabel?: string;
}

/** Shown once every question is answered: a modal dialog that hands off to building the profile. */
export function ReadyDialog({ open, summary, onBuild, onClose, fallbackFocus, actionLabel = 'Build my profile' }: ReadyDialogProps) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();
    return () => {
      const target = returnTo.current?.isConnected && returnTo.current !== document.body ? returnTo.current : fallbackFocus.current;
      target?.focus();
    };
  }, [open, fallbackFocus]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !panelRef.current) return;
    // Keep Tab inside the dialog.
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {open &&
      <motion.div
        key="ready"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.15 }}
        onKeyDown={onKeyDown}>

          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
          <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ready-title"
          aria-describedby="ready-summary"
          tabIndex={-1}
          initial={reduce ? false : { opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 4 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="relative w-full max-w-sm rounded-2xl border focus:outline-none border-line bg-white p-6 text-center shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)]">

            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-navy-50 text-navy">
              <SparklesIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 id="ready-title" className="mt-4 text-xl font-semibold tracking-tight text-ink">
              Ready to go?
            </h2>
            <p id="ready-summary" className="mt-1.5 text-sm leading-relaxed text-muted">
              {summary}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
              ref={primaryRef}
              type="button"
              onClick={onBuild}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">

                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                {actionLabel}
              </button>
              <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-navy">

                Review answers
              </button>
            </div>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}
