# Figure.NZ — *Distribution of incomes from wages and salaries in New Zealand*

`https://figure.nz/chart/9uO8rkrqhPWM7VA4` · harvested 2026-09-08 · archive recorded as `url-list`
(found by search, not drawn from the url list file).

## What it is

A **real histogram**, drawn horizontally, and the artifact read is the chart in its own document.
The record's graphic is an `svg` 800 × 1200 at `documentTop` 311, `nearTheTop: true`,
`routes.pixel.measuredFrom: "graphic.png"` — an SVG on the publisher's own single-chart page, so
unlike the other four records in this family the plate and its lettering are in the *same*
document the style route read.

Titled *Distribution of incomes from wages and salaries in New Zealand*, subtitled *By taxable
income band, year ended March 2025, NZD millions*, credited *Provider: Inland Revenue*. Forty-five
income bands run down the left; a bar per band runs right against a `0 → 20,000` axis.

**Note the unit.** The bars are NZD millions of income earned in each band, not the count of people
in it. It is a histogram of a continuous variable's *mass* rather than its frequency — which is
still a distribution over contiguous bins, and is a different question from "how many people".
Figure.NZ publishes both; the sibling record `moneyhub-co-nz-wage-salary-distributions-html` is the
count version of the same series, from the same publisher.

## What it does with information

- **Every bin is labelled as a closed interval, at both ends**: `$1-$10,000`, `$10,001-$20,000`,
  `$20,001-$30,000`. The `,001` is doing real work — it states the half-open convention on the
  face of the chart, so a reader never has to guess which side a boundary value falls.
- **The top bin is open and named in words**: `$1m and over`. There is no fictional upper edge.
- **The bin width changes twice and the bar width does not.** Bands are $10,000 wide to $300,000,
  then $50,000 wide to $1m, then unbounded. Each is drawn as one bar of identical thickness, so the
  four bars from `$300,001-$350,000` down are **five times the interval** of the bars above them and
  are drawn at the same weight. Area is not preserved. That is the classic histogram fault, on a
  published chart, and the plate does not flag it — though the label does, if the reader reads it.
- **The value axis is drawn twice**, at the top and again at the foot of the 1200 px plate, with
  the same ticks (`0 5,000 10,000 15,000 20,000`). On a plate this tall, one axis at the top would
  be off-screen for the whole tail.
- The provider is named on the plate itself, above the axis, not in a footnote.

## What it does with style

Measured on `graphic.png`:

| role | measured |
| --- | --- |
| ground | `#FFFFFF` at 83.46 % |
| bar fill | `#351D3B` at 9.138 % — filed by the pixel route as a **neutral** (a near-black plum, below the chromatic floor) |
| type ink | `#3D4F6E` at 1.019 %, matching `style.type`'s `rgb(63, 82, 111)` on every label |
| wordmark | `#5461C8` at 0.524 %, matching `style.type`'s `rgb(84, 97, 200)` |
| palette shape | `sequential`, one cluster at hue 218 |

**The distribution is drawn in an almost-neutral and the only chromatic ink on the plate is the
lettering and the wordmark.** The bar fill at 9.1 % coverage is dark enough that the classifier
files it with the greys; the two colours the classifier does call chromatic are the label ink
`#3D4F6E` and the `figure.nz` wordmark `#5461C8`, together 1.5 % of the frame.

Type, read from the same document as the graphic:

| role | tuple | sample |
| --- | --- | --- |
| chart title | `FoundersGroteskCondensedMedium \| 24 \| 400` | "Distribution of incomes from wages and salaries in New Zeala…" |
| subtitle | `FoundersGroteskCondensed \| 20 \| 300` | "By taxable income band, year ended March 2025, NZD millions" |
| axis + bin labels | `FoundersGroteskCondensed \| 14 \| 300`, ×54 | "5,000" |
| provider / notes | `FoundersGroteskRegular \| 14 \| 200 \| trk 0.72 \| uppercase` | "Notes" |

One condensed grotesque at three weights — 300 for the data's own numbers, 400/medium for the
title, 200 for the apparatus — and the entire hierarchy is carried by **weight and size, never by
colour**: every one of those tuples is `rgb(63, 82, 111)`.

Bars are gapped, measured: at column x = 176 the runs of `#351D3B` are
`189-204 210-225 230-245 …` — 15–16 px bars with a consistent **5–6 px gap**, about a third of the
bar. This is not a hairline separation; it is a bar chart's spacing applied to a histogram's bins.

## What is transferable

- **Name every bin by both of its edges, and say which side a boundary belongs to.**
  `$10,001-$20,000` costs four characters and removes the reader's only real ambiguity about a
  binned axis. Two publications in this family do this (see `populationpyramid-net-world-2023`).
- **Leave the top bin open and name it in words.** `$1m and over` — no invented ceiling. Same two
  publications.
- **Repeat the value axis at the foot of a tall plate.** A distribution with a long tail is a tall
  chart, and the axis at the top is not where the tail is read.
- **One condensed grotesque, one ink, hierarchy by weight.** Three weights of one family in one
  colour is enough to separate title, subtitle, data labels and apparatus.
- **The counter-example is transferable too**: unequal bins drawn at equal weight. Whatever this
  family files about binning should be able to detect it.

## What was not verified

- **The bars' own semantics.** The subtitle says NZD millions; nothing in the record confirms what
  the axis counts, and this note takes the plate's word for it.
- **Whether `#351D3B` is a house colour or this chart's.** The sibling Figure.NZ chart in this
  corpus is teal (`#4DB7C5`), so the fill plainly varies per chart. Nothing here says what governs
  it, and no claim about a Figure.NZ "bar colour" rests on either record.
- **`style.marks`.** The record's mark list (fills `rgb(152, 76, 172)`, `rgb(135, 22, 113)`, several
  strokes) is read from the whole page, which carries other chart thumbnails below the plate. None
  of those colours appears in `graphic.png`'s palette and none is quoted above.
- **Independence from `moneyhub-co-nz-wage-salary-distributions-html`.** That record's graphic is a
  Figure.NZ chart too. They are one publication and must not be counted as two.
