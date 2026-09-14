/**
 * The ten countries that emitted the most CO₂ in 2024, drawn as columns THROUGH the design base and
 * delivered as an interactive page. The `bar and column` beat of this tree's web format.
 *
 * WHAT THE WEB ADDS TO A RANKING, AND WHY IT IS NOT THE PLATE REPEATED. Ten bars is few enough that
 * a static plate can label every one, so "hover to see the value" would be the same numbers a second
 * time — the repetition `web-discipline.md` refuses outright. Two readings are added instead, and
 * neither is a number the plate holds:
 *
 *   1. FOR ONE COLUMN, ASKED: its share of the world total, and how many of the countries BELOW it
 *      in the same ranking must be added together before they match it — the headline's own
 *      arithmetic asked of all ten, computed server-side over the full 215-country ranking.
 *   2. FOR ONE COLUMN, BUILT: the reader chooses a reference and the countries below it LEAVE THEIR
 *      BANDS AND STACK ON EACH OTHER beside it, one on top of the next, until the tower reaches or
 *      passes its height. The still asserts that comparison once, for China, with a bracket; the
 *      scrolly performs it for the reader as a sequence; this is the only one of the three where
 *      the reader picks the reference and watches the addition happen.
 *
 * THE FIXED BRACKET IS GONE, AND ITS REMOVAL IS THE POINT. It spanned the five columns the headline
 * adds up and captioned them with their sum — the answer, pre-made, standing exactly where the
 * reader's own comparison had to be built. A still should draw it and does. Here it was furniture
 * doing the reader's work, so the control replaced it rather than joining it.
 *
 * NO SCRIPT DOES ANY OF THAT. The control is native radios in a `<fieldset>` plus CSS generated at
 * build time — `:checked` and `:has()`, the same mechanism `chart-web/assets/filter.ts` narrows
 * with. For each option the build emits the `translate()` that carries each needed follower onto the
 * tower, in `viewBox` units so it tracks the geometry at every width; the fills; the value labels
 * that go with the columns they belong to, and drop from above a column's top to the middle of its
 * own segment by one `calc()` over the flag that says it is riding; the sum the tower comes to,
 * printed at its top, because an addition whose answer is only in a caption is one a reader looking
 * at the picture is asked to take on faith; and the sentence under the control. With
 * JavaScript off the control works identically, and with nothing chosen the page IS the complete
 * ranking — which is the state it ships in and the state a reader with no script never leaves.
 *
 * `every-bar-labelled-lets-the-axis-go` — every column prints its own number, so the page carries a
 * zero baseline and a stated unit instead of a value axis. A length encoding still needs its zero
 * and it has one; what it does not need is a ruler nobody reads once every bar is written.
 *
 * `accent-marks-the-thread`, SPENT TWICE — once by the author and once by the reader. At rest the
 * accent is on the subject alone and the other nine are one neutral step off the direction's own
 * ground. Under a chosen option it is on the reference and on the columns stacked against it, and
 * everything else — the default subject included — steps back to that same neutral. Still one
 * accent, still one thread; the thread is now the comparison the reader asked for.
 *
 * THIS TYPE'S TRAP, IN THE FORM IT TAKES HERE. `references/types/bar-and-column.md` names one trap: a
 * value label printed inside or against a coloured bar needs its contrast measured against THAT EXACT
 * FILL, and a naive luminance threshold mis-picks white on a mid-toned hue. Its literal form is absent
 * by construction — every value is printed on the GROUND, never on a fill, which is the side-step the
 * static sibling records — so `inkOnFill`, the repertoire's own implementation of the remedy, is not
 * reached for and is not claimed. That stayed true when the figures started riding onto the tower:
 * the format's `.end-label` carries `background: var(--ground)`, so a figure sitting in the middle of
 * an accent-filled segment is ink on the direction's own ground, which is the pair already measured.
 * A label brings its own ground with it. Its REASON survives, and it was open: three things here are set
 * in the accent as TYPE (the eyebrow, whose register reads its ink from the accent; a value label;
 * a name on the x-axis), and an accent is chosen to clear the 3:1 mark floor while 11px type is held
 * to 4.5:1. Nothing measured the difference. It is measured below, and ASSERTED rather than adjusted
 * — `adjustToContrast` walks a colour 2 % toward a pole even when it already passes, so adjusting
 * would darken three accents that are correct. The control makes that assertion carry FURTHER than
 * it used to: under an option the accent sets a name and a value on whichever column the reader
 * chose, so it is nine more places the same one measurement now covers.
 *
 * WHERE THE COLOURS OF A WORD LIVE, AND WHY THEY MOVED OUT OF THE INLINE STYLE. They used to be
 * written on each label as `color: code === subject ? accent : ink`. An inline style beats every
 * selector there is, so the generated rules could not have stepped the default subject back when the
 * reader chose another reference — the picture would have carried two accents, one of them stale.
 * The default state is now expressed as two rules in this component's own stylesheet, at a
 * specificity the option rules clear by an id, so "what the plate looks like untouched" and "what it
 * looks like under an option" are the same mechanism reading the same custom properties.
 */

import {
  mix,
  contrast,
  adjustToContrast,
  assertLegible,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import {
  assertStackDeclaration,
  stackCss,
  stackChromeCss,
  stackNotesForMarkup,
  stackOptionsForMarkup,
  stackTotalsForMarkup,
  type StackDeclaration,
} from "../../skills/chart-web/assets/stack.ts";

export const FRAME = { width: 900, height: 420, xAxisRowPx: 34 };

/** This format's own scope selector, and the id prefix the stack's radios take. The two arguments
 *  `stack.ts` refuses to guess, for the reason `filter.ts` refuses to guess them. */
const SCOPE = ".chart-figure";
const STACK_ID_PREFIX = "chart-stack";

/** How far each value label stands off the top of its own column, in CSS pixels. */
const LABEL_OFFSET_PX = 4;

/**
 * WHAT A COLUMN BECOMES UNDER THE READER'S POINTER, and why it is a step TOWARD THE INK.
 *
 * The format used to answer a pointer by filling the `.pt` circle at the mark's top, which on a
 * column is a grey dot floating over the chart. It now lights the column itself
 * (`interaction.mjs` → `.mark-active` → `--mark-active`), and this is the number behind that
 * colour. It is NOT a `filter: brightness()`: brightness lightens on a cream ground and on a navy
 * one alike, so on `nocturne` it would push a mint accent toward white — off the ground it is
 * supposed to stand on — while on `creme` it would wash a blue toward the paper.
 *
 * Mixing toward the direction's OWN INK is the one step that is correct in every direction,
 * because ink is by definition the pole furthest from the ground: it DARKENS on a light ground and
 * LIGHTENS on a dark one, and it can only raise the mark's contrast against the ground, never
 * lower it. The alternative — stepping toward the ground — was measured and refused: it takes the
 * neutral to 2.34 : 1 (creme), 2.97 : 1 (nocturne) and 2.35 : 1 (rapport), under the 3 : 1 mark
 * floor, so a reader pointing at a column would have made it harder to see, not easier.
 *
 * 0.30 is the smallest step that clears BOTH assertions below in all three directions. Measured,
 * over the six (direction, fill) pairs this beat actually draws:
 *
 *   creme    accent  #1757B6 → #103d7f   step 1.541 : 1   ΔE 19.2   10.23 : 1 on the ground
 *   creme    neutral #918f87 → #66645f   step 1.825 : 1   ΔE 17.0    5.74 : 1
 *   nocturne accent  #4FE0C0 → #84e9d3   step 1.143 : 1   ΔE 12.6   12.34 : 1
 *   nocturne neutral #787795 → #a1a0b5   step 1.686 : 1   ΔE 16.5    6.95 : 1
 *   rapport  accent  #1F5C8B → #164061   step 1.527 : 1   ΔE 14.1   10.82 : 1
 *   rapport  neutral #919191 → #666666   step 1.822 : 1   ΔE 17.0    5.74 : 1
 *
 * (ΔE is CIE76 in Lab, quoted because a contrast RATIO is a poor measure of a change between two
 * colours of similar luminance — nocturne's mint is the case, and its 12.6 is five times the ~2.3
 * just-noticeable difference. The ratio is what is ASSERTED, because it is what this tree already
 * measures with.)
 */
const MARK_ACTIVE_STEP = 0.3;

/** How different the pointed-at fill must be from the fill it replaces. The weakest of the six
 *  measured steps above is nocturne's accent at 1.143 : 1, and this floor sits just under it — so a
 *  direction whose accent leaves LESS headroom than nocturne's refuses here rather than shipping a
 *  hover a reader cannot see. */
const MARK_ACTIVE_MIN_STEP = 1.12;

/** How long a column takes to reach the tower. Honoured only under `prefers-reduced-motion:
 *  no-preference` — `stack.ts` puts the whole transition inside the query rather than overriding it
 *  back, so under `reduce` there is no transition to resolve at all. */
const MOVE_MS = 420;

export type Column = {
  code: string;
  name: string;
  gt: number;
  label: string;
  /** The detail this page exists to add — already a sentence, formatted in the runner. */
  detail: string;
};

/** What the runner declares: the words and the arithmetic, with the run named by KEY. The geometry
 *  — where each column goes — is this component's, because this component is what knows the scale. */
export type StackPlan = {
  label: string;
  noneLabel: string;
  options: {
    key: string;
    label: string;
    announce: string;
    note: string;
    /** What the tower adds up to, in the runner's own words — printed at the tower's top. */
    total: string;
    /** The same sum as a number, so this component can check the words against what it DRAWS.
     *  The runner derives it from the full 215-country ranking; the tower is built out of the ten
     *  columns on this plate. They must be the same number, and nothing but this says so. */
    totalGt: number;
    onto: string[];
  }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedColumnsWeb({
  columns,
  subject,
  stackPlan,
  top,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  unit,
  reading,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  columns: Column[];
  subject: string;
  stackPlan: StackPlan;
  top: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  unit: string;
  reading: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  if (!columns.some((c) => c.code === subject))
    throw new Error(`the subject ${subject} is not among the columns drawn`);

  // THE TRAP'S REASON, CLOSED BY MEASUREMENT — see the header. The accent is not only a fill here: it
  // sets the eyebrow, a value label and a name on the axis. Type is held to 4.5:1, a mark to 3:1, and
  // a direction that clears the second does not automatically clear the first.
  assertLegible(accent, ground, {
    role: "text",
    where: `${direction.id ?? "this direction"}'s accent, which this beat sets type in`,
  });

  // The columns that are not lit. One neutral, taken to the non-text floor against the ground so a
  // column is never a shape the reader has to guess at.
  let neutral = mix(ground, ink, 0.42);
  neutral = adjustToContrast(neutral, ground, NON_TEXT_CONTRAST_MIN) ?? neutral;
  const baseline = mix(ground, ink, 0.75);
  const labelInk = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  // WHAT A COLUMN TAKES UNDER THE READER'S POINTER — see MARK_ACTIVE_STEP for the rule and the six
  // measurements. Asserted in both directions and never adjusted: a step that does not clear the
  // mark floor is a hover that hides the column, and a step a reader cannot see is no answer at all.
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
          "the column would answer a pointer with a change nobody can see, which is the defect the " +
          "floating dot it replaced at least did not have",
      );
    return lifted;
  };
  const accentActive = activeOf(accent, "accent");
  const neutralActive = activeOf(neutral, "neutral");

  /**
   * HOW TALL A SEGMENT MUST BE TO CARRY ITS OWN FIGURE, in CSS pixels, and it is the ONE number a
   * container query decides on rather than the build.
   *
   * MEASURED, NOT CHOSEN: the `.end-label` pill is one line of the value register plus the format's
   * own 1px of padding above and below, so its height is `fontSize × lineHeight + 2`. Two more
   * pixels are added so a printed figure still leaves the 1px seam at each end of its segment
   * visible — a pill that swallows its own seam is a ground-coloured band where a country was.
   *
   * AND WHY A QUERY AT ALL, which is the finding behind this whole rule. The plot's height in CSS
   * pixels is NOT a function of its width: `.chart-figure` carries `max-height: 100dvh` and
   * `.chart-plot` is the one shrinkable item under it, so the same 1232px-wide plot measures 402px
   * tall in a 720px window and 582px in a 900px one (measured on the delivered page). No `@media`
   * and no `@container (inline-size)` can therefore know whether a segment holds a 20px figure, and
   * a number frozen at build time would be right at one size and wrong at every other. A SIZE
   * container per column — the box IS the segment, at every width and every window height — is the
   * only thing that can answer it, and it answers it with no script, which this control requires.
   */
  const labelFitsPx =
    Math.ceil(parseFloat(regs.value.fontSize) * Number(regs.value.lineHeight)) + 2 + 2;

  const band = FRAME.width / columns.length;
  const barW = band * 0.62;
  // HEADROOM for the printed value that sits on top of each column, and for the tallest tower the
  // control can build. Measured, not chosen — and the tower is what makes it load-bearing: China's
  // run of six adds up to MORE than China, so the scale has to hold a column the plate never draws.
  const scaleTop = top * 1.22;
  const y = (gt: number) => FRAME.height - (gt / scaleTop) * FRAME.height;
  const heightOf = (gt: number) => (gt / scaleTop) * FRAME.height;
  const cx = (i: number) => band * i + band / 2;

  // ── the stack's geometry, derived from this component's own scale ────────────────────────────
  const indexOf = new Map(columns.map((c, i) => [c.code, i]));
  /** Where each option's tower stands and how tall it comes out, so the total can be printed at its
   *  top. Filled while the geometry below is derived — never re-derived from the declaration. */
  const towers = new Map<string, { band: number; height: number }>();
  const declaration: StackDeclaration = {
    label: stackPlan.label,
    noneLabel: stackPlan.noneLabel,
    options: stackPlan.options.map((option) => {
      const at = indexOf.get(option.key);
      if (at === undefined)
        throw new Error(`the stack option ${option.key} names a column this beat does not draw`);
      // The tower stands in the band immediately to the right of the reference, so the two tops are
      // side by side and "does it reach?" is a comparison the eye makes without a ruler. That band
      // is the first follower's own, which is why the first member never moves.
      const towerBand = at + 1;
      if (towerBand >= columns.length)
        throw new Error(
          `${option.key} is the last column drawn, so there is no band beside it for a tower — ` +
            "an option stacked against it would build its answer off the frame",
        );
      let cumulative = 0;
      const onto = option.onto.map((code) => {
        const from = indexOf.get(code);
        if (from === undefined)
          throw new Error(`the stack option ${option.key} stacks ${code}, which this beat does not draw`);
        if (from <= at)
          throw new Error(
            `the stack option ${option.key} stacks ${code}, which ranks ABOVE it — the reading this ` +
              "control gives is how many countries BELOW a rank add up to it, and a tower built out " +
              "of the ones above would answer a question nobody asked",
          );
        const member = { key: code, dx: cx(towerBand) - cx(from), dy: -cumulative };
        cumulative += heightOf(columns[from].gt);
        return member;
      });
      if (cumulative > FRAME.height)
        throw new Error(
          `the tower stacked against ${option.key} is ${cumulative.toFixed(0)} units tall in a ` +
            `${FRAME.height}-unit plot, so its top would be cut off by the viewBox — raise the ` +
            "headroom this beat's scale carries, or stop offering the option",
        );
      // THE WORDS AT THE TOP OF THE TOWER, CHECKED AGAINST THE TOWER. The runner derives its total
      // from the full 215-country ranking; this tower is built out of the ten columns on the plate.
      // Nothing but this line says they are the same number, and a run that silently disagreed
      // would print a sum the reader could measure against the picture and find wrong.
      const drawnGt = option.onto.reduce((sum, code) => sum + columns[indexOf.get(code)!].gt, 0);
      if (Math.abs(drawnGt - option.totalGt) > 0.005)
        throw new Error(
          `the option stacked against ${option.key} prints ${JSON.stringify(option.total)} at its ` +
            `top, from a declared ${option.totalGt} Gt, but the columns it actually stacks add up ` +
            `to ${drawnGt.toFixed(3)} Gt — the tower and its own caption disagree`,
        );
      towers.set(option.key, { band: towerBand, height: cumulative });
      return {
        key: option.key,
        label: option.label,
        announce: option.announce,
        note: option.note,
        total: option.total,
        onto,
      };
    }),
  };
  assertStackDeclaration(declaration, columns.map((c) => c.code));

  const stackOptions = stackOptionsForMarkup(declaration, STACK_ID_PREFIX);
  const stackNotes = stackNotesForMarkup(declaration);
  const stackTotals = stackTotalsForMarkup(declaration).map((total, at) => {
    const tower = towers.get(declaration.options[at].key)!;
    return { ...total, band: tower.band, top: FRAME.height - tower.height };
  });

  // THE DEFAULT STATE AS TWO RULES, not as an inline style on every label — see the header. The
  // option rules clear this specificity by an id, so choosing a reference steps the default subject
  // back with everything else instead of leaving a second accent on the plate.
  const { color: axisInk, fontWeight: axisWeight, ...axisRest } = regs.axis as any;
  const { color: _valueInk, ...valueRest } = regs.value as any;
  const css = [
    // THE COLOUR OF A FIGURE IS ON ITS BOX, NOT ON THE PILL, and that is what lets it ride. The box
    // is the segment (see the markup below); `color` inherits from it to the pill inside, so one
    // `[data-value]` rule still paints the number and the generated option rules still step it back.
    `${SCOPE} [data-value] { color: var(--label-ink); }`,
    `${SCOPE} [data-value="${subject}"] { color: var(--accent); }`,
    `${SCOPE} .axis-label.x { color: var(--axis-ink); font-weight: var(--axis-weight); }`,
    `${SCOPE} .axis-label.x[data-axis="${subject}"] { color: var(--accent); font-weight: 700; }`,
    // What each column takes under the reader's pointer. Two rules, the same shape as the two above
    // — and the generated option rules override both, because a column the reader has just LIT must
    // answer a pointer in the accent's step and not the neutral's.
    `${SCOPE} [data-col] { --mark-active: ${neutralActive}; }`,
    `${SCOPE} [data-col="${subject}"] { --mark-active: ${accentActive}; }`,
    // THE BOX IS THE SEGMENT. One per column, positioned on the column it belongs to and exactly as
    // tall, so a query about ITS height is a query about that column's height — at every width and
    // every window height, which is the only place the answer lives (see `labelFitsPx`).
    `${SCOPE} .overlay .label-box { position: absolute; container-type: size; }`,
    // ONE DECLARATION FOR BOTH STATES, not a second rule per member. `--stack-carried` is the flag
    // `stack.ts` sets on the members of whichever option is checked; at 0 the figure stands off the
    // top of its column exactly as it always has, at 1 it sits at the middle of its own segment on
    // the tower. A `calc()` over the flag is what keeps "where a figure goes" one sentence.
    `${SCOPE} .overlay .label-box > .end-label {`,
    `  left: 50%;`,
    `  top: calc(var(--stack-carried, 0) * 50%);`,
    `  transform: translate(-50%, calc(-100% + var(--stack-carried, 0) * 50%))`,
    `             translateY(calc((1 - var(--stack-carried, 0)) * -${LABEL_OFFSET_PX}px));`,
    `}`,
    // A SEGMENT TOO SHORT FOR ITS OWN FIGURE DOES NOT PRINT IT, and the reader is not left without
    // it: that country still answers its own band on hover, tap and Tab, its name is still under
    // the band it left, and the tower's total still stands at the top. What is refused is only the
    // number printed at a size that would cover its own segment.
    // `1 - flag`, so this is inert for a figure that is NOT riding: a short column at rest keeps
    // its number, which stands on the ground above it and has all the room in the world.
    `@container (max-height: ${labelFitsPx - 0.01}px) {`,
    `  ${SCOPE} .overlay .label-box > .end-label { opacity: calc(1 - var(--stack-carried, 0)); }`,
    `}`,
    // The tower's own total. It is part of the thread the reader lit, so it takes the accent — and
    // the accent alone: the weight stays the value register's, for the reason `stack.ts` gives for
    // not bolding the names it lights. The thread does not need a second encoding, and a weight the
    // register did not choose is a face this page would have to embed to draw.
    `${SCOPE} .overlay .stack-total { color: var(--accent); }`,
    stackChromeCss({ scope: SCOPE }),
    stackCss(declaration, {
      scope: SCOPE,
      idPrefix: STACK_ID_PREFIX,
      lit: { fill: "var(--accent)", ink: "var(--accent)", active: accentActive },
      dim: {
        fill: "var(--col-neutral)",
        ink: "var(--label-ink)",
        weight: "var(--axis-weight)",
        active: neutralActive,
      },
      seam: "var(--ground)",
      moveMs: MOVE_MS,
      // The figures ride with their columns, in percentages of the label layer — which shares the
      // `<svg>`'s own grid cell, so a percentage there IS a viewBox unit at every width.
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
        ["--col-neutral" as string]: neutral,
        ["--label-ink" as string]: labelInk,
        ["--axis-ink" as string]: axisInk,
        ["--axis-weight" as string]: String(axisWeight),
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not
          (nothing leaves its picture); a stack is a second mechanism and pays its own way, exactly
          as `filterChrome` does — an empty declaration would emit an empty string. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertStackDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure
          and puts the option out of reach of anyone speaking what they can see. */}
      <fieldset className="chart-stack">
        <legend>{stackPlan.label}</legend>
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

      {/* THE SENTENCE THE CONTROL OWES THE READER — the count and the running total, revealed by the
          same `:checked` that moves the columns. Its row is reserved whether or not an option is
          chosen, so the plot underneath never jumps. The untouched option reveals none, because it is
          not a comparison: it is the claim the title states. */}
      <div className="stack-notes" role="status">
        {stackNotes.map((note) => (
          <p data-stack-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width} / ${FRAME.height + FRAME.xAxisRowPx}`,
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

          {/* `fill` stays a PRESENTATION ATTRIBUTE and never an inline style: a presentation
              attribute sits below every author rule, which is what lets the generated option rules
              repaint these ten without a single `!important`. `vector-effect` is what keeps the seam
              between two stacked columns one CSS pixel at every width, under this `<svg>`'s own
              `preserveAspectRatio="none"`. */}
          {columns.map((c, i) => (
            <rect
              key={c.code}
              data-col={c.code}
              // WHICH SHAPE ANSWERS A POINTER, and it is this rectangle and not the dot above it.
              // `interaction.mjs` carries `.mark-active` from the `.pt` that names this key onto
              // the element that carries it, and the format's stylesheet then reads `--mark-active`
              // off this rect. Two vocabularies on one element, deliberately: `data-col` is the
              // stack's (what MOVES), `data-mark` is the interaction's (what ANSWERS).
              data-mark={c.code}
              x={cx(i) - barW / 2}
              y={y(c.gt)}
              width={barW}
              height={FRAME.height - y(c.gt)}
              fill={c.code === subject ? accent : neutral}
              stroke="none"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <line
            x1={0}
            x2={FRAME.width}
            y1={FRAME.height}
            y2={FRAME.height}
            stroke={baseline}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />

          {/* THE HIT POINTS DO NOT MOVE, and that was measured rather than assumed. They carried
              `data-col` at first, so each one travelled onto the tower with its column — and driving
              it showed the answer naming the wrong country, because `interaction.mjs` resolves a
              pointer to the nearest mark BY X, off the `cx` attributes it reads once at init, which
              a CSS transform never changes. A six-column tower stands in one band and answered
              "États-Unis" over every segment of it. So the ten bands, the ten names printed under
              them and the region each of them answers for stay exactly where they are — a filter
              does not move the frame its marks were measured against, and neither does this. What a
              reader hovers is a band; the band's own name is printed under it, in the accent when it
              went onto the tower; and the answer is that band's country. */}
          {columns.map((c, i) => (
            <circle
              key={c.code}
              className="pt"
              cx={cx(i)}
              cy={y(c.gt)}
              r={5}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              // THE DOT IS NOT THE MARK HERE. The format's own answer to a pointer is to fill this
              // 5px circle, which on a line IS the reading and on a column is a grey spot floating
              // at its top — the owner's reading of this beat, and the reason this attribute exists.
              // Naming the column makes `interaction.mjs` light the column instead and keeps this
              // circle transparent in every state.
              data-mark-ref={c.code}
              aria-label={`${c.name} : ${c.label} ${unit}. ${c.detail}`}
              data-detail={`${c.name} · ${c.label} ${unit} · ${c.detail}`}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {/* ONE BOX PER COLUMN, AND THE BOX IS THE COLUMN. It stands exactly where the column
              stands and is exactly as tall, so it travels with it under an option (`--stack-dx`/
              `--stack-dy`, in percentages of this layer, which `stack.ts` emits from the same
              `dx`/`dy` the column itself moves by) and so a query about its height is a query about
              whether that column's own segment can hold a figure. The pill inside carries the
              number and the format's `.end-label` treatment — including its ground background,
              which is what lets a figure sit ON the tower without ever being ink on a coloured
              fill: the label brings its own ground with it. */}
          {columns.map((c, i) => (
            <span
              key={c.code}
              className="label-box"
              data-value={c.code}
              style={{
                left: `calc(${pct(cx(i) - barW / 2, FRAME.width)}% + var(--stack-dx, 0%))`,
                top: `calc(${pct(y(c.gt), FRAME.height)}% + var(--stack-dy, 0%))`,
                width: `${pct(barW, FRAME.width)}%`,
                height: `${pct(FRAME.height - y(c.gt), FRAME.height)}%`,
              }}
            >
              <span className="end-label" style={{ ...valueRest }}>
                {c.label}
              </span>
            </span>
          ))}

          {/* WHAT THE TOWER ADDS UP TO, ON THE TOWER. The sentence under the control already says
              it, and the owner's reading of the first build is why that is not enough: a reader
              looking at six segments of one colour is being asked to believe an addition whose
              answer is in a caption. This stands at the tower's own top, beside the column it is
              being compared with, where the eye makes the comparison. Hidden until its option is
              chosen, by the same `:checked` that moves the columns — so it is a build-time string
              and no script reveals it. */}
          {stackTotals.map((total) => (
            <span
              key={total.slug}
              className="end-label stack-total"
              data-stack-total={total.slug}
              style={{
                ...valueRest,
                left: `${pct(cx(total.band), FRAME.width)}%`,
                top: `${pct(total.top, FRAME.height)}%`,
                transform: `translate(-50%, -100%) translateY(-${LABEL_OFFSET_PX}px)`,
              }}
            >
              {total.text}
            </span>
          ))}
        </div>

        <div className="x-axis">
          {columns.map((c, i) => (
            <span
              key={c.code}
              className="axis-label x"
              data-axis={c.code}
              style={{ ...axisRest, left: `${pct(cx(i), FRAME.width)}%` }}
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
