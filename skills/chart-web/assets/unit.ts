// twin/skills/chart-web/assets/unit.ts
//
// WHAT ONE ICON STANDS FOR, AND THE FIELD THAT COMES OUT OF IT.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what it may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT OF A SUM. `fold.ts`
// says what may be LAID OVER what is drawn. `brush.ts` says which SPAN of an axis is chosen.
// `trace.ts` says what may be FOLLOWED through an image. `hold.ts` says which factor of a product
// may be HELD STILL. `floor.ts` says what the picture may STAND ON. `descend.ts` says what may
// BECOME THE WHOLE. `reorder.ts` says what the same numbers look like SOMEWHERE ELSE IN A CYCLE.
// `count.ts` says which of a closed shape's terms are COUNTED IN IT. `datum.ts` says what the
// picture is measured FROM. `weigh.ts` says what a mark is WORTH. This file says **what one icon
// IS** — the quantity a single drawn unit stands for, and therefore how many units there are to
// count. All of them are native radio inputs plus CSS generated at build time (`:checked` and
// `:has()` on the enclosing figure, no listener, no state, not one byte of JavaScript), because
// that is the only kind of control this format can promise still works with the script absent.
//
// WHY THIS ONE EXISTS, AND IT IS THE TYPE SHEET'S OWN NUMBER-ONE FAILURE RATHER THAN A DECORATION.
//
// `chart-beat/references/types/pictogram.md` states it in one sentence: *"The unit each icon stands
// for has to be stated to the reader explicitly — 'each icon = 1,000 people' — or the count is
// uninterpretable no matter how carefully the icons themselves are drawn; an undeclared unit is the
// single most common way this type fails to communicate anything at all."*
//
// Every other type in this catalogue gets its unit from arithmetic. A bar's length is a quantity on
// an axis; nobody chose what one pixel is worth, and a reader recovers the number by reading the
// axis. A pictogram has NO axis. It asks the reader to count, and a count is only a number once
// somebody has said what one of the things is — so the unit is not a setting of the chart, it is the
// chart's entire argument. Change it and the same frozen file produces a different headline, a
// different biggest block, and a different answer to the only question the type asks.
//
// A still can do exactly one thing about that: pick a unit, print it in the caveat, ask to be
// trusted. This file is the other answer, the one only an interactive page can give — hand the
// reader the unit and let them watch the count change under a field that never moves.
//
// WHY IT IS ITS OWN FILE AND NOT AN OPTION IN `weigh.ts`, WHICH IS THE ONE IT LOOKS LIKE.
//
// `weigh.ts` is the near miss and the distinction is exact, because it is the distinction the whole
// type rests on. A weighing decides what a mark is worth and spends that on the mark's SIZE:
// `weighRadii` portions one ink budget out over a set of marks whose COUNT never changes, and its
// own header says so — "the same 213 marks at the same 213 positions". A pictogram's size is
// explicitly not an encoding. The type sheet: *"icons are all rendered at one shared size across the
// entire chart — never scaled per-value, since size is explicitly not the encoding here, count is."*
// So a vocabulary whose every rule is about how big a mark is cannot express a control whose whole
// product is how many marks there are, and folding this in would have meant giving `weigh.ts` a
// field that changes the population of the picture — the one thing it refuses in its own words.
//
// `filter.ts` is the second near miss and fails the other way. A filter's promise is that *the marks
// outside a named set LEAVE*. Nothing leaves here: every block is present in every option, and what
// changes is its LENGTH. A block that shrinks from eighteen squares to one and a half has not been
// filtered — it has been re-counted, at a unit the reader chose, and all of its data is still in the
// number.
//
// `datum.ts` is the closest in SPIRIT and the furthest in arithmetic, which is worth writing down
// because the two files are about the same editorial fact. Both hand the reader a choice the author
// would otherwise have made silently — there, the zero every mark is measured from; here, the
// quantity every icon stands for. But a datum is a SUBTRACTION that changes every mark's value and
// its sign while the marks stay where they are, and a unit is a DIVISION that changes how many marks
// exist at all. `count.ts` is the one whose name collides and whose product is a polygon's vertices.
//
// THE ARITHMETIC THIS FILE OWNS, AND THE SECOND REFUSAL IS MADE OF IT.
//
// `unitInkWidths` resolves one quantity, at one unit, into one row of ink: `floor(icons)` whole
// glyphs, then ONE partial glyph at the remainder, then nothing. The partial is the type sheet's
// other filed failure and the reason this arithmetic is not left to a beat:
//
//     *"a value that resolves to, say, 2.2 icons needs that partial 0.2 rendered as a genuinely
//     partial icon — clipped at the right fraction of the glyph's own visible ink, not the icon's
//     whole bounding box, which has a margin before the glyph itself starts drawing. Clip at the
//     wrong reference point and a small-enough remainder disappears from the page entirely,
//     silently rounding a real fraction down to nothing with no visual trace that anything was
//     dropped."*
//
// So this file takes BOTH numbers — the cell's pitch and the glyph's ink — and refuses a declaration
// where they are equal, because then the two reference points coincide and the distinction the sheet
// names cannot be made at all. The fraction is taken on the INK, and a remainder whose ink would be
// thinner than a declared sliver is REFUSED rather than drawn as nothing: a chart that silently
// drops a remainder is, in the sheet's own words, *"not a design nuance, it's a correctness failure
// indistinguishable, on the page, from data simply being missing."*
//
// AND THE WIDTHS TRAVEL, WHICH IS THE ONE PLACE THIS FAMILY GETS THE OWNER'S FOURTH ARBITRAGE FOR
// FREE. `weigh.ts` and `descend.ts` both have to cut between states, because both re-place their
// marks and `interaction.mjs` resolves a pointer off coordinates read once at init. Nothing moves
// here: a cell's seat is a function of the GRID, not of any option, so every option's ink is the
// same set of rectangles at the same places with different widths — and `width` on an SVG rect is a
// real CSS property, on an element that is always rendered, which is exactly the shape a transition
// needs. A beat using this file draws its ink ONCE and lets the stylesheet run it in and out.

import { controlChromeCss } from "./control-chrome.ts";

/** One block of the field — a named group of cells with its own fixed capacity. The capacity is a
 *  fact about the WIDEST option, never about the data: it is how many seats the grid holds. */
export type UnitBlock = { key: string; capacity: number };

/** One option: a unit, and what every block resolves to under it. The first declared is the default
 *  and carries no `note`. */
export type UnitOption = {
  /** The slug is derived from THIS and never from the label — the single derivation of one identity
   *  `filter.ts` records the defect for having done twice. */
  key: string;
  /** The pill's visible words. Must CONTAIN `per`: a pill that does not say what one icon is worth
   *  is the type sheet's number-one failure wearing a control's clothes. */
  label: string;
  /** What ONE icon stands for, in the beat's own printed words — "un pays", "100 TWh d'électricité". */
  per: string;
  /** The same thing as a number, in the quantity's own units. Refused unless it is a readable one:
   *  the sheet names them, "1, 2, 5, and their powers of ten". */
  perValue: number;
  /** The radio's accessible name. Must contain `label` (WCAG 2.5.3 "label in name") and `per`. */
  announce: string;
  /** The sentence revealed under the control. Required on every option but the default, and refused
   *  ON the default: the untouched picture is not a comparison, it is the claim. */
  note?: string;
  /** What each block resolves to under this unit, in icons — a real number, fraction included. */
  counts: { block: string; icons: number }[];
  /** The words printed beside each block, in the beat's own hand. One per block, always: a countable
   *  field is paired with its own figure, and a block whose figure went missing in one state would
   *  be the one state a reader had to count by hand. */
  figures: { block: string; text: string }[];
};

/** What a beat declares when it wants the reader to set the unit. Absent/`null` means it wants none. */
export type UnitDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The field's fixed grid. Every option fills the same seats. */
  blocks: UnitBlock[];
  /** The cell's pitch in geometry units — one glyph plus the gap that follows it. */
  cell: number;
  /** The glyph's own visible ink, in geometry units. Strictly less than `cell`: the margin between
   *  the two is precisely what makes the sheet's clipping rule a distinction and not a tautology. */
  ink: number;
  /** The thinnest ink a partial glyph may draw, in geometry units. A remainder under it is REFUSED,
   *  never rounded away. */
  sliver: number;
  /** The most icons one option may resolve to, in all. The sheet's third rule: a unit so fine that
   *  the field sprawls has given up the only thing a pictogram has over a bar chart. */
  ceiling: number;
  /** At least two. The FIRST is the default: the picture the page ships in, the picture a reader
   *  with no script never leaves, and the one every other option is measured against. */
  options: UnitOption[];
};

/** A CSS-id-safe slug, derived from the option's KEY and never from its label.
 *
 *  @parity */
export function unitSlugOf(key: string): string {
  return String(key)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** The radio id for an option's slug.
 *
 *  IT IS SPELLED `chart-stack-` ON PURPOSE, and so are `data-stack-note` and `data-stack-total`
 *  below. Those three strings are the format's DISCOVERY CONTRACT for a control that moves the
 *  picture, owes the reader a sentence and prints a figure beside it: `interaction-plan.ts` reads
 *  radio ids starting `chart-stack-` and sentences on `data-stack-note`, and `verify-web.mjs`
 *  excludes exactly `[data-stack-total]` from "every argument-bearing word is drawn
 *  unconditionally". `aim.ts` and `hold.ts` make the same choice for the same reason — a third
 *  grammar with its own spellings would be invisible to the guards written to hold it. */
export function unitOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** The id one cell carries, in the block's own grid. One function, three readers — the component
 *  that draws the rectangle, the stylesheet that sets its width, and the guard that reads the page
 *  back. */
export function unitCellId(blockKey: string, index: number): string {
  return `${unitSlugOf(blockKey)}-${index}`;
}

/**
 * A READABLE UNIT PER ICON. The sheet names them: *"The unit-per-icon should round to a clean,
 * memorable number (1, 2, 5, and their powers of ten are the readable choices) rather than an
 * arbitrary value that makes mental arithmetic hard."* A square worth 137 TWh asks the reader for a
 * division they cannot do in their head, which is the whole of what the type was chosen to avoid.
 */
export function isReadableUnit(perValue: number): boolean {
  if (!Number.isFinite(perValue) || perValue <= 0) return false;
  const exponent = Math.floor(Math.log10(perValue) + 1e-9);
  const mantissa = perValue / 10 ** exponent;
  return [1, 2, 5].some((m) => Math.abs(mantissa - m) < 1e-9);
}

/**
 * ONE BLOCK'S ROW OF INK, CELL BY CELL, in the geometry's own units.
 *
 * `floor(icons)` whole glyphs, then ONE partial at the remainder, then zeros. The fraction is taken
 * on the GLYPH'S INK and never on the cell's pitch — see this file's header for the sentence that
 * rule comes from, and `assertUnitDeclaration` for the refusal that keeps `ink < cell` true, which
 * is what makes the two references two references.
 *
 * A remainder thinner than `sliver` is refused here rather than drawn as nothing. That is the one
 * arithmetic in this file a beat could plausibly get right by accident and wrong in production: on
 * one dataset every remainder is fat and on the next one is 0,004 of an icon, and the page that
 * rounds it away looks exactly like a page whose data was missing.
 */
export function unitInkWidths(
  icons: number,
  capacity: number,
  {
    ink,
    sliver,
    what = "this block",
  }: { ink: number; sliver: number; what?: string },
): number[] {
  if (!Number.isFinite(icons) || icons < 0)
    throw new Error(`unit: ${what} resolves to ${icons} icons, which is not a count`);
  if (!Number.isInteger(capacity) || capacity <= 0)
    throw new Error(`unit: ${what} has a capacity of ${capacity} cells`);
  if (!Number.isFinite(ink) || ink <= 0)
    throw new Error(`unit: the glyph's ink must be a positive number of geometry units, got ${ink}`);
  if (!Number.isFinite(sliver) || sliver <= 0)
    throw new Error(`unit: the sliver must be a positive number of geometry units, got ${sliver}`);
  if (sliver >= ink)
    throw new Error(
      `unit: the sliver (${sliver}) is not thinner than the glyph's own ink (${ink}), so every ` +
        "partial icon this vocabulary can draw would be refused",
    );
  if (icons <= 0)
    throw new Error(
      `unit: ${what} resolves to no icon at all under this unit. A category with data must never ` +
        "simply vanish from the field as if it had none — the unit is too coarse, and the beat " +
        "owes the reader a finer one or a stated 'fewer than one icon's worth'.",
    );
  const whole = Math.floor(icons + 1e-9);
  const fraction = icons - whole;
  const needed = whole + (fraction > 1e-9 ? 1 : 0);
  if (needed > capacity)
    throw new Error(
      `unit: ${what} needs ${needed} cells and its grid holds ${capacity}. The field is never ` +
        "clipped: a count the grid cannot seat is a count the beat must not offer.",
    );
  if (fraction > 1e-9 && fraction * ink < sliver)
    throw new Error(
      `unit: ${what} leaves a remainder of ${fraction.toFixed(4)} of an icon, which is ` +
        `${(fraction * ink).toFixed(2)} units of ink against a sliver of ${sliver}. Drawn, a reader ` +
        "would see nothing there; dropped, the page would be indistinguishable from one whose data " +
        "was missing. Neither is allowed — take a finer unit.",
    );
  const widths = new Array<number>(capacity).fill(0);
  for (let i = 0; i < whole; i += 1) widths[i] = ink;
  if (fraction > 1e-9) widths[whole] = fraction * ink;
  return widths;
}

/** Every block's ink for one option, keyed by cell id. What the stylesheet will actually emit. */
export function unitFieldOf(
  declaration: UnitDeclaration,
  option: UnitOption,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const block of declaration.blocks) {
    const found = option.counts.find((c) => c.block === block.key);
    if (!found)
      throw new Error(
        `unit: option ${JSON.stringify(option.label)} counts nothing for the block ` +
          `${JSON.stringify(block.key)} — every block is present in every option, which is the ` +
          "whole distinction between this vocabulary and a filter",
      );
    const widths = unitInkWidths(found.icons, block.capacity, {
      ink: declaration.ink,
      sliver: declaration.sliver,
      what: `${JSON.stringify(option.label)} in block ${JSON.stringify(block.key)}`,
    });
    widths.forEach((w, i) => out.set(unitCellId(block.key, i), w));
  }
  return out;
}

/**
 * Refuses every declaration that would render a control the picture cannot honour, before anything
 * is drawn.
 */
export function assertUnitDeclaration(
  declaration: UnitDeclaration,
  {
    /** The smallest difference in icons that makes two fields two fields. */
    changeFloor = 0.5,
    /** THE INK THE BEAT SAYS IT WILL DRAW, per option slug, per cell id — and the reason this
     *  parameter exists is a mutation that stayed GREEN without it.
     *
     *  A beat's answering layer is drawn from its own numbers, so there are two derivations of one
     *  arithmetic on the page: this file's, which the stylesheet emits, and the beat's, which the
     *  marks carry. Clipping the partial glyph on the CELL'S PITCH instead of on the glyph's own
     *  ink — the exact failure `types/pictogram.md` names, and the obvious way to write it — was
     *  measured rendering clean in all three directions, with the last square of a block drawn
     *  7,26 units wide where the value says 11,27 and with every guard silent. Below a remainder of
     *  `1 - ink/cell` it draws NOTHING AT ALL, which is the sheet's *"correctness failure
     *  indistinguishable, on the page, from data simply being missing"* arriving with no red
     *  anywhere. So the two derivations are compared instead of trusted. */
    drawn,
  }: {
    changeFloor?: number;
    drawn?: Map<string, Map<string, number>>;
  } = {},
): void {
  const where = "unit declaration";
  if (!declaration || typeof declaration !== "object")
    throw new Error(`${where}: expected an object, got ${JSON.stringify(declaration)}`);
  if (typeof declaration.label !== "string" || !declaration.label.trim())
    throw new Error(
      `${where}: \`label\` must be the beat's own words — a control with no legend renders unnamed, ` +
        "which on this type is the undeclared unit itself",
    );
  if (!Array.isArray(declaration.blocks) || declaration.blocks.length === 0)
    throw new Error(`${where}: the field has no blocks`);
  const blockKeys = declaration.blocks.map((b) => b.key);
  if (new Set(blockKeys).size !== blockKeys.length)
    throw new Error(`${where}: two blocks share a key (${blockKeys.join(", ")})`);
  for (const block of declaration.blocks)
    if (!Number.isInteger(block.capacity) || block.capacity <= 0)
      throw new Error(
        `${where}: block ${JSON.stringify(block.key)} holds ${block.capacity} cells`,
      );
  // THE GLYPH AND THE CELL ARE TWO NUMBERS, AND THAT IS THE POINT.
  if (!Number.isFinite(declaration.cell) || declaration.cell <= 0)
    throw new Error(`${where}: the cell's pitch must be positive, got ${declaration.cell}`);
  if (!Number.isFinite(declaration.ink) || declaration.ink <= 0)
    throw new Error(`${where}: the glyph's ink must be positive, got ${declaration.ink}`);
  if (!(declaration.ink < declaration.cell))
    throw new Error(
      `${where}: the glyph's ink is ${declaration.ink} and its cell's pitch is ${declaration.cell}. ` +
        "With no margin between them the two reference points a partial icon can be clipped at are " +
        "the same point, and the type sheet's rule — clip on the glyph's own ink, never on the " +
        "bounding box — cannot be stated, let alone kept.",
    );
  if (!Number.isFinite(declaration.ceiling) || declaration.ceiling <= 0)
    throw new Error(`${where}: the ceiling must be a positive number of icons`);
  if (!Array.isArray(declaration.options) || declaration.options.length < 2)
    throw new Error(
      `${where}: needs at least two units to be a choice, got ${declaration.options?.length ?? 0}. ` +
        "A beat that does not need the reader to set the unit declares none.",
    );

  const seen = new Map<string, string>();
  const fields: { slug: string; label: string; field: Map<string, number>; total: number }[] = [];

  declaration.options.forEach((option, index) => {
    const isDefault = index === 0;
    if (typeof option?.label !== "string" || !option.label.trim())
      throw new Error(`${where}: every option needs a label — got ${JSON.stringify(option)}`);
    const slug = unitSlugOf(option.key);
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

    // THE UNDECLARED UNIT, MADE MECHANICAL. This is the failure the sheet puts first, and it is the
    // only one of them a control can commit in its own chrome rather than in its geometry.
    if (typeof option.per !== "string" || !option.per.trim())
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} does not say what one icon is worth. An ` +
          "undeclared unit is the single most common way this type fails to communicate anything " +
          "at all, and a control that changes the unit without printing it is that failure with a " +
          "moving part.",
      );
    if (!option.label.includes(option.per))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} stands for ${JSON.stringify(option.per)} ` +
          "and does not say so on its own pill. The reader presses the pill and reads the pill; the " +
          "unit has to be on it.",
      );
    if (!isReadableUnit(option.perValue))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} makes one icon worth ${option.perValue}. ` +
          "The readable units are 1, 2, 5 and their powers of ten — anything else asks the reader " +
          "for a division they cannot do in their head, which is the whole of what counting was " +
          "chosen to avoid.",
      );
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
        `${where}: the default unit ${JSON.stringify(option.label)} carries a note. The first ` +
          "option IS the picture the page ships in; a sentence revealed under it would be the " +
          "title said a second time, in a second place, to a reader who never chose anything.",
      );
    if (!isDefault && (typeof option.note !== "string" || !option.note.trim()))
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} has no \`note\` — a count the reader ` +
          "asked for that is only a picture cannot be checked, and a reader who is not looking at " +
          "the field gets nothing at all",
      );

    // A COUNTABLE FIELD IS PAIRED WITH ITS OWN FIGURE, in every state and for every block.
    for (const block of declaration.blocks) {
      const figure = option.figures?.find((f) => f.block === block.key);
      if (!figure || typeof figure.text !== "string" || !figure.text.trim())
        throw new Error(
          `${where}: option ${JSON.stringify(option.label)} prints no figure beside the block ` +
            `${JSON.stringify(block.key)}. Counting a field is a check, not a task: the state that ` +
            "lost its figure is the state the reader has to count by hand.",
        );
    }

    const field = unitFieldOf(declaration, option);
    const total = option.counts.reduce((s, c) => s + c.icons, 0);
    if (total > declaration.ceiling)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} draws ${total.toFixed(2)} icons against a ` +
          `ceiling of ${declaration.ceiling}. Past that a reader stops counting and starts ` +
          "estimating a length, and a pictogram that is estimated is a bar chart made of squares.",
      );
    // THE TWO DERIVATIONS, COMPARED. See `drawn` above for the mutation that earned this.
    const mine = drawn?.get(slug);
    if (drawn && !mine)
      throw new Error(
        `${where}: option ${JSON.stringify(option.label)} is declared and draws no ink at all — ` +
          "the declaration and the answering layer do not describe the same page",
      );
    if (mine)
      for (const [id, width] of field) {
        const actual = mine.get(id) ?? 0;
        if (Math.abs(actual - width) > 1e-6)
          throw new Error(
            `${where}: option ${JSON.stringify(option.label)} draws the cell ${JSON.stringify(id)} ` +
              `${actual.toFixed(3)} units wide and its own count makes it ${width.toFixed(3)}. A ` +
              "partial glyph is clipped at a fraction of the GLYPH'S OWN INK and never at the " +
              `cell's pitch (${declaration.ink} against ${declaration.cell}) — clipped at the ` +
              "pitch, the first ink of every fraction lands in the gap where nothing is drawn, and " +
              `a remainder under ${(1 - declaration.ink / declaration.cell).toFixed(3)} of a glyph ` +
              "disappears from the page with no visual trace that anything was dropped.",
          );
      }
    fields.push({ slug, label: option.label, field, total });
  });

  // AN OPTION THAT IS THE DEFAULT UNDER A SECOND NAME, and TWO OPTIONS THAT DRAW THE SAME FIELD.
  const sameField = (a: Map<string, number>, b: Map<string, number>) => {
    for (const [key, value] of a) if (Math.abs(value - (b.get(key) ?? 0)) > 1e-6) return false;
    return true;
  };
  for (let i = 1; i < fields.length; i += 1) {
    const moved = declaration.options[i].counts.reduce((most, c) => {
      const base = declaration.options[0].counts.find((d) => d.block === c.block)!;
      return Math.max(most, Math.abs(c.icons - base.icons));
    }, 0);
    if (moved < changeFloor)
      throw new Error(
        `${where}: option ${JSON.stringify(fields[i].label)} moves no block's count by more than ` +
          `${moved.toFixed(3)} of an icon (floor ${changeFloor}). The reader would set the unit and ` +
          "watch the field stand still — that is the untouched view under a second name, which this " +
          "format refuses at the render.",
      );
    for (let j = 0; j < i; j += 1)
      if (sameField(fields[i].field, fields[j].field))
        throw new Error(
          `${where}: ${JSON.stringify(fields[j].label)} and ${JSON.stringify(fields[i].label)} ink ` +
            "exactly the same cells to exactly the same widths. Two names for one picture is one " +
            "option and a spare pill.",
        );
  }
}

/** The options a component draws, in reading order: the default first. */
export function unitOptionsForMarkup(
  declaration: UnitDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isDefault: boolean }[] {
  if (!declaration) return [];
  return declaration.options.map((option, index) => ({
    id: unitOptionId(idPrefix, unitSlugOf(option.key)),
    slug: unitSlugOf(option.key),
    label: option.label,
    announce: option.announce,
    isDefault: index === 0,
  }));
}

/** The sentences, default excluded — the rule every sibling vocabulary holds. */
export function unitNotesForMarkup(
  declaration: UnitDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options
    .slice(1)
    .map((option) => ({ slug: unitSlugOf(option.key), text: option.note as string }));
}

/** Every option's figure for one block, so a component can stack them at one place and let the
 *  stylesheet reveal one. They are spans at ONE position, never a span that travels: the owner's
 *  first arbitrage, and the reason the digits change while nothing moves. */
export function unitFiguresForMarkup(
  declaration: UnitDeclaration | null | undefined,
  blockKey: string,
): { slug: string; text: string; isDefault: boolean }[] {
  if (!declaration) return [];
  return declaration.options.map((option, index) => ({
    slug: unitSlugOf(option.key),
    text: (option.figures.find((f) => f.block === blockKey) as { text: string }).text,
    isDefault: index === 0,
  }));
}

/** Every cell the grid holds, in drawing order. */
export function unitCellsForMarkup(
  declaration: UnitDeclaration | null | undefined,
): { block: string; index: number; id: string }[] {
  if (!declaration) return [];
  const out: { block: string; index: number; id: string }[] = [];
  for (const block of declaration.blocks)
    for (let i = 0; i < block.capacity; i += 1)
      out.push({ block: block.key, index: i, id: unitCellId(block.key, i) });
  return out;
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on
 * a real radio. No script runs, so the control works with JavaScript off exactly as it works with it
 * on — and the empty string returned for a beat with no declaration is what makes "no dead CSS"
 * literal rather than aspirational.
 *
 * THE SELECTORS ARE ORDERED, NOT WEIGHTED, and on this vocabulary that is load-bearing three times
 * over. `${scope} [data-cell]` and `${scope} [data-cell="high-3"]` score identically — an attribute
 * selector with a value is still one attribute selector — so which wins is source order and nothing
 * else; the blanket goes FIRST and the widths after it. The same pair is emitted again inside each
 * option's `:has()` scope, where both score one higher, and again blanket first. A sankey on this
 * branch rendered green with zero ribbons lit for getting exactly this backwards, and here the same
 * mistake ships a field with every cell inked to its widest option at once.
 *
 * NO SELECTOR HERE IS GROUPED. `stack.ts` records the defect at length: a descendant prefix binds to
 * the first selector of a group only.
 *
 * AND THE ONE THING THAT TRAVELS IS THE INK. `width` on an SVG rect is a real CSS property on an
 * element that is ALWAYS rendered, which is the shape a transition needs (`display` does not
 * interpolate). It is also the one movement on the page whose reason a reader can see: they changed
 * what a square is worth, and the field re-counted itself.
 */
export function unitCss(
  declaration: UnitDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    inkMs,
  }: { scope: string; idPrefix: string; inkMs: number },
): string {
  if (!declaration) return "";
  const round = (n: number) => Number(n.toFixed(3));
  const defaultSlug = unitSlugOf(declaration.options[0].key);
  const lines: string[] = [
    `/* The unit this beat declared: ${declaration.options.length} options over ${JSON.stringify(declaration.label)}.`,
    `   Radios plus :checked/:has(), generated once at build time — the same mechanism filter.ts`,
    `   narrows with, and the reason this control needs no script and survives one being blocked. */`,
    `${scope} [data-stack-note] { display: none; }`,
    `${scope} [data-stack-total] { display: none; }`,
    `${scope} svg.chart[data-unit] { display: none; }`,
    `${scope} svg.chart[data-unit="${defaultSlug}"] { display: block; }`,
    `${scope} [data-cell] { width: 0px; }`,
  ];
  const emitField = (at: string, option: UnitOption) => {
    for (const [id, width] of unitFieldOf(declaration, option))
      if (width > 0) lines.push(`${at} [data-cell="${id}"] { width: ${round(width)}px; }`);
  };
  emitField(scope, declaration.options[0]);
  lines.push(
    `${scope} [data-stack-total="${defaultSlug}"] { display: revert; }`,
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-cell] { transition: width ${inkMs}ms cubic-bezier(0.4, 0, 0.2, 1); }`,
    `}`,
  );
  for (const option of declaration.options) {
    const slug = unitSlugOf(option.key);
    const at = `${scope}:has(#${unitOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      `${at} svg.chart[data-unit] { display: none; }`,
      `${at} svg.chart[data-unit="${slug}"] { display: block; }`,
      `${at} [data-cell] { width: 0px; }`,
    );
    emitField(at, option);
    lines.push(
      `${at} [data-stack-total] { display: none; }`,
      `${at} [data-stack-total="${slug}"] { display: revert; }`,
    );
    if (option.note) lines.push(`${at} [data-stack-note="${slug}"] { display: revert; }`);
  }
  return lines.join("\n");
}

/**
 * Reads the WRITTEN PAGE back, which is the only place several of these refusals can be made.
 *
 * `descend.ts` earned this shape of guard by mutation and `aim.ts` paid for it a second time:
 * dropping the stylesheet call left every state drawn on top of every other, every attribute
 * perfectly correct, and every declaration-level check green. A vocabulary a beat brings with it has
 * to check its own rules against the page it actually wrote.
 */
export function assertOneUnit(
  html: string,
  declaration: UnitDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const slugs = declaration.options.map((option) => unitSlugOf(option.key));
  const defaultSlug = slugs[0];
  const declaredCells = new Set(unitCellsForMarkup(declaration).map((c) => c.id));

  // Every drawn cell is a declared seat of the grid.
  const drawn = [...html.matchAll(/\sdata-cell="([^"]*)"/g)].map((m) => m[1]);
  if (drawn.length === 0)
    throw new Error(
      `${where}: not one element carries \`data-cell\`. The pills would be drawn over a field they ` +
        "cannot reach — the same fact `filter.ts` refuses as an option that tags nothing.",
    );
  for (const id of drawn)
    if (!declaredCells.has(id))
      throw new Error(
        `${where}: the cell ${JSON.stringify(id)} is drawn and is not a seat of any declared block ` +
          "— its width is set by no rule, so it is inked in every state at once",
      );

  const need = (needle: string, why: string) => {
    if (!html.includes(needle)) throw new Error(`${where}: ${why} (missing \`${needle}\`)`);
  };
  need("[data-cell] { width: 0px; }", "every cell would keep whatever width its attribute gave it, in every state at once");
  need(`[data-stack-total] { display: none; }`, "all four states' figures would print at once");
  need(`[data-stack-total="${defaultSlug}"] { display: revert; }`, "the default field would print no figure at all");
  need(`[data-stack-note] { display: none; }`, "every option's sentence would print at once");
  need(`svg.chart[data-unit] { display: none; }`, "every option's answering layer would be reachable at once");

  // AND THE BLANKETS MUST COME FIRST, WHICH IS A SEPARATE FACT FROM THEIR BEING PRESENT. Two
  // attribute selectors score identically; source order is the entire mechanism.
  const blanketPlate = html.search(/svg\.chart\[data-unit\]\s*\{\s*display:\s*none/);
  const revealPlate = html.search(new RegExp(`svg\\.chart\\[data-unit="${defaultSlug}"\\]\\s*\\{\\s*display:`));
  if (revealPlate >= 0 && revealPlate < blanketPlate)
    throw new Error(
      `${where}: the stylesheet reveals the default answering layer BEFORE the blanket rule that ` +
        "hides them all, so an engine without `:has()` — the only engine the base pair ever decides " +
        "anything for — would be handed every option's marks at once.",
    );
  const blanketInk = html.search(/\[data-cell\]\s*\{\s*width:\s*0px/);
  const firstWidth = html.search(/\[data-cell="[^"]*"\]\s*\{\s*width:/);
  if (firstWidth >= 0 && firstWidth < blanketInk)
    throw new Error(
      `${where}: the stylesheet sets a cell's own width BEFORE the blanket that zeroes them all. ` +
        "The two selectors score identically, so the blanket would win, and the field would be " +
        "drawn empty in every state.",
    );

  for (const slug of slugs) {
    if (!html.includes(`data-unit="${slug}"`))
      throw new Error(`${where}: the unit ${JSON.stringify(slug)} is declared and nothing on the page carries it`);
    if (!new RegExp(`#[\\w-]*${slug}:checked`).test(html))
      throw new Error(
        `${where}: nothing in the page's stylesheet reveals the unit ${JSON.stringify(slug)}. A ` +
          "vocabulary a beat brings with it has to emit its own rules: without them every state is " +
          "drawn on top of every other and every attribute is still perfectly correct.",
      );
    const at = `:has\\(#[\\w-]*${slug}:checked\\)`;
    if (!new RegExp(`${at} \\[data-cell\\] \\{ width: 0px; \\}`).test(html))
      throw new Error(
        `${where}: choosing ${JSON.stringify(slug)} would leave the default field's ink standing ` +
          "under it — the option's own blanket is missing, and the two states would be drawn on top " +
          "of each other",
      );
    if (!new RegExp(`${at} \\[data-cell="[^"]*"\\] \\{ width:`).test(html))
      throw new Error(`${where}: choosing ${JSON.stringify(slug)} would ink no cell at all`);
    if (!new RegExp(`${at} \\[data-stack-total="${slug}"\\]`).test(html))
      throw new Error(`${where}: choosing ${JSON.stringify(slug)} would print no figure`);
  }
  for (const option of declaration.options.slice(1)) {
    const slug = unitSlugOf(option.key);
    if (!new RegExp(`:has\\(#[\\w-]*${slug}:checked\\) \\[data-stack-note="${slug}"\\]`).test(html))
      throw new Error(`${where}: choosing ${JSON.stringify(option.label)} would reveal no sentence`);
  }
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a unit.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function unitChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "unit",
    notes: { reserve: "3em" },
  });
}
