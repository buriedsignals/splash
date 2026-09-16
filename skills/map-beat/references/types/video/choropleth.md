# Choropleth — in video

**Argues:** A choropleth answers "which of these named regions is proportionally worse or better off," where the regions are a partition the reader already recognises — countries, states, districts.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows. A map video is produced « comme dans scrolly »: the picture is the LIVE MapTiler map, driven per frame by `mapStateAt` with data-constant bound paints, every country present, and a frame released only once every tile has loaded; the words that must be measured stay SVG, placed from `measured.json`, and a plan changed since the measurement is refused.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — the live map** — every country of the world drawn by the basemap, the class fills read from MapTiler Countries beneath the basemap's water, one fill layer per class
- **`reveal` — the filter as time** — a cursor travels the key's breaks and every class it passes steps back to bare land while the count steps down with it: the one gesture a still cannot make
- **`subject` — camera travel + measure** — the camera closes on the exception, framed on its ring and its neighbours' names with a margin of air, admin-1 borders arriving as it closes, and each measured share counts up on a GAUGE under its name — one scale for all, the floor notched on it
- **`conclusion` — pull back** — the whole map again, the claim's regions named, the credit on one line seated in the first row whose line crosses no studied country
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-bound-paint` — let a bound paint be data-driven (`["get", …]`): `validateScrollyPlan` refuses it, because MapLibre relays the source out on every change and the frame never goes idle
- `no-put-word-measured` — put a word that has to be measured on the map as a map label — the key, the counts and the credit are SVG placed from `measured.json`, and the credit is one line over a part of the picture it does not touch
- `no-centre-close-subject` — centre a close-up on the subject with half the shot on open water — a close-up frames the subject and the words it adds, on their drawn extent
- `no-soften-failed-join` — soften a failed join into a quiet no-data class: `assertJoin` queries the real tiles once before any frame and throws by name

## Precision to assert
- fills come from MapTiler Countries joined by ISO A2, with every country present at the whole-map camera
- a region with no reported value carries the neutral no-data fill and no in-map label
- the join-against-real-tiles check runs unconditionally, fast mode included, before the first frame

## Devices the worked example implements
- **The rising floor** — a cursor on the key that filters the map in time, with the count bound to it (`states.mjs`)
- **Gauges under the names** — each measured share counted up on one shared scale with the threshold notched, replacing a callout (`ChoroplethFrame.tsx`, `layout.mjs`)
- **Seats measured on the real map** — `measure.mjs` projects the live map once per fixed camera and the SVG words are placed on that grid (`measure.mjs`, `geometry.mjs`)

## Worked example
`proof/video-choropleth-europe-lowcarbon/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `map-plan.mjs` (the MapTiler style, the layers and the cameras), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`mapStateAt` — the camera and the bound fields per frame), `measure.mjs` (`measureLiveMap` → `measured.json`, the seats the SVG words are placed on), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit), `plan.mjs` and `seats.json` (the validated scrolly pilot's plan, copied byte-identical and pinned in `shared/map-beat/COPIED-FROM.json`). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/map-beat/scripts/scaffold-map-video-beat.mjs --type choropleth --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
