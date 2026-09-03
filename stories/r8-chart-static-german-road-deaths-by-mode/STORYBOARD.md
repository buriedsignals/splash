---
takeaway: "In 2025, one in six (16.4%) of the people killed on German roads was travelling by bicycle, and the rise since 2015 comes entirely from pedelecs: 214 pedelec riders were killed in 2025 against 36 in 2015."
subject: "People killed while riding a pedelec (pedal-assist e-bike) in Germany"
comparison: "Riders of bicycles WITHOUT a motor, over the same years — the sibling series the pedelec was split out of in 2014, and the one it is closing on"
limits: "The table counts deaths, not risk: nothing in the road-accident statistic records how many kilometres are ridden on a pedelec versus an ordinary bicycle, so a rising toll cannot be read as a rising danger per kilometre — Destatis says so in its own methodological note. The two bicycle columns exist only from 2014, so no series here reaches further back than that. And the 16.4% in the takeaway is the April 2026 PRELIMINARY figure; the July table it is checked against gives 462 of 2 832, which is 16.3%."
placement: "After the paragraph that states the increase is due to pedelec riders — the sixth paragraph of the piece, which gives 462, 217 and the 3.8% year-on-year rise but never says how close the two bicycle series now are"
credit: "Source: Statistisches Bundesamt (Destatis), table 46241-11, as of 7 July 2026"
effectiveDate: "2026-08-23"
grounding: "unverifiable"
claimShape: "comparison"
claimColumn: "Getoetete_Pedelecs_ab_2014"
claimEntity: "2025"
claimVersus: "2015"
claimDirection: "greater"
reference: "doctrine reference-set row \"a profile whose two dimensions disagree\" (ABC News, A century of death on Everest) — accepted; live research found no published newsroom treatment of this exact structure that could be verified"
language: "en"
slots:
  - id: 1
    proves: "Deaths of pedelec riders in Germany rose from 39 in 2014 to 214 in 2025 while deaths of riders of bicycles without a motor fell from 357 to 248, so the two series have almost converged."
    medium: "chart"
    format: "static"
    size: "landscape"
    destination: "screen"
    reachable: "yes"
    candidates: ["Line", "Slope", "Small multiples"]
    intent: unrecorded
    chosen: "Line"
    producer: "custom"
---

## ① What I read in the piece

Five claims that could be drawn, strongest first:

1. Pedelec deaths have risen roughly six-fold in a decade while total road deaths fell 18%.
2. The two bicycle series — with a motor and without — have almost converged: 214 against 248 in 2025, from 36 against 347 in 2015.
3. One in six road deaths in 2025 was a cyclist (Destatis's own headline, on preliminary figures).
4. 61.5% of cyclists killed were 65 or older, and the share is higher among pedelec riders.
5. E-scooter deaths went from a column that did not exist to 33 in five years, on 16 496 injury accidents.

## ② The confirmed takeaway, and its grounding — G1

Confirmed verbatim, above. `resolveGrounding` was run against the frozen profile and the frozen
`source/data.csv` and returned **`unverifiable`** — recorded as given.

What it could see: `2025` and `2015` placed inside `Jahr [1979, 2025]`, which places a numeral and
confirms nothing.

What it could NOT see, in its own words: *"this claim names `Getoetete_Pedelecs_ab_2014`, which the
profiler REFUSED to type (looked numeric but "-" is not, so the column stays text) — so the column
the claim is about carries no range to check it against, and deciding it against
`Getoetete_Insgesamt` … instead would answer a question nobody asked."* The refusal is right and it
is total: `214` and `36` are both cells the frozen table holds verbatim, in the rows for 2025 and
2015, and neither could be confirmed.

**The second G1 question**, asked and answered: this is a **comparison**, on
`Getoetete_Pedelecs_ab_2014`, between 2025 and 2015, with 2025 the greater. Recorded above. The
recorded answer changed nothing, for the same reason: a column typed `text` carries no maximum,
minimum, comparison or total to read.

**What the check therefore did not catch, and I am recording instead of letting it pass.** Destatis
published 16.4% as a preliminary figure in April 2026. The July table gives 462 cyclists of 2 832
road deaths, which is 16.3%. Nothing in this toolchain can compute a ratio between two columns, so
it reported `unverifiable` rather than `contradicted`. The discrepancy is real, it is in `limits`,
and the chart does not print the 16.4%.

## ③ The journalist's hand

| Question | Answer |
| --- | --- |
| Who is the subject? | People killed while riding a pedelec |
| What does the reader compare it to? | Riders of bicycles without a motor, same years |
| What does this data NOT let you conclude? | Anything about risk per kilometre — see `limits` |
| Which paragraph does it follow, and what does the text already say? | The paragraph giving 462 / 217 / +3.8%; it never says how close the two series are, so the chart carries the convergence and not those three numbers |
| Who does this come from, how do you credit them, as of what date? | Destatis, table 46241-11, status 7 July 2026 |

`proposeCredit` was run. It read one attributing sentence out of the article and recommended it as
the credit line; it was a translated gloss of a quotation, 150 characters long, carrying a statistic
and markdown emphasis. It did not read the article's own `Publisher:` line or its "Where these
numbers come from" section. The escape was used and the credit above written by hand.

## ④ The survey

Intent: *show a measured trend over time* (`references/chart-choice.md`). Surviving types, ranked:
Line, Bar/column, Area, Small multiples. Removed by hard requirement: Bump (needs a rank per period
and there are two series), Choropleth and every map type (no region key in this table), Calendar
heatmap (annual grain), Histogram / Beeswarm / Box plot (this is a series, not a distribution),
Connected scatter (one axis here is the calendar, which that sheet refuses by name).

Kept as candidates: **Line**, **Slope**, **Small multiples** — three ideas, not three labels.
`assertDistinctWays` accepted the set.

## ⑤ Medium — G2a

**Chart.** No geography in the table (`Ortschaft` is inside/outside built-up areas, not a place),
no photograph.

## ⑥ Format — G2b

Asked with `formatPublicationFormatGate`, all four options shown with their reachability.
Answered: **Static / print**. `confirmFormatReachable({medium: "chart", format: "static"})`
returned `yes`.

## ⑦ Size and destination — G2c

`proposeSizes("static")` offered landscape, square, portrait. Answered: **landscape** — this is an
article graphic on a wide measure, and the argument is twelve years of horizontal axis.
`formatPublicationDestinationGate` asked screen or print. Answered: **screen**.

## ⑧ The reference loop

`doctrine/references/reference-set.md` holds no row for this argument structure — one component of a
falling total rising fast enough to converge on its sibling. Live research was run and turned up no
published newsroom treatment of it that could be verified to a specific moment.

The closest row is *"a profile whose two dimensions disagree"* (ABC News, **A century of death on
Everest**): the chart lets the dimension a reader expects to matter register first, unqualified, and
the text then names the dimension that contradicts it, with figures. Accepted, and it is what the
chart does here — the two lines are drawn as counts, honestly, and the caveat that the table records
no exposure is in `limits` and in the beat's own note rather than softened into the picture.

## ⑨ Palette and typeface

`proposePalette` found no subject convention for "people killed while riding a pedelec in Germany"
and led with the newsroom's own colours. Option 1 recommended and accepted: `#D4A853` on `#16191B`,
measured at **8.01:1**, clear of the 3:1 non-text floor. Recorded in `PALETTE.md`.

`proposeTypeface` measured both recorded faces against this story's own strings. Space Grotesk does
not resolve on this machine; Courier New does but is monospaced. Recommended and accepted: the
substrate's own stack, `origin: default`. Recorded in `TYPEFACE.md`.

## ⑩ The slot, and the candidates

**Slot 1 — the two bicycle series converge.**

1. **Line** — chosen. A continuous series read against an ordered axis. Twelve years, two series,
   one rising steeply toward the other; the crossing that has not happened yet is the story, and
   only a continuous axis shows how close it is. The sheet refuses more than five series; this beat
   draws two.
2. **Slope** — the same two endpoints for every mode of travel at once, so the pedelec is the one
   line going the other way. Lost because the raw magnitudes run from 7 (buses) to 1 210 (car
   occupants) and a raw slope of all nine modes is unreadable; indexing them would answer a
   different question from the one the takeaway asks.
3. **Small multiples** — one panel per mode over the same years. Lost because two series overlaid
   in one frame is exactly the case that sheet names as its own documented mistake: the convergence
   IS the comparison, and faceting would tear it into two frames.

`datawrapperMatch` found a faithful mapping (`d3-lines`) and `formatProducerGate` asked the
question. Answered: **custom** — the beat has to draw a series that begins in 2014 because the
publisher's column begins in 2014, and label that boundary; a mapped Datawrapper line chart would
draw the two columns and say nothing about why they start where they do.
