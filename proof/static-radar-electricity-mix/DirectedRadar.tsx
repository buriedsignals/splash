/**
 * France and Germany's electricity mixes, drawn THROUGH the design base.
 *
 * The eleventh component in this tree, the second of the nine forms the harvest reached that had no
 * directed component, and the first whose references come almost entirely from ONE trade: four of
 * the five are football analytics — `blogarchive.statsbomb.com` and The Analyst. That is where this
 * form is actually practised, and it shows: every rule two of those publications agree on is about
 * making a radius readable, which is the thing `references/types/radar.md` says the type is worst at.
 *
 * `a-radius-is-not-read-by-eye` (two publications, two answers) — StatsBomb prints each spoke's own
 * scale ALONG the spoke in that spoke's units; The Analyst writes the value INSIDE its own wedge.
 * Nobody in this family asks a reader to judge a radius against a ring. Here each spoke's two
 * shares are printed at the spoke's outer end, France's in the accent and Germany's in the muted
 * ink, so the pair reads as one line per source.
 *
 * `the-grid-is-circles-and-the-ceiling-is-drawn` (two publications) — StatsBomb draws five or six
 * full circles and NO polygonal gridlines: "the only polygon on the plate is the player's". The
 * Analyst draws a light full ring meaning the 100th percentile with dashed rings inside it. Both
 * halves are here: circular rings, a drawn ceiling, and one labelled ring so the radius means
 * something.
 *
 * `the-benchmark-is-captioned` (two publications) — the population the radius is against, on the
 * plate. The one rule in this family with nothing sport-specific in it: a share is a share OF
 * something, and here it is each country's OWN generation, which is the whole reason nine axes on
 * one radial scale are legitimate.
 *
 * WHAT THE TYPE SHEET ASKS FOR THAT NO REFERENCE SUPPLIES: the axis ORDER. `radar.md` calls it the
 * type's structural weak point — a polygon's area moves with the order of its spokes — and says it
 * has to be an editorial decision. The spokes here run renewables, then nuclear, then fossil, and
 * the order is stated in the reading line rather than left to be inferred.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
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

export type Spoke = { key: string; label: string; family: string; shares: number[] };

export function DirectedRadar({
  spokes,
  items,
  subject,
  ceiling,
  ceilingLabel,
  rings,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  direction,
  treatments,
}: {
  spokes: Spoke[];
  items: string[];
  subject: string;
  ceiling: number;
  ceilingLabel: string;
  rings: number[];
  title: string;
  limits: string;
  reading: string | string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
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

  // ── header, then two columns ──────────────────────────────────────────────
  /** THE PLATE IS TWO COLUMNS, and that is a consequence of the form rather than a preference. A
   *  radar is square: its size is bounded by the HEIGHT of the band it is given, and with the
   *  standfirst, the key and the reading line all stacked above it the band was 140px — a wheel of
   *  52px radius carrying nine spoke labels, smaller than its own labels. The words go left, the
   *  wheel takes the height of the whole body, and its radius roughly doubles. */
  const column = width - PAD * 2;
  const titleLines = wrap(set(title, display), column, display);
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const captioned = on("the-benchmark-is-captioned");

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop = eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;

  const leftWidth = Math.round(column * 0.34);
  const limitLines = wrap(set(limits, body), leftWidth, body);
  const sourceTopFor = (lines: string[]) =>
    height - PAD - (lines.length - 1) * bodyLead - gapOf(body, 0.9655);
  const readingTopFor = () =>
    titleTop +
    titleLines.length * titleLead +
    gapOf(body, 0.8276) +
    limitLines.length * bodyLead +
    gapOf(annot, 2.2857);
  /** THE READING LINE HAS RUNGS, because one direction sets this register in tracked capitals and a
   *  sentence that is three lines in `creme` is seven in `nocturne` — measured: it ran through the
   *  source line and off the bottom of the frame. The beat supplies the sentence and its short
   *  form; the component takes the longest one that fits the column it has. */
  const readingChoices = (Array.isArray(reading) ? reading : [reading]).filter(Boolean);
  const readingLines = (() => {
    if (!captioned) return [];
    const room = sourceTopFor(wrap(set(source, body), column, body)) - readingTopFor();
    for (const candidate of readingChoices) {
      const lines = wrap(set(candidate, annot), leftWidth, annot);
      if (lines.length * bodyLead <= room) return lines;
    }
    // Nothing fits: the shortest is drawn and the overflow is reported rather than shipped silently.
    console.log("  the reading line does not fit this direction's column, even at its shortest rung");
    return wrap(set(readingChoices[readingChoices.length - 1], annot), leftWidth, annot);
  })();
  const sourceLines = wrap(set(source, body), column, body);

  const bodyTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.8276);
  /** The key is one line in the two inks the plate uses for the two countries' numbers. Nothing
   *  else on the plate carries those inks, so it is a key without a block. */
  const keyTop = bodyTop + limitLines.length * bodyLead + gapOf(annot, 0.8571);
  const readingTop = keyTop + gapOf(annot, 1.4286);
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  // ── the wheel ─────────────────────────────────────────────────────────────
  const plotTop = bodyTop - body.fontSize;
  const plotBottom = sourceTop - gapOf(body, 1.2414);
  const wheelLeft = PAD + leftWidth + 28;
  const wheelWidth = width - PAD - wheelLeft;
  const centre = { x: wheelLeft + wheelWidth / 2, y: (plotTop + plotBottom) / 2 };
  /** The name is on one line and the two values on the line under it, so what the ring cannot reach
   *  is the WIDER of the two, not their sum. Adding them cost this wheel 45px of radius. */
  const labelRoom =
    Math.max(
      ...spokes.map((s) => widthOf(set(s.label, annot), annot)),
      ...spokes.map((s) => widthOf(s.shares.map(format).join(" · "), value)),
    ) + 18;
  const radius = Math.min(
    (plotBottom - plotTop) / 2 - bandOf(annot).ascent - bandOf(value).ascent - 10,
    wheelWidth / 2 - labelRoom,
  );

  const r = scaleLinear().domain([0, ceiling]).range([0, radius]);
  /** Twelve o'clock is the first spoke, and the circle turns clockwise — the reading order the
   *  reading line names. */
  const angle = (i: number) => (i / spokes.length) * Math.PI * 2 - Math.PI / 2;
  const at = (i: number, v: number) => ({
    x: centre.x + Math.cos(angle(i)) * r(v),
    y: centre.y + Math.sin(angle(i)) * r(v),
  });

  const polygons = items.map((item, itemIndex) => ({
    item,
    isSubject: item === subject,
    d:
      spokes
        .map((s, i) => {
          const p = at(i, s.shares[itemIndex]);
          return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
        })
        .join(" ") + " Z",
    points: spokes.map((s, i) => at(i, s.shares[itemIndex])),
  }));

  const line = (rr: any) => ({
    fontFamily: rr.fontFamily,
    fontSize: rr.fontSize,
    fontWeight: rr.fontWeight,
    fontStyle: rr.fontStyle,
    letterSpacing: rr.letterSpacing,
    fill: rr.fill,
  });
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);
  const inkFor = (i: number) => (items[i] === subject ? accentInk : mutedInk);
  const hueFor = (i: number) => (items[i] === subject ? direction.accent : muted);

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
        <text key={l + i} x={PAD} y={bodyTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
      {readingLines.map((l, i) => (
        <text key={`r${i}`} x={PAD} y={readingTop + i * bodyLead} {...line(annot)} fill={mutedInk}>
          {l}
        </text>
      ))}
      <text x={PAD} y={keyTop} {...line(annot)}>
        {items.map((item, i) => (
          <tspan
            key={item}
            fill={inkFor(i)}
            fontWeight={item === subject ? 700 : annot.fontWeight}
          >
            {i === 0 ? "" : "   ·   "}
            {set(item, annot)}
          </tspan>
        ))}
      </text>
      {sourceLines.map((l, i) => (
        <text key={`s${i}`} x={PAD} y={sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {/* THE GRID IS CIRCLES. A polygonal web is a shape, and this plate's whole read is a shape. */}
      {rings.map((ringValue) => (
        <circle
          key={ringValue}
          cx={centre.x}
          cy={centre.y}
          r={r(ringValue)}
          fill="none"
          stroke={ringValue === ceiling ? mutedInk : grid}
          strokeWidth={ringValue === ceiling ? direction.stroke.rule : direction.stroke.hairline}
          strokeDasharray={ringValue === ceiling ? undefined : "3 4"}
        />
      ))}
      {/* One labelled ring, so the radius means something. The ceiling carries its own number. */}
      {/* The labelled ring sits BETWEEN two spokes — on the twelve o'clock spoke it printed itself
          over `Éolien` and its two values. Half a spoke's angle to the right of the top, just
          outside the ceiling, is empty by construction. */}
      {(() => {
        const a = angle(0) + Math.PI / spokes.length;
        // INSIDE the ceiling ring, not outside it: outside, in the one direction that sets this
        // register in tracked capitals, `70,0 %` printed into `SOLAIRE`.
        const p = {
          x: centre.x + Math.cos(a) * (radius - 6),
          y: centre.y + Math.sin(a) * (radius - 6),
        };
        /** AND IT BREAKS THE RINGS AND SPOKES IT SITS ON. Inside the ceiling ring the number
         *  crosses the plate's own furniture — a stroke through a printed value is not an overlap
         *  of two text boxes, so nothing but the eye caught it. Drawn twice, halo first. */
        const glyphs = {
          x: p.x,
          y: p.y,
          ...line(axis),
          textAnchor: "end" as const,
        };
        return (
          <g>
            <text
              {...glyphs}
              fill="none"
              stroke={direction.ground}
              strokeWidth={3.4}
              strokeLinejoin="round"
            >
              {set(ceilingLabel, axis)}
            </text>
            <text {...glyphs} fill={mutedInk}>
              {set(ceilingLabel, axis)}
            </text>
          </g>
        );
      })()}

      {spokes.map((s, i) => {
        const end = at(i, ceiling);
        return (
          <line
            key={s.key}
            x1={centre.x}
            y1={centre.y}
            x2={end.x}
            y2={end.y}
            stroke={grid}
            strokeWidth={direction.stroke.hairline}
          />
        );
      })}

      {polygons.map((p, i) => (
        <path
          key={p.item}
          d={p.d}
          fill={hueFor(i)}
          fillOpacity={p.isSubject ? 0.18 : 0.22}
          stroke={hueFor(i)}
          strokeWidth={direction.stroke.rule * 2}
          strokeLinejoin="round"
        />
      ))}
      {polygons.map((p, i) =>
        p.points.map((pt, j) => (
          <circle
            key={`${p.item}-${j}`}
            cx={pt.x}
            cy={pt.y}
            r={direction.stroke.rule * 1.6}
            fill={hueFor(i)}
          />
        )),
      )}

      {/* EVERY SPOKE CARRIES ITS OWN NUMBERS, at the spoke's outer end: the source, then one value
          per country on the line under it. Nobody in this family asks a reader to judge a radius. */}
      {spokes.map((s, i) => {
        const a = angle(i);
        const out = {
          x: centre.x + Math.cos(a) * (radius + 12),
          y: centre.y + Math.sin(a) * (radius + 12),
        };
        const anchor = Math.abs(Math.cos(a)) < 0.25 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        const above = Math.sin(a) < -0.75;
        const nameY = out.y + (above ? -annotBand.descent - valueBand.ascent - 2 : annotBand.ascent / 2);
        return (
          <g key={`label-${s.key}`}>
            <text x={out.x} y={nameY} textAnchor={anchor} {...line(annot)} fill={mutedInk}>
              {set(s.label, annot)}
            </text>
            <text
              x={out.x}
              y={nameY + valueBand.ascent + 3}
              textAnchor={anchor}
              {...line(value)}
            >
              {s.shares.map((share, itemIndex) => (
                <tspan
                  key={items[itemIndex]}
                  fill={inkFor(itemIndex)}
                  fontWeight={items[itemIndex] === subject ? 700 : value.fontWeight}
                >
                  {itemIndex === 0 ? "" : " · "}
                  {set(format(share), value)}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}

    </svg>
  );
}
