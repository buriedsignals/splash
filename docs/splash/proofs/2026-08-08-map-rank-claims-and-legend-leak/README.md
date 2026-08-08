# Three defects the closing-caption proof named and left open

2026-08-08. `docs/splash/proofs/2026-08-08-map-closing-captions` §4 measured three neighbouring
defects off the same renders as its own table and recorded them as genuinely different problems.
This is those three, reproduced, closed, and re-measured.

Everything below was read off **built pages** (`skills/scrolly/scripts/produce.mjs`, opened in
Chromium and scrolled), on the shipped sample configs — none of which carries an `insight`, which
is the shape every loop-assembled config has.

---

## 1 — the machine stated something FALSE about the data

Verbatim, from the pages, before:

| page | the caption | the data on the same map |
|---|---|---|
| symbol | `Rome — 67$bn, the lowest` | **Amsterdam, 52$bn**, a circle drawn on that map |
| hex-grid | `#5 hexagon — 15 points, the lowest` | 62 hexagons; the walk visited 5 |
| cartogram | `Denmark — 64, the lowest` | 18 cells; the smallest is Czech Rep. at 15 |

## 2 — the same family: a walk ranked by one quantity, captioned as another

dot-density, verbatim, in page order — the order is by DENSITY, the number printed is the TOTAL:

    Netherlands — 18M, the highest of the 14 shown
    Belgium — 12M
    United Kingdom — 67M
    Germany — 84M
    Italy — 59M, the lowest          ← Belgium, 12M, four cards above it

Both ends were false, not only the one §4b named.

## 3 — a language leak in the geo layer

On a French hex-grid page whose every caption was French — `l'hexagone le plus dense — 18 points`,
`18 points dans l'hexagone le plus dense, 62 hexagones au total` — the legend read, in capitals:

    POINTS PER HEXAGON

---

## The rule chosen for rank claims

**Rank is DECLARED by the deriver and merely SPOKEN by the caption engine. Position is never
rank.**

`skills/scrolly/src/chapters.ts` composed its descriptor from a beat's index among the reveals
(`i === minBeat` ⇒ "the lowest", `i === maxBeat` ⇒ "the highest of the N shown"). That is honest
for exactly one type — choropleth, whose `magnitudeRevealRows` deliberately appends the data's
true tail with `rankRole: "tail"`. Every other type walks a plain top-N. The fallback is gone: the
caption engine now reads `Beat.rank` / `Beat.rankRole` and says nothing when they are absent.

One place answers "what rank may I claim?" for every type — `magnitudeRankTags(index, total)` in
`skills/map-native/src/map-story.ts`. `index` is the subject's place in the value-descending
ordering of **all** subjects, not its place in the capped walk, so:

- `rank === 1` ⇒ "the highest of the N shown" — true, because the ordering is over everything drawn
- `rankRole === "tail"` means **this subject IS the minimum**, never "this beat is last"
- a walk that stops at rank 5 of 6 declares no tail, and the caption reads "the fifth"
- one subject declares nothing: one value is not a distribution

And each type answers it once:

| type | declares | why |
|---|---|---|
| choropleth | yes (unchanged, `magnitudeRevealRows`) | its walk appends the true tail |
| **symbol** | yes | value-descending over every point; nothing else states the rank |
| **cartogram** | yes | same shape; its video caption already stated the rank, its web caption had no source and invented one |
| **hex-grid** | **no** | the rank is already the bin's NAME (`densestBin` — "the densest hexagon", "#5 hexagon"). Declaring would print it twice: "the 2nd densest hexagon — 18 points, the second" |
| **dot-density** | **no** | the walk ranks dots-per-area; the caption prints the region's total. No rank language over the printed number is true |
| locator | no (unchanged, `pattern: "categorical"`) | a walk of places ranks nothing |

The mechanical check is `rankClaimViolations(beats, subjects)` beside it: every declared rank is
matched against the subject's real place in the whole data, and a `tail` that is not the minimum
is a violation. `skills/map-native/tests/rank-claims.test.ts` runs the real derivers over fixtures
built so the walk's last beat is NOT the minimum — the exact shape the defect needs.

## What the pages say now

| page | before | after |
|---|---|---|
| symbol | `Rome — 67$bn, the lowest` | `Rome — 67$bn, the fifth` |
| symbol | `London — 296$bn, the highest of the 6 shown` | unchanged — true of all six |
| cartogram | `Denmark — 64, the lowest` | `Denmark — 64, the fifth` |
| hex-grid | `#5 hexagon — 15 points, the lowest` | `#5 hexagon — 15 points` |
| dot-density | `Netherlands — 18M, the highest of the 14 shown` | `Netherlands — 18M` |
| dot-density | `Italy — 59M, the lowest` | `Italy — 59M` |

`web-after-symbol-rank-is-true.png` · `web-after-dot-density-no-rank-claim.png`. The closing cards
are untouched and still name the real extremes (`London: 296$bn, Amsterdam: 52$bn — a 6-fold
gap`), so the walk and the close now agree.

## The leak, and its siblings

Fixed where localized furniture lives — `lib/core/story-copy`, six new rows — never a list held
privately by a renderer. `computeHexGrid`/`computeCartogram` read `lang` off the config every
caller already hands them whole, so no call site changed.

The sweep of the geo layer and of the legend/popup builders that read from it found four more of
the same mechanism (an English word minted outside the locale table, on a surface a reader sees):

| leak | where it was composed | now |
|---|---|---|
| `points per hexagon` / `sum of values` / `mean value` | `hex-grid-geo.ts` (**the geo layer**) | `binAggregate` |
| `value` — a cartogram's legend title when the config named none | `cartogram-geo.ts` (**the geo layer, the true sibling**) | `valueLabelFallback` |
| `1 dot = N` — the dot-density legend, 5 renderers | each renderer, hand-copied | `dotLegend` |
| `each cell = one region, equal size; colour = value` | CartogramMap + ScrollyCartogramMap | `gridCartogramNote` |
| `Territories` — the route legend's title | RouteMap | `territoriesLabel` |
| `mean 12.5` / `sum 42` / `N points` — the hex hover tooltip | HexGridMap | `aggregateValue` + the existing `pointCount` |

And the accessible names, which are furniture a reader HEARS: `Map: <French title>` /
`Interactive map: <French title>` across 13 components, and `Reset map view` on every interactive
map's reset control (`controls.ts`, which took a `lang` it did not have). Both now come from
`mapAria` / `resetMapView`.

That change touched `lib/verify/taste.ts`, and its own drift guard caught it: the title-overrun
detector exempts the engine's aria prefix, and knew only the English spelling — so a localized
prefix would have read as four added content words and fired `title-overrun` on **every**
non-English map. The constant is no longer a hand-copy held against five components; it is derived
from the same `mapAria` row, one per language.

`web-after-hex-grid-fr-legend.png` — **`POINTS PAR HEXAGONE`**, beside a `Source :` that was
already French.

## The one English string left on a French page, and why it is not ours

Measured after the fix, by reading every `[aria-label]` in the built French page's DOM:

    "Carte interactive : Where road-traffic incidents cluster across Britain"   ← ours
    "Map"                                                                       ← maplibre-gl
    "MapTiler logo"                                                             ← maplibre-gl
    "Toggle attribution"                                                        ← maplibre-gl

(The title itself is English because that config's title is English — journalist data, not
furniture.) The last three come from maplibre-gl's own `defaultLocale`: `maplibre-gl-dev.js` sets
them as `this._getUIString("Map.Title")`, `LogoControl.Title` and `AttributionControl.*`. There is
no literal in this repo to route through the table; reaching them means handing the vendor a
`locale` option at construction — a different owner and a different mechanism. Recorded rather
than closed, with a test that keeps the claim honest: if one of those spellings ever appears in
our sources, it stops being the vendor's problem.

Also verified on the same render: none of the aria text appears in the page's visible text
(`document.body.innerText`), which is why the caption-side i18n work never reached it.

## Regenerate

    cd skills/scrolly && bun scripts/produce.mjs <config>.json <outDir>
    # then open <outDir>/scrolly.html and read the .step captions / the legend

Neither is wired into `bun run check` — both are live MapTiler-backed builds. The behaviour is
covered without a network by `skills/map-native/tests/rank-claims.test.ts` and
`skills/map-native/tests/legend-i18n.test.ts`.
