/**
 * The video beat of "Rwanda cut its child mortality rate by three-quarters since 1990" — 8.6
 * seconds, 30fps, 1080 × 1080.
 *
 * TYPE: slope (slopegraph). Its own pure geometry below (`slopeGeometry`, `deconflictLabels`) —
 * not imported from anywhere, because this story lives outside `chart-video`'s skill
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
} from "#shared/chart-video/timing.ts";
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";
import { SLOPE_TIMING } from "./timing-contract";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
const TYPE = "slope";

/**
 * THE 900x560-CONVENTION BASE, WITH THE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. It said `1080 x 1080` here while `Root.tsx` said
 * `width={1080} height={1080}` two files away, with nothing between them, so `size: portrait` on
 * the slot produced a square in silence (`specs/W4-export-sizes.md` §1a).
 *
 * Every spacing number goes through `sp`, not only the fonts. Two font sizes were not tokens at all
 * — `fontSize={20}` at the reference label and `fontSize={26}` at the conclusion, written bare at
 * the mark, which is the static seed's GAP_NOTE defect exactly.
 *
 * The base numbers are the old 1080-square values re-expressed at the convention the table's
 * `typeScale` is written against — smallest token 12, so the row's multiplier lands the smallest
 * drawn type exactly on that row's legibility floor. The old values did not clear it: the credit
 * was 21px on a 1080 frame, 7 CSS px on the phone a square post is read on.
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 31 },
  SOURCE: { fontSize: 13, fontWeight: 400, lead: 16 },
  // AT the floor, not above it, and that is this beat's budget showing. Six countries whose 2023
  // values cluster in the bottom fifth need four deconflicted labels stacked at the plot's foot;
  // every extra pixel of label height pushes that stack further down, towards the credit. 12 x the
  // row's scale IS the row's legibility floor exactly (30 at landscape, 36 at the tall frames), so
  // this is the smallest the type is allowed to be and nothing here goes under it.
  CATEGORY: { fontSize: 12, fontWeight: 600 },
  CAPTION: { fontSize: 14, fontWeight: 700 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  CONCLUSION: { fontSize: 16, fontWeight: 700 },
  TITLE_TO_CAPTION: 26,
  CONCLUSION_RESERVE: 24,
  CAPTION_TO_PLOT: 18,
  GUTTER_AIR: 12,
  X_LABEL_BAND: 18,
  SOURCE_AIR: 6,
  LABEL_INSET: 8,
  LABEL_BASELINE_NUDGE: 4,
  REFERENCE_LABEL_INSET: 7,
  REFERENCE_LABEL_LIFT: 7,
  DOT_R: 3,
  RING_R: 5,
  DASH_REFERENCE: [4, 3],
};

/** Strokes scale but are NOT rounded: a hairline that rounds up stops being a hairline. */
const BASE_STROKE = { axis: 0.6, reference: 0.8, ring: 0.8, line: 1.2 };

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const st = (v: number) => Number((v * typeScale).toFixed(2));
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    CATEGORY: f(BASE.CATEGORY) as typeof BASE.CATEGORY,
    CAPTION: f(BASE.CAPTION) as typeof BASE.CAPTION,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    CONCLUSION: f(BASE.CONCLUSION) as typeof BASE.CONCLUSION,
    TITLE_TO_CAPTION: sp(BASE.TITLE_TO_CAPTION),
    CONCLUSION_RESERVE: sp(BASE.CONCLUSION_RESERVE),
    CAPTION_TO_PLOT: sp(BASE.CAPTION_TO_PLOT),
    GUTTER_AIR: sp(BASE.GUTTER_AIR),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    LABEL_INSET: sp(BASE.LABEL_INSET),
    LABEL_BASELINE_NUDGE: sp(BASE.LABEL_BASELINE_NUDGE),
    REFERENCE_LABEL_INSET: sp(BASE.REFERENCE_LABEL_INSET),
    REFERENCE_LABEL_LIFT: sp(BASE.REFERENCE_LABEL_LIFT),
    DOT_R: sp(BASE.DOT_R),
    RING_R: sp(BASE.RING_R),
    DASH_REFERENCE: BASE.DASH_REFERENCE.map(sp).join(" "),
    STROKE: {
      axis: st(BASE_STROKE.axis),
      reference: st(BASE_STROKE.reference),
      ring: st(BASE_STROKE.ring),
      line: st(BASE_STROKE.line),
    },
  };
}

/**
 * Every `fontSize` the returned element tree actually carries, INCLUDING one written bare at a mark
 * — which this beat had two of. The still path reads the rendered SVG's `font-size` attributes; a
 * video composition's markup only exists inside the browser Remotion drives, so the equivalent
 * reading is the element tree, walked rather than listed.
 */
function fontSizesIn(node: unknown, out: number[] = []): number[] {
  if (Array.isArray(node)) {
    for (const child of node) fontSizesIn(child, out);
    return out;
  }
  if (!node || typeof node !== "object") return out;
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return out;
  if (typeof props.fontSize === "number") out.push(props.fontSize);
  fontSizesIn(props.children, out);
  return out;
}
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/**
 * The collision floor between two side-gutter category labels, DERIVED from the label's own drawn
 * size rather than typed. It was `26` against a 23px label — 1.13 of it — so the ratio was the fact
 * and the pixel was a coincidence: at landscape the label is 35px and two labels 26px apart overlap
 * while a guard reading that literal calls them clear.
 */
export function labelMinGapFor(categoryFontSize: number): number {
  return Math.round(categoryFontSize * 1.13);
}

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
    labelMinGap,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
    /** The side-gutter label collision floor, derived from the drawn label size — travels with the
     *  call so the geometry and the drawing cannot disagree about it. */
    labelMinGap: number;
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
    labelMinGap,
  );
  const left2023 = deconflictLabels(
    lines.map((l) => ({ key: l.country, y: l.y2023 })),
    labelMinGap,
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
  /** The export size gate 2c pinned, recorded in this beat's own `BRIEF.md` front matter. */
  size: string;
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
  size,
  timing = SLOPE_TIMING,
}: SlopeVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const { TITLE, SOURCE, CATEGORY, CAPTION } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL — before anything is measured.
  //
  // A slope's value axis is a continuum and its two ends are fixed points in time, so it has no
  // twin form; and no aspect range has ever been MEASURED for it at a tall or square frame. The
  // default in `type-at-size.mjs` is refusal for exactly that reason — a slope's argument IS the
  // angle of its lines, and stretching the frame changes every angle while clipping nothing and
  // colliding with nothing. The composition exists at all three sizes so the refusal is a sentence
  // rather than a missing id.
  const form = formForSize(TYPE, size);
  if (form.verdict !== "as-is")
    throw new Error(
      `vidx-slope-child-mortality: ${TYPE} cannot be drawn at ${size}. ${form.reason}\n` +
        `It ships at landscape.`,
    );

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — the LAST line lands on
  // `height - PAD`, the same inset the title hangs off at the top, on the same x. It stays inside
  // the furniture opacity group, so no timing contract moves. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD - (sourceLines.length - 1) * SOURCE.lead;
  // The caption keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const captionBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_CAPTION;

  const CONCLUSION_RESERVE = T.CONCLUSION_RESERVE;
  const longestLabel = Math.max(
    ...data.map((d) => measureText(d.country, CATEGORY)),
  );
  const padding = {
    top: captionBaseline + CONCLUSION_RESERVE + T.CAPTION_TO_PLOT,
    right: PAD + T.GUTTER_AIR + longestLabel,
    // Grown by the credit block's own height plus clear air.
    bottom:
      PAD +
      T.X_LABEL_BAND +
      (sourceLines.length - 1) * SOURCE.lead +
      SOURCE.fontSize +
      T.SOURCE_AIR,
    left: PAD + T.GUTTER_AIR + longestLabel,
  };

  const g = slopeGeometry(data, {
    width,
    height,
    padding,
    reference,
    labelMinGap: labelMinGapFor(CATEGORY.fontSize),
  });
  const subjectIndex = data.findIndex((d) => d.country === subjectCountry);
  const subjectLine = g.lines[subjectIndex];

  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subjectProgress = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title and the source are on screen at FRAME ZERO, at full opacity, never faded in.
  // Extracting frame 0 from this beat's mp4 returned a completely blank white image — measured,
  // not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and everything
  // gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform pulls as the
  // thumbnail before anyone presses play, and a blank poster frame is a beat that says nothing.
  // The period captions and their two rules still fade in over `establish` — they are the frame
  // the slopes will be read in, and they have nothing to say before the lines exist.
  const axisOpacity = establish;

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

  const drawing = (
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
            y={sourceBaseline + i * SOURCE.lead}
            fill={muted}
            fontSize={SOURCE.fontSize}
          >
            {text}
          </text>
        ))}
      </g>

      {/* Each period's own caption and its rule — the frame the slopes will be read in, faded in
          over `establish` rather than present at frame 0. A slope chart with unlabelled ends
          states half its claim (`slope.md`). */}
      <g opacity={axisOpacity}>
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
          strokeWidth={T.STROKE.axis}
        />
        <line
          x1={g.plot.right}
          x2={g.plot.right}
          y1={g.plot.top}
          y2={g.plot.bottom}
          stroke={grid}
          strokeWidth={T.STROKE.axis}
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
            strokeWidth={T.STROKE.reference}
            strokeDasharray={T.DASH_REFERENCE}
          />
          {/* Left-anchored, not centred: Brazil's own connector crosses the 2.5% target around
              78% of the way across the plot (`BRIEF.md`'s exact values put the crossing near the
              right side) — a centred label sat directly under that diagonal, reading as struck
              through. The left fifth of the plot is clear: every line is still well above or
              below 2.5% there. */}
          <text
            x={g.plot.left + T.REFERENCE_LABEL_INSET}
            y={g.referenceY - T.REFERENCE_LABEL_LIFT}
            fill={muted}
            fontSize={T.NOTE.fontSize}
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
        const strokeWidth = isSubject
          ? T.STROKE.line * 2.5
          : T.STROKE.line * 1.56;
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
                r={T.DOT_R}
                fill={stroke}
                opacity={leftDotOpacity}
              />
            ) : null}
            {rightDotOpacity > 0 ? (
              <circle
                cx={g.plot.right}
                cy={line.y2023}
                r={T.DOT_R}
                fill={stroke}
                opacity={rightDotOpacity}
              />
            ) : null}
            {isSubject && subjectSpring > 0 ? (
              <>
                <circle
                  cx={g.plot.left}
                  cy={line.y1990}
                  r={T.RING_R}
                  fill="none"
                  stroke={ink}
                  strokeWidth={T.STROKE.ring}
                  opacity={subjectSpring}
                />
                <circle
                  cx={g.plot.right}
                  cy={line.y2023}
                  r={T.RING_R}
                  fill="none"
                  stroke={ink}
                  strokeWidth={T.STROKE.ring}
                  opacity={subjectSpring}
                />
              </>
            ) : null}
            <text
              x={g.plot.left - T.LABEL_INSET}
              y={ly1990 + T.LABEL_BASELINE_NUDGE}
              fill={labelColor}
              fontWeight={labelWeight}
              fontSize={CATEGORY.fontSize}
              textAnchor="end"
              opacity={leftDotOpacity}
            >
              {line.country}
            </text>
            <text
              x={g.plot.right + T.LABEL_INSET}
              y={ly2023 + T.LABEL_BASELINE_NUDGE}
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
        fontSize={T.CONCLUSION.fontSize}
        fontWeight={700}
        textAnchor="start"
        opacity={conclusionOpacity}
      >
        {conclusionLabel}
      </text>
    </svg>
  );

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor — read off the element
  // tree rather than a list of tokens, so a size written bare at a mark cannot escape it. This beat
  // had two.
  assertTypeFloor(
    fontSizesIn(drawing)
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidx-slope-child-mortality at ${size}` },
  );

  return drawing;
}
