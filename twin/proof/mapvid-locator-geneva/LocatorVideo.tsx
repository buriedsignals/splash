/**
 * The video genre of "a 6 km search around central Geneva finds eleven, and stops finding at
 * 4.4 km" — 12.67s, 30fps, 1080 × 1350.
 *
 * Same plate and same eleven points as the static sibling (`proof/map-geneva-locator`) and the web
 * one (`proof/mapgen-locator-web`). What this file adds is the one thing neither of those can show:
 * **the search itself, including the part of it that finds nothing.** A static locator draws every
 * marker it has and says nothing about how far the search went; here the radius grows at a constant
 * rate to the 6 km the source's own Wikidata query used, and the last 1.6 km of it come up empty in
 * front of the reader. An absence is only evidence if you can see it being looked for.
 *
 * This is the narrowest of the three motion cases in this family, and it is stated as such in the
 * BRIEF rather than dressed up: the reveal ORDER here is distance rank, which a static frame could
 * annotate, and what motion genuinely adds is the completeness of the search and the shape of the
 * gap. A fade-in over a finished locator would have earned nothing and was not built.
 *
 * Every window below derives from `timing.ts`; there is no frame literal in this file, and no colour
 * literal either — ground, accent, ink and muted arrive as props, derived in node from `PALETTE.md`.
 *
 * WHY THE THREE TIERS ARE NOT COLOURED HERE. The static sibling encodes category in three
 * Okabe-Ito hues, which is right for a frame whose only variable is category. This beat has a
 * MOVING state — reached by the search, or not yet — and that state has to be the thing colour
 * carries, or a reader is asked to hold two colour meanings at once on a mark that changes under
 * them. The tiers are the static sibling's subject; the distance is this one's.
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
import { ringAtKm } from "./geo-locator";
import { LOCATOR_TIMING, progressOf, type BeatTiming } from "./timing";

const FRAME = { width: 1080, height: 1350 };
const PAD = 72;
const MAP = 660;
const MAP_X = (FRAME.width - MAP) / 2;
/** The plate's top edge. It came DOWN by 50px when the credit left the header for the frame's
 *  bottom margin: the header gave back the row the source used to occupy, and the bottom stack
 *  needed that room to hold the credit as well as the caveat. The same move the seed made
 *  (twin-map-beat/assets/Co2MapVideo.tsx, MAP_Y 300 -> 250), for the same reason, and the beat's
 *  own fit guard is what said so — it threw, by name, with the numbers in the message. */
const MAP_Y = 230;

const TITLE = { fontSize: 34, fontWeight: 700, lead: 43 };
const SOURCE = { fontSize: 18, fontWeight: 400, lead: 23 };
const NOTE = { fontSize: 17, fontWeight: 400, lead: 22 };
const CONCLUSION = { fontSize: 26, fontWeight: 700, lead: 33 };
const AXIS_CAPTION = { fontSize: 18, fontWeight: 600 };
const AXIS_TICK = { fontSize: 16, fontWeight: 400 };
const READOUT_RADIUS = { fontSize: 24, fontWeight: 700 };
const READOUT_COUNT = { fontSize: 17, fontWeight: 400 };
const MARKER_LABEL = { fontSize: 17, fontWeight: 700 };

const AXIS = { x: PAD, width: FRAME.width - PAD * 2, height: 12 };
const MARKER_RADIUS = 6;

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

function km(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function ringPath(points: [number, number][]): string {
  if (points.length < 3) return "";
  return (
    "M" +
    points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") +
    "Z"
  );
}

export type OrgDrawn = {
  key: string;
  name: string;
  /** Great-circle kilometres from the query's own centre, computed in node from the frozen CSV. */
  km: number;
  /** Drawn position in plate pixels, AFTER the overlap nudge — see the caveat about that nudge. */
  cx: number;
  cy: number;
  /** Declutter priority: distance rank, with the one the furniture names promoted to the front. */
  priority: number;
};

export type LocatorVideoProps = {
  geometry: {
    frame: { width: number; height: number };
    centre: { px: [number, number] };
    radiiKm: number[];
    rings: [number, number][][];
    searchKm: number;
  };
  plate: string;
  orgs: OrgDrawn[];
  /** The key of the farthest organisation — the one the conclusion and the caveat both name. */
  farthestKey: string;
  title: string;
  source: string;
  basemapCredit: string;
  axisCaption: string;
  centreLabel: string;
  conclusion: string;
  caveat: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  alt: string;
  timing?: BeatTiming;
};

export function LocatorVideo({
  geometry,
  plate,
  orgs,
  farthestKey,
  title,
  source,
  basemapCredit,
  axisCaption,
  centreLabel,
  conclusion,
  caveat,
  ground,
  accent,
  ink,
  muted,
  timing = LOCATOR_TIMING,
}: LocatorVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = MAP / geometry.frame.width;

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
  // twin-map-beat/assets/Co2MapVideo.tsx, which this is copied from.
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

  const axisCaptionY = MAP_Y + MAP + 40;
  const axisY = axisCaptionY + 26;
  const axisLabelY = axisY + AXIS.height + 24;
  const conclusionTop = axisLabelY + 44;
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

  // Title, source and caveat are drawn at full opacity from frame 0 — frame 0 is the poster frame a
  // CMS pulls as the thumbnail, and 19 mp4s in this repository once shipped a blank white one by
  // gating everything on `establish`, whose progress at frame 0 is exactly 0.
  const furniture = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const referenceOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusionProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const labelSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });

  // The sweep. LINEAR in kilometres, never in area: the readout is a radius, so the number on the
  // frame and the speed of the thing drawing it have to be the same quantity.
  const started = frame >= timing.reveal.start;
  const radiusKm = started ? reveal * geometry.searchKm : 0;
  const sweep = ringAtKm(
    geometry.rings,
    geometry.radiiKm,
    geometry.centre.px,
    radiusKm,
  );
  const limit = geometry.rings[geometry.rings.length - 1]!;

  /** How far each organisation has landed: it appears over the 0.35 km after the ring reaches it. */
  const found = orgs.map((org) =>
    Math.max(0, Math.min(1, (radiusKm - org.km) / 0.35)),
  );
  const foundCount = orgs.filter((org) => radiusKm >= org.km).length;

  const axisAt = (value: number) =>
    AXIS.x + (value / geometry.searchKm) * AXIS.width;
  const axisTicks = [0, 1, 2, 3, 4, 5, geometry.searchKm];

  /**
   * Where each organisation's label goes, or `null` if it does not fit on either side.
   *
   * `geo-locator.ts`'s own `labelSide` checks ONE edge — the right — which is the only one the
   * static sibling's frame could run off. It is not enough here and was measured to fail: this
   * beat's names run to nearly 400px and its markers cluster left of centre, so `labelSide` flipped
   * them all LEFT and two ran off the map's own left edge, clipped mid-word ("…ational Social
   * Security Association"). Both edges are checked below, against the FRAME's padding rather than
   * the map box, because a direct label is allowed to overhang the plate but never the page.
   */
  const placementOf = (org: OrgDrawn, width: number) => {
    const centreX = MAP_X + org.cx * scale;
    const rightX = centreX + MARKER_RADIUS + 8;
    if (rightX + width <= FRAME.width - PAD)
      return { anchor: "start" as const, x: rightX, boxX: rightX };
    const leftX = centreX - MARKER_RADIUS - 8;
    if (leftX - width >= PAD)
      return { anchor: "end" as const, x: leftX, boxX: leftX - width };
    return null;
  };

  // Labels are placed once, at the subject event, by the same greedy priority declutter the static
  // sibling uses — and the priority handed in already promotes the organisation the conclusion
  // names, so the words and the picture cannot point at different markers.
  const shown = new Set<string>();
  const placed: { x: number; y: number; width: number; height: number }[] = [];
  for (const org of [...orgs].sort((a, b) => a.priority - b.priority)) {
    const width = measureText(org.name, MARKER_LABEL);
    const spot = placementOf(org, width);
    if (!spot) continue;
    const box = {
      x: spot.boxX,
      y: MAP_Y + org.cy * scale - 11,
      width,
      height: 22,
    };
    if (
      placed.some(
        (other) =>
          box.x < other.x + other.width &&
          box.x + box.width > other.x &&
          box.y < other.y + other.height &&
          box.y + box.height > other.y,
      )
    )
      continue;
    placed.push(box);
    shown.add(org.key);
  }
  if (!shown.has(farthestKey))
    throw new Error(
      `the conclusion names the farthest organisation, but the label declutter dropped it — promote it in the priority handed to this component`,
    );

  const readoutRadius = `${km(radiusKm, 2)} km`;
  const readoutCount = `${foundCount} of ${orgs.length} found`;
  const readoutWidth =
    Math.max(
      measureText(`${km(geometry.searchKm, 2)} km`, READOUT_RADIUS),
      measureText(`${orgs.length} of ${orgs.length} found`, READOUT_COUNT),
    ) + 32;

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      {/* The plate is an IMAGE, not a map. Remotion's <Img> holds the frame until it has decoded. */}
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: MAP_X,
          top: MAP_Y,
          width: MAP,
          height: MAP,
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
          <clipPath id="locator-plate-clip">
            <rect x={MAP_X} y={MAP_Y} width={MAP} height={MAP} />
          </clipPath>
        </defs>

        <g clipPath="url(#locator-plate-clip)">
          <g transform={`translate(${MAP_X},${MAP_Y}) scale(${scale})`}>
            {/* The search's own LIMIT, drawn before the sweep starts. Without it the empty last
                stretch reads as the video running out of data rather than as a result. */}
            <path
              d={ringPath(limit)}
              fill="none"
              stroke={muted}
              strokeWidth={1.6 / scale}
              strokeDasharray={`${7 / scale} ${6 / scale}`}
              opacity={0.9 * referenceOpacity}
            />

            {/* The point the query was run from. */}
            <g opacity={referenceOpacity}>
              <circle
                cx={geometry.centre.px[0]}
                cy={geometry.centre.px[1]}
                r={4 / scale}
                fill={ink}
              />
              <line
                x1={geometry.centre.px[0] - 10 / scale}
                y1={geometry.centre.px[1]}
                x2={geometry.centre.px[0] + 10 / scale}
                y2={geometry.centre.px[1]}
                stroke={ink}
                strokeWidth={1.2 / scale}
              />
              <line
                x1={geometry.centre.px[0]}
                y1={geometry.centre.px[1] - 10 / scale}
                x2={geometry.centre.px[0]}
                y2={geometry.centre.px[1] + 10 / scale}
                stroke={ink}
                strokeWidth={1.2 / scale}
              />
            </g>

            {/* The sweep: the real projected great-circle locus at the current radius, filled very
                faintly so the ground it has already covered is visible as covered. */}
            {started && radiusKm > 0 ? (
              <>
                <path d={ringPath(sweep)} fill={accent} fillOpacity={0.08} />
                <path
                  d={ringPath(sweep)}
                  fill="none"
                  stroke={accent}
                  strokeWidth={2.4 / scale}
                />
              </>
            ) : null}

            {/* The organisations, each landing the moment the ring reaches it. A marker that has
                not been reached is NOT drawn: this map's claim is about what a search of a given
                radius has found, and drawing an unreached point would answer the question before
                the sweep asks it. All eleven are on the frame by 4.4 km, well inside the limit.
                It arrives by OPACITY ALONE, at its final radius from the first frame it exists:
                `references/types/locator.md` forbids sizing a locator's marker by anything, and a
                marker that grows into place is smaller than its neighbours for the dozen frames it
                takes to land — which is a size difference a reader can read as a value difference,
                for no gain over a fade. */}
            {orgs.map((org, index) => {
              const arrived = found[index]!;
              if (arrived <= 0) return null;
              return (
                <circle
                  key={org.key}
                  cx={org.cx}
                  cy={org.cy}
                  r={MARKER_RADIUS / scale}
                  fill={accent}
                  stroke={ground}
                  strokeWidth={1.8 / scale}
                  opacity={arrived}
                />
              );
            })}
          </g>


          {/* The readout, inside the plate: the radius the ring is currently at, and the count. */}
          <g opacity={furniture}>
            <rect
              x={MAP_X + 14}
              y={MAP_Y + 14}
              width={readoutWidth}
              height={62}
              rx={6}
              fill={ground}
              fillOpacity={0.86}
              stroke={muted}
              strokeWidth={0.8}
            />
            <text
              x={MAP_X + 30}
              y={MAP_Y + 42}
              fill={ink}
              fontSize={READOUT_RADIUS.fontSize}
              fontWeight={READOUT_RADIUS.fontWeight}
            >
              {readoutRadius}
            </text>
            <text
              x={MAP_X + 30}
              y={MAP_Y + 65}
              fill={muted}
              fontSize={READOUT_COUNT.fontSize}
            >
              {readoutCount}
            </text>
          </g>

          {/* The centre's own label, so the radius is anchored to a named place. */}
          <text
            x={MAP_X + geometry.centre.px[0] * scale + 14}
            y={MAP_Y + geometry.centre.px[1] * scale - 12}
            fill={ink}
            fontSize={AXIS_TICK.fontSize}
            opacity={referenceOpacity}
          >
            {centreLabel}
          </text>
        </g>

        {/* Labels, OUTSIDE the plate clip and in frame coordinates: their type is never scaled by
            the plate, and a long name is allowed to overhang the map into the page margin rather
            than be cut off at the map's edge. `placementOf` has already refused any that would
            leave the page. */}
        {labelSpring > 0
          ? orgs.map((org) => {
              if (!shown.has(org.key)) return null;
              const width = measureText(org.name, MARKER_LABEL);
              const spot = placementOf(org, width);
              if (!spot) return null;
              return (
                <g key={org.key} opacity={labelSpring}>
                  <text
                    x={spot.x}
                    y={MAP_Y + org.cy * scale + 5}
                    textAnchor={spot.anchor}
                    fontSize={MARKER_LABEL.fontSize}
                    fontWeight={MARKER_LABEL.fontWeight}
                    stroke={ground}
                    strokeWidth={4}
                    strokeLinejoin="round"
                    fill="none"
                  >
                    {org.name}
                  </text>
                  <text
                    x={spot.x}
                    y={MAP_Y + org.cy * scale + 5}
                    textAnchor={spot.anchor}
                    fontSize={MARKER_LABEL.fontSize}
                    fontWeight={MARKER_LABEL.fontWeight}
                    fill={ink}
                  >
                    {org.name}
                  </text>
                </g>
              );
            })
          : null}

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

        {/* ── The distance axis: every organisation's own distance, as a tick, on the same 0-to-6 km
              scale the ring is sweeping. This is where the SHAPE of the distribution lives — the
              tight cluster, the gap, and the empty stretch the sweep spends its last second in. */}
        <g opacity={referenceOpacity}>
          <text
            x={AXIS.x}
            y={axisCaptionY}
            fill={muted}
            fontSize={AXIS_CAPTION.fontSize}
            fontWeight={AXIS_CAPTION.fontWeight}
          >
            {axisCaption}
          </text>
          <rect
            x={AXIS.x}
            y={axisY}
            width={AXIS.width}
            height={AXIS.height}
            fill="none"
            stroke={muted}
            strokeWidth={1}
          />
          {axisTicks.map((tick) => (
            <Fragment key={tick}>
              <line
                x1={axisAt(tick)}
                y1={axisY + AXIS.height}
                x2={axisAt(tick)}
                y2={axisY + AXIS.height + 6}
                stroke={muted}
                strokeWidth={1}
              />
              <text
                x={axisAt(tick)}
                y={axisLabelY}
                textAnchor="middle"
                fill={muted}
                fontSize={AXIS_TICK.fontSize}
              >
                {`${km(tick, 0)}`}
              </text>
            </Fragment>
          ))}
        </g>

        {/* The swept part of the axis, and the ticks the sweep has reached. */}
        <rect
          x={AXIS.x}
          y={axisY}
          width={(AXIS.width * radiusKm) / geometry.searchKm}
          height={AXIS.height}
          fill={accent}
          fillOpacity={0.18}
          opacity={referenceOpacity}
        />
        <g opacity={referenceOpacity}>
          {orgs.map((org, index) => (
            <line
              key={org.key}
              x1={axisAt(org.km)}
              y1={axisY - 9}
              x2={axisAt(org.km)}
              y2={axisY + AXIS.height + 9}
              stroke={found[index]! > 0 ? accent : muted}
              strokeWidth={found[index]! > 0 ? 2.4 : 1.4}
              opacity={found[index]! > 0 ? 1 : 0.5}
            />
          ))}
          {started ? (
            <line
              x1={axisAt(radiusKm)}
              y1={axisY - 16}
              x2={axisAt(radiusKm)}
              y2={axisY + AXIS.height + 16}
              stroke={ink}
              strokeWidth={1.6}
            />
          ) : null}
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
      </svg>
    </AbsoluteFill>
  );
}
