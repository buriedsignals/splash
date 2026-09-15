---
format: web
type: proportional-symbol
---

# Beat — Cinq pays portent 55 % de la capacité bas-carbone européenne (web)

**Type:** proportional symbol (symbol map). **Medium/format:** map / **web**. **Frame:** fluid.

## Claim

**France 96 GW, Royaume-Uni 47, Espagne 39, Allemagne 33, Russie 32 — 55 % of the continent's
453 GW, across 8 299 stations.** The beat throws if the top five do not hold more than half.

Everything below is derived in the runner from the frozen file and asserted there before anything is
drawn: the five countries, the share, the total, the station count, and every number the control's
own sentences print.

## Treatments spent

- `a-radius-is-not-read-by-eye` — circles are scaled by **area** at rest, and the key gives **three
  named sizes** rather than a continuous ramp nobody can interpolate.
- `the-basemap-gives-up-its-contrast` — the plate is quiet enough that every symbol reads against
  it.
- `an-overlap-accumulates-rather-than-occluding` — symbols are translucent and drawn largest first,
  so a small one is never buried and an overlap reads as an overlap.

**The symbol sits at the capacity-weighted centre of a country's own stations**, not at its
centroid: a country's fleet is where its plants are, and a centroid can land in an empty mountain
range.

## The camera, and why the gesture does not touch it

Lambert azimuthal equal-area measures (`camera.ts`); the baked MapTiler plate's own recorded corners
place. **The gesture below changes no camera and moves no place.** A zoom and a pan were available
and are refused here for the reason the map brief gives: they cost the framing this beat argued
for, and they are the same gesture eight map types would all reach for. Not one circle's `cx`/`cy`
changes in any state of this page.

## The interaction, written before the code

### What this type hides, and it is not what the other seven hide

A choropleth hides its class bounds. A cartogram hides the geography it sacrificed. A flow map hides
everything that is not the dominant flow. **A proportional symbol map hides the exponent of its own
size scale**, and that absence is worse than the others because it is invisible by construction:
the reader is looking at exactly the picture the author chose, the ranking is right, the biggest
circle is over the biggest country, and there is nothing on the page that could tell them the
spread between the circles was manufactured.

`map-beat/references/types/proportional-symbol.md` states the arithmetic in one sentence: *"don't
linear-scale the radius: a symbol's radius must scale with the SQUARE ROOT of the value, because
it's the circle's AREA the eye actually compares… This is not a style preference; it is a
mechanically wrong scale, and it is the difference between an honest bubble map and a misleading
one."*

**Three scale laws rank these 41 countries in exactly the same order and make three completely
different claims about how much bigger the biggest is.** Measured on this beat's own frozen file,
France against Greece, the country at the median of the 41:

| the law | the area the eye is shown | the truth | symbols under the legibility floor |
|---|---|---|---|
| area proportional to capacity | **24,5 fois** | 24,5 fois | **0** of 41 |
| radius proportional to capacity | **598,3 fois** | 24,5 fois | **16** of 41 |
| flattened area (cube root) | **8,4 fois** | 24,5 fois | **0** of 41 |

A still can do exactly one thing about that: pick a law, draw it, and ask to be trusted. A video and
a scrolly can do one thing more — show the author's own transition between two of them, on the
author's timing, in the author's chosen order. **Only a page can put the exponent in the reader's
hand and let them check the author's arithmetic against the author's own claim**, which is what this
one does.

### The gesture

**A three-option radio group, "L'échelle des aires", over the same 41 circles at the same 41
centres.** Native radios plus CSS generated at build time; no script, and the plate a reader without
JavaScript receives is the honest law with every mark, every label and every reading in it.

- **Aire proportionnelle** — the default, the law the claim is stated over, and the only law the
  vocabulary will accept as a default.
- **Rayon proportionnel** — the spreadsheet default the type sheet calls mechanically wrong.
- **Aire aplatie** — the flattering law a designer reaches for when the biggest circle swamps the
  map.

**What changes in the picture:** every circle's radius, and nothing else. No centre moves, no label
moves, no country moves, the camera does not move, and the biggest circle is pinned at the same
46 units in all three states — so the only cue that changes is the one the control names, and the
reader can see which of their neighbours grew or shrank around a fixed anchor. **The key's three
swatches re-scale with the map**, in fixed-size boxes so their words never travel: a size legend
that stayed put while the marks resized would be a legend that lies in two states out of three, and
the vocabulary refuses a page that ships one.

**The key is drawn INSIDE the map, at the map's own scale, and that is a correction.** It began as a
row above the plot, with each swatch's radius set in CSS pixels from the same count of viewBox units
the marks use. That is right in a cell rendered 1:1 and no cell ever is: measured at 1280×860, the
cell came to 570px for a 900-unit viewBox, so the 50 GW swatch was drawn at r=33px beside a France
of 96 GW drawn at r=29px — **the key's 50 GW circle was bigger than the map's 96 GW circle**, and a
reader calibrating France against it would have read the continent's biggest low-carbon fleet as
under half of what it is, off the one instrument this type has for turning an area back into a
quantity. The key is now a `-layer` child of `.chart-plot`, the format's own mechanism for a box
that shares the plot cell exactly and inherits `--cell-w`; every swatch is sized off that, so a
circle in the key is the size a mark of that value has on the map beside it, at every window size,
with no breakpoint. It also costs the page no height at all, which is what let the phone fit.

**The printed number does not move and does not change.** The five labelled countries carry their
GW figure at the centre of their own circle, in every state. Under the radius law the reader watches
the Royaume-Uni's circle lose a third of its radius while the "47" sitting in it does not budge —
the distortion and the datum in one glance, which is the whole argument in one image.

**It interpolates.** The radius travels as a `transform: scale()` about each circle's own fill box,
which is a real CSS property on an element that is always rendered — so the field re-sizes in
380 ms rather than jumping, and `cx`/`cy` never change, which is exactly what
`interaction.mjs` needs: it resolves the pointed mark off centres read once at initialisation, and
on this page those centres are constant in every state by construction.

### The second control, kept

Hovering, tapping or tabbing a circle still answers with the country, its GW, its share of the
continent, its station count and the water-and-atom / wind-and-sun split — the readings the plate
has no room for. Both controls are declared in `interaction`, and the render refuses the page if
either ships without a declaration or is declared without shipping.

## The vocabulary

**New: `skills/map-web/assets/area-scale.ts`** — *what the size of a mark is a function of*. Not one
of the sixteen chart vocabularies, and deliberately not a filter (nothing leaves), a stack (nothing
moves), a level (nothing is measured against anything) or a weighing (`weigh.ts` portions ONE ink
budget over marks whose sizes are then fixed; this file changes the LAW that turns a value into a
size, and the budget is the same in every state). It is a map file because the failure it guards is
a map failure: on a chart the encoding is a length recovered off an axis a reader can see, and a
symbol map has no axis at all.

It reuses `control-chrome.ts`'s drawing rather than copying a pill: the vocabulary hands the beat
its own chrome spec — one class stem and one measured note reserve — and the beat calls the one
place a directed control is drawn. Nothing about the chrome is written twice.

Its refusals, each verified by mutation, are listed in this beat's report.

## Verification

Rendered in all three filed directions and **looked at, in each of the three states** — the area
law, the radius law and the flattened law, screenshot after a real click on each pill.

Driven in a real browser, on the emitted HTML:

- **The format's own verifier** (`skills/chart-web/scripts/verify-web.mjs`, seven viewports,
  CDP-level pointer input): 99/89/89 checks pass in creme/nocturne/rapport. One failure stands, in
  creme only, and it is a false negative proven as one: *Open Sans 500 really DRAWS, not its
  fallback* measures the three key words — `50 GW`, `25 GW`, `10 GW`, six distinct characters,
  mostly digits — at 0,1px apart from Helvetica. The face is embedded, loaded and applied; measured
  at 100px the same string is 305,42px in Open Sans against 311,19px in Helvetica. The probe cannot
  separate two faces on a six-character digit sample at 10px. **It fails identically on the render
  committed before this work**, so it is not a regression.
- **The window fit**, which this beat failed: the figure overflowed its own `max-height: 100dvh` by
  35px at 375×812 in creme and by 53px in nocturne — whose display register sets this beat's
  60-character title in five 39px lines — with the plot already pinned at the format's 120px floor,
  so nothing below could give the height back. 0px of overflow now in all three directions at all
  seven viewports, and the plot cell grew with it: 646,6×491,5 → 777,1×590,6 at 1600×900, and
  157,9×120,0 → 256,2×194,7 at 375×812. (At 360×780, a width the format does not verify, nocturne
  still overflows by 44px. Named, not fixed.)
- **The plot cell carries its own viewBox ratio** to within 1,00000±0,00006 at every viewport in
  every direction — on a map an anisotropy is a false geography, not a style defect, and this
  beat's cell measured 2,107 before the trunk sweep, with every circle an ellipse.
- **No label overlaps another, in any state**: 0 overlapping pairs over 12 states (3 directions ×
  the default plus each of the 3 laws), measured on real client rectangles.
- **Every label sits at distance 0 from its own symbol's centre**, in the map's own units, in all
  12 states — anchor against `cx`/`cy`, and every `tspan` on the same anchor. (In CSS pixels the
  same labels measure ~1,6px off, which is the optical centre of a two-line block and not a
  displacement.)
- **Every family a text node names is embedded**, and **the chosen pill is a wash and a ring** —
  both by the verifier above.

**The vocabulary's refusals, by mutation.** Ten mutations, each breaking one thing
`area-scale.ts` claims to refuse, each run through the real runner; all ten go red AND exit
non-zero: the resting law must be the area law · a non-default law must carry its sentence · the
default law must carry none · a sentence must state the ratio its own law shows · an accessible
name must contain its visible one (WCAG 2.5.3) · the legibility floor must sit under the anchor · a
legend magnitude may not exceed the biggest datum · the stylesheet that separates the states may
not go missing · the legend must be tagged so it re-sizes with the marks · every drawn mark must be
a declared datum. The last three are read off the WRITTEN PAGE and no declaration-level check can
make them.

## Source

Global Power Plant Database (WRI) · MapTiler basemap, baked once per filed direction in that
direction's own tints. `stations.csv` and `shapes.geojson` are byte-for-byte copies of
`proof/static-proportional-symbol-europe-capacity/`.
