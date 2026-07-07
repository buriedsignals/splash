// The canonical list of map-native types reachable from `mount.tsx`'s config
// discriminator (single source of truth — see `tests/map-types.test.ts` for the
// drift-test that keeps this in sync with `mount.tsx`). `contour` is omitted:
// it was designed but never built, so it has no discriminator and no component.
export const MAP_TYPES = [
  "choropleth",
  "symbol",
  "route",
  "locator",
  "dot-density",
  "hex-grid",
  "cartogram",
] as const;

export type MapType = (typeof MAP_TYPES)[number];
