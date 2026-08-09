# Beat — five countries hold 54.9% of this map's population

**Type:** dot density. **Medium/genre:** map / static. **Channel:** article web, over an 860 × 760
baked plate (`/tmp/map-twin/mapmore-dot-860x760`).

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

## Defect found while deriving this brief (not fixed here)

**The alt text asserts a density claim the data contradicts.** It reads: "The densest, most
continuous clusters sit over Germany, the United Kingdom, France, Italy and Spain." Because dots are
scattered uniformly inside each country, drawn density IS population per km². Computed from this
beat's own frozen CSV and its own `countries.geojson` (spherical polygon area, holes subtracted),
people per km², rank of 41:

- Netherlands **481** (2nd), Belgium **385** (3rd), Malta **2,019** (1st) — none of them named.
- United Kingdom 286 (5th), Germany 234 (7th), Italy 196 (9th), **France 108 (17th)**, **Spain 96
  (20th)**.

So two of the five named countries sit in the bottom half of the density ranking, and the three
densest fills on the map belong to countries the sentence does not mention. The TITLE's claim
(more than half the population in five countries) is true and checked; the alt restates it as a
statement about density, which is a different measurement, and it is the alt that a non-sighted
reader receives instead of the picture.

## Source line

`Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023 · basemap © MapTiler, © OpenStreetMap`
