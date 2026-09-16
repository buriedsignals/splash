# Locator — in video

**Argues:** A locator answers "where, exactly" — it names a set of places relevant to the story with nothing more than position and, optionally, a category.

Owner rules that apply here: a video is an argument, not a reveal — every event transforms a picture the viewer already understands; the title card is frame 0 and brief; the last shot is the whole chart, never a card; write as little as the picture allows. A map video is produced « comme dans scrolly »: the picture is the LIVE MapTiler map, driven per frame by `mapStateAt` with data-constant bound paints, every country present, and a frame released only once every tile has loaded; the words that must be measured stay SVG, placed from `measured.json`, and a plan changed since the measurement is refused.

## Shot gestures
- **`establish` — title card, 1.5 s**
- **`reference` — name** — the continent, the country taking its tint and its name, the subject's ring landing on it: the reader is placed before being taken anywhere
- **`reveal` — travel** — the camera closes from the continent to the still's own window, centre and zoom LINEAR in the eased travel, the regions' borders arriving as it closes
- **`subject` — name in three classes** — once settled, the names arrive by class — the country and its neighbours, the settlements with their dots, the bodies of water — each class with its own treatment, each bound to its own moment
- **`conclusion`** — the close-up with every name; the credit on one line over open sea
- **`hold` — ≈60 frames**. About 19 s

## A choreography must NOT
- `no-replay-static-plate` — replay the static plate on a timer, its marks switched on one at a time — every event owes a transformation of the picture before it
- `no-hold-event-computed` — hold an event whose computed state equals the one before it — `assertEventStates` refuses it, and only a final `hold` is exempt
- `no-ease-traversal-measured` — ease the traversal of a measured axis, or end on a card: the last shot is the whole chart with the lesson lightly marked and the credit on one line
- `no-let-bound-paint` — let a bound paint be data-driven (`["get", …]`): `validateScrollyPlan` refuses it, because MapLibre relays the source out on every change and the frame never goes idle
- `no-put-word-measured` — put a word that has to be measured on the map as a map label — the key, the counts and the credit are SVG placed from `measured.json`, and the credit is one line over a part of the picture it does not touch
- `no-keep-basemap-own` — keep the basemap's own labels: they are removed, because the naming is the beat's editorial decision and not the tile provider's
- `no-let-marker-size` — let marker size carry a value — a locator's markers are uniform, and the decluttering of their labels is deterministic

## Precision to assert
- marker radius stays uniform across every shot — size never carries a value — and label decluttering is deterministic
- each measured camera is measured separately (the continent at the end of `reference`, the close-up settled and still unnamed), and a plan changed since is refused
- a neighbour's name keeps a stated fraction of itself off the measured subject region, checked on the measured cells

## Devices the worked example implements
- **Two fixed cameras and one travel** — the journey is between measured states, not a free-hand pan (`scene.mjs`, `map-plan.mjs`)
- **Three classes of place, three treatments** — countries, settlements, waters, each arriving on its own beat (`LocatorFrame.tsx`)
- **Halos measured against what is under them** — the colour behind each word is read off the measured map (`measure.mjs`)

## Worked example
`proof/video-locator-zaporizhzhia/` — the reference implementation of this type's MOTION; read its CODE, not only its BRIEF.md. `map-plan.mjs` (the MapTiler style, the layers and the cameras), `states.mjs` (the picture at the end of every event, `assertEventStates`), `scene.mjs` (`mapStateAt` — the camera and the bound fields per frame), `measure.mjs` (`measureLiveMap` → `measured.json`, the seats the SVG words are placed on), `timing-contract.ts` (the events and their lengths), `build.mjs` (registers, stage, title card, credit). `BRIEF.md` records the shot table and the derived values asserted, not the shape. `skills/map-beat/scripts/scaffold-map-video-beat.mjs --type locator --beat <new-beat>` copies this beat's plumbing, marked `SCAFFOLD:` over what is its subject rather than this type's.
