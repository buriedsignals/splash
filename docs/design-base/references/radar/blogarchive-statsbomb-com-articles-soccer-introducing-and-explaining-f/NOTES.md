# StatsBomb — Introducing and Explaining Fullback Radars (Philipp Lahm, 2012-13)

- url: https://blogarchive.statsbomb.com/articles/soccer/introducing-and-explaining-fullback-radars-sagna-debuchy-lahm-alves-and-more/
- archive: url-list
- type: radar — twelve spokes, one filled polygon over banded rings
- export: static raster (`img`, 800 × 933) inside an explainer article
- readAs: the graphic itself. `routes.pixel.measuredFrom = "graphic.png"`, `documentTop 2830`,
  `nearTheTop: false` — the harvester walked down the article to reach it.

## What it is

The 2014-generation StatsBomb radar, the same desk's earlier hand, kept here as the contrast case
to the Kane record. Philipp Lahm, Bayern Munich, 2012-13, 27.80 90s. Twelve spokes — PAdj Tackles,
PAdj Int, Passing %, Key Passes, Comp. Crosses, Crossing %, Successful Dribbles, Dispossessed,
Aerial Wins, Dribbled Past, Fouls — one closed polygon, filled, over concentric grey bands.

Beneath the plate, a **two-row numeric table** repeating every value in its own units
(`TK 3.3 · INT 2.71 · P% 89.67 · KP 1.51 · CC 0.97` / `Cros% 24.32 · SD 0.83 · DS 0.86 · AW 0.5 ·
DP 1.15 · FL 0.47`), with two entries picked out in green.

## What it does with information

**The chart and the numbers ship together.** Same discipline as the Kane plate, cheaper: a small
table under the radar so no reading depends on judging a radius. Where the later design spends half
the plate on distributions, this one spends four lines on a table — and the argument for both is the
same, that a radar alone is a shape.

**Every spoke prints its full scale, and the scale is not linear in value.** Along PAdj Tackles:
`4.11 3.81 3.52 3.22 2.92 2.63 2.33 2.03 1.73 1.44 …`; along Fouls the sequence runs the other way
(`0.44` at the outside, growing inward), because for Fouls and Dispossessed and Dribbled Past **more
is worse and the spoke is reversed**. Nothing on the plate announces the inversion. It is legible
only from the printed numbers — which is precisely why they have to be there.

**Two values are highlighted in green in the table, and nowhere else.** The plate's argument (Lahm's
passing and his low foul count) is carried by two coloured numbers, not by anything on the radar.

**Two accents at nearly equal weight, and they are not two series.** `#0B4295` at 8.49 % and
`#EC012C` at 8.44 % are Bayern's club colours used as fill and band alternately over a single
polygon. A reader who expects one colour per item on a radar will misread this at first glance; it
is club identity spent on a one-item chart.

**The label ring is set on a curve, one word per spoke, radiating.** Twelve labels around the rim,
each rotated to its own angle, mixed case.

## What it does with style

Measured on `graphic.png`: ground **`#FFFFFF` at 58.85 %** — this plate is far denser than the
Ferdio radar, because the polygon is filled and the bands are painted. The two accents are
**`#0B4295` at 8.49 %** (hue 216.1°) and **`#EC012C` at 8.44 %** (hue 349.0°); the classifier reads
the palette as `"diverging"`, which here is club colours rather than an argument about direction.
**`#00ADEF` at 0.31 %** is the third chromatic entry — the Opta wordmark bottom right, not chart
ink. `#E5022C`, `#0A3E8C` and `#E30431` are antialias neighbours of the first two.

The banded grid is a single heavy grey: **`#CDCDCD` at 14.17 %**, with `#F3F4F4` (0.65 %) and
`#D3D3D3` (0.59 %) behind it. Fourteen per cent of the plate is gridline. Against the Kane record's
5.67 % of `#DDDDDD` this is the visible generational change in one number: the later design lightened
its scaffolding by more than half.

**The type in this record is the article's, not the graphic's.** `style.graphic.tag` is `img`. The
tuples describe StatsBomb's blog — Barlow at 88/300 for the headline, 24/400 for body, 24/400 italic
for emphasis, 24/700 for `What the hell is a radar?`, 16/400 at 0.4 tracking uppercase for the
kicker — in `rgb(19,41,63)` / `rgb(35,42,49)` / `rgb(101,109,115)`, links `rgb(2,115,227)`. Measure
800 px / 67 ch.

## What is transferable

- **Print the value table under the radar.** The cheapest version of the Kane plate's idea, and it
  removes the "shape without a quantity" failure entirely.
- **Reverse a spoke whose direction of goodness is inverted — and then you must print its
  numbers**, because the reversal is invisible in the geometry.
- **Colour the one or two numbers that carry the argument**, in the table, not on the polygon.
- **What NOT to carry over**: two saturated accents on a single-item radar. Club identity is a real
  reason and it costs the reader the "one colour, one item" convention that every other radar in
  this family obeys. And 14 % of the plate spent on grey bands is more scaffolding than a
  twelve-spoke radar needs — the same desk's later work proves it.

## What was not verified

- **Whether the radial position is percentile or a linear map of each spoke's own range.** The
  printed sequences look evenly spaced in value per spoke, which suggests per-spoke min/max rather
  than percentile — the opposite of what the Kane plate appears to do. Not confirmed from the page's
  text.
- What the green highlight in the table encodes (best in a peer set? above a threshold?).
- Whether the red/blue alternation is a band pattern or a second data layer. Read as banding.
- **The lettering inside the graphic was not measured**; it is a raster.
