import React from 'react';
import { getInitials } from '../../utils/text';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'xl';
  className?: string;
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  xl: 'h-28 w-28 text-3xl'
};

export function Avatar({ name, src, size = 'sm', className = '' }: AvatarProps) {
  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      aria-hidden="true"
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-navy-100 font-semibold text-navy ${className}`}>
      
      {getInitials(name)}
    </span>);

}