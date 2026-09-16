# Bar and column — in web

**Argues:** One value per category, encoded as the LENGTH of a rectangle from a shared baseline.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-bar-top-emitters-2024` (2026-09-15), from `proof/static-bar-top-emitters-2024`.

- **The gesture**: the reader picks one column as the reference, and the countries below it LEAVE
  THEIR BANDS AND STACK on each other beside it, one on the next, until the tower reaches its height.
- **Do not repeat the plate.** Ten bars is few enough that a still labels every one, so "hover for the
  value" would be the same numbers twice. Add the two readings the plate does not hold: a column's
  share of the world total, and how many of the ones below it must be added to match it.
- **Build it with `chart-web/assets/stack.ts`** (with `filter.ts` for what may leave). For each option
  the build emits the `translate()` in `viewBox` units, the fills, the value labels riding into the
  middle of their own segment, and the sum printed at the tower's top — an addition whose answer is
  only in a caption is one taken on faith.
- **Spend the accent twice** — once by the author on the subject at rest, once by the reader on the
  reference and its tower, everything else stepping back to one neutral. With nothing chosen the page
  IS the complete ranking, and that is the state a reader with no script never leaves.
- **Refused: the fixed bracket.** The still's bracket spanned the five columns the headline adds and
  captioned them with their sum — the answer, pre-made, standing where the reader's own comparison
  had to be built. The control replaced it rather than joining it.

## Reader gestures
- **`ask-a-mark` — « Cette colonne, elle pèse combien dans le total mondial, et combien de pays faut-il additionner pour l'égaler ? »** — the column lights and the answer box prints two readings the plate holds nowhere: its share of the WORLD total (the plate draws only the top ten) and how many countries below it in the FULL ranking must be summed to match it
- **`filter` + `stack` — « Et par rapport à un autre pays ? »** — the reader picks the reference the headline's arithmetic is run against, and the followers stack onto it so the addition is watched rather than asserted
- **What does NOT move** — the ranking, the ten drawn columns, the takeaway and the subject's accent
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- let a control change the ranking or drop a column — narrowing must be ORTHOGONAL to the encoded variable, or it can hide the claim
- print a value label on a fill without measuring the ink against that exact fill; this beat side-steps it by printing every value OUTSIDE its column, on the ground

## Precision to assert
- the ten are a ranking derived from the frozen file (aggregate rows dropped, both counts printed), never a typed list
- "the next five" is a SEARCH whose stop is computed; if the data moved so the answer were three, the headline would say three, and under two the beat throws
- the accent is measured as TEXT (4.5:1) against each direction's ground before it is allowed to set a label, and it is measured, never adjusted

## Devices the worked example implements
- **Two derived answers per column** — world share and the rank-sum count, computed over the whole 215-row ranking, not over the ten drawn (`render-directions-web.mjs`)
- **A reader-chosen reference** — `filter.ts` + `stack.ts` together, so the choice narrows and the followers tower in one gesture (`skills/chart-web/assets/filter.ts`, `stack.ts`)
- **`assertLegible(accent, ground, { role: "text" })`** — a fourth direction whose accent fails stops the render instead of shipping unreadable type (`render-directions-web.mjs`)

## Worked example
`proof/web-bar-top-emitters-2024/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedColumnsWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/filter.ts`, `skills/chart-web/assets/stack.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type bar-and-column --beat proof/web-bar-and-column-<subject> --static proof/static-bar-and-column-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
