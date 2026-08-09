/**
 * The video beat of "Rwanda cut its child mortality rate by three-quarters since 1990" — 8.6
 * seconds, 30fps, 1080 × 1080.
 *
 * TYPE: slope (slopegraph). Its own pure geometry below (`slopeGeometry`, `deconflictLabels`) —
 * not imported from anywhere, because this story lives outside `twin-chart-video`'s skill
 * boundary (`proof/vidx-slope-child-mortality/`); the settled rule for a story that needs
 * something a skill has is to duplicate it, never reach back across the boundary. `FONT_FAMILY`,
 * `measureText`, `wrap` are this story's own copies of `EmissionsVideo.tsx`'s functions of the
 * same name.
 *
 * THE MOTION PROBLEM (`BRIEF.md`): six two-point lines, each with no shared start (unlike the
 * dumbbell's shared index-100) — `countryWindow` gives each its own overlapping slice of `reveal`
 * (the technique proven by `DumbbellVideo.tsx`'s `rowWindow`), cascading sorted by 1990 value,
 * descending. Niger and Nigeria land 0.33 points apart at the 2023 end — `deconflictLabels`
 * spreads their labels vertically rather than letting them collide, per `slope.md`'s own named
 * trap. Rwanda's extra emphasis is a separate event that cannot start before every line has
 * finished drawing.
 *
 * The furniture colours (ink, muted, grid) are NOT derived here — `deriveFurniture` lives in node
 * (this skill's own copy of `render-still.mjs`), passed in as props.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import {
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { SLOPE_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const TITLE = { fontSize: 40, fontWeight: 700, lead: 52 };
const SOURCE = { fontSize: 21, fontWeight: 400, lead: 27 };
const AXIS = { fontSize: 22, fontWeight: 400 };
const CATEGORY = { fontSize: 23, fontWeight: 600 };
const CAPTION = { fontSize: 24, fontWeight: 700 };
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const LABEL_MIN_GAP = 26; // px — the collision floor for the side-gutter category labels.

export type CountryRow = { country: string; v1990: number; v2023: number };

export function fmt(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/** Greedy top-to-bottom spread: sorted ascending, each label pushed no closer than `minGap` to
 *  the one above it. Never reorders — reordering would misstate the ranking the chart is showing.
 *  `slope.md`'s own trap: "spread apart just enough to stop overlapping," never truncate a name. */
export function deconflictLabels(
  items: { key: string; y: number }[],
  minGap: number,
): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const adjusted: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    adjusted.push(
      i === 0 ? sorted[i].y : Math.max(sorted[i].y, adjusted[i - 1] + minGap),
    );
  }
  const map = new Map<string, number>();
  sorted.forEach((item, i) => map.set(item.key, adjusted[i]));
  return map;
}

export function slopeGeometry(
  data: CountryRow[],
  {
    width,
    height,
    padding,
    reference,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  // Position-encoded, not forced to zero (`slope.md`) — fitted to the six countries' own extent
  // plus the reference, so the SDG target is always inside the frame.
  const y = scaleLinear()
    .domain(
      extent([
        ...data.map((d) => d.v1990),
        ...data.map((d) => d.v2023),
        reference,
      ]) as [number, number],
    )
    .nice()
    .range([plot.bottom, plot.top]);

  const lines = data.map((d) => ({
    country: d.country,
    v1990: d.v1990,
    v2023: d.v2023,
    y1990: y(d.v1990),
    y2023: y(d.v2023),
  }));

  const left1990 = deconflictLabels(
    lines.map((l) => ({ key: l.country, y: l.y1990 })),
    LABEL_MIN_GAP,
  );
  const left2023 = deconflictLabels(
    lines.map((l) => ({ key: l.country, y: l.y2023 })),
    LABEL_MIN_GAP,
  );

  return {
    plot,
    lines,
    yScale: y,
    referenceY: y(reference),
    labelY1990: left1990,
    labelY2023: left2023,
  };
}

/** Line `i`'s own overlapping slice of the master `reveal` progress — proven by
 *  `DumbbellVideo.tsx`'s `rowWindow`. */
export function countryWindow(
  i: number,
  n: number,
): { start: number; end: number } {
  const span = 1 / n;
  const start = i * span;
  const duration = span * 1.7;
  return { start, end: Math.min(1, start + duration) };
}

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

export type SlopeVideoProps = {
  data: CountryRow[]; // pre-sorted by v1990, descending — render.mjs's job, not this component's.
  title: string;
  source: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  periodLabels: [string, string]; // ["1990", "2023"]
  subjectCountry: string;
  timing?: BeatTiming;
};

export function SlopeVideo({
  data,
  title,
  source,
  ground,
  accent,
  ink,
  muted,
  grid,
  reference,
  referenceLabel,
  periodLabels,
  subjectCountry,
  timing = SLOPE_TIMING,
}: SlopeVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 42;
  const captionBaseline =
    sourceBaseline + (sourceLines.length - 1) * SOURCE.lead + 44;

  const CONCLUSION_RESERVE = 40;
  const longestLabel = Math.max(
    ...data.map((d) => measureText(d.country, CATEGORY)),
  );
  const padding = {
    top: captionBaseline + CONCLUSION_RESERVE + 30,
    right: PAD + 20 + longestLabel,
    bottom: PAD + 30,
    left: PAD + 20 + longestLabel,
  };

  const g = slopeGeometry(data, { width, height, padding, reference });
  const subjectIndex = data.findIndex((d) => d.country === subjectCountry);
  const subjectLine = g.lines[subjectIndex];

  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subjectProgress = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  const furnitureOpacity = establish;

  const referenceLabelOpacity = interpolate(
    referenceProgress,
    [0.55, 1],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const referenceX2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.left, g.plot.right],
    {
      easing: Easing.out(Easing.cubic),
    },
  );

  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const drop = subjectLine.v1990 - subjectLine.v2023;
  const dropPct = (drop / subjectLine.v1990) * 100;
  const conclusionLabel = `${subjectCountry}: ${fmt(subjectLine.v1990)} → ${fmt(subjectLine.v2023)} — a ${Math.round(dropPct)}% fall`;
  const conclusionBaseline = captionBaseline + CONCLUSION_RESERVE;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      <g opacity={furnitureOpacity}>
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
            y={sourceBaseline + i * SOURCE.lead}
            fill={muted}
            fontSize={SOURCE.fontSize}
          >
            {text}
          </text>
        ))}

        {/* Each period's own caption — a slope chart with unlabelled ends states half its claim
            (`slope.md`). */}
        <text
          x={g.plot.left}
          y={captionBaseline}
          fill={ink}
          fontSize={CAPTION.fontSize}
          fontWeight={CAPTION.fontWeight}
          textAnchor="middle"
        >
          {periodLabels[0]}
        </text>
        <text
          x={g.plot.right}
          y={captionBaseline}
          fill={ink}
          fontSize={CAPTION.fontSize}
          fontWeight={CAPTION.fontWeight}
          textAnchor="middle"
        >
          {periodLabels[1]}
        </text>
        <line
          x1={g.plot.left}
          x2={g.plot.left}
          y1={g.plot.top}
          y2={g.plot.bottom}
          stroke={grid}
          strokeWidth={1.5}
        />
        <line
          x1={g.plot.right}
          x2={g.plot.right}
          y1={g.plot.top}
          y2={g.plot.bottom}
          stroke={grid}
          strokeWidth={1.5}
        />
      </g>

      {/* The reference: the UN SDG 3.2 target, spanning both axes, before any line appears. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.plot.left}
            x2={referenceX2}
            y1={g.referenceY}
            y2={g.referenceY}
            stroke={muted}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          {/* Left-anchored, not centred: Brazil's own connector crosses the 2.5% target around
              78% of the way across the plot (`BRIEF.md`'s exact values put the crossing near the
              right side) — a centred label sat directly under that diagonal, reading as struck
              through. The left fifth of the plot is clear: every line is still well above or
              below 2.5% there. */}
          <text
            x={g.plot.left + 12}
            y={g.referenceY - 12}
            fill={muted}
            fontSize={20}
            textAnchor="start"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {/* The lines — each cascades in its own overlapping window of `reveal`, sorted by 1990
          value, descending. */}
      {g.lines.map((line, i) => {
        const w = countryWindow(i, g.lines.length);
        const lineProgress = interpolate(reveal, [w.start, w.end], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        const isSubject = line.country === subjectCountry;
        const leftDotOpacity = interpolate(lineProgress, [0, 0.18], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const currentX = interpolate(
          lineProgress,
          [0.18, 0.82],
          [g.plot.left, g.plot.right],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const currentY = interpolate(
          lineProgress,
          [0.18, 0.82],
          [line.y1990, line.y2023],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const rightDotOpacity = interpolate(lineProgress, [0.82, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const stroke = isSubject ? accent : muted;
        const strokeWidth = isSubject ? 4 : 2.5;
        const labelColor = isSubject && subjectProgress > 0.5 ? accent : ink;
        const labelWeight =
          isSubject && subjectProgress > 0.5 ? 700 : CATEGORY.fontWeight;
        const ly1990 = g.labelY1990.get(line.country)!;
        const ly2023 = g.labelY2023.get(line.country)!;
        return (
          <g key={line.country}>
            {leftDotOpacity > 0 ? (
              <line
                x1={g.plot.left}
                x2={Math.min(currentX, g.plot.right)}
                y1={line.y1990}
                y2={lineProgress <= 0.18 ? line.y1990 : currentY}
                stroke={stroke}
                strokeWidth={strokeWidth}
                opacity={leftDotOpacity}
              />
            ) : null}
            {leftDotOpacity > 0 ? (
              <circle
                cx={g.plot.left}
                cy={line.y1990}
                r={5}
                fill={stroke}
                opacity={leftDotOpacity}
              />
            ) : null}
            {rightDotOpacity > 0 ? (
              <circle
                cx={g.plot.right}
                cy={line.y2023}
                r={5}
                fill={stroke}
                opacity={rightDotOpacity}
              />
            ) : null}
            {isSubject && subjectSpring > 0 ? (
              <>
                <circle
                  cx={g.plot.left}
                  cy={line.y1990}
                  r={9}
                  fill="none"
                  stroke={ink}
                  strokeWidth={2}
                  opacity={subjectSpring}
                />
                <circle
                  cx={g.plot.right}
                  cy={line.y2023}
                  r={9}
                  fill="none"
                  stroke={ink}
                  strokeWidth={2}
                  opacity={subjectSpring}
                />
              </>
            ) : null}
            <text
              x={g.plot.left - 14}
              y={ly1990 + 6}
              fill={labelColor}
              fontWeight={labelWeight}
              fontSize={CATEGORY.fontSize}
              textAnchor="end"
              opacity={leftDotOpacity}
            >
              {line.country}
            </text>
            <text
              x={g.plot.right + 14}
              y={ly2023 + 6}
              fill={labelColor}
              fontWeight={labelWeight}
              fontSize={CATEGORY.fontSize}
              textAnchor="start"
              opacity={rightDotOpacity}
            >
              {line.country}
            </text>
          </g>
        );
      })}

      {/* The conclusion: Rwanda's two numbers and the drop between them, stated once the subject
          has landed — never before, per `motion-grammar.md`. Its own reserved banner row. */}
      <text
        x={PAD}
        y={conclusionBaseline}
        fill={ink}
        fontSize={26}
        fontWeight={700}
        textAnchor="start"
        opacity={conclusionOpacity}
      >
        {conclusionLabel}
      </text>
    </svg>
  );
}
