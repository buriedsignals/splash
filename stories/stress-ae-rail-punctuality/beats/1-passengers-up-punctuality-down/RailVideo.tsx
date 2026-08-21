/**
 * The video beat of "Rail passengers rose from 58.2 million in 2014 to 74.6 million in 2025 while
 * punctuality fell from 91.4 per cent to 81.6 — and 2020, when almost nobody travelled, is the one
 * break in both series." — 10 seconds, 30fps, 1920 x 1080.
 *
 * TWO SERIES, TWO PANELS, ONE TIME AXIS — and that is a refusal, not a layout preference.
 * `chart-beat/references/types/line.md` refuses a dual y axis in its own words: "never give two
 * series their own, independently-scaled y-axis: a reader assumes one shared scale, so a 'line went
 * up' on the left axis and a 'line went down' on the right axis can describe the same magnitude of
 * change and still look like opposite stories. Index both series to a common base, or split the
 * frame in two." Indexing to 2014 = 100 would erase the four figures the takeaway states, so the
 * frame is split. Each panel keeps its own fitted extent — a line encodes change by slope, and
 * anchoring either at zero would flatten the change this beat is about.
 *
 * THE MOTION PROBLEM. The subject is 2020, and it sits five years before either series ends. A
 * reveal that stopped there would hide the recovery that follows it, and the recovery is what makes
 * 2020 a break rather than a new level. So `reveal` draws BOTH series whole, 2014 to 2025, in the
 * data's own order at a constant pace, and `subject` lands on marks already on screen — in both
 * panels at once, tied together, because the fact is that one year is the extreme of both columns.
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `drawnSoFar` are this story's own copies of the video
 * format's helpers, not imports: a story lives outside the skill boundary and the settled rule is
 * to duplicate rather than reach across it. The bodies are the video format's browser-Canvas
 * measurer, not the static format's resvg one — the two are not interchangeable.
 */

import { line } from "d3-shape";
import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { progressOf, type BeatTiming } from "#shared/chart-video/timing.ts";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-video/sizes.mjs";
import { RAIL_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/**
 * The rendered width of a string in the font it will really be drawn in. Chromium's own text
 * measurement, which is the engine that will draw it. The fallback is only for a context with no
 * DOM, and no frame is ever rendered in one.
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

/**
 * The curve as far as it has been drawn, with the last segment cut mid-way so the head moves
 * smoothly instead of jumping from reading to reading. Chronological, linear: the x axis IS time,
 * and easing it would make 2016 and 2017 occupy different amounts of screen time.
 */
export function drawnSoFar<T extends { x: number; y: number }>(
  points: T[],
  progress: number,
): { x: number; y: number }[] {
  if (points.length === 0 || progress <= 0) return [];
  const last = points.length - 1;
  const travelled = progress * last;
  const index = Math.min(last, Math.floor(travelled));
  if (index >= last) return points.map(({ x, y }) => ({ x, y }));
  const head = points.slice(0, index + 1).map(({ x, y }) => ({ x, y }));
  const fraction = travelled - index;
  const a = points[index];
  const b = points[index + 1];
  return [
    ...head,
    { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction },
  ];
}

/**
 * THE TUNING THIS BEAT IS DRAWN AT, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME`: the frame is Remotion's own (`useVideoConfig`), and `size` names the
 * row the composition was registered from. The smallest token is 12, so at the landscape row's 2.5
 * the axis type lands on 30 px — `sizes.mjs`'s own `minTypePx` for a landscape video, which is 12
 * CSS px on a phone turned sideways. Every spacing number goes through `sp`, not only the fonts:
 * scaling type and leaving spacing is what collides a title into a subtitle.
 *
 * `PAD` is the one that does NOT go through it — a frame's margin is proportional to the CANVAS.
 */
const BASE = {
  TITLE: { fontSize: 22, fontWeight: 700, lead: 28 },
  SOURCE: { fontSize: 12, fontWeight: 400, lead: 17 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  SERIES: { fontSize: 15, fontWeight: 700 },
  VALUE: { fontSize: 15, fontWeight: 700 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  TITLE_TO_PLOT: 26,
  PANEL_GAP: 46,
  SERIES_LABEL_DROP: 13,
  SERIES_TO_PLOT: 10,
  PLOT_RIGHT_AIR: 46,
  X_LABEL_BAND: 16,
  AXIS_TO_SOURCE: 8,
  Y_TICK_INSET: 6,
  Y_TICK_BASELINE_NUDGE: 4,
  X_TICK_DROP: 14,
  REFERENCE_LABEL_RISE: 6,
  VALUE_LABEL_INSET: 8,
  SUBJECT_LABEL_RISE: 10,
  SUBJECT_RADIUS: 3.6,
  END_RADIUS: 2.6,
  GRID_STROKE: 0.5,
  REFERENCE_STROKE: 0.7,
  LINE_STROKE: 1.5,
  TIE_STROKE: 0.6,
  REFERENCE_DASH: [2.7, 2],
  TIE_DASH: [1.6, 1.6],
};

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  const dash = (pair: number[]) => pair.map((v) => (v * typeScale).toFixed(1)).join(" ");
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    SERIES: f(BASE.SERIES) as typeof BASE.SERIES,
    VALUE: f(BASE.VALUE) as typeof BASE.VALUE,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    TITLE_TO_PLOT: sp(BASE.TITLE_TO_PLOT),
    PANEL_GAP: sp(BASE.PANEL_GAP),
    SERIES_LABEL_DROP: sp(BASE.SERIES_LABEL_DROP),
    SERIES_TO_PLOT: sp(BASE.SERIES_TO_PLOT),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    REFERENCE_LABEL_RISE: sp(BASE.REFERENCE_LABEL_RISE),
    VALUE_LABEL_INSET: sp(BASE.VALUE_LABEL_INSET),
    SUBJECT_LABEL_RISE: sp(BASE.SUBJECT_LABEL_RISE),
    SUBJECT_RADIUS: BASE.SUBJECT_RADIUS * typeScale,
    END_RADIUS: BASE.END_RADIUS * typeScale,
    GRID_STROKE: BASE.GRID_STROKE * typeScale,
    REFERENCE_STROKE: BASE.REFERENCE_STROKE * typeScale,
    LINE_STROKE: BASE.LINE_STROKE * typeScale,
    TIE_STROKE: BASE.TIE_STROKE * typeScale,
    REFERENCE_DASH: dash(BASE.REFERENCE_DASH),
    TIE_DASH: dash(BASE.TIE_DASH),
  };
}

export type Row = { year: number; passengers: number; punctuality: number };

/** English: one decimal, no thousands separator — every value here is under 100. */
export function en(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export type PanelInput = {
  key: string;
  /** What the reader is looking at, and its unit, stated once. */
  name: string;
  /** The unit printed beside a value, so no number stands without one. */
  unit: string;
  accent: string;
  values: { year: number; value: number }[];
};

/**
 * Data to coordinates, for a stack of panels sharing one x scale. Pure — no colour, no font, no
 * React. One x scale for the whole stack is what makes the shared time axis honest: the same year
 * lands on the same pixel in every panel, which is the only reason a reader may read one year
 * across both.
 *
 * Each panel gets its OWN y scale, fitted to its own readings and its own reference, then `.nice()`
 * — never a shared one, because these are two different quantities in two different units and a
 * shared scale would be a claim that they are comparable.
 */
export function railGeometry(
  panels: PanelInput[],
  {
    width,
    padding,
    stackTop,
    stackBottom,
    panelGap,
    referenceYear,
    subjectYear,
  }: {
    width: number;
    padding: { right: number; left: number };
    stackTop: number;
    stackBottom: number;
    panelGap: number;
    referenceYear: number;
    subjectYear: number;
  },
) {
  const years = panels[0].values.map((v) => v.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const x = scaleLinear()
    .domain([first, last])
    .range([padding.left, width - padding.right]);

  const bandHeight = (stackBottom - stackTop - panelGap * (panels.length - 1)) / panels.length;
  const laid = panels.map((panel, index) => {
    const top = stackTop + index * (bandHeight + panelGap);
    const bottom = top + bandHeight;
    const reference = panel.values.find((v) => v.year === referenceYear);
    if (!reference)
      throw new Error(`${panel.key}: no reading for the reference year ${referenceYear}`);
    const scale = scaleLinear()
      .domain(extent(panel.values.map((v) => v.value)) as [number, number])
      .nice()
      .range([bottom, top]);
    const domain = scale.domain() as [number, number];
    // A positive series never dips below zero: that would invent room the data does not have.
    if (domain[0] < 0 && Math.min(...panel.values.map((v) => v.value)) >= 0)
      throw new Error(`${panel.key}: a positive series was given a domain floor of ${domain[0]}`);
    const points = panel.values.map((v) => ({ ...v, x: x(v.year), y: scale(v.value) }));
    const subject = points.find((p) => p.year === subjectYear);
    if (!subject) throw new Error(`${panel.key}: no reading for the subject year ${subjectYear}`);
    return {
      ...panel,
      plot: { left: padding.left, right: width - padding.right, top, bottom },
      points,
      subject,
      end: points[points.length - 1],
      reference: { value: reference.value, y: scale(reference.value) },
      // The floor and the ceiling of this panel's own fitted extent, each labelled, so the span is
      // stated and cannot be misread. Never a count of ticks typed here.
      ticksY: domain.map((value) => ({ value, y: scale(value) })),
    };
  });

  return {
    x,
    first,
    last,
    panels: laid,
    // The three years the frame's own argument names, and no others. The motion grammar asks this
    // format for less furniture than a still; the line sheet asks that a reader be able to locate
    // any point the chart annotates. Both are satisfied by exactly these.
    ticksX: [first, subjectYear, last].map((year) => ({ year, x: x(year) })),
  };
}

export type RailVideoProps = {
  data: Row[];
  title: string;
  source: string;
  ground: string;
  /** The passengers panel. `PALETTE.md`'s primary accent. */
  accent: string;
  /** The punctuality panel. `PALETTE.md`'s further house accent, measured against the same ground. */
  secondAccent: string;
  ink: string;
  muted: string;
  grid: string;
  referenceYear: number;
  subjectYear: number;
  timing?: BeatTiming;
  /** The size row this composition was registered from — `Root.tsx` passes it, one per row. */
  size: string;
};

export function RailVideo({
  data,
  title,
  source,
  ground,
  accent,
  secondAccent,
  ink,
  muted,
  grid,
  referenceYear,
  subjectYear,
  timing = RAIL_TIMING,
  size,
}: RailVideoProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // THE TWO STATEMENTS OF THE FRAME, CHECKED AGAINST EACH OTHER. Remotion's is what will be
  // encoded; the row is what gate 2c pinned. They come from different places, so this is a reading
  // the code that drew the frame cannot make agree with itself.
  const row = sizeFor(size);
  if (row.width !== width || row.height !== height)
    throw new Error(
      `this composition renders at ${width}x${height}, but the size it names — ` +
        `${JSON.stringify(size)} — is ${row.width}x${row.height}. Root.tsx registers one ` +
        `composition per row and passes that row's name; the two have come apart.`,
    );
  const { typeScale } = row;
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const t = tokens(typeScale);

  // ── Layout. Identical at every frame: the build changes what is visible, never where anything
  // sits, so nothing shifts when a layer arrives late.
  const titleLines = wrap(title, width - PAD * 2, t.TITLE);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleBaseline = contentTop + t.TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, t.SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * t.SOURCE.lead;

  // The widest y-tick label decides the left gutter — a measurement, never a fixed number.
  const allTickLabels = [
    ...data.map((d) => en(d.passengers)),
    ...data.map((d) => en(d.punctuality)),
  ];
  const gutter =
    Math.max(...allTickLabels.map((label) => measureText(label, t.AXIS))) + t.Y_TICK_INSET;

  const stackTop =
    titleBaseline + (titleLines.length - 1) * t.TITLE.lead + t.TITLE_TO_PLOT + t.SERIES.fontSize;
  const stackBottom =
    sourceBaseline - t.SOURCE.fontSize - t.AXIS_TO_SOURCE - t.X_LABEL_BAND - t.X_TICK_DROP;

  const g = railGeometry(
    [
      {
        key: "passengers",
        name: "Passengers carried (millions)",
        unit: "m",
        accent,
        values: data.map((d) => ({ year: d.year, value: d.passengers })),
      },
      {
        key: "punctuality",
        name: "Trains on time (%)",
        unit: "%",
        accent: secondAccent,
        values: data.map((d) => ({ year: d.year, value: d.punctuality })),
      },
    ],
    {
      width,
      padding: { left: PAD + gutter, right: PAD + t.PLOT_RIGHT_AIR },
      stackTop,
      stackBottom,
      panelGap: t.PANEL_GAP + t.SERIES.fontSize + t.SERIES_TO_PLOT,
      referenceYear,
      subjectYear,
    },
  );

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  const axisOpacity = establish;

  // The reference rule draws left to right, easing OUT — it is a thing arriving, not the traversal
  // of a measured axis, so easing is legal here and illegal on the reveal below.
  const referenceX2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.panels[0].plot.left, g.panels[0].plot.right],
    { easing: Easing.out(Easing.cubic) },
  );
  // Its own label follows its own rule, not a master clock: it appears once the rule it names is
  // most of the way across, and it is positioned on the rule.
  const referenceLabelOpacity = interpolate(referenceProgress, [0.55, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ONE SHARED CHRONOLOGICAL HEAD. Both lines draw from the same progress, so at every frame both
  // panels have reached the same year. That is the argument: these two readings are contemporaneous
  // and they disagree. Linear, because the x axis is time.
  const drawn = g.panels.map((panel) => drawnSoFar(panel.points, reveal));
  const paths = drawn.map((points) =>
    points.length > 1
      ? line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .digits(1)(points)!
      : null,
  );

  // The subject: 2020, landing as its OWN event once both curves are whole. Critically damped —
  // a spring that overshot would show, for a few frames, a value the data does not contain.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectRadius = interpolate(subjectSpring, [0, 1], [0, t.SUBJECT_RADIUS]);
  const tieOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);

  // The conclusion states the two 2025 values, one per panel, at the points they belong to — never
  // a second copy of the title's sentence.
  const endOpacity = interpolate(conclusion, [0, 0.55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // The tie between the two 2020 marks runs from the lower edge of the upper mark to the upper edge
  // of the lower one, so it never draws over either dot.
  const tieTop = g.panels[0].subject.y;
  const tieBottom = g.panels[1].subject.y;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {/* Title and source are UNGATED. Frame 0 is the poster frame — the image a reader sees before
          pressing play and the one a CMS pulls as a thumbnail. Inside the `establish` fade, whose
          progress at frame 0 is exactly 0, the poster is an empty rectangle. */}
      <g>
        {titleLines.map((text, i) => (
          <text
            key={text}
            x={PAD}
            y={titleBaseline + i * t.TITLE.lead}
            fill={ink}
            fontSize={t.TITLE.fontSize}
            fontWeight={t.TITLE.fontWeight}
          >
            {text}
          </text>
        ))}
        {sourceLines.map((text, i) => (
          <text
            key={text}
            x={PAD}
            y={sourceBaseline + i * t.SOURCE.lead}
            fill={muted}
            fontSize={t.SOURCE.fontSize}
          >
            {text}
          </text>
        ))}
      </g>

      {/* Furniture: panel names, y ticks, gridlines, x ticks. One fade, together, then still. */}
      <g opacity={axisOpacity}>
        {g.panels.map((panel) => (
          <g key={`furniture-${panel.key}`}>
            <text
              x={panel.plot.left}
              y={panel.plot.top - t.SERIES_TO_PLOT}
              fill={panel.accent}
              fontSize={t.SERIES.fontSize}
              fontWeight={t.SERIES.fontWeight}
            >
              {panel.name}
            </text>
            {panel.ticksY.map((tick) => (
              <g key={`${panel.key}-${tick.value}`}>
                <line
                  x1={panel.plot.left}
                  x2={panel.plot.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke={grid}
                  strokeWidth={t.GRID_STROKE}
                />
                <text
                  x={panel.plot.left - t.Y_TICK_INSET}
                  y={tick.y + t.Y_TICK_BASELINE_NUDGE}
                  fill={muted}
                  fontSize={t.AXIS.fontSize}
                  textAnchor="end"
                >
                  {en(tick.value, Number.isInteger(tick.value) ? 0 : 1)}
                </text>
              </g>
            ))}
          </g>
        ))}
        {/* ONE x axis for the stack, under the lower panel — the shared time axis is the whole
            reason two panels are legible as one frame. Three years, the three the beat names. */}
        {g.ticksX.map((tick) => (
          <text
            key={tick.year}
            x={tick.x}
            y={g.panels[g.panels.length - 1].plot.bottom + t.X_TICK_DROP + t.AXIS.fontSize}
            fill={muted}
            fontSize={t.AXIS.fontSize}
            textAnchor="middle"
          >
            {tick.year}
          </text>
        ))}
      </g>

      {/* The reference: each panel's own 2014 reading, as a dashed rule, because it is a level the
          argument is read against and not a measurement drawn from the series' extremes. The label
          carries the VALUE only; the year is on the axis, and printing it twice is an anti-pattern. */}
      {referenceProgress > 0
        ? g.panels.map((panel) => (
            <g key={`reference-${panel.key}`}>
              <line
                x1={panel.plot.left}
                x2={referenceX2}
                y1={panel.reference.y}
                y2={panel.reference.y}
                stroke={muted}
                strokeWidth={t.REFERENCE_STROKE}
                strokeDasharray={t.REFERENCE_DASH}
              />
              {/* THE LABEL GOES ON THE SIDE OF THE RULE THE SERIES DOES NOT END ON, and at the
                  end of the rule rather than its middle. Centred on the plot it sat on the
                  evidence — "91.4%" printed straight over the segment climbing into 2020. The side
                  is read off the data: a series ending above its own reference puts the label
                  below the rule, and the other way round. */}
              <text
                x={panel.plot.right}
                y={
                  panel.end.value >= panel.reference.value
                    ? panel.reference.y + t.REFERENCE_LABEL_RISE + t.NOTE.fontSize
                    : panel.reference.y - t.REFERENCE_LABEL_RISE
                }
                fill={muted}
                fontSize={t.NOTE.fontSize}
                textAnchor="end"
                opacity={referenceLabelOpacity}
              >
                {`${en(panel.reference.value)}${panel.unit}`}
              </text>
            </g>
          ))
        : null}

      {/* The evidence. Both series, one shared chronological head. */}
      {g.panels.map((panel, i) =>
        paths[i] ? (
          <path
            key={`path-${panel.key}`}
            d={paths[i]!}
            fill="none"
            stroke={panel.accent}
            strokeWidth={t.LINE_STROKE}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null,
      )}

      {/* The subject: 2020, in both panels, tied together so the reader sees it is ONE year. The
          tie is drawn under the dots and carries no label of its own — the year is on the axis. */}
      {tieOpacity > 0 ? (
        <line
          x1={g.panels[0].subject.x}
          x2={g.panels[0].subject.x}
          y1={tieTop}
          y2={tieBottom}
          stroke={muted}
          strokeWidth={t.TIE_STROKE}
          strokeDasharray={t.TIE_DASH}
          opacity={tieOpacity * 0.75}
        />
      ) : null}
      {g.panels.map((panel) => {
        // The label goes on the side the curve is NOT: 2020 sits in the middle of this series and
        // the line leaves it in both directions, so the label is placed above the mark in the panel
        // where 2020 is the minimum and below it where 2020 is the maximum. Derived from the mark's
        // own position against its panel's extent, never from a typed offset.
        const isLow = panel.subject.y > (panel.plot.top + panel.plot.bottom) / 2;
        const labelY = isLow
          ? panel.subject.y + t.SUBJECT_LABEL_RISE + t.VALUE.fontSize
          : panel.subject.y - t.SUBJECT_LABEL_RISE;
        return (
          <g key={`subject-${panel.key}`} opacity={tieOpacity}>
            <circle
              cx={panel.subject.x}
              cy={panel.subject.y}
              r={subjectRadius}
              fill={panel.accent}
            />
            {/* OFF THE TIE, NOT ON IT. Centred on the mark, both labels sat directly on the
                dashed rule joining the two 2020 dots and the dashes ran through the digits. They
                are set beside the tie instead, on the same side in both panels so the pair reads
                as one annotation about one year. */}
            <text
              x={panel.subject.x + t.VALUE_LABEL_INSET}
              y={labelY}
              fill={panel.accent}
              fontSize={t.VALUE.fontSize}
              fontWeight={t.VALUE.fontWeight}
            >
              {`${en(panel.subject.value)}${panel.unit}`}
            </text>
          </g>
        );
      })}

      {/* The conclusion: each series named where it ends, by its value, in its own accent. The
          series' NAME is already on the panel; what the last point adds is the number. */}
      {endOpacity > 0
        ? g.panels.map((panel) => (
            <g key={`end-${panel.key}`} opacity={endOpacity}>
              <circle cx={panel.end.x} cy={panel.end.y} r={t.END_RADIUS} fill={panel.accent} />
              <text
                x={panel.end.x + t.VALUE_LABEL_INSET}
                y={panel.end.y + t.Y_TICK_BASELINE_NUDGE}
                fill={panel.accent}
                fontSize={t.VALUE.fontSize}
                fontWeight={t.VALUE.fontWeight}
              >
                {`${en(panel.end.value)}${panel.unit}`}
              </text>
            </g>
          ))
        : null}
    </svg>
  );
}
