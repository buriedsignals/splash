/**
 * The web beat of "Switzerland's 2024 per-capita CO2 emissions were the 3rd-lowest of 15 European
 * peers" — a lollipop, not a line or a scatter. Coordinates and formatting come from
 * `./lollipop-geometry.ts`. Read `twin-chart-web/references/web-discipline.md` and
 * `twin-chart-beat/references/types/lollipop.md` before changing this file.
 *
 * WHY THIS BEAT'S HOVER IS DELIBERATELY MODEST (read before adding more to it): at 900px wide with
 * only 15 rows, this exact claim's STATIC sibling
 * (`proof/more-lollipop-co2-per-capita/LollipopCo2.tsx`) already has room to print a rounded value
 * label beside every single dot — nothing is omitted the way a 75-point line series or a 21-band
 * pyramid omits detail. `web-discipline.md`'s own rule ("the honest use of interaction here is
 * detail the static frame had to omit, never the same numbers repeated on demand") means this beat
 * must NOT bolt on a tooltip that just restates the same "3.6 t" already printed in ink next to the
 * dot. What genuinely IS omitted: the printed label rounds to one decimal; the source data carries
 * far more precision (Switzerland's own frozen reading is 3.5946856 t, not 3.6). So hover/focus here
 * reveals exactly that — the row's exact unrounded reading — and nothing more dramatic. See
 * `BRIEF.md`'s own "Interaction" section for the plain-language version of this same argument.
 *
 * INTERACTION SHAPE — deliberately NOT this skill's `assets/interaction.mjs` (a line's nearest-by-x
 * mechanic) and NOT `web-income-life-expectancy/scatter-interaction.mjs` (nearest-by-2D-distance
 * over one shared hit area). A lollipop's 15 rows already tile the plot's full height as disjoint
 * bands (`scaleBand`), so there is no "nearest" to resolve at all: one hit-rect PER ROW, each
 * spanning the full plot width and that row's own band height, each independently
 * `tabIndex={0}`/`aria-label`/`data-detail` at build time. `./lollipop-interaction.mjs` (this
 * beat's own script — see its own doc-comment) wires hover/focus/tap on each rect directly, plus
 * ArrowUp/ArrowDown/Home/End to step between rows.
 *
 * Two layouts, not a continuous reflow (`web-discipline.md`, "Responsive behaviour") — the same
 * pattern every other web beat in this corpus keeps, each its own call to this component, SSR'd
 * once at build time.
 */

import {
  formatValue,
  formatValueExact,
  lollipopGeometry,
  verticalSegments,
  type Row,
} from "./lollipop-geometry";

const UNIT = "t";
const YEAR = 2024;
const DOT_RADIUS = 5;
const STEM_WIDTH = 2.5;

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** `WebLayout` lives here, duplicated rather than imported from `ChartWebSeed.tsx` — the same
 *  "duplicate, do not link" ruling that file's own doc-comment states: there is no vendoring path a
 *  story could reach it from outside this dev repository. Fields are this TYPE's own shape (a
 *  category axis + a value axis + per-row bands), not the line seed's (a time axis + a reference
 *  rule). */
export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  category: { fontSize: number; fontWeight: number };
  value: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  /** How many value-axis ticks `lollipopGeometry` asks for at this layout's own width. */
  valueTickHint: number;
  /** The plot's own floor for usable height, independent of how many lines the header wraps to.
   *  The frame's total height is DERIVED from this plus the header block's real height — never a
   *  fixed constant guessed to be tall enough (`ChartWebSeed.tsx`'s own rule for this genre). Tuned
   *  so all 15 rows keep a readable band height at either rung. */
  plotMinHeight: number;
  bottomPad: number;
};

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: Measure,
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measure(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 24, fontWeight: 700, lead: 30 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  category: { fontSize: 14, fontWeight: 400 },
  value: { fontSize: 14, fontWeight: 600 },
  axis: { fontSize: 12 },
  valueTickHint: 5,
  plotMinHeight: 560,
  bottomPad: 54,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 18,
  title: { fontSize: 17, fontWeight: 700, lead: 22 },
  source: { fontSize: 11, fontWeight: 400, lead: 15 },
  category: { fontSize: 11, fontWeight: 400 },
  value: { fontSize: 11, fontWeight: 600 },
  axis: { fontSize: 10 },
  valueTickHint: 3,
  plotMinHeight: 480,
  bottomPad: 40,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

export function LollipopCo2Web({
  rows,
  title,
  source,
  alt,
  ground,
  accent,
  subject,
  ink,
  muted,
  grid,
  measure,
  layout,
}: {
  /** Already sorted descending by value by the caller — this component draws rows in the order
   *  given rather than re-sorting, the same deliberate-ranking-read discipline the static sibling
   *  keeps. */
  rows: Row[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  /** Derived from `ground` by whatever node runner calls this component (`render-web.mjs`'s own
   *  `renderWeb`) — never derived in here. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (rows.length < 3)
    throw new Error(
      `a lollipop beat needs at least three rows, got ${rows.length}`,
    );

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);

  // Both gutters measured from the widest string that will actually be drawn in them — a fixed
  // constant is exactly the failure class `references/types/lollipop.md` names for this type ("has
  // previously truncated category labels because a fixed gutter was too narrow").
  const widestCategory = Math.max(
    ...rows.map((r) => measure(r.country, layout.category)),
  );
  const widestValueLabel = Math.max(
    ...rows.map((r) => measure(formatValue(r.value), layout.value)),
  );

  // The frame's total height is derived, not guessed: header block (fixed above) + a floor for the
  // plot's own usable height + the bottom margin — the exact rule that keeps a wrapped title from
  // silently clipping the plot below it once the frame is narrow (`ChartWebSeed.tsx`'s own rule).
  const plotTop =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  const padding = {
    top: plotTop,
    right: pad + 14 + widestValueLabel,
    bottom: layout.bottomPad,
    left: pad + 10 + widestCategory,
  };

  const { plot, zeroX, points, ticks } = lollipopGeometry(rows, {
    width,
    height,
    padding,
    tickHint: layout.valueTickHint,
  });
  const tickLabels = ticks.map((t, i, all) =>
    i === all.length - 1 ? `${t.value} ${UNIT}` : `${t.value}`,
  );

  // Each row's own value-label span, measured — the box the gridline-collision check below tests
  // against, ported from the static beat's own fix (`lollipop-geometry.ts`'s own doc-comment).
  const labelSpans = points.map((p) => {
    const start = p.dotX + DOT_RADIUS + 8;
    const w = measure(formatValue(p.value), layout.value);
    return { rowY: p.rowY, start, end: start + w };
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="chart"
      data-layout={layout.name}
      fontFamily="Helvetica, Arial, sans-serif"
    >
      {/* No root role="img" — this genre's one deliberate departure from the static genre's
          accessibility pattern (`web-discipline.md`): that role would flatten every child into one
          opaque image, silencing the 15 individually-focusable, individually-labelled row hit-rects
          below. `<desc>` still carries the alt text. */}
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={titleBaseline + i * layout.title.lead}
          fill={ink}
          fontSize={layout.title.fontSize}
          fontWeight={layout.title.fontWeight}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={sourceBaseline + i * layout.source.lead}
          fill={muted}
          fontSize={layout.source.fontSize}
        >
          {line}
        </text>
      ))}

      {/* Value-axis gridlines, vertical because the value axis runs left-to-right. Each one is cut
          into segments that skip any row whose own value label sits at this x — the same
          "drop the competing line" fix the static sibling shipped after a real defect (see
          `lollipop-geometry.ts`'s own doc-comment on `verticalSegments`). */}
      {ticks.map((tick, i) => {
        const gaps: [number, number][] = labelSpans
          .filter((span) => tick.x >= span.start - 2 && tick.x <= span.end + 2)
          .map((span) => [span.rowY - 11, span.rowY + 11]);
        const segments = verticalSegments(plot.top, plot.bottom, gaps);
        return (
          <g key={tick.value}>
            {segments.map(([y1, y2]) => (
              <line
                key={y1}
                x1={tick.x}
                x2={tick.x}
                y1={y1}
                y2={y2}
                stroke={grid}
                strokeWidth={1}
              />
            ))}
            <text
              x={tick.x}
              y={plot.bottom + 22}
              fill={muted}
              fontSize={layout.axis.fontSize}
              textAnchor="middle"
            >
              {tickLabels[i]}
            </text>
          </g>
        );
      })}
      {/* The zero baseline every stem starts from — the length-encoding floor this type inherits
          from bars and is not allowed to relax (`references/types/lollipop.md`). */}
      <line
        x1={zeroX}
        x2={zeroX}
        y1={plot.top}
        y2={plot.bottom}
        stroke={muted}
        strokeWidth={1}
      />

      {/* Every row's furniture — category label, stem, dot, rounded value label — drawn
          unconditionally, exactly as the static sibling draws it. None of this is gated behind
          interaction: `web-discipline.md`, "What must not become interactive." */}
      {points.map((p) => {
        const isSubject = p.country === subject;
        const markColour = isSubject ? accent : muted;
        return (
          <g key={p.country}>
            <text
              x={plot.left - 10}
              y={p.rowY + 5}
              fill={ink}
              fontSize={layout.category.fontSize}
              fontWeight={layout.category.fontWeight}
              textAnchor="end"
            >
              {p.country}
            </text>
            <line
              x1={zeroX}
              x2={p.dotX}
              y1={p.rowY}
              y2={p.rowY}
              stroke={markColour}
              strokeWidth={STEM_WIDTH}
              strokeLinecap="round"
            />
            <circle cx={p.dotX} cy={p.rowY} r={DOT_RADIUS} fill={markColour} />
            {/* The label carries the value, the mark carries the hue — never the same colour, even
                on the subject's own row (`references/types/lollipop.md`, "The accessibility trap":
                a hue that reads fine on a thin stem has previously measured under WCAG's 4.5:1
                floor as running text). */}
            <text
              x={p.dotX + DOT_RADIUS + 8}
              y={p.rowY + 5}
              fill={ink}
              fontSize={layout.value.fontSize}
              fontWeight={layout.value.fontWeight}
            >
              {formatValue(p.value)}
            </text>
          </g>
        );
      })}

      {/* Interaction layer — one hit-rect PER ROW, spanning the full plot width and that row's own
          band height, invisible at rest. `tabIndex`, `aria-label` and `data-detail` (the
          full-precision reading this genre's own hover honestly adds — see this file's own
          doc-comment) are all baked in server-side, so the no-JS frame is still keyboard-reachable
          row by row with `./lollipop-interaction.mjs` absent entirely. That script (inlined by
          `render-web.mjs`'s own `patchForThisBeat`) only ever touches a `.row-hit`'s own class and
          the shared `#tooltip` — it has no code path that can hide or move anything drawn above. */}
      {points.map((p) => (
        <rect
          key={p.country}
          className="row-hit"
          x={plot.left}
          y={p.bandTop}
          width={plot.right - plot.left}
          height={p.bandHeight}
          fill="transparent"
          pointerEvents="all"
          tabIndex={0}
          role="img"
          aria-label={`${p.country}: ${formatValueExact(p.value)}, ${YEAR}`}
          data-country={p.country}
          data-detail={`${p.country} · ${formatValueExact(p.value)} (${YEAR})`}
        />
      ))}
    </svg>
  );
}
