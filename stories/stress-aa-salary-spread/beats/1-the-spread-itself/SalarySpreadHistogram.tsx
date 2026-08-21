/**
 * Beat 1 — "Half this payroll earns less than 31 420 €" (histogram).
 *
 * Written fresh in `ChartSeed.tsx`'s shape, for a type whose bars are contiguous SLICES OF ONE
 * CONTINUUM rather than discrete categories (`references/types/histogram.md`): the bars touch
 * because the bins touch, and putting a gap back would claim categories that are not there. Bar
 * height is a COUNT, so the zero-baseline rule applies to the y-axis exactly as it does to any
 * member of the bar family; the x-axis is the variable itself, in euros, and starts at the round
 * number below the lowest salary.
 *
 * WHAT THIS BEAT DOES THAT THE CARBON HISTOGRAM DID NOT, and why it had to.
 * That beat took no accent at all, because its one annotation crossed a mid-grey bar and no hue
 * survived there. This newsroom's ground is DARK (#16191B) and its accent is a light gold
 * (#D4A853, 8.01:1). The bars can carry the accent — but then a full-height rule crosses two
 * backgrounds 8:1 apart and `inkThatReadsOver` refuses outright:
 *
 *   no ink reads at 3:1 over all of #16191B, #D4A853 — #000000 reaches only 1.19:1 against
 *   #16191B; #FFFFFF reaches only 2.20:1 against #D4A853. … move it onto one of them.
 *
 * So each rule is drawn as TWO segments and each segment is inked against the ONE background it
 * actually has: the part above the bar it crosses against the ground, the part inside that bar
 * against the accent. That is the refusal's own instruction, applied twice, rather than a rule
 * shipped at 2.2:1 because nothing measured it.
 */

import { scaleLinear } from "d3-scale";
import { tickStep } from "d3-array";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";
import { assertPlotAspect } from "#shared/chart-beat/type-at-size.mjs";
import {
  NON_TEXT_CONTRAST_FLOOR,
  inkBox,
  inkThatReadsOver,
  marksUnder,
  textContrastFloor,
} from "#shared/chart-beat/annotation-ink.mjs";

export const TYPE = "histogram";

export type Bin = { lo: number; hi: number; count: number };

/** The 900x560 tuning, kept as the base, with the size as the multiplier. Every spacing number
 *  goes through `sp`, not only the fonts — the probe measured eleven bare literals colliding a
 *  title into a subtitle at 1920x1080 when only the type was scaled. */
const BASE = {
  TITLE: { fontSize: 25, fontWeight: 700, lead: 32 },
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  AXIS_TITLE: { fontSize: 13, fontWeight: 600 },
  NOTE: { fontSize: 13, fontWeight: 700 },
  /** The two rules' weight and dash. Their INK is not here: it is derived from what each segment
   *  is actually drawn over. No `strokeDashoffset`, no `pathLength`, no `vector-effect` — a dash
   *  in a static frame is a pattern, never a measurement of its own path. */
  RULE: { width: 2, dash: "6 4" },
  RULE_LABEL_GAP: 8,
  TITLE_TO_SUBTITLE: 28,
  HEADER_TO_PLOT: 34,
  AXIS_TITLE_TO_SOURCE: 8,
  X_TICK_DROP: 20,
  X_LABEL_BAND: 30,
  Y_TICK_INSET: 10,
  Y_TICK_BASELINE_NUDGE: 4,
  PLOT_RIGHT_AIR: 8,
  RULE_LABEL_DROP: 18,
  TAIL_NOTE_LIFT: 30,
};

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SUBTITLE: f(BASE.SUBTITLE) as typeof BASE.SUBTITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    AXIS_TITLE: f(BASE.AXIS_TITLE) as typeof BASE.AXIS_TITLE,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    RULE: { ...BASE.RULE, width: sp(BASE.RULE.width) },
    RULE_LABEL_GAP: sp(BASE.RULE_LABEL_GAP),
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    AXIS_TITLE_TO_SOURCE: sp(BASE.AXIS_TITLE_TO_SOURCE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    RULE_LABEL_DROP: sp(BASE.RULE_LABEL_DROP),
    TAIL_NOTE_LIFT: sp(BASE.TAIL_NOTE_LIFT),
  };
}

const Y_TICK_HINT = 5;
/** The x grid is derived from the axis's own span with `tickStep`, at a fixed hint, exactly the
 *  way `.nice()` and `.ticks()` choose one internally — never hand-picked per story. */
const X_TICK_HINT = 10;

function yTickHintFor(size: string) {
  return sizeFor(size).minTypePx >= 36 ? 3 : Y_TICK_HINT;
}

function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/** Pure geometry: bins to bar rectangles, edge-to-edge on the variable's own real unit (never bin
 *  index), height a zero-anchored count. */
export function histogramGeometry(
  bins: Bin[],
  {
    width,
    height,
    padding,
    yTickHint = Y_TICK_HINT,
    xTickHint = X_TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    yTickHint?: number;
    xTickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const lo = bins[0].lo;
  const hi = bins[bins.length - 1].hi;
  const x = scaleLinear().domain([lo, hi]).range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain([0, Math.max(...bins.map((b) => b.count))])
    .nice()
    .range([plot.bottom, plot.top]);

  const bars = bins.map((b) => ({
    lo: b.lo,
    hi: b.hi,
    count: b.count,
    x: x(b.lo),
    width: x(b.hi) - x(b.lo),
    y: y(b.count),
    height: y(0) - y(b.count),
  }));

  const step = tickStep(lo, hi, xTickHint);
  const ticksX: { value: number; x: number }[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
    ticksX.push({ value: v, x: x(v) });
  }

  return {
    plot,
    bars,
    x,
    y,
    ticksX,
    ticksY: y.ticks(yTickHint).map((v) => ({ value: v, y: y(v) })),
  };
}

export function SalarySpreadHistogram({
  bins,
  title,
  limits,
  source,
  alt,
  ground,
  accent,
  rules,
  tailNote,
  tailFrom,
  axisTitle,
  countUnit,
  format,
  size,
}: {
  bins: Bin[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  /** The one accent, spent on the bars: the payroll is the subject, and it is one series. */
  accent: string;
  /** The two levels the argument turns on, each with the label a reader sees. */
  rules: { value: number; label: string }[];
  tailNote: string;
  /** The value the tail note names, so the note is anchored on the marks it is about rather than
   *  on a fraction of the plot's width. */
  tailFrom: number;
  axisTitle: string;
  /** The unit that rides the topmost count tick, once. */
  countUnit: string;
  /** How this beat writes a euro figure, in the story's own language. */
  format: (value: number) => string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (bins.length < 3)
    throw new Error(
      "a histogram beat needs at least three bins to show a shape, got " + bins.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);

  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, T.SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_SUBTITLE;
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  // The source's LAST line lands on the frame's bottom inner margin, the same edge the title hangs
  // off at the top, on the same x — `static-discipline.md`, "The source on the frame's bottom
  // margin". The block grows upward.
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * T.SUBTITLE.lead;
  const plotTop =
    limitsBaseline + (limitsLines.length - 1) * T.SUBTITLE.lead + T.HEADER_TO_PLOT;
  const axisTitleBaseline = sourceBaseline - T.SOURCE.fontSize - T.AXIS_TITLE_TO_SOURCE;

  const countTicks = scaleLinear()
    .domain([0, Math.max(...bins.map((b) => b.count))])
    .nice()
    .ticks(yTickHintFor(size));
  const tickLabels = countTicks.map((v, i, all) =>
    i === all.length - 1 ? `${v} ${countUnit}` : `${v}`,
  );

  const padding = {
    top: plotTop,
    right: PAD + T.PLOT_RIGHT_AIR,
    bottom: height - axisTitleBaseline + T.AXIS_TITLE.fontSize + T.X_LABEL_BAND,
    left: PAD + T.Y_TICK_INSET + Math.max(...tickLabels.map((l) => measureText(l, T.AXIS))),
  };

  const { plot, bars, x, ticksX, ticksY } = histogramGeometry(bins, {
    width,
    height,
    padding,
    yTickHint: yTickHintFor(size),
  });
  assertPlotAspect(plot, TYPE, size, { what: "beat 1 — the spread itself" });

  // Every bar carries the accent. `marksUnder` needs the fills, so the mark list is built once and
  // reused for the rules, the rule labels and the tail note.
  const barMarks = bars.map((b) => ({
    x: b.x,
    y: b.y,
    width: Math.max(b.width - 1, 0),
    height: b.height,
    fill: accent,
  }));

  // EACH RULE IS TWO SEGMENTS, EACH INKED AGAINST THE ONE BACKGROUND IT HAS. See this file's
  // header: on this newsroom's ground no single ink reads over both the page and the accent.
  const drawnRules = rules.map((rule) => {
    const at = x(rule.value);
    const box = { x: at - T.RULE.width / 2, y: plot.top, width: T.RULE.width, height: plot.bottom - plot.top };
    const crossed = marksUnder(box, barMarks);
    const barTop = crossed.length ? Math.min(...crossed.map((m) => m.y)) : plot.bottom;
    return {
      ...rule,
      x: at,
      overGround: { y1: plot.top, y2: barTop, ink: inkThatReadsOver([ground], NON_TEXT_CONTRAST_FLOOR) },
      overBars:
        barTop < plot.bottom
          ? { y1: barTop, y2: plot.bottom, ink: inkThatReadsOver([accent], NON_TEXT_CONTRAST_FLOOR) }
          : null,
    };
  });

  // The labels are a POSITION problem before they are a colour one: each is pushed right, past the
  // right edge of every bar it would otherwise sit on, until it stands on one background — then
  // inked against that. Derived from the bars' own geometry, so a different median moves it
  // without anyone retyping an offset.
  const placeNote = (text: string, anchorX: number, baseline: number) => {
    const band = measureTextBand(text, T.NOTE);
    const w = measureText(text, T.NOTE);
    const boxAt = (at: number) =>
      inkBox({ x: at, y: baseline, width: w, ascent: band.ascent, descent: band.descent });
    let at = anchorX;
    for (let pass = 0; pass <= bars.length; pass++) {
      const blocking = marksUnder(boxAt(at), barMarks);
      if (!blocking.length) break;
      at = Math.max(...blocking.map((m) => m.x + m.width)) + T.RULE_LABEL_GAP;
    }
    if (at + w > plot.right)
      throw new Error(
        `"${text}" is ${w.toFixed(1)}px wide and every position clear of the bars starts at ` +
          `x=${at.toFixed(1)}, past the plot's right edge at ${plot.right.toFixed(1)}. A shorter ` +
          `label, or a taller frame, or the label goes above the plot — but it does not get drawn ` +
          `where it cannot be read.`,
      );
    return {
      text,
      x: at,
      baseline,
      ink: inkThatReadsOver(
        [ground, ...marksUnder(boxAt(at), barMarks).map((m) => m.fill)],
        textContrastFloor(T.NOTE),
      ),
    };
  };

  // THE AXIS'S OWN FLOOR IS LABELLED ONLY WHERE IT FITS. `tickStep` chooses a round interval from
  // the span; the domain's lower edge is not one of those values, so it is drawn as an extra label
  // — and at this span the first derived tick sits one bin away from it. Two centred labels
  // overlapping is an axis a reader cannot read, so the floor label is measured against the first
  // tick and dropped when it would collide, rather than nudged into a gap that is not there.
  const floorText = format(bins[0].lo);
  const firstTick = ticksX[0];
  const floorLabel =
    firstTick &&
    plot.left + measureText(floorText, T.AXIS) / 2 + T.RULE_LABEL_GAP >
      firstTick.x - measureText(format(firstTick.value), T.AXIS) / 2
      ? null
      : floorText;

  const ruleLabels = drawnRules.map((rule, i) =>
    placeNote(rule.label, rule.x + T.RULE_LABEL_GAP, plot.top + T.RULE_LABEL_DROP + i * T.NOTE.fontSize * 1.6),
  );
  const tail = placeNote(tailNote, x(tailFrom), plot.bottom - T.TAIL_NOTE_LIFT);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text key={line} x={PAD} y={titleBaseline + i * T.TITLE.lead} fill={ink} fontSize={T.TITLE.fontSize} fontWeight={T.TITLE.fontWeight}>
          {line}
        </text>
      ))}
      {limitsLines.map((line, i) => (
        <text key={line} x={PAD} y={limitsBaseline + i * T.SUBTITLE.lead} fill={muted} fontSize={T.SUBTITLE.fontSize}>
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text key={line} x={PAD} y={sourceBaseline + i * T.SUBTITLE.lead} fill={muted} fontSize={T.SOURCE.fontSize}>
          {line}
        </text>
      ))}

      {ticksY.map((tick, i) => (
        <g key={tick.value}>
          <line x1={plot.left} x2={plot.right} y1={tick.y} y2={tick.y} stroke={tick.value === 0 ? muted : grid} strokeWidth={1} />
          <text x={plot.left - T.Y_TICK_INSET} y={tick.y + T.Y_TICK_BASELINE_NUDGE} fill={muted} fontSize={T.AXIS.fontSize} textAnchor="end">
            {tickLabels[i]}
          </text>
        </g>
      ))}

      {/* Bars sit edge-to-edge — the bins are contiguous slices of one continuous variable, not
          discrete things being ranked (`references/types/histogram.md`). */}
      {bars.map((b) => (
        <rect key={b.lo} x={b.x} y={b.y} width={Math.max(b.width - 1, 0)} height={b.height} fill={accent} />
      ))}

      {/* The x-axis labels name BOUNDARIES on the variable's own scale, at the round interval
          `tickStep` returns for this span — never a mark centred on a bin, which would offset the
          axis by half a bin and make every annotated value read wrong. */}
      {floorLabel ? (
        <text x={plot.left} y={plot.bottom + T.X_TICK_DROP} fill={muted} fontSize={T.AXIS.fontSize} textAnchor="middle">
          {floorLabel}
        </text>
      ) : null}
      {ticksX.map((tick) => (
        <text key={tick.value} x={tick.x} y={plot.bottom + T.X_TICK_DROP} fill={muted} fontSize={T.AXIS.fontSize} textAnchor="middle">
          {format(tick.value)}
        </text>
      ))}
      <text x={(plot.left + plot.right) / 2} y={axisTitleBaseline} fill={muted} fontSize={T.AXIS_TITLE.fontSize} fontWeight={T.AXIS_TITLE.fontWeight} textAnchor="middle">
        {axisTitle}
      </text>

      {drawnRules.map((rule) => (
        <g key={rule.value}>
          <line x1={rule.x} x2={rule.x} y1={rule.overGround.y1} y2={rule.overGround.y2} stroke={rule.overGround.ink} strokeWidth={T.RULE.width} strokeDasharray={T.RULE.dash} />
          {rule.overBars ? (
            <line x1={rule.x} x2={rule.x} y1={rule.overBars.y1} y2={rule.overBars.y2} stroke={rule.overBars.ink} strokeWidth={T.RULE.width} strokeDasharray={T.RULE.dash} />
          ) : null}
        </g>
      ))}
      {[...ruleLabels, tail].map((note) => (
        <text key={note.text} x={note.x} y={note.baseline} fill={note.ink} fontSize={T.NOTE.fontSize} fontWeight={T.NOTE.fontWeight}>
          {note.text}
        </text>
      ))}
    </svg>
  );
}
