/* ==========================================================================
   NOVALINK — DYNAMIC ROUTING ENGINE
   Shared configuration matrices and helper functions for the
   Ticket & Security Card Studio (Event Studio + Trip Studio).
   ========================================================================== */

(function (global) {
  'use strict';

  /* -----------------------------------------------------------------------
     PART 1: EVENT ROUTING MATRIX
     Used by create-event.html
     Maps venue type → label configuration and calculation rules.
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
     PART 2: TRIP ROUTING MATRIX
     Used by create-trip.html
     Maps vehicle type → which structural terms (Carriage / Coach / Row / Seat)
     are available for the organizer to toggle on or off.
     ----------------------------------------------------------------------- */
  const TripRoutingEngine = {
    "bus":     { term_coach: false, term_carriage: false, term_row: true,  term_seat: true },
    "plane":   { term_coach: false, term_carriage: false, term_row: true,  term_seat: true },
    "train":   { term_coach: true,  term_carriage: true,  term_row: true,  term_seat: true },
    "shuttle": { term_coach: false, term_carriage: false, term_row: false, term_seat: true }
  };

  /* -----------------------------------------------------------------------
     PART 3: SHARED HELPER — EVENT CONFIG RESOLVER
     Given a venue type and a hall-layout toggle state, returns the
     active label configuration for the event form.
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
    // Fallback
    return { label1: "Section", label2: "Row", label3: "Seat", mode: "seat_types", requiresCalculation: true };
  }

  /* -----------------------------------------------------------------------
     PART 4: SHARED HELPER — TRIP RULES RESOLVER
     Given a vehicle type, returns the toggle rules.
     ----------------------------------------------------------------------- */
  function resolveTripRules(vehicleType) {
    return TripRoutingEngine[vehicleType] || TripRoutingEngine["bus"];
  }

  /* -----------------------------------------------------------------------
     PART 5: SHARED HELPER — CAPACITY CALCULATOR (EVENT MODE)
     Multiplies the active event inputs.
       - Tables & Chairs mode: Table × Chair
       - All other modes:      Section × Row × Seat
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
     PART 6: SHARED HELPER — CAPACITY CALCULATOR (TRIP MODE)
     Multiplies only the components that are toggled ON.
     ----------------------------------------------------------------------- */
  function calculateTripCapacity(activeToggles) {
    var carriage = activeToggles.useCarriage ? (parseInt(activeToggles.carriage) || 1) : 1;
    var coach    = activeToggles.useCoach    ? (parseInt(activeToggles.coach)    || 1) : 1;
    var row      = activeToggles.useRow      ? (parseInt(activeToggles.row)      || 1) : 1;
    var seat     = parseInt(activeToggles.seat) || 1;

    return carriage * coach * row * seat;
  }

  /* -----------------------------------------------------------------------
     PART 7: SHARED HELPER — SEAT LABEL BUILDER (TRIP MODE)
     Constructs a placeholder string like "Carriage D, Coach 2, Row 5, Seat A"
     based on which components are active.
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
     PART 8: EXPORT TO GLOBAL SCOPE
     Both HTML pages can now access these via window.NovalinkRoutingEngine
     ----------------------------------------------------------------------- */
  global.NovalinkRoutingEngine = {
    // Matrices
    EventRoutingEngine: EventRoutingEngine,
    TripRoutingEngine: TripRoutingEngine,

    // Resolvers
    resolveEventConfig: resolveEventConfig,
    resolveTripRules: resolveTripRules,

    // Calculators
    calculateEventCapacity: calculateEventCapacity,
    calculateTripCapacity: calculateTripCapacity,

    // Label builders
    buildTripSeatPlaceholder: buildTripSeatPlaceholder
  };

})(window);
