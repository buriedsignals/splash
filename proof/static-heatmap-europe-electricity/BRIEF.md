---
size: landscape
type: heatmap
---

# Beat — Three routes to low-carbon electricity, 12 European countries × 9 sources

**Type:** heatmap (matrix). **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080), pinned in the front matter above, which is the statement that counts.

The first `heatmap` beat in this tree — the family's eleven references had no directed component,
and it was the largest uncovered family in the harvest.

## The claim

**Seven European countries draw more than 94 % of their electricity from low-carbon sources — and
they get there by three different routes.** Iceland, Albania and Norway do it without any nuclear at
all. France does it on nuclear, which is 67.7 % of its mix. Sweden, Switzerland and Finland do it on
both, each above 50 % renewables *and* above 25 % nuclear.

Every one of those figures is computed from the frozen CSV and printed before a mark is drawn, and
every sentence the plate prints is ASSERTED — including the partition itself: the three routes are
computed as three disjoint groups, and a country that fell into none of them, or into two, throws.

## The selection, which is a rule and not a hand-pick

A landscape plate holds about a dozen rows before the row labels stop being labels — the component
measures that and refuses rather than shrinking them — so **which** twelve of Europe's forty is an
editorial act, and it is printed on the plate: *the seven above the floor, plus the continent's
largest producers.* Nobody above the floor can be missing, or the count in the headline is a lie;
the largest producers bring the weight in, so a reader is not shown twelve small countries and told
about Europe.

**This is where the first draft was wrong, and it is worth recording.** It drew eighteen hand-picked
EU countries and asserted "five clear 94 %". Five of *those eighteen* did. Across all forty European
entities in the file, **seven** do — Iceland and Albania are both at 100 %, and neither was in the
hand-picked list. The headline would have been false about Europe while every number under it was
true. The floor check now runs over the whole frozen file, never over the drawn rows: a check against
the selection can only ever confirm the selection back to itself.

Ukraine is in the frozen file and is not drawn: its 2024 row is blank in every column. An entity the
file does not report is not a zero, so it is dropped before any figure is computed, and the count of
what was dropped is printed.

## Why this form

The finding is a **block**, not a cell: the top seven rows are dark on the left, on the right, or on
both, and the shape of that darkness is the three routes. A bar chart of low-carbon share would rank
the countries and lose the routes; nine small multiples would show the routes and lose the ranking. A
matrix carries both because it has two axes.

## The order, which is an editorial decision

**Rows** run by low-carbon share, descending, and that share is printed in its own named column at
the right — an order is a claim, and a reader who cannot see the quantity the rows are sorted on
cannot check it. **Columns** run by family: the five renewables, then nuclear, then the three fossil
sources, with the families named above a drawn rule. Neither order is in the data; both are on the
plate, per `order-is-chosen-from-the-answer`.

## What the corpus decided, and what it left to measurement

`the-cell-value-is-printed-or-the-region-is-named` has two answers and the cell count picks one. This
grid has **108 cells**; the value register's own band does not fit the row pitch the layout gives —
14.2px against 14.0 in `creme` — so the plate does not print 108 numbers. It names the region
instead: a bracket around the seven, in the ink, outside the ramp entirely so it can never be read as
a value.

The ladder that finds that pitch spends the reading line first, then the standfirst, and the headline
last. All three directions ended up dropping the reading line, and `nocturne` — Futura at 32px —
took the shortest of the three headlines. That is the ladder working, and each plate prints which
rung it took.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
electricity generation by source, TWh.

Fetched on 2026-09-09, and the fetch is the provenance:

```
curl -sS -L --get "https://ourworldindata.org/grapher/electricity-prod-source-stacked.csv" \
  --data-urlencode "v=1" \
  --data-urlencode "csvType=full" \
  --data-urlencode "useColumnShortNames=true"
```

10 581 rows returned, 1900–2025. Frozen beside this beat as `data.csv`: the 18 European countries of
the plate, year **2024** — the last complete year in the file, 2025 being partial.
