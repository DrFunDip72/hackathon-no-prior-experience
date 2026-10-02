/*
 * Doorway data layer. ALL data access goes through this file, so a teammate can swap
 * the sample data for a real service without touching the screens.
 *
 *   getEvents()          -> Promise<Event[]>   sample data, or window.DOORWAY_EVENTS_API_URL if set
 *   getProfile()         -> Promise<Profile|null>   (localStorage)
 *   saveProfile(p)       -> Promise<void>
 *   setGoing(id, going)  -> Promise<void>
 *   getGoing()           -> Promise<string[]>
 *
 * To plug in the real events API, set this BEFORE the scripts load (see the comment in index.html):
 *   <script>window.DOORWAY_EVENTS_API_URL = 'https://your-api.example/events';</script>
 * The endpoint should return a JSON array of Event objects (or { "events": [...] }).
 * Event shape: see js/data.js.
 *
 * Storage is wrapped in try/catch. If the browser blocks localStorage (private mode, blocked
 * site data) we fall back to memory so the app still works until the tab is closed.
 */
(function (root) {
  'use strict';
  var D = (root.Doorway = root.Doorway || {});

  var KEYS = { profile: 'doorway.profile.v1', going: 'doorway.going.v1' };
  var memory = {};
  var storageOk = true;

  function readRaw(key) {
    try {
      var v = root.localStorage.getItem(key);
      if (v !== null) return v;
    } catch (e) {
      storageOk = false;
    }
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
  }
  function writeRaw(key, value) {
    memory[key] = value;
    try {
      root.localStorage.setItem(key, value);
    } catch (e) {
      storageOk = false;
    }
  }
  function removeRaw(key) {
    delete memory[key];
    try {
      root.localStorage.removeItem(key);
    } catch (e) {
      storageOk = false;
    }
  }
  function readJSON(key, fallback) {
    var raw = readRaw(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  // Make sure an event from a remote feed has everything the screens need.
  function normalizeEvent(e) {
    if (!e || typeof e !== 'object' || !e.id || !e.title || !e.start) return null;
    function list(v) { return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }) : []; }
    return {
      id: String(e.id),
      sample: e.sample === true,
      title: String(e.title),
      type: typeof e.type === 'string' ? e.type : 'club',
      start: String(e.start),
      end: e.end ? String(e.end) : String(e.start),
      location: typeof e.location === 'string' ? e.location : '',
      url: typeof e.url === 'string' ? e.url : '',
      blurb: typeof e.blurb === 'string' ? e.blurb : '',
      companies: list(e.companies),
      roles: list(e.roles),
      startupFriendly: e.startupFriendly === true,
      talkTo: list(e.talkTo),
      questions: list(e.questions),
      pitchTemplate: typeof e.pitchTemplate === 'string' ? e.pitchTemplate : ''
    };
  }

  /** opts.useSample forces the bundled sample data (used by the "use sample events" fallback). */
  async function getEvents(opts) {
    var url = root.DOORWAY_EVENTS_API_URL;
    if (url && !(opts && opts.useSample)) {
      var res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('The events service answered with status ' + res.status + '.');
      var data = await res.json();
      var list = Array.isArray(data) ? data : data && data.events;
      if (!Array.isArray(list)) throw new Error('The events service sent data in an unexpected shape.');
      return list.map(normalizeEvent).filter(Boolean);
    }
    return clone(D.sampleEvents);
  }

  async function getProfile() {
    return D.profile.normalizeProfile(readJSON(KEYS.profile, null));
  }

  async function saveProfile(profile) {
    var clean = D.profile.normalizeProfile(profile);
    if (!clean) throw new Error('That profile could not be saved.');
    writeRaw(KEYS.profile, JSON.stringify(clean));
  }

  async function getGoing() {
    var ids = readJSON(KEYS.going, []);
    return Array.isArray(ids) ? ids.filter(function (x) { return typeof x === 'string'; }) : [];
  }

  async function setGoing(eventId, going) {
    var ids = await getGoing();
    var i = ids.indexOf(eventId);
    if (going && i === -1) ids.push(eventId);
    if (!going && i !== -1) ids.splice(i, 1);
    writeRaw(KEYS.going, JSON.stringify(ids));
  }

  // ---- Small extras the screens need ----

  /** Load the pre-filled demo profile ("Try the demo"). */
  async function loadDemoProfile() {
    await saveProfile(clone(D.demoProfile));
  }

  /** "Delete my data": clears the profile and the going list. */
  async function clearAll() {
    removeRaw(KEYS.profile);
    removeRaw(KEYS.going);
  }

  /** False if the browser blocked storage and we are only keeping data in memory. */
  function isStorageAvailable() {
    try {
      var k = 'doorway.probe';
      root.localStorage.setItem(k, '1');
      root.localStorage.removeItem(k);
      return storageOk;
    } catch (e) {
      return false;
    }
  }

  D.api = {
    getEvents: getEvents,
    getProfile: getProfile,
    saveProfile: saveProfile,
    setGoing: setGoing,
    getGoing: getGoing,
    loadDemoProfile: loadDemoProfile,
    clearAll: clearAll,
    isStorageAvailable: isStorageAvailable
  };
})(typeof window !== 'undefined' ? window : globalThis);
