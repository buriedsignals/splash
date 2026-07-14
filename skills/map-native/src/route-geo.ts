import * as turf from "@turf/turf";
import { TITLE_SCENE_FRAMES } from "./video-scene";

// ---------------------------------------------------------------------------
// Map style option space (framework-free tokens; RouteMap maps to MapTiler style)
// ---------------------------------------------------------------------------

export const MAP_STYLES = ["dataviz-light", "dataviz-dark"] as const;
export type MapStyleToken = (typeof MAP_STYLES)[number];

export function resolveMapStyle(token?: string): MapStyleToken {
  if (token && (MAP_STYLES as readonly string[]).includes(token)) {
    return token as MapStyleToken;
  }
  return "dataviz-light";
}

// ---------------------------------------------------------------------------
// CVD-safe qualitative palette (Okabe-Ito, 7 hues — black is dropped so a fill is
// never invisible on a dataviz-dark basemap).
// ---------------------------------------------------------------------------

export const QUALITATIVE: string[] = [
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#009E73", // bluish green
  "#F0E442", // yellow
  "#0072B2", // blue
  "#D55E00", // vermillion
  "#CC79A7", // reddish purple
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RouteConfig {
  type: "route";
  route: [number, number][];
  basemap?: string;
  mapStyle?: string;
  /** Newsroom house ground — themes the frame + legend furniture. Basemap stays light/dark. */
  themeBg?: string;
  title?: string;
  description?: string;
  source?: { name: string; url?: string };
  /** deliverable language — localizes the "Source" furniture label. Default English. */
  lang?: string;
  palette?: string[];
  // Newsroom house style (profile merge). brandHue → the electric route line (a lighter/darker
  // glow derived from it); brandPalette → the territory polygon colours (when no `palette` is
  // set). An explicit `palette` / `territories[].color` always wins.
  brandHue?: string;
  brandPalette?: string[];
  brandExplicit?: boolean;
  territories?: Array<{
    key: string;
    label?: string;
    color?: string;
    order?: number;
    note?: string;
  }>;
}

export interface RouteTerritory {
  key: string;
  label: string;
  color: string;
  order: number;
  anchor: [number, number];
}

export interface RouteLayout {
  route: [number, number][];
  territories: RouteTerritory[];
  bounds: [number, number, number, number]; // [west, south, east, north]
}

export interface RouteRevealTerritory extends RouteTerritory {
  stop: number; // entry arc-length fraction [0,1] along the route
  border: [number, number][][]; // polygon outline ring(s) as coordinate arrays
}

export interface RouteRevealLayout {
  route: [number, number][];
  territories: RouteRevealTerritory[];
  bounds: [number, number, number, number];
  totalLengthKm: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampLat(v: number): number {
  return Math.max(-85, Math.min(85, v));
}

// ---------------------------------------------------------------------------
// computeRoute
// ---------------------------------------------------------------------------

export function computeRoute(
  config: RouteConfig,
  boundaries: GeoJSON.FeatureCollection,
): RouteLayout {
  const line = turf.lineString(config.route);
  const origin = turf.point(config.route[0]);

  // detect crossed territories
  const crossed = boundaries.features.filter((f) =>
    turf.booleanIntersects(line, f),
  );

  // order by arc-length of FIRST entry into each territory. Robust to the route STARTING
  // inside a territory (then its stop is 0, not the exit crossing):
  const firstInsideAlong = (f: GeoJSON.Feature): number => {
    if (
      turf.booleanPointInPolygon(origin, f as GeoJSON.Feature<GeoJSON.Polygon>)
    )
      return 0; // route origin already inside → stop 0
    const inter = turf.lineIntersect(
      line,
      f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
    );
    if (!inter.features.length) return Infinity;
    return Math.min(
      ...inter.features.map((pt) =>
        turf.length(turf.lineSlice(origin, pt, line)),
      ),
    );
  };

  const withStop = crossed
    .map((f) => ({ f, along: firstInsideAlong(f) }))
    .sort((a, b) => a.along - b.along);

  // colour (qualitative CVD-safe palette, cycling) + anchor + overrides. An explicit
  // config.palette wins; else the newsroom house palette (brandPalette); else Okabe-Ito.
  const palette = config.palette ?? config.brandPalette ?? QUALITATIVE;
  const territories: RouteTerritory[] = withStop
    .map(({ f }, i) => {
      const key = String(f.properties?.iso_a3 ?? f.properties?.name ?? i);
      const override = config.territories?.find((t) => t.key === key);
      const anchor = turf.pointOnFeature(f).geometry.coordinates as [
        number,
        number,
      ];
      return {
        key,
        label: override?.label ?? String(f.properties?.name ?? key),
        color: override?.color ?? palette[i % palette.length],
        order: override?.order ?? i,
        anchor,
      };
    })
    .sort((a, b) => a.order - b.order);

  // bounds = route ∪ crossed-territories bbox, latitude-clamped to ±85. The territories are
  // unioned in so the frame includes each crossed polygon's extent (and its label anchor),
  // not just the thin route line.
  const extent = turf.featureCollection([line, ...withStop.map((w) => w.f)]);
  const bb = turf.bbox(extent);
  const bounds: [number, number, number, number] = [
    bb[0],
    clampLat(bb[1]),
    bb[2],
    clampLat(bb[3]),
  ];

  return { route: config.route, territories, bounds };
}

// ---------------------------------------------------------------------------
// computeRouteReveal
// ---------------------------------------------------------------------------

export function computeRouteReveal(
  config: RouteConfig,
  boundaries: GeoJSON.FeatureCollection,
): RouteRevealLayout {
  const line = turf.lineString(config.route);
  const origin = turf.point(config.route[0]);
  const totalLengthKm = turf.length(line);

  // Reuse the same firstInsideAlong logic as computeRoute
  const firstInsideAlong = (f: GeoJSON.Feature): number => {
    if (
      turf.booleanPointInPolygon(origin, f as GeoJSON.Feature<GeoJSON.Polygon>)
    )
      return 0;
    const inter = turf.lineIntersect(
      line,
      f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
    );
    if (!inter.features.length) return Infinity;
    return Math.min(
      ...inter.features.map((pt) =>
        turf.length(turf.lineSlice(origin, pt, line)),
      ),
    );
  };

  const crossed = boundaries.features.filter((f) =>
    turf.booleanIntersects(line, f),
  );

  const withStop = crossed
    .map((f) => ({ f, along: firstInsideAlong(f) }))
    .sort((a, b) => a.along - b.along);

  // explicit config.palette wins; else the newsroom house palette (brandPalette); else Okabe-Ito.
  const palette = config.palette ?? config.brandPalette ?? QUALITATIVE;
  const territories: RouteRevealTerritory[] = withStop
    .map(({ f, along }, i) => {
      const key = String(f.properties?.iso_a3 ?? f.properties?.name ?? i);
      const override = config.territories?.find((t) => t.key === key);
      const anchor = turf.pointOnFeature(f).geometry.coordinates as [
        number,
        number,
      ];

      // stop: entry fraction clamped to [0,1]
      const stop = Math.min(1, Math.max(0, along / totalLengthKm));

      // border: extract coordinate rings from polygonToLine result
      const outline = turf.polygonToLine(
        f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
      );
      let border: [number, number][][];
      if (outline.type === "FeatureCollection") {
        // MultiPolygon → FeatureCollection of LineStrings
        border = outline.features.map(
          (feat) =>
            (feat.geometry as GeoJSON.LineString).coordinates as [
              number,
              number,
            ][],
        );
      } else if (outline.geometry.type === "MultiLineString") {
        border = outline.geometry.coordinates as [number, number][][];
      } else {
        // LineString → single ring
        border = [outline.geometry.coordinates as [number, number][]];
      }

      return {
        key,
        label: override?.label ?? String(f.properties?.name ?? key),
        color: override?.color ?? palette[i % palette.length],
        order: override?.order ?? i,
        anchor,
        stop,
        border,
      };
    })
    .sort((a, b) => a.order - b.order);

  const extent = turf.featureCollection([line, ...withStop.map((w) => w.f)]);
  const bb = turf.bbox(extent);
  const bounds: [number, number, number, number] = [
    bb[0],
    clampLat(bb[1]),
    bb[2],
    clampLat(bb[3]),
  ];

  return { route: config.route, territories, bounds, totalLengthKm };
}

// ---------------------------------------------------------------------------
// routeRevealFrames
// ---------------------------------------------------------------------------

export function routeRevealFrames(territoryCount: number, fps: number): number {
  const DRAW_S = Math.min(12, 5 + territoryCount * 1.2);
  const TAIL_S = 4.2;
  const totalS = DRAW_S + TAIL_S;
  return Math.round(totalS * fps) + TITLE_SCENE_FRAMES;
}
