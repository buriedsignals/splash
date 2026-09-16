/**
 * COAL'S RETREAT ACROSS EUROPE'S TWELVE MOST COAL-DEPENDENT POWER SYSTEMS, 2010-2024, AS AN
 * INTERACTIVE MATRIX — AND THE READER HOLDS THE LINE THE CLAIM WAS WRITTEN AT.
 *
 * THE GESTURE, AND WHY IT IS THIS PLATE'S AND NO OTHER'S. A heatmap spends its ENTIRE quantitative
 * channel on colour: there is no axis anywhere on this plate at which "25 %" lives, so a reader's
 * only frame of reference is a key with bins in it. What that spend makes unreachable is the LINE —
 * the still's author drew one ("more than half", which only Poland still clears) and the grid cannot
 * say what the picture looks like at any other. So the reader is given the line itself
 * (`../../skills/chart-web/assets/cutoff.ts`): 50 %, 25 %, 10 %, 5 %, 2 %, and the grid outlines
 * every cell still above the chosen one.
 *
 * Because the columns are fifteen CONSECUTIVE YEARS, that outline is not a blob. It is a frontier in
 * time — one run per country per line — whose ragged right edge is the year each country crossed,
 * and whose BREAKS are this beat's real finding: at 50 %, at 25 % and at 10 % some country that had
 * already dropped below the line comes back above it. At 5 % none does. Coal's retreat is a slide
 * only once it is nearly over, and that fact lives in the difference between the states.
 *
 * WHY NOT THE NEIGHBOUR'S GESTURE. `references/types/heatmap.md`'s worked example
 * (`proof/web-heatmap-europe-electricity`) reaches for `filter.ts` as a threshold in named bands, so
 * the cells under the floor LEAVE. `cutoff.ts`'s own header refuses exactly that on this type: where
 * the filtered dimension IS the encoded one, narrowing deletes the bottom of the chart's own ramp.
 * And that grid's columns are nine unordered sources, so what survives a floor there is a list;
 * here it is a shape with a right-hand edge, and the edge is the whole answer.
 *
 * WHAT DOES NOT MOVE, each a decision rather than a default:
 *   - the cells never change colour. `cutoff.ts` OUTLINES rather than recolours, and on this plate
 *     that is doctrine, not taste: repainting the selection would spend the only channel there is.
 *   - the ramp and its key do not move. A reader raising the line asks a question ABOUT the scale;
 *     a rescaling ramp would make two states incomparable, which is what a control is for.
 *   - the 2010 and 2024 printed values stay printed in every state. They are the claim.
 *   - the rows keep their 2010 order. Re-sorting per line was refused: the frontier is only legible
 *     because the rows are ordered, and a re-sort would hide the returns the control exists to show.
 *
 * TREATMENTS. It spends `the-cell-value-is-printed-or-the-region-is-named` on both channels at once
 * — the two years the claim names print their own share, and all 180 cells answer with their exact
 * value, their change in points since 2010 and their rank that year. It spends
 * `a-sequential-grid-is-one-hue-cluster`: one hue at six strengths, never six hues, because fifteen
 * years differ in DEGREE and a qualitative palette would say they differ in kind. It REFUSES
 * `order-is-chosen-from-the-answer` in its column form — columns are chronological and nothing may
 * reorder them — and pays for that in the row order instead.
 */

import {
  adjustToContrast,
  assertLegible,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import {
  figureVars,
  inkOnFill,
  webRegisters,
} from "#shared/design-base/web.mjs";
import {
  assertCutoffDeclaration,
  cutoffChromeCss,
  cutoffCss,
  cutoffNotesForMarkup,
  cutoffOptionsForMarkup,
  cutoffRegionsForMarkup,
  type CutoffDeclaration,
} from "../../skills/chart-web/assets/cutoff.ts";

/** The scope every generated rule is written inside, and the prefix every control id carries. */
const SCOPE = ".chart-figure";
const CUTOFF_ID_PREFIX = "chart-cutoff";
const REVEAL_MS = 180;

/** The frame's own proportions, not a rendered pixel cap: the delivered `<svg>` has no width or
 *  height. Fifteen columns wide enough to hold a four-digit year under them, twelve rows tall
 *  enough to hold an eleven-point value inside them. */
const CELL_W = 46;
const CELL_H = 30;
/** The hairline of ground left between cells, so the eye reads discrete cells and not a smear —
 *  the static sibling's own `CELL_GAP`, and the reason a cutoff's outline can sit on the cell
 *  boundary without touching the fill on either side of it. */
const GAP = 1.5;
export const FRAME = {
  width: 15 * CELL_W,
  height: 12 * CELL_H,
  xAxisRowPx: 26,
};
/** The country names' own column. Fixed CSS pixels: it is furniture and must not stretch. */
const Y_GUTTER_PX = 118;

/** What a cell takes under the pointer: its own fill lifted toward the ink by a measured step. A
 *  disc drawn on top of a cell is the wrong affordance on a grid — the reading IS the cell — and a
 *  lift a reader cannot see, or one that lands on the next bin, is a lie about which cell answered. */
const MARK_ACTIVE_STEP = 0.3;
const MARK_ACTIVE_MIN_STEP = 1.12;
/** The deepest the ramp's deep end may reach past the accent, toward this ground's own ink. The
 *  search in the body walks DOWN from here and takes the first carry that holds both floors. */
const DEEP_CARRY_MAX = 0.55;
/** The floor the six bands' worst adjacent pair has to clear, measured in every direction. */
const ADJACENT_MIN_STEP = 1.25;

const pct = (v: number, of: number) => (v / of) * 100;

export type Cell = {
  row: number;
  col: number;
  key: string;
  value: number;
  bin: number;
  /** The share printed inside the cell, or `null` for the thirteen columns that print none. */
  label: string | null;
  detail: string;
};

export function DirectedCoalShareEuropeWeb({
  cells,
  rowLabels,
  colLabels,
  bins,
  cutoff,
  interaction,
  title,
  eyebrow,
  caveat,
  source,
  reading,
  alt,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  cells: Cell[];
  rowLabels: string[];
  colLabels: { text: string; strong: boolean }[];
  bins: { label: string }[];
  cutoff: CutoffDeclaration;
  interaction: unknown;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  reading: string;
  alt: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  void grid;

  // THE COLOUR FLOORS, SEARCHED ON THIS BEAT'S OWN GROUNDS. Nothing here is a number typed from
  // another dataset: the pale end is the LIGHTEST mix from this direction's ground toward its accent
  // that still measures the non-text floor against that ground — `references/types/heatmap.md`'s
  // one accessibility trap is the ramp whose low end fades into its own canvas.
  //
  // AND THE DEEP END REACHES PAST THE ACCENT — BY AS MUCH AS THE POINTER LEAVES ROOM FOR. The first
  // render stopped at the accent itself and was a flat slab: the static sibling's own first defect,
  // reproduced here and caught the same way, by looking. Between the 3:1 floor and the accent there
  // are only 3,02 to 6,64 ratios on creme and 3,01 to 5,84 on rapport, which puts the worst adjacent
  // pair at 1,12:1 — six bands a reader cannot tell apart. Carrying the deep end toward the ink
  // `deriveFurniture` already derives from this ground (the same derivation applied at the other
  // end, no new hue named) buys the range back.
  //
  // But it is not a constant, and the render that tried to make it one is why. On nocturne the ink
  // IS the light pole, so a deep end carried 55 % toward it leaves the darkest cell nowhere to go
  // under the pointer: it lifted 1,071:1, under the floor, and the direction refused. The carry is
  // therefore SEARCHED, deepest first, for the first one where both measurements hold at once —
  // adjacent bands far enough apart to read, and every band with enough headroom left to answer a
  // pointer. Measured: creme 0,40 · rapport 0,45 · nocturne 0,20, three different numbers because
  // they are three different grounds, and none of them transfers to a fourth.
  assertLegible(accent, ground, {
    role: "mark",
    where: `${direction.id ?? "this direction"}'s coal ramp`,
  });
  let paleT = 1;
  for (let step = 1; step <= 100; step++) {
    if (
      contrast(mix(ground, accent, step / 100), ground) >= NON_TEXT_CONTRAST_MIN
    ) {
      paleT = step / 100;
      break;
    }
  }
  const pale = mix(ground, accent, paleT);
  const stopsAt = (carry: number) =>
    bins.map((_, i) =>
      mix(pale, mix(accent, ink, carry), i / (bins.length - 1)),
    );
  const holds = (stops: string[]) => {
    const ratios = stops.map((s) => contrast(s, ground));
    const adjacent = Math.min(...ratios.slice(1).map((r, i) => r / ratios[i]));
    const lift = Math.min(
      ...stops.map((s) => contrast(mix(s, ink, MARK_ACTIVE_STEP), s)),
    );
    return adjacent >= ADJACENT_MIN_STEP && lift >= MARK_ACTIVE_MIN_STEP;
  };
  let ramp: string[] | null = null;
  for (let carry = DEEP_CARRY_MAX; carry >= -1e-9; carry -= 0.05) {
    const stops = stopsAt(Math.max(carry, 0));
    if (holds(stops)) {
      ramp = stops;
      break;
    }
  }
  if (ramp === null)
    throw new Error(
      `no deep end between the accent and ${ground}'s own ink gives this grid's ${bins.length} ` +
        `bands both ${ADJACENT_MIN_STEP}:1 between neighbours and ${MARK_ACTIVE_MIN_STEP}:1 of ` +
        `headroom under the pointer — this direction cannot carry a six-band ramp and says so ` +
        `rather than shipping one a reader cannot use`,
    );
  let last = 0;
  ramp.forEach((stop, i) => {
    const ratio = contrast(stop, ground);
    if (ratio < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `ramp stop ${i} (${stop}) measures ${ratio.toFixed(2)}:1 against ${ground}, under the ` +
          `${NON_TEXT_CONTRAST_MIN}:1 non-text floor — a cell that blends into its own canvas has ` +
          `failed before a reader gets to read it`,
      );
    if (ratio < last - 1e-9)
      throw new Error(
        `ramp stop ${i} (${stop}, ${ratio.toFixed(2)}:1) is lighter than stop ${i - 1} ` +
          `(${last.toFixed(2)}:1) — a sequential ramp whose luminance moves back on itself is not ` +
          `sequential, and this type has no second channel to recover the order from`,
      );
    // MONOTONIC IS NOT ENOUGH, and that is the whole lesson of the first render: a ramp can climb
    // in perfect order and still be one colour to the eye. Six bands is the beat's own count, so
    // the step between neighbours is asserted, not hoped for.
    if (i > 0 && ratio / last < ADJACENT_MIN_STEP)
      throw new Error(
        `ramp stops ${i - 1} and ${i} are ${(ratio / last).toFixed(3)}:1 apart, under the ` +
          `${ADJACENT_MIN_STEP}:1 floor this grid's six bands need — adjacent bands a reader ` +
          `cannot separate make the whole plate one colour`,
      );
    last = ratio;
  });

  const cellEdge = mix(ground, ink, 0.22);
  /** A printed number sits ON its own cell, so it is measured against that cell's own fill, never
   *  against the plate's ground — a luminance threshold standing in for a measurement is the
   *  documented way white lands on a mid-tone at well under 4.5:1. */
  const onCell = (bin: number) =>
    inkOnFill(
      ramp[bin],
      { ink, ground },
      contrast,
      adjustToContrast,
      TEXT_CONTRAST_MIN,
    );
  const hoverOf = (fill: string) => {
    const lifted = mix(fill, ink, MARK_ACTIVE_STEP);
    const step = contrast(lifted, fill);
    if (step < MARK_ACTIVE_MIN_STEP)
      throw new Error(
        `a cell lifts only ${step.toFixed(3)}:1 under the pointer, under the ` +
          `${MARK_ACTIVE_MIN_STEP}:1 floor — a reader cannot see which cell answered`,
      );
    return lifted;
  };

  // THE FRONTIER'S OWN LINE, CASED. It is drawn across cells of every strength, from the palest to
  // the accent itself, so a single stroke colour cannot hold against all of them: the casing is the
  // ground's own pole, the core the ink's, and the pair is measured rather than assumed.
  const outline = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const casing = ground;
  const coreOnCasing = contrast(outline, casing);
  if (coreOnCasing < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the frontier's outline measures ${coreOnCasing.toFixed(2)}:1 against its own casing — a ` +
        `cased line a reader cannot separate from its casing is one thick line of nothing`,
    );

  // THE CONTROL, REFUSED HERE RATHER THAN LOOKED AT AFTERWARDS: a region off the frame, an option
  // with no sentence, an accessible name that does not contain its visible one, and — this
  // vocabulary's own — two lines that select exactly the same cells.
  assertCutoffDeclaration(cutoff, { width: FRAME.width, height: FRAME.height });
  const cutoffOptions = cutoffOptionsForMarkup(cutoff, CUTOFF_ID_PREFIX);
  const cutoffNotes = cutoffNotesForMarkup(cutoff);
  const cutoffRegions = cutoffRegionsForMarkup(cutoff);
  void interaction;

  const css = [
    cutoffChromeCss({ scope: SCOPE }),
    cutoffCss(cutoff, {
      scope: SCOPE,
      idPrefix: CUTOFF_ID_PREFIX,
      revealMs: REVEAL_MS,
    }),
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
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p
          className="chart-eyebrow"
          style={{ ...regs.eyebrow, margin: "0 0 6px" }}
        >
          {eyebrow}
        </p>
        <h2
          className="chart-title"
          style={{ ...regs.display, margin: "0 0 6px" }}
        >
          {title}
        </h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>
          {caveat}
        </p>
      </div>

      {/* THE KEY, WHICH NAMES ITS OWN BREAKS, and sits directly above the control on purpose: the
          key is the frame a cell is measured against and the line is which part of that key the
          reader is outlining. Plain HTML at a fixed size — furniture never stretches. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0 12px",
          margin: "10px 0 0",
          flex: "0 0 auto",
        }}
      >
        {bins.map((b, i) => (
          <span
            key={b.label}
            style={{
              ...regs.axis,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                background: ramp[i],
                display: "inline-block",
                borderRadius: 2,
                border: `1px solid ${cellEdge}`,
              }}
            />
            {b.label}
          </span>
        ))}
      </div>

      {/* THE LINE. Native radios in a real `<fieldset>` with a `<legend>` — a radio group to the
          keyboard and to a screen reader before this page's stylesheet touches them — and the
          redraw is one generated CSS rule per option, so it works identically with the script
          absent. Each accessible name CONTAINS its visible one (WCAG 2.5.3). */}
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

      {/* THE SENTENCE THE LINE OWES A READER WHO IS NOT LOOKING AT THE PICTURE — how many of the
          twelve cleared it in 2010, how many still do, and how many came BACK above it after having
          dropped below. That last number is on no other channel. Its row is reserved in every
          state, so the grid underneath never jumps. The claim's own line reveals none: it is not a
          comparison, it is the claim the title states. */}
      <div className="cutoff-notes" role="status">
        {cutoffNotes.map((note) => (
          <p data-cutoff-note={note.slug} key={note.slug}>
            {note.text}
          </p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${Y_GUTTER_PX}px`,
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + Y_GUTTER_PX} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {rowLabels.map((name, i) => (
            <span
              key={name}
              className="axis-label y"
              style={{
                ...regs.axis,
                top: `${pct(CELL_H * i + CELL_H / 2, FRAME.height)}%`,
              }}
            >
              {name}
            </span>
          ))}
        </div>

        <svg
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={alt}
        >
          <desc>{alt}</desc>

          {cells.map((c) => (
            <rect
              key={c.key}
              x={c.col * CELL_W + GAP / 2}
              y={c.row * CELL_H + GAP / 2}
              width={CELL_W - GAP}
              height={CELL_H - GAP}
              data-mark={c.key}
              style={
                { "--mark-active": hoverOf(ramp[c.bin]) } as React.CSSProperties
              }
              fill={ramp[c.bin]}
              stroke={cellEdge}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* EVERY LINE'S FRONTIER, DRAWN ONCE WHERE IT BELONGS — the stylesheet reveals the chosen
              one's. Nothing here moves: a CSS transform never updates the `cx`/`cy` that
              `interaction.mjs` read at init, so a mark that moved would answer as the mark whose
              seat it landed in. */}
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
              strokeWidth={4}
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
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />,
          ])}

          {cells.map((c) => (
            <circle
              key={`hit-${c.key}`}
              className="pt"
              data-mark-ref={c.key}
              cx={c.col * CELL_W + CELL_W / 2}
              cy={c.row * CELL_H + CELL_H / 2}
              r={Math.min(CELL_W, CELL_H) / 2 - 1}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={c.detail}
              data-detail={c.detail}
            />
          ))}

          <rect
            className="hit-area"
            x={0}
            y={0}
            width={FRAME.width}
            height={FRAME.height}
            fill="transparent"
            pointerEvents="all"
          />
        </svg>

        {/* THE WORDS OVER THE DRAWING: the two columns the claim is about carry their own share,
            positioned by % over this same cell at a FIXED CSS size that never tracks the viewBox. */}
        <div className="overlay" aria-hidden="true">
          {cells
            .filter((c) => c.label !== null)
            .map((c) => (
              <span
                key={`l-${c.key}`}
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(10, Number.parseFloat(regs.value.fontSize as string) - 4)}px`,
                  color: onCell(c.bin),
                  left: `${pct(c.col * CELL_W + CELL_W / 2, FRAME.width)}%`,
                  top: `${pct(c.row * CELL_H + CELL_H / 2, FRAME.height)}%`,
                  transform: "translate(-50%, -50%)",
                  background: "transparent",
                  padding: 0,
                }}
              >
                {c.label}
              </span>
            ))}
        </div>

        <div className="x-axis">
          {colLabels.map((c, i) => (
            <span
              key={c.text}
              className="axis-label x"
              style={{
                ...regs.axis,
                left: `${pct(CELL_W * i + CELL_W / 2, FRAME.width)}%`,
                color: c.strong ? outline : undefined,
                fontWeight: c.strong ? 700 : undefined,
              }}
            >
              {c.text}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>
        {reading}
      </p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
