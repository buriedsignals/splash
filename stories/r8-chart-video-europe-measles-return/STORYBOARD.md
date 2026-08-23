---
takeaway: "Reported measles cases across WHO's 53-country European Region fell to 150 in 2021 — and by 2024 they were back above the 104 442 of 2019, the region's worst year before the pandemic."
subject: "Measles cases reported to WHO by the 53 countries of its European Region, one annual total per year from 2011 to 2024"
comparison: "2024 against 2019 — the level the region had already been shown once — with the 2021 floor of 150 between them, and every year from 2011 shown so neither end is cherry-picked"
limits: "Reported cases, not infections: this counts what 53 health ministries told WHO, and a country that stopped looking reports fewer cases without having fewer. The workbook's own stamp reads 'data as of 2025-01', so 2024 is provisional and incomplete — 183 of its 636 country-months are blank, and December 2024 is missing for 51 of the 53 countries. That makes 106 237 a floor, not a total: WHO and UNICEF's own March 2025 analysis, published two months after this file was cut, put 2024 at 127 350. The crossing is therefore understated here, never overstated. 2025 is excluded outright — the publisher writes 'future months are reported as 0', so its zeros are placeholders and not observations. No population denominator is in this file, so nothing here is per head; the region's population also changed over fourteen years. Nothing in the table says why cases moved, so the pandemic and the immunisation gap that followed it are context from the article, not readings from the data."
placement: "A square post for the newsroom's social feed, read on a phone with the sound off, standing alone ahead of the article."
credit: "Source: WHO Regional Office for Europe and UNICEF, joint news release, 13 March 2025"
effectiveDate: "2026-08-23"
grounding: "unverifiable"
reference: "Australian Broadcasting Corporation, \"How Buddy Franklin scaled footy's Everest\" (26 March 2022) — a long, noisy series read against a historical level; accepted for slot 1. Its lesson is the whole edit: name the historical anchor as a NUMBER on the frame rather than leaving the trend to the reader's eye, so the 2019 level is drawn and labelled 104 442 before the series arrives. The Pudding's \"Twenty years of the NBA redrafted\" (March 2017) was shown beside it for the second half — anchor every mark to a reference line and reserve colour for the deviation from it — and its lesson is folded in rather than chosen: one accent, spent only on the year that crosses."
language: "en"
slots:
  - id: 1
    proves: "That the European Region's measles count did not merely rise after the pandemic but came back past the level it had already reached in 2019 — 106 237 against 104 442 — after falling to 150 in 2021."
    medium: "chart"
    format: "video"
    size: "square"
    reachable: "yes"
    candidates: ["Line", "Slope"]
    chosen: "Line"
---

## ① What was read in the article (restitution)

The WHO/UNICEF release makes four claims that could be drawn, and the frozen workbook carries
only some of them.

1. **"127 350 measles cases were reported in the European Region for 2024."** The frozen table,
   summed over its 53 European-Region countries and twelve month columns, gives **106 237**. The
   two numbers are two different data cuts of the same count: the release was published on
   13 March 2025 and this workbook's own stamp reads `2025-01`. The release's figure is not in
   the frozen data and is not asserted anywhere in this beat.
2. **"a resurgence was seen in 2018 and 2019 — with 89 000 and 106 000 cases."** The table gives
   **88 296** and **104 442**. The release rounded; the beat uses the table's own numbers.
3. **"reaching a low of 4440 cases in 2016."** The table gives **5 131** for 2016, and a far
   lower figure — **150** — for 2021, which the release does not mention at all. The pandemic
   floor is the more striking fact and it is in the data; the 2016 claim is not reproducible from
   this file and is not used.
4. **"Romania reported the highest number of cases in the Region for 2024, with 30 692."** The
   table's highest 2024 country is **Kazakhstan, 28 066**; Romania is fifth, at **12 040**. Not
   reproducible from this file. The beat draws no country breakdown.

The one thing the article and the table agree on completely is the **shape**: down, then back up
past where it had been. That is what the beat draws.

## ② Gate 1 — the takeaway, and what the data says about it

`resolveGrounding(takeaway, profile, { csv })` was run against the frozen `source/data.csv` before
anything was picked. Verdict: **`unverifiable`**, which closes G1 and is not a refusal.

What the check could see: `2019`, `2021` and `2024` all fall inside column `Year` [2011, 2025] —
placed, which is not confirmed.

What it could not see, and this is the honest half: **the measure this beat is about is not a
column of this table.** The workbook is a cross-tab — one row per country per year, twelve month
columns across — so "measles cases in 2024" is a number you reach by summing twelve columns across
53 rows. The check reads columns. It answered every numeral with the same sentence: *"this profile
carries 12 measures (January … December) and the claim names none of them."*

`150` and `104 442` are both exactly right, and both came back unplaced. The verdict is
`unverifiable` because of the table's shape, not because anything in the sentence is doubtful.
Recorded as such, said out loud here, and not upgraded.

`claimShape` / `claimColumn` were deliberately left absent. They are the manual route past a
grounding check that cannot read a sentence, and they are keyed on a **column** — so they cannot
name a measure this table does not carry as a column either. Absent is a complete answer, and it
is the truthful one here.

## ③ The journalist's hand

- **Subject** — the region's annual reported total, not any one country. Kazakhstan is the largest
  2024 contributor in this file and is not what the piece is about.
- **Comparison** — 2024 against 2019, with the 2021 floor between them and all fourteen years
  shown, so neither endpoint is chosen for convenience.
- **Limits** — as recorded, and the load-bearing one is the direction of the error. The 2024 figure
  is incomplete, which makes it an **undercount**; the crossing it establishes can therefore only
  get bigger, never disappear. A caveat that ran the other way would have killed the beat.
- **Placement** — a square social post, read muted on a phone. Nothing on the frame may depend on
  a caption.
- **Credit** — `proposeCredit({ newsroom, article })` was run. It found two marked attributions in
  the article and offered both plus `none`. Option `article-1` was taken: the article's own source
  line. Option `article-2` was declined — it proposed the release's whole headline sentence,
  127 350 and all, as a credit line, which would have printed a figure this data does not hold onto
  the frame.

## ④ The survey — what could be made of this table

Read from `references/type-survey.md` and ranked against `references/chart-choice.md`.

Supportable: **Line** (fourteen ordered periods, one continuous measure), **Slope** (two moments),
**Area**, **Bar and column**, **Choropleth** and every other map type (the table carries ISO3 codes
for 194 countries).

Not applicable, and why:

- **Bar and column** — its own sheet refuses a real time series past roughly eight periods. There
  are fourteen, and the in-between shape — the 2020–22 trough — is exactly the read.
- **Area** — its sheet refuses the fill unless the series represents an accumulated quantity.
  Annual case counts do not accumulate; filling under them would claim a running total nobody has.
- **Choropleth** — reachable, and a different story. It answers *where*, and the takeaway is
  *when*. Recorded in `SUBJECTS.md` as an angle not drawn.
- **Pie, treemap and every part-to-whole type** — nothing here sums to a whole a reader counts.

## ⑤ ⑥ ⑦ Medium, format, size

- **G2a — medium: chart.** `proposeMediums({capabilities})` returned chart, map and image all
  reachable. Chart: the argument is a trajectory in time, not a geography.
- **G2b — format: video.** `proposeFormats({medium: "chart", capabilities})` returned all four
  formats reachable, each with its producer named. Video was chosen because the argument has an
  order the reader has to be walked through: the 2019 level must exist on the frame *before* the
  series arrives, or the crossing is just a line that happens to end high.
- **G2c — size: square.** `proposeSizes("video")` offers landscape, square and portrait. A feed
  post takes square.
- `confirmFormatReachable({medium: "chart", format: "video", treatment: "Line", capabilities})`
  returned `"yes"`, which is what `reachable:` records.

## ⑧ The reference loop

Two rows from `doctrine/references/reference-set.md`, both by argument structure:

- **"a long, noisy series read against a historical level"** — ABC, *How Buddy Franklin scaled
  footy's Everest*. Every year's value plotted, the historical anchor named as a number beside it
  rather than left to the eye.
- **"deviation from a local expected rank"** — The Pudding, *Twenty years of the NBA redrafted*.
  Every mark anchored to a reference line, and colour spent only on the deviation from it.

**Answer: the first, accepted.** It is this beat's structure exactly — one long series, one
historical level — and it dictates the edit: draw the level, label it `104 442`, *then* let the
series arrive. The second's lesson is folded in: one accent, spent on 2024 alone.

## ⑨ Palette and typeface

`proposePalette({subject, newsroom, format: "video", surface: "screen"})` found **no subject
convention** for measles surveillance — `matchConvention` returned `null` and the proposal said so
— so the newsroom's own colours led. Option 1 taken: ground `#16191B`, accent `#D4A853`, measured
8.01:1. Recorded in `PALETTE.md`.

`proposeTypeface({newsroom, resolves: familyResolves, sample})` was run on this beat's own strings.
It refused Space Grotesk (not installed on this machine — the probe produced identical ink in that
family and in a nonsense one) and offered but did not recommend Courier New. Recorded in
`TYPEFACE.md` as the substrate stack with `origin: default`, the gap named.

## ⑩ Slots and candidates

One slot, two genuinely different ways of seeing these fourteen years — `assertDistinctWays` passed
them:

- **Line** — all fourteen annual totals on one time axis, with 2019's value drawn across the frame
  as a reference rule. The collapse and the return are both shapes *between* the points.
- **Slope** — 2019 and 2024 only, two dots and one segment. The crossing becomes the entire
  picture and nothing competes with it.

**Chosen: Line.** The slope was dropped for one reason: it deletes 2021. A reader who is not shown
the floor of 150 sees a rise from a high number to a slightly higher one, which is a far weaker
fact than the one the data actually holds — and it is precisely the fact the reader can only get
from the years in between.

**Producer:** `datawrapperMatch({medium: "chart", format: "video", treatment: "Line"})` returned
`null` — Datawrapper has no video implementation — so no producer question was asked and no
producer fields are recorded. That absence is the canonical custom state.
