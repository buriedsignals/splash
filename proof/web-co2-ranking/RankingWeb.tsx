/**
 * The web beat of "Switzerland's CO₂ per-capita ranking among ten European economies" — the
 * interactive format.
 *
 * Not a second chart: the coordinates and the number formatting come from `./bar-geometry.ts`. What
 * this file adds is the one thing a static frame cannot have — a reader who can ask a bar for its
 * PRECISE reading and get it back, on top of the rounded value every bar already prints
 * unconditionally (`references/types/bar-and-column.md`: "every bar carries its own value, printed
 * directly outside the bar"). Read `chart-web/references/web-discipline.md` before changing
 * this file.
 *
 * MIGRATED TO THE FLUID FRAME. This file used to ship two pre-rendered widths (900px and 360px)
 * swapped by a media query, handed to the skill's generic `renderWeb` as a `LAYOUTS` array. The
 * owner overturned that design: one frame, filling its container continuously, fitting the visible
 * window. The separation that makes it safe is the one `chart-web/assets/ChartWebSeed.tsx`
 * teaches — the `<svg>` carries GEOMETRY ONLY (bars, the zero baseline, the hit bands; no `<text>`
 * at all), and every word is HTML at a FIXED pixel size, positioned by `%` over the same CSS grid
 * the bars are drawn in. Geometry stretches; type does not.
 *
 * A ranking chart's own shape needs TWO gutters around that geometry — the category names on the
 * left, the printed value at each bar's end on the right — so `render-web.mjs` appends a third grid
 * column for this beat. Both gutters are a fixed pixel width measured from the real strings, so the
 * bars, and only the bars, absorb a wider or a narrower container. And ten rows of names need a real
 * number of CSS pixels whatever the width, which is why the plot carries a measured `min-height`
 * derived from the row this beat actually draws (`minPlotHeightPx`).
 *
 * `deriveFurniture`/`measureText` are not called here — `renderWeb` derives them once in node and
 * threads them in as props (`ink`/`muted`/`measure`).
 *
 * This beat does NOT reuse the skill's `assets/interaction.mjs` — that script resolves a pointer to
 * the NEAREST of many points along one continuous axis, which fits a 75-reading line and does not
 * fit ten already-large, already-labelled bars (there is nothing to interpolate between; every row
 * is its own direct hit target). `render-web.mjs` still calls the skill's generic `renderWeb` (the
 * one way in) and lets it inline `interaction.mjs` as usual: that script finds no `.pt` circles here
 * and is a harmless no-op (`initChart`'s own `if (points.length === 0) return;`). `render-web.mjs`
 * then appends this beat's own small script, `./bar-interaction.mjs`, as a second inline `<script>`,
 * reusing the same shared `#tooltip` element the skill's HTML wrapper already builds.
 */

import { rankingGeometry, en, type Row } from "./bar-geometry";

const UNIT = "t";

/** This format's single fluid frame, in this beat's own shape. Declared here rather than imported
 *  from the skill's seed for the reason that file's own doc-comment gives: a compile-time-only type
 *  has no `#shared/*` vendoring path, and a relative import across the skill boundary hard-codes
 *  this dev repository's own directory layout. Duplicate, do not link. The shape genuinely differs
 *  too — no gridline or tick knobs, because a ranking bar chart's own value labels ARE the reading,
 *  not an axis. */
export type RankingFrame = {
  /** The bar area's canonical width/height in SVG user units — NOT a rendered pixel size and NOT a
   *  cap. It fixes the geometry's internal proportions, which become one `aspect-ratio`; the
   *  browser stretches it from there. */
  width: number;
  height: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  category: { fontSize: number; fontWeight: number };
  value: { fontSize: number; fontWeight: number };
  /** The CSS pixel line height one row's own label occupies, and the air below it, at the shortest
   *  height this beat will render at — together they derive the plot's own `min-height` rather than
   *  a constant guessed to be tall enough. */
  rowLeadPx: number;
  rowAirPx: number;
  /** Fraction of a row's band left as the gap between bars — `bar-and-column.md`: "roughly a fifth
   *  to a third of the band's width, so the bars read as discrete marks". */
  gapRatio: number;
  /** Air between a bar's own end and the value printed beyond it, and between a gutter and the
   *  bars. */
  gap: number;
};

export const FRAME: RankingFrame = {
  width: 640,
  height: 400,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  category: { fontSize: 14, fontWeight: 500 },
  value: { fontSize: 14, fontWeight: 500 },
  rowLeadPx: 18,
  rowAirPx: 8,
  gapRatio: 0.3,
  gap: 8,
};

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Wrap on the measured width of the real string, never a character count. Kept and exported the
 *  same way the other beats keep theirs — the browser wraps this beat's flowing header text itself,
 *  so nothing here calls it. */
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

/** A coordinate as a percentage of the box it was drawn in — what lets an HTML label sit exactly
 *  where the SVG put the mark it names, at any container width. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function RankingWeb({
  data,
  title,
  subtitle,
  source,
  alt,
  subject,
  ground,
  accent,
  ink,
  muted,
  frame,
  measure,
}: {
  /** Already sorted descending by value — `bar-and-column.md`: "for a ranking, sort by value". This
   *  component draws rows in the order it is handed, it does not re-sort. */
  data: Row[];
  title: string;
  /** The nuance the ranking alone cannot carry: how close the subject sits to its neighbour, and
   *  how far from the group's ceiling — `information-architecture.md`'s Subtitle zone, here stating
   *  what stops "second-lowest" being misread as "the lowest". */
  subtitle: string;
  source: string;
  alt: string;
  /** The one row highlighted in accent — an editorial choice (this story's subject), never the
   *  extreme value (`bar-and-column.md`, "The subject is not the maximum"). */
  subject: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  frame: RankingFrame;
  measure: Measure;
}) {
  if (data.length < 1)
    throw new Error(
      `a ranking beat needs at least one row, got ${data.length}`,
    );

  // Printed labels are rounded to one decimal — glanceable. Hover/focus reveals the PRECISE reading
  // (`data-detail` below), the detail the rounded printed label omits, never the same number
  // repeated (`web-discipline.md`, "What hover reveals").
  //
  // THREE decimals, and the count is derived rather than picked. What the printed label actually
  // drops here is a RANKING: Sweden and Switzerland both print "3.6 t", and the title calls one of
  // them second-lowest. Rounding this beat's ten frozen 2024 readings and counting distinct values:
  // 1 dp → 9 of 10, 2 dp → still 9 (the same pair tied), 3 dp → 10 of 10. So three is the fewest at
  // which every row is its own number and the sentence over the chart can be checked against the
  // chart. This was 4, which added a digit that separated nothing — a tenth of a gram of CO₂ per
  // person, from a national inventory divided by a population estimate.
  const printedLabels = data.map((r) => `${en(r.value, 1)} ${UNIT}`);
  const preciseLabels = data.map((r) => `${en(r.value, 3)} ${UNIT}`);

  // Both gutters measured from the real strings at their own FIXED type size — never a guessed
  // constant, and never resized on the fly.
  const categoryGutterPx =
    Math.ceil(Math.max(...data.map((r) => measure(r.name, frame.category)))) +
    frame.gap +
    2;
  const valueGutterPx =
    Math.ceil(Math.max(...printedLabels.map((l) => measure(l, frame.value)))) +
    frame.gap +
    2;

  // Ten category names need a real number of CSS pixels down the left gutter, and that number does
  // not shrink when the container does — so the plot carries a floor derived from the row this beat
  // actually draws. Below it the names would collide at any width.
  const minPlotHeightPx = data.length * (frame.rowLeadPx + frame.rowAirPx);

  const rowHeight = frame.height / data.length;
  const g = rankingGeometry(data, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    rowHeight,
    gapRatio: frame.gapRatio,
  });

  const totalWidth = categoryGutterPx + frame.width + valueGutterPx;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--category-size" as string]: `${frame.category.fontSize}px`,
        ["--category-weight" as string]: frame.category.fontWeight,
        ["--value-size" as string]: `${frame.value.fontSize}px`,
        ["--value-weight" as string]: frame.value.fontWeight,
      }}
    >
      {/* A fixed row of air under the header: the top row's own name and value sit at the plot's
          very top edge, and a label centred on that row reaches half a line above it. */}
      <div className="chart-header" style={{ marginBottom: 18 }}>
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      <div
        className="chart-plot ranking-plot"
        style={{
          ["--y-gutter" as string]: `${categoryGutterPx}px`,
          ["--r-gutter" as string]: `${valueGutterPx}px`,
          ["--x-axis-h" as string]: "0px",
          ["--min-plot-h" as string]: `${minPlotHeightPx}px`,
          aspectRatio: `${totalWidth} / ${frame.height}`,
        }}
      >
        <div className="y-axis">
          {g.rows.map((row) => (
            <span
              key={row.name}
              className="cat-label"
              style={{
                top: `${pct(row.centerY, frame.height)}%`,
                color: row.name === subject ? accent : muted,
                fontWeight:
                  row.name === subject ? 700 : frame.category.fontWeight,
              }}
            >
              {row.name}
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
          fontFamily="Helvetica, Arial, sans-serif"
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

          {/* The shared zero baseline — a plain solid rule, not a dashed reference: it is the axis
              itself (bar-and-column.md's non-negotiable zero start), not a level somebody chose.
              FIRST `<line>` in this svg on purpose: `bar-interaction.mjs` reads its own client rect
              to find the plot's top edge, and flips the tooltip below the pointer rather than over
              the header when the topmost row is hovered. */}
          <line
            x1={0}
            x2={0}
            y1={0}
            y2={frame.height}
            stroke={muted}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {g.rows.map((row) => (
            <rect
              key={row.name}
              x={row.x0}
              y={row.top}
              width={Math.max(row.barWidth, 0)}
              height={row.height}
              fill={row.name === subject ? accent : muted}
            />
          ))}

          {/* Interaction layer: one direct hit target per row, spanning the full band — not the
              skill's shared nearest-point `.hit-area`, which resolves many points along ONE
              continuous axis and has nothing to interpolate here. `tabIndex={0}` and `aria-label`
              are baked in at build time, so every row's PRECISE reading is reachable by plain Tab
              with no dependency on `bar-interaction.mjs` running at all. */}
          {g.rows.map((row, i) => (
            <rect
              key={`hit-${row.name}`}
              className="row-hit"
              x={0}
              y={i * rowHeight}
              width={frame.width}
              height={rowHeight}
              fill="transparent"
              pointerEvents="all"
              tabIndex={0}
              role="img"
              aria-label={`${row.name}: ${preciseLabels[i]}`}
              data-detail={`${row.name} · ${preciseLabels[i]}`}
            />
          ))}
        </svg>

        {/* The printed values, each at its own bar's end — plain HTML in the overlay, which shares
            the `<svg>`'s grid cell, so a value tracks its bar as the bars stretch. It reaches past
            the cell's right edge into the value gutter reserved for it, which is why that gutter is
            a real grid track rather than air the longest bar could eat. Unconditional: the rounded
            reading is the argument and is never gated behind interaction. */}
        <div className="overlay" aria-hidden="true">
          {g.rows.map((row, i) => (
            <span
              key={`value-${row.name}`}
              className="value-label"
              style={{
                left: `${pct(row.x1, frame.width)}%`,
                top: `${pct(row.centerY, frame.height)}%`,
                color: row.name === subject ? accent : muted,
                fontWeight: row.name === subject ? 700 : frame.value.fontWeight,
              }}
            >
              {printedLabels[i]}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
