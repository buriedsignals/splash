// The shape a brand-colour tradeoff is RECORDED as (D25, spec §4.3) — a house colour that is
// not colour-blind-safe, or fails value-label contrast, is SHIPPED (the newsroom's charter
// outranks the guard), never silently dropped, and never blocking.
//
// It used to be a bare `string` (skills/chart-native/src/core/conformance.ts's
// BrandReconciliation), which is exactly why nothing downstream could read it: the hex was
// only recoverable by re-parsing English prose. Types only, zero dependency — lib/core imports
// nothing — so both the minter (skills/chart-native/src/core/conformance.ts) and the reader
// (lib/verify/colour-announcement.ts) import ONE definition instead of each holding a copy.
// Re-exported from conformance.ts, the same pattern as lib/core/i18n-furniture.ts re-exported
// by skills/dw-chart/src/furniture-i18n.ts.
export type BrandConcern = {
  kind: "cvd" | "contrast";
  colour: string;
  reason: string;
  /** The accessible hue closest to `colour` (nearestOkabeIto, lib/core/nearest-okabe-ito.ts).
   *  A PROPOSAL — nothing here applies it automatically, and it is absent for a "contrast"
   *  concern (a contrast tradeoff is not fixed by swapping hue). */
  nearestAccessible?: string;
};
