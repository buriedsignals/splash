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
  checkPictogramConformance,
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
  checkMarkContrastOnBg,
  type MarkOnBg,
  type BrandConcern,
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
  deriveFurniture,
  heatmapRamp,
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
import {
  PICTOGRAM_DEFAULT_ICON,
  type PictogramConfig,
} from "../PictogramChart";
import { computePictogramLayout } from "../pictogram-geometry";

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
   *      in the title/alt-text), the "Interm." ⟶ "professions intermédiaires" class, and
   *  (3) F2 — a HOUSE-SET data mark (baseColor/explicit series) that does not
   *      clear the WCAG non-text contrast floor (3:1) against the chart's theme ground
   *      (checkMarkContrastOnBg), the mark-side twin of the map house-fill concern.
   * Empty on the clean auto path (no brand-explicit colours, no shortened label).
   */
  concerns: string[];
  /**
   * The STRUCTURED subset of `concerns` — only the CVD/contrast brand-colour tradeoffs
   * (reconcileBrandViolations), each carrying its hex, its kind, and (for CVD) the nearest
   * accessible hue. `concerns` above stays the flattened, human-readable list every existing
   * caller already reads (produce.mjs's console log, the .test.ts assertions on plain
   * strings); this is the RECORD produce.mjs writes to brand-concerns.json so the tradeoff
   * has a reader instead of being re-parsed out of English prose. Empty whenever `concerns`
   * carries no brand-colour item (auto path, or only integrity/mark-contrast advisories).
   */
  brandConcerns: BrandConcern[];
  /**
   * The OTHER half of `concerns` — the two advisory classes that carry no brand colour and so
   * have no structured record: the label-integrity tripwire (checkLabelDataIntegrity) and the
   * house-mark-contrast-on-ground screen (checkMarkContrastOnBg). Split out because
   * brand-concerns.json used to record `brandConcerns` alone, which left these two reaching
   * only produce stdout — and stdout is discarded (lib/core/verbs/exec.ts) unless the run fails.
   * `concerns` above remains the flattened union of both, unchanged for every existing caller.
   */
  advisories: string[];
}

/** The brand-concerns.json payload, or null when the run recorded nothing worth a file.
 *  Split out of produce.mjs so the write gate is testable: it must fire for an
 *  advisory-ONLY run too (a shortened data label with no brand colour anywhere), which the
 *  original `brandConcerns.length > 0` condition silently skipped. `concerns` keeps its
 *  name and shape — review-gate.mjs already reads `.concerns[].reason`. */
export function brandConcernsFile(
  type: string,
  result: ConformanceRunResult,
): { type: string; concerns: BrandConcern[]; advisories: string[] } | null {
  if (result.brandConcerns.length === 0 && result.advisories.length === 0)
    return null;
  return {
    type,
    concerns: result.brandConcerns,
    advisories: result.advisories,
  };
}

// F2 — the DATA MARK colours a brand-explicit config declares BY HAND, so the guards
// know which hues are the journalist's own (never a global relaxation). Reads the
// first-cut colour fields (baseColor is what line/bar/scatter actually paint;
// seriesColors is threaded for completeness), each tagged with a role for the
// mark-contrast concern message. The set is empty unless `brandExplicit` — the auto/
// subject-fit path carries no house marks here, keeping both the CVD/contrast bypass
// (reconcileBrandViolations) and the ground-contrast screen (checkMarkContrastOnBg)
// scoped to hand-set colours only.
function houseMarks(config: Record<string, unknown>): MarkOnBg[] {
  if (config.brandExplicit !== true) return [];
  const marks: MarkOnBg[] = [];
  const isHex = (v: unknown): v is string =>
    typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
  const base = config.baseColor;
  if (isHex(base)) marks.push({ color: base, role: "baseColor" });
  const series = config.seriesColors;
  if (Array.isArray(series))
    series.forEach((c, i) => {
      if (isHex(c)) marks.push({ color: c, role: `series #${i + 1}` });
    });
  else if (series && typeof series === "object")
    for (const [k, c] of Object.entries(series as Record<string, unknown>))
      if (isHex(c)) marks.push({ color: c, role: `series ${k}` });
  return marks;
}

// The hexes half of houseMarks — the set reconcileBrandViolations matches failing
// colours against (it keys off the COLOUR, not the role). Derived from houseMarks so
// the two never drift.
function brandExplicitColors(config: Record<string, unknown>): string[] {
  return houseMarks(config).map((m) => m.color);
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
// computeHeatmapLayout derives valueDomain (min/max of the cell values) from the data alone,
// never from these dims, and the rampStops from the config's baseColor/themeBg — any valid dims
// (padding fits inside width/height) yield the same domain/ramp the real render checks.
// The row COUNTS this guard checks are value/unitPerIcon — arithmetic the dims cannot
// touch (they only set icon size and band positions), so any dims whose padding fits
// inside width/height give the counts the real render draws.
const PICTOGRAM_DIMS = {
  width: 840,
  height: 480,
  padding: { top: 90, right: 52, bottom: 50, left: 120 },
};
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
  "pictogram",
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
  if (!raw.checked)
    return {
      checked: false,
      violations: [],
      concerns: [],
      brandConcerns: [],
      advisories: [],
    };
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
  const { violations, concerns: brandConcerns } = reconcileBrandViolations(
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
  // F2 — mark-contrast-on-the-theme-ground concern (advisory). Screen the HOUSE-SET
  // data marks against the chart's chosen background (deriveFurniture(themeBg).bg): a
  // hand-set hue that does not clear the WCAG non-text floor (3:1) on that ground is
  // KEPT (brand-first) and surfaced for render-review, mirroring the map house-fill
  // concern. Empty on the auto path (houseMarks returns [] without brandExplicit).
  const markContrast = checkMarkContrastOnBg(
    houseMarks(config),
    typeof config.themeBg === "string" ? config.themeBg : undefined,
  );
  const advisories = [...integrity, ...markContrast];
  return {
    checked: true,
    violations,
    concerns: [...brandConcerns.map((c) => c.reason), ...advisories],
    brandConcerns,
    advisories,
  };
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

  // The FURNITURE text (ink/muted) + ground every branch validates against derive from the newsroom
  // house `themeBg` (deriveFurniture) — so the text-contrast check measures the REAL render on the
  // real ground, not #1A1A1A on white. Light default (themeBg undefined) → COLORS, byte-identical to
  // the old hardcoded literal, so clearly-light/dark grounds are unchanged and only a genuinely
  // illegible ground (a mid-luminance house grey) now surfaces the sub-4.5:1 furniture it renders.
  const themeBg =
    typeof config.themeBg === "string" ? config.themeBg : undefined;
  const furniture = deriveFurniture(themeBg);
  const furnitureText: { text: string[]; bg: string } = {
    text: [furniture.ink, furniture.muted],
    bg: furniture.bg,
  };

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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
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
          furnitureText,
        ),
      };
    }

    case "heatmap": {
      // the FIRST value→colour type — its guard validates the SEQUENTIAL ramp
      // (monotonic luminance = CVD-safe/greyscale-readable) + a non-empty value
      // range, on top of the global title/source/contrast checks. The rampStops
      // and valueDomain come from the same geometry the component renders.
      const cfg = config as unknown as HeatmapConfig;
      // derive the ramp + furniture through the SAME baseColor/themeBg the component renders with,
      // so the guard validates the ACTUAL stops + ground (a dark ground's ramp runs the other way,
      // and the ramp is now subject/house-derived, not the fixed Blues).
      const layout = computeHeatmapLayout(
        { rowField: cfg.rowField, colFields: cfg.colFields, rows: cfg.rows },
        HEATMAP_DIMS,
        { baseColor: cfg.baseColor, themeBg: cfg.themeBg },
      );
      const f = deriveFurniture(cfg.themeBg);
      return {
        checked: true,
        violations: checkHeatmapConformance(
          {
            title: cfg.title,
            source: cfg.source,
            rampStops: heatmapRamp(cfg.baseColor, cfg.themeBg),
            valueDomain: layout.valueDomain,
          },
          { text: [f.ink, f.muted], bg: f.bg },
        ),
      };
    }

    case "pictogram": {
      // The countability rules read the SAME row counts the component draws, computed by
      // the same geometry — not a re-derivation the guard could get right while the render
      // gets wrong. The icons carry one Okabe-Ito hue (count, never colour, encodes the
      // value), and the unit key is unconditional in PictogramChart, so `unitStated` is a
      // structural fact of the component rather than a config field that could be false.
      const cfg = config as unknown as PictogramConfig;
      const layout = computePictogramLayout(
        {
          categoryField: cfg.categoryField,
          valueField: cfg.valueField,
          unitPerIcon: cfg.unitPerIcon,
          rows: cfg.rows,
        },
        PICTOGRAM_DIMS,
      );
      const f = deriveFurniture(cfg.themeBg);
      return {
        checked: true,
        violations: checkPictogramConformance(
          {
            title: cfg.title,
            source: cfg.source,
            // the hue the component ACTUALLY paints, so the CVD/contrast check sees the
            // house colour a newsroom set rather than the engine default it overrode
            iconColor: cfg.baseColor ?? PICTOGRAM_DEFAULT_ICON,
            unitPerIcon: cfg.unitPerIcon,
            unitStated: true,
            rows: layout.rows.map((r) => ({
              label: r.category,
              count: r.count,
            })),
          },
          { text: [f.ink, f.muted], bg: f.bg },
        ),
      };
    }

    default:
      return { checked: false, violations: [] };
  }
}
