import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { ScoredPerson } from '../../types/event';

export function PersonRow({ scored }: {scored: ScoredPerson;}) {
  const [open, setOpen] = useState(false);
  const { person } = scored;
  const panelId = `tp-${person.id}`;

  return (
    <li className="py-3">
      <div className="flex gap-3">
        <Avatar name={person.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-ink">{person.name}</p>
              {(person.title || person.org) &&
              <p className="text-sm text-muted">{[person.title, person.org].filter(Boolean).join(' · ')}</p>
              }
              {person.byuConnection && <p className="text-xs text-muted">{person.byuConnection}</p>}
              {person.linkedinUrl &&
              <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-navy hover:underline">
                  LinkedIn
                </a>
              }
            </div>
            <span className="shrink-0 rounded-md bg-canvas px-2 py-0.5 text-xs font-medium text-muted">{person.kind}</span>
          </div>
          <p className="mt-1.5 text-sm text-ink">{scored.reason}</p>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="mt-1.5 flex items-center gap-1 text-sm font-medium text-navy hover:underline">
            
            Talking points
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-150 ease-out ${open ? 'rotate-180' : ''}`}
              aria-hidden="true" />
            
          </button>
          <AnimatePresence initial={false}>
            {open &&
            <motion.ul
              id={panelId}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden">
              
                {scored.talkingPoints.map((tp) =>
              <li key={tp} className="mt-2 rounded-lg bg-canvas px-3 py-2 text-sm leading-relaxed text-ink">
                    {tp}
                  </li>
              )}
              </motion.ul>
            }
          </AnimatePresence>
        </div>
      </div>
    </li>);

}