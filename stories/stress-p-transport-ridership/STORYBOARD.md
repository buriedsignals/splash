---
takeaway: "Lisboa alone carries 214 of the 394 million trips these six Portuguese city networks recorded in 2025 — more than twice Porto's 96 million."
subject: "Lisboa, the network the article opens on — and, in the last beat, Aveiro's newly opened line"
comparison: "Porto's 96 million, and the 394 million all six networks carry between them"
limits: "One year only (2025), so no trend and no before/after for the lines that opened this year. The table is six city networks, not all Portuguese public transport. trips_millions counts trips, not people: divided by population it reverses the ranking, and the article does not make that reading. Nothing in the data locates or describes the Aveiro line itself."
placement: "Beat 1 after the opening paragraph. Beats 2 and 3 after the second paragraph, where the smaller cities are introduced."
credit: "unattributed"
effectiveDate: "2026-08-21"
grounding: "supported"
reference: "ABC News (Australia), \"Conquering Mount Everest\" — a profile whose two dimensions disagree; accepted for slot 2"
language: "en"
slots:
  - id: 1
    proves: "Lisboa carries more trips than the other five city networks put together, and more than twice Porto's."
    medium: "chart"
    format: "static"
    size: "landscape"
    reachable: "yes"
    candidates: ["Bar and column", "Lollipop", "Treemap"]
    chosen: "Bar and column"
    producer: "custom"
  - id: 2
    proves: "Ranked by trips per resident instead of raw trips, Porto leads and Lisboa is second — the dimension the article's opening does not use."
    medium: "chart"
    format: "web"
    reachable: "yes"
    candidates: ["Slope (slopegraph)","Dumbbell (range plot)","Grouped bar"]
    chosen: "Slope (slopegraph)"
    producer: custom
  - id: 3
    proves: "Aveiro's network is 12 km — the second shortest of the six — and it is the only thing in this data that describes the line the article ends on."
    medium: "chart"
    format: "static"
    size: "landscape"
    reachable: "yes"
    candidates: ["Lollipop", "Bar and column"]
    chosen: "Lollipop"
---

## What was read in the article (restitution)

Three claims could become visual:

1. Lisboa carries 214 million trips against Porto's 96 million — stated, with both numbers.
2. Aveiro and Braga opened new lines this year — stated, but **not in the data**: the table carries
   one row per city for 2025 and no opening date, no route, no before/after.
3. "Outside the capital" is the article's frame, yet the table includes the capital and the capital
   is 54% of it. The frame and the data disagree; the takeaway records the data's reading.

## Slot 1 — The overall picture

A horizontal bar chart of trips per city, sorted descending, Lisboa carrying the accent. One value
per category, read as length from a shared zero — the plainest form of the article's own sentence.

### Candidates considered

1. **Bar and column** — chosen. "One value per category, encoded as the LENGTH of a rectangle from
   a shared baseline." Six categories and one measure is exactly its case, and length from zero is
   the only encoding that lets a reader see 214 against 96 as *more than twice* without arithmetic.
2. **Lollipop** — same job with a lighter mark. Rejected here because the point of this beat is the
   size of the gap, and a stem-and-dot understates a length comparison at this ratio.
3. **Treemap** — area as share of the 394 million total. It would carry the part-to-whole reading
   well, but no static treemap has been produced in this toolchain, and area is harder to compare
   than length for the 214-vs-96 claim the article actually makes.

## Slot 2 — The one readers can explore

Two readings of the same six networks, side by side: rank by total trips on the left, rank by trips
per resident on the right, one line per city. The crossing lines ARE the finding — Porto rises past
Lisboa, and Aveiro, the city the article ends on, falls to last. Hover, tap or Tab to any line and
it gives that city's own trips, population and rate.

### Candidates considered

1. **Slope (slopegraph)** — chosen. "Who moved, in which direction, and by how much, between exactly
   two moments — for many categories at once." The two readings stand where the two moments would;
   the departure is recorded in the beat's own `BRIEF.md`. A line tilting against the field is the
   most legible shape in this family, and that is precisely what Porto's line does.
2. **Dumbbell (range plot)** — the same two ranks per city as two dots on one scale, sortable by the
   size of the move. Rejected: it drops the connecting lines between cities, so Porto overtaking
   Lisboa stops being a crossing and becomes two separate rows the reader has to compare.
3. **Grouped bar** — trips and population side by side per city. Rejected: two series in different
   units and different orders of magnitude, so a shared scale lies and two scales invite the
   double-axis anti-pattern.

### The treatment this slot first chose, and why it was reopened

This slot originally recorded **Scatter (and bubble)** — population against trips, one dot per city.
`chart-beat/references/types/scatter.md` refuses it outright at this size: *"If there are fewer than
about eight or ten points, a scatter is an expensive way to draw what a labelled dot-strip or a small
table would show just as well — a cloud needs enough members to have a shape."* Six cities is not a
cloud. The slot was reopened through `mutateStoryboard`, which reset the producer decision by itself
and reopened the G2-producer gate; that gate was then answered again (custom).

### Producer

Datawrapper does map this treatment (Line chart, `d3-lines`), and the gate was put and answered:
**custom**. The whole point of this beat is the per-line detail — trips, population and rate on
hover, tap and keyboard — which two rank columns in a Datawrapper line chart would not carry.

## Slot 3 — The Aveiro line, as far as the data goes

A lollipop of network length per city, Aveiro carrying the accent, annotated with its 14 million
trips.

### Candidates considered

1. **Lollipop** — chosen. Network length per city is one measure over six categories, and the thin
   mark keeps the emphasis on the single accented city rather than on the ranking.
2. **Bar and column** — same job, heavier mark; it would read as a second overall-picture chart
   beside slot 1 rather than as a portrait of one network.

### What this beat could NOT be

The journalist asked for "one that shows the Aveiro line itself". The frozen data cannot support
that in any medium:

- **A route/flow map** needs the line's own geometry. `source/data.csv` has no coordinates, no
  stops, no route, and no station names.
- **A locator map** needs at minimum a position per city. There is none, and inventing one by
  geocoding would be adding data the journalist never froze.
- **An image beat** needs the journalist's own photographs. `source/` contains none.
- **A before/after of the opening** needs at least two moments. Every row is 2025.

So the honest nearest thing is the one column that *is* about the line — `network_km` — read against
the five networks the reader already knows. The refusal is recorded here rather than discovered at
render time.

## Reference

Row "a profile whose two dimensions disagree" in the doctrine reference set (ABC News Australia,
*Conquering Mount Everest*, 2 June 2019): the piece lets the raw count register first, fully and
unqualified, and only then gives the rate that contradicts it — with numbers, not with a hedge.
That is exactly the shape of slots 1 and 2 here: raw ridership first, per-resident second.
Row "a total whose majority escapes the subject named in the title" (Republik, 2025) was shown
beside it and not kept: the article's frame problem is real but it is a text problem, not this
graphic's.

## Palette

Recorded in `PALETTE.md` beside this file — ground `#16191B`, accent `#D4A853`, second accent
`#5B8A8A`. All three beats read that one file, so they cannot disagree about their colours.
