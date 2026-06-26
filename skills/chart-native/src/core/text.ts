// core/text — shared text-fitting helpers. The recurring failure across types
// was a label in a fixed gutter/band overflowing or colliding once the data's
// labels got longer than the sample's. `truncate` bounds any label to a pixel
// width with an ellipsis, so a side-gutter or category label can never overflow
// regardless of the data — correct by construction, not tuned per sample.

/** Estimated pixel width of `text` at a scaled font size. */
export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

/**
 * Truncate `text` (with a trailing ellipsis) so it fits within `maxPx` at the
 * given scaled `fontSize`. Returns the original when it already fits. Always
 * leaves at least one character.
 */
export function truncate(
  text: string,
  maxPx: number,
  fontSize: number,
): string {
  if (maxPx <= 0) return text;
  const charW = fontSize * 0.6;
  if (text.length * charW <= maxPx) return text;
  const chars = Math.max(1, Math.floor(maxPx / charW) - 1);
  if (chars >= text.length) return text;
  return text.slice(0, chars).trimEnd() + "…";
}
