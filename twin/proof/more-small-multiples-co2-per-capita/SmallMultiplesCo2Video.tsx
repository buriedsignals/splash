/**
 * The video beat of "Poland's per-capita CO2 emissions have overtaken Germany's, even as both
 * have fallen sharply since their 1979-80 peaks." — 11 seconds, 30fps, 1080 × 1080.
 *
 * Written fresh from `references/types/small-multiples.md` — this is NOT four independent line
 * beats stitched together: the type's own non-negotiable rule ("what has to stay identical across
 * every panel: the scale — same domain, same axis, same units, on every single panel, full stop")
 * governs the geometry below, and the video genre's own motion grammar governs the ORDER the four
 * panels arrive in (`motion-grammar.md`, "The order is chronological, or it is argumentative").
 * Own pure geometry (`panelGeometry`), own `measureText`/`wrap`/`drawnSoFar` (duplicated, not
 * imported — this story lives outside any skill's boundary, in `proof/`, the same rule
 * `CumulativeCo2AreaVideo.tsx`'s own doc-comment states for its own copies).
 *
 * THE FACETING PROBLEM this beat is NOT: `small-multiples.md` warns against faceting a chart that
 * would read better overlaid — "a genuinely single-trend, multi-series time chart… usually reads
 * better overlaid." Four countries whose absolute LEVELS and whose crossing (Poland over Germany)
 * are both part of the claim, on a shared zero-based scale, is exactly the opposite case: overlaid,
 * four crossing/near-crossing lines on top of each other would be unreadable; faceted, on one
 * shared scale, each country's own shape AND their relative heights both stay legible.
 */

import { line } from "d3-shape";
import { scaleLinear } from "d3-scale";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import {
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { SMALL_MULTIPLES_CO2_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 64;
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

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

/** The curve as far as it has been drawn, last segment cut mid-way so the head moves smoothly —
 *  this story's own copy of the same function every video beat in this project carries (see
 *  `CumulativeCo2AreaVideo.tsx`'s own doc-comment for why it is duplicated, not imported). */
export function drawnSoFar<T extends { x: number; y: number }>(
  points: T[],
  progress: number,
): { x: number; y: number }[] {
  if (points.length === 0 || progress <= 0) return [];
  const last = points.length - 1;
  const travelled = progress * last;
  const index = Math.min(last, Math.floor(travelled));
  if (index >= last) return points.map(({ x, y }) => ({ x, y }));
  const head = points.slice(0, index + 1).map(({ x, y }) => ({ x, y }));
  const fraction = travelled - index;
  const a = points[index];
  const b = points[index + 1];
  return [
    ...head,
    { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction },
  ];
}

const TITLE = { fontSize: 34, fontWeight: 700, lead: 42 };
const SOURCE = { fontSize: 18, fontWeight: 400 };
const PANEL_LABEL = { fontSize: 22, fontWeight: 700 };
const AXIS = { fontSize: 16, fontWeight: 400 };
const END_LABEL = { fontSize: 18, fontWeight: 600 };
const CONCLUSION = { fontSize: 24, fontWeight: 600, lead: 30 };
const UNIT = "t CO2/capita";

export type Reading = { year: number; value: number };
export type Country = { name: string; data: Reading[] };

export function en1(value: number): string {
  return value.toFixed(1);
}

/**
 * Data to coordinates, per panel, on the SHARED domain the caller computed once across all four
 * countries — no panel ever fits its own scale (`small-multiples.md`'s one non-negotiable rule).
 * Pure: no colour, no font, no React.
 */
export function panelGeometry(
  data: Reading[],
  {
    left,
    top,
    width,
    height,
  }: { left: number; top: number; width: number; height: number },
  xDomain: [number, number],
  yDomain: [number, number],
) {
  const plot = { left, top, right: left + width, bottom: top + height };
  const x = scaleLinear().domain(xDomain).range([plot.left, plot.right]);
  const y = scaleLinear().domain(yDomain).range([plot.bottom, plot.top]);
  const points = data.map((d) => ({ ...d, x: x(d.year), y: y(d.value) }));
  return { plot, points, zeroY: y(yDomain[0]) };
}

export type SmallMultiplesCo2VideoProps = {
  countries: Country[];
  order: number[]; // indices into `countries`, ascending final-value / reading order
  subjectIndex: number; // index into `countries` — the panel that gets the emphasis event
  title: string;
  source: string;
  limits: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  conclusionText: string;
  timing?: BeatTiming;
};

export function SmallMultiplesCo2Video({
  countries,
  order,
  subjectIndex,
  title,
  source,
  limits,
  ground,
  accent,
  ink,
  muted,
  grid,
  conclusionText,
  timing = SMALL_MULTIPLES_CO2_TIMING,
}: SmallMultiplesCo2VideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  if (countries.length !== 4)
    throw new Error(
      `small multiples beat needs exactly 4 countries, got ${countries.length}`,
    );

  // ── Layout, identical at every frame. Header first, then a 2x2 grid, then the conclusion band.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 30;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD;
  // The credit's own band, which the conclusion block and the grid both have to end above.
  const sourceBlock = SOURCE.fontSize + 14;

  // The grid starts below the LAST HEADER line, never below the source.
  const gridTop = limitsBaseline + 40;
  const conclusionHeight = CONCLUSION.lead * 2 + 20;
  const gridBottom = height - PAD - sourceBlock - conclusionHeight;
  const colGap = 36;
  const rowGap = 40;
  const panelWidth = (width - PAD * 2 - colGap) / 2;
  const panelHeight = (gridBottom - gridTop - rowGap) / 2;

  // Shared domain, computed once across all four countries — the rule this whole beat exists to
  // keep (`small-multiples.md`). x: every country's own first/last year (all four share the same
  // 1950-2024 span in this beat's frozen data). y: zero to the round ceiling above every country's
  // own max — a magnitude comparison across panels, so the floor is zero, never fitted per panel.
  const allYears = countries.flatMap((c) => c.data.map((d) => d.year));
  const xDomain: [number, number] = [
    Math.min(...allYears),
    Math.max(...allYears),
  ];
  const rawMax = Math.max(
    ...countries.flatMap((c) => c.data.map((d) => d.value)),
  );
  const yScale = scaleLinear().domain([0, rawMax]).nice();
  const yDomain = yScale.domain() as [number, number];
  const yTicks = yScale.ticks(3);

  const panelOrigin = (slot: number) => ({
    left: PAD + (slot % 2) * (panelWidth + colGap),
    top: gridTop + Math.floor(slot / 2) * (panelHeight + rowGap),
  });

  const panels = order.map((countryIndex, slot) => {
    const country = countries[countryIndex];
    const origin = panelOrigin(slot);
    const g = panelGeometry(
      country.data,
      { ...origin, width: panelWidth, height: panelHeight },
      xDomain,
      yDomain,
    );
    // `g` only carries `plot`/`points`/`zeroY` — `top`/`left`/`width`/`height` below are NOT a
    // duplicate of `g.plot`, they are the fields the JSX actually reads for the label baseline and
    // the tick-position formula. The first render read `p.top`/`p.height` without them ever being
    // on this object — `undefined` arithmetic silently produced NaN, which the renderer clamped to
    // 0, and every panel's own label and gridlines landed at the very top of the frame. Caught only
    // by rendering the still and looking, never by a type error (plain object spread, not a typed
    // return).
    return {
      country,
      countryIndex,
      slot,
      top: origin.top,
      left: origin.left,
      width: panelWidth,
      height: panelHeight,
      ...g,
    };
  });

  // ── The edit. Six windows, all read off the timing contract.
  const referenceProgress = progressOf(frame, timing.reference);
  const revealProgress = progressOf(frame, timing.reveal);
  const conclusionProgress = progressOf(frame, timing.conclusion);

  // The title, the limits line and the source are on screen at FRAME ZERO, at full opacity, never
  // faded in. Extracting frame 0 from this beat's mp4 returned a completely blank white image —
  // measured, not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and
  // everything gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform
  // pulls as the thumbnail before anyone presses play, and a blank poster frame is a beat that
  // says nothing. This beat has no axis furniture of its own to fade in `establish`'s place — its
  // gridlines and tick labels are PANEL furniture and already gate on `reference` below — so
  // `timing.establish` is now a held pause on the title alone, which is what a poster frame is.
  //
  // Panel furniture (gridlines, tick labels, country name) — a distinct event from the title,
  // laid down together across all four panels, then left alone before any line starts drawing.
  const panelFurnitureOpacity = referenceProgress;

  // reveal's own envelope split into four equal, sequential, non-overlapping windows — the panels
  // arrive one at a time, in `order`, never all four on one shared schedule
  // (`motion-grammar.md`'s "uniform cascade" anti-pattern).
  const panelProgress = (slot: number) =>
    interpolate(revealProgress, [slot / 4, (slot + 1) / 4], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

  // The subject panel's own emphasis: its line and end-label shift from muted to accent, and its
  // end point gets a landing mark — a critically-damped spring, the same shape every beat in this
  // project uses so nothing overshoots the value it is showing.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const subjectEmphasis = interpolate(subjectSpring, [0, 1], [0, 1]);

  const conclusionLines = wrap(conclusionText, width - PAD * 2, CONCLUSION);
  const conclusionOpacity = interpolate(conclusionProgress, [0, 1], [0, 1]);
  // The conclusion used to sit on the frame's bottom margin. The credit owns it now, so the
  // conclusion's last line lands just above the credit's ink instead.
  const conclusionBaseline =
    height - PAD - sourceBlock - (conclusionLines.length - 1) * CONCLUSION.lead;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      <g>
        {titleLines.map((tline, i) => (
          <text
            key={tline}
            x={PAD}
            y={titleBaseline + i * TITLE.lead}
            fill={ink}
            fontSize={TITLE.fontSize}
            fontWeight={TITLE.fontWeight}
          >
            {tline}
          </text>
        ))}
        <text
          x={PAD}
          y={limitsBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {limits}
        </text>
        <text
          x={PAD}
          y={sourceBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {source}
        </text>
      </g>

      {panels.map((p) => {
        const isSubject = p.countryIndex === subjectIndex;
        const lineColour = isSubject
          ? interpolateColour(muted, accent, subjectEmphasis)
          : muted;
        const drawn = drawnSoFar(p.points, panelProgress(p.slot));
        const path =
          drawn.length > 1
            ? line<{ x: number; y: number }>()
                .x((pt) => pt.x)
                .y((pt) => pt.y)
                .digits(1)(drawn)!
            : null;
        const endPoint = p.points[p.points.length - 1];
        const endLabel = `${en1(p.country.data[p.country.data.length - 1].value)}`;
        const isLeftCol = p.slot % 2 === 0;
        const isBottomRow = p.slot >= 2;

        return (
          <g key={p.country.name}>
            {/* Panel furniture: shared gridlines (every panel, unlabelled), tick VALUES only on
                the left column, year ticks only on the bottom row — the shared axis is stated
                once at the grid's own edge, not repeated in every panel
                (`small-multiples.md`'s "repetition trap"). */}
            <g opacity={panelFurnitureOpacity}>
              {yTicks.map((v) => {
                const ty =
                  p.top +
                  (p.height -
                    (p.height * (v - yDomain[0])) / (yDomain[1] - yDomain[0]));
                return (
                  <g key={v}>
                    <line
                      x1={p.plot.left}
                      x2={p.plot.right}
                      y1={ty}
                      y2={ty}
                      stroke={grid}
                      strokeWidth={1}
                    />
                    {isLeftCol && (
                      <text
                        x={p.plot.left - 8}
                        y={ty + 4}
                        fill={muted}
                        fontSize={AXIS.fontSize}
                        textAnchor="end"
                      >
                        {v}
                      </text>
                    )}
                  </g>
                );
              })}
              {isBottomRow &&
                [xDomain[0], xDomain[1]].map((yr) => (
                  <text
                    key={yr}
                    x={yr === xDomain[0] ? p.plot.left : p.plot.right}
                    y={p.plot.bottom + 20}
                    fill={muted}
                    fontSize={AXIS.fontSize}
                    textAnchor={yr === xDomain[0] ? "start" : "end"}
                  >
                    {yr}
                  </text>
                ))}
              <text
                x={p.plot.left}
                y={p.top - 8}
                fill={ink}
                fontSize={PANEL_LABEL.fontSize}
                fontWeight={PANEL_LABEL.fontWeight}
              >
                {p.country.name}
              </text>
              <rect
                x={p.plot.left}
                y={p.top}
                width={p.width}
                height={p.height}
                fill="none"
                stroke={grid}
                strokeWidth={1}
              />
            </g>

            {path && (
              <path
                d={path}
                fill="none"
                stroke={lineColour}
                strokeWidth={isSubject ? 3 : 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {drawn.length > 0 && (
              <>
                <circle
                  cx={drawn[drawn.length - 1].x}
                  cy={drawn[drawn.length - 1].y}
                  r={isSubject ? 3 + subjectEmphasis * 3 : 3}
                  fill={lineColour}
                />
                {panelProgress(p.slot) >= 0.999 && (
                  <text
                    x={endPoint.x}
                    y={endLabelY(p.points, measureText(endLabel, END_LABEL))}
                    fill={lineColour}
                    fontSize={END_LABEL.fontSize}
                    fontWeight={END_LABEL.fontWeight}
                    textAnchor="end"
                  >
                    {endLabel}
                  </text>
                )}
              </>
            )}
          </g>
        );
      })}

      <g opacity={conclusionOpacity}>
        {conclusionLines.map((cline, i) => (
          <text
            key={cline}
            x={PAD}
            y={conclusionBaseline + i * CONCLUSION.lead}
            fill={accent}
            fontSize={CONCLUSION.fontSize}
            fontWeight={CONCLUSION.fontWeight}
          >
            {cline}
          </text>
        ))}
      </g>
    </svg>
  );
}

/**
 * Where the end-label sits, clear of the curve's own path — not a flat `y - 10` above the final
 * point. `endPoint.y - 10` alone is only safe when the curve approaches its endpoint from BELOW
 * on screen; Germany's and Poland's final years each fall sharply into 2024 (a steeper local drop
 * than the decades before it), so the line arrives at the endpoint from ABOVE and the last one or
 * two segments pass directly through the small fixed gap the old offset assumed was empty — caught
 * by looking at the rendered PNG, where the stroke visibly crosses the digits. Text-anchor is
 * "end", so the label's own footprint runs backward in x from the point by its measured width; any
 * point whose x falls in that footprint is checked, and the label clears the highest (smallest-y)
 * of them, not just the endpoint itself — safe however the curve happens to be shaped near its own
 * end, ascending or descending, gentle or steep.
 */
export function endLabelY(
  points: { x: number; y: number }[],
  labelWidth: number,
): number {
  const endPoint = points[points.length - 1];
  const footprintLeft = endPoint.x - labelWidth - 8;
  const highestNearbyY = points.reduce(
    (min, pt) => (pt.x >= footprintLeft ? Math.min(min, pt.y) : min),
    endPoint.y,
  );
  return highestNearbyY - 12;
}

/** Channel-wise linear interpolation between two #rrggbb colours — this beat's own tiny helper
 *  for the subject panel's muted-to-accent transition, not a generalised colour library. */
function interpolateColour(a: string, b: string, t: number): string {
  const ch = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const ca = ch(a);
  const cb = ch(b);
  const clamped = Math.max(0, Math.min(1, t));
  return (
    "#" +
    ca
      .map((v, i) =>
        Math.round(v + (cb[i] - v) * clamped)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
