import React from 'react';
import { motion } from 'framer-motion';
import { PencilIcon } from 'lucide-react';
import { LogoMark } from '../Logo';

interface EmployerChatBubbleProps {
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

/**
 * Same chat-bubble language as the student onboarding flow (src/components/onboarding/ChatBubble.tsx),
 * kept as its own copy rather than imported: that file is owned by a parallel session.
 */
export function EmployerChatBubble({ role, children, onEdit, isEditing }: EmployerChatBubbleProps) {
  if (role === 'assistant') {
    return (
      <motion.div {...enter} className="flex gap-3">
        <LogoMark className="mt-1 h-7 w-7" />
        <div className="min-w-0 rounded-2xl rounded-tl-md bg-white px-4 py-2.5 text-[15px] leading-relaxed text-ink shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-line">
          {children}
        </div>
      </motion.div>);

  }

  return (
    <motion.div {...enter} className="flex flex-col items-end gap-1">
      <div
        className={`max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed text-ink ring-1 ${
        isEditing ? 'bg-navy-50 ring-navy-200' : 'bg-canvas ring-line'}`
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
