# Choropleth — in web

**Argues:** A choropleth answers "which of these named regions is proportionally worse or better off," where the regions are a partition the reader already recognises.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script. On a map the picture is a LIVE MapLibre map over MapTiler's own tiles — no `viewBox`, so the map fills the figure's width — and every beat states what Web Mercator costs THIS subject, derived on every render rather than quoted from a sibling.

## Recorded from the validated beat

Worked example: `proof/web-choropleth-europe-lowcarbon` (2026-09-15), from `proof/static-choropleth-europe-lowcarbon`.
Vocabulary: `skills/map-web/assets/classing.ts` + `skills/map-web/assets/live-choropleth.ts`.
**The gesture**: the reader picks the CLASSING RULE, because what a choropleth hides is that the partition was a choice.

- **Draw it live, not as paths**: every region is a MapLibre `fill` and `line` layer over MapTiler's own tiles, joined
  on the tileset's own key (ISO A2 here) — no `viewBox`, so the map fills the figure's width and the ratio question stops existing.
- **No `radius` at all**: a choropleth's marks are `fill` and `line` layers, so `live-map.mjs`'s three radius behaviours do not
  apply — the mark IS the ground, which is exactly why the projection's cost lands on the datum.
- **Print what Mercator costs THIS subject**: the mark is the ground, so Web Mercator inflates the value the reader reads.
  Derive the drawn area (shoelace at the plate's own camera) against the true spherical area, set the outsized region aside,
  and put the measured factor in the caveat — never a typed number, never a quote from a sibling beat.
- **State what the architecture costs the gesture**: no stylesheet reaches a MapLibre fill, so the map's half of the re-classing
  is one `setPaintProperty` per rule, built at build time from the same index the markup carries. With script off the reader keeps
  the plate, the legend's bounds and counts under every rule, and the value table whose swatches re-shade in pure CSS. Say so on the page.

## Reader gestures
- **`classing` — « Et si on coupait autrement ? »** — the reader picks the CLASSING RULE, because what a choropleth hides is that the partition was a choice; the legend's own bounds and counts move with it
- **`ask-a-mark`** — a region answers with its exact value and the class it falls in, which colour ranks but cannot measure
- **What does NOT move** — the camera, the geography, the takeaway and the no-data class
- **Default state** — the picture a reader who touches nothing is looking at: the whole plate, its legend with bounds and counts, its value table and its caveat — all of it still there with no script, no key and no network
- **Keyboard and touch** — every reading is reachable by focus as well as by pointer, one path for both, and the controls are native form elements with the treatment layered on top

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-quote-sibling-beat` — quote a sibling beat's Mercator figure, or type one: the cost is DERIVED for this subject on every render and stated in the reader's own words
- `no-let-stylesheet-reach` — let a stylesheet reach a MapLibre paint — no stylesheet does, so the map's half of a state change is built at build time from the same index the markup carries, and what survives with the script off is said on the page
- `no-shade-raw-count` — shade by a raw COUNT when the honest quantity is a RATE — area would then do uninvited work, and the map lies on the first glance
- `no-soften-failed-join` — soften a failed join into a quiet no-data class: the join is on the tileset's own key and a dropped region must throw at build time

## Precision to assert
- every region is present at the plate's camera and a region with no reported value carries the neutral no-data class, named in the legend
- the legend prints the actual bin boundaries as numbers under every rule, so no reading depends on discriminating the ramp
- Web Mercator inflates the value the reader reads, because here the mark IS the ground: derive the drawn area (shoelace at the plate's own camera) against the true spherical area, set the outsized region aside, and put the MEASURED factor in the caveat

## Devices the worked example implements
- **`classing.ts`** — the partition handed to the reader, with the legend's bounds and counts derived per rule (`skills/map-web/assets/classing.ts`)
- **`live-choropleth.ts`** — the map's half of the re-classing as one `setPaintProperty` per rule, built at build time from the index the markup carries (`skills/map-web/assets/live-choropleth.ts`)
- **A value table whose swatches re-shade in pure CSS** — the whole gesture survives with the script off (`DirectedChoroplethWeb.tsx`)

## Worked example
`proof/web-choropleth-europe-lowcarbon/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, the claim, the words, the live plan, the gesture declaration, the derived Mercator cost and the refusals), `camera.ts` (the MEASUREMENT projection, its window and `project` — the beat's central claim), `bake.mjs` (`BEAT.bounds`, the camera gate, one plate per filed direction), `DirectedChoroplethWeb.tsx` (the two-layer arrangement, the drawing, the HTML overlay and the accessible table), `skills/map-web/assets/classing.ts`, `skills/map-web/assets/live-choropleth.ts`. `BRIEF.md` records the gesture argued before the code, not the shape. `skills/map-web/scripts/scaffold-web-map-beat.mjs --type choropleth --beat proof/web-choropleth-<subject> --static proof/static-choropleth-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
