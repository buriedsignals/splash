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

// A category tick label too long to sit horizontally under its (narrow) band is
// ROTATED so more of it shows than a band-width horizontal truncation would. A
// −θ°, END-anchored rotated label pivots at the tick and reads up-to-the-right, so
// its far (START) end lands DOWN and to the LEFT of the tick: it descends sinθ·width
// into the bottom margin and reaches cosθ·width to the left. Left unbounded, a long
// label's start runs off the left edge (clipped) and its foot collides with the
// source line — the WaterfallChart bug. These helpers bound both, once, for any type
// that rotates category ticks.
export const ROTATED_TICK_ANGLE_DEG = 40;

/**
 * Readability cap: a rotated tick label is truncated (ellipsis at end, readable
 * START kept) to at most this many characters BEFORE the per-tick horizontal budget
 * is applied — so an arbitrarily long label can never demand an unbounded bottom
 * margin, and the reserved margin stays a fixed function of this cap.
 */
export const ROTATED_TICK_MAX_CHARS = 24;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Pixels an END-anchored label rotated by `angleDeg` descends BELOW its tick
 * baseline (= sinθ · label width). Reserve this in the bottom margin so rotated
 * category labels clear the source line. Never negative.
 */
export function rotatedLabelDescentPx(
  labelPx: number,
  angleDeg = ROTATED_TICK_ANGLE_DEG,
): number {
  return Math.sin(toRad(angleDeg)) * Math.max(0, labelPx);
}

/**
 * Largest label pixel width whose far (START) end — when the label is END-anchored
 * and rotated by `angleDeg` at screen x `tickX` — still lands at x ≥ `safeLeft`
 * (cosθ · width ≤ tickX − safeLeft). Bounds a rotated category label so its readable
 * START never runs off the left edge. Never negative.
 */
export function rotatedLabelFitPx(
  tickX: number,
  safeLeft: number,
  angleDeg = ROTATED_TICK_ANGLE_DEG,
): number {
  return Math.max(0, (tickX - safeLeft) / Math.cos(toRad(angleDeg)));
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

// A VERTICAL bar/column carries its category label CENTERED under the bar. The
// widest a centered label can grow before it collides with the neighbouring label
// is the band STEP (centre-to-centre spacing) less a small gutter — NOT the bar
// width. A fixed single-line `truncate(label, bar.w)` clipped any name wider than
// its own (narrow) column to an ellipsis stub on a portrait/9:16 canvas
// ("Apple Mu…", "Amazon M…", "Tencent…", "YouTube…") — render-confirmed on a
// music-streaming ranking. These helpers WRAP a long category label onto ≤2 lines
// (the vertical analogue of the horizontal bar's widened, wrapped left gutter) so a
// name is never truncated to a stub. They are the ONE shared source of the rule so
// every vertical bar-family renderer (bar, grouped, stacked) inherits it at every
// channel; a short label that already fits is returned unchanged (one line), so
// landscape/square layouts are not regressed.
export const VERTICAL_CAT_MAX_LINES = 2;

/**
 * Wrap budget (px) for a centered vertical category label: the band step less a
 * ~one-character gutter on each side, so two adjacent centered labels never touch.
 */
export function verticalCatBudgetPx(
  bandStepPx: number,
  fontSize: number,
): number {
  return Math.max(0, bandStepPx - fontSize);
}

/**
 * Category-label lines for one vertical bar, wrapped to fit the band step over at
 * most `maxLines` lines (never a single clipped/truncated stub while a second line
 * is available). Returns `[text]` unchanged when the label already fits.
 */
export function verticalCatLines(
  text: string,
  bandStepPx: number,
  fontSize: number,
  maxLines = VERTICAL_CAT_MAX_LINES,
): string[] {
  return wrapLabel(
    text,
    verticalCatBudgetPx(bandStepPx, fontSize),
    fontSize,
    maxLines,
  );
}

/**
 * The d3 `scaleBand` centre-to-centre STEP for `n` bands spanning `rangePx` at the
 * shared 0.28 inner+outer padding (matches bar-geometry's `.padding(0.28)`). Lets a
 * renderer reserve bottom-margin for wrapped category lines BEFORE the layout is
 * computed, using the exact step the layout will use.
 */
export function bandStepPx(rangePx: number, n: number, padding = 0.28): number {
  // d3: step = range / (n - paddingInner + 2·paddingOuter); padding() sets both.
  return rangePx / Math.max(1, n - padding + 2 * padding);
}

/**
 * The MOST lines any of `labels` needs when wrapped to the band step — so a
 * vertical bar renderer can reserve (maxLines − 1) extra label rows in its bottom
 * margin. 1 when every label fits on one line (no reserve, layout unchanged).
 */
export function verticalCatMaxLines(
  labels: string[],
  bandStepPx: number,
  fontSize: number,
  maxLines = VERTICAL_CAT_MAX_LINES,
): number {
  let m = 1;
  for (const l of labels) {
    m = Math.max(m, verticalCatLines(l, bandStepPx, fontSize, maxLines).length);
  }
  return m;
}

/**
 * Right/left GUTTER reserve (px) for a strip of direct end-labels (e.g. the
 * stacked-area right-edge "name value" labels), sized to the WIDEST label so
 * none clips. A hardcoded gutter is the recurring failure: it fits the sample's
 * labels, then overflows once the data's are longer — the stacked-area
 * "Renouvelables 280" rendering as "Renouvelables 28". `floorPx` keeps the
 * sample's layout for short labels (only GROW, never shrink existing renders);
 * `gapPx` is the plot-edge→text gap; `bold` inflates the 0.6 char-width estimate
 * for 700-weight labels. Pass UNSCALED font + gap: resolveFrame multiplies the
 * whole basePad (and the label font) by `scale`, so the factor cancels.
 */
export function endLabelGutterPx(
  labels: string[],
  fontSize: number,
  opts: { gapPx: number; floorPx: number; bold?: boolean },
): number {
  const factor = opts.bold ? 1.08 : 1;
  const widest = labels.reduce(
    (m, s) => Math.max(m, textWidth(s, fontSize) * factor),
    0,
  );
  return Math.max(opts.floorPx, Math.ceil(opts.gapPx + widest));
}
