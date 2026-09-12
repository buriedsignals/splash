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
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";

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
}) {
  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const inkOf = { ink, muted, accent: direction.accent } as Record<string, string>;
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
  const titleLines = wrap(set(title, display), column, display);
  const titleLead = display.fontSize * 1.22;
  const bodyLead = body.fontSize * 1.45;
  const limitChoices = (Array.isArray(limits) ? limits : [limits]).filter(Boolean);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop = eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
  const limitsTop = titleTop + titleLines.length * titleLead + body.fontSize * 0.6;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
  /** THE WORDS GIVE WAY BEFORE THE ROWS DO. Sixteen rows want 14.7px of pitch each to carry their
   *  labels, and this frame gives 8.8px with a three-line reading under it — the component refuses
   *  under that floor rather than draw a gantt whose rows cannot be named, so the ladder spends the
   *  sentences first: the reading line's own short forms, then the reading line entirely, then the
   *  standfirst's. The longest pair that still leaves every row its label is what gets drawn. */
  const readingChoices = (Array.isArray(reading) ? reading : [reading]).filter(Boolean);
  const rowsOwe = bandOf(annot).ascent + bandOf(annot).descent + 2;
  const fits = (limitLines: string[], readingLines: string[]) => {
    const bottom =
      height -
      PAD -
      (sourceLines.length - 1) * bodyLead -
      readingLines.length * bodyLead -
      (readingLines.length ? annot.fontSize * 0.6 : 0);
    const top = limitsTop + limitLines.length * bodyLead + annot.fontSize * 1.1;
    const plot =
      bottom - annot.fontSize * 0.9 - bandOf(axis).ascent - bandOf(axis).descent - 6 - top;
    return plot / rows.length >= rowsOwe;
  };
  const chosen = (() => {
    let last = null;
    for (const limitText of limitChoices)
      for (const readingText of [...readingChoices, ""]) {
        const pair = {
          limitLines: wrap(set(limitText, body), column, body),
          readingLines: readingText ? wrap(set(readingText, annot), column, annot) : [],
        };
        last = pair;
        if (fits(pair.limitLines, pair.readingLines)) return pair;
      }
    return last!;
  })();
  const limitLines = chosen.limitLines;
  const readingLines = chosen.readingLines;
  // The ladder says what it spent, so a missing reading line is a decision on the record rather
  // than a sentence that quietly went away.
  console.log(
    `  ladder: standfirst rung ${limitChoices.findIndex((t) => wrap(set(t, body), column, body).length === limitLines.length) + 1}` +
      `/${limitChoices.length}, reading ${readingLines.length ? `${readingLines.length} line(s)` : "dropped"}`,
  );

  const readingTop = sourceTop - readingLines.length * bodyLead - annot.fontSize * 0.6;

  // ── the rows ──────────────────────────────────────────────────────────────
  const dated = on("both-dates-in-the-row-label");
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  /** BOTH DATES IN THE ROW LABEL: name, then the span's own two years, one line, one gutter. */
  const labelOf = (row: Row) => (dated ? `${row.label}  ${spanLabel(row)}` : row.label);
  const gutter = Math.max(...rows.map((r) => widthOf(set(labelOf(r), annot), annot))) + 16;

  const plotTop = limitsTop + limitLines.length * bodyLead + annot.fontSize * 1.1;
  const plotBottom = readingTop - annot.fontSize * 0.9 - axisBand.ascent - axisBand.descent - 6;
  const plotLeft = PAD + gutter;
  const plotRight = width - PAD;

  /** The axis runs to the LAST year's own end, so a span still running ends flush with the axis —
   *  Threestory's answer to the open end, which needs the edge to mean something. */
  const x = scaleLinear().domain([first, last + 1]).range([plotLeft, plotRight]);
  const pitch = (plotBottom - plotTop) / rows.length;
  const barHeight = Math.max(Math.min(pitch * 0.62, annotBand.ascent + annotBand.descent + 2), 3);
  const owed = annotBand.ascent + annotBand.descent + 2;
  if (pitch < owed)
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
  const ticks = [];
  for (let year = first; year <= last; year += 5) ticks.push(year);
  if (!ticks.includes(last)) ticks.push(last);

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
