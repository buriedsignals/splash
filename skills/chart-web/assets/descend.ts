// twin/skills/chart-web/assets/descend.ts
//
// THE EIGHTH THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what the picture may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum.
// `fold.ts` says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is
// chosen. `trace.ts` says what may be FOLLOWED through an image. This file says what may BECOME THE
// WHOLE: one branch of a hierarchy given the entire frame, its children re-laid at the scale they
// never had, and a way back out. All eight are native radio inputs plus CSS generated at build time
// (`:checked` and `:has()` on the enclosing figure, no listener, no state, not one byte of
// JavaScript), because that is the only kind of control this format can promise still works with
// the script absent.
//
// WHY IT IS AN EIGHTH FILE AND NOT AN OPTION IN `filter.ts`, which is the near miss.
//
// A filter's own specification is explicit about the thing it guarantees: *"the marks outside a
// named set leave, and THE FRAME THEY WERE MEASURED AGAINST DOES NOT MOVE."* That is exactly the
// property a descent gives up, on purpose. A branch is re-laid over the WHOLE plate, so a mark's
// size no longer means "share of the root" but "share of this branch" — which is the entire reason
// to descend, and the entire reason a filter cannot express it. Narrowing a treemap to its hydro
// cells without re-laying them leaves those cells sitting in the holes the others left, at
// continental scale: the same picture with gaps, and every area still answering the old question.
//
// `stack.ts` and `fold.ts` move marks on a frame that stays. `level.ts` lays a reference across a
// frame that stays. `withdraw.ts` changes an arithmetic, not a parent. `brush.ts` picks a span of an
// axis a descent does not have. `trace.ts` follows ONE datum through a picture that does not move.
// None of the seven re-parents anything, so none of them can refuse the things that go wrong here.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     descend: {
//       label: "Descendre dans une source",     // the fieldset's legend — the beat's own words
//       rootLabel: "Toute l'Europe",            // the way back out. Always first, always default.
//       rootAnnounce: "Toute l'Europe — les 41 pays, à l'échelle du continent",
//       rootKeys: ["France", "Germany", …],     // what the root view draws
//       options: [
//         {
//           key: "nuclear",
//           label: "Nucléaire",
//           announce: "Nucléaire — 161,4 GW sur 18 pays",   // must CONTAIN the visible label
//           note: "L'atome : 161,4 GW, 36 % de la capacité — sur 72 centrales…",
//           parentShare: 0.356,                 // what share of the root total this branch holds
//           keys: ["France", "Russia", …],      // what THIS view draws — a subset of the root's
//         },
//         …
//       ],
//     }
//
// THE FIVE THINGS A DESCENT GETS WRONG, AND THEY ARE REFUSED AT THE DECLARATION:
//
//   1. **A branch that is the root again.** `parentShare` at or above `ROOT_AGAIN_SHARE` is the
//      whole under a second name, and the reader operates a control that re-draws the same picture.
//      This is `filter.ts`'s "an option that keeps every drawn datum", stated in the currency a
//      descent actually has: area, not membership.
//   2. **A branch that gains no room.** The magnification a descent buys is `1 / parentShare`, and
//      it is the whole justification for throwing the frame away. It is computed here, from the
//      beat's own frozen numbers, and a branch that does not magnify is refused rather than shipped.
//   3. **A descent with no way back.** A reader who can go down and not up is in a different
//      picture with no route to the claim. The root option is required, is always emitted first,
//      and is always the default — which is also what makes the no-script page the claim's own view.
//   4. **A branch that is not a branch.** A branch drawing a key the root never drew is not a
//      descent into this picture, it is a second data set wearing the same control.
//   5. **A branch with no sentence.** A control that re-lays the frame and tells a reader who is
//      not looking at it nothing has moved a picture and delivered no reading. Each option owes one
//      sentence, revealed by the same `:checked` that re-lays the frame — the shape `stack.ts` and
//      `level.ts` already hold, and for their reason: the movement is not a reading and nothing in
//      this repository can measure one.
//
// AND ONE MORE, READ BACK OFF THE RENDERED MARKUP RATHER THAN OFF THE DECLARATION, because the
// declaration is what is being checked: **a half-tagged datum**. Every element carrying `data-cell`
// must carry the `data-view` of a declared view and a key that view actually draws. That is
// `filter.ts`'s own lesson (B6.18b: a filter hid the marks and left their labels on the map) one
// vocabulary over, and it is what stops a beat shipping a branch whose labels belong to the root.
//
// WHAT THIS FILE CANNOT SEE, so it is not trusted past its reach. Whether the branch a reader
// descends into is laid out CORRECTLY — that is geometry, and geometry is the beat's. What is held
// here is that a branch is smaller than its root, is drawn from the root's own keys, is reachable
// and escapable from the keyboard, and owes the reader a sentence. Whether the reader WANTS to
// descend is the `BRIEF.md` half, read by a person before the code is written.
//
// ONE VOCABULARY, ONE SLUG. `descendSlugOf` is the only place a key becomes a string: the radio's
// `id`, the `data-view` every element carries, the token the generated selector quotes and the
// note's own key are one function's answer — because the last time two of those were derived
// differently, an ampersand in a group name emptied a whole map with nothing red (`filter.ts`).

/** One branch: what it is called, what it holds, and what it owes the reader. */
export type DescendOption = {
  /** The branch's own key in the beat's data. Slugged for every string the mechanism needs. */
  key: string;
  /** The `<label>`'s visible words — the beat's own. */
  label: string;
  /** The accessible name. MUST contain the visible label (WCAG 2.5.3, Label in Name). */
  announce: string;
  /** The one sentence this branch owes a reader who is not looking at the picture. */
  note: string;
  /** What share of the ROOT's own total this branch holds, in `(0, 1)`. The magnification the
   *  descent buys is its reciprocal, and it is why the frame is thrown away. */
  parentShare: number;
  /** The data keys this view draws. A subset of the root's, never anything else. */
  keys: string[];
};

/** What a beat declares when it wants a descent. Absent/`null` means it wants none. */
export type DescendDeclaration = {
  /** The `<legend>` — what hierarchy this descends, in the beat's own words. */
  label: string;
  /** The way back out. Always first, always the default, never one of `options`. */
  rootLabel: string;
  /** The root option's accessible name. MUST contain `rootLabel`. */
  rootAnnounce: string;
  /** What the root view draws — the claim's own view, and the set every branch is checked against. */
  rootKeys: string[];
  options: DescendOption[];
};

/** The reserved id of the way back out. No declared branch may slug to it. */
export const DESCEND_ROOT_SLUG = "root";

/** At or above this share of the root, a branch IS the root: the reader operates a control and
 *  looks at the same picture at practically the same scale. Held at a measured number rather than
 *  at 1 so a rounding error cannot make a no-op descent legal. */
export const ROOT_AGAIN_SHARE = 0.95;

/**
 * A CSS-id-safe slug. The SAME string becomes the radio's `id`, the `data-view` every element
 * carries, the token the generated selector quotes, and the note's own key.
 *
 *  @parity */
export function descendSlugOf(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The magnification a branch buys — the factor its own children's areas grow by when it becomes
 *  the whole. The number the whole gesture is bought with, derived and never typed. */
export function magnificationOf(option: DescendOption): number {
  return 1 / option.parentShare;
}

/** Refuses every declaration that would render a descent that lies, before anything is drawn. */
export function assertDescendDeclaration(declaration: DescendDeclaration): void {
  const where = "descend declaration";
  if (!declaration || typeof declaration !== "object" || Array.isArray(declaration))
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);

  for (const field of ["label", "rootLabel", "rootAnnounce"] as const)
    if (typeof declaration[field] !== "string" || !declaration[field].trim())
      throw new Error(
        `${where}: \`${field}\` must be the beat's own words — a descent with no ${field} renders ` +
          `an unnamed control`,
      );
  if (!declaration.rootAnnounce.includes(declaration.rootLabel))
    throw new Error(
      `${where}: the root's accessible name ${JSON.stringify(declaration.rootAnnounce)} does not ` +
        `contain its visible label ${JSON.stringify(declaration.rootLabel)} — a reader who says ` +
        `what they see cannot operate it (WCAG 2.5.3, Label in Name)`,
    );

  if (!Array.isArray(declaration.rootKeys) || declaration.rootKeys.length === 0)
    throw new Error(`${where}: \`rootKeys\` is what the root view draws, and it cannot be empty`);
  const root = new Set(declaration.rootKeys);
  if (root.size !== declaration.rootKeys.length)
    throw new Error(`${where}: the root's keys are not unique — a cell would belong to two views`);

  if (!Array.isArray(declaration.options) || declaration.options.length < 1)
    throw new Error(
      `${where}: a descent needs at least one branch to descend into, got ` +
        `${declaration.options?.length ?? 0}. A beat that does not need a descent declares none.`,
    );

  const seen = new Map<string, string>();
  for (const option of declaration.options) {
    if (typeof option?.key !== "string" || !option.key.trim())
      throw new Error(`${where}: every branch needs a key — got ${JSON.stringify(option)}`);
    const slug = descendSlugOf(option.key);
    const at = `${where}: branch ${JSON.stringify(option.key)}`;
    if (!slug) throw new Error(`${at} slugs to an empty string — rename it`);
    if (slug === DESCEND_ROOT_SLUG)
      throw new Error(
        `${at} slugs to "${DESCEND_ROOT_SLUG}", the reserved id of the way back out — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${at} and ${JSON.stringify(seen.get(slug))} both slug to ${JSON.stringify(slug)} — one ` +
          `radio would descend into both`,
      );
    seen.set(slug, option.key);

    for (const field of ["label", "announce", "note"] as const)
      if (typeof option[field] !== "string" || !option[field].trim())
        throw new Error(`${at} has no \`${field}\``);
    if (!option.announce.includes(option.label))
      throw new Error(
        `${at}: the accessible name ${JSON.stringify(option.announce)} does not contain its ` +
          `visible label ${JSON.stringify(option.label)} (WCAG 2.5.3, Label in Name)`,
      );
    // A BRANCH OWES ONE SENTENCE, and a sentence with one reading in it is a caption. Held at
    // words rather than at characters so a long label cannot pass as prose.
    if (option.note.trim().split(/\s+/).length < 6)
      throw new Error(
        `${at}: \`note\` is the reading this branch owes a reader who is NOT looking at the ` +
          `picture — the movement is not a reading and nothing here can measure one. Got ` +
          `${JSON.stringify(option.note)}`,
      );

    if (!Number.isFinite(option.parentShare) || option.parentShare <= 0 || option.parentShare > 1)
      throw new Error(
        `${at}: \`parentShare\` is this branch's share of the root total and must sit in (0, 1] — ` +
          `got ${JSON.stringify(option.parentShare)}`,
      );
    if (option.parentShare >= ROOT_AGAIN_SHARE)
      throw new Error(
        `${at}: holds ${(option.parentShare * 100).toFixed(1)} % of the root — at or above ` +
          `${(ROOT_AGAIN_SHARE * 100).toFixed(0)} % that is THE ROOT UNDER A SECOND NAME. The ` +
          `reader descends and looks at the same picture at the same scale; a descent that ` +
          `magnifies nothing is a control operated while the frame stands still.`,
      );
    const magnification = magnificationOf(option);
    if (!(magnification > 1))
      throw new Error(
        `${at}: descending magnifies its children by x${magnification.toFixed(2)} — the room a ` +
          `branch gains IS the gesture, and a branch that gains none should not be a branch`,
      );

    if (!Array.isArray(option.keys) || option.keys.length === 0)
      throw new Error(`${at}: draws no cell — a branch that empties the frame is not a reading`);
    if (new Set(option.keys).size !== option.keys.length)
      throw new Error(`${at}: its keys are not unique`);
    const strangers = option.keys.filter((key) => !root.has(key));
    if (strangers.length)
      throw new Error(
        `${at}: draws ${strangers.length} key(s) the ROOT never drew ` +
          `(${strangers.slice(0, 5).join(", ")}) — that is not a descent into this picture, it is ` +
          `a second data set wearing the same control`,
      );
  }
}

/** Every view the page draws, root first. One list, so the markup, the stylesheet and the guard
 *  cannot disagree about what exists. */
export function descendViewSlugs(declaration: DescendDeclaration | null | undefined): string[] {
  if (!declaration) return [];
  return [DESCEND_ROOT_SLUG, ...declaration.options.map((o) => descendSlugOf(o.key))];
}

/** Which keys each view draws, by slug. The index `assertOneDescent` reads the markup against. */
export function descendKeyIndex(
  declaration: DescendDeclaration | null | undefined,
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  if (!declaration) return index;
  index.set(DESCEND_ROOT_SLUG, new Set(declaration.rootKeys));
  for (const option of declaration.options)
    index.set(descendSlugOf(option.key), new Set(option.keys));
  return index;
}

/** The radio id for a view's slug. One function, three readers. */
export function descendOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * THE ONE THING A COMPONENT CALLS for an element it draws INSIDE a view — a cell's mark, its hit
 * target, its label box. Both attributes together, never one of them: the guard below reads the
 * markup back and refuses the half-tagged datum that is how a label ends up in the wrong view.
 */
export function descendCellAttrs(slug: string, key: string): Record<string, string> {
  return { "data-view": slug, "data-cell": key };
}

/** For a LAYER that is a whole view — an `<svg>`, an overlay — which carries the view's own tag and
 *  no key of its own, because it is not drawn from one datum. */
export function descendLayerAttrs(slug: string): Record<string, string> {
  return { "data-view": slug };
}

/** The options a component draws, in reading order: the way back out first, because it is the view
 *  the beat renders in and the one that carries the whole claim. */
export function descendOptionsForMarkup(
  declaration: DescendDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isRoot: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: descendOptionId(idPrefix, DESCEND_ROOT_SLUG),
      slug: DESCEND_ROOT_SLUG,
      label: declaration.rootLabel,
      announce: declaration.rootAnnounce,
      isRoot: true,
    },
    ...declaration.options.map((option) => {
      const slug = descendSlugOf(option.key);
      return {
        id: descendOptionId(idPrefix, slug),
        slug,
        label: option.label,
        announce: option.announce,
        isRoot: false,
      };
    }),
  ];
}

/**
 * The sentence each branch owes, by the slug that reveals it.
 *
 * The root gets NONE on purpose, for `filter.ts`'s own reason: it is not a branch of anything and a
 * sentence under it would be furniture that says nothing. What the root view says is the title.
 */
export function descendNotesForMarkup(
  declaration: DescendDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: descendSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * The stylesheet, and it is the whole mechanism.
 *
 * ONE rule per view, over `[data-view]` — never a list of element types. Whatever a beat draws
 * inside a view is covered the moment it carries the attribute, including the kind of element that
 * does not exist yet: the `<svg>` itself, a label layer, a note, a legend swatch.
 *
 * THE ORDER OF EMISSION IS NOT THE MECHANISM HERE, and that is deliberate. Every hiding rule has
 * the same specificity and they are mutually exclusive — exactly one radio is checked, so exactly
 * one `:has()` matches — so no rule ever competes with another for the same element. (A sankey on
 * this branch rendered green with zero ribbons lit because two same-specificity rules were emitted
 * in the wrong order; a vocabulary whose rules cannot overlap cannot repeat that.)
 *
 * Pure CSS: `:has()` on the scope plus `:checked` on a real radio. No script runs, so the descent
 * works with JavaScript off exactly as it works with it on — and the empty string returned for a
 * beat with no declaration is what makes "no dead CSS" literal rather than aspirational.
 */
export function descendCss(
  declaration: DescendDeclaration | null | undefined,
  { scope, idPrefix }: { scope: string; idPrefix: string },
): string {
  if (!declaration) return "";
  const lines: string[] = [
    `/* The descent this beat declared: ${declaration.options.length} branch(es) under ` +
      `${JSON.stringify(declaration.label)}, plus the way back out.`,
    `   One rule per view, over [data-view] — every element drawn inside a view that is not the`,
    `   chosen one goes with it, whatever kind of element it is. */`,
    `${scope} [data-descend-note] { display: none; }`,
  ];
  for (const slug of descendViewSlugs(declaration)) {
    const at = `${scope}:has(#${descendOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${at} [data-view]:not([data-view="${slug}"]) { display: none; }`,
      `${at} [data-descend-note="${slug}"] { display: revert; }`,
    );
  }
  return lines.join("\n");
}

/** The control's own chrome. The segmented treatment is layered ON TOP of working radios
 *  (`opacity: 0`, never `display: none`) — the line between styling a control and destroying one —
 *  and every pill clears the 24x24 CSS px minimum target size (WCAG 2.2 SC 2.5.8). */
export function descendChromeCss({ scope }: { scope: string }): string {
  return `
${scope} .chart-descend {
  flex: 0 0 auto;
  margin: 6px 0 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 3px 10px;
  align-items: center;
  font-size: var(--filter-size);
}
${scope} .chart-descend > legend {
  float: left;
  padding: 0 10px 0 0;
  color: var(--muted);
}
${scope} .chart-descend .options { display: flex; flex-wrap: wrap; gap: 3px; }
${scope} .chart-descend label {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  min-width: 24px;
  padding: 1px 10px;
  border: 1px solid var(--grid);
  border-radius: 999px;
  cursor: pointer;
  color: var(--muted);
}
${scope} .chart-descend input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
${scope} .chart-descend label:has(input:checked) {
  border-color: var(--ink);
  color: var(--ink);
}
${scope} .chart-descend label:has(input:focus-visible) {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}
/* The row costs NOTHING until a branch is chosen: the space belongs to the sentence, not to the
   container that would hold one. A reserved row is the right call where a note is one line and the
   plot would jump under it; here a branch's sentence wraps to three or four lines on a phone, so
   reserving one changes nothing about the jump and takes a line off the picture at every width. */
${scope} .descend-notes { flex: 0 0 auto; margin: 0; }
${scope} .descend-notes p { margin: 4px 0 0; }
`.trim();
}

/**
 * Reads the RENDERED markup back and refuses the half-tagged datum.
 *
 * The failure it exists for is `filter.ts`'s, one vocabulary over: a component spreads the view's
 * attributes onto the mark and types the label by hand, so descending re-lays the cells and leaves
 * the root's names floating over them. Every element carrying `data-cell` must carry a `data-view`
 * naming a DECLARED view, and a key that view actually draws.
 *
 * It also refuses a declared view that no element belongs to — a radio that hides everything and
 * shows nothing, which is the descent's own version of "the chips are drawn over a picture they
 * cannot reach".
 *
 * WHAT IT CANNOT SEE, so it is not trusted past it: an element drawn from a datum that carries no
 * attributes at all. That is what driving a real browser is for.
 */
export function assertOneDescent(
  markup: string,
  declaration: DescendDeclaration | null | undefined,
): void {
  if (!declaration) {
    const stray = String(markup).match(/\sdata-(?:view|cell|descend-note)=/);
    if (stray)
      throw new Error(
        `descend: this beat declares no descent, but its markup carries a ${stray[0].trim()} ` +
          `attribute — declare the descent or drop the attribute; a residue is how a beat ends up ` +
          `with a control nobody can operate`,
      );
    return;
  }
  const index = descendKeyIndex(declaration);
  const populated = new Set<string>();
  let tagged = 0;
  for (const tag of String(markup).match(/<[a-zA-Z][^>]*>/g) ?? []) {
    const view = tag.match(/\sdata-view="([^"]*)"/);
    if (view) {
      if (!index.has(view[1]))
        throw new Error(
          `descend: an element carries data-view="${view[1]}", which is not one of the ` +
            `${index.size} declared views (${[...index.keys()].join(", ")}) — ${tag.slice(0, 120)}`,
        );
      populated.add(view[1]);
    }
    const cell = tag.match(/\sdata-cell="([^"]*)"/);
    if (!cell) continue;
    if (!view)
      throw new Error(
        `descend: an element carries data-cell="${cell[1]}" and no data-view, so descending ` +
          `would re-lay the frame and leave it behind — ${tag.slice(0, 120)}`,
      );
    if (!index.get(view[1])!.has(cell[1]))
      throw new Error(
        `descend: the view "${view[1]}" does not draw "${cell[1]}", and an element in it says it ` +
          `does — ${tag.slice(0, 120)}`,
      );
    tagged++;
  }
  if (tagged === 0)
    throw new Error(
      `descend: ${index.size} views are declared and NOT ONE element in the markup carries ` +
        `data-cell — the control would be drawn over a picture it cannot re-parent`,
    );
  const empty = [...index.keys()].filter((slug) => !populated.has(slug));
  if (empty.length)
    throw new Error(
      `descend: the view(s) ${empty.join(", ")} are declared and no element belongs to them — ` +
        `choosing one would hide the whole picture and draw nothing in its place`,
    );

  // AND THE RULES THAT MAKE THE ATTRIBUTES DO ANYTHING, when the whole page is what was handed in.
  //
  // FOUND BY MUTATION, not by reasoning: dropping `descendCss` from the beat's own stylesheet — one
  // line — rendered GREEN here and at `renderWeb`, because every check above reads ATTRIBUTES and
  // the attributes were all still correct. What shipped was five views drawn on top of each other
  // with every branch's sentence printed at once. `filter.ts` cannot have this hole, because
  // `renderWeb` emits the filter's CSS itself from the declaration; a vocabulary a BEAT brings with
  // it has to emit its own rules, so it has to check its own rules.
  //
  // Skipped, deliberately, when what was handed in is a fragment with no stylesheet in it: this
  // reads the delivered page, and a caller checking component markup alone is not lying about
  // anything.
  if (!/<style/.test(markup)) return;
  const missing = [...index.keys()].filter(
    (slug) => !markup.includes(`:not([data-view="${slug}"])`),
  );
  if (missing.length)
    throw new Error(
      `descend: the page carries the vocabulary for ${index.size} views and no rule that hides ` +
        `${missing.join(", ")} — every view would be drawn at once, on top of the others, with ` +
        `every branch's sentence printed together. The attributes are correct and the control does ` +
        `nothing: emit descendCss into the beat's own stylesheet.`,
    );
}
