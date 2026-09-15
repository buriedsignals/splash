// twin/skills/chart-web/assets/datum.ts
//
// THE FIFTEENTH THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what it may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT OF A SUM. `fold.ts`
// says what may be LAID OVER what is drawn. `brush.ts` says what may be SELECTED ON AN AXIS.
// `trace.ts` says what may be FOLLOWED THROUGH it. `floor.ts` says what it may STAND ON.
// `reorder.ts` says what the same numbers look like SOMEWHERE ELSE IN A CYCLE. This file says what
// the picture may be MEASURED **FROM** — which level is subtracted from every mark before anything
// is drawn, so that the zero a reader has been handed stops being a fact about the world and
// becomes what it actually is: somebody's choice. All of them are native radio inputs plus CSS
// generated at build time (`:checked` and `:has()` on the enclosing figure, no listener, no state,
// not one byte of JavaScript), because that is the only kind of control this format can promise
// still works with the script absent.
//
// WHY THIS ONE EXISTS, AND IT IS THE TYPE SHEET'S OWN FAILURE MODE RATHER THAN A DECORATION.
//
// `chart-beat/references/types/diverging-bar.md` states the one thing that goes wrong: *"the domain
// must genuinely straddle zero, or the chart is lying about having two directions when it only has
// one"*. Every other type in the bar family gets its zero from arithmetic — it is where the quantity
// stops existing, and nobody chose it. A diverging bar's zero is EDITORIAL. Net job change against
// WHICH year. Vote swing against WHICH election. Temperature anomaly against WHICH baseline — the
// one case where the choice is so consequential that the WMO legislates it. Change the reference and
// the same file produces a different ranking, a different pair of extremes, and a different answer
// to the only question the type exists to ask, which is *who is above*.
//
// A still can do exactly one thing about that: pick a zero, print it in the caveat, ask to be
// trusted. This file is the other answer, the one only an interactive page can give — hand the
// reader the reference and let them watch their own conclusion change sides while every number in
// the file stands still.
//
// WHY IT IS ITS OWN FILE AND NOT AN OPTION IN `level.ts`, WHICH IS THE ONE IT LOOKS LIKE.
//
// `level.ts` is the near miss and the distinction is exact, because that file draws it itself: *"A
// level adds nothing and moves nothing: it lays a REFERENCE ACROSS THE WHOLE PLOT at one datum's own
// value, so every other datum can be read against it"* — and, further down, *"Nothing here emits a
// `transform`. That is deliberate"*, because a mark moved by CSS still answers for the `cx` it was
// born with. A DATUM is the other half of that sentence. The reference is not laid across the
// picture, it is SUBTRACTED FROM IT: there is no rule to draw anywhere, because the reference is at
// zero by construction in every state, and what changes is every mark's length and every mark's
// SIGN. A `LevelMark { series, y }` names one coordinate for one rule. This control has no rule and
// as many coordinates as there are marks.
//
// `floor.ts` is the second near miss and it fails the other way round. A floor RE-PLACES a picture:
// the bands keep their exact shapes and their exact order, and the whole argument is that nothing is
// repainted. A datum changes the values themselves — on the beat this was written for, Luxembourg is
// −20,48 under one reference and +5,18 under another, and those are two different numbers about the
// same country, not one number in two places.
//
// AND THE TRANSFORM THAT `level.ts` REFUSED TO EMIT IS SAFE HERE, FOR A STATED REASON. The hole is
// that `interaction.mjs` resolves a pointer off `cx`/`cy` read once at init, so a mark that moves
// answers for the slot it landed in. A datum moves marks, so a beat using this file MUST anchor its
// readings on a coordinate no option touches. On a diverging bar that coordinate exists and is free:
// the zero rule. Every reading sits on the rule at its own row's height, both of which are fixed in
// every state, and any pointer anywhere in a row therefore resolves to that row. `assertDatumRest`
// below is how a beat states that it has done so, and it is checked against what the beat actually
// draws rather than believed.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     datum: {
//       label: "Mesurer chaque pays depuis",       // the <legend> — the beat's own words
//       noneLabel: "son propre niveau de 1990",    // the untouched option. Always first, always the
//                                                  // default, and it IS the picture the page ships.
//       noneAnnounce: "…",                         // must contain `noneLabel`
//       noneNote: "…",                             // the sentence the DEFAULT owes, and this file
//                                                  // requires one where `floor.ts` forbids it — see
//                                                  // `datumNotesForMarkup`.
//       span: 21,                                  // ± data units the frame draws. ONE span for
//                                                  // every option; see `assertDatumDeclaration`.
//       base: [{ key: "LUX", value: -20.478 }, …], // the default picture's signed values
//       options: [
//         {
//           key: "med24",
//           label: "le niveau médian d'aujourd'hui",
//           announce: "…le niveau médian d'aujourd'hui…",   // must contain `label`
//           note: "Zéro = 5,28 t…",                         // revealed under the control
//           values: [{ key: "LUX", value: 5.177 }, …],      // EVERY drawn row, no others
//         },
//         …
//       ],
//     }
//
// VALUES ARE IN THE DATA'S OWN UNITS, never in geometry units and never in CSS pixels. This file
// owns the one conversion, from `span` and the frame's width, for the reason `stack.ts` and
// `level.ts` both give about `preserveAspectRatio="none"`: a viewBox unit is a different number of
// reader pixels at every width, so a length computed in pixels at build time is wrong at every width
// but one. Here it matters twice over, because the SIGN of the number is the reading.

import { controlChromeCss } from "./control-chrome.ts";

/** One mark's signed distance from the chosen reference, in the data's own units, and the words
 *  that distance is printed as.
 *
 *  THE LABEL IS BAKED, NEVER FORMATTED IN THE BROWSER. `directed-interaction.md`, rule 4: a derived
 *  reading is computed from the frozen file in the runner and baked into the page server-side, so
 *  there is exactly one implementation of "what is this number" for the three formats to disagree
 *  about. A control that changes a figure is the place that rule is easiest to lose. */
export type DatumValue = { key: string; value: number; label: string };

/** One reference a reader may measure the whole picture from. */
export type DatumOption = {
  /** Stable id for the radio and every generated selector. Slugged; must not slug to "none". */
  key: string;
  /** The pill's words. */
  label: string;
  /** What a screen reader hears. Must CONTAIN `label` — WCAG 2.5.3. */
  announce: string;
  /** The sentence this option owes the reader, carrying a reading the plate does not print. */
  note: string;
  /** Every drawn mark's signed distance from this reference. Exactly the drawn set. */
  values: DatumValue[];
};

export type DatumDeclaration = {
  label: string;
  noneLabel: string;
  noneAnnounce: string;
  noneNote: string;
  /** The half-extent of the axis, in data units, HELD CONSTANT for every option. */
  span: number;
  /** The default picture's signed values — the state a reader with no script never leaves. */
  base: DatumValue[];
  options: DatumOption[];
};

/** The reserved slug of the untouched option. */
export const DATUM_NONE_SLUG = "none";

/** Lowercase, hyphenated, ASCII — the same slugging every file in this family does, so a key with a
 *  space or an accent in it cannot become two different ids in the markup and the stylesheet. */
export function datumSlugOf(key: string): string {
  return String(key)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function datumOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}${slug}`;
}

/** Every state of the page in reading order — the untouched one first, because that is the state the
 *  beat renders in and the one a reader with no script never leaves. */
export function datumStates(
  declaration: DatumDeclaration | null | undefined,
): { slug: string; values: DatumValue[] }[] {
  if (!declaration) return [];
  return [
    { slug: DATUM_NONE_SLUG, values: declaration.base },
    ...declaration.options.map((option) => ({
      slug: datumSlugOf(option.key),
      values: option.values,
    })),
  ];
}

export function datumOptionsForMarkup(
  declaration: DatumDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isNone: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: datumOptionId(idPrefix, DATUM_NONE_SLUG),
      slug: DATUM_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneAnnounce,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: datumOptionId(idPrefix, datumSlugOf(option.key)),
      slug: datumSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE SENTENCE EACH STATE OWES THE READER — AND THIS FILE REQUIRES ONE FOR THE DEFAULT, WHERE
 * `filter.ts`, `stack.ts`, `level.ts` AND `floor.ts` ALL FORBID IT.
 *
 * Their reasoning is sound for them and does not transfer: in those four vocabularies the untouched
 * option is the ABSENCE of the gesture — nothing filtered, nothing stacked, no yardstick laid, no
 * band flattened — so a sentence about it would be a caption on a non-event. Here the untouched
 * option is not an absence. It is a reference somebody chose, as chosen as every other one in the
 * list, and it is the one the reader is standing in when they arrive. A control whose default state
 * declined to say what its zero was would be the exact failure this file exists to repair.
 */
export function datumNotesForMarkup(
  declaration: DatumDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return [
    { slug: DATUM_NONE_SLUG, text: declaration.noneNote },
    ...declaration.options.map((option) => ({
      slug: datumSlugOf(option.key),
      text: option.note,
    })),
  ];
}

/**
 * WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE.
 *
 * Handed what the beat actually DRAWS (`drawn`), the frame it draws in, and the smallest length the
 * narrowest verified viewport can resolve — the same discipline `assertFilterDeclaration`,
 * `assertStackDeclaration`, `assertLevelDeclaration` and `assertFloorDeclaration` hold: a control
 * that promises more than the plate can show is refused before anything is rendered.
 */
export function assertDatumDeclaration(
  declaration: DatumDeclaration,
  {
    drawn,
    width,
    unitsPerCssPx,
  }: {
    /** Every mark key the beat draws, in the order it draws them. */
    drawn: string[];
    /** The frame's full width in geometry units — `span` maps onto `width / 2`. */
    width: number;
    /** How many geometry units one CSS pixel is worth at the NARROWEST width this format is
     *  verified at. MEASURED in a real browser and carried here; it is what makes "the reader cannot
     *  tell these two options apart" arithmetic rather than a matter of taste. */
    unitsPerCssPx: number;
  },
): void {
  const where = "datum declaration";
  if (!declaration || typeof declaration !== "object")
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);
  for (const field of ["label", "noneLabel", "noneAnnounce", "noneNote"] as const)
    if (typeof declaration[field] !== "string" || !declaration[field].trim())
      throw new Error(
        `${where}: \`${field}\` must be the beat's own words — a reference with no ${field} is a ` +
          "zero the reader is asked to take on trust, which is the thing this control exists to stop",
      );
  if (!declaration.noneAnnounce.includes(declaration.noneLabel))
    throw new Error(
      `${where}: the default option announces ${JSON.stringify(declaration.noneAnnounce)}, which does ` +
        `not contain its visible label ${JSON.stringify(declaration.noneLabel)} — WCAG 2.5.3`,
    );
  if (!Array.isArray(declaration.options) || declaration.options.length < 1)
    throw new Error(
      `${where}: needs at least one option beside the default to be a choice, got ` +
        `${declaration.options?.length ?? 0}. A beat with one reference declares no datum.`,
    );
  if (!Number.isFinite(declaration.span) || declaration.span <= 0)
    throw new Error(`${where}: \`span\` must be a positive number of data units, got ${declaration.span}`);
  if (!Number.isFinite(width) || width <= 0)
    throw new Error(`${where}: the frame width must be a positive number of geometry units, got ${width}`);
  if (!Number.isFinite(unitsPerCssPx) || unitsPerCssPx <= 0)
    throw new Error(
      `${where}: \`unitsPerCssPx\` must be a measured positive number — it is the floor the ` +
        "indistinguishable-option refusal below is made with, and a floor nobody measured is no floor",
    );

  const drawnSet = new Set(drawn);
  if (drawnSet.size !== drawn.length)
    throw new Error(`${where}: the drawn marks are not unique — ${JSON.stringify(drawn)}`);

  // THE VALUES OF EVERY STATE, CHECKED AGAINST THE MARKS THE BEAT ACTUALLY DRAWS. A diverging bar
  // with a row silently missing is a ranking that is wrong and does not know it — the beat's own
  // words about its source data, held here for every state the control can put the page into.
  const states = [
    { name: JSON.stringify(declaration.noneLabel), slug: DATUM_NONE_SLUG, values: declaration.base },
    ...declaration.options.map((option) => ({
      name: JSON.stringify(option?.label ?? "(unnamed)"),
      slug: datumSlugOf(option?.key ?? ""),
      values: option?.values,
    })),
  ];

  const seen = new Map<string, string>();
  for (const option of declaration.options) {
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(`${where}: every option needs a label — got ${JSON.stringify(option)}`);
    const slug = datumSlugOf(option.key);
    if (!slug)
      throw new Error(`${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`);
    if (slug === DATUM_NONE_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${DATUM_NONE_SLUG}", the reserved id ` +
          "of the untouched option — rename it",
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
          `${where}: option ${JSON.stringify(option.label)} has no \`${field}\` — a reference whose ` +
            "answer is only a picture leaves a keyboard reader with nothing",
        );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ${JSON.stringify(option.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain " +
          "the visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot " +
          "reach this option",
      );
  }

  const byState = new Map<string, Map<string, number>>();
  for (const state of states) {
    if (!Array.isArray(state.values))
      throw new Error(`${where}: option ${state.name} carries no values`);
    const mine = new Map<string, number>();
    for (const entry of state.values) {
      if (!entry || typeof entry.key !== "string" || !Number.isFinite(entry.value))
        throw new Error(
          `${where}: option ${state.name} carries a mark with no key or no value — ${JSON.stringify(entry)}`,
        );
      if (typeof entry.label !== "string" || !entry.label.trim())
        throw new Error(
          `${where}: option ${state.name} gives ${JSON.stringify(entry.key)} the value ${entry.value} ` +
            "and no words to print it as. A bar whose figure is missing under one reference is a bar " +
            "still wearing the figure the previous reference gave it.",
        );
      if (!drawnSet.has(entry.key))
        throw new Error(
          `${where}: option ${state.name} values ${JSON.stringify(entry.key)}, which the beat does not ` +
            "draw — the reader would be shown a reference computed for a mark that is not on the plate",
        );
      if (mine.has(entry.key))
        throw new Error(
          `${where}: option ${state.name} values ${JSON.stringify(entry.key)} twice — one mark cannot ` +
            "have two distances from one reference",
        );
      mine.set(entry.key, entry.value);
    }
    for (const key of drawn)
      if (!mine.has(key))
        throw new Error(
          `${where}: option ${state.name} has no value for ${JSON.stringify(key)}. A bar this option ` +
            "cannot place does not disappear — it keeps the length the previous reference gave it, " +
            "which is a bar measured from a zero that is no longer on the page.",
        );

    // A MARK PAST THE EDGE IS HALF A READING WITH A LABEL ON IT. `span` is one number for every
    // state on purpose (see `datumCss`), so this is also what refuses an option whose spread the
    // declared frame was never sized for.
    for (const [key, value] of mine)
      if (Math.abs(value) > declaration.span + 1e-9)
        throw new Error(
          `${where}: option ${state.name} puts ${JSON.stringify(key)} at ${value.toFixed(3)}, past the ` +
            `±${declaration.span} this frame draws — the bar would run out of the picture and the ` +
            "reader would read a length that stops at the edge as the value",
        );

    // THE TYPE'S OWN FAILURE MODE, MADE MECHANICAL, AND IT IS THE REFUSAL THIS FILE EXISTS FOR.
    // `chart-beat/references/types/diverging-bar.md`: "the domain must genuinely straddle zero, or
    // the chart is lying about having two directions when it only has one", and, for the case where
    // every value shares a sign, "this is a plain bar chart drawn awkwardly for no reason: a domain
    // that never crosses zero has nothing to diverge from". No other vocabulary in this family can
    // make this refusal, because no other one knows that the SIGN of a mark is the reading.
    let above = 0;
    let below = 0;
    for (const value of mine.values()) {
      if (value > 0) above += 1;
      if (value < 0) below += 1;
    }
    if (above === 0 || below === 0)
      throw new Error(
        `${where}: option ${state.name} puts ${above || below} of ${mine.size} marks on one side of ` +
          `zero and none on the other (${above} above, ${below} below). A domain that never crosses ` +
          "zero has nothing to diverge from, so this reference draws a plain bar chart around a " +
          "baseline nothing crosses. Do not offer it.",
      );
    byState.set(state.slug, mine);
  }

  // TWO PILLS, ONE PICTURE. `directed-interaction.md` refuses a control whose resulting state equals
  // the default; on this control the refusal is arithmetic and it is wider than that rule, because
  // two OPTIONS that draw the same picture are the same defect as an option that draws the default.
  // The floor is the smallest length the narrowest verified viewport can resolve, measured rather
  // than typed: under it, the reader operates the control and every bar on the page stays where it
  // was.
  const perUnit = width / 2 / declaration.span;
  const slugs = [...byState.keys()];
  for (let i = 0; i < slugs.length; i += 1)
    for (let j = i + 1; j < slugs.length; j += 1) {
      const a = byState.get(slugs[i])!;
      const b = byState.get(slugs[j])!;
      let worst = 0;
      for (const key of drawn) worst = Math.max(worst, Math.abs(a.get(key)! - b.get(key)!));
      const units = worst * perUnit;
      if (units < unitsPerCssPx)
        throw new Error(
          `${where}: ${states.find((s) => s.slug === slugs[i])!.name} and ` +
            `${states.find((s) => s.slug === slugs[j])!.name} nowhere differ by more than ` +
            `${units.toFixed(3)} geometry units (${worst.toFixed(4)} data units), under the ` +
            `${unitsPerCssPx.toFixed(3)} one CSS pixel is worth at the narrowest verified width. ` +
            "The reader would operate the control and watch the picture not move.",
        );
    }

  // AND THE QUESTION THE CONTROL ASKS, HELD TO AN ANSWER. This control's question is *who is above*.
  // An option under which every mark keeps the side the default put it on has rescaled the picture
  // without answering it — it is the plate again, in a different unit, and the reader learns that
  // their conclusion is robust to a change that was never offered to them as a change.
  const base = byState.get(DATUM_NONE_SLUG)!;
  for (const option of declaration.options) {
    const mine = byState.get(datumSlugOf(option.key))!;
    const crossed = drawn.filter((key) => Math.sign(base.get(key)!) !== Math.sign(mine.get(key)!));
    if (crossed.length === 0)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} leaves all ${drawn.length} marks on the side ` +
          "the default put them on. The question this control asks is which marks are above the " +
          "reference; an option that moves none of them across it answers with the plate again.",
      );
  }
}

/**
 * THE SECOND HALF OF THE COUTURE, AND IT IS THE ONE `level.ts` EARNED BY DECLINING TO EMIT A
 * TRANSFORM AT ALL.
 *
 * This file DOES move marks, so the beat using it must anchor its readings on coordinates no option
 * touches, or `interaction.mjs` — which reads `cx`/`cy` once at init — will answer a pointer with
 * whichever reading's slot the pointer landed in. That is not a near miss; it is a confident wrong
 * answer, and `stack.ts` and `floor.ts` both record paying for it.
 *
 * Handed the `cx` of every reading the beat is about to draw, this refuses a beat whose readings are
 * spread along the axis the datum moves. One x for all of them is the only arrangement that keeps
 * `nearestCell` honest under a transform: with every `cx` equal, the x term is the same for every
 * candidate and the resolution reduces to the row, which no option moves.
 */
export function assertDatumRest(cxs: number[], { where = "datum readings" }: { where?: string } = {}): void {
  if (!Array.isArray(cxs) || cxs.length === 0)
    throw new Error(`${where}: a beat that moves its marks must still ship readings to point at`);
  const first = cxs[0];
  for (const cx of cxs) {
    if (!Number.isFinite(cx))
      throw new Error(`${where}: a reading with no x — ${JSON.stringify(cx)}`);
    if (Math.abs(cx - first) > 1e-9)
      throw new Error(
        `${where}: the readings sit at different x (${first} and ${cx}). This control moves every ` +
          "mark, and `interaction.mjs` resolves a pointer off the `cx` it read at init — so a " +
          "reading placed on a mark that moves answers for the place that mark used to occupy. " +
          "Anchor every reading on the zero rule, which no option moves.",
      );
  }
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `${scope} [data-datum-num]` and
 * `${scope} [data-datum-num="none"]` score identically, so which wins is source order and nothing
 * else; the blanket is emitted FIRST and the default after it, and the same pair is emitted again
 * inside each option's `:has()` scope, blanket first. A sankey on this branch rendered green with
 * zero ribbons lit for getting exactly this backwards.
 *
 * AND NOT ONE RULE HERE SETS `fill` OR `left` INSIDE AN OPTION'S SCOPE. An option's rules set CUSTOM
 * PROPERTIES and `transform` only, because `${scope}:has(#id:checked) [data-datum-bar="X"]` weighs
 * (1,3,0) and would silently beat the format's own `.mark-active { fill: … }` at (0,1,0) — the
 * reader would point at a bar and nothing would answer. The paint is done once, at low specificity,
 * off those properties; the beat raises `.mark-active` above it the way `proof/web-treemap-europe-capacity`
 * does, with `rect.mark-active[data-datum-bar]`.
 */
export function datumCss(
  declaration: DatumDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    width,
    minUnits,
    labelOffsetPx,
    labelUnitsOf,
    moveMs,
    paint,
  }: {
    scope: string;
    idPrefix: string;
    /** The frame's full width in geometry units. `span` maps onto `width / 2` each way. */
    width: number;
    /** The shortest bar drawn for a NON-ZERO value, in geometry units. A value of exactly zero is
     *  drawn as nothing, because it is nothing: that mark IS the reference. */
    minUnits: number;
    /** How far a value label sits outside its bar's growing end, in CSS pixels. */
    labelOffsetPx: number;
    /** How much room a value label needs, in GEOMETRY UNITS, measured at the NARROWEST width this
     *  format is verified at. A label that does not fit outside its tip is drawn INSIDE the bar
     *  instead, on the ground chip `.end-label` already carries — the de-collision this format asks
     *  for, retaken as a threshold rather than decided once at one width. The narrowest width is the
     *  worst case for a label in a fixed CSS size over a plot that stretches, so a label that fits
     *  there fits everywhere. */
    labelUnitsOf: (label: string) => number;
    /** How long a bar takes to reach its new length. Honoured only under `no-preference` — the whole
     *  transition lives inside the query rather than being overridden back, so under `reduce` there
     *  is no transition to resolve at all. */
    moveMs: number;
    /** What a mark is painted with, and what it becomes under a pointer, given the sign the chosen
     *  reference gives it. The beat owns both colours and measures both; this file never names one. */
    paint: (sign: -1 | 0 | 1) => { bar: string; active: string };
  },
): string {
  if (!declaration) return "";
  const round = (n: number) => Number(n.toFixed(3));
  const centre = width / 2;
  const perUnit = centre / declaration.span;
  const lines: string[] = [
    `/* The datum this beat declared: ${declaration.options.length + 1} references over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, and the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-datum-note] { display: none; }`,
    // The bars. `transform-box`/`transform-origin` are stated rather than inherited: the initial
    // origin of an SVG transform is the centre of the reference box in some engines and the view-box
    // origin in others, and a scaleX about the wrong origin puts every bar somewhere else.
    `${scope} [data-datum-bar] { transform-box: view-box; transform-origin: 0 0; fill: var(--bar); }`,
    // The value labels. Their `left` and `transform` are GENERATED rather than written inline on the
    // element, for the reason `floor.ts` gives about its carried words: an inline `left` wins against
    // every rule below it, so a label placed inline would sit still while its own bar travelled out
    // from under it.
    `${scope} [data-datum-num] { display: none; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-datum-bar] { transition: transform ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), fill ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `  ${scope} [data-datum-value] { transition: left ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${moveMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  ];

  const place = (at: string, slug: string, values: DatumValue[]) => {
    for (const { key, value, label } of values) {
      const sign = (value > 0 ? 1 : value < 0 ? -1 : 0) as -1 | 0 | 1;
      const { bar, active } = paint(sign);
      const raw = value * perUnit;
      const drawnUnits = sign === 0 ? 0 : Math.sign(raw) * Math.max(Math.abs(raw), minUnits);
      lines.push(
        `${at} [data-datum-bar="${key}"] { --bar: ${bar}; --mark-active: ${active}; ` +
          `transform: translateX(${round(centre)}px) scaleX(${round(drawnUnits)}); }`,
      );
      // The label rides its own bar's growing tip, which is the ONE movement of text this control
      // allows itself and the one the type sheet asks for by name ("value labels sit just outside
      // each bar's growing end"). Both states are the same list of transform functions, so the side
      // flip interpolates instead of cutting.
      //
      // AND IT TURNS INWARD RATHER THAN OFF THE FRAME. A bar at the edge of the span has no room
      // outside its own tip: on the beat this file was written for, Luxembourg's −20,48 of a ±21
      // frame put "−20,5" over the country names in the gutter, read in the first capture. A label
      // that does not fit outside is anchored on the INSIDE of its tip, on the ground chip
      // `.end-label` already carries, so it is cased against its own bar rather than measured
      // against it. The threshold is `labelUnitsOf`, taken at the narrowest verified width.
      const tip = centre + raw;
      const room = labelUnitsOf(label);
      const outward = sign >= 0 ? tip + room <= width : tip - room >= 0;
      const rightward = sign >= 0 ? outward : !outward;
      lines.push(
        `${at} [data-datum-value="${key}"] { left: ${round((tip / width) * 100)}%; transform: ` +
          (rightward
            ? `translate(0, -50%) translateX(${round(labelOffsetPx)}px); }`
            : `translate(-100%, -50%) translateX(${round(-labelOffsetPx)}px); }`),
      );
    }
    lines.push(`${at} [data-datum-num] { display: none; }`);
    lines.push(`${at} [data-datum-num="${slug}"] { display: inline; }`);
    lines.push(`${at} [data-datum-note] { display: none; }`);
    lines.push(`${at} [data-datum-note="${slug}"] { display: revert; }`);
  };

  place(scope, DATUM_NONE_SLUG, declaration.base);
  for (const option of declaration.options) {
    const slug = datumSlugOf(option.key);
    place(`${scope}:has(#${datumOptionId(idPrefix, slug)}:checked)`, slug, option.values);
  }
  return lines.join("\n");
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a datum.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function datumChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "datum",
    margin: "6px 0 0",
    notes: { margin: "2px 0 0", reserve: "3em" },
    extra: `/* The value labels' own layer. It shares the plot's grid cell with the svg and with .overlay, and
   pointer-events:none is load-bearing for the same reason it is on .overlay: a plain div over the
   whole plot intercepts every pointer event before it reaches the hit area beneath it. */
${scope} .chart-plot .datum-values { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }`,
  });
}
