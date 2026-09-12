# Information is Beautiful — "Selling Out: How much do music artists earn online?"

- url: https://informationisbeautiful.net/visualizations/how-much-do-music-artists-earn-online-2015-remix/
- archive: informationisbeautiful
- type: table whose `% CUT` column is a 100 % stacked bar, one per row
- export: static (a raster panel served inside the page)
- readAs: the published panel as the page serves it, read at rest at 1440×900. The panel is an
  image, so the harvester found no graphic element (`largestGraphic: null`, `marks: []`) and the
  pixel route measured the **page screenshot**, not the panel alone. Only the top of the table was
  in frame; the readings below are of the header and the first two rows.

## What it is

A row-per-release table — platform, format, deal, retail price, units that must be sold, and the
split of each sale — where one column is not a number but a bar.

## What it does with information

**The legend is the column header, coloured.** Over the `% CUT` column stand the words
`distributor / retailer`, `label`, `artist`, each set in the colour of the segment it names — cyan,
grey, pink. There is no swatch block anywhere. The reader learns the code by reading the header they
were going to read anyway, and the code is repeated on every screenful the header is in.

**Each segment carries its own percentage, inside itself.** Self-distributed album CD: one pink
segment, `100`. Bandcamp album download: a cyan `15` against a pink `85`. The stacked bar's known
weakness — a segment that does not start at zero cannot be measured by eye — is repaired rather than
ignored.

**And the bar is checkable against its own row.** The CD row reads retail `$12.00`, artist revenue
`$12.00`, bar `100`. The Bandcamp row reads retail `$10.00`, artist revenue `$8.50`, bar `85`. The
percentages and the currency in the same row agree, which is what makes the bar an argument rather
than a decoration.

**A callout defines a whole column, not a data point.** A circle reading *"For a solo artist to earn
US monthly min. wage $1,260"* sits above the table with a single arrow into the `they must sell`
header. The annotation names the assumption the entire column rests on, once, at the top, instead of
repeating it as a footnote per row.

## What it does with style

Pixel route on the page shot: ground `#1C1C1C` at **66.8 %** — the dark panel — with `#FDFDFD` at
**17.2 %**, which is the site's own page around it. Palette read as **diverging**; the strongest
chromatic clusters are `#821553` (1.4 %), `#D4537A` (0.7 %) and warm yellows around 36–40° (`#EAAB4A`,
`#ECB445`). Column headers are set in a grey that recedes; the row values are near-white; the pink
carries the subject, which is what the artist keeps.

## What is transferable

- **Colour the words of the column header in the segment colours and delete the legend.**
- **Print each segment's share inside the segment** in a 100 % stacked bar.
- **Let the bar be arithmetically checkable against the numbers in its own row** — a stacked share
  beside the amounts it splits is a claim the reader can test.
- **Annotate the column, not every cell**, when a whole column rests on one assumption.

## What is this piece's own

The dark panel, the platform logos as row identity, and the pink/cyan pairing.

## What was not verified

Everything below the second row — the table continues past the fold and was never in frame. The
graphic's own typography is entirely unmeasured: the style route read the page's article type
(IBM Plex Sans, Quicksand), not the panel, because the panel is a raster. No hex was read off the
segments themselves; the colour names above are read off the image by eye.
