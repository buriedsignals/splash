// twin/skills/chart-web/assets/stack.ts
//
// THE SECOND THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. This file says what may MOVE in it. Both are radio
// inputs plus CSS generated at build time — `:checked` and `:has()` on the enclosing figure, no
// listener, no state, no bytes of JavaScript — because that is the only kind of control this format
// can promise works with the script absent, and "the reader without a script still gets the complete
// plate" is not a claim the format is willing to soften.
//
// WHY IT IS A SECOND FILE AND NOT A SECOND OPTION IN `filter.ts`. A filter's whole vocabulary is a
// NAMED SET OF KEYS, and everything it does is derivable from that set: hide what is not in it.
// A stack needs a set AND an arrangement — for each member, where it goes — which is geometry the
// beat's own component computes and the vocabulary could never derive. Folding an arrangement into
// `filter.ts` would put a `dx`/`dy` on a type whose entire argument is that it needs nothing but
// names, and the twin already paid once for one word meaning two behaviours (`map-web` removing
// while `chart-web` dimmed). Two mechanisms, two files, one idiom.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     stack: {
//       label: "Empiler contre",            // the <legend> — the beat's own words
//       noneLabel: "Le classement seul",    // the untouched option's words. Always first, always
//                                           // the default, and it IS the picture the page ships in.
//       options: [
//         {
//           key: "CHN",                     // the column the others are stacked AGAINST
//           label: "Chine",                 // the pill's words
//           announce: "Chine — 6 pays …",   // what a screen reader hears. Must contain `label`.
//           note: "les 6 pays suivants · …",// the sentence revealed under the control
//           total: "= 12,44",               // what the tower ADDS UP TO, printed on the tower
//           onto: [{ key: "USA", dx: 0, dy: 0 }, { key: "IND", dx: -90, dy: -137 }, …],
//         },
//         …
//       ],
//     }
//
// `dx`/`dy` ARE IN THE GEOMETRY'S OWN UNITS, never in CSS pixels, and that is the one number in this
// file with a measurement behind it. A `chart-web` `<svg>` carries `preserveAspectRatio="none"`, so
// a `viewBox` unit is a different number of reader pixels at every width — which is exactly why this
// beat's old bracket could not state its clearance in them. A column sliding onto another column is
// the opposite case: it must scale WITH the columns, at every width, or it lands beside the tower on
// a phone and on it on a laptop. `transform: translate(Npx, Npx)` on an SVG element resolves in user
// units, so the generated rule is correct at 320 px and at 1600 px without anything re-measuring it.
//
// WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE. `assertStackDeclaration` is handed
// what the beat actually DRAWS, the same way `assertFilterDeclaration` is, because every refusal
// here is really the same sentence: an option whose tower the plate cannot build is an option whose
// sentence claims more than the reader can see. A run of followers that leaves the plate is not
// half-drawn and captioned — it is not offered.

/** One column carried onto the tower, and where it goes, in the geometry's own units. */
export type StackedColumn = { key: string; dx: number; dy: number };

/** One option: a reference column, the run stacked against it, and the words for both. */
export type StackOption = {
  /** The column the others are stacked against. It does not move and it keeps the accent. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture.
   *  It must CONTAIN `label`: an accessible name that does not contain the visible one is the
   *  WCAG "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /** The sentence revealed under the control: the count and the running total, in the beat's own
   *  words. Revealed by the same `:checked` that moves the columns, so it works with no script. */
  note: string;
  /**
   * WHAT THE TOWER ADDS UP TO, IN THE BEAT'S OWN WORDS, AND IT IS REQUIRED.
   *
   * A tower of one accent with no figure on it is a picture of a stack, not a picture of an
   * ADDITION: the owner's own reading of the first build was "a reader sees segments of one colour
   * and no total", and the number was on the page only in the sentence under the control. The
   * sentence is for a reader who is not looking at the picture; this is for the one who is. It is
   * the beat's own formatted string — this file never formats a number — and the component prints
   * it at the tower's own top, where the comparison is made.
   */
  total: string;
  /** The run stacked against `key`, bottom of the tower first. */
  onto: StackedColumn[];
};

/** What a beat declares when it wants a stack. Absent/`null` means it wants none. */
export type StackDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. It is always first, always the default, and it is the plate. */
  noneLabel: string;
  options: StackOption[];
};

/** The reserved id of the untouched option. No declared option may slug to it. */
export const STACK_NONE_SLUG = "none";

/**
 * A CSS-id-safe slug, derived from the option's KEY and never from its label.
 *
 * `filter.ts` slugs from the label because an option there is a named set with no other identity.
 * An option here already has one — the column it stacks against, which is the same string the
 * `data-col` attribute carries and the same string the generated selector quotes. Deriving the slug
 * from the words instead would be a second derivation of one identity, which is the defect
 * `filter.ts`'s own header records ("`Central & Northern Europe` became `[data-group="…&amp;…"]`").
 *
 *  @parity */
export function stackSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched option. One function, three readers. */
export function stackOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything
 * is drawn. `drawnKeys` is what the beat actually draws — the list every reference and every stacked
 * member is checked against, so an option naming a column that is not on the plate is caught here
 * rather than by a reader choosing it and watching a tower come up short.
 */
export function assertStackDeclaration(
  declaration: StackDeclaration,
  drawnKeys: string[],
): void {
  const where = "stack declaration";
  if (!declaration || typeof declaration !== "object")
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);
  for (const field of ["label", "noneLabel"] as const)
    if (typeof declaration[field] !== "string" || !declaration[field].trim())
      throw new Error(
        `${where}: \`${field}\` must be the beat's own words — a control with no ${field} renders unnamed`,
      );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two options to be a choice, got ${declaration.options?.length ?? 0}. ` +
        "A beat that does not need a stack declares none.",
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
        `${where}: option ${JSON.stringify(option.label)} stacks against ${JSON.stringify(option.key)}, ` +
          `which the beat does not draw — the reader would choose a reference that is not on the plate`,
      );
    const slug = stackSlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (slug === STACK_NONE_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${STACK_NONE_SLUG}", the reserved ` +
          "id of the untouched option — rename it",
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug to ` +
          `${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.label);

    for (const field of ["announce", "note"] as const)
      if (typeof option[field] !== "string" || !option[field].trim())
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} has no \`${field}\` — a control whose ` +
            "answer is only a picture leaves a keyboard reader with nothing",
        );
    if (typeof option.total !== "string" || !option.total.trim())
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`total\` — a tower that does not ` +
          "say what it adds up to is a picture of a stack, not of an addition, and the reader " +
          "looking at it is left to estimate the one number the option exists to give",
      );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ${JSON.stringify(option.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain " +
          "the visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot " +
          "reach this option",
      );

    if (!Array.isArray(option.onto) || option.onto.length === 0)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} stacks nothing onto ` +
          `${JSON.stringify(option.key)} — an option that moves no column is the default under a ` +
          "second name",
      );
    const members = new Set<string>();
    for (const member of option.onto) {
      if (!member || typeof member.key !== "string")
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a member with no key — ` +
            JSON.stringify(member),
        );
      if (!drawn.has(member.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} stacks ${JSON.stringify(member.key)}, which ` +
            "the beat does not draw. A tower one column short of what its own sentence counts is a " +
            "picture that lies — do not offer the option.",
        );
      if (member.key === option.key)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} stacks ${JSON.stringify(option.key)} onto ` +
            "itself",
        );
      if (members.has(member.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} stacks ${JSON.stringify(member.key)} twice ` +
            "— the same column cannot be added to a total once and drawn on a tower twice",
        );
      members.add(member.key);
      for (const axis of ["dx", "dy"] as const)
        if (!Number.isFinite(member[axis]))
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(member.key)} a ` +
              `non-finite ${axis} (${member[axis]}) — the column would be transformed off the frame`,
          );
    }
  }
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function stackOptionsForMarkup(
  declaration: StackDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isNone: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: stackOptionId(idPrefix, STACK_NONE_SLUG),
      slug: STACK_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: stackOptionId(idPrefix, stackSlugOf(option.key)),
      slug: stackSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the same rule `filterNotes` holds.
 *
 * A stacked view is an ARGUMENT the reader built, and an argument that is only a picture cannot be
 * checked. One sentence per option, carrying the count and the running total the beat computed,
 * revealed by the same `:checked` that moves the columns. The untouched option gets NO note, because
 * it is not a comparison: it is the claim.
 */
export function stackNotesForMarkup(
  declaration: StackDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: stackSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * THE TOWER'S OWN TOTAL, one per option, for the component to place at the tower's top.
 *
 * SAME SHAPE AS `stackNotesForMarkup` AND FOR THE SAME REASON: the words are the beat's, the reveal
 * is `:checked`, and the untouched option has none because it is not an addition. The difference is
 * WHERE the two land — the note goes under the control, in the reading order, for a reader who is
 * not looking at the plot; the total goes ON the plot, at the top of the tower it measures, because
 * a comparison a reader makes with their eye needs its answer where their eye already is.
 */
export function stackTotalsForMarkup(
  declaration: StackDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: stackSlugOf(option.key),
    text: option.total,
  }));
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss` does.
 *
 * Per option, and never more: one rule stepping every column back to the neutral, one lighting the
 * reference and its run, ONE PER MOVED COLUMN carrying its own transform (the only rule that cannot
 * be grouped, because each column goes somewhere different), one taking the moved columns' value
 * labels away, one lighting the names of the columns that went, and one revealing the sentence.
 *
 * COLOURS ARRIVE AS CUSTOM PROPERTIES, never as literals: the beat sets them once on its own figure
 * from the direction it is being rendered in, so nothing here names a colour and a direction that
 * changes its accent changes this control with it.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `${scope}:has(#id:checked) [data-col]` and
 * `${scope}:has(#id:checked) [data-col="X"]` have identical specificity — an attribute selector with
 * a value is still one attribute selector — so which wins is source order and nothing else. The
 * step-back rule is therefore emitted FIRST, deliberately, and the lit ones after it.
 */
export function stackCss(
  declaration: StackDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    lit,
    dim,
    seam,
    moveMs,
    carry,
  }: {
    scope: string;
    idPrefix: string;
    /** What the reference column and its run take: a fill for the marks, an ink for their words.
     *  `active` is what a mark under the reader's pointer becomes — see `dim.active`.
     *
     *  `fill` IS OPTIONAL, AND THE CASE IT IS OPTIONAL FOR IS A CATEGORICAL MARK. A tower of one
     *  accent standing against nine neutrals is repainted by the option, because the accent IS the
     *  thread the reader just built. A 100 %-stacked column is not: its bands encode CATEGORIES by
     *  fill and by nothing else, so an option repainting twelve of eighteen segments to one neutral
     *  would delete the encoding the whole beat rests on — `proof/webx-electricity-mix/PALETTE.md`
     *  argues exactly that, at length, about exactly these three hues. Such a beat declares NEITHER
     *  fill and the fill rules are not emitted at all, which is what keeps this file's own "no dead
     *  CSS" claim literal rather than aspirational: the alternative was thirty-eight generated rules
     *  repainting a fill to the value it already held.
     *
     *  EITHER BOTH ARE DECLARED OR NEITHER IS, and that is refused below rather than documented. A
     *  run lit with nothing stepping back — or everything stepped back with nothing lit — is a
     *  one-way repaint: the reader leaves the option and the picture does not come back. */
    lit: { fill?: string; ink: string; active?: string };
    /** What every other column steps back to — fill, ink, and the weight its name goes back to.
     *
     *  `active` IS THE HOVER COLOUR, AND IT BELONGS HERE FOR A REASON THE FIRST BUILD MISSED.
     *  `interaction.mjs` lights the mark a reader is pointing at by adding `.mark-active`, whose
     *  rule reads `--mark-active` off the mark itself. A stack repaints the marks — so a column
     *  the reader has just LIT would still have carried the stepped-back column's hover colour,
     *  and pointing at it would have flashed the wrong state. Whatever repaints a fill repaints
     *  the fill it takes under a pointer, in the same rule, or the two drift by one option. */
    dim: { fill?: string; ink: string; weight: string; active?: string };
    /** What separates one stacked column from the next on the tower — the ground. */
    seam: string;
    /** How long a column takes to reach the tower. Honoured only under `no-preference`. */
    moveMs: number;
    /**
     * THE VALUE LABELS RIDE WITH THE COLUMNS THEY BELONG TO — declared, because a beat that draws
     * no labels must not be given rules for them.
     *
     * WHY THE PLOT'S OWN EXTENTS AND NOT A LENGTH. A `[data-col]` is an SVG element and moves by
     * `translate(Npx, Npx)`, which resolves in USER UNITS. A `[data-value]` is not: this format
     * puts its value labels in `.overlay`, an HTML layer sharing the `<svg>`'s own grid cell so a
     * `%` lands on the geometry it annotates, and a CSS pixel there is a different number of user
     * units at every width. The one conversion that is exact at every size is a PERCENTAGE of that
     * layer: under `preserveAspectRatio="none"` the viewBox maps linearly onto the cell in each
     * axis independently, so `dx / width` of the overlay is `dx` user units, at 320 px and at 1600.
     *
     * The rules emitted are two custom properties and a flag — never a position — because where a
     * riding label SITS is the beat's geometry and not this file's: it is the component that knows
     * a column's figure stands above its top when the column is in its band and inside its own
     * segment when it is on a tower. `--stack-carried: 1` is what lets the beat write that as one
     * `calc()` on both states instead of a second rule per member.
     */
    carry?: { width: number; height: number };
  },
): string {
  if (!declaration) return "";
  // See `lit.fill` above: a beat repaints both states or neither. Half a repaint is a picture the
  // reader cannot get back out of, so it is refused here, where the stylesheet is written, rather
  // than found by choosing an option and looking.
  if (Boolean(lit.fill) !== Boolean(dim.fill))
    throw new Error(
      `stack: this beat declares ${lit.fill ? "a lit" : "a stepped-back"} fill and no ` +
        `${lit.fill ? "stepped-back" : "lit"} one — a one-way repaint, which no state of the page ` +
        "undoes. Declare both, or declare neither and let the marks keep their own fills.",
    );
  /**
   * EVERY SELECTOR IN A GROUP CARRIES THE SCOPE, ASSERTED AND NOT REMEMBERED.
   *
   * `A B, C` is `(A B), (C)`: a descendant prefix binds to the FIRST selector of a group and to no
   * other. The first form of this function wrote `${at} ${keys.map(…).join(", ")}`, which emitted
   * `…:has(#chart-stack-usa:checked) [data-col="USA"], [data-col="IND"], [data-col="RUS"]` — so two
   * of the ten columns were painted with the accent in EVERY state of the page, the untouched one
   * included, and the page shipped a second accent nobody had selected. Nothing in the declaration
   * was wrong and nothing in the markup was wrong; the stylesheet was. It was caught by reading the
   * emitted CSS back, which is not a thing anyone can be relied on to do twice, so it is a refusal.
   */
  const scoped = (selectors: string[], at: string) => {
    for (const selector of selectors)
      if (!selector.startsWith(`${at} `))
        throw new Error(
          `stack: the generated selector ${JSON.stringify(selector)} does not start with its own ` +
            `option scope ${JSON.stringify(at)} — every selector in a group needs it, because ` +
            "`A B, C` is `(A B), (C)` and the second half would apply in every state of the page",
        );
    return selectors.join(", ");
  };

  /** Three decimals of a `viewBox` unit is below a thousandth of a pixel at any width this format
   *  is verified at; a raw float is fifteen characters of noise in a delivered file. */
  const round = (n: number) => Number(n.toFixed(3));
  const lines: string[] = [
    `/* The stack this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, and the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-stack-note] { display: none; }`,
    `${scope} [data-stack-total] { display: none; }`,
    // The motion, and it is the only motion this control has. Under `reduce` the whole block does
    // not exist, so there is no transition to override and no branch anywhere — `render-web.mjs`'s
    // own entrance rules take the same shape for the same reason.
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-col] { transition: transform ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), fill ${Math.round(moveMs / 2)}ms ease; }`,
    // The riding label's `left`/`top` take the COLUMN's own duration and easing, not the ink's:
    // the two are interpolated over the same displacement for the same time, so the figure stays
    // glued to its segment for the whole trip instead of arriving after it.
    `  ${scope} [data-value] { transition: opacity ${Math.round(moveMs / 2)}ms ease, color ${Math.round(moveMs / 2)}ms ease${carry ? `, left ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), top ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1)` : ""}; }`,
    `  ${scope} [data-axis] { transition: color ${Math.round(moveMs / 2)}ms ease; }`,
    `}`,
  ];
  for (const option of declaration.options) {
    const slug = stackSlugOf(option.key);
    const at = `${scope}:has(#${stackOptionId(idPrefix, slug)}:checked)`;
    const lits = [option.key, ...option.onto.map((m) => m.key)];
    // EVERY SELECTOR IN A GROUP CARRIES THE SCOPE, and the first form of this did not. `A B, C`
    // is `(A B), (C)` — the descendant prefix binds to the first selector only — so the grouped
    // rules came out as `${at} [data-col="USA"], [data-col="IND"], [data-col="RUS"]` and painted
    // India and Russia with the accent ON EVERY PAGE STATE, including the untouched one. Caught by
    // reading the emitted stylesheet back, not by any assertion: the markup was right, the
    // declaration was right, and the picture was wrong in a state nobody had selected.
    const each = (attr: string, keys: string[], also = "") =>
      scoped(keys.map((k) => `${at} [${attr}="${k}"]${also}`), at);
    lines.push(
      // Everything steps back first, including the subject the plate lights by default: under a
      // chosen option the accent belongs to the comparison the READER asked for, not to the one the
      // author picked. Emitted before the lit rules and not weighted above them — identical
      // specificity, so source order is the whole of it.
      // `:not(.mark-active)` IS WHAT LETS THE POINTER WIN, and it is specificity and not politeness.
      // `.chart-figure:has(#id:checked) [data-col]` scores (1,3,0) — `:has()` takes its argument's
      // specificity, and the argument is an id. The format's own `.mark-active { fill: … }` scores
      // (0,1,0), so with both matching, a reader pointing at a column under a chosen option would
      // have seen nothing change at all. Excluding the active mark here means only one rule ever
      // matches it: a column under the pointer is painted by the POINTER, never by the option.
      // WHAT A COLUMN TAKES UNDER THE POINTER IS SET ON EVERY COLUMN, INCLUDING THE ONE THE POINTER
      // IS ON — a separate rule from the fill, and it took a browser to see why. Folding it into
      // the `:not(.mark-active)` rule below meant the property stopped being declared at the exact
      // moment it was read: the lit tower's top segment, hovered, came back #66645f, the NEUTRAL's
      // step, because the only rule still matching it was the beat's own default. The exclusion
      // belongs to `fill` alone.
      ...(dim.active ? [`${at} [data-col] { --mark-active: ${dim.active}; }`] : []),
      ...(dim.fill ? [`${at} [data-col]:not(.mark-active) { fill: ${dim.fill}; }`] : []),
      `${at} [data-value] { color: ${dim.ink}; }`,
      `${at} [data-axis] { color: ${dim.ink}; font-weight: ${dim.weight}; }`,
      ...(lit.active ? [`${each("data-col", lits)} { --mark-active: ${lit.active}; }`] : []),
      ...(lit.fill
        ? [`${each("data-col", lits, ":not(.mark-active)")} { fill: ${lit.fill}; }`]
        : []),
      `${each("data-value", [option.key])} { color: ${lit.ink}; }`,
      // The names stay under the bands the columns left. That is what tells the reader WHICH
      // countries went onto the tower, and it is the same reason a filter never moves the frame.
      //
      // COLOUR AND NOT WEIGHT, and the reason is a measurement in both directions. A plate may light
      // ONE name with an accent and a bold together — that is a single subject, picked by the author
      // — but an option lights three to seven, and doubling the accent with weight across that many
      // 11px names thickens a row that is already the tightest thing on this page at phone widths.
      // The accent is the thread; it does not need a second encoding.
      //
      // Measured while deciding it, and written down so nobody re-reads the number as a defect:
      // with those names bolded, `verify-web`'s revealed-typeface probe reported "Open Sans 700
      // really DRAWS the words it reveals" as failing at 0.3px of 956px. It is a FALSE red and the
      // face is fine — probed directly on the delivered page, "Chine" at 11px/700 sets 31.32px in
      // "Open Sans", Helvetica… and 30.56px with Open Sans taken out, and `document.fonts` holds the
      // 700 face as `loaded`. The probe concatenates every character it has seen in one
      // (stack, weight, style) into a single bag, and over a bag the size of ten country names the
      // per-character differences between Open Sans Bold and Helvetica Bold cancel to 0.06px. The
      // rule below is the design's own answer; it is not a way around the probe.
      `${each("data-axis", lits)} { color: ${lit.ink}; }`,
      // THE MOVED COLUMNS' OWN NUMBERS GO WITH THEM, and the line this replaces did the opposite.
      //
      // It read `{ opacity: 0 }`, on the argument that a value printed over a tower is a comb and
      // that the count and the sum belong to the sentence under the control. Looked at, that is
      // five columns stacked and not one of them carrying a figure, under five empty bands that
      // still carry their names — the reader is asked to believe an addition whose terms have been
      // taken off the picture. A figure that rides its own column is not a comb: it is the same
      // label, still attached to the same mark, which is exactly what every other state of this
      // page already promises. What a segment too short for it does instead is the BEAT's rule and
      // not this file's, because only the beat knows how tall its own segments are.
      carry
        ? `${each("data-value", option.onto.map((m) => m.key))} { --stack-carried: 1; }`
        : // A beat that declares no `carry` has no label layer to move, so its moved marks' figures
          // would otherwise stay behind on the baseline. Taking them away is the honest fallback —
          // it is what this file did for every beat before the carry existed.
          `${each("data-value", option.onto.map((m) => m.key))} { opacity: 0; }`,
      `${at} [data-stack-note="${slug}"] { display: revert; }`,
      `${at} [data-stack-total="${slug}"] { display: revert; }`,
    );
    // The seam, grouped: a tower of one accent is one shape, and a reader asked to count six
    // countries on it needs to see six. Ground between them, non-scaling, so it is the same rule at
    // 320 px and at 1600 px.
    //
    // TWO AND NOT ONE, and the difference is a picture. An SVG stroke is centred on the edge, so
    // `stroke-width: 1` puts half a pixel on each side of a shared boundary and the whole gap
    // between two stacked columns comes to ONE pixel — which is a hairline, and read as a stripe
    // rather than as a join between two countries. Two makes the gap two, which is what separates
    // the six members of this beat's tallest tower at every width it was looked at.
    lines.push(
      `${each("data-col", option.onto.map((m) => m.key))} { stroke: ${seam}; stroke-width: 2; }`,
    );
    // THE ONE RULE THAT CANNOT BE GROUPED: each column goes somewhere different.
    //
    // AND IT MOVES THE MARK ONLY, NEVER THE FRAME. The first form of this carried each column's own
    // HIT POINT with it, on the reasoning that a reading should follow the mark a reader can see.
    // Driven in a real browser it produced the one thing this format calls the worst answer an
    // interactive chart can give: `initChart` resolves a pointer to the nearest mark BY X, off the
    // `cx` attributes read once at init, which a CSS transform does not change — so hovering
    // anywhere on a six-column tower answered "États-Unis" (the tower's band belongs to the first
    // follower) while the box anchored on whichever mark had moved there. The bands, the names under
    // them and the region each answers for are the FRAME, and a filter does not move the frame
    // either. Only the columns move.
    for (const member of option.onto) {
      lines.push(
        `${at} [data-col="${member.key}"] { transform: translate(${round(member.dx)}px, ${round(member.dy)}px); }`,
      );
      // THE SAME DISPLACEMENT, IN THE ONLY UNIT THE LABEL LAYER CAN HONOUR AT EVERY WIDTH — see
      // `carry` above. One member, one rule, for the reason the line above it cannot be grouped.
      if (carry)
        lines.push(
          `${at} [data-value="${member.key}"] { --stack-dx: ${round((member.dx / carry.width) * 100)}%; --stack-dy: ${round((member.dy / carry.height) * 100)}%; }`,
        );
    }
  }
  return lines.join("\n");
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a stack.
 *
 * A DELIBERATE COPY, not an import, and the cost is stated rather than hidden. `render-web.mjs`
 * carries the same segmented treatment for `.chart-filter` and emits it only for a beat that
 * declared a FILTER, which this beat has not and must not (nothing leaves its picture). Reaching
 * that block would mean either shipping a filter this beat does not want or teaching the format's
 * stylesheet a second class it cannot see the declaration for. The two blocks are held together by
 * the eye, and the thing that would actually hurt if they drifted — a reader unable to operate the
 * control — is held by neither: it is held by `verify-web.mjs` driving a real keyboard.
 *
 * The native radios underneath are what the reader actually operates. The pills are layered ON TOP
 * (`opacity: 0`, never `display: none`) and the whole treatment is behind `@supports selector(:has(*))`,
 * so an engine that cannot draw a checked pill gets the plain radios rather than eight identical ones
 * — the same line `render-web.mjs` draws, and for the same reason.
 */
export function stackChromeCss({ scope }: { scope: string }): string {
  return `
${scope} .chart-stack {
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
${scope} .chart-stack legend { float: left; font-weight: 600; padding: 0; color: var(--ink); }
${scope} .chart-stack .options { display: inline-flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
${scope} .chart-stack label { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
${scope} .chart-stack input { cursor: pointer; margin: 0; }

/* THE SENTENCE THE CONTROL OWES THE READER. Its row is reserved whether or not an option is chosen,
   so choosing one never moves the plot underneath it. role="status" is on the container rather than
   on each note: the notes come and go by display, and a live region that itself comes and goes
   announces nothing. */
${scope} .stack-notes {
  flex: 0 0 auto;
  margin: 4px 0 0;
  min-height: 1.5em;
  font-size: var(--source-size);
  color: var(--muted);
}
${scope} .stack-notes p { margin: 0; }

@supports selector(:has(*)) {
  ${scope} .chart-stack .options {
    gap: 0;
    padding: 2px;
    border: 1px solid var(--grid);
    border-radius: 999px;
  }
  /* 10px of side padding and not the 12px the filter's own pills take: nine options is more than a
     filter ever carries, and at 375px those two pixels a pill are a whole wrapped row of the
     figure's vertical budget — which on this beat's tallest direction is the difference between the
     source line being on screen and being under the fold. The 5px top and bottom stay: they are what
     keeps the pill a 24px touch target. */
  ${scope} .chart-stack label {
    gap: 0;
    padding: 5px 10px;
    border-radius: 999px;
    line-height: 1.2;
    white-space: nowrap;
    transition: background-color 120ms ease, color 120ms ease;
  }
  ${scope} .chart-stack label input {
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
  ${scope} .chart-stack label:hover { color: var(--ink); }
  /* ink-on-ground, never the accent: the accent is what the argument is drawn in on this page, and a
     control that borrowed it would make the one colour that means something also mean "you clicked
     here". */
  ${scope} .chart-stack label:has(input:checked) { background: var(--ink); color: var(--ground); }
  ${scope} .chart-stack label:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
}
`.trim();
}
