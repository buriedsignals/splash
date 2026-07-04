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

// The library-default single-series colour. When a chart has a clear SUBJECT, the
// suggester must not leave this default in place — it must CHOOSE a subject-fit
// Okabe-Ito hue (energy/solar → amber #E69F00, environment → green #009E73, heat →
// vermilion #D55E00, water → blue #0072B2, etc.). The guardrail enforces this.
export const DEFAULT_BASE_COLOR = "#0072B2";

// Subjects for which the default blue IS the subject-fit choice (water, cold, sky,
// finance-neutral). For these the guard does not fire on the default. Everything else
// with a subject must pick a non-default hue.
const BLUE_FIT_SUBJECT =
  /\b(water|sea|ocean|river|rain|flood|cold|winter|ice|snow|sky|marine|hydro)\b/i;

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
  baseColor?: string; // single-series colour (Okabe-Ito), CHOSEN per subject — not left at the default blue
  // The chart's subject hint (e.g. "solar", "temperature", "marriage"). When set,
  // the guardrail requires baseColor to be an explicit subject-fit choice, not the
  // library default blue — this is what stops every chart rendering the same blue.
  subject?: string;
  seriesColors?: Record<string, string>; // multi-series: series name → Okabe-Ito hex
  transpose?: boolean; // DW data.transpose (rows↔columns)
  valueLabels?: boolean; // direct labelling
  numberFormat?: string; // DW number-format token (e.g. '0,0.[0]') — value labels + tooltips
  valueFormat?: string; // axis tick format override (y-grid-format), e.g. '$0,0a' or '00:00:00' for h:mm:ss
  // Human display name per data column (column key → label). Renames the CSV
  // header before upload so the series direct label / legend / tooltip never
  // show a raw column name. Publishable-blocker if omitted for machine-named columns.
  seriesLabels?: Record<string, string>;
  sort?: "asc" | "desc"; // ranking sort: sorts data rows by the last column
  source?: { name: string; url?: string };
  altInsight: string; // WCAG: alt = the insight, not the structure
  annotations?: {
    text: string;
    x?: string | number;
    y?: number; // data-unit y; if omitted on a line chart it is derived from the data at x
    column?: string; // which series column to derive y from (defaults to first value column)
    align?: string; // anchor: tl|tc|tr|ml|mc|mr|bl|bc|br — controls which way the label extends
    dx?: number; // px nudge (right +); use negative to pull a near-edge label inward
    dy?: number; // px nudge (down +)
  }[];
}

// A valid Datawrapper/numeral.js number token (what value-label-format + y-grid-format expect):
// e.g. "0.0", "0.00", "0,0", "0%", "$0,0", "0.[00]", "0a". NOT a printf/Python token like ".1f".
const DW_NUMBER_TOKEN = /^[$€£¥]?[0#](?:[0#,])*(?:\.[0#[\]]+)?[%a]?$/;

/**
 * Normalise a number-format token to a valid Datawrapper (numeral.js) token. Translates the
 * common printf/Python/C mistakes the ② layer emits (".1f" → "0.0", ".2f" → "0.00",
 * ",.2f" → "0,0.00", "d" → "0", ".1f%" → "0.0%") — these otherwise ship SILENTLY-WRONG value
 * labels (".1f" rendered "8.4" as ".40"). Anything already valid — numeral tokens, durations
 * ("00:00:00"), currency-abbrev ("$0,0a") — passes through untouched. Only a clear but
 * un-mappable printf leftover ("%s", ".3e") THROWS, so nonsense fails loudly. Pure + unit-tested.
 */
export function normalizeNumberFormat(fmt: string): string {
  const f = fmt.trim();
  let m: RegExpMatchArray | null;
  // printf/Python float: [%][,].Nf  (leading % or comma-grouping optional)
  if ((m = f.match(/^%?(,)?\.(\d+)f$/))) {
    const grouped = m[1] ? "0,0" : "0";
    const dec = Number(m[2]);
    return dec === 0 ? grouped : `${grouped}.${"0".repeat(dec)}`;
  }
  // percent with optional N decimals: .Nf% / .N% / %  → "0[.0…]%"
  if ((m = f.match(/^\.(\d+)f?%$/))) {
    const dec = Number(m[1]);
    return dec > 0 ? `0.${"0".repeat(dec)}%` : "0%";
  }
  // bare integer conversions: d / i / f / %d
  if (/^%?[dif]$/.test(f)) return "0";
  if (DW_NUMBER_TOKEN.test(f)) return f; // already a valid numeral token
  // a clear printf leftover we cannot map → fail loud rather than ship garbage labels
  if (/^%\D/.test(f) || /\.\d+[eg]$/.test(f))
    throw new Error(
      `invalid numberFormat "${fmt}" — use a Datawrapper number token like "0.0", "0.00", "0,0" or "0%" (not a printf/Python token like ".1f")`,
    );
  return f; // unrecognised but not obviously broken (duration, currency, custom) → pass through
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
  // GUARDRAIL: a chart with a declared subject must not fall back to the default
  // blue — the recurrence of the "everything is blue" defect. Choose a subject-fit
  // Okabe-Ito hue (or set a non-default baseColor deliberately).
  if (
    typeof s.subject === "string" &&
    s.subject.trim() &&
    !BLUE_FIT_SUBJECT.test(s.subject) &&
    (s.baseColor === undefined || s.baseColor === DEFAULT_BASE_COLOR) &&
    s.seriesColors === undefined
  )
    errors.push(
      `subject "${s.subject}" has no subject-fit baseColor — the default blue ${DEFAULT_BASE_COLOR} must not stand in for a colour chosen for the subject`,
    );
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
  if (s.valueFormat !== undefined && typeof s.valueFormat !== "string")
    errors.push(
      "valueFormat must be a string (a Datawrapper number-format token)",
    );
  // A bad number token silently ships wrong value labels (".1f" rendered "8.4" as ".40").
  // Reject the un-mappable; warn when a non-standard token was auto-corrected.
  for (const field of ["numberFormat", "valueFormat"] as const) {
    const v = (s as Record<string, unknown>)[field];
    if (typeof v === "string" && v.trim()) {
      try {
        const norm = normalizeNumberFormat(v);
        if (norm !== v.trim())
          warnings.push(
            `${field} "${v}" is not a Datawrapper token — normalised to "${norm}". Emit a numeral token (e.g. "0.0", "0%").`,
          );
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
  }
  if (s.seriesLabels !== undefined) {
    if (typeof s.seriesLabels !== "object" || s.seriesLabels === null) {
      errors.push("seriesLabels must be an object (column key → display name)");
    } else {
      const cols =
        typeof s.data === "string" && s.data.includes(",")
          ? new Set(dataShape(s.data as string).columns)
          : new Set<string>();
      for (const [key, val] of Object.entries(
        s.seriesLabels as Record<string, unknown>,
      )) {
        if (typeof val !== "string" || !val.trim())
          errors.push(`seriesLabels.${key} must be a non-empty display name`);
        if (cols.size > 0 && !cols.has(key))
          warnings.push(
            `seriesLabels key "${key}" does not match any data column — it will have no effect`,
          );
      }
    }
  }
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
  // An annotation's `x` should reference an actual data row label, else
  // Datawrapper silently misplaces (or drops) it.
  if (
    Array.isArray(s.annotations) &&
    typeof s.data === "string" &&
    s.data.includes(",")
  ) {
    const lines = (s.data as string).trim().split("\n");
    const labels = new Set(
      lines
        .slice(1)
        .map((l) => l.split(",")[0]?.trim())
        .filter(Boolean),
    );
    for (const a of s.annotations as { x?: string | number }[]) {
      if (
        typeof a?.x === "string" &&
        labels.size > 0 &&
        !labels.has(a.x.trim())
      )
        warnings.push(
          `annotation x "${a.x}" does not match any data row label — it may be misplaced`,
        );
    }
  }
  return errors.length
    ? { ok: false, errors }
    : { ok: true, spec: s as unknown as ChartSpec, warnings };
}
