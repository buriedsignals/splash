/**
 * REPLACE ME. Do not parameterise me.
 *
 * This is not a chart type and it is not a component library. It is the wiring of one static
 * chart beat, written out once so the next one can be written from scratch in the same shape:
 *
 *   pure geometry (numbers only) -> furniture derived from the ground -> direct annotation -> one accent
 *
 * The story that needs a second line, a band, a projection or an annotation writes its own
 * component. Adding a `variant` prop to this file is the failure this seed exists to prevent.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import {
  deriveFurniture,
  measureText,
  FONT_FAMILY,
} from "../scripts/render-still.mjs";
import { frameInsetFor, sizeFor, stageFor } from "../scripts/sizes.mjs";

type Reading = { year: number; value: number | null };
type Padding = { top: number; right: number; bottom: number; left: number };

/**
 * THE 900x560 TOKENS, KEPT AS THE BASE, AND `tokens(typeScale)` IS WHAT A SIZE MULTIPLIES.
 *
 * On "REPLACE ME. Do not parameterise me" above — adding `size` does not violate it, and the
 * distinction is worth writing down. What that header forbids is a `variant` prop that turns one
 * seed into a component library: a variant selects A DIFFERENT CHART. A size selects THE CANVAS
 * THE SAME CHART IS DRAWN ON, and it is an externally recorded decision read out of
 * `STORYBOARD.md` at gate 2c, exactly like the palette this seed already reads. The precedent is
 * `readPalette`, including its failure mode: `sizeFor` throws naming the three it knows rather
 * than defaulting, because a chart drawn at a size nobody chose looks deliberate.
 *
 * EVERY SPACING NUMBER GOES THROUGH `sp`, NOT ONLY THE FONT SIZES. This is the probe's own
 * finding (`proof/static-carbon-footprint-spread/probe/VERDICT.md`) and it cost a rendered
 * collision to learn: the named font constants are not a beat's whole 900x560 tuning. The bare
 * literals inside the layout arithmetic — the gap under the header, the tick-label insets, the
 * end-label air — are tuning too, and scaling the type while leaving them at their literal value
 * collided the title into the subtitle at 1920x1080 by 1634 x 4.5 px. Integers throughout, so
 * `measureText`'s cache keys stay stable.
 */
const BASE = {
  PAD: 40,
  TITLE: { fontSize: 26, fontWeight: 700, lead: 34 },
  SOURCE: { fontSize: 14, fontWeight: 400, lead: 18 },
  AXIS: { fontSize: 13, fontWeight: 400 },
  LABEL: { fontSize: 15, fontWeight: 600 },
  // The note that names a hole in the series. It was a bare `fontSize={12}` at the mark itself,
  // and it survived the first three-size render of this seed as the ONE thing that did not grow:
  // at 1920x1080 it read as a caption printed by mistake. No assertion saw it — it collided with
  // nothing and was clipped by nothing. It was caught by opening the PNG, which is why the
  // discipline says the render is opened and not that the suite is green.
  GAP_NOTE: { fontSize: 12, fontWeight: 400 },
  X_TICK_DROP: 24,
  X_AXIS_TO_SOURCE_GAP: 8,
  HEADER_TO_PLOT: 34,
  END_LABEL_GUTTER: 12,
  END_LABEL_AIR: 10,
  Y_TICK_INSET: 10,
  Y_TICK_BASELINE_NUDGE: 4,
  MARK_BASELINE_NUDGE: 5,
};

export function tokens(typeScale: number) {
  const sp = (v: number) => Math.round(v * typeScale);
  return {
    sp,
    PAD: sp(BASE.PAD),
    TITLE: { ...BASE.TITLE, fontSize: sp(BASE.TITLE.fontSize), lead: sp(BASE.TITLE.lead) },
    SOURCE: { ...BASE.SOURCE, fontSize: sp(BASE.SOURCE.fontSize), lead: sp(BASE.SOURCE.lead) },
    AXIS: { ...BASE.AXIS, fontSize: sp(BASE.AXIS.fontSize) },
    LABEL: { ...BASE.LABEL, fontSize: sp(BASE.LABEL.fontSize) },
    GAP_NOTE: { ...BASE.GAP_NOTE, fontSize: sp(BASE.GAP_NOTE.fontSize) },
    X_TICK_DROP: sp(BASE.X_TICK_DROP),
    X_AXIS_TO_SOURCE_GAP: sp(BASE.X_AXIS_TO_SOURCE_GAP),
    HEADER_TO_PLOT: sp(BASE.HEADER_TO_PLOT),
    END_LABEL_GUTTER: sp(BASE.END_LABEL_GUTTER),
    END_LABEL_AIR: sp(BASE.END_LABEL_AIR),
    Y_TICK_INSET: sp(BASE.Y_TICK_INSET),
    Y_TICK_BASELINE_NUDGE: sp(BASE.Y_TICK_BASELINE_NUDGE),
    MARK_BASELINE_NUDGE: sp(BASE.MARK_BASELINE_NUDGE),
  };
}
/**
 * Two of the tokens above carry a defect in their history and keep it here.
 *
 * `X_TICK_DROP` — how far below the plot's floor an x-axis tick label's BASELINE sits. Named,
 * because two places have to agree about it: the `<text y>` that draws the label, and
 * `padding.bottom`, which reserves room for that label AND for the source line under it. When the
 * source moved to the frame's bottom margin, the first arithmetic kept this as a literal in one
 * place only — and the rendered PNG showed "2016" and "2018" struck through by the source string.
 *
 * `X_AXIS_TO_SOURCE_GAP` — the clear air between the bottom of that label band and the source's
 * own ink.
 */
const UNIT = "mm"; // this story's unit. The next beat's is not mm — it rewrites this file.
/** How many labelled y gridlines a STATIC frame asks for. d3 treats it as a hint and returns the
 *  round values that actually fall inside the fitted range, so the answer is rarely exactly this
 *  number. This is the static format's own density — conventional, so a reader who scrutinises can
 *  put a number on any point — not the sparse 2-3 tick axis the motion format asks for
 *  (`static-discipline.md`, "Axis density"). */
const Y_TICK_HINT = 5;
/** How many x ticks the beat asks `tickStep` for. `tickStep(first, last, hint)` answers with the
 *  nearest 1/2/5×10ⁿ interval to span/hint — the same primitive `.nice()`/`.ticks()` already use
 *  internally — so THIS constant is the only knob, and the resulting interval (a decade on a
 *  75-year series, five years on a 35-year one) is derived per story, never hand-picked
 *  (`static-discipline.md`, "Axis density"). */
const X_TICK_HINT = 6;

/**
 * The fitted vertical scale, and the only place a reading becomes a y coordinate.
 *
 * The scale is fitted to the readings, not anchored at zero. Zero belongs under a mark whose
 * LENGTH carries the value — a bar, a column, an area. A line carries it by slope, so anchoring
 * it at zero when the values sit far above zero flattens the very change the beat is about:
 * rainfall running 604–912 mm on a 0–1000 scale draws a gentle sag under a title that says it
 * fell by a third.
 *
 * `.nice()` rounds the readings' OWN extent outward to the nearest round values and stops there.
 * The arithmetic this replaced padded the extent by 15%, floored it to a step, and then spent a
 * spare step to keep the tick count even — three compounding widenings that on a series running
 * -3.4 to 84.1 produced an axis from -45 to 105, a third of the frame carrying no data at all.
 *
 * Two floors survive that swap, and both come out of d3 rather than being enforced on top of it:
 * a series of positive values never dips below zero (rounding a non-negative floor outward to a
 * multiple of a positive step cannot cross it), and a series that crosses zero always shows the
 * zero line (`zeroY`), because the sign change is the story.
 */
function yScale(data: Reading[]) {
  const values = data
    .map((d) => d.value)
    .filter((v): v is number => v !== null);
  if (values.length === 0)
    throw new Error("a line beat needs a reading to scale against, got none");
  return scaleLinear()
    .domain(extent(values) as [number, number])
    .nice();
}

/**
 * Conventional density for a static frame: d3 picks the round values inside the fitted range, at
 * a hint high enough that a reader who scrutinises the frame can put a number on more than the
 * two or three points a sparser axis would have named. Nothing between the gridlines is invented
 * — every tick is a multiple of a round step that the data's own extent reaches — but there are
 * enough of them to read a value off the axis directly. The unit is stated once, on the top one.
 */
export function yTickValues(data: Reading[], hint: number = Y_TICK_HINT): number[] {
  return yScale(data).ticks(hint);
}

/**
 * LADDER RUNG R2, and it is the only rung that gives budget back without removing anything
 * vertical: fewer labelled gridlines means a narrower y gutter, so the plot gets WIDER, and since
 * a plot's height floor is `plotWidth / maxAspect`, a wider plot has a LOWER floor to clear. The
 * wireframe's own note — "it is always tried before anything is dropped."
 *
 * It fires where the frame is read on a phone, which is what `minTypePx` records: at a 36px floor
 * five labelled ticks on a 1080-tall frame put "650" and "600" 2.7px apart, measured. Andrews &
 * Smrdel's responsive line does the same thing in the same order — labels "progressively removed at
 * equal intervals" — via Horak et al. §2.4.6.
 *
 * Five stays the static format's conventional density wherever the frame is read at arm's length
 * (`static-discipline.md`, "Axis density"). This is not a global sparsening.
 */
export function yTickHintFor(size: string): number {
  return sizeFor(size).minTypePx >= 36 ? 3 : Y_TICK_HINT;
}

/**
 * Regular, round-interval x ticks derived from the series' own span — never a fixed count of
 * arbitrary points, and never `first, middle, last`. `tickStep` answers with the "nice" step
 * closest to span / hint, so a 75-year series gets decade ticks and a 35-year series gets
 * five-year ticks without either number being written down as a knob for this particular story.
 *
 * This density is what makes a point the beat annotates but does not tick — a peak, a crossing —
 * locatable by eye against a regular grid, even though it is not itself one of the round values
 * (`static-discipline.md`, "Axis density"). It is not shared with the motion format, which keeps
 * its own sparse first/middle/last rule on purpose.
 */
/**
 * LADDER RUNG R2 on the other axis, and it is not symmetrical with the y one. A y label is dropped
 * because five of them stack too close vertically; an x label is dropped because at a 36px floor
 * six four-digit years are WIDER than the plot they label. Measured on this seed at 1080x1080:
 * "2016"/"2018" overlapping by 52.9px, and every adjacent pair after it.
 *
 * The step stays derived — `tickStep` still answers with the nearest 1/2/5x10ⁿ interval — so a
 * phone frame gets decade ticks where an article frame got five-year ones, and neither count is
 * hand-picked for a story.
 */
export function xTickHintFor(size: string): number {
  return sizeFor(size).minTypePx >= 36 ? 3 : X_TICK_HINT;
}

export function xTickValues(years: number[], hint: number = X_TICK_HINT): number[] {
  const first = Math.min(...years);
  const last = Math.max(...years);
  if (first === last) return [first];
  const step = tickStep(first, last, hint);
  const values: number[] = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step) {
    values.push(year);
  }
  return values;
}

/**
 * Data to coordinates. Knows no colour, no font and no label — that boundary is what makes it
 * testable and what makes it worth keeping when the rest of this file is thrown away.
 */
export function lineGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
    yTickHint = Y_TICK_HINT,
    xTickHint = X_TICK_HINT,
  }: {
    width: number;
    height: number;
    padding: Padding;
    yTickHint?: number;
    xTickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const years = data.map((d) => d.year);
  const [first, last] = [Math.min(...years), Math.max(...years)];
  // The x domain is the years themselves — first to last, never nicened. Rounding it outward
  // would push the series away from the frame edges and invent time nobody measured.
  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = yScale(data).range([plot.bottom, plot.top]);
  const [floor, ceiling] = y.domain();
  // The hint travels with the call. Reading it off the module constant while the LABELS were
  // measured at a per-size hint is how a gridline and its label stop being the same list.
  const ticks = y.ticks(yTickHint);

  const points = data.map((d) => ({
    year: d.year,
    value: d.value,
    x: x(d.year),
    y: d.value === null ? null : y(d.value),
  }));

  // A missing year ends the run: `defined()` closes the sub-path at the hole and opens a new one
  // after it, so one `d` string carries every run and the line is never drawn across a gap.
  const path =
    line<(typeof points)[number]>()
      .defined((p) => p.y !== null)
      .x((p) => p.x)
      .y((p) => p.y as number)
      .digits(1)(points) ?? "";

  // One note per RUN of missing readings, placed at the midpoint of the readings it separates —
  // not on the missing slot, which on unevenly spaced data is nowhere near the middle of the hole.
  const gaps: { years: number[]; x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    if (points[i].value !== null) continue;
    const start = i;
    while (i + 1 < points.length && points[i + 1].value === null) i++;
    const neighbours = [
      points.slice(0, start).findLast((p) => p.value !== null),
      points.slice(i + 1).find((p) => p.value !== null),
    ].filter((p) => p !== undefined);
    const middle = (pick: (p: (typeof points)[number]) => number) =>
      neighbours.reduce((sum, p) => sum + pick(p), 0) / neighbours.length;
    gaps.push({
      years: points.slice(start, i + 1).map((p) => p.year),
      x: neighbours.length > 0 ? middle((p) => p.x) : points[start].x,
      y:
        neighbours.length > 0
          ? middle((p) => p.y as number)
          : (plot.top + plot.bottom) / 2,
    });
  }

  return {
    plot,
    points,
    path,
    gaps,
    domain: [floor, ceiling] as [number, number],
    end: points.findLast((p) => p.value !== null),
    zeroY: floor < 0 && ceiling > 0 ? y(0) : null,
    ticksY: ticks.map((value) => ({ value, y: y(value) })),
    ticksX: xTickValues(years, xTickHint).map((year) => ({
      year,
      x: x(year),
    })),
  };
}

/** Wrap on the measured width of the real string, never on a character count. */
export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of breakLongTokens(text.split(/\s+/), maxWidth, font)) {
    const joiner = line.endsWith("-") ? "" : " ";
    const trial = line ? `${line}${joiner}${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

/**
 * A WORD WIDER THAN ITS OWN MEASURE, WHICH ONLY A PHONE FRAME PRODUCES.
 *
 * `wrap` breaks between words, so a single token wider than the measure is emitted whole and runs
 * off the frame. At 900x560 that never happened; at 1080 wide with 78px type it happens on the
 * first render — a 30-character hyphenated place name measured 1225px against a 936px measure and
 * drew 219px outside the frame, with no assertion but a real ink box seeing it.
 *
 * Breaking at a HYPHEN is ordinary typography and loses nothing: the hyphen is already there and
 * already reads as a break. So a hyphenated token is split at its own hyphens, each hyphen kept on
 * the line it ends, and `wrap` re-joins without a space after one.
 *
 * A token with no hyphen and no room is EMITTED WHOLE, deliberately, and this is the one place a
 * refusal was written and then taken back out. Two reasons, both measured rather than argued.
 * First, breaking a word mid-syllable is a decision about somebody's name and is not this file's
 * to take. Second, `wrap` is a CARRIED helper — six copies across the static and web families,
 * compared case for case by `splash/test/helper-parity.test.ts` — and a throw is a contract
 * change for all six, including the fluid web frame, where a transient 1px measure during layout
 * is ordinary and must not be fatal. The overflow it would have caught is already refused where it
 * can be SEEN: `three-sizes-no-collision.test.ts` measures every run's real ink box against the
 * frame edge and fails the render.
 */
function breakLongTokens(
  words: string[],
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const out: string[] = [];
  for (const word of words) {
    const pieces = word.split("-");
    if (pieces.length === 1 || measureText(word, font) <= maxWidth) {
      out.push(word);
      continue;
    }
    pieces.forEach((piece, i) =>
      out.push(i < pieces.length - 1 ? `${piece}-` : piece),
    );
  }
  return out;
}

export function ChartSeed({
  data,
  title,
  source,
  alt,
  ground,
  accent,
  subject,
  size,
}: {
  data: Reading[];
  title: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
  size: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const { width, height, typeScale, minTypePx } = sizeFor(size);
  // THE BAND THE BEAT MAY DRAW IN. At landscape and square that is the whole frame. At portrait the
  // platform reserves 14% at the top for its profile row and 35% at the foot for the caption,
  // buttons and progress bar — 979px of the 1920 are ours, and content outside it is at risk of
  // being COVERED rather than clipped, which is why no counter in this project ever saw it.
  const stage = stageFor(size);
  const {
    TITLE,
    SOURCE,
    AXIS,
    LABEL,
    GAP_NOTE,
    X_TICK_DROP,
    X_AXIS_TO_SOURCE_GAP,
    HEADER_TO_PLOT,
    END_LABEL_GUTTER,
    END_LABEL_AIR,
    Y_TICK_INSET,
    Y_TICK_BASELINE_NUDGE,
    MARK_BASELINE_NUDGE,
  } = tokens(typeScale);
  // `tokens()` still exports a type-proportional `PAD` for beats that separate WORDS with it. This
  // seed does not: everything it insets from the frame edge is canvas-proportional. See
  // `frameInset` for the collision that separated the two.
  const INSET = frameInsetFor(size);
  // The two edges everything hangs off. Where the platform reserves a band, ITS edge is the
  // margin — adding our own inset inside a 269px reserve would spend the budget twice.
  const contentTop = stage.reserved ? stage.top : INSET;
  // Named `sourceBottom` because that is what it IS and what the tree's own guard follows
  // (`splash/test/credit-anchors-to-the-frame-bottom.test.ts` reads the chain to its
  // definition rather than trusting the name). At portrait the band's foot is the frame's foot as
  // far as the reader is concerned: below it is the platform's, not ours.
  const sourceBottom = stage.reserved ? stage.bottom : height - INSET;

  // The header is laid out first, because the plot starts where the header stops.
  const titleLines = wrap(title, width - INSET * 2, TITLE);
  const titleBaseline = contentTop + TITLE.fontSize;
  // THE SOURCE SITS ON THE BOTTOM OF THE BAND, not under the title — the same edge the title hangs
  // off at the top, on the same x — so the credit is in a constant place on every graphic this
  // project ships, whatever the header did above it. See references/static-discipline.md, "The
  // source on the frame's bottom margin," for the reversal and the cost it accepts.
  //
  // AND AT PORTRAIT THAT BOTTOM MARGIN IS THE PLATFORM'S, NOT OURS. The seed anchored the credit at
  // `height - PAD`, which on a 1080x1920 story is 1800 — 550px inside the reserve. A
  // COVERED CREDIT IS AN ATTRIBUTION FAILURE, not a cosmetic one, so the credit becomes the last
  // line of the STAGE. `CENTRING-VERDICT.md` left this open; `MOBILE-FIRST-WIREFRAME.md` §3.1
  // settles it in favour of attribution and charges the 36px to the budget.
  const sourceBaseline = sourceBottom;
  // The credit wraps. It was one unwrapped run, which is invisible at 900x560 (a 14px credit fits)
  // and drew 504px outside a 1080 frame the moment the type reached the phone's floor.
  const sourceLines = wrap(source, width - INSET * 2, SOURCE);

  // Both gutters are measured from the widest string that will actually be drawn in them.
  const present = data.filter(
    (d): d is { year: number; value: number } => d.value !== null,
  );
  if (present.length < 2)
    throw new Error(
      "a line beat needs at least two readings, got " + present.length,
    );
  const last = present[present.length - 1];
  // THE END LABEL'S SHORT FORM AT PHONE SIZES, and the probe found this by rendering rather than by
  // reasoning: at 42 frame px a long place name plus its value is ~500px of ink — half the
  // plot's width — laid across the very series it labels. And the subject is already the headline's
  // subject, so naming it twice buys nothing. This is NOT a ladder rung: there is nothing left for
  // a rung to reduce afterwards, so it is the default at those sizes rather than a fallback.
  const endLabel = stage.reserved || minTypePx >= 36
    ? `${last.value} ${UNIT}`
    : `${subject} ${last.value} ${UNIT}`;
  const yHint = yTickHintFor(size);
  const tickLabels = yTickValues(data, yHint).map((v, i, all) =>
    i === all.length - 1 ? `${v} ${UNIT}` : `${v}`,
  );
  const padding = {
    // The plot starts below the LAST HEADER LINE, never below the source — that dependency is what
    // moving the source would otherwise have dragged the whole plot down the frame with it. The
    // header gives back the 26px it used to reserve to separate title from source.
    top: titleBaseline + (titleLines.length - 1) * TITLE.lead + HEADER_TO_PLOT,
    right: INSET + END_LABEL_GUTTER + measureText(endLabel, LABEL),
    // And the floor is DERIVED from where the source now sits, not guessed: the x-axis label band
    // has to end above the source's own ink. Measured, not assumed — the first attempt reserved
    // `PAD + SOURCE.fontSize + 14` (68px, on the argument that a 14px line 40px above the floor
    // mostly fits a reserve that was already there) and the rendered preview showed the source
    // struck straight through "2016" and "2018". 86px is what the frame actually needs.
    // Nothing HORIZONTAL moves in any of this — no measured gutter is re-measured, which is what
    // keeps the change out of the label-collision class this project keeps finding by eye.
    // The reserve is the whole CREDIT BLOCK, not one line of it. A wrapped credit that reserved a
    // single line would put the x-axis labels through its upper lines — the same defect the
    // original arithmetic produced with one line, found the same way, by looking.
    bottom:
      height -
      sourceBaseline +
      SOURCE.fontSize +
      (sourceLines.length - 1) * SOURCE.lead +
      X_TICK_DROP +
      X_AXIS_TO_SOURCE_GAP,
    left:
      INSET +
      Y_TICK_INSET +
      Math.max(...tickLabels.map((label) => measureText(label, AXIS))),
  };

  const { plot, path, gaps, ticksY, ticksX, zeroY, end } = lineGeometry(data, {
    width,
    height,
    padding,
    yTickHint: yHint,
    xTickHint: xTickHintFor(size),
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
          x={INSET}
          y={titleBaseline + i * TITLE.lead}
          fill={ink}
          fontSize={TITLE.fontSize}
          fontWeight={TITLE.fontWeight}
        >
          {line}
        </text>
      ))}
      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={INSET}
          // The LAST line sits on the credit's own baseline, so the block grows UPWARD from a fixed
          // foot. Growing downward would push the credit into the platform's reserve, which is the
          // one place it must never go.
          y={sourceBaseline - (sourceLines.length - 1 - i) * SOURCE.lead}
          fill={muted}
          fontSize={SOURCE.fontSize}
        >
          {line}
        </text>
      ))}

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
            x={plot.left - Y_TICK_INSET}
            y={tick.y + Y_TICK_BASELINE_NUDGE}
            fill={muted}
            fontSize={AXIS.fontSize}
            textAnchor="end"
          >
            {tickLabels[i]}
          </text>
        </g>
      ))}
      {ticksX.map((tick) => (
        <text
          key={tick.year}
          x={tick.x}
          y={plot.bottom + X_TICK_DROP}
          fill={muted}
          fontSize={AXIS.fontSize}
          textAnchor="middle"
        >
          {tick.year}
        </text>
      ))}

      {zeroY === null ? null : (
        <line
          x1={plot.left}
          x2={plot.right}
          y1={zeroY}
          y2={zeroY}
          stroke={muted}
          strokeWidth={1}
        />
      )}

      {gaps.map((gap) => (
        // The break in the line is the fact; this only names it. It sits IN the hole, centred
        // between the readings it separates — a full-height rule would shout louder than the
        // subject, and a dashed bridge across the hole would read as data nobody measured.
        <text
          key={gap.years[0]}
          x={gap.x}
          y={gap.y + MARK_BASELINE_NUDGE}
          fill={muted}
          fontSize={GAP_NOTE.fontSize}
          textAnchor="middle"
        >
          {gap.years.length > 1
            ? `no data ${gap.years[0]}–${gap.years[gap.years.length - 1]}`
            : `no data ${gap.years[0]}`}
        </text>
      ))}

      {/* One path, every run: `defined()` already broke it at the holes. */}
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={end!.x} cy={end!.y as number} r={4} fill={accent} />
      <text
        x={plot.right + END_LABEL_AIR}
        y={(end!.y as number) + MARK_BASELINE_NUDGE}
        fill={accent}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
      >
        {endLabel}
      </text>
    </svg>
  );
}
