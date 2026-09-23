# Contour / isoline — in web

**Argues:** A contour (isoline) map answers "where does this continuous field cross a given value" by drawing lines that connect every point sharing the same value.

Owner rules that apply here: an interaction is a SPACE the reader explores, not a sequence — every control is compared against the DEFAULT state, never against the state before it; nothing argument-bearing sits behind a control; the page still reads whole with no script. On a map the picture is a LIVE MapLibre map over MapTiler's own tiles — no `viewBox`, so the map fills the figure's width — and every beat states what Web Mercator costs THIS subject, derived on every render rather than quoted from a sibling.

## Recorded from the validated beat

Worked example: `proof/web-contour-europe-distance` (2026-09-15), from `proof/static-contour-europe-distance`.
Vocabulary: `skills/map-web/assets/live-contour.ts`.
**The vocabulary** (what the page is built from; the reader's own gesture is one of `interaction-plan.ts`'s ten): the reader chooses THE STEP between the lines, because the step decides how much of the continuous surface survives into the picture, and it is the only decision on the page a reader cannot see.

- **State what each step costs in the field's own units**: too fine and the lines are drawn to a precision the measurement does not have
  (this field is a 7 km mesh, so a 50 km step draws texture the reader will take for information); too coarse and the headline's own figure
  falls inside the first band. A still, a video and a scrolly each pick one step and can only say that they did.
- **Keep the pointer's answer MEASURED, not banded**: the same point reads "entre 100 et 150 km" under one step and "entre 0 et 400 km" under
  another without moving a pixel, because the measured distance travels beside whichever band the chosen step put it in.
- **No `radius` at all**: the field, its bands and its isolines are `fill` and `line` layers, so none of `live-map.mjs`'s three radius
  behaviours applies. Print each break ON its line as a MapLibre marker in the page's own embedded faces — a symbol layer would fetch glyphs
  from a second host in a typeface nobody here chose.
- **Print what Mercator costs THIS subject**: measure the field on an equal-area grid (`camera.ts`, LAEA / EPSG:3035) and only DRAW it on
  Mercator, so no printed number moves — but the PICTURE does, and a contour map is read as a picture of how much land is far from the sea.
  Derive the cost every render and put it in the caveat in the reader's own words.

## Reader gestures
- **`live-contour` — « Et si les lignes étaient plus serrées ? »** — the reader chooses THE STEP between the lines, because the step decides how much of the continuous surface survives into the picture and it is the only decision on the page a reader cannot see
- **`ask-a-point`** — the same point reads « entre 100 et 150 km » under one step and « entre 0 et 400 km » under another without moving a pixel, so the MEASURED distance travels beside whichever band the chosen step put it in
- **What does NOT move** — the camera, the field, and the headline's own figure
- **Default state** — the picture a reader who touches nothing is looking at: the whole plate, its legend with bounds and counts, its value table and its caveat — all of it still there with no script, no key and no network
- **Keyboard and touch** — every reading is reachable by focus as well as by pointer, one path for both, and the controls are native form elements with the treatment layered on top

## A choreography must NOT
- `no-put-anything-argument` — put anything argument-bearing behind a control — the takeaway, the reference rule and the subject's accent are drawn unconditionally
- `no-ship-control-applied` — ship a control whose applied state equals the DEFAULT state — an answer the plate already prints is refused by `assertInteractionPlan`
- `no-describe-control-mechanism` — describe a control as a mechanism ("a hover detail", "a filter") instead of as the reader's own question, or let the browser format a number — every derived reading is computed in the runner
- `no-quote-sibling-beat` — quote a sibling beat's Mercator figure, or type one: the cost is DERIVED for this subject on every render and stated in the reader's own words
- `no-let-stylesheet-reach` — let a stylesheet reach a MapLibre paint — no stylesheet does, so the map's half of a state change is built at build time from the same index the markup carries, and what survives with the script off is said on the page
- `no-offer-step-finer` — offer a step finer than the measurement supports — a 50 km step on a 7 km mesh draws texture the reader will take for information — or coarse enough that the headline's own figure falls inside the first band; each step states its cost in the field's own units
- `no-answer-band-alone` — answer with the band alone: a banded answer without the measured value is the step's artefact, not a reading

## Precision to assert
- the field is measured on an equal-area grid (`camera.ts`, LAEA / EPSG:3035) and only DRAWN on Mercator, so no printed number moves
- the picture does move, and a contour map is read as a picture: the cost is derived every render and put in the caveat in the reader's own words
- each break is printed ON its line as a MapLibre marker in the page's own embedded faces — a symbol layer would fetch glyphs from a second host in a typeface nobody here chose

## Devices the worked example implements
- **`live-contour.ts`** — the step as the control, with the band and the measured value travelling together (`skills/map-web/assets/live-contour.ts`)
- **Measure in LAEA, draw in Mercator** — the split that keeps every number honest (`camera.ts`)
- **Breaks printed in the page's own faces** — no second host, no unchosen typeface (`DirectedContourWeb.tsx`)

## Worked example
`proof/web-contour-europe-distance/` — the reference implementation of this type's INTERACTION; read its CODE, not only its BRIEF.md. `render-directions-web.mjs` (the frozen read, the claim, the words, the live plan, the gesture declaration, the derived Mercator cost and the refusals), `camera.ts` (the MEASUREMENT projection, its window and `project` — the beat's central claim), `bake.mjs` (`BEAT.bounds`, the camera gate, one plate per filed direction), `DirectedContourWeb.tsx` (the two-layer arrangement, the drawing, the HTML overlay and the accessible table), `skills/map-web/assets/live-contour.ts`. `BRIEF.md` records the gesture argued before the code, not the shape. `skills/map-web/scripts/scaffold-web-map-beat.mjs --type contour-isoline --beat proof/web-contour-isoline-<subject> --static proof/static-contour-isoline-<subject>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
