import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOutIcon } from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from './ui/Avatar';
import { useSession } from '../contexts/SessionContext';
import { employerStore } from '../utils/employerStore';

const navItems = [
{ to: '/events', label: 'Events' },
{ to: '/profile', label: 'Profile' },
{ to: '/connect', label: 'Calendars' }];


const employerNav = [{ to: '/employer/matches', label: 'Matches' }];

/** The site header. `employer` swaps the student nav and account menu for the recruiter's. */
export function AppHeader({ audience = 'student' }: {audience?: 'student' | 'employer';}) {
  const { user, state, logOut } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isEmployer = audience === 'employer';
  const employer = isEmployer ? employerStore.account() : null;
  const showNav = isEmployer ? Boolean(employer) || employerStore.roles().length > 0 : Boolean(state.profile);
  const nav = isEmployer ? employerNav : navItems;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo to={isEmployer ? showNav ? '/employer/matches' : '/employer' : showNav ? '/events' : '/'} />
          {showNav &&
          <nav aria-label="Main" className={`items-center gap-1 ${isEmployer ? 'flex' : 'hidden sm:flex'}`}>
              {nav.map((item) =>
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              isActive ? 'bg-canvas text-ink' : 'text-muted hover:text-ink'}`

              }>
              
                  {item.label}
                </NavLink>
            )}
            </nav>
          }
        </div>

        {isEmployer &&
        <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-navy-50 px-2.5 py-1 text-xs font-medium text-navy sm:inline-block">Employer</span>
            {employer && <Avatar name={employer.name} size="sm" />}
            <Link to="/" className="-my-3 whitespace-nowrap py-3 text-sm font-medium text-navy hover:underline sm:my-0 sm:py-0">
              <span className="sm:hidden">Students</span>
              <span className="hidden sm:inline">Back to student site</span>
            </Link>
          </div>
        }

        {!isEmployer && !user &&
        <p className="text-sm text-muted">
            <span className="hidden sm:inline">Already have an account? </span>
            <Link to="/login" className="font-medium text-navy hover:underline">
              Log in
            </Link>
          </p>
        }

        {!isEmployer && user &&
        <div className="relative" ref={menuRef}>
            <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2">
            
              <Avatar name={user.name} src={state.profile?.photoUrl} size="sm" />
              <span className="sr-only">Open account menu</span>
            </button>
            <AnimatePresence>
              {open &&
            <motion.div
              role="menu"
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border border-line bg-white p-1.5 shadow-lg">
              
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>
                  {/* Phones: the tab row below the header covers the student pages; this is the way over to the employer side. */}
                  <div className="border-t border-line py-1 sm:hidden">
                    <Link
                    to="/employer"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex min-h-[44px] items-center rounded-md px-3 text-sm text-ink hover:bg-canvas">
                      For employers
                    </Link>
                  </div>
                  <div className="border-t border-line pt-1">
                    <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    logOut();
                    navigate('/');
                  }}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ink transition-colors duration-150 hover:bg-canvas sm:min-h-0">

                      <LogOutIcon className="h-4 w-4 text-muted" aria-hidden="true" />
                      Log out
                    </button>
                  </div>
                </motion.div>
            }
            </AnimatePresence>
          </div>
        }
      </div>

      {/* Phones: the student nav is a full-width tab row, so every page is one tap away. */}
      {!isEmployer && showNav &&
      <nav aria-label="Main" className="flex border-t border-line sm:hidden">
          {navItems.map((item) =>
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
          `flex h-11 flex-1 items-center justify-center border-b-2 text-sm font-medium transition-colors duration-150 ${
          isActive ? 'border-navy text-ink' : 'border-transparent text-muted'}`
          }>
              {item.label}
            </NavLink>
        )}
        </nav>
      }
    </header>);

}