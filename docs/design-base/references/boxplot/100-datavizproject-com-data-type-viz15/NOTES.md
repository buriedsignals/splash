# 100 datavizproject — #15, the range plot with a summary lane

- url: https://100.datavizproject.com/data-type/viz15/
- archive: datavizproject
- type: range plot — one lane per category on a shared value axis, each lane a pair of capped
  rules joined by an arrow; a fourth lane holds the summary (`AVG.`)
- export: static raster (`img`, 823 × 823, `documentTop` 172, `nearTheTop: true`)
- readAs: the graphic as the page draws it, at rest
- routes: style `ok`, pixel `ok` (`measuredFrom: "graphic.png"`), no consent dialog, no entry click


> **Also filed under `gantt`.** One page can carry more than one
> form, and each record is an independent measurement of it. Wherever this page is cited it counts
> as **one publication** for the evidence floor, whichever family does the citing.

## What it is

**The closest thing to a distribution summary that exists anywhere in this archive, and it is not
a box plot.** All one hundred encodings on `100.datavizproject.com` draw the same six numbers —
World Heritage sites for Sweden, Denmark and Norway in 2004 and 2022 — so a five-number summary is
arithmetically impossible here and none of the hundred attempts one. What `#15` draws instead is the
box plot's *skeleton*: a value axis, one lane per category, and inside each lane a range stated by
two horizontal caps.

I looked at all one hundred thumbnails on three contact sheets before harvesting; the reasoning and
the four encodings I refused are written into the pool file.

## What it does with information

**Each category is a lane, and the range inside it is drawn as two caps joined by a thin rule with
an arrowhead.** That is the whisker's anatomy exactly — a cap at each end of a stated interval —
carrying two dated values rather than two quartiles. The arrowhead is doing a job a box plot's
whisker never does: it gives the interval a *direction* (2004 → 2022), because here the two ends are
ordered in time rather than in rank.

**The ends are labelled by what they are, not by what they equal.** `2004` sits under the lower cap
and `2022` above the upper one; the numbers themselves are left to the axis (0–16, gridlines every
one, labels every two). A box plot's `Q1` / `median` / `Q3` labelling is the same decision.

**A fourth lane, `AVG.`, holds the summary of the other three, and is set apart by colour rather
than by position.** It sits in the same row, on the same axis, at the same width — nothing in the
layout says it is a different kind of thing. Its grey does.

**The gridlines are drawn per lane, not across the frame.** Each of the four lanes carries its own
short horizontal ticks; there is no full-width rule anywhere on the plate. The lanes read as four
separate readings of one scale rather than one wide chart.

**Nothing else is on the plate** — no title, no legend, no unit, no source, no n.

## What it does with style

Measured on this record's own `graphic.png` (`pixel.ground`, `pixel.chromatic`, `pixel.neutral`):

- ground **`#FFFFFF` at 97.672 %** — the plate is almost entirely paper; the marks are hairlines.
- chromatic **`#EE5440` at 0.095 %** (7°, Denmark) and **`#3274DA` at 0.082 %** (216°, Sweden); the
  eight entries below them (`#F5998D`, `#F17262`, `#558CE0`, `#95B7EC`, `#B3CCF1`, `#C2D6F4` …) are
  antialias tints of those same two hues, which is what a chart drawn entirely in 2 px rules looks
  like to a pixel counter.
- **Norway's navy `#283250` (0.091 %) and the AVG. lane's grey `#7E8B93` (0.107 %) are both filed
  as NEUTRALS**, not as palette, because their chroma is below the route's chromatic floor. So
  `pixel.shape` reports `diverging, 2 clusters` (7° and 216°) where a reader sees three entities and
  a summary. Same defect the scatter family recorded on Ferdio's navy, here with a second victim.
- the furniture is the two lightest neutrals: **`#E3E9ED` at 0.267 %** and **`#CDD8DE` at 0.119 %**
  — the per-lane gridlines and the caps' shadow of a rule.

**The palette's own arithmetic is the point.** The AVG. grey is *heavier* on the plate (0.107 %)
than either coloured entity (0.095 %, 0.082 %) and still reads as furniture, because lightness and
chroma, not area, are what say "this mark is not one of the things being compared."

## What is transferable

- **A summary lane beside the entity lanes, in neutral, at the same width and on the same axis.**
  The average is present, comparable, and visibly not a competitor.
- **An interval stated by two caps, labelled by which end it is rather than by its value**, with the
  number left to the axis.
- **Per-lane gridlines instead of full-width rules**, when several distributions share one scale but
  are not to be read across.
- **An arrowhead when the two ends of an interval are ordered** — and, by contrast, its absence when
  they are not, which is the box plot's ordinary case.

## What is this piece's own

Ferdio's red / blue / navy triad, its house sans, and the six-number dataset that forces every one
of the hundred encodings to summarise nothing.

## What was not verified

- **The graphic is a raster `img`, so its own lettering was never read.** `record.style.type` on this
  record is the *host page's* furniture — `stevie-sans`, `Borgia Pro`, Ferdio's site chrome — and
  none of those tuples describes a single label on the chart. Nothing about this chart's type is
  quoted above.
- **One publication.** This record and `…viz53` are one desk, one designer, one dataset. They
  corroborate nothing between themselves (`METHOD.md`, correction 4).
- Whether an `AVG.` of three countries is a mean or a median is not stated on the plate and was not
  checked against the archive's prose.
