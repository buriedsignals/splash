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
  inkBox,
  inkThatReadsOver,
  textContrastFloor,
} from "#shared/twin-chart-beat/annotation-ink.mjs";

export type Band = { ageBand: string; male: number; female: number };

const FRAME = { width: 900, height: 820 };
const PAD = 40;
const TITLE = { fontSize: 24, fontWeight: 700, lead: 30 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 12, fontWeight: 400 };
const BAND_LABEL = { fontSize: 11, fontWeight: 400 };
/** The air the zero spine leaves on each side of a band label's own measured glyph extent, in
 *  frame units. Small on purpose: the spine has to stay legible AS a continuous zero across a
 *  21-band gutter, so the gap is the label plus a hair, never a generous window. */
const SPINE_LABEL_CLEARANCE = 2;
const LEGEND = { fontSize: 13, fontWeight: 600 };
const NOTE = { fontSize: 12, fontWeight: 700 };
/** Two hues a colour-vision-deficient reader can tell apart, checked as a pair — the type's own
 *  accessibility note. The mirrored position already carries the group distinction; colour here
 *  is reinforcing it, not carrying it alone. */
const COLOURS = { male: "#0072B2", female: "#D55E00" };
/** The air between the peak band's bar tip and the start of the callout drawn inside it. */
const PEAK_NOTE_INSET = 10;
const BAND_GUTTER = 64;
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
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const centerX = (plot.left + plot.right) / 2;
  const halfWidth = (plot.right - plot.left - BAND_GUTTER) / 2;

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
      male_: { x: centerX - BAND_GUTTER / 2 - maleWidth, width: maleWidth },
      female_: { x: centerX + BAND_GUTTER / 2, width: femaleWidth },
    };
  });

  const ticks = magnitude.ticks(X_TICK_HINT).filter((v) => v > 0);
  return {
    plot,
    centerX,
    bars,
    ticksLeft: ticks.map((v) => ({
      value: v,
      x: centerX - BAND_GUTTER / 2 - magnitude(v),
    })),
    ticksRight: ticks.map((v) => ({
      value: v,
      x: centerX + BAND_GUTTER / 2 + magnitude(v),
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
}: {
  bands: Band[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  peakBand: string;
  peakLabel: string;
}) {
  if (bands.length < 3)
    throw new Error(
      "a population pyramid beat needs at least three age bands, got " +
        bands.length,
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
    limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + 26;

  const padding = {
    top: legendBaseline + 22,
    right: PAD + 8,
    // Grown by the source block's own height plus clear air: the credit now sits on the frame's
    // bottom margin, so the band beneath the plot has to end above its ink.
    bottom:
      PAD +
      24 +
      (sourceLines.length - 1) * SUBTITLE.lead +
      SOURCE.fontSize +
      10,
    left: PAD + 8,
  };
  const { plot, centerX, bars, ticksLeft, ticksRight } = pyramidGeometry(
    bands,
    { width, height, padding },
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
  // Measured, not assumed: the bar is 23.3px tall against an 11.2px ink band and 337px wide against
  // a 183px label. If a longer callout or a shorter bar ever breaks that, this THROWS with both
  // numbers rather than drawing a sentence over the edge of its own mark.
  const peakNote = (() => {
    if (!peak) return null;
    const width = measureText(peakLabel, NOTE);
    const band = measureTextBand(peakLabel, NOTE);
    const baseline =
      peak.y + peak.height / 2 + (band.ascent - band.descent) / 2;
    const box = inkBox({
      x: peak.male_.x + PEAK_NOTE_INSET,
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
    if (!insideTheBar) {
      throw new Error(
        `"${peakLabel}" measures ${width.toFixed(1)}x${(band.ascent + band.descent).toFixed(1)}px and does not fit inside ` +
          `the ${peakBand} bar (${peak.male_.width.toFixed(1)}x${peak.height.toFixed(1)}px, inset ${PEAK_NOTE_INSET}px). ` +
          `A callout that overhangs its own mark has no ink that reads on both — shorten it, or give ` +
          `the frame more height per band.`,
      );
    }
    return {
      x: box.x,
      baseline,
      ink: inkThatReadsOver([COLOURS.male], textContrastFloor(NOTE)),
    };
  })();

  // The gaps the zero spine leaves for the band labels, and the segments that remain. Each gap is
  // the label's own measured ink extent above and below its baseline, plus SPINE_LABEL_CLEARANCE
  // of air on each side. Sorted and walked once, so a future band order or a taller label changes
  // the drawing without changing this code.
  const spineGaps = bars
    .map((b) => {
      const baseline = b.centerLabelY + 4;
      const { ascent, descent } = measureTextBand(b.ageBand, BAND_LABEL);
      return {
        top: baseline - ascent - SPINE_LABEL_CLEARANCE,
        bottom: baseline + descent + SPINE_LABEL_CLEARANCE,
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
        x={centerX - 220}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={COLOURS.male}
      />
      <text
        x={centerX - 202}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
      >
        Men
      </text>
      <rect
        x={centerX + 40}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={COLOURS.female}
      />
      <text
        x={centerX + 58}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
      >
        Women
      </text>

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
            y={plot.bottom + 18}
            fill={muted}
            fontSize={AXIS.fontSize}
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
            y={plot.bottom + 18}
            fill={muted}
            fontSize={AXIS.fontSize}
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

      {bars.map((b) => (
        <g key={b.ageBand}>
          <rect
            x={b.male_.x}
            y={b.y}
            width={b.male_.width}
            height={b.height}
            fill={COLOURS.male}
          />
          <rect
            x={b.female_.x}
            y={b.y}
            width={b.female_.width}
            height={b.height}
            fill={COLOURS.female}
          />
          {/* The age band label sits in the reserved central gutter, never printed over a bar. */}
          <text
            x={centerX}
            y={b.centerLabelY + 4}
            fill={muted}
            fontSize={BAND_LABEL.fontSize}
            textAnchor="middle"
          >
            {b.ageBand}
          </text>
        </g>
      ))}

      {peakNote && (
        <g>
          <text
            x={peakNote.x}
            y={peakNote.baseline}
            fill={peakNote.ink}
            fontSize={NOTE.fontSize}
            fontWeight={NOTE.fontWeight}
          >
            {peakLabel}
          </text>
        </g>
      )}
    </svg>
  );
}
