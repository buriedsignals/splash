---
takeaway: "Rail passengers rose from 58.2 million in 2014 to 74.6 million in 2025 while punctuality fell from 91.4 per cent to 81.6 — and 2020, when almost nobody travelled, is the one break in both series."
subject: "The national rail network's own two readings, 2014 to 2025 — passengers carried, and the share of trains that ran on time"
comparison: "2025 against 2014 on each measure, every year in between shown, and 2020 against both — the one year that moves the wrong way on both readings at once"
limits: "Twelve annual readings and nothing else. The table records passengers and punctuality side by side; it does not record why either moved, so nothing here shows that more passengers CAUSE later trains — the two series are counted, the link between them is not. 2020 and 2021 are pandemic years and the article says so; the data itself carries no marker for that, and no reader could tell it from the numbers alone. Punctuality is a share of trains, not of passengers: a year when almost nobody travelled is not a year when the network got better at moving people. No definition of on time, no confidence interval, no operator breakdown."
placement: "Front page, standing on its own — the reader meets it before the article's own first paragraph, so it has to carry the whole argument without the text beside it."
credit: "unattributed"
effectiveDate: "2026-08-21"
grounding: "unverifiable"
reference: "ABC News (Australia), \"Conquering Mount Everest: High hopes and broken dreams\" (2 June 2019) — a profile whose two dimensions disagree; accepted for slot 1. Its lesson is the build: give each dimension its own honest reading, in sequence, with numbers, rather than softening the first or skipping the second. The ABC's \"How Buddy Franklin scaled footy's Everest\" (26 March 2022) was shown beside it for the second half — naming the historical anchor as a number instead of leaving \"in decline\" to the eye — and was not chosen as the structure."
language: "en"
slots:
  - id: 1
    proves: "Across twelve years the two readings the railway publishes about itself move in opposite directions — passengers up from 58.2 to 74.6 million, punctuality down from 91.4 to 81.6 per cent — and 2020 is the single year that breaks both, in opposite directions again."
    medium: "chart"
    format: "video"
    size: "landscape"
    reachable: "yes"
    candidates: ["Line", "Connected scatter"]
    chosen: "Line"
---

## ① What was read in the article (restitution)

Three claims in the piece could become visual, and the frozen table carries all three:

1. **Passengers rose from 58.2 million in 2014 to 74.6 million in 2025.** Both numbers are in
   `passengers_millions`, and every year in between is there too. This is half the beat.
2. **Punctuality fell from 91.4 per cent to 81.6 over the same period.** Both numbers are in
   `punctuality_pct`, on the same twelve rows. This is the other half.
3. **2020 broke both.** 28.1 million passengers — the lowest reading in the table — and 94.6 per
   cent on time, the highest. The article gives the reason: almost nobody travelled. The reason is
   not in the table, and is recorded in `limits` rather than asserted on the frame.

## ② Gate 1 — the takeaway, and what the data says about it

`resolveGrounding(takeaway, profile, { csv })` was run against the frozen `source/data.csv` before
anything was picked. Verdict: **`unverifiable`**, which closes G1 and is not a refusal.

What the check could see: `2014`, `2025` and `2020` are all inside `year` [2014, 2025] —
placed, which is not the same as confirmed.

What it could NOT see, and this is the honest half: **every one of the five measured numerals came
back unplaced.** `58.2 million`, `74.6 million`, `91.4`, `81.6` and `94.6` are each the exact value
the frozen table holds for the year the same clause names, and the check refused all five with one
reason — *"the claim names 2 of this profile's measures, so nothing says which one it is about"*.
The takeaway is one sentence carrying both measures, each in its own clause. The check reads
sentences, not clauses. It even named the right column for each numeral in its own refusal text.

So the verdict is `unverifiable` because the story has two series, not because anything about the
sentence is doubtful. Recorded as such, said out loud here, and not upgraded.

## ③ The journalist's hand

- **Subject** — the network's own two readings, not the maximum of either. The 2025 passenger
  figure is the biggest number in the table and is not what the piece is about.
- **Comparison** — 2025 against 2014 on each measure, with 2020 as the third reference point.
- **Limits** — as recorded. The one the journalist insisted on: the two series moving in opposite
  directions is not evidence that one causes the other, and 2020 makes that plain — punctuality
  went UP in the year passengers collapsed, which is the correlation without the causation, drawn
  from the newsroom's own data.
- **Placement** — front page, standing alone, so the frame carries the argument unaided.
- **Credit** — `proposeCredit({ newsroom, article })` was run. The article attributes these figures
  to nobody; the recommendation was `none`, and the journalist took it. The artefact prints
  `Source: not stated`, which is the truth about this table.

## ④ The survey — what could be made of these twelve rows

Read from `references/type-survey.md` and ranked against `references/chart-choice.md`.

Could be supported: **Line** (twelve ordered periods, two continuous measures), **Connected
scatter** (two measures, one order), **Small multiples** (a layout, not a type — the way the Line
candidate is actually drawn here), **Area**, **Bar and column**.

Not applicable, and why:

- **Slope** — needs exactly two moments per category. There are twelve. Drawing 2014 against 2025
  as a slope would discard ten years, and the ten years are where 2020 lives.
- **Bar and column** — the sheet refuses a real time series past roughly eight periods: twelve
  columns turn into a comb and the in-between shape is exactly the read.
- **Choropleth, and every map type** — no region key in the table.
- **Pie, treemap, marimekko, and every part-to-whole type** — nothing here sums to a whole.
  `passengers_millions` totals 721.5 across twelve years, which is a quantity nobody counts.

## ⑤ ⑥ ⑦ Medium, format, size

- **G2a — medium: chart.** No geography, no photograph.
- **G2b — format: video.** `proposeFormats({medium: "chart", capabilities})` returned all four
  reachable. The journalist asked for video for the front page and kept it.
- **G2c — size: landscape.** `proposeSizes("video")` offers landscape, square and portrait. A front
  page takes landscape.

## ⑧ The reference loop

Two references from `doctrine/references/reference-set.md` were shown, both by argument structure:

- **"a profile whose two dimensions disagree"** — ABC News, *Conquering Mount Everest*. Everest is
  profiled on the dimension a reader expects to matter (raw annual deaths), that reading is allowed
  to land unqualified, and only then does the piece pivot to the dimension that contradicts it
  (the fatality rate). The transferable lesson: **a profile whose two dimensions disagree earns
  that disagreement by giving each one its own honest reading, in sequence, with numbers.**
- **"a long, noisy series read against a historical level"** — ABC, *How Buddy Franklin scaled
  footy's Everest*. Its lesson is narrower: name the historical anchor as a number rather than
  leaving the trend to the reader's eye.

**Answer: the first, accepted.** It is this beat's exact structure — one railway, two readings
about it that disagree — and it dictates the edit: passengers first, alone, allowed to land; then
punctuality; then 2020 against both. The second's lesson is folded in rather than chosen: every
value the build asserts is printed as a number.

## ⑨ Palette and typeface

`proposePalette` found no subject convention for rail punctuality — said so — and led with the
newsroom's colours. Recorded in `PALETTE.md`. `proposeTypeface`, measured on this machine with
`familyResolves`, refused Space Grotesk (not installed — resvg would have drawn the fallback
silently) and did not recommend Courier New (monospaced, a distraction in a chart's own numbers).
Recorded in `TYPEFACE.md` as the substrate stack with `origin: default`, the gap named.

## ⑩ Slots and candidates

One slot. Two genuinely different ways of seeing these twelve rows — `assertDistinctWays` passed
them:

- **Line** — each measure on its own panel, its own fitted scale, one shared time axis. The
  trajectory of each is the read.
- **Connected scatter** — passengers against punctuality, years joined into one path, so the
  pandemic reads as a loop out and back.

**Chosen: Line, drawn as two stacked panels.** The connected scatter was dropped for one reason the
journalist gave: on the front page, unaccompanied, a path that doubles back needs a caption to be
read at all, and there is no caption.

**And a dual axis was refused explicitly.** Two measures on one set of axes, each with its own
scale, is the shape this beat most obviously invites. `chart-beat/references/types/line.md` refuses
it in its own words — *"never give two series their own, independently-scaled y-axis: a reader
assumes one shared scale, so a 'line went up' on the left axis and a 'line went down' on the right
axis can describe the same magnitude of change and still look like opposite stories. Index both
series to a common base, or split the frame in two."* Of the two remedies it offers, indexing to
2014 = 100 would hide the two figures the takeaway states, so the frame is split in two.

**Producer:** `datawrapperMatch({medium: "chart", format: "video", treatment: "Line"})` returned
`null` — Datawrapper has no faithful video implementation — so no producer question was asked and
no producer fields are recorded. That absence is the canonical custom state.
