---
takeaway: "Broadband coverage does not follow a municipality's size: across the 186 municipalities surveyed in June 2025, the smallest towns are no worse served than the largest, and coverage runs the full width of the range at every scale."
grounding: unverifiable
reference: "none offered -- no journalist was present to name a published graphic, so the beat follows this project's own static discipline and the scatter sheet (chart-beat/references/types/scatter.md) instead of an outside model"
subject: "whether coverage tracks the size of the municipality"
comparison: "each of the 186 municipalities' coverage against its own household count -- 240 households at the small end, 47,933 at the large end, and the same 32-99 per cent spread at both"
limits: "6 of the 186 municipalities returned no figure and are plotted as gaps; Commune-063 returned 104.2 per cent, which no percentage can be, and the agency has not explained it"
placement: "under the headline claim that fast broadband stops at the edge of town, which this chart tests"
credit: "unattributed"
effectiveDate: "2025-06-30"
language: en
slots:
  - id: 1
    proves: "that a municipality's size does not predict its broadband coverage"
    medium: chart
    format: static
    size: landscape
    reachable: yes
    candidates: ["Scatter (and bubble)", "Dot strip", "Box plot"]
    intent: unrecorded
    chosen: "Scatter (and bubble)"
    producer: datawrapper
    datawrapperType: d3-scatter-plot
---

## What the visual shows

One dot per municipality: household count on the horizontal axis, broadband coverage on the
vertical. All 186 rows are sent, including the six that returned no figure -- those carry an empty
value rather than being dropped, so the upload and the survey hold the same number of rows.

The cloud is flat. A municipality of 240 households and one of 47,933 sit inside the same 32-99 per
cent band, and the correlation between the two columns is -0.07 -- close enough to nothing that the
headline's "edge of town" framing has no support in this table.

A rule is drawn at 100 per cent, the ceiling a coverage percentage cannot pass, and one dot sits
above it: Commune-063, at 104.2. It is kept in the chart and named in an annotation rather than
quietly removed, because the article already reports the agency's silence about it and a reader who
finds the figure in the table should find it in the graphic too.

## What was NOT drawn, and why

The article's own regional claim -- "Ouest and Centre are consistently above the national picture,
Sud consistently below it" -- is not what this table says. Regional means are Nord 65.2, Est 65.0,
Centre 64.9, Ouest 63.6, Sud 62.5 against a national mean of 64.2: Ouest is BELOW the national
figure, not above it, and the five regions' inter-quartile ranges overlap almost completely. A
region beat would have had to either repeat a claim the frozen data refutes or spend its one visual
refuting it. The size claim is the one the data can actually settle, so that is the beat.
