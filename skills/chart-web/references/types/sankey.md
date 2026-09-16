# Sankey — in web

**Argues:** A sankey diagram answers "how does a quantity flow and split as it moves through a sequence of stages" — ribbons between columns of nodes whose THICKNESS is proportional to the amount flowing.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-sankey-electricity-sources` (2026-09-15), from
`proof/static-sankey-electricity-sources`.

- **Vocabulary: `chart-web/assets/trace.ts`**, which refuses an option whose drawn segments plus its
  stated remainder do not equal the total its node prints, in every state the control can produce.
- **The gesture is the reader picking the path to follow**: a plate picks one path for them (the one
  in the title) and leaves the other eight as a tangle.
- **Start from the network with every node printing its own total** — a sankey's promise is
  conservation, and a node that hides its total asks to be trusted rather than checked.
- **Light the whole downstream and recede the rest**: the countries the chosen source never reaches
  go HOLLOW, and the path's arithmetic is written at both ends — how much left, how much arrived,
  what share of the receiving country, and how much the plate does not draw at all.
- **Refused: translucency on the traced path.** Ribbons are translucent only in the RECEDED field, so
  crossings stay honest; the lit path is laid at 0,95 and deliberately occludes, because a path the
  reader asked to follow that goes half-transparent at every crossing is one they cannot follow. The
  receded field is scaffolding and says so — measured, it can only reach 1,98:1 against the ground.

## Reader gestures
- **`trace` — « Cette source-là, elle va où, exactement ? »** — the reader follows ONE flow end to end through the tangle and the arithmetic of the journey is WRITTEN: what left, what arrived where, and what is unaccounted for
- **`ask-a-mark`** — a ribbon answers with its two ends and its value; a node with its total and the count of its own ribbons
- **What does NOT move** — the columns, the node order, the ribbon widths and the conservation the diagram promises
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-check-conservation-against` — check conservation against the DATA and call it checked: fifteen links here fall under half a pixel and are not drawn, so the promise is verified against what the plate DRAWS, per node, with the undrawn residue printed
- `no-let-followed-flow` — let a followed flow re-scale anything — tracing selects, it does not re-proportion

## Precision to assert
- every node's total equals the sum of its own ribbons, checked against the drawn geometry and not only against the file
- the undrawn residue per node is measured and stated, because a sub-pixel ribbon is a quantity the picture silently loses
- every revealed reading along a traced path is derived in the runner

## Devices the worked example implements
- **`trace.ts`** — one thing followed through a sequence of stages, with its journey's arithmetic as the answer (`skills/chart-web/assets/trace.ts`)
- **Conservation measured against the drawing** — a per-source table of node total, drawn and undrawn (`render-directions-web.mjs`)
- **The residue printed rather than rounded away** — the type's own promise kept honestly (`DirectedSankeyWeb.tsx`)

## Worked example
`proof/web-sankey-electricity-sources/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared plan where one can be declared, and the refusals it is checked against), `DirectedSankeyWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/trace.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type sankey --beat proof/web-sankey-<subject> --static proof/static-sankey-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
