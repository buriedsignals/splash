import { bbox, area, polygon } from "@turf/turf";
import { resolvePalette, type PaletteRequest } from "./theme/scale";

// Reduce a feature to its largest-area polygon — the "mainland". Natural Earth
// admin-0 features are MultiPolygons that bundle far-flung overseas territories
// (NOR→Svalbard, FRA→French Guiana/Réunion, ESP→Canaries); a naive bbox over the
// whole MultiPolygon stretches to the world. Framing to the mainland ring keeps
// the data zone tight without cropping the country's main coastline.
export function mainlandFeature(f: GeoJSON.Feature): GeoJSON.Feature {
  const g = f.geometry;
  if (g.type !== "MultiPolygon") return f;
  let best: number[][][] | null = null;
  let bestArea = -1;
  for (const rings of g.coordinates) {
    const a = area(polygon(rings));
    if (a > bestArea) {
      bestArea = a;
      best = rings;
    }
  }
  if (!best) return f;
  return {
    type: "Feature",
    properties: f.properties,
    geometry: { type: "Polygon", coordinates: best },
  };
}

// Mainland bbox of a single region — slice-1b's largest-polygon framing, per region.
export function regionBounds(
  f: GeoJSON.Feature,
): [number, number, number, number] {
  return bbox(mainlandFeature(f)) as [number, number, number, number];
}

export interface ChoroplethData {
  regionKey: string;
  valueField: string;
  rows: Record<string, string | number>[];
}
export interface ChoroplethOptions {
  bins?: number;
  scaleType?: "sequential" | "diverging";
  midpoint?: number;
  // A named registry palette (e.g. "oranges", "rdbu") or a custom CVD-safe ramp.
  // The palette's kind must match scaleType; if absent, the library default for the
  // scaleType is used (back-compat: sequential → blues, diverging → orbu).
  palette?: PaletteRequest;
}
export interface ChoroplethLayout {
  joined: { key: string; value: number | null }[];
  bins: { min: number; max: number; color: string }[];
  bounds: [number, number, number, number];
  noData: string[];
  unmatched: string[];
  scaleType: "sequential" | "diverging";
}

export function computeChoropleth(
  data: ChoroplethData,
  features: GeoJSON.FeatureCollection,
  joinKey: string,
  options: ChoroplethOptions = {},
): ChoroplethLayout {
  const nBins = options.bins ?? 5;
  const scaleType = options.scaleType ?? "sequential";
  const ramp = resolvePalette(scaleType, options.palette).ramp;

  const byKey = new Map<string, number>();
  for (const r of data.rows) {
    const v = Number(r[data.valueField]);
    if (Number.isNaN(v))
      throw new Error(`invalid choropleth value: ${r[data.valueField]}`);
    byKey.set(String(r[data.regionKey]), v);
  }
  const featureKeys = new Set(
    features.features.map((f) => String(f.properties?.[joinKey])),
  );
  const unmatched = [...byKey.keys()].filter((k) => !featureKeys.has(k));

  const joined = features.features.map((f) => {
    const key = String(f.properties?.[joinKey]);
    const value = byKey.has(key) ? byKey.get(key)! : null;
    return { key, value };
  });
  const noData = joined.filter((j) => j.value === null).map((j) => j.key);

  const values = joined
    .map((j) => j.value)
    .filter((v): v is number => v !== null);

  if (values.length === 0) {
    throw new Error("choropleth: no region matched the data — nothing to map");
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  let bins: { min: number; max: number; color: string }[];

  if (scaleType === "diverging") {
    const mid = options.midpoint ?? (min + max) / 2;
    const maxDev = Math.max(...values.map((v) => Math.abs(v - mid))) || 1;
    const binMin = mid - maxDev;
    const binMax = mid + maxDev;
    const binSpan = binMax - binMin || 1;

    bins = Array.from({ length: nBins }, (_, i) => {
      const lo = binMin + (binSpan * i) / nBins;
      const hi = binMin + (binSpan * (i + 1)) / nBins;
      const colorIdx =
        nBins === 1
          ? Math.round((ramp.length - 1) / 2)
          : Math.round((i / (nBins - 1)) * (ramp.length - 1));
      return {
        min: lo,
        max: hi,
        color: ramp[colorIdx],
      };
    });
  } else {
    // sequential scale
    const span = max - min || 1;
    bins = Array.from({ length: nBins }, (_, i) => {
      const lo = min + (span * i) / nBins;
      const hi = min + (span * (i + 1)) / nBins;
      const colorIdx =
        nBins === 1
          ? Math.round((ramp.length - 1) / 2)
          : Math.round((i / (nBins - 1)) * (ramp.length - 1));
      return {
        min: lo,
        max: hi,
        color: ramp[colorIdx],
      };
    });
  }

  // bbox of regions that HAVE data → basemap-fit to the story extent
  const withData = {
    type: "FeatureCollection",
    features: features.features.filter((f) =>
      byKey.has(String(f.properties?.[joinKey])),
    ),
  } as GeoJSON.FeatureCollection;
  const fitSource = withData.features.length ? withData : features;
  const mainland = {
    type: "FeatureCollection",
    features: fitSource.features.map(mainlandFeature),
  } as GeoJSON.FeatureCollection;
  const bounds = bbox(mainland) as [number, number, number, number];

  return { joined, bins, bounds, noData, unmatched, scaleType };
}
