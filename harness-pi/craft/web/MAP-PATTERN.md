# Building a web MAP zone kit from a map-web proof

Read `PATTERN.md` first: everything there holds (copy with `cp`, patch with an exact-string script,
`refusing`, `REQUIRED`, the shared guards, words through `plain()`, the runner computes and the 12B
words). This file is what is DIFFERENT for a map. Reference kits: `web/choropleth/` (the map-web
skill's validated pattern, `proof/web-choropleth-europe-lowcarbon`), `web/locator/` (a control that
moves the camera: one fallback picture per state), `web/proportional-symbol-symbol-bubble-map/`
(overlapping marks), `web/cartogram-area-distortion-and-tile-cartogram/` (NOT a live map).

## 0. What a map-web page is (and why `_shared/web.mjs` does not fit)

A live map × web page is TWO layers (`skills/map-web/SKILL.md`, ruling R1):

1. a LIVE MapTiler map (MapLibre, inlined into the page) whose marks are MapLibre layers, booted by
   the type's `live-*.ts` script from a JSON plan (`#mw-live-plan`) — it sets `mw-live` on `<html>`
   and `window.__mwMap` once it is up;
2. a FROZEN FALLBACK image under it, photographed from the page's OWN live map (a draft page over a
   blank image → keyed copy → puppeteer waits for `mw-live` + idle → screenshot of `.map-layer` →
   webp), which is all a reader gets with no script, no key or no network.

The delivered page carries `__MAPTILER_KEY__`; the live layer boots only in a KEYED copy. The proofs
render through **chart-web's** `renderWeb` (with `drawing: { share: MAP_DRAWING_SHARE }`), not
map-web's `renderMapWeb` — map-web's `render-web.mjs`, `verify-interaction.mjs` and
`verify-live-map.mjs` drive the old seed (`.pt` buttons, circles) and do not apply to the directed
proofs. `_shared/web.mjs`'s `renderBeatWeb` is wrong for a map twice over: it verifies the placeholder
page (the layer never boots — 10 failures on the choropleth proof's own committed page), and it
refuses on ANY verify-web failure, while every map proof fails a few by construction (§3).

The map runner is `_shared/map-web.mjs`, imported as `./map-web.mjs` (the harness copies `_shared/` flat
beside the kit; no kit carries its own copy). It imports `./web.mjs`
(`chartWeb`, `DESKTOP_SHOT`) and gives:

| export | what it does |
|---|---|
| `mapWeb(here, …parts)` | the map-web skill wherever the root put it (`assets/classing.ts`, `live-*.ts`, `vantage.ts`, `area-scale.ts`, `restore.ts`, `style.mjs`, `geo-symbol.ts`…) |
| `maptilerKey(here)` | env first (`MAPTILER_KEY` and aliases), then the root's `.env`; refuses without. Never printed |
| `liveAssets(here)` | `{ maplibreJs, maplibreCss, styleModule }` (style.mjs with `export` stripped) |
| `ensurePlate({ here, label, water, land, frame, args, current })` | runs the kit's `bake.mjs` into `plate/<label>/`, cached on tints + frame + `current(facts)`; returns `geometry.json` (`frame`, `frameCorners`, `bounds`, `style`, `zoom`, `degreesPerPixel`) |
| `renderLiveMapPage({ here, label, key, stamp, pageOf, views, atView, hide })` | draft → photograph → final page; fallback cached in `fallback/<label>[-<view>].img` + `<label>.sha`, keyed on a hash of `stamp` (pass the live plan) + `hide`. `views: [{ slug, input }]` photographs one picture per state of a camera control (the radio `#<input>` is checked first) and hands `pageOf` `[{ slug, href }]`; `atView(page, slug)` runs before each shot and may throw (a measured refusal); `hide` = selectors kept out of the picture (default MapLibre's zoom buttons). Writes the keyed copy to `shots/<label>.local.html` — NOT renders/, which delivery reads |
| `verifyPage({ here, file, waivers, live })` | chart-web verify-web over `file` with `--shots`; every failure matched against `LIVE_MAP_WAIVERS` (when `live`) + the kit's `waivers`, each printed with its reason; anything else throws |
| `probeLiveMarks(…)` / `verifyLiveMap({ here, label, keyedPath, waivers, probe })` | verifyPage on the keyed copy, then the probe, then `lookAt` |
| `lookAt({ here, label, shots, desktop })` | `renders/<label>.png` + `look at:` |

`probe = { layers, keyProp, expected, subject, anchors, order, mayMiss }`: grids the live canvas with
`queryRenderedFeatures` over `layers`, keeps one pixel per mark (`keyProp`), searches pixel by pixel
around `anchors[key]` (`[lon, lat]`) for marks smaller than the grid, moves a REAL pointer there and
holds `#tooltip` to `expected[key]`; `order` (key → number) resolves overlaps the way the page does
(lowest answers — a symbol map answers with the smallest circle); `mayMiss` (array or predicate)
names keys allowed off screen; leaves `shots/map-hover-1600x800.png` on `subject`.

## 1. Copy, then patch

Into `web/<slug>/`: `Directed<Type>Web.tsx`, `bake.mjs` (if the type bakes a plate), `shapes.geojson`
(the proof's own — `cmp` it: the locator's differs from the choropleth's), any other file the runner
reads (`camera.ts`), `plate-water.mjs` from `static/locator/` when the proof measures occupancy
(the proof imports `scripts/map-beat/plate-water.mjs`, which needs `pngjs`; the static kit's copy
decodes with resvg). `map-web.mjs` comes from `_shared/`.

- `../../skills/<skill>/assets/x.ts` imports → top-level `await import(skillScriptFrom(import.meta.dirname, "<skill>", "assets", "x.ts"))`;
  a `type T` import becomes a local alias (`type ClassingDeclaration = Parameters<typeof assertClassingDeclaration>[0]`).
- `bake.mjs` reads the key from `splashEnvPath(HERE)` only — patch it to read `process.env` first
  (same three lines in every map bake).
- A constant the runner must quote (the symbol table's `ROW_SCALE`) may be `export`ed — say so in the
  patch's header comment.
- `../../docs/design-base/directions` (three filed directions) → `pickDirection` from `web.mjs`: ONE
  direction from the story's PALETTE.md, one plate, one fallback.

## 2. `render-beat.mjs`

Order (see `web/choropleth/render-beat.mjs`):

1. `refusing` → import beat, `applyStoryboard`, dynamic imports of `renderWeb`/`MAP_DRAWING_SHARE`,
   the vocabularies and the component.
2. `REQUIRED`, function fields, the JOIN (iso3 in the kit's `shapes.geojson`, ISO A2 from
   `#shared/map-beat/iso-codes.mjs` `ISO3_TO_ISO2` — MapTiler's Countries keys on `iso_a2`, and a code
   it does not carry paints NOTHING and looks like "outside the study").
3. The proof's arithmetic, generic. `beat.check(helpers)`, `assertDrawsClaimColumn`,
   `assertHeadlineNumbersDrawn` (pass the numbers the page prints: values, breaks, counts, distances).
4. Words: each word function receives the computed reading and is checked against the numbers it
   carries. Where a vocabulary checks a sentence itself (`assertAreaScaleDeclaration` wants the ratios
   in its own `fr(v, d)`), hand it the beat's `number(v, d)`.
5. `pickDirection(HERE, plainRegisters(textPerRegister), levels)` → `plateTints(direction, { landDose: 0.07 })`
   → `guardColour(direction, plateGrounds(tints, OCCUPANCY))` → refusals that depend on colour.
6. `ensurePlate` → plate facts. Then what needs the camera: occupancy (`markOccupancy` +
   `plateWaterField`), the Mercator cost for THIS subject (shoelace at the plate's camera vs the
   sphere, passed to a `mercator(m)` word function and checked for its rounded numbers).
7. The live declaration → `live*Plan` / `live*Script` (the vocabulary's own asserts run here).
8. `renderLiveMapPage`, the vocabulary's read-back guards over the WRITTEN page (`assertOneClassing` +
   `assertClassingReachesTheLayers`, `assertOneVantage` + `assertVantageReachesTheLayers`,
   `assertOneAreaScale` + `assertSymbolLawsReachTheLayers`).
9. `verifyLiveMap({ waivers, probe })`.

The interaction plan (`earns`/`controls`) is metadata in English built from computed counts;
`gesture` is one of `interaction-plan.ts`'s ten (a vocabulary name is refused); `readerPicks` are the
control's keys.

A type that is NOT a live map (the cartogram: no basemap, no key) skips 5–8's plate and fallback,
renders with `renderWeb` directly and calls `verifyPage({ live: false, waivers })` + `lookAt`.

## 3. Verify

```sh
export MAPTILER_KEY=$(grep -E '^REMOTION_MAPTILER_KEY=' /Users/rmdms/Sites/Professional/splash/sp1/.env | cut -d= -f2-)
# 1. the baseline: the proof's own page, KEYED, in a scratch copy (never in the tree)
bun -e 'const fs=require("fs");const [i,o]=process.argv.slice(1);fs.writeFileSync(o,fs.readFileSync(i,"utf8").split("__MAPTILER_KEY__").join(process.env.MAPTILER_KEY))' proof/web-<…>/renders/creme.html <scratch>/proof.local.html
bun skills/chart-web/scripts/verify-web.mjs --file <scratch>/proof.local.html --shots --out <scratch>/proof
# 2. the kit, from the bench root (PALETTE.md: ground "#FFFCEE", accent "#1757B6" reproduces the proofs' creme)
cd ~/.splash-harness/bench/root && bun stories/zz-web-<slug>/beats/1/render-beat.mjs
```

First run ~55 s (bake + photograph + verify-web + probe, four Chrome launches in sequence); a re-run
with the same plan ~35 s. Then: LOOK at `renders/<label>.png`, `shots/map-hover-1600x800.png`,
`shots/control-chosen-1600x800.png`, `shots/nojs-controls.png`, `shots/fit-375x812.png`, each against
the proof's. Diff the WORDS against the proof page (`grep -o 'data-detail="[^"]*"'`,
`data-stack-note`, `chart-caveat`, `<summary>`): with `beat.example.mjs` all four kits reproduce
their proof's tooltips, notes and caveat byte for byte. Mutations: data.json → title false →
REFUSED, empty renders/; a word function with a wrong number → named; once, in a scratch copy of the
runner, a broken join (`ISO2.FRA = "FX"`) → the probe reports `FX not on screen` (verify-web stays
green on it).

Measured counts (proof keyed page → kit page, same total): choropleth 248/10/8 → 250/8/8; locator
245/13/8 → 252/6/8; proportional symbol 218/10/9 → 224/4/9; cartogram (unkeyed, not live) 219/6/2 →
219/6/2. The kit is ahead where the chart-web trunk changed after the proof was rendered (09-29, phone
display step), never where a check was dropped.

## Pitfalls met

- **verify-web on a live map always fails these** — `LIVE_MAP_WAIVERS`, by exact check name: no-JS
  "live layer is up"; no-JS "choosing X repaints the drawing" / "every value paints its own picture"
  (no stylesheet reaches a MapLibre paint; the table's swatches carry the control with no script);
  "the page's own handler showed a detail string — 0/N" and "every reading answers a real pointer —
  0/0" (no SVG marks). A kit adds only what its proof's OWN keyed page fails, with the reason.
- **verify-web does not hover the map.** Its `hover-1600x800.png` shows no tooltip on a live map. The
  probe is what proves ask-a-mark, and the only check that went red on a broken join.
- **Some inherited failures are noise, and flaky.** The symbol map is never still between two idle
  frames, so `chart-area-scale: the drawing is still enough…` (and the repaint checks behind it) fail
  on laptop-wide in the proof and hit the phone run once on the kit; the next run passed them all.
  Waive the inherited set for both viewports, and do not read one green run as the defect gone.
- **The fallback photographs whatever sits over `.map-layer`.** The choropleth proof's frozen picture
  carries cropped zoom buttons; the symbol proof's carries its own HTML size legend, which on the
  current trunk's shorter box reappears offset under the live one (two legends, "10 GW" twice, no
  JS). `hide` keeps both out (`.maplibregl-ctrl-group`, `.key-layer`) — the locator proof's own rule,
  extended. Check `nojs-controls.png` for any doubled furniture.
- **Small marks.** Malta and the micro-states are a pixel or two at continental zoom and MapTiler's
  tiles omit Malta at low zoom (drawn from the kit's shapes, `OWN_SHAPES`): give the probe `anchors`.
  Two locator pins closer than a pin's width cannot both be on top: `mayMiss` all but the subject.
- **Overlaps answer by a rule.** The symbol page answers with the SMALLEST circle under the pointer;
  the probe needs `order` or it expects the big circle's answer.
- **A frame check must use what the camera draws, not the declared window.** The symbol bake's window
  stops at 42°E; Georgia and Armenia sit east of it and are drawn (the wide box shows more longitude).
  Refuse against the review frame.
- **Trim nothing the proof did not.** Trimming the cartogram grid's empty last column changed the
  frame from 12 to 11 cells, every relaxation, and every "travelled" distance in the tooltips. And
  ties rank in the data's own order (Albania 1st, Iceland 2nd, both 100 %), not the grid's.
- **The palette limits a choropleth's classes.** The ramp refuses neighbouring classes under 1.2:1
  over the land: the harness default (`#0B7A75` on `#FFFFFF`) carries TWO classes, the proofs' creme
  (`#1757B6` on `#FFFCEE`) four. Measure it first and say how many breaks to give.
- **Inherited, reported, not patched:** the cartogram's landing hover answers with the AREA stage's
  sentence (proof too); the locator's no-JS scale bar is a stub; the locator's "choosing region again
  restores the landing picture" fails (the camera does not land on the exact landing frame); the
  locator's bake prints `off-frame entirely: , , ,` (it keys shapes on `ADM0_A3`, its shapes carry `iso`).
- **One Chrome at a time.** Never run two kit renders in parallel.
