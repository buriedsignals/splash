# Proposal — the histogram family

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/`, `registers/` or the code, and nothing has been rendered.

**Family definition used:** one continuous variable cut into contiguous intervals, with a mark per
interval whose length is what landed there. Two records are filed at the family's edge and say so in
their own notes — `ourworldindata-org-global-population-pyramid`, which draws the same distribution
as nested envelopes rather than bins, and `figure-nz-chart-9uo8rkrqhpwm7va4`, whose bars are the
*mass* in each bin rather than the count.

This family started from **zero references**. It ends with **six**, from five design authors.

---

## 0. The headline finding, before the treatments

**`100.datavizproject.com` contains no histogram, and cannot.** All 100 thumbnails were downloaded
and assembled into four contact sheets and looked at — the same method the scatter family used, and
the only reliable form-based draw the archives offer. Not one of the hundred is a histogram, and the
reason is structural: Ferdio's single dataset is three countries × two years, which has no
continuous variable to bin. The closest things in it are `viz85` and `viz89`, which place markers on
a number line — a dot plot on a numeric axis, with no bins and no counts.

`METHOD.md` says `100.datavizproject.com` is "the only archive from which a family can be drawn
deliberately". For this family it is also the archive from which nothing can be drawn at all, and
that is worth the next wave knowing before it spends the hour: **the one form-indexed pool does not
cover every form.** The 100-thumbnail sweep cost about ten minutes and returned a certain zero,
which is a good trade against harvesting on a guess.

**And the form is genuinely rare in open published journalism.** Thirty-four urls were drawn from
newsrooms, statistical agencies, central-bank blogs, forecast sites and explainer desks. Six reached
a histogram. Ten reached a *real* graphic that was simply not this form — three ABC pieces, two
Pudding pieces, two choropleths, a bivariate map, a line chart with bands, a data table. The pattern
is consistent enough to state: **when an open desk publishes "the distribution of X", it very often
publishes a map of X, a ranked bar chart of X, or a unit chart of X instead.** The histogram is a
statistician's form that newsrooms mostly translate out of before publication.

---

## Yield

| archive | drawn | harvested | survived looking | proposed |
| --- | ---: | ---: | ---: | ---: |
| datavizproject | 100 | 0 | 0 | 0 |
| url-list | 34 | 35 | 6 | 6 |
| **total** | **134** | **35** | **6** | **6** |

`harvested` exceeds `drawn` on the second row by one because `populationpyramid.net` was harvested
twice — once on discovery and once as the correction-3 re-harvest, which found the same consent
overlay both times.

**A caveat about the `url-list` label, and it is a schema problem rather than a bookkeeping one.**
`harvest.mjs` accepts four archive values and none of them means "found by search". Exactly **one**
of these 34 urls (`r2d3.us`) actually came out of `~/Downloads/infoviz-source-urls-alive.txt`; the
other 33 were found with `search.sh` and `WebSearch` and are recorded as `url-list` because that is
the closest available value. Every record in this family therefore claims a provenance it does not
have. The url list itself was filtered — 26 of 3 827 lines match
`distribut|histogram|salary|income|earn|wage|percentile|where-do-you|how-much`, and of those 26,
sixteen are NYT / WaPo / Bloomberg / Globe and Mail and excluded, leaving ten, of which one was a
histogram-bearing candidate and it was down. **The url list is not merely low-yield for a form; for
this form it is empty.**

### Where the 34 went

| what stopped it | n | which |
| --- | ---: | --- |
| a wall | 6 | bot checks at `ifs.org.uk`, `oecd.org`, `visualcapitalist.com`; a geo-block at `elections2024.thehill.com` ("This site is not avalible from your location"); a 403 at `cia.gov`; a Cloudflare 522 at `r2d3.us` |
| a consent dialog the harvester did not dismiss | 2 | `theguardian.com` (its CMP is in a nested frame), `270towin.com` |
| a real graphic, of another form | 10 | ABC ×3 (choropleth, unit chart, stacked bars), Pudding ×2 (a hand-drawn diagram, a dumbbell), Pew (choropleth), Minneapolis Fed (choropleth), SRF (bivariate choropleth), Weatherspark (line + bands), Eurostat (a data table) |
| decoration | 6 | a Reuters news photograph (538's forecast url now redirects to ABC News), a photo collage ×2 (`givingwhatwecan.org`), a stock photograph (Liberty Street Economics), a banknote illustration (USAFacts), a survey questionnaire image (Pew *Decoded*) |
| an empty, unrendered or gated frame | 4 | ONS ×2 (a calculator's intro screen; an iframe that never painted), `racetothewh.com` (a 739 × 10 972 blank), Census IDB (an Esri basemap, the pyramid behind a country selection) |

Six survived. That is **18 %**, against the 1-in-3 `METHOD.md` records for news domains and the
1-in-4 it records for maps — and the shortfall is not the harvester's fault. Ten of the twenty-eight
failures reached exactly what the url promised and it was a different chart.

### Publications reached

| publication | records | usable as independent evidence |
| --- | ---: | --- |
| `figure.nz` | 2 | yes, as **one** publication — and one of the two is filed under `moneyhub.co.nz` |
| `datawrapper.de` | 1 | yes |
| `data-to-viz.com` | 1 | yes |
| `populationpyramid.net` | 1 | yes |
| `ourworldindata.org` | 1 | yes |

**The independence guard reads the host and would count six.** There are five. `moneyhub.co.nz`'s
graphic is a Figure.NZ plate, wordmark and all — a third-party article re-publishing another
publisher's chart. The guard in `design-base-records-are-complete.test.ts` reads publication off
`new URL(record.url).hostname`, which is the only honest thing it *can* read, and here it is wrong.
Nothing below cites both, and both notes say so out loud. **This is a live hole in the evidence
floor and the next family that harvests embeds will hit it too** — chart-as-a-service means the host
of the page and the author of the graphic routinely differ.

---

## 1. Treatments proposed for filing

### 1.1 `bin-named-by-both-edges-and-an-open-top` — kind: `imported`

Every bin carries **both** of its edges as its label, in the variable's own unit, with the
half-open convention visible on the face of the chart; and where the tail is unbounded the last bin
is named as an **inequality** rather than given an invented ceiling.

- evidence: `figure-nz-chart-9uo8rkrqhpwm7va4` — `$1-$10,000`, `$10,001-$20,000`,
  `$20,001-$30,000` … and `$1m and over`. The `,001` is the whole point: it states which side of
  $10,000 a reader on exactly $10,000 falls, without a footnote.
- evidence: `populationpyramid-net-world-2023` — `0-4`, `5-9`, `10-14` … `95-99`, and `100+`.

Two publications, two continents, two subjects, the same two decisions: name the interval at both
ends, and refuse to close the top. `figure.nz` and `populationpyramid.net` are independent by host
*and* by design authorship. (`moneyhub-co-nz-wage-salary-distributions-html` shows the convention a
third time and is **not** counted — same author as the Figure.NZ record.)

The corpus already has the shape of this rule elsewhere: the map family's `legend` register rests on
the Guardian's `Multiple of £25,000 — 2 3 4 5 6 10+`, whose top class is open in exactly this way.
That is a chart and a map reaching the same convention, which is what an abstraction over families
is supposed to look like.

### 1.2 `mirrored-about-a-shared-zero` — kind: `imported`

Two distributions of the same variable are drawn facing outward from one shared zero; the value
axis counts **outward on both sides, on one scale**; and each half is named **in words at its own
head or foot**, not in a legend and not by colour alone.

- evidence: `populationpyramid-net-world-2023` — `Male` / `Female`, axis
  `10% 8% 6% 4% 2% 0% 2% 4% 6% 8% 10%`, twenty-one five-year bins, no legend.
- evidence: `ourworldindata-org-global-population-pyramid` — `Men` / `Women`, axis
  `70 Million … 10 Million | 10 Million … 70 Million`, age on the left in years, no legend.

Two publications. Both put the unit *inside the tick* (`10%`, `70 Million`) rather than in an axis
title, and both carry the age scale once, on the left, shared by the two halves.

**What separates them is instructive and belongs in the treatment's own note:** PopulationPyramid
draws twenty-one bins as bars for one date; OWID draws nine dates as nested envelopes and no bins at
all. The mirroring survives the change of mark. That is a hint the treatment is about the *axis*
rather than the bar, and should be written so a scrolly or a video inherits it.

---

## 2. Treatments this harvest can see and the floor refuses

Each of these is a real, deliberate decision, measured on one publication. None is filed. They are
listed so the next wave knows what to target — **not more histograms, histograms from elsewhere**.

| candidate | what it is | rests on |
| --- | --- | --- |
| `count-axis-dropped` | no y-axis, no ticks, no gridline: bar height left as pure relative length | `datawrapper.de` |
| `statistics-in-a-caption-row` | `Min: 0.0 Max: 1.0 Mean: 0.5 Median: 0.6` set under the axis, with nothing drawn across the bars | `datawrapper.de` |
| `a-value-label-on-every-bin` | the percentage printed at the end of every bar, both sides (`sans-serif \| 10 \| 400`, ×106) — the chart is also a table | `populationpyramid.net` |
| `value-axis-repeated-at-the-foot` | on a 1200 px plate the axis is drawn at the top *and* the bottom, so the tail can be read | `figure.nz` (twice; one publication) |
| `direct-labels-on-nested-shapes` | nine series, nine labels set along their own slopes, on both halves, no legend | `ourworldindata.org` |
| `roll-ups-under-the-plate` | under-15 / working-age / 65-plus stated in bold beneath the axis rather than bracketed across the bars | `populationpyramid.net` |

**One candidate is not merely unevidenced — it is refuted.** `bars-neutral-accent-on-the-statistics`
looked strong on Datawrapper: bar fill `#CDCECD` at 17.38 % filed as a *neutral*, against the one
chromatic `#2C81AA` at 0.086 % on the four summary numbers, a 200:1 ratio of coverage with the
colour going to the smaller thing. Figure.NZ appeared to corroborate it — bars `#351D3B` at 9.14 %,
also filed as a neutral, with chroma only on the lettering and the wordmark. But the *same
publisher's* other plate in this corpus draws its bars in `#4DB7C5` at 4.57 %, a plainly chromatic
teal. One publisher, two histograms, two unrelated bar colours. **The neutrality is Datawrapper's
alone, and Figure.NZ's near-black plum is a coincidence of that one chart.** Recorded here rather
than quietly dropped, because it is the shape of error `METHOD.md` correction 4 warns about:
a second record that looks like corroboration and is one publication's habit.

---

## 3. Derived treatments proposed — each still owes a `detect` and a `provenBy`

`METHOD.md` correction 7's `derived` kind fits this family well, because a histogram's worst faults
are properties of its own bin array rather than practices to import. **None of the three below has
been rendered**, so none is ready to file: the guard demands `detect` *and* `provenBy`, and this
harvest produced no render.

### 3.1 `unequal-bins-drawn-to-scale-or-refused`

**This is the strongest thing this family found, and it was found as a counter-example rather than
as a practice.** Both Figure.NZ plates cut income into $10,000 bands to $300,000, then into $50,000
bands to $1m, then leave the top open — and draw **every band as one bar of identical thickness**.
Measured on `moneyhub-co-nz-wage-salary-distributions-html`, bar 11–12 px and gap 3–4 px, uniform
down the whole plate including the wide bands. So the `$300,001-$350,000` bar is five bins' worth of
people in one bar, and it stands visibly taller than its neighbours above and below. **A reader sees
a bump in the distribution; the data has no bump there.** The label says so, and the eye does not
read labels.

- detect: read the beat's bin-edge array; for every drawn bar assert
  `axisExtent(bar) / (edge[i+1] - edge[i])` is constant across all bars, or that the beat has
  declared `unequalBins: "byArea"` and the *area* is proportional instead.
- provenBy: **not yet rendered.**

### 3.2 `open-top-bin-declared-not-invented`

The imported treatment in 1.1 says name it in words; the derived half says the label must follow
from the data. If the last edge is unbounded, the axis does not extend past the last finite edge and
the label is an inequality.

- detect: `edges.at(-1) === Infinity` ⟹ the last bin's label matches `/(\+|and over|or more|<)/`
  **and** the axis domain ends at `edges.at(-2)`.
- provenBy: **not yet rendered.**

### 3.3 `bin-count-inside-the-floor-and-the-ceiling`

`chart-beat/references/types/histogram.md` already carries the numbers as prose — under about three
bins is a number rather than a distribution, over about fifty is noise. Making it a `detect` costs
nothing and turns a paragraph nobody re-reads into a thing that goes red. The corpus supports the
range rather than the default: Datawrapper draws **10** bins (the sheet's suggested default),
data-to-viz draws about **30**, PopulationPyramid draws **21** per side, Figure.NZ draws **45**.
Three of the four are well above the "about ten" default and none is near the ceiling.

- detect: `3 <= bins.length <= 50`.
- provenBy: **not yet rendered.**

---

## 4. Directions proposed — one reference each, as `METHOD.md` step 5 requires

### 4.1 measured off `figure-nz-chart-9uo8rkrqhpwm7va4`

The only record in this family whose graphic and whose lettering are in the **same document**, so it
is the only one that can carry a complete direction.

```
ground    #FFFFFF  83.46 %
bar       #351D3B   9.14 %   (a near-black plum; the pixel route files it as a NEUTRAL)
ink       #3D4F6E   1.02 %   ( = style.type's rgb(63, 82, 111), on every label without exception)
wordmark  #5461C8   0.52 %
shape     sequential, 1 cluster at hue 218
type      FoundersGroteskCondensedMedium 24 / FoundersGroteskCondensed 20 @300 /
          FoundersGroteskCondensed 14 @300 (x54, the data's own numbers) /
          FoundersGroteskRegular 14 @200 trk 0.72 uppercase (the apparatus)
```

One condensed grotesque at three weights, one ink for the whole hierarchy, colour reserved for the
wordmark. Title, subtitle, bin labels, axis numbers and notes are separated **by weight and size
alone**. That is a stricter discipline than anything currently in the corpus's directions and it is
measured, not admired.

### 4.2 measured off `data-to-viz-com-graph-histogram-html`

```
ground     #FFFFFF  80.02 %
bar        #7ABAAC  13.20 %
ink        #000000   0.60 %
gridlines  #EBECED   1.61 %   #F2F3F3  0.52 %   #E2E2E2  0.50 %
shape      monochrome, 1 cluster at hue 167
```

The pixel route finds **no second hue on the plate**. One fill, black ink, three gridline greys all
within two percent of the page, and not one annotation. A histogram of one variable has nothing to
distinguish by colour, and this is what that looks like carried through. Caveat in the record's own
note: this is a ggplot2 rendering on an educational site, not a desk's house style.

### 4.3 measured off `ourworldindata-org-global-population-pyramid`

```
ground   #FEFEFE  36.04 %   (the plate is more ink than paper — every other record here is 80-85 %)
ramp     #3E5189  11.13 %  ->  #56BC9D  6.35 %  ->  #E3EC7C  3.82 %
shape    categorical, 3 clusters at hue 225 (17.71 %) / 161 (13.15 %) / 65 (13.19 %)
```

A navy → teal → chartreuse ramp used as **time**: oldest cohorts deepest, the projected years at the
light end, so "this part has not happened yet" is legible from the ink before the subtitle is read.
The classifier calls it categorical because the hues are far apart; the plate uses it as a sequence,
and that gap between what the classifier sees and what the designer did is itself worth recording.

---

## 5. What the corpus should be told about its own histogram sheet

Not a treatment, and not mine to change — `skills/chart-beat/references/types/histogram.md` is
outside this harvest's write scope. But the sheet makes one claim that **five published histograms
contradict**, and the measurement is cheap to re-run.

> "Bars are drawn edge-to-edge with no gap between adjacent bins."

Measured on the pixels of every form-correct record in this family, by scanning one row (or column)
of the bar fill and reading the runs:

| record | bar | gap | ratio |
| --- | ---: | ---: | --- |
| `datawrapper.de` | 54–55 px | **1–2 px** | hairline |
| `data-to-viz.com` | 14–15 px | **1–2 px** | hairline |
| `figure.nz` | 15–16 px | **5–6 px** | ~⅓ of the bar |
| `moneyhub.co.nz` (Figure.NZ plate) | 11–12 px | **3–4 px** | ~⅓ of the bar, at a smaller size |
| `populationpyramid.net` | 22–24 px | **1 px** | the bar's own stroke |

**Not one of the five draws its bins edge-to-edge.** The closest is PopulationPyramid, whose 1 px is
the bar's `stroke rgb(18, 22, 45)` rather than a designed gap — contiguity preserved, bins still
individually countable. Two publications hold a hairline; one publication holds a third of the bar,
at two sizes, which makes it a rendering rule rather than an accident.

The sheet's *reason* is sound — "remove the gap and a reader's eye reads it as one connected shape"
— and published practice has evidently decided that a hairline does not break that reading while a
one-third gap does. A defensible replacement, if the parent wants one, is a **ceiling** rather than a
prohibition: separation may not exceed roughly a tenth of the bar. Figure.NZ fails that at ⅓, and
Figure.NZ is also the family's clearest example of a histogram drawn as though it were a bar chart —
gapped bins *and* unequal bins at equal weight, the two faults arriving together.

**A second thing the sheet should hear.** Its 2026-08-10 amendment solves the median rule's contrast
problem by deriving a near-black ink. Datawrapper solves it by **not drawing the rule**: the four
statistics sit in a caption row under the axis, where no bar is behind them and the arithmetic
never arises. That is one publication, so it is refused in §2 — but it is the cheaper answer and the
sheet does not currently mention that the option exists.

---

## 6. What was not done, and what the next wave should do

- **Nothing was rendered.** `METHOD.md` steps 6 and 7 are untouched: no treatment here has been
  drawn through the real engine and no `detect` has been made to go red. The three derived
  treatments in §3 are proposals with their detects written out and their `provenBy` blank, which is
  exactly the state the guard refuses — deliberately, so nothing here can be filed by accident.
- **`proof/static-carbon-footprint-spread/CarbonFootprintHistogram.tsx` was not consulted**, on the
  brief's instruction. Reading it back now against §1 and §5 is a job for the parent: it is the one
  histogram this tree has drawn, and it should be checked against the two treatments proposed here
  rather than treated as having supplied them.
- **The Pudding's histogram was seen and not harvested.** `pudding.cool/2025/04/birthday-effect/`
  carries `assets/sketches/histogram.webp` — a hand-drawn histogram of a null distribution, in a
  real published piece, from a desk this corpus would benefit from. The graphic picker took a
  different sketch from the same piece (an `img` at `documentTop` 1646) and there is no way to steer
  it at a second graphic on the same page. **This is the single most valuable bounded improvement
  the harvester could get for this family**: a `--graphic <n>` or `--graphic-matching <substring>`
  flag, so a page with eight figures can be harvested at the one that matters. Same shape as
  corrections 10 and 12 — a known, named, unreached artifact.
- **Two consent dialogs beat the dismisser and one contaminated a filed record.** The Guardian's CMP
  lives in a nested frame (the handler only queries the top document);
  `populationpyramid.net`'s French CMP left `consent: null` while covering 40 % of the plate on both
  harvests. The second is the more dangerous, because it went green: `routes.pixel.state: "ok"`,
  `measuredFrom: "graphic.png"`, and a reported ground of `#C8C8C8` at 51.62 % on a chart whose
  paper is white. **The overlay's grey wash multiplies every colour on the plate**, so it is
  `METHOD.md` correction 15's invisible shape — a contamination that scales with what it
  contaminates, which `two-records-that-agree-exactly-are-both-wrong` cannot see. It was caught by
  looking, and only by looking.
- **The five-decimal guard is clean across this family**; no pair of these six records shares three
  colours at identical coverage.
- **A parallel-safety note, unprompted and worth the runbook's attention.** The scratchpad root this
  wave was given is shared with the sibling harvests: a working directory created there at the start
  of this session contained 100 files of mine and 100 files written by another agent two minutes
  later, under a different naming scheme, in the same folder. Nothing went red, and had the
  collision been a *pool* file rather than a thumbnail cache the harvester would have written
  another family's urls into `references/histogram/` and reported `ok`. Everything after that point
  was namespaced into a `histogram/` subdirectory. The scatter proposal reached the same conclusion
  independently after losing two pool files; **two of fourteen parallel harvests hitting this
  independently makes it a runbook item, not an anecdote.**

### The three targets a second wave should aim at

1. **A histogram from a newsroom.** All six records here are from a chart vendor, an educational
   site, a data-publishing charity, a demographic single-purpose site and a research institute.
   Not one is a news desk. Until one is, this family's directions describe how *statisticians*
   publish distributions.
2. **A second publication for `count-axis-dropped` or `statistics-in-a-caption-row`.** Both are
   Datawrapper's, both are cheap, and the second answers the median-rule contrast problem the tree
   has already paid for once.
3. **A histogram where the reader locates themselves in the distribution.** The brief named this as
   a rich seam and it is — but every one of the six tools reached (IFS, OECD, ONS, StatCan, Giving
   What We Can ×2, ABC) puts its chart **behind a form the harvester cannot fill in**. Query-string
   pre-filling was tried on `givingwhatwecan.org` and did not skip the input step. That whole seam
   needs either a harvester that can type into one field, or a hand-taken capture filed with its
   provenance stated.
