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
  /** Okabe-Ito hex for the primary series (e.g. "#009E73"). Absent → component default. */
  baseColor?: string;
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
    return {
      type: "beeswarm",
      config: {
        title: spec.title,
        source: src(spec.source),
        valueLabel: spec.unit, // NativeSpec has no valueLabel; its long-axis `unit` maps here
        ...(categories ? { categories } : {}),
        points,
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
  return mapper(parsed, spec);
}
