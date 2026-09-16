# Population pyramid — in web

**Argues:** A population pyramid is two back-to-back bar charts sharing a central category axis: ordered bands run up the middle, one group's bars extend left, the other's right, on the same scale.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-population-pyramid-switzerland` (2026-09-15), from
`proof/static-swiss-age-pyramid`.

- **Vocabulary: `chart-web/assets/fold.ts`**, guarded by `assertFoldDeclaration`, which refuses a
  declaration that does not offer the fold BOTH ways round — on a mirrored type a one-way fold is a
  claim about which half is the norm, and these two halves are peers by construction.
- **The gesture is folding one half onto the other**: two lengths measured in opposite directions
  from a shared zero cannot be subtracted by eye, so the profile is carried across and laid over the
  bars at its own measured values. It crosses exactly once, and that crossing is the reading.
- **Start from the silhouette with its turn named**: the halves meet at a centre line and the band
  where the shape stops widening is NAMED, because widest-in-the-middle is an ageing population and
  nothing but that band says which. Both halves are named in words.
- **Keep the second channel**: every band still answers with both counts, the total, the difference
  between the sexes, and the band's SHARE of the whole population.
- **Refused: a dashed outline, and a straddling neutral.** A dash is the costume for a RULE a reader
  reads a value off; this mark is a SHAPE. And the centre here is a boundary between two populations,
  not a category belonging to neither — there is nothing to straddle it with. The two fills are
  chosen so the line clears 3:1 against each of them as well as against the ground, or the component
  throws.

## Reader gestures
- **`fold` — « À quel âge les deux moitiés changent de place ? »** — two lengths measured in opposite directions from a shared centre is the worst arrangement for a difference, and it is the arrangement this type is defined by; so one half's silhouette is laid OVER the other as a continuous staircase and the difference stops being an inference and becomes a shape
- **The crossing IS the reading** — wherever the folded profile juts past the bar it lies on, the folded group leads; the staircase crosses exactly once, and that band is named
- **`ask-a-mark`** — a band answers with both counts, the total, the difference and the band's share of the whole population
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- sort the bands by size — the silhouette only exists while the age sequence stays intact top to bottom; the fold moves nothing vertically and re-orders nothing
- ship a profile with a hole in it: `assertFoldDeclaration` refuses one that does not name EVERY drawn band EXACTLY ONCE, in the drawn order

## Precision to assert
- the shared centre never moves and both sides keep the same scale in every state
- the widest band is FOUND, not typed, and the beat throws if it turns out to be the youngest
- `foldPath` builds the staircase in the geometry's own units with no transform anywhere, so nothing re-opens the hole `stack.ts` paid for

## Devices the worked example implements
- **`fold.ts`** — what may be laid OVER what is drawn, which no set, arrangement, rule or arithmetic vocabulary can express (`skills/chart-web/assets/fold.ts`)
- **A continuous staircase at measured values** — the difference given as a shape with a named crossing (`DirectedPyramidWeb.tsx`)
- **The band share in the answer** — what turns a silhouette into a claim about how many people are where (`render-directions-web.mjs`)

## Worked example
`proof/web-population-pyramid-switzerland/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedPyramidWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/fold.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type population-pyramid --beat proof/web-population-pyramid-<subject> --static proof/static-population-pyramid-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
