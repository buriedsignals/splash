// twin/skills/chart-video/scripts/video-registers.mjs
//
// A DIRECTION'S REGISTERS, DRAWN AT A VIDEO SIZE.
//
// The trunk resolves a register the way the still does — its filed size read as a cap height on
// its role's ladder head, its line as a coefficient of the face's own declared line
// (`registerOf`). What it resolves is a register for a 960×540 still read in an article column. A
// video is watched: the size row's `typeScale` carries it to the frame, and `minTypePx` is the
// floor no register may be drawn under (`sizes.mjs` states where 30 and 36 come from).
//
// THE FLOOR LIFTS THE WHOLE LADDER, NOT THE SMALLEST RUNG. A register that scaled to under the
// floor used to be clamped to it ON ITS OWN, which moved that one register relative to the other
// five and could invert the hierarchy `registerOf` built (an eyebrow lifted past the body it sits
// under). Instead ONE factor governs every register: `k = max(typeScale, minTypePx / the smallest
// resolved size among the six)`. Every register's drawn size is `resolved.fontSize * k` — so a
// direction whose smallest register would otherwise fall under the floor has its ENTIRE ladder
// scaled up together, and the size order `registerOf` established survives intact.
//
// THE LEAD TRAVELS, IN PIXELS. `shared/design-base/web.mjs` turns a register into a style and
// drops the leading without a word; a composition reading this object cannot, because `lead` is
// one of the fields it draws with.
//
// NO `#shared/*` IMPORT HERE. This module never calls `registerOf` itself — it takes an object of
// already-resolved registers. A beat reaches `#shared/design-base/register.mjs` legitimately (it is
// the one place a beat is allowed to cross the skill boundary, the same way `render-still.mjs`
// reaches `#shared/chart-beat/render-still.mjs`); this seam stays inside the skill so it can be
// carried into `map-beat` by a plain `// twin/` copy with nothing to re-point.
//
// Runs in Bun only: `registerOf`, upstream of this, measures through resvg, which no browser bundle
// can load. The composition receives the scaled result as props.

import { sizeFor } from "./sizes.mjs";

/**
 * @param {{fontFamily: string, fontSize: number, fontWeight: number, fontStyle: string,
 *          letterSpacing: number, transform: string, lineHeight: number, fill: string}} resolved
 *        a register as `registerOf` returns it — `lineHeight` is a multiple of the size
 * @param {number} k  the one factor every register in this direction's ladder is scaled by —
 *        `max(typeScale, minTypePx / the smallest resolved size)`, computed once by
 *        `videoRegistersOf` across all six registers, never per register
 */
export function scaleRegister(resolved, k) {
  const fontSize = Math.round(resolved.fontSize * k * 100) / 100;
  return {
    fontFamily: resolved.fontFamily,
    fontSize,
    fontWeight: resolved.fontWeight,
    fontStyle: resolved.fontStyle,
    letterSpacing: (resolved.letterSpacing * fontSize) / resolved.fontSize,
    transform: resolved.transform,
    lead: resolved.lineHeight * fontSize,
    fill: resolved.fill,
  };
}

/**
 * Every register of a direction, already resolved by the beat's own `registerOf` calls, scaled to
 * `sizeName`.
 *
 * @param {{display: object, eyebrow: object, body: object, annot: object, value: object, axis: object}} resolvedByName
 *        one `registerOf(direction, name)` result per register name — resolved outside this module,
 *        by a beat that has already been through `resolveDirectionFamilies`.
 * @param {string} sizeName  one of `sizeFor`'s three rows
 */
export function videoRegistersOf(resolvedByName, sizeName) {
  const { typeScale, minTypePx } = sizeFor(sizeName);
  const smallest = Math.min(...Object.values(resolvedByName).map((r) => r.fontSize));
  const k = Math.max(typeScale, minTypePx / smallest);
  return Object.fromEntries(
    Object.entries(resolvedByName).map(([name, resolved]) => [name, scaleRegister(resolved, k)]),
  );
}
