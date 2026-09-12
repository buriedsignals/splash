# Proposal — the CALENDAR HEATMAP family

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/` or `registers/`, nothing has been rendered through the
engine, and no index was regenerated. This family started from **zero references** and ends with
**five**.

**Family definition used:** one cell per DAY, laid out on a real calendar — the grid's two axes are
calendar units (weekday × week, or day-of-month × month), not free categorical axes — with colour
carrying one quantitative value per day.

**Excluded, deliberately.** The corpus already holds eleven `heatmap` references, and a matrix of
states × years, produce × month or country × year is **not** this form. Nothing filed here is a
general matrix, and one candidate (`mbounthavong.com`, a state × week covid grid) was rejected on
exactly that ground rather than filed to pad the count. Ferdio's `#49`, a country × year matrix, is
in the heatmap family and was left there.

**Provenance convention.** Every colour quoted is read from `record.pixel` on a record whose
`routes.pixel.measuredFrom === "graphic.png"`; all five satisfy that. Type is quoted only where
`record.style.typeSource` says the graphic's own document — that is true of three records
(Datawrapper, ONS, Observable, via `style.graphicFrame`). On the other two (ABC, data.europa.eu)
`typeSource` says **"the page only — the graphic is a raster and carries no type this route can
read"**, and no typeface is attributed to those graphics anywhere in this file or in their notes.
Contrast ratios are computed here from the records' own hexes, by the WCAG relative-luminance
formula; they are arithmetic on measured values, not a second measurement.

---

## 0. Three findings that govern the rest of this file

### `100.datavizproject.com` holds nothing for this form, and it cost four Read calls to be certain

All 100 pages encode Scandinavian World Heritage site counts for three countries at two dates. **The
dataset has no dates**, so no page among the hundred can be indexed by a calendar. Established by
looking at four labelled 5 × 5 contact sheets covering all 100 thumbnails — reusing a sibling
harvest's sheets, so zero downloads and zero harvests were spent. `#49` is a country × year matrix
and belongs to the heatmap family. **Certain zero**, and it is `METHOD.md` correction 16 holding
exactly as written.

### The url list holds nothing either, and the keyword counts say why

Over all 3 827 lines: `calendar` **3**, `heatmap` **0**, `heat-map` **0**, `birthday` **0**,
`day-by-day` **0**, `every-day` **0**. The three `calendar` hits are a NYT piece about a medieval
book of hours, a Público infographic behind a CloudFront block, and a WaPo primary-calendar *tool*.
Six url-list candidates were drawn on subject adjacency (covid one-year retrospectives, day-of-week
crime) and harvested; **all six were deleted** — two CloudFront blocks, a scrollytelling memorial,
an isotype unit chart, an area chart and an alluvial diagram. Correction 2 again, and this time the
form's own index word is absent from the archive entirely.

### The search route was the only one that worked, and it was down

`~/.claude/scripts/search.sh` returned `results: []` on every attempt across roughly forty minutes.
The local SearXNG's own diagnostics named the cause: brave *"Suspended: too many requests"*, google
cse suspended, startpage CAPTCHA, duckduckgo timeout — the shared saturation the brief predicted,
**not** evidence that the form is unpublished. `WebSearch` was then exhausted session-wide
(200 / 200) by the parallel harvests. `html.duckduckgo.com` refused to connect. The pool was
therefore built with **ten `firecrawl search` queries**, which cost credits; that spend is reported
here because it was a search route, not the harvester's `--via-firecrawl` page route. **`--via-firecrawl`
was never used**: no reference in this family was harvested through it, and no bot check was worked
around — the two that appeared (`flowingdata.com`, `columbia.edu`, both serving *"Un instant…"*) were
recorded as refusals and deleted.

---

## 1. Yield

| family | archive | drawn | harvested | survived looking | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| calendar-heatmap | datavizproject | 100 | 0 | 0 | 0 |
| calendar-heatmap | url-list | 6 | 6 | 0 | 0 |
| calendar-heatmap | search | 18 | 18 | 5 | 5 |
| calendar-heatmap | informationisbeautiful | 0 | 0 | 0 | 0 |
| calendar-heatmap | buried-signals | 0 | 0 | 0 | 0 |

**24 harvested, 5 survived looking, 5 filed — a yield of 1 in 4.8**, in line with the roughly
1-in-4 this log records once a pool leaves the handful of desks that publish openly.

**The nineteen deletions, by cause**, because the shape of the failure is the reusable part:

| cause | n | which |
| --- | ---: | --- |
| reached a real graphic, but not this form | 7 | Texas Tribune (scrolly memorial), g1 (isotype), Straits Times (area), El Tiempo (alluvial), EIA (line), Reuters (globe map), Morgenpost (choropleth) |
| access refused | 4 | Público ×2 (CloudFront), FlowingData + Columbia (bot check) |
| the platform rendered its source, not its chart | 2 | Observable `@d3/calendar`, `@d3/calendar-view` — 1384 × 9185 of code cells |
| the opening beat the graphic | 3 | The Daily Viz (**the page's only image is literally named `birthday_promo_image.png`**), FiveThirtyEight (redirected into ABC News, hero photograph), Datawrapper fall-trees (promo thumbnail) |
| never reached an embed | 2 | VizWiz (Tableau Public), mbounthavong (spreadsheet screenshot) |
| duplicate design author | 1 | `infovis-mannheim.de/viavelox` — see §2 |

**A fourth costume for correction 1, and it names itself.** `thedailyviz.com`'s birthday calendar is
a real and well-known chart. The page carries **exactly one `<img>`**, `/media/How-Common-Is-Your-
Birthday-Pt-2/birthday_promo_image.png`, and no `<iframe>`. The chart is not on the page; a
promotional crop of it is, at the top, as the lead. Correction 1 is the hero photograph,
correction 17 is the perspective mock-up inside the article, correction 18 is the montage in a post
about a chart type. This is the fourth: **the article's own lead image is a cropped, unlabelled
detail of the chart the article is about**, and it is the largest graphic AND nearest the top, so
both picker preferences select it. It was caught by opening the HTML and reading the filename.

---

## 2. Independence: five records, five design authors, and one host that is not one

| id | host | design author | is it a desk? |
| --- | --- | --- | --- |
| `abc-net-au-…popular-birthdays` | abc.net.au | ABC News data desk (Australia) | **yes — the only one** |
| `ons-gov-uk-…howpopularisyourbirthday` | ons.gov.uk | Office for National Statistics | a statistics office |
| `datawrapper-de-oingq` | datawrapper.de | Doce Fernandes, published by Datawrapper | a chart tool's weekly post |
| `data-europa-eu-…calendar-heatmap` | data.europa.eu | **Via Velox, Hochschule Mannheim** | a student research project |
| `observablehq-com-…seattle-temperature-heatmap` | observablehq.com | Observable Plot's own gallery | library documentation |

**The host is a proxy and it broke here too, so it is stated rather than inferred.** The
`data.europa.eu` page reproduces three graphics it did not make, each credited: a New York
temperature calendar by Maarten Lambrechts made with RAWGraphs, and two plates sourced to
`infovis-mannheim.de/viavelox`. The record's graphic is the second of those. **It counts once, as
Via Velox, not as the European Commission.** `infovis-mannheim.de/viavelox` was harvested separately
and **deleted**: on the author's own page the plate appears inside a browser-window mock-up beside a
map, so its pixel reading is of a composite screenshot rather than of the calendar. Two hosts, one
design author, one record kept — and the kept one is the cleaner measurement, not the more
authoritative host.

**And the shape of that table is the family's real finding.** Twenty-four candidates, ten search
queries, four archives, and **one newsroom**. The calendar heatmap's home is statistics offices,
chart tools, dashboards, research projects and personal-data pieces — not the graphics desk. Any
treatment filed from this corpus rests mostly on institutions, and a reader weighing it should know
that.

---

## 3. What the corpus actually shows

### 3.1 There are two calendar indexes, and the type reference only describes one

| record | rows | columns | carries weekday rhythm? |
| --- | --- | --- | --- |
| Datawrapper | weekdays (7) | weeks, in twelve month blocks | **yes** |
| Via Velox | weeks (52) | weekdays (7) | **yes** |
| ONS | day-of-month (31) | months (12) | **no** |
| ABC | day-of-month (31) | months (12) | **no** |
| Observable | months (12) | day-of-month (31) | **no** |

`skills/chart-beat/references/types/calendar-heatmap.md` says the form's whole point is that "rows
are always weekdays and columns are always weeks", so a reader picks up weekly rhythm and seasonal
drift from the grid's shape. **Three of the five references in this corpus use a grid in which
weekday does not appear at all.** A day-of-month × month grid answers "which DATE", which is a
different question — it is the right grid for a birthday, a holiday effect, a Friday-the-13th
effect keyed to the number 13, and the wrong grid for a weekend dip. It also has a hazard the
weekday grid does not: it is not indexed by a real date, so it silently collapses several years into
one plate, which is exactly what the Observable example does with four years of Seattle weather
without saying so anywhere on the picture.

**Recommendation to the parent: the type reference should name both indexes and say which question
each answers.** It currently describes one of them as the form.

### 3.2 The month boundary is the problem a weekday grid has to solve, and there are two answers

- **Datawrapper cuts the grid.** Twelve separate seven-row blocks, each headed once with its month
  name, four across and three down. No boundary line, no alternating tint, no month axis. The cost
  is the week that straddles two months.
- **Via Velox draws the boundary as a staircase.** One continuous 52 × 7 grid with a dark navy line
  that runs along a row, drops a row at the month change, and continues — the calendar's irregularity
  made explicit rather than designed away. It pairs this with a vertical axis that labels **month and
  week number together** (`Jan 01`, `Feb 05`, `Mär 10`, … `Dez 50`), one label every five rows, with
  dotted leaders between.

Two publications, two incompatible answers to one problem. **Neither is filable as an `imported`
treatment on its own** — each rests on one publication — and averaging them would produce neither.
That is the shape `METHOD.md` reserves for a **direction**, and §5 proposes them as such.

### 3.3 Every ramp's low end vanishes against its own ground, and every plate accepts it

Computed from the records' hexes:

| record | ground | ramp end nearest the ground | ratio |
| --- | --- | --- | ---: |
| ONS | `#FFFFFF` 30.8 % | `#FFFFB2` | **1.04 : 1** |
| Datawrapper | `#FFFFFF` 68.0 % | `#E6ECB1` | **1.24 : 1** |
| ABC | `#FFFFFF` 28.5 % | `#CCE7F8` | **1.28 : 1** |
| Via Velox | `#16334E` 67.3 % | `#226492` (the **high** end) | **2.04 : 1** |

Three light-ground plates put the ramp's *bottom* within 1.3 : 1 of the page, and all three carry it
anyway — what makes a pale cell a cell is its **edge**: ONS strokes every cell in grey, ABC and
Datawrapper leave white gutters between squares on a white page, so the cell is defined by the gap
around it rather than by its fill.

**And the dark-ground case inverts the trap the type reference predicts.** That reference warns that
on a dark canvas "the low-value end of a sequential ramp can drift toward the background colour".
Via Velox's ramp runs near-white (low) to saturated blue (high) on a navy ground, so its low end is
the **brightest** thing on the plate at 10.89 : 1 and is never at risk; it is the **high** end — the
busiest cycling weeks — that closes to 2.04 : 1. The correct rule is not "watch the low end on a dark
canvas" but **"watch whichever end of the ramp was aimed at the canvas"**, and measure it.

### 3.4 The rainbow failure is not a matter of taste, and the pixel route caught it unaided

Four of the five records are filed `shape: "sequential"`, `ramped: 1`, with **exactly one** hue
cluster (hue 41 / 66 / 205 / 209). The Observable Plot example is filed `shape: "categorical"`,
`ramped: 0`, with **four separate hue clusters** — hue 190, 27, 145 and 86. Its ramp is D3's `turbo`,
which is what `Plot.cell` gives you when no scheme is named, so the failure is a **default rather
than a choice**. A colour-clustering routine with no idea what a calendar is looked at that plate and
said "these are categories". That is a runnable test for any candidate ramp, and it is stronger than
looking.

---

## 4. Treatments — what clears the floor, and what does not

### 4.1 Clears the floor

#### `date-that-cannot-exist-is-drawn-empty` — kind: `imported` (and arguably `derived`)

- **name:** a calendar slot with no date is drawn as an explicit empty cell, in the grid, not omitted
- **applies:** a day-of-month × month grid, where 6 of the 372 slots are not dates
- **draws:** value
- **evidence:** `ons-gov-uk-peoplepopulationandcommunity-birthsdeathsandmarriages-liveb`
- **evidence:** `abc-net-au-news-2017-12-13-australias-most-and-least-popular-birthdays`
- **proposed detect:** in a day-of-month × month grid, the six slots Feb-30, Feb-31, Apr-31, Jun-31,
  Sep-31, Nov-31 carry a mark that is not a step of the value ramp; a grid that renders them as the
  ramp's minimum fails

The ONS evidence is arithmetic rather than impressionistic: `style.graphicFrame.marks` counts
`fill rgb(255, 255, 255)` **exactly six times**, with the same grey stroke as every other cell. Six
is the number of impossible dates and it is not the count of anything else on that chart. ABC reaches
the same answer by leaving the slot unpainted; on a white page the two are visually identical and
structurally the same decision. Two independent publications, two countries, two chart harnesses.

**Note for the parent: this may belong as `derived` instead.** A beat that draws a calendar already
computes its own date domain, so the fact "31 February is not a date" is carried by the geometry, not
imported from anyone. Filing it `derived` would cost a `provenBy` render and a `detect` and would not
need the two publications — which it happens to have anyway. Either burden is met; the parent should
pick.

#### `reading-convention-in-prose-beside-the-grid` — kind: `imported`

- **name:** the sentence beside the grid states which direction the colour runs and what a cell is
- **applies:** any value-to-colour grid, and especially one that ships without a legend
- **draws:** annot
- **evidence:** `datawrapper-de-oingq`
- **evidence:** `abc-net-au-news-2017-12-13-australias-most-and-least-popular-birthdays`
- **evidence:** `observablehq-com-observablehq-plot-seattle-temperature-heatmap`
- **proposed detect:** the delivered artifact carries a text run, outside the plot area and within
  the title block, naming both the cell's unit and the ramp's direction

The three sentences, quoted from the records:

> `A calendar heatmap of my listening habits in 2022. The darker the square, the more songs I played
> on that day, normalized to a 0-5 scale. Hover to see the numbers and my top tracks.` — Datawrapper

> `The numbers in the squares rank birthdays from most common (1) to least common (366).` — ABC

> `A calendar with a cell for each day (x) of each month (y), colored by maximum temperature on that
> day.` — Observable

Three independent publications, three chart harnesses. Each names what one cell is; two of the three
name the ramp's direction in words; one names where the exact numbers live. **The ONS is the
counter-case and it is instructive**: it prints no such sentence and pays for it with a five-step
legend carrying `1,350 / 1,580 / 1,800 / 1,850 / 1,900 / 1,980`. Prose or a key — this corpus shows
no plate that ships with neither, and one (Observable) that ships with prose *instead of* a key and
is thereby unable to return a temperature.

### 4.2 Real, and one publication short — recorded, not filed

Each of these is drawn by exactly one publication in this corpus. They are named so a later wave
knows what to look for, and `METHOD.md`'s note on `two-points-are-not-a-line` applies: a rule can be
**refuted** while it waits, and something should be looking.

| candidate | the one publication | what a second desk would have to do |
| --- | --- | --- |
| `no-data-in-a-neutral-off-the-ramp` | Datawrapper — `#C4C4C4` at 5.4 %, covering all of December | grey (or hatch) an unrecorded day in a neutral that is not a step of the ramp, and be willing to ship a whole empty month |
| `legend-prints-its-class-breaks` | ONS — six numbers under five swatches | print break values in the data's units rather than a gradient with two end labels |
| `marginal-aggregates-aligned-to-the-grid` | Via Velox — a bar per week down the right edge, a bar per weekday along the bottom | put the two aggregates in the margins, row-for-row and column-for-column |
| `month-boundary-as-a-staircase` | Via Velox | draw the month edge across a continuous weekday grid rather than splitting the grid |
| `year-cut-into-twelve-labelled-month-blocks` | Datawrapper | twelve small multiples of the seven-row grid, month named once each |
| `two-calendar-units-on-one-axis` | Via Velox — `Feb 05`, `Mär 10`, one label per five weeks with dotted leaders | label a long calendar axis with month and week number together |

**And one refusal worth recording.** Via Velox's live tool does carry a binned legend
(`≤6 ≤7 ≤14 ≤22 ≤29 ≤43 ≤51 ≤100 Fahrer`). It is **cropped out of the plate this corpus measures**
and was seen only in the `infovis-mannheim.de` screenshot that was deleted for being a composite.
Counting it would give `legend-prints-its-class-breaks` its second publication from a picture this
corpus does not hold. It is not counted. A re-harvest that reaches the un-chromed plate would settle
it, and that is a concrete, cheap next step.

### 4.3 Uses of treatments that already exist — not new proposals

- **`value-on-the-mark`.** ABC prints the rank inside all 366 cells and carries **no colour legend
  at all**, because the number is the key. This is that treatment applied to the densest grid in the
  corpus, and it is worth adding to its evidence rather than filing again. It also exposes the
  treatment's own limit: see the defect in §6.
- **`accent-marks-the-thread`.** ABC's rank-1 cell is `#FFCC01`, a gold that is not a step of the
  blue ramp and appears nowhere else. The accent sits on 17 September because the headline is about
  17 September. One accent, spent once, outside the scale so it cannot be misread as a value.

---

## 5. Directions — proposed, one reference each

A direction needs one reference because it is a coherent whole. Two are proposed; both are the same
family drawn two ways, and the difference between them is a real editorial choice, not a style.

### `calendrier-decoupe` — the year cut into twelve

**Reference:** `datawrapper-de-oingq`. Ground `#FFFFFF` at 68.0 %; a six-step yellow-green ramp
`#E6ECB1 → #D9E289 → #A8BD65 → #789943 → #487722 → #195501`, heavily bottom-weighted (`#D9E289`
alone is 10.6 %); `#C4C4C4` for no data. `Roboto` throughout, from the graphic's own document —
`22 / 700` title, `15 / 400` standfirst, `13 / 400` month names, `13 / 400 italic` note in
`rgb(101,101,101)`, `11 / 400` source line in `rgb(136,136,136)` with links in `rgb(0,136,204)`.
Twelve month blocks, four across and three down, month named once each, no legend, key in the
subtitle. **It is a direction because it is airy** — two thirds of the plate is ground — and because
its whole furniture budget is one sentence and twelve words.

### `calendrier-continu` — the year as one column of weeks

**Reference:** `data-europa-eu-apps-data-visualisation-guide-calendar-heatmap` (design: Via Velox).
Ground `#16334E` at 67.3 %; a white-to-blue ramp `#EBEBEB → #CED6DC → #B3C4CE → #96B0C0 → #5D89A2 →
#226492`. One continuous 52 × 7 grid, weeks down and weekdays across, month boundary as a staircase,
month-plus-week-number axis with dotted leaders, marginal histograms on two edges each with their own
axis, and **one annotation** — a bracket down the weekly histogram labelled in italic *higher amount
of trajectories in spring/summer months*. **It is a direction because it is dense and portrait**, and
because it turns one grid into three charts without repeating a number.

**No type is proposed for `calendrier-continu`.** The graphic is a raster and its record's
`typeSource` says so; the `Helvetica` in that record is `data.europa.eu`'s guide furniture and
belongs to nothing here. A direction built from it would have to derive its type from `body`, and
say so.

---

## 6. Two defects found in published work, both measured, both worth carrying

**ABC's numerals are illegible over half its own ramp.** The cell numbers are white throughout.
Against the dark steps that is right — white on `#00417F` is **10.18 : 1**. Against the pale end it
is not: white on `#7DB3D7` is **2.26**, on `#95C5E1` **1.85**, on `#B1D6EC` **1.53**, on `#CCE7F8`
**1.28**. More than half of the 366 numbers on that plate are below the floor for text at any size,
and the numbers are the reading the chart exists for. The gold accent has it too — white on `#FFCC01`
is **1.51 : 1**. **The rule this yields:** text laid over a sequential ramp must switch ink with the
ramp; a single fixed ink cannot serve a scale that spans 1.28 : 1 to 10.18 : 1. If `value-on-the-mark`
is applied to a heatmap cell, this is the condition it owes.

**Datawrapper's "no data" is separated from a low value by hue alone.** `#C4C4C4` sits at lightness
**0.769**; the ramp runs `#E6ECB1` 0.809 → `#D9E289` 0.712 → … So the grey falls *between* the two
palest greens in lightness. In greyscale, and for a reader reading luminance, December is a mid-low
value rather than an absence. The fix is one line: give the no-data state a lightness outside the
ramp's range, or say "grey means no data" in the same sentence that already says "darker means more".

---

## 7. What the pool taught

1. **`100.datavizproject.com` is bounded by its dataset, and a contact sheet proves it in ninety
   seconds.** Reusing an existing sheet cost four Read calls and zero downloads for a certain zero.
2. **The url list cannot reach this form.** Its own index word appears three times in 3 827 lines and
   never on this form. Six subject-adjacent candidates yielded nothing.
3. **`iea.org/data-and-statistics/charts?type=…` is not this family's seam either.** Its `type`
   parameter takes bar / column / line / area / pie / waterfall; there is no calendar type, and the
   IEA publishes annual and monthly series, not daily ones. Not drawn from, and the reason is
   structural rather than a guess.
4. **The seam the brief predicted — still-live covid dashboards — did not exist.** Seven covid
   candidates were harvested from six countries; not one used a calendar grid. Covid desks drew
   lines, areas, choropleths and isotypes. The COVIC archive that catalogued them by form is gone
   (`covic.io` does not resolve).
5. **Chart-tool permalinks are the cleanest targets and they paid here twice.**
   `datawrapper.de/_/oInGQ/` was found by curling the blog post that embeds it and grepping for
   `dwcdn.net` ids; `ons.gov.uk/visualisations/nesscontent/dvc307/chart1/` came back inside the
   record as `style.graphicFrame`. Both gave `typeSource: the graphic's own document`, which is the
   difference between quoting a chart's type and quoting a masthead's.
6. **Observable is a publication platform the harvester cannot read.** Two `@d3/` notebooks returned
   1384 × 9185 of source code. The one Observable record that worked is a `/plot/` gallery page,
   which server-renders. Anyone drawing from Observable should target the Plot gallery, not `@d3`.
7. **An empty search is not an absent form, and here it was neither.** `search.sh` returned
   `results: []` on every attempt while its own diagnostics said every upstream engine was suspended
   or CAPTCHA'd. Reading that as absence would have filed a zero for this family. It is a 5.
8. **The honest headline: this form is not a newsroom form.** One desk in twenty-four candidates.
   Every treatment proposed above rests at least half on statistics offices, chart tools and research
   projects, and the parent should weight it accordingly.

---

## 8. Guards

```
bun test skills/splash/test/a-record-names-its-route.test.ts \
         skills/splash/test/design-base-records-are-complete.test.ts \
         skills/splash/test/the-type-comes-from-the-document-the-graphic-is-in.test.ts \
         skills/splash/test/two-records-that-agree-exactly-are-both-wrong.test.ts
```

Result recorded in the harvest report. Nothing in `treatments/`, `directions/`, `registers/`,
`METHOD.md`, any index or any other family was touched by this harvest.
