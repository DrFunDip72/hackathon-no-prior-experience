import type { EmployerAccount, EmployerQuery, EmployerRole } from '../types/employer';
import { newId } from './text';

/**
 * The recruiter's demo account and their saved roles (searches), kept in this browser. Separate from the
 * student session (SessionContext) on purpose: signing in as an employer never creates a student account.
 */

const ACCOUNT_KEY = 'doorway_employer_account';
const ROLES_KEY = 'doorway_employer_roles';
/** Before roles: one saved search. Read once and migrated into the role list. */
const LEGACY_SEARCH_KEY = 'doorway_employer_search';

interface RoleState {
  roles: EmployerRole[];
  activeId: string | null;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);else
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: kept for this page only */
  }
}

function makeRole(query: EmployerQuery): EmployerRole {
  return { id: newId('role_'), createdAt: new Date().toISOString(), query };
}

function load(): RoleState {
  const saved = read<RoleState>(ROLES_KEY);
  if (saved && Array.isArray(saved.roles)) return saved;
  const legacy = read<EmployerQuery>(LEGACY_SEARCH_KEY);
  if (!legacy) return { roles: [], activeId: null };
  const role = makeRole(legacy);
  const state = { roles: [role], activeId: role.id };
  write(ROLES_KEY, state);
  write(LEGACY_SEARCH_KEY, null);
  return state;
}

const save = (state: RoleState) => write(ROLES_KEY, state);

/** `/employer/matches?role=new` opens the "+ New role" tab. */
export const NEW_ROLE = 'new';

/** The matches page, on a given role's tab (or the "+ New role" tab with NEW_ROLE). */
export const matchesHref = (roleId?: string | null) => roleId ? `/employer/matches?role=${roleId}` : '/employer/matches';

export const employerStore = {
  account: () => read<EmployerAccount>(ACCOUNT_KEY),
  saveAccount: (account: EmployerAccount | null) => write(ACCOUNT_KEY, account),

  roles: (): EmployerRole[] => load().roles,
  role: (id: string | null | undefined): EmployerRole | null => id ? load().roles.find((r) => r.id === id) ?? null : null,
  /** The tab last open, falling back to the newest role. */
  activeRole: (): EmployerRole | null => {
    const { roles, activeId } = load();
    return roles.find((r) => r.id === activeId) ?? roles[roles.length - 1] ?? null;
  },
  setActive: (id: string) => {
    const state = load();
    if (state.activeId !== id) save({ ...state, activeId: id });
  },
  /** Saves a new role as the last tab and makes it active. */
  addRole: (query: EmployerQuery): EmployerRole => {
    const state = load();
    const role = makeRole(query);
    save({ roles: [...state.roles, role], activeId: role.id });
    return role;
  },
  /** Removes a role; returns its old position so an undo can put it back where it was. */
  removeRole: (id: string): number => {
    const state = load();
    const index = state.roles.findIndex((r) => r.id === id);
    if (index === -1) return -1;
    const roles = state.roles.filter((r) => r.id !== id);
    const activeId = state.activeId === id ? (roles[Math.min(index, roles.length - 1)]?.id ?? null) : state.activeId;
    save({ roles, activeId });
    return index;
  },
  restoreRole: (role: EmployerRole, index: number) => {
    const state = load();
    if (state.roles.some((r) => r.id === role.id)) return;
    const roles = [...state.roles];
    roles.splice(Math.max(0, Math.min(index, roles.length)), 0, role);
    save({ roles, activeId: role.id });
  }
};
