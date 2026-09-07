# Our World in Data — CO₂ emissions per capita

- url: https://ourworldindata.org/grapher/co-emissions-per-capita
- archive: url-list
- type: multi-series time line
- export: web
- readAs: the chart the page draws for every reader, photographed as its own element at rest

## What it is

Nine national series of per-capita CO₂ emissions from 1750 to 2024, drawn as lines on one axis —
United States, Canada, China, South Africa, the European Union, the World, the United Kingdom,
India, Kenya. The first genuine multi-series line chart in this corpus.

## What it does with information

**Every series is labelled at its own end, in its own colour.** Nine names sit to the right of the
plot, each at the height its line finishes at and set in that line's hue. There is no legend
anywhere. `doctrine/references/visual-system.md` already holds this rule — *"an endpoint label on
the line it belongs to … is preferred over a detached legend in every case where it is spatially
possible"* — and here it is at nine series, which is well past where most charts give up and
reach for a key.

**The unit rides the tick.** The y axis reads "25 t", "20 t", "15 t", "10 t", "5 t", "0 t" — the
unit on every tick rather than once in a corner or in the title. A reader who enters the chart at
its middle still knows what they are looking at.

**The gridlines are dotted and the axis has no spine.** The furniture is present enough to read a
value against and quiet enough that nine overlapping series stay separable.

**The x axis ends on the data, not on a round number**: 1750 … 2000, then **2024**. The last tick is
the last reading, so nothing suggests the series continues past what is known.

## What it does with style

Ground white. The pixel route reads the palette as **categorical, four hue clusters** (274°, 218°,
33°, 159°) — nine series drawn from a categorical set rather than a ramp, which is the right family
for entities that have no order. Sans throughout, no italic, tracking only in the page's own
furniture.

## What is transferable

- **Direct end labels in the series' own colour, at nine series.** The usual objection — "too many
  lines for direct labels" — is answered by a published chart doing it.
- **Put the unit on every tick**, not once in the title.
- **End the axis on the last reading**, not on the next round number.
- **Dotted gridlines and no axis spine** where many series must stay separable.

## What is this piece's own

Our World in Data's Grapher furniture and its specific categorical hues.

## What was not verified

The chart is interactive — entities can be added and removed, and the y scale can be switched to
log. Only the default state at rest was read, and nothing above depends on the interaction.
