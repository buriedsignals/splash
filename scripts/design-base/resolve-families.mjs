// twin/scripts/design-base/resolve-families.mjs
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
// BEAT'S OWN TEXT. On the Swiss CO₂ beat, whose title carries `CO₂`, that visibly changes the
// answer: Superclarendon and Iowan Old Style are refused, and the serif role resolves further down
// the ladder. The guard is not decorative — it decides the typeface.
//
// It lives in `scripts/` because it reads the corpus's abstract roles, which exist only here. A
// delivered root carries a direction whose families are already concrete.

import { missingGlyphs } from "../../shared/chart-beat/glyph-coverage.mjs";
import { REGISTERS } from "../../shared/chart-beat/registers.mjs";

/**
 * Candidates per role, best first. Every one is a face macOS ships, because a direction that needs
 * a licensed font is a direction no reader outside that newsroom can be shown.
 */
export const LADDERS = Object.freeze({
  serif: ["Superclarendon", "Iowan Old Style", "Georgia", "Baskerville", "Palatino", "Times New Roman"],
  sans: ["Avenir Next", "Helvetica Neue", "Optima", "Helvetica"],
  "geometric sans": ["Futura", "Avenir Next", "Helvetica Neue", "Helvetica"],
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
