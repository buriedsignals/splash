/**
 * "Mississippi's hives made 89 pounds each" — the static format, 1920 x 1080 (landscape, the size
 * pinned at gate 2c and recorded in BRIEF.md's front matter).
 *
 * Written from `skills/map-beat/assets/Co2MapStill.tsx` — the seed — and this beat's own. What it
 * draws: a baked basemap plate as one `<image>`, forty-nine state shapes as one path each, and the
 * beat's own furniture. There is no map here: `bake-plate.mjs` already spent the camera, and
 * everything below is an image and some coordinates (`geo-discipline.md` rules 2 and 3).
 *
 * TWO THINGS DIFFER FROM THE SEED, and both are forced by the recorded palette rather than chosen.
 *
 * 1. THE PLATE IS NOT SQUARE. The continental United States projects to 1.81:1, so the camera came
 *    back landscape and the layout is built around it (rule 12: the camera is decided by the
 *    geography, the layout adapts to it). The seed's own bake could not have produced this plate —
 *    it takes one `--size` and uses it for both axes. See `bake-plate.mjs`'s header.
 *
 * 2. EVERY SHAPE IS OUTLINED IN THE INK POLE, NOT IN THE GROUND. The seed strokes each shape with
 *    `ground`, which on a light plate draws a thin dark hairline between neighbours. On this dark
 *    plate a ground-coloured stroke is invisible, and rule 7a then bites: a fill laid over the land
 *    must either end up at least as far from the water tint as the bare land already was, or the
 *    coastline must be carried by a stroke measuring 3:1 or better against BOTH the fill and the
 *    water. MEASURED on this beat's own palette: the closest class of the ramp is 15.6 ΔE76 from
 *    the derived water tint against the 23.77 the first branch demands, so the first branch is
 *    unreachable here at any ramp end — and the second branch is why `TO` is 0.68 rather than the
 *    seed's 0.78. At 0.78 the top class measures 2.44:1 against white and NO single stroke colour
 *    clears 3:1 against all six classes and the water; at 0.68 white clears every one of them, the
 *    worst being 3.04:1 on the top class and 6.41:1 on the water. Both halves are in `render-still.mjs`,
 *    where they are asserted rather than asserted-in-prose.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "#shared/chart-beat/render-still.mjs";
import {
  binIndexLowerInclusive,
  fr,
  pathFromRings,
  scalePosition,
  type BakedShape,
  type JoinedRow,
} from "./geo-honey.ts";

const FRAME = { width: 1920, height: 1080 };
const PAD = 85; // frameInsetFor("landscape") — `#shared/map-beat/sizes.mjs`
const GUTTER = 56;
/** The plate, at the shape the camera came back in. Drawn 1:1 — the bake was asked for exactly
 *  these pixels, so nothing is resampled. */
const MAP = { width: 1100, height: 607 };
const MAP_X = FRAME.width - PAD - MAP.width;
const MAP_Y = 155;
const COLUMN = { x: PAD, width: MAP_X - GUTTER - PAD };
/** The class bar runs the column, so the six labels under it are 99px apart and not 31. */
const BAR_WIDTH = COLUMN.width;

// Every token is at or above the 30px floor `assertTypeFloor` holds a landscape frame to.
const OVERLINE = { fontSize: 30, fontWeight: 600 };
const TITLE = { fontSize: 46, fontWeight: 700, lead: 56 };
const SUBTITLE = { fontSize: 31, fontWeight: 400, lead: 40 };
const SOURCE = { fontSize: 30, fontWeight: 400, lead: 38 };
const CAPTION = { fontSize: 30, fontWeight: 600 };
const TICK = { fontSize: 30, fontWeight: 400 };
const MARKER = { fontSize: 31, fontWeight: 600 };
const NOTE = { fontSize: 30, fontWeight: 400, lead: 38 };
const SUBJECT_LABEL = { fontSize: 40, fontWeight: 700 };

/** The legend: a HORIZONTAL class bar running the column's full width, value increasing to the
 *  right, with the subject marked above it and the national average marked below.
 *
 *  The seed's legend is vertical, and it does not survive this frame. Measured: at the 30px type
 *  floor a landscape frame holds, six class labels on a 186px vertical bar are 31px apart — the
 *  labels are taller than the segments they name and read as one block. Laid along the column's
 *  594px instead, the same six labels are 99px apart. The direction is not a style choice either:
 *  a vertical bar was right for the seed because its claim was "below the average", and this
 *  beat's claim is "above it", which reads left-to-right in the language this story is written in. */
const LEGEND = { barHeight: 46, tickDrop: 32, markerDrop: 44, averageDrop: 44 };

export type HoneyMapStillProps = {
  geometry: {
    frame: { width: number; height: number };
    shapes: BakedShape[];
    anchors: Record<string, [number, number]>;
  };
  plate: string;
  rows: JoinedRow[];
  breaks: number[];
  ramp: string[];
  /** The label under the FIRST class. The seed writes a literal `0` there, which on an open-bottom
   *  class is a claim the data does not make: this beat's lowest reading is 27 pounds and no state
   *  in that class is anywhere near zero. The observed minimum is passed in instead. */
  floorLabel: number;
  overline: string;
  title: string;
  subtitle: string;
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
  /** The hatch ink for a shape the source does not report. Below the ramp on purpose (rule 7:
   *  no-data sits under the data so the data is what pops), and derived from the ground. */
  noDataInk: string;
  subject: string;
  subjectLabel: string;
  subjectValue: number;
  comparisonLabel: string;
  comparisonValue: number;
};

/** A word wider than its own measure — hyphen-broken, never broken mid-syllable. Carried verbatim
 *  across the wrap family (`splash/test/helper-parity.test.ts` compares them case for case). */
function breakLongTokens(
  words: string[],
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const out: string[] = [];
  for (const word of words) {
    const pieces = word.split("-");
    if (pieces.length === 1 || measureText(word, font) <= maxWidth) {
      out.push(word);
      continue;
    }
    pieces.forEach((piece, i) =>
      out.push(i < pieces.length - 1 ? `${piece}-` : piece),
    );
  }
  return out;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of breakLongTokens(text.split(/\s+/), maxWidth, font)) {
    const joiner = current.endsWith("-") ? "" : " ";
    const trial = current ? `${current}${joiner}${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

export function HoneyMapStill({
  geometry,
  plate,
  rows,
  breaks,
  ramp,
  floorLabel,
  overline,
  title,
  subtitle,
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
  noDataInk,
  subject,
  subjectLabel,
  subjectValue,
  comparisonLabel,
  comparisonValue,
}: HoneyMapStillProps) {
  const scale = MAP.width / geometry.frame.width;
  const value = new Map(rows.map((row) => [row.key, row.value]));
  const anyNoData = rows.some((row) => row.value === null);

  const fillOf = (key: string): string => {
    const v = value.get(key);
    return v === null || v === undefined
      ? "url(#no-data)"
      : ramp[binIndexLowerInclusive(v, breaks)]!;
  };

  // ── The column, measured top to bottom. Nothing below is a constant offset.
  const FOOTER_WIDTH = FRAME.width - PAD * 2;
  const titleLines = wrap(title, COLUMN.width, TITLE);
  const subtitleLines = wrap(subtitle, COLUMN.width, SUBTITLE);
  const sourceLines = wrap(`${source} · ${basemapCredit}`, FOOTER_WIDTH, SOURCE);
  const caveatLines = wrap(caveat, FOOTER_WIDTH, NOTE);

  // The column is laid out from BOTH ends and meets in the middle, because the two halves are
  // anchored to different things: the title hangs off the top, and the credit is the last line
  // before the bottom margin (`chart-beat/references/static-discipline.md`).
  const overlineY = PAD + OVERLINE.fontSize;
  const titleTop = overlineY + 26 + TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * TITLE.lead;
  const subtitleTop = titleBottom + 30 + SUBTITLE.fontSize;
  const subtitleBottom = subtitleTop + (subtitleLines.length - 1) * SUBTITLE.lead;

  // THE FOOTER RUNS THE WHOLE FRAME'S WIDTH, not the column's. The seed puts the caveat and the
  // credit in the text column because its column is half the frame; here the plate is landscape and
  // the column is 694px, which turned a four-clause caveat into eight lines and pushed the legend
  // off the top of its own half. Measured by the fit guard below, which is what said so: "the
  // header ends at 464 and the legend caption sits at 229". So the two blocks that are ABOUT THE
  // WHOLE GRAPHIC sit under the whole graphic, and the credit is still the last line before the
  // bottom margin (`chart-beat/references/static-discipline.md`).
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  const caveatBottom = sourceTop - SOURCE.fontSize - 22;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;
  const footerTop = caveatTop - NOTE.fontSize;

  const noDataY = footerTop - 48;
  const legendBottom = (anyNoData ? noDataY : footerTop) - 58;
  const barTop =
    legendBottom - LEGEND.averageDrop - LEGEND.tickDrop - LEGEND.barHeight;
  const captionY = barTop - LEGEND.markerDrop - 30;
  const barX = COLUMN.x;
  const atValue = (v: number) => scalePosition(v, breaks) * BAR_WIDTH;

  // Loud, not silent: if the two halves meet, something overlaps, and an overlap in a static frame
  // is the defect a reader sees first.
  if (captionY - 20 < subtitleBottom)
    throw new Error(
      `the column does not fit: the header ends at ${subtitleBottom} and the legend caption sits ` +
        `at ${captionY}. Shorten the title, the subtitle, the caveat or the credit, or lower ` +
        `LEGEND.barHeight (${LEGEND.barHeight}).`,
    );

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
        {/* No-data is a TEXTURE here, not another shade — and that is a departure from
            `geo-discipline.md` rule 7, which fixes it at the flat `#b9b9b9` and says in so many
            words that a hatch reads illegibly. Measured on this ground: `#b9b9b9` has relative
            luminance 0.486, brighter than every class of this ramp (top class 0.208), so the flat
            grey the rule prescribes would paint a state nobody measured as the brightest thing on
            the map. The seed itself hatches, and so do four of the eight map components in this
            tree. Reported in NOTES-FOR-MAINTAINER.md; both halves are derived from the recorded
            ground rather than typed. */}
        <pattern
          id="no-data"
          width={16}
          height={16}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={16} height={16} fill={ground} />
          <line x1={0} y1={0} x2={0} y2={16} stroke={noDataInk} strokeWidth={3.5} />
        </pattern>
        <clipPath id="plate-clip">
          <rect x={0} y={0} width={MAP.width} height={MAP.height} />
        </clipPath>
      </defs>

      <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

      {/* ── The map ───────────────────────────────────────────────────────────────────────── */}
      <g transform={`translate(${MAP_X},${MAP_Y})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={MAP.width} height={MAP.height} />
        <g transform={`scale(${scale})`}>
          {geometry.shapes.map((shape) => (
            <path
              key={shape.key}
              d={pathFromRings(shape.rings)}
              fill={fillOf(shape.key)}
              fillRule="evenodd"
              stroke={ink}
              strokeWidth={1.1 / scale}
              strokeLinejoin="round"
            />
          ))}
          {/* The subject's outline, twice: a ground-coloured halo so it separates from whatever
              class its neighbours landed in, then the accent itself. The accent is spent HERE and
              nowhere else on the map (rule 8). */}
          <path
            d={pathFromRings(subjectShape.rings)}
            fill="none"
            stroke={ground}
            strokeWidth={9 / scale}
            strokeLinejoin="round"
          />
          <path
            d={pathFromRings(subjectShape.rings)}
            fill="none"
            stroke={accent}
            strokeWidth={4.5 / scale}
            strokeLinejoin="round"
          />
        </g>
        {/* The label is an overlay at a PROJECTED anchor (rule 4), in the beat's own typeface —
            not a symbol handed to the basemap, which would arrive in the provider's font. */}
        <g transform={`translate(${labelAt[0] * scale},${labelAt[1] * scale})`}>
          <text
            textAnchor="start"
            fontSize={SUBJECT_LABEL.fontSize}
            fontWeight={SUBJECT_LABEL.fontWeight}
            stroke={ground}
            strokeWidth={10}
            strokeLinejoin="round"
            fill="none"
          >
            {subjectLabel}
          </text>
          <text
            textAnchor="start"
            fontSize={SUBJECT_LABEL.fontSize}
            fontWeight={SUBJECT_LABEL.fontWeight}
            fill={accent}
          >
            {subjectLabel}
          </text>
        </g>
      </g>

      {/* ── The column ────────────────────────────────────────────────────────────────────── */}
      <text
        x={COLUMN.x}
        y={overlineY}
        fill={accent}
        fontSize={OVERLINE.fontSize}
        fontWeight={OVERLINE.fontWeight}
      >
        {overline}
      </text>
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
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={subtitleTop + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
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

      {/* The subject, above the bar, at its own place on the scale — the accent, spent once here
          and once on the outline, and nowhere else. */}
      <g transform={`translate(${barX + atValue(subjectValue)},${barTop - 14})`}>
        <path d="M0 0L-11 -14L11 -14Z" fill={accent} transform="translate(0,14)" />
        <text
          x={0}
          y={-6}
          textAnchor="end"
          fill={accent}
          fontSize={MARKER.fontSize}
          fontWeight={MARKER.fontWeight}
        >
          {`${subjectLabel} ${fr(subjectValue, 0)} `}
        </text>
      </g>

      {/* The class bar. Six flat segments, darkest at the left. */}
      {ramp.map((shade, i) => (
        <rect
          key={shade}
          x={barX + (i * BAR_WIDTH) / ramp.length}
          y={barTop}
          width={BAR_WIDTH / ramp.length}
          height={LEGEND.barHeight}
          fill={shade}
        />
      ))}
      {[floorLabel, ...breaks].map((tick, i) => (
        <Fragment key={tick}>
          <text
            x={barX + (i * BAR_WIDTH) / ramp.length}
            y={barTop + LEGEND.barHeight + LEGEND.tickDrop}
            fill={muted}
            fontSize={TICK.fontSize}
          >
            {fr(tick, 0)}
          </text>
        </Fragment>
      ))}

      {/* The reference the whole map is read against, marked ON the scale rather than asserted in
          the caption: the boundary between the third and fourth class IS the national average, so
          "above the average" is the right-hand half of this bar and a reader can see which states
          are in it. */}
      <g
        transform={`translate(${barX + atValue(comparisonValue)},${barTop + LEGEND.barHeight + LEGEND.tickDrop + LEGEND.averageDrop})`}
      >
        <path d="M0 -34L-12 -18L12 -18Z" fill={ink} />
        <text
          x={22}
          y={0}
          textAnchor="start"
          fill={ink}
          fontSize={MARKER.fontSize}
          fontWeight={MARKER.fontWeight}
        >
          {`${comparisonLabel} ${fr(comparisonValue, 0)}`}
        </text>
      </g>

      {/* The no-data entry exists only when a shape actually carries it (rule 7's converse) — a key
          for a category nobody can find on the map is decoration. */}
      {anyNoData ? (
        <g transform={`translate(${COLUMN.x},${noDataY})`}>
          <rect
            x={0}
            y={-28}
            width={58}
            height={36}
            fill="url(#no-data)"
            stroke={muted}
            strokeWidth={1.2}
          />
          <text x={76} y={0} fill={muted} fontSize={TICK.fontSize}>
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
