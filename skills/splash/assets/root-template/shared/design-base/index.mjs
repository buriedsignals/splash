// twin/shared/design-base/index.mjs
//
// THE DESIGN BASE, AS A ROOT RECEIVES IT.
//
// A beat is DIRECTED when it goes through a filed art direction: the direction's ground and accent,
// its six registers resolved against the beat's own text, and the treatments the arbiter says apply
// to the beat's own data. Everything needed for that ships here, so a producer never has to know
// where the twin keeps its records.
//
// The three filed directions travel beside this file as Markdown, byte for byte the records in
// `docs/design-base/directions/`. `filedDirections()` reads them; `resolveDirectionFamilies` fits
// each register's family ladder to the glyphs the beat actually sets; `composeDirections` + `report`
// say which pairings hold up for this beat and which were refused, and why.
//
// Usage inside a beat's `render-directions.mjs`:
//
//   import { filedDirections, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
//   import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
//
//   for (const direction of filedDirections()) {
//     const fitted = resolveDirectionFamilies(direction, textPerRegister);
//     …renderStill({ element: createElement(Beat, { direction: fitted, treatments }) })
//   }

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDirection } from "./read-direction.mjs";

export * from "./read-direction.mjs";
export * from "./resolve-families.mjs";
export * from "./compose.mjs";

/** Where the filed directions sit inside whatever tree this file was installed into. */
export const DIRECTIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "directions");

/**
 * Every filed direction, read and parsed, in filename order.
 *
 * A BEAT RENDERS IN EVERY ONE OF THEM OR IT IS NOT FINISHED. That is not a style preference: a
 * component that only holds together on one ground has hard-coded something it should have derived,
 * and the second direction is what proves it did not. `a-beat-renders-in-every-filed-direction`
 * fails a beat whose `renders/` is missing one.
 */
export function filedDirections() {
  return readdirSync(DIRECTIONS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => readDirection(join(DIRECTIONS_DIR, f)));
}
