# ABC News — "Rich school, poor school: Australia's great education divide"

- url: https://www.abc.net.au/news/2019-08-13/rich-school-poor-school-australias-great-education-divide/11383384
- archive: url-list
- type: bubble column / beeswarm — one positional quantitative axis, area and colour channels
- export: scrolly
- readAs: the piece's own graphic element, photographed whole as `graphic.png` — **700 × 10 520 px**,
  which is the entire scroll canvas rather than one resting state


> **Also filed under `paired`.** One page can carry more than one
> form, and each record is an independent measurement of it. Wherever this page is cited it counts
> as **one publication** for the evidence floor, whichever family does the citing.

## What it is

Australia's 8 500 schools, one circle each, ranked down a single vertical **income** axis, the
circle **sized by total capital spend** on new facilities and renovations 2013–2017 and **coloured
by sector**. The article's own standfirst states both encodings in two sentences: *"These 8,500
schools are ranked from highest to lowest on the income ladder, according to their average yearly
income between 2013 and 2017. Circles are sized by total spend on new facilities and renovations in
that period."*

The only newsroom piece in this family's harvest that reached a real graphic. Thirteen other news
pages were drawn and none did.

## What it does with information

**The two encodings are stated in prose, in the article, before the graphic.** Not in a caption and
not in a key — in the standfirst a reader is already reading. The graphic then carries no
"circles sized by…" legend at all at the top of the column.

**The axis name and its ticks are the same size, separated by weight, both tracked.** Style route,
on the graphic's own elements: `ABCSans 12 / 700 / tracking 2.5` sets `INCOME` (23 runs, black);
`ABCSansRegular 12 / 400 / tracking 2.3` sets `$50m` (4 runs, black). Tick values also run in full
at the top of the column (`$105,000,000`, `$100,000,000`, `$80,000,000`, `$75,000,000` …), grey,
sitting **inside** the plot on their own hairline rather than in a left gutter.

**A called-out mark gets an identity card, not a label.** A ringed circle is joined by a thin
curved leader to a bordered white card containing, in order: the school's name in the **mark's own
colour** at `ABCSans 14 / 700`, its state at `ABCSans 14 / 900` on the same line, a key/value block
(`Income $104.6m`, `Cap. exp. $96.7m`, `Cap. exp. govt. $30,747`) with the key at
`ABCSans 13 / 700` in `rgb(34, 34, 34)` and the value in regular, a prose paragraph at
`ABCSans 13 / 400` in `rgb(85, 85, 85)`, and a **photograph of the building the money bought**.
The card answers "which one is that, and what did it do" in one object.

**A called-out mark is ringed, not recoloured.** In a field of 8 500 circles the singled-out ones
keep their sector colour and gain a dark stroke. The accent is a stroke, so the colour channel is
not spent twice.

**The prose and the graphic are set in different families.** Every label on the plate is
`ABCSans`; the scrollytelling narrative cards over it are `ABCSerif 17 / 400` in `rgb(51, 51, 51)`
(*"Australia's four richest schools spent more…"*), and the section display is
`abcserif 32 / 700`. Serif speaks, sans measures.

## What it does with style

Ground `#FFFFFF` at **89.9 %** (pixel route, on the whole scroll canvas). Palette **categorical**:
`#68E1CF` (171°, 1.20 %), `#FCA0A1` (359°, 1.00 %), `#5890FD` (220°, 0.67 %) — a teal, a pink and a
blue for the three school sectors, plus `#333333` at 0.08 % for ink and `#E9E9E9` / `#D4D4D4` for
the gridlines. Three families are in play across the page (`abcsans`, `ABCSans`/`ABCSansRegular`,
`abcserif`/`ABCSerif`), and the page carries an italic run (`abcsans 12 / 400 / italic`,
sample `(Supplied)` — the photo credit).

## What is transferable

- **State the encodings in the running prose** where the reader already is, and spend no plate on a
  key for them.
- **Axis name and axis tick at one size, separated by weight**, both tracked, the name in capitals.
- **A callout card, not a callout label**, when the singled-out mark is an entity a reader would
  want identified: name in the mark's colour, its own numbers as labelled key/value pairs, one
  sentence, one photograph.
- **Ring the called-out mark; do not recolour it**, when colour is already carrying a category.
- **Serif for the narrative, sans for the measurement**, so the reader can tell the story's voice
  from the chart's.

## What is this piece's own

The ABC's licensed faces and its three sector hues; the photographs.

## What was not verified

- **Which colour is which sector.** The style route read `Catholic` as a legend label
  (`ABCSansRegular 14 / 400`) but the colour-to-sector mapping was not read off the pixels, and it
  is not asserted anywhere above.
- **The palette figures are an average over the whole scroll, not over one state.** `largestGraphic`
  returned the entire 700 × 10 520 scroll canvas, so `#FFFFFF` at 89.9 % is the mean paper across
  every step, and the mark shares are diluted by the empty stretches between steps. Treat the hues
  as identified and the coverages as indicative only.
- **Whether the piece ever draws a second positional axis.** Only the income column was seen.
- The scroll was not stepped: the harvester scrolls one viewport and back
  (`METHOD.md`, correction 5). What the annotations say at later steps is unknown.
