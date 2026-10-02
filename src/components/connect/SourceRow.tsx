import React from 'react';
import { CalendarDaysIcon, CheckCircle2Icon, Loader2Icon } from 'lucide-react';
import { GoogleIcon } from '../ui/GoogleIcon';
import { Chip } from '../ui/Chip';
import type { CalendarSource } from '../../types/calendar';

interface SourceRowProps {
  source: CalendarSource;
  connected: boolean;
  syncing: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function SourceRow({ source, connected, syncing, onConnect, onDisconnect }: SourceRowProps) {
  const soon = source.status === 'soon';
  const preview = source.status === 'preview';

  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span
        aria-hidden="true"
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
        source.provider === 'Google' ? 'border border-line bg-white' : soon ? 'bg-canvas text-muted' : 'bg-navy text-white'}`
        }>
        
        {source.provider === 'Google' ? <GoogleIcon className="h-5 w-5" /> : <CalendarDaysIcon className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`font-medium ${soon ? 'text-muted' : 'text-ink'}`}>{source.name}</h3>
          {preview && <Chip tone="navy">Preview</Chip>}
        </div>
        <p className="mt-0.5 text-sm text-muted">{source.description}</p>
        {connected && !soon &&
        <p className="mt-1 text-xs text-success-700">
            {preview ? 'Sample schedule on. Events show “You’re free” or a conflict.' : 'Your feed is focused on these events.'}
          </p>
        }
      </div>
      <div className="shrink-0">
        {soon ?
        <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-lg border border-line bg-canvas px-4 py-2 text-sm font-medium text-muted">
              Coming soon
            </span>
            {/* Connected before this source was marked "soon": let them undo it (it would empty the feed). */}
            {connected &&
          <button type="button" onClick={onDisconnect} className="text-sm text-muted transition-colors duration-150 hover:text-ink">
                Disconnect
              </button>
          }
          </div> :
        syncing ?
        <span className="flex items-center gap-2 text-sm text-muted" role="status">
            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
            {preview ? 'Loading sample…' : 'Adding…'}
          </span> :
        connected ?
        <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-medium text-success-700">
              <CheckCircle2Icon className="h-4 w-4" aria-hidden="true" />
              {preview ? 'Preview on' : 'Connected'}
            </span>
            <button type="button" onClick={onDisconnect} className="text-sm text-muted transition-colors duration-150 hover:text-ink">
              {preview ? 'Turn off' : 'Disconnect'}
            </button>
          </div> :

        <button
          type="button"
          onClick={onConnect}
          className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
          
            {preview ? 'Try preview' : 'Connect'}
          </button>
        }
      </div>
    </li>);

}
