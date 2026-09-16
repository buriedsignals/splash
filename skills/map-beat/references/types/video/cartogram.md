# Cartogram (area distortion — and tile cartogram) — in video

**Argues:** A cartogram answers "how big is this region's VALUE," honestly, by distorting each region's own area to be proportional to a number — trading recognisable geography for magnitude a reader can compare at a glance.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows. A map video is produced « comme dans scrolly »: the picture is the LIVE MapTiler map, driven per frame by `mapStateAt` with data-constant bound paints, every country present, and a frame released only once every tile has loaded; the words that must be measured stay SVG, placed from `measured.json`, and a plan changed since the measurement is refused.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — the live map** — real geography on the live MapTiler map, every country present, the classes read from MapTiler Countries beneath the basemap's water, the dominant region set apart so a later focus never touches it
- **`reveal` — measure on the geography** — the two competing readings are built on the real map before any distortion: each region a column on a shared beam at its share, its height its true weight
- **`subject` — handover, then morph** — projected SVG shapes rise over the map, TESTED to lie on the measured fills, the fills leave under them, a ground rect rises with the morph, and only then do the regions travel to their equal-value tiles: the basemap is gone by the time the form stops being geography
- **`conclusion` — pull back** — the balance struck at both means, the credit on one line in the corner the tiles leave
- **`hold` — ≈60 frames**. About 20 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-bound-paint` — let a bound paint be data-driven (`["get", …]`): `validateScrollyPlan` refuses it, because MapLibre relays the source out on every change and the frame never goes idle
- `no-put-word-measured` — put a word that has to be measured on the map as a map label — the key, the counts and the credit are SVG placed from `measured.json`, and the credit is one line over a part of the picture it does not touch
- `no-morph-basemap-still` — morph while the basemap is still under the shapes — the handover is what keeps a distorted form from being read as geography
- `no-let-distortion-computed` — let the distortion be computed from anything but the same asserted value at every step

## Precision to assert
- every country is present at every camera, including the ones the claim ignores
- area distortion is computed from the same asserted value at every step, and the balance's weights stay the TRUE areas
- the projected SVG shapes are tested to lie on the measured live fills before the handover is allowed

## Devices the worked example implements
- **The handover** — SVG shapes raised over the live fills, then the fills withdrawn, so the morph never happens over a basemap (`states.mjs`, `scene.mjs`)
- **The balance** — a 0–100 % beam carrying both the country mean and the area-weighted mean, which is the claim (`CartogramFrame.tsx`)
- **One fill layer per class and role** — the dominant region on its own layer so the focus can never touch it (`map-plan.mjs`)

## Worked example
`proof/video-cartogram-europe-lowcarbon/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `map-plan.mjs` (the MapTiler style, the layers and the cameras), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`mapStateAt` — the camera and the bound fields per frame), `measure.mjs` (`measureLiveMap` → `measured.json`, the seats the SVG words are placed on), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/map-beat/scripts/scaffold-map-video-beat.mjs --type cartogram --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
