# Visual Capitalist — *Visualizing the Smoking Population of Countries* (the plate)

- url: `https://www.visualcapitalist.com/wp-content/uploads/2022/11/What-Percentage-of-Men-vs-Women-are-Smokers-Worldwide.png`
- archive: `search` · harvested 2026-09-08, browser, pixel route `ok`, style route `not-applicable`
- artifact actually read: **the published plate itself**, `1200 × 3600` PNG,
  `routes.pixel.measuredFrom = "graphic.png"`.
- **Why the plate and not the article.** The article page
  (`visualcapitalist.com/cp/visualizing-country-smoking-population/`) answers a headless Chrome with
  a Cloudflare *"Vérification de sécurité en cours"* bot check. A single `--via-firecrawl` pass got
  past it and returned only the article's opening card — the beige intro block, not the chart, which
  is `METHOD.md` correction 1 in a new costume. That record was deleted. The plate's own URL, read
  from the article's markup, serves the graphic and nothing else, so it was harvested directly:
  the chart-tool-permalink tactic of `METHOD.md` correction 18, applied to a static plate.
- Credited on the plate: *Visualization: Pablo Alvarez · Source: World Health Organization (via
  OurWorldInData.org)*. Published 11 December 2022.

## What it is

A **diverging bar mekko**: 52 countries, one horizontal bar each, **bar thickness ∝ population**,
bar length ∝ the percentage who smoke — orange to the left for women, white-with-a-black-outline to
the right for men, either side of a single vertical baseline. A cell's area is therefore the number
of smokers. Sorted descending by the male rate, so Indonesia (71 %) is at the top and Nigeria (7 %)
at the bottom, and China and India appear as two enormous slabs in the middle of an otherwise thin
list.

## What it does with information

**The width dimension is annotated inside the largest cell.** Down the right-hand edge of China's
bar runs a vertical double-headed arrow with the word `Population` set along it. That is the single
most useful thing on the plate: the second quantity in a variable-width chart has no axis and no
legend by default, so the designer put an arrow across the largest cell and named it there. Ferdio
answers the same problem with a brace under each column; the IEA answers it with a cumulative axis;
this answers it with one annotated arrow, and it costs nothing.

**Type scales with the cell instead of vanishing from it.** China's `2%` / `China` / `49%` are set
enormous; Myanmar's `20%` / `Myanmar` / `68%` are set tiny on a bar a few pixels thick; Nepal, Ghana,
Côte d'Ivoire and Canada — thinner still — keep a tiny percentage inside and have their *name moved
outside*, to the right of the bar, in grey. This is a working answer to the type page's rule that
small cells should go unlabelled rather than clip: here nothing is dropped, the label degrades in two
stages (shrink, then move out), and the reading order still runs largest-first.

**The exception is pulled out with a leader.** Nauru — one of only two countries where women smoke
more than men, and a hairline bar — has its name and `49%` set at the far left of the plate on a
long horizontal leader line that runs back to its bar. The outlier the story is about is given the
room its data does not earn.

**The header is the axis.** `% of women who smoke` (orange) and `% of men who smoke` (grey) sit at
the top on either side of the baseline, and there is no tick ladder, no gridline and no scale
anywhere on the plate. Every value is printed at the end of its own bar instead.

## What it does with style

Colour, from `record.pixel`, measured on `graphic.png`: the ground is **not white** — `#F3E4CD`, a
warm beige, at 69.93 % coverage, with `#FFFFFF` at 13.20 % appearing as the *fill of the men's bars*
rather than as the page. One chromatic accent, `#F2B25D` at 2.95 %, is the women's bars and the
women's labels. Palette shape reads `sequential`. `#635D54` and neighbours carry the grey type.

**Two series, one accent, and the second series is drawn as absence** — an unfilled white box with a
black stroke on a beige ground. It reads as clearly as a second hue would and it keeps the plate to a
single colour decision.

Type is **not** quotable as the graphic's voice: `style.typeSource` says *"the page only — the
graphic is a raster and carries no type this route can read"*, and the style route is
`not-applicable` besides. What the eye reads is a single humanist sans in one weight at many sizes.
The `style.ground` value of `rgb(14, 14, 14)` in this record is **Chrome's own image-viewer chrome**,
not the artifact; the artifact's ground is the pixel route's `#F3E4CD`.

## What is transferable

1. **Name the width dimension on the plate** — here a labelled double-headed arrow across the
   largest cell.
2. **Degrade a cell label in two stages: shrink it, then move it outside the cell.** Better than
   dropping it, and it keeps every row identifiable.
3. **A leader line for the outlier whose cell is too small to hold it.**
4. **Draw the second series as an outline rather than a second hue**, so a two-series chart needs one
   accent.
5. **A warm non-white ground** with the accent's own hue family — the ground and the accent here are
   34–36° apart in hue, so the plate reads as one material.

## What was not verified

- No contrast measurement was made of the grey type on `#F3E4CD`, nor of the orange labels on the
  beige; the small grey country names outside the thin bars are the pair most at risk.
- That thickness encodes population is taken from the plate's own `Population` arrow and its stated
  scope ("the world's 50 most populous countries"), not measured bar by bar.
- The style route did not run: the artifact is a raster, so no computed type, no marks, no ground
  from the document.
- One publication. Nothing here is corroborated by Visual Capitalist alone.
