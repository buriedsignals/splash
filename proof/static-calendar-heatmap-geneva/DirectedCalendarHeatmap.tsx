/**
 * Geneva's 2024, one cell per day, drawn THROUGH the design base. The eighteenth component in this
 * tree and the LAST of the nine forms the harvest reached with none.
 *
 * `a-sequential-grid-is-one-hue-cluster` (Observable's negative, corroborated by the four
 * disciplined references) — the ramp steps ONE hue between two poles built from the direction's own
 * colours, so the pixel route reads `sequential` with one cluster by construction. Observable's own
 * plate, drawn with `turbo`, measured `categorical` with four.
 *
 * `a-missing-cell-is-drawn-as-missing` (ONS, Datawrapper) — 2024 leaves five impossible positions
 * (31 February, April, June, September, November). They are drawn with the same stroke as every
 * other cell, in a neutral OUTSIDE the ramp and separated from its low end by lightness as well as
 * hue, because hue alone does not survive greyscale.
 *
 * `the-key-prints-its-breaks-in-the-data-s-units` (ONS, ABC) — six bins, each printing its own
 * break in °C, so a reader can invert the colour. A gradient bar would say the direction and
 * nothing else.
 *
 * And ABC's rule for the extreme: the streak the headline is about is outlined in the accent at full
 * strength — a hue OUTSIDE the ramp, so it cannot be misread as a value.
 */

import { scaleLinear } from "d3-scale";
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
  READING_TO_SOURCE,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Day = { date: string; month: number; day: number; value: number };
export type Streak = { from: Day; to: Day; length: number; threshold: number };

export function DirectedCalendarHeatmap({
  days,
  months,
  monthsShort,
  breaks,
  streak,
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  direction,
  treatments,
  frame,
}: {
  days: Day[];
  months: string[];
  /** The same twelve names, abbreviated, for a frame whose row gutter cannot hold the full ones. */
  monthsShort?: string[];
  breaks: number[];
  streak: Streak;
  unit: string;
  /** The headline, the standfirst and the reading line in FORMS, longest first — R3's rung and
   *  R4's. Landscape takes the first of each and has never needed another. */
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  direction: any;
  treatments: string[];
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  /** THE FORM THE FRAME ASKS FOR, read off the frame rather than passed in, so one component serves
   *  the three export sizes without the runner having to tell it which it is drawing. */
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

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: { fontSize: number; fontWeight: number; fontFamily: string }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));

  function wrap(text: string, maxWidth: number, r: any): string[] {
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    if (current) lines.push(current);
    return lines;
  }

  // ── header and footer ─────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  // ── the grid ──────────────────────────────────────────────────────────────
  const keyed = on("the-key-prints-its-breaks-in-the-data-s-units");
  const marksMissing = on("a-missing-cell-is-drawn-as-missing");
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  const keyHeight = keyed ? axisBand.ascent + axisBand.descent + 16 : 0;

  /** THE ROW GUTTER TAKES THE NAMES IT CAN AFFORD. « Septembre » is 100px of the 424 this plate has
   *  at 1080 wide — a quarter of the frame spent naming the rows, and the 31 columns left holding
   *  10px each. The full names are kept while they cost less than a sixth of the column; past that
   *  the abbreviations are taken, and the grid gets the width back. Landscape is 960 wide and the
   *  full names cost a tenth of it, so nothing changes there. */
  const roomFor = (names: string[]) =>
    Math.max(...names.map((m) => widthOf(set(m, axis), axis))) + 12;
  const monthNames =
    monthsShort && roomFor(months) > column / 6 && roomFor(monthsShort) < roomFor(months)
      ? monthsShort
      : months;
  const monthRoom = roomFor(monthNames);
  const gridLeft = PAD + monthRoom;
  const gridRight = width - PAD;

  /** WHAT THE TWELVE ROWS OWE. Every row is named on its own midline, so the rows cannot be closer
   *  together than the run that names them — which is what failed at square, where 100px of plot
   *  divided by twelve gave 8px rows under an 11px name. */
  const rowOwes = axisBand.ascent + axisBand.descent + 2;
  const gridOwes = SIZE === "landscape" ? 0 : 12 * rowOwes;

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const limitsTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
    const readingTop =
      sourceTop - readingLines.length * bodyLead - gapOf(annot, READING_TO_SOURCE);
    const plotTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 1.6;
    const plotBottom =
      (readingLines.length ? readingTop : sourceTop - bodyLead * 1.2) -
      gapOf(annot, 0.7857) -
      keyHeight -
      8;
    return {
      titleLines,
      limitLines,
      readingLines,
      limitsTop,
      readingTop,
      plotTop,
      plotBottom,
      plot: plotBottom - plotTop,
    };
  };
  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++) rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  let taken = rungs[0];
  let layout = layoutFor(taken.title, taken.limit, taken.reading);
  let best = layout.plot;
  for (const rung of rungs) {
    const candidate = layoutFor(rung.title, rung.limit, rung.reading);
    best = Math.max(best, candidate.plot);
    taken = rung;
    layout = candidate;
    if (candidate.plot >= gridOwes) break;
  }
  if (layout.plot < gridOwes)
    throw new Error(
      `the copy leaves the twelve month rows ${best.toFixed(0)}px at its most generous rung and ` +
        `they owe ${gridOwes.toFixed(0)}px at ${width}x${height} — ${rowOwes.toFixed(0)}px each, ` +
        `which is what a month's name needs not to print into the month below it.`,
    );
  const { titleLines, limitLines, readingLines, limitsTop, readingTop, plotTop, plotBottom } = layout;
  if (SIZE !== "landscape")
    console.log(
      `  ladder: headline ${taken.title + 1}, standfirst ${taken.limit + 1}, reading ` +
        (taken.reading < 0 ? "dropped" : `form ${taken.reading + 1}`) +
        ` · rows ${layout.plot.toFixed(0)}px, floor ${gridOwes.toFixed(0)}px · months ` +
        (monthNames === months ? "in full" : "abbreviated"),
    );

  /** CELLS NEED NOT BE SQUARE. Forced square, a 31 x 12 grid is bound by the frame's height and
   *  leaves half the plate empty — measured on the first render, where the year stopped at the
   *  middle of the page. The cell takes the width it has and the height it has, capped at 2:1 so it
   *  still reads as a grid rather than as twelve bar charts. */
  const cellW = (gridRight - gridLeft) / 31;
  const cellH = Math.min((plotBottom - plotTop) / 12, cellW * 2);
  const gap = Math.max(Math.min(cellW, cellH) * 0.08, 0.6);

  /** THE CAP LEAVES SLACK, AND THE SLACK IS SPLIT RATHER THAN DUMPED AT THE FOOT.
   *
   *  `cellH` is capped at twice `cellW` so twelve rows do not become twelve bar charts, and at
   *  1080x1920 that cap bites hard: the rungs hand the grid 447px and the twelve rows only want
   *  312, so 135px fell between the last row and the key — a hole a reader reads as something
   *  missing. The grid keeps its own height and the leftover is split above and below it, and the
   *  key follows the ROWS rather than the room they were offered. Landscape's cells are nowhere
   *  near the cap, so its slack is zero and nothing there moves. */
  const gridHeight = cellH * 12;
  const slack = Math.max(0, plotBottom - plotTop - gridHeight);
  const gridTop = plotTop + slack / 2;
  const gridBottom = gridTop + gridHeight;

  const xOf = (day: number) => gridLeft + (day - 1) * cellW;
  const yOf = (month: number) => gridTop + month * cellH;

  /** ONE HUE, SIX BINS. The poles are the direction's own: a pale step off the ground at the cold
   *  end, the accent deepened toward the ink at the warm end. A ramp built this way reads
   *  `sequential` with one cluster without anyone having to test it. */
  const cold = mix(direction.accent, direction.ground, 0.88);
  const warm = mix(direction.accent, ink, 0.25);
  const bin = (value: number) => breaks.filter((b) => value >= b).length;
  /** SIX BINS, FIVE BREAKS: the ratio runs over the number of BINS minus one, not over the breaks.
   *  Divided by `breaks.length - 1` the last bin lands at 1.25 and `mix` walks past its own end —
   *  the warm end came out black, which is not a step of the accent's ramp at all. */
  const bins = breaks.length + 1;
  const rampFill = (index: number) => mix(cold, warm, bins > 1 ? index / (bins - 1) : 0.5);
  /** OUTSIDE THE RAMP, and separated from its low end by LIGHTNESS as well as hue — Datawrapper's
   *  own counter-lesson, because hue alone does not survive greyscale. */
  const missingFill = mix(direction.ground, ink, 0.06);

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

  const byDate = new Map(days.map((d) => [`${d.month}-${d.day}`, d]));
  const daysInMonth = (month: number) => new Date(2024, month + 1, 0).getDate();

  /** The streak's own outline: one rectangle per month it crosses, so a run that wraps from one row
   *  to the next is still one shape rather than two unrelated boxes. */
  const streakRuns: Array<{ month: number; from: number; to: number }> = [];
  {
    const start = streak.from;
    const end = streak.to;
    for (let month = start.month; month <= end.month; month++) {
      const from = month === start.month ? start.day : 1;
      const to = month === end.month ? end.day : daysInMonth(month);
      streakRuns.push({ month, from, to });
    }
  }

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

      <text x={PAD} y={eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {titleLines.map((l, i) => (
        <text key={l + i} x={PAD} y={titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
      {readingLines.map((l, i) => (
        <text key={`r${i}`} x={PAD} y={readingTop + i * bodyLead} {...line(annot)} fill={mutedInk}>
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text key={`s${i}`} x={PAD} y={sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {monthNames.map((name, month) => (
        <text
          key={name}
          x={gridLeft - 8}
          y={yOf(month) + cellH / 2 + (axisBand.ascent - axisBand.descent) / 2}
          textAnchor="end"
          {...line(axis)}
          fill={mutedInk}
        >
          {set(name, axis)}
        </text>
      ))}
      {[1, 5, 10, 15, 20, 25, 31].map((day) => (
        <text
          key={`day-${day}`}
          x={xOf(day) + cellW / 2}
          y={gridTop - axisBand.descent - 4}
          textAnchor="middle"
          {...line(axis)}
          fill={mutedInk}
        >
          {set(String(day), axis)}
        </text>
      ))}

      {months.map((_, month) =>
        Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
          const reading = byDate.get(`${month}-${day}`);
          const exists = day <= daysInMonth(month);
          if (!exists && !marksMissing) return null;
          return (
            <rect
              key={`${month}-${day}`}
              x={xOf(day)}
              y={yOf(month)}
              width={cellW - gap}
              height={cellH - gap}
              fill={reading ? rampFill(bin(reading.value)) : missingFill}
              stroke={grid}
              strokeWidth={direction.stroke.hairline}
            />
          );
        }),
      )}

      {/* THE EXTREME, MARKED SO IT CANNOT BE MISTAKEN FOR THE GRID ITSELF.
          Two versions were drawn and both failed for the same reason: the mark looked like part of
          the grid. In the accent it vanished into the two warmest bins — the very cells a run above
          the threshold is made of. In the PAPER's colour it became indistinguishable from the gaps
          between cells, which are also the paper. What survives is a line in the INK, laid in the
          gutter around the block rather than on the cells, with a paper-coloured halo under it so it
          holds over a dark cell and over a pale one alike. Ink is the one value a ramp between the
          ground and the accent never takes. */}
      {streakRuns.map((run) => {
        const box = {
          x: xOf(run.from) - gap,
          y: yOf(run.month) - gap,
          width: (run.to - run.from + 1) * cellW + gap,
          height: cellH + gap,
        };
        return (
          <g key={`streak-${run.month}`}>
            <rect
              {...box}
              fill="none"
              stroke={direction.ground}
              strokeWidth={direction.stroke.rule * 5}
            />
            <rect
              {...box}
              fill="none"
              stroke={ink}
              strokeWidth={direction.stroke.rule * 2}
            />
          </g>
        );
      })}

      {/* THE KEY: binned, each step printing its own break in the data's unit, so the colour can be
          inverted. A gradient bar would give the direction and nothing else. */}
      {keyed &&
        (() => {
          const swatch = Math.max(cellW * 1.6, 26);
          const top = gridBottom + 12;
          const left = gridLeft;
          return (
            <g>
              {[...breaks, null].map((value, i) => (
                <g key={`key-${i}`}>
                  <rect
                    x={left + i * swatch}
                    y={top}
                    width={swatch - gap}
                    height={axisBand.ascent}
                    fill={rampFill(i)}
                    stroke={grid}
                    strokeWidth={direction.stroke.hairline}
                  />
                  {value !== null && (
                    <text
                      x={left + i * swatch + swatch - gap}
                      y={top + axisBand.ascent + axisBand.ascent + 2}
                      textAnchor="middle"
                      {...line(axis)}
                      fill={mutedInk}
                    >
                      {set(format(value), axis)}
                    </text>
                  )}
                </g>
              ))}
              <text
                x={left + (breaks.length + 1) * swatch + 8}
                y={top + axisBand.ascent}
                {...line(axis)}
                fill={mutedInk}
              >
                {set(`moyenne du jour, en ${unit}`, axis)}
              </text>
              {marksMissing && (
                <g>
                  <rect
                    x={left + (breaks.length + 1) * swatch + 8}
                    y={top + axisBand.ascent + 6}
                    width={swatch - gap}
                    height={axisBand.ascent}
                    fill={missingFill}
                    stroke={grid}
                    strokeWidth={direction.stroke.hairline}
                  />
                  <text
                    x={left + (breaks.length + 1) * swatch + 8 + swatch + 4}
                    y={top + axisBand.ascent * 2 + 4}
                    {...line(axis)}
                    fill={mutedInk}
                  >
                    {set("date qui n’existe pas", axis)}
                  </text>
                </g>
              )}
            </g>
          );
        })()}
    </svg>
  );
}
