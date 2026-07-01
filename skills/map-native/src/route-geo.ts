import * as turf from "@turf/turf";

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
// CVD-safe qualitative palette (Okabe-Ito 8-colour)
// ---------------------------------------------------------------------------

const QUALITATIVE: string[] = [
  "#E69F00", // orange
  "#56B4E9", // sky blue
  "#009E73", // bluish green
  "#F0E442", // yellow
  "#0072B2", // blue
  "#D55E00", // vermillion
  "#CC79A7", // reddish purple
  "#000000", // black
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RouteConfig {
  type: "route";
  route: [number, number][];
  basemap?: string;
  mapStyle?: string;
  title?: string;
  palette?: string[];
  territories?: Array<{
    key: string;
    label?: string;
    color?: string;
    order?: number;
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
    const inter = turf.lineIntersect(line, f);
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

  // colour (qualitative CVD-safe palette, cycling) + anchor + overrides
  const palette = config.palette ?? QUALITATIVE;
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
