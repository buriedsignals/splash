# Stacked bar — in web

**Argues:** Several series summed into one bar per category, so a single mark carries both the total (the bar's full length) and the composition (each segment's own length within it).

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-stacked-bar-lowcarbon-growth` (2026-09-15), from
`proof/static-stacked-bar-lowcarbon-growth`.

- **Vocabulary: `chart-web/assets/rebase.ts`**, written for this beat.
- **The gesture is the reader picking a source and getting a RAIL**: that country's band for that
  source drawn a second time, in a lane of its own, from the plate's own zero, at the plate's own
  scale, against the plate's own graduations.
- **Start from the type's one honest comparison**: only the bottom segment is measured from a common
  baseline, so every band above floats. On this data the failure has a direction — France's nuclear
  base pushes her bands to the far right whatever their size, so a reader ranking by right edge puts
  her first on wind, solar and biomass where she is fourth on all three.
- **Give back the total the stack hides**: each bar prints its own total in a gutter, and the ranking
  is built on it; every segment wide enough prints its own TWh inside itself; the earlier total is a
  TICK on the bar, not a second bar, because the headline is about the addition.
- **Refused: moving the band to its baseline.** `floor.ts` and `stack.ts` both give a band a baseline
  by MOVING it, and in a stacked bar that is a reorder — which the type sheet forbids outright. So
  nothing in the stack moves: not a bar, not a segment, not a tick, not a word. And the SEGMENT is
  what answers a pointer, never a grey dot laid on top of it.

## Reader gestures
- **`rebase` — « Cette bande-là, qui en a le plus ? »** — only the BOTTOM segment is measured from a common baseline, so every segment above it has two ends the reader cannot separate by eye; the reader chooses which segment rests on the baseline and that comparison becomes free
- **`ask-a-mark`** — a segment answers with its source, its value and its share of its own bar, the two readings one length confuses
- **What does NOT move** — the segment order, the totals and the row order
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- compare an inner segment across bars without rebasing: that is exactly what this type cannot give, stated in the type sheet's strongest terms
- change the segment order to make a comparison easier — the order is fixed, and it is the rebase that moves, not the stack

## Precision to assert
- one zero-based scale for every bar and every state
- shares sum to the same asserted total in every state
- the four claims (the largest adder is not the largest producer; it added more; the leader started several times higher; the leader still holds the largest total) are asserted in the runner before anything is drawn

## Devices the worked example implements
- **`rebase.ts`** — which segment rests on the baseline, which is the only way this type's inner comparison becomes honest (`skills/chart-web/assets/rebase.ts`)
- **A fixed source order under a moving baseline** — the stack is preserved and only its datum changes (`DirectedStackedBarWeb.tsx`)
- **Four asserted claims, not one** — the composition claim and the total claim kept separate (`render-directions-web.mjs`)

## Worked example
`proof/web-stacked-bar-lowcarbon-growth/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared plan where one can be declared, and the refusals it is checked against), `DirectedStackedBarWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/rebase.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type stacked-bar --beat proof/web-stacked-bar-<subject> --static proof/static-stacked-bar-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
