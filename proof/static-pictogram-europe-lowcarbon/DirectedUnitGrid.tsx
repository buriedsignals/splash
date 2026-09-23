/**
 * Forty European countries, one square each, drawn THROUGH the design base. The first `pictogram`
 * component in this tree.
 *
 * `a-quantity-is-made-countable-by-drawing-its-units` (ProPublica, Ferdio viz30) — one mark per
 * COUNTRY, all the same size, so the reader counts rather than estimating a length. ABC states the
 * cost and takes it: the obvious chart here is a histogram of three bars; this draws every country
 * instead, so the reader sees the population and not three totals.
 *
 * The unit has to be a real thing, and here it is: one square is one country. A square standing for
 * `10.4 TWh` would be a length in disguise, and the fractional last square would be the tell.
 *
 * `a-countable-field-is-paired-with-its-own-figure` (Information is Beautiful, Ferdio viz30) — each
 * block prints its own count, in units, beside the field it counts. IiB: neither alone does the work
 * — the number is unreadable as a quantity, the field is unreadable as a figure.
 *
 * `the-scale-is-stepped-not-continuous` and `a-sequential-grid-is-one-hue-cluster` — the square's
 * fill is a class of one ramp built between the direction's own poles, so a reader who wants more
 * than "which block" can still read a square.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Unit = {
  key: string;
  label: string;
  value: number;
  classIndex: number;
};
export type Block = {
  name: string;
  count: number;
  units: Unit[];
  thread: boolean;
};

export function DirectedUnitGrid({
  blocks,
  breaks,
  unitIs,
  middleNote,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  blocks: Block[];
  breaks: string[];
  unitIs: string;
  middleNote: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  /** THE FORM THIS FRAME ASKS FOR, read off the frame. Everything below that is conditional on it
   *  leaves the landscape plate exactly as it was accepted. */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");

  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthCache = new Map<string, number>();
  const widthOf = (text: string, r: any) => {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${r.letterSpacing}|${text}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      w =
        measureText(text, sizeOf(r)) +
        Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
      widthCache.set(key, w);
    }
    return w;
  };
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));

  const wrapCache = new Map<string, string[]>();
  function wrap(text: string, maxWidth: number, r: any): string[] {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${maxWidth}|${text}`;
    const hit = wrapCache.get(key);
    if (hit) return hit;
    const out: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        out.push(current);
        current = word;
      } else current = trial;
    }
    if (current) out.push(current);
    wrapCache.set(key, out);
    return out;
  }

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  const accentInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);
  const axisBand = bandOf(axis);

  /** ONE HUE, FIVE CLASSES, LIGHTNESS FALLING THE WHOLE WAY — the ramp this base builds everywhere,
   *  between the direction's own ground and its own accent. */
  const low = mix(direction.accent, direction.ground, 0.9);
  const high = mix(direction.accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classFill = (i: number) =>
    mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const axisLead = axisBand.ascent + axisBand.descent + 2;

  /** THE KEY'S TWO NOTES GO UNDER THE SWATCHES WHEN THEY NO LONGER FIT BESIDE THEM, and whether they
   *  fit is MEASURED against the narrowest swatch row the key can draw. At 960 they sit beside the
   *  ramp with 400px to spare and this is a no-op. At 540 they did not: « 1 pays sans donnée 2024
   *  n'est pas dessiné » ran past the plate's own margin in both the square and the portrait render —
   *  not off the frame, which is why nothing caught it, but into the gutter every other line
   *  respects. */
  const keyNoteW = Math.max(
    widthOf(set(unitIs, axis), axis),
    widthOf(set(middleNote, axis), axis),
  );
  /** Stacked, the key owes its two notes a row each — and a clear line under them ONLY when a
   *  reading line follows, because the two are set in the same small type and without the gap they
   *  read as one paragraph. Where the ladder has already dropped the reading, the source's own
   *  leading does that work and the 10px would be taken out of the squares for nothing: it cost the
   *  square plate 3px of side when it was charged unconditionally. */
  const keyRoomFor = (stacked: boolean, hasReading: boolean) =>
    axisBand.ascent * 2 +
    axisBand.descent +
    14 +
    (stacked ? 2 * axisLead + (hasReading ? 10 : 0) : 0);

  const total = blocks.reduce((s, b) => s + b.count, 0);

  /** WHAT A BLOCK OWES: its name and count on one line, and a field of squares under it. The square
   *  has a floor of its own — under it the field stops being countable, which is the one thing this
   *  form exists to be. */
  const SQUARE_FLOOR = 13;
  const blockHeadH = annotBand.ascent + annotBand.descent + 6;

  const layoutFor = (t: number, l: number, r: number, stacked: boolean) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.4828);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = readingLines.length
      ? sourceTop - bodyLead - readingLines.length * annotLead
      : sourceTop - bodyLead * 0.4;
    const top = limitsTop + limitLines.length * bodyLead + gapOf(body, 0.2759);
    const bottom =
      readingTop - gapOf(annot, 0.8571) - keyRoomFor(stacked, readingLines.length > 0);
    return {
      titleLines,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      readingTop,
      sourceTop,
      top,
      bottom,
    };
  };

  /** THE COLUMN COUNT IS A RUNG. A field of forty squares can be laid ten wide or twenty wide, and
   *  which one keeps the square above its floor is a measurement. Widest rows first: a wide row is
   *  fewer rows, and fewer rows is more height per square.
   *
   *  THAT REASONING HOLDS ONLY WHILE HEIGHT IS WHAT RUNS OUT, and at 1080 x 1920 it is not. The cell
   *  is the SMALLER of what the height allows and what the width allows; at portrait the width
   *  allowed 21.5px, the height allowed 100+, and the widest row won the ladder on its first try. The
   *  render was three short rows of small squares in the top third and half the frame empty under
   *  them — nothing clipped, nothing colliding, and a pictogram that had stopped using its own plate.
   *  So a frame that is not landscape asks each copy rung for the row count that gives the BIGGEST
   *  square rather than taking the widest row on offer, which at portrait is 8 per row: six rows of
   *  52px squares that reach the key. At square the height is binding again and the answer comes back
   *  20, which is why this is a measurement and not a second hardcoded list. */
  const rowChoices = [20, 16, 13, 10, 8];
  const rungs: Array<{
    perRow: number | null;
    title: number;
    limit: number;
    reading: number;
  }> = [];
  const perRowChoices: Array<number | null> =
    SIZE === "landscape" ? rowChoices : [null];
  for (const perRow of perRowChoices)
    for (let t = 0; t < title.length; t++)
      for (let l = 0; l < limits.length; l++) {
        for (let r = 0; r < reading.length; r++)
          rungs.push({ perRow, title: t, limit: l, reading: r });
        rungs.push({ perRow, title: t, limit: l, reading: -1 });
      }

  const sizeFor = (perRow: number, l: ReturnType<typeof layoutFor>) => {
    const rowsUsed = blocks.reduce(
      (s, b) => s + Math.ceil(b.count / perRow),
      0,
    );
    const gaps = blocks.length;
    const usable =
      l.bottom - l.top - gaps * blockHeadH - (blocks.length - 1) * 10;
    const cell = Math.min(usable / rowsUsed, (width - PAD * 2) / perRow);
    return { rowsUsed, cell };
  };

  /** The row count this layout gets the biggest square out of — `null` on a rung means "ask". */
  const resolveRow = (perRow: number | null, l: ReturnType<typeof layoutFor>) => {
    if (perRow !== null) return { perRow, cell: sizeFor(perRow, l).cell };
    let pick = { perRow: rowChoices[0], cell: -Infinity };
    for (const candidate of rowChoices) {
      const { cell } = sizeFor(candidate, l);
      if (cell > pick.cell) pick = { perRow: candidate, cell };
    }
    return pick;
  };

  type Fit = {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
    cell: number;
    perRow: number;
  };
  let best = -Infinity;
  const solve = (stacked: boolean): Fit | null => {
    for (const rung of rungs) {
      const l = layoutFor(rung.title, rung.limit, rung.reading, stacked);
      const { perRow, cell } = resolveRow(rung.perRow, l);
      if (cell > best) best = cell;
      if (cell >= SQUARE_FLOOR) return { rung, layout: l, cell, perRow };
    }
    return null;
  };

  /** The ramp never runs past the plate's own margin: at portrait a 52px square would make an 88px
   *  swatch, and five of those plus the two notes beside them are wider than the column. */
  const swatchFor = (c: number) =>
    Math.min(Math.max(c * 1.7, 34), (width - PAD * 2) / classCount);

  /** TWO PASSES, BECAUSE THE KEY'S WIDTH AND THE SQUARE'S SIZE EACH DEPEND ON THE OTHER. The swatch
   *  is sized off the square, and whether the notes still fit beside the swatches decides how much
   *  height the key takes, which is what the square is sized out of. So the ladder is solved once
   *  with the notes beside the ramp — the shape landscape was accepted in — and solved again only if
   *  the square that came back makes a ramp too wide for them. Stacking only ever takes height, so
   *  the second pass cannot want to unstack and there is no third. */
  let keyStacked = false;
  let fits = solve(false);
  if (fits && PAD + classCount * swatchFor(fits.cell) + 10 + keyNoteW > width - PAD) {
    keyStacked = true;
    fits = solve(true);
  }
  if (!fits)
    throw new Error(
      `${total} squares do not fit this direction: the best layout gives each ${best.toFixed(1)}px ` +
        `and a square a reader is asked to COUNT owes ${SQUARE_FLOOR}px. A field nobody can count ` +
        `is a bar chart made of squares. Draw fewer units, or publish taller.`,
    );
  const { layout, cell, perRow } = fits;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · ${total} units, ${perRow} per row, square ${cell.toFixed(1)}px against a ${SQUARE_FLOOR}px floor` +
      (keyStacked ? " · key notes stacked under the ramp" : ""),
  );

  const gap = Math.max(cell * 0.14, 2);
  const side = cell - gap;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />

      <text x={PAD} y={layout.eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {layout.titleLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.titleTop + i * titleLead}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.limitsTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}
      {layout.readingLines.map((l, i) => (
        <text
          key={`r${i}`}
          x={PAD}
          y={layout.readingTop + i * annotLead}
          {...line(annot)}
          fill={mutedInk}
        >
          {l}
        </text>
      ))}
      {layout.sourceLines.map((l, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={layout.sourceTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}

      {(() => {
        let y = layout.top;
        return blocks.map((block) => {
          const rowsUsed = Math.ceil(block.count / perRow);
          const headY = y + annotBand.ascent;
          const fieldY = y + blockHeadH;
          const node = (
            <g key={block.name}>
              {/* THE BLOCK'S OWN FIGURE, beside the field it counts — in units, because a field of
                  things is counted in things. */}
              <text
                x={PAD}
                y={headY}
                {...line(value)}
                fill={block.thread ? accentInk : mutedInk}
                fontWeight={700}
              >
                {set(format(block.count), value)}
              </text>
              <text
                x={PAD + widthOf(set(format(block.count), value), value) + 8}
                y={headY}
                {...line(annot)}
                fill={block.thread ? accentInk : mutedInk}
              >
                {set(block.name, annot)}
              </text>

              {block.units.map((u, i) => (
                <rect
                  key={u.key}
                  x={PAD + (i % perRow) * cell}
                  y={fieldY + Math.floor(i / perRow) * cell}
                  width={side}
                  height={side}
                  fill={classFill(u.classIndex)}
                  stroke={grid}
                  strokeWidth={direction.stroke.hairline}
                />
              ))}
            </g>
          );
          y = fieldY + rowsUsed * cell + 10;
          return node;
        });
      })()}

      {/* THE KEY: the classes the square fills come from, each break in the fill of the class it
          opens, and one line saying what a single square IS. */}
      {on("the-scale-is-stepped-not-continuous") &&
        (() => {
          const swatchW = swatchFor(cell);
          const top = layout.bottom + 12;
          const noteX = keyStacked ? PAD : PAD + classCount * swatchW + 10;
          const noteY = keyStacked
            ? top + axisBand.ascent * 2 + 4 + axisLead
            : top + axisBand.ascent;
          return (
            <g>
              {Array.from({ length: classCount }, (_, i) => (
                <g key={`key-${i}`}>
                  <rect
                    x={PAD + i * swatchW}
                    y={top}
                    width={swatchW - 1}
                    height={axisBand.ascent}
                    fill={classFill(i)}
                    stroke={grid}
                    strokeWidth={direction.stroke.hairline}
                  />
                  {i > 0 && (
                    <text
                      x={PAD + i * swatchW}
                      y={top + axisBand.ascent * 2 + 2}
                      textAnchor="middle"
                      {...line(axis)}
                      fill={adjustToContrast(
                        classFill(i),
                        direction.ground,
                        TEXT_CONTRAST_MIN,
                      )}
                    >
                      {set(breaks[i - 1], axis)}
                    </text>
                  )}
                </g>
              ))}
              <text x={noteX} y={noteY} {...line(axis)} fill={mutedInk}>
                {set(unitIs, axis)}
              </text>
              <text
                x={noteX}
                y={noteY + (keyStacked ? axisLead : axisBand.ascent + 4)}
                {...line(axis)}
                fill={mutedInk}
              >
                {set(middleNote, axis)}
              </text>
            </g>
          );
        })()}
    </svg>
  );
}
