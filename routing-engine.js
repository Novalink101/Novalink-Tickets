/* ==========================================================================
   NOVALINK — DYNAMIC ROUTING ENGINE
   ========================================================================== */

(function (global) {
  'use strict';

  const EventRoutingEngine = {
    "stadium":    { label1: "Stand / Block",    label2: "Row",  label3: "Seat",  requiresCalculation: true },
    "arena":      { label1: "Tier / Section",   label2: "Row",  label3: "Seat",  requiresCalculation: true },
    "theater":    { label1: "Zone / Level",     label2: "Row",  label3: "Seat",  requiresCalculation: true },
    "auditorium": { label1: "Balcony / Stalls", label2: "Row",  label3: "Seat",  requiresCalculation: true },
    "hall": {
      "seat_types":    { label1: "Section", label2: "Row", label3: "Seat",  requiresCalculation: true },
      "tables_chairs": { label1: "Table",   label2: null,  label3: "Chair", requiresCalculation: true }
    }
  };

  const StadiumSubTypes = [
    { value: "horseshoe",   label: "Horseshoe" },
    { value: "rectangular", label: "Rectangular" },
    { value: "one_stand",   label: "1 Stand" },
    { value: "arena",       label: "Arena" },
    { value: "octagonal",   label: "Octagonal" }
  ];

  const AuditoriumSubTypes = [
    { value: "traverse",    label: "Traverse / Alley Layout" },
    { value: "continental", label: "Continental Seating Layout" },
    { value: "straight",    label: "Straight Row Layout" }
  ];

  const TableSubTypes = [
    { value: "circular",    label: "Circular Table",    maxChairs: 10, description: "Up to 10 chairs placed evenly around the table." },
    { value: "rectangular", label: "Rectangular Table", maxChairs: 12, description: "Chairs split across long sides. Max 1 chair on each short side." },
    { value: "square",      label: "Square Table",      maxChairs: 8,  description: "Up to 2 chairs per side (max 8 total)." }
  ];

  const TripRoutingEngine = {
    "bus":     { term_coach: false, term_carriage: false, term_row: true,  term_seat: true },
    "plane":   { term_coach: false, term_carriage: false, term_row: true,  term_seat: true },
    "train":   { term_coach: true,  term_carriage: true,  term_row: true,  term_seat: true },
    "shuttle": { term_coach: false, term_carriage: false, term_row: false, term_seat: true }
  };

  function resolveEventConfig(venueType, isTablesMode) {
    if (venueType === "hall") {
      if (isTablesMode) return Object.assign({}, EventRoutingEngine.hall.tables_chairs, { mode: "tables_chairs" });
      return Object.assign({}, EventRoutingEngine.hall.seat_types, { mode: "seat_types" });
    }
    if (EventRoutingEngine[venueType]) return Object.assign({}, EventRoutingEngine[venueType], { mode: "seat_types" });
    return { label1: "Section", label2: "Row", label3: "Seat", mode: "seat_types", requiresCalculation: true };
  }

  function resolveTripRules(vehicleType) {
    return TripRoutingEngine[vehicleType] || TripRoutingEngine["bus"];
  }

  function calculateEventCapacity(config, l1, l2, l3) {
    var a = parseInt(l1) || 0, b = parseInt(l2) || 0, c = parseInt(l3) || 0;
    if (config.mode === "tables_chairs" || config.label2 === null) return a * c;
    return a * b * c;
  }

  function calculateTripCapacity(activeToggles) {
    var carriage = activeToggles.useCarriage ? (parseInt(activeToggles.carriage) || 1) : 1;
    var coach    = activeToggles.useCoach    ? (parseInt(activeToggles.coach)    || 1) : 1;
    var row      = activeToggles.useRow      ? (parseInt(activeToggles.row)      || 1) : 1;
    var seat     = parseInt(activeToggles.seat) || 1;
    return carriage * coach * row * seat;
  }

  function buildTripSeatPlaceholder(activeToggles) {
    var parts = [];
    if (activeToggles.useCarriage) parts.push("Carriage D");
    if (activeToggles.useCoach)    parts.push("Coach 2");
    if (activeToggles.useRow)      parts.push("Row 5");
    parts.push("Seat A");
    return "e.g., " + parts.join(", ");
  }

  function resolveTableShape(shapeValue) {
    for (var i = 0; i < TableSubTypes.length; i++) if (TableSubTypes[i].value === shapeValue) return TableSubTypes[i];
    return TableSubTypes[0];
  }

  function distributeChairs(shape, requestedChairs) {
    var total = parseInt(requestedChairs) || 0;
    if (shape === "circular") {
      var n = Math.min(total, 10);
      return { shape: "circular", count: n, requested: total, total: n, capped: total > 10 };
    }
    if (shape === "rectangular") {
      var short = total > 0 ? 1 : 0;
      var remaining = Math.max(0, total - (short * 2));
      var topCount = Math.ceil(remaining / 2);
      var bottomCount = Math.floor(remaining / 2);
      return {
        shape: "rectangular",
        top: topCount, bottom: bottomCount, left: short, right: short,
        total: short * 2 + topCount + bottomCount,
        requested: total,
        capped: false
      };
    }
    if (shape === "square") {
      var capped = Math.min(total, 8);
      var perSide = Math.floor(capped / 4);
      var extra = capped % 4;
      return {
        shape: "square",
        top:    perSide + (extra > 0 ? 1 : 0),
        right:  perSide + (extra > 1 ? 1 : 0),
        bottom: perSide + (extra > 2 ? 1 : 0),
        left:   perSide,
        total: capped, requested: total, capped: total > 8
      };
    }
    return { shape: "circular", count: Math.min(total, 10), requested: total, total: Math.min(total, 10), capped: total > 10 };
  }

  /* -----------------------------------------------------------------------
     NEW: SEAT CODE BUILDER
     Combines block letter + row letter + seat number into a code like "AA 1"
     ----------------------------------------------------------------------- */
  function buildSeatCode(block, row, seat) {
    var b = (block || "").toString().trim().toUpperCase();
    var r = (row || "").toString().trim().toUpperCase();
    var n = (seat || "").toString().trim();

    // Standard format: BlockLetter + RowLetter + " " + Number
    var letters = (b + r).trim();
    if (!letters && !n) return "";
    if (!n) return letters;
    if (!letters) return n;
    return letters + " " + n;
  }

  /* -----------------------------------------------------------------------
     NEW: TABLE CHAIR CODE BUILDER
     Combines table number + chair number into "T1 C1"
     ----------------------------------------------------------------------- */
  function buildTableChairCode(tableNum, chairNum) {
    var t = (tableNum || "").toString().trim();
    var c = (chairNum || "").toString().trim();
    if (!t && !c) return "";
    if (!c) return "T" + t;
    if (!t) return "C" + c;
    return "T" + t + " C" + c;
  }

  global.NovalinkRoutingEngine = {
    EventRoutingEngine, TripRoutingEngine,
    StadiumSubTypes, AuditoriumSubTypes, TableSubTypes,
    resolveEventConfig, resolveTripRules, resolveTableShape,
    calculateEventCapacity, calculateTripCapacity,
    buildTripSeatPlaceholder, distributeChairs,
    buildSeatCode, buildTableChairCode
  };

})(window);
