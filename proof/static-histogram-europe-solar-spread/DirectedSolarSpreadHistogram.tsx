/**
 * How unevenly Europe's solar electricity generation was spread across countries in 2024, drawn
 * THROUGH the design base — geometry adapted from `proof/static-carbon-footprint-spread`, whose
 * bars are likewise intervals rather than entities.
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
import { MEASURED_ASPECT } from "#shared/chart-beat/type-at-size.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080, read from `BRIEF.md`. */
const FRAME = { width: 960, height: 540 };
/** The type this beat's own BRIEF.md declares, and the key `type-at-size.mjs` holds its measured
 *  aspect range under — 1.1:1 to 2.9:1, from `proof/portrait-aspect-probe`. */
const TYPE = "histogram";
/** The counts ladder, widest first. Five ticks are what a 540px-tall plate affords; a 140px one
 *  does not, and a tick that prints through its neighbour is not a tick. */
const Y_TICK_LADDER = [5, 4, 3, 2];

/**
 * How much of a bar is given up to separate it from its neighbour, as a FRACTION of the bar.
 * Two publications hold a hairline (2–4 % and 7–13 %), one holds a third of the bar at two sizes,
 * and the proposal's ceiling is about a tenth. Three per cent is inside both hairlines.
 */
const BIN_SEPARATION = 0.03;

export type Bin = { lo: number; hi: number; count: number; open?: boolean };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export function DirectedSolarSpreadHistogram({
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
  onLadder,
  frame,
}: {
  bins: Bin[];
  unit: string;
  threshold: number;
  thresholdCount: number;
  thresholdTotal: number;
  title: string[];
  limits: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  /** Every rung the ladder spends is a decision, so it is reported rather than taken quietly. */
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
  /** The block the arbiter granted is drawn from ITS OWN TOP, one lead a line. For a single run
   *  every anchor agrees with the old per-anchor baseline — `above` holds the bottom edge and the
   *  box is exactly one band tall — so landscape is untouched; for a wrapped block only the top
   *  edge is a fixed point at all. */

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

  /** THE FORM THE FRAME ASKS FOR, taken off the frame itself rather than passed in — the same three
   *  words `sizes.mjs` names. Everything conditioned on it leaves landscape exactly as it was
   *  accepted; 960 x 540 is what every number in this component was measured against. */
  const SIZE = width > height ? "landscape" : width === height ? "square" : "portrait";

  // ── header ────────────────────────────────────────────────────────────────
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const sourceLines = wrap(set(source, body), column, body);

  const eyebrowBaseline = PAD + eyebrowReg.fontSize;
  const titleTop =
    eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
  const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;

  /** A bin's name, from the treatment: both edges, and an inequality where the tail is open. */
  const nameOf = (b: Bin) => (b.open ? `${b.lo}+` : `${b.lo}–${b.hi}`);
  const labelled = on("bin-named-by-both-edges-and-an-open-top");

  const plotLeft =
    PAD + Math.max(...bins.map((b) => widthOf(String(b.count), axis))) + 26;
  const plotRight = width - PAD;
  const plotWidth = plotRight - plotLeft;

  const layoutFor = (titleIndex: number, limitIndex: number) => {
    const titleLines = wrap(set(title[titleIndex], display), column, display);
    const limitLines =
      limitIndex < 0 ? [] : wrap(set(limits[limitIndex], body), column, body);
    const titleBottom = titleTop + titleLines.length * titleLead;
    const limitsTop = titleBottom + gapOf(body, 0.4138);
    const top =
      (limitLines.length ? limitsTop + limitLines.length * bodyLead : titleBottom) +
      gapOf(annot, 1.8571);
    // Room for BOTH rows the axis register sets below the plot: the bin names at 1.7 lines and the
    // unit at 3.3. A first version reserved 2.2 and drew at 3.2, so the unit sat on the source line.
    const bottom = sourceTop - gapOf(body, 1.1034) - axis.fontSize * 4;
    return { titleLines, limitLines, limitsTop, top, bottom };
  };

  /**
   * THE REMOVAL LADDER, AND THEN THE MEASURED CLAMP — in that order, because they answer opposite
   * halves of one question.
   *
   * `type-at-size.mjs` gives `histogram` 1.1:1 to 2.9:1, and it is the type the probe took that
   * range FROM: its portrait arm went to 0.54:1 and a right-skewed distribution became one enormous
   * column beside nine slivers, with every assertion green. A distribution's argument is a shape.
   *
   * MEASURED at 1080x1080 with the copy this beat ships: the headline runs to five lines and the
   * standfirst to five more, and what is left for the plot is 25px of height against 390px of
   * width — 16:1. The five counts ticks then landed 5px apart and printed « 0 5 10 15 » through
   * each other, which is the refusal the square render actually fired. Nothing above the plot is
   * smaller than it should be; there is simply too much of it, and "make it smaller" is the rule
   * that fails at the moment it is needed. So the ladder REMOVES — the standfirst's shorter forms,
   * then the standfirst itself (R3 then R7), then the headline's (R1 is not available here: this
   * plate has no axis title) — until the plot clears the range's ceiling.
   *
   * The clamp is the other end: at 1080x1920 the frame offers more height than 1.1:1 allows, so the
   * plot keeps its width, caps its height, and the slack is split above and below — `proof/co2-suisse`
   * does the same for a line, and for the same reason.
   *
   * Landscape reads none of this. Its own plate is flatter than the range and was accepted that way,
   * and `formForSize` exempts it by name.
   */
  const rungs: Array<{ title: number; limit: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (let l = 0; l < limits.length; l++) rungs.push({ title: t, limit: l });
  for (let t = 0; t < title.length; t++) rungs.push({ title: t, limit: -1 });
  const tried = rungs.map((rung) => ({ rung, layout: layoutFor(rung.title, rung.limit) }));
  const range = MEASURED_ASPECT[TYPE];
  const flattest = SIZE === "landscape" ? 0 : plotWidth / range.max;
  const fits = tried.find(({ layout }) => layout.bottom - layout.top >= flattest);
  if (!fits) {
    const best = tried.reduce((a, b) =>
      b.layout.bottom - b.layout.top > a.layout.bottom - a.layout.top ? b : a,
    );
    const got = best.layout.bottom - best.layout.top;
    throw new Error(
      `the plot is too FLAT at ${SIZE} even with every rung of the ladder spent: ` +
        `${plotWidth.toFixed(0)} x ${got.toFixed(0)} is ${(plotWidth / got).toFixed(2)}:1, outside ` +
        `${TYPE}'s measured range ${range.min}:1 to ${range.max}:1 (${range.from}). The last rung ` +
        `is to ship the sizes that do work and say why.`,
    );
  }
  const layout = fits.layout;
  const { titleLines, limitLines, limitsTop } = layout;

  const naturalHeight = layout.bottom - layout.top;
  const heldHeight =
    SIZE === "landscape"
      ? naturalHeight
      : Math.min(naturalHeight, plotWidth / range.min);
  const slack = Math.max(0, naturalHeight - heldHeight);
  const plot = {
    left: plotLeft,
    right: plotRight,
    top: layout.top + slack / 2,
    bottom: layout.bottom - slack / 2,
  };
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ` +
      (fits.rung.limit < 0 ? "dropped" : `${fits.rung.limit + 1}`) +
      ` · plot ${plotWidth.toFixed(0)} x ${(plot.bottom - plot.top).toFixed(0)} = ` +
      `${(plotWidth / (plot.bottom - plot.top)).toFixed(2)}:1` +
      (SIZE === "landscape"
        ? " (landscape is exempt from the range — it is the frame this plate was accepted at)"
        : ` in ${range.min}–${range.max}`),
  );

  const most = Math.max(...bins.map((b) => b.count));
  /** THE COUNTS LADDER. Five ticks is a number tuned on a 180px-tall plot; on a 135px one the same
   *  five land inside each other's ink. The count steps down until consecutive gridlines are at
   *  least one axis band apart, and the band is the register's own, not the string's. */
  const axisBand = bandOf(axis);
  const tickGapOwed = axisBand.ascent + axisBand.descent + 2;
  const tickHint =
    Y_TICK_LADDER.find((n) => {
      const trial = scaleLinear().domain([0, most]).nice(n).range([plot.bottom, plot.top]);
      const values = trial.ticks(n);
      return values.every(
        (v, i) => i === 0 || trial(values[i - 1]) - trial(v) >= tickGapOwed,
      );
    }) ?? Y_TICK_LADDER[Y_TICK_LADDER.length - 1];
  const counts = scaleLinear()
    .domain([0, most])
    .nice(tickHint)
    .range([plot.bottom, plot.top]);
  const ticks = counts.ticks(tickHint);
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

  const shareText = `${thresholdCount} of ${thresholdTotal} countries under ${threshold} ${unit}`;
  /** THE ANNOTATION WRAPS WHERE THE PLOT IS NARROW. Measured at 1080x1080 and 1080x1920: this
   *  sentence is 300px of ink laid beside a threshold line on a 390px plot, so no anchor kept it
   *  inside the frame and the arbiter dropped it — « arbiter dropped 1: share ». It is the one
   *  sentence the beat's second treatment exists to state, so it is given lines instead of being
   *  lost. The arbiter arbitrates a BOX, so the box it is handed is the wrapped block's. */
  const annotLead = leadOf(annot);
  const shareLines =
    SIZE === "landscape"
      ? [set(shareText, annot)]
      : wrap(set(shareText, annot), plotWidth * 0.55, annot);
  const shareBlock = shareLines.join("\n");

  // ── the treatment layer, arbitrated ───────────────────────────────────────
  const requests = cut
    ? [
        {
          id: "share",
          treatment: "share-on-the-declared-side-of-a-threshold",
          text: shareBlock,
          at: { x: cut.x + 14, y: plot.top + annot.fontSize * 1.2 },
          priority: 8,
          register: annot,
        },
      ]
    : [];

  /** THE INK THE ARBITER CANNOT SEE. The bars it is given; the axis furniture it is not, and a
   *  label that clears every bar can still land squarely on a tick label or on a bin name. Each of
   *  these sits at a box this component already knows, so each belongs in `avoid` exactly like a
   *  mark — the same correction `proof/co2-suisse/DirectedLine.tsx` records for its y ticks. */
  const marks = [
    ...bars.map((b) => ({
      x: b.x,
      y: b.y,
      width: b.w,
      height: Math.max(b.h, 1),
    })),
    ...ticks.map((t) => {
      const text = set(String(t), axis);
      const w = widthOf(text, axis);
      return {
        x: plot.left - 10 - w,
        y: counts(t) + axis.fontSize * 0.35 - axisBand.ascent,
        width: w,
        height: axisBand.ascent + axisBand.descent,
      };
    }),
    ...(labelled
      ? bars.map((b) => {
          const text = set(nameOf(b), axis);
          const w = widthOf(text, axis);
          return {
            x: b.centre - w / 2,
            y: plot.bottom + axis.fontSize * 1.7 - axisBand.ascent,
            width: w,
            height: axisBand.ascent + axisBand.descent,
          };
        })
      : []),
    {
      x: plot.left,
      y: plot.bottom + axis.fontSize * 3.3 - axisBand.ascent,
      width: widthOf(set(unit, axis), axis),
      height: axisBand.ascent + axisBand.descent,
    },
  ];

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
        const lines = text.split("\n");
        const b = bandOf(request.register);
        return {
          width: Math.max(...lines.map((l) => widthOf(l, request.register))),
          height:
            b.ascent + b.descent + (lines.length - 1) * leadOf(request.register),
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
          {shareLines.map((l, i) => (
            <text
              key={`share-${i}`}
              x={byId.get("share")!.box.x}
              y={byId.get("share")!.box.y + bandOf(annot).ascent + i * annotLead}
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
              {l}
            </text>
          ))}
        </>
      )}

      <text
        x={plot.left}
        y={plot.bottom + axis.fontSize * 3.3}
        {...line(axis)}
        fill={muted}
      >
        {set(unit, axis)}
      </text>
    </svg>
  );
}
