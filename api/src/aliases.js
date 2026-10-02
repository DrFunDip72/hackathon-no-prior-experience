// Company aliases: lowercase variant -> canonical name. Extend as needed.
const ALIASES = {
  'redo tech': 'Redo',
  'redo inc': 'Redo',
  'neighbor.com': 'Neighbor',
  'waystar health': 'Waystar',
  'qualtrics xm': 'Qualtrics',
  'microsoft corporation': 'Microsoft',
  'adobe inc': 'Adobe',
  'domo inc': 'Domo'
};

export function canonicalCompany(name) {
  const trimmed = String(name ?? '').trim();
  return ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

// Lowercase key used for case-insensitive comparison.
export const companyKey = (name) => canonicalCompany(name).toLowerCase();
