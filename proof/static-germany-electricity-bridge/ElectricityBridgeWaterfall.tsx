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
  assertLegible,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/chart-beat/sizes.mjs";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";

export type Step = {
  label: string;
  value: number;
  kind: "total" | "increase" | "decrease";
};

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it, and
 *  a size it refuses is refused by the runner before a mark is drawn. */
export const TYPE = 'waterfall';

/**
 * THE 900-WIDE TUNING, KEPT AS THE BASE, WITH THE SIZE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more, and its absence is the point: the frame is `sizeFor(size)`'s,
 * and `size` is the decision gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`.
 * Before this the size was stated TWICE as literals — once here and once in the render script — and
 * `renderStill` compared them against each other, so they agreed by construction and nothing
 * downstream of the gate ever read what the journalist chose.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, not only the fonts: the probe measured eleven bare
 * literals in the layout arithmetic of the SIMPLEST static in this corpus, and scaling the type
 * while leaving them collided the title into the subtitle at 1920x1080
 * (`proof/static-carbon-footprint-spread/probe/VERDICT.md`). `PAD` is the one that does NOT go
 * through it: a frame's margin is proportional to the CANVAS, not to the type — `frameInsetFor` in
 * `sizes.mjs` states the split and argues it.
 */
const BASE = {
  TITLE: { fontSize: 24, fontWeight: 700, lead: 30 },
  TITLE_TO_SUBTITLE: 28,
  SUBTITLE_TO_LEGEND: 28,
  LEGEND_TO_PLOT: 26,
  LEGEND_SWATCH: 12,
  LEGEND_SWATCH_RISE: 10,
  LEGEND_SWATCH_TO_TEXT: 18,
  LEGEND_ENTRY_GAP: 24,
  TICK_INSET: 10,
  TICK_BASELINE_NUDGE: 4,
  CATEGORY_DROP: 22,
  CATEGORY_BAND_AIR: 10,
  SOURCE_AIR: 10,
  VALUE_LABEL_INSET: 6,
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  CATEGORY: { fontSize: 12, fontWeight: 400, lead: 15 },
  VALUE_LABEL: { fontSize: 13, fontWeight: 700 },
  LEGEND: { fontSize: 13, fontWeight: 600 },
  BAR_GAP: 26,
  Y_TICK_HINT: 5,
} as const;

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = (tok: { fontSize: number; fontWeight: number; lead?: number }) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SUBTITLE: f(BASE.SUBTITLE) as typeof BASE.SUBTITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    CATEGORY: f(BASE.CATEGORY) as typeof BASE.CATEGORY,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    LEGEND: f(BASE.LEGEND) as typeof BASE.LEGEND,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    SUBTITLE_TO_LEGEND: sp(BASE.SUBTITLE_TO_LEGEND),
    LEGEND_TO_PLOT: sp(BASE.LEGEND_TO_PLOT),
    LEGEND_SWATCH: sp(BASE.LEGEND_SWATCH),
    LEGEND_SWATCH_RISE: sp(BASE.LEGEND_SWATCH_RISE),
    LEGEND_SWATCH_TO_TEXT: sp(BASE.LEGEND_SWATCH_TO_TEXT),
    LEGEND_ENTRY_GAP: sp(BASE.LEGEND_ENTRY_GAP),
    TICK_INSET: sp(BASE.TICK_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    CATEGORY_BAND_AIR: sp(BASE.CATEGORY_BAND_AIR),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    VALUE_LABEL_INSET: sp(BASE.VALUE_LABEL_INSET),
    BAR_GAP: sp(BASE.BAR_GAP),
    Y_TICK_HINT: sp(BASE.Y_TICK_HINT),
  };
}

/** The removal ladder this beat runs, per size, recorded so the render can print it and the
 *  artifact can carry it. At a phone frame the type floor is 36px, which triples the headline and
 *  the credit; R3 fires before a mark is drawn. */
export function rungsFor(size: string): string[] {
  if (sizeFor(size).minTypePx < 36) return [];
  return ["R3: the standfirst keeps its first sentence only"];
}

function firstSentence(text: string): string {
  const stop = text.indexOf(". ");
  return stop === -1 ? text : text.slice(0, stop + 1);
}
/** Every printed value at the one decimal this beat's own data is rounded to — English grouping,
 *  matching the beat's declared language, and the SAME count on every bar so no label looks
 *  measured more coarsely than its neighbours. */
function oneDecimal(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
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

/** Whichever ink pole reads higher against a given fill, MEASURED against the text floor rather
 *  than trusted. A pure pole clears 4.5:1 on every possible fill — the worst fill for the better
 *  pole sits at relative luminance 0.179, where the pole still measures 4.58:1 — so this can only
 *  fire if the poles ever stop being pure, and that is exactly the change that would break a label
 *  silently. The floor named is SC 1.4.3's 4.5:1 for TEXT, not the 3:1 SC 1.4.11 sets for the mark
 *  underneath it; `assertLegible` makes the caller say which of the two it is asking about. */
function inkOn(fill: string): string {
  const pole =
    contrast("#000000", fill) >= contrast("#FFFFFF", fill) ? "#000000" : "#FFFFFF";
  assertLegible(pole, fill, {
    role: "text",
    where: "the value label drawn inside its own bar",
  });
  return pole;
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
    barGap,
    tickHint,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    barGap: number;
    tickHint: number;
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
    (plot.right - plot.left - barGap * (steps.length - 1)) / steps.length;

  let cursor = 0;
  const bars = steps.map((s, i) => {
    const x = plot.left + i * (barWidth + barGap);
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
    ticksY: y.ticks(tickHint).map((v) => ({ value: v, y: y(v) })),
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
  size,
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
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (steps.length < 3)
    throw new Error(
      "a waterfall beat needs at least three steps, got " + steps.length,
    );
  if (steps[0].kind !== "total" || steps[steps.length - 1].kind !== "total")
    throw new Error("a waterfall's first and last bars must be totals");

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const rungs = rungsFor(size);
  const contentTop = stage.reserved ? stage.top : PAD;
  const sourceBottom = stage.reserved ? stage.bottom : height - PAD;
  const titleLines = wrap(title, width - PAD * 2, T.TITLE);
  const titleBaseline = contentTop + T.TITLE.fontSize;
  const standfirst = rungs.some((r) => r.startsWith("R3"))
    ? firstSentence(limits)
    : limits;
  const limitsLines = wrap(standfirst, width - PAD * 2, T.SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * T.TITLE.lead + T.TITLE_TO_SUBTITLE;
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same inset the title
  // hangs off at the top, on the same x. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  // At portrait that bottom is the STAGE's, not the frame's.
  const sourceBaseline =
    sourceBottom - (sourceLines.length - 1) * T.SUBTITLE.lead;
  // The legend keeps the air it always had above it, measured from the LAST HEADER line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    limitsBaseline +
    (limitsLines.length - 1) * T.SUBTITLE.lead +
    T.SUBTITLE_TO_LEGEND;

  const categoryWidth =
    (width - PAD * 2 - T.BAR_GAP * (steps.length - 1)) / steps.length;
  const categoryLines = steps.map((s) =>
    wrap(s.label, categoryWidth, T.CATEGORY),
  );
  const maxCategoryLines = Math.max(...categoryLines.map((l) => l.length));

  const tickLabels = steps.map((s) =>
    Math.abs(s.value).toLocaleString("en-US"),
  );
  const padding = {
    top: legendBaseline + T.LEGEND_TO_PLOT,
    right: PAD,
    // Grown by the source block's own height plus clear air: the credit sits on the bottom of the
    // band, so the category band beneath the plot has to end above its ink.
    bottom:
      height -
      (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR) +
      T.CATEGORY_BAND_AIR +
      maxCategoryLines * T.CATEGORY.lead,
    left:
      PAD +
      T.TICK_INSET +
      Math.max(...tickLabels.map((l) => measureText(l, T.AXIS))),
  };

  const { plot, bars, ticksY } = waterfallGeometry(steps, {
    width,
    height,
    padding,
    mutedFill: muted,
    increaseFill,
    decreaseFill,
    barGap: T.BAR_GAP,
    tickHint: T.Y_TICK_HINT,
  });

  // THE LAST RUNG, FIRED RATHER THAN DESCRIBED. Nothing else in the toolchain can see this: a
  // waterfall has no measured aspect range, so `assertPlotAspect` never clamps it, and
  // `assertTypeFloor` measures the type rather than the room the type has. A bar narrower than the
  // value printed over it is a row of numbers over slivers.
  const barWidth = bars[0].width;
  if (barWidth < minTypePx || plot.bottom - plot.top < minTypePx * 3)
    throw new Error(
      `static-germany-electricity-bridge: at ${size} the ${steps.length} bars get ` +
        `${barWidth.toFixed(1)}px of width and the plot ${(plot.bottom - plot.top).toFixed(0)}px ` +
        `of height, against a ${minTypePx}px type floor.\n` +
        `The ladder is spent: ${rungs.join("; ") || "no rung fires at this size"}. R8 (fewer ` +
        `steps) would remove a term from the bridge, which is the arithmetic the beat states.\n` +
        `R9: this beat does not ship ${size}.`,
    );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
      data-ladder={rungs.join("; ") || "none"}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      {titleLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={titleBaseline + i * T.TITLE.lead}
          fill={ink}
          fontSize={T.TITLE.fontSize}
          fontWeight={T.TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {limitsLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={limitsBaseline + i * T.SUBTITLE.lead}
          fill={muted}
          fontSize={T.SUBTITLE.fontSize}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceBaseline + i * T.SUBTITLE.lead}
          fill={muted}
          fontSize={T.SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

      {/* The legend's entries are MEASURED off their own words, not stepped by a bare 100 and
          205: at a 2.2x type scale "Increase" is 100px wide on its own and the Decrease swatch
          would have landed inside it. */}
      {[
        { label: "Increase", fill: increaseFill },
        { label: "Decrease", fill: decreaseFill },
        { label: "Total", fill: muted },
      ].map((entry, i, all) => {
        const x =
          PAD +
          all
            .slice(0, i)
            .reduce(
              (sum, e) =>
                sum +
                T.LEGEND_SWATCH +
                T.LEGEND_SWATCH_TO_TEXT -
                T.LEGEND_SWATCH +
                measureText(e.label, T.LEGEND) +
                T.LEGEND_ENTRY_GAP +
                T.LEGEND_SWATCH,
              0,
            );
        return (
          <g key={entry.label}>
            <rect
              x={x}
              y={legendBaseline - T.LEGEND_SWATCH_RISE}
              width={T.LEGEND_SWATCH}
              height={T.LEGEND_SWATCH}
              fill={entry.fill}
            />
            <text
              x={x + T.LEGEND_SWATCH_TO_TEXT}
              y={legendBaseline}
              fill={ink}
              fontSize={T.LEGEND.fontSize}
              fontWeight={T.LEGEND.fontWeight}
            >
              {entry.label}
            </text>
          </g>
        );
      })}

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
            x={plot.left - T.TICK_INSET}
            y={tick.y + T.TICK_BASELINE_NUDGE}
            fill={muted}
            fontSize={T.AXIS.fontSize}
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
            fontSize={T.VALUE_LABEL.fontSize}
            fontWeight={T.VALUE_LABEL.fontWeight}
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
              y={plot.bottom + T.CATEGORY_DROP + i * T.CATEGORY.lead}
              fill={muted}
              fontSize={T.CATEGORY.fontSize}
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
