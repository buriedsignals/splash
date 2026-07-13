import { dataShape, labelColumnValues, parseCsvRecords } from "./csv";
import { hasValueLabelControl } from "./value-label-safety";

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
// with a subject must pick a non-default hue. Exported so the atelier spine's
// guardrail-parity gate re-applies the SAME blue-fit subject list to native specs at the
// produce boundary (single source of truth — the two must never drift).
export const BLUE_FIT_SUBJECT =
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

// Scatter is the one ANNOTATABLE type whose x and y are DIFFERENT numeric columns (x =
// first value column, y = second; a leading text column is the point label), unlike the
// category-x / value-y model every other annotatable type uses. The annotation mapper
// must therefore read a scatter annotation's y from the Y column — never "the first value
// column" — and derive the y-axis domain from the Y column alone. The other two-value
// types (d3-range-plot / d3-arrow-plot / d3-bars-bullet) are horizontal and already skip
// the annotation mapping via ANNOTATION_UNMAPPED_BAR_TYPES.
export const SCATTER_ANNOTATION_TYPES = new Set<ChartType>(["d3-scatter-plot"]);

// Chart types with NO text-annotation layer in Datawrapper at all. Verified against
// Datawrapper's own docs (academy "How to create text annotations" + "Customizing your
// pie chart"): annotations are supported on column/bar/range/arrow/dot/bullet charts,
// line/multiple-lines/area charts, and scatter plots — but pie/donut charts only expose
// a "highlight element" (bold a slice's label), never an anchored text+arrow annotation,
// and a table has no plot to anchor one to. Mapping `spec.annotations` for these types
// would silently produce metadata Datawrapper ignores at render — the invariant is that
// annotations must never be silently dropped, so these types get a validate() warning
// instead of a dead mapping (see chart-spec.ts validateChartSpec + spec-to-metadata.ts).
export const ANNOTATION_UNSUPPORTED_TYPES = new Set<ChartType>([
  "d3-pies",
  "d3-donuts",
  "election-donut-chart",
  "d3-multiple-pies",
  "d3-multiple-donuts",
  "tables",
]);

// HORIZONTAL value-x/category-y chart families (bar family + the other row-driven
// horizontal types). Datawrapper DOES have a text-annotation layer here (unlike the
// pie/donut/table set above), BUT this pipeline can't place an annotation on them: its
// coordinate mapper (plotDomain/pointFraction/placeAnnotation in spec-to-metadata.ts) is
// built for the COLUMN/LINE model — categorical x-axis, numeric y-axis. A horizontal
// chart swaps those axes (categories on y, value on x), so an annotation emitted as
// {x:"North", y:"100"} is silently mismatched. VERIFIED via a rendered export: d3-bars
// with the column/line coords showed no annotation; the same annotation with swapped
// (value-x, category-y) coords DID render — confirming the orientation mismatch.
// d3-arrow-plot was independently LIVE-REPRODUCED (not just inferred): validateChartSpec
// passed a d3-arrow-plot + annotation spec (ok:true, 0 warnings) before this fix, then
// produceChart's responsive label-safety guardrail threw "clipped" at EVERY viewport
// width (340/600/1200px) — the axis range the annotation mapper widened for a value-y
// model corrupted the value-x axis ticks instead. d3-dot-plot and d3-range-plot share
// the identical category-y/value-x layout — they are exactly the OTHER members of
// `ROW_DRIVEN_TYPES` (export-aspect.ts, independently derived for the row-crop bug: "each
// data ROW is laid out as its own horizontal track — categories on the y-axis, value on
// the x-axis") beyond the d3-bars family + d3-bars-bullet already covered here, so they
// get the same treatment. Until a value-x/category-y-aware placement mapper exists, warn
// (never a silent drop/crash) and skip the dead mapping. Column charts and (vertical)
// line/scatter charts are unaffected — the mapper is built for them.
export const ANNOTATION_UNMAPPED_BAR_TYPES = new Set<ChartType>([
  "d3-bars",
  "d3-bars-grouped",
  "d3-bars-stacked",
  "d3-bars-split",
  "d3-bars-bullet",
  "d3-arrow-plot",
  "d3-dot-plot",
  "d3-range-plot",
]);

// Chart types whose Datawrapper engine keys `visualize.custom-colors` by the CATEGORY
// value of a single-series dataset — the set `spec.highlight` is allowed on. VERIFIED
// LIVE against the real API (2026-07-12): charts of both types created via POST
// /v3/charts, patched with {"custom-colors":{"Basel":"#E69F00"},"base-color":"#cccccc"},
// PATCH→GET round-trip kept the map verbatim, and the PUBLISHED RENDER painted exactly
// the Basel bar amber and the other bars grey (d3-bars renders HTML divs, column-chart
// SVG rects — both engines honour the category key). The multi-series siblings
// (grouped/stacked/split/multiple-*) key custom-colors by SERIES name instead — that is
// `spec.seriesColors`' contract — and the remaining row-driven types (dot/range/arrow/
// bullet) use per-column colour models; none of them accept a category-keyed accent, so
// validateChartSpec REJECTS `highlight` for them rather than let it die silently.
export const HIGHLIGHT_TYPES = new Set<ChartType>(["d3-bars", "column-chart"]);

export interface ChartSpec {
  type: ChartType;
  title: string; // the insight, sentence case
  intro?: string; // subtitle / insight elaboration
  data: string; // CSV text
  baseColor?: string; // single-series colour (Okabe-Ito), CHOSEN per subject — not left at the default blue
  // The CATEGORY VALUE (a first-column cell, e.g. "Basel") to accent on a single-series
  // bar/column ranking (HIGHLIGHT_TYPES only). A VALUE, never a row index: `sort`
  // re-orders the rows before upload, so an index would silently point at a different
  // bar after every re-sort — the category value survives any ordering. The highlighted
  // bar takes the accent (baseColor if present, else the library default); every other
  // bar drops to the muted DW palette grey (see spec-to-metadata.ts).
  highlight?: string;
  // F2 — set true when baseColor / seriesColors were SEEDED from the newsroom's brand
  // profile (a conscious house-style choice). Policy (b): a non-CVD-safe brand colour
  // is then KEPT (validation records it as a warning, not a hard error) — the auto
  // path (brandExplicit absent) stays hard-guarded.
  brandExplicit?: boolean;
  // F2 — set true by the suggester ONLY when the journalist EXPLICITLY named a colour for this
  // chart. It shields that choice from the newsroom profile's house palette (which otherwise
  // overrides the auto subject-fit baseColor as the house default). Absent → the house palette
  // wins over the auto pick.
  baseColorExplicit?: boolean;
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
  // CADRAGE delivery channel (Gate 1, Q3). Fixes the static PNG export aspect:
  // feed/square → 1:1, social/vertical/story → 9:16, web/article → 16:9 (default).
  // Free-form (the journalist's own word) — resolved via export-aspect.ts. Absent →
  // web/landscape. Does not affect the interactive embed (that stays fluid).
  channel?: string;
  // BCP-47 language of the deliverable (e.g. "fr", "en", "fr-CH"). Sets the DW chart
  // `language`, so Datawrapper localizes value labels + dates (fr → "1 900,5"). Set by
  // the suggester from the article language. Absent → DW default (en-US).
  lang?: string;
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

// THE canonical top-level ChartSpec field list — the single source the strict
// unknown-field check derives from. Kept next to the interface and DOUBLY
// compile-time-checked against it (below): `satisfies` rejects any entry that is not
// a ChartSpec key, and the Exclude assertion refuses to compile when a ChartSpec key
// is missing from the list — so the two can never drift.
export const CHART_SPEC_FIELDS = [
  "type",
  "title",
  "intro",
  "data",
  "baseColor",
  "highlight",
  "brandExplicit",
  "baseColorExplicit",
  "subject",
  "seriesColors",
  "transpose",
  "valueLabels",
  "numberFormat",
  "valueFormat",
  "seriesLabels",
  "sort",
  "channel",
  "lang",
  "source",
  "altInsight",
  "annotations",
] as const satisfies readonly (keyof ChartSpec)[];

// Compile-time completeness: adding a field to ChartSpec without listing it above
// makes this assignment fail to compile (Exclude is then non-never).
type UnlistedChartSpecField = Exclude<
  keyof ChartSpec,
  (typeof CHART_SPEC_FIELDS)[number]
>;
const _everyChartSpecFieldIsListed: UnlistedChartSpecField extends never
  ? true
  : never = true;
void _everyChartSpecFieldIsListed;

// Routing-envelope fields real flows legitimately carry ON the same JSON object the
// spec travels in (verified against the emitters, not invented): `producer` —
// suggest-chart emits it on routed specs (present on the workflow-test fixtures;
// eval/score.ts discriminates on it) — and `format` — the single pinned VisualFormat
// the suggest-chart SKILL.md requires on the emitted spec (read by impliedFormat() in
// eval/score.ts). They are TOLERATED by the strict check but are not ChartSpec fields:
// dw-chart itself never reads them.
export const CHART_SPEC_ENVELOPE_FIELDS = ["producer", "format"] as const;

// Dependency-free Levenshtein for the near-miss suggestion below. Field names are
// short (≤ 20 chars), so the O(n·m) DP is trivially cheap.
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return row[b.length];
}

// The closest valid ChartSpec field for a near-miss, or undefined when nothing is
// close. Two signals, in order: (1) containment — a hallucinated compound like
// "highlightColor" STARTS WITH the real field "highlight" (or a truncation like
// "chan" is a prefix of "channel"); (2) a small edit distance (≤ 2, e.g. "titel" →
// "title") for plain typos. Case-insensitive; containment requires ≥ 4 shared chars
// so short fields never match noise. Exported for tests.
export function closestChartSpecField(name: string): string | undefined {
  const n = name.toLowerCase();
  let best: string | undefined;
  for (const f of CHART_SPEC_FIELDS) {
    const c = f.toLowerCase();
    const contained =
      (c.length >= 4 && n.startsWith(c)) || (n.length >= 4 && c.startsWith(n));
    if (contained && (!best || f.length > best.length)) best = f;
  }
  if (best) return best;
  let bestDist = 3; // suggestions stop at distance 2 — beyond that it's a different word
  for (const f of CHART_SPEC_FIELDS) {
    const dist = editDistance(n, f.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = f;
    }
  }
  return best;
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

/**
 * PERCENT-SCALE MISMATCH GUARD. Datawrapper's "%" token (numeral.js) appends the sign WITHOUT
 * multiplying by 100 — VERIFIED against a real rendered export: value 29 with "0%" renders
 * "29%" (correct), value 0.29 with "0%" renders "0%" (all precision lost). So a percent format
 * is only correct when the data is ALREADY in percentage points (0–100). If every value is a
 * 0–1 fraction, the "%" token silently ships "0%". Returns true for that mismatch so the caller
 * can warn (pre-scale the data, or drop the "%"). Pure. NB: this is the true failure mode — the
 * often-assumed "29 → 2900%" (a ×100 multiply) does NOT happen in Datawrapper.
 */
export function isPercentScaleMismatch(
  numberFormat: string | undefined,
  values: number[],
): boolean {
  if (!numberFormat) return false;
  let norm: string;
  try {
    norm = normalizeNumberFormat(numberFormat);
  } catch {
    return false; // an un-mappable token is reported elsewhere; not our concern here
  }
  if (!norm.includes("%")) return false;
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return false;
  const maxAbs = Math.max(...finite.map((v) => Math.abs(v)));
  // Every value in [0,1] (and at least one non-zero) ⇒ fractional data ⇒ "%" renders "0%".
  return maxAbs > 0 && maxAbs <= 1;
}

// Pull the numeric cells of the given data columns (by header name) out of CSV text. Used by
// the percent-scale guard to inspect the values a "%" format would be applied to.
export function numericValuesOf(csv: string, columns: string[]): number[] {
  const records = parseCsvRecords(csv.trim());
  if (records.length < 2) return [];
  const header = (records[0] ?? []).map((c) => c.trim());
  const idxs = columns.map((c) => header.indexOf(c)).filter((i) => i >= 0);
  const out: number[] = [];
  for (const cells of records.slice(1)) {
    for (const i of idxs) {
      const n = Number(cells[i]);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
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
  // STRICT TOP-LEVEL FIELDS (fail-closed, same philosophy as normalizeChannel in
  // skills/atelier/src/channel.ts: an unknown input must fail LOUD, never silently
  // pass through). The QA Wave 8 German-hospital case shipped an UNhighlighted chart
  // because the emitter's hallucinated `highlight`/`highlightColor` fields were
  // silently ignored here — only manual pixel inspection caught it. Any field outside
  // the canonical CHART_SPEC_FIELDS list (plus the tolerated routing envelope) is now
  // an error naming the field, suggesting the nearest valid one for a near-miss.
  const knownFields = new Set<string>([
    ...CHART_SPEC_FIELDS,
    ...CHART_SPEC_ENVELOPE_FIELDS,
  ]);
  for (const key of Object.keys(s)) {
    if (knownFields.has(key)) continue;
    const suggestion = closestChartSpecField(key);
    errors.push(
      `unknown field "${key}"${suggestion ? ` — did you mean "${suggestion}"?` : ""} ` +
        `(valid fields: ${CHART_SPEC_FIELDS.join(", ")})`,
    );
  }
  if (!CHART_TYPES.includes(s.type as ChartType))
    errors.push(`type must be one of: ${CHART_TYPES.join(", ")}`);
  if (typeof s.title !== "string" || !s.title.trim())
    errors.push("title (the insight) is required");
  if (typeof s.data !== "string" || !s.data.includes(","))
    errors.push("data must be CSV text");
  if (typeof s.altInsight !== "string" || !s.altInsight.trim())
    errors.push("altInsight is required (WCAG: alt = the insight)");
  // #5 — valueLabels is only honoured on bar/column charts; on any other type Datawrapper
  // silently ignores it, so warn rather than let it pass as a silent no-op.
  if (
    s.valueLabels === true &&
    CHART_TYPES.includes(s.type as ChartType) &&
    !hasValueLabelControl(s.type as ChartType)
  )
    warnings.push(
      `valueLabels is only honoured on bar/column charts; ignored for ${s.type} (use the chart-native path for direct labelling on line/scatter/pie)`,
    );
  // #4 — HORIZONTAL bars now render DIRECT on-bar value labels by default (ON unless
  // valueLabels:false), matching chart-native and FT best-practice #3, with the value axis
  // kept as the accessible fallback (see applyValueLabels in value-label-safety.ts). The old
  // silent substitution — valueLabels:true → no numbers on the bars — no longer happens, so
  // there is nothing to warn about here; the marginal-contrast inside label DW gives no
  // override for is surfaced at produce time (checkValueLabelContrast) as a render concern.
  // F2 — a brand-explicit house colour is kept even when it isn't CVD-safe (policy
  // b): the failure is recorded as a warning for the render-review, not a hard error.
  const brandExplicit = s.brandExplicit === true;
  if (
    s.baseColor !== undefined &&
    !(OKABE_ITO as readonly string[]).includes(s.baseColor as string)
  ) {
    if (brandExplicit)
      warnings.push(
        `brand colour ${s.baseColor} is not colour-blind-safe (outside the Okabe-Ito set) — kept per the newsroom's house style (render-review concern)`,
      );
    else errors.push("baseColor must be an Okabe-Ito colour (colorblind-safe)");
  }
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
        if (!(OKABE_ITO as readonly string[]).includes(val as string)) {
          if (brandExplicit)
            warnings.push(
              `brand colour ${val} (seriesColors.${key}) is not colour-blind-safe — kept per the newsroom's house style (render-review concern)`,
            );
          else errors.push(`seriesColors.${key} must be an Okabe-Ito colour`);
        }
      }
      const n = Object.keys(s.seriesColors as object).length;
      if (n > 8)
        errors.push("seriesColors: at most 8 colours (categorical ceiling)");
      // A chart is genuinely multi-series when it has more than one value column
      // (label + >=2 values) — read the ACTUAL data shape, not just the type's
      // membership in MULTI_SERIES_TYPES. That set only covers DW's transpose-based
      // multi-series types (stacked/grouped); a type like "d3-lines" takes N value
      // columns directly without ever appearing there. Capping on type membership
      // alone made a real 3-series d3-lines chart fail this guard, so the caller
      // dropped seriesColors entirely and the chart shipped on Datawrapper's
      // default all-blue ramp instead of a subject-fit Okabe-Ito palette (up to 8
      // series). Falling back to type membership when the shape can't be read
      // keeps existing behaviour for callers that validate before data is final.
      const dataIsMultiSeries =
        typeof s.data === "string" && s.data.includes(",")
          ? dataShape(s.data as string).columns.length > 2
          : false;
      if (
        n > 2 &&
        !MULTI_SERIES_TYPES.has(s.type as ChartType) &&
        !dataIsMultiSeries
      )
        errors.push(
          "seriesColors: a single-series chart should use at most 2 colours",
        );
    }
  }
  // HIGHLIGHT — the CATEGORY VALUE to accent on a single-series bar/column ranking.
  // Only HIGHLIGHT_TYPES key custom-colors by category (verified live — see the set's
  // comment); everywhere else the field would die silently, so it is rejected loudly.
  if (s.highlight !== undefined) {
    if (typeof s.highlight !== "string" || !s.highlight.trim()) {
      errors.push(
        "highlight must be a non-empty CATEGORY VALUE (a first-column cell, e.g. " +
          '"Basel") — never a row index: sort re-orders the rows, an index would ' +
          "silently accent a different bar",
      );
    } else {
      if (
        CHART_TYPES.includes(s.type as ChartType) &&
        !HIGHLIGHT_TYPES.has(s.type as ChartType)
      )
        errors.push(
          `highlight is not supported on ${s.type} — only ${[
            ...HIGHLIGHT_TYPES,
          ].join(
            ", ",
          )} key per-bar custom-colors by category (verified live); for multi-series ` +
            `types use seriesColors, or move the emphasis into the title/annotations`,
        );
      if (s.seriesColors !== undefined)
        errors.push(
          "highlight and seriesColors are mutually exclusive — both write " +
            "visualize.custom-colors (highlight keys by CATEGORY on a single-series " +
            "bar; seriesColors keys by SERIES name)",
        );
      // The highlighted category must exist in the data, else Datawrapper keeps the
      // custom-colors entry but paints nothing — the chart would ship UNhighlighted,
      // exactly the silent failure this validation exists to kill. The labels are
      // RFC 4180-PARSED (labelColumnValues), never split(","): a quoted,
      // comma-containing category (real run data: "Ministère de l'Économie, des
      // Finances et de la Souveraineté industrielle et numérique") is ONE label —
      // the naive split falsely rejected it and mangled the suggestion list.
      if (typeof s.data === "string" && s.data.includes(",")) {
        const rowLabels = new Set(labelColumnValues(s.data as string));
        if (rowLabels.size > 0 && !rowLabels.has(s.highlight.trim()))
          errors.push(
            `highlight "${s.highlight}" does not match any data row label — ` +
              `Datawrapper would silently paint nothing; use one of: ${[...rowLabels].join(", ")}`,
          );
      }
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
  // PERCENT-SCALE MISMATCH (#1c). A "%" format on 0–1 fractional data renders "0%" in
  // Datawrapper (it appends the sign, never multiplies — EMPIRICALLY VERIFIED against
  // real rendered PNG exports: 41/63/70 + "0%" → "41%"/"63%"/"70%", correct, no ×100;
  // 0.41/0.63/0.70 + "0%" → "0%"/"1%"/"1%", precision destroyed). This corrupts the
  // reader-facing value — a HARD error (not a warning): `warnings` is advisory only
  // (produceChart's `if (!v.ok) throw` never inspects it), so a soft flag here would
  // still let a broken "0%" chart publish. Checked on BOTH `numberFormat` (value
  // labels + describe.number-format) AND `valueFormat` (the axis token — spec-to-metadata
  // falls back `axisFormat = valueFormat ?? numberFormat`, so a valueFormat-only "%" on
  // fractional data hits the identical bug on the axis ticks, unflagged before).
  if (typeof s.data === "string" && s.data.includes(",")) {
    const valueCols = dataShape(s.data as string).columns.slice(1);
    const values = numericValuesOf(s.data, valueCols);
    for (const field of ["numberFormat", "valueFormat"] as const) {
      const fmt = s[field];
      if (typeof fmt === "string" && isPercentScaleMismatch(fmt, values))
        errors.push(
          `${field} "${fmt}" is a percent token but the data looks like 0–1 fractions — Datawrapper appends "%" WITHOUT multiplying, so these render "0%". Pre-scale the values to percentage points (e.g. 0.29 → 29), or drop the "%".`,
        );
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
  // Annotations have NO home on pie/donut/table types (Datawrapper docs: no
  // text-annotation layer there) — warn so the drop is never silent, rather than
  // let spec-to-metadata build metadata Datawrapper will just ignore at render.
  if (
    Array.isArray(s.annotations) &&
    s.annotations.length &&
    ANNOTATION_UNSUPPORTED_TYPES.has(s.type as ChartType)
  )
    warnings.push(
      `annotations are not supported on ${s.type} charts — Datawrapper has no text-annotation layer for pie/donut/table types, so they will be dropped; move the callout into the title/intro, or use a bar/column/line alternative`,
    );
  // #5 — HORIZONTAL value-x/category-y charts (the d3-bars family + d3-dot-plot /
  // d3-arrow-plot / d3-range-plot) have a DW annotation layer, but this pipeline's
  // column/line coordinate model can't place one on them, so it is silently dropped —
  // or, for d3-arrow-plot, LIVE-REPRODUCED as a produce-time crash (responsive
  // label-safety guardrail threw at every viewport width) before this type was added
  // here. Warn + skip the dead mapping (see spec-to-metadata.ts).
  if (
    Array.isArray(s.annotations) &&
    s.annotations.length &&
    ANNOTATION_UNMAPPED_BAR_TYPES.has(s.type as ChartType)
  )
    warnings.push(
      `annotations on ${s.type} (a horizontal, value-x/category-y chart) are dropped by this pipeline — its placement uses a column/line coordinate model (category-x, value-y) that Datawrapper's horizontal annotation layer (value-x, category-y) ignores; use a column-chart (annotations place correctly there), or move the callout into the title/intro`,
    );
  // An annotation's `x` should reference an actual data row label, else
  // Datawrapper silently misplaces (or drops) it. Labels are RFC 4180-parsed
  // (labelColumnValues, same as the highlight check above) so a quoted,
  // comma-containing label is ONE label — never torn and falsely warned.
  if (
    Array.isArray(s.annotations) &&
    typeof s.data === "string" &&
    s.data.includes(",")
  ) {
    const labels = new Set(labelColumnValues(s.data as string));
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
