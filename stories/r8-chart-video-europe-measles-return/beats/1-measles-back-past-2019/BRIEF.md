---
size: square
type: line
---

# Beat — European measles fell to 150 cases in 2021 and was back above its 2019 level by 2024

**Type:** line (single series, collapsing to a floor and returning past a reference).
**Medium/format:** chart / video. **Size:** square (1080 × 1080), 30 fps, **240 frames = 8.0 s**.

The size is in the front matter above as well as in that sentence, and the front matter is the one
that counts: `render.mjs` reads it with `readPinnedSize` and renders the composition of that name.
`Root.tsx` registers one composition per row of the export-size table.

## Claim

Reported measles cases across the 53 countries of WHO's European Region fell from **104 442 in
2019** to **150 in 2021**, and by **2024** stood at **106 237** — 1 795 above the 2019 level, which
was the region's highest reading in this file before the pandemic.

## Data

- Source: WHO Immunization Data portal, "Measles cases by month"
  (`407-table-web-measles-cases-by-month.xlsx`), the `WEB` sheet, downloaded **2026-08-23**. The
  workbook's own "data as of" stamp reads **2025-01**.
- Frozen at `source/data.csv`: **2 910 rows**, `Region, ISO3, Country, Year, January … December`,
  **194 countries × 15 years (2011–2025)**, converted from XLSX to CSV and otherwise untouched.
- The beat's own series is **derived in `render.mjs`, never typed**: filter `Region == "EUR"`, sum
  the twelve month columns across the 53 countries, one total per year. Blank cells are counted as
  MISSING, never as zero — 11 651 of the workbook's 34 920 value cells are blank.
- **2025 is excluded**, and this is not a window preference. The publisher's own note says *"Future
  months are reported as 0 and will be updated as data is available"*, so the 2025 rows are
  placeholder zeros. Plotting them would draw a collapse to zero that never happened.

## Exact values — computed from `source/data.csv`, 53 EUR countries, blanks not counted as zero

| Year | Reported cases | Country-months blank (of 636) |
| --- | ---: | ---: |
| 2011 | 33 646 | 96 |
| 2016 | 5 131 | 101 |
| 2018 | 88 296 | 33 |
| **2019** | **104 442** | 111 |
| 2020 | 12 193 | 241 |
| **2021** | **150** | 383 |
| 2022 | 935 | 309 |
| 2023 | 60 943 | 275 |
| **2024** | **106 237** | 183 |

- **2019 is the pre-pandemic maximum** of this window, so it is the reference the last mark is
  judged against. It is derived — the largest reading in any year before the floor year — not typed.
- **2021 is the minimum** of the whole window, and by a wide margin: the next lowest is 935.
- **2024 exceeds 2019 by 1 795 cases**, or 1.7 per cent.

## What the geometry can and cannot carry — read this before judging the frame

The crossing is **1 795 on a 110 000-case axis: about seven pixels** on a 1080-wide frame, which is
**2.3 CSS px** on the phone a square video is watched on. **The geometry cannot show it, and this
beat does not ask it to.** The conclusion states the excess as a number in words beside the mark.

What the geometry does carry is far larger and equally true: a **collapse of 99.9 per cent** from
2019 to 2021 and a return past the same level in three years. That shape is the picture; the
crossing is a sentence. Saying which is which is the difference between a build that carries an
argument and one that decorates it.

## Subject, reference and accent

One accent, `#D4A853` from `PALETTE.md`, on the line and on the single subject mark (2024). The
reference is a dashed rule at the 2019 level, labelled **"2019 level · 104 442"** — that number's
one and only home on the frame, because the y axis prints only its two bounds. The 2021 floor is a
**muted, unlabelled** mark: the title already says 150 in 2021, and printing it again is the
repeated-value anti-pattern.

## Reveal order

30 fps, 240 frames. `establish` 0–26 (title, source; both drawn UNGATED so frame 0 is a readable
poster) → `reference` 32–54 (the 2019 rule drawn left to right, its label fading in over the second
half) → gap of 18 frames, which is the reader's time to take the level in → `reveal` 72–144 (the
2011–2024 readings drawn chronologically at constant pace, the 2021 floor mark arriving when the
line reaches it) → `subject` 144–162 (2024 landing on a critically damped spring) → `conclusion`
162–192 (the 2024 value, then the excess over 2019) → `hold` 192–240 (1.6 s of stillness).
`checkTiming` returns `[]`; `hold` ends exactly on frame 240.

**The stagger traverses an axis the reader can see.** `staggeredReveal` is called in `render.mjs`
before a frame is drawn, keyed and positioned on the year — fourteen marks, distinct and ascending,
on the same x axis the frame prints 2011 / 2018 / 2024 on.

## Anti-patterns for this case

- **Do not truncate this axis.** The zero baseline is what makes 150 legible as a collapse. A
  truncated axis would enlarge the 1 795 crossing at the exact cost of the larger, truer shape.
- **Do not draw 2025.** Its zeros are the publisher's placeholders.
- **Do not present 106 237 as WHO's figure for 2024.** WHO and UNICEF published **127 350** in
  March 2025, from a later data cut. This frame draws the workbook it credits and says the year is
  incomplete on its own source line.
- **Do not claim a rate.** No population column exists in this file; nothing here is per head.
- **Do not treat the 2021 floor as purely epidemiological.** 383 of 636 country-months are blank
  that year against 111 in 2019 — reporting collapsed alongside transmission, and the frame
  therefore states a count and never an infection rate.

## Source line

`Source: WHO Regional Office for Europe and UNICEF, joint news release, 13 March 2025 · 53 countries of the WHO European Region · 2024 incomplete`
