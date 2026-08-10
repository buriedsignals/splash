/**
 * The static genre of "Poland emits more than double Sweden's per-capita CO2" — one frame, no order.
 *
 * What it draws: a baked basemap plate as one `<image>`, the 41-country study set as one path
 * each, and the beat's own furniture. There is no map here — `bake.mjs` already spent the camera,
 * and everything below is an image and some coordinates (`geo-discipline.md` rules 2 and 3).
 *
 * ── THERE IS NO `const FRAME` HERE ANY MORE, AND ITS ABSENCE IS THE POINT ─────────────────────
 *
 * It used to read `{ width: 900, height: 560 }`, and `render.mjs` repeated the same two numbers, so
 * `renderStill` compared them against each other and they agreed by construction. A journalist
 * pinning a size at gate 2c reached nothing. The frame is now `sizeFor(size)`'s, and `size` is read
 * out of this beat's own `BRIEF.md` front matter.
 *
 * ── AND THE MAP IS NOT LAID OUT LIKE A PLOT ──────────────────────────────────────────────────
 *
 * A chart clamps its plot into an aspect range measured for its type. A map has no plot rectangle:
 * what fixes its shape is the CAMERA, and this beat's camera is already frozen — the committed plate
 * is a raster whose bake fitted the study bounds, so the plate's own aspect IS the shape this
 * geography takes. `mapStageBox` scales that aspect to whichever dimension binds first and hands
 * back what is left; the leftover goes to FURNITURE, never to a wider camera and never to a crop
 * (`skills/map-beat/assets/geo.ts`, the rule; `scripts/stage.mjs`, the arithmetic).
 *
 * Which of the two arrangements is drawn — the plate beside a text column, or the plate above one —
 * is MEASURED rather than chosen per size: beside, where the column left over can hold this beat's
 * own longest title word and the widest row of its legend; stacked otherwise. Where neither leaves a
 * map, the beat refuses, with the arithmetic in the message.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "./render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "#shared/chart-beat/sizes.mjs";
import {
  lonSpanOf,
  mapStageBox,
  typeScaleFor,
} from "#shared/map-beat/stage.mjs";
import {
  binIndexLowerInclusive,
  en,
  pathFromParts,
  scalePosition,
  subjectLabelAnchor,
  type BakedShape,
  type JoinedRow,
} from "./geo-choropleth.ts";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * Every spacing number goes through `sp`, not only the fonts — the probe measured what happens
 * otherwise: eleven bare literals in one beat's layout arithmetic collided the title into the
 * subtitle at 1920x1080. That is why the strokes, the legend's own geometry, the tick nudge and the
 * marker arrow are all in here rather than written at the mark. `PAD` is the one exception, because
 * a frame's margin is proportional to the CANVAS and not to the type (`frameInsetFor`, and
 * `sizes.mjs` states the split).
 */
const BASE = {
  TITLE: { fontSize: 20, fontWeight: 700, lead: 26 },
  SOURCE: { fontSize: 13, fontWeight: 400, lead: 17 },
  CAPTION: { fontSize: 12, fontWeight: 600 },
  TICK: { fontSize: 12, fontWeight: 400 },
  MARKER: { fontSize: 12.5, fontWeight: 600 },
  // THE ONE SUB-12 TOKEN WAS RAISED TO 12, and that is a decision rather than a rounding. The size
  // table derives every row's `typeScale` from a smallest base token of 12 — the seed's own — so a
  // beat carrying 11.5 misses every floor by construction and needs a multiplier of its own to
  // catch up, which then inflates the whole hierarchy. Raising one token by half a point at 900x560
  // is the smaller change and it keeps the beat inside the table's own arithmetic.
  NOTE: { fontSize: 12, fontWeight: 400, lead: 15 },
  SUBJECT_LABEL: { fontSize: 15, fontWeight: 700 },
  GUTTER: 32,
  /** The legend: a vertical class bar, value increasing upward, so "more than" is literal. */
  BAR_WIDTH: 22,
  BAR_HEIGHT: 200,
  TICK_LABEL_GAP: 10,
  MARKER_GAP: 12,
  MARKER_TEXT_GAP: 15,
  MARKER_ARROW_LENGTH: 9,
  MARKER_ARROW_HALF: 5,
  TICK_BASELINE_NUDGE: 4,
  MARKER_BASELINE_NUDGE: 4,
  BLOCK_AIR: 16,
  CAPTION_TO_BAR: 16,
  BAR_TO_CAVEAT: 34,
  NO_DATA_GAP: 24,
  NO_DATA_TILE: 7,
  NO_DATA_SWATCH: { width: 18, height: 13, lift: 10, textX: 26 },
  /** Drawn widths, not plate widths: each is divided by the plate scale at the mark, so what is
   *  written here is what a reader sees, and it has to grow with the frame like everything else. */
  SHAPE_STROKE: 0.8,
  SUBJECT_HALO_STROKE: 4.5,
  SUBJECT_STROKE: 2.2,
  SUBJECT_LABEL_HALO: 4,
};

/** The smallest token this beat draws — the caveat. `typeScaleFor` puts it on the size's own
 *  legibility floor, which the table's default scale cannot do for a beat whose smallest token is
 *  under the seed's 12. */
const SMALLEST_BASE_TOKEN = BASE.NOTE.fontSize;

/**
 * Helvetica's cap height, 717/1000 em, from Adobe's own AFM for the face this beat draws in (Arial,
 * the substitute, is 716). It puts a name's OPTICAL centre on a point rather than its baseline.
 * `dominant-baseline="central"` would say the same thing declaratively and is not used, because the
 * still rasterises through resvg and the video through Chrome, and a name that centred differently
 * in the two would be a defect nobody could see in either one alone.
 */
const CAP_HEIGHT_EM = 0.717;

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
    TICK: f(BASE.TICK) as typeof BASE.TICK,
    MARKER: f(BASE.MARKER) as typeof BASE.MARKER,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    SUBJECT_LABEL: f(BASE.SUBJECT_LABEL) as typeof BASE.SUBJECT_LABEL,
  };
}

export type ChoroplethStillProps = {
  /** The bake: pixel-space parts in the plate's own coordinate space, plus its projected anchors. */
  geometry: {
    frame: { width: number; height: number };
    frameCorners: { west: number; north: number; east: number; south: number };
    shapes: BakedShape[];
    anchors: Record<string, [number, number]>;
  };
  /** The basemap capture, as a data URI, drawn at the size the frame and the geography agree on. */
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
  /** The export size gate 2c pinned, read from `BRIEF.md` by `render.mjs`. */
  size: string;
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

export function ChoroplethStill({
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
  size,
}: ChoroplethStillProps) {
  const row = sizeFor(size);
  const FRAME = { width: row.width, height: row.height };
  const PAD = frameInsetFor(size);
  const T = tokens(typeScaleFor(row, SMALLEST_BASE_TOKEN));
  const sp = T.sp;
  const GUTTER = sp(BASE.GUTTER);

  // THE BAND, not the frame. Where the platform reserves part of the frame — portrait alone today —
  // everything a reader has to read lives inside it, because content outside it is at risk of being
  // COVERED by the platform's own chrome and no clipping counter can see that.
  const band = stageFor(size);
  const top = band.top + PAD;
  const contentWidth = FRAME.width - PAD * 2;

  const value = new Map(rows.map((r) => [r.key, r.value]));
  const anyNoData = rows.some((r) => r.value === null);
  const fillOf = (key: string): string => {
    const v = value.get(key);
    return v === null || v === undefined
      ? "url(#no-data)"
      : ramp[binIndexLowerInclusive(v, breaks)]!;
  };

  // ── THE CREDIT IS A STRIP ACROSS THE FOOT OF THE FRAME ──────────────────────────────────────
  // It is measured FIRST and at the FULL content width, under both the map and the text column,
  // and everything else is laid out in what is left above it. Two reasons, and the second is the
  // one only the bigger frame showed:
  //
  //  · the credit sits at the bottom of the visual on every graphic this project ships, and the
  //    guard that holds it there measures the delivered SVG — the credit's own `<text y>` has to
  //    land in the bottom EIGHTH of the viewBox (945 of 1080). Wrapped inside a narrow text column
  //    it becomes three lines and its first line lands around y=899: a failure that has nothing to
  //    do with the credit and everything to do with the column it was put in. At 1750px it is one
  //    line, on the margin.
  //  · `sourceBottom` names the BAND's bottom rather than the frame's, deliberately: at portrait
  //    the platform covers the frame's last 672px, so a credit pinned to the frame's floor is a
  //    credit nobody can read — and a covered credit is an attribution failure, not a cosmetic one.
  //    Where no band is reserved, `band.top + band.height` IS the frame's height.
  const sourceText = `${source} · ${basemapCredit}`;
  const sourceLines = wrap(sourceText, contentWidth, T.SOURCE);
  const sourceBottom = band.top + band.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  const bottom = sourceTop - T.SOURCE.fontSize - sp(BASE.BLOCK_AIR);
  const contentHeight = bottom - top;

  const markers = [
    { label: comparisonLabel, value: comparisonValue, colour: ink },
    { label: subjectLabel, value: subjectValue, colour: accent },
  ];

  // ── THE LEGEND'S OWN WIDTH, MEASURED IN THE FONT IT IS DRAWN IN ─────────────────────────────
  // The class bar is not the widest thing in the legend: a tick label stands to its right and a
  // marker's name and value stand end-anchored to its left, so the row is as wide as those three
  // together. It used to be a bare 92 px of right-hand reserve, tuned against a 900 px frame — a
  // literal that decides where a mark goes is exactly the kind the probe caught colliding.
  const BAR_WIDTH = sp(BASE.BAR_WIDTH);
  const widestTick = Math.max(
    ...[0, ...breaks].map((tick) => measureText(en(tick, 0), T.TICK)),
  );
  const widestMarker = Math.max(
    ...markers.map(({ label, value: v }) =>
      measureText(`${label} ${en(v, 1)}`, T.MARKER),
    ),
  );
  const tickReserve = Math.ceil(
    widestTick + sp(BASE.TICK_LABEL_GAP) + sp(BASE.BLOCK_AIR),
  );
  const markerReserve = Math.ceil(
    widestMarker + sp(BASE.MARKER_GAP) + sp(BASE.MARKER_TEXT_GAP),
  );
  const legendRowWidth = markerReserve + BAR_WIDTH + tickReserve;

  // ── WHERE THE MAP GOES, MEASURED ────────────────────────────────────────────────────────────
  // First arrangement: the plate takes the full content height and the column takes what is left
  // beside it. That column has to hold this beat's own longest unbreakable word — a title that
  // cannot wrap is a title that runs off the frame — and the legend row above, so the floor is
  // derived from what this beat actually draws rather than typed as a fraction of the frame.
  const beside = mapStageBox({
    availableWidth: contentWidth,
    availableHeight: contentHeight,
    plateFrame: geometry.frame,
    studyLonSpanDeg: lonSpanOf(geometry),
  });
  const minColumn = Math.ceil(
    Math.max(
      legendRowWidth,
      ...title.split(/\s+/).map((w) => measureText(w, T.TITLE)),
    ),
  );
  const columnBeside = contentWidth - beside.width - GUTTER;
  const sideBySide = columnBeside >= minColumn;
  const columnWidth = sideBySide ? columnBeside : contentWidth;

  const titleLines = wrap(title, columnWidth, T.TITLE);
  const caveatLines = wrap(caveat, columnWidth, T.NOTE);
  const titleBlock = T.TITLE.fontSize + (titleLines.length - 1) * T.TITLE.lead;
  const caveatBlock = T.NOTE.fontSize + (caveatLines.length - 1) * T.NOTE.lead;
  const noDataBlock = anyNoData ? T.TICK.fontSize + sp(BASE.NO_DATA_GAP) : 0;
  // A class bar is a SCALE: six classes have to be told apart and six ticks read beside them, so
  // its floor is a tick pitch that clears the tick's own line, not a fraction of the frame.
  const minBarHeight = ramp.length * Math.round(T.TICK.fontSize * 1.4);
  const legendBlockMin =
    T.CAPTION.fontSize + sp(BASE.CAPTION_TO_BAR) + minBarHeight;

  // Second arrangement: the plate above the column. The furniture is measured FIRST and the map
  // takes what is left — the rule read from the other end, and the only order that can refuse
  // honestly. A map sized first and furniture squeezed after is how a credit ends up off the frame
  // with every counter green. The credit is not in this sum: it has already been taken off the top
  // of `contentHeight` as a strip across the foot of the frame.
  const stackedFurniture =
    titleBlock +
    sp(BASE.BLOCK_AIR) +
    legendBlockMin +
    sp(BASE.BAR_TO_CAVEAT) +
    noDataBlock +
    caveatBlock +
    sp(BASE.BLOCK_AIR);
  const stackedMapHeight = contentHeight - stackedFurniture;

  if (!sideBySide && stackedMapHeight < minColumn) {
    // R9, stated. `minColumn` is reused as the floor a map is still a map at: below the width of
    // this beat's own longest title word and its own legend row, there is no picture left to read.
    throw new Error(
      `mapgen-choropleth-video (static) cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `The column beside a ${beside.width}x${beside.height} plate would be ${columnBeside}px, ` +
        `under the ${minColumn}px this beat's own longest title word and legend row need, so the ` +
        `plate has to go above the column — and stacked, the furniture takes ${stackedFurniture}px ` +
        `of the ${contentHeight}px band, leaving ${stackedMapHeight}px for the map.\n` +
        `At ${size} the legibility floor is ${row.minTypePx}px, which is what makes the furniture ` +
        `this tall: title ${titleLines.length} lines, legend ${legendBlockMin}px at its own floor, ` +
        `caveat ${caveatLines.length}, credit ${sourceLines.length}. Nothing in the removal ladder ` +
        `makes type smaller; the legend IS the scale a choropleth is read against, and the caveat ` +
        `is the sentence that keeps the claim honest ("${firstClause(caveat)}"), so neither is a ` +
        `line to drop.\n` +
        `It ships at landscape.`,
    );
  }

  const stage = sideBySide
    ? beside
    : mapStageBox({
        availableWidth: contentWidth,
        availableHeight: stackedMapHeight,
        plateFrame: geometry.frame,
        studyLonSpanDeg: lonSpanOf(geometry),
      });
  const MAP = stage.width;
  const MAP_H = stage.height;
  // Beside: the plate sits against the right margin, the column against the left. Stacked: the plate
  // is centred over the column, and the column starts under it.
  const MAP_X = sideBySide
    ? FRAME.width - PAD - MAP
    : PAD + Math.round((contentWidth - MAP) / 2);
  const MAP_Y = sideBySide
    ? top + Math.round((contentHeight - MAP_H) / 2)
    : top;
  const COLUMN = { x: PAD, width: columnWidth };

  // ── The column, measured top to bottom. Nothing below is a constant offset ──────────────────
  const columnTop = sideBySide ? top : MAP_Y + MAP_H + sp(BASE.BLOCK_AIR);
  const titleTop = columnTop + T.TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * T.TITLE.lead;
  // The caveat is now the column's own last block — the credit left it for the strip across the
  // foot of the frame — so it builds upward from the content area's floor.
  const caveatBottom = bottom;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * T.NOTE.lead;
  const caveatInkTop = caveatTop - T.NOTE.fontSize;
  const noDataY = caveatInkTop - sp(BASE.NO_DATA_GAP);

  // THE LEGEND IS PART OF THE HEADER — it says what the shading means before the reader reads it —
  // so it hangs off the title, and the slack a bigger frame opens lands in ONE place, above the
  // bottom stack, where it reads as air. The locator sibling learned this the hard way: anchored
  // upward off the caveat instead, its first 1920x1080 render put a 250 px hole between the title
  // and the key, with the legend floating at two-fifths of the frame under nothing.
  const captionY = titleBottom + sp(BASE.BLOCK_AIR) + T.CAPTION.fontSize;
  const barTop = captionY + sp(BASE.CAPTION_TO_BAR);
  const legendFloor =
    (anyNoData ? noDataY : caveatInkTop) - sp(BASE.BAR_TO_CAVEAT);
  const barAvailable = legendFloor - barTop;
  // Loud, not silent: if the two halves meet, something overlaps, and an overlap in a static frame
  // is the defect a reader sees first.
  if (barAvailable < minBarHeight)
    throw new Error(
      `the column does not fit at ${size}: the title ends at ${titleBottom} and the bottom stack ` +
        `starts at ${legendFloor}, leaving ${barAvailable}px for a class bar whose own floor is ` +
        `${minBarHeight}px (${ramp.length} classes at a ${T.TICK.fontSize}px tick).`,
    );
  // The bar keeps its designed proportion rather than stretching to fill: a class bar is read by
  // the pitch between its ticks, and a taller one says nothing more.
  const barHeight = Math.min(barAvailable, sp(BASE.BAR_HEIGHT));
  const barBottom = barTop + barHeight;
  // THE LEGEND ROW IS LEFT-ALIGNED WITH THE COLUMN, and the first 1920x1080 render is what said so.
  // The bar used to be placed from the column's RIGHT edge (`COLUMN.width - 92 - barWidth` at
  // 900x560), which at that frame was most of the way across a 262px column and read as one block
  // with the title. At 1920x1080 the column is 834px wide, and the same arithmetic parked the bar,
  // its ticks and both marker names hard against the map while the title and the caveat hung off
  // the left margin — a 500px hole down the middle of the column, with nothing clipped and nothing
  // overlapping. The bar's own x is therefore derived from what stands to its LEFT: the widest
  // marker name plus its gaps. Everything in the column then shares one left edge.
  const barX = COLUMN.x + markerReserve;
  if (markerReserve + BAR_WIDTH + tickReserve > columnWidth)
    throw new Error(
      `the legend row does not fit the ${columnWidth}px column at ${size}: its marker names need ` +
        `${markerReserve}px, the bar ${BAR_WIDTH}px and the tick labels ${tickReserve}px.`,
    );
  const atValue = (v: number) =>
    barBottom - scalePosition(v, breaks) * barHeight;

  // ── The subject, in the plate's coordinate space, scaled once into the drawn one.
  const scale = MAP / geometry.frame.width;
  const subjectShape = geometry.shapes.find((shape) => shape.key === subject);
  if (!subjectShape) throw new Error(`no shape for the subject ${subject}`);
  // The subject's name is centred on the subject's own shape (B6.10). `geometry.anchors.label` —
  // two degrees typed into `bake.mjs` and hand-nudged east — is no longer read: see
  // `subjectLabelAnchor`'s own doc-comment for what it measured and why.
  const labelAt = subjectLabelAnchor(subjectShape);

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
            (`geo-discipline.md` rule 7). Never triggered on this beat's complete join — the
            pattern still exists so the legend's converse rule (rule 7, "only when a shape on the
            canvas actually carries it") is checkable rather than assumed. */}
        <pattern
          id="no-data"
          width={sp(BASE.NO_DATA_TILE)}
          height={sp(BASE.NO_DATA_TILE)}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect
            width={sp(BASE.NO_DATA_TILE)}
            height={sp(BASE.NO_DATA_TILE)}
            fill={ground}
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={sp(BASE.NO_DATA_TILE)}
            stroke={muted}
            strokeWidth={sp(2)}
          />
        </pattern>
        <clipPath id="plate-clip">
          <rect x={0} y={0} width={MAP} height={MAP_H} />
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
      <g transform={`translate(${MAP_X},${MAP_Y})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={MAP} height={MAP_H} />
        <g transform={`scale(${scale})`}>
          {geometry.shapes.map((shape) => (
            <path
              key={shape.key}
              d={pathFromParts(shape.parts)}
              fill={fillOf(shape.key)}
              fillRule="evenodd"
              stroke={ground}
              strokeWidth={sp(BASE.SHAPE_STROKE) / scale}
              strokeLinejoin="round"
            />
          ))}
          {/* The subject's outline, twice: a ground-coloured halo so it separates from whatever
              class its neighbours landed in, then the accent itself. The accent is spent HERE and
              nowhere else on the map (rule 8) — the ramp is already carrying the quantity. */}
          <path
            d={pathFromParts(subjectShape.parts)}
            fill="none"
            stroke={ground}
            strokeWidth={sp(BASE.SUBJECT_HALO_STROKE) / scale}
            strokeLinejoin="round"
          />
          <path
            d={pathFromParts(subjectShape.parts)}
            fill="none"
            stroke={accent}
            strokeWidth={sp(BASE.SUBJECT_STROKE) / scale}
            strokeLinejoin="round"
          />
        </g>
        {/* The label is an overlay at a DERIVED anchor (rule 4), in the beat's own typeface — not a
            symbol handed to the basemap, which would arrive in the provider's font. Centred on the
            anchor in both directions: `text-anchor="middle"` horizontally, and the baseline lifted
            by half a cap height vertically, so the name's optical centre is the shape's centre. */}
        <g
          transform={`translate(${labelAt[0] * scale},${labelAt[1] * scale + (T.SUBJECT_LABEL.fontSize * CAP_HEIGHT_EM) / 2})`}
        >
          <text
            textAnchor="middle"
            fontSize={T.SUBJECT_LABEL.fontSize}
            fontWeight={T.SUBJECT_LABEL.fontWeight}
            stroke={ground}
            strokeWidth={sp(BASE.SUBJECT_LABEL_HALO)}
            strokeLinejoin="round"
            fill="none"
          >
            {subjectLabel}
          </text>
          <text
            textAnchor="middle"
            fontSize={T.SUBJECT_LABEL.fontSize}
            fontWeight={T.SUBJECT_LABEL.fontWeight}
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
          y={titleTop + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {/* The credit: a strip across the foot of the frame at the full content width, under both
          the map and the column. */}
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

      <text
        x={COLUMN.x}
        y={captionY}
        fill={muted}
        fontSize={T.CAPTION.fontSize}
        fontWeight={T.CAPTION.fontWeight}
      >
        {legendCaption}
      </text>

      {/* The class bar. Six flat segments, lightest at the foot. */}
      {ramp.map((shade, i) => (
        <rect
          key={shade}
          x={barX}
          y={barBottom - ((i + 1) * barHeight) / ramp.length}
          width={BAR_WIDTH}
          height={barHeight / ramp.length}
          fill={shade}
        />
      ))}
      {[0, ...breaks].map((tick, i) => (
        <Fragment key={tick}>
          <text
            x={barX + BAR_WIDTH + sp(BASE.TICK_LABEL_GAP)}
            y={
              barBottom -
              (i * barHeight) / ramp.length +
              sp(BASE.TICK_BASELINE_NUDGE)
            }
            fill={muted}
            fontSize={T.TICK.fontSize}
          >
            {en(tick, 0)}
          </text>
        </Fragment>
      ))}

      {/* The two marks the argument is made of, on one scale, with the distance between them
          visible. The subject in the accent; the comparison in ink, because it is not the subject. */}
      {markers.map(({ label, value: v, colour }) => (
        <g
          key={label}
          transform={`translate(${barX - sp(BASE.MARKER_GAP)},${atValue(v)})`}
        >
          <path
            d={`M0 0L${-sp(BASE.MARKER_ARROW_LENGTH)} ${-sp(BASE.MARKER_ARROW_HALF)}L${-sp(BASE.MARKER_ARROW_LENGTH)} ${sp(BASE.MARKER_ARROW_HALF)}Z`}
            fill={colour}
          />
          <text
            x={-sp(BASE.MARKER_TEXT_GAP)}
            y={sp(BASE.MARKER_BASELINE_NUDGE)}
            textAnchor="end"
            fill={colour}
            fontSize={T.MARKER.fontSize}
            fontWeight={T.MARKER.fontWeight}
          >
            {`${label} ${en(v, 1)}`}
          </text>
        </g>
      ))}

      {/* The no-data entry exists only when a shape actually carries it (rule 7's converse) — a key
          for a category nobody can find on the map is decoration. This beat's join is complete, so
          this branch never renders — kept so the guard applies rather than being hand-waved away. */}
      {anyNoData ? (
        <g transform={`translate(${COLUMN.x},${noDataY})`}>
          <rect
            x={0}
            y={-sp(BASE.NO_DATA_SWATCH.lift)}
            width={sp(BASE.NO_DATA_SWATCH.width)}
            height={sp(BASE.NO_DATA_SWATCH.height)}
            fill="url(#no-data)"
            stroke={muted}
            strokeWidth={sp(0.5)}
          />
          <text
            x={sp(BASE.NO_DATA_SWATCH.textX)}
            y={0}
            fill={muted}
            fontSize={T.TICK.fontSize}
          >
            {noDataLabel}
          </text>
        </g>
      ) : null}

      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={caveatTop + i * T.NOTE.lead}
          fill={muted}
          fontSize={T.NOTE.fontSize}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}

/** The clause of the caveat a refusal quotes back, so the refusal names the sentence it will not
 *  drop rather than gesturing at "the caveat". Derived from the text it was handed. */
function firstClause(caveat: string): string {
  const clause = caveat.split(":")[0]?.trim() ?? caveat;
  return clause.length > 90 ? `${clause.slice(0, 87)}…` : clause;
}
