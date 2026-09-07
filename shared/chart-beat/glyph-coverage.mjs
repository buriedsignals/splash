// twin/shared/chart-beat/glyph-coverage.mjs
//
// A FAMILY THAT CANNOT SET THE TEXT IS REFUSED BEFORE THE RENDER, NOT AFTER.
//
// THE DEFECT, MEASURED 2026-09-07. `CO2` sets in the requested family at the requested weight.
// `CO₂` — one subscript, U+2082 — drops the ENTIRE text run to a fallback face and loses the
// requested weight with it. Superclarendon, Iowan Old Style and Futura, three for three, and the
// render exits zero. Nothing anywhere goes red, and a delivered title silently arrives in a font
// nobody chose.
//
// It does not bite today only because `render-still.mjs`'s default is
// `Helvetica, Arial, sans-serif`, which covers the subscript. It bites the day a newsroom records a
// display serif — which is exactly the day the design base's directions axis opens
// (`docs/design-base/directions/`).
//
// THE DETECTION IS EXACT, NOT A HEURISTIC. Two families that differ on a control string cannot
// produce an IDENTICAL width for the same glyph unless both fell back to the same face. Measured at
// 100px — control "Ho": Superclarendon 149.0, Iowan Old Style 131.3, Futura 128.8, Helvetica 123.8,
// Georgia 131.9, Baskerville 126.6, all distinct. Then "₂": Superclarendon, Iowan and Futura all
// exactly 42.4, while Helvetica reads 25.7, Georgia 43.9, Baskerville 26.9. The three that collapse
// are the three that lack it. "→" reads 78.3 in all six: nobody has it.
//
// WHY NOT COMPARE AGAINST A NONEXISTENT FAMILY, which would be simpler: measured, it does not work.
// A missing FAMILY and a missing GLYPH resolve to different fallback faces — "CO₂" measures 623.3
// in the three real families that lack the subscript and 634.8 under a family name that does not
// exist at all. The nonexistent-family probe reports every real family as fine.
//
// WHY NOT READ THE FONT'S cmap, which would be ground truth: it needs the font FILE, and resvg
// resolves families through `loadSystemFonts` without exposing a path. Locating and parsing every
// system face to answer a question the rasteriser can already answer is a second font stack to keep
// in step with the first. If a path-resolving route ever lands, this file is where it goes.

import { measureText } from "./render-still.mjs";

/**
 * The panel a family is measured against. They are chosen to have DIFFERENT metrics from each other
 * — verified by `CONTROL` below — so a collapse between any two of them is a real signal rather
 * than a coincidence of design.
 */
const PROBE_FAMILIES = Object.freeze([
  "Superclarendon",
  "Iowan Old Style",
  "Futura",
  "Helvetica",
  "Georgia",
  "Baskerville",
]);

/** A string every Latin family carries, used to establish that two families really do differ. */
const CONTROL = "Ho";

/** Large enough that two faces' widths separate well beyond any rounding. */
const PROBE_SIZE = 100;

/** Two widths this close are the same width. */
const SAME = 0.01;

/**
 * How many probe families a family must COLLAPSE WITH before a character is called missing.
 *
 * ONE, and the first version of this file said two — which was wrong, and produced false negatives.
 * The reasoning behind two was that a single collapse might be a coincidence of design. A sweep
 * across 264 family-character pairs found the case and settled it: `⁰` (U+2070) measures **51.5 in
 * both Superclarendon and Futura** while the other four probes read 34.1, 25.7, 45.1 and 25.8. Two
 * faces that differ by 20px on the control do not agree to a hundredth of a pixel on a glyph by
 * accident — they agree because they both fell back to the same face. At a threshold of two, both
 * were reported as covering a character neither has.
 *
 * A collapse with one differently-metricked family IS the signal. The sweep's own distribution says
 * so: of 264 pairs, 226 collapsed with nobody, and every non-zero count was a real fallback.
 */
const COLLAPSES_NEEDED = 1;

const widthOf = (family, text) => measureText(text, { fontSize: PROBE_SIZE, fontFamily: family });

/** `U+2082`, the way a code point is written where a person has to read it. */
export function codePointOf(character) {
  return "U+" + character.codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
}

/** Characters this system never asks a family about: they are structure, not glyphs a design
 *  chooses, and every family carries them. */
function isPlainAscii(character) {
  const code = character.codePointAt(0);
  return code >= 0x20 && code <= 0x7e;
}

/**
 * The code points in `text` that `family` cannot set, in the order they first appear.
 *
 * @param {string} family
 * @param {string} text
 * @returns {string[]} e.g. `["U+2082"]`
 */
export function missingGlyphs(family, text) {
  if (!family || !text) return [];

  const missing = [];
  const seen = new Set();

  for (const character of text) {
    if (isPlainAscii(character) || seen.has(character)) continue;
    seen.add(character);

    const mine = widthOf(family, character);
    let collapses = 0;

    for (const probe of PROBE_FAMILIES) {
      if (probe === family) continue;
      // The probe only counts if it really is a different face: two names resolving to one file
      // would collapse on every glyph and accuse the family of lacking all of them.
      //
      // UNPROVEN. No pair on this machine triggers it — casing variants resolve to different
      // fallbacks, and the only exact control match found was a family against itself, which the
      // line above already excludes. It is kept as a cheap defence and labelled as untested rather
      // than presented as measured.
      if (Math.abs(widthOf(family, CONTROL) - widthOf(probe, CONTROL)) < SAME) continue;
      if (Math.abs(mine - widthOf(probe, character)) < SAME) collapses += 1;
    }

    if (collapses >= COLLAPSES_NEEDED) missing.push(codePointOf(character));
  }

  return missing;
}

/** Whether `family` can set every character of `text`. */
export function familyCovers(family, text) {
  return missingGlyphs(family, text).length === 0;
}

/**
 * Refuse a family that cannot set the text it is being handed.
 *
 * @param {string} family
 * @param {string} text
 * @param {{where?: string}} options  where the text is being set, so the message names the caller
 */
export function assertCoversText(family, text, { where = "this text" } = {}) {
  const missing = missingGlyphs(family, text);
  if (missing.length === 0) return;
  throw new Error(
    `the family "${family}" cannot set ${where}: it has no glyph for ${missing.join(", ")}. ` +
      `One missing code point drops the WHOLE text run to a fallback face and loses the requested ` +
      `weight with it, silently — so the family is refused here rather than in the delivered file.`,
  );
}
