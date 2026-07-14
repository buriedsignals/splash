// Cartogram core — two deterministic families. `scaled`: scale each real region polygon around its own
// centroid so area ∝ value (turf.transformScale, factor = sqrt(value/max)). `grid`: one uniform square
// per region placed by a stable nearest-free-cell auto-layout keyed on the region's true centroid. Colour
// is reused from the choropleth binning (BLUES sequential / DIVERGING). Pure + frame-deterministic: no
// randomness; the grid assignment sorts explicitly and breaks ties by index.
import { bbox, area, centroid, transformScale, polygon } from "@turf/turf";
import { computeChoropleth, mainlandFeature } from "./choropleth-geo";

export interface CartogramCell {
  feature: GeoJSON.Feature;
  id: string;
  value: number;
  color: string;
  binIdx: number;
}
export interface CartogramLayout {
  cells: CartogramCell[];
  bins: { min: number; max: number; color: string }[];
  variant: "scaled" | "grid";
  bounds: [number, number, number, number];
  valueLabel: string;
  scaleType: "sequential" | "diverging";
}
export interface CartogramData {
  variant?: "scaled" | "grid";
  joinKey?: string;
  values: { id: string; value: number }[];
  scaleType?: "sequential" | "diverging";
  palette?: string | string[];
  bins?: number;
  valueLabel?: string;
  brandHue?: string; // newsroom house hue → derived house ramp (via computeChoropleth)
}

// Pick the bin index whose [min,max] contains v (last bin inclusive of max).
function binIndexFor(v: number, bins: { min: number; max: number }[]): number {
  for (let i = 0; i < bins.length; i++) {
    if (v >= bins[i].min && (v <= bins[i].max || i === bins.length - 1))
      return i;
  }
  return bins.length - 1;
}

export function computeCartogram(
  data: CartogramData,
  features: GeoJSON.FeatureCollection,
): CartogramLayout {
  const variant = data.variant ?? "scaled";
  const joinKey = data.joinKey ?? "iso_a3";
  const scaleType = data.scaleType ?? "sequential";

  // Reuse the choropleth binning for colours + bin edges (join by key, drop no-data).
  const cho = computeChoropleth(
    {
      regionKey: "id",
      valueField: "value",
      rows: data.values as unknown as Record<string, string | number>[],
      brandHue: data.brandHue, // carry the house hue → derived house ramp
    },
    features,
    joinKey,
    { bins: data.bins ?? 5, scaleType, palette: data.palette },
  );

  // Map region key → value (matched only).
  const valueByKey = new Map<string, number>();
  for (const v of data.values) valueByKey.set(String(v.id), v.value);

  // Matched features, in feature order (deterministic).
  const matched = features.features
    .map((f) => ({ f, key: String(f.properties?.[joinKey]) }))
    .filter(({ key }) => valueByKey.has(key));

  if (matched.length === 0)
    throw new Error("cartogram: no region matched the data");

  const maxValue = Math.max(
    ...matched.map(({ key }) => valueByKey.get(key)!),
    1e-9,
  );

  const colorFor = (value: number) => {
    const idx = binIndexFor(value, cho.bins);
    return { binIdx: idx, color: cho.bins[idx].color };
  };

  let cells: CartogramCell[];

  if (variant === "scaled") {
    cells = matched.map(({ f, key }) => {
      const value = valueByKey.get(key)!;
      const src = mainlandFeature(f);
      const factor = Math.sqrt(Math.max(value, 0) / maxValue) || 1e-3; // area ∝ value; floor avoids 0-area
      const scaled = transformScale(src, factor, { origin: centroid(src) });
      const { binIdx, color } = colorFor(value);
      return { feature: scaled, id: key, value, color, binIdx };
    });
  } else {
    // grid auto-layout: choose dims, map centroids to ideal (row,col), assign nearest FREE cell.
    const n = matched.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const withC = matched.map(({ f, key }) => {
      const c = centroid(mainlandFeature(f)).geometry.coordinates as [
        number,
        number,
      ];
      return { key, value: valueByKey.get(key)!, cx: c[0], cy: c[1] };
    });
    const lons = withC.map((r) => r.cx);
    const lats = withC.map((r) => r.cy);
    const minLon = Math.min(...lons),
      maxLon = Math.max(...lons);
    const minLat = Math.min(...lats),
      maxLat = Math.max(...lats);
    const lonSpan = maxLon - minLon || 1;
    const latSpan = maxLat - minLat || 1;
    // Ideal grid coords from geographic position (col grows east, row grows south).
    const ideal = withC.map((r) => ({
      ...r,
      ic: ((r.cx - minLon) / lonSpan) * (cols - 1),
      ir: ((maxLat - r.cy) / latSpan) * (rows - 1),
    }));
    // Deterministic order: north-to-south, then west-to-east.
    ideal.sort(
      (a, b) => a.ir - b.ir || a.ic - b.ic || (a.key < b.key ? -1 : 1),
    );
    const taken = new Set<string>();
    const assign: { key: string; value: number; row: number; col: number }[] =
      [];
    for (const r of ideal) {
      let best: { row: number; col: number; d: number } | null = null;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (taken.has(`${row},${col}`)) continue;
          const d = (row - r.ir) ** 2 + (col - r.ic) ** 2;
          if (!best || d < best.d) best = { row, col, d };
        }
      }
      if (!best) best = { row: 0, col: 0, d: 0 };
      taken.add(`${best.row},${best.col}`);
      assign.push({ key: r.key, value: r.value, row: best.row, col: best.col });
    }
    // Render uniform squares geographically over the data bbox. Each cell's center is placed at
    // its assigned (row,col) position within the real lon/lat extent, so the grid sits over the
    // actual geography on the basemap. Every cell is the same degree-size (sizeDeg × sizeDeg).
    const cellW = lonSpan / Math.max(cols - 1, 1);
    const cellH = latSpan / Math.max(rows - 1, 1);
    const sizeDeg = Math.min(cellW, cellH) * 0.8;
    // Re-key to feature order for stable output.
    assign.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    cells = assign.map((a) => {
      const cx = minLon + a.col * cellW;
      const cy = maxLat - a.row * cellH;
      const half = sizeDeg / 2;
      const feature = polygon([
        [
          [cx - half, cy - half],
          [cx + half, cy - half],
          [cx + half, cy + half],
          [cx - half, cy + half],
          [cx - half, cy - half],
        ],
      ]);
      const { binIdx, color } = colorFor(a.value);
      return { feature, id: a.key, value: a.value, color, binIdx };
    });
  }

  const fc = {
    type: "FeatureCollection" as const,
    features: cells.map((c) => c.feature),
  };
  const bounds = bbox(fc) as [number, number, number, number];

  return {
    cells,
    bins: cho.bins,
    variant,
    bounds,
    valueLabel: data.valueLabel ?? "value",
    scaleType,
  };
}
