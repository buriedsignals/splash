// twin/skills/chart-web/assets/cutoff.ts
//
// THE FOURTH THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what the picture may be MEASURED AGAINST. This file says **where the claim's own line is drawn**,
// and which REGION of the plate that line selects. All four are radio inputs plus CSS generated at
// build time — `:checked` and `:has()` on the enclosing figure, no listener, no state, no bytes of
// JavaScript — because that is the only kind of control this format can promise works with the
// script absent.
//
// WHY A FOURTH FILE, and the three refusals that made it one.
//
//   - A FILTER cannot do it. `filter.ts`'s own header names the case — "a threshold → keys:
//     rows.filter(r => r.value >= 5e6)" — and a filter's whole mechanism is that the marks outside
//     the set LEAVE. A cutoff removes nothing: every datum stays drawn, in the ink it always had,
//     and what moves is the outline around the part of the plate the line selects. On a type whose
//     one channel IS the filtered variable — a heatmap, a calendar heatmap, a choropleth — filtering
//     on it deletes the bottom of the chart's own ramp, and `directed-interaction.md` reaches for a
//     filter only when the part is ORTHOGONAL to the encoded variable.
//   - A LEVEL cannot do it. `level.ts`'s primitive is a reference drawn AT A COORDINATE — `y`, `x`
//     or `angle` — and it refuses a mark that declares none. A calendar grid, a treemap, a cartogram
//     and a hexgrid all carry a quantity with no axis to draw it on: there is no y at which "20 °C"
//     lives. Declaring one would mean typing a geometry that does not exist, which is the shape of
//     the defect every assertion in these four files exists to catch.
//   - A BRUSH cannot do it. `brush.ts` chooses a span OF AN AXIS the plate already draws. The scale
//     a cutoff moves along is the encoded quantity, which on these types is drawn nowhere except in
//     the key.
//
// WHERE IT COMES FROM. `proof/web-calendar-heatmap-geneva`, whose static sibling asserts "31
// consecutive days at or above 20 °C". That headline is a reading off the data AND a line drawn by
// its author; move the line and the number moves with it (78 days at 16 °C, 31 at 20, 4 at 24). A
// still has one plate and must pick one line. What the reader finds by sweeping it is a fact in
// NEITHER picture on its own: the run's end date does not move — every threshold from 19 to 22 °C
// ends the run on 17 August while its start slides three weeks — so the headline is fragile at one
// end and anchored at the other. That is only visible in the DIFFERENCE between the states, which is
// what a control is for.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     cutoff: {
//       label: "Le seuil",              // the <legend> — the beat's own words
//       claim: {                        // the line the TITLE was written at. Always first, always
//         label: "20 °C",               // checked, and the picture the page ships in. No note:
//         announce: "Seuil 20 °C — …",  // it is not a comparison, it is the claim.
//         spans: [{ x, y, width, height }],
//       },
//       options: [
//         {
//           key: "22",                  // the option's identity, and its slug
//           label: "22 °C",
//           announce: "Seuil 22 °C — …",// what a screen reader hears. Must contain `label`.
//           note: "Seuil 22 °C · …",    // the sentence revealed under the control
//           spans: [{ x, y, width, height }],
//         },
//       ],
//     }
//
// SPANS ARE IN THE GEOMETRY'S OWN UNITS, never in CSS pixels, for the reason `level.ts` and
// `stack.ts` both state: a `chart-web` `<svg>` carries `preserveAspectRatio="none"`, so a `viewBox`
// unit is a different number of reader pixels at every width, and a region drawn at a reader-pixel
// size would slide off the cells it names the moment the page is resized.
//
// AND EVERY OPTION'S REGION IS DRAWN, ONCE, WHERE IT BELONGS — the stylesheet only reveals it.
// Nothing here emits a `transform`. That is the same deliberate choice `level.ts` makes and the same
// defect it refuses to re-open: `interaction.mjs` resolves the mark under a pointer off attributes
// read at init, which a CSS transform never changes, so a moved mark answers as the mark whose slot
// it landed in.
//
// THIS VOCABULARY'S OWN REFUSAL, the one none of the other three had. TWO OPTIONS WHOSE REGIONS ARE
// IDENTICAL ARE ONE THRESHOLD UNDER TWO NAMES. A reader who moves the line and watches the outline
// stay exactly where it was has been told the claim is insensitive to the line when in fact the
// control is. It is the same reader-facing lie `assertFilterDeclaration` refuses as "the unfiltered
// view under a second name", one axis over, and it is checked against what the beat actually DRAWS
// rather than against what it meant to draw.

import { controlChromeCss } from "./control-chrome.ts";

/** One rectangle of the plate an option selects, in the geometry's own units. */
export type CutoffSpan = { x: number; y: number; width: number; height: number };

/** The line the beat's own title was written at. Always first, always checked, and it IS the plate,
 *  which is why — alone among the options — it owes the reader no sentence. */
export type CutoffClaim = {
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name. Must CONTAIN `label` (WCAG 2.5.3 "label in name"). */
  announce: string;
  /** Where the claim's own region is drawn. */
  spans: CutoffSpan[];
};

/** One line the reader can move to, and the words for it. */
export type CutoffOption = {
  /** The option's identity. It is what the slug, the attribute and the selector are all derived
   *  from — one derivation, because the last time two halves of one identity were derived
   *  separately a whole map emptied with nothing red (`filter.ts`'s own header). */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name. Must CONTAIN `label`. */
  announce: string;
  /**
   * THE SENTENCE REVEALED UNDER THE CONTROL, AND IT IS REQUIRED.
   *
   * The region is the answer for a reader looking at the picture. This is the answer for the reader
   * who is not — and it is where this control's DERIVED readings live, the ones an outline cannot
   * draw at all: how long the selected run is, where it starts and ends, how much of the whole the
   * line lets through. `filterNotes`, `stackNotesForMarkup` and `levelNotesForMarkup` hold the same
   * position for the same reason.
   */
  note: string;
  /** Where this option's region is drawn. */
  spans: CutoffSpan[];
};

/** What a beat declares when it wants a cutoff. Absent/`null` means it wants none. */
export type CutoffDeclaration = {
  /** The `<legend>` — what the reader is moving, in the beat's own words. */
  label: string;
  claim: CutoffClaim;
  options: CutoffOption[];
};

/** The reserved id of the claim's own option. No declared option may slug to it. */
export const CUTOFF_CLAIM_SLUG = "claim";

/** A CSS-id-safe slug, derived from the option's KEY and never from its label — the same choice
 *  `levelSlugOf` and `stackSlugOf` make, for the same reason: the key is already the option's
 *  identity, so slugging from the words would be a second derivation of one thing.
 *
 *  @parity */
export function cutoffSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for a slug. One function, three readers: the markup, the selector, the guard. */
export function cutoffOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** A region's identity as one string, so the attribute a component writes and the selector the
 *  stylesheet quotes cannot be derived two ways. */
export function cutoffSpanKey(slug: string, index: number): string {
  return `${slug}:${index}`;
}

/** Two regions compared as the reader sees them: same rectangles, in any order, to the tenth of a
 *  geometry unit. Sub-tenth differences are not a picture anyone can tell apart. */
function regionSignature(spans: CutoffSpan[]): string {
  return spans
    .map((s) =>
      [s.x, s.y, s.width, s.height]
        .map((v) => Math.round(v * 10) / 10)
        .join(","),
    )
    .sort()
    .join("|");
}

/**
 * Refuses every declaration that would render a control that lies, before anything is drawn.
 *
 * @param width   the geometry's own width. A region outside it is a selection the reader cannot
 *                see, offered as though they could.
 * @param height  the geometry's own height, and the same refusal one axis over.
 */
export function assertCutoffDeclaration(
  declaration: CutoffDeclaration,
  { width, height }: { width: number; height: number },
): void {
  const where = "cutoff declaration";
  if (
    !declaration ||
    typeof declaration !== "object" ||
    Array.isArray(declaration)
  )
    throw new Error(
      `${where}: expected an object, got ${JSON.stringify(declaration)}`,
    );
  if (typeof declaration.label !== "string" || !declaration.label.trim())
    throw new Error(
      `${where}: \`label\` must be the beat's own words — a control with no label renders unnamed`,
    );
  for (const [name, value] of [
    ["width", width],
    ["height", height],
  ] as const)
    if (!Number.isFinite(value) || value <= 0)
      throw new Error(
        `${where}: the geometry's ${name} must be a positive number, got ${JSON.stringify(value)}`,
      );
  if (!Array.isArray(declaration.options) || declaration.options.length < 1)
    throw new Error(
      `${where}: the claim's own line plus at least one other is what makes this a choice, got ` +
        `${declaration.options?.length ?? 0} other line(s). A beat that does not need a cutoff ` +
        `declares none.`,
    );

  /** Every option's region is checked the same way, the claim's included: the claim is the one the
   *  page ships in, so a claim drawn off the frame is the default state being wrong. */
  const checkSpans = (label: string, spans: unknown) => {
    if (!Array.isArray(spans) || spans.length === 0)
      throw new Error(
        `${where}: option ${JSON.stringify(label)} selects no region of the plate — an option that ` +
          `outlines nothing is the default under a second name`,
      );
    for (const span of spans as CutoffSpan[]) {
      for (const field of ["x", "y", "width", "height"] as const)
        if (!Number.isFinite(span?.[field]))
          throw new Error(
            `${where}: option ${JSON.stringify(label)} has a region with a non-finite ${field} ` +
              `(${JSON.stringify(span?.[field])}) — it would be drawn nowhere`,
          );
      if (span.width <= 0 || span.height <= 0)
        throw new Error(
          `${where}: option ${JSON.stringify(label)} has a region of ${span.width} x ${span.height} ` +
            `— a region with no area is an outline the reader cannot see`,
        );
      if (
        span.x < 0 ||
        span.y < 0 ||
        span.x + span.width > width ||
        span.y + span.height > height
      )
        throw new Error(
          `${where}: option ${JSON.stringify(label)} selects ${span.width} x ${span.height} at ` +
            `(${span.x}, ${span.y}), outside the plot's own 0…${width} x 0…${height} — a selection ` +
            `the reader cannot see, offered as though they could`,
        );
    }
  };

  const named = (option: CutoffClaim | CutoffOption, slug: string) => {
    for (const field of ["label", "announce"] as const)
      if (typeof option?.[field] !== "string" || !option[field].trim())
        throw new Error(
          `${where}: the option at ${JSON.stringify(slug)} has no \`${field}\` — a control whose ` +
            `answer is only a picture leaves a keyboard reader with nothing`,
        );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ` +
          `${JSON.stringify(option.announce)}, which does not contain its own visible label — an ` +
          `accessible name that does not contain the visible one is the WCAG 2.5.3 failure, and a ` +
          `reader speaking what they see cannot reach this option`,
      );
    checkSpans(option.label, option.spans);
  };

  named(declaration.claim, CUTOFF_CLAIM_SLUG);

  const seen = new Map<string, string>();
  const regions = new Map<string, string>([
    [regionSignature(declaration.claim.spans), declaration.claim.label],
  ]);
  for (const option of declaration.options) {
    if (typeof option?.key !== "string" || !option.key.trim())
      throw new Error(
        `${where}: every option needs a key — got ${JSON.stringify(option)}`,
      );
    const slug = cutoffSlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (slug === CUTOFF_CLAIM_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${CUTOFF_CLAIM_SLUG}", the ` +
          `reserved id of the claim's own line — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.key)} both slug ` +
          `to ${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.key);

    named(option, slug);
    if (typeof option.note !== "string" || !option.note.trim())
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`note\` — the region is the ` +
          `answer for a reader looking at the picture, and the sentence is where this control's ` +
          `DERIVED readings live. An option with neither answers nobody.`,
      );

    // THIS VOCABULARY'S OWN REFUSAL — see the header. A line the reader can move while the outline
    // stays put tells them the claim is insensitive to the line when it is the control that is.
    const signature = regionSignature(option.spans);
    const twin = regions.get(signature);
    if (twin !== undefined)
      throw new Error(
        `${where}: ${JSON.stringify(twin)} and ${JSON.stringify(option.label)} select exactly the ` +
          `same region of the plate — that is one threshold under two names, and a reader who ` +
          `moves the line and watches the outline stand still has been told the claim is ` +
          `insensitive to the line when it is this control that is`,
      );
    regions.set(signature, option.label);
  }
}

/**
 * The options a component draws, in reading order: the claim's own line first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function cutoffOptionsForMarkup(
  declaration: CutoffDeclaration | null | undefined,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isClaim: boolean;
}[] {
  if (!declaration) return [];
  return [
    {
      id: cutoffOptionId(idPrefix, CUTOFF_CLAIM_SLUG),
      slug: CUTOFF_CLAIM_SLUG,
      label: declaration.claim.label,
      announce: declaration.claim.announce,
      isClaim: true,
    },
    ...declaration.options.map((option) => ({
      id: cutoffOptionId(idPrefix, cutoffSlugOf(option.key)),
      slug: cutoffSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isClaim: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the same rule `filterNotes`,
 * `stackNotesForMarkup` and `levelNotesForMarkup` hold. The claim's own line gets NO note, because
 * it is not a comparison: it is the claim the title states.
 */
export function cutoffNotesForMarkup(
  declaration: CutoffDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: cutoffSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * EVERY REGION THE BEAT HAS TO DRAW, flattened — one per span per option, the claim's included,
 * each carrying the attribute value the generated selector quotes and the rectangle it sits on.
 *
 * The component draws them ALL, once, where they belong; the stylesheet reveals the chosen one's.
 * That is why nothing in this file emits a transform, and why a reader with no script gets the same
 * control a reader with one does.
 */
export function cutoffRegionsForMarkup(
  declaration: CutoffDeclaration | null | undefined,
): {
  key: string;
  slug: string;
  x: number;
  y: number;
  width: number;
  height: number;
}[] {
  if (!declaration) return [];
  const flatten = (slug: string, spans: CutoffSpan[]) =>
    spans.map((span, i) => ({ key: cutoffSpanKey(slug, i), slug, ...span }));
  return [
    ...flatten(CUTOFF_CLAIM_SLUG, declaration.claim.spans),
    ...declaration.options.flatMap((option) =>
      flatten(cutoffSlugOf(option.key), option.spans),
    ),
  ];
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss`, `stackCss` and `levelCss` do.
 *
 * EVERY RULE THAT REVEALS CARRIES AN ID INSIDE `:has()`, so every one of them weighs (1,3,0) and the
 * base rule that hides weighs (0,1,0). That is deliberate and it is a trap this branch has already
 * paid for: `:has(#id:checked) X` beats a class rule silently, and when two rules have the SAME
 * specificity the emission order is the whole mechanism — a sankey rendered green with zero ribbons
 * lit for exactly that reason. Here the two weights differ by construction, so no order can flip it.
 *
 * COLOURS ARRIVE AS CUSTOM PROPERTIES, never as literals: the beat sets them once on its own figure
 * from the direction it is being rendered in, so nothing here names a colour.
 *
 * AN OUTLINE AND NOT A RECOLOUR, and that is doctrine rather than taste on the types that need this
 * control. `the-subject-is-ringed-not-recoloured` says recolouring "spends a channel that is already
 * carrying something" — and a cutoff is reached for precisely on plates where colour is already
 * carrying the whole quantity. A control that repainted the selected cells would destroy the only
 * reading the chart has.
 */
export function cutoffCss(
  declaration: CutoffDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    revealMs,
  }: { scope: string; idPrefix: string; revealMs: number },
): string {
  if (!declaration) return "";
  const lines: string[] = [
    `/* The cutoff this beat declared: the claim's own line plus ${declaration.options.length} others,`,
    `   over ${JSON.stringify(declaration.label)}. Radios plus :checked/:has(), generated once at`,
    `   build time — the same mechanism filter.ts narrows with, stack.ts moves with and level.ts`,
    `   measures with, and the reason this control needs no script. */`,
    `${scope} [data-cutoff-note] { display: none; }`,
    // Hidden, never removed: `visibility` keeps the region in the layout it was drawn in, so
    // revealing one can never reflow the geometry underneath it.
    `${scope} [data-cutoff-region] { visibility: hidden; }`,
    // The state the page ships in, and the one a reader with no script never leaves.
    `${scope} [data-cutoff-region^="${CUTOFF_CLAIM_SLUG}:"] { visibility: visible; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-cutoff-region] { transition: opacity ${revealMs}ms ease; }`,
    `}`,
  ];

  for (const option of [null, ...declaration.options]) {
    const slug = option === null ? CUTOFF_CLAIM_SLUG : cutoffSlugOf(option.key);
    const at = `${scope}:has(#${cutoffOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      // Everything goes first, the claim's own region included: choosing a line means the outline
      // belongs to the comparison the READER asked for, not to the one the author picked. Without
      // this the page would draw two runs at once and name two claims.
      `${at} [data-cutoff-region] { visibility: hidden; }`,
      `${at} [data-cutoff-region^="${slug}:"] { visibility: visible; }`,
    );
    if (option !== null)
      lines.push(`${at} [data-cutoff-note="${slug}"] { display: revert; }`);
  }
  return lines.join("\n");
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a cutoff.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function cutoffChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "cutoff",
    notes: { reserve: "1.5em" },
  });
}
