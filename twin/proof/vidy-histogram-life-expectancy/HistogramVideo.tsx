/**
 * The video beat of "In 2023, more countries reach 75-to-80 years of life expectancy than any
 * other five-year span." — 7.6 seconds, 30fps, 1080 × 1080.
 *
 * First histogram written in this shape. One continuous variable (life expectancy at birth, one
 * reading per country) binned into eight contiguous five-year bands — not a time series and not
 * ten independent rows, so this file's geometry (`histogramGeometry` below) is a fresh shape, not
 * a copy of any prior beat's `crossingGeometry` / `migrationGeometry` / `lifeExpectancyGeometry` /
 * `dumbbellGeometry`. `FONT_FAMILY`, `measureText` and `wrap` ARE this story's own copies of the
 * other proof workspaces' functions of the same name — not an import from any of them, per the
 * duplicate-do-not-link rule (this story lives outside `twin-chart-video`'s skill boundary, and
 * the settled rule for a workspace that needs something a skill has is to duplicate it, not reach
 * back across the boundary). `drawnSoFar` is NOT copied here — nothing in this beat traces a
 * continuously-drawing path; every bar grows in place from a fixed baseline, so there is no
 * partial-path head to compute.
 *
 * THE MOTION JUDGEMENT (from `BRIEF.md`): a histogram's bins carry no order beyond their position
 * on the variable's own axis — bin 3 is not "before" bin 4 the way 1994 is before 1995, and it is
 * not "ranked above" it the way a sorted dumbbell row is. Staggering the bars in by index would
 * assert a sequence the data does not contain (`motion-grammar.md`'s "the order is chronological,
 * or it is argumentative — never arbitrary"). So the honest build here is smaller than the
 * dumbbell's ten-row cascade: the median reference line lays down the rule the distribution is
 * read against, all eight bars rise together as ONE build (a single shared progress value, not
 * eight staggered ones), and only then does the bin the finding is actually about — 75-to-80
 * years, the tallest bar in the set — land its own emphasis as a distinct final event. A build
 * that invented per-bar staggering here would be motion for its own sake, not an argument; a
 * build with no order in it at all would have skipped a real one (the reference-then-evidence
 * pause, the subject's separation). This is the honest middle the data actually supports.
 *
 * COLOUR: the histogram type doctrine (`twin-chart-beat/references/types/histogram.md`) reserves
 * a value label's accent for the median mark alone ("a color that's safe on a shape is not
 * automatically safe as a label... reserve the accent color for the mark itself, not the number
 * next to it") and caps the chart at one semantic accent overall (`motion-grammar.md`'s "the one
 * semantic accent"). All eight bars share the SAME neutral fill (`muted`) — a histogram's bars are
 * one series, not several, so there is no second hue to assign the way the dumbbell split
 * 2000-vs-2023. The median rule is drawn in `muted` too (the dumbbell's own reference-line
 * colour). `accent` is spent exactly once: the subject bin's fill crossfades from `muted` to
 * `accent` once every bar has landed. Every text label — axis ticks, the median's caption, the
 * subject bin's count, the conclusion sentence — renders in `ink` or `muted`, never in `accent`,
 * per the type doctrine's own accessibility note: an Okabe-Ito-safe *mark* colour measured under
 * the 4.5:1 text floor when reused as a label in the case that note documents.
 *
 * VALUE LABELS: the type doctrine's "if the median gets a value label, render it in ink" is
 * honoured by `referenceLabel` below. The subject bin gets an outer value label too — its count,
 * the one number in this chart that is not printed on every bar (printing "how many countries" on
 * all eight bars when only one bin's count is the finding would be `anti-patterns.md`'s "repeated
 * years or values" eight times over, not eight new facts) — using the same two-stage label
 * technique `../video-population-growth-dumbbell/DumbbellVideo.tsx`'s gap-extension and
 * `EmissionsVideo.tsx`'s `endLabel` both use: a short label at `subject`, extended in place into
 * the full sentence at `conclusion`.
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
} from "#shared/twin-chart-video/timing.ts";
import { HISTOGRAM_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const TITLE = { fontSize: 38, fontWeight: 700, lead: 48 };
const SOURCE = { fontSize: 20, fontWeight: 400 };
const AXIS_NOTE = { fontSize: 20, fontWeight: 600 };
const TICK_LABEL = { fontSize: 19, fontWeight: 400 };
const NOTE = { fontSize: 20, fontWeight: 400 };
const VALUE_LABEL = { fontSize: 26, fontWeight: 700 };
const CONCLUSION_LABEL = { fontSize: 24, fontWeight: 600 };

/**
 * The rendered width of a string in the font it will really be drawn in — this story's own copy
 * of the video genre's browser-Canvas text measurer (see the file doc-comment for why it is
 * duplicated, not imported from a sibling workspace or a skill).
 */
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

export type Reading = { entity: string; value: number };

export type Bin = {
  start: number;
  end: number;
  count: number;
};

/**
 * Data to coordinates. Pure — no colour, no font, no React. A fresh shape: bins are contiguous
 * slices of one continuum, not categories and not readings on a shared time axis, so this is
 * neither `crossingGeometry`'s traced line nor `dumbbellGeometry`'s paired rows.
 *
 * `domainStart`/`domainEnd`/`binWidth` are supplied, not inferred, so the same sanity check
 * `render.mjs` runs on the frozen data (3–50 bins, per `histogram.md`'s floor and ceiling) is
 * checked once, at render time, against the real numbers — not silently re-derived here from
 * whatever a future call happens to pass in.
 *
 * The x domain is the bin edges themselves, `[domainStart, domainEnd]` — not padded, because bin
 * edges are already round, meaningful values in the variable's own unit (`histogram.md`: "the
 * x-axis is the continuous variable itself... not bin index"). The y (count) domain starts at
 * zero — the same non-negotiable rule as any bar: a count axis that doesn't start at zero halves
 * what a bar claims about how many observations fell there.
 */
export function histogramGeometry(
  readings: Reading[],
  {
    width,
    height,
    padding,
    binWidth,
    domainStart,
    domainEnd,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    binWidth: number;
    domainStart: number;
    domainEnd: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  const binCount = Math.round((domainEnd - domainStart) / binWidth);
  if (binCount < 3 || binCount > 50)
    throw new Error(
      `histogramGeometry: ${binCount} bins is outside the 3–50 sanity range (histogram.md)`,
    );

  const counts = new Array(binCount).fill(0);
  for (const r of readings) {
    const idx = Math.min(
      binCount - 1,
      Math.max(0, Math.floor((r.value - domainStart) / binWidth)),
    );
    counts[idx] += 1;
  }
  const bins: Bin[] = counts.map((count, i) => ({
    start: domainStart + i * binWidth,
    end: domainStart + (i + 1) * binWidth,
    count,
  }));
  const maxCount = Math.max(...counts);

  const x = scaleLinear()
    .domain([domainStart, domainEnd])
    .range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain([0, maxCount * 1.18]) // headroom for the subject bin's own value label
    .range([plot.bottom, plot.top]);

  const bars = bins.map((b) => ({
    ...b,
    x1: x(b.start),
    x2: x(b.end),
    yTop: y(b.count),
  }));

  return { plot, bars, x, y, maxCount, binCount };
}

export type HistogramVideoProps = {
  readings: Reading[]; // one row per country, year already filtered — render.mjs's job.
  title: string;
  source: string;
  axisNote: string; // e.g. "Countries per 5-year band"
  unitLabel: string; // x-axis unit line, e.g. "Life expectancy at birth, years (2023)"
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  referenceLabel: string; // e.g. "Median: 75.3 years"
  medianValue: number;
  binWidth: number;
  domainStart: number;
  domainEnd: number;
  subjectBinStart: number; // which bin's left edge is the finding, e.g. 75
  timing?: BeatTiming;
};

export function HistogramVideo({
  readings,
  title,
  source,
  axisNote,
  unitLabel,
  ground,
  accent,
  ink,
  muted,
  referenceLabel,
  medianValue,
  binWidth,
  domainStart,
  domainEnd,
  subjectBinStart,
  timing = HISTOGRAM_TIMING,
}: HistogramVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  if (readings.length < 1) throw new Error("need at least one reading");

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits,
  // so nothing shifts when the reveal or the subject bin arrives.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 44;
  const axisNoteBaseline = sourceBaseline + 44;

  const padding = {
    top: axisNoteBaseline + 40,
    right: PAD + 8,
    bottom: PAD + 56, // room for tick labels + the unit line below the axis
    left: PAD + 8,
  };

  const g = histogramGeometry(readings, {
    width,
    height,
    padding,
    binWidth,
    domainStart,
    domainEnd,
  });

  const subjectIndex = g.bars.findIndex((b) => b.start === subjectBinStart);
  if (subjectIndex < 0)
    throw new Error(
      `no bin starts at ${subjectBinStart} — check subjectBinStart against binWidth/domainStart`,
    );
  const subjectBar = g.bars[subjectIndex];

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title, the source and the axis note are on screen at FRAME ZERO, at full opacity, never
  // faded in. Extracting frame 0 from this beat's mp4 returned a completely blank white image —
  // measured, not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and
  // everything gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform
  // pulls as the thumbnail before anyone presses play, and a blank poster frame is a beat that
  // says nothing. `motion-grammar.md`'s conclusion rule governs assertions, not the title.
  // The zero baseline and the bin-edge x-axis still fade in over `establish` — they are the frame
  // the bars will be measured in, and they have nothing to say before the bars exist.
  const axisOpacity = establish;

  // The reference: the median line, drawn top-to-bottom, then left alone to be read before any
  // bar arrives — same device, same pause, as every prior beat's reference line.
  const medianX = g.x(medianValue);
  const referenceY2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.top, g.plot.bottom],
    { easing: Easing.out(Easing.cubic) },
  );
  const referenceLabelOpacity = interpolate(
    referenceProgress,
    [0.55, 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // The reveal: ALL eight bars rise together, sharing ONE eased progress — see the file
  // doc-comment for why this is a single build rather than a per-bin cascade. Easing is legal
  // here because this is evidence arriving, not the traversal of a measured axis
  // (`motion-grammar.md`: "easing is for things that arrive... never for the traversal of a
  // measured axis" — the x axis here is the variable, established already and static; the reveal
  // moves height, not position along that axis).
  const revealEase = interpolate(reveal, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The subject: the 75-to-80 bin takes the one accent at `subject`'s own boundary — a cut, not a
  // dissolve. It happens once every bar (including its own) is already fully up: `subject.start`
  // cannot precede `reveal`'s end, so that ordering is structural, not just editorial intent.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectOutlineOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);

  // The conclusion: the subject bin's short count label extends in place into the sentence the
  // beat is actually making — the same two-stage label technique the dumbbell's gap-extension and
  // `EmissionsVideo.tsx`'s `endLabel` both use.
  const valueOpacity = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const valueLabel = `${subjectBar.count}`;
  const conclusionLabel = `${subjectBar.count} countries, ${subjectBar.start}–${subjectBar.end} years — the most of any span`;
  const conclusionLabelWidth = measureText(conclusionLabel, CONCLUSION_LABEL);
  const conclusionX = Math.min(
    subjectBar.x1,
    g.plot.right - conclusionLabelWidth,
  );

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
        <text
          x={PAD}
          y={sourceBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {source}
        </text>
        <text
          x={PAD}
          y={axisNoteBaseline}
          fill={muted}
          fontSize={AXIS_NOTE.fontSize}
          fontWeight={AXIS_NOTE.fontWeight}
        >
          {axisNote}
        </text>
      </g>

      {/* The measuring frame — zero baseline and bin-edge x-axis — faded in over `establish`
          rather than present at frame 0. */}
      <g opacity={axisOpacity}>
        {/* The zero baseline — the count axis's own floor, the non-negotiable rule every bar's
            height is read against (`histogram.md`). */}
        <line
          x1={g.plot.left}
          x2={g.plot.right}
          y1={g.plot.bottom}
          y2={g.plot.bottom}
          stroke={muted}
          strokeWidth={2}
        />

        {/* The bin-edge x-axis: ticks and labels at every bin boundary, in the variable's own
            unit — the type's own requirement, not a genre choice
            (`histogram.md`: "not bin index"). Kept sparse in weight and size, the video genre's
            own discipline (`motion-grammar.md`'s furniture-density rule), but every edge is
            present because a histogram whose x-axis omits an edge has hidden a bin boundary. */}
        {g.bars.map((b) => (
          <g key={`tick-${b.start}`}>
            <line
              x1={g.x(b.start)}
              x2={g.x(b.start)}
              y1={g.plot.bottom}
              y2={g.plot.bottom + 8}
              stroke={muted}
              strokeWidth={1.5}
            />
            <text
              x={g.x(b.start)}
              y={g.plot.bottom + 8 + TICK_LABEL.fontSize}
              fill={muted}
              fontSize={TICK_LABEL.fontSize}
              textAnchor="middle"
            >
              {b.start}
            </text>
          </g>
        ))}
        <line
          x1={g.x(domainEnd)}
          x2={g.x(domainEnd)}
          y1={g.plot.bottom}
          y2={g.plot.bottom + 8}
          stroke={muted}
          strokeWidth={1.5}
        />
        <text
          x={g.x(domainEnd)}
          y={g.plot.bottom + 8 + TICK_LABEL.fontSize}
          fill={muted}
          fontSize={TICK_LABEL.fontSize}
          textAnchor="middle"
        >
          {domainEnd}
        </text>
        <text
          x={(g.plot.left + g.plot.right) / 2}
          y={g.plot.bottom + 8 + TICK_LABEL.fontSize * 2 + 10}
          fill={muted}
          fontSize={NOTE.fontSize}
          textAnchor="middle"
        >
          {unitLabel}
        </text>
      </g>

      {/* All eight bars: the shared neutral fill, rising together from the zero baseline. Every
          opacity/height below is an ABSOLUTE value derived from `revealEase` alone, never gated
          on a later event's own progress, so nothing produces NaN in the frame before the reveal
          window opens. */}
      {g.bars.map((b, i) => {
        const barHeight = (g.plot.bottom - b.yTop) * revealEase;
        const barY = g.plot.bottom - barHeight;
        const isSubject = i === subjectIndex;
        return (
          <g key={`bar-${b.start}`}>
            {/* ONE rect whose fill switches at the subject's own boundary. Drawn as two rects —
                a neutral one with an accent one dissolving over it — the bin spent the whole
                22-frame window in a blend of `muted` and `accent` that nobody chose, which is the
                first invariant broken on the one mark the beat is about. */}
            <rect
              x={b.x1}
              y={barY}
              width={b.x2 - b.x1}
              height={barHeight}
              fill={isSubject && subject > 0 ? accent : muted}
            />
          </g>
        );
      })}

      {/* The reference: a dashed vertical rule at the median, the one thing every bar's shape is
          read against. Its caption states the value once. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={medianX}
            x2={medianX}
            y1={g.plot.top}
            y2={referenceY2}
            stroke={muted}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          <text
            x={medianX}
            y={g.plot.top - 14}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="middle"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {/* The subject bin's outline — pops on once its own crossfade begins, the same critically
          damped landing every prior beat's subject mark uses: no overshoot, because a ring or
          outline that overshot would be showing more emphasis than the finding warrants. */}
      {subjectOutlineOpacity > 0 ? (
        <rect
          x={subjectBar.x1}
          y={subjectBar.yTop}
          width={subjectBar.x2 - subjectBar.x1}
          height={g.plot.bottom - subjectBar.yTop}
          fill="none"
          stroke={accent}
          strokeWidth={3}
          opacity={subjectOutlineOpacity}
        />
      ) : null}

      {/* The subject bin's value label, in ink (never the accent — the type doctrine's own
          accessibility trap: a colour safe as a mark can fail as text).

          The value label EXTENDS into the sentence the beat is actually making, at the same
          baseline. An extension is a cut, not a dissolve: exactly one of the two is mounted at any
          frame. Drawn as two crossfading nodes — which is how this was first written — frames 154
          to 179 printed both, and because the sentence opens with the same token as the short
          label a reader saw "65 countries, 75–80 yea65 — the most of any span" for 0.87s. */}
      {conclusion > 0 ? (
        <text
          x={conclusionX}
          y={subjectBar.yTop - 16}
          fill={ink}
          fontSize={CONCLUSION_LABEL.fontSize}
          fontWeight={CONCLUSION_LABEL.fontWeight}
          opacity={conclusionOpacity}
        >
          {conclusionLabel}
        </text>
      ) : (
        <text
          x={(subjectBar.x1 + subjectBar.x2) / 2}
          y={subjectBar.yTop - 16}
          fill={ink}
          fontSize={VALUE_LABEL.fontSize}
          fontWeight={VALUE_LABEL.fontWeight}
          textAnchor="middle"
          opacity={valueOpacity}
        >
          {valueLabel}
        </text>
      )}
    </svg>
  );
}
