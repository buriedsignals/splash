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
  // Newsroom house style (set by the profile merge, skills/atelier/src/brand-profile.ts).
  // Univariate: brandHue becomes the single dot accent. Multivariate: brandPalette seeds the
  // per-category colours (cycled). An explicit `categories[].color` always wins.
  brandHue?: string;
  brandPalette?: string[];
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

// Univariate single-hue accent — the ONE place this colour is declared. Dark-safe: mirrors the
// route-geo intent (QUALITATIVE drops black so a fill is never invisible on a dataviz-dark
// basemap) — a near-white dot would read as "no colour", not "blue data", so the dark variant
// reuses the Okabe-Ito sky blue already vetted as CVD-safe elsewhere in this codebase (QUALITATIVE[1])
// rather than inventing a new hue. Both the dot paint and the legend swatch MUST read this token —
// never re-declare the hex literal at a call site (that's the drift this fixes).
export const UNIVARIATE_ACCENT: { light: string; dark: string } = {
  light: "#2171b5",
  dark: "#56B4E9",
};

// The single univariate dot accent. A newsroom house hue (brandHue), when set, WINS as the
// accent in both light and dark (policy b: applied as chosen; a low-contrast one is kept and
// raised as a produce-time review concern, never swapped). Both the dot paint and the legend
// swatch MUST read this — never re-declare the hex at a call site.
export function univariateAccent(dark: boolean, brandHue?: string): string {
  return brandHue ?? (dark ? UNIVARIATE_ACCENT.dark : UNIVARIATE_ACCENT.light);
}

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
  dark = false,
): DotDensityLayout {
  const accent = univariateAccent(dark, data.brandHue);
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

  // Category colours: sorted category order → the newsroom house palette (brandPalette) when set,
  // else QUALITATIVE. An explicit `categories[].color` always wins over the house palette.
  const categories = hasCategories ? data.categories!.map((c) => c.field) : [];
  const categoryPalette =
    data.brandPalette && data.brandPalette.length > 0
      ? data.brandPalette
      : QUALITATIVE;
  const colorByField = new Map<string, string>();
  const legend: { category: string; color: string }[] = [];
  if (hasCategories) {
    data.categories!.forEach((c, i) => {
      const color = c.color ?? categoryPalette[i % categoryPalette.length];
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
        color: hasCategories ? (colorByField.get(field) as string) : accent,
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
