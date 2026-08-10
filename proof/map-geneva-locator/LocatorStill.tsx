/**
 * The static genre of "Geneva's international quarter" — one frame, no order. A LOCATOR beat:
 * position and category only, no magnitude, no rate, no gradient. See
 * `map-beat/references/types/locator.md`.
 *
 * ── THERE IS NO `const FRAME` HERE ANY MORE, AND ITS ABSENCE IS THE POINT ─────────────────────
 *
 * It used to read `{ width: 900, height: 560 }`, and the render script repeated the same two
 * numbers, so `renderStill` compared them against each other and they agreed by construction. A
 * journalist pinning a size at gate 2c reached nothing. The frame is now `sizeFor(size)`'s and
 * `size` is read out of this beat's own `BRIEF.md`.
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
 * Two arrangements fall out of that, and which one is drawn is MEASURED rather than chosen per
 * size: a square plate beside a text column where the frame is wide enough to leave a column that
 * can hold this beat's own longest word, and the plate above the column where it is not. Where
 * neither fits, the beat refuses, naming what would not go in.
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
  CATEGORY_ORDER,
  declutterLabels,
  labelSide,
  separateOverlappingMarkers,
  type OrgRow,
} from "./geo-locator";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER.
 *
 * Every spacing number goes through `sp`, not only the fonts — the probe measured what happens
 * otherwise: eleven bare literals in one beat's layout arithmetic collided the title into the
 * subtitle at 1920x1080. `PAD` is the one exception, because a frame's margin is proportional to
 * the CANVAS and not to the type (`frameInsetFor`, and `sizes.mjs` states the split).
 */
const BASE = {
  TITLE: { fontSize: 20, fontWeight: 700, lead: 26 },
  SOURCE: { fontSize: 13, fontWeight: 400, lead: 17 },
  CAPTION: { fontSize: 12, fontWeight: 600 },
  NOTE: { fontSize: 11.5, fontWeight: 400, lead: 15 },
  LABEL: { fontSize: 11, fontWeight: 600 },
  LEGEND_LABEL: { fontSize: 11.5, fontWeight: 400 },
  GUTTER: 32,
  MARKER_R: 5,
  MARKER_STROKE: 1.4,
  LABEL_HALO: 3,
  LABEL_GAP: 4,
  LABEL_BASELINE_NUDGE: 4,
  LABEL_BOX_AIR: 10,
  LABEL_BOX_PAD: 4,
  SEPARATION_AIR: 4,
  CAPTION_LEAD: 4,
  LEGEND_ROW: 22,
  LEGEND_SWATCH_X: 6,
  LEGEND_TEXT_X: 20,
  LEGEND_TO_CAVEAT: 34,
  LEGEND_TOP_AIR: 10,
  CAVEAT_TO_SOURCE: 12,
  BLOCK_AIR: 16,
};

/** The smallest token this beat draws — the marker label. `typeScaleFor` puts it on the size's own
 *  legibility floor, which the table's default scale cannot do for a beat whose smallest token is
 *  under the seed's 12. */
const SMALLEST_BASE_TOKEN = BASE.LABEL.fontSize;

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
    LABEL: f(BASE.LABEL) as typeof BASE.LABEL,
    LEGEND_LABEL: f(BASE.LEGEND_LABEL) as typeof BASE.LEGEND_LABEL,
  };
}

export type LocatorStillProps = {
  geometry: {
    frame: { width: number; height: number };
    frameCorners: { west: number; north: number; east: number; south: number };
    points: (OrgRow & { px: number; py: number })[];
  };
  plate: string;
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  alt: string;
  ground: string;
  ink: string;
  muted: string;
  /** One colour per category, in the order the legend lists them — READ from the beat's recorded
   *  PALETTE.md and handed in, never named here. A locator's categories ARE its data: the marker
   *  colour is the only thing separating three tiers of an institutional system on a plate that
   *  carries no other encoding, so a hex typed into this file would be the one mark a reader reads
   *  the map by, in a colour nobody chose. The set is still Okabe–Ito, the CVD-safe qualitative
   *  palette this project cycles categorical colour from; it is now recorded rather than asserted. */
  categoryColour: Record<string, string>;
  /** Keys the furniture names in words, which must therefore be labelled in the picture. */
  mustLabel?: string[];
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

export function LocatorStill({
  geometry,
  plate,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  alt,
  ground,
  ink,
  muted,
  categoryColour,
  mustLabel = [],
  size,
}: LocatorStillProps) {
  const row = sizeFor(size);
  const FRAME = { width: row.width, height: row.height };
  const PAD = frameInsetFor(size);
  const T = tokens(typeScaleFor(row, SMALLEST_BASE_TOKEN));
  const sp = T.sp;
  const GUTTER = sp(BASE.GUTTER);
  const MARKER_R = sp(BASE.MARKER_R);

  // THE BAND, not the frame. Where the platform reserves part of the frame — portrait alone today —
  // everything a reader has to read lives inside it, because content outside it is at risk of being
  // COVERED by the platform's own chrome and no clipping counter can see that.
  const band = stageFor(size);
  const top = band.top + PAD;
  const bottom = band.bottom - PAD;
  const contentWidth = FRAME.width - PAD * 2;
  const contentHeight = bottom - top;

  const sourceText = `${source} · ${basemapCredit}`;

  // ── WHERE THE MAP GOES, MEASURED ────────────────────────────────────────────────────────────
  // First arrangement: the plate takes the full content height and the column takes what is left
  // beside it. That column has to be able to hold this beat's own longest unbreakable word — a
  // title that cannot wrap is a title that runs off the frame — and its legend rows, so the floor
  // is derived from the strings this beat actually draws rather than typed as a fraction.
  const beside = mapStageBox({
    availableWidth: contentWidth,
    availableHeight: contentHeight,
    plateFrame: geometry.frame,
    studyLonSpanDeg: lonSpanOf(geometry),
  });
  const minColumn = Math.ceil(
    Math.max(
      ...title.split(/\s+/).map((w) => measureText(w, T.TITLE)),
      ...CATEGORY_ORDER.map(
        (c) => measureText(c, T.LEGEND_LABEL) + sp(BASE.LEGEND_TEXT_X),
      ),
    ),
  );
  const columnBeside = contentWidth - beside.width - GUTTER;
  const sideBySide = columnBeside >= minColumn;

  const columnWidth = sideBySide ? columnBeside : contentWidth;

  const titleLines = wrap(title, columnWidth, T.TITLE);
  const sourceLines = wrap(sourceText, columnWidth, T.SOURCE);
  const caveatLines = wrap(caveat, columnWidth, T.NOTE);
  const legendLines = wrap(legendCaption, columnWidth, T.CAPTION);

  const titleBlock = T.TITLE.fontSize + (titleLines.length - 1) * T.TITLE.lead;
  const legendBlock =
    legendLines.length * (T.CAPTION.fontSize + sp(BASE.CAPTION_LEAD)) +
    sp(BASE.LEGEND_TOP_AIR) +
    CATEGORY_ORDER.length * sp(BASE.LEGEND_ROW);
  const caveatBlock = T.NOTE.fontSize + (caveatLines.length - 1) * T.NOTE.lead;
  const sourceBlock =
    T.SOURCE.fontSize + (sourceLines.length - 1) * T.SOURCE.lead;

  // Second arrangement: the plate above the column. The furniture is measured FIRST and the map
  // takes what is left — which is the rule read from the other end, and the only order that can
  // refuse honestly. A map sized first and furniture squeezed after is how a credit ends up off
  // the frame with every counter green.
  const stackedFurniture =
    titleBlock +
    sp(BASE.BLOCK_AIR) +
    legendBlock +
    sp(BASE.LEGEND_TO_CAVEAT) +
    caveatBlock +
    sp(BASE.CAVEAT_TO_SOURCE) +
    sourceBlock +
    sp(BASE.BLOCK_AIR);
  const stackedMapHeight = contentHeight - stackedFurniture;

  if (!sideBySide && stackedMapHeight < minColumn) {
    // R9, stated. `minColumn` is reused as the floor a map is still a map at: below the width of
    // this beat's own longest title word there is no picture left to read, only a strip.
    throw new Error(
      `map-geneva-locator cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `The column beside a ${beside.width}x${beside.height} plate would be ${columnBeside}px, ` +
        `under the ${minColumn}px this beat's own longest title word and legend rows need, so the ` +
        `plate has to go above the column — and stacked, the furniture takes ${stackedFurniture}px ` +
        `of the ${contentHeight}px band, leaving ${stackedMapHeight}px for the map.\n` +
        `At ${size} the legibility floor is ${row.minTypePx}px, which is what makes the furniture ` +
        `this tall: title ${titleLines.length} lines, caveat ${caveatLines.length}, legend ` +
        `${CATEGORY_ORDER.length} rows, credit ${sourceLines.length}. Nothing in the removal ladder ` +
        `makes type smaller, and this beat's caveat is the sentence that keeps its own claim honest ` +
        `("${apartCount(caveat)}"), so it is not a line to drop.\n` +
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

  const columnTop = sideBySide ? top : MAP_Y + MAP_H + sp(BASE.BLOCK_AIR);
  const titleTop = columnTop + T.TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * T.TITLE.lead;
  // THE LEGEND JOINS THE TITLE, and it did not used to. It was anchored upward off the caveat, so
  // the column was laid out entirely from its two ends and whatever slack the frame had opened in
  // the middle. At 900x560 there was none; the first 1920x1080 render put a 250 px hole between the
  // title and the key, with the legend floating at two-fifths of the frame under nothing. A legend
  // is part of the header — it says what the colours mean before the reader looks — so it is
  // anchored to the header, and the slack a bigger frame opens now lands in ONE place, above the
  // bottom stack, where it reads as air rather than as a missing block.
  const legendTop = titleBottom + sp(BASE.BLOCK_AIR) + T.CAPTION.fontSize;
  const legendBottom =
    legendTop +
    legendLines.length * (T.CAPTION.fontSize + sp(BASE.CAPTION_LEAD)) +
    sp(BASE.LEGEND_TOP_AIR) +
    CATEGORY_ORDER.length * sp(BASE.LEGEND_ROW);
  // THE SOURCE IS THE LAST LINE BEFORE THE BOTTOM MARGIN — the credit sits at the bottom of the
  // visual, the same place on every graphic this project ships, and it carries the basemap credit
  // with it, unsplit. The bottom stack still builds upward from there, so the source pushes the
  // caveat up by exactly its own height. See map-beat/assets/Co2MapStill.tsx, which this is copied
  // from.
  const sourceBottom = bottom;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;
  const caveatBottom =
    sourceTop - T.SOURCE.fontSize - sp(BASE.CAVEAT_TO_SOURCE);
  const caveatTop = caveatBottom - (caveatLines.length - 1) * T.NOTE.lead;
  // The two halves that can meet are the HEADER (title + legend) and the top of the bottom stack.
  if (caveatTop - T.NOTE.fontSize - sp(BASE.LEGEND_TO_CAVEAT) < legendBottom)
    throw new Error(
      `the column does not fit at ${size}: the header ends at ${legendBottom}, the caveat starts at ${caveatTop}.`,
    );

  const scale = MAP / geometry.frame.width;

  // Markers first, in the DRAWN (scaled) frame: two organisations whose real-world coordinates are
  // only metres apart can land on the identical pixel at this scale, and an unadjusted draw lets
  // whichever is painted last silently replace the other's colour under a label that still names
  // the first (see `separateOverlappingMarkers`'s own doc-comment). Every later step — the label
  // declutter and the drawn circles both — reads these adjusted positions, never the raw `px`/`py`.
  const separated = separateOverlappingMarkers(
    geometry.points.map((p) => ({
      ...p,
      cx: p.px * scale,
      cy: p.py * scale,
    })),
    MARKER_R * 2 + sp(BASE.SEPARATION_AIR),
  );

  // Declutter: a label's box, in the DRAWN (scaled) frame, so the decision is made at the size a
  // reader actually sees it, not the bake's own pixel space. The side is edge-aware FIRST (computed
  // from the marker's own drawn position against the plate's edge), so the box the declutter tests
  // is the box that will actually be drawn — a locator's accessibility trap is exactly a label that
  // doesn't collide with a neighbour but still runs off the canvas.
  //
  // ── FOUR PLACEMENTS, TRIED IN ORDER, AND THE FIRST THAT IS BOTH WHOLE AND CLEAR WINS ────────
  //
  // The 1920x1080 render is what forced this, in two steps, and both steps are worth keeping
  // because the second one is the trap.
  //
  // FIRST: `labelSide`'s default margin is a typed 170 px, tuned against a 496 px plate. At a 910 px
  // plate the World Economic Forum kept its right-hand label and the plate's own clip cut it to
  // "World Economic". Every counter was green — the label was SHOWN, so the `mustLabel` guard
  // passed, and nothing in this beat measured whether a shown label is WHOLE. What a label needs on
  // its right is its own width plus its own gap, so that is what is passed, and no constant decides
  // it. `proof/mapgen-locator-web/LocatorWeb.tsx` closed exactly this finding the same way.
  //
  // SECOND, and this is the one only looking catches: flipping that label left made it whole and
  // laid its 3 px halo across the tops of two OTHER markers — the Aga Khan Development Network's
  // green and an orange neighbour, both visibly bitten in the render. A left/right model has
  // nowhere else to go, so it trades a clipped label for an occluded mark and reports success.
  //
  // So the model is the web sibling's: a small ladder of candidate boxes, and the first that stays
  // on the plate AND touches no other marker wins. Above and below anchor the label's END at the
  // marker's own x when centring it would leave the plate, so a name near an edge still points at
  // its own point. If none of the four is clear, the beat keeps the least-bad one — the declutter
  // and `mustLabel` above it are what decide whether it is drawn at all.
  const LABEL_GAP = sp(BASE.LABEL_GAP);
  const labelBoxWidth = (name: string) =>
    measureText(name, T.LABEL) + sp(BASE.LABEL_BOX_AIR);
  const labelHeight = T.LABEL.fontSize + sp(BASE.LABEL_BOX_PAD);
  type Placement = {
    side: "right" | "left" | "above" | "below";
    x: number;
    y: number;
    anchor: "start" | "end" | "middle";
    baseline: number;
    box: { x: number; y: number; width: number; height: number };
  };
  const placementsFor = (p: {
    cx: number;
    cy: number;
    name: string;
  }): Placement[] => {
    const w = labelBoxWidth(p.name);
    const midY = p.cy - T.LABEL.fontSize / 2 - sp(2);
    // Centred over the marker where the plate allows it, end-anchored at the marker where it does
    // not — the same "derive a position, never shrink the type" move the ladder is built on.
    const centred = Math.min(Math.max(p.cx - w / 2, 0), MAP - w);
    const overAnchor = centred + w / 2;
    return [
      {
        side: "right",
        x: p.cx + MARKER_R + LABEL_GAP,
        y: p.cy + sp(BASE.LABEL_BASELINE_NUDGE),
        anchor: "start",
        baseline: 0,
        box: {
          x: p.cx + MARKER_R + LABEL_GAP,
          y: midY,
          width: w,
          height: labelHeight,
        },
      },
      {
        side: "left",
        x: p.cx - MARKER_R - LABEL_GAP,
        y: p.cy + sp(BASE.LABEL_BASELINE_NUDGE),
        anchor: "end",
        baseline: 0,
        box: {
          x: p.cx - MARKER_R - LABEL_GAP - w,
          y: midY,
          width: w,
          height: labelHeight,
        },
      },
      {
        side: "above",
        x: overAnchor,
        y: p.cy - MARKER_R - LABEL_GAP - sp(2),
        anchor: "middle",
        baseline: 0,
        box: {
          x: centred,
          y: p.cy - MARKER_R - LABEL_GAP - labelHeight,
          width: w,
          height: labelHeight,
        },
      },
      {
        side: "below",
        x: overAnchor,
        y: p.cy + MARKER_R + LABEL_GAP + T.LABEL.fontSize,
        anchor: "middle",
        baseline: 0,
        box: {
          x: centred,
          y: p.cy + MARKER_R + LABEL_GAP,
          width: w,
          height: labelHeight,
        },
      },
    ];
  };
  const onPlate = (b: Placement["box"]) =>
    b.x >= 0 && b.y >= 0 && b.x + b.width <= MAP && b.y + b.height <= MAP_H;
  /** The halo is drawn OUTSIDE the glyphs, so a box that merely abuts a marker still bites it. */
  const markerClear = MARKER_R + sp(BASE.LABEL_HALO);
  const clearsMarkers = (b: Placement["box"], self: string) =>
    separated.every(
      (o) =>
        o.key === self ||
        o.cx + markerClear <= b.x ||
        o.cx - markerClear >= b.x + b.width ||
        o.cy + markerClear <= b.y ||
        o.cy - markerClear >= b.y + b.height,
    );
  const placement = new Map<string, Placement>();
  for (const p of separated) {
    const found = placementsFor(p).find(
      (o) => onPlate(o.box) && clearsMarkers(o.box, p.key),
    );
    if (found) placement.set(p.key, found);
  }
  // A LABEL WITH NO CLEAR PLACEMENT IS NOT DRAWN, rather than drawn in the least-bad one. The
  // first version of this ladder fell back to "whichever candidate stays on the plate", and the
  // render showed what that means: the World Intellectual Property Organization sits in the middle
  // of the cluster, all four of its boxes cross a neighbouring marker, and the fallback put its
  // 500 px name straight across two of them. A locator's own type sheet says the lever for
  // importance is the declared priority, and "we could not place this one clearly" is exactly the
  // case the declutter exists for — so it joins the labels the declutter drops, and `mustLabel`
  // above is what makes the drop loud when the words depend on it.
  const placeable = separated.filter((p) => placement.has(p.key));
  const shown = declutterLabels(placeable, (p) => placement.get(p.key)!.box);

  // The words and the picture must agree. A beat whose caveat and alt single out one organisation
  // by name, over a frame where the declutter has silently dropped that organisation's own label,
  // sends a reader looking for something that is not drawn — which is exactly what this beat
  // shipped until now. Failing loudly is the only way that stays fixed.
  const missing = mustLabel.filter((key) => !shown.has(key));
  if (missing.length > 0) {
    const named = missing
      .map((key) => separated.find((p) => p.key === key)?.name ?? key)
      .join(", ");
    throw new Error(
      `at ${size} the furniture names ${named}, but the label declutter dropped ${missing.length === 1 ? "it" : "them"}. ` +
        `A ${MAP}px plate at a ${T.LABEL.fontSize}px label leaves no room for it. ` +
        "Raise the priority, shorten the label, or ship a size where the plate is bigger.",
    );
  }

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
        {separated.map((point) => {
          const cx = point.cx;
          const cy = point.cy;
          const colour = categoryColour[point.category] ?? muted;
          // The SAME placement the declutter measured. Two independent derivations of "where does
          // this label go" is how a beat ends up testing one box and drawing another.
          const at = placement.get(point.key);
          return (
            <Fragment key={point.key}>
              <circle
                cx={cx}
                cy={cy}
                r={MARKER_R}
                fill={colour}
                stroke={ground}
                strokeWidth={sp(BASE.MARKER_STROKE)}
              />
              {at && shown.has(point.key) && (
                <>
                  <text
                    x={at.x}
                    y={at.y}
                    textAnchor={at.anchor}
                    fontSize={T.LABEL.fontSize}
                    fontWeight={T.LABEL.fontWeight}
                    stroke={ground}
                    strokeWidth={sp(BASE.LABEL_HALO)}
                    strokeLinejoin="round"
                    fill="none"
                  >
                    {point.name}
                  </text>
                  <text
                    x={at.x}
                    y={at.y}
                    textAnchor={at.anchor}
                    fontSize={T.LABEL.fontSize}
                    fontWeight={T.LABEL.fontWeight}
                    fill={ink}
                  >
                    {point.name}
                  </text>
                </>
              )}
            </Fragment>
          );
        })}
      </g>

      {/* ── The column ──────────────────────────────────────────────────────────────────── */}
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
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={sourceTop + i * T.SOURCE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {legendLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={legendTop + i * (T.CAPTION.fontSize + sp(BASE.CAPTION_LEAD))}
          fill={muted}
          fontSize={T.CAPTION.fontSize}
          fontWeight={T.CAPTION.fontWeight}
        >
          {line}
        </text>
      ))}
      {CATEGORY_ORDER.map((category, i) => {
        const y =
          legendTop +
          legendLines.length * (T.CAPTION.fontSize + sp(BASE.CAPTION_LEAD)) +
          sp(BASE.LEGEND_TOP_AIR) +
          i * sp(BASE.LEGEND_ROW);
        return (
          <Fragment key={category}>
            <circle
              cx={COLUMN.x + sp(BASE.LEGEND_SWATCH_X)}
              cy={y - sp(BASE.LABEL_GAP)}
              r={MARKER_R}
              fill={categoryColour[category]}
              stroke={ground}
              strokeWidth={sp(1)}
            />
            <text
              x={COLUMN.x + sp(BASE.LEGEND_TEXT_X)}
              y={y}
              fill={muted}
              fontSize={T.LEGEND_LABEL.fontSize}
            >
              {category}
            </text>
          </Fragment>
        );
      })}

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
function apartCount(caveat: string): string {
  const sentence = caveat.split(";").pop()?.trim() ?? caveat;
  return sentence.length > 90 ? `${sentence.slice(0, 87)}…` : sentence;
}
