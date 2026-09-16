# Proportional symbol (symbol / bubble map) — in video

**Argues:** A proportional symbol map answers "how big is this quantity AT this specific place" — where the geography is a set of POINTS, not a partition of area.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows. A map video is produced « comme dans scrolly »: the picture is the LIVE MapTiler map, driven per frame by `mapStateAt` with data-constant bound paints, every country present, and a frame released only once every tile has loaded; the words that must be measured stay SVG, placed from `measured.json`, and a plan changed since the measurement is refused.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — furniture** — the land and the key's NAMED circles at stated magnitudes, computed by the same function as the marks: the scale is stated before a single symbol lands
- **`reveal` — reveal in order + count up** — the symbols arrive largest first, one after another, while two counts climb TOGETHER — how many places, and what share of the quantity they carry
- **`subject` — compare** — the remainder arrives at once as a faint field and its share is set beside the first, so the comparison is two lengths rather than a sentence
- **`conclusion`** — the named symbols over the faint field of the rest; the credit on one line
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- let a bound paint be data-driven (`["get", …]`): `validateScrollyPlan` refuses it, because MapLibre relays the source out on every change and the frame never goes idle
- put a word that has to be measured on the map as a map label — the key, the counts and the credit are SVG placed from `measured.json`, and the credit is one line over a part of the picture it does not touch
- scale by radius: symbol AREA is proportional to the value, and the key's sample is produced by the same function as the marks
- fill the symbols — they are hollow, so an overlap accumulates rather than hides one place behind another

## Precision to assert
- symbol area (never radius alone) stays proportional to the same asserted value in every shot, and the key's scale sample matches the camera's own zoom
- every symbol is fully arrived by the end of its event — an arrival span that overshoots its event is a defect this beat has already paid for
- the two shares are derived and asserted to sum to the whole

## Devices the worked example implements
- **One layer per symbol** — each of the hundred has its own arrival, bound to a constant expression, because a data-driven radius cannot be bound (`map-plan.mjs`)
- **Two counts climbing together** — the count of places and the share of the quantity, so the headline is watched being assembled (`states.mjs`)
- **Hollow circles, smallest on top** — overlaps accumulate and no place is hidden (`SymbolFrame.tsx`)

## Worked example
`proof/video-proportional-symbol-europe-capacity/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `map-plan.mjs` (the MapTiler style, the layers and the cameras), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`mapStateAt` — the camera and the bound fields per frame), `measure.mjs` (`measureLiveMap` → `measured.json`, the seats the SVG words are placed on), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/map-beat/scripts/scaffold-map-video-beat.mjs --type proportional-symbol --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
