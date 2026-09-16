// twin/shared/design-base/compose.mjs
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
//     what `PALETTE.md` already decides for every beat, and says so in prose. Its recorded
//     TYPEFACES win the same way, on the same terms: a declared face sets the registers it can
//     serve, and one that cannot is named with its reason in the report rather than dropped.
//   - THE BEAT'S OWN FACTS. `BRIEF.md` ranks its evidence; a beat with four ranked levels needs
//     four mutually distinguishable registers, and that is a number, not a taste.
//   - THE CORPUS. Type and space come from directions actually measured on published work.
//
// The output is a SHORT LIST, not a pick. Each candidate carries the provenance of every part and
// the measurements behind it, so a journalist chooses between things they can see the basis of.

import { REGISTERS } from "#shared/chart-beat/registers.mjs";
import { contrast, TEXT_CONTRAST_MIN, LARGE_TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { missingGlyphs } from "#shared/chart-beat/glyph-coverage.mjs";
import { assignHouseFaces, LADDERS } from "./resolve-families.mjs";
import {
  hsl,
  hueGap,
  SAME_POLE_DEGREES,
  CHROMATIC_MIN_CHROMA,
  RAMP_MIN_LIGHTNESS_SPAN,
} from "./colour-space.mjs";
import { channels } from "#shared/chart-beat/colour.mjs";

/**
 * How many candidates a journalist is shown. Three, because the spec says two or three and because
 * a short list that is not short is a search result.
 */
const OFFER_LIMIT = 3;

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
    const text = textPerRegister?.[name] ?? "";
    if (ladder) {
      if (text && !ladder.some((family) => missingGlyphs(family, text).length === 0))
        problems.push(`no ${r.family} face can set the ${name} register's text`);
    } else if (r.familySource === "newsroom" && text) {
      // A CONCRETE FACE THE NEWSROOM PUT HERE IS ASKED THE SAME QUESTION, not excused from it
      // because there is no ladder behind it to walk. `assignHouseFaces` has already refused a
      // face that cannot serve, so this is the second lock rather than the first — a caller that
      // hands a house-faced direction straight to the guard still gets it checked.
      const missing = missingGlyphs(r.family, text);
      if (missing.length)
        problems.push(`the newsroom's ${r.family} cannot set the ${name} register's text (${missing.slice(0, 4).join(", ")})`);
    }
  }

  const accentRatio = contrast(direction.accent, direction.ground);
  if (accentRatio < NON_TEXT_CONTRAST_MIN)
    problems.push(`accent reads ${accentRatio.toFixed(2)}:1 as a mark, floor ${NON_TEXT_CONTRAST_MIN}`);

  return problems;
}

/**
 * THE PALETTES A COMPOSITION MAY DRAW FROM.
 *
 * One entry per filed direction, carrying its ground, its accent, and — this is the part that was
 * missing — WHERE EACH CAME FROM. A record that says nothing is claiming both were measured, the
 * same default `read-direction.mjs` applies, because a default that excused a colour from its
 * evidence would hollow the base out one unstated field at a time.
 *
 * `whole` marks a ground and accent that were published together. A pairing a designer shipped is
 * a different kind of fact from two colours we put side by side, and the composer ranks it above
 * ours. Not because ours is worse — it may be better — but because one is evidence and one is a
 * proposal, and the journalist is entitled to see which they are looking at.
 */
export function palettesFrom(filed) {
  return filed.map((direction) => ({
    from: direction.id,
    measuredFrom: direction.measuredFrom,
    ground: direction.ground,
    accent: direction.accent,
    groundSource: direction.groundSource ?? "measured",
    accentSource: direction.accentSource ?? "measured",
    whole: true,
  }));
}

/**
 * THE PALETTES THE CORPUS ITSELF CARRIES — every reference measured on its own graphic.
 *
 * Three filed directions is a menu, not a composition, and that is what the owner said when he was
 * shown three hex values to pick between. Eighty references have been measured on their own graphic
 * and every one of them carries a ground and a set of chromatic poles; none of them was reachable.
 *
 * The accent is the piece's **most-used colour after its ground**, which is a measurement rather
 * than a reading — `readPixelPalette` already sorts the chromatic set by coverage. It is not always
 * what a designer would call the accent, and it does not need to be: every candidate faces the same
 * contrast floors, and what survives is offered with the piece it came from named beside it.
 *
 * A record that measured no graphic contributes nothing. That is the whole point of the repair
 * behind it: a palette read off a page is the site's navigation and its cookie strip.
 *
 * @param {Array<{id: string, family: string, record: object}>} references
 */
export function palettesFromCorpus(references) {
  const out = [];
  for (const { id, family, record } of references) {
    if (record?.routes?.pixel?.measuredFrom !== "graphic.png") continue;
    const ground = record.pixel?.ground?.hex;
    const accent = record.pixel?.chromatic?.[0]?.hex;
    if (!ground || !accent) continue;
    out.push({
      from: `${family}/${id}`,
      measuredFrom: id,
      ground,
      accent,
      groundSource: "measured",
      accentSource: "measured",
      // Published together, on one graphic, by one designer.
      whole: true,
      coverage: record.pixel.chromatic[0].share,
    });
  }
  return out;
}

/** How a colour is described to the journalist: never "measured" about something a person chose. */
function provenanceOf(value, source, from, measuredFrom) {
  return source === "measured"
    ? `${from}, measured on ${measuredFrom}`
    : `${from}, chosen by its author — this colour is not in ${measuredFrom}`;
}

/**
 * TWO CANDIDATES THAT LOOK THE SAME ARE ONE CANDIDATE.
 *
 * MEASURED. The first run against the whole corpus offered a journalist three art directions of
 * which two were `#3274D9` and `#3274DA` on `#FFFFFF` — the same Ferdio blue on the same white,
 * under the same type and the same space, from two panels of one publication. Every guard passed on
 * both. A short list of three where two are the same thing is the same failure as no choice at all,
 * arrived at from the other direction.
 *
 * The threshold is the corpus's own: `SAME_POLE_DEGREES`, which is what `readPixelPalette` uses to
 * decide whether two colours in a graphic are one pole. Two accents inside it, on one ground, under
 * one type and one space, are one proposal.
 */
function looksLike(a, b) {
  if (a.ground !== b.ground) return false;
  if (a.provenance.registers !== b.provenance.registers) return false;
  if (a.provenance.space !== b.provenance.space) return false;
  const one = toHsl(a.accent);
  const two = toHsl(b.accent);
  // A near-neutral accent has no meaningful hue — 3° apart means nothing at zero chroma — so there
  // it is lightness that separates two of them. Both thresholds are the corpus's own.
  const chromatic =
    Math.min(one.chroma, two.chroma) >= CHROMATIC_MIN_CHROMA;
  const closeInLightness =
    Math.abs(one.l - two.l) < RAMP_MIN_LIGHTNESS_SPAN;
  return chromatic
    ? hueGap(one.h, two.h) < SAME_POLE_DEGREES && closeInLightness
    : closeInLightness;
}

function toHsl(hex) {
  const [r, g, b] = channels(hex);
  return hsl(r, g, b);
}

/**
 * A short list of composed candidates for this beat, best first, each guarded.
 *
 * COLOUR IS AN AXIS LIKE THE OTHER TWO. The first version crossed type against space and took the
 * ground and accent wholesale from the type direction, so a palette could only ever appear beside
 * the type it was measured with. That is not composition, it is a menu of the pieces already
 * harvested — which is exactly what the owner said when he was shown three hex values to choose
 * between.
 *
 * Widening the search does not widen what passes: every candidate still faces the same three
 * guards a filed direction faces, on its own real ground.
 *
 * @param {{ground?: string, accent?: string, typefaces?: string[]|string}} newsroom  what the newsroom has recorded
 * @param {Array<object>} filed                          the filed directions
 * @param {Array<object>} [palettes]                     colour candidates; the filed ones by default
 * @param {{evidenceLevels?: number}} beat               the beat's own facts, from its BRIEF
 * @param {Record<string,string>} textPerRegister        what each register sets on this beat
 */
export function composeDirections({
  newsroom,
  filed,
  palettes = palettesFrom(filed),
  beat = {},
  textPerRegister = {},
  limit = OFFER_LIMIT,
}) {
  const wanted = beat.evidenceLevels ?? 4;
  const offered = [];
  const refused = [];

  // THE NEWSROOM'S RECORDED FACES ARE NOT A CANDIDATE AMONG MANY EITHER. The colour axis already
  // collapses to a house that recorded one; type does the same, for the same reason and with the
  // same limit — a house face enters only where it passes the base's own guards, and every face
  // that cannot is named with its reason in `typefaces.refused` so the report can say so. A
  // newsroom that records no typefaces changes nothing: every register keeps its role's ladder.
  const houseFaces = houseTypefacesOf(newsroom);
  const houseType = new Map();
  const faceRefusals = [];
  for (const type of filed) {
    const assignment = houseFaces.length
      ? assignHouseFaces(type, houseFaces, textPerRegister)
      : { families: {}, used: [], refused: [] };
    houseType.set(type.id, assignment);
    // ONE LINE PER FACE, not one per direction it was tried against: the same face refused for the
    // same reason three times over is one fact a journalist has to read once.
    for (const entry of assignment.refused)
      if (!faceRefusals.some((seen) => seen.family === entry.family)) faceRefusals.push(entry);
  }

  // The newsroom's recorded palette is not one candidate among many: where it exists it is THE
  // palette, and the colour axis collapses to it. `PALETTE.md` already decides this for every beat,
  // with its reasoning written out, and a wider search is not a licence to overrule a house.
  const housePalette =
    newsroom?.ground || newsroom?.accent
      ? [
          {
            from: "the newsroom",
            ground: newsroom.ground,
            accent: newsroom.accent,
            groundSource: "newsroom",
            accentSource: "newsroom",
            whole: true,
          },
        ]
      : palettes;

  for (const type of filed)
    for (const space of filed)
      for (const palette of housePalette) {
        const sameThroughout = type.id === space.id && palette.from === type.id;
        const house = houseType.get(type.id);
        const registers = house.used.length ? inHouseFaces(type.registers, house.families) : type.registers;
        const candidate = {
          // THREE SLOTS, ALWAYS, WHEN ANYTHING IS COMPOSED. A first version deduplicated the
          // names, and `creme` type + `nocturne` space + `creme` palette collided with the same
          // pair carrying `nocturne`'s palette: two different candidates, one id, and the second
          // silently indistinguishable in the report the journalist reads.
          id: sameThroughout
            ? type.id
            : `${type.id}/${space.id}/${palette.from}`,
          composed: !sameThroughout,
          ground: palette.ground,
          accent: palette.accent,
          // `whole` travels with the palette: a ground and accent published together are evidence,
          // a pair we put side by side is a proposal, and the ranking below keeps them apart.
          palette: { from: palette.from, whole: Boolean(palette.whole) },
          pad: space.pad,
          header: space.header,
          headRule: space.headRule,
          stroke: space.stroke,
          registers,
          typefaces: { used: house.used, refused: house.refused },
          provenance: {
            ground:
              palette.groundSource === "newsroom"
                ? "the newsroom's recorded palette"
                : provenanceOf(palette.ground, palette.groundSource, palette.from, palette.measuredFrom),
            accent:
              palette.accentSource === "newsroom"
                ? "the newsroom's recorded palette"
                : provenanceOf(palette.accent, palette.accentSource, palette.from, palette.measuredFrom),
            registers:
              `${type.id}, measured on ${type.measuredFrom}` +
              (house.used.length
                ? `, set in the newsroom's ${house.used.map((u) => `${u.family} (${u.registers.join(", ")})`).join(" and ")}`
                : ""),
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

  // BEST FIRST, ON TWO COUNTS AND NO TASTE.
  //
  // First: a palette published as one whole outranks a pair we assembled. Not because ours is
  // worse — it may well be better, and the journalist can pick it — but because one is evidence
  // and the other is a proposal, and a list that mixed them without ordering would hide which is
  // which. Second, among equals: how far apart the registers read, which is what serves the beat's
  // own ranked evidence, and which is a count rather than a preference.
  offered.sort(
    (a, b) =>
      Number(b.palette.whole) - Number(a.palette.whole) ||
      b.separation.worstPairAxes - a.separation.worstPairAxes,
  );
  // A SHORT LIST STAYS SHORT. Opened to the corpus this loop considers hundreds of combinations,
  // and handing a journalist two hundred legal art directions is the same failure as handing them
  // one: neither is a choice a person can actually make. What is cut is recorded, so the count the
  // report prints is the number that held up, not the number shown.
  const held = offered.length;
  const shortList = [];
  let alike = 0;
  for (const candidate of offered) {
    if (shortList.length >= limit) break;
    if (shortList.some((taken) => looksLike(taken, candidate))) {
      alike += 1;
      continue;
    }
    shortList.push(candidate);
  }
  return {
    offered: shortList,
    refused,
    held,
    alike,
    // WHAT BECAME OF EVERY DECLARED HOUSE FACE, whether or not one reached a candidate. A run that
    // used none and said nothing is the defect this field exists to end.
    typefaces: {
      declared: houseFaces,
      used: shortList.flatMap((c) => c.typefaces?.used ?? []),
      refused: faceRefusals,
    },
  };
}

/** The newsroom's declared families, most prominent first — a list or the profile's comma string. */
export function houseTypefacesOf(newsroom) {
  const raw = newsroom?.typefaces;
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : String(raw).split(",");
  return items.map((item) => String(item).trim()).filter(Boolean);
}

/** A direction's registers with each role that won a house face carrying that face instead. */
function inHouseFaces(registers, families) {
  const out = {};
  for (const [name, spec] of Object.entries(registers)) {
    const family = families[spec.family];
    out[name] = family ? { ...spec, family, familySource: "newsroom" } : spec;
  }
  return out;
}

/** What the journalist is shown: the short list, the provenance, and what was refused and why. */
export function report({ offered, refused, held, typefaces }, { beat = {} } = {}) {
  const lines = [];
  const shown = held ?? offered.length;
  lines.push(
    `${shown} art direction${shown === 1 ? "" : "s"} hold up for this beat` +
      (shown > offered.length ? `; the ${offered.length} best are below` : "") +
      `. None is chosen for you.`,
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
  // THE HOUSE FACES, SAID OUT LOUD EITHER WAY. A newsroom that declared faces is told which of them
  // set which registers, and — one line per face, naming the face and the reason — which could not
  // and why. Silence here is what sent the cold run of 2026-09-15 out in a corpus face with nothing
  // in the report to notice.
  if (typefaces?.declared?.length) {
    lines.push("");
    lines.push(`the newsroom declares ${typefaces.declared.join(", ")}:`);
    const named = new Set();
    for (const use of typefaces.used ?? []) {
      const key = `${use.family} ${use.registers.join(",")}`;
      if (named.has(key)) continue;
      named.add(key);
      lines.push(`   ${use.family} sets ${use.registers.join(", ")}`);
    }
    for (const entry of typefaces.refused ?? [])
      if (!(typefaces.used ?? []).some((u) => u.family === entry.family))
        lines.push(`   ${entry.family} — ${entry.reason}`);
    for (const family of typefaces.declared)
      if (
        !(typefaces.used ?? []).some((u) => u.family === family) &&
        !(typefaces.refused ?? []).some((r) => r.family === family)
      )
        lines.push(`   ${family} — not needed: the direction's roles were filled before the list reached it`);
  }
  if (refused.length) {
    lines.push("");
    lines.push(`${refused.length} were tried and refused:`);
    for (const r of refused) lines.push(`   ${r.id} — ${r.problems.join("; ")}`);
  }
  return lines.join("\n");
}
