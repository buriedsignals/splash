/**
 * Beat: "Norway's grid ran 99% renewable in 2024 — Poland's leaned on fossil fuel" (stacked bar).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a different mark family: one 100%-stacked column
 * per country (`references/types/stacked-bar.md`). 100%-stacking is the honest choice here because
 * the claim is about COMPOSITION (what share is renewable, nuclear, fossil), not about the
 * countries' very different absolute generation in TWh — the sheet's own zero-baseline, one-fixed-
 * stacking-order and ink-never-the-segment's-own-hue rules apply exactly the same to a percentage
 * total as to an absolute one.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  contrast,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Country = {
  name: string;
  renewables: number; // %
  nuclear: number; // %
  fossil: number; // %
};

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 25, fontWeight: 700, lead: 32 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const SEGMENT_LABEL = { fontSize: 13, fontWeight: 700 };
const LEGEND = { fontSize: 13, fontWeight: 600 };
/** One fill per stacked series, keyed by series. Renewables (bottom, the baseline a reader compares
 *  across columns) is the cool green; nuclear a neutral blue; fossil the one warm hue — the same
 *  "only one warm member" discipline the grouped bar beat used, so no two adjacent segments are
 *  both warm. They arrive from the caller because they are the newsroom's recorded answer, read
 *  from `PALETTE.md` by the runner — naming them here would put the answer back in the source,
 *  where no recorded choice reaches it. */
export type SeriesFills = {
  renewables: string;
  nuclear: string;
  fossil: string;
};
/** A segment shorter than this, in px, does not get a printed value — the label itself would be
 *  taller than the band it sits in. */
const MIN_LABEL_BAND = 22;
const BAR_GAP = 22;

function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/** Whichever ink pole reads higher against a given fill — the same escalation
 *  `deriveFurniture` runs against the page ground, run here against a data mark instead, because
 *  visual-system.md's own rule is that a label's ink is never inherited from the mark it names. */
function inkOn(fill: string): string {
  return contrast("#000000", fill) >= contrast("#FFFFFF", fill)
    ? "#000000"
    : "#FFFFFF";
}

/**
 * Pure geometry: one 100%-stacked column per country, bottom-to-top order fixed
 * (renewables, nuclear, fossil) for every column — reordering per column is the specific defect
 * the sheet warns about, because it would shift every segment above the swap too.
 */
export function stackedBarGeometry(
  countries: Country[],
  {
    width,
    height,
    padding,
    fills,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    fills: SeriesFills;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const y = scaleLinear().domain([0, 100]).range([plot.bottom, plot.top]);
  const barWidth =
    (plot.right - plot.left - BAR_GAP * (countries.length - 1)) /
    countries.length;

  const bars = countries.map((c, i) => {
    const x = plot.left + i * (barWidth + BAR_GAP);
    let cursor = 0;
    const segments = (["renewables", "nuclear", "fossil"] as const).map(
      (key) => {
        const value = c[key];
        const bottom = y(cursor);
        cursor += value;
        const top = y(cursor);
        return {
          key,
          value,
          x,
          y: top,
          width: barWidth,
          height: bottom - top,
          fill: fills[key],
        };
      },
    );
    return { name: c.name, x, center: x + barWidth / 2, segments };
  });

  return { plot, bars, ticksY: y.ticks(5).map((v) => ({ value: v, y: y(v) })) };
}

export function ElectricityMixStack({
  countries,
  title,
  limits,
  source,
  alt,
  ground,
  fills,
}: {
  countries: Country[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  fills: SeriesFills;
}) {
  if (countries.length < 2)
    throw new Error(
      "a stacked bar beat needs at least two columns, got " + countries.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 28;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — the LAST line lands on `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline =
    height - PAD - (sourceLines.length - 1) * SUBTITLE.lead;
  // The legend keeps the air it always had above it, measured from the LAST HEADER line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + 28;

  // The tick set is read from d3's own `.ticks(5)` on the 0-100 domain, never a hand-picked list
  // of round numbers — the render is what caught a hand-picked list here: `.ticks(5)` on 0-100
  // actually returns six values (0, 20, 40, 60, 80, 100), and a hard-coded five-entry list of
  // ["0","25","50","75","100 %"] silently mislabelled every gridline by one and left the true top
  // gridline (100) undrawn, so every bar appeared to run past a "100%" label that was really the
  // 80 line.
  const rawTicks = scaleLinear().domain([0, 100]).ticks(5);
  const tickLabels = rawTicks.map((v, i, all) =>
    i === all.length - 1 ? `${v} %` : `${v}`,
  );
  const padding = {
    top: legendBaseline + 24,
    right: PAD,
    // Grown by the source block's own height plus clear air: the credit now sits on the frame's
    // bottom margin, so the band beneath the plot has to end above its ink.
    bottom:
      PAD +
      24 +
      (sourceLines.length - 1) * SUBTITLE.lead +
      SOURCE.fontSize +
      10,
    left: PAD + 10 + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const { plot, bars, ticksY } = stackedBarGeometry(countries, {
    width,
    height,
    padding,
    fills,
  });

  // Legend x positions are measured, not a fixed 240px step — a constant wide enough for
  // "Nuclear" collided with "Renewables (hydro, wind, solar, bio)", the widest of the three
  // labels, in the render. Each item starts where the previous swatch + label + a fixed air gap
  // ended.
  const LEGEND_SWATCH = 12;
  const LEGEND_SWATCH_GAP = 6;
  const LEGEND_ITEM_GAP = 28;
  const legendLabels = [
    {
      key: "renewables" as const,
      label: "Renewables (hydro, wind, solar, bio)",
    },
    { key: "nuclear" as const, label: "Nuclear" },
    { key: "fossil" as const, label: "Fossil (gas, oil, coal)" },
  ];
  let legendCursor = PAD;
  const legendItems = legendLabels.map((item) => {
    const x = legendCursor;
    legendCursor +=
      LEGEND_SWATCH +
      LEGEND_SWATCH_GAP +
      measureText(item.label, LEGEND) +
      LEGEND_ITEM_GAP;
    return { ...item, x };
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={limitsBaseline + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceBaseline + i * SUBTITLE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {legendItems.map((item) => {
        const x = item.x;
        return (
          <g key={item.key}>
            <rect
              x={x}
              y={legendBaseline - 10}
              width={12}
              height={12}
              fill={fills[item.key]}
            />
            <text
              x={x + 18}
              y={legendBaseline}
              fill={ink}
              fontSize={LEGEND.fontSize}
              fontWeight={LEGEND.fontWeight}
            >
              {item.label}
            </text>
          </g>
        );
      })}

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
            fontSize={AXIS.fontSize}
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
                fill={s.fill}
              />
              {s.height >= MIN_LABEL_BAND && (
                <text
                  x={s.x + s.width / 2}
                  y={s.y + s.height / 2 + 4}
                  fill={inkOn(s.fill)}
                  fontSize={SEGMENT_LABEL.fontSize}
                  fontWeight={SEGMENT_LABEL.fontWeight}
                  textAnchor="middle"
                >
                  {Math.round(s.value)}%
                </text>
              )}
            </g>
          ))}
          <text
            x={b.center}
            y={plot.bottom + 22}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {b.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
