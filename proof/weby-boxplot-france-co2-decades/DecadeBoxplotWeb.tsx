/**
 * The web beat of "France's per-capita CO2 emissions peaked in the 1970s and have fallen in every
 * decade since" — a box plot. Geometry and statistics come from `./boxplot-geometry.ts`; this file
 * adds the one thing the static beat (`proof/more-boxplot-france-co2-decades/DecadeBoxplot.tsx`)
 * cannot: a reader who can ask any of the eight decade-boxes for its own exact five-number summary,
 * its own Tukey fence and its own outlier list, without anything the static frame already states
 * being gated behind that ask. Read `chart-web/references/web-discipline.md` and
 * `chart-beat/references/types/boxplot.md` before changing this file.
 *
 * MIGRATED TO THE FLUID FRAME (`web-discipline.md`, "Responsive behaviour", second build). This
 * beat used to ship two pre-rendered rungs — a 900px `DESKTOP_LAYOUT` and a 360px `NARROW_LAYOUT`
 * swapped by a media query. That is overturned: ONE `WebFrame`, SSR'd once, and the `<svg>` below
 * carries GEOMETRY ONLY — not one `<text>` element. Every word (title, source, the value-axis
 * ticks, each decade's own label and its `n`, each printed outlier value) is plain HTML at a FIXED
 * pixel font size, positioned by `%` over or beside the same grid cell the `<svg>` occupies.
 * Geometry stretches; type does not.
 *
 * WHAT THE MIGRATION DELETED, and why it is not a loss. The two-rung build carried
 * `fitCategoryLabel`, which measured "1950s" against its own band width in SVG user units and fell
 * back to "'50s" when it did not fit. That check cannot exist in a fluid frame: the label is now
 * fixed-pixel HTML and the band is a fraction of a container width nobody knows at build time, so
 * there is no single width to measure against. The collision it guarded is closed by construction
 * instead — the x-axis row is a real CSS row of `%`-positioned spans at a size chosen so eight of
 * them clear each other at the narrowest width this beat is driven at (measured at 375px: 8 bands
 * across a ~275px plot column, labels 11px, no intersecting pair). That is a measurement, not a
 * hope; the driver reports every pair of labels whose boxes intersect, and reported seven of them
 * before the unit moved off the axis. It is TIGHT at that width — roughly 4px between neighbouring
 * decade labels — and that is the honest cost of eight categories on a phone, not a defect hidden
 * behind an abbreviation.
 *
 * THREE COLUMNS, NOT TWO. A decade with three or fewer outliers prints each outlier's own value
 * beside its dot (`boxplot.md`: once there are many, drop the per-point labels and let hover carry
 * them). The last decade's dot sits near the plot's right edge, so a fixed-pixel track
 * (`--r-gutter`, measured in node) is reserved for those labels to overflow into.
 *
 * WHAT STAYS UNCONDITIONAL, exactly as the static beat draws it: title, source, the unit, the
 * value-axis gridlines, every whisker/box/median, every decade's own label and its `n`, and the
 * printed value of an outlier in a decade that carries three or fewer. Hover/focus only ever
 * toggles a `.cat` rectangle's own class and the shared `#tooltip` — no code path can hide or move
 * any of the above (`web-discipline.md`, "What must not become interactive").
 *
 * WHY NOT THE LINE FORMAT'S NEAREST-BY-X HIT AREA. A box plot's x-axis is CATEGORICAL: eight
 * decades, each already owning a whole band of the plot's width, so "which decade is the pointer
 * nearest to, by pixel distance" is a strictly worse question than "which decade's own column is
 * the pointer inside." Each decade gets one hit rectangle (`.cat`) spanning the full plot height
 * and its own `scaleBand` bandwidth, with its own `tabIndex`, `aria-label` and `data-detail` baked
 * in at build time. See `boxplot-interaction.mjs` for the DOM wiring.
 *
 * NUMBER LOCALE. This beat's words are English and its `<html lang>` is patched to `en`, so its
 * figures are English: two decimals with a decimal POINT in `detailFor`, one on a printed outlier.
 * There is no `fr` in this beat and no formatter named for a locale it does not produce.
 *
 * This component never imports the rasteriser: `ink`/`muted`/`grid`/`measure` are props, derived
 * once in node by whatever runner calls it.
 */

import {
  boxplotGeometry,
  summarizeDecade,
  type DecadeReadings,
} from "./boxplot-geometry";

const UNIT_SHORT = "t";
/** The unit, stated ONCE under the title rather than on the top axis tick. The two-rung build put
 *  it on the tick and had to carry an `axisUnit` knob to shorten it to "t" at 360px, because the
 *  full string set the whole left gutter's width. A fluid frame has no second rung to shorten
 *  anything in: with "5 t CO₂ per capita" as the widest tick label the measured gutter came to
 *  110px, a third of a 375px frame, which squeezed eight decade labels into 250px and overlapped
 *  every one of them by 10px. Measured, not guessed — the driver reports each intersecting pair. */
const CAVEAT = "Annual emissions, tonnes of CO₂ per person.";
const OUTLIER_RADIUS = 4;
/** The plot's own inset, in canonical SVG user units, so the outermost band's box is never clipped
 *  against the `viewBox` edge. */
const BAND_INSET = 6;
/** The plot's height floor in CSS pixels. Height follows width through `aspect-ratio`, and at 375px
 *  that leaves roughly 160px of value axis for eight boxes whose whole argument is a falling
 *  median — too little to read a median's position against its neighbours'. This is this beat's own
 *  version of the format's `PLOT_FLOOR_PX`. */
const MIN_PLOT_PX = 260;
/** How many outliers a decade may carry before its per-point labels are dropped and hover carries
 *  them instead (`boxplot.md`). */
const MAX_PRINTED_OUTLIERS = 3;

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** `WebFrame` is declared here, duplicated rather than imported from `ChartWebSeed.tsx` — the same
 *  "duplicate, do not link" ruling that file states. This beat's shape differs from the seed's
 *  anyway: no reference year and no peak callout, but a categorical axis of eight bands that needs
 *  its own band-padding knobs. */
export type WebFrame = {
  /** The plot rectangle's canonical width/height in SVG user units — proportions and tick density
   *  only, never a rendered pixel cap. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot, holding each decade's label AND its `n` on two lines. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  source: { fontSize: number };
  axis: { fontSize: number };
  categoryLabel: { fontSize: number; fontWeight: number };
  nLabel: { fontSize: number };
  outlierLabel: { fontSize: number; fontWeight: number };
  /** How many y gridlines this frame asks for (d3 treats it as a hint). Decided ONCE, at the
   *  canonical size — never re-derived as the frame stretches. */
  yTickHint: number;
  /** The drawn box's width as a fraction of its full `scaleBand` bandwidth — the HIT rect (`.cat`)
   *  covers the full bandwidth regardless; this only affects the visible box/whisker width. */
  boxWidthRatio: number;
  bandPaddingInner: number;
  bandPaddingOuter: number;
};

export const FRAME: WebFrame = {
  width: 820,
  height: 380,
  xAxisRowPx: 40,
  title: { fontSize: 24, fontWeight: 700 },
  source: { fontSize: 13 },
  axis: { fontSize: 12 },
  categoryLabel: { fontSize: 11, fontWeight: 600 },
  nLabel: { fontSize: 10 },
  outlierLabel: { fontSize: 11, fontWeight: 600 },
  yTickHint: 6,
  boxWidthRatio: 0.68,
  bandPaddingInner: 0.42,
  bandPaddingOuter: 0.28,
};

/** The exact figures a hover or a keyboard focus on one decade's own box hands back — the
 *  five-number summary, the Tukey fence (as the drawn whisker ends), and the outlier list — none of
 *  it printed by default once a decade carries more than `MAX_PRINTED_OUTLIERS`. `isPeak` names the
 *  peak decade the way the title already does, not a fact this tooltip invents. */
export function detailFor(
  summary: ReturnType<typeof summarizeDecade>,
  isPeak: boolean,
): string {
  const head = `${summary.label}${isPeak ? " (peak)" : ""}`;
  const stats = `median ${summary.median.toFixed(2)} ${UNIT_SHORT} · Q1 ${summary.q1.toFixed(2)} · Q3 ${summary.q3.toFixed(2)} · whisker ${summary.whiskerLo.toFixed(2)}–${summary.whiskerHi.toFixed(2)} ${UNIT_SHORT}`;
  const count = `n=${summary.n}`;
  const outlierText =
    summary.outliers.length === 0
      ? "no Tukey outlier"
      : `${summary.outliers.length} outlier${summary.outliers.length > 1 ? "s" : ""}: ${summary.outliers
          .map((o) => `${o.value.toFixed(2)} ${UNIT_SHORT} (${o.year})`)
          .join(", ")}`;
  return `${head} · ${stats} · ${count}, ${outlierText}`;
}

/** `value / total` as a percentage, one decimal — puts an HTML label on the exact spot the SVG
 *  geometry it annotates was drawn at, as a fraction of the SAME box, so it tracks the stretch. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function DecadeBoxplotWeb({
  decades,
  title,
  source,
  alt,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
  frame,
}: {
  decades: DecadeReadings[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
}) {
  if (decades.length < 3)
    throw new Error(
      `a boxplot beat needs at least three groups to compare, got ${decades.length}`,
    );

  const summaries = decades.map((d) => summarizeDecade(d.label, d.readings));
  const allValues = decades.flatMap((d) => d.readings.map((r) => r.value));
  const peakSummary = summaries.reduce((a, b) => (b.median > a.median ? b : a));

  const { plot, boxes, ticksY } = boxplotGeometry(summaries, allValues, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: BAND_INSET, bottom: 0, left: BAND_INSET },
    yTickHint: frame.yTickHint,
    boxWidthRatio: frame.boxWidthRatio,
    bandPaddingInner: frame.bandPaddingInner,
    bandPaddingOuter: frame.bandPaddingOuter,
  });
  const tickLabels = ticksY.map((t) => `${t.value}`);

  // Both fixed tracks, MEASURED from the real strings that will sit in them at their own fixed font
  // size — never a guessed constant, the "measured, not assumed" rule every gutter in this
  // codebase keeps.
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));
  const printedOutlierLabels = boxes.flatMap((b) =>
    b.outlierPoints.length <= MAX_PRINTED_OUTLIERS
      ? b.outlierPoints.map((p) => p.value.toFixed(1))
      : [],
  );
  const rGutterPx =
    12 +
    (printedOutlierLabels.length > 0
      ? Math.max(
          ...printedOutlierLabels.map((l) => measure(l, frame.outlierLabel)),
        )
      : 0);

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
        // Fixed CSS pixel type sizes, threaded as custom properties. None of these ever changes
        // with the viewBox's width — that is the whole point of the redesign.
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.source.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.outlierLabel.fontSize}px`,
        ["--label-weight" as string]: frame.outlierLabel.fontWeight,
        ["--note-size" as string]: `${frame.axis.fontSize}px`,
        ["--cat-size" as string]: `${frame.categoryLabel.fontSize}px`,
        ["--cat-weight" as string]: frame.categoryLabel.fontWeight,
        ["--n-size" as string]: `${frame.nLabel.fontSize}px`,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{CAVEAT}</p>
      </div>

      <div
        className="chart-plot boxplot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--r-gutter" as string]: `${rGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
          minHeight: `${MIN_PLOT_PX}px`,
        }}
      >
        <div className="y-axis">
          {ticksY.map((tick, i) => (
            <span
              key={tick.value}
              className="axis-label y"
              style={{ top: `${pct(tick.y, frame.height)}%` }}
            >
              {tickLabels[i]}
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

          {ticksY.map((tick) => (
            <line
              key={tick.value}
              x1={plot.left}
              x2={plot.right}
              y1={tick.y}
              y2={tick.y}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {boxes.map((b) => (
            <g key={b.label}>
              {/* Whisker: one vertical rule from the low fence-clipped reading to the high one,
                  drawn under the box so the box's own top/bottom edges read as the crisp Q1/Q3
                  line. */}
              <line
                x1={b.cx}
                x2={b.cx}
                y1={b.yWhiskerLo}
                y2={b.yWhiskerHi}
                stroke={accent}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={b.boxLeft + (b.boxRight - b.boxLeft) * 0.22}
                x2={b.boxRight - (b.boxRight - b.boxLeft) * 0.22}
                y1={b.yWhiskerLo}
                y2={b.yWhiskerLo}
                stroke={accent}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={b.boxLeft + (b.boxRight - b.boxLeft) * 0.22}
                x2={b.boxRight - (b.boxRight - b.boxLeft) * 0.22}
                y1={b.yWhiskerHi}
                y2={b.yWhiskerHi}
                stroke={accent}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />

              {/* Box: Q1 to Q3, one hue — a single-group comparison across decades, not two groups
                  being compared (`boxplot.md`). */}
              <rect
                x={b.boxLeft}
                y={b.yQ3}
                width={b.boxRight - b.boxLeft}
                height={b.yQ1 - b.yQ3}
                fill={accent}
                fillOpacity={0.22}
                stroke={accent}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />

              {/* Median: in ink, never the box's own fill or stroke colour (`boxplot.md`). */}
              <line
                x1={b.boxLeft}
                x2={b.boxRight}
                y1={b.yMedian}
                y2={b.yMedian}
                stroke={ink}
                strokeWidth={2.5}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          {/* Interaction layer: one hit rectangle PER DECADE, not a shared nearest-point overlay.
              Every rect carries its own `tabIndex`, `aria-label` and `data-detail`, baked in
              server-side, so the no-JS frame is still keyboard-reachable decade by decade with the
              script absent entirely. Drawn last so it sits on top without altering the marks'
              own hit-testing. */}
          {boxes.map((b, i) => {
            const detail = detailFor(b, b.label === peakSummary.label);
            return (
              <rect
                key={`hit-${b.label}`}
                className="cat"
                x={b.bandLeft}
                y={0}
                width={b.bandWidth}
                height={frame.height}
                fill="transparent"
                pointerEvents="all"
                tabIndex={0}
                role="img"
                aria-label={`${b.label}: ${detail}`}
                data-decade={b.label}
                data-index={i}
                data-detail={detail}
              />
            );
          })}
        </svg>

        {/* HTML overlay — same grid cell as the `<svg>`, so a `%` lands on the exact reading it
            annotates at any width. `aria-hidden`: every outlier printed here is already carried, at
            full precision, by its own decade's `aria-label` above.
            THE OUTLIER DOTS LIVE HERE, not in the `<svg>`: a `<circle>` inside a
            `preserveAspectRatio="none"` viewBox is scaled independently on each axis, so an outlier
            reads as a wide oval on a laptop and a vertical sliver on a phone. As HTML they are a
            FIXED pixel size at every width, positioned by the same `%` as their own labels. */}
        <div className="overlay" aria-hidden="true">
          {boxes.flatMap((b) =>
            b.outlierPoints.map((p) => (
              <span
                key={`o-${b.label}-${p.year}`}
                className="outlier-dot"
                style={{
                  left: `${pct(b.cx, frame.width)}%`,
                  top: `${pct(p.y, frame.height)}%`,
                  width: `${OUTLIER_RADIUS * 2}px`,
                  height: `${OUTLIER_RADIUS * 2}px`,
                  background: accent,
                }}
              />
            )),
          )}
          {boxes
            .filter((b) => b.outlierPoints.length <= MAX_PRINTED_OUTLIERS)
            .flatMap((b) =>
              b.outlierPoints.map((p) => (
                <span
                  key={`ol-${b.label}-${p.year}`}
                  className="outlier-label"
                  style={{
                    left: `${pct(b.cx, frame.width)}%`,
                    top: `${pct(p.y, frame.height)}%`,
                  }}
                >
                  {p.value.toFixed(1)}
                </span>
              )),
            )}
        </div>

        {/* The x-axis row: the decade in its own natural chronological order (never resorted by
            median — this is a time-ordered axis, `boxplot.md`), and its own `n` directly under it,
            so a 5-reading decade never reads as equivalent to a 10-reading one. Both are HTML at a
            fixed size, centred on their own band's `%`. */}
        <div className="x-axis">
          {boxes.map((b) => (
            <span
              key={b.label}
              className="axis-label x cat-label"
              style={{ left: `${pct(b.cx, frame.width)}%` }}
            >
              <span className="decade">{b.label}</span>
              <span className="n">{`n=${b.n}`}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
