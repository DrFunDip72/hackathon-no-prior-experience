/*
 * Doorway UI helpers: a tiny DOM builder (text is always inserted as text, never as HTML),
 * dates, a toast, a confirm dialog and clipboard copy.
 */
(function (root) {
  'use strict';
  var D = (root.Doorway = root.Doorway || {});

  /**
   * h('a', { class: 'btn', href: '#/', text: 'Home', onclick: fn }, child, [children], 'text')
   * Strings become text nodes, so user-entered text can never inject markup.
   */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  /** Only http(s) links are allowed into href attributes. */
  function safeUrl(u) {
    var s = String(u || '').trim();
    return /^https?:\/\/[^\s]+$/i.test(s) ? s : '';
  }

  // ---- Dates ----

  // Inside the sample window we use the real clock. Outside it we pretend it is the sample
  // "today", so the demo always shows upcoming events. A live feed always uses the real clock.
  function now() {
    var real = new Date();
    if (root.DOORWAY_EVENTS_API_URL && !D.usingSampleFallback) return real;
    var w = D.SAMPLE_WINDOW;
    if (w && real >= new Date(w.from) && real <= new Date(w.to)) return real;
    return D.SAMPLE_TODAY ? new Date(D.SAMPLE_TODAY) : real;
  }
  function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function dayDiff(a, b) { return Math.round((startOfDay(a) - startOfDay(b)) / 86400000); }
  function fmtTime(d) { return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function fmtDay(d) {
    var diff = dayDiff(d, now());
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  /** "Today · 9:00 AM – 4:00 PM" */
  function when(ev) {
    var s = new Date(ev.start);
    var e = new Date(ev.end);
    if (isNaN(s)) return '';
    var out = fmtDay(s) + ' · ' + fmtTime(s);
    if (!isNaN(e) && e > s) out += ' – ' + fmtTime(e);
    return out;
  }
  /** 'live', 'past' or '' */
  function status(ev) {
    var t = now();
    var s = new Date(ev.start);
    var e = new Date(ev.end || ev.start);
    if (!isNaN(e) && e < t) return 'past';
    if (!isNaN(s) && s <= t) return 'live';
    return '';
  }

  // ---- Toast ----
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  // ---- Confirm dialog (resolves true / false) ----
  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var dlg = h('dialog', { class: 'dialog', 'aria-labelledby': 'dlg-title' },
        h('h2', { id: 'dlg-title', text: opts.title }),
        h('p', { text: opts.body }),
        h('div', { class: 'row end' },
          h('button', { class: 'btn ghost', type: 'button', text: opts.cancel || 'Cancel', onclick: function () { done(false); } }),
          h('button', { class: 'btn danger', type: 'button', text: opts.ok || 'OK', onclick: function () { done(true); } })));
      function done(value) {
        if (dlg.open) dlg.close();
        dlg.remove();
        resolve(value);
      }
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); done(false); });
      document.body.appendChild(dlg);
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else { dlg.remove(); resolve(root.confirm(opts.body)); }
    });
  }

  // ---- Clipboard (resolves true when copied) ----
  function legacyCopy(text) {
    var ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;top:0;left:0;opacity:0' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && root.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  D.ui = {
    h: h,
    clear: clear,
    safeUrl: safeUrl,
    now: now,
    fmtDay: fmtDay,
    when: when,
    status: status,
    toast: toast,
    confirmDialog: confirmDialog,
    copyText: copyText
  };
})(typeof window !== 'undefined' ? window : globalThis);
