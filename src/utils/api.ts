/**
 * Simulated back end. Every call has realistic latency and error cases and
 * persists to localStorage. Swap these functions for real endpoints later.
 */
import { calendarSources } from '../data/calendarSources';
import { events } from '../data/events';
import type { CalendarId } from '../types/calendar';
import type { CampusEvent } from '../types/event';
import type { Profile } from '../types/profile';
import type { SessionUser, UserState } from '../types/session';

const USERS_KEY = 'cc_users';
const SESSION_KEY = 'cc_session';
const stateKey = (email: string) => `cc_state_${email}`;

interface StoredUser extends SessionUser {
  password: string;
}

export type ApiField = 'name' | 'email' | 'password';

export class ApiError extends Error {
  field?: ApiField;
  constructor(message: string, field?: ApiField) {
    super(message);
    this.field = field;
  }
}

export const emptyState: UserState = { profile: null, draft: null, connections: {}, addedEventIds: [] };

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readUsers(): Record<string, StoredUser> {
  return readJson<Record<string, StoredUser>>(USERS_KEY, {});
}

function startSession(user: StoredUser): SessionUser {
  writeJson(SESSION_KEY, user.email);
  return { name: user.name, email: user.email };
}

export const api = {
  getSession(): SessionUser | null {
    const email = readJson<string | null>(SESSION_KEY, null);
    if (!email) return null;
    const user = readUsers()[email];
    return user ? { name: user.name, email: user.email } : null;
  },

  async signUp(name: string, rawEmail: string, password: string): Promise<SessionUser> {
    await wait(700);
    const email = rawEmail.trim().toLowerCase();
    const users = readUsers();
    if (users[email]) throw new ApiError('An account with this email already exists. Try logging in.', 'email');
    const user: StoredUser = { name: name.trim(), email, password };
    users[email] = user;
    writeJson(USERS_KEY, users);
    return startSession(user);
  },

  async logIn(rawEmail: string, password: string): Promise<SessionUser> {
    await wait(650);
    const email = rawEmail.trim().toLowerCase();
    const user = readUsers()[email];
    if (!user) throw new ApiError('No account found with that email.', 'email');
    if (user.password !== password) throw new ApiError('Incorrect password. Try again.', 'password');
    return startSession(user);
  },

  async googleSignIn(): Promise<SessionUser> {
    await wait(900);
    const email = 'jordan.ellis@gmail.com';
    const users = readUsers();
    if (!users[email]) {
      users[email] = { name: 'Jordan Ellis', email, password: '' };
      writeJson(USERS_KEY, users);
    }
    return startSession(users[email]);
  },

  logOut(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  loadState(email: string): UserState {
    return { ...emptyState, ...readJson<Partial<UserState>>(stateKey(email), {}) };
  },

  persistState(email: string, state: UserState): boolean {
    if (writeJson(stateKey(email), state)) return true;
    // Storage full: drop the stored resume file and try again.
    const slim: UserState = {
      ...state,
      profile: state.profile ? { ...state.profile, resumeDataUrl: null } : null,
      draft: state.draft ? { ...state.draft, resumeDataUrl: null } : null
    };
    return writeJson(stateKey(email), slim);
  },

  async saveProfile(profile: Profile): Promise<Profile> {
    await wait(450);
    if (!profile.name.trim()) throw new ApiError('Your name can’t be empty.', 'name');
    return profile;
  },

  async syncCalendar(id: CalendarId): Promise<number> {
    await wait(1400);
    return calendarSources.find((s) => s.id === id)?.eventCount ?? 0;
  },

  async fetchEvents(): Promise<CampusEvent[]> {
    await wait(650);
    return events;
  }
};