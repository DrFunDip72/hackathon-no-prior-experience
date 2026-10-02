import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, Loader2Icon } from 'lucide-react';
import { TextField } from '../ui/TextField';
import { GoogleIcon } from '../ui/GoogleIcon';
import { useSession } from '../../contexts/SessionContext';
import { api, ApiError, type ApiField } from '../../utils/api';
import { isEmail } from '../../utils/text';
import type { Profile } from '../../types/profile';
import type { EmployerAccount } from '../../types/employer';

type Errors = Partial<Record<ApiField | 'form', string>>;

const STUDENT_COPY = {
  title: 'Save your profile',
  blurb: 'Your profile is ready. Create an account to keep it and see events that fit.',
  submitLabel: 'Create account and save',
  backLabel: 'Back to my answers',
  namePlaceholder: 'Jordan Ellis',
  emailPlaceholder: 'you@byu.edu'
};

type AccountProps =
/** Student onboarding: the profile just built, saved with the new student account. */
{profile: Profile;onSave?: never;} |
/** Employer intake: a recruiter account, saved by the caller instead of as a student session. */
{profile?: never;onSave: (account: EmployerAccount) => Promise<void>;};

type AccountStepProps = AccountProps & {
  onCreated: () => void;
  onBack: () => void;
  copy?: Partial<typeof STUDENT_COPY>;
};

/** The last step of onboarding (student or employer): create an account so what was just built is saved. */
export function AccountStep({ profile, onSave, onCreated, onBack, copy: copyOverrides }: AccountStepProps) {
  const { signUp, googleSignIn } = useSession();
  const copy = { ...STUDENT_COPY, ...copyOverrides };
  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [accountExists, setAccountExists] = useState(false);
  const [pending, setPending] = useState<'form' | 'google' | null>(null);

  const showError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      setErrors({ [err.field ?? 'form']: err.message });
      const exists = err.field === 'email';
      setAccountExists(exists);
      // The profile just built would otherwise be lost the moment "Log in instead" navigates away.
      // Keep it for one login attempt so it can be offered back, instead of silently discarding it.
      if (exists && email.trim() && profile) {
        api.saveRecoveredProfile(email, { ...profile, name: name.trim() || profile.name, email: email.trim() });
      }
    } else {
      setErrors({ form: fallback });
    }
    setPending(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found: Errors = {};
    if (!name.trim()) found.name = 'Enter your name.';
    if (!isEmail(email)) found.email = 'Enter a valid email address.';
    if (password.length < 8) found.password = 'Use at least 8 characters.';
    setErrors(found);
    setAccountExists(false);
    if (Object.keys(found).length) return;
    setPending('form');
    try {
      if (onSave) await onSave({ name: name.trim(), email: email.trim() });else
      await signUp(name, email, password, { ...profile, name: name.trim() });
      onCreated();
    } catch (err) {
      showError(err, 'Something went wrong. Try again.');
    }
  };

  const onGoogle = async () => {
    setErrors({});
    setAccountExists(false);
    setPending('google');
    try {
      // Sign-in is simulated; an employer without a name or email yet gets a placeholder Google identity.
      if (onSave) await onSave({ name: name.trim() || 'Recruiter', email: email.trim() || 'recruiter@company.example' });else
      await googleSignIn({ ...profile, name: name.trim() || profile.name, email: email.trim() || profile.email });
      onCreated();
    } catch (err) {
      showError(err, 'Google sign-in failed. Try again.');
    }
  };

  return (
    <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:pt-16">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-sm">

        <button
          type="button"
          onClick={onBack}
          disabled={pending !== null}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted transition-colors duration-150 hover:text-ink disabled:opacity-60">

          <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.backLabel}
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{copy.title}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {copy.blurb} Sign-in is simulated for this demo, and your data stays on this device.
        </p>

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
            <TextField label="Full name" value={name} onChange={setName} error={errors.name} autoComplete="name" placeholder={copy.namePlaceholder} />
            <div>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setAccountExists(false);
                }}
                error={errors.email}
                autoComplete="email"
                placeholder={copy.emailPlaceholder} />

              {accountExists &&
              <Link
                to="/login"
                state={{ email: email.trim() }}
                className="mt-1.5 inline-block text-xs font-medium text-navy hover:underline">

                  Log in instead — we'll offer to apply what you just entered
                </Link>
              }
            </div>
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              hint="At least 8 characters."
              autoComplete="new-password" />

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
              {copy.submitLabel}
            </button>
          </form>
        </div>

        {!onSave &&
        <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-navy hover:underline">
              Log in
            </Link>
          </p>
        }
      </motion.div>
    </main>);

}
