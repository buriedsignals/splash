/**
 * The video genre of "The 2011 Tohoku earthquake was the most powerful..." — 8 seconds, 30fps,
 * 1080 × 1080. Same plate, same points, same radius scale as the still; what this file adds is the
 * order.
 *
 * A growing-radius reveal would let a mid-grow circle read as a smaller REAL magnitude than a
 * fully-grown smaller circle beside it — the same trap `geo-discipline.md`'s choropleth reveal
 * fixed with its "pending" texture, here for size instead of fill. So radius is CONSTANT from frame
 * one: every point draws its true final circle as a thin outline immediately, and what animates is
 * only the FILL's opacity, at its own point's arrival window. Size never lies; only presence does.
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
  arrivalProgress,
  drawOrder,
  energyRatio,
  niceReferenceValues,
  radiusScale,
  type QuakeRow,
} from "./geo-symbol";
import type { BeatTiming } from "./timing-contract";
import { QUAKE_TIMING, progressOf } from "./timing";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const MAP = 620;
const MAP_Y = 300;
const COLUMN = { x: MAP + PAD + 40, right: FRAME.width - PAD };
const MAX_RADIUS = 46;

const TITLE = { fontSize: 40, fontWeight: 700, lead: 50 };
const SOURCE = { fontSize: 19, fontWeight: 400, lead: 24 };
const CAPTION = { fontSize: 18, fontWeight: 600 };
const LEGEND_LABEL = { fontSize: 15, fontWeight: 400 };
const NOTE = { fontSize: 17, fontWeight: 400, lead: 22 };
const CONCLUSION = { fontSize: 23, fontWeight: 700, lead: 30 };

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

let measuringContext: CanvasRenderingContext2D | null | undefined;
function measureText(
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

function wrap(
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

export type QuakeSymbolVideoProps = {
  geometry: {
    frame: { width: number; height: number };
    points: (QuakeRow & { px: number; py: number })[];
  };
  plate: string;
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  subjectKey: string;
  comparisonKey: string;
  timing?: BeatTiming;
};

export function QuakeSymbolVideo({
  geometry,
  plate,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  ground,
  accent,
  ink,
  muted,
  subjectKey,
  comparisonKey,
  timing = QUAKE_TIMING,
}: QuakeSymbolVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = MAP / geometry.frame.width;

  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME.width - PAD * 2,
    SOURCE,
  );
  const caveatLines = wrap(caveat, FRAME.width - PAD * 2, NOTE);
  const titleTop = PAD + TITLE.fontSize;
  const sourceTop = titleTop + (titleLines.length - 1) * TITLE.lead + 40;

  const maxMag = Math.max(...geometry.points.map((p) => p.mag));
  const radiusOf = radiusScale(maxMag, MAX_RADIUS);
  const legend = niceReferenceValues(maxMag);
  const subject = geometry.points.find((p) => p.key === subjectKey);
  if (!subject) throw new Error(`no point for the subject ${subjectKey}`);
  const comparison = geometry.points.find((p) => p.key === comparisonKey);
  if (!comparison)
    throw new Error(`no point for the comparison ${comparisonKey}`);
  const ratio = energyRatio(subject.mag, comparison.mag);
  const conclusionText = `M${subject.mag} released roughly ${ratio.toFixed(1)}× the energy of the next-largest event (${comparison.place.split(",")[0]}, M${comparison.mag}).`;
  const columnWidth = COLUMN.right - COLUMN.x;
  const conclusionLines = wrap(conclusionText, columnWidth, CONCLUSION);
  const legendCaptionLines = wrap(legendCaption, columnWidth, CAPTION);

  const order = drawOrder(
    geometry.points.filter((p) => p.key !== subjectKey),
  ).reverse(); // ascending
  const rank = new Map(order.map((p, i) => [p.key, i]));

  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subjectProgress = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  const furniture = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const legendOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
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
          <clipPath id="plate-clip">
            <rect x={PAD} y={MAP_Y} width={MAP} height={MAP} />
          </clipPath>
        </defs>

        <g clipPath="url(#plate-clip)">
          <g transform={`translate(${PAD},${MAP_Y}) scale(${scale})`}>
            {order.map((point) => {
              const r = radiusOf(point.mag);
              const cx = point.px;
              const cy = point.py;
              const arrived = arrivalProgress(
                rank.get(point.key) ?? 0,
                order.length,
                reveal,
              );
              return (
                <Fragment key={point.key}>
                  {/* Pending: the true final size, visible from frame one as an outline only. */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke={muted}
                    strokeWidth={1.2 / scale}
                    opacity={furniture}
                  />
                  {arrived > 0 && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={muted}
                      fillOpacity={0.38}
                      stroke={muted}
                      strokeWidth={1.4 / scale}
                      opacity={arrived}
                    />
                  )}
                </Fragment>
              );
            })}

            {/* The subject: pending outline throughout, then crossfades to the accent as its own event. */}
            <circle
              cx={subject.px}
              cy={subject.py}
              r={radiusOf(subject.mag)}
              fill="none"
              stroke={muted}
              strokeWidth={1.2 / scale}
              opacity={furniture * (1 - subjectSpring)}
            />
            {subjectSpring > 0 && (
              <circle
                cx={subject.px}
                cy={subject.py}
                r={radiusOf(subject.mag)}
                fill={accent}
                fillOpacity={0.55}
                stroke={accent}
                strokeWidth={2.4 / scale}
                opacity={subjectSpring}
              />
            )}
          </g>

          {subjectSpring > 0 ? (
            <g
              transform={`translate(${PAD + subject.px * scale + radiusOf(subject.mag) * scale + 14},${MAP_Y + subject.py * scale + 6})`}
              opacity={subjectSpring}
            >
              <text
                fontSize={22}
                fontWeight={700}
                stroke={ground}
                strokeWidth={5}
                strokeLinejoin="round"
                fill="none"
              >
                {`M${subject.mag}`}
              </text>
              <text fontSize={22} fontWeight={700} fill={accent}>
                {`M${subject.mag}`}
              </text>
            </g>
          ) : null}
        </g>

        {/* ── Furniture ───────────────────────────────────────────────────────────────────── */}
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
        </g>

        {/* ── The size legend, its own "reference" event ─────────────────────────────────── */}
        <g opacity={legendOpacity}>
          {legendCaptionLines.map((line, i) => (
            <text
              key={line}
              x={COLUMN.x}
              y={420 + i * (CAPTION.fontSize + 6)}
              fill={muted}
              fontSize={CAPTION.fontSize}
              fontWeight={CAPTION.fontWeight}
            >
              {line}
            </text>
          ))}
          {(() => {
            const maxR = Math.max(...legend.map((v) => radiusOf(v)));
            const baseline =
              420 +
              (legendCaptionLines.length - 1) * (CAPTION.fontSize + 6) +
              maxR * 2 +
              34;
            const ordered = [...legend].reverse();
            let cx = COLUMN.x + radiusOf(ordered[0]!);
            return ordered.map((v) => {
              const r = radiusOf(v);
              const mark = (
                <Fragment key={v}>
                  <circle
                    cx={cx}
                    cy={baseline - r}
                    r={r}
                    fill="none"
                    stroke={muted}
                    strokeWidth={1.2}
                  />
                  <text
                    x={cx}
                    y={baseline - r * 2 - 10}
                    textAnchor="middle"
                    fill={muted}
                    fontSize={LEGEND_LABEL.fontSize}
                  >
                    {`M${v.toFixed(1)}`}
                  </text>
                </Fragment>
              );
              cx += r + maxR * 0.55 + 22;
              return mark;
            });
          })()}
        </g>

        {/* ── The conclusion ───────────────────────────────────────────────────────────────── */}
        <g opacity={conclusionOpacity}>
          {conclusionLines.map((line, i) => (
            <text
              key={line}
              x={COLUMN.x}
              y={620 + i * CONCLUSION.lead}
              fill={accent}
              fontSize={CONCLUSION.fontSize}
              fontWeight={CONCLUSION.fontWeight}
            >
              {line}
            </text>
          ))}
        </g>

        <g opacity={furniture}>
          {caveatLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={FRAME.height - PAD - (caveatLines.length - 1 - i) * NOTE.lead}
              fill={muted}
              fontSize={NOTE.fontSize}
            >
              {line}
            </text>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
}
