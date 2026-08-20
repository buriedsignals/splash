/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`.
 *
 *  Unlike most `detect-*.mjs` files, this one does not walk a DELIVERED artefact after the fact —
 *  `framingMeasurement` (`render-still.mjs`) is called by a beat's own `render.mjs`, on the values
 *  it is about to draw, and its two numbers are printed to the terminal there, before the render —
 *  a reading, never a refusal. This file exists so the capability is DECLARED, the same
 *  `GUARDS`-array convention every other guard and capability in this skill already uses. */
export const GUARDS = ["framingMeasurement"];

export { framingMeasurement } from "./render-still.mjs";
