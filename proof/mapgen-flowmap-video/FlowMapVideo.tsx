/**
 * The video genre of "From the Black Forest to the Black Sea" — 10.87 s, 30 fps. Same plate, same
 * route, same territories as `FlowMapStill.tsx`; what this file adds is the one thing a still cannot
 * have: an ORDER. Every window derives from `timing.ts`; there is no frame literal in this file.
 *
 * ── THE FRAME CAME OUT OF THIS FILE TOO, AND IT IS WHY THIS GENRE NOW REFUSES ────────────────
 *
 * It used to read `const FRAME = { width: 1080, height: 1080 }` with `MAP = { width: 940, height:
 * 420 }` beside it, and `Root.tsx` repeated the frame in its `<Composition>`. Both are now read from
 * `#shared/chart-video/sizes.mjs` — the VIDEO table, not the static one, because a landscape video
 * is watched on a phone turned sideways (~800 dp) rather than read in a ~900 px article column, so
 * its legibility floor is 30 px where the still's is 26.
 *
 * That is the whole difference between this beat's two genres, and it is decisive. This beat's type
 * was tuned at 1080 x 1080 at roughly HALF the floor — a 15 px caveat on a 1080 frame is 5 CSS px on
 * the phone a social video is watched on. Raised to the floor, this beat's own words no longer leave
 * a map at any size the toolchain exports, and the component says so with the arithmetic rather than
 * drawing a strip. The still, in its ~900 px column, ships. Two genres, two answers.
 *
 * ── WHAT IS UNCHANGED ────────────────────────────────────────────────────────────────────────
 *
 * The type sheet's accessibility trap (`map-beat/references/types/flow-map.md`): "hasn't happened
 * yet" must never read as a real value, or as simply absent. So the FULL route is drawn from frame
 * one — a thin, pale, DASHED, muted stroke — and the solid accent "travelled" stroke grows on top of
 * it by REAL arc-length fraction (`geo-flow.ts` `travelledPath`, driven by `cumulativeKm`), never by
 * an SVG stroke-dash hack whose growth would track each segment's SCREEN length.
 *
 * Nothing here derives a furniture colour either — `deriveFurniture` sits beside a native rasteriser
 * no browser bundle can load, so `render-map.mjs` calls it in node and passes ink/muted/grid in as
 * props. One implementation of the colour rule, two genres.
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
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-video/sizes.mjs";
import {
  lonSpanOf,
  mapStageBox,
  typeScaleFor,
} from "#shared/map-beat/stage.mjs";
import {
  TERRITORY_FILL_OPACITY,
  compositeOverLand,
  numeralInk,
  travelledPath,
} from "./geo-flow";
import {
  FLOW_TIMING,
  progressOf,
  territoryArrivalProgress,
  type BeatTiming,
} from "./timing";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE AS THE MULTIPLIER — the same convention the
 * still holds, and the same single numeral token. Every spacing number goes through `sp`, not only
 * the fonts; `PAD` is the one exception, because a frame's margin is proportional to the CANVAS.
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  SOURCE: { fontSize: 15, fontWeight: 400, lead: 19 },
  CAPTION: { fontSize: 15, fontWeight: 600 },
  NOTE: { fontSize: 15, fontWeight: 400, lead: 20 },
  LEGEND_LABEL: { fontSize: 14, fontWeight: 400 },
  CONCLUSION: { fontSize: 24, fontWeight: 700, lead: 31 },
  DESTINATION: { fontSize: 20, fontWeight: 700 },
  NUMERAL: { fontSize: 12, fontWeight: 700 },
  BADGE_R: 11,
  BADGE_STROKE: 2,
  NUMERAL_DROP: 4,
  DESTINATION_R: 9,
  DESTINATION_STROKE: 3,
  DESTINATION_HALO: 5,
  DESTINATION_GAP: 16,
  DESTINATION_RISE: 10,
  TERRITORY_STROKE: 1.4,
  ROUTE_HALO: 6,
  ROUTE_LINE: 3,
  ROUTE_PENDING: 2,
  ROUTE_DASH: 7,
  ROUTE_DASH_GAP: 6,
  CHIP_R: 9,
  CHIP_GAP: 14,
  CHIP_TEXT_GAP: 8,
  LEGEND_ROW: 26,
  LEGEND_TOP_AIR: 16,
  BLOCK_AIR: 16,
  GUTTER: 32,
};

/** The smallest token this beat draws — the order numeral, one token for the map badge and the key
 *  chip alike. It was 12 on the badge and 9 in the chip, and the size table derives every row's
 *  `typeScale` from a smallest base token of TWELVE, so the 9 missed every floor by construction. */
const SMALLEST_BASE_TOKEN = BASE.NUMERAL.fontSize;

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

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
    CONCLUSION: f(BASE.CONCLUSION) as typeof BASE.CONCLUSION,
    DESTINATION: f(BASE.DESTINATION) as typeof BASE.DESTINATION,
    NUMERAL: f(BASE.NUMERAL) as typeof BASE.NUMERAL,
  };
}

/**
 * WHERE THE FROZEN ROUTE ACTUALLY ENDS, named once and used by BOTH the label on the map and the
 * sentence about it.
 *
 * The conclusion used to read "2,567 km from the Black Forest to the Black Sea". The distance is
 * right — great-circle sum over the 911 points of `danube-route.csv` is 2567.31 km — but the
 * sentence and the geometry disagreed about the destination. That last point is (28.747, 45.2307):
 * 8.2 km from Tulcea, where the river splits into its three arms, and 68-77 km from any of the three
 * mouths on the Black Sea. Natural Earth's 1:10m centerline stops at the head of the delta, so the
 * beat can honestly claim the delta and cannot claim the sea.
 */
const DESTINATION_NAME = "Danube Delta";

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

function ringPath(rings: [number, number][][], k: number): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        "M" +
        ring
          .map(([x, y]) => `${(x * k).toFixed(1)} ${(y * k).toFixed(1)}`)
          .join("L") +
        "Z",
    )
    .join("");
}

function routePath(route: [number, number][], k: number): string {
  if (route.length < 2) return "";
  return (
    "M" +
    route
      .map(([x, y]) => `${(x * k).toFixed(1)} ${(y * k).toFixed(1)}`)
      .join("L")
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
    frameCorners: { west: number; north: number; east: number; south: number };
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
  /** The export size this composition draws at — `Root.tsx` registers one per row of the table. */
  size: string;
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
  size,
  timing = FLOW_TIMING,
}: FlowMapVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const row = sizeFor(size);
  const FRAME = { width: row.width, height: row.height };
  const PAD = frameInsetFor(size);
  const T = tokens(typeScaleFor(row, SMALLEST_BASE_TOKEN));
  const sp = T.sp;
  const band = stageFor(size);
  const top = band.top + PAD;
  const contentWidth = FRAME.width - PAD * 2;

  // ── Layout. Identical at every frame: the build changes what is VISIBLE, never where it sits.
  //
  // The credit strip first, because everything else is laid out above it. Spelled out rather than
  // `= bottom` so the anchor NAMES the frame's own height with a subtraction, which is what
  // `credit-anchors-to-the-frame-bottom.test.ts` reads out of this file.
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    contentWidth,
    T.SOURCE,
  );
  const sourceBottom = band.top + band.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * T.SOURCE.lead;

  const titleLines = wrap(title, contentWidth, T.TITLE);
  const titleTop = top + T.TITLE.fontSize;
  const titleBottom = titleTop + (titleLines.length - 1) * T.TITLE.lead;
  const legendCaptionTop =
    titleBottom + sp(BASE.BLOCK_AIR) + T.CAPTION.fontSize;

  const totalKm = cumKm[cumKm.length - 1] ?? 0;
  // The Danube touches 10 countries; Moldova's sub-1km frontage near Giurgiulești doesn't register
  // at this map's resolution (see BEAT.caveat in render-map.mjs), so only 9 are ever drawn here.
  const conclusionText = `${fmtKm(totalKm)} km from the Black Forest to the ${DESTINATION_NAME} — ${crossings.length} of the 10 countries crossed, in order.`;
  const conclusionLines = wrap(conclusionText, contentWidth, T.CONCLUSION);

  // The key: identical packing to `FlowMapStill.tsx`, so the two genres never disagree about how
  // many rows nine territories take.
  const BADGE_R = sp(BASE.BADGE_R);
  const CHIP_R = sp(BASE.CHIP_R);
  const chips = crossings.map((c) => ({
    crossing: c,
    width:
      CHIP_R * 2 + sp(BASE.CHIP_TEXT_GAP) + measureText(c.name, T.LEGEND_LABEL),
  }));
  const packed: { crossing: CrossingDrawn; width: number }[][] = [];
  {
    let line: typeof chips = [];
    let lineWidth = 0;
    for (const chip of chips) {
      if (
        line.length > 0 &&
        lineWidth + sp(BASE.CHIP_GAP) + chip.width > contentWidth
      ) {
        packed.push(line);
        line = [];
        lineWidth = 0;
      }
      if (line.length > 0) lineWidth += sp(BASE.CHIP_GAP);
      line.push(chip);
      lineWidth += chip.width;
    }
    if (line.length > 0) packed.push(line);
  }
  const legendRowsTop = legendCaptionTop + sp(BASE.LEGEND_TOP_AIR);
  const legendBottom = legendRowsTop + packed.length * sp(BASE.LEGEND_ROW);

  // The conclusion is the beat's payoff line and sits between the map and the credit.
  const conclusionBottom =
    sourceTop - T.SOURCE.fontSize - sp(BASE.BLOCK_AIR) - T.CONCLUSION.fontSize;
  const conclusionTop =
    conclusionBottom - (conclusionLines.length - 1) * T.CONCLUSION.lead;
  const bodyTop = legendBottom + sp(BASE.BLOCK_AIR);
  const bodyHeight =
    conclusionTop - T.CONCLUSION.fontSize - sp(BASE.BLOCK_AIR) - bodyTop;

  // ── THE FLOOR A MAP IS STILL A MAP AT, DERIVED FROM THIS BEAT'S OWN ARGUMENT ─────────────────
  // Nine numbered badges in crossing order. Two of them — Hungary and Croatia — sit 77.0 px apart
  // in the plate's own 940 px frame, and below the width at which those two circles stop
  // overlapping the picture cannot state the order it exists to state.
  let closestAnchorGap = Infinity;
  for (let i = 0; i < crossings.length; i++)
    for (let j = i + 1; j < crossings.length; j++) {
      const a = crossings[i]!.anchor;
      const b = crossings[j]!.anchor;
      closestAnchorGap = Math.min(
        closestAnchorGap,
        Math.hypot(a[0] - b[0], a[1] - b[1]),
      );
    }
  const minMapWidth = Number.isFinite(closestAnchorGap)
    ? Math.ceil(
        (geometry.frame.width * (BADGE_R * 2 + sp(BASE.BADGE_STROKE))) /
          closestAnchorGap,
      )
    : 0;

  // ── THE ARRANGEMENT, AND THE REMOVAL LADDER ─────────────────────────────────────────────────
  // The caveat is the only prose block a ladder rung may touch here, and this beat's flat plate
  // leaves a column beside the map to put it in. R3 drops its last sentences, R7 drops it whole,
  // R9 refuses — and R9 is what fires at every size this toolchain exports, because the blocks a
  // ladder may NOT touch (the title, the key that carries the order, the conclusion, the credit)
  // already exceed the band on their own.
  const gutter = sp(BASE.GUTTER);
  const lonSpan = lonSpanOf(geometry);
  const layoutWith = (note: string) => {
    if (bodyHeight <= 0) return null;
    const beside = mapStageBox({
      availableWidth: contentWidth,
      availableHeight: bodyHeight,
      plateFrame: geometry.frame,
      studyLonSpanDeg: lonSpan,
    });
    if (beside.width < minMapWidth) return null;
    const column = contentWidth - beside.width - gutter;
    if (note === "")
      return { stage: beside, caveatLines: [] as string[], beside: true };
    const longestWord = Math.max(
      ...note.split(/\s+/).map((w) => measureText(w, T.NOTE)),
    );
    if (column >= longestWord) {
      const lines = wrap(note, column, T.NOTE);
      if (T.NOTE.fontSize + (lines.length - 1) * T.NOTE.lead <= bodyHeight)
        return { stage: beside, caveatLines: lines, beside: true };
    }
    const lines = wrap(note, contentWidth, T.NOTE);
    const block =
      T.NOTE.fontSize + (lines.length - 1) * T.NOTE.lead + sp(BASE.BLOCK_AIR);
    if (bodyHeight - block <= 0) return null;
    const stacked = mapStageBox({
      availableWidth: contentWidth,
      availableHeight: bodyHeight - block,
      plateFrame: geometry.frame,
      studyLonSpanDeg: lonSpan,
    });
    if (stacked.width < minMapWidth) return null;
    return { stage: stacked, caveatLines: lines, beside: false };
  };

  const sentences = (caveat.match(/[^.]+\.(?:\s|$)/g) ?? [caveat]).length;
  const notes = [
    caveat,
    ...Array.from({ length: Math.max(0, sentences - 1) }, (_, i) =>
      (caveat.match(/[^.]+\.(?:\s|$)/g) ?? [caveat])
        .slice(0, Math.max(1, sentences - (i + 1)))
        .join("")
        .trim(),
    ),
    "",
  ];
  const chosen = notes.map(layoutWith).find((a) => a !== null) ?? null;

  if (!chosen) {
    // R9, stated, with the arithmetic that produced it. The blocks named here are the ones no rung
    // of the ladder may remove: the title, the key (which IS the crossing order this beat exists to
    // state), the conclusion (its payoff) and the credit.
    const budget = band.height - PAD * 2;
    const untouchable =
      T.TITLE.fontSize +
      (titleLines.length - 1) * T.TITLE.lead +
      sp(BASE.BLOCK_AIR) +
      T.CAPTION.fontSize +
      sp(BASE.LEGEND_TOP_AIR) +
      packed.length * sp(BASE.LEGEND_ROW) +
      sp(BASE.BLOCK_AIR) +
      T.CONCLUSION.fontSize +
      (conclusionLines.length - 1) * T.CONCLUSION.lead +
      sp(BASE.BLOCK_AIR) +
      T.SOURCE.fontSize +
      (sourceLines.length - 1) * T.SOURCE.lead;
    const caveatLines = wrap(caveat, contentWidth, T.NOTE);
    throw new Error(
      `mapgen-flowmap-video (video) cannot be drawn at ${size} (${FRAME.width}x${FRAME.height}).\n` +
        `The band is ${band.height}px and the margin ${PAD}px each end, so there are ${budget}px ` +
        `to spend. At the ${row.minTypePx}px floor this table gives a ${size} VIDEO — ` +
        (size === "landscape"
          ? "the phone is turned sideways, ~800 dp, not a 900 px article column"
          : "the frame is watched full-bleed on a 360 dp phone") +
        ` — the four blocks no ladder rung may ` +
        `remove take ${untouchable}px of it: title ${titleLines.length} lines at ` +
        `${T.TITLE.fontSize}px, the key ${packed.length} row(s) of ${crossings.length} chips (the ` +
        `key IS the crossing order this beat exists to state), the conclusion ` +
        `${conclusionLines.length} lines, the credit ${sourceLines.length} lines. That leaves ` +
        `${budget - untouchable}px for the map, before the ${caveatLines.length}-line caveat is ` +
        `placed at all, and the map needs ${minMapWidth}x${Math.ceil(minMapWidth / (geometry.frame.width / geometry.frame.height))}px ` +
        `for its two closest badges (Hungary and Croatia, ${closestAnchorGap.toFixed(1)}px apart ` +
        `in a ${geometry.frame.width}px plate) to stop overlapping.\n` +
        `The ladder was run and cannot reach it: R3 and R7 only touch the caveat, which is already ` +
        `out of that stack, and nothing in the ladder makes type smaller. R9.\n` +
        `This beat's STILL genre ships at landscape — it is read in a ~900 px article column, where ` +
        `the floor is 26 px rather than 30 and the same words leave a 980x438 map.`,
    );
  }

  const MAP_W = chosen.stage.width;
  const MAP_H = chosen.stage.height;
  const MAP_X = PAD;
  const MAP_Y = bodyTop;
  const k = MAP_W / geometry.frame.width;
  const caveatX = chosen.beside ? PAD + MAP_W + gutter : PAD;
  const caveatTop = chosen.beside
    ? bodyTop + T.NOTE.fontSize
    : bodyTop + MAP_H + sp(BASE.BLOCK_AIR) + T.NOTE.fontSize;

  // ── The edit. Six windows, every one read off the contract.
  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title, the source and the caveat are on screen at FRAME ZERO, at full opacity, never faded
  // in. Frame 0 is the poster frame a CMS or a social platform pulls as the thumbnail before anyone
  // presses play, and a blank poster frame is a beat that says nothing. The PLATE still fades in
  // over `establish` — the basemap is this genre's axis furniture.
  const plateOpacity = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const referenceOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The destination lands as its own event, after the whole route has finished travelling.
  // Critically damped: a marker that overshoots is, for those frames, planted somewhere the delta
  // is not.
  const destinationSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });

  // Reveal's own raw progress (linear in frame, per `progressOf`) IS the arc-length fraction
  // travelled — the growth is not eased.
  const travelled = travelledPath(geometry.route, cumKm, reveal);

  // The destination sits near the map box's own right edge (Ukraine is clipped tight by the
  // corridor camera), so a label offset to its right would run past `flow-plate-clip` and be
  // truncated mid-word. MEASURED against the label's own width plus its gap, never a typed margin:
  // a 150 px constant tuned against a 940 px plate is exactly the defect the bigger frame exposes.
  const destinationPx = geometry.route[geometry.route.length - 1];
  if (!destinationPx)
    throw new Error(
      "the baked route has no points to anchor the destination on",
    );
  const destinationLabelWidth =
    measureText(DESTINATION_NAME, T.DESTINATION) + sp(BASE.DESTINATION_GAP);
  const destinationNearRightEdge =
    destinationPx[0] * k > MAP_W - destinationLabelWidth;
  const destinationLabelAnchor = destinationNearRightEdge ? "end" : "start";
  const destinationLabelDx = destinationNearRightEdge
    ? -sp(BASE.DESTINATION_GAP)
    : sp(BASE.DESTINATION_GAP);

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: MAP_X,
          top: MAP_Y,
          width: MAP_W,
          height: MAP_H,
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
            <rect x={MAP_X} y={MAP_Y} width={MAP_W} height={MAP_H} />
          </clipPath>
        </defs>

        <g clipPath="url(#flow-plate-clip)">
          <g transform={`translate(${MAP_X},${MAP_Y})`}>
            {/* ── The territories: invisible until the growing line first reaches them, then fade
                  to their own fill+outline. A not-yet-crossed territory carries no VALUE the blank
                  basemap could misrepresent — it simply has not been part of the journey yet. The
                  route's OWN past/future distinction, below, is what the accessibility trap is
                  about. */}
            {crossings.map((c) => {
              const arrived = territoryArrivalProgress(c.fraction, reveal);
              if (arrived <= 0) return null;
              const opacity = interpolate(arrived, [0, 1], [0, 1], {
                easing: Easing.out(Easing.cubic),
              });
              return (
                <Fragment key={c.key}>
                  <path
                    d={ringPath(c.rings, k)}
                    fill={c.colour}
                    fillOpacity={TERRITORY_FILL_OPACITY * opacity}
                    stroke={c.colour}
                    strokeWidth={sp(BASE.TERRITORY_STROKE)}
                    opacity={opacity}
                  />
                  <g opacity={opacity}>
                    <circle
                      cx={c.anchor[0] * k}
                      cy={c.anchor[1] * k}
                      r={BADGE_R}
                      fill={c.colour}
                      stroke={ground}
                      strokeWidth={sp(BASE.BADGE_STROKE)}
                    />
                    <text
                      x={c.anchor[0] * k}
                      y={c.anchor[1] * k + sp(BASE.NUMERAL_DROP)}
                      fill={numeralInk(c.colour)}
                      fontSize={T.NUMERAL.fontSize}
                      fontWeight={T.NUMERAL.fontWeight}
                      textAnchor="middle"
                    >
                      {c.order}
                    </text>
                  </g>
                </Fragment>
              );
            })}

            {/* ── The route. The FUTURE leg first, drawn whole from frame one: thin, pale, dashed,
                  visibly distinct from a real travelled leg. Then the PAST leg on top, solid and
                  accent-coloured, growing by real arc-length fraction. */}
            <path
              d={routePath(geometry.route, k)}
              fill="none"
              stroke={muted}
              strokeWidth={sp(BASE.ROUTE_PENDING)}
              strokeDasharray={`${sp(BASE.ROUTE_DASH)} ${sp(BASE.ROUTE_DASH_GAP)}`}
              strokeLinecap="round"
              opacity={0.55 * plateOpacity}
            />
            {travelled.length >= 2 && (
              <>
                <path
                  d={routePath(travelled, k)}
                  fill="none"
                  stroke={ground}
                  strokeWidth={sp(BASE.ROUTE_HALO)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.85}
                />
                <path
                  d={routePath(travelled, k)}
                  fill="none"
                  stroke={accent}
                  strokeWidth={sp(BASE.ROUTE_LINE)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* ── The destination: its own event, after the whole route has finished travelling. */}
            {destinationSpring > 0 ? (
              <g opacity={destinationSpring}>
                <circle
                  cx={destinationPx[0] * k}
                  cy={destinationPx[1] * k}
                  r={sp(BASE.DESTINATION_R)}
                  fill={accent}
                  stroke={ground}
                  strokeWidth={sp(BASE.DESTINATION_STROKE)}
                />
              </g>
            ) : null}
          </g>

          {destinationSpring > 0 ? (
            <g
              transform={`translate(${MAP_X + destinationPx[0] * k + destinationLabelDx},${MAP_Y + destinationPx[1] * k - sp(BASE.DESTINATION_RISE)})`}
              opacity={destinationSpring}
            >
              <text
                textAnchor={destinationLabelAnchor}
                fontSize={T.DESTINATION.fontSize}
                fontWeight={T.DESTINATION.fontWeight}
                stroke={ground}
                strokeWidth={sp(BASE.DESTINATION_HALO)}
                strokeLinejoin="round"
                fill="none"
              >
                {DESTINATION_NAME}
              </text>
              <text
                textAnchor={destinationLabelAnchor}
                fontSize={T.DESTINATION.fontSize}
                fontWeight={T.DESTINATION.fontWeight}
                fill={accent}
              >
                {DESTINATION_NAME}
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
        </g>

        {/* ── The key: present from `establish`, dimmed for a territory that has not yet arrived,
              never invisible — flips to full colour the moment it does. */}
        <g opacity={plateOpacity * referenceOpacity}>
          <text
            x={PAD}
            y={legendCaptionTop}
            fill={muted}
            fontSize={T.CAPTION.fontSize}
            fontWeight={T.CAPTION.fontWeight}
          >
            Territories crossed, in order —
          </text>
          {packed.map((line, ri) => {
            let x = PAD;
            const centre =
              legendRowsTop +
              ri * sp(BASE.LEGEND_ROW) +
              sp(BASE.LEGEND_ROW) / 2;
            return (
              <Fragment key={ri}>
                {line.map((chip) => {
                  const arrived = territoryArrivalProgress(
                    chip.crossing.fraction,
                    reveal,
                  );
                  const dimOpacity = 0.28 + 0.72 * arrived;
                  const swatch = compositeOverLand(chip.crossing.colour);
                  const node = (
                    <Fragment key={chip.crossing.key}>
                      <circle
                        cx={x + CHIP_R}
                        cy={centre}
                        r={CHIP_R}
                        fill={swatch}
                        stroke={chip.crossing.colour}
                        strokeWidth={sp(BASE.BADGE_STROKE)}
                        opacity={dimOpacity}
                      />
                      <text
                        x={x + CHIP_R}
                        y={centre + sp(BASE.NUMERAL_DROP)}
                        fill={numeralInk(swatch)}
                        fontSize={T.NUMERAL.fontSize}
                        fontWeight={T.NUMERAL.fontWeight}
                        textAnchor="middle"
                        opacity={dimOpacity}
                      >
                        {chip.crossing.order}
                      </text>
                      <text
                        x={x + CHIP_R * 2 + sp(BASE.CHIP_TEXT_GAP)}
                        y={centre + sp(BASE.NUMERAL_DROP)}
                        fill={muted}
                        fontSize={T.LEGEND_LABEL.fontSize}
                        opacity={0.55 + 0.45 * arrived}
                      >
                        {chip.crossing.name}
                      </text>
                    </Fragment>
                  );
                  x += chip.width + sp(BASE.CHIP_GAP);
                  return node;
                })}
              </Fragment>
            );
          })}
        </g>

        <g>
          {chosen.caveatLines.map((line, i) => (
            <text
              key={line}
              x={caveatX}
              y={caveatTop + i * T.NOTE.lead}
              fill={muted}
              fontSize={T.NOTE.fontSize}
            >
              {line}
            </text>
          ))}
        </g>

        {/* ── The conclusion ───────────────────────────────────────────────────────────────── */}
        <g opacity={conclusionOpacity}>
          {conclusionLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={conclusionTop + i * T.CONCLUSION.lead}
              fill={accent}
              fontSize={T.CONCLUSION.fontSize}
              fontWeight={T.CONCLUSION.fontWeight}
            >
              {line}
            </text>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
}
