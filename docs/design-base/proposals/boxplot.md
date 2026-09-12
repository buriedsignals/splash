# Proposal — the boxplot family (box-and-whisker, violin, range-with-a-median)

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/` or `registers/`; those directories were not touched, and
nothing proposed here has been rendered.

Family: **a chart that draws the SUMMARY of a distribution** — a box-and-whisker, a violin, or a
range plot carrying a central mark. Corpus: `docs/design-base/references/boxplot/`, **five records
from three publications**, all five measured on their own `graphic.png`
(`routes.pixel.measuredFrom` is `"graphic.png"` on all five; none is `not-applicable`, none is
`screenshot.png`). Harvested 2026-09-08, from zero references.

---

## 0. The finding, before the treatments

**No news desk in this pool publishes a box plot, and the search does not fail quietly — it fails
loudly and in one direction.** Roughly ten searches for a published box plot, violin or beeswarm
(SearXNG through `search.sh` until its engines went empty, then `WebSearch`) returned, without one
exception: tool documentation (Tableau, Domo, JMP, Google Data Studio, Observable Plot, amCharts,
Highcharts), teaching material (CDC's COVE chart reference, ASQ, GeeksforGeeks, the Urban Institute
style guide, storytellingwithdata), R and Python gallery notebooks, and journal figures. **Zero
newsroom pieces.** Two news pages were harvested anyway on the strength of their vocabulary and
neither showed the form: the Guardian's Australian wealth tool stopped at a consent dialog, and
Baseball Savant's Statcast page served a line chart.

Three independent measurements say the same thing:

1. **`~/Downloads/infoviz-source-urls-alive.txt`, 3 827 published newsroom interactives, contains
   two urls matching `box.?plot|violin|beeswarm|quartile|percentile|median|distribution` — and both
   are subject matches** (CNN on "equitable distribution", Bloomberg on "vaccine distribution"), not
   form matches. This is `METHOD.md` correction 2 at its most extreme: for this family the url list
   yields **nothing at all**, not merely the wrong forms.
2. **`100.datavizproject.com` encodes one dataset a hundred ways and does not draw a box plot once.**
   Its dataset is six numbers — three countries, two years — so a five-number summary is
   arithmetically impossible; but the archive is also the closest thing to a census of the forms a
   designer reaches for, and the two encodings that come nearest (`#15`, `#53`) are a range plot and
   a violin-shaped silhouette carrying two values.
3. **Datawrapper — the default chart tool of exactly the desks this pool would be drawn from —
   offers 23 chart types and none of them is a box plot, a violin or a range-with-median.**
   Read 2026-09-08 on `https://www.datawrapper.de/charts` by `WebFetch`, not harvested; treat as a
   single reading, but it is consistent with everything above.

**Where the form actually lives is science and agency publishing**, and both surviving non-Ferdio
publications are that: *Nature Methods* (a methods column whose whole subject is the form) and
**NSIDC** (an operational science tool where the distribution summary is the beat). This matches the
brief's expectation that science and health desks use it more than news desks — but the honest
sharpening is that in this pool it is not a *desk* thing at all. It is a **journal and agency**
thing.

**What desks draw instead, on this evidence.** The substitution is not to a beeswarm — no beeswarm
was found on a news domain either. It is to:

- **a range plot**, with the ends named rather than a distribution summarised (Ferdio `#15`);
- **a dumbbell or arrow between two states** (Ferdio `#71`, looked at enlarged and refused into the
  `paired` family for having no central mark; several more of the hundred at thumbnail scale);
- **a unit column, one dot per observation** (Ferdio `#88`, considered and refused — its dots are
  sites, not a distribution);
- **the case drawn against a reference band**, which is the box plot dissolved into a time axis and
  is what NSIDC does.

The last of these is the one worth carrying into the tree: **the newsroom-legible form of "how does
this compare with the distribution" is a shaded band with a median line, not a box.** Three of the
five records draw a version of it.

`skills/chart-beat/references/types/boxplot.md` is not contradicted by any of this — its warnings
about small n, multimodality and whisker rules are all corroborated by Figure 1 and Figure 2 of the
Nature column. What the evidence adds is that the type page should say **when not to reach for the
form at all**, and what to reach for instead.

---

## 1. The yield, for `METHOD.md`'s log

| family | archive | drawn | harvested | survived looking | proposed for filing |
| --- | --- | ---: | ---: | ---: | ---: |
| boxplot | datavizproject | 100 | 2 | 2 | 2 |
| boxplot | url-list | 8 | 8 | 3 | 3 |
| boxplot | informationisbeautiful | 0 | 0 | 0 | 0 |
| boxplot | buried-signals | 0 | 0 | 0 | 0 |
| **total** | | **108** | **10** | **5** | **5** |

**"Drawn" for `datavizproject` means all 100 thumbnails were downloaded and read on three contact
sheets** before anything was harvested — the archive is indexed by SHAPE and PROPERTY, never by
chart name, so the only way to select a form is to look. Four encodings were considered and refused
in writing (`#71` vertical dumbbell, no central mark; `#88` unit column; `#86` Euler diagram; `#83`
stacked column); the reasons are in the pool file. **Two of a hundred**, and neither is a box plot.

**"Drawn" for `url-list` is 8 and the pool file is the honest record of it.** The url list itself
contributed **nothing** (two subject matches, both irrelevant); every url-list candidate was found
by search and by knowing where the form lives. Three of the eight survived looking:

| harvested | outcome |
| --- | --- |
| `nature.com/articles/nmeth.2813` | **deleted** — paywalled: "This is a preview of subscription content", figures not rendered. The harvester reported *no graphic outside the site's own chrome*, which was correct. |
| `nature.com/articles/nmeth.2813/figures/1` | **kept** — the publisher's own figure page is not gated. The route to the real artifact. |
| `nature.com/articles/nmeth.2813/figures/4` | **kept** |
| `nsidc.org/…/charctic-interactive-sea-ice-graph` | **kept** |
| `nsidc.org/…/2025-arctic-sea-ice-minimum-…` | **deleted** — reached the piece's Figure 1, a *map*. A real graphic of the real piece, and the wrong form. |
| `waterdata.usgs.gov/monitoring-location/01646500/` | **deleted** — USGS duration graphs draw median + quartiles + deciles + record extremes per day of year, but the page loads a 7-day hydrograph; the duration plot is behind a control. |
| `theguardian.com/…/wealth-comparison-tool-salary` | **deleted** — consent dialog, unhandled: *"Personalised advertising - it's your choice"*. The clip is the hero collage with the modal across it. |
| `baseballsavant.mlb.com/savant-player/aaron-judge-…` | **deleted** — a line chart, *Aaron Judge Pitch % by Season*. |

**Three of the eight url-list harvests reached something real of the right form**, and across both
archives five of ten. Six of the eight url-list candidates were not news domains, and all three
survivors came from those six; the two that were news domains are both in the deleted column, one
stopped by a consent dialog and one by the wrong chart. The 1-in-3 this log records for news domains
is not improved on here — it is avoided, by going where the form lives.

**Independence.** Three publications by url host: `100.datavizproject.com` (2 records),
`nature.com` (2 records), `nsidc.org` (1). The Ferdio pair corroborate nothing between themselves
(correction 4); neither do the two Nature figures — one article, one pair of authors.

---

## 2. Treatments to file

### 2.1 `summary-in-neutral-case-in-colour` — imported

```
kind      imported
name      The distribution summary is drawn in neutral; only the cases being argued about carry hue
applies   the beat draws a summary of a distribution (median, quartile band, decile band, average
          lane) ALONGSIDE one or more individual series or categories
draws     marks
detect    every mark belonging to the summary has chroma below the palette's chromatic floor, and at
          least one non-summary mark is above it
evidence  nsidc-org-sea-ice-today-sea-ice-tools-charctic-interactive-sea-ice-gra
evidence  100-datavizproject-com-data-type-viz15
```

Two publications: `nsidc.org`, `100.datavizproject.com`.

**The rule.** A distribution summary is context. It can be dense — three nested statements — exactly
because it spends no colour. The hue belongs to whatever the piece is arguing about.

**Where it was seen.** Charctic declares its summary as `fill rgba(210, 210, 210, 0.75)` (interdecile),
`fill rgba(170, 170, 170, 0.75)` (interquartile) and `stroke rgb(130, 130, 130)` (the 1981–2010
median), and its two argued series as `stroke rgb(255, 0, 0)` (2012, the record minimum) and
`stroke rgb(0, 152, 244)` (the current year) — the record's pixel route counts those two accents at
**`#FF0000` 0.086 %** and **`#0098F4` 0.096 %** of the frame. Ferdio's `#15` does the categorical
version: the `AVG.` lane is grey **`#7E8B93` at 0.107 %** while the three countries are
**`#EE5440` 0.095 %**, **`#3274DA` 0.082 %** and **`#283250` 0.091 %**. The summary is the *heaviest*
non-white mark on that plate and still reads as furniture, because lightness decides, not area.

**What limits it.** Both records also expose the mechanism's cost: `#283250` and `#7E8B93` are both
filed under `pixel.neutral`, so `pixel.shape` reports `diverging, 2 clusters` where a reader sees
three entities and a summary. A palette that uses a near-black or a slate as a *categorical* member
puts that member on the wrong side of this rule. The predicate has to be "belongs to the summary",
not "is low-chroma".

### 2.2 `interval-named-by-its-statistic` — imported

```
kind      imported
name      Every band, whisker and central mark states which statistic it is, in words
applies   the beat draws any interval derived from a distribution — a whisker, a quartile box, a
          percentile band, a confidence interval
draws     legend, annotation
detect    for each distinct interval mark, a text run within the plate or its legend names the
          statistic it encodes, and that run is not purely numeric
evidence  nature-com-articles-nmeth-2813-figures-1
evidence  nsidc-org-sea-ice-today-sea-ice-tools-charctic-interactive-sea-ice-gra
```

Two publications: `nature.com`, `nsidc.org`.

**The rule.** An unlabelled band is a shape. `boxplot.md` already says this form "is only ever as
honest as its handling of outliers" and asks for the whisker rule to be stated; both publications
state considerably more than the whisker rule, and state it *on or beside the marks* rather than in
a caption.

**Where it was seen.** Nature's Figure 1 writes `1.5 × IQR`, `IQR`, `1.5 × IQR` as three bracketed
spans across the top of the construction, `Q1 m Q3` on the box, `Whiskers` over the extending rules,
`Outliers` over the detached dots, `Notch` on the second box, and beneath it the formula itself:
`95 % CI for m`, `m ± 1.58 × IQR/√n`. Charctic's legend names `1981-2010 Median`,
`Interquartile Range` and `Interdecile Range`, and — the part worth copying — offers
`1981-2010 Average` and `±2 Standard Deviations` as a *switchable alternative summary of the same
period*, so the choice between a robust and a parametric summary is the reader's to see rather than
the designer's to hide.

**What it is not.** Not "put a legend on it". The naming happens where the mark is: Nature's are
spans and pointers on the plate; Charctic's legend rows sit against the swatches they name.

### 2.3 `nested-intervals-one-hue-two-lightnesses` — imported, with a caveat

```
kind      imported
name      Nested intervals are one hue at two lightnesses, the tighter interval darker
applies   the beat draws two or more intervals for the same distribution, one inside the other
          (IQR inside range, 50 % inside 80 %, box inside whisker)
draws     marks
detect    the nested intervals resolve to the same hue within a small tolerance, and lightness is
          monotonic in interval width — widest lightest
evidence  nsidc-org-sea-ice-today-sea-ice-tools-charctic-interactive-sea-ice-gra
evidence  100-datavizproject-com-data-type-viz53
```

Two publications: `nsidc.org`, `100.datavizproject.com`. **This is the weakest of the three and the
caveat belongs in the filed treatment, not only here.**

**The rule.** Nesting should be visible as nesting. One hue, lightness monotone in width.

**Where it was seen, and where the reading is honest.** Charctic gets it for free and the arithmetic
is checkable in the record: both bands are declared at **0.75 alpha**, and the interquartile is
painted over the interdecile, so `210·0.75 + 255·0.25 = 221` → `#DDDDDD` outside and
`170·0.75 + 221·0.25 = 183` → `#B7B7B7` inside. The pixel route, which knows nothing of those
declarations, independently reports **`#DDDDDD` at 1.414 %** and **`#B7B7B7` at 1.559 %** as the two
largest non-white neutrals on the plate, and the median's `rgb(130,130,130)` as **`#828282` at
0.259 %**. Two routes, five marks, one anatomy.

**Where the reading is a stretch, said plainly.** Ferdio's `#53` is *not* drawing nested intervals.
It draws each category as one hue at two lightnesses — Sweden `#3274D8` (4.18 %) caps over `#5495EC`
(5.51 %) body, Denmark `#EE5440` (1.963 %) over `#F6988C` (2.563 %), Norway `#283250` (1.81 %) over
`#7A8092` (2.306 %) — where the *darker* tint carries the two measured values and the lighter carries
the interpolation between them. The shared logic is real ("one hue, two lightnesses, darker = the
harder statement") and the geometry is not the same. **If the parent judges that too loose, this
treatment has one publication and should wait**, exactly as `before-nested-in-after` waits.

---

## 3. Derived treatments proposed — each needs a render before it can be filed

`METHOD.md` correction 7 makes these possible: they draw facts a boxplot beat's own data already
carries, so no second publication can corroborate them. The guard demands a `detect` **and** a
`provenBy`. **No render was produced by this harvest**, so every one of these is a proposal
conditional on the family's own beat being drawn — they are listed with their `detect` so the parent
can decide, not to be filed as they stand.

### 3.1 `whisker-rule-stated`

```
kind      derived
detect    the rendered plate carries a text run naming the whisker convention (e.g. "whiskers reach
          1.5 × IQR"), and the component's fence computation and that text come from one constant
provenBy  (not rendered)
```
The one thing `boxplot.md` says the form's honesty depends on. Nature's Figure 1 shows what it looks
like when it is on the plate rather than in prose.

### 3.2 `outliers-are-points-not-longer-whiskers`

```
kind      derived
detect    the number of individual outlier marks equals the number of values outside the fence, and
          no whisker end lies beyond the fence
provenBy  (not rendered)
```
The failure this forbids — letting a whisker stretch to the extreme value — launders one extreme
into ordinary spread. Nature draws the outliers in **the same mark as the raw sample points above
them**, which is the detail worth carrying: an outlier is an observation, not a different class of
object.

### 3.3 `n-is-on-the-plate, and under five the form refuses`

```
kind      derived
detect    each category carries its own n as a text run; and where any n < 5 the component refuses
          to draw a box for that category and draws its points instead
provenBy  (not rendered)
```
`boxplot.md` says a box built from five points draws the same confident rectangle as one built from
five thousand. Nature's Figure 2 is titled *"Box plots reflect sample variability and should be
avoided for very small samples (n < 5)"* — the threshold is theirs, and it is a number the beat's own
data can check. **A refusal, not a warning**, is the version worth proposing.

### 3.4 `sample-over-summary`

```
kind      derived
detect    where n per category is under the strip's legibility ceiling, the individual observations
          are drawn on the same axis as the summary that claims to describe them
provenBy  (not rendered)
```
Nature's Figure 1 draws the `n = 20` sample as open circles directly above its box. This is the
single strongest answer to the form's central dishonesty and it costs one row. Filed as derived
because the predicate is the beat's own group size.

---

## 4. What could NOT be filed, and why

Each of these is real, is drawn by one publication, and is **not proposed for filing**.

| candidate | seen on | why not |
| --- | --- | --- |
| `colour-only-on-the-verdict` | `nature-…-figures-4` | One publication. Measured: the plate's entire chromatic budget is a single cluster at **359°, 0.112 % of the frame** — `pixel.chromatic` is ten antialias tints of one red, `pixel.shape` `sequential`, `ramped` 1 — and looked at, that red is the two words **`Not recommended`**. Three panels, nine charts, and colour spent only on a judgement about a form. Wants a second desk. |
| `ends-carry-their-own-values-inside-the-mark` | `…viz53` | One publication. The caps carry `13`/`15`, `4`/`10`, `5`/`8` in white on the darker tint, so no axis lookup and no leader line. |
| `per-lane-gridlines` | `…viz15` | One publication. Four lanes, each with its own short ticks, no full-width rule anywhere — several distributions on one scale that are deliberately not read across. |
| `mean-as-a-glyph-inside-the-box, median-as-the-box's-own-rule` | `nature-…-figures-4` | One publication. Six notched boxes; the right-hand three add a mean as a cross with its own error bar *inside* the box, so two centres are carried with no legend and no second colour — and the version without it stands beside it, making the omission legible as a choice. |
| `show-the-encoding-you-are-replacing` | `nature-…-figures-4` | One publication. Panel **a** draws the bar-of-means three times — zero-based, baseline moved to 0.5, and axis-broken — all three marked `Not recommended`, from the same data at the same scale as the box plots in panel **c**. |
| an **apparatus register** for this family | — | Nothing to register. Two of the five graphics are rasters whose lettering the style route cannot read at all (§6), and the only readable type is Charctic's. One publication is not a register. |

---

## 5. Direction

### 5.1 `agency-plate` — measured on Charctic

One reference, which is what a direction takes: a direction is a coherent whole and averaging two
would produce neither. This is the only record in the family whose apparatus is fully measured,
because it is the only one whose graphic is a **document** (an `iframe`) rather than a raster.

```
ground        #FFFFFF                       (graphicFrame.ground rgb(255,255,255) — the page
                                             around it is rgb(41,41,41); the plate does not
                                             inherit the site)
summary       fill rgba(210,210,210,0.75) outside fill rgba(170,170,170,0.75)
              stroke rgb(130,130,130) for the central mark
accents       stroke rgb(255,0,0) and stroke rgb(0,152,244)   — 0.086 % and 0.096 % of the frame
type          Lucida Grande 18/400 rgb(34,34,34)    axis title, names the unit
              Lucida Grande 14/400 rgb(34,34,34)    axis values
              Lucida Grande 12/400 rgb(102,102,102) qualifier under the title
              Lucida Grande  9/400 rgb(153,153,153) credit
              Arial 11/700 rgb(33,37,41)            legend
measuredFrom  nsidc-org-sea-ice-today-sea-ice-tools-charctic-interactive-sea-ice-gra
```

**What makes it a whole rather than a palette.** Size and ink move together down one ladder —
18/`#222`, 14/`#222`, 12/`#666`, 9/`#999` — so importance is never carried by size alone; the plate
is white regardless of the site's ground; the summary is three greys and the argument is two
saturated strokes under a fifth of a percent of the frame; and the axis title names the unit while
the subtitle names what counts as a measurement (`Extent (Millions of square kilometers)` /
`(Area of ocean with at least 15% sea ice)`).

**What must not be taken from it.** The eighty-checkbox year legend down the right is a data-tool
affordance, not an editorial one, and the per-year rainbow behind it is the opposite of this
direction's own discipline.

---

## 6. What this harvest found out about the method

### 6.1 A raster graphic silently makes `style.type` the publisher's furniture, and no guard says so

`the-type-comes-from-the-document-the-graphic-is-in.test.ts` fires only when
`style.graphic.tag === "iframe"`. **Four of this family's five records are `img`** — Ferdio's two
`823 × 823` PNGs and Nature's two `lw1200` JPEGs — and for all four `record.style.type` is the *host
page's* article furniture: `stevie-sans` and `Borgia Pro` for Ferdio's site chrome, `-apple-system`
and `Harding` for nature.com's. Not one of those tuples describes a label on any of the four
graphics.

This is `METHOD.md` correction 14 in a costume no rule covers: with an `iframe` the record carries a
second reading and the guard checks it; with an `img` the record carries **one** reading, it looks
complete, and it is a reading of the wrong document. All four notes say so in *What was not
verified* and quote no type. A cheap repair would be for `harvest.mjs` to record
`style.typeIsOfTheGraphic: false` whenever the picked graphic is a raster.

### 6.2 Correction 15 again, on a new site: `measuredFrom: "graphic.png"` with the nav in the clip

Charctic's `pixel.chromatic` leads with `#C4E0F5` (0.179 %), `#003366` (0.157 %) and `#0062CC`
(0.137 %) — and those are NSIDC's `Arctic / Antarctic` tabs and site menu, painted across the top of
the iframe clip. Counted by hand on `graphic.png`, the **top 60 rows** carry them at 2.691 %, 2.348 %
and 2.021 % of those rows; below row 60 the same count gives `#B7B7B7` 1.452 %, `#DDDDDD` 1.396 %,
`#E6E6E6` 1.349 % and `#828282` 0.248 %, which is the chart. Nothing was red. The record says
`measuredFrom: "graphic.png"` and it is true.

**What saved the reading was that the style route independently declared the same five marks.**
Where a record's two routes name the same objects, a contaminated chromatic list can be caught; where
the graphic is a raster (§6.1) there is no second opinion at all. That, not the size of the
contamination, is the argument for keeping both routes on every reference.

### 6.3 The pool file is the deliverable when the yield is low

Eight harvests, five kept, three publications, and the most useful artifact this family produced may
be the written record of the ninety-eight encodings and the ten searches that came back empty. A
future wave that wants a box plot from a news desk now knows: not the url list, not
`100.datavizproject.com`, not general search — and that the tool the desks use does not offer the
form.
