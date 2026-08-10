/**
 * "The Danube touches nine countries on its way to the Black Sea" — one frame, no order. A
 * FLOW-MAP (route) beat: an ordered coordinate list drawn as one continuous path, with the
 * territories it geometrically intersects filled and numbered in the order it first enters each
 * one. See `map-beat/references/types/flow-map.md`.
 *
 * ── THERE IS NO `const FRAME` HERE ANY MORE, AND ITS ABSENCE IS THE POINT ─────────────────────
 *
 * It used to read `{ width: 960, height: 780 }`, and `render.mjs` repeated the same two numbers, so
 * `renderStill` compared them against each other and they agreed by construction. A journalist
 * pinning a size at gate 2c reached nothing. The frame is now `sizeFor(size)`'s and `size` is read
 * out of this beat's own `BRIEF.md` front matter.
 *
 * ── THE MAP IS NOT LAID OUT LIKE A PLOT ──────────────────────────────────────────────────────
 *
 * A chart clamps its plot into an aspect range measured for its type. A map has no plot rectangle:
 * what fixes its shape is the CAMERA, and this beat's camera is already frozen — the committed
 * plate is a raster whose bake fitted the study bounds, so the plate's own aspect (900 x 420, the
 * flattest in this corpus at 2.143:1) IS the shape this geography takes. `mapStageBox` scales that
 * aspect to whichever dimension binds first and hands back what is left; the leftover goes to
 * FURNITURE, never to a wider camera and never to a crop (`skills/map-beat/assets/geo.ts`, the
 * rule; `scripts/stage.mjs`, the arithmetic).
 *
 * ── WHAT THE FLATTEST PLATE IN THE CORPUS DOES WITH A FLAT FRAME ─────────────────────────────
 *
 * The intuition going in was that a 2.143:1 plate would finally have height to spare. It does not,
 * and the arithmetic says why: a 1920 x 1080 frame is read in a ~900 px article column, so every
 * token multiplies by 2.26 to clear the 26 px floor, and this beat carries a great deal of text —
 * a 205-character title that names all nine countries, a 470-character caveat that is where the
 * "crossed is not flowed through" honesty lives, a two-line source, and a nine-chip legend. Stacked
 * in one column that furniture takes 447 px of the 910 px band before a gap is drawn.
 *
 * So what is actually left over is WIDTH, not height: a map bound by the band's height is 992 px
 * wide inside a 1750 px content box. That leftover is spent on the LEGEND, which moves out of the
 * vertical stack and into the column beside the map — the arrangement is measured, not chosen per
 * size, and the beat draws whichever of the two leaves the taller map. It is not a preference:
 * stacked, the map is 505 x 236, and at that width two of the nine numbered badges TOUCH (see
 * `badgeFloor` below), which destroys the one device the claim rests on.
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
  TERRITORY_FILL_OPACITY,
  compositeOverLand,
  numeralInk,
} from "./geo-flow.ts";

/**
 * THE 960x780 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * Every spacing number goes through `sp`, not only the fonts — the probe measured what happens
 * otherwise: eleven bare literals in one beat's layout arithmetic collided the title into the
 * subtitle at 1920x1080. `PAD` is the one exception, because a frame's margin is proportional to
 * the CANVAS and not to the type (`frameInsetFor`, and `sizes.mjs` states the split).
 *
 * ONE TOKEN MOVED, AND IT IS NOT A TUNING. The legend chip used to draw its order number at 9 px
 * inside an 8 px-radius circle — a shrunken copy of the badge it is the key to. A 9 px token cannot
 * clear ANY size's legibility floor except by raising the whole beat's type scale to 2.89, which
 * measured 1010 px of furniture against a 910 px band: the beat would have refused landscape to
 * protect a numeral nobody can read anyway. The chip is now drawn at the badge's own size and with
 * the badge's own numeral, so the key and the mark it keys are one object, and the smallest token
 * this beat holds is the caveat's.
 */
const BASE = {
  TITLE: { fontSize: 21, fontWeight: 700, lead: 27 },
  SOURCE: { fontSize: 13, fontWeight: 400, lead: 17 },
  CAPTION: { fontSize: 12, fontWeight: 600 },
  // 12, not the 11.5 this beat was tuned at. The size table derives EVERY row's `typeScale` from a
  // smallest base token of 12 (`sizes.mjs`: "seed base tokens … smallest is 12"), so a beat holding
  // 11.5 misses every floor by construction and makes `typeScaleFor` invent a bigger multiplier for
  // the whole hierarchy — 2.26 instead of the table's 2.2, which is 20 px of furniture this beat
  // cannot spare. Raising the token is the smaller change and keeps the beat inside the table's own
  // arithmetic; the caveat renders at 26 px either way, so the delivered line is unchanged.
  NOTE: { fontSize: 12, fontWeight: 400, lead: 15 },
  LEGEND_LABEL: { fontSize: 12, fontWeight: 400 },
  BADGE_NUMERAL: { fontSize: 12, fontWeight: 700 },
  BADGE_R: 11,
  BADGE_STROKE: 2,
  /** Clear air between two badge rings before they read as one blob — the floor below. */
  BADGE_AIR: 4,
  BADGE_NUMERAL_DROP: 4,
  TERRITORY_STROKE: 1.4,
  ROUTE_HALO: 6,
  ROUTE_LINE: 3,
  GUTTER: 32,
  CHIP_GAP: 18,
  CHIP_TEXT_GAP: 6,
  CHIP_ROW: 22,
  CHIP_NUMERAL_DROP: 3,
  LEGEND_TOP_AIR: 10,
  TITLE_TO_MAP: 24,
  MAP_TO_LEGEND: 34,
  CAVEAT_TO_SOURCE: 12,
  BLOCK_AIR: 16,
};

/** The smallest token this beat draws — the caveat, now on the table's own seed of 12, so
 *  `typeScaleFor` returns the row's DEFAULT scale rather than raising it for the whole hierarchy to
 *  rescue one under-sized token. It is still routed through `typeScaleFor` rather than read off the
 *  row, because that is the call that would catch a token slipping back under 12. */
const SMALLEST_BASE_TOKEN = BASE.NOTE.fontSize;

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
    LEGEND_LABEL: f(BASE.LEGEND_LABEL) as typeof BASE.LEGEND_LABEL,
    BADGE_NUMERAL: f(BASE.BADGE_NUMERAL) as typeof BASE.BADGE_NUMERAL,
  };
}

export type CrossingDrawn = {
  key: string;
  name: string;
  colour: string;
  order: number; // 1-based
  rings: [number, number][][];
  anchor: [number, number];
};

export type FlowMapStillProps = {
  geometry: {
    frame: { width: number; height: number };
    frameCorners: { west: number; north: number; east: number; south: number };
  };
  plate: string;
  crossings: CrossingDrawn[];
  route: [number, number][];
  accent: string;
  title: string;
  source: string;
  basemapCredit: string;
  caveat: string;
  alt: string;
  ground: string;
  ink: string;
  muted: string;
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

/** The plate's own pixels, scaled into the box the map is actually drawn in. */
function ringPath(rings: [number, number][][], s: number): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        "M" +
        ring
          .map(([x, y]) => `${(x * s).toFixed(1)} ${(y * s).toFixed(1)}`)
          .join("L") +
        "Z",
    )
    .join("");
}

function routePath(route: [number, number][], s: number): string {
  if (route.length < 2) return "";
  return (
    "M" +
    route
      .map(([x, y]) => `${(x * s).toFixed(1)} ${(y * s).toFixed(1)}`)
      .join("L")
  );
}

/**
 * THE WIDTH BELOW WHICH THE NUMBERING STOPS WORKING — derived from this beat's own anchors, never
 * typed. The badges carry the crossing order, which is the whole claim; two that overlap read as
 * one. A badge is a fixed number of TYPE pixels across (it holds a numeral that must clear the
 * size's floor) while the distance between two anchors scales with the plate, so the two move in
 * opposite directions as the map shrinks. On this data the binding pair is Hungary and Croatia at
 * 75.8 px of the 900 px plate.
 */
function badgeFloor(
  crossings: CrossingDrawn[],
  plateWidth: number,
  badgeSpanPx: number,
) {
  let gap = Infinity;
  let pair = ["", ""];
  for (let i = 0; i < crossings.length; i++)
    for (let j = i + 1; j < crossings.length; j++) {
      const [ax, ay] = crossings[i].anchor;
      const [bx, by] = crossings[j].anchor;
      const d = Math.hypot(ax - bx, ay - by);
      if (d < gap) {
        gap = d;
        pair = [crossings[i].name, crossings[j].name];
      }
    }
  return {
    pair,
    gapOnPlate: gap,
    minMapWidth: Math.ceil((badgeSpanPx * plateWidth) / gap),
  };
}

export function FlowMapStill({
  geometry,
  plate,
  crossings,
  route,
  accent,
  title,
  source,
  basemapCredit,
  caveat,
  alt,
  ground,
  ink,
  muted,
  size,
}: FlowMapStillProps) {
  const row = sizeFor(size);
  const FRAME = { width: row.width, height: row.height };
  const PAD = frameInsetFor(size);
  const T = tokens(typeScaleFor(row, SMALLEST_BASE_TOKEN));
  const sp = T.sp;
  const GUTTER = sp(BASE.GUTTER);
  const BADGE_R = sp(BASE.BADGE_R);

  // THE BAND, not the frame. Where the platform reserves part of the frame — portrait alone today —
  // everything a reader has to read lives inside it, because content outside it is at risk of being
  // COVERED by the platform's own chrome and no clipping counter can see that.
  const band = stageFor(size);
  const top = band.top + PAD;
  const bottom = band.bottom - PAD;
  const contentWidth = FRAME.width - PAD * 2;
  const contentHeight = bottom - top;

  const sourceText = `${source} · ${basemapCredit}`;

  const titleLines = wrap(title, contentWidth, T.TITLE);
  const sourceLines = wrap(sourceText, contentWidth, T.SOURCE);
  const caveatLines = wrap(caveat, contentWidth, T.NOTE);
  const titleBlock = T.TITLE.fontSize + (titleLines.length - 1) * T.TITLE.lead;
  const sourceBlock =
    T.SOURCE.fontSize + (sourceLines.length - 1) * T.SOURCE.lead;
  const caveatBlock = T.NOTE.fontSize + (caveatLines.length - 1) * T.NOTE.lead;

  // ── The legend, measured at whatever width it is given ──────────────────────────────────────
  // One numbered chip per territory, wrapped left to right, as many rows as it takes — measured,
  // never assumed to fit one row, because nine territory names is more than this beat's sibling
  // beats' legends carry. The chip is the badge's key, so it is drawn at the badge's own size.
  const CHIP_LEAD = BADGE_R * 2 + sp(BASE.CHIP_TEXT_GAP);
  const CHIP_GAP = sp(BASE.CHIP_GAP);
  const CHIP_ROW = sp(BASE.CHIP_ROW);
  const chipWidth = (c: CrossingDrawn) =>
    CHIP_LEAD + measureText(c.name, T.LEGEND_LABEL);
  const widestChip = Math.ceil(Math.max(...crossings.map(chipWidth)));
  /** The chips laid into rows of `width` — the same walk the drawing does, so what is measured is
   *  what is drawn rather than a second derivation of it. */
  const legendRows = (width: number): CrossingDrawn[][] => {
    const rows: CrossingDrawn[][] = [];
    let current: CrossingDrawn[] = [];
    let used = 0;
    for (const c of crossings) {
      const w = chipWidth(c);
      if (current.length > 0 && used + CHIP_GAP + w > width) {
        rows.push(current);
        current = [];
        used = 0;
      }
      if (current.length > 0) used += CHIP_GAP;
      current.push(c);
      used += w;
    }
    if (current.length > 0) rows.push(current);
    return rows;
  };
  const legendHeight = (rowCount: number) =>
    T.CAPTION.fontSize + sp(BASE.LEGEND_TOP_AIR) + rowCount * CHIP_ROW;

  // ── The vertical stack, built from BOTH ends ────────────────────────────────────────────────
  // The title anchors to the top of the band and the credit to its foot — the credit sits at the
  // bottom of the visual, the same place on every graphic this project ships, and it carries the
  // basemap credit with it, unsplit. What is left between them is the MIDDLE BAND, and the map and
  // the legend divide it. Measuring the furniture first and giving the map the remainder is the
  // only order that can refuse honestly: a map sized first and furniture squeezed after is how a
  // credit ends up off the frame with every counter green.
  const titleTop = top + T.TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * T.TITLE.lead;
  const middleTop = titleBottom + sp(BASE.TITLE_TO_MAP);
  // WRITTEN OUT, not `= bottom`, and the guard is the reason it is worth the repetition:
  // `splash/test/credit-anchors-to-the-frame-bottom.test.ts` reads this expression and requires it
  // to name a HEIGHT and subtract from it, because the defect it was built for — 60 components
  // hanging their credit off `titleBaseline` — is invisible at any single frame size and only
  // shows when the frame changes. A local `bottom` that happens to hold the right number tells
  // that guard nothing. It resolves to the same pixel; it says WHY. Note it is the BAND's foot and
  // not the frame's: at portrait the platform covers the frame's last 672 px, and a credit pinned
  // to the frame's floor there is a credit nobody can read.
  const sourceBottom = band.top + band.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  const caveatBottom =
    sourceTop - T.SOURCE.fontSize - sp(BASE.CAVEAT_TO_SOURCE);
  const caveatTop = caveatBottom - (caveatLines.length - 1) * T.NOTE.lead;
  const middleBottom = caveatTop - T.NOTE.fontSize - sp(BASE.BLOCK_AIR);
  const middleHeight = middleBottom - middleTop;

  const floor = badgeFloor(
    crossings,
    geometry.frame.width,
    BADGE_R * 2 + sp(BASE.BADGE_AIR),
  );
  const refuse = (why: string) =>
    new Error(
      `mapmore-flow-danube cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `${why}\n` +
        `At ${size} the legibility floor is ${row.minTypePx}px, so this beat's own text is ` +
        `${titleLines.length} title lines, ${caveatLines.length} caveat lines and ` +
        `${sourceLines.length} credit lines at ${T.TITLE.fontSize}/${T.NOTE.fontSize}/` +
        `${T.SOURCE.fontSize}px, taking ${titleBlock + caveatBlock + sourceBlock}px of the ` +
        `${contentHeight}px band before the nine-chip legend or a single gap is drawn. Nothing in ` +
        `the removal ladder makes type smaller, and the caveat is the sentence that keeps this ` +
        `beat's own claim honest — "crossed" is not "flowed through" — so it is not a line to drop.\n` +
        `It ships at landscape.`,
    );

  if (middleHeight <= 0)
    throw refuse(
      `The title ends at ${titleBottom} and the caveat starts at ${caveatTop}, so there is ` +
        `${middleHeight}px of band between them: the furniture alone overruns the frame by ` +
        `${-middleHeight}px before the map is drawn.`,
    );

  // ── WHERE THE MAP GOES, MEASURED ────────────────────────────────────────────────────────────
  // Arrangement 1, BESIDE: the map takes the whole middle band and the legend takes the width the
  // plate's aspect leaves over. A 2.143:1 plate in a content box flatter than itself is bound by
  // WIDTH and leaves nothing; bound by HEIGHT it leaves a column, and that column is where the
  // legend goes. Both facts are read off `mapStageBox`, never assumed from the size's name.
  const beside = mapStageBox({
    availableWidth: contentWidth,
    availableHeight: middleHeight,
    plateFrame: geometry.frame,
    studyLonSpanDeg: lonSpanOf(geometry),
  });
  const besideColumn = contentWidth - beside.width - GUTTER;
  const besideRows =
    besideColumn >= widestChip ? legendRows(besideColumn) : null;
  const besideFits =
    besideRows !== null && legendHeight(besideRows.length) <= middleHeight;

  // Arrangement 2, STACKED: the legend sits under the map at full width, and the map takes what is
  // left of the middle band. This is what the beat did at 960x780, where the frame was tall enough
  // (1.23:1) for it.
  const stackedRows = legendRows(contentWidth);
  const stackedHeight =
    middleHeight - sp(BASE.MAP_TO_LEGEND) - legendHeight(stackedRows.length);
  const stacked =
    stackedHeight > 0
      ? mapStageBox({
          availableWidth: contentWidth,
          availableHeight: stackedHeight,
          plateFrame: geometry.frame,
          studyLonSpanDeg: lonSpanOf(geometry),
        })
      : null;

  // Whichever leaves the taller map wins. Measured, not chosen per size.
  const useBeside =
    besideFits && (stacked === null || beside.height >= stacked.height);
  const box = useBeside ? beside : stacked;
  if (box === null)
    throw refuse(
      `The middle band is ${middleHeight}px and the nine-chip legend needs ` +
        `${legendHeight(stackedRows.length)}px of it at full width, which leaves ` +
        `${stackedHeight}px for the map; beside the map the leftover column is ` +
        `${besideColumn}px against the ${widestChip}px this beat's widest chip needs.`,
    );

  const MAP_W = box.width;
  const MAP_H = box.height;
  if (MAP_W < floor.minMapWidth)
    throw refuse(
      `The tallest map the ${middleHeight}px middle band admits is ${MAP_W}x${MAP_H} ` +
        `(${useBeside ? "legend beside" : "legend stacked under"} it), and the nine numbered ` +
        `badges need ${floor.minMapWidth}px of plate width before two of them touch: the closest ` +
        `pair, ${floor.pair[0]} and ${floor.pair[1]}, sit ${floor.gapOnPlate.toFixed(1)}px apart ` +
        `on a ${geometry.frame.width}px plate, and a badge is ${BADGE_R * 2}px across at this ` +
        `size. The badges carry the crossing order, which is this beat's entire claim; two that ` +
        `overlap read as one.`,
    );

  // The plate's own pixels into the drawn box. `mapStageBox` keeps the plate's aspect, so one
  // uniform scale carries both axes — `MAP_H` differs from `plateHeight * s` by the box's own
  // integer rounding (under a pixel), and the clip absorbs it.
  const s = MAP_W / geometry.frame.width;

  const MAP_X = PAD;
  const MAP_Y = middleTop;
  const legendWidth = useBeside ? besideColumn : contentWidth;
  const legendX = useBeside ? MAP_X + MAP_W + GUTTER : PAD;
  const legendTop = useBeside
    ? middleTop + T.CAPTION.fontSize
    : MAP_Y + MAP_H + sp(BASE.MAP_TO_LEGEND) + T.CAPTION.fontSize;
  const rows = useBeside ? besideRows! : stackedRows;

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
        <clipPath id="flow-plate-clip">
          <rect x={0} y={0} width={MAP_W} height={MAP_H} />
        </clipPath>
      </defs>

      <rect
        x={0}
        y={0}
        width={FRAME.width}
        height={FRAME.height}
        fill={ground}
      />

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

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g
        transform={`translate(${MAP_X},${MAP_Y})`}
        clipPath="url(#flow-plate-clip)"
      >
        <image href={plate} x={0} y={0} width={MAP_W} height={MAP_H} />

        {/* Each crossed territory: filled and outlined in its own cycling qualitative colour —
            computed, not hand-picked (see geo-flow.ts territoriesCrossed). */}
        {crossings.map((c) => (
          <path
            key={c.key}
            d={ringPath(c.rings, s)}
            fill={c.colour}
            fillOpacity={TERRITORY_FILL_OPACITY}
            stroke={c.colour}
            strokeWidth={sp(BASE.TERRITORY_STROKE)}
          />
        ))}

        {/* The route's own line: a `ground`-coloured halo first (legible over both fills and the
            water tint), then ONE accent colour on top — basemap-aware (the deepened orange reads
            on the light basemap, the light-blue water tint and every territory fill alike). Both
            widths go through `sp`, so the line keeps its APPARENT weight in a frame read at a
            different distance rather than thinning to a hair at 1920. */}
        <path
          d={routePath(route, s)}
          fill="none"
          stroke={ground}
          strokeWidth={sp(BASE.ROUTE_HALO)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
        <path
          d={routePath(route, s)}
          fill="none"
          stroke={accent}
          strokeWidth={sp(BASE.ROUTE_LINE)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Numbered badges, one per territory, anchored near where the route actually runs through
            it (geo-flow.ts pointOnFeature + routeBBoxWithin) — never a plain, possibly off-frame
            national centroid. */}
        {crossings.map((c) => (
          <g key={`badge-${c.key}`}>
            <circle
              cx={c.anchor[0] * s}
              cy={c.anchor[1] * s}
              r={BADGE_R}
              fill={c.colour}
              stroke={ground}
              strokeWidth={sp(BASE.BADGE_STROKE)}
            />
            <text
              x={c.anchor[0] * s}
              y={c.anchor[1] * s + sp(BASE.BADGE_NUMERAL_DROP)}
              fill={numeralInk(c.colour)}
              fontSize={T.BADGE_NUMERAL.fontSize}
              fontWeight={T.BADGE_NUMERAL.fontWeight}
              textAnchor="middle"
            >
              {c.order}
            </text>
          </g>
        ))}
      </g>

      {/* ── The legend ──────────────────────────────────────────────────────────────────── */}
      <text
        x={legendX}
        y={legendTop}
        fill={muted}
        fontSize={T.CAPTION.fontSize}
        fontWeight={T.CAPTION.fontWeight}
      >
        Territories crossed, in order —
      </text>
      {rows.map((r, ri) => {
        let x = legendX;
        const y = legendTop + sp(BASE.LEGEND_TOP_AIR) + ri * CHIP_ROW + BADGE_R;
        return (
          <Fragment key={ri}>
            {r.map((c) => {
              const node = (
                <Fragment key={c.key}>
                  <circle
                    cx={x + BADGE_R}
                    cy={y - BADGE_R / 2}
                    r={BADGE_R}
                    fill={compositeOverLand(c.colour)}
                    stroke={c.colour}
                    strokeWidth={sp(BASE.BADGE_STROKE)}
                  />
                  <text
                    x={x + BADGE_R}
                    y={y - BADGE_R / 2 + sp(BASE.CHIP_NUMERAL_DROP)}
                    fill={numeralInk(compositeOverLand(c.colour))}
                    fontSize={T.BADGE_NUMERAL.fontSize}
                    fontWeight={T.BADGE_NUMERAL.fontWeight}
                    textAnchor="middle"
                  >
                    {c.order}
                  </text>
                  <text
                    x={x + CHIP_LEAD}
                    y={y}
                    fill={muted}
                    fontSize={T.LEGEND_LABEL.fontSize}
                  >
                    {c.name}
                  </text>
                </Fragment>
              );
              x += chipWidth(c) + CHIP_GAP;
              return node;
            })}
          </Fragment>
        );
      })}

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
    </svg>
  );
}
