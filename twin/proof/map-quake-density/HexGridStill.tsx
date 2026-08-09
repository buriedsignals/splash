/**
 * The static genre of "Where 2024's earthquakes clustered" — 900 × 560, one frame, no order. A
 * HEX-GRID beat: raw epicentres binned into a regular tessellation so the eye reads density instead
 * of an unreadable smear of 14,000 overlapping dots. See
 * `twin-map-beat/references/types/hex-grid.md`.
 */

import { Fragment } from "react";
import { FONT_FAMILY, measureText } from "./render-still.mjs";
import { binIndexUpperInclusive, hexCorners, type HexCell } from "./geo-hex";

const FRAME_WIDTH = 900;
const PAD = 32;
/** x, y are a layout choice; width/height are NOT — they come from `geometry.frame` below, the
 *  exact size the plate was baked at, so the hex cells (baked in that same pixel space) never need
 *  a scale transform that would also squash the hexagons into ellipses. A still that bakes one size
 *  and draws the plate into another box is the bug this beat's own first render caught. */
const MAP_X = 32;
const MAP_Y = 118;

const TITLE = { fontSize: 20, fontWeight: 700, lead: 26 };
const SOURCE = { fontSize: 13, fontWeight: 400, lead: 17 };
const CAPTION = { fontSize: 12, fontWeight: 600 };
const NOTE = { fontSize: 11.5, fontWeight: 400, lead: 15 };
const LEGEND_LABEL = { fontSize: 11, fontWeight: 400 };

export type HexGridStillProps = {
  geometry: { frame: { width: number; height: number } };
  plate: string;
  cells: HexCell[];
  hexSize: number;
  breaks: number[];
  ramp: string[];
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

const LEGEND_SWATCH = 16;
const LEGEND_GAP = 30; // clear air between the map's bottom edge and the legend
const CAVEAT_GAP = 26; // and between the legend and the caveat block

/**
 * How tall the frame must be for THIS plate and THIS caveat. The plate is drawn 1:1 — never scaled,
 * or the hexagons would become ellipses — so the frame follows the plate, not the other way round.
 * Called by the render before it rasterises, so the SVG it asks for and the SVG this component
 * draws are the same size. The plate grew from 300 px to 480 px tall when the bake was corrected
 * (a 300 px-tall world map could not hold 60°S–78°N without either repeating the continents or
 * cropping the study area), and a fixed 560 px frame would have clipped the legend off the bottom.
 */
export function stillFrameHeight({
  plateHeight,
  caveat,
}: {
  plateHeight: number;
  caveat: string;
}): number {
  const caveatLines = wrap(caveat, FRAME_WIDTH - PAD * 2, NOTE).length;
  return (
    MAP_Y +
    plateHeight +
    LEGEND_GAP +
    LEGEND_SWATCH +
    CAVEAT_GAP +
    NOTE.fontSize +
    (caveatLines - 1) * NOTE.lead +
    PAD
  );
}

function classLabel(index: number, breaks: number[]): string {
  const lower = index === 0 ? 1 : breaks[index - 1]! + 1;
  const upper = index === breaks.length ? null : breaks[index];
  return upper === null
    ? `${lower}+`
    : lower === upper
      ? `${lower}`
      : `${lower}–${upper}`;
}

export function HexGridStill({
  geometry,
  plate,
  cells,
  hexSize,
  breaks,
  ramp,
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
}: HexGridStillProps) {
  const FRAME = {
    width: FRAME_WIDTH,
    height: stillFrameHeight({ plateHeight: geometry.frame.height, caveat }),
  };
  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME.width - PAD * 2,
    SOURCE,
  );
  const caveatLines = wrap(caveat, FRAME.width - PAD * 2, NOTE);

  const titleTop = PAD + TITLE.fontSize;
  const sourceTop = titleTop + (titleLines.length - 1) * TITLE.lead + 26;
  const caveatTop = FRAME.height - PAD - (caveatLines.length - 1) * NOTE.lead;

  const subject = cells.find((c) => c.key === subjectKey);
  if (!subject) throw new Error(`no cell for the subject ${subjectKey}`);

  const MAP = {
    x: MAP_X,
    y: MAP_Y,
    width: geometry.frame.width,
    height: geometry.frame.height,
  };

  const legendSwatch = LEGEND_SWATCH;
  // At least one clear line of air below the map, never computed backwards from the caveat only —
  // the mismatched-scale bug this beat's first render caught was exactly this kind of box drawn
  // without checking it against its neighbour.
  const legendY = Math.max(
    MAP.y + MAP.height + LEGEND_GAP,
    caveatTop - NOTE.fontSize - 40,
  );
  if (legendY + legendSwatch + 20 > caveatTop - NOTE.fontSize)
    throw new Error(
      `the column does not fit: the map bottom (${MAP.y + MAP.height}) leaves no room for the legend before the caveat at ${caveatTop}. Rebake a shorter plate.`,
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
      <g transform={`translate(${MAP.x},${MAP.y})`} clipPath="url(#plate-clip)">
        <image href={plate} x={0} y={0} width={MAP.width} height={MAP.height} />
        {cells.map((cell) => {
          const isSubject = cell.key === subjectKey;
          const fill = ramp[binIndexUpperInclusive(cell.count, breaks)]!;
          const corners = hexCorners(cell.cx, cell.cy, hexSize * 0.97);
          const d = `M${corners.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
          return (
            <path
              key={cell.key}
              d={d}
              fill={fill}
              stroke={isSubject ? accent : ground}
              strokeWidth={isSubject ? 2 : 0.6}
            />
          );
        })}
      </g>

      {/* ── The legend: a horizontal row of swatches, each with its own printed count range ── */}
      <text
        x={PAD}
        y={legendY}
        fill={muted}
        fontSize={CAPTION.fontSize}
        fontWeight={CAPTION.fontWeight}
      >
        {legendCaption}
      </text>
      {(() => {
        let x = PAD;
        const y = legendY + 16;
        return ramp.map((shade, i) => {
          const label = classLabel(i, breaks);
          const labelWidth = measureText(label, LEGEND_LABEL);
          const node = (
            <Fragment key={shade}>
              <rect
                x={x}
                y={y}
                width={legendSwatch}
                height={legendSwatch}
                fill={shade}
                stroke={muted}
                strokeWidth={0.5}
              />
              <text
                x={x + legendSwatch + 4}
                y={y + legendSwatch - 4}
                fill={muted}
                fontSize={LEGEND_LABEL.fontSize}
              >
                {label}
              </text>
            </Fragment>
          );
          x += legendSwatch + 4 + labelWidth + 22;
          return node;
        });
      })()}

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
