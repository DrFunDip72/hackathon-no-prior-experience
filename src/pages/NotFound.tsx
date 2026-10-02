import { Link } from 'react-router-dom';
import { ArrowRightIcon, CompassIcon } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { usePageTitle } from '../hooks/usePageTitle';

/** Any URL the app doesn't know. Vercel's SPA rewrite sends every path here, so the router decides. */
export function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-50 text-navy">
          <CompassIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">This page doesn’t exist</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          The link may be old or mistyped. Head back home, or see the campus events that fit you.
        </p>
        <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            to="/events"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-5 py-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy-700">
            See events
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg border border-line bg-white px-5 py-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
            Go home
          </Link>
        </div>
      </main>
    </div>);

}
