# Scatter — in web

**Argues:** A scatter plot answers one question: as one continuous variable moves, what happens to another, across every unit at once.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-scatter-income-life-expectancy` (2026-09-15), from
`proof/static-income-life-expectancy`.

- **Vocabulary: `chart-web/assets/level.ts`** — the reader parks a yardstick on a case, and it is ink
  only while they hold it.
- **The gesture is the reader moving the threshold**: a still can draw the author's rule and assert
  the band above it is narrow; it cannot let a reader stand anywhere else.
- **Start from the cloud as furniture**: the claim is about the SHAPE of the whole, so there is no
  named subject — every point is one neutral, and the only ink carrying an argument is the threshold
  rule and the band it names.
- **Answer with the claim in the reader's hand**: two references cross the plot at the chosen
  country's OWN values, one upright at its income and one flat at its life expectancy — at Nigeria,
  119 countries are richer and not one lives a shorter life; at the United States, 7th richest of
  165, forty poorer countries live longer.
- **Refused: the bubble.** Sizing by `sqrt(pop/max)` looks area-true and then the 2,4-unit radius
  floor pinned 95 of 165 countries identical across a 253× range, while the caveat said the area WAS
  the population; the floor cannot be lowered either, since a 21 220:1 range puts the smallest mark
  under one reader pixel. One radius for every country; population is carried in the answer.
  Say the log axis in words — it is the family's most common silent lie.

## Reader gestures
- **`find-your-own-case` (`level.ts`) — « Ce pays-ci, où est-il dans le nuage ? »** — the reader parks the threshold on a case they hold, and the counts that come back ARE the claim in their hand (how many are richer and none shorter-lived; how many poorer live longer)
- **`ask-a-mark`** — a point answers with its name and both readings, which a cloud of 165 anonymous marks cannot
- **What does NOT move** — both axes' scales, the author's declared break, the two measured bands and the accent, which is spent on the break and not on a country
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-map-value-radius` — map a value to RADIUS instead of AREA — and, past that, let a minimum radius pin most of the cloud at one size while the caveat says the area is the value; the floor and what it costs are measured and stated
- `no-spend-accent-single` — spend the accent on a single mark here: no one point is the argument

## Precision to assert
- both axes keep the same fixed scale in every state, and a log axis is declared as one
- both bands are measured off the data and the beat throws if the upper band is not much narrower than the lower
- the mark-size scale is area-true, and where area-true and visible are not both available on the frame, the trade is measured and written down

## Devices the worked example implements
- **A reader-parked threshold with derived counts** — the reversal that IS the flattening, drawable in no still (`skills/chart-web/assets/level.ts`)
- **An area-true radius with its floor costed** — 95 of 165 marks pinned at one size across a 253× range, measured (`render-directions-web.mjs`)
- **Names on demand** — the cloud stays anonymous until asked, which is what keeps it a cloud (`DirectedScatterWeb.tsx`)

## Worked example
`proof/web-scatter-income-life-expectancy/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared plan where one can be declared, and the refusals it is checked against), `DirectedScatterWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/level.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type scatter --beat proof/web-scatter-<subject> --static proof/static-scatter-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
