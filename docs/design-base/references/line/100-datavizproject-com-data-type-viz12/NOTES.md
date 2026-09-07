# 100 datavizproject — #12, nested circles

- url: https://100.datavizproject.com/data-type/viz12/
- archive: datavizproject
- type: nested circles
- export: static
- readAs: the encoding as the page draws it, read at rest

## What it is

The same dataset as #1, encoded as three pairs of concentric circles — one pair per country, the
2004 value drawn inside the 2022 value.

## What it does with information

**One mark carries the change.** The earlier value is nested inside the later one, so growth reads
as the visible ring between them rather than as a comparison the eye has to make between two
separate marks. Nothing has to be held in memory.

**Both values are printed, inside their own circles.** The ring is the qualitative signal; the two
numbers are the quantitative one, and neither is left to the reader to infer.

**Time is not an axis.** With two observations per series, the piece does not draw a line: it draws
before and after as one nested object. A two-point series is not a line chart.

## What it does with style

The house triad again, on white. Country names set beneath their pair as plain direct labels.

## What is transferable

- **Nest the earlier value inside the later one** when a series has exactly two observations and
  the story is the change: the ring is the change, and one mark replaces two.
- **A two-point series is not a line.** Drawing a line between two points invents a trajectory the
  data does not contain.

## What is this piece's own

The house palette; the choice of circle over any other nestable shape.

## What was not verified

Whether the nesting is area-true or radius-true — the numbers are printed, so the encoding's own
honesty was not tested against them.
