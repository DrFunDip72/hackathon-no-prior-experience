export function splitList(value: string): string[] {
  return value.
  split(/[,\n]/).
  map((item) => item.trim()).
  filter(Boolean);
}

export function joinList(items: string[]): string {
  return items.join(', ');
}

export function unique(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getInitials(name: string): string {
  const parts = name.replace(/^dr\.\s*/i, '').trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function containsWord(haystack: string, needle: string): boolean {
  if (!needle.trim()) return false;
  return new RegExp(`(^|\\W)${escapeRegExp(needle.trim())}($|\\W)`, 'i').test(haystack);
}

/** Loose, word-aware match between two short terms ("UX" ~ "UX research"). */
export function termMatch(a: string, b: string): boolean {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return false;
  return x === y || containsWord(x, y) || containsWord(y, x);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function newId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}