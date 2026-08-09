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
} from "#shared/twin-chart-beat/render-still.mjs";

export type Panel = {
  country: string;
  readings: { year: number; value: number }[];
};

const FRAME = { width: 900, height: 620 };
const PAD = 40;
const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SUBTITLE = { fontSize: 15, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const PANEL_TITLE = { fontSize: 15, fontWeight: 700 };
const AXIS = { fontSize: 12, fontWeight: 400 };
const END_LABEL = { fontSize: 13, fontWeight: 700 };

const COLUMNS = 3;
const COLUMN_GAP = 30;
const ROW_GAP = 36;
/** Space above each panel's plot box for that panel's own country name. */
const PANEL_HEADER = 22;
/** Space under the bottom row for the shared x tick labels. */
const X_AXIS_BAND = 24;
const Y_TICK_HINT = 4;
const X_TICK_HINT = 6;
const LINE_WIDTH = 2.5;
const END_DOT = 3.5;

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
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const subtitleTop = titleBaseline + (titleLines.length - 1) * TITLE.lead + 26;
  const subtitleLines = wrap(subtitle, width - PAD * 2, SUBTITLE);
  const sourceBaseline =
    subtitleTop + (subtitleLines.length - 1) * SUBTITLE.lead + 24;

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
        measureText(formatTick(t, i === provisionalYTicks.length - 1), AXIS),
      ),
    ) + 8;
  const endGutter =
    Math.max(
      ...panels.map((p) =>
        measureText(
          formatShare(p.readings[p.readings.length - 1].value),
          END_LABEL,
        ),
      ),
    ) +
    END_DOT +
    // 5 to clear the dot, 5 more so the widest label does not finish flush against the frame's
    // own padding — the first render left it 3px clear, which is measured-correct and still
    // reads as a label about to fall off the page.
    10;

  const padding = {
    top: sourceBaseline + 30,
    right: PAD,
    bottom: PAD,
    left: PAD + yLabelGutter,
  };

  const { boxes, yTicks, xTickCandidates } = gridGeometry(panels, {
    width,
    height,
    padding,
    columns: COLUMNS,
    columnGap: COLUMN_GAP,
    rowGap: ROW_GAP,
    panelHeader: PANEL_HEADER,
    xAxisBand: X_AXIS_BAND,
    endGutter,
  });

  const xTicks = labelledXTicks(
    xTickCandidates,
    (year) => boxes[0].x(year),
    (label) => measureText(label, AXIS),
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
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={subtitleTop + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      <text x={PAD} y={sourceBaseline} fill={muted} fontSize={SOURCE.fontSize}>
        {source}
      </text>

      {boxes.map((box) => {
        const last = box.points[box.points.length - 1];
        return (
          <g key={box.panel.country}>
            <text
              x={box.plot.left}
              y={box.plot.top - 8}
              fill={ink}
              fontSize={PANEL_TITLE.fontSize}
              fontWeight={PANEL_TITLE.fontWeight}
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
                    fontSize={AXIS.fontSize}
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
              strokeWidth={LINE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={last.cx} cy={last.cy} r={END_DOT} fill={accent} />
            {/* The value is ink, never the accent: an accent that clears the 3:1 non-text floor as
                a line can still miss the 4.5:1 text floor as a printed number. */}
            <text
              x={last.cx + END_DOT + 5}
              y={last.cy + 4}
              fill={ink}
              fontSize={END_LABEL.fontSize}
              fontWeight={END_LABEL.fontWeight}
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
                  fontSize={AXIS.fontSize}
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
