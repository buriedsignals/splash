/**
 * The web beat of "Switzerland is the outlier: solar beats wind" — the interactive genre.
 *
 * Written fresh from `twin-chart-web/assets/ChartWebSeed.tsx`'s two-layout / baked-in-interaction
 * shape, for a DIFFERENT mark family than the seed's line: two nested bands (`references/types/
 * grouped-bar.md`), a zero-anchored length encoding, a legend (the type's own accepted exception
 * to direct labelling). Not imported from the static sibling
 * `proof/static-wind-vs-solar/WindVsSolarBar.tsx` (single-layout, reaches for
 * `#shared/twin-chart-beat/render-still.mjs` directly).
 *
 * This beat does NOT reuse the skill's `assets/interaction.mjs` — that script resolves a pointer to
 * the nearest of many points along ONE continuous axis, built for a line. Twelve already-large,
 * already-labelled bars have nothing to interpolate between; every bar is its own direct hit
 * target, the same reasoning `proof/web-co2-ranking/RankingWeb.tsx` gives for its own rows.
 * `render-web.mjs` still calls the skill's generic `renderWeb` (the one way in) and lets it inline
 * `interaction.mjs` as a harmless no-op (no `.pt` circles here), then appends this beat's own
 * `./grouped-bar-interaction.mjs` as a second inline script.
 *
 * What hover/tap/keyboard-focus adds: the printed value label on each bar is a rounded PERCENTAGE
 * of that country's total generation (one decimal, matching the static sibling). What it doesn't
 * show anywhere is the absolute scale behind that share — Germany's 141.6 TWh of wind generation
 * and Switzerland's 0.2 TWh of wind generation could both print as small percentages of very
 * different totals, and a reader has no way to tell them apart from the bar's height alone (the
 * chart is deliberately about SHARE, not absolute output — `BRIEF.md`'s own claim is a share
 * comparison). Hover/tap/keyboard focus on any bar reveals its exact share to two decimals AND the
 * absolute terawatt-hours behind it — detail the static frame had no room for and would have
 * cluttered the frame if printed by default.
 */

import { groupedBarGeometry, fr, type Group } from "./grouped-bar-geometry";

const UNIT = "%";
const WIND_COLOUR = "#0072B2";
const SOLAR_COLOUR = "#E69F00";

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
  category: { fontSize: number };
  value: { fontSize: number };
  legend: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  yTickHint: number;
  groupGap: number;
  barGap: number;
  plotMinHeight: number;
  bottomPad: number;
};

export const DESKTOP_LAYOUT: WebLayout = {
  name: "desktop",
  width: 900,
  pad: 40,
  title: { fontSize: 25, fontWeight: 700, lead: 32 },
  subtitle: { fontSize: 14, fontWeight: 400, lead: 20 },
  source: { fontSize: 14, fontWeight: 400, lead: 19 },
  category: { fontSize: 13 },
  value: { fontSize: 13 },
  legend: { fontSize: 13, fontWeight: 600 },
  axis: { fontSize: 13 },
  yTickHint: 5,
  groupGap: 28,
  barGap: 4,
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
  category: { fontSize: 10 },
  value: { fontSize: 10 },
  legend: { fontSize: 11, fontWeight: 600 },
  axis: { fontSize: 10 },
  yTickHint: 4,
  groupGap: 14,
  barGap: 3,
  plotMinHeight: 220,
  bottomPad: 34,
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
  layout,
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
  layout: WebLayout;
}) {
  if (groups.length < 2)
    throw new Error(
      `a grouped bar beat needs at least two groups, got ${groups.length}`,
    );

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

  const plotTop = legendBaseline + Math.round(layout.title.lead * 0.75);
  const plotBottom = plotTop + layout.plotMinHeight;
  const calloutLines = wrap(calloutText, 210, layout.category, measure);
  const height = plotBottom + layout.bottomPad + calloutLines.length * 0;

  const rawTicks = groupedBarGeometry(groups, {
    width,
    height,
    padding: { top: 0, right: pad, bottom: 0, left: pad },
    groupGap: layout.groupGap,
    barGap: layout.barGap,
    yTickHint: layout.yTickHint,
  }).ticksY.map((t, i, all) =>
    i === all.length - 1 ? `${t.value} ${UNIT}` : `${t.value}`,
  );

  const padding = {
    top: plotTop,
    right: pad,
    bottom: layout.bottomPad,
    left: pad + 10 + Math.max(...rawTicks.map((l) => measure(l, layout.axis))),
  };

  const { plot, bars, ticksY } = groupedBarGeometry(groups, {
    width,
    height,
    padding,
    groupGap: layout.groupGap,
    barGap: layout.barGap,
    yTickHint: layout.yTickHint,
  });
  const calloutBar = bars.find((b) => b.name === calloutSubject);
  const calloutMaxWidth = Math.max(
    ...calloutLines.map((line) => measure(line, layout.category)),
  );
  const calloutAnchorX = calloutBar
    ? Math.min(
        Math.max(calloutBar.groupCenter, plot.left + calloutMaxWidth / 2),
        plot.right - calloutMaxWidth / 2,
      )
    : 0;

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
      {/* No root role="img" — twelve individually-focusable bars below need their own names. */}
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

      {/* The two-entry legend — the grouped-bar sheet's one accepted exception, colour being the
          only cue tying a bar in the sixth group back to "wind" or "solar". */}
      <rect
        x={pad}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={WIND_COLOUR}
      />
      <text
        x={pad + 18}
        y={legendBaseline}
        fill={ink}
        fontSize={layout.legend.fontSize}
        fontWeight={layout.legend.fontWeight}
      >
        Wind
      </text>
      <rect
        x={pad + 66}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={SOLAR_COLOUR}
      />
      <text
        x={pad + 84}
        y={legendBaseline}
        fill={ink}
        fontSize={layout.legend.fontSize}
        fontWeight={layout.legend.fontWeight}
      >
        Solar
      </text>

      {ticksY.map((tick, i) => (
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
            {rawTicks[i]}
          </text>
        </g>
      ))}

      {bars.map((b) => (
        <g key={b.name}>
          <rect
            x={b.wind.x}
            y={b.wind.y}
            width={b.wind.width}
            height={b.wind.height}
            fill={WIND_COLOUR}
          />
          <rect
            x={b.solar.x}
            y={b.solar.y}
            width={b.solar.width}
            height={b.solar.height}
            fill={SOLAR_COLOUR}
          />
          <text
            x={b.wind.x + b.wind.width / 2}
            y={b.wind.y - 6}
            fill={ink}
            fontSize={layout.value.fontSize}
            fontWeight={700}
            textAnchor="middle"
          >
            {fr(b.wind.value)}
          </text>
          <text
            x={b.solar.x + b.solar.width / 2}
            y={b.solar.y - 6}
            fill={ink}
            fontSize={layout.value.fontSize}
            fontWeight={700}
            textAnchor="middle"
          >
            {fr(b.solar.value)}
          </text>
          <text
            x={b.groupCenter}
            y={plot.bottom + 20}
            fill={muted}
            fontSize={layout.category.fontSize}
            textAnchor="middle"
          >
            {b.name}
          </text>

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
            aria-label={`${b.name}, wind: ${fr(b.wind.value, 2)}% of generation, ${fr(b.wind.twh)} TWh`}
            data-detail={`${b.name} · Wind ${fr(b.wind.value, 2)}% (${fr(b.wind.twh)} TWh)`}
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
            aria-label={`${b.name}, solar: ${fr(b.solar.value, 2)}% of generation, ${fr(b.solar.twh)} TWh`}
            data-detail={`${b.name} · Solar ${fr(b.solar.value, 2)}% (${fr(b.solar.twh)} TWh)`}
          />
        </g>
      ))}

      {/* Direct annotation naming the subject — ink text with a leader, never a third hue
          (`static-discipline.md`'s "one accent"/"direct labels" rules, restated for a chart whose
          colour budget is already spent on the two series). Unconditional — never gated behind
          interaction (`web-discipline.md`, "What must not become interactive"). */}
      {calloutBar && (
        <g>
          <line
            x1={calloutBar.groupCenter}
            x2={calloutBar.groupCenter}
            y1={plot.top + 8}
            y2={Math.min(calloutBar.wind.y, calloutBar.solar.y) - 6}
            stroke={muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          {calloutLines.map((line, i) => (
            <text
              key={line}
              x={calloutAnchorX}
              y={plot.top + 8 + i * 15}
              fill={ink}
              fontSize={layout.category.fontSize}
              fontWeight={600}
              textAnchor="middle"
            >
              {line}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
