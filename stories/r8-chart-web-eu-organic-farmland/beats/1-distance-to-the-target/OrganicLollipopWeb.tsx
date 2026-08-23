/**
 * THIS BEAT'S OWN COMPOSITION — a horizontal lollipop in the WEB format.
 *
 * The split `chart-web` teaches, applied here: the `<svg>` carries GEOMETRY ONLY (the ground, the
 * value gridlines, the target rule, the block divider, every stem, the shared hit area) and not one
 * `<text>`; every word is plain HTML positioned by `%` over the same grid cell, at a FIXED pixel
 * size that never tracks the `viewBox`.
 *
 * THE DOTS ARE HTML, NOT `<circle>`. The frame stretches with `preserveAspectRatio="none"`, so an
 * SVG circle inside it is an ellipse at every width but the canonical one, and the flex clamp that
 * keeps the beat inside the window changes that aspect again on a short screen. An absolutely
 * positioned `<span>` with a fixed pixel size and `border-radius: 50%` is round at every width. The
 * STEMS stay in the SVG, because a horizontal line is still a horizontal line under any scale.
 *
 * `WebFrame` is declared here rather than imported: it is a compile-time-only type in the skill,
 * with no vendoring path a story could reach, so a story carries its own matching copy.
 *
 * This component never imports the rasteriser. `ink` / `muted` / `grid` / `measure` / `fontFamily`
 * are props, derived once in node by the runner beside this file. No hex is named here, and no
 * typeface either.
 */
import { lollipopLayout, xTickValues, pct, type Reading, type Row } from "./organic-geometry.ts";

export type WebFrame = {
  /** The plot rectangle's own canonical proportions, in SVG user units. Not a pixel cap. */
  width: number;
  rowHeight: number;
  topPad: number;
  gapRows: number;
  /** The value axis's own maximum, in percent — fixed, so the target rule cannot move. */
  domainMax: number;
  flipAt: number;
  /** Fixed CSS pixel row below the plot for the value-axis labels. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  note: { fontSize: number };
  filter: { fontSize: number };
  /** The dot's own diameter, in FIXED CSS pixels — see this file's own header for why it is not an
   *  SVG radius. */
  dotPx: number;
};

export const FRAME: WebFrame = {
  width: 640,
  rowHeight: 40,
  topPad: 30,
  gapRows: 2.8,
  domainMax: 28,
  flipAt: 0.68,
  xAxisRowPx: 26,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  label: { fontSize: 13, fontWeight: 600 },
  note: { fontSize: 12 },
  filter: { fontSize: 13 },
  dotPx: 9,
};

type Measure = (text: string, font: { fontSize: number; fontWeight?: number }) => number;

/** A percentage of the canonical box, for positioning an HTML element over the stretched `<svg>`. */
function over(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

export function OrganicLollipopWeb({
  data,
  title,
  caveats,
  source,
  alt,
  target,
  targetLabel,
  dividerLabel,
  newestYear,
  earlierYear,
  detailFor,
  labelFor,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
  frame,
  fontFamily,
}: {
  data: Reading[];
  title: string;
  caveats: string[];
  source: string;
  alt: string;
  target: number;
  targetLabel: string;
  dividerLabel: string;
  newestYear: number;
  earlierYear: number;
  detailFor: (row: Row) => string;
  labelFor: (row: Row) => string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
  fontFamily?: string;
}) {
  const layout = lollipopLayout(data, {
    width: frame.width,
    rowHeight: frame.rowHeight,
    topPad: frame.topPad,
    gapRows: frame.gapRows,
    domainMax: frame.domainMax,
    flipAt: frame.flipAt,
    newestYear,
  });
  const ticks = xTickValues(frame.domainMax);

  // THE LEFT GUTTER IS MEASURED, NEVER GUESSED, and it carries TWO columns: every country's own
  // name, and that country's own value. A gutter typed as a round number is a gutter that clips the
  // longest name the day a different country enters the table.
  //
  // WHY THE VALUE IS HERE AND NOT BESIDE ITS DOT. It was beside its dot in the first build, and the
  // screenshot at 1600x800 showed the accent stem running straight through the four longest rows'
  // own numbers — a strikethrough nothing in the markup or the check suite can see. Moving it left
  // of the dot is what caused that; moving it right of the dot clips off the frame at 375px, where
  // the whole plot is 327px wide and the longest label is 80. A label column is the arrangement
  // that has no collision at any width, which is the only kind of answer a fluid frame accepts.
  const widestName = Math.max(...layout.rows.map((r) => measure(r.name, frame.label)));
  const widestValue = Math.max(...layout.rows.map((r) => measure(labelFor(r), frame.label)));
  const VALUE_COL_PX = Math.ceil(widestValue) + 10;
  const Y_GUTTER_PX = Math.ceil(widestName) + VALUE_COL_PX + 18;

  // The target rule and the axis's own last tick land on the same coordinate when the target IS a
  // tick, which is the case here (25 of a 0-28 domain). Refused rather than drawn, if a re-pointed
  // domain ever pushed the rule off the plot.
  if (target <= 0 || target > frame.domainMax)
    throw new Error(
      `the target (${target}) sits outside this axis's own domain [0, ${frame.domainMax}], so the ` +
        "rule every stem is read against would not be on the plot",
    );

  const totalHeight = layout.height;

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
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
        ["--filter-size" as string]: `${frame.filter.fontSize}px`,
        ["--dot-size" as string]: `${frame.dotPx}px`,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        {caveats.map((line) => (
          <p className="chart-caveat" key={line.slice(0, 40)}>
            {line}
          </p>
        ))}
      </div>

      <div
        className="chart-plot lollipop-plot"
        style={{
          ["--y-gutter" as string]: `${Y_GUTTER_PX}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${Y_GUTTER_PX + frame.width} / ${totalHeight + frame.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ ["--value-col" as string]: `${VALUE_COL_PX}px` }}>
          {layout.rows.map((r) => (
            <span
              key={`${r.code}-name`}
              className={`axis-label y country${r.stale ? " is-stale" : ""}`}
              data-row={r.code}
              style={{ top: over(r.cy, totalHeight), color: r.stale ? muted : ink }}
            >
              {r.name}
            </span>
          ))}
          {/* EVERY VALUE, DRAWN. Twenty-seven rows fit twenty-seven numbers, so nothing a static
              frame could state is gated behind an ask — the interaction adds the year, the flag and
              the comparison, never the number itself. A row whose figure is not from the newest
              year carries that year here, in words, because a ranking whose rows come from
              different years and does not say so is the defect this whole beat is about. */}
          {layout.rows.map((r) => (
            <span
              key={`${r.code}-value`}
              className={`axis-label y value${r.stale ? " is-stale" : ""}`}
              data-row={r.code}
              style={{ top: over(r.cy, totalHeight), color: r.stale ? muted : ink }}
            >
              {labelFor(r)}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY. No `<text>`, no circles — see this file's own header. */}
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${frame.width} ${totalHeight}`}
          preserveAspectRatio="none"
          fontFamily={fontFamily}
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={frame.width} height={totalHeight} fill={ground} />

          {ticks.map((value) => (
            <line
              key={value}
              x1={layout.x(value)}
              y1={0}
              x2={layout.x(value)}
              y2={totalHeight}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE BLOCK DIVIDER — the two groups of rows are not one ranking, and this is the line
              that says so. Furniture: it carries no value and is drawn in the muted ink. */}
          {layout.dividerY !== null && (
            <line
              x1={0}
              y1={layout.dividerY}
              x2={frame.width}
              y2={layout.dividerY}
              stroke={muted}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}

          {/* EVERY STEM. One per row, from the zero baseline to that country's own share. A row
              whose figure is older than the newest year is drawn at reduced opacity — the same
              accent, never a second colour, because a second hue would read as a second category. */}
          {layout.rows.map((r) => (
            <line
              key={r.code}
              x1={0}
              y1={r.cy}
              x2={r.cx}
              y2={r.cy}
              stroke={accent}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE TARGET — the one number the article gives, drawn full height so a reader can drop a
              plumb line from it through every stem. Drawn LAST so it sits over the stems. */}
          <line
            x1={layout.x(target)}
            y1={0}
            x2={layout.x(target)}
            y2={totalHeight}
            stroke={ink}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />

          {/* The shared hit area: the interaction script resolves a pointer or a tap anywhere over
              the plot to the nearest row by real screen distance, so a phone reader is never asked
              to land a tap on a 9px dot. */}
          <rect
            className="hit-area"
            x={0}
            y={0}
            width={frame.width}
            height={totalHeight}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        {/* The dots and the words that annotate them, HTML over the same grid cell. `.overlay`
            carries `pointer-events: none`, inherited by every dot, so a pointer always reaches the
            hit area beneath and the nearest-row resolution answers; keyboard focus reaches each dot
            directly, because each one is a real focusable element with its own accessible name. */}
        <div className="overlay">
          {layout.rows.map((r) => (
            <span
              key={r.code}
              className={`pt${r.stale ? " is-stale" : ""}`}
              style={{ left: over(r.cx, frame.width), top: over(r.cy, totalHeight) }}
              tabIndex={0}
              role="img"
              aria-label={detailFor(r)}
              data-code={r.code}
              data-detail={detailFor(r)}
            />
          ))}

          <span
            className="note target-label"
            style={{ left: over(layout.x(target), frame.width), top: 0 }}
          >
            {targetLabel}
          </span>

          {layout.dividerY !== null && (
            <span
              className="note divider-label"
              style={{ left: 0, top: over(layout.dividerY, totalHeight) }}
            >
              {dividerLabel}
            </span>
          )}
        </div>

        <div className="x-axis">
          {ticks.map((value, i) => (
            <span
              key={value}
              className={
                `axis-label x${i === 0 ? " first" : ""}${i === ticks.length - 1 ? " last" : ""}` +
                // Every other tick is tagged so a narrow frame can drop it: at 375px the plot is
                // 167px wide and six labels at this fixed size need 180px, which is the collision
                // the first build shipped. The GRID LINES are untouched — the axis keeps every
                // step it had, and only half the numbering steps aside.
                (i % 2 === 1 ? " minor" : "")
              }
              style={{ left: over(layout.x(value), frame.width), color: muted }}
            >
              {`${value} %`}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
