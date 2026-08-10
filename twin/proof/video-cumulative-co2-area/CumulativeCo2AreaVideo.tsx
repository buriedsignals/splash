/**
 * The video beat of "More than half of Switzerland's all-time CO₂ has been emitted since 1986." —
 * 8 seconds, 30fps, 1080 × 1080.
 *
 * Fourth beat written in this shape. Its own pure geometry below (no import of
 * `crossingGeometry`/`lifeExpectancyGeometry`/`migrationGeometry` — this beat's shape is
 * genuinely different from all three: an AREA, not a line, so the value axis is forced to zero
 * (`twin-chart-beat/references/types/area.md`: "the AREA is what a reader measures") rather than
 * fitted to the readings the way a line's honest scale is (`anti-patterns.md`'s bar-half of the
 * zero-baseline rule, not the line-half)). Its own timing contract (`timing-contract.ts`), reusing
 * the browser-Canvas `measureText`/`wrap`/`drawnSoFar` shape from `EmissionsVideo.tsx` (duplicated,
 * not imported — this story lives outside `twin-chart-video`'s skill boundary, in `proof/`, and
 * the settled rule for a story that needs something a skill has is to duplicate it, not reach back
 * across the boundary).
 *
 * THE MOTION PROBLEM (BRIEF.md, "The motion problem"): the claim is a threshold crossing inside a
 * monotonically rising fill — structurally close to `co2-suisse`'s crossing (a reference level,
 * drawn first, that the series later passes), except the reference here is derived FROM the
 * series' own final value (half of the 2024 total), not an external fact, and the series never
 * comes back down: it is a filled area, not a line that can re-cross a rule. The subject — 1986 —
 * sits about three-quarters of the way through the series by YEAR COUNT but nowhere near half of
 * the fill's eventual AREA (the fill is thin for a century, then steepens), so — the same fix
 * `life-expectancy`'s contract uses for its own interior subject — `reveal` draws the WHOLE fill,
 * 1858 → 2024, chronologically, before `subject` ever starts. `subject` then lands on 1986 as a
 * distinct emphasis event, on a mark that has already been on screen since `reveal` finished,
 * never on an empty frame.
 */

import { line } from "d3-shape";
import { scaleLinear } from "d3-scale";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import {
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
} from "#shared/twin-chart-video/sizes.mjs";
import { formForSize } from "#shared/twin-chart-beat/type-at-size.mjs";
import { CUMULATIVE_CO2_AREA_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
const TYPE = "area";

/**
 * Every `fontSize` the returned element tree actually carries, INCLUDING one written bare at a mark.
 *
 * The still path measures the rendered SVG's own `font-size` attributes (`assertTypeFloor` in
 * `sizes.mjs`). A video beat writes no SVG to disk — Remotion hands back a PNG or an mp4 — so the
 * equivalent reading is the element tree this component is about to return. It is the same
 * property being measured, one step earlier: a token that was scaled correctly and a literal that
 * was left at its 1080-square value are indistinguishable to the scale and distinguishable here.
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

/**
 * The rendered width of a string in the font it will really be drawn in. Chromium's own text
 * measurement, which is the same engine that will draw it — the browser equivalent of the still
 * path's `measureText`. This story's own copy of `EmissionsVideo.tsx`'s function of the same
 * name — see the file doc-comment for why it is duplicated, not imported.
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
 * smoothly instead of jumping from reading to reading.
 *
 * Chronological: index 0 is 1858 and the head advances forward in time. Linear, because the x
 * axis IS time — easing this would make some years occupy more screen time than others, which is
 * a lie about the pace of the data (`motion-grammar.md`). This story's own copy of
 * `EmissionsVideo.tsx`'s function of the same name.
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
 * THE 900x560-CONVENTION BASE, WITH THE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * These were seven named constants and thirteen further bare literals, all tuned at 1080x1080 —
 * `+ 60` between the header and the plot, `+ 14` at the tick inset, `- 20` above the subject's
 * label, and so on. `specs/W4-export-sizes.md` §2 is explicit that those literals are as much
 * 900x560 tuning as the font sizes are: scaling the type and leaving them is what collided the
 * title into the subtitle on the static probe's first run. So every spacing number in this file
 * goes through `sp`, and none is written at a mark.
 *
 * The base numbers are the old 1080-square values re-expressed at the convention the table's
 * `typeScale` is written against — smallest token 12, so the row's own multiplier (2.5 landscape,
 * 3.0 square and portrait in `twin-chart-video`'s copy) lands the smallest drawn type exactly on
 * that row's legibility floor (30 and 36). The old values did NOT clear it: this beat drew its
 * axis at 22px on a 1080 frame, which is 7.3 CSS px on the phone a square post is read on, against
 * a 12 CSS px floor three independent sources converge on. The type is bigger now because it was
 * illegible, not because the frame grew.
 *
 * `PAD` is the one number that does NOT come from here: a frame's margin is proportional to the
 * CANVAS, not to the type, and `frameInsetFor` states that split.
 */
const BASE = {
  TITLE: { fontSize: 22, fontWeight: 700, lead: 28 },
  SOURCE: { fontSize: 12, fontWeight: 400 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  HEADER_TO_PLOT: 33,
  END_LABEL_AIR: 9,
  X_LABEL_BAND: 24,
  SOURCE_AIR: 5,
  Y_TICK_INSET: 8,
  Y_TICK_BASELINE_NUDGE: 4,
  X_TICK_DROP: 21,
  REFERENCE_LABEL_INSET: 2,
  REFERENCE_LABEL_DROP: 19,
  SUBJECT_LABEL_DX: 9,
  SUBJECT_LABEL_DY: 11,
  SUBJECT_RADIUS: 6,
  CONCLUSION_DX: 9,
  CONCLUSION_DY: 5,
  DASH_REFERENCE: [4, 3],
  DASH_DROP: [2, 2],
};

/** Strokes are scaled but NOT rounded: a hairline that rounds to 2px stops being a hairline, and
 *  SVG takes a sub-pixel width perfectly well. The base is the drawn width at landscape. */
const BASE_STROKE = { grid: 0.6, reference: 0.8, edge: 1.2, drop: 0.6 };

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
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    LABEL: f(BASE.LABEL) as typeof BASE.LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    END_LABEL_AIR: sp(BASE.END_LABEL_AIR),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    REFERENCE_LABEL_INSET: sp(BASE.REFERENCE_LABEL_INSET),
    REFERENCE_LABEL_DROP: sp(BASE.REFERENCE_LABEL_DROP),
    SUBJECT_LABEL_DX: sp(BASE.SUBJECT_LABEL_DX),
    SUBJECT_LABEL_DY: sp(BASE.SUBJECT_LABEL_DY),
    SUBJECT_RADIUS: sp(BASE.SUBJECT_RADIUS),
    CONCLUSION_DX: sp(BASE.CONCLUSION_DX),
    CONCLUSION_DY: sp(BASE.CONCLUSION_DY),
    DASH_REFERENCE: BASE.DASH_REFERENCE.map(sp).join(" "),
    DASH_DROP: BASE.DASH_DROP.map(sp).join(" "),
    STROKE: {
      grid: st(BASE_STROKE.grid),
      reference: st(BASE_STROKE.reference),
      edge: st(BASE_STROKE.edge),
      drop: st(BASE_STROKE.drop),
    },
  };
}

const UNIT = "Mt";

export type Reading = { year: number; mt: number };

/** English, thousands-separated: this series can run into the low thousands (the 2024 all-time
 *  total is ≈ 3,158 Mt), unlike `life-expectancy`'s and `migration`'s series, which never leave
 *  two digits. */
export function en(value: number, decimals = 0): string {
  // Delegated to `Intl` rather than hand-rolled. This copy's output was CORRECT — fuzzed against
  // the old regex over 20,000 random values plus every edge case in the series, zero differences —
  // but the mechanism is the one that produced three separate defects elsewhere in this tree: a
  // sibling regex missing its `g` flag grouped only the first thousand ("1 234567,0"), another
  // emitted a breakable U+0020 where French typography needs U+202F, and three more skipped
  // grouping entirely under a name that claimed a locale. A rule the platform owns cannot drift
  // back into any of those. Guarded by `number-format-honest.test.ts`, which found this copy.
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Data to coordinates. Pure — no colour, no font, no React — same discipline as the other three
 * beats' geometry modules, its own module because this beat's axis rule is different: the value
 * axis is forced to zero (`area.md`: "the AREA is what a reader measures"), never fitted to the
 * readings the way a line's honest scale is.
 */
export function cumulativeAreaGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
    reference,
    subjectYear,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
    subjectYear: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const years = data.map((d) => d.year);
  const first = Math.min(...years);
  const last = Math.max(...years);

  // Zero baseline, non-negotiable for an area fill: the domain floor is 0, never fitted to the
  // readings the way a line's scale is. The ceiling is niced from the larger of the data's own
  // max and the reference, so the reference rule always sits inside the frame.
  const yDomain = scaleLinear()
    .domain([0, Math.max(...data.map((d) => d.mt), reference)])
    .nice();
  const ticks = yDomain.domain() as [number, number];
  const ticksY = [ticks[0], reference, ticks[1]];

  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = yDomain.range([plot.bottom, plot.top]);

  const points = data.map((d) => ({ ...d, x: x(d.year), y: y(d.mt) }));
  const subject = points.find((p) => p.year === subjectYear);
  if (!subject) throw new Error(`no reading for subject year ${subjectYear}`);

  return {
    plot,
    points,
    subject,
    zeroY: y(0),
    referenceY: y(reference),
    ticksY: ticksY.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
}

/**
 * The filled region under the drawn portion of the curve, closed down to the zero baseline at
 * both ends — the fill IS the claim (`area.md`), so its polygon is built by its own function,
 * never inlined where the top-edge stroke path is built.
 */
function areaPathFor(
  drawn: { x: number; y: number }[],
  zeroY: number,
): string | null {
  if (drawn.length === 0) return null;
  const first = drawn[0];
  const top = drawn.map((p) => `${p.x} ${p.y}`).join(" L ");
  const lastPoint = drawn[drawn.length - 1];
  return `M ${first.x} ${zeroY} L ${top} L ${lastPoint.x} ${zeroY} Z`;
}

export type CumulativeCo2AreaVideoProps = {
  data: Reading[];
  title: string;
  source: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  reference: number;
  referenceLabel: string;
  subjectYear: number;
  /** The export size gate 2c pinned, recorded in this beat's own `BRIEF.md` front matter and read
   *  back by `render.mjs`. Not a default: `sizeFor` throws naming all three. */
  size: string;
  timing?: BeatTiming;
};

export function CumulativeCo2AreaVideo({
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
  subjectYear,
  size,
  timing = CUMULATIVE_CO2_AREA_TIMING,
}: CumulativeCo2AreaVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  // `sizeFor` throws naming all three rather than defaulting, so a size nobody exports cannot draw.
  const { width, height, typeScale } = sizeFor(size);
  const PAD = frameInsetFor(size);

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL — before anything is measured.
  //
  // An area's x axis is a CONTINUUM and its argument is the shape of an accumulation, so it has no
  // twin form to transpose into and no measured aspect range at a tall or square frame. The probe
  // proved that drawing it there anyway is the one defect no counter in this project can see: zero
  // clipped runs, zero collisions, and a destroyed shape (`portrait-aspect-probe/PORTRAIT-VERDICT.md`).
  // The composition still EXISTS at all three sizes — a size with no composition cannot be rendered
  // at all, whatever a component does — and the two this type cannot draw refuse here, loudly,
  // naming the measurement that is missing and the size that works.
  const form = formForSize(TYPE, size);
  if (form.verdict === "refuse")
    throw new Error(
      `video-cumulative-co2-area: ${TYPE} cannot be drawn at ${size}. ${form.reason}\n` +
        `It ships at landscape.`,
    );
  const {
    TITLE,
    SOURCE,
    AXIS,
    LABEL,
    NOTE,
    HEADER_TO_PLOT,
    END_LABEL_AIR,
    X_LABEL_BAND,
    SOURCE_AIR,
    Y_TICK_INSET,
    Y_TICK_BASELINE_NUDGE,
    X_TICK_DROP,
    REFERENCE_LABEL_INSET,
    REFERENCE_LABEL_DROP,
    SUBJECT_LABEL_DX,
    SUBJECT_LABEL_DY,
    SUBJECT_RADIUS,
    CONCLUSION_DX,
    CONCLUSION_DY,
    DASH_REFERENCE,
    DASH_DROP,
    STROKE,
  } = tokens(typeScale);

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves: it fades in with the title and is still there at
  // the last frame. See twin-chart-beat/references/static-discipline.md, "The source on the
  // frame's bottom margin".
  const sourceBaseline = height - PAD;

  const endReading = data[data.length - 1];
  const endLabel = `${endReading.year} · ${en(endReading.mt)} ${UNIT} total`;
  const tickLabelsFor = (values: number[]) =>
    values.map((v, i, all) =>
      i === all.length - 1 ? `${en(v)} ${UNIT}` : en(v),
    );
  const provisionalTicks = tickLabelsFor(
    (() => {
      const g = cumulativeAreaGeometry(data, {
        width,
        height,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        reference,
        subjectYear,
      });
      return g.ticksY.map((t) => t.value);
    })(),
  );
  const padding = {
    // The plot starts below the LAST TITLE LINE, never below the source.
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + HEADER_TO_PLOT,
    right: PAD + END_LABEL_AIR + measureText(endLabel, LABEL),
    // Grown by the credit's own height plus clear air, so the x-axis label band ends above it.
    bottom: PAD + X_LABEL_BAND + SOURCE.fontSize + SOURCE_AIR,
    left:
      PAD +
      Y_TICK_INSET +
      Math.max(...provisionalTicks.map((l) => measureText(l, AXIS))),
  };

  const g = cumulativeAreaGeometry(data, {
    width,
    height,
    padding,
    reference,
    subjectYear,
  });
  const tickLabels = tickLabelsFor(g.ticksY.map((t) => t.value));
  const endPoint = g.points[g.points.length - 1];

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title and the source are on screen at FRAME ZERO, at full opacity, never faded in.
  // Extracting frame 0 from this beat's mp4 returned a completely blank white image — measured,
  // not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and everything
  // gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform pulls as the
  // thumbnail before anyone presses play, and a blank poster frame is a beat that says nothing.
  // `motion-grammar.md` already argues the title is furniture that establishes what the reader is
  // looking at; taken literally that means it cannot be absent at the start.
  // The axis furniture still fades in over `establish` — it is the frame the data will be measured
  // in, and it has nothing to say before the data does.
  const axisOpacity = establish;

  const referenceX2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.left, g.plot.right],
    { easing: Easing.out(Easing.cubic) },
  );
  const referenceLabelOpacity = interpolate(
    referenceProgress,
    [0.55, 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // The whole fill, 1858 → 2024, chronological, constant pace — thin for a century, then
  // steepening, because that is genuinely the shape of the data, not a styling choice. The fill
  // and its own top edge arrive TOGETHER, as one event: the area is the evidence, and its outline
  // is not a second fact landing on its own schedule.
  const drawn = drawnSoFar(g.points, reveal);
  const areaPath = areaPathFor(drawn, g.zeroY);
  const edgePath =
    drawn.length > 1
      ? line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .digits(1)(drawn)!
      : null;

  // The subject: 1986, landing as its OWN event once the whole fill — including the 2024 total —
  // is already on screen. Critically damped, the same spring every beat in this shape uses: a dot
  // that overshot would show a value for a few frames the data does not contain.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectRadius = interpolate(subjectSpring, [0, 1], [0, SUBJECT_RADIUS]);
  // The drop: from the reference height down to 1986's own point on the fill — the same device
  // `life-expectancy` uses to make "right at this level" legible as a distance, not just a colour.
  const dropOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);
  const subjectLabelOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);

  // The conclusion: the 2024 total, stated once the point carrying it has landed — the assertion
  // that closes the argument, not a second copy of the title's own sentence. Together with the
  // subject's own "1986" label, both facts the title's sentence promised are legible at the hold.
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

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
        <text
          x={PAD}
          y={sourceBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {source}
        </text>
      </g>

      {/* Axis ticks and gridlines — the frame the data will be measured in, faded in over
          `establish` rather than present at frame 0. */}
      <g opacity={axisOpacity}>
        {g.ticksY.map((tick, i) => (
          <g key={tick.value}>
            {/* The middle tick IS the reference; its rule is drawn on its own, dashed, in its own
                event. One line, not two. */}
            {i === 1 ? null : (
              <line
                x1={g.plot.left}
                x2={g.plot.right}
                y1={tick.y}
                y2={tick.y}
                stroke={grid}
                strokeWidth={STROKE.grid}
              />
            )}
            <text
              x={g.plot.left - Y_TICK_INSET}
              y={tick.y + Y_TICK_BASELINE_NUDGE}
              fill={muted}
              fontSize={AXIS.fontSize}
              textAnchor="end"
            >
              {tickLabels[i]}
            </text>
          </g>
        ))}
        {g.ticksX.map((tick) => (
          <text
            key={tick.year}
            x={tick.x}
            y={g.plot.bottom + X_TICK_DROP}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {tick.year}
          </text>
        ))}
      </g>

      {/* The reference: a dashed rule, because it is a level derived from the series' own final
          value (half its 2024 total), not a measurement read off any single year. The label
          states what "half" means in words; the number itself is the middle y-tick, stated once
          (`anti-patterns.md`, "repeated years or values"). Left-aligned near the plot's own left
          edge, not centred across the whole plot the way the seed's is: this fill is thin for a
          century and only steepens near the end, so the plot's horizontal centre sits almost
          directly under where the curve is already climbing through the reference height — a
          centred label's tail would run into the rising fill. Near the left edge, the fill is
          barely off the baseline, and stays clear. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.plot.left}
            x2={referenceX2}
            y1={g.referenceY}
            y2={g.referenceY}
            stroke={muted}
            strokeWidth={STROKE.reference}
            strokeDasharray={DASH_REFERENCE}
          />
          <text
            x={g.plot.left + REFERENCE_LABEL_INSET}
            y={g.referenceY + REFERENCE_LABEL_DROP}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="start"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {/* The fill IS the claim: the entire accumulated stock, 1858 → 2024, against a zero
          baseline (`area.md`). Moderate opacity so the axis, gridlines and the reference rule
          stay legible through it. */}
      {areaPath ? <path d={areaPath} fill={accent} opacity={0.55} /> : null}
      {/* The top edge, drawn crisp and full-strength on top of the fill so the fill never fuses
          with the ground into one shape with no seam (`area.md`, "the one thing that goes
          wrong"). */}
      {edgePath ? (
        <path
          d={edgePath}
          fill="none"
          stroke={accent}
          strokeWidth={STROKE.edge}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {/* The drop: how the fill's own height at 1986 sits right at the reference level — a
          distance, not just a colour. */}
      {dropOpacity > 0 ? (
        <line
          x1={g.subject.x}
          x2={g.subject.x}
          y1={g.referenceY}
          y2={g.subject.y}
          stroke={muted}
          strokeWidth={STROKE.drop}
          strokeDasharray={DASH_DROP}
          opacity={dropOpacity * 0.7}
        />
      ) : null}

      {subjectRadius > 0 ? (
        <circle
          cx={g.subject.x}
          cy={g.subject.y}
          r={subjectRadius}
          fill={accent}
        />
      ) : null}
      {/* The subject's own label, above and to the LEFT of the dot. Left, because to the right
          the fill keeps rising for decades and would soon overlap a label centred or
          right-aligned there; to the left the fill is lower at every x (monotonic), so that is
          where the blank ground actually is. Above, and not at the dot's own height, because
          1986's value sits almost exactly ON the reference level — that is what "the year it
          crosses" means — so a label at the dot's height would sit on top of the dashed rule and
          crowd the reference label's own text right beside it; 20px above clears both. */}
      <text
        x={g.subject.x - SUBJECT_LABEL_DX}
        y={g.subject.y - SUBJECT_LABEL_DY}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        textAnchor="end"
        opacity={subjectLabelOpacity}
      >
        {subjectYear}
      </text>

      {/* The conclusion: the 2024 total, stated once the point carrying it has landed. */}
      <text
        x={endPoint.x + CONCLUSION_DX}
        y={endPoint.y + CONCLUSION_DY}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        opacity={conclusionOpacity}
      >
        {endLabel}
      </text>
    </svg>
  );

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor.
  //
  // The still path hands `assertTypeFloor` the rendered SVG's own `font-size` attributes. A video
  // composition's markup only exists inside the browser Remotion drives, so the equivalent reading
  // is the element tree above — walked, not listed, because a list re-states the tokens and the
  // defect this closes is a token that was never listed: the static seed's `GAP_NOTE` was
  // `fontSize={12}` written bare at a mark, unscaled, and no assertion saw it. The walk sees it.
  assertTypeFloor(
    fontSizesIn(drawing)
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `video-cumulative-co2-area at ${size}` },
  );

  return drawing;
}
