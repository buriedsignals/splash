# The map plan — the contract, its boundary, and its eight guards

**Status, stated plainly.** The trunk (`shared/map-beat/plan.mjs`, `tints.mjs`, `geometry.mjs`,
`glyphs.mjs`, `style.mjs`, `mount.mjs`, `bake.mjs`) is complete and reviewed, and it is mirrored
into `skills/splash/assets/root-template/shared/map-beat/` so an installed root carries the same
wiring this repository renders with. The pilot — `proof/static-choropleth-europe-lowcarbon/` —
declares a validated plan, publishes its drawn size, and THE MOVE IS DONE: its classed regions, its
borders, its leaders and dots, its subject ring and every word it places are MapLibre layers inside
the baked image, baked at `plan.camera.drawn`. `preserveAspectRatio="none"` is gone with them, and
the component draws one `<image>` at the map's own rectangle plus the furniture around it. What
stays outside the map is §2's line, unchanged: title, standfirst, legend key, source and reading
note are still React and SVG. The other five static map types — dot, symbol, flow, locator, contour
— are not touched by this sub-project; neither are the map zones inside the components that host
them. Both are out of scope here, by design, not by oversight.

**The cardinal rule.** The wiring lives in `shared/map-beat/`. A beat declares a plan; it does not
write a map. The September 2026 spike proved this the hard way: it converted six map types by hand
and drifted on the same defect — a doubled basemap, a plate at the wrong scale, a size chosen
before the layout knew it — six separate times, once per beat, because the wiring was recopied
rather than shared. Whatever a beat needs from a map, it asks the trunk for; it never re-derives it.

---

## 1. The contract

A beat does not draw a map. It produces **one plan**, and four renderers consume the same plan
without disagreeing:

```
beat  →  plan
           ├── style    : the MapTiler style document, with this beat's transformations
           ├── camera   : bounds, zoom limits, and the DRAWN SIZE (§3 below)
           └── layers[] : GeoJSON sources + fill · line · circle · symbol layers,
                          painted from the beat's own direction
plan  →  web     : mounted as a live map
      →  still   : mounted, then captured once
      →  video   : mounted, captured frame by frame
      →  scrolly : mounted, camera animated
```

`makePlan({ style, camera, layers })` (`plan.mjs`) freezes all three — the top object, the camera,
and every layer — because a renderer that could mutate the plan it was handed is a renderer that
could disagree with the still standing beside it. `validatePlan(plan)` is the one function every
renderer calls before it draws anything; it returns a list of strings, never throws, so a beat can
decide whether an empty list is required or merely expected.

**And the RENDERER runs it, not only the beat that wrote the plan.** The pilot's bake
(`proof/static-choropleth-europe-lowcarbon/bake.mjs`, `assertPlanIsRenderable`) runs `validatePlan`,
`validateExpressions` and `assertNoDoubledBasemap` on the plan it reads off disk, before it mounts
anything. It used to trust the file, which holds only while the writer and the renderer are one run
— a plan reaching a renderer from a second beat, from an older `--plan` file, or from a hand edit
would have been mounted unchecked. A plan is a FILE; whoever draws from it validates it.

**And the web renderer is now ON it** (2026-09-13). `skills/map-web/assets/live-map.mjs` already read
this shape, with its three radius strategies — a value-encoding circle held fixed in screen pixels, a
point whose ground footprint doubles per zoom level, a pin that does not move — but it read it from
its own copy of the wiring, one byte-identical copy per web beat. Those three strategies
(`cameraScale`, `groundRadiusExpression`, `radiusPaintOf`, `markScaleOf`) are now `mount.mjs`'s, and
`mountPlan` honours `layer.radius`, so the same function mounts a still's plan and a live map's. §7
below records what else moved with them and where the boundary now sits.

## 2. What is in the map, and what stays outside

| | where it lives | who decides it | who draws it |
| --- | --- | --- | --- |
| geography, coasts, seas, lakes | MapTiler | MapTiler | MapLibre |
| the beat's own marks | the plan | the beat | MapLibre |
| words placed **inside** the map | the plan | the beat | MapLibre |
| title, standfirst, legend key, source, reading note | outside the map | the beat | React / SVG |

The line is drawn once and does not move per beat: anything that is *of* the geography or *drawn
on top of* it goes into a layer; anything that explains the graphic to a reader stays furniture,
laid out in React or SVG exactly as every other beat's furniture is. The out-of-map furniture keeps
the full family ladder — it is not subject to the eighteen-family ceiling in §5, because it never
asks MapTiler to render anything.

## 3. The three rules that make this generic

A converted beat that only holds for one subject is a spike, not a tool. Three rules, each one a
thing this reference can be checked against:

1. **Nothing hard-coded that comes from the subject.** Camera bounds, name lists, thresholds, seat
   counts, class breaks — all of it derives from the beat's own data. The spike broke this twice —
   the flow map's subject (`"DEU"`) and the locator's label anchor, both hard-coded — and both are
   decisions for the beat to make from its data, never for the plan to assume.
2. **What is measured stays measured.** The density threshold, the texture radius, the water tint,
   the body size that reaches a capital height, the family choice — the plan **calls** the
   measurement each time; it does not carry forward yesterday's answer. A new subject produces
   different numbers, on purpose.
3. **A beat that cannot satisfy a rule refuses.** This is the trunk's doctrine already —
   *"a silent stack has not chosen"* — extended to maps: no dose of water separates sea from land,
   no threshold leaves a field readable, no room for the subject's name, a family that will not
   resolve — the render stops and names what is missing. It never ships a map nobody chose.

## 4. The eight guards, and the defect each one catches

MapLibre complains about nothing (§6). Every one of these guards exists because something failed
in silence during the spike, and each is written to turn that silence into a thrown error.

**1. Two layers cannot share an id** — `validatePlan`, `plan.mjs`. MapLibre keeps the first layer
and drops the second without a word. On the locator beat, the label layer was named after its
circle layer and six cities stayed anonymous for a full render cycle.

**2. A requested family must not be the fallback** — `assertNotFallback`, `glyphs.mjs`. MapTiler
Cloud answers HTTP 200 for a family it does not have, and serves Noto Sans instead.
`Futura Medium`, `Avenir Next`, `Georgia` and a fictitious name all come back as the same
83 352-byte file, with nothing to say so. This guard compares the candidate's bytes against the
fallback's and throws when they match — a map that asked for Futura and got Noto Sans would
otherwise render correctly and lie about it.

**3. Every character range the beat writes must be served** — `assertRangesServed` /
`rangesNeededBy`, `bake.mjs`. A glyph range that is not served makes its characters vanish from
the word with no error at all: "Mer d'Azov" printed as "Mer dAzov" for a full render cycle,
because the typographic apostrophe is U+2019 and sits outside the Latin block
(`DEFAULT_RANGES = ["0-255", "8192-8447"]` in `glyphs.mjs` covers both).

**4. The plate is placed where the marks are** — `assertPlateMatchesMarks`, `geometry.mjs`. Three
of the six converted components placed the plate on the layout BOX instead, with
`preserveAspectRatio="none"`, which compressed the geography by a third while the marks kept
drawing at the map's own scale. It stayed invisible as long as a second, coarser basemap was
painted over it — the defect only became visible once the doubled basemap (guard 6) was removed.

**5. The map is baked at the size the layout published** — `validatePlan`'s drawn-size check
(`plan.mjs`) plus `drawnSizeOf` (`geometry.mjs`), and `drawnSizeFor` in the bake. The drawn size is
a layout OUTPUT, not a setting chosen up front and scaled down later: a plate baked at 1000px and
drawn into 574 renders every absolute length 1.74 times too thin — strokes, floor radii, outline
widths. Radii expressed as a *fraction* of the plate width survived unscathed, which is exactly what
made the defect invisible on large circles and fatal on small ones.

The bake READS `plan.camera.drawn`; it does not take a size and overwrite the plan with it. That
distinction is the guard: the pilot's bake used to build `drawn` from its own `--size` flag on the
way into `bakePlan`, so this rule compared the caller's number against the caller's own number and
could not fail — the two agreed only because the runner happened to pass the same value twice.
`--size` survives as an ASSERTION rather than a setting: give it and it must equal what the layout
published, or the bake refuses and names both numbers.

**6. No beat layer redraws the basemap's own geography** — `assertNoDoubledBasemap`, `style.mjs`.
Repainting land or a coastline from the beat's own shapefile lays a second geography over
MapTiler's — two datasets that do not agree on a coastline, offset by a hair, with a halo around
Iceland and Norway to show for it. A layer that means to mark "this belongs to the study" does it
by tint, never by redrawing the ground; the guard throws on any layer whose `role` is
`basemap-land` or `basemap-coast`.

**7. Sea and land must clear a measured contrast floor** — `plateTints`, `tints.mjs`. A fixed dose
of the water hue cannot work across three grounds: on `nocturne` it once rendered sea and land at
1.014:1 — the same colour. Before the trunk existed, the pilot choropleth answered this question
itself with fixed doses, and sat at 1.089:1 on creme, 1.158:1 on nocturne, 1.092:1 on rapport —
every one of them under the 1.22:1 floor a reader needs to tell a coastline from a country, which is
exactly what a reader looking at the nocturne plate reported: sea and land could not be told apart.
`plateTints` searches doses from 0.06 to 0.7 and takes the smallest one that clears `SEA_LAND_MIN`
(1.22:1 against land) while staying under `BASEMAP_MAX` (1.6:1 against the page) — the basemap
stays as quiet as it can while a coastline still reads — and throws, naming the ground and the hue,
when no dose in that range does both.

**8. Every style expression is one the spec's shape actually allows** — `validateExpressions`,
`mount.mjs`. `text-offset`, `icon-offset`, `text-translate` and `icon-translate` each take a
literal pair of numbers, or ONE expression that evaluates to a pair — never an array assembled
from two separate expressions. MapLibre treats that shape as invalid and draws the layer with
nothing in it: no warning, no error, an empty layer that reads like a data problem for an hour.

## 5. The eighteen families MapTiler actually serves

Every other name, of any style or vendor, returns HTTP 200 and the same Noto Sans file — that
silence is the defect guard 2 exists to catch.

Seventeen of the eighteen are Google Fonts, fetched the same way the design base now fetches every
other typeface — on demand, into a gitignored cache, never vendored and never installed. The
eighteenth, Metropolis, is MapTiler's own and is not on Google Fonts at all.

| family | source |
| --- | --- |
| Metropolis | MapTiler (not on Google Fonts) |
| Open Sans | Google Fonts |
| Roboto | Google Fonts |
| Inter | Google Fonts |
| Lato | Google Fonts |
| Montserrat | Google Fonts |
| Nunito | Google Fonts |
| Rubik | Google Fonts |
| Source Sans 3 | Google Fonts |
| PT Sans | Google Fonts |
| Ubuntu | Google Fonts |
| Merriweather | Google Fonts |
| PT Serif | Google Fonts |
| Libre Baskerville | Google Fonts |
| Noto Serif | Google Fonts |
| Roboto Slab | Google Fonts |
| Roboto Mono | Google Fonts |
| Source Code Pro | Google Fonts |

**One family, two names.** Google serves the ninth row as `Source Sans 3`; MapTiler still answers
to its old name, `Source Sans Pro`. `glyphs.mjs`'s own `CANDIDATE_FAMILIES` spells it MapTiler's
way because that list asks MapTiler's glyph endpoint; the design base's ladder spells it Google's
way because that is what it fetches. This is the one place the two catalogues disagree on a name —
worth knowing before assuming a family string travels unchanged between the two sides.

**The consequence worth stating plainly.** Because the design base's ladders were built to head
with families MapTiler also serves — serif → Merriweather, sans → Open Sans, geometric sans →
Montserrat — a map label drawn in one of these seventeen needs no SDF glyph baking at all. The
panel beside the map and the words on the map itself are set from the exact same fetched file.
`assertNotFallback` stays live in the trunk, and the pilot's bake calls it on every face the plan
names.

**And SDF baking has no engine here, which is a measured state rather than a gap nobody noticed.**
`glyphs.mjs`'s `bakeGlyphs` is kept and REFUSES, naming why. `@maplibre/font-maker` — the package
the plan named — does not exist on npm; `maplibre-font-maker-node@0.5.0`, the only published
wrapper, loads its WASM through `node:vm`, and Bun's `var` hoisting inside a vm script erases the
sandbox's `Module` before emscripten's preamble reads it, so the process HANGS instead of throwing.
It also declared no licence. It has been removed from `package.json`; nothing calls `bakeGlyphs`,
and the path it stands for is only reached by a family OUTSIDE these seventeen. Ruling C12 in
`.superpowers/sdd/2026-09-12-sp1-map-plan-contract/progress.md` carries the full measurement, and
the refusal points there.

## 6. Why every guard above exists at all

MapLibre refuses nothing. A duplicated layer id drops the second layer silently; an unserved
glyph range drops a character from a word silently; a style with `text-offset` built as an array
of two expressions draws an empty layer, also silently. None of these raise, log, or show up
anywhere except in the rendered pixels — which is why §4's guards are assertions written after a
defect was already found by looking at an image, not defences against a hypothetical.

---

## 7. The web renderer, and where the boundary sits

`proof/mapgen-locator-web/` is the pilot for web the way the choropleth is the pilot for still: it
declares a plan, validates it, and is drawn by trunk code in both of its layers. The other four
`mapgen-*-web` beats — choropleth, symbol, dot, hexgrid — are not converted, in that owner order.

**A web beat is TWO renderers of one plan**, and the pair is the point: a LIVE MapLibre map in the
reader's browser (ruling R1) over a BAKED plate that is the whole beat with no JavaScript at all
(a rotated key, a CSP that refuses `api.maptiler.com`, no network). They must be one cartography or
the swap between them is visible, and until this conversion they were not: the bake swept the style
by regex while the live layer named `["Water", "Water shadow"]` by hand and painted them a
hard-coded `#aac9e0`, in two files, in five beats.

| | the trunk answers it | notes |
| --- | --- | --- |
| what a layer's `radius` means | `mount.mjs` — `radiusPaintOf`, `cameraScale`, `groundRadiusExpression` | `mountPlan` applies it at mount, so no frame of MapLibre's default 5px |
| how big the FURNITURE around a mark is | `mount.mjs` — `markScaleOf` | a pin's halo does not grow with the camera; guard 9 |
| what the style's water, land and labels become | `style.mjs` — `styleDecisionFor`, applied by `transformStyle` (document) or `applyLiveStyle` (live map) | one rule, two applications; guard 10 |
| what colours the basemap may be | `tints.mjs` — `plateTints` | guard 7, unchanged |
| whether a plan can be drawn at all | `plan.mjs` — `validateLivePlan` | guard 11 |
| the two-layer swap, the reader's leash, hover, the CSS filter's live mirror, the HTML overlay | **`map-web` owns these** | they are the WEB format answering R1/R2, not the plan contract |

### Three more guards, same reason as the first eight

**9. The furniture around a mark follows the mark's own rule** — `markScaleOf`, `mount.mjs`. The
fourth instance of `map-web`'s own "one mark, two halves, two mechanisms": a locator's pins were
painted flat (correct) while their halos, label gutters and baseline offsets were scaled by the
camera — 40px of ring around a 12px pin at that beat's own 2.88×. Both halves were internally
consistent, which is why nothing was red.

**10. A live style that answered nothing did not find the style it was written for** —
`assertLiveStyleAnswered`, `style.mjs`. `dataviz-light` carries a background, a water fill and dozens
of symbol layers; a sweep that re-tinted NONE of them met a renamed layer, a different style, or a
style that never loaded. The plate would still be blue and the live map would not.

**11. Whoever draws a plan validates it, and a web plan crosses a machine** — `validateLivePlan`,
`plan.mjs`. A web plan is serialised into the page as JSON and read back by a script that never met
the code that wrote it: `Object.freeze` does not survive that and neither does any check the writer
made. Until this existed the live layer validated nothing at all. It asks for the style URL, the
drawn size, `degreesPerPixel`, well-formed `studyBounds`, `bakeZoom` when a ground-scaled layer needs
it, and no duplicate ids.

### `keepTextures`, and the door it nearly opened

A beat may name provider geography it KEEPS (`keepTextures: [/road/i]`), because the texture sweep
was written for a continent and a city locator frames 4 km: the street network is how a reader places
markers against a city they know. It is stated in the beat's own file, with the reason, and the
default is still to hide everything.

**It never brings a LABEL back, and that is checked before anything else.** `dataviz-light` calls one
of its SYMBOL layers `Road labels`, so the first version of `/road/i` matched it and the live map came
back with the provider's street names printed across it — measured in a real browser, not read.
That is words the beat did not write (§2's line) AND a font stack nobody in this beat chose, which is
the exact door guard 2 stands behind. A texture is a texture; a word is a word.

### Guard 2 in the web case: no glyph is ever requested

`map-web` asks MapTiler for no glyph at all. Both halves hide every symbol layer, and every word on
the page — marker names, tooltips, title, caveat, table — is HTML set in the page's own embedded
face. Verified on the regenerated locator: zero MapLibre-drawn text layers visible. So the bare-family
substitution the static side paid for cannot arrive by the same route here, and `maptilerFace` has
deliberately NOT been promoted out of the choropleth: nothing in `map-web` calls it. The day a web
beat draws a word inside its map, that helper belongs in `glyphs.mjs` beside `assertNotFallback`, and
the family is already in hand — the design base's sans ladder heads with Open Sans, which is one of
the seventeen §5 lists, so the panel and the map label come from the identical file.
