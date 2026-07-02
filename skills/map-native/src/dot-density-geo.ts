// Pure core for the dot-density map: joins rows→regions (choropleth pattern), auto-derives a "nice"
// dotValue targeting a readable total dot count, and allocates dots per region (and per category in
// the multivariate regime). No MapTiler, no React. The component turns the output into a dot GeoJSON
// via dot-scatter's scatterInPolygon.
import { bbox } from "@turf/turf";
import { mainlandFeature } from "./choropleth-geo";
import { hashSeed } from "./dot-scatter";
import { QUALITATIVE } from "./route-geo";

export interface DotDensityData {
  regionKey: string;
  valueField?: string;
  categories?: { field: string; label: string; color?: string }[];
  rows: Record<string, string | number>[];
  dotValue?: number;
}
export interface RegionDotSpec {
  key: string;
  feature: GeoJSON.Feature;
  groups: {
    category: string | null;
    color: string;
    count: number;
    seed: number;
  }[];
}
export interface DotDensityLayout {
  regions: RegionDotSpec[];
  dotValue: number;
  categories: string[];
  legend: { category: string; color: string }[];
  bounds: [number, number, number, number];
  hasCategories: boolean;
  capped: boolean;
  totalDots: number;
  unmatched: string[];
}

const TARGET_TOTAL_DOTS = 5000;
const MAX_TOTAL_DOTS = 10000;
const ACCENT = "#2171b5"; // univariate single hue

// Round up to a "nice" number (1/2/5 × 10^k) ≥ raw.
function niceValue(raw: number): number {
  const r = Math.max(1, raw);
  const mag = Math.pow(10, Math.floor(Math.log10(r)));
  const norm = r / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

export function computeDotDensity(
  data: DotDensityData,
  features: GeoJSON.FeatureCollection,
  joinKey: string,
): DotDensityLayout {
  const hasCategories = !!(data.categories && data.categories.length > 0);
  const fields = hasCategories
    ? data.categories!.map((c) => c.field)
    : [data.valueField as string];

  // rows → region key → per-field value
  const byKey = new Map<string, number[]>();
  for (const row of data.rows) {
    const key = String(row[data.regionKey]);
    const vals = fields.map((f) => {
      const v = Number(row[f]);
      if (Number.isNaN(v))
        throw new Error(
          `dot-density: invalid value for "${f}" in region ${key}`,
        );
      return v;
    });
    byKey.set(key, vals);
  }

  const featureKeys = new Set(
    features.features.map((f) => String(f.properties?.[joinKey])),
  );
  const unmatched = [...byKey.keys()].filter((k) => !featureKeys.has(k));

  const totalUnits = [...byKey.values()].reduce(
    (s, vals) => s + vals.reduce((a, b) => a + b, 0),
    0,
  );
  if (totalUnits <= 0)
    throw new Error("dot-density: no positive values — nothing to map");

  const dotValue = data.dotValue ?? niceValue(totalUnits / TARGET_TOTAL_DOTS);

  // Category colours: sorted category order → QUALITATIVE (override via categories[].color).
  const categories = hasCategories ? data.categories!.map((c) => c.field) : [];
  const colorByField = new Map<string, string>();
  const legend: { category: string; color: string }[] = [];
  if (hasCategories) {
    data.categories!.forEach((c, i) => {
      const color = c.color ?? QUALITATIVE[i % QUALITATIVE.length];
      colorByField.set(c.field, color);
      legend.push({ category: c.label, color });
    });
  }

  let totalDots = 0;
  const regions: RegionDotSpec[] = [];
  for (const f of features.features) {
    const key = String(f.properties?.[joinKey]);
    const vals = byKey.get(key);
    if (!vals) continue; // no data for this region
    const groups = fields.map((field, i) => {
      const count = Math.round(vals[i] / dotValue);
      totalDots += count;
      return {
        category: hasCategories ? field : null,
        color: hasCategories ? (colorByField.get(field) as string) : ACCENT,
        count,
        seed: hashSeed(`${key}|${i}`),
      };
    });
    regions.push({ key, feature: f, groups });
  }

  const withData = {
    type: "FeatureCollection",
    features: regions.map((r) => mainlandFeature(r.feature)),
  } as GeoJSON.FeatureCollection;
  const bounds = (
    withData.features.length ? bbox(withData) : [-180, -85, 180, 85]
  ) as [number, number, number, number];

  return {
    regions,
    dotValue,
    categories,
    legend,
    bounds,
    hasCategories,
    capped: totalDots > MAX_TOTAL_DOTS,
    totalDots,
    unmatched,
  };
}
