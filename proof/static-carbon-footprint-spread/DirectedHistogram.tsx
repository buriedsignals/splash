/**
 * The 2023 spread of national CO₂ footprints, drawn THROUGH the design base.
 *
 * The fourth component in this tree to do that, after a line, a bridge and a mirrored pyramid. A
 * histogram is the first of the four whose bars are INTERVALS rather than entities, which is what
 * makes it a useful fourth: the register that carries an axis has to name a range, not a point.
 *
 * Its sibling `CarbonFootprintHistogram.tsx` declares its own typography. This file declares none.
 *
 * WHAT THE HARVEST DECIDED.
 *
 * `bin-named-by-both-edges-and-an-open-top` (two publications) — Figure.NZ writes
 * `$10,001-$20,000`, and the `,001` states which side of $10,000 a reader on exactly $10,000 falls;
 * PopulationPyramid.net writes `0-4` … `100+`. The continuous value axis this beat had —
 * `0 4 8 … 40` — is the axis of the VARIABLE, and a tick under a boundary tells a reader where the
 * boundary is without telling them which bar owns it.
 *
 * `share-on-the-declared-side-of-a-threshold` (derived) — the title asserts *six in ten countries
 * emit under 4 tonnes*, `BRIEF.md` states 127 of 213, and the plate drew a median at 3.1 and
 * neither the four-tonne line nor the sixty per cent. The threshold is the beat's editorial
 * judgement and is declared; the share is arithmetic over the same array the bins were counted from.
 *
 * AND THE SEPARATION BETWEEN BINS IS A RATIO, NOT A CONSTANT. Measured across the family: no
 * form-correct record draws its bins edge-to-edge, two publications hold a hairline and one holds a
 * third of the bar. A flat one-pixel shave is 0.6 % of a 155 px bar and leaves the bins
 * uncountable, which is the thing the hairline buys.
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
import { placeLabels } from "#shared/chart-beat/arbiter.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { MEASURED_ASPECT } from "#shared/chart-beat/type-at-size.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080, read from `BRIEF.md`. */
const FRAME = { width: 960, height: 540 };
const Y_TICK_HINT = 5;
/** The ticks this beat will step down through at a narrow frame — `REMOVAL_LADDER`'s R2, which is
 *  the one rung that gives slack back without removing anything vertical, so it is tried first. */
const Y_TICK_LADDER = [5, 4, 3];
const TYPE = "histogram";

/**
 * How much of a bar is given up to separate it from its neighbour, as a FRACTION of the bar.
 * Two publications hold a hairline (2–4 % and 7–13 %), one holds a third of the bar at two sizes,
 * and the proposal's ceiling is about a tenth. Three per cent is inside both hairlines.
 */
const BIN_SEPARATION = 0.03;

export type Bin = { lo: number; hi: number; count: number; open?: boolean };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export function DirectedHistogram({
  bins,
  unit,
  threshold,
  thresholdCount,
  thresholdTotal,
  title,
  limits,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  frame,
}: {
  bins: Bin[];
  unit: string;
  threshold: number;
  thresholdCount: number;
  thresholdTotal: number;
  title: string;
  limits: string;
  source: string;
  alt: string;
  eyebrow: string;
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

  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: {
    fontSize: number;
    fontWeight: number;
    fontFamily: string;
  }) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) +
    Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);

  /** RUNS ON ONE LINE SHARE A BASELINE, NOT AN INK-BOX EDGE — and the difference is visible.
   *
   *  MEASURED on this tree's own delivered SVGs: six country names under six groups came out on six
   *  different baselines, 1.5px apart at 960px, 3px in the delivered file. The cause is that
   *  `measureTextBand` answers per STRING — "Suède" carries an accent, "France" does not — so each
   *  label got a box of its own height, the arbiter aligned the boxes, and the baselines fell where
   *  they fell.
   *
   *  The COLLISION box stays the string's own ink, because inflating it to a common band costs real
   *  labels: doing that dropped this corpus's end-value label in all three directions. What changes
   *  is where the run is DRAWN inside the box the arbiter granted it — against the band of its
   *  REGISTER, measured once on a probe carrying an ascender, a descender and a comma, from
   *  whichever edge the chosen anchor holds fixed. Runs sharing an anchor and a y then share a
   *  baseline, whatever glyphs they happen to carry. */
  const BAND_PROBE = "Hxpg1,";
  const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));
  const baselineOf = (p: any, r: any) => {
    const band = bandOf(r);
    // `above` holds the box's bottom edge, `below` its top, and the side anchors centre it.
    if (p.anchor === "above") return p.box.y + p.box.height - band.descent;
    if (p.anchor === "below") return p.box.y + band.ascent;
    return p.box.y + p.box.height / 2 + (band.ascent - band.descent) / 2;
  };

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

  /** THE FORM THIS FRAME ASKS FOR, taken off the frame itself rather than passed in — the same
   *  three rows `sizes.mjs` files, recognised by shape. LANDSCAPE IS UNTOUCHED BY EVERYTHING BELOW:
   *  every rung this component now walks is gated on a frame that is not wider than it is tall, so
   *  the three accepted 1920x1080 renders come out byte-identical. */
  const SIZE =
    width > height ? "landscape" : width === height ? "square" : "portrait";
  const NARROW = SIZE !== "landscape";

  // ── header ────────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLines = wrap(set(title, display), column, display);
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const limitsTop =
    titleTop + titleLines.length * titleLead + gapOf(body, 0.4138);
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  /** A bin's name, from the treatment: both edges, and an inequality where the tail is open. */
  const nameOf = (b: Bin) => (b.open ? `${b.lo}+` : `${b.lo}–${b.hi}`);
  const labelled = on("bin-named-by-both-edges-and-an-open-top");

  const plotLeft =
    PAD + Math.max(...bins.map((b) => widthOf(String(b.count), axis))) + 26;
  const plotRight = width - PAD;
  const plotWidth = plotRight - plotLeft;
  const topFor = (lines: number) =>
    limitsTop + lines * bodyLead + gapOf(annot, 1.8571);
  // Room for BOTH rows the axis register sets below the plot: the bin names at 1.7 lines and the
  // unit at 3.3. A first version reserved 2.2 and drew at 3.2, so the unit sat on the source line.
  const BOTH_ROWS = axis.fontSize * 4;
  /** The bin names alone, with room for their descenders — what the foot costs once R1 has taken
   *  the unit away. */
  const NAMES_ROW = axis.fontSize * 2.2;
  const bottomWith = (unitRow: boolean) =>
    sourceTop - gapOf(body, 1.1034) - (unitRow ? BOTH_ROWS : NAMES_ROW);

  /** THE MEASURED CEILING, AND IT IS WHAT DECIDES WHETHER ANY RUNG FIRES AT ALL.
   *  `MEASURED_ASPECT.histogram` is 1.1:1 to 2.9:1 — a distribution's argument is a SHAPE, and the
   *  probe that produced those numbers showed that no counter in this project can see a plot
   *  squashed out of it. At 1080x1080 this beat's plot came out 385 x 74, which is 5.2:1: a row of
   *  ten slivers under a four-line headline. */
  const CEILING = MEASURED_ASPECT[TYPE]?.max;
  const tooFlat = (top: number, bottom: number) =>
    !!CEILING && (bottom <= top || plotWidth / (bottom - top) > CEILING);

  /** R3, SPENT ONLY WHILE THE PLOT IS STILL TOO FLAT: the standfirst gives up its LAST SENTENCE,
   *  repeatedly, down to one.
   *
   *  At 960px the standfirst sets in two lines. At 540 the same words take three — the column is
   *  44 % narrower and nothing else changed — and the third line comes straight out of the plot,
   *  which at square had 74px of height to give. The sentence it drops is the one the title already
   *  implies (the far right of the distribution); what stays is the sentence that says what the
   *  bars ARE.
   *
   *  The condition is what keeps it from firing where it is not needed: a TALL frame has height to
   *  spare, and a rung that fires there takes a sentence away and buys the reader nothing. */
  const sentencesOf = (text: string) => text.split(/(?<=[.!?])\s+/);
  const limitsAtSize = (() => {
    if (!NARROW) return limits;
    let kept = sentencesOf(limits);
    while (kept.length > 1) {
      const lines = wrap(set(kept.join(" "), body), column, body).length;
      if (!tooFlat(topFor(lines), bottomWith(true))) break;
      kept = kept.slice(0, -1);
    }
    return kept.join(" ");
  })();
  const limitLines = wrap(set(limitsAtSize, body), column, body);
  const plotTop = topFor(limitLines.length);
  /** R1: THE AXIS TITLE, AND IT IS SPENT ONLY WHEN THE PLOT CANNOT AFFORD IT.
   *
   *  The unit line under the bin names is the cheapest thing below the plot that carries no bar,
   *  and the headline already names the unit while the callout repeats it in its own sentence — so
   *  the rung loses the unit's prominence and nothing else. It fires only when keeping it leaves
   *  the plot flatter than the measured ceiling, so landscape and portrait — both of which can
   *  afford it — keep it. */
  const unitRow = !NARROW || !tooFlat(plotTop, bottomWith(true));
  const naturalBottom = bottomWith(unitRow);

  /** THE MEASURED CLAMP, the other end of the same range — worked in
   *  `proof/co2-suisse/DirectedLine.tsx`. A tall frame offers more height than a histogram's own
   *  accepted renders ever had: at 1080x1920 the plot would run 385 x 494, which is 0.78:1, and ten
   *  bins become ten towers. The plot keeps its width, caps its height at the floor of its measured
   *  range, and the slack is split above and below so the drawing sits where a reader expects it
   *  rather than hanging off the standfirst. At landscape and at square the natural height is
   *  already inside the range, so the slack is zero and nothing moves. */
  const FLOOR_ASPECT = MEASURED_ASPECT[TYPE]?.min;
  const naturalHeight = naturalBottom - plotTop;
  const heldHeight = FLOOR_ASPECT
    ? Math.min(naturalHeight, plotWidth / FLOOR_ASPECT)
    : naturalHeight;
  const slack = Math.max(0, naturalHeight - heldHeight);

  const plot = {
    left: plotLeft,
    right: plotRight,
    top: plotTop + slack / 2,
    bottom: naturalBottom - slack / 2,
  };

  const most = Math.max(...bins.map((b) => b.count));
  /** R2: THE VALUE-AXIS TICK COUNT, STEPPED DOWN UNTIL TWO NEIGHBOURS CLEAR.
   *
   *  Five is the hint this beat was tuned at, and at 960 x 540 it yields eight gridlines 24.3px
   *  apart under a 9.6px ink band. At 540 x 540 the same eight land 9.3px apart — closer than the
   *  band is tall, so 140, 120 and 100 print through each other while every assertion stays green.
   *  The rung is walked against the plot the beat actually ends up with, and it REFUSES rather than
   *  printing through: a ladder whose last rung still collides is a ladder that is too short. */
  const digitBand = measureTextBand("0123456789", sizeOf(axis));
  const tickInk = digitBand.ascent + digitBand.descent;
  const scaleAt = (hint: number) =>
    scaleLinear().domain([0, most]).nice(hint).range([plot.bottom, plot.top]);
  const clearance = (scale: any, values: number[]) =>
    values.length < 2
      ? Infinity
      : Math.min(
          ...values.slice(1).map((v, i) => Math.abs(scale(v) - scale(values[i]))),
        );
  const rungs = NARROW ? Y_TICK_LADDER : [Y_TICK_HINT];
  let counts = scaleAt(rungs[0]);
  let ticks = counts.ticks(rungs[0]);
  for (const hint of rungs) {
    counts = scaleAt(hint);
    ticks = counts.ticks(hint);
    if (clearance(counts, ticks) >= tickInk + 2) break;
  }
  if (clearance(counts, ticks) < tickInk + 2)
    throw new Error(
      `the value axis cannot be read at ${width} x ${height}: even ${ticks.length} tick labels ` +
        `land ${clearance(counts, ticks).toFixed(1)}px apart on a ${tickInk.toFixed(1)}px ink ` +
        `band, so they would be printed through each other. The plot is ` +
        `${plotWidth.toFixed(0)} x ${(plot.bottom - plot.top).toFixed(0)}px — run the removal ` +
        `ladder above it rather than lowering the type floor.`,
    );
  const band = (plot.right - plot.left) / bins.length;

  const bars = bins.map((b, i) => {
    const x = plot.left + band * i;
    const w = band - Math.max(1, band * BIN_SEPARATION);
    return {
      ...b,
      x,
      w,
      centre: x + w / 2,
      y: counts(b.count),
      h: plot.bottom - counts(b.count),
    };
  });

  /** Where the declared threshold falls on the bin axis: the boundary between the bins it splits. */
  const cut = on("share-on-the-declared-side-of-a-threshold")
    ? (() => {
        const at = bins.findIndex((b) => threshold <= b.hi);
        if (at < 0) return null;
        const b = bins[at];
        const within = (threshold - b.lo) / (b.hi - b.lo);
        return { x: plot.left + band * at + band * within };
      })()
    : null;

  /** THE CALLOUT IS A LADDER, longest form first, and the first that fits the room to the right of
   *  the threshold is the one drawn.
   *
   *  It used to be one fixed string, and at 1080x1080 the arbiter could not place it at any anchor:
   *  it printed `arbiter dropped 1: share`, exited 0, and the render lost BOTH the sentence and the
   *  rule — because the rule is drawn only when its label was placed. The beat's whole claim is
   *  `share-on-the-declared-side-of-a-threshold`; a size that silently drops it is not a smaller
   *  version of this beat. The forms give up the year first, then the denominator's unit, then the
   *  word `pays`; what no form gives up is the count, the total and the threshold. */
  const unitHead = unit.split(",")[0];
  const unitWord = unit.split(/[\s,]/)[0];
  const shareForms = [
    `${thresholdCount} pays sur ${thresholdTotal} sous ${threshold} ${unit}`,
    `${thresholdCount} pays sur ${thresholdTotal} sous ${threshold} ${unitHead}`,
    `${thresholdCount} pays sur ${thresholdTotal} sous ${threshold} ${unitWord}`,
    `${thresholdCount} sur ${thresholdTotal} sous ${threshold} ${unitWord}`,
  ];
  /** THE ROOM IS THE ROOM THE ARBITER WILL ACTUALLY HAVE, and that is eight pixels less than the
   *  distance to the frame edge: `arbiter.mjs` sets every label a `GAP` of 8 away from the point it
   *  names before it tests the frame. Measuring without it picked a form 346px wide for a 348px
   *  gap, the arbiter built a box at 8px further right, no anchor fitted, and the label — and with
   *  it the threshold rule, which is drawn only when its label was placed — was dropped. */
  const ARBITER_GAP = 8;
  const shareRoom = cut ? width - PAD - (cut.x + 14) - ARBITER_GAP : 0;
  const shareText =
    shareForms.find((f) => widthOf(set(f, annot), annot) <= shareRoom) ??
    shareForms[shareForms.length - 1];

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  const requests = cut
    ? [
        {
          id: "share",
          treatment: "share-on-the-declared-side-of-a-threshold",
          text: set(shareText, annot),
          at: { x: cut.x + 14, y: plot.top + annot.fontSize * 1.2 },
          priority: 8,
          register: annot,
        },
      ]
    : [];

  const marks = bars.map((b) => ({
    x: b.x,
    y: b.y,
    width: b.w,
    height: Math.max(b.h, 1),
  }));

  const { placed, dropped } = placeLabels(
    requests.map(({ id, treatment, text, at, anchors, priority }) => ({
      id,
      treatment,
      text,
      at,
      anchors,
      priority,
    })),
    {
      frame: {
        left: plot.left,
        top: plot.top - annot.fontSize,
        right: width - PAD,
        bottom: plot.bottom,
      },
      measure: (text: string) => {
        const request = requests.find((r) => r.text === text)!;
        const b = measureTextBand(text, sizeOf(request.register));
        return {
          width: widthOf(text, request.register),
          height: b.ascent + b.descent,
        };
      },
      avoid: marks,
    },
  );
  if (dropped.length)
    console.log(
      `  arbiter dropped ${dropped.length}: ` +
        dropped.map((d) => `${d.id} (${d.why})`).join("; "),
    );
  const byId = new Map(placed.map((p) => [p.id, p]));

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });

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
        <text
          key={l + i}
          x={PAD}
          y={titleTop + i * titleLead}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
      {sourceLines.map((l, i) => (
        <text key={l + i} x={PAD} y={sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={counts(t)}
            y2={counts(t)}
            stroke={t === 0 ? muted : grid}
            strokeWidth={direction.stroke.rule}
          />
          <text
            x={plot.left - 10}
            y={counts(t) + axis.fontSize * 0.35}
            textAnchor="end"
            {...line(axis)}
          >
            {set(String(t), axis)}
          </text>
        </g>
      ))}

      {bars.map((b) => (
        <rect
          key={b.lo}
          x={b.x}
          y={b.y}
          width={b.w}
          height={Math.max(b.h, 0)}
          fill={muted}
        />
      ))}

      {/* THE BIN NAMES THEMSELVES. Both edges, and the open tail as an inequality — never a
          continuous value axis, which is the axis of the variable rather than of the bars. */}
      {labelled &&
        bars.map((b) => (
          <text
            key={`name-${b.lo}`}
            x={b.centre}
            y={plot.bottom + axis.fontSize * 1.7}
            textAnchor="middle"
            {...line(axis)}
          >
            {set(nameOf(b), axis)}
          </text>
        ))}

      {/* THE DECLARED THRESHOLD, AND THE SHARE ON THE SIDE THE BEAT IS ABOUT. */}
      {cut && byId.get("share") && (
        <>
          <line
            x1={cut.x}
            x2={cut.x}
            y1={plot.top - annot.fontSize * 0.4}
            y2={plot.bottom}
            stroke={adjustToContrast(
              direction.accent,
              direction.ground,
              TEXT_CONTRAST_MIN,
            )}
            strokeWidth={direction.stroke.series}
          />
          <text
            x={byId.get("share")!.box.x}
            y={baselineOf(byId.get("share")!, annot)}
            fill={adjustToContrast(
              direction.accent,
              direction.ground,
              TEXT_CONTRAST_MIN,
            )}
            fontFamily={annot.fontFamily}
            fontSize={annot.fontSize}
            fontWeight={annot.fontWeight}
            fontStyle={annot.fontStyle}
            letterSpacing={annot.letterSpacing}
          >
            {byId.get("share")!.text}
          </text>
        </>
      )}

      {/* THE AXIS TITLE — drawn only when the plot could afford it. R1 is the rung that takes it
          away, and a rung that stops reserving the room while the run is still drawn puts the unit
          straight through the source line: measured at 1080x1080, `tonnes de CO₂ par personne,
          2023` and `Source : Global Carbon Budget` shared a line. */}
      {unitRow && (
        <text
          x={plot.left}
          y={plot.bottom + axis.fontSize * 3.3}
          {...line(axis)}
          fill={muted}
        >
          {set(unit, axis)}
        </text>
      )}
    </svg>
  );
}
