# European countries with lowest & highest voter turnout — Datawrapper

`https://www.datawrapper.de/_/FdWeD/` · harvested 2026-09-08 · archive `search` · both routes `ok` ·
`routes.pixel.measuredFrom` = `graphic.png` (an **`<iframe>`**, 546 × 464 at `documentTop` 219).
`style.typeSource` = **"the graphic's own document, in style.graphicFrame"**, whose url is
`https://datawrapper.dwcdn.net/FdWeD/11/`. Every type tuple quoted below is from
`style.graphicFrame.type`, **not** from `style.type` — the latter is datawrapper.de's marketing-page
furniture ("Login", "It's free to use and no sign-in is needed to try it out").

## What it is

**Not a bullet, and it is in this family for one measured reason:** it is the same publisher's plain
bar chart, and it carries **the neutral full-length track** the bullet's qualitative backdrop
degrades to when a beat has no bands. Eleven European countries ranked by turnout in their last
national election, from Romania 33.2 % to Belgium 88.5 %, each bar sitting in a pale grey track that
runs the full width of the plot.

There is **no target**. The chart is here as the control: what the same tool, the same designer and
the same defaults produce when the measure has nothing to be judged against.

Reached at its own permalink — one chart, no masthead, no consent wall, no second graphic
(`METHOD.md` correction 18). It is **Datawrapper's own demo chart** for the bar-chart type, with real
data credited `Source: Parties & Elections, 2024`.

## What it does with information

- **The track is the plot, not the data.** Every row's grey band runs from zero to the ceiling
  (~90 %), identical on every row, so a bar's *unfilled remainder* is legible as well as its length.
  On a bullet this band is where the qualitative zones would go; with no zones it stays one neutral.
- **Three groups, two accents and a grey.** The three lowest-turnout countries are red, the three
  highest are teal, and the five in between — United Kingdom, Spain, France, Germany, Sweden — are
  `#C4C4C4` grey and labelled "for comparison" in the legend. The chart argues about six rows and
  shows eleven.
- **The row names of the argued rows are bold; the comparison rows are regular.** Roboto 12/700 for
  Romania, Bulgaria, Albania, Malta, Turkey, Belgium; 12/400 for the five greys. Weight and colour
  say the same thing twice.
- **Every value label sits inside its own bar, reversed out**, so there is no axis at all — no ticks,
  no gridlines, no scale line. Eleven numbers, eleven bars, and the track to judge them against.
- **The year is in the row name**, not in a caption: `Romania (2020)`, `Bulgaria (2024)`. Eleven
  different election dates on one plate, and the chart never pretends they are contemporaneous.
- **One footnote, one fact**: `Voting is compulsory in Belgium.` in italic under the plate — the
  single caveat that would otherwise undermine the top bar.

## What it does with style

Colour from `record.pixel` (`measuredFrom: graphic.png`, the iframe's clip):

```
ground          #FFFFFF   57.056 %
THE TRACK       #F3F3F3   12.420 %   — the largest non-white mark on the plate
comparison rows #C4C4C4   11.382 %
highest turnout #267C87    8.343 %   h 186.8°  chroma 0.380
lowest turnout  #C71E1D    3.505 %   h   0.4°  chroma 0.667
source link     #0289CD    0.034 %
shape           diverging, 2 clusters — 187° at 8.48 %, 0° at 3.58 %
```

**The neutral track outweighs every accent.** `#F3F3F3` at 12.4 % and `#C4C4C4` at 11.4 % are both
larger than the teal at 8.3 % and more than three times the red at 3.5 %. The plate is mostly
furniture by area and still reads as a two-colour argument, because lightness decides and area does
not — the same mechanism the `boxplot` family filed as `summary-in-neutral-case-in-colour`.

`pixel.shape` is `diverging`, correctly: a red pole and a teal pole with a grey middle, which is what
the editorial claim is.

Type, from `style.graphicFrame.type` — the graphic's own document:

```
22 / 700  rgb(0,0,0)        title      "European countries with lowest & highest voter turnout"
12 / 700  rgb(24,24,24)     argued row names  "Romania (2020)"                 ×6
12 / 400  rgb(24,24,24) / rgb(255,255,255) / rgb(51,51,51)   legend, comparison names, in-bar values  ×22
12 / 400  italic rgb(101,101,101)  footnote  "Voting is compulsory in Belgium."
11 / 400  rgb(136,136,136)  credit,  link rgb(0,136,204)   "Source:"
```

One family, three sizes, and the *only* devices are weight, italic and ink: 22/700 black, 12/700
near-black, 12/400 near-black, 12/400 italic grey, 11/400 grey. The identical size-and-weight tuple
carries three different jobs (legend, comparison row names, in-bar values) and is disambiguated
entirely by position and by the ink it is painted in — including reversed-out white inside the
coloured bars.

`style.marks` on the host page reports `fill rgb(51,51,51) ×12` and `fill rgb(29,129,162) ×1`, which
are datawrapper.de's page icons, not the chart.

## What is transferable

- **The neutral track behind a bar is the honest degradation of a bullet's qualitative bands.** When
  the source data carries no poor/ok/good split, one flat neutral track keeps the "how much of the
  way there" reading that the bands would otherwise provide, and manufactures no judgement. The type
  page already asks for exactly this; this chart is what it looks like when a tool ships it by
  default.
- **A track that reaches the plot's ceiling makes the remainder legible**, which is the reading a
  bare bar cannot give.
- **Show the comparison set in grey and say "for comparison" in the legend.** Eleven rows, six
  argued, and the reader is told which is which in three words.
- **Put the value inside the bar and delete the axis.** Where every row is labelled, an axis is
  redundant furniture.
- **Qualify in one italic line under the plate**, not in the body copy — Belgium's compulsory voting
  is the fact that decides whether the top bar means anything.

## What was not verified

- **This chart has no target and is therefore not a bullet.** Nothing here evidences how the same
  house draws a target; for that, see `datawrapper-dwcdn-net-dig4f`, which is the same publication.
- **Same publication as `datawrapper-dwcdn-net-dig4f`.** `datawrapper.de` and `datawrapper.dwcdn.net`
  are one design author under two hosts; counting them as two would be the host-as-proxy error.
  They corroborate nothing between themselves.
- It is the **vendor's own demonstration chart** on its own marketing page. Real data, real design
  decisions, and not a piece any newsroom commissioned.
- The exact grey of the "for comparison" bars against the track — `#C4C4C4` on `#F3F3F3` — was not
  checked for contrast; at these areas it is a mark-on-mark relation the WCAG non-text floor would
  govern, and it was not measured.
- Turnout definitions (registered vs voting-age population) differ between the eleven countries and
  the plate does not say which is used. That is the source's problem, not the chart's, and the chart
  does not flag it.
