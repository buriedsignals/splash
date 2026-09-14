// twin/skills/chart-web/assets/floor.ts
//
// THE EIGHTH THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what it may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT OF A SUM. `fold.ts`
// says what may be LAID OVER what is drawn. `brush.ts` says what may be SELECTED ON AN AXIS.
// `trace.ts` says what may be FOLLOWED THROUGH it. This file says what the picture may STAND ON —
// which of a stack's bands is laid flat, so that the one thing a free baseline takes away comes
// back. All eight are native radio inputs plus CSS generated at build time (`:checked` and `:has()`
// on the enclosing figure, no listener, no state, not one byte of JavaScript), because that is the
// only kind of control this format can promise still works with the script absent.
//
// WHY IT IS AN EIGHTH FILE AND NOT AN OPTION IN `stack.ts`, WHICH IS THE ONE IT LOOKS LIKE.
//
// `proof/webx-electricity-mix` answered the moving-floor trap on a 100 %-stacked column by letting
// the reader choose which band sits on the baseline, and it did so with `stack.ts`, whose whole
// vocabulary for "where a member goes" is a `StackedColumn { key, dx, dy }`: ONE RIGID DISPLACEMENT
// PER MEMBER. That is exactly right for a column, whose members are discrete and whose re-basing is
// a translation.
//
// A STREAM'S RE-BASING IS NOT A TRANSLATION. IT IS A SHEAR. To lay a band flat, every step of the
// plate must move by a DIFFERENT amount — precisely `-bottom(x)` — and the spread of those amounts
// inside a single band is routinely larger than the band itself. Measured on the beat this file was
// written for (`proof/web-streamgraph-swiss-electricity`, 900 x 400 viewBox, 4,5936 units per TWh):
// laying Swiss solar flat asks for 61,2 units of lift at 2000 and 104,0 at 2025 — a 42,8-unit
// spread within one band, against that band's entire 25-year growth of 36,2 units. A single `dy`
// would be wrong by more than the thing the control exists to show, in the middle of the band the
// headline is about. So the gesture transfers from `stack.ts` and the vocabulary cannot.
//
// AND THE SECOND HALF, WHICH NO OTHER FILE HAS A PLACE FOR: A FLATTENED BAND EARNS AN AXIS.
//
// `a-free-baseline-forbids-a-value-axis` is a real treatment and a streamgraph spends it honestly:
// with the baseline wandering, no band is measured from a fixed zero, so a value axis would be a
// lie and the plate carries none. The moment the reader lays a band flat, that stops being true FOR
// THAT BAND — its floor IS a fixed zero — and the axis the type forbids becomes legal for exactly
// as long as the option is chosen. That is what this control is FOR, and it is why the declaration
// carries graduations: an option that moves the picture without handing back a number would be a
// rearrangement, not a reading.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     floor: {
//       label: "Poser au sol",                  // the <legend> — the beat's own words
//       noneLabel: "La silhouette",             // the untouched option's words. Always first,
//                                               // always the default, and it IS the picture the
//                                               // page ships in.
//       carries: [{ key: "Hydropower", y: 253.1 }, …],  // the overlay words every option
//                                               // re-places, at their places in the DEFAULT picture
//       options: [
//         {
//           key: "Solar",                       // the band laid flat
//           label: "le solaire",                // the pill's words
//           announce: "Poser le solaire au sol — …",  // must CONTAIN `label` (WCAG 2.5.3)
//           note: "Le solaire sur son propre zéro : …",// the sentence revealed under the control
//           shift: [ -61.2, …, -104.0 ],        // the shear, per step, in geometry units
//           ruleY: 68.3,                        // the straight floor, in geometry units
//           ticks: [{ value: 0, y: 68.3, text: "0" }, …],
//           carries: [{ key: "Solar", y: 50.2 }, …],  // where each carried word goes
//         },
//         …
//       ],
//     }
//
// EVERY NUMBER IS IN THE GEOMETRY'S OWN UNITS, never in CSS pixels, for the reason `stack.ts` and
// `brush.ts` both state at length: a `chart-web` `<svg>` carries `preserveAspectRatio="none"`, so a
// `viewBox` unit is a different number of reader pixels at every width.
//
// AND NOTHING HERE EMITS A `transform`. Each option's plate is DRAWN ONCE, at its own sheared
// place, and the stylesheet only reveals it — the discipline `fold.ts` and `level.ts` already hold,
// and for the reason `stack.ts` records as "the defect that driving found": `interaction.mjs`
// resolves the mark under a pointer off `cx`/`cy` read once at init, which no CSS transform ever
// changes. A control that needs no transform does not get to re-open that hole. The one consequence
// a beat must accept is that its hit points have to sit at coordinates NO option moves — which on a
// stream means one point per step, at its own x, since x is the axis a shear never touches.
//
// WHAT IS REFUSED, AND WHY EACH ONE IS A PICTURE THAT WOULD LIE.
//
//   - A CONSTANT SHIFT. A band already resting on a straight line is laid flat by doing nothing, so
//     its option renders the default under a second name — which `directed-interaction.md` refuses
//     outright. It is arithmetic here rather than a judgement: max(shift) - min(shift) must exceed
//     half a geometry unit.
//   - A SHEARED PLATE THAT LEAVES THE FRAME. A shear moves the whole stack; an option whose stack
//     no longer fits is half a picture with a caption, which is the same sentence `stack.ts` refuses
//     a short tower with.
//   - AN AXIS NOBODY CAN READ, and this is the refusal this file exists to make. Two graduations
//     spaced closer than the axis register's own leading collide, so an option whose band is too
//     thin to hold two of them cannot hand back a number, and an option that hands back no number
//     is a rearrangement. `floorTicks` computes what a band can carry and returns nothing when the
//     answer is "not enough" — five of this beat's nine bands were refused that way, by measuring,
//     before anything was drawn.
//   - A CARRIED WORD ONE OPTION FORGOT. The words this control moves are NOT hidden by it: they
//     stay drawn in every state, because "the reader lands on the whole claim with nothing dimmed"
//     is checked on the delivered page and a word an option forgot to move would sit on the wrong
//     band rather than disappear — a wrong answer instead of a missing one. Every option re-places
//     the same set, and that is checked rather than remembered.

/** One step of the plate: every band's own top and bottom, as the DEFAULT picture draws them. */
export type FloorBand = { key: string; top: number[]; bottom: number[] };

/** What the beat draws, handed to the shear and to the refusals. `xs` is only its length here —
 *  a shear never touches x — but it is asked for so a per-step array can be checked against it. */
export type FloorGeometry = { xs: number[]; bands: FloorBand[] };

/** One graduation of the axis a flattened band earns. `text` is the beat's own formatted string:
 *  this file computes where a graduation goes and never how a number is spelled. */
export type FloorTick = { value: number; y: number; text: string };

/** One overlay word the control re-places rather than hides, at its place under this option. */
export type FloorCarried = { key: string; y: number };

/** One option: the band laid flat, the shear that lays it there, and the words for both. */
export type FloorOption = {
  /** The band whose own bottom edge becomes the straight rule. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture.
   *  It must CONTAIN `label`: an accessible name that does not contain the visible one is the
   *  WCAG 2.5.3 "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /** The sentence revealed under the control, in the beat's own words. It owes the reader the one
   *  thing the flattening bought — what the band now measures, from what zero, over what range. */
  note: string;
  /** The shear, one number per step, in the geometry's own units. */
  shift: number[];
  /** The straight floor the chosen band now rests on, in the geometry's own units. */
  ruleY: number;
  /** The axis the flattening earns. At least two graduations, or the option is not offered. */
  ticks: FloorTick[];
  /** Where every carried word goes under this option. Same keys, every option. */
  carries: FloorCarried[];
};

/** What a beat declares when it wants a floor. Absent/`null` means it wants none. */
export type FloorDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. Always first, always the default, and it is the plate. */
  noneLabel: string;
  /** The overlay words this control re-places rather than hides, at their places in the UNTOUCHED
   *  picture. Their `top` comes from the generated stylesheet in every state, the default included,
   *  because an inline `top` on the element would beat every rule this file emits. */
  carries: FloorCarried[];
  options: FloorOption[];
};

/** The reserved id of the untouched option. No declared option may slug to it. */
export const FLOOR_NONE_SLUG = "none";

/** A CSS-id-safe slug, derived from the option's KEY and never from its label — the same single
 *  derivation of one identity `stack.ts` argues for, and the same defect `filter.ts` records from
 *  having slugged words instead.
 *
 *  @parity */
export function floorSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug, and for the untouched option. One function, three readers. */
export function floorOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** The band a key names, or a refusal that says which keys the plate actually draws. */
function bandOf(geometry: FloorGeometry, key: string): FloorBand {
  const band = geometry.bands.find((b) => b.key === key);
  if (!band)
    throw new Error(
      `floor: the plate draws no band ${JSON.stringify(key)} — it draws ` +
        `${geometry.bands.map((b) => JSON.stringify(b.key)).join(", ")}`,
    );
  return band;
}

/**
 * THE SHEAR, AND IT IS THE ARITHMETIC THIS FILE OWNS.
 *
 * Laying band `key` flat means moving every step by `ruleY - bottom(step)`. Which `ruleY` is not
 * free: the sheared stack has to fit the frame, and where it sits inside it is a choice this
 * function makes ONCE, by centring — so an option whose band runs along the bottom of the stream
 * and one whose band runs along the top both land in the middle of the plot rather than one of them
 * hugging an edge.
 *
 * The span it reports is the sheared stack's full height, which the refusals check against the
 * frame: on this beat's own data the nine bands' spans come out between 360,0 and 370,1 units in a
 * 400-unit frame, because the shear is COMMON to every band and therefore adds only the wander of
 * the stack's own silhouette, never the wander of the band being flattened.
 */
export function floorShear(
  geometry: FloorGeometry,
  key: string,
  { height }: { height: number },
): { shift: number[]; ruleY: number; span: number } {
  if (!Number.isFinite(height) || height <= 0)
    throw new Error(
      `floor: the frame height must be a positive number, got ${height}`,
    );
  const band = bandOf(geometry, key);
  const steps = geometry.xs.length;
  const ceiling: number[] = [];
  const base: number[] = [];
  for (let i = 0; i < steps; i += 1) {
    ceiling.push(Math.min(...geometry.bands.map((b) => b.top[i])));
    base.push(Math.max(...geometry.bands.map((b) => b.bottom[i])));
  }
  const above = base.map((v, i) => v - band.bottom[i]);
  const below = ceiling.map((v, i) => v - band.bottom[i]);
  const span = Math.max(...above) - Math.min(...below);
  const ruleY = (height - span) / 2 - Math.min(...below);
  return { shift: band.bottom.map((v) => ruleY - v), ruleY, span };
}

/** The nice steps an axis is allowed to graduate on, smallest first. Nothing else reads as a round
 *  number to a reader, and a step this list does not contain is a step somebody typed. */
const NICE_STEPS = [1, 2, 2.5, 5];

/**
 * THE GRADUATIONS A FLATTENED BAND CAN CARRY, AND THE REFUSAL THAT COMES WITH THEM.
 *
 * The step is the SMALLEST round one whose spacing clears `minSpacing` and whose count stays within
 * `maxTicks` — smallest, because a reader reading a band against its own zero wants as fine a
 * graduation as the type can hold, and the two bounds are what stop that from becoming a comb.
 *
 * `minSpacing` IS DERIVED AND NEVER TYPED. It is the axis register's own leading (`leadOf`) at the
 * canonical mapping, where one viewBox unit is one CSS pixel — which is the size this format's own
 * aspect-ratio produces at a 900-pixel-wide plot. Two labels closer than one line box collide, so
 * that is the floor, and the caller passes the WIDEST of the filed directions' leadings so that all
 * three pages offer the reader the same control rather than one of them quietly dropping an option.
 *
 * Returns fewer than two graduations for a band too thin to hold an axis, and the beat is expected
 * to read that as "do not offer this option" — which is how five of the nine bands of the beat this
 * file was written for came to be refused, by measuring rather than by taste.
 */
export function floorTicks(
  geometry: FloorGeometry,
  key: string,
  {
    unitsPerValue,
    ruleY,
    minSpacing,
    maxTicks = 6,
  }: {
    unitsPerValue: number;
    ruleY: number;
    minSpacing: number;
    maxTicks?: number;
  },
): { value: number; y: number }[] {
  if (!Number.isFinite(unitsPerValue) || unitsPerValue <= 0)
    throw new Error(
      `floor: unitsPerValue must be a positive number, got ${unitsPerValue}`,
    );
  if (!Number.isFinite(minSpacing) || minSpacing <= 0)
    throw new Error(
      `floor: minSpacing must be a positive number, got ${minSpacing}`,
    );
  const band = bandOf(geometry, key);
  const peakUnits = Math.max(...band.bottom.map((b, i) => b - band.top[i]));
  const peakValue = peakUnits / unitsPerValue;
  for (let decade = -3; decade <= 6; decade += 1)
    for (const base of NICE_STEPS) {
      const step = base * 10 ** decade;
      const spacing = step * unitsPerValue;
      if (spacing < minSpacing) continue;
      const count = Math.floor(peakValue / step) + 1;
      if (count < 2) continue;
      if (count > maxTicks) continue;
      return Array.from({ length: count }, (_, i) => ({
        value: i * step,
        y: ruleY - i * spacing,
      }));
    }
  return [];
}

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything
 * is drawn. `geometry` is what the beat actually DRAWS — the same discipline `assertStackDeclaration`
 * holds with `drawnKeys` — so an option naming a band that is not on the plate, or shearing it off
 * the frame, is caught here rather than by a reader choosing it and looking at the wreck.
 */
export function assertFloorDeclaration(
  declaration: FloorDeclaration,
  geometry: FloorGeometry,
  { height }: { height: number },
): void {
  const where = "floor declaration";
  if (!declaration || typeof declaration !== "object")
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
        "A beat that does not need a floor declares none.",
    );
  if (!Array.isArray(declaration.carries))
    throw new Error(
      `${where}: \`carries\` must be the list of overlay words every option re-places`,
    );
  for (const carry of declaration.carries)
    if (!carry || typeof carry.key !== "string" || !Number.isFinite(carry.y))
      throw new Error(
        `${where}: \`carries\` holds a word with no key or no place in the default picture — ` +
          JSON.stringify(carry),
      );

  const drawnKeys = geometry.bands.map((b) => b.key);
  const drawn = new Set(drawnKeys);
  if (drawn.size !== drawnKeys.length)
    throw new Error(
      `${where}: the drawn bands are not unique — ${JSON.stringify(drawnKeys)}`,
    );
  const steps = geometry.xs.length;
  for (const band of geometry.bands)
    if (band.top.length !== steps || band.bottom.length !== steps)
      throw new Error(
        `${where}: band ${JSON.stringify(band.key)} has ${band.top.length}/${band.bottom.length} ` +
          `edges for ${steps} steps — the plate and the shear do not describe the same picture`,
      );
  const carried = new Set(declaration.carries.map((c) => c.key));
  if (carried.size !== declaration.carries.length)
    throw new Error(
      `${where}: \`carries\` names the same word twice — ` +
        JSON.stringify(declaration.carries.map((c) => c.key)),
    );

  const seen = new Map<string, string>();
  for (const option of declaration.options) {
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(
        `${where}: every option needs a label — got ${JSON.stringify(option)}`,
      );
    if (!drawn.has(option.key))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} lays ${JSON.stringify(option.key)} flat, ` +
          "which the beat does not draw — the reader would choose a floor that is not on the plate",
      );
    const slug = floorSlugOf(option.key);
    if (!slug)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to an empty string — rename it`,
      );
    if (slug === FLOOR_NONE_SLUG)
      throw new Error(
        `${where}: the key ${JSON.stringify(option.key)} slugs to "${FLOOR_NONE_SLUG}", the reserved ` +
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
    if (!option.announce.includes(option.label))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} announces ${JSON.stringify(option.announce)}, ` +
          "which does not contain its own visible label — an accessible name that does not contain " +
          "the visible one is the WCAG 2.5.3 failure, and a reader speaking what they see cannot " +
          "reach this option",
      );

    if (!Array.isArray(option.shift) || option.shift.length !== steps)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} shears ${option.shift?.length ?? 0} steps ` +
          `of a ${steps}-step plate`,
      );
    for (const dy of option.shift)
      if (!Number.isFinite(dy))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a non-finite shift (${dy}) — the ` +
            "plate would be sheared off the frame",
        );
    // A CONSTANT SHIFT IS THE DEFAULT UNDER A SECOND NAME. `directed-interaction.md` refuses a
    // control whose resulting state equals the state it started in; on a shear that refusal is
    // arithmetic, and it is the one this file can make without rendering anything.
    const spread = Math.max(...option.shift) - Math.min(...option.shift);
    if (spread <= 0.5)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} shears the plate by ${spread.toFixed(3)} ` +
          "units end to end — the band it lays flat already rests on a straight line, so choosing " +
          "this option renders the picture the page already ships. Do not offer it.",
      );
    // A SHEARED PLATE THAT LEAVES THE FRAME is half a picture with a caption.
    let top = Infinity;
    let bottom = -Infinity;
    for (let i = 0; i < steps; i += 1)
      for (const band of geometry.bands) {
        top = Math.min(top, band.top[i] + option.shift[i]);
        bottom = Math.max(bottom, band.bottom[i] + option.shift[i]);
      }
    if (top < -0.5 || bottom > height + 0.5)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} shears the plate to ` +
          `[${top.toFixed(1)}, ${bottom.toFixed(1)}] in a frame of [0, ${height}] — the reader would ` +
          "be shown a stream with a piece of it outside the picture",
      );

    // AN AXIS NOBODY CAN READ IS NOT AN AXIS, and this is the refusal this file exists to make.
    if (!Array.isArray(option.ticks) || option.ticks.length < 2)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} earns ${option.ticks?.length ?? 0} ` +
          "graduation(s). Laying a band flat is offered because it makes a value readable; a band " +
          "too thin to hold two graduations hands back no number, and an option that hands back no " +
          "number is a rearrangement. Do not offer it.",
      );
    let previous = -Infinity;
    for (const tick of option.ticks) {
      if (!Number.isFinite(tick?.value) || !Number.isFinite(tick?.y))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a graduation with no place — ` +
            JSON.stringify(tick),
        );
      if (typeof tick.text !== "string" || !tick.text.trim())
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a graduation at ${tick.value} ` +
            "with no words — an unlabelled rule across a plot is a gridline, not a reading",
        );
      if (tick.value <= previous)
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} graduates ${tick.value} after ` +
            `${previous} — the axis is not ascending`,
        );
      previous = tick.value;
    }
    if (option.ticks[0].value !== 0)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} starts its axis at ${option.ticks[0].value} ` +
          "and not at zero — the whole claim of this control is that the band now has one",
      );
    if (Math.abs(option.ticks[0].y - option.ruleY) > 0.5)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} puts its zero at ${option.ticks[0].y} and ` +
          `its floor at ${option.ruleY} — the axis and the rule would disagree about where zero is`,
      );

    // A CARRIED WORD ONE OPTION FORGOT lands on the wrong band rather than disappearing.
    const mine = new Set<string>();
    for (const carry of option.carries ?? []) {
      if (!carry || typeof carry.key !== "string" || !Number.isFinite(carry.y))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} carries a word with no key or no place — ` +
            JSON.stringify(carry),
        );
      if (!carried.has(carry.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} re-places ${JSON.stringify(carry.key)}, ` +
            "which the declaration does not list under `carries`",
        );
      if (mine.has(carry.key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} re-places ${JSON.stringify(carry.key)} ` +
            "twice — one word cannot be in two places",
        );
      mine.add(carry.key);
    }
    for (const { key } of declaration.carries)
      if (!mine.has(key))
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} does not re-place ${JSON.stringify(key)}. ` +
            "These words are not hidden by this control — they stay drawn in every state — so one " +
            "an option forgets does not disappear, it sits on the wrong band and answers wrongly.",
        );
  }
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the
 * state the beat renders in and the one a reader with no script never leaves.
 */
export function floorOptionsForMarkup(
  declaration: FloorDeclaration | null | undefined,
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
      id: floorOptionId(idPrefix, FLOOR_NONE_SLUG),
      slug: FLOOR_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: floorOptionId(idPrefix, floorSlugOf(option.key)),
      slug: floorSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the rule `filterNotes`, `stackNotes` and
 * `levelNotes` all hold. A re-based view is an argument the reader built, and an argument that is
 * only a picture cannot be checked. The untouched option gets NO note, because it is not a
 * comparison: it is the claim.
 */
export function floorNotesForMarkup(
  declaration: FloorDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: floorSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational, exactly as `filterCss` and `stackCss` do.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED, and on this control that is load-bearing twice over.
 * `${scope} [data-floor-plate]` and `${scope} [data-floor-plate="none"]` score identically —
 * an attribute selector with a value is still one attribute selector — so which wins is source
 * order and nothing else; the blanket is emitted FIRST and the default plate after it. The same
 * pair is emitted again inside each option's `:has()` scope, where both score (1,3,0), and again
 * blanket first. A sankey on this branch rendered green with zero ribbons lit for getting exactly
 * this backwards.
 *
 * NO SELECTOR HERE IS GROUPED. `stack.ts` records, at length, a defect where `A B, C` painted two
 * columns with the accent in every state of the page because a descendant prefix binds to the first
 * selector of a group only. One rule per selector costs a few hundred bytes and cannot do that.
 */
export function floorCss(
  declaration: FloorDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    height,
    gutterPx,
    carryMs,
  }: {
    scope: string;
    idPrefix: string;
    /** The plot's own height in geometry units — what a carried word's `y` is a fraction of.
     *  A `[data-floor-carry]` lives in `.overlay`, an HTML layer sharing the `<svg>`'s grid cell, so
     *  the ONE conversion exact at every width is a percentage of that layer: under
     *  `preserveAspectRatio="none"` the viewBox maps linearly onto the cell in each axis
     *  independently, which is the same reasoning `stack.ts` gives for its own `carry`. */
    height: number;
    /** How wide the y-gutter opens when an option earns an axis. Zero in the default state, where
     *  there is no axis to put in it and an empty gutter would be a promise the plate cannot keep. */
    gutterPx: number;
    /** How long a carried word takes to reach its new band. Honoured only under `no-preference`. */
    carryMs: number;
  },
): string {
  if (!declaration) return "";
  if (!Number.isFinite(height) || height <= 0)
    throw new Error(
      `floor: the plot height must be a positive number of geometry units, got ${height}`,
    );
  const round = (n: number) => Number(n.toFixed(3));
  const lines: string[] = [
    `/* The floor this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, and the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-floor-note] { display: none; }`,
    `${scope} [data-floor-axis] { display: none; }`,
    // `display: inline` and not `revert` on the plates: these are SVG <g>, whose only meaningful
    // distinction is none/not-none, and `inline` says so without asking what a UA sheet reverts to.
    `${scope} [data-floor-plate] { display: none; }`,
    `${scope} [data-floor-plate="${FLOOR_NONE_SLUG}"] { display: inline; }`,
    // THE DEFAULT PLACES OF THE CARRIED WORDS, and they are generated here rather than written
    // inline on the elements for one reason: an inline `top` wins against every rule below it, so a
    // name placed inline would never move and the reader would watch three labels sit still while
    // the plate sheared out from under them. Emitted first, at (0,2,0); each option's own rule
    // scores (1,3,0) and takes over.
    ...declaration.carries.map(
      (carry) => `${scope} [data-floor-carry="${carry.key}"] { top: ${round((carry.y / height) * 100)}%; }`,
    ),
    // The motion, and it is the only motion this control has. A shear cannot be interpolated —
    // each option's plate is a different set of paths, drawn once and revealed — so the plates
    // themselves cut. The words that RIDE the bands can travel, and they do: a name that jumped
    // while its band cut would read as a third thing happening. Under `reduce` the block does not
    // exist, so there is no transition to override and no branch anywhere.
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-floor-carry] { transition: top ${carryMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  ];
  for (const option of declaration.options) {
    const slug = floorSlugOf(option.key);
    const at = `${scope}:has(#${floorOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${at} [data-floor-plate] { display: none; }`,
      `${at} [data-floor-plate="${slug}"] { display: inline; }`,
      `${at} [data-floor-note="${slug}"] { display: revert; }`,
      `${at} [data-floor-axis="${slug}"] { display: revert; }`,
      // THE GUTTER IS THE FORMAT'S OWN GRID COLUMN, and this file names it for the same reason
      // `stackChromeCss` names `.chart-filter`'s treatment: the axis an option earns has nowhere
      // else to go, and reserving the column in every state would put an empty gutter beside a
      // plate whose whole confession is that it has no value axis.
      `${at} .chart-plot { --y-gutter: ${round(gutterPx)}px; }`,
    );
    for (const carry of option.carries)
      lines.push(
        `${at} [data-floor-carry="${carry.key}"] { top: ${round((carry.y / height) * 100)}%; }`,
      );
  }
  return lines.join("\n");
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a floor.
 *
 * A DELIBERATE COPY of the segmented treatment `render-web.mjs` gives `.chart-filter` and
 * `stackChromeCss` gives `.chart-stack`, and the cost is stated rather than hidden, exactly as
 * `stack.ts` states it: the format's own block is emitted only for a beat that declared a FILTER,
 * which this beat has not and must not — nothing leaves its picture. The two blocks are held
 * together by the eye; the thing that would actually hurt if they drifted, a reader unable to
 * operate the control, is held by `verify-web.mjs` driving a real keyboard.
 *
 * The native radios underneath are what the reader actually operates. The pills are layered ON TOP
 * (`opacity: 0`, never `display: none`) and the whole treatment is behind
 * `@supports selector(:has(*))`, so an engine that cannot draw a checked pill gets the plain radios
 * rather than four identical ones.
 */
export function floorChromeCss({ scope }: { scope: string }): string {
  return `
${scope} .chart-floor {
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
${scope} .chart-floor legend { float: left; font-weight: 600; padding: 0; color: var(--ink); }
${scope} .chart-floor .options { display: inline-flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; }
${scope} .chart-floor label { position: relative; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; color: var(--muted); }
${scope} .chart-floor input { cursor: pointer; margin: 0; }

/* THE SENTENCE THE CONTROL OWES THE READER. Its row is reserved whether or not an option is chosen,
   so choosing one never moves the plot underneath it. role="status" is on the container rather than
   on each note: the notes come and go by display, and a live region that itself comes and goes
   announces nothing. */
${scope} .floor-notes {
  flex: 0 0 auto;
  margin: 4px 0 0;
  /* TWO LINES, RESERVED, AND THE NUMBER IS MEASURED RATHER THAN CHOSEN. stack.ts reserves one,
     because its sentences are one. A floor's sentence has to carry a band's start, its turning
     points, its end and what it comes to as a share — and on the beat this was written for that
     sets to two lines at 1280 and still two at 900. Reserving one meant choosing an option pushed
     the plot down 28 CSS pixels, which is the plot moving under the control this row exists to
     stop. Below about 700 it wraps further and the plot does move; that is the narrow-width debt
     this format pays elsewhere too, and it is stated here rather than hidden. */
  min-height: 3em;
  font-size: var(--source-size);
  color: var(--muted);
}
${scope} .floor-notes p { margin: 0; }

@supports selector(:has(*)) {
  ${scope} .chart-floor .options {
    gap: 0;
    padding: 2px;
    border: 1px solid var(--grid);
    border-radius: 999px;
  }
  ${scope} .chart-floor label {
    gap: 0;
    padding: 5px 12px;
    border-radius: 999px;
    line-height: 1.2;
    white-space: nowrap;
    transition: background-color 120ms ease, color 120ms ease;
  }
  ${scope} .chart-floor label input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    -webkit-appearance: none;
    appearance: none;
  }
  ${scope} .chart-floor label:hover { color: var(--ink); }
  ${scope} .chart-floor label:has(input:checked) { background: var(--ink); color: var(--ground); }
  ${scope} .chart-floor label:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
}
`.trim();
}
