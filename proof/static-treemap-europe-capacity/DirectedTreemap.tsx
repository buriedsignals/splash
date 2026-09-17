/**
 * Europe's installed low-carbon capacity, country by country, as a treemap, THROUGH the design base.
 * The first `treemap` component in this tree.
 *
 * WHAT AN AREA ENCODING BUYS AND WHAT IT COSTS. It holds quantities three orders of magnitude apart
 * in one frame — France at 97 GW beside Estonia at 0.3 — which no bar chart on one scale can do.
 * It costs comparison across distance: two cells far apart on the canvas cannot be ranked by eye.
 *
 * `every cell carries its own number` (Information is Beautiful) is therefore not a nicety on this
 * form, it is the repair for its known weakness — and it drives the layout rather than decorating
 * it: **the number of cells is a ladder, and the rung is chosen by whether every drawn cell can
 * carry its own figure.** What does not fit is not shrunk into illegibility, it is folded into one
 * remainder cell that carries its own number too.
 *
 * **Three registers inside one label — value, subject, basis** — so a figure never appears without
 * the kind of figure it is. IiB sets "$225 / Mark Zuckerberg / PERSONAL WEALTH (AS OF APR 2026)";
 * here it is the gigawatts, the country, and how many stations that capacity is spread over. A cell
 * too small for all three drops the basis first and the subject second: the value is the last thing
 * to go, and a cell that cannot hold the value does not exist — it is in the remainder.
 *
 * `accent-marks-the-thread` — the accent is the countries whose fleet has tipped to wind and solar,
 * which is an argument running through the figure and not its maximum. `render-directions.mjs`
 * refuses to render if the largest cell ever joins the thread; `PALETTE.md` says why.
 *
 * THE LAYOUT IS SQUARIFIED (Bruls, Huizing & van Wijk): cells are laid in rows whose aspect ratios
 * are kept as near square as the running total allows. A treemap that is not squarified draws long
 * slivers, and a sliver is a shape whose area a reader cannot read at all — which would give away
 * the one thing this form is for.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix, contrast } from "#shared/chart-beat/colour.mjs";
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

export type Cell = {
  key: string;
  name: string;
  mw: number;
  sites: number;
  tipped: boolean;
  value: string;
  basis: string;
};

type Rect = { x: number; y: number; w: number; h: number };

/** Squarified treemap: values must be sorted descending and sum to the box's area. */
function squarify(values: number[], box: Rect): Rect[] {
  const out: Rect[] = [];
  let free = { ...box };
  let queue = values.slice();
  const worst = (row: number[], side: number) => {
    const sum = row.reduce((s, v) => s + v, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    const s2 = sum * sum;
    const side2 = side * side;
    return Math.max((side2 * max) / s2, s2 / (side2 * min));
  };
  const layRow = (row: number[]) => {
    const sum = row.reduce((s, v) => s + v, 0);
    const horizontal = free.w >= free.h;
    const thickness = sum / (horizontal ? free.h : free.w);
    let cursor = horizontal ? free.y : free.x;
    for (const v of row) {
      const length = v / thickness;
      out.push(
        horizontal
          ? { x: free.x, y: cursor, w: thickness, h: length }
          : { x: cursor, y: free.y, w: length, h: thickness },
      );
      cursor += length;
    }
    if (horizontal)
      free = {
        x: free.x + thickness,
        y: free.y,
        w: free.w - thickness,
        h: free.h,
      };
    else
      free = {
        x: free.x,
        y: free.y + thickness,
        w: free.w,
        h: free.h - thickness,
      };
  };
  let row: number[] = [];
  while (queue.length) {
    const side = Math.min(free.w, free.h);
    const next = queue[0];
    if (!row.length || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      queue = queue.slice(1);
    } else {
      layRow(row);
      row = [];
    }
  }
  if (row.length) layRow(row);
  return out;
}

export function DirectedTreemap({
  cells,
  unit,
  threadNote,
  restLabel,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  onLadder,
}: {
  cells: Cell[];
  unit: string;
  threadNote: string;
  restLabel: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
}) {
  const { width, height } = FRAME;
  const { ink, muted } = deriveFurniture(direction.ground);
  const PAD = direction.pad;

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
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));

  function wrap(text: string, maxWidth: number, r: any): string[] {
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
  const axisBand = bandOf(axis);
  const valueBand = bandOf(value);

  /** THE FIELD IS QUIET AND THE THREAD IS NOT. Every cell is one of two fills — the field's own
   *  step off the ground, and the direction's accent for the thread — and the ink inside a cell is
   *  whichever of ink and ground clears the floor against the fill it sits on. */
  const field = mix(direction.ground, ink, 0.1);
  const thread = direction.accent;
  const edge = direction.ground;
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(direction.ground, fill)
      ? ink
      : direction.ground;

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline +
      gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) +
      display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.5517);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop =
      sourceTop -
      bodyLead * 1.1 -
      Math.max(0, readingLines.length - 1) * annotLead;
    const boxTop =
      limitsTop +
      limitLines.length * bodyLead +
      annotBand.ascent * 1.3 +
      axisBand.ascent;
    const boxBottom =
      (readingLines.length
        ? readingTop - annotBand.ascent - gapOf(annot, 0.6429)
        : sourceTop - bodyLead * 1.2) -
      axisBand.ascent -
      axisBand.descent -
      8;
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
      boxTop,
      boxBottom,
      box: boxBottom - boxTop,
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++)
        rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }

  const totalMw = cells.reduce((s, c) => s + c.mw, 0);
  const INSET = 4;
  /** French thousands, with an ordinary space: `toLocaleString("fr-FR")` emits U+202F, which no face
   *  on this base's family ladders covers, and one uncovered glyph refuses every family. */
  const grouped = (n: number) =>
    String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  /** HOW MANY CELLS THE PLATE DRAWS IS A MEASUREMENT. Every drawn cell has to hold its own figure —
   *  that is this form's repair for the fact that area does not compare across distance — so the
   *  beat walks the counts from generous to mean and takes the first at which every cell fits its
   *  value. What is left over becomes ONE remainder cell, which carries its own number too. */
  const attempt = (layout_: ReturnType<typeof layoutFor>, count: number) => {
    if (layout_.box <= 0) return null;
    const head = cells.slice(0, count);
    const tail = cells.slice(count);
    /** THE REMAINDER IS SPLIT ALONG THE THREAD, OR THE THREAD IS UNDER-DRAWN. Folded into one cell,
     *  the tail put nine of the ten tipped countries inside a neutral rectangle: the headline said
     *  ten and the plate showed one. A remainder that mixes the thread with the field is not a
     *  remainder, it is a place the argument goes to hide. */
    const groupOf = (rest: Cell[], label: string, tippedGroup: boolean) => ({
      key: tippedGroup ? "rest-thread" : "rest",
      name: `${rest.length} ${label}`,
      mw: rest.reduce((s, c) => s + c.mw, 0),
      sites: rest.reduce((s, c) => s + c.sites, 0),
      tipped: tippedGroup,
      value:
        rest.reduce((s, c) => s + c.mw, 0) >= 1000
          ? `${(rest.reduce((s, c) => s + c.mw, 0) / 1000).toFixed(1).replace(".", ",")} GW`
          : `${Math.round(rest.reduce((s, c) => s + c.mw, 0))} MW`,
      basis: `${grouped(rest.reduce((s, c) => s + c.sites, 0))} centrales`,
    });
    const tailThread = tail.filter((c) => c.tipped);
    const tailField = tail.filter((c) => !c.tipped);
    const remainders = [
      ...(tailThread.length
        ? [groupOf(tailThread, "pays basculés", true)]
        : []),
      ...(tailField.length ? [groupOf(tailField, restLabel, false)] : []),
    ];
    const drawn = [...head, ...remainders].sort((a, b) => b.mw - a.mw);
    const box = {
      x: PAD,
      y: layout_.boxTop,
      w: width - PAD * 2,
      h: layout_.box,
    };
    const area = box.w * box.h;
    const rects = squarify(
      drawn.map((c) => (c.mw / totalMw) * area),
      box,
    );
    if (rects.length !== drawn.length) return null;
    const nameLead = annotBand.ascent + annotBand.descent;
    const placed = drawn.map((c, i) => {
      const r = rects[i];
      const inner = { w: r.w - INSET * 2, h: r.h - INSET * 2 };
      /** THE NAME WRAPS TO THE CELL, up to two lines. A treemap's cells are whatever shape the data
       *  makes them, and a name measured on one line alone drops out of every tall narrow cell —
       *  which is most of the small ones. */
      const nameLines = wrap(set(c.name, annot), inner.w, annot).slice(0, 2);
      const nameFits =
        nameLines.length > 0 &&
        nameLines.every((l) => widthOf(l, annot) <= inner.w) &&
        wrap(set(c.name, annot), inner.w, annot).length <= 2;
      const fitsValue =
        inner.w >= widthOf(set(c.value, value), value) &&
        inner.h >= valueBand.ascent + valueBand.descent;
      const fitsName =
        nameFits &&
        inner.h >=
          valueBand.ascent +
            valueBand.descent +
            nameLines.length * nameLead +
            2;
      const fitsBasis =
        inner.w >= widthOf(set(c.basis, axis), axis) &&
        inner.h >=
          valueBand.ascent +
            valueBand.descent +
            nameLines.length * nameLead +
            axisBand.ascent +
            axisBand.descent +
            6;
      return {
        c,
        r,
        nameLines,
        fitsValue,
        fitsName: fitsName && fitsValue,
        fitsBasis: fitsBasis && fitsName && fitsValue,
      };
    });
    if (placed.some((p) => !p.fitsValue)) return null;
    /** A CELL IN THE THREAD CARRIES ITS NAME OR THE PLATE DOES NOT DRAW IT. The thread is the
     *  argument; an accented box with a number and no subject is an assertion with nothing to
     *  attach it to, and a reader has no way to learn what the colour meant. */
    if (placed.some((p) => p.c.tipped && !p.fitsName)) return null;
    return { placed, drawn };
  };

  const COUNTS = [16, 14, 12, 11, 10, 9, 8, 7, 6];
  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
    got: NonNullable<ReturnType<typeof attempt>>;
    count: number;
  } | null = null;
  outer: for (const rung of rungs) {
    const layout_ = layoutFor(rung.title, rung.limit, rung.reading);
    for (const count of COUNTS) {
      const got = attempt(layout_, Math.min(count, cells.length));
      if (got) {
        fits = {
          rung,
          layout: layout_,
          got,
          count: Math.min(count, cells.length),
        };
        break outer;
      }
    }
  }
  if (!fits)
    throw new Error(
      `no filed cell count leaves every cell room for its own figure in this direction. An area ` +
        `encoding whose cells carry no numbers cannot be compared across the plate at all.`,
    );
  const { layout, got, count } = fits;
  const named = got.placed.filter((p) => p.fitsName).length;
  const based = got.placed.filter((p) => p.fitsBasis).length;

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · box ${layout.box.toFixed(0)}px · ${count} countries + remainder · ` +
      `${got.placed.length} values, ${named} names, ${based} bases`,
  );

  const noteY = layout.boxBottom + 8 + axisBand.ascent;

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

      <text
        x={PAD}
        y={layout.boxTop - axisBand.descent - 4}
        {...line(axis)}
        fontWeight={700}
        fill={mutedInk}
      >
        {set(unit, axis)}
      </text>

      {got.placed.map(({ c, r, nameLines, fitsName, fitsBasis }) => {
        const fill = c.tipped ? thread : field;
        const on = legibleOn(fill);
        // The basis line is QUIETER than the value above it, never fainter than a reader can
        // read: mixing 35% toward the fill took "2 309 centrales" to 4.02:1 on the thread's own
        // accent (3.75:1 in rapport), under the 4.5 text floor. Quieten, then lift the result back
        // to the floor against the fill it actually sits on — the same two steps `mutedInk` takes
        // against the ground.
        const quiet =
          adjustToContrast(mix(on, fill, 0.35), fill, TEXT_CONTRAST_MIN) ?? on;
        const top = r.y + INSET + valueBand.ascent;
        return (
          <g key={c.key}>
            <rect
              x={r.x}
              y={r.y}
              width={Math.max(r.w - 1, 0.5)}
              height={Math.max(r.h - 1, 0.5)}
              fill={fill}
              stroke={edge}
              strokeWidth={1}
            />
            <text x={r.x + INSET} y={top} {...line(value)} fill={on}>
              {set(c.value, value)}
            </text>
            {fitsName &&
              nameLines.map((l, i) => (
                <text
                  key={`n${i}`}
                  x={r.x + INSET}
                  y={
                    top +
                    valueBand.descent +
                    annotBand.ascent +
                    2 +
                    i * (annotBand.ascent + annotBand.descent)
                  }
                  {...line(annot)}
                  fill={on}
                >
                  {l}
                </text>
              ))}
            {fitsBasis && (
              <text
                x={r.x + INSET}
                y={
                  top +
                  valueBand.descent +
                  nameLines.length * (annotBand.ascent + annotBand.descent) +
                  axisBand.ascent +
                  5
                }
                {...line(axis)}
                fill={quiet}
              >
                {set(c.basis, axis)}
              </text>
            )}
          </g>
        );
      })}

      <text x={PAD} y={noteY} {...line(axis)} fill={mutedInk}>
        {set(threadNote, axis)}
      </text>

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
    </svg>
  );
}
