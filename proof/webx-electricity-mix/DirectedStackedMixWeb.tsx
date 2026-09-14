/**
 * Six countries' 2024 electricity, drawn as 100 %-stacked columns THROUGH the design base and
 * delivered as an interactive page. The `stacked bar` beat of this tree's web format.
 *
 * WHAT THE WEB ADDS, AND IT COMES OUT OF THE TYPE'S OWN TRAP. `references/types/stacked-bar.md` names
 * one thing that goes wrong and this beat's brief has named it since its first build: only the BOTTOM
 * band shares a genuine common reference across columns. Every band above it starts at a
 * country-specific height, so its thickness cannot be compared by eye — Sweden's nuclear against
 * France's is two bars floating at two different altitudes. A still can only suffer that; it has one
 * floor and it has already spent it.
 *
 * So this page lets the reader MOVE THE FLOOR. Choose a band and the six columns rotate until that
 * band rests on the baseline, where its six lengths start from one line and can finally be read off
 * against each other and against the axis. Fossil on the floor puts Poland's 69 % beside Sweden's
 * 1 % on one rule; nuclear on the floor puts France's 68 % beside three countries' zero. Neither
 * comparison exists on the plate, and neither is a number the page prints until the reader asks.
 *
 * NO SCRIPT DOES ANY OF THAT. The control is native radios in a `<fieldset>` plus CSS generated at
 * build time from `chart-web/assets/stack.ts` — `:checked` and `:has()`, the same vocabulary the
 * ranking beat's tower is built with. A `StackedColumn` is a per-member displacement, which is
 * exactly what re-basing is with `dx = 0`. With JavaScript off the control works identically, and
 * with nothing chosen the page IS the plate the static sibling ships.
 *
 * WHY A ROTATION AND NOT A SLIDE, measured before it was written. Aligning six columns on a chosen
 * band's own bottom — the aligned/diverging form — needs `max(below) + max(100 − below)` units of
 * plot, which for both offered bands is 168 units of room for 100 units of data. The untouched
 * plate would then spend two fifths of its height on space it never uses. A cyclic rotation keeps
 * every column exactly 100 units tall and wholly inside the frame, and it preserves the ring
 * (renewables under nuclear under fossil), so "same colour, same series" survives — which a per
 * column re-sort, the thing the type sheet actually refuses, would not.
 *
 * THE FILLS ARE NOT REPAINTED BY THE CONTROL, and that is a declaration this component makes rather
 * than an omission. A tower of one accent steps its neighbours back because the accent IS the thread
 * the reader just built; three bands encoding three CATEGORIES have no such spare channel — stepping
 * twelve of eighteen segments to one neutral would delete the encoding the beat rests on. `stack.ts`
 * takes neither fill and emits no fill rule at all. What the option does instead: it moves the
 * columns, it lights the chosen band's own entry in the legend while the other two step back, it
 * lays a ground seam between the bands it moved, it prints the spread it just made comparable at the
 * top of the tallest of them, and it reveals the sentence that carries both ends of that spread.
 *
 * THIS TYPE'S OTHER TRAP, CLOSED BY MEASUREMENT. A share printed INSIDE a band is a word on a filled
 * mark, so it is measured against THAT FILL and never against the page — `inkOnFill` is the
 * repertoire's own implementation and it is reached for here, because a naive luminance threshold
 * mis-picks white on a mid-toned hue. And whether a band can hold its own figure at all is not a
 * fraction typed into this file: the plot's height in CSS pixels is not a function of its width
 * (`.chart-figure` caps at `100dvh`), so the only thing that can answer it is a SIZE container per
 * segment, asked at the size the reader is actually looking at.
 */

import {
  mix,
  contrast,
  adjustToContrast,
  assertLegible,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { readApart } from "#shared/chart-beat/render-still.mjs";
import { webRegisters, figureVars, inkOnFill, noteAnchor } from "#shared/design-base/web.mjs";
import {
  assertStackDeclaration,
  stackCss,
  stackChromeCss,
  stackNotesForMarkup,
  stackOptionsForMarkup,
  stackTotalsForMarkup,
  type StackDeclaration,
} from "../../skills/chart-web/assets/stack.ts";
import {
  STACK_ORDER,
  rotatedOrder,
  stackedBarGeometry,
  type Country,
  type Segment,
} from "./stacked-bar-geometry.ts";

export const FRAME = { width: 700, height: 400 };

/** This format's own scope selector, and the id prefix the stack's radios take. The two arguments
 *  `stack.ts` refuses to guess, for the reason `filter.ts` refuses to guess them. */
const SCOPE = ".chart-figure";
const STACK_ID_PREFIX = "chart-stack";

/** How much of each country's own column the bar occupies; the remainder is the gap between
 *  columns, half of it reserved at each end so the row sits symmetrically in the frame. */
const BAR_WIDTH_RATIO = 0.72;

/** How far the nuclear band's tint stands off the accent, and how far the fossil band's neutral
 *  stands off the ground. Both MEASURED rather than chosen: at `0.5` for the fossil step — the
 *  value `web-diverging-stacked-electricity` uses for its own two-band split — the nuclear tint and
 *  the fossil neutral fail `readApart` on both light directions (creme 1,27:1 at redmean 97,
 *  rapport 1,27:1 at 73), which is two adjacent bands a reader cannot tell apart. `0.62` clears it
 *  in all three directions and is asserted below rather than trusted. */
const NUCLEAR_TINT = 0.55;
const FOSSIL_STEP = 0.62;

/** What a band becomes under the reader's pointer: a step TOWARD THE INK, which is the one direction
 *  that is correct on a cream ground and on a navy one alike — ink is by definition the pole
 *  furthest from the ground, so the step can only raise the mark's contrast, never lower it.
 *  `0.30` and the `1.12:1` floor are `proof/web-bar-top-emitters-2024`'s own measured numbers; the
 *  weakest of the nine (direction, band) pairs this beat draws is nocturne's renewables at
 *  1,143:1, which is what that floor sits just under. */
const MARK_ACTIVE_STEP = 0.3;
const MARK_ACTIVE_MIN_STEP = 1.12;

/**
 * WHERE THE HIT POINT SITS, and it is neither the top of the column nor its middle.
 *
 * At `y = 0` — the column's own top, which every column shares in every state — half the 5-unit
 * circle falls outside the `viewBox` and is clipped, and a real pointer at the point's own centre
 * then hit-tested the page and not the mark: `verify-web` reported 0 of 6 readings answering at
 * 375 px while all 6 answered at 1280, because the phone's plot is 175 px tall for 400 units and
 * the circle's y-radius comes to 2 px. 8 % of the frame is inside every column at every size this
 * format is verified at, and the answer still rises out of the empty space ABOVE the plot rather
 * than across the middle of the columns it names.
 */
const HIT_Y = FRAME.height * 0.08;

/** How long a column takes to reach its new floor. Honoured only under `prefers-reduced-motion:
 *  no-preference` — `stack.ts` puts the whole transition inside the query rather than overriding it
 *  back, so under `reduce` there is no transition to resolve at all. */
const MOVE_MS = 420;

/** What the runner declares: the words and the arithmetic, with the band named by KEY. WHERE each
 *  segment goes is this component's, because this component is what knows the scale. */
export type RebasePlan = {
  label: string;
  noneLabel: string;
  options: {
    /** The band the reader puts on the floor. */
    band: Segment;
    label: string;
    announce: string;
    note: string;
    /** The spread this option makes readable, in the runner's own words — printed at the top of
     *  the tallest of the six bands it just laid on one line. */
    total: string;
    /** The same spread as a number, so this component can check the words against what it DRAWS.
     *  The runner derives it from the frozen file; the picture is built out of the six columns on
     *  this plate. They must be the same number, and nothing but this says so. */
    spreadPoints: number;
  }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedStackedMixWeb({
  countries,
  bandLabels,
  rebase,
  title,
  eyebrow,
  caveat,
  source,
  reading,
  alt,
  measure,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  /** The six columns, each carrying the two strings this page answers a pointer with — already
   *  sentences, formatted in the runner, because the browser never formats a number here. */
  countries: (Country & { label: string; detail: string })[];
  bandLabels: Record<Segment, string>;
  rebase: RebasePlan;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  reading: string;
  alt: string;
  measure: (text: string, style: Record<string, unknown>) => number;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const named = direction.id ?? "this direction";
  if (countries.length < 2)
    throw new Error(`a stacked bar beat needs at least two columns, got ${countries.length}`);

  // ── THE THREE BANDS, DERIVED FROM THE DIRECTION AND NEVER TYPED ──────────────────────────────
  // One accent, one tint of it, one neutral off the ground: the shape `web-diverging-stacked-
  // electricity` uses for the same subject, because a direction hands a beat ONE accent and
  // `seriesInks` refuses to shade three apart from it on any of the three grounds filed here
  // (it runs out at two). Each is taken to the non-text floor against the ground, so no band is
  // ever a shape the reader has to guess at.
  // ADJUSTED ONLY WHEN IT HAS TO BE. `adjustToContrast` walks a colour 2 % toward a pole even when
  // it already clears the floor, so calling it unconditionally moves a band that was correct — and
  // it moved two of the six here by a step just large enough to make the palette this beat records
  // disagree with the palette it draws. The guard is the assertion below, not the adjustment.
  let nuclear = mix(accent, ground, NUCLEAR_TINT);
  if (contrast(nuclear, ground) < NON_TEXT_CONTRAST_MIN)
    nuclear = adjustToContrast(nuclear, ground, NON_TEXT_CONTRAST_MIN) ?? nuclear;
  let fossil = mix(ground, ink, FOSSIL_STEP);
  if (contrast(fossil, ground) < NON_TEXT_CONTRAST_MIN)
    fossil = adjustToContrast(fossil, ground, NON_TEXT_CONTRAST_MIN) ?? fossil;
  const fills: Record<Segment, string> = { renewables: accent, nuclear, fossil };

  for (const band of STACK_ORDER)
    assertLegible(fills[band], ground, { role: "mark", where: `${named}'s ${band} band` });
  // AND THEY MUST READ APART FROM EACH OTHER, not only from the ground. Three bands touching along
  // two seams is the one place a mark floor says nothing useful: two fills can each clear 3:1 on
  // the page and still be the same colour to the reader who has to tell them apart. `readApart` is
  // the trunk's own predicate for that question (contrast OR redmean distance), and it is what
  // FOSSIL_STEP was raised to satisfy.
  for (let i = 0; i < STACK_ORDER.length; i++)
    for (let j = i + 1; j < STACK_ORDER.length; j++) {
      const [a, b] = [STACK_ORDER[i], STACK_ORDER[j]];
      if (!readApart(fills[a], fills[b]))
        throw new Error(
          `${named} draws ${a} in ${fills[a]} and ${b} in ${fills[b]}, which read as one colour ` +
            `(${contrast(fills[a], fills[b]).toFixed(2)}:1) — a stacked column encodes its ` +
            "categories by fill and by nothing else, so two bands a reader cannot tell apart is " +
            "the encoding gone, not a near miss",
        );
    }

  // The ink each printed share is set in, measured against ITS OWN BAND and never against the page
  // — `inkOnFill` asks which of the direction's two poles reads better on that fill before it
  // adjusts either, which is the step a naive luminance threshold skips.
  const segmentInk = Object.fromEntries(
    STACK_ORDER.map((band) => [
      band,
      inkOnFill(fills[band], { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN),
    ]),
  ) as Record<Segment, string>;

  // What each band takes under the reader's pointer. Asserted in both directions and never
  // adjusted: a step that does not clear the mark floor hides the band, and a step nobody can see
  // is no answer at all.
  const activeInk = Object.fromEntries(
    STACK_ORDER.map((band) => {
      const lifted = mix(fills[band], ink, MARK_ACTIVE_STEP);
      assertLegible(lifted, ground, {
        role: "mark",
        where: `${named}'s ${band} band under the pointer`,
      });
      const step = contrast(lifted, fills[band]);
      if (step < MARK_ACTIVE_MIN_STEP)
        throw new Error(
          `${named}'s ${band} band steps only ${step.toFixed(3)}:1 when a reader points at it ` +
            `(${fills[band]} → ${lifted}), under the ${MARK_ACTIVE_MIN_STEP}:1 this beat holds — ` +
            "the column would answer a pointer with a change nobody can see",
        );
      return [band, lifted];
    }),
  ) as Record<Segment, string>;

  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // ── THE TYPE, AND THE TWO NUMBERS DERIVED FROM IT ────────────────────────────────────────────
  const axisLead =
    Number.parseFloat(regs.axis.fontSize as string) * Number(regs.axis.lineHeight);
  // The names alternate rows, so each has two columns' worth of room at EVERY width — at 375px a
  // column is 48px wide and "Switzerland" measured 62px on one row, printing straight through its
  // neighbour. The stagger is one LINE of the axis register, not a typed multiple of its size: a
  // direction that sets a taller face gets a taller row rather than two rows that touch.
  const xAxisRowPx = Math.ceil(6 + 2 * axisLead + 4);
  /**
   * HOW TALL A BAND MUST BE TO CARRY ITS OWN FIGURE, in CSS pixels, and it is the ONE number a
   * container query decides on rather than the build. One line of the value register plus two
   * pixels, so a printed figure still leaves the seam at each end of its band visible.
   *
   * AND WHY A QUERY AT ALL. The plot's height in CSS pixels is NOT a function of its width:
   * `.chart-figure` carries `max-height: 100dvh` and `.chart-plot` is the one shrinkable item under
   * it, so the same plot measures one height in a short window and another in a tall one. No
   * `@media` and no `@container (inline-size)` can know whether a band holds a figure, and a
   * fraction of the frame frozen at build time — which is what this beat typed before it was
   * directed — is right at one size and wrong at every other.
   */
  const labelFitsPx =
    Math.ceil(
      Number.parseFloat(regs.value.fontSize as string) * Number(regs.value.lineHeight),
    ) + 2;

  const tickValues = [0, 20, 40, 60, 80, 100];
  const tickLabels = tickValues.map((v) => (v === 100 ? `${v} %` : `${v}`));
  // The ONE measurement this format still makes in node: how wide the y-label column must be. A
  // gutter guessed at one direction's axis size clips at another's.
  const yGutterPx =
    Math.ceil(
      Math.max(
        ...tickLabels.map((label) =>
          measure(label, {
            fontSize: Number.parseFloat(regs.axis.fontSize as string),
            fontWeight: regs.axis.fontWeight,
            fontFamily: String(regs.axis.fontFamily).split(",")[0].replace(/"/g, ""),
          }),
        ),
      ),
    ) + 12;

  // ── THE GEOMETRY, AND THE DISPLACEMENT EACH OPTION IS ────────────────────────────────────────
  const groupWidth = FRAME.width / countries.length;
  const barWidth = groupWidth * BAR_WIDTH_RATIO;
  const barGap = groupWidth - barWidth;
  const layout = (order?: Segment[]) =>
    stackedBarGeometry(countries, {
      width: FRAME.width,
      height: FRAME.height,
      padding: { top: 0, right: barGap / 2, bottom: 0, left: barGap / 2 },
      barWidth,
      barGap,
      order,
    });
  const plate = layout();
  const y = (value: number) => FRAME.height - (value / 100) * FRAME.height;
  const colKey = (code: string, band: Segment) => `${code}-${band}`;
  const drawnKeys = [
    ...STACK_ORDER,
    ...countries.flatMap((c) => STACK_ORDER.map((band) => colKey(c.code, band))),
  ];

  /** Where each option prints the spread it made readable: the band index of the tallest of the six
   *  re-based bands, and that band's own top once it sits on the floor. Filled while the geometry
   *  below is derived, never re-derived from the declaration. */
  const spreads = new Map<Segment, { at: number; top: number }>();
  const declaration: StackDeclaration = {
    label: rebase.label,
    noneLabel: rebase.noneLabel,
    options: rebase.options.map((option) => {
      const moved = layout(rotatedOrder(option.band));
      const onto = moved.bars.flatMap((bar, i) =>
        bar.segments.map((segment) => {
          const from = plate.bars[i].segments.find((s) => s.key === segment.key)!;
          return { key: colKey(bar.code, segment.key as Segment), dx: 0, dy: segment.y - from.y };
        }),
      );
      // THE WORDS, CHECKED AGAINST THE PICTURE. The runner derives the spread from the frozen file;
      // the six bands are drawn from the shares this component was handed. Nothing but this line
      // says they are the same number, and a run that silently disagreed would print a figure the
      // reader could measure against the plot and find wrong.
      const values = countries.map((c) => c[option.band]);
      const top = Math.max(...values);
      const drawn = top - Math.min(...values);
      if (Math.abs(drawn - option.spreadPoints) > 0.005)
        throw new Error(
          `the option that puts ${option.band} on the floor prints ${JSON.stringify(option.total)}, ` +
            `from a declared ${option.spreadPoints} points, but the six bands it lays on that line ` +
            `span ${drawn.toFixed(3)} points — the picture and its own caption disagree`,
        );
      spreads.set(option.band, { at: values.indexOf(top), top: y(top) });
      return {
        key: option.band,
        label: option.label,
        announce: option.announce,
        note: option.note,
        total: option.total,
        onto,
      };
    }),
  };
  assertStackDeclaration(declaration, drawnKeys);

  const stackOptions = stackOptionsForMarkup(declaration, STACK_ID_PREFIX);
  const stackNotes = stackNotesForMarkup(declaration);
  const stackTotals = stackTotalsForMarkup(declaration).map((total, at) => {
    const band = declaration.options[at].key as Segment;
    const where = spreads.get(band)!;
    return { ...total, band, at: where.at, top: where.top };
  });

  // THE DEFAULT STATE AS RULES, not as inline styles — see the header of `DirectedColumnsWeb.tsx`
  // for the reason: an inline style beats every selector there is, so a colour written on the
  // element could never be stepped back by the generated option rules.
  const { color: _valueInk, ...valueRest } = regs.value as any;
  const { color: _axisInk, ...axisRest } = regs.axis as any;
  const css = [
    // The share printed inside a band reads its ink off the BAND — one rule, and the custom
    // property is what makes it per-segment without an inline colour.
    `${SCOPE} [data-value] { color: var(--seg-ink); }`,
    `${SCOPE} .overlay .label-box { position: absolute; container-type: size; }`,
    `${SCOPE} .overlay .label-box > .seg-label {`,
    `  position: absolute;`,
    `  left: 50%;`,
    `  top: 50%;`,
    `  transform: translate(-50%, -50%);`,
    `  white-space: nowrap;`,
    `}`,
    // A BAND TOO SHORT FOR ITS OWN FIGURE DOES NOT PRINT IT, and the reader is not left without it:
    // that band still answers its country's hover, tap and Tab with the share to two decimals and
    // the terawatt-hours behind it. What is refused is only a number printed over its own seam.
    `@container (max-height: ${labelFitsPx - 0.01}px) {`,
    `  ${SCOPE} .overlay .label-box > .seg-label { opacity: 0; }`,
    `}`,
    // The spread the option just made readable, at the top of the tallest of the six bands that
    // now share a floor — where the eye makes the comparison. Hidden until its option is chosen, by
    // the same `:checked` that rotates the columns.
    `${SCOPE} .overlay .stack-total { color: var(--accent); }`,
    // The legend is where a stack names its series, so it is the legend that carries `data-axis` —
    // the stack vocabulary's hook for "the name of the thing that moved". The country names under
    // the columns carry none: the columns are the FRAME here, and a frame does not step back.
    `${SCOPE} .chart-legend { flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 6px 20px; margin: 10px 0 0; }`,
    `${SCOPE} .chart-legend [data-axis] { display: inline-flex; align-items: center; gap: 6px; color: var(--ink); }`,
    `${SCOPE} .legend-swatch { width: 12px; height: 12px; flex: 0 0 auto; display: block; }`,
    // What each band takes under the pointer, per band, read by the format's own `.mark-active`.
    ...STACK_ORDER.map(
      (band) => `${SCOPE} [data-mark-band="${band}"] { --mark-active: ${activeInk[band]}; }`,
    ),
    stackChromeCss({ scope: SCOPE }),
    stackCss(declaration, {
      scope: SCOPE,
      idPrefix: STACK_ID_PREFIX,
      // NEITHER FILL IS DECLARED — see the header. The three bands are three categories and the
      // option has no spare channel to repaint them with; `stack.ts` emits no fill rule at all.
      // What `ink` does light is the legend: the chosen band's own entry goes to full ink while the
      // other two step back to muted. The same rule reaches `[data-value]`, where `--seg-ink` is
      // defined on every label box and resolves to the ink already measured against that band —
      // so a share printed inside a fill is never stepped off the contrast it was measured at.
      lit: { ink: "var(--ink)" },
      dim: { ink: "var(--seg-ink, var(--muted))", weight: "var(--legend-weight)" },
      seam: "var(--ground)",
      moveMs: MOVE_MS,
      carry: { width: FRAME.width, height: FRAME.height },
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
        ["--label-ink" as string]: labelInk,
        ["--legend-weight" as string]: String(regs.axis.fontWeight),
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not
          (nothing leaves its picture); a stack is a second mechanism and pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE LEGEND, in HTML rather than SVG: three items in a flex row the browser wraps on its
          own at any width. Each entry carries `data-axis` — the band's NAME — so the option that
          puts a band on the floor lights that band's own entry and steps the other two back. Its
          swatch is an SVG rect and not a coloured box, because `data-col` is a drawn mark in the
          stack vocabulary's sense and a mark is a thing with a fill. */}
      <div className="chart-legend">
        {STACK_ORDER.map((band) => (
          <span key={band} data-axis={band} style={{ ...axisRest }}>
            <svg
              className="legend-swatch"
              viewBox="0 0 12 12"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect data-col={band} x={0} y={0} width={12} height={12} fill={fills[band]} />
            </svg>
            {bandLabels[band]}
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it. Each
          accessible name CONTAINS its visible one — `assertStackDeclaration` refuses the
          declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-stack">
        <legend>{rebase.label}</legend>
        <div className="options">
          {stackOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-stack"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — both ends of the spread it just made readable,
          revealed by the same `:checked` that rotates the columns. Its row is reserved whether or
          not an option is chosen, so the plot underneath never jumps. The untouched option reveals
          none, because it is not a comparison: it is the claim the title states. */}
      <div className="stack-notes" role="status">
        {stackNotes.map((note) => (
          <p data-stack-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: `${yGutterPx}px`,
          ["--x-axis-h" as string]: `${xAxisRowPx}px`,
          aspectRatio: `${yGutterPx + FRAME.width} / ${FRAME.height + xAxisRowPx}`,
        }}
      >
        <div className="y-axis">
          {tickValues.map((value, i) => (
            <span
              key={value}
              className="axis-label y"
              style={{ ...regs.axis, top: `${pct(y(value), FRAME.height)}%` }}
            >
              {tickLabels[i]}
            </span>
          ))}
        </div>

        {/* GEOMETRY ONLY — not one `<text>` element. Every word on this plate is HTML at a fixed
            CSS size over the same grid cell, which is what lets the geometry stretch continuously
            while the type does not. */}
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {tickValues.map((value) => (
            <line
              key={value}
              x1={0}
              x2={FRAME.width}
              y1={y(value)}
              y2={y(value)}
              stroke={value === 0 ? muted : grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* `fill` stays a PRESENTATION ATTRIBUTE and never an inline style: a presentation
              attribute sits below every author rule, which is what lets `.mark-active` repaint a
              band under the pointer without a single `!important`. `vector-effect` keeps the seam
              the option lays between two bands two CSS pixels at every width, under this `<svg>`'s
              own `preserveAspectRatio="none"`.
              THREE VOCABULARIES ON ONE RECT, deliberately: `data-col` is the stack's (what MOVES),
              `data-mark` is the interaction's (what ANSWERS — the COUNTRY, so pointing anywhere in
              a column lights all three of its bands), and `data-mark-band` is this beat's own hook
              for the colour that band takes under the pointer. */}
          {plate.bars.map((bar) =>
            bar.segments.map((segment) => (
              <rect
                key={`${bar.code}-${segment.key}`}
                data-col={colKey(bar.code, segment.key as Segment)}
                data-mark={bar.code}
                data-mark-band={segment.key}
                x={segment.x}
                y={segment.y}
                width={segment.width}
                height={segment.height}
                fill={fills[segment.key as Segment]}
                stroke="none"
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}

          {/* THE HIT POINTS DO NOT MOVE, AND THAT IS WHY THERE IS ONE PER COUNTRY RATHER THAN ONE
              PER BAND. `interaction.mjs` resolves a pointer to the nearest reading by x, off the
              `cx` attributes it reads once at init — which a CSS transform never changes. Eighteen
              points, one per band, would each have gone on answering for the height its band USED
              to be at the moment the reader re-based the stack: a confident wrong answer, which is
              the worst thing an interactive chart can give. The country's band is the frame, the
              frame does not move, and one answer carries all three of its shares — which also means
              a reader never has to land a pointer on a 1 %-tall sliver to read it. */}
          {plate.bars.map((bar, i) => (
            <circle
              key={bar.code}
              className="pt"
              cx={bar.center}
              cy={HIT_Y}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={bar.code}
              aria-label={countries[i].label}
              data-detail={countries[i].detail}
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

        <div className="overlay" aria-hidden="true">
          {/* ONE BOX PER BAND, AND THE BOX IS THE BAND. It stands exactly where the band stands and
              is exactly as tall, so it travels with it under an option (`--stack-dx`/`--stack-dy`,
              in percentages of this layer, which `stack.ts` emits from the same displacement the
              band itself moves by) and so a query about its height is a query about whether that
              band can hold a figure. */}
          {plate.bars.map((bar) =>
            bar.segments.map((segment) => (
              <span
                key={`${bar.code}-${segment.key}`}
                className="label-box"
                data-value={colKey(bar.code, segment.key as Segment)}
                style={{
                  ["--seg-ink" as string]: segmentInk[segment.key as Segment],
                  left: `calc(${pct(segment.x, FRAME.width)}% + var(--stack-dx, 0%))`,
                  top: `calc(${pct(segment.y, FRAME.height)}% + var(--stack-dy, 0%))`,
                  width: `${pct(segment.width, FRAME.width)}%`,
                  height: `${pct(segment.height, FRAME.height)}%`,
                }}
              >
                <span className="seg-label" data-fits-its-mark="" style={{ ...valueRest }}>
                  {Math.round(segment.value)} %
                </span>
              </span>
            )),
          )}

          {/* WHAT THE SIX NOW SHARE A FLOOR FOR, ON THE PICTURE. The sentence under the control
              already says it; this stands at the top of the tallest of the six re-based bands,
              beside the ones it is being compared with, where the eye makes the comparison. */}
          {stackTotals.map((total) => {
            // WHERE IT SITS, AND BOTH HALVES WERE LOOKED AT BEFORE THEY WERE WRITTEN.
            //
            // Horizontally, `noteAnchor` and not a bare `translate(-50%)`: the tallest of six
            // re-based bands is routinely the LAST column — nuclear's is France's, at 92 % of the
            // plot — and a box centred there hangs half of itself off the frame.
            //
            // Vertically, INSIDE the top of that band and not above it. A tower's total has empty
            // plot above it; a re-based band does not, and `translateY(-100%)` put the figure
            // squarely on top of France's own "5 %" in the band above. The band this measures is by
            // construction the tallest of the six (67,7 % of the plot for nuclear, 68,9 % for
            // fossil), so it is the one place on the picture with room. The `.end-label` treatment
            // brings its own ground with it, so the figure is ink on the direction's ground and not
            // ink on a fill. The transform is COMPOSED on the anchor's, never replacing it: a
            // missing transform composes into the string `undefined translateY(4px)`, which
            // browsers drop whole, taking the horizontal anchoring with it.
            const anchor = noteAnchor(pct(plate.bars[total.at].center, FRAME.width));
            return (
              <span
                key={total.slug}
                className="end-label stack-total"
                data-stack-total={total.slug}
                style={{
                  ...valueRest,
                  ...anchor,
                  top: `${pct(total.top, FRAME.height)}%`,
                  transform: `${anchor.transform} translateY(4px)`,
                }}
              >
                {total.text}
              </span>
            );
          })}
        </div>

        {/* The country names, STAGGERED across two rows — see `xAxisRowPx` above for the
            measurement, and `references/web-discipline.md` for why a fix that holds at one width
            and fails at another is the two-rung assumption smuggled back in. No width on the box:
            it is exactly its own text, centred on its column. A box given a column's worth of room
            to wrap inside is what once pushed the first and last labels past the frame's own edges
            and gave the document 102px of horizontal scroll at 1600px. */}
        <div className="x-axis">
          {plate.bars.map((bar, i) => (
            <span
              key={bar.code}
              className="axis-label x"
              style={{
                ...regs.axis,
                left: `${pct(bar.center, FRAME.width)}%`,
                top: `${Math.round(6 + (i % 2) * axisLead)}px`,
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              {bar.name}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
