// Splash shared core — text-fitting primitives. The recurring failure across
// types was a label in a fixed gutter/band overflowing or colliding once the
// data's labels got longer than the sample's. `truncate` bounds any label to a
// pixel width with an ellipsis, so a side-gutter or category label can never
// overflow regardless of the data — correct by construction, not tuned per
// sample. Canonical source: chart-native's `core/text.ts` (+ the source-footer
// reserve, originally in `core/format.ts`) — engines re-export from here.

/** Estimated pixel width of `text` at a scaled font size. */
export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

/**
 * Turn a RAW CSV column header into a reader-facing axis label. The recurring
 * failure was a scatter shipping its axis titles as the literal snake_case header
 * (`pib_par_habitant`, `class_size`) because the mapper set `xLabel = xCol`. This
 * de-snakes / de-kebabs / de-camelCases a raw identifier and capitalizes the FIRST
 * letter only — deterministic, NO translation (so `esperance_vie` → "Esperance vie",
 * never an invented "de").
 *
 * Only fires when the string LOOKS like a raw identifier (no whitespace AND a `_`,
 * `-`, or a camelCase hump). An already-human label (any label carrying a space) or a
 * plain single token / acronym ("unemployment", "GDP") is returned UNCHANGED — a
 * suggester/journalist-provided label is never mangled, an acronym is never force-cased.
 */
export function humanizeColumn(col: string): string {
  const s = col.trim();
  const hasSpace = /\s/.test(s);
  const hasSeparator = /[_-]/.test(s);
  const hasCamelHump = /[a-z][A-Z]/.test(s);
  // already human (has a space) or a bare single token (no separator/hump) → leave it
  if (hasSpace || (!hasSeparator && !hasCamelHump)) return col;
  const spaced = s
    .replace(/[_-]+/g, " ") // snake_case / kebab-case → words
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase hump → words
    .replace(/\s+/g, " ")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * A raw CSV column → a DISPLAY label for a SERIES name / direct label / legend chip: humanize the
 * identifier (snake_case/camelCase → words) AND ensure a leading capital. Unlike `humanizeColumn`
 * (which preserves a bare lowercase token like "unemployment" for axis-label flexibility), a column
 * used as a SERIES/LEGEND label reads better title-cased ("shops" → "Shops"), so this always
 * capitalises the first letter. Idempotent on an already-human label ("Charbon" → "Charbon").
 */
export function seriesLabelFromColumn(col: string): string {
  const h = humanizeColumn(col);
  return h.length ? h.charAt(0).toUpperCase() + h.slice(1) : h;
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

/**
 * LEFT GUTTER reserve (UNSCALED px) for a strip of END-anchored "name value" side
 * labels — the slope chart's left category labels. It is `endLabelGutterPx` (widest
 * label + gap, floored) with a CAP folded in, because the failure this closes is
 * different from a right-edge value label: a fixed `basePad.left:138` clipped a long
 * category name ("Professions intermédiaires 22" ≈ 242px) off the frame's LEFT edge,
 * and the pipeline's fallback was to SHORTEN the data field ("Interm.") to fit —
 * mutilating the data to fit the layout. Sizing the gutter to the WIDEST actual label
 * makes the FULL name render, so the overflow guard never fires and the data is never
 * touched.
 *
 * - `floorPx` keeps short-label charts at their existing layout (only GROW, never
 *   shrink an existing render — the sample's 138).
 * - the gutter is CAPPED at `capFrac` (default ~42%) of the canvas so a pathological
 *   name can't starve the plot; the renderer WRAPS any over-cap label onto ≤2 lines
 *   (wrapLabel) rather than truncating — the name is never lost.
 * - `bold` inflates the 0.6 char-width estimate by 8% (the highlighted line's label is
 *   700-weight), so even a bold widest label fits the reserved gutter.
 *
 * Pass UNSCALED font/gap + the render `scale`: the cap is divided by `scale` so that
 * once resolveFrame multiplies the whole basePad by `scale` the actual pad lands at
 * `capFrac·width` (the factor on the label-driven part cancels the same way).
 */
export function leftLabelGutterPx(
  labels: string[],
  fontSize: number,
  opts: {
    gapPx: number;
    floorPx: number;
    width: number;
    scale: number;
    bold?: boolean;
    capFrac?: number;
  },
): number {
  const capFrac = opts.capFrac ?? 0.42;
  const raw = endLabelGutterPx(labels, fontSize, {
    gapPx: opts.gapPx,
    floorPx: opts.floorPx,
    bold: opts.bold,
  });
  const cap = Math.max(opts.floorPx, (opts.width * capFrac) / opts.scale);
  return Math.min(raw, cap);
}

// Fix E gave the slope a label-driven left gutter + a ≤2-line wrap of the "name value"
// label. On a genuinely EXTREME category name (≈50+ chars) two failures remained that a
// wider gutter alone cannot solve, because the gutter is CAPPED (~42%) so the plot is not
// starved: (1) once the label wraps to 2 lines the block is ~2×lineHeight tall, and the
// fixed 16px de-collision gap (sized for a single line) let adjacent rows' blocks OVERLAP
// — dark ink over dark ink, the "black-on-black" collision; (2) at a narrow canvas even 2
// lines can't hold "name value" at the gutter budget, so the wrap TRUNCATES the trailing
// data with an ellipsis. Both are closed by SHRINKING the label font just enough that the
// wrapped block fits its vertical slot AND the full string fits without truncation — a
// bounded degradation (floored), never a cut of the data. These helpers own that rule so
// every end-anchored side-label strip (slope's left "name value", dumbbell's category
// gutter) inherits it identically.
export const SIDE_LABEL_LINE_HEIGHT = 1.15;

/**
 * How many lines `text` wraps to at `maxPx`/`fontSize`, greedily on spaces, with NO
 * maximum (never truncates). 1 when it already fits or is a single unbreakable token.
 * Lets a caller (a) pass wrapLabel enough `maxLines` that the data is never cut and
 * (b) size the vertical de-collision gap to the tallest wrapped block.
 */
export function wrapLineCount(
  text: string,
  maxPx: number,
  fontSize: number,
): number {
  if (maxPx <= 0 || textWidth(text, fontSize) <= maxPx) return 1;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return 1; // an unbreakable token stays one (over-long) line
  let lines = 1;
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cur === "" || textWidth(cand, fontSize) <= maxPx) cur = cand;
    else {
      lines++;
      cur = w;
    }
  }
  return lines;
}

export interface SideLabelFit {
  /** chosen render font (≤ startFont, ≥ the floor) */
  font: number;
  /** font · SIDE_LABEL_LINE_HEIGHT */
  lineHeight: number;
  /** lines to pass to wrapLabel so the WIDEST label never truncates at `font` */
  maxLines: number;
  /** vertical centre-to-centre gap so two adjacent wrapped blocks never overlap */
  minGap: number;
}

/**
 * Pick the LARGEST label font (≤ `startFont`) at which every end-anchored side label
 * wraps within `budgetPx` over a block short enough to fit its vertical `slotPx`
 * (the per-label vertical space: a slope's innerHeight/n, a dumbbell's band step),
 * then report the wrap `maxLines` (so the data never truncates) and the `minGap`
 * (so wrapped blocks never collide). Shrinking the font helps BOTH axes at once — more
 * chars per line → fewer lines → a shorter block — so it is the single lever that
 * resolves the long-label overlap and the long-label truncation together. Floored at
 * `minFont` (default 50% of the start font, i.e. a bounded degradation, never a cut).
 *
 * All px are already SCALED (budget/slot/font are post-resolveFrame). `widthFactor`
 * inflates the width estimate for a heavier weight (the slope's highlighted 700-weight
 * row is ~8% wider) so a bold label still fits the reported `maxLines`.
 */
export function fitSideLabels(
  labels: string[],
  budgetPx: number,
  slotPx: number,
  startFont: number,
  opts: { minFont?: number; lineGapPx?: number; widthFactor?: number } = {},
): SideLabelFit {
  const widthFactor = opts.widthFactor ?? 1;
  // Floor at half the start font: on a genuinely cramped canvas (a 16:9 article-web
  // static holds 8 long-named rows in ~150px of plot height) a bounded shrink to ~50%
  // is what lets every 2-line block fit its slot WITHOUT truncating the data — and the
  // static PNG renders at 2× device scale, so ~7px CSS lands as ~14px, still legible.
  // Short-label charts never reach the floor: a 1-line block fits at the full start font,
  // so the search below returns startFont immediately.
  const minFont = Math.min(startFont, opts.minFont ?? startFont * 0.5);
  const lineGap = opts.lineGapPx ?? startFont * 0.25;
  const worstLinesAt = (f: number) =>
    labels.reduce(
      (m, s) => Math.max(m, wrapLineCount(s, budgetPx, f * widthFactor)),
      1,
    );
  let font = minFont;
  for (let f = startFont; f >= minFont - 1e-6; f -= 0.5) {
    const block = worstLinesAt(f) * f * SIDE_LABEL_LINE_HEIGHT;
    if (block + lineGap <= slotPx) {
      font = f;
      break;
    }
    font = Math.max(minFont, f - 0.5); // none fit yet → keep the smallest tried
  }
  const maxLines = worstLinesAt(font);
  const lineHeight = font * SIDE_LABEL_LINE_HEIGHT;
  return {
    font,
    lineHeight,
    maxLines,
    minGap: maxLines * lineHeight + lineGap,
  };
}

// Source-footer band reserve (static / video only).
//
// In a fixed (non-responsive) frame the chart's header/frame component overlays the
// cited source as an absolute band pinned to the BOTTOM of the canvas (one line of the
// source-caption font). A chart's basePad.bottom holds only its OWN x-axis furniture
// (ticks + axis title / legend) — it has no knowledge of that footer — so the x-axis
// TITLE, placed near the bottom of the plot, can land in the very same band as the
// source and OVERPRINT it (Bug M: "...articl" + "Taille des classes"). Reserve the
// footer band here, in the one shared resolver, so EVERY chart's bottom furniture
// floats above it.
//
// The value is UNSCALED px; a caller's frame-resolver multiplies the whole basePad by
// `scale`, so the reserve tracks the canvas (a portrait video's larger source font/inset
// get a proportionally taller band). `sourceFontPx` is the UNSCALED source-caption font
// size (an engine-local design token, e.g. chart-native's `TYPE.source`) — passed in
// rather than baked in, so this primitive stays engine-agnostic like the gutter helpers
// above.
const SOURCE_FOOTER_BOTTOM_INSET = 12; // matches the static frame's bottom:12*scale inset
const SOURCE_FOOTER_LINE_HEIGHT = 1.2; // one line of source-caption text
const SOURCE_FOOTER_CLEARANCE = 8; // min visible gap: axis-title bottom → source box top

/**
 * The vertical space (UNSCALED px) a static/video frame's source footer must own at
 * the bottom of the frame, including a clearance gap above it, given the UNSCALED
 * source-caption font size `sourceFontPx`. Added to basePad.bottom by the caller's
 * frame resolver (static/video only); the resolver then applies `scale`.
 */
export function sourceFooterReserve(sourceFontPx: number): number {
  return (
    SOURCE_FOOTER_BOTTOM_INSET +
    sourceFontPx * SOURCE_FOOTER_LINE_HEIGHT +
    SOURCE_FOOTER_CLEARANCE
  );
}
