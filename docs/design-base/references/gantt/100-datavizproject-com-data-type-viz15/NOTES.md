# Ferdio / 100.datavizproject.com — #15, span arrows between two dated levels, plus an average column

- url: https://100.datavizproject.com/data-type/viz15/
- archive: datavizproject
- type: vertical range/span chart — one column per entity, an arrow from the 2004 level to the
  2022 level, both ends capped and labelled with their date, and a fourth column for the average
- export: static (a raster served in the page, `img 823 × 823` at `documentTop 172`, `nearTheTop`)
- readAs: the published page at 1440 × 900, read at rest. Both routes `ok`; the pixel route
  measured `graphic.png`, so the colours below are the graphic's own and not the site's chrome.


> **Also filed under `boxplot`.** One page can carry more than one
> form, and each record is an independent measurement of it. Wherever this page is cited it counts
> as **one publication** for the evidence floor, whichever family does the citing.

## What it is

**It is not a gantt, and it is the closest geometry this archive has to one.** Recorded plainly,
because the whole `100.datavizproject.com` draw returned no gantt: the site encodes ONE dataset —
World Heritage site counts for Denmark, Norway and Sweden in 2004 and in 2022 — and that dataset
carries no durations at all. Nothing in it has a start and an end in time, so no bar anywhere in the
hundred can have length = elapsed time, which is the one thing a gantt exists to draw.

What #15 does draw is the SHAPE of a gantt row with time taken out of it: one row (here a column)
per named entity, one shared continuous scale, and a mark that spans from a start position to an end
position rather than growing from zero. Read as span geometry it is directly informative; read as a
gantt it would be a lie, and it is filed as the first.

## What it does with information

**Both ends of the span are labelled, and each label is the DATE, not the value.** `2004` sits under
the lower cap, `2022` above the upper cap, and the value is left to the axis. That inverts the usual
priority: the reader is told WHEN each end is, and reads WHAT it is off the scale. A gantt row needs
exactly this, because on a date axis the position IS the value and the only thing worth printing at
a cap is which boundary it is.

**The span is drawn as an arrow, so it has direction.** The bar does not merely occupy an interval;
it points from the earlier state to the later one. On a value axis this is what turns a range into a
change. A gantt bar on a date axis gets direction for free — time runs one way — which is why this
device is a lesson about ranges rather than one to copy wholesale.

**A fourth column is an aggregate, and it is drawn in the same geometry and a different colour.**
`AVG.` is not a row of data; it is the reference the three rows are read against, and it is admitted
into the chart as a full column rather than a dashed line. Its span runs roughly 7.3 → 11 — the
figure `100.datavizproject.com`'s own #100 prints as `7.3 → 11, +75.1 %` — so the reader can see any
one country's span against the group's without arithmetic.

**Rows are ordered by the ending value, descending** — SE, DK, NO — not by the size of the change.
Denmark's span is by far the longest and it sits second, so the ordering serves comparison of levels,
not of movement.

## What it does with style

Ground `#FFFFFF` at **97.672 %** of the 678 152-pixel clip — the graphic is almost entirely white,
and the entire chart is under 3 % of it. Chromatic marks: `#EE5440` at **0.095 %** (Denmark),
`#3274DA` at **0.082 %** (Sweden), with a tail of tints from the anti-aliased caps and arrowheads —
`#F5998D`, `#F17262`, `#F27B6C`, `#558CE0`, `#95B7EC`, `#79A4E7`, `#B3CCF1`, `#C2D6F4`. Norway's
navy reads as neutral, `#283250` at **0.091 %**. Two hue clusters only, 7° at 0.225 % and 216° at
0.162 %; `shape: diverging`, `ramped: 2`.

Furniture: the neutral list holds `#E3E9ED` at **0.267 %**, `#F6F8F9` **0.189 %**, `#F3F5F6`
**0.177 %**, `#CDD8DE` **0.119 %** and `#7E8B93` **0.107 %**. The gridlines, the axis numerals and
the grey AVG. column all land somewhere in that list and the record does not separate them.

**The proportion is the reading worth carrying.** A span chart is mostly empty by construction: the
marks are two caps and a stem per row, so 97.7 % ground is not restraint, it is the form. The
consequence is that every one of the four columns has to be legible at well under one percent of
the plate's ink, which is why the caps are heavy rules rather than thin ticks.

## What is transferable

- **Label the two ends of a span with their boundaries, and leave the magnitude to the axis.**
- **Admit the aggregate as a row of the same geometry**, in a fourth colour, rather than as a rule
  behind the data.
- **Cap the span at both ends with a rule wider than the stem.** At this ink budget an uncapped line
  has no readable start or end.
- **Two hues and one navy carry three entities**; the tail of nine further hexes in the record is
  anti-aliasing, not a palette.

## What was not verified

The graphic is a raster, so **the chart's own typography was not measured**. `style.type` in this
record is `100.datavizproject.com`'s article furniture — stevie-sans and Borgia Pro, the sizes and
colours of the site's headings, captions and nav — and is not the chart's. The AVG. column's exact
endpoint values were read off the axis and against #100's printed figures, not from a data table.
One publication. And to say it once more where it will be read: **this reference is not a gantt**,
and nothing in a gantt proposal may cite it as evidence that a publication draws one.
