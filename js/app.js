/*
 * Doorway screens and router.
 *   #/                    landing
 *   #/onboarding          chat walkthrough that builds the profile
 *   #/profile             editable profile (+ ?welcome=1 after onboarding)
 *   #/home                "Your week": matched events, who to talk to, timeline
 *   #/events/<id>         one event in full
 *   #/employers/preview   phase-two preview of what an employer would see
 *
 * There is no sign-in anywhere: everything stays in this browser (see js/api.js).
 */
(function (root) {
  'use strict';
  var D = root.Doorway;
  var api = D.api;
  var P = D.profile;
  var M = D.match;
  var ICS = D.ics;
  var ui = D.ui;
  var h = ui.h;

  var app = document.getElementById('app');
  var renderToken = 0;
  var firstRender = true;

  // ---------- Router ----------

  var ROUTES = [
    { re: /^\/$/, view: viewLanding, title: 'Find who you need to find', name: 'landing' },
    { re: /^\/onboarding$/, view: viewOnboarding, title: 'Get started', name: 'onboarding' },
    { re: /^\/profile$/, view: viewProfile, title: 'Your profile', name: 'profile' },
    { re: /^\/home$/, view: viewHome, title: 'Your week', name: 'home' },
    { re: /^\/events\/([^/]+)$/, view: viewEvent, title: 'Event', name: 'event' },
    { re: /^\/employers\/preview$/, view: viewEmployer, title: 'Employer preview', name: 'employers' }
  ];

  function parseHash() {
    var raw = root.location.hash.replace(/^#/, '') || '/';
    var q = raw.indexOf('?');
    return {
      path: q === -1 ? raw : raw.slice(0, q),
      query: new URLSearchParams(q === -1 ? '' : raw.slice(q + 1))
    };
  }

  function go(path) {
    if (root.location.hash === '#' + path) render();
    else root.location.hash = path;
  }

  async function render() {
    var token = ++renderToken;
    var loc = parseHash();
    var route = null;
    var match = null;
    for (var i = 0; i < ROUTES.length; i++) {
      match = ROUTES[i].re.exec(loc.path);
      if (match) { route = ROUTES[i]; break; }
    }
    document.body.setAttribute('data-route', route ? route.name : 'missing');
    markNav(loc.path);
    ui.clear(app);
    app.appendChild(h('p', { class: 'loading', text: 'Loading…' }));

    var node;
    try {
      node = route ? await route.view(match, loc.query) : viewMissing();
    } catch (err) {
      if (root.console) console.error(err);
      node = stateBox('Something went wrong', (err && err.message) || 'Please try again.', [
        h('a', { class: 'btn primary', href: '#/', text: 'Back to start' })
      ]);
    }
    if (token !== renderToken) return; // a newer navigation already won

    ui.clear(app);
    app.appendChild(node);
    document.title = (route ? route.title : 'Not found') + ' · Doorway';
    updateFooter();
    if (!firstRender) {
      root.scrollTo(0, 0);
      var heading = app.querySelector('h1');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    }
    firstRender = false;
  }

  function markNav(path) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      var target = a.getAttribute('data-nav');
      var on = path === target || (target === '/home' && path.indexOf('/events/') === 0);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function updateFooter() {
    var note = document.getElementById('sample-note');
    if (note) note.hidden = Boolean(root.DOORWAY_EVENTS_API_URL) && !D.usingSampleFallback;
  }

  // Events come from the live feed when one is configured. If it fails, the user can
  // switch to the bundled sample events for the rest of the visit.
  function loadEvents() {
    return api.getEvents({ useSample: D.usingSampleFallback === true });
  }

  // ---------- Shared bits ----------

  async function tryDemo() {
    await api.loadDemoProfile();
    ui.toast('Demo profile loaded: meet Jordan, a CS senior');
    go('/home');
  }

  function startActions() {
    return [
      h('a', { class: 'btn primary', href: '#/onboarding', text: 'Get started' }),
      h('button', { class: 'btn', type: 'button', text: 'Try the demo', onclick: tryDemo })
    ];
  }

  function stateBox(title, body, actions) {
    return h('section', { class: 'page state' },
      h('h1', { text: title }),
      h('p', { class: 'muted', text: body }),
      actions && actions.length ? h('div', { class: 'cta center' }, actions) : null);
  }

  function avatar(profile) {
    return h('div', { class: 'avatar', 'aria-hidden': 'true' },
      profile.photo ? h('img', { src: profile.photo, alt: '' }) : P.initials(profile));
  }

  function tagList(items, emptyText) {
    if (!items || !items.length) return h('span', { class: 'muted', text: emptyText || 'Not set' });
    return h('div', { class: 'tags' }, items.map(function (t) { return h('span', { class: 'tag', text: t }); }));
  }

  function lookingLabels(p) {
    return p.lookingFor.map(function (id) { return P.optionLabel(P.LOOKING_OPTIONS, id); });
  }
  function styleLabels(p) {
    return p.companyStyle.map(function (id) { return P.optionLabel(P.STYLE_OPTIONS, id); });
  }

  function headline(p) {
    var bits = [];
    if (p.roles.length) bits.push(P.joinList(p.roles.map(P.roleLabel), 'or'));
    if (p.lookingFor.length) bits.push(P.joinList(lookingLabels(p), 'or'));
    return bits.join(' · ');
  }

  function eventHref(ev) { return '#/events/' + encodeURIComponent(ev.id); }

  function byStartDesc(a, b) { return new Date(b.start) - new Date(a.start); }

  // ---------- Landing ----------

  async function viewLanding() {
    var profile = await api.getProfile();
    var first = profile ? P.firstName(profile) : '';

    function step(n, title, body) {
      return h('div', { class: 'step card' },
        h('span', { class: 'n', text: String(n) }),
        h('h3', { text: title }),
        h('p', { text: body }));
    }

    return h('div', { class: 'landing' },
      h('section', { class: 'hero' },
        h('p', { class: 'eyebrow', text: 'For BYU computer science seniors' }),
        h('h1', { text: 'Find who you need to find.' }),
        h('p', { class: 'lede', text: 'Doorway turns scattered campus events into a personal plan: where to be this week, who to talk to when you get there, and what to say.' }),
        h('div', { class: 'cta' },
          h('a', { class: 'btn primary lg', href: '#/onboarding', text: 'Get started' }),
          h('button', { class: 'btn lg', type: 'button', text: 'Try the demo', onclick: tryDemo })),
        profile ? h('p', { class: 'welcome-back' },
          'Welcome back' + (first ? ', ' + first : '') + '. ',
          h('a', { href: '#/home', text: 'Go to your week →' })) : null),
      h('section', { class: 'steps', 'aria-label': 'How it works' },
        step(1, 'Tell us about you', 'Paste a resume or LinkedIn link, or just chat for a minute. No forms.'),
        step(2, 'See where to be this week', 'Career fairs, club nights, info sessions and hackathons, filtered to your goals and your companies.'),
        step(3, 'Know who to talk to', 'Every event comes with the people to look for, questions to ask, and a pitch written for you.')),
      h('section', { class: 'why' },
        h('h2', { text: 'Why not just apply?' }),
        h('p', { text: 'Anyone can auto-apply to hundreds of jobs now, so almost nobody hears back. What still works is a real conversation with someone inside the company: a referral, an introduction, a person who remembers you.' }),
        h('p', { text: 'Those conversations happen at career fairs, club nights, info sessions and hackathons. The trouble is that they are scattered across dozens of campus websites. Doorway puts them in one place and gets you ready for each one.' })));
  }

  // ---------- Onboarding (chat) ----------

  function viewOnboarding() {
    var answers = {};
    var parsed = { name: '', email: '', linkedin: '', skills: [], major: '' };
    var pos = -1;
    var finished = false;

    function knownName() { return P.firstName({ name: answers.name || parsed.name }); }

    var STEPS = [
      {
        id: 'about', kind: 'about',
        ask: function () {
          return "Hi! I'm Doorway. Paste your resume or LinkedIn link, or just tell me about yourself.\n\nYou can also skip this and answer a few quick questions instead.";
        },
        after: function (v) {
          if (v && v.file) {
            answers.resumeFile = v.file;
            return "Thanks! I can't read files in this prototype yet, so I'll ask a few quick questions instead.";
          }
          if (!v) return '';
          parsed = P.parseAbout(v);
          var found = [];
          if (parsed.name) found.push('your name');
          if (parsed.skills.length) {
            found.push(parsed.skills.length + (parsed.skills.length === 1 ? ' skill' : ' skills') + ' (' +
              parsed.skills.slice(0, 3).join(', ') + (parsed.skills.length > 3 ? ', …' : '') + ')');
          }
          if (parsed.linkedin) found.push('your LinkedIn');
          if (parsed.email) found.push('your email');
          return found.length
            ? 'Got it. I picked up ' + P.joinList(found) + '. A few quick questions to fill in the rest.'
            : "Thanks! I'll ask a few quick questions to fill in the rest.";
        }
      },
      {
        id: 'name', kind: 'text', placeholder: 'First and last name',
        when: function () { return !parsed.name; },
        ask: function () { return 'What should I call you?'; }
      },
      {
        id: 'role', kind: 'chips',
        options: P.ROLE_OPTIONS.concat([{ id: 'unsure', label: 'Not sure yet' }]),
        ask: function () {
          var n = knownName();
          return (n ? 'Nice to meet you, ' + n + '. ' : '') + 'What kind of role are you after?';
        }
      },
      {
        id: 'enjoy', kind: 'text', placeholder: 'Building apps, working with customers, digging into data…',
        when: function () { return answers.role === 'unsure'; },
        ask: function () { return 'No problem. What do you enjoy working on?'; },
        after: function (v) {
          answers.inferredRole = v ? (P.inferRole(v) || 'software-engineer') : '';
          return answers.inferredRole
            ? 'Sounds like ' + P.roleShort(answers.inferredRole) + ' work could be a good fit. I will start there, and you can change it on your profile.'
            : 'No worries. You can pick a role on your profile later.';
        }
      },
      { id: 'lookingFor', kind: 'chips', options: P.LOOKING_OPTIONS, ask: function () { return 'What are you looking for?'; } },
      { id: 'style', kind: 'chips', options: P.STYLE_OPTIONS, ask: function () { return 'What kind of company sounds right?'; } },
      { id: 'companies', kind: 'companies', ask: function () { return 'Any companies on your list? Separate them with commas, or tap a suggestion.'; } },
      { id: 'values', kind: 'multi', options: P.VALUE_OPTIONS, ask: function () { return 'What matters most to you in a team? Pick as many as you like.'; } },
      {
        id: 'visible', kind: 'chips',
        options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'Not yet' }],
        ask: function () { return 'Last one. Want employers to be able to find your profile? You can change this any time.'; }
      }
    ];

    function visible(s) { return !s.when || s.when(); }

    var fill = h('div', { class: 'progress-fill' });
    var progress = h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Profile setup progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, fill);
    var log = h('div', { class: 'msgs', role: 'log', 'aria-live': 'polite' });
    var composer = h('div', { class: 'wrap composer-inner' });
    var view = h('section', { class: 'chat' },
      h('h1', { class: 'sr', text: 'Set up your profile' }),
      progress,
      log,
      h('div', { class: 'composer' }, composer));

    function scrollDown() {
      if (view.isConnected) root.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }

    function say(who, text, extra) {
      var el = h('div', { class: 'msg ' + who + (extra ? ' ' + extra : ''), text: text });
      log.appendChild(el);
      scrollDown();
      return el;
    }

    function typing(then) {
      var dots = h('div', { class: 'msg bot typing', 'aria-label': 'Doorway is typing' }, h('span'), h('span'), h('span'));
      log.appendChild(dots);
      scrollDown();
      setTimeout(function () { dots.remove(); then(); }, 500);
    }

    function setProgress(done) {
      var vis = STEPS.filter(visible);
      var count = vis.filter(function (s) { return STEPS.indexOf(s) < pos; }).length;
      var pct = done ? 100 : Math.round((count / vis.length) * 100);
      fill.style.width = pct + '%';
      progress.setAttribute('aria-valuenow', String(pct));
    }

    function nextStep() {
      for (var i = pos + 1; i < STEPS.length; i++) {
        if (visible(STEPS[i])) { pos = i; return STEPS[i]; }
      }
      pos = STEPS.length;
      return null;
    }

    function ask() {
      if (!view.isConnected && pos > -1) return; // the user left the page
      var s = nextStep();
      setProgress(false);
      if (!s) { finish(); return; }
      typing(function () {
        say('bot', s.ask());
        renderComposer(s);
      });
    }

    function answer(s, value, display) {
      answers[s.id] = value;
      ui.clear(composer);
      if (display == null) say('user', 'Skipped', 'skipped');
      else say('user', display);
      var follow = s.after ? s.after(value) : '';
      if (follow) typing(function () { say('bot', follow); ask(); });
      else ask();
    }

    function renderComposer(s) {
      ui.clear(composer);
      var skip = h('button', { class: 'btn ghost small', type: 'button', text: 'Skip', onclick: function () { answer(s, null, null); } });

      if (s.kind === 'chips') {
        composer.appendChild(h('div', { class: 'chips', role: 'group', 'aria-label': 'Quick replies' }, s.options.map(function (o) {
          return h('button', { class: 'chip', type: 'button', text: o.label, onclick: function () { answer(s, o.id, o.label); } });
        })));
        composer.appendChild(h('div', { class: 'row end' }, skip));
      } else if (s.kind === 'multi') {
        var picked = [];
        var cont = h('button', { class: 'btn primary', type: 'button', text: 'Continue', disabled: true, onclick: function () {
          answer(s, picked.slice(), P.joinList(picked));
        } });
        composer.appendChild(h('div', { class: 'chips', role: 'group', 'aria-label': 'Pick any' }, s.options.map(function (o) {
          return h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', text: o.label, onclick: function (e) {
            var i = picked.indexOf(o.id);
            if (i === -1) picked.push(o.id);
            else picked.splice(i, 1);
            e.currentTarget.setAttribute('aria-pressed', String(i === -1));
            cont.disabled = picked.length === 0;
          } });
        })));
        composer.appendChild(h('div', { class: 'row end' }, skip, cont));
      } else {
        var multiline = s.kind === 'about';
        var field = multiline
          ? h('textarea', { rows: '3', 'aria-label': 'Your answer', placeholder: 'Paste resume text or a LinkedIn link, or write a few sentences about you' })
          : h('input', { type: 'text', 'aria-label': 'Your answer', placeholder: s.placeholder || 'Type your answer', autocomplete: s.id === 'name' ? 'name' : 'off' });
        var submit = function () {
          var v = field.value.trim();
          if (!v) { field.focus(); return; }
          if (s.kind === 'companies') {
            var list = P.parseList(v);
            answer(s, list, P.joinList(list));
          } else {
            answer(s, v, v.length > 240 ? v.slice(0, 240) + '…' : v);
          }
        };
        field.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); }
        });

        if (s.kind === 'companies') {
          composer.appendChild(h('div', { class: 'chips', role: 'group', 'aria-label': 'Suggested companies' }, P.SUGGESTED_COMPANIES.map(function (c) {
            return h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', text: c, onclick: function (e) {
              var list = P.parseList(field.value);
              var i = -1;
              list.forEach(function (x, j) { if (x.toLowerCase() === c.toLowerCase()) i = j; });
              if (i === -1) list.push(c);
              else list.splice(i, 1);
              field.value = list.join(', ');
              e.currentTarget.setAttribute('aria-pressed', String(i === -1));
            } });
          })));
        }

        composer.appendChild(h('div', { class: 'row' }, field,
          h('button', { class: 'btn primary', type: 'button', text: 'Send', onclick: submit })));

        var extras = [];
        if (s.kind === 'about') {
          var file = h('input', { type: 'file', accept: '.pdf,.doc,.docx', class: 'sr', tabindex: '-1', 'aria-hidden': 'true' });
          file.addEventListener('change', function () {
            var f = file.files && file.files[0];
            if (f) answer(s, { file: f.name.slice(0, 120) }, 'Attached ' + f.name.slice(0, 120));
          });
          extras.push(file, h('button', { class: 'btn small', type: 'button', text: 'Upload resume', onclick: function () { file.click(); } }));
          extras.push(h('span', { class: 'hint', text: 'Ctrl + Enter to send' }));
        }
        composer.appendChild(h('div', { class: 'row between' }, h('div', { class: 'row' }, extras), skip));
      }

      var first = composer.querySelector('textarea, input[type="text"], .chip');
      if (first) first.focus({ preventScroll: true });
      scrollDown();
    }

    function buildProfile() {
      var role = answers.role && answers.role !== 'unsure' ? answers.role : answers.inferredRole;
      var p = {
        name: answers.name || parsed.name || '',
        email: parsed.email || '',
        linkedin: parsed.linkedin || '',
        photo: '',
        major: parsed.major || '',
        roles: role ? [role] : [],
        lookingFor: answers.lookingFor ? [answers.lookingFor] : [],
        companyStyle: answers.style ? [answers.style] : [],
        targetCompanies: answers.companies || [],
        values: answers.values || [],
        skills: parsed.skills || [],
        resumeFile: answers.resumeFile || '',
        visibleToEmployers: answers.visible === 'yes'
      };
      p.summary = P.buildSummary(p);
      return p;
    }

    async function finish() {
      if (finished) return;
      finished = true;
      setProgress(true);
      ui.clear(composer);
      say('bot', 'Building your profile…', 'working');
      try {
        await api.saveProfile(buildProfile());
      } catch (err) {
        say('bot', 'Sorry, I could not save your profile: ' + ((err && err.message) || 'unknown error') + ' Try the demo instead?');
        composer.appendChild(h('div', { class: 'row' }, startActions()));
        return;
      }
      setTimeout(function () { if (view.isConnected) go('/profile?welcome=1'); }, 1500);
    }

    setTimeout(ask, 150);
    return view;
  }

  // ---------- Profile ----------

  async function viewProfile(match, query) {
    var profile = await api.getProfile();
    if (!profile) {
      return stateBox('No profile yet', 'Set one up in about a minute, or look around with the demo student.', startActions());
    }
    var page = h('div', { class: 'page profile' });
    var editing = false;
    var welcome = query.get('welcome') === '1';

    function draw() {
      ui.clear(page);
      page.appendChild(editing ? editView() : readView());
    }

    function fact(label, value) {
      return [h('dt', { text: label }), h('dd', null, value)];
    }

    function linksValue() {
      var items = [];
      var li = ui.safeUrl(profile.linkedin);
      if (li) items.push(h('a', { href: li, target: '_blank', rel: 'noopener noreferrer', text: 'LinkedIn profile' }));
      if (profile.resumeFile) items.push(h('span', { text: 'Resume: ' + profile.resumeFile }));
      if (!items.length) return h('span', { class: 'muted', text: 'Not set' });
      return h('div', { class: 'stack' }, items);
    }

    function visibilitySwitch() {
      var input = h('input', { type: 'checkbox', id: 'vis' });
      input.checked = profile.visibleToEmployers;
      input.addEventListener('change', async function () {
        profile.visibleToEmployers = input.checked;
        await api.saveProfile(profile);
        ui.toast(input.checked ? 'Employers can now find your profile' : 'Your profile is hidden from employers');
      });
      return h('label', { class: 'switch', for: 'vis' },
        h('span', null,
          h('strong', { text: 'Let employers find my profile' }),
          h('small', { text: 'When on, employers can see your profile and the events you attend. You can turn this off any time.' })),
        input);
    }

    function readView() {
      return h('div', null,
        welcome ? h('div', { class: 'banner good', role: 'status' },
          h('strong', { text: "That was it. You're set." }), ' ',
          'Here is the profile Doorway built from your answers. Everything is editable.') : null,
        h('div', { class: 'profile-head' },
          avatar(profile),
          h('div', null,
            h('h1', { text: profile.name || 'Your profile' }),
            h('p', { class: 'muted', text: headline(profile) || 'Add a role so Doorway can match events for you' }))),
        h('p', { class: 'summary', text: profile.summary || P.buildSummary(profile) }),
        visibilitySwitch(),
        h('section', { class: 'card' },
          h('dl', { class: 'facts' },
            fact('Target roles', tagList(profile.roles.map(P.roleLabel))),
            fact('Looking for', tagList(lookingLabels(profile))),
            fact('Company preference', tagList(styleLabels(profile))),
            fact('Companies on my list', tagList(profile.targetCompanies)),
            fact('What I value', tagList(profile.values)),
            fact('Skills', tagList(profile.skills, 'None yet. Paste a resume during setup, or add some here.')),
            fact('Links', linksValue()))),
        h('div', { class: 'row between wrap-row' },
          h('div', { class: 'row' },
            h('button', { class: 'btn primary', type: 'button', text: 'Edit profile', onclick: function () { editing = true; welcome = false; draw(); } }),
            h('a', { class: 'btn', href: '#/home', text: 'See your week →' })),
          h('button', { class: 'btn ghost danger-text', type: 'button', text: 'Delete my data', onclick: deleteData })));
    }

    function checkGroup(name, legend, options, selected) {
      return h('fieldset', { class: 'checks' },
        h('legend', { text: legend }),
        options.map(function (o) {
          var cb = h('input', { type: 'checkbox', name: name, value: o.id });
          cb.checked = selected.indexOf(o.id) !== -1;
          return h('label', { class: 'check' }, cb, h('span', { text: o.label }));
        }));
    }

    function editView() {
      var f = {
        name: h('input', { type: 'text', id: 'f-name', autocomplete: 'name' }),
        summary: h('textarea', { id: 'f-summary', rows: '3' }),
        companies: h('input', { type: 'text', id: 'f-companies', placeholder: 'Neighbor, Redo, Waystar' }),
        skills: h('input', { type: 'text', id: 'f-skills', placeholder: 'React, Python, SQL' }),
        linkedin: h('input', { type: 'text', id: 'f-linkedin', placeholder: 'https://www.linkedin.com/in/your-name' })
      };
      f.name.value = profile.name;
      f.summary.value = profile.summary;
      f.companies.value = profile.targetCompanies.join(', ');
      f.skills.value = profile.skills.join(', ');
      f.linkedin.value = profile.linkedin;

      var form = h('form', { class: 'card form', novalidate: true });

      function checked(name) {
        return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
      }
      function collect() {
        var li = f.linkedin.value.trim();
        if (li && !/^https?:\/\//i.test(li)) li = 'https://' + li;
        return Object.assign({}, profile, {
          name: f.name.value.trim(),
          summary: f.summary.value.trim(),
          roles: checked('roles'),
          lookingFor: checked('lookingFor'),
          companyStyle: checked('companyStyle'),
          values: checked('values'),
          targetCompanies: P.parseList(f.companies.value),
          skills: P.parseList(f.skills.value, 40),
          linkedin: ui.safeUrl(li)
        });
      }

      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var next = collect();
        if (!next.summary) next.summary = P.buildSummary(next);
        await api.saveProfile(next);
        profile = await api.getProfile();
        editing = false;
        draw();
        ui.toast('Profile saved');
      });

      form.append(
        h('label', { class: 'field', for: 'f-name' }, 'Name', f.name),
        h('label', { class: 'field', for: 'f-summary' }, 'Summary', f.summary),
        h('div', { class: 'row end tight' },
          h('button', { class: 'btn small', type: 'button', text: 'Rewrite summary for me', onclick: function () {
            f.summary.value = P.buildSummary(collect());
          } })),
        checkGroup('roles', 'Target roles', P.ROLE_OPTIONS, profile.roles),
        checkGroup('lookingFor', 'Looking for', P.LOOKING_OPTIONS, profile.lookingFor),
        checkGroup('companyStyle', 'Company preference', P.STYLE_OPTIONS, profile.companyStyle),
        h('label', { class: 'field', for: 'f-companies' }, 'Companies on my list (comma separated)', f.companies),
        checkGroup('values', 'What I value', P.VALUE_OPTIONS, profile.values),
        h('label', { class: 'field', for: 'f-skills' }, 'Skills (comma separated)', f.skills),
        h('label', { class: 'field', for: 'f-linkedin' }, 'LinkedIn URL', f.linkedin),
        h('div', { class: 'row end' },
          h('button', { class: 'btn ghost', type: 'button', text: 'Cancel', onclick: function () { editing = false; draw(); } }),
          h('button', { class: 'btn primary', type: 'submit', text: 'Save' })));

      return h('div', null, h('h1', { text: 'Edit your profile' }), form);
    }

    async function deleteData() {
      var ok = await ui.confirmDialog({
        title: 'Delete your data?',
        body: 'This removes your profile and the events you marked as going from this browser. It cannot be undone.',
        ok: 'Delete',
        cancel: 'Keep it'
      });
      if (!ok) return;
      await api.clearAll();
      ui.toast('Your data was deleted');
      go('/');
    }

    draw();
    return page;
  }

  // ---------- Event card (used by Your week and the event page) ----------

  function eventCard(ev, match, profile, goingIds, opts) {
    opts = opts || {};
    var isGoing = goingIds.indexOf(ev.id) !== -1;
    var st = ui.status(ev);
    var pitch = P.fillPitch(ev.pitchTemplate, profile);

    var goingBtn = h('button', { class: 'btn small going', type: 'button' });
    function syncGoing() {
      goingBtn.textContent = isGoing ? '✓ Going' : "I'm going";
      goingBtn.setAttribute('aria-pressed', String(isGoing));
    }
    syncGoing();
    goingBtn.addEventListener('click', async function () {
      isGoing = !isGoing;
      syncGoing();
      await api.setGoing(ev.id, isGoing);
      ui.toast(isGoing ? 'Added to your timeline' : 'Removed from your timeline');
      if (opts.onGoingChange) opts.onGoingChange();
    });

    var companies = ev.companies.length
      ? h('div', { class: 'tags', role: 'list', 'aria-label': 'Companies attending' }, ev.companies.map(function (c) {
          var mine = M.isMyCompany(c, profile);
          return h('span', { class: 'tag' + (mine ? ' hit' : ''), role: 'listitem' },
            mine ? '★ ' : '', c, mine ? h('span', { class: 'sr', text: ' (on your list)' }) : null);
        }))
      : null;

    var script = h('details', { class: 'script', open: opts.detail ? true : null },
      h('summary', { text: 'Who to talk to and what to say' }),
      h('h4', { text: 'Look for' }),
      h('ul', null, ev.talkTo.map(function (t) { return h('li', { text: t }); })),
      h('h4', { text: 'Ask' }),
      h('ul', null, ev.questions.map(function (q) { return h('li', { text: q }); })),
      h('h4', { text: 'Your pitch' }),
      h('blockquote', { text: pitch }),
      h('button', { class: 'btn small', type: 'button', text: 'Copy pitch', onclick: async function () {
        var ok = await ui.copyText(pitch);
        ui.toast(ok ? 'Pitch copied' : 'Could not copy. Select the text instead.');
      } }));

    return h('article', { class: 'card ev' + (st === 'past' ? ' past' : '') },
      h('div', { class: 'tags' },
        h('span', { class: 'tag type', text: P.typeSingular(ev.type) }),
        st === 'live' ? h('span', { class: 'tag live', text: 'Happening now' }) : null,
        st === 'past' ? h('span', { class: 'tag type', text: 'Ended' }) : null),
      opts.detail ? h('h1', { text: ev.title }) : h('h3', null, h('a', { href: eventHref(ev), text: ev.title })),
      h('p', { class: 'meta' }, ui.when(ev), ev.location ? ' · ' + ev.location : ''),
      ev.blurb ? h('p', { class: opts.detail ? 'blurb full' : 'blurb', text: ev.blurb }) : null,
      companies,
      profile ? h('p', { class: 'match ' + match.level, text: match.headline }) : null,
      profile ? h('p', { class: 'why', text: 'Why: ' + match.why }) : null,
      h('div', { class: 'actions' },
        goingBtn,
        h('a', { class: 'btn small', href: ICS.googleUrl(ev), target: '_blank', rel: 'noopener noreferrer', text: 'Add to Google Calendar' }),
        h('button', { class: 'btn small', type: 'button', text: 'Download .ics', onclick: function () {
          ICS.download(ICS.slug(ev.title) + '.ics', ICS.build([ev]));
          ui.toast('Calendar file downloaded');
        } }),
        opts.detail ? null : h('a', { class: 'btn small ghost', href: eventHref(ev), text: 'Details' })),
      script);
  }

  function eventsErrorBox(err) {
    return stateBox('Could not load events', (err && err.message) || 'The events service did not answer.', [
      h('button', { class: 'btn primary', type: 'button', text: 'Use sample events', onclick: function () {
        D.usingSampleFallback = true;
        render();
      } })
    ]);
  }

  // ---------- Your week ----------

  async function viewHome() {
    var profile = await api.getProfile();
    if (!profile) {
      return stateBox('Your week starts with a profile', 'Tell Doorway what you are after and it will line up the events worth your time.', startActions());
    }
    var events;
    try { events = await loadEvents(); } catch (err) { return eventsErrorBox(err); }
    var goingIds = await api.getGoing();
    var state = { type: 'all', mine: false };
    var first = P.firstName(profile);

    var focus = [];
    if (profile.roles.length) focus.push(P.joinList(profile.roles.map(P.roleShort), 'or') + ' roles');
    if (profile.lookingFor.length) focus.push(P.joinList(lookingLabels(profile), 'or').toLowerCase());
    if (profile.targetCompanies.length) focus.push(P.joinList(profile.targetCompanies.slice(0, 3)) + (profile.targetCompanies.length > 3 ? ' and more' : '') + ' on your list');

    async function downloadAll() {
      var ids = await api.getGoing();
      var list = events.filter(function (e) { return ids.indexOf(e.id) !== -1; });
      if (!list.length) { ui.toast("Tap \"I'm going\" on an event first"); return; }
      ICS.download('doorway-my-events.ics', ICS.build(list));
      ui.toast('Downloaded ' + list.length + (list.length === 1 ? ' event' : ' events'));
    }

    var FILTERS = [{ id: 'all', label: 'All' }].concat(P.EVENT_TYPE_OPTIONS);
    var chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by event type' });
    function drawChips() {
      ui.clear(chips);
      FILTERS.forEach(function (f) {
        chips.appendChild(h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.type === f.id), text: f.label, onclick: function () {
          state.type = f.id;
          drawChips();
          drawList();
        } }));
      });
    }

    var mineInput = h('input', { type: 'checkbox', id: 'only-mine', disabled: profile.targetCompanies.length ? null : true });
    mineInput.addEventListener('change', function () { state.mine = mineInput.checked; drawList(); });
    var mineToggle = h('label', { class: 'toggle', for: 'only-mine', title: profile.targetCompanies.length ? null : 'Add companies to your profile first' },
      mineInput, h('span', { text: 'Only my companies' }));

    var count = h('p', { class: 'count muted', 'aria-live': 'polite' });
    var list = h('div', { class: 'grid' });
    var timeline = h('section', { class: 'timeline-box', 'aria-labelledby': 'tl-title' });

    function drawList() {
      ui.clear(list);
      var ranked = M.rankEvents(events, profile).filter(function (r) {
        if (state.type !== 'all' && r.event.type !== state.type) return false;
        if (state.mine && !r.match.matchedCompanies.length) return false;
        return true;
      });
      count.textContent = ranked.length + (ranked.length === 1 ? ' event' : ' events');
      if (!ranked.length) {
        list.appendChild(h('div', { class: 'empty' },
          h('p', { text: 'No events match these filters.' }),
          h('button', { class: 'btn small', type: 'button', text: 'Clear filters', onclick: function () {
            state.type = 'all';
            state.mine = false;
            mineInput.checked = false;
            drawChips();
            drawList();
          } })));
        return;
      }
      ranked.forEach(function (r) {
        list.appendChild(eventCard(r.event, r.match, profile, goingIds, { onGoingChange: refreshGoing }));
      });
    }

    async function refreshGoing() {
      goingIds = await api.getGoing();
      drawTimeline();
    }

    function drawTimeline() {
      ui.clear(timeline);
      var mine = events.filter(function (e) { return goingIds.indexOf(e.id) !== -1; }).sort(byStartDesc);
      timeline.append(
        h('div', { class: 'row between' },
          h('h2', { id: 'tl-title', text: 'Your timeline' }),
          h('a', { href: '#/employers/preview', text: 'What employers see →' })),
        h('p', { class: 'muted', text: profile.visibleToEmployers
          ? 'Your profile is visible, so employers can see this.'
          : 'Employers can see this if your profile is visible. Yours is hidden right now.' }));
      if (!mine.length) {
        timeline.appendChild(h('p', { class: 'empty', text: "Nothing yet. Tap \"I'm going\" on an event and it shows up here." }));
        return;
      }
      timeline.appendChild(h('ol', { class: 'timeline' }, mine.map(function (e) {
        return h('li', null,
          h('a', { href: eventHref(e), text: e.title }),
          h('span', { class: 'muted', text: ui.fmtDay(new Date(e.start)) + (ui.status(e) === 'past' ? ' · attended' : '') }));
      })));
    }

    drawChips();
    drawList();
    drawTimeline();

    return h('div', { class: 'page home' },
      h('header', { class: 'page-head' },
        h('h1', { text: first ? 'Hi, ' + first + '. Here is your week.' : 'Here is your week.' }),
        h('p', { class: 'sub', text: focus.length ? 'Your focus: ' + focus.join(' · ') : 'Add a role and some companies on your profile to sharpen these matches.' })),
      h('section', { class: 'card subscribe' },
        h('div', { class: 'row between' },
          h('h2', { text: 'Subscribe to my calendar' }),
          h('span', { class: 'tag soon', text: 'Coming soon' })),
        h('p', { class: 'muted', text: 'One link that keeps every event you mark as going on your Google or Apple Calendar. For now, add events one at a time, or download everything you are going to in one file.' }),
        h('button', { class: 'btn small', type: 'button', text: 'Add all my events to calendar (.ics)', onclick: downloadAll })),
      h('div', { class: 'toolbar' }, chips, mineToggle),
      count,
      list,
      timeline);
  }

  // ---------- Event page ----------

  async function viewEvent(match) {
    var id = decodeURIComponent(match[1]);
    var profile = await api.getProfile();
    var events;
    try { events = await loadEvents(); } catch (err) { return eventsErrorBox(err); }
    var ev = null;
    events.forEach(function (e) { if (e.id === id) ev = e; });
    if (!ev) {
      return stateBox('Event not found', 'It may have been removed from the feed.', [h('a', { class: 'btn primary', href: '#/home', text: 'Back to your week' })]);
    }
    var goingIds = await api.getGoing();
    return h('div', { class: 'page event' },
      h('a', { class: 'back', href: '#/home', text: '← Back to your week' }),
      eventCard(ev, M.scoreEvent(ev, profile), profile, goingIds, { detail: true }),
      profile ? null : h('p', { class: 'muted' },
        'Matches and your pitch get personal once you ',
        h('a', { href: '#/onboarding', text: 'set up a profile' }), '.'));
  }

  // ---------- Employer preview (phase two) ----------

  async function viewEmployer() {
    var saved = await api.getProfile();
    var profile = saved || P.normalizeProfile(D.demoProfile);
    var events;
    try { events = await loadEvents(); } catch (err) { return eventsErrorBox(err); }
    var goingIds = saved ? await api.getGoing() : [];
    var attended = events.filter(function (e) { return goingIds.indexOf(e.id) !== -1; }).sort(byStartDesc);

    // The "viewing" employer: the company that shows up most across the student's events.
    var counts = {};
    attended.forEach(function (e) { e.companies.forEach(function (c) { counts[c] = (counts[c] || 0) + 1; }); });
    var company = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0] ||
      profile.targetCompanies[0] || 'your company';
    var withCompany = counts[company] || 0;

    return h('div', { class: 'page employers' },
      h('div', { class: 'banner info', role: 'note' },
        h('strong', { text: 'Phase two preview. Not live yet.' }), ' ',
        'This is what an employer would see when a student opts in.'),
      !saved ? h('div', { class: 'banner warn', role: 'note' },
        'You do not have a profile yet, so this shows the demo student. ',
        h('a', { href: '#/onboarding', text: 'Set up yours' }), '.') : null,
      saved && !saved.visibleToEmployers ? h('div', { class: 'banner warn', role: 'note' },
        'Your profile is hidden, so a real employer would not see this card. ',
        h('a', { href: '#/profile', text: 'Change it on your profile' }), '.') : null,
      h('h1', { text: 'Candidate preview' }),
      h('article', { class: 'card candidate' },
        h('div', { class: 'profile-head' },
          avatar(profile),
          h('div', null,
            h('h2', { text: profile.name || 'Student' }),
            h('p', { class: 'muted', text: headline(profile) }))),
        h('p', { text: profile.summary || P.buildSummary(profile) }),
        h('h3', { text: 'Skills' }), tagList(profile.skills),
        h('h3', { text: 'Values' }), tagList(profile.values),
        h('h3', { text: 'Event timeline' }),
        withCompany ? h('p', { class: 'match strong', text: withCompany + (withCompany === 1 ? ' event' : ' events') + ' with ' + company + ' on their calendar' }) : null,
        attended.length
          ? h('ol', { class: 'timeline' }, attended.map(function (e) {
              return h('li', null,
                h('span', { text: e.title }),
                h('span', { class: 'muted', text: ui.fmtDay(new Date(e.start)) + (ui.status(e) === 'past' ? ' · attended' : ' · going') }));
            }))
          : h('p', { class: 'empty' }, 'No events yet. Mark a few as going on ', h('a', { href: '#/home', text: 'Your week' }), ' to see this fill in.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', disabled: true, text: 'Reach out' }),
          h('span', { class: 'muted small', text: 'Coming in phase two' }))));
  }

  function viewMissing() {
    return stateBox('Page not found', "That page doesn't exist.", [h('a', { class: 'btn primary', href: '#/', text: 'Back to start' })]);
  }

  // ---------- Start ----------

  if (!api.isStorageAvailable()) {
    var note = document.getElementById('storage-note');
    if (note) note.hidden = false;
  }
  root.addEventListener('hashchange', render);
  render();
})(window);
