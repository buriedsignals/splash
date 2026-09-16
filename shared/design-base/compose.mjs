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
//     what `PALETTE.md` already decides for every beat, and says so in prose.
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
import { LADDERS } from "./resolve-families.mjs";
import {
  hsl,
  hexFromHsl,
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

/**
 * A GROUND A MARK IS ACTUALLY DRAWN ON, AND THE PIGMENT IT WAS PAINTED WITH.
 *
 * A direction's `ground` is the paper. It is not the only thing a mark sits on: a map beat paints a
 * basemap over that paper, and a river is drawn on WATER, not on the page. Those grounds are tinted
 * — a little of some pigment mixed into the paper — and a caller that knows it drew one says so:
 *
 *     { name: "the basemap's water", colour: "#CEDDE1", pigment: "#1F6FB2" }
 *
 * `colour` is what the pixel ends up being and is what the contrast floors are measured against.
 * `pigment` is the colour that ground was TINTED WITH, and it is a different fact: a ground mixed
 * only from the direction's own paper and ink carries no pigment at all, because paper has no
 * convention a reader could confuse a mark with.
 */

/**
 * A MARK MUST NOT BE DRAWN IN THE HUE OF THE GROUND IT SITS ON.
 *
 * THE DEFECT, MEASURED. `proof/web-flow-map-danube` rendered a BLUE Danube on BLUE water — 1.4° of
 * hue between the river and the sea on `rapport`, 19.5° on `creme` — and nothing anywhere refused
 * it, because it is not a legibility failure: the river reads 5.55:1 on that water and clears every
 * floor in this file. The beat's own `PALETTE.md` argues against that render in writing, at length,
 * and records an amber the renderer never drew.
 *
 * WHY IT IS MEASURED ON THE PIGMENT AND NOT ON THE PIXEL. A tinted ground is mostly paper: the
 * water above has a CHROMA of 0.043, below `CHROMATIC_MIN_CHROMA`, and ABC's cream paper has 0.067
 * — MORE. So no chroma floor can tell a conventional ground from a sheet of paper, and a rule read
 * off the pixel either misses the blue-on-blue or refuses an amber mark on cream. The pigment is
 * the fact that actually distinguishes them: water was painted with a water colour, paper was not
 * painted at all.
 *
 * AND IT IS WHY THE DEFECT WAS STRUCTURAL RATHER THAN UNLUCKY. That water was `mix(ground, accent,
 * 0.16)` — tinted with the very accent the river was drawn in. Under this measurement all three
 * directions read 0.0°, including the one whose pixel hue happened to land 51.6° away: a mark can
 * never be picked out of a ground that was painted with it, and no choice of accent escapes,
 * because the ground follows the accent wherever it goes.
 *
 * The threshold is the corpus's own `SAME_POLE_DEGREES` — the width at which `readPixelPalette`
 * counts two colours in one graphic as one pole. Two colours a harvester would report as the same
 * pole are two colours a reader sees as one.
 */
export function groundHueProblems(accent, grounds = []) {
  const problems = [];
  for (const ground of grounds) {
    if (!ground?.pigment) continue;
    const gap = hueGap(toHsl(accent).h, toHsl(ground.pigment).h);
    if (gap < SAME_POLE_DEGREES)
      problems.push(
        `the accent ${accent} is ${gap.toFixed(1)}° of hue from ${ground.pigment}, the pigment ` +
          `${ground.name} is painted in — inside the ${SAME_POLE_DEGREES}° this corpus counts as ONE ` +
          `pole, so the mark is drawn in the colour of the ground it sits on`,
      );
  }
  return problems;
}

/** The floor the accent owes the page: the strictest of the registers that set TEXT in it, and the
 *  non-text floor in any case, because the accent is also a mark. */
function accentFloorOnGround(registers = {}) {
  let floor = NON_TEXT_CONTRAST_MIN;
  for (const name of REGISTERS) {
    const r = registers[name];
    if (r?.ink === "accent") floor = Math.max(floor, textFloor(r.size, r.weight));
  }
  return floor;
}

/** Lightnesses to try, nearest to the direction's own first: a composition moves the value as
 *  little as the floors allow, so the accent stays in the key its direction set. */
function* lightnessesAround(l) {
  yield l;
  for (let step = 1; step <= 100; step += 1) {
    const down = l - step / 100;
    const up = l + step / 100;
    if (down >= 0) yield down;
    if (up <= 1) yield up;
  }
}

/**
 * THE BEAT'S COLOUR AND ITS DIRECTION ARE ONE SYSTEM, COMPOSED — NEVER TWO SOURCES COMPETING.
 *
 * The owner, asked to rule between a beat's recorded colour and a direction's accent: « pour
 * couleur du sujet et direction ce sont censé être la même chose dans l'idée, la direction
 * artistique va avec la couleur, c'est un ensemble commun. » So this does not choose between them
 * and there is no precedence rule anywhere below. Each contributes the axis it owns:
 *
 *   - THE RECORD OWNS THE HUE. A subject convention IS a hue — the blue a reader already holds for
 *     water, the amber this Danube is deliberately NOT drawn in the water's blue. Lightness is not
 *     part of that claim; `PALETTE.md` records one only because a hex has to have one.
 *   - THE DIRECTION OWNS THE VALUE. What separates `creme`'s accent from `nocturne`'s is not which
 *     colour they mean, it is how deep and how saturated a mark is allowed to be on that paper. A
 *     pale mint on navy and a deep blue on cream are the same decision made twice.
 *
 * So the composed accent is the record's hue set in the direction's own saturation and lightness,
 * then walked along lightness ALONE — the hue is the argument and is never rotated — until it
 * clears the floors on the paper and on every ground the mark is actually drawn on. Neither input
 * survives as a hex value, which is what makes this a composition rather than a selection, and
 * nothing here is hand-picked per beat: a second subject with a second hue walks the same walk.
 *
 * A beat with no recorded colour keeps the direction's accent untouched.
 *
 * @param {object}        args
 * @param {string|null}   args.subject    the hue-carrier: the accent recorded in `PALETTE.md`
 * @param {string}        args.key        the value-carrier: the direction's / palette's own accent
 * @param {string}        args.ground     the paper, which the text in the accent is read on
 * @param {object}        args.registers  the direction's registers, to know what sets text in it
 * @param {Array<object>} [args.grounds]  the other grounds the mark sits on
 */
export function composeAccent({ subject, key, ground, registers = {}, grounds = [] }) {
  if (!subject || subject === key) return { accent: key, seed: key, walked: 0, composed: false };
  const recorded = toHsl(subject);
  const value = toHsl(key);
  const hue = recorded.h;
  // A RECORD MAY DECIDE TO HAVE NO HUE AT ALL, and that decision is as real as any other.
  // `proof/web-heatmap-coal-share-europe` records `#3A3A3A` — coal, drawn in greys on purpose. Its
  // chroma is 0, so it has no hue to lend: reading one off it would hand this beat the direction's
  // saturation at hue 0 and paint a grey subject RED. What the record owns is the hue AND whether
  // there is one; the direction owns the value either way, so a neutral record composes as a
  // neutral at this direction's own lightness.
  const saturation = recorded.chroma < CHROMATIC_MIN_CHROMA ? 0 : value.s;
  const seed = hexFromHsl(hue, saturation, value.l);
  const floor = accentFloorOnGround(registers);

  for (const l of lightnessesAround(value.l)) {
    const candidate = hexFromHsl(hue, saturation, l);
    if (contrast(candidate, ground) < floor) continue;
    if (grounds.some((g) => contrast(candidate, g.colour) < NON_TEXT_CONTRAST_MIN)) continue;
    return {
      accent: candidate,
      seed,
      walked: Number(Math.abs(l - value.l).toFixed(2)),
      composed: true,
    };
  }

  const worst = [
    `${contrast(seed, ground).toFixed(2)}:1 on the ground ${ground}, floor ${floor}`,
    ...grounds.map((g) => `${contrast(seed, g.colour).toFixed(2)}:1 on ${g.name}, floor ${NON_TEXT_CONTRAST_MIN}`),
  ];
  return {
    accent: null,
    seed,
    walked: null,
    composed: true,
    problems: [
      `no lightness of the recorded hue (${subject}, set in this direction's own key as ${seed}) ` +
        `clears every floor it is measured against — ${worst.join("; ")}`,
    ],
  };
}

/** Every guard a filed direction faces, run on a candidate before it may be offered.
 *
 *  `grounds` are the grounds BEYOND the paper that this beat's marks are drawn on — a basemap's
 *  water and land, a plate's tints. A caller that draws nothing over the paper passes none, and the
 *  guard is exactly what it was. */
export function guardDirection(direction, textPerRegister, grounds = []) {
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

  problems.push(...guardColour(direction, grounds));

  return problems;
}

/**
 * THE HALF OF THE GUARD THE COLOUR IS RESPONSIBLE FOR, on its own.
 *
 * Split out because the two halves answer to different moments. Whether six registers read as six
 * voices is a property of the FILED RECORD, and it decides which directions are worth OFFERING a
 * journalist. Whether the accent can be seen, and whether it is the colour of the ground under it,
 * is a property of THIS BEAT'S COLOUR, and it decides whether a direction the journalist already
 * chose may go to the paint at all.
 *
 * `composeDirection` refuses on this half alone: a beat whose direction was settled upstream cannot
 * re-pick its registers, and refusing its render over the register table would be this repair
 * breaking two beats it has no business touching. The register problems are still returned to the
 * caller — reported, never swallowed.
 */
export function guardColour(direction, grounds = []) {
  const problems = [];

  const accentRatio = contrast(direction.accent, direction.ground);
  if (accentRatio < NON_TEXT_CONTRAST_MIN)
    problems.push(`accent reads ${accentRatio.toFixed(2)}:1 as a mark, floor ${NON_TEXT_CONTRAST_MIN}`);

  // THE GROUNDS THE MARKS ARE ACTUALLY ON, measured on the same floor and on one more rule: a mark
  // may not be drawn in the hue of the ground it sits on.
  for (const ground of grounds) {
    const ratio = contrast(direction.accent, ground.colour);
    if (ratio < NON_TEXT_CONTRAST_MIN)
      problems.push(
        `accent reads ${ratio.toFixed(2)}:1 on ${ground.name}, floor ${NON_TEXT_CONTRAST_MIN}`,
      );
  }
  problems.push(...groundHueProblems(direction.accent, grounds));

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
 * ONE CANDIDATE, BUILT IN ONE PLACE — the type of one direction, the space of another, the colour
 * of a palette tempered by whatever this beat recorded.
 *
 * Extracted so the SHORT LIST a journalist reads and the DIRECTION a renderer paints with come out
 * of the same construction. They used not to: `composeDirections` composed a colour and printed it,
 * and every render read the filed record off disk and drew its own accent. Two resolutions of one
 * decision, disagreeing in silence, and the one that reached the paint had never read `PALETTE.md`.
 */
function candidateOf({ type, space, palette, subject, grounds = [] }) {
  const sameThroughout = type.id === space.id && palette.from === type.id;
  // THREE SLOTS, ALWAYS, WHEN ANYTHING IS COMPOSED. A first version deduplicated the names, and
  // `creme` type + `nocturne` space + `creme` palette collided with the same pair carrying
  // `nocturne`'s palette: two different candidates, one id, and the second silently
  // indistinguishable in the report the journalist reads.
  const id = sameThroughout ? type.id : `${type.id}/${space.id}/${palette.from}`;

  const colour = composeAccent({
    subject,
    key: palette.accent,
    ground: palette.ground,
    registers: type.registers,
    grounds,
  });
  if (!colour.accent) return { candidate: null, refusal: { id, problems: colour.problems } };

  return {
    candidate: {
      id,
      composed: !sameThroughout,
      ground: palette.ground,
      accent: colour.accent,
      colour,
      // `whole` travels with the palette: a ground and accent published together are evidence, a
      // pair we put side by side is a proposal, and the ranking below keeps them apart.
      palette: { from: palette.from, whole: Boolean(palette.whole) },
      pad: space.pad,
      header: space.header,
      headRule: space.headRule,
      stroke: space.stroke,
      registers: type.registers,
      provenance: {
        ground:
          palette.groundSource === "newsroom"
            ? "the newsroom's recorded palette"
            : provenanceOf(palette.ground, palette.groundSource, palette.from, palette.measuredFrom),
        accent: colour.composed
          ? `the hue recorded in PALETTE.md (${subject}), set in ${palette.from}'s own value — ` +
            `${colour.seed}, walked ${colour.walked} in lightness to clear the floors here`
          : palette.accentSource === "newsroom"
            ? "the newsroom's recorded palette"
            : provenanceOf(palette.accent, palette.accentSource, palette.from, palette.measuredFrom),
        registers: `${type.id}, measured on ${type.measuredFrom}`,
        space: `${space.id}, measured on ${space.measuredFrom}`,
      },
    },
    refusal: null,
  };
}

/**
 * THE COLOUR AXIS AS THE RECORD DEFINES IT — read once, by everything that composes.
 *
 * `origin` has three legal values and they are not three names for one thing:
 *
 *   `newsroom` — the HOUSE palette. A newsroom's ground and accent are its identity, published on
 *     everything it prints, and where they exist they are THE palette: the colour axis collapses to
 *     them and a wider search is not a licence to overrule a house.
 *
 *   `subject` / `journalist` — a colour decided FOR THIS SUBJECT, against this subject's own
 *     context. That is a claim about HUE and nothing else: a river drawn deliberately not in the
 *     water's blue is the same decision on cream paper and on navy. It does not carry a ground with
 *     it and it does not replace a direction — it TEMPERS every palette on the axis, lending its
 *     hue to each and taking that palette's own value in return. See `composeAccent`.
 *
 * The distinction is READ from the record, never inferred: a record with no `origin` is a house
 * palette, which is what every caller meant before the field was consulted.
 */
function colourAxis(newsroom, palettes) {
  const house = (newsroom?.origin ?? "newsroom") === "newsroom";
  const housePalette =
    house && (newsroom?.ground || newsroom?.accent)
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
  /** The hue this beat's marks argue in, when the record carries one that is not a house palette. */
  return { housePalette, subject: house ? null : (newsroom?.accent ?? null) };
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
 * @param {{ground?: string, accent?: string, origin?: string}} newsroom  the `PALETTE.md` record
 * @param {Array<object>} filed                          the filed directions
 * @param {Array<object>} [palettes]                     colour candidates; the filed ones by default
 * @param {{evidenceLevels?: number}} beat               the beat's own facts, from its BRIEF
 * @param {Record<string,string>} textPerRegister        what each register sets on this beat
 * @param {Array<object>} [grounds]                      the grounds this beat's marks sit on
 */
export function composeDirections({
  newsroom,
  filed,
  palettes = palettesFrom(filed),
  beat = {},
  textPerRegister = {},
  grounds = [],
  limit = OFFER_LIMIT,
}) {
  const wanted = beat.evidenceLevels ?? 4;
  const offered = [];
  const refused = [];

  const { housePalette, subject } = colourAxis(newsroom, palettes);

  for (const type of filed)
    for (const space of filed)
      for (const palette of housePalette) {
        const { candidate, refusal } = candidateOf({ type, space, palette, subject, grounds });
        if (!candidate) {
          refused.push(refusal);
          continue;
        }

      const problems = guardDirection(candidate, textPerRegister, grounds);
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
  return { offered: shortList, refused, held, alike };
}

/**
 * THE ONE DIRECTION A BEAT IS ACTUALLY DRAWN IN, COLOUR AND ALL — what a renderer calls instead of
 * taking `readDirection()`'s output to the paint.
 *
 * In production a beat has ONE direction, composed upstream in the editorial exchange. `proof/`
 * renders three only as a bench, to show that a rule is not lucky on one palette; nothing here
 * knows or cares how many there are.
 *
 * THE DEFECT THIS CLOSES. Every render in this tree read its direction off disk and drew
 * `direction.accent`, while `composeDirections` — the only thing that had ever seen the beat's own
 * `PALETTE.md` — composed a colour, printed it in a report, and dropped it. The two resolutions
 * disagreed silently, and the one that reached the paint was the one that had never heard of the
 * subject. Both now come out of this file, from the same call.
 *
 * It refuses LOUDLY rather than falling back to the filed accent: a beat drawn in a colour its own
 * record argues against is exactly the failure that shipped, and it shipped looking fine.
 *
 * @param {object}        args
 * @param {object}        args.direction        a filed direction, from `readDirection`
 * @param {object}        args.palette          the `PALETTE.md` record, from `readPalette`
 * @param {Array<object>} [args.grounds]        the grounds this beat's marks sit on
 * @param {Record<string,string>} [args.textPerRegister]
 */
export function composeDirection({ direction, palette, grounds = [], textPerRegister = {} }) {
  const { housePalette, subject } = colourAxis(palette, palettesFrom([direction]));
  const [pair] = housePalette;
  const { candidate, refusal } = candidateOf({
    type: direction,
    space: direction,
    palette: pair,
    subject,
    grounds,
  });
  if (!candidate)
    throw new Error(
      `the ${direction.id} direction cannot carry this beat's recorded colour: ${refusal.problems.join("; ")}`,
    );

  // The candidate carries the composed colour and the type and space it was composed with; the
  // filed record carries everything a renderer also needs and colour never touched.
  const composed = { ...direction, ...candidate, id: direction.id };

  const colourProblems = guardColour(composed, grounds);
  if (colourProblems.length)
    throw new Error(
      `the ${direction.id} direction cannot carry this beat's recorded colour: ${colourProblems.join("; ")}`,
    );

  // Everything the OFFER-time guards say about the record itself, reported rather than thrown: a
  // direction settled upstream cannot re-pick its own register table at render time, and refusing a
  // render over it would be this repair breaking beats whose colour is fine.
  return { ...composed, problems: guardDirection(composed, textPerRegister, grounds) };
}

/** What the journalist is shown: the short list, the provenance, and what was refused and why. */
export function report({ offered, refused, held }, { beat = {} } = {}) {
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
  if (refused.length) {
    lines.push("");
    lines.push(`${refused.length} were tried and refused:`);
    for (const r of refused) lines.push(`   ${r.id} — ${r.problems.join("; ")}`);
  }
  return lines.join("\n");
}
