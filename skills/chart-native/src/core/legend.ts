// core/legend — the shared chip legend used by every multi-series type (stacked
// bar, grouped bar). A legend is the documented exception to the global "direct
// labels over a legend" rule (stacked-bar.md / grouped-bar.md rule 4): when bars
// can't each carry a label, ONE legend in series order is the key.
//
// This is a GLOBAL mechanism (recipe step 5): wrap a list of coloured series to
// fit a width, reading left→right then wrapping. The caller reserves padding for
// `rows` and renders `items` (chip + label) wherever it places the legend.
// `charW` and `rowH` are already scaled by the caller.

export interface LegendItem {
  x: number;
  y: number;
  color: string;
  text: string;
}

export function layoutLegend(
  series: string[],
  colors: string[],
  availWidth: number,
  x0: number,
  yTop: number,
  charW: number,
  rowH: number,
  // scales the chip + gaps to match a scaled (square/portrait) rendering; the
  // caller already scales charW/rowH. Default 1 keeps unscaled callers unchanged.
  scale = 1,
): { items: LegendItem[]; rows: number } {
  const chip = 13 * scale;
  const gapAfterChip = 6 * scale;
  const gapBetween = 18 * scale;
  const items: LegendItem[] = [];
  let x = x0;
  let row = 0;
  for (let i = 0; i < series.length; i++) {
    const w = chip + gapAfterChip + series[i].length * charW;
    if (x > x0 && x + w > x0 + availWidth) {
      row++;
      x = x0;
    }
    items.push({
      x,
      y: yTop + row * rowH,
      color: colors[i % colors.length],
      text: series[i],
    });
    x += w + gapBetween;
  }
  return { items, rows: row + 1 };
}

/**
 * How many rows a below-plot legend wraps to at `availWidth` — call this BEFORE
 * fixing the padding so the bottom band reserves the right height (the legend
 * wraps on a narrow phone). The recurring "reserve bottom by legend rows" step,
 * lifted into one place so every type computes it the same way (recipe step 5).
 */
export function legendRowCount(
  labels: string[],
  availWidth: number,
  charW: number,
  rowH: number,
): number {
  return layoutLegend(
    labels,
    labels.map(() => "#000"),
    availWidth,
    0,
    0,
    charW,
    rowH,
    1,
  ).rows;
}
