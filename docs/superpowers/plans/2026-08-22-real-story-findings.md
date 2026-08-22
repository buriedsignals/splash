# Three real stories — 54 defects

Not fixtures. Three datasets downloaded from Our World in Data on 2026-08-22, with articles quoting
their own published prose. Nobody wrote them to be hard and nobody pre-analysed them.

| story | format | delivered | defects |
|---|---|---|---|
| GWIS wildfire counts (3 900 rows) | chart / static | `done`, every printed number exact | 12 |
| Ember renewables share (7 585 rows) | chart / **web** | `done`, 63/63 verify-web | 17 |
| OWID life expectancy (21 565 rows) | map / **web** | rendered, driven live, approved at G3 | 25 |

**All three delivered graphics are publishable**, and each states its own limits on the artefact.
The defects are what the toolchain did NOT do for them.

---

## 1 · The grounding check collapses on panel data — 10 defects

**One cause: `rowValue` does `rows.find(r => r[year] === year)` — the first row of that year, with no
entity filter.** Long-form panel data (one row per entity per year) is the shape of essentially all
open data: OWID, World Bank, Eurostat, Ember.

- `"Canada recorded fewer wildfires in 2025 than in 2012"` → **`supported`**, from Afghanistan's
  rows. Canada rose 3 782 → 5 836. Swapping Canada for Zambia gives a byte-identical verdict.
- The same reading returns **`contradicted`** — the verdict that BLOCKS gate 2 — on a true claim
  about Ghana.
- The "highest/lowest ever" superlative reads the same wrong rows.
- Round six's recorded-claim escape hatch cannot rescue it: it refuses every entity
  (*"Costa Rica matches 26 rows"*), and `resolveGrounding`'s collapse takes the pattern's answer.
- **Net effect: on panel data there is no path to a decided verdict about any entity.**

## 2 · The profiler cannot describe a panel — 6 defects

- **Aggregate rows are invisible.** `World`, six continents and two overlapping Europes share the
  `entity` column with 251 countries. Summing 2025 gives 3.0× the world. A "heaviest count" ranking
  returns *the World*.
- **A partial period stated in PROSE is unreachable** — the guard looks for a column, while the
  frozen article quotes the dataset saying "the 2026 data is incomplete".
- `duplicates: 0` is true and misleading; `year.gaps: []` and `[1900, 2025]` hide a coverage
  collapse (2025 carries 91 of 214 countries against 196 in 2024).
- The profiler **sums the period column**; the denominator downgrade is structurally unreachable
  for a country panel.

## 3 · Verifiers that verify something else — 12 defects

- `verify-web.mjs` drives **2 of chart-web's 6 declared capabilities**; the other four are reachable
  only from the skill's own walk over `proof/`, which never sees a `stories/` beat.
- `verify-interaction.mjs --html <file>` verifies **the skill's seed, not the file given**.
- `verify-live-map.mjs` is symbol-only and **crashes on every choropleth**; it also reads the key
  with no alias list, reports nothing verified, and exits 0.
- `verify-web.mjs --file` **crashes on a map-web page**.
- Two of map-web's four declared guards never look at a story beat; `detect-delivered-text` cannot
  run in production; `plateFollowsGround` reads an unmeasured value as a pass.
- `labels-name-their-own-row` is structurally vacuous for chart-web; `rtlRunsAreIsolated` reports a
  false reason on every chart-web beat; `labelStacksFrom`/`mislabelledRows` have mismatched shapes.

## 4 · map/web is structurally unfinished — 11 defects

- **`map-web` says the choropleth × web cell is unwritten — and it is the cell the journalist asked
  for.** Nothing in the toolchain acquires country geography; the default path is a dead file.
- At planet extent the live map **paints three worlds**; the hover is served by the canvas rather
  than the hit target, and nothing measures it; hit targets are raw percentages with no clamp.
- The bake takes one `--size` and applies it to both axes; `SMALL_REGION_FRAME_UNITS` is tuned to
  one plate; `NO_DATA_FILL` and `WATER_FILL` are light-ground constants declared ground-independent.
- `render/` vs `renders/`: the orchestrator cannot see a rendered map-web beat. The copied beat
  hard-codes its depth twice. The weight ceiling is derived from European beats and a world map
  barely fits.

## 5 · Palette and credit — 5 defects

`proposePalette` prints a false sentence about a file it says it did not read, does not check the
shape of `newsroom` and then claims it measured it, has no answer for a part-to-whole beat with more
parts than the newsroom has accents, and its `surface` vocabulary collides with the format gate's own
words. `proposeCredit` missed the article's explicitly-marked verbatim source line.

## 6 · Delivery and orchestration — 5 defects

Delivery does not reopen when the render changes and the approval is renewed — `whereIs` said `done`
while `export/` held the previous bytes. Re-materialising the same form silently discards the
closing-offer answers. `writeOutputReview` refuses a clean beat (`planVersion` must be a positive
integer). There is no recorded home for a beat's alt text, and the hand-over prints HTML entities.

## 7 · Catalogue and type vocabulary — 5 defects

`datawrapperMatch` does not know the name "Stacked area". `TREATMENT_FORMAT_GAPS` names one
unreachable cell while at least two more pass. A type sheet's ROW limit is enforced against the
panel's rows rather than the beat's marks. `assertDistinctWays` and `formatCandidates` take a
candidate shape the documentation does not describe. G2-producer offers Datawrapper for a `web` beat
on a dark-ground newsroom without mentioning the surface.

---

## What this changes about the six synthetic rounds

107 defects came from six stories I wrote with the traps planted and the answers known. 54 came from
three I did not. **The real ones are a different kind**: cluster 1 alone was invisible to every
fixture I built, because I always wrote one row per entity and real open data never is.

Cluster 1 is one function. Clusters 3 and 4 are the largest by count and are the same finding the
last two rounds kept producing — a guard that does not reach the thing it judges.
