// skills/map-native/src/basemaps.ts — thin re-export shim. The basemap registry moved to
// lib/geo/ref.ts (geography-anywhere design D10) so it can be shared with the loop's manifest
// and produce-time subset pipeline without a skills/ → skills/ reach. This shim exists only so
// this package's own importers (validate-config.ts's six validateBasemap call sites, geo-match.ts,
// ChoroplethMap.tsx and its siblings) keep their import path unchanged. Same move
// theme/house-ramp.ts already made for lib/core/house-ramp.ts.
export * from "../../../lib/geo/ref";
