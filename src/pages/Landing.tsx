import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { Logo } from '../components/Logo';
import { HeroPrompt } from '../components/landing/HeroPrompt';
import { MatchPreview } from '../components/landing/MatchPreview';
import { HowItWorks } from '../components/landing/HowItWorks';
import { HeroBackground, isHeroBackgroundVariant } from '../components/landing/HeroBackground';
import { useResumeUpload } from '../components/landing/useResumeUpload';
import { useSession } from '../contexts/SessionContext';

export function Landing() {
  usePageTitle();
  const { user, state } = useSession();
  const appHome = state.profile ? '/events' : '/onboarding';
  // Compare hero treatments with ?bg=byu-aurora (default), ?bg=byu-deep, or ?bg=byu-sky.
  const [params] = useSearchParams();
  const bgParam = params.get('bg');
  const bg = isHeroBackgroundVariant(bgParam) ? bgParam : undefined;
  const upload = useResumeUpload();
  const ctaClass =
  'mt-8 inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-3 text-base font-medium text-white transition-colors duration-150 hover:bg-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2';

  return (
    <div className="min-h-screen w-full bg-white">
      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-2">
          <a href="#how-it-works" className="hidden rounded-md px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink sm:block">
            How it works
          </a>
          {/* No verification flow yet -- just a toggle to the employer side of the demo. */}
          <Link to="/employer" className="hidden rounded-md px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink sm:block">
            For employers
          </Link>
          {user ?
          <Link to={appHome} className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">
              Open app
            </Link> :

          <>
              <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas">
                Log in
              </Link>
              <Link to="/onboarding" className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy">
                Get started
              </Link>
            </>
          }
        </nav>
      </header>

      <main>
        {/* Pulled up under the transparent header so the background color starts at the top of the page. */}
        <section className="relative isolate -mt-16 overflow-hidden">
          <HeroBackground variant={bg} />
          <div className="mx-auto max-w-4xl px-6 pb-28 pt-32 text-center sm:pb-36 sm:pt-44">
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-6xl sm:leading-[1.05]">
              The people hiring you are already on campus.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Doorway reads your resume, checks BYU’s career and club calendars, and tells you which events are worth
              your evening and which companies will be there.
            </p>
            <div className="mt-10">
              <HeroPrompt destination={appHome} />
            </div>
          </div>
        </section>

        <MatchPreview />
        <HowItWorks />

        <section aria-labelledby="cta-heading" className="border-t border-line bg-canvas">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
            <h2 id="cta-heading" className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Get your foot in the door.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted">
              Drop in your resume and we’ll rank this month’s BYU events by who’s hiring people like you.
            </p>
            {state.profile ?
            <Link to={appHome} className={ctaClass}>
                See your events
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link> :

            <>
                {upload.input}
                <button type="button" onClick={upload.open} className={ctaClass}>
                  Upload your resume
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            }
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Doorway</span>
          <span>Built for BYU students. Not affiliated with Brigham Young University.</span>
        </div>
      </footer>
    </div>);

}