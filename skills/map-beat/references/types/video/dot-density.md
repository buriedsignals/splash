# Dot density — in video

**Argues:** A dot-density map answers "where inside these regions is this concentrated" — population, cases, production — at a texture level: dense clusters of dots read as dense clusters of the thing.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows. A map video is produced « comme dans scrolly »: the picture is the LIVE MapTiler map, driven per frame by `mapStateAt` with data-constant bound paints, every country present, and a frame released only once every tile has loaded; the words that must be measured stay SVG, placed from `measured.json`, and a plan changed since the measurement is refused.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — reveal in order + count up** — the land, then the dots arriving category by category from the most sites to the fewest, with the count climbing: one dot, one thing, where the thing is
- **`reveal` — grow into the weight** — the dots grow so their AREA carries a second variable, linearly, which is the reading a dot map cannot give at rest
- **`subject` — one bar measures both** — a single share bar runs beside the map, a sliver while every site counts one and widening as the dots take their weight, so two percentages are compared as one moving length
- **`conclusion`** — the stations drawn by their weight, the credit in a sea corner
- **`hold` — ≈60 frames**. About 17 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-bound-paint` — let a bound paint be data-driven (`["get", …]`): `validateScrollyPlan` refuses it, because MapLibre relays the source out on every change and the frame never goes idle
- `no-put-word-measured` — put a word that has to be measured on the map as a map label — the key, the counts and the credit are SVG placed from `measured.json`, and the credit is one line over a part of the picture it does not touch
- `no-bind-data-driven` — bind a data-driven radius: the marks are split into buckets, each bucket's radius the root of its members' mean square, so the drawn area is exactly theirs
- `no-imply-dot-geocoded` — imply a dot is a geocoded address when it is not — synthetic placement is declared, and every country is present under the dots

## Precision to assert
- dot positions are declared synthetic where they are, and every country is present under them
- each bucket's radius is the quadratic mean of its members, so a bucket's drawn area equals theirs; buckets are no wider than a stated pixel or percentage tolerance
- the camera fits every mark, not just the static plate's window — a frame that would cut marks is refused

## Devices the worked example implements
- **Radius buckets** — 183 constant-paint layers standing in for a data-driven radius the frame loop cannot afford (`map-plan.mjs`)
- **Area-linear growth** — the weight is carried by area, interpolated linearly, so no frame exaggerates (`scene.mjs`)
- **The share bar read twice** — the same bar measures count share, then weight share (`DotFrame.tsx`)

## Worked example
`proof/video-dot-density-europe-stations/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `map-plan.mjs` (the MapTiler style, the layers and the cameras), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`mapStateAt` — the camera and the bound fields per frame), `measure.mjs` (`measureLiveMap` → `measured.json`, the seats the SVG words are placed on), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/map-beat/scripts/scaffold-map-video-beat.mjs --type dot-density --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
