/**
 * The video beat of "Iceland has run almost entirely on renewable electricity every year since
 * 2016 — most of Europe is still catching up." — 9.6 seconds, 30fps, 1080 × 1080.
 *
 * First heatmap written in this shape. Eight countries (rows) × nine years 2016–2024 (columns,
 * chronological), one cell per country×year, colour is the ONLY value channel — not a traced
 * series and not a set of independent two-point rows, so this file's geometry (`heatmapGeometry`
 * below) and its colour-ramp interpolator (`rampAnchors` / `rampColor`) are a fresh shape, not a
 * copy of any prior beat's `crossingGeometry` / `dumbbellGeometry` / `migrationGeometry`.
 * `FONT_FAMILY`, `measureText` and `wrap` ARE this story's own copies of the other proof
 * workspaces' functions of the same name — not an import from any of them, per the
 * duplicate-do-not-link rule (`../video-population-growth-dumbbell/DumbbellVideo.tsx`'s file
 * doc-comment explains why: this story lives outside `chart-video`'s skill boundary, and the
 * settled rule for a workspace that needs something a skill has is to duplicate it, not reach back
 * across the boundary).
 *
 * THE BUILD (from `BRIEF.md`): establish the empty grid's axes together with the title and source
 * — furniture, colour carries no meaning yet. Lay down the colour legend (the reference: a filled
 * grid means nothing until the reader knows what dark and pale mean) and pause on it. Then fill
 * cells column by column, chronologically (2016 → 2024) — the x axis is time, so the columns
 * themselves proceed at a strictly LINEAR pace (`motion-grammar.md`: easing a time axis's
 * traversal is a lie about the data's pace); only each cell's own fade-in is eased. Iceland's row
 * — unbroken 100% in every single year of the window — gets its own emphasis once every column has
 * landed, and the beat closes by naming that fact in words and by fading in the grid's final-column
 * numbers, one per row, each labelled in a colour chosen by that cell's own fill.
 *
 * COLOUR: the heatmap type doctrine (`chart-beat/references/types/heatmap.md`) requires a
 * SEQUENTIAL ramp — luminance moving in one direction only, verified mechanically, not by eye —
 * and every stop clearing at least 3:1 contrast against the REAL ground the cells are drawn on,
 * not an assumed white. `rampAnchors` derives both ends from the ground actually passed in and
 * this beat's accent hue (see its own doc-comment); `rampColor` is a straight per-channel
 * interpolation between them, which is what makes the monotonic-luminance guarantee hold at every
 * intermediate stop, not just at the two ends this file happens to compute. `textOnCell` picks
 * each cell's OWN value-label colour from that cell's OWN rendered fill — never a single global
 * ink choice, which is the accessibility trap the type doctrine names by name (a label that is ink
 * everywhere vanishes against the darkest cells).
 *
 * VALUE LABELS: the type doctrine allows per-cell numeric labels when exact numbers matter, but
 * warns that a dense grid printing every cell becomes static, not signal. Printing all 72 numbers
 * would also repeat Iceland's "100" nine times over — `anti-patterns.md`'s "repeated years or
 * values," the same failure the dumbbell's `BRIEF.md` named for its own shared left dot. This beat
 * shows numbers exactly where they earn their place: the legend's min/max (required by the type
 * doctrine on every heatmap) and, once in the conclusion event, the grid's FINAL column only — the
 * one set of eight numbers that closes the ranking the reader has watched build.
 */

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
} from "#shared/chart-video/timing.ts";
import {
  assertTypeFloor,
  frameInsetFor,
  sizeFor,
} from "#shared/chart-video/sizes.mjs";
import { formForSize } from "#shared/chart-beat/type-at-size.mjs";
import { HEATMAP_TIMING } from "./timing-contract";

export const FONT_FAMILY = "Helvetica, Arial, sans-serif";

/** The chart type this beat draws, in `references/types/` vocabulary. Read by `formForSize`. */
const TYPE = "heatmap";

/**
 * THE 900x560-CONVENTION BASE, WITH THE ROW'S `typeScale` AS THE MULTIPLIER.
 *
 * There is no `const FRAME` any more. It said `1080 x 1080` here while `Root.tsx` said
 * `width={1080} height={1080}` two files away, with nothing between them, so `size: portrait` on
 * the slot produced a square in silence (`specs/W4-export-sizes.md` §1a).
 *
 * Every spacing number goes through `sp`, not only the fonts — the gap that separates one cell from
 * the next, and the legend bar's own width and height, which are marks and not type but are just as
 * much 1080-square tuning.
 *
 * The base numbers are the old 1080-square values re-expressed at the convention the table's
 * `typeScale` is written against — smallest token 12, so the row's multiplier lands the smallest
 * drawn type exactly on that row's legibility floor. The old values did not clear it: the column
 * headers and the printed cell values were 16px on a 1080 frame, 5.3 CSS px on the phone a square
 * post is read on.
 */
const BASE = {
  TITLE: { fontSize: 27, fontWeight: 700, lead: 33 },
  SOURCE: { fontSize: 14, fontWeight: 400 },
  LEGEND_TITLE: { fontSize: 15, fontWeight: 600 },
  LEGEND_LABEL: { fontSize: 14, fontWeight: 500 },
  ROW_LABEL: { fontSize: 16, fontWeight: 500 },
  ROW_LABEL_ACCENT: { fontSize: 16, fontWeight: 700 },
  COL_LABEL: { fontSize: 12, fontWeight: 500 },
  CELL_VALUE: { fontSize: 12, fontWeight: 700 },
  CAPTION: { fontSize: 16, fontWeight: 600 },
  CELL_GAP: 3,
  LEGEND_BAR: { width: 315, height: 15 },
  TITLE_TO_LEGEND: 30,
  LEGEND_TITLE_TO_BAR: 26,
  LEGEND_LABEL_LIFT: 8,
  BAR_TO_COL_LABEL: 33,
  COL_LABEL_TO_PLOT: 12,
  CAPTION_LIFT: 11,
  CAPTION_BAND: 33,
  SOURCE_AIR: 11,
  ROW_LABEL_AIR: 12,
  ROW_LABEL_INSET: 11,
};

/** Strokes scale but are NOT rounded: a hairline that rounds up stops being a hairline. */
const BASE_STROKE = { cell: 0.4, subject: 1.6 };

function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  const st = (v: number) => Number((v * typeScale).toFixed(2));
  const f = <T extends { fontSize: number; lead?: number }>(tok: T) => ({
    ...tok,
    fontSize: sp(tok.fontSize),
    ...(tok.lead === undefined ? {} : { lead: sp(tok.lead) }),
  });
  return {
    TITLE: f(BASE.TITLE) as typeof BASE.TITLE,
    SOURCE: f(BASE.SOURCE) as typeof BASE.SOURCE,
    LEGEND_TITLE: f(BASE.LEGEND_TITLE) as typeof BASE.LEGEND_TITLE,
    LEGEND_LABEL: f(BASE.LEGEND_LABEL) as typeof BASE.LEGEND_LABEL,
    ROW_LABEL: f(BASE.ROW_LABEL) as typeof BASE.ROW_LABEL,
    ROW_LABEL_ACCENT: f(BASE.ROW_LABEL_ACCENT) as typeof BASE.ROW_LABEL_ACCENT,
    COL_LABEL: f(BASE.COL_LABEL) as typeof BASE.COL_LABEL,
    CELL_VALUE: f(BASE.CELL_VALUE) as typeof BASE.CELL_VALUE,
    CAPTION: f(BASE.CAPTION) as typeof BASE.CAPTION,
    CELL_GAP: sp(BASE.CELL_GAP),
    LEGEND_BAR: {
      width: sp(BASE.LEGEND_BAR.width),
      height: sp(BASE.LEGEND_BAR.height),
    },
    TITLE_TO_LEGEND: sp(BASE.TITLE_TO_LEGEND),
    LEGEND_TITLE_TO_BAR: sp(BASE.LEGEND_TITLE_TO_BAR),
    LEGEND_LABEL_LIFT: sp(BASE.LEGEND_LABEL_LIFT),
    BAR_TO_COL_LABEL: sp(BASE.BAR_TO_COL_LABEL),
    COL_LABEL_TO_PLOT: sp(BASE.COL_LABEL_TO_PLOT),
    CAPTION_LIFT: sp(BASE.CAPTION_LIFT),
    CAPTION_BAND: sp(BASE.CAPTION_BAND),
    SOURCE_AIR: sp(BASE.SOURCE_AIR),
    ROW_LABEL_AIR: sp(BASE.ROW_LABEL_AIR),
    ROW_LABEL_INSET: sp(BASE.ROW_LABEL_INSET),
    STROKE: {
      cell: st(BASE_STROKE.cell),
      subject: st(BASE_STROKE.subject),
    },
  };
}

/**
 * Every `fontSize` the returned element tree actually carries, INCLUDING one written bare at a mark.
 * The still path reads the rendered SVG's `font-size` attributes; a video composition's markup only
 * exists inside the browser Remotion drives, so the equivalent reading is the element tree.
 */
function fontSizesIn(node: unknown, out: number[] = []): number[] {
  if (Array.isArray(node)) {
    for (const child of node) fontSizesIn(child, out);
    return out;
  }
  if (!node || typeof node !== "object") return out;
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return out;
  if (typeof props.fontSize === "number") out.push(props.fontSize);
  fontSizesIn(props.children, out);
  return out;
}

export type CountryRow = {
  country: string;
  values: number[]; // one per entry of `years`, same index alignment
};

/**
 * The rendered width of a string in the font it will really be drawn in — this story's own copy
 * of the video genre's browser-Canvas text measurer (see the file doc-comment for why it is
 * duplicated, not imported from a sibling workspace or a skill).
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

/** Whole-percent, no decimal — every label in this beat is a share of electricity, 0–100. */
export function pct(value: number): string {
  return `${Math.round(value)}%`;
}

// ── Colour: a real, checkable sequential ramp, not a hand-picked list. ─────────────────────────

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function srgbToLinear(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mixHex(a: string, b: string, t: number): string {
  const ca = channels(a);
  const cb = channels(b);
  const rgb = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/**
 * The ramp's two anchors, derived from the newsroom's ground and this beat's accent hue —
 * verified sequential by `ramp.test.ts` rather than eyeballed.
 *
 * LOW escalates a ground→accent mix (the same shape of loop `deriveFurniture` uses for `muted`,
 * targeting the type doctrine's 3:1 non-text floor instead of 4.5:1 text floor) until it clears
 * 3:1 against the REAL ground — the dark-canvas trap generalised: the palest ramp stop must not
 * blend into whatever ground it is actually drawn on, light or dark.
 *
 * HIGH pushes the accent 60% of the way to black, which is unconditionally darker than LOW on
 * every channel by construction. That is what guarantees the whole ramp is monotonic, not just
 * its two ends: sRGB-to-linear decoding is monotonic increasing in each channel, so a straight
 * per-channel interpolation between two colours whose channels each move the same direction
 * (every LOW channel ≥ the matching HIGH channel here) produces a luminance that also moves in
 * that one direction at every intermediate `t`.
 */
export function rampAnchors(
  ground: string,
  accent: string,
): { low: string; high: string } {
  let low = accent;
  for (let step = 1; step <= 200; step++) {
    const candidate = mixHex(ground, accent, step / 200);
    if (contrastRatio(candidate, ground) >= 3.0) {
      low = candidate;
      break;
    }
  }
  const high = mixHex(accent, "#000000", 0.6);
  return { low, high };
}

/** `t` (0..1) to a rendered ramp colour. Pure — no colour named outside `rampAnchors`. */
export function rampColor(t: number, low: string, high: string): string {
  return mixHex(low, high, Math.max(0, Math.min(1, t)));
}

/** A data value to the ramp's 0..1 domain. */
export function valueToT(
  value: number,
  domainMin: number,
  domainMax: number,
): number {
  if (domainMax === domainMin) return 0;
  return (value - domainMin) / (domainMax - domainMin);
}

/** Per-cell text colour: whichever pole measures higher contrast against THIS cell's OWN
 *  rendered fill — never a single global ink choice (the type doctrine's named trap: a label
 *  that is ink everywhere vanishes against the darkest cells). */
export function textOnCell(cellHex: string): string {
  return contrastRatio("#000000", cellHex) >= contrastRatio("#FFFFFF", cellHex)
    ? "#000000"
    : "#FFFFFF";
}

// ── Geometry: data to coordinates. Pure — no colour, no font, no React. A fresh shape: rows and
// columns are both categorical/temporal axes with no traced path and no shared origin point. ────

export function heatmapGeometry(
  rowCount: number,
  colCount: number,
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
  const colWidth = (plot.right - plot.left) / colCount;
  const rowHeight = (plot.bottom - plot.top) / rowCount;
  const colX = Array.from(
    { length: colCount },
    (_, j) => plot.left + colWidth * j,
  );
  const rowY = Array.from(
    { length: rowCount },
    (_, i) => plot.top + rowHeight * i,
  );
  return { plot, colWidth, rowHeight, colX, rowY };
}

/**
 * How far through column `j`'s own arrival window the master `reveal` progress is, 0..1.
 *
 * The x axis is time (years), so columns are spaced strictly LINEARLY across the reveal window —
 * no easing on their START positions, which is what keeps every year on screen for the same
 * fraction of the build (`motion-grammar.md`: easing a time axis's traversal is a lie about the
 * data's pace). Each window overlaps the next slightly so the cascade reads as one continuous
 * fill moving left to right, not nine discrete steps.
 */
function colWindow(j: number, colCount: number) {
  const span = 1 / colCount;
  const start = j * span;
  const duration = span * 1.7;
  return { start, end: Math.min(1, start + duration) };
}

export type HeatmapVideoProps = {
  years: number[]; // ascending, chronological
  data: CountryRow[]; // pre-sorted by final-year value, descending — render.mjs's job
  title: string;
  source: string;
  legendTitle: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  subjectCountry: string;
  subjectNote: string;
  /** The export size gate 2c pinned, recorded in this beat's own `BRIEF.md` front matter. */
  size: string;
  timing?: BeatTiming;
};

export function HeatmapVideo({
  years,
  data,
  title,
  source,
  legendTitle,
  ground,
  accent,
  ink,
  muted,
  grid,
  subjectCountry,
  subjectNote,
  size,
  timing = HEATMAP_TIMING,
}: HeatmapVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The frame is the TABLE's, at the size the journalist pinned — never a constant in this file.
  const { width, height, typeScale } = sizeFor(size);
  const PAD = frameInsetFor(size);
  const T = tokens(typeScale);
  const {
    TITLE,
    SOURCE,
    LEGEND_TITLE,
    LEGEND_LABEL,
    ROW_LABEL,
    ROW_LABEL_ACCENT,
    COL_LABEL,
    CELL_VALUE,
    CAPTION,
    CELL_GAP,
    LEGEND_BAR,
  } = T;

  // WHETHER THIS TYPE MAY ENTER THIS SIZE AT ALL — before anything is measured.
  //
  // A heatmap is a MATRIX: eight rows against nine years, and both axes are the argument. It has no
  // twin form — transposing it swaps which variable reads down the frame, which is a different
  // chart, not a rotation of this one — and no aspect range has ever been MEASURED for it at a tall
  // or square frame. `type-at-size.mjs` refuses by default and names the measurement that is
  // missing, rather than returning a grid of long thin cells that clips nothing and collides with
  // nothing.
  const form = formForSize(TYPE, size);
  if (form.verdict !== "as-is")
    throw new Error(
      `vidy-heatmap-renewables-europe: ${TYPE} cannot be drawn at ${size}. ${form.reason}\n` +
        `It ships at landscape.`,
    );

  if (data.length < 2)
    throw new Error(`need at least two rows, got ${data.length}`);
  if (years.length < 2)
    throw new Error(`need at least two columns, got ${years.length}`);
  for (const row of data)
    if (row.values.length !== years.length)
      throw new Error(
        `row ${JSON.stringify(row.country)} has ${row.values.length} values, expected ${years.length}`,
      );
  const subjectIndex = data.findIndex((r) => r.country === subjectCountry);
  if (subjectIndex < 0)
    throw new Error(
      `no row for subject country ${JSON.stringify(subjectCountry)}`,
    );

  const allValues = data.flatMap((r) => r.values);
  const domainMin = Math.min(...allValues);
  const domainMax = Math.max(...allValues);
  const { low: rampLow, high: rampHigh } = rampAnchors(ground, accent);
  const colorFor = (value: number) =>
    rampColor(valueToT(value, domainMin, domainMax), rampLow, rampHigh);

  // ── Layout. Identical at every frame: the build changes what is visible, never where it sits.
  const titleLines = wrap(title, width - PAD * 2, TITLE);
  const titleBaseline = PAD + TITLE.fontSize;
  // THE SOURCE SITS ON THE FRAME'S OWN BOTTOM MARGIN, not under the title — `height - PAD`, the
  // same inset the title hangs off at the top, on the same x. It stays inside the furniture
  // opacity group, so no timing contract moves. See
  // chart-beat/references/static-discipline.md, "The source on the frame's bottom margin".
  const sourceBaseline = height - PAD;
  // The legend keeps the air it always had above it, measured from the LAST TITLE line rather
  // than from the source, which is no longer in the header.
  const legendTitleBaseline =
    titleBaseline + (titleLines.length - 1) * TITLE.lead + T.TITLE_TO_LEGEND;
  const legendBarTop = legendTitleBaseline + T.LEGEND_TITLE_TO_BAR;
  // sits ABOVE the bar, never under the column headers
  const legendLabelBaseline = legendBarTop - T.LEGEND_LABEL_LIFT;
  const colLabelBaseline =
    legendBarTop + LEGEND_BAR.height + T.BAR_TO_COL_LABEL;
  const plotTop = colLabelBaseline + T.COL_LABEL_TO_PLOT;
  // This beat's caption used to own the frame's bottom margin. The credit owns it now, so the
  // caption sits directly above the credit's ink instead — the one place in the video family where
  // the credit displaced something rather than joining an empty margin.
  const captionBaseline = sourceBaseline - SOURCE.fontSize - T.CAPTION_LIFT;

  const maxRowLabelWidth = Math.max(
    ...data.map((r) =>
      Math.max(
        measureText(r.country, ROW_LABEL),
        measureText(r.country, ROW_LABEL_ACCENT),
      ),
    ),
  );

  const padding = {
    top: plotTop,
    right: PAD,
    // Reserves the caption line under the grid, AND the credit under the caption.
    bottom: PAD + T.CAPTION_BAND + SOURCE.fontSize + T.SOURCE_AIR,
    left: PAD + T.ROW_LABEL_AIR + maxRowLabelWidth,
  };

  const g = heatmapGeometry(data.length, years.length, {
    width,
    height,
    padding,
  });
  const rowLabelBaselineOffset = ROW_LABEL.fontSize * 0.32;

  // ── The edit. Six windows, all read off the timing contract — no frame literal below.
  const establish = progressOf(frame, timing.establish);
  const referenceProgress = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const subjectProgress = progressOf(frame, timing.subject);
  const conclusion = progressOf(frame, timing.conclusion);

  // Furniture: title, source, both axes, the empty grid's outlines — one fade, together, then
  // still forever (`motion-grammar.md`: the title is furniture, not a conclusion).
  // The title and the source are on screen at FRAME ZERO, at full opacity, never faded in.
  // Extracting frame 0 from this beat's mp4 returned a completely blank white image — measured,
  // not assumed: `establish` starts at frame 0, so its progress there is exactly 0 and everything
  // gated on it is invisible. Frame 0 is the poster frame a CMS or a social platform pulls as the
  // thumbnail before anyone presses play, and a blank poster frame is a beat that says nothing.
  // Both axes' headers still fade in over `establish` — they are the empty grid the cells will
  // fill, and they have nothing to say before the cells exist.
  const axisOpacity = establish;

  // The reference: the colour legend, growing left to right and then left alone to be read —
  // same device, same pause, every prior beat in this corpus uses for its own reference layer.
  const legendBarWidth = interpolate(
    referenceProgress,
    [0, 1],
    [0, LEGEND_BAR.width],
    {
      easing: Easing.out(Easing.cubic),
    },
  );
  const legendLabelOpacity = interpolate(referenceProgress, [0.55, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // The reveal: columns fill left to right at a strictly linear pace (time axis) — see
  // `colWindow`'s own doc-comment for why no easing touches the column START positions.
  const colOpacity = g.colX.map((_, j) => {
    const w = colWindow(j, g.colX.length);
    return interpolate(reveal, [w.start, w.end], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  });

  // The subject: Iceland's own emphasis, landing once every column (including its own) is
  // already on screen — `subject.start` cannot precede `reveal`'s end, so this is structural.
  // Critically damped, same as every prior beat's landing mark: an outline that overshot would
  // be showing, for a few frames, more emphasis than the finding warrants.
  const subjectSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });
  const outlineOpacity = interpolate(subjectSpring, [0, 1], [0, 1]);
  const highlightOpacity = interpolate(subjectSpring, [0, 1], [0, 0.08]);
  // The row label crossfades from ink to bold accent, gated on the SUBJECT event's own progress
  // (not the master reveal signal) — `motion-grammar.md`'s "a label's reveal gates on its own
  // mark, never on a master clock."
  const labelAccentOpacity = interpolate(subjectProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  // The conclusion: the callout sentence, plus the grid's final-column numbers, one per row.
  const conclusionOpacity = interpolate(conclusion, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });

  const lastCol = years.length - 1;

  const drawing = (
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
        <text
          x={PAD}
          y={sourceBaseline}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {source}
        </text>
      </g>

      {/* Column headers (years) and row headers (countries) — both axes, faded in over
          `establish` rather than present at frame 0, then still. */}
      <g opacity={axisOpacity}>
        {years.map((year, j) => (
          <text
            key={`col-${year}`}
            x={g.colX[j] + g.colWidth / 2}
            y={colLabelBaseline}
            fill={muted}
            fontSize={COL_LABEL.fontSize}
            fontWeight={COL_LABEL.fontWeight}
            textAnchor="middle"
          >
            {year}
          </text>
        ))}
        {data.map((row, i) => (
          <text
            key={`row-${row.country}`}
            x={g.plot.left - T.ROW_LABEL_INSET}
            y={g.rowY[i] + g.rowHeight / 2 + rowLabelBaselineOffset}
            fill={i === subjectIndex && subjectProgress > 0 ? accent : ink}
            fontSize={
              i === subjectIndex && subjectProgress > 0
                ? ROW_LABEL_ACCENT.fontSize
                : ROW_LABEL.fontSize
            }
            fontWeight={
              i === subjectIndex && subjectProgress > 0
                ? ROW_LABEL_ACCENT.fontWeight
                : ROW_LABEL.fontWeight
            }
            textAnchor="end"
          >
            {row.country}
          </text>
        ))}

        {/* The empty grid: outlines only, drawn for the columns whose colour has NOT arrived. A
            cell that has its colour draws ONE node below, carrying both the fill and this same
            outline — never two nodes, one over the other. Drawn as an outline grid under a
            separately-fading fill grid, every cell spent its column's window as a half-opaque
            colour over the ground, reading as a lighter class than the one the ramp assigned it —
            the same defect `map-beat/SKILL.md:194-203` records for a choropleth. */}
        {data.map((row, i) =>
          years.map((year, j) =>
            colOpacity[j] > 0 ? null : (
              <rect
                key={`outline-${row.country}-${year}`}
                x={g.colX[j] + CELL_GAP / 2}
                y={g.rowY[i] + CELL_GAP / 2}
                width={g.colWidth - CELL_GAP}
                height={g.rowHeight - CELL_GAP}
                fill="none"
                stroke={grid}
                strokeWidth={T.STROKE.cell}
              />
            ),
          ),
        )}
      </g>

      {/* The reference: the colour legend, min and max labelled, laid down before any cell has
          a fill and left alone to be read. */}
      {referenceProgress > 0 ? (
        <g>
          <text
            x={PAD}
            y={legendTitleBaseline}
            fill={ink}
            fontSize={LEGEND_TITLE.fontSize}
            fontWeight={LEGEND_TITLE.fontWeight}
          >
            {legendTitle}
          </text>
          <defs>
            <linearGradient id="ramp" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={rampLow} />
              <stop offset="1" stopColor={rampHigh} />
            </linearGradient>
          </defs>
          <rect
            x={PAD}
            y={legendBarTop}
            width={legendBarWidth}
            height={LEGEND_BAR.height}
            fill="url(#ramp)"
          />
          <text
            x={PAD}
            y={legendLabelBaseline}
            fill={muted}
            fontSize={LEGEND_LABEL.fontSize}
            opacity={legendLabelOpacity}
          >
            {pct(domainMin)}
          </text>
          <text
            x={PAD + LEGEND_BAR.width}
            y={legendLabelBaseline}
            fill={muted}
            fontSize={LEGEND_LABEL.fontSize}
            textAnchor="end"
            opacity={legendLabelOpacity}
          >
            {pct(domainMax)}
          </text>
        </g>
      ) : null}

      {/* Iceland's highlight wash, behind its own row — a tint, not a mark. */}
      {highlightOpacity > 0 ? (
        <rect
          x={g.plot.left}
          y={g.rowY[subjectIndex]}
          width={g.plot.right - g.plot.left}
          height={g.rowHeight}
          fill={accent}
          opacity={highlightOpacity}
        />
      ) : null}

      {/* The cells: each takes its ramp colour at its own column's window, at FULL opacity, and
          carries the grid outline itself. A cell is one node — the colour cuts in where the empty
          outline was, so no frame shows a cell in a shade the ramp never assigned. */}
      {data.map((row, i) =>
        years.map((year, j) => {
          if (colOpacity[j] <= 0) return null;
          const value = row.values[j];
          const fill = colorFor(value);
          return (
            <rect
              key={`cell-${row.country}-${year}`}
              x={g.colX[j] + CELL_GAP / 2}
              y={g.rowY[i] + CELL_GAP / 2}
              width={g.colWidth - CELL_GAP}
              height={g.rowHeight - CELL_GAP}
              fill={fill}
              stroke={grid}
              strokeWidth={T.STROKE.cell}
            />
          );
        }),
      )}

      {/* Iceland's row outline — pops on once every column has landed. */}
      {outlineOpacity > 0 ? (
        <rect
          x={g.plot.left}
          y={g.rowY[subjectIndex]}
          width={g.plot.right - g.plot.left}
          height={g.rowHeight}
          fill="none"
          stroke={accent}
          strokeWidth={T.STROKE.subject}
          opacity={outlineOpacity}
        />
      ) : null}

      {/* The conclusion: the grid's final-column numbers, one per row, each in the text colour
          ITS OWN cell's fill picks — never a single global ink. */}
      {data.map((row, i) => {
        const value = row.values[lastCol];
        const fill = colorFor(value);
        return (
          <text
            key={`final-${row.country}`}
            x={g.colX[lastCol] + g.colWidth / 2}
            y={g.rowY[i] + g.rowHeight / 2 + CELL_VALUE.fontSize * 0.32}
            fill={textOnCell(fill)}
            fontSize={CELL_VALUE.fontSize}
            fontWeight={CELL_VALUE.fontWeight}
            textAnchor="middle"
            opacity={conclusionOpacity}
          >
            {pct(value)}
          </text>
        );
      })}

      {/* The conclusion's callout sentence, in the caption gutter reserved under the grid from
          frame 0 — nothing shifts when it lands. */}
      <text
        x={PAD}
        y={captionBaseline}
        fill={ink}
        fontSize={CAPTION.fontSize}
        fontWeight={CAPTION.fontWeight}
        opacity={conclusionOpacity}
      >
        {subjectNote}
      </text>
    </svg>
  );

  // EVERY TYPE SIZE THIS FRAME ACTUALLY DRAWS, against the row's own floor — read off the element
  // tree rather than a list of tokens, so a size written bare at a mark cannot escape it.
  assertTypeFloor(
    fontSizesIn(drawing)
      .map((px) => `font-size="${px}"`)
      .join(" "),
    size,
    { what: `vidy-heatmap-renewables-europe at ${size}` },
  );

  return drawing;
}
