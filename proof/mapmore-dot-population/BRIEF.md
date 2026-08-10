---
size: landscape
type: dot-density
---

# Beat — five countries hold 54.9% of this map's population

**Type:** dot density. **Medium/genre:** map / static. **Size:** landscape (1920 × 1080), over an
860 × 760 baked plate (`plate/`, frozen beside this brief).

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize`. It used to say "article web", checked by
nothing, while the component carried `FRAME_WIDTH = 920` and derived the height from its own plate —
so the frame followed the plate and a journalist pinning a size at gate 2c reached nothing.

## What each size does with this geography

The plate is 860 × 760 (1.132:1) over 59.5° of longitude, and the map is drawn at the plate's own
aspect at every size — never stretched, never cropped (`mapStageBox`). The title spans the content
width at the top and the credit spans it at the foot; what is left between them is what the map and
the text column divide.

| size | delivered | the map | leftover |
| --- | --- | --- | --- |
| landscape 1920 × 1080 | **yes**, measured 1920 × 1080 from the PNG's own IHDR | 809 × 714, plate ×0.941 | 871 px of column |
| square 1080 × 1080 | refused | — | — |
| portrait 1080 × 1920 | refused | — | — |

Nothing is letterboxed at landscape: the plate is bound by HEIGHT in a 1750 × 714 body band, so it
takes 809 × 714 and the 871 px left on the other axis is the text column. `--size square` and
`--size portrait` reproduce the refusals below and write to `sizes/`, never over the delivered file.

Both refusals are the type floor's, not the geography's, and both are enormous rather than marginal:

- **square** — the 36 px floor puts the title at 5 lines and the credit at 3, leaving **324 px** of
  band for everything else. The column's three blocks need **2,043 px** at the 266 px this beat's
  own longest unbreakable word allows; stacked at the full 936 px they still need 1,068 px, which
  leaves **−846 px** of map.
- **portrait** — the same, inside Meta's 979 px safe band rather than the whole frame: **223 px** of
  band, **1,578 px** of column, **−947 px** of map.

The caveat is what makes the column that tall, and it is not a line to drop: it names the exclusions
an absence would otherwise read as a zero, and it carries the projection sentence below.

## What the projection does to this encoding, and where that is written

A dot is a fixed number of people in a fixed piece of GROUND, so how much paper a piece of ground is
drawn on is part of the measurement — and Web Mercator's is not constant. Computed from the plate's
own `frameCorners` (36.0°N → 67.0°N), the area bias is **×4.29**: one drawn square covers 4.3 times
more ground at the top of the frame than at the bottom, so the same people per square kilometre are
drawn 4.3 times more thinly in the north. The same figure `every-extent-band-is-produced.test.ts`
records for this beat, derived rather than copied from it.

That sentence is now **on the frame**, in the caveat, and in the alt text, which previously said "a
tighter fill means more people per square kilometre" without the qualifier that makes it true. It is
also mechanically held there: `assertProjectionIsDisclosed` (`geo-dot.ts`, the shape of `geo.ts`'s
own `assertAreaEncodingIsHonest`) refuses to draw a caveat that mentions neither Mercator, the
projection nor latitude — checked BEFORE the layout, because the temptation a fixed frame creates is
to shorten the caveat until the column fits.

## What the bigger frame broke, and what it cost

**The dot radius.** The plate is no longer drawn 1:1, so the dots scale with it: at ×0.941 the
uniform radius is 1.08 px. That is capped at **half the drawn field's own median nearest-neighbour
gap** — measured 3.35 px, so a ceiling of 1.68 px, and the drawn radius sits at 64 % of it
(`markRadiusCeilingPx`, the median rather than the minimum because one pathological pair of dots
inside Malta would otherwise shrink all 2,996). The ceiling is also re-measured out of the delivered
markup by `assertDrawnDotsStillReadAsDots`, and a plate too small for a 1 px disc is refused outright
with the arithmetic (below ×0.564 of the plate, 485 px).

**The five country name plates, which is what only looking could see.** Each name used to be centred
on its own country's dot centroid — safe at 12.5 px, where the plate was ~80 px wide. At the 26 px
floor the same plate is 2.3× wider, and a centroid is not a place. The position is now derived over a
7 × 7 ladder across each country's own dot cloud, maximising how much of the box stands on the ground
it names, under one constraint: **no plate may erase more than a sixth of the dots of a country it
does not name.** Measured, the constraint is doing real work — unconstrained, "Germany" erases 26 of
the Netherlands' 90 dots (29 %, out of the second-tightest fill on this map, which the alt text
names) and "United Kingdom" erases 21 of Ireland's 27 (78 %). Delivered, they erase 16 of Poland's
184 (9 %) and 4 of Ireland's 27 (15 %). Two other shapes of rule were tried and both walked the names
into the sea, because water hides no dots.

**Named, not fixed:** the five plates still erase **421 of the 2,996 dots**, 14 % of the field, of
which only 22 belong to a country the plate does not name. That is the type floor's own arithmetic —
the plate under a name is opaque for the measured reason below — and whether a dot map at this size
should label its subjects some other way is a person's call.

## Claim

More than half the population on this map lives in just five countries — **Germany, the United
Kingdom, France, Italy and Spain** — which together hold **327,522,303 of 596,770,599 people, 54.9%**.
Four countries would not do it, so five is the smallest set that clears half.

## Data

- Source: World Bank Open Data, indicator `SP.POP.TOTL` (population, total), 2023.
- `population-europe-2023.csv`: **42 rows**, `Code, Country, Year, Population`, every row Year =
  2023.
- `countries.geojson`: the matching shapes; the render script asserts the join is total in both
  directions — no shape without a population, no population without a shape.
- Russia is **not** in the file, deliberately: its population figure covers the whole
  transcontinental country while almost none of its territory falls inside the frame, so scattering
  its dots into the visible sliver would misstate both the sliver and the European picture. Seven
  micro-territories with no independent World Bank figure (Åland, Guernsey, Isle of Man, Jersey,
  Monaco, San Marino, Vatican City) are likewise absent. Both exclusions are named on the frame.

## Exact values — computed 2026-08-09 from `population-europe-2023.csv`

| Country | Population | Cumulative share |
| --- | --- | --- |
| Germany | 83,287,273 | 13.96% |
| United Kingdom | 68,526,000 | 25.44% |
| France | 68,372,286 | 36.90% |
| Italy | 58,984,216 | 46.78% |
| Spain | 48,352,528 | **54.88%** |

- Map total: **596,770,599**. The five are also, in this order, the five largest — the ranking is
  not asserted, it is what sorting the file produces.
- **Four is not enough: Germany + UK + France + Italy = 46.78%.** Five is the minimum, which is what
  makes "just five" the right words.
- Next in line: Ukraine 37.7M, Poland 36.7M. Smallest four: Iceland 385,663, Andorra 80,856, Faroe
  Islands 54,398, Liechtenstein 39,846.
- The render chooses the dot value from the total rather than typing it: **1 dot = 199,000 people**,
  **2,996 dots** drawn for 596,770,599 people — and the committed `render/static.svg` contains
  exactly **2,996 `<circle>` elements**, so the legend's own arithmetic and the drawing agree.

## Subject and accent

One accent, `#0072B2` (Okabe-Ito blue), on every dot — a dot map has one mark type and one meaning,
so a second hue would invent a second variable. The five subject countries are picked out by direct
labels on their own clusters, not by a different colour: the claim is about which clusters are
biggest, and recolouring them would beg its own question.

**The study area is a TINT, at 0.16, and both halves of that are load-bearing.** It shipped as an
opaque `#F0F0F0`, which failed twice over. Against the plate's own unpainted land it measured **2.44
ΔE76 and 1.064:1** — so "counted in this map's 596,770,599" and "not in this map at all" (Russia,
Turkey, north Africa) were the same colour, and a country with too few people to show a dot was
indistinguishable from one that was never in the total. And being opaque it swallowed the basemap's
inland water: Vänern, Vättern, Mälaren, Saimaa, Päijänne, Balaton, the IJsselmeer, Lough Neagh and
Lake Geneva all rendered as study land, and Lake Peipus was drawn half land (Estonian side) and half
water (Russian side) in one frame. At 0.16 the same two now read **14.11 ΔE76 and 1.454:1** apart,
and a lake under the tint renders `#8FA9BC` — 11.75 ΔE76 from open water against 20.37 from the land
it sits in, so it reads as water. Peipus is water on both sides, with the border still drawn across
it, which is what the border does.

**What it costs, and the floor it is held to.** Darkening the study area costs dot contrast
(**4.55:1 → 3.33:1**) and moves the study land toward the sea (**22.00 → 16.18 ΔE76**, nearer than
the bare plate's own 23.77). The first is held above WCAG 2.2 SC 1.4.11's 3:1 for a non-text
graphical object; the second is legal only because this beat draws its coast as a line, and that
line — `#616161` at 0.6px — measures 3.98:1 against the fill and 3.58:1 against the water. Both are
checked at render by `assertStudyAreaReadsApart` in `geo-dot.ts`, which fails the run rather than a
test. The shading is now named in the legend for the same reason `geo-discipline.md` rule 7 makes a
beat name its no-data colour: an unshaded country must not be left to read as an empty one.

## Hierarchy of the proof

1. The mass of dots itself — the pattern before any label.
2. Five direct labels on the five clusters the title names.
3. The dot-value legend, which turns an impression back into a number: 1 dot = 199,000 people.
4. The caveat, which is longer than the legend on purpose (see below).

## Anti-patterns for this case

- **A dot is not a place.** Each dot's position within its country is random; the caveat says so on
  the frame. Without that sentence a reader will read a cluster edge as a settlement.
- Do not put the dot value in a footnote. A dot map with no stated dot value is an impression, not a
  measurement, and the legend carries "1 dot = 199,000 people — 2,996 dots drawn for 596,770,599
  people" in full.
- Do not silently drop an entity. Russia and the seven micro-territories are named, with the reason,
  because an absence on a map reads as a zero.
- **Do not let a count read as a density.** Dots are placed uniformly at random inside each country,
  so on-screen dot density is population per unit area — a different quantity from the one the
  title is about. See the defect below.

## Defect found while deriving this brief — CORRECTED 2026-08-09

**The alt text asserted a density claim the data contradicts.** It read: "The densest, most
continuous clusters sit over Germany, the United Kingdom, France, Italy and Spain." Because dots are
scattered uniformly inside each country, drawn density IS population per unit area — a different
measurement from the one the title makes.

Measured on the plate itself (`fillTightness()` in `geo-dot.ts`: dots per 1,000 drawn pixels, holes
subtracted, ranked densest first), the tightest fills are **Malta 438.0 · Netherlands 54.2 ·
Belgium 45.9 · Italy 31.3 · Switzerland 30.3**, with **France 11th of 42** and **Spain 13th**. Two
of the five named countries sit outside the top ten, and the three tightest fills belong to
countries the sentence never mentioned.

The alt now says what the picture actually shows, with both quantities derived: the five named
countries carry the five biggest CLOUDS of dots (**1,646 of the 2,996**, checked against a
recomputed ranking that throws if the five are not in fact the five largest), and a separate
sentence tells a non-sighted reader that a tighter fill means more people per square kilometre
rather than a bigger population, naming the three tightest fills. Measured in plate pixels rather
than km² on purpose: pixels are what a reader's eye compares, and Mercator inflates area with
latitude.

Re-rendered and looked at — `render/static.png`, 2,996 `<circle>` elements, France's fill visibly
looser than Belgium's and the Netherlands'.

## Source line

`Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023 · basemap © MapTiler, © OpenStreetMap`
