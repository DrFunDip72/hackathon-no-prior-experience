import type { EmployerAccount, EmployerQuery } from '../types/employer';

/**
 * The recruiter's demo account and their latest search, kept in this browser. Separate from the
 * student session (SessionContext) on purpose: signing in as an employer never creates a student account.
 */

const ACCOUNT_KEY = 'doorway_employer_account';
const SEARCH_KEY = 'doorway_employer_search';

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

export const employerStore = {
  account: () => read<EmployerAccount>(ACCOUNT_KEY),
  saveAccount: (account: EmployerAccount | null) => write(ACCOUNT_KEY, account),
  search: () => read<EmployerQuery>(SEARCH_KEY),
  saveSearch: (query: EmployerQuery | null) => write(SEARCH_KEY, query)
};
