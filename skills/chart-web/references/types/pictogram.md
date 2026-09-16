# Pictogram — in web

**Argues:** A pictogram states a magnitude as a countable row of equal-size icons, where ONE icon always stands for a stated number of units and count — never icon size — carries the value.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-pictogram-europe-lowcarbon` (2026-09-15), from
`proof/static-pictogram-europe-lowcarbon`.

- **Vocabulary: `chart-web/assets/unit.ts`**, written for this beat — native radios plus build-time
  CSS: no script, no listener, the complete field WITH a working control when JavaScript is off.
- **The gesture is the reader changing what one icon is worth**, because on the only type that asks a
  reader to COUNT, the unit is not a setting — it IS the argument: four units, four headlines, one
  frozen file.
- **Start from the static plate exactly**: one square, one country, no part-square anywhere; every
  other unit ends each block on a partial square, clipped at the glyph's own ink and never at the
  cell's pitch, and refused outright below a declared sliver — the static sibling's refusal kept, and
  its tell drawn.
- **Move no square and no word**: a cell's seat is a function of the widest option's GRID, so every
  state is the same rectangles at the same places with different `width` — a real CSS property that
  interpolates. What cuts is the answering layer, one `.pt` set per option, because a square's
  READING differs in every state.
- **Refused: the per-country ramp.** Under a terawatt-hour unit a square is not a country and has no
  share to be shaded by, so colour belongs to the BLOCK — a plate repainting itself under a control
  pressed for another reason is the defect. A block is true in all four states.

## Reader gestures
- **`unit` — « Un carré, ça vaut quoi ? »** — the unit is not a setting of this chart, it is the whole argument: change it and the same file produces a different headline, so the reader holds the unit and watches the count change under a field that never moves
- **Nothing moves but the ink** — the grid is fixed at the widest option's capacity and every cell keeps its seat; the block names sit in a gutter the geometry never touches, and each block's figure is four spans stacked at one place, one revealed
- **`ask-a-mark`** — a square answers with the case it stands for and its reading
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-scale-icon-carry` — scale an icon to carry a value — icons are one shared size across the whole chart, because count is the encoding
- `no-offer-free-running` — offer a free-running slider: the ladder stops where a field stops being countable, and a pictogram that cannot be counted has given up the only thing it has over a bar chart

## Precision to assert
- one icon always equals the same stated unit within a state, and the unit is declared with the option
- the beat refuses to render if the blocks do not account for every case, if the claim's block is not the minority it says, or if any offered unit resolves a block to zero icons
- the fractional remainder is clipped at the right reference — the arithmetic the vocabulary owns, because clipping at the wrong one rounds a real fraction silently to nothing

## Devices the worked example implements
- **`unit.ts`, written for this beat** — what one mark is WORTH in count, which `weigh.ts` cannot say because its every rule is about size (`skills/chart-web/assets/unit.ts`)
- **A fixed grid at the widest option's capacity** — no square moves in any state (`DirectedPictogramWeb.tsx`)
- **Stacked per-option figures** — the digits change, the span never travels (`DirectedPictogramWeb.tsx`)

## Worked example
`proof/web-pictogram-europe-lowcarbon/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedPictogramWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/unit.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type pictogram --beat proof/web-pictogram-<subject> --static proof/static-pictogram-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
