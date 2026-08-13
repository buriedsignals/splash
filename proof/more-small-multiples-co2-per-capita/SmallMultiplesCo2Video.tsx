/**
 * The video beat of "Poland's per-capita CO2 emissions have overtaken Germany's, even as both
 * have fallen sharply since their 1979-80 peaks." — 11 seconds, 30fps, 1080 × 1080.
 *
 * Written fresh from `references/types/small-multiples.md` — this is NOT four independent line
 * beats stitched together: the type's own non-negotiable rule ("what has to stay identical across
 * every panel: the scale — same domain, same axis, same units, on every single panel, full stop")
 * governs the geometry below, and the video format's own motion grammar governs the ORDER the four
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
} from "#shared/chart-video/timing.ts";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-video/sizes.mjs";
import { SMALL_MULTIPLES_CO2_TIMING } from "./timing-contract";

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

/**
 * THE TUNING THIS BEAT WAS DRAWN AT, REBASED, WITH THE SIZE AS THE MULTIPLIER.
 *
 * There is no `const FRAME`: the frame is Remotion's own (`useVideoConfig`), from the
 * `<Composition>` this beat is rendered through, and `size` names the row it was registered from.
 *
 * THE NUMBERS BELOW ARE THE OLD ONES DIVIDED BY THE SQUARE ROW'S SCALE. The shipped tokens were
 * 34 / 24 / 22 / 18 / 16 on a 1080x1080 frame, and a square video is watched full-bleed on a phone
 * — 360 dp — so one frame pixel is a third of a CSS pixel and the **16 px tick labels were 5.3 CSS
 * px**, less than half the 11–12 px floor three independent sources converge on. This was the
 * smallest type in the whole corpus. The base is set from that smallest token (16 -> 12) and every
 * other token keeps its ratio to it, which grows everything by 2.25x at the square row's 3.0.
 *
 * `PAD` does NOT go through it — a frame's margin is proportional to the CANVAS (`frameInsetFor`).
 */
const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 32 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 19 },
  PANEL_LABEL: { fontSize: 17, fontWeight: 700 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  END_LABEL: { fontSize: 14, fontWeight: 600 },
  CONCLUSION: { fontSize: 18, fontWeight: 600, lead: 23 },
  TITLE_TO_LIMITS: 23,
  HEADER_TO_GRID: 30,
  SOURCE_BLOCK_AIR: 11,
  CONCLUSION_BLOCK_AIR: 15,
  COL_GAP: 27,
  ROW_GAP: 30,
  PANEL_LABEL_RISE: 6,
  Y_TICK_INSET: 6,
  Y_TICK_BASELINE_NUDGE: 3,
  X_TICK_DROP: 15,
  END_LABEL_GAP: 6,
  END_LABEL_RISE: 9,
  GRID_STROKE: 0.75,
  LINE_STROKE: 1.5,
  SUBJECT_STROKE: 2.25,
  END_DOT: 2.25,
};
const UNIT = "t CO2/capita";

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    PANEL_LABEL: f(BASE.PANEL_LABEL) as typeof BASE.PANEL_LABEL,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    END_LABEL: f(BASE.END_LABEL) as typeof BASE.END_LABEL,
    CONCLUSION: f(BASE.CONCLUSION) as typeof BASE.CONCLUSION,
    TITLE_TO_LIMITS: sp(BASE.TITLE_TO_LIMITS),
    HEADER_TO_GRID: sp(BASE.HEADER_TO_GRID),
    SOURCE_BLOCK_AIR: sp(BASE.SOURCE_BLOCK_AIR),
    CONCLUSION_BLOCK_AIR: sp(BASE.CONCLUSION_BLOCK_AIR),
    COL_GAP: sp(BASE.COL_GAP),
    ROW_GAP: sp(BASE.ROW_GAP),
    PANEL_LABEL_RISE: sp(BASE.PANEL_LABEL_RISE),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    END_LABEL_GAP: sp(BASE.END_LABEL_GAP),
    END_LABEL_RISE: sp(BASE.END_LABEL_RISE),
    GRID_STROKE: BASE.GRID_STROKE * typeScale,
    LINE_STROKE: BASE.LINE_STROKE * typeScale,
    SUBJECT_STROKE: BASE.SUBJECT_STROKE * typeScale,
    END_DOT: BASE.END_DOT * typeScale,
  };
}

/**
 * HOW MANY COLUMNS THE FOUR PANELS TAKE, ASKED OF THE FRAME RATHER THAN TYPED.
 *
 * The beat asks the size for its dimensions and decides its own packing — `SIZES` must not learn
 * how many columns a four-panel grid takes, or it stops being a table (W4 spec, task 3). Four
 * panels in a 16:9 frame are one row; in a square or a tall one they are two by two. Derived from
 * the frame's own aspect so a fourth row would need no new call site.
 */
export function gridColumns(panelCount: number, width: number, height: number) {
  return width / height >= 1.5 ? panelCount : Math.ceil(panelCount / 2);
}

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
  /** The size row this beat's composition was registered from — `Root.tsx` passes it, one
   *  composition per row. Not a default. */
  size: string;
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
  size,
}: SmallMultiplesCo2VideoProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // THE TWO STATEMENTS OF THE FRAME, CHECKED AGAINST EACH OTHER. Remotion's is what will actually
  // be encoded; the row is what gate 2c pinned, and they come from different places.
  const row = sizeFor(size);
  if (row.width !== width || row.height !== height)
    throw new Error(
      `this composition renders at ${width}x${height}, but the size it names — ` +
        `${JSON.stringify(size)} — is ${row.width}x${row.height}. Root.tsx registers one ` +
        `composition per row and passes that row's name; the two have come apart.`,
    );
  const { typeScale } = row;
  // The band this beat may draw in. At portrait the platform reserves 14% at the top and 35% at the
  // foot; content there is at RISK OF BEING COVERED, which no frame counter can see.
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const {
    TITLE,
    SOURCE,
    PANEL_LABEL,
    AXIS,
    END_LABEL,
    CONCLUSION,
    TITLE_TO_LIMITS,
    HEADER_TO_GRID,
    SOURCE_BLOCK_AIR,
    CONCLUSION_BLOCK_AIR,
    COL_GAP,
    ROW_GAP,
    PANEL_LABEL_RISE,
    Y_TICK_INSET,
    Y_TICK_BASELINE_NUDGE,
    X_TICK_DROP,
    END_LABEL_GAP,
    END_LABEL_RISE,
    GRID_STROKE,
    LINE_STROKE,
    SUBJECT_STROKE,
    END_DOT,
  } = tokens(typeScale);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;

  if (countries.length !== 4)
    throw new Error(
      `small multiples beat needs exactly 4 countries, got ${countries.length}`,
    );

  // ── Layout, identical at every frame. Header first, then the panel grid, then the conclusion.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SOURCE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + TITLE_TO_LIMITS;
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND, not under the title — the same edge the title hangs
  // off at the top, on the same x. It stays inside the furniture opacity group, so no timing
  // contract moves. See chart-beat/references/static-discipline.md, "The source on the frame's
  // bottom margin". Both the credit and the limits line WRAP now: one line at 18px is three at
  // 40px, and both ran off the frame.
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  // The credit's own band, which the conclusion block and the grid both have to end above.
  const sourceBlock =
    SOURCE.fontSize + (sourceLines.length - 1) * SOURCE.lead + SOURCE_BLOCK_AIR;

  // The grid starts below the LAST HEADER line, never below the source.
  const gridTop =
    limitsBaseline + (limitsLines.length - 1) * SOURCE.lead + HEADER_TO_GRID;
  const conclusionLines = wrap(conclusionText, width - PAD * 2, CONCLUSION);
  const conclusionHeight =
    CONCLUSION.lead * conclusionLines.length + CONCLUSION_BLOCK_AIR;
  const gridBottom = sourceBottom - sourceBlock - conclusionHeight;
  // FOUR PANELS IN A 16:9 FRAME ARE ONE ROW; IN A SQUARE OR A TALL ONE THEY ARE TWO BY TWO. Asked
  // of the frame rather than typed — a `const COLUMNS = 2` is the same defect as a `const FRAME`.
  const columns = gridColumns(countries.length, width, height);
  const rows = Math.ceil(countries.length / columns);
  const panelWidth = (width - PAD * 2 - COL_GAP * (columns - 1)) / columns;
  const panelHeight =
    (gridBottom - gridTop - ROW_GAP * (rows - 1)) / rows;
  // A GRID WITH NO ROOM LEFT IS A REFUSAL, NOT A DRAWING. Everything above and below the panels —
  // the title, the standfirst, the conclusion sentence and the credit — grows with the type, and
  // the frame does not. At the phone's legibility floor this beat's header alone is 468px of a
  // 1080px square, and the four panels were drawn on top of the words with every existing counter
  // green. The floor under a panel is the room its own furniture needs: the country's name above
  // it, the year labels below it, and a plot at least as tall as one line of type.
  const panelFloor =
    PANEL_LABEL.fontSize + PANEL_LABEL_RISE + X_TICK_DROP + AXIS.fontSize * 2;
  if (panelHeight < panelFloor)
    throw new Error(
      `this beat's ${rows}x${columns} grid gets ${panelHeight.toFixed(0)}px per panel at ` +
        `${JSON.stringify(size)} (${width}x${height}), under the ${panelFloor}px its own furniture ` +
        `needs — the country's name above it, the year labels below it, and a plot at least two ` +
        `lines of type tall. The header and the conclusion have taken the frame. Nothing is clipped ` +
        `and nothing overflows: the panels are simply drawn on top of the words, which is the ` +
        `defect no counter in this project can see. Run the removal ladder — R3/R7 (the standfirst) ` +
        `then R8 (fewer panels, and say so) — or ship the size whose frame the grid fits.`,
    );

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
    left: PAD + (slot % columns) * (panelWidth + COL_GAP),
    top: gridTop + Math.floor(slot / columns) * (panelHeight + ROW_GAP),
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

  const conclusionOpacity = interpolate(conclusionProgress, [0, 1], [0, 1]);
  // The conclusion used to sit on the frame's bottom margin. The credit owns it now, so the
  // conclusion's last line lands just above the credit's ink instead.
  const conclusionBaseline =
    sourceBottom - sourceBlock - (conclusionLines.length - 1) * CONCLUSION.lead;

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
        {limitsLines.map((lline, i) => (
          <text
            key={lline}
            x={PAD}
            y={limitsBaseline + i * SOURCE.lead}
            fill={muted}
            fontSize={SOURCE.fontSize}
          >
            {lline}
          </text>
        ))}
        {sourceLines.map((sline, i) => (
          <text
            key={sline}
            x={PAD}
            y={sourceBaseline + i * SOURCE.lead}
            fill={muted}
            fontSize={SOURCE.fontSize}
          >
            {sline}
          </text>
        ))}
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
        const isLeftCol = p.slot % columns === 0;
        const isBottomRow = p.slot >= (rows - 1) * columns;

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
                      strokeWidth={GRID_STROKE}
                    />
                    {isLeftCol && (
                      <text
                        x={p.plot.left - Y_TICK_INSET}
                        y={ty + Y_TICK_BASELINE_NUDGE}
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
                    y={p.plot.bottom + X_TICK_DROP}
                    fill={muted}
                    fontSize={AXIS.fontSize}
                    textAnchor={yr === xDomain[0] ? "start" : "end"}
                  >
                    {yr}
                  </text>
                ))}
              <text
                x={p.plot.left}
                y={p.top - PANEL_LABEL_RISE}
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
                strokeWidth={GRID_STROKE}
              />
            </g>

            {path && (
              <path
                d={path}
                fill="none"
                stroke={lineColour}
                strokeWidth={isSubject ? SUBJECT_STROKE : LINE_STROKE}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {drawn.length > 0 && (
              <>
                <circle
                  cx={drawn[drawn.length - 1].x}
                  cy={drawn[drawn.length - 1].y}
                  r={END_DOT * (isSubject ? 1 + subjectEmphasis : 1)}
                  fill={lineColour}
                />
                {panelProgress(p.slot) >= 0.999 && (
                  <text
                    x={endPoint.x}
                    y={endLabelY(
                      p.points,
                      measureText(endLabel, END_LABEL),
                      END_LABEL_GAP,
                      END_LABEL_RISE,
                    )}
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
  gap: number,
  rise: number,
): number {
  const endPoint = points[points.length - 1];
  const footprintLeft = endPoint.x - labelWidth - gap;
  const highestNearbyY = points.reduce(
    (min, pt) => (pt.x >= footprintLeft ? Math.min(min, pt.y) : min),
    endPoint.y,
  );
  return highestNearbyY - rise;
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
