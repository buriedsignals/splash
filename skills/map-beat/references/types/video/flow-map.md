# Flow map (route — and origin-destination) — in video

**Argues:** A flow/route map answers "what path did this take, and what did it pass through, in order" — where the sequence of places crossed is itself part of the claim, not just the endpoints.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows. A map video is produced « comme dans scrolly »: the picture is the LIVE MapTiler map, driven per frame by `mapStateAt` with data-constant bound paints, every country present, and a frame released only once every tile has loaded; the words that must be measured stay SVG, placed from `measured.json`, and a plan changed since the measurement is refused.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — the land, the origin node landing with its name, and the width scale, before any band exists
- **`reveal` — trace + count up** — each band draws itself out of the origin toward its destination, largest first, the destination named as its band arrives, while the total climbs: the total is BUILT band by band
- **`subject` — filter + count up** — every other band steps back and the share the claim names counts up on the pair that carries it
- **`conclusion`** — every band back with the named destinations kept; the credit on one line in a free corner
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- let a bound paint be data-driven (`["get", …]`): `validateScrollyPlan` refuses it, because MapLibre relays the source out on every change and the frame never goes idle
- put a word that has to be measured on the map as a map label — the key, the counts and the credit are SVG placed from `measured.json`, and the credit is one line over a part of the picture it does not touch
- draw the trace with a `line-gradient` or a `line-dasharray` — the first is refused in a binding, the second restarts at every tile edge; the arc is CUT at the drawn share and re-set each frame
- put a destination's name on its seat dot: a name stands beside the dot, never on one

## Precision to assert
- the route's drawn order matches the data's own sequence, asserted, and every country beneath the route is present
- a band's width is the quantity on one stated scale, and the arcs are sampled in Bun and taken back to lon/lat so the bow is the same in pixels
- the camera is the box the named destinations need, padded by a stated margin, and it never moves

## Devices the worked example implements
- **Arc cut per frame** — `arcAt` + `setData`, with the frame waiting for the source to re-tile, which is the only honest way to draw a growing line on a live map (`scene.mjs`)
- **The count built from the bands** — the total is the sum of what has landed, never a number typed in (`states.mjs`)
- **A key column the camera is fitted around** — the map is fitted to the right of the key, so nothing ever covers a band (`build.mjs`, `map-plan.mjs`)

## Worked example
`proof/video-flow-map-ukraine-protection/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `map-plan.mjs` (the MapTiler style, the layers and the cameras), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`mapStateAt` — the camera and the bound fields per frame), `measure.mjs` (`measureLiveMap` → `measured.json`, the seats the SVG words are placed on), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/map-beat/scripts/scaffold-map-video-beat.mjs --type flow-map --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
