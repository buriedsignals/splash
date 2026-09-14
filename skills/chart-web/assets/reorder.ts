// twin/skills/chart-web/assets/reorder.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what the picture may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum.
// `fold.ts` says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is
// chosen. `trace.ts` says what may be FOLLOWED through an image. This file says **what the same
// numbers look like in a different place in a cyclic sequence** — the axes of a radial chart handed
// round the circle, every value untouched, so the thing a reader's eye was actually judging turns
// out to be a property of the LAYOUT and not of the data. All of them are native radio inputs plus
// CSS generated at build time (`:checked` and `:has()` on the enclosing figure, no listener, no
// state, not one byte of JavaScript), because that is the only kind of control this format can
// promise still works with the script absent.
//
// WHY THIS ONE IS NOT LIKE THE OTHERS: IT IS A CONTROL THAT EXISTS TO DISCREDIT ITS OWN CHART.
//
// Every other vocabulary in this family ADDS a reading. A filter narrows to the part the reader
// wanted; a yardstick lays down the reference they were missing; a fold turns an inference into a
// shape. Each of them makes the picture say MORE. This one makes the picture say LESS, on purpose,
// and it is the only honest use of the gesture on the type it was written for.
//
// `chart-beat/references/types/radar.md` does not warn about a decoration on the radar. It says the
// type misreports: *"a polygon's AREA (the thing a reader's eye actually judges at a glance) is
// sensitive to axis order and count in a way the underlying numbers aren't ... this is the type's
// structural weak point, not a bug to be fixed in code"* — and, in the same sheet's accessibility
// section, that the type ships with **no mechanical guard at all** behind that problem. A still can
// answer it exactly one way: pick an ordering, state it on the plate, ask to be trusted. This file
// is the other answer, the one only an interactive page can give — let the reader run the
// manipulation and watch their own takeaway move while every number stands still.
//
// WHY IT IS ITS OWN FILE AND NOT AN OPTION IN ONE OF THE SEVEN.
//
// `stack.ts` is the near miss and the distinction is exact. A stack ARRANGES: it takes marks that
// were side by side and puts them on top of each other, and the reading it owes is the running total
// that arrangement creates. Its vocabulary is a set of keys plus a destination. A reorder has no
// destination — nothing is added, nothing is summed, nothing leaves, nothing is laid over anything,
// and the marks do not move to a new KIND of place. They move to each other's places, in a CYCLE,
// where "first" and "last" are not distinguishable and where reversing the whole sequence changes
// nothing at all. A vocabulary that cannot express "this ordering and its mirror are one picture"
// cannot refuse the option that draws the picture the reader is already looking at, and refusing
// that is most of what this file does.
//
// `filter.ts` is the other near miss and it fails on its own first promise: *"the marks outside a
// named set leave, and the frame they were measured against does not move."* Here nothing leaves,
// and the frame is precisely what moves.
//
// AND THE ARITHMETIC THIS FILE OWNS IS THE REFUSAL ITSELF. `ringArea` is the shoelace area of a
// closed polygon whose vertices sit on evenly spaced spokes, which for n spokes collapses to
// `0.5 * sin(2*PI/n) * SUM(v[i] * v[i+1])` — a sum over ADJACENT PAIRS, which is the whole reason
// axis order moves it and the underlying numbers do not. With it, two refusals no other file in this
// family can make:
//
//   - an ordering that is a rotation or a mirror of one already offered draws the SAME POLYGON, so
//     the reader operates the control and the picture does not change — the one thing
//     `directed-interaction.md` refuses outright;
//   - an ordering that genuinely rearranges the spokes but lands on the same area as the plate's
//     shows the reader nothing about the thing this control exists to expose, and is refused with
//     the measured areas quoted.
//
// WHERE IT COMES FROM. `proof/web-radar-electricity-mix`. France and Germany generate within 12 % of
// each other from opposite mixes; both countries' eight shares sum to 100, so if a polygon's area
// meant anything the two shapes would be comparable. Measured over all 5 040 orderings of its eight
// axes (2 520 distinct shapes, each appearing once more as its own mirror): France's polygon spans
// 0,50 % to 3,45 % of the disc — a factor of 6,95 — and the ratio of Germany's area to France's
// spans 0,60 to 6,83, which is to say the eye's answer to *who covers more of the circle* can be
// turned all the way round by nothing but where the spokes sit.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     reorder: {
//       label: "Ordre des axes",            // the <legend> — the beat's own words
//       noneLabel: "celui de la plaque",    // the untouched option. Always first, always the
//                                           // default, and it IS the picture the page ships in.
//       axes: [{ key: "Nuclear", name: "nucleaire" }, ...],  // as the PLATE draws them, in its order
//       options: [
//         {
//           key: "france",
//           label: "trie sur la France",
//           announce: "Ranger les axes trie sur la France ...",  // must contain `label`
//           note: "...",      // revealed under the control, and where the derived reading lives
//           readout: "...",   // revealed ON the plot, where the reader's eye already is
//           order: ["Nuclear", "Hydropower", ...],  // every axis key, exactly once
//         },
//         ...
//       ],
//     }
//
// NO COORDINATE IS DECLARED HERE, unlike `fold.ts`'s `at` or `level.ts`'s `LevelMark`. An ordering is
// a permutation of names; where the eighth spoke of a circle lands is arithmetic only the component
// that owns the scale can do, and it does it identically for every option because the spokes
// themselves never move. That is the geometric fact underneath the whole gesture: the FRAME is fixed
// and evenly spaced, and only which name sits on which spoke changes.

import { answerPieces, defaultPrintedText } from "./interaction-plan.ts";

/** One axis of the radial frame: the key the beat's own data is keyed by, and the word the reader
 *  sees on the spoke. */
export type ReorderAxis = { key: string; name: string };

/** One series the plate actually draws, with its reading on every axis — handed to
 *  `assertReorderDeclaration` so an ordering can be measured against the shapes it will really
 *  produce rather than against a list of names that happens to be the right length. */
export type ReorderSeries = { key: string; values: Record<string, number> };

/** One option: the ordering, and the words for it. */
export type ReorderOption = {
  /** The ordering's own identity, and the only thing its slug is derived from. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It
   *  must CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG
   *  2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /**
   * THE SENTENCE REVEALED UNDER THE CONTROL, AND IT IS REQUIRED.
   *
   * The redrawn polygons are the answer for a reader looking at the picture. This is the answer for
   * the one who is not — and it is where the DERIVED readings live, the ones a polygon cannot draw
   * at all: the area this ordering produces for each series, and the ratio between them set against
   * the ratio the plate's own order produced. `filterNotes`, `stackNotesForMarkup`,
   * `levelNotesForMarkup`, `withdrawNotesForMarkup` and `foldNotesForMarkup` hold the same position
   * for the same reason.
   */
  note: string;
  /**
   * THE SAME PRODUCT, PRINTED ON THE PLOT.
   *
   * A reader who is looking at the two polygons is asking "which is bigger", and an answer that
   * lives under the control is an answer in the wrong place — `fold.ts` puts its crossing on the
   * plot for exactly this reason. Short, because it sits over the drawing.
   */
  readout: string;
  /** The ordering itself: every declared axis key, exactly once, in the order the spokes take it. */
  order: string[];
};

/** What a beat declares when it wants a reorder. Absent/`null` means it wants none. */
export type ReorderDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. It is always first, always the default, and it is the plate. */
  noneLabel: string;
  /**
   * WHAT THE CONTROL WILL DO, SAID BEFORE IT IS PRESSED — and it is required, because the owner
   * had to ask.
   *
   * He looked at a finished page and asked *« pourquoi les labels changent d'ordre au filtre ? »*.
   * The gesture was working exactly as designed; what was missing is that nothing on the page said
   * so until after the pill was pressed. Every other sentence this vocabulary owns is a
   * COUNTERFACTUAL — what this ordering produced, once it exists — and a counterfactual cannot warn
   * anybody. A legend names the control (`Ordre des axes`), which tells a reader what it is ABOUT
   * and not what pressing it DOES; eight words jumping round a circle with no warning is the
   * reader's first experience of the control either way.
   *
   * So this is the one sentence in the whole mechanism written for the state the page SHIPS in. It
   * takes the same reserved row the counterfactuals take, directly under the control and directly
   * above the drawing, so it is read where the change will happen and costs the layout nothing: the
   * row is already as tall as the longest sentence in it.
   */
  noneNote: string;
  /** The axes AS THE PLATE DRAWS THEM, in the plate's own order. This is the ordering every option
   *  is refused against, and it is also the one the untouched option restores. */
  axes: ReorderAxis[];
  options: ReorderOption[];
};

/** The reserved id of the untouched option. No declared option may slug to it. */
export const REORDER_NONE_SLUG = "none";

/** A CSS-id-safe slug, derived from the option's KEY and never from its label — the derivation
 *  `stack.ts`, `withdraw.ts` and `fold.ts` all argue for, for the same reason: the option already
 *  HAS an identity, and deriving a second one from the words is how `Central & Northern Europe`
 *  became `[data-group="...&amp;..."]`.
 *
 *  @parity */
export function reorderSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched option. One function, three readers. */
export function reorderOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * THE ARITHMETIC THIS FILE OWNS: the area a closed polygon encloses when its vertices sit on n
 * evenly spaced spokes radiating from one centre, at the radii given.
 *
 * The shoelace formula over those vertices collapses to `0.5 * sin(2*PI/n) * SUM(v[i] * v[i+1])`,
 * the sum taken over ADJACENT pairs and wrapping at the end. That collapse is the whole reason this
 * control exists: the expression contains no term in any single value alone, only in PRODUCTS OF
 * NEIGHBOURS — so moving a big reading next to another big one inflates the area without a single
 * number having changed. A reader judging "who covers more" is reading that sum, and nobody told
 * them it was a layout decision.
 *
 * Returned in the SQUARE OF THE UNIT the radii are in — which for a radar of shares is "percent
 * squared" and means nothing on its own. A beat states it against something (the disc the ceiling
 * ring encloses, the other series' own area); this function does not, because the thing to state it
 * against is the beat's editorial choice and not this file's.
 */
export function ringArea(values: number[]): number {
  const n = values.length;
  if (n < 3)
    throw new Error(
      `reorder: an area on ${n} spoke(s) is not an area — a radial polygon needs at least three, ` +
        "which is the same floor `chart-beat/references/types/radar.md` sets for drawing one at all",
    );
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const a = values[i];
    const b = values[(i + 1) % n];
    if (!Number.isFinite(a) || !Number.isFinite(b))
      throw new Error(
        "reorder: a spoke has no usable reading, so no area can be measured",
      );
    sum += a * b;
  }
  return 0.5 * Math.sin((2 * Math.PI) / n) * sum;
}

/**
 * THE IDENTITY OF A SHAPE, WHICH IS NOT THE IDENTITY OF AN ORDERING.
 *
 * A radial frame is a CYCLE, and two facts follow that no linear vocabulary in this family has to
 * care about: rotating an ordering by one spoke draws the same polygon turned on the spot, and
 * REVERSING an ordering draws its mirror image, whose area is identical to the last decimal. So an
 * option offering either of those is an option the reader chooses while the picture stands still —
 * the exact thing `directed-interaction.md` refuses — and neither is visible to a check that
 * compares the arrays element by element.
 *
 * The canonical form is the lexicographically smallest of all 2n rotations of the sequence and of
 * its reverse. Two orderings draw the same shape if and only if their canonical forms are equal.
 */
export function cyclicShapeOf(order: string[]): string {
  const n = order.length;
  const candidates: string[] = [];
  for (const sequence of [order, [...order].reverse()])
    for (let start = 0; start < n; start++)
      candidates.push(
        sequence.slice(start).concat(sequence.slice(0, start)).join(" "),
      );
  candidates.sort();
  return candidates[0];
}

/** Three decimals is far below anything a reader can see in an area quoted to two, and a raw float
 *  is fifteen characters of noise in a refusal message. */
const round = (n: number) => Number(n.toFixed(3));

/**
 * The relative gap below which two areas are the same picture. A polygon whose area differs by less
 * than half a percent from the plate's is a polygon a reader cannot tell apart from it — at the size
 * these shapes are drawn, half a percent of area is under a quarter of a percent of radius. An
 * option that only reaches that is an option that rearranged the names and delivered no finding.
 */
export const REORDER_AREA_FLOOR = 0.005;

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything
 * is drawn. `series` is what the beat actually DRAWS — every polygon, with its reading on every axis
 * — so an ordering that names an axis the plate has not got, or that produces the shape the reader
 * is already looking at, is caught here rather than by choosing it and looking.
 */
export function assertReorderDeclaration(
  declaration: ReorderDeclaration | null | undefined,
  series: ReorderSeries[],
): void {
  if (!declaration) return;
  const at = (what: string) => `reorder: ${what}`;
  if (!declaration.label?.trim())
    throw new Error(
      at(
        "the control has no legend, so nothing says what the reader is choosing",
      ),
    );
  if (!declaration.noneLabel?.trim())
    throw new Error(
      at(
        "the untouched option has no words, and it is the state the page ships in",
      ),
    );
  // THE SENTENCE THAT WARNS, REFUSED IF IT IS MISSING. Every other sentence here is written about a
  // state the reader has already produced; this is the only one written for the state they arrive
  // in, and without it the control's first act is eight words moving with no warning. The owner
  // asked why, on a page where the legend already named the control.
  if (!declaration.noneNote?.trim())
    throw new Error(
      at(
        "nothing on the page says what this control will DO before it is pressed — the legend names " +
          "what the reader is choosing, not what choosing does, and every other sentence here is a " +
          "counterfactual that only exists once an option has been taken",
      ),
    );
  if (!Array.isArray(declaration.axes) || declaration.axes.length < 3)
    throw new Error(
      at(
        `a radial frame is declared with ${declaration.axes?.length ?? 0} axis/axes — under three, ` +
          "nothing closes into a polygon and there is no shape for an ordering to change",
      ),
    );
  if (!declaration.options?.length)
    throw new Error(
      at("a declared control with no options is a legend and a default"),
    );
  if (!Array.isArray(series) || series.length === 0)
    throw new Error(
      at(
        "no series is declared, so no ordering can be measured against a real shape",
      ),
    );

  const plate = declaration.axes.map((axis) => axis.key);
  const known = new Set(plate);
  if (known.size !== plate.length)
    throw new Error(at("two of the declared axes share a key"));
  for (const axis of declaration.axes)
    if (!axis.name?.trim())
      throw new Error(
        at(`the axis ${JSON.stringify(axis.key)} has no word on its spoke`),
      );

  for (const one of series)
    for (const key of plate) {
      const value = one.values[key];
      if (!Number.isFinite(value))
        throw new Error(
          at(
            `the series ${JSON.stringify(one.key)} has no usable reading on ${JSON.stringify(key)}`,
          ),
        );
      if (value < 0)
        throw new Error(
          at(
            `the series ${JSON.stringify(one.key)} reads ${value} on ${JSON.stringify(key)} — a ` +
              "radius below the centre folds the polygon through itself and the area stops meaning " +
              "anything",
          ),
        );
    }

  const areasFor = (order: string[]) =>
    series.map((one) => ({
      key: one.key,
      area: ringArea(order.map((key) => one.values[key])),
    }));
  const plateAreas = areasFor(plate);

  const shapes = new Map<string, string>([
    [cyclicShapeOf(plate), declaration.noneLabel],
  ]);
  const seen = new Set<string>();
  for (const option of declaration.options) {
    const slug = reorderSlugOf(option.key);
    if (slug === REORDER_NONE_SLUG)
      throw new Error(
        at(
          `the option ${JSON.stringify(option.key)} slugs to the reserved id of the untouched option`,
        ),
      );
    if (seen.has(slug))
      throw new Error(
        at(
          `two options slug to ${JSON.stringify(slug)}, so one of them can never be chosen`,
        ),
      );
    seen.add(slug);

    if (!option.label?.trim())
      throw new Error(
        at(`the option ${JSON.stringify(option.key)} has no visible words`),
      );
    if (!option.announce?.includes(option.label))
      throw new Error(
        at(
          `the option ${JSON.stringify(option.key)} announces ${JSON.stringify(option.announce)}, ` +
            `which does not contain its own visible words ${JSON.stringify(option.label)} — WCAG ` +
            "2.5.3 label-in-name, and a reader who speaks the pill cannot operate the page",
        ),
      );
    if (!option.note?.trim())
      throw new Error(
        at(
          `the option ${JSON.stringify(option.key)} reveals no sentence, so a reader not looking at ` +
            "the plot gets nothing",
        ),
      );
    if (!option.readout?.trim())
      throw new Error(
        at(
          `the option ${JSON.stringify(option.key)} prints nothing on the plot — the reader's eye is ` +
            "on the polygons and this control's whole product is a number they cannot see there",
        ),
      );

    if (!Array.isArray(option.order) || option.order.length !== plate.length)
      throw new Error(
        at(
          `the option ${JSON.stringify(option.key)} orders ${option.order?.length ?? 0} axis/axes ` +
            `onto a frame of ${plate.length} spokes — an ordering names every axis, exactly once`,
        ),
      );
    const used = new Set<string>();
    for (const key of option.order) {
      if (!known.has(key))
        throw new Error(
          at(
            `the option ${JSON.stringify(option.key)} puts ${JSON.stringify(key)} on a spoke, which ` +
              "this plate does not draw",
          ),
        );
      if (used.has(key))
        throw new Error(
          at(
            `the option ${JSON.stringify(option.key)} puts ${JSON.stringify(key)} on two spokes — a ` +
              "reading drawn twice on one circle is a polygon of values nobody measured",
          ),
        );
      used.add(key);
    }

    // THE CYCLIC REFUSAL, and it is the one no other vocabulary in this family can make. A rotation
    // or a mirror of an ordering already on the page draws the SAME polygon; the reader presses the
    // pill and the picture stands still.
    const shape = cyclicShapeOf(option.order);
    const twin = shapes.get(shape);
    if (twin !== undefined)
      throw new Error(
        at(
          `the option ${JSON.stringify(option.label)} draws the same polygon as ` +
            `${JSON.stringify(twin)} — it is a rotation or a mirror of it, and on a circle those are ` +
            "one picture. The reader operates the control and nothing moves " +
            '(chart-web/references/directed-interaction.md, "The mechanical refusal")',
        ),
      );
    shapes.set(shape, option.label);

    // THE AREA REFUSAL. The shape may differ and the PRODUCT still not: this control exists to show
    // that the area moves, so an ordering that leaves every series' area where the plate had it has
    // rearranged the names and found nothing.
    const areas = areasFor(option.order);
    const moved = areas.some((one, i) => {
      const before = plateAreas[i].area;
      if (before === 0) return one.area !== 0;
      return Math.abs(one.area - before) / before >= REORDER_AREA_FLOOR;
    });
    if (!moved)
      throw new Error(
        at(
          `the option ${JSON.stringify(option.label)} moves no series' area by ` +
            `${REORDER_AREA_FLOOR * 100} % (` +
            `${areas.map((one, i) => `${one.key} ${round(plateAreas[i].area)} -> ${round(one.area)}`).join(", ")}` +
            ") — the spokes were shuffled and the thing this control exists to expose did not move",
        ),
      );
  }
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function reorderOptionsForMarkup(
  declaration: ReorderDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isNone: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: reorderOptionId(idPrefix, REORDER_NONE_SLUG),
      slug: REORDER_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: reorderOptionId(idPrefix, reorderSlugOf(option.key)),
      slug: reorderSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * EVERY ORDERING THE PAGE DRAWS, the plate's own first — one entry per complete drawing the
 * component is to emit, each at its own real coordinates.
 *
 * NOT ONE SET OF SPOKES WITH A TRANSFORM ON IT, and the reason is a defect this family has already
 * paid for twice. `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` read ONCE at
 * init, which no CSS transform ever changes (`stack.ts`, "the defect that driving found"), and a
 * mark hidden by `opacity` stays in that hit test and answers for a vertex the reader cannot see. So
 * a reorder draws every ordering ONCE, whole, at its own place, and the stylesheet reveals one with
 * `display` — which takes the unchosen ones out of the hit test, out of the tab order, and out of
 * `verify-web.mjs`'s probe by its own zero-box filter, all three for free.
 */
export function reorderPlatesForMarkup(
  declaration: ReorderDeclaration | null | undefined,
): { slug: string; isNone: boolean; axes: ReorderAxis[] }[] {
  if (!declaration) return [];
  const byKey = new Map(declaration.axes.map((axis) => [axis.key, axis]));
  return [
    { slug: REORDER_NONE_SLUG, isNone: true, axes: declaration.axes },
    ...declaration.options.map((option) => ({
      slug: reorderSlugOf(option.key),
      isNone: false,
      axes: option.order.map((key) => byKey.get(key)!),
    })),
  ];
}

/**
 * Every sentence this row holds, by the slug that shows it — THE UNTOUCHED OPTION'S FIRST.
 *
 * It used to get none, on the argument that it "is not a counterfactual, it is the claim the title
 * states". That argument is still true of a counterfactual and it was the wrong thing to conclude
 * from: the row was EMPTY in the state the page ships in, so the whole apparatus said nothing until
 * after the reader had pressed something. The owner read such a page and asked why the labels moved.
 * So the untouched option's sentence is not a counterfactual either — it is the WARNING, and it goes
 * where the counterfactuals go, in the same reserved row, which already costs the layout nothing.
 */
export function reorderNotesForMarkup(
  declaration: ReorderDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return [
    { slug: REORDER_NONE_SLUG, text: declaration.noneNote },
    ...declaration.options.map((option) => ({
      slug: reorderSlugOf(option.key),
      text: option.note,
    })),
  ];
}

/**
 * Every readout printed ON the plot, THE PLATE'S OWN INCLUDED — which is the difference from
 * `reorderNotesForMarkup` and it is deliberate.
 *
 * A note is a counterfactual and the plate has none. A readout is the answer to "which of these two
 * shapes is bigger", and that question is live in the state the page ships in: a reader who touches
 * nothing must be told what the plate's own ordering produces, or the numbers the options reveal
 * have nothing to be read against. So the beat passes its own plate readout in, and it is the one
 * shown by default.
 */
export function reorderReadoutsForMarkup(
  declaration: ReorderDeclaration | null | undefined,
  plateReadout: string,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  if (!plateReadout?.trim())
    throw new Error(
      "reorder: the plate prints no readout, so the state the page ships in cannot be read against " +
        "the states its options produce",
    );
  return [
    { slug: REORDER_NONE_SLUG, text: plateReadout },
    ...declaration.options.map((option) => ({
      slug: reorderSlugOf(option.key),
      text: option.readout,
    })),
  ];
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss`, `stackCss`, `levelCss`, `withdrawCss`
 * and `foldCss` do.
 *
 * THE VOCABULARY IT WRITES AGAINST, which is what the component must tag its markup with:
 *
 *   data-reorder-plate="<slug>"    one complete drawing of that ordering — the whole `<svg>`.
 *   data-reorder-readout="<slug>"  the areas this ordering produces, printed on the plot.
 *   data-reorder-note="<slug>"     the sentence under the control.
 *
 * THE EMISSION ORDER IS THE MECHANISM, not tidiness. `${scope} [data-reorder-plate]` and
 * `${scope} [data-reorder-plate="none"]` weigh the same (0,2,0), so the one that wins is the one
 * written last — a sankey on this branch rendered green with zero ribbons lit for exactly this
 * reason. The general rule is emitted first, the default's exception second, and the
 * `:has(#...:checked)` rules (1,2,0) last, where they beat both regardless.
 *
 * `display: block` AND NOT `display: revert` ON A PLATE. The format's own stylesheet sets
 * `svg.chart { display: block }`; `revert` rolls back past the author origin to the user agent's
 * `inline`, which would drop the revealed drawing out of its grid cell. The notes and readouts are
 * plain HTML with no author-set display, so `revert` is right for them and is what `fold.ts` uses.
 *
 * NOTHING HERE NAMES A COLOUR AND NOTHING HERE MOVES ANYTHING — the whole point of drawing every
 * ordering at its own coordinates.
 */
export function reorderCss(
  declaration: ReorderDeclaration | null | undefined,
  { scope, idPrefix }: { scope: string; idPrefix: string },
): string {
  if (!declaration) return "";
  const lines: string[] = [
    `/* The reorder this beat declared: ${declaration.options.length} ordering(s) over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, stack.ts moves with, level.ts measures with, withdraw.ts subtracts with and`,
    `   fold.ts lays over, and the reason this control needs no script and survives one being`,
    `   blocked. Every ordering is drawn once, whole, at its own coordinates; this reveals one. */`,
    `${scope} [data-reorder-plate] { display: none; }`,
    `${scope} [data-reorder-plate="${REORDER_NONE_SLUG}"] { display: block; }`,
    `${scope} [data-reorder-readout] { display: none; }`,
    `${scope} [data-reorder-readout="${REORDER_NONE_SLUG}"] { display: revert; }`,
        // `visibility` AND NOT `display` FOR THE SENTENCES -- the one place this file departs from
    // `fold.ts`, and the reason is in `reorderChromeCss`: the notes are stacked in one grid cell so
    // the row is always as tall as the longest of them, and a `display: none` sibling contributes no
    // height to a grid cell. Hidden by visibility it still sizes the row, still leaves the
    // accessibility tree, and still cannot be read.
    `${scope} [data-reorder-note] { visibility: hidden; }`,
    // The warning is what the untouched page says, so it is the one the row shows at rest; each
    // option takes its place below.
    `${scope} [data-reorder-note="${REORDER_NONE_SLUG}"] { visibility: visible; }`,
  ];
  for (const option of declaration.options) {
    const slug = reorderSlugOf(option.key);
    const at = `${scope}:has(#${reorderOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${at} [data-reorder-plate="${REORDER_NONE_SLUG}"] { display: none; }`,
      `${at} [data-reorder-plate="${slug}"] { display: block; }`,
      `${at} [data-reorder-readout="${REORDER_NONE_SLUG}"] { display: none; }`,
      `${at} [data-reorder-readout="${slug}"] { display: revert; }`,
      `${at} [data-reorder-note="${REORDER_NONE_SLUG}"] { visibility: hidden; }`,
      `${at} [data-reorder-note="${slug}"] { visibility: visible; }`,
    );
  }
  return lines.join("\n");
}

/**
 * ── THE TRAVEL ───────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THE OWNER ASKED FOR, AND WHY IT WAS NOT WHAT THIS FILE FIRST SHIPPED. He looked at a page
 * built on the rules above and said the graph could *« changer en lerp smooth au lieu de saccader en
 * changement direct »* — the vertices travelling round the circle to their new spokes rather than one
 * picture being swapped for another. The first mechanism could not do it and the reason was
 * structural, not cosmetic: `display` cannot be transitioned, and every ordering was a whole `<svg>`
 * revealed with `display`.
 *
 * THE THREE TRIGGERS CSS HAS, AND WHAT EACH MEASURED (Chrome 151, driven, not assumed):
 *
 *   1. AN ANIMATION ON A PLATE THAT IS BEING REVEALED. `display: none` does NOT restart a CSS
 *      animation on the DESCENDANTS of the hidden element — measured: a plate's vertices ran their
 *      whole 3s animation while the plate was hidden, from page load, and by the time a reader
 *      pressed the pill there was nothing left to play. Unusable.
 *   2. `@starting-style` PLUS `transition-behavior: allow-discrete`. Measured: the starting style
 *      fired ONCE, at load, for the hidden plate too — the descendants of a `display: none` element
 *      still have a computed style, so they are never "newly rendered" and the reveal re-triggers
 *      nothing. Unusable.
 *   3. A PROPERTY CHANGING ON AN ELEMENT THAT IS ALWAYS RENDERED. This is the only one that works,
 *      and it decides the architecture: the drawing cannot be one `<svg>` per ordering any more. It
 *      has to be ONE drawing whose geometry moves.
 *
 * WHICH RUNS STRAIGHT INTO THE DEFECT THE FIRST MECHANISM EXISTED TO AVOID, and it has not gone
 * away: `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` read ONCE at init, so a
 * mark that moves under a `transform` answers from where it used to be. A drawing that moves cannot
 * be the thing that answers.
 *
 * SO THE TWO JOBS ARE SPLIT, and that is the whole of this section:
 *
 *   - ONE `[data-reorder-motion]` drawing — rings, spokes, both areas, every dot, every spoke's
 *     name. Always rendered, `pointer-events: none`, `aria-hidden`. Nothing in it answers anything.
 *     Its dots and names TRAVEL on `transform`, its areas MORPH on `d`, both driven by the same
 *     `:has(:checked)` rule that used to swap plates.
 *   - N `[data-reorder-plate]` HIT PLATES, one per ordering, transparent, carrying only the points
 *     that answer and the overlay that resolves them. Still swapped with `display`, still one wired
 *     `svg.chart` each, still zero-box and out of the tab order when unchosen. THE MARKS THAT ANSWER
 *     NEVER MOVE: each plate's points are baked at that ordering's own coordinates and jump to them.
 *
 * The one honest cost, stated rather than hidden: for the travel's own duration the hit layer is
 * already at the destination while the drawing is still in the air. A reader who points DURING the
 * flight is answered about the vertex that is arriving. Nothing is ever answered from a position no
 * vertex will occupy, which is the failure the split exists to prevent.
 *
 * WHY `d` AND `transform` AND NOT ONE OF THEM. A polygon's corner cannot be carried by a translate —
 * its two edges end on vertices travelling to different places. A `<path>`'s `d` interpolates
 * point by point (measured: `M 50 10` toward `M 10 10` reported `M 44.6668 10` a seventh of the way
 * in), which is exactly the lerp that was asked for. The dots and the names cannot use `d` at all. So
 * both are used, with THE SAME DURATION AND THE SAME EASING — that is load-bearing, not tidiness: a
 * dot and the corner it sits on are interpolated by two different engines and stay coincident only
 * because both are linear in the same clock (measured at 400ms of 3000: the dot 13,3 % of the way,
 * the corner 13,3 % of the way).
 *
 * AND THE PAGE IS CORRECT WITH NO MOTION AT ALL, three ways. Under `prefers-reduced-motion: reduce`
 * every transition is gone — the declarations that set the geometry are outside the query and the
 * transitions are inside it, so the picture SNAPS (measured: `document.getAnimations()` empty, the
 * new geometry already in place at the first sample). With JavaScript off nothing here changes, as
 * with everything else in this file. And on an engine with no CSS `d` property the areas are drawn
 * as one baked `<path>` per ordering, swapped with `display` — the first mechanism, one level down,
 * behind `@supports not`, so an engine this file has never been driven in gets a correct picture
 * that does not travel rather than a travelling picture that is wrong.
 */

/**
 * How long a vertex takes to cross to its new spoke. A JUDGEMENT, and a knob, in the shape
 * `ENTRANCE_CEILING_MS` is one: the travel has to be slow enough that a reader can follow ONE
 * vertex across the circle — which is the whole thing the owner asked to be able to see — and short
 * enough that pressing the second pill is not waiting for the first. It is not measured off
 * anything, and saying so is better than dressing it as arithmetic.
 */
export const REORDER_TRAVEL_MS = 420;

/** The same curve for the areas as for the dots, for the reason in the section header: two engines
 *  interpolating the same flight stay together only if they are given the same clock. */
export const REORDER_TRAVEL_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/** The feature the travelling AREA rests on, written once and asked twice — for the fallback and for
 *  the motion itself, so the two can never drift apart. */
const REORDER_D_SUPPORT = '(d: path("M 0 0 Z"))';

/**
 * WHERE EVERY MOVING THING SITS IN EVERY STATE — computed by the beat, because it is the beat that
 * owns the scale, exactly as `reorderCss` owns no coordinate.
 *
 * THE AREAS ARE NOT DECLARED HERE, AND THAT IS THE ONE THING THIS TYPE GOT WRONG FIRST. They were,
 * and the first driven frame showed why it cannot be: a `<path>`'s `d` interpolates its point i to
 * the other path's point i, so a corner travels along whatever line joins the two points that happen
 * to share an index — and a beat that named its dots by SOURCE while its paths were indexed by SPOKE
 * sent the two on different journeys. Measured mid-flight: the dots stood up to 5,5 user units clear
 * of the outline they belong to, in a picture whose whole subject is where a vertex sits.
 *
 * So the polygon is no longer a thing a beat states. It is BUILT, here, out of the same two numbers
 * the dot is built from — `home[id]` plus `moves[state][id]` — walked in the order `corners` gives.
 * The dot and its corner are then the same arithmetic twice, and there is no declaration in which
 * they can disagree. A refusal would have caught this case; construction cannot express it.
 */
export type ReorderMotion = {
  /** Every moving element's baked coordinate — where the ONE drawing really puts it, before any
   *  state moves it. In the drawing's own user units. */
  home: Record<string, [number, number]>;
  /** state slug -> element id -> [dx, dy] from `home`, in the drawing's own user units. */
  moves: Record<string, Record<string, [number, number]>>;
  /** area id -> the element ids whose points ARE that area's corners, in the order the outline walks
   *  them. The same in every state: an ordering changes what sits on a spoke, never which spokes are
   *  neighbours. */
  corners: Record<string, string[]>;
  /** state slug -> element id -> the `text-anchor` that element takes in that state. A name that
   *  crosses to the other side of the circle has to hang off its spoke the other way. */
  anchors?: Record<string, Record<string, string>>;
};

/** Two decimals of a user unit. At this beat's scale that is a fortieth of a pixel on a laptop, and
 *  it keeps a generated stylesheet that names two dozen elements in four states from carrying
 *  seventeen digits of floating-point noise per coordinate. */
const px = (n: number) => `${Number(n.toFixed(2))}px`;
const unit = (n: number) => Number(n.toFixed(2));

/**
 * EVERY AREA'S CLOSED PATH IN EVERY STATE, built from the vertices rather than beside them — see the
 * type's own header for the frame that made this necessary. Exported because the component needs the
 * untouched state's path for the `d` ATTRIBUTE it bakes into the markup, and every state's for the
 * baked fallback an engine with no CSS `d` property falls back to.
 */
export function reorderAreaPaths(
  motion: ReorderMotion,
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const [state, moves] of Object.entries(motion.moves)) {
    out[state] = {};
    for (const [id, ids] of Object.entries(motion.corners))
      out[state][id] =
        ids
          .map((corner, i) => {
            const [hx, hy] = motion.home[corner];
            const [dx, dy] = moves[corner];
            return `${i === 0 ? "M" : "L"} ${unit(hx + dx)} ${unit(hy + dy)}`;
          })
          .join(" ") + " Z";
  }
  return out;
}

/**
 * Refuses a motion declaration that would draw a state WRONG, which is a worse failure than a state
 * that does not move: a missing entry is silently the DEFAULT geometry, so the reader presses a pill,
 * the sentence and the readout change, and the picture keeps saying what the plate said.
 */
export function assertReorderMotion(
  declaration: ReorderDeclaration | null | undefined,
  motion: ReorderMotion,
): void {
  if (!declaration) return;
  const at = (what: string) => `reorder: ${what}`;
  const states = [
    REORDER_NONE_SLUG,
    ...declaration.options.map((option) => reorderSlugOf(option.key)),
  ];
  for (const state of states)
    if (!motion.moves?.[state])
      throw new Error(
        at(
          `the ordering ${JSON.stringify(state)} says where nothing travels, so its drawing would ` +
            "stay at the plate's own coordinates while its words said otherwise",
        ),
      );
  const ids = Object.keys(motion.moves[REORDER_NONE_SLUG]).sort().join(" ");
  for (const state of states)
    if (Object.keys(motion.moves[state]).sort().join(" ") !== ids)
      throw new Error(
        at(
          `the ordering ${JSON.stringify(state)} moves a different set of things than the plate ` +
            "does — one of them would be left behind on its old spoke",
        ),
      );
  for (const [id, [dx, dy]] of Object.entries(motion.moves[REORDER_NONE_SLUG]))
    if (dx !== 0 || dy !== 0)
      throw new Error(
        at(
          `the untouched ordering offsets ${JSON.stringify(id)} by (${dx}, ${dy}) — the one drawing ` +
            "is baked at the plate's own coordinates, so the state the page ships in is the only " +
            "one that may not move",
        ),
      );
  for (const [area, corners] of Object.entries(motion.corners ?? {})) {
    if (corners.length < 3)
      throw new Error(
        at(`the area ${JSON.stringify(area)} is walked through ${corners.length} corner(s), which closes nothing`),
      );
    for (const corner of corners)
      if (!motion.home?.[corner] || !motion.moves[REORDER_NONE_SLUG][corner])
        throw new Error(
          at(
            `the area ${JSON.stringify(area)} is walked through ${JSON.stringify(corner)}, which is ` +
              "not one of the things that travel — a corner the vertices do not carry is a corner " +
              "that can leave the vertices behind, and it is the defect this shape exists to prevent",
          ),
        );
  }
  for (const option of declaration.options) {
    const slug = reorderSlugOf(option.key);
    const moved = Object.values(motion.moves[slug]).some(([dx, dy]) => dx !== 0 || dy !== 0);
    if (!moved)
      throw new Error(
        at(
          `${JSON.stringify(option.label)} moves nothing at all — the reader would press it and ` +
            "watch the picture stand still",
        ),
      );
    const cornerMoved = Object.values(motion.corners ?? {}).some((corners) =>
      corners.some((corner) => {
        const [dx, dy] = motion.moves[slug][corner];
        return dx !== 0 || dy !== 0;
      }),
    );
    if (!cornerMoved)
      throw new Error(
        at(
          `${JSON.stringify(option.label)} moves the spoke NAMES and not one corner, so the two ` +
            "shapes the reader is being asked to compare are the shapes they are already looking at",
        ),
      );
  }
}

/**
 * THE TRAVEL'S STYLESHEET. Same mechanism as `reorderCss` — `:has()` on the scope, `:checked` on a
 * real radio, generated once at build time — and the same emission discipline: the general rule
 * first, the per-state rules after it, and every transition LAST, inside
 * `@media (prefers-reduced-motion: no-preference)`, where `reduce` cannot reach it.
 *
 * NOTHING HERE NAMES A COLOUR AND NOTHING HERE COMPUTES A COORDINATE.
 */
export function reorderMotionCss(
  declaration: ReorderDeclaration | null | undefined,
  { scope, idPrefix }: { scope: string; idPrefix: string },
  motion: ReorderMotion,
): string {
  if (!declaration) return "";
  const areas = reorderAreaPaths(motion);
  const lines: string[] = [
    `/* The travel: the one drawing's dots and spoke names move on transform, its areas on d, both`,
    `   on the same ${REORDER_TRAVEL_MS}ms clock so a dot and the corner under it stay together. The`,
    `   drawing answers nothing — the hit plates above it do, and they never move. */`,
    `${scope} [data-reorder-motion] { pointer-events: none; }`,
    `${scope} [data-reorder-move] { transform: translate(0px, 0px); }`,
    // Both halves of the area are hidden here and exactly one is turned back on, by the `@supports`
    // pair below — hidden outside either branch so an engine with no `@supports` at all draws
    // neither instead of both.
    `${scope} [data-reorder-area] { display: none; }`,
    `${scope} [data-reorder-still] { display: none; }`,
  ];

  const whenChecked = (slug: string) =>
    `${scope}:has(#${reorderOptionId(idPrefix, slug)}:checked)`;

  for (const option of declaration.options) {
    const slug = reorderSlugOf(option.key);
    const at = whenChecked(slug);
    for (const [id, [dx, dy]] of Object.entries(motion.moves[slug] ?? {}))
      if (dx !== 0 || dy !== 0)
        lines.push(
          `${at} [data-reorder-move="${id}"] { transform: translate(${px(dx)}, ${px(dy)}); }`,
        );
    for (const [id, anchor] of Object.entries(motion.anchors?.[slug] ?? {}))
      if (anchor !== motion.anchors?.[REORDER_NONE_SLUG]?.[id])
        lines.push(`${at} [data-reorder-move="${id}"] { text-anchor: ${anchor}; }`);
  }

  // THE AREA THAT TRAVELS, and it is the half that is not Baseline everywhere.
  lines.push(`@supports ${REORDER_D_SUPPORT} {`);
  lines.push(`  ${scope} [data-reorder-area] { display: block; }`);
  for (const [id, d] of Object.entries(areas[REORDER_NONE_SLUG]))
    lines.push(`  ${scope} [data-reorder-area="${id}"] { d: path("${d}"); }`);
  for (const option of declaration.options) {
    const slug = reorderSlugOf(option.key);
    const at = whenChecked(slug);
    for (const [id, d] of Object.entries(areas[slug] ?? {}))
      lines.push(`  ${at} [data-reorder-area="${id}"] { d: path("${d}"); }`);
  }
  lines.push(`}`);

  // THE AREA THAT DOES NOT — one baked path per ordering, swapped with display. This is the first
  // mechanism this file shipped, kept for the engines the travel cannot reach, and it is why a page
  // with no CSS `d` is still CORRECT rather than merely still.
  lines.push(`@supports not ${REORDER_D_SUPPORT} {`);
  lines.push(`  ${scope} [data-reorder-still="${REORDER_NONE_SLUG}"] { display: block; }`);
  for (const option of declaration.options) {
    const slug = reorderSlugOf(option.key);
    const at = whenChecked(slug);
    lines.push(
      `  ${at} [data-reorder-still="${REORDER_NONE_SLUG}"] { display: none; }`,
      `  ${at} [data-reorder-still="${slug}"] { display: block; }`,
    );
  }
  lines.push(`}`);

  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-reorder-move] { transition: transform ${REORDER_TRAVEL_MS}ms ${REORDER_TRAVEL_EASING}; }`,
    `  ${scope} [data-reorder-area] { transition: d ${REORDER_TRAVEL_MS}ms ${REORDER_TRAVEL_EASING}; }`,
    `}`,
  );
  return lines.join("\n");
}

/**
 * THE VERTEX STILL LIGHTS UNDER THE POINTER, ACROSS THE SPLIT THE TRAVEL FORCED.
 *
 * `interaction.mjs` carries `.mark-active` from a point to `[data-mark="<key>"]` found with
 * `svg.querySelectorAll` — INSIDE THE SAME `<svg>`. The travel put the visible dot in the drawing
 * and the point that answers in a hit plate, which are two `<svg>`s, so that lookup finds nothing
 * and the format's own `--mark-active` mechanism goes quiet. This puts it back in CSS, which can
 * cross the boundary because both live under one `.chart-plot`: `:has()` on the plot, keyed on the
 * point, painting the dot in the colour THE BEAT declared and measured on the dot itself.
 *
 * AND IT IS BETTER THAN WHAT IT REPLACES ON ONE AXIS: `:focus` is in the selector, so a reader
 * tabbing through the vertices with the script absent now gets the lift the script used to be the
 * only source of.
 *
 * A LINGERING CLASS CANNOT LIGHT A HIDDEN PLATE'S TWIN, and it is worth saying why the rule does not
 * have to name the chosen state to be safe: every path that changes the state clears the class
 * first. Pressing a pill is a `pointerdown` outside the svg, which `initChart`'s document listener
 * clears on; reaching one by keyboard blurs the point, which clears on `blur`.
 */
export function reorderMarkLiftCss({
  scope,
  marks,
}: {
  scope: string;
  marks: string[];
}): string {
  if (marks.length === 0) return "";
  return [
    `/* The dot the pointed point speaks for, lit across the drawing/hit-plate split. */`,
    ...marks.map(
      (key) =>
        `${scope} .chart-plot:has(.pt[data-mark-ref="${key}"].pt-active) [data-mark="${key}"],` +
        `\n${scope} .chart-plot:has(.pt[data-mark-ref="${key}"]:focus) [data-mark="${key}"] ` +
        `{ fill: var(--mark-active); }`,
    ),
  ].join("\n");
}

/**
 * THE RENDER-TIME REFUSAL, AND WHY IT LIVES HERE RATHER THAN IN `interaction-plan.ts`.
 *
 * `assertControlsChangeSomething` discovers a page's controls by walking the markup for the shapes
 * it knows — `data-detail` answers, a `<details>` table, `chart-filter-*` / `chart-stack-*` /
 * `chart-level-*` radios. It does not know this vocabulary's radios exist, so a reorder is invisible
 * to it and would ship unmeasured. Squatting on another vocabulary's id prefix to be discovered
 * would make the census report a stack that is not one, which is the "one word, two behaviours"
 * defect this family's headers refuse at the top. So the refusal ships with the vocabulary, written
 * against the same definition the format already holds — *a control whose state, once applied,
 * equals the default state is one the reader operates while nothing changes*.
 *
 * It is applied to the SENTENCE, because the geometry half is already refused earlier and better:
 * `assertReorderDeclaration` has compared every ordering's polygon against the plate's, as a cyclic
 * shape and as a measured area. What no declaration check can see is whether the words the control
 * reveals were already printed on the page at rest.
 *
 * `defaultPrintedText` is imported rather than re-derived — the last time this repository derived
 * one string two ways, a whole map emptied with nothing red. What IS done here is strip this
 * vocabulary's own revealed elements before handing the page over, for exactly the reason that
 * function strips a filter's note and a stack's: an element revealed by `:checked` counted as
 * printed makes the control that reveals it look dead.
 */
export function assertReorderChangesThePicture(
  html: string,
  declaration: ReorderDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const revealed =
    /<[^>]*data-reorder-(?:note|readout)="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g;
  const printed = defaultPrintedText(String(html).replace(revealed, " "));
  const inert: string[] = [];
  for (const option of declaration.options) {
    const adds = answerPieces(`${option.note} · ${option.readout}`).some(
      (piece) => !printed.includes(piece),
    );
    if (!adds) inert.push(option.label);
  }
  if (inert.length)
    throw new Error(
      `${where}: ${inert.length} of ${declaration.options.length} reorder option(s) reveal a ` +
        `sentence the page already prints (${inert.join(", ")}). A reader who works through every ` +
        `ordering is told nothing they could not read at rest — give each one the reading its own ` +
        `arrangement produces, or stop offering it ` +
        `(chart-web/references/directed-interaction.md, "The mechanical refusal")`,
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a reorder.
 *
 * A DELIBERATE COPY of `foldChromeCss`, not an import, and the cost is stated rather than hidden —
 * the same trade that file records against `withdrawChromeCss` and `render-web.mjs`'s
 * `.chart-filter` block. Reaching one of those would mean either shipping a control this beat does
 * not want or teaching another file's stylesheet a class it cannot see the declaration for.
 *
 * ONE ROUNDED OUTLINE AROUND THE WHOLE ROW, AND EVERY OPTION BARE INSIDE IT. That is this family's
 * settled treatment and it is not a preference: a per-option edge on every pill was shipped once on
 * this branch and the owner's verdict on the result was that the grey box around each one is ugly.
 * The group is framed; a chosen option is said with ink on ground, never with an edge of its own.
 *
 * The native radios underneath are what the reader actually operates. The pills are layered ON TOP
 * (`opacity: 0`, never `display: none`) and the whole treatment is behind `@supports
 * selector(:has(*))`, so an engine that cannot draw a checked pill gets the plain radios rather than
 * four identical ones.
 */
export function reorderChromeCss({ scope }: { scope: string }): string {
  return `
${scope} .chart-reorder {
  flex: 0 0 auto;
  margin: 10px 0 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  align-items: center;
  font-size: var(--filter-size);
}
/* float:left is the HTML spec's own opt-out from becoming the "rendered legend" the browser lifts
   into the fieldset's border — inside a flex container the float itself does nothing. Without it the
   legend takes a row of its own, which this format's window-fit rule pays for in plot height. */
${scope} .chart-reorder legend { float: left; font-weight: 600; padding: 0; color: var(--ink); }
${scope} .chart-reorder .options { display: inline-flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
${scope} .chart-reorder label { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
${scope} .chart-reorder input { cursor: pointer; margin: 0; }

/* THE SENTENCE THE CONTROL OWES THE READER. Its row is reserved whether or not an option is chosen,
   so choosing one never moves the plot underneath it. role="status" is on the container rather than
   on each note: the notes come and go, and a live region that itself comes and goes announces
   nothing. */
${scope} .reorder-notes {
  flex: 0 0 auto;
  margin: 4px 0 0;
  min-height: 1.5em;
  font-size: var(--source-size);
  color: var(--muted);
  /* EVERY SENTENCE IN ONE GRID CELL, AND IT IS NOT A TIDINESS DECISION. The fold vocabulary's own
     chrome says the note's row is reserved "so choosing one never moves the plot underneath it",
     and that is true there because its sentences are one line. These are three lines of arithmetic
     and they wrap to different heights, so revealing one with display grew the row and pushed the
     drawing down -- measured at 1280 px, choosing an option moved the radar 15 px. On a control
     whose whole product is comparing one arrangement with another, a picture that jumps when you
     press the pill is the defect, not the cosmetic. Stacked in one cell the container is always as
     tall as the LONGEST sentence, whichever is showing, and the plot never moves. */
  display: grid;
}
${scope} .reorder-notes p { grid-area: 1 / 1; margin: 0; }

@supports selector(:has(*)) {
  ${scope} .chart-reorder .options {
    gap: 0;
    padding: 2px;
    border: 1px solid var(--grid);
    border-radius: 999px;
  }
  ${scope} .chart-reorder label {
    gap: 0;
    padding: 5px 10px;
    border-radius: 999px;
    line-height: 1.2;
    white-space: nowrap;
    transition: background-color 120ms ease, color 120ms ease;
  }
  ${scope} .chart-reorder label input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    appearance: none;
    -webkit-appearance: none;
    border-radius: 999px;
  }
  ${scope} .chart-reorder label:hover { color: var(--ink); }
  /* ink-on-ground, never the accent: the accent is what the argument is drawn in on this page, and a
     control that borrowed it would make the one colour that means something also mean "you clicked
     here". */
  ${scope} .chart-reorder label:has(input:checked) { background: var(--ink); color: var(--ground); }
  ${scope} .chart-reorder label:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
}
`.trim();
}
