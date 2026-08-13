---
size: landscape
type: population-pyramid
---

# Beat — Niger's youngest age band dwarfs its entire population aged 65+

**Proves:** Niger's 0-4 age band (4,667,150 people) is nearly seven times the size of Niger's
*entire* population aged 65 and older (672,585 people) — the signature of the world's youngest,
fastest-growing population, not an aging one. Every successive five-year band, from the 100+ band
at the top down to the 0-4 band at the bottom, is wider than the one before it: a textbook
"youthquake" silhouette, monotonically expanding, with no bulge or plateau anywhere in the middle.

**Medium / format:** chart / video. **Type:** population pyramid — 21 five-year age bands (0-4
through 100+), each a mirrored pair of bars (male extending left, female extending right) from one
shared central zero. Bands stay in their natural chronological sequence; the silhouette this
sequence produces (an unbroken, wide-to-narrow taper) is the whole argument.

## Data

- Source: UN, World Population Prospects (2024), via Our World in Data — two graphers,
  `male-population-by-age-group` and `female-population-by-age-group`, each returning Niger's 2023
  population by five-year age band and sex.
- Fetched:
  - `https://ourworldindata.org/grapher/male-population-by-age-group.csv?csvType=filtered&country=~NER`
  - `https://ourworldindata.org/grapher/female-population-by-age-group.csv?csvType=filtered&country=~NER`
- **Verified against the OWID CSV trap** (`ourworldindata-csv-filter-trap.md`): fetching either
  grapher's CSV with `&csvType=filtered` but with **no** `country=` filter returned the header row
  and *zero* data rows (this particular grapher requires an explicit entity selection to return
  anything at all — the opposite failure mode from the classic trap, but checked the same way).
  Fetching with `&country=~NER~JPN~CHE` (a three-country sanity probe, Niger + Japan + Switzerland)
  returned exactly 3 rows, one per requested entity, each `Year=2023`, all 21 age-band columns
  present with the header's exact column names — confirmed the filter narrows correctly before
  trusting the single-country Niger fetch. The single-country fetch (`country=~NER`) returned
  exactly 1 data row for `Entity=Niger, Code=NER, Year=2023` from each of the two files, with values
  matching the three-country probe's Niger row exactly.
- **2023 is the only year either grapher exposes** for any entity checked — there is no year range
  to filter within; the CSV already returns the single latest UN WPP estimate.
- `data.csv` (committed): the two raw fetches merged into one `age_band,male,female` CSV, 21 rows,
  in the data's own natural order (youngest first, "0-4", to oldest last, "100+") — the same
  freeze-time shape `../static-swiss-age-pyramid/data.csv` already uses for this type. Values are
  the raw fetched integers, untouched.
- Cross-check: OWID's own `population.csv` reports Niger's total 2023 population as **26,159,863**;
  the 21 age bands here sum to **26,159,873** — 10 people off, the same order of rounding gap
  `../static-swiss-age-pyramid/BRIEF.md` found and accepted for Switzerland (4 people off there),
  from two independently-modelled series. Printed by `render.mjs`'s own console output, not
  asserted silently.

## Exact values — verified 2026-08-08 (Niger, 2023, by five-year age band and sex)

| Age band | Male | Female | Total |
| --- | --- | --- | --- |
| 0-4 | 2,369,723 | 2,297,427 | **4,667,150** |
| 5-9 | 2,073,417 | 2,005,535 | 4,078,952 |
| 10-14 | 1,801,457 | 1,738,611 | 3,540,068 |
| 15-19 | 1,503,382 | 1,449,809 | 2,953,191 |
| 20-24 | 1,211,505 | 1,166,342 | 2,377,847 |
| 25-29 | 949,326 | 911,500 | 1,860,826 |
| 30-34 | 744,709 | 712,860 | 1,457,569 |
| 35-39 | 607,877 | 579,754 | 1,187,631 |
| 40-44 | 507,282 | 480,886 | 988,168 |
| 45-49 | 406,649 | 388,044 | 794,693 |
| 50-54 | 325,810 | 317,146 | 642,956 |
| 55-59 | 263,966 | 261,197 | 525,163 |
| 60-64 | 204,743 | 208,331 | 413,074 |
| 65-69 | 146,698 | 154,405 | 301,103 |
| 70-74 | 94,294 | 103,136 | 197,430 |
| 75-79 | 46,961 | 65,511 | 112,472 |
| 80-84 | 19,117 | 28,527 | 47,644 |
| 85-89 | 4,679 | 7,593 | 12,272 |
| 90-94 | 547 | 1,042 | 1,589 |
| 95-99 | 21 | 54 | 75 |
| 100+ | 0 | 0 | 0 |

- **0-4 band total:** 4,667,150 — 17.8% of Niger's entire population.
- **65-and-older population** (sum of the 8 bands 65-69 through 100+): **672,585**.
- **Ratio:** 4,667,150 / 672,585 = **6.94×** — the on-screen label rounds to "~6.9×"; the
  written claim above ("nearly seven times") is the same fact in words.
- Every band's total is monotonically **larger** than the band immediately above it (older) —
  checked band-by-band in `render.mjs`, not assumed from a plotted shape.

## Build order and why

Displayed **oldest at the top, youngest at the bottom** — the same convention
`../static-swiss-age-pyramid/SwissAgePyramid.tsx` already uses for this exact type. The reveal
cascades in that same order: the central zero spine establishes first (the `reference` event, one
thing every band shares), then each band's mirrored pair of bars draws outward from that spine,
**oldest band first, youngest band last** — top to bottom, matching the display order exactly.

This direction was chosen, not defaulted to, because of what this specific dataset does: **every
successive band, oldest to youngest, is wider than the last.** Revealing oldest-to-youngest is
therefore a steady, unbroken escalation — the bars get visibly bigger with almost every arrival —
that climaxes on the single widest pair of bars in the whole frame, the 0-4 band, which is also the
confirmed subject. The alternative direction (youngest first) would show the finding in the very
first arrival and spend the rest of the reveal trailing off into smaller and smaller bars — the
opposite of a build, and a spoiler before the reader has been given any context (the reference
spine, the legend) to read it against. Because the subject band is structurally the *last* thing
`reveal` draws, `subject.start` can be pinned to exactly `endOf(reveal)` with no gap to bridge —
`timing-contract.ts`'s doc-comment has the frame numbers.

Once every band has landed, the `subject` event adds the 0-4 row's own emphasis (an outline on both
its bars, a highlight wash behind the row, its age-band label crossfading to bold) and its total
population lands as a label centred directly below the pyramid's own base — literally the space the
widest row just finished occupying. `conclusion` then extends that same label in place into the
ratio against the 65+ population, the one fact the beat states in words rather than shape.

## Colour

Two CVD-safe hues, checked as a pair — Okabe-Ito blue (`#0072B2`, male) and Okabe-Ito vermillion
(`#D55E00`, female), a cool/warm pair, not the two adjacent warm hues
`doctrine/references/visual-system.md`'s "adjacency inside an already-safe palette" section
warns about. The same two hues `../static-swiss-age-pyramid/`'s static beat already uses for this
type, chosen independently here for the same reason (an established, low-risk pair), not imported
from that file. The mirrored left/right position already carries the male/female distinction on its
own (`population-pyramid.md`); colour reinforces it, and the legend states which side is which — a
pyramid has no other way to say that, so the legend is load-bearing, the same discipline the
dumbbell beat's BRIEF names for its own two-series legend.

The subject's emphasis reuses the **female** hue as a third channel (outline stroke, highlight
wash, bold label) rather than introducing a third hue — `DumbbellVideo.tsx`'s "never a third hue"
discipline, applied here. Every value label (the subject's total, the ratio, the age-band labels)
is set in `ink`, never in either side's own hue — `visual-system.md`'s "a mark's colour is measured
again when it becomes a label" names the exact defect (an Okabe-Ito vermillion label measuring only
~3.87:1 as text) this beat avoids by never trying it in the first place.

## Frame

1080 × 1350 (4:5), taller than the corpus's square default — the same per-story override
`../static-swiss-age-pyramid/`'s static beat already made for this type (900 × 820, taller than
that format's own default). 21 age bands need more vertical room than a square frame gives for a
legible centre-gutter label at any format's own minimum readable size.

## Source line

`Source: UN, World Population Prospects (2024), via Our World in Data · 2023 data`
