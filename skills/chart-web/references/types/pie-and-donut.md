# Pie and donut — in web

**Argues:** A pie (or donut) answers exactly one question: of a fixed whole, what share does each part hold, when there are few enough parts that the reader can hold all of them in view at once.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-donut-world-co2-share` (2026-09-15), from
`proof/static-donut-world-co2-share`.

- **Vocabulary: `chart-web/assets/level.ts`** — the reader picks a country and it takes the ring.
- **The gesture is taking identity OFF the ramp and putting it on a control**: the type sheet says
  colour is this form's only differentiator between adjacent parts, and seven tones of one hue that
  all clear the 3:1 non-text floor do not exist in these directions.
- **Start from two concentric rings, not two pies**: a shared centre and a shared angular scale make
  a wedge's ANGLE comparable between the years; the two totals are PRINTED rather than drawn, which
  is the honest split.
- **Answer on both rings at once**: the chosen country lights in 2000 and in 2023, with the share it
  held in the OTHER year laid beside it as a reference band.
- **Refused: leaving the remainder as a gap.** `conservation-is-kept-visible` — the six named wedges
  plus "all the others" make the whole, and the remainder is drawn as a wedge like any other.

## Reader gestures
- **`find-your-own-case` (`level.ts`) — « La Chine et les États-Unis ont échangé. Et la Russie ? Et l'Inde ? »** — the reader lays one member's share from the OTHER year onto the ring in front of them and sees the two arcs miss each other, which is the comparison two concentric rings make hardest
- **The chosen member is RINGED, not recoloured** — which is the first time its pair can be found at all among seven wedges
- **`ask-a-mark`** — a wedge answers with its share in both years, its tonnes and the direction each moved
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-drop-members-get` — drop members to get under the type's five-wedge ceiling: the set is a computed rule shared with its sibling beats, and dropping two would make this page's WHOLE a different whole
- `no-recolour-subject` — recolour the subject: the accent is spent on the ring, so the two slivers the type warns about stay legible as slivers

## Precision to assert
- wedge angles sum to the same asserted whole on every ring
- the beat refuses if the two named members did not swap or if the whole did not grow by at least the stated fraction
- the measured span of every wedge is derived and recorded, so the type's blur ceiling is refused by arithmetic rather than by taste

## Devices the worked example implements
- **A share from the other year laid on this year's ring** — the yardstick applied to an angular geometry (`skills/chart-web/assets/level.ts`)
- **Ring, not recolour** — the subject convention kept where seven wedges make finding a pair hard (`DirectedDonutWeb.tsx`)
- **Measured wedge spans in the brief** — the slice ceiling met with numbers rather than with a rule of thumb (`render-directions-web.mjs`)

## Worked example
`proof/web-donut-world-co2-share/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedDonutWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/level.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type pie-and-donut --beat proof/web-pie-and-donut-<subject> --static proof/static-pie-and-donut-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
