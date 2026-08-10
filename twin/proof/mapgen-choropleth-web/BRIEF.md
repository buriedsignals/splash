# Beat — the Faroe Islands emit 8.3× as much CO₂ per person as Albania (web)

**Type:** choropleth. **Medium/genre:** map / web. **Channel:** article web, one self-contained
`render/choropleth.html` (1 347 KB), plus an always-rendered table of all 41 readings.

Since ruling **R1** (2026-08-10) the display surface is a **live MapTiler map** — MapTiler's own
zoom and pan, leashed to the study area — drawn from this beat's own 41 shapes in lon/lat. The
496 px baked plate is still spent once and still shipped, as the **fallback layer**: what a reader
gets with JavaScript off, offline, or on the day a key is rotated. The committed file carries the
`__MAPTILER_KEY__` placeholder (**R1b** — the key never enters the repository), so opening it from
this folder shows the plate and makes **zero** external requests; `deliver` substitutes the key
at delivery.

The page also stopped SSR-ing two fixed 860 px layouts behind a media query (**B5.1**): one fluid
SVG carries geometry only, every glyph is HTML at a fixed CSS pixel size, and the map column is
exactly one window tall — measured 868 px in a 900 px window, against 1 705 px of page before.

## Claim

Across the 41 European countries on this map, 2023 territorial CO₂ emissions per person span a
factor of more than eight: the **Faroe Islands at 13.04 t** are the highest, **Albania at 1.57 t**
the lowest. The map states a ranking, not a cause.

## Data

- Source: Global Carbon Budget 2025, via Our World in Data — 2023 data. Shapes: Natural Earth 1:50m
  Admin 0 Countries.
- `co2-per-capita-2023.csv`: **41 rows**, `Code, Entity, Year, value`, every row Year = 2023, no
  duplicate codes. Value-for-value identical to
  `proof/mapgen-choropleth-video/co2-per-capita-2023.csv` (verified: 41 of 41 codes match, zero
  numeric differences) — the same readings, a different claim and a different genre.
- Kosovo is deliberately absent from the declared study set (Natural Earth `KOS` vs OWID
  `OWID_KOS`); aliasing it through to make a join pass would be the dishonest move.

## Exact values — computed 2026-08-09 (tonnes of CO₂ per person, 2023)

| Rank | Country | t/person |
| --- | --- | --- |
| 1 | Faroe Islands | 13.037725 |
| 2 | Luxembourg | 10.285255 |
| 3 | Iceland | 9.052132 |
| 4 | Czechia | 7.699759 |
| 5 | Poland | 7.307086 |
| … | | |
| 39 | Liechtenstein | 3.311822 |
| 40 | Moldova | 1.737587 |
| 41 | Albania | 1.571077 |

- **13.037725 / 1.5710765 = 8.2985** — "more than eight times" is exact, and eight is the largest
  whole multiple the data supports.
- Mean 5.385, median 5.077. Class breaks `[2, 4, 6, 8, 10]`, six classes: Faroe Islands sits alone
  with Luxembourg in the top class (≥ 10), Albania with Moldova in the bottom class (< 2).
- The committed HTML's own table carries **41 data rows** (counted in the file), sorted descending,
  and its first three and last three read 13.0 / 10.3 / 9.1 and 3.3 / 1.7 / 1.6 — the same ranking.
- The live layer paints from the SAME ramp: each feature carries the exact colour its own `<path>`
  is painted, from `ChoroplethWeb.tsx`'s `choroplethRamp`/`fillFor`, so plate and live map cannot
  disagree about what class a country is in. Verified in a real browser on the keyed page: France
  `#a0a0a0`, Poland `#7d7d7d`, Sweden `#c3c3c3`.

## Subject and accent

One sequential ramp, and **one** accent, `#B2182B`, spent on the Faroe Islands' outline alone.
Albania, the other end of the claim, is outlined in ink rather than in a second accent: a range has
two ends but only one subject, and two accents on one map is two arguments.

## Interaction

The frame carries the whole claim before any interaction: title, legend with its six classes,
caveat, source, every shaded country, and both outlined extremes are in the SSR'd fallback, so the
beat survives with JavaScript off — and, since R1, with no key and no network too.

**Pan and zoom.** MapTiler's own NavigationControl, no out-of-map zoom button (B6.14b). The reader
cannot pull back past the view the title makes its claim about (`minZoom` is the fitted zoom) and
can come in **3.49 zoom levels** — derived, not chosen: the zoom that brings the smallest region
this beat draws (Andorra, 2.5 frame units on the plate) up to the 28 px pointer target the genre
already uses. That is what makes the subject reachable at all: the Faroe Islands are ~2 px at the
fit, and at max zoom hovering them answers "Faroe Islands : 13.0 tonnes of CO₂ per person"
(driven, 1600×900).

**Where the pointer lands.** Live, the hit area is the rendered fill — a reader gets a country's
value on ENTERING it, anywhere inside it, not over a disc at its centroid (B6.14a). Driven at
1600×900 and 375×812, 40–70 px away from each anchor: France, Spain, Poland and Sweden each answer
with their own reading. In the fallback the region's own `<path>` is the target, forwarded to that
region's button by `interaction.mjs`; the six regions too small to point at keep a pointer-active
28 px button. The buttons are the keyboard path in both states — they are a sibling of the two map
layers, so the live swap does not take a single Tab stop with it.

**No filter.** The 41 countries have no orthogonal subsetting dimension a reader would want to
isolate, and `map-web/SKILL.md`'s own test for adding one ("enough distinct groups, enough
points per group, a genuinely different reading") does not pass here. A filter to declutter would be
argument-bearing content moved behind an interaction under another name.

The table is the non-visual route — a map is spatial and a screen reader has no spatial access — and
it is a real, visible table, one row per country, **named**, largest first, captioned "Every reading
behind the map above". Every reading that shading encodes to about one class is available there to
one decimal.

## What the ruling costs this beat, stated rather than discovered

- **Payload: 429 KB → 1 347 KB.** 869 KB of that is maplibre-gl inlined (rather than a `<script src>`
  to a second third-party host), and 243 KB is this beat's own 41 shapes in lon/lat, culled to the
  plate's own frame and rounded to 4 decimals (279.7 KB at full precision). The fallback SVG got
  ~150 KB *cheaper*, because there is one render now instead of two.
- **One host at read time**, `api.maptiler.com`, measured on the keyed page. The committed page
  requests nothing.
- **The accessible table sits below the one-window column**, not inside it: 41 rows cannot share a
  900 px window with a map without shrinking the map to a stamp or hiding the table behind a
  disclosure widget this genre forbids. Total page height is 2 085 px at 1600×900, of which 868 px
  is the beat and 1 157 px is the table.
- **The live camera fills the stage, so a wide window shows more world than the plate did.**
  Measured at 1600×900: canvas 1566×658, fitted zoom 2.744, 164.4° of longitude visible against the
  plate's 59°. That follows from the genre's own `html.mw-live .mw-viewport { aspect-ratio: auto }`
  — a live map has no plate aspect to preserve — and it also widens the pan leash, which is the
  fitted VIEW. At 375×812 the container is nearly square and the framing matches the plate.

## Anti-patterns for this case

- Per capita is a rate, which is what makes a choropleth legitimate here. Total national emissions
  on the same map would be a lie of area.
- **A small denominator swings a per-capita figure.** The Faroe Islands' population is under 55,000;
  the caveat states plainly that a small-population country can rank far above or below its
  neighbours on a small absolute change, and that the map states the ranking, not a cause. Without
  that sentence the top of this map reads as an accusation.
- Six classes, not a continuous ramp a reader must interpolate by eye; and the class boundaries are
  round numbers in the data's own unit, not quantiles that shift when a row changes.
- Do not gate the extremes behind hover. Both ends of the claim are outlined in the static frame.

## One thing worth noting

The Faroe Islands are a self-governing territory of Denmark, and Denmark is also on this map with
its own value — so the map's top-ranked "country" is a constituent part of another shape in the same
frame. The data supports the number; the word "countries" in the title and alt is doing slightly
more work than the source does.

## Source line

`Global Carbon Budget 2025, via Our World in Data — 2023 data · shapes: Natural Earth 1:50m Admin 0 Countries · basemap © MapTiler, © OpenStreetMap`
