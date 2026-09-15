// twin/skills/chart-web/assets/side.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what it may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum. `fold.ts`
// says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is chosen.
// `trace.ts` says what may be FOLLOWED through an image, `follow.ts` what may be followed through
// its ORDERED STEPS. `hold.ts` says which factor of a product may be HELD STILL. `descend.ts` says
// what may BECOME THE WHOLE. `floor.ts` says what the picture may STAND ON. `cutoff.ts` says where
// the claim's own line is drawn on a value axis. `reorder.ts` says what the same numbers look like
// somewhere else in a cycle. `count.ts` says which members of a fixed frame are counted in.
// `aim.ts` says WHERE a displacement points. `weigh.ts` says what a mark is WORTH. `benchmark.ts`
// says what the verdict is measured against. `datum.ts` says where a diverging ZERO sits.
// `qualify.ts` says what the axis even COUNTS. This file says **WHICH SIDE OF THE ARGUMENT EACH
// BARREAU OF AN ORDERED SCALE COUNTS ON** — one ladder of categories, one set of shares, and a
// boundary the reader slides along the ladder. All of them are native radio inputs plus CSS
// generated at build time (`:checked` and `:has()` on the enclosing figure, no listener, no state,
// not one byte of JavaScript), because that is the only kind of control this format can promise
// still works with the script absent.
//
// WHY A DIVERGING STACKED BAR NEEDS THIS AND THE OTHER THIRTY-TWO TYPES DO NOT.
//
// This is the only type in the catalogue whose premise is a JUDGEMENT rather than a measurement. A
// bar has a length, a dot a position, an interval two ends — all readings of the data. A diverging
// stacked bar has a CENTRE, and the centre is where somebody decided the scale stops meaning one
// thing and starts meaning its opposite. The type sheet says as much twice over: the neutral has to
// be NAMED rather than defaulted to the middle of the array, and the split "only means something
// when there's a real neutral response to straddle". Both sentences are about a decision, not about
// a number.
//
// A still has to take that decision once, print it in the caveat and ask to be trusted. On a Likert
// survey the decision is usually uncontroversial (there is a literal "neither agree nor disagree"
// box on the form). On everything else this type is pointed at — an energy mix, a vote, a budget —
// the decision IS the argument, and every row's apparent balance hangs on it.
//
// SO THE READER IS HANDED THE BOUNDARY. And the reason this type can hand it over while nothing
// else can is that IT HAS NOTHING TO RE-DERIVE: every level keeps the exact share it had, every row
// still sums to its own 100 %, the axis keeps its graduations and its words, the rows keep their
// order and their labels. One thing changes — which side of the centre a band is drawn on — and the
// reader re-learns nothing. Every other type would have to rebuild something, and the rebuild is
// what destroys the reading.
//
// WHY IT IS ITS OWN FILE AND NOT `datum.ts` OR `qualify.ts`, THE TWO NEAR MISSES.
//
// `datum.ts` is the closest by its words and the furthest by its arithmetic. There the reader moves
// a diverging ZERO: the axis is numeric, the reference slides along it, and a value of 12 becomes
// −3 because the zero moved to 15. The categories do not move because there are none — one mark per
// row. Here THE CENTRE NEVER MOVES (it sits at the same place on the plate in every cut, which this
// file's own arithmetic makes structural) and what changes is a category's ALLEGIANCE. A share of
// 67,7 % stays 67,7 %; it changes camp. A diverging bar's zero is a value; a diverging stacked
// bar's cut is a FRONTIER BETWEEN ORDERED CATEGORIES, and no arithmetic in `datum.ts` can express
// one.
//
// `qualify.ts` re-defines the NUMERATOR, and its central guard is that the ladder is a strict
// subtraction: every mark must sit at or left of where the rung before it put it, which is the one
// rule its reader has for reading the control. Neither half transfers. Nothing leaves any sum here
// — the numerator and the denominator are both untouched in every cut, which is why every row still
// totals 100 % — and a row may move in EITHER direction as the cut slides, because a cut that hands
// a level to the left camp moves that row left while a cut that hands one to the right moves it
// right. A vocabulary whose spine is "nothing ever goes right" cannot carry a gesture half of whose
// interest is a row crossing the centre.
//
// `cutoff.ts` draws a line on an axis of VALUES and selects what clears it; its cut is a number.
// This one is a RANK IN AN ORDERED LIST, and the contiguity of that list is this file's principal
// refusal — something `cutoff.ts` has no notion of. `withdraw.ts` takes a term out of a sum and
// watches the sum close; nothing closes here. `stack.ts` moves columns onto a tower and has no
// centre and no camps at all.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     side: {
//       label: "La coupure",                 // the <legend> — the beat's own words
//       axisMax: 100,                        // the axis runs -axisMax .. +axisMax
//       levels: [                            // THE LADDER, in order, left end first. 2 to 5.
//         { key: "charbon-petrole", label: "charbon et petrole" },
//         …
//       ],
//       rows: ["DEU", "FRA", …],             // the rows the beat draws, in drawing order
//       shares: [                            // ONE table, shared by every cut — see below
//         { row: "FRA", level: "nucleaire", share: 67.72 }, …
//       ],
//       cuts: [
//         {
//           key: "straddle",                 // the FIRST cut is the default, and it IS the picture
//           label: "le nucleaire a cheval",  // the page ships in. It carries no note: it is not a
//           announce: "le nucleaire a cheval — …",   // counterfactual, it is the claim.
//           left: 2,                         // how many levels fall LEFT, counting from the ladder's
//           straddle: "nucleaire",           // first. `straddle` names the seam level, or is null.
//           sides: { left: "fossile", right: "renouvelable" },
//           leans: [ { row: "FRA", left: 39.0, right: 61.0, net: 22.1 }, … ],
//         },
//         …
//       ],
//     }
//
// WHY `shares` IS DECLARED ONCE AND NOT PER CUT, WHICH IS A REFUSAL MADE STRUCTURAL RATHER THAN
// CHECKED. "A cut may not change a level's size" is the second-most important thing this control
// promises, and the cheapest way to guarantee it is to give a cut no place to say otherwise. One
// table, read by every cut. A reader who watches a band cross the centre therefore knows, without
// being told, that the definition moved and the data did not — and an author cannot break that by
// mistyping a number, because there is only one number to type. What a cut declares is only WHERE
// THE BOUNDARY IS, plus the reading it hands back, and the reading is checked against the shares.
//
// WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE.
//
//   - A CUT THAT IS NOT CONTIGUOUS. The left camp is a PREFIX of the ladder and the right camp its
//     SUFFIX, with at most one level straddling the seam. `left` is an index, so this is structural
//     too — but the straddle is not, and a straddling level anywhere but the seam is refused: it
//     would put one band across a centre the two camps around it do not meet at.
//   - TWO NEUTRALS. A chart with two levels across the centre has no centre.
//   - A ROW THAT DOES NOT SUM TO 100 %, CHECKED IN EVERY CUT. The type sheet files this as one of
//     the two things that go silently wrong, and a control multiplies it: the promise "these
//     segments are the whole of this row" is made once PER CUT, not once per page.
//   - MORE THAN FIVE LEVELS. The type sheet's own written limit: past five, the two shades per side
//     run out of room and two response levels have been observed sharing one hue — a silent,
//     unreadable collision.
//   - A CUT WITH NOTHING ON ONE SIDE. A diverging chart with an empty camp is a plain stacked bar
//     wearing a centre line, which is exactly what the type sheet says not to draw.
//   - A CUT WHOSE PICTURE EQUALS THE DEFAULT'S. Not one row's net moved by more than the declared
//     floor: that is the default under a second name, which `directed-interaction.md` refuses.
//   - A DECLARED LEAN THAT IS NOT THE LEAN OF THE SHARES. The reading and the drawing must be two
//     readings of one arithmetic, never two arithmetics — the way a page comes to print a figure it
//     does not draw.
//   - A LEVEL NO ROW EVER DRAWS. A barreau offered to the reader that is zero everywhere is a
//     boundary position with nothing on either side of it to see.
//   - A CUT WITH NO SENTENCE, A DEFAULT THAT CARRIES ONE, AND AN ACCESSIBLE NAME THAT DOES NOT
//     CONTAIN ITS VISIBLE LABEL (WCAG 2.5.3) — the conventions every sibling vocabulary holds.
//   - A HALF-TAGGED BAND, A VOCABULARY THAT EMITS NO RULES, and THE BLANKET RULE EMITTED AFTER THE
//     DEFAULT PLATE'S REVEAL — read back off the WRITTEN page by `assertOneCut`. The third is
//     `weigh.ts`'s own finding, inherited rather than re-earned: two attribute selectors score
//     identically, source order is the whole mechanism, and the only engine the base pair ever
//     decides anything for is one without `:has()`, which neither the render path nor the verifier
//     is.
//
// AND NOTHING HERE EMITS A `transform` ON A MARK, for the reason `weigh.ts`, `floor.ts`, `stack.ts`
// and `qualify.ts` all record. `interaction.mjs` resolves the mark under a pointer from `cx`/`cy`
// read ONCE at init, which no CSS transform and no CSS animation ever changes. A band animated
// across the centre would keep answering for the side it left — the worst answer this chart can
// give. Each cut is therefore drawn ONCE, at its own geometry, in its own `<svg class="chart">`,
// and the stylesheet reveals one; a hidden `<svg>` has no CTM and no focusable content, so pointer
// and keyboard only ever reach the plate on screen. What DOES travel is the NET MARKER, an HTML
// element that is always rendered, whose `left` is generated per cut and transitioned — `display`
// does not interpolate, and a property on an element that is always there does. It is also the one
// movement on the page whose reason a reader can see, because the movement IS the reading: a row's
// net lean is what this control hands back, and the marker is that net drawn.

import { controlChromeCss } from "./control-chrome.ts";

/** One barreau of the ordered scale. The array's ORDER is the scale and is the type's premise. */
export type SideLevel = {
  /** The level's own key. The id and every attribute derive from THIS and never from the label —
   *  the single derivation of one identity `filter.ts` records the defect for. */
  key: string;
  /** The barreau's visible words, used in the pointer's answer and in the beat's own legend. */
  label: string;
};

/** What one row holds of one level, as a share of that row's own whole, in per cent. ONE table for
 *  the whole control: a cut has no place to say otherwise, which is how "a cut may not resize a
 *  level" is guaranteed rather than checked. */
export type SideShare = { row: string; level: string; share: number };

/** The reading one cut hands back for one row: how much falls each side of the centre, and the net
 *  lean that is the difference. Declared so it can be checked against the shares rather than
 *  recomputed in a browser, and so the refusals below are made against numbers the page prints. */
export type SideLean = {
  row: string;
  left: number;
  right: number;
  net: number;
};

/** One position of the boundary. The first declared is the default and carries no `note`. */
export type SideCut = {
  /** Where the boundary sits, in one slug. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It
   *  must CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG
   *  2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /** The sentence revealed under the control, in the beat's own words. Required on every cut but
   *  the default, and refused ON the default: the untouched picture is not a counterfactual, it is
   *  the claim, and a note under it would be the title said a second time. */
  note?: string;
  /** How many levels of the ladder fall on the LEFT, counting from its first. The boundary is an
   *  INDEX, which is what makes a non-contiguous camp impossible to express. */
  left: number;
  /** The level drawn across the centre, half each side, or `null`. It must be the level AT the
   *  seam — `levels[left]` — and there may be at most one. */
  straddle?: string | null;
  /** What the two camps are called UNDER THIS CUT. They change with the boundary, because that is
   *  exactly what the boundary does; `name-each-half-in-words` becomes the control itself. */
  sides: { left: string; right: string };
  /** One per row: the reading. */
  leans: SideLean[];
};

/** What a beat declares when it wants a movable boundary. Absent/`null` means it wants none. */
export type SideDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The axis runs from `-axisMax` to `+axisMax` in the data's own unit. */
  axisMax: number;
  /** The ordered scale, left end first. Two at least, FIVE at most — the type sheet's own limit. */
  levels: SideLevel[];
  /** The rows the beat draws, in drawing order. */
  rows: string[];
  /** Every row's every level, once. */
  shares: SideShare[];
  /** At least two. The FIRST is the default: the picture the page ships in, the picture a reader
   *  with no script never leaves, and the one every other cut's reading is measured against. */
  cuts: SideCut[];
};

/** The type sheet's own written limit: `<!-- limit: levels > 5 -->`. */
export const SIDE_LEVEL_CEILING = 5;

/** A CSS-id-safe slug, derived from a KEY and never from a label. */
export function sideSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for a cut's slug. One function, three readers. */
export function sideOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * WHERE A VALUE SITS ACROSS THE PLATE, AS A PERCENTAGE OF ITS WIDTH. The one conversion this
 * vocabulary owns, used by the beat to draw a band and by `sideCss` to place the net marker — so a
 * marker can never land somewhere the geometry it reads does not. A percentage and not a geometry
 * unit, because the marker lives in an HTML layer sharing the `<svg>`'s grid cell and, under
 * `preserveAspectRatio="none"`, a percentage of that layer is the one conversion exact at every
 * reader width.
 */
export function sideAt(
  value: number,
  { axisMax }: { axisMax: number },
): number {
  if (!Number.isFinite(axisMax) || axisMax <= 0)
    throw new Error(
      `side: the axis must run to a positive number, got ${axisMax}`,
    );
  return 50 + (value / axisMax) * 50;
}

const shareKey = (s: { row: string; level: string }) => `${s.row} ${s.level}`;

/**
 * EVERY REFUSAL THIS FILE OWNS, MADE AGAINST WHAT THE COMPONENT IS ABOUT TO DRAW.
 *
 * `netFloor` is the smallest change in a row's net lean, in the data's own unit, that makes a cut a
 * second picture rather than the default's picture under a second name.
 */
export function assertSideDeclaration(
  declaration: SideDeclaration,
  { netFloor }: { netFloor: number },
): void {
  const where = "side declaration";
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
      `${where}: \`axisMax\` must be a positive number in the data's unit — got ${declaration.axisMax}`,
    );

  // THE LADDER.
  if (!Array.isArray(declaration.levels) || declaration.levels.length < 2)
    throw new Error(
      `${where}: a scale of ${declaration.levels?.length ?? 0} barreau(x) has no inside for a ` +
        "boundary to sit in. This type stacks ORDERED categories on both sides of a split.",
    );
  if (declaration.levels.length > SIDE_LEVEL_CEILING)
    throw new Error(
      `${where}: ${declaration.levels.length} levels, and the type sheet's own written limit is ` +
        `${SIDE_LEVEL_CEILING} (\`limit: levels > 5\`). The palette this chart uses is built for two ` +
        "shades per side; past five, two response levels have been observed sharing one hue — a " +
        "silent, unreadable collision rather than a stylistic compromise. Collapse the scale first.",
    );
  const levelSlugs = declaration.levels.map((level) => {
    if (typeof level?.label !== "string" || !level.label.trim())
      throw new Error(
        `${where}: every barreau needs a label — got ${JSON.stringify(level)}`,
      );
    const slug = sideSlugOf(level.key);
    if (!slug)
      throw new Error(
        `${where}: the level key ${JSON.stringify(level.key)} slugs to an empty string — rename it`,
      );
    return slug;
  });
  if (new Set(levelSlugs).size !== levelSlugs.length)
    throw new Error(
      `${where}: two barreaux slug to the same string — one band would carry both`,
    );

  // THE ROWS.
  if (!Array.isArray(declaration.rows) || declaration.rows.length === 0)
    throw new Error(`${where}: the beat draws no rows`);
  if (new Set(declaration.rows).size !== declaration.rows.length)
    throw new Error(`${where}: the drawn rows are not unique`);

  // THE ONE TABLE OF SHARES, AND THE TYPE SHEET'S OWN FILED DEFECT.
  if (!Array.isArray(declaration.shares))
    throw new Error(
      `${where}: \`shares\` must be the one table every cut reads`,
    );
  const share = new Map<string, number>();
  for (const entry of declaration.shares) {
    if (!declaration.rows.includes(entry.row))
      throw new Error(
        `${where}: a share is declared for row ${JSON.stringify(entry.row)}, which this beat does ` +
          "not draw",
      );
    if (!levelSlugs.includes(sideSlugOf(entry.level)))
      throw new Error(
        `${where}: a share is declared for barreau ${JSON.stringify(entry.level)}, which is not on ` +
          `the scale (${levelSlugs.join(", ")})`,
      );
    const id = shareKey({ row: entry.row, level: sideSlugOf(entry.level) });
    if (share.has(id))
      throw new Error(`${where}: ${JSON.stringify(id)} is declared twice`);
    if (!Number.isFinite(entry.share) || entry.share < 0 || entry.share > 100)
      throw new Error(
        `${where}: ${JSON.stringify(id)} holds ${entry.share} % of its row. A share outside 0..100 ` +
          "is a band drawn nowhere, silently.",
      );
    share.set(id, entry.share);
  }
  for (const row of declaration.rows) {
    let total = 0;
    for (const slug of levelSlugs) {
      const id = shareKey({ row, level: slug });
      if (!share.has(id))
        throw new Error(
          `${where}: row ${JSON.stringify(row)} declares nothing for barreau ${JSON.stringify(slug)}`,
        );
      total += share.get(id) as number;
    }
    // THE TYPE SHEET'S SECOND FILED DEFECT, AND IT IS SILENT: "a diverging stacked bar makes an
    // implicit promise that these segments are the whole of this row's responses", and a row that
    // does not total 100 % is quietly making a different claim than the shape of the chart is.
    if (Math.abs(total - 100) > 0.01)
      throw new Error(
        `${where}: row ${JSON.stringify(row)}'s barreaux sum to ${total.toFixed(3)} %, not 100. ` +
          "This type promises that its segments are the WHOLE of a row; a row that does not total " +
          "100 % is making a different claim than the shape of the chart is making.",
      );
  }
  // A LEVEL NO ROW EVER DRAWS is a boundary position with nothing to see on either side of it.
  for (const slug of levelSlugs) {
    const drawn = declaration.rows.some(
      (row) => (share.get(shareKey({ row, level: slug })) ?? 0) > 0,
    );
    if (!drawn)
      throw new Error(
        `${where}: barreau ${JSON.stringify(slug)} is zero in all ${declaration.rows.length} rows. ` +
          "The reader is offered a boundary position with nothing on either side of it to look at.",
      );
  }

  // THE CUTS.
  if (!Array.isArray(declaration.cuts) || declaration.cuts.length < 2)
    throw new Error(
      `${where}: needs at least two boundary positions to be a choice, got ` +
        `${declaration.cuts?.length ?? 0}. A beat that does not need a movable cut declares none.`,
    );
  const seen = new Map<string, string>();
  const netOf = new Map<string, Map<string, number>>();

  declaration.cuts.forEach((cut, index) => {
    const isDefault = index === 0;
    if (typeof cut?.label !== "string" || !cut.label.trim())
      throw new Error(
        `${where}: every cut needs a label — got ${JSON.stringify(cut)}`,
      );
    const slug = sideSlugOf(cut.key);
    if (!slug)
      throw new Error(
        `${where}: the cut key ${JSON.stringify(cut.key)} slugs to an empty string — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(cut.label)} both slug to ` +
          `${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, cut.label);

    if (typeof cut.announce !== "string" || !cut.announce.trim())
      throw new Error(
        `${where}: cut ${JSON.stringify(cut.label)} has no \`announce\` — a control whose answer is ` +
          "only a picture leaves a keyboard reader with nothing",
      );
    if (!cut.announce.includes(cut.label))
      throw new Error(
        `${where}: cut ${JSON.stringify(cut.label)} announces ${JSON.stringify(cut.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain " +
          "the visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot " +
          "reach this cut",
      );
    if (isDefault && typeof cut.note === "string" && cut.note.trim())
      throw new Error(
        `${where}: the default cut ${JSON.stringify(cut.label)} carries a note. The first cut IS ` +
          "the picture the page ships in; a sentence revealed under it would be the title said a " +
          "second time, in a second place, to a reader who never chose anything.",
      );
    if (!isDefault && (typeof cut.note !== "string" || !cut.note.trim()))
      throw new Error(
        `${where}: cut ${JSON.stringify(cut.label)} has no \`note\` — an argument the reader built ` +
          "that is only a picture cannot be checked, and a reader who is not looking at the plot " +
          "gets nothing at all",
      );
    if (
      typeof cut.sides?.left !== "string" ||
      !cut.sides.left.trim() ||
      typeof cut.sides?.right !== "string" ||
      !cut.sides.right.trim()
    )
      throw new Error(
        `${where}: cut ${JSON.stringify(cut.label)} does not NAME ITS TWO CAMPS. A reader who does ` +
          "not already know which way is which cannot recover it from the bars, and under a movable " +
          "boundary the names are the half that changes.",
      );

    // THE BOUNDARY IS AN INDEX, so a non-contiguous camp cannot be expressed at all. What can be
    // expressed wrongly is the STRADDLE, and a level drawn across a centre the camps around it do
    // not meet at is exactly the drift the type sheet files first.
    if (
      !Number.isInteger(cut.left) ||
      cut.left < 0 ||
      cut.left > declaration.levels.length
    )
      throw new Error(
        `${where}: cut ${JSON.stringify(cut.label)} puts ${cut.left} barreaux on the left of a ` +
          `${declaration.levels.length}-barreau scale. The boundary is an index into the scale.`,
      );
    const straddleSlug = cut.straddle ? sideSlugOf(cut.straddle) : null;
    if (straddleSlug !== null) {
      if (!levelSlugs.includes(straddleSlug))
        throw new Error(
          `${where}: cut ${JSON.stringify(cut.label)} straddles ${JSON.stringify(straddleSlug)}, ` +
            `which is not on the scale (${levelSlugs.join(", ")})`,
        );
      if (levelSlugs[cut.left] !== straddleSlug)
        throw new Error(
          `${where}: cut ${JSON.stringify(cut.label)} straddles ${JSON.stringify(straddleSlug)} ` +
            `while its seam is at ${JSON.stringify(levelSlugs[cut.left] ?? "the scale's end")}. ` +
            "The neutral is the barreau AT the boundary and nowhere else — a level drawn across a " +
            "centre the two camps around it do not meet at is the silent drift this type files as " +
            "its own first defect.",
        );
    }

    // A CUT WITH NOTHING ON ONE SIDE is a plain stacked bar wearing an unearned centre line.
    const leftCount = cut.left;
    const rightCount =
      declaration.levels.length - cut.left - (straddleSlug ? 1 : 0);
    if (leftCount === 0 && !straddleSlug)
      throw new Error(
        `${where}: cut ${JSON.stringify(cut.label)} leaves the left camp empty. A diverging chart ` +
          "with one camp is a plain stacked bar wearing a centre line, which is the one thing the " +
          "type sheet says not to draw.",
      );
    if (rightCount === 0 && !straddleSlug)
      throw new Error(
        `${where}: cut ${JSON.stringify(cut.label)} leaves the right camp empty. A diverging chart ` +
          "with one camp is a plain stacked bar wearing a centre line, which is the one thing the " +
          "type sheet says not to draw.",
      );

    // THE READING, CHECKED AGAINST THE SHARES. Two readings of one arithmetic, never two
    // arithmetics: recomputed here from the single table and compared with what the beat declared.
    if (
      !Array.isArray(cut.leans) ||
      cut.leans.length !== declaration.rows.length
    )
      throw new Error(
        `${where}: cut ${JSON.stringify(cut.label)} declares ${cut.leans?.length ?? 0} leans for ` +
          `${declaration.rows.length} rows — the lean is the reading this control hands back`,
      );
    const mine = new Map<string, number>();
    for (const row of declaration.rows) {
      const declared = cut.leans.find((lean) => lean.row === row);
      if (!declared)
        throw new Error(
          `${where}: cut ${JSON.stringify(cut.label)} declares no lean for row ${JSON.stringify(row)}`,
        );
      let left = 0;
      let right = 0;
      levelSlugs.forEach((slug, i) => {
        const value = share.get(shareKey({ row, level: slug })) as number;
        if (slug === straddleSlug) {
          left += value / 2;
          right += value / 2;
        } else if (i < cut.left) left += value;
        else right += value;
      });
      if (
        Math.abs(declared.left - left) > 0.05 ||
        Math.abs(declared.right - right) > 0.05 ||
        Math.abs(declared.net - (right - left)) > 0.05
      )
        throw new Error(
          `${where}: cut ${JSON.stringify(cut.label)} declares row ${JSON.stringify(row)} at ` +
            `${declared.left.toFixed(2)} / ${declared.right.toFixed(2)} (net ` +
            `${declared.net.toFixed(2)}) and its own barreaux give ${left.toFixed(2)} / ` +
            `${right.toFixed(2)} (net ${(right - left).toFixed(2)}). The bands the page draws and ` +
            "the figures it prints would be two different readings of one cut.",
        );
      // Restated where the shape of the chart makes it, rather than only where the table does: a
      // cut is a promise about a WHOLE row, and it is made once per cut.
      if (Math.abs(left + right - 100) > 0.01)
        throw new Error(
          `${where}: under cut ${JSON.stringify(cut.label)}, row ${JSON.stringify(row)} covers ` +
            `${(left + right).toFixed(3)} % of itself, not 100`,
        );
      mine.set(row, right - left);
    }
    netOf.set(slug, mine);
    if (isDefault) return;

    // A CUT WHOSE PICTURE EQUALS THE DEFAULT'S.
    const base = netOf.get(sideSlugOf(declaration.cuts[0].key)) as Map<
      string,
      number
    >;
    let biggest = 0;
    for (const row of declaration.rows) {
      const moved = Math.abs(
        (mine.get(row) as number) - (base.get(row) as number),
      );
      if (moved > biggest) biggest = moved;
    }
    if (biggest <= netFloor)
      throw new Error(
        `${where}: cut ${JSON.stringify(cut.label)} moves no row's net lean by more than ` +
          `${biggest.toFixed(3)} (floor ${netFloor}) — it is the default under a second name, and ` +
          "the reader would operate this control while every bar stood still.",
      );
  });
}

/** The cuts a component draws, in reading order: the default first. */
export function sideCutsForMarkup(
  declaration: SideDeclaration | null | undefined,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isDefault: boolean;
}[] {
  if (!declaration) return [];
  return declaration.cuts.map((cut, index) => ({
    id: sideOptionId(idPrefix, sideSlugOf(cut.key)),
    slug: sideSlugOf(cut.key),
    label: cut.label,
    announce: cut.announce,
    isDefault: index === 0,
  }));
}

/** The sentences the control owes. The default gets none: it is not a counterfactual, it is the
 *  claim. */
export function sideNotesForMarkup(
  declaration: SideDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.cuts.slice(1).map((cut) => ({
    slug: sideSlugOf(cut.key),
    text: cut.note as string,
  }));
}

/** The attributes one cut's whole plate carries, so `assertOneCut` can read it back. */
export function sideLayerAttrs(slug: string): { "data-side": string } {
  return { "data-side": slug };
}

/** The attributes one drawn band carries inside a plate. Both, always — an element carrying the
 *  band and not the cut is the half-tagged datum `filter.ts` was written about. */
export function sideBandAttrs(
  slug: string,
  row: string,
  level: string,
): { "data-side": string; "data-side-band": string } {
  return { "data-side": slug, "data-side-band": `${row}:${sideSlugOf(level)}` };
}

/**
 * THE GEOMETRY OF ONE CUT, DERIVED FROM THE ONE TABLE. The bands of one row, left to right, each
 * with the span of the axis it covers — so the component never does this arithmetic a second time
 * and a band can never be drawn on a side the declaration does not put it on.
 *
 * `from` and `to` are in the axis's own unit, running `-axisMax .. +axisMax`, and the straddling
 * level is the only one whose span crosses zero.
 */
export function sideBandsOf(
  declaration: SideDeclaration,
  cutSlug: string,
  row: string,
): {
  level: string;
  label: string;
  share: number;
  from: number;
  to: number;
  side: "left" | "right" | "centre";
}[] {
  const cut = declaration.cuts.find((c) => sideSlugOf(c.key) === cutSlug);
  if (!cut)
    throw new Error(`side: no cut ${JSON.stringify(cutSlug)} is declared`);
  const straddleSlug = cut.straddle ? sideSlugOf(cut.straddle) : null;
  const shareOf = (level: string) =>
    declaration.shares.find(
      (s) => s.row === row && sideSlugOf(s.level) === level,
    )?.share ?? 0;

  const out: {
    level: string;
    label: string;
    share: number;
    from: number;
    to: number;
    side: "left" | "right" | "centre";
  }[] = [];
  // The left camp is laid OUTWARD from the centre — the barreau nearest the seam nearest the zero —
  // so the scale's strongest end is at the bar's outer tip in both directions. That is the type
  // sheet's "lighter shades near the centre and deeper shades toward the strong-opinion ends",
  // expressed as an ORDER rather than only as a ramp.
  let edge = straddleSlug ? -shareOf(straddleSlug) / 2 : 0;
  for (let i = cut.left - 1; i >= 0; i -= 1) {
    const level = sideSlugOf(declaration.levels[i].key);
    const value = shareOf(level);
    out.push({
      level,
      label: declaration.levels[i].label,
      share: value,
      from: edge - value,
      to: edge,
      side: "left",
    });
    edge -= value;
  }
  if (straddleSlug) {
    const value = shareOf(straddleSlug);
    out.push({
      level: straddleSlug,
      label: declaration.levels[cut.left].label,
      share: value,
      from: -value / 2,
      to: value / 2,
      side: "centre",
    });
  }
  edge = straddleSlug ? shareOf(straddleSlug) / 2 : 0;
  for (
    let i = cut.left + (straddleSlug ? 1 : 0);
    i < declaration.levels.length;
    i += 1
  ) {
    const level = sideSlugOf(declaration.levels[i].key);
    const value = shareOf(level);
    out.push({
      level,
      label: declaration.levels[i].label,
      share: value,
      from: edge,
      to: edge + value,
      side: "right",
    });
    edge += value;
  }
  return out;
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss`, `floorCss` and `qualifyCss` do.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `${scope} svg.chart[data-side]` and
 * `${scope} svg.chart[data-side="<slug>"]` score identically — an attribute selector with a value is
 * still one attribute selector — so which wins is source order and nothing else; every blanket is
 * emitted FIRST and the default's reveal after it, and the same pair again inside each cut's
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
 * excludes exactly `[data-stack-total]`, `[data-fits-its-mark]` and `[data-level-rule]`. `aim.ts`
 * and `qualify.ts` both make the same choice for the same reason, and `aim.ts` learned it the hard
 * way: spelled `data-aim-figure`, the check failed all three directions, correctly.
 */
export function sideCss(
  declaration: SideDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    netMs,
  }: {
    scope: string;
    idPrefix: string;
    /** How long a net marker takes to reach its new position. Honoured only under `no-preference`. */
    netMs: number;
  },
): string {
  if (!declaration) return "";
  const round = (n: number) => Number(n.toFixed(3));
  const place = (net: number) =>
    round(sideAt(net, { axisMax: declaration.axisMax }));
  const first = declaration.cuts[0];
  const defaultSlug = sideSlugOf(first.key);
  const lines: string[] = [
    `/* The boundary this beat declared: ${declaration.cuts.length} positions on a ${declaration.levels.length}-barreau scale,`,
    `   over ${JSON.stringify(declaration.label)}. Radios plus :checked/:has(), generated once at build`,
    `   time — the same mechanism filter.ts narrows with, and the reason this control needs no script`,
    `   and survives one being blocked. */`,
    `${scope} [data-stack-note] { display: none; }`,
    `${scope} [data-stack-total] { display: none; }`,
    `${scope} svg.chart[data-side] { display: none; }`,
    `${scope} svg.chart[data-side="${defaultSlug}"] { display: block; }`,
    `${scope} [data-stack-total="${defaultSlug}"] { display: block; }`,
  ];
  // The DEFAULT cut's net markers, generated here rather than written inline on the element, for the
  // reason `floor.ts`, `weigh.ts` and `qualify.ts` all record: an inline `left` wins against every
  // rule below it, so the marker would never move and a reader would watch a row change camp while
  // the mark drawing that change sat still.
  for (const lean of first.leans)
    lines.push(
      `${scope} [data-side-net="${lean.row}"] { left: ${place(lean.net)}%; }`,
    );
  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-side-net] { transition: left ${netMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  );
  for (const cut of declaration.cuts) {
    const slug = sideSlugOf(cut.key);
    const on = `${scope}:has(#${sideOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${on} svg.chart[data-side] { display: none; }`,
      `${on} svg.chart[data-side="${slug}"] { display: block; }`,
      `${on} [data-stack-total] { display: none; }`,
      `${on} [data-stack-total="${slug}"] { display: block; }`,
    );
    for (const lean of cut.leans)
      lines.push(
        `${on} [data-side-net="${lean.row}"] { left: ${place(lean.net)}%; }`,
      );
    if (cut.note)
      lines.push(`${on} [data-stack-note="${slug}"] { display: revert; }`);
  }
  return lines.join("\n");
}

/**
 * Reads the WRITTEN PAGE back, which is the only place three of these refusals can be made.
 *
 * `filter.ts` earned the first: an element drawn from a datum that carries the band and not the cut
 * is a half-tagged datum, and its visible symptom is a label left over a picture it no longer
 * belongs to. `descend.ts` earned the second by mutation — dropping the stylesheet call left every
 * plate drawn on top of every other while every attribute-level check stayed green, because the
 * attributes were all still perfectly correct. `weigh.ts` earned the third, and it is inherited here
 * rather than re-earned: see the note at the ordering check.
 */
export function assertOneCut(
  html: string,
  declaration: SideDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const slugs = declaration.cuts.map((cut) => sideSlugOf(cut.key));
  const declared = new Set(slugs);

  const tags =
    html.match(/<[a-zA-Z][^>]*\sdata-side-band="[^"]*"[^>]*>/g) ?? [];
  if (tags.length === 0)
    throw new Error(
      `${where}: not one element carries \`data-side-band\`. The pills would be drawn over a ` +
        "picture they cannot reach — the same fact `filter.ts` refuses as an option that tags nothing.",
    );
  for (const tag of tags) {
    const cut = /\sdata-side="([^"]*)"/.exec(tag);
    const band = /\sdata-side-band="([^"]*)"/.exec(tag);
    if (!cut || !declared.has(cut[1]))
      throw new Error(
        `${where}: the band ${JSON.stringify(band?.[1] ?? "?")} is drawn with ` +
          `${cut ? `data-side="${cut[1]}"` : "no data-side"}, which is not one of the declared cuts ` +
          `(${slugs.join(", ")}). A half-tagged band is drawn under every cut at once.`,
      );
  }

  for (const slug of slugs) {
    if (!html.includes(`data-side="${slug}"`))
      throw new Error(
        `${where}: the cut ${JSON.stringify(slug)} is declared and nothing on the page carries it`,
      );
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(html))
      throw new Error(
        `${where}: nothing in the page's stylesheet reveals the cut ${JSON.stringify(slug)}. A ` +
          "vocabulary a beat brings with it has to emit its own rules: without them every plate is " +
          "drawn on top of every other and every attribute is still perfectly correct.",
      );
  }

  // Every row the declaration reads a lean for has a marker to draw it with, or the reading this
  // control hands back is a number with nothing behind it.
  for (const lean of declaration.cuts[0].leans)
    if (!html.includes(`data-side-net="${lean.row}"`))
      throw new Error(
        `${where}: row ${JSON.stringify(lean.row)} declares a net lean in every cut and the page ` +
          "draws no marker for it. The net is the reading; a reading nothing draws is a figure the " +
          "reader is asked to take on trust.",
      );

  const blanket = html.search(/svg\.chart\[data-side\]\s*\{\s*display:\s*none/);
  if (blanket < 0)
    throw new Error(
      `${where}: the stylesheet carries no blanket rule hiding the plates, so all ${slugs.length} ` +
        "are drawn at once. This is the rule that must be emitted FIRST, before the default plate's " +
        "own — two attribute selectors score identically and source order is the whole mechanism.",
    );
  // AND IT MUST COME FIRST, WHICH IS A SEPARATE FACT. `weigh.ts` found it by mutation and records it
  // in full: swapping the two base rules renders GREEN in Chrome and at every check, because the
  // DEFAULT cut's own `:has(#…:checked)` block scores (1,3,0) against the base pair's (0,2,1), so in
  // an engine with `:has()` the base pair never decides anything. It decides everything in an engine
  // WITHOUT it, where the swap leaves `display: none` last and the page ships a chart with no bars
  // in it. Neither the render path nor the verifier can see that; both are Chrome.
  const reveal = html.search(
    new RegExp(`svg\\.chart\\[data-side="${slugs[0]}"\\]\\s*\\{\\s*display:`),
  );
  if (reveal >= 0 && reveal < blanket)
    throw new Error(
      `${where}: the stylesheet reveals the default plate BEFORE the blanket rule that hides them ` +
        "all. Two attribute selectors score identically, so source order is the whole mechanism — " +
        "and an engine without `:has()`, which is the only engine the base pair ever decides " +
        "anything for, would be shown a chart with no bars in it.",
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a movable boundary.
 *
 * ONE DRAWING, IN ONE PLACE. `control-chrome.ts` carries the drawing and the measurements behind
 * it; what is left here is the only thing that was ever this control's own — how many lines of
 * sentence to reserve, and that the sentences are STACKED in one grid cell. They are stacked
 * because this control's three sentences wrap to three different heights, and a row that grows when
 * a sentence is revealed pushes the plot down under the reader's hands.
 */
export function sideChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "side",
    notes: {
      stacked: true,
      reserve: "3em",
      why:
        "Two lines at the frame's own width, which is what the longest of this beat's three revealed " +
        "sentences takes there, measured in Chrome rather than guessed; stacked in one cell so the " +
        "tallest is always what the row is, and choosing a cut never moves the plot.",
    },
  });
}
