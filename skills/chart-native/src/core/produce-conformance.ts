// runProduceConformance — dispatch a chart type + its ACTUAL render config to the
// matching conformance check, so scripts/produce.mjs can fail the run on a real
// violation instead of only catching it in a (test-only) guard test. This is the
// wiring half of the fix; resolveConformanceColors (resolve-conformance-colors.ts)
// is the colour half.
//
// Scope: the 7 types whose check function takes `ConformanceColors` directly (see
// resolve-conformance-colors.ts's doc-comment for why the other ~30 types are
// deferred). Calling this for an unwired type returns `checked:false` — produce.mjs
// treats that as "no guard yet", not as a pass.
import {
  checkConformance,
  checkBarConformance,
  checkScatterConformance,
  checkHistogramConformance,
  checkBeeswarmConformance,
  checkPieConformance,
  checkGroupedBarConformance,
  checkStackedBarConformance,
  checkStackedAreaConformance,
  checkDotStripConformance,
  checkWaffleConformance,
  checkRadialBarConformance,
  checkDivergingBarConformance,
  checkWaterfallConformance,
  checkDumbbellConformance,
  checkSlopeConformance,
  checkBulletConformance,
  checkTreemapConformance,
  checkBoxplotConformance,
  checkViolinConformance,
  checkDivergingStackedConformance,
  checkPopulationPyramidConformance,
  checkFanConformance,
  checkBumpConformance,
  checkHeatmapConformance,
  reconcileBrandViolations,
  requireAltInsight,
  checkLabelDataIntegrity,
} from "./conformance";
import {
  resolveConformanceColors,
  RESOLVABLE_CONFORMANCE_TYPES,
} from "./resolve-conformance-colors";
import {
  BEESWARM_CATEGORY_COLORS,
  PIE_SLICE_COLORS,
  GROUPED_SERIES_COLORS,
  STACKED_SERIES_COLORS,
  STACKED_AREA_COLORS,
  WAFFLE_CATEGORY_COLORS,
  COLORS,
  OKABE_ITO,
  DIVERGING_SIGN_COLORS,
  WATERFALL_ROLE_COLORS,
  DUMBBELL_DOT_COLORS,
  SLOPE_LINE_COLORS,
  BULLET_MEASURE_COLORS,
  TREEMAP_GROUP_COLORS,
  DIVERGING_STACKED_COLORS,
  PYRAMID_SIDE_COLORS,
} from "./tokens";
import { computeBarLayout } from "../bar-geometry";
import { resolveBumpAccents } from "../bump-geometry";
import { computeDivergingLayout } from "../diverging-bar-geometry";
import { computeHistogramLayout } from "../histogram-geometry";
import { computeLollipopLayout } from "../lollipop-geometry";
import { computeGroupedLayout } from "../grouped-bar-geometry";
import { computeStackedLayout } from "../stacked-bar-geometry";
import { computeStackedAreaLayout } from "../stacked-area-geometry";
import { computeRadialBarLayout } from "../radial-bar-geometry";
import { computeWaterfallLayout } from "../waterfall-geometry";
import { computeHeatmapLayout } from "../heatmap-geometry";
import type { ChartConfig } from "../LineChart";
import type { BarConfig } from "../BarChart";
import type { ScatterConfig } from "../ScatterChart";
import type { HistogramConfig } from "../HistogramChart";
import type { BeeswarmConfig } from "../BeeswarmChart";
import type { ConnectedScatterConfig } from "../ConnectedScatterChart";
import type { LollipopConfig } from "../LollipopChart";
import type { PieConfig } from "../PieChart";
import type { GroupedConfig } from "../GroupedBarChart";
import type { StackedConfig } from "../StackedBarChart";
import type { StackedAreaConfig } from "../StackedAreaChart";
import type { DotStripConfig } from "../DotStripChart";
import type { WaffleConfig } from "../WaffleChart";
import type { RadialBarConfig } from "../RadialBarChart";
import type { DivergingBarConfig } from "../DivergingBarChart";
import type { WaterfallConfig } from "../WaterfallChart";
import type { DumbbellConfig } from "../DumbbellChart";
import type { SlopeConfig } from "../SlopeChart";
import type { BulletConfig } from "../BulletChart";
import type { TreemapConfig } from "../TreemapChart";
import type { BoxplotConfig } from "../BoxplotChart";
import type { ViolinConfig } from "../ViolinChart";
import type { DivergingStackedConfig } from "../DivergingStackedChart";
import type { PopulationPyramidConfig } from "../PopulationPyramidChart";
import type { FanConfig } from "../FanChart";
import type { BumpConfig } from "../BumpChart";
import type { HeatmapConfig } from "../HeatmapChart";

export interface ConformanceRunResult {
  /** false = this type has no produce-time guard wired yet (not a pass) */
  checked: boolean;
  violations: string[];
  /**
   * Render-review concerns — surfaced, non-fatal advisories (never block produce):
   *  (1) F2 — CVD/contrast issues DOWNGRADED from hard violations because the failing
   *      colour was set explicitly via the newsroom's brand profile (policy b), and
   *  (2) the data-immutability tripwire (checkLabelDataIntegrity) — a labelField value
   *      that looks like it was SHORTENED to fit the layout (its expansion still appears
   *      in the title/alt-text), the "Interm." ⟶ "professions intermédiaires" class.
   * Empty on the clean auto path.
   */
  concerns: string[];
}

// F2 — the colours a brand-explicit config declares, so the guard knows which
// failing hues to downgrade (never a global relaxation — only the journalist's
// own colours). Reads the first-cut colour fields (baseColor is what line/bar/
// scatter actually paint; seriesColors/accent are threaded for completeness).
function brandExplicitColors(config: Record<string, unknown>): string[] {
  if (config.brandExplicit !== true) return [];
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) out.push(v);
  };
  push(config.baseColor);
  push(config.accent);
  const series = config.seriesColors;
  if (Array.isArray(series)) for (const c of series) push(c);
  else if (series && typeof series === "object")
    for (const c of Object.values(series as Record<string, unknown>)) push(c);
  return out;
}

// Placeholder pixel dims fed to the pure geometry layer purely to satisfy its
// "padding fits inside width/height" invariant — computeBarLayout/computeHistogramLayout
// derive their DOMAIN (valueDomain/countDomain) from the data alone, never from
// these dims, so any valid dims yield the same domain the real render uses.
const BAR_DIMS = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 64, bottom: 40, left: 124 },
};
const HISTOGRAM_DIMS = {
  width: 840,
  height: 480,
  padding: { top: 100, right: 18, bottom: 44, left: 40 },
};
const LOLLIPOP_DIMS = {
  width: 840,
  height: 480,
  padding: { top: 90, right: 18, bottom: 24, left: 124 },
};
const GROUPED_DIMS = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 16, bottom: 96, left: 52 },
};
const STACKED_DIMS = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 16, bottom: 120, left: 52 },
};
const STACKED_AREA_DIMS = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 116, bottom: 52, left: 44 },
};
// computeRadialBarLayout derives tickCount from the data's value domain alone
// (rScale.ticks(4)), never from these dims — any valid dims yield the same
// tick count the real render uses (tickCount is data-only, per the task brief).
const RADIAL_BAR_DIMS = {
  width: 840,
  height: 480,
  padding: { top: 90, right: 16, bottom: 28, left: 16 },
};
const DIVERGING_DIMS = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 64, bottom: 40, left: 124 },
};
const WATERFALL_DIMS = {
  width: 840,
  height: 460,
  padding: { top: 64, right: 24, bottom: 72, left: 52 },
};
// computeHeatmapLayout derives valueDomain (min/max of the cell values) + the fixed
// BLUES rampStops from the data alone, never from these dims — any valid dims (padding
// fits inside width/height) yield the same domain/ramp the real render checks.
const HEATMAP_DIMS = {
  width: 840,
  height: 480,
  padding: { top: 90, right: 16, bottom: 76, left: 52 },
};

// Every type with a produce-time guard wired (flat-triple resolver types + the
// bespoke-signature types resolved inline below). The completeness test asserts
// MAPPERS ⊆ this set (no reachable type is unguarded).
export const PRODUCE_GUARDED_TYPES: readonly string[] = [
  ...RESOLVABLE_CONFORMANCE_TYPES,
  "pie",
  "grouped",
  "stacked",
  "stacked-area",
  "dot-strip",
  "waffle",
  "radial-bar",
  "diverging",
  "waterfall",
  "dumbbell",
  "slope",
  "bullet",
  "treemap",
  "boxplot",
  "violin",
  "diverging-stacked",
  "pyramid",
  "fan",
  "bump",
  "heatmap",
];

/**
 * F2 — the brand-aware boundary. Runs the type's raw guard, then reconciles the
 * violations against the config's brand-explicit colours (policy b): a CVD/contrast
 * failure on a journalist-chosen brand colour becomes a render-review CONCERN; every
 * other violation (and any a11y failure on an auto-chosen colour) stays hard.
 */
export function runProduceConformance(
  type: string,
  config: Record<string, unknown>,
): ConformanceRunResult {
  const raw = computeRawConformance(type, config);
  if (!raw.checked) return { checked: false, violations: [], concerns: [] };
  // WCAG 1.1.1 — the produce boundary REQUIRES a non-empty altInsight on EVERY
  // produced chart, parity with dw-chart/map-dw whose spec validation hard-requires
  // it. checkGlobalConformance keeps its opt-in gate ("altInsight" in input) for
  // other callers; the unconditional requirement is pinned HERE, where a deliverable
  // is actually built. Appended BEFORE brand reconciliation, but never downgradable:
  // reconcileBrandViolations only relaxes colour a11y (CVD/contrast), nothing else.
  const rawViolations = [
    ...raw.violations,
    ...requireAltInsight(config.altInsight),
  ];
  const { violations, concerns } = reconcileBrandViolations(
    rawViolations,
    brandExplicitColors(config),
  );
  // Data-immutability tripwire (advisory) — flag a labelField value that was shortened
  // to fit the layout (its expansion still appears in the title/alt-text), the class of
  // the slope "Interm." incident. A render-review CONCERN, never a hard fail: the
  // layout-driven gutter (leftLabelGutterPx) is the actual cure; a false positive must
  // never block produce. No-op for label-less types (configLabels returns []).
  const integrity = checkLabelDataIntegrity({
    labels: configLabels(config),
    title: typeof config.title === "string" ? config.title : undefined,
    altInsight:
      typeof config.altInsight === "string" ? config.altInsight : undefined,
  });
  return { checked: true, violations, concerns: [...concerns, ...integrity] };
}

// The category/label field values a config carries, for the data-immutability tripwire
// (checkLabelDataIntegrity). Covers the label-field names used across the native types
// (slope/dumbbell `labelField`, bar `catField`, dot-strip `categoryField`, heatmap
// `rowField`); returns [] when the type carries none, so the tripwire is a no-op for
// label-less types (line/scatter/…).
function configLabels(config: Record<string, unknown>): string[] {
  const field =
    (typeof config.labelField === "string" && config.labelField) ||
    (typeof config.catField === "string" && config.catField) ||
    (typeof config.categoryField === "string" && config.categoryField) ||
    (typeof config.rowField === "string" && config.rowField) ||
    "";
  const rows = config.rows;
  if (!field || !Array.isArray(rows)) return [];
  return rows
    .map((r) => String((r as Record<string, unknown>)[field] ?? "").trim())
    .filter(Boolean);
}

function computeRawConformance(
  type: string,
  config: Record<string, unknown>,
): { checked: boolean; violations: string[] } {
  if (!PRODUCE_GUARDED_TYPES.includes(type)) {
    return { checked: false, violations: [] };
  }

  switch (type) {
    case "line": {
      const cfg = config as unknown as ChartConfig;
      const colors = resolveConformanceColors("line", config);
      return { checked: true, violations: checkConformance(cfg, colors) };
    }

    case "bar": {
      const cfg = config as unknown as BarConfig;
      const colors = resolveConformanceColors("bar", config);
      const layout = computeBarLayout(
        { catField: cfg.catField, valField: cfg.valField, rows: cfg.rows },
        BAR_DIMS,
        { orientation: cfg.orientation, sort: cfg.sort },
      );
      return {
        checked: true,
        violations: checkBarConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueDomain: layout.valueDomain,
          },
          colors,
        ),
      };
    }

    case "scatter": {
      const cfg = config as unknown as ScatterConfig;
      const colors = resolveConformanceColors("scatter", config);
      return {
        checked: true,
        violations: checkScatterConformance(
          {
            title: cfg.title,
            source: cfg.source,
            xLabel: cfg.xLabel,
            yLabel: cfg.yLabel,
          },
          colors,
        ),
      };
    }

    case "histogram": {
      const cfg = config as unknown as HistogramConfig;
      const colors = resolveConformanceColors("histogram", config);
      const layout = computeHistogramLayout(
        { valueField: cfg.valueField, rows: cfg.rows },
        HISTOGRAM_DIMS,
        { binWidth: cfg.binWidth },
      );
      return {
        checked: true,
        violations: checkHistogramConformance(
          {
            title: cfg.title,
            source: cfg.source,
            countDomain: layout.countDomain,
            binCount: layout.bars.length,
          },
          colors,
        ),
      };
    }

    case "beeswarm": {
      const cfg = config as unknown as BeeswarmConfig;
      const colors = resolveConformanceColors("beeswarm", config);
      const categoryColors = (cfg.categories ?? []).map(
        (_, i) => BEESWARM_CATEGORY_COLORS[i % BEESWARM_CATEGORY_COLORS.length],
      );
      return {
        checked: true,
        violations: checkBeeswarmConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueLabel: cfg.valueLabel,
            pointCount: cfg.points.length,
            categoryColors,
            // opt-in subject-fit (like the other subject checks): a config that
            // carries a subject gets a single-hue swarm on a blue-family hue caught;
            // configs without a subject are a no-op (the guard gates internally).
            subject: cfg.subject,
          },
          colors,
        ),
      };
    }

    case "connected-scatter": {
      // reuses the scatter guard (position encoding, both axes titled) — see
      // ConnectedScatterChart.tsx's own comment on why it doesn't get its own check.
      const cfg = config as unknown as ConnectedScatterConfig;
      const colors = resolveConformanceColors("connected-scatter", config);
      return {
        checked: true,
        violations: checkScatterConformance(
          {
            title: cfg.title,
            source: cfg.source,
            xLabel: cfg.xLabel,
            yLabel: cfg.yLabel,
          },
          colors,
        ),
      };
    }

    case "lollipop": {
      // reuses the bar guard (magnitude, baseline-0) — see LollipopChart.tsx's
      // own comment on why it doesn't get its own check.
      const cfg = config as unknown as LollipopConfig;
      const colors = resolveConformanceColors("lollipop", config);
      const layout = computeLollipopLayout(
        { catField: cfg.catField, valField: cfg.valField, rows: cfg.rows },
        LOLLIPOP_DIMS,
      );
      return {
        checked: true,
        violations: checkBarConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueDomain: layout.valueDomain,
          },
          colors,
        ),
      };
    }

    case "pie": {
      const cfg = config as unknown as PieConfig;
      const sliceColors = cfg.rows.map(
        (_, i) => PIE_SLICE_COLORS[i % PIE_SLICE_COLORS.length],
      );
      return {
        checked: true,
        violations: checkPieConformance(
          {
            title: cfg.title,
            source: cfg.source,
            sliceCount: cfg.rows.length,
            sliceColors,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "dot-strip": {
      const cfg = config as unknown as DotStripConfig;
      const counts = new Map<string, number>();
      for (const r of cfg.rows) {
        const c = String(r[cfg.categoryField]);
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      return {
        checked: true,
        violations: checkDotStripConformance(
          {
            title: cfg.title,
            source: cfg.source,
            dotColor: OKABE_ITO.blue,
            hasSummaryMarker: true,
            categoryCounts: [...counts.values()],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "waffle": {
      const cfg = config as unknown as WaffleConfig;
      const categoryColors = cfg.items.map(
        (_, i) => WAFFLE_CATEGORY_COLORS[i % WAFFLE_CATEGORY_COLORS.length],
      );
      return {
        checked: true,
        violations: checkWaffleConformance(
          {
            title: cfg.title,
            source: cfg.source,
            unit: cfg.unit,
            categoryCount: cfg.items.length,
            categoryColors,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "radial-bar": {
      const cfg = config as unknown as RadialBarConfig;
      const layout = computeRadialBarLayout(
        {
          categoryField: cfg.categoryField,
          valueField: cfg.valueField,
          rows: cfg.rows,
        },
        RADIAL_BAR_DIMS,
      );
      return {
        checked: true,
        violations: checkRadialBarConformance(
          {
            title: cfg.title,
            source: cfg.source,
            dataColor: OKABE_ITO.blue,
            radialBaseline: 0,
            tickCount: layout.ticks.length,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "grouped": {
      const cfg = config as unknown as GroupedConfig;
      const seriesColors = cfg.seriesFields.map(
        (_, i) => GROUPED_SERIES_COLORS[i % GROUPED_SERIES_COLORS.length],
      );
      const layout = computeGroupedLayout(
        {
          catField: cfg.catField,
          seriesFields: cfg.seriesFields,
          rows: cfg.rows,
        },
        GROUPED_DIMS,
      );
      return {
        checked: true,
        violations: checkGroupedBarConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueDomain: layout.valueDomain,
            seriesCount: cfg.seriesFields.length,
            seriesColors,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "stacked": {
      const cfg = config as unknown as StackedConfig;
      const seriesColors = cfg.seriesFields.map(
        (_, i) => STACKED_SERIES_COLORS[i % STACKED_SERIES_COLORS.length],
      );
      const layout = computeStackedLayout(
        {
          catField: cfg.catField,
          seriesFields: cfg.seriesFields,
          rows: cfg.rows,
        },
        STACKED_DIMS,
      );
      return {
        checked: true,
        violations: checkStackedBarConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueDomain: layout.valueDomain,
            seriesCount: cfg.seriesFields.length,
            seriesColors,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "stacked-area": {
      const cfg = config as unknown as StackedAreaConfig;
      const seriesColors = cfg.seriesFields.map(
        (_, i) => STACKED_AREA_COLORS[i % STACKED_AREA_COLORS.length],
      );
      const layout = computeStackedAreaLayout(
        {
          xField: cfg.xField,
          seriesFields: cfg.seriesFields,
          rows: cfg.rows,
        },
        STACKED_AREA_DIMS,
      );
      return {
        checked: true,
        violations: checkStackedAreaConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueDomain: layout.valueDomain,
            seriesCount: cfg.seriesFields.length,
            seriesColors,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "diverging": {
      const cfg = config as unknown as DivergingBarConfig;
      const layout = computeDivergingLayout(
        { catField: cfg.catField, valField: cfg.valField, rows: cfg.rows },
        DIVERGING_DIMS,
        "desc",
      );
      return {
        checked: true,
        violations: checkDivergingBarConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueDomain: layout.valueDomain,
            signColors: [...DIVERGING_SIGN_COLORS],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "waterfall": {
      const cfg = config as unknown as WaterfallConfig;
      const layout = computeWaterfallLayout({ rows: cfg.rows }, WATERFALL_DIMS);
      return {
        checked: true,
        violations: checkWaterfallConformance(
          {
            title: cfg.title,
            source: cfg.source,
            countDomain: layout.countDomain,
            rows: cfg.rows.map((r) => ({ value: r.value, total: r.total })),
            roleColors: [...WATERFALL_ROLE_COLORS],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "dumbbell": {
      const cfg = config as unknown as DumbbellConfig;
      return {
        checked: true,
        violations: checkDumbbellConformance(
          {
            title: cfg.title,
            source: cfg.source,
            leftLabel: cfg.leftLabel,
            rightLabel: cfg.rightLabel,
            dotColors: [...DUMBBELL_DOT_COLORS],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "slope": {
      const cfg = config as unknown as SlopeConfig;
      return {
        checked: true,
        violations: checkSlopeConformance(
          {
            title: cfg.title,
            source: cfg.source,
            leftPeriod: cfg.leftPeriod,
            rightPeriod: cfg.rightPeriod,
            accentColor: SLOPE_LINE_COLORS[1],
            lineColors: [...SLOPE_LINE_COLORS],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "bullet": {
      const cfg = config as unknown as BulletConfig;
      return {
        checked: true,
        violations: checkBulletConformance(
          {
            title: cfg.title,
            source: cfg.source,
            measureColors: [...BULLET_MEASURE_COLORS],
            rows: cfg.rows.map((r) => ({ target: r.target })),
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "treemap": {
      const cfg = config as unknown as TreemapConfig;
      const groupColors =
        cfg.categories && cfg.categories.length
          ? cfg.categories.map(
              (_, i) => TREEMAP_GROUP_COLORS[i % TREEMAP_GROUP_COLORS.length],
            )
          : [OKABE_ITO.blue];
      return {
        checked: true,
        violations: checkTreemapConformance(
          {
            title: cfg.title,
            source: cfg.source,
            values: cfg.items.map((it) => it.value),
            groupColors,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "boxplot": {
      const cfg = config as unknown as BoxplotConfig;
      return {
        checked: true,
        violations: checkBoxplotConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueLabel: cfg.valueLabel,
            categoryCount: cfg.categories.length,
            boxColors: [OKABE_ITO.blue],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "violin": {
      const cfg = config as unknown as ViolinConfig;
      return {
        checked: true,
        violations: checkViolinConformance(
          {
            title: cfg.title,
            source: cfg.source,
            fillColor: OKABE_ITO.blue,
            hasMedianMarker: true,
            categoryCounts: cfg.categories.map((c) => c.values.length),
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "diverging-stacked": {
      const cfg = config as unknown as DivergingStackedConfig;
      return {
        checked: true,
        violations: checkDivergingStackedConformance(
          {
            title: cfg.title,
            source: cfg.source,
            responseCount: cfg.responses.length,
            rows: cfg.items.map((it) => it.values),
            sentimentColors: [
              ...DIVERGING_STACKED_COLORS.neg,
              ...DIVERGING_STACKED_COLORS.pos,
            ],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "pyramid": {
      const cfg = config as unknown as PopulationPyramidConfig;
      return {
        checked: true,
        violations: checkPopulationPyramidConformance(
          {
            title: cfg.title,
            source: cfg.source,
            leftLabel: cfg.leftLabel,
            rightLabel: cfg.rightLabel,
            groupColors: [...PYRAMID_SIDE_COLORS],
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "fan": {
      const cfg = config as unknown as FanConfig;
      // reconstruct the per-step forecast the check needs from the ACTUAL
      // rows the component renders (mirrors fan-conformance.test.ts's shipped
      // -sample shape): only rows with a central estimate are forecast steps,
      // and a band is included only when both lo{n}/hi{n} are populated.
      const forecast = cfg.rows
        .filter((r) => r.central != null)
        .map((r) => {
          const bands: Record<number, [number, number]> = {};
          for (const lv of cfg.levels) {
            const lo = r[`lo${lv}`];
            const hi = r[`hi${lv}`];
            if (lo != null && hi != null) bands[lv] = [lo, hi];
          }
          return { central: r.central, bands };
        });
      return {
        checked: true,
        violations: checkFanConformance(
          {
            title: cfg.title,
            source: cfg.source,
            valueLabel: cfg.unit,
            levels: cfg.levels,
            forecast,
            hue: OKABE_ITO.blue,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "bump": {
      const cfg = config as unknown as BumpConfig;
      const maxRank = Math.max(...cfg.items.flatMap((it) => it.ranks));
      const highlightCount = cfg.highlight?.length ?? 0;
      // the SAME resolution BumpChart paints (resolveBumpAccents) — so the guard
      // validates the REAL painted hue: the spec's subject-fit colour (baseColor /
      // seriesColors) when given, the BUMP_ACCENT_COLORS default otherwise.
      const accentColors = resolveBumpAccents(cfg.highlight, {
        baseColor: cfg.baseColor,
        seriesColors: cfg.seriesColors,
      });
      return {
        checked: true,
        violations: checkBumpConformance(
          {
            title: cfg.title,
            source: cfg.source,
            periodCount: cfg.periods.length,
            maxRank,
            highlightCount,
            accentColors,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    case "heatmap": {
      // the FIRST value→colour type — its guard validates the SEQUENTIAL ramp
      // (monotonic luminance = CVD-safe/greyscale-readable) + a non-empty value
      // range, on top of the global title/source/contrast checks. The rampStops
      // and valueDomain come from the same geometry the component renders.
      const cfg = config as unknown as HeatmapConfig;
      const layout = computeHeatmapLayout(
        { rowField: cfg.rowField, colFields: cfg.colFields, rows: cfg.rows },
        HEATMAP_DIMS,
      );
      return {
        checked: true,
        violations: checkHeatmapConformance(
          {
            title: cfg.title,
            source: cfg.source,
            rampStops: layout.rampStops,
            valueDomain: layout.valueDomain,
          },
          { text: [COLORS.ink, COLORS.muted], bg: COLORS.bg },
        ),
      };
    }

    default:
      return { checked: false, violations: [] };
  }
}
