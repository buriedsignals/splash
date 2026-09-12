# Ferdio / 100.datavizproject.com — #6, range bar

- url: https://100.datavizproject.com/data-type/viz6/
- archive: datavizproject
- type: horizontal range bar — one bar per country, 2004 as a darker segment inside the 2022 bar
- export: static (a raster served in the page)
- readAs: the published page at 1440×900, read at rest. The chart is an image: the harvester found
  no graphic element (`largestGraphic: null`), so the pixel route measured the **whole page shot**,
  DVP's own blue navigation bar included, and the style route reached only the page's chrome.


> **Also filed under `paired`.** One page can carry more than one
> form, and each record is an independent measurement of it. Wherever this page is cited it counts
> as **one publication** for the evidence floor, whichever family does the citing.

## What it is

One of a hundred encodings of the same dataset — UNESCO World Heritage sites in Denmark, Norway and
Sweden, 2004 against 2022. Here each country is one rounded bar running from zero to its 2022 value,
with its 2004 value marked as a darker section inside the same bar.

## What it does with information

**Both endpoints are numbers on the bar, and there is no axis.** Norway reads `5` then `8`, Denmark
`4` then `10`, Sweden `13` then `15` — each in a pill sitting at the boundary it marks. No scale, no
ticks, no gridlines: every quantity the chart holds is printed.

**The key is drawn once, on one bar, in the position it explains.** Only Sweden's two pills carry
year labels — `2004` and `2022` on small leaders below them. The other two rows inherit the reading
by their identical geometry. A detached legend would have been a second thing to look at; naming the
two positions once on the row nearest the labels is enough.

**One bar, two states, no second mark.** Because 2004 is a section of the 2022 bar rather than a
second bar beside it, the growth is the exposed remainder and needs no subtraction. The encoding
only works where the later value is the larger one, which the piece's data happens to guarantee.

**Rows are ordered by the value being compared**: 8, 10, 15 ascending.

## What it does with style

Ground read as `#F4F7F7` at **44.7 %** with `#FFFFFF` at **42.9 %** — the site's tinted page and the
chart's own white card. Strongest chromatic cluster `#3274DA` at **9.6 %**; palette read as
**diverging**, blue against a red family (`#F37666`, `#F05440`). **The blue cannot be attributed to
the chart**: DVP's fixed navigation bar is the same blue and occupies the top 80 px of every shot.
One country per hue — navy for Norway, red for Denmark, blue for Sweden — with the 2004 section
drawn as a darker step of the same hue rather than a different colour.

## What is transferable

- **Nest the earlier state inside the later bar** so the change is the visible remainder.
- **Print the number at each boundary and drop the axis.**
- **Teach the key once, on one row, where the positions are** — not in a legend.
- **A step of the same hue reads as "the same thing, earlier"**; a different hue would read as a
  different thing.

## What is this piece's own

The flag roundels as row identity, the fully rounded bar ends, and the one-hue-per-country palette,
which only works for three categories.

## What was not verified

The chart's own typography — sizes, weights, families of `Norway`, `13`, `2004` — is entirely
unmeasured; the style route read DVP's page chrome (stevie-sans, Borgia Pro) and not the raster. The
pixel palette is the page's, not the chart's. And `100.datavizproject.com` is **one publication, one
designer, one dataset**: nothing here can corroborate anything else from this archive.
