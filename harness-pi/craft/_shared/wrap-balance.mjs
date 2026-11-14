/**
 * A last line under a quarter of the column takes words down from the line above while both still fit, in place.
 * The line count never changes and no line grows past maxWidth, so a layout measured on the greedy wrap still holds.
 * gx-dot-strip, Qwen3.5-9B, 2026-11-14: "…le plafond de" / "2", the claim's own figure alone on a line.
 */
export function balanceLast(lines, maxWidth, measure) {
  while (lines.length > 1 && measure(lines.at(-1)) < maxWidth / 4) {
    const above = lines.at(-2).split(" ");
    if (above.length < 2) break;
    const moved = `${above.at(-1)} ${lines.at(-1)}`;
    if (measure(moved) > maxWidth) break;
    lines.splice(-2, 2, above.slice(0, -1).join(" "), moved);
  }
  return lines;
}
