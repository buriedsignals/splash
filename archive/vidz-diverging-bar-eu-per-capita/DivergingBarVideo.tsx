/**
 * The video beat of "Croatia is the only EU country emitting more CO₂ per person than in 1990." —
 * 10 seconds, 30fps, 1080 × 1350 (portrait: twenty-seven rows need the height, and 1080 × 1080
 * would give each row 24px to hold a country name).
 *
 * First diverging bar in this corpus, in any format — a new row in the type × format matrix rather
 * than a video sibling of an existing beat. Twenty-seven rows of SIGNED values growing left and
 * right out of a zero line, so `divergingGeometry` below is its own shape: unlike the column beat's
 * scale it does not start at zero, it CONTAINS zero, and unlike the lollipop's it has to place a
 * mark on either side of it.
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `en` ARE this story's own copies of the other proof
 * workspaces' functions of the same name — not an import from any of them, per the duplicate-do-
 * not-link rule. They are the VIDEO format's browser-Canvas measurer, not the static format's resvg
 * one; the two are not interchangeable.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): the finding is a sign, not a size — which side of zero each
 * row lands on. So the zero line is laid down first as its own event and left to be read, and every
 * bar then grows OUT of it. A bar that faded in at final length would show its sign without ever
 * showing it being taken, which is the one thing motion can add to this type.
 *
 * THE TYPE'S OWN TRAP, honoured. `references/types/diverging-bar.md` records a failure from a
 * previous video build on this exact type: a value label gated on the LAST slice of its bar's own
 * growth "has previously left the last-staggered bars in a video build completely unlabelled at the
 * exact moment a viewer paused to read one." Here every label fades in over the first third of its
 * own bar's growth and then rides the growing end — and the number it prints is the length currently
 * drawn, `value × growth`, never the value it is heading for.
 *
 * COLOUR: the sheet asks for two fills, one per sign, and this is the one place where the type's
 * requirement outranks the corpus habit of holding accent back for the `subject` event. Colour here
 * encodes the SIGN, so the single positive bar is accent from the moment it arrives; the subject
 * event is carried by a wash, a ring and a bold label instead of by a recolour. Value labels stay in
 * page ink, signed explicitly — a label in the bar's own fill is the sheet's named WCAG failure for
 * the whole bar family.
 */

import { scaleLinear } from "d3-scale";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import {
  progressOf,
  type BeatTiming,
} from "#shared/chart-video/timing.ts";
import { DIVERGING_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1350 };
const PAD = 72;
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const TITLE = { fontSize: 38, fontWeight: 700, lead: 48 };
const SOURCE = { fontSize: 20, fontWeight: 400 };
const CAVEAT = { fontSize: 18, fontWeight: 400, lead: 24 };
const AXIS_TICK = { fontSize: 17, fontWeight: 500 };
const ROW_LABEL = { fontSize: 18, fontWeight: 500 };
const ROW_LABEL_ACCENT = { fontSize: 18, fontWeight: 700 };
const VALUE_LABEL = { fontSize: 17, fontWeight: 600 };
const CONCLUSION = { fontSize: 22, fontWeight: 600, lead: 28 };
const RING_R = 12;

export type Row = {
  country: string;
  /** Change in CO₂ emissions per person, tonnes. Negative is a fall. */
  change: number;
};

let measuringContext: CanvasRenderingContext2D | null | undefined;
export function measureText(
  text: string,
  { fontSize, fontWeight = 400 }: { fontSize: number; fontWeight?: number },
): number {
  if (!text) return 0;
  if (measuringContext === undefined)
    measuringContext =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  if (!measuringContext) return text.length * fontSize * 0.5;
  measuringContext.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`;
  return measuringContext.measureText(text).width;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

/**
 * English, signed EXPLICITLY — the sheet requires a + or a − on every value label, because on this
 * type the sign is the finding and a bare number leaves it to the bar's direction alone. The minus
 * is U+2212, not a hyphen.
 */
export function en(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}`;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React.
 *
 * The domain is the readings' own range, and it CONTAINS zero rather than starting there. It is not
 * made symmetric: forcing +20.5 onto the positive side to mirror a −20.5 fall would halve the pixels
 * per tonne on both sides to make room for nothing, and equal units per pixel either side of zero —
 * which is what makes two bars comparable — is the requirement that actually matters. The visible
 * asymmetry is the data's: twenty-six of twenty-seven rows fell.
 */
export function divergingGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const values = rows.map((r) => r.change);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const pad = (max - min) * 0.02;
  const x = scaleLinear()
    .domain([min - pad, max + pad])
    .range([plot.left, plot.right]);

  const rowHeight = (plot.bottom - plot.top) / rows.length;
  const points = rows.map((r, i) => ({
    ...r,
    y: plot.top + rowHeight * (i + 0.5),
    xValue: x(r.change),
  }));

  return {
    plot,
    rowHeight,
    points,
    zeroX: x(0),
    x,
    tickValues: x.ticks(6).filter((t) => t !== 0),
  };
}

/** How far through row `i`'s own growth window the master `reveal` progress is, 0..1. */
function rowWindow(i: number, rowCount: number) {
  const span = 1 / rowCount;
  const start = i * span;
  return { start, end: Math.min(1, start + span * 2.2) };
}

export type DivergingBarVideoProps = {
  /** Pre-sorted by change, descending — render.mjs's job, not this component's. */
  data: Row[];
  title: string;
  source: string;
  caveat: string;
  axisTitle: string;
  subjectCountry: string;
  /** The mean of the falls, tonnes per person. Computed in render.mjs. */
  averageFall: number;
  averageFallLabel: string;
  conclusion: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  timing?: BeatTiming;
};

export function DivergingBarVideo({
  data,
  title,
  source,
  caveat,
  axisTitle,
  subjectCountry,
  averageFall,
  averageFallLabel,
  conclusion,
  ground,
  accent,
  ink,
  muted,
  grid,
  timing = DIVERGING_TIMING,
}: DivergingBarVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  if (data.length < 3)
    throw new Error(`need at least three rows, got ${data.length}`);
  const straddles =
    data.some((r) => r.change > 0) && data.some((r) => r.change < 0);
  if (!straddles)
    throw new Error(
      `every value has the same sign — a diverging bar drawn on a domain that never crosses zero ` +
        `is a plain bar chart with a decorative complication, and the type sheet says so`,
    );
  const subjectIndex = data.findIndex((r) => r.country === subjectCountry);
  if (subjectIndex < 0)
    throw new Error(`no row for subject ${JSON.stringify(subjectCountry)}`);

  // ── Layout. Identical at every frame.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceLead = SOURCE.fontSize * 1.5;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — the LAST line lands on `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD - (sourceLines.length - 1) * sourceLead;
  const caveatLines = wrap(caveat, width - PAD * 2, CAVEAT);
  // The caveat keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const caveatBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 32;
  // Three stacked text blocks above the plot, each cleared of the one before it by a measured
  // amount rather than a guessed one: the first render put the axis title 12px under a two-line
  // caveat and the two overprinted.
  const axisTitleBaseline =
    caveatBaseline + (caveatLines.length - 1) * CAVEAT.lead + 38;
  const axisLabelBaseline = axisTitleBaseline + 30;

  // Both gutters are measured against the strings that will actually be drawn in them.
  const labelGutter =
    Math.max(
      ...data.map((r) =>
        Math.max(
          measureText(r.country, ROW_LABEL),
          measureText(r.country, ROW_LABEL_ACCENT),
        ),
      ),
    ) + 16;
  const valueGutter =
    Math.max(...data.map((r) => measureText(en(r.change), VALUE_LABEL))) + 14;

  const conclusionLines = wrap(conclusion, width - PAD * 2, CONCLUSION);
  const conclusionBlock = conclusionLines.length * CONCLUSION.lead;
  const conclusionGap = 30;

  const padding = {
    // 48px, not 22: the conclusion's own rule carries a label that sits just above the plot, and it
    // needs a band of its own between the tick row and the first data row.
    top: axisLabelBaseline + 48,
    // A positive bar grows right and its label sits to the right of it, so the right gutter has to
    // hold a value label; the widest is measured, not assumed.
    right: PAD + valueGutter + RING_R + 9,
    // Grown by the credit block's own height plus clear air, so the conclusion line ends above
    // the credit's ink.
    bottom:
      PAD +
      conclusionGap +
      conclusionBlock +
      (sourceLines.length - 1) * sourceLead +
      SOURCE.fontSize +
      10,
    left: PAD + labelGutter + valueGutter,
  };

  const g = divergingGeometry(data, { width, height, padding });
  const barHeight = Math.min(22, g.rowHeight * 0.66);
  const averageX = g.x(averageFall);

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusionProgress = progressOf(frame, timing.conclusion);

  // The title, source and caveat are on screen at FRAME ZERO, never faded in — frame 0 is the
  // poster frame, and `establish` starting at frame 0 makes anything gated on it invisible there.
  // Measured: every video beat in this corpus that fades its title has a blank frame 0.
  const axisOpacity = establish;

  const referenceY2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.top, g.plot.bottom],
    { easing: Easing.out(Easing.cubic) },
  );

  const growth = g.points.map((_, i) => {
    const w = rowWindow(i, g.points.length);
    return interpolate(reveal, [w.start, w.end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });
  const rowOpacity = growth.map((t) =>
    interpolate(t, [0, 0.06], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  // The label fades in over the FIRST third of its own bar's growth, then rides the end. The sheet
  // records the opposite gate — the last slice — as a shipped defect on this exact type.
  const labelOpacity = growth.map((t) =>
    interpolate(t, [0.05, 0.35], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const ringRadius = interpolate(subjectSpring, [0, 1], [0, RING_R]);
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.12]);
  const emphasis = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const averageRuleGrowth = interpolate(conclusionProgress, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const conclusionTextOpacity = interpolate(
    conclusionProgress,
    [0.4, 1],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const rowBaselineOffset = ROW_LABEL.fontSize * 0.34;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      <g>
        {titleLines.map((text, i) => (
          <text
            key={text}
            x={PAD}
            y={titleBaseline + i * TITLE.lead}
            fill={ink}
            fontSize={TITLE.fontSize}
            fontWeight={TITLE.fontWeight}
          >
            {text}
          </text>
        ))}
        {sourceLines.map((text, i) => (
          <text
            key={text}
            x={PAD}
            y={sourceBaseline + i * sourceLead}
            fill={muted}
            fontSize={SOURCE.fontSize}
          >
            {text}
          </text>
        ))}
        {caveatLines.map((text, i) => (
          <text
            key={text}
            x={PAD}
            y={caveatBaseline + i * CAVEAT.lead}
            fill={muted}
            fontSize={CAVEAT.fontSize}
          >
            {text}
          </text>
        ))}
      </g>

      <g opacity={axisOpacity}>
        <text
          x={PAD}
          y={axisTitleBaseline}
          fill={muted}
          fontSize={AXIS_TICK.fontSize}
          fontWeight={AXIS_TICK.fontWeight}
        >
          {axisTitle}
        </text>
        {g.tickValues.map((t) => (
          <g key={`tick-${t}`}>
            <line
              x1={g.x(t)}
              x2={g.x(t)}
              y1={g.plot.top}
              y2={g.plot.bottom}
              stroke={grid}
              strokeWidth={1}
            />
            <text
              x={g.x(t)}
              y={axisLabelBaseline}
              fill={muted}
              fontSize={AXIS_TICK.fontSize}
              fontWeight={AXIS_TICK.fontWeight}
              textAnchor="middle"
            >
              {en(t, 0)}
            </text>
          </g>
        ))}
      </g>

      {/* The subject's highlight band, behind its row. */}
      {highlightOpacity > 0 ? (
        <rect
          x={PAD / 2}
          y={g.points[subjectIndex].y - g.rowHeight / 2}
          width={width - PAD}
          height={g.rowHeight}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* The bars, growing out of zero. */}
      {g.points.map((p, i) => {
        const end = interpolate(growth[i], [0, 1], [g.zeroX, p.xValue], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const left = Math.min(g.zeroX, end);
        const fill = p.change >= 0 ? accent : muted;
        const labelX =
          p.change >= 0
            ? Math.max(end, g.zeroX) + 8
            : Math.min(end, g.zeroX) - 8;
        const isSubject = i === subjectIndex;
        return (
          <g key={p.country}>
            <rect
              x={left}
              y={p.y - barHeight / 2}
              width={Math.abs(end - g.zeroX)}
              height={barHeight}
              fill={fill}
              opacity={rowOpacity[i]}
            />
            <text
              // The country name sits in the LABEL gutter, which is to the left of the VALUE
              // gutter — not 12px off the plot edge, where the longest bar's own value label
              // already is. First render: "Luxembo—20.48".
              x={PAD + labelGutter}
              y={p.y + rowBaselineOffset}
              fill={ink}
              fontSize={ROW_LABEL.fontSize}
              fontWeight={
                isSubject && emphasis > 0.5
                  ? ROW_LABEL_ACCENT.fontWeight
                  : ROW_LABEL.fontWeight
              }
              textAnchor="end"
              opacity={rowOpacity[i]}
            >
              {p.country}
            </text>
          </g>
        );
      })}

      {/* The reference: the zero line, drawn ON TOP of the bars so no fill can cover it — the
          sheet's own requirement, and the reason this is not painted before the bars. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.zeroX}
            x2={g.zeroX}
            y1={g.plot.top}
            y2={referenceY2}
            stroke={ink}
            strokeWidth={2.5}
          />
          <text
            x={g.zeroX}
            y={axisLabelBaseline}
            fill={ink}
            fontSize={AXIS_TICK.fontSize}
            fontWeight={AXIS_TICK.fontWeight}
            textAnchor="middle"
            opacity={referenceProgress}
          >
            0
          </text>
        </g>
      ) : null}

      {/* The subject's ring, at the end of its own bar. */}
      {ringRadius > 0 ? (
        <circle
          cx={g.points[subjectIndex].xValue}
          cy={g.points[subjectIndex].y}
          r={ringRadius}
          fill="none"
          stroke={accent}
          strokeWidth={3}
          opacity={emphasis}
        />
      ) : null}

      {/* The conclusion's rule: where the falls average out. */}
      {averageRuleGrowth > 0 ? (
        <g opacity={averageRuleGrowth}>
          <line
            x1={averageX}
            x2={averageX}
            y1={g.plot.top}
            y2={interpolate(
              averageRuleGrowth,
              [0, 1],
              [g.plot.top, g.plot.bottom],
            )}
            stroke={ink}
            strokeWidth={2}
            strokeDasharray="9 6"
          />
          <text
            x={averageX}
            y={g.plot.top - 14}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="middle"
          >
            {averageFallLabel}
          </text>
        </g>
      ) : null}

      {/* Value labels, drawn AFTER the zero line and the average rule.
          The first render drew them inside the bar pass, which put the conclusion's dashed rule on
          top of them: at −4.93 it struck clean through "−3.94", "−4.01" and "−4.09" and turned the
          minus of "−3.39" into a plus. Order alone does not settle it either — each label also
          carries a ground-coloured halo (`paintOrder="stroke"`), so it stays readable where it
          crosses a gridline. */}
      {g.points.map((p, i) => {
        const end = interpolate(growth[i], [0, 1], [g.zeroX, p.xValue], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isSubject = i === subjectIndex;
        // The subject's bar end carries a ring, so its label starts outside the ring, not under it.
        const labelX =
          p.change >= 0
            ? Math.max(end, g.zeroX) + (isSubject ? RING_R + 16 : 8)
            : Math.min(end, g.zeroX) - (isSubject ? RING_R + 16 : 8);
        return (
          <text
            key={`value-${p.country}`}
            x={labelX}
            y={p.y + rowBaselineOffset}
            fill={ink}
            stroke={ground}
            strokeWidth={7}
            paintOrder="stroke"
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor={p.change >= 0 ? "start" : "end"}
            opacity={labelOpacity[i]}
          >
            {/* The length currently drawn, not the value it is heading for. */}
            {en(p.change * growth[i])}
          </text>
        );
      })}

      {conclusionTextOpacity > 0
        ? conclusionLines.map((text, i) => (
            <text
              key={text}
              x={PAD}
              y={g.plot.bottom + conclusionGap + i * CONCLUSION.lead}
              fill={ink}
              fontSize={CONCLUSION.fontSize}
              fontWeight={CONCLUSION.fontWeight}
              opacity={conclusionTextOpacity}
            >
              {text}
            </text>
          ))
        : null}
    </svg>
  );
}
