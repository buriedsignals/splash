// twin/skills/chart-web/assets/qualify.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what it may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum. `fold.ts`
// says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is chosen.
// `trace.ts` says what may be FOLLOWED through an image, `follow.ts` what may be followed through
// its ORDERED STEPS. `hold.ts` says which factor of a product may be HELD STILL. `descend.ts` says
// what may BECOME THE WHOLE. `floor.ts` says what the picture may STAND ON. `cutoff.ts` says where
// the claim's own line is drawn. `reorder.ts` says what the same numbers look like somewhere else
// in a cycle. `count.ts` says which members of a fixed frame are counted in. `aim.ts` says WHERE a
// displacement points. `weigh.ts` says what a mark is WORTH. `benchmark.ts` says what the verdict
// is measured against. `datum.ts` says where a diverging zero sits. This file says **WHAT COUNTS AS
// THE THING THE AXIS MEASURES** — one denominator, a declared ladder of numerators, and every mark
// at the exact position its new value puts it at. All of them are native radio inputs plus CSS
// generated at build time (`:checked` and `:has()` on the enclosing figure, no listener, no state,
// not one byte of JavaScript), because that is the only kind of control this format can promise
// still works with the script absent.
//
// WHY A DOT STRIP NEEDS THIS AND THE OTHER THIRTY-TWO TYPES DO NOT.
//
// A dot strip is the only LOSSLESS chart in the catalogue. One axis, one dot per case, no bin, no
// pack, no summary: every observation is drawn at its own exact value and nothing else is drawn at
// all. A histogram gives up exact position to buy counts. A boxplot gives up every observation but
// five numbers. A beeswarm gives up the perpendicular — and, where it must, some of the horizontal
// — to buy separation. This type gives up nothing, and what it hands back for that is the reading
// none of the others can give: THE SHAPE OF THE FIELD, read as a shape.
//
// And a shape of WHAT? Of a quantity somebody defined. "The low-carbon share of a country's
// electricity" is not a measurement, it is a sum over a list of sources a person chose, and on the
// beat this file was written for that list is the argument rather than the preamble to it. A still
// has to pick one list, print it in the caveat and ask to be trusted.
//
// SO THE READER IS HANDED THE LIST. And the reason a dot strip can hand it over while nothing else
// can is that IT HAS NOTHING TO RE-DERIVE: re-define the measured quantity and each mark takes a
// new position on the same rail and the chart is finished. The axis keeps its meaning, the ticks
// keep their numbers, the lanes keep their names, no layout runs again, and the reader re-learns
// nothing. Every other type has to rebuild something, and the rebuild is what destroys the reading
// — a histogram re-bins and its bars change position AND height at once, so a reader cannot tell
// which of the two moved; a beeswarm re-packs, so marks travel across a baseline in a direction
// that carries no data; a boxplot re-derives five numbers and shows none of the observations, so
// there is nothing left to check the new definition against; a bar chart's marks are lengths welded
// to labels, so a redefinition reads as sixteen numbers changing one at a time rather than as a
// field changing shape.
//
// WHY IT IS ITS OWN FILE AND NOT AN OPTION IN `withdraw.ts` OR `descend.ts`, THE TWO NEAR MISSES.
//
// `withdraw.ts` is the closest by its words and the furthest by its arithmetic. It takes a term out
// of a SUM — a bridge's running total — and its whole vocabulary is about what the rest of the sum
// does without it: `resteps` (a step keeps its size and changes its start), `cuts` (the connectors
// the hole invalidates), `close` (the one bar measured from zero, re-drawn rather than moved). None
// of the three has a meaning here. There is no running total, no downstream and no closing level,
// and NO MARK KEEPS ITS SIZE WHILE CHANGING POSITION: a mark on this type has no size, only a
// value, and the value is the thing that changes.
//
// `descend.ts` re-parents — a branch becomes the whole, and a mark's size stops meaning "share of
// the root". That is a changed DENOMINATOR, and a changed denominator is exactly what this ladder
// refuses. It is declared per rung and checked equal to the default's, because the honesty of the
// whole gesture is that only the numerator is cut: a position on the rail must stay a share of the
// same total in every rung, or two rungs' rails are two different rails wearing one axis.
//
// AND NOTHING HERE EMITS A `transform`, FOR THE REASON `weigh.ts`, `floor.ts` AND `stack.ts` ALL
// RECORD. `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` read ONCE at init,
// which no CSS transform and no CSS animation ever changes. On this type the position IS the datum,
// so a dot animated along the rail would keep answering for the value it left — the worst answer
// this chart can give. Each rung is therefore drawn ONCE, at its own values, in its own
// `<svg class="chart">`, and the stylesheet reveals one; a hidden `<svg>` has no CTM and no
// focusable content, so pointer and keyboard only ever reach the rail on screen. What DOES travel
// is the span bar, an HTML element that is always rendered, whose `left` and `width` are generated
// per rung and transitioned — `display` does not interpolate, and a property on an element that is
// always there does.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     qualify: {
//       label: "L'axe mesure",                // the <legend> — the beat's own words
//       axisMax: 100,                         // the rail the values live on, in its own unit
//       options: [
//         {
//           key: "low-carbon",                // the FIRST option is the default, and it IS the
//           label: "le bas-carbone",          // picture the page ships in. It carries no note:
//           announce: "le bas-carbone — …",   // it is not a comparison, it is the claim.
//           seats: [ { lane: "2000", key: "POL", value: 1.63, across: -12.4, denominator: 143.2 }, … ],
//           spans: [ { lane: "2000", floor: 1.63, ceiling: 96.73 }, … ],
//         },
//         {
//           key: "renewable",
//           label: "sans le nucléaire",
//           announce: "sans le nucléaire — …", // must CONTAIN `label` (WCAG 2.5.3)
//           note: "Sans le nucléaire, l'écart …",  // the sentence revealed under the control
//           seats: [ … ],                      // the same lanes, the same keys, the same `across`
//           spans: [ … ],
//         },
//       ],
//     }
//
// `value` AND `axisMax` ARE IN THE DATA'S OWN UNIT and `across` is in the GEOMETRY'S own units,
// never in CSS pixels, for the reason `stack.ts`, `hold.ts`, `floor.ts` and `weigh.ts` all state at
// length: a `chart-web` `<svg>` carries `preserveAspectRatio="none"`, so a `viewBox` unit is a
// different number of reader pixels at every width.
//
// WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE.
//
//   - A RUNG THAT ADDS INSTEAD OF TAKING AWAY. The ladder is a strict subtraction: every mark must
//     sit at or LEFT of where the rung before it put it. That is the one rule a reader can see
//     without being told — the whole field moves the same way and the pill names what came out of
//     it — and it is the owner's first arbitration met by construction rather than by explanation.
//     A ladder whose pills say "less this" while a dot moves right is measuring something else.
//   - A RUNG THAT TAKES NOTHING FROM ANYONE. Not one mark moved by more than the declared floor:
//     that is the rung before it under a second name, which `directed-interaction.md` refuses.
//   - A RUNG WHOSE OWN READING EQUALS THE DEFAULT'S. Measured separately, because a rung can move
//     every mark and still hand back the same spread — and the spread is what this control hands
//     back.
//   - A MARK THAT MOVES ACROSS THE RAIL. The perpendicular offset is jitter: it is the type's own
//     device for letting overlap show through transparency instead of resolving it, and it carries
//     no data whatsoever. A rung that changed it would show a reader movement in a direction with
//     nothing in it, which is the complaint `weigh.ts` records about its own type, arriving here
//     inverted.
//   - A CHANGED DENOMINATOR, which is `descend.ts` wearing this file's chips.
//   - A MARK THAT LEAVES, OR ARRIVES, on any lane. Every rung seats the same key set: a rung that
//     dropped a mark would be a filter wearing this vocabulary's chips.
//   - A VALUE OFF THE RAIL. A share outside the axis the beat drew is a mark drawn nowhere, saying
//     nothing, silently — `aim.ts`'s own refusal, in this file's units.
//   - A DECLARED SPAN THAT IS NOT THE SPAN OF THE SEATS. The reading and the drawing must be two
//     readings of one arithmetic, never two arithmetics.
//   - A RUNG WITH NO SENTENCE, a DEFAULT THAT CARRIES ONE, and AN ACCESSIBLE NAME THAT DOES NOT
//     CONTAIN ITS VISIBLE LABEL (WCAG 2.5.3) — the conventions every sibling vocabulary holds.
//   - A HALF-TAGGED DATUM, A VOCABULARY THAT EMITS NO RULES, and THE BLANKET RULE EMITTED AFTER THE
//     DEFAULT RAIL'S REVEAL — read back off the WRITTEN page by `assertOneQualifying`. The third is
//     `weigh.ts`'s own finding, inherited rather than re-earned: two attribute selectors score
//     identically, source order is the whole mechanism, and the only engine the base pair ever
//     decides anything for is one without `:has()`, which neither the render path nor the verifier
//     is.
//   - CHROME THAT DOES NOT FIT THE ROOM IT RESERVED — see `qualifyStatRow`, which is this file's
//     answer to the defect `chart-beat/references/types/dot-strip.md` files for this type.

import { controlChromeCss } from "./control-chrome.ts";

/** Where one mark sits under one rung. `value` is the datum; `across` is jitter and is not. */
export type QualifySeat = {
  /** Which rail — the beat's own lane key. */
  lane: string;
  /** Which case. Unique within a lane. */
  key: string;
  /** Its position on the shared rail under this rung, in the data's own unit. */
  value: number;
  /** Its offset from the rail, in geometry units. The type's own jitter: deterministic, carrying no
   *  data, and therefore IDENTICAL in every rung. Checked, because a jitter that moved would be the
   *  page showing motion in a direction with nothing in it. */
  across: number;
  /** The total this rung's `value` is a share of. Identical in every rung, and checked: only the
   *  NUMERATOR is cut. A rung that also changed this is `descend.ts`, not this file. */
  denominator: number;
};

/** The reading one rung hands back for one lane: where its field starts and where it ends. */
export type QualifySpan = { lane: string; floor: number; ceiling: number };

/** One rung of the ladder. The first declared is the default and carries no `note`. */
export type QualifyOption = {
  /** What the axis measures under this rung, in one slug. The id is derived from THIS and never
   *  from the label — the single derivation of one identity `filter.ts` records the defect for. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It
   *  must CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG
   *  2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /** The sentence revealed under the control, in the beat's own words. Required on every rung but
   *  the default, and refused ON the default: the untouched picture is not a comparison, it is the
   *  claim, and a note under it would be the title said a second time. */
  note?: string;
  /** Every mark on every lane, under this rung. */
  seats: QualifySeat[];
  /** One per lane: the reading. Declared so it can be checked against the seats rather than
   *  recomputed in a browser, and so the refusals below can be made against a number the page will
   *  actually print. */
  spans: QualifySpan[];
};

/** What a beat declares when it wants a ladder. Absent/`null` means it wants none. */
export type QualifyDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The rail's own top, in the data's unit. A value outside `[0, axisMax]` is drawn nowhere. */
  axisMax: number;
  /** At least two. The FIRST is the default: the picture the page ships in, the picture a reader
   *  with no script never leaves, and the one every other rung's reading is measured against. */
  options: QualifyOption[];
};

/** A CSS-id-safe slug, derived from the rung's KEY and never from its label. */
export function qualifySlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for a rung's slug. One function, three readers. */
export function qualifyOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** The span of one lane under one rung, read off the seats rather than off the declaration. */
function seatSpanOf(
  seats: QualifySeat[],
  lane: string,
): { floor: number; ceiling: number } | null {
  const mine = seats.filter((s) => s.lane === lane);
  if (mine.length === 0) return null;
  let floor = Infinity;
  let ceiling = -Infinity;
  for (const s of mine) {
    if (s.value < floor) floor = s.value;
    if (s.value > ceiling) ceiling = s.value;
  }
  return { floor, ceiling };
}

const seatKey = (s: { lane: string; key: string }) => `${s.lane} ${s.key}`;

/**
 * EVERY REFUSAL THIS FILE OWNS, MADE AGAINST WHAT THE COMPONENT IS ABOUT TO DRAW.
 *
 * `lanes` and `keys` are what the beat actually draws: the refusals are measured against the page,
 * never against the declaration's own idea of itself.
 */
export function assertQualifyDeclaration(
  declaration: QualifyDeclaration,
  {
    lanes,
    keys,
    movedFloor,
    spanFloor,
  }: {
    /** The rails the beat draws, in drawing order. */
    lanes: string[];
    /** The cases each rail carries. */
    keys: string[];
    /** The smallest move, in the data's unit, that counts as a rung having taken something. */
    movedFloor: number;
    /** The smallest change in a lane's span, in the data's unit, that makes a rung a second
     *  reading rather than the default's reading under a second name. */
    spanFloor: number;
  },
): void {
  const where = "qualify declaration";
  if (!declaration || typeof declaration !== "object")
    throw new Error(
      `${where}: expected an object, got ${JSON.stringify(declaration)}`,
    );
  if (typeof declaration.label !== "string" || !declaration.label.trim())
    throw new Error(
      `${where}: \`label\` must be the beat's own words — a control with no legend renders unnamed`,
    );
  if (!Number.isFinite(declaration.axisMax) || declaration.axisMax <= 0)
    throw new Error(
      `${where}: \`axisMax\` must be the rail's own top, a positive number in the data's unit — ` +
        `got ${declaration.axisMax}`,
    );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two rungs to be a choice, got ${declaration.options?.length ?? 0}. ` +
        "A beat that does not need a ladder declares none.",
    );
  if (!Array.isArray(lanes) || lanes.length === 0)
    throw new Error(`${where}: the beat draws no lanes`);
  if (!Array.isArray(keys) || keys.length === 0)
    throw new Error(`${where}: the beat draws no marks`);
  if (new Set(lanes).size !== lanes.length)
    throw new Error(`${where}: the drawn lanes are not unique`);
  if (new Set(keys).size !== keys.length)
    throw new Error(`${where}: the drawn marks are not unique`);

  const seen = new Map<string, string>();
  const bySlug = new Map<string, Map<string, QualifySeat>>();

  declaration.options.forEach((option, index) => {
    const isDefault = index === 0;
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(
        `${where}: every rung needs a label — got ${JSON.stringify(option)}`,
      );
    const slug = qualifySlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug ` +
          `to ${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.label);

    if (typeof option.announce !== "string" || !option.announce.trim())
      throw new Error(
        `${where}: rung ${JSON.stringify(option.label)} has no \`announce\` — a control whose ` +
          "answer is only a picture leaves a keyboard reader with nothing",
      );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: rung ${JSON.stringify(option.label)} announces ` +
          `${JSON.stringify(option.announce)}, which does not contain its own visible label — an ` +
          "accessible name that does not contain the visible one is the WCAG 2.5.3 failure, and a " +
          "reader speaking what they see cannot reach this rung",
      );
    if (isDefault && typeof option.note === "string" && option.note.trim())
      throw new Error(
        `${where}: the default rung ${JSON.stringify(option.label)} carries a note. The first rung ` +
          "IS the picture the page ships in; a sentence revealed under it would be the title said a " +
          "second time, in a second place, to a reader who never chose anything.",
      );
    if (!isDefault && (typeof option.note !== "string" || !option.note.trim()))
      throw new Error(
        `${where}: rung ${JSON.stringify(option.label)} has no \`note\` — an argument the reader ` +
          "built that is only a picture cannot be checked, and a reader who is not looking at the " +
          "plot gets nothing at all",
      );

    // A MARK THAT LEAVES, OR ARRIVES.
    if (
      !Array.isArray(option.seats) ||
      option.seats.length !== lanes.length * keys.length
    )
      throw new Error(
        `${where}: rung ${JSON.stringify(option.label)} seats ${option.seats?.length ?? 0} of ` +
          `${lanes.length * keys.length} drawn marks. Nothing leaves a ladder — a rung that drops a ` +
          "mark is a filter wearing this vocabulary's chips.",
      );
    const mine = new Map<string, QualifySeat>();
    for (const seat of option.seats) {
      if (!lanes.includes(seat.lane))
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} seats a mark on lane ` +
            `${JSON.stringify(seat.lane)}, which this beat does not draw`,
        );
      if (!keys.includes(seat.key))
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} seats ${JSON.stringify(seat.key)}, which ` +
            "this beat does not draw",
        );
      if (mine.has(seatKey(seat)))
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} seats ${JSON.stringify(seat.key)} twice ` +
            `on lane ${JSON.stringify(seat.lane)}`,
        );
      // A VALUE OFF THE RAIL.
      if (
        !Number.isFinite(seat.value) ||
        seat.value < 0 ||
        seat.value > declaration.axisMax
      )
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} puts ${JSON.stringify(seat.key)} at ` +
            `${seat.value} on lane ${JSON.stringify(seat.lane)}, off a rail running 0 to ` +
            `${declaration.axisMax}. A mark off the rail is drawn nowhere and says nothing, ` +
            "silently, which is the one failure a control can ship without anybody seeing it.",
        );
      if (!Number.isFinite(seat.across))
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} gives ${JSON.stringify(seat.key)} no ` +
            "offset from its rail",
        );
      if (!Number.isFinite(seat.denominator) || seat.denominator <= 0)
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} takes ${JSON.stringify(seat.key)}'s share ` +
            `over ${seat.denominator}. A share over nothing is not a position.`,
        );
      mine.set(seatKey(seat), seat);
    }
    for (const lane of lanes)
      for (const key of keys)
        if (!mine.has(seatKey({ lane, key })))
          throw new Error(
            `${where}: rung ${JSON.stringify(option.label)} does not seat ${JSON.stringify(key)} on ` +
              `lane ${JSON.stringify(lane)}`,
          );

    // A DECLARED SPAN THAT IS NOT THE SPAN OF THE SEATS. The reading and the drawing are two
    // readings of ONE arithmetic; two arithmetics is how a page comes to print a number it does not
    // draw.
    if (!Array.isArray(option.spans) || option.spans.length !== lanes.length)
      throw new Error(
        `${where}: rung ${JSON.stringify(option.label)} declares ${option.spans?.length ?? 0} spans ` +
          `for ${lanes.length} lanes — the span is the reading this control hands back`,
      );
    for (const lane of lanes) {
      const declared = option.spans.find((s) => s.lane === lane);
      if (!declared)
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} declares no span for lane ` +
            `${JSON.stringify(lane)}`,
        );
      const drawn = seatSpanOf(option.seats, lane)!;
      if (
        Math.abs(declared.floor - drawn.floor) > 0.05 ||
        Math.abs(declared.ceiling - drawn.ceiling) > 0.05
      )
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} declares lane ${JSON.stringify(lane)} ` +
            `running ${declared.floor.toFixed(2)} to ${declared.ceiling.toFixed(2)} and its marks ` +
            `run ${drawn.floor.toFixed(2)} to ${drawn.ceiling.toFixed(2)}. The bar the page draws ` +
            "and the figure it prints would be two different readings of one rung.",
        );
    }

    bySlug.set(slug, mine);
    if (isDefault) return;

    const base = bySlug.get(qualifySlugOf(declaration.options[0].key))!;
    const prev = bySlug.get(qualifySlugOf(declaration.options[index - 1].key))!;
    let moved = 0;
    for (const [id, seat] of mine) {
      const before = prev.get(id)!;
      const first = base.get(id)!;

      // A RUNG THAT ADDS INSTEAD OF TAKING AWAY.
      if (seat.value > before.value + 1e-9)
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} moves ${JSON.stringify(seat.key)} on lane ` +
            `${JSON.stringify(seat.lane)} from ${before.value.toFixed(2)} to ` +
            `${seat.value.toFixed(2)} — to the RIGHT of the rung before it. This ladder is a strict ` +
            "subtraction, and that is the only rule a reader has for reading it: the whole field " +
            "moves the same way and the pill names what came out of it. A rung that adds is " +
            "measuring something else and the pill's words are wrong.",
        );

      // A MARK THAT MOVES ACROSS THE RAIL.
      if (Math.abs(seat.across - first.across) > 1e-9)
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} moves ${JSON.stringify(seat.key)} across ` +
            `lane ${JSON.stringify(seat.lane)}, from ${first.across} to ${seat.across}. That offset ` +
            "is jitter — the type's own way of letting overlap show through instead of resolving " +
            "it — and it carries no data at all, so a rung that changes it shows a reader movement " +
            "in a direction with nothing in it.",
        );

      // A CHANGED DENOMINATOR.
      if (Math.abs(seat.denominator - first.denominator) > 1e-6)
        throw new Error(
          `${where}: rung ${JSON.stringify(option.label)} takes ${JSON.stringify(seat.key)}'s share ` +
            `on lane ${JSON.stringify(seat.lane)} over ${seat.denominator} and the default takes it ` +
            `over ${first.denominator}. Only the NUMERATOR is cut here: a position on this rail has ` +
            "to stay a share of the same total in every rung, or two rungs' rails are two different " +
            "rails wearing one axis. A rung that re-bases is `descend.ts`, not this file.",
        );

      if (Math.abs(seat.value - before.value) > movedFloor) moved += 1;
    }

    // A RUNG THAT TAKES NOTHING FROM ANYONE.
    if (moved === 0)
      throw new Error(
        `${where}: rung ${JSON.stringify(option.label)} moves not one of ${mine.size} marks by more ` +
          `than ${movedFloor} — it is ${JSON.stringify(declaration.options[index - 1].label)} under ` +
          "a second name, and the reader would operate this control while the field stands still.",
      );

    // A RUNG WHOSE OWN READING EQUALS THE DEFAULT'S. Measured separately from the one above,
    // because a rung can move every mark and still hand back exactly the same spread.
    const defaults = declaration.options[0].spans;
    let biggest = 0;
    for (const span of option.spans) {
      const first = defaults.find((s) => s.lane === span.lane)!;
      const shift = Math.abs(
        span.ceiling - span.floor - (first.ceiling - first.floor),
      );
      if (shift > biggest) biggest = shift;
    }
    if (biggest <= spanFloor)
      throw new Error(
        `${where}: rung ${JSON.stringify(option.label)} changes no lane's spread by more than ` +
          `${biggest.toFixed(3)} (floor ${spanFloor}). The spread is the reading this control hands ` +
          "back; a rung that leaves every one of them where it was renders the picture the page " +
          "already ships, whatever its marks did on the way.",
      );
  });
}

/**
 * THE TYPE'S OWN FILED DEFECT, ANSWERED THE WAY THE SHEET ASKS FOR IT.
 *
 * `chart-beat/references/types/dot-strip.md` files one failure for this type and it is not about
 * the dots: the type's chrome is HAND-BUILT rather than drawn from the shared legend system, and on
 * a real embed "the space reserved for it and the space it actually needed at that width had
 * quietly drifted apart" — eighteen pixels past the frame's own right edge. The prescribed fix is
 * exact: ONE FUNCTION DECIDES BOTH how much room to reserve AND whether the content fits it, so the
 * two can never disagree.
 *
 * A control makes that defect worse in a way the sheet did not have to consider: the chrome now has
 * one string PER RUNG, and a rung nobody looked at is a width nobody measured. So every rung's
 * string for every lane is measured here, in one pass, and the same pass returns the room. It
 * REFUSES rather than wrapping: a statistics row that wraps is a row whose reserved height is a
 * guess, which is the defect itself in its original costume.
 */
export function qualifyStatRow(
  entries: { lane: string; slug: string; text: string }[],
  {
    measure,
    style,
    widthPx,
    lineHeightPx,
  }: {
    /** `renderWeb`'s own `measureText` — the same rasteriser the page will draw with. */
    measure: (
      text: string,
      options: { fontSize: number; fontWeight?: number; fontFamily?: string },
    ) => number;
    /** The register the row is printed in, resolved. */
    style: { fontSize: number; fontWeight?: number; fontFamily?: string };
    /** The room the row actually has, at the frame's own nominal width. */
    widthPx: number;
    /** One line of it. */
    lineHeightPx: number;
  },
): {
  entries: { lane: string; slug: string; text: string }[];
  reserve: number;
  widest: number;
} {
  if (!Array.isArray(entries) || entries.length === 0)
    throw new Error(
      "qualify stat row: a lane that heads itself with nothing is not headed",
    );
  if (!Number.isFinite(widthPx) || widthPx <= 0)
    throw new Error(
      `qualify stat row: the room must be a positive width, got ${widthPx}`,
    );
  if (!Number.isFinite(lineHeightPx) || lineHeightPx <= 0)
    throw new Error(
      `qualify stat row: the line height must be positive, got ${lineHeightPx}`,
    );
  let widest = 0;
  let worst = entries[0];
  for (const entry of entries) {
    if (typeof entry.text !== "string" || !entry.text.trim())
      throw new Error(
        `qualify stat row: lane ${JSON.stringify(entry.lane)} heads rung ` +
          `${JSON.stringify(entry.slug)} with nothing`,
      );
    const w = measure(entry.text, style);
    if (w > widest) {
      widest = w;
      worst = entry;
    }
  }
  if (widest > widthPx)
    throw new Error(
      `qualify stat row: lane ${JSON.stringify(worst.lane)} heads rung ${JSON.stringify(worst.slug)} ` +
        `with ${widest.toFixed(1)} px of text in ${widthPx.toFixed(1)} px of room. This row is ` +
        "hand-built chrome, which is the one defect this type files: the space reserved for it and " +
        "the space it needs are two numbers, and they drift. They are one number here, and a row " +
        "that does not fit is refused rather than wrapped into a height nobody reserved.",
    );
  return { entries, reserve: lineHeightPx, widest };
}

/** The rungs a component draws, in reading order: the default first. */
export function qualifyOptionsForMarkup(
  declaration: QualifyDeclaration | null | undefined,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isDefault: boolean;
}[] {
  if (!declaration) return [];
  return declaration.options.map((option, index) => ({
    id: qualifyOptionId(idPrefix, qualifySlugOf(option.key)),
    slug: qualifySlugOf(option.key),
    label: option.label,
    announce: option.announce,
    isDefault: index === 0,
  }));
}

/** The sentences the control owes. The default gets none: it is not a comparison, it is the claim. */
export function qualifyNotesForMarkup(
  declaration: QualifyDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.slice(1).map((option) => ({
    slug: qualifySlugOf(option.key),
    text: option.note as string,
  }));
}

/** The attributes one rung's whole rail carries, so `assertOneQualifying` can read it back. */
export function qualifyLayerAttrs(slug: string): { "data-qualify": string } {
  return { "data-qualify": slug };
}

/** The attributes one drawn mark carries inside a rail. Both, always — an element carrying the mark
 *  and not the rung is the half-tagged datum `filter.ts` was written about. */
export function qualifyMarkAttrs(
  slug: string,
  key: string,
): { "data-qualify": string; "data-qualify-mark": string } {
  return { "data-qualify": slug, "data-qualify-mark": key };
}

/**
 * WHERE A VALUE SITS, IN GEOMETRY UNITS. The one conversion this vocabulary owns, used by the beat
 * to draw a mark and by `qualifyCss` to lay out the bar that brackets it — so a bar can never end
 * somewhere its own mark does not. `pad` is a mark's own radius: without it a dot at the rail's zero
 * is a circle centred on the frame's edge and the frame clips half of it away.
 */
export function qualifyPlace(
  value: number,
  { axisMax, width, pad }: { axisMax: number; width: number; pad: number },
): number {
  if (!Number.isFinite(pad) || pad < 0)
    throw new Error(`qualify: the axis pad must be a non-negative number of geometry units, got ${pad}`);
  if (!(width - 2 * pad > 0))
    throw new Error(
      `qualify: an axis padded by ${pad} at both ends of a ${width}-unit frame has no room left to ` +
        "draw in",
    );
  return pad + (value / axisMax) * (width - 2 * pad);
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss`, `floorCss` and `weighCss` do.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `${scope} [data-qualify]` and
 * `${scope} [data-qualify="<slug>"]` score identically — an attribute selector with a value is
 * still one attribute selector — so which wins is source order and nothing else; every blanket is
 * emitted FIRST and the default's reveal after it, and the same pair again inside each rung's
 * `:has()` scope, blanket first. A sankey on this branch rendered green with zero ribbons lit for
 * getting exactly this backwards.
 *
 * NO SELECTOR HERE IS GROUPED, for the defect `stack.ts` records at length: a descendant prefix
 * binds to the first selector of a group only.
 *
 * IT EMITS `data-stack-total` AND `data-stack-note`, WHICH IS NOT A COPY-PASTE SLIP. Those two
 * strings are the FORMAT'S DISCOVERY CONTRACT for a control that moves the picture, owes the reader
 * a sentence and prints a figure ON the plot: `interaction-plan.ts` reads the sentence off
 * `data-stack-note`, and `verify-web.mjs`'s "every argument-bearing word is drawn unconditionally"
 * excludes exactly `[data-stack-total]`, `[data-fits-its-mark]` and `[data-level-rule]` — a word
 * whose visibility is owned by a control nobody has touched is not a word the default view is
 * missing. `aim.ts` makes the same choice for the same reason, and its beat learned it the hard
 * way: spelled `data-aim-figure`, the check failed all three directions, correctly. A third grammar
 * with its own spellings would be invisible to guards written to hold it.
 *
 * AND THE ONE THING THAT TRAVELS. The rails cut — see this file's header for why they must — so the
 * only properties here with a transition are the span bar's `left` and `width`, on elements that
 * are ALWAYS rendered, which is the shape a transition needs. It is also the one movement on the
 * page whose reason a reader can see, because the movement IS the reading: the field's span is what
 * the control hands back, and the bar is that span drawn.
 */
export function qualifyCss(
  declaration: QualifyDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    spanMs,
    width,
    pad,
  }: {
    scope: string;
    idPrefix: string;
    /** How long a span bar takes to reach its new length. Honoured only under `no-preference`. */
    spanMs: number;
    /** The plot's own width in geometry units — what a bar's percentage is a fraction of. The bar
     *  lives in an HTML layer sharing the `<svg>`'s grid cell, so under `preserveAspectRatio="none"`
     *  the one conversion exact at every reader width is a percentage of that layer. */
    width: number;
    /** THE AXIS PAD, IN GEOMETRY UNITS, AND IT IS HERE RATHER THAN IN THE BEAT BECAUSE TWO
     *  DERIVATIONS OF ONE MAPPING IS HOW A BAR COMES TO END SOMEWHERE ITS OWN MARK DOES NOT. A mark
     *  at the rail's zero is a circle centred on the frame's left edge, and half of it is outside the
     *  `viewBox` — measured on this vocabulary's first render, where five dots at 0,0 % were drawn as
     *  half-moons. So the rail is inset by a mark's own radius at both ends, and `qualifyPlace`
     *  below is the ONE function that converts a value to a place; the beat draws with it and this
     *  stylesheet lays its bars out with it. */
    pad: number;
  },
): string {
  if (!declaration) return "";
  if (!Number.isFinite(width) || width <= 0)
    throw new Error(`qualify: the plot width must be a positive number of geometry units, got ${width}`);
  const round = (n: number) => Number(n.toFixed(3));
  const place = (value: number) =>
    (qualifyPlace(value, { axisMax: declaration.axisMax, width, pad }) / width) * 100;
  const at = (span: QualifySpan) => ({
    left: round(place(span.floor)),
    width: round(place(span.ceiling) - place(span.floor)),
  });
  const first = declaration.options[0];
  const defaultSlug = qualifySlugOf(first.key);
  const lines: string[] = [
    `/* The ladder this beat declared: ${declaration.options.length} rungs over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, and the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-stack-note] { visibility: hidden; }`,
    `${scope} [data-stack-total] { display: none; }`,
    `${scope} svg.chart[data-qualify] { display: none; }`,
    `${scope} svg.chart[data-qualify="${defaultSlug}"] { display: block; }`,
    `${scope} [data-stack-total="${defaultSlug}"] { display: block; }`,
  ];
  // The DEFAULT rung's bars, generated here rather than written inline on the element, for the
  // reason `floor.ts` and `weigh.ts` both record: an inline `left` wins against every rule below
  // it, so the bar would never move and a reader would watch the field's span change while the bar
  // drawing that span sat still.
  for (const span of first.spans) {
    const box = at(span);
    lines.push(
      `${scope} [data-qualify-span="${span.lane}"] { left: ${box.left}%; width: ${box.width}%; }`,
    );
  }
  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-qualify-span] { transition: left ${spanMs}ms cubic-bezier(0.4, 0, 0.2, 1), width ${spanMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  );
  for (const option of declaration.options) {
    const slug = qualifySlugOf(option.key);
    const on = `${scope}:has(#${qualifyOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${on} svg.chart[data-qualify] { display: none; }`,
      `${on} svg.chart[data-qualify="${slug}"] { display: block; }`,
      `${on} [data-stack-total] { display: none; }`,
      `${on} [data-stack-total="${slug}"] { display: block; }`,
    );
    for (const span of option.spans) {
      const box = at(span);
      lines.push(
        `${on} [data-qualify-span="${span.lane}"] { left: ${box.left}%; width: ${box.width}%; }`,
      );
    }
    if (option.note)
      lines.push(`${on} [data-stack-note="${slug}"] { visibility: visible; }`);
  }
  return lines.join("\n");
}

/**
 * Reads the WRITTEN PAGE back, which is the only place three of these refusals can be made.
 *
 * `filter.ts` earned the first: an element drawn from a datum that carries the mark and not the
 * rung is a half-tagged datum, and its visible symptom is a label left over a picture it no longer
 * belongs to. `descend.ts` earned the second by mutation — dropping the stylesheet call left every
 * view drawn on top of every other while every attribute-level check stayed green, because the
 * attributes were all still perfectly correct. `weigh.ts` earned the third, and it is inherited
 * here rather than re-earned: see the note at the ordering check.
 */
export function assertOneQualifying(
  html: string,
  declaration: QualifyDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const slugs = declaration.options.map((option) => qualifySlugOf(option.key));
  const declared = new Set(slugs);

  const tags =
    html.match(/<[a-zA-Z][^>]*\sdata-qualify-mark="[^"]*"[^>]*>/g) ?? [];
  if (tags.length === 0)
    throw new Error(
      `${where}: not one element carries \`data-qualify-mark\`. The pills would be drawn over a ` +
        "picture they cannot reach — the same fact `filter.ts` refuses as an option that tags nothing.",
    );
  for (const tag of tags) {
    const rung = /\sdata-qualify="([^"]*)"/.exec(tag);
    const key = /\sdata-qualify-mark="([^"]*)"/.exec(tag);
    if (!rung || !declared.has(rung[1]))
      throw new Error(
        `${where}: the mark ${JSON.stringify(key?.[1] ?? "?")} is drawn with ` +
          `${rung ? `data-qualify="${rung[1]}"` : "no data-qualify"}, which is not one of the ` +
          `declared rungs (${slugs.join(", ")}). A half-tagged datum is drawn in every rung at once.`,
      );
  }

  for (const slug of slugs) {
    if (!html.includes(`data-qualify="${slug}"`))
      throw new Error(
        `${where}: the rung ${JSON.stringify(slug)} is declared and nothing on the page carries it`,
      );
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(html))
      throw new Error(
        `${where}: nothing in the page's stylesheet reveals the rung ${JSON.stringify(slug)}. A ` +
          "vocabulary a beat brings with it has to emit its own rules: without them every rail is " +
          "drawn on top of every other and every attribute is still perfectly correct.",
      );
  }

  // Every lane the declaration reads a span for has a bar to draw it with, or the reading this
  // control hands back is a number with nothing behind it.
  for (const span of declaration.options[0].spans)
    if (!html.includes(`data-qualify-span="${span.lane}"`))
      throw new Error(
        `${where}: lane ${JSON.stringify(span.lane)} declares a span in every rung and the page ` +
          "draws no bar for it. The span is the reading; a reading nothing draws is a figure the " +
          "reader is asked to take on trust.",
      );

  const blanket = html.search(
    /svg\.chart\[data-qualify\]\s*\{\s*display:\s*none/,
  );
  if (blanket < 0)
    throw new Error(
      `${where}: the stylesheet carries no blanket rule hiding the rails, so all ${slugs.length} ` +
        "are drawn at once. This is the rule that must be emitted FIRST, before the default rail's " +
        "own — two attribute selectors score identically and source order is the whole mechanism.",
    );
  // AND IT MUST COME FIRST, WHICH IS A SEPARATE FACT. `weigh.ts` found it by mutation and records
  // it in full: swapping the two base rules renders GREEN in Chrome and at every check, because the
  // DEFAULT rung's own `:has(#…:checked)` block scores (1,3,0) against the base pair's (0,2,1), so
  // in an engine with `:has()` the base pair never decides anything. It decides everything in an
  // engine WITHOUT it, where the swap leaves `display: none` last and the page ships a dot strip
  // with no dots in it. Neither the render path nor the verifier can see that; both are Chrome.
  const reveal = html.search(
    new RegExp(
      `svg\\.chart\\[data-qualify="${slugs[0]}"\\]\\s*\\{\\s*display:`,
    ),
  );
  if (reveal >= 0 && reveal < blanket)
    throw new Error(
      `${where}: the stylesheet reveals the default rail BEFORE the blanket rule that hides them ` +
        "all. Two attribute selectors score identically, so source order is the whole mechanism — " +
        "and an engine without `:has()`, which is the only engine the base pair ever decides " +
        "anything for, would be shown a strip with no dots in it.",
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a qualifier.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function qualifyChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "qualify",
  });
}
