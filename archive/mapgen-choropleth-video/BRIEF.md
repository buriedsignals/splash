# Beat — Poland emits 2.10× as much CO₂ per person as Sweden

**Type:** choropleth. **Medium/format:** map / video (with a static frame from the same component
family: `render/static.png` at 900 × 560 over a 496 px plate; `render/choropleth.mp4` at
1080 × 1080, 30 fps, 240 frames = 8.0 s over a 620 px plate).

## Claim

Poland's 2023 territorial CO₂ emissions per person are **more than double** Sweden's — 7.31 t
against 3.48 t, a ratio of **2.10** — although both are EU member states. The claim is checked
against the frozen values before a single frame renders: `ratioClaimViolations` throws rather than
draw a title the data does not support.

## Data

- Source: Global Carbon Budget 2025, via Our World in Data · 2023 data.
- `co2-per-capita-2023.csv`: **41 rows**, `Entity, Code, Year, CO2 emissions per capita`, every row
  Year = 2023, no duplicate codes.
- `countries.geojson`: **42 features**. The 41 study codes all find a shape; the 42nd is **KOS**
  (Kosovo), deliberately left out of the declared study set because Natural Earth codes it `KOS` and
  Our World in Data `OWID_KOS` — a genuine coding disagreement, and this beat's claim is about
  Poland and Sweden.

## Exact values — computed 2026-08-09 from `co2-per-capita-2023.csv` (tonnes per person)

- **Poland 7.307086 · Sweden 3.4789953 → ratio 2.1003.** "More than double" holds; "more than
  double" is also the strongest true form — 2.10, not 2.5.
- Poland ranks **5th of 41**, not first: Faroe Islands 13.0377, Luxembourg 10.2853, Iceland 9.0521,
  Czechia 7.6998, then Poland. Sweden ranks **37th of 41**.
- Distribution: mean 5.385, median 5.077. Two entities are at or above 10 t (Faroe Islands,
  Luxembourg); two are under 2 t (Moldova 1.738, Albania 1.571).
- Class breaks are `[2, 4, 6, 8, 10]` — six classes. Poland at 7.31 falls in the **6–8** class,
  which is what the alt says; twelve of the 41 share that class.

## Subject and accent

One sequential ramp derived from ground and ink, and **one** accent, `#C1440E`, spent on exactly one
thing: Poland's outline and its legend marker. Sweden, the comparison, is marked on the same legend
scale in ink, not in a second accent — the argument is a ratio between two readings on one scale, so
both must be readable against the same ramp.

## Reveal order (video)

30 fps, 240 frames. `establish` 0–24 (title, source, the empty legend) → `reference` 30–48 (the
ramp itself, the scale the shading will be read against, before any country is shaded) →
`reveal` 66–156 (the 41 countries taking their colour) → `subject` 156–174 (Poland outlined and
named) → `conclusion` 174–198 → `hold` 198–240 (1.4 s of stillness). Contract-checked; `hold` ends
exactly on frame 240.

## Anti-patterns for this case

- A choropleth encodes a RATE, never a count. Per-capita tonnes is a rate; total national emissions
  would have to be a proportional-symbol map, because shading area by a total makes big countries
  look guilty for being big.
- Do not highlight a shape because it is the extreme. Poland is 5th of 41; it is the subject for an
  editorial reason (an EU pair with the same membership and a 2.1× gap), and the frame says so by
  naming both ends of the comparison.
- Do not read a choropleth's darkest shape as its most important. The Faroe Islands carry the
  maximum (13.04 t) on a population under 55,000 — a small denominator swings a per-capita figure
  hard. This beat does not build its claim there for exactly that reason.
- Territorial accounting only: the caveat says emissions embedded in imports and international
  aviation are excluded, on the frame, unconditionally.

## Two things found while deriving this brief — BOTH CORRECTED 2026-08-09

- The alt described Sweden as "the lightest-marked comparison on the same scale". Sweden is **5th
  lightest of 41** (37th from the top): Malta 3.317, Liechtenstein 3.312, Moldova 1.738 and Albania
  1.571 are all below its 3.479. Read as "the comparison, marked light" it is fine; read as written
  it is false. The alt now says so in the data's own words — "Sweden is the comparison, not the
  minimum: it is 5th lightest of 41, and the lightest shading on the map belongs to Albania at 1.6
  tonnes" — with the rank, the minimum and the minimum's NAME all computed from the frozen CSV and
  the plate's own shape list.

- The alt also said "each of 41 countries is shaded", which is true of the JOIN and not of the
  PICTURE: the plate's bounds `[-26, 36] → [33, 67]` cut through five of the shapes. Measured by
  testing every ring point against the frame — **Finland, Norway, Portugal, Sweden and Ukraine** —
  and the alt now names them: all 41 are shaded, five are not wholly visible. The check runs per
  plate, so the still (496 px) and the video (620 px) each state their own frame's truth rather than
  sharing one typed sentence.

Re-rendered and looked at: `render/static.png` (Ukraine cut at the right edge, Norway and Finland at
the top, exactly as the alt now says) and `render/choropleth.mp4`.

## Source line

`Source: Global Carbon Budget 2025, via Our World in Data · 2023 data · basemap © MapTiler, © OpenStreetMap`
