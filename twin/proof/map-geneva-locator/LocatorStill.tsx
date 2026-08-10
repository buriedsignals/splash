/**
 * The static genre of "Geneva's international quarter" — 900 × 560, one frame, no order. A
 * LOCATOR beat: position and category only, no magnitude, no rate, no gradient. See
 * `map-beat/references/types/locator.md`.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "./render-still.mjs";
import {
  CATEGORY_ORDER,
  declutterLabels,
  labelSide,
  separateOverlappingMarkers,
  type OrgRow,
} from "./geo-locator";

const FRAME = { width: 900, height: 560 };
const PAD = 32;
const GUTTER = 32;
const MAP = FRAME.height - PAD * 2;
const MAP_X = FRAME.width - PAD - MAP;
const COLUMN = { x: PAD, width: MAP_X - GUTTER - PAD };
const MARKER_R = 5;

const TITLE = { fontSize: 20, fontWeight: 700, lead: 26 };
const SOURCE = { fontSize: 13, fontWeight: 400, lead: 17 };
const CAPTION = { fontSize: 12, fontWeight: 600 };
const NOTE = { fontSize: 11.5, fontWeight: 400, lead: 15 };
const LABEL = { fontSize: 11, fontWeight: 600 };
const LEGEND_LABEL = { fontSize: 11.5, fontWeight: 400 };


export type LocatorStillProps = {
  geometry: {
    frame: { width: number; height: number };
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
}: LocatorStillProps) {
  const scale = MAP / geometry.frame.width;

  const titleLines = wrap(title, COLUMN.width, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    COLUMN.width,
    SOURCE,
  );
  const caveatLines = wrap(caveat, COLUMN.width, NOTE);
  const legendLines = wrap(legendCaption, COLUMN.width, CAPTION);

  const titleTop = PAD + TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * TITLE.lead;
  // THE SOURCE IS THE LAST LINE BEFORE THE BOTTOM MARGIN — the credit sits at the bottom of the
  // visual, the same place on every graphic this project ships, and it carries the basemap credit
  // with it, unsplit. It used to hang directly under the title. This column is laid out from BOTH
  // ends, so the source joining the bottom half pushes the whole bottom stack up by exactly the
  // source block's own height; the plate is a fixed square and does not move. See
  // map-beat/assets/Co2MapStill.tsx, which this is copied from.
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  const caveatBottom = sourceTop - SOURCE.fontSize - 12;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;
  const legendTop = caveatTop - NOTE.fontSize - 34 - CATEGORY_ORDER.length * 22;
  // RE-POINTED when the source moved to the bottom. It used to compare the legend against
  // `sourceBottom`; with the source down at the frame's floor that comparison is either always
  // true or always false, which is a guard that cannot go red. The two halves that can now meet
  // are the TITLE block and the top of the bottom stack.
  if (legendTop - 16 < titleBottom)
    throw new Error(
      `the column does not fit: the title ends at ${titleBottom}, the legend starts at ${legendTop}.`,
    );

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
    MARKER_R * 2 + 4,
  );

  // Declutter: a label's box, in the DRAWN (scaled) frame, so the decision is made at the size a
  // reader actually sees it, not the bake's own pixel space. The side is edge-aware FIRST (computed
  // from the marker's own drawn position against the plate's edge), so the box the declutter tests
  // is the box that will actually be drawn — a locator's accessibility trap is exactly a label that
  // doesn't collide with a neighbour but still runs off the canvas.
  const shown = declutterLabels(separated, (p) => {
    const side = labelSide(p.cx, MAP);
    const w = measureText(p.name, LABEL) + 10;
    return {
      x: side === "right" ? p.cx + MARKER_R + 4 : p.cx - MARKER_R - 4 - w,
      y: p.cy - LABEL.fontSize / 2 - 2,
      width: w,
      height: LABEL.fontSize + 4,
    };
  });

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
      `the furniture names ${named}, but the label declutter dropped ${missing.length === 1 ? "it" : "them"}. ` +
        "Raise the priority, shorten the label, or stop naming it in the words.",
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

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g transform={`translate(${MAP_X},${PAD})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={MAP} height={MAP} />
        {separated.map((point) => {
          const cx = point.cx;
          const cy = point.cy;
          const colour = categoryColour[point.category] ?? muted;
          const side = labelSide(cx, MAP);
          const labelX =
            side === "right" ? cx + MARKER_R + 4 : cx - MARKER_R - 4;
          const anchor = side === "right" ? "start" : "end";
          return (
            <Fragment key={point.key}>
              <circle
                cx={cx}
                cy={cy}
                r={MARKER_R}
                fill={colour}
                stroke={ground}
                strokeWidth={1.4}
              />
              {shown.has(point.key) && (
                <>
                  <text
                    x={labelX}
                    y={cy + 4}
                    textAnchor={anchor}
                    fontSize={LABEL.fontSize}
                    fontWeight={LABEL.fontWeight}
                    stroke={ground}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    fill="none"
                  >
                    {point.name}
                  </text>
                  <text
                    x={labelX}
                    y={cy + 4}
                    textAnchor={anchor}
                    fontSize={LABEL.fontSize}
                    fontWeight={LABEL.fontWeight}
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

      {legendLines.map((line, i) => (
        <text
          key={line}
          x={COLUMN.x}
          y={legendTop + i * (CAPTION.fontSize + 4)}
          fill={muted}
          fontSize={CAPTION.fontSize}
          fontWeight={CAPTION.fontWeight}
        >
          {line}
        </text>
      ))}
      {CATEGORY_ORDER.map((category, i) => {
        const y =
          legendTop + legendLines.length * (CAPTION.fontSize + 4) + 10 + i * 22;
        return (
          <Fragment key={category}>
            <circle
              cx={COLUMN.x + 6}
              cy={y - 4}
              r={MARKER_R}
              fill={categoryColour[category]}
              stroke={ground}
              strokeWidth={1}
            />
            <text
              x={COLUMN.x + 20}
              y={y}
              fill={muted}
              fontSize={LEGEND_LABEL.fontSize}
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
