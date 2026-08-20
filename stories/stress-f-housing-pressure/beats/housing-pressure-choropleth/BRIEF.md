# Beat — Malta's reported housing-cost burden towers over the map, but isn't comparable (web)

**Type:** choropleth. **Medium/format:** map / web. **Channel:** self-contained
`renders/housing-pressure-choropleth.html`, plus an always-rendered (collapsed) table of all 8
readings.

## Claim

Of the 8 countries this map declares, Malta reports the highest share of households spending over
40% of income on housing (143%) — but the source article states plainly that figure comes from a
different survey and is not directly comparable with the rest. Sweden reports the lowest,
comparable share (3%).

## Data and the four traps

`source/` is frozen (`stories/stress-f-housing-pressure/source/`); this beat reads `data.csv`
directly, never a copy.

1. **Unit inside the cell.** Every `pressure` cell reads `"12 %"`, not `12` — which is why the
   intake profiler typed the column `text` with `min`/`max`/`sum` all null and recorded no reason
   why. Decision: strip the unit explicitly, once, in this beat's own `geo-choropleth.ts`
   (`stripPercentUnit`), never inside a skill.
2. **Kosovo's code.** The source table carries Kosovo under `XKX` (the statistics office's own
   code); this tree's own mapping convention (Natural Earth's `ADM0_A3`, which
   `countries.geojson` is keyed by) is `KOS` — and the article says so out loud. Decision: declare
   the study set under `KOS` and alias it to `XKX` at the value-side join
   (`CODE_ALIAS = { KOS: "XKX" }` in `render-web.mjs`). Both directions of the join were driven
   BARE first (see the beat's own report) to capture what the join said before either decision was
   made.
3. **Greenland.** `GRL` is a value the source table carries with no sentence from the article and
   no shape in this beat's declared study set — a self-governing territory of the Kingdom of
   Denmark, ~56,000 inhabitants, not a plausible member of a "housing pressure across Europe"
   study. Decision: excluded, declared explicitly (`OUT_OF_SCOPE_VALUES = ["GRL"]`) rather than
   silently dropped — the join would otherwise refuse to render at all.
4. **Malta's 143%.** The article states it is drawn from a different survey and is "not directly
   comparable," and is kept because the office publishes it in the same table. Decision: keep it on
   the map (the article does not ask for its exclusion), give it its own top class
   (`PRESSURE_BREAKS = [5, 8, 11, 14, 17, 20]`, chosen so Malta's 143% sits alone above Kosovo's
   fully-comparable 18%), and state the non-comparability directly in the on-page caveat — never
   silently blended into an ordinary ranking claim.

## Subject and accent

One sequential ramp, and one accent, spent on Malta's outline — Malta is the map's own visual
subject (the highest reading, and the one the caveat exists for). Sweden, the lowest and fully
comparable reading, is outlined in ink rather than a second accent.

## Live layer

`SEED.live = true`: the delivered page carries a live MapTiler layer over the baked fallback plate,
leashed to the study area, per ruling R1. The committed/rendered file carries the `__MAPTILER_KEY__`
placeholder only — verified: no real key present in the rendered HTML.

## Known limitation, measured rather than assumed

At 375×667 the map box develops its own internal scrollbar
(`skills/map-web/scripts/verify-interaction.mjs`'s own "nothing scrolls inside the visual"
assertion). Reproduced on the tree's own canonical worked example
(`proof/mapgen-choropleth-web/render/choropleth.html`) as well — this is a pre-existing trait of the
choropleth-web pattern at narrow widths, not a defect introduced by this beat's own data or wording.
