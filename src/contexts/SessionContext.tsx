import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, ApiError, emptyState } from '../utils/api';
import type { Profile } from '../types/profile';
import type { SessionUser, UserState } from '../types/session';

interface SessionContextValue {
  user: SessionUser | null;
  state: UserState;
  /** Pass the profile built during onboarding to save it with the new account. */
  signUp: (name: string, email: string, password: string, initialProfile?: Profile) => Promise<UserState>;
  logIn: (email: string, password: string) => Promise<UserState>;
  googleSignIn: (initialProfile?: Profile) => Promise<UserState>;
  logOut: () => void;
  updateState: (updater: (state: UserState) => UserState) => void;
  saveProfile: (profile: Profile) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: {children: React.ReactNode;}) {
  const [user, setUser] = useState<SessionUser | null>(() => api.getSession());
  const [state, setState] = useState<UserState>(() => {
    const session = api.getSession();
    return session ? api.loadState(session.email) : emptyState;
  });

  /**
   * Starts a session. A profile built before the account existed is saved for the new user in the same step,
   * so it never depends on a stale updateState closure (which would still see user = null).
   */
  const begin = useCallback((nextUser: SessionUser, initialProfile?: Profile) => {
    const loaded = api.loadState(nextUser.email);
    const next = initialProfile ?
    { ...loaded, profile: { ...initialProfile, name: nextUser.name, email: nextUser.email }, draft: null } :
    loaded;
    if (initialProfile) api.persistState(nextUser.email, next);
    setUser(nextUser);
    setState(next);
    return next;
  }, []);

  const updateState = useCallback(
    (updater: (s: UserState) => UserState) => {
      setState((prev) => {
        const next = updater(prev);
        if (user) api.persistState(user.email, next);
        return next;
      });
    },
    [user]
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      state,
      signUp: async (name, email, password, initialProfile) =>
      begin(await api.signUp(name, email, password), initialProfile),
      logIn: async (email, password) => begin(await api.logIn(email, password)),
      googleSignIn: async (initialProfile) => {
        const googleUser = await api.googleSignIn(initialProfile?.name, initialProfile?.email);
        if (initialProfile && api.loadState(googleUser.email).profile) {
          // Never silently replace a profile that account already has.
          api.logOut();
          throw new ApiError('An account with this email already exists. Try logging in.', 'email');
        }
        return begin(googleUser, initialProfile);
      },
      logOut: () => {
        api.logOut();
        setUser(null);
        setState(emptyState);
      },
      updateState,
      saveProfile: async (profile) => {
        const saved = await api.saveProfile(profile);
        updateState((s) => ({ ...s, profile: saved }));
      }
    }),
    [user, state, begin, updateState]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}