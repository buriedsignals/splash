// twin/shared/design-base/web.mjs
//
// THE DESIGN BASE, SPOKEN IN CSS.
//
// A filed direction records six registers as numbers — family role, size, weight, italic, tracking,
// case, ink role. `registers.mjs` turns one into the attributes an SVG `<text>` takes, which is what
// a STATIC plate needs. A web beat draws no `<text>` at all: every word on the page is HTML,
// positioned by percentage over the geometry and sized in fixed CSS pixels (`chart-web`'s fluid
// frame — the geometry stretches, the type never does). So the same register has to arrive as a CSS
// declaration block instead, and that translation is here rather than copied into forty beats.
//
// WHAT THIS FILE REFUSES TO DO. It does not read a direction's ground or accent — `render-web.mjs`'s
// `buildCss` already sets `--ground`/`--accent`/`--ink`/`--muted`/`--grid` from the props the runner
// hands it, and a second place computing furniture colour is the drift `deriveFurniture` exists to
// prevent. It only ever answers: what does THIS register look like, in CSS, under THIS direction.
//
// TWO DIFFERENCES FROM THE STATIC TRANSLATION, both deliberate:
//
//   1. **Case is applied by the stylesheet, not baked into the string.** A static plate has no
//      reader-side text layer, so `applyCase` bakes `.toUpperCase()` into the ink. A web page does:
//      the words are in the DOM, they are read out, copied, and searched. `text-transform` shouts
//      on screen and leaves the accessible name alone, which is what the register actually means.
//   2. **A concrete family carries a generic fallback.** `resolve-families.mjs` resolves a role to
//      a face that exists ON THE MACHINE THAT RENDERS. A web page is set on the reader's machine,
//      which is a different machine, so the resolved face is the first item of a stack and the
//      role's own generic keyword closes it. Without that a reader without Superclarendon gets the
//      browser's default serif anyway — but by accident, and a `sans` register would get a serif.
//
// A NOTE ON SIZES, so nobody re-derives it. A direction's sizes were measured for a 960 x 540 plate
// and are used here as CSS pixels unchanged. That is not an oversight: the fluid frame's own type
// scale (24/14/13/12 in `ChartWebSeed`'s `FRAME`) sits in the same regime, and rescaling would make
// the directions differ from their own records for no measured reason.

import { resolveRegister } from "#shared/chart-beat/registers.mjs";
import { LADDERS } from "#shared/design-base/resolve-families.mjs";

/** Which generic keyword closes a stack, per concrete face on the ladders. Built from the ladders
 *  themselves so a face added there can never be missed here. */
const GENERIC = (() => {
  const out = new Map();
  for (const [role, families] of Object.entries(LADDERS))
    for (const family of families)
      if (!out.has(family)) out.set(family, role === "serif" ? "serif" : "sans-serif");
  return out;
})();

/** `"Superclarendon", Georgia, serif` — the resolved face, then a face almost every machine has,
 *  then the keyword. A family this base has never laddered still closes honestly. */
export function fontStack(family) {
  const generic = GENERIC.get(family) ?? "sans-serif";
  const bridge = generic === "serif" ? "Georgia" : "Helvetica, Arial";
  return `"${family}", ${bridge}, ${generic}`;
}

/**
 * One register as a React inline-style object.
 *
 * @param {object} direction  a direction whose families are already resolved
 *                            (`resolveDirectionFamilies`)
 * @param {string} name       display | eyebrow | body | axis | annot | value
 * @param {{ink: Record<string,string>, family?: string}} ctx
 *        `ink` maps the three ink ROLES to the colours `deriveFurniture` resolved against this
 *        direction's own ground — `{ ink, muted, accent }`, exactly what `renderWeb` passes down.
 */
export function webRegister(direction, name, { ink, family = "chart" } = {}) {
  const r = resolveRegister(direction, name, { family });
  if (!ink || !(r.ink in ink))
    throw new Error(
      `register ${name} asks for ink role "${r.ink}"; the caller supplied ` +
        `${ink ? Object.keys(ink).join(", ") : "nothing"} — a web beat resolves ink from the ` +
        `furniture render-web.mjs derived, never from a literal`,
    );
  return {
    fontFamily: fontStack(r.fontFamily),
    fontSize: `${r.fontSize}px`,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: `${r.letterSpacing}px`,
    textTransform: r.transform === "none" ? "none" : r.transform,
    color: ink[r.ink],
  };
}

/** The six core voices plus a chart's axis, resolved in one call. */
export function webRegisters(direction, ctx) {
  const out = {};
  for (const name of ["display", "eyebrow", "body", "axis", "annot", "value"])
    out[name] = webRegister(direction, name, ctx);
  return out;
}

/**
 * The custom properties `render-web.mjs`'s shared stylesheet reads, filled from the registers rather
 * than from a hand-picked scale. The stylesheet still owns layout; this only tells it how big.
 *
 * Every rule in `buildCss` that sizes a word reads one of these, so a direction that sets a 32px
 * display and a 10px axis produces a page whose proportions are the direction's, not the format's.
 */
export function figureVars(regs) {
  const px = (style) => style.fontSize;
  return {
    "--title-size": px(regs.display),
    "--title-weight": regs.display.fontWeight,
    "--subtitle-size": px(regs.body),
    "--source-size": px(regs.body),
    "--axis-size": px(regs.axis),
    "--label-size": px(regs.value),
    "--label-weight": regs.value.fontWeight,
    "--note-size": px(regs.annot),
    "--filter-size": px(regs.body),
  };
}

/**
 * The numeric side of the same registers, for the ONE thing a web beat still measures in node: the
 * y-axis gutter (`measureText` needs a size and a weight, not a CSS string).
 */
export function measurable(direction, name, { family = "chart" } = {}) {
  const r = resolveRegister(direction, name, { family });
  return {
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
    letterSpacing: r.letterSpacing,
  };
}

/**
 * WHERE AN OVERLAY LABEL SITS, SO THAT IT NEVER PUSHES THE PAGE SIDEWAYS.
 *
 * The format's shared stylesheet gives `.note`/`.end-label` `white-space: nowrap` and no transform,
 * which is right for a label at 0 % and wrong for one at 50 %: an unwrapped run started at the
 * middle of a 300px plot and 230px long is 80px of horizontal document scroll, and the format's own
 * fit check reports it as exactly that ("document 558px in a 375px window"). Measured on this
 * base's first web beat, at three of the seven verified viewports.
 *
 * The rule is positional, not per-beat: a label near the left edge hangs right, one near the right
 * edge hangs left, one in the middle is centred — and any of them may wrap rather than run off. It
 * is here rather than in each composition because every directed web beat annotates something.
 *
 * A caller that needs a vertical shift too composes on `transform`, which is why every branch
 * returns one — an absent transform would compose into the string `undefined translateY(-100%)`,
 * which browsers drop whole, taking the horizontal anchoring with it.
 *
 * @param {number} xPct  the label's anchor as a percentage of the plot's own width
 */
export function noteAnchor(xPct) {
  // AN ABSOLUTELY-POSITIONED BOX IS AS WIDE AS WHAT IS LEFT OF ITS CONTAINER, NOT AS WIDE AS ITS
  // OWN MAX-WIDTH. A label anchored `left: 91%` has 9 % of the plot to lay itself out in, and
  // `translateX(-100%)` afterwards only MOVES the ribbon it already became — measured on this base's
  // connected-scatter beat, where a one-line note came out five words tall. So a label on the right
  // half is anchored from the RIGHT edge and needs no transform at all.
  if (xPct > 75)
    return { right: `${100 - xPct}%`, transform: "translateX(0)", whiteSpace: "normal", maxWidth: "min(46%, 24em)" };
  if (xPct < 25)
    return { left: `${xPct}%`, transform: "translateX(0)", whiteSpace: "normal", maxWidth: "min(46%, 24em)" };
  return {
    left: `${xPct}%`,
    transform: "translateX(-50%)",
    whiteSpace: "normal",
    maxWidth: "min(46%, 24em)",
  };
}

/**
 * A FITTED VALUE SCALE WITH THE HEADROOM ITS OWN TOP LABEL NEEDS.
 *
 * The top tick's label is positioned at its own height and centred on it, so a scale whose maximum
 * IS the top tick puts half that label outside the plot's grid cell — over the caveat line above it.
 * Measured twice on this base's first web beats, in two different forms, which is what makes it the
 * scale's business rather than each composition's.
 *
 * @param {number} floor  the axis's own bottom — zero for a length encoding, fitted for a position one
 * @param {number} top    the highest tick
 * @param {number} height the frame's own height in viewBox units
 * @param {number} headroom fraction of the span left above the top tick
 */
export function fitY(floor, top, height, headroom = 0.06) {
  const span = (top - floor) * (1 + headroom);
  if (!(span > 0)) throw new Error(`a value scale needs a span; got ${floor} to ${top}`);
  return (value) => height - ((value - floor) / span) * height;
}

/**
 * THE ONE STRING FUNCTION EVERY DIRECTED BEAT NEEDS, AND THE REASON IT LIVES HERE.
 *
 * `toLocaleString("fr-FR")` emits U+202F between a number and its unit and U+00A0 as a thousands
 * separator. No face on this base's family ladders covers them, so a single one refuses EVERY family
 * and takes all three renders down with a message that names the code point and not the string.
 *
 * Beats kept writing this themselves and kept writing it with the characters typed literally inside
 * the character class — where they are invisible in the source, survive a copy-paste, and silently
 * stop matching. Written once, with escapes, imported everywhere.
 */
export function plainSpaces(text) {
  return String(text).replace(/[    ⁠]/g, " ");
}

/**
 * THE INK FOR A WORD THAT SITS ON A FILLED MARK, NOT ON THE PLATE'S GROUND.
 *
 * `adjustToContrast(ink, band)` walks the direction's ink toward whichever pole clears the floor
 * against that band — and on a dark direction, whose ink is light, a LIGHT band pushes it all the way
 * to a muddy dark. The result clears 4.5:1 and looks like neither of the direction's own colours.
 *
 * A direction has two poles, not one. The right question is which of ink and ground reads better on
 * this particular fill; only then is it adjusted. Measured on the streamgraph beat, where band names
 * on a mint fill under `nocturne` came out brown.
 */
export function inkOnFill(fill, { ink, ground }, contrast, adjustToContrast, floor) {
  const best = contrast(ink, fill) >= contrast(ground, fill) ? ink : ground;
  return contrast(best, fill) >= floor ? best : (adjustToContrast(best, fill, floor) ?? best);
}
