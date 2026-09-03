---
takeaway: "Africa accounts for about two-thirds of the world's recorded wildfires, and the world's count has fallen by nearly half since it peaked in 2015."
grounding: unverifiable
claimShape: "none"
reference: "none offered — no journalist was present to name a published graphic. The beat follows this project's own static discipline and the area sheet (chart-beat/references/types/area.md): the two readings a stacked area is genuinely good at are the TOTAL, read off the top edge, and the BOTTOM band, read off its own flat baseline — which is exactly the pair this takeaway asserts, so the composition puts Africa on the floor and reads the world total off the roof"
subject: "Africa"
comparison: "the other five continents in the same stack, and the world's own 2015 peak on the same axis"
limits: "This is a count of detected fire EVENTS, not area burned, not people harmed, and not a rate. It is not comparable between countries of different size, and most of Africa's count is seasonal savanna and agricultural burning rather than the catastrophic wildfires the article's quoted explainer is about. 2026 is excluded entirely: the dataset's own description says the year is incomplete and was last updated 21 August 2026, so its 370,394 is eight months of a year drawn against fourteen full ones."
placement: "under the paragraph that quotes the dataset's own description line"
credit: "Global Wildfire Information System (2026), with minor processing by Our World in Data"
effectiveDate: "2026-08-21"
language: en
slots:
  - id: 1
    proves: "that the world's wildfire count has fallen by nearly half since its 2015 peak, and that about two thirds of what is left is in Africa"
    medium: chart
    format: static
    size: landscape
    reachable: yes
    candidates: ["Area (and stacked area)", "Line", "Bar and column"]
    intent: unrecorded
    chosen: "Area (and stacked area)"
    producer: custom
---

## What the visual shows

One stacked area, 2012 to 2025, six bands: Africa, Asia, South America, Oceania, North America,
Europe. The top edge is the world's own total, because those six entities sum to the `World` row
exactly, in every one of the fifteen years the file carries — checked row by row, not assumed.

Africa is the bottom band, in the accent. That placement is the argument, not a layout preference:
a stacked area is reliably readable in exactly two places, its top edge and its bottom band, and
this takeaway makes a claim about exactly those two things. Every band above Africa sits on a moving
floor and is drawn in a neutral step from the ground, with its own 2025 value printed at the right
edge so a reader who cannot judge a squeezed band can still read its number.

The world total falls from 1,027,500 in 2012 to a peak of 1,148,499 in 2015 and then to 626,326 in
2025 — 45% below the peak. Africa falls from 610,110 to 406,220 over the same span: 204,000 of the
world's 522,000 fewer fires, and still 65% of what is left.

## What was NOT drawn, and why

**2026 is not on the chart.** The file carries it — 370,394 world fires — and the dataset's own
description says the year is incomplete and was last updated on 21 August 2026. Drawn beside
fourteen complete years it would read as a collapse, which is the single most likely way this
dataset gets misreported. The chart stops at 2025 and says so on its own face.

**The aggregate rows are not treated as countries.** The entity column mixes nine aggregates
(`World`, six continents, `European Union (27)`, `Europe (excl. Russia)`) in with 251 countries and
territories. Any ranking of "where the count is heaviest" taken off this file without removing them
puts `World` first and `Africa` second. The six continents are used here deliberately, as a
partition; the other three aggregates are dropped because they overlap `Europe`.

**No country ranking, and no map.** A raw count of fire events ranks the big savanna countries —
DR Congo, Angola, Zambia, Mozambique — and reads, next to the article's quoted explainer about
deaths and evacuations, as a claim about wildfire disaster that this column cannot support. The
honest per-something figure would need an area or population denominator, and this file carries
neither. Recorded in `SUBJECTS.md` as an angle the article could take with a second dataset, not
as one this one can.

**Not a six-line chart.** The line sheet refuses more than five series on one frame, and six
continent lines answer a different question anyway: each continent's own trajectory, with nothing
said about the share of the whole. It was offered as a candidate and it lost for that reason.
