/*
 * Doorway matching. A plain function, easy to read and change.
 *
 * Rules (from the product spec):
 *   +3  for each company on the student's list that is attending
 *   +2  if the event's roles include the student's target role
 *   +1  if the event is startup friendly and the student prefers
 *       early-stage or growth-stage companies
 *   +1  if the event type is one the student likes
 *
 *   Score 5 or more  -> "Strong match"
 *   Score 2 to 4     -> "Good fit"
 *   Below 2          -> "Might be worth it"
 *
 * The "why" text is built only from the rules that actually fired.
 */
(function (root) {
  'use strict';
  var D = (root.Doorway = root.Doorway || {});

  var POINTS = { company: 3, role: 2, startup: 1, type: 1 };
  var STRONG_AT = 5;
  var GOOD_AT = 2;
  var STARTUP_STYLES = ['early-stage', 'growth-stage'];

  function P() { return D.profile; }
  function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

  // Event types a student is assumed to like when they have not picked any:
  // inferred from what they are looking for.
  function defaultEventTypes(profile) {
    var out = [];
    (profile.lookingFor || []).forEach(function (kind) {
      var types = {
        'full-time': ['career-fair', 'info-session', 'alumni'],
        'internship': ['career-fair', 'info-session', 'hackathon'],
        'part-time': ['club', 'info-session']
      }[kind] || [];
      types.forEach(function (t) { if (out.indexOf(t) === -1) out.push(t); });
    });
    return out;
  }
  function preferredEventTypes(profile) {
    profile = profile || {};
    return Array.isArray(profile.eventTypes) ? profile.eventTypes : defaultEventTypes(profile);
  }

  function isMyCompany(company, profile) {
    var key = norm(company);
    return ((profile && profile.targetCompanies) || []).some(function (c) { return norm(c) === key; });
  }

  function levelFor(score) {
    if (score >= STRONG_AT) return { level: 'strong', label: 'Strong match' };
    if (score >= GOOD_AT) return { level: 'good', label: 'Good fit' };
    return { level: 'maybe', label: 'Might be worth it' };
  }

  /**
   * Score one event for one profile.
   * Returns { score, level, label, headline, why, reasons[], matchedCompanies[] }
   */
  function scoreEvent(event, profile) {
    var p = profile || {};
    var reasons = [];

    // Rule 1: +3 per company on the student's list that is attending
    var seen = {};
    var matched = (event.companies || []).filter(function (c) {
      var k = norm(c);
      if (seen[k]) return false;
      seen[k] = true;
      return isMyCompany(c, p);
    });
    if (matched.length) {
      reasons.push({
        rule: 'company',
        points: POINTS.company * matched.length,
        text: P().joinList(matched) + (matched.length > 1 ? ' are' : ' is') + ' on your list'
      });
    }

    // Rule 2: +2 if the event's roles include the student's target role
    var roleHits = (event.roles || []).filter(function (r) { return (p.roles || []).indexOf(r) !== -1; });
    if (roleHits.length) {
      reasons.push({
        rule: 'role',
        points: POINTS.role,
        text: 'Aimed at ' + P().joinList(roleHits.map(P().roleShort)) + ' roles, which you want'
      });
    }

    // Rule 3: +1 if startup friendly and the student prefers early or growth stage
    var likesStartups = (p.companyStyle || []).some(function (s) { return STARTUP_STYLES.indexOf(s) !== -1; });
    if (event.startupFriendly && likesStartups) {
      reasons.push({
        rule: 'startup',
        points: POINTS.startup,
        text: 'Startup friendly, and you prefer early-stage or growth-stage companies'
      });
    }

    // Rule 4: +1 for the student's preferred event types
    if (preferredEventTypes(p).indexOf(event.type) !== -1) {
      reasons.push({
        rule: 'type',
        points: POINTS.type,
        text: 'You like ' + P().typePlural(event.type)
      });
    }

    var score = reasons.reduce(function (sum, r) { return sum + r.points; }, 0);
    var lvl = levelFor(score);

    return {
      score: score,
      level: lvl.level,
      label: lvl.label,
      headline: headline(lvl.label, reasons, matched, roleHits),
      why: why(reasons),
      reasons: reasons,
      matchedCompanies: matched
    };
  }

  // The one-line match text shown on cards, built from the strongest rule that fired.
  function headline(label, reasons, matched, roleHits) {
    var top = reasons.length ? reasons[0].rule : '';
    if (top === 'company') {
      return label + ': ' + (matched.length > 1
        ? matched.length + ' of your companies will be there'
        : matched[0] + ' will be there');
    }
    if (top === 'role') return label + ' for ' + P().roleShort(roleHits[0]) + ' roles';
    if (top === 'startup') return label + ': a startup-friendly crowd';
    if (top === 'type') return label + ': you like this kind of event';
    return label + ': nothing on your profile lines up yet';
  }

  function why(reasons) {
    if (!reasons.length) return 'Nothing on your profile overlaps with this event yet, so it is a stretch.';
    return reasons.map(function (r) { return r.text + ' (+' + r.points + ')'; }).join('. ') + '.';
  }

  function dayKey(iso) {
    // ISO strings without a zone are parsed as local time by Date.
    var d = new Date(iso);
    return isNaN(d) ? '' : d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  /**
   * Sort by date (day), then by match (best first), then by start time.
   * Returns [{ event, match }].
   */
  function rankEvents(events, profile) {
    return (events || []).map(function (event) {
      return { event: event, match: scoreEvent(event, profile) };
    }).sort(function (a, b) {
      var da = dayKey(a.event.start);
      var db = dayKey(b.event.start);
      if (da !== db) return da < db ? -1 : 1;
      if (a.match.score !== b.match.score) return b.match.score - a.match.score;
      return new Date(a.event.start) - new Date(b.event.start);
    });
  }

  D.match = {
    POINTS: POINTS,
    STRONG_AT: STRONG_AT,
    GOOD_AT: GOOD_AT,
    scoreEvent: scoreEvent,
    rankEvents: rankEvents,
    isMyCompany: isMyCompany,
    preferredEventTypes: preferredEventTypes,
    dayKey: dayKey
  };
})(typeof window !== 'undefined' ? window : globalThis);
