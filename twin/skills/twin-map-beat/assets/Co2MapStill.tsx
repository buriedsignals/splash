/**
 * The static genre of "La Suisse sous la moyenne européenne" — 900 × 560, one frame, no order.
 *
 * REPLACE ME. Do not parameterise me. This file seeds the static genre.
 *
 * What it draws: a baked basemap plate as one `<image>`, the study set as one path each, and the
 * beat's own furniture. There is no map here — `scripts/bake-plate.mjs` already spent the camera,
 * and everything below is an image and some coordinates (`geo-discipline.md` rules 2 and 3).
 *
 * The layout is a text column beside a square plate, because Europe projected is taller than it is
 * wide and a 900 × 560 frame that holds it also holds the mid-Atlantic (rule 12). The camera was
 * chosen first; this layout is what came back.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "../scripts/render-still.mjs";
import {
  binIndexLowerInclusive,
  fr,
  pathFromRings,
  scalePosition,
  type BakedShape,
  type JoinedRow,
} from "./geo";

const FRAME = { width: 900, height: 560 };
const PAD = 32;
const GUTTER = 32;
/** The plate is square and fills the frame's height; the column takes what is left. */
const MAP = FRAME.height - PAD * 2;
const MAP_X = FRAME.width - PAD - MAP;
const COLUMN = { x: PAD, width: MAP_X - GUTTER - PAD };

const TITLE = { fontSize: 20, fontWeight: 700, lead: 26 };
const SOURCE = { fontSize: 13, fontWeight: 400, lead: 17 };
const CAPTION = { fontSize: 12, fontWeight: 600 };
const TICK = { fontSize: 12, fontWeight: 400 };
const MARKER = { fontSize: 12.5, fontWeight: 600 };
const NOTE = { fontSize: 11.5, fontWeight: 400, lead: 15 };
const SUBJECT_LABEL = { fontSize: 15, fontWeight: 700 };

/** The legend: a vertical class bar, value increasing upward, so "below the average" is literal. */
const LEGEND = { barWidth: 22, barHeight: 200, labelGap: 10, markerGap: 12 };

export type Co2MapStillProps = {
  /** The bake: pixel-space rings in the plate's own coordinate space, plus its projected anchors. */
  geometry: {
    frame: { width: number; height: number };
    shapes: BakedShape[];
    anchors: Record<string, [number, number]>;
  };
  /** The basemap capture, as a data URI, drawn at the size it was captured for. */
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
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  subject: string;
  subjectLabel: string;
  subjectValue: number;
  comparisonLabel: string;
  comparisonValue: number;
};

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

export function Co2MapStill({
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
  alt,
  ground,
  accent,
  ink,
  muted,
  subject,
  subjectLabel,
  subjectValue,
  comparisonLabel,
  comparisonValue,
}: Co2MapStillProps) {
  const scale = MAP / geometry.frame.width;
  const value = new Map(rows.map((row) => [row.key, row.value]));
  const anyNoData = rows.some((row) => row.value === null);

  const fillOf = (key: string): string => {
    const v = value.get(key);
    return v === null || v === undefined
      ? "url(#no-data)"
      : ramp[binIndexLowerInclusive(v, breaks)]!;
  };

  // ── The column, measured top to bottom. Nothing below is a constant offset.
  const titleLines = wrap(title, COLUMN.width, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    COLUMN.width,
    SOURCE,
  );
  const caveatLines = wrap(caveat, COLUMN.width, NOTE);

  // The column is laid out from BOTH ends and meets in the middle, because the two halves are
  // anchored to different things: the title hangs off the top, and the caveat is the last line
  // before the bottom margin. The first render laid it out top-down with a fixed bar height and
  // pushed the caveat's second line off the canvas — the kind of clipped layer this twin's chart
  // genre found four of in the engine it replaces, every one by eye and none by a test.
  const titleTop = PAD + TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * TITLE.lead;

  // THE SOURCE IS NOW THE LAST LINE BEFORE THE BOTTOM MARGIN — the credit sits at the bottom of the
  // visual, in the same place on every graphic this project ships. It used to hang directly under
  // the title. Nothing here is a translation of a `<text>`: this column is laid out from both ends,
  // so the source joining the bottom half pushes the WHOLE bottom stack (caveat, no-data swatch,
  // legend bar, caption) up by exactly the source block's own height. The plate is a fixed square
  // and does not move; what shrinks is the legend's available room.
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;

  const caveatBottom = sourceTop - SOURCE.fontSize - 12;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;
  const noDataY = caveatTop - NOTE.fontSize - 24;
  const barBottom = (anyNoData ? noDataY : caveatTop) - 34;
  const barTop = barBottom - LEGEND.barHeight;
  const captionY = barTop - 16;
  const barX = COLUMN.x + COLUMN.width - 92 - LEGEND.barWidth;
  const atValue = (v: number) =>
    barBottom - scalePosition(v, breaks) * LEGEND.barHeight;

  // Loud, not silent: if the two halves meet, something overlaps, and an overlap in a static frame
  // is the defect a reader sees first.
  //
  // RE-POINTED when the source moved to the bottom. This used to compare the legend against
  // `sourceBottom` — with the source down at the frame's floor that comparison is either always
  // true or always false, which is a guard that cannot go red, and this branch forbids those. The
  // two halves that can now actually meet are the TITLE block and the top of the bottom stack, so
  // that is what it measures, and the message names those two rather than the source.
  if (captionY - 14 < titleBottom)
    throw new Error(
      `the column does not fit: the title ends at ${titleBottom} and the legend starts at ${captionY}. ` +
        `Shorten the title, the source or the caveat, or lower LEGEND.barHeight (${LEGEND.barHeight}).`,
    );

  // ── The subject, in the plate's coordinate space, scaled once into the drawn one.
  const subjectShape = geometry.shapes.find((shape) => shape.key === subject);
  if (!subjectShape) throw new Error(`no shape for the subject ${subject}`);
  const labelAt = geometry.anchors.label;
  if (!labelAt) throw new Error("the bake projected no label anchor");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={FRAME.width}
      height={FRAME.height}
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      fontFamily={FONT_FAMILY}
      role="img"
    >
      {/* WCAG 1.1.1. A root <title> would become a tooltip that follows the cursor and repeats the
          headline; <desc> is read by a screen reader and by nothing else. */}
      <desc>{alt}</desc>
      <defs>
        {/* No-data is a TEXTURE, not another shade: any shade is a shade the ramp could have used
            (`geo-discipline.md` rule 7). */}
        <pattern
          id="no-data"
          width={7}
          height={7}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={7} height={7} fill={ground} />
          <line x1={0} y1={0} x2={0} y2={7} stroke={muted} strokeWidth={2} />
        </pattern>
        <clipPath id="plate-clip">
          <rect x={0} y={0} width={MAP} height={MAP} />
        </clipPath>
      </defs>

      <rect
        x={0}
        y={0}
        width={FRAME.width}
        height={FRAME.height}
        fill={ground}
      />

      {/* ── The map ───────────────────────────────────────────────────────────────────────── */}
      <g transform={`translate(${MAP_X},${PAD})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={MAP} height={MAP} />
        <g transform={`scale(${scale})`}>
          {geometry.shapes.map((shape) => (
            <path
              key={shape.key}
              d={pathFromRings(shape.rings)}
              fill={fillOf(shape.key)}
              fillRule="evenodd"
              stroke={ground}
              strokeWidth={0.8 / scale}
              strokeLinejoin="round"
            />
          ))}
          {/* The subject's outline, twice: a ground-coloured halo so it separates from whatever
              class its neighbours landed in, then the accent itself. The accent is spent HERE and
              nowhere else on the map (rule 8) — the ramp is already carrying the quantity. */}
          <path
            d={pathFromRings(subjectShape.rings)}
            fill="none"
            stroke={ground}
            strokeWidth={4.5 / scale}
            strokeLinejoin="round"
          />
          <path
            d={pathFromRings(subjectShape.rings)}
            fill="none"
            stroke={accent}
            strokeWidth={2.2 / scale}
            strokeLinejoin="round"
          />
        </g>
        {/* The label is an overlay at a PROJECTED anchor (rule 4), in the beat's own typeface —
            not a symbol handed to the basemap, which would arrive in the provider's font. */}
        <g transform={`translate(${labelAt[0] * scale},${labelAt[1] * scale})`}>
          <text
            textAnchor="end"
            fontSize={SUBJECT_LABEL.fontSize}
            fontWeight={SUBJECT_LABEL.fontWeight}
            stroke={ground}
            strokeWidth={4}
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
      </g>

      {/* ── The column ────────────────────────────────────────────────────────────────────── */}
      {titleLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
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
          x={COLUMN.x}
          y={sourceTop + i * SOURCE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      <text
        x={COLUMN.x}
        y={captionY}
        fill={muted}
        fontSize={CAPTION.fontSize}
        fontWeight={CAPTION.fontWeight}
      >
        {legendCaption}
      </text>

      {/* The class bar. Six flat segments, lightest at the foot. */}
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
        <Fragment key={tick}>
          <text
            x={barX + LEGEND.barWidth + LEGEND.labelGap}
            y={barBottom - (i * LEGEND.barHeight) / ramp.length + 4}
            fill={muted}
            fontSize={TICK.fontSize}
          >
            {fr(tick, 0)}
          </text>
        </Fragment>
      ))}

      {/* The two marks the argument is made of, on one scale, with the distance between them
          visible. The subject in the accent; the comparison in ink, because it is not the subject. */}
      {[
        { label: comparisonLabel, value: comparisonValue, colour: ink },
        { label: subjectLabel, value: subjectValue, colour: accent },
      ].map(({ label, value: v, colour }) => (
        <g
          key={label}
          transform={`translate(${barX - LEGEND.markerGap},${atValue(v)})`}
        >
          <path d="M0 0L-9 -5L-9 5Z" fill={colour} />
          <text
            x={-15}
            y={4}
            textAnchor="end"
            fill={colour}
            fontSize={MARKER.fontSize}
            fontWeight={MARKER.fontWeight}
          >
            {`${label} ${fr(v, 1)}`}
          </text>
        </g>
      ))}

      {/* The no-data entry exists only when a shape actually carries it (rule 7's converse) — a key
          for a category nobody can find on the map is decoration. */}
      {anyNoData ? (
        <g transform={`translate(${COLUMN.x},${noDataY})`}>
          <rect
            x={0}
            y={-10}
            width={18}
            height={13}
            fill="url(#no-data)"
            stroke={muted}
            strokeWidth={0.5}
          />
          <text x={26} y={0} fill={muted} fontSize={TICK.fontSize}>
            {noDataLabel}
          </text>
        </g>
      ) : null}

      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={caveatTop + i * NOTE.lead}
          fill={muted}
          fontSize={NOTE.fontSize}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}
