# Diverging stacked bar — in web

**Argues:** A diverging stacked bar answers "how did opinion split, for many items at once, when the response scale itself has a neutral middle" — segments stacked outward from a shared centre instead of from a shared zero.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-diverging-stacked-electricity` (2026-09-15), from `proof/static-diverging-stacked-electricity`.

- **The gesture**: the reader moves the CUT — where the ordered scale stops meaning one thing and
  starts meaning its opposite — and nothing is added, removed or re-measured.
- **Start from the judgement the type is built on.** The neutral has to be NAMED rather than defaulted
  to the middle of the array. On a Likert form that decision is printed on the questionnaire; on an
  electricity mix it IS the argument — the renewable directive counts biomass and not nuclear, the
  taxonomy counts nuclear. Four cuts, one frozen file: France goes from +89,8 points of right lean to
  −45,6 left, and under two cuts leans further left than coal-fired Poland. Not one number changed.
- **Build it with `chart-web/assets/side.ts`.** Every barreau keeps its exact share, every row its own
  100 %, the axis its five graduations and words, the rows their alphabetical order. One thing changes:
  which side of the centre a band is drawn on. The centre is at the same place in every cut by
  construction — `sideAt` is the one mapping and it has no cut in it.
- **One thing travels**: a thin HTML net-lean tick per row, ALWAYS rendered, its `left` generated per
  cut and transitioned. The plates themselves must cut, because `interaction.mjs` reads coordinates
  once at init and a band animated across the centre would answer for the side it left. `display` does
  not interpolate; a property on an element that is always there does.
- **Refused: a colour ramp per side.** The sheet asks for one — but here the camp is what the reader
  just chose, so a colour encoding it would repaint every band the moment the boundary moved, and the
  one thing that must stay recognisable across four plates would be the one that did not. Colour
  belongs to the barreau, side to position. The rule is still met where it is checkable: under the
  default cut, two ink tones are the left camp and two accent tones the right, neutral between.

## Reader gestures
- **`side` — « Et si on comptait autrement ? »** — the reader moves the CUT between the two camps: every rung keeps its size and changes side, the bands cross the centre, the two end totals rewrite themselves, the net marker slides to its new position and a sentence names what the new cut overturns
- **`ask-a-mark`** — a band darkens from its own fill and answers with the item, the rung, its share, the sources it groups and which side this cut puts it on
- **What does NOT move** — no row is re-sorted (the cut makes the camps comparable; it does not rank the items), and no item is filtered away
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-treat-neutral-constant` — treat the neutral as a constant — with a control the neutral is a FUNCTION of the cut, so it is declared per cut and refused anywhere but the seam, or duplicated
- `no-print-label-inside` — print a label INSIDE a segment: the two side totals sit at the bar's ends, on the ground, so one measurement against the ground covers them

## Precision to assert
- every row sums to the same asserted total UNDER EVERY CUT, checked per cut, and the runner refuses the page otherwise
- the segment order is the response scale's own order and is fixed
- the rectangles are lengths in the plane and must follow the fluid stretch; only the chrome and the net marker are fixed-pixel HTML outside the `viewBox`, measured at three widths against a ±0,005 bar

## Devices the worked example implements
- **`side.ts`** — the cut as the control, with the neutral declared per cut and verified (`skills/chart-web/assets/side.ts`)
- **Totals outside the bar, at the ends** — the accessibility trap side-stepped rather than solved with a luminance threshold (`DirectedDivergingStackedWeb.tsx`)
- **A sentence naming what each cut overturns** — the derived reading a revealed state owes the reader (`render-directions-web.mjs`)

## Worked example
`proof/web-diverging-stacked-electricity/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedDivergingStackedWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/side.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type diverging-stacked-bar --beat proof/web-diverging-stacked-bar-<subject> --static proof/static-diverging-stacked-bar-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
