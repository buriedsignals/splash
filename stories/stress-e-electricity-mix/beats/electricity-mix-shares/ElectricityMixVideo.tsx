/**
 * The video beat of "Hydro and nuclear supply seven in ten units of the country's electricity; the
 * six reported shares fall short of the whole." — 8 seconds, 30fps, 1080 × 1080.
 *
 * THE TRAP THIS BEAT ANSWERS (see `BRIEF.md`, "The trap, and the decision"): the article claims six
 * shares "make up the whole of national supply." They sum to 95.2, not 100, and one of them
 * (Imports, -4.1) is genuinely negative. A pie or a 100%-stacked bar bakes totality into its own
 * geometry — wedge angle or stack height is `share / total` by construction — so either type would
 * have silently rescaled all six shares upward to close a gap the source data never closed, and
 * neither type can even place a negative wedge. This beat draws a DIVERGING BAR instead: six
 * independent rows, each bar's length exactly its own reported share, signed, growing out of a zero
 * line. Nothing about the geometry claims the six sum to anything — which is exactly the claim this
 * data cannot support.
 *
 * Adapted from `proof/vidz-diverging-bar-eu-per-capita/DivergingBarVideo.tsx` — the same type, the
 * same six-event shape, six rows instead of twenty-seven. `FONT_FAMILY`, `measureText`, `wrap` and
 * `en` are this story's own copies (duplicate, do not link — nothing under a story imports another
 * story's or a skill's own files).
 *
 * COLOUR: as in that sibling, colour here encodes the SIGN, not the source. Every positive share
 * (five of the six) draws in the recorded accent; Imports, the one negative share, draws in the
 * furniture's own muted. The `subject` event singles out Imports with a wash, a ring and a bold
 * label — never a recolour, because the accent is already spent marking every positive bar.
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
import { progressOf, type BeatTiming } from "#shared/chart-video/timing.ts";
import { ELECTRICITY_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const TITLE = { fontSize: 36, fontWeight: 700, lead: 46 };
const SOURCE = { fontSize: 19, fontWeight: 400 };
const CAVEAT = { fontSize: 18, fontWeight: 400, lead: 24 };
const AXIS_TICK = { fontSize: 17, fontWeight: 500 };
const ROW_LABEL = { fontSize: 20, fontWeight: 500 };
const ROW_LABEL_ACCENT = { fontSize: 20, fontWeight: 700 };
const VALUE_LABEL = { fontSize: 18, fontWeight: 600 };
const CONCLUSION = { fontSize: 22, fontWeight: 600, lead: 28 };
const RING_R = 12;

export type Row = {
  source: string;
  /** Reported share of national electricity supply, percent. Negative means net-exported. */
  share: number;
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

/** A share, signed with U+2212 (not a hyphen) when negative, plain when positive or zero — this is
 *  a share of supply, not a change, so a positive share does not carry a "+". */
export function en(value: number, decimals = 1): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React.
 *
 * The domain contains zero rather than starting there, and is NOT made symmetric: mirroring a
 * -4.1 fall with a +4.1 half nobody occupies would waste pixels making room for nothing. Equal
 * units per pixel either side of zero is what makes the six bars comparable, and the visible
 * asymmetry (five bars reaching far right, one reaching a little left) is the data's own shape.
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
  const values = rows.map((r) => r.share);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const pad = (max - min) * 0.04;
  const x = scaleLinear()
    .domain([min - pad, max + pad])
    .range([plot.left, plot.right]);

  const rowHeight = (plot.bottom - plot.top) / rows.length;
  const points = rows.map((r, i) => ({
    ...r,
    y: plot.top + rowHeight * (i + 0.5),
    xValue: x(r.share),
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

export type ElectricityMixVideoProps = {
  /** Pre-sorted by share, descending — render.mjs's job, not this component's. */
  data: Row[];
  title: string;
  source: string;
  caveat: string;
  axisTitle: string;
  subjectSource: string;
  conclusion: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  timing?: BeatTiming;
};

export function ElectricityMixVideo({
  data,
  title,
  source,
  caveat,
  axisTitle,
  subjectSource,
  conclusion,
  ground,
  accent,
  ink,
  muted,
  grid,
  timing = ELECTRICITY_TIMING,
}: ElectricityMixVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  if (data.length < 3)
    throw new Error(`need at least three rows, got ${data.length}`);
  const straddles =
    data.some((r) => r.share > 0) && data.some((r) => r.share < 0);
  if (!straddles)
    throw new Error(
      `every share has the same sign — a diverging bar drawn on a domain that never crosses ` +
        `zero is a plain bar chart with a decorative complication, and the type sheet says so`,
    );
  const subjectIndex = data.findIndex((r) => r.source === subjectSource);
  if (subjectIndex < 0)
    throw new Error(`no row for subject ${JSON.stringify(subjectSource)}`);

  // ── Layout. Identical at every frame.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceLead = SOURCE.fontSize * 1.5;
  const sourceBaseline = height - PAD - (sourceLines.length - 1) * sourceLead;
  const caveatLines = wrap(caveat, width - PAD * 2, CAVEAT);
  const caveatBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 32;
  const axisTitleBaseline =
    caveatBaseline + (caveatLines.length - 1) * CAVEAT.lead + 38;
  const axisLabelBaseline = axisTitleBaseline + 30;

  const labelGutter =
    Math.max(
      ...data.map((r) =>
        Math.max(
          measureText(r.source, ROW_LABEL),
          measureText(r.source, ROW_LABEL_ACCENT),
        ),
      ),
    ) + 16;
  const valueGutter =
    Math.max(...data.map((r) => measureText(en(r.share), VALUE_LABEL))) + 14;

  const conclusionLines = wrap(conclusion, width - PAD * 2, CONCLUSION);
  const conclusionBlock = conclusionLines.length * CONCLUSION.lead;
  const conclusionGap = 30;

  const padding = {
    top: axisLabelBaseline + 48,
    right: PAD + valueGutter + RING_R + 9,
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
  const barHeight = Math.min(38, g.rowHeight * 0.6);

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusionProgress = progressOf(frame, timing.conclusion);

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
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.14]);
  const emphasis = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const conclusionTextOpacity = interpolate(
    conclusionProgress,
    [0.2, 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
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

      {/* The bars, growing out of zero. Colour encodes SIGN: accent for every positive share,
          furniture muted for the one negative share (Imports). */}
      {g.points.map((p, i) => {
        const end = interpolate(growth[i], [0, 1], [g.zeroX, p.xValue], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const left = Math.min(g.zeroX, end);
        const fill = p.share >= 0 ? accent : muted;
        const isSubject = i === subjectIndex;
        return (
          <g key={p.source}>
            <rect
              x={left}
              y={p.y - barHeight / 2}
              width={Math.abs(end - g.zeroX)}
              height={barHeight}
              fill={fill}
              opacity={rowOpacity[i]}
            />
            <text
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
              {p.source}
            </text>
          </g>
        );
      })}

      {/* The reference: the zero line, drawn ON TOP of the bars so no fill can cover it. */}
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

      {/* Value labels, drawn AFTER the zero line so nothing can strike through them; each carries
          a ground-coloured halo so it stays readable wherever it crosses a gridline. */}
      {g.points.map((p, i) => {
        const end = interpolate(growth[i], [0, 1], [g.zeroX, p.xValue], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const isSubject = i === subjectIndex;
        const labelX =
          p.share >= 0
            ? Math.max(end, g.zeroX) + (isSubject ? RING_R + 16 : 8)
            : Math.min(end, g.zeroX) - (isSubject ? RING_R + 16 : 8);
        return (
          <text
            key={`value-${p.source}`}
            x={labelX}
            y={p.y + rowBaselineOffset}
            fill={ink}
            stroke={ground}
            strokeWidth={7}
            paintOrder="stroke"
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor={p.share >= 0 ? "start" : "end"}
            opacity={labelOpacity[i]}
          >
            {/* The length currently drawn, not the value it is heading for. */}
            {en(p.share * growth[i])}
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
