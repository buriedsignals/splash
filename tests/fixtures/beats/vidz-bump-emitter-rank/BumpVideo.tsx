/**
 * The video beat of "India has risen from eighth to third among the world's biggest CO₂ emitters."
 * — 10 seconds, 30fps, 1080 × 1080.
 *
 * First bump chart in this corpus, in any format. Vertical position is RANK — row 1 at the top —
 * never a value, so `bumpGeometry` below is its own shape and shares nothing with the line beats'
 * value scales: there is no domain to fit, no zero to anchor, and no magnitude anywhere in the
 * drawing.
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `en` ARE this story's own copies of the other proof
 * workspaces' functions of the same name — not an import from any of them, per the duplicate-do-
 * not-link rule. They are the VIDEO format's browser-Canvas measurer, not the static format's resvg
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
} from "#shared/chart-video/timing.ts";
// The VIDEO format's own size table — its landscape row carries a 30px legibility floor and a 2.5
// type scale where the static skill's carries 26 and 2.2, because a 16:9 video is watched on a
// phone turned sideways (~800 dp) and a static landscape sits in a ~900 px article column.
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-video/sizes.mjs";
// Whether this TYPE may enter that size is a fact about the type, not about the craft, so both
// formats read one copy. A bump chart has no measured aspect range and no twin form — its x is
// TIME, which resists rotation for the same reason a line's does — so the two phone frames are
// refused here, by name, rather than drawn at a shape nobody measured.
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { BUMP_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
export const TYPE = "bump";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. The frame is `sizeFor(size)`'s, and `size` is the decision
 * gate 2c took, read out of this beat's own `BRIEF.md` and carried onto the composition by
 * `Root.tsx`. The shipped values were 1080-frame tuning, divided so the SMALLEST token lands at 12
 * — the number every row's `typeScale` in `chart-video/scripts/sizes.mjs` is derived from.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`. `PAD` is the one exception: a frame's margin is
 * proportional to the CANVAS, not to the type (`frameInsetFor`).
 */
const BASE = {
  TITLE: { fontSize: 25, fontWeight: 700, lead: 32 },
  SOURCE: { fontSize: 13, fontWeight: 400 },
  CAVEAT: { fontSize: 12, fontWeight: 400, lead: 16 },
  AXIS_TICK: { fontSize: 12, fontWeight: 500 },
  END_LABEL: { fontSize: 14, fontWeight: 500 },
  END_LABEL_ACCENT: { fontSize: 14, fontWeight: 700 },
  CONCLUSION: { fontSize: 15, fontWeight: 600, lead: 19 },
  DOT_R: 4,
  /** Air under the last title line, before the caveat. A title carrying a subscript (CO₂) hangs
   *  below its own baseline, so this is the gap that has to clear a descender, not a cap height:
   *  at 40px the caveat ran through the ₂ at the table's landscape scale. */
  TITLE_TO_CAVEAT: 24,
  /** Air under the caveat, before the axis title. */
  CAVEAT_TO_AXIS_TITLE: 18,
  /** Air under the axis title, before the plot. */
  AXIS_TITLE_TO_PLOT: 14,
  /** Added to the widest rank tick and to the widest end label to make the two gutters. */
  RANK_GUTTER_AIR: 11,
  END_GUTTER_AIR: 13,
  /** The inset of a rank tick from the plot's left edge. */
  RANK_TICK_INSET: 9,
  /** The drop from the plot's floor to the year label row. */
  YEAR_LABEL_DROP: 12,
  /** The gap between the year row and the conclusion's first line. */
  CONCLUSION_GAP: 16,
  /** Air between the conclusion block and the credit's ink. */
  BLOCK_TO_SOURCE: 7,
  /** How far the subject's ring stands off its own dot, and the halo behind a passing dot. */
  RING_STANDOFF: 5,
  DOT_HALO: 1.5,
  /** Ink widths. A stroke is proportional to the canvas the way a gap is, so it scales too. */
  GRID_STROKE: 1,
  TRACK_STROKE: 2,
  SUBJECT_STROKE: 3.5,
};

/**
 * The base, at the size's own multiplier — one integer-rounding helper for every number, so
 * `measureText`'s cache keys stay stable and no half-pixel arrives anywhere.
 */
function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    CAVEAT: f(BASE.CAVEAT) as typeof BASE.CAVEAT,
    AXIS_TICK: f(BASE.AXIS_TICK) as typeof BASE.AXIS_TICK,
    END_LABEL: f(BASE.END_LABEL) as typeof BASE.END_LABEL,
    END_LABEL_ACCENT: f(BASE.END_LABEL_ACCENT) as typeof BASE.END_LABEL_ACCENT,
    CONCLUSION: f(BASE.CONCLUSION) as typeof BASE.CONCLUSION,
    DOT_R: sp(BASE.DOT_R),
    TITLE_TO_CAVEAT: sp(BASE.TITLE_TO_CAVEAT),
    CAVEAT_TO_AXIS_TITLE: sp(BASE.CAVEAT_TO_AXIS_TITLE),
    AXIS_TITLE_TO_PLOT: sp(BASE.AXIS_TITLE_TO_PLOT),
    RANK_GUTTER_AIR: sp(BASE.RANK_GUTTER_AIR),
    END_GUTTER_AIR: sp(BASE.END_GUTTER_AIR),
    RANK_TICK_INSET: sp(BASE.RANK_TICK_INSET),
    YEAR_LABEL_DROP: sp(BASE.YEAR_LABEL_DROP),
    CONCLUSION_GAP: sp(BASE.CONCLUSION_GAP),
    BLOCK_TO_SOURCE: sp(BASE.BLOCK_TO_SOURCE),
    RING_STANDOFF: sp(BASE.RING_STANDOFF),
    DOT_HALO: sp(BASE.DOT_HALO),
    GRID_STROKE: Math.max(1, sp(BASE.GRID_STROKE)),
    TRACK_STROKE: Math.max(1, sp(BASE.TRACK_STROKE)),
    SUBJECT_STROKE: Math.max(1, sp(BASE.SUBJECT_STROKE)),
  };
}

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
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
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
  size,
  timing = BUMP_TIMING,
}: BumpVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const {
    TITLE,
    SOURCE,
    CAVEAT,
    AXIS_TICK,
    END_LABEL,
    END_LABEL_ACCENT,
    CONCLUSION,
    DOT_R,
  } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL, before anything is measured. `bump` has no
  // measured aspect range at a tall frame and no twin form, so `assertTypeMayEnter` refuses
  // portrait and square by name and offers the size that works.
  assertTypeMayEnter(TYPE, size, { what: "vidz-bump-emitter-rank" });

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
  const contentTop = stage.reserved ? stage.top : PAD;
  // Named `sourceBottom` rather than something generic because it IS the credit's own anchor, and
  // `credit-anchors-to-the-frame-bottom.test.ts` follows that name through the chain: the credit has
  // to resolve to the frame's own height minus something, never to a header rung. At portrait the
  // bottom it names is the STAGE's — below that band sit the platform's caption and progress bar,
  // and a covered credit is an attribution failure, not a cosmetic one.
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceLead = Math.round(SOURCE.fontSize * 1.5);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — the LAST line lands on
  // `height - PAD`, the same inset the title hangs off at the top, on the same x. It stays inside
  // the furniture opacity group, so no timing contract moves. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * sourceLead;
  const caveatLines = wrap(caveat, width - PAD * 2, CAVEAT);
  // The caveat keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const caveatBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_CAVEAT;
  const axisTitleBaseline =
    caveatBaseline + (caveatLines.length - 1) * CAVEAT.lead + T.CAVEAT_TO_AXIS_TITLE;

  // Gutters measured against the strings that will actually be drawn in them — never constants.
  const rankGutter =
    Math.max(
      ...Array.from({ length: rankRows }, (_, i) =>
        measureText(en(i + 1), AXIS_TICK),
      ),
      measureText(axisTitle, AXIS_TICK),
    ) + T.RANK_GUTTER_AIR;
  const endGutter =
    Math.max(
      ...data.map((t) =>
        Math.max(
          measureText(t.country, END_LABEL),
          measureText(t.country, END_LABEL_ACCENT),
        ),
      ),
    ) + T.END_GUTTER_AIR;

  const conclusionLines = wrap(conclusion, width - PAD * 2, CONCLUSION);
  const conclusionBlock = conclusionLines.length * CONCLUSION.lead;
  // The gap between the year-tick row and the first line of the conclusion. It is part of the
  // reserved bottom padding, not an offset added on top of it — adding it only at draw time pushed
  // the last line past the frame's own margin.
  const conclusionGap = T.CONCLUSION_GAP;
  const yearLabelBlock = AXIS_TICK.fontSize + T.YEAR_LABEL_DROP;

  const padding = {
    top: axisTitleBaseline + T.AXIS_TITLE_TO_PLOT,
    right: PAD + endGutter,
    // Grown by the credit block's own height plus clear air, so the conclusion line ends above the
    // credit's ink — and measured DOWN FROM the credit's own baseline rather than up from the
    // frame's foot, so the portrait stage moves the plot with it.
    bottom:
      height -
      sourceBottom +
      yearLabelBlock +
      conclusionGap +
      conclusionBlock +
      (sourceLines.length - 1) * sourceLead +
      SOURCE.fontSize +
      T.BLOCK_TO_SOURCE,
    left: PAD + rankGutter,
  };

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor.
  assertTypeFloor(
    [
      TITLE.fontSize,
      SOURCE.fontSize,
      CAVEAT.fontSize,
      AXIS_TICK.fontSize,
      END_LABEL.fontSize,
      END_LABEL_ACCENT.fontSize,
      CONCLUSION.fontSize,
    ]
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidz-bump-emitter-rank at ${size}` },
  );

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
  const ringRadius = interpolate(subjectSpring, [0, 1], [0, DOT_R + T.RING_STANDOFF]);

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
              strokeWidth={T.GRID_STROKE}
            />
            <text
              x={g.plot.left - T.RANK_TICK_INSET}
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
            y={g.plot.bottom + T.YEAR_LABEL_DROP + AXIS_TICK.fontSize}
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
                strokeWidth={T.TRACK_STROKE}
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
          strokeWidth={T.SUBJECT_STROKE}
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
            strokeWidth={T.TRACK_STROKE}
          />
          <circle
            cx={subjectTrack.points[subjectTrack.points.length - 1].x}
            cy={subjectTrack.points[subjectTrack.points.length - 1].y}
            r={ringRadius}
            fill="none"
            stroke={accent}
            strokeWidth={T.TRACK_STROKE}
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
                  r={DOT_R + T.DOT_HALO}
                  fill={ground}
                  stroke={accent}
                  strokeWidth={T.TRACK_STROKE}
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
