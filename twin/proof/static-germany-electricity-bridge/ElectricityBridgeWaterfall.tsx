/**
 * Beat: Germany's 2015->2024 electricity generation bridge (waterfall).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type whose bars float on a RUNNING TOTAL
 * (`references/types/waterfall.md`): the bridge is checked to be arithmetically exact before this
 * component ever sees it (`render.mjs`), because the sheet's own warning is that a reader has no
 * way to catch a bad running total by looking — each bar only shows its own delta.
 *
 * A first draft of this beat used a demographic bridge (a population's births/deaths/migration)
 * — arithmetically exact, but the deltas were about 1% of the opening total, so the three floating
 * bars rendered as barely-visible slivers: correct, but not legible, which is the whole point of
 * this chart type. Swapped for a bridge whose steps are 15-25% of the total, where the shape is
 * actually readable by eye.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  contrast,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Step = {
  label: string;
  value: number;
  kind: "total" | "increase" | "decrease";
};

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const CATEGORY = { fontSize: 12, fontWeight: 400, lead: 15 };
const VALUE_LABEL = { fontSize: 13, fontWeight: 700 };

/** Every printed value at the one decimal this beat's own data is rounded to — English grouping,
 *  matching the beat's declared language, and the SAME count on every bar so no label looks
 *  measured more coarsely than its neighbours. */
function oneDecimal(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
const LEGEND = { fontSize: 13, fontWeight: 600 };
const BAR_GAP = 26;
const Y_TICK_HINT = 5;

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

function inkOn(fill: string): string {
  return contrast("#000000", fill) >= contrast("#FFFFFF", fill)
    ? "#000000"
    : "#FFFFFF";
}

/**
 * Pure geometry: each step floats on the running total the steps before it produced. The first
 * and last bars are full bars from zero (the true totals); every bar between floats from the
 * previous bar's end to its own — the bar family's zero rule applies only to those two, exactly as
 * the sheet describes.
 */
export function waterfallGeometry(
  steps: Step[],
  {
    width,
    height,
    padding,
    mutedFill,
    increaseFill,
    decreaseFill,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    mutedFill: string;
    increaseFill: string;
    decreaseFill: string;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  let running = 0;
  const running_after: number[] = [];
  for (const s of steps) {
    running = s.kind === "total" ? s.value : running + s.value;
    running_after.push(running);
  }
  const maxLevel = Math.max(
    0,
    ...running_after,
    ...steps.map((s, i) => (s.kind === "total" ? s.value : running_after[i])),
  );

  const y = scaleLinear()
    .domain([0, maxLevel])
    .nice()
    .range([plot.bottom, plot.top]);
  const barWidth =
    (plot.right - plot.left - BAR_GAP * (steps.length - 1)) / steps.length;

  let cursor = 0;
  const bars = steps.map((s, i) => {
    const x = plot.left + i * (barWidth + BAR_GAP);
    let bottomValue: number, topValue: number;
    if (s.kind === "total") {
      bottomValue = 0;
      topValue = s.value;
      cursor = s.value;
    } else {
      bottomValue = cursor;
      topValue = cursor + s.value;
      cursor = topValue;
    }
    const fill =
      s.kind === "total"
        ? mutedFill
        : s.kind === "increase"
          ? increaseFill
          : decreaseFill;
    return {
      label: s.label,
      value: s.value,
      kind: s.kind,
      x,
      center: x + barWidth / 2,
      width: barWidth,
      top: y(Math.max(bottomValue, topValue)),
      bottom: y(Math.min(bottomValue, topValue)),
      startY: y(bottomValue),
      endY: y(topValue),
      fill,
    };
  });

  return {
    plot,
    bars,
    ticksY: y.ticks(Y_TICK_HINT).map((v) => ({ value: v, y: y(v) })),
  };
}

export function ElectricityBridgeWaterfall({
  steps,
  title,
  limits,
  source,
  alt,
  ground,
  increaseFill,
  decreaseFill,
}: {
  steps: Step[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  /** One fill per direction of change. Deliberately NOT red/green — the pairing colour-vision
   *  deficiency confuses most (`references/types/waterfall.md`) — and the two have to stay
   *  distinguishable to a deuteranope. Total bars use the page's own muted ink, not a third
   *  saturated hue: they are the frame the deltas hang from, not another category of change. They
   *  arrive as props because they are the newsroom's recorded answer, read from `PALETTE.md` by
   *  the runner — naming them here would put the answer back in the source, where no recorded
   *  choice reaches it. */
  increaseFill: string;
  decreaseFill: string;
}) {
  if (steps.length < 3)
    throw new Error(
      "a waterfall beat needs at least three steps, got " + steps.length,
    );
  if (steps[0].kind !== "total" || steps[steps.length - 1].kind !== "total")
    throw new Error("a waterfall's first and last bars must be totals");

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

  const categoryWidth =
    (width - PAD * 2 - BAR_GAP * (steps.length - 1)) / steps.length;
  const categoryLines = steps.map((s) =>
    wrap(s.label, categoryWidth, CATEGORY),
  );
  const maxCategoryLines = Math.max(...categoryLines.map((l) => l.length));

  const tickLabels = steps.map((s) =>
    Math.abs(s.value).toLocaleString("en-US"),
  );
  const padding = {
    top: legendBaseline + 26,
    right: PAD,
    // Grown by the source block's own height plus clear air: the credit now sits on the frame's
    // bottom margin, so the band beneath the plot has to end above its ink.
    bottom:
      PAD +
      24 +
      maxCategoryLines * CATEGORY.lead +
      (sourceLines.length - 1) * SUBTITLE.lead +
      SOURCE.fontSize +
      10,
    left: PAD + 10 + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const { plot, bars, ticksY } = waterfallGeometry(steps, {
    width,
    height,
    padding,
    mutedFill: muted,
    increaseFill,
    decreaseFill,
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

      <rect
        x={PAD}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={increaseFill}
      />
      <text
        x={PAD + 18}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
      >
        Increase
      </text>
      <rect
        x={PAD + 100}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={decreaseFill}
      />
      <text
        x={PAD + 118}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
      >
        Decrease
      </text>
      <rect
        x={PAD + 205}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={muted}
      />
      <text
        x={PAD + 223}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
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
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {tick.value.toLocaleString("en-US")}
          </text>
        </g>
      ))}

      {/* Thin connectors link each bar's end to the next bar's start, so the eye follows the
          level across the gap (`references/types/waterfall.md`). */}
      {bars.slice(0, -1).map((b, i) => {
        const next = bars[i + 1];
        const levelY = b.kind === "total" ? b.top : b.top;
        return (
          <line
            key={b.label}
            x1={b.x + b.width}
            x2={next.x}
            y1={levelY}
            y2={levelY}
            stroke={muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        );
      })}

      {bars.map((b) => (
        <g key={b.label}>
          <rect
            x={b.x}
            y={b.top}
            width={b.width}
            height={Math.max(b.bottom - b.top, 0)}
            fill={b.fill}
          />
          {/* Value label floats ABOVE the bar's growing edge in ink — never set inside the bar in
              white, the exact defect the sheet names on narrow bars where a decrease colour under
              a white label measured under 4:1. */}
          <text
            x={b.center}
            y={b.top - 8}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="middle"
          >
            {/* One decimal on EVERY bar, never `toLocaleString`'s own idea of how many a value
                needs. The closing total is 496 exactly after the source is rounded to a tenth, so
                it printed as a bare "496" in a row of 639.2 / +102.7 / −91.8 / −154.1 — the one
                label in the frame that looked measured to a different precision than its
                neighbours. */}
            {b.kind === "total"
              ? oneDecimal(b.value)
              : `${b.value > 0 ? "+" : "−"}${oneDecimal(Math.abs(b.value))}`}
          </text>
          {categoryLines[bars.indexOf(b)].map((line, i) => (
            <text
              key={line}
              x={b.center}
              y={plot.bottom + 22 + i * CATEGORY.lead}
              fill={muted}
              fontSize={CATEGORY.fontSize}
              textAnchor="middle"
            >
              {line}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}
