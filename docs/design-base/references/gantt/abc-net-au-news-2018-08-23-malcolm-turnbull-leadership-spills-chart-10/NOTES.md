# ABC News (Australia) — the last eight leaderships of each party, in days

- url: https://www.abc.net.au/news/2018-08-23/malcolm-turnbull-leadership-spills-chart/10152464
- archive: url-list
- type: **duration bars with the span in the row label**, grouped into three named blocks — not a
  positioned-span gantt: the axis is days from zero, not a date scale
- export: web (a Datawrapper embed, `iframe 614 × 960` at `documentTop 1427`, frame
  `datawrapper.dwcdn.net/TLko4/3`)
- readAs: the published page at 1440 × 900, no consent dialog and no entry screen. Both routes
  `ok`; the pixel route measured `graphic.png`, which is the embedded frame.

## What it is

*"The last eight party leaderships have varied drastically in length."* Twenty-four rows in three
blocks — Labor Party, Liberal Party, National Party — each row a leader, each bar the number of days
they held the leadership, the count printed inside the bar in white and the years printed in the row
label beside the name.

## What it does with information

**The row label carries the name AND the span: `Bill Shorten | 2013 - '18`.** Same solution as
AJLabs reaches on a different desk, a different continent and a different subject: when the bar's
length is a duration, the dates go in the gutter, and the bar is then free to be a plain
comparable length. The pipe character separating the two is doing the work of a second column
without costing one.

**An unbounded span is written as a trailing dash and nothing else.** `Malcolm Turnbull | 2015 -`,
`Michael McCormack | 2018 -`, `Barnaby Joyce | 2016 - '18`. There is no "present", no "ongoing", no
arrowhead: the absent second date IS the mark. Three rows on this chart were still running when it
published, and their bars are drawn to their length so far with no visual disclaimer at all — which
is honest about the number and silent about the fact that it is still growing.

**The year form is asymmetric on purpose**: the opening year in full, the closing year abbreviated
with an apostrophe — `2013 - '18`, `1996 - '01`, `1984-'89`. The full year anchors the reader; the
short one is a delta they can compute in their head. Across 24 rows that is 24 fewer digits with no
loss.

**Rows are grouped by party under bold subheads, and within each block ordered most recent first.**
The blocks are the same three groups as the colour, so the colour is redundant with the grouping —
deliberately, because the block is what a reader scans and the colour is what they remember.

**A track behind every bar shows the full width of the plot.** Every row has a pale rail running to
the axis maximum, so a 79-day bar (Kevin Rudd, 2013) is legible as a stub against something rather
than as a fleck floating in white.

## What it does with style

Measured on the 589 440-px frame. Ground `#FFFFFF` at **45.973 %** and — the number worth keeping —
`#F2F2F2` at **36.404 %**: the track behind the bars is more than a third of the entire plate. On a
duration chart most of the ink is *unspent time*, and this desk chose to draw it rather than leave
it white.

Three chromatics, one per party, and a clean categorical read: `#009966` at **5.450 %** (National),
`#4776BE` at **4.585 %** (Liberal), `#C04745` at **3.465 %** (Labor). Three hue clusters — 160° at
**5.505 %**, 216° at **4.623 %**, 1° at **3.504 %** — and `shape: categorical`, the only categorical
palette in this family. The tail (`#648CC9`, `#0B9D6C`, `#049A68`, `#E3ACAB`, `#C24C4A`, `#29AA7F`,
each ≤ 0.008 %) is anti-aliasing; `#1AA2CE` at **0.013 %** is Datawrapper's own source-link blue and
is furniture, not a series.

Furniture: `#333333` at **0.523 %** (labels), `#000000` **0.269 %**, and the grey ramp `#ECECEC`
**0.159 %**, `#D4D4D4` **0.142 %**, `#E4E4E4` **0.141 %**, `#C3C3C3` **0.141 %**, `#BCBCBC`
**0.145 %**, `#8C8C8C` **0.140 %** — the block rules and the row separators.

**Type inside the graphic** (`style.graphicFrame.type`, the graphic being an `iframe`): Roboto
12 / 400 × **48** for every row label and every in-bar number, Roboto 12 / **700** × 3 for the three
party subheads, Roboto 22 / 500 for the title, Roboto 14 / 400 for the deck, Roboto 11 / 400 for the
source line. **One family, four sizes, two weights, and the ONLY weight change in the whole plate is
the three group subheads.** `style.type` on this record is ABC News' article furniture and is not
the chart's. The frame reports `marks: []` — Datawrapper draws its bars as HTML, not SVG, so the
style route finds no marks and the colours above come from the pixel route alone.

## What is transferable

- **`Name | start - end` in the row gutter.** One line, no extra column, and the duration reading is
  safe.
- **A missing end date, written as a trailing dash, is the whole notation for "still running".**
- **Abbreviate the closing year, never the opening one.**
- **Draw the track.** A third of this plate is the time each leader did not get, and without it the
  short tenures have nothing to be short against.
- **Group into named blocks and let colour repeat the grouping.** Redundancy between block and hue
  is not waste; it is what lets a reader leave and re-enter the chart.
- **Reserve the bold weight for the group subheads and nothing else.**

## What was not verified

This is **not a gantt** and no gantt treatment may cite it as one: its horizontal axis is days from
zero, so two leaderships a century apart sit at the same place on the plate and the 2007–2013 gap in
the Liberal block is invisible. It is filed for what it does with the row gutter, the open end and
the track.

Datawrapper renders in HTML, so `style.graphicFrame.marks` is empty and no mark colour was read by
the style route; the three party hexes are pixel-route readings only and have not been corroborated
against a DOM. The bar values (`1,775`, `79`, `4,686`…) were transcribed from the picture. The
chart is dated 2018 and the "still running" rows have since ended; that does not affect what the
notation does. One publication.
