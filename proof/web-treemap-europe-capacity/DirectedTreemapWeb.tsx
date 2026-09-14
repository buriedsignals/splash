/**
 * Europe's low-carbon generating capacity, drawn as a squarified treemap THROUGH the design base and
 * delivered as an interactive page the reader can DESCEND INTO.
 *
 * WHAT THE WEB ADDS HERE, and it is the type's own gesture rather than a tooltip on a still.
 *
 * A treemap buys density and sells comparability: two rectangles that are not neighbours cannot be
 * ranked by eye, and the small ones are unlabelled by necessity — driven in a browser on the
 * delivered page, the root view names 23 of 41 countries at 1440 px and 21 at 1280. A still picks
 * one level and stays on it, so the rest stay anonymous for ever. A video or a scrolly can descend,
 * but into the AUTHOR's branch on the AUTHOR's clock, once.
 *
 * So the reader descends. Every station carries a fuel, which makes the continent a hierarchy the
 * plate never draws — Europe, then source, then country — and choosing a source throws the frame
 * away and re-squarifies it over that source alone. Nine countries the root view cannot name are
 * named by descending into it at 1440 px, eleven at 1280. And the accent, which marks the eight
 * countries whose fleet has already tipped to wind and sun, survives the descent: it nearly
 * vanishes inside the atom (5,8 % of the frame) and FLOODS the wind (54,8 %). The headline asserts
 * the tipping; descending shows it.
 *
 * `the-set-a-claim-adds-up-is-drawn-as-a-set` — every country a view holds is drawn in it, including
 * the ones too small to hold a name. A treemap that quietly drops its tail is a pie chart with
 * better manners.
 *
 * `a-narrow-cell-degrades-its-label-rather-than-dropping-it` — name and number where both fit, name
 * where only it fits, the pointer where neither does. DECIDED BY THE CONTAINER, NOT BY THE BUILD:
 * see `cellFitCss` below for the whole reason.
 *
 * `accent-marks-the-thread` — the accent marks the countries the headline is about, not the largest
 * cell, in every view. A treemap's largest cell already shouts by being large.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";
import {
  DESCEND_ROOT_SLUG,
  assertDescendDeclaration,
  descendCellAttrs,
  descendChromeCss,
  descendCss,
  descendLayerAttrs,
  descendNotesForMarkup,
  descendOptionsForMarkup,
  type DescendDeclaration,
} from "../../skills/chart-web/assets/descend.ts";

export const FRAME = { width: 980, height: 480 };

/** This format's own scope selector, and the radio-id prefix `descend.ts` refuses to know about. */
const SCOPE = ".chart-figure";
export const DESCEND_ID_PREFIX = "chart-descend";

/** The label's inset inside its own cell, in CSS pixels. Fixed, like every other piece of furniture
 *  in this format: only geometry stretches. It is also what makes the size container's content box
 *  the box the queries below measure — see `cellFitCss`. */
const CELL_PAD_PX = 5;

/** How coarse the per-cell width thresholds are, in CSS pixels. A name's measured width is rounded
 *  UP to this grid so one rule serves every cell in the same bracket: 137 cells across five views
 *  collapse to a couple of dozen rules, and rounding up can only hide a label EARLIER than it
 *  strictly must, never later. */
const WIDTH_TIER_PX = 6;

export type Cell = {
  key: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tipped: boolean;
  value: string;
  detail: string;
};

export type View = { slug: string; cells: Cell[] };

const pct = (value: number, extent: number) => (value / extent) * 100;
const tier = (px: number) => Math.ceil(px / WIDTH_TIER_PX) * WIDTH_TIER_PX;

/**
 * HOW A CELL DECIDES WHETHER IT CAN HOLD ITS OWN NAME, and why it is a container query rather than
 * a number in the runner.
 *
 * What was here before: `label: c.w > 78 && c.h > 34 ? "full" : …`, decided at build time in VIEWBOX
 * units, plus `lineHeight: 1.1` in the same style object that spread `regs.value`. The literal was
 * not arbitrary — a two-line label set on the register's own leading is taller than 34 viewBox units
 * at most real widths, so it printed out through the bottom of its cell onto its neighbour, and the
 * literal squeezed it back in. But that is a LAYOUT fix wearing the rhythm's lever, and since
 * `78b79c70` it also beat the register the direction emits.
 *
 * Both halves were wrong, and the typed threshold was the worse of the two: THE PLOT'S HEIGHT IN CSS
 * PIXELS IS NOT A FUNCTION OF ITS WIDTH. `.chart-figure` caps at `100dvh` and `.chart-plot` is the
 * one shrinkable item under it, so the same cell measures one height in a short window and another
 * in a tall one, and a fraction of the frame frozen at build time is right at one size and wrong at
 * every other.
 *
 * So the graphic is asked, in the reader's own pixels, one cell at a time — the mechanism
 * `proof/webx-electricity-mix` already proved in this tree for a figure printed inside its own band.
 * Each cell is a size container; the thresholds are the direction's own `leadOf` (`lineHeight x
 * fontSize` on the value register) and the name's own measured width, never a typed number:
 *
 *   - shorter than one line          -> no label at all, the cell answers the pointer instead
 *   - shorter than two lines         -> the name, without its figure
 *   - narrower than its own name     -> no label: a figure with no subject is an assertion with
 *                                      nothing to attach it to (`static-treemap`'s own rule)
 *   - narrower than its own figure   -> the name, without its figure
 *
 * Nothing is clipped and nothing is shrunk. `white-space: nowrap` is safe here — and is the RIGHT
 * lever for the overflow the literal was patching — precisely because the width query is measured
 * against the same one-line width the nowrap produces.
 */
function cellFitCss(lead: number, nameTiers: number[], valueTiers: number[]): string {
  const lines = [
    `${SCOPE} .chart-plot .cell-layer { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }`,
    `${SCOPE} .cell-box {`,
    `  position: absolute;`,
    `  box-sizing: border-box;`,
    `  padding: ${CELL_PAD_PX}px;`,
    `  container-type: size;`,
    `  display: block;`,
    // A LABEL THE QUERIES HAVE ALREADY PUT AT `opacity: 0` STILL TAKES ITS ROOM, and a nowrap name
    // wider than its own cell pushed the DOCUMENT wider than the window at every one of the seven
    // widths this format verifies at (3476px in a 3440px frame, 472px in a 375px one). `container-type:
    // size` contains layout and size, not PAINT, so the box has to say so itself. Nothing visible is
    // clipped by it: a label is only ever drawn when the width query above has found the cell wider
    // than the label's own measured width, and the tier rounds UP, so a drawn label is inside its box
    // by construction. This is the belt to that query's braces, not a substitute for it.
    `  overflow: hidden;`,
    `}`,
    `${SCOPE} .cell-box > span { display: block; white-space: nowrap; }`,
    `${SCOPE} .cell-box > .cell-value { font-weight: 400; }`,
    `/* One line of the value register, and two. The direction's own leading, never a literal. */`,
    `@container (max-height: ${(lead - 0.01).toFixed(2)}px) {`,
    `  ${SCOPE} .cell-box > .cell-name, ${SCOPE} .cell-box > .cell-value { opacity: 0; }`,
    `}`,
    `@container (max-height: ${(2 * lead - 0.01).toFixed(2)}px) {`,
    `  ${SCOPE} .cell-box > .cell-value { opacity: 0; }`,
    `}`,
  ];
  for (const t of nameTiers)
    lines.push(
      `@container (max-width: ${(t - 0.01).toFixed(2)}px) {`,
      `  ${SCOPE} .cell-box[data-wname="${t}"] > .cell-name,`,
      `  ${SCOPE} .cell-box[data-wname="${t}"] > .cell-value { opacity: 0; }`,
      `}`,
    );
  for (const t of valueTiers)
    lines.push(
      `@container (max-width: ${(t - 0.01).toFixed(2)}px) {`,
      `  ${SCOPE} .cell-box[data-wvalue="${t}"] > .cell-value { opacity: 0; }`,
      `}`,
    );
  return lines.join("\n");
}

export function DirectedTreemapWeb({
  views,
  descend,
  tippedNote,
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
  measure,
}: {
  views: View[];
  descend: DescendDeclaration;
  tippedNote: string;
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
  measure: (text: string, font: Record<string, unknown>) => number;
}) {
  // Refused before anything is drawn: a branch that is the root again, one that gains no room, one
  // that draws a key the root never drew, one with no way back, one with no sentence.
  assertDescendDeclaration(descend);

  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // THE TWO FILLS, each calibrated against the direction's own ground and not against each other.
  let neutral = mix(ground, ink, 0.3);
  if (contrast(neutral, ground) < NON_TEXT_CONTRAST_MIN)
    neutral = adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  const lit = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const fillOf = (c: Cell) => (c.tipped ? lit : neutral);

  /**
   * WHAT A CELL BECOMES UNDER THE POINTER, and it is NOT what this format's other beats do.
   *
   * The shared mechanism repaints the mark: `interaction.mjs` puts `.mark-active` on the shape a
   * point names and the stylesheet fills it with `var(--mark-active)`. Every beat in this corpus
   * declares that colour as a measured lift off its own fill. Written that way here, it was wrong
   * twice, and both were looked at rather than reasoned about:
   *
   *   1. `adjustToContrast(mix(fill, ink, 0.4), ground, NON_TEXT_CONTRAST_MIN)` — the corpus's own
   *      shape — measured **1,77:1 / 1,74:1 / 1,20:1** against the fill it was lifting off. On
   *      `nocturne` the thread accent already sits near the ink's lightness, so mixing toward the
   *      ink moves it almost nowhere, and calibrating the result against the GROUND cannot notice.
   *      Two colours calibrated independently against the same floor against the same ground come
   *      out identical by construction; this branch has paid for that twice already.
   *   2. Calibrating the lift against the FILL instead fixed the number and broke the picture. **A
   *      treemap cell's fill IS its group** — here, whether that country has tipped. A lift big
   *      enough to see turned `nocturne`'s mint United Kingdom almost white: the reader pointed at a
   *      cell to ask what it was and the answer repainted it out of its own category. Looked at in
   *      the capture, which is the only place it was ever going to show.
   *
   * So the fill does not move at all, and the ring does the work: a stroke in the cell's OWN label
   * ink, which `inkOnFill` has already measured against that exact fill. No `--mark-active` is
   * declared, because a custom property nothing reads is dead CSS.
   */
  const inkOn = (fill: string) =>
    inkOnFill(fill, { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN);

  // The direction's own line, and the one number every vertical threshold below is derived from.
  // `leadOf` in the trunk is `lineHeight * fontSize`; on the web the register carries the size as a
  // px string and the line as the unitless ratio it must stay.
  const valueSize = Number.parseFloat(regs.value.fontSize as string);
  const lead = valueSize * Number(regs.value.lineHeight);
  const widthOf = (text: string) =>
    measure(text, {
      fontSize: valueSize,
      fontWeight: regs.value.fontWeight,
      fontFamily: String(regs.value.fontFamily).split(",")[0].replace(/"/g, ""),
    });

  const boxes = views.flatMap((view) =>
    view.cells.map((cell) => ({
      view: view.slug,
      cell,
      wname: tier(widthOf(cell.name)),
      wvalue: tier(Math.max(widthOf(cell.name), widthOf(cell.value))),
    })),
  );
  const nameTiers = [...new Set(boxes.map((b) => b.wname))].sort((a, b) => a - b);
  const valueTiers = [...new Set(boxes.map((b) => b.wvalue))].sort((a, b) => a - b);

  const { color: _valueInk, ...valueRest } = regs.value as any;

  const css = [
    // What each cell takes under the pointer, off its own fill. Two rules, because there are two
    // fills — not one rule per cell, and not an inline style, which would beat every selector.
    // THE RING, and it is the whole highlight. The `fill` is restated so the format's own
    // `.mark-active { fill: var(--mark-active, var(--muted)) }` cannot repaint a cell muted and lose
    // its group; the stroke is the cell's own label ink, measured against that exact fill — the
    // direction's raw ink drawn on `nocturne`'s mint thread measured 1,63:1, a ring nobody sees,
    // while the label sitting inside the same cell was already at 10,93:1. One measurement, two
    // users. `vector-effect` is on the rect, so 3 is CSS pixels at every frame size rather than
    // viewBox units at one of them.
    `${SCOPE} rect.mark-active[data-fill="field"] { fill: ${neutral}; stroke: ${inkOn(neutral)}; stroke-width: 3; }`,
    `${SCOPE} rect.mark-active[data-fill="thread"] { fill: ${lit}; stroke: ${inkOn(lit)}; stroke-width: 3; }`,
    // THE ANSWER IS SIX READINGS LONG, AND THE FORMAT'S BOX IS 220px WIDE. `anchorOn` raises the box
    // off the TOP of the mark it names, so a five-line answer about a cell in the top-left corner of
    // the plot rose clean over the descent's own pills and hid the control the reader had just
    // operated — looked at, in the creme capture, before this rule existed. Widening the box to two
    // or three lines is the whole fix and costs nothing else. Bare `#tooltip`, because the element is
    // the page's and not this figure's; same specificity as the format's own rule, and this
    // stylesheet is emitted after it, which is the entire mechanism — so it is stated rather than
    // relied on silently.
    `#tooltip { max-width: min(440px, calc(100vw - 32px)); }`,
    cellFitCss(lead, nameTiers, valueTiers),
    descendChromeCss({ scope: SCOPE }),
    descendCss(descend, { scope: SCOPE, idPrefix: DESCEND_ID_PREFIX }),
  ].join("\n\n");

  const options = descendOptionsForMarkup(descend, DESCEND_ID_PREFIX);
  const notes = descendNotesForMarkup(descend);

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          nothing LEAVES this picture, the frame itself is re-parented. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE THREAD, DRAWN UNCONDITIONALLY. It is the second half of the headline, so no control on
          this page can take it away — the reader who touches nothing has the whole claim. */}
      <p className="chart-caveat" style={{ ...regs.annot, margin: "6px 0 0", flex: "0 0 auto" }}>
        {tippedNote}
      </p>

      {/* THE DESCENT. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. The way back out is first and is the default, so a reader with no script
          lands on the claim's own view and can still descend from it. */}
      <fieldset className="chart-descend">
        <legend style={{ ...regs.axis, color: muted }}>{descend.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id} style={{ ...regs.axis }}>
              <input
                id={option.id}
                type="radio"
                name={DESCEND_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isRoot}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE EACH BRANCH OWES. Revealed by the same `:checked` that re-lays the frame, and
          it is where this control's DERIVED readings live — the station counts, the shares of a
          source, the concentration in one country. None of them can be inferred from an area, which
          is exactly why the control owes them. The root reveals none: it is not a branch of
          anything, and what it says is the title. */}
      <div className="descend-notes" role="status">
        {notes.map((note) => (
          <p key={note.slug} data-descend-note={note.slug} style={{ ...regs.annot, margin: 0 }}>
            {note.text}
          </p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${FRAME.width} / ${FRAME.height}`,
        }}
      >
        <div className="y-axis" />

        {/* ONE SVG PER VIEW, stacked in the same grid cell, and only the chosen one is displayed.
            Not one svg whose cells swap: `interaction.mjs` resolves a pointer to the nearest `.pt`
            IN ITS OWN SVG, reading coordinates once at init, so cells from four hidden branches
            sitting in the same node list would answer for a picture nobody is looking at — and a
            `display: none` element's rect is 0x0, which would anchor the answer at the top-left
            corner of the window. A hidden svg is initialised on its own and never reached. */}
        {views.map((view) => (
          <svg
            key={view.slug}
            {...descendLayerAttrs(view.slug)}
            role="group"
            aria-label={title}
            xmlns="http://www.w3.org/2000/svg"
            className="chart"
            data-hit="cell"
            viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
            preserveAspectRatio="none"
          >
            {view.slug === DESCEND_ROOT_SLUG ? <desc>{alt}</desc> : null}
            <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

            {view.cells.map((c) => (
              <rect
                key={c.key}
                {...descendCellAttrs(view.slug, c.key)}
                data-mark={`${view.slug}:${c.key}`}
                data-fill={c.tipped ? "thread" : "field"}
                x={c.x}
                y={c.y}
                width={c.w}
                height={c.h}
                fill={fillOf(c)}
                stroke={ground}
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* THE HIT TARGETS, AND WHY A BIG CELL GETS SEVERAL. `nearestCell` resolves a pointer to
                the nearest mark CENTRE, which is a Voronoi over the centres — a good approximation
                of a tiling of near-equal cells and a bad one where a cell holding a fifth of the
                frame abuts cells holding a thousandth: the corner of France is nearer the centre of
                Moldova than it is to France's own. So a cell is sampled on a grid of at most 4x4
                points spaced about 70 viewBox units apart, every one of them answering with the same
                reading and naming the same mark. Only the FIRST is in the tab order — the others
                carry `tabIndex={-1}` and no accessible name, so the keyboard still walks one stop per
                country while the pointer lands where the reader is actually pointing. */}
            {view.cells.flatMap((c) => {
              const nx = Math.max(1, Math.min(4, Math.round(c.w / 70)));
              const ny = Math.max(1, Math.min(4, Math.round(c.h / 70)));
              const spots: { ix: number; iy: number }[] = [];
              for (let iy = 0; iy < ny; iy++)
                for (let ix = 0; ix < nx; ix++) spots.push({ ix, iy });
              return spots.map(({ ix, iy }, i) => (
                <circle
                  key={`hit-${c.key}-${i}`}
                  className="pt"
                  {...descendCellAttrs(view.slug, c.key)}
                  data-mark-ref={`${view.slug}:${c.key}`}
                  cx={c.x + (c.w * (ix + 0.5)) / nx}
                  cy={c.y + (c.h * (iy + 0.5)) / ny}
                  r={3}
                  fill="transparent"
                  stroke="none"
                  tabIndex={i === 0 ? 0 : -1}
                  role={i === 0 ? "img" : undefined}
                  aria-label={i === 0 ? c.detail : undefined}
                  aria-hidden={i === 0 ? undefined : true}
                  data-detail={c.detail}
                />
              ));
            })}
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
        ))}

        {/* THE LABELS. The ROOT's layer is `.overlay`, which is the plate's own layer and what
            `verify-web.mjs` reads every word of: correct, because the root view IS the claim and
            every word in it is drawn unconditionally. A BRANCH's labels belong to an option nobody
            has chosen yet, so they sit in a `.cell-layer` of their own — the same split
            `proof/web-population-pyramid-switzerland` makes for a crossing that belongs to a fold. */}
        {views.map((view) => {
          const isRoot = view.slug === DESCEND_ROOT_SLUG;
          return (
            <div
              key={`labels-${view.slug}`}
              className={isRoot ? "overlay cell-layer" : "cell-layer"}
              {...descendLayerAttrs(view.slug)}
              aria-hidden="true"
            >
              {view.cells.map((c) => {
                const box = boxes.find((b) => b.view === view.slug && b.cell.key === c.key)!;
                return (
                  <span
                    key={`l-${c.key}`}
                    className="cell-box"
                    {...descendCellAttrs(view.slug, c.key)}
                    data-fits-its-mark=""
                    data-wname={box.wname}
                    data-wvalue={box.wvalue}
                    style={{
                      ...valueRest,
                      color: inkOn(fillOf(c)),
                      left: `${pct(c.x, FRAME.width)}%`,
                      top: `${pct(c.y, FRAME.height)}%`,
                      width: `${pct(c.w, FRAME.width)}%`,
                      height: `${pct(c.h, FRAME.height)}%`,
                    }}
                  >
                    <span className="cell-name" data-fits-its-mark="">{c.name}</span>
                    <span className="cell-value" data-fits-its-mark="">{c.value}</span>
                  </span>
                );
              })}
            </div>
          );
        })}

        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "8px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
