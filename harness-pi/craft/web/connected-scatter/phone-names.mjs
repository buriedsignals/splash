/**
 * A name set BELOW its point never leaves the plot at the bottom. The de-collision places it in viewBox units, where a
 * 14 px word is small at 1600 px; on a phone the plot is a fifth as tall while the word is not, and "Austria" printed
 * over the x-axis ticks (gx-connected-scatter, 375 × 812, 2026-11-19). Its box is 1.35 lines below its top.
 */
export function nameTop(topPct, below, linePx) {
  return below ? `min(${topPct}%, calc(100% - ${Math.ceil(linePx * 1.35)}px))` : `${topPct}%`;
}
