# 100 datavizproject — #3, paired lollipops with the past in a tint and a signed caption

- url: https://100.datavizproject.com/data-type/viz3/
- archive: datavizproject
- type: paired lollipops, one pair per entity, with a change caption
- export: static
- readAs: the encoding as the page draws it, read at rest, from the page screenshot

## What it is

Three pairs of lollipops on a common baseline, one pair per country. In each pair the **'04 stem and
head are a light tint of the country's hue and the '22 stem and head are the hue at full strength**.
Both values are printed above their heads. Under each pair, a small block: an up triangle, then the
percent change in bold ink, then the country name.

## What it does with information

**The past recedes into a tint of the present's own colour.** Not grey, not a second hue: the same
hue, lighter. The pair therefore reads as one subject in two states rather than as two subjects.
Norway, whose hue is a near-black, gets a mid-grey for its past — the tint rule applied to an ink.

**The direction of change is given a glyph before it is given a number.** The ▲ above `60%` says
"up" at a glance; the number is the second reading. A reader who only skims still gets the sign.

**The change is a third row that belongs to the pair, not to either mark.** It sits between the two
lollipops and the entity's name, on the pair's own centreline — so it cannot be misread as belonging
to '04 or to '22.

**The date labels are abbreviated to `'04` and `'22` and set in the furniture grey** under each
stem, small: they are the axis, and they are treated as axis.

## What it does with style

The house drawing: white card on a pale `#F4F7F7` page, blue `#3274D8` (216°), red `#EE5440` (7°),
near-black ink `#283250`; the pixel route reads the card as **diverging, two poles**. Those figures
are from a **crop** of `screenshot.png` at `308,172,824,728`.

**The record's own pixel and style numbers are the SITE, not the chart.** `largestGraphic` picks the
DVP logo (`svg` 280 × 80 at `y: 0`), so `measured.json` describes the page — a 45/45 ground split and
the blue header bar as "chromatic" — and the style route sees only site chrome. The chart is a raster
and neither route reaches it.

## What is transferable

- **Draw the earlier state as a lighter tint of the later state's own hue.** It keeps the pair to one
  colour identity and still says which one the story is about.
- **Give the change a direction glyph as well as a number**, so the sign survives a glance.
- **Give the change its own line under the pair**, centred on the pair.

## What is this piece's own

The house triad; the lollipop; the flagless country names.

## What was not verified

Whether the percentages are rounded consistently across the hundred pieces — this one prints
`15%` for the change #54 prints as `+15.4%`.
