// twin/skills/map-web/assets/classing.ts
//
// THE RULE THAT CUTS THE CLASSES, HANDED TO THE READER.
//
// WHY THIS FILE EXISTS, and why it is a MAP vocabulary rather than a nineteenth chart one.
//
// A choropleth does not show numbers. It shows a PARTITION of numbers — somebody's decision, taken
// before the drawing, about where one colour stops and the next begins. The reader never sees that
// decision. They see its result, and they read it as a property of the world: "those are the dark
// countries." On the forty readings the beat this file was written for carries, the darkest band
// holds SEVEN countries under the stated threshold the headline names, TEN under quantiles, and
// THIRTEEN under equal intervals and under Fisher-Jenks alike — three standard rules, two of them
// the default of any mapping tool. The sentence's seven and the map's seven are not the same fact,
// and no still can say so: a still IS one of the four maps, and nothing in it records that there
// were three others.
//
// `skills/map-beat/references/types/choropleth.md` states the rule for the diverging case and
// states it as a rule about DECLARATION rather than about hues: a midpoint "has to be declared
// explicitly, not left to whatever the min/max happen to produce". A sequential scale does not
// escape it. Its bounds are produced by something too, and that something is written nowhere on the
// map. This vocabulary writes all of them, and lets the reader put each one in turn on the page.
//
// WHAT A BEAT DECLARES. One object: the rules, in reading order, the first-class count they all
// share, and which of them the plate itself is drawn in.
//
//     classing: {
//       label: "Règle de classement",
//       classes: 4,
//       defaultKey: "seuil",
//       rules: [
//         { key: "seuil", label: "Seuil énoncé", announce: "…", breaks: [50, 70, 94],
//           bounds: ["moins de 50 %", …], note: null },
//         { key: "quantiles", …, breaks: [46.07, 69.16, 86.02], note: "Quantiles — …" },
//         …
//       ],
//     }
//
// A RULE, NOT A SLIDER. The reader picks the rule, never the bounds one at a time. A rule is an
// editorial object that can be named and defended — "quantiles", "equal intervals", "the threshold
// the headline states" — where a dragged bound is a partition nobody has to stand behind. It also
// costs a script, a keyboard story and a no-JavaScript story, all of which named bands give for
// nothing; `filter.ts` takes the same decision for the same reason, in its own words ("a threshold
// as a set of named bands is a real control a reader can operate from the keyboard with no
// script").
//
// WHAT IT EMITS, AND IT IS DELIBERATELY ALMOST NOTHING. A `fill` on a shape, a custom property on
// the same shape for what that shape becomes under a pointer, and which of the legend's stacked
// bound labels is visible. IT CANNOT MOVE ANYTHING, and that is structural rather than promised:
// there is no field in this file's types where a position could be declared. The owner's first
// arbitration — "nothing moves without the reader seeing why" — is harder on a map than on a chart,
// because a map mark's position is DATA. A classing control that could nudge a country would be
// answering a question about colour by moving a place.
//
// THE LEGEND'S BOUNDS ARE THE ONE PIECE OF TEXT THAT CHANGES, and they change IN PLACE. Every
// rule's label for a class sits in the same grid cell (`classingKeyCss`), so a legend chip is as
// wide as the LONGEST of its rules' labels and the row cannot reflow when the reader changes their
// mind. The text changes for a reason the reader asked for one keystroke earlier; the rank of chips
// it sits in does not move at all.
//
// THE SENTENCES ARE HIDDEN BY `visibility` AND NOT BY `display`, WHICH IS THIS FILE'S ONE DEPARTURE
// FROM ITS SIBLINGS, AND IT IS A MEASUREMENT. Every vocabulary before it hides a note with `display:
// none` and then buys the row back with a `min-height` reserved on the chrome, so that revealing a
// sentence never pushes the drawing down. A `display: none` note contributes nothing to a grid cell,
// so the reserve has to cover the sentence at the NARROWEST width the beat is verified at — and it
// then costs that much at every width. Measured here: 4,2em of reserve held the note at 375 px and
// left 55 px of empty page between the control and the map at 1280 px, which reads as a hole rather
// than as a promise. Hidden by `visibility`, every sentence still SIZES the stacked cell, so the row
// is exactly as tall as the longest sentence at the reader's own width, at every width, and the map
// still never moves. The accessibility tree loses the hidden sentences either way, which is what a
// screen reader needs: the rule in force, and no other.
//
// IT EMITS `data-stack-note`, WHICH IS NOT A COPY-PASTE SLIP. That string is the format's DISCOVERY
// CONTRACT for a control that changes the picture and owes the reader a sentence:
// `interaction-plan.ts` reads the sentence off `data-stack-note` and `defaultPrintedText` excludes
// it from what the page prints at rest. A third grammar with its own spelling would be invisible to
// the guard written to hold it, exactly as `rebase.ts` and `qualify.ts` record.
//
// NOTHING IS IMPORTED HERE. A skill directory is copy-pasteable on its own
// (`no-cross-skill-imports.test.ts`), so the control's CHROME — the fieldset, the pill rail, the
// wash-and-ring the owner arbitrated — is not reached for from this file. The beat calls
// `control-chrome.ts` itself and passes `classingKeyCss` in as the extra layer, which is the only
// drawing this vocabulary has ever owned.

/** One rule for cutting the readings into classes. */
export type ClassingRule = {
  /** The slug source — what the radio's id and the shapes' tokens are built from. */
  key: string;
  /** The pill's own words. */
  label: string;
  /** What a reader who is not looking at the map hears. Must CONTAIN the visible label, which is
   *  the WCAG 2.5.3 "label in name" requirement, not a stylistic preference. */
  announce: string;
  /** The lower bound of every class but the lowest — `classes - 1` numbers, strictly ascending. */
  breaks: number[];
  /** What the legend prints for each class, lightest first. `classes` strings. */
  bounds: string[];
  /** The derived sentence this rule owes the reader, or `null` for the rule the plate is drawn in —
   *  that one is not a comparison, it IS the claim, and a sentence under it would restate the
   *  plate. Same bargain `filterNotes` strikes with its unfiltered option. */
  note: string | null;
};

/** What a beat declares when it hands the reader the cut. Absent means it declares none. */
export type ClassingDeclaration = {
  /** The `<legend>` — in the beat's own words. */
  label: string;
  /** How many classes every rule cuts. One number, shared, because the legend stacks its bounds in
   *  a fixed rank of chips. */
  classes: number;
  /** Which rule the plate itself is drawn in, and the state a reader who touches nothing sees. */
  defaultKey: string;
  rules: ClassingRule[];
};

/** One reading the rules partition: the shape's own key and the number the classing reads. */
export type ClassingReading = { key: string; value: number };

/** A CSS-id-safe slug. One function, because the radio's id, the token a shape carries, the token
 *  the generated selector quotes and the slug a note is revealed by are the SAME string — and the
 *  last time one repository derived such a string two ways a whole map emptied with nothing red
 *  (`filter.ts`, `slugOf`). */
export function classingSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for a rule's slug. */
export function classingOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** The token a shape carries for one rule and one class. */
export function classingToken(slug: string, klass: number): string {
  return `${slug}-${klass}`;
}

/**
 * WHICH CLASS A READING FALLS IN. Lower bounds, so a value exactly ON a break belongs to the class
 * the break opens — which is what "94 % et plus" says on the legend and what the headline counts.
 */
export function classOf(value: number, breaks: number[]): number {
  let i = 0;
  while (i < breaks.length && value >= breaks[i]) i += 1;
  return i;
}

/** How many readings each rule puts in each class: `[rule][class]`. Exported so a beat's legend and
 *  a beat's sentences count the same way this file's own refusals do. */
export function classingCounts(
  declaration: ClassingDeclaration,
  readings: ClassingReading[],
): number[][] {
  return declaration.rules.map((rule) => {
    const counts = new Array(declaration.classes).fill(0);
    for (const reading of readings) counts[classOf(reading.value, rule.breaks)] += 1;
    return counts;
  });
}

/**
 * Refuses every declaration that would draw a control that lies, before anything is rendered.
 *
 * `readings` is what the beat actually classes — the one list the counts, the emptiness checks and
 * the "this rule is the default under a second name" check are all measured against.
 */
export function assertClassingDeclaration(
  declaration: ClassingDeclaration,
  readings: ClassingReading[],
): void {
  const where = "classing declaration";
  if (!declaration || typeof declaration !== "object" || Array.isArray(declaration))
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);
  if (typeof declaration.label !== "string" || !declaration.label.trim())
    throw new Error(
      `${where}: \`label\` must be the beat's own words — a rule picker with no legend renders an ` +
        `unnamed control, and a reader has no way to learn that the colours were a choice`,
    );
  if (!Number.isInteger(declaration.classes) || declaration.classes < 3)
    throw new Error(
      `${where}: \`classes\` must be an integer of at least 3, got ${JSON.stringify(declaration.classes)}. ` +
        `Two classes is a threshold map, which is a different type with a different honesty story.`,
    );
  if (!Array.isArray(declaration.rules) || declaration.rules.length < 2)
    throw new Error(
      `${where}: needs at least two rules to be a choice, got ${declaration.rules?.length ?? 0}. ` +
        `A beat that wants one classing declares none and draws it.`,
    );
  if (!Array.isArray(readings) || readings.length === 0)
    throw new Error(`${where}: there are no readings to class`);
  const keys = new Set(readings.map((r) => r.key));
  if (keys.size !== readings.length)
    throw new Error(`${where}: the classed readings are not unique by key`);
  for (const reading of readings)
    if (!Number.isFinite(reading.value))
      throw new Error(
        `${where}: the reading ${JSON.stringify(reading.key)} is ${JSON.stringify(reading.value)} — ` +
          `a shape with no reading is drawn as MISSING and left out of every rule, never handed to ` +
          `one as a number it is not`,
      );

  const seen = new Map<string, string>();
  for (const rule of declaration.rules) {
    if (typeof rule?.key !== "string" || !rule.key.trim())
      throw new Error(`${where}: every rule needs a key — got ${JSON.stringify(rule)}`);
    const slug = classingSlugOf(rule.key);
    if (!slug)
      throw new Error(
        `${where}: the rule ${JSON.stringify(rule.key)} slugs to an empty string — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `${where}: ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(rule.key)} both slug to ` +
          `${JSON.stringify(slug)} — one radio would cut the map two ways`,
      );
    seen.set(slug, rule.key);

    for (const field of ["label", "announce"] as const)
      if (typeof rule[field] !== "string" || !rule[field].trim())
        throw new Error(
          `${where}: rule ${JSON.stringify(rule.key)} has no \`${field}\` — a pill with no words is ` +
            `a control nobody can operate and nobody can hear`,
        );
    if (!rule.announce.includes(rule.label))
      throw new Error(
        `${where}: rule ${JSON.stringify(rule.key)} announces ${JSON.stringify(rule.announce)}, ` +
          `which does not contain its visible label ${JSON.stringify(rule.label)}. A reader who says ` +
          `what they see cannot then operate the control they see (WCAG 2.5.3).`,
      );

    if (!Array.isArray(rule.breaks) || rule.breaks.length !== declaration.classes - 1)
      throw new Error(
        `${where}: rule ${JSON.stringify(rule.key)} declares ${rule.breaks?.length ?? 0} break(s) ` +
          `where ${declaration.classes} classes need ${declaration.classes - 1}. Rules that cut a ` +
          `different number of classes cannot share one legend, and a legend whose rank of chips ` +
          `changes length is a legend that MOVES when the reader chooses — the one thing this ` +
          `control may never do.`,
      );
    for (let i = 0; i < rule.breaks.length; i += 1) {
      if (!Number.isFinite(rule.breaks[i]))
        throw new Error(
          `${where}: rule ${JSON.stringify(rule.key)} break ${i + 1} is ${JSON.stringify(rule.breaks[i])}`,
        );
      if (i > 0 && !(rule.breaks[i] > rule.breaks[i - 1]))
        throw new Error(
          `${where}: rule ${JSON.stringify(rule.key)} has breaks ${JSON.stringify(rule.breaks)}, which ` +
            `do not ascend. A class whose lower bound is under the one before it is a class no ` +
            `reading can fall in, drawn in the legend all the same.`,
        );
    }

    if (!Array.isArray(rule.bounds) || rule.bounds.length !== declaration.classes)
      throw new Error(
        `${where}: rule ${JSON.stringify(rule.key)} prints ${rule.bounds?.length ?? 0} bound label(s) ` +
          `for ${declaration.classes} classes. The legend needs the actual bin boundaries as NUMBERS ` +
          `and not only swatches — a reader who cannot reliably tell the ramp's steps apart gets the ` +
          `value from the label or not at all (types/choropleth.md, "The accessibility trap").`,
      );
    for (const bound of rule.bounds)
      if (typeof bound !== "string" || !bound.trim())
        throw new Error(
          `${where}: rule ${JSON.stringify(rule.key)} has an empty bound label — one class of the ` +
            `legend would be a colour with nothing beside it`,
        );

    if (rule.note !== null && (typeof rule.note !== "string" || !rule.note.trim()))
      throw new Error(
        `${where}: rule ${JSON.stringify(rule.key)} has a \`note\` that is neither null nor a ` +
          `sentence — got ${JSON.stringify(rule.note)}`,
      );
  }

  const defaultSlug = classingSlugOf(declaration.defaultKey ?? "");
  const defaultRule = declaration.rules.find((r) => classingSlugOf(r.key) === defaultSlug);
  if (!defaultRule)
    throw new Error(
      `${where}: \`defaultKey\` is ${JSON.stringify(declaration.defaultKey)}, which is none of the ` +
        `declared rules (${declaration.rules.map((r) => r.key).join(", ")}). The default is the state ` +
        `a reader who touches nothing sees and the state a reader with no \`:has()\` never leaves; it ` +
        `cannot be a rule the page does not carry.`,
    );
  if (defaultRule.note !== null)
    throw new Error(
      `${where}: the default rule ${JSON.stringify(defaultRule.key)} carries a note. The untouched ` +
        `plate is not a comparison with anything — it IS the claim — and a sentence under it restates ` +
        `what the page already prints.`,
    );
  for (const rule of declaration.rules)
    if (rule !== defaultRule && rule.note === null)
      throw new Error(
        `${where}: rule ${JSON.stringify(rule.key)} reveals no sentence. A rule that re-cuts the map ` +
          `and says nothing leaves the reader to eyeball which shapes moved, and leaves the only ` +
          `channel its derived readings live on empty.`,
      );

  const counts = classingCounts(declaration, readings);
  const partitions = new Map<string, string>();
  declaration.rules.forEach((rule, index) => {
    const empty = counts[index].findIndex((n) => n === 0);
    if (empty >= 0)
      throw new Error(
        `${where}: rule ${JSON.stringify(rule.key)} leaves class ${empty + 1} of ${declaration.classes} ` +
          `empty over the ${readings.length} readings. The legend would print a colour the map paints ` +
          `nowhere, which a reader reads as "no country here" when it means "this rule cannot make ` +
          `four groups out of this file".`,
      );
    const signature = readings
      .map((reading) => `${reading.key}:${classOf(reading.value, rule.breaks)}`)
      .join("|");
    const twin = partitions.get(signature);
    if (twin)
      throw new Error(
        `${where}: rules ${JSON.stringify(twin)} and ${JSON.stringify(rule.key)} put every one of the ` +
          `${readings.length} readings in the same class — two pills for one picture. ` +
          `${twin === defaultRule.key ? "That is the plate under a second name, " : ""}and a control ` +
          `whose state equals another's is a control the reader operates while nothing changes.`,
      );
    partitions.set(signature, rule.key);
  });
}

/**
 * The index every other function reads: a reading's key -> its class under each rule, in declaration
 * order. Built ONCE and threaded, so the token a shape carries, the selector the stylesheet quotes
 * and the count a sentence prints cannot be derived three ways.
 */
export function buildClassingIndex(
  declaration: ClassingDeclaration | null | undefined,
  readings: ClassingReading[],
): Map<string, number[]> {
  const index = new Map<string, number[]>();
  if (!declaration) return index;
  assertClassingDeclaration(declaration, readings);
  for (const reading of readings)
    index.set(
      reading.key,
      declaration.rules.map((rule) => classOf(reading.value, rule.breaks)),
    );
  return index;
}

/**
 * THE ONE THING A COMPONENT CALLS FOR A SHAPE. Spread it onto the shape every classed reading is
 * drawn as. A shape that does not carry it keeps whatever the rule before it gave it while its
 * neighbours re-shade — the map version of the defect `filter.ts` records as B6.18b, where a filter
 * hid the marks and left their labels on the map.
 *
 * A shape with NO reading gets nothing: a missing reading is drawn as missing, and it is not in any
 * rule's partition.
 */
export function classingAttrs(
  index: Map<string, number[]>,
  declaration: ClassingDeclaration | null | undefined,
  key: string,
): Record<string, string> {
  if (!declaration || index.size === 0) return {};
  const classes = index.get(key);
  if (!classes)
    throw new Error(
      `classing: nothing was classed for the key ${JSON.stringify(key)} — classingAttrs was called ` +
        `with a key the index does not know, so the shape would keep one rule's colour under all of them`,
    );
  return {
    "data-classing": declaration.rules
      .map((rule, i) => classingToken(classingSlugOf(rule.key), classes[i]))
      .join(" "),
  };
}

/** The options a component draws, in declaration order. */
export function classingOptionsForMarkup(
  declaration: ClassingDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isDefault: boolean }[] {
  if (!declaration) return [];
  const defaultSlug = classingSlugOf(declaration.defaultKey);
  return declaration.rules.map((rule) => {
    const slug = classingSlugOf(rule.key);
    return {
      id: classingOptionId(idPrefix, slug),
      slug,
      label: rule.label,
      announce: rule.announce,
      isDefault: slug === defaultSlug,
    };
  });
}

/** Every sentence a rule owes the reader, by the slug that reveals it. The default has none. */
export function classingNotesForMarkup(
  declaration: ClassingDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.rules
    .filter((rule) => rule.note !== null)
    .map((rule) => ({ slug: classingSlugOf(rule.key), text: rule.note as string }));
}

/**
 * The legend, class by class: for each class, every rule's own label for it. A component draws all
 * of them, stacked in one grid cell, and the stylesheet reveals one. That is what keeps a legend
 * chip as wide as the longest of its four labels so the rank never reflows.
 */
export function classingBoundsForMarkup(
  declaration: ClassingDeclaration | null | undefined,
): { slug: string; text: string }[][] {
  if (!declaration) return [];
  return Array.from({ length: declaration.classes }, (_, klass) =>
    declaration.rules.map((rule) => ({
      slug: classingSlugOf(rule.key),
      text: rule.bounds[klass],
    })),
  );
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational.
 *
 * THE DEFAULT RULE IS EMITTED TWICE ON PURPOSE. Once unscoped, which is the state an engine with no
 * `:has()` support never leaves and the state the SSR'd page opens in; once under its own
 * `:has(#…:checked)`, so every rule is reached by the identical mechanism and none of them is a
 * special case that could drift.
 *
 * THE POINTER RULE IS EMITTED ONCE PER RULE, AFTER THAT RULE'S FILLS, AND IT HAS TO BE.
 * `.chart-figure:has(#chart-stack-quantiles:checked) [data-classing~="quantiles-3"]` scores (1,3,0);
 * the format's own `.mark-active { fill: var(--mark-active) }` scores (0,1,0) and a beat's scoped
 * `.chart-figure [data-mark].mark-active` scores (0,3,0). Both LOSE to a classing rule, so without a
 * `:has()`-scoped twin at (1,4,0) the shape a reader points at would keep its class colour under
 * every rule but the default, and a hover that works in the state an author happens to test would be
 * dead in the other three.
 *
 * NO SELECTOR HERE IS GROUPED, for the defect `stack.ts` records at length: a descendant prefix
 * binds to the first selector of a group only.
 */
export function classingCss(
  declaration: ClassingDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    fillOf,
    activeOf,
    changeMs,
  }: {
    scope: string;
    idPrefix: string;
    /** What a shape in this class is painted — the beat's own measured colour, never named here. */
    fillOf: (klass: number) => string;
    /** What a shape in this class becomes under a pointer — also the beat's, also measured. */
    activeOf: (klass: number) => string;
    /** How long a shape takes to cross from one class's colour to the next. Honoured only under
     *  `no-preference`: the travel is the reading here, so a reader who asked for no motion gets
     *  the new partition instantly rather than not at all. */
    changeMs: number;
  },
): string {
  if (!declaration) return "";
  if (!Number.isFinite(changeMs) || changeMs < 0)
    throw new Error(`classing: changeMs must be a non-negative number, got ${changeMs}`);

  const defaultSlug = classingSlugOf(declaration.defaultKey);
  const lines: string[] = [
    `/* The classing this beat declared: ${declaration.rules.length} rules over`,
    `   ${JSON.stringify(declaration.label)}, all cutting ${declaration.classes} classes. Radios plus`,
    `   :checked/:has(), generated once at build time — the same mechanism filter.ts narrows with,`,
    `   and the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-stack-note] { visibility: hidden; }`,
    `${scope} [data-classing-bound] { opacity: 0; visibility: hidden; }`,
  ];

  const paint = (on: string, slug: string) => {
    for (let klass = 0; klass < declaration.classes; klass += 1)
      lines.push(
        `${on} [data-classing~="${classingToken(slug, klass)}"] { fill: ${fillOf(klass)}; --mark-active: ${activeOf(klass)}; }`,
      );
  };

  // The state the page opens in, and the only state an engine without `:has()` ever draws.
  paint(scope, defaultSlug);
  lines.push(`${scope} [data-classing-bound="${defaultSlug}"] { opacity: 1; visibility: visible; }`);
  lines.push(`${scope} [data-mark].mark-active { fill: var(--mark-active); }`);

  for (const rule of declaration.rules) {
    const slug = classingSlugOf(rule.key);
    const on = `${scope}:has(#${classingOptionId(idPrefix, slug)}:checked)`;
    lines.push(`${on} [data-classing-bound] { opacity: 0; visibility: hidden; }`);
    paint(on, slug);
    lines.push(`${on} [data-classing-bound="${slug}"] { opacity: 1; visibility: visible; }`);
    lines.push(`${on} [data-mark].mark-active { fill: var(--mark-active); }`);
    if (rule.note !== null) lines.push(`${on} [data-stack-note="${slug}"] { visibility: visible; }`);
  }

  // THE TRAVEL IS THE READING. Forty shapes cross the ramp together and only the ones the new rule
  // moved actually travel, so which countries changed class is visible as MOTION and not only as a
  // before-and-after a reader has to hold in their head. The pointed-at shape is exempted on the way
  // IN — a hover that faded in over a quarter of a second reads as lag, not as an answer — and takes
  // the travel on the way back out, where it reads as the shape returning to its class.
  lines.push(
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-classing] { transition: fill ${changeMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `  ${scope} [data-classing].mark-active { transition: none; }`,
    `  ${scope} [data-classing-bound] { transition: opacity ${changeMs}ms ease, visibility ${changeMs}ms; }`,
    `}`,
  );
  return lines.join("\n");
}

/**
 * The legend's own layer, and the only drawing this vocabulary has ever owned.
 *
 * EVERY RULE'S LABEL FOR A CLASS IN ONE GRID CELL. A chip is therefore as wide as the LONGEST of
 * them, whichever is showing, and the rank of chips cannot reflow when the reader changes rule —
 * the owner's first arbitration, held by the drawing rather than by a promise. `visibility` and not
 * `display`, so the hidden labels leave the accessibility tree (a screen reader is told the bounds
 * of the rule in force and no other) while the property stays one a transition can interpolate.
 *
 * The chrome around the control — fieldset, legend, pill rail, the wash and the ring — is NOT here:
 * it is `chart-web/assets/control-chrome.ts`, called by the beat and handed this as its `extra`.
 * One drawing in one place, and a map vocabulary that imports nothing.
 */
export function classingKeyCss({ scope }: { scope: string }): string {
  return `${scope} .classing-bounds { display: grid; align-items: center; }
${scope} .classing-bounds > [data-classing-bound] { grid-area: 1 / 1; white-space: nowrap; }`;
}

/**
 * Reads the WRITTEN PAGE back, which is the only place three of these refusals can be made.
 *
 * `descend.ts` earned the first by mutation — dropping the stylesheet call left every attribute
 * perfectly correct and every shape the same colour under every rule. The ordering checks are the
 * same family: a rule that is emitted, correct and BEATEN is indistinguishable from one that works,
 * in the markup and in a unit test alike.
 */
export function assertOneClassing(
  html: string,
  declaration: ClassingDeclaration | null | undefined,
  index: Map<string, number[]>,
  { where = "this page" }: { where?: string } = {},
): void {
  if (!declaration) {
    const stray = String(html).match(/\sdata-classing(?:-bound)?=/);
    if (stray)
      throw new Error(
        `${where}: this beat declares no classing, but its markup carries a ${stray[0].trim()} ` +
          `attribute — declare the control or drop the attribute; a residue is how a beat ends up ` +
          `with a control nobody can operate`,
      );
    return;
  }
  const slugs = declaration.rules.map((rule) => classingSlugOf(rule.key));

  let tagged = 0;
  for (const tag of String(html).matchAll(/<[a-zA-Z][^>]*>/g)) {
    const carried = tag[0].match(/\sdata-classing="([^"]*)"/);
    if (!carried) continue;
    tagged += 1;
    const mark = tag[0].match(/\sdata-mark="([^"]*)"/);
    if (!mark)
      throw new Error(
        `${where}: an element carries data-classing="${carried[1]}" and no data-mark, so it re-shades ` +
          `with the rule and answers no pointer — ${tag[0].slice(0, 120)}`,
      );
    const classes = index.get(mark[1]);
    if (!classes)
      throw new Error(
        `${where}: an element is classed under data-mark="${mark[1]}", which is not one of the ` +
          `${index.size} classed readings`,
      );
    const expected = declaration.rules
      .map((rule, i) => classingToken(classingSlugOf(rule.key), classes[i]))
      .join(" ");
    if (carried[1] !== expected)
      throw new Error(
        `${where}: the shape ${JSON.stringify(mark[1])} carries data-classing="${carried[1]}" where ` +
          `the index says "${expected}" — two derivations of one string is how half a map re-shades ` +
          `and the other half keeps the rule before it`,
      );
  }
  if (tagged !== index.size)
    throw new Error(
      `${where}: ${index.size} readings are classed and ${tagged} element(s) carry data-classing. ` +
        `Every classed reading is drawn as exactly one shape that re-shades; a reading with no shape ` +
        `is a country that keeps one rule's colour under all four.`,
    );

  for (const slug of slugs)
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(html))
      throw new Error(
        `${where}: nothing in the page's stylesheet answers the rule ${JSON.stringify(slug)}. A ` +
          `vocabulary a beat brings with it has to emit its own rules: without them every shape keeps ` +
          `the default colour and every attribute is still perfectly correct.`,
      );

  const blanket = html.search(/\[data-classing-bound\]\s*\{\s*opacity:\s*0/);
  if (blanket < 0)
    throw new Error(
      `${where}: the stylesheet carries no blanket rule hiding every bound label, so the legend would ` +
        `print all ${declaration.rules.length} rules' bounds on top of one another. This is the rule ` +
        `that must be emitted FIRST — two attribute selectors score identically and source order is ` +
        `the whole mechanism.`,
    );
  const firstShown = html.search(/\[data-classing-bound="[^"]*"\]\s*\{\s*opacity:\s*1/);
  if (firstShown >= 0 && firstShown < blanket)
    throw new Error(
      `${where}: the stylesheet reveals a bound label BEFORE the blanket rule that hides them all. ` +
        `Two attribute selectors score identically, so source order is the whole mechanism — and an ` +
        `engine without \`:has()\`, which is the only engine the base pair ever decides anything for, ` +
        `would be shown every rule's bounds at once, stacked on one another.`,
    );

  for (const slug of slugs) {
    const lastFill = html.lastIndexOf(`${slug}:checked) [data-classing~=`);
    const pointer = html.indexOf(`${slug}:checked) [data-mark].mark-active`);
    if (pointer < 0)
      throw new Error(
        `${where}: the rule ${JSON.stringify(slug)} has no pointer rule of its own. A classing ` +
          `selector scores (1,3,0) and the beat's scoped .mark-active scores (0,3,0), so under this ` +
          `rule the shape a reader points at would keep its class colour and answer nothing.`,
      );
    if (lastFill >= 0 && pointer < lastFill)
      throw new Error(
        `${where}: the rule ${JSON.stringify(slug)} paints its classes AFTER its pointer rule. The two ` +
          `selectors differ only by (1,4,0) against (1,3,0) — emitted the other way round the pointer ` +
          `still loses, and a hover that works under the default is dead under this rule.`,
      );
  }
}
