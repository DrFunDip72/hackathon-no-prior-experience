import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, Loader2Icon } from 'lucide-react';

const STEPS = ['Reading what you shared', 'Scoring the student pool'];

/** Same loading-checklist language as BuildingProfile.tsx on the student side; own copy, not imported. */
export function BuildingMatches() {
  const [done, setDone] = useState(0);

  useEffect(() => {
    const timers = STEPS.map((_, i) => setTimeout(() => setDone(i + 1), 400 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-24" role="status" aria-live="polite">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm">

        <h1 className="text-2xl font-semibold tracking-tight text-ink">Finding your matches</h1>
        <p className="mt-1.5 text-sm text-muted">Just a second.</p>
        <ul className="mt-8 space-y-4">
          {STEPS.map((label, i) => {
            const state = i < done ? 'done' : i === done ? 'active' : 'waiting';
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-200 ${
                  state === 'done' ? 'bg-success text-white' : 'bg-canvas text-muted'}`
                  }>

                  {state === 'done' ?
                  <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> :
                  state === 'active' ?
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> :

                  <span className="h-1.5 w-1.5 rounded-full bg-muted/40" />
                  }
                </span>
                <span className={`text-[15px] ${state === 'waiting' ? 'text-muted' : 'text-ink'}`}>{label}</span>
              </li>);

          })}
        </ul>
      </motion.div>
    </div>);

}
