// Keyword fallback for type/companies/fields, used when no LLM is in the loop (e.g. the BYU calendar ingest).
// Cheap and conservative: only names companies from KNOWN_COMPANIES, never guesses.
export const KNOWN_COMPANIES = [
  'Redo', 'Neighbor', 'Waystar', 'Qualtrics', 'Adobe', 'Domo', 'Microsoft', 'Lucid', 'Podium', 'Entrata',
  'Instructure', 'Google', 'Amazon', 'Meta', 'Apple', 'Deloitte', 'Goldman Sachs', 'Nu Skin', 'Northrop Grumman',
  'Ancestry', 'Pluralsight', 'Vivint', 'Overstock', 'Health Catalyst', 'Intel', 'Nvidia', 'Oracle', 'Salesforce'
];

const TYPE_RULES = [
  ['hackathon', /hackathon|hack-a-thon/i],
  ['career_fair', /\b(career|job|internship|grad(uate)? school) (fair|expo)\b/i],
  ['case_competition', /case (competition|challenge)/i],
  ['info_session', /info(rmation)? session|recruiting (event|session)|employer (panel|session)/i],
  ['networking', /networking|recruiting dinner|meet (the|and greet)|alumni panel/i],
  ['tabling', /tabling|office hours/i],
  ['lecture', /lecture|speaker|seminar|tech talk|colloquium|devotional/i]
];

const FIELD_RULES = [
  ['software engineering', /software|engineer|programming|coding|hackathon|developer/i],
  ['data', /\bdata\b|analytics|machine learning|\bai\b|statistics/i],
  ['product', /product (management|manager|design)|\bpm\b|\bux\b/i],
  ['consulting', /consulting|case interview/i],
  ['finance', /finance|investment|banking/i]
];

// "Programs at 7:00 and 7:30 PM." matches \bpm\b (meant for the Product Manager abbreviation) just
// as well as a real PM mention does. Strip clock times before field classification so an evening
// FHE activity doesn't get tagged "product" alongside every genuine product-management event.
const TIME_OF_DAY_RE = /\b\d{1,2}([:.]\d{2})?\s*([ap])\.?\s?m\.?\b/gi;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function classify(title, description = '') {
  const text = `${title} ${description}`;
  const fieldText = text.replace(TIME_OF_DAY_RE, ' ');
  const type = TYPE_RULES.find(([, re]) => re.test(text))?.[0] ?? 'other';
  const companies = KNOWN_COMPANIES.filter((c) => new RegExp(`\\b${escape(c)}\\b`, 'i').test(text));
  const fields = FIELD_RULES.filter(([, re]) => re.test(fieldText)).map(([f]) => f);
  return { type, companies, fields };
}
