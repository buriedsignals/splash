/**
 * The web beat of "the US is far behind on life expectancy for how rich it is" — a scatter, not a
 * line. Coordinates and number formatting come from `./income-life-geometry.ts`; this file adds the
 * one thing neither a static frame nor a video build has — a reader who can ask any of the ~164
 * dots what it is and get an exact answer back, without anything the static frame already states
 * being gated behind that ask. Read `twin-chart-web/references/web-discipline.md` and
 * `twin-chart-beat/references/types/scatter.md` before changing this file.
 *
 * MIGRATED TO THE FLUID FRAME. This file used to ship two pre-rendered widths (900px and 360px)
 * swapped by a media query. One frame now, filling its container continuously and fitting the
 * visible window, by the separation `twin-chart-web/assets/ChartWebSeed.tsx` teaches: the `<svg>`
 * carries GEOMETRY ONLY (gridlines and the three leader lines — no `<text>` at all), and every word
 * is HTML at a FIXED pixel size, positioned by `%` over the same grid cell. Geometry stretches;
 * type does not.
 *
 * AND SO DO THE DOTS — the one decision this type forced that the line beat did not. A fluid frame
 * stretches its `viewBox` with `preserveAspectRatio="none"`, which turns an SVG `<circle>` into an
 * ELLIPSE at every width where the box's own proportions differ from the geometry's. On a line beat
 * that is invisible (its points are transparent hit targets). Here the cloud of dots IS the
 * argument — `scatter.md`: "the SHAPE of the cloud is the argument, not each member's name" — and a
 * cloud of stretched ellipses is a different picture from a cloud of dots. So every dot is an HTML
 * element positioned by `%` at a FIXED pixel diameter: it lands exactly where the geometry put it,
 * and it stays round at 375px and at 3440px alike. The dot's SIZE is furniture; only its POSITION is
 * geometry, and this genre's whole rule is that those two things scale differently.
 *
 * That also decides the interaction: `scatter-interaction.mjs` resolves a pointer to the nearest dot
 * by real screen distance (see that file), not by x alone the way the skill's own shared script
 * does — which would silently pick the wrong country the moment two points share a similar GDP but
 * differ in life expectancy, exactly the shape of this dataset (Switzerland and the United States
 * sit close in x, far apart in y).
 */

import { scaleLinear } from "d3-scale";
import {
  logTicks,
  scatterGeometry,
  usd,
  usdTickLabel,
  years,
  type CountryRow,
} from "./income-life-geometry";

const GDP_UNIT = "US$";

/** The three points this beat names, and where their label sits relative to their own dot — a
 *  hand-tuned editorial call, not something a script can derive (the scatter doctrine: "pick label
 *  anchors that sit outside the point and outside every other label's box"). Keyed by ISO code so a
 *  label survives a country name changing case or punctuation in a future data refresh.
 *
 *  Switzerland and the United States sit almost directly above each other on this log x-axis (their
 *  GDP differs by only ~3.5% in log terms) but ~5 life-expectancy years apart, so both labels sit to
 *  the RIGHT of their own dot, staggered up and down. Cuba's GDP is roughly an order of magnitude
 *  lower, so its dot sits well clear of both and its label sits straight above it. The offsets are
 *  in CANONICAL units, not pixels: the leader line is SVG geometry and the label is HTML, and
 *  expressing both in the same units is what keeps a label welded to the end of its own leader at
 *  every width. Tuned by rendering and looking. */
type LabelOffset = {
  dx: number;
  dy: number;
  anchor: "start" | "middle" | "end";
};
type NamedLayout = Record<"CHE" | "USA" | "CUB", LabelOffset>;

/** This genre's single fluid frame, in this beat's own shape — declared here, not imported from the
 *  skill's seed (no `#shared/*` vendoring path exists for a compile-time-only type; duplicate, do
 *  not link). */
export type ScatterFrame = {
  /** The plot rectangle's canonical width/height in SVG user units. NOT a rendered pixel size and
   *  NOT a cap — it fixes the geometry's internal proportions, which become one `aspect-ratio`. */
  width: number;
  height: number;
  /** Fixed CSS pixel rows below the plot: one for the x tick labels, one for the axis title. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  axisTitle: { fontSize: number };
  label: { fontSize: number; fontWeight: number };
  /** Dot diameters in CSS PIXELS — fixed, like the type, because a dot is a mark a reader has to be
   *  able to see rather than a length that means something. The unlabelled cloud's dot is small
   *  enough that ~161 of them on a 375px-wide frame still read as a cloud instead of a blob. */
  dotPx: number;
  namedDotPx: number;
  yTickHint: number;
  labelOffsets: NamedLayout;
};

export const FRAME: ScatterFrame = {
  // A taller canonical box than the other beats carry, and deliberately: height follows width in
  // this genre, so a wide window clamps to the viewport anyway (the plot measured 683px at
  // 1600x900 either way) while a narrow one gets exactly what this ratio gives it. At 820x460 a
  // 375px phone drew a 184px plot and 164 dots packed into a blob; this ratio draws ~250px of the
  // same cloud, which is the difference between a shape and a smudge. Measured at three viewports,
  // not reasoned about.
  width: 820,
  height: 640,
  xAxisRowPx: 24,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  axisTitle: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: 600 },
  dotPx: 6,
  namedDotPx: 11,
  yTickHint: 6,
  labelOffsets: {
    CHE: { dx: 14, dy: -14, anchor: "start" },
    USA: { dx: 14, dy: 20, anchor: "start" },
    CUB: { dx: 0, dy: -22, anchor: "middle" },
  },
};

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Wrap on the measured width of the real string, never a character count. Kept and exported the
 *  way every other beat keeps its copy; this component's own header text is flowing HTML the
 *  browser wraps itself, so nothing here calls it. */
export function wrap(
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

/** A coordinate as a percentage of the box it was drawn in — what lets an HTML dot or label land
 *  exactly where the geometry put it, and stay there as the browser stretches that box. */
function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function IncomeLifeExpectancyWeb({
  data,
  title,
  subtitle,
  source,
  alt,
  ground,
  accent,
  ink,
  muted,
  grid,
  frame,
  measure,
}: {
  /** Every valid row EXCEPT Central African Republic's 2022 reading — excluded upstream, in
   *  `render-web.mjs`'s CSV reader, per `BRIEF.md`'s data-quality flag. This component draws
   *  whatever it is handed and does not know the exclusion happened. */
  data: CountryRow[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  frame: ScatterFrame;
  measure: Measure;
}) {
  if (data.length < 8)
    throw new Error(
      `a scatter needs enough points for a cloud shape to read, got ${data.length}`,
    );

  // Y ticks (life expectancy) from a provisional scale at the canonical range — the same two-pass
  // approach the other beats use: the tick labels have to exist before the gutter they sit in can
  // be measured.
  const yProvisional = scaleLinear()
    .domain(
      (() => {
        const values = data.map((d) => d.lifeExpectancy);
        return [Math.min(...values), Math.max(...values)] as [number, number];
      })(),
    )
    .nice()
    .range([frame.height, 0]);
  const yTicks = yProvisional.ticks(frame.yTickHint);
  const topY = Math.max(...yTicks);
  const yTickLabels = yTicks.map((v) =>
    v === topY ? `${years(v, 0)} yrs` : years(v, 0),
  );

  const yGutterPx =
    10 + Math.max(...yTickLabels.map((l) => measure(l, frame.axis)));

  // The plot rectangle IS the box: gutters are CSS grid tracks around it, never baked into the
  // viewBox.
  const g = scatterGeometry(data, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const xTicks = logTicks(g.xDomain);

  const named = g.points.filter(
    (p): p is (typeof g.points)[number] & { code: "CHE" | "USA" | "CUB" } =>
      p.code === "CHE" || p.code === "USA" || p.code === "CUB",
  );
  if (named.length !== 3)
    throw new Error(
      `expected exactly 3 named points (CHE, USA, CUB), found ${named.length}`,
    );
  const namedCodes = new Set(named.map((p) => p.code));

  const totalWidth = yGutterPx + frame.width;
  const totalHeight = frame.height + frame.xAxisRowPx;

  const dot = (p: (typeof g.points)[number], isNamed: boolean) => (
    <span
      key={p.code}
      className={isNamed ? "pt pt-named" : "pt"}
      style={{
        left: `${pct(p.x, frame.width)}%`,
        top: `${pct(p.y, frame.height)}%`,
        width: isNamed ? frame.namedDotPx : frame.dotPx,
        height: isNamed ? frame.namedDotPx : frame.dotPx,
        background: isNamed ? accent : muted,
      }}
      tabIndex={0}
      role="img"
      aria-label={`${p.country}: ${usd(p.gdp)} GDP per capita, ${years(p.lifeExpectancy)} years life expectancy`}
      data-country={p.country}
      data-detail={`${p.country} · ${usd(p.gdp)} · ${years(p.lifeExpectancy)} yrs`}
    />
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
        ["--label-size" as string]: `${frame.label.fontSize}px`,
        ["--label-weight" as string]: frame.label.fontWeight,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      {/* Both axes stated explicitly — the scatter doctrine's own rule: "a bare number axis on a
          scatter is close to unreadable... unlike a bar chart's shared baseline there is no other
          cue for what a position means." The y title sits ABOVE the plot rectangle and the x title
          BELOW it, in their own rows of the figure's flex column, so neither can occlude a real
          point the way a title in the plot's own corner silently can ("The accessibility trap"). */}
      <p className="axis-title y-axis-title">
        Life expectancy at birth (years)
      </p>

      <div
        className="chart-plot scatter-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${totalWidth} / ${totalHeight}`,
        }}
      >
        <div className="y-axis">
          {yTicks.map((value, i) => (
            <span
              key={value}
              className="axis-label y"
              style={{ top: `${pct(g.y(value), frame.height)}%`, color: muted }}
            >
              {yTickLabels[i]}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY below — no `<text>`, and no dots either: they are HTML, see this file's
            own doc-comment. What is left here is what genuinely must stretch with the frame — the
            gridlines, and the three leader lines that connect a named dot to its own label. */}
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
          {/* Deliberately no root role="img" — the per-point elements need to stay individually
              reachable and individually named. `<desc>` still carries the alt text. */}
          <desc>{alt}</desc>
          <rect
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill={ground}
          />

          {yTicks.map((value) => (
            <line
              key={`y-${value}`}
              x1={0}
              x2={frame.width}
              y1={g.y(value)}
              y2={g.y(value)}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* One vertical gridline per decade — a log axis's own "round number". */}
          {xTicks.map((value) => (
            <line
              key={`x-${value}`}
              x1={g.x(value)}
              x2={g.x(value)}
              y1={0}
              y2={frame.height}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {named.map((p) => {
            const off = frame.labelOffsets[p.code];
            return (
              <line
                key={`leader-${p.code}`}
                x1={p.x}
                y1={p.y}
                x2={p.x + off.dx}
                y2={p.y + off.dy}
                stroke={accent}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* The shared hit area: `scatter-interaction.mjs` resolves a pointer or a tap anywhere
              over the plot to the nearest dot by real screen distance, so a phone reader never has
              to land a tap on a 6px dot. */}
          <rect
            className="hit-area"
            x={0}
            y={0}
            width={frame.width}
            height={frame.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        {/* The dots and the three named labels — HTML over the same grid cell the geometry is drawn
            in. `pointer-events` stay off (inherited from `.overlay`) so every pointer reaches the
            hit area beneath and the nearest-dot resolution answers; keyboard focus reaches each dot
            directly, because each one is a real focusable element carrying its own `aria-label`. */}
        <div className="overlay">
          {g.points
            .filter((p) => !namedCodes.has(p.code as "CHE" | "USA" | "CUB"))
            .map((p) => dot(p, false))}
          {named.map((p) => dot(p, true))}
          {named.map((p) => {
            const off = frame.labelOffsets[p.code];
            return (
              <span
                key={`label-${p.code}`}
                className={`point-label anchor-${off.anchor}`}
                style={{
                  left: `${pct(p.x + off.dx, frame.width)}%`,
                  top: `${pct(p.y + off.dy, frame.height)}%`,
                }}
              >
                {p.country}
              </span>
            );
          })}
        </div>

        <div className="x-axis">
          {xTicks.map((value) => (
            <span
              key={value}
              className="axis-label x"
              style={{ left: `${pct(g.x(value), frame.width)}%`, color: muted }}
            >
              {usdTickLabel(value)}
            </span>
          ))}
        </div>
      </div>

      <p className="axis-title x-axis-title">
        GDP per capita, log scale ({GDP_UNIT})
      </p>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
