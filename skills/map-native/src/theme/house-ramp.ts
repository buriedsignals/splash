// theme/house-ramp — thin re-export shim. The house-colour-ramp primitives
// (houseRamp/isMonotonicLuminanceRamp/contrastOk/houseFill/houseRouteAccent/
// DEFAULT_MAP_FILL) moved to lib/core/house-ramp.ts so map-dw and
// scrolly (previously an import-guard-allowlisted cross-engine reach into this file)
// import a shared primitive from lib/core like every other engine. This shim exists
// only so map-native's own in-engine importers (choropleth-geo, hex-grid-geo,
// SymbolMap/RouteMap and their Scrolly/Reveal/Story siblings, core/map-produce-
// conformance, theme/scale, and this package's own tests) keep working unchanged.
//
// relativeLuminance is re-exported here too (map-native's own tests import it from
// this path) but NOT from lib/core/house-ramp.ts itself — it lives at
// lib/core/contrast.ts, house-ramp.ts merely reuses it.
export * from "../../../../lib/core/house-ramp";
export { relativeLuminance } from "../../../../lib/core/contrast";
