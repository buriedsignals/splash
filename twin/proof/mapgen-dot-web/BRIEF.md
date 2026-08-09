# Beat — five countries hold 54.9 % of this map's population, and every dot can be asked what it stands for

**Type:** dot density. **Medium/genre:** map / **web** — one self-contained `dot-population.html`,
drawn over a 1000 × 1000 plate frozen beside this brief (`plate/`, with its `geometry.json`). The
static genre of the same file is `proof/mapmore-dot-population`; this is the missing web cell.

## Claim

More than half the people on this map live in five countries — **Germany, the United Kingdom,
France, Italy and Spain** — which together hold **327,522,303 of 596,770,599 people, 54.9 %**. Four
countries would not do it (**46.8 %**), so five is the smallest set that clears half.

## Why this type earns the WEB genre

A dot map turns a value into TEXTURE. A reader sees where the mass is and cannot read a single number
off it: no dot is labelled, no country can be, and the still's answer — a dot-value key and five
direct labels — is as far as fixed ink goes. Here, hovering or focusing any of the 42 countries gives
its exact population AND its own dot count (the bridge between the texture and the key), and the
table below carries all 42 at once. The claim itself is still stated without any interaction: the
title names the five and the map labels them.

## Data

- Source: World Bank Open Data, indicator `SP.POP.TOTL` (population, total), 2023.
- `population-europe-2023.csv`: **42 rows**, `Code, Country, Year, Population`.
- `countries.geojson`: the matching shapes. `joinPopulation` throws in both directions — no shape
  without a population, no population without a shape — because a bad join draws a country with zero
  dots, which reads as "nobody lives here" rather than "the join is wrong".
- Russia is **not** in the file, deliberately: its figure covers the whole transcontinental country
  while almost none of its territory falls inside the frame. Seven micro-territories with no
  independent World Bank figure are likewise absent. Both absences are named on the frame.

## The camera is this beat's own, and the reason is a measured defect

The static sibling bakes `[[-26,36],[33,67]]`. Dots are scattered inside a country's own polygon, so
territory outside the frame takes its share of that country's dots with it and the clip eats them.
Measured on that bake: only **58 % of Norway's outline points, 65 % of Ukraine's, 72 % of Finland's
and 47 % of Malta's** landed inside the frame — four countries whose visible cloud understates their
population, on a map whose argument is which clouds are biggest.

This beat bakes `[[-25,34.5],[41,71.5]]`, the study set's own mainland extent read out of the
geojson (Iceland −24.5° W, Ukraine 40.1° E, Crete 34.9° N, North Cape 71.2° N), and near-square once
projected — 66° of longitude against 66.5° of Mercator-equivalent latitude, hence a 1000 × 1000 bake.
`partsInFrame` then drops the parts still outside it (four Portuguese island rings), and the render
**asserts that zero dots landed outside the frame** before writing anything.

Stated so it is not oversold: the camera is the fix, and it is measured (Norway 58 % of its outline
inside the old frame, 100 % inside this one). `partsInFrame` is a guard, not a repair — with it and
without it this beat draws the same 2,996 dots and **zero** strays, because those four island bboxes
are too small to be allocated a dot at this dot value. It earns its place by keeping the invariant
true for a future camera or a smaller dot value, and the render asserts the invariant rather than
trusting the function.

## Exact values — computed by `render-web.mjs` at every render, never typed

| What | Value | How it is derived |
| --- | --- | --- |
| Study set | 42 countries, 596,770,599 people | the frozen csv |
| The five | 327,522,303 → **54.9 %** | summed, and the render throws unless they are also the five largest |
| Four is not enough | **46.8 %** | the render throws if the first four already clear half — that is what makes "five" the right word |
| Dot value | **1 dot = 199,000 people** | `chooseDotValue(total)`, derived from the total, not chosen |
| Dots drawn | **2,996** | counted after the scatter; the legend states both numbers |
| The five biggest clouds | the same five | recomputed from dot counts, and the render throws if they differ from the five the title names |
| Tightest fills | Malta 415.8 · Netherlands 51.1 · Belgium 43.3 (dots per 1,000 plate px) | `fillTightness` |
| France / Spain on that measure | **11th and 13th of 42** | the same ranking |
| Countries too small for one dot | Andorra 80,856 · Faroe Islands 54,398 · Liechtenstein 39,846 | derived, and named in the caveat |

## Subject and accent

One accent (`#0B7A75`, `PALETTE.md`, house origin) on every dot: a dot map is univariate, so a second
hue would invent a second variable. The five countries the claim names are picked out by direct
labels on their own clouds, never by a different colour — the claim is about which clusters are
biggest, and recolouring them would beg its own question. The land fill and the outlines are derived
from the ground and the ink.

## Hierarchy of the proof

1. The mass of dots — the pattern before any word.
2. Five direct labels on the five clouds the title names, drawn unconditionally.
3. The dot-value key, at headline weight: it is the one piece of text that turns a texture back into
   a measurement.
4. The per-country exact figures, on hover, on keyboard focus, and in the table.

## The controls, and the tests they had to pass

- **Bounded zoom — SHIPPED, and it earns its place by measurement.** 42 pointer targets on a
  continental map is exactly the density case: at 375 px only **31 of 42** answer a pointer at their
  own centre. Checked, the same targets go to **39 of 42**. The multiplier is fixed at **2.2×** and a
  reader cannot exceed it, so the plate never degrades into blur; it is pure CSS (`:has()` on a real
  checkbox) plus native scrolling, so it needs no script and no live tiles. Unzoomed is not a
  preview — it is the whole claim.
- **Filter — NOT shipped.** The frozen data carries no dimension orthogonal to the encoded one.
  Grouping by region or by EU membership would mean typing a classification into 42 rows that nothing
  in the beat could check, which is how a beat ships a claim it cannot audit.
- **Accessible table — ON.** `regionTable: true`, deliberately, and this is the strongest case in the
  genre: the encoding IS texture, so a reader without spatial access has no legend entry, no axis and
  no label from which to recover a single country's figure. Without the table they would have the dot
  value and nothing to apply it to. It also keeps the three countries that draw no dots at all.

## What was verified by driving a real browser (1600×900, 1024×768, 375×812)

Real pointer moves at rounded integer coordinates, `document.elementFromPoint` at every target's own
centre, a real click on the zoom control, real key presses, and a JavaScript-disabled pass.

- **Fit:** the whole beat inside the window at all three sizes (884/900, 752/768, 796/812); nothing
  scrolls inside the visual.
- **Plate:** baked aspect 1.0000, drawn aspect 1.0000 at every viewport — Δ 0.00000. Never stretched.
- **Type:** title 21 px and country labels 12 px at all three widths; only the geometry scales.
- **Content:** 2,996 dots, 5 labels and 42 table rows present at every width, and with JavaScript off.
- **Hover:** 39/42, 39/42 and 31/42 countries answered a real pointer at their own centre (1600 /
  1024 / 375). Every tooltip matched a figure recomputed from the frozen csv and the frozen plate.
- **Zoom:** a real click on the label (30 px tall) checks the box, switches the viewport to
  `overflow: auto` and grows the content from 298 px to 656 px (2.2×) — and takes reachability at
  375 px from 31/42 to 39/42. It does the thing it claims to do.
- **The two that stay covered are Kosovo (under North Macedonia's target) and Liechtenstein (under
  Switzerland's)** — small countries beside larger neighbours. Targets are laid down smallest-first,
  so the covering target is always the more populous country, and both keep their tab stop and their
  table row.
- **Keyboard:** Tab reaches a country in three presses and its value is announced from focus alone;
  Liechtenstein, which draws **no dots at all**, still answers "39,846 people, 0 dots" from focus.
- **No JavaScript:** the map, the dots, the labels and the table all render, every target keeps its
  native `title` (identical to its `aria-label`), and a real click on the zoom control still zooms —
  the whole control is CSS.

## Anti-patterns for this case

- **A dot is not a place.** Each dot's position inside its country is random; the caveat says so in
  the frame.
- **Do not let a count read as a density.** Dots are uniform inside each country, so drawn density is
  people per km² — a different quantity from the one the title is about. The caveat names the three
  tightest fills, none of which is among the five, and the alt says France ranks 11th of 42 on that
  measure.
- Do not put the dot value in a footnote. A dot map with no stated dot value is an impression.
- Do not silently drop an entity. Russia, the micro-territories, and the three countries whose
  population buys fewer than one dot are all named — an absence on a map reads as a zero.

## Found and NOT fixed

- **The bounded zoom opens at the plate's north-west corner** — ocean and Iceland — and the reader
  pans from there. A centred initial scroll position is not reachable in CSS: `scroll-snap-type:
  proximity` with a centred snap target was tried in a real browser and left `scrollLeft` at 0, and
  `mandatory` would snap back on every pan. Fixing it means script, which this control does not use.
- **The "United Kingdom" label's box overlaps Ireland** at every width. Its anchor is the dot nearest
  the centre of Great Britain, so the label's centre sits on UK ink, but a 110 px box on a 666 px map
  cannot avoid the neighbour.
- **At 375 px the five labels crowd the middle of the map.** Each stays legible and each sits on its
  own country, but their boxes cover neighbours. The alternatives — a narrow-width breakpoint that
  drops labels, or type that shrinks with the container — both break a rule this genre holds
  (nothing argument-bearing removed by width; type is one size at every width), so the crowding
  stands and is recorded here.

## Source line

`Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023, 42 countries · basemap © MapTiler, © OpenStreetMap`
