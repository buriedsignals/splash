/**
 * The web beat of "Norway ran its grid on 99% renewables; Poland leaned on fossil fuel" — the
 * interactive genre.
 *
 * Written fresh from `twin-chart-web/assets/ChartWebSeed.tsx`'s two-layout / baked-in-interaction
 * shape, for a DIFFERENT mark family: one 100%-stacked column per country
 * (`references/types/stacked-bar.md`). Not imported from the static sibling
 * `proof/static-electricity-mix-source/ElectricityMixStack.tsx` (single-layout, reaches for
 * `#shared/twin-chart-beat/render-still.mjs` directly).
 *
 * This is the type the task brief calls out by name: a stacked bar's non-bottom segments float on
 * a moving floor, so their own thickness is genuinely hard to read off by eye
 * (`references/types/stacked-bar.md`, "The one thing that goes wrong" — only the bottom band
 * shares a real common baseline). Interaction is exactly what recovers a precise reading for the
 * OTHER two bands: hover/tap/keyboard focus on any of the eighteen segments reveals its exact
 * share to two decimals AND the absolute terawatt-hours behind it, neither of which the static
 * frame prints (that frame rounds each segment's label to the nearest whole percent, and only when
 * the segment's own band is tall enough to hold a label at all — Switzerland's 1% nuclear-adjacent
 * slivers get no printed label whatsoever on the static frame; every one of them still answers
 * exactly on hover here).
 *
 * This beat does NOT reuse the skill's `assets/interaction.mjs` (built for a line's continuous
 * axis) — its own `./stacked-bar-interaction.mjs`, one direct hit target per segment, follows
 * `proof/web-co2-ranking/bar-interaction.mjs`'s own reasoning.
 */

import {
  stackedBarGeometry,
  fr,
  STACK_ORDER,
  type Country,
} from "./stacked-bar-geometry";

const COLOURS = {
  renewables: "#009E73",
  nuclear: "#0072B2",
  fossil: "#D55E00",
} as const;
const LEGEND_LABELS = {
  renewables: "Renewables (hydro, wind, solar, bio)",
  nuclear: "Nuclear",
  fossil: "Fossil (gas, oil, coal)",
} as const;
const MIN_LABEL_BAND = 20;

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
  segmentLabel: { fontSize: number; fontWeight: number };
  legend: { fontSize: number; fontWeight: number };
  axis: { fontSize: number };
  barWidthRatio: number;
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
  segmentLabel: { fontSize: 13, fontWeight: 700 },
  legend: { fontSize: 13, fontWeight: 600 },
  axis: { fontSize: 13 },
  barWidthRatio: 0.72,
  barGap: 22,
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
  segmentLabel: { fontSize: 10, fontWeight: 700 },
  legend: { fontSize: 10, fontWeight: 600 },
  axis: { fontSize: 10 },
  barWidthRatio: 0.7,
  barGap: 10,
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

export function StackedBarWeb({
  countries,
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
  segmentInk,
}: {
  countries: Country[];
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
  /** Precomputed WCAG ink-on-fill per segment key, by the runner (`deriveFurniture`'s own
   *  escalation logic, run once against each segment's fixed colour rather than the page ground —
   *  a component never re-derives a colour rule, `ChartWebSeed.tsx`'s own invariant). */
  segmentInk: Record<keyof typeof COLOURS, string>;
}) {
  if (countries.length < 2)
    throw new Error(
      `a stacked bar beat needs at least two columns, got ${countries.length}`,
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

  // Legend x positions measured, not a fixed step — the same catch the static sibling's own
  // BRIEF.md names (a fixed 240px legend spacing let "Renewables (hydro, wind, solar, bio)"
  // collide with the next swatch) — AND wrapped onto a new row when an item would run past the
  // frame's own right edge, a real defect caught by driving the rendered file at the narrow
  // layout: three legend items on one row (this beat's own fixed layout, inherited from the
  // static sibling's 900px-only frame) ran "Fossil (gas, oil, coal)" clean off the right edge of
  // the 360px narrow frame. `plotTop` below is derived from how many rows the legend actually
  // needed, never a fixed single-row height.
  const LEGEND_SWATCH = 12;
  const LEGEND_SWATCH_GAP = 6;
  const LEGEND_ITEM_GAP = layout.name === "desktop" ? 26 : 14;
  const LEGEND_ROW_LEAD = layout.legend.fontSize + 10;
  let legendCursor = pad;
  let legendRow = 0;
  const legendItems = STACK_ORDER.map((key) => {
    const itemWidth =
      LEGEND_SWATCH +
      LEGEND_SWATCH_GAP +
      measure(LEGEND_LABELS[key], layout.legend);
    if (legendCursor + itemWidth > width - pad && legendCursor > pad) {
      legendRow += 1;
      legendCursor = pad;
    }
    const x = legendCursor;
    const y = legendBaseline + legendRow * LEGEND_ROW_LEAD;
    legendCursor += itemWidth + LEGEND_ITEM_GAP;
    return { key, label: LEGEND_LABELS[key], x, y };
  });
  const legendRowCount = legendRow + 1;

  const plotTop =
    legendBaseline +
    (legendRowCount - 1) * LEGEND_ROW_LEAD +
    Math.round(layout.title.lead * 0.75);
  const plotBottom = plotTop + layout.plotMinHeight;
  const height = plotBottom + layout.bottomPad;

  const tickLabels = ["0", "20", "40", "60", "80", "100 %"];
  const padding = {
    top: plotTop,
    right: pad,
    bottom: layout.bottomPad,
    left:
      pad + 10 + Math.max(...tickLabels.map((l) => measure(l, layout.axis))),
  };

  const groupWidth = (width - padding.left - padding.right) / countries.length;
  const barWidth = groupWidth * layout.barWidthRatio;
  const barGap = groupWidth - barWidth;

  const { plot, bars, ticksY } = stackedBarGeometry(countries, {
    width,
    height,
    padding: { ...padding, right: padding.right + barGap / 2 },
    barWidth,
    barGap,
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
      {/* No root role="img" — eighteen individually-focusable segments below need their own
          names. */}
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

      {legendItems.map((item) => (
        <g key={item.key}>
          <rect
            x={item.x}
            y={item.y - 10}
            width={12}
            height={12}
            fill={COLOURS[item.key]}
          />
          <text
            x={item.x + 18}
            y={item.y}
            fill={ink}
            fontSize={layout.legend.fontSize}
            fontWeight={layout.legend.fontWeight}
          >
            {item.label}
          </text>
        </g>
      ))}

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
            {tickLabels[i]}
          </text>
        </g>
      ))}

      {bars.map((b) => (
        <g key={b.name}>
          {b.segments.map((s) => (
            <g key={s.key}>
              <rect
                x={s.x}
                y={s.y}
                width={s.width}
                height={s.height}
                fill={COLOURS[s.key]}
              />
              {s.height >= MIN_LABEL_BAND && (
                <text
                  x={s.x + s.width / 2}
                  y={s.y + s.height / 2 + 4}
                  fill={segmentInk[s.key]}
                  fontSize={layout.segmentLabel.fontSize}
                  fontWeight={layout.segmentLabel.fontWeight}
                  textAnchor="middle"
                >
                  {Math.round(s.value)}%
                </text>
              )}
            </g>
          ))}
          <text
            x={b.center}
            y={plot.bottom + 20}
            fill={muted}
            fontSize={layout.category.fontSize}
            textAnchor="middle"
          >
            {b.name}
          </text>

          {/* Interaction layer: one direct hit target per segment, `tabIndex={0}` and
              `aria-label` baked in at build time — reachable with the script absent entirely,
              including the sub-2%-band segments the static frame's own MIN_LABEL_BAND floor
              prints no value for at all. */}
          {b.segments.map((s) => (
            <rect
              key={`hit-${s.key}`}
              className="segment-hit"
              x={s.x}
              y={s.y}
              width={s.width}
              height={Math.max(s.height, 4)}
              fill="transparent"
              tabIndex={0}
              role="img"
              aria-label={`${b.name}, ${s.key}: ${fr(s.value, 2)}% of generation, ${fr(s.twh)} TWh`}
              data-detail={`${b.name} · ${LEGEND_LABELS[s.key]} ${fr(s.value, 2)}% (${fr(s.twh)} TWh)`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
