/**
 * Tenure in the world's top ten emitters, 1990–2024, drawn THROUGH the design base.
 *
 * The fourteenth component in this tree and the fifth of the nine forms the harvest reached with
 * none. Its corpus is unusually clean about what it is: of seven references, THREE are not gantts —
 * duration bars on a zero-anchored axis, which the records say outright — and two are the real
 * thing, Threestory's sitting justices and USAFacts' seats.
 *
 * `both-dates-in-the-row-label` (two publications) — a bar on a date axis is read as a POSITION by a
 * reader who came for "when" and as a LENGTH by one who came for "how long". Al Jazeera's record:
 * writing both dates "costs a gutter and removes the form's characteristic misreading entirely".
 * ABC does it in one line with no extra column, and abbreviates the closing year, never the opening
 * one.
 *
 * `an-open-span-says-it-is-open` (two publications, two answers, both taken here because together
 * they cost nothing) — Threestory aligns every open end at the present and lets the shared edge
 * carry the meaning, "no arrow, no 'present', no legend entry"; ABC writes a trailing dash. What
 * both refuse is a span drawn to a closing date it does not have.
 *
 * AND THE TRACK, which is furniture rather than a filed rule, borrowed from ABC's record with its
 * reasoning attached: "a third of this plate is the time each leader did not get, and without it the
 * short tenures have nothing to be short against."
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
import { applyCase, DERIVED_SIZE_RATIO } from "#shared/chart-beat/registers.mjs";
import { frameInsetFor, viewedAtCssPx } from "#shared/chart-beat/sizes.mjs";
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

export type Row = {
  key: string;
  label: string;
  runs: Array<{ from: number; to: number; open: boolean }>;
  years: number;
  throughout: boolean;
};

export function DirectedGantt({
  rows,
  first,
  last,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  spanLabel,
  direction,
  treatments,
  frame,
}: {
  rows: Row[];
  first: number;
  last: number;
  title: string;
  limits: string | string[];
  reading: string | string[];
  source: string;
  alt: string;
  eyebrow: string;
  spanLabel: (row: Row) => string;
  direction: any;
  treatments: string[];
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const SIZE =
    width > height ? "landscape" : width === height ? "square" : "portrait";
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  /**
   * THE MARGIN IS A PROPORTION OF THE PLATE, AND THE DIRECTION FILED ITS OWN ON A 960-WIDE ONE.
   *
   * Sixteen rows owe a fixed pitch each — that number is a property of the type set in, not of the
   * frame — so at a square plate the whole question is how much height the furniture leaves them.
   * `nocturne`'s filed 56 takes 112 of 540 out before anything is drawn, against 112 of 540 where
   * that was 21 % instead of the 12 % it was measured at. Measured 2026-09-23 at square: 5.0px of
   * pitch against the 11.0 the labels owe, and the beat refused. Scaled rather than replaced, and
   * never below the toolchain's own inset for the size.
   */
  const PAD =
    SIZE === "landscape"
      ? direction.pad
      : Math.max(
          frameInsetFor(SIZE) / 2,
          Math.round((direction.pad * width) / FRAME.width),
        );
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
  const bodyLead = leadOf(body);
  const limitChoices = (Array.isArray(limits) ? limits : [limits]).filter(Boolean);
  const sourceLines = wrap(set(source, body), column, body);

  /**
   * HOW SMALL A HEADLINE MAY GET AND STILL BE ONE — the two floors
   * `static-choropleth-europe-lowcarbon` states. The filed size is a 960-wide decision, and every
   * line the headline gains at 540 comes out of the rows' pitch. The large-text relaxation binds
   * only where the filed size already clears it: at square one user unit is 1.5 CSS px, so large
   * text starts at 36 units while two of the three filed displays are 30 and 32. Landscape never
   * walks this ladder — it is the frame this beat was accepted at.
   */
  const LARGE_TEXT_CSS_PX = 24;
  const LARGE_TEXT_BOLD_CSS_PX = 18.66;
  const displayAt = (fontSize: number) => ({
    ...display,
    fontSize,
    letterSpacing: (display.letterSpacing * fontSize) / display.fontSize,
  });
  const displayRungs: Array<typeof display> =
    SIZE === "landscape"
      ? [display]
      : (() => {
          const largeText =
            (Number(display.fontWeight) >= 700
              ? LARGE_TEXT_BOLD_CSS_PX
              : LARGE_TEXT_CSS_PX) *
            (width / viewedAtCssPx(SIZE));
          const floor =
            display.fontSize >= largeText
              ? Math.max(largeText, display.fontSize * DERIVED_SIZE_RATIO)
              : display.fontSize * DERIVED_SIZE_RATIO;
          const out: Array<typeof display> = [display];
          for (let s = display.fontSize - 0.5; s >= floor - 1e-9; s -= 0.5)
            out.push(displayAt(Math.round(s * 100) / 100));
          return out;
        })();

  const headerFor = (dsp: typeof display) => {
    const lines = wrap(set(title, dsp), column, dsp);
    const lead = leadOf(dsp);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const top =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + dsp.fontSize;
    return {
      display: dsp,
      titleLines: lines,
      titleLead: lead,
      eyebrowBaseline,
      titleTop: top,
      limitsTop: top + lines.length * lead + gapOf(body, 0.4138),
    };
  };
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
  /** THE WORDS GIVE WAY BEFORE THE ROWS DO. Sixteen rows want 14.7px of pitch each to carry their
   *  labels, and this frame gives 8.8px with a three-line reading under it — the component refuses
   *  under that floor rather than draw a gantt whose rows cannot be named, so the ladder spends the
   *  sentences first: the reading line's own short forms, then the reading line entirely, then the
   *  standfirst's. The longest pair that still leaves every row its label is what gets drawn. */
  const readingChoices = (Array.isArray(reading) ? reading : [reading]).filter(Boolean);
  /** What one row owes: its own label's ink, and air under it. The air is 2px on the plate this
   *  beat was tuned at; at a reflowed frame it is 1.5, because sixteen rows spend it sixteen times
   *  and the alternative rung is to stop naming rows. Measured at square: `nocturne` came out at
   *  10.7px of pitch against the 11.0 it owed, and half a pixel a row is the whole of that. */
  const rowsOwe =
    bandOf(annot).ascent +
    bandOf(annot).descent +
    (SIZE === "landscape" ? 2 : 1.5);
  /**
   * A SHORTFALL FINER THAN THE RASTERISER CAN DRAW IS NOT A SHORTFALL.
   *
   * `creme` at landscape measured 15.2906px of pitch against the 15.2925 its labels owe: nineteen
   * ten-thousandths of a user unit a row, three hundredths of a pixel over all sixteen, and the
   * beat refused its own accepted frame over it — `renders/creme.png` has never existed. There is
   * no furniture change small enough to answer that; one line of anything overshoots it by two
   * orders of magnitude. What was wrong is the comparison, which tested an exact inequality against
   * a measurement carried in floating point.
   *
   * The tolerance is a hundredth of a user unit. This beat draws at scale 2, so that is a fiftieth
   * of a delivered pixel — below anything the rasteriser can express, and 0.16px across the whole
   * plot. It is applied to BOTH the ladder's test and the refusal, so the two cannot disagree about
   * which rung fits.
   */
  const PITCH_EPS = 0.01;
  /** THE AIR ABOVE AND BELOW THE PLOT, TIGHTENED AT A REFLOWED FRAME. These three are landscape
   *  numbers spent on a plate with half the height, and what they are spent AGAINST is a pitch that
   *  cannot shrink: sixteen rows owe their own labels' ink whatever the frame. Measured at square,
   *  `creme` came out at 14.9px of pitch against the 15.3 it owes — four tenths of a pixel a row,
   *  and 11px of furniture air is the whole of it. */
  const PLOT_AIR = SIZE === "landscape" ? 0.7857 : 0.5;
  /**
   * EVERYTHING BETWEEN THE LAST ROW AND THE BLOCK UNDER IT — the axis rule, the year labels, and
   * the air that keeps them off whatever comes next.
   *
   * Landscape keeps the arithmetic it was tuned on: a gap of 0.6429 of the annot lead, then the
   * year labels' own band. That gap happens to exceed the reading line's ascent by 1.5px, which is
   * the entire clearance the plate has ever had, and it holds only because the rung landscape
   * actually draws always keeps a reading line. Two things broke it at another frame: at portrait
   * the years printed through « LECTURE : CHAQUE BARRE… » and no guard fired, because the runs
   * only partly overlap and `assertNoOverlappingText` refuses on the majority of the smaller run;
   * at square the ladder DROPPED the reading line and the years landed on the credit instead.
   *
   * So at a reflowed frame the clearance is measured rather than inherited: the ascent of whichever
   * block actually follows — the reading line, or the source when the ladder has spent it — and
   * four pixels of air under the year labels' own descenders.
   */
  const belowPlot = (readingLines: string[]) =>
    SIZE === "landscape"
      ? gapOf(annot, 0.6429) +
        bandOf(axis).ascent +
        bandOf(axis).descent +
        6
      : (readingLines.length ? bandOf(annot).ascent : bandOf(body).ascent) +
        4 +
        bandOf(axis).ascent +
        bandOf(axis).descent +
        6;
  const fits = (
    limitsTop: number,
    limitLines: string[],
    readingLines: string[],
  ) => {
    const bottom =
      height -
      PAD -
      (sourceLines.length - 1) * bodyLead -
      readingLines.length * bodyLead -
      (readingLines.length ? gapOf(annot, READING_TO_SOURCE) : 0);
    const top = limitsTop + limitLines.length * bodyLead + gapOf(annot, PLOT_AIR);
    const plot = bottom - belowPlot(readingLines) - top;
    return plot / rows.length >= rowsOwe - PITCH_EPS;
  };
  /** THE CUT ORDER IS THE DESK'S: the reading line first, then the standfirst, and only when the
   *  sentences are spent does the headline give up size. */
  const chosen = (() => {
    let last = null;
    for (const dsp of displayRungs) {
      const header = headerFor(dsp);
      for (const limitText of limitChoices)
        for (const readingText of [...readingChoices, ""]) {
          const pair = {
            header,
            limitLines: wrap(set(limitText, body), column, body),
            readingLines: readingText ? wrap(set(readingText, annot), column, annot) : [],
          };
          last = pair;
          if (fits(header.limitsTop, pair.limitLines, pair.readingLines)) return pair;
        }
    }
    return last!;
  })();
  const limitLines = chosen.limitLines;
  const readingLines = chosen.readingLines;
  const drawnDisplay = chosen.header.display;
  const titleLines = chosen.header.titleLines;
  const titleLead = chosen.header.titleLead;
  const eyebrowBaseline = chosen.header.eyebrowBaseline;
  const titleTop = chosen.header.titleTop;
  const limitsTop = chosen.header.limitsTop;
  // The ladder says what it spent, so a missing reading line is a decision on the record rather
  // than a sentence that quietly went away.
  console.log(
    `  ladder: standfirst rung ${limitChoices.findIndex((t) => wrap(set(t, body), column, body).length === limitLines.length) + 1}` +
      `/${limitChoices.length}, reading ${readingLines.length ? `${readingLines.length} line(s)` : "dropped"}`,
  );

  /** THE GAP BELONGS TO THE READING LINE, AND A DROPPED READING LINE TAKES IT WITH IT. Subtracted
   *  unconditionally, it reserved room above a block that is not drawn — and `fits`, which applies
   *  it only when there ARE reading lines, then measured a plot the geometry never gave: the ladder
   *  chose a rung it thought cleared the floor and the component threw on the same numbers. Worth
   *  0.37px of pitch a row on sixteen rows, which is what `nocturne` was short of at square. */
  const readingTop =
    sourceTop -
    readingLines.length * bodyLead -
    (readingLines.length ? gapOf(annot, READING_TO_SOURCE) : 0);

  // ── the rows ──────────────────────────────────────────────────────────────
  const dated = on("both-dates-in-the-row-label");
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  /** BOTH DATES IN THE ROW LABEL: name, then the span's own two years, one line, one gutter. */
  const labelOf = (row: Row) => (dated ? `${row.label}  ${spanLabel(row)}` : row.label);
  const gutter = Math.max(...rows.map((r) => widthOf(set(labelOf(r), annot), annot))) + 16;

  const plotTop = limitsTop + limitLines.length * bodyLead + gapOf(annot, PLOT_AIR);
  const plotBottom = readingTop - belowPlot(readingLines);
  const plotLeft = PAD + gutter;
  const plotRight = width - PAD;

  /** The axis runs to the LAST year's own end, so a span still running ends flush with the axis —
   *  Threestory's answer to the open end, which needs the edge to mean something. */
  const x = scaleLinear().domain([first, last + 1]).range([plotLeft, plotRight]);
  const pitch = (plotBottom - plotTop) / rows.length;
  const barHeight = Math.max(Math.min(pitch * 0.62, annotBand.ascent + annotBand.descent + 2), 3);
  const owed = rowsOwe;
  if (pitch < owed - PITCH_EPS)
    throw new Error(
      `${rows.length} rows want ${owed.toFixed(1)}px of pitch to carry their labels and this frame ` +
        `gives ${pitch.toFixed(1)}px — a gantt whose rows cannot be named is a set of bars`,
    );

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
  /** The track: the years a row did NOT hold. Furniture, one step off the ground. */
  const track = mix(direction.ground, ink, 0.08);
  /**
   * THE TICK LADDER, WALKED UNTIL EVERY YEAR CLEARS ITS NEIGHBOUR.
   *
   * Every fifth year plus the last one is a count tuned against a 656px axis. At square the axis is
   * 278px and the same eight labels print through each other: measured on the first square render,
   * « 19901995 » at the left end and « 20202024 » at the right, with no assertion in this project
   * firing — the runs are furniture, not arbitrated labels, so nothing was watching them.
   *
   * The ends are not negotiable: the first year is where the plate starts and the LAST year is what
   * an open span ends flush with, which is the whole of `an-open-span-says-it-is-open`. So the
   * middle ticks are what give way, dropped left to right wherever one would touch the tick it
   * follows or the last one. The boxes are anchor-aware — the first is drawn from its x, the last to
   * its x, the rest centred — because that is where the collisions actually were.
   */
  const yearWidth = (year: number) => widthOf(set(String(year), axis), axis);
  const TICK_CLEAR = 6;
  const ticks = (() => {
    const rightOfFirst = x(first) + yearWidth(first);
    const leftOfLast = x(last) - yearWidth(last);
    if (leftOfLast < rightOfFirst + TICK_CLEAR)
      throw new Error(
        `the date axis is ${(x(last) - x(first)).toFixed(0)}px wide and its own two end years want ` +
          `${(yearWidth(first) + yearWidth(last) + TICK_CLEAR).toFixed(0)}px — they would print ` +
          `through each other, and a gantt whose axis cannot be read is a set of bars`,
      );
    for (const step of [5, 10, 15, 20]) {
      const stepped: number[] = [];
      for (let year = first + step; year < last; year += step) {
        const half = yearWidth(year) / 2;
        // A stepped year that would touch the LAST one is dropped, not a reason to coarsen the
        // whole ladder: the last year is the present and cannot move, the ones before it can go.
        if (x(year) + half > leftOfLast - TICK_CLEAR) continue;
        stepped.push(year);
      }
      let edge = rightOfFirst;
      const clear = stepped.every((year) => {
        const half = yearWidth(year) / 2;
        if (x(year) - half < edge + TICK_CLEAR) return false;
        edge = x(year) + half;
        return true;
      });
      if (clear) return [first, ...stepped, last];
    }
    return [first, last];
  })();

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
        <text key={l + i} x={PAD} y={titleTop + i * titleLead} {...line(drawnDisplay)}>
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

      {rows.map((row, i) => {
        const y = plotTop + i * pitch + (pitch - barHeight) / 2;
        return (
          <g key={row.key}>
            {/* The track — the years this row did not hold. Without it a one-year tenure has
                nothing to be short against. */}
            <rect x={plotLeft} y={y} width={plotRight - plotLeft} height={barHeight} fill={track} />
            {row.runs.map((run) => (
              <rect
                key={`${row.key}-${run.from}`}
                x={x(run.from)}
                y={y}
                width={Math.max(x(run.to + 1) - x(run.from), 1.5)}
                height={barHeight}
                fill={row.throughout ? direction.accent : muted}
              />
            ))}
            <text
              x={PAD + gutter - 10}
              y={y + barHeight / 2 + (annotBand.ascent - annotBand.descent) / 2}
              textAnchor="end"
              {...line(annot)}
              fill={row.throughout ? accentInk : annot.fill}
              fontWeight={row.throughout ? 700 : annot.fontWeight}
            >
              {set(labelOf(row), annot)}
            </text>
          </g>
        );
      })}

      {/* The date axis, under the rows: the shared scale that makes these bars positions and not
          lengths. Its right edge IS the present, which is what lets an open span end flush. */}
      <line
        x1={plotLeft}
        x2={plotRight}
        y1={plotBottom + 4}
        y2={plotBottom + 4}
        stroke={grid}
        strokeWidth={direction.stroke.hairline}
      />
      {ticks.map((year) => (
        <text
          key={year}
          x={x(year)}
          y={plotBottom + 6 + axisBand.ascent}
          textAnchor={year === first ? "start" : year === last ? "end" : "middle"}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(String(year), axis)}
        </text>
      ))}
    </svg>
  );
}
