# Beat — In 2023, more countries reach 75-to-80 years of life expectancy than any other span

**Proves:** in 2023, the single most common five-year band of life expectancy at birth across the
world's countries and territories is 75-to-80 years (65 of 237), immediately past the halfway
point of the whole distribution (the median country, Morocco, sits at 75.3 years).

**Medium / genre:** chart / video. **Type:** histogram — one continuous variable (life expectancy
at birth, one reading per country/territory, 2023) binned into eight contiguous five-year bands,
bar height = count of countries in that band, x-axis in the variable's real unit (years), count
axis zero-based, bars edge-to-edge.

## Data

- Source: Our World in Data, `life-expectancy` grapher ("Period life expectancy at birth").
  Citation from the grapher's own metadata: for 1950 onward (which covers this beat's 2023 row for
  every entity) the underlying source is the **United Nations World Population Prospects (2024)**,
  via Our World in Data.
- Fetched: `https://ourworldindata.org/grapher/life-expectancy.csv?v=1&csvType=full` — no
  `country=` filter was applied (this beat wants every entity, not one), so the
  `csvType=filtered` trap (`twin-intake/references/ourworldindata-csv-filter-trap.md`) does not
  apply here in its usual form; `csvType=full` was still passed for an explicit, checked fetch
  rather than relying on an implicit default.
- `data.csv`: **21,565 rows**, columns `Entity,Code,Year,Life expectancy`, years **1543–2023**
  (Human Mortality Database / Zijdeman/Riley estimates before 1950, UN WPP from 1950 on), one row
  per entity-year. Recounted 2026-08-09 with an RFC 4180 parser — 2023 is the latest year, with
  **261** entity rows.
- Of those 261, **24 are aggregates** OWID ships beside real countries in this same grapher —
  continents (`Africa`, `Asia`, `Europe`, `Oceania`, `Americas` — the last with no `Code` at all),
  income-group buckets (`OWID_HIC`/`OWID_LIC`/`OWID_LMC`/`OWID_UMC` and several more without a
  code, e.g. `Middle-income countries`), and `World` (`OWID_WRL`). Recomputed: **15** of them carry
  no code at all and **9** carry an enumerated `OWID_...` code — every synthetic aggregate uses an
  `OWID_...` code **except Kosovo** (`OWID_KOS`, a real country with a disputed-but-real ISO
  situation, kept in), which is why a raw "`OWID_` prefix or empty code" classifier says 25 and the
  real figure is 24. `render.mjs`'s `readingsFromCsv` excludes both families by an explicit `Code`
  check (an enumerated `AGGREGATE_CODES` set for the `OWID_...` family, plus an empty-code check for
  the rest), never a name-string guess. That leaves **237 countries and territories** — verified by
  `render.mjs` throwing if the count is not exactly 237 (a real tripwire, not a comment).

  *(Correction, 2026-08-09: this paragraph read **259** 2023 rows and **22** aggregates. Both were
  two too low, and the cause is worth recording because it is the class this corpus keeps meeting.
  Two of the aggregate rows are `"Less developed regions, excluding China"` and `"Less developed
  regions, excluding least developed countries"` — quoted `Entity` fields containing a comma. A
  `split(",")` shifts their columns, so their `Year` cell reads `""` and they vanish from any count
  taken that way. `render.mjs`'s own `readingsFromCsv` splits on commas exactly like that and so
  also sees 259 — but both mangled rows are code-less aggregates it excludes anyway, so **the drawn
  237 is unaffected**, and every figure below was recomputed on the RFC 4180 parse and still holds.
  A parser that is right about the answer for the wrong reason is still a parser to fix; that fix
  belongs to `render.mjs` and is named, not made, here.)*

## Exact values — verified 2026-08-09

- **n = 237** countries/territories, 2023.
- **Min:** Nigeria, 54.46 years. **Max:** Monaco, 86.37 years.
- **Mean:** 74.15 years. **Median:** 75.31 years (the middle country by value is Morocco).
- **Bins** (width 5, domain 50–90, 8 bins — within `histogram.md`'s 3–50 sanity range):

| Band (years) | Countries | Notable members |
| --- | --- | --- |
| 50–55 | 1 | Nigeria |
| 55–60 | 5 | Chad, Central African Republic, Lesotho, South Sudan, … |
| 60–65 | 22 | — |
| 65–70 | 38 | — |
| 70–75 | 49 | — |
| **75–80** | **65 (the mode)** | Morocco (the median, 75.31), United States (79.30) |
| 80–85 | 54 | Switzerland (83.95) |
| 85–90 | 3 | San Marino, Hong Kong, Monaco |

Total across all bins: 237, matching n. The 75–80 band holds more countries than any other band —
verified by comparing all eight counts, not assumed from the shape. `render.mjs` throws if the
tallest bin is not the 75–80 band or its count is not exactly 65, so the title's claim cannot
silently drift from the data it draws.

## The motion judgement

A histogram's bins carry no order beyond their position on the variable's own axis. Bin 3 is not
"before" bin 4 the way 1994 is before 1995 in a time series, and it is not "ranked above" it the
way a sorted dumbbell row is (`../video-population-growth-dumbbell/BRIEF.md`'s ten rows are sorted
by the very thing the story is about). Staggering the eight bars in one-by-one by index would
assert a sequence the data does not contain — the honest reading of `motion-grammar.md`'s "the
order is chronological, or it is argumentative, never arbitrary" is that a histogram's bin order
is neither, so nothing here earns a per-bin cascade.

That does not mean a build adds nothing. Three real events survive the honest cut:

1. **The reference** — the median (75.3 years) is laid down first, as the rule the whole
   distribution is read against, with the same pause-to-read discipline every prior beat in this
   corpus gives its baseline.
2. **The reveal** — all eight bars rise together as ONE build, a single shared eased progress
   value, not eight staggered ones. This is still a real event (evidence arriving, the shape of
   the distribution becoming visible) — it is just not a cascade, because there is no argument in
   which bar arrives first.
3. **The subject** — the 75-to-80 band, the tallest bar and the one immediately to the right of
   the median line just drawn, lands its own distinct emphasis (a crossfade to the one accent, an
   outline, its count) only once every bar is already on screen. This is the one bin the finding
   is actually about, separated in time from the uniform rise that preceded it.

So the honest answer is the middle one: not "a build adds nothing" (the median-then-shape-then-
finding order is a real, defensible argument order, and skipping it would have thrown away the
one part of this chart that does earn motion), and not a fabricated per-bar cascade either. The
reveal itself is deliberately the simplest possible version — one rise, no staggering, no per-bar
easing tricks — because bin order carries no argument beyond position, exactly as the task framing
anticipates.

## Anti-patterns for this case

- No per-bin stagger in the reveal — bin order is not an argument (see above).
- Only ONE hue beyond the neutral bar fill: `accent`, spent exactly once, on the subject bin. The
  median reference line reuses the neutral `muted`, not a second accent.
- The subject bin's count label and the median's own label are both rendered in `ink`/`muted`,
  never in `accent` — `histogram.md`'s own documented trap (an Okabe-Ito-safe *mark* colour
  measuring under the 4.5:1 text floor when reused as a label).
- The x-axis shows every bin edge, in years, not bin index — the type's own non-negotiable
  requirement, kept even though the video genre's general furniture-density rule prefers less: this
  one axis is what makes it a histogram and not an unlabelled bar chart.
- Bars are edge-to-edge (no gap) — this is a histogram, not a categorical bar chart; a gap would
  lie about the bins' contiguity.
- The count axis has a zero baseline; no bar's height is measured against a padded floor.

## Source line

`Source: UN World Population Prospects, via Our World in Data · 2023, 237 countries and territories`
