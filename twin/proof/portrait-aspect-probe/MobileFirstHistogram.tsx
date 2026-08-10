/**
 * MOBILE-FIRST PROBE — the histogram, composed from the phone rather than moved around a tall frame.
 *
 * The design this implements is `MOBILE-FIRST-WIREFRAME.md`, written before this file. In short:
 *
 *   - the type scale is ABSOLUTE, in frame pixels, and every size divides by 3 to reach a 360 dp
 *     phone. `FLOOR = 36` frame px = 12 CSS px, the smallest size any of the three cited sources
 *     will defend. Nothing is ever drawn smaller and no rung of the ladder lowers a size.
 *   - the stage is Meta's published safe band — 269 px to 1248 px on a 1080x1920 frame, 979 px tall.
 *     The block lives INSIDE it, credit included. That is a size budget, not only a placement rule.
 *   - the plot's height is SOLVED from the budget rather than assigned: it is whatever the stage has
 *     left once the words are laid out. If that is less than `plotWidth / maxAspect` — the flattest
 *     plot this type's own accepted renders ever produced — the layout does not shrink anything, it
 *     REMOVES something and tries again.
 *
 * The removal ladder is duplicated in `MobileFirstLine.tsx` rather than shared, which is the twin's
 * standing answer to "make this true for N types": the same change made identically in each craft
 * skill, with a walking parity test proving the copies stay in step. The two copies differ exactly
 * where the two types differ, and `mobile-first-probe.mjs` prints which rungs each type could not
 * offer at all — a line has fewer rungs than a histogram, and that is a result, not an oversight.
 *
 * Nothing ships from here and no production component is touched.
 */

import { scaleLinear } from "d3-scale";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "#shared/chart-beat/render-still.mjs";
import type { Bin } from "./PortraitHistogram.tsx";

/** Every rung of `MOBILE-FIRST-WIREFRAME.md` §4 that this type can offer. R0 (transpose) is absent
 *  on purpose: a histogram's x axis is a continuum, and transposing it would put a continuous
 *  variable on a band scale and lie about it. */
export type Rung =
  | "R1 axis title dropped, unit folded into the last tick"
  | "R2 value-axis ticks 5 to 3"
  | "R3 standfirst sentence dropped"
  | "R4 annotation dropped"
  | "R5 median label moved into prose"
  | "R7 standfirst removed entirely"
  | "R8 bins reclassified 10 to 6 — CHANGES THE SHAPE, must be surfaced";

/** A ladder may drop a whole SENTENCE. It may never cut one in half. The first render of this file
 *  capped the standfirst at N wrapped LINES and printed "Per-country distribution for 2023 — each
 *  of", which is the same class of defect as a chart that truncates its own data: the reader is
 *  given a fragment and no sign that it is one. Splitting on sentence ends and dropping from the
 *  last is the smallest change that makes a removal honest. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The scale, stated once, in frame pixels for a 1080-wide frame. Divide by 3 for CSS pixels on a
 *  360 dp phone — see `MOBILE-FIRST-WIREFRAME.md` §2 for where each number comes from. */
export const MOBILE_FIRST_SCALE = {
  FLOOR: 36,
  PAD: 72,
  TITLE: { fontSize: 72, fontWeight: 700, lead: 86 },
  STANDFIRST: { fontSize: 48, fontWeight: 400, lead: 62 },
  BODY: { fontSize: 48, fontWeight: 400, lead: 62 },
  BODY_LEAD_IN: { fontSize: 48, fontWeight: 700 },
  LABEL: { fontSize: 42, fontWeight: 600 },
  AXIS: { fontSize: 39, fontWeight: 400 },
  AXIS_TITLE: { fontSize: 39, fontWeight: 600 },
  SOURCE: { fontSize: 36, fontWeight: 400 },
};

/** Air, also in frame pixels at 1080 wide. Kept beside the type so a reader can see the whole
 *  vertical budget in one place. */
const AIR = {
  TITLE_TO_STANDFIRST: 30,
  STANDFIRST_TO_UNIT: 46,
  // Clears a tick label sitting ON the plot's top edge — see `MobileFirstLine.tsx`, where `.nice()`
  // does exactly that and 16 was not enough. Made identical here rather than left at the value that
  // happened to work for this beat's data.
  UNIT_TO_PLOT: 40,
  PLOT_TO_TICKS: 40,
  TICKS_TO_AXIS_TITLE: 16,
  AXIS_TO_NOTES: 44,
  RULE_TO_NOTE: 34,
  NOTE_TO_NOTE: 22,
  NOTES_TO_SOURCE: 34,
  Y_TICK_INSET: 14,
};

export function wrapAt(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      out.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...out, line] : out;
}

/** Bins to bars — unchanged from the beat. */
function histogramGeometry(
  bins: Bin[],
  {
    plot,
    yTickCount,
  }: {
    plot: { left: number; top: number; right: number; bottom: number };
    yTickCount: number;
  },
) {
  const x = scaleLinear()
    .domain([bins[0].lo, bins[bins.length - 1].hi])
    .range([plot.left, plot.right]);
  const y = scaleLinear()
    .domain([0, Math.max(...bins.map((b) => b.count))])
    .nice()
    .range([plot.bottom, plot.top]);
  return {
    x,
    y,
    bars: bins.map((b) => ({
      lo: b.lo,
      hi: b.hi,
      count: b.count,
      x: x(b.lo),
      width: x(b.hi) - x(b.lo),
      y: y(b.count),
      height: y(0) - y(b.count),
    })),
    ticksY: y.ticks(yTickCount).map((value) => ({ value, y: y(value) })),
  };
}

/** Consolidate adjacent bins — R6. Named `reclassify` after the strategy it implements
 *  (Horak et al. 2021 §2.4.4), and it never invents a count: adjacent bins are summed. */
export function reclassify(bins: Bin[], into: number): Bin[] {
  if (into >= bins.length) return bins;
  const perGroup = Math.ceil(bins.length / into);
  const out: Bin[] = [];
  for (let i = 0; i < bins.length; i += perGroup) {
    const group = bins.slice(i, i + perGroup);
    out.push({
      lo: group[0].lo,
      hi: group[group.length - 1].hi,
      count: group.reduce((s, b) => s + b.count, 0),
    });
  }
  return out;
}

type State = {
  axisTitle: boolean;
  yTickCount: number;
  standfirstSentences: number;
  noteCount: number;
  medianLabel: boolean;
  binCount: number;
};

export type Layout = {
  fired: Rung[];
  refused: string | null;
  state: State;
  blockHeight: number;
  plotHeight: number;
  plotWidth: number;
  minPlotHeight: number;
  maxPlotHeight: number;
};

export function PortraitMobileFirstHistogram({
  bins: allBins,
  title,
  standfirst,
  source,
  notes,
  alt,
  ground,
  accent,
  median,
  medianLabel,
  unit,
  width,
  height,
  safeTop,
  safeBottom,
  plotAspectRange,
  onLayout,
}: {
  bins: Bin[];
  title: string;
  standfirst: string;
  source: string;
  notes: { lead: string; body: string }[];
  alt: string;
  ground: string;
  accent: string;
  median: number;
  medianLabel: string;
  unit: string;
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  plotAspectRange: [number, number];
  /** The ladder's own record. Emitted so that nothing is dropped in a decision nobody chose. */
  onLayout?: (layout: Layout) => void;
}) {
  if (allBins.length < 3)
    throw new Error(
      "a histogram beat needs at least three bins to show a shape, got " +
        allBins.length,
    );

  const { ink, muted, grid } = deriveFurniture(ground);
  const k = width / 1080;
  const px = (v: number) => Math.round(v * k);
  const font = (f: {
    fontSize: number;
    fontWeight: number;
    lead?: number;
  }) => ({
    ...f,
    fontSize: px(f.fontSize),
    ...(f.lead === undefined ? {} : { lead: px(f.lead) }),
  });
  const S = MOBILE_FIRST_SCALE;
  const TITLE = font(S.TITLE) as {
    fontSize: number;
    fontWeight: number;
    lead: number;
  };
  const STANDFIRST = font(S.STANDFIRST) as {
    fontSize: number;
    fontWeight: number;
    lead: number;
  };
  const BODY = font(S.BODY) as {
    fontSize: number;
    fontWeight: number;
    lead: number;
  };
  const BODY_LEAD_IN = font(S.BODY_LEAD_IN);
  const AXIS = font(S.AXIS);
  const AXIS_TITLE = font(S.AXIS_TITLE);
  const SOURCE = font(S.SOURCE);
  const PAD = px(S.PAD);
  const air = Object.fromEntries(
    Object.entries(AIR).map(([key, v]) => [key, px(v)]),
  ) as Record<keyof typeof AIR, number>;

  const stageTop = safeTop;
  const stageHeight = safeBottom - safeTop;
  const contentWidth = width - PAD * 2;
  const [minAspect, maxAspect] = plotAspectRange;

  // ---------------------------------------------------------------- the layout, as a pure function
  // Everything below is a function of a STATE — which rungs have fired — so the ladder can try a
  // state, measure it, and try the next without any of it depending on render order.
  function layoutFor(state: State) {
    const bins = reclassify(allBins, state.binCount);
    const maxCount = Math.max(...bins.map((b) => b.count));
    // THE UNIT RIDES A CAPTION ABOVE THE AXIS, NOT THE TOP TICK LABEL. The first render appended it
    // — "100 countries" — and that one label alone set the left gutter to 320 px, a third of the
    // frame's width. The gutter is not free: the plot's own height floor is `plotWidth/maxAspect`,
    // so every pixel spent on a gutter is a pixel the plot may not have in height. One caption of
    // 39 px buys back roughly 160 px of width.
    const yTickLabels = scaleLinear()
      .domain([0, maxCount])
      .nice()
      .ticks(state.yTickCount)
      .map((v) => `${v}`);
    const left =
      PAD +
      air.Y_TICK_INSET +
      Math.max(...yTickLabels.map((l) => measureText(l, AXIS)));
    const right = PAD;
    const plotWidth = width - left - right;
    const minPlotHeight = plotWidth / maxAspect;
    const maxPlotHeight = plotWidth / minAspect;

    const titleLines = wrapAt(title, contentWidth, TITLE);
    const titleHeight = TITLE.fontSize + (titleLines.length - 1) * TITLE.lead;
    const standfirstLines = wrapAt(
      sentences(standfirst).slice(0, state.standfirstSentences).join(" "),
      contentWidth,
      STANDFIRST,
    );
    const standfirstHeight =
      standfirstLines.length === 0
        ? 0
        : STANDFIRST.fontSize + (standfirstLines.length - 1) * STANDFIRST.lead;

    const axisBand =
      air.PLOT_TO_TICKS +
      AXIS.fontSize +
      (state.axisTitle ? air.TICKS_TO_AXIS_TITLE + AXIS_TITLE.fontSize : 0);

    const noteBlocks = notes.slice(0, state.noteCount).map((n) => {
      const indent = measureText(n.lead, BODY_LEAD_IN) + px(12);
      return {
        lead: n.lead,
        indent,
        lines: wrapAt(n.body, contentWidth - indent, BODY),
      };
    });
    const notesHeight =
      noteBlocks.length === 0
        ? 0
        : air.AXIS_TO_NOTES +
          air.RULE_TO_NOTE +
          noteBlocks.reduce((s, n) => s + n.lines.length * BODY.lead, 0) +
          (noteBlocks.length - 1) * air.NOTE_TO_NOTE;

    const fixed =
      titleHeight +
      (standfirstHeight === 0
        ? 0
        : air.TITLE_TO_STANDFIRST + standfirstHeight) +
      air.STANDFIRST_TO_UNIT +
      AXIS.fontSize +
      air.UNIT_TO_PLOT +
      axisBand +
      notesHeight +
      air.NOTES_TO_SOURCE +
      SOURCE.fontSize;

    // THE PLOT'S HEIGHT IS SOLVED, NOT ASSIGNED. It is what the stage has left.
    const solved = stageHeight - fixed;
    const plotHeight = Math.min(solved, maxPlotHeight);
    return {
      bins,
      yTickLabels,
      left,
      plotWidth,
      minPlotHeight,
      maxPlotHeight,
      titleLines,
      titleHeight,
      standfirstLines,
      standfirstHeight,
      axisBand,
      noteBlocks,
      notesHeight,
      fixed,
      solved,
      plotHeight,
      blockHeight: fixed + plotHeight,
      fits: solved >= minPlotHeight,
    };
  }

  // ------------------------------------------------------------------------------------ the ladder
  const state: State = {
    axisTitle: true,
    yTickCount: 5,
    standfirstSentences: sentences(standfirst).length,
    noteCount: notes.length,
    medianLabel: true,
    binCount: allBins.length,
  };
  const fired: Rung[] = [];
  let L = layoutFor(state);
  const rungs: [Rung, () => boolean][] = [
    [
      "R1 axis title dropped, unit folded into the last tick",
      () => (state.axisTitle ? ((state.axisTitle = false), true) : false),
    ],
    [
      "R2 value-axis ticks 5 to 3",
      () => (state.yTickCount > 3 ? ((state.yTickCount = 3), true) : false),
    ],
    [
      "R3 standfirst sentence dropped",
      () =>
        state.standfirstSentences > 1
          ? ((state.standfirstSentences -= 1), true)
          : false,
    ],
    [
      "R4 annotation dropped",
      () => (state.noteCount > 0 ? ((state.noteCount -= 1), true) : false),
    ],
    [
      "R5 median label moved into prose",
      () => (state.medianLabel ? ((state.medianLabel = false), true) : false),
    ],
    // R3 REDUCES the standfirst to one sentence; R7 removes it. They are separated by four rungs on
    // purpose. Cutting a two-sentence standfirst to one costs context the title mostly implies;
    // deleting it costs the only line that says what the numbers ARE, which is a bigger loss than
    // any single annotation. It sits here because the alternative to it is refusing outright.
    [
      "R7 standfirst removed entirely",
      () =>
        state.standfirstSentences > 0
          ? ((state.standfirstSentences = 0), true)
          : false,
    ],
    // RECLASSIFICATION IS LAST, AND IT WAS NOT LAST IN THE FIRST DRAFT. `MOBILE-FIRST-WIREFRAME.md`
    // put it above the standfirst rungs on the argument that a sentence is recoverable outside the
    // frame and shape detail is not. Rendering it settled the argument the other way: consolidating
    // this beat's ten bins into six merged the 0-4 and 4-8 bins into one 179-country column and the
    // right-skew — the entire claim — VANISHED. Horak et al. list reducing a histogram's bins as a
    // legitimate strategy, but for a distribution whose point IS its shape it is the most
    // destructive rung on the ladder, not a middling one. It stays available only because the
    // alternative is refusing, and it is emitted so a journalist can veto it.
    [
      "R8 bins reclassified 10 to 6 — CHANGES THE SHAPE, must be surfaced",
      () => (state.binCount > 6 ? ((state.binCount = 6), true) : false),
    ],
  ];
  for (const [name, apply] of rungs) {
    // R4 is the only rung that can fire more than once — it drops ONE annotation at a time so the
    // block takes as many as the budget allows instead of losing them all at the first squeeze.
    //
    // A RUNG THAT RECOVERS NOTHING DOES NOT FIRE. The first run dropped the median's label — a rung
    // whose whole effect is inside the plot rectangle and which frees no vertical budget at all —
    // and the reader lost the median for nothing. Every rung is now applied speculatively and kept
    // only if the stage actually gained height by it.
    while (!L.fits) {
      const before = { ...state };
      // The gain is measured as SLACK — height available minus the height the plot needs at the
      // current width — not as height alone. Measuring height alone judged R2 useless: reducing the
      // tick count frees no vertical space at all, it narrows the left gutter, which widens the plot
      // and LOWERS its height floor. Both halves are slack.
      const gainedFrom = L.solved - L.minPlotHeight;
      if (!apply()) break;
      const next = layoutFor(state);
      if (next.solved - next.minPlotHeight <= gainedFrom + 0.5) {
        Object.assign(state, before);
        break;
      }
      fired.push(name);
      L = next;
    }
    if (L.fits) break;
  }
  const refused = L.fits
    ? null
    : `portrait refused: after every rung the stage still leaves ${Math.round(L.solved)}px for a plot that needs at least ${Math.round(L.minPlotHeight)}px at this width. Offer square or landscape.`;
  onLayout?.({
    fired,
    refused,
    state: { ...state },
    blockHeight: Math.round(L.blockHeight),
    plotHeight: Math.round(L.plotHeight),
    plotWidth: Math.round(L.plotWidth),
    minPlotHeight: Math.round(L.minPlotHeight),
    maxPlotHeight: Math.round(L.maxPlotHeight),
  });
  if (refused) throw new Error(refused);

  // ---------------------------------------------------------------------------------- the drawing
  // Centred on the STAGE, not on the page — `CENTRING-VERDICT.md` recommendation 2. A mobile-first
  // block nearly fills the stage, so this shift is usually small; it matters for a short beat.
  const top = stageTop + Math.max(0, (stageHeight - L.blockHeight) / 2);

  const titleBaseline = top + TITLE.fontSize;
  const standfirstBaseline =
    titleBaseline +
    (L.titleLines.length - 1) * TITLE.lead +
    air.TITLE_TO_STANDFIRST +
    STANDFIRST.fontSize;
  const headerBottom =
    L.standfirstLines.length === 0
      ? titleBaseline + (L.titleLines.length - 1) * TITLE.lead
      : standfirstBaseline + (L.standfirstLines.length - 1) * STANDFIRST.lead;

  const unitBaseline = headerBottom + air.STANDFIRST_TO_UNIT + AXIS.fontSize;
  const plot = {
    left: L.left,
    right: width - PAD,
    top: unitBaseline + air.UNIT_TO_PLOT,
    bottom: unitBaseline + air.UNIT_TO_PLOT + L.plotHeight,
  };
  const { x, bars, ticksY } = histogramGeometry(L.bins, {
    plot,
    yTickCount: state.yTickCount,
  });
  const medianX = x(median);
  const tickBaseline = plot.bottom + air.PLOT_TO_TICKS;
  const axisTitleBaseline =
    tickBaseline + air.TICKS_TO_AXIS_TITLE + AXIS_TITLE.fontSize;
  const axisBottom = state.axisTitle ? axisTitleBaseline : tickBaseline;

  const noteRuleY = axisBottom + air.AXIS_TO_NOTES;
  let noteCursor = noteRuleY + air.RULE_TO_NOTE;
  const lastTickLabel = state.axisTitle
    ? `${L.bins[L.bins.length - 1].hi}`
    : `${L.bins[L.bins.length - 1].hi} ${unit}`;

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

      {L.titleLines.map((line, i) => (
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
      {L.standfirstLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={standfirstBaseline + i * STANDFIRST.lead}
          fill={muted}
          fontSize={STANDFIRST.fontSize}
        >
          {line}
        </text>
      ))}

      <text
        x={PAD}
        y={unitBaseline}
        fill={muted}
        fontSize={AXIS.fontSize}
        fontWeight={600}
      >
        Number of countries
      </text>

      {ticksY.map((tick, i) => (
        <g key={tick.value}>
          <line
            x1={plot.left}
            x2={plot.right}
            y1={tick.y}
            y2={tick.y}
            stroke={tick.value === 0 ? muted : grid}
            strokeWidth={2}
          />
          <text
            x={plot.left - air.Y_TICK_INSET}
            y={tick.y + px(12)}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {L.yTickLabels[i]}
          </text>
        </g>
      ))}

      {bars.map((b) => (
        <rect
          key={b.lo}
          x={b.x}
          y={b.y}
          width={Math.max(b.width - px(3), 0)}
          height={b.height}
          fill={muted}
        />
      ))}
      {bars.map((b, i) => (
        <text
          key={`label-${b.lo}`}
          x={b.x}
          y={tickBaseline}
          fill={muted}
          fontSize={AXIS.fontSize}
          textAnchor="middle"
        >
          {i % 2 === 0 ? b.lo : ""}
        </text>
      ))}
      <text
        x={plot.right}
        y={tickBaseline}
        fill={muted}
        fontSize={AXIS.fontSize}
        textAnchor="end"
      >
        {lastTickLabel}
      </text>
      {state.axisTitle ? (
        <text
          x={(plot.left + plot.right) / 2}
          y={axisTitleBaseline}
          fill={muted}
          fontSize={AXIS_TITLE.fontSize}
          fontWeight={AXIS_TITLE.fontWeight}
          textAnchor="middle"
        >
          CO2 emissions per capita (tonnes/year)
        </text>
      ) : null}

      <line
        x1={medianX}
        x2={medianX}
        y1={plot.top}
        y2={plot.bottom}
        stroke={accent}
        strokeWidth={4}
        strokeDasharray="12 8"
      />
      {state.medianLabel ? (
        <text
          x={medianX + px(14)}
          y={plot.top + px(46)}
          fill={ink}
          fontSize={S.LABEL.fontSize * k}
          fontWeight={S.LABEL.fontWeight}
        >
          {medianLabel}
        </text>
      ) : null}

      {L.noteBlocks.length === 0 ? null : (
        <line
          x1={PAD}
          x2={width - PAD}
          y1={noteRuleY}
          y2={noteRuleY}
          stroke={grid}
          strokeWidth={2}
        />
      )}
      {L.noteBlocks.map((note) => {
        const block = (
          <g key={note.lead}>
            <text
              x={PAD}
              y={noteCursor}
              fill={accent}
              fontSize={BODY_LEAD_IN.fontSize}
              fontWeight={BODY_LEAD_IN.fontWeight}
            >
              {note.lead}
            </text>
            {note.lines.map((line, i) => (
              <text
                key={line}
                x={PAD + note.indent}
                y={noteCursor + i * BODY.lead}
                fill={ink}
                fontSize={BODY.fontSize}
              >
                {line}
              </text>
            ))}
          </g>
        );
        noteCursor += note.lines.length * BODY.lead + air.NOTE_TO_NOTE;
        return block;
      })}

      <text
        x={PAD}
        y={
          (L.noteBlocks.length === 0
            ? axisBottom
            : noteCursor - air.NOTE_TO_NOTE) +
          air.NOTES_TO_SOURCE +
          SOURCE.fontSize
        }
        fill={muted}
        fontSize={SOURCE.fontSize}
      >
        {source}
      </text>
    </svg>
  );
}
