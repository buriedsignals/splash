# Proposal — the marimekko family (mekko, mosaic plot, variable-width bar)

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/` or `registers/`; those directories were not touched, and
nothing proposed here has been rendered.

Family: **a bar chart whose bar WIDTHS carry a second quantity, so that a cell's AREA is the
reading.** Corpus: `docs/design-base/references/marimekko/`, **seven records from three
publications**, all seven measured on their own `graphic.png`
(`routes.pixel.measuredFrom === "graphic.png"` on all seven; none is `screenshot.png`, none is
`not-applicable`). Harvested 2026-09-08, from zero references.

---

## 0. The finding, before the treatments

**This form is published — but it cannot be found by its name, and that is the whole difficulty.**

Searching for it behaves exactly as the boxplot harvest's did. Roughly a dozen searches across
`search.sh` (empty all day — shared SearXNG saturation, not absence), `WebSearch` (until the
session's 200-call budget was exhausted by six parallel siblings) and `firecrawl search` returned,
almost without exception: **tool documentation**. Domo, Tableau, Jaspersoft, FusionCharts,
Highcharts, AnyChart, think-cell, ChartExpo, Inforiver, okviz, everviz, Peltier Tech, Flourish,
Mekko Graphics, chartmekko.com, deckary, SketchBubble, Oracle Analytics, Power BI, Stata, ggplot2.
Roughly forty vendor pages and not one newsroom piece. The literature is unanimous that this is a
**strategy-consulting chart** — "a staple of strategy consulting (McKinsey, BCG) for market sizing",
named after Finnish textiles, drawn in PowerPoint.

**And then the form-indexed indexes returned three real newsroom pieces in one request.**
`datavizcatalogue.com/blog/chart-snapshot-variable-width-bar-charts/` (25 March 2024) lists seven
examples; four are vendor galleries and **three are published journalism**:

| piece | desk | what it is |
| --- | --- | --- |
| *Racism's Hidden Toll*, 11 Aug 2020 | **The New York Times** (Opinion) | gaps between Black and white mortality rates for the top 15 causes of death |
| *Biden calls for 100 percent clean electricity by 2035*, 30 Jul 2020 | **The Washington Post** | "How each state generated electricity in 2019" |
| *Visualizing the Smoking Population of Countries*, 11 Dec 2022 | **Visual Capitalist** | share of men vs women who smoke, 52 countries |

`flowingdata.com/charttype/variable-width-bar-chart/` indexes sixteen more posts of the same form.
**A chart-type index at a dataviz publication is a fourth kind of form-indexed archive**, and in this
wave it was the only thing that worked. It belongs beside `100.datavizproject.com` and the IEA chart
library in `METHOD.md`'s table. Searching for the form's *name* finds vendors; searching an index
*of the form* finds desks.

**Two of those three desks then declined to be read**, which is `METHOD.md` correction 8's dominant
failure mode at full strength — see §1 for exactly what each wall said and what was and was not
attempted. The one that could be reached was reached at **the plate's own URL**, not the article's.

**The honest shape of the family is two branches, and they are not the same chart.**

- **The stacked marimekko** — columns of variable width, each stacked to show its own composition,
  one shared palette down every column. Ferdio draws it twice (`viz9`, `viz90`). The Washington Post
  draws it, and *names* it: the desk's own asset in the article's markup is
  `bidencleanpower-state-final-marimekko-xlarge.jpg`. The IEA draws it once
  (`production-costs-for-biogases…`) and gets it partly wrong — it colours by *column* rather than by
  series, which discards the form's central affordance.
- **The variable-width bar / cost curve** — width is a quantity, height is a *rate*, area is the
  product, no stack at all, and the x axis is **cumulative** so the widths can be read off it. This
  is what the form is in energy and materials publishing, and it is where the depth is: the IEA chart
  library reports **76 charts** under `?type=variwide`, and every one of the twelve on page 1 is a
  marginal abatement cost curve or a production cost curve. Visual Capitalist's smoking plate is the
  same construction rotated and diverged.

`skills/chart-beat/references/types/marimekko.md` describes only the first branch. Nothing in it is
contradicted — its warnings about a positive column total, in-cell contrast and label collision all
hold — but on this evidence the type page is missing the branch the form is *mostly* published as,
and missing the problem every one of these seven charts had to solve, which is §2.1.

---

## 1. The yield, for `METHOD.md`'s log

| family | archive | drawn | harvested | survived looking | proposed for filing |
| --- | --- | ---: | ---: | ---: | ---: |
| marimekko | url-list | 0 | 0 | 0 | 0 |
| marimekko | datavizproject | 100 | 4 | 2 | 2 |
| marimekko | search | 15 | 10 | 5 | 5 |
| marimekko | informationisbeautiful | 0 | 0 | 0 | 0 |
| marimekko | buried-signals | 0 | 0 | 0 | 0 |
| **total** | | **115** | **14** | **7** | **7** |

**`url-list` drew zero, and that is a measurement.** `grep -icE 'marimekko|mekko|mosaic'` over all
3 827 urls returns **0** — not two irrelevant subject matches as the boxplot family found, but
nothing at all. This form has no subject of its own to be named in a slug.

**`datavizproject` drew 100 and yielded 2.** All 100 thumbnails were downloaded and read on four 5×5
contact sheets before anything was harvested (the site is behind a Cloudflare challenge to `curl`,
but its asset path `…/wp-content/uploads/viz/viz-N.png` is not). Seven were enlarged; four harvested;
two survived. `viz90` is the canonical marimekko; `viz9` is an area-scaled variant. **`viz55` and
`viz62` were deleted after looking**: both are treemaps — recursive subdivision with no shared
column alignment, and in `viz62` the cells do not even align across the two year panels (Denmark is
the right-hand column in 2004, Norway in 2022). That is precisely the failure this form exists to
avoid, so filing them under `marimekko/` would put a wrong answer where an index would read it as a
right one. Three more were refused at the sheet (`viz43` a widening waffle, `viz84` equal-width
grouped stacks, `viz97` variable-length bars with no second dimension).

**`search` drew 15 and yielded 5**, and the five are four IEA charts plus one Visual Capitalist
plate. What happened to the rest:

| harvested | outcome |
| --- | --- |
| 4 × IEA variwide (nitrogen, copper, biogas, methane-by-policy) | **kept** — one published chart per page, no masthead, no wall, no second graphic |
| `iea.org/…/marginal-abatement-cost-curve-for-methane-emissions-from-oil-and-natural-gas-2025` | **deleted** — a near-duplicate of the methane-by-policy chart: same subject, same construction, same illegible hairline plate. `METHOD.md` correction 18's "one ink layer photographed twice", caught before the arithmetic guard had to fire |
| `nytimes.com/…/us-coronavirus-black-mortality` | **deleted** — headless Chrome got NYT's *"Accès temporairement restreint"* bot wall. One `--via-firecrawl` attempt: Firecrawl declines nytimes.com outright — *"we do not support this site"*. Not worked around |
| `washingtonpost.com/…/biden-calls-100-percent-clean-electricity…` (article) | **deleted** — headless Chrome: `ERR_HTTP2_PROTOCOL_ERROR`. Firecrawl reached the real article and screenshotted **the top viewport only**: masthead, headline, byline and the first chart, which is a line chart. The marimekko is further down |
| `washingtonpost.com/wp-stat/graphics/ai2html/bidencleanpower/…-final-marimekko-xlarge.jpg` | **deleted** — the plate's own url, read out of the article's markup. It answers *every* client the same way: headless Chrome, plain `curl`, `curl` outside the sandbox, and Firecrawl all get `HTTP/2 stream 1 was not closed cleanly: INTERNAL_ERROR`. That is the site declining automated reading. Nothing is described from it |
| `visualcapitalist.com/cp/visualizing-country-smoking-population/` (article) | **deleted** — Cloudflare *"Vérification de sécurité en cours"*. A `--via-firecrawl` pass got past it and returned the article's **opening card** — a beige intro block — which the pixel route dutifully measured. Correction 1 arriving through the paid route |
| `visualcapitalist.com/wp-content/uploads/2022/11/What-Percentage-of-Men-vs-Women-are-Smokers-Worldwide.png` | **kept** — the plate's own url, 1200 × 3600, the whole published graphic and nothing else |

**Firecrawl was used four times and is declared here**: twice on NYT (declined), once on the WaPo
article (top viewport only), once on the Visual Capitalist article (opening card only). It bought
**nothing that survived**. What worked instead cost no credits: taking the graphic's own URL out of
the article's markup.

**Independence, read off the url host and then checked.** Three publications:
`100.datavizproject.com` (2 records), `iea.org` (4), `visualcapitalist.com` (1). The two Ferdio
records corroborate nothing between themselves and the four IEA records corroborate nothing between
themselves (`METHOD.md` correction 4). One caveat worth stating rather than hiding: the Visual
Capitalist plate is credited to **Pablo Alvarez**, an outside "Featured Creator", with VC editing —
so it is independent of Ferdio and the IEA as a design author, but it is one freelance designer's
plate rather than a graphics desk's house style, and should not be read as evidence of what
newsrooms habitually do.

---

## 2. Treatments to file

### 2.1 `name-the-width-dimension` — imported, **and it clears the floor on three publications**

> In a chart whose bar widths carry a quantity, that quantity has no axis, no legend and no tick by
> default. Every reference in this corpus invents an apparatus to state it, and a chart that states
> nothing is asking the reader to compare two widths by eye and then multiply.

This is the one thing all seven references have in common, and they solve it four different ways:

| reference | publication | how it names the width |
| --- | --- | --- |
| `100-…-viz90` | Ferdio | a thin rounded **brace** under each column, spanning its full width, dropping to the total in bold over the year in grey |
| `100-…-viz9` | Ferdio | the total set as a **large numeral above** each block |
| `iea-…-nitrogen`, `iea-…-copper`, `iea-…-biogases` | IEA | a **cumulative x axis** — `Cumulative cropland (million ha)`, `Copper from concentrate (kt)`, `bcme` — so each bar's width is read straight off the scale |
| `visualcapitalist-…-what-percentage-of-men` | Visual Capitalist | a **labelled vertical double-headed arrow** down the inside of the largest cell, reading `Population` |

Three independent publications; four distinct mechanisms; zero references that omit it. The
treatment is not "draw a brace" — it is **the width must be named on the plate**, and the three
mechanisms are its variants: brace/numeral where columns are few, a cumulative axis where they are
many, an annotated arrow across the largest cell where neither fits.

Evidence: `100-datavizproject-com-data-type-viz90`,
`iea-org-data-and-statistics-charts-nitrogen-based-fertiliser-consumpti`,
`visualcapitalist-com-wp-content-uploads-2022-11-what-percentage-of-men`.

### 2.2 `label-ink-by-measured-contrast` — derived

The type page already records the shipped failure this closes: a naive brightness rule put white on
a mid-toned green cell that measured under 4.5 : 1, while dark ink cleared comfortably on the same
fill. A beat drawing this form **knows every cell's fill**, because it chose it; it can compute the
contrast rather than guess it. Cites no publication; owes a `detect` and a `provenBy` render.

Corroborated but not evidenced by the corpus: Ferdio sets every in-cell percentage in white on
`#3274D8`, `#EE5440` and a near-black navy — and `#EE5440` (l = 0.592) is exactly the fill where a
brightness heuristic would be closest to wrong. **No contrast measurement was made on any reference
in this corpus**, which is stated in all seven `NOTES.md` and is this harvest's largest gap.

### 2.3 `cell-label-only-where-the-cell-holds-it` — derived

The type page asks for it; the corpus shows it working three different ways, all of which the beat
can decide for itself because it knows both the cell's box and the label's measured extent:

- **Ferdio `viz90`** labels every cell, because with three series and two columns none is small.
- **Visual Capitalist** degrades in **two stages** — the label shrinks with the bar's thickness, and
  when it can shrink no further the *name* moves outside the bar to the right in grey while the
  percentage stays inside. Nothing is dropped and every row stays identifiable.
- **IEA nitrogen** names only the bars wide enough to hold a name and leaves forty others unlabelled
  rather than clipping.

Owes a `detect` and a `provenBy` render.

### 2.4 Three that are real and are **not** filed, because each rests on one publication

- **`grey-field-chromatic-argument`** — IEA only. `nitrogen` puts **more than a quarter of the plate
  in deliberate neutral** (`#F2F2F2` 20.30 % + `#E6E6E6` 5.34 %) and spends eight low-coverage
  accents on the cases that matter; `copper` reduces the same idea to `monochrome` — one accent
  `#FF754B` at 6.12 %, one grey `#E6E6E6` at 15.69 %, one ground. Both are one desk.
- **`two-type-registers-at-one-size`** — IEA only, and clean: everything on every IEA plate is
  **Graphik at 12 px**, split by weight and colour alone — `400` in `rgb(111, 111, 111)` for axis
  titles and annotation prose, `500` in `rgb(0, 0, 0)` for the data's own names. Four records, one
  publication.
- **`annotate-the-area-with-what-the-area-equals`** — IEA `nitrogen` only, and it is the treatment
  this family most needs. The pale field between the curve and the target line carries, inside it,
  `Underserved nitrogen demand towards 2034` / `8 Mt NH₃-eq`. In a chart where area is the reading,
  an unannotated area is a quantity the reader is asked to integrate by eye. **One publication, so
  it waits** — and per `METHOD.md`'s 2026-09-08 note, a rule that waits should be re-checked rather
  than left, because it can be refuted while it waits.

---

## 3. Directions to file

A direction needs one reference, because a direction is a coherent whole.

### 3.1 `cost-curve` — from `iea-org-…-nitrogen-based-fertiliser-consumpti`

The energy-publishing whole: a cumulative x axis; bars sorted into a descending staircase; a grey
field carrying the full distribution with a small non-contiguous accent set picked out of it; **named
horizontal reference lines whose right-aligned labels sit on the line with no leader** (`World
average`, `African Union 2034 target`); and a shaded region annotated in its own body with the
quantity it equals. Measured: ground `#FFFFFF` 66.26 %, neutrals `#F2F2F2` 20.30 % and `#E6E6E6`
5.34 %, black rules at 0.60 %, eight categorical accents each under 1.8 %. Type — quotable here,
`typeSource` = *"the page, which contains the graphic — the two are not separated"* — Graphik 12 px
in two registers.

### 3.2 `diverging-bar-mekko` — from `visualcapitalist-…-what-percentage-of-men`

One accent and one outline on a warm ground. Bar thickness ∝ population, length ∝ percentage,
diverging about a single vertical baseline; the header pair *is* the axis and there is no tick ladder
anywhere; type scales with the cell and steps outside it when it cannot shrink further; the outlier
that the story is about (Nauru) is pulled to the far left on a long leader because its bar is a
hairline. Measured: ground `#F3E4CD` at 69.93 % — **not white** — one accent `#F2B25D` at 2.95 %,
and `#FFFFFF` at 13.20 % appearing not as page but as *the fill of the second series*, which is drawn
as an unfilled outline rather than a second hue. Ground and accent are 34–36° apart in hue, so the
plate reads as one material.

### 3.3 `flat-mekko` — from `100-datavizproject-com-data-type-viz90`

Ferdio's: white ground `#FFFFFF` 74.98 %, three flat fills held constant down every column
(`#3274D8` 12.12 %, `#EE5440` 5.88 %, `#192440` 5.51 %), no axis of any kind, no gridline, no tick;
each cell labelled with its share **only**, colour carrying identity; a brace under each column
naming the total. Type is **not** part of this direction — `typeSource` on both Ferdio records is
*"the page only — the graphic is a raster and carries no type this route can read"*, so the direction
must derive its type from `body` and say so.

---

## 4. What the pool taught, for `METHOD.md`

**A. There is a fourth kind of form-indexed archive: a chart-type index at a dataviz publication.**
`datavizcatalogue.com/blog/chart-snapshot-<type>/` and `flowingdata.com/charttype/<type>/` are
indexed by FORM and curated from *published* work. Every newsroom candidate in this wave came from
one request to the first of them, after roughly a dozen name searches had produced only vendors. For
a family whose name only appears in tool documentation, this is the seam. **Caveat learned the same
day**: their images are 750 px re-hosted screenshots of other desks' charts
(`oil-imports-NYT-750x1045.png`, `how-each-state-generated-electricty-in-2019-750x654.png`) — harvest
what they *link*, never what they *host*.

**B. The IEA chart library's type filter has eleven values, and `variwide` is one of them.**
Read 2026-09-08: column 3 807, line 1 290, bar 590, area 500, pie 318, waterfall 278, range column
142, **variwide 76**, scatter 28, bubble 7, range area 2 — of 7 038 charts. This extends correction
18's list. Two limits found: pages 2–7 of a filtered listing **do not render in headless Chrome**
(client-side route; `?page=N` returns a shell) and Firecrawl timed out on them, so only page 1 of any
filter is enumerable by the tools here; and the 12 charts on `variwide` page 1 are all cost curves,
so the filter names a *construction*, not this family.

**C. A publisher's own asset filename is provenance, even when the plate cannot be read.**
The Washington Post's marimekko is unreachable, but the article's markup names it
`bidencleanpower-state-final-marimekko-xlarge.jpg`. That a major desk draws this form **and calls it
a marimekko** is established; what the plate looks like is not, and nothing here describes it.

**D. For a desk that publishes a plate, the plate's URL is a better target than the article** —
correction 18's chart-tool-permalink insight, generalised. Visual Capitalist's article is behind
Cloudflare and its opening card is a beige text block that measures as a chart; the same publisher's
`wp-content/uploads/…png` serves 1200 × 3600 of pure graphic with no chrome at all. The `ai2html`
path in the WaPo markup is the same pattern (six breakpoint JPEGs per graphic) and would have been
the same win had the host not refused.

**E. Firecrawl's screenshot is a viewport, not a page — so correction 1 comes back through the paid
route.** On both long articles it was asked for, Firecrawl crossed the wall and then photographed
the opening: WaPo's headline and first line chart, Visual Capitalist's intro card. Both records
reported `pixel: ok` with `measuredFrom: "screenshot.png"` and both were wrong. A Firecrawl record of
a long article is suspect in exactly the way a browser record was before the scroll-to-graphic
repair, and the harvester's own comment ("it returns the page as a reader meets it") is true only of
the first 900 pixels.

**F. `WebSearch` is a shared, exhaustible session budget.** It ran out mid-wave at 200 calls with six
siblings running, `search.sh` returned `results: []` on every attempt all day, and the sandbox
refuses `duckduckgo.com`, `lite.duckduckgo.com` and `bing.com` (which served an unrelated cached
page through a real browser). The only search that worked was `firecrawl search`. A wave that plans
to search should assume it may get no search at all and should reach for an index instead.

**G. `--via-firecrawl` bought nothing here, and that is worth recording next to correction 11's win.**
Four calls: two declined at the source (`nytimes.com` is not supported), two returned the wrong part
of the page. On SCMP it bought the map vocabulary its second publication; on this family it bought
nothing that survived looking. It is a route, not a solvent.
