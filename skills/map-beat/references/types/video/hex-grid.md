# Hex grid (spatial binning — and hex cartogram) — in video

**Argues:** A hex-grid map answers "where is this cluster of scattered EVENTS actually densest," by aggregating raw points into a regular grid of cells so the eye sees a density surface instead of an unreadable smear.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows. A map video is produced « comme dans scrolly »: the picture is the LIVE MapTiler map, driven per frame by `mapStateAt` with data-constant bound paints, every country present, and a frame released only once every tile has loaded; the words that must be measured stay SVG, placed from `measured.json`, and a plan changed since the measurement is refused.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — morph** — the live map of the real regions FIRST, then the handover (projected SVG shapes rise over the measured fills, the fills leave, a ground rect rises) and each region travels from its mainland box into its cell; the codes land after it
- **`reveal` — reveal + name** — the cells take their class on the first measure, lowest first, and the leader on that measure is ringed and named
- **`subject` — rescale + name** — every cell changes from its first class to its second, the key's breaks moving with it, and the ranking turns over in front of the viewer: the one gesture that makes two measures comparable on one grid
- **`conclusion`** — the grid on the second measure with both named regions marked; the credit on one line
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-bound-paint` — let a bound paint be data-driven (`["get", …]`): `validateScrollyPlan` refuses it, because MapLibre relays the source out on every change and the frame never goes idle
- `no-put-word-measured` — put a word that has to be measured on the map as a map label — the key, the counts and the credit are SVG placed from `measured.json`, and the credit is one line over a part of the picture it does not touch
- `no-let-grid-leave` — let the grid leave geography while a basemap is still under it — the handover and the ground rect are what stop a designed grid being read as a map
- `no-re-bin-between` — re-bin between shots: the aggregation is computed once from the frozen events and held fixed

## Precision to assert
- bin aggregation is computed once from the frozen events and held fixed across every shot; every country is present beneath the grid
- the designed grid is checked BOTH ways against the data (no cell without a region, no region without a cell)
- the projected SVG shapes are tested to lie on the measured live fills before the handover

## Devices the worked example implements
- **The two-class re-scale** — one grid coloured by a count, then by a rate, with the key's breaks travelling with it (`states.mjs`)
- **The handover to a groundless grid** — shapes raised, fills withdrawn, ground rect raised with the travel (`scene.mjs`)
- **Sub-tile regions from level-1 units** — small regions read from their level-1 geometry below tile zoom 4 so none is missing (`map-plan.mjs`)

## Worked example
`proof/video-hex-grid-europe-protection/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `map-plan.mjs` (the MapTiler style, the layers and the cameras), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`mapStateAt` — the camera and the bound fields per frame), `measure.mjs` (`measureLiveMap` → `measured.json`, the seats the SVG words are placed on), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/map-beat/scripts/scaffold-map-video-beat.mjs --type hex-grid --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
