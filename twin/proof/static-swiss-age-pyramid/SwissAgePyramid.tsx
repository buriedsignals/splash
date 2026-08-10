/**
 * Beat: Switzerland's 2023 population by age and sex (population pyramid).
 *
 * Written fresh from `ChartSeed.tsx`'s shape for a type that is two back-to-back bar charts
 * sharing one central category axis (`references/types/population-pyramid.md`): both sides grow
 * outward from a shared central zero on ONE mirrored magnitude scale, age bands keep their natural
 * sequence (never sorted by value — that would destroy the silhouette the type exists to show),
 * and both axes read as positive numbers, because the left side is a group, not a negative
 * quantity.
 *
 * The frame is taller than the other beats' 900x560 default — a deliberate per-story choice
 * (`static-discipline.md`'s FRAME is a named tuning knob, not a fixed constant): 21 age bands at
 * the default height would put roughly 18px per band, too tight for a legible bar and its
 * mirrored pair.
 */

import { scaleLinear, scaleBand } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  measureTextBand,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  frameInsetFor,
  sizeFor,
  stageFor,
} from "#shared/twin-chart-beat/sizes.mjs";
import { formForSize } from "#shared/twin-chart-beat/type-at-size.mjs";
import {
  inkBox,
  inkThatReadsOver,
  textContrastFloor,
} from "#shared/twin-chart-beat/annotation-ink.mjs";

export type Band = { ageBand: string; male: number; female: number };

/** The type this beat draws, in `references/types/` vocabulary. `formForSize` answers for it, and
 *  a size it refuses is refused by the runner before a mark is drawn. */
export const TYPE = 'population-pyramid';

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
  SUBTITLE_TO_LEGEND: 26,
  LEGEND_TO_PLOT: 22,
  LEGEND_SWATCH: 12,
  LEGEND_SWATCH_RISE: 10,
  LEGEND_SWATCH_TO_TEXT: 18,
  LEGEND_ENTRY_GAP: 24,
  PLOT_SIDE_AIR: 8,
  PLOT_FLOOR_AIR: 24,
  SOURCE_AIR: 10,
  TICK_DROP: 18,
  LABEL_BASELINE_NUDGE: 4,
  /** The outline the peak band keeps when rung R4 takes its sentence. */
  PEAK_OUTLINE: 2,
  SUBTITLE: { fontSize: 14, fontWeight: 400, lead: 20 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  AXIS: { fontSize: 12, fontWeight: 400 },
  /** 12, not the 11 this beat was tuned at. `sizes.mjs` chooses landscape's 2.2 so that the SEED's
   *  smallest base token — 12 — clears the 26px floor; an 11 lands at 24px, which is 11.3 CSS px in
   *  a 900px article column, and `assertTypeFloor` refused the render by name. That is the guard's
   *  own documented case ("a beat whose smallest token is smaller than the seed's is refused
   *  loudly"), and the answer it names is to scale the token, never to lower the floor. */
  BAND_LABEL: { fontSize: 12, fontWeight: 400 },
  LEGEND: { fontSize: 13, fontWeight: 600 },
  NOTE: { fontSize: 12, fontWeight: 700 },
  SPINE_LABEL_CLEARANCE: 2,
  PEAK_NOTE_INSET: 10,
  BAND_GUTTER: 64,
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
    BAND_LABEL: f(BASE.BAND_LABEL) as typeof BASE.BAND_LABEL,
    LEGEND: f(BASE.LEGEND) as typeof BASE.LEGEND,
    NOTE: f(BASE.NOTE) as typeof BASE.NOTE,
    TITLE_TO_SUBTITLE: sp(BASE.TITLE_TO_SUBTITLE),
    SUBTITLE_TO_LEGEND: sp(BASE.SUBTITLE_TO_LEGEND),
    LEGEND_TO_PLOT: sp(BASE.LEGEND_TO_PLOT),
    LEGEND_SWATCH: sp(BASE.LEGEND_SWATCH),
    LEGEND_SWATCH_RISE: sp(BASE.LEGEND_SWATCH_RISE),
    LEGEND_SWATCH_TO_TEXT: sp(BASE.LEGEND_SWATCH_TO_TEXT),
    LEGEND_ENTRY_GAP: sp(BASE.LEGEND_ENTRY_GAP),
    PLOT_SIDE_AIR: sp(BASE.PLOT_SIDE_AIR),
    PLOT_FLOOR_AIR: sp(BASE.PLOT_FLOOR_AIR),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    TICK_DROP: sp(BASE.TICK_DROP),
    LABEL_BASELINE_NUDGE: sp(BASE.LABEL_BASELINE_NUDGE),
    PEAK_OUTLINE: Math.max(1, sp(BASE.PEAK_OUTLINE)),
    SPINE_LABEL_CLEARANCE: sp(BASE.SPINE_LABEL_CLEARANCE),
    PEAK_NOTE_INSET: sp(BASE.PEAK_NOTE_INSET),
    BAND_GUTTER: sp(BASE.BAND_GUTTER),
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
/** The air the zero spine leaves on each side of a band label's own measured glyph extent, in
 *  frame units. Small on purpose: the spine has to stay legible AS a continuous zero across a
 *  21-band gutter, so the gap is the label plus a hair, never a generous window. */
/** The air between the peak band's bar tip and the start of the callout drawn inside it. */
const X_TICK_HINT = 4;

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

/** Pure geometry: bands to mirrored bar rectangles. Youngest at the bottom, oldest at the top —
 *  the pyramid's own natural order, kept intact, never sorted by value
 *  (`references/types/population-pyramid.md`'s one thing that goes wrong). One shared magnitude
 *  scale, mirrored left and right from a central zero — not two independent scales. */
export function pyramidGeometry(
  bands: Band[],
  {
    width,
    height,
    padding,
    bandGutter,
    tickHint = X_TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    /** The clear channel down the middle that the band labels live in. It scales with the frame —
     *  it is sized by the widest band label — so it is passed in rather than read from a module
     *  constant this function cannot scale. */
    bandGutter: number;
    tickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const centerX = (plot.left + plot.right) / 2;
  const halfWidth = (plot.right - plot.left - bandGutter) / 2;

  const maxValue = Math.max(...bands.map((b) => Math.max(b.male, b.female)));
  const magnitude = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([0, halfWidth]);

  // Youngest band first in the data (index 0 = "0-4"); reverse so it lands at the BOTTOM of the
  // frame — `scaleBand`'s range runs top-to-bottom in SVG y, so the oldest band needs to come
  // first in the domain to end up at the top.
  const order = [...bands].reverse().map((b) => b.ageBand);
  const y = scaleBand()
    .domain(order)
    .range([plot.top, plot.bottom])
    .paddingInner(0.15);

  const bars = bands.map((b) => {
    const rowY = y(b.ageBand)!;
    const maleWidth = magnitude(b.male);
    const femaleWidth = magnitude(b.female);
    return {
      ageBand: b.ageBand,
      male: b.male,
      female: b.female,
      y: rowY,
      height: y.bandwidth(),
      centerLabelY: rowY + y.bandwidth() / 2,
      male_: { x: centerX - bandGutter / 2 - maleWidth, width: maleWidth },
      female_: { x: centerX + bandGutter / 2, width: femaleWidth },
    };
  });

  const ticks = magnitude.ticks(X_TICK_HINT).filter((v) => v > 0);
  return {
    plot,
    centerX,
    bars,
    ticksLeft: ticks.map((v) => ({
      value: v,
      x: centerX - bandGutter / 2 - magnitude(v),
    })),
    ticksRight: ticks.map((v) => ({
      value: v,
      x: centerX + bandGutter / 2 + magnitude(v),
    })),
  };
}

function thousands(v: number): string {
  return Math.round(v / 1000).toLocaleString("en-US") + "k";
}

export function SwissAgePyramid({
  bands,
  title,
  limits,
  source,
  alt,
  ground,
  peakBand,
  peakLabel,
  maleInk,
  femaleInk,
  size,
}: {
  bands: Band[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  peakBand: string;
  peakLabel: string;
  /** One hue per side. Two hues a colour-vision-deficient reader can tell apart, checked as a pair
   *  — the type's own accessibility note. The mirrored position already carries the group
   *  distinction; colour here is reinforcing it, not carrying it alone. They arrive as props
   *  because they are the newsroom's recorded answer, read from `PALETTE.md` by the runner —
   *  naming them here would put the answer back in the source, where no recorded choice reaches
   *  it. */
  maleInk: string;
  femaleInk: string;
  /** The size gate 2c pinned, read from this beat's own `BRIEF.md`. Not a default. */
  size: string;
}) {
  if (bands.length < 3)
    throw new Error(
      "a population pyramid beat needs at least three age bands, got " +
        bands.length,
    );

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
  // THE T.SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — the LAST line lands on `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. See
  // twin-chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline =
    sourceBottom - (sourceLines.length - 1) * T.SUBTITLE.lead;
  // The legend keeps the air it always had above it, measured from the LAST HEADER line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    limitsBaseline +
    (limitsLines.length - 1) * T.SUBTITLE.lead +
    T.SUBTITLE_TO_LEGEND;

  const padding = {
    top: legendBaseline + T.LEGEND_TO_PLOT,
    right: PAD + T.PLOT_SIDE_AIR,
    // Grown by the source block's own height plus clear air: the credit sits on the bottom of the
    // band, so the tick row beneath the plot has to end above its ink.
    bottom:
      height -
      (sourceBaseline - T.SOURCE.fontSize - T.SOURCE_AIR) +
      T.PLOT_FLOOR_AIR,
    left: PAD + T.PLOT_SIDE_AIR,
  };
  // The centre channel is MEASURED off the widest band label rather than reserved at a constant
  // 64px. That constant was a 900px-frame number and the labels it had to clear are 11px there and
  // 24px at landscape — a reserve that does not grow with its own contents is how a spine ends up
  // drawn through the words it is supposed to make room for.
  const bandGutter =
    Math.max(...bands.map((b) => measureText(b.ageBand, T.BAND_LABEL))) +
    T.LEGEND_SWATCH_TO_TEXT;
  const { plot, centerX, bars, ticksLeft, ticksRight } = pyramidGeometry(
    bands,
    { width, height, padding, bandGutter },
  );

  const peak = bars.find((b) => b.ageBand === peakBand);

  // THE PEAK CALLOUT SITS ON THE BAND IT NAMES, INKED AGAINST THAT BAND.
  //
  // It used to park at `x={plot.left}` and run a dashed leader out to the bar's tip. For the WIDEST
  // band — by definition the bar with the least margin left of it — that leader measured 13.2px in
  // the committed SVG (`x1="48" x2="61.16"`), which is three dashes, and the label itself lay across
  // the `#0072B2` bar with **57 % of its ink box on it, at 4.05:1** — under SC 1.4.3's 4.5:1 for a
  // 12px note, and NOT fixable by recolouring: black is 4.05:1 on the bar and white is 1.00:1 on the
  // page, so a label straddling both has no ink at all (`annotation-ink.mjs` says so by throwing).
  //
  // The row leaves nowhere else to go. 21 bands across a 390px plot at `paddingInner(0.15)` is a
  // ~3px gap between rows, so there is no clear air above or below the band, and the margin left of
  // the widest bar is the 13px the old leader was measuring. So the callout goes INSIDE its own bar,
  // white at 5.19:1, vertically centred on the band's own ink. The leader goes with it — a leader
  // exists to bridge a distance, and the label now stands on the thing it names.
  //
  // Measured, not assumed: the bar is 23.3px tall against an 11.2px ink band and 356.8px wide
  // against a 182.9px label. If a longer callout or a shorter bar ever breaks that, this THROWS with both
  // numbers rather than drawing a sentence over the edge of its own mark.
  const peakNote = (() => {
    if (!peak) return null;
    const width = measureText(peakLabel, T.NOTE);
    const band = measureTextBand(peakLabel, T.NOTE);
    const baseline =
      peak.y + peak.height / 2 + (band.ascent - band.descent) / 2;
    const box = inkBox({
      x: peak.male_.x + T.PEAK_NOTE_INSET,
      y: baseline,
      anchor: "start",
      width,
      ascent: band.ascent,
      descent: band.descent,
    });
    const insideTheBar =
      box.x >= peak.male_.x &&
      box.x + box.width <= peak.male_.x + peak.male_.width &&
      box.y >= peak.y &&
      box.y + box.height <= peak.y + peak.height;
    // WHEN IT NO LONGER FITS, THE ANNOTATION BECOMES A MARK — ladder rung R4, fired rather than
    // thrown.
    //
    // This used to throw, and the throw was right for the frame it was written at. The reasoning
    // above has not changed: a callout that overhangs its own bar lies partly on `#0072B2` and
    // partly on the page, where black measures 4.05:1 and white 1.00:1, and NO ink reads on both.
    // What changed is the frame. Both dimensions are pinned now, so 21 bands get whatever height is
    // left over rather than a height chosen for them, and at 1920x1080 the note's ink band (24.3px
    // at a 2.2x type scale) is taller than the 19.3px bar it would have to sit inside.
    //
    // Throwing here would mean the beat ships nothing at any size the toolchain offers. Shrinking
    // the note would put it under the floor, and no rung on the ladder makes type smaller. So the
    // SENTENCE goes and the SIGNAL stays: the peak band keeps a drawn emphasis, and the fact the
    // sentence stated is already in the title — "Switzerland's population bulges at ages 55-59".
    // The rung is recorded in `data-ladder` and printed by the runner.
    if (!insideTheBar) return null;
    return {
      x: box.x,
      baseline,
      ink: inkThatReadsOver([maleInk], textContrastFloor(T.NOTE)),
    };
  })();

  // The gaps the zero spine leaves for the band labels, and the segments that remain. Each gap is
  // the label's own measured ink extent above and below its baseline, plus T.SPINE_LABEL_CLEARANCE
  // of air on each side. Sorted and walked once, so a future band order or a taller label changes
  // the drawing without changing this code.
  const spineGaps = bars
    .map((b) => {
      const baseline = b.centerLabelY + T.LABEL_BASELINE_NUDGE;
      const { ascent, descent } = measureTextBand(b.ageBand, T.BAND_LABEL);
      return {
        top: baseline - ascent - T.SPINE_LABEL_CLEARANCE,
        bottom: baseline + descent + T.SPINE_LABEL_CLEARANCE,
      };
    })
    .sort((a, b) => a.top - b.top);
  const spineSegments: { y1: number; y2: number }[] = [];
  let spineCursor = plot.top;
  for (const gap of spineGaps) {
    if (gap.top > spineCursor)
      spineSegments.push({ y1: spineCursor, y2: gap.top });
    spineCursor = Math.max(spineCursor, gap.bottom);
  }
  if (plot.bottom > spineCursor)
    spineSegments.push({ y1: spineCursor, y2: plot.bottom });
  // THE SPINE CAN DISAPPEAR ENTIRELY, AND THAT IS A DECISION, NOT AN ABSENCE.
  //
  // Found by opening the landscape render: 21 band labels at 26px in a 477px gutter leave gaps that
  // touch, so every segment of the zero spine is a label gap and the walk above produces none. The
  // chart still reads — the label column IS the axis, and the bars stand off it on both sides — but
  // a rule this file's own comment calls "a continuous zero" vanishing without a word is exactly the
  // kind of silent loss this project keeps finding. It is recorded instead.
  const spineIsAllLabel = spineSegments.every((seg) => seg.y2 - seg.y1 < 1);

  const peakRungFired = peak !== undefined && peakNote === null;
  const ladder = [
    ...rungs,
    ...(spineIsAllLabel
      ? [
          "the zero spine is fully occupied by band labels at this size — the label column reads " +
            "as the axis and no rule is drawn",
        ]
      : []),
    ...(peakRungFired
      ? [
          "R4: the peak callout keeps its MARK (an outline on the band, its label in bold) and " +
            "loses its sentence, which the title already states",
        ]
      : []),
  ];


  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      fontFamily={FONT_FAMILY}
      data-ladder={ladder.join("; ") || "none"}
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

      {/* The two legend entries are placed against the pyramid's OWN centre channel, mirrored, not
          parked at centreX − 220 and centreX + 40. Those were 900px-frame offsets: on a 1920px
          frame they would have put "Men" a fifth of the way across the plot from a spine that had
          moved. */}
      {[
        { label: "Men", fill: maleInk, side: -1 },
        { label: "Women", fill: femaleInk, side: 1 },
      ].map((entry) => {
        const entryWidth =
          T.LEGEND_SWATCH_TO_TEXT + measureText(entry.label, T.LEGEND);
        const swatchX =
          entry.side < 0
            ? centerX - bandGutter / 2 - T.LEGEND_ENTRY_GAP - entryWidth
            : centerX + bandGutter / 2 + T.LEGEND_ENTRY_GAP;
        return (
          <g key={entry.label}>
            <rect
              x={swatchX}
              y={legendBaseline - T.LEGEND_SWATCH_RISE}
              width={T.LEGEND_SWATCH}
              height={T.LEGEND_SWATCH}
              fill={entry.fill}
            />
            <text
              x={swatchX + T.LEGEND_SWATCH_TO_TEXT}
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

      {/* Tick labels on BOTH magnitude axes read as positive numbers — the left side is a group,
          not a negative quantity (`references/types/population-pyramid.md`). */}
      {ticksLeft.map((t) => (
        <g key={`l-${t.value}`}>
          <line
            x1={t.x}
            x2={t.x}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={t.x}
            y={plot.bottom + T.TICK_DROP}
            fill={muted}
            fontSize={T.AXIS.fontSize}
            textAnchor="middle"
          >
            {thousands(t.value)}
          </text>
        </g>
      ))}
      {ticksRight.map((t) => (
        <g key={`r-${t.value}`}>
          <line
            x1={t.x}
            x2={t.x}
            y1={plot.top}
            y2={plot.bottom}
            stroke={grid}
            strokeWidth={1}
          />
          <text
            x={t.x}
            y={plot.bottom + T.TICK_DROP}
            fill={muted}
            fontSize={T.AXIS.fontSize}
            textAnchor="middle"
          >
            {thousands(t.value)}
          </text>
        </g>
      ))}
      {/* The zero spine, drawn in SEGMENTS that yield where a band label sits.
          One continuous line from `plot.top` to `plot.bottom` struck through all 21 of them: the
          committed PNG read "95|99", "85|89" and "100|+". The rule is not decoration — its own
          caption says the two sides share this zero — and the labels ARE the vertical axis, so
          neither can move out of the other's way. The fix is the one already proved next door in
          `../vidy-pyramid-niger-population/PyramidVideo.tsx`: the SPINE yields, by each label's own
          MEASURED glyph extent (`measureTextBand`, resvg's own ink box) plus a breathing gap —
          never by a ratio-of-fontSize constant, because "0-4" and "100+" carry no descenders and a
          gap sized for a hypothetical "g" is a gap nobody asked for. */}
      {spineSegments.map((seg) => (
        <line
          key={`spine-${seg.y1}`}
          x1={centerX}
          x2={centerX}
          y1={seg.y1}
          y2={seg.y2}
          stroke={muted}
          strokeWidth={1}
        />
      ))}

      {bars.map((b) => {
        const isPeak = b.ageBand === peakBand;
        return (
          <g key={b.ageBand}>
            <rect
              x={b.male_.x}
              y={b.y}
              width={b.male_.width}
              height={b.height}
              fill={maleInk}
            />
            <rect
              x={b.female_.x}
              y={b.y}
              width={b.female_.width}
              height={b.height}
              fill={femaleInk}
            />
            {/* When rung R4 has taken the peak's sentence, the emphasis it carried stays as a MARK:
                an ink outline around the band's own two bars. It is drawn only in that case, so a
                frame with room for the callout is byte-identical to what it was. */}
            {isPeak && peakRungFired && (
              <>
                <rect
                  x={b.male_.x}
                  y={b.y}
                  width={b.male_.width}
                  height={b.height}
                  fill="none"
                  stroke={ink}
                  strokeWidth={T.PEAK_OUTLINE}
                />
                <rect
                  x={b.female_.x}
                  y={b.y}
                  width={b.female_.width}
                  height={b.height}
                  fill="none"
                  stroke={ink}
                  strokeWidth={T.PEAK_OUTLINE}
                />
              </>
            )}
            {/* The age band label sits in the reserved central gutter, never printed over a bar. */}
            <text
              x={centerX}
              y={b.centerLabelY + T.LABEL_BASELINE_NUDGE}
              fill={isPeak && peakRungFired ? ink : muted}
              fontSize={T.BAND_LABEL.fontSize}
              fontWeight={isPeak && peakRungFired ? 700 : T.BAND_LABEL.fontWeight}
              textAnchor="middle"
            >
              {b.ageBand}
            </text>
          </g>
        );
      })}

      {peakNote && (
        <g>
          <text
            x={peakNote.x}
            y={peakNote.baseline}
            fill={peakNote.ink}
            fontSize={T.NOTE.fontSize}
            fontWeight={T.NOTE.fontWeight}
          >
            {peakLabel}
          </text>
        </g>
      )}
    </svg>
  );
}
