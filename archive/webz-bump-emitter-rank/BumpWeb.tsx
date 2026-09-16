/**
 * The WEB beat of "India has risen from eighth to third among the world's biggest CO₂ emitters" —
 * the interactive format, the fluid frame.
 *
 * WHAT THIS FORMAT ADDS TO THIS TYPE, and it is the type's own reason to exist.
 * `references/types/bump.md`: past a handful of entities "the tangle of crossing lines stops being
 * readable as individual trajectories". A still frame answers that by labelling both ends of every
 * line and captioning the crossings it is about; it cannot answer "which grey line is that one, all
 * the way across". A video answers it by drawing them. **This format answers it by letting the
 * reader do it**: point at any line, anywhere, and that line comes forward while the others recede,
 * and the tooltip names its country, the year under the pointer and its rank that year. Following
 * one line through a crossing IS the type, and here the reader performs it.
 *
 * NOTHING ARGUMENT-BEARING IS BEHIND THE INTERACTION (`web-discipline.md`, "What must not become
 * interactive"). Before a pointer moves, the frame already carries: the title, the caveat, the
 * source, all six lines, every line's own name at its final rank, and all three crossings — ringed
 * AND captioned with who was passed and when. Tracing adds the per-year rank a still frame has no
 * room to print, never the claim.
 *
 * AND THE ACCENT NEVER DIMS. Tracing recedes the other lines to make one legible; the subject's own
 * line and its crossing marks stay at full strength in every state, because the accent is reserved
 * for the subject and an interaction that could hide the argument would be the defect this format's
 * own doctrine names. Written as CSS in `render-web.mjs`'s appended rules, not as a script branch.
 *
 * GEOMETRY-ONLY SVG. Not one `<text>` element lives inside the `<svg>`: the rank column, the year
 * ticks, the country names and the crossing captions are all HTML positioned in `%` over the same
 * grid cell, at a FIXED pixel size, so the geometry stretches to any container width and the type
 * does not (`web-discipline.md`, "Responsive behaviour").
 *
 * AND THE CIRCLES ARE HTML TOO. `preserveAspectRatio="none"` is a NON-UNIFORM scale, so an SVG
 * `<circle>` becomes an ellipse by exactly the container's own width-to-height ratio — measured
 * across this format's verified widths, a crossing ring drawn in the `<svg>` would read as a flat
 * lozenge at 1600px and a tall one at 375px. `web-discipline.md`'s own remedy is used here:
 * "anything whose shape must survive belongs in the HTML layer". The rings and terminal dots are
 * fixed-size HTML spans in the overlay, positioned in `%` over the same box. The only circles left
 * in the `<svg>` are the invisible per-reading hit targets, whose shape says nothing to anyone.
 *
 * `deriveFurniture`/`measureText` are not called here — `renderWeb` derives them once in node and
 * threads them in as props (`ink`/`muted`/`grid`/`measure`).
 */

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type Track = {
  country: string;
  /** One rank per year, same order and length as `years`. Rank 1 is the largest emitter. */
  ranks: number[];
};

export type Crossing = {
  /** The country the subject passed. */
  country: string;
  /** The first year the subject ranked above it and stayed there. */
  year: number;
  /** Whether that country is one of the lines this chart draws. */
  drawn: boolean;
};

/** This format's single fluid frame, in this beat's own shape. Declared here rather than imported
 *  from the skill's seed for the reason that file's own doc-comment gives: a compile-time-only type
 *  has no `#shared/*` vendoring path, and a relative import across the skill boundary hard-codes
 *  this dev repository's own directory layout. Duplicate, do not link. */
export type BumpFrame = {
  /** The plot rectangle's canonical width/height in SVG user units — NOT a rendered pixel size and
   *  NOT a cap. It fixes the geometry's internal proportions, which become one `aspect-ratio`; the
   *  browser stretches it from there. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot, for the year labels — a margin, not part of the viewBox. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  name: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  /** One rank row's own label line height, and the air below it: together they derive the plot's
   *  `min-height`, so ten rank labels never collide however narrow the container gets. */
  rowLeadPx: number;
  rowAirPx: number;
  /** How many years apart the printed year ticks are asked to be. `tickStep`-free on purpose: this
   *  axis is ORDINAL (one column per period), so there is no continuous span to nice. */
  yearTickEvery: number;
  /** Air between a terminal dot and the name beside it. */
  gap: number;
};

export const FRAME: BumpFrame = {
  width: 760,
  height: 340,
  xAxisRowPx: 26,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  name: { fontSize: 13, fontWeight: 600 },
  note: { fontSize: 12 },
  rowLeadPx: 18,
  rowAirPx: 8,
  yearTickEvery: 5,
  gap: 10,
};

/**
 * The inset the drawn range keeps from the `viewBox`'s own edge, in SVG user units.
 *
 * WHY IT EXISTS. An SVG clips to its `viewBox`. Without an inset, the first and last COLUMN's
 * readings — and, on this type uniquely, the rank-1 and rank-10 ROWS, because a bump chart puts
 * readings on the top and bottom edges by construction — lose part of their keyboard focus ring
 * against the frame edge. Found by tabbing to the last reading and looking at the frame: the ring
 * rendered as a bracket, cut down its right side. The seed carries the x half of this rule
 * (`POINT_INSET`) and records the y half as an open gap; both are closed here.
 *
 * WHY THE TWO AXES DIFFER, and why neither is 6. The ring is a FIXED 2px of CSS, the mark is r=5 in
 * STRETCHED user units, so the inset each axis needs is `5 + 2 / scale` at the SMALLEST scale that
 * axis ever takes. Measured across the seven viewports this format verifies at: the horizontal scale
 * bottoms out at 375px wide (a 210px plot over a 760-unit box, 0.276), which asks for 5 + 7.2 =
 * 12.2; the vertical scale bottoms out at the same viewport (a 339px plot over a 340-unit box,
 * 0.997), which asks for 5 + 2.0 = 7.0. The values below carry a margin over each. A single
 * constant for both would either clip vertically or spend 6% of the height on nothing.
 *
 * `overflow: visible` is NOT the alternative, and this was measured rather than assumed: it clears
 * the ring and costs the window fit — 767px of vertical overflow at 3440 x 900, because a visible
 * overflow on the stretched `<svg>` re-enters the document's own height and defeats the flex clamp
 * `web-discipline.md`'s "The beat fits the visible window" depends on.
 *
 * Nothing else needs adjusting for it: every gridline, tick, dot, name and caption in this file is
 * positioned through `yOfRank`/`xOfIndex`.
 */
const MARK_INSET_X = 18;
const MARK_INSET_Y = 10;

/**
 * Data to coordinates, and nothing else — no colour, no font, no label. The plot rectangle IS
 * `[0, width] × [0, height]`, inset by `MARK_INSET` on both axes; the rank column, the name column
 * and the year row are CSS grid tracks around it, not padding baked into the `viewBox`.
 *
 * Rank rows are evenly spaced from the top (rank 1) to the bottom (`rankRows`), years evenly across
 * the width. Both axes are ordinal: there is no domain to fit and no zero to anchor, which is
 * exactly what makes this type unable to show magnitude.
 */
export function xOfColumn(
  index: number,
  columns: number,
  width: number,
): number {
  return MARK_INSET_X + (index / (columns - 1)) * (width - MARK_INSET_X * 2);
}

export function bumpGeometry(
  tracks: Track[],
  years: number[],
  rankRows: number,
  { width, height }: { width: number; height: number },
) {
  const yOfRank = (rank: number) =>
    MARK_INSET_Y + ((rank - 1) / (rankRows - 1)) * (height - MARK_INSET_Y * 2);
  const xOfIndex = (index: number) => xOfColumn(index, years.length, width);
  const lines = tracks.map((t) => ({
    ...t,
    points: t.ranks.map((rank, i) => ({ x: xOfIndex(i), y: yOfRank(rank) })),
  }));
  return { yOfRank, xOfIndex, lines };
}

/**
 * The property that makes ONE name column safe at the right edge: in any one year the drawn
 * countries hold DISTINCT ranks, so two names in the same column can never land on the same row.
 * Proven on the real ranks rather than asserted in a comment.
 */
export function assertLabelRowsAreDistinct(
  tracks: Track[],
  atIndex: number,
  where: string,
): void {
  const ranks = tracks.map((t) => t.ranks[atIndex]);
  if (new Set(ranks).size !== ranks.length)
    throw new Error(
      `two drawn countries share a rank in the ${where} column (${ranks.join(", ")}) — ` +
        `their names would be drawn on top of each other`,
    );
}

/** The narrowest viewport `chart-web/scripts/verify-web.mjs` drives this format at, and the two
 *  halves of `FRAME_PAD_PX` the skill's own stylesheet puts inside it. Named here rather than
 *  written into an expression because they are the pair every collision decision below is made
 *  against — this format ships ONE layout for every width, so the width where the room runs out is
 *  the width that decides. Duplicated from the skill, not linked: a beat may not import a skill's
 *  internals, and a beat that silently tracked a change to them would be worse. */
const NARROWEST_VIEWPORT_PX = 375;
const FRAME_PAD_TOTAL_PX = 48;
/** Air between a crossing ring and the caption beside it, on whichever side the caption lands. */
const CAPTION_OFFSET_PX = 14;
/** The caption's own two lines, and the air the corridor keeps above and below them. Both are read
 *  back by the plot's height floor below — the shared stylesheet's `.crossing-label` sets the same
 *  `line-height`, and the two must not drift. */
const CAPTION_LINE_HEIGHT = 1.15;
const CAPTION_CLEARANCE_PX = 10;

/** A coordinate as a percentage of the box it was drawn in — what lets an HTML label sit exactly
 *  where the geometry put the mark it names, at any container width. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/** Air a year label keeps from its nearest drawn neighbour, edge to edge, in CSS pixels. */
const TICK_AIR_PX = 6;
/** The widest plot this scan is asked about, in CSS pixels. Stated rather than guessed: the widest
 *  viewport `chart-web/scripts/verify-web.mjs` drives is 3440, so the plot column can never
 *  exceed it — doubled, so the ceiling is never itself the answer. */
const TICK_SCAN_CEILING_PX = 6880;

export type YearTick = {
  year: number;
  index: number;
  /** The plot width, in CSS pixels, AT OR BELOW which this tick has no room and is hidden. `0` means
   *  it is drawn at every width this beat ships to. Consumed as one `@container` threshold — see
   *  `tickVisibilityCss`. */
  hideAtOrBelowPx: number;
};

/**
 * WHICH YEARS THE AXIS PRINTS, AS A FUNCTION OF HOW WIDE THE PLOT ACTUALLY IS.
 *
 * THE DEFECT THIS REPLACES, which the owner reported by opening the file: the first build took this
 * decision ONCE, server-side, at the narrowest viewport this format verifies at — and then shipped
 * that one answer to every width. 2020 collides with 2024 on a 205px phone plot, so 2020 was dropped
 * from the markup entirely and a 3440px screen showed a 797px hole in an otherwise five-yearly axis.
 * The rule was right; the coordinate system was wrong. Nothing here is decided at one width any
 * more: every candidate tick is emitted, each carrying the width below which it genuinely has no
 * room, and one `@container` rule per threshold hides it there and nowhere else. No script writes a
 * layout value, so the axis is still correct with JavaScript off.
 *
 * THE PACKING RULE, in priority order, which is the whole of it:
 *   1. The FIRST and LAST year are pinned. They are the window this beat's own subtitle states
 *      ("1990–2024") and the last is the column every end label sits in; dropping either would
 *      leave the claim's own span unlocatable. They are asserted to clear each other, and the build
 *      stops rather than shipping two overlapping pinned ticks.
 *   2. Every year on the `yearTickEvery` grid is then offered left to right, and accepted only if it
 *      clears EVERY already-accepted tick by its own measured label width plus `TICK_AIR_PX`.
 * Left to right rather than right to left because a right-to-left walk drops the FIRST year — the
 * one the window is named for — which was measured on this beat's own numbers before this rule was
 * settled: at a 205px plot it kept 1995, 2005, 2015, 2024 and lost 1990.
 *
 * THE SCAN, and why it is a scan. A tick's threshold is not a closed form: whether 2005 has room
 * depends on whether 2000 was accepted, which depends on the width. So the packing is simply run at
 * every integer width from `narrowestPlotPx` to the ceiling and the last width at which each tick is
 * rejected is recorded. It also ASSERTS what the `@container` form requires and cannot express
 * otherwise: that a tick, once drawn, stays drawn as the plot grows. A tick that flickered back off
 * would throw here, naming itself, rather than shipping a rule that lies about it.
 */
export function yearTickPlan(
  years: number[],
  frame: BumpFrame,
  measure: Measure,
  narrowestPlotPx: number,
): YearTick[] {
  const lastIndex = years.length - 1;
  const pinned = new Set([0, lastIndex]);
  const candidates = years
    .map((year, index) => ({ year, index }))
    .filter(
      ({ year, index }) =>
        pinned.has(index) || year % frame.yearTickEvery === 0,
    );
  const need =
    Math.max(...years.map((y) => measure(String(y), frame.axis))) + TICK_AIR_PX;
  /** A column's x as a fraction of the plot's own width — the geometry is stretched, so a distance
   *  in CSS pixels is that fraction times the rendered plot width and nothing else. */
  const fractionOf = (index: number) =>
    xOfColumn(index, years.length, frame.width) / frame.width;

  if ((fractionOf(lastIndex) - fractionOf(0)) * narrowestPlotPx < need)
    throw new Error(
      `${years[0]} and ${years[lastIndex]} are the two pinned ticks and they do not clear each other ` +
        `at the narrowest plot this beat ships to (${Math.floor(narrowestPlotPx)}px): they sit ` +
        `${((fractionOf(lastIndex) - fractionOf(0)) * narrowestPlotPx).toFixed(1)}px apart and need ${need.toFixed(1)}px`,
    );

  /** The ticks a plot `plotPx` wide can hold, by the priority rule above. */
  const acceptedAt = (plotPx: number): Set<number> => {
    const accepted = candidates
      .map((c, k) => k)
      .filter((k) => pinned.has(candidates[k].index));
    for (let k = 0; k < candidates.length; k++) {
      if (pinned.has(candidates[k].index)) continue;
      const clears = accepted.every(
        (a) =>
          Math.abs(
            fractionOf(candidates[a].index) - fractionOf(candidates[k].index),
          ) *
            plotPx >=
          need,
      );
      if (clears) accepted.push(k);
    }
    return new Set(accepted);
  };

  const hideAtOrBelowPx = candidates.map(() => 0);
  const shownBelowPx = candidates.map(() => 0);
  for (
    let plotPx = Math.max(1, Math.floor(narrowestPlotPx));
    plotPx <= TICK_SCAN_CEILING_PX;
    plotPx++
  ) {
    const accepted = acceptedAt(plotPx);
    for (let k = 0; k < candidates.length; k++) {
      if (accepted.has(k)) {
        if (shownBelowPx[k] === 0) shownBelowPx[k] = plotPx;
      } else {
        if (shownBelowPx[k] !== 0)
          throw new Error(
            `the ${candidates[k].year} tick is drawn at a ${shownBelowPx[k]}px plot and hidden again ` +
              `at ${plotPx}px — one @container threshold cannot express that, and a rule that ` +
              `claimed to would be lying about this axis`,
          );
        hideAtOrBelowPx[k] = plotPx;
      }
    }
  }

  return candidates.map((c, k) => ({
    ...c,
    hideAtOrBelowPx: hideAtOrBelowPx[k],
  }));
}

/** The container name the thresholds below are written against — declared on `.x-axis`, which IS
 *  the plot column (grid track 2 of `.bump-plot`), so a query on it is a query on the exact width
 *  the packing arithmetic above is expressed in. */
const TICK_CONTAINER = "bump-x-axis";

/**
 * The tick plan as CSS, emitted INSIDE the figure by the component that derived it.
 *
 * It lives here, and not in this beat's own appended stylesheet, for one reason: the thresholds are
 * derived from the measured width of the real year strings and from the gutters this component
 * measures off the real country names. A second copy of that arithmetic in the runner is a copy that
 * drifts, and the twin's rule for a value nobody chose is that it must be derived once. A `<style>`
 * in the body is valid HTML, it is inert without JavaScript, and every selector is prefixed with
 * this beat's own plot class so it cannot reach another figure on the same page.
 */
export function tickVisibilityCss(ticks: YearTick[]): string {
  const rules = ticks
    .filter((t) => t.hideAtOrBelowPx > 0)
    .map(
      (t) =>
        `@container ${TICK_CONTAINER} (max-width: ${t.hideAtOrBelowPx}px) {\n` +
        `  .bump-plot .axis-label.x[data-year="${t.year}"] { display: none; }\n}`,
    );
  return [
    `.bump-plot .x-axis { container-type: inline-size; container-name: ${TICK_CONTAINER}; }`,
    ...rules,
  ].join("\n");
}

export function BumpWeb({
  years,
  data,
  rankRows,
  title,
  subtitle,
  source,
  alt,
  axisTitle,
  subject,
  crossings,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
  frame,
}: {
  years: number[];
  /** One track per drawn country, ordered by final rank. The runner's job. */
  data: Track[];
  rankRows: number;
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  axisTitle: string;
  /** The one line drawn in accent — this story's subject, computed by the runner as the largest
   *  climb, never the top rank. */
  subject: string;
  crossings: Crossing[];
  ground: string;
  accent: string;
  /** Derived from `ground` by `deriveFurniture` in `renderWeb`. Never derived in here. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: BumpFrame;
}) {
  if (years.length < 3)
    throw new Error(
      `a bump chart needs at least three periods; a two-point comparison is a slope chart's job, got ${years.length}`,
    );
  if (data.length < 2)
    throw new Error(`need at least two tracks, got ${data.length}`);
  for (const track of data)
    if (track.ranks.length !== years.length)
      throw new Error(
        `${track.country} has ${track.ranks.length} ranks for ${years.length} years — a bump chart never bridges a missing period`,
      );
  const subjectIndex = data.findIndex((t) => t.country === subject);
  if (subjectIndex < 0)
    throw new Error(`no track for subject ${JSON.stringify(subject)}`);

  const lastIndex = years.length - 1;
  assertLabelRowsAreDistinct(data, lastIndex, `${years[lastIndex]}`);

  // Both gutters measured from the real strings at their own FIXED type size — never a guessed
  // constant, and never resized on the fly.
  const rankGutterPx =
    Math.ceil(
      Math.max(
        ...Array.from({ length: rankRows }, (_, i) =>
          measure(String(i + 1), frame.axis),
        ),
      ),
    ) + frame.gap;
  const nameGutterPx =
    Math.ceil(Math.max(...data.map((t) => measure(t.country, frame.name)))) +
    frame.gap +
    6;

  const g = bumpGeometry(data, years, rankRows, {
    width: frame.width,
    height: frame.height,
  });
  const subjectLine = g.lines[subjectIndex];

  // THE PLOT AT THE NARROWEST VIEWPORT THIS FORMAT VERIFIES AT, in CSS pixels. Every decision below
  // that could collide — a caption's side, a year tick's survival — is made ONCE, here, against the
  // width where the room runs out. That is this format's own "decided once, not live" rule: there
  // are no rungs and no media queries, so the narrow case is the case that decides.
  const narrowestPlotPx =
    NARROWEST_VIEWPORT_PX - FRAME_PAD_TOTAL_PX - rankGutterPx - nameGutterPx;
  const pxAt = (userUnits: number) =>
    (userUnits / frame.width) * narrowestPlotPx;

  /**
   * Year ticks: every `yearTickEvery` years, plus the first and last — a bump chart's last column is
   * the one its end labels sit in, and its first is the one the window is named for, so leaving
   * either unlabelled would leave the beat's own span unlocatable. EVERY candidate is emitted here;
   * which of them a given width has room for is `yearTickPlan`'s answer, carried into the page as
   * one `@container` threshold per tick rather than baked at one width. See that function's own
   * comment for the defect this replaces — it is the one the owner reported.
   */
  const yearTicks = yearTickPlan(years, frame, measure, narrowestPlotPx);

  /**
   * A crossing's caption, in the corridor the crossing itself opened.
   *
   * After the subject passes a country the two hold adjacent ranks, subject one row above — and
   * they are adjacent on BOTH sides of the crossing, mirrored, so the strip halfway between them is
   * empty in either direction by construction. That is why a caption may be flipped to whichever
   * side has room without hunting for a free space: the corridor is the crossing's own.
   *
   * TWO LINES, not one, and the narrow frame is why. "passed Russia · 2009" measures ~110px against
   * a 210px plot at 375px wide, and at 47% and 56% across it fits on neither side — the first build
   * of this beat shipped exactly that and the caption ran under the country names. Stacking the
   * country over the year halves the width to ~88px, which fits with a flip. Checked here, in CSS
   * pixels at the narrowest width, and it THROWS rather than shipping a caption over a name.
   *
   * AND A FLIPPED CAPTION IS ANCHORED ONE COLUMN EARLIER, which is the second defect this build
   * fixed. The crossing's own diagonal — the two segments that actually swap — occupies exactly the
   * column BEFORE the ring, and a caption offset from the ring by a fixed 14px sits inside that
   * column at a wide container and outside it at a narrow one. Measured: at 1600px a column is
   * ~42px, and "passed Russia / 2009" was struck through by both swapping lines; at 375px, where a
   * column is ~6px, the identical markup was clean. A fixed pixel offset cannot straddle that, so
   * the anchor is a COLUMN, not a pixel: the flipped caption's right edge hangs off the year before
   * the crossing, where both lines are flat. A right-side caption needs no such treatment — the
   * diagonal is behind it.
   */
  const captions = crossings
    .filter((c) => c.drawn)
    .map((c) => {
      const at = years.indexOf(c.year);
      if (at < 0)
        throw new Error(
          `crossing year ${c.year} is not one of this chart's years`,
        );
      const passed = data.find((t) => t.country === c.country);
      if (!passed)
        throw new Error(
          `crossing names ${c.country}, which this chart does not draw`,
        );
      const who = `passed ${c.country}`;
      const when = String(c.year);
      const noteFont = { ...frame.note, fontWeight: 500 };
      const w = Math.max(measure(who, noteFont), measure(when, noteFont));
      const x = g.xOfIndex(at);
      // The anchor a flipped caption hangs off: the column before the crossing, where both lines
      // are flat. `at === 0` cannot happen for a crossing (a crossing needs a year before it to
      // cross from), and is guarded rather than assumed.
      if (at === 0)
        throw new Error(
          `crossing ${c.country} is dated at the first year of the window — nothing crossed`,
        );
      const anchorLeft = g.xOfIndex(at - 1);
      const fitsRight = pxAt(x) + CAPTION_OFFSET_PX + w <= narrowestPlotPx;
      const fitsLeft = pxAt(anchorLeft) - CAPTION_OFFSET_PX - w >= 0;
      if (!fitsRight && !fitsLeft)
        throw new Error(
          `the caption "${who} ${when}" measures ${Math.ceil(w)}px and fits on neither side of its ` +
            `ring at the narrowest verified frame: ${Math.floor(pxAt(anchorLeft))}px to its left, ` +
            `${Math.floor(narrowestPlotPx - pxAt(x))}px to its right, of ${Math.floor(narrowestPlotPx)}px`,
        );
      const flip = !fitsRight;
      return {
        key: c.country,
        who,
        when,
        flip,
        left: pct(x, frame.width),
        captionLeft: pct(flip ? anchorLeft : x, frame.width),
        ringTop: pct(g.yOfRank(subjectLine.ranks[at]), frame.height),
        captionTop: pct(
          g.yOfRank((subjectLine.ranks[at] + passed.ranks[at]) / 2),
          frame.height,
        ),
      };
    });

  /**
   * THE PLOT'S OWN FLOOR, derived from the tallest thing that has to fit BETWEEN two rank rows —
   * never a constant guessed to be tall enough.
   *
   * Height follows width through `aspect-ratio`, so a narrow viewport buys a short chart, and a
   * short chart on THIS type squeezes the rank rows together until the corridor a crossing caption
   * sits in is thinner than the caption. Measured on the first build of this beat: at 375px wide the
   * plot came out 260px tall, the nine gaps were 26px each, and a two-line caption at 12px is ~28px
   * — every one of the three captions touched the lines either side of it. The rank labels' own
   * lead is the other claimant on the same gap. The floor is the larger of the two, which is why it
   * is computed here, after the captions, rather than written down as a number.
   */
  const rowNeedPx = Math.max(
    frame.rowLeadPx + frame.rowAirPx,
    captions.length === 0
      ? 0
      : 2 * frame.note.fontSize * CAPTION_LINE_HEIGHT + CAPTION_CLEARANCE_PX,
  );
  const minPlotHeightPx =
    Math.ceil((rankRows - 1) * rowNeedPx) + frame.xAxisRowPx;

  const totalWidth = rankGutterPx + frame.width + nameGutterPx;
  const totalHeight = frame.height + frame.xAxisRowPx;

  return (
    <figure
      className="chart-figure bump-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.name.fontSize}px`,
        ["--label-weight" as string]: frame.name.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
      }}
    >
      {/* The tick plan, as the only thing in this format that a static stylesheet cannot hold: one
          `@container` threshold per year, derived from the measured strings above. `dangerouslySet`
          because React escapes `"` in a text child and the attribute selectors carry quotes; the
          content is this component's own numbers and years, never a caller's string. */}
      <style
        dangerouslySetInnerHTML={{ __html: tickVisibilityCss(yearTicks) }}
      />

      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      <p className="axis-title">{axisTitle}</p>

      <div
        className="chart-plot bump-plot"
        style={{
          ["--y-gutter" as string]: `${rankGutterPx}px`,
          ["--r-gutter" as string]: `${nameGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          ["--min-plot-h" as string]: `${minPlotHeightPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        <div className="y-axis">
          {Array.from({ length: rankRows }, (_, i) => i + 1).map((rank) => (
            <span
              key={rank}
              className="axis-label y"
              style={{
                top: `${pct(g.yOfRank(rank), frame.height)}%`,
                color: muted,
              }}
            >
              {rank}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>`, and no circle whose shape carries meaning. */}
        <svg
          // Named `group`, not `img` — see the note in `SlopeWeb.tsx`: the root used to come back
          // from Chrome's AX tree as `SvgRoot` with `name: ""`, and `group` names it without
          // raising the ARIA children-presentational question `img` raises.
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
          fontFamily="Helvetica, Arial, sans-serif"
        >
          {/* `role="group"`, not `role="img"` — see `SlopeWeb.tsx`'s note: the reason recorded here
              was measured and is not what Chrome does, and `group` names the graphic without
              raising the question. `<desc>` still carries the alt text. */}
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {Array.from({ length: rankRows }, (_, i) => i + 1).map((rank) => (
            <line
              key={`grid-${rank}`}
              x1={0}
              x2={frame.width}
              y1={g.yOfRank(rank)}
              y2={g.yOfRank(rank)}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Background lines first, the subject redrawn on top and heavier, so a crossing between
              the accent line and a background line reads as the accent line's crossing rather than
              a tangle (`references/types/bump.md`'s z-order rule). */}
          {g.lines.map((l, i) =>
            i === subjectIndex ? null : (
              <path
                key={`line-${l.country}`}
                className="line"
                data-country={l.country}
                d={l.points
                  .map(
                    (p, j) =>
                      `${j === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`,
                  )
                  .join(" ")}
                fill="none"
                stroke={muted}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ),
          )}
          <path
            className="line subject"
            data-country={subject}
            d={subjectLine.points
              .map(
                (p, j) =>
                  `${j === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`,
              )
              .join(" ")}
            fill="none"
            stroke={accent}
            strokeWidth={3.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* One invisible hit target per reading — country × year, the unit this type's data
              actually holds. `tabIndex={0}` and `aria-label` are baked in at build time, so every
              reading is reachable by plain Tab with the inline script absent entirely; the script
              adds the visual tooltip, the line tracing, and arrow-key movement along a line. */}
          {g.lines.map((l) =>
            l.points.map((p, i) => (
              <circle
                key={`node-${l.country}-${years[i]}`}
                className="node"
                cx={p.x}
                cy={p.y}
                r={5}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={`${l.country}, ${years[i]}: world rank ${l.ranks[i]}`}
                data-country={l.country}
                data-year={years[i]}
                data-index={i}
                data-detail={`${l.country} · ${years[i]} · world rank ${l.ranks[i]}`}
              />
            )),
          )}

          <rect
            className="hit-area"
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        {/* HTML overlay — the same grid cell as the `<svg>`, so a `%` position lands on the exact
            mark it names at any width. Every one of these is drawn unconditionally: the crossing
            rings and captions are the argument, and no pointer, focus or class toggle can remove
            them (`web-discipline.md`, "What must not become interactive"). */}
        <div className="overlay" aria-hidden="true">
          {g.lines.map((l, i) =>
            [0, lastIndex].map((at) => (
              <span
                key={`dot-${l.country}-${at}`}
                className={`term-dot${i === subjectIndex ? " subject" : ""}`}
                style={{
                  left: `${pct(l.points[at].x, frame.width)}%`,
                  top: `${pct(l.points[at].y, frame.height)}%`,
                  background: i === subjectIndex ? accent : muted,
                }}
              />
            )),
          )}

          {captions.map((c) => (
            <span
              key={`ring-${c.key}`}
              className="crossing-ring"
              style={{
                left: `${c.left}%`,
                top: `${c.ringTop}%`,
                borderColor: accent,
              }}
            />
          ))}
          {captions.map((c) => (
            <span
              key={`caption-${c.key}`}
              className={`crossing-label${c.flip ? " flip" : ""}`}
              style={{
                left: `${c.captionLeft}%`,
                top: `${c.captionTop}%`,
                color: muted,
              }}
            >
              <span className="who">{c.who}</span>
              <span className="when">{c.when}</span>
            </span>
          ))}

          {g.lines.map((l, i) => (
            <span
              key={`name-${l.country}`}
              className={`name-label${i === subjectIndex ? " subject" : ""}`}
              data-country={l.country}
              style={{
                left: "100%",
                top: `${pct(l.points[lastIndex].y, frame.height)}%`,
                color: ink,
                fontWeight: i === subjectIndex ? 700 : frame.name.fontWeight,
              }}
            >
              {l.country}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {yearTicks.map(({ year, index }) => (
            <span
              key={year}
              className="axis-label x"
              data-year={year}
              style={{
                left: `${pct(g.xOfIndex(index), frame.width)}%`,
                color: muted,
              }}
            >
              {year}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
