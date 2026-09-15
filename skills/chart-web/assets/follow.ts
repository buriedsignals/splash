// twin/skills/chart-web/assets/follow.ts
//
// THE EIGHTH THING A READER CAN DO TO A PICTURE WITHOUT A SCRIPT, AND IT IS THE SAME MECHANISM.
//
// `filter.ts` says what may LEAVE the picture. `stack.ts` says what may MOVE in it. `level.ts` says
// what the picture may be MEASURED AGAINST. `withdraw.ts` says what may be TAKEN OUT of a sum.
// `fold.ts` says what may be LAID OVER what is drawn. `trace.ts` says what may be FOLLOWED THROUGH A
// NETWORK. `brush.ts` says what SPAN OF AN AXIS may be chosen. This file says what may be FOLLOWED
// THROUGH THE ORDERED STEPS of a picture: one competitor pulled out of a tangle it crosses by
// construction, its position at every step recovered, and every EVENT between two steps — who it
// passed, who passed it, and where — named on its own line. All eight are native radio inputs plus
// CSS generated at build time (`:checked` and `:has()` on the enclosing figure, no listener, no
// state, not one byte of JavaScript), because that is the only kind of control this format can
// promise still works with the script absent.
//
// WHERE IT COMES FROM. `proof/web-bump-emitter-rank`, a RANKING-OVER-TIME type. A bump chart's whole
// difficulty is that its lines cross by construction and a reader loses the thread at every crossing.
// The still's one tool against that is colour, and `chart-beat/references/types/bump.md` says out
// loud where colour runs out: "reserve accent colour for the two or three lines the story is actually
// about … every other line renders in a single neutral, unlabelled grey". So the plate ships with
// most of its lines deliberately anonymous — and a reader who wants one of THOSE has nowhere to go.
//
// AND THE READING IS NOT THE VALUE. It is tempting to say a bump hides the magnitude and the web
// gives it back; that is true and it is a different control (one mark per step, answering with what
// the rank cost). What a rank chart hides that nothing else does is the IDENTITY OF THE FIELD: the
// rows are places in a world, and a chart that draws six lines on ten rows leaves four rows held, at
// every step, by competitors it never names. A line that falls is then a line falling past nobody.
// Following it is what names them.
//
// WHY IT IS AN EIGHTH FILE AND NOT AN OPTION IN ONE OF THE OTHER SEVEN.
//
// A filter's vocabulary is a NAMED SET OF KEYS, and hiding is the wrong verb here twice over: the
// tangle a reader follows a line THROUGH is the comparison, and a rank read after a subset leaves is
// not the rank the chart drew. A stack needs an arrangement and nothing moves. A yardstick is ONE
// reference per series laid flat across the whole plot — `level.ts` says so in its own first
// paragraph — and a trajectory is thirty-five positions whose meaning is the WALK they make, so
// declared as levels it would be thirty-five full-width rules: true of every number and false of the
// thing. A fold lays one half of a picture over the other and its product is ONE crossing at a band.
// A withdrawal is an arithmetic of subtraction and a trace an arithmetic of partition — and a rank
// conserves nothing, because there is no total to split. A brush chooses a SPAN OF AN AXIS; this
// chooses a competitor, and every step stays on the plot.
//
// THE ARITHMETIC THIS FILE OWNS, AND IT IS THE ONE AN ORDERING HAS.
//
// A rank is a position in a bijection over a field, so between two consecutive steps
//
//     position[i] − position[i−1]  =  (how many passed it)  −  (how many it passed)
//
// That equality is the whole audit, and it is what makes this vocabulary able to refuse a picture
// that would lie. `types/bump.md` names the trap this type has and no value-based type does: rank has
// no magnitude to sanity-check against, so "an invented rank slots into the visual field exactly as
// plausibly as a real one", and the sheet's own instruction is never to synthesize a point to smooth
// over a gap. A fabricated crossing, a dropped crossing and a rank bridged across a missing step all
// break the equality above, so all three are refused here BY ARITHMETIC rather than discovered by
// looking at the render. A step a competitor is genuinely absent from is declared `null` and drawn as
// a BREAK, and a crossing on either side of a break is refused rather than bridged.
//
// AND IT IS THE ONLY ONE OF THE EIGHT THAT IS HANDED A PROTECTED KEY. `directed-interaction.md`
// rule 5: nothing argument-bearing sits behind a control. On this shape the argument IS a line — the
// one the plate accents and the headline names — and a control that could put the reader in a state
// where that line is dimmed, unlabelled or unringed is a control that can remove the claim. So the
// beat states which key its plate accents, and an option naming it is refused in those words. Every
// other vocabulary can leave that to the beat because none of them can reach the subject's own mark;
// this one lights lines for a living.
//
// WHAT A BEAT DECLARES. One object, or nothing at all:
//
//     follow: {
//       label: "Suivre un pays",             // the <legend> — the beat's own words
//       noneLabel: "Les six lignes",         // the untouched option: always first, always the
//                                            // default, and it IS the plate the beat ships.
//       steps: ["1990", "1991", …, "2024"],  // the plate's own ordered steps, as keys
//       options: [
//         {
//           key: "DEU",
//           label: "l'Allemagne",
//           announce: "Suivre l'Allemagne — …",   // must contain `label` (WCAG 2.5.3)
//           note: "L'Allemagne : 5e en 1990 …",   // the sentence revealed under the control
//           positions: [5, 5, …, 10],             // one per step, `null` for a step it is absent from
//           crossings: [
//             { step: "1999", other: "l'Inde", direction: "overtaken", text: "doublée par l'Inde · 1999" },
//             …
//           ],
//         },
//         …
//       ],
//     }
//
// THERE IS A "NONE" OPTION, unlike `trace.ts` and like the other six: a bump with nothing followed is
// the picture the beat ships and the claim the title states, so the reader who touches nothing — and
// the reader with no script who never leaves it — is looking at a complete chart rather than at a
// tangle the control existed to undo.
//
// COLOURS ARRIVE AS ARGUMENTS, never as literals: the beat sets them from the direction it is being
// rendered in and measures them there, so nothing here names a colour.

import { answerPieces, defaultPrintedText } from "./interaction-plan.ts";
import { controlChromeCss } from "./control-chrome.ts";

/**
 * One event on a followed trajectory: a step at which the followed competitor and one other swapped
 * order. `direction` is from the FOLLOWED one's point of view, and it is not decoration — it is the
 * sign the conservation law above is checked with.
 */
export type FollowCrossing = {
  /** The step it happens AT — the key of the later of the two steps, never an index. */
  step: string;
  /** The other competitor's name, in the beat's own words. It need not be one the plate draws: on a
   *  rank chart the interesting crossings are usually with competitors the plate never named, and
   *  refusing those would delete the reading this vocabulary exists for. */
  other: string;
  /** Which way round. `passed` — the followed one moved ahead of `other`; `overtaken` — `other`
   *  moved ahead of it. */
  direction: "passed" | "overtaken";
  /** What the ring says when a reader points at it or reaches it with a keyboard. The beat words it;
   *  this file never formats a string a reader sees. */
  text: string;
};

/** One competitor and its whole walk through the plate's steps. */
export type FollowOption = {
  /** The competitor followed. Its line comes forward, its names take full ink, the field steps back. */
  key: string;
  /** The pill's visible words. */
  label: string;
  /** The radio's accessible name — the reading a keyboard reader gets instead of the picture. It must
   *  CONTAIN `label`: an accessible name that does not contain the visible one is the WCAG 2.5.3
   *  "label in name" failure, and it is checked here rather than hoped for. */
  announce: string;
  /**
   * THE SENTENCE REVEALED UNDER THE CONTROL, AND IT IS REQUIRED.
   *
   * The lit line and its rings are the answer for a reader looking at the picture. This is the answer
   * for the one who is not — and it is where the DERIVED readings live, the ones no line can draw: the
   * run-length of the walk, the net displacement, and the NAMES of competitors the plate never drew.
   * `filterNotes`, `stackNotesForMarkup`, `levelNotesForMarkup`, `withdrawNotesForMarkup`,
   * `foldNotesForMarkup` and `traceNotesForMarkup` all hold the same position for the same reason.
   */
  note: string;
  /**
   * THE WALK: this competitor's position at every step of the plate, in the plate's own order.
   *
   * `null` is a step it is ABSENT from, and it is drawn as a break. It is the only honest thing to
   * put there — `types/bump.md`: "if a period is missing for an entity, let the line actually break
   * there rather than inventing a rank to bridge it" — and this file refuses a crossing on either
   * side of one, because the conservation law cannot be evaluated across a hole and a crossing
   * asserted across one is exactly the invented rank the sheet warns about, wearing an event's hat.
   */
  positions: (number | null)[];
  /** Every event on the walk, in the steps' own order. */
  crossings: FollowCrossing[];
};

/** What a beat declares when it wants a follow. Absent/`null` means it wants none. */
export type FollowDeclaration = {
  /** The `<legend>` — what the reader is choosing, in the beat's own words. */
  label: string;
  /** The untouched option's words. It is always first, always the default, and it is the plate. */
  noneLabel: string;
  /** The plate's own ordered steps, as keys. Every option's walk is this long or it is not a walk
   *  through this plate. */
  steps: string[];
  options: FollowOption[];
};

/** One contiguous stretch of the walk at one position — what `followRuns` returns. */
export type FollowRun = { from: string; to: string; position: number | null };

/** The reserved id of the untouched option. No declared option may slug to it. */
export const FOLLOW_NONE_SLUG = "none";

/**
 * A CSS-id-safe slug, derived from the option's KEY and never from its label — the derivation
 * `stack.ts`, `withdraw.ts` and `fold.ts` all argue for, for the same reason: the option already HAS
 * an identity (the competitor, which is the same string the beat's own markup quotes), and deriving a
 * second one from the words is how `Central & Northern Europe` became `[data-group="…&amp;…"]`.
 */
export function followSlugOf(key: string): string {
  const slug = String(key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) throw new Error(`follow: the key ${JSON.stringify(key)} has no slug — it is punctuation`);
  return slug;
}

/** The DOM id of one option's radio, and of the untouched option. The prefix is the format's, never
 *  guessed here. */
export function followOptionId(idPrefix: string, slug: string): string {
  return `${idPrefix}-${slug}`;
}

/** The attribute value one crossing's ring is quoted by. Two competitors can cross at the same step,
 *  so the step alone is not an identity — and neither is the pair, because the same pair can cross
 *  twice (this beat's own file: Germany and Saudi Arabia, 2022 and 2023). The index within the
 *  option's own list is what closes it. */
export function followRingKey(slug: string, index: number): string {
  return `${slug}-${index}`;
}

/**
 * THE RUN-LENGTH PARTITION OF A WALK, COMPUTED HERE SO A BEAT CANNOT TYPE IT.
 *
 * "5th from 1990 to 1998, 6th from 1999 to 2018, 7th in 2019 …" is every step's position stated once,
 * which is the only form in which thirty-five readings fit in a sentence. A beat that wrote that
 * table by hand would be writing ranks by hand, which is the one thing `types/bump.md` says never to
 * do on this type — so the beat hands over the walk and gets the runs back.
 *
 * The runs PARTITION the steps: contiguous, complete, in order, every step in exactly one. That is
 * asserted on the way out rather than assumed, because a partition is what makes the sentence a
 * restatement of the walk rather than a summary of it.
 */
export function followRuns(steps: string[], positions: (number | null)[]): FollowRun[] {
  if (!Array.isArray(steps) || steps.length === 0)
    throw new Error("follow: a walk with no steps is not a walk");
  if (!Array.isArray(positions) || positions.length !== steps.length)
    throw new Error(
      `follow: the walk has ${positions?.length ?? 0} position(s) and the plate has ${steps.length} ` +
        "step(s) — a trajectory is read step by step, so the two are the same list or the walk is " +
        "not through this plate",
    );
  const runs: FollowRun[] = [];
  for (let i = 0; i < steps.length; i++) {
    const previous = runs[runs.length - 1];
    if (previous && previous.position === positions[i]) previous.to = steps[i];
    else runs.push({ from: steps[i], to: steps[i], position: positions[i] });
  }
  // The partition, proven rather than trusted. Walking the runs back out has to reproduce the steps
  // in their own order, exactly once each; anything else is a sentence that does not restate the walk.
  const walked: string[] = [];
  for (const run of runs) {
    const from = steps.indexOf(run.from);
    const to = steps.indexOf(run.to);
    if (from < 0 || to < 0 || to < from)
      throw new Error(`follow: the run ${run.from}–${run.to} is not a stretch of this plate's steps`);
    for (let i = from; i <= to; i++) walked.push(steps[i]);
  }
  if (walked.length !== steps.length || walked.some((step, i) => step !== steps[i]))
    throw new Error(
      `follow: the runs cover ${walked.length} step(s) of ${steps.length} and not in the plate's own ` +
        "order — a run-length sentence that does not partition the walk states a position for a step " +
        "the walk never had",
    );
  return runs;
}

/**
 * THE REFUSALS, AND EVERY ONE OF THEM IS A PICTURE OR A SENTENCE THAT WOULD LIE.
 *
 * `drawnKeys` is what the plate actually draws a line for, so an option lighting a line that is not
 * there is caught here rather than by emitting a rule that matches nothing. `protect` is the key the
 * plate accents unconditionally — see the header, and `directed-interaction.md` rule 5.
 */
export function assertFollowDeclaration(
  declaration: FollowDeclaration | null | undefined,
  {
    drawnKeys,
    protect,
  }: {
    /** Every competitor the plate draws a followable line for. */
    drawnKeys: string[];
    /** The key the plate accents unconditionally, which no option may name. */
    protect: string;
  },
): void {
  if (!declaration) return;
  const at = (what: string) => `follow: ${what}`;
  const { label, noneLabel, steps, options } = declaration;
  if (!label || !String(label).trim())
    throw new Error(at("the control has no legend — a reader cannot be asked to choose without being told what"));
  if (!noneLabel || !String(noneLabel).trim())
    throw new Error(at("the untouched option has no words, and it is the state the page ships in"));
  if (!Array.isArray(steps) || steps.length < 3)
    throw new Error(
      at(
        `the plate declares ${steps?.length ?? 0} step(s). A trajectory needs three or more — with ` +
          "two, the reading is a slope's and `level.ts` already carries it (chart-beat/references/" +
          "types/bump.md, \"bump earns its keep specifically across three or more periods\")",
      ),
    );
  if (new Set(steps).size !== steps.length)
    throw new Error(at("two steps carry the same key, so a crossing could name either of them"));
  if (!Array.isArray(options) || options.length < 2)
    throw new Error(
      at(`${options?.length ?? 0} option(s) — a control with one state is one the reader operates while nothing changes`),
    );

  const drawn = new Set(drawnKeys);
  const seen = new Set<string>();
  const slugs = new Set<string>();
  /** Which option holds which position at each step, so the bijection below can be checked. */
  const heldAt = steps.map(() => new Map<number, string>());

  for (const option of options) {
    const where = `the follow option ${JSON.stringify(option.key)}`;
    if (seen.has(option.key)) throw new Error(at(`${where} is declared twice`));
    seen.add(option.key);
    if (!drawn.has(option.key))
      throw new Error(
        at(
          `${where} is not one of the ${drawnKeys.length} line(s) this plate draws ` +
            `(${drawnKeys.join(", ")}) — the control would light nothing`,
        ),
      );
    if (option.key === protect)
      throw new Error(
        at(
          `${where} is the key the plate accents unconditionally. The subject's line IS the claim, ` +
            "and an option that can put the reader in a state where it is one of the field is a " +
            "control that can remove the argument — directed-interaction.md, \"Nothing " +
            "argument-bearing sits behind a control\"",
        ),
      );
    const slug = followSlugOf(option.key);
    if (slug === FOLLOW_NONE_SLUG)
      throw new Error(at(`${where} slugs to "${FOLLOW_NONE_SLUG}", which is the untouched option's own id`));
    if (slugs.has(slug))
      throw new Error(at(`${where} slugs to "${slug}", which another option already took`));
    slugs.add(slug);
    if (!option.label || !String(option.label).trim())
      throw new Error(at(`${where} has no visible words`));
    if (!option.announce || !String(option.announce).includes(option.label))
      throw new Error(
        at(
          `${where}'s accessible name ${JSON.stringify(option.announce)} does not contain its ` +
            `visible label ${JSON.stringify(option.label)} — WCAG 2.5.3, "label in name"`,
        ),
      );
    if (!option.note || !String(option.note).trim())
      throw new Error(
        at(
          `${where} reveals no sentence. A lit line tells a reader WHICH competitor; the sentence ` +
            "is the only channel its run-length walk, its net displacement and the names of the " +
            "competitors this plate never drew are on",
        ),
      );

    // The walk, and the partition that restates it. `followRuns` owns both refusals.
    const runs = followRuns(steps, option.positions);
    for (const [i, position] of option.positions.entries()) {
      if (position === null) continue;
      if (!Number.isInteger(position) || position < 1)
        throw new Error(
          at(`${where} holds position ${JSON.stringify(position)} at step ${steps[i]} — a rank is a positive integer`),
        );
      const already = heldAt[i].get(position);
      if (already !== undefined)
        throw new Error(
          at(
            `${where} and ${JSON.stringify(already)} both hold position ${position} at step ` +
              `${steps[i]}. An ordering is a bijection: two competitors cannot share a place, and a ` +
              "picture that draws them on one row is a picture with a fabricated rank in it",
          ),
        );
      heldAt[i].set(position, option.key);
    }
    if (runs.length === 1 && option.crossings.length === 0)
      throw new Error(
        at(
          `${where} never changes position and crosses nobody — following it lights a line and ` +
            "reports a walk that did not happen. Offer a competitor whose order moved, or offer none",
        ),
      );

    // ── THE CONSERVATION LAW, STEP BY STEP ────────────────────────────────────────────────────
    const byStep = new Map<string, FollowCrossing[]>();
    for (const crossing of option.crossings) {
      const index = steps.indexOf(crossing.step);
      if (index < 0)
        throw new Error(at(`${where} crosses at step ${JSON.stringify(crossing.step)}, which is not on this plate`));
      if (index === 0)
        throw new Error(
          at(
            `${where} crosses at ${crossing.step}, the FIRST step. A crossing is a change of order ` +
              "between two steps, and there is nothing before the first one",
          ),
        );
      if (crossing.direction !== "passed" && crossing.direction !== "overtaken")
        throw new Error(
          at(
            `${where}'s crossing at ${crossing.step} is neither "passed" nor "overtaken" ` +
              `(${JSON.stringify(crossing.direction)}) — the sign is what the law below is checked with`,
          ),
        );
      if (!crossing.other || !String(crossing.other).trim())
        throw new Error(at(`${where}'s crossing at ${crossing.step} names nobody`));
      if (!crossing.text || !String(crossing.text).trim())
        throw new Error(
          at(
            `${where}'s crossing at ${crossing.step} has no words. A ring a reader can point at and ` +
              "is told nothing by is a mark that says an event happened and refuses to say which",
          ),
        );
      if (option.positions[index] === null || option.positions[index - 1] === null)
        throw new Error(
          at(
            `${where} crosses at ${crossing.step}, which is beside a step it is absent from. A ` +
              "crossing asserted across a break is the invented rank types/bump.md warns about " +
              "wearing an event's hat — let the line break there",
          ),
        );
      byStep.set(crossing.step, [...(byStep.get(crossing.step) ?? []), crossing]);
    }
    for (let i = 1; i < steps.length; i++) {
      const before = option.positions[i - 1];
      const now = option.positions[i];
      if (before === null || now === null) continue;
      const here = byStep.get(steps[i]) ?? [];
      const overtaken = here.filter((c) => c.direction === "overtaken").length;
      const passed = here.filter((c) => c.direction === "passed").length;
      if (now - before !== overtaken - passed)
        throw new Error(
          at(
            `${where} moves from position ${before} to ${now} at ${steps[i]} — a change of ` +
              `${now - before} — while declaring ${overtaken} competitor(s) that passed it and ` +
              `${passed} it passed, a net of ${overtaken - passed}. A rank is a place in an ` +
              "ordering, so the two are equal or a crossing has been invented, dropped, or pointed " +
              "the wrong way (chart-beat/references/types/bump.md, \"the one thing that goes wrong\")",
          ),
        );
    }
  }
}

/**
 * The options a component draws, in reading order: the untouched one first, because that is the state
 * the beat renders in and the one a reader with no script never leaves.
 */
export function followOptionsForMarkup(
  declaration: FollowDeclaration | null | undefined,
  idPrefix: string,
): { id: string; slug: string; label: string; announce: string; isNone: boolean }[] {
  if (!declaration) return [];
  return [
    {
      id: followOptionId(idPrefix, FOLLOW_NONE_SLUG),
      slug: FOLLOW_NONE_SLUG,
      label: declaration.noneLabel,
      announce: declaration.noneLabel,
      isNone: true,
    },
    ...declaration.options.map((option) => ({
      id: followOptionId(idPrefix, followSlugOf(option.key)),
      slug: followSlugOf(option.key),
      label: option.label,
      announce: option.announce,
      isNone: false,
    })),
  ];
}

/**
 * THE READER-FACING CONSEQUENCE, and it is not optional — the same rule `filterNotes`,
 * `stackNotesForMarkup` and `levelNotesForMarkup` hold. The untouched option gets NO note, because it
 * is not a trajectory: it is the claim the title states.
 */
export function followNotesForMarkup(
  declaration: FollowDeclaration | null | undefined,
): { slug: string; text: string }[] {
  if (!declaration) return [];
  return declaration.options.map((option) => ({
    slug: followSlugOf(option.key),
    text: option.note,
  }));
}

/**
 * EVERY RING THE BEAT HAS TO DRAW, flattened — one per crossing per option, each carrying the
 * attribute value the generated selector quotes, the step it sits at, the position it sits on and its
 * own words.
 *
 * The component draws them ALL, once, hidden; the stylesheet reveals the chosen option's. That is why
 * nothing in this file emits a transform, and why a reader with no script gets the same control a
 * reader with one does. It is also why `stepIndex` is handed over rather than the beat looking it up:
 * the ring belongs at the step the crossing NAMES, and a beat that resolved that itself could place a
 * ring one column away from the event it rings — which is the defect
 * `proof/web-slope-europe-lowcarbon` shipped in its own form (a ring at the plot's midpoint on lines
 * that meet at 98,4 % of the span).
 */
export function followRingsForMarkup(
  declaration: FollowDeclaration | null | undefined,
): { key: string; slug: string; stepIndex: number; position: number; text: string }[] {
  if (!declaration) return [];
  return declaration.options.flatMap((option) => {
    const slug = followSlugOf(option.key);
    return option.crossings.map((crossing, index) => {
      const stepIndex = declaration.steps.indexOf(crossing.step);
      return {
        key: followRingKey(slug, index),
        slug,
        stepIndex,
        position: option.positions[stepIndex] as number,
        text: crossing.text,
      };
    });
  });
}

/**
 * THE STYLESHEET, AND IT IS THE WHOLE MECHANISM. Pure CSS: `:has()` on the scope plus `:checked` on a
 * real radio. No script runs, so the control works with JavaScript off exactly as it works with it on
 * — and the empty string returned for a beat with no declaration is what makes "no dead CSS" literal
 * rather than aspirational, exactly as `filterCss`, `levelCss` and `foldCss` do.
 *
 * Per option, and never more: one rule stepping the whole field back, one bringing the chosen line
 * forward, one lighting its two names, one revealing each of its rings, and one revealing its
 * sentence.
 *
 * WHAT IT DOES NOT TOUCH, AND THAT IS THE POINT OF `protect`. Nothing here selects the subject's own
 * line, ring, caption or label: the beat simply does not put the vocabulary's attributes on them, and
 * `assertFollowDeclaration` refuses an option that names the protected key, so there is no state of
 * this page in which the argument is dimmed.
 *
 * COLOURS ARRIVE AS CUSTOM PROPERTIES, never as literals: the beat sets them once on its own figure
 * from the direction it is being rendered in, so nothing here names a colour and a direction that
 * changes its ink changes this control with it.
 */
export function followCss(
  declaration: FollowDeclaration | null | undefined,
  {
    scope,
    idPrefix,
    lit,
    dim,
    revealMs,
  }: {
    scope: string;
    idPrefix: string;
    /** What the followed competitor takes: the ink and width of its own line, the ink and weight of
     *  its two names, and the ring its crossings are drawn in. Widths are in reader pixels and the
     *  beat draws them `non-scaling-stroke`, so a lit line is the same weight at 320 px and at 1600. */
    lit: { stroke: string; width: number; ink: string; weight: string; ring: string; ringWidth: number };
    /** What the rest of the field steps back to. Measured by the beat against its own ground — a
     *  recession under the non-text floor is a line the reader can no longer see, which is the defect
     *  `proof/web-slope-europe-lowcarbon` measured at 2,19:1 after lifting its neutral to 3:1 and
     *  then drawing it at 0,75 opacity. Nothing here applies an opacity, for exactly that reason. */
    dim: { stroke: string; ink: string; weight: string };
    /** How long a ring takes to appear. Honoured only under `no-preference`. */
    revealMs: number;
  },
): string {
  if (!declaration) return "";
  const lines: string[] = [
    `/* The follow this beat declared: ${declaration.options.length} option(s) over ${JSON.stringify(declaration.label)},`,
    `   walked across ${declaration.steps.length} steps. Radios plus :checked/:has(), generated once at`,
    `   build time — the same mechanism filter.ts narrows with, and the reason this needs no script. */`,
    `${scope} [data-follow-note] { display: none; }`,
    `${scope} [data-follow-ring] { opacity: 0; }`,
    // The only motion this control has. Under `reduce` the whole block does not exist, so there is no
    // transition to override and no branch anywhere — the shape `render-web.mjs`'s own entrance rules
    // take, for the same reason.
    `@media (prefers-reduced-motion: no-preference) {`,
    `  ${scope} [data-follow-ring] { transition: opacity ${revealMs}ms ease; }`,
    `  ${scope} [data-follow-line] { transition: stroke ${Math.round(revealMs / 2)}ms ease; }`,
    `  ${scope} [data-follow-label] { transition: color ${Math.round(revealMs / 2)}ms ease; }`,
    `}`,
  ];

  for (const option of declaration.options) {
    const slug = followSlugOf(option.key);
    const at = `${scope}:has(#${followOptionId(idPrefix, slug)}:checked)`;
    lines.push(
      // The whole field steps back FIRST, the chosen one comes forward after. Identical specificity
      // either way, so source order is the entire mechanism — the defect `stack.ts` shipped and
      // `level.ts` records: two rules of the same weight, and the one that wins is the later one.
      `${at} [data-follow-line] { stroke: ${dim.stroke}; }`,
      `${at} [data-follow-label] { color: ${dim.ink}; font-weight: ${dim.weight}; }`,
      `${at} [data-follow-line="${option.key}"] { stroke: ${lit.stroke}; stroke-width: ${lit.width}; }`,
      `${at} [data-follow-label="${option.key}"] { color: ${lit.ink}; font-weight: ${lit.weight}; }`,
      `${at} [data-follow-note="${slug}"] { display: revert; }`,
    );
    // One rule per ring rather than one selector group: a group would need every selector to carry
    // the scope (`A B, C` is `(A B), (C)`, the refusal `level.ts` states), and a ring is cheap.
    option.crossings.forEach((_, index) => {
      lines.push(
        `${at} [data-follow-ring="${followRingKey(slug, index)}"] { opacity: 1; stroke: ${lit.ring}; stroke-width: ${lit.ringWidth}; }`,
      );
    });
  }
  return lines.join("\n");
}

/**
 * THE REFUSAL THE CENSUS CANNOT MAKE FOR THIS VOCABULARY, SO IT SHIPS HERE.
 *
 * `interaction-plan.ts`'s `shippedControls` knows five kinds and reads each off its own attribute
 * spelling; this vocabulary writes `data-follow-note`, which it does not look for. Borrowing another
 * vocabulary's spelling so the census would count the control is the one thing that must not be done
 * — the census would then be measuring something that is not there — so the same refusal is made
 * here, against the file the runner has just written, exactly where `assertFoldChangesThePicture`,
 * `assertTraceChangesThePicture`, `assertWithdrawChangesThePicture` and
 * `assertBrushChangesThePicture` each make theirs.
 *
 * The revealed blocks are stripped from the page BEFORE the comparison, for the reason
 * `defaultPrintedText` strips the yardstick's and the cutoff's: a sentence that is in the markup but
 * behind a `:checked` is revealed, never printed, and counting it as printed would make every control
 * on the page look dead.
 */
export function assertFollowChangesThePicture(
  html: string,
  declaration: FollowDeclaration | null | undefined,
  where = "this page",
): void {
  if (!declaration) return;
  const revealed = /<[^>]*data-follow-note="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/g;
  const printed = defaultPrintedText(String(html).replace(revealed, " "));
  const inert: string[] = [];
  for (const option of declaration.options) {
    const adds = answerPieces(option.note).some((piece) => !printed.includes(piece));
    if (!adds) inert.push(option.label);
  }
  if (inert.length)
    throw new Error(
      `${where}: ${inert.length} of ${declaration.options.length} follow option(s) reveal a sentence ` +
        `the page already prints (${inert.join(", ")}). A reader who follows every line in turn is ` +
        `told nothing they could not read at rest — give each one the walk its own trajectory ` +
        `produces, or stop offering it ` +
        `(chart-web/references/directed-interaction.md, "The mechanical refusal")`,
    );
}

/**
 * The control's own chrome, emitted ONLY for a beat that declared a follow.
 *
 * ONE DRAWING, IN ONE PLACE. This used to be forty lines of fieldset, legend, pill rail and
 * reserved note row copied byte for byte from a sibling vocabulary, with a paragraph above it
 * explaining that the copy was deliberate and that the copies were "held together by the eye".
 * Twenty of them were, until they were not. `control-chrome.ts` carries the drawing and the
 * measurements behind it; what is left here is the only thing that was ever this control's own.
 */
export function followChromeCss({ scope }: { scope: string }): string {
  return controlChromeCss({
    scope,
    name: "follow",
    rail: "scroll",
    notes: { reserve: null },
  });
}
