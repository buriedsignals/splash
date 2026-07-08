// resolveConformanceColors — the SINGLE source of truth for the colours a
// chart-native component actually PAINTS for a given config, so a produce-time
// conformance check validates the REAL render, not a stand-in (see conformance.ts's
// `ConformanceColors` doc-comment). Config is the untyped JSON produce reads from
// disk; each branch below only reads the handful of fields that affect colour —
// the component's own TS interface (e.g. LineChart's `ChartConfig`) stays the
// source of truth for everything else.
//
// Scope: the 7 chart-native types whose conformance check takes `ConformanceColors`
// directly (line, bar, scatter, histogram, beeswarm, connected-scatter, lollipop —
// see core/conformance.ts). The other ~30 types have a bespoke multi-colour
// signature (seriesColors, signColors, sliceColors, …) built from a per-component
// palette-assignment scheme that isn't resolved here yet — see
// scripts/produce.mjs's dispatch table and conformance-report.md for the deferred
// follow-on.
import { COLORS, OKABE_ITO, BEESWARM_CATEGORY_COLORS } from "./tokens";
import type { ConformanceColors } from "./conformance";

export type ProduceConformanceType =
  | "line"
  | "bar"
  | "scatter"
  | "histogram"
  | "beeswarm"
  | "connected-scatter"
  | "lollipop";

/** every type this module knows how to resolve, for produce.mjs's dispatch guard */
export const RESOLVABLE_CONFORMANCE_TYPES: readonly ProduceConformanceType[] = [
  "line",
  "bar",
  "scatter",
  "histogram",
  "beeswarm",
  "connected-scatter",
  "lollipop",
];

function readString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

/**
 * Resolve the {data, text, bg} triple a chart-native component would actually
 * paint for `config`. `config` is arbitrary JSON (produce's raw input); we only
 * read the colour-affecting fields, each grounded in the component's own code:
 */
export function resolveConformanceColors(
  type: ProduceConformanceType,
  config: Record<string, unknown>,
): ConformanceColors {
  const bg = COLORS.bg;

  switch (type) {
    case "line": {
      // LineChart.tsx: `lineColor = config.baseColor ?? COLORS.line` paints the series
      // stroke and the line-end DOT (marks — 3:1 graphical contrast). The direct-label TEXT
      // is `COLORS.ink` (#3 decoupling: "label carries the value, mark carries the hue"), so
      // the data colour is NEVER a text colour — a subject-fit hue (vermillion, green) can
      // ship as the mark without failing the 4.5:1 text check that used to force blue.
      const data = readString(config.baseColor) ?? COLORS.line;
      return { data, text: [COLORS.ink, COLORS.muted], bg };
    }

    case "bar": {
      // BarChart.tsx `barColor()`: `baseColor ?? COLORS.line` fills the bars (mark). BOTH the
      // category and value labels render in `COLORS.ink` (BarChart.tsx:309,328) — the mark
      // carries the hue, the label carries the value. So the data colour is not a text colour.
      const data = readString(config.baseColor) ?? COLORS.line;
      return { data, text: [COLORS.ink, COLORS.muted], bg };
    }

    case "scatter": {
      // ScatterChart.tsx: `dotColor = config.baseColor ?? COLORS.line` paints the dots and
      // their leader lines (marks). The point-label TEXT is `COLORS.ink` (#3 decoupling), so
      // the data colour is never a text colour regardless of which points are labelled.
      const data = readString(config.baseColor) ?? COLORS.line;
      return { data, text: [COLORS.ink, COLORS.muted], bg };
    }

    case "histogram": {
      // HistogramChart.tsx: bars are a FIXED `COLORS.line` (HistogramConfig has
      // no baseColor field — config.baseColor must NOT leak through). The median
      // LINE is a fixed `OKABE_ITO.vermillion` accent (a mark, not text); the
      // "median N unit" label TEXT is `COLORS.ink` (WCAG-safe), kept legible over
      // the bars by a white halo.
      return {
        data: COLORS.line,
        text: [COLORS.ink, COLORS.muted],
        bg,
      };
    }

    case "beeswarm": {
      // BeeswarmChart.tsx: dots are `OKABE_ITO.blue` by default, or cycle through
      // BEESWARM_CATEGORY_COLORS by category index (no config colour override).
      // The category swatch is a shape, never TEXT (the legend label is always
      // COLORS.ink) — so no category colour belongs in `text`.
      return {
        data: BEESWARM_CATEGORY_COLORS[0],
        text: [COLORS.ink, COLORS.muted],
        bg,
      };
    }

    case "connected-scatter": {
      // ConnectedScatterChart.tsx: fixed `ACCENT = OKABE_ITO.blue` for the line +
      // dots only (no baseColor field) — never rendered as text.
      return { data: OKABE_ITO.blue, text: [COLORS.ink, COLORS.muted], bg };
    }

    case "lollipop": {
      // LollipopChart.tsx: fixed `BASE = OKABE_ITO.blue` for the stem/dot (no
      // baseColor field). ALL category/value label TEXT is `COLORS.ink` — the
      // highlighted row is emphasised by the vermillion MARK (stem/dot) + bold
      // weight, NOT by colouring the label text (which fails WCAG contrast).
      return { data: OKABE_ITO.blue, text: [COLORS.ink, COLORS.muted], bg };
    }
  }
}
