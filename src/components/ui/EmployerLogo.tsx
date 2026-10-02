import React from 'react';
import type { Employer } from '../../types/event';

export function EmployerLogo({ employer, size = 'sm' }: {employer: Employer;size?: 'xs' | 'sm' | 'md';}) {
  const dims = { xs: 'h-6 w-6 text-[9px]', sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-xs' }[size];
  if (employer.logoUrl) {
    return <img src={employer.logoUrl} alt="" title={employer.name} className={`${dims} shrink-0 rounded-md bg-white object-contain`} />;
  }
  return (
    <span
      title={employer.name}
      className={`${dims} flex shrink-0 items-center justify-center rounded-md font-bold text-white`}
      style={{ backgroundColor: employer.color }}>
      
      {employer.initials}
    </span>);

}