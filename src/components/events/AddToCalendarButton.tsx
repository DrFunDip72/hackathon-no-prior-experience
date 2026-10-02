import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarPlusIcon, CheckIcon } from 'lucide-react';
import { googleCalendarUrl } from '../../utils/googleCalendar';
import type { ScoredEvent } from '../../types/event';

interface AddToCalendarButtonProps {
  item: ScoredEvent;
  added: boolean;
  onAdd: () => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export function AddToCalendarButton({ item, added, onAdd, size = 'md', fullWidth }: AddToCalendarButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(googleCalendarUrl(item), '_blank', 'noopener,noreferrer');
    onAdd();
  };

  const label = added ? 'Added' : size === 'sm' ? 'Add' : 'Add to Google Calendar';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={added ? `${item.event.title} is in your plan. Open in Google Calendar again` : `Add ${item.event.title} to Google Calendar`}
      className={`tap-target inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 ${
      size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm'} ${
      fullWidth ? 'w-full' : ''} ${
      added ? 'border border-success/30 bg-success-50 text-success-700 hover:bg-success-50/70' : 'bg-navy text-white hover:bg-navy-700'}`
      }>
      
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={added ? 'added' : 'add'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-1.5">
          
          {added ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : <CalendarPlusIcon className="h-4 w-4" aria-hidden="true" />}
          {label}
        </motion.span>
      </AnimatePresence>
    </button>);

}