import React from 'react';
import { motion } from 'framer-motion';
import { PencilIcon } from 'lucide-react';

interface ChatBubbleProps {
  role: 'assistant' | 'user';
  children: React.ReactNode;
  onEdit?: () => void;
  isEditing?: boolean;
}

const enter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
};

export function ChatBubble({ role, children, onEdit, isEditing }: ChatBubbleProps) {
  if (role === 'assistant') {
    return (
      <motion.div {...enter} className="flex gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy text-[11px] font-bold text-white">
          
          cc
        </span>
        <div className="pt-0.5 text-[15px] leading-relaxed text-ink">{children}</div>
      </motion.div>);

  }

  return (
    <motion.div {...enter} className="flex flex-col items-end gap-1">
      <div
        className={`max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed text-ink ${
        isEditing ? 'bg-navy-50 ring-1 ring-navy-200' : 'bg-canvas'}`
        }>
        
        {children}
      </div>
      {onEdit && !isEditing &&
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted transition-colors duration-150 hover:text-ink">
        
          <PencilIcon className="h-3 w-3" aria-hidden="true" />
          Edit
        </button>
      }
    </motion.div>);

}