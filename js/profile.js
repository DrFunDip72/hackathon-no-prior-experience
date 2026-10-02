/*
 * Doorway profile helpers: labels, option lists, parsing of pasted text,
 * role inference, the auto-written summary, and pitch filling.
 * Pure functions only. No DOM, no storage.
 */
(function (root) {
  'use strict';
  var D = (root.Doorway = root.Doorway || {});

  // ---- Option lists (ids are what we store, labels are what we show) ----
  var ROLE_OPTIONS = [
    { id: 'software-engineer', label: 'Software engineer', short: 'software engineer' },
    { id: 'product', label: 'Product manager', short: 'product' },
    { id: 'data', label: 'Data / analytics', short: 'data' },
    { id: 'design', label: 'Design', short: 'design' }
  ];
  var LOOKING_OPTIONS = [
    { id: 'full-time', label: 'Full-time after graduation', short: 'full-time' },
    { id: 'internship', label: 'Internship', short: 'internship' },
    { id: 'part-time', label: 'Part-time', short: 'part-time' }
  ];
  var STYLE_OPTIONS = [
    { id: 'early-stage', label: 'Early-stage startup', short: 'early-stage' },
    { id: 'growth-stage', label: 'Growth-stage company', short: 'growth-stage' },
    { id: 'established', label: 'Big established company', short: 'established' },
    { id: 'any', label: 'Show me all', short: 'any' }
  ];
  var VALUE_OPTIONS = ['Ownership', 'Learning fast', 'Mission', 'Work-life balance', 'Pay', 'Collaboration'].map(function (v) {
    return { id: v, label: v };
  });
  var EVENT_TYPE_OPTIONS = [
    { id: 'career-fair', label: 'Career fairs', singular: 'Career fair', plural: 'career fairs' },
    { id: 'hackathon', label: 'Hackathons', singular: 'Hackathon', plural: 'hackathons' },
    { id: 'club', label: 'Clubs', singular: 'Club', plural: 'club meetings' },
    { id: 'info-session', label: 'Info sessions', singular: 'Info session', plural: 'info sessions' },
    { id: 'lecture', label: 'Lectures', singular: 'Lecture', plural: 'lectures' },
    { id: 'alumni', label: 'Alumni panels', singular: 'Alumni panel', plural: 'alumni panels' }
  ];
  var SUGGESTED_COMPANIES = ['Neighbor', 'Redo', 'Waystar', 'Lucid'];

  function find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function roleLabel(id) { var o = find(ROLE_OPTIONS, id); return o ? o.label : String(id || ''); }
  function roleShort(id) { var o = find(ROLE_OPTIONS, id); return o ? o.short : String(id || '').replace(/-/g, ' '); }
  function typeSingular(id) { var o = find(EVENT_TYPE_OPTIONS, id); return o ? o.singular : 'Event'; }
  function typePlural(id) { var o = find(EVENT_TYPE_OPTIONS, id); return o ? o.plural : 'events'; }
  function optionLabel(list, id) { var o = find(list, id); return o ? o.label : String(id); }

  // "a, b and c"
  function joinList(items, word) {
    word = word || 'and';
    if (!items || !items.length) return '';
    if (items.length === 1) return String(items[0]);
    return items.slice(0, -1).join(', ') + ' ' + word + ' ' + items[items.length - 1];
  }

  // Split a comma / newline separated string into a clean, de-duplicated list.
  function parseList(str, maxItems, maxLen) {
    var seen = {};
    var out = [];
    String(str || '').split(/[,\n;]+/).forEach(function (raw) {
      var item = raw.replace(/\s+/g, ' ').trim().slice(0, maxLen || 40);
      var key = item.toLowerCase();
      if (item && !seen[key]) { seen[key] = true; out.push(item); }
    });
    return out.slice(0, maxItems || 20);
  }

  function firstName(profile) {
    var n = String((profile && profile.name) || '').trim();
    return n ? n.split(/\s+/)[0] : '';
  }
  function initials(profile) {
    var parts = String((profile && profile.name) || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    var a = parts[0].charAt(0);
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (a + b).toUpperCase();
  }

  // ---- Parsing pasted resume / bio text ----
  var KNOWN_SKILLS = [
    'JavaScript', 'TypeScript', 'Python', 'React', 'SQL', 'Java', 'C#', 'C++', 'AWS', 'Figma',
    'Node.js', 'HTML', 'CSS', 'Git', 'Docker', 'Kubernetes', 'GraphQL', 'PostgreSQL', 'MongoDB',
    'Swift', 'Kotlin', 'Ruby', 'PHP', 'Rust', 'Tableau', 'Excel', 'Pandas', 'TensorFlow',
    'PyTorch', 'Next.js', 'Vue', 'Angular', 'Flutter'
  ];
  // Words that are also normal English: only match them with the exact capitalization.
  var CASE_SENSITIVE_SKILLS = { React: true, Swift: true, Rust: true, Excel: true };

  function isWordChar(ch) { return /[a-z0-9_]/i.test(ch); }
  function hasToken(hay, needle) {
    var from = 0;
    var idx;
    while ((idx = hay.indexOf(needle, from)) !== -1) {
      var before = idx === 0 ? '' : hay.charAt(idx - 1);
      var after = hay.charAt(idx + needle.length);
      if (!(before && isWordChar(before)) && !(after && isWordChar(after))) return true;
      from = idx + 1;
    }
    return false;
  }
  function findSkills(text) {
    var lower = text.toLowerCase();
    return KNOWN_SKILLS.filter(function (skill) {
      return CASE_SENSITIVE_SKILLS[skill] ? hasToken(text, skill) : hasToken(lower, skill.toLowerCase());
    });
  }

  var NOT_A_NAME = /\b(computer|science|software|engineer|engineering|student|senior|junior|graduate|graduating|major|developer|designer|analyst|manager|data|design|product|university|college|looking|passionate|interested|excited|currently|studying|resume|linkedin)\b/i;

  function findName(text) {
    var m = /(?:[Mm]y name is|[Nn]ame:|\b[Ii]['’]m|\b[Ii] am)\s+([A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z'’\-]+){0,2})/.exec(text);
    if (m && !NOT_A_NAME.test(m[1])) return m[1].trim();
    // First line, minus Markdown heading or bold markers ("# Jordan Ellis", "**Jordan Ellis**").
    var first = text.split(/\r?\n/)[0].replace(/^[#>*_\s]+|[*_\s]+$/g, '');
    if (first.length <= 40 && /^[A-Z][A-Za-z'’\-]+(?:\s+[A-Z][A-Za-z.'’\-]+){1,3}$/.test(first) && !NOT_A_NAME.test(first)) return first;
    return '';
  }

  function parseAbout(text) {
    text = String(text || '');
    var email = /[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i.exec(text);
    var li = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?/i.exec(text);
    var linkedin = '';
    if (li) linkedin = /^https?:\/\//i.test(li[0]) ? li[0] : 'https://' + li[0];
    var major = /computer science|comp sci\b/i.test(text) || /\bCS\b/.test(text) ? 'Computer science' : '';
    return {
      name: findName(text),
      email: email ? email[0] : '',
      linkedin: linkedin,
      skills: findSkills(text),
      major: major
    };
  }

  // ---- Inferring a role from "what do you enjoy working on?" ----
  var ROLE_KEYWORDS = {
    'software-engineer': [/\bbuild/i, /\bcod(e|ing)/i, /\bprogram/i, /\bbackend/i, /\bfrontend/i, /\bsoftware/i, /\bapps?\b/i, /\bsystems?\b/i, /\bapi\b/i, /\bdebug/i, /\bengineer/i, /\balgorithm/i],
    'product': [/\bproduct/i, /\busers?\b/i, /\bcustomers?\b/i, /\bstrateg/i, /\broadmap/i, /\bprioriti/i, /\bvision/i, /\blaunch/i, /\bmarket/i, /\bdecid/i, /\bneeds?\b/i, /\bwhat to build/i, /\bproblems?\b/i],
    'data': [/\bdata/i, /\banaly/i, /\bstatist/i, /\bmachine learning/i, /\bml\b/i, /\bai\b/i, /\binsight/i, /\bchart/i, /\bdashboard/i, /\bsql\b/i, /\bmodel/i],
    'design': [/\bdesign/i, /\bui\b/i, /\bux\b/i, /\bvisual/i, /\bfigma/i, /\bprototyp/i, /\bcreative/i, /\bbrand/i, /\bsketch/i]
  };
  function inferRole(text) {
    var best = '';
    var bestScore = 0;
    ROLE_OPTIONS.forEach(function (opt) {
      var score = 0;
      ROLE_KEYWORDS[opt.id].forEach(function (re) { if (re.test(text)) score++; });
      if (score > bestScore) { bestScore = score; best = opt.id; }
    });
    return best;
  }

  // ---- Auto-written summary ----
  function buildSummary(p) {
    p = p || {};
    var lead = p.major ? p.major + ' senior' : 'Graduating senior';
    var looking = (p.lookingFor || []).map(function (id) { var o = find(LOOKING_OPTIONS, id); return o ? o.short : id; });
    var roles = (p.roles || []).map(roleShort);
    var styles = (p.companyStyle || []).filter(function (s) { return s !== 'any'; }).map(function (id) { var o = find(STYLE_OPTIONS, id); return o ? o.short : id; });

    var sentences = [];
    var what;
    if (looking.length || roles.length) {
      what = 'looking for ' + (looking.length ? joinList(looking, 'or') + ' ' : '') + (roles.length ? joinList(roles, 'or') + ' roles' : 'roles');
      if (styles.length) what += ' at ' + joinList(styles, 'or') + ' companies';
      sentences.push(lead + ' ' + what + '.');
    } else if (p.name || (p.skills && p.skills.length) || (p.values && p.values.length) || (p.targetCompanies && p.targetCompanies.length)) {
      sentences.push(lead + ' exploring options.');
    }
    if (p.skills && p.skills.length) sentences.push('Builds with ' + joinList(p.skills.slice(0, 4)) + '.');
    if (p.values && p.values.length) sentences.push('Values ' + joinList(p.values.map(function (v) { return v.toLowerCase(); })) + '.');
    if (p.targetCompanies && p.targetCompanies.length) sentences.push('Hoping to meet ' + joinList(p.targetCompanies.slice(0, 4)) + '.');
    if (!sentences.length) return 'Just getting started. Add a few details and Doorway will write your summary.';
    return sentences.join(' ');
  }

  // ---- Elevator pitch: fills {name} {role} {skills} ----
  function fillPitch(template, profile) {
    var p = profile || {};
    var role = p.roles && p.roles.length ? roleShort(p.roles[0]) : 'technical';
    var skills = p.skills && p.skills.length ? joinList(p.skills.slice(0, 2)) : 'a mix of tools I am happy to talk about';
    var values = {
      name: String(p.name || '').trim() || '[your name]',
      role: role,
      skills: skills
    };
    return String(template || '').replace(/\{(name|role|skills)\}/g, function (m, key) { return values[key]; });
  }

  // ---- Sanitizing a profile read from storage or built from answers ----
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max || 200) : ''; }
  function strList(v, max, maxLen) {
    if (!Array.isArray(v)) return [];
    return v.filter(function (x) { return typeof x === 'string' && x.trim(); })
      .map(function (x) { return x.slice(0, maxLen || 60); })
      .slice(0, max || 30);
  }
  function normalizeProfile(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var photo = typeof raw.photo === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(raw.photo) && raw.photo.length < 400000 ? raw.photo : '';
    var p = {
      name: str(raw.name, 80),
      email: str(raw.email, 120),
      linkedin: str(raw.linkedin, 200),
      photo: photo,
      summary: str(raw.summary, 600),
      roles: strList(raw.roles, 8),
      lookingFor: strList(raw.lookingFor, 8),
      companyStyle: strList(raw.companyStyle, 8),
      targetCompanies: strList(raw.targetCompanies, 30),
      values: strList(raw.values, 12),
      skills: strList(raw.skills, 40),
      visibleToEmployers: raw.visibleToEmployers === true
    };
    if (typeof raw.major === 'string') p.major = str(raw.major, 60);
    if (typeof raw.resumeFile === 'string') p.resumeFile = str(raw.resumeFile, 120);
    if (Array.isArray(raw.eventTypes)) p.eventTypes = strList(raw.eventTypes, 10);
    if (raw.demo === true) p.demo = true;
    return p;
  }

  D.profile = {
    ROLE_OPTIONS: ROLE_OPTIONS,
    LOOKING_OPTIONS: LOOKING_OPTIONS,
    STYLE_OPTIONS: STYLE_OPTIONS,
    VALUE_OPTIONS: VALUE_OPTIONS,
    EVENT_TYPE_OPTIONS: EVENT_TYPE_OPTIONS,
    SUGGESTED_COMPANIES: SUGGESTED_COMPANIES,
    KNOWN_SKILLS: KNOWN_SKILLS,
    roleLabel: roleLabel,
    roleShort: roleShort,
    typeSingular: typeSingular,
    typePlural: typePlural,
    optionLabel: optionLabel,
    joinList: joinList,
    parseList: parseList,
    firstName: firstName,
    initials: initials,
    parseAbout: parseAbout,
    inferRole: inferRole,
    buildSummary: buildSummary,
    fillPitch: fillPitch,
    normalizeProfile: normalizeProfile
  };
})(typeof window !== 'undefined' ? window : globalThis);
