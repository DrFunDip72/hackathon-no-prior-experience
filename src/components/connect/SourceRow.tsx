import React from 'react';
import { CalendarDaysIcon, CheckCircle2Icon, Loader2Icon } from 'lucide-react';
import { GoogleIcon } from '../ui/GoogleIcon';
import type { CalendarSource } from '../../types/calendar';

interface SourceRowProps {
  source: CalendarSource;
  connected: boolean;
  syncing: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function SourceRow({ source, connected, syncing, onConnect, onDisconnect }: SourceRowProps) {
  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${source.provider === 'Google' ? 'border border-line bg-white' : 'bg-navy text-white'}`}>
        
        {source.provider === 'Google' ? <GoogleIcon className="h-5 w-5" /> : <CalendarDaysIcon className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-ink">{source.name}</h3>
        <p className="mt-0.5 text-sm text-muted">{source.description}</p>
        {connected &&
        <p className="mt-1 text-xs text-success-700">
            {source.provider === 'Google' ? `${source.eventCount} events checked for conflicts` : `${source.eventCount} events this month`}
          </p>
        }
      </div>
      <div className="shrink-0">
        {syncing ?
        <span className="flex items-center gap-2 text-sm text-muted" role="status">
            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
            Syncing…
          </span> :
        connected ?
        <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-success-700">
              <CheckCircle2Icon className="h-4 w-4" aria-hidden="true" />
              Connected
            </span>
            <button type="button" onClick={onDisconnect} className="text-sm text-muted transition-colors duration-150 hover:text-ink">
              Disconnect
            </button>
          </div> :

        <button
          type="button"
          onClick={onConnect}
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
          
            Connect
          </button>
        }
      </div>
    </li>);

}