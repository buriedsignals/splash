/**
 * Low-carbon share of electricity, 2015 against 2024, drawn THROUGH the design base.
 *
 * The fifteenth component in this tree and the sixth of the nine forms the harvest reached with
 * none. Five publications, six references, and four rules two of them agree on — the densest
 * agreement any family in this corpus has produced.
 *
 * `the-verdict-is-written-as-a-derived-number` (BBC, ICAEW) — the BBC prints `0 seats to go` beside
 * its majority line, which this base's record calls "what a reader wants and what a bullet leaves
 * them to compute"; ICAEW draws the shortfall as a labelled area because a target tick answers the
 * question only after a subtraction performed by eye. Every row here prints its own change in
 * points.
 *
 * `the-target-is-named-on-the-line-that-draws-it` (BBC, ICAEW) — `326 seats for a majority` sits ON
 * the rule. A bullet's second mark is the one a reader has no other way to identify: unnamed, a thin
 * rule across a bar could be a target, an average, a forecast or a previous year.
 *
 * `the-track-runs-the-full-scale-so-the-remainder-is-legible` (BBC, Datawrapper) — the track runs
 * the whole bounded scale rather than stopping at the marker, so rows stay comparable and the
 * remainder is readable. It is also, in Datawrapper's record's words, "the honest degradation of a
 * bullet's qualitative bands": where no poor/ok/good split exists in the data, a flat neutral keeps
 * the "how far along" reading and manufactures no judgement.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` (Datawrapper, Statista) — and the geometry
 * that goes with it, from the same record: the thin saturated bar in front of the thick pale one, so
 * two lengths sit on one row without a tick.
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

export type Row = { key: string; label: string; measure: number; marker: number };

export function DirectedBullet({
  rows,
  subject,
  ceiling,
  markerName,
  measureName,
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  verdict,
  direction,
  treatments,
}: {
  rows: Row[];
  subject: string;
  ceiling: number;
  markerName: string;
  measureName: string;
  unit: string;
  title: string;
  limits: string;
  reading: string;
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  verdict: (row: Row) => string;
  direction: any;
  treatments: string[];
}) {
  const { width, height } = FRAME;
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
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const limitLines = wrap(set(limits, body), column, body);
  const sourceLines = wrap(set(source, body), column, body);
  const readingLines = wrap(set(reading, annot), column, annot);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
  const readingTop =
    sourceTop - readingLines.length * bodyLead - gapOf(annot, READING_TO_SOURCE);

  // ── the rows ──────────────────────────────────────────────────────────────
  const tracked = on("the-track-runs-the-full-scale-so-the-remainder-is-legible");
  const verdicts = on("the-verdict-is-written-as-a-derived-number");
  const namedLine = on("the-target-is-named-on-the-line-that-draws-it");
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);

  const nameRoom = Math.max(...rows.map((r) => widthOf(set(r.label, annot), annot))) + 14;
  const verdictRoom = verdicts
    ? Math.max(...rows.map((r) => widthOf(set(verdict(r), value), value))) + 16
    : 0;

  const plotTop =
    limitsTop + limitLines.length * bodyLead + annotBand.ascent * 2.6;
  const plotBottom =
    readingTop -
    gapOf(annot, 0.8571) -
    bandOf(axis).ascent -
    bandOf(axis).descent -
    8;
  const plotLeft = PAD + nameRoom;
  const plotRight = width - PAD - verdictRoom;

  const x = scaleLinear().domain([0, ceiling]).range([plotLeft, plotRight]);
  const pitch = (plotBottom - plotTop) / rows.length;
  /** The thick pale bar is the comparative state and the thin saturated one the measure, in front of
   *  it — Datawrapper's arrangement, which is what keeps two lengths on one row legible without a
   *  tick. */
  const thick = Math.min(pitch * 0.56, 26);
  const thin = thick * 0.46;

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
  /** ONE HUE, TWO CHROMAS. Both are steps of the direction's own accent — no second hue, no import,
   *  and the pale one is what a reader reads as "the same thing, earlier". */
  const measureFill = direction.accent;
  const markerFill = mix(direction.accent, direction.ground, 0.62);
  const trackFill = mix(direction.ground, ink, 0.07);

  const ticks = [0, ceiling / 2, ceiling];

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
        const mid = plotTop + i * pitch + pitch / 2;
        const isSubject = row.key === subject;
        return (
          <g key={row.key}>
            {tracked && (
              <rect
                x={plotLeft}
                y={mid - thick / 2}
                width={plotRight - plotLeft}
                height={thick}
                fill={trackFill}
              />
            )}
            <rect
              x={plotLeft}
              y={mid - thick / 2}
              width={Math.max(x(row.marker) - plotLeft, 1)}
              height={thick}
              fill={markerFill}
            />
            <rect
              x={plotLeft}
              y={mid - thin / 2}
              width={Math.max(x(row.measure) - plotLeft, 1)}
              height={thin}
              fill={measureFill}
            />
            <text
              x={plotLeft - 10}
              y={mid + (annotBand.ascent - annotBand.descent) / 2}
              textAnchor="end"
              {...line(annot)}
              fill={isSubject ? accentInk : annot.fill}
              fontWeight={isSubject ? 700 : annot.fontWeight}
            >
              {set(row.label, annot)}
            </text>
            {verdicts && (
              <text
                x={plotRight + 10}
                y={mid + (valueBand.ascent - valueBand.descent) / 2}
                {...line(value)}
                fill={isSubject ? accentInk : mutedInk}
                fontWeight={isSubject ? 700 : value.fontWeight}
              >
                {set(verdict(row), value)}
              </text>
            )}
          </g>
        );
      })}

      {/* The two states, named where they are drawn — on the first row's own marks, which is the
          BBC's arrangement carried to a plate that has no single line to write on. */}
      {namedLine &&
        (() => {
          const first = rows[0];
          const mid = plotTop + pitch / 2;
          return (
            <g>
              <text
                x={x(first.marker) - 6}
                y={mid - thick / 2 - annotBand.descent - 4}
                textAnchor="end"
                {...line(annot)}
                fill={mutedInk}
              >
                {set(`${markerName} : ${format(first.marker)} ${unit}`, annot)}
              </text>
              <text
                x={x(first.measure) + 6}
                y={mid - thick / 2 - annotBand.descent - 4}
                {...line(annot)}
                fill={accentInk}
                fontWeight={700}
              >
                {set(`${measureName} : ${format(first.measure)} ${unit}`, annot)}
              </text>
            </g>
          );
        })()}

      <line
        x1={plotLeft}
        x2={plotRight}
        y1={plotBottom + 4}
        y2={plotBottom + 4}
        stroke={grid}
        strokeWidth={direction.stroke.hairline}
      />
      {ticks.map((t) => (
        <text
          key={t}
          x={x(t)}
          y={plotBottom + 6 + bandOf(axis).ascent}
          textAnchor={t === 0 ? "start" : t === ceiling ? "end" : "middle"}
          {...line(axis)}
          fill={mutedInk}
        >
          {set(t === ceiling ? `${format(t)} ${unit}` : format(t), axis)}
        </text>
      ))}
    </svg>
  );
}
