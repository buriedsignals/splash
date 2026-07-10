// Map a normalised NativeSpec (what suggest-chart emits when it routes to the
// native engine) → a concrete `{type, config}` the produce() path renders. Covers
// the tabular families an article→CSV flow realistically produces: bar/column,
// line, scatter, pie, grouped, stacked, stacked-area. An unsupported nativeType throws `UnsupportedNativeType` so
// the caller can fall back to dw-chart. Pure, framework-free, unit-tested.

import { parseCsv, type ParsedCsv } from "./csv";
import { validateShape } from "./shape-validation";

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
  highlight?: string; // bar: the category to accent
  /** several categories/points to accent (e.g. beeswarm's outlier communes). When
   *  present it takes precedence over the single `highlight`. */
  highlights?: string[];
  /** the chart subject (e.g. "housing rents", "cross-border commuting"). Injected onto
   *  every produced config so the produce-time subject-fit guard can catch a chart left
   *  on a blue-family hue for a non-water/cold subject (design-conformance.md). */
  subject?: string;
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
    const sort = spec.sort ?? "desc";
    // resolve highlight (a category) to the index it lands at AFTER the sort
    let highlightIndex: number | undefined;
    if (spec.highlight) {
      const sorted = [...rows].sort((a, b) => {
        const d = Number(a[valCol]) - Number(b[valCol]);
        return sort === "desc" ? -d : d;
      });
      const idx = sorted.findIndex((r) => String(r[catCol]) === spec.highlight);
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
        directLabel: spec.directLabel ?? yCol,
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
        // ScatterConfig requires axis titles; derive them from the CSV headers so the
        // embedded chart's axes are never blank (the reader must know what x/y mean).
        xLabel: xCol,
        yLabel: yCol,
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
        xLabel: xField,
        yLabel: yField,
        rows, // pass through IN ORDER — do NOT sort (the path follows row order)
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
        xField: catCol,
        seriesFields,
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
        items,
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
  return out;
}
