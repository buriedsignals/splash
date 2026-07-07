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
} from "./tokens";
import { computeBarLayout } from "../bar-geometry";
import { computeDivergingLayout } from "../diverging-bar-geometry";
import { computeHistogramLayout } from "../histogram-geometry";
import { computeLollipopLayout } from "../lollipop-geometry";
import { computeGroupedLayout } from "../grouped-bar-geometry";
import { computeStackedLayout } from "../stacked-bar-geometry";
import { computeStackedAreaLayout } from "../stacked-area-geometry";
import { computeRadialBarLayout } from "../radial-bar-geometry";
import { computeWaterfallLayout } from "../waterfall-geometry";
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

export interface ConformanceRunResult {
  /** false = this type has no produce-time guard wired yet (not a pass) */
  checked: boolean;
  violations: string[];
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
];

export function runProduceConformance(
  type: string,
  config: Record<string, unknown>,
): ConformanceRunResult {
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

    default:
      return { checked: false, violations: [] };
  }
}
