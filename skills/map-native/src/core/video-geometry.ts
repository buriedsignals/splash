// video-geometry.ts — the video family's (ChoroplethStory/ChoroplethReveal, Task 7) read of the
// geometry produce.mjs injects into `config.geometry`. Mirrors ChoroplethMap.tsx's interactive
// path (Task 16/20): decode the injected Topology, prefer `config.geography.joinKey` over the
// legacy `basemap`-derived default, and fail loud (no bundled fallback exists — D5) instead of
// fetching a static `world.geojson` from the video's own public bundle.
//
// Factored into its own pure module (rather than duplicated inline in each component, which is
// ChoroplethMap.tsx's own style) for two reasons: it lets both video compositions read geometry
// identically instead of drifting — the exact class of defect ("two files doing the same thing
// differently") that already cost several Criticals on this codebase's earlier geography work —
// and it makes the resolution itself unit-testable without a WebGL context, which neither
// component can be (no test anywhere in this repo renders a MapTiler-backed component; it needs
// a real canvas). RouteReveal.parity.test.ts set the precedent for this shape: extract the pure
// core out of a Remotion composition, lock it with a parity test, leave the component thin.
import { feature as topoFeature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { resolveBasemapMeta, type GeographyRef } from "../basemaps";

/** The subset of a choropleth video config this module reads. Both ChoroplethStoryConfig and
 *  ChoroplethRevealProps['config'] satisfy this structurally. */
export interface VideoGeometryConfig {
  /** Legacy shape: the basemap name alone (e.g. "world"). Superseded by `geography` below when
   *  present, kept as the fallback so an older config still resolves a joinKey. */
  basemap?: string;
  /** Which geography (set/scope/joinKey) `geometry` names (GeographyRef, Task 4/9/10). */
  geography?: GeographyRef;
  /** The actual subset TopoJSON, injected by produce (Task 20). There is no bundled fallback
   *  geometry anymore (D5) — required at render time even though it stays optional in the type
   *  for configs assembled before Task 20 lands. */
  geometry?: Topology;
}

export interface ResolvedVideoGeometry {
  world: GeoJSON.FeatureCollection;
  joinKey: string;
}

/** Decodes `config.geometry` and resolves the region-matching join key. `callSite` names the
 *  composition in the thrown error so a missing geometry fails loud with its own origin, the
 *  same "loud, named failure instead of a bare TypeError" discipline ChoroplethMap.tsx already
 *  applies. */
export function resolveVideoGeometry(
  config: VideoGeometryConfig,
  callSite: string,
): ResolvedVideoGeometry {
  const geography =
    config.geography ??
    ({
      joinKey: resolveBasemapMeta(config.basemap ?? "world").joinKey,
    } as Pick<GeographyRef, "joinKey">);
  const joinKey = geography.joinKey;

  if (!config.geometry)
    throw new Error(
      `${callSite}: config.geometry is required (injected by produce; there is no bundled basemap geometry anymore — D5)`,
    );
  const topology = config.geometry;
  const objectName = Object.keys(topology.objects)[0]!;
  const world = topoFeature(
    topology,
    topology.objects[objectName]!,
  ) as unknown as GeoJSON.FeatureCollection;

  return { world, joinKey };
}
