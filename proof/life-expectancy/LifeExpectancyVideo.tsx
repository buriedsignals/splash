/**
 * The video beat of "Covid cost Switzerland nearly a year of life expectancy — and it took three
 * years to win it back." — 8 seconds, 30fps, 1080 × 1080.
 *
 * Second beat written in this shape (`EmissionsVideo.tsx` is the first): its own pure geometry
 * below (no `crossingGeometry` import — that module's `peak`/`crossing` are beat 1's specific
 * shape, a value climbing to a maximum and later falling back through a level; this beat's shape
 * is different, see below), its own timing contract (`timing-contract.ts`).
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `drawnSoFar` are this story's own copies of
 * `EmissionsVideo.tsx`'s functions of the same name, not an import from it — this story lives
 * outside `chart-video`'s skill boundary now (`proof/life-expectancy/`), and the settled rule
 * for a story that needs something a skill has is to duplicate it, not reach back across the
 * boundary. The bodies are identical on purpose: both are the video genre's browser-Canvas text
 * measurer, not the static genre's resvg one (`#shared/chart-beat/render-still.mjs`) — the
 * two are not interchangeable, so vendoring the wrong one would silently mismeasure.
 *
 * THE MOTION PROBLEM: the confirmed subject is 2020, the dip — but 2020 sits four years before the
 * series ends, not at its tail, and the takeaway's second half ("it took three years to win it
 * back") is only true if the reader has already seen 2021–2024 on screen. A reveal that stopped at
 * 2020 the way beat 1's stops at 2024 would hide the fact the beat exists to state.
 *
 * The fix: `reveal` never stops early. It draws the WHOLE series, 2000 → 2024, in chronological
 * order at constant pace, same as beat 1 — "data arriving is the motion event" governs the reveal
 * regardless of where the subject sits inside it. `subject` is then something beat 1 does not need:
 * a distinct EMPHASIS event that lands on a mark already drawn, not a mark still arriving. By the
 * time it starts, 2023 — the recovery — and 2024 are already on screen, so the accent lands on
 * evidence the reader has already read, never on an empty frame.
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
// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import { progressOf, type BeatTiming } from "#shared/chart-video/timing.ts";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-video/sizes.mjs";
import {
  assertPlotAspect,
  assertTypeMayEnter,
} from "#shared/chart-beat/type-at-size.mjs";
import { LIFE_EXPECTANCY_TIMING } from "./timing-contract";

/** The type this beat draws, in `references/types/` vocabulary — what `formForSize` answers for. */
export const TYPE = "line";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/**
 * The rendered width of a string in the font it will really be drawn in. Chromium's own text
 * measurement, which is the same engine that will draw it — the browser equivalent of the still
 * path's `measureText`. A fixed gutter constant is the defect this removes; the fallback below is
 * only for a context with no DOM, and no frame is ever rendered in one.
 *
 * This story's own copy of `EmissionsVideo.tsx`'s function of the same name — see the file
 * doc-comment for why it is duplicated, not imported.
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
 * Chronological: index 0 is the first reading and the head advances forward in time. Linear,
 * because the x axis IS time — easing this would make some years occupy more screen time than
 * others, which is a lie about the pace of the data (`motion-grammar.md`).
 *
 * This story's own copy of `EmissionsVideo.tsx`'s function of the same name — see the file
 * doc-comment for why it is duplicated, not imported.
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
 * THE TUNING THIS BEAT WAS DRAWN AT, REBASED, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more: the frame is Remotion's own (`useVideoConfig`), which comes
 * from the `<Composition>` this beat is rendered through, and `size` names the row that composition
 * was registered from. Before this the frame was stated in three places — here, in `Root.tsx`, and
 * nowhere at all in `render.mjs` — and nothing downstream of gate 2c read what the journalist chose.
 *
 * THE NUMBERS BELOW ARE THE OLD ONES DIVIDED BY THE SQUARE ROW'S SCALE, AND THAT IS THE DEFECT
 * THIS FILE WAS CARRYING. The shipped tokens were 40 / 22 / 28 / 22 on a 1080x1080 frame. A square
 * video is watched full-bleed on a phone — 360 dp — so 1 frame px is 1/3 of a CSS px and a 22 px
 * axis label is **7.3 CSS px**, against the 11–12 px floor three independent sources converge on
 * (`sizes.mjs`, and `proof/portrait-aspect-probe/MOBILE-FIRST-WIREFRAME.md` §1.1). The base is
 * therefore set from the SMALLEST token: 22 -> 12, and every other token keeps its ratio to it. At
 * the square row's 3.0 that puts the axis on 36 px exactly — the floor, not a margin over it.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts: the gaps, the tick drops, the mark
 * radii, the stroke widths and the dash patterns. Scaling the type and leaving the spacing is what
 * collided a title into a subtitle by 1634x4.5 px in the probe.
 *
 * `PAD` is the one that does NOT go through it — a frame's margin is proportional to the CANVAS,
 * not to the type (`frameInsetFor` states the split).
 */
const BASE = {
  TITLE: { fontSize: 22, fontWeight: 700, lead: 28 },
  SOURCE: { fontSize: 12, fontWeight: 400, lead: 17 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  NOTE: { fontSize: 12, fontWeight: 400 },
  TITLE_TO_PLOT: 25,
  PLOT_RIGHT_AIR: 5,
  X_LABEL_BAND: 15,
  AXIS_TO_SOURCE: 3,
  Y_TICK_INSET: 5,
  Y_TICK_BASELINE_NUDGE: 2,
  X_TICK_DROP: 13,
  REFERENCE_LABEL_RISE: 5,
  SUBJECT_LABEL_DROP: 11,
  SPAN_CEILING_AIR: 13,
  SPAN_RISE: 15,
  SPAN_TICK: 3,
  SPAN_LABEL_RISE: 4,
  SUBJECT_RADIUS: 3.3,
  RECOVERY_RADIUS: 1.7,
  GRID_STROKE: 0.5,
  REFERENCE_STROKE: 0.67,
  LINE_STROKE: 1.33,
  DROP_STROKE: 0.5,
  SPAN_STROKE: 0.5,
  REFERENCE_DASH: [2.7, 2],
  DROP_DASH: [1.33, 1.33],
};
const UNIT = "yrs";

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  const dash = (pair: number[]) =>
    pair.map((v) => (v * typeScale).toFixed(1)).join(" ");
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    LABEL: f(BASE.LABEL) as typeof BASE.LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    TITLE_TO_PLOT: sp(BASE.TITLE_TO_PLOT),
    PLOT_RIGHT_AIR: sp(BASE.PLOT_RIGHT_AIR),
    X_LABEL_BAND: sp(BASE.X_LABEL_BAND),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    REFERENCE_LABEL_RISE: sp(BASE.REFERENCE_LABEL_RISE),
    SUBJECT_LABEL_DROP: sp(BASE.SUBJECT_LABEL_DROP),
    SPAN_CEILING_AIR: sp(BASE.SPAN_CEILING_AIR),
    SPAN_RISE: sp(BASE.SPAN_RISE),
    SPAN_TICK: sp(BASE.SPAN_TICK),
    SPAN_LABEL_RISE: sp(BASE.SPAN_LABEL_RISE),
    SUBJECT_RADIUS: BASE.SUBJECT_RADIUS * typeScale,
    RECOVERY_RADIUS: BASE.RECOVERY_RADIUS * typeScale,
    GRID_STROKE: BASE.GRID_STROKE * typeScale,
    REFERENCE_STROKE: BASE.REFERENCE_STROKE * typeScale,
    LINE_STROKE: BASE.LINE_STROKE * typeScale,
    DROP_STROKE: BASE.DROP_STROKE * typeScale,
    SPAN_STROKE: BASE.SPAN_STROKE * typeScale,
    REFERENCE_DASH: dash(BASE.REFERENCE_DASH),
    DROP_DASH: dash(BASE.DROP_DASH),
  };
}

export type Reading = { year: number; value: number };

/** English: one decimal, no thousands separator — every value in this series is under 100. */
export function en(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

/**
 * Data to coordinates. Pure — no colour, no font, no React — the same discipline
 * `proof/co2-suisse/crossing-geometry.ts` set for beat 1, kept as its own module here because this beat's
 * shape (an interior subject plus a named recovery point) is not that module's shape.
 *
 * The reference (the 2019 level) joins the readings in the fitted extent for the same reason beat
 * 1 does it: a level the beat is measured against must be inside the frame even in years that do
 * not approach it.
 */
export function lifeExpectancyGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
    reference,
    subjectYear,
    recoveryYear,
    topReserve = 0,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
    subjectYear: number;
    recoveryYear: number;
    // Pixels of the plot's own top edge the DATA CURVE never draws into — reserved for the
    // recovery-span bracket + label that sits above the subject/recovery points. Without this, the
    // curve's own peak can land close enough to `plot.top` that there is no longer 44+12px of real
    // headroom above it, and the label's "stay above both points, but never above the ceiling"
    // fallback (see `spanY` below) picks the ceiling — which, when the point is already nearly AT
    // the ceiling, sits BELOW the point instead of above it, right in the path of the line
    // approaching it. Caught by looking at the rendered PNG: "3 years to regain it" struck through
    // by the final rising segment, in both the still and the video's own true final frame — 2023's
    // value (83.95) is the series' own historical peak, close enough to the "niced" domain ceiling
    // that the un-reserved plot left under 20px of headroom above it, far short of the ~56px the
    // annotation needs.
    topReserve?: number;
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

  const yDomain = scaleLinear()
    .domain(
      extent([...data.map((d) => d.value), reference]) as [number, number],
    )
    .nice();
  const ticks = yDomain.domain() as [number, number];
  const ticksY = [ticks[0], reference, ticks[1]];

  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = yDomain.range([plot.bottom, plot.top + topReserve]);

  const points = data.map((d) => ({ ...d, x: x(d.year), y: y(d.value) }));
  const subject = points.find((p) => p.year === subjectYear);
  const recovery = points.find((p) => p.year === recoveryYear);
  if (!subject) throw new Error(`no reading for subject year ${subjectYear}`);
  if (!recovery)
    throw new Error(`no reading for recovery year ${recoveryYear}`);

  return {
    plot,
    points,
    subject,
    recovery,
    referenceY: y(reference),
    ticksY: ticksY.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
}

export type LifeExpectancyVideoProps = {
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
  recoveryYear: number;
  timing?: BeatTiming;
  /** The size row this beat's composition was registered from — `Root.tsx` passes it, one
   *  composition per row. Not a default: a video drawn at a scale nobody chose looks every bit as
   *  deliberate as one drawn in a colour nobody chose. */
  size: string;
};

export function LifeExpectancyVideo({
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
  recoveryYear,
  timing = LIFE_EXPECTANCY_TIMING,
  size,
}: LifeExpectancyVideoProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // THE TWO STATEMENTS OF THE FRAME, CHECKED AGAINST EACH OTHER. Remotion's is what will actually
  // be encoded; the row is what gate 2c pinned. They come from different places — the
  // `<Composition>` registration and `sizes.mjs` — so this is a reading the code that drew the
  // frame cannot make agree with itself, which is the whole point of `assertDeliveredSize` on the
  // still path. A composition registered at the wrong dimensions arrives here, not in the newsroom.
  const row = sizeFor(size);
  if (row.width !== width || row.height !== height)
    throw new Error(
      `this composition renders at ${width}x${height}, but the size it names — ` +
        `${JSON.stringify(size)} — is ${row.width}x${row.height}. Root.tsx registers one ` +
        `composition per row and passes that row's name; the two have come apart.`,
    );
  const { typeScale } = row;
  // The band this beat may draw in. At portrait the platform reserves 14% at the top and 35% at
  // the foot; content there is at RISK OF BEING COVERED, which no frame counter can see, and a
  // covered credit is an attribution failure rather than a cosmetic one.
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const {
    TITLE,
    SOURCE,
    AXIS,
    LABEL,
    NOTE,
    TITLE_TO_PLOT,
    PLOT_RIGHT_AIR,
    X_LABEL_BAND,
    AXIS_TO_SOURCE,
    Y_TICK_INSET,
    Y_TICK_BASELINE_NUDGE,
    X_TICK_DROP,
    REFERENCE_LABEL_RISE,
    SUBJECT_LABEL_DROP,
    SPAN_CEILING_AIR,
    SPAN_RISE,
    SPAN_TICK,
    SPAN_LABEL_RISE,
    SUBJECT_RADIUS,
    RECOVERY_RADIUS,
    GRID_STROKE,
    REFERENCE_STROKE,
    LINE_STROKE,
    DROP_STROKE,
    SPAN_STROKE,
    REFERENCE_DASH,
    DROP_DASH,
  } = tokens(typeScale);
  // The recovery-span bracket sits `SPAN_RISE` above the higher of the subject/recovery points, its
  // label another `SPAN_LABEL_RISE` above the bracket, with the label's own text height on top —
  // the real vertical footprint the annotation needs, reserved out of the plotted data range itself
  // so the curve can never climb close enough to `plot.top` to leave less room than that, whatever
  // the data's own peak year happens to be. Derived from the tokens, so it grows with them.
  const RECOVERY_LABEL_RESERVE =
    SPAN_RISE + SPAN_LABEL_RISE + NOTE.fontSize + AXIS_TO_SOURCE;
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  // ── Layout. Identical at every frame, same as beat 1: the build changes what is visible, never
  // where anything sits, so nothing shifts when a layer arrives late.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND, not under the title — the same edge the title hangs
  // off at the top, on the same x. It stays inside the furniture opacity group, so no timing
  // contract moves: it fades in with the title and is still there at the last frame. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin". It
  // WRAPS now: one line at 22px is three at 36px, and the credit ran off the frame.
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;

  const subjectLabel = `${subjectYear} · ${en(
    data.find((d) => d.year === subjectYear)!.value,
  )} ${UNIT}`;
  // A GRIDLINE IS A POSITION, AND ITS LABEL IS READ AS THAT POSITION EXACTLY. `.nice()` returns
  // [79.5, 84] for this series, and printing the floor with a typed `en(v, 0)` put "80" beside a
  // line drawn at 79.5 — with the 2000 reading (79.834) sitting visibly ABOVE the line labelled 80,
  // on a chart whose entire subject is a 0.72-year move. The precision now comes from the value:
  // as many decimals as it takes to print the bound exactly, never a count typed here. Index 1 is
  // the reference — a DATA reading, legitimately rounded to a tenth like every other value in this
  // beat, so it is the one label this rule does not apply to.
  const exactDecimals = (v: number) => {
    for (let d = 0; d <= 3; d += 1) if (Number(v.toFixed(d)) === v) return d;
    throw new Error(
      `axis bound ${v} needs more than three decimals to print exactly — the scale is not "nice"`,
    );
  };
  // The tripwire, kept separate from the formatting above so it still fires if someone types a
  // fixed decimal count back in: whatever the label ends up saying, reading it as a number must
  // give back the gridline it sits on.
  const boundLabel = (label: string, value: number) => {
    const printed = Number(label.replace(UNIT, "").replace("−", "-").trim());
    if (printed !== value)
      throw new Error(
        `axis bound label ${JSON.stringify(label)} is not the gridline it sits on (${value}) — ` +
          `a rounded bound draws a line at one place and names another`,
      );
    return label;
  };
  // `unitAt` is the index the unit is printed on. It used to be hard-coded to the LAST tick, which
  // is the ceiling — and once the type reached its floor the ceiling's label stopped being drawn at
  // all (see `visibleTicks`), so the unit went with it. The unit now travels to whichever label is
  // topmost among those actually drawn.
  const tickLabelsFor = (values: number[], unitAt = values.length - 1) =>
    values.map((v, i) => {
      if (i === 1) return i === unitAt ? `${en(v, 1)} ${UNIT}` : en(v, 1);
      const label = en(v, exactDecimals(v));
      return boundLabel(i === unitAt ? `${label} ${UNIT}` : label, v);
    });
  const provisionalTicks = tickLabelsFor(
    (() => {
      const g = lifeExpectancyGeometry(data, {
        width,
        height,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        reference,
        subjectYear,
        recoveryYear,
      });
      return g.ticksY.map((t) => t.value);
    })(),
  );
  const padding = {
    // The plot starts below the LAST TITLE LINE, never below the source.
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + TITLE_TO_PLOT,
    right: PAD + PLOT_RIGHT_AIR,
    // Derived from where the credit now sits, not from a constant, so the x-axis label band ends
    // above the credit's first line of ink however many lines the credit wraps to.
    bottom:
      height -
      (sourceBaseline - SOURCE.fontSize - AXIS_TO_SOURCE) +
      X_LABEL_BAND,
    left:
      PAD +
      Y_TICK_INSET +
      Math.max(...provisionalTicks.map((l) => measureText(l, AXIS))),
  };

  const g = lifeExpectancyGeometry(data, {
    width,
    height,
    padding,
    reference,
    subjectYear,
    recoveryYear,
    topReserve: RECOVERY_LABEL_RESERVE,
  });
  // THE PLOT'S OWN SHAPE, REFUSED IF IT IS OUTSIDE WHAT A LINE ARGUES IN.
  //
  // `assertPlotAspect` was written for the static path and was never wired into the video one, and
  // the reason was recorded in this beat's own BRIEF: the delivered square plot measures ~816 x 340
  // = 2.4:1 and portrait's is 2.55:1, both outside the range the table then carried (0.8–1.8), so
  // wiring it would have refused a DELIVERED artifact. That is the correct order — the range was
  // the thing that needed re-measuring, not the beat.
  //
  // Re-measured 2026-08-11 (`proof/aspect-range-probe/ASPECT-VERDICT.md` §6, ten arms swept and
  // opened at the article's regime and six more at the phone's): the range is 0.7–3.6, and both of
  // this beat's delivered plots sit inside it. So the guard goes in, and what it now holds is the
  // thing no counter here can see — a line's SLOPE, which an aspect change destroys while nothing
  // clips and nothing collides.
  //
  // `assertTypeMayEnter` goes in beside it because the two answer different halves of the same
  // question and this beat asked neither: may this type enter this size at all, and is the plot it
  // got the shape the type argues in.
  assertTypeMayEnter(TYPE, size, { what: "life-expectancy" });
  assertPlotAspect(g.plot, TYPE, size, { what: "life-expectancy" });
  // TWO AXIS LABELS THAT SHARE INK ARE ONE UNREADABLE LABEL. This beat's y axis carries exactly
  // three values — the fitted floor, the 2019 reference, and the fitted ceiling — and the reference
  // (83.78) sits 0.22 years under the ceiling (84) on a 4.5-year range. At the shipped 22px type
  // those two baselines were 6px apart and nobody noticed; at the 36px floor a square video is
  // legible at, "83.8" and "84 yrs" were printed on top of each other. So a label is drawn only if
  // its baseline clears the last drawn one by a line of its own type — removal-ladder rung R2,
  // applied to the labels rather than to the ticks, because the ceiling's GRIDLINE is still the
  // plot's top edge and is worth drawing without a number on it.
  const visibleTicks = g.ticksY.reduce<number[]>((kept, tick, i) => {
    if (i === 0) return [0];
    const last = g.ticksY[kept[kept.length - 1]];
    return Math.abs(tick.y - last.y) >= AXIS.fontSize ? [...kept, i] : kept;
  }, []);
  const topmostVisible = visibleTicks.reduce((a, b) =>
    g.ticksY[b].y < g.ticksY[a].y ? b : a,
  );
  const tickLabels = tickLabelsFor(
    g.ticksY.map((t) => t.value),
    topmostVisible,
  );

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  // Furniture: title, source, axis, ticks, gridlines — one fade, together, then still forever.
  // The title is furniture, not the conclusion (`motion-grammar.md`): it establishes what the
  // reader is looking at, and a video whose first seconds carry no title has no poster frame.
  // Renamed from `furnitureOpacity`: it no longer governs the title and source (see the ungated
  // group below), only the axis ticks and gridlines. The old name outlived what it described.
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

  // The WHOLE series, 2000 → 2024 — never stops at the subject. See the file doc-comment: this is
  // the fix for the interior-subject problem, not a compromise on it.
  const drawn = drawnSoFar(g.points, reveal);
  const path =
    drawn.length > 1
      ? line<{ x: number; y: number }>()
          .x((p) => p.x)
          .y((p) => p.y)
          .digits(1)(drawn)!
      : null;

  // The recovery point is context, arriving when the line reaches it during the reveal — the same
  // device beat 1 uses for the 1973 peak. Muted, named, silent about its own value: the value the
  // beat needs to state is 2020's, not 2023's, and a number printed twice is `anti-patterns.md`'s
  // "repeated years or values".
  const recoveryFraction = g.points.indexOf(g.recovery) / (g.points.length - 1);
  const recoveryOpacity = interpolate(
    reveal,
    [recoveryFraction, recoveryFraction + 0.06],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // The subject: 2020, landing as its OWN event once the whole curve — including the recovery and
  // 2024 — is already on screen. Critically damped, same as beat 1's dot: a spring that overshot
  // would show a value for a few frames that the data does not contain.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectRadius = interpolate(subjectSpring, [0, 1], [0, SUBJECT_RADIUS]);
  // A short drop-line from the reference height down to 2020 — landing with the same spring —
  // makes "below the 2019 level" legible as a distance, not just a colour.
  const dropOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);

  // The conclusion states two things in sequence, which is why its window is longer than beat 1's:
  // first the number the subject event just landed on, then the span back to the recovery — never
  // a second copy of the title's own sentence (`motion-grammar.md`).
  const valueOpacity = interpolate(conclusion, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const spanOpacity = interpolate(conclusion, [0.45, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  // Above both points, but never above the ceiling gridline — the label sits on the line
  // otherwise, when the ceiling and the recovery point are close together in value.
  const spanY = Math.max(
    g.plot.top + SPAN_CEILING_AIR,
    Math.min(g.subject.y, g.recovery.y) - SPAN_RISE,
  );
  // THE BRACKET'S LABEL IS CENTRED ON THE BRACKET, AND THE BRACKET IS AT THE RIGHT EDGE. Centring
  // alone put "3 years to regain it" half outside the frame once the type reached its floor — the
  // span runs 2020 → 2023, which is the last three years of the series, so its midpoint is always
  // near `plot.right`. The centre is clamped into the frame's own margins by the label's measured
  // half-width, so the text moves rather than the bracket.
  const spanLabel = `${recoveryYear - subjectYear} years to regain it`;
  const spanLabelHalf = measureText(spanLabel, NOTE) / 2;
  const spanLabelX = Math.min(
    Math.max((g.subject.x + g.recovery.x) / 2, PAD + spanLabelHalf),
    width - PAD - spanLabelHalf,
  );
  // THE SUBJECT'S VALUE LABEL GOES ON THE SIDE THE CURVE IS NOT. Centred under the subject dot it
  // was 200px wide at the shipped type and 300px at the floor, and the series rises to the right of
  // 2020 — so the centred label ran straight through the recovery segment. It is placed against the
  // mark instead: to the LEFT of the dot when the dot sits in the right half of the plot, to the
  // right when it does not. Derived from where the subject actually is, not from an offset.
  const subjectOnRight = g.subject.x > (g.plot.left + g.plot.right) / 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {/* Title and source are UNGATED. Frame 0 is the poster frame — the one image a reader sees
          before pressing play, and the frame a CMS or a social platform pulls as the thumbnail.
          These used to sit inside the `establish` fade, whose progress at frame 0 is exactly 0, so
          the poster was a blank white rectangle: measured at 0.0000% non-ground pixels. The axis
          furniture below keeps its fade — it is the frame the line will be measured in and has
          nothing to say before the line exists. */}
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

      <g opacity={axisOpacity}>
        {g.ticksY.map((tick, i) => (
          <g key={tick.value}>
            {/* A gridline whose label was suppressed is not drawn either. The ceiling's line is
                the plot's top edge and it is decoration — the fact at that height is the recovery
                bracket's own sentence, and this codebase's rule is that a gridline and a fact never
                share a pixel. Drawn unlabelled it ran straight through "3 years to regain it". */}
            {i === 1 || !visibleTicks.includes(i) ? null : (
              <line
                x1={g.plot.left}
                x2={g.plot.right}
                y1={tick.y}
                y2={tick.y}
                stroke={grid}
                strokeWidth={GRID_STROKE}
              />
            )}
            {visibleTicks.includes(i) ? (
              <text
                x={g.plot.left - Y_TICK_INSET}
                y={tick.y + Y_TICK_BASELINE_NUDGE}
                fill={muted}
                fontSize={AXIS.fontSize}
                textAnchor="end"
              >
                {tickLabels[i]}
              </text>
            ) : null}
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

      {/* The reference: a dashed rule, because 2019 is a level the argument is read against, not a
          measurement drawn from the series' own extremes. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.plot.left}
            x2={referenceX2}
            y1={g.referenceY}
            y2={g.referenceY}
            stroke={muted}
            strokeWidth={REFERENCE_STROKE}
            strokeDasharray={REFERENCE_DASH}
          />
          <text
            x={(g.plot.left + g.plot.right) / 2}
            y={g.referenceY - REFERENCE_LABEL_RISE}
            fill={muted}
            fontSize={NOTE.fontSize}
            textAnchor="middle"
            opacity={referenceLabelOpacity}
          >
            {referenceLabel}
          </text>
        </g>
      ) : null}

      {path ? (
        <path
          d={path}
          fill="none"
          stroke={accent}
          strokeWidth={LINE_STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}

      {/* Recovery context: muted, marked, unlabelled — the bracket below names what it is. Its
          value is not the number this beat states; 2020's is. */}
      {recoveryOpacity > 0 ? (
        <circle
          cx={g.recovery.x}
          cy={g.recovery.y}
          r={RECOVERY_RADIUS}
          fill={muted}
          opacity={recoveryOpacity}
        />
      ) : null}

      {/* The drop: how far 2020 sits under the 2019 level, as a distance, not only a colour. */}
      {dropOpacity > 0 ? (
        <line
          x1={g.subject.x}
          x2={g.subject.x}
          y1={g.referenceY}
          y2={g.subject.y}
          stroke={muted}
          strokeWidth={DROP_STROKE}
          strokeDasharray={DROP_DASH}
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

      {/* The conclusion: the 2020 value, then the span back to the recovery — the two facts the
          title's sentence promised, stated once their evidence is on screen. */}
      <text
        x={
          subjectOnRight
            ? g.subject.x - SUBJECT_RADIUS - SPAN_TICK
            : g.subject.x + SUBJECT_RADIUS + SPAN_TICK
        }
        y={g.subject.y + SUBJECT_LABEL_DROP + LABEL.fontSize}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
        textAnchor={subjectOnRight ? "end" : "start"}
        opacity={valueOpacity}
      >
        {subjectLabel}
      </text>

      <g opacity={spanOpacity}>
        <line
          x1={g.subject.x}
          x2={g.subject.x}
          y1={spanY}
          y2={spanY + SPAN_TICK}
          stroke={muted}
          strokeWidth={SPAN_STROKE}
        />
        <line
          x1={g.subject.x}
          x2={g.recovery.x}
          y1={spanY}
          y2={spanY}
          stroke={muted}
          strokeWidth={SPAN_STROKE}
        />
        <line
          x1={g.recovery.x}
          x2={g.recovery.x}
          y1={spanY}
          y2={spanY + SPAN_TICK}
          stroke={muted}
          strokeWidth={SPAN_STROKE}
        />
        <text
          x={spanLabelX}
          y={spanY - SPAN_LABEL_RISE}
          fill={muted}
          fontSize={NOTE.fontSize}
          textAnchor="middle"
        >
          {spanLabel}
        </text>
      </g>
    </svg>
  );
}
