// src/furniture-i18n — re-exports the shared implementation. See
// lib/core/i18n-furniture.ts (the canonical source: this file's own body until the
// shared-core extraction) for the full rationale — the produce-time i18n FURNITURE
// GATE (quality audit P5) shared with map-dw. One cosmetic wording difference from the
// pre-extraction text was resolved to the neutral "deliverable" (was "chart" here,
// "map" in map-dw) — no test asserted the literal word; see lib/core/i18n-furniture.test.ts.
export * from "../../../lib/core/i18n-furniture";
