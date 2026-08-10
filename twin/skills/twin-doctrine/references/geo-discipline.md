# Geo discipline

The rules a **map** beat is written under, in either genre. `editorial-standard.md`,
`information-architecture.md`, `visual-system.md` and — for the video genre —
`motion-grammar.md` all apply unchanged; a map is a graphic before it is a map. This file adds only
what is true of maps and of nothing else, and it exists because each of these costs a day when you
meet it for the first time in a render.

Rules 1–7 are **inherited**: they were paid for elsewhere and are written down so nobody buys them
twice. Rules 8–12 were paid for by the beat this file was written against
(`twin-map-beat`, the CO₂ choropleth) and say which defect produced them.

## 1. Frame-gating must be bounded

A map fires `idle` when it has finished loading and rendering everything it knows about. When one
tile never resolves, `idle` never fires, and a capture that waits on it alone **hangs forever** —
not slowly, forever.

Gate on **`idle` OR a bounded settle timeout**, whichever comes first, and record which one fired.
This is the single invariant that makes a map video finishable. It is not a retry, not a longer
timeout, not a nicer error message: it is the difference between a pipeline that terminates and one
that does not.

## 2. A moving camera needs a fixed plate

Calling `jumpTo`/`flyTo` per frame and capturing the live map makes tiles and hillshade **shimmer**
in headless capture — the frame is resampled slightly differently each time. It is renderer
resampling, not a tile problem and not a network problem, and no amount of retrying, preloading or
raising the timeout fixes it.

For a moving camera: render **one fixed plate** wide enough to hold every camera position, and move
*within* the plate (translate and scale an image, which is exact). For a static shot, the live
camera is fine — capture it once.

## 3. Bake ordered geometry to GeoJSON before drawing it

Provider vector features arrive **split across tiles**: a river, a route or a border is many
fragments in arbitrary order, clipped at tile edges and duplicated along them. You cannot draw a
semantic start-to-end line from them, and you cannot fill a country from them either — the
OpenMapTiles schema a provider basemap serves carries administrative *boundary lines*, not
administrative *polygons*, so a choropleth's shapes never come from the basemap at all.

Bake the geometry you intend to draw into your own GeoJSON first, ordered, whole, and frozen with
the beat. Then draw *that*.

## 4. Labels are HTML/SVG overlays positioned by `map.project()`

Not map symbols. `map.project([lng, lat])` gives the pixel the coordinate lands on in the current
camera; the label is drawn there in the project's own typography, with the project's own furniture
rules, measured with the project's own `measureText`. A label handed to the map's symbol layer gets
the provider's font, the provider's halo and the provider's collision rules, and it will not match
anything else the newsroom ships.

## 5. Data joins fail silently — count them and fail loud

A country whose key does not match renders as no-data and **looks like a legitimate value**. Nothing
throws, nothing warns, and the map is wrong in a way that reads as correct.

So: join on an explicit key, **count the joined features, and fail loud naming every data row that
found no shape**. Two traps are certain to be waiting:

- **`ISO_A3` is not the ISO A3 code.** In Natural Earth's admin-0 set, France, Norway and Kosovo
  carry `ISO_A3 = "-99"`. Joining on `ISO_A3` silently drops France. `ADM0_A3` is the field that
  actually holds `FRA`.
- **A dataset invents keys for the entities standards bodies argue about.** Our World in Data codes
  Kosovo `OWID_KOS`; Natural Earth calls it `KOS`. Unaliased, Kosovo renders as no-data on every
  European map you will ever draw, and looks fine.

An alias table is part of the beat's data, tested, not a fix applied in a hurry when someone
notices.

## 6. Capture plumbing

`preserveDrawingBuffer: true` (without it the WebGL canvas is empty by the time you screenshot),
`--use-gl=angle` with a software backend, generous timeouts, and `--concurrency=1` for the video
render. Headless Chrome must be *found*: resolve it explicitly and fail with the path you looked in.

## 7. Basemap colour is three distinct layers, and no-data is a category, not a gap

A choropleth basemap carries three colours, and each must read as a different *kind of thing* at a
glance, not just a different shade of the same thing:

- **Water is a blue tint, never grey** — cartographic convention (OSM Carto `#aad3df`, Mapbox Light
  `#c6e2f5`), because grey water is visually indistinguishable from a no-data region.
- **Land under a region carrying no value is a very light neutral**, well below the data ramp so the
  data itself is what pops.
- **No-data is a distinct mid-grey, darker than the land and outside the ramp** — this project's own
  choropleth fixes it at `#b9b9b9` against a water tint of `#aac9e0`, specifically so a failed join
  (which silently renders as no-data — rule 5, above) is never mistaken for the ocean, or for a real
  low value the ramp could have produced.

All three must stay distinguishable from each other under a deuteranopia simulation, not merely under
normal vision — the entire point of a third, dedicated no-data colour is to be legible to a reader for
whom the ramp's own low end and a plain grey are otherwise hard to tell apart. A textured fill
(hatching) looks like the theoretically safer no-data treatment on paper — no shade to confuse with
the ramp at all — but it reads illegibly at the size a no-data region is actually drawn on a newsroom
map; a flat, distinct grey is the third *colour*, not a third *texture*, and it is what this project's
own maps use.

No-data must appear **in the legend**, named in the beat's language — and, the editorial standard's
own converse, only when a shape on the canvas actually carries it. An unused no-data legend entry is
decoration, not information, and comes out.

### 7a. The thing you paint ON the plate is measured against the plate, in ΔE76

Rule 7 is about the three colours the *basemap* carries. Everything a beat then paints over that
basemap is subject to the same rule, and "read as a different kind of thing at a glance" turns out to
need a number, because the failures are invisible to the author and obvious to nobody until someone
measures. Two shipped beats failed it in opposite directions and both looked fine in review.

**The bar, and it carries no free parameter.** The plate already separates its land from its water,
and that separation is what a reader uses to find a coast: for `dataviz-light` with rule 7's water
override, `#F7F7F7` against `#aac9e0` is **ΔE76 23.77**. So:

> A fill laid over the land must end up **at least as far from the water tint as the bare land
> already was** — or the beat has spent its own paint making the map harder to read than the plate it
> was handed. If it does sit nearer, the coastline must be carried by a **stroke measuring 3:1 or
> better against BOTH the fill and the water** (WCAG 2.2 SC 1.4.11), because then the edge is drawn
> rather than inferred. One or the other. Never neither.

**What it caught, measured on the delivered PNGs.** A flow-map beat filled nine crossed territories
from Tol's Muted set at `fill-opacity` 0.42. The wash pulls every hue toward the pale plate, and a
light cool hue washed far enough lands *on* the water tint: Austria's fill sat **11.06 ΔE76 from the
Adriatic** — under half the bar — and came within 7.6 px of actually-rendered water at the Bodensee.
Pale cyan cannot be rescued by opacity (11.06 at 0.42, 6.9 at 0.70) because it **is** a water tint;
pale teal needs 0.70 before it clears. Both slots were replaced by dark hues chosen by running the
measurement over a candidate pool, and the set was checked under Viénot–Brettel–Mollon dichromat
simulation rather than by eye. A dot-density beat failed the mirror image: an opaque `#F0F0F0` study
fill sat **2.44 ΔE76 (1.064:1)** from the plate's own unpainted land, so "counted in this map's total"
and "not in this map at all" were the same colour — and, being opaque, it swallowed nine inland lakes
whole and cut Lake Peipus into a land half and a water half in one frame.

**Three consequences worth stating on their own.**

1. **A fill over a basemap is a TINT, not a lid.** Paint that covers water is a claim that there is no
   water there. If the study area must be shaded, shade it at an opacity the basemap's own water
   survives; a lake under a tint reads as a darker lake, which is true, where a lake under an opaque
   fill reads as land, which is not.
2. **The legend swatch must be the colour the map actually shows**, not the hue before compositing.
   A key drawn at full strength beside regions drawn at 45% names a colour that is nowhere on the map.
3. **A numeral on a swatch takes the pole that measures higher against that swatch**, the same rule
   `deriveFurniture` applies to a ground — never the beat's ground colour by default. Nine numbered
   badges drawn in the beat's white ground put white on Tol's sand at **1.62:1**, on its cyan at
   **1.76:1**, on its teal at **2.82:1** and on its olive at **3.02:1**: five of the nine numbers a
   reader was asked to read *in order* sat under the 4.5:1 floor, and two were barely there. Deriving
   the pole per swatch takes the worst of the nine from **1.62:1 to 5.26:1** and costs nothing.

**And the converse of rule 7's legend clause.** No-data must be named in the legend; so must a
**study-area shading**. Otherwise a reader is left to infer whether an unshaded country holds no
people or was simply never counted — and the two are not the same sentence.

## 8. In a choropleth the ramp is the quantity; the accent is spent on the subject's outline

The ramp is a gradient that encodes a value, which is the one legitimate gradient in this system
(`visual-system.md`). But it colours *every* region, so it cannot also carry the semantic accent —
and a second fill colour for the subject would be a value the scale does not contain.

The subject gets an **outline and a direct label**, in the accent, and nothing else on the map gets
either. That is what makes it the subject. Derive the ramp from the newsroom ground toward its ink
so it stays neutral and works on any ground, and keep the accent for the one region the takeaway
named.

*Defect:* the first sketch put the accent hue in the ramp itself, and the subject then had nothing
left to be marked with that the scale had not already spent.

## 9. Quiet the plate: the beat draws the only labels

A provider style ships place labels, road labels, boundary lines and POIs. For a choropleth every
one of them is a layer doing none of the five jobs — the regions are the subject, and the basemap's
own country names compete with the one label that matters. Hide the style's `symbol` layers and its
boundary layers before capture, and let the shapes and the beat's own labels carry it.

This is also how a map stays **discreet** when the brief demands it: an unlabelled dark region is
visible in the shading and not called out, which is impossible if the basemap has already printed
its name.

## 10. A choropleth's reveal order is the value order

`motion-grammar.md` requires a reveal to follow the data's own order or the argument's. A map has no
time axis, so it takes the second: regions arrive **in the order of the value being encoded**,
lightest to darkest, and the field visibly darkens. That is the distribution building itself, and it
is an argument.

It is not the "uniform cascade" anti-pattern, which is a stagger by *index* — an order the data does
not contain. And the subject still arrives afterwards as its own event: it is marked, not merely
last.

## 11. Cull rings by their projected box, and distrust one wider than the frame

Project first, then decide what to draw. A ring whose projected bounding box does not intersect the
frame is dropped — that is most of Russia, every overseas department, and the tail of any country
that reaches out of the camera.

A ring whose projected width is several times the frame is **not a big country, it is an
antimeridian wrap**: two coordinates on either side of ±180° joined into one straight streak across
your map. Drop it and say so.

*Measured, on this beat:* of the 343 rings Natural Earth hands over for 50 European countries, 142
never touch the frame — Natural Earth's France arrives with French Guiana attached, and Russia
reaches to Kamchatka. Culling and thinning to the drawn resolution keeps 201 rings and 15 932 of
21 706 points. The saving is real but it is not the reason for the rule: an uncculled ring is
occasionally a streak across the map, and that is a defect rather than a cost.

## 12. The camera is decided by the geography; the layout adapts to it

Europe is taller than it is wide once projected. A 16:9 frame that contains it from Sicily to the
North Cape also contains most of the Atlantic and a third of North Africa, and no amount of layout
work removes them.

So the camera is chosen first, from the geography and the study set, and the **layout is built
around the plate that comes back** — text beside a square plate, not a plate stretched to fill a
frame someone chose before looking. Both genres of a beat should share one camera: same bounds, two
resolutions, one geometry.

*Defect:* the first framing asked `fitBounds` for `[-11, 35] → [31, 66]` in a 900 × 560 frame and
got a map spanning −30° to +45°, with the subject 40 px wide and Tunisia in shot.

**Second clause, added 2026-08-10 under ruling R2** — *"trois tailles d'export fixes pour le static
et la vidéo, et une PLAGE pour le web"*. Static and video have three fixed shapes and web fills
whatever container a CMS gives it, so **the camera takes THREE inputs: the geography, the study set,
and the target aspect.** The first clause above says "the layout adapts to the camera", and that
stays true within one shape; it is not an answer to being asked for the same geography at 16:9, at
9:16 and at 1:1, because the shape is now given rather than discovered.

The cost of ignoring the third input is measured, not argued. `fitBounds` silently widens whichever
axis does not bind: a Switzerland camera and a Lake Geneva camera each admit **≈2× the latitude
their study set asked for in portrait** (×1.95 and ×2.08) against ×1.00 in landscape
(`survey/map-camera.md`). On the web this is the same arithmetic wearing its other face — driving one
live page at four viewports, a 1600×900 article column showed **3.2× the longitude the story asked
for**, mostly ocean, while 768×1024 left the reader **0.27 of a zoom level** of room to move in.
Re-measured 2026-08-10 across four live beats — the symbol seed, the quake symbols, the CO₂
choropleth and the population dots — the wide article column admits **×2.58 to ×3.23 of longitude**
and the phone **×1.46 to ×1.70 of latitude**, while the tall tablet is the one shape that comes out
near ×1.2 on both. Nothing is cropped in any of them, which is the point: the excess is what
`fitBounds` MUST show to keep the whole study set on screen at a shape the plate was not baked for,
so it is a number to record and put in front of a journalist, not a bug to fix in the fit.

So a camera that takes an aspect owes two recorded numbers — how much longitude and how much latitude
it ADMITTED beyond the study set — and a leash that answers the second case: the twin's map × web
plans carry `minZoomHeadroom`, a derived floor under how far a reader can come in, because a fit that
lands tight is a map you cannot move through. `admittedLonRatio`/`admittedLatRatio` are named here
and were **recorded by no bake for a fortnight** — closed 2026-08-11 by `admittedRatios` and
`extentFacts` (`twin-map-beat/assets/geo.ts`), which the seed's bake now writes into every
`geometry.json` under an `extent` key. Measured against each beat's own study set rather than its
hand-typed `BEAT.bounds` — which reports ~1.00 at 11 of 11 beats because it was tuned by eye until
it matched — the tree's worst offender is the **city** rung, not the wide one:
`mapvid-locator-geneva` admits **×2.46 of longitude and ×2.86 of latitude**, so a beat titled "All 11
of these international organisations sit inside 4.4 km" shows two and a half times the city its claim
is about. One number answers both directions: above 1 is ground the reader is shown that the sentence
is not about, below 1 is ground the sentence is about that the reader is not shown
(`map-quake-density`: ×0.72, which is its 104 poleward events).

**Third clause, added 2026-08-11 under B4.1 — the camera has to hold a city and a planet, so the
ladder is stated and the frame that cannot serve a rung REFUSES.**

The rung is derived from the frame's own ground width at its own centre latitude, with floors at
powers of four of the Earth's equatorial circumference — each rung exactly two zoom levels wide, one
anchor (the planet), no free parameter: `planet` ≥ 10 019 km · `hemisphere` ≥ 2 505 · `continent`
≥ 626 · `country` ≥ 156 · `region` ≥ 39 · `city` below that. **The names are ground widths, not
political units**, and that has to be said plainly because it reads as a mistake otherwise:
Switzerland is 345 km across and lands in `country`, France is 950 km and lands in `continent`, and
both are countries. What decides the render is how much ground is in frame, not what the ground is
called.

> **A map is never given more stage height than its own geography can fill. Where a frame is taller
> than the geography admits, the map takes the height the geography demands and the leftover goes to
> FURNITURE — never to a wider camera, and never to a crop.**

This is the first clause's "text beside a square plate" read in the direction it had never been read,
and it is forced by the projection rather than chosen. Web Mercator's world is a **square**: showing
`lonSpan` degrees across a `width`-px frame draws the world `S = 360 × width / lonSpan` px on a side,
and that same S is its height. MapLibre will not zoom out past `S = frameHeight` — under it the canvas
would show ground that does not exist — so a frame taller than S never gets the longitude it asked
for, whatever `fitBounds` is told. It is not the fit's arithmetic and it cannot be patched in the fit.

*Measured, twice, and the model predicts both:* `proof/mapgen-hexgrid-web` at 375×812 draws into a
343×461 canvas and shows **266° of its 359.8°** — a quarter of the world gone, with `maxBounds` then
stopping the reader panning to it; the model says 360 × 343 / 461 = **267.8°**, and the 1.8° is the
fit's own padding. Driven at the export size, a planet camera handed the whole 1080×1920 frame shows
**202.5°** and the model predicts **202.5°** exactly; letterboxed to the 1080×1080 stage its geography
can fill, it shows **359.8°** and hands **840 px** back to furniture
(`twin-map-beat/output-proof/extent-range/`, both pictures committed).

`stageBoxFor` returns the stage; `assertStageServesGeography` refuses the frame that ignores it and
names the two honest options — letterbox, or narrow the study set and say what was left out.
Stretching is not among them (`map-web-discipline.md` rules a non-uniform scale out in writing). The
rule bites only where the frame's aspect exceeds 360 / lonSpan, which at 1080×1920 is any study set
wider than 202.5°: Europe, the Danube and Geneva are untouched at all three export sizes, so it costs
nothing anywhere except the rung it exists for.

## 13. A wider extent is a different render, and three of its four knobs are arithmetic

B4.2: *"une zone plus large demande un rendu différent"*, so that everything stays visible and
reachable inside the map. Measured across six rungs of one frozen catalogue — 40 053 km of ground
down to 20 km, 2 047× in metres per pixel, through one `fitBounds`, one style and one capture gate
(`twin-map-beat/output-proof/extent-range/RANGE.md`) — **nothing in the machinery is per-rung. What
changes is what the numbers say.**

**The mark size is measured on the plate, never taken as a fraction of the frame.**
`markRadiusCeilingPx` caps the biggest mark at half the plate's own **median** nearest-neighbour
distance, so the typical pair exactly touches. The median and not the minimum: `map-geneva-locator`
holds two organisations **0.57 px apart** — the same building — and a minimum-driven rule collapses
every mark on the map to nothing. Across the six rungs that is **1.5 px to 19.1 px on an identical
900 px frame from an identical catalogue**, and the existing typed constant stays as the ceiling so
nothing grows. Applied to `mapgen-symbol-web`'s committed plate (median gap 26.06 px) the ceiling is
13.0 px against the 30 px it draws: **today's marks are 2.3× the size at which the typical pair stops
overlapping.** Note it is not monotone in extent — the `country` rung's median gap (3.61 px) is
smaller than the `continent` rung's (4.63 px) because that camera lands on an aftershock sequence.
Density is local; a rule of the form "radius = fraction of frame width" is wrong at every rung by a
different amount.

**The same derivation says when a type stops working at all, and it agrees with the beats.** At the
planet and hemisphere rungs the median gap is 0.45 px and 1.49 px, so the ceiling falls under the
1.5 px floor at which a circle stops being a circle: a catalogue this dense **cannot be drawn as
separable marks above the continent rung**. That is why every planet beat in this tree is a hex grid
rather than a symbol map, and it is the first time the tree can say so with a number rather than by
taste.

**Whether the projection is lying is the beat's own legend's question.** `mercatorAreaBias` is how
much more ground one drawn pixel covers at the frame's most-distorted edge than at its
least-distorted one — sec²(lat), floored at the equator when the frame straddles it. Measured ×1.01
at city and ×131.7 at a pole-to-pole planet frame, and it reproduces the two figures this project had
only ever worked out by hand (×6.75 for `mapgen-dot-web`'s 34.5–71.5°N band, ×24.0 for
`map-quake-density`). For an AREA encoding — a dot standing for a fixed number of people in a fixed
piece of ground, a hex cell counting events per cell — `binsCrossedByProjection` turns that into the
only budget that carries no free parameter: **how many of the beat's own legend bins the projection
alone can move a cell.** On `map-quake-density`'s published breaks the smallest adjacent step is
×2.33 and its bias is ×24.0, so the answer is **three bins** — two cells of identical ground density
painted three classes apart while the legend compares them as equals. `assertAreaEncodingIsHonest`
refuses such a beat whose caveat mentions neither Mercator, the projection nor latitude. It is a
DISCLOSURE rule and not a correction rule: at planet extent nothing can be undistorted, and the
converse of rule 7's own no-data clause applies — a reader must not be left to infer whether a sparse
region holds few events or was drawn small by the projection.

**The basemap's detail level follows the camera for free, and no style is switched.** The same style
URL at zoom 0.8 and at zoom 11.4 carries coastline at the planet rung, motorways and regional
boundaries at the country rung and individual tracks at the city rung — the provider's vector tiles
do it. A second style at wide extents would be a second cartography, and a beat whose plate and live
map disagreed about the ground would break the swap the web genre depends on. Measured by looking at
`basemap-planet.png`, `basemap-country.png` and `basemap-city.png`; this was the cheapest of the four
questions and it needed no code.

**The fourth knob is open, and it is the label layer.** How many labels an extent can carry is not
derived anywhere: `map-geneva-locator` draws 5 labels for 11 markers at 496 px, `mapgen-locator-web`
3 for 11 at 420 px, and nothing counts it. Recorded as open rather than approximated, because the
existing answer — one candidate position, drop on collision — degrades worst at exactly the rung
where a local newsroom works.

**And one rule per mark type that only appears at the bottom of the ladder, stated and not
implemented.** A `radius: "ground"` mark — a dot standing for a fixed number of people in a fixed
piece of ground — must keep its GROUND area, so its screen radius halves for every zoom level a
reader pulls back; a proportional symbol encodes a value and not an area, so it keeps its SCREEN
size. **The two rules are opposites**, and a leash derived from "when marks stop merging" is right
for the second and wrong for the first.

## An open problem this beat did not close: a legend can still clip a long unit word

A proportional-symbol legend's box has been sized by a formula built from the widest circle diameter
alone — it reserves room for the largest mark, not for the longest string that has to sit beside it.
A short unit ("km", "%") fits inside that reserve by accident; a word-length unit ("magnitude") does
not, and clips — "8 magnitud…" is the shipped instance in the project this discipline is checked
against. This is the same failure class as a fixed label gutter (a reserved space sized against one
dimension of the content while another dimension of the same content grows past it), and it remains
open: not yet fixed, and not yet even mechanically caught, because the guard that exists measures
label gutters, not a legend box's width against its own longest label-plus-unit string. Closing it
means either measuring the legend box the same way a label gutter is measured, or dropping the unit
from the legend rows entirely on the grounds that it is already stated on the labels and the
subtitle — recorded here as the two live options, neither chosen yet.
