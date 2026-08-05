// world-geometry.ts — the scrolly track's OWN topojson decoder.
//
// Extracted from Scrolly.tsx so ScrollyRouteMap can share it. It could not simply import
// map-native's `resolveVideoGeometry`: the import guard (skills/splash) forbids an engine
// reaching into a SIBLING's `src/core` for a shared primitive — that is what `lib/core` is for —
// and it is right to. A scrolly decoding its own injected geometry, with its own refusal
// wording, is the same shape every sibling component here already had inline.

import { feature as topoFeature } from "topojson-client";
import type { Topology } from "topojson-specification";

export function decodeWorldGeometry(
  geometry: Topology | undefined,
  label: string,
): GeoJSON.FeatureCollection {
  if (!geometry)
    throw new Error(
      `scrolly story (${label}): config.geometry is required (injected by produce; there is no bundled basemap geometry anymore — D5)`,
    );
  const objectName = Object.keys(geometry.objects)[0]!;
  return topoFeature(
    geometry,
    geometry.objects[objectName]!,
  ) as unknown as GeoJSON.FeatureCollection;
}
