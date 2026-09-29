// twin/skills/chart-web/assets/keyed-note.ts
//
// AN ANNOTATION THAT CANNOT CLEAR ITS MARKS LEAVES THE PLOT, KEYED — IT IS NEVER SHRUNK, NEVER
// PRINTED OVER THE EVIDENCE, AND NEVER DROPPED.
//
// The rule, and the three doctrine sentences it is made of:
//
//   1. WHERE IT FITS, IT STAYS DIRECT. `visual-system.md`: a direct annotation "is preferred over a
//      detached legend in every case where it is spatially possible". Nothing here moves a note that
//      clears its marks at the width it is drawn at.
//   2. WHERE IT DOES NOT, DETACHING IS THE DOCUMENTED FALLBACK, AND IT CARRIES A CONNECTOR. The same
//      file: a legend "is acceptable only when direct labelling would collide … and even then, it is
//      a last resort documented as one". `information-architecture.md`: "If two elements must be far
//      apart for layout reasons, an explicit connector (a leader line, a matched colour) does the
//      pairing job that proximity would otherwise have done for free." A leader from under the plot
//      would cross every mark between the note and its subject, so the connector is a KEY — the same
//      token printed at both ends: the words the plate already prints at the mark (a row's name, an
//      accented axis label), set in that label's own ink, or, where the plate prints nothing there,
//      a numeral this file draws beside the mark.
//   3. A NARROW WINDOW IS NOT A REASON TO STOP MAKING IT. `web-discipline.md`, on width queries: "an
//      annotation … IS the argument or its provenance, and a narrow window is not a reason to stop
//      making it." So the note is MOVED by one rule and never removed: the rule that hides the plot's
//      copy is the rule that shows the one under the plot, generated together, so the two can never
//      both be drawn or both be missing — and `verify-web.mjs` measures exactly that at every width.
//
// WHERE THE LINE FALLS IS MEASURED, NOT CHOSEN. `web-discipline.md`: "The de-collision arithmetic
// still runs ONCE, in node, from the measured strings — but it computes, per candidate, the width
// below which that candidate has no room … One `@container` rule per threshold then hides it exactly
// there and nowhere else." `leavesBelow` is that arithmetic's loop; the beat supplies the one thing
// only it knows — whether its note, at its measured size, clears its own marks and words in a plot
// that wide — and gets back the width to key it at. A threshold typed as a breakpoint ("phones")
// would be the fixed-gutter anti-pattern wearing a media query.
//
// WHAT THE CONTAINER IS. The overlay's copy asks `.chart-plot` (the format's size container); the
// copy under the plot asks the figure, which this file makes an inline-size container. The plot is
// the figure's full-width flex item, so both are asked the same number. What that number CANNOT see
// is height: in a window short enough to make the cell height-bound (a phone on its side), the cell
// is narrower than its width predicts and a note kept in the plot may still touch its marks. Keying
// on height as well would need the copy under the plot to ask a container it is not inside. Named
// here rather than papered over; `web-annotation-clears-its-marks.test.ts` drives the four windows
// the corpus is verified at.
//
// WHAT IT COSTS. The keyed note is a word, and "words are never squeezed to make a chart fit; the
// chart is" (`render-web.mjs`): its line comes out of the plot's height when the window is full.
// Where the plot is already at its floor there is no height left to give, and `verify-web.mjs`'s own
// fit check is what says so. A beat adopts this only if none of its directions gains a window
// overflow it did not already have; a direction that already overflowed grows by the keyed line, and
// that is reported rather than hidden (`web-discipline.md`, "Where no position in the plot clears").

/** One note that may leave its plot. */
export type KeyedNote = {
  /** A slug, unique on the page — the value of every `data-keyed-note-plot*` attribute. */
  id: string;
  /** The connector printed at both ends. */
  key: string;
  /** `true`: `key` is words the plate ALREADY prints at the mark, and the beat tags that element
   *  `data-keyed-note-handle="<id>"` — or a shape the plate draws exactly once there (a ring), and
   *  then both that shape and the lead under the plot carry `data-keyed-note-glyph="<key>"`.
   *  `false`: `key` is a numeral, and the beat draws it beside the mark as
   *  `<span class="note note-key" data-keyed-note-key="<id>">`. */
  printed: boolean;
  /** The plot width, in CSS px, below which this note cannot clear its marks. From `leavesBelow`. */
  below: number;
};

/** Every width the format is read at, and past it. `web-frame-is-fluid.test.ts` reads 3440. */
const WIDEST_PX = 3440;
/** Below this no plot in the corpus is drawn: 375 − 2 × 24 px of frame padding is 327. */
const NARROWEST_PX = 240;

/**
 * THE WIDTH BELOW WHICH A NOTE LEAVES ITS PLOT.
 *
 * `clears(plotWidthPx)` is the beat's own geometry: does the note, at its MEASURED size, clear every
 * mark and every word it could land on in a plot that wide? Scanned one pixel at a time from the
 * widest width down, so the answer is exact for any predicate, monotone or not: the note stays in the
 * plot only across the unbroken run of widths from `WIDEST_PX` down to where it first fails.
 *
 * Returns `0` when the note clears at every width — it never leaves, and no rule is emitted.
 * Throws when it clears at NO width: that note is misplaced, not crowded, and keying it at every
 * width would be a legend by default — `anti-patterns.md`'s "detached legends where a direct label
 * would do".
 */
export function leavesBelow(
  clears: (plotWidthPx: number) => boolean,
  { where = "a keyed note" }: { where?: string } = {},
): number {
  if (!clears(WIDEST_PX))
    throw new Error(
      `${where} does not clear its marks even at ${WIDEST_PX}px — it is misplaced, not crowded. ` +
        `Move it; a note keyed at every width is a detached legend by default.`,
    );
  for (let w = WIDEST_PX - 1; w >= NARROWEST_PX; w--) if (!clears(w)) return w + 1;
  return 0;
}

/** A web register as `webRegister` returns it — the only fields a box needs. */
export type WebRegisterStyle = {
  fontFamily: unknown;
  fontSize: unknown;
  fontWeight?: unknown;
  fontStyle?: unknown;
  lineHeight?: unknown;
  letterSpacing?: unknown;
  textTransform?: unknown;
};
/** `render-web.mjs`'s `measure` — `measureText`, resvg on the face the page embeds. */
export type Measure = (
  text: string,
  options: { fontSize: number; fontWeight?: number | string; fontFamily?: string; fontStyle?: string },
) => number;

/** `measure` is resvg's INK box on the embedded face, not the browser's advance width: it drops the
 *  last glyph's right side-bearing. Measured against Chrome on the boxplot's peak note, set whole:
 *  1,6 px short on `creme` and `rapport`, 1,5 px long on `nocturne`. Two pixels covers both, on the
 *  side of calling a collision rather than missing one. Measure a LINE whole, never word by word —
 *  every word loses its own bearing, and a sum of words ran 3,7 px short. */
const BEARING_PX = 2;

/**
 * THE BOX A ONE-LINE LABEL DRAWS, IN CSS PIXELS — what the reader's browser will lay out, not a
 * character count. Width is the measured string after the register's own case transform, plus its
 * tracking per character, plus the bearing the ink box leaves out, plus the ground chip
 * `.note`/`.end-label` carry (`padding: 1px 4px` in `render-web.mjs`, so 8 across and 2 down).
 * Height is the register's own line box plus that chip. Pass `chip: false` for a label drawn
 * without one.
 */
export function labelBoxPx(
  text: string,
  reg: WebRegisterStyle,
  measure: Measure,
  { chip = true }: { chip?: boolean } = {},
): { w: number; h: number } {
  const fontSize = Number.parseFloat(String(reg.fontSize));
  const shown = reg.textTransform === "uppercase" ? text.toLocaleUpperCase("fr-FR") : text;
  const family = String(reg.fontFamily).split(",")[0].replace(/["']/g, "").trim();
  const tracking = Number.parseFloat(String(reg.letterSpacing ?? 0)) || 0;
  const w =
    measure(shown, {
      fontSize,
      fontWeight: reg.fontWeight as number | string | undefined,
      fontFamily: family,
      fontStyle: (reg.fontStyle as string | undefined) ?? "normal",
    }) +
    tracking * [...shown].length +
    BEARING_PX +
    (chip ? 8 : 0);
  const lineHeight = Number(reg.lineHeight);
  const h = fontSize * (Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 1.2) + (chip ? 2 : 0);
  return { w, h };
}

/** `render-web.mjs`'s `PLOT_FLOOR_PX`: the plot box never measures less, so below the width where
 *  its aspect-ratio would, the floor is what sets its height. `keyed-note.test.ts` holds the two
 *  equal. */
export const PLOT_FLOOR_PX = 120;

/**
 * THE CELL A PLOT THIS WIDE DRAWS, as `render-web.mjs`'s `--cell-w` computes it — the smaller of
 * the track the gutters leave and the width the box's own height allows once the x-axis row is taken
 * out of it. `box` is what the beat writes into the plot's `aspect-ratio` (`box.width / box.height`,
 * gutter and axis row included as the beat wrote them); `frame` is its `viewBox`.
 *
 * WHY NOT JUST `plotWidth - gutter`: the gutter and the axis row are PIXELS inside a box whose ratio
 * was written in units, so on most beats the cell is HEIGHT-bound below some width even in a window
 * that clamps nothing — measured on the boxplot at 375 px, a 253 px cell in a 293 px track, which
 * put its threshold 30 px too low; on the streamgraph, 287 px in 327.
 *
 * What it cannot know is a WINDOW that clamps the plot further (a page taller than its window):
 * there the cell is smaller still. That is the gap `keyed-note.ts`'s header names.
 */
export function cellWidthPx(
  plotWidthPx: number,
  {
    frame,
    box,
    gutterPx = 0,
    axisPx = 0,
    floorCellPx = 0,
  }: {
    frame: { width: number; height: number };
    box: { width: number; height: number };
    gutterPx?: number;
    axisPx?: number;
    /** A declared row floor's cell height (`rowFloorCellPx`), or 0 for a beat that declares none. */
    floorCellPx?: number;
  },
): number {
  const plotHeightPx = Math.max(PLOT_FLOOR_PX, (plotWidthPx * box.height) / box.width, floorCellPx + axisPx);
  return Math.min(plotWidthPx - gutterPx, ((plotHeightPx - axisPx) * frame.width) / frame.height);
}

/**
 * THE CELL'S HEIGHT A PLOT THIS WIDE DRAWS, as `render-web.mjs`'s `--cell-h` computes it — the
 * vertical twin of `cellWidthPx`, and the one a row beat needs: its question is how far apart its
 * rows are, and under a declared row floor (`render-web.mjs`, `rowFloorCss`) the cell is TALLER
 * than its width predicts. Same arguments, same limit: no window clamp.
 */
export function cellHeightPx(
  plotWidthPx: number,
  {
    frame,
    box,
    gutterPx = 0,
    axisPx = 0,
    floorCellPx = 0,
  }: {
    frame: { width: number; height: number };
    box: { width: number; height: number };
    gutterPx?: number;
    axisPx?: number;
    floorCellPx?: number;
  },
): number {
  const plotHeightPx = Math.max(PLOT_FLOOR_PX, (plotWidthPx * box.height) / box.width, floorCellPx + axisPx);
  const trackH = plotHeightPx - axisPx;
  return Math.min(trackH, Math.max(((plotWidthPx - gutterPx) * frame.height) / frame.width, floorCellPx));
}

/** A declared row floor's cell height in CSS pixels — `px × viewBoxHeight / pitch`, rounded UP to
 *  the hundredth, exactly as `render-web.mjs`'s `rowFloorCellPx` writes it into the page.
 *  `keyed-note.test.ts` holds the two equal. */
export function rowFloorCellPx({ px, pitch }: { px: number; pitch: number }, viewBoxHeight: number): number {
  return Math.ceil(((px * viewBoxHeight) / pitch) * 100) / 100;
}

/** A rectangle in CSS pixels, in the cell's own coordinates. */
export type Rect = { l: number; t: number; r: number; b: number };
/** Two rectangles share area — touching edges do not, which is how the guard reads a collision. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * REFUSED BEFORE A RULE IS WRITTEN. Each refusal is a page that would lie about a note:
 *   - a duplicate id pairs one note's key with another note's sentence;
 *   - an empty key is a note under the plot with nothing tying it to its mark;
 *   - numerals out of order are a key a reader cannot follow;
 *   - a threshold that is not a width is a rule that never fires, or always does.
 */
export function assertKeyedNotes(notes: KeyedNote[], { where = "this beat" }: { where?: string } = {}) {
  const seen = new Set<string>();
  let numeral = 0;
  for (const note of notes) {
    if (!SLUG.test(note.id)) throw new Error(`${where}: keyed note id ${JSON.stringify(note.id)} is not a slug`);
    if (seen.has(note.id)) throw new Error(`${where}: two keyed notes share the id ${JSON.stringify(note.id)}`);
    seen.add(note.id);
    if (!note.key.trim())
      throw new Error(`${where}: keyed note ${note.id} has no key — nothing ties the sentence under the plot to its mark`);
    if (!note.printed) {
      numeral += 1;
      if (note.key !== String(numeral))
        throw new Error(
          `${where}: keyed note ${note.id} is numbered ${JSON.stringify(note.key)}; the numerals run 1, 2, 3 in the order the notes are listed, and this one is ${numeral}`,
        );
    }
    if (!Number.isFinite(note.below) || note.below < 0 || note.below > WIDEST_PX)
      throw new Error(`${where}: keyed note ${note.id} leaves below ${note.below}px, which is not a plot width`);
  }
}

/**
 * THE STYLESHEET: one `@container` block per note that ever leaves, each moving BOTH copies.
 *
 * `scope` is the figure's own selector. The copies are found by attribute, never by class, so a
 * beat's note keeps whatever classes and inline style its placement needs.
 *
 * ONE LIMIT, MEASURED ON THE CONNECTED SCATTER: the hide rule weighs (0,4,0), and a vocabulary that
 * REVEALS a word per option through `:has(#…:checked)` (`aim.ts`, `qualify.ts`) weighs (1,3,0) and
 * wins. A note owned by such a control needs the beat's own per-option rule inside the same query,
 * at that weight — this sheet cannot know the option ids. `verify-web.mjs` reads the landing state.
 */
export function keyedNoteCss(notes: KeyedNote[], { scope }: { scope: string }): string {
  assertKeyedNotes(notes);
  const out = [
    // The figure is asked the width the plot is asked. `.chart-plot` is its full-width flex item.
    `${scope} { container-type: inline-size; }`,
    // A word, so it keeps its height: the format's own "words are never squeezed" rule. The list
    // itself takes NO room until a note has left the plot — its margin is written inside the same
    // query that reveals a line — so at a width where nothing leaves, the page is the page it was,
    // to the pixel.
    //
    // RUN IN, NOT STACKED. The notes that leave do so on the narrowest pages, which are also the
    // ones with the least height to spend, so they share lines like footnotes in a paragraph rather
    // than taking one line each: four short notes cost two lines at 375 px instead of four. Each
    // keeps its own key in front of it, which is what separates them.
    // The list's own strut is zeroed so a run-in line is exactly as tall as the notes' register
    // makes it — the body's larger strut measured 4 px of extra height at 375 px, on a page that
    // had none to spare. The 1.35 is a fallback only: a beat sets each note in its own register.
    `${scope} .chart-notes { list-style: none; margin: 0; padding: 0; flex: 0 0 auto; line-height: 0; }`,
    `${scope} .chart-notes > li { display: none; margin: 0 1em 0 0; line-height: 1.35; }`,
    // THE NUMERAL, drawn the same at both ends, so the pairing is a shape as well as a figure.
    `${scope} .note-key { display: inline-block; min-width: 1.45em; padding: 0 0.3em; border: 1px solid currentColor; ` +
      `border-radius: 999px; text-align: center; font-weight: 700; font-style: normal; line-height: 1.3; }`,
    `${scope} .chart-notes .note-key { margin-right: 0.45em; }`,
    `${scope} .chart-plot .overlay [data-keyed-note-key] { display: none; }`,
  ];
  for (const note of notes) {
    if (!note.below) continue;
    out.push(
      `@container (width < ${note.below}px) {`,
      `  ${scope} .chart-plot .overlay [data-keyed-note-plot="${note.id}"] { display: none; }`,
      `  ${scope} .chart-plot .overlay [data-keyed-note-key="${note.id}"] { display: inline-block; }`,
      // 4 px, not more: the x-axis row above already carries the air under its own labels.
      `  ${scope} .chart-notes { margin-top: 4px; }`,
      `  ${scope} .chart-notes > [data-keyed-note-under="${note.id}"] { display: inline; }`,
      `}`,
    );
  }
  return out.join("\n");
}
