---
name: map-beat
description: Use to produce a MAP beat — one map with one thing to prove — in either format, static or video, by WRITING a bespoke component under doctrine and looking at the render. Carries the bake for a still (one camera, one basemap plate, one file of projected geometry), the live MapTiler map path for a video (a plan driven per frame, measured once, rendered through a keyless proxy), the join that fails loud, the class scale that makes a comparison legible, and one worked beat per map type.
---

# map-beat — a plan on the real map, measured once, driven in numbers

## Where these commands live

Every command below is written `bun skills/<skill>/…`, which is the path inside a Splash **checkout**.
An installed stories root is not a checkout: it vendors `shared/` and the Engine projects the skills
into its own store, so that path resolves to nothing and the first command a new reader runs fails
with `Module not found`. Set this once, in whichever root you are working in, and every command below
works verbatim with `$SPLASH_SKILLS` in place of `skills`:

```sh
# an installed stories root (the Engine's projection)
export SPLASH_SKILLS=~/.agents/skills/splash
# …or a development checkout
export SPLASH_SKILLS="$PWD/skills"
```

Beat paths are the other half: in a checkout a worked example sits at `proof/<beat>/`, and a
journalist's own beat always sits at `stories/<story>/beats/<beat>/`. Where a command below says
`proof/…`, it is naming the catalogue; your own beat goes under `stories/`.

## Overview

The map craft skill. It does not hold a map type and it does not fill a config: it holds the two
engines a map beat is drawn on, and the worked beats written on them.

- **Static** — **the bake.** `scripts/bake-plate.mjs` spends the camera **once**: it loads a MapTiler
  style in headless Chrome, gates on `idle` or a bounded settle, screenshots a quiet basemap
  **plate**, and projects the beat's shapes into that plate's pixel space with `map.project()`. The
  still then draws an `<image>` and some `<path>`s through resvg.
- **Video** — **the live MapTiler map** (owner ruling 2026-09-15: "comme dans scrolly"). The beat
  declares a map plan; Remotion mounts it on a real MapLibre map once and drives the camera and the
  bound paints per frame, each frame held until every tile is loaded, through a local proxy that keeps
  the key out of the page. What must be measured in pixels (key, labels, gauges, credit) stays an SVG
  overlay, placed in Bun from a frozen measurement of the real map. Spec:
  `docs/splash/2026-09-15-map-videos-through-maptiler-spec.md`.

The baked-plate video seed (`assets/Co2MapVideo.tsx`, `render-map.mjs --video`) is kept for its tests
only; it is superseded for any video beat.

Both formats ship here because a map's static and video formats must not drift apart on geography.
The doctrine is `doctrine/references/geo-discipline.md`.

## When to use

- A closed `STORYBOARD.md` picks medium **map** (or a bare request for a `proof/<format>-<type>-…`
  beat), and the beat's `BRIEF.md` names the subject, the comparison and the caveat. No brief, no code.
- **Static** when the argument is a distribution seen at once; **video** when it has an order — a
  level laid down, a floor rising, a camera closing in on the exception.
- To write a **new** beat. Read the type's worked example (index below) to learn the shape, then write
  the beat. Do not import a beat's component, extend it, or add a prop to it.
- **Not** for a Datawrapper map (a different producer), and **not** for a chart (`chart-video` for a
  chart video).

## The design base — read this before you write the component

**A beat is DIRECTED when it goes through a filed art direction, and every type sheet in
`references/types/` now names a directed beat you can read before writing yours.** The base is not
a style guide and not a theme: it is a set of measured records, and it ships with the root.

What arrives at `#shared/design-base/`:

- **`filedDirections()`** — the three filed directions (`creme`, `nocturne`, `rapport`,
  `shared/design-base/directions/*.md`, each parsed by `readDirection(path)`). A direction carries a
  ground, an accent, six registers (`display`, `eyebrow`, `body`, `axis`, `annot`, `value`) and a
  stroke set, each measured on a published graphic. They are **demo/catalogue** directions.
- **`resolveDirectionFamilies(direction, textPerRegister)`** — fits each register's family ladder to
  the glyphs THIS beat actually sets. Hand it every string the plate will draw, per register.
- **`composeDirections({ newsroom, filed, palettes?, beat, textPerRegister })` + `report(...)`**
  (`shared/design-base/compose.mjs`) — the guarded candidates for this beat, best first, and which
  were refused and why. Print the report.

**Which style a render uses.** A production map's style comes from the editorial side: the newsroom's
identity (`NEWSROOM.md`, derived by `newsroom-charter` or supplied; `parseNewsroom` /
`validateNewsroom` in `skills/splash/scripts/newsroom.mjs`, checked at preflight) and the subject,
composed by `composeDirections`, best guarded candidate first. A **newsroom run** renders the composed
direction (`--candidates <n>` for the top n to choose from); a **proof beat** renders the three filed
directions (`--filed`). The flags are the scaffolded runner's (see the scaffold's header).

**The newsroom's typefaces are part of that identity.** `NEWSROOM.md`'s `typefaces` line is a ladder,
most prominent first, and `composeDirections` walks it against the direction's own roles in the
direction's prominence order: the first declared face that can serve the `display` register's role
takes it, the next face takes the next role, and a role the list does not reach keeps its own ladder.
A face is only ever used when it passes the guards every ladder entry passes — there is a file for it
at the weights and slants those registers ask for, and it covers the words they set — and **a face
that cannot is printed in the report, one line, naming the face and the reason** (not installed, no
coverage for this beat's words, or the guard that refused it). No guard is relaxed to admit a house
face; read the report before the render and say which line applies.

**On a map, one more thing is true of a house face.** MapLibre draws no font file: it reads the SDF
glyphs MapTiler serves, and MapTiler serves seventeen families (`SERVED_BY_MAPTILER` in
`shared/design-base/typefaces.mjs`). A composed house face outside those seventeen cannot set the
map's own labels — asking for it returns Noto Sans with a 200, which `assertNotFallback` in
`shared/map-beat/glyphs.mjs` catches.

**The owner's ruling (2026-09-16): the face is kept.** It sets the title, the key, the counters —
every word outside the map, which is most of the type on the frame — and only the labels MapLibre
itself draws stand in for it. `mapLabelFamily(family, { role })` says which family they take: the
first on the register's OWN role ladder that MapTiler serves, so those labels keep the role's voice;
it returns what it stood in for, and the runner prints that line beside the refused faces, because a
reader comparing the panel to the map must be told why the two differ. Carry the result as
`mapFamily` on the register — `maptilerFace` reads it before `fontFamily`. Refusing the whole face
over a dozen place names is the one answer this ruling forbids.

And from the runtime already beside this skill:

- **`beatFacts(data, options)` + `applicableTreatments(facts)`** (`#shared/chart-beat/treatments.mjs`)
  — the arbiter: which filed treatments apply to the beat's own data
  (`docs/design-base/treatments/<id>.md` is the record).
- **`resolveRegister(direction, name)` + `applyCase`** (`#shared/chart-beat/registers.mjs`) — the
  register a run is set in, resolved against the chosen direction.
- **`registerOf(direction, name)` + `leadOf(r)` / `gapOf(r, n)`** (`#shared/design-base/register.mjs`)
  — a register sized to its role's cap height and set on its face's own line. Never
  `fontSize * <literal>`.

**Three rules that are not negotiable, because a guard fails on each of them:**

1. **A proof beat renders in EVERY filed direction, into `renders/` (plural)** (`--filed`); a newsroom
   run renders its composed direction. A component that only holds together on one ground has
   hard-coded something it should have derived.
2. **Every colour derives from the direction's own three.** The one admissible exception is a grounded
   convention such as water (`WATER_HUE`), argued in the beat's own `PALETTE.md`.
3. **Every number the plate shows is reproducible from the beat's own frozen data**, or it carries a
   written `grounded-by-hand` reason.

Records in the twin: `docs/design-base/CATALOGUE.md`, `docs/design-base/treatments/`,
`docs/design-base/references/`, `docs/design-base/METHOD.md`.

## The copy's language

Every word a beat draws is in ONE language, and which one is decided by the first of these that
answers — never by the data, the source or the subject:

1. **The journalist's request.** They asked in French, the beat is French. Nothing downstream
   overrules the person who asked.
2. **`NEWSROOM.md`'s `languages`, primary first.** It records every language the newsroom publishes
   in, most-used first (`newsroomLanguages(profile)` in `skills/splash/scripts/newsroom.mjs` reads it,
   and the singular `language` an older profile carries); the primary is the answer.
3. **The static sibling**, when neither of the two above says anything: the beat reads in the
   language its own family already reads in.

A French request beside an English profile is not a contradiction to settle by taste — rule 1 wins.
The scaffolded `BRIEF.md` carries a **The copy's language** section; name the language and the rule
that chose it there, before any copy is written.

## The one gotcha that will waste your day (read first)

**A data join fails silently, and the map looks right.** A country whose key does not match renders
as no-data, in a category that is on the legend, in a shade a reader accepts. Nothing throws.

Two traps are waiting: Natural Earth's `ISO_A3` is **not** the ISO A3 code — France, Norway and Kosovo
carry `"-99"`, so joining on it silently drops France (use `ADM0_A3`) — and Our World in Data codes
Kosovo `OWID_KOS` where Natural Earth says `KOS`. On the live map the join is MapTiler Countries'
`iso_a2` (`administrative` layer, `level == 0`): a code missing from a class layer's `match` draws as
bare land, just as silently. Malta has no level-0 polygon below tile zoom 4 (pilot `plan.mjs`).

`joinValues` therefore throws two ways: when a shape finds no value **and nobody declared it**, and
when a **declared** no-data shape turns out to have one. Never soften this into a warning.

The second trap, one level up: **`idle` alone never fires when one tile never resolves**. The bake
gates on idle **or** a bounded settle; the live map waits for idle **and** `areTilesLoaded()` and
fails the frame rather than ship a missing tile.

### The type index (static)

Each sheet states what the type argues, its reading stations in one composed frame, what a
composition of this type must NOT do, the precision to assert, the devices its worked example
implements and the worked example's own CODE.

| type | sheet | static worked example |
| --- | --- | --- |
| Cartogram (area distortion — and tile cartogram) | `references/types/cartogram.md` | `proof/static-cartogram-europe-lowcarbon` |
| Choropleth | `references/types/choropleth.md` | `proof/static-choropleth-europe-lowcarbon` |
| Contour / isoline | `references/types/contour-isoline.md` | `proof/static-contour-europe-distance` |
| Dot density | `references/types/dot-density.md` | `proof/static-dot-density-europe-stations` |
| Flow map (route — and origin-destination) | `references/types/flow-map.md` | `proof/static-flow-map-ukraine-protection` |
| Hex grid (spatial binning — and hex cartogram) | `references/types/hex-grid.md` | `proof/static-hex-grid-europe-protection` |
| Locator | `references/types/locator.md` | `proof/static-locator-zaporizhzhia` |
| Proportional symbol (symbol / bubble map) | `references/types/proportional-symbol.md` | `proof/static-proportional-symbol-europe-capacity` |

## The live-map video path (start here for a map video)

| step | read / do |
| --- | --- |
| 1 | `chart-video/references/directed-type-choreography.md` — the video rules (title card 1.5 s, argument not reveal, whole map at the end, credit on one line, 30 px floor, 18–22 s) |
| 2 | `references/types/video/<type>.md` — the type's shot gestures, its prohibitions, its precision and the devices its worked example implements; `references/types/<type>.md`'s "In video" section is the older narrative record of the same beat |
| 3 | the worked example (index below), split as in the pilot table |
| 4 | Scaffold: `bun skills/map-beat/scripts/scaffold-map-video-beat.mjs …` (see the script's header) |
| 5 | `BRIEF.md` choreography → plan + states + `mapStateAt` (TDD, offline) → `measure.mjs` → overlay placement → `--look` → renders |

### The type index (video)

| type | sheet | worked example (live MapTiler map) |
| --- | --- | --- |
| Cartogram | `references/types/video/cartogram.md` | `proof/video-cartogram-europe-lowcarbon` |
| Choropleth (pilot) | `references/types/video/choropleth.md` | `proof/video-choropleth-europe-lowcarbon` |
| Contour / isoline | `references/types/video/contour-isoline.md` | `proof/video-contour-europe-distance` |
| Dot density | `references/types/video/dot-density.md` | `proof/video-dot-density-europe-stations` |
| Flow map | `references/types/video/flow-map.md` | `proof/video-flow-map-ukraine-protection` |
| Hex grid | `references/types/video/hex-grid.md` | `proof/video-hex-grid-europe-protection` |
| Locator | `references/types/video/locator.md` | `proof/video-locator-zaporizhzhia` |
| Proportional symbol | `references/types/video/proportional-symbol.md` | `proof/video-proportional-symbol-europe-capacity` |

All built on the live map 2026-09-15/16 and awaiting the owner (`docs/design-base/CATALOGUE.md`).

### The pilot, file by file (`proof/video-choropleth-europe-lowcarbon`)

| file | holds | plumbing or beat |
| --- | --- | --- |
| `index.ts`, `Root.tsx` | entry, one `Composition` sized by `sizeFor` | plumbing |
| `Directed<Type>Video.tsx` | `useLiveMap` with `mountPlan` / `transformStyle` injected; `paint`: `map.jumpTo(viewOf(state))` then `setPaintProperty(id, prop, bindState(binding, state), { validate: false })` per binding; `useEmbeddedFaces`; the overlay frame over it | plumbing bar the frame |
| `render-directions-video.mjs` | key check, composer report, type floor at every event end, audit props, `buildProps(origin)`, `renderVideoMap` for `--look` / `--still` / mp4, ffprobe size, refusal cleanup | plumbing bar the look frames |
| `measure.mjs` | `planDigestOf`, `MEASURED_FRAMES` (one frame per fixed camera), `measureLiveMap` per direction → `measured.json` | plumbing bar the frames |
| `no-key.live.test.ts` | the key is in no render, props file, measurement or cached tile | plumbing, verbatim |
| `plan.mjs`, `seats.json` | layers (copied from the scrolly pilot); lon/lat seats for names | beat |
| `map-plan.mjs` | `camerasOf` (whole + close-up `cameraFields`), `mapPlanFor` (tints, class fills, fonts, region borders, `camera.view`) | beat; the mercator fit is plumbing |
| `scene.mjs` | `WINDOWS`, `fieldAt`, `gatesAt`, `cameraAt`, `mapStateAt`, `sceneAt` (overlay) | mechanics plumbing, windows beat |
| `states.mjs`, `timing-contract.ts` | states per event, `assertEventStates`; the `BeatTiming` | beat |
| `build.mjs`, `layout.mjs` | registers (`videoRegistersOf`, `mapRegistersOf`), `measured.json` reader + digest guard, credit / key / name placement on the measured grid | ~half plumbing |
| `ChoroplethFrame.tsx` | the SVG overlay: title card, key, close-up labels and gauges, credit | beat, with plumbing groups |
| `map-plan.test.ts`, `map-cameras.test.ts`, `scene.test.ts`, `frame.test.ts`, … | `validateScrollyPlan` + `validateExpressions` empty; cameras centred; fields per frame; floor at event ends | beat |

Not self-contained: `build.mjs` imports `../static-choropleth-europe-lowcarbon/beat.mjs` and
`map-plan.mjs` its `bake.mjs` (`BEAT.bounds`). A beat with no static sibling derives its bounds and
seats itself.

### The contracts

**The plan** (what a live video reads):

| field | contract |
| --- | --- |
| `styleUrl` | `https://api.maptiler.com/maps/dataviz/style.json?key=` + the placeholder, spelled `"__MAPTILER" + "_KEY__"` in source so the literal never sits in the repository; the proxy strips it |
| `projection` | `"mercator"` (flat; `useLiveMap` sets mercator) |
| `tints` | `plateTints(direction)` → `{ water, land }`, applied to the basemap by `transformStyle` |
| `layers[]` | `{ id, type, source: { type: "vector", url } + sourceLayer \| data (GeoJSON), filter, paint, bindings, beneath }`; Countries source: `tiles/countries/tiles.json?key=` + placeholder, `sourceLayer: "administrative"`, `level`, `iso_a2` |
| `bindings` | `{ "<paint prop>": expression with {"$state": field} }`, **data-constant only**: no `get` / `feature-state` in a binding (`validateScrollyPlan` refuses it; MapLibre reloads every tile per frame). One layer per class or group |
| `beneath: "water"` | the layer goes under the basemap's first water fill (`beforeIdFor`): the basemap's coast wins over Countries' coarser one |
| `camera.view` | `viewOf(cameras.whole)` — the boot camera; every later frame `jumpTo`s |
| `referenceWidth`, `referenceHeight` | the stage the cameras are authored for (1920 × 1080) |

**`mapStateAt(props, frame)`** (the beat's `scene.mjs`, browser-safe) → `{ camX, camY, camZoom,
camBearing, camPitch, ...boundFields }`: camera in Web Mercator 0..1 (`cameraFields`), interpolated in
projected space, zoom linear; every field any `{"$state"}` reads, from the event windows.

**`useLiveMap({ plan, styleUrl, tints, frame, paint, mount, transform })`** (`assets/live-map.ts`)
mounts once under `delayRender`, calls `paint(map, frame)` each frame, releases the frame only when
idle **and** `areTilesLoaded()`, cancels the render on a map error (query strings stripped). Returns the
container ref. `mount`/`transform` are injected because a skill asset may not import `#shared`.

**`measureLiveMap({ plan, states, seats, size, mapTilerKey, cacheDir, cell, tints })`**
(`scripts/measure-live-map.mjs`) mounts the plan in headless Chrome through the proxy, jumps to each
named state, and returns `{ [camera]: { tilesLoaded, projected: { [seat]: [x, y] }, grid: { cell,
cols, rows, colours } } }` (`colours` row-major, mean hex per cell). The beat's `measure.mjs` writes
`measured.json`:

```
{ size: { width, height }, planDigest: { [direction]: sha256 }, states: { [camera]: state },
  cameras: { [direction]: { [camera]: <measureLiveMap result> } } }
```

`build.mjs` refuses a stale plan (`planDigest[id] !== planDigestOf(mapPlan)` → "run measure.mjs
again") and a size mismatch. Re-measure after any plan change; tests and build stay offline.

**`startMapTilerProxy({ key, cacheDir })`** (`scripts/maptiler-proxy.mjs`) → `{ origin, stop, counts }`.
The key is read by the caller with `mapTilerKeyIn(process.env)` (`#shared/map-beat/glyphs.mjs`) and lives
only in this process: never in props, argv, logs or files. Responses are cached **keyless** in
`DEFAULT_CACHE_DIR` (`~/.cache/splash-maptiler`, outside every worktree). `throughProxy(plan, origin)`
points a plan's URLs at the proxy.

**`renderVideoMap({ entry, composition, buildProps, outDir, name, mapTilerKey, mode, frame, cacheDir })`**
(`scripts/render-video-map.mjs`) starts the proxy, calls `buildProps(origin)` (which writes the props
file with `mapPlanProxied: throughProxy(props.mapPlan, origin)` via `writeRenderProps` and returns its
path), then spawns `remotion` with `--gl=swangle --concurrency=1 --timeout=180000` and an **empty
`--env-file`** (`Bun.spawn`, so the in-process proxy keeps answering). `mode`: `"still"` (`frame`,
default `-1`) → `<name>-final-frame.png`; `"mp4"` → `<name>.mp4`. Returns `{ path, seconds, proxyCounts }`.

**`no-key.live.test.ts`** — after measuring and rendering, with the `.env` loaded: no file under
`renders/`, `DEFAULT_CACHE_DIR` or `measured.json` contains the key.

### Colour, countries and placement on a live map

- **The accent in a choropleth.** The directed choropleth ramps the **accent**, low to high: class
  fills from `mix(accent, ground, 0.88)` to `mix(accent, ink, 0.3)` — `rampFor` in
  `proof/static-choropleth-europe-lowcarbon/beat.mjs` and `mapPlanFor` in the pilot's `map-plan.mjs`,
  the pilot the owner validated. The subject is marked by what the ramp does not carry: a ring or
  outline and its direct label in the accent walked to text contrast (`adjustToContrast`), plus the
  overlay's count and gauges. The neutral ground→ink ramp (`sequentialRamp` in `assets/geo.ts`,
  geo-discipline rule 8) is the undirected seed's.
- **Three kinds of country.** Studied with a value → its class layer. Studied, unreported → a
  `missing` fill (`mix(ground, ink, 0.13)`), arriving with the first class, a "sans donnée" swatch.
  **Outside the study set** → no layer: the basemap's own land, and a key swatch of that land named
  for the set ("hors des 12"). Measure the palest class against the land (`contrast`) so a low reading
  never reads as outside.
- **Subject extent.** `measureLiveMap` projects seats only. Pass the subject's extent corners (its
  mainland box, e.g. `subjectSW`, `subjectNE`) as extra seats, and seat its word outside that box, not
  centred on its seat.
- **Time on the map.** When the fills step through years, a count or gauge reads the same step as the
  fills (held per year), never a straight-line interpolation between the ends.
- **Names** in the map are `symbol` layers at frozen seats, shown only once the camera has settled; the
  credit (with "© MapTiler © OpenStreetMap") sits where the measured grid shows sea and no word.

## Producing a static beat in a run

**Prerequisite — `PALETTE.md` must already be recorded**, a journalist decision from `skills/palette`
(once `NEWSROOM.md` is resolved), never defaulted here. The scaffolded runner refuses immediately, by
name, when it is missing.

1. **Pick the type** from `references/types/` and **read its sheet**: what it argues and its `##
   Worked example` — the validated static beat this type adapts from.
2. **Scaffold the plumbing** rather than writing it by hand — `bun
   skills/map-beat/scripts/scaffold-static-map-beat.mjs --type <type> --beat proof/static-<subject>
   --component <PascalName>`. This skill's other scaffold, `scaffold-map-video-beat.mjs` above, is the
   VIDEO genre; this one is static. By default it copies the type sheet's own worked example — its
   `render-directions.mjs`, its one `Directed<Type>.tsx`, its `bake.mjs`, and every OTHER local
   sibling `.mjs` file the runner imports (a beat's own `beat.mjs`/`plate-cache.mjs` split, when it
   has one) — renamed, and rewrites the "render all three filed directions unconditionally" plumbing
   every hand-written static beat still carries into the composed-direction-default convention below.
   `--from <beat>` adapts a named beat instead; `--generic` writes the old fully empty stub, required
   only for a type whose sheet names no worked example yet. Refuses only an unknown `--type`, a
   `--beat` not under `proof/` (or a story's `beats/`), a real file collision, missing frozen data or
   geometry the worked example's own readers assume sits beside the beat, or a `PALETTE.md` it cannot
   reach.
3. **Write the claim/assertions/layers** the scaffold marked — `grep -rn SCAFFOLD <beat>` finds every
   region, across the runner, the directed component, `bake.mjs` and any sibling file.
4. **Render and look** — `bun <beat>/render-directions.mjs`; the first render bakes the plate
   (`MAPTILER_KEY` in `.env`), later ones reuse it unless the plan's own digest changed
   (`plate-cache.mjs`'s convention, when the worked example carries one).
5. **Owner review**: apply `doctrine`'s design rubric to the pixels.

**ONE ART DIRECTION IN A PRODUCTION RUN**, not the three filed demo directions: the scaffolded runner
composes one from the beat's own `PALETTE.md` and text (`composeDirections`,
`#shared/design-base/index.mjs`) and renders only that by default. `--filed` renders `creme`,
`nocturne`, `rapport` instead — a catalogue or demo proof, never a production render.

## The editorial chain in a run

What the journalist retained at Gate 2 is readable by code at every later step, and a step that
stops reading it breaks a named test rather than degrading quietly. Spec: `docs/splash/2026-09-17-editorial-chain-spec.md`.

1. **One art direction per run, and this skill never composes a second.** `DIRECTION.md` sits at
   the story root beside `PALETTE.md`, composed once from `NEWSROOM.md` and the subject
   (`composeRunDirection` / `readRunDirection`, `shared/design-base/run-direction.mjs`) and
   inherited by all four exports. The scaffold REFUSES before writing anything when it is not
   reachable, naming the command that produces it — `assertRunDirection`, the same shape as the
   `PALETTE.md` refusal. `--filed` is the catalogue-only escape, for a proof that deliberately
   renders the three filed demo directions.

2. **The type sheet becomes a frame, never a choreography.** `choreographyFrame`
   (`shared/editorial/frame.mjs`), through this skill's own `chainFrameFor`, reads
   `references/types/<type>.md` into the export's required shape, the type's gesture vocabulary
   (OPEN — an unlisted atom is an addition the sheet owes) and its prohibitions, each citable by
   id. It returns no rows, no cards and no shots: a static and video beat's choreography — the reading order of one composed frame, or the unfolding in time of a directed map video — is
   AUTHORED, per subject.

3. **The scaffold writes both sections EMPTY.** `withChainSections` puts the table's headers and
   the frame quoted as a comment into `BRIEF.md`, with no rows and no value block, and
   `scaffoldRequirements` (`scripts/static-precision.mjs` (static) and `scripts/precision.mjs` (video)`) lists what
   `requiredAssertions` already fixes from the type and the format. The two the journalist answers
   at G1 — the claim's shape and its grounding — are named as owed, never guessed. A scaffold that
   pre-filled a row would be the clone factory this chain exists to prevent.

4. **The beat's author fills the table; the harvest reads it back.**
   `bun scripts/migrate-briefs.mjs --harvest --beat <dir>` runs `parseChoreography` and
   `parsePrecision` (`scripts/static-choreography.mjs` (static) and `scripts/choreography.mjs` (video)`, `scripts/static-precision.mjs` (static) and `scripts/precision.mjs` (video)`) over what the
   beat now declares, writes the two `splash:` value blocks into those same sections and adds
   `derived: v1` to the front matter. Nothing already written is edited, reflowed or translated.

5. **Two corpus guards then hold it.** `checkChoreography` and `checkPrecision` — reachable
   through the scaffold, which re-exports both — back
   `skills/splash/test/a-choreography-is-declared-and-its-own.test.ts` and
   `skills/splash/test/precision-covers-what-the-chain-requires.test.ts`, which run over every beat
   carrying `derived: v1`. They assert that a choreography is declared, that it is this beat's own
   and not its type's worked example, and that it violates none of its type's stated prohibitions.
   They never compare it to an expected choreography.

Beats still owing an authored declaration: `docs/splash/2026-09-17-declarations-owed.md`.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Doctrine | `doctrine/references/geo-discipline.md` | The twelve rules: bounded gating, fixed plate, baked geometry, projected labels, the loud join, capture plumbing, no-data as texture, the accent in a choropleth, the quiet plate, the reveal's order, ring culling, camera-before-layout |
| Plan trunk | `shared/map-beat/scrolly.mjs`, `shared/map-beat/mount.mjs`, `shared/map-beat/style.mjs`, `shared/map-beat/tints.mjs` | Camera and paint in numbers (`cameraFields`, `viewOf`, `bindState`, `validateScrollyPlan`); `mountPlan`, `beforeIdFor`, `validateExpressions`; `transformStyle`; `plateTints`. Copied from `quality/scrolly` (`shared/map-beat/COPIED-FROM.json`) |
| Live map | `assets/live-map.ts` | `useLiveMap`: mount once, paint per frame, hold until idle and every tile loaded |
| Measure | `scripts/measure-live-map.mjs` | Projected seats and a colour grid at each fixed camera, through the proxy |
| Key proxy | `scripts/maptiler-proxy.mjs` | Local proxy; key in process only; keyless disk cache |
| Video render | `scripts/render-video-map.mjs` | `renderVideoMap`: proxy, props, `remotion` with swangle, concurrency 1, empty env file |
| Shots | `scripts/shots.mjs`, `scripts/video-registers.mjs`, `scripts/choreography.mjs`, `scripts/sizes.mjs` | Copies of `chart-video`'s: title card, one-line credit, key; registers at video size; event states; sizes and floors |
| Faces | `scripts/video-faces.mjs`, `assets/embedded-faces.ts` | Faces as woff2 props, checked on every frame |
| Bake | `scripts/bake-plate.mjs` | Static: one camera, plate PNG + `geometry.json` (pixel rings + projected anchors), culled and thinned |
| Pure core | `assets/geo.ts` | The study set, the alias table, the join, the classes, the seed's ramp, `scalePosition`, ring arithmetic, the claim check |
| Static seed | `assets/Co2MapStill.tsx` | One beat, 900 × 560, text column beside a square plate |
| Baked video seed | `assets/Co2MapVideo.tsx` | Superseded for video beats; kept for its tests. Exports `arrivalProgress` |
| Contract | `assets/timing.ts` | `MAP_TIMING`. The vocabulary (`BeatTiming`, `checkTiming`, `progressOf`) is **imported** from `chart-video`, never re-implemented |
| Registration | `assets/Root.tsx`, `assets/index.ts` | The seed composition; `durationInFrames` IS `MAP_TIMING.total` |
| Seed render | `scripts/render-map.mjs` | The seed's ladder: still → final frame → mp4 on the baked plate |
| Preview | `scripts/render-preview.mjs` | The seed rendered from sample data. Generates `assets/preview.png` and validates it with `--check` |
| Sample | `assets/sample-data/regions.json` | 43 European regions with numeric values, chosen to demonstrate the full colour ramp span |
| Preview | `assets/preview.png` | The static seed rendered on a light ground |

**Where the map dependencies live.** The managed development install includes `puppeteer-core`,
MapLibre, and an Engine-recorded compatible browser as part of the complete root runtime. The bake
has a sealed mode that accepts only that browser, the installed local MapLibre files, and an
Engine-injected `MAPTILER_KEY`. For a real story's still, write the declarative
`beats/<outputId>/MAP-BAKE.json` described by Splash's `references/managed-map-bake.md`, then use the
closed `bsig run splash map-bake` operation. A live video reads the key from the process environment
(`set -a && . ./.env && set +a`) and never hands it to Remotion.

## How it works (the shape)

1. **Freeze the data and the shapes.** A csv (and, for the still, a GeoJSON) on disk, not a URL fetched at render.
2. **Declare the study set** — the countries the beat claims to show — plus the alias table and the
   shapes the source genuinely does not report. Declaring is what makes the join checkable.
3. **Still: bake.** One camera, chosen from the geography (rule 12). Quiet the basemap's own labels
   and borders; the beat draws the only labels.
4. **Join, loudly.** Then check the claim: the title's comparison and its superlative, measured
   against the source it is drawn from.
5. **Draw the still, and look at the PNG.** Not the SVG, not the tests.
6. **Video: the live-map path above.** Choreography in `BRIEF.md`, plan and states tested offline
   (`validateScrollyPlan`, `validateExpressions`, `checkTiming`), `measure.mjs`, the overlay placed from
   `measured.json`, `--look` frames opened, then `--still`, then the mp4s.
7. **Pass the size gate 2c pinned** — `--size landscape|square|portrait`. A composition takes its
   `width`/`height` from `sizeFor` (`scripts/sizes.mjs`, which throws naming all three rows rather
   than defaulting); a still's plate is baked at the same aspect.

## Quick start

A live-map video beat. Scaffold: `bun skills/map-beat/scripts/scaffold-map-video-beat.mjs …` (see the script's header).

```sh
set -a && . ./.env && set +a                                   # the key, in this shell only
bun test proof/video-<type>-<slug>                             # offline: plan, states, scene, frame
bun proof/video-<type>-<slug>/measure.mjs                      # the real map at each fixed camera -> measured.json
bun proof/video-<type>-<slug>/render-directions-video.mjs --look "$SCRATCH/look-<slug>"   # open them
bun proof/video-<type>-<slug>/render-directions-video.mjs --still
bun proof/video-<type>-<slug>/render-directions-video.mjs      # the mp4s
bun test proof/video-<type>-<slug>/no-key.live.test.ts
```

Use a `--look` directory unique to the beat: a shared scratchpad `look/` already holds other beats' frames.

The static seed:

```sh
bun skills/map-beat/scripts/bake-plate.mjs --size 496 --out /tmp/map-twin/plate-496
bun skills/map-beat/scripts/render-map.mjs --still
```

## Tuning knobs

The seed's (`Co2MapStill.tsx`, baked `Co2MapVideo.tsx`). A live video's knobs are its own
`map-plan.mjs`, `timing-contract.ts` and `scene.mjs`'s `WINDOWS`.

| Want | Knob | Where |
| --- | --- | --- |
| What the camera holds | `bounds` `[[-26, 36], [33, 67]]` — wide enough west to hold Iceland whole, not just its eastern edge | `BEAT`, `bake-plate.mjs` |
| Which basemap | `style` `"dataviz-light"` — quiet by construction, and a choropleth wants a ground that encodes nothing | `BEAT`, `bake-plate.mjs` |
| How long the capture waits before it gives up on `idle` | `--settle` `15000` ms | `bake-plate.mjs` |
| Where the subject's label hangs | `anchors.label` `[6.05, 46.62]` — a coordinate, so it follows the camera | `BEAT`, `bake-plate.mjs` |
| How much coastline detail survives | `minGap` `0.6` px | `bake-plate.mjs` |
| How far off-frame a ring may sit before it is culled | `margin` `40` px | `keepRing`, `geo.ts` |
| Where the rungs of the extent ladder sit | powers of four of `EARTH_CIRCUMFERENCE_KM` — one anchor, two zoom levels per rung, nothing typed | `extentBand`, `geo.ts` |
| The biggest a proportional mark may be drawn | half the plate's own MEDIAN nearest-neighbour gap, capped by the beat's typed ceiling | `markRadiusCeilingPx`, `geo.ts` |
| How much projection distortion an area encoding may carry silently | one bin of the beat's OWN legend — no budget is typed | `binsCrossedByProjection`, `geo.ts` |
| The classes | `CO2_BREAKS` `[2, 4, 6, 8, 10]` (six classes, the top open) | `geo.ts` |
| How dark the ramp gets | `FROM` `0.1` / `TO` `0.78` of the way from ground to ink | `sequentialRamp`, `geo.ts` |
| How long the whole beat runs | `total` `240` (8 s × `fps` `30`) | `MAP_TIMING`, `timing.ts` |
| **How long the reader gets to read the average** — the pause, which is the gap, not an event | `reveal.start` `70` minus `reference` end `52` = `18` | `MAP_TIMING` |
| How fast the field fills | `reveal.duration` `86` | `MAP_TIMING` |
| How much the regions' arrivals overlap | `WINDOW` `0.16` of the reveal | `arrivalProgress`, `Co2MapVideo.tsx` |
| How separate the subject's arrival feels | `subject.start` `158` (never below `reveal` end) | `MAP_TIMING` |
| How long the finished map is held | `hold.duration` `38` | `MAP_TIMING` |
| How hard the subject's outline lands | `damping` `200` against `stiffness` `120` — critically damped | `Co2MapVideo.tsx` |
| The still's frame, and the plate inside it | `900` × `560`, `MAP` = `496` | `Co2MapStill.tsx` |
| The video's frame, and the plate inside it | `1080` × `1080`, `MAP` = `620` | `Co2MapVideo.tsx` / `Root.tsx` |
| How tall the legend is (the still throws if the column stops fitting) | `LEGEND.barHeight` `200` / `300` | `Co2MapStill.tsx` / `Co2MapVideo.tsx` |

## Files

- `TYPEFACE.md` — **the face this skill draws in, and a REQUIRED gate: a render refuses without
  one.** `readTypeface` walks up from the beat's own directory, so a story root's own
  `TYPEFACE.md` overrides this skill's; `useTypeface` then puts the answer in force before
  anything is laid out. `origin` records WHO chose — `newsroom` or `journalist` means somebody
  did, `default` means nobody did and the stack is the substrate's own.

  Two things about it are load-bearing and neither is obvious. **A newsroom's face is proposed,
  never imposed:** `newsroom-charter` measures what a newsroom publishes in and `NEWSROOM.md`
  records it, but the journalist decides whether the graphic uses it, and `origin` is where that
  decision is kept. **A face that cannot be resolved is refused, never substituted:** resvg,
  Chrome and Canvas `measureText` all render a fallback for a family they cannot find and report
  nothing, so `useTypeface` lays a probe string out in the recorded family and in a family that
  exists nowhere and refuses when the two produce identical ink. A journalist told "this machine
  does not have Marr Sans" has chosen; a silent stack has not.

  This file's own prose says all of that and said it only to itself: no `SKILL.md` mentioned
  `TYPEFACE.md` at all, so the first an author heard of the gate was a render stopping — after
  preflight, intake, G1, the storyboard exchange, the palette gate, the analyst and the bake.
  The refusal names what to do, but it arrives phases after the point where a journalist should
  have been asked, and after the expensive work.

  **Which formats require it:** the four that rasterise type themselves — `chart-beat`,
  `chart-video`, `chart-web`, `map-beat`, `map-web`, `scrolly`, `image-beat` — every skill that
  rasterises a still. `dw-beat` lays out type server-side. The roster is
  the set of skills whose render path calls `useTypeface`.

  **Still open, and deliberately not fixed here:** the typeface has no gate POSITION the way the
  palette does. Movement (9) of `references/exchange.md` is titled "The palette and the typeface"
  and asks only about colour, so the honest common case for a real newsroom — measured faces that
  are not installed on this machine — is a refusal nobody was given the chance to answer. That
  wants a proposal with availability measured, next to the palette's, and it should land with
  issue #41.

- `references/types/` — eight sheets, one per map type, each with an "In video" section naming its live-map worked example; see its own `README.md`.
- `references/map-plan.md` — the map plan contract: the object a beat declares instead of drawing,
  the boundary between what is in the map and what stays outside it, and the measured guards that
  turn MapLibre's silent failures into thrown errors. **The wiring lives in `shared/map-beat/`: a beat
  declares a plan, and does not write a map.** The live video's own fields are under "The contracts" above.
- `assets/live-map.ts` — `useLiveMap`, `bootOptionsOf`, `settleFrame`: the live map in a Remotion composition.
- `scripts/measure-live-map.mjs` — `measureLiveMap`, `throughProxy`: seats and colour grid at each fixed camera, and a plan's URLs pointed at the proxy.
- `scripts/maptiler-proxy.mjs` — `startMapTilerProxy`, `DEFAULT_CACHE_DIR`, `stripKey`: the key proxy and its keyless cache.
- `scripts/render-video-map.mjs` — `renderVideoMap`: the live video's render ladder, still or mp4.
- `scripts/shots.mjs` — `titleCardFor`, `sourceCreditFor`, `keyFor`, `CREDIT_ONE_LINE`: `chart-video`'s shot helpers, carried.
- `scripts/video-registers.mjs` — `videoRegistersOf`: a direction's registers at a video size.
- `scripts/video-faces.mjs` — `wantedOf`, `writeRenderProps`: faces resolved in Bun, written into the props file.
- `assets/embedded-faces.ts` — `useEmbeddedFaces`: faces loaded before a frame is drawn, and checked on it.
- `scripts/bake-plate.mjs` — the camera, the gate, the plate, the projection, the culling. Refuses a
  frame taller than its geography can fill BEFORE the capture (`assertStageServesGeography`), and
  records what the camera's scale implies into `geometry.json`'s `extent` key.
- `scripts/scaffold-static-map-beat.mjs` — the static plumbing scaffold ("Producing a static beat in
  a run" above), the sibling of `scaffold-map-video-beat.mjs` for the static genre: `--from`/default
  adapts a type's own worked example (its runner, its `Directed*.tsx`, its `bake.mjs`, and every
  other local sibling `.mjs` its runner imports), `--generic` the empty stub
  (`assets/static-map-beat-scaffold/*.tmpl`).
- `scripts/static-plumbing.mjs` — this skill's own copy of `chart-beat`'s (skills never import across
  a skill boundary at runtime): `paletteReachable`/`paletteRefusalMessage`,
  `requiredLocalAssets`/`missingAssetsMessage`, `composedDirectionDefault`,
  `markDividers`/`markBefore` — see `chart-beat/SKILL.md`'s own entry.
- `test/scaffold-static-map-beat.test.ts` — `--generic` parses and refuses to render with a named
  `SCAFFOLD` error before ever spawning `bake.mjs` or reaching MapTiler; the default `--from` path
  copies `beat.mjs`/`plate-cache.mjs`-style siblings and marks every subject-specific region
  `SCAFFOLD`; missing frozen geometry refuses before writing anything.
- `scripts/extent-range.mjs` — the camera probe for B4.1. Drives the same `fitBounds`, style and
  capture gate at all six rungs of the ladder — planet to city — from a catalogue passed in with
  `--data`, and writes the plates and the numbers to `output-proof/extent-range/`. It ships no data
  of its own and is not a beat.
- `scripts/render-map.mjs` — the seed's render ladder, the join, the claim check, the beat's own words.
- `scripts/render-preview.mjs` — renders THIS skill's static seed from THIS skill's sample data.
  Accepts `--out <dir>` to write the proof to that directory instead of `assets/preview.png`.
  Supports `--check` mode for verification. Automakes the plate if missing.
- `assets/geo.ts` — the pure core. Imported by both seeds and by the tests.
- `assets/Co2MapStill.tsx` — the static seed. **Replace per story.** Lays its column out from both
  ends and throws if the two halves meet. **The credit is the last line before the bottom margin**
  (`chart-beat/references/static-discipline.md`), carrying the basemap credit with it, unsplit; when
  the stack stops fitting, the fix is to LOWER `MAP_Y`, and the beat's own fit guard says by how much.
- `assets/Co2MapVideo.tsx` — the baked-plate video seed, superseded by the live map. Exports `arrivalProgress`.
- `assets/timing.ts` — `MAP_TIMING`, and a re-export of the shared vocabulary.
- `assets/Root.tsx`, `assets/index.ts` — the seed's Remotion composition and entry point.
- `assets/sample-data/regions.json` — 43 European regions with numeric values demonstrating the
  full colour ramp span, the seed's data.
- `assets/preview.png` — the static seed rendered on a light ground. Regenerate with
  `bun scripts/render-preview.mjs` whenever the seed or sample data changes.
- `output-proof/preview.png` — the artifact this skill's seed produces from this skill's own sample
  data — regenerated by `bun scripts/render-preview.mjs --out output-proof`.
- `output-proof/extent-range/` — twelve real MapTiler captures at six rungs, two portrait captures,
  `range.json` and `RANGE.md`. The measured range is **40 053 km of ground down to 20 km, 2 047x in
  metres per pixel**, through one camera derivation. Regenerate with `bun scripts/extent-range.mjs`.
- `test/geo.test.ts` — the join in both failing directions, the alias, the classes, the ramp on a
  light and a dark ground, the scale, ring culling including an antimeridian wrap, the reveal order,
  the claim check, and the camera at every scale. Three mutations are recorded at its foot.
- `test/live-map-camera.test.ts` — the live map's boot camera and frame settling.
- `test/maptiler-proxy.test.ts` — the proxy strips the key and caches keyless.
- `test/copied-from-scrolly.test.ts` — the trunk copies stay byte-identical to their declared originals.
- `test/timing.test.ts` — every structural rule of the motion grammar, green on the shipped timing
  and red on a timing mutated to break exactly that rule.
- `test/canon.test.ts` — both seeds carry the canon's marker wording and explicit format labels,
  and sample data exists with sufficient variation.
- **Beats live under `proof/`, not here.** This skill ships two seeds (`Co2MapStill.tsx`,
  `Co2MapVideo.tsx`); every directed map beat — static `proof/static-<type>-…` and live-map video
  `proof/video-<type>-…` — is its own workspace (index above).

## What this beat found

The claim check earned its place immediately, on this fixture's first title: "…et moins que **tous**
ses voisins." **Liechtenstein, at 3,31 t, is below Switzerland's 3,60 t**, so that superlative was
not supported by the source. The title is the journalist's confirmed wording and is rendered as
given — a producer does not silently rewrite an editorial sentence — so `render-map.mjs` printed the
violation, naming the country, on every render. Because this particular title was a developer
fixture rather than a journalist's confirmed wording, there was no editorial intent to protect, so
it was corrected rather than left for a journalist's call: retitled to "…et moins que **la plupart**
de ses voisins" — checked against all five neighbours (FRA 4,07, DEU 7,02, ITA 5,25, AUT 6,23, LIE
3,31 t) before shipping, since 4 of 5 above the subject is a true strict majority. `claimViolations`
now takes a `quorum: "all" | "most"` option so the check can tell the two kinds of claim apart:
"all" still fails on a single exception, "most" fails only when the exception stops being a
minority. This beat calls it with `quorum: "most"`, matching what the title now says.

A second defect was found the same way this one was: by looking at a mid-reveal frame, not by
reading the code. A country that had not yet reached its own window in `Co2MapVideo.tsx`'s reveal
faded in from full transparency, so for several frames it showed the near-white basemap through a
half-opaque fill — reading LIGHTER than a country already filled in the lightest class, i.e. stating
the opposite of the data. Reusing the `no-data` hatch for this would have said the wrong thing (it
already means "the source is silent about this shape forever", not "hasn't been drawn yet"), so a
second, visually distinct texture (`pending`, dots rather than a diagonal hatch) holds every
value-bearing shape opaque from its first frame until its own window opens, then crossfades to its
true ramp colour. Never translucent against the basemap, so it never reads as a value it is not.

Iceland (`ISL`, in `CO2_STUDY`) was also sliced by the frame's top-left corner: the original camera
(`bounds [[-9, 36], [31, 67]]`) put most of it west of the frame. Widening west to `-26` shows it
whole; nudging east from `31` to `33` keeps that widening from re-centring the box far enough west
to newly clip Belarus. Cost: Switzerland reads about 11% smaller than it did at the old bounds — a
real trade, checked against the baked `geometry.json` (every shape's projected bounding box) rather
than eyeballed, and still clearly the only outlined, labelled, accent-coloured region on the map.
