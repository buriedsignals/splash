/**
 * Swiss electricity by source, 2000–2024, drawn THROUGH the design base.
 *
 * The sixteenth component in this tree and the seventh of the nine forms the harvest reached with
 * none. Four publications, and one of them is the designer who invented the form.
 *
 * `a-band-is-named-inside-itself-or-it-is-texture` (FOUR publications, one of them a negative) —
 * Ferdio: "because the form has no axis, this is not decoration, it is the whole naming mechanism".
 * UNHCR: "big band, big name; small band, small name; tiny band, nothing". The NYT labels a few at
 * their peak and accepts the rest are texture. And Lee Byron's own figure is the counter-example:
 * strip the labels and "nothing on this plate can be turned back into a number".
 *
 * `a-free-baseline-forbids-a-value-axis` (two publications, the second a counter-example) — a
 * silhouette offset means no band starts at zero, so a y-axis over it prints values nothing on the
 * plate has. UNHCR's documentation plate keeps one and prints NEGATIVE labels for a quantity that
 * cannot be negative. The value goes in the bands and the total is drawn once, plainly, outside.
 *
 * `the-layer-order-is-the-argument` (two publications) — inside-out, largest through the middle,
 * which is Lee Byron's own ordering and what keeps the thin series off the hard edges. Ferdio adds
 * the reason it is editorial: "when 'A overtook B' is the fact, a fixed order hides it".
 */

import { scaleLinear } from "d3-scale";
import { area, curveBasis, stack, stackOffsetSilhouette, stackOrderInsideOut } from "d3-shape";
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
  READING_TO_SOURCE,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Reading = { year: number } & Record<string, number>;

export function DirectedStreamgraph({
  readings,
  keys,
  labels,
  tracked,
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
  readings: Reading[];
  keys: string[];
  labels: Record<string, string>;
  tracked: string;
  unit: string;
  title: string;
  limits: string;
  reading: string;
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
  const titleTop = eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop = titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
  const readingTop = sourceTop - readingLines.length * bodyLead - gapOf(annot, READING_TO_SOURCE);

  // ── the stack ─────────────────────────────────────────────────────────────
  const named = on("a-band-is-named-inside-itself-or-it-is-texture");
  const noAxis = on("a-free-baseline-forbids-a-value-axis");
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  const plotTop = limitsTop + limitLines.length * bodyLead + annotBand.ascent * 2.2;
  const plotBottom = readingTop - gapOf(annot, 0.8571) - axisBand.ascent - axisBand.descent - 10;

  /** INSIDE-OUT: largest layers through the middle, thin ones tapering outward, on a silhouette
   *  offset — the ordering and the offset Lee Byron's own figure uses. */
  const series = stack<Reading>()
    .keys(keys)
    .order(stackOrderInsideOut)
    .offset(stackOffsetSilhouette)(readings);

  const x = scaleLinear()
    .domain([readings[0].year, readings[readings.length - 1].year])
    .range([PAD, width - PAD]);
  const extent = series.flat(2).filter((v) => Number.isFinite(v)) as number[];
  /** THE DOMAIN IS PADDED SO THE STACK HAS PAGE AROUND IT. Ferdio's rule is to print the value "at
   *  the ends, OUTSIDE the stack" — and outside needs somewhere to be. Without this the labels sat
   *  on the bands, where an accent-coloured number over a pale band is the contrast failure this
   *  family's own records name (measured at 2.32–2.52 : 1 on the LLNL plate). */
  const span = Math.max(...extent) - Math.min(...extent);
  /** THE PAGE AROUND THE STACK IS A NUMBER OF PIXELS, NOT A PERCENTAGE, ONCE THE PLOT IS SHORT.
   *
   *  14% of the domain either side maps to 10.9% of the plot's height, which at 960x540 is 33px —
   *  more than the 28px « 0,01 TWh » needs under the stream, which is why the rule was never felt.
   *  At 1080x1080 the same plot is 130px tall, the same percentage is 14px, and the value landed
   *  first on the year ticks and then, when it was moved above, on the total line. A percentage of
   *  a small number is a small number; what the label needs is its own height. So the range is
   *  inset by whatever the proportional padding fails to provide, and by nothing when it does.
   *
   *  It is held to the small frames because 960x540 is the composition this beat was accepted at:
   *  its proportional padding is 8px short of this rule and nothing collided there, so applying the
   *  rule at that frame would redraw an accepted plate to repair a different one. */
  const endRoom =
    noAxis && width < FRAME.width
      ? bandOf(value).ascent + bandOf(value).descent + 12
      : 0;
  const naturalPad = (plotBottom - plotTop) * (0.14 / 1.28);
  const extraRoom = Math.max(0, endRoom - naturalPad);
  const y = scaleLinear()
    .domain([Math.min(...extent) - span * 0.14, Math.max(...extent) + span * 0.14])
    .range([plotBottom - extraRoom, plotTop + extraRoom]);

  const shape = area<[number, number] & { data: Reading }>()
    .x((d: any) => x(d.data.year))
    .y0((d: any) => y(d[0]))
    .y1((d: any) => y(d[1]))
    .curve(curveBasis);

  /** IDENTITY BY THE STACK'S OWN ORDER. The layers are ordered by size through the middle, so their
   *  positions are an ordered set: a sequential ramp of the direction's accent, with the tracked band
   *  at full strength. Nine categorical hues on a form with no axis would be nine colours a legend
   *  cannot take back. */
  const ranked = [...series].sort((a, b) => a.index - b.index);
  const rampFrom = mix(direction.accent, ink, 0.45);
  const rampTo = mix(direction.accent, direction.ground, 0.78);
  const fillOf = (key: string) => {
    if (key === tracked) return direction.accent;
    const i = ranked.findIndex((s) => s.key === key);
    return mix(rampFrom, rampTo, ranked.length > 1 ? i / (ranked.length - 1) : 0);
  };
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(direction.ground, fill) ? ink : direction.ground;

  /** Where a band is thickest, and how thick it is there — the point Ferdio labels at, measured
   *  rather than guessed. */
  const widestOf = (s: (typeof series)[number]) => {
    let best = { at: 0, thickness: 0 };
    s.forEach((point, i) => {
      const thickness = Math.abs(y(point[0]) - y(point[1]));
      if (thickness > best.thickness) best = { at: i, thickness };
    });
    return {
      x: x(readings[best.at].year),
      y: (y(s[best.at][0]) + y(s[best.at][1])) / 2,
      thickness: best.thickness,
    };
  };

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

  const ticks = readings
    .map((r) => r.year)
    .filter((year, i, all) => year % 5 === 0 || i === 0 || i === all.length - 1);
  const totalOf = (r: Reading) => keys.reduce((sum, k) => sum + (r[k] as number), 0);
  const firstReading = readings[0];
  const lastReading = readings[readings.length - 1];

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

      {/* Vertical gridlines only: the vertical position carries nothing on a free baseline, so a
          horizontal rule would be a scale for a quantity the plate does not encode. */}
      {ticks.map((year) => (
        <line
          key={`grid-${year}`}
          x1={x(year)}
          x2={x(year)}
          y1={plotTop}
          y2={plotBottom}
          stroke={grid}
          strokeWidth={direction.stroke.hairline}
        />
      ))}

      {series.map((s) => (
        <path
          key={s.key}
          d={shape(s as any) ?? undefined}
          fill={fillOf(s.key)}
          stroke={direction.ground}
          strokeWidth={direction.stroke.hairline}
        />
      ))}

      {/* THE BANDS NAME THEMSELVES, at their own widest point, in whichever ink clears the floor
          against that band's fill — and a band too thin to hold its name gets nothing, which is the
          long tail shown rather than pretended away. */}
      {named &&
        series.map((s) => {
          const widest = widestOf(s);
          const text = set(labels[s.key] ?? s.key, annot);
          /** THE TRACKED BAND IS NAMED ONCE, AND IT IS NAMED OUTSIDE. Its name is already drawn on a
           *  leader below, where the contrast only has to hold against the page. At 960x540 the
           *  solar band is 4px thick at its widest and fails the test below anyway, so this never
           *  fired; at 1080x1920 the same band is thick enough to name itself and the plate printed
           *  « SOLAIRE » twice, once on the band and once on the leader pointing at it. */
          if (s.key === tracked && named) return null;
          if (
            widest.thickness < annotBand.ascent + annotBand.descent + 4 ||
            widthOf(text, annot) > width - PAD * 2
          )
            return null;
          // CLAMPED INSIDE THE FRAME. A band's widest point is often its last, and a centred label
          // there hangs half its width off the plate — `Hydraulique` and the end value both did.
          const half = widthOf(text, annot) / 2;
          // Eight pixels of inset: at the frame's own edge a label reads as clipped even when every
          // glyph is there — measured by cropping the render at 2x, where `Hydraulique` sits flush
          // against the stream's last pixel.
          const labelX = Math.min(Math.max(widest.x, PAD + half + 8), width - PAD - half - 8);
          const glyphs = {
            x: labelX,
            y: widest.y + (annotBand.ascent - annotBand.descent) / 2,
            textAnchor: "middle" as const,
            ...line(annot),
            fontWeight: s.key === tracked ? 700 : annot.fontWeight,
          };
          return (
            /** THE NAME BREAKS THE LINES IT CROSSES, and the halo is the BAND's own fill rather than
             *  the plate's ground: this name sits inside its band. A leader or a rule running
             *  through a band's name cuts the one mechanism this form has for being read at all, and
             *  no guard here sees it, because a stroke is not a text box. */
            <g key={`label-${s.key}`}>
              <text
                {...glyphs}
                fill="none"
                stroke={fillOf(s.key)}
                strokeWidth={3.4}
                strokeLinejoin="round"
              >
                {text}
              </text>
              <text {...glyphs} fill={legibleOn(fillOf(s.key))}>
                {text}
              </text>
            </g>
          );
        })}

      {/* THE TRACKED BAND'S NAME AND ITS TWO VALUES SIT OUTSIDE THE STACK, each on a hairline leader
          back to the band. Drawn inside they were the failure this family's own records name — an
          accent-coloured number over a pale band, and on the dark direction a mint number over a
          mint band. Outside, the only contrast that has to hold is ink against the page, which
          `deriveFurniture` already guarantees. */}
      {(() => {
        const s = series.find((band) => band.key === tracked)!;
        const topAt = (i: number) => Math.min(...series.map((band) => y(band[i][1])));
        const bottomAt = (i: number) => Math.max(...series.map((band) => y(band[i][0])));
        const midAt = (i: number) => (y(s[i][0]) + y(s[i][1])) / 2;
        const valueBandHeight = bandOf(value).ascent + bandOf(value).descent;
        const leader = (
          key: string,
          i: number,
          text: string,
          where: "above" | "below",
          r: any,
          anchor: "start" | "middle" | "end",
        ) => {
          const at = { x: x(readings[i].year), y: midAt(i) };
          /** THE END VALUES GO BELOW THE STACK UNTIL THERE IS NO BELOW LEFT, AND THEN THEY GO ABOVE.
           *
           *  Ferdio's rule is that the quantity is printed at the ends, OUTSIDE the stack, and at
           *  960x540 the silhouette's own 14% padding leaves 21px under the stream for it. At
           *  1080x1080 the plot is barely half as tall, that padding is 9px, and « 0,01 TWh » landed
           *  on « 2000 » — 53% of the smaller run — which refused creme and nocturne outright. The
           *  tick row's ink begins at `plotBottom + 8`; a value that would reach it is not made
           *  smaller and is not left to collide, it is written above the stack instead, where the
           *  same rule — outside, against the page — still holds. */
          const tickInkTop = plotBottom + 8;
          const belowY = bottomAt(i) + 8 + bandOf(r).ascent;
          const side =
            where === "below" && belowY + bandOf(r).descent > tickInkTop - 2
              ? "above"
              : where;
          const edge = side === "above" ? topAt(i) : bottomAt(i);
          const yText =
            side === "above"
              ? edge - 8 - bandOf(r).descent
              : edge + 8 + bandOf(r).ascent;
          const half = widthOf(text, r) / 2;
          const clampedX =
            anchor === "middle"
              ? Math.min(Math.max(at.x, PAD + half + 8), width - PAD - half - 8)
              : anchor === "start"
                ? Math.max(at.x, PAD + 8)
                : Math.min(at.x, width - PAD - 8);
          return (
            <g key={key}>
              {/* A leader crossing the stack is dark on dark somewhere by construction — the one
                  from `0,01 TWh` runs through the hydro band and vanished into it. Ground-coloured
                  halo first, then the line: the same repair the waterfall's rule uses where a mark
                  has to cross fills it cannot choose. */}
              <line
                x1={at.x}
                y1={at.y}
                x2={at.x}
                y2={side === "above" ? edge - 4 : edge + 4}
                stroke={direction.ground}
                strokeWidth={direction.stroke.hairline * 4}
                strokeOpacity={0.85}
              />
              <line
                x1={at.x}
                y1={at.y}
                x2={at.x}
                y2={side === "above" ? edge - 4 : edge + 4}
                stroke={accentInk}
                strokeWidth={direction.stroke.hairline}
              />
              {/* THE LABEL BREAKS ITS OWN LEADER. The leader is drawn to the label's baseline, so
                  the stroke runs into the word it points at — the one crossing on this plate, and
                  invisible to every guard here, because a stroke is not a text box. */}
              <text
                x={clampedX}
                y={yText}
                textAnchor={anchor}
                {...line(r)}
                fill="none"
                stroke={direction.ground}
                strokeWidth={3.4}
                strokeLinejoin="round"
                fontWeight={700}
              >
                {text}
              </text>
              <text
                x={clampedX}
                y={yText}
                textAnchor={anchor}
                {...line(r)}
                fill={accentInk}
                fontWeight={700}
              >
                {text}
              </text>
            </g>
          );
        };
        const nameAt = Math.floor(readings.length * 0.62);
        return (
          <g>
            {named && leader("tracked-name", nameAt, set(labels[tracked] ?? tracked, annot), "above", annot, "middle")}
            {noAxis &&
              leader(
                "tracked-start",
                0,
                set(`${format(firstReading[tracked] as number)} ${unit}`, value),
                "below",
                value,
                "start",
              )}
            {noAxis &&
              leader(
                "tracked-end",
                readings.length - 1,
                set(`${format(lastReading[tracked] as number)} ${unit}`, value),
                "below",
                value,
                "end",
              )}
            {noAxis && (
              <text x={PAD} y={plotTop - annotBand.descent - 4} {...line(annot)} fill={mutedInk}>
                {set(
                  `Total ${firstReading.year} : ${format(totalOf(firstReading))} ${unit} · ` +
                    `${lastReading.year} : ${format(totalOf(lastReading))} ${unit}`,
                  annot,
                )}
              </text>
            )}
          </g>
        );
      })()}

      {ticks.map((year) => (
        <text
          key={`tick-${year}`}
          x={x(year)}
          y={plotBottom + 8 + axisBand.ascent}
          textAnchor={
            year === readings[0].year
              ? "start"
              : year === readings[readings.length - 1].year
                ? "end"
                : "middle"
          }
          {...line(axis)}
          fill={mutedInk}
        >
          {set(String(year), axis)}
        </text>
      ))}
    </svg>
  );
}
