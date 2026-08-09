/**
 * The video beat of "China emits more CO₂ than the next five biggest emitters combined." —
 * 10 seconds, 30fps, 1080 × 1080.
 *
 * First bar-and-column written in the video genre. The type had a static sibling and a web sibling
 * in this corpus and no video one, which is the gap this beat closes. Ten columns, one value each,
 * every length measured from a shared zero baseline — so this file's geometry (`columnGeometry`
 * below) is its own shape, not a copy of `LollipopVideo.tsx`'s row-band geometry (rows there,
 * columns here; a dot at a tip there, a filled rectangle here) and not the stacked bar's segment
 * stack.
 *
 * `FONT_FAMILY`, `measureText`, `wrap` and `en` ARE this story's own copies of the other proof
 * workspaces' functions of the same name — not an import from any of them. The settled rule for a
 * workspace that needs something a skill has is to duplicate it, not reach back across the skill
 * boundary, and these four are specifically the VIDEO genre's browser-Canvas text measurer, not the
 * static genre's resvg one: the two are not interchangeable, so vendoring the wrong one would
 * mismeasure silently.
 *
 * THE MOTION PROBLEM (from `BRIEF.md`): the finding is not a property of any single column. It is
 * arithmetic across five of them — the second through sixth columns, added together, come to less
 * than the first. Nothing in a ranking's own build says that; a reader can watch ten columns arrive
 * and still not know it. So the beat separates the two: `reveal` builds the ranking and says only
 * what a ranking says (who is bigger, and in what order), and `conclusion` introduces the sum as a
 * mark of its own — a rule drawn at the summed height with a bracket under the five columns it
 * sums — so the comparison is SEEN (China's column stands above the rule) rather than asserted.
 *
 * THE TYPE'S OWN TRAP, honoured: `references/types/bar-and-column.md` calls a truncated baseline "a
 * false statement about the data dressed up as a stylistic choice." `columnGeometry` anchors the
 * value domain at zero unconditionally — there is no prop, no flag and no code path that fits the
 * scale to the readings, which is the line chart's discipline and belongs to lines only.
 *
 * COLOUR AND CONTRAST: exactly one column carries accent — China's, the one the headline is about,
 * and picked because the headline is about it rather than because it is the tallest (the sheet
 * names "highlighting the tallest bar simply because it's tallest" as letting the data choose the
 * story). Every value label stays in page `ink`, outside and above its column, never inside the
 * fill: the sheet's accessibility trap is a label painted on a mid-luminance fill, and a label that
 * never touches a fill cannot fail that way.
 */

import { scaleLinear } from "d3-scale";
import {
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
// A story consumes the root it lives in — `#shared/*`, not a relative path into the skill.
import {
  progressOf,
  type BeatTiming,
} from "#shared/twin-chart-video/timing.ts";
import { COLUMN_RANKING_TIMING } from "./timing-contract";

const FRAME = { width: 1080, height: 1080 };
const PAD = 72;
export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const TITLE = { fontSize: 38, fontWeight: 700, lead: 48 };
const SOURCE = { fontSize: 20, fontWeight: 400 };
const AXIS_TICK = { fontSize: 18, fontWeight: 500 };
const AXIS_TITLE = { fontSize: 19, fontWeight: 500 };
const VALUE_LABEL = { fontSize: 21, fontWeight: 600 };
const CATEGORY_MAX = { fontSize: 19, fontWeight: 500 };
const CATEGORY_MIN_SIZE = 13;
const CONCLUSION = { fontSize: 22, fontWeight: 600, lead: 27 };

/** Share of the band a column occupies. The sheet asks for a gap of a fifth to a third of the
 *  band; 0.62 of the band leaves 0.38 as gap, inside that range on the generous side. */
const COLUMN_FILL = 0.62;

export type Column = {
  country: string;
  /** Annual CO₂ emissions, billion tonnes (OWID publishes tonnes; render.mjs divides). */
  gt: number;
};

/**
 * The rendered width of a string in the font it will really be drawn in — this story's own copy of
 * the video genre's browser-Canvas text measurer (see the file doc-comment for why it is
 * duplicated rather than imported).
 */
let measuringContext: CanvasRenderingContext2D | null | undefined;
export function measureText(
  text: string,
  { fontSize, fontWeight = 400 }: { fontSize: number; fontWeight?: number },
): number {
  if (!text) return 0;
  if (measuringContext === undefined)
    measuringContext =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  if (!measuringContext) return text.length * fontSize * 0.5;
  measuringContext.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`;
  return measuringContext.measureText(text).width;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

/** English, fixed decimals. Every value here is a positive quantity of billions of tonnes. */
export function en(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * The largest category font size at which every single WORD of every category name fits inside one
 * column band. Measured, never assumed: the sheet's "fixed gutter" failure is the reliable way to
 * clip a real category name the day the real dataset's names are longer than the sample's, and the
 * column equivalent of a gutter is the band a name has to sit inside.
 */
export function fitCategorySize(
  countries: string[],
  bandWidth: number,
): number {
  for (let size = CATEGORY_MAX.fontSize; size > CATEGORY_MIN_SIZE; size--) {
    const font = { fontSize: size, fontWeight: CATEGORY_MAX.fontWeight };
    const longestWord = Math.max(
      ...countries.flatMap((c) =>
        c.split(/\s+/).map((w) => measureText(w, font)),
      ),
    );
    if (longestWord <= bandWidth - 6) return size;
  }
  return CATEGORY_MIN_SIZE;
}

/**
 * Data to coordinates. Pure — no colour, no font, no React.
 *
 * The value domain starts at zero and is never fitted to the readings. That is not a default that
 * a prop could override: for a length encoding, the baseline IS the encoding, and this function
 * has no parameter that could move it.
 */
export function columnGeometry(
  columns: Column[],
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
  const y = scaleLinear()
    .domain([0, Math.max(...columns.map((c) => c.gt))])
    .nice()
    .range([plot.bottom, plot.top]);

  const band = (plot.right - plot.left) / columns.length;
  const columnWidth = band * COLUMN_FILL;
  const bars = columns.map((c, i) => {
    const centre = plot.left + band * (i + 0.5);
    return {
      ...c,
      centre,
      x: centre - columnWidth / 2,
      top: y(c.gt),
      width: columnWidth,
    };
  });

  return { plot, band, columnWidth, bars, y, tickValues: y.ticks(6) };
}

/**
 * How far through column `i`'s own growth window the master `reveal` progress is, 0..1.
 *
 * Columns arrive in rank order with each window overlapping the next, so the build reads as one
 * cascade rather than ten discrete steps — the same overlap device the lollipop beat's `rowWindow`
 * uses, on the other axis.
 */
function columnWindow(i: number, count: number) {
  const span = 1 / count;
  const start = i * span;
  return { start, end: Math.min(1, start + span * 1.6) };
}

export type ColumnRankingVideoProps = {
  /** Pre-sorted by value, descending — render.mjs's job, not this component's. */
  data: Column[];
  title: string;
  source: string;
  axisTitle: string;
  subjectCountry: string;
  /** How many columns after the first the conclusion sums. Computed in render.mjs. */
  combinedCount: number;
  /** The sum of those columns, billion tonnes. Computed in render.mjs. */
  combinedTotal: number;
  /** "The next five combined", already in words — the word for the count is derived, not typed. */
  combinedLabel: string;
  /** The unit the summed value is printed in, e.g. "billion tonnes". */
  unit: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  timing?: BeatTiming;
};

export function ColumnRankingVideo({
  data,
  title,
  source,
  axisTitle,
  subjectCountry,
  combinedCount,
  combinedTotal,
  combinedLabel,
  unit,
  ground,
  accent,
  ink,
  muted,
  grid,
  timing = COLUMN_RANKING_TIMING,
}: ColumnRankingVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height } = FRAME;

  if (data.length < 3)
    throw new Error(`need at least three columns, got ${data.length}`);
  const subjectIndex = data.findIndex((c) => c.country === subjectCountry);
  if (subjectIndex !== 0)
    throw new Error(
      `this beat's argument is about the LEADING column; ${JSON.stringify(subjectCountry)} sits at index ${subjectIndex}`,
    );
  if (combinedCount < 1 || 1 + combinedCount > data.length)
    throw new Error(
      `combinedCount ${combinedCount} does not fit ${data.length} columns`,
    );

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  const sourceLines = wrap(source, width - PAD * 2, SOURCE);
  const sourceLead = SOURCE.fontSize * 1.5;
  const sourceBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + 44;
  const axisTitleBaseline =
    sourceBaseline + (sourceLines.length - 1) * sourceLead + 40;

  // The left gutter is the widest tick label actually present, measured — never a constant.
  const provisionalTicks = scaleLinear()
    .domain([0, Math.max(...data.map((c) => c.gt))])
    .nice()
    .ticks(6);
  const tickGutter =
    Math.max(...provisionalTicks.map((t) => measureText(en(t, 0), AXIS_TICK))) +
    14;

  const provisionalBand = (width - PAD * 2 - tickGutter) / data.length;
  const categorySize = fitCategorySize(
    data.map((c) => c.country),
    provisionalBand,
  );
  const categoryFont = {
    fontSize: categorySize,
    fontWeight: CATEGORY_MAX.fontWeight,
  };
  const categoryLines = data.map((c) =>
    wrap(c.country, provisionalBand - 6, categoryFont),
  );
  const categoryRows = Math.max(...categoryLines.map((l) => l.length));
  const categoryLead = categorySize * 1.25;

  const padding = {
    // Headroom for the value label that sits above the tallest column.
    top: axisTitleBaseline + 16 + VALUE_LABEL.fontSize + 12,
    right: PAD,
    bottom: PAD + 14 + categoryRows * categoryLead,
    left: PAD + tickGutter,
  };

  const g = columnGeometry(data, { width, height, padding });

  // The conclusion's own geometry, all of it derived from the data, none of it typed.
  const summed = data.slice(1, 1 + combinedCount);
  const summedLeft = g.bars[1].x;
  const summedRight = g.bars[combinedCount].x + g.bars[combinedCount].width;
  const summedTallest = Math.min(...summed.map((b) => g.y(b.gt)));
  // Clear of the value label that already sits above the tallest of the summed columns: that label
  // occupies from `top - 10 - fontSize` to `top - 10`, so the bracket goes above all of it. Measured
  // against the label's own box, never a constant — the first render put it at −22 and the bracket
  // struck through "4.90".
  const bracketY = summedTallest - (VALUE_LABEL.fontSize + 10 + 14);
  const ruleY = g.y(combinedTotal);
  const conclusionTextX = summedRight + 16;
  const conclusionLines = [
    ...wrap(combinedLabel, g.plot.right - conclusionTextX, CONCLUSION),
    `${en(combinedTotal)} ${unit}`,
  ];

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subject = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // The title and the source are on screen at FRAME ZERO, at full opacity, never faded in.
  // Extracting frame 0 from the mp4 of every video beat in this corpus returns a completely blank
  // white image — measured, not assumed: `establish` starts at frame 0, so its progress there is
  // exactly 0 and everything gated on it is invisible. Frame 0 is the poster frame a social
  // platform shows before anyone presses play, and a blank poster frame is a beat that says
  // nothing. `motion-grammar.md` already argues the title is furniture that establishes what the
  // reader is looking at; that argument taken literally means it cannot be absent at the start.
  // The axis furniture still fades in over `establish` — it is the frame the data will be measured
  // in, and it has nothing to say before the data does.
  const axisOpacity = establish;

  // The reference: the zero baseline, swept left to right and then left alone to be read.
  const baselineX2 = interpolate(
    referenceProgress,
    [0, 1],
    [g.plot.left, g.plot.right],
    { easing: Easing.out(Easing.cubic) },
  );

  // The reveal: every column grows UP from the baseline to its own value.
  const growth = g.bars.map((_, i) => {
    const w = columnWindow(i, g.bars.length);
    return interpolate(reveal, [w.start, w.end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });
  // Category labels sit under the baseline and belong to the band, not to the column's length, so
  // they arrive as soon as their own column starts growing.
  const categoryOpacity = growth.map((t) =>
    interpolate(t, [0, 0.08], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  // Value labels ride the growing top from early on rather than waiting for the column to finish —
  // `references/types/diverging-bar.md` records the sibling failure of gating a label on the LAST
  // slice of its bar's growth: the last-staggered bars end up unlabelled for most of the time they
  // are on screen. Here the label is legible from a third of the way up and travels with the top.
  const valueOpacity = growth.map((t) =>
    interpolate(t, [0.25, 0.5], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  // The subject: China's emphasis, once every column has landed. Critically damped — a wash that
  // overshot would show more emphasis for a few frames than the finding warrants.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.1]);
  const emphasis = interpolate(subject, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The conclusion: the bracket first, then the rule rising to the summed height, then the words.
  const bracketOpacity = interpolate(conclusion, [0, 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ruleGrowth = interpolate(conclusion, [0.2, 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const conclusionTextOpacity = interpolate(conclusion, [0.55, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily={FONT_FAMILY}
    >
      <rect x={0} y={0} width={width} height={height} fill={ground} />

      <g>
        {titleLines.map((text, i) => (
          <text
            key={text}
            x={PAD}
            y={titleBaseline + i * TITLE.lead}
            fill={ink}
            fontSize={TITLE.fontSize}
            fontWeight={TITLE.fontWeight}
          >
            {text}
          </text>
        ))}
        {sourceLines.map((text, i) => (
          <text
            key={text}
            x={PAD}
            y={sourceBaseline + i * sourceLead}
            fill={muted}
            fontSize={SOURCE.fontSize}
          >
            {text}
          </text>
        ))}
        <text
          x={PAD}
          y={axisTitleBaseline}
          fill={muted}
          fontSize={AXIS_TITLE.fontSize}
          fontWeight={AXIS_TITLE.fontWeight}
        >
          {axisTitle}
        </text>
      </g>

      {/* Value-axis gridlines and their tick labels — established with the title, then still.
          Zero is drawn separately, with emphasis, as the `reference` event. */}
      <g opacity={axisOpacity}>
        {g.tickValues
          .filter((t) => t !== 0)
          .map((t) => (
            <g key={`tick-${t}`}>
              <line
                x1={g.plot.left}
                x2={g.plot.right}
                y1={g.y(t)}
                y2={g.y(t)}
                stroke={grid}
                strokeWidth={1}
              />
              <text
                x={g.plot.left - 12}
                y={g.y(t) + AXIS_TICK.fontSize * 0.34}
                fill={muted}
                fontSize={AXIS_TICK.fontSize}
                fontWeight={AXIS_TICK.fontWeight}
                textAnchor="end"
              >
                {en(t, 0)}
              </text>
            </g>
          ))}
      </g>

      {/* The reference: the zero baseline every column is measured from. */}
      {referenceProgress > 0 ? (
        <g>
          <line
            x1={g.plot.left}
            x2={baselineX2}
            y1={g.plot.bottom}
            y2={g.plot.bottom}
            stroke={ink}
            strokeWidth={2.5}
          />
          <text
            x={g.plot.left - 12}
            y={g.plot.bottom + AXIS_TICK.fontSize * 0.34}
            fill={muted}
            fontSize={AXIS_TICK.fontSize}
            fontWeight={AXIS_TICK.fontWeight}
            textAnchor="end"
            opacity={referenceProgress}
          >
            0
          </text>
        </g>
      ) : null}

      {/* The subject's highlight wash, behind its column — a wash, not a mark. */}
      {highlightOpacity > 0 ? (
        <rect
          x={g.bars[subjectIndex].centre - g.band / 2}
          y={g.plot.top - 8}
          width={g.band}
          height={g.plot.bottom - g.plot.top + 8}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* The columns. Every opacity below is absolute — never divided back out of a parent
          group's opacity — so nothing produces NaN before a column's own window opens. */}
      {g.bars.map((b, i) => {
        const grown = (g.plot.bottom - b.top) * growth[i];
        const top = g.plot.bottom - grown;
        const isSubject = i === subjectIndex;
        return (
          <g key={b.country}>
            {/* ONE column whose fill switches at the same boundary its category label already
                switches on (`emphasis > 0.5` below) — never a second accent-coloured column
                dissolving over a neutral one, which spends the whole window in a blend of `muted`
                and `accent` that nobody chose. */}
            <rect
              x={b.x}
              y={top}
              width={b.width}
              height={Math.max(0, grown)}
              fill={isSubject && emphasis > 0.5 ? accent : muted}
            />
            <text
              x={b.centre}
              y={top - 10}
              fill={ink}
              fontSize={VALUE_LABEL.fontSize}
              fontWeight={VALUE_LABEL.fontWeight}
              textAnchor="middle"
              opacity={valueOpacity[i]}
            >
              {/* The number the label prints is the height the column is CURRENTLY drawn at, not
                  the value it is heading for. The scale starts at zero and is linear, so the drawn
                  height is exactly `gt × growth` — printing `gt` instead put "3.19" above a column
                  standing at 2.15 for most of its own arrival, which is a label naming a length
                  that has not landed. Extracted from the mp4 at frame 100, not visible in the
                  final-frame still. */}
              {en(b.gt * growth[i])}
            </text>
            {categoryLines[i].map((text, line) => (
              <text
                key={text}
                x={b.centre}
                y={g.plot.bottom + 14 + categorySize + line * categoryLead}
                fill={isSubject && emphasis > 0.5 ? accent : ink}
                fontSize={categorySize}
                fontWeight={
                  isSubject && emphasis > 0.5 ? 700 : categoryFont.fontWeight
                }
                textAnchor="middle"
                opacity={categoryOpacity[i]}
              >
                {text}
              </text>
            ))}
          </g>
        );
      })}

      {/* The conclusion: a bracket naming the columns that are summed, a rule at the sum's own
          height, and the sentence. The comparison is the rule passing BELOW the leading column's
          top — nothing here states it in words. */}
      {bracketOpacity > 0 ? (
        <g opacity={bracketOpacity}>
          <path
            d={`M ${summedLeft} ${bracketY + 10} L ${summedLeft} ${bracketY} L ${summedRight} ${bracketY} L ${summedRight} ${bracketY + 10}`}
            fill="none"
            stroke={muted}
            strokeWidth={2}
          />
          <line
            x1={(summedLeft + summedRight) / 2}
            x2={(summedLeft + summedRight) / 2}
            y1={bracketY}
            y2={interpolate(ruleGrowth, [0, 1], [bracketY, ruleY])}
            stroke={muted}
            strokeWidth={2}
            strokeDasharray="6 6"
          />
        </g>
      ) : null}
      {ruleGrowth > 0 ? (
        <line
          // The rule is born at the leader-end of the bracket and travels LEFT, across the leading
          // column, so its arrival is the comparison happening. x1 is the fixed end; interpolating
          // BOTH ends (the first draft's mistake) collapses the line to zero length at full growth.
          x1={summedRight}
          x2={interpolate(ruleGrowth, [0, 1], [summedRight, g.plot.left], {
            easing: Easing.out(Easing.cubic),
          })}
          y1={ruleY}
          y2={ruleY}
          stroke={ink}
          strokeWidth={2.5}
          strokeDasharray="10 7"
          opacity={bracketOpacity}
        />
      ) : null}
      {conclusionTextOpacity > 0
        ? conclusionLines.map((text, i) => (
            <text
              key={text}
              x={conclusionTextX}
              y={ruleY - 6 + i * CONCLUSION.lead}
              fill={ink}
              fontSize={CONCLUSION.fontSize}
              fontWeight={CONCLUSION.fontWeight}
              opacity={conclusionTextOpacity}
            >
              {text}
            </text>
          ))
        : null}
    </svg>
  );
}
