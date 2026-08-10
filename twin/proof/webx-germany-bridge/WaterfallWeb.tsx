/**
 * The web beat of "Germany generated 143 fewer terawatt-hours in 2024 than 2015" — the interactive
 * genre.
 *
 * SECOND BUILD, migrated to the genre's FLUID FRAME (`twin-chart-web/assets/ChartWebSeed.tsx`,
 * `references/web-discipline.md` "Responsive behaviour"). Its first build SSR'd two pre-rendered
 * rungs (900px and 360px) swapped by a media query; the owner overturned that in favour of one
 * continuously-adaptive frame, and `renderWeb` no longer accepts a `layouts` array. The split that
 * makes a continuous fill safe: the `<svg>` below draws GEOMETRY ONLY — not one `<text>` element —
 * and every word (title, caveat, legend, source, axis labels, each bar's own signed value, the step
 * names) is plain HTML positioned by `%` over the same grid cell at a FIXED pixel `font-size`.
 * Geometry stretches; type does not.
 *
 * Written for a DIFFERENT mark family from the seed's line: bars that float on a RUNNING TOTAL
 * (`references/types/waterfall.md`). Not imported from the static sibling
 * `proof/static-germany-electricity-bridge/ElectricityBridgeWaterfall.tsx`, which bakes its words
 * into SVG `<text>` and reaches for `#shared/twin-chart-beat/render-still.mjs` directly.
 *
 * What hover/tap/keyboard-focus adds, and what it deliberately does NOT touch: every bar already
 * prints its own signed delta (or, for the two total bars, its own absolute value) directly above
 * itself, unconditionally — `references/types/waterfall.md`'s own rule, and nothing this genre's
 * doctrine allows gating behind interaction. What no frame can show without a reader doing
 * arithmetic by eye is the RUNNING LEVEL each delta bar produces — the sheet's own warning is that
 * "the chart implicitly asserts the closing total equals the opening total plus every signed step,"
 * and a reader cannot check that from any one bar. So only the three DELTA bars get a hit target
 * here; the two TOTAL bars already state everything they have to state and would gain only a
 * tooltip repeating their own printed label. Hovering a delta bar reveals its signed value AND the
 * exact running total Germany's generation reached immediately after that step.
 */

import {
  waterfallGeometry,
  formatNumber,
  formatSigned,
  type Step,
} from "./waterfall-geometry";

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

/** Declared here, not imported from the skill's seed — a compile-time-only type has no `#shared/*`
 *  vendoring path a story could import it from ("duplicate, do not link"). */
export type WebFrame = {
  /** The plot rectangle's own canonical proportions, in SVG user units. NOT a rendered pixel size
   *  and NOT a cap: `preserveAspectRatio="none"` stretches the `<svg>` to whatever box the grid
   *  gives it. */
  width: number;
  height: number;
  /** Fixed CSS pixel row below the plot for the step names — three lines' worth, because
   *  "2015 total generation" needs three of them at 375px inside a 60px box. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  category: { fontSize: number };
  /** The floor under a step name's own box, in fixed CSS pixels — see the `.x-axis` block below. */
  categoryMinBoxPx: number;
  valueLabel: { fontSize: number; fontWeight: number };
  legend: { fontSize: number; fontWeight: number };
  /** The gap between bars as a FRACTION of the canonical width. Widened from the first build's
   *  equivalent after looking at 375px: each step NAME sits in a box exactly its own bar wide and
   *  the long ones overhang into the gap, so the gap is what keeps "Renewables" and "Nuclear" from
   *  reading as one word. At this ratio they clear each other by 5px at 375px; at the previous
   *  0.035 it was under 2px, which measured as no overlap and looked like a collision. */
  barGapRatio: number;
};

export const FRAME: WebFrame = {
  width: 720,
  height: 400,
  xAxisRowPx: 46,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  category: { fontSize: 11 },
  categoryMinBoxPx: 60,
  valueLabel: { fontSize: 13, fontWeight: 700 },
  legend: { fontSize: 13, fontWeight: 600 },
  barGapRatio: 0.055,
};

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function WaterfallWeb({
  steps,
  title,
  subtitle,
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
  steps: Step[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
  /** The two SIGN fills, handed in by the runner from the recorded `PALETTE.md` via `seriesInks`.
   *  These were a module-level `{ increase: "#0072B2", decrease: "#D55E00" }` here until
   *  2026-08-10, which meant a newsroom could record its own colours and this bridge would go on
   *  drawing the same two. The argument for two of them is unchanged and still holds: on a
   *  waterfall, colour encodes the SIGN of each step, and the two have to read apart under every
   *  colour-vision deficiency — which is why they are separated by hue and not by lightness. WHICH
   *  two is the newsroom's answer, not this file's. The `total` bars stay `muted`, derived from the
   *  ground, because a total is not a step and must not read as one. */
  colours: { increase: string; decrease: string };
}) {
  if (steps.length < 3)
    throw new Error(
      `a waterfall beat needs at least three steps, got ${steps.length}`,
    );
  if (steps[0].kind !== "total" || steps[steps.length - 1].kind !== "total")
    throw new Error("a waterfall's first and last bars must be totals");

  const barGap = frame.width * frame.barGapRatio;
  const { plot, bars, ticksY } = waterfallGeometry(steps, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    barGap,
  });

  const tickLabels = ticksY.map((t) => formatNumber(t.value, 0));
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  /** The y of the running level a bar LEAVES BEHIND — the height the next bar starts from. Not the
   *  same as the bar's own `top`: for a falling step the bar hangs DOWN from the level before it,
   *  so its top is the OLD level and its bottom is the new one. The first build drew every
   *  connector at `top`, which meant the two dashes after Nuclear and after Fossil fuel floated at
   *  the level the step started from and pointed at nothing — the next bar begins 92 and 154 TWh
   *  lower. Seen by looking at the render, not by any test: the arithmetic behind the chart was
   *  right, only the line joining it up was wrong. */
  const levelY = (b: (typeof bars)[number]) =>
    b.kind === "total" || b.value >= 0 ? b.top : b.bottom;

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: colours.decrease,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.valueLabel.fontSize}px`,
        ["--label-weight" as string]: frame.valueLabel.fontWeight,
        ["--note-size" as string]: `${frame.category.fontSize}px`,
      }}
    >
      <div className="chart-header">
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      {/* The legend, in HTML: three items in a flex row the browser wraps itself at any width. The
          first build placed each swatch at a hand-measured x, which is how a legend ends up running
          off the edge of a frame nobody re-measured. */}
      <div
        className="chart-legend"
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 20px",
          margin: "12px 0 14px",
          fontSize: `${frame.legend.fontSize}px`,
          fontWeight: frame.legend.fontWeight,
          color: ink,
        }}
      >
        {[
          { label: "Increase", colour: colours.increase },
          { label: "Decrease", colour: colours.decrease },
          { label: "Total", colour: muted },
        ].map((item) => (
          <span
            key={item.label}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <span
              aria-hidden="true"
              style={{
                width: "12px",
                height: "12px",
                flex: "0 0 auto",
                background: item.colour,
              }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${frame.xAxisRowPx}px`,
          aspectRatio: `${yGutterPx + frame.width} / ${frame.height + frame.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
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

        {/* GEOMETRY ONLY — no `<text>`. */}
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

          {ticksY.map((tick) => (
            <line
              key={tick.value}
              x1={0}
              x2={frame.width}
              y1={tick.y}
              y2={tick.y}
              stroke={tick.value === 0 ? muted : grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Thin connectors carry the running level from each bar's end to the next bar's start —
              see `levelY` above for the level they are drawn at and why it is not `top`. */}
          {bars.slice(0, -1).map((b, i) => (
            <line
              key={b.label}
              x1={b.x + b.width}
              x2={bars[i + 1].x}
              y1={levelY(b)}
              y2={levelY(b)}
              stroke={muted}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {bars.map((b) => (
            <g key={b.label}>
              <rect
                x={b.x}
                y={b.top}
                width={b.width}
                height={Math.max(b.bottom - b.top, 0)}
                fill={
                  b.kind === "total"
                    ? muted
                    : colours[b.kind as "increase" | "decrease"]
                }
              />
              {/* Interaction layer: only the three DELTA bars get a hit target — this file's own
                  header comment gives the reasoning. `tabIndex={0}` and `aria-label` baked in at
                  build time, so the reading is reachable with the script absent entirely. */}
              {b.kind !== "total" && (
                <rect
                  className="step-hit"
                  x={b.x}
                  y={plot.top}
                  width={b.width}
                  height={plot.bottom - plot.top}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${b.label}: ${formatSigned(b.value)} TWh — running total after this step: ${formatNumber(b.runningAfter)} TWh`}
                  data-detail={`${b.label} ${formatSigned(b.value)} TWh · running total: ${formatNumber(b.runningAfter)} TWh`}
                />
              )}
            </g>
          ))}
        </svg>

        {/* HTML overlay — the same grid cell as the `<svg>`. `pointer-events: none` (the shared
            stylesheet's own rule) is what keeps every delta bar hoverable straight through its own
            value label. */}
        <div className="overlay" aria-hidden="true">
          {bars.map((b) => (
            <span
              key={`value-${b.label}`}
              style={{
                position: "absolute",
                left: `${pct(b.center, frame.width)}%`,
                top: `${pct(b.top, frame.height)}%`,
                transform: "translate(-50%, -100%) translateY(-5px)",
                fontSize: `${frame.valueLabel.fontSize}px`,
                fontWeight: frame.valueLabel.fontWeight,
                color: ink,
                whiteSpace: "nowrap",
              }}
            >
              {/* Above the bar's growing edge, in ink — never inside the bar
                  (`references/types/waterfall.md`'s own named defect on narrow bars). */}
              {b.kind === "total"
                ? formatNumber(b.value)
                : formatSigned(b.value)}
            </span>
          ))}
        </div>

        {/* The step names, allowed to WRAP — the shared stylesheet's `white-space: nowrap` is right
            for a year and wrong for "2015 total generation".
            Both numbers below were settled by measuring the render at 375px, where five names of
            this length is the hard case.
            The WIDTH is `max(one bar, 60px)`. A box exactly one bar wide is 47px at 375, narrower
            than the longest word it has to hold ("Renewables", 61px), and an over-long line does not
            centre — it overflows to the RIGHT only, which is why "Renewables" ran into "Nuclear" and
            read as one word, and why the last name's third line reached 10px past the frame's own
            inner margin. A floor in fixed pixels lets the box hold its widest word at the narrow end
            while the bar's own width takes over wherever there is room.
            The SIZE is 11px, not the 12px the rest of this frame uses, and that is the whole reason
            the names fit at all: at 12px the widest lines of two neighbouring names ("generation",
            56px, and "Renewables", 66px) leave 1px between them across a 62px column pitch — no
            overlap a script can see, and a collision to any eye. At 11px they clear by 7px. */}
        <div className="x-axis">
          {bars.map((b) => (
            <span
              key={`name-${b.label}`}
              className="axis-label x"
              style={{
                left: `${pct(b.center, frame.width)}%`,
                width: `max(${pct(b.width, frame.width)}%, ${frame.categoryMinBoxPx}px)`,
                whiteSpace: "normal",
                textAlign: "center",
                lineHeight: 1.15,
                fontSize: `${frame.category.fontSize}px`,
                color: muted,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-source">{source}</p>
    </figure>
  );
}
