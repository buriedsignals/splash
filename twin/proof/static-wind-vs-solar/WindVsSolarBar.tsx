/**
 * Beat: "Switzerland is the outlier — solar beats wind" (grouped bar).
 *
 * Written fresh from `twin-chart-beat/assets/ChartSeed.tsx`'s shape, not imported from it — this
 * is a different mark family (two nested bands, a zero-anchored length encoding, a legend) with a
 * different chart-type sheet behind it (`references/types/grouped-bar.md`).
 *
 * Two series that do NOT sum to a whole (wind % and solar % of generation, each leaving room for
 * hydro/nuclear/gas the chart isn't about) — a composition story would be a stacked bar instead,
 * per the sheet's own "when not to reach for it."
 *
 * ── MIGRATED TO THE SIZE TABLE, 2026-08-11 ────────────────────────────────────────────────────
 *
 * There is no `const FRAME` any more and that absence is the point: the frame is `sizeFor(size)`'s
 * and `size` is the decision gate 2c took, read out of this beat's own `BRIEF.md` by `render.mjs`.
 * Before this the size was stated TWICE as literals — once here, once in the runner — and
 * `renderStill` compared them against each other, so they agreed by construction and the delivered
 * PNG was 1800x1120 for a beat nobody had asked to draw at 1800x1120.
 *
 * EVERY spacing number goes through `sp`, not only the fonts, for the reason the probe measured
 * (`proof/static-carbon-footprint-spread/probe/VERDICT.md`): bare literals in the layout arithmetic
 * are 900x560 tuning under no name, and scaling the type while leaving them collides the header.
 * `PAD` is the exception — a frame's margin is proportional to the CANVAS, which `frameInsetFor`
 * states and argues.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/twin-chart-beat/sizes.mjs";
import { formForSize } from "#shared/twin-chart-beat/type-at-size.mjs";

export type Group = { name: string; wind: number; solar: number };

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it. */
export const TYPE = "grouped-bar";

/** The 900x560 tuning, kept as the base; the size row's `typeScale` is the multiplier. */
const BASE = {
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  VALUE_LABEL: { fontSize: 13, fontWeight: 700 },
  LEGEND: { fontSize: 13, fontWeight: 600 },
  NOTE: { fontSize: 13, fontWeight: 400 },
  /** Baseline-to-baseline distance inside the callout block. */
  CALLOUT_LEAD: 16,
  /** Clear space between the callout block's bottom and the top of its leader. */
  CALLOUT_LEADER_GAP: 8,
  /** The callout's drop below the plot's top edge, and the width it wraps to in the column form. */
  CALLOUT_DROP: 10,
  CALLOUT_WIDTH: 220,
  /** Small gap between the two bars in a group, wide gap between groups — the grouped-bar sheet's
   *  own "the eye must parse groups first" rule. */
  BAR_GAP: 4,
  GROUP_GAP: 28,
  TITLE_TO_SUBTITLE: 30,
  SUBTITLE_TO_LEGEND: 28,
  LEGEND_TO_PLOT: 26,
  LEGEND_SWATCH: 12,
  LEGEND_SWATCH_RISE: 10,
  LEGEND_SWATCH_TO_TEXT: 18,
  LEGEND_ENTRY_GAP: 24,
  TICK_INSET: 10,
  TICK_BASELINE_NUDGE: 4,
  VALUE_LABEL_GAP: 6,
  CATEGORY_DROP: 22,
  AXIS_BAND: 44,
  AXIS_TO_SOURCE: 10,
} as const;

/** Descender room below a callout baseline, as a share of its own type size. Unitless — not a
 *  spacing literal, so it does not scale. */
const CALLOUT_DESCENDER = 0.3;
const UNIT = "%";

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SUBTITLE: f(BASE.SUBTITLE) as typeof BASE.SUBTITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    AXIS: f(BASE.AXIS) as typeof BASE.AXIS,
    VALUE_LABEL: f(BASE.VALUE_LABEL) as typeof BASE.VALUE_LABEL,
    LEGEND: f(BASE.LEGEND) as typeof BASE.LEGEND,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    CALLOUT_LEAD: sp(BASE.CALLOUT_LEAD),
    CALLOUT_LEADER_GAP: sp(BASE.CALLOUT_LEADER_GAP),
    CALLOUT_DROP: sp(BASE.CALLOUT_DROP),
    CALLOUT_WIDTH: sp(BASE.CALLOUT_WIDTH),
    BAR_GAP: sp(BASE.BAR_GAP),
    GROUP_GAP: sp(BASE.GROUP_GAP),
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    SUBTITLE_TO_LEGEND: sp(BASE.SUBTITLE_TO_LEGEND),
    LEGEND_TO_PLOT: sp(BASE.LEGEND_TO_PLOT),
    LEGEND_SWATCH: sp(BASE.LEGEND_SWATCH),
    LEGEND_SWATCH_RISE: sp(BASE.LEGEND_SWATCH_RISE),
    LEGEND_SWATCH_TO_TEXT: sp(BASE.LEGEND_SWATCH_TO_TEXT),
    LEGEND_ENTRY_GAP: sp(BASE.LEGEND_ENTRY_GAP),
    TICK_INSET: sp(BASE.TICK_INSET),
    TICK_BASELINE_NUDGE: sp(BASE.TICK_BASELINE_NUDGE),
    VALUE_LABEL_GAP: sp(BASE.VALUE_LABEL_GAP),
    CATEGORY_DROP: sp(BASE.CATEGORY_DROP),
    AXIS_BAND: sp(BASE.AXIS_BAND),
    AXIS_TO_SOURCE: sp(BASE.AXIS_TO_SOURCE),
  };
}

/** Y ticks the fitted, `.nice()`d domain is asked for — conventional static density in an article
 *  column; ladder rung R2 (5 -> 3) where the frame is read on a phone, which is the only rung that
 *  gives budget back without removing anything vertical. */
const TICK_HINT = 5;
function tickHintFor(size: string) {
  return sizeFor(size).minTypePx >= 36 ? 3 : TICK_HINT;
}

/**
 * THE REMOVAL LADDER THIS BEAT RUNS, per size, recorded so the render can print it.
 *
 * `type-at-size.mjs`'s `REMOVAL_LADDER` is the order; which rungs a beat actually fires is a beat
 * decision, and invariant 1 says a decision nobody chose does not happen silently. At a phone
 * frame the safe band is 979px, a 78px headline takes three lines of it and the credit takes three
 * more — so R2 and R3 fire before a bar is drawn.
 */
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

/**
 * Pure geometry: groups -> bar rectangles. A grouped bar's value is a LENGTH from a shared zero
 * (`static-discipline.md`'s "zero is a rule about bars"), so the scale always includes zero and is
 * `.nice()`d outward, never fitted to the data's own min/max.
 *
 * `orientation` is the TWIN FORM, not a rescaling. `type-at-size.mjs` answers `transpose` for every
 * band-scale type at a tall or square frame, and the probe's own verdict is that the transposed arm
 * "beats B beats A, and it is not close": rows are read top to bottom, every country name is
 * horizontal on one line, and a row-driven layout has no aspect to distort.
 */
export function groupedBarGeometry(
  groups: Group[],
  {
    width,
    height,
    padding,
    orientation = "columns",
    barGap,
    groupGap,
    tickHint = TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    orientation?: "columns" | "rows";
    barGap: number;
    groupGap: number;
    tickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const values = groups.flatMap((g) => [g.wind, g.solar]);
  const value = scaleLinear()
    .domain([0, extent(values)[1] as number])
    .nice();

  if (orientation === "rows") {
    value.range([plot.left, plot.right]);
    const groupHeight =
      (plot.bottom - plot.top - groupGap * (groups.length - 1)) / groups.length;
    const barHeight = (groupHeight - barGap) / 2;
    const bars = groups.map((g, i) => {
      const groupTop = plot.top + i * (groupHeight + groupGap);
      return {
        name: g.name,
        groupCenter: groupTop + groupHeight / 2,
        groupHeight,
        wind: {
          x: value(0),
          y: groupTop,
          width: value(g.wind) - value(0),
          height: barHeight,
          value: g.wind,
        },
        solar: {
          x: value(0),
          y: groupTop + barHeight + barGap,
          width: value(g.solar) - value(0),
          height: barHeight,
          value: g.solar,
        },
      };
    });
    return {
      plot,
      bars,
      barSpan: barHeight,
      ticks: value.ticks(tickHint).map((v) => ({ value: v, at: value(v) })),
      zeroAt: value(0),
    };
  }

  value.range([plot.bottom, plot.top]);
  const groupWidth =
    (plot.right - plot.left - groupGap * (groups.length - 1)) / groups.length;
  const barWidth = (groupWidth - barGap) / 2;
  const bars = groups.map((g, i) => {
    const groupLeft = plot.left + i * (groupWidth + groupGap);
    return {
      name: g.name,
      groupCenter: groupLeft + groupWidth / 2,
      groupHeight: groupWidth,
      wind: {
        x: groupLeft,
        y: value(g.wind),
        width: barWidth,
        height: value(0) - value(g.wind),
        value: g.wind,
      },
      solar: {
        x: groupLeft + barWidth + barGap,
        y: value(g.solar),
        width: barWidth,
        height: value(0) - value(g.solar),
        value: g.solar,
      },
    };
  });
  return {
    plot,
    bars,
    barSpan: barWidth,
    ticks: value.ticks(tickHint).map((v) => ({ value: v, at: value(v) })),
    zeroAt: value(0),
  };
}

export function WindVsSolarBar({
  groups,
  title,
  limits,
  source,
  alt,
  ground,
  calloutSubject,
  calloutText,
  windInk,
  solarInk,
  size,
}: {
  groups: Group[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  calloutSubject: string;
  calloutText: string;
  /** One ink per series. Wind: a cool hue. Solar: a warm one. Only one warm member sits in this
   *  two-colour set, so the "two warm hues adjacent" trap the grouped-bar sheet names (an orange
   *  next to a vermillion) cannot occur here. They arrive as props because they are the newsroom's
   *  recorded answer, read from `PALETTE.md` by the runner — naming them here would put the answer
   *  back in the source, where no recorded choice reaches it. */
  windInk: string;
  solarInk: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (groups.length < 2)
    throw new Error(
      "a grouped bar beat needs at least two groups, got " + groups.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  const stage = stageFor(size);
  const PAD = frameInsetFor(size);
  const orientation =
    formForSize(TYPE, size).verdict === "transpose" ? "rows" : "columns";
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
    titleBaseline +
    (titleLines.length - 1) * T.TITLE.lead +
    T.TITLE_TO_SUBTITLE;
  // The source line wraps on the real frame width too — a long credit-plus-effective-date string
  // (this beat's runs to 96 characters) is exactly what an unwrapped constant clips silently.
  const sourceLines = wrap(source, width - PAD * 2, T.SOURCE);
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND — the LAST line lands there, the same edge the title
  // hangs off at the top, on the same x. See twin-chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin." At portrait that bottom is the STAGE's, not the
  // frame's: below 1248 is the platform's caption and progress bar, and a covered credit is an
  // attribution failure rather than a cosmetic one.
  const sourceBaseline =
    sourceBottom - (sourceLines.length - 1) * T.SUBTITLE.lead;
  // The legend keeps the air it always had above it, measured from the LAST HEADER line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    limitsBaseline +
    (limitsLines.length - 1) * T.SUBTITLE.lead +
    T.SUBTITLE_TO_LEGEND;

  // The tick labels have to be measured before the plot's gutter can be sized, and their own
  // positions depend on that gutter — so the scale is fitted twice, first over a nominal box.
  const tickHint = tickHintFor(size);
  const probe = groupedBarGeometry(groups, {
    width,
    height,
    padding: { top: 0, right: PAD, bottom: 0, left: PAD },
    orientation,
    barGap: T.BAR_GAP,
    groupGap: T.GROUP_GAP,
    tickHint,
  });
  const tickLabels = probe.ticks.map((t, i, all) =>
    i === all.length - 1 ? `${t.value} ${UNIT}` : `${t.value}`,
  );
  const widestTick = Math.max(...tickLabels.map((l) => measureText(l, T.AXIS)));
  const widestName = Math.max(
    ...groups.map((g) => measureText(g.name, T.AXIS)),
  );
  const widestValue = Math.max(
    ...groups.flatMap((g) =>
      [g.wind, g.solar].map((v) => measureText(v.toFixed(1), T.VALUE_LABEL)),
    ),
  );

  const padding =
    orientation === "rows"
      ? {
          top: legendBaseline + T.LEGEND_TO_PLOT,
          // The value label sits at the END of its row, outside the bar, so the plot's right edge
          // has to leave room for the widest of them rather than running to the margin.
          right: PAD + T.VALUE_LABEL_GAP + widestValue,
          // The tick band is under the plot; the credit owns the frame's bottom margin, so the
          // band has to end above the credit's first line of ink.
          bottom:
            height -
            (sourceBaseline - T.SOURCE.fontSize - T.AXIS_TO_SOURCE) +
            T.CATEGORY_DROP +
            T.AXIS.fontSize,
          // A row's name is horizontal on one line, right-anchored in the left gutter. That is the
          // whole reason the twin form beats the twin aspect: no rotated labels, no truncation.
          left: PAD + widestName + T.TICK_INSET,
        }
      : {
          top: legendBaseline + T.LEGEND_TO_PLOT,
          right: PAD,
          // Grown by the source block's own height plus clear air: the credit sits on the frame's
          // bottom margin, so the axis band beneath the plot has to end above its ink.
          bottom:
            height -
            (sourceBaseline - T.SOURCE.fontSize - T.AXIS_TO_SOURCE) +
            T.AXIS_BAND,
          left: PAD + T.TICK_INSET + widestTick,
        };

  const { plot, bars, barSpan, ticks } = groupedBarGeometry(groups, {
    width,
    height,
    padding,
    orientation,
    barGap: T.BAR_GAP,
    groupGap: T.GROUP_GAP,
    tickHint,
  });

  // THE LAST RUNG, FIRED RATHER THAN DESCRIBED.
  //
  // Nothing in the toolchain can see this one: `assertPlotAspect` only clamps types with a MEASURED
  // aspect range, and a band-scale type has none — its answer is the twin form, which this beat
  // takes. But a twin form still needs somewhere to put twelve bars, and at a phone frame the safe
  // band is 979px of which a 78px headline takes three lines and the credit three more. Measured
  // here rather than argued: a bar thinner than the size's own type floor cannot carry the value
  // label that sits beside it, so the chart is a row of numbers over slivers — which is exactly the
  // class of defect every counter in this project scores zero on.
  if (barSpan < minTypePx)
    throw new Error(
      `static-wind-vs-solar: at ${size} the ${groups.length} groups leave each bar ` +
        `${barSpan.toFixed(1)}px, under the ${minTypePx}px type floor its own value label is set ` +
        `at — twelve bars do not fit ${(plot.bottom - plot.top).toFixed(0)}px of plot.\n` +
        `The ladder is spent: ${rungs.join("; ") || "no rung applies at this size"}. R4 has no ` +
        `annotation left to drop that is not the claim, and R8 (fewer countries) would remove the ` +
        `word "only" from "the only reversal in this group" — the beat's whole claim rests on all ` +
        `${groups.length} being present.\n` +
        `R9: this beat does not ship ${size}. It ships at landscape.`,
    );

  const calloutBar = bars.find((b) => b.name === calloutSubject);
  const calloutRoom =
    orientation === "rows" && calloutBar
      ? plot.right -
        Math.max(calloutBar.wind.width, calloutBar.solar.width) -
        plot.left -
        widestValue -
        T.VALUE_LABEL_GAP * 3
      : T.CALLOUT_WIDTH;
  const calloutLines = wrap(calloutText, Math.max(calloutRoom, 1), T.NOTE);
  const calloutMaxWidth = Math.max(
    ...calloutLines.map((line) => measureText(line, T.NOTE)),
  );

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

      {/* The two-entry legend the grouped-bar sheet accepts as its one exception: colour is the
          only thing tying a bar in the sixth group back to "wind," so it has to be established
          once, here, before the reader meets the first bar. The second entry's x is MEASURED off
          the first entry's own words — it was a bare `PAD + 74`, which at a 3x type scale would
          have put the Solar swatch inside the word "Wind". */}
      <rect
        x={PAD}
        y={legendBaseline - T.LEGEND_SWATCH_RISE}
        width={T.LEGEND_SWATCH}
        height={T.LEGEND_SWATCH}
        fill={windInk}
      />
      <text
        x={PAD + T.LEGEND_SWATCH_TO_TEXT}
        y={legendBaseline}
        fill={ink}
        fontSize={T.LEGEND.fontSize}
        fontWeight={T.LEGEND.fontWeight}
      >
        Wind
      </text>
      <rect
        x={
          PAD +
          T.LEGEND_SWATCH_TO_TEXT +
          measureText("Wind", T.LEGEND) +
          T.LEGEND_ENTRY_GAP
        }
        y={legendBaseline - T.LEGEND_SWATCH_RISE}
        width={T.LEGEND_SWATCH}
        height={T.LEGEND_SWATCH}
        fill={solarInk}
      />
      <text
        x={
          PAD +
          T.LEGEND_SWATCH_TO_TEXT +
          measureText("Wind", T.LEGEND) +
          T.LEGEND_ENTRY_GAP +
          T.LEGEND_SWATCH +
          T.LEGEND_SWATCH_TO_TEXT -
          T.LEGEND_SWATCH
        }
        y={legendBaseline}
        fill={ink}
        fontSize={T.LEGEND.fontSize}
        fontWeight={T.LEGEND.fontWeight}
      >
        Solar
      </text>

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
          <rect
            x={b.wind.x}
            y={b.wind.y}
            width={b.wind.width}
            height={b.wind.height}
            fill={windInk}
          />
          <rect
            x={b.solar.x}
            y={b.solar.y}
            width={b.solar.width}
            height={b.solar.height}
            fill={solarInk}
          />
          {/* Value label carries the number in ink, never the bar's own hue — a mark colour
              checked for confusability with its neighbours is not the same as a label colour
              checked for contrast against the page (`visual-system.md`). In the row form it sits
              past the bar's end; in the column form, above its top. */}
          {orientation === "rows" ? (
            <>
              <text
                x={b.wind.x + b.wind.width + T.VALUE_LABEL_GAP}
                y={b.wind.y + b.wind.height / 2 + T.VALUE_LABEL.fontSize * 0.36}
                fill={ink}
                fontSize={T.VALUE_LABEL.fontSize}
                fontWeight={T.VALUE_LABEL.fontWeight}
              >
                {b.wind.value.toFixed(1)}
              </text>
              <text
                x={b.solar.x + b.solar.width + T.VALUE_LABEL_GAP}
                y={
                  b.solar.y + b.solar.height / 2 + T.VALUE_LABEL.fontSize * 0.36
                }
                fill={ink}
                fontSize={T.VALUE_LABEL.fontSize}
                fontWeight={T.VALUE_LABEL.fontWeight}
              >
                {b.solar.value.toFixed(1)}
              </text>
              <text
                x={plot.left - T.TICK_INSET}
                y={b.groupCenter + T.AXIS.fontSize * 0.36}
                fill={muted}
                fontSize={T.AXIS.fontSize}
                textAnchor="end"
              >
                {b.name}
              </text>
            </>
          ) : (
            <>
              <text
                x={b.wind.x + b.wind.width / 2}
                y={b.wind.y - T.VALUE_LABEL_GAP}
                fill={ink}
                fontSize={T.VALUE_LABEL.fontSize}
                fontWeight={T.VALUE_LABEL.fontWeight}
                textAnchor="middle"
              >
                {b.wind.value.toFixed(1)}
              </text>
              <text
                x={b.solar.x + b.solar.width / 2}
                y={b.solar.y - T.VALUE_LABEL_GAP}
                fill={ink}
                fontSize={T.VALUE_LABEL.fontSize}
                fontWeight={T.VALUE_LABEL.fontWeight}
                textAnchor="middle"
              >
                {b.solar.value.toFixed(1)}
              </text>
              <text
                x={b.groupCenter}
                y={plot.bottom + T.CATEGORY_DROP}
                fill={muted}
                fontSize={T.AXIS.fontSize}
                textAnchor="middle"
              >
                {b.name}
              </text>
            </>
          )}
        </g>
      ))}

      {/* Direct annotation naming the subject — not a third hue, ink text with a short leader,
          which is what `static-discipline.md`'s "one accent" and "direct labels" rules become for
          a chart type whose colour budget is already spent on the two series.

          The transpose's stated COST, paid here rather than ignored: "an argument drawn ACROSS the
          columns degrades." In the column form the callout hangs at the top of the plot with a
          vertical leader down to its group. In the row form there is no "top of the plot" over one
          group, so it becomes a MARK beside its own rows — set past the end of the longer bar, on
          the group's own centre line, with a short horizontal leader. */}
      {calloutBar &&
        (orientation === "rows" ? (
          <g>
            <line
              x1={
                Math.max(calloutBar.wind.width, calloutBar.solar.width) +
                plot.left +
                widestValue +
                T.VALUE_LABEL_GAP * 2
              }
              x2={
                Math.max(calloutBar.wind.width, calloutBar.solar.width) +
                plot.left +
                widestValue +
                T.VALUE_LABEL_GAP * 3
              }
              y1={calloutBar.groupCenter}
              y2={calloutBar.groupCenter}
              stroke={muted}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {calloutLines.map((line, i) => (
              <text
                key={line}
                x={
                  Math.max(calloutBar.wind.width, calloutBar.solar.width) +
                  plot.left +
                  widestValue +
                  T.VALUE_LABEL_GAP * 4
                }
                y={
                  calloutBar.groupCenter -
                  ((calloutLines.length - 1) * T.CALLOUT_LEAD) / 2 +
                  i * T.CALLOUT_LEAD +
                  T.NOTE.fontSize * 0.36
                }
                fill={ink}
                fontSize={T.NOTE.fontSize}
                fontWeight={600}
              >
                {line}
              </text>
            ))}
          </g>
        ) : (
          <g>
            <line
              x1={calloutBar.groupCenter}
              x2={calloutBar.groupCenter}
              y1={
                plot.top +
                T.CALLOUT_DROP +
                (calloutLines.length - 1) * T.CALLOUT_LEAD +
                T.NOTE.fontSize * CALLOUT_DESCENDER +
                T.CALLOUT_LEADER_GAP
              }
              y2={
                Math.min(calloutBar.wind.y, calloutBar.solar.y) -
                T.VALUE_LABEL_GAP
              }
              stroke={muted}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {calloutLines.map((line, i) => (
              <text
                key={line}
                // The label text is centred on the bar it names, EXCEPT when that would run the
                // widest line past the frame — the render caught the Switzerland case, the last
                // group, where a centred label ran clean off the right edge. Clamp the anchor to
                // the widest line's own measured half width, inside the plot; the leader line below
                // still points straight at the true bar.
                x={Math.min(
                  Math.max(
                    calloutBar.groupCenter,
                    plot.left + calloutMaxWidth / 2,
                  ),
                  plot.right - calloutMaxWidth / 2,
                )}
                y={plot.top + T.CALLOUT_DROP + i * T.CALLOUT_LEAD}
                fill={ink}
                fontSize={T.NOTE.fontSize}
                fontWeight={600}
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
