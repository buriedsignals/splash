# Beat — five countries hold 54.9% of this map's population

**Type:** dot density. **Medium/genre:** map / static. **Channel:** article web, over an 860 × 760
baked plate (`plate/`, frozen beside this brief).

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
