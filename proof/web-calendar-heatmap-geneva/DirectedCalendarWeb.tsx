/**
 * Geneva's daily mean temperature through 2024, drawn as a calendar heatmap THROUGH the design base
 * and delivered as an interactive page.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT THE VALUE UNDER THE POINTER. A still prints ONE streak, because
 * it has one plate and the threshold that defines that streak was chosen by its author. "31 days in
 * a row" is a reading off the data AND a line drawn at 20 °C; move the line and the number moves
 * with it — 78 days at 16 °C, 43 at 18, 31 at 20, 13 at 22, 4 at 24. The reader moves it here, and
 * what they find is in none of the five pictures on its own: the run's END DATE DOES NOT MOVE. At
 * every threshold from 19 to 22 °C the longest run ends on 17 August while its start slides from
 * 14 July to 5 August. Geneva's summer 2024 did not taper, it stopped — and the headline is fragile
 * at one end and anchored at the other.
 *
 * THE RAMP IS THE CHART'S WHOLE QUANTITATIVE CHANNEL, AND THE SHIPPED ONE CARRIED FOUR LEVELS WHILE
 * PRINTING A KEY FOR SEVEN. Each too-pale step used to be lifted independently with
 * `adjustToContrast(step, ground, NON_TEXT_CONTRAST_MIN)` — and two colours calibrated independently
 * onto the same floor against the same ground come out identical by construction. Measured in
 * `rapport`: bins 0 to 3, every reading below 15 °C, adjacent at 1,004 / 1,007 / 1,001 to one. Here
 * the low pole is lifted ONCE and the ramp is interpolated from that pole to the accent, so no two
 * steps can land on the same floor; five bins then spend the whole budget
 * (`contrast(accent, ground)`, 6,64:1 in creme) at a worst adjacent pair of 1,195. A sixth bin drops
 * that to 1,150 for no reading gained, which is `chart-beat`'s "name rather than shade past four or
 * five" arriving as arithmetic.
 *
 * THE POINTER RESOLVES BY CELL, NOT BY COLUMN. Twelve months share every x on this grid, so the
 * shared script's default — nearest by x — would answer confidently and wrongly. The `<svg>` carries
 * `data-hit="cell"`, the opt-in in `chart-web/assets/interaction.mjs` for exactly this shape.
 *
 * `a-sequential-grid-is-one-hue-cluster` — every filled cell is one hue, the direction's own accent,
 * at increasing strength against the direction's ground. No second hue anywhere.
 * `the-key-prints-its-breaks-in-the-data-s-units` — the key names its bins in °C, because a binned
 * cell cannot be read exactly and a reader is owed the width of the bin instead.
 * `a-missing-cell-is-drawn-as-missing` — 31 February and its four siblings are impossible, not
 * absent: they keep the grid rectangular, drawn hollow with the same stroke as every other cell.
 * `the-subject-is-ringed-not-recoloured` — the run is OUTLINED in every state of the control. On
 * this type colour is already carrying the whole quantity; a control that repainted cells would
 * spend the one channel the chart has.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor } from "#shared/design-base/web.mjs";
import {
  assertCutoffDeclaration,
  cutoffCss,
  cutoffChromeCss,
  cutoffOptionsForMarkup,
  cutoffNotesForMarkup,
  cutoffRegionsForMarkup,
  type CutoffDeclaration,
} from "../../skills/chart-web/assets/cutoff.ts";

const CELL = 27;
const GAP = 2.4;
export const FRAME = { width: 31 * CELL, height: 12 * CELL, xAxisRowPx: 26 };

const SCOPE = ".chart-figure";
const CUTOFF_ID_PREFIX = "chart-cutoff";
const REVEAL_MS = 220;
const OUTLINE_PX = 2;
const CASING_PX = 2.5;

export type Day = {
  month: number;
  day: number;
  bin: number;
  detail: string;
};

export type Bin = { from: number | null; to: number | null; label: string };

/** One run of consecutive days inside ONE month row, in calendar coordinates. A run that spans a
 *  month boundary arrives as two of these, because on this grid it IS two blocks on two rows. */
export type Run = { month: number; from: number; to: number };

const pct = (value: number, extent: number) => (value / extent) * 100;

/** A run of days, as the rectangle that outlines it — in the geometry's own units, never in reader
 *  pixels, because this `<svg>` carries `preserveAspectRatio="none"`. */
export function spanOf(run: Run) {
  return {
    x: (run.from - 1) * CELL + GAP / 2 - 1,
    y: (run.month - 1) * CELL + GAP / 2 - 1,
    width: (run.to - run.from + 1) * CELL - GAP + 2,
    height: CELL - GAP + 2,
  };
}

export function DirectedCalendarWeb({
  days,
  bins,
  monthLabels,
  dayTicks,
  claimRuns,
  streakNote,
  cutoff,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  days: Day[];
  bins: Bin[];
  monthLabels: string[];
  dayTicks: number[];
  claimRuns: Run[];
  streakNote: string;
  cutoff: CutoffDeclaration;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  /** ONE HUE CLUSTER, AND THE STEPS ARE TOLD APART. The low pole is lifted to the non-text floor
   *  ONCE; every step is then a mix from that pole toward the accent, so no two can be pinned to the
   *  same floor against the same ground — which is exactly how the shipped ramp's bottom four bins
   *  became one colour (1,001:1 adjacent in `rapport`). */
  const pole = mix(ground, accent, 0.25);
  const low = contrast(pole, ground) < NON_TEXT_CONTRAST_MIN
    ? (adjustToContrast(pole, ground, NON_TEXT_CONTRAST_MIN) ?? pole)
    : pole;
  const ramp = bins.map((_, i) => mix(low, accent, i / (bins.length - 1)));

  /** THE TYPE'S CENTRAL RULE, CHECKED RATHER THAN LOOKED AT. `chart-beat/references/types/
   *  calendar-heatmap.md`: the ramp must move in ONE luminance direction from end to end, checked
   *  stop by stop, and every stop needs real measured contrast against the calendar's actual
   *  background. Nothing else in this tree enforces either half — the shipped seven-bin ramp, whose
   *  bottom four steps measured 1,001:1 apart, rendered green through every guard there is. */
  const againstGround = ramp.map((step) => contrast(step, ground));
  againstGround.forEach((measured, i) => {
    if (measured < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `the calendar's bin ${i} (${ramp[i]}) measures ${measured.toFixed(2)}:1 against the ` +
          `direction's ground ${ground}, under the ${NON_TEXT_CONTRAST_MIN}:1 non-text floor — a ` +
          `bin nobody can see is not a bin, it is the ground, and on this type that is a whole ` +
          `season of readings gone blank`,
      );
    if (i > 0 && !(measured > againstGround[i - 1]))
      throw new Error(
        `the calendar's ramp does not move in one luminance direction: bin ${i - 1} measures ` +
          `${againstGround[i - 1].toFixed(2)}:1 against the ground and bin ${i} measures ` +
          `${measured.toFixed(2)}:1. A ramp a reader decodes by luminance must darken (or lighten) ` +
          `stop by stop, or it is unreadable in greyscale and unreliable for a colour-vision-` +
          `deficient reader`,
      );
  });

  const cellEdge = mix(ground, ink, 0.18);

  /** THE FIVE IMPOSSIBLE CELLS CARRY THEIR OWN STROKE, ON THEIR OWN SHAPE. The quiet edge between
   *  filled cells is a gridline; the dash around 31 February is a READING — "no such date", as
   *  distinct from "a cold day". Derived toward the direction's ink, `cellEdge` measured 1,04:1
   *  against nocturne's ground: pale-toward-a-dark-ground pulls it into the ground, which is this
   *  type's own accessibility trap one element over. Lifted to the non-text floor it measures
   *  3,08 / 3,12 / 3,11 across the three directions. */
  const missingEdge = adjustToContrast(cellEdge, ground, NON_TEXT_CONTRAST_MIN) ?? cellEdge;

  /** THE RUN'S OUTLINE IS CASED, AND THE ARITHMETIC IS WHY. Swept across the whole ink-to-ground
   *  axis, NO flat colour clears the non-text floor against every step of this ramp — the best
   *  possible is 3,08 in creme, 2,96 in rapport and 1,65 in nocturne — because the ramp spans the
   *  luminance range end to end, so any single ink sits close to one of its steps. A casing does
   *  clear it, and by construction rather than by luck: every step is already at or above
   *  3:1 AGAINST THE GROUND (checked above), so a casing drawn IN the ground clears the floor
   *  against every cell it crosses, and the core only has to clear the casing — which is the
   *  ink-against-ground contrast the base already holds at ${TEXT_CONTRAST_MIN}:1. */
  const casing = ground;
  const outline = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const casingWorst = Math.min(...ramp.map((step) => contrast(casing, step)));
  if (casingWorst < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the run's casing measures ${casingWorst.toFixed(2)}:1 against the nearest bin — the outline ` +
        `the whole claim rests on would disappear over part of its own calendar`,
    );
  const coreOnCasing = contrast(outline, casing);
  if (coreOnCasing < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the run's outline measures ${coreOnCasing.toFixed(2)}:1 against its own casing — a cased ` +
        `line the reader cannot separate from its casing is one thick line of nothing`,
    );

  const x = (day: number) => (day - 1) * CELL;
  const y = (month: number) => (month - 1) * CELL;
  const key = new Set(days.map((d) => `${d.month}-${d.day}`));

  // THE CONTROL, REFUSED HERE RATHER THAN LOOKED AT AFTERWARDS: a region off the frame, an option
  // with no sentence, and — this vocabulary's own — two lines that select the same cells.
  assertCutoffDeclaration(cutoff, { width: FRAME.width, height: FRAME.height });
  const cutoffOptions = cutoffOptionsForMarkup(cutoff, CUTOFF_ID_PREFIX);
  const cutoffNotes = cutoffNotesForMarkup(cutoff);
  const cutoffRegions = cutoffRegionsForMarkup(cutoff);

  const css = [
    cutoffChromeCss({ scope: SCOPE }),
    cutoffCss(cutoff, { scope: SCOPE, idPrefix: CUTOFF_ID_PREFIX, revealMs: REVEAL_MS }),
  ].join("\n\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          a filter makes the marks outside its set LEAVE, and on a calendar heatmap the filtered
          dimension IS the encoded one, so narrowing on it would delete the bottom of the ramp. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE KEY, and it names its own breaks. Plain HTML above the grid, at a fixed size: it is
          furniture and must not stretch with the geometry. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0 14px",
          margin: "12px 0 0",
          flex: "0 0 auto",
        }}
      >
        {bins.map((b, i) => (
          <span key={b.label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, background: ramp[i], display: "inline-block", borderRadius: 2 }} />
            {b.label}
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from the outline. Each accessible name CONTAINS its visible one —
          `assertCutoffDeclaration` refuses the declaration otherwise (WCAG 2.5.3). */}
      <fieldset className="chart-cutoff">
        <legend>{cutoff.label}</legend>
        <div className="options">
          {cutoffOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-cutoff"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isClaim}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — the length of the run the chosen line selects,
          its two ends and how many days of the year clear it, revealed by the same `:checked` that
          redraws the outline. Its row is reserved whether or not a line is chosen, so the plot
          underneath never jumps. The claim's own line reveals none, because it is not a comparison:
          it is the claim the title states. */}
      <div className="cutoff-notes" role="status">
        {cutoffNotes.map((note) => (
          <p data-cutoff-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "40px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 40} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {monthLabels.map((label, i) => (
            <span
              key={label}
              className="axis-label y"
              style={{ ...regs.axis, top: `${pct(y(i + 1) + CELL / 2, FRAME.height)}%` }}
            >
              {label}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {/* The impossible cells first: 31 February and its four siblings keep the grid
              rectangular rather than leaving a hole the reader has to interpret. */}
          {Array.from({ length: 12 }, (_, m) => m + 1).flatMap((month) =>
            Array.from({ length: 31 }, (_, d) => d + 1)
              .filter((day) => !key.has(`${month}-${day}`))
              .map((day) => (
                <rect
                  key={`gap-${month}-${day}`}
                  x={x(day) + GAP / 2}
                  y={y(month) + GAP / 2}
                  width={CELL - GAP}
                  height={CELL - GAP}
                  fill="none"
                  stroke={missingEdge}
                  strokeWidth={0.8}
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              )),
          )}

          {days.map((d) => (
            <rect
              key={`${d.month}-${d.day}`}
              x={x(d.day) + GAP / 2}
              y={y(d.month) + GAP / 2}
              width={CELL - GAP}
              height={CELL - GAP}
              fill={ramp[d.bin]}
              stroke={cellEdge}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* EVERY LINE'S RUN, DRAWN ONCE WHERE IT BELONGS — the stylesheet reveals the chosen one.
              Nothing here moves: a CSS transform never updates the `cx`/`cy` `interaction.mjs` read
              at init, so a mark that moved would answer as the mark whose slot it landed in. */}
          {cutoffRegions.flatMap((region) => [
            <rect
              key={`${region.key}-casing`}
              data-cutoff-region={region.key}
              x={region.x}
              y={region.y}
              width={region.width}
              height={region.height}
              fill="none"
              stroke={casing}
              strokeWidth={OUTLINE_PX + CASING_PX}
              vectorEffect="non-scaling-stroke"
            />,
            <rect
              key={region.key}
              data-cutoff-region={region.key}
              x={region.x}
              y={region.y}
              width={region.width}
              height={region.height}
              fill="none"
              stroke={outline}
              strokeWidth={OUTLINE_PX}
              vectorEffect="non-scaling-stroke"
            />,
          ])}

          {days.map((d) => (
            <circle
              key={`hit-${d.month}-${d.day}`}
              className="pt"
              cx={x(d.day) + CELL / 2}
              cy={y(d.month) + CELL / 2}
              r={CELL / 2 - GAP}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={d.detail}
              data-detail={d.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        {/* THE TAKEAWAY, DRAWN UNCONDITIONALLY. No control on this page can take it off: the claim
            is the 20 °C run, and the outline the reader moves is a test OF that claim, never a
            replacement for it (`directed-interaction.md`, rule 5). */}
        <div className="overlay" aria-hidden="true">
          <span
            className="note"
            style={{
              ...regs.annot,
              ...noteAnchor(pct(x(claimRuns[0].from) + CELL / 2, FRAME.width)),
              top: `${pct(y(claimRuns[0].month) - 2, FRAME.height)}%`,
              transform: `${noteAnchor(pct(x(claimRuns[0].from) + CELL / 2, FRAME.width)).transform} translateY(-100%)`,
            }}
          >
            {streakNote}
          </span>
        </div>

        <div className="x-axis">
          {dayTicks.map((d) => (
            <span key={d} className="axis-label x" style={{ ...regs.axis, left: `${pct(x(d) + CELL / 2, FRAME.width)}%` }}>
              {d}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
