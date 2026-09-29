/**
 * The video format of "the Ring of Fire is redrawn every month" — 12.67s, 30fps, 1080 × 1080.
 *
 * Same plate, same binning and the same class scale as the static sibling (`proof/map-quake-
 * density`). What this file adds is the one thing a still cannot have and the ONLY reason this beat
 * exists as a video: a CLOCK. A hexagon holding 1,720 events delivered in a single afternoon and a
 * hexagon holding 1,720 events delivered across a whole year are the same shade of grey on a static
 * map — indistinguishable, forever. Playing the year apart is the measurement.
 *
 * Every window below derives from `timing.ts`; there is no frame literal in this file, and no
 * colour literal either — ground, accent, ink, muted and the whole ramp arrive as props, derived in
 * node from the beat's own `PALETTE.md`.
 *
 * WHAT A CELL'S ABSENCE MEANS HERE, and why that is safe. A hexagon that has not appeared yet is
 * one whose first magnitude-4 event has not been catalogued yet — never "no earthquakes here".
 * Three things carry that: the date readout on the map, which is on screen through every frame of
 * the reveal; the running count beside it; and the caveat, which says it in words. This is a
 * different situation from the choropleth sibling's, where every region has a value from the first
 * frame and a missing fill would misstate a real number — here the quantity itself is genuinely
 * zero until the day it is not, so drawing nothing is the honest state and not a placeholder.
 */

import { Fragment } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { hexCorners } from "./geo-hex";
import { HEXGRID_TIMING, progressOf, type BeatTiming } from "./timing";

const FRAME = { width: 1080, height: 1080 };
const PAD = 70;
const MAP = { width: 940, height: 540 };
/** The plate's top edge. It came DOWN by 62px when the credit left the header for the frame's
 *  bottom margin: the header gave back the row the source used to occupy, and the bottom stack
 *  needed that room to hold the credit as well as the caveat. 62 rather than the family's 50
 *  because this beat's guard was still three pixels short at 50, and said so. The same move the seed made
 *  (map-beat/assets/Co2MapVideo.tsx, MAP_Y 300 -> 250), for the same reason, and the beat's
 *  own fit guard is what said so — it threw, by name, with the numbers in the message. */
const MAP_Y = 178;

const TITLE = { fontSize: 34, fontWeight: 700, lead: 43 };
const SOURCE = { fontSize: 18, fontWeight: 400, lead: 23 };
const CAPTION = { fontSize: 18, fontWeight: 600 };
const TICK = { fontSize: 16, fontWeight: 400 };
const NOTE = { fontSize: 17, fontWeight: 400, lead: 22 };
const CONCLUSION = { fontSize: 26, fontWeight: 700, lead: 33 };
const CLOCK_DATE = { fontSize: 24, fontWeight: 700 };
const CLOCK_COUNT = { fontSize: 17, fontWeight: 400 };
const SUBJECT_LABEL = { fontSize: 20, fontWeight: 700 };

const LEGEND = { swatchWidth: 96, swatchHeight: 22, gap: 8 };

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

// The canvas substrate, deliberately NOT the resvg one every `render-still.mjs` carries: this
// component renders in a browser, where the real text metrics live. Duplicated per video beat
// rather than imported, exactly as the other video beats duplicate it.
let measuringContext: CanvasRenderingContext2D | null | undefined;
export function measureText(
  text: string,
  { fontSize, fontWeight = 400 }: { fontSize: number; fontWeight?: number },
): number {
  if (!text) return 0;
  if (measuringContext === undefined)
    measuringContext =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  if (!measuringContext) return text.length * fontSize * 0.5;
  measuringContext.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`;
  return measuringContext.measureText(text).width;
}

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

function whole(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(
    value,
  );
}

/**
 * The day the clock is showing. `reveal` runs 0 → 1 over the reveal window, and the LAST day must
 * be reached exactly at the end of it — `Math.min` rather than a rounding that could leave the
 * final frame one day short of the year it claims to have played.
 */
export function dayShown(reveal: number, days: number): number {
  return Math.min(days - 1, Math.floor(reveal * days));
}

/** How many class thresholds a cell has crossed by `day` — its index into the ramp. */
export function classAt(crossings: (number | null)[], day: number): number {
  let index = 0;
  for (const crossedOn of crossings) {
    if (crossedOn === null || crossedOn > day) break;
    index++;
  }
  return index;
}

export type CellDrawn = {
  key: string;
  cx: number;
  cy: number;
  /** The day (0-based) this cell's first event was catalogued. Before it, nothing is drawn. */
  firstDay: number;
  /** For each class break, the day this cell's running count first passed it, or null. */
  crossings: (number | null)[];
  /** Its total over the whole year — used only for the subject check, never to shade a frame. */
  total: number;
};

export type HexGridVideoProps = {
  geometry: { frame: { width: number; height: number } };
  plate: string;
  cells: CellDrawn[];
  hexSize: number;
  breaks: number[];
  ramp: string[];
  /** Running total of catalogued events, one entry per day of the year. */
  runningTotal: number[];
  /** Same, for the densest cell alone. */
  subjectRunning: number[];
  /** ISO date of the first day of the year the clock plays, so the readout derives every date. */
  yearStart: string;
  subjectKey: string;
  subjectLabel: string;
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  conclusion: string;
  caveat: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  alt: string;
  timing?: BeatTiming;
};

export function HexGridVideo({
  geometry,
  plate,
  cells,
  hexSize,
  breaks,
  ramp,
  runningTotal,
  subjectRunning,
  yearStart,
  subjectKey,
  subjectLabel,
  title,
  source,
  basemapCredit,
  legendCaption,
  conclusion,
  caveat,
  ground,
  accent,
  ink,
  muted,
  timing = HEXGRID_TIMING,
}: HexGridVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = MAP.width / geometry.frame.width;

  // ── Layout. Identical at every frame: the build changes what is VISIBLE, never where it sits.
  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME.width - PAD * 2,
    SOURCE,
  );
  const caveatLines = wrap(caveat, FRAME.width - PAD * 2, NOTE);
  const conclusionLines = wrap(conclusion, FRAME.width - PAD * 2, CONCLUSION);

  const titleTop = PAD + TITLE.fontSize;
  // THE SOURCE IS THE LAST LINE BEFORE THE BOTTOM MARGIN — the credit sits at the bottom of the
  // visual, the same place on every graphic this project ships, and it carries the basemap credit
  // with it, unsplit. It used to hang directly under the title. The bottom stack is laid out
  // UPWARD from `FRAME.height - PAD`; the plate is fixed at MAP_Y and does not move. See
  // map-beat/assets/Co2MapVideo.tsx, which this is copied from.
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  const caveatBottom = sourceTop - SOURCE.fontSize - 12;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;
  // RE-POINTED when the source moved to the bottom: a comparison against `sourceBottom` cannot go
  // red once the source sits on the frame's floor. The TITLE block is what the plate can now
  // actually collide with.
  const titleBottom = titleTop + (titleLines.length - 1) * TITLE.lead;
  if (titleBottom > MAP_Y - 16)
    throw new Error(
      `the header does not fit: the title ends at ${titleBottom} and the map starts at ${MAP_Y}. Shorten the title, or move the map down.`,
    );

  const legendCaptionY = MAP_Y + MAP.height + 36;
  const swatchY = legendCaptionY + 14;
  const legendLabelY = swatchY + LEGEND.swatchHeight + 18;
  const conclusionTop = legendLabelY + 42;
  const conclusionBottom =
    conclusionTop + (conclusionLines.length - 1) * CONCLUSION.lead;
  if (conclusionBottom > caveatTop - NOTE.fontSize - 14)
    throw new Error(
      `the column does not fit: the conclusion ends at ${conclusionBottom} and the caveat starts at ${caveatTop}. Shorten one of them.`,
    );

  // ── The edit. Every window read off the contract.
  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusionProgress = progressOf(frame, timing.conclusion);

  // The plate and the class scale are furniture: they come up once and never move again. The TITLE,
  // the SOURCE and the CAVEAT are not gated on them at all — they are drawn at full opacity from
  // frame 0, because frame 0 is the poster frame a CMS pulls as the thumbnail, and 19 mp4s in this
  // repository once shipped a blank white one by gating everything on `establish`, whose progress
  // at frame 0 is exactly 0.
  const furniture = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const scaleOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusionProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });

  const days = runningTotal.length;
  // Before the reveal opens the clock reads day 0 with nothing catalogued; after it closes it holds
  // the last day. `progressOf` clamps at both ends, so the hold is genuinely still.
  const day = dayShown(reveal, days);
  const started = frame >= timing.reveal.start;
  const dateShown = new Date(Date.parse(yearStart) + day * 86400000);
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateShown);
  const countShown = started ? runningTotal[day]! : 0;
  const subjectShown = started ? subjectRunning[day]! : 0;

  const subject = cells.find((cell) => cell.key === subjectKey);
  if (!subject)
    throw new Error(
      `no cell keyed ${subjectKey} to mark as the subject — the render and the binning disagree`,
    );

  // The pill is sized on the WIDEST string it will ever hold, and it holds a reserved third line
  // from the first frame — so nothing in it moves when the subject lands. Measured against the
  // year's own final totals, not the current frame's, or the box would grow a digit at a time.
  const subjectLine = `${whole(subjectRunning[days - 1]!)} of them in one cell`;
  const clockWidth =
    Math.max(
      measureText(
        new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(Date.parse(yearStart) + (days - 1) * 86400000)),
        CLOCK_DATE,
      ),
      measureText(
        `${whole(runningTotal[days - 1]!)} events catalogued`,
        CLOCK_COUNT,
      ),
      measureText(subjectLine, CLOCK_COUNT),
    ) + 32;
  const clockX = PAD + MAP.width - clockWidth - 14;

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      {/* The plate is an IMAGE, not a map. Remotion's <Img> holds the frame until it has decoded. */}
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: PAD,
          top: MAP_Y,
          width: MAP.width,
          height: MAP.height,
          opacity: furniture,
        }}
      />
      <svg
        width={FRAME.width}
        height={FRAME.height}
        viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <clipPath id="hex-plate-clip">
            <rect x={PAD} y={MAP_Y} width={MAP.width} height={MAP.height} />
          </clipPath>
        </defs>

        {/* ── The grid, filling in as the year plays ────────────────────────────────────────── */}
        <g clipPath="url(#hex-plate-clip)">
          <g transform={`translate(${PAD},${MAP_Y}) scale(${scale})`}>
            {cells.map((cell) => {
              if (!started || cell.firstDay > day) return null;
              const shade = ramp[classAt(cell.crossings, day)]!;
              // A cell's first frame springs from nothing to its own class shade over four frames,
              // so a hexagon arrives rather than blinking. Never translucent for longer than that:
              // a half-faded cell over a pale basemap reads as a LIGHTER class than it is, which
              // for those frames states the wrong number.
              const age = Math.min(1, (day - cell.firstDay + 1) / 2);
              const corners = hexCorners(cell.cx, cell.cy, hexSize);
              return (
                <polygon
                  key={cell.key}
                  points={corners
                    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
                    .join(" ")}
                  fill={shade}
                  fillOpacity={age}
                  stroke={ground}
                  strokeWidth={0.7 / scale}
                  strokeLinejoin="round"
                />
              );
            })}

            {/* The accent, and only the accent, on the densest cell — after the year has finished
                playing, so it is never an outline around a number the frame has not reached. */}
            {subjectSpring > 0 ? (
              <g opacity={subjectSpring}>
                <polygon
                  points={hexCorners(subject.cx, subject.cy, hexSize * 1.02)
                    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
                    .join(" ")}
                  fill="none"
                  stroke={ground}
                  strokeWidth={6 / scale}
                  strokeLinejoin="round"
                />
                <polygon
                  points={hexCorners(subject.cx, subject.cy, hexSize * 1.02)
                    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
                    .join(" ")}
                  fill="none"
                  stroke={accent}
                  strokeWidth={3 / scale}
                  strokeLinejoin="round"
                />
              </g>
            ) : null}
          </g>

          {/* The subject's label, in frame coordinates so its type is never scaled by the plate. */}
          {subjectSpring > 0 ? (
            <g
              transform={`translate(${PAD + (subject.cx - hexSize * 1.3) * scale},${MAP_Y + subject.cy * scale + 6})`}
              opacity={subjectSpring}
            >
              <text
                textAnchor="end"
                fontSize={SUBJECT_LABEL.fontSize}
                fontWeight={SUBJECT_LABEL.fontWeight}
                stroke={ground}
                strokeWidth={5}
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
          ) : null}

          {/* ── The clock. On the map, inside its own plate, from the moment the plate exists —
                this is what makes an absent hexagon mean "not yet" rather than "never". */}
          <g opacity={furniture}>
            <rect
              x={clockX}
              y={MAP_Y + 14}
              width={clockWidth}
              height={88}
              rx={6}
              fill={ground}
              fillOpacity={0.86}
              stroke={muted}
              strokeWidth={0.8}
            />
            <text
              x={clockX + 16}
              y={MAP_Y + 42}
              fill={ink}
              fontSize={CLOCK_DATE.fontSize}
              fontWeight={CLOCK_DATE.fontWeight}
            >
              {dateLabel}
            </text>
            <text
              x={clockX + 16}
              y={MAP_Y + 65}
              fill={muted}
              fontSize={CLOCK_COUNT.fontSize}
            >
              {`${whole(countShown)} events catalogued`}
            </text>
          </g>
        </g>

        {/* ── Furniture that never fades: the poster frame carries all of it ────────────────── */}
        <g>
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
        </g>

        {/* ── The class scale, laid down before any cell is shaded ──────────────────────────── */}
        <g opacity={scaleOpacity}>
          <text
            x={PAD}
            y={legendCaptionY}
            fill={muted}
            fontSize={CAPTION.fontSize}
            fontWeight={CAPTION.fontWeight}
          >
            {legendCaption}
          </text>
          {ramp.map((shade, i) => {
            const x = PAD + i * (LEGEND.swatchWidth + LEGEND.gap);
            const low = i === 0 ? 1 : breaks[i - 1]! + 1;
            const high = i < breaks.length ? breaks[i]! : null;
            return (
              <Fragment key={shade}>
                <rect
                  x={x}
                  y={swatchY}
                  width={LEGEND.swatchWidth}
                  height={LEGEND.swatchHeight}
                  fill={shade}
                />
                <text
                  x={x}
                  y={legendLabelY}
                  fill={muted}
                  fontSize={TICK.fontSize}
                >
                  {high === null
                    ? `${whole(low)}+`
                    : `${whole(low)}–${whole(high)}`}
                </text>
              </Fragment>
            );
          })}
        </g>

        {/* ── The conclusion, stated once the year has been played and the cell named ───────── */}
        <g opacity={conclusionOpacity}>
          {conclusionLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={conclusionTop + i * CONCLUSION.lead}
              fill={accent}
              fontSize={CONCLUSION.fontSize}
              fontWeight={CONCLUSION.fontWeight}
            >
              {line}
            </text>
          ))}
        </g>

        {/* The subject's own tally, on the pill's reserved third line, once it has been named. */}
        {subjectSpring > 0 ? (
          <text
            x={clockX + 16}
            y={MAP_Y + 88}
            fill={accent}
            fontSize={CLOCK_COUNT.fontSize}
            fontWeight={600}
            opacity={subjectSpring}
          >
            {`${whole(subjectShown)} of them in one cell`}
          </text>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
}
