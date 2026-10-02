const KEY = 'cc_landing_prompt';

export function saveLandingPrompt(value: string): void {
  try {
    if (value.trim()) localStorage.setItem(KEY, value.trim());
  } catch {

    /* storage unavailable */}
}

export function takeLandingPrompt(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function clearLandingPrompt(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {

    /* storage unavailable */}
}