/**
 * "The Danube touches ten countries on its way to the Black Sea, nine of them shown here" — the
 * STILL genre (rung 1) of
 * THIS beat, whose main event is the VIDEO. Rendered and looked at first, per this project's own
 * "look at the still before spending a video render" discipline — same claim, same camera, same
 * map box (940 × 420, see `bake-plate.mjs`) as `FlowMapVideo.tsx` will draw, one frame, no order.
 *
 * A physical copy of `proof/mapmore-flow-danube/FlowMapStill.tsx`'s general shape (map + numbered
 * legend chips wrapped to as many rows as needed, throws if the column doesn't fit) — not an
 * import, and not byte-identical, because this beat's frame is its own (1080 × 900, built around
 * the 940 × 420 plate this beat's own bake produces, per `geo-discipline.md` rule 12).
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "./render-still.mjs";
import {
  TERRITORY_FILL_OPACITY,
  compositeOverLand,
  numeralInk,
} from "./geo-flow.ts";

const FRAME = { width: 1080, height: 900 };
const PAD = 40;
const MAP_X = 70;
const MAP_Y = 205;

const TITLE = { fontSize: 23, fontWeight: 700, lead: 29 };
const SOURCE = { fontSize: 13.5, fontWeight: 400, lead: 17 };
const CAPTION = { fontSize: 13, fontWeight: 600 };
const NOTE = { fontSize: 12.5, fontWeight: 400, lead: 16 };
const LEGEND_LABEL = { fontSize: 13, fontWeight: 400 };

export type CrossingDrawn = {
  key: string;
  name: string;
  colour: string;
  order: number; // 1-based
  rings: [number, number][][];
  anchor: [number, number];
};

export type FlowMapStillProps = {
  geometry: { frame: { width: number; height: number } };
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

function ringPath(rings: [number, number][][]): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        "M" +
        ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") +
        "Z",
    )
    .join("");
}

function routePath(route: [number, number][]): string {
  if (route.length < 2) return "";
  return (
    "M" + route.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")
  );
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
}: FlowMapStillProps) {
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
  // with it, unsplit. It used to hang directly under the title. This column is laid out from BOTH
  // ends, so the source joining the bottom half pushes the whole bottom stack up by exactly the
  // source block's own height; the plate is a fixed square and does not move. See
  // map-beat/assets/Co2MapStill.tsx, which this is copied from.
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  const caveatBottom = sourceTop - SOURCE.fontSize - 12;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;

  const MAP = {
    x: MAP_X,
    y: MAP_Y,
    width: geometry.frame.width,
    height: geometry.frame.height,
  };


  // The legend: one numbered chip per territory, wrapped left to right, as many rows as it takes —
  // measured, never assumed to fit one row, because nine territory names is more than a small
  // legend carries.
  const chipGap = 18;
  const rowHeight = 24;
  const legendY = MAP.y + MAP.height + 34;
  type Chip = { crossing: CrossingDrawn; width: number };
  const chips: Chip[] = crossings.map((c) => {
    const label = `${c.order}. ${c.name}`;
    return { crossing: c, width: 18 + 6 + measureText(label, LEGEND_LABEL) };
  });
  const rows: Chip[][] = [];
  let row: Chip[] = [];
  let rowWidth = 0;
  const maxRowWidth = FRAME.width - PAD * 2;
  for (const chip of chips) {
    if (row.length > 0 && rowWidth + chipGap + chip.width > maxRowWidth) {
      rows.push(row);
      row = [];
      rowWidth = 0;
    }
    if (row.length > 0) rowWidth += chipGap;
    row.push(chip);
    rowWidth += chip.width;
  }
  if (row.length > 0) rows.push(row);

  const legendBottom = legendY + 16 + rows.length * rowHeight;
  if (legendBottom > caveatTop - NOTE.fontSize - 14)
    throw new Error(
      `the column does not fit: the legend (${rows.length} rows, ending at ${legendBottom}) collides with the caveat starting at ${caveatTop}. Widen the frame or shorten the caveat.`,
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
        <clipPath id="flow-plate-clip">
          <rect x={0} y={0} width={MAP.width} height={MAP.height} />
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

      {/* ── The map ─────────────────────────────────────────────────────────────────────── */}
      <g
        transform={`translate(${MAP.x},${MAP.y})`}
        clipPath="url(#flow-plate-clip)"
      >
        <image href={plate} x={0} y={0} width={MAP.width} height={MAP.height} />

        {/* Each crossed territory: filled and outlined in its own cycling qualitative colour —
            computed, not hand-picked (see geo-flow.ts territoriesCrossed). */}
        {crossings.map((c) => (
          <path
            key={c.key}
            d={ringPath(c.rings)}
            fill={c.colour}
            fillOpacity={TERRITORY_FILL_OPACITY}
            stroke={c.colour}
            strokeWidth={1.4}
          />
        ))}

        {/* The route's own line: a `ground`-coloured halo first (legible over both fills and the
            water tint), then ONE accent colour on top — basemap-aware (Okabe-Ito orange reads on
            the light basemap, the light-blue water tint and every territory fill alike). */}
        <path
          d={routePath(route)}
          fill="none"
          stroke={ground}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
        <path
          d={routePath(route)}
          fill="none"
          stroke={accent}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Numbered badges, one per territory, anchored near where the route actually runs through
            it (geo-flow.ts pointOnFeature + routeBBoxWithin) — never a plain, possibly off-frame
            national centroid. */}
        {crossings.map((c) => (
          <g key={`badge-${c.key}`}>
            <circle
              cx={c.anchor[0]}
              cy={c.anchor[1]}
              r={11}
              fill={c.colour}
              stroke={ground}
              strokeWidth={2}
            />
            <text
              x={c.anchor[0]}
              y={c.anchor[1] + 4}
              fill={numeralInk(c.colour)}
              fontSize={12}
              fontWeight={700}
              textAnchor="middle"
            >
              {c.order}
            </text>
          </g>
        ))}
      </g>

      {/* ── The legend ──────────────────────────────────────────────────────────────────── */}
      <text
        x={PAD}
        y={legendY}
        fill={muted}
        fontSize={CAPTION.fontSize}
        fontWeight={CAPTION.fontWeight}
      >
        Territories crossed, in order —
      </text>
      {rows.map((r, ri) => {
        let x = PAD;
        const y = legendY + 16 + ri * rowHeight + 14;
        return (
          <Fragment key={ri}>
            {r.map((chip) => {
              const node = (
                <Fragment key={chip.crossing.key}>
                  <circle
                    cx={x + 8}
                    cy={y - 4}
                    r={8}
                    fill={compositeOverLand(chip.crossing.colour)}
                    stroke={chip.crossing.colour}
                    strokeWidth={1.6}
                  />
                  <text
                    x={x + 8}
                    y={y - 1}
                    fill={numeralInk(compositeOverLand(chip.crossing.colour))}
                    fontSize={9}
                    fontWeight={700}
                    textAnchor="middle"
                  >
                    {chip.crossing.order}
                  </text>
                  <text
                    x={x + 20}
                    y={y}
                    fill={muted}
                    fontSize={LEGEND_LABEL.fontSize}
                  >
                    {chip.crossing.name}
                  </text>
                </Fragment>
              );
              x += chip.width + chipGap;
              return node;
            })}
          </Fragment>
        );
      })}

      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
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
