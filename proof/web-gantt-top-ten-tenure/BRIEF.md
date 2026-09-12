---
format: web
type: gantt
---

# Beat — 16 pays sont passés par le top 10 mondial des émetteurs, 6 n'en sont jamais sortis (web)

**Type:** gantt (positioned spans on a shared date axis). **Medium/format:** chart / **web**.
**Frame:** fluid.

## Claim

Between 1990 and 2024, **sixteen countries** held a place in the world's ten largest CO₂ emitters at
least once. **Six held it every single year** — the United States, Russia, China, Japan, Germany,
India. Two rows are interrupted rather than continuous (Italy, South Korea) and **Kuwait appears for
a single year, 1991**.

Every span is computed from the same ranking the bump beat reads, taken as **tenure** rather than as
position. Interruptions are found, not listed: a row with more than one span had a gap, and the page
says which years.

## Treatments spent

- `an-open-span-says-it-is-open` — a span still running at the last year of the record is drawn with a
  notched end, not squared off at the edge of the data. A bar that stops where the DATA stops reads
  as an exit that never happened.
- `both-dates-in-the-row-label` — every row prints its own tenure in years beside its bar.

## What the web adds

A gantt answers "how long" and **refuses "how high"**: reading tenure instead of rank is exactly the
trade that frees the vertical axis. So the reading it cannot give on paper is what every row answers
here — **the best rank the country actually reached while it was there** — along with its exact
periods and its years of absence.

## What the render taught

The note naming the accented group was an overlay anchored inside the plot, and every row at the top
of this frame is a full-width bar: it landed on one whatever its anchor. It sits under the plot now,
in the annotation register. And a one-year tenure printed "1 ans".

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Global Carbon Budget 2025, via Our World in Data · 1990–2024, ranking computed over the 215 countries
in the file. `data.csv` is a byte-for-byte copy of `proof/static-gantt-top-ten-tenure/data.csv`.
