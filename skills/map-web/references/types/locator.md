# Locator — in web

**Argues:** A locator answers "where, exactly" — it names a set of places relevant to the story with nothing more than position and, optionally, a category.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script. On a map the picture is a LIVE MapLibre map over MapTiler's own tiles — no `viewBox`, so the map fills the figure's width — and every beat states what Web Mercator costs THIS subject, derived on every render rather than quoted from a sibling.

## Recorded from the validated beat

Worked example: `proof/web-locator-zaporizhzhia` (2026-09-15), from `proof/static-locator-zaporizhzhia`.
Vocabulary: `skills/map-web/assets/vantage.ts` + `skills/map-web/assets/live-locator.ts`.
**The gesture**: the reader chooses THE REMOVE — how far back the author stood — because on the type with the least to say, the framing is the only decision anybody made, and it decides which neighbour the reader ends up believing matters.

- **Make each remove an answer, not a magnification**: its own window, its own stated drawing rule, its own census of what the frame holds
  and therefore what is not drawn, its own scale bar, its own sentence. `vantage.ts` refuses a ladder that does not climb by at least a
  factor of two per rung. MapTiler's zoom stays on — it is continuous and anonymous, it argues nothing; the remove is the editorial gesture.
- **Use `radius: "fixed"`**: a pin is not a measurement, so every marker holds the same screen size at every zoom, exactly as the plate drew it.
  A camera-held or ground-held radius would make the marker read as a quantity, which on this type there is none of.
- **Photograph the camera**: unlike a fill re-paint, a camera can be frozen — bake one picture per remove from the page's own live map and swap
  them with pure CSS (`:has()` + `:checked`). With no script, no key and no network the reader still gets every remove, legend line, scale bar
  and sentence; what the live layer adds is the travel between them, which is not the gesture.
- **Print what Mercator costs THIS subject, and it is not what it costs a choropleth**: a locator is read by DISTANCE, so the cost lands on the
  SCALE BAR. Ground scale runs as `cos(latitude)`, so a bar true at the frame's centre is wrong at its edges by a factor that grows with the
  remove — derive it for every window on every render and carry the widest in the standfirst.

## Reader gestures
- **`vantage` — « On est à quelle distance, au juste ? »** — the reader chooses THE REMOVE, how far back the author stood, because on the type with the least to say the framing is the only decision anybody made, and it decides which neighbour the reader ends up believing matters
- **Each remove is an ANSWER, not a magnification** — its own window, its own stated drawing rule, its own census of what the frame holds and therefore what is not drawn, its own scale bar, its own sentence; `vantage.ts` refuses a ladder that does not climb by at least a factor of two per rung
- **`ask-a-marker`** — a pin answers with its name and its category, which the map's own labels are removed in favour of
- **Default state** — the picture a reader who touches nothing is looking at: the whole plate, its legend with bounds and counts, its value table and its caveat — all of it still there with no script, no key and no network
- **Keyboard and touch** — every reading is reachable by focus as well as by pointer, one path for both, and the controls are native form elements with the treatment layered on top

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-quote-sibling-beat` — quote a sibling beat's Mercator figure, or type one: the cost is DERIVED for this subject on every render and stated in the reader's own words
- `no-let-stylesheet-reach` — let a stylesheet reach a MapLibre paint — no stylesheet does, so the map's half of a state change is built at build time from the same index the markup carries, and what survives with the script off is said on the page
- `no-let-marker-size` — let a marker's size carry anything: `radius: "fixed"`, the same screen size at every zoom, exactly as the plate drew it — a camera-held or ground-held radius would make the pin read as a quantity, and on this type there is none
- `no-treat-maptiler-continuous` — treat MapTiler's continuous zoom as the gesture: it is continuous and anonymous and argues nothing; the REMOVE is the editorial gesture

## Precision to assert
- label decluttering is deterministic and the map's own labels are removed, because the naming is the beat's editorial decision
- each remove states what the frame holds and therefore what is NOT drawn
- a locator is read by DISTANCE, so Mercator's cost lands on the SCALE BAR: ground scale runs as cos(latitude), so a bar true at the frame's centre is wrong at its edges by a factor that grows with the remove — derive it for every window on every render and carry the widest in the standfirst

## Devices the worked example implements
- **`vantage.ts`** — the remove as the control, with a refused ladder that does not climb (`skills/map-web/assets/vantage.ts`)
- **Photograph the camera** — one baked picture per remove from the page's own live map, swapped with pure CSS, so every remove survives with no script, no key and no network (`skills/map-web/assets/live-locator.ts`)
- **A scale bar derived per window** — the projection's cost carried where this type is actually read (`render-directions-web.mjs`)

## Worked example
`proof/web-locator-zaporizhzhia/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, the claim, the words, the live plan, the gesture declaration, the derived Mercator cost and the refusals), `bake.mjs` (`BEAT.bounds`, the camera gate, one baked picture per remove per filed direction), `DirectedLocatorWeb.tsx` (the two-layer arrangement, the drawing, the HTML overlay and the accessible table), `skills/map-web/assets/vantage.ts`, `skills/map-web/assets/live-locator.ts`. `BRIEF.md` records the gesture argued before the code, not the shape. `skills/map-web/scripts/scaffold-web-map-beat.mjs --type locator --beat proof/web-locator-<subject> --static proof/static-locator-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
