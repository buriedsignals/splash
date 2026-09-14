// twin/skills/chart-web/assets/level.ts
//
// THE THIRD THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. This file says
// what the picture may be MEASURED AGAINST. All three are radio inputs plus CSS generated at build
// time — `:checked` and `:has()` on the enclosing figure, no listener, no state, no bytes of
// JavaScript — because that is the only kind of control this format can promise works with the
// script absent, and "the reader without a script still gets the complete plate" is not a claim the
// format is willing to soften.
//
// WHY A THIRD FILE. A filter's vocabulary is a NAMED SET OF KEYS and everything it does is
// derivable from that set. A stack's is a set plus an arrangement, and it exists to draw an
// ADDITION: `stack.ts` makes `total` mandatory, on the argument that "a tower that does not say
// what it adds up to is a picture of a stack, not of an addition". Neither shape fits a yardstick.
// A level adds nothing and moves nothing: it lays a REFERENCE ACROSS THE WHOLE PLOT at one datum's
// own value, so every other datum can be read against it. Folding that into `stack.ts` would mean
// making its one required field optional, which is the field that file was corrected to require.
//
// WHERE IT COMES FROM. `proof/web-grouped-bar-wind-vs-solar`, whose static sibling POINTS: it draws
// a callout with a leader line onto the one country where solar beats wind and hands the reader the
// answer. A grouped bar's own device — the drawn group boundary — makes the within-group comparison
// easy and the across-group comparison hard, because each series' six columns are separated by the
// other series'. So the still can assert "this one is the exception" and has no way to draw WHICH
// HALF OF THE PAIR makes it one. The web beat deletes the callout and gives the reader the
// yardstick instead: choose a country, and its own two levels lie flat across the other five.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     levels: {
//       label: "Mesurer les six à l'aune de",   // the <legend> — the beat's own words
//       noneLabel: "Chaque pays pour lui-même", // the untouched option. Always first, always the
//                                               // default, and it IS the picture the page ships in.
//       options: [
//         {
//           key: "CHE",                         // the datum whose levels are laid across the plot
//           label: "Suisse",                    // the pill's words
//           announce: "Suisse — éolien 0,2 %…", // what a screen reader hears. Must contain `label`.
//           note: "Suisse · éolien 0,2 %, …",   // the sentence revealed under the control
//           marks: [
//             { series: "wind",  y: 337.4 },    // where the rule is drawn, in geometry units
//             { series: "solar", y: 258.2 },
//           ],
//         },
//         …
//       ],
//     }
//
// `y` IS IN THE GEOMETRY'S OWN UNITS, never in CSS pixels, for the reason `stack.ts` states about
// `dx`/`dy`: a `chart-web` `<svg>` carries `preserveAspectRatio="none"`, so a `viewBox` unit is a
// different number of reader pixels at every width, and a reference drawn at a reader-pixel height
// would slide off its own datum the moment the page is resized.
//
// AND EVERY OPTION'S RULES ARE DRAWN, ONCE, AT THEIR OWN HEIGHT — the stylesheet only reveals them.
// Nothing here emits a `transform`. That is deliberate and it is a defect this format has already
// paid for once: `interaction.mjs` resolves the mark under a pointer BY X, off the `cx` attributes
// read at init, which a CSS transform never changes, so a moved mark answers as the mark whose slot
// it landed in (`stack.ts`, "the defect that driving found"). A control that needs no transform does
// not get to re-open that hole.
//
// WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE. `assertLevelDeclaration` is handed
// what the beat actually DRAWS, the same way `assertFilterDeclaration` and `assertStackDeclaration`
// are, because every refusal here is the same sentence: a yardstick the plate cannot honour is a
// yardstick whose sentence claims more than the reader can see.

/**
 * One reference laid across the plot: which series it belongs to, and where it sits in the
 * geometry's own units.
 *
 * ONE COORDINATE, AND THE KEY THAT CARRIES IT NAMES THE AXIS THE RULE CROSSES. `y` is a reference
 * laid FLAT across the plot, which is what every type in this catalogue that spends its x on
 * category needs and the only thing this vocabulary could draw when it was written. `x` is the same
 * reference stood UP, and it exists because a scatter is the one type here where BOTH axes carry a
 * measured value (`chart-beat/references/types/scatter.md`, first paragraph). On that shape a
 * chosen case's own values are TWO references, one per axis — and a vocabulary that can only lay
 * them flat answers half of them while looking like it answered all of it, which is word for word
 * the half-answer `assertLevelDeclaration` already refuses when an option lays a rule on one of two
 * series.
 *
 * `angle` is the same reference laid AROUND the plot rather than across it, and it exists because a
 * RADIAL geometry has neither of the other two. On a donut a horizontal band at one `y` names TWO
 * wedges, mirrored about the vertical axis, and a vertical band at one `x` names two more — so
 * declaring either here would be word for word the half-answer `assertLevelDeclaration` already
 * refuses when an option lays a rule on one of two series. An angle names exactly one place on the
 * dial. It is in the geometry's own radians, measured from the form's fixed 12 o'clock anchor, and
 * it is bounded against a `turn` the beat passes the same way it passes `width` for an `x` — a full
 * ring declares `2 * Math.PI`, a half-ring declares `Math.PI`, and a reference outside that sweep is
 * a reference the reader cannot see, offered as though they could.
 *
 * EXACTLY ONE OF THE THREE IS DECLARED, and which key is PRESENT is the declaration. A mark carrying
 * more than one is refused rather than resolved by precedence: a reference crosses the plot in ONE
 * direction, and a silent precedence is how one of the values a reader asked for disappears without
 * anything going red.
 */
export type LevelMark =
  | { series: string; y: number; x?: undefined; angle?: undefined }
  | { series: string; x: number; y?: undefined; angle?: undefined }
  | { series: string; angle: number; x?: undefined; y?: undefined };

/** One option: the datum whose levels are laid across the plot, and the words for it. */
export type LevelOption = {
  /** The datum the levels are read off. It keeps its own inks and takes the ring. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture.
   *  It must CONTAIN `label`: an accessible name that does not contain the visible one is the
   *  WCAG 2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /**
   * THE SENTENCE REVEALED UNDER THE CONTROL, AND IT IS REQUIRED.
   *
   * The rules are the answer for a reader looking at the picture; they are read against the axis
   * the plate already draws. This is the answer for the reader who is not — and it is also where
   * the DERIVED readings live, the ones a rule cannot draw at all: a rank among the drawn data, a
   * ratio between two series, a multiple against the next datum. `filterNotes` and
   * `stackNotesForMarkup` hold the same position for the same reason.
   */
  note: string;
  /** Where this option's references are drawn. One per series the beat draws — see
   *  `assertLevelDeclaration`, which refuses a half-answered yardstick. */
  marks: LevelMark[];
};

/** What a beat declares when it wants a yardstick. Absent/`null` means it wants none. */
export type LevelDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. It is always first, always the default, and it is the plate. */
  noneLabel: string;
  options: LevelOption[];
};

/** The reserved id of the untouched option. No declared option may slug to it. */
export const LEVEL_NONE_SLUG = "none";

/**
 * A CSS-id-safe slug, derived from the option's KEY and never from its label — the same choice
 * `stackSlugOf` makes, and for the same reason: the key is already this option's identity (it is
 * the string `data-col` carries and the string the generated selector quotes), so slugging from the
 * words would be a second derivation of one identity.
 *
 *  @parity */
export function levelSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched option. One function, three readers. */
export function levelOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** The attribute value one drawn reference carries, and the one the generated selector quotes.
 *  One function, because the last time two halves of one identity were derived separately a whole
 *  map emptied with nothing red (`filter.ts`'s own header). */
export function levelRuleKey(slug: string, series: string): string {
  return `${slug}:${series}`;
}

/**
 * Refuses every declaration that would render a yardstick the picture cannot honour, before
 * anything is drawn.
 *
 * @param drawnKeys    the data the beat actually draws — every option's key is checked against it,
 *                     so a reader cannot choose a reference that is not on the plate.
 * @param drawnSeries  the series the beat actually draws. EVERY OPTION MUST NAME THEM ALL, and that
 *                     is this vocabulary's own refusal rather than a borrowed one: the question a
 *                     yardstick answers is "where does this datum sit on each of the things being
 *                     compared", and an option that lays one rule on a two-series plate answers
 *                     half of it while looking like it answered all of it.
 * @param height       the geometry's own height. A flat rule outside it is a reference the reader
 *                     cannot see, offered as though they could.
 * @param width        the geometry's own width, and the same refusal one axis over. Required only
 *                     once an option declares an `x` mark, so a beat that lays every reference flat
 *                     declares exactly what it always did.
 * @param turn         the geometry's own full sweep in radians, and the same refusal on a radial
 *                     plot. Required only once an option declares an `angle` mark — a closed ring
 *                     passes `2 * Math.PI` — so a beat drawn on axes declares exactly what it
 *                     always did.
 */
export function assertLevelDeclaration(
  declaration: LevelDeclaration,
  {
    drawnKeys,
    drawnSeries,
    height,
    width,
    turn,
  }: {
    drawnKeys: string[];
    drawnSeries: string[];
    height: number;
    width?: number;
    turn?: number;
  },
): void {
  const where = "level declaration";
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
  if (!Number.isFinite(height) || height <= 0)
    throw new Error(
      `${where}: the geometry's height must be a positive number, got ${JSON.stringify(height)}`,
    );
  if (!Array.isArray(drawnSeries) || drawnSeries.length === 0)
    throw new Error(
      `${where}: the beat draws no series, so there is nothing for a level to be read on — ` +
        `\`drawnSeries\` is what every option's marks are checked against`,
    );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two options to be a choice, got ${declaration.options?.length ?? 0}. ` +
        "A beat that does not need a yardstick declares none.",
    );

  const drawn = new Set(drawnKeys);
  if (drawn.size !== drawnKeys.length)
    throw new Error(
      `${where}: the drawn keys are not unique — ${JSON.stringify(drawnKeys)}`,
    );
  const series = new Set(drawnSeries);

  const seen = new Map<string, string>();
  for (const option of declaration.options) {
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(
        `${where}: every option needs a label — got ${JSON.stringify(option)}`,
      );
    if (!drawn.has(option.key))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} reads its levels off ` +
          `${JSON.stringify(option.key)}, which the beat does not draw — the reader would measure ` +
          "everything against a datum that is not on the plate",
      );
    const slug = levelSlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (slug === LEVEL_NONE_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${LEVEL_NONE_SLUG}", the reserved ` +
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
            "answer is only a picture leaves a keyboard reader with nothing, and leaves the derived " +
            "reading (the rank, the ratio) nowhere at all",
        );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ${JSON.stringify(option.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain " +
          "the visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot " +
          "reach this option",
      );

    if (!Array.isArray(option.marks) || option.marks.length === 0)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} lays no reference across the plot — an ` +
          "option that draws nothing is the default under a second name",
      );
    const named = new Set<string>();
    for (const mark of option.marks) {
      if (!mark || typeof mark.series !== "string")
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a mark with no series — ` +
            JSON.stringify(mark),
        );
      if (!series.has(mark.series))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} lays a rule on the series ` +
            `${JSON.stringify(mark.series)}, which the beat does not draw ` +
            `(${[...series].join(", ")}) — a reference in a colour that means nothing on this plate`,
        );
      if (named.has(mark.series))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} lays two rules on ` +
            `${JSON.stringify(mark.series)} — one datum has one value on one series, and two rules ` +
            "in one ink is a picture the reader cannot resolve",
        );
      named.add(mark.series);
      // WHICH KEY IS PRESENT IS THE AXIS, and a mark that declares none or more than one is refused
      // rather than resolved — see `LevelMark`.
      const hasY = "y" in mark && mark.y !== undefined;
      const hasX = "x" in mark && mark.x !== undefined;
      const hasAngle = "angle" in mark && (mark as any).angle !== undefined;
      const declared = [hasX && "x", hasY && "y", hasAngle && "angle"].filter(
        Boolean,
      ) as string[];
      if (declared.length > 1)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(mark.series)} ` +
            `${declared.length} coordinates at once (${declared.join(", ")}) — a reference crosses ` +
            "the plot in ONE direction, and a silent precedence would drop the others without " +
            "anything going red",
        );
      if (declared.length === 0)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(mark.series)} ` +
            "neither an x, a y nor an angle — a reference with no coordinate is not drawn anywhere",
        );
      if (hasAngle) {
        // A RADIAL PLOT'S OWN SWEEP, and it is the beat's to state: a full ring turns 2π, a
        // half-ring turns π, and a reference past the end of that sweep is off the dial.
        if (!Number.isFinite(turn) || (turn as number) <= 0)
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} lays its ${JSON.stringify(mark.series)} ` +
              "reference AROUND the plot, so the geometry's full sweep in radians is what it is " +
              `checked against — got ${JSON.stringify(turn)}. A beat drawn on axes needs no turn; ` +
              "one that declares an angle mark does",
          );
        const angle = (mark as any).angle as number;
        if (!Number.isFinite(angle))
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(mark.series)} a ` +
              `non-finite angle (${angle}) — the reference would be drawn nowhere on the dial`,
          );
        if (angle < 0 || angle > (turn as number))
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} lays its ${JSON.stringify(mark.series)} ` +
              `reference at ${angle} rad, outside the plot's own 0…${turn} — a reference the reader ` +
              "cannot see, offered as though they could",
          );
      } else if (hasY) {
        if (!Number.isFinite(mark.y))
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(mark.series)} a ` +
              `non-finite y (${mark.y}) — the rule would be drawn off the frame`,
          );
        if ((mark.y as number) < 0 || (mark.y as number) > height)
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} draws its ${JSON.stringify(mark.series)} ` +
              `rule at y=${mark.y}, outside the plot's own 0…${height} — a reference the reader cannot ` +
              "see, offered as though they could",
          );
      } else {
        if (!Number.isFinite(width) || (width as number) <= 0)
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} stands its ${JSON.stringify(mark.series)} ` +
              `reference UP the plot, so the geometry's width is what it is checked against — got ` +
              `${JSON.stringify(width)}. A beat that lays every reference flat needs no width; one ` +
              "that declares an x mark does",
          );
        if (!Number.isFinite(mark.x))
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(mark.series)} a ` +
              `non-finite x (${mark.x}) — the rule would be drawn off the frame`,
          );
        if ((mark.x as number) < 0 || (mark.x as number) > (width as number))
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} draws its ${JSON.stringify(mark.series)} ` +
              `rule at x=${mark.x}, outside the plot's own 0…${width} — a reference the reader cannot ` +
              "see, offered as though they could",
          );
      }
    }
    for (const name of series)
      if (!named.has(name))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} lays no rule on ${JSON.stringify(name)}, ` +
            `which the beat draws. A yardstick that reports one of ${series.size} series answers ` +
            "half the question while looking like it answered all of it — give it every series or " +
            "do not offer the option.",
        );
  }
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function levelOptionsForMarkup(
  declaration: LevelDeclaration | null | undefined,
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
      id: levelOptionId(idPrefix, LEVEL_NONE_SLUG),
      slug: LEVEL_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: levelOptionId(idPrefix, levelSlugOf(option.key)),
      slug: levelSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the same rule `filterNotes` and
 * `stackNotesForMarkup` hold. The untouched option gets NO note, because it is not a comparison:
 * it is the claim the title states.
 */
export function levelNotesForMarkup(
  declaration: LevelDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: levelSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * EVERY REFERENCE THE BEAT HAS TO DRAW, flattened — one per option per series, each carrying the
 * attribute value the generated selector quotes and the y it sits at.
 *
 * The component draws them ALL, once, hidden; the stylesheet reveals the chosen option's. That is
 * why nothing in this file emits a transform, and why a reader with no script gets the same control
 * a reader with one does.
 */
export function levelRulesForMarkup(
  declaration: LevelDeclaration | null | undefined,
): {
  key: string;
  slug: string;
  series: string;
  y?: number;
  x?: number;
  angle?: number;
}[] {
  if (!declaration) return [];
  return declaration.options.flatMap((option) => {
    const slug = levelSlugOf(option.key);
    return option.marks.map((mark) => ({
      key: levelRuleKey(slug, mark.series),
      slug,
      series: mark.series,
      // The coordinate the option declared, and only that one — a rule the beat draws flat, one it
      // stands up and one it lays around a dial are told apart by which of these is defined,
      // exactly as the declaration told them apart.
      ...("y" in mark && mark.y !== undefined
        ? { y: mark.y }
        : "x" in mark && mark.x !== undefined
          ? { x: mark.x }
          : { angle: (mark as any).angle as number }),
    }));
  });
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss` and `stackCss` do.
 *
 * Per option, and never more: one rule stepping every name back, one lighting the chosen datum's
 * name, one ringing its marks, one per reference revealed, and one revealing the sentence.
 *
 * COLOURS ARRIVE AS CUSTOM PROPERTIES, never as literals: the beat sets them once on its own figure
 * from the direction it is being rendered in, so nothing here names a colour and a direction that
 * changes its ink changes this control with it.
 *
 * THE RING AND NOT A RECOLOUR, and that is doctrine rather than taste on this shape.
 * `the-subject-is-ringed-not-recoloured` says recolouring "spends a channel that is already carrying
 * something" — and on any plate that needs a level, colour is already carrying the series. A
 * yardstick that repainted the chosen datum would break the one association a grouped bar's reader
 * is asked to learn once and reuse: first bar in every group, always this colour.
 */
export function levelCss(
  declaration: LevelDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    lit,
    dim,
    revealMs,
  }: {
    scope: string;
    idPrefix: string;
    /** What the chosen datum takes: an ink and a weight for its name, and the ring its marks get.
     *  `ringWidth` is in reader pixels and is drawn `non-scaling-stroke` by the beat, so a ring is
     *  the same hairline at 320 px and at 1600. */
    lit: { ink: string; weight: string; ring: string; ringWidth: number };
    /** What every other datum's name steps back to. The MARKS ARE NOT TOUCHED — see the header. */
    dim: { ink: string; weight: string };
    /** How long a reference takes to appear. Honoured only under `no-preference`. */
    revealMs: number;
  },
): string {
  if (!declaration) return "";
  /**
   * EVERY SELECTOR IN A GROUP CARRIES THE SCOPE, ASSERTED AND NOT REMEMBERED — `stack.ts` shipped
   * the defect this refusal exists for: `A B, C` is `(A B), (C)`, so a descendant prefix binds to
   * the FIRST selector of a group and to no other, and two of its ten columns were painted with the
   * accent in every state of the page including the untouched one.
   */
  const scoped = (selectors: string[], at: string) => {
    for (const selector of selectors)
      if (!selector.startsWith(`${at} `))
        throw new Error(
          `level: the generated selector ${JSON.stringify(selector)} does not start with its own ` +
            `option scope ${JSON.stringify(at)} — every selector in a group needs it, because ` +
            "`A B, C` is `(A B), (C)` and the second half would apply in every state of the page",
        );
    return selectors.join(", ");
  };

  const lines: string[] = [
    `/* The yardstick this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with and stack.ts moves with, and the reason this control needs no script. */`,
    `${scope} [data-level-note] { display: none; }`,
    `${scope} [data-level-rule] { opacity: 0; }`,
    // The only motion this control has. Under `reduce` the whole block does not exist, so there is
    // no transition to override and no branch anywhere — the shape `render-web.mjs`'s own entrance
    // rules take, for the same reason.
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-level-rule] { transition: opacity ${revealMs}ms ease; }`,
    `  ${scope} [data-axis] { transition: color ${Math.round(revealMs / 2)}ms ease; }`,
    `}`,
  ];

  for (const option of declaration.options) {
    const slug = levelSlugOf(option.key);
    const at = `${scope}:has(#${levelOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      // Everything steps back first, including the subject the plate lights by default: under a
      // chosen option the emphasis belongs to the comparison the READER asked for, not to the one
      // the author picked. Emitted before the lit rules and not weighted above them — identical
      // specificity, so source order is the whole of it.
      `${at} [data-axis] { color: ${dim.ink}; font-weight: ${dim.weight}; }`,
      `${at} [data-axis="${option.key}"] { color: ${lit.ink}; font-weight: ${lit.weight}; }`,
      // A RING, NOT A FILL. The marks keep the colour their series gave them in every state of this
      // page — see the header, and `the-subject-is-ringed-not-recoloured`.
      //
      // AND THE RING IS TAKEN OFF EVERYTHING FIRST, which the first build did not do and a real
      // pointer found in one pass: the beat rings its own default subject with a (0,2,0) rule of its
      // own, and an option that only ADDS a ring left that one standing — so choosing Allemagne drew
      // FOUR ringed bars and the reader was told two countries were the reference at once. This rule
      // is (1,1,0) and clears the beat's own by the id inside `:has()`; the lit rule below is
      // (1,2,0) and clears this one. Under a chosen option the emphasis belongs to the comparison
      // the READER asked for, not to the one the author picked.
      `${at} [data-col] { stroke: none; }`,
      `${at} [data-col="${option.key}"] { stroke: ${lit.ring}; stroke-width: ${lit.ringWidth}; }`,
      scoped(
        option.marks.map(
          (mark) =>
            `${at} [data-level-rule="${levelRuleKey(slug, mark.series)}"]`,
        ),
        at,
      ) + ` { opacity: 1; }`,
      `${at} [data-level-note="${slug}"] { display: revert; }`,
    );
  }
  return lines.join("\n");
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a yardstick.
 *
 * A DELIBERATE COPY of the segmented treatment `render-web.mjs` carries for `.chart-filter` and
 * `stack.ts` carries for `.chart-stack`, and the cost is stated rather than hidden: each of the
 * three is emitted only for a beat that declared ITS OWN control, so reaching one from another
 * would mean shipping a control the beat does not want. The three blocks are held together by the
 * eye; the thing that would actually hurt if they drifted — a reader unable to operate the control
 * — is held by `verify-web.mjs` driving a real keyboard.
 *
 * The native radios underneath are what the reader actually operates. The pills are layered ON TOP
 * (`opacity: 0`, never `display: none`) and the whole treatment is behind
 * `@supports selector(:has(*))`, so an engine that cannot draw a checked pill gets the plain radios
 * rather than seven identical ones.
 */
export function levelChromeCss({ scope }: { scope: string }): string {
  return `
${scope} .chart-level {
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
${scope} .chart-level legend { float: left; font-weight: 600; padding: 0; color: var(--ink); }
${scope} .chart-level .options { display: inline-flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
${scope} .chart-level label { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
${scope} .chart-level input { cursor: pointer; margin: 0; }

/* THE SENTENCE THE CONTROL OWES THE READER. Its row is reserved whether or not an option is chosen,
   so choosing one never moves the plot underneath it. role="status" is on the container rather than
   on each note: the notes come and go by display, and a live region that itself comes and goes
   announces nothing. */
${scope} .level-notes {
  flex: 0 0 auto;
  margin: 4px 0 0;
  min-height: 1.5em;
  font-size: var(--source-size);
  color: var(--muted);
}
${scope} .level-notes p { margin: 0; }

@supports selector(:has(*)) {
  ${scope} .chart-level .options {
    gap: 0;
    padding: 2px;
    border: 1px solid var(--grid);
    border-radius: 999px;
  }
  ${scope} .chart-level label {
    gap: 0;
    padding: 5px 10px;
    border-radius: 999px;
    line-height: 1.2;
    white-space: nowrap;
    transition: background-color 120ms ease, color 120ms ease;
  }
  ${scope} .chart-level label input {
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
  ${scope} .chart-level label:hover { color: var(--ink); }
  /* ink-on-ground, never a series ink: on any plate that needs a yardstick, colour is already
     carrying the series, and a control that borrowed one would make a colour that means "wind" also
     mean "you clicked here". */
  ${scope} .chart-level label:has(input:checked) { background: var(--ink); color: var(--ground); }
  ${scope} .chart-level label:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
}
`.trim();
}
