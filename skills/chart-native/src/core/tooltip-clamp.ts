// core/tooltip-clamp — the pure geometry behind keeping an interactive tooltip
// inside its chart. Every *Chart.tsx positions its `.tooltip` div to the RIGHT of
// (and above) the hovered mark with `whiteSpace: nowrap` and no bounds check, so a
// mark near the right/top edge pushes the tooltip off-screen and its text is clipped
// (reported on a scatter's rightmost point and a bar's top bar). ChartFrame measures
// the rendered tooltip and calls this once to compute the corrective translation.
// Pure + framework-free so the in-viewport property is unit-testable.

export interface TipRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ContainerSize {
  width: number;
  height: number;
}

/**
 * The {dx, dy} translation that keeps `tip` inside [margin, size - margin] on both
 * axes. Right/bottom overflow flips the box back inward; left/top overflow pushes it
 * to the margin. When the tooltip is larger than the available room the top-left edge
 * wins (pinned at margin) so the anchor and the start of the text stay visible.
 */
export function clampOffset(
  tip: TipRect,
  container: ContainerSize,
  margin = 8,
): { dx: number; dy: number } {
  let dx = 0;
  const overRight = tip.left + tip.width - (container.width - margin);
  if (overRight > 0) dx = -overRight;
  if (tip.left + dx < margin) dx = margin - tip.left;

  let dy = 0;
  const overBottom = tip.top + tip.height - (container.height - margin);
  if (overBottom > 0) dy = -overBottom;
  if (tip.top + dy < margin) dy = margin - tip.top;

  return { dx, dy };
}
