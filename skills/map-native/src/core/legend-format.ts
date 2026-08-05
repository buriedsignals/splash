// core/legend-format — re-exports the shared implementation. See lib/core/legend-format.ts for
// why it moved (registry E16). Kept as a shim so map-native's own callers are untouched — the
// same pattern core/locale.ts already uses.
export * from "../../../../lib/core/legend-format";
