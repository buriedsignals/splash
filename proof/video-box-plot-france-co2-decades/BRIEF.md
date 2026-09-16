---
format: video
size: landscape
type: boxplot
---

# Beat — Les émissions de CO2 par personne en France ont culminé dans les années 1970 (video)

**Type:** box plot (chart). **Medium/format:** chart / **video**. **Size:** landscape (1920 × 1080).

Same subject, same frozen file (`../more-boxplot-france-co2-decades/data.csv`, Global Carbon Budget 2025 via Our World in
Data) and the same derivation as the directed still `proof/more-boxplot-france-co2-decades` (`DirectedBoxplot.tsx`):
France's 75 annual readings 1950–2024 bucketed by decade, each decade summarised by that beat's own `summarizeDecade`
(quartiles, Tukey fence, fence-clipped whiskers). Asserted: only France in the file; 75 readings; seven full decades and
one partial (2020–24, n = 5); the median peaks in the 1970s (9.96 t) and falls in every decade after it, to 4.27 t; one
outlier, 1980's own reading (9.54 t) in the 1980s.

## The argument, in one sentence

Each decade's ten years gather into one column and the box is drawn out of them — the middle half, the median, the
whiskers, the one year beyond them — then a single median walks the decades: up twice to the 1970s, down at every step
after.

## The picture — shots, not a page

1. **The title card** (from frame 0, 1.5 s).
2. **The story** — the value axis (ticks, the unit on the top one) and the decades named under their slots; the readings,
   then the boxes beside them.
3. **No end card** — the video ends on the whole box plot: every box beside its readings, the 1970s in the accent with its
   median printed, the 2020s median printed, the outlier ringed; the credit on one line.

## The choreography — an argument, not a reveal

A box is a summary a viewer has to take on trust. The video shows **where it comes from** (the years it summarises) and
then **compares** the summaries with one mark sliding from median to median.

| event | what the shot says | gesture | what the viewer sees move | derived value asserted |
| --- | --- | --- | --- | --- |
| `establish` | the question | — | the title card | — |
| `reference` | France, year by year | **reveal in order** | the ticks and the decade names; the 75 annual readings appear in chronological order, each at its year inside its decade's slot, at its value | every reading at `y(value)`; 2020–24 fills half its slot |
| `reveal` | a box is its decade's years | **gather + split** | decade after decade, the readings slide sideways into one column, keeping their heights; the median draws through them, the box opens from it to Q1 and Q3, the whiskers run to the furthest years inside the fence and the one year beyond them is ringed; the box, whiskers and ring lift out to the right, leaving the readings beside them | quartiles and whiskers from `summarizeDecade`; the ring on 1980's 9.54 t, the only reading past a whisker |
| `subject` | the peak, and every decade lower after it | **compare (slide onto)** | a copy of the 1950s median, in the accent, slides to each next box at its own height and then climbs or drops onto that box's median: up, up to the 1970s — which takes the accent, « 10,0 » — then down at each of the five steps after; « 4,3 » as it lands on the 2020s | two climbs then five drops, each landing on the next median |
| `conclusion` | the whole box plot | **pull back** | the walking median dissolves into the 2020s' own; the credit | every box at its place, the readings beside it |
| `hold` | the box plot | — | nothing | hold = conclusion |

## Write as little as the picture allows

The ticks (the unit « t » on the top one), the decade names (the partial one named by its years, « 2020–24 »), « 10,0 »
and « 4,3 ». No standfirst, no reading line, no « n = »: the half-filled slot and the five dots show the partial decade.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.mp4`, `renders/<id>-final-frame.png`, `renders/<id>-props.json`.
