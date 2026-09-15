// twin/skills/chart-web/assets/withdraw.ts
//
// THE THIRD THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. This file says
// what may be TAKEN OUT OF A SUM — and, because the rest of the sum depended on it, what the rest
// becomes without it. All three are native radio inputs plus CSS generated at build time
// (`:checked` and `:has()` on the enclosing figure, no listener, no state, not one byte of
// JavaScript), because that is the only kind of control this format can promise still works with
// the script absent, and "the reader without a script still gets the complete plate" is not a claim
// the format is willing to soften.
//
// WHY IT IS A THIRD FILE AND NOT A THIRD OPTION IN ONE OF THE OTHER TWO.
//
// A filter's whole vocabulary is a NAMED SET OF KEYS and everything it does is derivable from that
// set: hide what is not in it. A stack needs a set AND an arrangement — for each member, where it
// goes. A withdrawal needs neither: it needs an ARITHMETIC. Removing one term from a running total
// does three different things to three different kinds of element, and no set and no arrangement
// expresses them together:
//
//   - the withdrawn term itself leaves, and its absence must stay measurable;
//   - every term DOWNSTREAM of it keeps its own size and changes its own POSITION, because a step
//     in a running total starts where the previous one ended and the previous one just moved;
//   - the CLOSING LEVEL — the only bar measured from zero rather than from its predecessor — does
//     not move at all. It is re-drawn, longer or shorter, and it lands on a number that was never
//     on the page.
//
// Folding that into `stack.ts` would give an arrangement vocabulary a scale factor and a concept of
// "downstream", which is not what an arrangement is; folding it into `filter.ts` would give a set
// vocabulary geometry, which its whole argument is that it does not need. The twin has already paid
// once for one word meaning two behaviours (`map-web` removing while `chart-web` dimmed). Three
// mechanisms, three files, one idiom.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     withdraw: {
//       label: "Retirer une contribution",   // the <legend> — the beat's own words
//       noneLabel: "Le pont complet",        // the untouched option's words. Always first, always
//                                            // the default, and it IS the picture the page ships in.
//       options: [
//         {
//           key: "nuclear",                  // the contribution taken out
//           label: "le nucléaire",
//           announce: "Sans le nucléaire — …",  // what a screen reader hears. Must contain `label`.
//           note: "Sans le nucléaire, 2024 …",  // the sentence revealed under the control
//           restated: "588 TWh",             // the recomputed total, printed on the plot
//           resteps: [{ key: "renewables", dy: -44.5 }],   // geometry units, never CSS pixels
//           cuts: ["fossil", "nuclear"],     // the connectors the hole invalidates
//           close: { key: "end", value: 587.78, top: 95.1, height: 240.4 },
//         },
//         …
//       ],
//     }
//
// `dy`, `top` AND `height` ARE IN THE GEOMETRY'S OWN UNITS, never in CSS pixels, for the reason
// `stack.ts` states at length: a `chart-web` `<svg>` carries `preserveAspectRatio="none"`, so a
// `viewBox` unit is a different number of reader pixels at every width, while `transform:
// translate(Npx, Npx)` on an SVG element resolves in USER units and therefore tracks the geometry
// at 320 px and at 1600 px with nothing re-measuring it.
//
// THE CLOSING LEVEL IS SCALED, NOT TRANSLATED, AND THAT IS THE ONE PIECE OF ARITHMETIC THIS FILE
// DOES ITSELF. Every other bar in a bridge floats: it keeps its length and changes its start, so a
// translation is the whole of it. The closing bar is drawn from zero, so its bottom is pinned to the
// baseline and only its TOP may move — which is a vertical scale about that baseline and not a
// translation. The factor is derived HERE, from the `top` the component computed with its own scale
// and the `height` the bar is actually drawn at, precisely so that "where the bar lands" and "how
// far it is scaled" cannot be two derivations of one number. The beat states where; this file works
// out by how much.
//
// WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE. Every refusal below is the same
// sentence in a different costume: an option whose arithmetic the plate cannot honour is an option
// whose sentence claims more than the reader can see. A closing level that would be cut off by the
// frame is not drawn half-tall and captioned — it is not offered.

import { answerPieces, defaultPrintedText } from "./interaction-plan.ts";
import { controlChromeCss } from "./control-chrome.ts";

/** One step that re-steps because something before it was taken out, and how far, in geometry units. */
export type WithdrawRestep = { key: string; dy: number };

/**
 * WHERE THE CLOSING LEVEL LANDS UNDER ONE OPTION.
 *
 * `value` is the number, `top`/`height` are the geometry, and the two are tied together by the BEAT
 * (which owns the scale) rather than asserted here — the same division `stack.ts` draws when it takes
 * a formatted `total` and a numeric `totalGt` and makes the component check one against what it
 * draws. What this file does with `top` and `height` is derive the scale factor, once.
 */
export type WithdrawClose = {
  /** The closing level's key — the bar drawn from zero, which is re-drawn rather than moved. */
  key: string;
  /** What it lands on under this option, in the data's own unit. Carried so a message can say it. */
  value: number;
  /** The y of its recomputed top, in geometry units, from the beat's own scale. */
  top: number;
  /** Its height as the plate actually draws it, in geometry units. */
  height: number;
};

/** One option: the contribution withdrawn, what the rest of the bridge does without it, and the
 *  words for both. */
export type WithdrawOption = {
  /** The contribution taken out. Its bar empties, its words are struck, and it does not move. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture.
   *  It must CONTAIN `label`: an accessible name that does not contain the visible one is the
   *  WCAG 2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /** The sentence revealed under the control: the recomputed total and what it means, in the beat's
   *  own words. Revealed by the same `:checked` that empties the bar, so it works with no script. */
  note: string;
  /**
   * THE RECOMPUTED TOTAL, IN THE BEAT'S OWN WORDS, PRINTED ON THE PLOT, AND IT IS REQUIRED.
   *
   * A bridge whose closing bar has quietly changed length and says nothing is a picture of a
   * subtraction, not a picture of an ANSWER: the reader is left to measure a bar against an axis to
   * recover the one number the control exists to give them. The sentence under the control is for a
   * reader who is not looking at the picture; this is for the one who is. It is the beat's own
   * formatted string — this file never formats a number — and the component prints it at the
   * recomputed level's own top, where the comparison with the opening level is made.
   */
  restated: string;
  /** Every step downstream of the withdrawal, and how far it re-steps. May be empty: withdrawing
   *  the LAST contribution moves nothing but the closing level, and that is a real option. */
  resteps: WithdrawRestep[];
  /**
   * THE CONNECTORS THE HOLE INVALIDATES, by the key of the step each one LEAVES.
   *
   * A connector is the one piece of a bridge that is about a PAIR rather than a term, so a
   * withdrawal invalidates two of them at once: the one leaving the withdrawn step (it now leaves
   * nothing) and the one arriving at it (it must now reach across the hole to the step beyond). Both
   * are taken away and the beat draws ONE replacement per option, spanning the gap at the level the
   * bridge actually holds there. `cuts` must name the withdrawn key itself — a connector still
   * running out of a bar that is no longer there is the exact picture this control must not ship.
   */
  cuts: string[];
  /** The closing level and where it lands without this contribution. */
  close: WithdrawClose;
};

/** What a beat declares when it wants a withdrawal. Absent/`null` means it wants none. */
export type WithdrawDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. It is always first, always the default, and it is the plate. */
  noneLabel: string;
  options: WithdrawOption[];
};

/** The reserved id of the untouched option. No declared option may slug to it. */
export const WITHDRAW_NONE_SLUG = "none";

/**
 * A CSS-id-safe slug, derived from the option's KEY and never from its label — the derivation
 * `stack.ts` argues for, for the same reason: the option already HAS an identity (the contribution
 * it removes, which is the same string `data-step` carries and the same string every generated
 * selector quotes), and deriving a second one from the words is how `Central & Northern Europe`
 * became `[data-group="…&amp;…"]`.
 *
 *  @parity */
export function withdrawSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched option. One function, three readers. */
export function withdrawOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * THE SCALE FACTOR THE CLOSING LEVEL TAKES, AND HOW FAR ITS OWN TOP TRAVELS.
 *
 * Derived, never declared, so there is exactly one arithmetic between "the beat says the bar lands
 * at `top`" and "the stylesheet scales it by `f`". `baseline` is the y of zero in the same geometry
 * units — on a bar drawn from zero that is the bottom edge, which is the point the scale is taken
 * about so the bar grows and shrinks from its own zero rather than from its middle.
 */
export function closeTransform(
  close: WithdrawClose,
  baseline: number,
): { factor: number; dy: number } {
  const drawnTop = baseline - close.height;
  return { factor: (baseline - close.top) / close.height, dy: close.top - drawnTop };
}

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything
 * is drawn. `drawnKeys` is what the beat actually DRAWS — the list every withdrawn key, every
 * re-stepped key, every cut connector and the closing level are checked against — so an option
 * naming a bar that is not on the plate is caught here rather than by choosing it and looking.
 */
export function assertWithdrawDeclaration(
  declaration: WithdrawDeclaration,
  drawnKeys: string[],
  { baseline }: { baseline: number },
): void {
  const where = "withdraw declaration";
  if (!declaration || typeof declaration !== "object" || Array.isArray(declaration))
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);
  if (!Number.isFinite(baseline) || !(baseline > 0))
    throw new Error(
      `${where}: \`baseline\` is the y of zero in the geometry's own units and must be a positive ` +
        `number, got ${JSON.stringify(baseline)}`,
    );
  for (const field of ["label", "noneLabel"] as const)
    if (typeof declaration[field] !== "string" || !declaration[field].trim())
      throw new Error(
        `${where}: \`${field}\` must be the beat's own words — a control with no ${field} renders unnamed`,
      );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two options to be a choice, got ${declaration.options?.length ?? 0}. ` +
        "A beat that does not need a withdrawal declares none.",
    );

  const drawn = new Set(drawnKeys);
  if (drawn.size !== drawnKeys.length)
    throw new Error(`${where}: the drawn keys are not unique — ${JSON.stringify(drawnKeys)}`);

  const seen = new Map<string, string>();
  for (const option of declaration.options) {
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(`${where}: every option needs a label — got ${JSON.stringify(option)}`);
    if (!drawn.has(option.key))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} withdraws ${JSON.stringify(option.key)}, ` +
          "which the beat does not draw — the reader would take out a contribution that is not on the plate",
      );
    const slug = withdrawSlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (slug === WITHDRAW_NONE_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${WITHDRAW_NONE_SLUG}", the ` +
          "reserved id of the untouched option — rename it",
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug ` +
          `to ${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.label);

    for (const field of ["announce", "note", "restated"] as const)
      if (typeof option[field] !== "string" || !option[field].trim())
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} has no \`${field}\` — a control whose ` +
            "answer is only a picture leaves a reader to measure a bar against an axis to recover " +
            "the one number it exists to give them",
        );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ${JSON.stringify(option.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain " +
          "the visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot " +
          "reach this option",
      );

    // ── the closing level ────────────────────────────────────────────────────────────────────
    const close = option.close;
    if (!close || typeof close !== "object")
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} declares no \`close\` — a bridge whose ` +
          "closing level does not move when a term is taken out of it is not showing an arithmetic",
      );
    if (!drawn.has(close.key))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} closes on ${JSON.stringify(close.key)}, ` +
          "which the beat does not draw",
      );
    if (close.key === option.key)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} withdraws the closing level itself — a ` +
          "bridge with no end is a bar chart with connectors",
      );
    for (const axis of ["value", "top", "height"] as const)
      if (!Number.isFinite(close[axis]))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives its closing level a non-finite ` +
            `${axis} (${close[axis]})`,
        );
    if (!(close.height > 0))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} says the closing level is drawn ` +
          `${close.height} units tall — a bar of no height cannot be scaled to anything`,
      );
    // THE FRAME IS NOT NEGOTIABLE. A counterfactual total larger than the axis the plate drew would
    // be a bar running out of the top of the viewBox, and a bar the reader can only see part of is
    // one they cannot read against the opening level — which is the whole comparison this option is
    // for. The remedy is the beat's scale, not a clipped picture.
    if (close.top < 0)
      throw new Error(
        `${where}: without ${JSON.stringify(option.label)} the closing level reaches ${close.value}, ` +
          `whose top is ${close.top.toFixed(1)} units — above the top of a ${baseline}-unit plot, so ` +
          "the bar would be cut off by the viewBox. Raise the headroom this beat's scale carries, or " +
          "stop offering the option.",
      );
    if (close.top > baseline)
      throw new Error(
        `${where}: without ${JSON.stringify(option.label)} the closing level lands below the zero ` +
          `baseline (top ${close.top.toFixed(1)} of ${baseline}) — a total this bridge cannot draw`,
      );
    const { factor } = closeTransform(close, baseline);
    // EVERY CONTROL CHANGES THE PICTURE, refused at the declaration rather than found by choosing an
    // option and looking. On this vocabulary the test is exact and needs no heuristic: a withdrawal
    // whose closing level lands exactly where the untouched one does has removed a contribution of
    // zero, and the reader operates it while the arithmetic stands still.
    if (!(Math.abs(factor - 1) > 1e-4))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} leaves the closing level exactly where the ` +
          "untouched bridge puts it — that is the default under a second name. A contribution worth " +
          "nothing is not an option; it is a row in the data.",
      );

    // ── what re-steps ────────────────────────────────────────────────────────────────────────
    if (!Array.isArray(option.resteps))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} declares no \`resteps\` array — declare an ` +
          "empty one for a contribution nothing follows",
      );
    const moved = new Set<string>();
    for (const restep of option.resteps) {
      if (!restep || typeof restep.key !== "string")
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a re-step with no key — ` +
            JSON.stringify(restep),
        );
      if (!drawn.has(restep.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} re-steps ${JSON.stringify(restep.key)}, ` +
            "which the beat does not draw. A bridge one step short of the arithmetic its own sentence " +
            "states is a picture that lies — do not offer the option.",
        );
      if (restep.key === option.key)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} re-steps the very contribution it ` +
            "withdraws — a term cannot both leave the sum and move within it",
        );
      if (restep.key === close.key)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} re-steps its own closing level. A level ` +
            "drawn from zero is RE-DRAWN, never translated: translating it would lift its bottom off " +
            "the baseline and turn the one bar measured against the axis into a floating one.",
        );
      if (moved.has(restep.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} re-steps ${JSON.stringify(restep.key)} ` +
            "twice — one step cannot be displaced by two different amounts",
        );
      moved.add(restep.key);
      if (!Number.isFinite(restep.dy))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(restep.key)} a ` +
            `non-finite dy (${restep.dy}) — the step would be transformed off the frame`,
        );
      if (restep.dy === 0)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} re-steps ${JSON.stringify(restep.key)} ` +
            "by zero. A step downstream of a withdrawal moves by exactly the value withdrawn; a zero " +
            "means either the step is not downstream or the contribution is worth nothing.",
        );
    }

    // ── the connectors ───────────────────────────────────────────────────────────────────────
    if (!Array.isArray(option.cuts) || option.cuts.length === 0)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} cuts no connector. Taking a term out of a ` +
          "running total always invalidates two of them — the one leaving it and the one arriving at " +
          "it — so an option that cuts none leaves the bridge drawn through a hole it no longer has.",
      );
    const cut = new Set<string>();
    for (const key of option.cuts) {
      if (typeof key !== "string" || !drawn.has(key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} cuts the connector leaving ` +
            `${JSON.stringify(key)}, which the beat does not draw`,
        );
      if (cut.has(key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} cuts ${JSON.stringify(key)} twice`,
        );
      cut.add(key);
    }
    if (!cut.has(option.key))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} empties ${JSON.stringify(option.key)}'s bar ` +
          "and leaves the connector running out of it. A line drawn from the end of a bar that is no " +
          "longer there is the one picture this control must never ship.",
      );
  }
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function withdrawOptionsForMarkup(
  declaration: WithdrawDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isNone: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: withdrawOptionId(idPrefix, WITHDRAW_NONE_SLUG),
      slug: WITHDRAW_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: withdrawOptionId(idPrefix, withdrawSlugOf(option.key)),
      slug: withdrawSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the same rule `filterNotes` and
 * `stackNotesForMarkup` hold. A recomputed bridge is an ARGUMENT the reader built, and an argument
 * that is only a picture cannot be checked. One sentence per option, revealed by the same `:checked`
 * that empties the bar. The untouched option gets NO note, because it is not a counterfactual: it is
 * the claim.
 */
export function withdrawNotesForMarkup(
  declaration: WithdrawDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: withdrawSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * THE RECOMPUTED TOTAL, one per option, for the component to place at the level's own new top.
 *
 * Same shape as `withdrawNotesForMarkup` and for the same reason; the difference is WHERE the two
 * land. The note goes under the control, in the reading order, for a reader who is not looking at
 * the plot. This goes ON the plot, beside the opening level it is now to be compared with, because
 * a comparison a reader makes with their eye needs its answer where their eye already is.
 */
export function withdrawRestatedForMarkup(
  declaration: WithdrawDeclaration | null | undefined,
): { slug: string; text: string; key: string; top: number }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: withdrawSlugOf(option.key),
    text: option.restated,
    key: option.close.key,
    top: option.close.top,
  }));
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss` and `stackCss` do.
 *
 * THE VOCABULARY IT WRITES AGAINST, which is what the component must tag its markup with:
 *
 *   data-step="<key>"      the bar. Emptied when withdrawn, translated when it re-steps, scaled
 *                          when it is the closing level.
 *   data-pt="<key>"        the hit point that answers for that bar. Travels with it — vertically
 *                          ONLY, which is the one displacement `interaction.mjs` can survive.
 *   data-link="<key>"      the connector LEAVING that step. Travels with the step it leaves, or is
 *                          cut when the withdrawal invalidates it.
 *   data-span="<slug>"     the one replacement connector this option draws across the hole.
 *   data-value="<key>"     the printed figure in the `.overlay` layer, whose colour is a custom
 *                          property and never an inline style (see `struck`).
 *   data-axis="<key>"      the name under the band.
 *   data-restated="<slug>" the recomputed total, printed at the closing level's new top.
 *   data-withdraw-note="<slug>"  the sentence under the control.
 *
 * WHY THE HIT POINTS MAY MOVE HERE WHEN `stack.ts` FORBIDS IT. `initChart` resolves a pointer to the
 * nearest mark BY X, off the `cx` attributes it reads once at init, which no CSS transform ever
 * changes — so a stack, which slides columns SIDEWAYS onto a tower, had to leave its points behind or
 * answer every segment of the tower with the first follower's name. A withdrawal never moves anything
 * horizontally: every step stays in its own band, so the x-resolution is untouched, and the answer box
 * is anchored on `point.getBoundingClientRect()`, which a transform DOES change. Carrying the points
 * is therefore not only safe, it is required — a point left at the old height would float the answer
 * over the empty space the step used to occupy.
 *
 * COLOURS ARRIVE AS ARGUMENTS, never as literals: the beat sets them from the direction it is being
 * rendered in and measures them there, so nothing here names a colour.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED, exactly as in `stack.ts` — and one pairing here depends
 * on it. `${scope}:has(#id:checked) [data-step="K"]` scores (1,2,0) and the format's own
 * `.mark-active { fill: … }` scores (0,1,0), so the emptied bar keeps its hole under the reader's
 * pointer instead of being filled back in by the hover rule. What it answers a pointer with instead
 * is its OUTLINE, in a rule emitted after it at (1,3,0).
 */
export function withdrawCss(
  declaration: WithdrawDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    baseline,
    hole,
    struck,
    moveMs,
    carry,
  }: {
    scope: string;
    idPrefix: string;
    /** The y of zero in the geometry's own units — the point the closing level is scaled about. */
    baseline: number;
    /**
     * WHAT A WITHDRAWN BAR BECOMES, and it is a hole rather than an absence.
     *
     * `opacity: 0` was the first form and it is the wrong picture: the reader is told a contribution
     * is gone and shown nothing where it was, so the one thing they cannot do is see HOW BIG the
     * thing they removed was — which on a bridge is the whole point of removing it. An emptied bar
     * keeps its own rectangle, measurable against the same axis as everything else, and the steps
     * that used to follow it slide up through the space it leaves.
     *
     * `active` is what its outline takes under the reader's pointer. It is a stroke and not a fill
     * for the reason above: filling it would put the contribution back.
     */
    hole: { fill: string; stroke: string; active: string; dash: string };
    /** The ink a struck word takes — the withdrawn step's own figure and its name under the band.
     *  IT IS A COLOUR THIS FILE IS GIVEN AND THE BEAT MEASURES: a figure printed INSIDE a tall bar
     *  is drawn in the ink for THAT FILL, and a bar with no fill has no such ink. Which is also why
     *  a beat using this vocabulary may not set a figure's colour as an inline style — an inline
     *  style beats every generated rule there is, and the struck figure would stay white on the
     *  page's own ground. */
    struck: { ink: string };
    /** How long the bridge takes to re-step. Honoured only under `prefers-reduced-motion:
     *  no-preference` — the whole transition lives inside the query rather than being overridden
     *  back, so under `reduce` there is no transition to resolve at all. */
    moveMs: number;
    /**
     * THE PRINTED FIGURES RE-STEP WITH THE BARS THEY BELONG TO — declared, because a beat that draws
     * no figures must not be given rules for them.
     *
     * WHY THE PLOT'S OWN EXTENTS AND NOT A LENGTH, which is `stack.ts`'s finding and applies
     * unchanged: a `[data-step]` is an SVG element and moves by `translate(Npx)`, which resolves in
     * USER units; a `[data-value]` lives in `.overlay`, an HTML layer sharing the `<svg>`'s grid
     * cell, where a CSS pixel is a different number of user units at every width. The one conversion
     * exact at every size is a PERCENTAGE of that layer, because under `preserveAspectRatio="none"`
     * the viewBox maps linearly onto the cell in each axis independently.
     *
     * What is emitted is a custom property and never a position: WHERE a figure sits is the beat's
     * geometry (above a short bar, inside a tall one), and `--restep-dy` is what lets the beat write
     * both states as one `calc()` instead of a second rule per step.
     */
    carry?: { width: number; height: number };
  },
): string {
  if (!declaration) return "";

  /**
   * EVERY SELECTOR IN A GROUP CARRIES THE SCOPE, ASSERTED AND NOT REMEMBERED.
   *
   * `A B, C` is `(A B), (C)`: a descendant prefix binds to the FIRST selector of a group and to no
   * other. `stack.ts` shipped that defect once — two of ten columns painted with the accent in every
   * state of the page, the untouched one included — and it was caught by reading the emitted CSS
   * back, which is not a thing anyone can be relied on to do twice. So it is a refusal, and this
   * file groups three different vocabularies per re-stepped key, which is three chances to make it.
   */
  const scoped = (selectors: string[], at: string) => {
    for (const selector of selectors)
      if (!selector.startsWith(`${at} `))
        throw new Error(
          `withdraw: the generated selector ${JSON.stringify(selector)} does not start with its own ` +
            `option scope ${JSON.stringify(at)} — every selector in a group needs it, because ` +
            "`A B, C` is `(A B), (C)` and the second half would apply in every state of the page",
        );
    return selectors.join(", ");
  };

  /** Three decimals of a `viewBox` unit is below a thousandth of a pixel at any width this format is
   *  verified at; a raw float is fifteen characters of noise in a delivered file. */
  const round = (n: number) => Number(n.toFixed(3));
  const half = Math.round(moveMs / 2);

  const lines: string[] = [
    `/* The withdrawal this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with and stack.ts moves with, and the reason this control needs no script and`,
    `   survives one being blocked. */`,
    `${scope} [data-withdraw-note] { display: none; }`,
    `${scope} [data-restated] { display: none; }`,
    // The replacement connectors are drawn in every state and revealed in one. `opacity` and not
    // `display`, because they are SVG geometry inside the plate's own stacking order and a
    // re-displayed `<line>` is one more thing for the layout to resolve while the bridge is moving.
    `${scope} [data-span] { opacity: 0; }`,
    // The motion, and it is the only motion this control has. Under `reduce` the whole block does
    // not exist, so there is no transition to override and no branch anywhere — `render-web.mjs`'s
    // own entrance rules take the same shape for the same reason.
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-step], ${scope} [data-pt], ${scope} [data-link] {`,
    `    transition: transform ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), fill ${half}ms ease, stroke ${half}ms ease, opacity ${half}ms ease;`,
    `  }`,
    // The figure takes the BAR's own duration and easing on its position and the ink's on its
    // colour: the two are interpolated over the same displacement for the same time, so the number
    // stays glued to its step for the whole trip instead of arriving after it.
    `  ${scope} [data-value] { transition: top ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), color ${half}ms ease, opacity ${half}ms ease; }`,
    `  ${scope} [data-axis] { transition: color ${half}ms ease; }`,
    `}`,
  ];

  for (const option of declaration.options) {
    const slug = withdrawSlugOf(option.key);
    const at = `${scope}:has(#${withdrawOptionId(idPrefix, slug)}:checked)`;
    const { factor, dy } = closeTransform(option.close, baseline);

    lines.push(
      // THE HOLE. Fill out, outline in — see `hole` above for why an emptied bar is not an absent
      // one. `stroke-width` is stated here and the beat is what keeps it one reader-pixel wide at
      // every width, with `vector-effect="non-scaling-stroke"` on the bar itself: this `<svg>`
      // carries `preserveAspectRatio="none"`, so an ordinary stroke would come out thick on the
      // vertical edges and thin on the horizontal ones.
      `${at} [data-step="${option.key}"] { fill: ${hole.fill}; stroke: ${hole.stroke}; stroke-width: 1; stroke-dasharray: ${hole.dash}; }`,
      `${at} [data-step="${option.key}"].mark-active { fill: ${hole.fill}; stroke: ${hole.active}; stroke-width: 2; }`,
      // THE WORDS OF WHAT WAS TAKEN OUT ARE STRUCK, NOT REMOVED. A reader who has just withdrawn the
      // nuclear phase-out still needs to know which band is the hole and what it was worth; taking
      // the name and the figure away would leave an unlabelled gap in a sequence whose order IS the
      // argument. The colour is the second half of it: a figure printed inside a tall bar is drawn
      // in the ink for that bar's fill, and this bar no longer has one.
      `${at} [data-value="${option.key}"] { color: ${struck.ink}; text-decoration: line-through; }`,
      `${at} [data-axis="${option.key}"] { color: ${struck.ink}; text-decoration: line-through; }`,
    );

    // The connectors the hole invalidates — the one leaving the withdrawn step and the one arriving
    // at it. Both go; one replacement spans the gap at the level the bridge actually holds there.
    for (const key of option.cuts)
      lines.push(`${at} [data-link="${key}"] { opacity: 0; }`);

    // THE ONE RULE THAT CANNOT BE GROUPED ACROSS KEYS: each step re-steps by its own amount. Within
    // one key it IS grouped, across the three vocabularies that must travel together — the bar, the
    // point that answers for it, and the connector leaving it. They are one thing on the page and a
    // rule that moved two of the three would leave a connector hanging in mid-air.
    for (const restep of option.resteps) {
      lines.push(
        `${scoped(
          [
            `${at} [data-step="${restep.key}"]`,
            `${at} [data-pt="${restep.key}"]`,
            `${at} [data-link="${restep.key}"]`,
          ],
          at,
        )} { transform: translateY(${round(restep.dy)}px); }`,
      );
      if (carry)
        lines.push(
          `${at} [data-value="${restep.key}"] { --restep-dy: ${round((restep.dy / carry.height) * 100)}%; }`,
        );
    }

    lines.push(
      // THE CLOSING LEVEL IS RE-DRAWN, NOT MOVED — a scale about the zero baseline, so its bottom
      // stays on the axis it is measured from and only its top travels. `transform-origin` is stated
      // in the geometry's own units because an SVG element's default `transform-box` is `view-box`,
      // where a length resolves in exactly those units at every width.
      `${at} [data-step="${option.close.key}"] { transform-origin: 0px ${round(baseline)}px; transform: scaleY(${round(factor)}); }`,
      // Its hit point travels to the new top, so the answer rises out of the level the reader is
      // looking at rather than the one the plate shipped with.
      `${at} [data-pt="${option.close.key}"] { transform: translateY(${round(dy)}px); }`,
      // THE MEASURED TOTAL'S OWN FIGURE GOES, AND THE RECOMPUTED ONE ARRIVES IN ITS PLACE. Leaving
      // both would print two totals on one bar, one of which is no longer what the bar is.
      `${at} [data-value="${option.close.key}"] { opacity: 0; }`,
      `${at} [data-span="${slug}"] { opacity: 1; }`,
      `${at} [data-restated="${slug}"] { display: revert; }`,
      `${at} [data-withdraw-note="${slug}"] { display: revert; }`,
    );
  }
  return lines.join("\n");
}

/**
 * THE RENDER-TIME REFUSAL, AND WHY IT LIVES HERE RATHER THAN IN `interaction-plan.ts`.
 *
 * `assertControlsChangeSomething` discovers a page's controls by walking the markup for the shapes
 * it knows — `data-detail` answers, a `<details>` table, `chart-filter-*` / `chart-stack-*` /
 * `chart-level-*` radios. It does not know this vocabulary's radios exist, so a withdrawal is
 * invisible to it and would ship unmeasured. Squatting on `stack.ts`'s id prefix and note attribute
 * to be discovered would make the census report a stack that is not one, which is the "one word,
 * two behaviours" defect this file's own header refuses at the top.
 *
 * So the refusal is written here, against the same definition the format already holds — *a control
 * whose state, once applied, equals the default state is one the reader operates while nothing
 * changes* — and applied twice, because this control answers on two channels:
 *
 *   THE SENTENCE. Each option's note must carry a reading the page does not already print. That is
 *   the half `interaction-plan.ts` measures for a stack and a yardstick, and the reason it measures
 *   the sentence rather than the movement: a transform is not a reading and no markup scan can see
 *   one, so a check that counted generated rules would go green on a hundred rules that moved
 *   nothing.
 *   THE GEOMETRY. This vocabulary CAN see its own movement, because it wrote it: the declaration is
 *   checked rather than the stylesheet, and `assertWithdrawDeclaration` has already refused an
 *   option whose closing level lands where the untouched one does.
 *
 * `defaultPrintedText` is imported rather than re-derived — the last time this repository derived one
 * string two ways, a whole map emptied with nothing red. What IS done here is strip this
 * vocabulary's own revealed elements before handing the page over, for exactly the reason that
 * function strips a filter's note and a stack's: an element revealed by `:checked` counted as
 * printed makes the control that reveals it look dead. The choropleth's 41 native `<title>`s cost a
 * round of this, and the stack's own sentence cost another.
 */
export function assertWithdrawChangesThePicture(
  html: string,
  declaration: WithdrawDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const revealed = /<[^>]*data-(?:withdraw-note|restated)="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g;
  const printed = defaultPrintedText(String(html).replace(revealed, " "));
  const inert: string[] = [];
  for (const option of declaration.options) {
    const adds = answerPieces(option.note).some((piece) => !printed.includes(piece));
    if (!adds) inert.push(option.label);
  }
  if (inert.length)
    throw new Error(
      `${where}: ${inert.length} of ${declaration.options.length} withdrawal option(s) reveal a ` +
        `sentence the page already prints (${inert.join(", ")}). A reader who works through every ` +
        `option is told nothing they could not read at rest — give each one the number its own ` +
        `arithmetic produces, or stop offering it ` +
        `(chart-web/references/directed-interaction.md, "The mechanical refusal")`,
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a withdrawal.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function withdrawChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "withdraw",
    notes: { reserve: "1.5em" },
  });
}
