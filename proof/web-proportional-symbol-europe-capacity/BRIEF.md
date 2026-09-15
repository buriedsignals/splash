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
place. **The gesture below changes no camera and moves no place.** Not one circle's `cx`/`cy`
changes in any state of this page.

**And the navigation added since is not that gesture and does not become it.** This brief used to
say a zoom and a pan "were available and are refused here", on the ground that they cost the
framing the camera argued for and that eight map types would all reach for the same one. The first
half was answered rather than overruled — the window is bounded so that it cannot be zoomed out
past the published framing or pushed off the geography, and the return control is named in words —
and the second half was never an argument against a reader being able to look closer, only against
a beat calling that its editorial gesture. The owner asked for it twice, in his own words, and it
is a SUPPLEMENT: the page a reader without JavaScript receives is the same complete plate it was,
with no dead control on it, and the exponent below is still the only thing this beat argues.

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

## The window the reader may move

**`skills/map-web/assets/navigate.ts`** — a second new map vocabulary, and the shared one: what a
reader may do to the WINDOW. Zoom, zoom out, drag, arrow keys, and a return named in words. It is
wired here first and belongs to every map type after it.

**The window IS the `<svg>`'s own `viewBox`, and that is the whole answer to the trap this tree has
paid for twice.** `interaction.mjs` resolves the mark under a pointer from `cx`/`cy` read ONCE at
initialisation, and no CSS transform updates those. The radar answered it by keeping every vertex
at the same coordinate in every state; the diverging stacked bar answered it by baking one hit
plate per state at that state's own coordinates. Neither transfers literally to a CONTINUOUS
navigation — there is no finite set of states to bake a plate for — but the principle under both
does: **what answers must be at coordinates that are still true.** So the coordinates are made
invariant and the movement is put into the coordinate system itself. `getScreenCTM()` is derived
from the viewBox at the moment it is called, so the client → user-space mapping is live for free
while every `cx` and `cy` on the page is the byte it was at build time. Measured rather than
assumed, on a probe page: `getScreenCTM()` carries a CSS transform on the `<svg>` and on an
ANCESTOR of it, and does NOT carry one on an inner `<g>` — which is why the mechanism is the
viewBox and not a transform over the drawing.

**What must not follow the window is counter-scaled about its own centre.** Every symbol, every
label and every hit target sits in a `data-nav-fixed` group whose `transform-origin` is that mark's
own `cx cy`; `--nav-inverse` scales it by 1/k. The centre is the FIXED POINT of a scale about
itself, so the coordinate the resolver compares against does not move by construction rather than
by care, and the vocabulary refuses a page where any transform between the `<svg>` and a `.pt` is
anything else.

**On this type the counter-scale is not a style rule.** The key is drawn outside the plate's
coordinate system, in the cell's own CSS pixels. A zoom that enlarged the marks would leave the key
stating a scale the map is no longer drawn in — which is, to the tenth of a factor, the defect this
beat had just finished repairing. Measured on the emitted page at 1280×860: France's mark is
125,94px across at 1,0 and 125,94px at 4,0, and the three swatches are 90,78 / 64,19 / 40,59px in
both. The same counter-scale is what keeps the labels honest: they keep the size the register set
and their anchors travel with the zoom, so the distance between any two is multiplied by the scale
and a zoom can only ever RESOLVE an overlap, never create one. 0 overlapping pairs at 1,0 and at
4,0, measured on real client rectangles.

**The two bounds are derived, not typed.** The FLOOR is the published framing: the window keeps the
view box's ratio and is clamped inside the camera's box, so at scale 1 exactly one window fits and
it is the one the newsroom published — zooming out past the argued frame and panning off it are the
same clamp rather than two rules that could disagree. Measured: forty arrow presses into the
north-west corner land on `0 0 225 171`, sixty into the south-east on `675 513 225 171`, and ten
presses of zoom out land on `0 0 900 684` exactly. The CEILING is a country: 900 drawing units
divided by the 170 units the subject of the claim occupies, **5,30**, so the window is never
narrower than France and a reader who has come close enough to see where inside it the
capacity-weighted centre falls can always still see the whole country around it.

**The cost, said rather than found.** The key is furniture pinned to the CELL, not to the map, so a
reader who pans can bring a mark or a label underneath it; it stays legible (it is opaque, in the
ground, with its own edge) and the reader can pan back out. A key that moved to get out of the way
would be exactly the label the owner refused twice for moving with no visible reason. And the plate
is baked: past roughly its own pixel density the sea tint softens. On this beat the land is a
vector path drawn over the plate, so the geography a reader actually reads stays sharp at 5,30 and
only the water does not.

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

**The navigation, driven in a real browser on the emitted page.**

- **The trap, at every mark that is on screen**: 41/41 at the published framing, 20/20 after one
  zoom, **7/7 after a zoom of 4,0 AND a drag**, 41/41 after the return — each probe a real pointer
  moved onto the mark's own live client position, answered by that mark's own reading.
- **Script off, all three directions**: the rail and its sentence compute to `display: none` and
  0px of height, the map carries no `tabindex`, the viewBox is the published `0 0 900 684`,
  `--nav-inverse` is 1, and a Tab walk goes straight from the law's radios to the marks — no dead
  control on the screen and none in the tab order. (`[hidden]` is a UA rule and the chrome's own
  `display: flex` is an author rule, so the vocabulary emits the author rule that makes the
  attribute real, and refuses a page without it.)
- **Keyboard alone**: arrows pan, `+`/`-` zoom, `0` returns; the map's own keydown answers only
  when the map ITSELF is focused, so the 41 marks keep the arrow walk they already had. Reaching
  the return control by forward Tab from the map costs **46 stops** (the 41 marks sit between), two
  by Shift-Tab, and none at all with `0` — which is why the keys are in the map's own accessible
  description.
- **`prefers-reduced-motion`**: 5 distinct frames during a flight under `no-preference`, 1 under
  `reduce`, both landing on the same window. The displacement stays and only the animation goes.
  **This shipped wrong first**: the resting `--nav-travel-ms: 0` was emitted AFTER the query that
  raises it, and two rules of equal specificity are settled by order, so every reader got zero.
  Caught by counting frames, not by looking; there is now a refusal for the order.
- **The focus ring shipped wrong too**: a plain mouse drag left `:focus-visible` false and the
  outline 5px wide — Chrome's own `outline: auto` on `:focus`, which this page had never turned
  off. The map came away from a DRAG wearing the ring that means "the keyboard is here".
- **The format's own verifier**, re-run on the navigated page: 92/82/82 checks pass in
  creme/nocturne/rapport, with the same two creme typeface false negatives named above and nothing
  else. (The six "the drawing takes the whole track" failures the committed render carried are gone
  — the trunk's width-driven cell landed under this work.)

**The vocabulary's refusals, by mutation.** Twelve mutations on `navigate.ts` — the ceiling
collapsing to 1 · an announce dropping its own visible words (WCAG 2.5.3) · a return named in one
word · a first press that lands on the ceiling · an arrow press that throws the window away · a
rail shipped visible · the `[hidden]` rule dropped · a hit target counter-scaled about the frame's
corner instead of its own centre · the counter-scale dropped so a mark grows with the zoom · a
second clock given to the marks · the two travel rules emitted the wrong way round · a script that
never writes the viewBox — each run through the real runner; **all twelve go red AND exit
non-zero**, and none stayed green.

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
