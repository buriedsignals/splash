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
// WHAT THIS FILE REFUSES TO DO. It does not COLOUR from a direction's ground or accent —
// `render-web.mjs`'s `buildCss` already sets `--ground`/`--accent`/`--ink`/`--muted`/`--grid` from
// the props the runner hands it, and a second place computing furniture colour is the drift
// `deriveFurniture` exists to prevent. The caller's `ink` map stays the only source of a `color:`
// here; `registerOf` derives a `fill` of its own out of the direction's ground and this file throws
// it away. It only ever answers: what does THIS register look like, in CSS, under THIS direction.
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
//      role's own generic keyword closes it. Without that a reader without Merriweather gets the
//      browser's default serif anyway — but by accident, and a `sans` register would get a serif.
//
// A NOTE ON SIZES, so nobody re-derives it. A direction's sizes were measured for a 960 x 540 plate
// and are used here as CSS pixels unchanged. That is not an oversight: the fluid frame's own type
// scale (24/14/13/12 in `ChartWebSeed`'s `FRAME`) sits in the same regime, and rescaling would make
// the directions differ from their own records for no measured reason. What a size IS, though, is
// now `registerOf`'s answer rather than `resolveRegister`'s: a filed size names a CAP HEIGHT, and
// the face the ladder actually picked is resolved to the point size that reaches it. A web page and
// a still on the same direction therefore set at the same optical size, which they did not before.
//
// AND THE LINE THEY SET ON. A register carries a `lineHeight` — its face's own declared line times
// the direction's `leading` coefficient — and it is emitted here as a UNITLESS CSS `line-height`.
// Unitless is the whole point: it inherits as a RATIO and is multiplied by each element's own
// font-size, which is exactly what `leadOf(r) = r.lineHeight * r.fontSize` means in the trunk. A
// `px` value would inherit as a fixed box and a nested `<small>` would set on its parent's line.
// Measured on 2026-09-13 against resvg on three faces, seven lines: baseline-to-baseline agrees to
// within 0.04 px (`docs/splash/2026-09-13-adaptive-leading-spec.md` §5.4). The first-baseline
// correction measured in that same section is deliberately NOT implemented here — a web beat draws
// no SVG `<text>` and has no baseline to match; its text is HTML in CSS flow.
//
// `registerOf` MEASURES THROUGH RESVG, so this file is node-only at emit time. That is already
// true of every consumer: each `Directed*Web.tsx` is handed to `renderToStaticMarkup` in node by
// `render-web.mjs`, and nothing in this tree bundles one for a browser. A page's client-side
// JavaScript is written as a string literal in the runner, never compiled from these modules.

import { registerOf } from "#shared/design-base/register.mjs";
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

/** `"Merriweather", Georgia, serif` — the resolved face, then a face almost every machine has,
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
  const r = registerOf(direction, name, { family });
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
    // Unitless, and it must stay unitless — see the header. React emits a bare number for
    // `lineHeight` (it is one of the few style properties it does not append `px` to), which is
    // the value this needs; a string would work too and a `${…}px` string would be the defect.
    lineHeight: r.lineHeight,
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
 *
 * AND WHICH FAMILY, which is the half that was missing and the reason a direction had two
 * typographic voices depending on genre. Every web stylesheet in this tree sets `font-family`
 * exactly once, on `body`, from `dominantFontStack` — the family that appears MOST OFTEN in the
 * markup, which on any beat with an axis is the furniture sans. The display register's own family
 * had no route to the page at all: `rapport` sets its display in a serif and its body in an italic
 * serif, and the delivered web page came out entirely in the sans, while the same direction's
 * STATIC plate set the title in Merriweather. Measured on `proof/mapgen-locator-web`, whose markup
 * names no family whatsoever, so `dominantFontStack` returned its own `HOUSE_SANS_STACK` fallback
 * and every word on the page — title included — was set in it.
 *
 * A register's family arrives here as a complete STACK (`fontStack`), not a bare family name, so a
 * stylesheet rule reads one custom property and needs no fallback of its own. Adding these is
 * additive: a stylesheet that does not read them is byte-unchanged.
 */
export function figureVars(regs) {
  const px = (style) => style.fontSize;
  const family = (style) => style.fontFamily;
  return {
    "--title-size": px(regs.display),
    "--title-weight": regs.display.fontWeight,
    "--title-family": family(regs.display),
    "--subtitle-size": px(regs.body),
    "--subtitle-family": family(regs.body),
    "--subtitle-style": regs.body.fontStyle,
    "--source-size": px(regs.body),
    "--source-family": family(regs.body),
    "--axis-size": px(regs.axis),
    "--axis-family": family(regs.axis),
    "--label-size": px(regs.value),
    "--label-weight": regs.value.fontWeight,
    "--label-family": family(regs.value),
    "--note-size": px(regs.annot),
    "--note-family": family(regs.annot),
    "--eyebrow-family": family(regs.eyebrow),
    "--eyebrow-weight": regs.eyebrow.fontWeight,
    "--eyebrow-tracking": regs.eyebrow.letterSpacing,
    "--filter-size": px(regs.body),
  };
}

/**
 * The numeric side of the same registers, for the ONE thing a web beat still measures in node: the
 * y-axis gutter (`measureText` needs a size and a weight, not a CSS string).
 */
export function measurable(direction, name, { family = "chart" } = {}) {
  // `registerOf`, not `resolveRegister`: a gutter is measured in the size the page will DRAW at,
  // which is the cap-height-resolved one. Measuring the filed size and drawing the resolved one is
  // the same class of defect as measuring one face and drawing another.
  const r = registerOf(direction, name, { family });
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
