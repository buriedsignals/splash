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

/**
 * Wrap `text` into at most `maxLines` lines, each fitting `maxPx` at `fontSize`,
 * breaking on spaces (greedy). Returns `[text]` when it already fits on one line —
 * so a short label is unchanged. The LAST allowed line holds all remaining words and
 * is truncated with an ellipsis only if they still overflow (so a very long label
 * degrades to "line 1 / trimmed line 2" instead of a single clipped line). Used for a
 * horizontal bar's category labels: widen the gutter to fit the longest label on one
 * line, and wrap the rare label that exceeds even the capped gutter.
 */
export function wrapLabel(
  text: string,
  maxPx: number,
  fontSize: number,
  maxLines = 2,
): string[] {
  if (maxPx <= 0 || textWidth(text, fontSize) <= maxPx) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [truncate(text, maxPx, fontSize)];
  const lines: string[] = [];
  let cur = "";
  for (let i = 0; i < words.length; i++) {
    const cand = cur ? `${cur} ${words[i]}` : words[i];
    if (cur === "" || textWidth(cand, fontSize) <= maxPx) {
      cur = cand;
    } else {
      lines.push(cur);
      cur = words[i];
      if (lines.length === maxLines - 1) {
        // last allowed line: this word + everything after, trimmed if it overflows
        const rest = [cur, ...words.slice(i + 1)].join(" ");
        lines.push(truncate(rest, maxPx, fontSize));
        return lines;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
