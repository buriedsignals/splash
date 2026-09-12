---
format: web
type: treemap
---

# Beat — L'Europe compte 453 GW bas-carbone, et l'eau et l'atome en portent encore 79 % (web)

**Type:** treemap (squarified). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

**453 GW of low-carbon capacity across 8 299 stations in 41 European countries, and water and the
atom still carry 79 % of it — but 8 countries have already tipped: wind and solar are more than half
of their low-carbon fleet.** Those eight hold **15 %** of the capacity. The largest cell, France, is
not one of them (14 % wind and solar). Every part is asserted before the render.

## The file's camera is not this beat's

The WRI export reaches past Europe — Algeria, Iraq, Morocco, Syria and Tunisia are in it because the
extract was cut by a bounding box, not by a continent. A treemap of "Europe" that silently included
them would be a claim about a set nobody stated, so the set is **stated in the runner** and every
country outside it is dropped before anything is summed.

## Treatments spent

- `the-set-a-claim-adds-up-is-drawn-as-a-set` — every country in the set is drawn, including the ones
  too small to hold a name. **A treemap that quietly drops its tail is a pie chart with better
  manners.** The layout throws if it lays out fewer cells than there are countries.
- `a-narrow-cell-degrades-its-label-rather-than-dropping-it` — name and number where both fit, name
  where only it fits, the pointer where neither does.
- `accent-marks-the-thread` — the accent marks the tipped countries, not the largest cell. A large
  cell already shouts by being large; spending the accent there says nothing twice.

## What the web adds

A treemap's cells are **areas**, the encoding a reader can rank and cannot measure — and two cells of
the same area can hold entirely different fleets. Every cell answers with the country, its GW, its
share of the continent, its station count, and the water-and-atom / wind-and-sun split the tipping
claim rests on.

## What the render taught

`transform: none` on a cell label is load-bearing: the shared stylesheet gives `.end-label` a
`translate(-100%, -50%)`, right for a label hanging off the end of a line and fatal for one seated in
the top-left corner of its own cell — it pulled the label clean out of the frame and the format's
overlay probe landed on nothing.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Global Power Plant Database (WRI) · installed capacity per station, aggregated by country.
`stations.csv` is a byte-for-byte copy of `proof/static-treemap-europe-capacity/stations.csv`.
