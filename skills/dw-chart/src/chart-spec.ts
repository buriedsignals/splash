import { dataShape } from "./csv";

export const OKABE_ITO = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#D55E00",
  "#CC79A7",
  "#56B4E9",
  "#F0E442",
  "#000000",
] as const;

// DW lists `waterfall` and `dual-axis` in /v3/visualizations but the create API rejects them
// (400 Invalid visualization type) — excluded. 22 chart types actually producible.
export const CHART_TYPES = [
  // single-series: >=1 label + >=1 value
  "column-chart",
  "d3-bars",
  "d3-lines",
  "d3-area",
  "d3-pies",
  "d3-donuts",
  "election-donut-chart",
  "d3-dot-plot",
  "tables",
  // multi-series: >=1 label + >=2 value
  "grouped-column-chart",
  "stacked-column-chart",
  "multiple-columns",
  "d3-bars-grouped",
  "d3-bars-stacked",
  "d3-bars-split",
  "multiple-lines",
  "d3-multiple-pies",
  "d3-multiple-donuts",
  // two-value: >=2 value columns
  "d3-scatter-plot",
  "d3-range-plot",
  "d3-arrow-plot",
  "d3-bars-bullet",
] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export const MULTI_SERIES_TYPES = new Set<ChartType>([
  "grouped-column-chart",
  "stacked-column-chart",
  "multiple-columns",
  "d3-bars-grouped",
  "d3-bars-stacked",
  "d3-bars-split",
  "multiple-lines",
  "d3-multiple-pies",
  "d3-multiple-donuts",
]);
export const PART_TO_WHOLE_TYPES = new Set<ChartType>([
  "d3-pies",
  "d3-donuts",
  "election-donut-chart",
]);

export interface ChartSpec {
  type: ChartType;
  title: string; // the insight, sentence case
  intro?: string; // subtitle / insight elaboration
  data: string; // CSV text
  baseColor?: string; // single-series colour (Okabe-Ito)
  seriesColors?: Record<string, string>; // multi-series: series name → Okabe-Ito hex
  transpose?: boolean; // DW data.transpose (rows↔columns)
  valueLabels?: boolean; // direct labelling
  numberFormat?: string; // DW number-format token (e.g. '0,0.[0]')
  sort?: "asc" | "desc"; // ranking sort: sorts data rows by the last column
  source?: { name: string; url?: string };
  altInsight: string; // WCAG: alt = the insight, not the structure
  annotations?: { text: string; x?: string | number; y?: number }[];
}

export function validateChartSpec(
  input: unknown,
):
  | { ok: true; spec: ChartSpec; warnings: string[] }
  | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input || typeof input !== "object")
    return { ok: false, errors: ["spec must be an object"] };
  const s = input as Record<string, unknown>;
  if (!CHART_TYPES.includes(s.type as ChartType))
    errors.push(`type must be one of: ${CHART_TYPES.join(", ")}`);
  if (typeof s.title !== "string" || !s.title.trim())
    errors.push("title (the insight) is required");
  if (typeof s.data !== "string" || !s.data.includes(","))
    errors.push("data must be CSV text");
  if (typeof s.altInsight !== "string" || !s.altInsight.trim())
    errors.push("altInsight is required (WCAG: alt = the insight)");
  if (
    s.baseColor !== undefined &&
    !(OKABE_ITO as readonly string[]).includes(s.baseColor as string)
  )
    errors.push("baseColor must be an Okabe-Ito colour (colorblind-safe)");
  if (s.seriesColors !== undefined) {
    if (typeof s.seriesColors !== "object" || s.seriesColors === null) {
      errors.push("seriesColors must be an object");
    } else {
      for (const [key, val] of Object.entries(
        s.seriesColors as Record<string, unknown>,
      )) {
        if (!(OKABE_ITO as readonly string[]).includes(val as string))
          errors.push(`seriesColors.${key} must be an Okabe-Ito colour`);
      }
      const n = Object.keys(s.seriesColors as object).length;
      if (n > 8)
        errors.push("seriesColors: at most 8 colours (categorical ceiling)");
      if (n > 2 && !MULTI_SERIES_TYPES.has(s.type as ChartType))
        errors.push(
          "seriesColors: a single-series chart should use at most 2 colours",
        );
    }
  }
  if (s.transpose !== undefined && typeof s.transpose !== "boolean")
    errors.push("transpose must be a boolean");
  if (typeof s.data === "string" && s.data.includes(",")) {
    const shape = dataShape(s.data as string);
    const min = MULTI_SERIES_TYPES.has(s.type as ChartType) ? 3 : 2;
    if (shape.columns.length < min)
      errors.push(
        `${s.type} needs at least ${min} columns, got ${shape.columns.length}`,
      );
    if (PART_TO_WHOLE_TYPES.has(s.type as ChartType)) {
      const slices = shape.rows;
      if (slices > 5)
        errors.push(
          `${s.type} with ${slices} slices — group into 'Other' or use bars (data-to-viz caveat)`,
        );
    }
  }
  if (typeof s.title === "string") {
    const cols =
      typeof s.data === "string" && s.data.includes(",")
        ? dataShape(s.data as string).columns.map((c) => c.toLowerCase())
        : [];
    if (
      /^\d{4}\s*[-–]\s*\d{4}$/.test(s.title.trim()) ||
      cols.includes(s.title.trim().toLowerCase())
    )
      warnings.push(
        "title looks like a label, not an insight — state what the data shows",
      );
  }
  return errors.length
    ? { ok: false, errors }
    : { ok: true, spec: s as unknown as ChartSpec, warnings };
}
