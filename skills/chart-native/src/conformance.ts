// Conformance guard for native charts — the automated equivalent of dw-chart's
// validateChartSpec, so design-conformance.md is ENFORCED (not just baked in by
// hand). Pure, framework-free; reused as the template for every native chart.
//
// Source: knowledge/references/design-conformance.md (Okabe-Ito, WCAG, FT).

import type { ChartConfig } from "./LineChart";

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
export function checkConformance(
  config: ChartConfig,
  colors: ConformanceColors,
): string[] {
  const v: string[] = [];

  // 1. Title = the insight (not a bare label or year range, not ALL CAPS).
  const title = config.title?.trim() ?? "";
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title))
    v.push(`title is a year range, not an insight: "${title}"`);
  if (title.length > 0 && title === title.toUpperCase())
    v.push("title is ALL CAPS (use sentence case)");
  if (title && config.directLabel && title === config.directLabel)
    v.push("title must be the insight, not the series label");

  // 2. Data colour ∈ Okabe-Ito.
  if (!isOkabeIto(colors.data))
    v.push(`data colour ${colors.data} is not in the Okabe-Ito set`);

  // 3. Direct label present (we label over a legend).
  if (!config.directLabel?.trim()) v.push("missing direct label");

  // 5. Source cited: name + url.
  if (!config.source?.name?.trim()) v.push("missing source name");
  if (!config.source?.url?.trim()) v.push("missing source url");

  // 6. Alt = the insight → the component uses config.title as aria-label, so a
  //    present, insight-shaped title (checked above) is the alt. Nothing extra.

  // 7. Contrast ≥ 4.5:1 for every text colour (incl. the data colour, which is
  //    also the direct-label text). Decorative gridlines are exempt.
  for (const t of colors.text) {
    const r = contrastRatio(t, colors.bg);
    if (r < 4.5)
      v.push(
        `text colour ${t} contrast ${r.toFixed(2)}:1 on ${colors.bg} < 4.5:1`,
      );
  }

  return v;
}
