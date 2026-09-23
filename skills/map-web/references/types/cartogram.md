# Cartogram — in web

**Argues:** A cartogram answers "how big is this region's VALUE," honestly, by distorting each region's own area to be proportional to a number — trading recognisable geography for magnitude.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script. On a map the picture is a LIVE MapLibre map over MapTiler's own tiles — no `viewBox`, so the map fills the figure's width — and every beat states what Web Mercator costs THIS subject, derived on every render rather than quoted from a sibling.

## Recorded from the validated beat

Worked example: `proof/web-cartogram-europe-lowcarbon` (2026-09-15), from `proof/static-cartogram-europe-lowcarbon`.
Vocabulary: `skills/map-web/assets/restore.ts`.
**The vocabulary** (what the page is built from; the reader's own gesture is one of `interaction-plan.ts`'s ten): the reader PUTS THE GEOGRAPHY BACK, one sacrifice at a time — first the place each unit really occupies, then the size it really weighs — and watches the headline figure move from the by-country number to the by-area one.

- **THIS ONE IS NOT A LIVE MAP, and the sheet says so rather than pretending.** There is no basemap and no geography to tile: the cells are the
  whole picture, drawn as SVG through the design base. So there is no MapTiler plan, no plate, no fallback image, no `bake.mjs`, and none of
  `live-map.mjs`'s three radius behaviours is in play — a cell is not a circle, a `camera`/`ground`/`fixed` choice does not arise. The other
  seven map types in this tree promise a place does not move; the cartogram is the named exception, which is why its gesture can be the movement.
- **Hand the sacrifice back in separable pieces, in argument order**: one cell per unit as filed → each cell relaxed towards its true centroid
  (the place given back, and the figure does not move a thousandth) → each cell at its true area, relaxed the same way (which lands on the
  choropleth's own figure, because this IS the choropleth, in squares).
- **Relax, never pile**: squares on their true centroids overlap catastrophically, and a well-drawn pile is still a pile. Keep each cell's area
  EXACTLY (assert side²/Σside² against the declared share to 1e-9) and move only the centres, by the smallest push that separates them.
- **Print the price of the relaxation**: every stage states the gap it leaves, worst and median, as a share of the map's width, and every cell
  answers with its own — and compares it against the hand-drawn tile grid, which charges the same price silently and charges more of it.
- **Mercator still has to be answered, on this type by absence**: the beat carries no Mercator drawing at all, so what it owes the reader is the
  statement that area here is a decision and not a fact about the earth — the projection's cost is exactly what the type has chosen to stop paying.

## Reader gestures
- **`restore` — « Et si on remettait la géographie ? »** — the reader PUTS THE GEOGRAPHY BACK one sacrifice at a time — first the place each unit really occupies, then the size it really weighs — and watches the headline figure travel from the by-country number to the by-area one
- **The sacrifices are separable and in argument order** — one cell per unit as filed → each cell relaxed towards its true centroid (the place given back, and the figure does not move a thousandth) → each cell at its true area, relaxed the same way, which lands on the choropleth's own figure, because this IS the choropleth, in squares
- **`ask-a-mark`** — a cell answers with its value, its share and its own displacement from where it belongs
- **Default state** — the picture a reader who touches nothing is looking at: the whole plate, its legend with bounds and counts, its value table and its caveat — all of it still there with no script, no key and no network
- **Keyboard and touch** — every reading is reachable by focus as well as by pointer, one path for both, and the controls are native form elements with the treatment layered on top

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-quote-sibling-beat` — quote a sibling beat's Mercator figure, or type one: the cost is DERIVED for this subject on every render and stated in the reader's own words
- `no-let-stylesheet-reach` — let a stylesheet reach a MapLibre paint — no stylesheet does, so the map's half of a state change is built at build time from the same index the markup carries, and what survives with the script off is said on the page
- `no-pile-cells-true` — pile the cells on their true centroids: squares on true centroids overlap catastrophically, and a well-drawn pile is still a pile — keep each cell's area EXACTLY and move only the centres, by the smallest push that separates them
- `no-treat-live-map` — treat this as a live map: there is no basemap and no geography to tile here, so there is no plan, no plate, no fallback and none of `live-map.mjs`'s radius behaviours — and the sheet says so rather than pretending

## Precision to assert
- each cell's area is asserted against its declared share to 1e-9 at every stage
- every stage prints the price of its relaxation — the gap it leaves, worst and median, as a share of the map's width — and every cell answers with its own
- Mercator is answered BY ABSENCE and the absence is stated: the beat carries no Mercator drawing, so what it owes the reader is that area here is a decision, not a fact about the earth

## Devices the worked example implements
- **`restore.ts`** — the geography handed back in separable, ordered sacrifices, with the headline figure travelling between two true numbers (`skills/map-web/assets/restore.ts`)
- **Relax, never pile** — smallest-push separation with area held exactly (`skills/map-web/assets/restore.ts`)
- **The price printed per stage and per cell** — and compared against the hand-drawn tile grid, which charges the same price silently and charges more of it (`render-directions-web.mjs`)

## Worked example
`proof/web-cartogram-europe-lowcarbon/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, the claim, the words, the live plan, the gesture declaration, the derived Mercator cost and the refusals), there is no basemap to tile and therefore no plan, no plate and no fallback — the cells are the whole picture, `DirectedCartogramWeb.tsx` (the two-layer arrangement, the drawing, the HTML overlay and the accessible table), `skills/map-web/assets/restore.ts`. `BRIEF.md` records the gesture argued before the code, not the shape. `skills/map-web/scripts/scaffold-web-map-beat.mjs --type cartogram --beat proof/web-cartogram-<subject> --static proof/static-cartogram-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
