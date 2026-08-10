/**
 * The web beat of "every one of these ten countries added years of life expectancy between 2000 and
 * 2023" — a dumbbell. Coordinates come from `./dumbbell-geometry.ts`. Read
 * `chart-web/references/web-discipline.md` and `chart-beat/references/types/dumbbell.md`
 * before changing this file.
 *
 * MIGRATED TO THE FLUID FRAME (`web-discipline.md`, "Responsive behaviour", second build). This
 * beat used to ship two pre-rendered rungs — a 900px `DESKTOP_LAYOUT` and a 360px `NARROW_LAYOUT`
 * swapped by a media query. That design is overturned: there is now ONE `WebFrame`, SSR'd once, and
 * the `<svg>` below carries GEOMETRY ONLY — not one `<text>` element. Every word (title, source,
 * the legend, the ten country names, both value labels on every row, the value-axis ticks) is plain
 * HTML at a FIXED pixel font size, positioned by `%` over or beside the same grid cell the `<svg>`
 * occupies. Geometry stretches; type does not.
 *
 * FOUR COLUMNS, NOT TWO — this beat's own departure from the seed's grid, and the reason is the
 * type sheet's own named failure mode (`references/types/dumbbell.md`, "The one thing that goes
 * wrong": this chart has shipped with zero reserved space for its category column). A dumbbell row
 * carries THREE fixed-pixel things around a fluid plot: the country name, the 2000 value printed
 * OUTSIDE the left dot, and the 2023 value printed OUTSIDE the right dot. The value labels sit at
 * their own dots' `%` (so they track the stretch for free) and overflow into fixed-pixel tracks
 * reserved either side of the plot — `--lv-gutter` on the left, `--rv-gutter` on the right, both
 * measured in node from the widest string that will actually land there. The names get the first
 * track. Without the reserved tracks the outermost label runs off the frame at 375px, which is
 * exactly the defect class this genre's gotcha section says only a screenshot ever catches.
 *
 * THE ROW-HEIGHT FLOOR. Height follows width through `aspect-ratio`, which is right for a line
 * chart and wrong for ten stacked rows: at 375px that leaves rows about 20px apart, under the point
 * where a 14px name and two 13px numbers read as one row rather than a smear. `.chart-plot` carries
 * an inline `min-height` of `rows x MIN_ROW_PX`, this beat's own version of the genre's
 * `PLOT_FLOOR_PX`. The `<svg>`'s `preserveAspectRatio="none"` absorbs the difference.
 *
 * NUMBER LOCALE. This beat's words are English and its `<html lang>` is patched to `en`, so its
 * figures are English too: `formatYears` prints `78.4` with a decimal POINT. There is no `fr` in
 * this beat, and the formatter is named for what it returns — years to one decimal — not for a
 * locale. The detail layer uses `formatYearsFine`, the same rule one decimal finer, and derives its
 * gain by subtracting the two numbers it prints, so no tooltip can contradict its own arithmetic.
 *
 * INTERACTION: one hit-rect per row, never a shared nearest-point overlay — each row already owns a
 * non-overlapping `scaleBand` band, so there is nothing to resolve "nearest". `data-detail` LEADS
 * with the row's own GAP, the one reading neither printed number states.
 *
 * This component never imports the rasteriser: `ink`/`muted`/`grid`/`measure` are props, derived
 * once in node by whatever runner calls it.
 */

import { dumbbellGeometry, type Row } from "./dumbbell-geometry";

const UNIT = "years";
/** The unit, stated ONCE under the title instead of being appended to the last axis tick. It used
 *  to ride on that tick ("84 years"), which made one label four times wider than its neighbours —
 *  and at 375px, where the plot column is about 140px wide, that one wide label measurably
 *  overlapped the tick before it. Caught by driving the page, not by reading it. */
const CAVEAT = "Life expectancy at birth, in years.";
const DOT_RADIUS = 6;
/** The plot's own inset, in canonical SVG user units, so an end dot's own mark is never clipped in
 *  half by the `viewBox` edge. The LABEL beyond it is HTML and lands in a reserved gutter. */
const DOT_INSET = 8;
/** The row-height floor, in CSS pixels — see this file's own doc-comment. */
const MIN_ROW_PX = 30;

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** `WebFrame` is declared here, duplicated rather than imported from `ChartWebSeed.tsx` — the same
 *  "duplicate, do not link" ruling that file states (a compile-time-only type with no vendoring
 *  path a story could reach). Fields are this TYPE's own shape: a category axis of rows, one shared
 *  value axis, a legend that names the two hues. */
export type WebFrame = {
  /** The plot rectangle's canonical width/height, in SVG user units — proportions and tick density
   *  only, never a rendered pixel cap. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot for the value-axis tick labels. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  source: { fontSize: number };
  legend: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  category: { fontSize: number; fontWeight: number };
  value: { fontSize: number; fontWeight: number };
  /** How many x ticks the shared value scale is hinted to produce. Decided ONCE, at the canonical
   *  width — never re-derived as the frame stretches. */
  xTickHint: number;
};

export const FRAME: WebFrame = {
  width: 820,
  height: 440,
  xAxisRowPx: 26,
  title: { fontSize: 22, fontWeight: 700 },
  source: { fontSize: 13 },
  legend: { fontSize: 13, fontWeight: 600 },
  axis: { fontSize: 12 },
  category: { fontSize: 13, fontWeight: 600 },
  value: { fontSize: 12, fontWeight: 600 },
  xTickHint: 5,
};

/** Years to one decimal — English, matching this beat's own declared language. Named for what it
 *  returns, not for a locale it does not implement. */
export function formatYears(v: number): string {
  return v.toFixed(1);
}

/** The DETAIL layer's precision: one decimal finer than the frame's printed endpoints. */
export function formatYearsFine(v: number): string {
  return v.toFixed(2);
}

/**
 * The tooltip line and the screen-reader label for one row.
 *
 * THE GAIN IS SUBTRACTED FROM THE TWO NUMBERS THE STRING SHOWS, never rounded separately from
 * them. Rounding three quantities independently does not reconcile, and it did not: on 2 of these
 * 10 rows the string invited a subtraction that contradicted its own answer — "Switzerland: +4.1
 * years (79.8 → 84.0)", where 84.0 − 79.8 is 4.2, and "Netherlands: +4.0 years (78.1 → 82.2)",
 * where the difference is 4.1. Both gains were correctly rounded from the raw difference (4.1196
 * and 4.0276); the endpoints were correctly rounded too; the string was still wrong, because a
 * reader can only subtract what they are shown.
 *
 * Measured over these ten rows: independent rounding leaves 2 rows broken at one decimal, 3 at two
 * and 3 at three, and only reconciles at four — the source's own precision. So the fix is not more
 * digits, it is deriving the gain from the printed endpoints, which reconciles by construction at
 * any precision. Two decimals here (`formatYearsFine`), one finer than the frame prints, so hover
 * still adds something the frame does not; the derived gain then differs from the raw gain by at
 * most 0.01 years — under four days, against a life-expectancy estimate — and the rank order of
 * the ten derived gains is identical to the raw order the rows are sorted in (checked: strictly
 * decreasing, 4.98 → 2.49).
 */
export function describeRow(r: Row): { detail: string; label: string } {
  const from = Number(formatYearsFine(r.y2000));
  const to = Number(formatYearsFine(r.y2023));
  const gain = formatYearsFine(to - from);
  const detail = `${r.country}: +${gain} ${UNIT} (${formatYearsFine(r.y2000)} → ${formatYearsFine(r.y2023)})`;
  const label =
    `${r.country}: gained ${gain} years of life expectancy, from ` +
    `${formatYearsFine(r.y2000)} years in 2000 to ${formatYearsFine(r.y2023)} years in 2023`;
  return { detail, label };
}

/** `value / total` as a percentage, one decimal — puts an HTML label on the exact spot the SVG
 *  geometry it annotates was drawn at, as a fraction of the SAME box, so it tracks the stretch. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
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
  frame,
  colours,
}: {
  /** Must already be sorted by gap, descending — this component draws whatever order it is handed
   *  and does not re-sort. */
  rows: Row[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  /** Derived from `ground` by `deriveFurniture` in whatever node runner calls this component —
   *  never derived in here. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
  /** The two ENDPOINT hues, handed in by the runner from the recorded `PALETTE.md` via
   *  `seriesInks`. These were a module-level `{ y2000: "#0072B2", y2023: "#D55E00" }` here until
   *  2026-08-10 — Okabe-Ito blue and vermillion, described in that comment as "the pair this
   *  project uses wherever two categories must be told apart by colour alone", which is exactly the
   *  argument, and exactly the reason the ANSWER cannot live in this file: a newsroom that records
   *  its own pair could not reach it. The argument still stands — a dumbbell's two dots share a row
   *  and a scale, so colour is the only thing separating them, and the pair has to hold apart under
   *  every colour-vision deficiency, which is why they are separated by hue rather than lightness. */
  colours: { y2000: string; y2023: string };
}) {
  if (rows.length < 2)
    throw new Error(
      `a dumbbell beat needs at least two rows, got ${rows.length}`,
    );

  // Three fixed tracks, each MEASURED from the widest string that will actually be drawn in it, at
  // its own fixed font size — never a constant. Both value gutters are measured separately because
  // the two series' labels are not the same width.
  const catGutterPx =
    12 + Math.max(...rows.map((r) => measure(r.country, frame.category)));
  const leftGutterPx =
    12 +
    Math.max(...rows.map((r) => measure(formatYears(r.y2000), frame.value)));
  const rightGutterPx =
    12 +
    Math.max(...rows.map((r) => measure(formatYears(r.y2023), frame.value)));

  const { plot, dots, ticksX } = dumbbellGeometry(rows, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: DOT_INSET, bottom: 0, left: DOT_INSET },
    xTickHint: frame.xTickHint,
  });

  const totalWidth = catGutterPx + leftGutterPx + frame.width + rightGutterPx;
  const totalHeight = frame.height + frame.xAxisRowPx;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--y2000" as string]: colours.y2000,
        ["--y2023" as string]: colours.y2023,
        // Fixed CSS pixel type sizes, threaded as custom properties. None of these ever changes
        // with the viewBox's width — that is the whole point of the redesign.
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.source.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.value.fontSize}px`,
        ["--label-weight" as string]: frame.value.fontWeight,
        ["--note-size" as string]: `${frame.axis.fontSize}px`,
        ["--cat-size" as string]: `${frame.category.fontSize}px`,
        ["--cat-weight" as string]: frame.category.fontWeight,
        ["--legend-size" as string]: `${frame.legend.fontSize}px`,
        ["--legend-weight" as string]: frame.legend.fontWeight,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{CAVEAT}</p>
      </div>

      {/* Load-bearing legend, not decoration: with no time-axis convention telling left from right,
          the two dot colours are the ONLY thing naming which series is which, on every single row
          (`references/types/dumbbell.md`, "The accessibility trap"). Plain HTML, outside the
          overlay and NOT `aria-hidden`, because nothing else in this frame states it. */}
      <div className="chart-legend">
        <span className="legend-key">
          <span
            className="legend-swatch"
            style={{ background: colours.y2000 }}
          />
          2000
        </span>
        <span className="legend-key">
          <span
            className="legend-swatch"
            style={{ background: colours.y2023 }}
          />
          2023
        </span>
      </div>

      <div
        className="chart-plot dumbbell"
        style={{
          ["--cat-gutter" as string]: `${catGutterPx}px`,
          ["--lv-gutter" as string]: `${leftGutterPx}px`,
          ["--rv-gutter" as string]: `${rightGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
          // This beat's own floor — see the doc-comment. Overrides the genre stylesheet's generic
          // PLOT_FLOOR_PX, which is sized for a single-line frame, not ten stacked rows.
          minHeight: `${rows.length * MIN_ROW_PX}px`,
        }}
      >
        <div className="y-axis">
          {dots.map((d) => (
            <span
              key={d.country}
              className="axis-label y cat"
              style={{ top: `${pct(d.rowY, frame.height)}%` }}
            >
              {d.country}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>`. */}
        <svg
          // Named `group`, not `img` — see the note in `SlopeWeb.tsx`: the root used to come back
          // from Chrome's AX tree as `SvgRoot` with `name: ""`, and `group` names it without
          // raising the ARIA children-presentational question `img` raises.
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          preserveAspectRatio="none"
        >
          {/* `role="group"`, not `role="img"` — see `SlopeWeb.tsx`'s note: the reason recorded here
              was measured and is not what Chrome does, and `group` names the graphic without
              raising the question. `<desc>` still carries the alt text. */}
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {/* Vertical gridlines on the shared value scale — decoration, not a competing mark. Their
              own tick VALUES are HTML, in the x-axis row below. */}
          {ticksX.map((tick) => (
            <line
              key={tick.value}
              x1={tick.x}
              x2={tick.x}
              y1={plot.top}
              y2={plot.bottom}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* The connector reads as neutral scaffolding, not a third mark competing with the two
              dots — its whole job is to make the gap visible as a length. */}
          {dots.map((d) => (
            <line
              key={d.country}
              x1={d.x2000}
              x2={d.x2023}
              y1={d.rowY}
              y2={d.rowY}
              stroke={muted}
              strokeWidth={2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Interaction layer: one hit-rect per row, spanning the full plot width and that row's
              own band height. `tabIndex`, `aria-label` and `data-detail` are baked in at build time
              — the no-JS frame is still keyboard-reachable, row by row, with the script absent
              entirely. `dumbbell-interaction.mjs` only ever touches these rects' own class and the
              shared `#tooltip`. */}
          {dots.map((d, i) => {
            const { detail, label } = describeRow(d);
            return (
              <rect
                key={`hit-${d.country}`}
                className="hit-row"
                x={0}
                y={d.bandTop}
                width={frame.width}
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

        {/* HTML overlay — the same grid cell as the `<svg>`, so a `%` lands on the exact dot it
            annotates at any width. `aria-hidden`: both printed values and the gap are already
            carried by each row's own `aria-label` above.
            THE DOTS LIVE HERE, not in the `<svg>`: a `<circle>` inside a
            `preserveAspectRatio="none"` viewBox is scaled independently on each axis, so it reads
            as a wide oval at 1600px and collapses to a sliver at 375px — a dumbbell whose dots are
            slivers is a set of bare connectors. As HTML they are a FIXED pixel size at every
            width, positioned by the same `%` as every label. The connector stays in the `<svg>`:
            its LENGTH is the reading, and `vector-effect` already holds its thickness constant. */}
        <div className="overlay" aria-hidden="true">
          {dots.map((d) => (
            <span
              key={`d2000-${d.country}`}
              className="dot"
              style={{
                left: `${pct(d.x2000, frame.width)}%`,
                top: `${pct(d.rowY, frame.height)}%`,
                width: `${DOT_RADIUS * 2}px`,
                height: `${DOT_RADIUS * 2}px`,
                background: colours.y2000,
              }}
            />
          ))}
          {dots.map((d) => (
            <span
              key={`d2023-${d.country}`}
              className="dot"
              style={{
                left: `${pct(d.x2023, frame.width)}%`,
                top: `${pct(d.rowY, frame.height)}%`,
                width: `${DOT_RADIUS * 2}px`,
                height: `${DOT_RADIUS * 2}px`,
                background: colours.y2023,
              }}
            />
          ))}
          {/* Value labels on the OUTER side of each dot, in ink — never in either dot's own hue,
              which has previously failed WCAG contrast here (`references/types/dumbbell.md`, "The
              accessibility trap"). Drawn unconditionally: interaction adds the row's own GAP on
              top, it never gates these two numbers. */}
          {dots.map((d) => (
            <span
              key={`l2000-${d.country}`}
              className="value-label left"
              style={{
                left: `${pct(d.x2000, frame.width)}%`,
                top: `${pct(d.rowY, frame.height)}%`,
              }}
            >
              {formatYears(d.y2000)}
            </span>
          ))}
          {dots.map((d) => (
            <span
              key={`l2023-${d.country}`}
              className="value-label right"
              style={{
                left: `${pct(d.x2023, frame.width)}%`,
                top: `${pct(d.rowY, frame.height)}%`,
              }}
            >
              {formatYears(d.y2023)}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {ticksX.map((tick, i) => (
            <span
              key={tick.value}
              className="axis-label x"
              style={{ left: `${pct(tick.x, frame.width)}%` }}
            >
              {tick.value}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
