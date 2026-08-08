// Map a normalised NativeSpec (what suggest-chart emits when it routes to the
// native engine) → a concrete `{type, config}` the produce() path renders. Covers
// the tabular families an article→CSV flow realistically produces: bar/column,
// line, scatter, pie, grouped, stacked, stacked-area. An unsupported nativeType throws `UnsupportedNativeType` so
// the caller can fall back to dw-chart. Pure, framework-free, unit-tested.

import { parseCsv, type ParsedCsv } from "./csv";
import { chooseUnitPerIcon } from "./pictogram-geometry";
import {
  readFlowLinks,
  flowNodes,
  flowCycle,
  flowSelfLink,
  flowColumns,
  flowMatrix,
  flowTotals,
  FlowShapeError,
  SANKEY_CONSERVATION_TOLERANCE,
  SANKEY_MAX_RAMP_NODES,
  CHORD_MAX_ENTITIES,
  ARC_MAX_NODES,
} from "./flow-links";
import { arcLabelFit, ARC_MIN_LABEL_RATIO } from "./arc-geometry";
import { TYPE } from "./core/tokens";
import { validateShape } from "./shape-validation";
import {
  endOfGrain,
  parseIsoDate,
  requireIsoDate,
} from "../../../lib/core/date-locale";
import { humanizeColumn, seriesLabelFromColumn, textWidth } from "./core/text";
import type { ArcRole } from "../../../lib/core/claim-arc";
import type { SourceKind } from "../../../lib/source/vocabulary";

/**
 * One journalist-confirmed narrative beat for a chart SCROLLY (NativeSpec.beats).
 * LINE: anchor on `x` (a value of the x column, compared as strings), optionally a
 * range `x`..`xEnd` — the reveal draws the line to `xEnd`. BAR: anchor on `category`
 * (a value of the category column) — the walk highlights that bar. `text` is the
 * confirmed step caption; absent → the auto data-tied caption for that anchor.
 * ORDER IS THE NARRATIVE: beats are emitted exactly as given — the journalist's
 * order wins, even non-chronological (a line scrolly simply scrubs back).
 * An anchor that does not exist in the data FAILS LOUD (same philosophy as
 * dw-chart's annotation-domain tripwire): at the spine validation gate
 * (validate-gate → narrativeBeatErrors) and again in deriveChartStory.
 */
export interface NarrativeBeat {
  x?: string | number;
  xEnd?: string | number;
  category?: string;
  text?: string;
  /**
   * CLAIM-ARC role (S2). When present, this beat asserts a narrative stage of the
   * argument, not just a data point. The confirmed plan forms an arc:
   * establish → build+ → [turn] → payoff — Cohn's Establisher/Initial/Peak/Release
   * (Cohn 2013, "Visual Narrative Structure"; adapted to data video by Amini et al.,
   * CHI '15, dominant pattern E+I+PR+). `text` carries the beat's CLAIM (the "so what").
   * Optional for backward compatibility: anchor-only beats (no role) keep the legacy
   * auto-caption path, byte-identical. When ANY beat has a role, ALL must, and the arc
   * must be well-formed (see narrativeBeatErrors → arcErrors).
   */
  role?: ArcRole;
}

export interface NativeSpec {
  nativeType: string;
  title: string;
  source: { name: string; url?: string };
  unit: string; // long axis label (e.g. "Share of global CO₂ (%)")
  valueUnit?: string; // short callout unit for scrolly captions (e.g. "%", "t")
  data: string; // CSV (header + rows)
  sort?: "asc" | "desc";
  orientation?: "horizontal" | "vertical";
  directLabel?: string; // line: the series label
  /**
   * SCATTER / CONNECTED-SCATTER axis titles — the human, reader-facing label for
   * each measure axis (e.g. "PIB par habitant (USD)"). When the suggester/journalist
   * provides one it is used VERBATIM; when absent the mapper humanizes the raw CSV
   * column header (humanizeColumn) so an axis is never labelled with a raw snake_case
   * identifier. Ignored by every non-scatter type.
   */
  xLabel?: string;
  yLabel?: string;
  /**
   * PICTOGRAM — what ONE icon stands for (e.g. 10000 → "one figure = 10,000 residents").
   * Absent ⇒ the mapper DERIVES a round 1-2-5 value that keeps the longest row countable
   * (chooseUnitPerIcon). Present ⇒ used verbatim: a journalist who says "one figure =
   * 1,000 households" has made an editorial choice about how coarse the count reads, and
   * the produce-time guard — not the mapper — is what refuses a unit no one could count.
   * Ignored by every other type.
   */
  unitPerIcon?: number;
  highlight?: string; // bar: the category to accent
  /** several categories/points to accent (e.g. beeswarm's outlier communes). When
   *  present it takes precedence over the single `highlight`. */
  highlights?: string[];
  /**
   * COMBO — which of the two numeric columns is drawn as the LINE (against the independent
   * right-hand axis); the other becomes the COLUMNS (length from a zero baseline). This is the
   * per-series encoding choice combo was deferred for, and it is not guessed from magnitudes or
   * header words: an explicit name always wins, a single `%`-marked header is the one accepted
   * derivation, and anything else is refused at the gate with both candidates named.
   */
  comboLine?: string;
  /** COMBO — what the COLUMN series measures ("units", "GWh", "CHF"). Required (unless the
   *  header itself declares `%`): checkComboConformance refuses two series sharing a unit, and
   *  cannot apply that rule to units it was not told. */
  comboColumnUnit?: string;
  /** COMBO — what the LINE series measures ("%", "index 2015=100", "CHF/m²"). Required unless
   *  the header itself declares `%`. */
  comboLineUnit?: string;
  /**
   * GANTT — the column holding each row's START date, and the column holding its END. Both
   * optional: the mapper finds them STRUCTURALLY (the two columns whose every value parses as
   * a big-endian ISO date, in column order) rather than by header word, because "start/end"
   * is "début/fin", "Beginn/Ende", "inizio/fine" across the four languages splash ships and a
   * word list would be an open vocabulary. Name them when the CSV carries more than two date
   * columns, or when the second date column is not the end.
   */
  ganttStart?: string;
  ganttEnd?: string;
  /** GANTT — the column that groups rows into colour-coded workstreams. Optional; with no
   *  grouping every bar takes the single default hue. */
  ganttCategory?: string;
  /**
   * CANDLESTICK — the four columns holding each period's open, high, low and close. Optional:
   * the mapper reads the four numeric columns after the date column IN THE ACRONYM'S OWN
   * ORDER (O, H, L, C), which is what "OHLC" names, and then CHECKS that reading against the
   * invariant every row must satisfy (high ≥ max(open, close), low ≤ min(open, close)) — a
   * mis-ordered CSV fails that check on its first row rather than inverting the chart in
   * silence. Name them when the columns are in some other order.
   */
  ohlc?: { open: string; high: string; low: string; close: string };
  /** CANDLESTICK — what the price axis measures ("index level", "CHF", "€/MWh"). Required:
   *  checkCandlestickConformance refuses a candlestick with an unlabelled price axis. */
  priceLabel?: string;
  /** newsroom house theme BACKGROUND (F2 `theme`): the RESOLVED background hex the chart
   *  furniture derives from — "#18181B" for the dark preset, or any newsroom #rrggbb ground.
   *  Undefined = the light default (byte-identical legacy path). Threaded onto every config by
   *  specToNativeConfig; consumed via themeColors(config.themeBg). */
  themeBg?: string;
  /**
   * The DECLARED CLASS of `source` (lib/source/vocabulary.ts): what the figures ARE — a published
   * dataset, a file the journalist brought, an internal table, figures quoted in prose…
   * Threaded onto every produced config's `source` object by specToNativeConfig, and read by
   * the conformance belt (checkGlobalConformance → conformanceL0), which then applies the ONE
   * consequences table (lib/source/requirements.ts) instead of the flat "name required, url
   * optional" rule. OPT-IN: absent, every gate behaves exactly as before this field existed.
   *
   * It rides ON the source object rather than beside it because that object is what the 26
   * produce-conformance call sites already hand down; a sibling field would have had to be
   * re-declared and forwarded at every layer in between.
   */
  sourceKind?: SourceKind;
  /** the chart subject (e.g. "housing rents", "cross-border commuting"). Injected onto
   *  every produced config so the produce-time subject-fit guard can catch a chart left
   *  on a blue-family hue for a non-water/cold subject (design-conformance.md). */
  subject?: string;
  /**
   * WCAG 1.1.1 alt text — the INSIGHT, not the chart's structure (same requirement as
   * dw-chart's `ChartSpec.altInsight`, which its validateChartSpec hard-requires).
   * Optional in the type for backward compatibility with existing spec fixtures, but
   * suggest-chart MUST always emit it (SKILL.md) and the produce-time conformance gate
   * (core/produce-conformance.ts) hard-fails a produced chart without one. Injected
   * onto every produced config in specToNativeConfig; ChartFrame emits it as the
   * visually-hidden accessible description (AltInsightContext).
   */
  altInsight?: string;
  /** Okabe-Ito hex for the primary series (e.g. "#009E73"). Absent → component default. */
  baseColor?: string;
  /** BCP-47 language of the deliverable (e.g. "fr", "en"). Localizes number
   *  separators + furniture at render time. Absent → English. Set by the suggester
   *  from the article language; injected onto every config in specToNativeConfig. */
  lang?: string;
  /**
   * F2 — set true when `baseColor` was SEEDED from the newsroom's brand profile (a
   * conscious house-style choice), not the auto subject-fit hue. Threaded onto the
   * produced config so the produce-time a11y guards downgrade a CVD/contrast failure
   * on this colour to a render-review concern instead of hard-failing (policy b).
   */
  brandExplicit?: boolean;
  /**
   * F2 — set true by the suggester ONLY when the journalist EXPLICITLY named a colour for this
   * chart, shielding it from the newsroom profile's house palette (which otherwise overrides the
   * auto subject-fit baseColor as the house default). Absent → the house palette wins over the
   * auto pick. Consumed by the profile merge (produce-all), not by the producer.
   */
  baseColorExplicit?: boolean;
  /**
   * SCROLLY narrative control — the journalist-confirmed, ORDERED beat plan
   * (line beats / bar highlight-walk). Absent ⇒ the engine auto-picks the beats
   * (line: first + last + 2 biggest moves; bar: top-3 leaders + the tail) —
   * unchanged default behavior. Consumed by deriveChartStory (chart-story.ts);
   * only meaningful for the scrolly format (line/bar), ignored by every other
   * renderer. See NarrativeBeat for anchor semantics + the fail-loud tripwire.
   */
  beats?: NarrativeBeat[];
}

export class UnsupportedNativeType extends Error {
  constructor(type: string) {
    super(
      `spec-to-config: native type "${type}" is not mapped (fall back to dw-chart)`,
    );
    this.name = "UnsupportedNativeType";
  }
}

function looksTemporal(values: (string | number)[]): boolean {
  return values.every((v) => {
    const s = String(v);
    if (/^\d{4}([-/]\d{1,2}){0,2}$/.test(s)) return true; // 2024, 2024-03, 2024/03/01
    return !Number.isNaN(Date.parse(s)) && /[-/]/.test(s);
  });
}

const src = (s: NativeSpec["source"]) => ({ name: s.name, url: s.url ?? "" });

// Resolve the EFFECTIVE bar sort (config-level, so "none" is reachable even though a
// journalist can only type "asc"|"desc"). Precedence:
//   1. an EXPLICIT `spec.sort` always wins (the journalist asked for a value order);
//   2. else, when the spec carries an ordered narrative `beats` walk (a scrolly whose
//      captions walk a journalist-chosen order — e.g. geographic north→south), the bars
//      MUST render in that same data/beat row order, so resolve to "none"
//      (computeBarLayout leaves "none" unsorted — bar-geometry.ts);
//   3. else the auto-pick default stays value-descending ("desc") — unchanged.
// Shared by the mapper (which pins config.sort) and deriveChartStory (whose story index
// must agree with the chart), so the two can never drift.
export function resolveBarSort(spec: NativeSpec): "asc" | "desc" | "none" {
  if (spec.sort) return spec.sort;
  if (Array.isArray(spec.beats) && spec.beats.length > 0) return "none";
  return "desc";
}

/**
 * A combo axis title: the series' own name, plus its unit ONLY when the name does not already
 * carry it. A header called `units` with the unit "units" produced "Units (units)" on the first
 * rendered proof — the stutter is what a reader sees, so it is removed where the information is
 * already there rather than tolerated. Punctuation-only join: nothing to translate.
 */
export function comboAxisLabel(column: string, unit: string): string {
  const name = seriesLabelFromColumn(column);
  const u = unit.trim();
  return name.toLowerCase().includes(u.toLowerCase()) ? name : `${name} (${u})`;
}

// One mapper per reachable native type: (parsed CSV, spec) → the concrete
// {type, config} produce() renders. Each function body is the former `case` in
// specToNativeConfig's switch, moved verbatim so output stays byte-identical.
export const MAPPERS: Record<
  string,
  (
    parsed: ParsedCsv,
    spec: NativeSpec,
  ) => { type: string; config: Record<string, unknown> }
> = {
  bar(parsed, spec) {
    const { columns, rows, numericColumns } = parsed;
    const catCol = columns[0];
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    const sort = resolveBarSort(spec);
    // resolve highlight (a category) to the index it lands at AFTER the display sort —
    // mirror computeBarLayout: "none" keeps the data/beat row order untouched, so the
    // highlight index is just the row position (never re-sorted to value order).
    let highlightIndex: number | undefined;
    if (spec.highlight) {
      const ordered =
        sort === "none"
          ? rows
          : [...rows].sort((a, b) => {
              const d = Number(a[valCol]) - Number(b[valCol]);
              return sort === "desc" ? -d : d;
            });
      const idx = ordered.findIndex(
        (r) => String(r[catCol]) === spec.highlight,
      );
      if (idx >= 0) highlightIndex = idx;
    }
    return {
      type: "bar",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        catField: catCol,
        valField: valCol,
        orientation: spec.orientation ?? "horizontal",
        sort,
        ...(highlightIndex !== undefined ? { highlightIndex } : {}),
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows,
      },
    };
  },
  line(parsed, spec) {
    const { columns, rows, numericColumns } = parsed;
    const catCol = columns[0];
    // A native line draws exactly ONE series. A wide multi-series CSV
    // (year,USA,China,India,EU) has >1 numeric column BEYOND the x/category column;
    // the old mapper silently kept only the last, dropping the rest (silent data
    // loss — the title may name all four). Fail loud so produce-from-spec.mjs exits
    // 2 → FALLBACK_TO_DW → the orchestrator routes to dw-chart (draws multi-line).
    const seriesCols = numericColumns.filter((c) => c !== catCol);
    if (seriesCols.length > 1) throw new UnsupportedNativeType("line");
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    const xCol = catCol;
    const yCol = valCol;
    return {
      type: "line",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        directLabel: spec.directLabel ?? seriesLabelFromColumn(yCol),
        xField: xCol,
        yField: yCol,
        xType: looksTemporal(rows.map((r) => r[xCol])) ? "time" : "linear",
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        points: rows,
      },
    };
  },
  scatter(parsed, spec) {
    const { columns, rows, numericColumns } = parsed;
    const catCol = columns[0];
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    // x = first numeric col, y = second numeric col; label = the category col
    const xCol = numericColumns[0] ?? columns[1];
    const yCol = numericColumns[1] ?? columns[2] ?? valCol;
    const hasLabel = !numericColumns.includes(catCol);
    // The story points the journalist/② names → ScatterChart's `annotate` (labelled by
    // their label value). Prefer the multi-value `highlights` (e.g. "Japan, Qatar,
    // Nigeria"); fall back to the single `highlight`. Without this, ScatterChart labels
    // ONLY the max-y outlier — a 3-highlight scatter shipped with a single label.
    const annotate =
      spec.highlights && spec.highlights.length
        ? spec.highlights
        : spec.highlight
          ? [spec.highlight]
          : undefined;
    return {
      type: "scatter",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        xField: xCol,
        yField: yCol,
        // ScatterConfig requires axis titles. Prefer a spec-provided human label
        // (the suggester/journalist's own wording); otherwise humanize the raw CSV
        // header so the axis reads "Pib par habitant", never the snake_case identifier.
        xLabel: spec.xLabel ?? humanizeColumn(xCol),
        yLabel: spec.yLabel ?? humanizeColumn(yCol),
        ...(hasLabel ? { labelField: catCol } : {}),
        ...(annotate ? { annotate } : {}),
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows,
      },
    };
  },
  "connected-scatter"(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0]; // the sequence/time key that ORDERS the path
    const measures = numericColumns.filter((c) => c !== labelCol);
    const xField = measures[0] ?? columns[1];
    const yField = measures[1] ?? columns[2];
    return {
      type: "connected-scatter",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        labelField: labelCol,
        xField,
        yField,
        // same rule as scatter: spec-provided human label wins, else humanize the header.
        xLabel: spec.xLabel ?? humanizeColumn(xField),
        yLabel: spec.yLabel ?? humanizeColumn(yField),
        // the single path is one subject hue — honour the subject-fit baseColor;
        // absent → the component's OKABE_ITO.blue default.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows, // pass through IN ORDER — do NOT sort (the path follows row order)
      },
    };
  },
  // LINE + COLUMN COMBO (dual axis). The mapper's real work is the DECISION combo was deferred
  // for — which series is the line, which the columns — plus collecting the two units without
  // which checkComboConformance cannot apply the rule that matters most (two series in one unit
  // must not be given two scales). Everything else is derivation.
  //
  // WHY NO CLEVERER DERIVATION. A rate drawn as column length claims a magnitude it does not
  // have; a count on a zero-suppressed axis loses the zero that gives it meaning. Both are
  // silent inversions — the chart looks fine and says the opposite of the truth. Heuristics
  // that would invert silently and were REFUSED here: order of magnitude (a headcount and a
  // price are both "big"), integer-ness (rounded rates are integers, money is not), and header
  // words (`taux`/`rate`/`quota`/`Anteil` — four shipped languages, an open vocabulary, and a
  // French "part" is an English noun). The `%` SYMBOL is the one marker that survives all four
  // languages and cannot mean a count.
  combo(parsed, spec) {
    const catCol = parsed.columns[0];
    const series = parsed.columns
      .slice(1)
      .filter((c) => parsed.numericColumns.includes(c));
    // validateShape (shape "wide") already refused fewer than two; this refuses more, because
    // a combo renders EXACTLY one column series and one line series and would otherwise drop
    // the rest silently — the same data-loss the `line` mapper fails loud on.
    if (series.length !== 2)
      throw new Error(
        `spec-to-config: combo needs exactly two numeric series after the category column, ` +
          `got ${series.length} (${series.join(", ")}) — drop the extras, or use a grouped ` +
          `bar / multi-line chart`,
      );

    const marked = series.filter((c) => c.includes("%"));
    let lineField: string;
    if (spec.comboLine) {
      if (!series.includes(spec.comboLine))
        throw new Error(
          `spec-to-config: comboLine "${spec.comboLine}" is not one of the combo's numeric ` +
            `series (${series.join(", ")})`,
        );
      lineField = spec.comboLine;
    } else if (marked.length === 1) {
      lineField = marked[0];
    } else {
      // The refusal that ASKS. Reached at the validation gate (nativeSpecErrors), so the
      // journalist is told before anything renders — never by a chart that silently picked.
      throw new Error(
        `spec-to-config: combo cannot tell which series is the line and which the columns ` +
          `(${series.join(", ")}). The columns encode length from a zero baseline, the line a ` +
          `rate or index on its own axis — getting it the wrong way round inverts the chart. ` +
          `Set comboLine to the column that should be drawn as the LINE.`,
      );
    }
    const columnField = series.find((c) => c !== lineField)!;

    // A `%` in the header IS a declared unit; anything else must be stated, because the
    // same-unit refusal is unenforceable against units nobody supplied.
    const unitOf = (
      col: string,
      declared: string | undefined,
      field: string,
    ) => {
      const u = declared?.trim() || (col.includes("%") ? "%" : "");
      if (!u)
        throw new Error(
          `spec-to-config: combo needs ${field} — what "${col}" measures. A dual axis is only ` +
            `honest when the two series measure DIFFERENT things, and that cannot be checked ` +
            `without both units.`,
        );
      return u;
    };
    const columnUnit = unitOf(
      columnField,
      spec.comboColumnUnit,
      "comboColumnUnit",
    );
    const lineUnit = unitOf(lineField, spec.comboLineUnit, "comboLineUnit");
    // Refused HERE as well as in checkComboConformance: the gate is where a journalist can
    // still change the answer, the produce guard is the belt that catches a config built any
    // other way. Same rule, stated in the same words, in both places.
    if (columnUnit.toLowerCase() === lineUnit.toLowerCase())
      throw new Error(
        `spec-to-config: both combo series are measured in the same unit ("${columnUnit}") — ` +
          `two scales for one measurement invites a height comparison that is not true; plot ` +
          `them on ONE axis (grouped columns, or two lines).`,
      );

    return {
      type: "combo",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The two series carry the fixed axis-coded Okabe-Ito pair the
        // dual-axis reading depends on (column hue == left axis, line hue == right axis), so
        // the house hue tints the greys and the frame band and never the marks.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        categoryField: catCol,
        columnField,
        lineField,
        columnUnit,
        lineUnit,
        // Derived from the data's own headers + the declared units. The join is punctuation,
        // so nothing here needs translating for a fr/de/it deliverable — and the unit is only
        // appended when the series name does not already carry it, because the first real
        // render read "Units (units)".
        leftAxisLabel: comboAxisLabel(columnField, columnUnit),
        rightAxisLabel: comboAxisLabel(lineField, lineUnit),
        columnSeriesLabel: seriesLabelFromColumn(columnField),
        lineSeriesLabel: seriesLabelFromColumn(lineField),
        rows: parsed.rows,
      },
    };
  },
  // GANTT / TIMELINE — the type's deferral said "needs start/end intervals", and the decision
  // it was waiting on is HOW a CSV declares an interval without a word list.
  //
  // STRUCTURALLY, NOT BY HEADER WORD. The two date columns are the two columns whose EVERY
  // value parses as a big-endian ISO date (lib/core/date-locale), taken in column order:
  // earlier column = start, later = end. Deliberately no `start`/`end` header heuristic —
  // that is "début/fin", "Beginn/Ende", "inizio/fine" across the four shipped languages, an
  // open vocabulary, and the same class of silent-inversion guess combo was held back for.
  // `ganttStart`/`ganttEnd` name them explicitly and always win.
  //
  // AND THE ORDER IS CHECKED, NOT ASSUMED: if a row's end precedes its start the mapper
  // refuses AT THE GATE, naming the row — a backwards interval drawn is a bar of negative
  // length, which renders as nothing at all and reads as "this phase did not happen".
  gantt(parsed, spec) {
    const labelCol =
      spec.ganttCategory === parsed.columns[0]
        ? parsed.columns.find((c) => c !== spec.ganttCategory)!
        : parsed.columns[0];
    const dateCols = parsed.columns.filter(
      (c) =>
        c !== labelCol &&
        parsed.rows.length > 0 &&
        parsed.rows.every((r) => parseIsoDate(String(r[c])) !== null),
    );

    const named = (field: "ganttStart" | "ganttEnd") => {
      const v = spec[field];
      if (v === undefined) return undefined;
      if (!parsed.columns.includes(v))
        throw new Error(
          `spec-to-config: ${field} "${v}" is not a column of the CSV ` +
            `(${parsed.columns.join(", ")})`,
        );
      return v;
    };
    let startCol = named("ganttStart");
    let endCol = named("ganttEnd");
    if (!startCol || !endCol) {
      if (dateCols.length !== 2)
        // The refusal that ASKS. Reached at the validation gate (nativeSpecErrors), so the
        // journalist is told before anything renders.
        throw new Error(
          `spec-to-config: gantt needs exactly two date columns — a start and an end — and ` +
            `found ${dateCols.length}` +
            (dateCols.length ? ` (${dateCols.join(", ")})` : "") +
            `. Dates must be big-endian (YYYY-MM-DD, YYYY-MM or YYYY); name the two ` +
            `columns with ganttStart / ganttEnd if the CSV carries others.`,
        );
      startCol = startCol ?? dateCols[0];
      endCol = endCol ?? dateCols[1];
    }
    if (startCol === endCol)
      throw new Error(
        `spec-to-config: gantt's start and end are the same column ("${startCol}") — an ` +
          `interval needs two`,
      );

    if (spec.ganttCategory && !parsed.columns.includes(spec.ganttCategory))
      throw new Error(
        `spec-to-config: ganttCategory "${spec.ganttCategory}" is not a column of the CSV ` +
          `(${parsed.columns.join(", ")})`,
      );
    const catCol =
      spec.ganttCategory ??
      parsed.columns.find(
        (c) => c !== labelCol && c !== startCol && c !== endCol,
      );

    const items = parsed.rows.map((r) => {
      const label = String(r[labelCol]);
      const start = String(r[startCol!]);
      const end = String(r[endCol!]);
      // Both refusals name the ROW. `requireIsoDate` does it for an unreadable date; this
      // does it for a readable one in the wrong order — the case the type was asked to
      // refuse by name.
      const s0 = requireIsoDate(start, `the start of "${label}"`);
      const e0 = requireIsoDate(end, `the end of "${label}"`);
      if (endOfGrain(e0) < s0.ms)
        throw new Error(
          `spec-to-config: gantt row "${label}" ends before it starts ` +
            `(${start} → ${end}) — an interval drawn backwards is a bar of negative ` +
            `length, which renders as nothing and reads as "this never happened". Fix the ` +
            `two dates, or swap ganttStart / ganttEnd if the columns are the other way round.`,
        );
      return {
        label,
        start,
        end,
        ...(catCol ? { category: String(r[catCol]) } : {}),
      };
    });

    // The colour-coded workstreams, in first-appearance order — the order the legend reads
    // and the order GANTT_GROUP_COLORS is indexed by, so legend and bars cannot drift.
    const categories = catCol
      ? [...new Set(items.map((i) => i.category!))]
      : undefined;

    return {
      type: "gantt",
      config: {
        title: spec.title,
        // The time-axis CAPTION. A gantt's bar length is DURATION, and readers trained on bar
        // charts read length as magnitude — checkGanttConformance refuses a gantt without
        // this caption for exactly that reason (gantt.md's data-to-viz caveat).
        unit: spec.unit,
        source: src(spec.source),
        // FURNITURE only. Bars carry the fixed Okabe-Ito group palette — one house hue would
        // collapse the workstreams it exists to separate.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        ...(categories ? { categories } : {}),
        items,
      },
    };
  },
  // CANDLESTICK / OHLC — the type's deferral said "needs OHLC", and the decision it was
  // waiting on is how a CSV declares four numbers per period without a header word list.
  //
  // THE ACRONYM IS THE ORDER, AND THE ORDER IS CHECKED. "OHLC" names its own column order, so
  // the four numeric columns after the date are read as open, high, low, close — and that
  // reading is then VERIFIED against the invariant every real period satisfies (high is the
  // period's maximum, low its minimum). A CSV in some other order fails that check on its
  // first row, naming the row, instead of inverting every candle in silence. `spec.ohlc` names
  // the four columns when they are in another order.
  //
  // WHY NOT DERIVE OPEN vs CLOSE STRUCTURALLY: high and low CAN be told apart from the data
  // (one is the row maximum, the other the minimum), but open and close cannot — they are two
  // interior values, and swapping them flips every candle's DIRECTION while the chart still
  // looks entirely well-formed. That is the silent inversion this engine refuses to guess at.
  candlestick(parsed, spec) {
    const dateCol = parsed.columns[0];
    const nums = parsed.columns
      .slice(1)
      .filter((c) => parsed.numericColumns.includes(c));

    let roles: { open: string; high: string; low: string; close: string };
    if (spec.ohlc) {
      for (const [role, col] of Object.entries(spec.ohlc))
        if (!parsed.columns.includes(col))
          throw new Error(
            `spec-to-config: candlestick's ${role} column "${col}" is not in the CSV ` +
              `(${parsed.columns.join(", ")})`,
          );
      roles = spec.ohlc;
    } else {
      if (nums.length !== 4)
        // The refusal that NAMES what is missing. Reached at the validation gate
        // (nativeSpecErrors), so the journalist is told before anything renders.
        throw new Error(
          `spec-to-config: this data is not OHLC — a candlestick needs FOUR numeric columns ` +
            `per period (open, high, low, close) after the date column, and found ` +
            `${nums.length}` +
            (nums.length ? ` (${nums.join(", ")})` : "") +
            `. One value per period is a line or a bar chart, not a candlestick; if the four ` +
            `columns are in another order, name them with the \`ohlc\` field.`,
        );
      roles = { open: nums[0], high: nums[1], low: nums[2], close: nums[3] };
    }

    const periods = parsed.rows.map((r) => {
      const date = String(r[dateCol]);
      const p = {
        date,
        open: Number(r[roles.open]),
        high: Number(r[roles.high]),
        low: Number(r[roles.low]),
        close: Number(r[roles.close]),
      };
      // The reading, CHECKED — and the check is what makes reading by acronym order safe.
      if (
        p.high < Math.max(p.open, p.close) ||
        p.low > Math.min(p.open, p.close)
      )
        throw new Error(
          `spec-to-config: candlestick period "${date}" is not valid OHLC — its high ` +
            `(${p.high}) is below, or its low (${p.low}) above, the open/close body ` +
            `(${p.open} → ${p.close}). Either the data is wrong, or the four columns are not ` +
            `in open-high-low-close order — name them with the \`ohlc\` field.`,
        );
      return p;
    });

    if (!spec.priceLabel?.trim())
      throw new Error(
        `spec-to-config: candlestick needs priceLabel — what the price axis measures ` +
          `("index level", "CHF", "€/MWh"). The axis does not start at zero (a candlestick ` +
          `encodes by POSITION), so an unlabelled one gives the reader no scale at all.`,
      );

    return {
      type: "candlestick",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        priceLabel: spec.priceLabel,
        // FURNITURE only. The candles are coloured by DIRECTION, and the two direction hues
        // are the whole legend — a house hue over them would erase the up/down distinction.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        periods,
      },
    };
  },
  grouped(parsed, spec) {
    const catCol = parsed.columns[0];
    // wide convention: every NUMERIC column after the category is a series
    const seriesFields = parsed.columns
      .slice(1)
      .filter((c) => parsed.numericColumns.includes(c));
    return {
      type: "grouped",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        catField: catCol,
        seriesFields,
        rows: parsed.rows,
      },
    };
  },
  stacked(parsed, spec) {
    const catCol = parsed.columns[0];
    // wide convention: every NUMERIC column after the category is a series
    // (byte-identical to grouped's mapper — same wide-CSV shape).
    const seriesFields = parsed.columns
      .slice(1)
      .filter((c) => parsed.numericColumns.includes(c));
    return {
      type: "stacked",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        catField: catCol,
        seriesFields,
        rows: parsed.rows,
      },
    };
  },
  "stacked-area"(parsed, spec) {
    const catCol = parsed.columns[0];
    // wide convention: every NUMERIC column after the time key is a series
    // (byte-identical to stacked's mapper — same wide-CSV shape — except the
    // config field is `xField`, not `catField`; the geometry needs a numeric
    // time key here, e.g. a year column).
    const seriesFields = parsed.columns
      .slice(1)
      .filter((c) => parsed.numericColumns.includes(c));
    return {
      type: "stacked-area",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        xField: catCol,
        seriesFields,
        rows: parsed.rows,
      },
    };
  },
  heatmap(parsed, spec) {
    // wide MATRIX convention: the first column is the ROW dimension (e.g. day),
    // every following numeric column is a value of the COLUMN dimension (e.g. an
    // hour band). Each cell is rows[i][colField] — colour encodes that value via
    // the component's sequential CVD-safe ramp (heatmap-geometry.ts BLUES); this is
    // the first reachable type where COLOUR is the quantitative channel. Mirrors the
    // grouped/stacked wide-CSV shape, but the config field names are rowField/colFields.
    const rowField = parsed.columns[0];
    const colFields = parsed.columns
      .slice(1)
      .filter((c) => parsed.numericColumns.includes(c));
    return {
      type: "heatmap",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        rowField,
        colFields,
        // COLOUR is the quantitative channel here — thread the subject/house baseColor so the
        // sequential ramp is DERIVED from it (heatmapRamp), not the fixed Blues. Absent → the
        // component falls back to the Okabe-Ito blue default hue.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows: parsed.rows,
      },
    };
  },
  histogram(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const valueField =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    return {
      type: "histogram",
      config: {
        title: spec.title,
        source: src(spec.source),
        // unit does double duty (subtitle + inline "median N unit"); prefer the short callout unit
        unit: spec.valueUnit ?? spec.unit,
        valueField,
        // the distribution bars are one subject hue — honour the subject-fit baseColor;
        // absent → the component's theme line colour (Okabe-Ito blue).
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows,
      },
    };
  },
  lollipop(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const catCol = columns[0];
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    return {
      type: "lollipop",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        catField: catCol,
        valField: valCol,
        ...(spec.highlight ? { highlightLabel: spec.highlight } : {}),
        // the neutral stems/dots are one subject hue — honour the subject-fit baseColor
        // (the vermillion highlight accent is unchanged); absent → OKABE_ITO.blue default.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows,
      },
    };
  },
  beeswarm(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    const textCols = columns.filter(
      (c) => c !== valCol && !numericColumns.includes(c),
    );
    const distinct = (c: string) => new Set(rows.map((r) => String(r[c]))).size;
    // low-cardinality text col groups the swarm into colours (HARD-capped at ≤5
    // by checkBeeswarmConformance at produce time); the other text col (if any)
    // is per-point label only — never blindly columns[0] (a unique-per-row name
    // would blow the category cap). If the lowest-distinct text col STILL exceeds
    // 5 (e.g. a single high-cardinality name column), skip grouping entirely and
    // demote that column to a per-point label instead — a single-hue swarm, not a
    // produce-time conformance failure.
    const sorted = [...textCols].sort((a, b) => distinct(a) - distinct(b));
    const lowest = sorted[0];
    const useCategory = lowest !== undefined && distinct(lowest) <= 5;
    const catCol = useCategory ? lowest : undefined;
    const labelCol = useCategory ? sorted[1] : lowest;
    const categories = catCol
      ? [...new Set(rows.map((r) => String(r[catCol])))]
      : undefined;
    const points = rows.map((r) => ({
      value: Number(r[valCol]),
      ...(labelCol ? { label: String(r[labelCol]) } : {}),
      ...(catCol ? { category: String(r[catCol]) } : {}),
    }));
    // outliers the story calls out — support several (the "two communes that break
    // away"). Prefer the multi-value `highlights`; fall back to the single `highlight`.
    const outliers =
      spec.highlights && spec.highlights.length
        ? spec.highlights
        : spec.highlight
          ? [spec.highlight]
          : [];
    return {
      type: "beeswarm",
      config: {
        title: spec.title,
        source: src(spec.source),
        valueLabel: spec.unit, // NativeSpec has no valueLabel; its long-axis `unit` maps here
        ...(categories ? { categories } : {}),
        // a single-hue swarm honours the subject-fit baseColor; a categorised swarm
        // ignores it (the component's colorOf uses the category palette there).
        ...(!categories && spec.baseColor ? { baseColor: spec.baseColor } : {}),
        ...(outliers.length ? { highlight: outliers } : {}),
        points,
      },
    };
  },
  "dot-strip"(parsed, spec) {
    const catCol = parsed.columns[0];
    const valCol =
      parsed.numericColumns[parsed.numericColumns.length - 1] ??
      parsed.columns[parsed.columns.length - 1];
    return {
      type: "dot-strip",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        categoryField: catCol,
        valueField: valCol,
        // the dots are one subject hue — honour the subject-fit baseColor;
        // absent → the component's OKABE_ITO.blue default.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows: parsed.rows, // RAW observations — many rows share a category, do NOT aggregate
      },
    };
  },
  pie(parsed, spec) {
    const { columns, rows, numericColumns } = parsed;
    const catCol = columns[0];
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    return {
      type: "pie",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        labelField: catCol,
        valueField: valCol,
        rows,
      },
    };
  },
  "radial-bar"(parsed, spec) {
    const catCol = parsed.columns[0];
    const valCol =
      parsed.numericColumns[parsed.numericColumns.length - 1] ??
      parsed.columns[parsed.columns.length - 1];
    return {
      type: "radial-bar",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        categoryField: catCol,
        valueField: valCol,
        // the ring bars are one subject hue — honour the subject-fit baseColor (the
        // orange PEAK accent is unchanged); absent → the component's OKABE_ITO.blue default.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows: parsed.rows, // CSV order — angle encodes cyclical position, do NOT sort
      },
    };
  },
  diverging(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const catCol = columns[0];
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    return {
      type: "diverging",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        catField: catCol,
        valField: valCol,
        rows,
      },
    };
  },
  waffle(parsed, spec) {
    const catCol = parsed.columns[0];
    const valCol =
      parsed.numericColumns[parsed.numericColumns.length - 1] ??
      parsed.columns[parsed.columns.length - 1];
    const items = parsed.rows.map((r) => ({
      label: String(r[catCol]),
      value: Number(r[valCol]),
    }));
    return {
      type: "waffle",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // the PRIMARY (first) category is the subject — honour its subject-fit hue;
        // absent → the component's WAFFLE_CATEGORY_COLORS[0] default.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        items,
      },
    };
  },
  pictogram(parsed, spec) {
    const catCol = parsed.columns[0];
    const valCol =
      parsed.numericColumns[parsed.numericColumns.length - 1] ??
      parsed.columns[parsed.columns.length - 1];
    const values = parsed.rows.map((r) => Number(r[valCol]));
    // WHAT ONE ICON IS WORTH — the one decision this type needs that the CSV never
    // carries. A journalist's stated unit is an editorial choice about how coarse the
    // count should read, so it wins outright; otherwise derive a round 1-2-5 value that
    // keeps the longest row inside the countable band (chooseUnitPerIcon), because an
    // underived unit is how a row becomes 380 unreadable figures.
    const unitPerIcon = spec.unitPerIcon ?? chooseUnitPerIcon(values);
    // WHAT ONE ICON COUNTS — printed next to the key ("= 10 000 residents"), so it must
    // read as prose: de-snake the column, but never force-case an acronym ("FTE").
    const humanized = humanizeColumn(valCol);
    const iconNoun = /^[A-Z]{2,}/.test(humanized)
      ? humanized
      : humanized.charAt(0).toLowerCase() + humanized.slice(1);
    return {
      type: "pictogram",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        categoryField: catCol,
        valueField: valCol,
        unitPerIcon,
        iconNoun,
        // The icons DO take the house/subject hue. Colour is not the quantitative channel
        // here (the count is), but neither is it in a bar — and a pictogram left on the
        // engine blue under a green house profile is the same defect the map house-colour
        // work closed. One hue for every icon, so equal marks stay equal.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows: parsed.rows,
      },
    };
  },
  // ---------------------------------------------------------------------------------
  // THE FLOW FAMILY — three marks over ONE table. Each mapper below reads the same link
  // list (`readFlowLinks`) and differs only in what it DERIVES from it and what it
  // REFUSES. The refusals are the point: all three forms can be drawn from any link list,
  // and two of the three drawings would be wrong.
  // ---------------------------------------------------------------------------------
  sankey(parsed, spec) {
    const links = readFlowLinks(parsed, "sankey");
    // A SANKEY CANNOT DRAW A CYCLE. Its columns are stages and a link points rightwards; a
    // loop has no stage order, so a layout would have to either fold a ribbon back across
    // the picture or silently cut the link that closes the loop. Both draw something the
    // data does not say, so the pair is named and refused instead. (A self-link is the
    // one-node case of the same fact and prints the same way.)
    const cycle = flowCycle(links);
    if (cycle)
      throw new FlowShapeError(
        `sankey: the flow loops back on itself (${cycle.join(" → ")}) — a Sankey's columns are ` +
          `STAGES, so every link must point forward and a cycle has no stage order. Break the ` +
          `loop (split the looping node into its two roles, e.g. "Storage in" / "Storage out"), ` +
          `or use a chord, which is built for flows that go both ways.`,
      );

    const nodes = flowNodes(links);
    const columns = flowColumns(links);
    const totals = flowTotals(links);
    const flowIn = (n: string) => totals.in.get(n) ?? 0;
    const flowOut = (n: string) => totals.out.get(n) ?? 0;

    // FLOW CONSERVATION, refused at the gate. A node with both an in and an out side is a
    // STAGE the quantity passes through, and what enters it must leave it. The geometry
    // draws such a node at max(in, out) — so a stage that loses a fifth of its quantity
    // renders as a perfectly solid bar with thinner ribbons on one side, and the loss is
    // invisible. The sheet's repair is to make the loss its OWN node ("Losses"), which is
    // also the honest one: it puts the missing quantity on the picture.
    for (const n of nodes) {
      const i = flowIn(n);
      const o = flowOut(n);
      if (i === 0 || o === 0) continue; // a source or a sink conserves nothing
      // Relative tolerance: real flow tables are rounded (percentages, thousands), and an
      // exact-equality rule would refuse honest data over a rounding crumb.
      if (Math.abs(i - o) > SANKEY_CONSERVATION_TOLERANCE * Math.max(i, o))
        throw new FlowShapeError(
          `sankey: "${n}" does not conserve the flow — ${i} enters and ${o} leaves. A stage ` +
            `cannot create or lose quantity silently (the node would still render solid, at ` +
            `the larger of the two). Add the difference as its own node ("Losses", "Other"), ` +
            `or correct the table.`,
        );
    }

    // ORDER, DERIVED AND STABLE: by stage, then by the quantity through the node
    // (largest at the top, the reading order of every ranked chart), then by the order the
    // journalist's own rows named them. No randomness, no hash order.
    const weight = (n: string) => Math.max(flowIn(n), flowOut(n));
    const ordered = [...nodes].sort(
      (a, b) =>
        columns.get(a)! - columns.get(b)! ||
        weight(b) - weight(a) ||
        nodes.indexOf(a) - nodes.indexOf(b),
    );

    // COLOUR, DERIVED: the convention this type's sheet states is "colour links by their
    // SOURCE" — so the first stage's nodes take the Okabe-Ito ramp and every later node is
    // neutral, which is what makes a ribbon traceable across the picture. Past the ramp's
    // honest capacity the whole diagram goes neutral rather than repeating a hue: two
    // different origins in one colour is worse than none in colour.
    const origins = ordered.filter((n) => columns.get(n) === 0);
    const rampNodes = origins.length <= SANKEY_MAX_RAMP_NODES ? origins : [];
    const ramped = new Set(rampNodes);

    return {
      type: "sankey",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rampNodes,
        nodes: ordered.map((n) => ({
          id: n,
          label: n,
          column: columns.get(n)!,
          ...(ramped.has(n) ? { category: n } : {}),
        })),
        links: links.map((l) => ({ ...l })),
      },
    };
  },
  chord(parsed, spec) {
    const links = readFlowLinks(parsed, "chord");
    const nodes = flowNodes(links);
    const totals = flowTotals(links);
    const total = (n: string) =>
      (totals.in.get(n) ?? 0) + (totals.out.get(n) ?? 0);

    // A CHORD IS AN EXCHANGE, NOT A PIPELINE — and this is the exact mirror of the sankey's
    // own refusal. A sankey refuses a cycle because its columns are stages; a chord REQUIRES
    // one, because a ring of things that never send anything back to each other is not an
    // exchange at all: every quantity moves strictly forward, which is a staged flow wearing
    // a circle. (The first draft of this rule asked whether any entity both sends AND
    // receives, and a hub passes that trivially — the energy-mix table, five sources into one
    // grid into five uses, sailed straight through it. Acyclicity is the fact that actually
    // separates the two forms.)
    if (!flowCycle(links))
      throw new FlowShapeError(
        `chord: nothing in this table flows BOTH WAYS — every link moves strictly forward ` +
          `(${links.map((l) => `${l.source}→${l.target}`).join(", ")}), which is a flow ` +
          `THROUGH STAGES, and a chord's ring is one set exchanging with itself. Use ` +
          `\`sankey\` for this table.`,
      );

    // ORDER, DERIVED AND STABLE: largest total first (the sheet's "order entities
    // deliberately — size or group — and keep the order fixed"), ties broken by the order
    // the journalist's rows named them.
    const labels = [...nodes].sort(
      (a, b) => total(b) - total(a) || nodes.indexOf(a) - nodes.indexOf(b),
    );
    if (labels.length > CHORD_MAX_ENTITIES)
      throw new FlowShapeError(
        `chord: ${labels.length} entities (${labels.join(", ")}) — past ${CHORD_MAX_ENTITIES} ` +
          `the ribbons knot and no reader can follow one across the circle, and the palette has ` +
          `no ${CHORD_MAX_ENTITIES + 1}th hue that stays distinguishable. Aggregate the small ` +
          `entities into an "Other", or use \`sankey\` if the flow really is directional.`,
      );

    return {
      type: "chord",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        labels,
        matrix: flowMatrix(links, labels),
      },
    };
  },
  arc(parsed, spec) {
    const links = readFlowLinks(parsed, "arc");
    // AN ARC HAS NO SELF-LINK TO DRAW. The mark is a half-ellipse between two points on the
    // baseline; when the two points are one point the ellipse has zero width and draws
    // nothing at all — a relationship silently absent from the picture. Named and refused.
    const self = flowSelfLink(links);
    if (self)
      throw new FlowShapeError(
        `arc: "${self.source}" links to itself — an arc is drawn between two positions on the ` +
          `baseline, so a self-link has no width and would simply vanish. Remove the row, or ` +
          `use a chord, whose ring can hold a self-flow.`,
      );

    // ORDER ALONG THE BASELINE IS THE EDITORIAL CHOICE, and it is taken from the ONE place
    // the journalist can state it without a new field: the order of their own rows. First
    // appearance, left to right (`flowNodes`). Deriving it from degree instead would make
    // the axis a ranking — a second encoding nobody asked for, and one that scatters
    // neighbours the story may want adjacent.
    const nodes = flowNodes(links);
    if (nodes.length > ARC_MAX_NODES)
      throw new FlowShapeError(
        `arc: ${nodes.length} nodes on one baseline — past ${ARC_MAX_NODES} the labels have no ` +
          `room and the arcs overlap into a single band. Aggregate the small nodes, or split ` +
          `the story.`,
      );
    // …and the count is only the ceiling. Whether these PARTICULAR names still fit is a LAYOUT
    // fact — "Sozialdemokratische Partei" runs out of room at ten nodes where "PS" is fine at
    // fourteen — so it is MEASURED on the baseline the component will draw, with the same
    // function the produce guard uses. Measured here as well as there because a produce-time
    // refusal reaches the journalist after they have been through the whole flow, and this one
    // reaches them at the gate, where they can still change the table.
    const fit = arcLabelFit(
      {
        nodes: nodes.map((n) => ({ id: n, label: n })),
        links: links.map((l) => ({ ...l })),
      },
      (l) => textWidth(l, TYPE.source),
    );
    if (fit.minGapPx * 0.94 < fit.labelPx * ARC_MIN_LABEL_RATIO)
      throw new FlowShapeError(
        `arc: ${nodes.length} nodes with names this long cannot be labelled on one baseline — ` +
          `"${fit.longestLabel}" needs ${Math.round(fit.labelPx)}px and the baseline leaves ` +
          `${Math.round(fit.minGapPx * 0.94)}px, so every name would render as an ellipsis. ` +
          `Shorten the names, aggregate the small nodes, or split the story.`,
      );

    return {
      type: "arc",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        nodes: nodes.map((n) => ({ id: n, label: n })),
        links: links.map((l) => ({ ...l })),
      },
    };
  },
  dumbbell(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0];
    const [leftField, rightField] = numericColumns.slice(0, 2);
    return {
      type: "dumbbell",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        labelField: labelCol,
        leftField,
        rightField,
        leftLabel: leftField,
        rightLabel: rightField,
        rows,
      },
    };
  },
  slope(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0];
    const leftField = numericColumns[0];
    const rightField = numericColumns[numericColumns.length - 1];
    return {
      type: "slope",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        labelField: labelCol,
        leftField,
        rightField,
        leftPeriod: leftField, // the two column headers are the period captions
        rightPeriod: rightField,
        ...(spec.highlight ? { highlightLabel: spec.highlight } : {}),
        rows,
      },
    };
  },
  bullet(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0];
    // target = a column literally named "target", else the last numeric column
    const targetCol =
      columns.find((c) => c.toLowerCase() === "target") ??
      numericColumns[numericColumns.length - 1];
    // value = the other numeric column (the measure)
    const valueCol =
      numericColumns.find((c) => c !== targetCol) ?? numericColumns[0];
    const bulletRows = rows.map((r) => {
      const value = Number(r[valueCol]);
      const target = Number(r[targetCol]);
      // per-row scale with ~15% headroom so the target marker never hugs the edge
      const max = Math.ceil(Math.max(value, target) * 1.15);
      return {
        label: String(r[labelCol]),
        unit: spec.unit,
        value,
        target,
        max,
        bands: [] as number[], // single neutral track; qualitative multi-band deferred
      };
    });
    return {
      type: "bullet",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows: bulletRows,
      },
    };
  },
  treemap(parsed, spec) {
    const { columns, rows, numericColumns } = parsed;
    const labelCol = columns[0];
    const valueCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    // optional grouping column: the first column that is neither the label nor
    // the value column and isn't numeric (mirrors waffle's label/value pair,
    // plus one extra text column for the group colouring).
    const rawCatCol = columns.find(
      (c) => c !== labelCol && c !== valueCol && !numericColumns.includes(c),
    );
    // TREEMAP_GROUP_COLORS has exactly 5 entries; the component/guard index it
    // modulo-length, so a column with >5 distinct values would silently wrap
    // and paint two different groups the same colour (indistinguishable —
    // same legend swatch, guard can't catch it since it counts REALIZED hex
    // values, structurally ≤5). Mirrors beeswarm's cap-then-degrade: past 5,
    // drop the grouping entirely and fall through to the flat single-hue path.
    const catCol =
      rawCatCol !== undefined &&
      new Set(rows.map((r) => String(r[rawCatCol]))).size <= 5
        ? rawCatCol
        : undefined;
    const items = rows.map((r) => ({
      label: String(r[labelCol]),
      value: Number(r[valueCol]),
      ...(catCol ? { category: String(r[catCol]) } : {}),
    }));
    const categories = catCol
      ? [...new Set(rows.map((r) => String(r[catCol])))]
      : undefined;
    return {
      type: "treemap",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        ...(categories ? { categories } : {}),
        // FLAT (ungrouped) treemap paints every cell one subject hue — honour the
        // subject-fit baseColor; absent → the component's OKABE_ITO.blue default. A
        // GROUPED treemap uses TREEMAP_GROUP_COLORS per category (baseColor ignored there).
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        items,
      },
    };
  },
  boxplot(parsed, spec) {
    const { columns, rows, numericColumns } = parsed;
    const catCol = columns[0];
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    // group RAW observations by category — do NOT aggregate; the geometry
    // computes the five-number summary itself (mirrors dot-strip's raw-rows
    // convention, but grouped into per-category arrays).
    const groups = new Map<string, number[]>();
    for (const r of rows) {
      const cat = String(r[catCol]);
      const values = groups.get(cat) ?? [];
      values.push(Number(r[valCol]));
      groups.set(cat, values);
    }
    const categories = [...groups.entries()].map(([label, values]) => ({
      label,
      values,
    }));
    return {
      type: "boxplot",
      config: {
        title: spec.title,
        source: src(spec.source),
        valueLabel: spec.unit, // NativeSpec has no valueLabel; its long-axis `unit` maps here
        // the boxes are one subject hue — honour the subject-fit baseColor;
        // absent → the component's OKABE_ITO.blue default.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        categories,
      },
    };
  },
  violin(parsed, spec) {
    const { columns, rows, numericColumns } = parsed;
    const catCol = columns[0];
    const valCol =
      numericColumns[numericColumns.length - 1] ?? columns[columns.length - 1];
    // group RAW observations by category — the KDE needs the real distribution,
    // not a summary (identical convention to boxplot's mapper; the geometry
    // itself computes density + median/IQR from the raw values).
    const groups = new Map<string, number[]>();
    for (const r of rows) {
      const cat = String(r[catCol]);
      const values = groups.get(cat) ?? [];
      values.push(Number(r[valCol]));
      groups.set(cat, values);
    }
    const categories = [...groups.entries()].map(([label, values]) => ({
      label,
      values,
    }));
    return {
      type: "violin",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // the violins are one subject hue — honour the subject-fit baseColor;
        // absent → the component's OKABE_ITO.blue default.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        categories,
      },
    };
  },
  "diverging-stacked"(parsed, spec) {
    const { columns, rows, numericColumns } = parsed;
    const labelCol = columns[0];
    // wide convention: every NUMERIC column after the label is an ordered Likert
    // response, negative → positive (mirrors grouped/stacked's wide-CSV shape).
    const responses = columns
      .slice(1)
      .filter((c) => numericColumns.includes(c));
    // An ODD response count has a genuine middle bucket (e.g. a 5-point Likert's
    // "neutral") — straddle it at the centre per diverging-stacked.md rule 1
    // (checkGlobalConformance can't catch a missing straddle; only the render
    // can, and it did: omitting this collapsed "neutral" into the positive
    // ramp AND made two positive segments share one hue, since the 2-tier
    // ramp only has capacity for 2 members per side). An EVEN count is a
    // forced-choice bipolar scale with no true middle, so it's left undefined
    // (the geometry's plain floor(R/2) split, no straddle).
    const neutralIndex =
      responses.length % 2 === 1 ? Math.floor(responses.length / 2) : undefined;
    const items = rows.map((r) => ({
      label: String(r[labelCol]),
      values: responses.map((c) => Number(r[c])),
    }));
    return {
      type: "diverging-stacked",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        responses,
        ...(neutralIndex !== undefined ? { neutralIndex } : {}),
        items,
      },
    };
  },
  pyramid(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const bandCol = columns[0];
    // paired convention (mirrors dumbbell): first two numeric columns are the
    // two mirrored sides; their headers double as the side labels.
    const [leftField, rightField] = numericColumns.slice(0, 2);
    return {
      type: "pyramid",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        bandField: bandCol,
        leftField,
        rightField,
        leftLabel: leftField,
        rightLabel: rightField,
        rows,
      },
    };
  },
  fan(parsed, spec) {
    const { columns, rows } = parsed;
    const xField = columns[0];
    // derive confidence levels by scanning headers for the lo{n}/hi{n} pairing
    // convention the geometry expects (fan-geometry.ts:12,63-67) — a lone
    // lo{n} with no matching hi{n} is dropped rather than guessed.
    const levels = columns
      .map((c) => /^lo(\d+)$/.exec(c)?.[1])
      .filter((n): n is string => n !== undefined && columns.includes(`hi${n}`))
      .map(Number)
      .sort((a, b) => a - b);
    const bandKeys = levels.flatMap((lv) => [`lo${lv}`, `hi${lv}`]);
    const keys = ["actual", "central", ...bandKeys];
    // history rows populate `actual` and leave central/bands blank; forecast
    // rows are the mirror — coerce only the POPULATED cells to numbers so
    // fan-geometry's `!= null` checks correctly read "no value" (blank) vs a
    // real 0, instead of everything landing on the domain as 0.
    const fanRows = rows.map((r) => {
      const out: Record<string, number> = { [xField]: Number(r[xField]) };
      for (const k of keys) {
        const v = r[k];
        if (v !== undefined && v !== "") out[k] = Number(v);
      }
      return out;
    });
    return {
      type: "fan",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        xField,
        levels,
        // the fan bands + central line are one subject hue — honour the subject-fit
        // baseColor; absent → the component's OKABE_ITO.blue default.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows: fanRows,
      },
    };
  },
  bump(parsed, spec) {
    const { columns, rows, numericColumns } = parsed;
    const labelCol = columns[0];
    // wide convention: every NUMERIC column after the label is an ordered period
    // (mirrors grouped/stacked's wide-CSV shape); the header itself is the period
    // caption (e.g. "team,2021,2022,2023").
    const periods = columns.slice(1).filter((c) => numericColumns.includes(c));
    const items = rows.map((r) => ({
      label: String(r[labelCol]),
      ranks: periods.map((p) => Number(r[p])),
    }));
    return {
      type: "bump",
      config: {
        title: spec.title,
        source: src(spec.source),
        valueLabel: spec.unit,
        periods,
        ...(spec.highlight ? { highlight: [spec.highlight] } : {}),
        // the tracked line honours the spec's subject-fit colour, like every other
        // type (the bump mapper tracks ONE line, so it's the single-highlight case).
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        items,
      },
    };
  },
  waterfall(parsed, spec) {
    const { columns, numericColumns, rows } = parsed;
    const labelCol = columns[0];
    // optional boolean-ish "total" column marks running-total rows (opening/closing)
    const totalCol = columns.find((c) => c.toLowerCase() === "total");
    const valueCandidates = numericColumns.filter((c) => c !== totalCol);
    const valCol =
      valueCandidates[valueCandidates.length - 1] ??
      columns[columns.length - 1];
    const wrows = rows.map((r) => ({
      label: String(r[labelCol]),
      value: Number(r[valCol]),
      ...(totalCol &&
      String(r[totalCol])
        .toLowerCase()
        .match(/^(1|true|yes)$/)
        ? { total: true }
        : {}),
    }));
    return {
      type: "waterfall",
      config: {
        title: spec.title,
        source: src(spec.source),
        unit: spec.unit,
        // FURNITURE only. The house hue tints the greys and the frame band; this type
        // encodes with a fixed categorical/role palette, which the hue must never touch.
        ...(spec.baseColor ? { baseColor: spec.baseColor } : {}),
        rows: wrows,
      },
    };
  },
};

/** NativeSpec → { type, config } for the produce() path. */
export function specToNativeConfig(spec: NativeSpec): {
  type: string;
  config: Record<string, unknown>;
} {
  const parsed = parseCsv(spec.data);
  const mapper = MAPPERS[spec.nativeType];
  if (!mapper) throw new UnsupportedNativeType(spec.nativeType);
  validateShape(spec.nativeType, parsed);
  const out = mapper(parsed, spec);
  // Single injection point: thread the language onto EVERY produced config so all
  // types inherit locale-aware number/furniture rendering without touching each mapper.
  if (spec.lang) out.config.lang = spec.lang;
  // F2 — carry the brand-explicit marker through to the config the guards read.
  // Only set when true, so existing (auto-path) specs produce byte-identical configs.
  if (spec.brandExplicit) out.config.brandExplicit = true;
  // Subject → carried onto every config for the produce-time subject-fit guard (only
  // beeswarm reads it today; other types can opt in). Only set when present, so specs
  // without a subject produce byte-identical configs.
  if (spec.subject) out.config.subject = spec.subject;
  // WCAG 1.1.1 — thread the alt text onto EVERY produced config (single injection
  // point, like lang) so the produce gate can require it (produce-conformance.ts)
  // and the shared frame can emit it (ChartFrame's AltInsightContext). Only set when
  // present — a missing altInsight is caught hard at produce, not silently defaulted.
  if (spec.altInsight) out.config.altInsight = spec.altInsight;
  // F2 house theme — thread the resolved `themeBg` onto EVERY produced config (single injection
  // point, like lang/subject) so ChartFrame + each component derive the furniture for the
  // newsroom's ground via themeColors(config.themeBg). Only set when present, so a light (default)
  // spec produces a byte-identical config. Set by the newsroom-profile merge from `theme`.
  if (spec.themeBg) out.config.themeBg = spec.themeBg;
  // The declared source CLASS — threaded onto EVERY produced config here (single injection
  // point, like lang/subject/altInsight), but ON the `source` object every mapper already
  // built, because that object is what the produce gate hands down to each type's guard.
  // Only set when present, so a spec that declares no class produces a byte-identical config
  // and every gate keeps the flat historical source rule.
  if (
    spec.sourceKind &&
    out.config.source &&
    typeof out.config.source === "object"
  )
    (out.config.source as { kind?: SourceKind }).kind = spec.sourceKind;
  // ★ THE CONFIRMED WALK, threaded onto EVERY produced config — and it was threaded onto NONE.
  //
  // The video caption stage reads `config.beats`, and so does BarChart's entrance reorder. No
  // mapper ever copied them, so a spec carrying a journalist's storyboard produced a config with
  // none: the sentences were written, validated, and then dropped between the spec and the
  // render. Exactly the defect the whole beats seam exists to prevent, sitting inside the code
  // built to prevent it — invisible because both mechanisms were only ever proven against a
  // hand-built config, never against a real spec.
  //
  // Single injection point, like lang/subject/altInsight: 41 mappers cannot each be trusted to
  // remember. Only set when present, so a spec with no walk produces a byte-identical config.
  if (Array.isArray(spec.beats) && spec.beats.length > 0)
    out.config.beats = spec.beats;
  return out;
}

// Errors-only spec validation for the producer registry (skills/chart-native/src/manifest.ts).
// Mirrors validate-gate.ts's `validateNative`: chart-native validates BY CONSTRUCTION —
// specToNativeConfig runs the shape checks and throws UnsupportedNativeType for a type it
// cannot map. An unmapped type is NOT a validation failure (it is the FALLBACK_TO_DW path
// the dispatch handles), so it returns []; only a genuinely malformed spec yields an error.
export function nativeSpecErrors(spec: unknown): string[] {
  try {
    specToNativeConfig(spec as NativeSpec);
    return [];
  } catch (e) {
    if (e instanceof UnsupportedNativeType) return [];
    return [e instanceof Error ? e.message : String(e)];
  }
}
