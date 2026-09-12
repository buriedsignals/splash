# Pew Research Center — the group taken apart: one strip per series, one legend never written

- url: https://www.pewresearch.org/chart/self-reported-voting-patterns-in-2024-election-varied-across-engagement-groups/
- archive: search
- type: grouped bar transposed into per-series strips — 4 series (Trump, Harris, another candidate,
  did not vote) × 4 categories (engagement groups), horizontal bars
- export: live SVG, 420 × 170, at `documentTop` 632, `nearTheTop: true`
- readAs: `graphic.png`, the chart's own SVG, plus `screenshot.png` for the furniture around it
  (title, deck, note). Both routes `ok`; `routes.pixel.measuredFrom === "graphic.png"`.
  `consent: "button \"Accept All Cookies\""` — a cookie dialog was dismissed before measuring, so
  the page was read in a state the harvester put it in. `style.typeSource` is **"the page, which
  contains the graphic — the two are not separated"**, and here that matters: this is a full
  publication page with a masthead, so only the type tuples whose samples are chart strings
  (`22`, `Donald Trump`, `Outsiders`) can honestly be attributed to the graphic.

## What it is

A Pew chart permalink: the share of U.S. adults in each of four "engagement groups" who say they
voted for Trump, Harris, another candidate, or did not vote. Sixteen values.

## What it does with information

**The group has been transposed into columns.** Instead of four bars sitting side by side inside
each row, **each series gets its own vertical strip**, and the four categories are the four rows
running across all of them. Every bar in a strip starts from that strip's own left edge, so within a
series the four values are a clean single-series bar chart; across strips, the row alignment carries
the comparison.

**The legend has been replaced by a column header.** `Donald Trump`, `Kamala Harris`, `Another
candidate`, `Did not vote` are set in bold directly above their own strip. There is no key, no
swatch, and no matching to do — the series name is *at* the bars, not beside them. This is the same
instinct as Ferdio's repeated flags (#25), reached from the other direction: rather than repeating
the key per group, name the series once at the head of its own column.

**The category label is written once, at the far left**, and serves all four strips. So each of the
two axes is labelled exactly once, in the direction it runs.

**Every bar carries its value, immediately to the right of its cap, always outside.** No in/out
rule — the strips are short and the numbers sit in the strip's own right-hand gutter, which means
the numbers form four clean vertical columns of their own.

**All four strips are on ONE shared scale, and it was measured.** Sampling the exact declared
fills out of `graphic.png` gives, per bar, length in pixels against printed value: red
`34→24, 44→31, 21→15, 22→15`; blue `51→35, 38→26, 25→17, 15→10`; grey `12→7, 11→7, 49→33, 56→38`.
That is **0.67–0.71 px per unit across all three drawn strips** — one scale, not three. Splitting a
group into strips does not have to cost the cross-series comparison, and here it does not.

**And the fourth series is drawn as a rule, because its bars would be one pixel.** `Another
candidate` holds four values of 1–2 %, which at 0.69 px/unit is a hairline. There is no bar in that
strip at all: what stands where the bars would be is a **2 px × 116 px gold rule at x = 235–236**,
`#F5CF95`, with the numbers `2 1 1 1` set beside it. The rule marks the strip's own zero and gives
the series a visible place on the plate without drawing four marks a reader could not see. A series
whose values round to nothing is admitted as text against a rule, rather than faked as geometry.
**The deck states the unit and the sentence frame**: *"% of U.S. adults in each engagement group who
say they voted for ___ in the 2024 election"*, in italic serif, with a literal blank the column
header fills in. The chart is read as four completions of one sentence.

## What it does with style

**Style route (the live DOM).** `marks` include `fill rgb(191, 59, 39)` × **4**,
`fill rgb(69, 106, 131)` × **4**, `fill rgb(198, 200, 202)` × **4** — three of the four strips at
four bars each; `fill rgb(42, 42, 42)` × 9 is the page's own furniture. Type is
`franklin-gothic-urw`, and the three chart tuples are:

| tuple | count | sample | colours |
| --- | ---: | --- | --- |
| franklin-gothic-urw 12 / **200** | 12 | `22` | `rgb(42,42,42)` |
| franklin-gothic-urw 12 / **700** | 6 | `Donald Trump` | `rgb(42,42,42)` |
| franklin-gothic-urw 12 / 400 | 6 | `Outsiders` | `rgb(42,42,42)`, `rgb(129,129,129)` |

**One size, three weights, one colour.** The value numerals are set at weight **200** — lighter than
the row labels at 400 — and the series headers at **700**. The whole hierarchy of the chart is
carried by weight at 12 px in a single near-black, and the numbers are the *quietest* text on the
plate rather than the loudest. That is the opposite of ONS's bold percentage, and it is coherent:
Pew's numbers are there to be looked up, not to be shouted.

**Pixel route (`graphic.png`).** Ground `#FFFFFF` at **83.298 %**. Chromatic `#456A83` at
**3.451 %** (204°), `#BF3B27` at **3.214 %** (8°), and `#F5CF95` at **0.314 %** (36°). Neutrals
`#C6C8CA` at **3.333 %**, `#000000` 0.857 %, `#F3F3F3` 0.408 %. Shape **diverging**, clusters at
204° (3.608 %, 2 members) and 8° (3.777 %, 5). The pixel hexes match the DOM fills exactly —
`#BF3B27` = `rgb(191,59,39)`, `#456A83` = `rgb(69,106,131)`, `#C6C8CA` = `rgb(198,200,202)` — which
is what a clean SVG on a white ground should produce, and is worth contrasting with `dvc847`, where
they did not.

**The palette is a political convention plus two neutrals.** Republican red and Democratic blue are
carried in muted, desaturated versions rather than at full strength; "did not vote" is a light grey
that is deliberately not a party; and `#F5CF95` at 0.314 % is not a bar at all — it is the thin gold
rule separating the `Another candidate` strip. Four series, two hues, one grey, one rule.

**No two adjacent strips share a hue family**: red, then slate blue, then a gold rule, then grey.

## What is transferable

- **Give each series its own strip with its own left edge, and head the strip with the series name.**
  It removes the legend and it lets a series with a tiny range keep a readable width.
- **Separate strips with a rule, so the reader knows the scale is not continuous across them.**
- **Label each axis exactly once, in the direction it runs** — categories at the far left, series
  at the head of each column.
- **Carry the whole hierarchy on weight at one size** (200 for values, 400 for categories, 700 for
  series), in one colour.
- **Write the deck as a sentence with a blank the series name fills in.**

## What is this piece's own

The U.S. party colour convention, and the engagement-group taxonomy the note explains.

## What was not verified

The type route's tally of 12 spans at weight 200 against 16 printed values — four numerals sit on
some other tuple, and which four was not established. Whether the gold rule appears on every strip
or only this one (only one gold column pair was found, at x = 235–236, so it is this strip's alone,
but why it is gold rather than the plate's grey was not established). Whether the strip widths are
allocated by range or hand-set. The chart's interactive behaviour, if any — read at rest. The page
was read after a cookie dialog was dismissed (`consent: "button \"Accept All Cookies\""`), so this
is a state the harvester put it in.
