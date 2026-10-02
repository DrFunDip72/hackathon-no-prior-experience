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
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>);

}