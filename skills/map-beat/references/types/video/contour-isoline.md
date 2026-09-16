# Contour / isoline — in video

**Argues:** A contour (isoline) map answers "where does this continuous field cross a given value" — elevation, temperature, air pressure, rainfall, travel-time-from-a-point — by drawing lines that connect every point sharing the same value.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows. A map video is produced « comme dans scrolly »: the picture is the LIVE MapTiler map, driven per frame by `mapStateAt` with data-constant bound paints, every country present, and a frame released only once every tile has loaded; the words that must be measured stay SVG, placed from `measured.json`, and a plan changed since the measurement is refused.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — the live map, camera still** — the study land a MapTiler Countries fill beneath the basemap's water, the land outside the measurement left as the basemap's own and named as such in the key
- **`reveal` — the sweep** — a fill advances inland from every coast at once, its front an edge, each isoline left behind where the front passed it: the field is traversed, not switched on
- **`subject` — measure while sweeping** — beside the map a curve rises with the share of land the fill has covered, so the sweep is simultaneously the picture and its own distribution; the median and the farthest point are marked as the front reaches them
- **`conclusion`** — every line with its number, the farthest point marked, the curve whole with its guides; the credit on one line over open sea
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-bound-paint` — let a bound paint be data-driven (`["get", …]`): `validateScrollyPlan` refuses it, because MapLibre relays the source out on every change and the frame never goes idle
- `no-put-word-measured` — put a word that has to be measured on the map as a map label — the key, the counts and the credit are SVG placed from `measured.json`, and the credit is one line over a part of the picture it does not touch
- `no-draw-bands-fill` — draw the bands as one fill layer per threshold — the sweep is a `canvas` source thresholded per frame, or the map never goes idle
- `no-leave-land-outside` — leave land outside the measurement looking measured: it keeps the basemap's own land and gets its own key swatch

## Precision to assert
- the threshold sweep is computed from the same frozen samples in every frame, asserted monotonic
- the field is computed once in Bun on the frozen shapes (an exact distance transform on a stated grid and projection), never re-derived in the browser
- the projected seats of the SVG words match `projectorOf` to a tenth of a pixel, and the numbers' seats are chosen clear of those boxes and wholly over land

## Devices the worked example implements
- **The canvas-source sweep** — the field resampled onto a Mercator grid and thresholded per frame, played then paused so the frame can go idle (`map-plan.mjs`, `scene.mjs`)
- **The cumulative curve** — the sweep's own distribution drawn beside it, which is what makes the median legible (`ContourFrame.tsx`)
- **Seats chosen over land clear of the furniture** — the isoline numbers are placed in Bun, not by the map (`measure.mjs`)

## Worked example
`proof/video-contour-europe-distance/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `map-plan.mjs` (the MapTiler style, the layers and the cameras), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`mapStateAt` — the camera and the bound fields per frame), `measure.mjs` (`measureLiveMap` → `measured.json`, the seats the SVG words are placed on), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/map-beat/scripts/scaffold-map-video-beat.mjs --type contour-isoline --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
