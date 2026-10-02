import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { HeroPrompt } from '../components/landing/HeroPrompt';
import { MatchPreview } from '../components/landing/MatchPreview';
import { HowItWorks } from '../components/landing/HowItWorks';
import { useSession } from '../contexts/SessionContext';

export function Landing() {
  const { user, state } = useSession();
  const appHome = state.profile ? '/events' : '/onboarding';

  return (
    <div className="min-h-screen w-full bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav aria-label="Primary" className="flex items-center gap-2">
          <a href="#how-it-works" className="hidden rounded-md px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-ink sm:block">
            How it works
          </a>
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
        <section className="mx-auto max-w-4xl px-6 pb-24 pt-20 text-center sm:pt-28">
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-6xl sm:leading-[1.05]">
            The people hiring you are already on campus.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Campus Connect reads your resume, checks every BYU calendar, and tells you which events are worth your evening and
            who to talk to when you get there.
          </p>
          <div className="mt-10">
            <HeroPrompt destination={appHome} />
          </div>
        </section>

        <MatchPreview />
        <HowItWorks />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted sm:flex-row">
          <span>© {new Date().getFullYear()} Campus Connect</span>
          <span>Built for BYU students. Not affiliated with Brigham Young University.</span>
        </div>
      </footer>
    </div>);

}