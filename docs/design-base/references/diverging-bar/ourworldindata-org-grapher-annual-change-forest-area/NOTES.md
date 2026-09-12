# Our World in Data — "Annual change in forest area", 2015, discrete-bar tab

- url: https://ourworldindata.org/grapher/annual-change-forest-area?tab=discrete-bar&time=2015
- archive: search
- readAs: the Grapher page at 1440×900, **after the harvester clicked a button labelled
  "Accept optional cookies"** (recorded in `record.consent`). `style.graphic.tag` is **`svg`** at
  `documentTop: 236`, `nearTheTop: true`; `routes.pixel.measuredFrom: "graphic.png"`.
  `style.typeSource` is **"the page, which contains the graphic — the two are not separated"**, so
  the Lato reported in `style.type` is the whole Grapher page's type, chart and site furniture
  together, and the sizes below cannot be attributed to the chart alone with certainty.
- **The url is not the one a reader lands on.** `ourworldindata.org/grapher/annual-change-forest-area`
  opens on a world MAP. The diverging bar is one of four tabs (Table / Map / Line / Bar) and had to
  be asked for by parameter. A first harvest of the bare url photographed the line chart and was
  replaced.

## What it is

Net change in forest area in 2015 for the four entities OWID selects by default — China, Russia,
Brazil, and the World aggregate. Two gains right of zero, two losses left. Four bars, one signed
series.

## What it does with information

**One hue for both signs.** Every bar is `#7088B0` at 16.461 % (with `#91A3C2` 0.180 % and two
antialiasing entries below it). Nothing in the fill says which way a bar points; the axis position
does, and nothing else. The pixel route reads the palette as **monochrome**, which is exactly right
and is the opposite of what `references/types/diverging-bar.md` asks for. It works here because
there are four bars and every one of them is labelled.

**Where the labels sit is a rule, and the rule is about the TIP, not about the sign.** The value —
`1.94 million ha`, `341,000 ha`, `-1.92 million ha`, `-3.91 million ha` — always sits **beyond the
bar's growing tip**, outside the fill, in grey ink. The entity name sits **immediately before the
value**, so for a positive bar it lands against the zero line and for a negative bar it travels out
to the tip with the number. The pair reads as one phrase in both directions.

**The zero line is a hairline, not a rule.** A single pale vertical, drawn top to bottom over the
bars. There is no axis, no ticks and no gridlines: this chart states four numbers and one line, and
draws nothing else.

**Sorted descending by signed value**, gains first: China, Russia, Brazil, World. An aggregate
(`World`) sits in the same list as three countries, with nothing distinguishing it — no separating
rule, no second fill, and it is by far the longest bar on the plate.

**The minus sign is a hyphen, not a minus.** `-1.92 million ha`. And the positive values carry no
plus: `1.94 million ha`. Compare Statista, which writes both signs explicitly.

## What it does with style

Ground `#FFFFFF` at 82.428 %; palette read as **monochrome**. Furniture is thin: `#EBEBEB` 0.101 %,
`#E2E2E2` 0.069 %, `#5C5C5C` 0.044 %, `#6B6B6B` 0.043 %. The chart's whole ink budget is four bars,
one hairline and eight short label runs.

Type is **the page's, not the graphic's** (`typeSource` above): Lato throughout, at 11.2 / 11.6 / 12
/ 13 / 14 px, plus Playfair Display 18/700 and 24/700 for the page's own section headings and Menlo
12 for the citation block. Two entries in that list are legibly the chart's — Lato 12/700 whose
sample is `China` (8 runs) and Lato 12/400 whose sample is `1.94 million ha` (26 runs) — so the
**category label is bold and the value label is regular, at the same 12 px**, in `rgb(91, 91, 91)`.
That pairing is the one type fact this record can honestly claim.

## What is transferable

- **One hue is enough when every bar is labelled and the zero line is drawn.** Two sign hues buy
  redundancy, and redundancy costs a reader a legend; a four-bar chart with four numbers on it does
  not need one. State this as a condition, not a preference.
- **Anchor the value label to the TIP and let the category label ride in front of it.** The pair
  then reads left-to-right on the right side and travels outward on the left side, without a
  second rule for negatives.
- **A hairline at zero rather than an axis** when there are no gridlines to belong to.
- **Do not let an aggregate row look like a category row.** `World` is drawn identically to Brazil
  and is four times longer; a reader scanning for the biggest loser finds a total. This is the
  clearest thing this reference teaches, and it teaches it by getting it wrong.

## What was not verified

The FAO figures were not checked. The default entity selection was accepted as published and not
altered; a different `country=` parameter would produce a different chart at the same url, so this
record is of one state of an interactive, not of a fixed graphic. Hover, tooltip, the Table/Map/Line
tabs and the time slider were not exercised. The type could not be separated from the page's, so
only the two runs whose samples are chart content are claimed. One publication.
