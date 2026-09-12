# Nature Methods — *Visualizing samples with box plots*, Figure 4: the same data three ways

- url: https://www.nature.com/articles/nmeth.2813/figures/4
- archive: url-list
- type: three panels comparing encodings of one sample — bar-of-means, dot-and-error-bar, and box
  plots with optional means and 95 % CI notches
- export: static raster (`img`, 946 × 330, `documentTop` 454, `nearTheTop: true`)
- readAs: the published figure, on the publisher's own figure page
- routes: style `ok`, pixel `ok` (`measuredFrom: "graphic.png"`); consent dismissed —
  `record.consent` is `button "Accept all cookies"`

## What it is

The argument figure of the same column. Three panels, one dataset:
**a** *Means as bar plots*, drawn three times — with a zero baseline, with a log-ish truncated
baseline starting at 0.5, and with a broken axis — and marked **Not recommended**.
**b** *Means as scatter plots*, the same three groups as dots with `s.e.m.` error bars and then
`95 % CI` error bars, so the reader can see that the interval's meaning changes its length.
**c** *Box plots with optional means and 95 % CI*, six notched boxes — the same three groups drawn
twice, the right-hand three adding a mean inside the box.

It is a chart about choosing a chart, and it is the only reference in this family that draws its
editorial judgement as a mark.

## What it does with information

**The same three groups appear nine times across the figure, on axes that share a range.** Nothing
is re-scaled between panels, so the comparison is the reader's to make rather than the author's to
assert.

**The bar panel is shown failing in three separate ways rather than described as failing.** Two
of the three bar charts are the axis crimes — a baseline moved to 0.5, and a break drawn into the
bar — and the third is the honest zero-based one; all three carry the same verdict. The point of a
distribution summary is made by drawing what it replaces.

**In panel c the mean is a cross with its own small error bar, drawn INSIDE the box, and the median
stays the box's own rule.** All six boxes are notched; the left three carry the median alone, the
right three add the mean glyph. Two centres, two marks, no legend: the median is the structural line
the box is built on, the mean is an added object that can be omitted — and the figure shows both
states side by side so the omission is legible as a choice. Where `boxplot.md` says the median line
goes in ink, this shows what to do when a second centre has to be carried as well.

**The notch is an actual narrowing of the box, not a bracket beside it**, and the boxes are drawn
unfilled — white interior, black stroke — so the notch's waist and the mean's cross stay readable
inside them. The grey fills on this plate belong to panel a's bars, not to any box.

**The value axis runs −1 to 4 with ticks every 1, no unit**, exactly as in Figure 1.

## What it does with style

Measured on this record's own `graphic.png` (`pixel.ground`, `pixel.chromatic`, `pixel.neutral`,
`pixel.clusters`):

- ground **`#FFFFFF` at 86.316 %**.
- the greys are all in panel **a**: **`#A9AAAD` at 1.497 %** (the dark bar fill), **`#D4D4D5` at
  0.990 %** (the light bar fill, the same grey Figure 1 fills its box with), **`#F4F4F4` 0.654 %**,
  **`#E4E4E4` 0.510 %**, **`#EBECEC` 0.508 %**; the ink is **`#2B2B2B` 0.514 %**, **`#131314`
  0.496 %**, **`#0B0C0C` 0.482 %**, **`#1B1B1B` 0.474 %**.
- **the only chromatic ink on the whole plate is red, and it totals 0.112 % of the frame.**
  `pixel.clusters` reports a single cluster at **359°, share 0.00112, 24 members**; every entry in
  `pixel.chromatic` — `#FFCBCC` (0.018 %), `#FFC3C5`, `#FFCDD2`, `#FEBBBD`, `#FEBCC3`, `#FEB4B5`,
  `#FEACB3`, `#FEA3A5`, `#FEB5BA`, `#FEA4AA` — is an antialias tint of that one red.
  `pixel.shape` is `sequential`, `pixel.ramped` 1.
- **Looked at, that red is the two words `Not recommended`, and nothing else on the figure is
  coloured.** Three panels, nine charts, and the entire chromatic budget of the plate is spent on a
  verdict about a form.

## What is transferable

- **Colour spent on the judgement, not on the marks.** A monochrome distribution plate with one
  accent reserved for the one thing the designer wants argued is a whole editorial posture, and here
  it is measurable at 0.112 % of the frame.
- **The mean as a cross-with-error-bar inside the box, the median as the box's own rule** — how to
  carry two centres without a legend and without a second colour, and how to show the version
  without the second centre next to it.
- **An unfilled box when something has to live inside it.** White interior and black stroke keep a
  notch's waist and an interior glyph readable; the grey fill in Figure 1 is affordable only because
  nothing sits inside that box.
- **Show the encoding you are replacing, drawn from the same data, at the same scale**, when the
  beat's argument is partly about why this form was chosen.
- **A bar's dishonest baselines are worth drawing once, next to the honest one**, if the piece is
  making that case.

## What is this piece's own

The methodological framing (`s.e.m.` versus `95 % CI` as a teaching contrast), the panel letters,
and the near-total absence of colour, which is a journal's convention as much as a decision.

## What was not verified

- **The graphic is a raster `img`, so its lettering was never read by the style route.**
  `record.style.type` here is `nature.com`'s article furniture (`-apple-system`, `Harding`), which
  describes the figure page and not the plate. No type is quoted above.
- **The attribution of the red to `Not recommended` is read by eye from `graphic.png`, not by the
  route.** The record proves a single 359° cluster at 0.112 % and that it is the plate's only
  chroma; that those pixels are those two words is my reading of the image.
- **The page was read after a consent dialog was dismissed** (`Accept all cookies`).
- **One publication with `…figures-1`.**
