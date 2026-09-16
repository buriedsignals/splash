# Slope — in web

**Argues:** A slope chart answers "who moved, in which direction, and by how much, between exactly two moments" — for many categories at once.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-slope-europe-lowcarbon` (2026-09-15), from
`proof/static-slope-europe-lowcarbon`.

- **Vocabulary: `chart-web/assets/level.ts`**, which lays a chosen country's own two levels flat
  across both rails.
- **The gesture is handing the reader the PIVOT**: the plate holds one and it is the author's — every
  line read against France because France is what the headline names.
- **Start from two rails and no axis between them**: the angle says which way and how fast, the two
  printed numbers say how much, and neither is asked to do the other's job.
- **Derive the crossings rather than believe them on sight**: a pair crosses when the sign of their
  gap flips between the rails, and the subject's crossing is ringed at the point the two lines
  actually meet — the parameter `t` the runner solves for. The sentence under the control carries the
  crossings the reader's choice implies, in both directions.
- **Let the connector answer for itself** — `ask-a-line`, the one gesture this corpus ships on a
  single page: what LINKS the two ends, never either end again. **Refused: a transform.** Every
  option's two rules are drawn once at their own height and hidden; the stylesheet only reveals them.

## Reader gestures
- **`find-your-own-case` (`level.ts`) — « Et par rapport à ce pays-là ? »** — the plate holds ONE pivot because the headline names it; here the pivot becomes the reader's, and any of the categories can be laid flat across both rails
- **`ask-a-line` — the one gesture this corpus ships on a single page** — the CONNECTOR answers with what LINKS its two ends and neither end carries: the gain, the rank of that gain, and the name of everyone passed on the way. **Refused: a transform** — every option's two rules are drawn once at their own height and hidden, and the stylesheet only reveals them
- **What does NOT move** — the two rails, the sixteen lines, the labels and the headline's own pivot
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-believe-crossing-sight` — believe a crossing on sight — a pair crosses when the sign of their gap FLIPS, and the crossing's height is read off BOTH lines and refused unless the two agree
- `no-truncate-category-label` — truncate a category label to fit a fixed gutter: the gutter is sized to the label, and the measured overlaps are bounding boxes, measured at five widths, not glyphs

## Precision to assert
- both end columns keep the same shared scale in every state
- the beat throws if any category fell, or if the number that overtook the pivot is not exactly the asserted one
- the crossing's parameter `t` is solved, and its height verified against both lines

## Devices the worked example implements
- **`ask-a-line`** — the connector as the thing that answers, which no other page in this corpus ships (`DirectedSlopeWeb.tsx`)
- **A reader-chosen pivot** — the fifteen readings a still and a video have to leave out (`skills/chart-web/assets/level.ts`)
- **Rules drawn once and revealed** — no transform, so nothing re-opens the hole `stack.ts` paid for (`DirectedSlopeWeb.tsx`)

## Worked example
`proof/web-slope-europe-lowcarbon/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared plan where one can be declared, and the refusals it is checked against), `DirectedSlopeWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/level.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type slope --beat proof/web-slope-<subject> --static proof/static-slope-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
