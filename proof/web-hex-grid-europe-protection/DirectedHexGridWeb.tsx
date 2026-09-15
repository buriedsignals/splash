/**
 * Ukrainians under temporary protection per 1 000 inhabitants, one hexagon per host country — drawn
 * as a hex cartogram THROUGH the design base and delivered as an interactive page.
 *
 * ONE UNIT, ONE CELL, ALL CELLS EQUAL. The map gives up area and buys what a choropleth of the same
 * data cannot give: every country equally visible. On a subject whose units are countries rather
 * than land, that is the honest trade, and the caveat states both halves of it.
 *
 * WHAT THE HEXAGON BUYS OVER THE SQUARE: six neighbours, every one of them edge-sharing. A square
 * grid touches diagonally, so a reader has to decide whether corner contact counts as adjacency; a
 * hexagon has no corners to argue about. That is why the odd rows are offset by half a cell — and
 * it is also what makes this page's second grain expressible at all.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT THE WEB ADDS, AND WHY IT IS THIS AND NOT A ZOOM, A PAN OR A TOOLTIP.
 *
 * A zoom is the lazy answer on a map and here it is not even that: there is no geography to frame.
 * What a hex grid hides is **the binning itself**. Its own type sheet says so twice — *"the
 * aggregate mode silently changes what the same shade of colour MEANS, and the map doesn't tell the
 * reader which mode it's in"*, and *"cell size and aggregate mode are both invisible from the final
 * image alone"*. The sheet's cartogram reading says the cells are *"not arbitrary at all"*, which is
 * true OF THE CELL and false OF THE GROUPING: a rate is a quotient of two sums, and the moment two
 * cells are put in common the quotient of the sums stops being the mean of the quotients.
 *
 * So the control is the GRAIN — over how many cells a cell adds up its own numerator and its own
 * denominator — and the same frozen file says three different things under it:
 *
 *   le pays        LIE 23,9   LTU 17,5   CZE 36,1     5 classes drawn
 *   le voisinage   LIE  1,8   LTU 26,6   CZE 22,0     4 classes drawn, 21 of 31 cells change class
 *   la région      LIE  4,3   LTU 18,3   CZE 18,0     3 classes drawn, 21 of 31 cells change class
 *
 * Liechtenstein drops twenty-two points and three classes because its forty thousand inhabitants are
 * pooled with France's sixty-eight million, sitting beside it in the drawing. Lithuania gains nine.
 * Pooled over the whole continent the rate is 9,68 per thousand where the mean of the thirty-one
 * rates is 12,24 — two true numbers answering two different questions. A still can pick one grain,
 * print it in the caveat and ask to be trusted; a video or a scrolly can play the three in the
 * author's order, once. This is a back-and-forth, not a sequence.
 *
 * `pool.ts` is the vocabulary, written for this beat in `skills/map-web/assets/` and argued in
 * `BRIEF.md` against the three that already existed there. Native radios plus CSS generated at build
 * time: no script, no listener, and the complete plate WITH a working control when JavaScript is off.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT MOVES: NOTHING, AND THAT IS A MEASUREMENT RATHER THAN AN INTENTION.
 *
 * A cell's seat is a function of the drawn grid and of NO grain, so the three states are the same
 * polygons at the same places with different fills — the runner asserts that the `points` attribute
 * is identical across the three states rather than trusting the arithmetic. This is why the owner's
 * fourth arbitration is honoured here instead of excused: `fill` is a real CSS property on an element
 * that is always rendered, so it interpolates, and the colour runs from one grain's class to the
 * next over 420 ms.
 *
 * It is available ONLY because the gesture changes the aggregation WINDOW and not the TESSELLATION.
 * Between two different tessellations a cell has nowhere continuous to travel to and the honest move
 * would be to say so; this page never has to, because there is one tessellation in every state.
 *
 * THE KEY DOES NOT CHANGE EITHER, and that is the choice that separates this gesture from the
 * choropleth's. `classing.ts` holds the values still and moves the bounds; this holds the bounds
 * still and moves the values. So the five swatches and the five printed ranges are the same in all
 * three states, and a reader who has learnt the key once never re-learns it.
 *
 * NO WORD MOVES. A cell's CODE is furniture: written once, identical in every state. Its NUMBER is
 * three `<text>` stacked at ONE place and the stylesheet reveals one — digits change, nothing travels.
 * The type sheet's own rule decides that it is the code and not the name: *"the unit's code sits
 * inside its own cell, and a cell too narrow to hold it is a refusal, not a smaller type size."* The
 * premier jet drew `Liechtenstein` at 13px inside a 76-unit hexagon and its labels overlapped their
 * neighbours'; this file measures every label against its own cell and against every other label,
 * and refuses rather than shrink.
 *
 * THE BLOCK OUTLINE is the one thing that appears, and only at `la région`. It is always in the DOM
 * and it is its `opacity` that moves, so it interpolates too. At `le pays` there is no group of more
 * than one cell to outline. At `le voisinage` there is none either, for the reason that IS the
 * gesture: a neighbourhood is not a partition but a moving window — Czechia is in its own and in
 * five others' — and a window has no boundary. `poolPartitionOf` returns `null` there rather than
 * inventing blocks, and the derived sentence tells the reader which kind they are looking at.
 *
 * THE POINTER'S ANSWER DOES NOT CHANGE WITH THE GRAIN, deliberately. Every cell answers with all
 * three of its values at once, plus the people, the population that divides them and its rank in
 * BOTH rankings — a reading that is true in every state. A reader who hovers gets the whole
 * comparison without pressing anything; a reader who presses gets it map-wide. It also keeps this
 * page to ONE set of `.pt`: `interaction.mjs` resolves the pointed mark from `cx`/`cy` read once at
 * init, and three stacked answering layers at identical coordinates would answer for each other.
 *
 * `the-key-prints-its-breaks-in-the-data-s-units` — the key names its classes in people per 1 000.
 * `a-sequential-grid-is-one-hue-cluster` — one hue, monotone in lightness, in all three states.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { webRegisters, figureVars, inkOnFill } from "#shared/design-base/web.mjs";
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import {
  poolAttrsFor,
  poolCss,
  poolFigureCss,
  poolNotesForMarkup,
  poolOptionsForMarkup,
} from "../../skills/map-web/assets/pool.ts";

/** The id stem the format's own discovery contract looks for. `interaction-plan.ts` reads a
 *  toggling control off `id="mw-stack-<slug>"` plus `data-stack-note="<slug>"`; a third spelling
 *  would be invisible to the guard written to hold it, so this beat speaks the one that exists. */
export const POOL_ID_PREFIX = "mw-stack";
export const SCOPE = ".chart-figure";
/** How long a cell's colour takes to run from one grain's class to the next. The one transition on
 *  the geometry, and the only one the owner's fourth arbitration can be met with here. */
export const POOL_MS = 420;

export type Cell = {
  code: string;
  name: string;
  cx: number;
  cy: number;
  /** The origin country: drawn, named, and outside the measure. */
  isOrigin: boolean;
  detail: string;
  /** One printed number per grain, in the beat's own format. Stacked at one place. */
  figures: { slug: string; text: string; klass: number; isDefault: boolean }[];
};

export function DirectedHexGridWeb({
  cells,
  pool,
  seams,
  classes,
  originLabel,
  radius,
  width,
  height,
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
}: {
  cells: Cell[];
  pool: any;
  seams: { slug: string; d: string }[];
  classes: { label: string }[];
  originLabel: string;
  radius: number;
  width: number;
  height: number;
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
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  /** A COLOUR THAT CANNOT BE TOLD FROM THE GROUND IS A CELL THAT IS NOT THERE. The palest class and
   *  the origin's neutral are both lifted to the non-text floor against the direction's own ground
   *  before anything is drawn, and a direction where no lift reaches it is refused rather than
   *  corrected somewhere else. Carried from the static sibling, which earned it. */
  const floorAgainstGround = (colour: string, what: string) => {
    if (contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN) return colour;
    const lifted = adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(`${what} cannot be told from the ground it sits on in this direction's colours.`);
    return lifted;
  };
  const low = floorAgainstGround(mix(accent, ground, 0.88), "the lowest class of the ramp");
  const high = mix(accent, ink, 0.3);
  const classFill = (i: number) => mix(low, high, classes.length > 1 ? i / (classes.length - 1) : 0.5);
  /** THE SEAT OUTSIDE THE COUNT IS THE GROUND, NOT A SIXTH TINT — and that is a correction, made
   *  here by measuring the delivered page rather than by reading the code.
   *
   *  It used to be `mix(ground, ink, 0.16)` put through `floorAgainstGround`, exactly as the lowest
   *  class is. Two colours floored INDEPENDENTLY on the same floor against the same ground come out
   *  the same colour by construction, and they did: the origin against class 0 measured **1.007:1
   *  on creme, 1.001:1 on nocturne, 1.011:1 on rapport**. On the map a reader could still tell them
   *  apart, because the origin cell prints the word `origine` where the others print a number — but
   *  the KEY could not. It offered a swatch for "moins de 5" and a swatch for "Ukraine · origine"
   *  in the same colour, which is a key that teaches a reader something false.
   *
   *  There is no room to separate them inside the ramp: class 0 sits at 3,13:1 against the ground
   *  and the floor is 3,0, so nothing legal fits below it, and anything a visible step above it
   *  collides with class 1 at 4,19:1. The honest place for a unit that was never measured is
   *  therefore OUTSIDE the ramp altogether — the ground itself, an empty seat, with an outline that
   *  clears the non-text floor so the seat is still a seat. The refusal below holds it there. */
  const originFill = ground;
  const edge = floorAgainstGround(mix(ground, ink, 0.3), "the outline of a legend swatch");
  const originEdge = floorAgainstGround(
    mix(ground, ink, 0.45),
    "the outline of the seat that stands outside the count",
  );
  /** The block outline at `la région`, and it is measured against the class fills it crosses rather
   *  than against the ground: it is drawn ON the cells, never beside them. */
  const seamInk = mix(ink, ground, 0.12);
  const inkFor = (fill: string) =>
    inkOnFill(fill, { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN);
  const classInk = classes.map((_, i) => inkFor(classFill(i)));
  const originInk = inkFor(originFill);
  /** THE SEAT OUTSIDE THE COUNT MUST BE TELLABLE FROM EVERY CLASS, measured against the colours this
   *  direction really paints. 1,1:1 is not a threshold anybody can defend as "visible"; it is the
   *  line under which two fills are the SAME fill with rounding, which is the state this beat
   *  shipped in and which no guard would have named. */
  const ORIGIN_SEPARATION_MIN = 1.5;
  classes.forEach((k, i) => {
    const seen = contrast(originFill, classFill(i));
    if (seen < ORIGIN_SEPARATION_MIN)
      throw new Error(
        `the seat that stands outside the count and the class ${JSON.stringify(k.label)} measure ` +
          `${seen.toFixed(3)}:1 against each other (floor ${ORIGIN_SEPARATION_MIN}). The key would ` +
          `offer two swatches in one colour and tell the reader that a country nobody counted is ` +
          `a country with the lowest rate.`,
      );
  });

  const hex = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${(cx + radius * Math.cos(a)).toFixed(1)} ${(cy + radius * Math.sin(a)).toFixed(1)}`;
    }).join(" ");

  // ── the two refusals this type owes its own labels ─────────────────────────────────────────
  /** THE STACK WITHOUT ITS QUOTES, for the SVG attributes and for the measurement that sizes the
   *  cell against them. A register's `fontFamily` is a CSS string and carries `"Open Sans"` with its
   *  quotes inside it; `measureText` splices that straight into `font-family="..."` on its probe,
   *  where the inner quote closes the attribute and resvg refuses the whole document — *"invalid
   *  attribute at 1:101 cause expected space not 'O'"*, which is the parser standing on the `O` of
   *  `Open`. Dropping the quotes leaves the same stack and legal CSS, since a family name made of
   *  identifiers needs none, and it keeps the double-quoted spelling the typeface census reads (an
   *  attribute opened on a single quote is invisible to both scanners). Same fix, same reason, as
   *  `proof/web-slope-europe-lowcarbon/DirectedSlopeWeb.tsx`. */
  const plainStack = (stack: unknown) => String(stack).replace(/"/g, "");
  const CODE_SIZE = { fontSize: 13, fontWeight: 600, fontFamily: plainStack(regs.axis.fontFamily) };
  const VALUE_SIZE = { fontSize: 14, fontWeight: 700, fontFamily: plainStack(regs.value.fontFamily) };
  const CODE_DY = -radius * 0.16;
  const VALUE_DY = radius * 0.34;
  /** A pointy-top hexagon is `radius * √3` wide at its own centre line, and every label here sits
   *  inside the middle half of it, where the full width is available. */
  const cellWidth = radius * Math.sqrt(3);
  const widthOf = (text: string, size: any) => measureText(text, size);

  const codeOwes = Math.max(...cells.map((c) => widthOf(c.code, CODE_SIZE))) + 6;
  const valueOwes = Math.max(
    ...cells.flatMap((c) => c.figures.map((f) => widthOf(f.text, VALUE_SIZE))),
  ) + 6;
  if (cellWidth < codeOwes || cellWidth < valueOwes)
    throw new Error(
      `a hexagon is ${cellWidth.toFixed(1)} units wide and it has to hold a code that owes ` +
        `${codeOwes.toFixed(1)} and a number that owes ${valueOwes.toFixed(1)}. A grid nobody can ` +
        `read cell by cell is a pattern, not a map — and the answer is a bigger cell or a shorter ` +
        `label, never a smaller type size.`,
    );

  /** NO LABEL MAY TOUCH ANOTHER LABEL. The premier jet drew each country's full French name in a
   *  76-unit cell and they ran into each other; measuring is the only way to know, so every box is
   *  built and every pair is compared. A number is measured at its WIDEST grain, because the reader
   *  chooses the grain and the widest one has to fit too. */
  type Box = { what: string; x0: number; x1: number; y0: number; y1: number };
  const boxes: Box[] = [];
  for (const cell of cells) {
    const codeW = widthOf(cell.code, CODE_SIZE);
    boxes.push({
      what: `${cell.code} code`,
      x0: cell.cx - codeW / 2,
      x1: cell.cx + codeW / 2,
      y0: cell.cy + CODE_DY - CODE_SIZE.fontSize * 0.5,
      y1: cell.cy + CODE_DY + CODE_SIZE.fontSize * 0.5,
    });
    const valueW = Math.max(...cell.figures.map((f) => widthOf(f.text, VALUE_SIZE)));
    boxes.push({
      what: `${cell.code} value`,
      x0: cell.cx - valueW / 2,
      x1: cell.cx + valueW / 2,
      y0: cell.cy + VALUE_DY - VALUE_SIZE.fontSize * 0.5,
      y1: cell.cy + VALUE_DY + VALUE_SIZE.fontSize * 0.5,
    });
  }
  for (let i = 0; i < boxes.length; i += 1)
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1)
        throw new Error(
          `the label "${a.what}" overlaps the label "${b.what}" — a hex grid whose names collide is ` +
            `a grid a reader cannot read country by country, which is the only thing this type buys.`,
        );
    }

  const options = poolOptionsForMarkup(pool, POOL_ID_PREFIX);
  const notes = poolNotesForMarkup(pool);

  const css = [
    // THE CHROME IS NOT COPIED. `control-chrome.ts` is the one place a directed control is drawn —
    // the pill rail, the chosen pill's wash and ring, the reserved note row — and a local variant
    // would be the only one left ugly when the shared drawing is next changed. What is passed as
    // `extra` is the only layer this vocabulary has ever owned.
    controlChromeCss({
      scope: SCOPE,
      name: "pool",
      rail: "wrap",
      notes: {
        reserve: "3.6em",
        stacked: true,
        why:
          "The two sentences wrap to two and three lines at 375px on this beat's own words, and a " +
          "revealed sentence that grows its row pushes the whole grid down — the movement the " +
          "owner's first arbitration refuses. Stacked in one cell, the row is always as tall as " +
          "the longest sentence and the map never moves.",
      },
      extra: poolFigureCss({ scope: SCOPE }),
    }),
    poolCss(pool, {
      scope: SCOPE,
      idPrefix: POOL_ID_PREFIX,
      fillOf: classFill,
      // THE BLANKET IS THE NEUTRAL, not a class. A cell whose token no rule sets is then painted
      // exactly like the country that is outside the measure — while still printing a number, which
      // is a contradiction a reader can see and a guard can name.
      unsetFill: originFill,
      ms: POOL_MS,
    }),
    // The block outline is ink over the cells, never a second ramp. Its weight is set here because
    // it is this beat's geometry and not the vocabulary's.
    `${SCOPE} [data-pool-seam] { stroke: ${seamInk}; stroke-width: 2.5; stroke-linejoin: round; }`,
    // The answer is five readings long and the format's tooltip box is 220px wide.
    `#tooltip { max-width: min(460px, 100vw - 32px); }`,
  ].join("\n\n");

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
          nothing leaves this picture in any state, and a control that hid cells would be a filter
          wearing this one's pills. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries what a reader who is not looking at the map would otherwise only get
          from it. Each accessible name CONTAINS its visible one — WCAG 2.5.3, refused in
          `assertPoolDeclaration` rather than remembered. */}
      <fieldset className="chart-pool">
        <legend>{pool.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={POOL_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — what the pooling did, in words, for a reader who
          is not looking at the map. Its row is reserved whether or not an option is chosen, so
          choosing one never moves the grid underneath it. The default reveals none: it is not a
          counterfactual, it is the claim the title makes. */}
      <div className="pool-notes" role="status">
        {notes.map((note) => (
          <p key={note.slug} data-stack-note={note.slug} style={{ ...regs.annot, margin: 0 }}>{note.text}</p>
        ))}
      </div>

      {/* THE KEY, AND IT IS THE SAME KEY IN ALL THREE STATES. The type sheet asks for the bin's own
          numeric range printed next to each colour, in the deliverable's own number format, because
          a sequential ramp compresses adjacent classes under a colour-vision-deficiency simulation
          even when it is built correctly. Holding the bounds still and moving the values is what
          lets one key serve every grain. */}
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
        {classes.map((k, i) => (
          <span key={k.label} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 14, background: classFill(i), display: "inline-block", border: `1px solid ${edge}` }} />
            {k.label}
          </span>
        ))}
        <span style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 14, background: originFill, display: "inline-block", border: `1px solid ${originEdge}` }} />
          {originLabel}
        </span>
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${width} ${height}`}
          // A hexagon stretched is not a hexagon, and six equal edges are the whole point. This is
          // also why this beat is exempt from the format's own `preserveAspectRatio="none"`: the
          // cell's scaleX and scaleY are equal by construction here rather than by luck.
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={width} height={height} fill={ground} />

          {/* THE CELLS. One polygon per country, drawn ONCE for all three grains: the `points` are a
              function of the grid and of no grain, so the states differ in `fill` and in nothing
              else. The default grain's fill is also a presentation attribute, which any generated
              rule outranks — so the page degrades to the static plate if its stylesheet is ever
              lost, and the control still wins whenever it is not. */}
          {cells.map((c) => (
            <polygon
              key={c.code}
              points={hex(c.cx, c.cy)}
              {...(c.isOrigin ? {} : poolAttrsFor(pool, c.code))}
              fill={c.isOrigin ? originFill : classFill(c.figures[0].klass)}
              stroke={c.isOrigin ? originEdge : ground}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* THE BLOCK OUTLINE, one path per grain, always in the DOM. A grain that is a moving
              window rather than a partition has no boundary and gets an empty path — an element
              that is there and draws nothing, so the element set never changes and `opacity` is
              free to interpolate. */}
          {seams.map((seam) => (
            <path key={seam.slug} data-pool-seam={seam.slug} d={seam.d} fill="none" vectorEffect="non-scaling-stroke" />
          ))}

          {/* ONE ANSWERING LAYER, NOT THREE. Every cell answers with all three of its pooled values
              at once, so the reading is true in every state and `interaction.mjs` — which resolves
              the pointed mark from coordinates read once at init — can never answer for the wrong
              one. */}
          {cells.map((c) => (
            <circle
              key={`hit-${c.code}`}
              className="pt"
              cx={c.cx}
              cy={c.cy}
              r={radius * 0.9}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={c.detail}
              data-detail={c.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {cells.map((c) => (
            <g key={`t-${c.code}`}>
              {/* THE CODE IS FURNITURE. Written once, identical in every state, and the type sheet's
                  own rule — a cell too narrow to hold it is a refusal, not a smaller type size. */}
              <text
                pointerEvents="none"
                x={c.cx}
                y={c.cy + CODE_DY}
                fill={c.isOrigin ? originInk : classInk[c.figures[0].klass]}
                fontFamily={CODE_SIZE.fontFamily}
                fontSize={CODE_SIZE.fontSize}
                fontWeight={CODE_SIZE.fontWeight}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {c.code}
              </text>
              {/* THE NUMBER: one `<text>` per grain at ONE place, the stylesheet reveals one. Digits
                  cannot interpolate and this does not pretend they can — what it refuses to do is
                  let a span travel to say so. The origin has no number in any state. */}
              {c.isOrigin ? (
                <text
                  pointerEvents="none"
                  x={c.cx}
                  y={c.cy + VALUE_DY}
                  fill={originInk}
                  fontFamily={VALUE_SIZE.fontFamily}
                  fontSize={VALUE_SIZE.fontSize}
                  fontWeight={VALUE_SIZE.fontWeight}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {c.figures[0].text}
                </text>
              ) : (
                c.figures.map((figure) => (
                  <text
                    key={figure.slug}
                    data-pool-figure={figure.slug}
                    pointerEvents="none"
                    x={c.cx}
                    y={c.cy + VALUE_DY}
                    fill={classInk[figure.klass]}
                    fontFamily={VALUE_SIZE.fontFamily}
                    fontSize={VALUE_SIZE.fontSize}
                    fontWeight={VALUE_SIZE.fontWeight}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {figure.text}
                  </text>
                ))
              )}
            </g>
          ))}
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "6px 0 0" }}>{claimNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
