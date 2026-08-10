/**
 * Beat: solar's share of electricity in the EU's six largest member states, 2010-2024, as a
 * small-multiples grid.
 *
 * Written fresh from `ChartSeed.tsx`'s shape against
 * `references/types/small-multiples.md`. Faceting is a layout decision, not a mark type, and the
 * sheet's non-negotiable governs every line below: **the scale is shared**. Same y domain, same x
 * domain, same panel size, same aspect, same axis position inside every panel — "even if that
 * means some panels look nearly flat and others look dramatic, because that flatness or drama IS
 * the finding". France's panel is nearly flat here. That is the point of the grid.
 *
 * The sheet's repetition trap is the other rule doing real work: the unit, the axis title and the
 * source appear ONCE, at the level of the whole grid, and each panel carries only its own country
 * name. y tick labels are drawn only down the left column and x tick labels only along the bottom
 * row, for the same reason — a reader who has decoded the axis on panel one should not have to
 * decode it five more times to reach the panel they came for.
 */

import { scaleLinear } from "d3-scale";
import { line as d3line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-beat/sizes.mjs";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";

export type Panel = {
  country: string;
  readings: { year: number; value: number }[];
};

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it, and
 *  a size it refuses is refused by the runner before a mark is drawn. */
export const TYPE = 'small-multiples';

/**
 * THE 900-WIDE TUNING, KEPT AS THE BASE, WITH THE SIZE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more, and its absence is the point: the frame is `sizeFor(size)`'s,
 * and `size` is the decision gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`.
 * Before this the size was stated TWICE as literals — once here and once in the render script — and
 * `renderStill` compared them against each other, so they agreed by construction and nothing
 * downstream of the gate ever read what the journalist chose.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts: the probe measured eleven bare
 * literals in the layout arithmetic of the SIMPLEST static in this corpus, and scaling the type
 * while leaving them collided the title into the subtitle at 1920x1080
 * (`proof/static-carbon-footprint-spread/probe/VERDICT.md`). `PAD` is the one that does NOT go
 * through it: a frame's margin is proportional to the CANVAS, not to the type — `frameInsetFor` in
 * `sizes.mjs` states the split and argues it.
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  TITLE_TO_SUBTITLE: 26,
  HEADER_TO_GRID: 30,
  SOURCE_AIR: 10,
  Y_LABEL_AIR: 8,
  END_LABEL_AIR: 10,
  SUBTITLE: { fontSize: 15, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  PANEL_TITLE: { fontSize: 15, fontWeight: 700 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  END_LABEL: { fontSize: 13, fontWeight: 700 },
  COLUMN_GAP: 30,
  ROW_GAP: 36,
  PANEL_HEADER: 22,
  X_AXIS_BAND: 24,
  LINE_WIDTH: 2.5,
  END_DOT: 3.5,
} as const;

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = (tok: { fontSize: number; fontWeight: number; lead?: number }) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SUBTITLE: f(BASE.SUBTITLE) as typeof BASE.SUBTITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    PANEL_TITLE: f(BASE.PANEL_TITLE) as typeof BASE.PANEL_TITLE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    END_LABEL: f(BASE.END_LABEL) as typeof BASE.END_LABEL,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    HEADER_TO_GRID: sp(BASE.HEADER_TO_GRID),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    Y_LABEL_AIR: sp(BASE.Y_LABEL_AIR),
    END_LABEL_AIR: sp(BASE.END_LABEL_AIR),
    COLUMN_GAP: sp(BASE.COLUMN_GAP),
    ROW_GAP: sp(BASE.ROW_GAP),
    PANEL_HEADER: sp(BASE.PANEL_HEADER),
    X_AXIS_BAND: sp(BASE.X_AXIS_BAND),
    LINE_WIDTH: sp(BASE.LINE_WIDTH),
    END_DOT: sp(BASE.END_DOT),
  };
}

/** The removal ladder this beat runs, per size, recorded so the render can print it and the
 *  artifact can carry it. At a phone frame the type floor is 36px, which triples the headline and
 *  the credit; R3 fires before a mark is drawn. */
export function rungsFor(size: string): string[] {
  if (sizeFor(size).minTypePx < 36) return [];
  return ["R3: the standfirst keeps its first sentence only"];
}

function firstSentence(text: string): string {
  const stop = text.indexOf(". ");
  return stop === -1 ? text : text.slice(0, stop + 1);
}
/**
 * HOW MANY COLUMNS THE SIX PANELS TAKE — asked of the FRAME, not written down.
 *
 * The spec's own instruction for this beat: "the beat asks the size for its dimensions and decides
 * its own packing — `SIZES` must not learn how many columns a six-panel grid takes, or it stops
 * being a table." So the grid is chosen to keep each panel's own aspect near the landscape shape
 * the sheet's panels were designed at: a wide frame takes 3 x 2, a tall one 2 x 3.
 *
 * A COUNT, so it never goes through the type scale.
 */
function columnsFor(width: number, height: number, panels: number): number {
  const candidates = [1, 2, 3, panels].filter(
    (c, i, all) => c <= panels && all.indexOf(c) === i,
  );
  let best = candidates[0];
  let bestError = Infinity;
  for (const columns of candidates) {
    const rows = Math.ceil(panels / columns);
    // A panel's own box, before furniture — the aspect the reader compares six of.
    const aspect = width / columns / (height / rows);
    // 1.6:1 is the shape the six panels in this beat were drawn and accepted at (900x620 with a
    // 3 x 2 grid). Nothing about it is universal; it is this corpus's own accepted panel.
    const error = Math.abs(Math.log(aspect / 1.6));
    if (error < bestError) {
      bestError = error;
      best = columns;
    }
  }
  return best;
}
/** Space above each panel's plot box for that panel's own country name. */
/** Space under the bottom row for the shared x tick labels. */
/** Tick COUNTS, not spacing numbers — deliberately outside the scaling helper, because multiplied
 *  by a 2.2 type scale they would ask for nine gridlines and thirteen year labels. */
const Y_TICK_HINT = 4;
const X_TICK_HINT = 6;
/** Pure geometry: panels to a grid of boxes plus one shared pair of scales. Knows no colour, no
 *  font and no label. */
export function gridGeometry(
  panels: Panel[],
  {
    width,
    height,
    padding,
    columns,
    columnGap,
    rowGap,
    panelHeader,
    xAxisBand,
    endGutter,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    columns: number;
    columnGap: number;
    rowGap: number;
    panelHeader: number;
    xAxisBand: number;
    endGutter: number;
  },
) {
  const rows = Math.ceil(panels.length / columns);
  const gridLeft = padding.left;
  const gridRight = width - padding.right;
  const gridTop = padding.top;
  const gridBottom = height - padding.bottom - xAxisBand;

  const panelWidth =
    (gridRight - gridLeft - columnGap * (columns - 1)) / columns;
  const plotHeight =
    (gridBottom - gridTop - rowGap * (rows - 1) - panelHeader * rows) / rows;

  // ONE shared domain for every panel, on both axes. Independent per-panel scaling is the single
  // defect `small-multiples.md` names as making the whole exercise pointless.
  const allValues = panels.flatMap((p) => p.readings.map((r) => r.value));
  const allYears = panels.flatMap((p) => p.readings.map((r) => r.year));
  const yDomain = scaleLinear()
    .domain([0, Math.max(...allValues)])
    .nice();
  const xDomain: [number, number] = [
    Math.min(...allYears),
    Math.max(...allYears),
  ];

  const boxes = panels.map((panel, i) => {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const left = gridLeft + column * (panelWidth + columnGap);
    const top =
      gridTop + row * (plotHeight + panelHeader + rowGap) + panelHeader;
    const plot = {
      left,
      top,
      right: left + panelWidth,
      bottom: top + plotHeight,
    };
    // The end label lives inside the panel, in a gutter reserved identically on EVERY panel, so
    // panels stay visually swappable — the sheet's "panel size, aspect ratio and the position of
    // the axis inside the panel stay identical" rule.
    const x = scaleLinear()
      .domain(xDomain)
      .range([plot.left, plot.right - endGutter]);
    const y = scaleLinear()
      .domain(yDomain.domain() as [number, number])
      .range([plot.bottom, plot.top]);
    return {
      panel,
      plot,
      x,
      y,
      isLeftColumn: column === 0,
      isBottomRow: row === rows - 1 || i + columns >= panels.length,
      points: panel.readings.map((r) => ({
        ...r,
        cx: x(r.year),
        cy: y(r.value),
      })),
    };
  });

  const yScaleForTicks = scaleLinear().domain(
    yDomain.domain() as [number, number],
  );
  return {
    boxes,
    rows,
    panelWidth,
    plotHeight,
    yTicks: yScaleForTicks.ticks(Y_TICK_HINT),
    xTickCandidates: scaleLinear().domain(xDomain).ticks(X_TICK_HINT),
    xDomain,
  };
}

/** Wrap on the measured width of the real string, never on a character count. */
function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

export function formatShare(v: number): string {
  return `${v.toFixed(1)}%`;
}

/** Axis ticks are round numbers and carry no decimal; the unit goes on the topmost tick actually
 *  drawn, once, per `static-discipline.md` — not repeated down every gridline, and certainly not
 *  down every gridline of six panels. */
export function formatTick(v: number, isTop: boolean): string {
  return isTop ? `${v}%` : String(v);
}

/**
 * Which of the candidate x ticks actually get a printed label, decided by MEASURING them against
 * the space available rather than by picking "every other one" and hoping.
 *
 * Both ends are always kept, because the beat's own claim names both years, and
 * `static-discipline.md`'s axis rule is that a reader must be able to locate any year the chart
 * names. Interior candidates are kept greedily left to right, dropped whenever they would sit
 * closer than one label's own width plus a gap to the last kept label OR to the final one.
 */
export function labelledXTicks(
  candidates: number[],
  x: (year: number) => number,
  measure: (label: string) => number,
  gap: number,
): number[] {
  if (candidates.length < 2) return candidates;
  const first = candidates[0];
  const last = candidates[candidates.length - 1];
  const room = (a: number, b: number) =>
    Math.abs(x(a) - x(b)) >=
    (measure(String(a)) + measure(String(b))) / 2 + gap;
  const kept = [first];
  for (const year of candidates.slice(1, -1)) {
    if (room(year, kept[kept.length - 1]) && room(year, last)) kept.push(year);
  }
  kept.push(last);
  return kept;
}

export function SolarSmallMultiples({
  panels,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  size,
}: {
  /** Already ordered by the caller — `small-multiples.md` asks for a meaningful panel order
   *  ("by the value the story cares about"), never alphabetical by default. */
  panels: Panel[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (panels.length < 3)
    throw new Error(
      `a small-multiples grid needs at least three panels, got ${panels.length}`,
    );
  const years = panels.map((p) => p.readings.map((r) => r.year).join(","));
  if (new Set(years).size !== 1)
    throw new Error(
      "every panel must cover exactly the same years — a shared x axis is not optional here",
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const rungs = rungsFor(size);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const subtitleTop =
    titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_SUBTITLE;
  const standfirst = rungs.some((r) => r.startsWith("R3"))
    ? firstSentence(subtitle)
    : subtitle;
  const subtitleLines = wrap(standfirst, width - PAD * 2, T.SUBTITLE);
  // THE T.SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — `height - PAD`, the same inset the title
  // hangs off at the top, on the same x. See chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin".
  // The credit was drawn as ONE unwrapped line. At a 2.2x type scale it measures past the frame's
  // right margin, and an unwrapped constant is exactly what clips a credit in silence. It wraps on
  // the real frame width now, and its LAST line lands on the bottom of the band.
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  const sourceLead = Math.round(T.SOURCE.fontSize * 1.35);
  const sourceBaseline = sourceBottom - (sourceLines.length - 1) * sourceLead;

  // Both gutters measured from the widest string that will really be drawn in them.
  const provisionalYTicks = scaleLinear()
    .domain([
      0,
      Math.max(...panels.flatMap((p) => p.readings.map((r) => r.value))),
    ])
    .nice()
    .ticks(Y_TICK_HINT);
  const yLabelGutter =
    Math.max(
      ...provisionalYTicks.map((t, i) =>
        measureText(formatTick(t, i === provisionalYTicks.length - 1), T.AXIS),
      ),
    ) + T.Y_LABEL_AIR;
  const endGutter =
    Math.max(
      ...panels.map((p) =>
        measureText(
          formatShare(p.readings[p.readings.length - 1].value),
          T.END_LABEL,
        ),
      ),
    ) +
    T.END_DOT +
    // Half to clear the dot, half again so the widest label does not finish flush against the
    // frame's own padding — the first render left it 3px clear, which is measured-correct and still
    // reads as a label about to fall off the page.
    T.END_LABEL_AIR;

  const padding = {
    // The panels start below the LAST HEADER line, never below the source.
    top:
      subtitleTop +
      (subtitleLines.length - 1) * T.SUBTITLE.lead +
      T.HEADER_TO_GRID,
    right: PAD,
    // Grown by the credit's own height plus clear air: it sits on the bottom of the band.
    bottom:
      height - (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR),
    left: PAD + yLabelGutter,
  };
  const columns = columnsFor(
    width - padding.left - padding.right,
    height - padding.top - padding.bottom,
    panels.length,
  );

  const { boxes, yTicks, xTickCandidates } = gridGeometry(panels, {
    width,
    height,
    padding,
    columns,
    columnGap: T.COLUMN_GAP,
    rowGap: T.ROW_GAP,
    panelHeader: T.PANEL_HEADER,
    xAxisBand: T.X_AXIS_BAND,
    endGutter,
  });

  const xTicks = labelledXTicks(
    xTickCandidates,
    (year) => boxes[0].x(year),
    (label) => measureText(label, T.AXIS),
    10,
  );

  const path = d3line<{ cx: number; cy: number }>()
    .x((p) => p.cx)
    .y((p) => p.cy);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
      data-ladder={rungs.join("; ") || "none"}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={subtitleTop + i * T.SUBTITLE.lead}
          fill={muted}
          fontSize={T.SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceBaseline + i * sourceLead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {boxes.map((box) => {
        const last = box.points[box.points.length - 1];
        return (
          <g key={box.panel.country}>
            <text
              x={box.plot.left}
              y={box.plot.top - 8}
              fill={ink}
              fontSize={T.PANEL_TITLE.fontSize}
              fontWeight={T.PANEL_TITLE.fontWeight}
            >
              {box.panel.country}
            </text>

            {yTicks.map((tick, tickIndex) => (
              <g key={tick}>
                <line
                  x1={box.plot.left}
                  x2={box.plot.right}
                  y1={box.y(tick)}
                  y2={box.y(tick)}
                  stroke={grid}
                  strokeWidth={1}
                />
                {box.isLeftColumn && (
                  <text
                    x={box.plot.left - 8}
                    y={box.y(tick) + 4}
                    fill={muted}
                    fontSize={T.AXIS.fontSize}
                    textAnchor="end"
                  >
                    {formatTick(tick, tickIndex === yTicks.length - 1)}
                  </text>
                )}
              </g>
            ))}

            <path
              d={path(box.points) ?? undefined}
              fill="none"
              stroke={accent}
              strokeWidth={T.LINE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={last.cx} cy={last.cy} r={T.END_DOT} fill={accent} />
            {/* The value is ink, never the accent: an accent that clears the 3:1 non-text floor as
                a line can still miss the 4.5:1 text floor as a printed number. */}
            <text
              x={last.cx + T.END_DOT + 5}
              y={last.cy + 4}
              fill={ink}
              fontSize={T.END_LABEL.fontSize}
              fontWeight={T.END_LABEL.fontWeight}
            >
              {formatShare(last.value)}
            </text>

            {box.isBottomRow &&
              xTicks.map((year) => (
                <text
                  key={year}
                  x={box.x(year)}
                  y={box.plot.bottom + 18}
                  fill={muted}
                  fontSize={T.AXIS.fontSize}
                  textAnchor="middle"
                >
                  {year}
                </text>
              ))}
          </g>
        );
      })}
    </svg>
  );
}
