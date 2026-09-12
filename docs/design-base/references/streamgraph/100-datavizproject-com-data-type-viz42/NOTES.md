# 100 datavizproject — #42, "a sorted stream graph"

- url: https://100.datavizproject.com/data-type/viz42/
- archive: datavizproject
- type: streamgraph — three bands, no fixed baseline, thickness carries the value
- export: static
- readAs: the encoding as the page draws it, at rest
- artifact actually read: the piece's own 823 × 823 chart plate (`style.graphic` = `img`,
  `documentTop` 172, `nearTheTop` true), not a page shot and not a promo card.


> **Also filed under `sankey`.** One page can carry more than one
> form, and each record is an independent measurement of it. Wherever this page is cited it counts
> as **one publication** for the evidence floor, whichever family does the citing.

## What it is

Three Scandinavian countries — `SE`, `DK`, `NO` — and their count of UNESCO World Heritage sites at
**two** dates, 2004 and 2022. Each country is a ribbon whose thickness at each end is its count. The
page's own prose calls it "a sorted stream graph" and admits the limitation in the same breath:
"this type of visualization is usually used with more data points for the timeline, but it can also
work with less."

**It is a streamgraph and not a stacked area, on the one test that separates them.** There is no
baseline. The blue band's lower edge is not pinned to anything; the whole stack floats and the
bands are free to move vertically past one another. That is exactly what lets `DK` and `NO` cross.

## What it does with information

**Every band is labelled inside itself, in the middle of its own run.** `SE`, `DK` and `NO` sit in
white on the fill, at the widest interior part of each ribbon — never at either end, where the shape
is narrowing and a label would spill. With no axis to look values up against, the in-band label is
the only thing tying a shape to a name.

**The value is printed at both ends, outside the stack, level with each band.** `13 / 5 / 4` down
the left, `15 / 10 / 8` down the right, in grey, outside the two vertical rules that mark the two
dates. The chart therefore states six numbers and no axis — the read is "how thick, and by how much
did the thickness change", and the exact quantity is written rather than measured off a scale.

**Sorting is the argument.** Because bands are re-ordered by size, `DK` and `NO` visibly swap: the
red ribbon climbs over the navy one somewhere in the middle of the span. The crossing IS the
editorial fact ("Denmark surpassed Norway in number of sites", one of the two stories the page tags
itself with), and no fixed-order stack would show it.

**There is a white gap between the bands.** A textbook streamgraph packs its layers edge to edge;
this one separates them by a few pixels of paper. It buys three clean silhouettes at three series
and would collapse at ten. Worth naming as a variant, not as the form.

**Two time steps is the honest weakness.** With only 2004 and 2022 there is no rhythm to read, and
the wiggle-minimising offset has almost nothing to minimise. What survives from this reference is
the LABELLING and the SORTING, not the temporal reading.

## What it does with style

Measured on this record's own `graphic.png` (`routes.pixel.measuredFrom = "graphic.png"`), palette
shape reported as `diverging`:

| role | value | coverage |
| --- | --- | ---: |
| ground | `#FFFFFF` | 82.49 % |
| band 1 (`SE`) | `#3274D8` | 8.75 % |
| band 2 (`DK`) | `#EE5440` | 4.37 % |
| band 3 (`NO`) | `#283250` | 2.82 % |

**The third band's navy is filed under `neutral` by the pixel route and is not furniture.** It is a
mark — the `NO` ribbon — and it is the one place a reader of this record could be misled by the
route's own vocabulary. The genuinely neutral entries are two steps of near-white (`#F3F5F6` 0.11 %,
`#ECEFF1` 0.09 %) and a grey (`#7A8192` 0.08 %) used for the two date rules and the six end
numbers. Paper is 82 % of the plate: three ribbons on a very empty field.

**Three hues for three series, and the accent order matches the ranking.** Blue is the largest band
and takes the most ink; the coral is the band that does the crossing.

Type on this record is the **publisher's page furniture**, not the graphic's: `stevie-sans` at 16 /
20 / 22 / 28 and `Borgia Pro` 18 for the description paragraph (`style.type`). The chart plate is a
raster `img`, so its own in-band labels were photographed, not computed. Nothing about the chart's
typography is claimed here.

## What is transferable

- **Label the band inside the band, at its widest interior point, in ink measured against that
  fill** — because the form has no axis, this is not decoration, it is the whole naming mechanism.
- **Print the value at the ends, outside the stack, rather than drawing a value axis.** A free
  baseline makes a y-axis a lie; a written number is not.
- **Sort the layers so the crossing happens.** When "A overtook B" is the fact, an inside-out or
  size-sorted order puts the overtake on the picture; a fixed order hides it.
- **Separate the bands by a hair of paper at low series counts.**

## What is this piece's own

Ferdio's house triad and `stevie-sans`; the two-step timeline, which is a property of the archive's
one dataset rather than a design choice.

## What was not verified

- **Which offset was used.** "Sorted stream graph" is the page's own word; whether the layout is
  `wiggle`, `silhouette` or hand-drawn cannot be told from two time steps.
- **Whether the in-band label ink was chosen by measured contrast**, or simply set to white because
  all three fills happen to be dark. On a pale band this drawing would need the other choice, and
  the piece never has to make it.
- **The contrast ratio of white on `#EE5440`** was not computed here.
- **One publication.** Everything above is Ferdio, and Ferdio is one desk encoding one dataset a
  hundred ways — a habit, in the sense `METHOD.md` correction 4 uses the word.
