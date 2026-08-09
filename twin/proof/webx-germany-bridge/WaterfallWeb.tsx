/**
 * The web beat of "Germany generated 143 fewer terawatt-hours in 2024 than 2015" — the interactive
 * genre.
 *
 * Written fresh from `twin-chart-web/assets/ChartWebSeed.tsx`'s two-layout / baked-in-interaction
 * shape, for a DIFFERENT mark family: bars that float on a RUNNING TOTAL
 * (`references/types/waterfall.md`). Not imported from the static sibling
 * `proof/static-germany-electricity-bridge/ElectricityBridgeWaterfall.tsx` (single-layout, reaches
 * for `#shared/twin-chart-beat/render-still.mjs` directly).
 *
 * What hover/tap/keyboard-focus adds, and what it deliberately does NOT touch: every bar already
 * prints its own signed delta (or, for the two total bars, its own absolute value) directly above
 * itself, unconditionally — `references/types/waterfall.md`'s own rule, and nothing this genre's
 * doctrine allows gating behind interaction. What the static frame CANNOT show without a reader
 * doing arithmetic by eye is the RUNNING LEVEL each delta bar produces — the sheet's own warning is
 * that "the chart implicitly asserts the closing total equals the opening total plus every signed
 * step," and a reader has no way to check that by looking at any one bar. So only the three DELTA
 * bars (Renewables, Nuclear, Fossil fuel) get a hit target here; the two TOTAL bars already state
 * everything they have to state and gain nothing from an added tooltip that would just repeat their
 * own printed label (`web-discipline.md`: "the honest use of interaction is detail the static frame
 * had to omit, never the same numbers repeated on demand"). Hovering a delta bar reveals its own
 * signed value AND the exact running total Germany's generation reached immediately after that
 * step — the checkpoint a reader would otherwise have to read off the y-axis and compute by eye.
 */

import { waterfallGeometry, type Step } from "./waterfall-geometry";

const COLOURS = { increase: "#0072B2", decrease: "#D55E00" };

type Measure = (
  text: string,
  font: { fontSize: number; fontWeight?: number },
) => number;

export type WebLayout = {
  name: "desktop" | "narrow";
  width: number;
  pad: number;
  title: { fontSize: number; fontWeight: number; lead: number };
  subtitle: { fontSize: number; fontWeight: number; lead: number };
  source: { fontSize: number; fontWeight: number; lead: number };
  category: { fontSize: number; lead: number };
  valueLabel: { fontSize: number; fontWeight: number };
  legend: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  barGap: number;
  plotMinHeight: number;
  bottomPad: number;
};

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 24, fontWeight: 700, lead: 30 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  category: { fontSize: 12, lead: 15 },
  valueLabel: { fontSize: 13, fontWeight: 700 },
  legend: { fontSize: 13, fontWeight: 600 },
  axis: { fontSize: 13 },
  barGap: 26,
  plotMinHeight: 300,
  bottomPad: 44,
};

export const NARROW_LAYOUT: WebLayout = {
  name: "narrow",
  width: 360,
  pad: 20,
  title: { fontSize: 16, fontWeight: 700, lead: 21 },
  subtitle: { fontSize: 11, fontWeight: 400, lead: 15 },
  source: { fontSize: 11, fontWeight: 400, lead: 14 },
  category: { fontSize: 9, lead: 12 },
  valueLabel: { fontSize: 10, fontWeight: 700 },
  legend: { fontSize: 10, fontWeight: 600 },
  axis: { fontSize: 9 },
  barGap: 10,
  plotMinHeight: 220,
  bottomPad: 36,
};

export const LAYOUTS: WebLayout[] = [DESKTOP_LAYOUT, NARROW_LAYOUT];

function wrap(
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
  layout,
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
  layout: WebLayout;
}) {
  if (steps.length < 3)
    throw new Error(
      `a waterfall beat needs at least three steps, got ${steps.length}`,
    );
  if (steps[0].kind !== "total" || steps[steps.length - 1].kind !== "total")
    throw new Error("a waterfall's first and last bars must be totals");

  const { width, pad } = layout;

  const titleLines = wrap(title, width - pad * 2, layout.title, measure);
  const titleBaseline = pad + layout.title.fontSize;
  const subtitleLines = wrap(
    subtitle,
    width - pad * 2,
    layout.subtitle,
    measure,
  );
  const subtitleBaseline =
    titleBaseline +
    (titleLines.length - 1) * layout.title.lead +
    Math.round(layout.title.lead * 0.9);
  const sourceLines = wrap(source, width - pad * 2, layout.source, measure);
  const sourceBaseline =
    subtitleBaseline +
    (subtitleLines.length - 1) * layout.subtitle.lead +
    Math.round(layout.subtitle.lead * 1.1);
  const legendBaseline =
    sourceBaseline +
    (sourceLines.length - 1) * layout.source.lead +
    Math.round(layout.title.lead * 0.8);

  const categoryWidth =
    (width - pad * 2 - layout.barGap * (steps.length - 1)) / steps.length;
  const categoryLines = steps.map((s) =>
    wrap(s.label, categoryWidth, layout.category, measure),
  );
  const maxCategoryLines = Math.max(...categoryLines.map((l) => l.length));

  const plotTop = legendBaseline + Math.round(layout.title.lead * 0.75);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height =
    plotBottom + layout.bottomPad + maxCategoryLines * layout.category.lead;

  const tickLabels = steps.map((s) =>
    Math.abs(s.value).toLocaleString("en-US"),
  );
  const padding = {
    top: plotTop,
    right: pad,
    bottom: layout.bottomPad + maxCategoryLines * layout.category.lead,
    left:
      pad + 10 + Math.max(...tickLabels.map((l) => measure(l, layout.axis))),
  };

  const { plot, bars, ticksY } = waterfallGeometry(steps, {
    width,
    height,
    padding,
    barGap: layout.barGap,
  });

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
      {/* No root role="img" — the three delta bars below need their own names. */}
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
      {subtitleLines.map((line, i) => (
        <text
          key={line}
          x={pad}
          y={subtitleBaseline + i * layout.subtitle.lead}
          fill={muted}
          fontSize={layout.subtitle.fontSize}
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

      <rect
        x={pad}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={COLOURS.increase}
      />
      <text
        x={pad + 18}
        y={legendBaseline}
        fill={ink}
        fontSize={layout.legend.fontSize}
        fontWeight={layout.legend.fontWeight}
      >
        Increase
      </text>
      <rect
        x={pad + 88}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={COLOURS.decrease}
      />
      <text
        x={pad + 106}
        y={legendBaseline}
        fill={ink}
        fontSize={layout.legend.fontSize}
        fontWeight={layout.legend.fontWeight}
      >
        Decrease
      </text>
      <rect
        x={pad + 186}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={muted}
      />
      <text
        x={pad + 204}
        y={legendBaseline}
        fill={ink}
        fontSize={layout.legend.fontSize}
        fontWeight={layout.legend.fontWeight}
      >
        Total
      </text>

      {ticksY.map((tick) => (
        <g key={tick.value}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={tick.y}
            y2={tick.y}
            stroke={tick.value === 0 ? muted : grid}
            strokeWidth={1}
          />
          <text
            x={plot.left - 10}
            y={tick.y + 4}
            fill={muted}
            fontSize={layout.axis.fontSize}
            textAnchor="end"
          >
            {tick.value.toLocaleString("en-US")}
          </text>
        </g>
      ))}

      {/* Thin connectors link each bar's end to the next bar's start. */}
      {bars.slice(0, -1).map((b, i) => {
        const next = bars[i + 1];
        return (
          <line
            key={b.label}
            x1={b.x + b.width}
            x2={next.x}
            y1={b.top}
            y2={b.top}
            stroke={muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        );
      })}

      {bars.map((b) => {
        const fill =
          b.kind === "total"
            ? muted
            : COLOURS[b.kind as "increase" | "decrease"];
        return (
          <g key={b.label}>
            <rect
              x={b.x}
              y={b.top}
              width={b.width}
              height={Math.max(b.bottom - b.top, 0)}
              fill={fill}
            />
            {/* Value label floats above the bar's growing edge, in ink — never inside the bar
                (`references/types/waterfall.md`'s own named defect on narrow bars). Unconditional —
                never gated behind interaction. */}
            <text
              x={b.center}
              y={b.top - 8}
              fill={ink}
              fontSize={layout.valueLabel.fontSize}
              fontWeight={layout.valueLabel.fontWeight}
              textAnchor="middle"
            >
              {b.kind === "total"
                ? b.value.toLocaleString("en-US")
                : `${b.value > 0 ? "+" : "−"}${Math.abs(b.value).toLocaleString("en-US")}`}
            </text>
            {categoryLines[bars.indexOf(b)].map((line, i) => (
              <text
                key={line}
                x={b.center}
                y={plot.bottom + 22 + i * layout.category.lead}
                fill={muted}
                fontSize={layout.category.fontSize}
                textAnchor="middle"
              >
                {line}
              </text>
            ))}

            {/* Interaction layer: only the three DELTA bars get a hit target — the two total bars
                already state everything they have to state (this file's own header comment).
                `tabIndex={0}` and `aria-label` baked in at build time. */}
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
                aria-label={`${b.label}: ${b.value > 0 ? "+" : "−"}${Math.abs(b.value).toLocaleString("en-US")} TWh — running total after this step: ${b.runningAfter.toLocaleString("en-US")} TWh`}
                data-detail={`${b.label} ${b.value > 0 ? "+" : "−"}${Math.abs(b.value).toLocaleString("en-US")} TWh · running total: ${b.runningAfter.toLocaleString("en-US")} TWh`}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
