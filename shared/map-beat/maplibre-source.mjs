// twin/shared/map-beat/maplibre-source.mjs
//
// ONE MAPLIBRE DRAWS BOTH HALVES OF A MAP BEAT, and for a while two did.
//
// A beat's plate is baked in a headless browser and its live layer runs on the reader's page. The page
// inlines `maplibre-gl` out of `node_modules` (5.24.0 today, whatever the lockfile says tomorrow); the bakes
// fetched a version pinned by hand from unpkg, and one template had been left at 4.7.1 — so the plate under
// the marks and the map over it were drawn by two MAJORS of the same renderer, which is precisely the pair
// the web-map format insists must be one camera. Measured 2026-09-23.
//
// It also took a network round trip inside a bake that is otherwise offline and cache-served, so a bake
// could fail on a train for a file sitting in `node_modules` all along.
//
// Resolving from the lockfile makes the version a fact of the install rather than a number somebody has to
// remember to change in six places.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const requireFrom = createRequire(import.meta.url);

/** The renderer's own source and stylesheet, as text, ready to inline into a bake's page. */
export function mapLibreSource() {
  return {
    js: readFileSync(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8"),
    css: readFileSync(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8"),
    version: JSON.parse(readFileSync(requireFrom.resolve("maplibre-gl/package.json"), "utf8")).version,
  };
}
