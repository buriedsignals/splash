// twin/skills/chart-video/scripts/video-registers.mjs
//
// A DIRECTION'S REGISTERS, DRAWN AT A VIDEO SIZE.
//
// The trunk resolves a register the way the still does — its filed size read as a cap height on
// its role's ladder head, its line as a coefficient of the face's own declared line
// (`registerOf`). What it resolves is a register for a 960×540 still read in an article column. A
// video is watched: the size row's `typeScale` carries it to the frame, and `minTypePx` is the
// floor no register may be drawn under (`sizes.mjs` states where 30 and 36 come from). A register
// the scale leaves under the floor is lifted to it, and led on the size it is actually drawn at.
//
// THE LEAD TRAVELS, IN PIXELS. `shared/design-base/web.mjs` turns a register into a style and
// drops the leading without a word; a composition reading this object cannot, because `lead` is
// one of the fields it draws with.
//
// Runs in Bun only: `registerOf` measures through resvg, which no browser bundle can load. The
// composition receives the result as props.

import { registerOf } from "#shared/design-base/register.mjs";
import { REGISTERS } from "#shared/chart-beat/registers.mjs";
import { sizeFor } from "#shared/chart-video/sizes.mjs";

/**
 * @param {{fontFamily: string, fontSize: number, fontWeight: number, fontStyle: string,
 *          letterSpacing: number, transform: string, lineHeight: number, fill: string}} resolved
 *        a register as `registerOf` returns it — `lineHeight` is a multiple of the size
 * @param {{typeScale: number, minTypePx: number}} row  a row of the video size table
 */
export function scaleRegister(resolved, { typeScale, minTypePx }) {
  const fontSize = Math.max(Math.round(resolved.fontSize * typeScale * 100) / 100, minTypePx);
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

/** Every register of a direction that has been through `resolveDirectionFamilies`, at `sizeName`. */
export function videoRegistersOf(direction, sizeName) {
  const row = sizeFor(sizeName);
  return Object.fromEntries(REGISTERS.map((name) => [name, scaleRegister(registerOf(direction, name), row)]));
}
