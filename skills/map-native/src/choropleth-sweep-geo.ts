// choropleth-sweep-geo.ts — the ONE part of the choropleth's sweep that needs geometry.
//
// ★ WHY IT HAS ITS OWN FILE. Everything else in `choropleth-sweep.ts` reads rows and nothing more,
// and the spine's validator (`validate-config.ts`) imports it BEFORE any map exists. Keeping this
// function beside the others pulled `choropleth-geo.ts` — and through it `@turf/turf` — into
// produce-all's import closure, which `skills/splash/tests/validate-closure.test.ts` exists to
// forbid: the validation path must stay loadable without a render engine. Twenty-five spine tests
// went red on it. The split is not tidiness, it is the guard.

import { regionBounds } from "./choropleth-geo";

/**
 * WHERE EACH REGION IS — the centre of the very box the beats' cameras frame.
 *
 * Deliberately `regionBounds`, the same mainland bbox map-story.ts's `cameraOf` uses per reveal
 * beat, rather than a second geometry pass of its own: one notion of "this region's extent" for
 * the camera and for the sweep.
 *
 * Not the pole of inaccessibility (`anchorByKey` in ChoroplethStory): that one is scoped to the
 * handful of regions a reveal beat visits precisely BECAUSE it costs ~400ms a feature, and the
 * sweep needs a position for every region carrying data. A bbox centre is the right precision
 * here anyway — this ORDERS regions along a bearing, it does not point at anything.
 */
export function regionCentroids(
  world: GeoJSON.FeatureCollection,
  joinKey: string,
  keys: readonly string[],
): Map<string, [number, number]> {
  const wanted = new Set(keys);
  const out = new Map<string, [number, number]>();
  for (const f of world.features) {
    const key = String(f.properties?.[joinKey] ?? "");
    if (!wanted.has(key) || out.has(key) || !f.geometry) continue;
    try {
      const [w, s, e, n] = regionBounds(f);
      out.set(key, [(w + e) / 2, (s + n) / 2]);
    } catch {
      // Degenerate geometry — this region simply has no position, so `space` lands it at the
      // end rather than somewhere invented. Same treatment as a missing date.
    }
  }
  return out;
}
