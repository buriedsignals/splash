# USAFacts / The Viz Lab — Supreme Court tenure, one column per SEAT

- url: https://usafacts.org/articles/the-viz-lab/supreme-court-tenure/
- archive: url-list
- type: **a true gantt** — one column per seat on the court, each justice a bar spanning their own
  confirmation to their own departure against one shared, to-scale date axis
- export: web (a Flourish custom template, `iframe 748 × 3598` at `documentTop 1463`)
- readAs: the published page at 1440 × 900. A consent dialog was dismissed first — the harvester
  clicked a `button "Accept"`, recorded in the reference. Both routes `ok`; the pixel route measured
  `graphic.png`, which is the embedded frame itself and not the article page.

## What it is

*"The Supreme Court has had 116 justices. Here's who put them there."* Time runs **vertically**,
earliest at the bottom. Each column is one of the court's nine seats; each bar in it is one justice's
tenure, its length their time on the bench and its position the years they held it. The seat's
history therefore reads as an unbroken stack of bars with hairline gaps at the handovers.

The plate carries **two different row indexes on the two sides of the same axis**: on the left, the
president in office (Hayes, Garfield, Arthur, Cleveland, Harrison…); on the right, the year. Neither
is the chart's rows — the rows are the seats — so the reader gets three simultaneous ways to locate
a bar in time.

## What it does with information

**The row is the SEAT, not the person.** This is the editorial decision the whole chart rests on.
A chart with one row per justice would sort 116 people; this one has nine columns and lets the reader
watch a single chair change hands, which is what a piece about *who put them there* has to show.
Every colour change inside a column is a handover.

**Colour is the nominating president's party, and nothing else is coloured.** Two hues carry the
whole plate; a third fill, `rgb(209, 209, 203)`, carries the justices from before the party system —
a **chromaless value for the category the colour scheme cannot express**, rather than a third hue
pretending to be a party.

**A second channel carries a second category, and it is texture.** The frame's marks include
`fill url("#hatchR")` × 9, `fill url("#hatchO")` × 4 and `fill url("#hatchD")` × 4 — one hatch per
fill colour. Chief justices are hatched; the colour still says who nominated them. Two categorical
readings on one bar without a second hue.

**Every bar is outlined in the same dark stroke** — `stroke rgb(34, 34, 34)` × **121**, more strokes
than there are justices in the visible range. Adjacent bars in one column are often the same party
colour, and without the outline a seat held by three consecutive Republican nominees would read as
one long tenure. **The outline is what makes the handover visible**, and it is the single most
copyable decision here.

**Names are printed inside the bars, rotated to run along them.** A long tenure gets its name; a
short one gets a dot or nothing. The label lives in the span, so the label budget scales with the
data instead of being fought over in a gutter.

**Periods are annotated with a bracket and a sentence.** Two on the visible plate: *"From 1946 to
1953, all seats on the court were filled by judges nominated by Democratic presidents"* and *"From
1881 to 1888 all seats on the court were filled by judges nominated by Republican presidents"*, each
with a square bracket marking exactly the stretch of the date axis it is about. A third annotation
uses a leader line to one bar. **The bracket says WHICH YEARS; the sentence says why they matter.**

## What it does with style

Measured on the frame, 2 691 304 px. Ground `#F7F7F3` at **78.762 %**, with `#FFFFFF` at
**8.169 %** — the white is the annotation callouts and the gaps, not the ground. Two chromatics
carry everything: `#EC92A1` at **6.763 %** and `#89B6FF` at **3.479 %**, with `#6AA2FF`, `#EA6D81`,
`#ED9CA9`, `#EFB2BB`, `#F2B4BE`, `#ED98A6`, `#85B3FE`, `#7CADFF` as the anti-aliased and hatched
tail. Exactly two hue clusters: 350° at **7.114 %** and 217° at **3.788 %**. `shape: diverging`,
`ramped: 2` — which is the correct reading of a two-party palette.

Furniture: `#000000` at **0.231 %** and `#222222` at **0.123 %** carry the outlines and the label
text; `#3B3B3B` **0.051 %**, `#6B6B6A` **0.040 %**, `#333332` **0.036 %** the rest. `#F4CDD2`
**0.058 %** and `#F5E3E3` **0.053 %** are the hatch pattern's own light ground.

**Type inside the graphic** (`style.graphicFrame.type`, because the graphic is an `iframe`):
**three tuples and no more** — Aeonik 14 / 400 × 172 for the row and bar labels, Aeonik 12 / 400 × 44
for the year scale, Aeonik 14 / **700** × 5 for the names the annotations pick out
(`Merrick Garland` and four others). Two sizes, two weights, one family, on a chart with 116 labels.
`style.type` on this record is USAFacts' **article furniture** — Aeonik at 64/40/30/20/16/14 and
Aeonik Mono uppercase for the "THE VIZ LAB" kicker — and is not the chart's.

The graphic is `@ambert/court-tenure-chart`, a **custom Flourish template**: not a chart type off a
shelf, a purpose-built one, which is what a seat-indexed gantt requires.

## What is transferable

- **Choose the row to be the thing that persists** — the seat, the office, the constituency — when
  the story is about succession rather than about people.
- **Outline every bar in one dark stroke.** Where spans abut, the outline is the only thing that
  separates two tenures of the same colour.
- **Put the name inside the span**, rotated if the span runs the long way, so labelling scales with
  duration instead of competing in a gutter.
- **Texture as the second categorical channel**, one hatch per fill, so a bar can say two things
  without a second hue.
- **A chromaless fill for the out-of-scheme category** — `rgb(209, 209, 203)` for "before parties".
- **Bracket a stretch of the axis and write a sentence against it**, rather than annotating a bar.
- **Index the same axis twice, on opposite sides**, when two different clocks matter (presidencies
  on the left, calendar years on the right).
- **Three type tuples are enough** for a 116-row chart.

## What was not verified

**The capture is partial and I could not establish why.** The upper ~35 % of the 748 × 3598 frame is
empty ground in `graphic.png`, and the visible plate runs roughly 1877–1953; the chart's later
years, including the modern justices its headline is about, are not in the picture. Whether that is
the template's own layout, a scroll-driven build that had not finished (`METHOD.md` correction 5), or
the frame being taller than its drawn content was not established, and every reading above is
therefore made on the 1877–1953 portion only.

The exact hatch-to-category mapping (`hatchR` / `hatchO` / `hatchD`) is inferred from the three fill
colours and from the chief justices being visibly hatched; it was not read out of the template's
data. The bracket annotations were transcribed from the picture, not from the page's text. The
article page's own consent dialog was dismissed by the harvester, so this is a page in a state the
harvester put it in.
