// The lollipop's floor on a narrow page. Its vertical is a value axis — a length, free to follow the stretch — so
// chart-web may floor the plot cell's height. Without one, a 375 px phone (gx-lollipop, 2026-11-19) shrank the plot to
// ~180 × 90 px under a long title: the column overflowed, the cell kept its ratio, and its width went with its height.

/** How far a pair's higher figure rises when the two figures of a pair would meet: one line of the value register. */
export function pairLiftPx(valuePx, lead) {
  return Math.ceil(valuePx * (lead || 1.2)) + 2;
}

/**
 * @param {{ intervals: number, height: number, headroom: number, valuePx: number, lead: number, headClearPx: number }} o
 *   intervals    the y ticks' intervals (yTicks.length - 1);
 *   height       the plot's viewBox height;
 *   headroom     the share fitY adds above the top tick (the scale's span is top × (1 + headroom));
 *   headClearPx  the head's radius plus the gap a figure keeps above it, in CSS px.
 */
export function lollipopRowFloor({ intervals, height, headroom, valuePx, lead, headClearPx }) {
  if (intervals < 1) return null;
  const pitch = height / (1 + headroom) / intervals;
  // The tallest head's figure, lifted, stands headClear + two lines above that head; the scale keeps
  // headroom / (1 + headroom) of the cell above the top tick, which is at or above the tallest head.
  const line = pairLiftPx(valuePx, lead);
  const cellPx = (headClearPx + 2 * line) * (1 + headroom) / headroom;
  return {
    rows: intervals,
    pitch,
    px: Math.ceil(Math.max(2 * line, (cellPx * pitch) / height)),
    why: `The tallest head's two figures, the second lifted clear of its partner, stand above it inside the plot's headroom; under that pitch they rise out of the plot onto the notes.`,
  };
}
