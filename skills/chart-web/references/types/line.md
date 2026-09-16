# Line — in web

**Argues:** A continuous series read against an ordered axis, almost always time, encoded as position and joined into a single stroke that reads as one trend.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-line-swiss-co2` (2026-09-15), from `proof/co2-suisse`.

- **The gesture is `ask-a-mark`**, on the format's shared `assets/interaction.mjs` and declared in
  `BRIEF.md` through `assets/interaction-plan.ts`: no bespoke vocabulary, because the reader's move
  here is to point at a year.
- **Give the reader the baseline the plate had to choose for them**: a still prints four of 167
  readings and asserts ONE comparison; here each of the 167 years answers with its own value, its
  distance under the peak, the pre-peak year it winds the series back to, and where today stands
  against it.
- **Derive every answer in the runner, from one function**: `woundBackTo` computes both the title's
  reference year and every year's own clause, so the tooltip cannot disagree with the headline.
- **Resolve by nearest x, not by hit-testing the circle**: at 375 px consecutive years are 2 px
  apart; pointer, tap and Left/Right/Home/End share one path and every reading is focusable at build
  time.
- **Refused: a brush or an era filter.** The x-axis IS the encoded variable, so every option takes
  years off the frame — and two of them, 1973 and 1967, are the claim. Refused on rule 5, not taste.

## Reader gestures
- **`ask-a-mark` — « Elle valait combien, cette année-là, et où en est-on par rapport à elle ? »** — the only page in this corpus that spends NO control vocabulary: any of the series' readings answers with the headline's own arithmetic run on it, which is the comparison a still can only make once
- **One path for pointer, tap and keyboard** — a pointer anywhere on the plot resolves to the nearest reading, and focus uses the same `show`
- **What does NOT move** — the whole curve, the peak, the reference rule and the subject are drawn unconditionally
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-add-control-because` — add a control because the other thirty-one pages have one: the repertoire is reached for when a claim needs it, and a page that adds one to fill a row is the reflex the doctrine refuses
- `no-bridge-gap-series` — bridge a gap in the series, or anchor the value axis at zero because a bar chart would

## Precision to assert
- the reference year is FOUND, not typed — the last year before the peak still at or below today's reading — and the beat throws if today does not sit between the two readings or if the fall from the peak is not large
- a gap breaks the line rather than being bridged across missing readings
- every revealed reading (the distance from today, the years it winds back) is computed in the runner

## Devices the worked example implements
- **The headline's arithmetic run on every reading** — one comparison on the plate becomes 167 (`render-directions-web.mjs`)
- **Nearest-reading resolution shared by pointer and focus** — no thinner keyboard mode (`DirectedLineWeb.tsx`)
- **No vocabulary at all, said out loud** — the corpus's record that a page may earn its format on hover alone (`skills/chart-web/SKILL.md`'s type index)

## Worked example
`proof/web-line-swiss-co2/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedLineWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), no control vocabulary — this page spends hover, tap and keyboard only, and says so. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type line --beat proof/web-line-<subject> --static proof/static-line-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
