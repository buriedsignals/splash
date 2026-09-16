# Waterfall — in web

**Argues:** A waterfall chart shows how a starting total arrives at an ending total through a sequence of signed steps — a revenue build, a budget variance, an opening-to-closing balance.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-waterfall-germany-bridge` (2026-09-15), from
`proof/static-germany-electricity-bridge`.

- **Vocabulary: `chart-web/assets/withdraw.ts`**, the third file in the `filter.ts` / `stack.ts`
  family — native radios in a `<fieldset>` plus `:checked` and `:has()` generated at build time. No
  script does any of it, and with nothing chosen the page IS the complete measured bridge.
- **The gesture is the reader taking one move back out**: a waterfall's subject is contributions
  composing into a TOTAL, and a still, a video and a scrolly all walk one sum — none can run it again
  minus a term the reader names.
- **Empty the bar, do not delete it**: the chosen rectangle becomes a dashed outline in its own band,
  still measurable against the same axis, its name and signed figure struck rather than removed — a
  sequence whose ORDER is the argument must not grow an unlabelled gap.
- **Re-step everything downstream and recompute the close**: each later move keeps its own length and
  slides by exactly the withdrawn value, connectors travelling with it; the one bar drawn from zero is
  RE-DRAWN from the same baseline onto a number that was nowhere on the page — and that number is
  stated above the bar and in the sentence under the control.
- **Refused: one arithmetic for the geometry and another for the words.** The control reopens the
  conservation trap — three more closing levels, each a scale factor captioned by a number formatted
  elsewhere — so every option's total is re-walked step by step against the geometry actually drawn:
  four bridges asserted where the still asserts one. The figure's colour is a custom property, never
  an inline style, or a withdrawn bar's number stays white on the ground.

## Reader gestures
- **`filter` + `withdraw` — « Et sans ce terme-là, on serait arrivé où ? »** — a bridge fixes one order, one set of contributors and one arithmetic; a reader who accepts the arithmetic immediately wants it run again with one term removed, and the answer depends on WHICH, so it is not a number an author can pre-draw
- **The whole bridge is re-walked per option** — not subtracted once: the steps after the withdrawn one re-land, and the closing level moves with them
- **`ask-a-mark`** — a step answers with its own delta and the running level it produces
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- let a total bar disagree with the running level the steps before it produced — the type's one trap, and the control REOPENS it by creating three more closing levels nobody had measured
- print a counterfactual total computed from one arithmetic beside a geometry computed from another: `withdraw.ts` takes the total AS A NUMBER and refuses an option whose printed total is not the level its own geometry lands on

## Precision to assert
- opening plus every step equals the closing, asserted — and asserted again for every withdrawal, so four bridges are checked where the still checks one
- one scale from zero for the totals and the steps, in every state
- where the format's census cannot see the control, the refusal ships WITH THE VOCABULARY (`assertWithdrawChangesThePicture`, called by the runner on the page it just wrote) rather than by squatting on another gesture's id prefix

## Devices the worked example implements
- **`withdraw.ts`** — a term taken out of a sum, with the rest of the sequence re-landing (`skills/chart-web/assets/withdraw.ts`)
- **Four asserted bridges** — each withdrawal re-walked rather than subtracted (`render-directions-web.mjs`)
- **A guard carried by the vocabulary** — the named limit of `interaction-plan.ts`'s census answered without squatting on `chart-stack-*` (`skills/chart-web/assets/withdraw.ts`)

## Worked example
`proof/web-waterfall-germany-bridge/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared plan where one can be declared, and the refusals it is checked against), `DirectedWaterfallWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/filter.ts`, `skills/chart-web/assets/withdraw.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type waterfall --beat proof/web-waterfall-<subject> --static proof/static-waterfall-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
