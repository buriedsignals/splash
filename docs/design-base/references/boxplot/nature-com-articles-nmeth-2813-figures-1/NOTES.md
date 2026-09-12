# Nature Methods — *Visualizing samples with box plots*, Figure 1: the construction of a box plot

- url: https://www.nature.com/articles/nmeth.2813/figures/1
- archive: url-list
- type: box plot — the canonical anatomy, drawn twice (plain and notched) above the sample it
  summarises
- export: static raster (`img`, 946 × 356, `documentTop` 454, `nearTheTop: true`)
- readAs: the published figure, on the publisher's own figure page
- routes: style `ok`, pixel `ok` (`measuredFrom: "graphic.png"`); consent dismissed —
  `record.consent` is `button "Accept all cookies"`

## What it is

Krzywinski & Altman's *Points of Significance* column for February 2014, and the most deliberate
drawing of this form the harvest reached. **Panel a** is the population it is all sampled from — a
skewed density with `−σ μ +σ` marked, and above it the same distribution's `m` and `IQR` drawn as a
one-dimensional box so the two summaries can be compared on the same axis. **Panel b** builds the
box plot from a sample of `n = 20`: the twenty points first, then the plain box plot under them,
then the notched box plot under that.

**The article itself is paywalled and this figure page is not.** `nature.com/articles/nmeth.2813`
returns "This is a preview of subscription content" and the harvester correctly reported *no
graphic outside the site's own chrome* — the figures are not rendered behind the gate. That record
was deleted rather than filed. `…/figures/1` and `…/figures/4` serve the plates in full, which is
the route to the real artifact this reference rests on.

## What it does with information

**The sample is drawn above the box, on the same axis, as open circles.** The reader sees the twenty
points and the rectangle that claims to summarise them in one vertical glance. This is the answer to
the failure mode `skills/chart-beat/references/types/boxplot.md` names — a box built from five points
draws the same confident rectangle as one built from five thousand — and the answer is: show both.

**Every part of the construction is named on the plate, in words, in three registers.**
`Sample, n = 20` over the points. `1.5 × IQR`, `IQR`, `1.5 × IQR` as three bracketed spans across
the top. `Q1`, `m`, `Q3` on the box itself, `Whiskers` over the extending rules, `Outliers` over the
detached dots at the right. `Notch` on the second box, and beneath it
`95 % CI for m` / `m ± 1.58 × IQR/√n`, the formula written out. **The whisker rule is not implied,
it is stated** — and the fence's arithmetic is on the picture rather than in a caption.

**Outliers are individual dots, drawn beyond the whisker's end, at the same size as the sample
points above them.** They are visibly the *same objects* as the raw sample, not a different mark
class. Two are drawn as a pair and one further right, and the whisker stops short of all three.

**The notch's height is annotated `~√n`** with a dotted vertical rule to the right, so the reader is
told that the notch's width means sample size, not spread.

**The axis is a bare rule with ticks at −2, −1, 0, 1, 2 and no unit** — this is a figure about a
form, so the quantity is deliberately abstract. On a beat, the unit label is the thing this figure
is entitled to omit and a real chart is not.

## What it does with style

Measured on this record's own `graphic.png` (`pixel.ground`, `pixel.chromatic`, `pixel.neutral`,
`pixel.shape`):

- ground **`#FFFFFF` at 87.787 %**.
- **`pixel.chromatic` is EMPTY. `pixel.shape` is `monochrome`, `pixel.ramped` is 0.** The entire
  figure is drawn without one chromatic pixel.
- the box fill is the plate's largest non-white neutral, **`#D4D4D5` at 3.253 %**, with
  `#CCCCCC` (0.383 %), `#DCDCDC` (0.369 %), `#ECECEC` (0.520 %), `#E3E3E3` (0.495 %) and
  `#F4F4F4` (0.715 %) around it — one light grey, plus the grey-scale ramp its edges and the
  density curve's fill produce.
- the ink is **`#232323` (0.428 %)**, **`#141414` (0.396 %)** and **`#1C1B1C` (0.319 %)** — rules,
  lettering and dot outlines together under 1.2 % of the frame.

**One grey fill, one black ink, white paper, and nothing else.** A form whose whole job is to hold
five statistics steady is drawn with no colour to allocate at all, and the panel letters `a` / `b`
are the heaviest single marks on it.

## What is transferable

- **Draw the sample above the summary on a shared axis.** The strongest available answer to the
  box plot's central dishonesty, and it costs one row.
- **Name the whisker rule on the plate** — `1.5 × IQR` written across the span it governs, not
  relegated to a footnote. The one thing `boxplot.md` says this form is only ever as honest as.
- **Outliers as individual dots in the sample's own mark**, beyond a whisker that visibly stops.
- **When an element's geometry encodes something other than value, annotate the geometry**
  (`Notch`, `~√n`, `95 % CI for m`).
- **A distribution summary needs no colour.** Grey box, black median, white paper — the accent stays
  available for whatever the beat is actually arguing.

## What is this piece's own

Journal-figure conventions: panel letters, italic single-letter statistics (`m`, `n`, `σ`, `μ`), an
unlabelled abstract axis, and a density curve panel that exists to teach rather than to report.

## What was not verified

- **The graphic is a raster `img`, so its lettering was never read by the style route.**
  `record.style.type` on this record is `nature.com`'s article furniture — `-apple-system`,
  `Harding` — including the figure page's own `Harding | 32 | 700` title
  *"Figure 1: The construction of a box plot."*, which is the **page's** heading and not a label on
  the plate. Nothing about the figure's typography is quoted above.
- **The page was read after a consent dialog was dismissed** (`Accept all cookies`), so it is a page
  in a state the harvester put it in.
- **One publication with `…figures-4`.** Two figures from one article by one pair of authors
  corroborate nothing between themselves.
- Whether the printed article's figure differs from the web `lw1200` JPEG was not checked.
