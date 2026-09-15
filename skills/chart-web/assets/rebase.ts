// twin/skills/chart-web/assets/rebase.ts
//
// ANOTHER THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what it may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum. `fold.ts`
// says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is chosen.
// `trace.ts` says what may be FOLLOWED through an image, `follow.ts` what may be followed through
// its ORDERED STEPS. `hold.ts` says which factor of a product may be HELD STILL. `descend.ts` says
// what may BECOME THE WHOLE. `floor.ts` says what the picture may STAND ON. `cutoff.ts` says where
// the claim's own line is drawn. `reorder.ts` says what the same numbers look like somewhere else
// in a cycle. `count.ts` says which members of a fixed frame are counted in. `aim.ts` says WHERE a
// displacement points. `weigh.ts` says what a mark is WORTH. `benchmark.ts` says what the verdict
// is measured against. `datum.ts` says where a diverging zero sits. `align.ts` says what every
// interval is LINED UP ON. `qualify.ts` says WHAT COUNTS as the thing the axis measures. This file
// says **WHICH BAND IS MEASURED FROM THE COMMON ZERO** — a second mark, at the drawn band's own
// length, on the plate's own scale, drawn beside a stack that does not move. All of them are native
// radio inputs plus CSS generated at build time (`:checked` and `:has()` on the enclosing figure, no
// listener, no state, not one byte of JavaScript), because that is the only kind of control this
// format can promise still works with the script absent.
//
// WHY A STACKED BAR NEEDS THIS, AND WHY NOTHING ELSE IN THE CATALOGUE DOES.
//
// A stacked bar hands the reader exactly ONE comparison for free, and which one is not a matter of
// taste: only the bottom segment is measured from a common baseline. Every segment above it starts
// at its own row's partial sum, so its two ends are two numbers an eye cannot separate — a band that
// ends further right may be the shorter one. The totals are honest and every internal comparison is
// not. `chart-beat/references/types/stacked-bar.md` states it as the type's defining limit:
// "Precise comparison of an INNER segment across columns is exactly what this type can't give you."
//
// That sheet also names the repair, and the repair is NOT geometric: "The fix isn't in the geometry;
// it's in the words around the chart: state plainly which one comparison this particular chart
// supports." A still can only obey that by naming the one comparison and asking to be trusted about
// the rest. An interactive page can do the thing the sentence is standing in for — HAND THE READER
// THE MISSING BASELINE, one band at a time, without taking the honest comparison away to pay for it.
//
// AND THE ONE THING THAT MAKES IT THIS FILE AND NOT `floor.ts` OR `stack.ts`. Both of those give a
// band a baseline by MOVING IT THERE. `proof/webx-electricity-mix` did it on a 100 %-stacked column
// with `stack.ts`'s one rigid displacement per member; `proof/web-streamgraph-swiss-electricity` did
// it on a stream with `floor.ts`'s shear. Neither transfers here, and not because of the arithmetic:
// THIS TYPE'S OWN SHEET FORBIDS THE OPERATION. It requires a stacking order "IDENTICAL across every
// single column" and records that a reorder "also shifts the position of every segment sitting above
// the swap". Laying a band flat in a stacked bar IS a reorder of that column. The band would get its
// baseline by destroying the composition and every total's position — buying one comparison with the
// only comparison the type gives honestly.
//
// So nothing moves. The stack is drawn once, untouched in every state, and the chosen band is drawn
// A SECOND TIME, in a lane of its own under the bar, from the plate's own zero, at the plate's own
// scale, against the plate's own graduations. The reader holds both readings at once in one row:
// where the band sits, and how long it is.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     rebase: {
//       label: "Mesurer une source depuis zéro",   // the <legend> — the beat's own words
//       axisMax: 550,                              // the rail's own top, the bars' own scale
//       options: [
//         { key: "none", label: "l'empilement seul",   // FIRST is the default: the plate itself.
//           announce: "…l'empilement seul…",           //   No bands, no note, no rail.
//           bands: [] },
//         { key: "wind", label: "l'éolien",
//           announce: "Mesurer l'éolien depuis zéro — …",  // must CONTAIN `label` (WCAG 2.5.3)
//           note: "Le Royaume-Uni (83,3 TWh) finit à 130 …",
//           bands: [{ row: "DEU", value: 141.6, from: 23.83 }, …] },   // every drawn row, zeroes included
//       ],
//     }
//
// `from` is where the band starts INSIDE the stack. The rail never uses it — a rail starts at zero,
// which is the whole point — and this file never draws with it. It is declared so the refusal below
// can count, from the beat's own numbers, how badly the stack ranks that band: see
// `rebaseInversions`.

import { controlChromeCss } from "./control-chrome.ts";

/** One row's band under one option. `value` is its length; `from` is where the stack puts its start. */
export type RebaseBand = {
  /** The beat's own row key — the same key the drawn segment carries. */
  row: string;
  /** The band's length, in the data's own unit. Zero is legal and is a reading: a country with none
   *  of this source gets a rail of length zero rather than no rail at all. */
  value: number;
  /** Where the band's LEFT edge sits in the stack, in the data's own unit. Never drawn by this
   *  file — a rail starts at zero. Declared so the stack's own ranking can be counted. */
  from: number;
};

/** One rung. The first declared is the default: the plate, with no rail and no sentence. */
export type RebaseOption = {
  /** Which band is rebased, in one slug. The id is derived from THIS and never from the label — the
   *  single derivation of one identity `filter.ts` records the defect for. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It
   *  must CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG
   *  2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /** The sentence revealed under the control, in the beat's own words. Required on every rung but
   *  the default, and refused ON the default: the untouched picture is not a comparison, it is the
   *  claim, and a note under it would be the title said a second time. */
  note?: string;
  /** Every drawn row's band under this option. Empty on the default and only on the default. */
  bands: RebaseBand[];
};

/** What a beat declares when it wants rails. Absent/`null` means it wants none. */
export type RebaseDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The rail's own top, in the data's unit: the same scale the bars are drawn at, because a rail
   *  read against a second scale is a second chart sharing a frame. */
  axisMax: number;
  /** At least two. The FIRST is the default: the picture the page ships in, the picture a reader
   *  with no script never leaves. */
  options: RebaseOption[];
};

/** A CSS-id-safe slug, derived from the option's KEY and never from its label. */
export function rebaseSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug. One function, three readers. */
export function rebaseOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/**
 * HOW BADLY THE STACK RANKS THIS BAND — the number the whole control is about, and the number the
 * refusal below is made with.
 *
 * Of the ordered pairs of rows, how many have the LONGER band ending further LEFT than the shorter
 * one. A reader reading a stack above its baseline can compare positions accurately and lengths not
 * at all, so this counts the pairs on which the only reading the drawing supports is backwards.
 *
 * ONE FUNCTION, TWO READERS, on purpose: the refusal below uses it and so does the beat, for the
 * sentence its option reveals. The last time this repository derived one identity twice, a whole map
 * emptied with nothing red (`filter.ts`).
 */
export function rebaseInversions(bands: RebaseBand[]): { inverted: number; pairs: number } {
  let inverted = 0;
  let pairs = 0;
  for (let i = 0; i < bands.length; i++)
    for (let j = i + 1; j < bands.length; j++) {
      const a = bands[i];
      const b = bands[j];
      pairs++;
      const byLength = a.value - b.value;
      const byEdge = a.from + a.value - (b.from + b.value);
      if (byLength * byEdge < 0) inverted++;
    }
  return { inverted, pairs };
}

/** The pair the stack misreads by the widest margin: the longer band and the shorter one that ends
 *  further right than it. `null` when the stack ranks every pair the right way round, which is what
 *  the refusal below is looking for. Same function, same two readers. */
export function rebaseWorstMisread(
  bands: RebaseBand[],
): { longer: RebaseBand; righter: RebaseBand; gap: number } | null {
  let worst: { longer: RebaseBand; righter: RebaseBand; gap: number } | null = null;
  for (const longer of bands)
    for (const righter of bands) {
      if (!(longer.value > righter.value)) continue;
      const gap = righter.from + righter.value - (longer.from + longer.value);
      if (gap <= 0) continue;
      if (!worst || gap > worst.gap) worst = { longer, righter, gap };
    }
  return worst;
}

/**
 * EVERY REFUSAL THIS FILE OWNS, MADE AGAINST WHAT THE COMPONENT IS ABOUT TO DRAW.
 *
 * `rows` is the list of rows the beat actually draws and `bandDrawn` reads the segment the beat
 * actually drew for one row under one option — so the refusals are measured against the picture and
 * never against the declaration's own idea of itself. The declaration comes from the runner and the
 * drawing comes from the component's own props: two paths, compared here, which is the only reason
 * the length check below is a check rather than a restatement.
 */
export function assertRebaseDeclaration(
  declaration: RebaseDeclaration,
  {
    rows,
    bandDrawn,
    minRailUnits,
    unitsPerValue,
  }: {
    /** The rows the beat draws, in drawing order. */
    rows: string[];
    /** The segment the beat DREW for this row under this option, or `null` if it drew none. */
    bandDrawn: (row: string, optionKey: string) => { from: number; to: number } | null;
    /** The shortest rail a reader can measure, in the data's own unit, at the narrowest width this
     *  format is verified at. Derived by the beat from a CSS-pixel floor and its own geometry, never
     *  typed as a value. */
    minRailUnits: number;
    /** Geometry units per unit of data — carried only so the refusal can say what a rail is worth in
     *  the frame it will be drawn in. */
    unitsPerValue: number;
  },
): void {
  const where = "rebase declaration";
  if (!declaration || typeof declaration !== "object")
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);
  if (typeof declaration.label !== "string" || !declaration.label.trim())
    throw new Error(
      `${where}: \`label\` must be the beat's own words — a control with no legend renders unnamed`,
    );
  if (!Number.isFinite(declaration.axisMax) || declaration.axisMax <= 0)
    throw new Error(
      `${where}: \`axisMax\` must be the rail's own top, a positive number in the data's unit — ` +
        `got ${declaration.axisMax}. A rail read against a second scale is a second chart sharing ` +
        `a frame.`,
    );
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two options to be a choice, got ${declaration.options?.length ?? 0}. ` +
        "A beat that does not need rails declares none.",
    );
  if (!Array.isArray(rows) || rows.length === 0)
    throw new Error(`${where}: the beat draws no rows`);
  if (new Set(rows).size !== rows.length)
    throw new Error(`${where}: the drawn rows are not unique`);
  if (!Number.isFinite(minRailUnits) || minRailUnits <= 0)
    throw new Error(
      `${where}: \`minRailUnits\` must be the shortest rail a reader can measure, in the data's ` +
        `unit — got ${minRailUnits}`,
    );

  const seen = new Map<string, string>();
  declaration.options.forEach((option, index) => {
    const isDefault = index === 0;
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(`${where}: every option needs a label — got ${JSON.stringify(option)}`);
    const slug = rebaseSlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(option.label)} both slug ` +
          `to ${JSON.stringify(slug)} — one radio would drive both`,
      );
    seen.set(slug, option.label);

    if (typeof option.announce !== "string" || !option.announce.trim())
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`announce\` — a control whose ` +
          "answer is only a picture leaves a keyboard reader with nothing",
      );
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ` +
          `${JSON.stringify(option.announce)}, which does not contain its own visible label — an ` +
          "accessible name that does not contain the visible one is the WCAG 2.5.3 failure, and a " +
          "reader speaking what they see cannot reach this option",
      );
    if (isDefault && typeof option.note === "string" && option.note.trim())
      throw new Error(
        `${where}: the default option ${JSON.stringify(option.label)} carries a note. The first ` +
          "option IS the picture the page ships in; a sentence revealed under it would be the title " +
          "said a second time, in a second place, to a reader who never chose anything.",
      );
    if (!isDefault && (typeof option.note !== "string" || !option.note.trim()))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`note\` — a reading the reader ` +
          "built that is only a picture cannot be checked, and a reader who is not looking at the " +
          "plot gets nothing at all",
      );

    if (!Array.isArray(option.bands))
      throw new Error(`${where}: option ${JSON.stringify(option.label)} declares no \`bands\` array`);
    if (isDefault) {
      if (option.bands.length > 0)
        throw new Error(
          `${where}: the default option ${JSON.stringify(option.label)} declares ` +
            `${option.bands.length} band(s). The default IS the untouched plate: it draws no rail, ` +
            "and a rail under it would be the picture the page ships in already answering a " +
            "question nobody asked.",
        );
      return;
    }

    // A ROW THAT LOSES ITS RAIL, OR GAINS ONE. Zeroes included: a country with none of this source
    // has a rail of length zero, which is a reading, not an absence.
    if (option.bands.length !== rows.length)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} seats ${option.bands.length} band(s) for ` +
          `${rows.length} drawn row(s). Every row is rebased or none is — a rail missing from one ` +
          "row reads as a country with none of that source, which is a different fact and is " +
          "already drawn as a rail of length zero.",
      );
    const byRow = new Map<string, RebaseBand>();
    for (const band of option.bands) {
      if (!rows.includes(band.row))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} rebases ${JSON.stringify(band.row)}, ` +
            "which the beat does not draw",
        );
      if (byRow.has(band.row))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} rebases ${JSON.stringify(band.row)} twice`,
        );
      if (!Number.isFinite(band.value) || band.value < 0)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(band.row)} a ` +
            `length of ${band.value}. A rail is a length from zero; a negative one is drawn ` +
            "leftwards off the frame and belongs to a diverging form, not to a stack.",
        );
      // A RAIL OFF THE RAIL.
      if (band.value > declaration.axisMax)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} gives ${JSON.stringify(band.row)} a ` +
            `length of ${band.value}, past the axis's own top of ${declaration.axisMax} — a rail ` +
            "longer than the scale it is read against is drawn nowhere",
        );
      if (!Number.isFinite(band.from) || band.from < 0)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} starts ${JSON.stringify(band.row)}'s ` +
            `band at ${band.from}. That is where the STACK puts it, and it is what the stack's own ` +
            "ranking is counted from.",
        );
      // A RAIL WHOSE LENGTH IS NOT THE BAND'S. The declaration is the runner's and the drawing is
      // the component's: two derivations of one quantity, compared here rather than trusted.
      const drawn = bandDrawn(band.row, option.key);
      if (!drawn)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} rebases ${JSON.stringify(band.row)} and ` +
            "the beat draws no such segment on that row. A rail with no band above it is a length " +
            "the reader cannot check against anything.",
        );
      const drawnLength = drawn.to - drawn.from;
      if (Math.abs(drawnLength - band.value) > 1e-6)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} rails ${JSON.stringify(band.row)} at ` +
            `${band.value} while the stack draws that band ${drawnLength} long. One quantity, two ` +
            "lengths, one row — the rail exists to be the SAME band on a baseline it can be " +
            "measured from, not a second number about it.",
        );
      if (Math.abs(drawn.from - band.from) > 1e-6)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} says ${JSON.stringify(band.row)}'s band ` +
            `starts at ${band.from} while the stack draws it starting at ${drawn.from}. The start is ` +
            "what the stack's own ranking is counted from; counted from the wrong place the option " +
            "would be kept or refused for the wrong reason.",
        );
      byRow.set(band.row, band);
    }

    // A SOURCE WITH ZERO INVERSIONS — THE BAND THE STACK ALREADY RANKS CORRECTLY.
    //
    // This is the refusal this vocabulary exists to make, and it is the type's own structure coming
    // back out of the data: the band sitting ON the baseline has a right edge that IS its length, so
    // the stack ranks it exactly right and a rail under it draws a second copy of a line the reader
    // can already measure. `directed-interaction.md` refuses an option whose state equals the
    // default's; this is that refusal in this vocabulary's own terms, because an option that hands
    // back a ranking the plate already supports has changed the picture and not the reading.
    const { inverted, pairs } = rebaseInversions(option.bands);
    if (inverted === 0)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} rebases a band the stack already ranks ` +
          `correctly — 0 of ${pairs} pairs are inverted. Its right edge IS its length, which is ` +
          "true of exactly one band per stack: the one on the baseline. A rail under it is a second " +
          "copy of a line the reader can already measure.",
      );

    // A RAIL NOBODY CAN MEASURE.
    const longest = Math.max(...option.bands.map((band) => band.value));
    if (longest < minRailUnits)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)}'s longest rail is ${longest} in the ` +
          `data's unit (${(longest * unitsPerValue).toFixed(1)} geometry units), under the ` +
          `${minRailUnits} this beat measured as the shortest rail a reader can read at the ` +
          "narrowest width this format is verified at. A control that hands back a length nobody " +
          "can measure hands back nothing.",
      );
  });
}

/** The options a component draws, in reading order: the default first. */
export function rebaseOptionsForMarkup(
  declaration: RebaseDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isDefault: boolean }[] {
  if (!declaration) return [];
  return declaration.options.map((option, index) => ({
    id: rebaseOptionId(idPrefix, rebaseSlugOf(option.key)),
    slug: rebaseSlugOf(option.key),
    label: option.label,
    announce: option.announce,
    isDefault: index === 0,
  }));
}

/** The sentences the control owes. The default gets none: it is not a comparison, it is the claim. */
export function rebaseNotesForMarkup(
  declaration: RebaseDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.slice(1).map((option) => ({
    slug: rebaseSlugOf(option.key),
    text: option.note as string,
  }));
}

/** The attributes one row's rail carries, so `assertOneRebasing` can read it back and so the
 *  generated rules have something to reach. */
export function rebaseRailAttrs(row: string): { "data-rebase-rail": string } {
  return { "data-rebase-rail": row };
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss`, `floorCss` and `qualifyCss` do.
 *
 * WHAT IS GENERATED IS A WIDTH AND NOTHING ELSE. A rail's `left` is never written, here or by the
 * beat: it is zero, and it is zero in every state, which is the whole of what this control is. An
 * option that could move a rail's origin would be the stack again, one lane lower.
 *
 * THE RAILS ARE ALWAYS RENDERED. `display` does not transition, so a rail that arrived by being
 * displayed would snap — the owner's fourth arbitration in the one form it takes here. Every rail is
 * in the document from the start at `width: 0`, and what a chosen option changes is a property of an
 * element that was already there.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `${scope} [data-rebase-rail]` and
 * `${scope} [data-rebase-rail="<row>"]` score identically — an attribute selector with a value is
 * still one attribute selector — so which wins is source order and nothing else; the blanket is
 * emitted FIRST and every option's rules after it. A sankey on this branch rendered green with zero
 * ribbons lit for getting exactly this backwards.
 *
 * NO SELECTOR HERE IS GROUPED, for the defect `stack.ts` records at length: a descendant prefix
 * binds to the first selector of a group only.
 *
 * IT EMITS `data-stack-note`, WHICH IS NOT A COPY-PASTE SLIP. That string is the FORMAT'S DISCOVERY
 * CONTRACT for a control that moves the picture and owes the reader a sentence:
 * `interaction-plan.ts` reads the sentence off `data-stack-note`, and a third grammar with its own
 * spelling would be invisible to the guard written to hold it. `qualify.ts` and `aim.ts` make the
 * same choice for the same reason, and `aim.ts`'s beat learned it the hard way.
 */
export function rebaseCss(
  declaration: RebaseDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    railMs,
    plotUnits,
    frameUnits,
    paint,
  }: {
    scope: string;
    idPrefix: string;
    /** How long a rail takes to reach its length. Honoured only under `no-preference`. */
    railMs: number;
    /** How many geometry units the axis's own top is worth — the bars' own `x(axisMax)`. */
    plotUnits: number;
    /** The whole frame's width in geometry units. The rails live in an HTML layer sharing the
     *  `<svg>`'s grid cell, so under `preserveAspectRatio="none"` the one conversion exact at every
     *  reader width is a percentage of that layer. */
    frameUnits: number;
    /** What each option's rails are painted in — the beat's own measured colour, never named here. */
    paint: (optionKey: string) => string;
  },
): string {
  if (!declaration) return "";
  if (!Number.isFinite(plotUnits) || plotUnits <= 0)
    throw new Error(`rebase: the plot width must be a positive number of geometry units, got ${plotUnits}`);
  if (!Number.isFinite(frameUnits) || frameUnits <= 0)
    throw new Error(`rebase: the frame width must be a positive number of geometry units, got ${frameUnits}`);
  const round = (n: number) => Number(n.toFixed(3));
  const widthOf = (value: number) =>
    round(((value / declaration.axisMax) * plotUnits * 100) / frameUnits);

  const lines: string[] = [
    `/* The rails this beat declared: ${declaration.options.length - 1} band(s) that can be measured`,
    `   from the common zero, over ${JSON.stringify(declaration.label)}. Radios plus :checked/:has(),`,
    `   generated once at build time — the same mechanism filter.ts narrows with, and the reason this`,
    `   control needs no script and survives one being blocked. */`,
    `${scope} [data-stack-note] { display: none; }`,
    `${scope} [data-rebase-rail] { left: 0; width: 0%; }`,
  ];
  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-rebase-rail] { transition: width ${railMs}ms cubic-bezier(0.4, 0, 0.2, 1), background-color ${railMs}ms ease; }`,
    `}`,
  );
  for (const option of declaration.options) {
    const slug = rebaseSlugOf(option.key);
    const on = `${scope}:has(#${rebaseOptionId(idPrefix, slug)}:checked)`;
    lines.push(`${on} [data-rebase-rail] { width: 0%; }`);
    if (option.bands.length) lines.push(`${on} [data-rebase-rail] { background: ${paint(option.key)}; }`);
    for (const band of option.bands)
      lines.push(
        `${on} [data-rebase-rail="${band.row}"] { width: ${widthOf(band.value)}%; }`,
      );
    if (option.note) lines.push(`${on} [data-stack-note="${slug}"] { display: revert; }`);
  }
  return lines.join("\n");
}

/**
 * Reads the WRITTEN PAGE back, which is the only place two of these refusals can be made.
 *
 * `descend.ts` earned the first by mutation — dropping the stylesheet call left every view drawn on
 * top of every other while every attribute-level check stayed green, because the attributes were all
 * still perfectly correct. `weigh.ts` earned the second, and it is inherited here rather than
 * re-earned: see the note at the ordering check.
 */
export function assertOneRebasing(
  html: string,
  declaration: RebaseDeclaration | null | undefined,
  { rows, where = "this page" }: { rows: string[]; where?: string },
): void {
  if (!declaration) return;
  const slugs = declaration.options.map((option) => rebaseSlugOf(option.key));

  for (const row of rows)
    if (!html.includes(`data-rebase-rail="${row}"`))
      throw new Error(
        `${where}: row ${JSON.stringify(row)} is drawn and carries no rail. Every rail is in the ` +
          "document from the start at zero width — one that is absent can never be given a length, " +
          "and the option that names it would move fifteen rows and leave the sixteenth flat.",
      );

  for (const slug of slugs)
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(html))
      throw new Error(
        `${where}: nothing in the page's stylesheet answers the option ${JSON.stringify(slug)}. A ` +
          "vocabulary a beat brings with it has to emit its own rules: without them every rail " +
          "stays at zero and every attribute is still perfectly correct.",
      );

  const blanket = html.search(/\[data-rebase-rail\]\s*\{\s*left:\s*0;\s*width:\s*0%/);
  if (blanket < 0)
    throw new Error(
      `${where}: the stylesheet carries no blanket rule setting every rail to zero width, so a rail ` +
        "a chosen option does not name keeps whatever the option before it gave it. This is the " +
        "rule that must be emitted FIRST — two attribute selectors score identically and source " +
        "order is the whole mechanism.",
    );
  const firstSized = html.search(/\[data-rebase-rail="[^"]*"\]\s*\{\s*width:/);
  if (firstSized >= 0 && firstSized < blanket)
    throw new Error(
      `${where}: the stylesheet gives a rail its length BEFORE the blanket rule that zeroes them ` +
        "all. Two attribute selectors score identically, so source order is the whole mechanism — " +
        "and an engine without `:has()`, which is the only engine the base pair ever decides " +
        "anything for, would be shown every option's rails at once, stacked on one another.",
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared rails.
 *
 * ONE DRAWING, IN ONE PLACE. `control-chrome.ts` carries the pill, its three states and the
 * measurements behind them; what is left here is the only thing that was ever this control's own —
 * how many lines of sentence it has to reserve, and the rail lane it adds under the plot.
 */
export function rebaseChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "rebase",
    notes: {
      reserve: "3em",
      // Measured on the longest of the four sentences this beat reveals, in the widest of the three
      // directions, at 375 CSS px: three lines. Stacked, so the row is always as tall as the
      // LONGEST sentence and choosing an option never pushes the plot down.
      why: "three lines: the longest of this control's sentences at the narrowest verified width",
      stacked: true,
    },
    // THE RAIL LANE. An HTML layer sharing the plot's own grid cell, so a rail's length is a
    // percentage of the same box the <svg> fills and is therefore exact at every reader width —
    // which an SVG geometry property under preserveAspectRatio="none" would also be, but only
    // after the beat re-derived the mapping a second time. position:relative for the rails' own
    // absolute placement; pointer-events:none because the rails answer nothing: the SEGMENT
    // answers, and a transparent layer over the plot would swallow every pointer event before the
    // hit area ever saw it (measured once on `.overlay`, and it cost a driven browser to find).
    extra: `${scope} .chart-plot .rebase-layer { position: relative; pointer-events: none; }
${scope} .chart-plot .rebase-layer > span { position: absolute; display: block; border-radius: 1px; }`,
  });
}
