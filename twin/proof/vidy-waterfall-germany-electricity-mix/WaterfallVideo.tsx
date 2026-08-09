/**
 * The video beat of "Germany's electricity generation fell as coal and nuclear losses outpaced
 * renewable growth, 2010–2023." — ~10.5 seconds, 30fps, 1080 × 1080.
 *
 * First waterfall written in this shape. Ten bars: an opening total (2010, full bar from zero),
 * eight signed steps (one per electricity source, each floating from exactly where the previous one
 * ended), and a closing total (2023, full bar from zero). This file's geometry
 * (`waterfallGeometry` below) is a fresh shape, not a copy of any prior beat's — a RUNNING TOTAL
 * walked left to right, not a traced time series or a set of paired rows. `FONT_FAMILY`,
 * `measureText` and `wrap` ARE this story's own copies of the other proof workspaces' functions of
 * the same name — not an import from any of them, per the duplicate-do-not-link rule
 * (`../video-population-growth-dumbbell/DumbbellVideo.tsx`'s file doc-comment explains why: this
 * story lives outside `twin-chart-video`'s skill boundary, and the settled rule for a workspace
 * that needs something a skill has is to duplicate it, not reach back across the boundary).
 * `drawnSoFar` is not copied here — nothing in this beat traces a continuously-drawing path; every
 * bar's edge interpolates between two fixed data values, so there is no partial-path head to
 * compute.
 *
 * 1080×1080 (the corpus's own convention, `DumbbellVideo.tsx`'s square) rather than a wide short
 * frame: ten bars fit comfortably in the ~936px of usable width once padding is subtracted, so
 * there was no real reason to deviate — a wide frame would mostly have bought unused width, not
 * legibility this beat needs.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): a waterfall's whole point is a running total walked step
 * by step, and the reveal's order is chronological/argumentative BY CONSTRUCTION — this type does
 * NOT get the "maybe a build adds nothing" pass the still-shaped types get. The opening total lands
 * first, as a full bar from zero, doubling as the reference the rest of the bridge is read against
 * (`reference`). Each signed step then floats in, one at a time, left to right, starting exactly
 * where the previous one's bar ended — a connector makes that literal (`reveal`). The closing
 * total — the subject, since the confirmed takeaway is about it — lands as its own distinct final
 * event, again a full bar from zero, so it can be compared directly against the opening bar's
 * height (`subject`). The net change is stated once the closing total is on screen (`conclusion`).
 *
 * COLOUR: the waterfall type doctrine (`twin-chart-beat/references/types/waterfall.md`) requires
 * THREE role colours — increase, decrease, total — where a dumbbell or a single-line beat only ever
 * needs one accent. `BRIEF.md` justifies the Okabe-Ito blue/vermillion pair (CVD-distinguishable,
 * never a plain red/green) and the neutral grey `total` colour (deliberately off that hue axis, so
 * it reads as "the anchor," not a third signed colour). The subject's own emphasis (once the 2023
 * bar lands) is therefore a FOURTH channel that is NOT a fourth hue — an ink outline plus a wash in
 * the already-spent `total` colour, the same "third channel, never a third hue" device
 * `../video-population-growth-dumbbell/DumbbellVideo.tsx`'s doc-comment names for its own subject
 * emphasis.
 *
 * VALUE LABELS: never painted inside a bar's own fill — `waterfall.md` names this exact trap by
 * name (a white label on a bright decrease fill measuring under 4:1), and
 * `twin-doctrine/references/visual-system.md` independently documents the same defect having
 * shipped and been fixed on "waterfall's own value labels" before. Every value label here floats
 * just outside the bar's CURRENTLY-ANIMATING edge, in `ink`, computed against the page ground —
 * never inherited from whichever of the three role colours the bar underneath happens to be. Each
 * label fades in within the first quarter of its own bar's local reveal window and then RIDES the
 * growing tip's position as the bar continues to extend, rather than gating on the last slice of
 * the growth — `visual-system.md` and `twin-chart-beat/references/types/diverging-bar.md` both name
 * the opposite (gate-on-last-slice) as an already-shipped-and-fixed defect: "a label that only
 * appears once a bar is fully grown is a label that's absent for most of the time the bar is on
 * screen."
 */

import { scaleBand, scaleLinear } from "d3-scale";
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
import { WATERFALL_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const TITLE = { fontSize: 32, fontWeight: 700, lead: 42 };
const SOURCE = { fontSize: 18, fontWeight: 400 };
const LEGEND = { fontSize: 19, fontWeight: 600 };
const CATEGORY_LABEL = { fontSize: 16, fontWeight: 500 };
const CATEGORY_LABEL_ACCENT = { fontSize: 16, fontWeight: 700 };
const VALUE_LABEL = { fontSize: 18, fontWeight: 600 };
const CONCLUSION_LABEL = { fontSize: 19, fontWeight: 700 };

/** Category labels rotate to fit ten bars in the available width — the type doctrine's own
 *  guidance ("truncate from the end... give the rotated label a bounded strip of vertical room"). */
const ROTATION_DEG = -34;
const MAX_CATEGORY_LABEL_WIDTH = 132;
const CATEGORY_STRIP = 96;
const LABEL_GAP = 10;

export type WaterfallStepKind = "total" | "increase" | "decrease";

export type WaterfallStep = {
  id: string;
  label: string;
  kind: WaterfallStepKind;
  /** The delta for an increase/decrease step; the absolute total for a "total" bar. */
  value: number;
  /** The running total this bar starts from — 0 for a "total" bar, drawn as a full bar from zero. */
  runningBefore: number;
  /** The running total this bar ends at. */
  runningAfter: number;
};

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

/** Truncates from the END, keeping the readable start — `waterfall.md`'s own rule for a category
 *  label that doesn't fit even rotated, rather than letting it overrun its bounded strip. */
export function truncateToWidth(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string {
  if (measureText(text, font) <= maxWidth) return text;
  let end = text.length;
  while (end > 1 && measureText(`${text.slice(0, end)}…`, font) > maxWidth)
    end--;
  return `${text.slice(0, end)}…`;
}

/** Absolute value, fixed decimals, no sign — for the two "total" bars, which are always positive
 *  and get an absolute label per the type doctrine. */
export function en(value: number, decimals = 2): string {
  return Math.abs(value).toFixed(decimals);
}

/** Explicitly signed, fixed decimals — every delta bar gets a `+` or `−`, never a bare number,
 *  per the type doctrine's "every delta carries a signed label." */
export function signed(value: number, decimals = 2): string {
  const sign = value < 0 ? "−" : "+";
  return `${sign}${Math.abs(value).toFixed(decimals)}`;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React. A fresh shape: the x domain is ten
 * ordered categories (`scaleBand`), the y domain is a running total ([0, the highest running total
 * the bridge ever reaches] — NOT just the higher of the two ends, since the bridge can overshoot
 * both of them mid-walk, which it does here: the renewables climb the running total to 795.90
 * before the fossil/nuclear steps bring it back down to 506.72). Bars are position-AND-length
 * encoded (unlike the dumbbell's pure position encoding): the count axis has to start at zero
 * (`waterfall.md`), so `y`'s domain always includes 0.
 */
export function waterfallGeometry(
  steps: WaterfallStep[],
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

  const maxValue = Math.max(
    0,
    ...steps.flatMap((s) => [s.runningBefore, s.runningAfter]),
  );
  const y = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([plot.bottom, plot.top]);
  const x = scaleBand<string>()
    .domain(steps.map((s) => s.id))
    .range([plot.left, plot.right])
    .paddingInner(0.42)
    .paddingOuter(0.14);

  const bandwidth = x.bandwidth();
  const bars = steps.map((s) => {
    const barX = x(s.id) ?? 0;
    return {
      ...s,
      x: barX,
      centerX: barX + bandwidth / 2,
      width: bandwidth,
      anchorY: y(s.runningBefore),
      finalY: y(s.runningAfter),
    };
  });

  const connectors = bars.slice(0, -1).map((bar, i) => ({
    x1: bar.x + bar.width,
    x2: bars[i + 1].x,
    y: y(bar.runningAfter),
  }));

  return { plot, x, y, bandwidth, bars, connectors };
}

export type WaterfallVideoProps = {
  /** Story order, never resorted by magnitude: [opening total, ...signed steps, closing total]. */
  data: WaterfallStep[];
  title: string;
  source: string;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  increase: string;
  decrease: string;
  total: string;
  /** ["Increase", "Decrease", "Total"] — a waterfall needs three swatches, a dumbbell only two. */
  legendLabels: [string, string, string];
  unit: string;
  timing?: BeatTiming;
};

export function WaterfallVideo({
  data,
  title,
  source,
  ground,
  ink,
  muted,
  increase,
  decrease,
  total,
  legendLabels,
  unit,
  timing = WATERFALL_TIMING,
}: WaterfallVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  if (data.length < 3)
    throw new Error(
      `need at least an opening total, one step and a closing total, got ${data.length} bars`,
    );
  if (data[0].kind !== "total" || data[data.length - 1].kind !== "total")
    throw new Error(
      "the first and last bars must be the true totals (waterfall.md)",
    );
  const openBar = data[0];
  const closeBar = data[data.length - 1];
  const middle = data.slice(1, -1);

  const colourFor = (kind: WaterfallStepKind) =>
    kind === "total" ? total : kind === "increase" ? increase : decrease;

  // ── Layout. Identical at every frame: the build changes what is visible, never where anything
  // sits, so nothing shifts when a bar arrives late.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 40;
  const legendBaseline = sourceBaseline + 38;

  // The opening and closing bars sit at the very edges of the plot — their centre-anchored value
  // labels can be wider than the bar itself, and the closing total's CONCLUSION label ("506.72 TWh
  // · net −117.49 TWh") is wider still. `measureText` is the same "measured, not guessed" contract
  // this codebase's own `measureText` doc-comment names: a wrong measurement clips, silently, in
  // the rendered PNG — which is exactly the defect a first render of this beat shipped (the
  // conclusion label ran off the right edge of the frame) before this gutter was measured instead
  // of assumed. Reserving `padding.left`/`.right` at least as wide as half of each edge label's own
  // measured width guarantees neither can ever run past the canvas, regardless of the bar's exact
  // band position.
  const openValueText = `${en(openBar.runningAfter)} ${unit}`;
  const closeValueText = `${en(closeBar.runningAfter)} ${unit}`;
  const netChange = closeBar.runningAfter - openBar.runningAfter;
  const conclusionText = `${en(closeBar.runningAfter)} ${unit} · net ${signed(netChange)} ${unit}`;
  const leftGutter = measureText(openValueText, VALUE_LABEL) / 2;
  const rightGutter =
    Math.max(
      measureText(closeValueText, VALUE_LABEL),
      measureText(conclusionText, CONCLUSION_LABEL),
    ) / 2;

  const padding = {
    top: legendBaseline + 60,
    right: Math.max(PAD, rightGutter),
    bottom: PAD + CATEGORY_STRIP,
    left: Math.max(PAD, leftGutter),
  };

  const g = waterfallGeometry(data, { width, height, padding });

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subjectProgress = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // Furniture: title, source, three-swatch legend — one fade, together, then still forever. The
  // title is furniture (`motion-grammar.md`, "the conclusion appears only after its evidence"
  // governs assertions, not the title).
  const furnitureOpacity = establish;

  // How far through step `i`'s own arrival window the master `reveal` progress is, 0..1, already
  // eased — the same value drives that step's connector fade, bar growth AND value-label position,
  // so nothing computes its own out-of-step easing.
  const stepLocal = (i: number, count: number) => {
    const span = 1 / count;
    const start = i * span;
    const dur = span * 1.6;
    return interpolate(reveal, [start, Math.min(1, start + dur)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  };
  const middleLocal = middle.map((_, i) => stepLocal(i, middle.length));

  /** The bar's own currently-animating value — anchor at progress 0, final at progress 1. Used
   *  both for the rect's growing edge and for the value label's position, so the label rides the
   *  tip exactly rather than computing a second, independently-derived position. */
  const animatedValue = (
    anchor: number,
    finalValue: number,
    localProgress: number,
  ) =>
    interpolate(localProgress, [0, 1], [anchor, finalValue], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

  const openCurrent = g.y(
    animatedValue(0, openBar.runningAfter, referenceProgress),
  );
  const closeCurrent = g.y(
    animatedValue(0, closeBar.runningAfter, subjectProgress),
  );
  const middleCurrent = middle.map((bar, i) =>
    g.y(animatedValue(bar.runningBefore, bar.runningAfter, middleLocal[i])),
  );

  // The subject's own third-channel emphasis (never a fourth hue) — critically damped, same device
  // every prior beat's landing mark uses: an overshoot would show, for a few frames, more emphasis
  // than the finding warrants.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const outlineOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);
  const washOpacity = interpolate(subjectSpring, [0, 1], [0, 0.12]);
  // The closing category label crossfades to bold, gated on the SUBJECT event's OWN progress (not
  // the master reveal signal) — `motion-grammar.md`'s "a label's reveal gates on its own mark,
  // never on a master clock."
  const closeLabelAccent = interpolate(subjectProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const rowLabelBaselineOffset = CATEGORY_LABEL.fontSize * 0.32;

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
        <text
          x={PAD}
          y={sourceBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {source}
        </text>

        {/* The three-role legend — load-bearing, not decorative: without it a reader has no way
            to read a bar's colour as "grew" vs "shrank" vs "the anchor." */}
        {(() => {
          const swatches: Array<[string, string]> = [
            [legendLabels[0], increase],
            [legendLabels[1], decrease],
            [legendLabels[2], total],
          ];
          let cursor = PAD;
          return swatches.map(([label, colour]) => {
            const cx = cursor + 7;
            const textX = cursor + 22;
            const labelWidth = measureText(label, LEGEND);
            cursor = textX + labelWidth + 34;
            return (
              <g key={label}>
                <circle cx={cx} cy={legendBaseline - 7} r={7} fill={colour} />
                <text
                  x={textX}
                  y={legendBaseline}
                  fill={ink}
                  fontSize={LEGEND.fontSize}
                  fontWeight={LEGEND.fontWeight}
                >
                  {label}
                </text>
              </g>
            );
          });
        })()}
      </g>

      {/* Connectors — each linking a bar's end to the next bar's start, gated on the LATER bar's
          own arrival so a connector never appears before the level it's pointing into exists. */}
      {g.connectors.map((c, i) => {
        const laterOpacity =
          i === g.connectors.length - 1
            ? interpolate(subjectProgress, [0, 0.2], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            : i === 0
              ? interpolate(middleLocal[0], [0, 0.2], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : interpolate(middleLocal[i], [0, 0.2], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
        return (
          <line
            key={`connector-${i}`}
            x1={c.x1}
            x2={c.x2}
            y1={c.y}
            y2={c.y}
            stroke={muted}
            strokeWidth={2}
            strokeDasharray="5 5"
            opacity={laterOpacity}
          />
        );
      })}

      {/* The 2010 opening total — a full bar from zero, doubling as the reference the rest of the
          bridge is read against. */}
      {referenceProgress > 0 ? (
        <g>
          <rect
            x={g.bars[0].x}
            y={openCurrent}
            width={g.bars[0].width}
            height={g.plot.bottom - openCurrent}
            fill={total}
          />
          <text
            x={g.bars[0].centerX}
            y={openCurrent - LABEL_GAP}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="middle"
            opacity={interpolate(referenceProgress, [0, 0.25], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {openValueText}
          </text>
          <text
            x={g.bars[0].centerX}
            y={g.plot.bottom + 20}
            fill={ink}
            fontSize={CATEGORY_LABEL.fontSize}
            fontWeight={CATEGORY_LABEL.fontWeight}
            textAnchor="end"
            transform={`rotate(${ROTATION_DEG} ${g.bars[0].centerX} ${g.plot.bottom + 20})`}
            opacity={interpolate(referenceProgress, [0, 0.3], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {truncateToWidth(
              openBar.label,
              MAX_CATEGORY_LABEL_WIDTH,
              CATEGORY_LABEL,
            )}
          </text>
        </g>
      ) : null}

      {/* The eight signed steps — one at a time, left to right, each floating from exactly where
          the previous one ended. Never resorted by magnitude: `data`'s own order IS the story
          order (`render.mjs`'s job, not this component's). */}
      {middle.map((bar, i) => {
        const local = middleLocal[i];
        if (local <= 0) return null;
        const current = middleCurrent[i];
        const top = Math.min(g.bars[i + 1].anchorY, current);
        const bottom = Math.max(g.bars[i + 1].anchorY, current);
        const labelAbove = bar.kind !== "decrease";
        const valueOpacity = interpolate(local, [0, 0.25], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const categoryOpacity = interpolate(local, [0, 0.3], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <g key={bar.id}>
            <rect
              x={g.bars[i + 1].x}
              y={top}
              width={g.bars[i + 1].width}
              height={Math.max(1, bottom - top)}
              fill={colourFor(bar.kind)}
              opacity={local}
            />
            <text
              x={g.bars[i + 1].centerX}
              y={
                labelAbove
                  ? current - LABEL_GAP
                  : current + LABEL_GAP + VALUE_LABEL.fontSize * 0.8
              }
              fill={ink}
              fontSize={VALUE_LABEL.fontSize}
              fontWeight={VALUE_LABEL.fontWeight}
              textAnchor="middle"
              opacity={valueOpacity}
            >
              {signed(bar.value)}
            </text>
            <text
              x={g.bars[i + 1].centerX}
              y={g.plot.bottom + 20}
              fill={ink}
              fontSize={CATEGORY_LABEL.fontSize}
              fontWeight={CATEGORY_LABEL.fontWeight}
              textAnchor="end"
              transform={`rotate(${ROTATION_DEG} ${g.bars[i + 1].centerX} ${g.plot.bottom + 20})`}
              opacity={categoryOpacity}
            >
              {truncateToWidth(
                bar.label,
                MAX_CATEGORY_LABEL_WIDTH,
                CATEGORY_LABEL,
              )}
            </text>
          </g>
        );
      })}

      {/* The 2023 closing total — the subject. Lands only once every step has (`subject.start`
          cannot precede `reveal`'s end — structural, not just editorial intent), as its own full
          bar from zero so it can be compared directly against the opening bar's height. */}
      {subjectProgress > 0 ? (
        <g>
          {/* The subject's wash, behind the bar — a third channel, never a third hue. */}
          {washOpacity > 0 ? (
            <rect
              x={g.bars[g.bars.length - 1].x - 14}
              y={g.plot.top}
              width={g.bars[g.bars.length - 1].width + 28}
              height={g.plot.bottom - g.plot.top}
              fill={total}
              opacity={washOpacity}
            />
          ) : null}
          <rect
            x={g.bars[g.bars.length - 1].x}
            y={closeCurrent}
            width={g.bars[g.bars.length - 1].width}
            height={g.plot.bottom - closeCurrent}
            fill={total}
          />
          {outlineOpacity > 0 ? (
            <rect
              x={g.bars[g.bars.length - 1].x}
              y={closeCurrent}
              width={g.bars[g.bars.length - 1].width}
              height={g.plot.bottom - closeCurrent}
              fill="none"
              stroke={ink}
              strokeWidth={3}
              opacity={outlineOpacity}
            />
          ) : null}
          {/* The base total label, crossfading out as the conclusion's extended label crossfades
              in — same in-place, two-stage technique
              `../video-population-growth-dumbbell/DumbbellVideo.tsx`'s `conclusionLabelFor` uses. */}
          <text
            x={g.bars[g.bars.length - 1].centerX}
            y={closeCurrent - LABEL_GAP}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="middle"
            opacity={
              interpolate(subjectProgress, [0, 0.25], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) *
              (1 - conclusion)
            }
          >
            {closeValueText}
          </text>
          <text
            x={g.bars[g.bars.length - 1].centerX}
            y={closeCurrent - LABEL_GAP}
            fill={ink}
            fontSize={CONCLUSION_LABEL.fontSize}
            fontWeight={CONCLUSION_LABEL.fontWeight}
            textAnchor="middle"
            opacity={interpolate(conclusion, [0, 1], [0, 1], {
              easing: Easing.out(Easing.cubic),
            })}
          >
            {conclusionText}
          </text>
          <text
            x={g.bars[g.bars.length - 1].centerX}
            y={g.plot.bottom + 20}
            fill={ink}
            fontSize={CATEGORY_LABEL_ACCENT.fontSize}
            fontWeight={CATEGORY_LABEL_ACCENT.fontWeight}
            textAnchor="end"
            transform={`rotate(${ROTATION_DEG} ${g.bars[g.bars.length - 1].centerX} ${g.plot.bottom + 20})`}
            opacity={interpolate(subjectProgress, [0, 0.3], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
          >
            {truncateToWidth(
              closeBar.label,
              MAX_CATEGORY_LABEL_WIDTH,
              CATEGORY_LABEL_ACCENT,
            )}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
