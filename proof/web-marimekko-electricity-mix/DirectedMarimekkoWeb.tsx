/**
 * Six European countries' 2024 electricity, drawn as a marimekko THROUGH the design base and
 * delivered as an interactive page: column WIDTH is the country's own generation, column HEIGHT is
 * its mix, so a band's AREA is a real quantity in TWh.
 *
 * WHAT THIS PAGE EARNS, AND IT IS THIS TYPE'S OWN TRAP RATHER THAN A TOOLTIP.
 *
 * A mosaic's cell is a PRODUCT — group size times internal share — and an eye cannot factor a
 * product. Measured on this very plate: Germany's coal tile is 263,5 x 81,5 units and Poland's is
 * 91,4 x 206,4, which is 106,3 TWh against 93,5 — FOURTEEN PER CENT apart, two tiles a reader sees
 * as the same thing. And yet coal is 54,3 % of Poland's mix against 21,4 % of Germany's, a ratio of
 * 2,53, because Germany generates 2,88 times more electricity. The two factors cancelled inside the
 * area, and no amount of labelling gets them back.
 *
 * So the reader is given the only move that does: HOLD ONE OF THE TWO DIMENSIONS STILL. Three native
 * radios plus CSS generated at build time (`assets/hold.ts`) re-scale every column at once — to equal
 * widths, where the height is the share alone; or to equal widths on one absolute scale, where the
 * height is the terawatt-hours themselves, read from a common floor. Both states are honest pictures
 * of the same frozen file, and the reader moves between them as often as they like, which is exactly
 * what a still cannot do and what a video or a scrolly would do once, on the author's schedule.
 *
 * A MARK THAT MOVES IS NOT THE ONE THAT ANSWERS. `interaction.mjs` resolves the pointed mark from
 * `cx`/`cy` read once at initialisation and a CSS transform never changes them, so under a held state
 * the answering layer is taken out of the page entirely (`quiet`, in `hold.ts`) rather than left to
 * answer with a neighbour's name. The mosaic keeps its pointer; the held states answer with the
 * sentence under the control and the figure on the tile.
 *
 * `the-width-dimension-is-named-on-the-plate` — a marimekko has two scales and only one of them is
 * obvious. The width scale is stated in words above the columns and each column prints its own
 * production, because a reader who does not know what width means reads this as a stacked bar with
 * sloppy spacing. The unit is named ONCE in that sentence rather than repeated under six columns:
 * six repetitions of " TWh" are what made the narrowest column's label wider than the column.
 *
 * `a-band-is-named-inside-itself-or-it-is-texture` — a band that can hold its own name carries it,
 * and whether it can is asked of the BAND, at the reader's own width, in every state, by an
 * `@container` whose threshold is derived from the direction's own register. The first build decided
 * it once in viewBox units (`h >= 20 && w >= 70`), which is a decision taken at exactly one reader
 * width: the same 20 units are 28 px on a laptop and 5,8 px on a phone.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { inkOnFill } from "#shared/design-base/web.mjs";
import {
  assertHoldDeclaration,
  holdCss,
  holdFiguresForMarkup,
  holdNotesForMarkup,
  holdOptionsForMarkup,
} from "../../skills/chart-web/assets/hold.ts";
import { stackChromeCss } from "../../skills/chart-web/assets/stack.ts";

export const FRAME = { width: 900, height: 380 };

/** This format's own scope selector, and the radio-id prefix `interaction-plan.ts` discovers a
 *  moving control by — see `hold.ts`'s header on why this vocabulary joins that spelling instead of
 *  inventing a third one. */
const SCOPE = ".chart-figure";
const HOLD_ID_PREFIX = "chart-stack";
/** How long a column takes to reach its held shape. Honoured only under `no-preference`. */
const MOVE_MS = 520;

export type Band = {
  code: string;
  source: string;
  x: number;
  w: number;
  y: number;
  h: number;
  tone: number;
  label: string;
  detail: string;
};

export type Column = {
  code: string;
  name: string;
  x: number;
  w: number;
  twh: string;
};

export function DirectedMarimekkoWeb({
  bands,
  columns,
  hold,
  figureHides,
  tones,
  toneLabels,
  widthNote,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
}: {
  bands: Band[];
  columns: Column[];
  hold: any;
  figureHides: { slug: string; value: string }[];
  tones: number;
  toneLabels: string[];
  widthNote: string;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: (text: string, style: any) => number;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  /** One hue, as many chromas as there are sources, ordered so the darkest is the last band —
   *  nine sources are nine steps of one ramp, never nine hues. */
  const ramp = Array.from({ length: tones }, (_, i) =>
    mix(ground, accent, 0.14 + (i / (tones - 1)) * 0.86),
  );
  const edge = mix(ground, ink, 0.25);
  /**
   * THE KEY'S OWN BOX IS A MARK ON THE GROUND, AND IT IS MEASURED AGAINST THE GROUND.
   *
   * Found by measuring rather than by looking: the first four steps of this ramp sit at 1,24 / 1,48
   * / 1,79 / 2,17 against `creme`'s ground and the first three at 1,31 / 1,73 / 2,36 against
   * `nocturne`'s — all under the 3:1 non-text floor. Inside the plot that is fine, because a band is
   * bounded by the bands above and below it and never by the page; in the KEY each tone is a 13 px
   * square floating on the ground, and at 1,24:1 a reader cannot see that there is a square there at
   * all. The fill is the datum and it stays the datum; what is raised to the floor is the box drawn
   * round it, which is the only part of that swatch whose job is to be seen. The column outlines
   * keep the unfloored `edge`: they are drawn ON the fills, and the six-unit gap of ground between
   * two columns is what separates them.
   */
  const swatchEdge = adjustToContrast(edge, ground, NON_TEXT_CONTRAST_MIN) ?? edge;
  const onBand = (tone: number) =>
    inkOnFill(
      ramp[tone],
      { ink, ground },
      contrast,
      adjustToContrast,
      TEXT_CONTRAST_MIN,
    );

  // ── THE CONTROL, REFUSED BEFORE IT IS DRAWN ──────────────────────────────────────────────────
  // `minWidth` is derived from the plate rather than typed: a held state may not make any column
  // narrower than the narrowest one the mosaic already asks a reader to see. That is this type's own
  // published failure — a variable-width chart whose narrowest unit falls under a few pixels has
  // stopped encoding its second dimension — expressed in the only units that survive a fluid frame.
  const drawn = columns.map((c) => ({ key: c.code, x: c.x, w: c.w }));
  assertHoldDeclaration(hold, drawn, {
    width: FRAME.width,
    minWidth: Math.min(...columns.map((c) => c.w)),
  });
  const holdOptions = holdOptionsForMarkup(hold, HOLD_ID_PREFIX);
  const holdNotes = holdNotesForMarkup(hold);
  const holdFigures = holdFiguresForMarkup(hold);

  // ── THE TWO THRESHOLDS, BOTH DERIVED FROM THE DIRECTION'S OWN REGISTER ───────────────────────
  // The in-tile figure is the `value` register stepped down: a tile is not a gutter and this is the
  // smallest text the plate sets. The line it needs is that size times the register's own leading,
  // which is what the `@container` below asks the TILE for — never a number decided at one width.
  const labelPx = Math.max(
    10,
    Number.parseFloat(regs.value.fontSize as string) - 4,
  );
  const labelLead = Number(regs.value.lineHeight);
  const labelFitsPx = Math.ceil(labelPx * labelLead) + 2;
  const labelFont = String(regs.value.fontFamily)
    .split(",")[0]
    .replace(/"/g, "");
  /** Each tile's own words, measured, rounded up to the pixel, plus one pixel of air either side.
   *  A tile narrower than its own name does not print it; it answers the pointer instead. */
  const labelWidthOf = (text: string) =>
    Math.ceil(
      measure(text, {
        fontSize: labelPx,
        fontWeight: regs.value.fontWeight,
        fontFamily: labelFont,
      }),
    ) + 6;

  const axisPx = Number.parseFloat(regs.axis.fontSize as string);
  const axisLead = axisPx * Number(regs.axis.lineHeight);
  const axisFont = String(regs.axis.fontFamily).split(",")[0].replace(/"/g, "");
  const axisWidthOf = (text: string) =>
    Math.ceil(
      measure(text, {
        fontSize: axisPx,
        fontWeight: regs.axis.fontWeight,
        fontFamily: axisFont,
      }),
    );
  // FOUR LINES AND NOT THE NUMBER 42. Each column label is exactly two lines (its name, then its
  // production) and the labels sit on TWO STAGGERED ROWS — this type's own published fix for column
  // labels touching at narrow widths, which the first build had patched by tightening the leading to
  // 1,05 instead. The leading belongs to the register; the row's height is a layout number, and it is
  // derived from that register rather than typed.
  const xAxisRowPx = Math.ceil(4 * axisLead) + 4;

  const drawnBands = bands.filter((b) => b.h > 0);
  /**
   * A HAIRLINE GETS NO LABEL BOX AT ALL, and the floor is a SHARE rather than a pixel count, which
   * is what makes it survive the fluid frame. The `@container` below answers "does this tile hold
   * its own name at THIS width"; this answers "could it ever", and the two are different questions.
   * `.chart-figure` caps at `100dvh`, so the tallest plot this format ships is around 800 CSS px;
   * 1,5 % of the frame is 5,7 units, which is 12 px there — still under one line of the value
   * register at every direction. A box drawn for a name no reader will ever see is not free: it
   * takes part in the layout and it lands under the pointer. Measured before it was added —
   * `rapport` at 375 px put the label box of France's 0,1 % band across the plot's own top edge,
   * where a pointer rounded to whole pixels falls outside the only element wired to answer.
   */
  const labelledBands = drawnBands.filter((b) => b.h >= FRAME.height * 0.015);
  /** One `@container (max-width: …)` rule per DISTINCT measured width, not per label: fifty-four
   *  tiles carry twenty-odd distinct strings, and a rule per tile would be a rule per tile. */
  const labelWidths = [
    ...new Set(labelledBands.map((b) => labelWidthOf(b.label))),
  ].sort((a, b) => a - b);

  const pct = (value: number, extent: number) => (value / extent) * 100;
  const figureInk = onBand(tones - 1);

  const css = [
    // THE LABEL LAYER'S ONE GEOMETRY RULE, AND IT COVERS ALL THREE STATES. `hold.ts` writes each
    // column's transform onto `[data-col-label]` as four custom properties — two translations
    // already expressed as a percentage of the frame, two pure scales — so a tile's own box is one
    // calc() away in every state instead of one rule per label per option. Under
    // `preserveAspectRatio="none"` the viewBox maps linearly onto this layer's cell in each axis
    // independently, which is what makes the conversion exact at 320 px and at 1600 px.
    `${SCOPE} .overlay .label-box {`,
    `  position: absolute;`,
    `  container-type: size;`,
    `  left: calc((var(--fx-tx) + var(--lx) * var(--fx-sx) / ${FRAME.width / 100}) * 1%);`,
    `  top: calc((var(--fx-ty) + var(--ly) * var(--fx-sy) / ${FRAME.height / 100}) * 1%);`,
    `  width: calc(var(--bw) * var(--fx-sx) / ${FRAME.width / 100} * 1%);`,
    `  height: calc(var(--bh) * var(--fx-sy) / ${FRAME.height / 100} * 1%);`,
    `}`,
    `${SCOPE} .overlay .label-box > .seg-label {`,
    `  position: absolute;`,
    `  left: 50%;`,
    `  top: 50%;`,
    `  transform: translate(-50%, -50%);`,
    `  white-space: nowrap;`,
    `}`,
    // A TILE TOO SHORT FOR ITS OWN LINE DOES NOT PRINT IT, and the reader is not left without it: in
    // the mosaic that tile still answers a pointer, a tap and a Tab with its country, its source, its
    // share, its terawatt-hours and its share of the six.
    `@container (max-height: ${labelFitsPx - 0.01}px) {`,
    `  ${SCOPE} .overlay .label-box > .seg-label { opacity: 0; }`,
    `}`,
    // AND ONE TOO NARROW FOR ITS OWN WORDS DOES NOT PRINT THEM EITHER. The alternative was clipping
    // a number into illegibility, which this type's sheet refuses by name.
    ...labelWidths.flatMap((w) => [
      `@container (max-width: ${w - 0.01}px) {`,
      `  ${SCOPE} .overlay .label-box > .seg-label[data-w="${w}"] { opacity: 0; }`,
      `}`,
    ]),
    // THE FIGURE A HELD STATE PRINTS ON THE TILE IT MEASURES. It rides that tile's own column, so it
    // takes the same transform the tile does and arrives with it rather than after it.
    `${SCOPE} .overlay .hold-figure {`,
    `  position: absolute;`,
    `  left: calc((var(--fx-tx) + var(--lx) * var(--fx-sx) / ${FRAME.width / 100}) * 1%);`,
    `  top: calc((var(--fx-ty) + var(--ly) * var(--fx-sy) / ${FRAME.height / 100}) * 1%);`,
    `  transform: translate(-50%, -50%);`,
    `  white-space: nowrap;`,
    `}`,
    // AND THE TILE'S OWN NAME STEPS ASIDE FOR IT, because the figure already carries that name plus
    // the comparison. Two labels stacked inside one tile is a tile that says one thing twice.
    ...figureHides.map(
      (hide) =>
        `${SCOPE}:has(#${HOLD_ID_PREFIX}-${hide.slug}:checked) .overlay [data-value="${hide.value}"] { opacity: 0; }`,
    ),
    // THE COLUMN LABELS: two lines each, never wrapped, on two staggered rows, and clamped so a
    // centred label cannot hang past the frame at any width. `--lw` is the label's own measured
    // width in CSS pixels, so the clamp is exact rather than an anchor rule guessed per column and
    // per state — the first build carried three anchoring branches and still shipped a document
    // 5 px wider than a 375 px window.
    `${SCOPE} .x-axis .axis-label.x {`,
    `  white-space: nowrap;`,
    `  text-align: center;`,
    `  transform: translateX(-50%);`,
    `  left: clamp(`,
    `    calc(var(--lw) / 2 * 1px),`,
    `    calc((var(--fx-tx) + var(--cx) * var(--fx-sx) / ${FRAME.width / 100}) * 1%),`,
    `    calc(100% - var(--lw) / 2 * 1px)`,
    `  );`,
    `}`,
    `${SCOPE} .x-axis .axis-label.x[data-row="1"] { top: ${Math.round(2 * axisLead)}px; }`,
    // A TILE'S NAME IS CLIPPED TO THE PLOT AND NOT TO THE DOCUMENT. The names are `nowrap` and
    // centred on their own tile, so the ones the `@container` above has already taken away were
    // still four hundred units wide in the layout — measured, they pushed the document 18 px past a
    // 375 px window. Nothing a reader can see is clipped: a name is only drawn when its tile is at
    // least six pixels wider than the name is.
    `${SCOPE} .chart-plot .overlay { pointer-events: none; overflow: hidden; }`,
    // The note row reserves TWO lines and not the chrome's one: both sentences set to two lines at
    // the widths this beat is verified at, and a row that grows when an option is chosen pushes the
    // plot down under the reader's own hand.
    `${SCOPE} .stack-notes { min-height: 3em; }`,
    stackChromeCss({ scope: SCOPE }),
    holdCss(hold, {
      scope: SCOPE,
      idPrefix: HOLD_ID_PREFIX,
      frame: FRAME,
      moveMs: MOVE_MS,
      // THE ANSWERING LAYER. See this file's header and `hold.ts`'s: a mark that has travelled four
      // hundred units answers with its neighbour's name, so under a held state it answers with
      // nothing at all and leaves the tab order with it.
      quiet: [".hit-area", ".pt"],
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
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          nothing leaves this picture, it is re-scaled. A hold is a third mechanism and pays its way. */}
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

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0 10px",
          margin: "6px 0 2px",
          flex: "0 0 auto",
        }}
      >
        {toneLabels.map((t, i) => (
          <span
            key={t}
            style={{
              ...regs.axis,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 13,
                height: 13,
                background: ramp[i],
                display: "inline-block",
                borderRadius: 2,
                border: `1px solid ${swatchEdge}`,
              }}
            />
            {t}
          </span>
        ))}
      </div>
      <p
        className="chart-caveat"
        style={{ ...regs.annot, margin: "0 0 4px", flex: "0 0 auto" }}
      >
        {`${widthNote} ${claimNote}`}
      </p>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it. Each
          accessible name CONTAINS its visible one — `assertHoldDeclaration` refuses the declaration
          otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-stack">
        <legend>{hold.label}</legend>
        <div className="options">
          {holdOptions.map((option) => (
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

      {/* THE SENTENCE THE CONTROL OWES THE READER, revealed by the same `:checked` that re-scales the
          columns. Its row is reserved whether or not an option is chosen, so the plot underneath
          never jumps. The untouched option reveals none, because it is not a comparison: it is the
          claim the title states. */}
      <div className="stack-notes" role="status">
        {holdNotes.map((note) => (
          <p data-stack-note={note.slug} key={note.slug}>
            {note.text}
          </p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${xAxisRowPx}px`,
          aspectRatio: `${FRAME.width} / ${FRAME.height + xAxisRowPx}`,
        }}
      >
        <div className="y-axis" />
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
          <rect
            x={0}
            y={0}
            width={FRAME.width}
            height={FRAME.height}
            fill={ground}
          />

          {/* ONE GROUP PER COLUMN, and that is what the control acts on. The bands inside keep their
              own absolute coordinates, so the transform composes with nothing and the declaration's
              numbers are the numbers in the file. */}
          {columns.map((c) => (
            <g key={c.code} data-col={c.code}>
              {drawnBands
                .filter((b) => b.code === c.code)
                .map((b) => (
                  <rect
                    key={`${b.code}-${b.source}`}
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    fill={ramp[b.tone]}
                    stroke={ground}
                    strokeWidth={0.8}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              <rect
                x={c.x}
                y={0}
                width={c.w}
                height={FRAME.height}
                fill="none"
                stroke={edge}
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          {/* THE ANSWERING LAYER, OUTSIDE EVERY GROUP ON PURPOSE. It is the mosaic's own reading and
              it is resolved from these coordinates; under a held state `hold.ts` takes it out of the
              page rather than let it answer for a tile that is no longer there. */}
          {drawnBands.map((b) => (
            <circle
              key={`hit-${b.code}-${b.source}`}
              className="pt"
              cx={b.x + b.w / 2}
              // THE HIT POINT IS HELD INSIDE THE PLOT, and the number is small because the defect
              // is. The topmost band of a column whose share rounds to nothing centres its point
              // 0,19 units below the frame's top edge; at 375 px that is 0,03 CSS px, so a pointer
              // rounded to whole pixels lands ABOVE the `.hit-area` — the only element wired to
              // answer — and the reading never appears. Measured on `rapport` at 375 px: the SVG's
              // top was 425,30 and the point's own centre 425,35, which rounds to 425. One and a
              // half units is a quarter of a pixel there and two pixels at 1280, and it preserves
              // every band's order under `nearestCell`: this band's neighbour centres at 2,19.
              cy={Math.min(Math.max(b.y + b.h / 2, 1.5), FRAME.height - 1.5)}
              r={Math.max(3, Math.min(b.w, b.h) / 2)}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={b.detail}
              data-detail={b.detail}
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
          {labelledBands.map((b) => (
            <span
              key={`l-${b.code}-${b.source}`}
              className="label-box"
              data-col-label={b.code}
              style={{
                ["--lx" as string]: String(b.x),
                ["--ly" as string]: String(b.y),
                ["--bw" as string]: String(b.w),
                ["--bh" as string]: String(b.h),
              }}
            >
              <span
                className="seg-label"
                // THE FORMAT'S OWN ATTRIBUTE FOR "a figure printed inside its own mark", and it is
                // what tells `verify-web.mjs` that this word's absence is the tile's answer and not
                // a word removed from the argument. The plot's height in CSS pixels is not a
                // function of its width, so which tiles can hold their own name is a question only
                // the reader's browser can answer — which is what the `@container` above asks.
                data-fits-its-mark=""
                data-value={`${b.code}-${b.source}`}
                data-w={String(labelWidthOf(b.label))}
                style={{
                  ...regs.value,
                  fontSize: `${labelPx}px`,
                  color: onBand(b.tone),
                }}
              >
                {b.label}
              </span>
            </span>
          ))}

          {holdFigures.map((figure) => (
            <span
              key={`f-${figure.slug}`}
              className="hold-figure"
              data-stack-total={figure.slug}
              data-col-label={figure.col}
              style={{
                ...regs.value,
                fontSize: `${labelPx}px`,
                // THE INK GOES INLINE, NEXT TO THE SPREAD THAT WOULD OTHERWISE BEAT IT. `regs.value`
                // carries its own `color`, and an inline style beats every selector there is — the
                // first build set this figure's colour in the generated rule and shipped it in the
                // register's ink, which on this plate is a mid blue over the darkest tile on the
                // page. The one measured against that tile's own fill is the only one that reads.
                color: figureInk,
                ["--lx" as string]: String(figure.lx),
                ["--ly" as string]: String(figure.ly),
              }}
            >
              {figure.text}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {columns.map((c, i) => (
            <span
              key={c.code}
              className="axis-label x"
              data-col-label={c.code}
              data-row={String(i % 2)}
              style={{
                ...regs.axis,
                ["--cx" as string]: String(c.x + c.w / 2),
                ["--lw" as string]: String(
                  Math.max(axisWidthOf(c.name), axisWidthOf(c.twh)),
                ),
              }}
            >
              {c.name}
              <br />
              <span style={{ opacity: 0.8 }}>{c.twh}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "8px 0 0" }}>
        {reading}
      </p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
