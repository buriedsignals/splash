/**
 * The web beat of "France's per-capita CO2 emissions peaked in the 1970s and have fallen in every
 * decade since" — a box plot, not a line or a scatter. Geometry and statistics come from
 * `./boxplot-geometry.ts`; this file adds the one thing the static beat
 * (`proof/more-boxplot-france-co2-decades/DecadeBoxplot.tsx`) cannot: a reader who can ask any of
 * the eight decade-boxes for its own exact five-number summary, its own Tukey fence, and its own
 * outlier list, without anything the static frame already states being gated behind that ask. Read
 * `twin-chart-web/references/web-discipline.md` and `twin-chart-beat/references/types/boxplot.md`
 * before changing this file.
 *
 * WHY THIS BEAT DOES NOT REUSE THE LINE GENRE'S NEAREST-BY-X HIT AREA. `assets/interaction.mjs`'s
 * `nearestIndex` (line beats) and `scatter-interaction.mjs`'s `nearestPointIndex` (the income/life-
 * expectancy scatter) both resolve a pointer position to the CLOSEST reading in a continuous field
 * of x (or x,y) — correct when "closest" is a meaningful question, because a reading's exact
 * position IS the thing being asked about. A box plot's x-axis is CATEGORICAL: there are exactly
 * eight decades, each already owning a whole band of the plot's width, and "which decade is the
 * pointer nearest to, by pixel distance" is a strictly worse version of "which decade's own column
 * is the pointer inside." So each decade gets its own single hit rectangle (`.cat`), spanning the
 * full plot height (`plot.top` to `plot.bottom`) and that decade's own `scaleBand` bandwidth —
 * baked in at build time with its own `tabIndex`, `aria-label` and `data-detail`, exactly the "every
 * reading tabIndex at build time" rule `web-discipline.md` states for the line genre, applied here
 * per CATEGORY rather than per continuous reading. See `boxplot-interaction.mjs` for the DOM wiring
 * this drives (pointerenter/pointerdown/focus show the same tooltip; Left/Right/Home/End move focus
 * between decades in chronological — i.e. DOM — order).
 *
 * WHAT STAYS UNCONDITIONAL SSR'd SVG, exactly as the static beat draws it: title, source, the
 * y-axis gridlines and their unit label, every whisker/box/median line, every decade's own category
 * label and its `n`, and the printed value label next to an outlier when a decade carries three or
 * fewer of them (`boxplot.md`: "once there are many, drop the per-point labels and let hover or
 * focus carry the value instead"). Hover/focus here only ever toggles a `.cat` rectangle's own class
 * and the shared `#tooltip` — it has no code path that can hide or move any of the above.
 *
 * `WebLayout` is declared fresh here, not imported from `twin-chart-web/assets/ChartWebSeed.tsx` —
 * same "duplicate, do not link" ruling that file's own doc-comment states (no vendoring path a
 * story could reach). This beat's own shape differs from the seed's anyway: no reference year, no
 * peak-year callout — a categorical axis with eight bands needs its own tick/gutter/band-padding
 * knobs instead.
 *
 * This component never imports the rasteriser: `ink`/`muted`/`grid`/`measure` are props, derived
 * once in node by whatever runner calls this component (`render-web.mjs`'s own call into the
 * skill's generic `renderWeb`).
 */

import {
  boxplotGeometry,
  summarizeDecade,
  type DecadeReadings,
} from "./boxplot-geometry";

export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  axis: { fontSize: number };
  categoryLabel: { fontSize: number; fontWeight: number };
  nLabel: { fontSize: number };
  outlierLabel: { fontSize: number; fontWeight: number };
  /** How many y gridlines this layout asks for (d3 treats it as a hint). */
  yTickHint: number;
  /** The plot's own floor for usable height, independent of how many lines the title wraps to. The
   *  frame's total height is DERIVED from this plus the header block's real height — never a fixed
   *  constant guessed to be tall enough (same rule `ChartWebSeed.tsx`'s own `plotMinHeight` states). */
  plotMinHeight: number;
  /** Room below the plot for the category label + its n, at this layout's own type size. */
  bottomPad: number;
  /** The drawn box's width as a fraction of its full `scaleBand` bandwidth — the HIT rect (`.cat`)
   *  covers the full bandwidth regardless; this only affects the visible box/whisker width. */
  boxWidthRatio: number;
  bandPaddingInner: number;
  bandPaddingOuter: number;
  /** The unit string printed on the y-axis's own top tick. Full ("t CO₂ per capita") at desktop
   *  width, where it costs nothing; short ("t") at narrow width, where the full string alone would
   *  eat over a third of the frame's own 360px in left gutter and starve the eight decade bands of
   *  the room their own labels need (measured, not guessed — see `fitCategoryLabel`'s own
   *  doc-comment for the collision this leaves room to fix). The full unit still appears in the
   *  title/alt-text/tooltip regardless of this knob. */
  axisUnit: string;
  /** Right-edge margin reserved for an outlier's own printed value label sitting beside its dot.
   *  Independently tunable per layout — desktop has room to spare; narrow does not. */
  outlierGutterPx: number;
};

const UNIT_SHORT = "t";

/** Fits a decade label ("1950s") into its own band width, measured against the real string that
 *  will be drawn — never a fixed assumption that 5 characters fits. At the narrow layout's ~22px
 *  bandwidth the full label collides with its neighbours (caught by actually rendering this beat at
 *  375px and looking, `web-discipline.md`'s own gotcha about static-vs-behaviour verification: a
 *  unit test on the geometry alone would never have shown the collision). Falls back to a 2-digit
 *  form ("'50s") before giving up — never silently overlaps; a decade whose abbreviated form still
 *  does not fit throws rather than draw illegible text. */
function fitCategoryLabel(
  label: string,
  bandWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: (
    text: string,
    font: { fontSize: number; fontWeight?: number },
  ) => number,
): string {
  if (measure(label, font) <= bandWidth) return label;
  const abbreviated = `'${label.slice(2)}`;
  if (measure(abbreviated, font) <= bandWidth) return abbreviated;
  throw new Error(
    `decade label "${label}" does not fit its own band width (${bandWidth.toFixed(1)}px) even abbreviated to "${abbreviated}" — widen the layout's band padding or shrink categoryLabel.fontSize`,
  );
}

function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
  measure: (
    text: string,
    font: { fontSize: number; fontWeight?: number },
  ) => number,
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

/** The exact figures a hover or a keyboard focus on one decade's own box hands back — the five-
 *  number summary, the Tukey fence (as the drawn whisker ends), and the outlier list — none of it
 *  printed by default once a decade carries more than the three outliers the static frame's own
 *  rule still allows to print. `isPeak` names the peak decade the way the title already does, not
 *  a fact this tooltip invents. */
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
  layout,
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
  measure: (
    text: string,
    font: { fontSize: number; fontWeight?: number },
  ) => number;
  layout: WebLayout;
}) {
  if (decades.length < 3)
    throw new Error(
      `a boxplot beat needs at least three groups to compare, got ${decades.length}`,
    );

  const { width, pad } = layout;

  const summaries = decades.map((d) => summarizeDecade(d.label, d.readings));
  const allValues = decades.flatMap((d) => d.readings.map((r) => r.value));
  const peakSummary = summaries.reduce((a, b) => (b.median > a.median ? b : a));

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);

  // The frame's total height is derived, not guessed — the same invariant `ChartWebSeed.tsx` keeps:
  // header block (fixed above) + the plot's own floor for usable height + the bottom margin for the
  // category labels, so a title that wraps to more lines at the narrow width cannot silently clip
  // the plot below it.
  const plotTop =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  // Both gutters are measured from the widest string that will actually be drawn in them, never a
  // fixed constant. A provisional geometry pass (zero padding) gets the tick VALUES first, since the
  // left gutter's width depends on the tick labels' own measured width.
  const provisionalTicks = boxplotGeometry(summaries, allValues, {
    width,
    height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    yTickHint: layout.yTickHint,
    boxWidthRatio: layout.boxWidthRatio,
    bandPaddingInner: layout.bandPaddingInner,
    bandPaddingOuter: layout.bandPaddingOuter,
  }).ticksY.map((t) => t.value);
  const tickLabels = provisionalTicks.map((v, i, all) =>
    i === all.length - 1 ? `${v} ${layout.axisUnit}` : `${v}`,
  );
  const leftGutter =
    pad +
    10 +
    Math.max(...tickLabels.map((label) => measure(label, layout.axis)));

  const padding = {
    top: plotTop,
    right: pad + layout.outlierGutterPx, // room for an outlier label sitting right of its dot
    bottom: layout.bottomPad,
    left: leftGutter,
  };

  const { plot, boxes, ticksY } = boxplotGeometry(summaries, allValues, {
    width,
    height,
    padding,
    yTickHint: layout.yTickHint,
    boxWidthRatio: layout.boxWidthRatio,
    bandPaddingInner: layout.bandPaddingInner,
    bandPaddingOuter: layout.bandPaddingOuter,
  });

  const categoryBaselineTop = plot.bottom + 22;
  const categoryBaselineBottom =
    categoryBaselineTop + layout.nLabel.fontSize + 4;

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
      {/* No root role="img" — the same departure `web-discipline.md` documents for the line genre:
          the eight per-decade hit rectangles below need to stay individually reachable and named. */}
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

      {ticksY.map((tick, i) => (
        <g key={tick.value}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={tick.y}
            y2={tick.y}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={plot.left - 10}
            y={tick.y + 4}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}

      {boxes.map((b) => (
        <g key={b.label}>
          {/* Whisker: a single vertical rule from the low fence-clipped reading to the high one,
              drawn under the box so the box's own top/bottom edges read as the crisp Q1/Q3 line. */}
          <line
            x1={b.cx}
            x2={b.cx}
            y1={b.yWhiskerLo}
            y2={b.yWhiskerHi}
            stroke={accent}
            strokeWidth={1.5}
          />
          <line
            x1={b.boxLeft + (b.boxRight - b.boxLeft) * 0.22}
            x2={b.boxRight - (b.boxRight - b.boxLeft) * 0.22}
            y1={b.yWhiskerLo}
            y2={b.yWhiskerLo}
            stroke={accent}
            strokeWidth={1.5}
          />
          <line
            x1={b.boxLeft + (b.boxRight - b.boxLeft) * 0.22}
            x2={b.boxRight - (b.boxRight - b.boxLeft) * 0.22}
            y1={b.yWhiskerHi}
            y2={b.yWhiskerHi}
            stroke={accent}
            strokeWidth={1.5}
          />

          {/* Box: Q1 to Q3, one hue — a single-group comparison across decades, not two groups being
              compared (`boxplot.md`: "no more than two, and only if deliberately comparing two
              groups"). */}
          <rect
            x={b.boxLeft}
            y={b.yQ3}
            width={b.boxRight - b.boxLeft}
            height={b.yQ1 - b.yQ3}
            fill={accent}
            fillOpacity={0.22}
            stroke={accent}
            strokeWidth={1.5}
          />

          {/* Median: in ink, never the box's own fill or stroke colour (`boxplot.md`). */}
          <line
            x1={b.boxLeft}
            x2={b.boxRight}
            y1={b.yMedian}
            y2={b.yMedian}
            stroke={ink}
            strokeWidth={2.5}
          />

          {/* Outliers: individual dots beyond the whisker, never folded into a stretched whisker.
              Printed value labels only up to three per decade (`boxplot.md`) — once a decade carries
              more, the per-point label is dropped and hover/focus on the box's own hit rect carries
              every outlier's exact value instead (see `detailFor`, above). */}
          {b.outlierPoints.map((pt) => (
            <g key={pt.year}>
              <circle cx={b.cx} cy={pt.y} r={4} fill={accent} />
              {b.outlierPoints.length <= 3 && (
                <text
                  x={b.cx + 9}
                  y={pt.y + 4}
                  fill={ink}
                  fontSize={layout.outlierLabel.fontSize}
                  fontWeight={layout.outlierLabel.fontWeight}
                >
                  {pt.value.toFixed(1)}
                </text>
              )}
            </g>
          ))}

          {/* Category label: the decade in its own natural chronological order (never resorted by
              median — this is a time-ordered axis, `boxplot.md`), and its own n directly under it so
              a 5-point decade never reads as equivalent to a 10-point one. */}
          <text
            x={b.cx}
            y={categoryBaselineTop}
            fill={ink}
            fontSize={layout.categoryLabel.fontSize}
            fontWeight={layout.categoryLabel.fontWeight}
            textAnchor="middle"
          >
            {fitCategoryLabel(
              b.label,
              b.bandWidth,
              layout.categoryLabel,
              measure,
            )}
          </text>
          <text
            x={b.cx}
            y={categoryBaselineBottom}
            fill={muted}
            fontSize={layout.nLabel.fontSize}
            textAnchor="middle"
          >
            {`n=${b.n}`}
          </text>
        </g>
      ))}

      {/* Interaction layer: one hit rectangle PER DECADE, not a shared nearest-point overlay — see
          this file's own doc-comment for why. Every rect carries its own `tabIndex`, `aria-label`
          and `data-detail`, baked in server-side, so the no-JS frame is still keyboard-reachable
          decade by decade with the script absent entirely. Drawn last so it sits on top of the
          drawn box/whisker/outlier marks without altering their own hit-testing. */}
      {boxes.map((b, i) => {
        const detail = detailFor(b, b.label === peakSummary.label);
        return (
          <rect
            key={`hit-${b.label}`}
            className="cat"
            x={b.bandLeft}
            y={plot.top}
            width={b.bandWidth}
            height={plot.bottom - plot.top}
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
  );
}

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 24, fontWeight: 700, lead: 30 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  axis: { fontSize: 13 },
  categoryLabel: { fontSize: 13, fontWeight: 600 },
  nLabel: { fontSize: 11 },
  outlierLabel: { fontSize: 11, fontWeight: 600 },
  yTickHint: 6,
  plotMinHeight: 340,
  bottomPad: 70,
  boxWidthRatio: 0.68,
  bandPaddingInner: 0.38,
  bandPaddingOuter: 0.25,
  axisUnit: "t CO₂ per capita",
  outlierGutterPx: 34,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 18,
  title: { fontSize: 17, fontWeight: 700, lead: 22 },
  source: { fontSize: 11, fontWeight: 400, lead: 15 },
  axis: { fontSize: 10 },
  categoryLabel: { fontSize: 10, fontWeight: 600 },
  nLabel: { fontSize: 9 },
  outlierLabel: { fontSize: 9, fontWeight: 600 },
  yTickHint: 4,
  plotMinHeight: 280,
  bottomPad: 56,
  // Tighter than desktop's band padding — eight categories need every spare pixel of bandwidth at
  // 360px for their own labels to fit at all (see `fitCategoryLabel`'s own doc-comment for the
  // collision this was tuned against).
  boxWidthRatio: 0.62,
  bandPaddingInner: 0.16,
  bandPaddingOuter: 0.08,
  // Short axis unit + a narrower outlier gutter: the full "t CO₂ per capita" string alone measured
  // wider than a third of this layout's entire 360px frame, starving the left gutter's own room for
  // the eight decade bands (measured with `measureText`, not assumed).
  axisUnit: "t",
  outlierGutterPx: 20,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];
