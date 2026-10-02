// Company aliases: lowercase variant -> canonical name. Extend as needed.
const ALIASES = {
  'redo tech': 'Redo',
  'redo inc': 'Redo',
  'neighbor.com': 'Neighbor',
  'waystar health': 'Waystar',
  'qualtrics xm': 'Qualtrics',
  'microsoft corporation': 'Microsoft',
  'adobe inc': 'Adobe',
  'domo inc': 'Domo',
  // Graduate programs listed under two spellings
  'duke university pratt school of engineering grad school': 'Duke Pratt School of Engineering',
  'duke university pratt school of engineering graduate school': 'Duke Pratt School of Engineering'
};

// "Disney College Program - Networking Readiness" is one employer with an event subtitle.
const stripSubtitle = (name) => name.replace(/\s+-\s+.*$/, '');

export function canonicalCompany(name) {
  const trimmed = stripSubtitle(String(name ?? '').trim());
  return ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

// Lowercase key used for case-insensitive comparison.
export const companyKey = (name) => canonicalCompany(name).toLowerCase();

// Graduate schools and degree programs recruit for admissions, not jobs, so they are kept out of `companies`.
export const isProgram = (name) => /university|grad school|graduate school|mscf/i.test(name);

export const aliasesFor = (canonical) => Object.entries(ALIASES).filter(([, c]) => c === canonical).map(([alias]) => alias);

export const sortNames = (names) => [...names].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
