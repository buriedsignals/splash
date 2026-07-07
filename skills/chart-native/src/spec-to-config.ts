// Map a normalised NativeSpec (what suggest-chart emits when it routes to the
// native engine) → a concrete `{type, config}` the produce() path renders. Covers
// the tabular families an article→CSV flow realistically produces: bar/column,
// line, scatter, pie. An unsupported nativeType throws `UnsupportedNativeType` so
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
