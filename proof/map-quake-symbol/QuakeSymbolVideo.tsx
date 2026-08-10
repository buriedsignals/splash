/**
 * The video genre of "The 2011 Tohoku earthquake was the most powerful..." — 8 seconds, 30 fps.
 * Same plate, same points, same radius scale as the still; what this file adds is the order.
 *
 * A growing-radius reveal would let a mid-grow circle read as a smaller REAL magnitude than a
 * fully-grown smaller circle beside it — the same trap `geo-discipline.md`'s choropleth reveal
 * fixed with its "pending" texture, here for size instead of fill. So radius is CONSTANT: a circle
 * is drawn at its true final size or it is not drawn at all, and what animates is only its
 * OPACITY, over its own point's arrival window. Size never lies; only presence does.
 *
 * ── THERE IS NO `const FRAME` HERE ANY MORE, AND THIS BEAT DELIVERS NO VIDEO AT ALL ──────────
 *
 * It used to read `{ width: 1080, height: 1080 }` with `MAP = 620` beside it, and `Root.tsx`
 * repeated the same two numbers, so they agreed by construction and the size a journalist pinned at
 * gate 2c reached nothing. The frame is now `sizeFor(size)`'s, out of `chart-video`'s table — and
 * reading that table is what showed the beat cannot honour ANY of its three rows.
 *
 * THE VIDEO TABLE IS NOT THE STILL'S, and the difference is the whole story. A static landscape is
 * read in a ~900 px article column, so its floor is 26 px; a landscape VIDEO is watched, and the
 * mode a 16:9 video is designed for is the phone turned sideways at ~800 dp, so its floor is 30 and
 * its `typeScale` 2.5. This beat was tuned at 1080 × 1080 with its smallest token at 15 px — 5 CSS
 * px on the phone a social video is watched on. Raising it to the floor is the whole point of the
 * table, and it costs height this frame does not have.
 *
 * The refusal below carries its own arithmetic, at every size, and `BRIEF.md` records the same
 * numbers with the removal ladder that was run against them. Two rungs of that ladder exist here at
 * all (R4, the conclusion; R7, the caveat) and together they recover ~190 px against a shortfall
 * this beat measures in hundreds — and R7 costs the sentence that says the circles are sized by
 * ENERGY, which on a map is the honesty line, not a caption.
 *
 * The still ships at landscape. A beat with two genres is two answers, not one.
 *
 * WHAT IS BELOW THE REFUSAL IS UNREACHED, AND SAID SO RATHER THAN QUIETLY LEFT. Every constant in
 * it now derives from the table, so it is not a second frame hiding under a first — but no size
 * this toolchain exports reaches it, so nobody has opened a frame it drew. The day the words get
 * shorter or a row gets taller, it is the arithmetic above that decides, not a literal.
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
  frameInsetFor,
  sizeFor,
  stageFor,
  viewedAtCssPx,
} from "#shared/chart-video/sizes.mjs";
import {
  lonSpanOf,
  mapStageBox,
  typeScaleFor,
} from "#shared/map-beat/stage.mjs";
import {
  arrivalProgress,
  drawOrder,
  energyRatio,
  spanReferenceValues,
  energyRadiusScale,
  type QuakeRow,
} from "./geo-symbol";
import type { BeatTiming } from "./timing-contract";
import { QUAKE_TIMING, progressOf } from "./timing";

/**
 * THE BEAT'S OWN TUNING, REBASED ONTO THE 900-WIDE CONVENTION THE TABLE MULTIPLIES.
 *
 * These were 40 / 19 / 18 / 15 / 17 / 23 / 22 on a 1080 frame. The table's `typeScale` is a
 * multiplier over a beat's 900 × 560 base tokens, so a 1080-frame tuning has to be divided by 1.2
 * before it can be scaled by 2.5 — otherwise the beat is asking for its 1080 numbers to be
 * multiplied again. Every spacing number goes through `sp` as well, not only the fonts: eleven bare
 * literals in one beat's layout arithmetic collided a title into a subtitle at 1920 × 1080.
 */
const BASE = {
  TITLE: { fontSize: 33, fontWeight: 700, lead: 42 },
  SOURCE: { fontSize: 16, fontWeight: 400, lead: 20 },
  CAPTION: { fontSize: 15, fontWeight: 600, lead: 20 },
  LEGEND_LABEL: { fontSize: 13, fontWeight: 400 },
  NOTE: { fontSize: 14, fontWeight: 400, lead: 18 },
  CONCLUSION: { fontSize: 19, fontWeight: 700, lead: 25 },
  SUBJECT_LABEL: { fontSize: 18, fontWeight: 700 },
  GUTTER: 34,
  LEGEND_CIRCLE_GAP: 15,
  LEGEND_TOP_AIR: 24,
  LEGEND_LABEL_DROP: 8,
  BLOCK_AIR: 16,
  CAVEAT_TO_SOURCE: 12,
  SUBJECT_LABEL_GAP: 12,
  MARKER_STROKE: 1.4,
  LABEL_HALO: 4,
};

/** The smallest token this beat draws. It clears the table's own seed value of 12, so `typeScaleFor`
 *  returns the row's default and this beat needs no multiplier of its own. */
const SMALLEST_BASE_TOKEN = BASE.LEGEND_LABEL.fontSize;

/** See the still's copy of these three — fractions of the PLATE, so they are scale-free. */
const MARK_MAX_RADIUS_FRACTION = 0.062;
const MIN_LEGIBLE_RADIUS_PX = 4;
const MARK_MAX_RADIUS_CEILING_FRACTION = 0.12;

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

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    sp,
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    CAPTION: f(BASE.CAPTION) as typeof BASE.CAPTION,
    LEGEND_LABEL: f(BASE.LEGEND_LABEL) as typeof BASE.LEGEND_LABEL,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    CONCLUSION: f(BASE.CONCLUSION) as typeof BASE.CONCLUSION,
    SUBJECT_LABEL: f(BASE.SUBJECT_LABEL) as typeof BASE.SUBJECT_LABEL,
  };
}

export type QuakeSymbolVideoProps = {
  geometry: {
    frame: { width: number; height: number };
    frameCorners: { west: number; north: number; east: number; south: number };
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
  /** The export size gate 2c pinned, read from `BRIEF.md` by `render.mjs`. */
  size: string;
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
  size,
  timing = QUAKE_TIMING,
}: QuakeSymbolVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const row = sizeFor(size);
  const FRAME = { width: row.width, height: row.height };
  const PAD = frameInsetFor(size);
  const T = tokens(typeScaleFor(row, SMALLEST_BASE_TOKEN));
  const sp = T.sp;
  const band = stageFor(size);
  const top = band.top + PAD;
  const contentWidth = FRAME.width - PAD * 2;

  const { radiusOf, maxRadiusPx, minRadiusPx } = energyRadiusScale(
    geometry.points.map((p) => p.mag),
    {
      frameWidth: geometry.frame.width,
      maxRadiusFraction: MARK_MAX_RADIUS_FRACTION,
      minLegibleRadiusPx: MIN_LEGIBLE_RADIUS_PX,
      maxRadiusCeilingFraction: MARK_MAX_RADIUS_CEILING_FRACTION,
    },
  );
  const legend = spanReferenceValues(geometry.points.map((p) => p.mag));
  const subject = geometry.points.find((p) => p.key === subjectKey);
  if (!subject) throw new Error(`no point for the subject ${subjectKey}`);
  const comparison = geometry.points.find((p) => p.key === comparisonKey);
  if (!comparison)
    throw new Error(`no point for the comparison ${comparisonKey}`);
  const ratio = energyRatio(subject.mag, comparison.mag);
  const conclusionText = `M${subject.mag} released roughly ${ratio.toFixed(1)}× the energy of the next-largest event (${comparison.place.split(",")[0]}, M${comparison.mag}).`;

  // ── THE FURNITURE BUDGET, MEASURED BEFORE THE LAYOUT IS BUILT ───────────────────────────────
  // Three blocks run the full content width — the title above the picture, the caveat and the
  // credit below it — and whatever they leave is the band the map and its side column share. The
  // furniture is measured FIRST and the map takes what is left, which is the rule read from the
  // end that can refuse honestly. A map sized first and furniture squeezed after is how a credit
  // ends up off the frame with every counter green.
  const sourceText = `${source} · ${basemapCredit}`;
  const titleLines = wrap(title, contentWidth, T.TITLE);
  const caveatLines = wrap(caveat, contentWidth, T.NOTE);
  const sourceLines = wrap(sourceText, contentWidth, T.SOURCE);

  const titleTop = top + T.TITLE.fontSize;
  const titleBlock = T.TITLE.fontSize + (titleLines.length - 1) * T.TITLE.lead;
  const sourceBottom = band.top + band.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  const sourceBlock =
    T.SOURCE.fontSize + (sourceLines.length - 1) * T.SOURCE.lead;
  const caveatBottom =
    sourceTop - T.SOURCE.fontSize - sp(BASE.CAVEAT_TO_SOURCE);
  const caveatTop = caveatBottom - (caveatLines.length - 1) * T.NOTE.lead;
  const caveatBlock = T.NOTE.fontSize + (caveatLines.length - 1) * T.NOTE.lead;

  const mapBandTop = top + titleBlock + sp(BASE.BLOCK_AIR);
  const mapBandBottom = caveatTop - T.NOTE.fontSize - sp(BASE.BLOCK_AIR);
  const mapBand = mapBandBottom - mapBandTop;

  // The floor a map is still a map at, in this beat's own strings and its own encoding:
  //  · the plate may not be narrower than the longest word this beat has to set, which is the same
  //    floor the still uses; and
  //  · its SMALLEST mark must still resolve as a disc. `MIN_LEGIBLE_RADIUS_PX` is 4 — a CSS-pixel
  //    judgement made when the plate was drawn 1:1 into a 900-wide frame — and a landscape video is
  //    watched at ~800 dp, so a frame pixel here is `viewedAtCssPx / width` of a CSS one. A mark
  //    under that floor is a dot, and a proportional-symbol map whose small marks are dots has lost
  //    the channel it argues in.
  const minPlateForWords = Math.ceil(
    Math.max(...title.split(/\s+/).map((w) => measureText(w, T.TITLE))),
  );
  const cssPerFramePx = viewedAtCssPx(size) / FRAME.width;
  const smallestMarkShare = minRadiusPx / geometry.frame.width;
  const minPlateForMarks = Math.ceil(
    MIN_LEGIBLE_RADIUS_PX / cssPerFramePx / smallestMarkShare,
  );
  const minPlate = Math.max(minPlateForWords, minPlateForMarks);

  const stage =
    mapBand > 0
      ? mapStageBox({
          availableWidth: contentWidth,
          availableHeight: mapBand,
          plateFrame: geometry.frame,
          studyLonSpanDeg: lonSpanOf(geometry),
        })
      : { width: 0, height: 0, boundBy: "height" as const };

  if (stage.width < minPlate) {
    // R9, stated, with the arithmetic that produced it and the ladder that was run first.
    const smallestDrawn = smallestMarkShare * Math.max(stage.width, 0);
    throw new Error(
      `map-quake-symbol's VIDEO cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `Its words take ${titleBlock + caveatBlock + sourceBlock + sp(BASE.BLOCK_AIR) * 2 + sp(BASE.CAVEAT_TO_SOURCE)}px of the ` +
        `${band.height - PAD * 2}px band — title ${titleLines.length} lines (${titleBlock}), caveat ` +
        `${caveatLines.length} (${caveatBlock}), credit ${sourceLines.length} (${sourceBlock}) — leaving ` +
        `${Math.round(mapBand)}px for the map, so the plate would be ${stage.width}x${stage.height}.\n` +
        `That is under this beat's own floor of ${minPlate}px: ${minPlateForWords}px is the longest ` +
        `word it has to set at a ${T.TITLE.fontSize}px title, and ${minPlateForMarks}px is what its ` +
        `SMALLEST mark needs to stay a ${MIN_LEGIBLE_RADIUS_PX}px disc rather than a dot — at ` +
        `${stage.width}px that mark is ${smallestDrawn.toFixed(1)}px, ` +
        `${(smallestDrawn * cssPerFramePx).toFixed(1)} CSS px on the ${viewedAtCssPx(size)} dp this ` +
        `frame is watched at.\n` +
        `At ${size} the legibility floor is ${row.minTypePx}px and that is what makes the words this ` +
        `tall. The removal ladder was run: R1 and R2 do not exist on a map (no axis title, no value ` +
        `ticks); R4 recovers the conclusion and R7 the caveat, and both together leave a strip rather ` +
        `than a map — and R7 costs the sentence that says these circles are sized by ENERGY, which is ` +
        `this beat's honesty line and not a caption.\n` +
        `The STILL of this beat ships at landscape (1920x1080). The video ships at no size.`,
    );
  }

  // ── UNREACHED TODAY. Everything below draws from the numbers above, so it carries no frame of
  //    its own — but no exported size gets here, and nobody has opened a frame it produced.
  const scale = stage.width / geometry.frame.width;
  const MAP = stage.width;
  const MAP_X = PAD;
  const MAP_Y = mapBandTop + Math.round((mapBand - stage.height) / 2);
  const COLUMN = { x: PAD + MAP + sp(BASE.GUTTER) };
  const columnWidth = FRAME.width - PAD - COLUMN.x;
  const conclusionLines = wrap(conclusionText, columnWidth, T.CONCLUSION);
  const legendCaptionLines = wrap(legendCaption, columnWidth, T.CAPTION);

  const order = drawOrder(
    geometry.points.filter((p) => p.key !== subjectKey),
  ).reverse(); // ascending
  const rank = new Map(order.map((p, i) => [p.key, i]));

  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
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
  // longer than `order`. The `subject` event is what it says it is: the moment the mark it is about
  // takes the accent, not the moment it first exists.
  const subjectArrived = arrivalProgress(
    order.length,
    order.length + 1,
    reveal,
  );

  const legendTop = mapBandTop + T.CAPTION.fontSize;
  const legendCaptionBottom =
    legendTop + (legendCaptionLines.length - 1) * T.CAPTION.lead;
  const legendLabelBaseline =
    legendCaptionBottom + sp(BASE.LEGEND_TOP_AIR) + T.LEGEND_LABEL.fontSize;
  const legendBaseline =
    legendLabelBaseline + sp(BASE.LEGEND_LABEL_DROP) + maxRadiusPx * scale * 2;
  const conclusionTop =
    legendBaseline + sp(BASE.BLOCK_AIR) * 2 + T.CONCLUSION.fontSize;

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: MAP_X,
          top: MAP_Y,
          width: MAP,
          height: stage.height,
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
            <rect x={MAP_X} y={MAP_Y} width={MAP} height={stage.height} />
          </clipPath>
        </defs>

        <g clipPath="url(#plate-clip)">
          <g transform={`translate(${MAP_X},${MAP_Y}) scale(${scale})`}>
            {order.map((point) => {
              const arrived = arrivalProgress(
                rank.get(point.key) ?? 0,
                order.length,
                reveal,
              );
              // ONE circle per event, carrying its outline AND its fill, arriving on the mark's own
              // window. Drawn as two nodes — a "pending" outline on the master clock with the fill
              // arriving later — the map showed seventeen empty rings the moment the plate appeared,
              // each already at its true final radius, so the reader could read every magnitude
              // before a single event had arrived. `motion-grammar.md:159` names this: the accent
              // before the thing it accents.
              if (arrived <= 0) return null;
              return (
                <circle
                  key={point.key}
                  cx={point.px}
                  cy={point.py}
                  r={radiusOf(point.mag)}
                  fill={muted}
                  fillOpacity={0.38}
                  stroke={muted}
                  strokeWidth={sp(BASE.MARKER_STROKE) / scale}
                  opacity={arrived}
                />
              );
            })}

            {/* The subject: ONE circle whose colour switches to the accent at its own event's
                boundary. It arrives with the rest of the field, on its own place in the reveal. */}
            {subjectArrived > 0 && (
              <circle
                cx={subject.px}
                cy={subject.py}
                r={radiusOf(subject.mag)}
                fill={subjectSpring > 0 ? accent : muted}
                fillOpacity={subjectSpring > 0 ? 0.55 : 0.38}
                stroke={subjectSpring > 0 ? accent : muted}
                strokeWidth={
                  (subjectSpring > 0
                    ? sp(BASE.MARKER_STROKE * 1.7)
                    : sp(BASE.MARKER_STROKE)) / scale
                }
                opacity={subjectArrived}
              />
            )}
          </g>

          {subjectSpring > 0 ? (
            <g
              transform={`translate(${MAP_X + subject.px * scale + radiusOf(subject.mag) * scale + sp(BASE.SUBJECT_LABEL_GAP)},${MAP_Y + subject.py * scale + T.SUBJECT_LABEL.fontSize / 3})`}
              opacity={subjectSpring}
            >
              <text
                fontSize={T.SUBJECT_LABEL.fontSize}
                fontWeight={T.SUBJECT_LABEL.fontWeight}
                stroke={ground}
                strokeWidth={sp(BASE.LABEL_HALO)}
                strokeLinejoin="round"
                fill="none"
              >
                {`M${subject.mag}`}
              </text>
              <text
                fontSize={T.SUBJECT_LABEL.fontSize}
                fontWeight={T.SUBJECT_LABEL.fontWeight}
                fill={accent}
              >
                {`M${subject.mag}`}
              </text>
            </g>
          ) : null}
        </g>

        {/* ── Furniture ───────────────────────────────────────────────────────────────────── */}
        {/* Title, caveat and credit are UNGATED — frame 0 is the poster frame, the one image a
            reader sees before pressing play and the frame a CMS pulls as the thumbnail. Gated on
            `establish`, whose progress at frame 0 is exactly 0, the poster was blank: measured at
            0.0000% non-ground pixels. The basemap and legend keep their fade. */}
        <g>
          {titleLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={titleTop + i * T.TITLE.lead}
              fill={ink}
              fontSize={T.TITLE.fontSize}
              fontWeight={T.TITLE.fontWeight}
            >
              {line}
            </text>
          ))}
          {caveatLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={caveatTop + i * T.NOTE.lead}
              fill={muted}
              fontSize={T.NOTE.fontSize}
            >
              {line}
            </text>
          ))}
          {sourceLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={sourceTop + i * T.SOURCE.lead}
              fill={muted}
              fontSize={T.SOURCE.fontSize}
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
              y={legendTop + i * T.CAPTION.lead}
              fill={muted}
              fontSize={T.CAPTION.fontSize}
              fontWeight={T.CAPTION.fontWeight}
            >
              {line}
            </text>
          ))}
          {(() => {
            const ordered = [...legend].reverse();
            const radiusAt = (v: number) => radiusOf(v) * scale;
            // Spacing derived from BOTH neighbours — see the still sibling's own note. The old
            // `r + maxR * 0.55 + 22` never looked at the next circle's radius, which was invisible
            // while every key was within 8% of every other and drew one ring through another the
            // moment the energy scale started separating them. Drawn at the MAP's own scale, so the
            // ruler and the marks it keys are the same size.
            const labelWidths = ordered.map((v) =>
              measureText(`M${v.toFixed(1)}`, T.LEGEND_LABEL),
            );
            let cx = COLUMN.x + radiusAt(ordered[0]!);
            return ordered.map((v, i) => {
              const r = radiusAt(v);
              const mark = (
                <Fragment key={v}>
                  <circle
                    cx={cx}
                    cy={legendBaseline - r}
                    r={r}
                    fill="none"
                    stroke={muted}
                    strokeWidth={sp(1.2)}
                  />
                  <text
                    x={cx}
                    y={legendBaseline - r * 2 - sp(BASE.LEGEND_LABEL_DROP)}
                    textAnchor="middle"
                    fill={muted}
                    fontSize={T.LEGEND_LABEL.fontSize}
                  >
                    {`M${v.toFixed(1)}`}
                  </text>
                </Fragment>
              );
              const next = ordered[i + 1];
              if (next !== undefined)
                cx += Math.max(
                  r + radiusAt(next) + sp(BASE.LEGEND_CIRCLE_GAP),
                  (labelWidths[i]! + labelWidths[i + 1]!) / 2 +
                    sp(BASE.LEGEND_CIRCLE_GAP),
                );
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
              y={conclusionTop + i * T.CONCLUSION.lead}
              fill={accent}
              fontSize={T.CONCLUSION.fontSize}
              fontWeight={T.CONCLUSION.fontWeight}
            >
              {line}
            </text>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
}
