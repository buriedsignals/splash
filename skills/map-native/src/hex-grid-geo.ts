// Pure spatial-binning core for the hex-grid map — no MapTiler, no React. A regular hex/square
// tessellation is generated over the points' bbox and each cell aggregates the points inside
// (count / sum / mean). Deterministic (fixed bbox + fixed cell size, no randomness), so the cells are
// stable across every Remotion render frame. Empty cells are dropped. Colour reuses the choropleth's
// sequential BLUES ramp.
import {
  hexGrid,
  squareGrid,
  collect,
  distance,
  point as turfPoint,
  featureCollection,
} from "@turf/turf";
import { BLUES, resolvePalette } from "./theme/scale";
import { houseRamp } from "./theme/house-ramp";

export interface HexGridData {
  points: { lon: number; lat: number; value?: number }[];
  binShape?: "hex" | "square";
  aggregate?: "count" | "sum" | "mean";
  cellSizeKm?: number;
  // A named registry palette or a custom CVD-safe ramp; falls back to BLUES when absent.
  palette?: string | string[];
  brandHue?: string; // newsroom house hue → derived sequential ramp when no palette is set
  // The short value suffix for the sum/mean aggregate (e.g. "kWh", "$") — mirrors
  // CartogramData's `valueUnit`. Not applied to "count" (a count of points has no value
  // unit of its own — "points" already names it).
  valueUnit?: string;
}
export interface HexCell {
  feature: GeoJSON.Feature;
  count: number;
  value: number;
  color: string;
  binIdx: number;
}
export interface HexGridLayout {
  cells: HexCell[];
  bins: { min: number; max: number; color: string }[];
  cellSizeKm: number;
  bounds: [number, number, number, number];
  aggregate: "count" | "sum" | "mean";
  binShape: "hex" | "square";
  aggregateLabel: string;
  capped: boolean;
  // The short value suffix for callouts (e.g. "kWh") — "" when the config sets none.
  valueUnit: string;
}

// hex-grid ALWAYS paints a sequential ramp (see `computeHexGrid` below) — there is no
// diverging mode and no `scaleType` config field (`HexGridConfigShape` in validate-config.ts
// has none). Exported as a single named constant so every consumer that needs to resolve
// "the ramp the renderer paints" (the produce guard, `checkHexGridConformance`) reads the
// SAME value instead of re-deriving it independently — the divergence between those
// re-derivations (some read a stray `config.scaleType`) was bug #6.
export const HEX_GRID_SCALE_TYPE: "sequential" = "sequential";

const TARGET_CELLS = 250;
const MAX_CELLS = 2000;
const MERC = 85;
const clampLat = (v: number) => Math.max(-MERC, Math.min(MERC, v));

export function computeHexGrid(data: HexGridData): HexGridLayout {
  const pts = data.points;
  if (!pts.length) throw new Error("hex-grid: no points — nothing to bin");
  const binShape = data.binShape === "square" ? "square" : "hex";
  const aggregate = data.aggregate ?? "count";

  // bbox with a minimum extent (degenerate guard) + 10% padding, Mercator-clamped.
  // 10% (not 5%) ensures that points near the bbox edges land inside a hex cell, not in
  // the inter-hex gap that turf leaves at the grid boundary.
  const lons = pts.map((p) => p.lon);
  const lats = pts.map((p) => p.lat);
  let w = Math.min(...lons),
    e = Math.max(...lons);
  let s = clampLat(Math.min(...lats)),
    n = clampLat(Math.max(...lats));
  const MIN_EXT = 0.5;
  if (e - w < MIN_EXT) {
    const c = (e + w) / 2;
    w = c - MIN_EXT / 2;
    e = c + MIN_EXT / 2;
  }
  if (n - s < MIN_EXT) {
    const c = (n + s) / 2;
    s = clampLat(c - MIN_EXT / 2);
    n = clampLat(c + MIN_EXT / 2);
  }
  const padX = (e - w) * 0.1,
    padY = (n - s) * 0.1;
  const bbox: [number, number, number, number] = [
    w - padX,
    clampLat(s - padY),
    e + padX,
    clampLat(n + padY),
  ];

  // Derive a cell side (km) targeting ~TARGET_CELLS across the bbox.
  const midLat = (bbox[1] + bbox[3]) / 2;
  const widthKm =
    distance(turfPoint([bbox[0], midLat]), turfPoint([bbox[2], midLat]), {
      units: "kilometers",
    }) || 1;
  const heightKm =
    distance(turfPoint([bbox[0], bbox[1]]), turfPoint([bbox[0], bbox[3]]), {
      units: "kilometers",
    }) || 1;
  const areaKm = widthKm * heightKm;
  const perCellFactor = binShape === "hex" ? 2.6 : 1; // rough cell-area / side² factor
  let cellSide =
    data.cellSizeKm ??
    Math.max(1, Math.sqrt(areaKm / (TARGET_CELLS * perCellFactor)));

  const make = (side: number): GeoJSON.FeatureCollection =>
    (binShape === "hex"
      ? hexGrid(bbox, side, { units: "kilometers" })
      : squareGrid(bbox, side, {
          units: "kilometers",
        })) as GeoJSON.FeatureCollection;

  let grid = make(cellSide);
  let capped = false;
  let guard = 0;
  while (grid.features.length > MAX_CELLS && guard++ < 24) {
    cellSide *= 1.5;
    grid = make(cellSide);
    capped = true;
  }

  // Bin the points: tag each with a numeric "v" and collect into cells.
  const pointsFC = featureCollection(
    pts.map((p) =>
      turfPoint([p.lon, p.lat], {
        v: aggregate === "count" ? 1 : Number(p.value) || 0,
      }),
    ),
  );
  const collected = collect(
    grid as never,
    pointsFC as never,
    "v",
    "__vals",
  ) as GeoJSON.FeatureCollection;

  const raw = collected.features
    .map((f) => {
      const vals = (f.properties?.__vals ?? []) as number[];
      const count = vals.length;
      const sum = vals.reduce((a, b) => a + b, 0);
      const value =
        aggregate === "count"
          ? count
          : aggregate === "sum"
            ? sum
            : count
              ? sum / count
              : 0;
      return {
        feature: {
          type: "Feature" as const,
          properties: {},
          geometry: f.geometry,
        },
        count,
        value,
      };
    })
    .filter((c) => c.count > 0);

  if (!raw.length) throw new Error("hex-grid: no populated cells");

  // Sequential bins on the aggregate value (5 classes) — mirrors choropleth's sequential
  // scale AND honours the config's `palette` (semantic aliases resolved), so a subject-fit
  // ramp (amber for heat/seismicity, greens for environment…) is used instead of always
  // BLUES. Falls back to BLUES when no palette is set.
  const ramp = data.palette
    ? resolvePalette(HEX_GRID_SCALE_TYPE, data.palette).ramp
    : data.brandHue
      ? houseRamp(data.brandHue) // house hue → derived sequential ramp (CVD-safe)
      : BLUES;
  const values = raw.map((c) => c.value);
  const min = Math.min(...values),
    max = Math.max(...values);
  const nBins = 5;
  const span = max - min || 1;
  const bins = Array.from({ length: nBins }, (_, i) => ({
    min: min + (span * i) / nBins,
    max: min + (span * (i + 1)) / nBins,
    color: ramp[Math.round((i / (nBins - 1)) * (ramp.length - 1))],
  }));
  const binOf = (v: number) => {
    for (let i = 0; i < nBins - 1; i++) if (v < bins[i].max) return i;
    return nBins - 1;
  };

  const cells: HexCell[] = raw.map((c) => {
    const bi = binOf(c.value);
    return { ...c, color: bins[bi].color, binIdx: bi };
  });

  const aggregateLabel =
    aggregate === "count"
      ? `points per ${binShape === "hex" ? "hexagon" : "cell"}`
      : aggregate === "sum"
        ? "sum of values"
        : "mean value";

  return {
    cells,
    bins,
    cellSizeKm: cellSide,
    bounds: bbox,
    aggregate,
    binShape,
    aggregateLabel,
    capped,
    valueUnit: data.valueUnit ?? "",
  };
}
