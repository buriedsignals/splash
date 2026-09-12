# EU data-visualisation guide — "Visualising many dimensions", read at its parallel-coordinates example

- url: https://data.europa.eu/apps/data-visualisation-guide/visualising-many-dimensions
- archive: search
- type: parallel coordinates — one vertical axis per variable, one polyline per entity
- export: static
- readAs: **the page's own example figure**, a 768 x 419 `<img>` inside the article, photographed at
  rest. It is the guide's illustration of the form — the classic cars dataset — not the guide's own
  house encoding, and every reading below is of that figure.

## What it is

Around four hundred cars, each a polyline crossing **eight vertical axes** in a row: `MPG`, `CYL`,
`DPL`, `HP`, `WGT`, `ACL`, `YEAR` and `OGN`. Each axis is a rule of its own with its own scale and
its own tick values printed on it. The lines are coloured in three by the last axis, origin —
`EU`, `JP`, `US`.

## What it does with information

**Every axis carries its own scale, and says so on itself.** `MPG` runs 5 to 50, `WGT` 1 500 to
5 500, `HP` 40 to 240. Nothing is normalised to a common 0–100, and nothing needs to be: a polyline
is a set of positions, not a shape whose slope means anything. Each rule is labelled at the **top**
with the variable's name and along its length with its own values.

**The tick values sit ON the axis, in a halo, not in a gutter beside it.** Eight gutters would eat
the plate; the halo is the ground's own colour, so a number reads over four hundred crossing lines.

**A categorical dimension is an axis too.** `OGN` at the far right has three positions — `EU`, `JP`,
`US` — and the whole field fans into three points. It is what makes the plate readable: it turns the
last axis into the legend.

**Colour is the category and never the value.** Three hues, one per origin, and no other colour on
the plate. With four hundred crossing polylines, that is the only channel that survives the
crossings, and it is spent on the one variable a reader is meant to follow.

**The axis ORDER is the argument, and it is the form's central limitation.** Only ADJACENT axes let a
reader see a relationship: `MPG` beside `CYL` draws a wide X, so the inverse of the two is visible at
a glance; `MPG` against `WGT`, four axes apart, is not readable at all. A parallel-coordinates plate
with a different axis order is a different plate.

## What it does with style

The figure's own ground is white at 48 % of the crop; the pixel route reads the palette as
**diverging** — two large opposed masses of blue `#4E79A7` and orange, which is the Tableau 10 pair,
not a scale. The rest of `measured.json` is the GUIDE's page chrome (`Helvetica`, `A deep dive into
bar charts`), and the style route reached nothing of the figure, which is a raster.

**No direction may be measured from this record.**

## What is transferable

- **Give every axis its own scale and print it on the axis**, name at the top, values on the rule.
  Do not normalise to a shared range: a polyline is a set of positions, not a profile.
- **Put the tick values on the axis in a halo** rather than in a gutter, so eight axes cost eight
  rules and no columns.
- **Make a categorical variable the last axis** where one exists: it fans the field into groups and
  serves as the legend.
- **Spend colour on the category, never on a value** — it is the only channel that survives the
  crossings.
- **Choose the axis order deliberately and say that it is a choice**: only neighbours are comparable.

## What is this piece's own

The cars dataset; the Tableau palette; the eight-variable selection.

## What was not verified

- Whether the figure is interactive on the live page (brushing an axis is the form's usual
  companion); it was read at rest and nothing above rests on interaction.
- **One publication** — the only reference this base holds for the form.
