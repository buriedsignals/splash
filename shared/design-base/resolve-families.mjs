// twin/shared/design-base/resolve-families.mjs
//
// A DIRECTION NAMES A ROLE; THIS PICKS THE FACE.
//
// A filed direction records `serif`, `sans` or `geometric sans` — a measurement of what the
// reference did, not an instruction to install ABC's licensed faces. Something has to turn that
// role into a family the rasteriser can actually set, and the choice is not free: the face must
// COVER the text it is asked to set, or one missing code point drops the whole run to a fallback
// and loses the weight with it (`glyph-coverage.mjs`).
//
// So the ladder is walked in order and each candidate is asked the coverage question against THIS
// BEAT'S OWN TEXT, read out of the face's own cmap. On a beat whose title carries `CO₂`, that
// visibly changes the answer: Lato and Roboto Slab have no U+2082, so they are refused and the role
// resolves further down the ladder. The guard is not decorative — it decides the typeface.
//
// It reads the corpus's abstract roles, which exist only in this repository. A delivered root
// carries a direction whose families are already concrete.

import { missingGlyphs } from "#shared/chart-beat/glyph-coverage.mjs";
import { REGISTERS } from "#shared/chart-beat/registers.mjs";

/**
 * CANDIDATES PER ROLE, BEST FIRST — AND EVERY ONE IS A GOOGLE FONT THAT MAPTILER SERVES.
 *
 * THE OLD LADDERS SAID THE OPPOSITE AND THE REASONING INVERTED ITSELF. They ran Superclarendon,
 * Iowan Old Style, Avenir Next and Futura, under the note that "a direction that needs a licensed
 * font is a direction no reader outside that newsroom can be shown". Every one of those is a face
 * macOS ships — which means every one is licensed to Apple, redistributable by nobody, and absent
 * from every Linux and Windows machine a newsroom might render on. A direction resolved to one of
 * them could be shown HERE and nowhere else.
 *
 * Google Fonts invert it back: redistributable, fetchable, and a catalogue wide enough that a
 * newsroom installs nothing. `typefaces.mjs` turns a family on these ladders into a `.ttf` on disk,
 * and `render-still.mjs` hands that file to resvg with `loadSystemFonts: false`, so what a reader
 * sees does not depend on what the rendering machine happens to have.
 *
 * AND THE CHOICE IS BOUNDED BY THE MAP, not by taste alone. MapLibre draws no system font: it reads
 * signed distance fields served by the style host, and MapTiler Cloud serves eighteen families of
 * which SEVENTEEN are Google Fonts (`shared/map-beat/glyphs.mjs` holds the probe). Every family
 * below is one of those seventeen, so a map label and the panel label beside it are the same design
 * — one served as glyphs, one fetched as a file — with no SDF baking anywhere. A beat that files a
 * family outside the seventeen still needs `bakeGlyphs`; nothing here does.
 *
 * WHY EACH LADDER IS ORDERED THE WAY IT IS. The role comes first — a `geometric sans` headed by a
 * slab serif would be wrong however well it covers — and coverage decides the ties. Measured from
 * the cmaps on 2026-09-12: Lato, Roboto Slab and Roboto Mono have no U+2082, so `CO₂` would drop
 * them; Merriweather, Noto Serif, Inter, Montserrat and Source Sans 3 carry everything this
 * repository's beats set, arrows included. Source Sans 3 sits low on the sans ladder for a reason
 * that is not typographic: MapTiler serves it under its old name, `Source Sans Pro`, so a beat that
 * resolved to it would have to name the face differently on the two sides.
 */
export const LADDERS = Object.freeze({
  serif: ["Merriweather", "Noto Serif", "PT Serif", "Libre Baskerville", "Roboto Slab"],
  sans: ["Open Sans", "Inter", "Roboto", "Nunito", "PT Sans", "Ubuntu", "Lato", "Source Sans 3"],
  "geometric sans": ["Montserrat", "Rubik", "Nunito", "Inter"],
});

/**
 * The first family on the role's ladder that can set every character of `text`.
 *
 * @param {string} role   `serif` | `sans` | `geometric sans`
 * @param {string} text   everything this register will be asked to set on this beat
 * @returns {{family: string, refused: Array<{family: string, missing: string[]}>}}
 */
export function resolveFamily(role, text) {
  const ladder = LADDERS[role];
  if (!ladder) throw new Error(`no ladder for the role "${role}" — the roles are ${Object.keys(LADDERS).join(", ")}`);

  const refused = [];
  for (const family of ladder) {
    const missing = missingGlyphs(family, text);
    if (missing.length === 0) return { family, refused };
    refused.push({ family, missing });
  }
  throw new Error(
    `no family on the ${role} ladder can set this beat's text. Refused: ` +
      refused.map((r) => `${r.family} (${r.missing.join(", ")})`).join("; "),
  );
}

/**
 * A filed direction with every register's abstract role replaced by a concrete family that covers
 * this beat's own text.
 *
 * @param {object} direction  as read by `read-direction.mjs`
 * @param {Record<string, string>} textPerRegister  what each register will set on this beat
 */
export function resolveDirectionFamilies(direction, textPerRegister) {
  const registers = {};
  const decisions = [];
  for (const name of REGISTERS) {
    const spec = direction.registers[name];
    const text = textPerRegister[name] ?? "";
    const { family, refused } = resolveFamily(spec.family, text);
    registers[name] = { ...spec, family };
    decisions.push({ register: name, role: spec.family, family, refused });
  }
  return { ...direction, registers, decisions };
}
