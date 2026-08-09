# Beat — Switzerland lost 0.72 years of life expectancy in 2020 and took until 2023 to get it back

**Type:** line (single series, dipping below and returning to a reference). **Medium/genre:** chart
/ video. **Channel:** `life-expectancy.mp4`, 1080 × 1080, 30 fps, **240 frames = 8.0 s**, plus
`life-expectancy-still.png` as the frame a reader actually reads.

## Claim

Swiss life expectancy at birth fell in 2020 for the first time in the modern series, from **83.78
years in 2019 to 83.06 in 2020**, and did not exceed the 2019 level again until **2023 (83.95)** —
three years later.

## Data

- Source: UN World Population Prospects (2024 revision), via Our World in Data — the
  `life-expectancy` grapher, fetched `&csvType=filtered&country=~CHE`, verified single-entity.
- `data.csv`: **147 rows**, `Entity, Code, Year, Life expectancy`, Switzerland only, **1876 → 2023**,
  with **no year gaps**. The beat draws its own window from 2000 (24 readings); the file keeps the
  raw fetch.
- The credit matters here. This beat previously credited the Federal Statistical Office, which
  publishes only sex-split series (Hommes / Femmes) — averaging them by hand would have been an
  invented number wearing a real institution's name. OWID/UN WPP carries the combined series that is
  actually plotted.

## Exact values — computed 2026-08-09 from `data.csv`

| Year | Life expectancy |
| --- | --- |
| 2018 | 83.5639 |
| **2019** | **83.7804** |
| **2020** | **83.0626** |
| 2021 | 83.6477 |
| 2022 | 83.2003 |
| **2023** | **83.9536** |

- **The 2020 fall is 83.7804 − 83.0626 = 0.7178 years** — about 8.6 months.
- **First year at or above the 2019 reading: 2023** (83.9536 > 83.7804). 2021 (83.6477) and 2022
  (83.2003) both fall short, so the recovery really does take three years, and 2022's second dip is
  why it is not two.
- 2020 is the largest single-year fall since 2000 (−0.72), ahead of 2022 (−0.45) and 2015 (−0.24).
  Across the whole file, 1918 dwarfs it: **−9.47 years**, the influenza pandemic — visible only if
  the window is opened, which is why the window choice is part of the claim.
- Window minimum 79.834 (2000), maximum 83.9536 (2023). No 2024 row exists, which is why the source
  line says "data 2023".

## Subject and accent

One accent, `#0B7A75`, on the line and on the single subject point (2020). The reference is a dashed
rule at the 2019 level, labelled **"2019 level"** and not "83.8 years", because the y axis already
prints 83.8 on the tick the rule sits on — printing it twice is the repeated-value anti-pattern. One
bracket annotation carries "3 years to regain it".

## Reveal order

30 fps, 240 frames. `establish` 0–26 (title, source) → `reference` 32–54 (the 2019 rule, laid down
before the dip so the reader has the level to measure against) → `reveal` 72–150 (the 2000–2023
readings drawn left to right) → `subject` 150–168 (2020 landing as its own point, labelled
"2020 · 83.1 yrs") → `conclusion` 168–198 (the three-year bracket) → `hold` 198–240 (1.4 s of
stillness). Contract-checked; `hold` ends exactly on frame 240.

## Anti-patterns for this case

- **Do not zero-baseline this axis.** The whole quantity lives between 79.8 and 84.0; a zero
  baseline would compress the argument to a flat line. A line chart measures POSITION, not length,
  so a truncated axis is legitimate — but only with every tick labelled, which is the price.
- Do not present the 2020 dip as unprecedented. The file itself carries 1918 at −9.47 years. The
  window starts in 2000 for editorial reasons, and the claim is worded about the recovery, not about
  a record.
- Do not smooth or interpolate. 2022's dip back to 83.20 is real and is what makes the recovery
  three years rather than two; a smoothed curve would erase the reason for the number in the title.
- Do not name an institution that does not publish the figure shown. That was this beat's own
  original defect.

## Defect found while deriving this brief (not fixed here)

1. **"Nearly a year" overstates a 0.72-year fall by about 39%.** The computed drop is 83.7804 →
   83.0626 = **0.7178 years**, roughly eight and a half months. "Nearly three-quarters of a year" is
   what the data says; "nearly a year" rounds 0.72 to 1 in the reader's ear, and it is the headline.
2. **The reference level is hand-typed, not derived.** `BEAT.reference` is the literal `83.8`, while
   the 2019 reading in `data.csv` is **83.7804** — the rule sits 0.02 years above the year it is
   labelled for. It changes no conclusion (2023 clears both), but it is a typed value standing in
   for a value that is in the file, which is the one habit every false claim in this repository has
   come from. `reference` should read 2019 out of the series.

## Source line

`Source: UN World Population Prospects (2024), via Our World in Data · data 2023`
