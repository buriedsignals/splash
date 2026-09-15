/**
 * The forty European countries that report 2024 generation, split into three blocks by the
 * low-carbon share of their electricity and drawn as a pictogram THROUGH the design base — delivered
 * as an interactive page. The `pictogram` beat of this tree's web format.
 *
 * WHAT THE WEB ADDS, AND WHY IT IS THIS AND NOT A TOOLTIP.
 *
 * A pictogram is the only type in this catalogue that asks the reader to COUNT instead of measure.
 * A bar's length is a quantity you recover off an axis; a square is a thing you point at with a
 * finger. The price of that is one sentence on the type sheet: *"the unit each icon stands for has
 * to be stated to the reader explicitly … an undeclared unit is the single most common way this type
 * fails to communicate anything at all."*
 *
 * So the unit is not a setting of this chart. IT IS THE ARGUMENT. Change what one square is worth
 * and the same frozen file produces a different headline, a different biggest block and a different
 * answer to the only question the type asks, which is *how many*. A still can do exactly one thing
 * about that — pick a unit, print it in the caveat, ask to be trusted. This page is the other
 * answer:
 *
 *   un carré = un pays          40 carrés      16 · 6 · 18          40,0 % · 15,0 % · 45,0 %
 *   un carré = 100 TWh          49,85          16,52 · 4,35 · 28,98  33,1 % ·  8,7 % · 58,1 %
 *   un carré = 100 TWh bas-c.   30,55          15,00 · 2,91 · 12,65  49,1 % ·  9,5 % · 41,4 %
 *   un carré = 100 TWh fossile  19,30           1,53 · 1,44 · 16,33   7,9 % ·  7,5 % · 84,6 %
 *
 * The eighteen countries below 60 % are 45 % of the field, 58 % of the continent's electricity, and
 * they make 41,4 % of its low-carbon generation — 84 % as much as the sixteen cleanest. No still of
 * this beat holds two of those at once, and a video or a scrolly could only play them in the
 * author's order, once; this is a back-and-forth, not a sequence.
 *
 * `unit.ts` is the vocabulary, written for this beat and argued in `BRIEF.md` against the fourteen
 * that already exist. Native radios plus CSS generated at build time: no script, no listener, and
 * the complete field WITH a working control when JavaScript is off.
 *
 * THE FRACTION IS THE TYPE'S SECOND TRAP AND THIS PAGE'S OWN SUBJECT. The static sibling refused the
 * terawatt-hour unit in one sentence — *"a square standing for 10.4 TWh would be a length in
 * disguise, and the fractional last square would be the tell"* — and it was right to, because a
 * still gets one unit and cannot show that it chose. This page keeps the refusal and DRAWS the tell:
 * the default option is the static plate exactly, one square one country, with no part-square
 * anywhere; every other unit ends each block on a partial square, clipped at the glyph's own ink and
 * never at the cell's pitch (34 units against 40), and refused outright below a declared sliver.
 *
 * WHAT TRAVELS AND WHAT CUTS, WHICH IS A MECHANICAL DECISION AND NOT A TASTE ONE.
 *
 * NO SQUARE EVER MOVES. A cell's seat is a function of the GRID — the widest option's capacity —
 * and of no option at all, so every state is the same rectangles at the same places with different
 * widths. `width` on an SVG rect is a real CSS property on an element that is always rendered, which
 * is exactly the shape a transition needs (`display` does not interpolate), so the ink runs into the
 * field and drains out of it over 420 ms. That is the owner's fourth arbitrage honoured rather than
 * excused, and this family usually cannot: `weigh.ts` and `descend.ts` both re-place their marks.
 *
 * WHAT CUTS IS THE ANSWERING LAYER, and it has to. `interaction.mjs` resolves the mark under a
 * pointer from coordinates read ONCE at init, and a square's READING is different in every option —
 * under one it is Sweden, under another it is the fifth hundred terawatt-hours of its block and it
 * answers with which countries fill it. So each option draws its own `.pt` set and its own
 * transparent copy of that option's inked rectangles, in its own `<svg class="chart">`, and the
 * stylesheet reveals one. A hidden `<svg>` has no CTM and no focusable content, so pointer and
 * keyboard only ever reach the option on screen. The VISIBLE ink is in none of them: it is the
 * shared layer underneath, which is why it can travel while the readings cut.
 *
 * NO WORD MOVES EITHER. The three block names sit in the plot's own left gutter, at fixed CSS sizes,
 * in a column the geometry never touches — which is also the premier jet's own finding, where a
 * viewBox offset reserved above each block shrank with the geometry while the type did not and the
 * heading lifted clean out of the plot at 375 px. Each block's figure is four spans stacked at ONE
 * place and the stylesheet reveals one: the digits change, the span does not travel.
 *
 * COLOUR BELONGS TO THE BLOCK AND NOT TO THE COUNTRY, and that is a departure from the static
 * sibling with a reason. On that plate every square is shaded by its own country's share, which is a
 * real second reading. It cannot survive this control: under a terawatt-hour unit a square is not a
 * country and has no share to be shaded by, so the ramp would have to lie or disappear when an
 * option is pressed — a plate repainting itself under a control the reader pressed for a different
 * reason is the owner's first arbitrage exactly. A block is true in all four states. `PALETTE.md`
 * carries the measurement, including the separation between the three tones.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import {
  assertUnitDeclaration,
  unitCellId,
  unitCellsForMarkup,
  unitChromeCss,
  unitCss,
  unitFiguresForMarkup,
  unitNotesForMarkup,
  unitOptionsForMarkup,
} from "../../skills/chart-web/assets/unit.ts";

/**
 * THE GRID, AND EVERY NUMBER IN IT IS PART OF THE CONTRACT RATHER THAN A MARGIN THAT HAPPENED.
 *
 * `cell` is the PITCH and `ink` is the GLYPH: the six units between them are the margin the type
 * sheet's clipping rule is about, and `unit.ts` refuses a declaration where they are equal. `five`
 * is the extra gap after every fifth column — the oldest counting aid there is, and the one thing
 * that keeps a row of twenty countable at a glance instead of estimable.
 */
export const GRID = { columns: 20, cell: 40, ink: 34, five: 10, blockGap: 26 };

/** The gutter that carries the three block names and their figures, in CSS pixels, and the same
 *  distance expressed in the geometry's own units.
 *
 *  THE SECOND NUMBER IS WHY THE SQUARES ARE SQUARE, AND IT IS EXACT AT EXACTLY ONE WIDTH. The
 *  `.chart-plot` grid is `var(--y-gutter) 1fr`, so the `<svg>` gets the plot's width MINUS a fixed
 *  number of CSS pixels — which is a different FRACTION of the plot at every width. The format
 *  documents this as gutter drift and absorbs it with `preserveAspectRatio="none"`. The plot's
 *  declared `aspect-ratio` therefore counts the gutter as `gutterUnits` of geometry, which makes a
 *  square exactly square at the plot width where 104 CSS px really is 65 user units — 1 316 px of
 *  drawing, i.e. a 1 420 px plot, i.e. a 1 512 px window. `BRIEF.md` reports what the squares
 *  measure at that window and at 375 px instead of claiming they are square everywhere. */
export const GUTTER = { px: 104, units: 65 };

const UNIT_ID_PREFIX = "chart-stack";
const SCOPE = ".chart-figure";
/** How long the ink takes to run in or out. The one transition on this page. */
const INK_MS = 420;

export type FieldBlock = { key: string; capacity: number };

/** Where every seat of the grid sits, in the geometry's own units. Exported because the runner needs
 *  the same arithmetic to place each option's answering layer, and two derivations of one geometry
 *  is the defect `filter.ts` records under a different name. */
export function fieldGeometry(blocks: FieldBlock[]): {
  width: number;
  height: number;
  seatOf: (block: string, index: number) => { x: number; y: number };
} {
  const xOf = (column: number) => column * GRID.cell + Math.floor(column / 5) * GRID.five;
  const width = xOf(GRID.columns - 1) + GRID.ink;
  const tops = new Map<string, number>();
  let cursor = 0;
  for (const block of blocks) {
    tops.set(block.key, cursor);
    cursor += Math.ceil(block.capacity / GRID.columns) * GRID.cell + GRID.blockGap;
  }
  const height = cursor - GRID.blockGap - (GRID.cell - GRID.ink);
  return {
    width,
    height,
    seatOf: (block, index) => ({
      x: xOf(index % GRID.columns),
      y: (tops.get(block) as number) + Math.floor(index / GRID.columns) * GRID.cell,
    }),
  };
}

/** One inked cell of one option's answering layer. The runner builds these; the component draws
 *  them transparent and lets the shared ink underneath show through. */
export type PlateCell = {
  id: string;
  block: string;
  x: number;
  y: number;
  /** The ink this cell carries UNDER THIS OPTION — a whole glyph, or the remainder. */
  width: number;
  /** The reading it answers with under this option. A different KIND of reading per option, which
   *  is the half of the gesture a tooltip on a still could never have. */
  detail: string;
  /** The reading's own accessible name. */
  announce: string;
};

export type Plate = { slug: string; cells: PlateCell[] };

export function DirectedPictogramWeb({
  plates,
  unit,
  blockNames,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  plates: Plate[];
  unit: any;
  blockNames: { key: string; name: string }[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // Refused before anything is drawn, against what this component is actually handed — including
  // the ink the answering layers really carry, which is the beat's own second derivation of this
  // vocabulary's arithmetic and the one a mutation proved nothing was comparing.
  assertUnitDeclaration(unit, {
    drawn: new Map(
      plates.map((plate) => [plate.slug, new Map(plate.cells.map((c) => [c.id, c.width]))]),
    ),
  });

  const geometry = fieldGeometry(unit.blocks);

  // ── THE THREE TONES, AND THE SECOND ONE IS SEARCHED RATHER THAN TYPED ───────────────────────
  //
  // Two colours calibrated independently against the same floor on the same ground come out
  // IDENTICAL by construction — measured at 1,023:1 on this branch, and at 1,000:1 on a lollipop.
  // So only the ends are calibrated here and the middle is SOUGHT: the first mix of the accent into
  // the ground that clears the non-text floor against the ground AND a stated separation from both
  // of its neighbours. If no mix does, the beat refuses rather than shipping three tones a reader
  // cannot tell apart — which on this type would mean three blocks a reader cannot tell apart, and
  // the blocks are the whole partition.
  const SEPARATION = 1.35;
  const high = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  let low = mix(ground, ink, 0.34);
  if (contrast(low, ground) < NON_TEXT_CONTRAST_MIN)
    low = adjustToContrast(low, ground, NON_TEXT_CONTRAST_MIN) ?? low;
  const middle = (() => {
    for (let t = 0.1; t <= 0.9; t += 0.02) {
      const tone = mix(high, ground, t);
      if (
        contrast(tone, ground) >= NON_TEXT_CONTRAST_MIN &&
        contrast(tone, high) >= SEPARATION &&
        contrast(tone, low) >= SEPARATION
      )
        return tone;
    }
    throw new Error(
      `no tint of ${high} against ${ground} is both ${NON_TEXT_CONTRAST_MIN}:1 off the ground and ` +
        `${SEPARATION}:1 off ${high} and ${low}. The middle block would be one of its neighbours ` +
        "wearing a second name, and the three blocks are this beat's whole partition.",
    );
  })();
  const tone: Record<string, string> = { high, mid: middle, low };
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // WHAT A SQUARE BECOMES UNDER THE POINTER, AND THE DOSE IS SEARCHED RATHER THAN TYPED. The owner
  // refused a fixed dose that measured 1,104:1 on nocturne, and refused three times over a dot
  // plastered on top of a mark. So the square itself moves off ITS OWN fill by the smallest step of
  // the direction's own ink that clears a measured gap — three fills, three rules, none of them an
  // inline style, which would beat every generated rule.
  //
  // AND THE RESULT IS MEASURED AGAINST THE GROUND, WHICH THE SIBLINGS DO NOT DO, because this beat
  // went looking for a defect there and found the assumption instead. "Darken" is the wrong verb: on
  // `nocturne` the ground is #111044 and the neutral block's tone is reached by going LIGHTER than
  // it, so a step toward black would walk the square the reader is pointing at back TOWARD the
  // ground and out through the non-text floor. It does not, because `deriveFurniture` gives that
  // direction an ink of #FFFFFF — the step lightens, and all three tones measured further from the
  // ground under the pointer than at rest (creme 3,029 -> 3,961, rapport 3,033 -> 4,004, nocturne
  // 3,015 -> 4,123 on the tone with the least headroom). That is a property of the derived ink and
  // not of this arithmetic, so it is asserted rather than assumed: a direction whose ink stopped
  // being the pole its ground is not would refuse here instead of shipping a plate whose answering
  // square is its least visible mark.
  const darken = (fill: string) => {
    for (let dose = 0.14; dose <= 0.7; dose += 0.02) {
      const moved = mix(fill, ink, dose);
      if (contrast(moved, fill) < 1.14) continue;
      if (contrast(moved, ground) < NON_TEXT_CONTRAST_MIN)
        throw new Error(
          `the square that answers ${fill} would be drawn ${moved}, which is ` +
            `${contrast(moved, ground).toFixed(3)}:1 against ${ground} — under the non-text floor. ` +
            "The mark a reader is pointing at would be the least visible thing on the plate, which " +
            "is the sixth standing arbitrage measured on the fill the page really paints.",
        );
      return moved;
    }
    throw new Error(
      `no dose of the direction's ink moves ${fill} 1.14:1 off itself — a reader could not see ` +
        "which square answered the pointer",
    );
  };

  const cells = unitCellsForMarkup(unit);
  const unitOptions = unitOptionsForMarkup(unit, UNIT_ID_PREFIX);
  const unitNotes = unitNotesForMarkup(unit);

  const css = [
    unitChromeCss({ scope: SCOPE }),
    unitCss(unit, { scope: SCOPE, idPrefix: UNIT_ID_PREFIX, inkMs: INK_MS }),
    // THE THREE ANSWERS, one per tone. Emitted as generated rules keyed on the tone the square is
    // drawn in, exactly as the beeswarm's two are: `--mark-active` set inline on the mark would work
    // and would also be an inline declaration on an element whose width this stylesheet owns, which
    // is one inline style too many on a page built out of generated rules.
    ...Object.entries(tone).map(
      ([key, fill]) => `${SCOPE} rect.mark-active[data-tone="${key}"] { fill: ${darken(fill)}; }`,
    ),
    // THE ONE LINE THIS BEAT ADDS TO THE CHROME, AND IT IS OUTSIDE THE COPIED BLOCK ON PURPOSE.
    // `unitChromeCss` is a byte-for-byte copy of its sibling vocabularies' pill treatment, because
    // the pass that rewrites all sixteen of them at once must find them identical — so the fix for
    // this beat's own overflow lives here instead of inside it. The sibling beats' pills are two or
    // three words ("les habitants", "le CO2"); this control's are the UNIT ITSELF, which is the one
    // string it may not shorten, and four of them come to 521 px. `flex: 0 0 auto` on the options
    // row cannot shrink, so `flex-wrap: wrap` never fires and the document measured 545 px in a
    // 375 px window. One shrink factor lets the row wrap onto two lines at its own pills' width,
    // which is also the value the standing arbitrage about hugging frames names.
    `${SCOPE} .chart-unit .options { flex-shrink: 1; }`,
    // The gutter's own two rows. A block's name is furniture and never moves; its figure is four
    // spans at one place, and `unitCss` reveals one.
    `${SCOPE} .block-name { position: absolute; right: 12px; text-align: right; white-space: nowrap; color: ${labelInk}; }`,
    `${SCOPE} .block-figure { position: absolute; right: 12px; text-align: right; white-space: nowrap; color: ${labelInk}; }`,
    // The answer is four or five readings long and the format's box is 220px wide.
    `#tooltip { max-width: min(430px, 100vw - 32px); }`,
  ].join("\n\n");

  const pctY = (value: number) => (value / geometry.height) * 100;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          nothing leaves this picture in any state, and a field that hid squares would be a filter
          wearing this control's pills. A unit pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the field would otherwise
          only get from it. Each accessible name CONTAINS its visible one, and each visible one
          contains the unit itself — `assertUnitDeclaration` refuses the declaration otherwise,
          because a control that changes the unit without printing it is this type's own
          number-one failure with a moving part. */}
      <fieldset className="chart-unit">
        <legend>{unit.label}</legend>
        <div className="options">
          {unitOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={UNIT_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — what the re-counting bought, in words, for a
          reader who is not looking at the field. Its row is reserved whether or not an option is
          chosen, so choosing one never moves the field underneath it. The default reveals none: it
          is not a counterfactual, it is the claim the title states. */}
      <div className="unit-notes" role="status">
        {unitNotes.map((note) => (
          <p key={note.slug} data-stack-note={note.slug} style={{ ...regs.annot, margin: 0 }}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${GUTTER.px}px`,
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${geometry.width + GUTTER.units} / ${geometry.height}`,
        }}
      >
        {/* THE BLOCK NAMES AND THEIR FIGURES, in the plot's own left gutter — a column of fixed CSS
            pixels the geometry never enters, which is the one place on this page a word can sit
            without either moving or shrinking. Each block's figure is one span per option, stacked
            at one place: the digits change and nothing travels. */}
        <div className="y-axis">
          {unit.blocks.map((block: FieldBlock) => {
            const seat = geometry.seatOf(block.key, 0);
            const name = blockNames.find((b) => b.key === block.key)?.name ?? block.key;
            return (
              <span key={block.key}>
                <span
                  className="block-name"
                  style={{ ...regs.axis, top: `${pctY(seat.y)}%`, fontWeight: 600 }}
                >
                  {name}
                </span>
                {unitFiguresForMarkup(unit, block.key).map((figure) => (
                  <span
                    key={figure.slug}
                    className="block-figure"
                    data-stack-total={figure.slug}
                    style={{ ...regs.annot, top: `calc(${pctY(seat.y)}% + 1.25em)` }}
                  >
                    {figure.text}
                  </span>
                ))}
              </span>
            );
          })}
        </div>

        {/* THE VISIBLE INK, DRAWN ONCE. Not one rectangle per option: a cell's seat is a function of
            the grid and of no option, so the four states are the same rectangles at the same places
            with four sets of widths — and a width that is set by the stylesheet, on an element that
            is always rendered, is a width that can travel. This layer carries no `.pt` and no
            `.hit-area`, so `initChart` returns on it immediately and it is never wired to anything.
            GEOMETRY ONLY — no `<text>`: the stretch below would scale it. */}
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={geometry.width} height={geometry.height} fill={ground} />
          {cells.map((cell) => {
            const seat = geometry.seatOf(cell.block, cell.index);
            return (
              <rect
                key={cell.id}
                data-cell={cell.id}
                x={seat.x}
                y={seat.y}
                width={0}
                height={GRID.ink}
                rx={3}
                fill={tone[cell.block]}
              />
            );
          })}
        </svg>

        {/* ONE ANSWERING LAYER PER OPTION, stacked in the same grid cell, and only the chosen one
            displayed. Transparent: the ink a reader sees is the shared layer above, and what lives
            here is the per-option READING — which square this is, and what it is made of under this
            unit. The rectangles are redrawn here at the option's own widths so that the square
            itself is what darkens under the pointer (`data-mark`), rather than a dot plastered on
            top of it, which the owner has refused three times. */}
        {plates.map((plate) => (
          <svg
            key={plate.slug}
            data-unit={plate.slug}
            role="group"
            aria-label={title}
            xmlns="http://www.w3.org/2000/svg"
            className="chart"
            data-hit="cell"
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            preserveAspectRatio="none"
          >
            {plate.cells.map((cell) => (
              <rect
                key={`mark-${cell.id}`}
                data-mark={`${plate.slug}:${cell.id}`}
                data-tone={cell.block}
                x={cell.x}
                y={cell.y}
                width={cell.width}
                height={GRID.ink}
                rx={3}
                fill="transparent"
              />
            ))}
            {plate.cells.map((cell) => (
              <circle
                key={`hit-${cell.id}`}
                className="pt"
                data-mark-ref={`${plate.slug}:${cell.id}`}
                cx={cell.x + cell.width / 2}
                cy={cell.y + GRID.ink / 2}
                r={GRID.ink / 2}
                fill="transparent"
                stroke="none"
                tabIndex={0}
                role="img"
                aria-label={cell.announce}
                data-detail={cell.detail}
              />
            ))}
            <rect
              className="hit-area"
              x={0}
              y={0}
              width={geometry.width}
              height={geometry.height}
              fill="transparent"
              pointerEvents="all"
            />
          </svg>
        ))}

        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "12px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
