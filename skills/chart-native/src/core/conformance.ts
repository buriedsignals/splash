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
