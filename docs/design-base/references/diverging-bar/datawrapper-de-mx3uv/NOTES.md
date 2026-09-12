# Datawrapper — "Nobel Prize winners by gender"

- url: https://www.datawrapper.de/_/mX3uV/
- archive: search (the chart's own published permalink, reached from Datawrapper Academy's
  `examples-of-datawrapper-split-bar-charts` gallery)
- readAs: the published chart page at 1440×900. `style.graphic.tag` is **`iframe`** at
  `documentTop: 219`, `nearTheTop: true`, frame `https://datawrapper.dwcdn.net/mX3uV/1/`;
  `routes.pixel.measuredFrom: "graphic.png"`. **The graphic's type is `style.graphicFrame.type`**
  (`style.typeSource` says so).

## What it is

Six Nobel categories, laureates counted by gender, drawn **back to back about a shared centre** —
men's counts growing left, women's growing right. Not a signed series: two groups mirrored, which is
the other half of what this family is.

## What it does with information

**The two sides are deliberately unequal in weight, and that IS the argument.** Men are
`#BFD1DB` at 13.127 % — a pale blue the pixel route files under **neutral**, not chromatic. Women
are `#242FA1` at 0.958 % — a saturated navy, and the only chromatic mark on the plate. The larger
quantity is drawn as the quieter thing. A reader's eye lands on six short dark stubs, which is the
sentence the title is making.

**Sorted descending by the ARGUED side, not by the larger one.** Peace 19, Literature 18, Medicine
13, Chemistry 8, Physics 5, Economics 3. The men's column, read top to bottom, is 92, 103, 216, 189,
222, 93 — no order at all. The sort key is the side the story is about.

**The centre carries the legend and nothing else.** `Men` and `Women` sit as two small headers
straddling the gutter, at the top, aligned to their own halves. There is no colour key, no swatch and
no separate legend block: the header is the legend because it is adjacent to what it names.

**The value label sits at the inner edge on the left and beyond the tip on the right.** `92` is
inside the pale men's bar against the centre; `19` is outside the navy women's bar. Both are dark
ink. So the two numbers of a row sit next to each other in the middle of the plate and can be
compared as a pair without crossing the picture.

**One annotation with a hand-drawn leader.** `Claudia Goldin won the 2023 Nobel Prize in Economics
for advancing the understanding of women's labor market outcomes.` — Roboto 13/700 for the name,
13/400 for the rest, with a curved arrow into the Economics row. And a footnote in italic
(`rgb(101, 101, 101)`) that qualifies the count itself: the Peace Prize also goes to organisations,
so the row is not comparable to the others.

## What it does with style

Ground `#FFFFFF` at 75.719 %; palette read as **sequential** — correctly, because on the pixel
route's terms this chart has one chromatic hue and a pale neutral, not two hues. Furniture: `#D9D9D9`
0.966 % and `#F3F3F3` 0.499 % and `#ECECEC` 0.415 % (row tracks), `#000000` 0.958 %, `#181818`
0.852 %, `#656565` 0.694 %. Chromatic tail is Datawrapper's link blue `#0289CC` at 0.069 % plus
antialiasing.

Type (from `graphicFrame`): Roboto 22/700 title, 13/400 ×18 for categories, headers and values,
13/700 once for `Claudia Goldin`, 13/400 italic once for the footnote, 11/400 source in
`rgb(136, 136, 136)`. No subtitle: the title alone carries the frame.

## What is transferable

- **In a back-to-back chart the two sides need not be two peers.** Give the side the story is about
  the only saturated hue and let the other be a neutral. The centre still makes them comparable.
- **Sort by the side you are arguing about.** A back-to-back chart has two possible sort keys and
  choosing the smaller one is a legitimate editorial act.
- **The pair of column headers at the centre IS the legend.** Adjacency beats a key.
- **Put both of a row's values against the centre** so the comparison is a short saccade, not a
  traverse of the plate.
- **Footnote the row that is not comparable** rather than dropping it.

## What was not verified

The counts were not checked against NobelPrize.org. Hover, tooltip and the mobile layout were not
read. Whether `#BFD1DB` reads as "neutral" to a reader as well as to the pixel route was not tested;
the record's classification is arithmetic, not perceptual. One publication.
