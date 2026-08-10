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
  assertLegible,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/twin-chart-beat/sizes.mjs";
import { formForSize } from "#shared/twin-chart-beat/type-at-size.mjs";

export type Country = {
  name: string;
  renewables: number; // %
  nuclear: number; // %
  fossil: number; // %
};

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it:
 *  `stacked-bar` is band-scale, so at a tall or square frame it takes the twin FORM — the columns
 *  become rows, each country's name horizontal on one line in the left gutter. */
export const TYPE = "stacked-bar";

/**
 * THE 900x560 TUNING, KEPT AS THE BASE, WITH THE SIZE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME`: the frame is `sizeFor(size)`'s and `size` is gate 2c's decision, read
 * out of this beat's own `BRIEF.md`. Every spacing literal is named here and scaled through one
 * rounding helper — a bare `+ 28` written for a 900px frame is 900x560 tuning under no name, and
 * leaving it while the type grows is what collides a header
 * (`proof/static-carbon-footprint-spread/probe/VERDICT.md`). `PAD` is the exception: a frame's
 * margin is proportional to the CANVAS, which `frameInsetFor` argues.
 */
const BASE = {
  TITLE: { fontSize: 25, fontWeight: 700, lead: 32 },
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  SEGMENT_LABEL: { fontSize: 13, fontWeight: 700 },
  LEGEND: { fontSize: 13, fontWeight: 600 },
  TITLE_TO_SUBTITLE: 28,
  SUBTITLE_TO_LEGEND: 28,
  LEGEND_TO_PLOT: 24,
  LEGEND_SWATCH: 12,
  LEGEND_SWATCH_RISE: 10,
  LEGEND_SWATCH_GAP: 6,
  LEGEND_ITEM_GAP: 28,
  LEGEND_LINE_LEAD: 22,
  TICK_INSET: 10,
  TICK_BASELINE_NUDGE: 4,
  CATEGORY_DROP: 22,
  AXIS_BAND: 24,
  SOURCE_AIR: 10,
  NAME_INSET: 10,
  /** A segment shorter than this, along the axis it is stacked on, does not get a printed value —
   *  the label itself would be bigger than the band it sits in. */
  MIN_LABEL_BAND: 22,
  BAR_GAP: 22,
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
    SEGMENT_LABEL: f(BASE.SEGMENT_LABEL) as typeof BASE.SEGMENT_LABEL,
    LEGEND: f(BASE.LEGEND) as typeof BASE.LEGEND,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    SUBTITLE_TO_LEGEND: sp(BASE.SUBTITLE_TO_LEGEND),
    LEGEND_TO_PLOT: sp(BASE.LEGEND_TO_PLOT),
    LEGEND_SWATCH: sp(BASE.LEGEND_SWATCH),
    LEGEND_SWATCH_RISE: sp(BASE.LEGEND_SWATCH_RISE),
    LEGEND_SWATCH_GAP: sp(BASE.LEGEND_SWATCH_GAP),
    LEGEND_ITEM_GAP: sp(BASE.LEGEND_ITEM_GAP),
    LEGEND_LINE_LEAD: sp(BASE.LEGEND_LINE_LEAD),
    TICK_INSET: sp(BASE.TICK_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    AXIS_BAND: sp(BASE.AXIS_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    NAME_INSET: sp(BASE.NAME_INSET),
    MIN_LABEL_BAND: sp(BASE.MIN_LABEL_BAND),
    BAR_GAP: sp(BASE.BAR_GAP),
  };
}

/** The removal ladder this beat runs, per size. At a phone frame the axis is asked for three ticks
 *  instead of five (R2) and the standfirst keeps its first sentence (R3). */
export function rungsFor(size: string): string[] {
  if (sizeFor(size).minTypePx < 36) return [];
  return [
    "R2: value-axis ticks 5 -> 3",
    "R3: the standfirst keeps its first sentence only",
  ];
}

function firstSentence(text: string): string {
  const stop = text.indexOf(". ");
  return stop === -1 ? text : text.slice(0, stop + 1);
}
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
 *  visual-system.md's own rule is that a label's ink is never inherited from the mark it names.
 *
 *  It MEASURES the choice against the text floor rather than trusting it. A pure pole clears 4.5:1
 *  on every possible fill — the worst fill for the better pole sits at relative luminance 0.179,
 *  where the pole still measures 4.58:1 — so this can only fire if the poles ever stop being pure,
 *  and that is exactly the change that would break it silently. The floor named here is SC 1.4.3's
 *  4.5:1 for TEXT, not the 3:1 SC 1.4.11 sets for the mark underneath it; the two coincide at no
 *  number and `assertLegible` makes the caller say which one it is asking about. */
function inkOn(fill: string): string {
  const pole =
    contrast("#000000", fill) >= contrast("#FFFFFF", fill) ? "#000000" : "#FFFFFF";
  assertLegible(pole, fill, {
    role: "text",
    where: "the value label drawn inside its own band",
  });
  return pole;
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
    orientation = "columns",
    barGap,
    tickHint = 5,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    fills: SeriesFills;
    /** The TWIN FORM. Columns at landscape; rows at a tall or square frame, where the band axis
     *  runs down the frame and the 0-100 axis runs across it. A row-driven layout has no aspect to
     *  distort, which is why `type-at-size.mjs` answers `transpose` for a band-scale type. */
    orientation?: "columns" | "rows";
    barGap: number;
    tickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const rows = orientation === "rows";
  const share = scaleLinear()
    .domain([0, 100])
    .range(rows ? [plot.left, plot.right] : [plot.bottom, plot.top]);
  const bandSpan = rows ? plot.bottom - plot.top : plot.right - plot.left;
  const barWidth =
    (bandSpan - barGap * (countries.length - 1)) / countries.length;

  const bars = countries.map((c, i) => {
    const at = (rows ? plot.top : plot.left) + i * (barWidth + barGap);
    let cursor = 0;
    const segments = (["renewables", "nuclear", "fossil"] as const).map(
      (key) => {
        const value = c[key];
        const from = share(cursor);
        cursor += value;
        const to = share(cursor);
        return rows
          ? {
              key,
              value,
              x: from,
              y: at,
              width: to - from,
              height: barWidth,
              /** The extent along the axis the segment is stacked on — the one the label has to
               *  fit inside, whichever way round the chart is drawn. */
              span: to - from,
              fill: fills[key],
            }
          : {
              key,
              value,
              x: at,
              y: to,
              width: barWidth,
              height: from - to,
              span: from - to,
              fill: fills[key],
            };
      },
    );
    return { name: c.name, at, center: at + barWidth / 2, segments };
  });

  return {
    plot,
    bars,
    barWidth,
    ticks: share
      .ticks(tickHint)
      .map((v) => ({ value: v, at: share(v) })),
  };
}

export function ElectricityMixStack({
  countries,
  title,
  limits,
  source,
  alt,
  ground,
  fills,
  size,
}: {
  countries: Country[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  fills: SeriesFills;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (countries.length < 2)
    throw new Error(
      "a stacked bar beat needs at least two columns, got " + countries.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const rungs = rungsFor(size);
  const orientation =
    formForSize(TYPE, size).verdict === "transpose" ? "rows" : "columns";
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
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  // At portrait that bottom is the STAGE's: below it the platform's caption and progress bar sit
  // over the frame, and a covered credit is an attribution failure rather than a cosmetic one.
  const sourceBaseline =
    sourceBottom - (sourceLines.length - 1) * T.SUBTITLE.lead;
  const legendTop =
    limitsBaseline +
    (limitsLines.length - 1) * T.SUBTITLE.lead +
    T.SUBTITLE_TO_LEGEND;

  // Legend x positions are measured, not a fixed 240px step — a constant wide enough for
  // "Nuclear" collided with "Renewables (hydro, wind, solar, bio)", the widest of the three
  // labels, in the render. Each item starts where the previous swatch + label + a fixed air gap
  // ended, and WRAPS to a new line when the next item would run past the margin: at a 3x type
  // scale the three items measure 1560px against a 936px frame, so a single-line legend would have
  // walked straight off the right edge with nothing to say so.
  const legendLabels = [
    {
      key: "renewables" as const,
      label: "Renewables (hydro, wind, solar, bio)",
    },
    { key: "nuclear" as const, label: "Nuclear" },
    { key: "fossil" as const, label: "Fossil (gas, oil, coal)" },
  ];
  let legendCursor = PAD;
  let legendLine = 0;
  const legendItems = legendLabels.map((item) => {
    const itemWidth =
      T.LEGEND_SWATCH +
      T.LEGEND_SWATCH_GAP +
      measureText(item.label, T.LEGEND) +
      T.LEGEND_ITEM_GAP;
    if (legendCursor > PAD && legendCursor + itemWidth - T.LEGEND_ITEM_GAP > width - PAD) {
      legendLine += 1;
      legendCursor = PAD;
    }
    const x = legendCursor;
    legendCursor += itemWidth;
    return { ...item, x, line: legendLine };
  });
  const legendBaseline = legendTop;
  const legendBottom = legendTop + legendLine * T.LEGEND_LINE_LEAD;

  // The tick set is read from d3's own `.ticks()` on the 0-100 domain, never a hand-picked list
  // of round numbers — the render is what caught a hand-picked list here: `.ticks(5)` on 0-100
  // actually returns six values (0, 20, 40, 60, 80, 100), and a hard-coded five-entry list of
  // ["0","25","50","75","100 %"] silently mislabelled every gridline by one and left the true top
  // gridline (100) undrawn, so every bar appeared to run past a "100%" label that was really the
  // 80 line.
  const tickHint = rungs.some((r) => r.startsWith("R2")) ? 3 : 5;
  const rawTicks = scaleLinear().domain([0, 100]).ticks(tickHint);
  const tickLabels = rawTicks.map((v, i, all) =>
    i === all.length - 1 ? `${v} %` : `${v}`,
  );
  const widestTick = Math.max(
    ...tickLabels.map((l) => measureText(l, T.AXIS)),
  );
  const widestName = Math.max(
    ...countries.map((c) => measureText(c.name, T.AXIS)),
  );

  const padding =
    orientation === "rows"
      ? {
          top: legendBottom + T.LEGEND_TO_PLOT,
          right: PAD,
          bottom:
            height -
            (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR) +
            T.CATEGORY_DROP +
            T.AXIS.fontSize,
          left: PAD + widestName + T.NAME_INSET,
        }
      : {
          top: legendBottom + T.LEGEND_TO_PLOT,
          right: PAD,
          // Grown by the source block's own height plus clear air: the credit sits on the frame's
          // bottom margin, so the band beneath the plot has to end above its ink.
          bottom:
            height -
            (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR) +
            T.AXIS_BAND +
            T.AXIS.fontSize,
          left: PAD + T.TICK_INSET + widestTick,
        };

  const { plot, bars, barWidth, ticks } = stackedBarGeometry(countries, {
    width,
    height,
    padding,
    fills,
    orientation,
    barGap: T.BAR_GAP,
    tickHint,
  });

  // THE LAST RUNG, FIRED RATHER THAN DESCRIBED. A band-scale type has no measured aspect range, so
  // `assertPlotAspect` never clamps it, and `assertTypeFloor` measures the type rather than the
  // room the type has — a bar thinner than the name printed beside it passes both and is a smear.
  if (barWidth < minTypePx)
    throw new Error(
      `static-electricity-mix-source: at ${size} the ${countries.length} bars get ` +
        `${barWidth.toFixed(1)}px of thickness each, under the ${minTypePx}px type floor the ` +
        `country name beside them is set at.\n` +
        `The ladder is spent: ${rungs.join("; ") || "no rung fires at this size"}. R8 (fewer ` +
        `countries) would remove the comparison the claim makes between Norway and Poland.\n` +
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

      {legendItems.map((item) => (
        <g key={item.key}>
          <rect
            x={item.x}
            y={
              legendBaseline +
              item.line * T.LEGEND_LINE_LEAD -
              T.LEGEND_SWATCH_RISE
            }
            width={T.LEGEND_SWATCH}
            height={T.LEGEND_SWATCH}
            fill={fills[item.key]}
          />
          <text
            x={item.x + T.LEGEND_SWATCH + T.LEGEND_SWATCH_GAP}
            y={legendBaseline + item.line * T.LEGEND_LINE_LEAD}
            fill={ink}
            fontSize={T.LEGEND.fontSize}
            fontWeight={T.LEGEND.fontWeight}
          >
            {item.label}
          </text>
        </g>
      ))}

      {ticks.map((tick, i) =>
        orientation === "rows" ? (
          <g key={tick.value}>
            <line
              x1={tick.at}
              x2={tick.at}
              y1={plot.top}
              y2={plot.bottom}
              stroke={tick.value === 0 ? muted : grid}
              strokeWidth={1}
            />
            <text
              x={tick.at}
              y={plot.bottom + T.CATEGORY_DROP}
              fill={muted}
              fontSize={T.AXIS.fontSize}
              textAnchor="middle"
            >
              {tickLabels[i]}
            </text>
          </g>
        ) : (
          <g key={tick.value}>
            <line
              x1={plot.left}
              x2={plot.right}
              y1={tick.at}
              y2={tick.at}
              stroke={tick.value === 0 ? muted : grid}
              strokeWidth={1}
            />
            <text
              x={plot.left - T.TICK_INSET}
              y={tick.at + T.TICK_BASELINE_NUDGE}
              fill={muted}
              fontSize={T.AXIS.fontSize}
              textAnchor="end"
            >
              {tickLabels[i]}
            </text>
          </g>
        ),
      )}

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
              {s.span >= T.MIN_LABEL_BAND && (
                <text
                  x={s.x + s.width / 2}
                  y={s.y + s.height / 2 + T.SEGMENT_LABEL.fontSize * 0.34}
                  fill={inkOn(s.fill)}
                  fontSize={T.SEGMENT_LABEL.fontSize}
                  fontWeight={T.SEGMENT_LABEL.fontWeight}
                  textAnchor="middle"
                >
                  {Math.round(s.value)}%
                </text>
              )}
            </g>
          ))}
          {orientation === "rows" ? (
            <text
              x={plot.left - T.NAME_INSET}
              y={b.center + T.AXIS.fontSize * 0.34}
              fill={muted}
              fontSize={T.AXIS.fontSize}
              textAnchor="end"
            >
              {b.name}
            </text>
          ) : (
            <text
              x={b.center}
              y={plot.bottom + T.CATEGORY_DROP}
              fill={muted}
              fontSize={T.AXIS.fontSize}
              textAnchor="middle"
            >
              {b.name}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
