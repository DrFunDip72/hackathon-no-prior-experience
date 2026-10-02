/**
 * A resume picked on the landing page, handed to onboarding so it can start reading right away.
 * Kept in memory only: it survives the in-app navigation to /onboarding, and a refresh simply
 * falls back to the normal resume step. Validation (PDF, 5 MB) happens where it is read.
 */
let pending: File | null = null;

export function setPendingResume(file: File): void {
  pending = file;
}

export function hasPendingResume(): boolean {
  return pending !== null;
}

/** Returns the waiting file once, then forgets it. */
export function takePendingResume(): File | null {
  const file = pending;
  pending = null;
  return file;
}
