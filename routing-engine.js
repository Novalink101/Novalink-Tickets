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
     Displayed when "Stadium" is selected.
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
     Displayed when "Auditorium" is selected.
     ----------------------------------------------------------------------- */
  const AuditoriumSubTypes = [
    { value: "traverse",    label: "Traverse / Alley Layout" },
    { value: "continental", label: "Continental Seating Layout" },
    { value: "straight",    label: "Straight Row Layout" }
  ];

  /* -----------------------------------------------------------------------
     PART 4: TRIP ROUTING MATRIX
     ----------------------------------------------------------------------- */
  const TripRoutingEngine = {
    "bus":     { term_coach: false, term_carriage: false, term_row: true,  term_seat: true },
    "plane":   { term_coach: false, term_carriage: false, term_row: true,  term_seat: true },
    "train":   { term_coach: true,  term_carriage: true,  term_row: true,  term_seat: true },
    "shuttle": { term_coach: false, term_carriage: false, term_row: false, term_seat: true }
  };

  /* -----------------------------------------------------------------------
     PART 5: HELPER — EVENT CONFIG RESOLVER
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
     PART 6: HELPER — TRIP RULES RESOLVER
     ----------------------------------------------------------------------- */
  function resolveTripRules(vehicleType) {
    return TripRoutingEngine[vehicleType] || TripRoutingEngine["bus"];
  }

  /* -----------------------------------------------------------------------
     PART 7: HELPER — EVENT CAPACITY CALCULATOR
     ----------------------------------------------------------------------- */
  function calculateEventCapacity(config, l1, l2, l3) {
    var a = parseInt(l1) || 0;
    var b = parseInt(l2) || 0;
    var c = parseInt(l3) || 0;

    if (config.mode === "tables_chairs" || config.label2 === null) {
      return a * c;
    }
    return a * b * c;
  }

  /* -----------------------------------------------------------------------
     PART 8: HELPER — TRIP CAPACITY CALCULATOR
     ----------------------------------------------------------------------- */
  function calculateTripCapacity(activeToggles) {
    var carriage = activeToggles.useCarriage ? (parseInt(activeToggles.carriage) || 1) : 1;
    var coach    = activeToggles.useCoach    ? (parseInt(activeToggles.coach)    || 1) : 1;
    var row      = activeToggles.useRow      ? (parseInt(activeToggles.row)      || 1) : 1;
    var seat     = parseInt(activeToggles.seat) || 1;

    return carriage * coach * row * seat;
  }

  /* -----------------------------------------------------------------------
     PART 9: HELPER — TRIP SEAT PLACEHOLDER
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
     PART 10: EXPORT TO GLOBAL SCOPE
     ----------------------------------------------------------------------- */
  global.NovalinkRoutingEngine = {
    EventRoutingEngine: EventRoutingEngine,
    TripRoutingEngine: TripRoutingEngine,
    StadiumSubTypes: StadiumSubTypes,
    AuditoriumSubTypes: AuditoriumSubTypes,
    resolveEventConfig: resolveEventConfig,
    resolveTripRules: resolveTripRules,
    calculateEventCapacity: calculateEventCapacity,
    calculateTripCapacity: calculateTripCapacity,
    buildTripSeatPlaceholder: buildTripSeatPlaceholder
  };

})(window);
