/**
 * "Recycling rates across Europe" — video, 1080 x 1920 (PORTRAIT), `RECYCLING_TIMING` (9.3s at 30fps).
 *
 * The article asks for a video for social, so the size gate (G2c) pinned `portrait`. That pin is
 * the whole reason this file does not look like `map-beat`'s own square seed:
 *
 *   - The frame, the type floor and the platform's safe band come from `#shared/chart-video/sizes.mjs`,
 *     because `map-beat` ships no size table of its own. Every `<text>` here is at or above the 36px
 *     floor that table derives for a 1080px frame read at 360 dp, and every one sits inside the
 *     269..1248 band Meta reserves on a story.
 *   - The plate is 540 square rather than the frame's full width. A square geography inside a
 *     portrait frame, under a 36px type floor and a 979px band, cannot be both large and legible:
 *     the furniture a phone reader has to be able to read takes 439 of the 979 px, and 540 is what
 *     is left. The beat's own fit guard is what says by how much; it fired at 640 before this.
 *   - The legend sits INSIDE the plate, over the Atlantic, which is the only part of this camera
 *     carrying no shape. That is the 120px the bar and its ticks would otherwise have cost the map.
 *
 * The order, not the drawing, is what this format adds — and the order this beat has is the
 * ARGUMENT'S, not a queue through its shapes: the continent that did not report, then every rate
 * that did, together, then the subject, then the conclusion. Every window derives from `timing.ts`;
 * there is no frame literal below.
 */

import { Fragment } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-video/sizes.mjs";
import {
  binIndexLowerInclusive,
  pathFromRings,
  type BakedShape,
  type JoinedRow,
} from "./geo-recycling";
import { RECYCLING_TIMING, progressOf, type BeatTiming } from "./timing";

const SIZE_NAME = "portrait";
const FRAME = sizeFor(SIZE_NAME);
const STAGE = stageFor(SIZE_NAME);
const PAD = frameInsetFor(SIZE_NAME);

const MAP = 560;
// The plate is pushed to the frame's right margin and the legend takes the column beside it — the
// seed's "text column beside a square plate", turned on its side for portrait. The first cut put
// the legend INSIDE the plate, over the Atlantic, which is the only water this camera holds: at 640
// that worked and at 540 it did not, and the render showed the caption crossing Scandinavia and
// "did not report" crossing France. A column outside the plate cannot cross anything.
const MAP_X = FRAME.width - PAD - MAP;
const COLUMN = { x: PAD, width: FRAME.width - PAD * 2 - MAP - 32 };

/** Every token is at or above `FRAME.minTypePx`. The floor is never lowered. */
const TITLE = { fontSize: 50, fontWeight: 700, lead: 60 };
const CONCLUSION = { fontSize: 40, fontWeight: 700, lead: 48 };
const TICK = { fontSize: 36, fontWeight: 400 };
const NOTE = { fontSize: 36, fontWeight: 400, lead: 46 };
const MAP_LABEL = { fontSize: 38, fontWeight: 700 };
const MAP_VALUE = { fontSize: 44, fontWeight: 700 };

const LEGEND = { barWidth: 26, barHeight: 300, labelGap: 14 };

// THE FLOOR IS NEVER LOWERED, and it is checked rather than commented. `assertTypeFloor` reads
// rendered markup, which this format's producer never holds (Remotion renders in a browser), so the
// tokens are measured here at module load instead — every one of them, in one list, so a token
// added later cannot escape by not being in a comment.
for (const [name, token] of Object.entries({ TITLE, CONCLUSION, TICK, NOTE, MAP_LABEL, MAP_VALUE }))
  if (token.fontSize < FRAME.minTypePx)
    throw new Error(
      `${name} is ${token.fontSize}px, under the ${FRAME.minTypePx}px floor for "${SIZE_NAME}". A ` +
        `${FRAME.width}px-wide frame is read at 360 CSS px, so ${FRAME.minTypePx}px is the 12 CSS px ` +
        `practical floor three independent sources converge on. Scale the token — nothing lowers this.`,
    );

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

export type RecyclingMapVideoProps = {
  geometry: {
    frame: { width: number; height: number };
    shapes: BakedShape[];
    anchors: Record<string, [number, number]>;
  };
  plate: string;
  rows: JoinedRow[];
  breaks: number[];
  ramp: string[];
  title: string;
  legendCaption: string;
  caveat: string;
  credit: string;
  noDataLabel: string;
  conclusion: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  subject: string;
  subjectLabel: string;
  subjectValue: number;
  comparison: string;
  comparisonLabel: string;
  comparisonValue: number;
  timing?: BeatTiming;
};

let measuringContext: CanvasRenderingContext2D | null | undefined;
/** @parity */
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

/** @parity */
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
 * REFUSE A RUN OF TYPE THE PLATFORM WOULD COVER.
 *
 * `#shared/chart-video/sizes.mjs` ships `assertWithinStage`, which reads `<text y="…">` baselines
 * back out of rendered markup. This format cannot call it: a map video is rendered by Remotion in a
 * browser and its producer never holds the markup. So the same rule is applied where the layout is
 * DECIDED instead of where it is serialised — every baseline this component is about to draw,
 * measured against the same band, with the same 0.75 cap-height allowance, and the same refusal.
 *
 * It is strictly stronger here in one way and weaker in another, both stated: stronger because it
 * sees the map labels, whose position comes from the bake and not from a constant; weaker because
 * it trusts this component to hand it every baseline, where the markup reader could not be lied to.
 */
function assertBaselinesInStage(
  baselines: { y: number; size: number; what: string }[],
  stage: { top: number; bottom: number; height: number; reserved: boolean },
): void {
  if (!stage.reserved) return;
  const outside = baselines.filter((b) => b.y - b.size * 0.75 < stage.top || b.y > stage.bottom);
  if (outside.length === 0) return;
  throw new Error(
    `this render draws outside the ${stage.height}px safe band (${stage.top}-${stage.bottom}) that ` +
      `"${SIZE_NAME}" reserves: ${outside.map((b) => `${b.what} baseline ${Math.round(b.y)}, ${b.size}px`).join("; ")}. ` +
      `The platform's profile row, caption, buttons and progress bar sit over the rest of the frame — ` +
      `content there is at risk of being COVERED, which no clipping counter can see.`,
  );
}

/** One decimal, a full stop, and a per-cent sign — this story is in English. */
export function pc(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function RecyclingMapVideo({
  geometry,
  plate,
  rows,
  breaks,
  ramp,
  title,
  legendCaption,
  caveat,
  credit,
  noDataLabel,
  conclusion,
  ground,
  accent,
  ink,
  muted,
  subject,
  subjectLabel,
  subjectValue,
  comparison,
  comparisonLabel,
  comparisonValue,
  timing = RECYCLING_TIMING,
}: RecyclingMapVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = MAP / geometry.frame.width;
  const contentWidth = FRAME.width - PAD * 2;

  // ── Layout. Identical at every frame: the build changes what is VISIBLE, never where it sits.
  const titleLines = wrap(title, contentWidth, TITLE);
  const conclusionLines = wrap(conclusion, contentWidth, CONCLUSION);
  const caveatLines = wrap(caveat, contentWidth, NOTE);
  const legendCaptionLines = wrap(legendCaption, COLUMN.width, TICK);
  const noDataLines = wrap(noDataLabel, COLUMN.width, TICK);
  const creditLines = wrap(credit, contentWidth, NOTE);

  const titleTop = STAGE.top + TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * TITLE.lead;
  const conclusionTop = titleBottom + CONCLUSION.lead + 8;
  const conclusionBottom = conclusionTop + (conclusionLines.length - 1) * CONCLUSION.lead;
  const mapY = conclusionBottom + 30;

  // The bottom block is laid out UPWARD from the band's own floor, never from the frame's, because
  // a story's caption and progress bar sit over everything below 1248.
  const creditBottom = STAGE.bottom - 20;
  const creditTop = creditBottom - (creditLines.length - 1) * NOTE.lead;
  const caveatBottom = creditTop - NOTE.fontSize - 10;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;

  // Loud, not silent: the plate's own floor and the bottom block must not meet. Everything above
  // the plate grows downward with the title's own line count, so this is the collision a longer
  // title, caveat or credit actually causes.
  if (caveatTop - NOTE.fontSize < mapY + MAP + 16)
    throw new Error(
      `the bottom block does not fit inside the ${SIZE_NAME} safe band: the plate ends at ` +
        `${mapY + MAP} and the block starts at ${caveatTop - NOTE.fontSize}. Shorten the title, the ` +
        `caveat or the credit, or lower MAP (${MAP}). The band is ${STAGE.top}..${STAGE.bottom}.`,
    );

  const barTop0 = mapY + 108;
  const barBottom0 = barTop0 + LEGEND.barHeight;
  assertBaselinesInStage(
    [
      ...titleLines.map((_, i) => ({ y: titleTop + i * TITLE.lead, size: TITLE.fontSize, what: "title" })),
      ...conclusionLines.map((_, i) => ({ y: conclusionTop + i * CONCLUSION.lead, size: CONCLUSION.fontSize, what: "conclusion" })),
      ...caveatLines.map((_, i) => ({ y: caveatTop + i * NOTE.lead, size: NOTE.fontSize, what: "caveat" })),
      ...creditLines.map((_, i) => ({ y: creditTop + i * NOTE.lead, size: NOTE.fontSize, what: "credit" })),
      ...legendCaptionLines.map((_, i) => ({
        y: barTop0 - 26 - (legendCaptionLines.length - 1 - i) * TICK.fontSize * 1.2,
        size: TICK.fontSize,
        what: "legend caption",
      })),
      ...[0, ...breaks].map((tick, i) => ({
        y: barBottom0 - (i * LEGEND.barHeight) / ramp.length + 12,
        size: TICK.fontSize,
        what: `legend tick ${tick}`,
      })),
      ...noDataLines.map((_, i) => ({
        y: barBottom0 + 74 + 34 + i * NOTE.lead,
        size: TICK.fontSize,
        what: "no-data label",
      })),
      ...(["label", "comparisonLabel"] as const).flatMap((anchor) => {
        const at = geometry.anchors[anchor];
        if (!at) return [];
        return [
          { y: mapY + at[1] * scale, size: MAP_LABEL.fontSize, what: `${anchor} name` },
          { y: mapY + at[1] * scale + MAP_VALUE.fontSize + 6, size: MAP_VALUE.fontSize, what: `${anchor} value` },
        ];
      }),
    ],
    STAGE,
  );

  const subjectShape = geometry.shapes.find((shape) => shape.key === subject);
  if (!subjectShape) throw new Error(`no shape for the subject ${subject}`);
  const comparisonShape = geometry.shapes.find((shape) => shape.key === comparison);
  if (!comparisonShape) throw new Error(`no shape for the comparison ${comparison}`);
  for (const anchor of ["label", "comparisonLabel"])
    if (!geometry.anchors[anchor])
      throw new Error(`the bake projected no ${anchor} anchor`);

  const value = new Map(rows.map((row) => [row.key, row.value]));
  // THREE EVENTS, AND NO ORDER INSIDE ANY OF THEM. The shapes with no value are the REFERENCE —
  // most of this continent did not report, and that is what the argument is measured against — and
  // they arrive together. The shapes with a value are the EVIDENCE, and they arrive together too.
  // The subject is its own event after both.
  //
  // The first cut of this file staggered each group: the thirty-one no-data shapes by index, then
  // the eleven values from lowest rate to highest, each country crossfading out of a "pending"
  // stipple invented to hold it until its turn came. Every reading here is from March 2025, so
  // there is no chronology across these shapes and no argument that ranks them: the order was the
  // producer's, which `motion-grammar.md` names as "an arbitrary order chosen for visual interest"
  // and `geo-discipline.md` rule 10 now refuses outright. With the stagger gone the stipple encodes
  // nothing and is gone with it. The no-data HATCH stays — "did not report" is a fact about the
  // source, not a wait.

  // ── The edit. Six windows, every one read off the contract.
  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusionProgress = progressOf(frame, timing.conclusion);

  const furniture = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusionProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  // The reference and the evidence, each as one crossfade. Every shape in a group sits at the same
  // opacity at every frame, which is what keeps a mid-fade shape from reading as a class it is not:
  // the ramp's comparisons are between shapes, and shapes at equal opacity over one plate keep
  // their order. A shape left unfilled while its neighbours are filled does not — that was the
  // defect the stipple was invented to paper over.
  const referenceOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const valuesArrived = interpolate(reveal, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The subject lands as its own event, after its own fill is already on screen. Critically damped:
  // a ring that overshoots is, for those frames, drawn around more country than exists.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });

  // The comparison's outline and label still gate on the comparison's OWN arrival rather than on
  // the master clock — the rule has not changed, only the answer has: the mark's own arrival IS the
  // one window every value now shares, so `valuesArrived` is that fraction and not a substitute for
  // it. A label gated on the composition's overall progress would still be wrong here.
  const comparisonArrival = valuesArrived;

  const barTop = mapY + 108;
  const barBottom = barTop + LEGEND.barHeight;

  // A LABEL THE PLATE CLIPS IS A LABEL NOBODY READS, AND NOTHING SAID SO.
  // The first render put Macedonia's label south-east of it, over the Aegean; at this plate's own
  // scale the run ran past the plate's right edge and the clip path cut it to "Mac…" and "18.4".
  // Nothing threw — a clip is silent by construction. So the box each label will occupy is measured
  // against the plate's own box here, and a run that will not fit refuses, naming the anchor.
  const assertLabelFits = (
    at: [number, number],
    anchorEnd: boolean,
    label: string,
    figure: string,
    what: string,
  ) => {
    const x = MAP_X + at[0] * scale;
    const y = mapY + at[1] * scale;
    const width = Math.max(
      measureText(label, MAP_LABEL),
      measureText(figure, MAP_VALUE),
    );
    const left = anchorEnd ? x - width : x;
    const right = anchorEnd ? x : x + width;
    const top = y - MAP_LABEL.fontSize * 0.75;
    const bottom = y + MAP_VALUE.fontSize + 6;
    if (left < MAP_X || right > MAP_X + MAP || top < mapY || bottom > mapY + MAP)
      throw new Error(
        `the ${what} label would be clipped by the plate: it occupies ` +
          `${Math.round(left)}..${Math.round(right)} x ${Math.round(top)}..${Math.round(bottom)}, ` +
          `and the plate is ${MAP_X}..${MAP_X + MAP} x ${mapY}..${mapY + MAP}. Move its anchor in ` +
          `bake-plate.mjs and re-bake — a clipped label is silent, which is why this is not one.`,
      );
  };
  assertLabelFits(geometry.anchors.label, true, subjectLabel, pc(subjectValue), "subject");
  assertLabelFits(
    geometry.anchors.comparisonLabel,
    true,
    comparisonLabel,
    pc(comparisonValue),
    "comparison",
  );

  const mapLabel = (
    at: [number, number],
    anchorEnd: boolean,
    colour: string,
    label: string,
    figure: string,
    opacity: number,
  ) =>
    opacity > 0 ? (
      <g
        transform={`translate(${MAP_X + at[0] * scale},${mapY + at[1] * scale})`}
        opacity={opacity}
      >
        {[
          { fill: "none", stroke: ground, strokeWidth: 7 },
          { fill: colour, stroke: "none", strokeWidth: 0 },
        ].map((paint) => (
          <Fragment key={paint.stroke}>
            <text
              textAnchor={anchorEnd ? "end" : "start"}
              fontSize={MAP_LABEL.fontSize}
              fontWeight={MAP_LABEL.fontWeight}
              strokeLinejoin="round"
              {...paint}
            >
              {label}
            </text>
            <text
              y={MAP_VALUE.fontSize + 6}
              textAnchor={anchorEnd ? "end" : "start"}
              fontSize={MAP_VALUE.fontSize}
              fontWeight={MAP_VALUE.fontWeight}
              strokeLinejoin="round"
              {...paint}
            >
              {figure}
            </text>
          </Fragment>
        ))}
      </g>
    ) : null;

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      {/* The plate is an IMAGE, not a map. Remotion's <Img> holds the frame until it has decoded,
          which a raw <image href> inside the svg would not. */}
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: MAP_X,
          top: mapY,
          width: MAP,
          height: MAP,
          opacity: furniture,
        }}
      />
      <svg
        width={FRAME.width}
        height={FRAME.height}
        viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <pattern
            id="no-data"
            width={9}
            height={9}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width={9} height={9} fill={ground} />
            <line x1={0} y1={0} x2={0} y2={9} stroke={muted} strokeWidth={2.4} />
          </pattern>
          <clipPath id="plate-clip">
            <rect x={MAP_X} y={mapY} width={MAP} height={MAP} />
          </clipPath>
        </defs>

        <g clipPath="url(#plate-clip)">
          <g transform={`translate(${MAP_X},${mapY}) scale(${scale})`}>
            {geometry.shapes.map((shape) => {
              const v = value.get(shape.key);
              const d = pathFromRings(shape.rings);
              const stroke = {
                stroke: ground,
                strokeWidth: 0.8 / scale,
                strokeLinejoin: "round" as const,
              };

              if (v === null || v === undefined) {
                // The reference: thirty-one countries that did not report, laid down together under
                // the hatch before any value arrives, and then left alone to be read. They have no
                // order between them either — a source's silence is not a quantity.
                if (referenceOpacity <= 0) return null;
                return (
                  <path
                    key={shape.key}
                    d={d}
                    fill="url(#no-data)"
                    fillRule="evenodd"
                    {...stroke}
                    opacity={referenceOpacity}
                  />
                );
              }

              // The evidence: every reported rate on ONE window, the subject included. The subject
              // is not accented here — its ring and its label are its own event, below — so the
              // eleven values appear as one fact and the argument is made afterwards.
              const trueFill = ramp[binIndexLowerInclusive(v, breaks)];
              if (valuesArrived <= 0) return null;
              return (
                <path
                  key={shape.key}
                  d={d}
                  fill={trueFill}
                  fillRule="evenodd"
                  {...stroke}
                  opacity={valuesArrived}
                />
              );
            })}

            {/* The comparison is outlined in INK, never in the accent: one semantic accent, spent
                entirely on the subject. It needs an outline all the same — it is the lowest class,
                which on this ground is a shade a reader can barely see, and a label naming a shape
                nobody can find names nothing. It arrives with its own fill, not on a master clock. */}
            {comparisonArrival > 0 ? (
              <g opacity={comparisonArrival}>
                <path
                  d={pathFromRings(comparisonShape.rings)}
                  fill="none"
                  stroke={ground}
                  strokeWidth={6 / scale}
                  strokeLinejoin="round"
                />
                <path
                  d={pathFromRings(comparisonShape.rings)}
                  fill="none"
                  stroke={ink}
                  strokeWidth={2.4 / scale}
                  strokeLinejoin="round"
                />
              </g>
            ) : null}

            {/* The accent, and only the accent, marks the subject — after its own fill exists. */}
            {subjectSpring > 0 ? (
              <g opacity={subjectSpring}>
                <path
                  d={pathFromRings(subjectShape.rings)}
                  fill="none"
                  stroke={ground}
                  strokeWidth={7 / scale}
                  strokeLinejoin="round"
                />
                <path
                  d={pathFromRings(subjectShape.rings)}
                  fill="none"
                  stroke={accent}
                  strokeWidth={3.2 / scale}
                  strokeLinejoin="round"
                />
              </g>
            ) : null}
          </g>

          {mapLabel(
            geometry.anchors.comparisonLabel,
            true,
            ink,
            comparisonLabel,
            pc(comparisonValue),
            comparisonArrival,
          )}
          {mapLabel(
            geometry.anchors.label,
            true,
            accent,
            subjectLabel,
            pc(subjectValue),
            subjectSpring,
          )}
        </g>

        {/* ── The legend, in the column beside the plate ───────────────────────────────────── */}
        <g opacity={furniture}>
          {legendCaptionLines.map((line, i) => (
            <text
              key={line}
              x={COLUMN.x}
              y={barTop - 26 - (legendCaptionLines.length - 1 - i) * TICK.fontSize * 1.2}
              fill={muted}
              fontSize={TICK.fontSize}
              fontWeight={TICK.fontWeight}
            >
              {line}
            </text>
          ))}
          {ramp.map((shade, i) => (
            <rect
              key={shade}
              x={COLUMN.x}
              y={barBottom - ((i + 1) * LEGEND.barHeight) / ramp.length}
              width={LEGEND.barWidth}
              height={LEGEND.barHeight / ramp.length}
              fill={shade}
            />
          ))}
          {[0, ...breaks].map((tick, i) => (
            <text
              key={tick}
              x={COLUMN.x + LEGEND.barWidth + LEGEND.labelGap}
              y={barBottom - (i * LEGEND.barHeight) / ramp.length + 12}
              fill={muted}
              fontSize={TICK.fontSize}
            >
              {tick}
            </text>
          ))}
          <g transform={`translate(${COLUMN.x},${barBottom + 74})`}>
            <rect
              x={0}
              y={-26}
              width={34}
              height={26}
              fill="url(#no-data)"
              stroke={muted}
              strokeWidth={0.8}
            />
            {noDataLines.map((line, i) => (
              <text key={line} x={0} y={34 + i * NOTE.lead} fill={muted} fontSize={TICK.fontSize}>
                {line}
              </text>
            ))}
          </g>
        </g>

        {/* ── Furniture: up together at the start, then still ─────────────────────────────── */}
        <g opacity={furniture}>
          {titleLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={titleTop + i * TITLE.lead}
              fill={ink}
              fontSize={TITLE.fontSize}
              fontWeight={TITLE.fontWeight}
            >
              {line}
            </text>
          ))}
          {caveatLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={caveatTop + i * NOTE.lead}
              fill={muted}
              fontSize={NOTE.fontSize}
            >
              {line}
            </text>
          ))}
          {creditLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={creditTop + i * NOTE.lead}
              fill={muted}
              fontSize={NOTE.fontSize}
            >
              {line}
            </text>
          ))}
        </g>

        {/* ── The assertion that closes the argument, once both ends are on screen ────────── */}
        {conclusionOpacity > 0
          ? conclusionLines.map((line, i) => (
              <text
                key={line}
                x={PAD}
                y={conclusionTop + i * CONCLUSION.lead}
                fill={accent}
                fontSize={CONCLUSION.fontSize}
                fontWeight={CONCLUSION.fontWeight}
                opacity={conclusionOpacity}
              >
                {line}
              </text>
            ))
          : null}
      </svg>
    </AbsoluteFill>
  );
}
