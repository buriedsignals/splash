/**
 * The video genre of "Poland emits more than double Sweden's per-capita CO2" — 8 seconds, 30fps,
 * 1080 × 1080.
 *
 * The plate and the parts come from the same bake the still draws (`bake.mjs`), and the classes,
 * the ramp and the scale come from the same `geo-choropleth.ts`. What this file adds is the one
 * thing a still cannot have: an ORDER. Every window in that order derives from `timing.ts`; there
 * is no frame literal below.
 *
 * Nothing here derives a furniture colour either — `deriveFurniture` sits beside a native
 * rasteriser that no browser bundle can load, so `render.mjs` calls it in node and passes
 * ink/muted/grid in as props. One implementation of the colour rule, two genres.
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
import {
  binIndexLowerInclusive,
  en,
  pathFromParts,
  revealOrder,
  scalePosition,
  type BakedShape,
  type JoinedRow,
} from "./geo-choropleth.ts";
import { CHOROPLETH_TIMING, progressOf, type BeatTiming } from "./timing.ts";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const MAP = 620;
const MAP_Y = 300;
const COLUMN = { x: MAP + PAD + 40, right: FRAME.width - PAD };

const TITLE = { fontSize: 38, fontWeight: 700, lead: 48 };
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

export type ChoroplethVideoProps = {
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

/**
 * How far region `index` of `count` has arrived, given the reveal's own progress.
 *
 * The regions are handed their windows in the order the caller sorted them — lowest value first
 * (`geo-discipline.md` rule 10) — and the windows overlap, so the field darkens continuously
 * rather than blinking one country at a time. Clamped at both ends: an unclamped window keeps
 * moving after its event, and the hold would not be still.
 */
export function arrivalProgress(
  index: number,
  count: number,
  reveal: number,
): number {
  const WINDOW = 0.16;
  const start = count <= 1 ? 0 : (index / (count - 1)) * (1 - WINDOW);
  return Math.max(0, Math.min(1, (reveal - start) / WINDOW));
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

export function ChoroplethVideo({
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
  timing = CHOROPLETH_TIMING,
}: ChoroplethVideoProps) {
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
  const sourceTop = titleTop + (titleLines.length - 1) * TITLE.lead + 40;

  const value = new Map(rows.map((row) => [row.key, row.value]));
  const order = revealOrder(rows);
  const rank = new Map(order.map((key, index) => [key, index]));
  const anyNoData = rows.some((row) => row.value === null);

  const barBottom = LEGEND.top + LEGEND.barHeight;
  const barX = COLUMN.right - 46 - LEGEND.barWidth;
  const atValue = (v: number) =>
    barBottom - scalePosition(v, breaks) * LEGEND.barHeight;

  const noDataY = MAP_Y + MAP + 52;
  const caveatTop = noDataY + 38;

  const subjectShape = geometry.shapes.find((shape) => shape.key === subject);
  if (!subjectShape) throw new Error(`no shape for the subject ${subject}`);
  const labelAt = geometry.anchors.label;
  if (!labelAt) throw new Error("the bake projected no label anchor");

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
          {/* A country that has not yet reached its own window in the reveal must not read as a
              value — an opacity fade from nothing lets the near-white basemap show through, which
              reads LIGHTER than the lightest filled class: for several frames the map would state
              the opposite of the data. This is a SEPARATE mark from "no-data" (dots, not a diagonal
              hatch) because it means a different thing: "not drawn yet", not "the source is silent
              about this shape" — reusing the no-data hatch here would say the wrong thing on every
              frame before a country's turn arrives. */}
          <pattern
            id="pending"
            width={10}
            height={10}
            patternUnits="userSpaceOnUse"
          >
            <rect width={10} height={10} fill={ground} />
            <circle cx={5} cy={5} r={1.3} fill={muted} />
          </pattern>
          <clipPath id="plate-clip">
            <rect x={PAD} y={MAP_Y} width={MAP} height={MAP} />
          </clipPath>
        </defs>

        {/* ── The field, arriving lowest value first ─────────────────────────────────────────── */}
        <g clipPath="url(#plate-clip)">
          <g transform={`translate(${PAD},${MAP_Y}) scale(${scale})`}>
            {geometry.shapes.map((shape) => {
              const v = value.get(shape.key);
              const arrived = arrivalProgress(
                rank.get(shape.key) ?? 0,
                order.length,
                reveal,
              );
              const d = pathFromParts(shape.parts);
              const stroke = {
                stroke: ground,
                strokeWidth: 0.8 / scale,
                strokeLinejoin: "round" as const,
              };

              if (v === null || v === undefined) {
                // No-data: unchanged. It arrives first in the order (rule 10) and its own hatch
                // already reads as "outside the scale". Never triggered on this beat's complete
                // join — kept because the field's `.map` must handle every shape uniformly, not
                // because this beat expects it to fire.
                if (arrived <= 0) return null;
                return (
                  <path
                    key={shape.key}
                    d={d}
                    fill="url(#no-data)"
                    fillRule="evenodd"
                    {...stroke}
                    opacity={arrived}
                  />
                );
              }

              // A value-bearing shape is opaque from its first frame: it holds the "pending" dots
              // — visibly not a shade the ramp could have produced — until its own window opens,
              // then crossfades to its true colour. Never translucent against the basemap, so it
              // never reads lighter than the lightest filled class.
              const trueFill = ramp[binIndexLowerInclusive(v, breaks)];
              return (
                <Fragment key={shape.key}>
                  {arrived < 1 && (
                    <path
                      d={d}
                      fill="url(#pending)"
                      fillRule="evenodd"
                      {...stroke}
                    />
                  )}
                  {arrived > 0 && (
                    <path
                      d={d}
                      fill={trueFill}
                      fillRule="evenodd"
                      {...stroke}
                      opacity={arrived}
                    />
                  )}
                </Fragment>
              );
            })}

            {/* The accent, and only the accent, marks the subject — after its own fill exists. */}
            {subjectSpring > 0 ? (
              <g opacity={subjectSpring}>
                <path
                  d={pathFromParts(subjectShape.parts)}
                  fill="none"
                  stroke={ground}
                  strokeWidth={5 / scale}
                  strokeLinejoin="round"
                />
                <path
                  d={pathFromParts(subjectShape.parts)}
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
              {en(tick, 0)}
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

        {/* ── The two marks the argument is made of. The comparison (Sweden) arrives BEFORE the
              evidence and is left alone to be read; the subject's (Poland) own value only after
              the subject has landed. */}
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
                {en(v, 1)}
              </text>
            </g>
          ) : null,
        )}
      </svg>
    </AbsoluteFill>
  );
}
