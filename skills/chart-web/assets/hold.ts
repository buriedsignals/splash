// twin/skills/chart-web/assets/hold.ts
//
// THE THIRD THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS STILL THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. This file says
// what may be HELD STILL in it — a dimension the reader freezes so the other one becomes readable on
// its own. Radio inputs plus CSS generated at build time, `:checked` and `:has()` on the enclosing
// figure, no listener, no state, no bytes of JavaScript, for the reason those two files give: that
// is the only kind of control this format can promise still works with the script absent.
//
// WHY IT IS A THIRD FILE AND NOT A THIRD OPTION IN `stack.ts`, AND THE ANSWER IS ONE OPERATION.
// A `StackedColumn` is a per-member DISPLACEMENT — `translate(dx, dy)` — and everything `stack.ts`
// can express follows from it: a column slides onto a tower, a band rotates onto a baseline. No
// displacement has ever changed how WIDE a thing is. This file's whole reason to exist is the chart
// type whose second dimension IS the width:
//
//   A MOSAIC'S CELL IS A PRODUCT, AND AN EYE CANNOT FACTOR A PRODUCT. A marimekko encodes a group's
//   size as a column's WIDTH and that group's internal split as a segment's HEIGHT, so one tile's
//   AREA is the joint quantity. A reader looking at a tile cannot tell whether it is large because
//   its column is wide or because its share is tall — the two factors have already multiplied. The
//   only way to give one of them back is to hold the other still and look again.
//
// So the unit here is not a displacement but a PER-COLUMN AFFINE RE-SCALE:
// `translate(tx, ty) scale(sx, sy)`, in the geometry's own units, one declared transform per drawn
// column per option. Equalising six widths is `sx = W / w`; putting six columns on one absolute
// scale is `sy = total / max` with `ty` holding their common floor. Neither is expressible as a
// `dx`, which is why folding this into `stack.ts` would have meant giving a type whose entire
// argument is "a member goes somewhere" a pair of fields about how big it gets there.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     hold: {
//       label: "Tenir immobile",              // the <legend> — the beat's own words
//       noneLabel: "La mosaïque",             // the untouched option's words. Always first, always
//                                             // the default, and it IS the picture the page ships in.
//       options: [
//         {
//           key: "parts",                     // what is being held still, in one word
//           label: "À largeurs égales",       // the pill's words
//           announce: "À largeurs égales — …",// what a screen reader hears. Must contain `label`.
//           note: "la part polonaise vaut …", // the sentence revealed under the control
//           figure: {                         // what is printed ON the plate, where the eye is
//             text: "2,5× la part allemande",
//             col: "POL", lx: 717.2, ly: 173.6,
//           },
//           columns: [                        // EVERY drawn column, and where it goes
//             { key: "FRA", tx: 0, ty: 0, sx: 0.4858, sy: 1 },
//             …
//           ],
//         },
//         …
//       ],
//     }
//
// EVERY DRAWN COLUMN IS NAMED IN EVERY OPTION, AND THAT IS REFUSED RATHER THAN DOCUMENTED. A
// re-scale that forgets a column leaves one column in the old layout and the rest in the new one:
// the widths no longer sum to the frame, two columns overlap, and the reader is shown a mosaic whose
// second dimension has silently stopped meaning anything. `stack.ts` can afford a partial set — a
// tower is a named run and the rest of the plate is the frame it is measured against — and this file
// cannot, because here there IS no frame left standing: the whole row of columns is the picture.
//
// THE UNITS ARE THE GEOMETRY'S OWN, never CSS pixels, for the reason `stack.ts` records at length: a
// `chart-web` `<svg>` carries `preserveAspectRatio="none"`, so a `viewBox` unit is a different number
// of reader pixels at every width, and `transform` on an SVG element resolves in user units. The
// generated rule is therefore correct at 320 px and at 1600 px without anything re-measuring it.
//
// AND `transform-origin` IS SET EXPLICITLY, WHICH A DISPLACEMENT NEVER HAD TO CARE ABOUT. For an SVG
// element the initial `transform-box` is `view-box` and the initial `transform-origin` is `50% 50%`
// — the centre of the viewBox, not the origin of it. A `translate` is unaffected by where the origin
// sits; a `scale` is entirely decided by it. Left alone, every column here would have scaled about
// the middle of the frame and landed somewhere no declaration describes.
//
// WHY IT EMITS `chart-stack-…` IDS AND `data-stack-note`, WHICH IS NOT A COPY-PASTE SLIP.
// `interaction-plan.ts` discovers the controls a page ships BY READING THE MARKUP, never the
// declaration — deliberately, because a state an author types is a state an author can type wrongly.
// Its "moving or measuring control" branch looks for the radio id prefix `chart-stack-` and for the
// sentence carried on `data-stack-note`. Those two strings are the format's DISCOVERY CONTRACT for a
// control that moves the picture and owes the reader a sentence, and this vocabulary is a third
// member of exactly that family. A third grammar inventing its own spellings would have been
// invisible to the guard written to refuse it — which is the precise failure `filter.ts`'s own header
// records: two spellings of one vocabulary made the check vacuous on four of the corpus's five
// filtered pages, and a mutation tagging every element with every option passed it.
//
// WHAT IS SILENCED WHILE A DIMENSION IS HELD, AND WHY THE BEAT NAMES IT RATHER THAN THIS FILE.
// `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` attributes read ONCE at
// initialisation; a CSS transform never changes them. A column that has travelled four hundred units
// therefore answers with its neighbour's name, which is the worst answer an interactive chart can
// give. The format's own rule is older than this file — A MARK THAT MOVES IS NOT THE ONE THAT
// ANSWERS — so a beat hands over the selectors of its answering layer as `quiet`, and under a held
// state that layer stops taking the pointer and leaves the tab order. The selectors are the beat's
// because they are the FORMAT's class names, and nothing in a vocabulary may know them.

/** One column under one option: where it goes and how big it gets, in the geometry's own units. */
export type HeldColumn = {
  key: string;
  /** Translation applied BEFORE the scale, i.e. `translate(tx, ty) scale(sx, sy)`. */
  tx: number;
  ty: number;
  /** Horizontal and vertical scale. Strictly positive: a zero collapses the column to a line and a
   *  negative one mirrors it, and neither is a state of a mosaic. */
  sx: number;
  sy: number;
};

/** The figure an option prints ON the plate, at the mark the comparison is made on. */
export type HeldFigure = {
  /** The beat's own formatted string. This file never formats a number. */
  text: string;
  /** The column it rides with, so it takes that column's own transform. */
  col: string;
  /** Where it sits in the UNTRANSFORMED geometry — the option's transform does the rest. */
  lx: number;
  ly: number;
};

/** One option: what is held still, the words for it, and where every column goes. */
export type HoldOption = {
  /** What is being held, in one word. The slug and the generated selectors come from it. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It
   *  must CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG
   *  2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /**
   * THE SENTENCE REVEALED UNDER THE CONTROL, and it is required for the reason `stack.ts` requires
   * one: a reader who is not looking at the plot — or not looking at all — must still be told what
   * holding this dimension made true. It is also the ONLY channel `interaction-plan.ts` can measure
   * this control on: a transform is not a reading and nothing there can see one.
   */
  note: string;
  /**
   * THE FIGURE PRINTED ON THE PLATE, and it is required for the reason `stack.ts` requires a total.
   * The sentence is for the reader who is not looking at the picture; this is for the one who is,
   * and it goes where their eye already is — on the mark the comparison is made on. A held state
   * with no figure on it is a picture of a rearrangement, not of a measurement.
   */
  figure: HeldFigure;
  /** Every drawn column, and where it goes. Partial sets are refused — see the header. */
  columns: HeldColumn[];
};

/** What a beat declares when it wants a hold. Absent/`null` means it wants none. */
export type HoldDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. Always first, always the default, and it is the plate. */
  noneLabel: string;
  options: HoldOption[];
};

/** One column as the beat actually DRAWS it, which every transform is checked against. */
export type DrawnColumn = { key: string; x: number; w: number };

/** The reserved id of the untouched option. No declared option may slug to it. */
export const HOLD_NONE_SLUG = "none";

/**
 * A CSS-id-safe slug, derived from the option's KEY and never from its label — the same derivation
 * `stack.ts` makes and for the same reason: an option already has an identity, and deriving a second
 * one from the words is how `Central & Northern Europe` once became `[data-group="…&amp;…"]`.
 *
 *  @parity */
export function holdSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched option.
 *
 *  `idPrefix` IS THE FORMAT'S `chart-stack` / `mw-stack`, not a name of this file's own — see the
 *  header: those are the strings `interaction-plan.ts` discovers a moving control by. */
export function holdOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything
 * is drawn. `drawn` is what the beat actually draws — each column's own span — because every refusal
 * in this file is about where a column LANDS, which is not derivable from a list of names.
 *
 * `minWidth` is the floor a column may not fall under in any state, in the geometry's own units. It
 * is this type's own published failure, and it is the reason this vocabulary checks geometry at all:
 * a variable-width chart whose narrowest unit falls below a few pixels has stopped encoding its
 * second dimension. The beat derives the number; this file only refuses below it.
 */
export function assertHoldDeclaration(
  declaration: HoldDeclaration,
  drawn: DrawnColumn[],
  { width, minWidth }: { width: number; minWidth: number },
): void {
  const where = "hold declaration";
  if (
    !declaration ||
    typeof declaration !== "object" ||
    Array.isArray(declaration)
  )
    throw new Error(
      `${where}: expected an object, got ${JSON.stringify(declaration)}`,
    );
  for (const field of ["label", "noneLabel"] as const)
    if (typeof declaration[field] !== "string" || !declaration[field].trim())
      throw new Error(
        `${where}: \`${field}\` must be the beat's own words — a control with no ${field} renders unnamed`,
      );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two options to be a choice, got ${declaration.options?.length ?? 0}. ` +
        "A beat that does not need a hold declares none.",
    );
  if (!Array.isArray(drawn) || drawn.length === 0)
    throw new Error(
      `${where}: the beat drew no column for the options to act on`,
    );
  const spans = new Map<string, DrawnColumn>();
  for (const column of drawn) {
    if (!column || typeof column.key !== "string" || !column.key)
      throw new Error(
        `${where}: a drawn column has no key — ${JSON.stringify(column)}`,
      );
    if (spans.has(column.key))
      throw new Error(
        `${where}: the beat draws ${JSON.stringify(column.key)} twice`,
      );
    if (!(column.w > 0) || !Number.isFinite(column.x))
      throw new Error(
        `${where}: the drawn column ${JSON.stringify(column.key)} has no positive span — ` +
          JSON.stringify(column),
      );
    spans.set(column.key, column);
  }

  const seen = new Map<string, string>();
  for (const option of declaration.options) {
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(
        `${where}: every option needs a label — got ${JSON.stringify(option)}`,
      );
    const slug = holdSlugOf(option.key ?? "");
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (slug === HOLD_NONE_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${HOLD_NONE_SLUG}", the reserved ` +
          "id of the untouched option — rename it",
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug ` +
          `to ${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.label);

    for (const field of ["announce", "note"] as const)
      if (typeof option[field] !== "string" || !option[field].trim())
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} has no \`${field}\` — a control whose ` +
            "answer is only a picture leaves a keyboard reader with nothing",
        );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ${JSON.stringify(option.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain " +
          "the visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot " +
          "reach this option",
      );
    if (typeof option.figure?.text !== "string" || !option.figure.text.trim())
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`figure\` — a held state with no ` +
          "number on the plate is a picture of a rearrangement, and the reader looking at it is " +
          "left to estimate the one quantity the option exists to give",
      );
    if (!spans.has(option.figure.col))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} prints its figure on ` +
          `${JSON.stringify(option.figure.col)}, which the beat does not draw`,
      );
    for (const axis of ["lx", "ly"] as const)
      if (!Number.isFinite(option.figure[axis]))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives its figure a non-finite ${axis} ` +
            `(${option.figure[axis]})`,
        );

    if (!Array.isArray(option.columns))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} declares no columns`,
      );
    const placed = new Map<string, HeldColumn>();
    for (const column of option.columns) {
      if (!column || typeof column.key !== "string")
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a column with no key — ` +
            JSON.stringify(column),
        );
      if (!spans.has(column.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} places ${JSON.stringify(column.key)}, ` +
            "which the beat does not draw",
        );
      if (placed.has(column.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} places ${JSON.stringify(column.key)} ` +
            "twice — one column cannot be sent to two places",
        );
      for (const axis of ["tx", "ty"] as const)
        if (!Number.isFinite(column[axis]))
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(column.key)} a ` +
              `non-finite ${axis} (${column[axis]}) — the column would be transformed off the frame`,
          );
      for (const axis of ["sx", "sy"] as const)
        if (!Number.isFinite(column[axis]) || column[axis] <= 0)
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(column.key)} a ` +
              `${axis} of ${column[axis]} — a zero collapses the column to a line and a negative one ` +
              "mirrors it, and neither is a state of this picture",
          );
      placed.set(column.key, column);
    }
    // EVERY DRAWN COLUMN, AND THE WHOLE REASON IS IN THE HEADER: a partial set leaves one column in
    // the old layout and the rest in the new one, and the widths stop summing to the frame.
    const missing = [...spans.keys()].filter((key) => !placed.has(key));
    if (missing.length)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} places ${placed.size} of ${spans.size} ` +
          `drawn columns and says nothing about ${missing.map((k) => JSON.stringify(k)).join(", ")}. ` +
          "A column left behind in the old layout while the others move is a mosaic whose widths no " +
          "longer add up — do not offer the option.",
      );

    // WHERE EVERY COLUMN LANDS, CHECKED, because this vocabulary's whole subject is the width axis.
    const landed = [...placed.values()]
      .map((column) => {
        const span = spans.get(column.key)!;
        const left = column.tx + span.x * column.sx;
        return { key: column.key, left, right: left + span.w * column.sx };
      })
      .sort((a, b) => a.left - b.left);
    for (const box of landed) {
      if (box.right - box.left < minWidth)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} lands ${JSON.stringify(box.key)} at ` +
            `${(box.right - box.left).toFixed(2)} units wide, under this beat's floor of ${minWidth}. ` +
            "A variable-width chart whose narrowest column falls under what a reader can see has " +
            "stopped encoding its second dimension.",
        );
      if (box.left < -0.01 || box.right > width + 0.01)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} lands ${JSON.stringify(box.key)} at ` +
            `[${box.left.toFixed(2)}, ${box.right.toFixed(2)}] in a frame of ${width} units — ` +
            "half a column outside the plate is not half a picture, it is a wrong one",
        );
    }
    for (let i = 1; i < landed.length; i++)
      if (landed[i].left < landed[i - 1].right - 0.01)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} overlaps ` +
            `${JSON.stringify(landed[i - 1].key)} and ${JSON.stringify(landed[i].key)} ` +
            `([${landed[i - 1].left.toFixed(2)}, ${landed[i - 1].right.toFixed(2)}] against ` +
            `[${landed[i].left.toFixed(2)}, ${landed[i].right.toFixed(2)}]) — two columns on the ` +
            "same pixels encode nothing",
        );

    // AN OPTION THAT MOVES NOTHING IS THE DEFAULT UNDER A SECOND NAME, and it is refused here for
    // the same reason `assertFilterDeclaration` refuses an option that keeps every mark. The
    // mechanical guard one layer up cannot see this one: it measures the SENTENCE, and a sentence
    // can be new while the picture it describes never moved.
    const identity = [...placed.values()].every(
      (c) =>
        Math.abs(c.tx) < 1e-9 &&
        Math.abs(c.ty) < 1e-9 &&
        Math.abs(c.sx - 1) < 1e-9 &&
        Math.abs(c.sy - 1) < 1e-9,
    );
    if (identity)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} leaves every column exactly where the ` +
          "plate already draws it — that is the untouched view under a second name",
      );
  }
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function holdOptionsForMarkup(
  declaration: HoldDeclaration | null | undefined,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isNone: boolean;
}[] {
  if (!declaration) return [];
  return [
    {
      id: holdOptionId(idPrefix, HOLD_NONE_SLUG),
      slug: HOLD_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: holdOptionId(idPrefix, holdSlugOf(option.key)),
      slug: holdSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the same rule `filterNotes` and
 * `stackNotesForMarkup` hold. One sentence per option, revealed by the same `:checked` that re-scales
 * the columns. The untouched option gets none, because it is not a comparison: it is the claim.
 */
export function holdNotesForMarkup(
  declaration: HoldDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: holdSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * THE FIGURE ON THE PLATE, one per option, for the component to place on the mark it measures.
 *
 * Same shape as `holdNotesForMarkup` and for the same reason; the difference is WHERE the two land.
 * The note goes under the control, in the reading order, for a reader who is not looking at the
 * plot; the figure goes on the plot, because a comparison a reader makes with their eye needs its
 * answer where their eye already is.
 */
export function holdFiguresForMarkup(
  declaration: HoldDeclaration | null | undefined,
): { slug: string; text: string; col: string; lx: number; ly: number }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: holdSlugOf(option.key),
    text: option.figure.text,
    col: option.figure.col,
    lx: option.figure.lx,
    ly: option.figure.ly,
  }));
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss` and `stackCss` do.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED, the same as `stack.ts`: `${scope}:has(#id:checked) [x]`
 * and `${scope}:has(#id:checked) [x="K"]` have identical specificity, so which wins is source order
 * and nothing else. Every rule here is per-key, so nothing depends on that — but the scope assertion
 * below is kept, because `A B, C` is `(A B), (C)` and a grouped selector that lost its scope once
 * painted two of ten columns with an accent in every state of a page.
 */
export function holdCss(
  declaration: HoldDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    frame,
    moveMs,
    quiet,
  }: {
    scope: string;
    idPrefix: string;
    /** The geometry's own extents, for converting a transform into the percentage the HTML label
     *  layer can honour. Under `preserveAspectRatio="none"` the viewBox maps linearly onto the
     *  layer's cell in each axis independently, so `tx / width` is exact at every reader width. */
    frame: { width: number; height: number };
    /** How long a column takes to reach its held shape. Honoured only under `no-preference`. */
    moveMs: number;
    /**
     * THE ANSWERING LAYER, SILENCED WHILE A DIMENSION IS HELD — the beat's own selectors, because
     * they are the FORMAT's class names and nothing in a vocabulary may know them. See the header:
     * `interaction.mjs` resolves a pointer off `cx`/`cy` read once at init, a transform never
     * changes them, and a mark that has travelled answers with its neighbour's name. `display: none`
     * and not `visibility`, so the marks leave the tab order too rather than answering a keyboard
     * with a reading that is no longer true of anything on screen.
     */
    quiet: string[];
  },
): string {
  if (!declaration) return "";
  const scoped = (selectors: string[], at: string) => {
    for (const selector of selectors)
      if (!selector.startsWith(`${at} `))
        throw new Error(
          `hold: the generated selector ${JSON.stringify(selector)} does not start with its own ` +
            `option scope ${JSON.stringify(at)} — every selector in a group needs it, because ` +
            "`A B, C` is `(A B), (C)` and the second half would apply in every state of the page",
        );
    return selectors.join(", ");
  };
  /** Three decimals of a `viewBox` unit is below a thousandth of a pixel at any width this format is
   *  verified at; a raw float is fifteen characters of noise in a delivered file. */
  const round = (n: number) => Number(n.toFixed(3));

  const lines: string[] = [
    `/* The hold this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with and stack.ts moves with, and the reason this control needs no script. */`,
    // See the header: an SVG element's initial `transform-box` is `view-box` and its initial
    // `transform-origin` is `50% 50%`. A translate does not care; a scale is entirely decided by it.
    `${scope} [data-col] { transform-box: view-box; transform-origin: 0 0; }`,
    // The default transform of the HTML label layer, so a beat writes ONE calc() for four states
    // instead of a rule per label per option.
    `${scope} [data-col-label] { --fx-tx: 0; --fx-ty: 0; --fx-sx: 1; --fx-sy: 1; }`,
    `${scope} [data-stack-note] { visibility: hidden; }`,
    `${scope} [data-stack-total] { display: none; }`,
    // The motion, and it is the only motion this control has. Under `reduce` the whole block does
    // not exist, so there is no transition to override and no branch anywhere.
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-col] { transition: transform ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    // The label layer is interpolated over the same displacement for the same time, so a figure
    // stays glued to its tile for the whole trip instead of arriving after it.
    `  ${scope} [data-col-label] { transition: left ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), top ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), width ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), height ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  ];

  for (const option of declaration.options) {
    const slug = holdSlugOf(option.key);
    const at = `${scope}:has(#${holdOptionId(idPrefix, slug)}:checked)`;
    for (const column of option.columns) {
      const transform = `translate(${round(column.tx)}px, ${round(column.ty)}px) scale(${round(column.sx)}, ${round(column.sy)})`;
      lines.push(
        `${at} [data-col="${column.key}"] { transform: ${transform}; }`,
      );
      // THE SAME TRANSFORM, IN THE ONLY UNITS THE HTML LABEL LAYER CAN HONOUR AT EVERY WIDTH. The
      // scales are pure numbers and carry across untouched; the translations become percentages of
      // the layer's own box, which is exact because the viewBox maps linearly onto it.
      lines.push(
        `${at} [data-col-label="${column.key}"] { ` +
          `--fx-tx: ${round((column.tx / frame.width) * 100)}; ` +
          `--fx-ty: ${round((column.ty / frame.height) * 100)}; ` +
          `--fx-sx: ${round(column.sx)}; --fx-sy: ${round(column.sy)}; }`,
      );
    }
    lines.push(
      `${at} [data-stack-note="${slug}"] { visibility: visible; }`,
      `${at} [data-stack-total="${slug}"] { display: revert; }`,
    );
    if (quiet.length)
      lines.push(
        `${scoped(
          quiet.map((selector) => `${at} ${selector}`),
          at,
        )} { display: none; pointer-events: none; }`,
      );
  }
  return lines.join("\n");
}
