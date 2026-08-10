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
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/twin-chart-beat/render-still.mjs";

export type Group = { name: string; wind: number; solar: number };

const FRAME = { width: 900, height: 560 };
const PAD = 40;
const TITLE = { fontSize: 26, fontWeight: 700, lead: 34 };
const SUBTITLE = { fontSize: 14, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400 };
const AXIS = { fontSize: 13, fontWeight: 400 };
const VALUE_LABEL = { fontSize: 13, fontWeight: 700 };
const LEGEND = { fontSize: 13, fontWeight: 600 };
const NOTE = { fontSize: 13, fontWeight: 400 };
const UNIT = "%";
/** Baseline-to-baseline distance inside the callout block. */
const CALLOUT_LEAD = 16;
/** Descender room below a callout baseline, as a share of its own type size. */
const CALLOUT_DESCENDER = 0.3;
/** Clear space between the callout block's bottom and the top of its leader. */
const CALLOUT_LEADER_GAP = 8;
/** Wind: a cool hue. Solar: a warm one. Only one warm member sits in this two-colour set, so the
 *  "two warm hues adjacent" trap the grouped-bar sheet names (an orange next to a vermillion)
 *  cannot occur here — Okabe-Ito blue and Okabe-Ito orange. */
const WIND_COLOUR = "#0072B2";
const SOLAR_COLOUR = "#E69F00";
/** Y ticks the fitted, `.nice()`d domain is asked for — conventional static density, not the
 *  sparse floor/ceiling the motion genre would use. */
const Y_TICK_HINT = 5;
/** Small gap between the two bars in a group, wide gap between groups — the grouped-bar sheet's
 *  own "the eye must parse groups first" rule. */
const BAR_GAP = 4;
const GROUP_GAP = 28;

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
 */
export function groupedBarGeometry(
  groups: Group[],
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
  const values = groups.flatMap((g) => [g.wind, g.solar]);
  const y = scaleLinear()
    .domain([0, extent(values)[1] as number])
    .nice()
    .range([plot.bottom, plot.top]);

  const groupWidth =
    (plot.right - plot.left - GROUP_GAP * (groups.length - 1)) / groups.length;
  const barWidth = (groupWidth - BAR_GAP) / 2;

  const bars = groups.map((g, i) => {
    const groupLeft = plot.left + i * (groupWidth + GROUP_GAP);
    const windX = groupLeft;
    const solarX = groupLeft + barWidth + BAR_GAP;
    return {
      name: g.name,
      groupCenter: groupLeft + groupWidth / 2,
      wind: {
        x: windX,
        y: y(g.wind),
        width: barWidth,
        height: y(0) - y(g.wind),
        value: g.wind,
      },
      solar: {
        x: solarX,
        y: y(g.solar),
        width: barWidth,
        height: y(0) - y(g.solar),
        value: g.solar,
      },
    };
  });

  return {
    plot,
    bars,
    ticksY: y.ticks(Y_TICK_HINT).map((v) => ({ value: v, y: y(v) })),
    zeroY: y(0),
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
}: {
  groups: Group[];
  title: string;
  limits: string;
  source: string;
  alt: string;
  ground: string;
  calloutSubject: string;
  calloutText: string;
}) {
  if (groups.length < 2)
    throw new Error(
      "a grouped bar beat needs at least two groups, got " + groups.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height } = FRAME;

  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const limitsLines = wrap(limits, width - PAD * 2, SUBTITLE);
  const limitsBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 30;
  // The source line wraps on the real frame width too — a long credit-plus-effective-date string
  // (this beat's runs to 96 characters) is exactly what an unwrapped constant clips silently.
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN — the LAST line lands on `height - PAD`, the same
  // inset the title hangs off at the top, on the same x. See twin-chart-beat/references/static-discipline.md,
  // "The source on the frame's bottom margin".
  const sourceBaseline =
    height - PAD - (sourceLines.length - 1) * SUBTITLE.lead;
  // The legend keeps the air it always had above it, measured from the LAST HEADER line rather
  // than from the source, which is no longer in the header.
  const legendBaseline =
    limitsBaseline + (limitsLines.length - 1) * SUBTITLE.lead + 28;

  const tickLabels = groupedBarGeometry(groups, {
    width,
    height,
    padding: { top: 0, right: PAD, bottom: 0, left: PAD },
  }).ticksY.map((t, i, all) =>
    i === all.length - 1 ? `${t.value} ${UNIT}` : `${t.value}`,
  );

  const padding = {
    top: legendBaseline + 26,
    right: PAD,
    // Grown by the source block's own height plus clear air: the credit now sits on the frame's
    // bottom margin, so the axis band beneath the plot has to end above its ink.
    bottom:
      PAD +
      44 +
      (sourceLines.length - 1) * SUBTITLE.lead +
      SOURCE.fontSize +
      10,
    left: PAD + 10 + Math.max(...tickLabels.map((l) => measureText(l, AXIS))),
  };

  const { plot, bars, ticksY, zeroY } = groupedBarGeometry(groups, {
    width,
    height,
    padding,
  });
  const calloutBar = bars.find((b) => b.name === calloutSubject);
  const calloutLines = wrap(calloutText, 220, NOTE);
  // The label text is centred on the bar it names, EXCEPT when that would run the widest line
  // past the frame — the render caught the Switzerland case, the last group, where a centred
  // label ran clean off the right edge. Clamp the anchor to the widest line's own measured half
  // width, inside the plot; the leader line below still points straight at the true bar.
  const calloutMaxWidth = Math.max(
    ...calloutLines.map((line) => measureText(line, NOTE)),
  );
  const calloutAnchorX = calloutBar
    ? Math.min(
        Math.max(calloutBar.groupCenter, plot.left + calloutMaxWidth / 2),
        plot.right - calloutMaxWidth / 2,
      )
    : 0;
  // The leader used to start at the callout's own FIRST baseline, which put its whole run behind
  // the rest of the block: the dashed rule went straight down through the second line and cut
  // "group" into "gr|oup" — a leader drawn over the very words it exists to connect. It starts
  // below the block instead. The block's bottom is its last baseline plus that font's descender
  // room, so this holds however many lines `wrap` returns, not just the two this text happens to
  // produce today.
  const calloutTop = plot.top + 10;
  const calloutBottom =
    calloutTop +
    (calloutLines.length - 1) * CALLOUT_LEAD +
    NOTE.fontSize * CALLOUT_DESCENDER;

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

      {/* The two-entry legend the grouped-bar sheet accepts as its one exception: colour is the
          only thing tying a bar in the sixth group back to "wind," so it has to be established
          once, here, before the reader meets the first bar. */}
      <rect
        x={PAD}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={WIND_COLOUR}
      />
      <text
        x={PAD + 18}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
      >
        Wind
      </text>
      <rect
        x={PAD + 74}
        y={legendBaseline - 10}
        width={12}
        height={12}
        fill={SOLAR_COLOUR}
      />
      <text
        x={PAD + 92}
        y={legendBaseline}
        fill={ink}
        fontSize={LEGEND.fontSize}
        fontWeight={LEGEND.fontWeight}
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
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
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
          {/* Value label carries the number in ink, never the bar's own hue — a mark colour
              checked for confusability with its neighbours is not the same as a label colour
              checked for contrast against the page (`visual-system.md`). */}
          <text
            x={b.wind.x + b.wind.width / 2}
            y={b.wind.y - 6}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="middle"
          >
            {b.wind.value.toFixed(1)}
          </text>
          <text
            x={b.solar.x + b.solar.width / 2}
            y={b.solar.y - 6}
            fill={ink}
            fontSize={VALUE_LABEL.fontSize}
            fontWeight={VALUE_LABEL.fontWeight}
            textAnchor="middle"
          >
            {b.solar.value.toFixed(1)}
          </text>
          <text
            x={b.groupCenter}
            y={plot.bottom + 22}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="middle"
          >
            {b.name}
          </text>
        </g>
      ))}

      {/* Direct annotation naming the subject — not a third hue, ink text with a short leader,
          which is what `static-discipline.md`'s "one accent" and "direct labels" rules become for
          a chart type whose colour budget is already spent on the two series. */}
      {calloutBar && (
        <g>
          <line
            x1={calloutBar.groupCenter}
            x2={calloutBar.groupCenter}
            y1={calloutBottom + CALLOUT_LEADER_GAP}
            y2={Math.min(calloutBar.wind.y, calloutBar.solar.y) - 6}
            stroke={muted}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          {calloutLines.map((line, i) => (
            <text
              key={line}
              x={calloutAnchorX}
              y={calloutTop + i * CALLOUT_LEAD}
              fill={ink}
              fontSize={NOTE.fontSize}
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
