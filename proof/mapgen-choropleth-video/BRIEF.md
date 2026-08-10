---
size: landscape
type: choropleth
---

# Beat — Poland emits 2.10× as much CO₂ per person as Sweden

**Type:** choropleth. **Medium/genre:** map / static **and** map / video — two genres from one
folder: a static (`render/static.png`) and a video (`render/choropleth.mp4`, 30 fps, 240 frames =
8.0 s), each drawn from its own baked plate (`plate-496/`, `plate-620/` — both square, both over 59°
of longitude).

**Size:** landscape (1920 × 1080), pinned in the front matter above, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize` and BOTH genres derive their frame from it.
It used to say "900 × 560" and "1080 × 1080", checked by nothing, while each component carried its
own `const FRAME` and the render script repeated the same literals.

## What each size does with this geography — and why only the static ships

Both plates are SQUARE (496 × 496 and 620 × 620) over 59° of longitude, so the map is drawn at the
plate's own aspect at every size — never stretched, never cropped (`mapStageBox`). Neither is near
the Mercator ceiling: a square box admits 360°, and this camera shows 59°. What changes between the
sizes is not the geography. It is the WORDS.

**Static** — the size table's static row, floor 26 px, because a static map is read in a ~900 px
article column.

| size | delivered | the map | leftover |
| --- | --- | --- | --- |
| landscape 1920 × 1080 | **yes**, measured 1920 × 1080 from the PNG's own IHDR | 846 × 846 | 834 px of text column |
| square 1080 × 1080 | refused | — | — |
| portrait 1080 × 1920 | refused | — | — |

Nothing is letterboxed at landscape: a square plate in a 1750 × 846 content box is bound by HEIGHT,
so the map takes 846 × 846 and the 834 px left on the other axis is the column. Both refusals are
the type floor's, not the geography's — at 36 px the column beside a 747 px plate is 93 px against
the 470 px this beat's own longest title word and legend row need, so the plate must go above the
column, and stacked the furniture takes **957 px of a 747 px band** (square) or **of 646 px**
(portrait). `render.mjs --still --size square` reproduces it with these numbers in it.

**Video — REFUSED AT ALL THREE SIZES (R9).** The video row's floor is 30 px at landscape and 36 px
at the other two, because a video is watched rather than read in a column. This beat was tuned at
1080 × 1080 with its smallest type at 17 px — 5.7 CSS px on a 360 dp phone, about half the floor.
Raising it costs height, and here is what it costs:

| size | title | credit | caveat | band left for the map | verdict |
| --- | --- | --- | --- | --- | --- |
| landscape 1920 × 1080 | 3 lines, 280 px | 2 lines, 90 px | 1 line, 35 px | **385 px of 910** | refused |
| square 1080 × 1080 | 6 lines, 696 px | 3 lines, 168 px | 3 lines, 150 px | **−222 px of 936** | refused |
| portrait 1080 × 1920 | 6 lines, 696 px | 3 lines, 168 px | 3 lines, 150 px | **−323 px of 835** | refused |

Square and portrait are the plain case: the words alone exceed the band. Landscape is the one worth
stating, because it is the size that ALMOST works and the counters would all have passed it. The
385 px band clears the legend's own 347 px, so the frame renders — and the picture is wrong:

> **"Poland" measures 150 px at the 45 px the landscape floor puts it at, against a subject drawn
> 65 px wide — 2.31× the shape's own width.** The name and its halo cover Poland's class colour and
> bleed over Germany, Czechia and Belarus. On a choropleth the subject's shade IS the evidence the
> two legend markers point at, so the label paints out the mark the whole beat is about. The name
> fits inside the shape from an 889 px map; the words leave 385 px.

Nothing was clipped, nothing collided and every type floor was cleared in that render — which is
why the floor is now measured (`subjectLabelHostWidth`) rather than looked for. The still clears the
same floor with room: 846 px map, Poland drawn 143 px wide, the name 108 px — 0.76×.

**The removal ladder was run and no rung above R9 fires**, because the rungs that recover hundreds
of pixels remove things this beat does not have: there is no axis title (R1), no standfirst (R3, R7)
and no annotation outside the map box (R4 — the subject's name is drawn *inside* the plate, so
dropping it frees no band height and the plate stays 385 px). Even with the caveat **and** the whole
legend removed, the title and the credit alone take 370 px of the 910 px band. Nothing in the ladder
makes type smaller. `render.mjs --final-frame` reproduces the refusal, rung by rung.

**Consequence:** `render/` holds the static only. The 1080 × 1080 `choropleth.mp4`, its final frame
and its two extracted frames were removed rather than left committed, because no code in this beat
can now reproduce them — a render that cannot be re-run is the thing this project's own discipline
refuses. The reveal order below documents an edit the beat no longer draws; it is kept because the
timing contract and `ChoroplethVideo` are unchanged apart from their layout, and the day this beat's
title is shortened the video is one render away.

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
