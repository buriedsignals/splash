/**
 * The web beat of "every one of these ten countries added years of life expectancy between 2000
 * and 2023" — a dumbbell, not a line, not a scatter. Geometry comes from
 * `./dumbbell-geometry.ts`; this file adds the one thing neither the static frame nor a video
 * build has — a reader who can ask ANY of the ten rows its own gap and get an exact answer back,
 * without anything the static frame already states being gated behind that ask. Read
 * `twin-chart-web/references/web-discipline.md` and `twin-chart-beat/references/types/dumbbell.md`
 * before changing this file.
 *
 * The structural departure from `web-income-life-expectancy/IncomeLifeExpectancyWeb.tsx` (a
 * scatter): there, the hit-test resolves a pointer position to the NEAREST of ~164 freely
 * scattered points, because two points can sit close together in both axes. Here there is
 * nothing to resolve "nearest" for: each of the ten rows already owns one non-overlapping
 * horizontal band (`dumbbell-geometry.ts`'s own `bandTop`/`bandBottom`, from `scaleBand`). So this
 * beat draws TEN hit-rects directly — one per row, spanning the full plot width and that row's
 * own band height — each wired straight to its own pointer/focus events by
 * `dumbbell-interaction.mjs`. No shared `.hit-area` overlay, no distance calculation.
 *
 * `data-detail` LEADS with the row's own GAP, not the two endpoint values: the static frame
 * already prints both endpoint values in ink beside their own dots (2000 in blue, 2023 in
 * vermillion), so repeating them as the headline of a hover would be exactly the anti-pattern
 * `web-discipline.md` names — "the same numbers repeated on demand". What the static frame could
 * NOT print, for 8 of the 10 rows, is the gap itself (only the two rows the title happens to name,
 * Poland and the United States, have their gap stated anywhere in prose). `describeRow` below
 * folds the two already-visible endpoint values back in as a parenthetical confirmation, never the
 * headline — see this file's own header and `BRIEF.md`'s "Interaction" section for the reasoning
 * in full.
 *
 * Two layouts, not a continuous reflow (`web-discipline.md`, "Responsive behaviour"), the same
 * pattern every other web beat in this skill keeps — one hand-authored `WebLayout` per rung,
 * each SSR'd once at build time, a CSS media query alone picking between them.
 */

import { dumbbellGeometry, type Row } from "./dumbbell-geometry";

const UNIT = "years";
/** Two CVD-safe hues, capped at exactly two per `references/types/dumbbell.md` — the same pair
 *  the static sibling uses, one per year, reused consistently across every row so a reader learns
 *  "which dot is which series" once. */
const COLOURS = { y2000: "#0072B2", y2023: "#D55E00" };

/** `WebLayout` lives here, not imported from `twin-chart-web/assets/ChartWebSeed.tsx` — that
 *  type describes the LINE genre's own mechanics (a reference rule, a peak marker, single-series
 *  tick hints), and this beat's own shape (a legend, a category-label gutter, per-row bands) is
 *  different data. The same "duplicate, do not link" ruling this project applies elsewhere
 *  (`twin-chart-web/SKILL.md`'s own doc-comment on `ChartWebSeed.tsx`): a type definition is the
 *  cheapest thing there is to duplicate. */
export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  legend: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  categoryLabel: { fontSize: number; fontWeight: number };
  valueLabel: { fontSize: number; fontWeight: number };
  /** How many x ticks `scale.ticks` derives at this layout's own width. */
  xTickHint: number;
  /** The plot's own floor for usable height, independent of how many lines the header wraps to.
   *  The frame's total height is DERIVED from this plus the header block's real height — never a
   *  fixed constant guessed to be tall enough for ten rows plus a wrapped title, the exact rule
   *  `ChartWebSeed.tsx` states for its own single-series frame, applied here to a ten-row plot. */
  plotMinHeight: number;
  bottomPad: number;
};

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Wrap on the measured width of the real string, never on a character count — the exact bug
 *  `web-discipline.md`'s own header note names: a sentence-length line clipped clean off the
 *  narrow layout's right edge the first time that genre's first beat was actually driven. */
function wrap(
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

function formatValue(v: number): string {
  return v.toFixed(1);
}

/**
 * `data-detail`/`aria-label`'s exact shape for one row. Exported so `render-web.mjs`'s own
 * verification note and a reader of this file can check the exact string hover/focus produces,
 * not just that hover does something. `detail` is the short string the visual tooltip shows,
 * leading with the gap; `label` is the fuller sentence assistive tech reads via `aria-label`
 * (present even with the script absent, per `web-discipline.md`'s "Keyboard and touch").
 */
export function describeRow(r: Row): { detail: string; label: string } {
  const gap = `+${r.gap.toFixed(1)} ${UNIT}`;
  const detail = `${r.country}: ${gap} (${formatValue(r.y2000)} → ${formatValue(r.y2023)})`;
  const label =
    `${r.country}: gained ${r.gap.toFixed(1)} years of life expectancy, from ` +
    `${formatValue(r.y2000)} years in 2000 to ${formatValue(r.y2023)} years in 2023`;
  return { detail, label };
}

export function DumbbellLifeExpectancyGainsWeb({
  rows,
  title,
  source,
  alt,
  ground,
  ink,
  muted,
  grid,
  measure,
  layout,
}: {
  /** Must already be sorted by gap, descending — see `dumbbell-geometry.ts`'s own doc-comment.
   *  This component draws whatever order it is handed and does not re-sort. */
  rows: Row[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  /** Derived from `ground` by `deriveFurniture`, in whatever node runner calls this component
   *  (`twin-chart-web/scripts/render-web.mjs`'s `renderWeb`) — never derived in here. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  layout: WebLayout;
}) {
  if (rows.length < 2)
    throw new Error(
      `a dumbbell beat needs at least two rows, got ${rows.length}`,
    );

  const { width, pad } = layout;

  // The header is laid out first — title, then source, then the legend — because the plot starts
  // where the header stops, exactly the order the static sibling and `ChartWebSeed.tsx` both use.
  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const legendBaseline =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.source.lead * 1.4);

  // The frame's total height is derived, not guessed: header block (already fixed above) + a
  // floor for the plot's own usable height + the bottom margin — see this file's own `WebLayout`
  // doc-comment on `plotMinHeight`.
  const plotTop = legendBaseline + Math.round(layout.title.lead * 0.9);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  // The category gutter is measured from the widest name actually drawn — the type sheet's own
  // named failure mode (`references/types/dumbbell.md`, "The one thing that goes wrong"): this
  // chart has, in production, shipped with zero reserved space for this column before. Both value
  // gutters are measured the same way, since value labels sit on the OUTER side of each dot and
  // both frame edges need room reserved for the widest label that could land there.
  const categoryGutter = Math.max(
    ...rows.map((r) => measure(r.country, layout.categoryLabel)),
  );
  const leftLabelGutter = Math.max(
    ...rows.map((r) => measure(formatValue(r.y2000), layout.valueLabel)),
  );
  const rightLabelGutter = Math.max(
    ...rows.map((r) => measure(formatValue(r.y2023), layout.valueLabel)),
  );

  const padding = {
    top: plotTop,
    right: pad + 10 + rightLabelGutter,
    bottom: layout.bottomPad,
    left: pad + categoryGutter + 18 + 10 + leftLabelGutter,
  };

  const { plot, dots, ticksX } = dumbbellGeometry(rows, {
    width,
    height,
    padding,
    xTickHint: layout.xTickHint,
  });

  const legendGap = layout.name === "narrow" ? 74 : 90;

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
          accessibility pattern (`web-discipline.md`): that role would flatten every child into
          one opaque image, silencing the ten individually-focusable, individually-labelled
          hit-rects below. */}
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

      {/* Load-bearing legend, not decorative: with no time-axis convention telling left from
          right, the two dot colours are the ONLY thing naming which series is which, on every
          single row (`references/types/dumbbell.md`, "The accessibility trap"). Drawn
          unconditionally, exactly like the static sibling — the web genre adds interaction on top
          of this, it never gates it behind interaction (`web-discipline.md`, "What must not
          become interactive"). */}
      <circle cx={pad + 6} cy={legendBaseline - 4} r={6} fill={COLOURS.y2000} />
      <text
        x={pad + 18}
        y={legendBaseline}
        fill={ink}
        fontSize={layout.legend.fontSize}
        fontWeight={layout.legend.fontWeight}
      >
        2000
      </text>
      <circle
        cx={pad + legendGap}
        cy={legendBaseline - 4}
        r={6}
        fill={COLOURS.y2023}
      />
      <text
        x={pad + legendGap + 12}
        y={legendBaseline}
        fill={ink}
        fontSize={layout.legend.fontSize}
        fontWeight={layout.legend.fontWeight}
      >
        2023
      </text>

      {/* Vertical gridlines on the shared value scale — decoration, not a competing mark. The
          unit is stated once, on the rightmost tick actually drawn. */}
      {ticksX.map((tick, i) => (
        <g key={tick.value}>
          <line
            x1={tick.x}
            x2={tick.x}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={tick.x}
            y={plot.bottom + 22}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="middle"
          >
            {i === ticksX.length - 1 ? `${tick.value} ${UNIT}` : tick.value}
          </text>
        </g>
      ))}

      {dots.map((d) => (
        <g key={d.country}>
          {/* Category label, left-aligned in its own measured column. */}
          <text
            x={pad}
            y={d.rowY + 5}
            fill={ink}
            fontSize={layout.categoryLabel.fontSize}
            fontWeight={layout.categoryLabel.fontWeight}
          >
            {d.country}
          </text>

          {/* The connector reads as neutral scaffolding, not a third mark competing with the two
              dots — its whole job is to make the gap visible as a length. */}
          <line
            x1={d.x2000}
            x2={d.x2023}
            y1={d.rowY}
            y2={d.rowY}
            stroke={muted}
            strokeWidth={2}
            strokeLinecap="round"
          />

          <circle cx={d.x2000} cy={d.rowY} r={6} fill={COLOURS.y2000} />
          <circle cx={d.x2023} cy={d.rowY} r={6} fill={COLOURS.y2023} />

          {/* Value labels on the OUTER side of each dot, in ink — never in either dot's own
              accent colour, which has previously failed WCAG contrast here
              (`references/types/dumbbell.md`, "The accessibility trap"). Drawn unconditionally:
              interaction adds the row's own GAP on top, it never gates these two numbers. */}
          <text
            x={d.x2000 - 10}
            y={d.rowY + 5}
            fill={ink}
            fontSize={layout.valueLabel.fontSize}
            fontWeight={layout.valueLabel.fontWeight}
            textAnchor="end"
          >
            {formatValue(d.y2000)}
          </text>
          <text
            x={d.x2023 + 10}
            y={d.rowY + 5}
            fill={ink}
            fontSize={layout.valueLabel.fontSize}
            fontWeight={layout.valueLabel.fontWeight}
            textAnchor="start"
          >
            {formatValue(d.y2023)}
          </text>
        </g>
      ))}

      {/* Interaction layer: one hit-rect per row, spanning the full plot width and that row's own
          band height (`d.bandTop`/`d.bandBottom`, from `dumbbell-geometry.ts`'s `scaleBand`) —
          never a shared overlay, because each row already owns a non-overlapping band, so there
          is nothing to resolve "nearest". `tabIndex`, `aria-label` and `data-detail` are baked in
          at build time — the no-JS frame is still keyboard-reachable, row by row, with the script
          absent entirely (`web-discipline.md`, "Keyboard and touch"). `data-detail` LEADS with
          the row's own gap — see this file's own doc-comment and `describeRow` above.
          `dumbbell-interaction.mjs` (this beat's own, not the line genre's `interaction.mjs`)
          only ever touches these rects' own `class` and the shared `#tooltip`; it has no code
          path that can hide or move the title, the legend, the connectors, the dots or either
          value label. */}
      {dots.map((d, i) => {
        const { detail, label } = describeRow(d);
        return (
          <rect
            key={`hit-${d.country}`}
            className="hit-row"
            x={plot.left}
            y={d.bandTop}
            width={plot.right - plot.left}
            height={d.bandBottom - d.bandTop}
            fill="transparent"
            pointerEvents="all"
            tabIndex={0}
            role="img"
            aria-label={label}
            data-country={d.country}
            data-detail={detail}
            data-row={i}
          />
        );
      })}
    </svg>
  );
}

/** The two rungs, in render order — handed to `twin-chart-web/scripts/render-web.mjs`'s generic
 *  `renderWeb` by this beat's own `render-web.mjs`. Tuned for ten rows and the widest country
 *  name in this dataset ("United Kingdom" / "United States"), not this genre's general defaults —
 *  a different beat with more/fewer rows or longer names writes its own numbers. */
export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 22, fontWeight: 700, lead: 28 },
  source: { fontSize: 14, fontWeight: 400, lead: 20 },
  legend: { fontSize: 13, fontWeight: 600 },
  axis: { fontSize: 12 },
  categoryLabel: { fontSize: 14, fontWeight: 600 },
  valueLabel: { fontSize: 13, fontWeight: 600 },
  xTickHint: 5,
  plotMinHeight: 520,
  bottomPad: 50,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 18,
  title: { fontSize: 17, fontWeight: 700, lead: 22 },
  source: { fontSize: 11, fontWeight: 400, lead: 15 },
  legend: { fontSize: 11, fontWeight: 600 },
  axis: { fontSize: 10 },
  categoryLabel: { fontSize: 11, fontWeight: 600 },
  valueLabel: { fontSize: 10, fontWeight: 600 },
  xTickHint: 3,
  plotMinHeight: 430,
  bottomPad: 40,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];
