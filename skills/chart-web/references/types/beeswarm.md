# Beeswarm — in web

**Argues:** A beeswarm shows every raw observation on one shared value axis, with no aggregation and no overlap — the "show your data" distribution chart.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-beeswarm-co2-per-person` (2026-09-15), from `proof/static-beeswarm-co2-per-person`.

- **The gesture**: the reader chooses the UNIT the swarm is thick in — people, countries, tonnes — and
  the same 213 marks at the same 213 values re-pack around the answer.
- **Start from the width, not the position.** A beeswarm has one axis of data; the other is the room
  the packing needs and encodes nothing. What that spend buys is the swarm's WIDTH at each value — and
  that width is a count of whatever the marks are SIZED by, which no plate can say out loud.
- **Build it with `chart-web/assets/weigh.ts`**, native radios plus build-time CSS: no script, no
  listener, the full plate with a working control when JavaScript is off. Each weighting is its own
  `<svg class="chart">`, drawn once at its own packing and revealed by the stylesheet.
- **The packing is deterministic and stated**: marks placed in descending radius, each at the y closest
  to the axis that clears every circle already placed. No force simulation, no seed — that is what
  makes the picture a measurement rather than a rendering.
- **Refused: animating the marks.** The three swarms CUT. `interaction.mjs` reads `cx`/`cy` once at
  init, so a mark morphed into a new place would keep answering for the place it left. What travels is
  the one element whose movement is the argument — the caret at the centre of mass. No text moves.

## Reader gestures
- **`weigh` — « L'essaim est épais ici. Épais de quoi ? »** — the reader chooses the unit the swarm is thick IN: the same 213 marks at the same 213 positions, re-packed from scratch under a different weighting, so the free dimension the type spends on not overlapping becomes a reading
- **`ask-a-mark`** — one circle answers with the share of the population that emits less, which is the reading its position does not already give
- **What does NOT move** — no mark leaves, no mark moves along the axis, no mark is binned, and the two derived callouts keep the accent in every state
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-let-accent-follow` — let the accent follow whichever mark is largest in the current state — the subject named by the claim keeps the accent under every option
- `no-ship-weighting-monotone` — ship a weighting that is a monotone function of the mark's own position: the swarm's width would then say only what the axis says (refused by measuring Spearman's rho against a declared ceiling)

## Precision to assert
- the packing is re-derived per state, not transformed — there is no `dx` and no `sx` anywhere
- the runner refuses to render if the heaviest emitters hold 1 % or more, if the average sits above less than 60 % of people, or if the largest circle is not below the country median
- both callouts are derived (the biggest circle and the farthest one out), never chosen, and they are set in the page's neutral ink, never in the accent

## Devices the worked example implements
- **`weigh.ts`, written for this beat** — what a mark is WORTH, and therefore how much room it claims (`skills/chart-web/assets/weigh.ts`)
- **The rho refusal** — a declared ceiling on the correlation between weight and value, measured per option (`render-directions-web.mjs`)
- **Radios plus build-time `:has()`/`:checked` CSS** — three re-packings shipped with no script at all (`DirectedSwarmWeb.tsx`)

## Worked example
`proof/web-beeswarm-co2-per-person/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared `interaction` plan and the refusals it is checked against), `DirectedSwarmWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/weigh.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type beeswarm --beat proof/web-beeswarm-<subject> --static proof/static-beeswarm-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
