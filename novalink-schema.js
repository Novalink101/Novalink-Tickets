/* ═══════════════════════════════════════════════════════════════
   novalink-schema.js  ·  v1.0.0
   ═══════════════════════════════════════════════════════════════
   
   Single source of truth for reading ANY event, ticket, or trip
   in Novalink. Handles BOTH tier schemas that exist in the wild:

     v1 (legacy)  :  elite   silver   standard
     v2 (current) :  black   gold   silver   cyan   tier5   tier6

   Pages call these helpers and never guess at field names again.

   USAGE
   ─────
     <script src="novalink-schema.js"></script>
     // then:
     var keys = NovalinkSchema.getActiveTierKeys(eventDoc);
     var name = NovalinkSchema.getTierName(eventDoc, ticket.tier);
     var link = NovalinkSchema.getPaymentLink(eventDoc, tier, qty);

   RULES OF THIS FILE
   ──────────────────
     • No dependencies.
     • No modern syntax (works in every browser).
     • Never throws — always returns a sensible fallback.
     • Never assumes a field exists.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var VERSION = '1.0.0';

  /* ───────────────────────────────────────────────────────────
     TIER METADATA
     ─────────────────────────────────────────────────────────── */

  var TIER_ORDER = [
    'black',
    'elite',
    'gold',
    'tier5',
    'tier6',
    'silver',
    'cyan',
    'standard'
  ];

  var TIER_DEFAULT_NAMES = {
    black:    'Elite',
    elite:    'Elite',
    gold:     'VIP',
    silver:   'Silver',
    cyan:     'Standard',
    standard: 'Standard',
    tier5:    'Platinum',
    tier6:    'Diamond'
  };

  var TIER_DEFAULT_COLOURS = {
    black:    '#1a202c',
    elite:    '#1a202c',
    gold:     '#ecc94b',
    silver:   '#cbd5e1',
    cyan:     '#00FFFF',
    standard: '#00FFFF',
    tier5:    '#a855f7',
    tier6:    '#f472b6'
  };

  var V2_KEYS = ['black', 'gold', 'cyan', 'tier5', 'tier6'];
  var V1_KEYS = ['elite', 'standard'];

  var MIN_TIERS = 2;

  var DEFAULT_TIERS_V1 = ['elite', 'silver', 'standard'];
  var DEFAULT_TIERS_V2 = ['black', 'gold', 'silver', 'cyan'];

  /* ───────────────────────────────────────────────────────────
     INTERNAL HELPERS
     ─────────────────────────────────────────────────────────── */

  function isObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  function collectTierKeys(event) {
    if (!isObject(event)) return [];
    var seen = {};

    var sources = [
      event.tierActive,
      event.tierNames,
      event.tierColours,
      event.tierColors,
      event.tierPrices
    ];

    for (var i = 0; i < sources.length; i++) {
      var src = sources[i];
      if (!isObject(src)) continue;
      for (var k in src) {
        if (Object.prototype.hasOwnProperty.call(src, k)) {
          seen[k] = true;
        }
      }
    }

    return Object.keys(seen);
  }

  function sortTierKeys(keys) {
    return keys.slice().sort(function (a, b) {
      var ia = TIER_ORDER.indexOf(a);
      var ib = TIER_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  /* ───────────────────────────────────────────────────────────
     SCHEMA DETECTION
     ─────────────────────────────────────────────────────────── */

  function detectSchema(event) {
    var keys = collectTierKeys(event);

    var hasV2 = false;
    var hasV1 = false;

    for (var i = 0; i < keys.length; i++) {
      if (V2_KEYS.indexOf(keys[i]) !== -1) hasV2 = true;
      if (V1_KEYS.indexOf(keys[i]) !== -1) hasV1 = true;
    }

    if (hasV2 && !hasV1) return 'v2';
    if (hasV1 && !hasV2) return 'v1';
    if (hasV2 && hasV1) return 'mixed';
    return 'unknown';
  }

  /* ───────────────────────────────────────────────────────────
     TIER KEYS
     ─────────────────────────────────────────────────────────── */

  function getTierKeys(event) {
    var keys = collectTierKeys(event);

    if (!keys.length) {
      var schema = detectSchema(event);
      if (schema === 'v2') return DEFAULT_TIERS_V2.slice();
      if (schema === 'v1') return DEFAULT_TIERS_V1.slice();
      return DEFAULT_TIERS_V1.slice();
    }

    return sortTierKeys(keys);
  }

  function getActiveTierKeys(event) {
    var all = getTierKeys(event);
    if (!all.length) return [];

    var activeMap = event && event.tierActive;
    var count = event && parseInt(event.activeTierCount, 10);

    if (isObject(activeMap) && Object.keys(activeMap).length > 0) {
      var filtered = [];
      for (var i = 0; i < all.length; i++) {
        var k = all[i];
        var flag = activeMap[k];
        var isOn =
          flag === true ||
          flag === 1 ||
          flag === 'true' ||
          flag === '1' ||
          flag === 'yes';
        if (isOn) filtered.push(k);
      }
      if (filtered.length >= MIN_TIERS) return filtered;
      return all.slice(0, Math.max(MIN_TIERS, filtered.length || MIN_TIERS));
    }

    if (!isNaN(count) && count >= 1) {
      if (count > all.length) count = all.length;
      return all.slice(0, count);
    }

    return all;
  }

  /* ───────────────────────────────────────────────────────────
     TIER NAMES
     ─────────────────────────────────────────────────────────── */

  function getTierName(event, key) {
    if (!key) return '';

    if (event && isObject(event.tierNames) && isNonEmptyString(event.tierNames[key])) {
      return event.tierNames[key];
    }

    if (TIER_DEFAULT_NAMES[key]) return TIER_DEFAULT_NAMES[key];

    return String(key).charAt(0).toUpperCase() + String(key).slice(1);
  }

  /* ───────────────────────────────────────────────────────────
     TIER COLOURS
     ─────────────────────────────────────────────────────────── */

  function getTierColour(event, key) {
    if (!key) return TIER_DEFAULT_COLOURS.cyan;

    var map = (event && isObject(event.tierColours)) ? event.tierColours
            : (event && isObject(event.tierColors))  ? event.tierColors
            : null;

    if (map && isNonEmptyString(map[key])) return map[key];

    if (TIER_DEFAULT_COLOURS[key]) return TIER_DEFAULT_COLOURS[key];
    return TIER_DEFAULT_COLOURS.cyan;
  }

  /* ───────────────────────────────────────────────────────────
     TIER PRICES
     ─────────────────────────────────────────────────────────── */

  function getTierPrice(event, key) {
    if (!key || !event) return 0;

    var v;

    if (isObject(event.tierPrices) && event.tierPrices[key] !== undefined) {
      v = parseFloat(event.tierPrices[key]);
    }

    if ((isNaN(v) || v <= 0) && event.cost !== undefined) {
      var c = parseFloat(event.cost);
      if (!isNaN(c) && c > 0) {
        var keys = getActiveTierKeys(event);
        var lastKey = keys[keys.length - 1];
        if (key === lastKey) v = c;
      }
    }

    if (isNaN(v) || v < 0) return 0;
    return Math.round(v * 100) / 100;
  }

  function getActiveTiers(event) {
    var keys = getActiveTierKeys(event);
    var out = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      out.push({
        key:    k,
        name:   getTierName(event, k),
        colour: getTierColour(event, k),
        color:  getTierColour(event, k),
        price:  getTierPrice(event, k)
      });
    }
    return out;
  }

  /* ───────────────────────────────────────────────────────────
     PAYMENT LINKS
     ─────────────────────────────────────────────────────────── */

  function getPaymentLink(event, key, qty) {
    if (!event || !isObject(event.paymentLinks)) return '';
    var pl = event.paymentLinks[key];
    if (!pl) return '';

    var q = String(qty || 1);
    var url = '';

    if (typeof pl === 'string') {
      url = pl.trim();
    } else if (isObject(pl)) {
      if (isNonEmptyString(pl[q])) {
        url = String(pl[q]).trim();
      } else if (isNonEmptyString(pl.any)) {
        url = String(pl.any).trim();
      }
    }

    if (!url) return '';

    if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
      url = 'https://' + url;
    }
    return url;
  }

  /* ───────────────────────────────────────────────────────────
     TICKET REFERENCES
     ─────────────────────────────────────────────────────────── */

  function short4(s) {
    var t = String(s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (t.length <= 4) return t.padStart(4, '0');
    return t.slice(-4);
  }

  function rand4() {
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 4; i++) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }

  function buildTicketRef(eventId, ticketId, rand) {
    var e = short4(eventId);
    var t = short4(ticketId);
    var r = isNonEmptyString(rand) ? String(rand).toUpperCase() : rand4();
    return 'NL-' + e + '-' + t + '-' + r;
  }

  function parseTicketRef(ref) {
    if (!isNonEmptyString(ref)) return null;
    var m = /^NL-([A-Z0-9]{1,4})-([A-Z0-9]{1,4})-([A-Z0-9]{1,4})$/i.exec(ref.trim());
    if (!m) return null;
    return {
      event:  m[1].toUpperCase(),
      ticket: m[2].toUpperCase(),
      rand:   m[3].toUpperCase()
    };
  }

  function isValidTicketRef(ref) {
    return parseTicketRef(ref) !== null;
  }

  /* ───────────────────────────────────────────────────────────
     SEAT DISPLAY
     ─────────────────────────────────────────────────────────── */

  function formatSeat(ticket) {
    if (!ticket) return '';

    if (ticket.generalAdmission === true) return 'General admission';

    var parts = [];

    if (isNonEmptyString(ticket.seatBlock))   parts.push(ticket.seatBlock);
    if (isNonEmptyString(ticket.seatSection)) parts.push(ticket.seatSection);
    if (ticket.seatTable)   parts.push('Table ' + ticket.seatTable);
    if (isNonEmptyString(ticket.seatRow))     parts.push('Row ' + ticket.seatRow);
    if (ticket.seatNumber)  parts.push('Seat ' + ticket.seatNumber);

    if (parts.length) return parts.join(' · ');

    var raw = ticket.seat;
    if (!isNonEmptyString(raw)) return '';

    var m1 = /^([A-Z])-T(\d+)-C(\d+)$/i.exec(raw);
    if (m1) {
      var blockNum = m1[1] + parseInt(m1[2], 10);
      return 'Table ' + blockNum + ' · Seat ' + parseInt(m1[3], 10);
    }

    var m2 = /^([A-Z])-T(\d+)$/i.exec(raw);
    if (m2) return 'Table ' + m2[1] + parseInt(m2[2], 10);

    var m3 = /^([A-Z])-(\d+)$/i.exec(raw);
    if (m3) return 'Block ' + m3[1] + ' · Seat ' + parseInt(m3[2], 10);

    return raw;
  }

  /* ───────────────────────────────────────────────────────────
     COLOUR HELPERS
     ─────────────────────────────────────────────────────────── */

  function hexToRgbObj(hex) {
    var c = String(hex || '').replace('#', '');
    if (c.length === 3) {
      c = c.charAt(0) + c.charAt(0) +
          c.charAt(1) + c.charAt(1) +
          c.charAt(2) + c.charAt(2);
    }
    if (c.length !== 6) return null;
    return {
      r: parseInt(c.substring(0, 2), 16),
      g: parseInt(c.substring(2, 4), 16),
      b: parseInt(c.substring(4, 6), 16)
    };
  }

  function rgbObjToHex(c) {
    return '#' + [c.r, c.g, c.b].map(function (x) {
      return Math.max(0, Math.min(255, Math.round(x)))
        .toString(16).padStart(2, '0');
    }).join('');
  }

  function mixWithWhite(hex, ratio) {
    var c = hexToRgbObj(hex);
    if (!c) return hex;
    return rgbObjToHex({
      r: c.r + (255 - c.r) * ratio,
      g: c.g + (255 - c.g) * ratio,
      b: c.b + (255 - c.b) * ratio
    });
  }

  function mixWithBlack(hex, ratio) {
    var c = hexToRgbObj(hex);
    if (!c) return hex;
    return rgbObjToHex({
      r: c.r * (1 - ratio),
      g: c.g * (1 - ratio),
      b: c.b * (1 - ratio)
    });
  }

  function relativeLuminance(hex) {
    var c = hexToRgbObj(hex);
    if (!c) return 0.5;
    var arr = [c.r, c.g, c.b].map(function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * arr[0] + 0.7152 * arr[1] + 0.0722 * arr[2];
  }

  function getContrastText(hex) {
    return relativeLuminance(hex) > 0.5 ? '#0a0f14' : '#ffffff';
  }

  function getPalette(hex) {
    if (!isNonEmptyString(hex)) hex = TIER_DEFAULT_COLOURS.cyan;
    var lum = relativeLuminance(hex);

    if (lum < 0.35) {
      return {
        isDark: true,
        c1: mixWithWhite(hex, 0.06),
        c2: mixWithBlack(hex, 0.45),
        text: '#ffffff',
        muted: 'rgba(255,255,255,0.65)',
        logo: '#00FFFF',
        badgeBg: 'rgba(255,255,255,0.15)',
        badgeText: '#ffffff'
      };
    }

    var c1 = mixWithWhite(hex, 0.92);
    var c2 = mixWithWhite(hex, 0.4);
    var text = getContrastText(c2);
    var isLightText = text === '#ffffff';

    return {
      isDark: false,
      c1: c1,
      c2: c2,
      text: text,
      muted: isLightText ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
      logo: isLightText ? '#00FFFF' : '#1e2f4d',
      badgeBg: isLightText ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
      badgeText: isLightText ? '#ffffff' : '#4a5568'
    };
  }

  /* ───────────────────────────────────────────────────────────
     DATE / TIME — always in South African Standard Time (UTC+2)
     ─────────────────────────────────────────────────────────── */

  var SAST_OFFSET = '+02:00';
  var UNLOCK_BEFORE_MS = 2 * 60 * 60 * 1000;

  function computeEventStartMs(event) {
    if (!event || !isNonEmptyString(event.startDate)) return null;
    var time = isNonEmptyString(event.startTime) ? event.startTime : '00:00';
    var iso = event.startDate + 'T' + time + ':00' + SAST_OFFSET;
    var ms = new Date(iso).getTime();
    return isNaN(ms) ? null : ms;
  }

  function getUnlockTime(event) {
    var startMs = computeEventStartMs(event);
    if (startMs === null) return null;
    return startMs - UNLOCK_BEFORE_MS;
  }

  function getQrState(event) {
    var startMs = computeEventStartMs(event);
    if (startMs === null) return { state: 'open', unlockAt: null, eventStart: null };

    var unlockAt = startMs - UNLOCK_BEFORE_MS;
    var expiredAt = startMs + 12 * 60 * 60 * 1000;
    var now = Date.now();

    if (now >= expiredAt) return { state: 'expired', unlockAt: unlockAt, eventStart: startMs };
    if (now >= unlockAt)  return { state: 'open',    unlockAt: unlockAt, eventStart: startMs };
    return { state: 'locked', unlockAt: unlockAt, eventStart: startMs };
  }

  /* ───────────────────────────────────────────────────────────
     MISC
     ─────────────────────────────────────────────────────────── */

  function looksLikeNovalinkRef(text) {
    return /^NL-[A-Z0-9]{1,4}-[A-Z0-9]{1,4}-[A-Z0-9]{1,4}$/i.test(String(text || '').trim());
  }

  function toInt(v, fallback) {
    var n = parseInt(v, 10);
    return isNaN(n) ? (fallback || 0) : n;
  }

  /* ───────────────────────────────────────────────────────────
     EXPORT
     ─────────────────────────────────────────────────────────── */

  window.NovalinkSchema = {
    VERSION: VERSION,

    detectSchema:      detectSchema,

    getTierKeys:       getTierKeys,
    getActiveTierKeys: getActiveTierKeys,
    getActiveTiers:    getActiveTiers,
    getTierName:       getTierName,
    getTierColour:     getTierColour,
    getTierColor:      getTierColour,
    getTierPrice:      getTierPrice,

    getPaymentLink:    getPaymentLink,

    buildTicketRef:    buildTicketRef,
    parseTicketRef:    parseTicketRef,
    isValidTicketRef:  isValidTicketRef,
    looksLikeNovalinkRef: looksLikeNovalinkRef,

    formatSeat:        formatSeat,

    hexToRgbObj:       hexToRgbObj,
    mixWithWhite:      mixWithWhite,
    mixWithBlack:      mixWithBlack,
    relativeLuminance: relativeLuminance,
    getContrastText:   getContrastText,
    getPalette:        getPalette,

    computeEventStartMs: computeEventStartMs,
    getUnlockTime:       getUnlockTime,
    getQrState:          getQrState,

    toInt:             toInt,

    DEFAULTS: {
      TIER_ORDER:            TIER_ORDER.slice(),
      TIER_DEFAULT_NAMES:    Object.assign({}, TIER_DEFAULT_NAMES),
      TIER_DEFAULT_COLOURS:  Object.assign({}, TIER_DEFAULT_COLOURS),
      MIN_TIERS:             MIN_TIERS,
      UNLOCK_BEFORE_MS:      UNLOCK_BEFORE_MS
    }
  };

  window.NovalinkSchema.selfTest = function () {
    var results = [];

    function check(name, actual, expected) {
      var ok = JSON.stringify(actual) === JSON.stringify(expected);
      results.push({ name: name, ok: ok, actual: actual, expected: expected });
    }

    var v1Event = {
      tierNames:  { elite: 'Elite', silver: 'Silver', standard: 'Standard' },
      tierColours:{ elite: '#1a202c', silver: '#cbd5e1', standard: '#00FFFF' },
      tierPrices: { elite: 400, silver: 200, standard: 100 },
      tierActive: { elite: true, silver: true, standard: true },
      paymentLinks: { standard: { '1': 'https://pay.yoco.com/one' } },
      startDate: '2026-06-01',
      startTime: '18:00'
    };

    var v2Event = {
      tierNames:  { black: 'Elite', gold: 'VIP', silver: 'Silver', cyan: 'Standard' },
      tierColours:{ black: '#1a202c', gold: '#ecc94b', silver: '#cbd5e1', cyan: '#00FFFF' },
      tierPrices: { black: 600, gold: 400, silver: 200, cyan: 100 },
      tierActive: { black: true, gold: true, silver: true, cyan: true },
      activeTierCount: 4,
      paymentLinks: { cyan: { '1': 'https://pay.yoco.com/one', '3': 'https://pay.yoco.com/three' } },
      startDate: '2026-06-01',
      startTime: '18:00'
    };

    check('v1 detected',              NovalinkSchema.detectSchema(v1Event), 'v1');
    check('v2 detected',              NovalinkSchema.detectSchema(v2Event), 'v2');

    check('v1 tier names',            NovalinkSchema.getTierName(v1Event, 'elite'), 'Elite');
    check('v2 tier names',            NovalinkSchema.getTierName(v2Event, 'black'), 'Elite');
    check('v2 unknown key falls back', NovalinkSchema.getTierName(v2Event, 'unknown'), 'Unknown');

    check('v1 price',                 NovalinkSchema.getTierPrice(v1Event, 'elite'), 400);
    check('v2 price',                 NovalinkSchema.getTierPrice(v2Event, 'black'), 600);

    check('v1 active keys',           NovalinkSchema.getActiveTierKeys(v1Event), ['elite', 'silver', 'standard']);
    check('v2 active keys',           NovalinkSchema.getActiveTierKeys(v2Event), ['black', 'gold', 'silver', 'cyan']);

    check('v1 payment link qty 1',    NovalinkSchema.getPaymentLink(v1Event, 'standard', 1), 'https://pay.yoco.com/one');
    check('v1 payment link qty 3',    NovalinkSchema.getPaymentLink(v1Event, 'standard', 3), '');
    check('v2 payment link qty 3',    NovalinkSchema.getPaymentLink(v2Event, 'cyan', 3), 'https://pay.yoco.com/three');
    check('v2 payment link qty 5',    NovalinkSchema.getPaymentLink(v2Event, 'cyan', 5), '');

    check('buildTicketRef',           NovalinkSchema.buildTicketRef('EVT1', 'TKT9', 'ABCD'), 'NL-EVT1-TKT9-ABCD');
    check('parseTicketRef ok',        NovalinkSchema.parseTicketRef('NL-EVT1-TKT9-ABCD'), { event: 'EVT1', ticket: 'TKT9', rand: 'ABCD' });
    check('parseTicketRef bad',       NovalinkSchema.parseTicketRef('not-a-ref'), null);

    check('formatSeat A-T01-C03',     NovalinkSchema.formatSeat({ seat: 'A-T01-C03' }), 'Table A1 · Seat 3');
    check('formatSeat A-T01',         NovalinkSchema.formatSeat({ seat: 'A-T01' }), 'Table A1');
    check('formatSeat GA',            NovalinkSchema.formatSeat({ generalAdmission: true }), 'General admission');
    check('formatSeat structured',    NovalinkSchema.formatSeat({ seatBlock: 'A', seatRow: 'B', seatNumber: 3 }), 'A · Row B · Seat 3');

    check('QR state locked',          NovalinkSchema.getQrState({ startDate: '2099-01-01', startTime: '12:00' }).state, 'locked');
    check('QR state open (no date)',  NovalinkSchema.getQrState({}).state, 'open');

    var passed = results.filter(function (r) { return r.ok; }).length;
    var total  = results.length;

    console.group('NovalinkSchema v' + VERSION + ' — ' + passed + '/' + total + ' passed');
    results.forEach(function (r) {
      if (r.ok) {
        console.log('%c ✓ ' + r.name, 'color:#10b981');
      } else {
        console.log('%c ✗ ' + r.name, 'color:#ef4444',
          '\n   expected:', r.expected,
          '\n   actual:  ', r.actual);
      }
    });
    console.groupEnd();

    return { passed: passed, total: total, results: results };
  };

})();
