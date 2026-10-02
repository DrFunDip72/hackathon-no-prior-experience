import React from 'react';
import { Link } from 'react-router-dom';

export function Logo({ to = '/' }: {to?: string;}) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-navy text-[13px] font-bold tracking-tight text-white">
        cc
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">Campus Connect</span>
    </Link>);

}