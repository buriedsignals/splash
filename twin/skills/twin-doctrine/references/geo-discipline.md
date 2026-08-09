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
