/**
 * The static genre of "the western Pacific's most powerful earthquake, 2005–2017" — one frame, no
 * order. A PROPORTIONAL SYMBOL beat: circles sized by energy at each epicentre, not a choropleth —
 * there is no polygon, no join, no ramp. See `map-beat/references/types/proportional-symbol.md`.
 *
 * ── THERE IS NO `const FRAME` HERE ANY MORE, AND ITS ABSENCE IS THE POINT ─────────────────────
 *
 * It used to read `{ width: 900, height: 560 }`, and `render.mjs` repeated the same two numbers, so
 * `renderStill` compared them against each other and they agreed by construction. A journalist
 * pinning a size at gate 2c reached nothing. The frame is now `sizeFor(size)`'s and `size` is read
 * out of this beat's own `BRIEF.md` front matter.
 *
 * ── AND THE MAP IS NOT LAID OUT LIKE A PLOT ──────────────────────────────────────────────────
 *
 * A chart clamps its plot into an aspect range measured for its type. A map has no plot rectangle:
 * what fixes its shape is the CAMERA, and this beat's camera is already frozen — the committed
 * plate is a raster whose bake fitted the study bounds, so the plate's own aspect IS the shape this
 * geography takes. `mapStageBox` scales that aspect to whichever dimension binds first and hands
 * back what is left; the leftover goes to FURNITURE, never to a wider camera and never to a crop
 * (`skills/map-beat/assets/geo.ts`, the rule; `scripts/stage.mjs`, the arithmetic).
 *
 * ── WHAT A PROPORTIONAL SYMBOL ADDS TO THAT, AND WHY THE PLATE MAY GIVE WIDTH BACK ───────────
 *
 * The locator's arrangement is "plate at full content height, column takes what is left". A symbol
 * map carries one block a locator does not: a SIZE LEGEND, three reference circles drawn at the
 * map's own scale, so the legend's height is a function of how big the plate is. A bigger plate
 * therefore costs the column TWICE — it narrows it and it grows the ruler standing in it.
 *
 * So the plate is not fixed at the height-bound maximum. It starts there and gives width back, in
 * steps, until the column's own furniture fits — the "derive a position, never shrink the type"
 * move applied to the one dimension a map may honestly trade. Every step keeps the plate's aspect;
 * nothing is stretched and nothing is cropped, and the plate simply letterboxes inside the content
 * band with the leftover recorded. Where no plate down to this beat's own floor leaves room, the
 * beat refuses with the arithmetic rather than drawing a strip.
 *
 * ── AND THE CREDIT IS A STRIP ACROSS THE FOOT, NOT THE LAST BLOCK OF THE COLUMN ───────────────
 *
 * It used to be the bottom of the text column. At 900x560 that column was 308 px wide and the
 * credit was three lines of small type in it; at 1920x1080 the same block is still three lines, and
 * three lines walked upward from the margin put the credit's FIRST baseline at 0.83 down the frame
 * — outside the bottom eighth `credit-anchors-to-the-frame-bottom.test.ts` measures, for a reason
 * that has nothing to do with the credit and everything to do with the column it was put in. At the
 * full content width it is one or two lines and it sits where a credit belongs, under everything it
 * credits. The map and the column then share the band ABOVE it.
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
  declutterLabels,
  drawOrder,
  spanReferenceValues,
  energyRadiusScale,
  type QuakeRow,
} from "./geo-symbol";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * Every spacing number goes through `sp`, not only the fonts — the probe measured what happens
 * otherwise: eleven bare literals in one beat's layout arithmetic collided the title into the
 * subtitle at 1920x1080. `PAD` is the one exception, because a frame's margin is proportional to
 * the CANVAS and not to the type (`frameInsetFor`, and `sizes.mjs` states the split).
 *
 * THE THREE SUB-12 TOKENS WERE RAISED TO 12, and that is a change to the 900x560 drawing as well.
 * `sizes.mjs` derives every row's `typeScale` from a smallest base token of 12 — that is where 2.2
 * and 3.0 come from — so a beat carrying 11 and 11.5 misses every floor by construction, and
 * `typeScaleFor` would have to invent a bigger multiplier for the WHOLE hierarchy to rescue three
 * tokens. Raising the three is the smaller change and it keeps this beat inside the table's own
 * arithmetic. Nothing here goes below 12 again.
 */
const BASE = {
  TITLE: { fontSize: 20, fontWeight: 700, lead: 26 },
  SOURCE: { fontSize: 13, fontWeight: 400, lead: 17 },
  CAPTION: { fontSize: 12, fontWeight: 600, lead: 16 },
  NOTE: { fontSize: 12, fontWeight: 400, lead: 15 },
  POINT_LABEL: { fontSize: 12, fontWeight: 600 },
  LEGEND_LABEL: { fontSize: 12, fontWeight: 400 },
  GUTTER: 32,
  /** The air between two reference circles, or between their two labels — whichever is tighter
   *  decides, see the legend block below. */
  LEGEND_CIRCLE_GAP: 16,
  /** The legend caption's last baseline to the reference circles' own labels. */
  LEGEND_TOP_AIR: 24,
  /** A reference circle's own label baseline to that circle's crown. */
  LEGEND_LABEL_DROP: 8,
  LEGEND_TO_CAVEAT: 34,
  BLOCK_AIR: 16,
  LABEL_GAP: 6,
  LABEL_HALO: 3,
  LABEL_BOX_AIR: 4,
  MARKER_STROKE: 1.4,
  /** How much width the plate gives back per step of the search below. Small enough that the plate
   *  is never shrunk further than the furniture actually needs. */
  PLATE_STEP: 4,
};

/** The smallest token this beat draws. It is the table's own seed value, so `typeScaleFor` returns
 *  the row's default and this beat needs no multiplier of its own. */
const SMALLEST_BASE_TOKEN = 12;

/**
 * THE SIZE OF THE BIGGEST MARK IS DERIVED, NOT TYPED (B6.17). The fraction is the seed's own
 * (`map-web/assets/MapWebSeed.tsx`'s `MARK_MAX_RADIUS_FRACTION`); the floor is the smallest
 * radius a reader can still resolve as a disc rather than a dot, and it is what actually decides
 * the answer for this value set; the ceiling is the share of the plate one mark may take before
 * the beat refuses to draw the set at all. See `energyRadiusScale`.
 *
 * All three are fractions OF THE PLATE, so they are scale-free: the marks grow with the plate, and
 * the ratio between a mark and the gap to its nearest neighbour is the same at 496 px and at 910.
 */
const MARK_MAX_RADIUS_FRACTION = 0.062;
const MIN_LEGIBLE_RADIUS_PX = 4;
const MARK_MAX_RADIUS_CEILING_FRACTION = 0.12;

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
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    POINT_LABEL: f(BASE.POINT_LABEL) as typeof BASE.POINT_LABEL,
    LEGEND_LABEL: f(BASE.LEGEND_LABEL) as typeof BASE.LEGEND_LABEL,
  };
}

export type QuakeSymbolStillProps = {
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
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  subjectKey: string;
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

export function QuakeSymbolStill({
  geometry,
  plate,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  alt,
  ground,
  accent,
  ink,
  muted,
  subjectKey,
  size,
}: QuakeSymbolStillProps) {
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

  // ── THE CREDIT, ACROSS THE FOOT OF THE BAND ─────────────────────────────────────────────────
  // The last line before the bottom margin, at the FULL content width, carrying the basemap credit
  // with it, unsplit. A wrapped block is walked UPWARD from the margin, so the last line lands on
  // the margin and the first is one leading above it.
  const sourceText = `${source} · ${basemapCredit}`;
  const sourceLines = wrap(sourceText, contentWidth, T.SOURCE);
  const sourceBottom = band.top + band.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  // Everything else shares the band ABOVE the credit.
  const contentBottom = sourceTop - T.SOURCE.fontSize - sp(BASE.BLOCK_AIR);
  const contentHeight = contentBottom - top;
  if (contentHeight <= 0)
    throw new Error(
      `map-quake-symbol has no room left at ${size}: the credit alone takes ` +
        `${sourceLines.length} lines of the ${band.height}px band.`,
    );

  const { radiusOf, maxRadiusPx } = energyRadiusScale(
    geometry.points.map((p) => p.mag),
    {
      frameWidth: geometry.frame.width,
      maxRadiusFraction: MARK_MAX_RADIUS_FRACTION,
      minLegibleRadiusPx: MIN_LEGIBLE_RADIUS_PX,
      maxRadiusCeilingFraction: MARK_MAX_RADIUS_CEILING_FRACTION,
    },
  );
  const legend = spanReferenceValues(geometry.points.map((p) => p.mag));

  // ── WHERE THE MAP GOES, MEASURED ────────────────────────────────────────────────────────────
  // The plate at the full content height first: `mapStageBox` keeps the plate's own aspect and says
  // which dimension bound it. Everything below trades width away from that maximum.
  const fullHeight = mapStageBox({
    availableWidth: contentWidth,
    availableHeight: contentHeight,
    plateFrame: geometry.frame,
    studyLonSpanDeg: lonSpanOf(geometry),
  });
  // The floor: a column narrower than this beat's own longest unbreakable word cannot hold its
  // title, and a PLATE narrower than it is a strip rather than a picture. One measured number,
  // derived from the strings this beat actually draws, doing both jobs — the locator's own floor.
  const minColumn = Math.ceil(
    Math.max(...title.split(/\s+/).map((w) => measureText(w, T.TITLE))),
  );

  /** Everything the column costs at a given plate width, and whether it fits the band. */
  const layoutFor = (plateWidth: number) => {
    const stage = mapStageBox({
      availableWidth: plateWidth,
      availableHeight: contentHeight,
      plateFrame: geometry.frame,
      studyLonSpanDeg: lonSpanOf(geometry),
    });
    const columnWidth = contentWidth - stage.width - GUTTER;
    const mapScale = stage.width / geometry.frame.width;
    // THE LEGEND IS A RULER, SO IT IS DRAWN AT THE MAP'S OWN SCALE. It used to call `radiusOf`
    // straight, which was right only because the plate happened to be drawn at 1:1 — at any other
    // frame the key circles would have been a different size from the marks they key, which is a
    // ruler measuring something else.
    const legendMaxR = maxRadiusPx * mapScale;

    const titleLines = wrap(title, Math.max(columnWidth, 1), T.TITLE);
    const captionLines = wrap(
      legendCaption,
      Math.max(columnWidth, 1),
      T.CAPTION,
    );
    const caveatLines = wrap(caveat, Math.max(columnWidth, 1), T.NOTE);

    // The header: title, then the legend under it. The legend is part of the header — it says what
    // the sizes mean before the reader looks — so the slack a bigger frame opens lands in ONE
    // place, above the caveat, where it reads as air rather than as a missing block.
    const titleTop = top + T.TITLE.fontSize;
    const titleBottom = titleTop + (titleLines.length - 1) * T.TITLE.lead;
    const captionTop = titleBottom + sp(BASE.BLOCK_AIR) + T.CAPTION.fontSize;
    const captionBottom =
      captionTop + (captionLines.length - 1) * T.CAPTION.lead;
    const legendLabelBaseline =
      captionBottom + sp(BASE.LEGEND_TOP_AIR) + T.LEGEND_LABEL.fontSize;
    const legendBaseline =
      legendLabelBaseline + sp(BASE.LEGEND_LABEL_DROP) + legendMaxR * 2;

    // The caveat is the last block of the column and builds UPWARD from the content floor.
    const caveatBottom = contentBottom;
    const caveatTop = caveatBottom - (caveatLines.length - 1) * T.NOTE.lead;
    const caveatInk = caveatTop - T.NOTE.fontSize;

    const furniture =
      legendBaseline -
      top +
      sp(BASE.LEGEND_TO_CAVEAT) +
      (contentBottom - caveatInk);

    return {
      stage,
      columnWidth,
      mapScale,
      legendMaxR,
      titleLines,
      captionLines,
      caveatLines,
      titleTop,
      captionTop,
      legendLabelBaseline,
      legendBaseline,
      caveatTop,
      furniture,
      fits:
        columnWidth >= minColumn &&
        caveatInk - sp(BASE.LEGEND_TO_CAVEAT) >= legendBaseline,
    };
  };

  // THE SEARCH: start at the plate the frame allows and give width back until the column holds its
  // own words. Downward only, and never past the floor — nothing here makes type smaller.
  let plateWidth = fullHeight.width;
  let chosen = layoutFor(plateWidth);
  while (!chosen.fits && plateWidth - BASE.PLATE_STEP >= minColumn) {
    plateWidth -= BASE.PLATE_STEP;
    chosen = layoutFor(plateWidth);
  }

  if (!chosen.fits) {
    // R9, stated, with the arithmetic that produced it. `minColumn` is reused as the floor a map is
    // still a map at: below the width of this beat's own longest title word there is no picture
    // left to read, only a strip.
    throw new Error(
      `map-quake-symbol cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `The plate gave width back down to the ${minColumn}px floor — this beat's own longest ` +
        `title word — and the column still does not hold its furniture: at a ${chosen.stage.width}x` +
        `${chosen.stage.height} plate the column is ${chosen.columnWidth}px and its words take ` +
        `${Math.round(chosen.furniture)}px of the ${contentHeight}px left after the credit.\n` +
        `At ${size} the legibility floor is ${row.minTypePx}px, which is what makes the furniture ` +
        `this tall: title ${chosen.titleLines.length} lines, legend caption ` +
        `${chosen.captionLines.length} over a ${Math.round(chosen.legendMaxR * 2)}px ruler, caveat ` +
        `${chosen.caveatLines.length}, credit ${sourceLines.length}. Nothing in the removal ladder ` +
        `makes type smaller, and this beat's caveat is the sentence that keeps its own encoding ` +
        `honest — it is what tells a reader the circles are sized by ENERGY — so it is not a line ` +
        `to drop.\nIt ships at landscape.`,
    );
  }

  const MAP = chosen.stage.width;
  const MAP_H = chosen.stage.height;
  // The plate sits against the right margin, the column against the left. Where the plate has given
  // width back it no longer fills the band's height, so it is centred in what is left — the
  // letterbox `mapStageBox` reports, rather than a crop or a stretch.
  const MAP_X = FRAME.width - PAD - MAP;
  const MAP_Y = top + Math.round((contentHeight - MAP_H) / 2);
  const COLUMN = { x: PAD, width: chosen.columnWidth };

  const scale = chosen.mapScale;
  const drawn = drawOrder(geometry.points); // largest first, so smaller circles paint on top

  const subject = geometry.points.find((p) => p.key === subjectKey);
  if (!subject) throw new Error(`no point for the subject ${subjectKey}`);

  // ── FOUR PLACEMENTS, TRIED IN ORDER, AND THE FIRST THAT IS BOTH ON THE PLATE AND CLEAR OF
  //    EVERY OTHER MARK WINS ─────────────────────────────────────────────────────────────────
  //
  // `labelPlacement` decides between RIGHT and LEFT on a typed 130 px margin, measured against a
  // 496 px plate. Two things are wrong with that at a frame this beat did not choose, and the
  // 1920x1080 render showed both:
  //
  // FIRST, the margin is 26% of a 496 px plate and 16% of an 809 px one, so it stops being the
  // rule it was tuned to be — the same finding `map-geneva-locator` opened its own big render on.
  // What a label needs on its right is its own width, its mark's radius and its gap, so that is
  // what is measured and no constant decides it.
  //
  // SECOND, and this is the one only looking catches: a left/right model has nowhere else to go, so
  // where neither side is clear it puts the label on top of another MARK and reports success.
  // Nothing here measured that. At 809 px the M7.9 event 130 km inland of Tohoku sits INSIDE the
  // subject's own 62 px accent disc, and its label was drawn across the middle of it — so the one
  // mark this beat is about carried a number that is not its own, next to a colour whose whole job
  // (`BRIEF.md`: "the accent outline, not the size, is what identifies it") is to identify it. That
  // is a mislabelling, not a cosmetic overlap.
  //
  // So the model is the locator's ladder — right, left, above, below — and the first candidate that
  // is both wholly on the plate and clear of every other mark wins. Above and below anchor the
  // label's END at the mark's own x when centring it would leave the plate, so a name near an edge
  // still points at its own point. A label with NO clear candidate is not drawn at all rather than
  // drawn in the least-bad place; `declutterLabels` below then resolves label-against-label, and
  // the subject is guarded by name because the furniture depends on it.
  const labelTextOf = (p: { mag: number }) => `M${p.mag.toFixed(1)}`;
  const LABEL_GAP = sp(BASE.LABEL_GAP);
  const labelHeight = T.POINT_LABEL.fontSize + sp(BASE.LABEL_BOX_AIR);
  type Placement = {
    side: "right" | "left" | "above" | "below";
    x: number;
    y: number;
    anchor: "start" | "end" | "middle";
    box: { x: number; y: number; width: number; height: number };
  };
  const placementsFor = (p: {
    px: number;
    py: number;
    mag: number;
  }): Placement[] => {
    const cx = p.px * scale;
    const cy = p.py * scale;
    const r = radiusOf(p.mag) * scale;
    const w =
      measureText(labelTextOf(p), T.POINT_LABEL) + sp(BASE.LABEL_BOX_AIR);
    const midY = cy - T.POINT_LABEL.fontSize / 2 - sp(2);
    const centred = Math.min(Math.max(cx - w / 2, 0), MAP - w);
    const overAnchor = centred + w / 2;
    return [
      {
        side: "right",
        x: cx + r + LABEL_GAP,
        y: cy + sp(4),
        anchor: "start",
        box: { x: cx + r + LABEL_GAP, y: midY, width: w, height: labelHeight },
      },
      {
        side: "left",
        x: cx - r - LABEL_GAP,
        y: cy + sp(4),
        anchor: "end",
        box: {
          x: cx - r - LABEL_GAP - w,
          y: midY,
          width: w,
          height: labelHeight,
        },
      },
      {
        side: "above",
        x: overAnchor,
        y: cy - r - LABEL_GAP - sp(2),
        anchor: "middle",
        box: {
          x: centred,
          y: cy - r - LABEL_GAP - labelHeight,
          width: w,
          height: labelHeight,
        },
      },
      {
        side: "below",
        x: overAnchor,
        y: cy + r + LABEL_GAP + T.POINT_LABEL.fontSize,
        anchor: "middle",
        box: {
          x: centred,
          y: cy + r + LABEL_GAP,
          width: w,
          height: labelHeight,
        },
      },
    ];
  };
  const onPlate = (b: Placement["box"]) =>
    b.x >= 0 && b.y >= 0 && b.x + b.width <= MAP && b.y + b.height <= MAP_H;
  /** A mark is a DISC, not a point, so the test is box-against-circle: the nearest point of the box
   *  to the mark's centre must stay outside its radius plus the halo the label is drawn with. */
  const clearsMarks = (b: Placement["box"], self: string) =>
    geometry.points.every((o) => {
      if (o.key === self) return true;
      const ocx = o.px * scale;
      const ocy = o.py * scale;
      const nearestX = Math.min(Math.max(ocx, b.x), b.x + b.width);
      const nearestY = Math.min(Math.max(ocy, b.y), b.y + b.height);
      return (
        Math.hypot(ocx - nearestX, ocy - nearestY) >=
        radiusOf(o.mag) * scale + sp(BASE.LABEL_HALO)
      );
    });
  const placement = new Map<string, Placement>();
  for (const p of geometry.points) {
    const found = placementsFor(p).find(
      (o) => onPlate(o.box) && clearsMarks(o.box, p.key),
    );
    if (found) placement.set(p.key, found);
  }

  // Label declutter: the subject always wins (priority -1, it already carries the accent colour and
  // bold weight — the one label this beat cannot afford to lose), the rest fall in behind it by
  // descending magnitude, so where two labels would collide, the bigger event's own number is the
  // one a reader keeps. Same box the ladder chose, or the declutter would be deciding against a box
  // it never actually draws.
  const shownLabels = declutterLabels(
    geometry.points
      .filter((p) => placement.has(p.key))
      .map((p) => ({
        ...p,
        priority: p.key === subjectKey ? -1 : -p.mag,
      })),
    (p) => placement.get(p.key)!.box,
  );

  // The words and the picture must agree. This beat's title, caveat and alt are all ABOUT the
  // subject, so a frame where the subject's own number is not drawn sends a reader looking for
  // something that is not there. Failing loudly is the only way that stays fixed.
  if (!shownLabels.has(subjectKey))
    throw new Error(
      `at ${size} the furniture is about M${subject.mag} (${subject.place}), but no placement for ` +
        `its label is both on the plate and clear of every other mark on a ${MAP}px plate at a ` +
        `${T.POINT_LABEL.fontSize}px label. Ship a size where the plate is bigger, or move the ` +
        `camera off the frame edge.`,
    );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={FRAME.width}
      height={FRAME.height}
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      fontFamily={FONT_FAMILY}
      role="img"
    >
      <desc>{alt}</desc>
      <defs>
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

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g transform={`translate(${MAP_X},${MAP_Y})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={MAP} height={MAP_H} />
        {drawn.map((point) => {
          const isSubject = point.key === subjectKey;
          const r = radiusOf(point.mag) * scale;
          const cx = point.px * scale;
          const cy = point.py * scale;
          // The SAME placement the ladder chose and the declutter measured. Two independent
          // derivations of "where does this label go" is how a beat tests one box and draws another.
          const at = placement.get(point.key);
          const fill = isSubject ? accent : muted;
          return (
            <Fragment key={point.key}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={fill}
                fillOpacity={isSubject ? 0.55 : 0.38}
                stroke={fill}
                strokeWidth={sp(BASE.MARKER_STROKE)}
              />
              {at && shownLabels.has(point.key) && (
                <>
                  <text
                    x={at.x}
                    y={at.y}
                    textAnchor={at.anchor}
                    fontSize={T.POINT_LABEL.fontSize}
                    fontWeight={isSubject ? 700 : T.POINT_LABEL.fontWeight}
                    stroke={ground}
                    strokeWidth={sp(BASE.LABEL_HALO)}
                    strokeLinejoin="round"
                    fill="none"
                  >
                    {labelTextOf(point)}
                  </text>
                  <text
                    x={at.x}
                    y={at.y}
                    textAnchor={at.anchor}
                    fontSize={T.POINT_LABEL.fontSize}
                    fontWeight={isSubject ? 700 : T.POINT_LABEL.fontWeight}
                    fill={isSubject ? accent : ink}
                  >
                    {labelTextOf(point)}
                  </text>
                </>
              )}
            </Fragment>
          );
        })}
      </g>

      {/* ── The column ──────────────────────────────────────────────────────────────────── */}
      {chosen.titleLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={chosen.titleTop + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}

      {chosen.captionLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={chosen.captionTop + i * T.CAPTION.lead}
          fill={muted}
          fontSize={T.CAPTION.fontSize}
          fontWeight={T.CAPTION.fontWeight}
        >
          {line}
        </text>
      ))}

      {/* Reference circles: smallest to largest, left to right, sharing one baseline, each
          labelled directly above its own crown — a nested legend (all circles sharing one centre)
          reads well for 2 sizes but at 3 its two smaller circles hide inside the largest, which is
          exactly the "decoration that encodes nothing" a reader cannot use as a ruler. Drawn at the
          MAP's own scale, so the ruler and the marks it keys are the same size. */}
      {(() => {
        const ordered = [...legend].reverse(); // smallest first
        const radiusAt = (v: number) => radiusOf(v) * scale;
        // THE SPACING IS DERIVED FROM BOTH NEIGHBOURS, not from the current circle plus a constant.
        // It used to advance by `r + maxR * 0.55 + 20`, which never looked at the NEXT circle's
        // radius — harmless while every key was within 8% of every other, and wrong the moment the
        // scale started separating them: at the energy scale's 9.44x span the M9.1 ring drew
        // straight through the M8.5 one. Each step now clears both radii, and also both labels,
        // which are centred over their own crowns.
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
                cy={chosen.legendBaseline - r}
                r={r}
                fill="none"
                stroke={muted}
                strokeWidth={sp(1)}
              />
              <text
                x={cx}
                y={chosen.legendBaseline - r * 2 - sp(BASE.LEGEND_LABEL_DROP)}
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

      {chosen.caveatLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={chosen.caveatTop + i * T.NOTE.lead}
          fill={muted}
          fontSize={T.NOTE.fontSize}
        >
          {line}
        </text>
      ))}

      {/* ── The credit, across the foot of the band ──────────────────────────────────────── */}
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
    </svg>
  );
}
