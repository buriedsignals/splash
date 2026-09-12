# Information is Beautiful — "Tooth & Law"

- url: https://informationisbeautiful.net/visualizations/tooth-law-whats-halal-whats-kosher/
- archive: informationisbeautiful
- type: matrix, ordinal row scale × colour-banded categorical columns
- export: static
- readAs: the published poster as the page serves it, read at rest inside the 1440 × 900 page shot;
  the poster is a raster, so nothing inside it was measured by the style route

## What it is

A matrix of animals and foods against two dietary laws. The columns are five vertical colour bands —
`NEITHER`, `KOSHER`, `both`, `HALAL`, `NEITHER` — laid out so that the overlapping `both` band sits
physically between kosher and halal, the way a Venn intersection would. The rows are an ordinal
scale of `TASTINESS`, running `Delicious!` · `V. tasty` · `Tasty` · `Good` · `Meh` · `Average` and
onward below the fold. Each cell holds white animal silhouettes.

## What it does with information

**The column head is set in its own column's colour, and that is the entire legend.** `KOSHER` is
set in the orange-red of its band, `both` in the dark red-brown of its band, `HALAL` in the pale
blue of its band, `NEITHER` in the tan of its band. The bands themselves were sampled from
`screenshot.png` at y = 600: `#B83E17` (kosher), `#613116` (both), `#728E86` (halal), `#D8B28E`
(neither, both sides). No key, no swatch column, no caption line — the reader learns the code from
the heading they were going to read anyway.

**The row scale is ordinal and named in words, not numbered.** "Tastiness" has no unit and the
piece does not invent one; the rows are named by taste.

**The row axis is repeated on both edges.** `TASTINESS` appears at the far left and again at the far
right of the head, with the class names running down the right side. On a poster this wide, a reader
at the right edge would otherwise have to travel back across five bands to recover the row.

**The band's position carries meaning.** Putting `both` between `KOSHER` and `HALAL` and `NEITHER`
on the outsides makes the column axis a set diagram as well as a category axis. The layout is
doing work the labels do not have to.

**The mark depicts its subject** — a pig, a deer, a lobster — so the cell is readable without a
label, and the labels are absent from the marks entirely.

## What it does with style

Pixel route: ground `#FEFEFE` at 45.7 % of the page shot; the bands appear as the top chromatic
entries, `#D8B28E` at 14.1 %, `#613116` at 11.8 %, `#B83E17` at 4.6 %. The palette is classified
**sequential** — but `routes.pixel.measuredFrom` is `screenshot.png`, so that classification is of
the whole page including the site nav and promotional banner, not of the poster, and it carries no
weight. Taken as a reading of the bands it would understate that the `HALAL` band is a cool
`#728E86`; the eye sees warm-versus-cool where the clusterer sees one warm
ramp. All marks are white silhouettes, so the ink inside a cell is the ground of the poster and the
band supplies the contrast.

The display is a large light serif-free `Tooth & Law`; the piece's own standfirst, measured on the
page rather than in the poster, sits at `IBM Plex Sans | 18 | 400` — `And does tastiness play any
role? We were curious…`.

## What is transferable

- **Set a column head in that column's own colour and drop the legend.** It is the cheapest legend
  there is and it cannot fall out of sync with the encoding.
- **Order the categorical axis so its geometry carries the relation** — an intersection band between
  the two sets it belongs to.
- **Repeat the row axis on both edges of a wide matrix.**
- **Name an ordinal scale in words** where the quantity has no unit.

## What is this piece's own

The earth-tone palette, the animal silhouettes, and the editorial conceit of ranking foods by
tastiness at all.

## What was not verified

- **The poster's own type is entirely unmeasured.** It is a raster; the style route reached only
  the site's chrome. No size, weight, family or tracking inside the graphic is asserted, and **no
  direction can be measured off this reference.**
- **The exact hexes of the column headings.** The band fills above are sampled cleanly; sampling
  inside a glyph returned the letterform's interior rather than its colour, so the claim that each
  heading matches its band is a reading by eye, not a measurement.
- Everything below 900 px — the rest of the tastiness scale, the source line, the asterisked
  footnotes attached to the horse and the shrimp.
- The pixel shares are shares of the page shot, chrome included; `largestGraphic` returned nothing.
