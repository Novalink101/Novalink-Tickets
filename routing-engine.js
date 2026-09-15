/* ==========================================================================
   NOVALINK — DYNAMIC ROUTING ENGINE
   Shared configuration matrices and helper functions for the
   Ticket & Security Card Studio (Event Studio + Trip Studio).
   ========================================================================== */

(function (global) {
  'use strict';

  /* -----------------------------------------------------------------------
     PART 1: EVENT ROUTING MATRIX
     ----------------------------------------------------------------------- */
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

  /* -----------------------------------------------------------------------
     PART 2: STADIUM SUB-TYPE OPTIONS
     ----------------------------------------------------------------------- */
  const StadiumSubTypes = [
    { value: "horseshoe",   label: "Horseshoe" },
    { value: "rectangular", label: "Rectangular" },
    { value: "one_stand",   label: "1 Stand" },
    { value: "arena",       label: "Arena" },
    { value: "octagonal",   label: "Octagonal" }
  ];

  /* -----------------------------------------------------------------------
     PART 3: AUDITORIUM SUB-TYPE OPTIONS
     ----------------------------------------------------------------------- */
  const AuditoriumSubTypes = [
    { value: "traverse",    label: "Traverse / Alley Layout" },
    { value: "continental", label: "Continental Seating Layout" },
    { value: "straight",    label: "Straight Row Layout" }
  ];

  /* -----------------------------------------------------------------------
     PART 4: TABLE SHAPE SUB-TYPE OPTIONS
     Only shown when Hall is in Tables & Chairs mode.
     Includes maxChairs metadata for validation.
     ----------------------------------------------------------------------- */
  const TableSubTypes = [
    {
      value: "circular",
      label: "Circular Table",
      maxChairs: 10,
      description: "Up to 10 chairs placed evenly around the table."
    },
    {
      value: "rectangular",
      label: "Rectangular Table",
      maxChairs: 12,
      description: "Chairs split across long sides. Max 1 chair on each short side."
    },
    {
      value: "square",
      label: "Square Table",
      maxChairs: 8,
      description: "Up to 2 chairs per side (max 8 total)."
    }
  ];

  /* -----------------------------------------------------------------------
     PART 5: TRIP ROUTING MATRIX
     ----------------------------------------------------------------------- */
  const TripRoutingEngine = {
    "bus":     { term_coach: false, term_carriage: false, term_row: true,  term_seat: true },
    "plane":   { term_coach: false, term_carriage: false, term_row: true,  term_seat: true },
    "train":   { term_coach: true,  term_carriage: true,  term_row: true,  term_seat: true },
    "shuttle": { term_coach: false, term_carriage: false, term_row: false, term_seat: true }
  };

  /* -----------------------------------------------------------------------
     PART 6: HELPER — EVENT CONFIG RESOLVER
     ----------------------------------------------------------------------- */
  function resolveEventConfig(venueType, isTablesMode) {
    if (venueType === "hall") {
      if (isTablesMode) {
        return Object.assign({}, EventRoutingEngine.hall.tables_chairs, { mode: "tables_chairs" });
      }
      return Object.assign({}, EventRoutingEngine.hall.seat_types, { mode: "seat_types" });
    }
    if (EventRoutingEngine[venueType]) {
      return Object.assign({}, EventRoutingEngine[venueType], { mode: "seat_types" });
    }
    return { label1: "Section", label2: "Row", label3: "Seat", mode: "seat_types", requiresCalculation: true };
  }

  /* -----------------------------------------------------------------------
     PART 7: HELPER — TRIP RULES RESOLVER
     ----------------------------------------------------------------------- */
  function resolveTripRules(vehicleType) {
    return TripRoutingEngine[vehicleType] || TripRoutingEngine["bus"];
  }

  /* -----------------------------------------------------------------------
     PART 8: HELPER — EVENT CAPACITY CALCULATOR
     ----------------------------------------------------------------------- */
  function calculateEventCapacity(config, l1, l2, l3) {
    var a = parseInt(l1) || 0;
    var b = parseInt(l2) || 0;
    var c = parseInt(l3) || 0;
    if (config.mode === "tables_chairs" || config.label2 === null) return a * c;
    return a * b * c;
  }

  /* -----------------------------------------------------------------------
     PART 9: HELPER — TRIP CAPACITY CALCULATOR
     ----------------------------------------------------------------------- */
  function calculateTripCapacity(activeToggles) {
    var carriage = activeToggles.useCarriage ? (parseInt(activeToggles.carriage) || 1) : 1;
    var coach    = activeToggles.useCoach    ? (parseInt(activeToggles.coach)    || 1) : 1;
    var row      = activeToggles.useRow      ? (parseInt(activeToggles.row)      || 1) : 1;
    var seat     = parseInt(activeToggles.seat) || 1;
    return carriage * coach * row * seat;
  }

  /* -----------------------------------------------------------------------
     PART 10: HELPER — TRIP SEAT PLACEHOLDER
     ----------------------------------------------------------------------- */
  function buildTripSeatPlaceholder(activeToggles) {
    var parts = [];
    if (activeToggles.useCarriage) parts.push("Carriage D");
    if (activeToggles.useCoach)    parts.push("Coach 2");
    if (activeToggles.useRow)      parts.push("Row 5");
    parts.push("Seat A");
    return "e.g., " + parts.join(", ");
  }

  /* -----------------------------------------------------------------------
     PART 11: HELPER — TABLE SHAPE CONFIG RESOLVER
     Returns the shape metadata including maxChairs.
     ----------------------------------------------------------------------- */
  function resolveTableShape(shapeValue) {
    for (var i = 0; i < TableSubTypes.length; i++) {
      if (TableSubTypes[i].value === shapeValue) return TableSubTypes[i];
    }
    return TableSubTypes[0]; // fallback to circular
  }

  /* -----------------------------------------------------------------------
     PART 12: HELPER — CHAIR DISTRIBUTOR
     Given a shape and a requested chair count, returns an object describing
     how many chairs should be placed on each side (or around for circular).
     Enforces the max chair limits for each shape.
     ----------------------------------------------------------------------- */
  function distributeChairs(shape, requestedChairs) {
    var total = parseInt(requestedChairs) || 0;

    if (shape === "circular") {
      // Cap at 10 chairs
      var n = Math.min(total, 10);
      return { shape: "circular", count: n, requested: total, capped: total > 10 };
    }

    if (shape === "rectangular") {
      // Max 1 chair on each short side (left/right)
      // Remaining chairs distributed evenly on top/bottom (long sides)
      var short = total > 0 ? 1 : 0;
      var remaining = Math.max(0, total - (short * 2));
      var topCount = Math.ceil(remaining / 2);
      var bottomCount = Math.floor(remaining / 2);
      return {
        shape: "rectangular",
        top: topCount,
        bottom: bottomCount,
        left: short,
        right: short,
        total: short * 2 + topCount + bottomCount,
        requested: total,
        capped: false
      };
    }

    if (shape === "square") {
      // Max 2 chairs per side, total max 8
      var capped = Math.min(total, 8);
      var perSide = Math.floor(capped / 4);
      var extra = capped % 4;
      return {
        shape: "square",
        top:    perSide + (extra > 0 ? 1 : 0),
        right:  perSide + (extra > 1 ? 1 : 0),
        bottom: perSide + (extra > 2 ? 1 : 0),
        left:   perSide,
        total: capped,
        requested: total,
        capped: total > 8
      };
    }

    // Fallback
    return { shape: "circular", count: Math.min(total, 10), requested: total, capped: total > 10 };
  }

  /* -----------------------------------------------------------------------
     PART 13: EXPORT TO GLOBAL SCOPE
     ----------------------------------------------------------------------- */
  global.NovalinkRoutingEngine = {
    EventRoutingEngine: EventRoutingEngine,
    TripRoutingEngine: TripRoutingEngine,
    StadiumSubTypes: StadiumSubTypes,
    AuditoriumSubTypes: AuditoriumSubTypes,
    TableSubTypes: TableSubTypes,
    resolveEventConfig: resolveEventConfig,
    resolveTripRules: resolveTripRules,
    resolveTableShape: resolveTableShape,
    calculateEventCapacity: calculateEventCapacity,
    calculateTripCapacity: calculateTripCapacity,
    buildTripSeatPlaceholder: buildTripSeatPlaceholder,
    distributeChairs: distributeChairs
  };

})(window);
