/**
 * The web beat of "Switzerland's 2024 per-capita CO2 emissions were the 3rd-lowest of 15 European
 * peers" — a lollipop, not a line or a scatter. Coordinates and formatting come from
 * `./lollipop-geometry.ts`. Read `chart-web/references/web-discipline.md` and
 * `chart-beat/references/types/lollipop.md` before changing this file.
 *
 * MIGRATED TO THE FLUID FRAME (`web-discipline.md`, "Responsive behaviour", second build). This
 * beat used to ship two pre-rendered rungs — a 900px `DESKTOP_LAYOUT` and a 360px `NARROW_LAYOUT`,
 * each an independently typeset SVG swapped by a media query. That design is overturned: there is
 * now ONE `WebFrame`, SSR'd once, and the `<svg>` below carries GEOMETRY ONLY — not one `<text>`
 * element. Every word (title, source, the 15 country names, the value labels, the value-axis ticks)
 * is plain HTML positioned by `%` over or beside the same grid cell the `<svg>` occupies, at a
 * FIXED pixel font size that never tracks the `viewBox`. Geometry stretches; type does not.
 *
 * THREE COLUMNS, NOT TWO — this beat's own departure from the seed's grid. A lollipop prints a
 * value label to the RIGHT of each dot, and the highest row's dot sits at the plot's own right
 * edge, so that label has to land somewhere. It is drawn in the overlay (positioned at its own
 * dot's `%`, so it tracks the stretch for free) and overflows into a THIRD, fixed-pixel grid track
 * reserved for exactly that (`--r-gutter`, measured from the widest label actually drawn). Same
 * mechanism as the seed's `--y-gutter`, mirrored: a fixed column of reserved room, measured in
 * node, so a fixed-size label can never collide with the frame's own edge at any container width.
 * The category names get the first track (`--y-gutter`) the same way.
 *
 * THE ROW-HEIGHT FLOOR. Height follows width through `aspect-ratio`, which is right for a line
 * chart and wrong for fifteen stacked rows: at 375px the frame is ~240px of plot, and fifteen rows
 * inside it are 16px apart — below the point where a 14px name is legible beside its own dot. So
 * `.chart-plot` carries an inline `min-height` of `rows x MIN_ROW_PX`, this beat's own version of
 * the genre's `PLOT_FLOOR_PX`: the plot may stretch taller than its canonical ratio at a narrow
 * width, never shorter than its rows can be read at. The `<svg>`'s `preserveAspectRatio="none"`
 * absorbs the difference exactly as it absorbs the gutter drift the genre already documents.
 *
 * NUMBER LOCALE. This beat's words are English and its `<html lang>` is patched to `en`
 * (`render-web.mjs`'s `patchForThisBeat`), so its figures are English too: `formatValue` prints
 * `3.6 t` with a decimal POINT, not a comma. There is no `fr` in this beat and none of its
 * formatters is named for a locale it does not produce — see `lollipop-geometry.ts`.
 *
 * WHY THIS BEAT'S HOVER IS DELIBERATELY MODEST (read before adding more to it): with only 15 rows,
 * this exact claim's STATIC sibling (`proof/more-lollipop-co2-per-capita/LollipopCo2.tsx`) already
 * has room to print a rounded value label beside every single dot — nothing is omitted the way a
 * 75-point line series or a 21-band pyramid omits detail. `web-discipline.md`'s own rule ("the
 * honest use of interaction here is detail the static frame had to omit, never the same numbers
 * repeated on demand") means this beat must NOT bolt on a tooltip that just restates the same
 * "3.6 t" already printed in ink next to the dot. What genuinely IS omitted: the printed label
 * rounds to one decimal, and one decimal cannot separate Switzerland from Sweden — both print
 * "3.6 t" and only one of them can be third-lowest. So hover/focus reveals the row's reading to
 * THREE decimals (`formatValueFine`) — measured to be the fewest at which all fifteen frozen
 * readings are distinct, and so the fewest at which the title's ranking can be checked. It used to
 * reveal the CSV's own literal instead — five to seven decimals depending on the row, "3.4089074 t"
 * for Portugal — a float's digit count standing in for an editorial one. See `BRIEF.md`'s own
 * "Interaction" section.
 *
 * INTERACTION SHAPE — deliberately NOT this skill's `assets/interaction.mjs` (a line's
 * nearest-by-x mechanic). A lollipop's 15 rows already tile the plot's full height as disjoint
 * bands (`scaleBand`), so there is no "nearest" to resolve at all: one hit-rect PER ROW, each
 * spanning the full plot width and that row's own band height, each independently
 * `tabIndex={0}`/`aria-label`/`data-detail` at build time. `./lollipop-interaction.mjs` wires
 * hover/tap/focus on each rect directly, plus ArrowUp/ArrowDown/Home/End to step between rows.
 *
 * This component never imports the rasteriser: `ink`/`muted`/`grid`/`measure` are props, derived
 * once in node by whatever runner calls it (`render-web.mjs`'s call into the genre's `renderWeb`).
 */

import {
  formatValue,
  formatValueFine,
  lollipopGeometry,
  type Row,
} from "./lollipop-geometry";

const YEAR = 2024;
const DOT_RADIUS = 5;
const STEM_WIDTH = 2.5;
/** The plot's own right inset, in canonical SVG user units — enough to clear the largest circle
 *  this beat draws, so the longest row's dot is never clipped in half against the `viewBox` edge.
 *  The label that sits beyond it is HTML and lands in `--r-gutter`, not in here. */
const DOT_INSET = 8;
/** The row-height floor, in CSS pixels — see this file's own doc-comment. Measured against the
 *  category font: a 14px name needs its own band to be at least this tall before neighbouring rows
 *  start reading as one block. */
const MIN_ROW_PX = 26;

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** `WebFrame` lives here, duplicated rather than imported from `ChartWebSeed.tsx` — the same
 *  "duplicate, do not link" ruling that file's own doc-comment states: it is a compile-time-only
 *  type with no vendoring path a story could reach outside this dev repository. Fields are this
 *  TYPE's own shape (a category axis of rows + one value axis), not the line seed's. */
export type WebFrame = {
  /** The plot rectangle's canonical width/height in SVG user units — proportions and tick-density
   *  decisions only, NEVER a rendered pixel cap: the `<svg>` is stretched
   *  (`preserveAspectRatio="none"`) to fill whatever box the grid gives it. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot, for the value-axis tick labels. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  source: { fontSize: number };
  axis: { fontSize: number };
  /** The country names, in the first grid track. */
  category: { fontSize: number; fontWeight: number };
  /** The rounded value printed beside each dot, overflowing into the third grid track. */
  value: { fontSize: number; fontWeight: number };
  /** How many value-axis ticks `lollipopGeometry` asks for. Decided ONCE, at the canonical width —
   *  never re-derived as the frame stretches (`web-discipline.md`, "Cheap, not recomputed"). */
  valueTickHint: number;
};

export const FRAME: WebFrame = {
  width: 820,
  height: 560,
  xAxisRowPx: 26,
  title: { fontSize: 24, fontWeight: 700 },
  source: { fontSize: 13 },
  axis: { fontSize: 12 },
  category: { fontSize: 14, fontWeight: 400 },
  value: { fontSize: 14, fontWeight: 600 },
  valueTickHint: 5,
};

/** `value / total` as a percentage, one decimal — the one arithmetic step that puts an HTML label
 *  on the exact spot the SVG geometry it annotates was drawn at, expressed as a fraction of the
 *  SAME box, so it tracks the `<svg>`'s continuous stretch for free. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

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
  frame,
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
  /** Derived from `ground` by whatever node runner calls this component (`renderWeb`) — never
   *  derived in here. */
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
}) {
  if (rows.length < 3)
    throw new Error(
      `a lollipop beat needs at least three rows, got ${rows.length}`,
    );

  // The two fixed tracks, MEASURED from the real strings that will sit in them at their own fixed
  // font size — never a guessed constant. `references/types/lollipop.md` names a truncated category
  // label as this type's own recurring defect, and a fixed gutter is how it happens.
  const yGutterPx =
    10 + Math.max(...rows.map((r) => measure(r.country, frame.category)));
  const rGutterPx =
    12 +
    Math.max(...rows.map((r) => measure(formatValue(r.value), frame.value)));

  const { plot, zeroX, points, ticks } = lollipopGeometry(rows, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: DOT_INSET, bottom: 0, left: 0 },
    tickHint: frame.valueTickHint,
  });
  const tickLabels = ticks.map((t, i, all) =>
    i === all.length - 1 ? `${t.value} t` : `${t.value}`,
  );

  const totalWidth = yGutterPx + frame.width + rGutterPx;
  const totalHeight = frame.height + frame.xAxisRowPx;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        // Fixed CSS pixel type sizes, threaded as custom properties so the genre's shared
        // stylesheet stays generic while this beat still tunes its own scale. None of these ever
        // changes with the viewBox's width — that is the whole point of the redesign.
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
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
      </div>

      <div
        className="chart-plot lollipop"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--r-gutter" as string]: `${rGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
          // This beat's own floor — see the doc-comment. Overrides the genre stylesheet's generic
          // PLOT_FLOOR_PX, which is sized for a single-line frame, not fifteen stacked rows.
          minHeight: `${rows.length * MIN_ROW_PX}px`,
        }}
      >
        <div className="y-axis">
          {points.map((p) => (
            <span
              key={p.country}
              className="axis-label y cat"
              style={{ top: `${pct(p.rowY, frame.height)}%` }}
            >
              {p.country}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>`. `preserveAspectRatio="none"` lets this stretch to
            fill exactly whatever box the grid gives it at any container width. */}
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

          {/* Value-axis gridlines, vertical because the value axis runs left-to-right. Drawn whole:
              the value labels above them are HTML now, each on its own `--ground` chip (the one box
              this genre allows), so a gridline passing behind a label is covered by the label's own
              backing rather than cut into segments in user units a fixed-pixel label cannot be
              measured against. */}
          {ticks.map((tick) => (
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

          {/* The zero baseline every stem starts from — the length-encoding floor this type
              inherits from bars and is not allowed to relax (`references/types/lollipop.md`). */}
          <line
            x1={zeroX}
            x2={zeroX}
            y1={plot.top}
            y2={plot.bottom}
            stroke={muted}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {points.map((p) => (
            <line
              key={p.country}
              x1={zeroX}
              x2={p.dotX}
              y1={p.rowY}
              y2={p.rowY}
              stroke={p.country === subject ? accent : muted}
              strokeWidth={STEM_WIDTH}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Interaction layer — one hit-rect PER ROW, spanning the full plot width and that row's
              own band height, invisible at rest. `tabIndex`, `aria-label` and `data-detail` (the
              full-precision reading this genre's own hover honestly adds) are baked in server-side,
              so the no-JS frame is still keyboard-reachable row by row with
              `./lollipop-interaction.mjs` absent entirely. That script only ever touches a
              `.row-hit`'s own class and the shared `#tooltip`. */}
          {points.map((p) => (
            <rect
              key={p.country}
              className="row-hit"
              x={0}
              y={p.bandTop}
              width={frame.width}
              height={p.bandHeight}
              fill="transparent"
              pointerEvents="all"
              tabIndex={0}
              role="img"
              aria-label={`${p.country}: ${formatValueFine(p.value)}, ${YEAR}`}
              data-country={p.country}
              data-detail={`${p.country} · ${formatValueFine(p.value)} (${YEAR})`}
            />
          ))}
        </svg>

        {/* HTML overlay — the same grid cell as the `<svg>`, so a `%` position lands on the exact
            dot it annotates at any width. `aria-hidden`: every value here is already carried, at
            full precision, by its own row's `aria-label` above. Never toggled by the script: the
            printed value is the argument, already stated (`web-discipline.md`, "What must not
            become interactive"). */}
        <div className="overlay" aria-hidden="true">
          {/* The dots live HERE, not in the `<svg>`, and that is the fluid frame's own doing: a
              `<circle>` inside a `preserveAspectRatio="none"` viewBox is scaled independently on
              each axis, so at 1600px the heads read as wide ovals and at 375px — where the x-scale
              collapses to 0.26 and the y-scale to 0.70 — they shrink to a 1px sliver and the
              lollipop loses its heads entirely. Seen at both widths before it was fixed. As HTML
              they are a FIXED pixel size at every container width, positioned by the same `%` as
              everything else in this overlay, so they track the stretch without being deformed by
              it. The stem stays in the `<svg>`: its LENGTH is the reading, and
              `vector-effect="non-scaling-stroke"` already holds its thickness constant. */}
          {points.map((p) => (
            <span
              key={`dot-${p.country}`}
              className="dot"
              style={{
                left: `${pct(p.dotX, frame.width)}%`,
                top: `${pct(p.rowY, frame.height)}%`,
                width: `${DOT_RADIUS * 2}px`,
                height: `${DOT_RADIUS * 2}px`,
                background: p.country === subject ? accent : muted,
              }}
            />
          ))}
          {points.map((p) => (
            <span
              key={p.country}
              className="value-label"
              style={{
                left: `${pct(p.dotX, frame.width)}%`,
                top: `${pct(p.rowY, frame.height)}%`,
              }}
            >
              {formatValue(p.value)}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {ticks.map((tick, i) => (
            <span
              key={tick.value}
              className="axis-label x"
              style={{ left: `${pct(tick.x, frame.width)}%` }}
            >
              {tickLabels[i]}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
