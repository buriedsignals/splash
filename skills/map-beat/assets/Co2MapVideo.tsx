/**
 * The video format of "La Suisse sous la moyenne européenne" — 8 seconds, 30fps, 1080 × 1080.
 *
 * REPLACE ME. Do not parameterise me. This file seeds the video format.
 *
 * It is not a second map. The plate and the rings come from the same bake the still draws
 * (`scripts/bake-plate.mjs`), and the classes, the ramp and the scale come from the same `geo.ts`.
 * What this file adds is the one thing a still cannot have: an ORDER. Every window in that order
 * derives from `timing.ts`; there is no frame literal below.
 *
 * Nothing here derives a furniture colour either — `deriveFurniture` sits beside a native
 * rasteriser that no browser bundle can load, so `scripts/render-map.mjs` calls it in node and
 * passes ink/muted/grid in as props. One implementation of the colour rule, two formats.
 */

import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  binIndexLowerInclusive,
  fr,
  pathFromRings,
  scalePosition,
  type BakedShape,
  type JoinedRow,
} from "./geo";
import { MAP_TIMING, progressOf, type BeatTiming } from "./timing";
import { labelsClippedByPlate } from "../scripts/detect-label-clipped-by-plate.mjs";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const MAP = 620;
// Where the plate's own top edge sits. It used to be 300, when the header above it carried the
// title AND the source. The source moved to the frame's bottom margin (B1.1), which freed a row up
// here and needed one down there — so the plate rises by exactly that much rather than the bottom
// stack being squeezed into a band that could not hold it. The guard below measures the result
// instead of trusting this number.
const MAP_Y = 250;
const COLUMN = { x: MAP + PAD + 40, right: FRAME.width - PAD };

const TITLE = { fontSize: 40, fontWeight: 700, lead: 50 };
const SOURCE = { fontSize: 19, fontWeight: 400, lead: 24 };
const CAPTION = { fontSize: 18, fontWeight: 600 };
const TICK = { fontSize: 17, fontWeight: 400 };
const MARKER = { fontSize: 17, fontWeight: 600 };
const MARKER_VALUE = { fontSize: 21, fontWeight: 700 };
const NOTE = { fontSize: 17, fontWeight: 400, lead: 22 };
const SUBJECT_LABEL = { fontSize: 22, fontWeight: 700 };
const LEGEND = {
  barWidth: 26,
  barHeight: 300,
  top: 372,
  labelGap: 12,
  markerGap: 14,
};

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

export type Co2MapVideoProps = {
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
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  noDataLabel: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  subject: string;
  subjectLabel: string;
  subjectValue: number;
  comparisonLabel: string;
  comparisonValue: number;
  timing?: BeatTiming;
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

export function Co2MapVideo({
  geometry,
  plate,
  rows,
  breaks,
  ramp,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  noDataLabel,
  ground,
  accent,
  ink,
  muted,
  subject,
  subjectLabel,
  subjectValue,
  comparisonLabel,
  comparisonValue,
  timing = MAP_TIMING,
}: Co2MapVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = MAP / geometry.frame.width;

  // ── Layout. Identical at every frame: the build changes what is VISIBLE, never where it sits, so
  // nothing shifts when a late layer lands.
  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME.width - PAD * 2,
    SOURCE,
  );
  const caveatLines = wrap(caveat, FRAME.width - PAD * 2, NOTE);
  const titleTop = PAD + TITLE.fontSize;

  const value = new Map(rows.map((row) => [row.key, row.value]));
  const anyNoData = rows.some((row) => row.value === null);

  const barBottom = LEGEND.top + LEGEND.barHeight;
  const barX = COLUMN.right - 46 - LEGEND.barWidth;
  const atValue = (v: number) =>
    barBottom - scalePosition(v, breaks) * LEGEND.barHeight;

  // THE SOURCE IS THE LAST LINE BEFORE THE BOTTOM MARGIN — the credit sits at the bottom of the
  // visual, the same place on every graphic this project ships, and it carries the basemap credit
  // with it, unsplit. It used to hang directly under the title. The bottom stack (no-data swatch,
  // caveat, source) is laid out UPWARD from `FRAME.height - PAD`; the plate is a fixed square at
  // `MAP_Y` and does not move.
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  const caveatBottom = sourceTop - SOURCE.fontSize - 12;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;
  const noDataY = caveatTop - NOTE.fontSize - 22;

  // Loud, not silent: the plate's own floor and the bottom stack must not meet. The plate is
  // fixed, so this is the one collision a longer source or caveat can actually cause.
  if (noDataY - 17 < MAP_Y + MAP + 16)
    throw new Error(
      `the bottom stack does not fit: the plate ends at ${MAP_Y + MAP} and the stack starts at ${noDataY}. ` +
        `Shorten the source or the caveat, or raise MAP_Y (${MAP_Y}).`,
    );

  const subjectShape = geometry.shapes.find((shape) => shape.key === subject);
  if (!subjectShape) throw new Error(`no shape for the subject ${subject}`);
  const labelAt = geometry.anchors.label;
  if (!labelAt) throw new Error("the bake projected no label anchor");

  // A LABEL THE PLATE CLIPS IS A LABEL NOBODY READS, and a clip throws nothing. The subject's own
  // run is measured here, where the family and the size it will be drawn in are known, against the
  // plate's own clip rectangle. `stress-t-europe-recycling` had to write this by hand inside its own
  // component after finding a truncated name in a delivered frame; it belongs to the skill.
  const labelBox = {
    what: `the subject label "${subjectLabel}"`,
    left: PAD + labelAt[0] * scale - measureText(subjectLabel, SUBJECT_LABEL),
    right: PAD + labelAt[0] * scale,
    top: MAP_Y + labelAt[1] * scale - SUBJECT_LABEL.fontSize * 0.75,
    bottom: MAP_Y + labelAt[1] * scale + SUBJECT_LABEL.fontSize * 0.25,
  };
  const clipped = labelsClippedByPlate([labelBox], {
    left: PAD,
    right: PAD + MAP,
    top: MAP_Y,
    bottom: MAP_Y + MAP,
  });
  if (clipped.length > 0) throw new Error(clipped.join("\n"));

  // ── The edit. Six windows, every one read off the contract.
  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  // Furniture — title, source, basemap, the empty scale — comes up once, together, then never
  // moves again. The title is furniture: it says what the reader is looking at, and a video whose
  // first seconds carry no title has no poster frame.
  const furniture = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const referenceOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  // THE VALUES ARRIVE TOGETHER, as one event, because a snapshot has no order across its shapes.
  // This used to be a per-region stagger sorted lowest value first, which `geo-discipline.md` rule
  // 10 then blessed as "the distribution building itself". It is not: these regions were all
  // measured in the same year, so ranking them by the quantity the reader is about to be shown is
  // an order the producer chose, not one the data holds — `motion-grammar.md`, "the order is
  // chronological, or it is argumentative". The stagger needed somewhere to hold the shapes waiting
  // their turn, which is where the "pending" stipple came from; with the stagger gone the stipple
  // has nothing to encode, and both are gone together.
  const valuesArrived = interpolate(reveal, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The subject lands as its own event, after its own fill is already on screen. Critically damped:
  // a ring that overshoots is, for those frames, drawn around more country than exists.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });

  const markers = [
    {
      label: comparisonLabel,
      value: comparisonValue,
      colour: ink,
      opacity: referenceOpacity,
    },
    {
      label: subjectLabel,
      value: subjectValue,
      colour: accent,
      opacity: conclusionOpacity,
    },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      {/* The plate is an IMAGE, not a map. Remotion's <Img> holds the frame until it has decoded,
          which a raw <image href> inside the svg would not. */}
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: PAD,
          top: MAP_Y,
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
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={9}
              stroke={muted}
              strokeWidth={2.4}
            />
          </pattern>
          <clipPath id="plate-clip">
            <rect x={PAD} y={MAP_Y} width={MAP} height={MAP} />
          </clipPath>
        </defs>

        {/* ── The field, arriving as one event ──────────────────────────────────────────────── */}
        <g clipPath="url(#plate-clip)">
          <g transform={`translate(${PAD},${MAP_Y}) scale(${scale})`}>
            {geometry.shapes.map((shape) => {
              const v = value.get(shape.key);
              const d = pathFromRings(shape.rings);
              const stroke = {
                stroke: ground,
                strokeWidth: 0.8 / scale,
                strokeLinejoin: "round" as const,
              };

              if (v === null || v === undefined) {
                // ABSENCE IS FURNITURE HERE, not evidence: the hatch says the source is silent
                // about this shape, and it comes up with the basemap and the empty scale rather
                // than arriving as an event of its own. Nothing about it is staggered either — the
                // shapes a source never measured have no order between them at all.
                if (furniture <= 0) return null;
                return (
                  <path
                    key={shape.key}
                    d={d}
                    fill="url(#no-data)"
                    fillRule="evenodd"
                    {...stroke}
                    opacity={furniture}
                  />
                );
              }

              // Every value-bearing shape crossfades on ONE window, so at any frame they all sit at
              // the same opacity. That is what keeps a mid-fade shape from reading as a class it is
              // not: the ramp's comparisons are between shapes, and shapes at equal opacity over one
              // plate keep their order. The old defect this replaces was a shape lingering unfilled
              // while its neighbours were filled, which reads as a value, not as a wait.
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

            {/* The accent, and only the accent, marks the subject — after its own fill exists. */}
            {subjectSpring > 0 ? (
              <g opacity={subjectSpring}>
                <path
                  d={pathFromRings(subjectShape.rings)}
                  fill="none"
                  stroke={ground}
                  strokeWidth={5 / scale}
                  strokeLinejoin="round"
                />
                <path
                  d={pathFromRings(subjectShape.rings)}
                  fill="none"
                  stroke={accent}
                  strokeWidth={2.6 / scale}
                  strokeLinejoin="round"
                />
              </g>
            ) : null}
          </g>

          {subjectSpring > 0 ? (
            <g
              transform={`translate(${PAD + labelAt[0] * scale},${MAP_Y + labelAt[1] * scale})`}
              opacity={subjectSpring}
            >
              <text
                textAnchor="end"
                fontSize={SUBJECT_LABEL.fontSize}
                fontWeight={SUBJECT_LABEL.fontWeight}
                stroke={ground}
                strokeWidth={5}
                strokeLinejoin="round"
                fill="none"
              >
                {subjectLabel}
              </text>
              <text
                textAnchor="end"
                fontSize={SUBJECT_LABEL.fontSize}
                fontWeight={SUBJECT_LABEL.fontWeight}
                fill={accent}
              >
                {subjectLabel}
              </text>
            </g>
          ) : null}
        </g>

        {/* ── Furniture ─────────────────────────────────────────────────────────────────────── */}
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
          {sourceLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={sourceTop + i * SOURCE.lead}
              fill={muted}
              fontSize={SOURCE.fontSize}
            >
              {line}
            </text>
          ))}

          <text
            x={COLUMN.x}
            y={LEGEND.top - 22}
            fill={muted}
            fontSize={CAPTION.fontSize}
            fontWeight={CAPTION.fontWeight}
          >
            {legendCaption}
          </text>
          {ramp.map((shade, i) => (
            <rect
              key={shade}
              x={barX}
              y={barBottom - ((i + 1) * LEGEND.barHeight) / ramp.length}
              width={LEGEND.barWidth}
              height={LEGEND.barHeight / ramp.length}
              fill={shade}
            />
          ))}
          {[0, ...breaks].map((tick, i) => (
            <text
              key={tick}
              x={barX + LEGEND.barWidth + LEGEND.labelGap}
              y={barBottom - (i * LEGEND.barHeight) / ramp.length + 6}
              fill={muted}
              fontSize={TICK.fontSize}
            >
              {fr(tick, 0)}
            </text>
          ))}

          {anyNoData ? (
            <g transform={`translate(${PAD},${noDataY})`}>
              <rect
                x={0}
                y={-13}
                width={24}
                height={17}
                fill="url(#no-data)"
                stroke={muted}
                strokeWidth={0.6}
              />
              <text x={34} y={0} fill={muted} fontSize={TICK.fontSize}>
                {noDataLabel}
              </text>
            </g>
          ) : null}
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
        </g>

        {/* ── The two marks the argument is made of. The comparison arrives BEFORE the evidence and
              is left alone to be read; the subject's own value only after the subject has landed. */}
        {markers.map(({ label, value: v, colour, opacity }) =>
          opacity > 0 ? (
            <g
              key={label}
              transform={`translate(${barX - LEGEND.markerGap},${atValue(v)})`}
              opacity={opacity}
            >
              <path d="M0 0L-11 -6L-11 6Z" fill={colour} />
              <text
                x={-19}
                y={-4}
                textAnchor="end"
                fill={colour}
                fontSize={MARKER.fontSize}
                fontWeight={MARKER.fontWeight}
              >
                {label}
              </text>
              <text
                x={-19}
                y={20}
                textAnchor="end"
                fill={colour}
                fontSize={MARKER_VALUE.fontSize}
                fontWeight={MARKER_VALUE.fontWeight}
              >
                {fr(v, 1)}
              </text>
            </g>
          ) : null,
        )}
      </svg>
    </AbsoluteFill>
  );
}
