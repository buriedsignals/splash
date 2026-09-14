/**
 * Germany's electricity between 2015 and 2024, drawn as a bridge THROUGH the design base and
 * delivered as an interactive page: two declared levels, the moves between them, and — this being
 * the web — a reader who can take one of the moves back out.
 *
 * WHAT THE WEB ADDS, AND IT IS NOT THE PLATE REPEATED. A waterfall's whole subject is CONTRIBUTIONS
 * COMPOSING INTO A TOTAL. A still fixes one order and one set of contributors and asserts the
 * arithmetic; a video walks that same one sum; a scrolly narrates it. None of the three can run the
 * sum again minus a term the reader names, because there are three answers and the author does not
 * know which one is wanted. So the reader picks:
 *
 *   THE CHOSEN BAR LEAVES AND THE HOLE STAYS — its rectangle empties to a dashed outline in its own
 *   band, still measurable against the same axis, so "how big was the thing I removed" is a question
 *   the picture still answers. Its name and its signed figure are struck, not deleted: a sequence
 *   whose ORDER is the argument must not grow an unlabelled gap.
 *   EVERYTHING DOWNSTREAM RE-STEPS — each later move keeps its own length (a contribution is not
 *   resized by removing another one) and slides by exactly the withdrawn value, because a step
 *   starts where the previous one ended and the previous one has just moved. The connectors travel
 *   with them, so the bridge stays a bridge.
 *   THE CLOSING LEVEL RECOMPUTES — the one bar drawn from zero is RE-DRAWN rather than moved, from
 *   the same baseline, and lands on a number that was nowhere on the page.
 *   AND THAT NUMBER IS STATED — above the recomputed bar, where the comparison with 2015 is made,
 *   and again in the sentence under the control with its net change. An addition whose answer is
 *   only in a caption is one the reader is asked to take on faith.
 *
 * NO SCRIPT DOES ANY OF IT. The control is native radios in a `<fieldset>` plus CSS generated at
 * build time — `:checked` and `:has()`, the mechanism `chart-web/assets/filter.ts` narrows with and
 * `stack.ts` moves with. `assets/withdraw.ts` is the third file in that family and this beat is what
 * it was written for. With JavaScript off the control works identically, and with nothing chosen the
 * page IS the complete measured bridge — the state it ships in and the state a reader with no script
 * never leaves.
 *
 * `net-change-between-declared-levels` — a waterfall is only honest if both ENDS are levels the page
 * NAMES. Otherwise the steps are a sequence of numbers floating over nothing. Under a withdrawal the
 * closing level is redrawn AND renamed, so the rule holds in all four states of the page.
 *
 * `sign-is-direction-and-hue-only-doubles-it` — a step's DIRECTION is up or down; colour repeats it.
 * A reader who cannot separate the two hues still reads the bridge correctly, and still reads it
 * correctly after re-stepping it, because the directions do not change.
 *
 * `conservation-is-kept-visible` — the steps sum to the difference between the two levels, and the
 * runner checks it before drawing. THE CONTROL REOPENS THAT TRAP IN A NEW PLACE, which is this
 * beat's finding: three more closing levels now exist, each drawn as a scale factor and captioned
 * with a number formatted somewhere else. A factor computed from one arithmetic and words computed
 * from another are two derivations of one number. So every option's total is re-walked below,
 * step by step, against the geometry that is actually drawn — four bridges asserted where the still
 * asserts one.
 *
 * WHERE THE COLOUR OF A FIGURE LIVES, AND WHY IT IS NOT AN INLINE STYLE. A figure printed inside a
 * tall bar takes `inkOnFill`'s ink for THAT FILL — and a withdrawn bar has no fill any more. An
 * inline style beats every generated rule there is, so a figure whose colour was written on the span
 * would have stayed white on the page's own ground the moment its bar emptied. It is a custom
 * property per figure, read by one rule this component owns, which the option rules clear by an id.
 */

import { mix, adjustToContrast, assertLegible, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars, fitY, inkOnFill } from "#shared/design-base/web.mjs";
import {
  assertWithdrawDeclaration,
  withdrawCss,
  withdrawChromeCss,
  withdrawNotesForMarkup,
  withdrawOptionsForMarkup,
  withdrawRestatedForMarkup,
  withdrawSlugOf,
  type WithdrawDeclaration,
} from "../../skills/chart-web/assets/withdraw.ts";

export const FRAME = { width: 860, height: 380, xAxisRowPx: 48 };

/** This format's own scope selector, and the id prefix the withdrawal's radios take. The two
 *  arguments `withdraw.ts` refuses to guess, for the reason `filter.ts` refuses to guess them. */
const SCOPE = ".chart-figure";
const WITHDRAW_ID_PREFIX = "chart-withdraw";

/** How long the bridge takes to re-step. Honoured only under `prefers-reduced-motion:
 *  no-preference` — `withdraw.ts` puts the whole transition inside the query rather than overriding
 *  it back, so under `reduce` there is no transition to resolve at all. */
const MOVE_MS = 420;

/**
 * WHAT A BAR BECOMES UNDER THE READER'S POINTER, and why it is a step TOWARD THE INK.
 *
 * The format's own answer to a pointer is to fill the 5px `.pt` circle at the mark's position, which
 * on a LINE is the reading itself and on a bar is a grey dot floating at its top. Naming the bar
 * (`data-mark-ref` → `data-mark`) makes `interaction.mjs` light the bar instead, and this is the
 * number behind that colour. It is NOT `filter: brightness()`: brightness lightens on a cream ground
 * and on a navy one alike, so on `nocturne` it would push the accent toward white — off the ground
 * it is supposed to stand on. Mixing toward the direction's OWN INK is the one step correct in every
 * direction, because ink is by definition the pole furthest from the ground: it darkens on a light
 * ground and lightens on a dark one, and can only raise a mark's contrast against the ground.
 */
const MARK_ACTIVE_STEP = 0.3;

/** How different the pointed-at fill must be from the fill it replaces. A direction whose hues leave
 *  less headroom than this refuses here rather than shipping a hover a reader cannot see. */
const MARK_ACTIVE_MIN_STEP = 1.1;

export type Step = {
  key: string;
  name: string;
  kind: "level" | "up" | "down";
  from: number;
  to: number;
  label: string;
  detail: string;
};

/**
 * WHAT THE RUNNER DECLARES: the words, and the one number that lets the words be checked against the
 * picture. The GEOMETRY — how far each downstream step re-steps, where the closing level lands, which
 * connectors the hole invalidates — is this component's, because this component is what knows the
 * scale. Same division `stack.ts`'s own worked beat draws between `total` and `totalGt`.
 */
export type WithdrawPlan = {
  label: string;
  noneLabel: string;
  options: {
    /** The step withdrawn. */
    key: string;
    label: string;
    announce: string;
    note: string;
    /** The recomputed closing total in the runner's own words, printed at the recomputed level's top. */
    restated: string;
    /** The same total as a number, so this component can check the words against what it DRAWS: it
     *  re-walks the bridge without this step and refuses if the two disagree. */
    restatedValue: number;
  }[];
};

const pct = (value: number, extent: number) => (value / extent) * 100;

export function DirectedWaterfallWeb({
  steps,
  withdrawPlan,
  yTicks,
  unit,
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
  steps: Step[];
  withdrawPlan: WithdrawPlan;
  yTicks: number[];
  unit: string;
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

  let level = mix(ground, ink, 0.55);
  if (contrast(level, ground) < NON_TEXT_CONTRAST_MIN)
    level = adjustToContrast(level, ground, NON_TEXT_CONTRAST_MIN) ?? level;
  const up = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  let down = mix(ground, ink, 0.33);
  if (contrast(down, ground) < NON_TEXT_CONTRAST_MIN)
    down = adjustToContrast(down, ground, NON_TEXT_CONTRAST_MIN) ?? down;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const connector = mix(ground, ink, 0.4);

  // THE HOLE'S OWN OUTLINE. It carries the contribution's size after the fill is gone, so it is held
  // to the same non-text floor every mark on this page is: an outline a reader cannot see is an
  // absence, and an absence is the picture this control was written not to draw.
  let ghost = mix(ground, ink, 0.5);
  ghost = adjustToContrast(ghost, ground, NON_TEXT_CONTRAST_MIN) ?? ghost;

  // The ink a struck word takes. One step back from the page's own text ink and MEASURED there,
  // because a withdrawn step's figure and name are still the reader's own choice and still have to
  // be read — the line through them is what says they are out of the sum, not a contrast they fail.
  const struckInk = mix(ground, ink, 0.78);
  assertLegible(struckInk, ground, {
    role: "text",
    where: `${direction.id ?? "this direction"}'s ink for a withdrawn step's own words`,
  });

  // WHAT EACH MARK TAKES UNDER THE POINTER — see MARK_ACTIVE_STEP. Asserted in both directions and
  // never adjusted: a step that does not clear the mark floor is a hover that hides the bar, and a
  // step a reader cannot see is no answer at all.
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
  const levelActive = activeOf(level, "closing/opening level");
  const upActive = activeOf(up, "rising step");
  const downActive = activeOf(down, "falling step");
  const ghostActive = activeOf(ghost, "emptied step's outline");

  // Enough headroom that a value printed above the tallest bar stays inside the plot at every
  // width — at 375px the geometry has shrunk and the fixed-size label has not. The headroom is now
  // load-bearing for a second reason: withdrawing the fossil decline sends the closing level ABOVE
  // the opening one, taller than any bar this plate draws, and `withdraw.ts` refuses the option
  // outright if the scale cannot hold it.
  const y = fitY(0, yTicks[yTicks.length - 1], FRAME.height, 0.12);
  const band = FRAME.width / steps.length;
  const cx = (i: number) => band * i + band / 2;
  const barW = band * 0.58;
  const fillOf = (s: Step) => (s.kind === "level" ? level : s.kind === "up" ? up : down);
  /** How far a step re-steps when a contribution worth `value` is taken out before it. `y` is
   *  affine, so this is one number for every downstream step and it is derived from the scale
   *  rather than from a second formula. */
  const restepDy = (value: number) => y(0) - y(value);

  // ── the withdrawal's geometry, derived from this component's own scale ───────────────────────
  const indexOf = new Map(steps.map((s, i) => [s.key, i]));
  const last = steps.length - 1;
  const closing = steps[last];
  /** Where each option's replacement connector runs. Filled while the geometry below is derived,
   *  never re-derived from the declaration. */
  const spans: { slug: string; x1: number; x2: number; at: number }[] = [];
  const declaration: WithdrawDeclaration = {
    label: withdrawPlan.label,
    noneLabel: withdrawPlan.noneLabel,
    options: withdrawPlan.options.map((option) => {
      const at = indexOf.get(option.key);
      if (at === undefined)
        throw new Error(`the withdrawal option ${option.key} names a step this beat does not draw`);
      if (at === 0 || at === last)
        throw new Error(
          `the withdrawal option ${option.key} takes out a declared LEVEL, not a contribution — a ` +
            "bridge with one end removed has nothing left to be measured against",
        );
      const value = steps[at].to - steps[at].from;

      // CONSERVATION, RE-WALKED PER OPTION. The runner proves the measured bridge reconciles; this
      // proves each COUNTERFACTUAL one does, against the very steps that will be drawn. Walking it
      // rather than subtracting once is the difference between checking the arithmetic and checking
      // that one subtraction was typed correctly.
      let cursor = steps[0].to;
      for (let i = 1; i < last; i++) if (i !== at) cursor += steps[i].to - steps[i].from;
      if (Math.abs(cursor - option.restatedValue) > 0.005)
        throw new Error(
          `without ${option.key} the bridge walks to ${cursor.toFixed(2)} and the option prints ` +
            `${JSON.stringify(option.restated)} from a declared ${option.restatedValue} — the ` +
            "recomputed bar and its own caption disagree",
        );

      spans.push({
        slug: withdrawSlugOf(option.key),
        x1: cx(at - 1) + barW / 2,
        x2: cx(at + 1) - barW / 2,
        at: y(steps[at - 1].to),
      });

      return {
        key: option.key,
        label: option.label,
        announce: option.announce,
        note: option.note,
        restated: option.restated,
        // Every move AFTER the withdrawn one, and never the closing level: a bar drawn from zero is
        // re-drawn, not translated (`withdraw.ts` refuses the confusion outright).
        resteps: steps
          .slice(at + 1, last)
          .map((s) => ({ key: s.key, dy: restepDy(value) })),
        // The connector arriving at the hole and the connector leaving it. Both go; the replacement
        // above spans the gap at the level the bridge actually holds there.
        cuts: [steps[at - 1].key, option.key],
        close: {
          key: closing.key,
          value: cursor,
          top: y(cursor),
          height: FRAME.height - y(closing.to),
        },
      };
    }),
  };
  assertWithdrawDeclaration(declaration, steps.map((s) => s.key), { baseline: FRAME.height });

  const withdrawOptions = withdrawOptionsForMarkup(declaration, WITHDRAW_ID_PREFIX);
  const withdrawNotes = withdrawNotesForMarkup(declaration);
  const withdrawRestated = withdrawRestatedForMarkup(declaration);

  const { color: _axisInk, fontWeight: axisWeight, ...axisRest } = regs.axis as any;
  const { color: _valueInk, ...valueRest } = regs.value as any;
  const css = [
    // THE DEFAULT STATE AS RULES, not as an inline style on every figure — see the header. `color`
    // on a `[data-value]` is read from a custom property the component sets per figure, so the one
    // rule paints all five and the option rules step the withdrawn one back by an id.
    `${SCOPE} [data-value] { color: var(--value-ink); }`,
    `${SCOPE} .axis-label.x { color: var(--axis-ink); }`,
    // What each mark takes under the pointer, by the role it plays in the bridge. One rule per role
    // and not per key: three fills are drawn here and a fourth is the hole, whose own rule lives in
    // the generated stylesheet because it only exists under an option.
    `${SCOPE} [data-role="level"] { --mark-active: ${levelActive}; }`,
    `${SCOPE} [data-role="up"] { --mark-active: ${upActive}; }`,
    `${SCOPE} [data-role="down"] { --mark-active: ${downActive}; }`,
    // A SECOND LAYER OVER THE SAME GRID CELL, AND THE SPLIT IS THE POINT — not a workaround.
    // `.overlay` is the PLATE's layer: `verify-web.mjs` reads every word in it and requires all of
    // them to be drawn unconditionally, which is exactly right for a page's own figures and exactly
    // wrong for a figure that belongs to an option nobody has chosen yet. That file already carries
    // three `:not(...)` exclusions for the same situation one vocabulary over (`data-stack-total`,
    // `data-fits-its-mark`, `data-level-rule`), and a fourth is a list that grows once per
    // vocabulary. Putting what an option reveals in its OWN layer keeps the plate's rule literally
    // true of this page instead: everything in `.overlay` here IS drawn unconditionally. The
    // placement is `.overlay`'s own, to the declaration — same cell, same relative box, so a `%`
    // lands on the same geometry, and no pointer ever reaches either.
    `${SCOPE} .chart-plot .option-layer { grid-column: 2; grid-row: 1; position: relative; pointer-events: none; }`,
    withdrawChromeCss({ scope: SCOPE }),
    withdrawCss(declaration, {
      scope: SCOPE,
      idPrefix: WITHDRAW_ID_PREFIX,
      baseline: FRAME.height,
      hole: { fill: "transparent", stroke: ghost, active: ghostActive, dash: "5 4" },
      struck: { ink: struckInk },
      moveMs: MOVE_MS,
      // The figures re-step with their bars, in percentages of the label layer — which shares the
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
        ["--axis-ink" as string]: (regs.axis as any).color,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not
          (nothing leaves its picture — a term taken out of a sum is not a mark filtered away, it is
          an arithmetic run again). A withdrawal is a third mechanism and pays its own way. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the picture would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertWithdrawDeclaration`
          refuses the declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-withdraw">
        <legend>{withdrawPlan.label}</legend>
        <div className="options">
          {withdrawOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name="chart-withdraw"
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isNone}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — the recomputed total and its net change,
          revealed by the same `:checked` that empties the bar. Its row is reserved whether or not an
          option is chosen, so the plot underneath never jumps. The untouched option reveals none,
          because it is not a counterfactual: it is the claim the title states. */}
      <div className="withdraw-notes" role="status">
        {withdrawNotes.map((note) => (
          <p data-withdraw-note={note.slug} key={note.slug}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "44px",
          ["--x-axis-h" as string]: `${FRAME.xAxisRowPx}px`,
          aspectRatio: `${FRAME.width + 44} / ${FRAME.height + FRAME.xAxisRowPx}`,
        }}
      >
        <div className="y-axis" style={{ pointerEvents: "none" }}>
          {yTicks.map((t) => (
            <span key={t} className="axis-label y" style={{ ...regs.axis, top: `${pct(y(t), FRAME.height)}%` }}>
              {t}
            </span>
          ))}
        </div>

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

          {/* The connectors: a step starts where the last one ended, and the eye needs to be told.
              Each one is named by the step it LEAVES, so it travels with that step when the bridge
              re-steps and is cut when a withdrawal makes it point out of a bar that is not there. */}
          {steps.slice(0, -1).map((s, i) => (
            <line
              key={`c-${s.key}`}
              data-link={s.key}
              x1={cx(i) + barW / 2}
              x2={cx(i + 1) - barW / 2}
              y1={y(s.to)}
              y2={y(s.to)}
              stroke={connector}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* ONE REPLACEMENT CONNECTOR PER OPTION, drawn in every state and revealed in one. It
              spans the hole — from the step before the withdrawn one to the step after it — at the
              level the bridge actually holds there, which is the level the withdrawn step started
              from and therefore the level the next one now starts from. */}
          {spans.map((span) => (
            <line
              key={`s-${span.slug}`}
              data-span={span.slug}
              x1={span.x1}
              x2={span.x2}
              y1={span.at}
              y2={span.at}
              stroke={connector}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {steps.map((s, i) => (
            <rect
              key={s.key}
              // Three vocabularies on one rectangle, deliberately: `data-step` is the withdrawal's
              // (what empties, re-steps or is re-drawn), `data-mark` is the interaction's (what
              // ANSWERS a pointer), `data-role` is this component's own (what the mark becomes when
              // it does). `fill` stays a PRESENTATION ATTRIBUTE and never an inline style: a
              // presentation attribute sits below every author rule, which is what lets the
              // generated option rules empty a bar without a single `!important`.
              data-step={s.key}
              data-mark={s.key}
              data-role={s.kind}
              x={cx(i) - barW / 2}
              y={y(Math.max(s.from, s.to))}
              width={barW}
              height={Math.max(1.5, Math.abs(y(s.from) - y(s.to)))}
              fill={fillOf(s)}
              stroke="none"
              // What keeps the emptied bar's outline one reader-pixel wide at every width, under
              // this `<svg>`'s own `preserveAspectRatio="none"`.
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <line x1={0} x2={FRAME.width} y1={FRAME.height} y2={FRAME.height} stroke={mix(ground, ink, 0.75)} strokeWidth={1} vectorEffect="non-scaling-stroke" />

          {/* THE HIT POINTS TRAVEL WITH THEIR BARS, and that is safe here for a reason `stack.ts`
              records as the opposite case. `initChart` resolves a pointer to the nearest mark BY X,
              off the `cx` attributes it reads once at init, which no CSS transform changes — so a
              stack, which slides columns sideways, had to leave its points behind. A withdrawal
              never moves anything horizontally: every step keeps its own band, so the x-resolution
              is untouched, while the answer box is anchored on `getBoundingClientRect()`, which a
              transform DOES change. A point left at the old height would float the answer over the
              space the step used to occupy. */}
          {steps.map((s, i) => (
            <circle
              key={`hit-${s.key}`}
              className="pt"
              data-pt={s.key}
              // The dot is not the mark here: naming the bar makes `interaction.mjs` light the bar
              // and keeps this circle transparent in every state.
              data-mark-ref={s.key}
              cx={cx(i)}
              cy={y(Math.max(s.from, s.to))}
              r={7}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={s.detail}
              data-detail={s.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={FRAME.width} height={FRAME.height} fill="transparent" pointerEvents="all" />
        </svg>

        <div className="overlay" aria-hidden="true">
          {steps.map((s, i) => {
            // A VALUE GOES INSIDE ITS OWN BAR WHEN THE BAR CAN HOLD IT. Above the bar is the right
            // place for a short step and the wrong one for a tall bar whose top is already near the
            // frame: at 375px the plot is a hundred units tall, the label is a fixed fourteen
            // pixels, and it lifts clean out of the svg — where the hit area cannot answer for it.
            const top = y(Math.max(s.from, s.to));
            const tall = Math.abs(y(s.from) - y(s.to)) >= 46;
            return (
              <span
                key={`l-${s.key}`}
                className="end-label"
                data-value={s.key}
                style={{
                  ...valueRest,
                  // Never `color`, always the property one rule reads — see the header.
                  ["--value-ink" as string]: tall
                    ? inkOnFill(fillOf(s), { ink, ground }, contrast, adjustToContrast, TEXT_CONTRAST_MIN)
                    : s.kind === "up"
                      ? up
                      : label,
                  left: `${pct(cx(i), FRAME.width)}%`,
                  // ONE DECLARATION FOR BOTH STATES, not a second rule per step. `--restep-dy` is
                  // what `withdraw.ts` sets on the figures belonging to steps that re-stepped; at
                  // its default of 0% the figure sits exactly where the plate puts it.
                  top: `calc(${pct(top, FRAME.height)}% + var(--restep-dy, 0%))`,
                  transform: tall
                    ? "translate(-50%, 0) translateY(6px)"
                    : "translate(-50%, -100%) translateY(-5px)",
                  ...(tall ? { background: "transparent", padding: 0 } : {}),
                }}
              >
                {s.label}
              </span>
            );
          })}

        </div>

        <div className="option-layer" aria-hidden="true">
          {/* THE RECOMPUTED TOTAL, ON THE BAR THE READER JUST RECOMPUTED. The sentence under the
              control already says it, and that is not enough: a reader looking at a bar that has
              visibly changed length is otherwise asked to measure it against the axis to recover the
              one number the option exists to give them.
              IT IS THE ONE FIGURE THAT NEVER GOES INSIDE ITS BAR. A measured total is printed on the
              thing measured, in the ink for that fill; a total the READER produced stands on the
              page's own ground above the level, in the page's own text ink — so the two are not
              confusable, and so its contrast never depends on a fill that is still being scaled
              underneath it. Hidden until its option is chosen, by the same `:checked` that empties
              the bar: a build-time string, revealed by no script. */}
          {withdrawRestated.map((restated) => (
            <span
              key={`r-${restated.slug}`}
              className="end-label"
              data-restated={restated.slug}
              style={{
                ...valueRest,
                color: label,
                left: `${pct(cx(last), FRAME.width)}%`,
                top: `${pct(restated.top, FRAME.height)}%`,
                transform: "translate(-50%, -100%) translateY(-5px)",
              }}
            >
              {restated.text}
            </span>
          ))}
        </div>

        <div className="x-axis" style={{ pointerEvents: "none" }}>
          {steps.map((s, i) => (
            <span
              key={`x-${s.key}`}
              className="axis-label x"
              data-axis={s.key}
              style={{
                ...axisRest,
                left: `${pct(cx(i), FRAME.width)}%`,
                textAlign: "center",
                whiteSpace: "normal",
                lineHeight: 1.1,
                maxWidth: `${(band / FRAME.width) * 100}%`,
                fontWeight: s.kind === "level" ? 700 : axisWeight,
              }}
            >
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <p className="chart-reading" style={{ ...regs.body, margin: "10px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{`${source} · ${unit}`}</p>
    </figure>
  );
}
