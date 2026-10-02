import React from 'react';

interface ChipProps {
  children: React.ReactNode;
  tone?: 'neutral' | 'navy' | 'success' | 'warning';
}

const tones = {
  neutral: 'bg-canvas text-ink',
  navy: 'bg-navy-50 text-navy',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning'
};

export function Chip({ children, tone = 'neutral' }: ChipProps) {
  return (
    // Phones: a long chip (a course name) wraps inside its row instead of pushing the page sideways.
    <span className={`inline-flex max-w-full items-center gap-1 rounded-md sm:max-w-none sm:whitespace-nowrap px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>);

}