---
format: web
type: proportional-symbol
medium: map
grounding: supported
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
place. **The gesture below changes no camera and moves no place.** Not one circle's `cx`/`cy`
changes in any state of this page.

**And the LIVE BASEMAP added since is not that gesture and does not become it.** This brief used to
say a zoom and a pan "were available and are refused here", on the ground that they cost the
framing the camera argued for and that eight map types would all reach for the same one. The first
half was answered rather than overruled — the camera is bounded so that it cannot be zoomed out
past the published framing or pushed off the geography — and the second half was never an argument
against a reader being able to look closer, only against a beat calling that its editorial gesture.
The owner asked for it three times, in his own words, and the third time he named the mechanism:
*"utilise les vrais controls de maptiler pas des controls extérieurs"*. It is a SUPPLEMENT: the
page a reader without JavaScript receives is the same complete plate it was, with no dead control
on it, and the exponent below is still the only thing this beat argues.

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

## The basemap the reader may move, and it is a real one

**`skills/map-web/assets/live-basemap.ts`** — a second new map vocabulary, and the shared one: the
BASEMAP IS ALIVE. Under this beat's own drawing there is a real MapTiler map carrying MapLibre's
own `NavigationControl`, its own drag, its own wheel, its own pinch and its own keyboard. It is
wired here first and belongs to every map type that HAS a basemap.

**This replaces a rail of bespoke buttons, and the replacement is the owner's own instruction.** The
rail (`navigate.ts`) moved the `<svg>`'s viewBox from three buttons of ours over a baked plate. He
refused it in one line — *"utilise les vrais controls de maptiler pas des controls extérieurs"* —
and the machinery for the alternative already existed and had already been ruled on: R1
(2026-08-10), *"la carte doit rester interactive tout le temps sinon il n'y a pas d'intérêt d'être
sur le web si on peut pas naviguer dedans"*, and the two layers `skills/map-web/assets/live-map.mjs`
answered it with. The directed `proof/web-*` map beats were built plate-only and silently dropped
that; this is the regression closed, on one beat, for him to validate before it reaches the other
seven.

**TWO LAYERS, and layer 1 is untouched.** Layer 1 is the SSR'd beat exactly as it rendered: the
baked plate as a data URI, the marks, the labels, the key, the whole editorial gesture in generated
CSS with no script at all. Layer 2 is a live MapTiler map revealed ONLY on `map.on("load")`. A style
failure, a tile failure, a rotated key, no network at all: layer 1 stands. That last case is not
decoration — MapTiler invalidates ALL of an account's keys at 100 % of its spending limit, so the
failure mode is every published article's map going blank at once. **Measured on the committed
artifact**, which carries the delivery placeholder rather than a key and therefore never boots:
`mw-live` false, the three `[data-plate]` elements `inline`, and all three scale laws working.

**ONLY THE BASEMAP IS SWAPPED, and that is a better arrangement than the one it copies.**
`live-map.mjs` swaps the WHOLE fallback away and re-draws the marks as MapLibre layers with an HTML
overlay for the labels — one mark, two halves, two mechanisms, which is the defect its own header
names twice. This beat cannot afford it anyway: the exponent control is `:checked` plus generated
CSS over SSR'd SVG, and no stylesheet can reach a MapLibre circle layer. So the marks, the labels,
the hit targets and the key stay ONE drawing in ONE `<svg>`, in both layers, and what moves is the
window.

**The window IS the `<svg>`'s own `viewBox` — now driven by the live camera instead of by buttons.**
That is the whole answer to the trap this tree has paid for three times. `interaction.mjs` resolves
the mark under a pointer from `cx`/`cy` read ONCE at initialisation, and no CSS transform updates
those. The radar answered it by keeping every vertex at the same coordinate in every state; the
diverging stacked bar by baking one hit plate per state. Neither transfers to a CONTINUOUS camera,
but the principle under both does: **what answers must be at coordinates that are still true.** The
plate was baked through `map.project()`, so its frame is linear in Web Mercator, and a live MapLibre
camera at zero bearing and zero pitch is too — the visible rectangle is an EXACT affine image of the
drawing's box, computed from `map.unproject()` on two corners. Not one `cx`, not one `cy`, not one
label anchor changes, and `getScreenCTM()` is derived from the viewBox at the moment it is called.

**What must not follow the plane is counter-scaled about its own centre.** Every symbol, every label
and every hit target sits in a `data-map-fixed` group whose `transform-origin` is that mark's own
`cx cy`; `--live-inverse` scales it by the window's own fraction. The centre is the FIXED POINT of a
scale about itself, so the coordinate the resolver compares against does not move by construction
rather than by care, and the vocabulary refuses a page where any such group is scaled about
anything else.

**On this type the counter-scale is not a style rule.** This is `live-map.mjs`'s `camera` radius
behaviour, and on a proportional symbol map it is not a preference: a circle encodes a VALUE, so it
holds its SCREEN size as the reader zooms, because the same number must not mean two things at two
zooms. The key is drawn outside the plate's coordinate system, in the cell's own CSS pixels; a mark
that grew with the camera would leave the key stating a scale the map is no longer drawn in — which
is, to the tenth of a factor, the defect this beat had just finished repairing. **Measured on the
emitted page at 1512×860**: France's mark is 149,60px across at the published framing, at zoom +1,0,
at zoom +1,50 after a wheel, after a drag, and after the return; the three swatches are
107,88 / 76,27 / 48,24px in every one of those states. And the key is EXACTLY true, not merely
stable: 149,60 × √(50/96) = 107,9px, against a measured 107,88px.

**ONE BASEMAP, NOT TWO.** The beat draws a vector `land` path over the plate, which is the doubled
basemap `style.mjs`'s own `assertNoDoubledBasemap` refuses — invisible only because the plate and
the path were captured through the same camera, and false the moment a reader zooms past the plate's
own pixel density. Live, the water backstop, the plate image and that path all carry `data-plate`
and give way to MapTiler's own ground, tinted by the SAME `styleDecisionFor` the bake used. Two
applications of one rulebook, never two rulebooks — and `style.mjs` travels into the page as source
so there cannot be a second copy of its regexes.

**ONE RESOLVER, AND THE POINTER GOES TO THE MAP.** The drawing sits over the canvas, so with its own
pointer-events on it would swallow every drag and every wheel before MapLibre saw one — a map you
can only pan where you are not pointing is not a map with native controls. So the whole drawing
gives up the pointer while live and the map receives everything natively; the hover is kept by
RELAYING the pointer's own client position onto the drawing's `.hit-area`, which is the one resolver
`interaction.mjs` already has. Nothing is resolved twice and no second set of coordinates exists.
A tap relays the `click` rather than the `pointerdown`, because the document-level pointerdown
clears the box and would arrive after it.

**The two bounds are derived, not typed.** The FLOOR is the published framing: the plot cell carries
the plate's own ratio by construction, so the recorded corners fit the container exactly and there
is only ONE window at that floor — the one the newsroom published. `maxBounds` then makes zooming
out past the argued frame and pushing the geography off it the same clamp rather than two rules that
could disagree. (`live-map.mjs` warns that `maxBounds` cropped a claim by raising the minimum zoom;
here the plate's box and the container's box are the same box, so it cannot.) Measured: floor
3,7622, fitted 3,7627, and twelve presses of MapTiler's own zoom-out land back on a viewBox of
`0,29 0 899,71 684` with every mark at its resting size. The CEILING is a country: 900 drawing units
divided by the 170 the subject of the claim occupies, **+2,41 zoom levels — a factor of 5,30** — so
the window is never narrower than France.

**The cost, said rather than found.** The key is furniture pinned to the CELL, not to the map, so a
reader who pans can bring a mark or a label underneath it; it stays legible (opaque, in the ground,
with its own edge) and the reader can pan back. A key that moved to get out of the way would be
exactly the label the owner refused twice for moving with no visible reason. Inlining MapLibre and
its stylesheet roughly doubles the page — 688 KB to 1,56 MB on nocturne — and that is the stated
price of R1: a `<script src>` would trade the payload for a SECOND third-party host, and one
(api.maptiler.com) is the honest reading of the ruling. And `data-hit="cell"` resolves to the
NEAREST centre, so at the ceiling a pointer far from every visible mark still answers about one;
that is the beat's own design, unchanged, and it is louder when few marks are on screen.

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

**The live basemap, driven in a real browser on the emitted page** (nocturne, 1512×860, a real
MapTiler key substituted into a scratch copy that never goes near the repository — the committed
artifact carries the placeholder and is verified separately, below).

- **The controls are MapTiler's own**: two buttons, `maplibregl-ctrl-zoom-in` and
  `maplibregl-ctrl-zoom-out`, named "Zoom avant" and "Zoom arrière" through MapLibre's own `locale`.
  **0 buttons of ours anywhere on the page.**
- **Every gesture is native and every one answers**: a real click on the native zoom-in (3,7627 →
  4,7627), a real wheel (→ 5,2659), a real ten-step mouse drag (centre 8,50°E → 13,06°E), and the
  keyboard on MapLibre's own canvas (ArrowRight moved the centre 1,83° east; `+` zoomed to 6,00).
  The viewBox follows each one exactly: `0,15 0 899,71 684` → `225,07 171 449,85 342` →
  `345,37 251,36 317,40 241,30`.
- **The trap, at every mark that is on screen AND in the window**: **40/40** at the published
  framing, **6/6** after one zoom, **5/5 after a zoom of 5,27 AND a drag**, **10/10** after the
  return — each probe a real pointer moved onto the mark's own live client position, answered by
  that mark's own reading. (The first run of this probe scored 10/41 and the defect was in the
  PROBE: the figure is taller than a 860px window by the full-width arbitrage, so a mark can be on
  the map and off the screen. Named because a probe that measures nothing looks exactly like a page
  that answers nothing.)
- **The key stays true at every zoom**, which on this type is the whole reason the counter-scale
  exists: France 149,60px and the swatches 107,88 / 76,27 / 48,24px in all five camera states, and
  149,60 × √(50/96) = 107,9px against a measured 107,88px.
- **The editorial gesture is untouched by the live layer**: the three laws measured through the live
  map give France-against-Grèce area ratios of **24,46 / 598,26 / 8,43** — the same three numbers
  this brief states — with the key re-scaling under each, and identical on the committed unkeyed
  page (24,46 / 598,25 / 8,43).
- **Script off, all three directions**: the viewBox is the published `0 0 900 684`, `--live-inverse`
  is 1, the three `[data-plate]` elements are `inline`, the live box is `visibility: hidden` with
  **0 canvases and 0 MapLibre controls**, the hint computes to `display: none` and 0px of height,
  the map carries no `tabindex`, and the tab order is **44 stops: 3 radios and 41 marks** — no dead
  control on the screen and none in the tab order.
- **The delivery placeholder is substituted exactly once**, in the plan's own JSON and not in the
  script — the script assembles its sentinel from two halves, which is the trap `live-map.mjs`
  records (a literal would be rewritten to the key itself and every delivered map would refuse to
  boot).
- **`prefers-reduced-motion`** is MapLibre's own: the library checks it in `Camera.easeTo` and
  disables the flight. Nothing here emits a second clock — `[data-map-fixed]` carries
  `transition: none` and the refusal for it — because the camera and the viewBox move in one frame.
- **The format's own verifier**: **92/82/82 checks pass** in creme/nocturne/rapport, and the
  failures are **identical in kind and smaller in size than on the render committed before this
  work**: five "the whole beat is inside the window" (the accepted cost of the width-driven cell —
  overflow 2040/835/742/636/425px against the baseline's 2041/850/757/651/454px) plus the two creme
  typeface false negatives already named above. No new failure.

**The vocabulary's refusals, by mutation.** Sixteen mutations on `live-basemap.ts` and the beat that
calls it, each breaking one thing it claims to refuse, each run through the REAL runner: a subject
as wide as the whole drawing (no ceiling left) · a typed zoom ceiling · a basemap whose sea and
ground are one colour · MapLibre's own controls left unnamed · an accessible description of three
words · the fallback plate untagged · the plate hidden with no script to replace it · the plate
never hidden at all · a mark counter-scaled about the frame's corner instead of its own centre · the
counter-scale dropped so a mark grows with the zoom · a second clock given to the marks · no resting
value for the counter-scale · a script that never writes the window · MapTiler's own control never
added · a bespoke rail shipped beside it · `mw-live` baked into the markup · the live style applied
without asserting it answered · the style sweep handed in with its `export` keywords intact. **All
go red AND exit non-zero.**

Ten mutations on `area-scale.ts`, each breaking one thing
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

---

# Addendum, 2026-09-15 — every mark is a MapLibre layer

The owner validated `proof/web-choropleth-europe-lowcarbon/` as THE PATTERN for a web map beat
(`MAP-WEB-BRIEF.md`, « LE PATRON VALIDÉ », « là c'est top »). This beat is its second application,
and the two rulings it rests on were given **on this beat's own renders**: *« la map doit prendre
toute la largeur quitte à afficher plus de map… avec web on peut avoir des contrôles, zoom,
déplacement et hover en plus directement dans MapTiler »* and *« oui une carte MapLibre plate pas un
globe »*.

Everything the sections above argue is still true. What follows is what changed underneath them.

## What the page is now

- **The 41 circles, the 5 labels and the mark under the pointer are three MapLibre layers**
  (`skills/map-web/assets/live-symbols.ts`, new), over MapTiler's own tiles. There is no SVG drawing
  of the field any more, and therefore no `viewBox`, and therefore nothing to arbitrate about the
  width the map may take: **the map fills the figure's whole track.**
- **Zoom, drag, wheel, keyboard and hover are MapTiler's own.** Two `NavigationControl` buttons,
  named through MapLibre's `locale`; the pointer resolved by `queryRenderedFeatures` on the circle
  layer, never by a collision test of ours — so no coordinate is read once at initialisation and the
  trap this tree has paid for three times is closed by construction.
- **Two layers, always.** Under the live map, a **photograph of this page's own live map**, taken by
  the runner at the review window and frozen to webp. It is what stands there when the key lapses,
  when the tiles fall over, when there is no network — and MapTiler invalidates every key on an
  account at 100 % of its spending limit, so that failure mode is "every published map goes blank at
  once". It is also what the committed artifact always shows: the key never enters a file here.
- **The keyed copy for review** is `renders/<direction>.local.html`, written by the runner from
  `.env` and git-ignored by `proof/**/renders/*.local.html`.

## The gesture, and what the architecture cost it

The exponent is still the gesture, and it still runs over the same 41 values with the anchor pinned.
But **no stylesheet reaches a MapLibre circle layer**, so the gesture is now two halves driven from
one set of radii:

- the MAP's half is script — one `setPaintProperty("circle-radius", ["*", <match expression>,
  scale])` per law, the expression built at BUILD time;
- the TABLE's half is the CSS it always was — the 41 row swatches and the 3 legend swatches, native
  radios plus generated rules, working with JavaScript off exactly as before. The swatches are the
  map's own circles at **27,5 %**, which the caption says out loud: the anchor is pinned under every
  law, so a common factor cancels and every ratio between the rows is untouched.

`assertOneAreaScale` holds the markup's half against the declaration; the new
`assertSymbolLawsReachTheLayers` holds the plan's half against a **third** derivation of the same
exponent over the same raw values — never against the object the plan was built from, which is how
the choropleth's own guard passed a mutation green.

## The radius rule, and the key

`shared/map-beat/mount.mjs` names the three things a radius can mean. A circle that encodes a VALUE
is `radius: "camera"`: **derived from the camera at the fit, then held in screen pixels while the
reader zooms**, because the same capacity must not mean two circles at two zooms. A dot-density dot
would do the opposite. The plan declares which, and `assertSymbolLawsReachTheLayers` refuses any
circle layer that declares anything else.

The radii travel in **CSS pixels at a declared review camera** (1464 × 520) rather than in the
plate's frame units. That is a departure from `mount.mjs`'s own arithmetic and the reason is the size
legend, which is HTML outside the canvas: the script multiplies the marks AND the swatches by one
number, and with no script at all the swatches fall back to a fraction of the map box's own HEIGHT —
the axis this fit binds on, asserted in the runner — so they track the same ratio the frozen
photograph is scaled by. **Measured: the legend swatches are 25,95 / 18,35 / 11,60 px with script
and 25,95 / 18,35 / 11,60 px without it, and unchanged after a zoom.** This beat shipped the other
thing once: a swatch radius counted in the drawing's own viewBox units and drawn at 1:1 CSS pixels
in a cell that renders at no such ratio, over-stating every magnitude by about 2×.

## The labels, and who decides them now

The SVG build placed five labels at five centres and measured **0 overlapping pairs across 12
states** by hand. A MapLibre `symbol` layer with `text-allow-overlap: false` decides it instead, and
it decides it the owner's way: a label is anchored on its own mark (`text-anchor: center`, no
variable anchor), so it is drawn there or not at all and nothing ever travels.

**Measured on the rendered page with `queryRenderedFeatures`, which answers only for symbols
actually placed: 5 of 5, in all three directions, at the published framing.** MapLibre drops nothing
here.

The face is MapTiler's own glyphs, and it is **probed rather than named**: MapTiler answers 200 with
Noto Sans for any family it does not serve. `Open Sans Bold` (creme, rapport) and `Montserrat Bold`
(nocturne) both came back with bytes that are not Noto's.

## What Web Mercator costs THIS subject

The choropleth prints its own number because a choropleth's mark IS the ground. **A proportional
symbol's mark is not**: a radius held in screen pixels is immune to the projection, and the ratio of
any two marks is exact at every latitude. So the distortion here falls on the LAND UNDER the
circles, which is the second reading every reader of a symbol map takes anyway — "how big is this
circle for the size of its country".

Measured on this beat's own frozen shapes, at the review camera, over the rings the frame actually
draws, Russia set aside (it is most of the land the frame can carry and only a slice of it is in
view):

| | share of the DRAWN land | share of the REAL land |
| --- | ---: | ---: |
| Norvège + Suède + Finlande | **31,2 %** | **16,3 %** |

Per km² against France = 1: **Norvège ×2,57 · Suède ×2,29 · Finlande ×2,58 · Islande ×2,64.**

The caveat carries it, derived and never typed, and the runner refuses the sentence if the
measurement stops making it true.

## The box, against the pattern's own

At 1512 × 860, measured on the keyed page opened from disk:

| | this beat | the pattern |
| --- | ---: | ---: |
| map box | **1464 × 468** (creme 451, nocturne 469,7) | 1464 × 519,6 |
| document | **860** | 860 |

The document fits the window in all three directions and nothing scrolls sideways. The map is 50 to
69 px shorter than the pattern's because this beat's furniture is taller: it carries a fieldset, a
reserved three-line note row (so choosing a law never moves the map — the owner's first standing
arbitration) and a disclosure summary, where the pattern carries a legend strip.

**What the wide box costs in ground: the frame shows 180° of longitude for a declared window 67°
wide.** That is the arithmetic of a near-square study set in a 2,8:1 stage, and it is the same price
the pattern pays (186°).
