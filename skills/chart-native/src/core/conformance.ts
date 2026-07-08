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

// Subjects for which blue — either shade — IS the subject-fit choice (water, cold,
// sky, marine). Mirrors dw-chart's BLUE_FIT_SUBJECT (chart-spec.ts) so the same rule
// can hold on the native path; duplicated rather than imported — skills are
// autonomous/self-contained (format-skill-autonome), chart-native does not reach
// into dw-chart's internals.
const BLUE_FIT_SUBJECT =
  /\b(water|sea|ocean|river|rain|flood|cold|winter|ice|snow|sky|marine|hydro)\b/i;

// Both Okabe-Ito blues read as "blue" to a reader. Picking the lighter sky-blue for a
// non-blue-fit subject is the SAME "left it blue" defect as the literal default — a
// real regression caught live: a "cross-border commuting" chart shipped `#56B4E9`
// because the (dw-chart) guard only excludes the EXACT default `#0072B2`. This set
// closes that gap for whichever caller opts into the subject-fit check below.
const BLUE_FAMILY = new Set(["#0072B2", "#56B4E9"]);

export interface ConformanceColors {
  /** the data/series colour (also used for the direct-label text) */
  data: string;
  /** every colour used to render TEXT (must clear 4.5:1 on bg) */
  text: string[];
  bg: string;
}

// F2 — NEWSROOM BRAND PROFILE, policy (b) brand-first + warning.
//
// A newsroom's house colour may not be CVD-safe or may fail the value-label
// contrast the engines enforce at produce-time. We do NOT rewrite it (that was the
// rejected policy (a) nearest-safe nudging). Instead, when a colour was EXPLICITLY
// set by the journalist via the brand profile, its CVD-safety / contrast violation
// is DOWNGRADED to a render-review concern (non-fatal) — the tradeoff is surfaced,
// the editor decides. A colour that was NOT brand-explicit (the auto subject-fit
// path) stays hard-guarded exactly as today.
export interface BrandReconciliation {
  /** hard failures — the auto path, unchanged (produce must refuse on these) */
  violations: string[];
  /** downgraded brand-colour a11y issues — recorded for the render-review (policy b) */
  concerns: string[];
}

// The two a11y violation shapes the bypass is scoped to. Both embed the exact hex,
// so the match keys off the COLOUR (not fuzzy text): a CVD-safety failure (any of
// "data/series/slice/… colour #hex is not in the Okabe-Ito set") and a text
// contrast failure. Everything else (title, source, baseline-0, …) is never
// downgraded — those are hard regardless of brand choice.
const CVD_VIOLATION = /(#[0-9a-fA-F]{6}) is not in the Okabe-Ito set/;
const CONTRAST_VIOLATION =
  /text colour (#[0-9a-fA-F]{6}) contrast ([\d.]+):1 on (#[0-9a-fA-F]{6}) < 4\.5:1/;

/**
 * Partition raw conformance violations under policy (b). A CVD-safety or text
 * contrast violation that names a journalist-chosen brand colour becomes a
 * render-review CONCERN; every other violation (and any a11y failure whose colour
 * is NOT in the brand set) stays a hard violation. An empty/undefined brand set
 * means "no brand profile" → all violations stay hard (the auto path, unchanged).
 * Pure — no rewrite, no global relaxation.
 */
export function reconcileBrandViolations(
  rawViolations: readonly string[],
  brandColors: readonly string[] | undefined,
): BrandReconciliation {
  const brand = new Set((brandColors ?? []).map((c) => c.toUpperCase()));
  if (brand.size === 0) return { violations: [...rawViolations], concerns: [] };

  const violations: string[] = [];
  const concerns: string[] = [];
  for (const raw of rawViolations) {
    const cvd = CVD_VIOLATION.exec(raw);
    if (cvd && brand.has(cvd[1].toUpperCase())) {
      concerns.push(
        `brand colour ${cvd[1]} is not colour-blind-safe (outside the Okabe-Ito set) — kept per the newsroom's house style (render-review concern)`,
      );
      continue;
    }
    const contrast = CONTRAST_VIOLATION.exec(raw);
    if (contrast && brand.has(contrast[1].toUpperCase())) {
      concerns.push(
        `brand colour ${contrast[1]} is ${contrast[2]}:1 on ${contrast[3]}, below WCAG 4.5:1 — kept per the newsroom's house style (render-review concern)`,
      );
      continue;
    }
    violations.push(raw);
  }
  return { violations, concerns };
}

/**
 * Check a chart's config + colours against design-conformance.md. Returns the
 * list of violations (empty = conformant). The component bakes these in; this
 * is the guard that proves it for every chart we ship.
 */
/**
 * L0 — GLOBAL dataviz rules that hold for EVERY chart type (and map): insight
 * title, Okabe-Ito data colour, source name (url optional), WCAG text contrast. The
 * type-specific guards below compose on top (global ++ type), mirroring the
 * layered knowledge tree.
 */
export function checkGlobalConformance(input: {
  title: string;
  source: { name?: string; url?: string };
  colors: ConformanceColors;
  /**
   * WCAG 1.1.1 — alt text must state the INSIGHT (not the chart's structure),
   * mirroring dw-chart's `validateChartSpec` (`chart-spec.ts`), which already hard-
   * requires `altInsight`. OPTIONAL on this signature for backward compatibility
   * with the ~30 render-config callers below (a post-mapping `Config` doesn't carry
   * this spec-level field today) — but any caller that DECLARES the key (even by
   * copying a possibly-missing value straight off a spec, e.g.
   * `altInsight: spec.altInsight`) gets it enforced as a hard violation, not a soft
   * note. Gated on `"altInsight" in input` (not `!== undefined`) so a caller who
   * genuinely omits the key stays a no-op, while a caller who threads a spec's
   * (possibly-missing) field through still gets caught when it's missing.
   */
  altInsight?: string;
  /**
   * The chart's declared subject (e.g. "housing", "cross-border commuting"), when
   * the caller has one. Mirrors dw-chart's subject↔baseColor guardrail (chart-
   * spec.ts) so the same "never leave it blue" rule can be enforced here too — see
   * BLUE_FIT_SUBJECT / BLUE_FAMILY above. Same opt-in `"subject" in input` gate as
   * `altInsight`: omit entirely for the existing render-config callers below (which
   * have no subject concept), thread it when the caller has a real spec subject.
   */
  subject?: string;
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

  // 2b. A declared subject must not leave the chart on a blue-family hue (#0072B2 OR
  // #56B4E9) unless the subject actually fits blue (water/cold/sky/marine). Catches
  // both the literal default and the "escape hatch" sky-blue — same defect, two hexes.
  if (
    "subject" in input &&
    typeof input.subject === "string" &&
    input.subject.trim() &&
    !BLUE_FIT_SUBJECT.test(input.subject) &&
    BLUE_FAMILY.has(colors.data.toUpperCase())
  )
    v.push(
      `subject "${input.subject}" has no subject-fit colour — ${colors.data} is a blue-family Okabe-Ito hue and must not stand in for a subject that is not water/cold/sky/marine (choose a deliberate hue instead, e.g. amber/green/vermilion/purple)`,
    );

  // 5. Source cited: NAME required (anti-fabrication + attribution). URL is OPTIONAL —
  //    an honest prose source ("Chiffres tels que rapportés dans cet article") or a
  //    newsroom's own reporting legitimately has none, and requiring it hard-blocked the
  //    prose path (E2 deadlock). Source traceability against the article is the
  //    render-review's job, not a blind url-present check here.
  if (!input.source?.name?.trim()) v.push("missing source name");

  // 6. Alt text = the insight (WCAG 1.1.1), mirroring dw-chart's altInsight
  // requirement (chart-spec.ts). Opt-in — see the field's doc comment above: only
  // enforced when the caller declares the key.
  if ("altInsight" in input && !input.altInsight?.trim())
    v.push(
      "missing altInsight (WCAG 1.1.1: alt text must state the insight, not the chart's structure)",
    );

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
 * L2 — DOT STRIP: global rules + the strip musts. POSITION encoding → NOT a
 * baseline-0 type. The dots all share ONE data colour (in the Okabe-Ito set), a
 * summary marker (mean) must be present so the eye gets a reference, and every
 * category must hold at least one observation (an empty strip is a data error).
 */
export function checkDotStripConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    dotColor: string;
    hasSummaryMarker: boolean;
    categoryCounts: number[]; // observations per category
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.dotColor,
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.hasSummaryMarker)
    v.push("dot strip needs a summary marker (e.g. the category mean)");
  if (input.categoryCounts.some((c) => c < 1))
    v.push("a category has no observations (empty strip)");
  return v;
}

/**
 * L2 — VIOLIN: global rules + the distribution musts. POSITION encoding → NOT a
 * baseline-0 type. One data colour (in the Okabe-Ito set) for the silhouette, a
 * median marker must be present (the eye needs a reference), and every category
 * needs ≥ 2 observations or a kernel-density estimate is meaningless.
 */
export function checkViolinConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    fillColor: string;
    hasMedianMarker: boolean;
    categoryCounts: number[]; // observations per category
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.fillColor,
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.hasMedianMarker)
    v.push("violin needs a median marker for reference");
  if (input.categoryCounts.some((c) => c < 2))
    v.push("a category has fewer than 2 observations (density undefined)");
  return v;
}

/**
 * L2 — ARC DIAGRAM: global rules + the network musts. Up to one Okabe-Ito colour
 * per node group (≤ 8, CVD-safe), link weight encoded by stroke width (so the
 * arcs are comparable), and every link must reference real nodes (a dangling edge
 * is a data error). The arc-height cap is enforced in geometry, not here.
 */
export function checkArcConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    groupColors: string[]; // one colour per node group
    encodesWeightByWidth: boolean;
    danglingLinks: number; // links referencing a missing node
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
  if (input.groupColors.length > 8)
    v.push(
      `arc uses ${input.groupColors.length} group colours (> 8 Okabe-Ito)`,
    );
  for (const c of input.groupColors)
    if (!isOkabeIto(c)) v.push(`group colour ${c} is not in the Okabe-Ito set`);
  if (!input.encodesWeightByWidth)
    v.push("arc link weight must be encoded by stroke width");
  if (input.danglingLinks > 0)
    v.push(`${input.danglingLinks} link(s) reference a missing node`);
  return v;
}

/**
 * L2 — RADIAL BAR / column: global rules + the radial musts. Radial LENGTH
 * encodes magnitude, so the scale MUST start at 0 on the baseline circle (a
 * non-zero radial baseline lies, exactly like a truncated cartesian bar). One
 * Okabe-Ito data colour, and a radial value axis (tick rings) must be present so
 * the reader can decode the lengths.
 */
export function checkRadialBarConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    dataColor: string;
    radialBaseline: number; // the value at the inner circle — MUST be 0
    tickCount: number; // number of radial value rings
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.dataColor,
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (input.radialBaseline !== 0)
    v.push(
      `radial baseline is ${input.radialBaseline}, not 0 (length encoding requires a 0 baseline)`,
    );
  if (input.tickCount < 1)
    v.push("radial bar needs a value axis (at least one tick ring)");
  return v;
}

/**
 * L2 — LINE + COLUMN COMBO (dual axis): global rules + the dual-axis musts. A
 * second axis can mislead, so the honesty rules are non-negotiable: the COLUMN
 * (left) axis must include 0 (length encoding), BOTH axes must be labelled (so the
 * reader knows which series reads against which), and the two series carry two
 * distinct Okabe-Ito colours — each matching its own axis.
 */
export function checkComboConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    columnColor: string;
    lineColor: string;
    columnAxisIncludesZero: boolean;
    leftAxisLabel?: string;
    rightAxisLabel?: string;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.columnColor,
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.columnAxisIncludesZero)
    v.push("column (left) axis must include 0 (length encoding)");
  if (!input.leftAxisLabel?.trim()) v.push("missing left-axis label");
  if (!input.rightAxisLabel?.trim()) v.push("missing right-axis label");
  if (!isOkabeIto(input.lineColor))
    v.push(`line colour ${input.lineColor} is not in the Okabe-Ito set`);
  if (input.columnColor.toUpperCase() === input.lineColor.toUpperCase())
    v.push("the two series must use distinct colours (one per axis)");
  return v;
}

/**
 * L2 — PICTOGRAM / isotype: global rules + the count musts. Magnitude is a COUNT
 * of equal icons, so: a positive unit-per-icon MUST be stated (an undeclared unit
 * makes the count undecodable), one Okabe-Ito data colour, and the implicit
 * baseline is 0 (no icons = 0 — icons never shrink to encode value, that is the
 * equal-size rule the component bakes in).
 */
export function checkPictogramConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    iconColor: string;
    unitPerIcon: number;
    unitStated: boolean; // is "each icon = N" shown to the reader?
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.iconColor,
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!(input.unitPerIcon > 0))
    v.push("pictogram needs a positive unit-per-icon");
  if (!input.unitStated)
    v.push("the unit (each icon = N) must be stated for the count to be read");
  return v;
}

/**
 * L2 — CANDLESTICK / OHLC: global rules + the market musts. POSITION/range
 * encoding → not a baseline-0 type. Adds: valid OHLC every period (high ≥
 * max(open,close), low ≤ min(open,close)), a labelled price axis, and exactly two
 * direction colours (up/down) both in the Okabe-Ito set (CVD-safe, not bare
 * red/green).
 */
export function checkCandlestickConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    priceLabel?: string;
    ohlc: { open: number; high: number; low: number; close: number }[];
    directionColors: string[]; // [up, down]
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.directionColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.priceLabel?.trim()) v.push("missing price-axis label");
  for (const c of input.ohlc)
    if (
      c.high < Math.max(c.open, c.close) ||
      c.low > Math.min(c.open, c.close)
    ) {
      v.push("a period has invalid OHLC (high < body or low > body)");
      break;
    }
  const distinct = new Set(input.directionColors.map((c) => c.toUpperCase()));
  if (distinct.size !== 2)
    v.push(
      `candlestick needs exactly 2 direction colours — got ${distinct.size}`,
    );
  for (const c of input.directionColors)
    if (!isOkabeIto(c))
      v.push(`direction colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — LORENZ curve: global rules + the inequality musts. Each curve must run
 * (0,0)→(1,1) (cumulative shares), the Gini sits in [0,1], there are ≤ 3 curves,
 * each an Okabe-Ito hue, and BOTH axes are labelled (cumulative shares). The line
 * of equality + the shaded gap are structural (drawn by the component).
 */
export function checkLorenzConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    xLabel?: string;
    yLabel?: string;
    series: { endsX: number; endsY: number; gini: number }[];
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
  if (!input.xLabel?.trim())
    v.push("missing x-axis label (cumulative population share)");
  if (!input.yLabel?.trim())
    v.push("missing y-axis label (cumulative value share)");
  if (input.series.length > 3)
    v.push(`lorenz has ${input.series.length} curves (> 3) — they tangle`);
  for (const s of input.series) {
    if (Math.abs(s.endsX - 1) > 1e-6 || Math.abs(s.endsY - 1) > 1e-6)
      v.push("a lorenz curve does not end at (1,1)");
    if (!(s.gini >= 0 && s.gini <= 1))
      v.push(`a lorenz Gini is out of range: ${s.gini}`);
  }
  for (const c of input.seriesColors)
    if (!isOkabeIto(c)) v.push(`curve colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — WAFFLE / square-pie: global rules + the countable part-to-whole musts.
 * Cells must sum to the whole, so ≤ 6 categories (more fragments the grid), each
 * an Okabe-Ito hue, and a stated unit. The cell-count total is guaranteed by the
 * largest-remainder allocation in the geometry; here we check the palette + cap.
 */
export function checkWaffleConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    unit?: string;
    categoryCount: number;
    categoryColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.categoryColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.unit?.trim())
    v.push("missing unit (state what one square represents)");
  if (input.categoryCount > 6)
    v.push(
      `waffle has ${input.categoryCount} categories (> 6) — group the tail into "Other"`,
    );
  for (const c of input.categoryColors)
    if (!isOkabeIto(c))
      v.push(`category colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — CALENDAR HEATMAP: like the matrix heatmap, colour is the quantitative
 * channel — so it must be a SEQUENTIAL ramp with monotonic luminance (single-hue,
 * CVD-safe), NOT the categorical Okabe-Ito palette. Adds: a labelled value unit,
 * a value range (min < max), and ≥ 14 days (a calendar needs a span to read).
 */
export function checkCalendarConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    unit?: string;
    rampStops: string[];
    valueDomain: [number, number];
    dayCount: number;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    // colour is a sequential ramp (validated below), not categorical; pass a
    // representative Okabe-Ito blue so the categorical check is a no-op here.
    colors: { data: "#0072B2", text: textColors.text, bg: textColors.bg },
  });
  if (!input.unit?.trim()) v.push("missing value unit");
  if (input.rampStops.length < 3)
    v.push("calendar ramp needs ≥ 3 stops for a readable sequential scale");
  const lums = input.rampStops.map(relativeLuminance);
  for (let i = 1; i < lums.length; i++)
    if (lums[i] >= lums[i - 1]) {
      v.push(
        "calendar ramp luminance is not monotonic — use a sequential CVD-safe ramp",
      );
      break;
    }
  const [lo, hi] = input.valueDomain;
  if (!(hi > lo)) v.push(`calendar value range is empty — [${lo}, ${hi}]`);
  if (input.dayCount < 14)
    v.push(
      `calendar has ${input.dayCount} days (< 14) — too short to read as a calendar`,
    );
  return v;
}

/**
 * L2 — FAN CHART: global rules + the uncertainty musts. The fan is one hue (tints
 * by level), so the global data-colour check applies to that hue. Adds: ≥ 2
 * confidence levels, a labelled value axis, and — the structural guarantee — every
 * forecast step must NEST (hi ≥ central ≥ lo) and the OUTER band must contain the
 * inner at each step. `forecast` is the per-step [lo..hi] per level for checking.
 */
export function checkFanConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    valueLabel?: string;
    levels: number[];
    /** per forecast step: { central, bands: { level → [lo, hi] } } */
    forecast: { central: number; bands: Record<number, [number, number]> }[];
    hue: string;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: { data: input.hue, text: textColors.text, bg: textColors.bg },
  });
  if (input.levels.length < 2)
    v.push(
      `fan chart needs ≥ 2 confidence levels — got ${input.levels.length}`,
    );
  if (!input.valueLabel?.trim()) v.push("missing value-axis label");
  const asc = [...input.levels].sort((a, b) => a - b);
  for (const step of input.forecast) {
    for (const lv of asc) {
      const b = step.bands[lv];
      if (!b) continue;
      if (!(b[1] >= step.central && step.central >= b[0]))
        v.push(`a band does not bracket the central estimate (level ${lv})`);
    }
    // outer ⊇ inner: walk levels widest→narrowest
    for (let i = asc.length - 1; i > 0; i--) {
      const outer = step.bands[asc[i]];
      const inner = step.bands[asc[i - 1]];
      if (outer && inner && !(outer[0] <= inner[0] && outer[1] >= inner[1])) {
        v.push(`the ${asc[i]}% band does not contain the ${asc[i - 1]}% band`);
        break;
      }
    }
  }
  return v;
}

/**
 * L2 — GANTT / timeline: global rules + the time-span musts. Bar length encodes
 * DURATION on a to-scale time axis (not a quantity), so this is not a baseline-0
 * type. Adds: every span has end ≥ start, a captioned time axis, ≥ 1 item, and
 * group colours in the Okabe-Ito set (≤ 6). The to-scale axis is structural.
 */
export function checkGanttConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    spans: { startMs: number; endMs: number }[];
    timeLabel?: string;
    groupColors: string[];
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
  if (!input.spans.length) v.push("gantt needs at least one item");
  if (input.spans.some((s) => s.endMs < s.startMs))
    v.push("every gantt span must have end ≥ start");
  if (!input.timeLabel?.trim())
    v.push("missing time-axis caption (length is duration, not magnitude)");
  const distinct = new Set(input.groupColors.map((c) => c.toUpperCase()));
  if (distinct.size > 6)
    v.push(`gantt uses ${distinct.size} group colours (> 6)`);
  for (const c of input.groupColors)
    if (!isOkabeIto(c)) v.push(`group colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — STREAMGRAPH: global rules + the free-baseline musts. Thickness encodes
 * value, but there is NO value axis (the baseline wiggles), so this is not a
 * baseline-0 type. Adds: ≤ 7 series (more is mush), every band colour in the
 * Okabe-Ito set, and ≥ 2 time steps. Bands must be labelled directly (the reader
 * can't read absolute heights) — enforced in the component, noted here.
 */
export function checkStreamgraphConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    seriesCount: number;
    seriesColors: string[];
    stepCount: number;
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
  if (input.seriesCount > 7)
    v.push(
      `streamgraph has ${input.seriesCount} series (> 7) — group the long tail`,
    );
  if (input.stepCount < 2)
    v.push(`streamgraph needs ≥ 2 time steps — got ${input.stepCount}`);
  for (const c of input.seriesColors)
    if (!isOkabeIto(c)) v.push(`band colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — CHORD / flow matrix: global rules + the chord musts. The flow matrix must
 * be square and non-negative, there are ≤ 8 entities (more knots the ribbons),
 * each an Okabe-Ito hue, and every arc is labelled (the component draws them).
 */
export function checkChordConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    matrix: number[][];
    labels: string[];
    entityColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.entityColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  const n = input.labels.length;
  if (input.matrix.length !== n || input.matrix.some((r) => r.length !== n))
    v.push("chord matrix must be square (N×N) matching the labels");
  if (input.matrix.some((r) => r.some((x) => x < 0)))
    v.push("chord flows must be ≥ 0");
  if (n > 8)
    v.push(`chord has ${n} entities (> 8) — the ribbons knot; aggregate`);
  if (input.labels.some((l) => !l?.trim()))
    v.push("every chord arc needs a label");
  for (const c of input.entityColors)
    if (!isOkabeIto(c))
      v.push(`entity colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — SANKEY / flow: global rules + the flow musts. Thickness encodes value, so
 * every link value must be > 0, there must be ≥ 2 columns, and every node carries
 * a label. Source-coloured ribbons use the Okabe-Ito set with ≤ 6 hues (neutral
 * grey ribbons are scaffolding, exempt — omit them). Flow conservation is a data
 * property checked structurally in the geometry, not here.
 */
export function checkSankeyConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    columnCount: number;
    linkValues: number[];
    nodeLabels: string[];
    rampColors: string[]; // the coloured (non-neutral) ribbon/source colours
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.rampColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (input.columnCount < 2)
    v.push(`sankey needs ≥ 2 columns — got ${input.columnCount}`);
  if (input.linkValues.some((x) => !(x > 0)))
    v.push("every sankey link value must be > 0");
  if (input.nodeLabels.some((l) => !l?.trim()))
    v.push("every sankey node needs a label");
  const distinct = new Set(input.rampColors.map((c) => c.toUpperCase()));
  if (distinct.size > 6)
    v.push(
      `sankey uses ${distinct.size} ribbon colours (> 6) — aggregate or go neutral`,
    );
  for (const c of input.rampColors)
    if (!isOkabeIto(c))
      v.push(`ribbon colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — DIVERGING STACKED / Likert: global rules + the survey musts. A centred
 * composition → not a baseline-0 *length* type (the centre is 0, by construction).
 * Adds: ≥ 2 ordered responses, ≤ 5 (the ramp's real collision-free capacity —
 * DIVERGING_STACKED_COLORS has only 2 hues per side, so a 6+ point scale wraps
 * and two response levels on the overloaded side silently render the SAME hue;
 * see DivergingStackedChart's `colorOf`), each item's responses summing to
 * ~100% (a real composition), and the sentiment colours in the Okabe-Ito set
 * (the neutral grey is scaffolding, exempt — pass it as null/omit).
 */
export function checkDivergingStackedConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    responseCount: number;
    /** each item's response percentages, to verify they form a composition */
    rows: number[][];
    sentimentColors: string[]; // the non-neutral response colours
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.sentimentColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (input.responseCount < 2)
    v.push(
      `diverging stacked needs ≥ 2 responses — got ${input.responseCount}`,
    );
  if (input.responseCount > 5)
    v.push(
      `diverging stacked supports at most 5 response levels — got ${input.responseCount}; a longer Likert scale would collide colours (only 2 hues per side) — use fewer levels or a different encoding`,
    );
  for (const row of input.rows) {
    const sum = row.reduce((s, x) => s + x, 0);
    if (Math.abs(sum - 100) > 1.5)
      v.push(
        `a row sums to ${sum.toFixed(1)}% (responses must compose to ~100%)`,
      );
  }
  for (const c of input.sentimentColors)
    if (!isOkabeIto(c))
      v.push(`sentiment colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — SUNBURST: global rules + the radial-hierarchy musts. Angle encodes value,
 * so every leaf value is > 0 and a parent equals the sum of its children (the
 * geometry rolls this up, checked here as all-positive). Branches are coloured
 * with the Okabe-Ito set (≤ 7 top-level branches; deeper rings lighten the hue).
 */
export function checkSunburstConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    leafValues: number[];
    branchCount: number;
    branchColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.branchColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.leafValues.length) v.push("sunburst needs at least one leaf");
  if (input.leafValues.some((x) => !(x > 0)))
    v.push("sunburst leaf values must all be > 0 (angle can't be negative)");
  if (input.branchCount > 7)
    v.push(
      `sunburst has ${input.branchCount} top-level branches (> 7) — group the tail`,
    );
  for (const c of input.branchColors)
    if (!isOkabeIto(c))
      v.push(`branch colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — TREEMAP: global rules + the space-filling musts. Area encodes value, so
 * every value must be > 0 (area can't be negative) and the grouping colours are
 * Okabe-Ito with ≤ 5 hues (more groups blur). A treemap is not a baseline-0 type
 * (area, not length). The faithful tiling is guaranteed by the geometry.
 */
export function checkTreemapConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    values: number[];
    groupColors: string[];
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
  if (!input.values.length) v.push("treemap needs at least one item");
  if (input.values.some((x) => !(x > 0)))
    v.push("treemap values must all be > 0 (area can't be negative)");
  const distinct = new Set(input.groupColors.map((c) => c.toUpperCase()));
  if (distinct.size > 5)
    v.push(`treemap uses ${distinct.size} group colours (> 5)`);
  for (const c of input.groupColors)
    if (!isOkabeIto(c)) v.push(`group colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — BEESWARM / strip plot: global rules + the "show your data" musts. POSITION
 * encoding (value on x; the dodge axis is decorative) → no baseline-0 rule. Adds:
 * a labelled value axis (the unit), at least one point, and — when coloured by
 * category — every category colour in the Okabe-Ito set with ≤ 5 hues (a single
 * un-categorised swarm uses one Okabe-Ito hue, checked by the global rule).
 */
export function checkBeeswarmConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    valueLabel?: string;
    pointCount: number;
    categoryColors: string[]; // [] for a single-hue swarm
  },
  colors: ConformanceColors,
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors,
  });
  if (!input.valueLabel?.trim())
    v.push("missing value-axis label (the unit — position encoding needs it)");
  if (input.pointCount < 1) v.push("beeswarm needs at least one point");
  const distinct = new Set(input.categoryColors.map((c) => c.toUpperCase()));
  if (distinct.size > 5)
    v.push(`beeswarm uses ${distinct.size} category colours (> 5)`);
  for (const c of input.categoryColors)
    if (!isOkabeIto(c))
      v.push(`category colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — BUMP: global rules + the ranking-over-time musts. POSITION encoding (rank
 * on a category axis) → no baseline-0 rule. Adds: ≥ 2 periods and ≥ 2 ranks (a
 * race needs steps and contenders), a labelled value/rank meaning, and the accent
 * colours in the Okabe-Ito set with ≤ 3 highlighted lines (more tangles — the
 * rest are neutral grey context, exempt from palette membership like a gridline).
 */
export function checkBumpConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    periodCount: number;
    maxRank: number;
    highlightCount: number;
    accentColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.accentColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (input.periodCount < 2)
    v.push(`bump needs ≥ 2 periods — got ${input.periodCount}`);
  if (input.maxRank < 2) v.push(`bump needs ≥ 2 ranks — got ${input.maxRank}`);
  if (input.highlightCount > 3)
    v.push(
      `bump highlights ${input.highlightCount} lines (> 3) — track a few, grey the rest`,
    );
  for (const c of input.accentColors)
    if (!isOkabeIto(c))
      v.push(`accent colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — BOX PLOT: global rules + the distribution musts. POSITION encoding → it
 * does NOT inherit the bar baseline-0 rule (a zoomed value range is correct), so
 * the guard adds: a labelled value axis (the unit — length is not the encoding
 * here), at least one category, and the box hue(s) in the Okabe-Ito set with ≤ 2
 * distinct hues (one group, or two compared side-by-side). The median line,
 * Tukey whiskers and individual outliers are structural (boxplot-geometry).
 */
export function checkBoxplotConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    valueLabel?: string;
    categoryCount: number;
    boxColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.boxColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (!input.valueLabel?.trim())
    v.push("missing value-axis label (the unit — position encoding needs it)");
  if (input.categoryCount < 1) v.push("box plot needs at least one category");
  const distinct = new Set(input.boxColors.map((c) => c.toUpperCase()));
  if (distinct.size > 2)
    v.push(`box plot uses ${distinct.size} box colours (> 2)`);
  for (const c of input.boxColors)
    if (!isOkabeIto(c)) v.push(`box colour ${c} is not in the Okabe-Ito set`);
  return v;
}

/**
 * L2 — PARALLEL COORDINATES: global rules + the multivariate musts. POSITION
 * encoding per axis → no baseline-0 rule. Adds: ≥ 3 dimensions (axes), every axis
 * labelled, ≤ 3 highlighted lines (more is a hairball), and the accent colours in
 * the Okabe-Ito set (the greyed context is exempt, like a gridline).
 */
export function checkParallelConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    dimensionLabels: string[];
    highlightCount: number;
    accentColors: string[];
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v = checkGlobalConformance({
    title: input.title,
    source: input.source,
    colors: {
      data: input.accentColors[0] ?? "#0072B2",
      text: textColors.text,
      bg: textColors.bg,
    },
  });
  if (input.dimensionLabels.length < 3)
    v.push(
      `parallel coordinates need ≥ 3 axes — got ${input.dimensionLabels.length}`,
    );
  if (input.dimensionLabels.some((l) => !l?.trim()))
    v.push("every parallel axis needs a label");
  if (input.highlightCount > 3)
    v.push(
      `parallel plot highlights ${input.highlightCount} lines (> 3) — grey more of them`,
    );
  for (const c of input.accentColors)
    if (!isOkabeIto(c))
      v.push(`accent colour ${c} is not in the Okabe-Ito set`);
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
