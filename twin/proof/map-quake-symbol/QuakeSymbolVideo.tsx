/**
 * The video genre of "The 2011 Tohoku earthquake was the most powerful..." — 8 seconds, 30fps,
 * 1080 × 1080. Same plate, same points, same radius scale as the still; what this file adds is the
 * order.
 *
 * A growing-radius reveal would let a mid-grow circle read as a smaller REAL magnitude than a
 * fully-grown smaller circle beside it — the same trap `geo-discipline.md`'s choropleth reveal
 * fixed with its "pending" texture, here for size instead of fill. So radius is CONSTANT: a circle
 * is drawn at its true final size or it is not drawn at all, and what animates is only its
 * OPACITY, over its own point's arrival window. Size never lies; only presence does.
 *
 * THIS PARAGRAPH USED TO DESCRIBE SOMETHING ELSE, and the behaviour it described has been gone
 * since `5873c5e0`. It said every point drew "its true final circle as a thin outline immediately"
 * and that only the fill's opacity animated. That is exactly the defect the owner reported as
 * seventeen empty rings at frame 40: an outline on the master clock is the accent arriving before
 * the thing it accents, and it let a reader read every magnitude before a single event had. There
 * is now ONE circle per event carrying both its `stroke` and its `fill`, mounted only once
 * `arrived > 0` (see the comment at the mark itself).
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
  spanReferenceValues,
  radiusScale,
  type QuakeRow,
} from "./geo-symbol";
import type { BeatTiming } from "./timing-contract";
import { QUAKE_TIMING, progressOf } from "./timing";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
const MAP = 620;
/** The plate's top edge. It came DOWN by 40px when the credit left the header for the frame's
 *  bottom margin: the header gave back the row the source used to occupy, and the bottom stack
 *  needed that room to hold the credit as well as the caveat. The same move the seed made
 *  (twin-map-beat/assets/Co2MapVideo.tsx, MAP_Y 300 -> 250), and the guard below is what said so —
 *  it threw, by name, with the numbers in the message. */
const MAP_Y = 260;
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
  // THE SOURCE IS THE LAST LINE BEFORE THE BOTTOM MARGIN — the credit sits at the bottom of the
  // visual, the same place on every graphic this project ships, and it carries the basemap credit
  // with it, unsplit. It used to hang directly under the title. The bottom stack is laid out
  // UPWARD from `FRAME.height - PAD`; the plate is fixed at MAP_Y and does not move. See
  // twin-map-beat/assets/Co2MapVideo.tsx, which this is copied from.
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  const caveatBottom = sourceTop - SOURCE.fontSize - 12;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;

  // Loud, not silent: the plate's own floor and the bottom stack must not meet. The plate is
  // fixed, so this is the one collision a longer source or caveat can actually cause — the same
  // guard the seed carries (Co2MapVideo.tsx), added here because this beat had none and the first
  // render after the credit moved put the caveat's first line 13px under the plate's edge.
  if (caveatTop - NOTE.fontSize - 16 < MAP_Y + MAP)
    throw new Error(
      `the bottom stack does not fit: the plate ends at ${MAP_Y + MAP} and the caveat starts at ${caveatTop}. ` +
        `Shorten the source or the caveat, or raise MAP_Y (${MAP_Y}).`,
    );

  const maxMag = Math.max(...geometry.points.map((p) => p.mag));
  const radiusOf = radiusScale(maxMag, MAX_RADIUS);
  const legend = spanReferenceValues(geometry.points.map((p) => p.mag));
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

  // Tohoku arrives LAST, in the reveal, like every other event — the final slot of a cascade one
  // longer than `order`. It used to be drawn from frame one as a pending outline at its true final
  // radius and only take its fill at `subject`, which announced the whole finding before the
  // reveal had begun. The `subject` event is now what it says it is: the moment the mark it is
  // about takes the accent, not the moment it first exists.
  const subjectArrived = arrivalProgress(
    order.length,
    order.length + 1,
    reveal,
  );

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
              // ONE circle per event, carrying its outline AND its fill, arriving on the mark's
              // own window. Drawn as two nodes — a "pending" outline on the master clock with the
              // fill arriving later — the map showed seventeen empty rings the moment the plate
              // appeared, each already at its true final radius, so the reader could read every
              // magnitude before a single event had arrived. `motion-grammar.md:159` names this:
              // the accent before the thing it accents. SVG gives one node both properties.
              if (arrived <= 0) return null;
              return (
                <circle
                  key={point.key}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={muted}
                  fillOpacity={0.38}
                  stroke={muted}
                  strokeWidth={1.4 / scale}
                  opacity={arrived}
                />
              );
            })}

            {/* The subject: ONE circle whose colour switches to the accent at its own event's
                boundary. It arrives with the rest of the field, on its own place in the reveal —
                not as an outline held over from frame one and dissolved into an accent copy. */}
            {subjectArrived > 0 && (
              <circle
                cx={subject.px}
                cy={subject.py}
                r={radiusOf(subject.mag)}
                fill={subjectSpring > 0 ? accent : muted}
                fillOpacity={subjectSpring > 0 ? 0.55 : 0.38}
                stroke={subjectSpring > 0 ? accent : muted}
                strokeWidth={(subjectSpring > 0 ? 2.4 : 1.4) / scale}
                opacity={subjectArrived}
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
        {/* Title, source and caveat are UNGATED — frame 0 is the poster frame, the one image a
            reader sees before pressing play and the frame a CMS pulls as the thumbnail. Gated on
            `establish`, whose progress at frame 0 is exactly 0, the poster was blank: measured at
            0.0000% non-ground pixels. The basemap and legend keep their fade. */}
        <g>
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

        <g>
          {caveatLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={caveatBottom - (caveatLines.length - 1 - i) * NOTE.lead}
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
