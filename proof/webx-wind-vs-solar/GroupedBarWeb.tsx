/**
 * The web beat of "Switzerland is the outlier: solar beats wind" — the interactive genre.
 *
 * SECOND BUILD, migrated to the genre's FLUID FRAME (`chart-web/assets/ChartWebSeed.tsx`,
 * `references/web-discipline.md` "Responsive behaviour"). Its first build SSR'd two pre-rendered
 * rungs (900px and 360px) swapped by a media query; the owner overturned that in favour of one
 * continuously-adaptive frame, and `renderWeb` no longer accepts a `layouts` array. The split that
 * makes a continuous fill safe: the `<svg>` below draws GEOMETRY ONLY — not one `<text>` element —
 * and every word (title, caveat, legend, source, axis labels, each bar's own share, the callout) is
 * plain HTML positioned by `%` over the same grid cell at a FIXED pixel `font-size`. Geometry
 * stretches; type does not.
 *
 * Written for a DIFFERENT mark family from the seed's line: two nested bands
 * (`references/types/grouped-bar.md`), a zero-anchored length encoding, a legend (the type's own
 * accepted exception to direct labelling). Not imported from the static sibling
 * `proof/static-wind-vs-solar/WindVsSolarBar.tsx`, which bakes its words into SVG `<text>` and
 * reaches for `#shared/chart-beat/render-still.mjs` directly.
 *
 * This beat does NOT reuse the skill's `assets/interaction.mjs` — that script resolves a pointer to
 * the nearest of many points along ONE continuous axis, built for a line. Twelve already-large,
 * already-labelled bars have nothing to interpolate between; every bar is its own direct hit
 * target, the same reasoning `proof/web-co2-ranking/RankingWeb.tsx` gives for its own rows.
 * `render-web.mjs` still calls the genre's generic `renderWeb` (the one way in) and lets it inline
 * `interaction.mjs` as a harmless no-op (no `.pt` circles here), then appends this beat's own
 * `./grouped-bar-interaction.mjs` as a second inline script.
 *
 * What hover/tap/keyboard-focus adds: the printed label on each bar is a rounded PERCENTAGE of that
 * country's total generation. What nothing here shows is the absolute scale behind that share —
 * Germany's 141.6 TWh of wind and Switzerland's 0.2 TWh could both read as small percentages of
 * very different totals, and a reader cannot tell them apart from bar height alone (the chart is
 * deliberately about SHARE — `BRIEF.md`'s own claim is a share comparison). Hover, tap or keyboard
 * focus on any bar reveals its exact share to two decimals AND the terawatt-hours behind it.
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
  groupedBarGeometry,
  formatNumber,
  type Group,
} from "./grouped-bar-geometry";

const UNIT = "%";

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
  /** Fixed CSS pixel row below the plot for the country names — two staggered rows' worth. See the
   *  `.x-axis` block below for why the names alternate rows rather than sitting on one. */
  xAxisRowPx: number;
  title: { fontSize: number; fontWeight: number };
  subtitle: { fontSize: number; fontWeight: number };
  source: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  category: { fontSize: number };
  value: { fontSize: number; fontWeight: number };
  legend: { fontSize: number; fontWeight: number };
  callout: { fontSize: number; fontWeight: number };
  yTickHint: number;
  /** Both gaps as a FRACTION of the canonical width, so the bars' own proportions survive the
   *  stretch: a gap fixed in canonical units would still scale, but expressing it this way keeps
   *  the two numbers readable against the one width they are relative to. */
  groupGapRatio: number;
  barGapRatio: number;
};

export const FRAME: WebFrame = {
  width: 700,
  height: 400,
  xAxisRowPx: 36,
  title: { fontSize: 24, fontWeight: 700 },
  subtitle: { fontSize: 14, fontWeight: 400 },
  source: { fontSize: 13, fontWeight: 400 },
  axis: { fontSize: 12 },
  category: { fontSize: 12 },
  value: { fontSize: 12, fontWeight: 700 },
  legend: { fontSize: 13, fontWeight: 600 },
  callout: { fontSize: 13, fontWeight: 600 },
  yTickHint: 5,
  groupGapRatio: 0.03,
  barGapRatio: 0.005,
};

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/** Which way a label positioned at fraction `f` of the frame's width must hang so it stays inside
 *  the frame. Fluid-safe by construction: a clamp computed in canonical units would be right at one
 *  container width and wrong at every other. */
function anchorAt(f: number): string {
  if (f < 0.2) return "translateX(0)";
  if (f > 0.8) return "translateX(-100%)";
  return "translateX(-50%)";
}

export function GroupedBarWeb({
  groups,
  title,
  subtitle,
  source,
  alt,
  calloutSubject,
  calloutText,
  ground,
  ink,
  muted,
  grid,
  measure,
  frame,
  colours,
}: {
  groups: Group[];
  title: string;
  subtitle: string;
  source: string;
  alt: string;
  calloutSubject: string;
  calloutText: string;
  ground: string;
  ink: string;
  muted: string;
  grid: string;
  measure: Measure;
  frame: WebFrame;
  /** The two SERIES hues, handed in by the runner from the recorded `PALETTE.md` via `seriesInks`.
   *  These were a module-level pair of hex constants here until 2026-08-10. The argument for two of them is the legend's own, restated: colour is the ONLY cue
   *  tying a bar in the sixth group back to "wind" or "solar", so the pair must read apart by hue
   *  under every colour-vision deficiency, and the annotation naming the subject stays ink rather
   *  than becoming a third hue. WHICH two is the newsroom's answer, not this file's — and one of the
   *  two this file used to name did not clear the 3:1 non-text floor against the ground it was drawn
   *  on. See `PALETTE.md` beside this component for the measurement and what replaced it. */
  colours: { wind: string; solar: string };
}) {
  if (groups.length < 2)
    throw new Error(
      `a grouped bar beat needs at least two groups, got ${groups.length}`,
    );

  const groupGap = frame.width * frame.groupGapRatio;
  const barGap = frame.width * frame.barGapRatio;

  const { plot, bars, ticksY } = groupedBarGeometry(groups, {
    width: frame.width,
    height: frame.height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    groupGap,
    barGap,
    yTickHint: frame.yTickHint,
  });

  const topTick = ticksY[ticksY.length - 1];
  const tickLabels = ticksY.map((t) =>
    t === topTick ? `${t.value} ${UNIT}` : `${t.value}`,
  );
  const yGutterPx =
    10 + Math.max(...tickLabels.map((l) => measure(l, frame.axis)));

  const calloutBar = bars.find((b) => b.name === calloutSubject);

  // ── THE ENTRANCE, carried from `proof/vidx-grouped-bar-co2-per-capita`, the grouped-bar video:
  // each CATEGORY takes its own overlapping slice of the reveal (`categoryWindow`, factor 1.6) and
  // its bars rise together from the shared zero — `interpolate(catProgress, [0, 1], [g.zeroY, top])`
  // per bar, one clock per group, so a group's two bars are never ahead of each other.
  //
  // The zero rule is this beat's reference, laid down before any bar. The subject is the callout's
  // own country: the video rings an already-landed column, this page has no ring at rest, so the
  // subject's own arrival is the emphasis — its group is lifted out and lands last, with the callout
  // that names it as the conclusion.
  const cascade = bars.filter((b) => b.name !== calloutSubject);
  const windowFor = (name: string) =>
    name === calloutSubject
      ? WEB_ENTRANCE.subject
      : markEvent(
          WEB_ENTRANCE.reveal,
          cascade.findIndex((b) => b.name === name),
          cascade.length,
        );
  const eventFor = (name: string) =>
    name === calloutSubject ? ("subject" as const) : ("reveal" as const);
  const barLayer = (name: string, key: "wind" | "solar", baselineY: number) => {
    const own = windowFor(name);
    return entranceLayer(eventFor(name), "grow", {
      delay: own.start,
      duration: own.duration,
      ease: ENTRANCE_EASING.ARRIVE,
      grow: { axis: "y", origin: { x: 0, y: baselineY } },
      mark: `${name}·${key}`,
    });
  };
  const valueLabelLayer = (name: string, key: "wind" | "solar") =>
    entranceLayer(eventFor(name), "fade", {
      delay: atProgress(windowFor(name), 1),
      duration: LABEL_FADE_MS,
      ease: ENTRANCE_EASING.ARRIVE,
      names: `${name}·${key}`,
    });
  const furnitureLayer = () =>
    entranceLayer("establish", "fade", {
      delay: WEB_ENTRANCE.establish.start,
      duration: WEB_ENTRANCE.establish.duration,
      ease: ENTRANCE_EASING.ARRIVE,
    });
  const zeroRuleLayer = entranceLayer("reference", "wipe", {
    delay: WEB_ENTRANCE.reference.start,
    duration: WEB_ENTRANCE.reference.duration,
    ease: ENTRANCE_EASING.ARRIVE,
  });
  const calloutLayer = () =>
    entranceLayer("conclusion", "fade", {
      delay: WEB_ENTRANCE.conclusion.start,
      duration: WEB_ENTRANCE.conclusion.duration,
      ease: ENTRANCE_EASING.ARRIVE,
      names: `${calloutSubject}·solar`,
    });
  const lastCascadeEnd = Math.max(
    ...cascade.map((b) => atProgress(windowFor(b.name), 1) + LABEL_FADE_MS),
  );
  if (lastCascadeEnd > endOf(WEB_ENTRANCE.subject))
    throw new Error(
      `the last group's value labels end at ${lastCascadeEnd}ms, after the subject lands at ` +
        `${endOf(WEB_ENTRANCE.subject)}ms`,
    );

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: colours.solar,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--title-size" as string]: `${frame.title.fontSize}px`,
        ["--title-weight" as string]: frame.title.fontWeight,
        ["--subtitle-size" as string]: `${frame.subtitle.fontSize}px`,
        ["--source-size" as string]: `${frame.source.fontSize}px`,
        ["--axis-size" as string]: `${frame.axis.fontSize}px`,
        ["--label-size" as string]: `${frame.value.fontSize}px`,
        ["--label-weight" as string]: frame.value.fontWeight,
        ["--note-size" as string]: `${frame.callout.fontSize}px`,
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

      {/* The two-entry legend — the grouped-bar sheet's one accepted exception, colour being the
          only cue tying a bar in the sixth group back to "wind" or "solar". In HTML rather than
          SVG, so the browser does the row's own arithmetic at every width; the first build placed
          each swatch at a hand-measured x. */}
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
          { label: "Wind", colour: colours.wind },
          { label: "Solar", colour: colours.solar },
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

      {/* Direct annotation naming the subject — ink text, never a third hue (`static-discipline.md`'s
          "one accent" / "direct labels" rules, restated for a chart whose colour budget is already
          spent on the two series). Unconditional; never gated behind interaction.
          It sits ABOVE the plot rather than inside it, and that placement was forced by measurement,
          not preference. Inside the overlay it had nowhere to go: the only region of the plot free
          of bars is the column above Switzerland itself — 49px wide at 375px, far too narrow for a
          line of prose — and a box wide enough to read reached back over Sweden's own 23.5% bar. Its
          first fluid draft was worse still: an absolutely positioned box anchored at the frame's
          right edge has almost no room to shrink into, so it collapsed to a 70px column of stacked
          words printed over the beat's own title. Above the plot it collides with nothing at any
          width, and the dashed leader below runs from the frame's top edge down to the bars it
          names, directly under these words. */}
      {calloutBar && (
        <p
          {...calloutLayer().attrs}
          style={{
            ...calloutLayer().vars,
            flex: "0 0 auto",
            margin: "0 0 8px auto",
            maxWidth: "260px",
            textAlign: "right",
            lineHeight: 1.25,
            fontSize: `${frame.callout.fontSize}px`,
            fontWeight: frame.callout.fontWeight,
            color: ink,
          }}
        >
          {calloutText}
        </p>
      )}

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

          {/* THE REVEAL — one clock per country, both bars rising together from the shared zero. */}
          {bars.map((b) => (
            <g key={b.name}>
              <rect
                {...barLayer(b.name, "wind", b.wind.y + b.wind.height).attrs}
                style={barLayer(b.name, "wind", b.wind.y + b.wind.height).vars}
                x={b.wind.x}
                y={b.wind.y}
                width={b.wind.width}
                height={b.wind.height}
                fill={colours.wind}
              />
              <rect
                {...barLayer(b.name, "solar", b.solar.y + b.solar.height).attrs}
                style={barLayer(b.name, "solar", b.solar.y + b.solar.height).vars}
                x={b.solar.x}
                y={b.solar.y}
                width={b.solar.width}
                height={b.solar.height}
                fill={colours.solar}
              />

              {/* Interaction layer: one direct hit target per bar, `tabIndex={0}` and `aria-label`
                  baked in at build time — reachable with the script absent entirely. */}
              <rect
                className="bar-hit"
                x={b.wind.x}
                y={plot.top}
                width={b.wind.width}
                height={plot.bottom - plot.top}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${b.name}, wind: ${formatNumber(b.wind.value, 2)}% of generation, ${formatNumber(b.wind.twh)} TWh`}
                data-detail={`${b.name} · Wind ${formatNumber(b.wind.value, 2)}% (${formatNumber(b.wind.twh)} TWh)`}
              />
              <rect
                className="bar-hit"
                x={b.solar.x}
                y={plot.top}
                width={b.solar.width}
                height={plot.bottom - plot.top}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${b.name}, solar: ${formatNumber(b.solar.value, 2)}% of generation, ${formatNumber(b.solar.twh)} TWh`}
                data-detail={`${b.name} · Solar ${formatNumber(b.solar.value, 2)}% (${formatNumber(b.solar.twh)} TWh)`}
              />
            </g>
          ))}

          {/* The callout's leader — geometry, so it lives here; its words are HTML below. */}
          {calloutBar && (
            <line
              {...calloutLayer().attrs}
              style={calloutLayer().vars}
              x1={calloutBar.groupCenter}
              x2={calloutBar.groupCenter}
              y1={0}
              y2={Math.min(calloutBar.wind.y, calloutBar.solar.y) - 6}
              stroke={muted}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* HTML overlay — the same grid cell as the `<svg>`. `pointer-events: none` (the shared
            stylesheet's own rule) is what keeps every bar hoverable straight through its own value
            label. Nothing here is gated behind interaction: each bar's share and the callout naming
            the subject are the argument, already stated. */}
        <div className="overlay" aria-hidden="true">
          {bars.map((b) =>
            [
              { key: "wind" as const, bar: b.wind },
              { key: "solar" as const, bar: b.solar },
            ].map(({ key, bar }) => (
              <span
                key={`${b.name}-${key}`}
                {...valueLabelLayer(b.name, key).attrs}
                style={{
                  ...valueLabelLayer(b.name, key).vars,
                  position: "absolute",
                  left: `${pct(bar.x + bar.width / 2, frame.width)}%`,
                  top: `${pct(bar.y, frame.height)}%`,
                  transform: "translate(-50%, -100%) translateY(-4px)",
                  fontSize: `${frame.value.fontSize}px`,
                  fontWeight: frame.value.fontWeight,
                  color: ink,
                  whiteSpace: "nowrap",
                }}
              >
                {formatNumber(bar.value)}
              </span>
            )),
          )}
        </div>

        {/* The country names, STAGGERED across two rows — see the same block in
            `proof/webx-electricity-mix/StackedBarWeb.tsx` for the measurements behind it: at 375px
            a group is 41px wide and "Switzerland" measures 62px at this fixed size, so one row put
            it straight through its neighbour. Alternating rows doubles every label's own room at
            EVERY width. The box is exactly its own text, never a column-wide box: a wide box on the
            first and last groups pushes past the frame's edges and gives the document horizontal
            scroll. */}
        <div
          className="x-axis"
          {...furnitureLayer().attrs}
          style={furnitureLayer().vars}
        >
          {bars.map((b, i) => (
            <span
              key={b.name}
              className="axis-label x"
              style={{
                left: `${pct(b.groupCenter, frame.width)}%`,
                top: `${6 + (i % 2) * Math.round(frame.category.fontSize * 1.3)}px`,
                whiteSpace: "nowrap",
                fontSize: `${frame.category.fontSize}px`,
                color: muted,
              }}
            >
              {b.name}
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
