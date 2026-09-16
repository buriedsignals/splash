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
import { typefaceFile } from "#shared/chart-beat/typefaces.mjs";

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
 * THE NEWSROOM'S OWN FACES, AND THE ONLY WAY THEY REACH A RENDER.
 *
 * THE DEFECT, MEASURED ON THE COLD RUN OF 2026-09-15. `NEWSROOM.md` declared `typefaces: Space
 * Grotesk, Courier New`; the composed direction was set in Merriweather and Open Sans; and the
 * report said nothing at all. A profile field a newsroom fills in and the tree then ignores is
 * worse than a field that does not exist: it reads as a promise. Either the house face is used, or
 * the run says which face it could not use and why — there is no third outcome.
 *
 * WHY THE LIST IS A LADDER AND NOT A ROLE MAP. `NEWSROOM.md` says "the house fonts, most prominent
 * first" and nothing more: it does not say which of them is the newsroom's serif and which its
 * mono, and no measurement here could tell us. So the list is walked in its declared order against
 * the DIRECTION'S OWN roles in ITS prominence order — the role the `display` register sets first,
 * then each further role as `REGISTERS` reaches it. The most prominent house face sets the most
 * prominent voice. A role for which the list is exhausted keeps its ladder, so a newsroom that
 * declares one face still gets it on its display and a corpus face everywhere else, and the two
 * stay two families — which is one of the axes `distinguishableRegisters` counts.
 *
 * NOTHING IS RELAXED TO LET A FACE THROUGH. A house face faces the same two questions every ladder
 * candidate faces, and one more that a ladder never has to ask because every ladder entry was
 * checked when the ladder was written:
 *   - IS THERE A FILE — at every weight and slant the role's registers actually ask for. `Courier
 *     New` is not a Google family; Google answers the name with no TrueType face, and that is what
 *     "not installed" looks like from here.
 *   - DOES IT COVER the words those registers set on this beat, read out of the face's own cmap.
 * A face that fails either is refused BY NAME AND WITH THE REASON, and is out of the ladder for the
 * rest of this direction: a face that cannot set the beat's most prominent words is not this beat's
 * house face, and quietly demoting it to the axis labels would be a taste decision wearing a
 * fallback's clothes.
 *
 * @param {object} direction  a filed direction, its registers still carrying roles
 * @param {string[]} faces    the newsroom's declared families, most prominent first
 * @param {Record<string, string>} textPerRegister  what each register sets on this beat
 * @returns {{families: Record<string, string>, used: Array<{role: string, family: string, registers: string[]}>, refused: Array<{family: string, reason: string}>}}
 */
export function assignHouseFaces(direction, faces, textPerRegister = {}) {
  const order = [];
  const registersOfRole = new Map();
  for (const name of REGISTERS) {
    const spec = direction?.registers?.[name];
    if (!spec) continue;
    if (!registersOfRole.has(spec.family)) {
      registersOfRole.set(spec.family, []);
      order.push(spec.family);
    }
    registersOfRole.get(spec.family).push(name);
  }

  const families = {};
  const used = [];
  const refused = [];
  const ladder = (faces ?? []).map((face) => String(face).trim()).filter(Boolean);
  let next = 0;

  for (const role of order) {
    const names = registersOfRole.get(role);
    const text = names.map((name) => textPerRegister?.[name] ?? "").join("");
    while (next < ladder.length) {
      const family = ladder[next];
      next += 1;
      const reason = whyAFaceCannotServe(family, names.map((name) => direction.registers[name]), text);
      if (reason) {
        refused.push({ family, reason });
        continue;
      }
      families[role] = family;
      used.push({ role, family, registers: names });
      break;
    }
  }
  return { families, used, refused };
}

/** Why `family` cannot set these registers' words on this beat, or `null` when it can. */
function whyAFaceCannotServe(family, specs, text) {
  try {
    typefaceFile(family, 400);
  } catch (error) {
    return /no font file for/.test(error.message)
      ? "not installed — Google Fonts serves no face under that name"
      : error.message.split("\n")[0];
  }
  const wanted = new Map();
  for (const spec of specs) wanted.set(`${spec.weight}${spec.italic ? "i" : ""}`, spec);
  for (const spec of wanted.values()) {
    try {
      typefaceFile(family, spec.weight, { italic: Boolean(spec.italic) });
    } catch (error) {
      return `refused at ${spec.weight}${spec.italic ? " italic" : ""}, which these registers ask for — ${error.message.split("\n")[0]}`;
    }
  }
  const missing = missingGlyphs(family, text);
  if (missing.length) return `no coverage for this beat's words — it has no ${missing.slice(0, 4).join(", ")}`;
  return null;
}

/**
 * A filed direction with every register's abstract role replaced by a concrete family that covers
 * this beat's own text. A register whose family is ALREADY concrete — the newsroom's own face, put
 * there by `assignHouseFaces`, or a direction delivered with its families resolved — keeps it, and
 * is held to the same coverage question rather than excused from it.
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
    if (!LADDERS[spec.family] && spec.familySource === "newsroom") {
      const why = whyAFaceCannotServe(spec.family, [spec], text);
      if (why) throw new Error(`the ${name} register's house face "${spec.family}" cannot set this beat: ${why}`);
      registers[name] = { ...spec };
      decisions.push({ register: name, role: spec.family, family: spec.family, refused: [], source: "newsroom" });
      continue;
    }
    const { family, refused } = resolveFamily(spec.family, text);
    registers[name] = { ...spec, family };
    decisions.push({ register: name, role: spec.family, family, refused });
  }
  return { ...direction, registers, decisions };
}
