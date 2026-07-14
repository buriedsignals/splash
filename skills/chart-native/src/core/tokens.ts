// Design tokens — Okabe-Ito colourblind-safe set (design-conformance.md).
// #0072B2 is the default single-series colour. ≤2 colours.

export const OKABE_ITO = {
  blue: "#0072B2",
  orange: "#E69F00",
  green: "#009E73",
  vermillion: "#D55E00",
  purple: "#CC79A7",
  skyblue: "#56B4E9",
  yellow: "#F0E442",
  black: "#000000",
} as const;

export const COLORS = {
  line: OKABE_ITO.blue,
  head: "#FFFFFF",
  headGlow: OKABE_ITO.blue,
  ink: "#1A1A1A", // WCAG ≥ 4.5:1 on white
  muted: "#6B6B6B",
  grid: "#E6E6E6",
  axis: "#CFCFCF",
  bg: "#FFFFFF",
} as const;

// Dark-theme furniture set — the SAME shape as COLORS, so a newsroom `theme: dark`
// flips the chrome (bg/ink/muted/axis/grid) without touching the data palette. Every
// value is WCAG-verified against the dark bg (#18181B): ink 15.9:1, muted 6.4:1 (both
// ≥ 4.5:1 body-text); grid/axis are non-text hairlines. `line` brightens to skyblue —
// Okabe-Ito blue (#0072B2) sits at only ~3.1:1 on #18181B (borderline for a 3:1 non-text
// stroke), skyblue clears it comfortably — so a chart with NO subject-fit baseColor still
// draws a visible default series on dark. `head` stays white (a marker dot, always visible).
export const COLORS_DARK = {
  line: OKABE_ITO.skyblue,
  head: "#FFFFFF",
  headGlow: OKABE_ITO.skyblue,
  ink: "#F4F4F5", // WCAG 15.9:1 on #18181B
  muted: "#A1A1AA", // WCAG 6.4:1 on #18181B
  grid: "#3F3F46",
  axis: "#52525B",
  bg: "#18181B",
} as const;

// On the dark furniture bg (#18181B) the Okabe-Ito BLACK entry of a DATA palette
// vanishes (near-0 contrast — a black mark on a near-black ground). Every other
// Okabe-Ito hue stays CVD-safe and reads acceptably on dark, so ONLY black is
// swapped, for a light neutral that plays the same "neutral / total" role black
// plays on white: #E4E4E7 (WCAG ~13.5:1 on #18181B — a clearly visible light-grey
// mark). See themeStackedColors / themeWaterfallColors below.
export const DARK_PALETTE_BLACK_SUB = "#E4E4E7";

// Widened (string, not the light literals) so BOTH COLORS and COLORS_DARK satisfy it.
export type ColorTokens = { readonly [K in keyof typeof COLORS]: string };

// The single resolver every component + ChartFrame routes through: `themeColors(config.dark)`
// returns the dark set when the newsroom theme is dark, else the light default (back-compat —
// an undefined/false `dark` is exactly today's behaviour). Keep imports of the static `COLORS`
// only for PALETTE derivations that are theme-independent (Okabe-Ito marks); FURNITURE
// (ink/muted/axis/grid/bg/line) must go through this.
export function themeColors(dark?: boolean): ColorTokens {
  return dark ? COLORS_DARK : COLORS;
}

export const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const TYPE = {
  title: 22,
  axis: 13,
  label: 14,
  source: 12,
} as const;

// Beeswarm's per-category dot palette (BeeswarmChart.tsx), extracted here so the
// produce-time conformance resolver (core/resolve-conformance-colors.ts) can
// derive the SAME category colours without duplicating the literal array.
export const BEESWARM_CATEGORY_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
] as const;

// Pie/donut slice palette (PieChart.tsx), extracted so the produce-time conformance
// resolver derives the SAME slice colours without duplicating the literal (like
// BEESWARM_CATEGORY_COLORS). Marks only — every pie TEXT label is COLORS.ink.
export const PIE_SLICE_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.vermillion,
  OKABE_ITO.purple,
] as const;

// Grouped bar/column series palette (GroupedBarChart.tsx), extracted so the produce
// conformance resolver derives the SAME series colours. ≤3 series (grouped-bar.md).
export const GROUPED_SERIES_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
] as const;

// Stacked bar series palette (StackedBarChart.tsx), extracted so the produce
// conformance guard derives the SAME colours. ≤5 series (stacked-bar.md).
export const STACKED_SERIES_COLORS = [
  OKABE_ITO.black,
  OKABE_ITO.orange,
  OKABE_ITO.skyblue,
  OKABE_ITO.green,
  OKABE_ITO.purple,
] as const;

// Stacked area band palette (StackedAreaChart.tsx), extracted so the produce
// conformance guard derives the SAME colours. Skyblue-first — DIFFERENT order
// from STACKED_SERIES_COLORS (black-first) and GROUPED_SERIES_COLORS
// (blue-first); do not reuse either. ≤5 series (stacked-area.md).
export const STACKED_AREA_COLORS = [
  OKABE_ITO.skyblue,
  OKABE_ITO.orange,
  OKABE_ITO.blue,
  OKABE_ITO.green,
  OKABE_ITO.purple,
] as const;

// Waffle / square-pie category palette (WaffleChart.tsx), extracted so the produce
// conformance resolver derives the SAME category colours without duplicating the
// literal (like PIE_SLICE_COLORS). ≤6 categories (waffle.md). Every waffle TEXT
// label (legend, tooltip) is COLORS.ink — this palette is marks only.
export const WAFFLE_CATEGORY_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
  OKABE_ITO.skyblue,
] as const;

// Diverging bars: positive (blue) / negative (vermillion) sign colours — the guard
// (checkDivergingBarConformance) validates THESE, so component + guard never drift.
export const DIVERGING_SIGN_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.vermillion,
] as const;

// Waterfall roles: increase (blue) / decrease (vermillion) / total (black).
export const WATERFALL_ROLE_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.vermillion,
  OKABE_ITO.black,
] as const;

// Slope: neutral context line (muted) + the one editorial accent (vermillion).
// The guard (checkSlopeConformance) validates THESE, so component + guard never drift.
export const SLOPE_LINE_COLORS = [COLORS.muted, OKABE_ITO.vermillion] as const;

// Dumbbell endpoints: left series (orange) / right series (blue).
export const DUMBBELL_DOT_COLORS = [OKABE_ITO.orange, OKABE_ITO.blue] as const;

// Bullet: measure coloured by whether it HIT (blue) or MISSED (vermillion) its target.
// The guard (checkBulletConformance) validates THESE, so component + guard never drift.
export const BULLET_MEASURE_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.vermillion,
] as const;

// Treemap group palette (TreemapChart.tsx), extracted so the produce conformance
// guard derives the SAME group colours. ≤5 groups (treemap.md); an ungrouped
// (flat) treemap uses a single OKABE_ITO.blue hue for every cell. Every hue here
// has at least one of {white, COLORS.ink} clearing 4.5:1 against it, which is
// what TreemapChart's `cellText` picks per-cell (there's no neutral background
// to fall back to inside a coloured cell).
export const TREEMAP_GROUP_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
  OKABE_ITO.purple,
  OKABE_ITO.vermillion,
] as const;

// Diverging-stacked (Likert) ramp: warm negative (farthest→closest: vermillion,
// orange) → neutral grey (straddles the centre) → cool positive (closest→farthest:
// skyblue, blue). The guard (checkDivergingStackedConformance) validates the
// non-neutral hues, so component + guard never drift. Every non-neutral hue has
// at least one of {white, COLORS.ink} clearing 4.5:1 against it — DivergingStackedChart
// picks whichever wins by REAL contrast for its in-segment percent labels (not a
// luminance threshold, the same class of bug fixed for treemap's cell text).
export const DIVERGING_STACKED_COLORS = {
  neg: [OKABE_ITO.vermillion, OKABE_ITO.orange] as const,
  pos: [OKABE_ITO.skyblue, OKABE_ITO.blue] as const,
  neutral: "#BFBFBF",
} as const;

// Population pyramid sides: left group (blue) / right group (orange). The guard
// (checkPopulationPyramidConformance) validates THESE, so component + guard never
// drift.
export const PYRAMID_SIDE_COLORS = [OKABE_ITO.blue, OKABE_ITO.orange] as const;

// Bump accent DEFAULT palette — the fallback when the spec provides no colour.
// The spec's subject-fit hue wins first (baseColor for one tracked line,
// seriesColors for several); resolveBumpAccents (bump-geometry.ts) is the single
// path both BumpChart (paints) and produce-conformance (validates) go through, so
// component + guard never drift. Uncoloured slots cycle this palette in highlight
// order (the rest of the lines render as neutral COLORS.muted context, exempt from
// palette membership like a gridline). Every direct/end label renders in COLORS.ink
// regardless of accent — the accent stays on the LINE/mark, per the "label carries
// the value, mark carries the hue" rule.
export const BUMP_ACCENT_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.green,
] as const;

// Dark-variant resolvers for the DATA palettes that contain OKABE_ITO.black
// (STACKED_SERIES_COLORS, WATERFALL_ROLE_COLORS) — the two palettes whose black
// entry would disappear on the dark bg. On the light (default) theme each returns
// the palette VERBATIM (byte-identical, back-compat); on dark it swaps ONLY the
// black slot for DARK_PALETTE_BLACK_SUB, leaving every CVD-safe hue untouched. The
// SINGLE path a component paints through, mirroring themeColors for furniture. The
// treemap (TREEMAP_GROUP_COLORS) and diverging-stacked (DIVERGING_STACKED_COLORS)
// palettes contain NO black (their neutral is #BFBFBF, already light-visible), so
// they need no resolver — their marks are theme-independent.
function swapBlackForDark(
  palette: readonly string[],
  dark?: boolean,
): readonly string[] {
  return dark
    ? palette.map((c) => (c === OKABE_ITO.black ? DARK_PALETTE_BLACK_SUB : c))
    : palette;
}

export function themeStackedColors(dark?: boolean): readonly string[] {
  return swapBlackForDark(STACKED_SERIES_COLORS, dark);
}

export function themeWaterfallColors(dark?: boolean): readonly string[] {
  return swapBlackForDark(WATERFALL_ROLE_COLORS, dark);
}
