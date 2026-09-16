# Connected scatter — in web

**Argues:** A connected scatter answers "what path did these two measures trace together, over time" — each point is ordered and the points are joined into a path, so loops and reversals become visible shapes.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-connected-scatter-lowcarbon` (2026-09-15), from `proof/static-connected-scatter-lowcarbon`.

- **The gesture**: the reader chooses which reading the arrowhead is AIMED at, and the hypotenuse the
  plate never decomposes is drawn as its own two legs.
- **Start from the one property no other type has: here the mark is a DISPLACEMENT.** A tail, a head
  and the bearing between them, over two axes measuring two different things — so the mark carries a
  reading neither axis carries alone, and the reader is otherwise asked to split it by eye across a
  plate where fifteen other segments cross it.
- **Build it with `chart-web/assets/aim.ts`.** Four heads — the full move, the vertical leg, the
  horizontal leg, and the same y against the frozen 2000 total — and EVERY head is a real point of the
  same plane, so not a tick, not a gridline and not an axis title ever changes meaning. The fourth
  explains the claim rather than restating it.
- **The tail never moves**: it is the 2000 position and it is also the mark the pointer resolves on.
  What answers is the arrow itself, shaft and head, lifted from its own ink by a SOUGHT dose — never a
  circle plated over it. Both axes are shares, so the pointer carries the absolute quantity underneath.
- **Refused: the static sibling's own labelling rule.** There, names go on the later state only; here
  the later state is the only thing about an entity that is NOT fixed, so names sit at the TAILS, which
  no option touches, and each option's figure is a separate span at its own head — revealed, never
  travelled. No word moves on this page.

## Reader gestures
- **`aim` — « Ce déplacement, c'est combien dans CHAQUE direction ? »** — the mark here IS a displacement, so the reader chooses which reading the arrow's HEAD is aimed at; the tail never moves, and every head it swings to is a real point of the same plane, so no tick, gridline or axis label ever changes meaning
- **What does NOT move** — no text: the country names sit at their TAILS, which no option touches, and each option's figure is its own span at its own head, revealed rather than travelled
- **`ask-a-mark`** — a tail answers with the two components of its own vector, which the plate draws as one hypotenuse of a triangle nobody draws
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- move the tail — the tail is the invariant the pointer resolves on, and a `dx`/`dy` that moved the whole arrow would destroy the one fixed thing on the page
- aim a head at a point the plate never drew: each head is checked against the frame, and the length and angle are DERIVED from the two declared points rather than typed beside them

## Precision to assert
- the path's drawn order matches the data's own ordering axis exactly
- the beat refuses to render if any case moved the wrong way, if the sub-claim's set is not a minority, if the subject did not move in the stated direction, or if any absolute output fell
- each option's decomposition is derived from the two declared points, at the two axes' own scales

## Devices the worked example implements
- **`aim.ts`, written for this beat** — a re-aimed arrow needs a ROTATION, which no affine in `stack.ts` or `hold.ts` expresses (`skills/chart-web/assets/aim.ts`)
- **Names nailed to the tails** — the static sibling's opposite rule knowingly not kept, with the reason written down (`DirectedConnectedScatterWeb.tsx`)
- **Per-option figures as separate spans** — four readings, none of which travels (`DirectedConnectedScatterWeb.tsx`)

## Worked example
`proof/web-connected-scatter-lowcarbon/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedConnectedScatterWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/aim.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type connected-scatter --beat proof/web-connected-scatter-<subject> --static proof/static-connected-scatter-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
