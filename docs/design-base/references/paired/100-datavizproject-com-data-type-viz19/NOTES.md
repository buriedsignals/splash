# 100 datavizproject — #19, the dumbbell whose colour belongs to TIME

- url: https://100.datavizproject.com/data-type/viz19/
- archive: datavizproject
- type: dumbbell / connected dot plot
- export: static
- readAs: the encoding as the page draws it, read at rest, from the page screenshot

## What it is

Three rows, one per country, on a shared horizontal value axis (0–15 with gridlines every unit). Each
row is two diamonds joined by a thick ribbon; a legend under the plot says **blue diamond = 2004, red
diamond = 2022**. The percent change is set **inside the ribbon**, in white — `+150%`, `+60%`,
`+15%`. The country is a two-letter code at the ribbon's left end.

## What it does with information

**The connector is not furniture here — it is the mark that carries the change**, and it carries the
label too. The reader never measures the gap; the gap tells them the number itself.

**Colour has been re-assigned from the entity to the date.** In #17 and #54 the same desk gives each
country a hue and both of its observations share it. Here the hues mean 2004 and 2022, and the
country is a text code. That is the fork this whole family turns on: **the accent can belong to WHO
or to WHEN, and only one at a time.** Giving it to time makes every row read the same way and makes
the entities anonymous; giving it to the entity makes each row its own subject and needs the dates
somewhere else.

**The ribbon is a gradient from the earlier colour to the later one**, so the direction of travel is
readable without an arrowhead.

**Rows are sorted by change, not by value** — Denmark (+150 %) first, Sweden (+15 %) last — so the
picture is ordered by the thing it is about.

## What it does with style

The house drawing: white card on a pale `#F4F7F7` page, blue `#3274D8` (216°), red `#EE5440` (7°),
near-black ink `#283250`; the pixel route reads the card as **diverging, two poles**. Those figures
are from a **crop** of `screenshot.png` at `308,172,824,728`.

**The record's own pixel and style numbers are the SITE, not the chart.** `largestGraphic` picks the
DVP logo (`svg` 280 × 80 at `y: 0`), so `measured.json` describes the page — a 45/45 ground split and
the blue header bar as "chromatic" — and the style route sees only site chrome. The chart is a raster
and neither route reaches it.

## What is transferable

- **Put the delta inside the connector.** The connector already spans exactly the change; a label
  set in it needs no leader and cannot be mis-attached.
- **Decide out loud whether the accent belongs to the entity or to the date**, and give the other one
  type. Both work; doing both makes two accents and neither reads.
- **Sort a paired plot by its change** when the change is the story, not by either endpoint.

## What is this piece's own

The diamond marker; the two-letter country codes; the house triad.

## What was not verified

Whether the gridline every unit is meant to be counted or is decoration. Whether `+15%` on this
chart and `+15.4%` on #54 are the same figure rounded differently — they describe the same 13→15,
so the same desk states one fact at two precisions on two pictures.
