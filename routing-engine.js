/* ============================================================
   Novalink Routing Engine
   Single source of truth for:
     - Tier keys, default names, default colours
     - Seat code format & parsing
     - Ticket reference format
     - QR payload format
   Loaded on: index.html, create-event.html, view-event.html,
              view-card.html, create-trip.html, events.html
   ============================================================ */
(function (global) {
  'use strict';

  var TIER_KEYS = ["black", "gold", "silver", "cyan", "tier5", "tier6"];

  var TIER_DEFAULTS = {
    black: "#1a202c", gold: "#ecc94b", silver: "#cbd5e1",
    cyan: "#00FFFF", tier5: "#a855f7", tier6: "#f472b6"
  };

  var TIER_DEFAULT_NAMES = {
    black: "Elite", gold: "VIP", silver: "Silver",
    cyan: "Standard", tier5: "Platinum", tier6: "Diamond"
  };

  var MAX_TIERS = 6;
  var MIN_TIERS = 2;
  var DEFAULT_TIERS = 4;
  var LARGE_VENUE_THRESHOLD = 5000;

  /* -------- Seat codes --------
     Canonical format: <BLOCK>-<ROW>-<SEAT>
       BLOCK: single A–Z letter
       ROW:   single A–Z letter
       SEAT:  positive integer
     Examples: "A-A-1", "C-B-12"
     Anything else returns "" (never throw). */

  function buildSeatCode(block, row, seat) {
    var b = String(block == null ? "" : block).trim().toUpperCase();
    var r = String(row == null ? "" : row).trim().toUpperCase();
    var s = parseInt(seat, 10);
    if (!/^[A-Z]$/.test(b)) return "";
    if (!/^[A-Z]$/.test(r)) return "";
    if (!isFinite(s) || s < 1 || s > 9999) return "";
    return b + "-" + r + "-" + s;
  }

  function parseSeatCode(code) {
    var m = /^([A-Z])-([A-Z])-(\d{1,4})$/.exec(String(code == null ? "" : code).trim().toUpperCase());
    if (!m) return null;
    return { block: m[1], row: m[2], seat: parseInt(m[3], 10) };
  }

  /* "A-B-12" -> "AB12" — for compact refs & QR payloads */
  function seatCodeToRef(code) {
    var p = parseSeatCode(code);
    return p ? p.block + p.row + p.seat : "";
  }

  /* -------- Ticket references --------
     "NL-<shortEvent>-<shortTicket>", e.g. "NL-A3F9-K27C"
     Non-cryptographic — for human display only. */

  function shortId(id) {
    var s = String(id == null ? "" : id).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (!s) return "";
    return s.length <= 4 ? s : s.slice(-4);
  }

  function buildTicketRef(eventId, ticketId) {
    var e = shortId(eventId), t = shortId(ticketId);
    if (!e || !t) return "NL-XXXXXX";
    return "NL-" + e + "-" + t;
  }

  /* -------- QR payloads --------
     Keep the payload minimal. NEVER include price, name, or tier —
     anyone can read a QR. All real validation happens server-side
     against the ticket document. */

  function buildQrPayload(ticket) {
    if (!ticket || !ticket.eventId || !ticket.ticketId) return "";
    return JSON.stringify({ v: 1, e: String(ticket.eventId), t: String(ticket.ticketId) });
  }

  function parseQrPayload(str) {
    try {
      var o = JSON.parse(String(str == null ? "" : str));
      if (!o || o.v !== 1 || !o.e || !o.t) return null;
      return { eventId: o.e, ticketId: o.t };
    } catch (e) { return null; }
  }

  /* -------- Helpers -------- */

  function formatMoney(v) {
    if (typeof v !== "number") v = parseFloat(v) || 0;
    if (v <= 0) return "Free";
    return "R " + v.toFixed(2).replace(/\.00$/, "");
  }

  function getActiveTiers(activeCount) {
    var n = parseInt(activeCount, 10);
    if (!isFinite(n) || n < MIN_TIERS) n = DEFAULT_TIERS;
    if (n > MAX_TIERS) n = MAX_TIERS;
    return TIER_KEYS.slice(0, n);
  }

  global.NovalinkRoutingEngine = {
    version: "1.0.0",
    TIER_KEYS: TIER_KEYS,
    TIER_DEFAULTS: TIER_DEFAULTS,
    TIER_DEFAULT_NAMES: TIER_DEFAULT_NAMES,
    MAX_TIERS: MAX_TIERS,
    MIN_TIERS: MIN_TIERS,
    DEFAULT_TIERS: DEFAULT_TIERS,
    LARGE_VENUE_THRESHOLD: LARGE_VENUE_THRESHOLD,
    buildSeatCode: buildSeatCode,
    parseSeatCode: parseSeatCode,
    seatCodeToRef: seatCodeToRef,
    buildTicketRef: buildTicketRef,
    buildQrPayload: buildQrPayload,
    parseQrPayload: parseQrPayload,
    formatMoney: formatMoney,
    getActiveTiers: getActiveTiers
  };
})(window);
