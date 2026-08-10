/**
 * The web beat of "Six in ten countries emit under 4 tonnes of CO2 per person" — the interactive
 * genre.
 *
 * The question the brief poses by name for this type — "what does hovering a bin reveal that the
 * bars do not already show?" — is answered with the one thing a histogram's bars genuinely cannot
 * carry: WHICH countries fall in a given bin. The bar's height already states the count as a shape
 * (and the axis lets a reader estimate it); what it cannot state is membership — a reader looking at
 * the rightmost bar (36–40 t/capita) can see "a handful of countries" but has no way to know which
 * ones without leaving the chart. Hover, tap or keyboard focus on any of the ten bins reveals its
 * exact count AND the full, sorted list of countries in it — never the same count restated, and
 * never fabricated (every name comes straight from the frozen CSV's own `Entity` column, grouped in
 * `render-web.mjs`, not typed by hand).
 *
 * MIGRATED TO THE FLUID FRAME. This file used to ship two pre-rendered widths (900px and 360px)
 * swapped by a media query. One frame now, filling its container continuously and fitting the
 * visible window, by the separation `chart-web/assets/ChartWebSeed.tsx` teaches: the `<svg>`
 * carries GEOMETRY ONLY — the bars, the gridlines, the median rule, the bins' own hit targets, and
 * no `<text>` at all — while every word is HTML at a FIXED pixel size, positioned by `%` over the
 * same grid cell. Geometry stretches; type does not.
 *
 * THE AXIS THIS TYPE GETS WRONG, kept fixed through the migration: a histogram's x labels are
 * BOUNDARIES BETWEEN bins, not marks on top of them. Each bin's label names its LOWER EDGE, so it is
 * drawn at that edge (`left: pct(b.x)`), and the last bin's upper edge is printed once at the far
 * right. Drawing an edge label at a bar's CENTRE — which this file and the static sibling
 * independently did — puts the printed axis half a bin away from the median rule drawn beside it,
 * and the chart then contradicts itself: the rule sits at 3.1 t while the axis says it sits at 5.
 *
 * `deriveFurniture`/`measureText` are not called here — `renderWeb` derives them once in node and
 * threads them in as props (`ink`/`muted`/`grid`/`measure`).
 */

import {
  ENTRANCE_EASING,
  LABEL_FADE_MS,
  WEB_ENTRANCE,
  atProgress,
  endOf,
  entranceLayer,
  markEvent,
} from "../../skills/chart-web/assets/entrance.ts";
import { histogramGeometry, type Bin } from "./histogram-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** This genre's single fluid frame, in this beat's own shape — declared here, not imported from the
 *  skill's seed: a compile-time-only type has no `#shared/*` vendoring path to travel by, and a
 *  relative import across the skill boundary hard-codes this dev repository's own layout. */
export type HistogramFrame = {
  /** The plot rectangle's canonical width/height in SVG user units — NOT a rendered pixel size and
   *  NOT a cap. It fixes the geometry's internal proportions, which become one `aspect-ratio`. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot, for the bin-edge labels. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  axisTitle: { fontSize: number; fontWeight: number };
  note: { fontSize: number; fontWeight: number };
  yTickHint: number;
};

export const FRAME: HistogramFrame = {
  // A tall canonical box on purpose. Height follows width in this genre, so a wide window clamps to
  // the viewport regardless (the plot measured 669px at 1600x900 either way) while a narrow one gets
  // exactly what this ratio hands it: at 820x420 a 375px phone drew a 161px plot, in which the tail
  // bins — the whole point of a right-skewed distribution — were a one-pixel smear. Measured at
  // three viewports, not reasoned about.
  width: 820,
  height: 620,
  xAxisRowPx: 24,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  axisTitle: { fontSize: 13, fontWeight: 600 },
  note: { fontSize: 13, fontWeight: 700 },
  yTickHint: 5,
};

/** Wrap on the measured width of the real string, never a character count. Kept and exported the
 *  way every other beat keeps its copy; this component's header text is flowing HTML the browser
 *  wraps itself, so nothing here calls it. */
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

/** A coordinate as a percentage of the box it was drawn in — what lets an HTML label sit exactly at
 *  the bin edge the geometry drew, and stay there as the browser stretches that box. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function HistogramWeb({
  bins,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  median,
  medianLabel,
  ink,
  muted,
  grid,
  measure,
  frame,
}: {
  bins: Bin[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  median: number;
  medianLabel: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: HistogramFrame;
}) {
  if (bins.length < 3)
    throw new Error(
      `a histogram beat needs at least three bins to show a shape, got ${bins.length}`,
    );

  const { plot, bars, x, y, ticksY } = histogramGeometry(bins, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  void plot;

  const tickLabels = y
    .ticks(frame.yTickHint)
    .map((v, i, all) => (i === all.length - 1 ? `${v} countries` : `${v}`));
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  const medianX = x(median);
  const lastEdge = bins[bins.length - 1].hi;

  const totalWidth = yGutterPx + frame.width;
  const totalHeight = frame.height + frame.xAxisRowPx;

  // ── THE ENTRANCE. The five events of `chart-web/assets/entrance.ts`, with the bar family's own
  // per-mark reveal — and this is the first beat in the genre whose bars grow UPWARD, so the axis
  // that carries the reading is y and the baseline is the plot's own floor.
  //
  // A clip wipe is wrong here for the same reason it is wrong on a ranking, with one extra twist a
  // histogram makes plain: a wipe crossing left to right would uncover each bin at its FULL height
  // the instant it reached it, so the distribution's shape — the whole reading — would be a curtain
  // opening rather than a shape assembling. Each bin rises from the floor to its own count instead.
  //
  //   - THE REFERENCE is the zero rule the counts are measured from. Laid down left to right, alone,
  //     before a single bin stands on it — the same gesture the line beat's dashed rule makes.
  //   - THE ORDER is the data's own: the continuous variable, low to high, which is the only order
  //     a histogram has. `references/types/histogram.md`'s bins are slices of one range, not
  //     categories that could be sorted.
  //   - THE SUBJECT IS THE MEDIAN RULE. This beat's takeaway is not about one bin — "six in ten
  //     countries under four tonnes" is a statement about where the mass sits — and the median is
  //     the single mark that states it. It is also a summary OF the distribution, so it could not
  //     honestly precede it: it lands once every bin is standing.
  //   - THE CONCLUSION is the median's own printed value, once its rule has landed.
  const barWindow = (i: number) => markEvent(WEB_ENTRANCE.reveal, i, bars.length);
  const barLayer = (i: number, baselineY: number) => {
    const own = barWindow(i);
    return entranceLayer("reveal", "grow", {
      delay: own.start,
      duration: own.duration,
      ease: ENTRANCE_EASING.ARRIVE,
      grow: { axis: "y", origin: { x: 0, y: baselineY } },
      mark: `bin-${bars[i].lo}`,
    });
  };
  const furnitureLayer = () =>
    entranceLayer("establish", "fade", {
      delay: WEB_ENTRANCE.establish.start,
      duration: WEB_ENTRANCE.establish.duration,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  // A horizontal rule laid down left to right is a `wipe`: `scaleX` from its own x1, which is the
  // motion this genre already uses for a reference rule. `grow` is for a mark with a value.
  const zeroRuleLayer = entranceLayer("reference", "wipe", {
    delay: WEB_ENTRANCE.reference.start,
    duration: WEB_ENTRANCE.reference.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  const medianRuleLayer = entranceLayer("subject", "grow", {
    delay: WEB_ENTRANCE.subject.start,
    duration: WEB_ENTRANCE.subject.duration,
    ease: ENTRANCE_EASING.ARRIVE,
    // Grown from the plot's own top edge, downward. No name: the median is what the distribution is
    // summarised BY, not one of the counts, and the per-mark equality clause is computed over the
    // counts.
    grow: { axis: "y", origin: { x: medianX, y: 0 } },
  });
  const medianLabelLayer = entranceLayer("conclusion", "fade", {
    delay: WEB_ENTRANCE.conclusion.start,
    duration: WEB_ENTRANCE.conclusion.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  const lastBinEnd = endOf(barWindow(bars.length - 1));
  if (lastBinEnd > WEB_ENTRANCE.subject.start)
    throw new Error(
      `the last bin finishes rising at ${lastBinEnd}ms, after the median rule starts landing at ` +
        `${WEB_ENTRANCE.subject.start}ms — a summary of the distribution would arrive while the ` +
        `distribution is still assembling`,
    );

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
        ["--axis-title-size" as string]: `${frame.axisTitle.fontSize}px`,
        ["--axis-title-weight" as string]: frame.axisTitle.fontWeight,
        ["--note-size" as string]: `${frame.note.fontSize}px`,
        ["--note-weight" as string]: frame.note.fontWeight,
      }}
    >
      {/* A fixed row of air under the header: the topmost y tick label sits half a line above the
          plot's own top edge, and the median's own label sits inside it near the top. */}
      <div
        className="chart-header"
        {...furnitureLayer().attrs}
        style={{ ...furnitureLayer().vars, marginBottom: 18 }}
      >
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      <div
        className="chart-plot histogram-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        <div
          className="y-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {ticksY.map((tick, i) => (
            <span
              key={tick.value}
              className="axis-label y"
              style={{ top: `${pct(tick.y, frame.height)}%`, color: muted }}
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

          {/* The gridlines are FURNITURE and come up on one clock with the labels beside them. The
              ZERO rule is lifted out of this loop: it is not a gridline, it is the floor every bar's
              height is measured from, and this beat's REFERENCE. */}
          <g {...furnitureLayer().attrs} style={furnitureLayer().vars}>
            {ticksY
              .filter((tick) => tick.value !== 0)
              .map((tick) => (
                <line
                  key={tick.value}
                  x1={0}
                  x2={frame.width}
                  y1={tick.y}
                  y2={tick.y}
                  stroke={grid}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
          </g>
          {ticksY
            .filter((tick) => tick.value === 0)
            .map((tick) => (
              <line
                key={tick.value}
                {...zeroRuleLayer.attrs}
                style={zeroRuleLayer.vars}
                x1={0}
                x2={frame.width}
                y1={tick.y}
                y2={tick.y}
                stroke={muted}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

          {/* Bars sit edge-to-edge — contiguous slices of one continuous variable, not discrete
              categories (`references/types/histogram.md`). The 1-unit trim is in CANONICAL units, so
              at a wide frame it stretches into a hairline gap and at a narrow one it all but
              disappears; the bins still read as slices of one range either way. */}
          {/* THE REVEAL — each bin rises from the zero rule to ITS OWN count, low to high, which is
              the only order a histogram has. */}
          {bars.map((b, i) => {
            const layer = barLayer(i, b.y + b.height);
            return (
              <rect
                key={b.lo}
                {...layer.attrs}
                style={layer.vars}
                x={b.x}
                y={b.y}
                width={Math.max(b.width - 1, 0)}
                height={b.height}
                fill={muted}
              />
            );
          })}

          {/* THE SUBJECT — the one mark this beat's takeaway is about, and a summary of the shape
              behind it, so it lands once every bin is standing. */}
          <line
            {...medianRuleLayer.attrs}
            style={medianRuleLayer.vars}
            x1={medianX}
            x2={medianX}
            y1={0}
            y2={frame.height}
            stroke={accent}
            strokeWidth={2}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />

          {/* Interaction layer: one direct hit target per bin, `tabIndex={0}` and `aria-label` baked
              in at build time — every bin's exact count AND the full list of member countries is
              reachable with the script absent entirely. */}
          {bars.map((b) => (
            <rect
              key={`hit-${b.lo}`}
              className="bin-hit"
              x={b.x}
              y={0}
              width={b.width}
              height={frame.height}
              fill="transparent"
              pointerEvents="all"
              tabIndex={0}
              role="img"
              aria-label={`${b.lo} to ${b.hi} tonnes: ${b.count} ${b.count === 1 ? "country" : "countries"} — ${b.entities.join(", ") || "none"}`}
              data-detail={`${b.lo}–${b.hi} t: ${b.count} ${b.count === 1 ? "country" : "countries"} — ${b.entities.join(", ") || "none"}`}
            />
          ))}
        </svg>

        {/* The median's own label, in the overlay so it tracks its rule at any width. */}
        <div className="overlay" aria-hidden="true">
          <span
            {...medianLabelLayer.attrs}
            className="median-label"
            style={{
              ...medianLabelLayer.vars,
              left: `${pct(medianX, frame.width)}%`,
              top: "2%",
            }}
          >
            {medianLabel}
          </span>
        </div>

        {/* The x axis: one label per bin LOWER EDGE, drawn at that edge, plus the last bin's upper
            edge at the far right. See this file's own doc-comment — a label naming an edge and drawn
            at a centre is the defect this beat carried. */}
        <div
          className="x-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {bars.map((b) => (
            <span
              key={`tick-${b.lo}`}
              className="axis-label x"
              style={{ left: `${pct(b.x, frame.width)}%`, color: muted }}
            >
              {b.lo}
            </span>
          ))}
          <span
            className="axis-label x"
            style={{ left: `${pct(x(lastEdge), frame.width)}%`, color: muted }}
          >
            {lastEdge}
          </span>
        </div>
      </div>

      <p
        className="axis-title x-axis-title"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        CO2 emissions per capita (tonnes/year)
      </p>

      <p
        className="chart-source"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        {source}
      </p>
    </figure>
  );
}
