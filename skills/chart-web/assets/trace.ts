// twin/skills/chart-web/assets/trace.ts
//
// THE FIFTH THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what may be LAID ACROSS it. `withdraw.ts` says what may be TAKEN OUT OF A SUM. This file says what
// may be FOLLOWED THROUGH it: one origin lit from end to end while the rest of the network recedes,
// with the path's own arithmetic written out. All five are native radio inputs plus CSS generated at
// build time (`:checked` and `:has()` on the enclosing figure, no listener, no state, not one byte of
// JavaScript), because that is the only kind of control this format can promise still works with the
// script absent.
//
// WHY IT IS A FIFTH FILE AND NOT A FIFTH OPTION IN ONE OF THE OTHER FOUR.
//
// A filter's vocabulary is a NAMED SET OF KEYS, and everything it does follows from that set: hide
// what is not in it. A stack needs a set AND an arrangement. A level needs a value and a reach. A
// withdrawal needs an ARITHMETIC OF SUBTRACTION — one term out, the rest re-stepped. A trace needs
// none of those. It needs an ARITHMETIC PARTITION: one node's stated total, split across the
// destinations it actually reaches, with what the plate does not draw stated rather than dropped.
//
// That partition is the whole of it, and it is why this could not be folded in anywhere:
//
//   - nothing leaves, because the untraced network IS the comparison — a reader following the coal
//     out of six countries is reading it against the eight sources they are not following;
//   - nothing moves, so there is no arrangement to declare;
//   - nothing is subtracted, so no term downstream changes size or place;
//   - what DOES change is which marks are asserting and which are scaffolding, and — the part no
//     other vocabulary has a place for — WHAT THE PATH ADDS UP TO, restated per state.
//
// AND IT IS THE ONLY ONE OF THE FIVE THAT CAN REFUSE AN OPTION BECAUSE ITS ARITHMETIC DOES NOT
// CLOSE. A trace is offered on the promise that the reader can see where a quantity went. An origin
// whose segments do not sum to its own node total is an origin whose path the reader cannot audit,
// and an origin of which the plate draws NO segment at all is a path with nothing on it — a control
// that lights an empty picture and calls it a trajectory. Both are refused here, by arithmetic,
// rather than discovered by looking.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     trace: {
//       label: "Suivre une source",        // the <legend> — the beat's own words
//       destinations: ["FRA", "DEU", …],   // every destination node the plate draws
//       options: [
//         {
//           key: "Nuclear",                // THE FIRST OPTION IS THE DEFAULT AND IT IS THE CLAIM
//           label: "le nucléaire",
//           announce: "Suivre le nucléaire — …",  // must contain `label` (WCAG 2.5.3)
//           note: "Le nucléaire : 455,1 TWh …",   // the sentence revealed under the control
//           stated: "455 TWh sortent · 3 pays",   // printed ON the plot, at the origin node
//           total: 455.14,                        // the origin node's own printed total
//           undrawn: 0,                           // what the plate does not draw, in the same unit
//           undrawnLabel: null,                   // and how the beat says so, when it is not zero
//           segments: [
//             { to: "FRA", label: "France", value: 380.45, atDestination: "67,7 % de son électricité" },
//             …
//           ],
//         },
//         …
//       ],
//     }
//
// THERE IS NO "NONE" OPTION, AND THAT IS THE ONE PLACE THIS FILE DEPARTS FROM ITS FOUR SIBLINGS.
// A filter, a stack, a level and a withdrawal all have an untouched state that IS the plate the beat
// ships, and their first option is that state doing nothing. A trace has no such state: a sankey
// with nothing traced is the tangle the control exists to undo, and shipping it as the default would
// mean the reader with no script and no choice gets the picture the beat judged unreadable. So the
// FIRST option is the default, it is a real trace, and it must be the beat's own claim — the reader
// who never touches the control is looking at exactly what the title says.
//
// COLOURS ARRIVE AS ARGUMENTS, never as literals: the beat sets them from the direction it is being
// rendered in and measures them there, so nothing here names a colour.

import { answerPieces, defaultPrintedText } from "./interaction-plan.ts";
import { controlChromeCss } from "./control-chrome.ts";

/** One drawn segment of a traced path: where it lands, what it carries, and what that is worth at
 *  the far end. `value` is in the data's own unit and is what the conservation check adds up. */
export type TraceSegment = {
  /** The destination node's key. Must be one of the declaration's own `destinations`. */
  to: string;
  /** The destination's own name, for the sentence under the control. */
  label: string;
  /** What this segment carries, in the data's own unit. Strictly positive: a segment worth nothing
   *  is not a segment, it is a pair of nodes that do not touch. */
  value: number;
  /**
   * WHAT IS PRINTED AT THE FAR END, and it is the reading the path exists to deliver.
   *
   * A traced ribbon tells the reader how much LEFT. It does not tell them what that amount IS where
   * it arrives, which on a sankey is the second half of every question worth asking — 380 TWh of
   * nuclear into France is 84 % of all the nuclear and 68 % of all the electricity, and those two
   * numbers say different things. The beat formats it; this file never formats a number.
   */
  atDestination: string;
};

/** One origin and its whole downstream path. */
export type TraceOption = {
  /** The origin node followed. Its node lights, its ribbons come forward, the rest recede. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It
   *  must CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG
   *  2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /** The sentence revealed under the control: the path's arithmetic in the beat's own words. */
  note: string;
  /**
   * THE PATH'S HEADLINE, PRINTED ON THE PLOT AT THE ORIGIN NODE, AND IT IS REQUIRED.
   *
   * The sentence under the control is for a reader who is not looking at the picture. This is for
   * the one who is: how much leaves this node, across how many destinations, and how much of it the
   * plate does not draw. Without it a lit path is a picture of a choice rather than a picture of an
   * answer, and the reader is left counting ribbons to recover the one number the control exists to
   * give them — the defect `withdraw.ts` names at `restated` and pays for the same way.
   */
  stated: string;
  /** The origin node's own printed total, in the data's own unit. What the segments must sum to,
   *  together with `undrawn`. */
  total: number;
  /**
   * WHAT THE PLATE DOES NOT DRAW, IN THE SAME UNIT, AND IT IS NOT OPTIONAL.
   *
   * A sankey that drops sub-pixel links — the honest thing to do with a ribbon thinner than a line —
   * makes every node it touches sum to LESS than the total that node prints. Aggregated into one
   * remainder line at the foot of the page, that is invisible per node; and a control that gives the
   * reader one state per origin puts the reader in front of exactly one node at a time. So each
   * option carries its own, and the conservation this form promises is checked in every state the
   * control can produce rather than once against the data.
   */
  undrawn: number;
  /** How the beat says what is not drawn. Required when `undrawn` is not zero — an unstated
   *  remainder is a remainder that is hidden — and forbidden when it is, so a page cannot print
   *  "0 TWh missing" nine times and call it rigour. */
  undrawnLabel: string | null;
  /** The drawn path, in the order the plate draws it. */
  segments: TraceSegment[];
};

export type TraceDeclaration = {
  /** The `<legend>` — the beat's own words for what the reader is choosing. */
  label: string;
  /** Every destination node the plate draws. A destination no option reaches goes HOLLOW in that
   *  state, which is a reading in its own right ("nothing from this source arrives here"), and it
   *  is only available because this list is stated rather than inferred from the options. */
  destinations: string[];
  /** The origins, in reading order. THE FIRST IS THE DEFAULT AND IT IS THE BEAT'S CLAIM. */
  options: TraceOption[];
};

/** The slug an origin's radio is identified by. Same shape as its four siblings' so a reader of the
 *  emitted CSS can tell at a glance which vocabulary a rule belongs to. */
export function traceSlugOf(key: string): string {
  const slug = String(key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new Error(`trace: the origin ${JSON.stringify(key)} has no slug — it is punctuation`);
  return slug;
}

/** The DOM id of one origin's radio. The prefix is the format's, never guessed here. */
export function traceOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * THE REFUSALS, AND EVERY ONE OF THEM IS A PICTURE THAT WOULD LIE.
 *
 * `tolerance` is in the data's own unit and the beat states it, because "how close is equal" is a
 * property of the frozen file's own precision and not of this file.
 */
export function assertTraceDeclaration(
  declaration: TraceDeclaration | null | undefined,
  {
    drawnOrigins,
    tolerance,
  }: {
    /** Every origin node the plate draws, so an option naming one it does not is refused here rather
     *  than emitting a rule that matches nothing. */
    drawnOrigins: string[];
    /** How close two numbers in this beat's unit have to be to count as equal. */
    tolerance: number;
  },
): void {
  if (!declaration) return;
  const { label, destinations, options } = declaration;
  if (!label || !String(label).trim())
    throw new Error("trace: the control has no legend — a reader cannot be asked to choose without being told what");
  if (!Array.isArray(destinations) || destinations.length === 0)
    throw new Error("trace: no destinations are declared, so no path has anywhere to land");
  if (!Array.isArray(options) || options.length < 2)
    throw new Error(
      `trace: ${options?.length ?? 0} option(s) — a control with one state is one the reader operates while nothing changes`,
    );

  const origins = new Set(drawnOrigins);
  const dests = new Set(destinations);
  const seen = new Set<string>();
  const slugs = new Set<string>();

  for (const option of options) {
    const where = `the trace option ${JSON.stringify(option.key)}`;
    if (seen.has(option.key)) throw new Error(`trace: ${where} is declared twice`);
    seen.add(option.key);
    const slug = traceSlugOf(option.key);
    if (slugs.has(slug)) throw new Error(`trace: two origins slug to ${JSON.stringify(slug)}, so one radio id would answer for both`);
    slugs.add(slug);

    if (!origins.has(option.key))
      throw new Error(`trace: ${where} names an origin this beat does not draw`);
    for (const field of ["label", "announce", "note", "stated"] as const)
      if (!option[field] || !String(option[field]).trim())
        throw new Error(`trace: ${where} has no ${field}`);
    if (!String(option.announce).includes(String(option.label)))
      throw new Error(
        `trace: ${where}'s accessible name ${JSON.stringify(option.announce)} does not contain its ` +
          `visible label ${JSON.stringify(option.label)} — that is the WCAG 2.5.3 "label in name" failure`,
      );

    // A PATH WITH NOTHING ON IT. The refusal this file exists to be able to make: an origin all of
    // whose links fall under the plate's own drawing threshold has no ribbon to light, so choosing
    // it would recede the whole network and light nothing.
    if (!Array.isArray(option.segments) || option.segments.length === 0)
      throw new Error(
        `trace: ${where} has no drawn segment — the plate draws none of this origin's links, so ` +
          `following it would recede the whole network and light nothing. Do not offer it`,
      );

    const landed = new Set<string>();
    let sum = 0;
    for (const segment of option.segments) {
      if (!dests.has(segment.to))
        throw new Error(`trace: ${where} lands on ${JSON.stringify(segment.to)}, which is not a destination this beat draws`);
      if (landed.has(segment.to))
        throw new Error(`trace: ${where} lands on ${JSON.stringify(segment.to)} twice`);
      landed.add(segment.to);
      if (!(Number(segment.value) > 0))
        throw new Error(`trace: ${where}'s segment to ${JSON.stringify(segment.to)} carries ${segment.value} — a segment worth nothing is two nodes that do not touch`);
      if (!segment.atDestination || !String(segment.atDestination).trim())
        throw new Error(`trace: ${where}'s segment to ${JSON.stringify(segment.to)} says nothing at the far end`);
      sum += Number(segment.value);
    }

    if (!(Number(option.undrawn) >= 0))
      throw new Error(`trace: ${where} declares ${option.undrawn} undrawn — a negative remainder is an invented quantity`);
    if (Number(option.undrawn) > tolerance && !option.undrawnLabel)
      throw new Error(
        `trace: ${where} leaves ${option.undrawn} undrawn and does not say so. A remainder the plate ` +
          `does not draw and the page does not state is the arithmetic hole this vocabulary exists to close`,
      );
    if (!(Number(option.undrawn) > tolerance) && option.undrawnLabel)
      throw new Error(`trace: ${where} draws its whole total and still prints a remainder line`);

    // CONSERVATION, IN THIS STATE. The form's own promise, checked against what the plate DRAWS and
    // not against the data it was drawn from — which is the check that was missing when the two were
    // assumed to be the same thing.
    const closed = sum + Number(option.undrawn);
    if (Math.abs(closed - Number(option.total)) > tolerance)
      throw new Error(
        `trace: ${where} does not conserve — its ${option.segments.length} drawn segment(s) carry ` +
          `${sum} and ${option.undrawn} is undrawn, which is ${closed}, while its node prints ` +
          `${option.total}. A sankey node promises that everything out equals its own total`,
      );
  }
}

/**
 * The options a component draws, in reading order. The first is the default and it is checked at
 * rest: `isDefault` is what the component puts `defaultChecked` on, and what the refusal below
 * exempts from having to say something new.
 */
export function traceOptionsForMarkup(
  declaration: TraceDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isDefault: boolean }[] {
  if (!declaration) return [];
  return declaration.options.map((option, i) => ({
    id: traceOptionId(idPrefix, traceSlugOf(option.key)),
    slug: traceSlugOf(option.key),
    label: option.label,
    announce: option.announce,
    isDefault: i === 0,
  }));
}

/** THE READER-FACING CONSEQUENCE, and it is not optional — the rule `filterNotes`,
 *  `stackNotesForMarkup` and `withdrawNotesForMarkup` all hold. One sentence per option, revealed by
 *  the same `:checked` that lights the path. The default's own sentence is revealed at rest, because
 *  the default is not a counterfactual: it is the claim. */
export function traceNotesForMarkup(
  declaration: TraceDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({ slug: traceSlugOf(option.key), text: option.note }));
}

/** The headline printed ON the plot, at the origin node — one per option, placed by the beat's own
 *  geometry because WHERE a node's words go is the beat's business and not this file's. */
export function traceStatedForMarkup(
  declaration: TraceDeclaration | null | undefined,
): { slug: string; key: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: traceSlugOf(option.key),
    key: option.key,
    text: option.stated,
  }));
}

/** What each reached destination says in each state, for the beat to print under that destination's
 *  own label. One row per (option, segment); a destination an option does not reach gets no row and
 *  goes hollow instead. */
export function traceDestinationsForMarkup(
  declaration: TraceDeclaration | null | undefined,
): { slug: string; to: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.flatMap((option) =>
    option.segments.map((segment) => ({
      slug: traceSlugOf(option.key),
      to: segment.to,
      text: segment.atDestination,
    })),
  );
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as its four siblings do.
 *
 * THE VOCABULARY IT WRITES AGAINST, which is what the component must tag its markup with:
 *
 *   data-flow="<origin>"        a ribbon, by the origin it leaves. Lit or receded.
 *   data-origin="<origin>"      the origin node. Lit or receded.
 *   data-dest="<destination>"   the destination node. Solid when the path reaches it, HOLLOW when
 *                               it does not.
 *   data-dest-share="<slug>"    the reading printed under a destination's label in one state.
 *   data-trace-stated="<slug>"  the path's headline, printed at the origin node.
 *   data-trace-note="<slug>"    the sentence under the control.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED, exactly as in `stack.ts` and `withdraw.ts`, and here it
 * is load-bearing twice over. `${scope}:has(#id:checked) [data-flow]` and
 * `${scope}:has(#id:checked) [data-flow="K"]` score the SAME (1,3,0) — an attribute selector with a
 * value weighs no more than one without. The lit rule therefore wins only because it is emitted
 * after the receding one, and the same holds for `[data-dest]` against `[data-dest="D"]`. Reordering
 * this function's two pushes would recede the traced path and light nothing, with no error anywhere.
 *
 * WHY THE RIBBONS' OWN `fill=` ATTRIBUTE STILL MATTERS. An SVG presentation attribute loses to every
 * CSS rule there is, so these rules always win when the stylesheet is present. What the attribute
 * buys is the state with NO stylesheet at all: the beat paints the default option's own colours as
 * attributes, so a reader who gets the markup and nothing else still gets the claim rather than a
 * monochrome tangle. It is the same reason the default option must be the claim.
 */
export function traceCss(
  declaration: TraceDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    lit,
    recede,
    hollow,
    fadeMs,
  }: {
    scope: string;
    idPrefix: string;
    /** What a traced ribbon and its origin node become. `opacity` is the ribbon's fill-opacity and
     *  the beat measures the colour it COMPOSITES to over the ground, not the colour it names. */
    lit: { fill: string; opacity: number };
    /** What everything not on the path becomes. `node` is the solid fill an untraced origin node
     *  takes; `fill`/`opacity` are the ribbon's. */
    recede: { fill: string; opacity: number; node: string };
    /** A destination the path does not reach: fill out, dashed outline in — `withdraw.ts`'s finding
     *  that an absence with nothing where it was is unreadable, applied to the far end of a flow.
     *  `solid` is what a REACHED destination takes. */
    hollow: { fill: string; stroke: string; dash: string; solid: string };
    /** How long the network takes to change hands. Honoured only under `prefers-reduced-motion:
     *  no-preference` — the whole transition lives inside the query rather than being overridden
     *  back, so under `reduce` there is no transition to resolve at all. */
    fadeMs: number;
  },
): string {
  if (!declaration) return "";

  const scoped = (selectors: string[], at: string) => {
    for (const selector of selectors)
      if (!selector.startsWith(`${at} `))
        throw new Error(
          `trace: the generated selector ${JSON.stringify(selector)} does not start with its own ` +
            `option scope ${JSON.stringify(at)} — every selector in a group needs it, because ` +
            "`A B, C` is `(A B), (C)` and the second half would apply in every state of the page",
        );
    return selectors.join(", ");
  };

  const lines: string[] = [
    `/* The trace this beat declared: ${declaration.options.length} paths over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, stack.ts moves with, level.ts lays across and withdraw.ts subtracts with, and`,
    `   the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-trace-note] { visibility: hidden; }`,
    `${scope} [data-trace-stated] { display: none; }`,
    `${scope} [data-dest-share] { display: none; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-flow], ${scope} [data-origin], ${scope} [data-dest] {`,
    `    transition: fill ${fadeMs}ms ease, fill-opacity ${fadeMs}ms ease, stroke ${fadeMs}ms ease;`,
    `  }`,
    `}`,
  ];

  for (const option of declaration.options) {
    const slug = traceSlugOf(option.key);
    const at = `${scope}:has(#${traceOptionId(idPrefix, slug)}:checked)`;

    // THE NETWORK RECEDES FIRST. Emitted before the lit rules and relied on to be: see the header.
    lines.push(
      `${at} [data-flow] { fill: ${recede.fill}; fill-opacity: ${recede.opacity}; }`,
      `${at} [data-origin] { fill: ${recede.node}; }`,
      `${at} [data-dest] { fill: ${hollow.fill}; stroke: ${hollow.stroke}; stroke-width: 1; stroke-dasharray: ${hollow.dash}; }`,
    );

    // THEN THE PATH COMES FORWARD.
    lines.push(
      `${scoped([`${at} [data-flow="${option.key}"]`], at)} { fill: ${lit.fill}; fill-opacity: ${lit.opacity}; }`,
      `${scoped([`${at} [data-origin="${option.key}"]`], at)} { fill: ${lit.fill}; }`,
    );
    for (const segment of option.segments)
      lines.push(`${at} [data-dest="${segment.to}"] { fill: ${hollow.solid}; stroke: none; }`);

    lines.push(
      `${at} [data-dest-share="${slug}"] { display: revert; }`,
      `${at} [data-trace-stated="${slug}"] { display: revert; }`,
      `${at} [data-trace-note="${slug}"] { visibility: visible; }`,
    );
  }
  return lines.join("\n");
}

/**
 * THE RENDER-TIME REFUSAL, AND WHY IT LIVES HERE RATHER THAN IN `interaction-plan.ts`.
 *
 * `assertControlsChangeSomething` discovers a page's controls by walking the markup for the shapes it
 * knows — `data-detail` answers, a `<details>` table, `chart-filter-*` / `chart-stack-*` /
 * `chart-level-*` radios. It does not know this vocabulary's radios exist, so a trace would ship
 * unmeasured; squatting on another vocabulary's id prefix to be discovered would make the census
 * report a filter that is not one, which is the "one word, two behaviours" defect this family refuses.
 *
 * So the refusal is written here, against the same definition the format already holds — *a control
 * whose state, once applied, equals the default state is one the reader operates while nothing
 * changes*. The DEFAULT option is exempt, and deliberately: it is not a counterfactual, it is the
 * claim, and its sentence is supposed to be readable at rest. Every other option must carry a reading
 * the page does not already print.
 *
 * `defaultPrintedText` is imported rather than re-derived. What IS done here is strip this
 * vocabulary's own revealed elements first, for the reason that function's own callers strip theirs:
 * an element revealed by `:checked` counted as printed makes the control that reveals it look dead.
 */
export function assertTraceChangesThePicture(
  html: string,
  declaration: TraceDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const revealed = /<[^>]*data-(?:trace-note|trace-stated|dest-share)="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g;
  const printed = defaultPrintedText(String(html).replace(revealed, " "));
  const inert: string[] = [];
  for (const option of declaration.options.slice(1)) {
    const adds = answerPieces(option.note).some((piece) => !printed.includes(piece));
    if (!adds) inert.push(option.label);
  }
  if (inert.length)
    throw new Error(
      `${where}: ${inert.length} of ${declaration.options.length - 1} non-default trace option(s) ` +
        `reveal a sentence the page already prints (${inert.join(", ")}). A reader who works through ` +
        `every path is told nothing they could not read at rest — give each one the numbers its own ` +
        `arithmetic produces, or stop offering it ` +
        `(chart-web/references/directed-interaction.md, "The mechanical refusal")`,
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a trace.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function traceChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "trace",
  });
}
