# Beat — five countries hold 54.9 % of this map's population, and every dot can be asked what it stands for

**Type:** dot density. **Medium/format:** map / **web** — one self-contained `dot-population.html`,
drawn over a 1000 × 1000 plate frozen beside this brief (`plate/`, with its `geometry.json`). The
static format of the same file is `proof/mapmore-dot-population`; this is the missing web cell.

## Claim

More than half the people on this map live in five countries — **Germany, the United Kingdom,
France, Italy and Spain** — which together hold **327,522,303 of 596,770,599 people, 54.9 %**. Four
countries would not do it (**46.8 %**), so five is the smallest set that clears half.

## Why this type earns the WEB format

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

- **Real zoom and pan, from MapTiler — SHIPPED (ruling R1, 2026-08-10).** The map is live and the
  reader moves through it with MapTiler's own `NavigationControl`, leashed to this map's own area.
  The bounded 2.2× checkbox this beat used to put above the map is **gone** (B6.14b asked for its
  removal by name). Three layers in one file: `#mw-map` (live, swapped in only on `map.on("load")`),
  `#mw-fallback` (the baked plate, complete and script-free) and `.mw-overlay` (the labels and the 42
  hit targets, a sibling of both). No network, no key or no JavaScript leaves the fallback standing —
  measured at every viewport below.
- **Hover is the country, not a disc on its capital (B6.14a).** An invisible-to-the-reader `fill`
  layer of the same 42 country polygons answers a pointer **anywhere inside the country**. Measured at
  1600 × 900: walking out from France's own anchor, the country keeps answering to **32–56 px** in the
  eight compass directions — the whole drawn country — where the old 28 px button answered to 14 px
  and no further. At a zoom the reader reaches with the control, a probe **60 px** from the anchor
  answers "France — 68,372,286 people, 344 dots" in all eight directions.
- **The dots hold their GROUND, with a floor.** A dot stands for a fixed number of people in a fixed
  piece of ground, so its radius doubles per zoom level rather than staying a fixed size on screen —
  measured: the teal ink over a fixed 6–15° E / 47–55° N box is 0.248 at the fit and 0.224 nearly
  three zoom levels in, while the same measurement with the radius pinned to a constant screen size
  falls to 0.033. Below **1.25 px** the radius is held: at 375 × 812 the honest ground radius is
  0.44 px and MapLibre's circle shader feathers a sub-pixel disc away entirely — measured, the dot ink
  was **6 % of the fallback plate's** and the map showed no field at all under a legend claiming 2,996
  dots. 1.25 px is the radius at which the live field deposits the ink the plate's own field deposits
  (0.1999 against 0.1856; 1 px gives 0.1156, 1.5 px gives 0.2749). It binds below zoom 2.710 only, and
  the caveat says what it costs: there the field reads a little denser than the ground it covers.
- **Filter — NOT shipped.** The frozen data carries no dimension orthogonal to the encoded one.
  Grouping by region or by EU membership would mean typing a classification into 42 rows that nothing
  in the beat could check, which is how a beat ships a claim it cannot audit.
- **Accessible table — ON.** `regionTable: true`, deliberately, and this is the strongest case in the
  format: the encoding IS texture, so a reader without spatial access has no legend entry, no axis and
  no label from which to recover a single country's figure. Without the table they would have the dot
  value and nothing to apply it to. It also keeps the three countries that draw no dots at all.

## What was verified by driving a real browser, with a real key (2026-08-10)

A keyed copy in a temp directory outside the repository (the committed file carries the placeholder,
ruling R1b), real pointer moves at rounded integer coordinates, real clicks on MapTiler's own control,
and a pass on the committed placeholder file with no key at all.

- **Live:** tiles load (36 responses, all 200, zero failed requests), both layers present, the
  fallback hidden on `map.on("load")`, `NavigationControl` present and a real click on its `+` moves
  the zoom by exactly one level.
- **Fit:** the whole beat inside the window at 1600×900 (beat 868 of 868 available), 1024×768
  (736/736), 768×1024 (992/992), 375×667 (635/635) and 375×812 (780/780); no horizontal page scroll
  and nothing scrolls inside the visual at any of them. The page itself is 1906–2216 px tall because
  the 42-row accessible table follows the beat in normal document flow — that is reading, not
  scrolling inside the visual.
- **Leash:** jumping the camera to 60° E / 20° N leaves the view inside the pan bound the fit set;
  the reader has **2.875 zoom levels** of room at every container shape (derived: the frame's 67.19°
  of longitude over Germany's 9.16°, the smallest of the five countries the title names).
- **Hover:** the country answers anywhere inside its polygon (numbers above). Every tooltip matched a
  figure recomputed from the frozen csv and the frozen plate.
- **Dots:** 2,996 drawn from 39 `MultiPoint` features, ground-constant above 1.25 px (numbers above).
- **Unprojection:** the plate's own corners imply a 1000.000000 px frame against the 1000 px baked —
  the camera is one Web-Mercator camera, asserted before anything is drawn. 2,993 of 2,996 dots land
  inside their own country's true lon/lat outline (the 3 are the bake's own 0.6 px ring thinning), and
  all 2,996 inside its bounding box, which is what the render asserts.
- **With the key removed** (the committed file, exactly as published): no live layer, the fallback
  plate, its 42 outlines, its 2,996 dots, 5 labels, 42 hit targets and 42 table rows all render at
  every one of the five viewports.
- **Keyboard:** every `.pt` keeps its tab stop and its `aria-label` live — CSS drops only their
  pointer-events — so Liechtenstein, which draws **no dots at all**, still answers "39,846 people,
  0 dots" from focus.
- **The two targets that stay covered are Kosovo (under North Macedonia's) and Liechtenstein (under
  Switzerland's)** — small countries beside larger neighbours. Targets are laid down smallest-first,
  so the covering target is always the more populous country, and both keep their tab stop and their
  table row. Live, hovering either country's own ground answers correctly regardless.

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

- **At 375 × 667 the live camera zooms out to a hemisphere.** Measured: the stage there is 341 × 178,
  and `live-map.mjs`'s own `FIT_PADDING_PX = 48` takes 96 of those 178 px — 54 % of the height — so
  `fitBounds` lands at zoom 0 and shows 240° of longitude with Europe as a blob and the five labels
  stacked on each other. The fallback plate does not have this problem: it draws a 178 × 178 square of
  Europe. The lever is the shared boot script's fixed padding (a fraction of the container rather than
  48 px), and that file is a byte-identical copy in every map × web beat — not this beat's to change.
  At 375 × 812 (a 341 × 310 stage) the same camera is fine: zoom 1.197, 105° of longitude.
- **A wide, short window shows a lot of ocean.** Live, the canvas IS the container (the plate's aspect
  is not preserved, by design), so a near-square subject in a 1566 × 702 box is height-bound: 170° of
  longitude visible, Europe filling about a third of the width. The fallback letterboxes to 666 × 666
  and fills about the same fraction of the width with white instead of sea, so this is a change of
  what fills the spare room rather than a loss of the subject — but it is not the picture the plate is.
- **The "United Kingdom" label's box overlaps Ireland** at every width. Its anchor is the dot nearest
  the centre of Great Britain, so the label's centre sits on UK ink, but a 110 px box on a 666 px map
  cannot avoid the neighbour.
- **At 375 px the five labels crowd the middle of the map.** Each stays legible and each sits on its
  own country, but their boxes cover neighbours. The alternatives — a narrow-width breakpoint that
  drops labels, or type that shrinks with the container — both break a rule this format holds
  (nothing argument-bearing removed by width; type is one size at every width), so the crowding
  stands and is recorded here.

## Source line

`Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023, 42 countries · basemap © MapTiler, © OpenStreetMap`
