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
} from "./conformance";
import {
  resolveConformanceColors,
  RESOLVABLE_CONFORMANCE_TYPES,
} from "./resolve-conformance-colors";
import { BEESWARM_CATEGORY_COLORS, PIE_SLICE_COLORS, COLORS } from "./tokens";
import { computeBarLayout } from "../bar-geometry";
import { computeHistogramLayout } from "../histogram-geometry";
import { computeLollipopLayout } from "../lollipop-geometry";
import type { ChartConfig } from "../LineChart";
import type { BarConfig } from "../BarChart";
import type { ScatterConfig } from "../ScatterChart";
import type { HistogramConfig } from "../HistogramChart";
import type { BeeswarmConfig } from "../BeeswarmChart";
import type { ConnectedScatterConfig } from "../ConnectedScatterChart";
import type { LollipopConfig } from "../LollipopChart";
import type { PieConfig } from "../PieChart";

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

// Every type with a produce-time guard wired (flat-triple resolver types + the
// bespoke-signature types resolved inline below). The completeness test asserts
// MAPPERS ⊆ this set (no reachable type is unguarded).
export const PRODUCE_GUARDED_TYPES: readonly string[] = [
  ...RESOLVABLE_CONFORMANCE_TYPES,
  "pie",
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

    default:
      return { checked: false, violations: [] };
  }
}
