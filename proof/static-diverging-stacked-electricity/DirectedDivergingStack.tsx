/**
 * Six electricity mixes as a lean — fossil left, renewables right, nuclear on the anchor — drawn
 * THROUGH the design base. The seventeenth component in this tree and the eighth of the nine forms
 * the harvest reached with none.
 *
 * `the-neutral-straddles-the-centre` (Vega-Lite, FT) — the level belonging to neither side sits ON
 * the zero, half its mass each side, "so 'which way does this row lean' is answered by which side is
 * longer, with the undecided mass symmetric about the anchor". Pushing it onto one side is not a
 * tidier drawing: it adds its whole length to that side's lean, silently, on every row.
 *
 * `the-ramp-deepens-outward` (Vega-Lite, jbryer) — one ramp per side, palest beside the centre,
 * deepest at the extreme, so intensity and distance say the same thing. It is the whole reason to
 * prefer this over a stacked bar cut in two.
 *
 * AND ONE RULE FOLLOWED WITHOUT BEING FILED, because only one publication carries it: jbryer puts
 * the two totals OUTSIDE the bar, at its ends — "they answer the question the chart is for, they
 * never collide with a small segment, and they cost no ink inside the ramp". Cited here rather than
 * filed, because a single publication is not a rule in this base.
 */

import { scaleLinear } from "d3-scale";
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

/** A RUN DRAWN TWICE: once as a halo in the colour it sits on, once as itself.
 *
 * A gridline, a zero rule or a connector running through a printed number is the plate's own
 * furniture cutting the plate's own evidence, and no guard in this tree could see it — the overlap
 * guard compares two text boxes, and a stroke is not a text box. Rémy read it off the delivered
 * plates: *les textes sur le graphe sont coupés par les lignes*.
 *
 * The halo takes the colour the run SITS ON, not the plate's ground: a number inside a segment is
 * haloed in that segment's fill. `text-boxes.mjs` skips a fill-less stroked run when it measures
 * ink, so the halo costs the overlap guard nothing.
 */
function Haloed({
  x,
  y,
  anchor,
  reg,
  ground,
  fill,
  weight,
  text,
}: {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  reg: any;
  ground: string;
  fill: string;
  weight?: number;
  text: string;
}) {
  const glyphs = {
    x,
    y,
    textAnchor: anchor,
    fontFamily: reg.fontFamily,
    fontSize: reg.fontSize,
    fontWeight: weight ?? reg.fontWeight,
    fontStyle: reg.fontStyle,
    letterSpacing: reg.letterSpacing,
  };
  return (
    <g>
      <text {...glyphs} fill="none" stroke={ground} strokeWidth={3.4} strokeLinejoin="round">
        {text}
      </text>
      <text {...glyphs} fill={fill}>
        {text}
      </text>
    </g>
  );
}


type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Level = { key: string; label: string; value: number };
export type Row = { key: string; label: string; left: Level[]; centre: Level; right: Level[] };

export function DirectedDivergingStack({
  rows,
  subject,
  leftName,
  rightName,
  centreName,
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
  onLadder,
}: {
  rows: Row[];
  subject: string;
  leftName: string;
  rightName: string;
  centreName: string;
  unit: string;
  /** THE COPY IS HANDED IN AS A LADDER — every form the layout may spend, longest first. A bare
   *  string is the one-rung ladder this beat used to have, so a caller that has not been migrated
   *  still draws exactly what it drew. */
  title: string | string[];
  limits: string | string[];
  reading: string | string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  direction: any;
  treatments: string[];
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
  /** Which rung of the copy the layout ended up standing on — emitted rather than inferred, so a
   *  run says out loud what it gave up. */
  onLadder?: (line: string) => void;
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
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const sourceLines = wrap(set(source, body), column, body);

  // ── the rows ──────────────────────────────────────────────────────────────
  const ramped = on("the-ramp-deepens-outward");
  const straddles = on("the-neutral-straddles-the-centre");
  const annotBand = bandOf(annot);
  const valueBand = bandOf(value);
  const axisBand = bandOf(axis);

  const nameRoom = Math.max(...rows.map((r) => widthOf(set(r.label, annot), annot))) + 14;
  /** jbryer's rule, cited not filed: the two totals live OUTSIDE the bar, at its ends. */
  const totalRoom =
    Math.max(
      ...rows.map((r) =>
        Math.max(
          widthOf(set(format(r.left.reduce((s, l) => s + l.value, 0)), value), value),
          widthOf(set(format(r.right.reduce((s, l) => s + l.value, 0)), value), value),
        ),
      ),
    ) + 12;

  const plotLeft = PAD + nameRoom + totalRoom;
  const plotRight = width - PAD - totalRoom;

  /** THE TWO SIDES AND THE ANCHOR ARE THREE RUNS ON ONE LINE, AND AT A NARROW FRAME THEY DO NOT FIT.
   *
   *  Measured at 1080x1920: the half-width either side of the anchor came to 156px, and
   *  « Nucléaire » centred on the anchor ran straight into « Renouvelable → » — the plate printed
   *  « NUCLÉAPRENOUVELABLE ». Neither run is arbitrated; both are drawn from the geometry, so no
   *  counter in this tree was watching them. When the three do not clear each other the anchor's
   *  name takes a line of its own ABOVE the pair, and the plot is pushed down by exactly that line
   *  rather than by a guess. At 960px the three clear and nothing moves. */
  const SIDE_NAME_BREATH = 10;
  const sideNameRoom = (plotRight - plotLeft) / 2;
  const sideNamesStacked =
    straddles &&
    widthOf(set(centreName, annot), annot) / 2 + SIDE_NAME_BREATH >
      sideNameRoom -
        Math.max(
          widthOf(set(`← ${leftName}`, annot), annot),
          widthOf(set(`${rightName} →`, annot), annot),
        );

  /** THE COPY IS A LADDER, and every rung of it is the desk's own cut order: the reading line
   *  first, then the standfirst, then the headline — `REMOVAL_LADDER`'s R3 and R4 in the order
   *  `type-at-size.mjs` files them.
   *
   *  It was three fixed strings. At 960x540 they fit; at 540x540 the headline alone set in six
   *  lines of display type, the reading line in seven of annot, and the plot's own band came out
   *  NEGATIVE — `plotBottom` above `plotTop` — so the rows were drawn through the reading line and
   *  the guard counted thirty pairs of words printed through each other. A beat with no rungs has
   *  nothing to spend at a frame that is narrower than the one it was written for. */
  const titleForms = Array.isArray(title) ? title : [title];
  const limitForms = Array.isArray(limits) ? limits : [limits];
  const readingForms = Array.isArray(reading) ? reading : [reading];

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(titleForms[t], display), column, display);
    const limitLines = wrap(set(limitForms[l], body), column, body);
    const readingLines =
      r < 0 ? [] : wrap(set(readingForms[r], annot), column, annot);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop =
      sourceTop - readingLines.length * bodyLead - gapOf(annot, READING_TO_SOURCE);
    const plotTop =
      limitsTop +
      limitLines.length * bodyLead +
      annotBand.ascent * 3.2 +
      (sideNamesStacked ? annotLead : 0);
    const plotBottom =
      readingTop - gapOf(annot, 0.7857) - axisBand.ascent - axisBand.descent - 8;
    return {
      titleLines,
      limitLines,
      readingLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      sourceTop,
      readingTop,
      plotTop,
      plotBottom,
    };
  };

  /** A ROW HAS TO HOLD ITS OWN NAME, on one line, clear of the row above. That is the floor the
   *  ladder is walked against: the annot register's own band plus breath, per row of pitch. Below
   *  it the six country names are printed through each other, which is what a 540px frame did
   *  before there was a ladder to walk. */
  const rowOwes = annotBand.ascent + annotBand.descent + 6;
  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < titleForms.length; t++)
    for (let l = 0; l < limitForms.length; l++) {
      for (let r = 0; r < readingForms.length; r++)
        rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  let fits: { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor> } | null = null;
  let bestPitch = -Infinity;
  for (const rung of rungs) {
    const candidate = layoutFor(rung.title, rung.limit, rung.reading);
    const pitchAt = (candidate.plotBottom - candidate.plotTop) / rows.length;
    if (pitchAt > bestPitch) bestPitch = pitchAt;
    if (pitchAt >= rowOwes) {
      fits = { rung, layout: candidate };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `the copy leaves the six rows ${bestPitch.toFixed(1)}px of pitch at ${width} x ${height}, ` +
        `and a row that carries its own name owes ${rowOwes.toFixed(1)}px. Every rung of this ` +
        `beat's copy has been spent. Give it shorter forms — do not squeeze the rows, which are ` +
        `the argument.`,
    );
  const layout = fits.layout;
  const {
    titleLines,
    limitLines,
    readingLines,
    eyebrowBaseline,
    titleTop,
    limitsTop,
    sourceTop,
    readingTop,
  } = layout;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1} in ${titleLines.length} lines, standfirst ` +
      `${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · ${rows.length} rows, pitch ${((layout.plotBottom - layout.plotTop) / rows.length).toFixed(0)}px, ` +
      `floor ${rowOwes.toFixed(1)}px` +
      (sideNamesStacked ? " · the anchor's name takes a line of its own" : ""),
  );
  const plotTop = layout.plotTop;
  const plotBottom = layout.plotBottom;

  /** The scale is MIRRORED about the centre and reads as a magnitude on both sides — jbryer's
   *  `100 · 50 · 0 · 50 · 100`, because "a signed axis under a count of people says something
   *  false". Here the quantity is a share, and a −40 % share is equally false. */
  const reach = 100;
  const centreX = (plotLeft + plotRight) / 2;
  const halfWidth = (plotRight - plotLeft) / 2;
  const x = scaleLinear().domain([0, reach]).range([0, halfWidth]);

  const pitch = (plotBottom - plotTop) / rows.length;
  const barHeight = Math.min(pitch * 0.62, 30);

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
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(direction.ground, fill) ? ink : direction.ground;

  /** TWO RAMPS AND A NEUTRAL, all three from the direction's own colours. The fossil side ramps
   *  toward the ink, the renewable side toward the accent, so the two differ in CHROMA as well as
   *  lightness — which is what jbryer's brown-against-teal is actually buying. */
  const leftLevels = rows[0].left.length;
  const rightLevels = rows[0].right.length;
  const leftFill = (i: number) => {
    const t = ramped && leftLevels > 1 ? i / (leftLevels - 1) : 0.5;
    // Stops short of the ink: at 0.85 the outermost step was effectively black and Poland's row read
    // as a hole in the page rather than as the deep end of a ramp.
    return mix(mix(muted, direction.ground, 0.2), ink, t * 0.6);
  };
  const rightFill = (i: number) => {
    const t = ramped && rightLevels > 1 ? i / (rightLevels - 1) : 0.5;
    return mix(mix(direction.accent, direction.ground, 0.7), direction.accent, t);
  };
  /** Lighter than the fossil ramp's own first step, so the mass ON the anchor is never mistaken for
   *  the innermost level of the side beside it. Achromatic, belonging to neither ramp. */
  const centreFill = mix(direction.ground, ink, 0.14);

  const ticks = [-100, -50, 0, 50, 100];

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

      {/* The two sides named once, over the ends of the scale — one label system for what is
          measured, another for who is measured, never mixed. */}
      <text
        x={centreX - halfWidth}
        y={plotTop - annotBand.descent - 6}
        {...line(annot)}
        fill={mutedInk}
      >
        {set(`← ${leftName}`, annot)}
      </text>
      <text
        x={centreX + halfWidth}
        y={plotTop - annotBand.descent - 6}
        textAnchor="end"
        {...line(annot)}
        fill={accentInk}
      >
        {set(`${rightName} →`, annot)}
      </text>
      {straddles && (
        <text
          x={centreX}
          y={
            sideNamesStacked
              ? plotTop - annotBand.descent - 6 - annotLead
              : plotTop - annotBand.descent - 6
          }
          textAnchor="middle"
          {...line(annot)}
          fill={mutedInk}
        >
          {set(centreName, annot)}
        </text>
      )}

      {rows.map((row, i) => {
        const mid = plotTop + i * pitch + pitch / 2;
        const y = mid - barHeight / 2;
        const isSubject = row.key === subject;
        const centreValue = row.centre.value;
        /** The neutral is centred on the anchor: half its mass each side. */
        const centreHalf = straddles ? x(centreValue) / 2 : 0;
        const leftTotal = row.left.reduce((s, l) => s + l.value, 0);
        const rightTotal = row.right.reduce((s, l) => s + l.value, 0);

        let cursor = centreX - centreHalf;
        const leftBars = row.left
          .slice()
          .reverse()
          .map((level, j) => {
            const w = x(level.value);
            cursor -= w;
            return { level, x: cursor, w, fill: leftFill(row.left.length - 1 - j) };
          });
        cursor = centreX + centreHalf;
        const rightBars = row.right.map((level, j) => {
          const bar = { level, x: cursor, w: x(level.value), fill: rightFill(j) };
          cursor += bar.w;
          return bar;
        });

        return (
          <g key={row.key}>
            {straddles && (
              <rect
                x={centreX - centreHalf}
                y={y}
                width={Math.max(centreHalf * 2, 0.6)}
                height={barHeight}
                fill={centreFill}
              />
            )}
            {[...leftBars, ...rightBars].map((bar) => (
              <rect
                key={`${row.key}-${bar.level.key}`}
                x={bar.x}
                y={y}
                width={Math.max(bar.w, 0.6)}
                height={barHeight}
                fill={bar.fill}
              />
            ))}

            <text
              x={PAD + nameRoom - 10}
              y={mid + (annotBand.ascent - annotBand.descent) / 2}
              textAnchor="end"
              {...line(annot)}
              fill={isSubject ? accentInk : annot.fill}
              fontWeight={isSubject ? 700 : annot.fontWeight}
            >
              {set(row.label, annot)}
            </text>

            {/* THE TOTALS OUTSIDE THE BAR, AT ITS ENDS — jbryer's arrangement: they answer the
                question the chart is for and never collide with a small segment. */}
            <Haloed
              x={leftBars.length ? leftBars[leftBars.length - 1].x - 8 : centreX - centreHalf - 8}
              y={mid + (valueBand.ascent - valueBand.descent) / 2}
              anchor="end"
              reg={value}
              ground={direction.ground}
              fill={mutedInk}
              text={set(format(leftTotal), value)}
            />
            <Haloed
              x={rightBars.length ? rightBars[rightBars.length - 1].x + rightBars[rightBars.length - 1].w + 8 : centreX + centreHalf + 8}
              y={mid + (valueBand.ascent - valueBand.descent) / 2}
              anchor="start"
              reg={value}
              ground={direction.ground}
              fill={isSubject ? accentInk : mutedInk}
              weight={isSubject ? 700 : value.fontWeight}
              text={set(format(rightTotal), value)}
            />

            {/* The neutral's own number, inside it where it fits — the row's third quantity, and on
                this beat the one the headline is about. */}
            {straddles &&
              centreHalf * 2 >= widthOf(set(format(centreValue), value), value) + 10 && (
                <Haloed
                  x={centreX}
                  y={mid + (valueBand.ascent - valueBand.descent) / 2}
                  anchor="middle"
                  reg={value}
                  ground={centreFill}
                  fill={legibleOn(centreFill)}
                  weight={isSubject ? 700 : value.fontWeight}
                  text={set(format(centreValue), value)}
                />
              )}
          </g>
        );
      })}

      {/* The anchor, painted over the bars: the line every row is measured against. */}
      <line
        x1={centreX}
        x2={centreX}
        y1={plotTop}
        y2={plotBottom}
        stroke={ink}
        strokeWidth={direction.stroke.rule}
      />

      {/* A MIRRORED MAGNITUDE AXIS: 100 · 50 · 0 · 50 · 100. A signed axis under a share would print
          a −40 % that does not exist. */}
      {ticks.map((t) => (
        <text
          key={t}
          x={centreX + x(t)}
          y={plotBottom + 6 + axisBand.ascent}
          textAnchor="middle"
          {...line(axis)}
          fill={mutedInk}
        >
          {set(t === 0 ? "0" : `${Math.abs(t)}${t === ticks[ticks.length - 1] ? ` ${unit}` : ""}`, axis)}
        </text>
      ))}
    </svg>
  );
}
