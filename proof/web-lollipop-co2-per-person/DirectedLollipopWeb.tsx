/**
 * The six largest CO₂ emitters, per person, in 2000 and 2023, drawn as paired lollipops THROUGH the
 * design base and delivered as an interactive page.
 *
 * WHAT A LOLLIPOP PAIR SAYS THAT A DUMBBELL DOES NOT. A dumbbell draws the GAP between two states and
 * says nothing about how far either end is from nothing; a lollipop pair draws each state as its own
 * stem FROM ZERO, so the two LEVELS are the first reading and the gap the second. On this data that
 * is the claim — the American and Chinese averages are now within a factor of two, which is a
 * sentence about levels.
 *
 * `two-states-of-one-measure-are-one-hue-at-two-chromas` — the earlier state is a lighter tint of the
 * later state's own hue. Not grey, not a second hue: the same hue, lighter, so a pair reads as one
 * subject in two states rather than as two subjects.
 *
 * `every-bar-labelled-lets-the-axis-go` — both values are printed above their own heads, so the page
 * carries a zero line and its unit rather than a full value axis.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT THE TOOLTIP. The still fixes two endpoints the author chose: 7,5
 * then, 1,7 now, China against the United States. And the drawn order hides the thing a per-person
 * chart is for — these six are ranked by TOTAL emissions, so India is third on the plate and last of
 * the six per person. The reader lays one country's own two levels flat across the other five
 * (`level.ts`, `y` marks, unwidened) and gets back what that order buries: three of the six changed
 * level rank in twenty-three years, and Japan's average now sits BETWEEN where China was in 2000 and
 * where China is in 2023.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, noteAnchor, fitY } from "#shared/design-base/web.mjs";
import {
  assertLevelDeclaration,
  levelCss,
  levelChromeCss,
  levelOptionsForMarkup,
  levelNotesForMarkup,
  levelRulesForMarkup,
  type LevelDeclaration,
} from "../../skills/chart-web/assets/level.ts";

export const FRAME = { width: 840, height: 360 };
const SCOPE = ".chart-figure";
const LEVEL_ID_PREFIX = "chart-level";
/** The two series this beat draws, in the order the eye meets them. `level.ts` calls them series;
 *  here they are the two dated states of one measure, and every yardstick option owes a rule on
 *  each — a reference on one of them would answer half the question. */
export const SERIES = ["before", "after"] as const;
/** The fraction of the span left above the tallest stem, so its printed figure has ground to sit on. */
export const HEADROOM = 0.14;

/**
 * THE HEAD IS DRAWN IN HTML, AT A FIXED CSS SIZE — this format's own split, not an exception to it.
 *
 * `render-web.mjs` states the split the page is built on: the `<svg>` carries GEOMETRY ONLY and
 * stretches with its container (`preserveAspectRatio="none"`), while every word is HTML positioned
 * by `%` at a FIXED pixel size. Geometry stretches; type does not. A `<circle>` inside that svg is
 * therefore an ELLIPSE at every container aspect but one — measured at 1400 x 900 this beat's heads
 * came out 22,5 x 23,4 px, 0,96:1, and further off at other widths — and NO RADIUS COMPUTED AT
 * BUILD TIME CAN CORRECT IT, because the stretch is a function of a container the build never sees.
 *
 * A lollipop's head is not geometry. It is a MARK OF FIXED SIZE, exactly as the 3 px stems already
 * are: `vectorEffect="non-scaling-stroke"` is that same decision taken for a length instead of for
 * an area. So the head is drawn where fixed sizes live — in the `.overlay`, positioned by `%` like
 * the value labels beside it — and it is round at 320 px and at 1920.
 *
 * WHY 12 AND NOT THE 23 px THE STRETCH GAVE AT 1400. A fixed head has to hold at the NARROW end
 * too: the two heads of a pair sit `2 * off` apart, which is 4,33 % of the plot's width, so at a
 * 375 px window their centres are 14,2 px apart. 12 px leaves 2,2 px of ground between the two
 * fills there and reads as four stem-widths across — a proportion the 5,5 px head the stretch gave
 * at that width never had.
 */
const HEAD_PX = 12;
/** The head's ground casing, as a RING of CSS pixels around the fill. THE SEPARATION THE COLOURS
 *  CANNOT PROVIDE: a head filled with the colour its own stem is stroked with measures 1,00:1
 *  against it, which is what this beat shipped. See `PALETTE.md`, "the head that was not there". */
const HEAD_CASING_PX = 2;
/** The whole mark, casing included: the box the `.overlay` span occupies AND the viewBox of the
 *  head's own 1:1 svg, so one number is both and nothing has to be reconciled. */
const HEAD_BOX_PX = HEAD_PX + HEAD_CASING_PX * 2;
/** Between the top of a head's casing and the bottom of its own printed value. THE CLEARANCE IS NOW
 *  ARITHMETIC IN ONE UNIT — head and label are both CSS pixels in the same layer — rather than a
 *  guess taken across a stretch: the label shipped at -8 px against a head whose drawn radius at
 *  1400 x 900 was 11,7, and the two overlapped by 4 px, which is what the owner saw. */
const LABEL_GAP_PX = 4;
const STEM_PX = 3;
const RING_PX = 1.6;
const RULE_PX = 1.4;
const RULE_CASING_PX = 4;
const RULE_DASH = "2 5";
const REVEAL_MS = 220;
/** THE ONE EMPHASIS WEIGHT THIS ROW HAS, and it is one rather than two. The subject's own name and
 *  the name the reader lights with the yardstick are the same kind of emphasis, so they are the same
 *  weight; 600 is a real step above every direction's own axis weight (500 in creme, 400 in rapport
 *  and nocturne) and is an embedded face in all three, which a weight the ladder did not choose
 *  would not be. */
const EMPHASIS_WEIGHT = "600";
/** The shared sheet drops the label row 6 px below the plot (`.axis-label.x { top: 6px }`), and the
 *  last line needs air under it before the reading line. Both, in reader pixels. */
const AXIS_ROW_PAD = 6 + 4;

export type Pair = {
  code: string;
  name: string;
  before: number;
  after: number;
  beforeLabel: string;
  afterLabel: string;
  changeLabel: string;
  rising: boolean;
  detail: string;
};

const pct = (value: number, extent: number) => (value / extent) * 100;

/**
 * THE ONE SCALE, SHARED BY BOTH CALLERS. The runner places each yardstick option's two references in
 * the geometry's own units and the component draws the heads at the same numbers; deriving that
 * twice is how a reference ends up beside the mark it claims to sit on rather than on it.
 */
export const scaleFor = (yTicks: number[]) =>
  fitY(0, yTicks[yTicks.length - 1], FRAME.height, HEADROOM);

export function DirectedLollipopWeb({
  pairs,
  subject,
  yTicks,
  unit,
  stateLabels,
  levels,
  interaction: _interaction,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  rule,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
  measure,
}: {
  pairs: Pair[];
  subject: string;
  yTicks: number[];
  unit: string;
  stateLabels: { before: string; after: string };
  levels: LevelDeclaration;
  interaction?: unknown;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  rule: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
  measure: (text: string, options: { fontSize: number; fontWeight?: unknown; fontFamily?: string }) => number;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  // ONE HUE, TWO CHROMAS: the two stems are two DATED STATES of one measure, never two categories.
  // The tint goes as far toward the ground as the non-text floor allows — a past nobody can see is
  // not a state, it is an absent mark. `PALETTE.md` carries the measurement.
  let tint = mix(accent, ground, 0.58);
  if (contrast(tint, ground) < NON_TEXT_CONTRAST_MIN)
    tint = adjustToContrast(tint, ground, NON_TEXT_CONTRAST_MIN) ?? tint;
  const baseline = mix(ground, ink, 0.75);
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const subjectInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;

  /**
   * A HEAD IS THE ONE THING A LOLLIPOP HAS THAT A BAR DOES NOT, AND THIS BEAT DREW IT INVISIBLE.
   *
   * The dot was filled with the very colour its own stem was stroked with: 1,00:1, both states, all
   * three directions, so each pair read as two plain bars. The dumbbell pass recorded the same family
   * fact one commit over at 1,023:1, where two marks were clamped independently to the same floor on
   * the same ground; here it is simpler and worse, one colour used twice.
   *
   * No colour fixes it — the head and the stem are ONE state, and a head in another hue would be a
   * second encoding of nothing — so the separation is geometric. The casing is the ground, which
   * means what it has to clear is the stem it interrupts, which is that stem's own contrast against
   * the ground. Measured here rather than assumed.
   */
  const headCasing = ground;
  for (const state of [
    { hue: tint, which: `the ${stateLabels.before} state` },
    { hue: accent, which: `the ${stateLabels.after} state` },
  ]) {
    if (contrast(state.hue, ground) < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `${state.which} is drawn ${state.hue}, ${contrast(state.hue, ground).toFixed(3)}:1 against ` +
          `the ground — under the ${NON_TEXT_CONTRAST_MIN}:1 non-text floor`,
      );
    // The head sits ON its own stem and is filled with the same colour, so the head itself can never
    // separate from it. Only the casing can, and it is the ground.
    if (contrast(headCasing, state.hue) < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `${state.which} draws its head in its own stem's colour (${state.hue}) and the ground casing ` +
          `${headCasing} reaches only ${contrast(headCasing, state.hue).toFixed(3)}:1 against it — ` +
          `under the ${NON_TEXT_CONTRAST_MIN}:1 non-text floor, which leaves a lollipop with no head`,
      );
  }

  /**
   * THE READER'S YARDSTICK IS NOT THE ACCENT. The accent already carries the later state and the
   * subject; a hue that also meant "this is the one I chose" would leave the reader no way to tell
   * the page's claim from their own question — the refusal `web-scatter-income-life-expectancy`
   * states in full and the dumbbell reuses.
   */
  const yardstick = label;
  if (yardstick.toLowerCase() === accent.toLowerCase() || yardstick.toLowerCase() === tint.toLowerCase())
    throw new Error(
      `the reader's yardstick is drawn ${yardstick}, one of the two inks the page spends on the ` +
        `states it compares — that is one channel carrying two arguments that are not the same argument`,
    );
  const ruleCasing = ground;
  // EVERY FILL A REFERENCE CROSSES, MEASURED — not the ground alone. A flat reference spans the whole
  // plot, so it crosses every mark on it.
  for (const fill of [
    { hue: ground, where: "the bare ground" },
    { hue: tint, where: `a ${stateLabels.before} stem or head` },
    { hue: accent, where: `a ${stateLabels.after} stem or head` },
    { hue: grid, where: "a gridline" },
    { hue: baseline, where: "the zero line" },
  ]) {
    const best = Math.max(contrast(yardstick, fill.hue), contrast(ruleCasing, fill.hue));
    if (best < NON_TEXT_CONTRAST_MIN)
      throw new Error(
        `the reader's yardstick crosses ${fill.where} (${fill.hue}) and neither its dash ${yardstick} ` +
          `(${contrast(yardstick, fill.hue).toFixed(3)}:1) nor its casing ${ruleCasing} ` +
          `(${contrast(ruleCasing, fill.hue).toFixed(3)}:1) reaches the ${NON_TEXT_CONTRAST_MIN}:1 ` +
          `non-text floor against it — a reference is laid down to be read WHERE IT CROSSES`,
      );
  }

  if (yTicks[0] !== 0)
    throw new Error(`a lollipop stem is a LENGTH from zero; the ticks handed in start at ${yTicks[0]}`);
  const y = scaleFor(yTicks);
  const band = FRAME.width / pairs.length;
  const cx = (i: number) => band * i + band / 2;
  const off = band * 0.13;

  /**
   * THE YARDSTICK, REFUSED BEFORE IT IS DRAWN. Handed the six pairs the beat actually draws and BOTH
   * of its series, so an option reading its levels off a country that is not on the plate, or laying
   * a reference on one of the two dates and not the other, is caught here and not by a reader.
   *
   * `height` only: on this shape the value axis is VERTICAL, so a chosen country's two levels are
   * references laid FLAT — `level.ts`'s original `y` mark, unwidened. The dumbbell needed `x`
   * because its value axis is horizontal; nothing here needs that, or `angle`.
   */
  assertLevelDeclaration(levels, {
    drawnKeys: pairs.map((p) => p.code),
    drawnSeries: [...SERIES],
    height: FRAME.height,
  });
  const levelOptions = levelOptionsForMarkup(levels, LEVEL_ID_PREFIX);
  const levelNotes = levelNotesForMarkup(levels);
  const levelRules = levelRulesForMarkup(levels);
  for (const r of levelRules)
    if (r.y === undefined)
      throw new Error(
        `the yardstick option ${r.slug} stands its ${r.series} reference up, and on a lollipop the ` +
          `value axis is vertical — an upright would name a COUNTRY, not a level`,
      );

  /**
   * THE LABEL ROW IS MEASURED, NEVER TYPED — and this is the one type whose own sheet names the
   * category-label gutter as its production failure: it "has previously truncated category labels
   * because a fixed gutter was too narrow". This beat typed `xAxisRowPx: 52`.
   *
   * Two lines are certain: the name, and the per-cent change under it. Whether the NAME itself takes
   * one line or two depends on the widest of the six against one band's width in reader pixels —
   * which is fluid, so the build cannot know it and a breakpoint typed in reader pixels would be
   * right for one direction and wrong for the next (creme sets this register at 11 px in a humanist
   * sans; nocturne at 10 px in a geometric one with 1,2 px of tracking). So the build measures the
   * name in the register's OWN face, size and weight — at the subject's 700 as well, which is wider
   * than the rest — and hands the threshold to a container query, which asks THE PLOT and not the
   * viewport.
   */
  const faceOf = (r: any) => ({
    size: Number.parseFloat(r.fontSize as string),
    lead: Number(r.lineHeight),
    family: String(r.fontFamily).split(",")[0].replace(/"/g, ""),
  });
  const axisFace = faceOf(regs.axis);
  const annotFace = faceOf(regs.annot);
  const widestNamePx = Math.max(
    ...pairs.map((p) =>
      measure(p.name, {
        fontSize: axisFace.size,
        fontWeight: p.code === subject ? EMPHASIS_WEIGHT : regs.axis.fontWeight,
        fontFamily: axisFace.family,
      }),
    ),
  );
  const widestChangePx = Math.max(
    ...pairs.map((p) =>
      measure(p.changeLabel, {
        fontSize: annotFace.size,
        fontWeight: regs.annot.fontWeight,
        fontFamily: annotFace.family,
      }),
    ),
  );
  // TWO REGISTERS IN ONE ROW, so its height is both of them. The name is the category axis; the
  // per-cent change is a DERIVED delta and takes the annotation voice, which is a different size in
  // every direction (13 px Merriweather italic in creme against an 11 px Open Sans name).
  const rowFor = (nameLines: number) =>
    Math.ceil(axisFace.size * axisFace.lead * nameLines + annotFace.size * annotFace.lead) + AXIS_ROW_PAD;
  const xAxisRowPx = rowFor(1);
  const xAxisRowWrappedPx = rowFor(2);
  // The plot inline-size at which one band stops holding the widest of the two on one line. `+ 2` is
  // the padding each needs off its neighbour before it is a collision.
  const wrapBelowPx = Math.ceil((Math.max(widestNamePx, widestChangePx) + 2) * pairs.length);

  // THE AXIS REGISTER'S INK AND WEIGHT LEAVE THE INLINE STYLE. An inline `color` beats every
  // generated selector, so with `regs.axis` spread whole the yardstick's own rules could not light a
  // chosen country's name — the correction the grouped bar, the scatter and the dumbbell all made.
  const { color: _axisInk, fontWeight: _axisWeight, ...axisRest } = regs.axis as any;
  const { color: _annotInk, fontWeight: annotWeight, ...annotRest } = regs.annot as any;

  const css = [
    // The default state as rules and never as inline styles — see above. The subject's own accent on
    // its name is drawn in every state of this page except while the reader is holding a yardstick of
    // their own, which is that vocabulary's doctrine.
    `${SCOPE} .x-axis [data-axis] { color: var(--axis-ink); font-weight: var(--axis-weight); }`,
    `${SCOPE} .x-axis [data-axis="${subject}"] { color: var(--subject-ink); font-weight: ${EMPHASIS_WEIGHT}; }`,
    // THE LABEL BOX IS ONE BAND WIDE. Without it an absolutely positioned shrink-to-fit span runs
    // under its neighbour rather than wrapping — the collision this type's sheet is about.
    `${SCOPE} .x-axis [data-axis] { width: ${(100 / pairs.length).toFixed(4)}%; white-space: normal; }`,
    // THE DELTA IS ITS OWN REGISTER BESIDE THE VALUES, which is the treatment the still spends and
    // this page had dropped: the name is the category axis, the per-cent change is a derived reading
    // and takes the annotation voice. It keeps the annot ink in every state — a yardstick dims the
    // NAMES, never a reading the claim is made of — and the subject's own change keeps the accent.
    //
    // NO OPACITY ON A CLAMPED INK. `deriveFurniture` clamps these registers to exactly the text
    // floor; the 0.8 this row shipped delivered 3,89:1 in creme and 3,90:1 in rapport.
    `${SCOPE} .x-axis [data-change] { display: block; color: var(--annot-ink); }`,
    `${SCOPE} .x-axis [data-change="${subject}"] { color: var(--subject-ink); }`,
    // THE HEAD'S OWN BOX, in fixed CSS pixels, centred on the `%` position its `left`/`top` names.
    // `overflow: visible` because a ring straddles the fill's edge and a hair of it would otherwise
    // be clipped by the svg's own viewport.
    `${SCOPE} .overlay .head { position: absolute; width: ${HEAD_BOX_PX}px; height: ${HEAD_BOX_PX}px; transform: translate(-50%, -50%); }`,
    `${SCOPE} .overlay .head > svg { display: block; overflow: visible; }`,
    // THE RING SURVIVES THE MOVE THROUGH INHERITANCE, AND THAT IS ALSO HOW IT STILL CLEARS.
    // `stroke` and `stroke-width` are INHERITED CSS properties and inheritance does not stop at a
    // namespace boundary. `level.ts` sets them on whatever carries `data-col`; here that is the HTML
    // span, and from it they descend into the head's own 1:1 svg and reach the fill circle, which
    // declares no `stroke` of its own and so has nothing to beat inheritance with. The casing circle
    // declares `stroke="none"` and is immune — the same immunity it had as a separate SVG shape and
    // for the same reason: `[data-col] { stroke: none }` would otherwise step the casing back with
    // the ring and re-open the 1,00:1 head-is-its-own-stem collision for five pairs at a time.
    //
    // THE SUBJECT'S DEFAULT RING IS STILL THE ONE THE READER'S OWN CHOICE CLEARS, and it is now a
    // rule rather than the presentation attribute it was, because HTML has no presentation
    // attribute to be. So it is written to LOSE, which is what specificity zero bought before:
    // (0,4,0) against `level.ts`'s clearing rule at (1,3,0) — one id inside `:has()` outranks any
    // number of classes — so picking a yardstick takes this ring off exactly as it used to, and the
    // lit rule (1,3,0, emitted after the clearing one) puts the ring on the country the READER
    // chose. Measured rather than assumed: the mutation is below, in the verification.
    `${SCOPE} .head[data-col="${subject}"][data-head="${SERIES[1]}"] { stroke: var(--subject-ring); stroke-width: ${RING_PX}; }`,
    // THE PAIR STILL LIGHTS AS A HALO RATHER THAN AS A FILL. The shapes the reading is about are the
    // two HEADS, and repainting them would delete the two chromas the page spends on the two dates,
    // so what takes ink is each head's ground CASING and `data-mark` is still the thing on it.
    //
    // WHAT CHANGED IS WHO CARRIES THE CLASS. `interaction.mjs` resolves a point's marks with
    // `svg.querySelectorAll('[data-mark=...]')`, scoped to the plot's own svg — so once the casings
    // are HTML that query returns nothing and `.mark-active` is never added to them. That file is
    // shared by every web beat and is not this beat's to widen, so the bridge is CSS: the same
    // script already puts `.pt-active` on the pointed point, and `:has()` on their common ancestor
    // carries it across to the sibling overlay. Same trigger, same ink, no second script — and with
    // JavaScript off nothing lights, which is what happened before the move too.
    ...pairs.map(
      (p) =>
        `${SCOPE} .chart-plot:has(.pt[data-mark-ref="${p.code}"].pt-active) ` +
        `.head[data-col="${p.code}"] [data-mark] { fill: var(--mark-active); }`,
    ),
    // A head takes no ring until the page's own subject rule or a reader asks for one.
    levelChromeCss({ scope: SCOPE }),
    `${SCOPE} .chart-level { margin-top: 4px; }`,
    // The reserved sentence opens 2 px under the pills rather than 4. Same reason as the line above:
    // at 375 x 812 this beat's chrome and its display register together have 3 px of slack, and the
    // window-fit rule is not negotiable.
    `${SCOPE} .level-notes { margin-top: 2px; }`,
    levelCss(levels, {
      scope: SCOPE,
      idPrefix: LEVEL_ID_PREFIX,
      lit: { ink: "var(--ink)", weight: EMPHASIS_WEIGHT, ring: "var(--ink)", ringWidth: RING_PX },
      dim: { ink: "var(--muted)", weight: String(_axisWeight ?? 400) },
      revealMs: REVEAL_MS,
    }),
    // THE PLOT ANSWERS, NOT THE VIEWPORT. Below the width at which one band holds the widest name,
    // the name takes a second line and the row is given it — so nothing is clipped and nothing
    // overlaps, at any width, in any direction.
    `@container (max-width: ${wrapBelowPx}px) {`,
    `  ${SCOPE} .chart-plot { --x-axis-h: ${xAxisRowWrappedPx}px; }`,
    `}`,
  ].join("\n\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--axis-ink" as string]: _axisInk,
        ["--axis-weight" as string]: String(_axisWeight ?? 400),
        ["--annot-ink" as string]: _annotInk,
        ["--subject-ink" as string]: subjectInk,
        ["--mark-active" as string]: label,
        // The subject's ring. A custom property because `levelCss` takes its own ring the same way
        // and a direction that changes its ink changes both together.
        ["--subject-ring" as string]: label,
        // THE PLOT IS ASKED, NOT THE VIEWPORT — and it is asked here, on the figure, because a
        // container query styles a container's DESCENDANTS and `--x-axis-h` lives on the plot. An
        // `inline-size` container is queried on its CONTENT box, which is exactly the plot's width:
        // the plot is the figure's full-width flex item.
        ["containerType" as string]: "inline-size",
        ...figureVars(regs),
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE LEGEND. Two dates, two chromas of one hue — lose it and the pair degrades into two
          colours of dot with no stated meaning. Each swatch carries the same ground casing its heads
          do, so the key shows the mark the plot actually draws.
          IT IS AN ANNOTATION, NOT AN AXIS. It says what a colour MEANS; it does not name a position.
          So it takes the annotation voice, which is the same voice the per-cent change under each
          name, the selection rule and the yardstick's own year labels take — every one of them
          something the page says ABOUT the pairs rather than a label on one of its axes. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 18px", margin: "6px 0 2px", flex: "0 0 auto" }}>
        {[{ c: tint, t: stateLabels.before }, { c: accent, t: stateLabels.after }].map((k) => (
          <span key={k.t} style={{ ...regs.annot, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: HEAD_PX,
                height: HEAD_PX,
                background: k.c,
                boxShadow: `0 0 0 ${HEAD_CASING_PX}px var(--ground)`,
                display: "inline-block",
                borderRadius: "50%",
              }}
            />
            {k.t}
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>` — a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it — and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from the picture. Each accessible name CONTAINS its visible one (WCAG 2.5.3),
          which `assertLevelDeclaration` refuses the declaration without. */}
      <fieldset className="chart-level">
        <legend>{levels.label}</legend>
        <div className="options">
          {levelOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-level"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — the level rank the total-emissions order hides,
          the headline's own arithmetic generalised to the country the reader picked, and which of the
          five others sit between its two levels today. Its row is reserved whether or not an option
          is chosen, so choosing one never moves the plot underneath it. */}
      <div className="level-notes" role="status">
        {levelNotes.map((note) => (
          <p data-level-note={note.slug} key={note.slug}>{note.text}</p>
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
          viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
          preserveAspectRatio="none"
        >
          <desc>{alt}</desc>
          <rect x={0} y={0} width={FRAME.width} height={FRAME.height} fill={ground} />

          {yTicks.slice(1).map((t) => (
            <line key={t} x1={0} x2={FRAME.width} y1={y(t)} y2={y(t)} stroke={grid} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}

          {/* EVERY OPTION'S REFERENCES, DRAWN ONCE AT THEIR OWN HEIGHT AND HIDDEN. The stylesheet only
              reveals them; nothing here emits a transform, which is what keeps `interaction.mjs`'s
              resolution honest — it reads `cx` once at init and a CSS transform never changes it.
              Each is TWO lines carrying the same `data-level-rule`, so the generated `opacity: 1`
              reveals both: the ground casing first, then the dash on top of it, same dash pattern, so
              the casing shows only under the dashes. Drawn BEFORE the stems, so a reference is
              interrupted where a stem crosses it and nowhere else. */}
          {levelRules.map((r) => (
            <g key={r.key}>
              <line
                data-level-rule={r.key}
                x1={0}
                x2={FRAME.width}
                y1={r.y}
                y2={r.y}
                stroke={ruleCasing}
                strokeWidth={RULE_CASING_PX}
                strokeDasharray={RULE_DASH}
                vectorEffect="non-scaling-stroke"
              />
              <line
                data-level-rule={r.key}
                x1={0}
                x2={FRAME.width}
                y1={r.y}
                y2={r.y}
                stroke={yardstick}
                strokeWidth={RULE_PX}
                strokeDasharray={RULE_DASH}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}

          {/* THE STEMS AND NOTHING ELSE. The heads used to be drawn here and are now in the
              `.overlay` — see `HEAD_PX` — so this layer is pure geometry, which is the only thing
              `preserveAspectRatio="none"` may be handed: a length stretches and stays a length, an
              area stretches and stops being a circle. The stems already refused the stretch on the
              one axis that would have shown (`non-scaling-stroke`, so 3 px at every width); their
              LENGTH is the reading and it still scales with the plot, as it must. */}
          {pairs.map((p, i) => (
            <g key={p.code}>
              <line x1={cx(i) - off} x2={cx(i) - off} y1={FRAME.height} y2={y(p.before)} stroke={tint} strokeWidth={STEM_PX} vectorEffect="non-scaling-stroke" />
              <line x1={cx(i) + off} x2={cx(i) + off} y1={FRAME.height} y2={y(p.after)} stroke={accent} strokeWidth={STEM_PX} vectorEffect="non-scaling-stroke" />
            </g>
          ))}

          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={baseline} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />

          {/* ONE READING PER PAIR, resolved by x alone — the six sit at six evenly spaced band
              centres, so the nearest point IS the pair the pointer is over and this plate needs
              none of `data-hit="cell"`'s Euclidean arithmetic. `data-mark-ref` names the shapes that
              answer for it, so the point itself stays invisible instead of dropping a grey disc
              larger than either head between the two stems. */}
          {pairs.map((p, i) => (
            <circle
              key={p.code}
              className="pt"
              data-mark-ref={p.code}
              cx={cx(i)}
              cy={y(Math.max(p.before, p.after))}
              r={9}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={p.detail}
              data-detail={p.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {/* THE TWELVE HEADS, IN HTML, AT A FIXED SIZE — the fix this file's `HEAD_PX` states in
              full. Each is one span positioned by `%` on the same two numbers the stem it caps was
              drawn from, so it lands on the geometry however the plot is stretched, and it carries
              its own tiny 1:1 svg rather than a `border-radius` div for one reason: `data-mark` has
              to stay on a shape whose `fill` the format's own `--mark-active` can paint, and the
              ring has to reach a shape that can be STROKED, which is how `level.ts`'s generated
              rules still reach it — through inheritance, from the span that carries `data-col`.
              Drawn BEFORE the labels, so where one ever meets a head the label's ground chip is on
              top rather than under it. */}
          {pairs.flatMap((p, i) =>
            [
              { state: SERIES[0], value: p.before, hue: tint, x: cx(i) - off },
              { state: SERIES[1], value: p.after, hue: accent, x: cx(i) + off },
            ].map((head) => (
              <span
                key={`${p.code}-${head.state}`}
                className="head"
                data-col={p.code}
                data-head={head.state}
                style={{
                  left: `${pct(head.x, FRAME.width)}%`,
                  top: `${pct(y(head.value), FRAME.height)}%`,
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={HEAD_BOX_PX}
                  height={HEAD_BOX_PX}
                  viewBox={`0 0 ${HEAD_BOX_PX} ${HEAD_BOX_PX}`}
                >
                  {/* The casing, as a filled disc and never as the fill's stroke — see the css. */}
                  <circle
                    data-mark={p.code}
                    cx={HEAD_BOX_PX / 2}
                    cy={HEAD_BOX_PX / 2}
                    r={HEAD_BOX_PX / 2}
                    fill={headCasing}
                    stroke="none"
                  />
                  {/* No `stroke` of its own, deliberately: that is what leaves the ring to whatever
                      `level.ts` — or this beat's own subject rule — sets on the span above it. */}
                  <circle cx={HEAD_BOX_PX / 2} cy={HEAD_BOX_PX / 2} r={HEAD_PX / 2} fill={head.hue} />
                </svg>
              </span>
            )),
          )}
          {pairs.map((p, i) => (
            <span key={p.code}>
              {/* EVERY PRINTED VALUE IS IN INK. `references/types/lollipop.md` names this type's own
                  shipped bug: the accent carried into the value label beside the dot "for visual
                  consistency". The label carries the value, the mark carries the hue, and the two are
                  never the same colour — which element is TEXT is what decides it, not what it sits
                  beside. The subject is identified by the ring on its head and by its name.

                  AND IT CLEARS ITS OWN HEAD BY ARITHMETIC, not by a number that looked right once.
                  `-100%` puts the label's bottom edge on the head's CENTRE, so what it owes is the
                  head's radius plus a gap — and both are CSS pixels in this same layer now, which
                  is the second thing moving the head out of the stretched svg bought. At -8 px
                  against a head the stretch had grown to 11,7 px of radius, the two overlapped by
                  4 px; the owner read it as the label hiding the dot, which is what it was. */}
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: label,
                  left: `${pct(cx(i) - off, FRAME.width)}%`,
                  top: `${pct(y(p.before), FRAME.height)}%`,
                  transform: `translate(-50%, -100%) translateY(-${HEAD_BOX_PX / 2 + LABEL_GAP_PX}px)`,
                }}
              >
                {p.beforeLabel}
              </span>
              <span
                className="end-label"
                style={{
                  ...regs.value,
                  fontSize: `${Math.max(11, Number.parseFloat(regs.value.fontSize as string) - 2)}px`,
                  color: label,
                  left: `${pct(cx(i) + off, FRAME.width)}%`,
                  top: `${pct(y(p.after), FRAME.height)}%`,
                  transform: `translate(-50%, -100%) translateY(-${HEAD_BOX_PX / 2 + LABEL_GAP_PX}px)`,
                }}
              >
                {p.afterLabel}
              </span>
            </span>
          ))}
          <span className="note" style={{ ...regs.annot, color: label, ...noteAnchor(1), top: "1%" }}>
            {rule}
          </span>

          {/* WHICH REFERENCE IS WHICH YEAR, WRITTEN ON THE PLOT. Two flat rules at one country's two
              levels are not self-describing: China's lower rule is its 2000 level and Japan's lower
              rule is its 2023 one, and which is which is readable off their order only because this
              beat ASSERTS that the subject rose — an assertion in the runner is not a label on the
              plot.

              NOT THE COUNTRY'S NAME, which is a subtraction rather than an omission: the reader just
              pressed a pill carrying it, its name in the label row takes full ink the moment they do,
              and its own two heads are ringed.

              THEY GROW AWAY FROM EACH OTHER ON THE AXIS THE RULES DO NOT USE. Both sit above their
              own rule, so a country whose two levels are close (Russia's are 6,4 % of the frame
              apart) never stacks them; and one is anchored at the left frame edge, the other at the
              right, so they cannot meet horizontally whatever the two levels are. Each carries the
              format's own ground chip, so where one covers the first or last stem it is read over it
              rather than tangled in it. */}
          {levelRules.map((r) => {
            const isBefore = r.series === SERIES[0];
            return (
              <span
                key={`${r.key}-end`}
                className="note"
                data-level-rule={r.key}
                style={{
                  ...regs.annot,
                  color: yardstick,
                  top: `${pct(r.y as number, FRAME.height)}%`,
                  ...(isBefore ? { left: 0 } : { right: 0 }),
                  transform: "translateY(-100%) translateY(-2px)",
                }}
              >
                {isBefore ? stateLabels.before : stateLabels.after}
              </span>
            );
          })}
        </div>

        {/* The label row is furniture, not a control: without this its spans are the topmost element
            wherever one crosses the plot, and the hit area never sees the pointer. */}
        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {pairs.map((p, i) => (
            <span
              key={p.code}
              className="axis-label x"
              data-axis={p.code}
              style={{ ...axisRest, left: `${pct(cx(i), FRAME.width)}%`, textAlign: "center" }}
            >
              {p.name}
              <span data-change={p.code} style={{ ...annotRest, fontWeight: annotWeight }}>
                {p.changeLabel}
              </span>
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "8px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "4px 0 0" }}>{`${source} · ${unit}`}</p>
    </figure>
  );
}
