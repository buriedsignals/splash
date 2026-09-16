# Hex grid — in web

**Argues:** A hex-grid map answers "where is this cluster of scattered EVENTS actually densest," by aggregating raw points into a regular grid of cells.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script. On a map the picture is a LIVE MapLibre map over MapTiler's own tiles — no `viewBox`, so the map fills the figure's width — and every beat states what Web Mercator costs THIS subject, derived on every render rather than quoted from a sibling.

## Recorded from the validated beat

Worked example: `proof/web-hex-grid-europe-protection` (2026-09-15), from `proof/static-hex-grid-europe-protection`.
Vocabulary: `skills/map-web/assets/pool.ts` + `skills/map-web/assets/live-hex.ts`.
**The gesture**: the reader holds THE GRAIN — over how many cells a cell adds up its own numerator and its own denominator before it divides.

- **Build the grid in Web Mercator METRES, never in degrees**: one degree of latitude is not one degree of longitude on a Mercator screen, and
  a grid laid out in degrees is a grid of sheared cells. Unproject to lon/lat only to hand the seats to MapLibre.
- **Nothing moves between grains**: a cell's seat is a function of the drawn grid and of no grain, so the states are the same polygons at the
  same places with different fills — `fill-color` and `line-opacity` interpolate over the beat's own duration. The legend is IDENTICAL under
  every grain; that is this vocabulary's whole distinction from `classing.ts`, where the bounds themselves move.
- **No `radius` at all**: hexagons are `fill` and `line` layers, so `live-map.mjs`'s three radius behaviours do not apply — and the type's
  purchase is that every cell is equal on the screen, which a screen-held or ground-held circle would not give.
- **Print what Mercator costs THIS subject**: the cells are rigorously equal because they are built in Mercator metres — that is the type's
  buy — but the GROUND under them is not. Area inflates by 1/cos²(lat), so derive the northernmost seat against the southernmost on the grid
  the page really draws, and print the factor rather than burying it.

## Reader gestures
- **`pool` — « Sur quelle largeur est-ce qu'on additionne ? »** — the reader holds THE GRAIN: over how many cells a cell adds up its own numerator and its own denominator before it divides
- **Nothing moves between grains** — a cell's seat is a function of the drawn grid and of no grain, so the states are the same polygons at the same places with different fills, and `fill-color` and `line-opacity` interpolate over the beat's own duration
- **The legend is IDENTICAL under every grain** — which is this vocabulary's whole distinction from `classing.ts`, where the bounds themselves move
- **`ask-a-cell`** — a cell answers with its numerator, its denominator and its rate at the current grain
- **Default state** — the picture a reader who touches nothing is looking at: the whole plate, its legend with bounds and counts, its value table and its caveat — all of it still there with no script, no key and no network
- **Keyboard and touch** — every reading is reachable by focus as well as by pointer, one path for both, and the controls are native form elements with the treatment layered on top

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-quote-sibling-beat` — quote a sibling beat's Mercator figure, or type one: the cost is DERIVED for this subject on every render and stated in the reader's own words
- `no-let-stylesheet-reach` — let a stylesheet reach a MapLibre paint — no stylesheet does, so the map's half of a state change is built at build time from the same index the markup carries, and what survives with the script off is said on the page
- `no-build-grid-degrees` — build the grid in DEGREES: one degree of latitude is not one degree of longitude on a Mercator screen, so a grid laid out in degrees is a grid of sheared cells — build in Web Mercator METRES and unproject only to hand the seats to MapLibre
- `no-let-legend-bounds` — let the legend's bounds move with the grain: that is a different gesture with a different vocabulary, and conflating them means one word for two behaviours

## Precision to assert
- bin aggregation is computed from the frozen events, and every region is present beneath the grid
- the cells are rigorously equal because they are built in Mercator metres — that is the type's buy — but the GROUND under them is not
- area inflates by 1/cos²(lat): derive the northernmost seat against the southernmost ON THE GRID THE PAGE REALLY DRAWS, and print the factor rather than burying it

## Devices the worked example implements
- **`pool.ts`** — the grain as the control, with the legend held identical across states (`skills/map-web/assets/pool.ts`)
- **`live-hex.ts`** — interpolated fills over fixed polygons, so nothing moves (`skills/map-web/assets/live-hex.ts`)
- **A grid built in Mercator metres** — equal cells on the screen, which is what the type is bought for (`camera.ts`)

## Worked example
`proof/web-hex-grid-europe-protection/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, the claim, the words, the live plan, the gesture declaration, the derived Mercator cost and the refusals), the grid IS the geometry here, built in Web Mercator metres inside the runner rather than in a camera module, `DirectedHexGridWeb.tsx` (the two-layer arrangement, the drawing, the HTML overlay and the accessible table), `skills/map-web/assets/pool.ts`, `skills/map-web/assets/live-hex.ts`. `BRIEF.md` records the gesture argued before the code, not the shape. `skills/map-web/scripts/scaffold-web-map-beat.mjs --type hex-grid --beat proof/web-hex-grid-<subject> --static proof/static-hex-grid-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
