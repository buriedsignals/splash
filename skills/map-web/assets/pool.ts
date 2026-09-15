// twin/skills/map-web/assets/pool.ts
//
// AT WHAT GRAIN A CELL PUTS ITS VALUE IN COMMON.
//
// The map side of this tree carries three vocabularies already, and this one is none of them.
// `filter.ts` says what may LEAVE a map. `classing.ts` says WHERE THE CUTS FALL in one fixed list of
// readings. `area-scale.ts` says what an AREA is worth. This file says **over how many cells a cell
// adds up its own numerator and its own denominator** — the aggregation window, which is the one
// thing a grid map decides for the reader and then never shows them.
//
// All of them are native radio inputs plus CSS generated at build time (`:checked` and `:has()` on
// the enclosing figure, no listener, no state, not one byte of JavaScript), because that is the only
// kind of control this format can promise still works with the script absent.
//
// WHY THIS ONE EXISTS, AND IT IS THE TYPE SHEET'S OWN NUMBER-ONE FAILURE RATHER THAN A DECORATION.
//
// `map-beat/references/types/hex-grid.md` states it twice. Once as the thing that goes wrong: *"The
// aggregate mode silently changes what the same shade of colour MEANS, and the map doesn't tell the
// reader which mode it's in unless the legend says so explicitly … The same colour on two different
// hex-grid maps built from the same points can mean three unrelated things depending on a config
// choice that leaves no visible trace in the image itself."* And once as the accessibility trap:
// *"Cell size and aggregate mode are both invisible from the final image alone."*
//
// The sheet's second reading of the type — the hex CARTOGRAM, one hexagon per named unit — says the
// cells there are *"not arbitrary at all"*, and that is true OF THE CELL. It is not true of the
// GROUPING. A cell on a rate map already carries a quotient of two sums, and the moment two cells
// are put in common the quotient of the sums stops being the mean of the quotients. That is the
// modifiable areal unit problem, and it is not a subtlety: on the beat this file was written for,
// one unit moves from 23,9 to 1,8 per thousand and back with nothing on the map moving at all,
// because its forty thousand inhabitants are pooled with a neighbour's sixty-eight million.
//
// A still can do exactly one thing about that: pick a grain, print it in the caveat, ask to be
// trusted. This file is the other answer — hand the reader the grain and let them watch the same
// cells, at the same places, under the same legend, say something else.
//
// WHY IT IS ITS OWN FILE AND NOT AN OPTION IN `classing.ts`, WHICH IS THE ONE IT LOOKS LIKE.
//
// The distinction is exact and it decides the drawing. `classing.ts` holds the VALUES still and
// moves the BOUNDS: quantiles, equal intervals, Jenks — the same list of readings cut in a different
// place, which is why its own extra layer is a legend whose numbers change. This file holds the
// BOUNDS still and moves the VALUES. The consequence a reader can see is that a page built on this
// vocabulary has a legend that **does not change between states**: every grain is in the same unit
// and lands in the same classes, so nothing about the key has to be re-learnt when an option is
// pressed. Fold the two together and one of the two halves would have to lie about the other.
//
// `filter.ts` is the second near miss and fails the other way. A filter's promise is that *the marks
// outside a named set LEAVE*. Nothing leaves here: every cell is present, drawn and readable in
// every state, and what changes is what it MEASURES. `area-scale.ts` is the third and cannot even be
// stated on this geometry: every cell of a hex cartogram is the same size on purpose, so there is no
// area to be worth anything.
//
// The chart side's near miss is `unit.ts`, which asks what ONE ICON is worth and whose product is
// HOW MANY icons there are. The population of this picture never changes: there are as many cells as
// there are named units, in every state. What changes is how many cells are added together before
// the division.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// A GRAIN IS EITHER A RE-TESSELLATION OR A MOVING WINDOW, AND THE DIFFERENCE IS NOT COSMETIC.
//
// This vocabulary takes one general shape — for every cell, the list of cells it adds itself to —
// because the two honest ways to coarsen a grid are not the same shape:
//
//   - a PARTITION: named blocks, every cell in exactly one. Its cells' windows are equal to each
//     other, so the blocks have a BOUNDARY, and `poolPartitionOf` hands a beat the block each cell
//     is in so it can draw one.
//   - a WINDOW: each cell pooled with its own neighbours. The windows OVERLAP — a cell is in its
//     own and in five or six others' — so there is no boundary to draw and a beat that drew one
//     would be drawing a partition that does not exist.
//
// `poolPartitionOf` returns `null` for the second kind rather than inventing blocks for it, and the
// beat's derived sentence is where the reader is told which kind they are looking at. A vocabulary
// that only knew partitions would have made the second gesture impossible; one that only knew
// windows would have let a beat outline something that is not there.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT TRAVELS. Nothing on the map moves — a cell's seat is a function of the drawn grid and of no
// grain at all, so the states are the same polygons at the same places with different fills. `fill`
// is a real CSS property on an element that is ALWAYS rendered, which is exactly the shape a
// transition needs (`display` does not interpolate), so the colour runs from one grain's class to
// the next. That is the owner's fourth arbitration honoured by construction rather than excused, and
// it is only available because this gesture changes the aggregation window and NOT the tessellation:
// between two different tessellations a cell has nowhere continuous to travel to, and the honest
// thing would be to say so rather than tween a lie.
//
// The printed numbers cannot interpolate and do not pretend to: they are one `<text>` per grain
// stacked at ONE place, and the stylesheet reveals one. Digits change, nothing moves.
//
// NOTHING IS IMPORTED HERE. A skill directory is copy-pasteable on its own
// (`no-cross-skill-imports.test.ts`), so the control's CHROME — the fieldset, the pill rail, the
// wash-and-ring the owner arbitrated — is not reached for from this file. The beat calls
// `control-chrome.ts` itself and passes `poolFigureCss` in as the extra layer, which is the only
// drawing this vocabulary has ever owned.

/** One cell's reading, kept as the two numbers a pool adds up rather than as the quotient. Keeping
 *  the quotient would make every pooled value a mean of means, which is the exact arithmetic this
 *  whole vocabulary exists to let a reader see through. */
export type PoolCell = {
  key: string;
  /** What is counted — people under protection, events, cases. */
  numerator: number;
  /** What it is counted against — inhabitants, area, anything positive. */
  denominator: number;
};

/** One grain: a name, the sentence it owes the reader, and the window every cell pools over. */
export type PoolGrain = {
  /** The slug source — what the radio's id and the shapes' tokens are built from. */
  key: string;
  /** The pill's own words. */
  label: string;
  /** What a reader who is not looking at the map hears. Must CONTAIN the visible label, which is
   *  the WCAG 2.5.3 "label in name" requirement and not a stylistic preference. */
  announce: string;
  /** The derived sentence revealed with this grain. `null` on the FIRST grain only: the default is
   *  not a counterfactual, it is the claim the title makes. */
  note: string | null;
  /** For every cell that carries a reading, the cells it adds itself to — ITSELF INCLUDED. */
  windows: { cell: string; with: string[] }[];
};

export type PoolDeclaration = {
  /** The `<legend>` — what this control coarsens, in the beat's own words. */
  label: string;
  /** The unit every grain is in. One unit for every grain is what keeps the key true in every
   *  state, and `assertPoolDeclaration` has no way to check it — it is stated so a beat that wanted
   *  to change the unit reads this line and writes a different vocabulary instead. */
  unit: string;
  /** What the quotient is multiplied by before it is classed and printed (1 000, 100 000, 1). */
  scale: number;
  /** The class boundaries, strictly increasing, SHARED BY EVERY GRAIN. */
  breaks: number[];
  cells: PoolCell[];
  /** The first is the default and is the picture the title claims. */
  grains: PoolGrain[];
};

/** A CSS-id-safe slug. The same string becomes the radio's `id`, the token every shape carries and
 *  the token the generated selector quotes — one derivation, for the reason `filter.ts` records at
 *  length under a different name. @parity */
export function poolSlugOf(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio's id for one grain. */
export function poolOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** The token a shape carries for (grain, class). A shape carries ONE PER GRAIN, all of them at
 *  once, and the stylesheet lights the grain in force — which is why there is one rule per
 *  (grain, class) pair rather than one per cell. */
export function poolToken(slug: string, klass: number): string {
  return `${slug}-c${klass}`;
}

/** Which class a value falls in. The same walk the beat's own key prints. @parity */
export function poolClassOf(value: number, breaks: number[]): number {
  let i = 0;
  while (i < breaks.length && value >= breaks[i]) i += 1;
  return i;
}

/** Every cell's POOLED value under one grain: the quotient of the two sums, never the mean of the
 *  quotients. */
export function pooledValues(declaration: PoolDeclaration, grain: PoolGrain): Map<string, number> {
  const cells = new Map(declaration.cells.map((c) => [c.key, c]));
  const out = new Map<string, number>();
  for (const window of grain.windows) {
    let numerator = 0;
    let denominator = 0;
    for (const key of window.with) {
      const cell = cells.get(key);
      if (!cell) continue;
      numerator += cell.numerator;
      denominator += cell.denominator;
    }
    out.set(window.cell, denominator > 0 ? (numerator / denominator) * declaration.scale : NaN);
  }
  return out;
}

/** Every cell's CLASS under one grain. */
export function pooledClasses(declaration: PoolDeclaration, grain: PoolGrain): Map<string, number> {
  const out = new Map<string, number>();
  for (const [key, value] of pooledValues(declaration, grain))
    out.set(key, poolClassOf(value, declaration.breaks));
  return out;
}

/**
 * The BLOCK each cell is in under this grain, or `null` when the grain is a moving window.
 *
 * A grain is a partition exactly when every member of a cell's window has that same window. The
 * block's key is the sorted window itself, so two cells are in one block precisely when they pool
 * over the same set — no names to keep in step with the arithmetic.
 */
export function poolPartitionOf(grain: PoolGrain): Map<string, string> | null {
  const signature = new Map<string, string>();
  for (const window of grain.windows) signature.set(window.cell, [...window.with].sort().join(" "));
  for (const window of grain.windows) {
    const mine = signature.get(window.cell) as string;
    for (const key of window.with) if (signature.get(key) !== mine) return null;
  }
  return signature;
}

/**
 * Refuses, before anything is drawn, every declaration that would render a control that lies.
 *
 * `drawnKeys` is the set of cells the beat actually gives a reading to — the one list the windows
 * and the counts are measured against, so a grain naming a cell that is not on the page is caught
 * here rather than by a reader pressing a pill and getting a hole.
 */
export function assertPoolDeclaration(
  declaration: PoolDeclaration | null | undefined,
  drawnKeys: string[],
  { where = "this beat", changeFloor = 1 }: { where?: string; changeFloor?: number } = {},
): void {
  if (declaration === null || declaration === undefined) return;
  const say = (message: string) => {
    throw new Error(`${where}: ${message}`);
  };

  if (typeof declaration.label !== "string" || !declaration.label.trim())
    say("a pooling control needs a `label` — the dimension it coarsens, in the beat's own words");
  if (typeof declaration.unit !== "string" || !declaration.unit.trim())
    say(
      "a pooling control needs the `unit` every grain is in; one unit for every grain is what lets the key stay true across states",
    );
  if (!(declaration.scale > 0)) say(`\`scale\` must be positive, got ${JSON.stringify(declaration.scale)}`);
  if (!Array.isArray(declaration.breaks) || declaration.breaks.length === 0)
    say("a pooling control classes its values, so it needs `breaks`");
  for (let i = 1; i < declaration.breaks.length; i += 1)
    if (!(declaration.breaks[i] > declaration.breaks[i - 1]))
      say(
        `the breaks ${JSON.stringify(declaration.breaks)} are not strictly increasing, so at least ` +
          "one class is empty by construction and its swatch stands for nothing",
      );

  const drawn = new Set(drawnKeys);
  const cells = new Map<string, PoolCell>();
  for (const cell of declaration.cells) {
    if (cells.has(cell.key)) say(`the cell ${JSON.stringify(cell.key)} is declared twice`);
    if (!drawn.has(cell.key))
      say(`the cell ${JSON.stringify(cell.key)} carries a reading and is not drawn on the page`);
    if (!Number.isFinite(cell.numerator) || cell.numerator < 0)
      say(`${JSON.stringify(cell.key)} has no usable numerator (${JSON.stringify(cell.numerator)})`);
    if (!(cell.denominator > 0))
      say(
        `${JSON.stringify(cell.key)} has a denominator of ${JSON.stringify(cell.denominator)}. A ` +
          "pooled rate divides by the SUM of the denominators, so one that is zero or missing does " +
          "not fail — it silently changes every pool it is in",
      );
    cells.set(cell.key, cell);
  }
  for (const key of drawn)
    if (!cells.has(key))
      say(`${JSON.stringify(key)} is drawn with a reading and declares no numbers to pool`);

  if (!Array.isArray(declaration.grains) || declaration.grains.length < 2)
    say("a pooling control with fewer than two grains is a caption with a radio button on it");

  const slugs = new Set<string>();
  const classMaps: {
    slug: string;
    label: string;
    classes: Map<string, number>;
  }[] = [];
  declaration.grains.forEach((grain, index) => {
    const at = `${where}: grain ${JSON.stringify(grain.label ?? grain.key)}`;
    const fail = (message: string) => {
      throw new Error(`${at} ${message}`);
    };
    const slug = poolSlugOf(grain.key ?? "");
    if (!slug) fail("has no usable key");
    if (slugs.has(slug)) fail(`slugs to ${JSON.stringify(slug)}, which another grain already took`);
    slugs.add(slug);
    if (typeof grain.label !== "string" || !grain.label.trim()) fail("has no visible label");
    if (typeof grain.announce !== "string" || !grain.announce.includes(grain.label))
      fail(
        `has an accessible name that does not contain its visible label ` +
          `(${JSON.stringify(grain.announce)} vs ${JSON.stringify(grain.label)}) — WCAG 2.5.3`,
      );
    if (index === 0) {
      if (grain.note !== null && grain.note !== undefined)
        fail(
          "is the default and carries a sentence. The default is not a counterfactual, it is the claim the title makes",
        );
    } else if (typeof grain.note !== "string" || grain.note.trim().split(/\s+/).length < 5)
      fail("changes the picture and owes the reader a sentence saying what it did");

    const seen = new Set<string>();
    for (const window of grain.windows ?? []) {
      if (!cells.has(window.cell)) fail(`pools a cell ${JSON.stringify(window.cell)} that has no reading`);
      if (seen.has(window.cell)) fail(`gives ${JSON.stringify(window.cell)} two windows`);
      seen.add(window.cell);
      if (!Array.isArray(window.with) || !window.with.includes(window.cell))
        fail(`leaves ${JSON.stringify(window.cell)} out of its own window`);
      for (const key of window.with)
        if (!cells.has(key))
          fail(`pools ${JSON.stringify(window.cell)} with ${JSON.stringify(key)}, which has no reading`);
      const denominator = window.with.reduce((sum, key) => sum + (cells.get(key) as PoolCell).denominator, 0);
      if (!(denominator > 0)) fail(`pools ${JSON.stringify(window.cell)} over a denominator of zero`);
    }
    for (const key of cells.keys())
      if (!seen.has(key))
        fail(
          `never says what ${JSON.stringify(key)} pools over. Its colour would be set by no rule of ` +
            "this grain, so it would keep the one the state before it painted",
        );

    const classes = pooledClasses(declaration, grain);
    const used = new Set(classes.values());
    if (used.size < 2)
      fail(
        `paints all ${classes.size} cells in one class. A map of one colour is not a comparison, ` +
          "and a reader who pressed a pill for it got an empty picture",
      );
    classMaps.push({ slug, label: grain.label, classes });
  });

  const base = classMaps[0];
  for (let i = 1; i < classMaps.length; i += 1) {
    const moved = [...base.classes.keys()].filter(
      (key) => classMaps[i].classes.get(key) !== base.classes.get(key),
    );
    if (moved.length < changeFloor)
      throw new Error(
        `${where}: grain ${JSON.stringify(classMaps[i].label)} moves ${moved.length} cells across a ` +
          `class boundary (floor ${changeFloor}). The reader would press it and watch the map stand ` +
          "still — that is the untouched view under a second name, which this format refuses at the render.",
      );
    for (let j = 0; j < i; j += 1) {
      const same = [...classMaps[i].classes.keys()].every(
        (key) => classMaps[i].classes.get(key) === classMaps[j].classes.get(key),
      );
      if (same)
        throw new Error(
          `${where}: ${JSON.stringify(classMaps[j].label)} and ${JSON.stringify(classMaps[i].label)} ` +
            "paint every cell the same class. Two names for one picture is one option and a spare pill.",
        );
    }
  }
}

/** The tokens one cell carries — one per grain, all at once. The stylesheet lights the grain in
 *  force. Spread onto the shape; never typed by hand, for the reason `filter.ts` records. */
export function poolAttrsFor(
  declaration: PoolDeclaration | null | undefined,
  key: string,
): Record<string, string> {
  if (!declaration) return {};
  const tokens = declaration.grains.map((grain) =>
    poolToken(poolSlugOf(grain.key), pooledClasses(declaration, grain).get(key) ?? 0),
  );
  return { "data-key": key, "data-pool": tokens.join(" ") };
}

/** The options a component draws, in reading order: the default first. */
export function poolOptionsForMarkup(
  declaration: PoolDeclaration | null | undefined,
  idPrefix: string,
): {
  id: string;
  slug: string;
  label: string;
  announce: string;
  isDefault: boolean;
}[] {
  if (!declaration) return [];
  return declaration.grains.map((grain, index) => ({
    id: poolOptionId(idPrefix, poolSlugOf(grain.key)),
    slug: poolSlugOf(grain.key),
    label: grain.label,
    announce: grain.announce,
    isDefault: index === 0,
  }));
}

/** The sentences, default excluded — the rule every sibling vocabulary holds. */
export function poolNotesForMarkup(
  declaration: PoolDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.grains.slice(1).map((grain) => ({
    slug: poolSlugOf(grain.key),
    text: grain.note as string,
  }));
}

/**
 * Every grain's printed value for ONE cell, so a component can stack them at one place and let the
 * stylesheet reveal one. Spans at ONE position, never a span that travels: the owner's first
 * arbitration, and the reason the digits change while nothing moves.
 */
export function poolFiguresForMarkup(
  declaration: PoolDeclaration | null | undefined,
  key: string,
  format: (value: number) => string,
): { slug: string; text: string; klass: number; isDefault: boolean }[] {
  if (!declaration) return [];
  return declaration.grains.map((grain, index) => {
    const value = pooledValues(declaration, grain).get(key) as number;
    return {
      slug: poolSlugOf(grain.key),
      text: format(value),
      klass: poolClassOf(value, declaration.breaks),
      isDefault: index === 0,
    };
  });
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED. `${scope} [data-pool]` and `${scope} [data-pool~="x"]`
 * score identically — an attribute selector with a value is still one attribute selector — so which
 * wins is source order and nothing else; the blanket goes FIRST and the class fills after it. The
 * same pair is emitted again inside each grain's `:has()` scope, where both score one higher, and
 * again blanket first. A sankey on this branch rendered green with zero ribbons lit for getting
 * exactly this backwards.
 *
 * NO SELECTOR HERE IS GROUPED: a descendant prefix binds to the first selector of a group only.
 *
 * AND THE ONE THING THAT TRAVELS IS THE FILL, on polygons that are always rendered and never move.
 */
export function poolCss(
  declaration: PoolDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    fillOf,
    unsetFill,
    ms,
  }: {
    scope: string;
    idPrefix: string;
    fillOf: (klass: number) => string;
    unsetFill: string;
    ms: number;
  },
): string {
  if (!declaration) return "";
  const classCount = declaration.breaks.length + 1;
  const defaultSlug = poolSlugOf(declaration.grains[0].key);
  const lines: string[] = [
    `/* The grain this beat declared: ${declaration.grains.length} windows over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, and the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-pool] { fill: ${unsetFill}; }`,
    `${scope} [data-pool-figure] { display: none; }`,
    `${scope} [data-pool-seam] { opacity: 0; }`,
    `${scope} [data-stack-note] { display: none; }`,
  ];
  const emitFills = (at: string, slug: string) => {
    for (let klass = 0; klass < classCount; klass += 1)
      lines.push(`${at} [data-pool~="${poolToken(slug, klass)}"] { fill: ${fillOf(klass)}; }`);
  };
  emitFills(scope, defaultSlug);
  lines.push(
    `${scope} [data-pool-figure="${defaultSlug}"] { display: inline; }`,
    `${scope} [data-pool-seam="${defaultSlug}"] { opacity: 1; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-pool] { transition: fill ${ms}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `  ${scope} [data-pool-seam] { transition: opacity ${ms}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  );
  for (const grain of declaration.grains) {
    const slug = poolSlugOf(grain.key);
    const at = `${scope}:has(#${poolOptionId(idPrefix, slug)}:checked)`;
    lines.push(`${at} [data-pool] { fill: ${unsetFill}; }`);
    emitFills(at, slug);
    lines.push(
      `${at} [data-pool-figure] { display: none; }`,
      `${at} [data-pool-figure="${slug}"] { display: inline; }`,
      `${at} [data-pool-seam] { opacity: 0; }`,
      `${at} [data-pool-seam="${slug}"] { opacity: 1; }`,
      `${at} [data-stack-note] { display: none; }`,
    );
    if (grain.note) lines.push(`${at} [data-stack-note="${slug}"] { display: revert; }`);
  }
  return lines.join("\n");
}

/**
 * The stacked figures' own layer, and the only drawing this vocabulary has ever owned.
 *
 * EVERY GRAIN'S NUMBER FOR ONE CELL AT ONE PLACE. They are SVG `<text>` at identical coordinates, so
 * there is no box to collapse and nothing to lay out — what this rule buys is the guarantee that a
 * hidden figure is out of the accessibility tree and out of the text layer a screen reader walks,
 * rather than read aloud three times over.
 *
 * The chrome around the control — fieldset, legend, pill rail, the wash and the ring — is NOT here:
 * it is `chart-web/assets/control-chrome.ts`, called by the beat and handed this as its `extra`.
 * One drawing in one place, and a map vocabulary that imports nothing.
 */
export function poolFigureCss({ scope }: { scope: string }): string {
  return `${scope} [data-pool-figure] { pointer-events: none; }
${scope} [data-pool-seam] { pointer-events: none; fill: none; }`;
}

/**
 * IT EMITS `data-stack-note`, WHICH IS NOT A COPY-PASTE SLIP. That string is the format's DISCOVERY
 * CONTRACT for a control that changes the picture and owes the reader a sentence:
 * `interaction-plan.ts` reads the sentence off `data-stack-note`, and `defaultPrintedText` excludes
 * it from what the page prints at rest. The radio ids follow the same contract (`mw-stack-<slug>`).
 * A third grammar with its own spelling would be invisible to the guard written to hold it, exactly
 * as `classing.ts`, `rebase.ts` and `qualify.ts` each record.
 *
 * Reads the WRITTEN PAGE back, which is the only place several of these refusals can be made.
 *
 * `descend.ts` earned this shape of guard by mutation and `aim.ts` paid for it a second time:
 * dropping the stylesheet call left every state drawn on top of every other, every attribute
 * perfectly correct, and every declaration-level check green. A vocabulary a beat brings with it has
 * to check its own rules against the page it actually wrote.
 */
export function assertOnePool(
  html: string,
  declaration: PoolDeclaration | null | undefined,
  { where = "this page" }: { where?: string } = {},
): void {
  if (!declaration) return;
  const slugs = declaration.grains.map((grain) => poolSlugOf(grain.key));
  const defaultSlug = slugs[0];
  const classCount = declaration.breaks.length + 1;
  const legal = new Set<string>();
  for (const slug of slugs) for (let k = 0; k < classCount; k += 1) legal.add(poolToken(slug, k));

  const drawn = [...html.matchAll(/\sdata-pool="([^"]*)"/g)].map((m) => m[1]);
  if (drawn.length === 0)
    throw new Error(
      `${where}: not one element carries \`data-pool\`. The pills would be drawn over a map they ` +
        "cannot reach — the same fact `filter.ts` refuses as an option that tags nothing.",
    );
  for (const attribute of drawn) {
    const tokens = attribute.trim().split(/\s+/).filter(Boolean);
    if (tokens.length !== slugs.length)
      throw new Error(
        `${where}: a cell carries ${tokens.length} tokens and ${slugs.length} grains are declared ` +
          `(${JSON.stringify(attribute)}). A cell missing a grain's token is painted by the blanket ` +
          "in that state, which is a hole the reader reads as a value.",
      );
    for (const token of tokens)
      if (!legal.has(token))
        throw new Error(
          `${where}: the token ${JSON.stringify(token)} is drawn and is generated by no grain — its ` +
            "fill is set by no rule, so it is painted the unset colour in every state at once",
        );
  }

  const need = (needle: string, why: string) => {
    if (!html.includes(needle)) throw new Error(`${where}: ${why} (missing \`${needle}\`)`);
  };
  need(
    "[data-pool-figure] { display: none; }",
    "every grain's number would print at once, three deep on one cell",
  );
  need(
    `[data-pool-figure="${defaultSlug}"] { display: inline; }`,
    "the default map would print no number at all",
  );
  need("[data-pool-seam] { opacity: 0; }", "every grain's block outline would be drawn at once");
  need("[data-stack-note] { display: none; }", "every grain's sentence would print at once");

  // AND THE BLANKETS MUST COME FIRST, WHICH IS A SEPARATE FACT FROM THEIR BEING PRESENT. Two
  // attribute selectors score identically; source order is the entire mechanism.
  const blanketFill = html.search(/\[data-pool\]\s*\{\s*fill:/);
  const firstFill = html.search(/\[data-pool~="[^"]*"\]\s*\{\s*fill:/);
  if (firstFill >= 0 && firstFill < blanketFill)
    throw new Error(
      `${where}: the stylesheet sets a class's own fill BEFORE the blanket that resets them all. ` +
        "The two selectors score identically, so the blanket would win and the map would be painted " +
        "the unset colour in every state.",
    );
  const blanketFigure = html.search(/\[data-pool-figure\]\s*\{\s*display:\s*none/);
  const firstFigure = html.search(/\[data-pool-figure="[^"]*"\]\s*\{\s*display:/);
  if (firstFigure >= 0 && firstFigure < blanketFigure)
    throw new Error(
      `${where}: the stylesheet reveals the default grain's numbers BEFORE the blanket that hides ` +
        "them all, so an engine without `:has()` would be handed every grain's number at once.",
    );

  for (const slug of slugs) {
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(html))
      throw new Error(
        `${where}: nothing in the page's stylesheet reveals the grain ${JSON.stringify(slug)}. A ` +
          "vocabulary a beat brings with it has to emit its own rules: without them every state is " +
          "drawn on top of every other and every attribute is still perfectly correct.",
      );
    const at = `:has\\(#[\\w-]*${slug}:checked\\)`;
    if (!new RegExp(`${at} \\[data-pool\\] \\{ fill:`).test(html))
      throw new Error(
        `${where}: choosing ${JSON.stringify(slug)} would leave the grain before it painted under ` +
          "it — the option's own blanket is missing, and the two states would be drawn on top of each other",
      );
    if (!new RegExp(`${at} \\[data-pool~="${slug}-c\\d+"\\] \\{ fill:`).test(html))
      throw new Error(`${where}: choosing ${JSON.stringify(slug)} would paint no class at all`);
    if (!new RegExp(`${at} \\[data-pool-figure="${slug}"\\]`).test(html))
      throw new Error(`${where}: choosing ${JSON.stringify(slug)} would print no number`);
    if (!html.includes(`data-pool-figure="${slug}"`))
      throw new Error(
        `${where}: the grain ${JSON.stringify(slug)} is declared and no cell on the page carries its number`,
      );
  }
  for (const grain of declaration.grains.slice(1)) {
    const slug = poolSlugOf(grain.key);
    if (!new RegExp(`:has\\(#[\\w-]*${slug}:checked\\) \\[data-stack-note="${slug}"\\]`).test(html))
      throw new Error(`${where}: choosing ${JSON.stringify(grain.label)} would reveal no sentence`);
  }
}
