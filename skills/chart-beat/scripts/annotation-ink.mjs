// twin/skills/chart-beat/scripts/annotation-ink.mjs
//
// AN ANNOTATION IS COLOURED AGAINST WHAT IT IS DRAWN OVER, NOT AGAINST THE PAGE.
//
// `render-still.mjs`'s `deriveFurniture` answers "what ink reads on this newsroom's GROUND". That
// is the right question for a title, a source line and an axis label, all of which sit on the page.
// It is the wrong question for an annotation, which by definition is drawn ON TOP OF THE DATA: a
// median rule crossing a bar, a callout sitting on the band it names, a leader running across a
// field of marks. Measured in this corpus on 2026-08-10, before this file existed: the carbon
// histogram's median rule is `#0B7A75` on `#FFFFFF` — 5.18:1 against the page, and **1.20:1
// against the bar it spends 97 % of its length inside**. The Swiss pyramid's peak callout is black
// at 4.05:1 with 57 % of its ink box lying on a `#0072B2` bar. Twenty-one dashed rules of the
// thirty-two that cross a mark at all were under the 3:1 floor.
//
// `skills/doctrine/references/visual-system.md` already states the rule — "a label's ink is
// never inherited from the mark it names… computed against the real background the label sits on,
// every time, even when that background is a data mark instead of the page". It was written for
// TEXT, and nothing in the tree reached the annotation layer. This file is that reach.
//
// TWO FLOORS, AND THEY ARE NOT THE SAME ONE. A dashed rule, a leader, a hatch, a bracket is a
// NON-TEXT graphical object: WCAG 2.2 SC 1.4.11, 3:1. Text is SC 1.4.3, 4.5:1, relaxed to 3:1 only
// at large-text size (>= 24 px, or >= 18.66 px when bold). Applying one floor to both is wrong in
// both directions — it either fails a legitimate rule or passes an illegible label.
//
// WHY THIS IS A SEPARATE FILE AND NOT MORE OF `render-still.mjs`. `render-still.mjs` is the
// rasteriser: it owns react-dom/server, resvg and the ground-derived furniture, and every craft
// skill carries a copy of it. This is a page of pure arithmetic with no I/O and no rendering, used
// by the beat COMPONENTS at draw time rather than by the renderer. It takes `contrast` from its
// own skill's `render-still.mjs` instead of restating the WCAG maths — one definition, no drift,
// and no import leaves the skill.
//
// VENDORED, NOT IMPORTED ACROSS SKILLS. Three byte-identical copies live in the tree — this one,
// `twin/shared/chart-beat/` (what a `proof/` beat reaches through `#shared/…`) and
// `skills/splash/assets/root-template/shared/chart-beat/` (what a journalist's fresh
// root gets at install). `annotation-ink-parity.test.ts` WALKS the tree for the basename and
// compares them, so a fourth copy is guarded the day it is created and none of them has to be
// remembered.

import { contrast } from "./render-still.mjs";

/** WCAG 2.2 SC 1.4.11, non-text contrast: a dashed rule, a leader, a bracket, a hatch. */
export const NON_TEXT_CONTRAST_FLOOR = 3;
/** WCAG 2.2 SC 1.4.3, text contrast. */
export const TEXT_CONTRAST_FLOOR = 4.5;
/** SC 1.4.3's large-text relaxation, and the two sizes that earn it. */
export const LARGE_TEXT_CONTRAST_FLOOR = 3;
export const LARGE_TEXT_PX = 24;
export const LARGE_TEXT_BOLD_PX = 18.66;

/**
 * The floor a piece of text has to clear, from its own size and weight. Large text is a real
 * exemption in the spec and refusing to apply it would make a 25 px headline fail on a ground a
 * reader can read it on perfectly well; applying it to a 12 px annotation would be the reverse.
 */
export function textContrastFloor({ fontSize, fontWeight = 400 }) {
  const large =
    fontSize >= LARGE_TEXT_PX ||
    (fontSize >= LARGE_TEXT_BOLD_PX && fontWeight >= 700);
  return large ? LARGE_TEXT_CONTRAST_FLOOR : TEXT_CONTRAST_FLOOR;
}

/**
 * The rectangle a string's INK really occupies, from a measurement the caller already took with
 * `measureText`/`measureTextBand` — width, and the rise and fall around the baseline. Passed in
 * rather than measured here so this module stays pure arithmetic: the beat has the font in hand,
 * this has the geometry.
 *
 * `anchor` is SVG's own `text-anchor`, because that is what decides where `x` sits in the box.
 */
export function inkBox({ x, y, anchor = "start", width, ascent, descent }) {
  if (!Number.isFinite(width) || !Number.isFinite(ascent) || !Number.isFinite(descent)) {
    throw new Error(
      `inkBox needs a measured width/ascent/descent, got ${JSON.stringify({ width, ascent, descent })} — ` +
        `measure the string with measureText/measureTextBand rather than guessing a box`,
    );
  }
  const left = anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
  return { x: left, y: y - ascent, width, height: ascent + descent };
}

/**
 * Do two rectangles share INTERIOR area? Touching edges do not count, and that is a measurement
 * decision with a name: a waterfall's connector runs from one bar's right edge to the next bar's
 * left edge, so it meets both marks at a single point of zero width. Counting that as "crossing"
 * would report four false failures in `static-germany-electricity-bridge` alone and teach whoever
 * met them that this whole check cries wolf.
 */
export function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/**
 * The marks an annotation's box really lies over. `marks` are the beat's own drawn rectangles,
 * each `{ x, y, width, height, fill }` — the bars, the cells, the plate blocks it already computed
 * to draw them.
 *
 * AXIS-ALIGNED ONLY, and named as a limit rather than hidden: a rectangle is the honest hull of a
 * horizontal or vertical rule and of a line of text, and it is a bad hull for a diagonal one, where
 * the bounding box is mostly empty space. A diagonal annotation must hand its own crossing set to
 * `assertAnnotationReadsOverMarks` instead of coming through here.
 */
export function marksUnder(box, marks) {
  return marks.filter((m) => overlaps(box, m));
}

/**
 * The worst pair in a set: what does `colour` measure against the least forgiving thing under it.
 * The page ground belongs in `fills` — an annotation is drawn on the page as well as on the data,
 * and leaving the ground out is how a white rule gets chosen for a chart that is white.
 */
export function worstContrast(colour, fills) {
  let worst = null;
  for (const fill of fills) {
    const ratio = contrast(colour, fill);
    if (!worst || ratio < worst.ratio) worst = { ratio, fill };
  }
  return worst;
}

/**
 * Throw unless `colour` clears `floor` against every fill under it, naming the pair that failed and
 * what it was drawn over. The loud half of this module: a beat that has DECIDED on a colour (an
 * accent it wants) calls this and finds out at render time rather than in a reader's browser.
 */
export function assertAnnotationReadsOverMarks(annotation, fills, floor) {
  const { what, colour } = annotation;
  if (!Number.isFinite(floor)) {
    throw new Error(
      `assertAnnotationReadsOverMarks needs an explicit floor — ${NON_TEXT_CONTRAST_FLOOR} for a rule or any other non-text mark (SC 1.4.11), ` +
        `textContrastFloor(font) for a label (SC 1.4.3). Got ${JSON.stringify(floor)}`,
    );
  }
  if (!fills.length) {
    throw new Error(
      `assertAnnotationReadsOverMarks was given no backgrounds for ${what} — the page ground belongs in this set, ` +
        `and an empty set makes this check pass vacuously`,
    );
  }
  const worst = worstContrast(colour, fills);
  if (worst.ratio < floor) {
    throw new Error(
      `${what} is drawn ${colour} and measures ${worst.ratio.toFixed(2)}:1 against ${worst.fill}, which it is drawn over — ` +
        `the floor is ${floor}:1. An annotation's ink is measured against what it crosses, not against the page.`,
    );
  }
  return worst;
}

/**
 * The ink to draw an annotation in, given everything it will be drawn over. Returns the POLE —
 * pure black or pure white — that measures best against the least forgiving background in the set,
 * which is the same escalate-to-the-pole move `deriveFurniture` makes for a ground and for the same
 * reason: on a mid-toned mark nothing softer clears anything.
 *
 * The honest consequence, stated because it looks like a regression and is not: an accent rule that
 * crosses a mid-grey bar comes back near-black, not accent-coloured. A teal rule a reader cannot
 * see is not carrying the accent either.
 *
 * When NEITHER pole clears the floor, this THROWS rather than returning the better of two failures.
 * That is a real outcome and it means the annotation is in the wrong PLACE, not the wrong colour:
 * a label lying half on white paper and half on a mid-blue bar has no ink at all, and the fix is to
 * move it onto one background or the other.
 */
export function inkThatReadsOver(fills, floor) {
  if (!Number.isFinite(floor)) {
    throw new Error(`inkThatReadsOver needs an explicit floor, got ${JSON.stringify(floor)}`);
  }
  if (!fills.length) {
    throw new Error(
      `inkThatReadsOver was given no backgrounds — the page ground belongs in this set, and an empty ` +
        `set would let it return either pole`,
    );
  }
  const candidates = ["#000000", "#FFFFFF"].map((pole) => ({
    pole,
    ...worstContrast(pole, fills),
  }));
  const best = candidates.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  if (best.ratio < floor) {
    const detail = candidates
      .map((c) => `${c.pole} reaches only ${c.ratio.toFixed(2)}:1 against ${c.fill}`)
      .join("; ");
    throw new Error(
      `no ink reads at ${floor}:1 over all of ${fills.join(", ")} — ${detail}. ` +
        `This annotation crosses backgrounds too far apart to share one ink: move it onto one of them.`,
    );
  }
  return best.pole;
}

/**
 * THE ANSWER `inkThatReadsOver`'S REFUSAL ASKS FOR, when moving the annotation is not the fix.
 *
 * That function throws when no single ink reads over every background an annotation crosses, and
 * says "move it onto one of them". For a LABEL that is the right instruction — a word lying half
 * on the page and half on a bar is in the wrong place. For a RULE it is not: a median rule on a
 * histogram, a reference line on a bar chart, a target line on a column chart all cross the plot
 * by definition, and there is nowhere else for them to be.
 *
 * ROUND SIX, `stress-aa-salary-spread`, measured. That newsroom's ground is dark (`#16191B`) and
 * its accent is a light gold (`#D4A853`, 8.01:1 on it). Both legitimate, and 8:1 apart:
 *
 *     inkThatReadsOver(["#16191B", "#D4A853"], 3)
 *     -> no ink reads at 3:1 over all of #16191B, #D4A853 — #000000 reaches only 1.19:1 against
 *        #16191B; #FFFFFF reaches only 2.20:1 against #D4A853. … move it onto one of them.
 *
 * The refusal was right and it is the ORDINARY case for any newsroom whose ground is dark and
 * whose accent is legible on it. That beat wrote the answer by hand — the rule drawn as two
 * segments, each inked against the one background it actually has, computed off `marksUnder` — and
 * nothing here offered it, so the earlier carbon histogram had solved the same problem by dropping
 * its accent entirely, which is a different beat rather than a reusable answer.
 *
 * This is that answer: the refusal's own instruction, applied per run. It returns the segments to
 * DRAW, each with the fill it lies on and the ink that reads there, covering the box exactly —
 * no gap, no overlap, and adjacent runs of the same fill merged so a histogram's touching bins do
 * not produce a seam per bin.
 *
 * SPLITTING IS NOT A WAY PAST THE FLOOR. Each run is inked by `inkThatReadsOver` against its own
 * single background, so a run over a mid-tone no pole reads on still throws — and the message now
 * names one background instead of two, which is the more useful refusal.
 *
 * A RULE HAS A LONG AXIS and its runs lie along it: a vertical rule is cut in y, a horizontal one
 * in x. A box with no long axis is refused rather than guessed at — that shape is a label, and a
 * label's answer is `inkThatReadsOver` plus a position, not a split.
 *
 * PAINTER'S ORDER decides a run two marks both cover: the LAST one in `marks` is the one on top,
 * which is the order the beat drew them in and the only order that matches what a reader sees.
 */
export function segmentsByBackground(box, marks, { ground, floor } = {}) {
  if (!Number.isFinite(floor)) {
    throw new Error(
      `segmentsByBackground needs an explicit floor — ${NON_TEXT_CONTRAST_FLOOR} for a rule or any ` +
        `other non-text mark (SC 1.4.11), textContrastFloor(font) for a label. Got ${JSON.stringify(floor)}`,
    );
  }
  if (typeof ground !== "string" || !ground) {
    throw new Error(
      `segmentsByBackground needs the page ground — it is the fill of every run no mark covers, and ` +
        `leaving it out would ink those runs against nothing. Got ${JSON.stringify(ground)}`,
    );
  }
  if (box.width === box.height) {
    throw new Error(
      `segmentsByBackground was given a ${box.width}x${box.height} box, which has no long axis to ` +
        `split along. This is for a RULE — a line whose runs lie along its own length. A label that ` +
        `crosses two backgrounds is a POSITION problem: ink it with inkThatReadsOver and move it ` +
        `onto one background, which is what that function's refusal says.`,
    );
  }
  const vertical = box.height > box.width;
  const start = vertical ? box.y : box.x;
  const end = start + (vertical ? box.height : box.width);
  const crossing = marksUnder(box, marks);

  // The cut points: every edge, along the long axis, where the background can change.
  const cuts = new Set([start, end]);
  for (const mark of crossing) {
    const from = vertical ? mark.y : mark.x;
    const to = from + (vertical ? mark.height : mark.width);
    if (from > start && from < end) cuts.add(from);
    if (to > start && to < end) cuts.add(to);
  }
  const edges = [...cuts].sort((a, b) => a - b);

  const runs = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const from = edges[i];
    const to = edges[i + 1];
    if (to <= from) continue;
    const middle = (from + to) / 2;
    // LAST wins: painter's order.
    let fill = ground;
    for (const mark of crossing) {
      const markFrom = vertical ? mark.y : mark.x;
      const markTo = markFrom + (vertical ? mark.height : mark.width);
      if (middle > markFrom && middle < markTo) fill = mark.fill;
    }
    const previous = runs[runs.length - 1];
    if (previous && previous.fill === fill) previous.to = to;
    else runs.push({ from, to, fill });
  }

  return runs.map((run) => ({
    x: vertical ? box.x : run.from,
    y: vertical ? run.from : box.y,
    width: vertical ? box.width : run.to - run.from,
    height: vertical ? run.to - run.from : box.height,
    fill: run.fill,
    ink: inkThatReadsOver([run.fill], floor),
  }));
}
