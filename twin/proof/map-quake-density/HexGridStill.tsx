/**
 * The static genre of "Where 2024's earthquakes clustered" — 900 × 560, one frame, no order. A
 * HEX-GRID beat: raw epicentres binned into a regular tessellation so the eye reads density instead
 * of an unreadable smear of 14,000 overlapping dots. See
 * `map-beat/references/types/hex-grid.md`.
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
/** The one sentence the ringed cell is allowed to spend on the plate. Bold, because it has to hold
 *  its own against a shaded grid, and small, because the plate is the argument and this is a
 *  caption on it. */
const SUBJECT_NOTE = { fontSize: 13, fontWeight: 700 };
/** The air between the ringed hexagon and its own words. */
const SUBJECT_NOTE_GAP = 10;
/**
 * Helvetica's cap height, 717/1000 em, from Adobe's own AFM for the face this beat draws in (Arial,
 * the substitute, is 716). It centres a line of type on a point rather than hanging it from its
 * baseline. `dominant-baseline` is not used because resvg and Chrome do not agree on it and this
 * project draws the same beats in both.
 */
const CAP_HEIGHT_EM = 0.717;

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
  /** What the emphasised cell IS. See `subjectNote`'s use below: the ring is a promise. */
  subjectNote: string;
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
const SOURCE_GAP = 12; // and between the caveat block and the credit at the frame's foot

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
  source,
  basemapCredit,
}: {
  plateHeight: number;
  caveat: string;
  source: string;
  basemapCredit: string;
}): number {
  const caveatLines = wrap(caveat, FRAME_WIDTH - PAD * 2, NOTE).length;
  // The SOURCE joined the bottom stack when the credit moved to the frame's own bottom margin, so
  // the frame's height has to account for it — this beat derives its height from what it contains
  // rather than pinning one, and the credit is now one of the things it contains. Leaving it out
  // is what made the beat's own fit guard throw: the stack had grown and the frame had not.
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME_WIDTH - PAD * 2,
    SOURCE,
  ).length;
  return (
    MAP_Y +
    plateHeight +
    LEGEND_GAP +
    LEGEND_SWATCH +
    CAVEAT_GAP +
    NOTE.fontSize +
    (caveatLines - 1) * NOTE.lead +
    SOURCE_GAP +
    SOURCE.fontSize +
    (sourceLines - 1) * SOURCE.lead +
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
  subjectNote,
}: HexGridStillProps) {
  const FRAME = {
    width: FRAME_WIDTH,
    height: stillFrameHeight({
      plateHeight: geometry.frame.height,
      caveat,
      source,
      basemapCredit,
    }),
  };
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
  const caveatBottom = sourceTop - SOURCE.fontSize - SOURCE_GAP;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;

  const subject = cells.find((c) => c.key === subjectKey);
  if (!subject) throw new Error(`no cell for the subject ${subjectKey}`);

  // EMPHASIS IS A PROMISE, AND THIS IS WHERE IT IS KEPT (B6.16).
  //
  // The ring below spends this beat's one accent on a single hexagon out of 150. Before this, the
  // plate said nothing at all about which cell that was or why — its facts ("1,724 events",
  // "Fiji", "Tonga") reached only `<desc>`, so a screen-reader user was told and a sighted reader
  // was left with an orange outline and a question. The owner read it as odd, and it is: the rule
  // was already WRITTEN and already applied in a sibling of this very family
  // (`mapscrolly-quakes-three-ways/MapFrames.tsx`, "the cells the prose names are RINGED in the
  // accent") and it never travelled to the beat that has no prose to lean on.
  //
  // So the note is required, and it is required to CARRY THE CELL'S OWN NUMBER — a sentence that
  // did not would be a caption drifting away from the mark the moment the data moved.
  const subjectCount = subject.count.toLocaleString();
  if (!subjectNote.trim())
    throw new Error(
      `cell ${subjectKey} is ringed in the accent and nothing is said about it — a mark emphasised ` +
        `without a word on the plate is the reader's question with no answer (its own facts are in ` +
        `<desc>, which a sighted reader never sees). Pass subjectNote.`,
    );
  if (!subjectNote.includes(subjectCount))
    throw new Error(
      `the ringed cell holds ${subjectCount} events and its note does not say so: ${JSON.stringify(subjectNote)}. ` +
        `A caption on an emphasised mark states that mark's own number, or it is decoration.`,
    );

  const MAP = {
    x: MAP_X,
    y: MAP_Y,
    width: geometry.frame.width,
    height: geometry.frame.height,
  };

  // Which side of the ringed hexagon the note stands on — measured against the plate, never typed.
  // The plate is clipped, so a note that ran off its right edge would simply be cut in half.
  const subjectNoteWidth = measureText(subjectNote, SUBJECT_NOTE);
  const subjectNoteRightEdge =
    subject.cx + hexSize + SUBJECT_NOTE_GAP + subjectNoteWidth;
  const noteFitsRight = subjectNoteRightEdge <= MAP.width - 4;
  const subjectNoteAnchor = noteFitsRight ? "start" : "end";
  const subjectNoteX = noteFitsRight
    ? subject.cx + hexSize + SUBJECT_NOTE_GAP
    : subject.cx - hexSize - SUBJECT_NOTE_GAP;
  if (!noteFitsRight && subjectNoteX - subjectNoteWidth < 4)
    throw new Error(
      `the ringed cell's note ("${subjectNote}", ${subjectNoteWidth.toFixed(0)}px) does not fit on ` +
        `either side of it inside an ${MAP.width}px plate — the cell sits at x=${subject.cx.toFixed(0)}. ` +
        `Shorten the note or rebake a wider plate; it must not be clipped.`,
    );

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

        {/* The ringed cell's own words, on the plate, beside the mark they belong to.
            SIDE IS DERIVED, not typed: the note goes right of the hexagon when the plate has room
            for it there and left when it does not, measured against the plate's own width in the
            font it is really drawn in. It is vertically centred on the cell (baseline lifted half
            a cap height), and it is drawn twice — a ground-coloured halo, then the ink — because
            the thing underneath is a raster basemap whose colour nothing in this tree can measure,
            and a halo is this corpus's own answer to that (see
            `annotation-reads-over-what-it-crosses.test.ts`, which exempts a haloed label from its
            strike check for the same reason). */}
        <g
          transform={`translate(${subjectNoteX},${subject.cy + (SUBJECT_NOTE.fontSize * CAP_HEIGHT_EM) / 2})`}
        >
          <text
            textAnchor={subjectNoteAnchor}
            fontSize={SUBJECT_NOTE.fontSize}
            fontWeight={SUBJECT_NOTE.fontWeight}
            stroke={ground}
            strokeWidth={4}
            strokeLinejoin="round"
            fill="none"
          >
            {subjectNote}
          </text>
          <text
            textAnchor={subjectNoteAnchor}
            fontSize={SUBJECT_NOTE.fontSize}
            fontWeight={SUBJECT_NOTE.fontWeight}
            fill={ink}
          >
            {subjectNote}
          </text>
        </g>
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
