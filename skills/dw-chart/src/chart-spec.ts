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

export const CHART_TYPES = [
  "d3-lines",
  "d3-area",
  "column-chart",
  "d3-bars",
  "d3-dot-plot",
  "d3-range-plot",
  "d3-scatter-plot",
  "stacked-column-chart",
  "d3-pies",
] as const;
export type ChartType = (typeof CHART_TYPES)[number];

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
  source?: { name: string; url?: string };
  altInsight: string; // WCAG: alt = the insight, not the structure
}

export function validateChartSpec(
  input: unknown,
): { ok: true; spec: ChartSpec } | { ok: false; errors: string[] } {
  const errors: string[] = [];
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
    }
  }
  if (s.transpose !== undefined && typeof s.transpose !== "boolean")
    errors.push("transpose must be a boolean");
  return errors.length
    ? { ok: false, errors }
    : { ok: true, spec: s as unknown as ChartSpec };
}
