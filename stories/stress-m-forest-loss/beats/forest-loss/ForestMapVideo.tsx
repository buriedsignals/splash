/**
 * "Forest loss in 2025" — video, 1080 × 1080, `FOREST_TIMING` (7s at 30fps).
 *
 * The plate is a wide short band (Brazil to Indonesia, 228° of longitude), baked once by
 * `bake-plate.mjs` at the video's own resolution, so it sits letterboxed near the top of a square
 * frame with the ranked bar list — the same "exact numbers" device the static format uses, because
 * two of these seven countries draw only a few pixels wide at this camera's own scale — filling
 * the rest (geo-discipline.md rule 13's own third clause: the leftover height goes to furniture,
 * never to a taller camera).
 *
 * The countries and their bars arrive TOGETHER, lowest to highest (`revealOrder`), the article's
 * own "country by country". Brazil lands as its own event afterwards, outlined in the accent.
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
  pathFromRings,
  revealOrder,
  scalePosition,
  type BakedShape,
  type JoinedRow,
} from "./geo-forest";
import { FOREST_TIMING, progressOf, type BeatTiming } from "./timing";

const FRAME = { width: 1080, height: 1080 };
const PAD = 64;
const MAP_Y = 250;

const TITLE = { fontSize: 34, fontWeight: 700, lead: 42 };
const SUBTITLE = { fontSize: 19, fontWeight: 400, lead: 25 };
const ROW_LABEL = { fontSize: 21, fontWeight: 600 };
const ROW_VALUE = { fontSize: 21, fontWeight: 700 };
const SOURCE = { fontSize: 16, fontWeight: 400, lead: 20 };
const CAVEAT = { fontSize: 17, fontWeight: 600, lead: 22 };

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

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

/** How far region `index` of `count` has arrived, given the reveal's own progress — identical
 *  shape to the CO2 seed's `arrivalProgress`. */
export function arrivalProgress(
  index: number,
  count: number,
  reveal: number,
): number {
  const WINDOW = 0.18;
  const start = count <= 1 ? 0 : (index / (count - 1)) * (1 - WINDOW);
  return Math.max(0, Math.min(1, (reveal - start) / WINDOW));
}

export type ForestMapVideoProps = {
  geometry: { frame: { width: number; height: number }; shapes: BakedShape[] };
  plate: string;
  rows: JoinedRow[];
  namesByCode: Record<string, string>;
  breaks: number[];
  ramp: string[];
  title: string;
  subtitle: string;
  source: string;
  basemapCredit: string;
  caveat: string;
  conclusion: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  subject: string;
  timing?: BeatTiming;
};

export function ForestMapVideo({
  geometry,
  plate,
  rows,
  namesByCode,
  breaks,
  ramp,
  title,
  subtitle,
  source,
  basemapCredit,
  caveat,
  conclusion,
  ground,
  accent,
  ink,
  muted,
  subject,
  timing = FOREST_TIMING,
}: ForestMapVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const MAP_W = FRAME.width - PAD * 2;
  const scale = MAP_W / geometry.frame.width;
  const MAP_H = geometry.frame.height * scale;

  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const subtitleLines = wrap(subtitle, FRAME.width - PAD * 2, SUBTITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME.width - PAD * 2,
    SOURCE,
  );
  const caveatLines = wrap(caveat, FRAME.width - PAD * 2, CAVEAT);
  const titleTop = PAD + TITLE.fontSize;
  const subtitleTop = titleTop + titleLines.length * TITLE.lead + 8;

  const value = new Map(rows.map((row) => [row.key, row.value]));
  const order = revealOrder(rows);
  const rank = new Map(order.map((key, index) => [key, index]));
  const ranked = [...rows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const maxValue = Math.max(...rows.map((r) => r.value ?? 0));

  // The bottom stack is laid out UPWARD from the frame's own bottom margin — source last, caveat
  // above it, the conclusion above that — so a longer source line never overlaps a shorter one
  // computed independently (the defect the first render of this beat actually shipped: the caveat
  // and the source drew on top of each other because each was positioned from its own anchor
  // rather than from the block actually above it).
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  const caveatBottom = sourceTop - SOURCE.fontSize - 16;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * CAVEAT.lead;
  const conclusionY = caveatTop - CAVEAT.fontSize - 20;
  const rowsTop = MAP_Y + MAP_H + 60;
  const rowsBottom = conclusionY - 40;
  const rowHeight = (rowsBottom - rowsTop) / rows.length;
  const barX = 280;
  const barMaxWidth = FRAME.width - PAD - barX - 170;

  if (rowHeight < 30)
    throw new Error(
      `the ranked list does not fit: ${rows.length} rows need more than ${(rowsBottom - rowsTop).toFixed(0)}px between ${rowsTop} and ${rowsBottom}.`,
    );

  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusionProgress = progressOf(frame, timing.conclusion);

  const furniture = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const baselineOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusionProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectShape = geometry.shapes.find((s) => s.key === subject);
  if (!subjectShape) throw new Error(`no shape for the subject ${subject}`);

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      {/* The plate is an IMAGE, drawn BEFORE the svg so the svg's own shapes paint over it —
          Remotion's <Img> holds the frame until it has decoded, which a raw <image href> would not. */}
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: PAD,
          top: MAP_Y,
          width: MAP_W,
          height: MAP_H,
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
            id="pending"
            width={10}
            height={10}
            patternUnits="userSpaceOnUse"
          >
            <rect width={10} height={10} fill={ground} />
            <circle cx={5} cy={5} r={1.3} fill={muted} />
          </pattern>
        </defs>

        {titleLines.map((line, i) => (
          <text
            key={i}
            x={PAD}
            y={titleTop + i * TITLE.lead}
            fontSize={TITLE.fontSize}
            fontWeight={TITLE.fontWeight}
            fill={ink}
            opacity={furniture}
          >
            {line}
          </text>
        ))}
        {subtitleLines.map((line, i) => (
          <text
            key={i}
            x={PAD}
            y={subtitleTop + i * SUBTITLE.lead}
            fontSize={SUBTITLE.fontSize}
            fontWeight={SUBTITLE.fontWeight}
            fill={muted}
            opacity={furniture}
          >
            {line}
          </text>
        ))}

        <g clipPath={undefined} opacity={furniture}>
          <g transform={`translate(${PAD},${MAP_Y}) scale(${scale})`}>
            {geometry.shapes.map((shape) => {
              const v = value.get(shape.key);
              const arrived = arrivalProgress(
                rank.get(shape.key) ?? 0,
                order.length,
                reveal,
              );
              const d = pathFromRings(shape.rings);
              const stroke = {
                stroke: ground,
                strokeWidth: 0.9 / scale,
                strokeLinejoin: "round" as const,
              };
              if (v == null) return null;
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
        </g>

        {/* The zero baseline for the ranked list — the "reference" event: laid down before any bar
            grows, so the reader has an axis to read the build against. */}
        <line
          x1={barX}
          y1={rowsTop - rowHeight / 2}
          x2={barX}
          y2={rowsTop + (rows.length - 0.5) * rowHeight}
          stroke={muted}
          strokeWidth={1.5}
          opacity={baselineOpacity}
        />

        {ranked.map((row, i) => {
          const v = row.value ?? 0;
          const arrived = arrivalProgress(
            rank.get(row.key) ?? 0,
            order.length,
            reveal,
          );
          const isSubject = row.key === subject;
          const y = rowsTop + i * rowHeight;
          const barWidth = (v / maxValue) * barMaxWidth * arrived;
          const colour = ramp[binIndexLowerInclusive(v, breaks)];
          return (
            <g
              key={row.key}
              opacity={Math.max(furniture * 0.001, arrived > 0 ? 1 : 0)}
            >
              <text
                x={PAD}
                y={y + ROW_LABEL.fontSize / 2 - 4}
                fontSize={ROW_LABEL.fontSize}
                fontWeight={isSubject ? 800 : ROW_LABEL.fontWeight}
                fill={isSubject ? accent : ink}
              >
                {namesByCode[row.key] ?? row.key}
              </text>
              <rect
                x={barX}
                y={y - 14}
                width={Math.max(0, barWidth)}
                height={22}
                fill={isSubject ? accent : colour}
              />
              <text
                x={barX + Math.max(0, barWidth) + 12}
                y={y + ROW_VALUE.fontSize / 2 - 4}
                fontSize={ROW_VALUE.fontSize}
                fontWeight={ROW_VALUE.fontWeight}
                fill={ink}
                opacity={arrived}
              >
                {en(v)} ha
              </text>
            </g>
          );
        })}

        <text
          x={PAD}
          y={conclusionY}
          fontSize={CAVEAT.fontSize + 4}
          fontWeight={800}
          fill={accent}
          opacity={conclusionOpacity}
        >
          {conclusion}
        </text>
        {caveatLines.map((line, i) => (
          <text
            key={i}
            x={PAD}
            y={caveatTop + i * CAVEAT.lead}
            fontSize={CAVEAT.fontSize}
            fontWeight={CAVEAT.fontWeight}
            fill={muted}
            opacity={furniture}
          >
            {line}
          </text>
        ))}
        {sourceLines.map((line, i) => (
          <text
            key={i}
            x={PAD}
            y={sourceTop + i * SOURCE.lead}
            fontSize={SOURCE.fontSize}
            fontWeight={SOURCE.fontWeight}
            fill={muted}
            opacity={furniture}
          >
            {line}
          </text>
        ))}
      </svg>
    </AbsoluteFill>
  );
}
