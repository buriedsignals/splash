---
ground: "#FFFFFF"
accent: "#0072B2"
accents: "#C68900, #009E73"
origin: journalist
---

The answer recorded for this beat: the three category colours the map draws, in the order
`CATEGORY_ORDER` lists them — UN system, other intergovernmental, other international body — plus
the white ground.

`origin: journalist`. These are Okabe–Ito, the CVD-safe qualitative set this project cycles
categorical colour from; they are not Heidi.news's house colours and no subject convention produces
them (`matchConvention` returns nothing for "international organisations in Geneva", and inventing
a convention for one beat would be a colour that feels right rather than one a reader already
holds). A vetted default chosen for this beat is still a choice somebody made.

**One of the three moved, and the measurement is why.** The middle category was Okabe–Ito orange
`#E69F00`, which on this white ground measures **2.25:1** — under the 3:1 floor WCAG 2.2 SC 1.4.11
sets for a mark a reader identifies data by. A locator draws no value channel at all
(`references/types/locator.md`: "no magnitude, no rate, no gradient"), so category colour is this
map's entire data encoding and a class of it was under the floor. Recorded instead: `#C68900` at
**3.01:1** — `adjustToContrast` walking the beat's own orange toward the ink pole and stopping at
the first step that clears, the same arithmetic the refusal prints. The render moves: those markers,
their legend swatch and the "all categories" gradient go one step deeper.

`render-web.mjs` reads all three through `seriesInks` and hands them to `LocatorWeb`; neither the
component nor `geo-locator.ts` names a hex any more.
