/**
 * The video genre of "From the Black Forest to the Black Sea" — 10.87s, 30fps, 1080 × 1080. Same
 * plate, same route, same territories as `FlowMapStill.tsx`; what this file adds is the one thing a
 * still cannot have: an ORDER. Every window below derives from `timing.ts`; there is no frame
 * literal in this file.
 *
 * The type sheet's own accessibility trap (`twin-map-beat/references/types/flow-map.md`, "The
 * accessibility trap"): "hasn't happened yet" must never read as a real value, or as simply absent.
 * So the FULL route is drawn from frame one — a thin, pale, DASHED, muted stroke, visibly distinct
 * from a real travelled leg — and the solid accent "travelled" stroke grows on top of it by REAL
 * arc-length fraction (`geo-flow.ts` `travelledPath`, driven by `cumulativeKm`), not by an SVG
 * stroke-dash hack (whose growth would track each segment's SCREEN length, not its real geographic
 * one — segments vary in projected length after a Mercator-family projection). A single frame taken
 * out of context therefore always shows the whole planned corridor AND exactly how far the journey
 * has actually gotten, never one without the other.
 *
 * Nothing here derives a furniture colour either — `deriveFurniture` sits beside a native
 * rasteriser no browser bundle can load, so `render-map.mjs` calls it in node and passes
 * ink/muted/grid in as props. One implementation of the colour rule, two genres.
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
import { travelledPath } from "./geo-flow";
import {
  FLOW_TIMING,
  progressOf,
  territoryArrivalProgress,
  type BeatTiming,
} from "./timing";

const FRAME = { width: 1080, height: 1080 };
const PAD = 64;
const MAP = { width: 940, height: 420 };
const MAP_X = (FRAME.width - MAP.width) / 2;
const MAP_Y = 260;

const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SOURCE = { fontSize: 15, fontWeight: 400, lead: 19 };
const CAPTION = { fontSize: 15, fontWeight: 600 };
const NOTE = { fontSize: 15, fontWeight: 400, lead: 20 };
const LEGEND_LABEL = { fontSize: 14, fontWeight: 400 };
const CONCLUSION = { fontSize: 24, fontWeight: 700, lead: 31 };
const DESTINATION_LABEL = { fontSize: 20, fontWeight: 700 };

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

let measuringContext: CanvasRenderingContext2D | null | undefined;
function measureText(
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

function wrap(
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

function fmtKm(n: number): string {
  return Math.round(n).toLocaleString("en-US");
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

export type CrossingDrawn = {
  key: string;
  name: string;
  colour: string;
  order: number; // 1-based
  fraction: number; // arc-length fraction, 0..1, of this territory's FIRST entry along the route
  rings: [number, number][][];
  anchor: [number, number];
};

export type FlowMapVideoProps = {
  geometry: {
    frame: { width: number; height: number };
    route: [number, number][]; // pixel space, same order/length as `cumKm`
  };
  crossings: CrossingDrawn[];
  cumKm: number[]; // cumulative real km to each `geometry.route` sample, same order/length
  plate: string;
  title: string;
  source: string;
  basemapCredit: string;
  caveat: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  timing?: BeatTiming;
};

export function FlowMapVideo({
  geometry,
  crossings,
  cumKm,
  plate,
  title,
  source,
  basemapCredit,
  caveat,
  ground,
  accent,
  ink,
  muted,
  timing = FLOW_TIMING,
}: FlowMapVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Layout. Identical at every frame: the build changes what is VISIBLE, never where it sits.
  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME.width - PAD * 2,
    SOURCE,
  );
  const caveatLines = wrap(caveat, FRAME.width - PAD * 2, NOTE);
  const titleTop = PAD + TITLE.fontSize;
  const sourceTop = titleTop + (titleLines.length - 1) * TITLE.lead + 30;

  const totalKm = cumKm[cumKm.length - 1] ?? 0;
  // The Danube touches 10 countries; Moldova's sub-1km frontage near Giurgiulești doesn't register
  // at this map's resolution (see BEAT.caveat in render-map.mjs), so only 9 are ever drawn here. A
  // bare "9 countries crossed" would repeat the same wrong-count claim the title makes true above.
  const conclusionText = `${fmtKm(totalKm)} km from the Black Forest to the Black Sea — ${crossings.length} of the 10 countries crossed, in order.`;
  const conclusionLines = wrap(
    conclusionText,
    FRAME.width - PAD * 2,
    CONCLUSION,
  );

  // The legend: identical wrap logic to `FlowMapStill.tsx`, so the two genres never disagree about
  // how many rows nine territories take.
  const chipGap = 18;
  const rowHeight = 26;
  const legendY = MAP_Y + MAP.height + 40;
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
  const legendBottom = legendY + 18 + rows.length * rowHeight;

  const conclusionTop = legendBottom + 40;
  const caveatTop = FRAME.height - PAD - (caveatLines.length - 1) * NOTE.lead;
  const conclusionBottom =
    conclusionTop + (conclusionLines.length - 1) * CONCLUSION.lead;
  if (conclusionBottom > caveatTop - NOTE.fontSize - 16)
    throw new Error(
      `the column does not fit: the conclusion (ending at ${conclusionBottom}) collides with the caveat starting at ${caveatTop}. Widen the frame, shrink the legend, or shorten the caveat.`,
    );

  // ── The edit. Six windows, every one read off the contract.
  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title, the source and the caveat are on screen at FRAME ZERO, at full opacity, never faded
  // in. Extracting frame 0 from this beat's mp4 returned a completely blank white image —
  // measured, not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and
  // everything gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform
  // pulls as the thumbnail before anyone presses play, and a blank poster frame is a beat that
  // says nothing.
  // The PLATE still fades in over `establish` — the basemap is this genre's axis furniture, the
  // frame the route will be read in, and it has nothing to say before the route does. So do the
  // things drawn on it: the dashed full route and the legend.
  const plateOpacity = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const referenceOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The destination lands as its own event, after the whole route has already finished travelling
  // (`timing.ts`: `subject.start` sits after `reveal`'s own end). Critically damped, same convention
  // as the sibling beats' subject spring: a marker that overshoots is, for those frames, planted
  // somewhere the delta is not.
  const destinationSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });

  // Reveal's own raw progress (linear in frame, per `progressOf`) IS the arc-length fraction
  // travelled — the growth is not eased, on the same footing as the choropleth sibling's field
  // darkening, which also feeds `reveal` unmodified into its own per-region arrival function.
  const travelled = travelledPath(geometry.route, cumKm, reveal);
  const scale = MAP.width / geometry.frame.width;

  // The destination sits close to the Danube delta, near the map box's own right edge (Ukraine is
  // clipped tight by the corridor camera) — a label offset to the right of the point the way the
  // sibling beats' subject labels always are would run past `flow-plate-clip` and get truncated
  // mid-word. Measured against the map box, not assumed: flip the label to the LEFT of the point
  // once it sits within a label's own width of the right edge.
  const destinationPx = geometry.route[geometry.route.length - 1];
  if (!destinationPx)
    throw new Error(
      "the baked route has no points to anchor the destination on",
    );
  const destinationScaledX = destinationPx[0] * scale;
  const destinationNearRightEdge = destinationScaledX > MAP.width - 150;
  const destinationLabelAnchor = destinationNearRightEdge ? "end" : "start";
  const destinationLabelDx = destinationNearRightEdge ? -16 : 16;

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: MAP_X,
          top: MAP_Y,
          width: MAP.width,
          height: MAP.height,
          opacity: plateOpacity,
        }}
      />
      <svg
        width={FRAME.width}
        height={FRAME.height}
        viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <clipPath id="flow-plate-clip">
            <rect x={MAP_X} y={MAP_Y} width={MAP.width} height={MAP.height} />
          </clipPath>
        </defs>

        <g clipPath="url(#flow-plate-clip)">
          <g transform={`translate(${MAP_X},${MAP_Y}) scale(${scale})`}>
            {/* ── The territories: invisible until the growing line first reaches them, then fade
                  to their own fill+outline. Unlike the choropleth's regions, a not-yet-crossed
                  territory carries no VALUE the blank basemap could misrepresent — it simply has not
                  been part of the journey yet, same footing as the sibling beats' own SUBJECT event
                  (no pending texture before its spring either). The route's OWN past/future
                  distinction, below, is the one this type's accessibility trap is actually about. */}
            {crossings.map((c) => {
              const arrived = territoryArrivalProgress(c.fraction, reveal);
              if (arrived <= 0) return null;
              const opacity = interpolate(arrived, [0, 1], [0, 1], {
                easing: Easing.out(Easing.cubic),
              });
              return (
                <Fragment key={c.key}>
                  <path
                    d={ringPath(c.rings)}
                    fill={c.colour}
                    fillOpacity={0.42 * opacity}
                    stroke={c.colour}
                    strokeWidth={1.4 / scale}
                    opacity={opacity}
                  />
                  <g opacity={opacity}>
                    <circle
                      cx={c.anchor[0]}
                      cy={c.anchor[1]}
                      r={11 / scale}
                      fill={c.colour}
                      stroke={ground}
                      strokeWidth={2 / scale}
                    />
                    <text
                      x={c.anchor[0]}
                      y={c.anchor[1] + 4 / scale}
                      fill={ground}
                      fontSize={12 / scale}
                      fontWeight={700}
                      textAnchor="middle"
                    >
                      {c.order}
                    </text>
                  </g>
                </Fragment>
              );
            })}

            {/* ── The route. The FUTURE leg first, drawn whole from frame one: thin, pale, dashed,
                  visibly distinct from a real travelled leg so it never reads as one — the type
                  sheet's own accessibility trap. Then the PAST leg on top, solid and accent-coloured,
                  growing by real arc-length fraction. */}
            <path
              d={routePath(geometry.route)}
              fill="none"
              stroke={muted}
              strokeWidth={2 / scale}
              strokeDasharray={`${7 / scale} ${6 / scale}`}
              strokeLinecap="round"
              opacity={0.55 * plateOpacity}
            />
            {travelled.length >= 2 && (
              <>
                <path
                  d={routePath(travelled)}
                  fill="none"
                  stroke={ground}
                  strokeWidth={6 / scale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
                <path
                  d={routePath(travelled)}
                  fill="none"
                  stroke={accent}
                  strokeWidth={3 / scale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* ── The destination: its own event, after the whole route has finished travelling. */}
            {destinationSpring > 0 ? (
              <g opacity={destinationSpring}>
                <circle
                  cx={destinationPx[0]}
                  cy={destinationPx[1]}
                  r={9 / scale}
                  fill={accent}
                  stroke={ground}
                  strokeWidth={3 / scale}
                />
              </g>
            ) : null}
          </g>

          {destinationSpring > 0 ? (
            <g
              transform={`translate(${MAP_X + destinationPx[0] * scale + destinationLabelDx},${MAP_Y + destinationPx[1] * scale - 10})`}
              opacity={destinationSpring}
            >
              <text
                textAnchor={destinationLabelAnchor}
                fontSize={DESTINATION_LABEL.fontSize}
                fontWeight={DESTINATION_LABEL.fontWeight}
                stroke={ground}
                strokeWidth={5}
                strokeLinejoin="round"
                fill="none"
              >
                Danube Delta
              </text>
              <text
                textAnchor={destinationLabelAnchor}
                fontSize={DESTINATION_LABEL.fontSize}
                fontWeight={DESTINATION_LABEL.fontWeight}
                fill={accent}
              >
                Danube Delta
              </text>
            </g>
          ) : null}
        </g>

        {/* ── Furniture: on screen from frame 0, never faded — see `plateOpacity` above ─────── */}
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
        </g>

        {/* ── The legend: present from `establish`, dimmed for a territory that has not yet
              arrived, never invisible — flips to full colour and order the moment it does. */}
        <g opacity={plateOpacity * referenceOpacity}>
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
            const y = legendY + 18 + ri * rowHeight + 15;
            return (
              <Fragment key={ri}>
                {r.map((chip) => {
                  const arrived = territoryArrivalProgress(
                    chip.crossing.fraction,
                    reveal,
                  );
                  const dimOpacity = 0.28 + 0.72 * arrived;
                  const node = (
                    <Fragment key={chip.crossing.key}>
                      <circle
                        cx={x + 8}
                        cy={y - 4}
                        r={8}
                        fill={chip.crossing.colour}
                        opacity={dimOpacity}
                      />
                      <text
                        x={x + 8}
                        y={y - 1}
                        fill={ground}
                        fontSize={9}
                        fontWeight={700}
                        textAnchor="middle"
                        opacity={dimOpacity}
                      >
                        {chip.crossing.order}
                      </text>
                      <text
                        x={x + 20}
                        y={y}
                        fill={muted}
                        fontSize={LEGEND_LABEL.fontSize}
                        opacity={0.55 + 0.45 * arrived}
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
        </g>

        {/* ── The conclusion ───────────────────────────────────────────────────────────────── */}
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

        <g>
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
      </svg>
    </AbsoluteFill>
  );
}
