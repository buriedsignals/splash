# Information is Beautiful — "Colours In Culture"

- url: https://informationisbeautiful.net/visualizations/colours-in-cultures/
- archive: informationisbeautiful
- type: matrix in polar coordinates, 84 meanings × 10 cultures, categorical cells
- export: static
- readAs: the published graphic as the page serves it, read at rest inside the 1440 × 900 page shot;
  the graphic is a raster, so nothing inside it was measured by the style route

## What it is

A matrix bent into a ring. The radial spokes are 84 **meanings** — `Anger`, `Bad Luck`, `Death`,
`Fertility`, `Mourning`, `Royalty`, `Wisdom` — numbered 1 to 84 around the circumference. The
concentric rings are 10 **cultures**, lettered A to J: `Western / American`, `Japanese`, `Hindu`,
`Native American`, `Chinese`, `Asian`, `Eastern European`, `Arab`, `African`,
`South American`. A cell is filled when that culture associates that colour with that meaning.

## What it does with information

**The cell's fill IS the value.** The encoded quantity is a colour, so the cell is painted in the
colour it denotes — red for `Anger` in the Western ring, white for `Mourning` in several Asian ones.
There is no scale to learn and no legend to consult, because the encoding channel and the subject
are the same thing. This is the family's cheapest possible key and it is available exactly when the
subject is itself a visual property.

**The axes are indexed off the graphic, not labelled on it.** 84 × 10 leaves no room for legible
labels in place, so both axes carry short codes — numbers on the spokes, letters on the rings — and
the expansion sits in a two-column list beside the figure. A matrix at this density must choose
between labelling in place and being dense; this one chooses density and pays the price openly with
a key the reader can hold in view.

**An empty cell is data.** Most of the ring is the paper colour, and the sparseness is the finding:
few associations are shared across cultures. The graphic does not fill the grid to make it look
complete.

**Polar layout buys the comparison the story wants.** Reading one spoke outward compares ten
cultures on one meaning, which is the question the piece is about. It costs the other comparison —
reading around a ring is much harder than reading along a row — and the piece accepts that.

## What it does with style

Pixel route: ground `#CBCAC3` at **69.1 %** of the page shot — a warm grey, not white, and the
single most consequential decision here, because a matrix of literal colours cannot sit on white
(white is one of the values) and cannot sit on black (black is another). A neutral mid-grey is the
only ground on which every value in the palette is visible as a mark. The palette is classified
**categorical** with ten clusters — a classification of the **page shot**
(`routes.pixel.measuredFrom` is `screenshot.png`), not of the graphic, and therefore not usable as
a reading of the encoding. The clusters it names are: `#E20613` red, `#FFE500` yellow, `#33AA52` green, `#4980C0` blue,
`#D4537A` pink, `#EAAB4A` orange among them.

The title `Colours In Culture` is set small, light, and white against the grey, top left — the
figure is given the page and the display register is deliberately quiet.

## What is transferable

- **Where the subject is a visual property, encode it as itself** and delete the legend.
- **Choose the ground so that every value in the palette can be seen as a mark.** A palette that
  includes white and black forces a mid-tone ground; this is a derivation, not a taste.
- **Index the axes off the graphic when the matrix is too dense to label in place**, and keep the
  index in view rather than in a caption below.
- **Let empty cells stay empty** where absence is the finding.

## What is this piece's own

The choice of the ten cultures and 84 meanings, which is an editorial claim the graphic does not
defend, and the polar layout.

## What was not verified

- **The graphic's own type is entirely unmeasured.** It is a raster; the style route reached only
  the site's chrome (`IBM Plex Sans`, `Quicksand`). **No direction can be measured off this
  reference.**
- **The bottom of the ring** is below the 900 px fold; only the upper two thirds of the matrix and
  the first two columns of the index were read.
- The pixel shares are shares of the page shot including the site nav and promotional banner;
  `largestGraphic` returned nothing here.
- Whether the sources behind the cultural associations are stated anywhere on the page.
