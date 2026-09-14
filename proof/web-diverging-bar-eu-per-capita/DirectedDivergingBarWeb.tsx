/**
 * The 27 EU member states' CO₂ per person, drawn as a diverging bar THROUGH the design base and
 * delivered as an interactive page whose ZERO IS THE THING THE READER OPERATES.
 *
 * THE GESTURE, AND WHY IT IS THIS TYPE'S AND NO OTHER'S.
 *
 * Every type in the bar family encodes a length. Only this one encodes a SIGNED length, which means
 * only this one carries a reference inside its own geometry — and a reference is never in the data,
 * it is somebody's editorial decision about what the data should be compared to. A plain bar's zero
 * is arithmetic: it is where the quantity stops existing, and nobody chose it. A diverging bar's
 * zero was chosen, and the whole reading depends on the choice: who is above, who is below, which
 * country sits at each extreme, and whether the domain straddles zero at all. The type sheet names
 * that last one as the type's one failure mode — "the domain must genuinely straddle zero, or the
 * chart is lying about having two directions when it only has one" — and this beat lives one country
 * away from it: twenty-six bars left, one bar 0,03 t long right.
 *
 * A still can do exactly one thing about that: pick the zero, print it in the caveat, ask to be
 * trusted. This page hands the reader the reference instead. Choosing one re-aims all twenty-seven
 * bars at once — each shortens, lengthens, or crosses the rule and comes out the other side in the
 * other sign's colour — and NOTHING ELSE ON THE PAGE MOVES: not a country name, not a graduation,
 * not the zero rule, not the note on the subject.
 *
 * Measured on this beat's own frozen file, on one fixed ±21 t axis:
 *
 *   zero = son propre niveau de 1990    1 above, 26 below   right-hand extreme: Croatie   +0,03 t
 *   zero = le niveau médian de 1990     1 above, 26 below   right-hand extreme: Luxembourg +2,33 t
 *   zero = le niveau médian de 2024    13 above, 13 below   right-hand extreme: Luxembourg +5,18 t
 *
 * Croatia — the country the headline is about — is 0,52 t BELOW the median European today, so it
 * changes sides. Luxembourg is the far LEFT extreme of the plate and the far RIGHT extreme of both
 * other references: the country that moved furthest is still the one emitting most. Neither fact is
 * drawable on a plate, and neither is a tooltip on the plate either.
 *
 * WHAT DOES NOT MOVE, AND WHY EACH ONE IS A DECISION RATHER THAN A DEFAULT.
 *
 * THE ROWS. Sorted by each country's 2024 level, descending, and fixed in every state. Re-sorting
 * them into each reference's own ranking was the obvious thing to do and is refused three times
 * over: `interaction.mjs` resolves a pointer off `cx`/`cy` read ONCE at init, so a re-ranked row
 * would answer for the country whose slot it landed in (the defect `stack.ts` and `floor.ts` both
 * record paying for); twenty-seven names re-sorting is the owner's first ruling at twenty-seven
 * times the scale; and the fixed order is the better argument anyway, because ordering by a property
 * NO zero can change is what lets the reader watch Luxembourg hold the top row while its bar travels
 * from one edge of the frame to the other.
 *
 * THE AXIS. One span, ±21 t, taken from the widest option and never recomputed, so no graduation
 * ever moves and the three states are comparable to each other. That is where a third reading lives:
 * the twenty-seven members differ from each other TODAY by 7,26 t end to end, against 20,48 t for
 * the distance Luxembourg alone has travelled since 1990. Drawn in the same frame, the "where they
 * stand" fan is visibly a fifth of the "how far they have come" wedge. A per-option rescale would
 * have drawn both at the same width and destroyed exactly that comparison.
 *
 * THE READINGS. Twenty-seven points, every one of them on the zero rule at its own row's height —
 * an x and a y no option touches. `assertDatumRest` refuses this beat if they ever drift apart,
 * because with every `cx` equal, `nearestCell` reduces to "which row", which is the only thing here
 * that is stable under a transform. Each point names its own bar with `data-mark-ref`, so what
 * answers a pointer is the bar itself, darkened off its own fill.
 *
 * `sign-is-direction-and-hue-only-doubles-it` — the SIDE of the zero line carries the sign. Colour
 * is allowed to say the same thing a second time, and it does, but a reader who cannot separate the
 * two hues still reads the chart correctly. Held in every state, not just the default: the fill is
 * generated per option from the sign that option gives the row, so the two channels cannot disagree.
 *
 * `the-neutral-straddles-the-centre` — the zero rule is drawn in ink over the bars, not under them:
 * it is the only line on this page a reader measures against, and a bar crossing it would hide it.
 * It is also the one piece of furniture this control cannot move, which is why the readings sit on
 * it.
 */

import {
  adjustToContrast,
  assertLegible,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import {
  assertDatumDeclaration,
  assertDatumRest,
  datumChromeCss,
  datumCss,
  datumNotesForMarkup,
  datumOptionsForMarkup,
  datumStates,
  type DatumDeclaration,
} from "../../skills/chart-web/assets/datum.ts";

/** The scope every generated rule is written inside, and the prefix every radio id carries. */
const SCOPE = ".chart-figure";
const DATUM_ID_PREFIX = "chart-datum-";

const ROW = 21;
export const FRAME = { width: 720, height: 0, xAxisRowPx: 26 };

/** The y-gutter the twenty-seven names are set in, in CSS pixels. Not a fraction: the names are type
 *  at a fixed CSS size (the fluid frame's own rule — geometry stretches, type does not), so the room
 *  they need is a number of pixels and not a share of the width — the same number at 375 and at 1600.
 *
 *  MEASURED, AND IT IS THE LEVER THE FIRST PASS REACHED PAST. That pass cured two clipped names with
 *  `white-space: normal` plus `line-height: 1.1` on the label itself: a vertical-rhythm tool aimed at
 *  a horizontal-overflow problem, and one that beat the leading the axis register emits. Driven in a
 *  real browser, the widest of the twenty-seven is "Luxembourg" at 70 px on `creme` and `rapport` and
 *  77 px on `nocturne`, whose axis register is the largest of the three. 96 px leaves it the shared
 *  `.axis-label.y` right offset of 10 px and 9 px of slack, every name on one line, and hands the
 *  plot the 36 px the old 132 was holding empty. */
const GUTTER_PX = 96;

/** The shortest bar drawn for a NON-ZERO value, in geometry units. A value of exactly zero is drawn
 *  as nothing, because it is nothing: that country IS the reference, and under the 2024 median
 *  option one of them is (Slovaquie, by construction). */
const MIN_BAR_UNITS = 1.4;

/** How far a value label sits outside its bar's growing end, in CSS pixels. Enough that the chip
 *  never lands on the zero rule, which is the one line a reader measures against here. */
const LABEL_OFFSET_PX = 6;

/** The horizontal padding the format's own `.end-label` chip adds, both sides — `padding: 1px 4px`
 *  in `render-web.mjs`'s shared sheet. Counted into the room a label needs, because a chip that
 *  overruns the frame overruns it by its padding too. */
const CHIP_PAD_PX = 8;

/** How long a bar takes to reach its new length. Honoured only under `prefers-reduced-motion:
 *  no-preference` — `datum.ts` puts the whole transition inside the query rather than overriding it
 *  back, so under `reduce` there is no transition to resolve at all. */
const MOVE_MS = 620;

/** How far a bar is lifted toward the ink when a reader points at it, and how different that has to
 *  make it. Both are `proof/web-bar-top-emitters-2024`'s numbers, which were searched against the
 *  three filed directions rather than chosen: the weakest measured step there is nocturne's accent
 *  at 1,143:1, and the floor sits just under it, so a direction leaving less headroom than nocturne
 *  refuses here rather than shipping a hover nobody can see. A fixed dose was refused at 1,104:1 on
 *  nocturne elsewhere; this pair is the reason that cannot happen silently. */
const MARK_ACTIVE_STEP = 0.3;
const MARK_ACTIVE_MIN_STEP = 1.12;

export type Row = {
  code: string;
  name: string;
  /** The answer this page exists to add — already a sentence, formatted in the runner, and TRUE IN
   *  EVERY STATE: it names the country's two endpoints and its distance from all three references,
   *  because the reading must not depend on which option the reader happens to be standing in. */
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedDivergingBarWeb({
  rows,
  measure,
  subject,
  xTicks,
  span,
  datum,
  unitsPerCssPx,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  sideLabels,
  subjectNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  rows: Row[];
  measure: (text: string, options: { fontSize: number; fontWeight?: number | string; fontFamily?: string }) => number;
  subject: string;
  xTicks: number[];
  span: number;
  datum: DatumDeclaration;
  unitsPerCssPx: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  sideLabels: { left: string; right: string };
  subjectNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  const height = rows.length * ROW;
  const centre = FRAME.width / 2;

  // THE TWO SIGN HUES. The type sheet allows exactly two and forbids the red/green pairing a
  // deuteranope confuses most; these are the direction's own accent against one neutral taken to the
  // non-text floor on the direction's own ground, which differ in LIGHTNESS as well as in hue and so
  // survive a CVD simulation the way a two-hue pair at the same lightness does not.
  let below = mix(ground, ink, 0.42);
  if (contrast(below, ground) < NON_TEXT_CONTRAST_MIN)
    below = adjustToContrast(below, ground, NON_TEXT_CONTRAST_MIN) ?? below;
  const above = accent;
  assertLegible(above, ground, { role: "mark", where: `${direction.id ?? "this direction"}'s bars above the datum` });

  // WHAT A BAR TAKES UNDER THE READER'S POINTER, off ITS OWN fill and never a ring or a dot on top
  // of it. Asserted in both directions: a step that does not clear the mark floor against the ground
  // is a hover that hides the bar, and a step a reader cannot see is no answer at all.
  const activeOf = (fill: string, what: string) => {
    const lifted = mix(fill, ink, MARK_ACTIVE_STEP);
    assertLegible(lifted, ground, {
      role: "mark",
      where: `${direction.id ?? "this direction"}'s ${what} under the pointer`,
    });
    const step = contrast(lifted, fill);
    if (step < MARK_ACTIVE_MIN_STEP)
      throw new Error(
        `${direction.id ?? "this direction"}'s ${what} steps only ${step.toFixed(3)}:1 when a reader ` +
          `points at it (${fill} → ${lifted}), under the ${MARK_ACTIVE_MIN_STEP}:1 this beat holds — ` +
          "the bar would answer a pointer with a change nobody can see",
      );
    return lifted;
  };
  const aboveActive = activeOf(above, "bars above the datum");
  const belowActive = activeOf(below, "bars below the datum");

  // AND THE SIGN MUST OUTWEIGH THE POINTER, which is a refusal only a type whose colour carries a
  // SIGN has to make. Two fills say "above" and "below"; each of them also has a pointed-at state.
  // If pointing at a bar changed its colour by MORE than the sign does, a reader moving the mouse
  // down the list would watch bars appear to change sides under their own pointer. Measured on the
  // three filed directions: the two signs stand 2,19:1 apart on `creme`, 2,73:1 on `nocturne` and
  // 2,34:1 on `rapport`, against pointer steps of 1,84 / 1,71 / 1,84 — the narrowest margin is
  // creme's, 19 %, and it is why this is asserted rather than assumed.
  const signApart = contrast(above, below);
  const loudestPointer = Math.max(contrast(aboveActive, above), contrast(belowActive, below));
  if (signApart <= loudestPointer)
    throw new Error(
      `${direction.id ?? "this direction"} separates its two signs by ${signApart.toFixed(3)}:1 and ` +
        `repaints a bar by ${loudestPointer.toFixed(3)}:1 when a reader points at it — the pointer ` +
        "would speak louder than the sign, and a bar under the mouse would read as a bar on the " +
        "other side of the rule",
    );

  // THE VALUE LABELS ARE INK, ALL TWENTY-SEVEN OF THEM, INCLUDING THE SUBJECT'S. The type sheet's
  // accessibility trap, verbatim: "a value label painted in the bar's own accent hue — rather than
  // the page's neutral ink — is the specific mistake that has failed WCAG contrast here before: keep
  // the label in ink, let the fill carry the sign." The first pass of this beat painted the
  // subject's label in the accent; it is ink now, and the subject is marked where marking costs
  // nothing — its name in the gutter, and the note that names it in words.
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const zeroInk = labelInk;
  // AND THE CHIP IS WHAT MAKES AN INSIDE LABEL LEGIBLE, not a second ink. A label that does not fit
  // outside its bar is drawn ON the bar (see `labelUnitsOf`), where the ink would otherwise have to
  // be measured against two different fills: 6,74:1 and 3,08:1 on `creme`, and 4,49:1 and 1,65:1 on
  // `nocturne`, where white on the mint is a word nobody can read. `.end-label` already ships a
  // ground chip (`background: var(--ground)` in the format's own sheet) and this beat does not take
  // it away — `proof/web-streamgraph-swiss-electricity` overrode it to `transparent` and paid for it
  // with two words the owner could not read. So there is ONE pair to measure, ink against ground,
  // and it is this one.
  if (contrast(labelInk, ground) < TEXT_CONTRAST_MIN)
    throw new Error(
      `${direction.id ?? "this direction"}'s value labels measure ${contrast(labelInk, ground).toFixed(2)}:1 ` +
        "against their own chip — a label drawn inside a bar is read off the chip and nothing else",
    );

  const barH = ROW * 0.62;
  // The register's own size, and the one number the label's room is measured at. `.end-label` is
  // type at a FIXED CSS size over a plot that stretches, so the room it needs is worst at the
  // narrowest width this format is verified at — which is where `unitsPerCssPx` was measured.
  const valueSize = Number.parseFloat(regs.value.fontSize as string);

  // Refused before anything is drawn, against what this component is actually handed.
  assertDatumDeclaration(datum, {
    drawn: rows.map((r) => r.code),
    width: FRAME.width,
    unitsPerCssPx,
  });
  if (datum.span !== span)
    throw new Error(
      `the frame draws ±${span} and the datum declares ±${datum.span} — two spans is two axes, and ` +
        "the whole reason this control is worth operating is that its three states share one",
    );

  const states = datumStates(datum);
  const options = datumOptionsForMarkup(datum, DATUM_ID_PREFIX);
  const notes = datumNotesForMarkup(datum);

  // The readings, all on the zero rule. `assertDatumRest` is what makes that a promise rather than
  // an intention — see its own comment for the hole it closes.
  const readings = rows.map((row, i) => ({
    code: row.code,
    detail: row.detail,
    cx: centre,
    cy: ROW * i + ROW / 2,
  }));
  assertDatumRest(readings.map((r) => r.cx), { where: "this beat's twenty-seven readings" });

  const css = [
    `${SCOPE} .chart-plot { --y-gutter: ${GUTTER_PX}px; }`,
    datumChromeCss({ scope: SCOPE }),
    datumCss(datum, {
      scope: SCOPE,
      idPrefix: DATUM_ID_PREFIX,
      width: FRAME.width,
      minUnits: MIN_BAR_UNITS,
      labelOffsetPx: LABEL_OFFSET_PX,
      labelUnitsOf: (text) =>
        (measure(text, {
          fontSize: valueSize,
          fontWeight: regs.value.fontWeight as number,
          fontFamily: String(regs.value.fontFamily).split(",")[0].replace(/"/g, ""),
        }) +
          CHIP_PAD_PX +
          LABEL_OFFSET_PX) *
        unitsPerCssPx,
      moveMs: MOVE_MS,
      paint: (sign) => (sign > 0 ? { bar: above, active: aboveActive } : { bar: below, active: belowActive }),
    }),
    // THE POINTED-AT BAR, RAISED ABOVE THE PAINT. `datum.ts` sets `--bar` and `--mark-active` inside
    // each option's `:has()` scope, which weighs (1,3,0) — so it never writes `fill` there, and this
    // one rule, at (0,2,1), is what beats the (0,2,0) blanket that paints from `--bar`. The format's
    // own `.mark-active { fill: var(--mark-active, var(--muted)) }` at (0,1,0) would have lost to
    // the blanket, which is the silent-specificity defect this tree has already paid for once.
    `${SCOPE} rect.mark-active[data-datum-bar] { fill: var(--mark-active); }`,
    // THE ANSWER IS FOUR READINGS LONG AND THE FORMAT'S BOX IS 220 px WIDE. `interaction.mjs` puts
    // the box ABOVE the pointer, so a five-line answer about the second row rose clean over this
    // beat's own pills and hid the control the reader had just operated — read in the nocturne
    // capture, before this rule existed. Widening it to two or three lines is the whole fix and
    // costs nothing else. Bare `#tooltip`, because the element is the page's and not this figure's:
    // same specificity as the format's own rule, and this sheet is emitted after it.
    `#tooltip { max-width: 360px; }`,
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
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not —
          nothing leaves this picture, and a diverging bar that hid a row would be a ranking with a
          hole in it. A datum is a fifteenth mechanism and pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertDatumDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-datum">
        <legend>{datum.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-datum"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE EACH REFERENCE OWES THE READER. Its row is reserved whether or not an option is
          chosen, so choosing one never moves the plot underneath it. Unlike every sibling vocabulary
          the DEFAULT gets one too: here the untouched state is not the absence of the gesture, it is
          a reference somebody chose, and a control whose default declined to say what its zero was
          would be the exact failure this page exists to repair. */}
      <div className="datum-notes" role="status">
        {notes.map((note) => (
          <p data-datum-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + GUTTER_PX} / ${height + FRAME.xAxisRowPx}`,
        }}
      >
        {/* The twenty-seven names, at the twenty-seven row centres, in every state of the page. No
            `line-height` is written here: the shared `.axis-label` keeps them on one line, so a row
            is one line of the axis register and the register owns its own leading. The first pass
            set `white-space: normal` plus `line-height: 1.1` to cure two clipped names — a
            vertical-rhythm tool used on a horizontal-overflow problem, and one that beat the
            register. The gutter is the right lever and it is `GUTTER_PX` above. */}
        <div className="y-axis">
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="axis-label y"
              style={{
                ...regs.axis,
                color: r.code === subject ? accent : (regs.axis.color as string),
                fontWeight: r.code === subject ? 700 : regs.axis.fontWeight,
                top: `${pct(ROW * i + ROW / 2, height)}%`,
              }}
            >
              {r.name}
            </span>
          ))}
        </div>

        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${FRAME.width} ${height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={height} fill={ground} />

          {xTicks.filter((t) => t !== 0).map((t) => (
            <line
              key={t}
              x1={centre + (t / span) * centre}
              x2={centre + (t / span) * centre}
              y1={0}
              y2={height}
              stroke={grid}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* ONE RECT PER COUNTRY AND NOT ONE PER STATE. A unit-wide rectangle standing on the zero
              rule; the stylesheet gives it a `scaleX` per option, signed, so the SIDE of the rule it
              falls on is the sign and a bar that changes sign passes through `scaleX(0)` AT the rule
              — the reader watches it collapse into the line and grow out the far side rather than
              teleport. Three plates revealed by `display` would have cut instead, and `display` is
              the one thing that cannot be interpolated. No `fill` attribute here: the paint comes
              from `--bar` at low specificity so the format's own pointer rule can win. */}
          {rows.map((r, i) => (
            <rect
              key={r.code}
              data-datum-bar={r.code}
              data-mark={r.code}
              x={0}
              y={ROW * i + ROW / 2 - barH / 2}
              width={1}
              height={barH}
            />
          ))}

          {/* The zero rule, OVER the bars: it is the only line a reader measures against here, and
              the only piece of furniture no option moves. */}
          <line x1={centre} x2={centre} y1={0} y2={height} stroke={zeroInk} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />

          {/* THE READINGS, ALL ON THE RULE. Their `cx` is identical by construction, so the pointer
              resolves by row and a row is the one coordinate this control cannot move. The point
              itself never shows — `data-mark-ref` names the bar that answers for it, and the format
              keeps such a point transparent. */}
          {readings.map((r) => (
            <circle
              key={r.code}
              className="pt"
              cx={r.cx}
              cy={r.cy}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              data-mark-ref={r.code}
              aria-label={r.detail}
              data-detail={r.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={height} fill="transparent" pointerEvents="all" />
        </svg>

        {/* THE VALUE LABELS, IN A LAYER OF THEIR OWN. Not `.overlay`: `verify-web.mjs` requires every
            word in that layer to be drawn in the DEFAULT view, and three quarters of these belong to
            references nobody has chosen — the same ownership `floor.ts` states when it puts an
            option's earned axis in `.y-axis`. One span per country, riding its own bar's growing
            tip, which is the ONE movement of text this page allows itself and the one the type sheet
            asks for by name; the four figures inside it are `display`-swapped, because a number
            cannot be interpolated and what CAN be is the place it is printed. */}
        <div className="datum-values" aria-hidden="true">
          {rows.map((r, i) => (
            <span
              key={r.code}
              className="end-label"
              data-datum-value={r.code}
              style={{
                ...regs.value,
                color: labelInk,
                // THE ONE COORDINATE WRITTEN INLINE, AND IT IS INLINE ON PURPOSE. An inline style
                // beats every generated rule, which is exactly the property wanted here: `left` is
                // the option's to move and `top` is nobody's. A row never changes height, so the
                // strongest place to say so is the place the stylesheet cannot reach.
                top: `${pct(ROW * i + ROW / 2, height)}%`,
              }}
            >
              {states.map((state) => (
                <i
                  key={state.slug}
                  data-datum-num={state.slug}
                  style={{ fontStyle: "normal" }}
                >
                  {state.values.find((v) => v.key === r.code)!.label}
                </i>
              ))}
            </span>
          ))}
        </div>

        <div className="overlay" aria-hidden="true">
          {/* THE NOTE ON THE SUBJECT, DRAWN UNCONDITIONALLY AND WORDED SO THAT IT CAN BE. It carries
              no number, because a number here would belong to one reference and this note has to be
              true in all three. It sits on the subject's OWN row, on the right of the rule, which is
              the one strip of this frame no state of the page ever draws into: Croatia's neighbours
              at rows 15 and 17 are at −0,19 and −0,54 under the widest-right option, and Croatia's
              own largest right-hand excursion is +0,03 t. */}
          <span
            className="note"
            style={{
              ...regs.annot,
              left: "57%",
              top: `${pct(ROW * rows.findIndex((r) => r.code === subject) + ROW / 2, height)}%`,
              transform: "translateY(-50%)",
              whiteSpace: "normal",
              maxWidth: "min(40%, 20em)",
            }}
          >
            {subjectNote}
          </span>
        </div>

        <div className="x-axis">
          {xTicks.map((t) => (
            <span
              key={t}
              className="axis-label x"
              style={{ ...regs.axis, left: `${pct(centre + (t / span) * centre, FRAME.width)}%` }}
            >
              {t === 0 ? "0" : `${t > 0 ? "+" : "−"}${Math.abs(t).toLocaleString("fr-FR")}`}
            </span>
          ))}
        </div>
      </div>

      {/* WHICH SIDE MEANS WHAT IS IN THE CAVEAT, IN WORDS AND NOT IN ARROWS, AND ON THE SAME LINE AS
          the rest of the frame's terms. `←` and `→` are in no house family — the sans ladder refused
          all three directions over exactly those two code points, naming them — which is the check
          doing its job; and a paragraph of its own cost 38 CSS pixels of a phone window this beat
          overflowed by 108. Two problems, one fix. */}
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{source}</p>
    </figure>
  );
}
