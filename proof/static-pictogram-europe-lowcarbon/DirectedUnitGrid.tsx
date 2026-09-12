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
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";

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
}) {
  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const inkOf = { ink, muted, accent: direction.accent } as Record<
    string,
    string
  >;
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => {
    const r = resolveRegister(direction, name);
    return { ...r, fill: inkOf[r.ink] };
  };
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
  const titleLead = display.fontSize * 1.22;
  const bodyLead = body.fontSize * 1.45;
  const annotLead = annot.fontSize * 1.4;
  const keyRoom = axisBand.ascent * 2 + axisBand.descent + 14;

  const total = blocks.reduce((s, b) => s + b.count, 0);

  /** WHAT A BLOCK OWES: its name and count on one line, and a field of squares under it. The square
   *  has a floor of its own — under it the field stops being countable, which is the one thing this
   *  form exists to be. */
  const SQUARE_FLOOR = 13;
  const blockHeadH = annotBand.ascent + annotBand.descent + 6;

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + body.fontSize * 0.7;
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = readingLines.length
      ? sourceTop - bodyLead - readingLines.length * annotLead
      : sourceTop - bodyLead * 0.4;
    const top = limitsTop + limitLines.length * bodyLead + body.fontSize * 0.4;
    const bottom = readingTop - annot.fontSize * 1.2 - keyRoom;
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
   *  fewer rows, and fewer rows is more height per square. */
  const rowChoices = [20, 16, 13, 10, 8];
  const rungs: Array<{
    perRow: number;
    title: number;
    limit: number;
    reading: number;
  }> = [];
  for (const perRow of rowChoices)
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

  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
    cell: number;
  } | null = null;
  let best = -Infinity;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    const { cell } = sizeFor(rung.perRow, l);
    if (cell > best) best = cell;
    if (cell >= SQUARE_FLOOR) {
      fits = { rung, layout: l, cell };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `${total} squares do not fit this direction: the best layout gives each ${best.toFixed(1)}px ` +
        `and a square a reader is asked to COUNT owes ${SQUARE_FLOOR}px. A field nobody can count ` +
        `is a bar chart made of squares. Draw fewer units, or publish taller.`,
    );
  const { layout, cell } = fits;
  const perRow = fits.rung.perRow;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · ${total} units, ${perRow} per row, square ${cell.toFixed(1)}px against a ${SQUARE_FLOOR}px floor`,
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
          const swatchW = Math.max(cell * 1.7, 34);
          const top = layout.bottom + 12;
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
              <text
                x={PAD + classCount * swatchW + 10}
                y={top + axisBand.ascent}
                {...line(axis)}
                fill={mutedInk}
              >
                {set(unitIs, axis)}
              </text>
              <text
                x={PAD + classCount * swatchW + 10}
                y={top + axisBand.ascent * 2 + 4}
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
