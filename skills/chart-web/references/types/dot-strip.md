# Dot strip — in web

**Argues:** A dot strip lays one horizontal lane per category and marks every raw observation in that category as a dot positioned by its own value, with a small deterministic jitter and a neutral tick at the category's mean.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-dot-strip-lowcarbon-spread` (2026-09-15), from `proof/static-dot-strip-lowcarbon-spread`.

- **The gesture**: the reader chooses WHAT COUNTS — four rungs, each taking one more source out of the
  numerator, the denominator never changing — and every dot takes a new position on the same rail.
- **Start from the only lossless distribution in the catalogue.** No bin, no pack, no summary: every
  case at its own exact value. What it hands back for that is the shape of the field read as a shape —
  and that field is a quantity SOMEBODY DEFINED. The convergence the headline states (écart 95,1 → 67,6,
  −27,4) reverses the moment the legacy fleet stops counting (+60,6 with nuclear and hydro out).
- **Build it with `chart-web/assets/qualify.ts`** — written for this beat, native radios plus
  build-time CSS. It is this type's gesture and nobody else's because a dot strip has NOTHING to
  re-derive: a histogram would re-bin (position and height move at once), a beeswarm would re-pack
  across a baseline with no data in it, a boxplot would show none of the sixteen observations.
- **Nothing moves across a rail, ever.** Each country's offset is a deterministic jitter from its own
  code, identical in all four rungs; the only axis a mark moves along is the one carrying the data, and
  every dot moves LEFT or stays put because the ladder is a strict subtraction. The rungs CUT — each is
  its own `<svg>`, drawn once. What TRAVELS is the span bar per rail. NO TEXT MOVES: each rail's four
  statistics sit in a fixed row, one variant per rung revealed by the same `:checked`.
- **Refused: fading a calibrated fill.** The sheet prescribes transparency so overlapping dots show
  through, and this branch twice shipped a measured colour then faded it, making every number in
  `PALETTE.md` describe a colour the page does not paint (1,75:1 and 2,19:1). The fill is searched
  until the COMPOSITE over the ground clears the non-text floor, and the filed number is that composite.

## Reader gestures
- **`qualify` — « 27 points d'écart en moins — c'est vrai de quoi, exactement ? »** — the reader changes the DEFINITION the quantity is summed over, and the field's shape is redrawn: this is the only lossless distribution in the catalogue, so the shape itself is the reading, and the shape is of a quantity somebody defined
- **The last rung is the argument** — one definition OPENS the spread instead of closing it, and the runner asserts that rather than describing it
- **`ask-a-mark`** — a dot answers with its category, both its readings and its change, since a lane's position gives only the value
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-let-dot-move` — let a dot move to avoid an overlap without the move being visible as declared jitter — a silent nudge is a value moved
- `no-offer-definition-page` — offer a definition the page cannot state: each rung names what it sums over, and the caveat travels with the state

## Precision to assert
- the runner refuses to render if the floor did not rise far while the ceiling barely moved, if the spread did not close by more than the stated fraction, or if the last rung does not open it
- one scale for both lanes over the full domain, in every state
- every rung's floor, ceiling, spread and median are derived in the runner from the frozen file

## Devices the worked example implements
- **`qualify.ts`** — the reader changes what the quantity is summed over, which on this type is the argument rather than the preamble (`skills/chart-web/assets/qualify.ts`)
- **An asserted counter-rung** — the state that contradicts the headline is required to exist (`render-directions-web.mjs`)
- **Leaders joining a category to itself** — the only line on the plate, which stops the two lanes reading as two populations (`DirectedDotStripWeb.tsx`)

## Worked example
`proof/web-dot-strip-lowcarbon-spread/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedDotStripWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/qualify.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type dot-strip --beat proof/web-dot-strip-<subject> --static proof/static-dot-strip-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
