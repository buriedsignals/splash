// twin/skills/chart-web/assets/count.ts
//
// WHICH TERMS COUNT IN A SHAPE, AND THE SHAPE THAT CLOSES WITHOUT THEM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what the picture may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum.
// `fold.ts` says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is
// chosen. `trace.ts` says what may be FOLLOWED through an image. `reorder.ts` says what the same
// numbers look like in a different place in a cyclic sequence. This file says **which of a closed
// shape's terms are COUNTED IN IT, and what the outline becomes when it closes over the rest** —
// every term still drawn, still named, still at its own reading, and the outline no longer passing
// through the ones the reader has set aside. Like all of them it is native radio inputs plus CSS
// generated at build time (`:checked` and `:has()` on the enclosing figure, no listener, no state,
// not one byte of JavaScript), because that is the only kind of control this format can promise
// still works with the script absent.
//
// WHY THIS ONE EXISTS, AND IT IS A VERDICT RATHER THAN A GAP IN THE CATALOGUE.
//
// `reorder.ts` was written for the same chart and the same finding, and it demonstrated the finding
// by handing the axes round the circle. The owner read the finished page twice. The first time he
// asked why the labels changed order; a sentence was added under the pills saying, before any press,
// exactly what pressing would do. The second time, with that sentence on the page, he wrote:
// *« Les labels "nucléaire", "éolien", etc bougent avec les filtres alors qu'il n'y a pas lieu
// d'être. »*
//
// He had a legend reading « Ordre des axes » and pills reading « sur la France », « sur l'Allemagne »,
// « au plus flatteur pour la France » in front of him, and he still read them as FILTERS — because
// that is what a row of pills over a chart is, everywhere else on the web and in six of this family's
// own eight vocabularies. Under a filter an axis label that moves is not a finding, it is a bug. So
// the defect was never the labelling. It was the gesture.
//
// **THE STANDING CONSEQUENCE, AND IT IS THE FIRST RULE OF THIS FILE: NO AXIS LABEL EVER MOVES.** The
// frame is fixed — every spoke keeps its angle and its name in every state this vocabulary can
// produce — and what the reader changes is which spokes the outline is drawn through.
//
// AND THE FINDING SURVIVES THE CHANGE INTACT, which is why this is a replacement and not a retreat.
// `chart-beat/references/types/radar.md` says a polygon's AREA — "the thing a reader's eye actually
// judges at a glance" — "is sensitive to axis order AND COUNT in a way the underlying numbers
// aren't", and that the type ships with no mechanical guard behind it. `reorder.ts` took the ORDER
// half. This file takes the COUNT half, and the count half is the one a newsroom actually decides:
// nobody shuffles axes at random, and everybody chooses which sources go into the comparison.
//
// WHY IT IS ITS OWN FILE AND NOT AN OPTION IN ONE OF THE EIGHT.
//
// `filter.ts` is the near miss and the distinction is exact, because it is the distinction the whole
// gesture rests on. A filter's promise is *"the marks outside a named set LEAVE, and the frame they
// were measured against does not move."* Here nothing leaves: a spoke set aside keeps its angle, its
// name, and both of its vertices, drawn at the readings they have always had. What changes is not the
// population of the picture but the population of ONE ARITHMETIC — the closed outline — and a
// vocabulary whose every rule is "this key is gone" cannot say "this key is still on the page, still
// true, and out of the sum". `filter.ts` is also, and deliberately, a set of keys and nothing
// geometric; the whole product of this file is geometric.
//
// `withdraw.ts` is the other near miss and its arithmetic belongs to a waterfall — `resteps`, `cuts`,
// `close`: a running total, a bar that shortens, the rest of the sequence that re-lands. A closed
// outline has no running total and no rest of the sequence. Removing a term from it does not shorten
// anything; it replaces two edges with one, and the area can go UP — a term whose reading is near the
// centre was pulling the outline in, and closing over it lets the outline out. That is not a
// subtraction and no subtraction vocabulary can express it.
//
// THE ARITHMETIC THIS FILE OWNS, AND THE REFUSALS ARE MADE OF IT.
//
// `countedOutline` walks the fixed frame once and returns ONE POINT PER SPOKE, always: a counted
// spoke contributes its own vertex, and a spoke that is not counted contributes the point where the
// closing chord crosses it — evenly spaced along the chord when several sit between the same two
// counted neighbours. The outline through those points is, to the last decimal, the outline through
// the counted vertices alone, because a point ON a segment changes neither the shape a polygon
// encloses nor its area. Two things follow, and both are the reason it is built this way:
//
//   - the closing is a TRAVEL rather than a swap. Every state's path has the same number of segments
//     in the same order, so a CSS `d` interpolates it point by point and the outline is seen to peel
//     off the vertices it stops counting;
//   - the vertex and the corner are the same arithmetic done once. The dot is drawn at
//     `vertices[key]`; the corner is `vertices[key]` or a point on the chord between two of them. A
//     beat cannot state a corner that disagrees with its own dot, which is the defect this family
//     measured at 5,47 user units on the page this file replaces.
//
// `enclosedArea` is the shoelace over those points, in the drawing's own units. It is measured on the
// coordinates the page will really draw and not on a formula run beside them, so the number a refusal
// quotes is the number a reader could measure off the picture with a ruler.
//
// WHERE IT COMES FROM. `proof/web-radar-electricity-mix`. France and Germany generate within 12 % of
// each other from opposite mixes, and both countries' eight shares sum to 100, so if a polygon's area
// meant anything the two shapes would be comparable. On the plate's own eight axes France's polygon
// covers 1,80 % of the ceiling disc and Germany's 2,61 % — 1,45 times as much. Count only the
// low-carbon sources and France covers 1,52 % against 1,26 %: **0,83 times, the answer turned over**,
// with not one of the sixteen numbers touched and not one label moved.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     count: {
//       label: "Sources comptées",             // the <legend> — the beat's own words
//       noneLabel: "les huit",                 // the untouched option. Always first, always the
//                                              // default, and it IS the picture the page ships in.
//       noneNote: "Les boutons ...",           // what pressing one will DO, said before it is
//                                              // pressed. Required, and see below for why.
//       axes: [{ key: "Nuclear", name: "nucléaire" }, ...],  // the frame, in the plate's own order
//       options: [
//         {
//           key: "bas-carbone",
//           label: "les sources bas-carbone",
//           announce: "Ne compter que les sources bas-carbone ...",  // must contain `label`
//           note: "...",     // revealed under the control, where the derived reading lives
//           readout: "...",  // revealed ON the plot, where the reader's eye already is
//           counts: ["Nuclear", "Wind", ...],  // the axes this option COUNTS, never the ones it drops
//         },
//       ],
//     }
//
// AN OPTION NAMES WHAT IT COUNTS AND NOT WHAT IT DROPS, and that is not a preference. The refusals
// are all about the counted set — that it is not the plate's, that it is not another option's, that
// it leaves a shape at all — and a declaration that stated the complement would have to be inverted
// before any of them could be made, in a file that would then own two spellings of one set. It is
// also the reading the control actually offers: a reader chooses what goes IN.
//
// NO COORDINATE IS COMPUTED HERE. The beat hands in the vertex it drew for every axis of every shape;
// where a share lands on a spoke is arithmetic only the thing that owns the scale can do. This file
// walks those points, closes them, and measures what it closed.

import { answerPieces, defaultPrintedText } from "./interaction-plan.ts";
import { controlChromeCss } from "./control-chrome.ts";

/** One spoke of the fixed frame: the key the beat's own data is keyed by, and the word on the spoke
 *  — which this vocabulary never moves and never hides. */
export type CountAxis = { key: string; name: string };

/** One shape the plate draws, with the POINT it drew for every axis, in the drawing's own user units.
 *  Handed in rather than derived, because the scale is the beat's; measured here rather than trusted,
 *  because the area is this file's. */
export type CountShape = { key: string; vertices: Record<string, [number, number]> };

/** Everything the refusals and the outlines are measured against. */
export type CountGeometry = { shapes: CountShape[] };

/** One option: the counted set, and the words for it. */
export type CountOption = {
  /** The option's own identity, and the only thing its slug is derived from. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It must
   *  CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG 2.5.3
   *  "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /**
   * THE SENTENCE REVEALED UNDER THE CONTROL, AND IT IS REQUIRED.
   *
   * The redrawn outlines are the answer for a reader looking at the picture. This is the answer for
   * the one who is not — and it is where the DERIVED readings live, the ones an outline cannot draw
   * at all: the area this count produces for each shape, and the ratio between them set against the
   * ratio the plate produced. `filterNotes`, `stackNotesForMarkup`, `levelNotesForMarkup`,
   * `withdrawNotesForMarkup` and `foldNotesForMarkup` hold the same position for the same reason.
   */
  note: string;
  /**
   * THE SAME PRODUCT, PRINTED ON THE PLOT.
   *
   * A reader looking at two outlines is asking "which is bigger", and an answer that lives under the
   * control is an answer in the wrong place. Short, because it sits over the drawing.
   */
  readout: string;
  /** The axes this option COUNTS — every one of them a declared axis key, each named once. Order is
   *  indifferent: the frame's own order is the order the outline is walked in. */
  counts: string[];
};

/** What a beat declares when it wants this control. Absent/`null` means it wants none. */
export type CountDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. It is always first, always the default, and it is the plate. */
  noneLabel: string;
  /**
   * WHAT THE CONTROL WILL DO, SAID BEFORE IT IS PRESSED — and it is required, because the owner had
   * to ask, and because it is the one thing the page this file replaces got right.
   *
   * Every other sentence this vocabulary owns is a COUNTERFACTUAL: what this count produced, once it
   * exists. A counterfactual cannot warn anybody. A legend names the control, which tells a reader
   * what it is ABOUT and not what pressing it DOES. So this is the one sentence in the whole
   * mechanism written for the state the page SHIPS in, and it takes the same reserved row the
   * counterfactuals take — directly under the control and directly above the drawing, where the
   * change will happen, and costing the layout nothing because the row is already as tall as the
   * longest sentence in it.
   */
  noneNote: string;
  /** The frame, in the plate's own order. It is the same frame in every state — this vocabulary
   *  changes which spokes the outline is drawn through and NEVER which spoke a name sits on. */
  axes: CountAxis[];
  options: CountOption[];
};

/** The reserved id of the untouched option. No declared option may slug to it. */
export const COUNT_NONE_SLUG = "none";

/** A CSS-id-safe slug, derived from an option's KEY or an axis's KEY and never from its label — the
 *  derivation `stack.ts`, `withdraw.ts`, `fold.ts` and `reorder.ts` all argue for, for the same
 *  reason: the thing already HAS an identity, and deriving a second one from the words is how
 *  `Central & Northern Europe` became `[data-group="...&amp;..."]`.
 *
 *  @parity */
export function countSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched option. One function, three readers. */
export function countOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * THE FLOOR ON A SHAPE, AND IT IS THE SAME ONE THE TYPE SHEET SETS FOR DRAWING ONE AT ALL. Two
 * vertices and a closing edge enclose nothing: the outline goes out and comes back along itself and
 * every area it could be said to have is zero. A control offering that is a control offering to
 * delete the picture.
 */
export const COUNT_RING_MIN = 3;

/**
 * The relative gap below which two areas are the same picture. An outline whose area differs by less
 * than half a percent from the plate's is one a reader cannot tell apart from it. An option that only
 * reaches that has set a spoke aside and found nothing.
 */
export const COUNT_AREA_FLOOR = 0.005;

/** Three decimals is far below anything a reader can see in an area quoted to two, and a raw float is
 *  fifteen characters of noise in a refusal message. */
const round = (n: number) => Number(n.toFixed(3));

/** Two decimals of a user unit, which at this family's scale is a fortieth of a pixel on a laptop —
 *  and it keeps a generated stylesheet naming four states of two outlines from carrying seventeen
 *  digits of floating-point noise per coordinate. */
const unit = (n: number) => Number(n.toFixed(2));

/**
 * THE OUTLINE, AND IT IS ONE POINT PER SPOKE IN EVERY STATE.
 *
 * A counted spoke contributes its own vertex. A spoke that is NOT counted contributes the point where
 * the closing chord crosses it: the chord runs from the nearest counted neighbour behind it to the
 * nearest counted neighbour ahead, and a run of several uncounted spokes between the same two
 * neighbours shares the chord evenly. Because every one of those points lies ON the chord, the
 * polygon drawn through all `n` of them is the polygon drawn through the counted vertices alone —
 * same outline, same enclosed area, to the last decimal.
 *
 * WHY NOT SIMPLY EMIT THE COUNTED VERTICES. Two reasons, and the first is the one the reader sees. A
 * CSS `d` interpolates a path to another path point by point and only when the two have the same
 * segments in the same order; a path that went from eight corners to five would have to be SWAPPED,
 * and the reader would be shown a different picture rather than shown this one closing. With one
 * point per spoke in every state the outline peels off the vertices it stops counting, in front of
 * them, and they stay where they are while it goes.
 *
 * The second is that it makes the vertex and the corner one arithmetic instead of two. The dot the
 * reader points at is drawn at `vertices[key]`; the corner is that same value or a point between two
 * of them. There is no declaration in which a beat can state a corner that disagrees with its own dot
 * — the defect this family has already measured at 5,47 user units, on the page this file was written
 * to replace.
 */
export function countedOutline(
  axes: CountAxis[],
  counted: string[],
  vertices: Record<string, [number, number]>,
): [number, number][] {
  const n = axes.length;
  const keep = new Set(counted);
  const inRing = axes.map((axis) => keep.has(axis.key));
  const kept = inRing.filter(Boolean).length;
  if (kept < COUNT_RING_MIN)
    throw new Error(
      `count: an outline over ${kept} spoke(s) closes nothing — a shape needs at least ` +
        `${COUNT_RING_MIN}, which is the same floor chart-beat/references/types/radar.md sets for ` +
        "drawing one at all",
    );
  const pointOf = (i: number): [number, number] => {
    const point = vertices[axes[i].key];
    if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1]))
      throw new Error(
        `count: the axis ${JSON.stringify(axes[i].key)} has no usable vertex, so the outline cannot ` +
          "be walked through it",
      );
    return [point[0], point[1]];
  };
  const out: ([number, number] | null)[] = axes.map((_, i) => (inRing[i] ? pointOf(i) : null));
  for (let i = 0; i < n; i++) {
    if (out[i]) continue;
    let behind = i;
    do behind = (behind + n - 1) % n;
    while (!inRing[behind]);
    let ahead = i;
    do ahead = (ahead + 1) % n;
    while (!inRing[ahead]);
    const run: number[] = [];
    for (let j = (behind + 1) % n; j !== ahead; j = (j + 1) % n) run.push(j);
    const [ax, ay] = pointOf(behind);
    const [bx, by] = pointOf(ahead);
    const step = (run.indexOf(i) + 1) / (run.length + 1);
    out[i] = [ax + (bx - ax) * step, ay + (by - ay) * step];
  }
  return out as [number, number][];
}

/**
 * The area a closed outline encloses, by the shoelace, in the square of whatever unit the points are
 * in. Absolute, because the sign is the direction the frame happens to be walked in and a reader has
 * no opinion about that.
 *
 * MEASURED ON THE POINTS THE PAGE WILL REALLY DRAW, never on a parallel formula. It means the number
 * a refusal quotes and the number the readout prints are the number a reader could take off the
 * picture with a ruler, and it is why this file asks a beat for coordinates rather than for values
 * and angles.
 */
export function enclosedArea(points: [number, number][]): number {
  if (points.length < COUNT_RING_MIN)
    throw new Error(
      `count: ${points.length} point(s) enclose nothing — at least ${COUNT_RING_MIN} are needed`,
    );
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % points.length];
    if (![ax, ay, bx, by].every(Number.isFinite))
      throw new Error("count: a corner has no usable coordinate, so no area can be measured");
    sum += ax * by - bx * ay;
  }
  return Math.abs(sum) / 2;
}

/** The counted set of the untouched state: every declared axis. Written once because three readers
 *  need it and a second spelling of "the plate counts everything" is a second thing to get wrong. */
const plateCounts = (declaration: CountDeclaration): string[] =>
  declaration.axes.map((axis) => axis.key);

/** A set's identity, independent of the order the keys were written in — refusal 4's whole content
 *  and refusal 1's. */
const setKey = (keys: string[]): string => [...new Set(keys)].sort().join(" ");

/**
 * EVERY STATE THE CONTROL CAN PRODUCE, the untouched one first, each with the axes it counts and the
 * axes it sets aside — in the FRAME'S own order, never the declaration's, because the frame's order
 * is the one the outline is walked in and the one the markup is emitted in.
 */
export function countStatesForMarkup(
  declaration: CountDeclaration | null | undefined,
): { slug: string; isNone: boolean; label: string; counted: string[]; aside: string[] }[] {
  if (!declaration) return [];
  const frame = plateCounts(declaration);
  const state = (slug: string, isNone: boolean, label: string, counts: string[]) => {
    const keep = new Set(counts);
    return {
      slug,
      isNone,
      label,
      counted: frame.filter((key) => keep.has(key)),
      aside: frame.filter((key) => !keep.has(key)),
    };
  };
  return [
    state(COUNT_NONE_SLUG, true, declaration.noneLabel, frame),
    ...declaration.options.map((option) =>
      state(countSlugOf(option.key), false, option.label, option.counts),
    ),
  ];
}

/**
 * EVERY STATE'S OUTLINE FOR EVERY SHAPE, as an SVG path string: state slug -> shape key -> `d`.
 *
 * The component needs the untouched state's for the `d` ATTRIBUTE it bakes into the markup — what an
 * engine that ignores the CSS property draws — and every state's for the baked fallback behind
 * `@supports not`.
 */
export function countOutlines(
  declaration: CountDeclaration | null | undefined,
  geometry: CountGeometry,
): Record<string, Record<string, string>> {
  if (!declaration) return {};
  const out: Record<string, Record<string, string>> = {};
  for (const state of countStatesForMarkup(declaration)) {
    out[state.slug] = {};
    for (const shape of geometry.shapes)
      out[state.slug][shape.key] =
        countedOutline(declaration.axes, state.counted, shape.vertices)
          .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${unit(x)} ${unit(y)}`)
          .join(" ") + " Z";
  }
  return out;
}

/** Every state's enclosed area for every shape, in the drawing's own square units: state slug ->
 *  shape key -> area. The refusals are written against it and so is the beat's own readout. */
export function countAreas(
  declaration: CountDeclaration | null | undefined,
  geometry: CountGeometry,
): Record<string, Record<string, number>> {
  if (!declaration) return {};
  const out: Record<string, Record<string, number>> = {};
  for (const state of countStatesForMarkup(declaration)) {
    out[state.slug] = {};
    for (const shape of geometry.shapes)
      out[state.slug][shape.key] = enclosedArea(
        countedOutline(declaration.axes, state.counted, shape.vertices),
      );
  }
  return out;
}

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything is
 * drawn. `geometry` is what the beat actually DRAWS — every shape, with the point it put on every
 * axis — so an option that counts an axis the plate has not got, or that closes on the shape the
 * reader is already looking at, is caught here rather than by choosing it and looking.
 */
export function assertCountDeclaration(
  declaration: CountDeclaration | null | undefined,
  geometry: CountGeometry,
): void {
  if (!declaration) return;
  const at = (what: string) => `count: ${what}`;
  if (!declaration.label?.trim())
    throw new Error(at("the control has no legend, so nothing says what the reader is choosing"));
  if (!declaration.noneLabel?.trim())
    throw new Error(at("the untouched option has no words, and it is the state the page ships in"));
  // THE SENTENCE THAT WARNS, REFUSED IF IT IS MISSING — refusal 6 on the state the page ships in.
  // Every other sentence here is written about a state the reader has already produced; this is the
  // only one written for the state they arrive in.
  if (!declaration.noneNote?.trim())
    throw new Error(
      at(
        "nothing on the page says what this control will DO before it is pressed — the legend names " +
          "what the reader is choosing, not what choosing does, and every other sentence here is a " +
          "counterfactual that only exists once an option has been taken",
      ),
    );
  if (!Array.isArray(declaration.axes) || declaration.axes.length < COUNT_RING_MIN)
    throw new Error(
      at(
        `a frame is declared with ${declaration.axes?.length ?? 0} axis/axes — under ` +
          `${COUNT_RING_MIN}, nothing closes into a shape and there is nothing for a count to take ` +
          "away from",
      ),
    );
  if (!declaration.options?.length)
    throw new Error(at("a declared control with no options is a legend and a default"));

  const frame = plateCounts(declaration);
  const known = new Set(frame);
  if (known.size !== frame.length) throw new Error(at("two of the declared axes share a key"));
  for (const axis of declaration.axes)
    if (!axis.name?.trim())
      throw new Error(at(`the axis ${JSON.stringify(axis.key)} has no word on its spoke`));

  if (!Array.isArray(geometry?.shapes) || geometry.shapes.length === 0)
    throw new Error(at("no shape is declared, so no count can be measured against a real outline"));
  for (const shape of geometry.shapes)
    for (const key of frame) {
      const point = shape.vertices?.[key];
      if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite))
        throw new Error(
          at(
            `the shape ${JSON.stringify(shape.key)} has no vertex on ${JSON.stringify(key)} — the ` +
              "spoke is drawn and the outline could not be walked through it",
          ),
        );
    }

  // THE PLATE'S OWN AREAS ONLY, AND EVERY OPTION'S MEASURED INSIDE THE LOOP AFTER ITS KEYS HAVE BEEN
  // CHECKED. Measuring all four states up front read better and was wrong: `countedOutline` throws on
  // a subset under three spokes and on a key the frame has not got, so an option with either defect
  // was answered by the OUTLINE's message about a shape it could not close rather than by the
  // refusal written for it — refusals 2 and 5 were unreachable, and the test that says so is the one
  // that found it.
  const plate = Object.fromEntries(
    geometry.shapes.map((shape) => [
      shape.key,
      enclosedArea(countedOutline(declaration.axes, frame, shape.vertices)),
    ]),
  );
  const seenSlugs = new Set<string>();
  const seenSets = new Map<string, string>([[setKey(frame), declaration.noneLabel]]);

  for (const option of declaration.options) {
    const slug = countSlugOf(option.key);
    if (slug === COUNT_NONE_SLUG)
      throw new Error(
        at(`the option ${JSON.stringify(option.key)} slugs to the reserved id of the untouched option`),
      );
    if (seenSlugs.has(slug))
      throw new Error(
        at(`two options slug to ${JSON.stringify(slug)}, so one of them can never be chosen`),
      );
    seenSlugs.add(slug);

    if (!option.label?.trim())
      throw new Error(at(`the option ${JSON.stringify(option.key)} has no visible words`));
    if (!option.announce?.includes(option.label))
      throw new Error(
        at(
          `the option ${JSON.stringify(option.key)} announces ${JSON.stringify(option.announce)}, ` +
            `which does not contain its own visible words ${JSON.stringify(option.label)} — WCAG ` +
            "2.5.3 label-in-name, and a reader who speaks the pill cannot operate the page",
        ),
      );
    // REFUSAL 6, on a state the reader can reach. A control that reveals nothing has moved the
    // picture and told nobody what it moved it to.
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
            "on the outlines and this control's whole product is a number they cannot see there",
        ),
      );

    // REFUSAL 5. An option counting an axis the frame has not got would silently count nothing at
    // all, and the outline would close somewhere the reader was never offered.
    if (!Array.isArray(option.counts) || option.counts.length === 0)
      throw new Error(
        at(`the option ${JSON.stringify(option.key)} counts nothing — it names no axis at all`),
      );
    const used = new Set<string>();
    for (const key of option.counts) {
      if (!known.has(key))
        throw new Error(
          at(
            `the option ${JSON.stringify(option.key)} counts ${JSON.stringify(key)}, which this ` +
              "frame does not draw",
          ),
        );
      if (used.has(key))
        throw new Error(
          at(
            `the option ${JSON.stringify(option.key)} counts ${JSON.stringify(key)} twice — a ` +
              "reading counted twice on one outline is a shape nobody measured",
          ),
        );
      used.add(key);
    }

    // REFUSAL 2. Two vertices and a closing edge enclose nothing: the outline goes out and comes
    // straight back along itself.
    if (used.size < COUNT_RING_MIN)
      throw new Error(
        at(
          `the option ${JSON.stringify(option.label)} counts ${used.size} axis/axes — under ` +
            `${COUNT_RING_MIN} the outline encloses nothing and the reader is offered the deletion ` +
            "of the picture",
        ),
      );

    // REFUSAL 1 AND REFUSAL 4 ARE ONE COMPARISON, because the plate is just the first set on the
    // page. An option that counts what something already on the page counts draws that same outline,
    // and the reader operates the control while the picture stands still.
    const identity = setKey(option.counts);
    const twin = seenSets.get(identity);
    if (twin !== undefined)
      throw new Error(
        at(
          `the option ${JSON.stringify(option.label)} counts the same axes as ` +
            `${JSON.stringify(twin)}, so it draws the same outline — the reader operates the ` +
            'control and nothing moves (chart-web/references/directed-interaction.md, "The ' +
            'mechanical refusal")',
        ),
      );
    seenSets.set(identity, option.label);

    // REFUSAL 3. The set may differ and the PRODUCT still not. Setting aside a spoke whose reading
    // already sits on the chord its neighbours close along moves no area at all — this control
    // exists to show that the area moves, so an option that leaves every shape's area where the
    // plate had it has taken an axis out of the count and found nothing.
    const after = Object.fromEntries(
      geometry.shapes.map((shape) => [
        shape.key,
        enclosedArea(countedOutline(declaration.axes, option.counts, shape.vertices)),
      ]),
    );
    const moved = geometry.shapes.some((shape) => {
      const before = plate[shape.key];
      if (before === 0) return after[shape.key] !== 0;
      return Math.abs(after[shape.key] - before) / before >= COUNT_AREA_FLOOR;
    });
    if (!moved)
      throw new Error(
        at(
          `the option ${JSON.stringify(option.label)} moves no shape's area by ` +
            `${COUNT_AREA_FLOOR * 100} % (` +
            geometry.shapes
              .map((s) => `${s.key} ${round(plate[s.key])} -> ${round(after[s.key])}`)
              .join(", ") +
            ") — an axis left the count and the thing this control exists to expose did not move",
        ),
      );
  }
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the state
 * the beat renders in and the one a reader with no script never leaves.
 */
export function countOptionsForMarkup(
  declaration: CountDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isNone: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: countOptionId(idPrefix, COUNT_NONE_SLUG),
      slug: COUNT_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: countOptionId(idPrefix, countSlugOf(option.key)),
      slug: countSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * Every sentence the reserved row holds, by the slug that shows it — THE UNTOUCHED OPTION'S FIRST,
 * because it is the warning and the row must not be empty in the state the page ships in.
 */
export function countNotesForMarkup(
  declaration: CountDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return [
    { slug: COUNT_NONE_SLUG, text: declaration.noneNote },
    ...declaration.options.map((option) => ({
      slug: countSlugOf(option.key),
      text: option.note,
    })),
  ];
}

/**
 * Every readout printed ON the plot, THE PLATE'S OWN INCLUDED — which is the difference from
 * `countNotesForMarkup` and it is deliberate. A note is a counterfactual and the plate has none. A
 * readout answers "which of these two shapes is bigger", and that question is live in the state the
 * page ships in: a reader who touches nothing must be told what the full count produces, or the
 * numbers the options reveal have nothing to be read against.
 *
 * REFUSAL 6 on the plate's own readout: a state without one is a state that cannot be read.
 */
export function countReadoutsForMarkup(
  declaration: CountDeclaration | null | undefined,
  plateReadout: string,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  if (!plateReadout?.trim())
    throw new Error(
      "count: the plate prints no readout, so the state the page ships in cannot be read against " +
        "the states its options produce",
    );
  return [
    { slug: COUNT_NONE_SLUG, text: plateReadout },
    ...declaration.options.map((option) => ({
      slug: countSlugOf(option.key),
      text: option.readout,
    })),
  ];
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on a
 * real radio. No script runs, so the control works with JavaScript off exactly as it works with it on
 * — and the empty string returned for a beat with no declaration is what makes "no dead CSS" literal
 * rather than aspirational, exactly as `filterCss`, `stackCss`, `levelCss`, `withdrawCss`, `foldCss`
 * and `reorderCss` do.
 *
 * THE VOCABULARY IT WRITES AGAINST, which is what the component must tag its markup with:
 *
 *   data-count-plate="<slug>"       one hit layer per state — the whole `<svg>` that answers.
 *   data-count-readout="<slug>"     the areas this count produces, printed on the plot.
 *   data-count-note="<slug>"        the sentence under the control.
 *   data-count-in="<axis slug>"     the furniture an axis wears while it is COUNTED.
 *   data-count-out="<axis slug>"    the furniture the same axis wears while it is set ASIDE.
 *
 * TWO REGISTERS DRAWN, ONE SHOWN — and it is the same device `reorder.ts` used for its plates, for
 * the same reason and one better. An axis set aside changes its spoke, its name AND its two vertices
 * at once, in three different properties on three kinds of element; a stylesheet that flipped each
 * property would have to name a colour, a dash and a fill, which is the beat's business and not this
 * file's. Drawing both registers and revealing one with `display` means THIS FILE NAMES NOTHING BUT
 * `display`, and the beat says — and measures — exactly what "set aside" looks like on its own page.
 * It also takes the unshown register out of the hit test, out of the tab order and out of
 * `verify-web.mjs`'s probe by its own zero-box filter, all three for free.
 *
 * THE EMISSION ORDER IS THE MECHANISM, not tidiness. `${scope} [data-count-plate]` and
 * `${scope} [data-count-plate="none"]` weigh the same (0,2,0), so the one that wins is the one
 * written last — a sankey on this branch rendered green with zero ribbons lit for exactly this
 * reason. The general rules are emitted first, the default's exceptions second, and the
 * `:has(#...:checked)` rules (1,2,0) last, where they beat both regardless.
 *
 * `display: block` ON A PLATE AND `display: inline` INSIDE ONE. The format's own stylesheet sets
 * `svg.chart { display: block }`, so a revealed hit layer must be told `block` or it drops out of its
 * grid cell. The furniture inside the drawing is SVG content whose UA display is `inline`, and any
 * value other than `none` renders it — `revert` is avoided on both, because it rolls back past the
 * author origin rather than back to the rule above it.
 */
export function countCss(
  declaration: CountDeclaration | null | undefined,
  { scope, idPrefix }: { scope: string; idPrefix: string },
): string {
  if (!declaration) return "";
  const lines: string[] = [
    `/* The count this beat declared: ${declaration.options.length} subset(s) over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, stack.ts moves with, level.ts measures with, withdraw.ts subtracts with,`,
    `   fold.ts lays over and reorder.ts hands round, and the reason this control needs no script and`,
    `   survives one being blocked. Every axis is drawn twice, counted and set aside; this reveals one`,
    `   of the two, and never moves a name. */`,
    `${scope} [data-count-plate] { display: none; }`,
    `${scope} [data-count-plate="${COUNT_NONE_SLUG}"] { display: block; }`,
    `${scope} [data-count-readout] { display: none; }`,
    `${scope} [data-count-readout="${COUNT_NONE_SLUG}"] { display: revert; }`,
    // `visibility` AND NOT `display` FOR THE SENTENCES: they are stacked in one grid cell so the row
    // is always as tall as the longest of them, and a `display: none` sibling contributes no height
    // to a grid cell. Hidden by visibility it still sizes the row, still leaves the accessibility
    // tree, and still cannot be read.
    `${scope} [data-count-note] { visibility: hidden; }`,
    `${scope} [data-count-note="${COUNT_NONE_SLUG}"] { visibility: visible; }`,
    // AT REST EVERY AXIS IS COUNTED, so the set-aside register is hidden everywhere until a state
    // asks for it. There is no per-axis rule in the default state at all: the plate counts all of
    // them, and a rule saying so for each would be eight ways to disagree with that one fact.
    `${scope} [data-count-out] { display: none; }`,
  ];
  for (const state of countStatesForMarkup(declaration)) {
    if (state.isNone) continue;
    const at = `${scope}:has(#${countOptionId(idPrefix, state.slug)}:checked)`;
    lines.push(
      `${at} [data-count-plate="${COUNT_NONE_SLUG}"] { display: none; }`,
      `${at} [data-count-plate="${state.slug}"] { display: block; }`,
      `${at} [data-count-readout="${COUNT_NONE_SLUG}"] { display: none; }`,
      `${at} [data-count-readout="${state.slug}"] { display: revert; }`,
      `${at} [data-count-note="${COUNT_NONE_SLUG}"] { visibility: hidden; }`,
      `${at} [data-count-note="${state.slug}"] { visibility: visible; }`,
    );
    for (const key of state.aside) {
      const axis = countSlugOf(key);
      lines.push(
        `${at} [data-count-in="${axis}"] { display: none; }`,
        `${at} [data-count-out="${axis}"] { display: inline; }`,
      );
    }
  }
  return lines.join("\n");
}

/**
 * THE CLOSING.
 *
 * How long the outline takes to peel off the vertices it stops counting, and to close over them. A
 * JUDGEMENT, and a knob: slow enough that a reader can watch the edge leave ONE vertex — which is the
 * whole thing this control is for — and short enough that pressing the second pill is not waiting for
 * the first. It is not measured off anything, and saying so is better than dressing it as arithmetic.
 * It is the number `reorder.ts` settled on for the same page.
 */
export const COUNT_CLOSE_MS = 420;

/** One curve for both outlines, so two shapes closing at once are on one clock. */
export const COUNT_CLOSE_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/** The feature the closing rests on, written once and asked twice — for the fallback and for the
 *  travel itself, so the two can never drift apart. */
const COUNT_D_SUPPORT = '(d: path("M 0 0 Z"))';

/**
 * THE OUTLINE'S OWN STYLESHEET. Same mechanism as `countCss` — `:has()` on the scope, `:checked` on a
 * real radio, generated once at build time — and the same emission discipline: the general rule
 * first, the per-state rules after it, and the transition LAST, inside
 * `@media (prefers-reduced-motion: no-preference)`, where `reduce` cannot reach it.
 *
 * AND THE PAGE IS CORRECT WITH NO MOTION AT ALL, three ways. Under `prefers-reduced-motion: reduce`
 * every transition is gone and the geometry is already set outside the query, so the picture SNAPS.
 * With JavaScript off nothing here changes, as with everything else in this file. And on an engine
 * with no CSS `d` property the outlines are drawn as one baked `<path>` per state, swapped with
 * `display`, behind `@supports not` — so an engine this file has never been driven in gets a correct
 * picture that does not travel rather than a travelling picture that is wrong.
 *
 * NOTHING HERE NAMES A COLOUR AND NOTHING HERE COMPUTES A COORDINATE.
 */
export function countOutlineCss(
  declaration: CountDeclaration | null | undefined,
  { scope, idPrefix }: { scope: string; idPrefix: string },
  geometry: CountGeometry,
): string {
  if (!declaration) return "";
  const outlines = countOutlines(declaration, geometry);
  const lines: string[] = [
    `/* The closing: each shape's outline is one path with one point per spoke in every state, so a`,
    `   CSS d interpolates it point by point and the edge is SEEN to leave the vertices it stops`,
    `   counting. ${COUNT_CLOSE_MS}ms, one clock for both shapes. The vertices themselves never`,
    `   move. */`,
    // Both halves are hidden here and exactly one is turned back on by the `@supports` pair below —
    // hidden outside either branch so an engine with no `@supports` at all draws neither instead of
    // both.
    `${scope} [data-count-area] { display: none; }`,
    `${scope} [data-count-still] { display: none; }`,
  ];
  const whenChecked = (slug: string) => `${scope}:has(#${countOptionId(idPrefix, slug)}:checked)`;

  lines.push(`@supports ${COUNT_D_SUPPORT} {`);
  lines.push(`  ${scope} [data-count-area] { display: inline; }`);
  for (const [shape, d] of Object.entries(outlines[COUNT_NONE_SLUG] ?? {}))
    lines.push(`  ${scope} [data-count-area="${shape}"] { d: path("${d}"); }`);
  for (const state of countStatesForMarkup(declaration)) {
    if (state.isNone) continue;
    const at = whenChecked(state.slug);
    for (const [shape, d] of Object.entries(outlines[state.slug] ?? {}))
      lines.push(`  ${at} [data-count-area="${shape}"] { d: path("${d}"); }`);
  }
  lines.push(`}`);

  lines.push(`@supports not ${COUNT_D_SUPPORT} {`);
  lines.push(`  ${scope} [data-count-still="${COUNT_NONE_SLUG}"] { display: inline; }`);
  for (const state of countStatesForMarkup(declaration)) {
    if (state.isNone) continue;
    const at = whenChecked(state.slug);
    lines.push(
      `  ${at} [data-count-still="${COUNT_NONE_SLUG}"] { display: none; }`,
      `  ${at} [data-count-still="${state.slug}"] { display: inline; }`,
    );
  }
  lines.push(`}`);

  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-count-area] { transition: d ${COUNT_CLOSE_MS}ms ${COUNT_CLOSE_EASING}; }`,
    `}`,
  );
  return lines.join("\n");
}

/**
 * THE VERTEX STILL LIGHTS UNDER THE POINTER, ACROSS THE SPLIT BETWEEN THE DRAWING AND THE HIT LAYER.
 *
 * `interaction.mjs` carries `.mark-active` from a point to `[data-mark="<key>"]` found with
 * `svg.querySelectorAll` — INSIDE THE SAME `<svg>`. The drawing and the layer that answers are two
 * `<svg>`s, so that lookup finds nothing and the format's own `--mark-active` mechanism goes quiet.
 * This puts it back in CSS, which can cross the boundary because both live under one `.chart-plot`:
 * `:has()` on the plot, keyed on the point, painting the vertex in the colour THE BEAT declared and
 * measured on the vertex itself.
 *
 * TWO RULES PER MARK, BECAUSE A VERTEX HAS TWO REGISTERS. The counted vertex is a filled mark and
 * lights on its `fill`; the set-aside vertex is an open one and lights on its `stroke` — filling it
 * would paint it solid, which is the one thing it must not look like. Exactly one of the two is
 * displayed in any state, so exactly one rule can be seen to fire.
 *
 * AND IT IS BETTER THAN WHAT IT REPLACES ON ONE AXIS: `:focus` is in the selector, so a reader
 * tabbing through the vertices with the script absent gets the lift the script used to be the only
 * source of.
 *
 * A LINGERING CLASS CANNOT LIGHT A HIDDEN PLATE'S TWIN, and it is worth saying why the rule does not
 * have to name the chosen state to be safe: every path that changes the state clears the class first.
 * Pressing a pill is a `pointerdown` outside the svg, which `initChart`'s document listener clears
 * on; reaching one by keyboard blurs the point, which clears on `blur`.
 */
export function countMarkLiftCss({ scope, marks }: { scope: string; marks: string[] }): string {
  if (marks.length === 0) return "";
  const when = (key: string, state: string) =>
    `${scope} .chart-plot:has(.pt[data-mark-ref="${key}"]${state})`;
  const lines: string[] = [
    `/* The vertex the pointed point speaks for, lit across the drawing/hit-layer split — on the`,
    `   fill while it is counted, on the edge while it is set aside. */`,
  ];
  for (const key of marks) {
    lines.push(
      `${when(key, ".pt-active")} [data-mark="${key}"],`,
      `${when(key, ":focus")} [data-mark="${key}"] { fill: var(--mark-active); }`,
      `${when(key, ".pt-active")} [data-mark-edge="${key}"],`,
      `${when(key, ":focus")} [data-mark-edge="${key}"] { stroke: var(--mark-active); }`,
    );
  }
  return lines.join("\n");
}

/**
 * THE RENDER-TIME REFUSAL, AND WHY IT LIVES HERE RATHER THAN IN `interaction-plan.ts`.
 *
 * `assertControlsChangeSomething` discovers a page's controls by walking the markup for the shapes it
 * knows — `data-detail` answers, a `<details>` table, `chart-filter-*` / `chart-stack-*` /
 * `chart-level-*` radios. It does not know this vocabulary's radios exist, so a count is invisible to
 * it and would ship unmeasured. Squatting on another vocabulary's id prefix to be discovered would
 * make the census report a stack that is not one, which is the "one word, two behaviours" defect this
 * family's headers refuse at the top. So the refusal ships with the vocabulary, written against the
 * same definition the format already holds — *a control whose state, once applied, equals the default
 * state is one the reader operates while nothing changes*.
 *
 * It is applied to the SENTENCE, because the geometry half is already refused earlier and better:
 * `assertCountDeclaration` has compared every option's counted set against the plate's and against
 * every other option's, and measured the area each produces. What no declaration check can see is
 * whether the words the control reveals were already printed on the page at rest.
 *
 * `defaultPrintedText` is imported rather than re-derived — the last time this repository derived one
 * string two ways, a whole map emptied with nothing red. What IS done here is strip this vocabulary's
 * own revealed elements before handing the page over, for exactly the reason that function strips a
 * filter's note and a stack's: an element revealed by `:checked` counted as printed makes the control
 * that reveals it look dead.
 */
export function assertCountChangesThePicture(
  html: string,
  declaration: CountDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const revealed = /<[^>]*data-count-(?:note|readout)="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g;
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
      `${where}: ${inert.length} of ${declaration.options.length} count option(s) reveal a ` +
        `sentence the page already prints (${inert.join(", ")}). A reader who works through every ` +
        `subset is told nothing they could not read at rest — give each one the reading its own ` +
        `count produces, or stop offering it ` +
        `(chart-web/references/directed-interaction.md, "The mechanical refusal")`,
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a count.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function countChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "count",
    notes: { reserve: "1.5em", stacked: true },
  });
}
