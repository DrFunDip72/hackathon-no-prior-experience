import React from 'react';

export function EventSkeleton({ hero = false }: {hero?: boolean;}) {
  return (
    <div aria-hidden="true" className={`animate-pulse rounded-xl border border-line bg-white ${hero ? 'p-6' : 'flex gap-4 p-4'}`}>
      {hero ?
      <>
          <div className="h-3 w-24 rounded bg-canvas" />
          <div className="mt-3 h-6 w-3/4 rounded bg-canvas" />
          <div className="mt-3 h-4 w-1/2 rounded bg-canvas" />
          <div className="mt-6 h-px bg-line" />
          <div className="mt-5 flex justify-between">
            <div className="h-9 w-40 rounded-full bg-canvas" />
            <div className="h-9 w-44 rounded-lg bg-canvas" />
          </div>
        </> :

      <>
          <div className="h-14 w-12 shrink-0 rounded-lg bg-canvas" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-2/3 rounded bg-canvas" />
            <div className="h-3 w-1/2 rounded bg-canvas" />
            <div className="h-3 w-1/3 rounded bg-canvas" />
          </div>
        </>
      }
    </div>);

}