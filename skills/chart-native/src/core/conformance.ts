// Conformance guard for native charts — the automated equivalent of dw-chart's
// validateChartSpec, so design-conformance.md is ENFORCED (not just baked in by
// hand). Pure, framework-free; reused as the template for every native chart.
//
// Source: knowledge/references/design-conformance.md (Okabe-Ito, WCAG, FT).

import type { ChartConfig } from "../LineChart";

export const OKABE_ITO_SET = new Set([
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#D55E00",
  "#CC79A7",
  "#56B4E9",
  "#F0E442",
  "#000000",
]);

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a #rrggbb colour. */
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

/** WCAG contrast ratio between two #rrggbb colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export function isOkabeIto(hex: string): boolean {
  return OKABE_ITO_SET.has(hex.toUpperCase());
}

export interface ConformanceColors {
  /** the data/series colour (also used for the direct-label text) */
  data: string;
  /** every colour used to render TEXT (must clear 4.5:1 on bg) */
  text: string[];
  bg: string;
}

/**
 * Check a chart's config + colours against design-conformance.md. Returns the
 * list of violations (empty = conformant). The component bakes these in; this
 * is the guard that proves it for every chart we ship.
 */
/**
 * L0 — GLOBAL dataviz rules that hold for EVERY chart type (and map): insight
 * title, Okabe-Ito data colour, source name+url, WCAG text contrast. The
 * type-specific guards below compose on top (global ++ type), mirroring the
 * layered knowledge tree.
 */
export function checkGlobalConformance(input: {
  title: string;
  source: { name?: string; url?: string };
  colors: ConformanceColors;
}): string[] {
  const v: string[] = [];
  const { colors } = input;

  // 1. Title = the insight (not a bare year range, not ALL CAPS).
  const title = input.title?.trim() ?? "";
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    v.push(`title is a year range, not an insight: "${title}"`);
  if (title.length > 0 && title === title.toUpperCase())
    v.push("title is ALL CAPS (use sentence case)");

  // 2. Data colour ∈ Okabe-Ito.
  if (!isOkabeIto(colors.data))
    v.push(`data colour ${colors.data} is not in the Okabe-Ito set`);

  // 5. Source cited: name + url.
  if (!input.source?.name?.trim()) v.push("missing source name");
  if (!input.source?.url?.trim()) v.push("missing source url");

  // 7. Contrast ≥ 4.5:1 for every text colour. Decorative gridlines are exempt.
  for (const t of colors.text) {
    const r = contrastRatio(t, colors.bg);
    if (r < 4.5)
      v.push(
        `text colour ${t} contrast ${r.toFixed(2)}:1 on ${colors.bg} < 4.5:1`,
      );
  }
  return v;
}

/** L2 — LINE: global rules + a single direct label over a legend. */
export function checkConformance(
  config: ChartConfig,
  colors: ConformanceColors,
): string[] {
  const v = checkGlobalConformance({
    title: config.title,
    source: config.source,
    colors,
  });
  // direct label present, and not just the insight title repeated
  if (!config.directLabel?.trim()) v.push("missing direct label");
  if (config.title && config.directLabel && config.title === config.directLabel)
    v.push("title must be the insight, not the series label");
  return v;
}

/**
 * L2 — BAR: global rules + the bar-specific non-negotiable — the value axis MUST
 * include 0 (bars encode length; a truncated baseline lies). `valueDomain` comes
 * straight from `computeBarLayout`.
 */
export function checkBarConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    valueDomain: [number, number];
  },
  colors: ConformanceColors,
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors,
  });
  const [lo, hi] = input.valueDomain;
  if (!(lo <= 0 && hi >= 0))
    v.push(
      `bar value axis must include 0 (baseline rule) — domain is [${lo}, ${hi}]`,
    );
  return v;
}

/**
 * L2 — DIVERGING BAR: global rules + the deviation musts. Inherits the bar
 * baseline-0 rule and adds: the value domain must actually SPAN zero (negative
 * AND positive — else it is a plain bar drawn awkwardly), and the two sign
 * colours are both Okabe-Ito with ≤ 2 distinct hues.
 */
export function checkDivergingBarConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    valueDomain: [number, number];
    signColors: string[]; // [positive, negative]
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.signColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  const [lo, hi] = input.valueDomain;
  if (!(lo < 0 && hi > 0))
    v.push(
      `diverging bar domain must span zero (negative AND positive) — [${lo}, ${hi}]`,
    );
  const distinct = new Set(input.signColors.map((c) => c.toUpperCase()));
  if (distinct.size > 2)
    v.push(`diverging bar uses ${distinct.size} sign colours (> 2)`);
  for (const c of input.signColors)
    if (!isOkabeIto(c)) v.push(`sign colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — WATERFALL: global rules + the flow musts. Inherits baseline-0 (the running
 * level starts from 0) and adds: an EXACT bridge (closing total = opening total +
 * every signed step), and three role colours (increase / decrease / total), all
 * Okabe-Ito, ≤ 3 distinct hues.
 */
export function checkWaterfallConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    countDomain: [number, number];
    /** the rows in order, to verify the cumulative arithmetic */
    rows: { value: number; total?: boolean }[];
    roleColors: string[]; // [increase, decrease, total]
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.roleColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (input.countDomain[0] !== 0)
    v.push(
      `waterfall count axis must start at 0 — starts at ${input.countDomain[0]}`,
    );

  // verify the bridge: replay the running total; every total after the first
  // (the opening) must equal the running level reached by the steps before it.
  let running = 0;
  let seenTotal = false;
  for (const r of input.rows) {
    if (r.total) {
      if (seenTotal && r.value !== running)
        v.push(
          `waterfall total ${r.value} does not match the running level ${running}`,
        );
      running = r.value;
      seenTotal = true;
    } else {
      running += r.value;
    }
  }

  const distinct = new Set(input.roleColors.map((c) => c.toUpperCase()));
  if (distinct.size > 3)
    v.push(`waterfall uses ${distinct.size} role colours (> 3)`);
  for (const c of input.roleColors)
    if (!isOkabeIto(c)) v.push(`role colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — POPULATION PYRAMID: global rules + the back-to-back musts. Both sides grow
 * from the central zero on the SAME magnitude scale (baseline-0, by construction),
 * so the guard adds: exactly two group colours, both Okabe-Ito, ≤ 2 distinct hues.
 */
export function checkPopulationPyramidConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    leftLabel?: string;
    rightLabel?: string;
    groupColors: string[]; // [left, right]
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.groupColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.leftLabel?.trim()) v.push("missing left group label");
  if (!input.rightLabel?.trim()) v.push("missing right group label");
  const distinct = new Set(input.groupColors.map((c) => c.toUpperCase()));
  if (distinct.size > 2)
    v.push(`pyramid uses ${distinct.size} group colours (> 2)`);
  for (const c of input.groupColors)
    if (!isOkabeIto(c)) v.push(`group colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — HISTOGRAM: global rules + the distribution musts. Inherits the bar
 * baseline-0 rule (the count axis includes 0) and adds: enough bins to show a
 * shape (≥ 3) and not so many it is noise (≤ 50). The "bars touch" rule is a
 * structural property of the geometry, not a colour rule.
 */
export function checkHistogramConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    countDomain: [number, number];
    binCount: number;
  },
  colors: ConformanceColors,
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors,
  });
  const [lo] = input.countDomain;
  if (lo !== 0)
    v.push(`histogram count axis must start at 0 — starts at ${lo}`);
  if (input.binCount < 3)
    v.push(
      `histogram has ${input.binCount} bins (< 3) — too few to show a shape`,
    );
  if (input.binCount > 50)
    v.push(`histogram has ${input.binCount} bins (> 50) — widen the bins`);
  return v;
}

/**
 * L2 — MARIMEKKO: global rules + the 2-D part-to-whole musts. Each column's
 * segments must sum to the full height (a real within-share), and there are ≤ 5
 * series, each Okabe-Ito (categorical, like the stacked bar). Column widths summing
 * to the whole is guaranteed by the geometry (normalised weights).
 */
export function checkMarimekkoConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    seriesCount: number;
    seriesColors: string[];
    /** each column's series values, to check they form a real composition */
    columns: number[][];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.seriesColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (input.seriesCount > 5)
    v.push(
      `marimekko has ${input.seriesCount} series (> 5) — group into "Other"`,
    );
  for (const c of input.seriesColors)
    if (!isOkabeIto(c))
      v.push(`series colour ${c} is not in the Okabe-Ito set`);
  for (const col of input.columns)
    if (col.some((x) => x < 0) || col.reduce((s, x) => s + x, 0) <= 0)
      v.push("a marimekko column has no positive composition");
  return v;
}

/**
 * L2 — BULLET: global rules + the accountability musts. The measure grows from
 * zero (baseline-0, by construction). Adds: the measure colour(s) in the Okabe-Ito
 * set with ≤ 2 hues (e.g. hit/miss), and a target on every row (the whole point).
 * The qualitative bands are neutral context (greys), exempt from the palette like
 * gridlines.
 */
export function checkBulletConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    measureColors: string[];
    rows: { target?: number }[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.measureColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (
    input.rows.some((r) => r.target == null || Number.isNaN(Number(r.target)))
  )
    v.push("every bullet row needs a target (the chart measures against it)");
  const distinct = new Set(input.measureColors.map((c) => c.toUpperCase()));
  if (distinct.size > 2)
    v.push(`bullet uses ${distinct.size} measure colours (> 2)`);
  for (const c of input.measureColors)
    if (!isOkabeIto(c))
      v.push(`measure colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — SCATTER: global rules + the scatter-specific must — BOTH axes carry a
 * title (the reader must know what x and y mean; a scatter with bare numbers is
 * meaningless). Bubble area-scaling is enforced in scatter-geometry (scaleSqrt),
 * not here. Note: scatter does NOT inherit the bar baseline-0 rule (position
 * encoding tolerates a non-zero axis).
 */
export function checkScatterConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    xLabel?: string;
    yLabel?: string;
  },
  colors: ConformanceColors,
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors,
  });
  if (!input.xLabel?.trim()) v.push("missing x-axis label (what x means)");
  if (!input.yLabel?.trim()) v.push("missing y-axis label (what y means)");
  return v;
}

/**
 * L2 — PIE / DONUT: global rules + the part-to-whole musts — at most 5 slices
 * (beyond that angles blur → use bars), and every slice colour in the Okabe-Ito
 * set (the global ≤2-colour rule relaxes to "few CVD-safe hues" for pies).
 */
export function checkPieConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    sliceCount: number;
    sliceColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.sliceColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (input.sliceCount > 5)
    v.push(
      `pie has ${input.sliceCount} slices (> 5) — group into "Other" or use bars`,
    );
  for (const c of input.sliceColors)
    if (!isOkabeIto(c)) v.push(`slice colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — STACKED BAR: global rules + the stacked musts. Inherits the bar
 * baseline-0 rule (valueDomain must include 0, from computeStackedLayout) and
 * adds: ≤ 5 series (beyond that the stack is a ribbon → group "Other"), and
 * every series colour in the Okabe-Ito set (categorical CVD-safe palette, like
 * pie — the ≤2-colour rule relaxes to "few CVD-safe hues" for a stack).
 */
export function checkStackedBarConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    valueDomain: [number, number];
    seriesCount: number;
    seriesColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.seriesColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  const [lo, hi] = input.valueDomain;
  if (!(lo <= 0 && hi >= 0))
    v.push(
      `stacked value axis must include 0 (baseline rule) — domain is [${lo}, ${hi}]`,
    );
  if (input.seriesCount > 5)
    v.push(
      `stack has ${input.seriesCount} series (> 5) — group into "Other" or use small multiples`,
    );
  for (const c of input.seriesColors)
    if (!isOkabeIto(c))
      v.push(`series colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — STACKED AREA: identical contract to the stacked bar (the continuous
 * sibling) — global rules + baseline-0 (valueDomain includes 0) + ≤ 5 series +
 * every band colour in the Okabe-Ito set.
 */
export function checkStackedAreaConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    valueDomain: [number, number];
    seriesCount: number;
    seriesColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.seriesColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  const [lo, hi] = input.valueDomain;
  if (!(lo <= 0 && hi >= 0))
    v.push(
      `stacked-area value axis must include 0 (baseline rule) — domain is [${lo}, ${hi}]`,
    );
  if (input.seriesCount > 5)
    v.push(
      `stacked area has ${input.seriesCount} series (> 5) — group into "Other"`,
    );
  for (const c of input.seriesColors)
    if (!isOkabeIto(c)) v.push(`band colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — GROUPED BAR: global rules + the grouped musts. Inherits the bar
 * baseline-0 rule (valueDomain must include 0) and adds: ≤ 3 series (beyond that
 * the groups become a picket fence → small multiples), and every series colour
 * in the Okabe-Ito set (categorical CVD-safe palette).
 */
export function checkGroupedBarConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    valueDomain: [number, number];
    seriesCount: number;
    seriesColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.seriesColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  const [lo, hi] = input.valueDomain;
  if (!(lo <= 0 && hi >= 0))
    v.push(
      `grouped value axis must include 0 (baseline rule) — domain is [${lo}, ${hi}]`,
    );
  if (input.seriesCount > 3)
    v.push(
      `grouped chart has ${input.seriesCount} series (> 3) — use small multiples`,
    );
  for (const c of input.seriesColors)
    if (!isOkabeIto(c))
      v.push(`series colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — SLOPE: global rules + the slope musts. POSITION encoding → it does NOT
 * inherit the bar baseline-0 rule (a zoomed y-range is correct). Adds: both
 * period captions present, the accent (editorial) colour in the Okabe-Ito set,
 * and the ≤2-colour rule — a neutral CONTEXT line + ONE accent (slope.md rule 4).
 * The neutral context is scaffolding (like the axis), exempt from palette
 * membership but still counted toward the ≤2-colour cap.
 */
export function checkSlopeConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    leftPeriod?: string;
    rightPeriod?: string;
    accentColor: string;
    lineColors: string[]; // every distinct line colour (context + accent)
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.accentColor,
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.leftPeriod?.trim()) v.push("missing left period caption");
  if (!input.rightPeriod?.trim()) v.push("missing right period caption");
  if (!isOkabeIto(input.accentColor))
    v.push(`accent colour ${input.accentColor} is not in the Okabe-Ito set`);
  const distinct = new Set(input.lineColors.map((c) => c.toUpperCase()));
  if (distinct.size > 2)
    v.push(
      `slope uses ${distinct.size} line colours (> 2) — keep a neutral context + one accent`,
    );
  return v;
}

/**
 * L2 — DUMBBELL / range plot: global rules + the dumbbell musts. POSITION
 * encoding → does NOT inherit the bar baseline-0 rule (a zoomed range is
 * correct). Adds: both series labels present (the legend key), and the two dot
 * colours both in the Okabe-Ito set with ≤2 distinct hues (the neutral connector
 * is scaffolding, exempt from palette membership).
 */
export function checkDumbbellConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    leftLabel?: string;
    rightLabel?: string;
    dotColors: string[]; // the two endpoint colours
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.dotColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.leftLabel?.trim()) v.push("missing left series label");
  if (!input.rightLabel?.trim()) v.push("missing right series label");
  const distinct = new Set(input.dotColors.map((c) => c.toUpperCase()));
  if (distinct.size > 2)
    v.push(`dumbbell uses ${distinct.size} dot colours (> 2)`);
  for (const c of input.dotColors)
    if (!isOkabeIto(c)) v.push(`dot colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — RADAR / spider: global rules + the polar musts. Every axis shares ONE
 * radial scale from the centre = 0 (a documented common max > 0), there are ≥ 3
 * axes (a polygon needs three points) and ≤ 3 series (more becomes mush —
 * radar.md), each series colour in the Okabe-Ito set. POSITION-on-a-shared-scale
 * encoding, so it does NOT inherit the bar baseline-0 *axis* rule — the centre=0
 * is the radial origin, checked here as max > 0.
 */
export function checkRadarConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    max: number;
    axisCount: number;
    seriesCount: number;
    seriesColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.seriesColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!(input.max > 0))
    v.push(`radar needs a documented common max > 0 — got ${input.max}`);
  if (input.axisCount < 3)
    v.push(`radar has ${input.axisCount} axes (< 3) — a polygon needs ≥ 3`);
  if (input.seriesCount > 3)
    v.push(`radar has ${input.seriesCount} series (> 3) — the polygons blur`);
  for (const c of input.seriesColors)
    if (!isOkabeIto(c))
      v.push(`series colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — HEATMAP: colour is the quantitative channel, so this is the ONE type that
 * does NOT use the Okabe-Ito categorical palette. It requires a SEQUENTIAL ramp
 * whose luminance is monotonic (single-hue ColorBrewer / viridis) — that is what
 * makes it CVD-safe and greyscale-readable (heatmap.md rule 1). Plus: a range
 * (min < max) for the colourbar. The per-cell label contrast is handled in the
 * component (white-on-dark / ink-on-light), not here.
 */
export function checkHeatmapConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    rampStops: string[];
    valueDomain: [number, number];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    // the global "data ∈ Okabe-Ito" check is for CATEGORICAL types; the heatmap's
    // colour is a sequential ramp, validated below by monotonic luminance. Pass a
    // representative Okabe-Ito blue so the (here-irrelevant) categorical check
    // passes; title/source/contrast still apply.
    colors: { data: "#0072B2", text: textColors.text, bg: textColors.bg },
  });
  if (input.rampStops.length < 3)
    v.push("heatmap ramp needs ≥ 3 stops for a readable sequential scale");
  const lums = input.rampStops.map(relativeLuminance);
  for (let i = 1; i < lums.length; i++)
    if (lums[i] >= lums[i - 1]) {
      v.push(
        "heatmap ramp luminance is not monotonic — use a sequential CVD-safe ramp (single-hue / viridis)",
      );
      break;
    }
  const [lo, hi] = input.valueDomain;
  if (!(hi > lo)) v.push(`heatmap value range is empty — [${lo}, ${hi}]`);
  return v;
}
