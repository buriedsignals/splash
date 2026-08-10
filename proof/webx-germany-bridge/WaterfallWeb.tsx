/**
 * The web beat of "Germany generated 143 fewer terawatt-hours in 2024 than 2015" — the interactive
 * genre.
 *
 * SECOND BUILD, migrated to the genre's FLUID FRAME (`chart-web/assets/ChartWebSeed.tsx`,
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
 * into SVG `<text>` and reaches for `#shared/chart-beat/render-still.mjs` directly.
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
  ENTRANCE_EASING,
  LABEL_FADE_MS,
  WEB_ENTRANCE,
  atProgress,
  endOf,
  entranceLayer,
  markEvent,
} from "../../skills/chart-web/assets/entrance.ts";
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

  // ── THE ENTRANCE, carried from `proof/vidy-waterfall-germany-electricity-mix` — the VIDEO of this
  // exact claim, which already answered the question I had left open: a waterfall's baseline is a
  // running total, so what does a bar grow from?
  //
  // THE VIDEO'S ANSWER, four events, unchanged here:
  //   - THE OPENING TOTAL lands first, a full bar from zero, and DOUBLES AS THE REFERENCE — the
  //     level the whole bridge is read against. That is why this beat's `reference` is a bar and not
  //     a rule.
  //   - EACH SIGNED STEP then floats in one at a time, left to right, GROWING FROM EXACTLY WHERE THE
  //     PREVIOUS BAR ENDED. Its own baseline is the running total before it — the bar's own
  //     running-level edge, which is its BOTTOM when the step rises and its TOP when it falls. The
  //     connector that makes the carry literal arrives with the step it leads into, not with the one
  //     it leaves.
  //   - THE CLOSING TOTAL is the SUBJECT, again a full bar from zero, so its height can be read
  //     directly against the opening bar's.
  //   - THE CONCLUSION is that closing figure, stated once its bar is standing.
  //
  // ONE THING THE WEB CANNOT CARRY, and the video names it as a defect so it is argued rather than
  // waved through. There, a value label fades in within the first QUARTER of its own bar's window
  // and then RIDES the growing tip; `waterfall.md` calls gating on the last slice "a label that's
  // absent for most of the time the bar is on screen". CSS is handed ONE delay up front and cannot
  // move a label along a growing edge, so the choice is a label printed at the final tip while the
  // bar is still short — a number naming a height the bar has not reached, which is the label rule's
  // own prohibition and which `verify-entrance.mjs` drives — or a label that waits. It waits, and
  // the video's objection does not transfer: THERE the bar is on screen for eight seconds and the
  // label would be missing for 0.9 of them; HERE the bar is on screen for the rest of the page's
  // life and the label is missing for at most 460ms of a two-second entrance. "Most of the time the
  // bar is on screen" is false in this medium by construction.
  const middle = bars.slice(1, -1);
  const opening = bars[0];
  const closing = bars[bars.length - 1];
  /** The level a bar GROWS FROM: zero for a total, the running total before it for a step — which
   *  is the bar's bottom edge when it rises and its top edge when it falls. */
  const baselineOf = (b: (typeof bars)[number]) =>
    b.value >= 0 ? b.bottom : b.top;
  const windowFor = (labelName: string) => {
    if (labelName === opening.label) return WEB_ENTRANCE.reference;
    if (labelName === closing.label) return WEB_ENTRANCE.subject;
    return markEvent(
      WEB_ENTRANCE.reveal,
      middle.findIndex((b) => b.label === labelName),
      middle.length,
    );
  };
  const eventFor = (labelName: string) =>
    labelName === opening.label
      ? ("reference" as const)
      : labelName === closing.label
        ? ("subject" as const)
        : ("reveal" as const);
  const barLayer = (b: (typeof bars)[number]) => {
    const own = windowFor(b.label);
    return entranceLayer(eventFor(b.label), "grow", {
      delay: own.start,
      duration: own.duration,
      ease: ENTRANCE_EASING.ARRIVE,
      grow: { axis: "y", origin: { x: 0, y: baselineOf(b) } },
      mark: b.label,
    });
  };
  /** The dashed carry from bar `i` to bar `i+1`. It belongs to the step it leads INTO and arrives
   *  AS that step starts growing, which is what makes the carry literal: the line says "this next
   *  bar starts here" while the bar is starting there.
   *
   *  It deliberately does NOT declare `names`. That attribute means "this layer may not be painted
   *  until the mark it names has arrived", and a connector is the opposite — it is furniture that
   *  introduces the step. Declared as a label it went red on the first drive, correctly: *"the label
   *  for Renewables was painted while its own mark was at 0.299"*. The guard was right about the
   *  vocabulary and the vocabulary was being misused. */
  const connectorLayer = (i: number) => {
    const next = bars[i + 1];
    const own = windowFor(next.label);
    return entranceLayer(eventFor(next.label), "fade", {
      delay: own.start,
      duration: LABEL_FADE_MS,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  };
  const valueLabelLayer = (b: (typeof bars)[number]) =>
    b.label === closing.label
      ? entranceLayer("conclusion", "fade", {
          delay: WEB_ENTRANCE.conclusion.start,
          duration: WEB_ENTRANCE.conclusion.duration,
          ease: ENTRANCE_EASING.ARRIVE,
          names: b.label,
        })
      : entranceLayer(eventFor(b.label), "fade", {
          delay: atProgress(windowFor(b.label), 1),
          duration: LABEL_FADE_MS,
          ease: ENTRANCE_EASING.ARRIVE,
          names: b.label,
        });
  const furnitureLayer = () =>
    entranceLayer("establish", "fade", {
      delay: WEB_ENTRANCE.establish.start,
      duration: WEB_ENTRANCE.establish.duration,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  const lastStepEnd = Math.max(
    ...middle.map((b) => atProgress(windowFor(b.label), 1) + LABEL_FADE_MS),
  );
  if (lastStepEnd > endOf(WEB_ENTRANCE.subject))
    throw new Error(
      `the last step's value label ends at ${lastStepEnd}ms, after the closing total lands at ` +
        `${endOf(WEB_ENTRANCE.subject)}ms — the bridge would still be building under its own answer`,
    );

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
      <div
        className="chart-header"
        {...furnitureLayer().attrs}
        style={furnitureLayer().vars}
      >
        <h2 className="chart-title">{title}</h2>
        <p className="chart-caveat">{subtitle}</p>
      </div>

      {/* The legend, in HTML: three items in a flex row the browser wraps itself at any width. The
          first build placed each swatch at a hand-measured x, which is how a legend ends up running
          off the edge of a frame nobody re-measured. */}
      <div
        className="chart-legend"
        {...furnitureLayer().attrs}
        style={{
          ...furnitureLayer().vars,
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

          {/* Gridlines are FURNITURE and come up on one clock with the labels beside them. */}
          <g {...furnitureLayer().attrs} style={furnitureLayer().vars}>
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
          </g>

          {/* Thin connectors carry the running level from each bar's end to the next bar's start —
              see `levelY` above for the level they are drawn at and why it is not `top`. */}
          {bars.slice(0, -1).map((b, i) => (
            <line
              key={b.label}
              {...connectorLayer(i).attrs}
              style={connectorLayer(i).vars}
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
                {...barLayer(b).attrs}
                style={barLayer(b).vars}
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
              {...valueLabelLayer(b).attrs}
              style={{
                ...valueLabelLayer(b).vars,
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
        <div
          className="x-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
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
