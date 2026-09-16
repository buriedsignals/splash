# Treemap — in web

**Argues:** A treemap answers "how does a total break down, when the pieces ALSO belong to groups worth keeping together" — area encodes each item's value and items sharing a group are laid out as contiguous tiles.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script.

## Recorded from the validated beat

Worked example: `proof/web-treemap-europe-capacity` (2026-09-15), from
`proof/static-treemap-europe-capacity`.

- **Vocabulary: `chart-web/assets/descend.ts`** — choosing a source throws the frame away and
  re-squarifies it over that source alone.
- **The gesture is the reader DESCENDING**: a treemap buys density and sells comparability, and the
  small cells are unlabelled by necessity — driven in a browser, the root view names 23 of 41
  countries at 1440 px and 21 at 1280. A still picks one level and the rest stay anonymous for ever;
  a video or a scrolly descends into the AUTHOR's branch on the AUTHOR's clock, once.
- **Start from a hierarchy the plate never draws**: every station carries a fuel, so the continent is
  Europe, then source, then country. Nine countries the root cannot name are named by descending at
  1440 px, eleven at 1280.
- **Carry the accent through the descent**: it marks the eight countries whose fleet has tipped to
  wind and sun — 5,8 % of the frame inside the atom, 54,8 % inside the wind. The headline asserts the
  tipping; descending shows it. The accent marks the thread, never the largest cell, which already
  shouts by being large.
- **Refused: dropping the tail, and deciding the label at build time.** Every country a view holds is
  drawn in it, including those too small to hold a name — a treemap that quietly drops its tail is a
  pie chart with better manners. The label degrades rather than disappears (name and number, then
  name, then the pointer), decided by the CONTAINER.

## Reader gestures
- **`descend` — « Et dans cette branche-là, qui pèse quoi ? »** — a treemap buys density and SELLS comparability, and its small cells are unlabelled by necessity (23 of 41 named at 1440 px, 3 on a phone — measured in a real browser); so one part becomes the whole, re-squarified over the full plate, and the reader climbs back out
- **`ask-a-mark`** — a cell answers with its name and value at any depth, which is what keeps the anonymous cells reachable
- **What does NOT move** — the takeaway, the thread's accent and the stated total
- **Default state** — the picture a reader who touches nothing is looking at, which is also the picture a reader with no script never leaves: the whole plate, its claim, its reference marks and its accent
- **Keyboard and touch** — every reading is `tabIndex={0}` at build time and one `show(point, x, y)` serves focus and pointer alike; the controls are native form elements with the treatment layered on top (`opacity: 0`, never `display: none`)

## A choreography must NOT
- put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- narrow a treemap without re-scaling: a filter's own promise is that the frame does not move, which is the exact opposite of a descent, and narrowing without re-squarifying leaves the same picture with holes
- pick label ink by a brightness rule — `inkOnFill` measures each candidate against THAT EXACT fill and takes whichever wins

## Precision to assert
- tile area stays proportional to the asserted value at every depth, and a descent re-squarifies so a cell's area means share OF THIS BRANCH
- how many cells can carry their own name is a question about the reader's pixels and is measured in a real browser at several widths, not assumed at build time
- where the format's own census cannot SEE a control, the page declares no plan rather than naming a gesture it does not ship — and says so — while the mechanical half still runs on the hover it does ship

## Devices the worked example implements
- **`descend.ts`** — what may BECOME THE WHOLE, which no set, arrangement, reference, sum, fold or span vocabulary can express (`skills/chart-web/assets/descend.ts`)
- **`inkOnFill` per cell** — the type's filed accessibility trap measured rather than ruled (`DirectedTreemapWeb.tsx`)
- **A named gap in the guard** — `shippedControls` knows five kinds and a descent is none of them, so the limit is written down instead of squatted on (`BRIEF.md`, cited here)

## Worked example
`proof/web-treemap-europe-capacity/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, every derived answer, the claim, the words, the declared plan where one can be declared, and the refusals it is checked against), `DirectedTreemapWeb.tsx` (the drawing, the answer markup, the generated stylesheet and the accessible table), `skills/chart-web/assets/descend.ts`. `BRIEF.md` records the controls and what each one had to pass, not the shape. `skills/chart-web/scripts/scaffold-web-beat.mjs --type treemap --beat proof/web-treemap-<subject> --static proof/static-treemap-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
