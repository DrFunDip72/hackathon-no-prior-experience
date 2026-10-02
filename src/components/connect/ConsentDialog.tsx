import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';
import { GoogleIcon } from '../ui/GoogleIcon';
import type { CalendarSource } from '../../types/calendar';

interface ConsentDialogProps {
  source: CalendarSource | null;
  accountEmail: string;
  onAllow: (source: CalendarSource) => void;
  onCancel: () => void;
}

export function ConsentDialog({ source, accountEmail, onAllow, onCancel }: ConsentDialogProps) {
  const allowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!source) return;
    allowRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [source, onCancel]);

  return (
    <AnimatePresence>
      {source &&
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
          className="absolute inset-0 bg-ink/40" />
        
          <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          
            <div className="flex items-center gap-2 text-sm text-muted">
              {source.provider === 'Google' ?
            <>
                  <GoogleIcon className="h-5 w-5" /> Sign in with Google
                </> :

            <>
                  <span className="flex h-5 w-8 items-center justify-center rounded bg-navy text-[9px] font-bold text-white">BYU</span>
                  BYU Central Authentication
                </>
            }
            </div>
            <h2 id="consent-title" className="mt-4 text-lg font-semibold text-ink">
              Doorway wants access to {source.name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {source.provider === 'Google' ? `Signed in as ${accountEmail}` : 'Signed in with your BYU NetID'}
            </p>

            <p className="mt-5 text-sm font-medium text-ink">This will allow Doorway to:</p>
            <ul className="mt-2 space-y-2">
              {source.permissions.map((p) =>
            <li key={p} className="flex items-start gap-2 text-sm text-ink">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  {p}
                </li>
            )}
            </ul>
            <p className="mt-5 text-xs text-muted">You can disconnect anytime. Event details are never shared with employers.</p>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
                Cancel
              </button>
              <button
              ref={allowRef}
              type="button"
              onClick={() => onAllow(source)}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-700">
              
                Allow
              </button>
            </div>
          </motion.div>
        </div>
      }
    </AnimatePresence>);

}