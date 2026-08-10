/**
 * The video beat of "India has risen from eighth to third among the world's biggest CO₂ emitters."
 * — 10 seconds, 30fps, 1080 × 1080.
 *
 * First bump chart in this corpus, in any genre. Vertical position is RANK — row 1 at the top —
 * never a value, so `bumpGeometry` below is its own shape and shares nothing with the line beats'
 * value scales: there is no domain to fit, no zero to anchor, and no magnitude anywhere in the
 * drawing.
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `en` ARE this story's own copies of the other proof
 * workspaces' functions of the same name — not an import from any of them, per the duplicate-do-
 * not-link rule. They are the VIDEO genre's browser-Canvas measurer, not the static genre's resvg
 * one; the two are not interchangeable.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): a crossing is two lines swapping places, so it exists only
 * while both are being drawn. Building one country's whole line before starting the next would
 * produce a chart with no crossings in it — the only event this type exists to show. So `reveal`
 * runs ONE clock and all six lines advance along it together, 1990 to 2024. The subject is picked
 * out afterwards, never during: a line already accented while the race runs hands the reader the
 * answer before the evidence.
 *
 * THE TYPE'S OWN TRAP, honoured: `references/types/bump.md` warns that rank has no magnitude to
 * sanity-check against, so "an invented rank slots into the visual field exactly as plausibly as a
 * real one" — and that a missing period must break the line rather than be bridged. Every rank
 * drawn here is computed in `render.mjs` from the frozen emissions file by sorting every country
 * with an ISO code; nothing is interpolated, and the six countries drawn are exactly those the file
 * says held a top-ten place in every year of the window, which is why no line has a gap to bridge.
 *
 * COLOUR AND CONTRAST: one accent line only — the sheet allows two or three, the recorded palette
 * carries one, and a second hue would be a colour nobody chose. End labels are in page `ink`, never
 * in a line's own hue: that is the sheet's named accessibility failure for this exact type.
 */

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
} from "#shared/twin-chart-video/timing.ts";
import { BUMP_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const TITLE = { fontSize: 38, fontWeight: 700, lead: 48 };
const SOURCE = { fontSize: 20, fontWeight: 400 };
const CAVEAT = { fontSize: 18, fontWeight: 400, lead: 24 };
const AXIS_TICK = { fontSize: 18, fontWeight: 500 };
const END_LABEL = { fontSize: 21, fontWeight: 500 };
const END_LABEL_ACCENT = { fontSize: 21, fontWeight: 700 };
const CONCLUSION = { fontSize: 22, fontWeight: 600, lead: 28 };
const DOT_R = 6;

export type Track = {
  country: string;
  /** One rank per year, same order and length as `years`. Rank 1 is the largest emitter. */
  ranks: number[];
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

/** English integer, no grouping — every number printed by this beat is a year or a small rank. */
export function en(value: number): string {
  return String(value);
}

/**
 * Data to coordinates. Pure — no colour, no font, no React.
 *
 * Rank rows are evenly spaced from `plot.top` (rank 1) to `plot.bottom` (`rankRows`), and years are
 * evenly spaced across the width. There is no scale to fit and no domain to nice: both axes are
 * ordinal, which is precisely what makes this type unable to show magnitude.
 */
export function bumpGeometry(
  tracks: Track[],
  years: number[],
  rankRows: number,
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
  const rowHeight = (plot.bottom - plot.top) / (rankRows - 1);
  const columnWidth = (plot.right - plot.left) / (years.length - 1);
  const yOfRank = (rank: number) => plot.top + (rank - 1) * rowHeight;
  const xOfIndex = (index: number) => plot.left + index * columnWidth;

  const lines = tracks.map((t) => ({
    ...t,
    points: t.ranks.map((rank, i) => ({ x: xOfIndex(i), y: yOfRank(rank) })),
  }));

  return { plot, rowHeight, columnWidth, yOfRank, xOfIndex, lines };
}

/**
 * The polyline a line has drawn by the time the clock has reached fractional index `head`.
 *
 * The partial last segment is interpolated so the head moves continuously between years rather than
 * jumping a whole column at a time — a bump chart's crossings happen BETWEEN periods, and a head
 * that jumped would step straight over the moment the beat is about.
 */
export function drawnSoFar(
  points: { x: number; y: number }[],
  head: number,
): string {
  if (points.length === 0) return "";
  const last = Math.min(Math.floor(head), points.length - 1);
  const parts = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 1; i <= last; i++) parts.push(`L ${points[i].x} ${points[i].y}`);
  const fraction = head - last;
  if (fraction > 0 && last + 1 < points.length) {
    const a = points[last];
    const b = points[last + 1];
    parts.push(
      `L ${a.x + (b.x - a.x) * fraction} ${a.y + (b.y - a.y) * fraction}`,
    );
  }
  return parts.join(" ");
}

export type Crossing = {
  /** The country the subject passed. */
  country: string;
  /** The first year the subject ranked above it and stayed there. */
  year: number;
  /** Whether that country is one of the lines this chart draws. */
  drawn: boolean;
};

export type BumpVideoProps = {
  years: number[];
  /** One track per drawn country, ordered by final rank. render.mjs's job. */
  data: Track[];
  /** How many rank rows the axis shows — the worst rank any drawn country reaches. */
  rankRows: number;
  title: string;
  source: string;
  caveat: string;
  axisTitle: string;
  subjectCountry: string;
  /** The crossings the conclusion marks — computed, never typed. */
  crossings: Crossing[];
  conclusion: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  timing?: BeatTiming;
};

export function BumpVideo({
  years,
  data,
  rankRows,
  title,
  source,
  caveat,
  axisTitle,
  subjectCountry,
  crossings,
  conclusion,
  ground,
  accent,
  ink,
  muted,
  grid,
  timing = BUMP_TIMING,
}: BumpVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  if (years.length < 3)
    throw new Error(
      `a bump chart needs at least three periods; a two-point comparison is a slope chart's job, got ${years.length}`,
    );
  if (data.length < 2)
    throw new Error(`need at least two tracks, got ${data.length}`);
  for (const track of data)
    if (track.ranks.length !== years.length)
      throw new Error(
        `${track.country} has ${track.ranks.length} ranks for ${years.length} years — a bump chart never bridges a missing period`,
      );
  const subjectIndex = data.findIndex((t) => t.country === subjectCountry);
  if (subjectIndex < 0)
    throw new Error(`no track for subject ${JSON.stringify(subjectCountry)}`);

  // ── Layout. Identical at every frame.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceLead = SOURCE.fontSize * 1.5;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — the LAST line lands on
  // `height - PAD`, the same inset the title hangs off at the top, on the same x. It stays inside
  // the furniture opacity group, so no timing contract moves. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD - (sourceLines.length - 1) * sourceLead;
  const caveatLines = wrap(caveat, width - PAD * 2, CAVEAT);
  // The caveat keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const caveatBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 32;
  const axisTitleBaseline =
    caveatBaseline + (caveatLines.length - 1) * CAVEAT.lead + 34;

  // Gutters measured against the strings that will actually be drawn in them — never constants.
  const rankGutter =
    Math.max(
      ...Array.from({ length: rankRows }, (_, i) =>
        measureText(en(i + 1), AXIS_TICK),
      ),
      measureText(axisTitle, AXIS_TICK),
    ) + 16;
  const endGutter =
    Math.max(
      ...data.map((t) =>
        Math.max(
          measureText(t.country, END_LABEL),
          measureText(t.country, END_LABEL_ACCENT),
        ),
      ),
    ) + 20;

  const conclusionLines = wrap(conclusion, width - PAD * 2, CONCLUSION);
  const conclusionBlock = conclusionLines.length * CONCLUSION.lead;
  // The gap between the year-tick row and the first line of the conclusion. It is part of the
  // reserved bottom padding, not an offset added on top of it — adding it only at draw time pushed
  // the last line past the frame's own margin.
  const conclusionGap = 34;
  const yearLabelBlock = AXIS_TICK.fontSize + 18;

  const padding = {
    top: axisTitleBaseline + 26,
    right: PAD + endGutter,
    // Grown by the credit block's own height plus clear air, so the conclusion line ends above
    // the credit's ink.
    bottom:
      PAD +
      yearLabelBlock +
      conclusionGap +
      conclusionBlock +
      (sourceLines.length - 1) * sourceLead +
      SOURCE.fontSize +
      10,
    left: PAD + rankGutter,
  };

  const g = bumpGeometry(data, years, rankRows, { width, height, padding });

  // Year ticks: every fifth year, plus the last one when it is not already near a tick.
  const yearTicks = years
    .map((year, i) => ({ year, i }))
    .filter(
      ({ year, i }) =>
        year % 5 === 0 ||
        (i === years.length - 1 && (years[years.length - 1] - 1) % 5 !== 0),
    );

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusionProgress = progressOf(frame, timing.conclusion);

  // The title and the source are on screen at FRAME ZERO, never faded in — frame 0 is the poster
  // frame, and `establish` starting at frame 0 means anything gated on it is invisible there.
  // Measured: every video beat in this corpus that fades its title returns a completely blank
  // frame 0. The axis furniture still fades, because it has nothing to say before the data does.
  const axisOpacity = establish;

  // The reference: where everyone started. On a rank chart there is no level to measure against, so
  // the 1990 column IS the reference every later crossing is read against.
  const startDotOpacity = interpolate(referenceProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The reveal: one clock, six lines. The head is a fractional year index.
  const head = interpolate(reveal, [0, 1], [0, years.length - 1], {
    easing: Easing.inOut(Easing.cubic),
  });

  // The subject: India picked out of the six once the race has run.
  const emphasis = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const ringRadius = interpolate(subjectSpring, [0, 1], [0, DOT_R + 7]);

  // End labels arrive with the line that earns them: each one gates on ITS OWN line reaching the
  // last year, not on the master clock — `motion-grammar.md`'s rule, and here all six happen to
  // land together because they share one clock.
  const endLabelOpacity = interpolate(
    head,
    [years.length - 1.6, years.length - 1],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const crossingOpacity = interpolate(conclusionProgress, [0, 0.45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
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

  const subjectTrack = g.lines[subjectIndex];
  const drawnCrossings = crossings.filter((c) => c.drawn);

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

      {/* Rank rows and year ticks. Established with the title, then still. */}
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
        {Array.from({ length: rankRows }, (_, i) => i + 1).map((rank) => (
          <g key={`rank-${rank}`}>
            <line
              x1={g.plot.left}
              x2={g.plot.right}
              y1={g.yOfRank(rank)}
              y2={g.yOfRank(rank)}
              stroke={grid}
              strokeWidth={1}
            />
            <text
              x={g.plot.left - 14}
              y={g.yOfRank(rank) + AXIS_TICK.fontSize * 0.34}
              fill={muted}
              fontSize={AXIS_TICK.fontSize}
              fontWeight={AXIS_TICK.fontWeight}
              textAnchor="end"
            >
              {en(rank)}
            </text>
          </g>
        ))}
        {yearTicks.map(({ year, i }) => (
          <text
            key={`year-${year}`}
            x={g.xOfIndex(i)}
            y={g.plot.bottom + 18 + AXIS_TICK.fontSize}
            fill={muted}
            fontSize={AXIS_TICK.fontSize}
            fontWeight={AXIS_TICK.fontWeight}
            textAnchor={
              i === 0 ? "start" : i === years.length - 1 ? "end" : "middle"
            }
          >
            {en(year)}
          </text>
        ))}
      </g>

      {/* The reference: the starting column. */}
      {startDotOpacity > 0
        ? g.lines.map((l) => (
            <circle
              key={`start-${l.country}`}
              cx={l.points[0].x}
              cy={l.points[0].y}
              r={DOT_R}
              fill={muted}
              opacity={startDotOpacity}
            />
          ))
        : null}

      {/* The race. Every line neutral, drawn on one clock — and the subject's own line is drawn
          ONCE, here, only while it is still one of them. */}
      {reveal > 0
        ? g.lines
            .filter(
              (l) => !(emphasis > 0 && l.country === subjectTrack.country),
            )
            .map((l) => (
              <path
                key={`line-${l.country}`}
                d={drawnSoFar(l.points, head)}
                fill="none"
                stroke={muted}
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))
        : null}

      {/* The subject's line, drawn LAST so a crossing between it and a background line reads as
          the accent line's — the sheet's z-order rule. It is a CUT, not a redraw: the neutral copy
          above is unmounted at the same boundary this one is mounted, so the two never composite.
          Written as a redraw it was a 3px `muted` track held at 1.000 with a 5px `accent` track
          dissolving over it, and a reader saw the two hues mix for the width of `emphasis`
          (`video-handover-is-a-cut.test.ts`, frame 189). */}
      {emphasis > 0 ? (
        <path
          d={drawnSoFar(subjectTrack.points, head)}
          fill="none"
          stroke={accent}
          strokeWidth={5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {/* The subject's two ends, ringed. */}
      {ringRadius > 0 ? (
        <g opacity={emphasis}>
          <circle
            cx={subjectTrack.points[0].x}
            cy={subjectTrack.points[0].y}
            r={ringRadius}
            fill="none"
            stroke={accent}
            strokeWidth={3}
          />
          <circle
            cx={subjectTrack.points[subjectTrack.points.length - 1].x}
            cy={subjectTrack.points[subjectTrack.points.length - 1].y}
            r={ringRadius}
            fill="none"
            stroke={accent}
            strokeWidth={3}
          />
        </g>
      ) : null}

      {/* The crossings the conclusion is about, marked on the subject's own line. */}
      {crossingOpacity > 0
        ? drawnCrossings.map((c) => {
            const at = years.indexOf(c.year);
            if (at < 0) return null;
            return (
              <g key={`crossing-${c.country}`} opacity={crossingOpacity}>
                <circle
                  cx={subjectTrack.points[at].x}
                  cy={subjectTrack.points[at].y}
                  r={DOT_R + 2}
                  fill={ground}
                  stroke={accent}
                  strokeWidth={3}
                />
              </g>
            );
          })
        : null}

      {/* End labels — always in page ink, never in a line's own hue. That is this type's named
          accessibility failure, and it applies to the accented line too. */}
      {endLabelOpacity > 0
        ? g.lines.map((l, i) => {
            const isSubject = i === subjectIndex;
            const font =
              isSubject && emphasis > 0.5 ? END_LABEL_ACCENT : END_LABEL;
            const last = l.points[l.points.length - 1];
            return (
              <text
                key={`end-${l.country}`}
                x={last.x + 14}
                y={last.y + END_LABEL.fontSize * 0.34}
                fill={ink}
                fontSize={font.fontSize}
                fontWeight={font.fontWeight}
                opacity={endLabelOpacity}
              >
                {l.country}
              </text>
            );
          })
        : null}

      {/* The conclusion sentence, under the year axis. */}
      {conclusionTextOpacity > 0
        ? conclusionLines.map((text, i) => (
            <text
              key={text}
              x={PAD}
              y={
                g.plot.bottom +
                yearLabelBlock +
                conclusionGap +
                i * CONCLUSION.lead
              }
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
