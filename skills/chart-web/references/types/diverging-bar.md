# Diverging bar — in web

**Argues:** A diverging bar answers "who gained and who lost, and by how much" for a set of categories whose values are SIGNED — net job change by sector, vote swing by district, temperature anomaly by year.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-diverging-bar-eu-per-capita` (2026-09-15), from `proof/static-diverging-bar-eu-per-capita`.

- **The gesture**: the reader chooses the zero, and all twenty-seven bars re-aim at once — each
  shortening, lengthening, or crossing the rule and coming out the other side in the other sign's
  colour.
- **Start from the only zero in the bar family that was CHOSEN.** A plain bar's zero is arithmetic;
  this one is editorial, and the type sheet names the failure it guards — "the domain must genuinely
  straddle zero" — which this beat lives one country away from: twenty-six bars left, one 0,03 t right.
  Against the 2024 median it is 13 above and 13 below, and the subject changes sides.
- **Build it with `chart-web/assets/datum.ts`** — the vocabulary for what the picture is measured
  FROM, subtracted from every mark before anything is drawn. Native radios plus build-time CSS.
- **Fix the rows and fix the axis.** Rows sort by 2024 level in every state, so a reader can watch
  Luxembourg hold the top row while its bar travels edge to edge. The axis is ONE span, ±21 t, taken
  from the widest option and never recomputed — which is where a third reading lives: the fan of where
  they stand today is visibly a fifth of the wedge of how far they have come. A per-option rescale
  would have drawn both at the same width. The readings sit ON the zero rule at their row's height, so
  `nearestCell` reduces to "which row"; `assertDatumRest` refuses the beat if they ever drift.
- **Refused: re-ranking the rows per reference.** Three times over — `interaction.mjs` reads `cx`/`cy`
  once at init, so a re-ranked row answers for the country whose slot it landed in; twenty-seven names
  re-sorting is the owner's first ruling at twenty-seven times the scale; and the fixed order is the
  better argument. Sign is carried by the SIDE of the rule, with hue allowed only to double it.

## Reader gestures
- **`datum` — « Au-dessus de quoi ? »** — this is the one type whose baseline is INSIDE the data and was chosen by someone, so the reader moves the level every bar is measured FROM: each bar shortens, lengthens, or crosses the rule and comes out the other side in the other sign's colour
- **What does NOT move** — not one country name, not one axis graduation, not the zero rule, not the note on the subject: the whole state change is one `transform` and one `fill` per bar, interpolated
- **`ask-a-mark`** — a bar answers with both its readings and its signed change, which the single drawn length cannot carry
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- draw a diverging bar whose domain does not genuinely straddle the chosen zero — under every offered reference the page states who is above, on and below
- lay the new reference across the plot as a rule: a datum is SUBTRACTED from the data, so the reference is always at zero by construction and what moves is every mark

## Precision to assert
- the shared zero baseline never moves, under any option
- every category is asserted to carry a reading in both periods before anything is drawn — a diverging bar with a category silently missing is a ranking that is wrong and does not know it
- the count of risers is asserted exactly, and the beat throws if it changes

## Devices the worked example implements
- **`datum.ts`, a new vocabulary** — what the picture may be measured FROM, the other half of `level.ts`'s sentence (`skills/chart-web/assets/datum.ts`)
- **Sign change as a watched shrink-and-regrow** — a bar crosses the rule rather than jumping (`DirectedDivergingBarWeb.tsx`)
- **A three-reference census baked at build time** — who is above, on and below each offered zero (`render-directions-web.mjs`)

## Worked example
`proof/web-diverging-bar-eu-per-capita/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedDivergingBarWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/datum.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type diverging-bar --beat proof/web-diverging-bar-<subject> --static proof/static-diverging-bar-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
