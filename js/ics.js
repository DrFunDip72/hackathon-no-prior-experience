/*
 * Doorway calendar helpers.
 *   - build(events)          -> RFC 5545 iCalendar text (CRLF lines, folded at 75 octets)
 *   - download(name, text)   -> saves an .ics file from the browser
 *   - googleUrl(event)       -> Google Calendar "template" link
 *
 * Event times are local wall-clock times ("floating" in iCalendar terms), which is
 * what a campus calendar means. If a feed supplies a zone ("Z" or +hh:mm) we convert to UTC.
 */
(function (root) {
  'use strict';
  var D = (root.Doorway = root.Doorway || {});

  var PRODID = '-//Doorway//Sample Events//EN';
  var UID_DOMAIN = 'doorway.example';

  function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }

  function utcStamp(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }
  function localStamp(d) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  // ISO 8601 -> "YYYYMMDDTHHMMSS" (floating) or "YYYYMMDDTHHMMSSZ" (UTC). Null if unparseable.
  function icsDate(iso) {
    var s = String(iso == null ? '' : iso).trim();
    var d;
    if (/(Z|[+-]\d{2}:?\d{2})$/.test(s) && /T/.test(s)) {
      d = new Date(s.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
      if (!isNaN(d)) return utcStamp(d);
    }
    var m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
    if (m) return m[1] + m[2] + m[3] + 'T' + m[4] + m[5] + (m[6] || '00');
    m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return m[1] + m[2] + m[3] + 'T000000';
    d = new Date(s);
    return isNaN(d) ? null : localStamp(d);
  }

  function addHour(stamp) {
    var m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(stamp);
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) + 3600000);
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + m[7];
  }

  // TEXT value escaping (RFC 5545 section 3.3.11)
  function escapeText(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\r|\n/g, '\\n');
  }

  function utf8Length(ch) {
    var c = ch.codePointAt(0);
    return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  // Fold a content line so no physical line is longer than 75 octets (counting the leading space).
  function fold(line) {
    var out = [];
    var cur = '';
    var bytes = 0;
    for (var ch of line) {
      var n = utf8Length(ch);
      if (bytes + n > 75) { out.push(cur); cur = ' '; bytes = 1; }
      cur += ch;
      bytes += n;
    }
    out.push(cur);
    return out.join('\r\n');
  }

  function safeHttpUrl(u) {
    return /^https?:\/\//i.test(String(u || '')) ? String(u) : '';
  }

  function describe(ev) {
    var parts = [];
    if (ev.sample) parts.push('SAMPLE EVENT from the Doorway demo. Not a real listing.');
    if (ev.blurb) parts.push(ev.blurb);
    if (ev.companies && ev.companies.length) parts.push('Companies: ' + ev.companies.join(', '));
    if (ev.talkTo && ev.talkTo.length) {
      parts.push('Who to talk to:\n' + ev.talkTo.map(function (t) { return '- ' + t; }).join('\n'));
    }
    return parts.join('\n\n');
  }

  function eventLines(ev, stamp) {
    var start = icsDate(ev.start);
    if (!start) return [];
    var end = icsDate(ev.end);
    if (!end || end <= start) end = addHour(start);
    var lines = [
      'BEGIN:VEVENT',
      'UID:' + escapeText(ev.id) + '@' + UID_DOMAIN,
      'DTSTAMP:' + stamp,
      'DTSTART:' + start,
      'DTEND:' + end,
      'SUMMARY:' + escapeText(ev.title)
    ];
    if (ev.location) lines.push('LOCATION:' + escapeText(ev.location));
    var desc = describe(ev);
    if (desc) lines.push('DESCRIPTION:' + escapeText(desc));
    var url = safeHttpUrl(ev.url);
    if (url) lines.push('URL:' + url);
    lines.push('END:VEVENT');
    return lines;
  }

  /** Build a complete iCalendar document for one or more events. */
  function build(events, opts) {
    var stamp = (opts && opts.now) ? utcStamp(opts.now) : utcStamp(new Date());
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:' + PRODID, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Doorway events'];
    (events || []).forEach(function (ev) {
      lines = lines.concat(eventLines(ev, stamp));
    });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  /** Google Calendar template link built from event data. */
  function googleUrl(ev) {
    var start = icsDate(ev.start);
    var end = icsDate(ev.end);
    if (start && (!end || end <= start)) end = addHour(start);
    var q = [
      ['action', 'TEMPLATE'],
      ['text', ev.title || 'Event'],
      ['dates', (start || '') + '/' + (end || start || '')],
      ['details', describe(ev)],
      ['location', ev.location || '']
    ];
    return 'https://calendar.google.com/calendar/render?' + q.map(function (kv) {
      // "dates" is only digits, T, Z and one slash, so it stays readable.
      return kv[0] + '=' + (kv[0] === 'dates' ? kv[1] : encodeURIComponent(kv[1]));
    }).join('&');
  }

  function slug(s) {
    var out = String(s || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
    return out || 'event';
  }

  /** Save text as a file through a temporary link (works from file:// and https). */
  function download(filename, text) {
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  D.ics = {
    build: build,
    googleUrl: googleUrl,
    download: download,
    slug: slug,
    icsDate: icsDate,
    escapeText: escapeText,
    fold: fold
  };
})(typeof window !== 'undefined' ? window : globalThis);
