import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, emptyState } from '../utils/api';
import type { Profile } from '../types/profile';
import type { SessionUser, UserState } from '../types/session';

interface SessionContextValue {
  user: SessionUser | null;
  state: UserState;
  signUp: (name: string, email: string, password: string) => Promise<UserState>;
  logIn: (email: string, password: string) => Promise<UserState>;
  googleSignIn: () => Promise<UserState>;
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

  const begin = useCallback((nextUser: SessionUser) => {
    const loaded = api.loadState(nextUser.email);
    setUser(nextUser);
    setState(loaded);
    return loaded;
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
      signUp: async (name, email, password) => begin(await api.signUp(name, email, password)),
      logIn: async (email, password) => begin(await api.logIn(email, password)),
      googleSignIn: async () => begin(await api.googleSignIn()),
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