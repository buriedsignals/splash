---
size: landscape
type: lollipop
---

# Beat — Switzerland's share of renewable electricity trails Norway's by more than 31 points

**Proves:** among fourteen European countries, Switzerland's share of electricity generated from
renewables sits well behind the continent's leaders — more than 31 percentage points behind Norway
specifically, despite sitting comfortably mid-pack in the wider ranking.

**Medium / genre:** chart / video. **Type:** lollipop (a bar's thin sibling) — one row per country,
one stem per row growing from a shared zero baseline to the country's value, capped with a dot at
the tip, rows sorted by value descending (the natural ranking read). Zero-baseline encoding (not
position-encoded like the dumbbell beat): the stem's LENGTH from zero is the point, so the value axis
must include zero, full stop.

## Data

- Source: Ember (2026) and the Energy Institute – Statistical Review of World Energy (2025), via Our
  World in Data, `electricity-mix` indicator (`metric=share_of_generation&source=renewables&frequency=annual`).
- Fetched: `https://ourworldindata.org/grapher/electricity-mix.csv?v=1&csvType=filtered&useColumnShortNames=false&frequency=annual&metric=share_of_generation&source=renewables&country=~CHE~NOR~ISL~SWE~AUT~DNK~PRT~DEU~ESP~GBR~FRA~ITA~POL~NLD~FIN`
- **A sharper version of the known OWID CSV filter trap** (`twin-intake/references/ourworldindata-csv-filter-trap.md`):
  the classic `share-electricity-renewables` grapher slug now 301-redirects to a multi-dimensional
  "Data Explorer" indicator (`electricity-mix`), and for THAT kind of indicator `&csvType=filtered`
  **has no effect at all** — `&country=~CHE` and `&country=~CHE~NOR~ISL~...` both still returned
  every entity in the dataset. Verified by counting: every attempted country-filtered fetch above
  returned exactly the same row count as an unfiltered fetch. The trap doc's own remedy — count rows
  and check distinct entity values before trusting the fetch — is what caught this; the doc's fix
  (adding `csvType=filtered`) does not apply to explorer-backed indicators the way it does to classic
  single-indicator grapher pages (`population`, used by the dumbbell beat, IS a classic page and
  filters correctly).
- **Adapted response**: fetched the full dataset as-is (it happens to already be exactly what a
  filtered fetch would have produced content-wise, just with every country instead of fourteen),
  froze it unedited as `data.csv`, and filter to the fourteen target countries in `render.mjs` at
  read time — the same "freeze raw, filter in code" discipline `video-population-growth-dumbbell`
  used for its year range, applied here to entities instead of years.
- `data.csv`: **192 data rows, 192 distinct entities** (verified: one row per country/region, no
  duplicates, no stray header mid-file) — this indicator reports one row per entity, its most recent
  available year, not a time series. `Year` is `2025` for every row (the indicator's "latest" pseudo-
  year); `Renewables (Original Year)` is populated only when the underlying figure actually lags
  (e.g. Iceland's is carried forward from 2024) and is blank when the figure is current-year 2025.

## Exact values — verified 2026-08-08 (share of electricity from renewables, %, latest available year)

| Rank | Country | Share | Original year if lagged |
| --- | --- | --- | --- |
| 1 | Iceland | **100.0** | 2024 |
| 2 | Norway | **99.0** (98.99882) | — (2025) |
| 3 | Denmark | 91.2 (91.17117) | — (2025) |
| 4 | Austria | 83.6 (83.597374) | — (2025) |
| 5 | Portugal | 81.0 (80.950516) | — (2025) |
| 6 | Sweden | 71.2 (71.1909) | — (2025) |
| 7 | **Switzerland** | **67.8** (67.82529) | — (2025) |
| 8 | Germany | 59.1 (59.09245) | — (2025) |
| 9 | Finland | 56.5 (56.464153) | — (2025) |
| 10 | Spain | 55.9 (55.858135) | — (2025) |
| 11 | United Kingdom | 52.0 (51.97222) | — (2025) |
| 12 | Italy | 48.8 (48.77597) | — (2025) |
| 13 | Poland | 31.5 (31.507563) | — (2025) |
| 14 | France | 26.1 (26.064074) | — (2025) |

Switzerland sits seventh of fourteen — squarely mid-pack — but the gap to Norway specifically
(98.99882 − 67.82529 = **31.17353**, "more than 31 points") is the claim: Norway is the practical,
mainland European leader (Iceland's 100% is a small-island outlier off a geothermal/hydro base most
of Europe cannot replicate), and Switzerland's own hydro-heavy grid still trails it by that much.

## The motion problem

Every row draws its own stem from the SAME shared zero baseline (unlike the dumbbell beat, where
every row shared a left dot but the story was about a gap between two points — here there is exactly
one point per row and the zero line is the thing every stem is measured FROM, not a second data
series). The reveal should establish the zero baseline first — literally the value axis's zero
line — leave it to be read, then bring in each row's stem-and-dot in rank order (largest share
first), each stem growing from zero to its value rather than simply fading in at full length, so the
reader watches both the ranking assemble AND each bar's own magnitude arrive as one motion event.
Switzerland, the subject, gets its emphasis treatment (ring + highlight wash + recoloured stem/dot +
bold label) once every row — including its own — has already landed, never before.

## Anti-patterns for this case

- Every row's stem and dot use the SAME neutral (`muted`) colour during the reveal — accent is
  reserved for Switzerland's row alone, and even Switzerland's own stem/dot stays neutral until the
  `subject` event recolours it; painting it accent-coloured from the moment it lands during `reveal`
  would spend the one accent before the subject event earns it.
- Value labels are always in page `ink`, never in `accent` — this type's own named, previously-shipped
  WCAG failure (`twin-chart-beat/references/types/lollipop.md`): a saturated accent hue reads fine as
  a thin stem/dot but fails 4.5:1 as running text.
- The category-label gutter is sized to the widest name actually drawn ("United Kingdom"), measured,
  not guessed — the same failure class as the dumbbell and slope beats' label gutters.
- The value axis includes zero and stays there — this type inherits the bar's non-negotiable rule,
  unlike the dumbbell's position-encoded axis (which deliberately does NOT start at zero, because its
  story is the gap between two points rather than either point's distance from an origin).
- The claim compares Switzerland to Norway specifically, not to the outright leader (Iceland) — stated
  plainly in the title and restated as the conclusion label, so the reader isn't left assuming the
  chart is about the top of the ranking when it is about the mid-pack country in it.

## Source line

`Source: Ember & Energy Institute – Statistical Review of World Energy, via Our World in Data · latest available year, mostly 2025 (Iceland: 2024) · share of electricity generation from renewables`
