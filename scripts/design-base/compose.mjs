// twin/scripts/design-base/compose.mjs
//
// THE COMPOSER PROPOSES; THE JOURNALIST DECIDES.
//
// A filed direction is a coherent whole measured off one published piece. Composing takes parts of
// several — the type of one, the space of another — and that is only safe because every candidate
// goes back through the same three guards a filed direction faces: six registers defined, contrast
// floors on the real ground, glyph coverage against this beat's own text. A candidate that fails is
// dropped WITH ITS REASON, never quietly.
//
// WHAT DRIVES IT, AND WHAT DELIBERATELY DOES NOT.
//
// Not the topic. `skills/palette/references/subject-conventions.md` holds four subject conventions
// and explains at length why only four: a subject-fit choice is worth something only when the
// association is one readers ALREADY hold, which is a measured claim (Lin, Fortuna, Kulkarni, Stone
// & Heer, EuroVis 2013), and "a colour that resonates for the person who picked it and nobody else
// is an arbitrary assignment wearing a justification." No evidence anywhere says a climate story
// wants a serif. A composer that invented topic→typeface mappings would manufacture exactly that.
//
// What drives it instead is measurable:
//   - THE NEWSROOM. Its recorded ground and accent win whenever it has recorded them — which is
//     what `PALETTE.md` already decides for every beat, and says so in prose.
//   - THE BEAT'S OWN FACTS. `BRIEF.md` ranks its evidence; a beat with four ranked levels needs
//     four mutually distinguishable registers, and that is a number, not a taste.
//   - THE CORPUS. Type and space come from directions actually measured on published work.
//
// The output is a SHORT LIST, not a pick. Each candidate carries the provenance of every part and
// the measurements behind it, so a journalist chooses between things they can see the basis of.

import { REGISTERS } from "../../shared/chart-beat/registers.mjs";
import { contrast, TEXT_CONTRAST_MIN, LARGE_TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "../../shared/chart-beat/colour.mjs";
import { deriveFurniture } from "../../shared/chart-beat/render-still.mjs";
import { missingGlyphs } from "../../shared/chart-beat/glyph-coverage.mjs";
import { LADDERS } from "./resolve-families.mjs";

/** SC 1.4.3, relaxed at large sizes. The numbers come from `colour.mjs`. */
function textFloor(size, weight) {
  return size >= 24 || (size >= 18.66 && weight >= 700) ? LARGE_TEXT_CONTRAST_MIN : TEXT_CONTRAST_MIN;
}

/**
 * How far apart two registers are, counted on the axes a reader can actually tell apart. A beat
 * that ranks four levels of evidence needs four registers no two of which read as the same voice.
 */
function registersDiffer(a, b) {
  let axes = 0;
  if (Math.abs(a.size - b.size) >= 2) axes += 1;
  if (a.weight !== b.weight) axes += 1;
  if (a.italic !== b.italic) axes += 1;
  if (a.transform !== b.transform) axes += 1;
  if (Math.abs((a.tracking ?? 0) - (b.tracking ?? 0)) >= 0.8) axes += 1;
  if (a.ink !== b.ink) axes += 1;
  if (a.family !== b.family) axes += 1;
  return axes;
}

/**
 * The number of registers that are mutually distinguishable — every pair differing on at least two
 * axes, so one axis coinciding does not collapse two voices into one.
 */
export function distinguishableRegisters(direction) {
  const names = REGISTERS.filter((n) => direction.registers[n]);
  let worst = Infinity;
  for (let i = 0; i < names.length; i += 1)
    for (let j = i + 1; j < names.length; j += 1)
      worst = Math.min(worst, registersDiffer(direction.registers[names[i]], direction.registers[names[j]]));
  return { count: names.length, worstPairAxes: worst === Infinity ? 0 : worst };
}

/** Every guard a filed direction faces, run on a candidate before it may be offered. */
export function guardDirection(direction, textPerRegister) {
  const problems = [];

  for (const name of REGISTERS)
    if (!direction.registers[name]) problems.push(`no ${name} register`);
  if (problems.length) return problems;

  const furniture = deriveFurniture(direction.ground);
  const inks = { ink: furniture.ink, muted: furniture.muted, accent: direction.accent };

  for (const name of REGISTERS) {
    const r = direction.registers[name];
    const ratio = contrast(inks[r.ink], direction.ground);
    const floor = textFloor(r.size, r.weight);
    if (ratio < floor)
      problems.push(`${name} reads ${ratio.toFixed(2)}:1 on ${direction.ground}, floor ${floor}`);

    // The family here is still a ROLE; the ladder decides the face, and a role whose whole ladder
    // fails this beat's text is a role this candidate cannot honour.
    const ladder = LADDERS[r.family];
    if (ladder) {
      const text = textPerRegister?.[name] ?? "";
      if (text && !ladder.some((family) => missingGlyphs(family, text).length === 0))
        problems.push(`no ${r.family} face can set the ${name} register's text`);
    }
  }

  const accentRatio = contrast(direction.accent, direction.ground);
  if (accentRatio < NON_TEXT_CONTRAST_MIN)
    problems.push(`accent reads ${accentRatio.toFixed(2)}:1 as a mark, floor ${NON_TEXT_CONTRAST_MIN}`);

  return problems;
}

/**
 * A short list of composed candidates for this beat, best first, each guarded.
 *
 * @param {{ground?: string, accent?: string}} newsroom  what the newsroom has recorded
 * @param {Array<object>} filed                          the filed directions
 * @param {{evidenceLevels?: number}} beat               the beat's own facts, from its BRIEF
 * @param {Record<string,string>} textPerRegister        what each register sets on this beat
 */
export function composeDirections({ newsroom, filed, beat = {}, textPerRegister = {} }) {
  const wanted = beat.evidenceLevels ?? 4;
  const offered = [];
  const refused = [];

  for (const type of filed)
    for (const space of filed) {
      // The colour is the newsroom's whenever it has recorded one: `PALETTE.md` already decides
      // this for every beat, with its reasoning written out. A composition does not get to
      // overrule a recorded house palette; where the newsroom has recorded nothing, the type
      // direction's own measured ground is used and said so.
      const ground = newsroom?.ground ?? type.ground;
      const accent = newsroom?.accent ?? type.accent;

      const candidate = {
        id: type.id === space.id ? type.id : `${type.id}+${space.id}`,
        composed: type.id !== space.id || Boolean(newsroom?.ground),
        ground,
        accent,
        pad: space.pad,
        header: space.header,
        headRule: space.headRule,
        stroke: space.stroke,
        registers: type.registers,
        provenance: {
          ground: newsroom?.ground ? "the newsroom's recorded palette" : `${type.id}, measured`,
          accent: newsroom?.accent ? "the newsroom's recorded palette" : `${type.id}, measured`,
          registers: `${type.id}, measured on ${type.measuredFrom}`,
          space: `${space.id}, measured on ${space.measuredFrom}`,
        },
      };

      const problems = guardDirection(candidate, textPerRegister);
      const separation = distinguishableRegisters(candidate);
      if (problems.length) {
        refused.push({ id: candidate.id, problems });
        continue;
      }
      if (separation.worstPairAxes < 2) {
        refused.push({
          id: candidate.id,
          problems: [
            `two of its registers differ on only ${separation.worstPairAxes} axis, so the beat's ` +
              `${wanted} levels of evidence would not read as ${wanted} voices`,
          ],
        });
        continue;
      }
      offered.push({ ...candidate, separation });
    }

  // Best first by how far apart its registers are — the beat's own ranked evidence is what that
  // serves, and it is a count rather than a preference.
  offered.sort((a, b) => b.separation.worstPairAxes - a.separation.worstPairAxes);
  return { offered, refused };
}

/** What the journalist is shown: the short list, the provenance, and what was refused and why. */
export function report({ offered, refused }, { beat = {} } = {}) {
  const lines = [];
  lines.push(
    `${offered.length} art direction${offered.length === 1 ? "" : "s"} hold up for this beat. ` +
      `None is chosen for you.`,
  );
  offered.forEach((c, i) => {
    lines.push("");
    lines.push(`${i + 1}. ${c.id}`);
    lines.push(`   ground ${c.ground} · accent ${c.accent} · ${c.header} header`);
    lines.push(`   colour: ${c.provenance.ground}`);
    lines.push(`   type:   ${c.provenance.registers}`);
    lines.push(`   space:  ${c.provenance.space}`);
    lines.push(
      `   its six registers differ on at least ${c.separation.worstPairAxes} axes pairwise, for ` +
        `${beat.evidenceLevels ?? 4} ranked levels of evidence`,
    );
  });
  if (refused.length) {
    lines.push("");
    lines.push(`${refused.length} were tried and refused:`);
    for (const r of refused) lines.push(`   ${r.id} — ${r.problems.join("; ")}`);
  }
  return lines.join("\n");
}
