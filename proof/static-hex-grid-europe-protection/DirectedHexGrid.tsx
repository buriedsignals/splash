/**
 * Ukrainians under temporary protection per 1 000 inhabitants, one hexagon per country, THROUGH the
 * design base. The first `hex grid` component in this tree.
 *
 * WHAT THE HEXAGON BUYS OVER THE SQUARE, read off the reference's own drawing rather than argued:
 * **six neighbours, every one of them edge-sharing.** A square grid touches diagonally, so a reader
 * has to decide whether corner contact counts as adjacency; a hex grid has no corners to argue
 * about. That is the whole geometric difference between this beat and
 * `proof/static-cartogram-europe-lowcarbon`, whose cells are squares.
 *
 * `one unit, one cell, all cells equal` (Open Innovations) — the map gives up area and buys the one
 * thing a choropleth cannot give: every unit equally visible. On a subject that is countries rather
 * than territory, that is the honest geometry.
 *
 * `the cells are separated by a stroke in the GROUND's colour` (Open Innovations, measured: 652
 * white-stroked marks on a `#EFEFEF` page) — so the grid reads as a tiled surface rather than as
 * scattered marks. Here the stroke is `direction.ground`.
 *
 * `the unit's code sits inside its own cell` (Open Innovations, at 6.4px on 650 cells) — at
 * thirty-two cells this plate can afford the axis register, and the floor below refuses a hexagon
 * too small to hold its own code, exactly as the tile cartogram refuses a tile that cannot.
 *
 * `a unit that is not in the measure keeps its cell and loses its fill` — the sibling record draws
 * seven undeclared seats as empty hexes and prints how many are outstanding. Here it is Ukraine: on
 * the plate, outside the count, in the neutral that sits outside the ramp.
 *
 * `the-scale-is-stepped-not-continuous`, `the-key-prints-its-breaks-in-the-data-s-units` — as the
 * choropleth and the cartogram. `PALETTE.md` records why the reference's twelve categorical hues are
 * not taken.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
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

export type Tile = {
  code: string;
  name: string;
  row: number;
  col: number;
  rate: number | null;
  classIndex: number | null;
  isSubject: boolean;
};

export function DirectedHexGrid({
  tiles,
  columns,
  rows,
  breaks,
  unit,
  originNote,
  originCode,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  tiles: Tile[];
  columns: number;
  rows: number;
  breaks: string[];
  unit: string;
  originNote: string[];
  originCode: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
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
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  /** A CELL IS A MARK ON THE GROUND. The lowest class has to clear the non-text floor against the
   *  ground it sits on, or it is not a pale class, it is a hole in the grid — the cartogram's own
   *  correction, in a second geometry. */
  const floorAgainstGround = (colour: string, what: string) => {
    if (contrast(colour, direction.ground) >= NON_TEXT_CONTRAST_MIN) return colour;
    const lifted = adjustToContrast(colour, direction.ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(
        `${what} cannot be told from the ground it sits on in this direction's colours.`,
      );
    return lifted;
  };
  const low = floorAgainstGround(
    mix(direction.accent, direction.ground, 0.88),
    "the lowest class of the ramp",
  );
  const high = mix(direction.accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classFill = (i: number) => mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);
  const originFill = floorAgainstGround(
    mix(direction.ground, ink, 0.16),
    "the fill that stands for the country outside the count",
  );

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  /** THE HEXAGON HAS TO HOLD ITS OWN CODE, and the floor is measured on the cell that is DRAWN
   *  rather than on the pitch it sits on — the cartogram's correction 50, inherited deliberately.
   *  A hexagon's usable width at its centre line is its full width; its usable height is the flat
   *  part, three quarters of the height. */
  const codeOwes = Math.max(...tiles.map((t) => widthOf(set(t.code, axis), axis))) + 6;
  const bandOwes = axisBand.ascent + axisBand.descent + 4;

  const layoutFor = (t: number, l: number, r: number, o: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = l < 0 ? [] : wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const originLines = wrap(set(originNote[o], axis), column, axis);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop = eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const titleBottom = titleTop + titleLines.length * titleLead;
    const limitsTop = titleBottom + gapOf(body, 0.5517);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = sourceTop - bodyLead * 1.1 - Math.max(0, readingLines.length - 1) * annotLead;
    const originLead = axisBand.ascent + axisBand.descent + 2;
    const originTop = readingTop - annotBand.ascent - gapOf(annot, 0.5) - (originLines.length - 1) * originLead;
    /** THE KEY IS TWO ROWS, NOT ONE: the swatches and, under them, the breaks. Budgeted as one, the
     *  breaks printed over the line that says what the pale cell is. */
    const keyTop = originTop - (axisBand.ascent + axisBand.descent) - axisBand.ascent - 14;
    const top =
      (limitLines.length ? limitsTop + limitLines.length * bodyLead : titleBottom) +
      annotBand.ascent * 1.2;
    const bottom = keyTop - axisBand.ascent - annotBand.ascent - 12;
    return {
      titleLines,
      limitLines,
      readingLines,
      sourceLines,
      originLines,
      originLead,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      keyTop,
      originTop,
      readingTop,
      sourceTop,
      top,
      bottom,
      band: bottom - top,
    };
  };

  /** THE RUNGS, IN THE ORDER A DESK CUTS: the reading line first, then the note that explains
   *  Ukraine's own cell takes its short form, then the standfirst's, then the standfirst goes, and
   *  the headline is last. The note is on the ladder and never off it — see the runner's own
   *  comment on why it may be shortened but not dropped. */
  const rungs: Array<{
    title: number;
    limit: number;
    reading: number;
    origin: number;
  }> = [];
  const limitRungs = [...limits.map((_, i) => i), -1];
  for (let t = 0; t < title.length; t++)
    for (const l of limitRungs)
      for (let o = 0; o < originNote.length; o++) {
        for (let r = 0; r < reading.length; r++)
          rungs.push({ title: t, limit: l, reading: r, origin: o });
        rungs.push({ title: t, limit: l, reading: -1, origin: o });
      }
  /** `limit: -1` IS THE REMOVAL LADDER'S R7 — the standfirst dropped altogether, which this
   *  component had no rung for. Measured at 1080x1080: with every other rung spent, the widest
   *  hexagon the copy left was 22.1px in `creme` and 15.9px in `nocturne`, against the 30.6px a cell
   *  that must hold « DEU » owes. Five lines of standfirst on a 540px plate are a third of the
   *  grid's band. */

  /** POINTY-TOP HEXES IN OFFSET ROWS. Width `w`, height `h = w * 2 / √3`; rows overlap by a quarter
   *  of the height, and odd rows shift by half a width — which is what makes every neighbour an edge
   *  neighbour rather than a corner one. */
  const ROOT3 = Math.sqrt(3);
  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
    w: number;
  } | null = null;
  let best = -Infinity;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading, rung.origin);
    if (l.band <= 0) continue;
    const byWidth = (width - PAD * 2) / (columns + 0.5);
    const byHeight = (l.band / (rows * 0.75 + 0.25)) * (ROOT3 / 2);
    const w = Math.min(byWidth, byHeight);
    if (w > best) best = w;
    if (w >= codeOwes && (w * 2) / ROOT3 * 0.5 >= bandOwes) {
      fits = { rung, layout: l, w };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `the widest hexagon this copy leaves is ${best.toFixed(1)}px and a hexagon that must hold its ` +
        `own code owes ${codeOwes.toFixed(1)}px. A grid nobody can read country by country is a ` +
        `pattern, not a map.`,
    );
  const { layout, w } = fits;
  const h = (w * 2) / ROOT3;
  const gridW = (columns + 0.5) * w;
  const gridH = rows * 0.75 * h + 0.25 * h;
  const originX = PAD + (width - PAD * 2 - gridW) / 2;
  const originY = layout.top + (layout.band - gridH) / 2;

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ` +
      (fits.rung.limit < 0 ? "dropped" : `${fits.rung.limit + 1}`) +
      `, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      `, note ${fits.rung.origin + 1}` +
      ` · ${tiles.length} hexes, ${w.toFixed(0)} x ${h.toFixed(0)}px, code floor ${codeOwes.toFixed(0)}px`,
  );

  const hexPath = (cx: number, cy: number) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 90);
      pts.push([cx + (w / 2) * Math.cos(a) * (2 / ROOT3) * (ROOT3 / 2), cy + (h / 2) * Math.sin(a)]);
    }
    return `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`;
  };
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(direction.ground, fill) ? ink : direction.ground;

  /** THE SWATCH IS AS WIDE AS THE BREAK THAT SITS UNDER IT. Sized off the hexagon instead, the five
   *  breaks printed into one another — `5,012,018,025,0` — which is a key that cannot be read at all
   *  on a plate whose whole colour reading depends on it. */
  const widestBreak = Math.max(...breaks.map((b) => widthOf(set(b, axis), axis)));
  const swatch = Math.max(w * 0.42, widestBreak + 10);

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
        <text key={l + i} x={PAD} y={layout.titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={layout.limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {tiles.map((t) => {
        const cx = originX + (t.col + (t.row % 2 === 1 ? 0.5 : 0) + 0.5) * w;
        const cy = originY + t.row * 0.75 * h + h / 2;
        const fill = t.classIndex === null ? originFill : classFill(t.classIndex);
        return (
          <g key={t.code}>
            <path
              d={hexPath(cx, cy)}
              fill={fill}
              stroke={direction.ground}
              strokeWidth={Math.max(direction.stroke.rule, 1.2)}
            />
            {on("the-subject-is-ringed-not-recoloured") && t.isSubject && (
              <path
                d={hexPath(cx, cy)}
                fill="none"
                stroke={accentInk}
                strokeWidth={direction.stroke.rule * 1.6}
              />
            )}
            <text
              x={cx}
              y={cy + (axisBand.ascent - axisBand.descent) / 2}
              textAnchor="middle"
              {...line(axis)}
              fill={legibleOn(fill)}
              fontWeight={t.isSubject ? 700 : axis.fontWeight}
            >
              {set(t.code, axis)}
            </text>
          </g>
        );
      })}

      {/* THE KEY: five classes in their own colours, breaks in the data's units, and the one cell
          that is on the plate and outside the count. */}
      <g>
        {Array.from({ length: classCount }, (_, i) => (
          <g key={`k${i}`}>
            <rect
              x={PAD + i * swatch}
              y={layout.keyTop - axisBand.ascent}
              width={swatch - 1}
              height={axisBand.ascent}
              fill={classFill(i)}
            />
            {i > 0 && (
              <text
                x={PAD + i * swatch}
                y={layout.keyTop + axisBand.ascent + 2}
                textAnchor="middle"
                {...line(axis)}
                fill={mutedInk}
              >
                {set(breaks[i - 1], axis)}
              </text>
            )}
          </g>
        ))}
        <text
          x={PAD + classCount * swatch + 10}
          y={layout.keyTop}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(unit, axis)}
        </text>
      </g>
      {layout.originLines.map((l, i) => (
        <text
          key={`o${i}`}
          x={PAD}
          y={layout.originTop + i * layout.originLead}
          {...line(axis)}
          fill={mutedInk}
        >
          {l}
        </text>
      ))}

      {layout.readingLines.map((l, i) => (
        <text key={`r${i}`} x={PAD} y={layout.readingTop + i * annotLead} {...line(annot)} fill={mutedInk}>
          {l}
        </text>
      ))}
      {layout.sourceLines.map((l, i) => (
        <text key={`s${i}`} x={PAD} y={layout.sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
    </svg>
  );
}
