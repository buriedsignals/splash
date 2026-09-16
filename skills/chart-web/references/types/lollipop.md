# Lollipop — in web

**Argues:** A lollipop chart is a bar chart's thin sibling: same job, same baseline-at-zero rule, same encoding — just a thin stem and a dot standing in for the solid rectangle.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-lollipop-co2-per-person` (2026-09-15), from
`proof/static-lollipop-co2-per-person`.

- **Vocabulary: `chart-web/assets/level.ts`**, `y` marks, unwidened — radios plus CSS generated at
  build time, so the control works with no script.
- **The gesture is the reader choosing the yardstick**: one country's own two levels are laid flat
  across the other five, and the five are read against it instead of against the author's pick.
- **Start from the pair, not the gap**: each state is its own stem FROM ZERO — the two LEVELS read
  first, the gap second — the earlier state a lighter tint of the later one's own hue.
- **Give back what the drawn order buries**: the six are ranked by TOTAL emissions, so the per-person
  rank is invisible on the plate; laid flat, three of the six changed level rank in twenty-three
  years and Japan now sits between China's two dates.
- **Refused: the axis.** Both values are printed above their own heads, so the page carries a zero
  line and its unit rather than a full value axis.

## Reader gestures
- **`find-your-own-case` (`level.ts`) — « Et par rapport à ce pays-là ? »** — the plate is ranked by a quantity it does not DRAW (totals), so the reader lays one category's own two levels flat across the other five and the rank changes the order buries come out
- **`ask-a-mark`** — a head answers with its period, its value and its ratio to the chosen reference
- **What does NOT move** — the row order, the two endpoints the claim names, and every printed value
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- paint a value label in the mark's accent — every printed value is in the page's neutral ink, which is this type's own filed trap
- pay for the control out of the plot: the chrome's cost is measured at 375 px and given back in prose

## Precision to assert
- one zero-based value scale for every stem in every state
- the six are a computed rule (per-person × population, ranked), not a pick, and the beat throws if the subject did not roughly triple, if the ratio did not fall into the stated band, or if the six do not carry most of the whole
- every revealed ratio is derived in the runner from the frozen file

## Devices the worked example implements
- **A yardstick over a plate ranked by something it does not draw** — the mismatch between the sort key and the encoding made visible (`skills/chart-web/assets/level.ts`)
- **Every printed value in neutral ink** — the type's accessibility trap spent as the sheet asks (`DirectedLollipopWeb.tsx`)
- **Measured chrome cost at 375 px** — all three directions fit an 812 px window, checked (`render-directions-web.mjs`)

## Worked example
`proof/web-lollipop-co2-per-person/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedLollipopWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/level.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type lollipop --beat proof/web-lollipop-<subject> --static proof/static-lollipop-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
