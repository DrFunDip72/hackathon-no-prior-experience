import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import { Logo } from '../components/Logo';
import { TextField } from '../components/ui/TextField';
import { GoogleIcon } from '../components/ui/GoogleIcon';
import { useSession } from '../contexts/SessionContext';
import { ApiError, type ApiField } from '../utils/api';
import { isEmail } from '../utils/text';
import type { UserState } from '../types/session';

type Errors = Partial<Record<ApiField | 'form', string>>;

/** Log in for returning students. New students create their account at the end of onboarding. */
export function Auth() {
  const { logIn, googleSignIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as {from?: string;} | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState<'form' | 'google' | null>(null);

  const finish = (state: UserState) => {
    if (!state.profile) navigate('/onboarding', { replace: true });else
    navigate(from && from !== '/onboarding' ? from : '/events', { replace: true });
  };

  const validate = (): Errors => {
    const next: Errors = {};
    if (!isEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    return next;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setPending('form');
    try {
      finish(await logIn(email, password));
    } catch (err) {
      if (err instanceof ApiError) setErrors({ [err.field ?? 'form']: err.message });else
      setErrors({ form: 'Something went wrong. Try again.' });
      setPending(null);
    }
  };

  const onGoogle = async () => {
    setErrors({});
    setPending('google');
    try {
      finish(await googleSignIn());
    } catch {
      setErrors({ form: 'Google sign-in failed. Try again.' });
      setPending(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-canvas">
      <header className="px-6 py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:pt-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted">Log in to see this week’s events for you.</p>

          <div className="mt-8 rounded-2xl border border-line bg-white p-6">
            <button
              type="button"
              onClick={onGoogle}
              disabled={pending !== null}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-canvas disabled:opacity-60">

              {pending === 'google' ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" /> : <GoogleIcon />}
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                error={errors.email}
                autoComplete="email"
                placeholder="you@byu.edu" />

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                error={errors.password}
                autoComplete="current-password" />

              {errors.form &&
              <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
                  {errors.form}
                </p>
              }
              <button
                type="submit"
                disabled={pending !== null}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-navy disabled:opacity-60">

                {pending === 'form' && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Log in
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            New here?{' '}
            <Link to="/onboarding" className="font-medium text-navy hover:underline">
              Build your profile
            </Link>
          </p>
        </div>
      </main>
    </div>);

}
