// twin/skills/twin-chart-beat/scripts/annotation-ink.mjs
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
// `skills/twin-doctrine/references/visual-system.md` already states the rule — "a label's ink is
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
// `twin/shared/twin-chart-beat/` (what a `proof/` beat reaches through `#shared/…`) and
// `skills/splash-twin/assets/root-template/shared/twin-chart-beat/` (what a journalist's fresh
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
