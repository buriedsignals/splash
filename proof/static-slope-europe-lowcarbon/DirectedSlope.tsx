/**
 * Low-carbon electricity in sixteen European countries, 2000 against 2024, drawn THROUGH the design
 * base. The first `slope` component in this tree.
 *
 * `the-slope-carries-direction-and-the-number-carries-magnitude` (Ferdio viz54, ABC) — no value
 * axis, no ticks: the rails are plain rules and the scale is carried entirely by the printed ends.
 * ABC states the price in the same breath and this plate pays it: without an axis the plate owes the
 * reader EVERY end value it draws, so a dropped end label is a hole in the scale, and the label
 * placer below may push a label but may never drop one.
 *
 * `each-rail-is-headed-by-what-it-is` (Ferdio viz54, Information is Beautiful) — `2000` and `2024`
 * are chips ON the rails, where the marks begin and end. No legend, and nothing carried across the
 * picture.
 *
 * `the-delta-is-its-own-register-beside-the-values` (ABC, Ferdio viz54) — the change is a third
 * fact at a third weight: the value register holds the two levels, the annot register holds the
 * delta. Three facts, three weights, one column.
 *
 * `colour-belongs-to-the-entity-not-to-the-state` (Ferdio viz17, IiB) — every line is one colour end
 * to end. The two states are told apart by position, never by hue, which leaves the hue free to do
 * the only other job this plate has: `accent-marks-the-thread`, on the one pair that crosses.
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
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Line = {
  key: string;
  label: string;
  from: number;
  to: number;
  delta: number;
  thread: boolean;
};

export function DirectedSlope({
  lines,
  rails,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  formatDelta,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  lines: Line[];
  rails: { left: string; right: string };
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  formatDelta: (v: number) => string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
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

  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthCache = new Map<string, number>();
  const widthOf = (text: string, r: any) => {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${r.letterSpacing}|${text}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      w =
        measureText(text, sizeOf(r)) +
        Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
      widthCache.set(key, w);
    }
    return w;
  };
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));

  const wrapCache = new Map<string, string[]>();
  function wrap(text: string, maxWidth: number, r: any): string[] {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${maxWidth}|${text}`;
    const hit = wrapCache.get(key);
    if (hit) return hit;
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
    wrapCache.set(key, out);
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
  const valueBand = bandOf(value);
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  // ── the ladder ────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);

  /** THE FLOOR IS THE END LABELS, and there are two of them per line. `the-slope-...-magnitude`
   *  makes every end value load-bearing — the plate has no axis, so a label that cannot be placed is
   *  a reading the reader cannot get. Sixteen lines put sixteen labels on each rail, and on the 2024
   *  rail the top three sit inside five points of each other. The plate needs room to PUSH them
   *  apart without reordering them; below this it cannot, and it refuses. */
  const labelPitch = valueBand.ascent + valueBand.descent + 2;
  const railHeadRoom = axisBand.ascent + axisBand.descent + 12;

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const limitLines = wrap(set(limits[l], body), column, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), column, annot);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.4828);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const readingTop = readingLines.length
      ? sourceTop - bodyLead - readingLines.length * annotLead
      : sourceTop - bodyLead * 0.4;
    const top = limitsTop + limitLines.length * bodyLead + railHeadRoom;
    const bottom = readingTop - gapOf(annot, 0.8571);
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
      top,
      bottom,
      /** THE USABLE RANGE, not the rail. A label is centred on its y and its ink is asymmetric, so
       *  the first baseline can be no higher than one ascent below the top and the last no lower
       *  than one descent above the foot. Measuring the whole rail instead let a rung pass that the
       *  stack could not actually fill, and the top label was then pushed back over the rail's own
       *  head — a check that says yes to a layout the placer then has to break. */
      room:
        (bottom - valueBand.descent - (top + valueBand.ascent)) / (lines.length - 1 || 1),
    };
  };

  const rungs: Array<{ title: number; limit: number; reading: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) {
      for (let r = 0; r < reading.length; r++)
        rungs.push({ title: t, limit: l, reading: r });
      rungs.push({ title: t, limit: l, reading: -1 });
    }
  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
  } | null = null;
  for (const rung of rungs) {
    const l = layoutFor(rung.title, rung.limit, rung.reading);
    if (l.room >= labelPitch) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits) {
    const best = rungs
      .map((rung) => ({
        rung,
        layout: layoutFor(rung.title, rung.limit, rung.reading),
      }))
      .reduce((a, b) => (b.layout.room > a.layout.room ? b : a));
    throw new Error(
      `${lines.length} lines do not fit this direction: the widest rung leaves ${best.layout.room.toFixed(1)}px ` +
        `per end label and the value register owes ${labelPitch.toFixed(1)}px. A slope with no axis ` +
        `owes every end value it draws, so drawing fewer lines is the only honest cut.`,
    );
  }
  const layout = fits.layout;

  // ── the two rails ─────────────────────────────────────────────────────────
  const nameRoom =
    Math.max(...lines.map((d) => widthOf(set(d.label, annot), annot))) + 10;
  const valueRoom =
    Math.max(...lines.map((d) => widthOf(set(format(d.from), value), value))) +
    12;
  const deltaRoom =
    Math.max(
      ...lines.map((d) => widthOf(set(formatDelta(d.delta), annot), annot)),
    ) + 16;
  const rightValueRoom =
    Math.max(...lines.map((d) => widthOf(set(format(d.to), value), value))) +
    12;

  const leftRail = PAD + nameRoom + valueRoom;
  const rightRail = width - PAD - deltaRoom - rightValueRoom;

  const values = lines.flatMap((d) => [d.from, d.to]);
  const pad = (Math.max(...values) - Math.min(...values)) * 0.04;
  /** THE MARKS AND THEIR LABELS SHARE ONE RANGE, and it is the range a LABEL can occupy — inset by
   *  the value register's own ascent at the top and its descent at the foot. Projecting the marks
   *  onto the whole rail and then asking the labels to fit inside a smaller window guarantees that
   *  the extreme label breaches by exactly the band it was never given: the lowest value's label
   *  hung one descent below the plot every single time, and the placer had nowhere to put it. */
  const topBound = layout.top + valueBand.ascent;
  const footBound = layout.bottom - valueBand.descent;
  const y = scaleLinear()
    .domain([Math.min(...values) - pad, Math.max(...values) + pad])
    .range([footBound, topBound]);

  /** LABELS ARE PUSHED, NEVER DROPPED AND NEVER REORDERED. Two passes over each rail — down, then
   *  up — is the standard way to open a stack to a minimum pitch while keeping its order: the first
   *  pass guarantees the pitch, the second pulls the stack back inside the frame if the first pushed
   *  it out. The plate reports the largest displacement, because a label a long way from its own
   *  line is a label that has stopped pointing at it, and that is a judgement for a person. */
  function stack(at: (d: Line) => number) {
    const order = lines
      .map((d, i) => ({ i, want: y(at(d)) }))
      .sort((a, b) => a.want - b.want);
    const got = order.map((o) => o.want);
    for (let k = 1; k < got.length; k++)
      got[k] = Math.max(got[k], got[k - 1] + labelPitch);
    /** THE STACK IS BOUNDED BY WHERE A LABEL'S INK ENDS, NOT BY WHERE ITS BASELINE SITS. A label is
     *  centred on its y, so a stack clamped to the plot's own bottom hangs half a label below it —
     *  and in `nocturne`, whose registers are largest, that half landed on the reading line. Half a
     *  label height is not the bound either — a label's ink is ASYMMETRIC about its baseline, and
     *  clamping to half the pitch pushed the top label's ascender above the rail and into the rail's
     *  own head. The bound is the band the register actually owes: its ascent at the top, its
     *  descent at the foot. */
    /** TWO PASSES, IN THE ORDER THAT MAKES THEM CONVERGE. Down from the top bound, guaranteeing the
     *  pitch; then UP from the foot bound, pulling back anything the first pass pushed out. Only if
     *  the second pass has to lift the first label above the top bound does the stack genuinely not
     *  fit — and then the plate refuses rather than drawing labels off their own rail. An earlier
     *  version subtracted the whole overshoot from every label, which silently cancelled the top
     *  clamp and put the first number over the rail's own head. */
    got[got.length - 1] = Math.min(got[got.length - 1], footBound);
    for (let k = got.length - 2; k >= 0; k--)
      got[k] = Math.min(got[k], got[k + 1] - labelPitch);
    if (got[0] < topBound - 0.5)
      throw new Error(
        `the end-label stack does not fit its rail: ${lines.length} labels need ` +
          `${((lines.length - 1) * labelPitch).toFixed(0)}px between baselines and the rail allows ` +
          `${(footBound - topBound).toFixed(0)}px. Draw fewer lines.`,
      );
    const out = new Array<number>(lines.length);
    order.forEach((o, k) => (out[o.i] = got[k]));
    return out;
  }
  const leftY = stack((d) => d.from);
  const rightY = stack((d) => d.to);
  const shifted = Math.max(
    ...lines.map((d, i) =>
      Math.max(Math.abs(leftY[i] - y(d.from)), Math.abs(rightY[i] - y(d.to))),
    ),
  );
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · ${(layout.bottom - layout.top).toFixed(0)}px for ${lines.length} lines, ` +
      `${layout.room.toFixed(1)}px each against ${labelPitch.toFixed(1)}px owed`,
  );
  /** A LABEL MAY BE PUSHED, BUT NOT UNTIL IT STOPS POINTING AT ITS OWN LINE. One label height is
   *  the whole allowance, and it is a hard floor rather than a warning.
   *
   *  THE DEFECT THIS EXISTS FOR. The first version drew all sixteen countries: the stack needed
   *  16 x 16.2px of a 277px frame, so it filled the plate and the clustered top of the 2024 rail
   *  pushed labels **89 pixels** from the ends they belong to. The plate rendered, nothing
   *  collided, and every leader lied. The corpus said so before the render did — ABC's panels carry
   *  two series each and Ferdio's slope carries four, because a form that must print every end
   *  cannot print very many. The no-axis rule caps the line count, and this is where that cap is
   *  enforced. */
  /** TWO LABEL HEIGHTS, because a pushed label is honest exactly as far as its leader reaches. The
   *  line itself is drawn out to the label rather than stopping at the rail, so a reader follows the
   *  stroke from the end point to the number; past about two heights the elbow is longer than the
   *  slope and the leader stops reading as part of the line. Below the allowance the plate draws;
   *  above it, it refuses. */
  const pushAllowance = labelPitch * 2;
  if (shifted > pushAllowance)
    throw new Error(
      `an end label sits ${shifted.toFixed(0)}px from its own line and the allowance is ` +
        `${pushAllowance.toFixed(0)}px. ${lines.length} lines need ${(lines.length * labelPitch).toFixed(0)}px ` +
        `of stack in ${(layout.bottom - layout.top).toFixed(0)}px of frame, so labels whose values ` +
        `cluster are pushed off their own ends. A slope prints every end value it draws — the only ` +
        `honest cut is to draw fewer lines.`,
    );
  onLadder?.(
    `end labels: ${lines.length * 2} placed, 0 dropped · largest push ${shifted.toFixed(1)}px ` +
      `of ${pushAllowance.toFixed(1)}px allowed`,
  );

  /** ONE COLOUR END TO END. The thread — the pair whose lines cross — takes the accent; every other
   *  line takes the furniture's own muted step. Never a hue per rail: the states are told apart by
   *  position, and a second hue here would be a second encoding in one channel. */
  const threadInk = accentInk;
  const restInk = mix(muted, direction.ground, 0.25);

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

      {/* THE RAILS: two plain rules, and no ticks anywhere. */}
      {[leftRail, rightRail].map((x, i) => (
        <line
          key={`rail-${i}`}
          x1={x}
          x2={x}
          y1={layout.top}
          y2={layout.bottom}
          stroke={grid}
          strokeWidth={direction.stroke.rule}
        />
      ))}

      {/* EACH RAIL HEADED BY WHAT IT IS — a chip where the marks begin and end, not an axis tick. */}
      {on("each-rail-is-headed-by-what-it-is") &&
        [
          { x: leftRail, text: rails.left, anchor: "end" as const, dx: -8 },
          { x: rightRail, text: rails.right, anchor: "start" as const, dx: 8 },
        ].map((head) => (
          <text
            key={head.text}
            x={head.x + head.dx}
            y={layout.top - axisBand.descent - 6}
            textAnchor={head.anchor}
            {...line(axis)}
            fill={mutedInk}
          >
            {set(head.text, axis)}
          </text>
        ))}

      {lines.map((d, i) => {
        const stroke = d.thread ? threadInk : restInk;
        const inkFor = d.thread ? threadInk : mutedInk;
        const y0 = y(d.from);
        const y1 = y(d.to);
        return (
          <g key={d.key}>
            {/* The line runs rail to rail; short leaders carry it to labels that were pushed. */}
            <path
              d={
                `M ${(leftRail - 6).toFixed(1)} ${leftY[i].toFixed(1)} ` +
                `L ${leftRail.toFixed(1)} ${y0.toFixed(1)} ` +
                `L ${rightRail.toFixed(1)} ${y1.toFixed(1)} ` +
                `L ${(rightRail + 6).toFixed(1)} ${rightY[i].toFixed(1)}`
              }
              fill="none"
              stroke={stroke}
              strokeWidth={
                d.thread
                  ? direction.stroke.series
                  : direction.stroke.series * 0.55
              }
              strokeLinejoin="round"
            />
            <circle
              cx={leftRail}
              cy={y0}
              r={d.thread ? 3.4 : 2.2}
              fill={stroke}
            />
            <circle
              cx={rightRail}
              cy={y1}
              r={d.thread ? 3.4 : 2.2}
              fill={stroke}
            />

            {/* THE NAME, then THE LEVEL — the value register. */}
            <text
              x={PAD + nameRoom - 10}
              y={leftY[i] + (annotBand.ascent - annotBand.descent) / 2}
              textAnchor="end"
              {...line(annot)}
              fill={inkFor}
              fontWeight={d.thread ? 700 : annot.fontWeight}
            >
              {set(d.label, annot)}
            </text>
            <text
              x={leftRail - 8}
              y={leftY[i] + (valueBand.ascent - valueBand.descent) / 2}
              textAnchor="end"
              {...line(value)}
              fill={inkFor}
              fontWeight={d.thread ? 700 : value.fontWeight}
            >
              {set(format(d.from), value)}
            </text>
            <text
              x={rightRail + 8}
              y={rightY[i] + (valueBand.ascent - valueBand.descent) / 2}
              {...line(value)}
              fill={inkFor}
              fontWeight={d.thread ? 700 : value.fontWeight}
            >
              {set(format(d.to), value)}
            </text>

            {/* THE DELTA, A THIRD FACT AT A THIRD WEIGHT — annot, not value, so a reader does not
                meet three facts as one column of numbers. */}
            {on("the-delta-is-its-own-register-beside-the-values") && (
              <text
                x={width - PAD}
                y={rightY[i] + (annotBand.ascent - annotBand.descent) / 2}
                textAnchor="end"
                {...line(annot)}
                fill={d.thread ? threadInk : mutedInk}
              >
                {set(formatDelta(d.delta), annot)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
