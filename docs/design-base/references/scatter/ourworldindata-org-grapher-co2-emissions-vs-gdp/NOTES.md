# Our World in Data — CO₂ emissions per capita vs GDP per capita

- url: https://ourworldindata.org/grapher/co2-emissions-vs-gdp
- archive: url-list
- type: bubble scatter — two quantitative axes, both logarithmic, size and colour channels
- export: web
- readAs: the chart element itself, photographed by the pixel route as `graphic.png`, at rest in its
  default state

**Provenance caveat.** As with the sibling record, this url is **not** in
`~/Downloads/infoviz-source-urls-alive.txt`; it was drawn deliberately by form and recorded under
the only archive value the harvester offers.

**Why a second record from the same desk is here.** It is not independent evidence and it is not
counted as such — one publication, `ourworldindata.org`, exactly as `METHOD.md`'s correction 4
requires. It is filed for one reason: it settles whether the apparatus on the sibling chart is a
**system** or a one-off. It is a system, and the place to point when someone asks.

## What it is

Every country as a circle: **x = GDP per capita** (log), **y = per capita CO₂ emissions** (log),
**area = population**, **fill = continent**. No time axis; the year is fixed.

## What it does with information

**Both axes now carry the log disclosure, and the pattern holds.** The y title reads
`Per capita emissions` in bold with `(tonnes per person; plotted on a logarithmic axis)` in regular
beside it; the x title is byte-for-byte the sibling's — the style route reads the same
`Lato 12 / 700` `GDP per capita` and `Lato 12 / 400`
`(international-$ in 2011 prices; plotted on a logarithmic axis)` tuples on both charts. The
disclosure is not a flourish this one chart happened to carry; it is what this desk's axis title
does when the scale is transformed.

**The unit rides every tick on a log scale too**: `0.1 t, 0.2 t, 0.5 t, 1 t, 2 t, 5 t, 10 t, 20 t`.
The uneven tick spacing is itself the statement that the scale is not linear, and the words in the
title say it as well — belt and braces, on the axis a misreading would be most expensive.

**The label-size-as-size-channel finding repeats, on a different country set.**
`India 14.3`, `United States 12.6`, `Indonesia 12.5`, `Pakistan 12.4`, `DR Congo 11.9`,
`Turkey 11.8`, `Tanzania 11.7`, `Myanmar 11.6`, `Nepal 11.5`, `Niger 11.4`, `Sweden 11.3`,
`Kyrgyzstan 11.2`, `Latvia 11.1` — again rank-ordered by population, again 9.4 px in the size key's
smaller specimen. Two charts, same rule.

## What it does with style

Ground `#FFFFFF` at **89.6 %** (pixel route, `graphic.png`); palette **categorical**, largest
chromatic buckets `#339D98` (177°, 0.62 %), `#B577B0` (305°, 0.17 %), `#EA8B7B` (9°, 0.13 %),
`#7088B0` (218°, 0.10 %). Identical hue set to the sibling — the continent palette is fixed across
the desk's charts, which is what makes a reader who has met one able to read the next.

## What is transferable

- **When a scale is transformed, say so in the axis title in words**, on every transformed axis, and
  do not rely on the tick spacing to carry it alone.
- **Fix the entity palette across a desk's charts** so continent colour is learned once.
- Everything the sibling record lists; this record is what makes those transferable rather than
  anecdotal *within this desk* — it still takes a second publication to make them a practice.

## What is this piece's own

Grapher's furniture, `Lato`, OWID's continent hues, and the specific 2022 snapshot.

## What was not verified

- Whether the two charts share one code path (they visibly share one component; the source was not
  read). If they do, "two charts" is one decision taken once, which is why this record claims no
  independence.
- The same style-route colour caveat as the sibling: label tuples report `rgb(91, 91, 91)` while the
  pixels show the continent hue. The pixels win.
- Interactive states.
