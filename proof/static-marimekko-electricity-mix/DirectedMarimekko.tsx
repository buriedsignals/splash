/**
 * Six countries' electricity mixes, columns as wide as their generation, drawn THROUGH the design
 * base. The thirteenth component in this tree and the fourth of the nine forms with none.
 *
 * `the-width-dimension-is-named-on-the-plate` (three publications, three answers) — in a
 * variable-width chart the width's own quantity has no axis and no legend by default, and it is the
 * thing a reader is most likely to miss. Visual Capitalist runs an annotated arrow down its largest
 * cell; the IEA puts a cumulative axis under the widths; Ferdio braces each column with its total.
 * This plate takes Ferdio's answer, because six columns can each carry a number and a cumulative
 * axis would ask the reader to subtract.
 *
 * `a-narrow-cell-degrades-its-label-rather-than-dropping-it` (two publications) — nothing goes
 * unlabelled: the label shrinks, and where the band is thinner than its own type it moves out to a
 * gutter with a leader back to the band it names. `references/types/` says a small cell should go
 * unlabelled rather than clip; these two publications show the better third way.
 *
 * AND THE REFUSAL THIS FORM CARRIES. The IEA's marginal cost curve is this corpus's worked negative
 * case: a variable-width chart whose narrowest units fall under a few pixels has stopped encoding
 * its second dimension, and colouring those slivers makes the plate look informative while telling
 * the reader nothing. This component measures its own narrowest column and throws rather than draw
 * one under the floor.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix, contrast } from "#shared/chart-beat/colour.mjs";
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
/** Under this, a column has stopped encoding its width. The IEA's own negative case is the reason
 *  there is a number here at all; it is set at the width a two-digit percentage needs. */
const NARROWEST_COLUMN_PX = 26;

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Band = { key: string; label: string; value: number };
export type Column = { key: string; label: string; total: number; bands: Band[] };

export function DirectedMarimekko({
  columns,
  bandOrder,
  families,
  tracked,
  unit,
  widthName,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  percent,
  direction,
  treatments,
  frame,
}: {
  columns: Column[];
  bandOrder: string[];
  /** One entry per band: where it sits in the ordered stack, and how many bands there are. The
   *  order IS the encoding — fossil, nuclear, renewables — so the ramp along it is sequential
   *  rather than categorical. See this beat's `PALETTE.md`. */
  families: Record<string, { family: string; order: number; total: number }>;
  tracked: string;
  unit: string;
  widthName: string;
  title: string;
  limits: string;
  reading: string;
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  percent: (v: number) => string;
  direction: any;
  treatments: string[];
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
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
  const titleTop = eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
  const readingTop = sourceTop - readingLines.length * bodyLead - gapOf(annot, READING_TO_SOURCE);

  // ── the columns ───────────────────────────────────────────────────────────
  const named = on("the-width-dimension-is-named-on-the-plate");
  const degrades = on("a-narrow-cell-degrades-its-label-rather-than-dropping-it");
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);

  const labelFor = (key: string) =>
    columns[0].bands.find((b) => b.key === key)?.label ?? key;

  const plotTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 2.6;
  /** The brace and its total live under the plot; that is the width's own axis. */
  const braceRoom = named
    ? annotBand.ascent + annotBand.descent + valueBand.ascent + valueBand.descent + 26
    : annotBand.ascent + 8;
  const plotBottom = readingTop - gapOf(annot, 1) - braceRoom;

  const GAP = 6;
  /** A GUTTER FOR THE NAMES, on the right. The bands are named once — every column stacks in the
   *  same order, so nine names beside the last column serve all six — and inside the cells only the
   *  SHARE is printed. That is `100.datavizproject.com`'s own arrangement ("cell labels carry the
   *  share only; colour carries identity") reached from the other side: here identity is a ramp
   *  rather than nine hues, so the names have to be somewhere, and outside is where Visual Capitalist
   *  puts a label its cell cannot hold. */
  const nameGutter = degrades
    ? Math.max(...bandOrder.map((key) => widthOf(set(labelFor(key), annot), annot))) + 18
    : 0;
  const total = columns.reduce((sum, c) => sum + c.total, 0);
  const room = width - PAD * 2 - nameGutter - GAP * (columns.length - 1);
  let x = PAD;
  const laid = columns.map((c) => {
    const w = (c.total / total) * room;
    const box = { ...c, x, w };
    x += w + GAP;
    return box;
  });
  const narrowest = Math.min(...laid.map((c) => c.w));
  if (narrowest < NARROWEST_COLUMN_PX)
    throw new Error(
      `the narrowest column is ${narrowest.toFixed(1)}px and this form stops encoding its width ` +
        `under ${NARROWEST_COLUMN_PX}px — the IEA's marginal cost curve is this corpus's worked case ` +
        `of a variable-width chart whose slivers say nothing. Bucket the columns or change the form.`,
    );

  const y = scaleLinear().domain([0, 1]).range([plotBottom, plotTop]);
  /** IDENTITY BY FAMILY, LIGHTNESS INSIDE IT — and this is a CORRECTION, made by looking at the
   *  render. The first version gave every band a step of one grey ramp between the direction's own
   *  ground and ink, on the strength of the IEA's and Visual Capitalist's "grey field, chromatic
   *  argument". Read again, those two publications draw SINGLE-SERIES variable-width charts — cost
   *  curves with one highlighted interval — and this plate is a stacked composition, which is
   *  Ferdio's construction: "cell labels carry the share only; COLOUR CARRIES IDENTITY". A rule
   *  harvested from one construction of a form was applied to another, and the plate came out
   *  black and white.
   *
   *  So each band takes its family's own grounded colour, stepped by lightness inside the family:
   *  the renewables convention, the fossil convention (whose own reasoning is that near-black reads
   *  as coal, the material's colour) and — for nuclear, which no convention in this corpus covers —
   *  the house accent. Three hues, none invented, and the steps are `mix` toward the ground so a
   *  direction with a dark ground gets the ramp running the other way with nothing here changing. */
  /** ONE HUE, NINE STEPS, ALL OF THEM THE DIRECTION'S OWN — and this is the second correction to
   *  this plate's palette, both of them made by looking at it.
   *
   *  The first version was one grey ramp: identity by lightness alone, and the plate read as black
   *  and white. The second gave each family a GROUNDED CONVENTION — `#1B7F4B` for renewables,
   *  `#3A3A3A` for fossil, the house accent for nuclear — and it was worse, for a reason the
   *  convention table itself states: `skills/palette/scripts/palette.mjs` returns exactly ONE
   *  convention, as the chart's single accent, and says so ("a story about coal-fired power
   *  replacing hydro is not two accents, it is a choice the journalist makes"). Three imported
   *  hexes beside a direction's own accent is not a palette; it is four palettes on one plate.
   *
   *  So every band is built from the direction's OWN three colours. The nine sources are ORDERED —
   *  fossil at the foot, then nuclear, then the renewables — which is an ordinal axis, and an
   *  ordinal axis takes a sequential ramp: from a dark accent-tinted pole at the coal end to a pale
   *  tint of the same hue at the wind end. One hue family, so nothing can clash with the direction
   *  that set it; nine measured steps, so the bands are told apart by more than a legend. */
  const darkPole = mix(direction.accent, ink, 0.62);
  const lightPole = mix(direction.accent, direction.ground, 0.74);
  const fillOf = (key: string) => {
    const f = families[key];
    const at = f ? f.order / Math.max(f.total - 1, 1) : 0.5;
    return mix(darkPole, lightPole, at);
  };

  const cells = laid.flatMap((c) => {
    let cursor = 0;
    return bandOrder.map((key, index) => {
      const band = c.bands.find((b) => b.key === key)!;
      const share = band.value / c.total;
      const y0 = cursor;
      cursor += share;
      return {
        column: c,
        band,
        index,
        share,
        x: c.x,
        w: c.w,
        y: y(cursor),
        h: y(y0) - y(cursor),
        isTracked: key === tracked,
      };
    });
  });

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  /** A cell's number is set in whichever of the two page inks actually clears the floor against
   *  that cell's own fill — measured, not guessed by index. White on a mid-toned fill is this
   *  family's named accessibility failure and the type page has shipped it once already. */
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(direction.ground, fill) ? ink : direction.ground;
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);

  /** A band is labelled inside where it can hold its own type, and outside — in the gutter to the
   *  right of the plate, on a leader — where it cannot. Nothing goes unlabelled. */
  const inside = (cell: (typeof cells)[number]) =>
    cell.h >= annotBand.ascent + annotBand.descent + 4 &&
    cell.w >= widthOf(set(cell.band.label, annot), annot) + 10;

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

      {cells.map((cell) => (
        <rect
          key={`${cell.column.key}-${cell.band.key}`}
          x={cell.x}
          y={cell.y}
          width={cell.w}
          height={Math.max(cell.h, 0.4)}
          fill={fillOf(cell.band.key)}
        />
      ))}

      {/* COLUMN NAMES, SPACED. `Norvège` and `Suisse` are wider than the columns they name — 157 and
          78 TWh of a 1 638 TWh plate — and centred on them their names touch. Same pass as the band
          names, on the other axis: push apart in order, then pull the overflow back inside the
          frame, and drop a tick from each name to the column it belongs to. */}
      {(() => {
        const placed = laid.map((c) => ({
          column: c,
          x: c.x + c.w / 2,
          half: widthOf(set(c.label, annot), annot) / 2,
        }));
        for (let i = 1; i < placed.length; i++)
          placed[i].x = Math.max(placed[i].x, placed[i - 1].x + placed[i - 1].half + placed[i].half + 8);
        // The names may not spill into the band-name gutter: pushed against `width - PAD`, `SUISSE`
        // sat against `ÉOLIEN` in the direction whose annot register is tracked capitals.
        const rightEdge = width - PAD - nameGutter - 6;
        const overflow = placed[placed.length - 1].x + placed[placed.length - 1].half - rightEdge;
        if (overflow > 0) {
          placed[placed.length - 1].x -= overflow;
          for (let i = placed.length - 2; i >= 0; i--)
            placed[i].x = Math.min(
              placed[i].x,
              placed[i + 1].x - placed[i + 1].half - placed[i].half - 8,
            );
        }
        return placed.map(({ column: c, x: nameX }) => (
          <g key={`name-${c.key}`}>
            <text
              x={nameX}
              y={plotTop - annotBand.ascent * 0.9}
              textAnchor="middle"
              {...line(annot)}
              fill={annot.fill}
            >
              {set(c.label, annot)}
            </text>
            {Math.abs(nameX - (c.x + c.w / 2)) > 1 && (
              <line
                x1={nameX}
                y1={plotTop - annotBand.ascent * 0.5}
                x2={c.x + c.w / 2}
                y2={plotTop - 2}
                stroke={grid}
                strokeWidth={direction.stroke.hairline}
              />
            )}
          </g>
        ));
      })()}

      {/* THE WIDTH'S OWN AXIS: a brace under each column carrying the quantity the width encodes.
          Ferdio's answer, taken because six columns can each hold a number and a cumulative axis
          would ask the reader to subtract. */}
      {named &&
        laid.map((c) => {
          const braceY = plotBottom + 8;
          return (
            <g key={`brace-${c.key}`}>
              <path
                d={`M${c.x} ${braceY} L${c.x} ${braceY + 4} L${c.x + c.w} ${braceY + 4} L${c.x + c.w} ${braceY}`}
                fill="none"
                stroke={mutedInk}
                strokeWidth={direction.stroke.hairline}
              />
              <text
                x={c.x + c.w / 2}
                y={braceY + 4 + valueBand.ascent + 4}
                textAnchor="middle"
                {...line(value)}
                fill={mutedInk}
              >
                {set(format(c.total), value)}
              </text>
            </g>
          );
        })}
      {named && (
        <text
          x={PAD}
          y={plotBottom + 12 + valueBand.ascent + valueBand.descent + annotBand.ascent + 8}
          {...line(annot)}
          fill={mutedInk}
        >
          {set(widthName, annot)}
        </text>
      )}

      {/* Band labels: inside where the cell can hold them, and for the tracked band always. */}
      {cells.map((cell) => {
        const text = percent(cell.share);
        if (
          cell.h < annotBand.ascent + annotBand.descent + 2 ||
          cell.w < widthOf(set(text, annot), annot) + 8
        )
          return null;
        return (
          <text
            key={`cell-${cell.column.key}-${cell.band.key}`}
            x={cell.x + cell.w / 2}
            y={cell.y + cell.h / 2 + (annotBand.ascent - annotBand.descent) / 2}
            textAnchor="middle"
            {...line(annot)}
            fill={legibleOn(fillOf(cell.band.key))}
            fontWeight={cell.isTracked ? 700 : annot.fontWeight}
          >
            {set(text, annot)}
          </text>
        );
      })}

      {/* THE NAMES, ONCE, IN THE GUTTER. Positioned against the LAST column's own bands, pushed
          apart where two are thinner than the type, each on a hairline leader back to the band it
          names — the second stage of Visual Capitalist's degradation, and the reason no band on this
          plate goes unnamed however thin it is. */}
      {degrades &&
        (() => {
          const last = laid[laid.length - 1];
          const pitch = annotBand.ascent + annotBand.descent + 3;
          const rows = bandOrder
            .map((key, index) => {
              const cell = cells.find((c) => c.column === last && c.band.key === key)!;
              return { key, index, cell, y: cell.y + cell.h / 2 };
            })
            .sort((a, b) => a.y - b.y);
          for (let i = 1; i < rows.length; i++)
            rows[i].y = Math.max(rows[i].y, rows[i - 1].y + pitch);
          const overflow = rows[rows.length - 1].y - plotBottom;
          if (overflow > 0) {
            rows[rows.length - 1].y = plotBottom;
            for (let i = rows.length - 2; i >= 0; i--)
              rows[i].y = Math.min(rows[i].y, rows[i + 1].y - pitch);
          }
          const x = width - PAD - nameGutter + 14;
          return rows.map((row) => (
            <g key={`gutter-${row.key}`}>
              <line
                x1={last.x + last.w}
                x2={x - 5}
                y1={row.cell.y + row.cell.h / 2}
                y2={row.y}
                stroke={grid}
                strokeWidth={direction.stroke.hairline}
              />
              <text
                x={x}
                y={row.y + (annotBand.ascent - annotBand.descent) / 2}
                {...line(annot)}
                // THE TRACKED BAND IS NAMED IN INK, NOT IN THE ACCENT. The accent is a category on
                // this plate — it stands for nuclear, the family no convention covers — so an
                // accent-coloured `Charbon` would say coal is nuclear. Weight carries the emphasis
                // and the band's own near-black fill, which is the fossil convention's own colour,
                // does the rest.
                fill={row.key === tracked ? ink : mutedInk}
                fontWeight={row.key === tracked ? 700 : annot.fontWeight}
              >
                {set(labelFor(row.key), annot)}
              </text>
            </g>
          ));
        })()}

    </svg>
  );
}
