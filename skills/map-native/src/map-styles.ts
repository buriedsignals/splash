// map-styles.ts — the map style option space (framework-free tokens; RouteMap maps
// them to a MapTiler style). Runtime-free ON PURPOSE: validate-config (inside the
// splash validate-gate closure) needs MAP_STYLES without dragging @turf/turf (a
// map-native-local dependency, imported at route-geo's top level) into a
// pure-validation import graph — a Datawrapper-only produce-all must load on a
// machine where skills/map-native's node_modules is not installed
// (skills/splash/tests/validate-closure.test.ts is the drift guard).
export const MAP_STYLES = ["dataviz-light", "dataviz-dark"] as const;
export type MapStyleToken = (typeof MAP_STYLES)[number];

export function resolveMapStyle(token?: string): MapStyleToken {
  if (token && (MAP_STYLES as readonly string[]).includes(token)) {
    return token as MapStyleToken;
  }
  return "dataviz-light";
}
