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
