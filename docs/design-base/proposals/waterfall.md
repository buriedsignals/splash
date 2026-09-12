# Proposal — the WATERFALL (bridge / cascade) family

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/` or `registers/`, and nothing has been rendered through the
engine. This family started from **zero references**.

**Family definition used:** a sequence of signed steps between two absolute totals, where each step
begins where the previous one ended, so that the running level is legible across the whole row.
Also called a bridge or a cascade. Excluded: sorted-bar "waterfall plots" from genomics, which share
the word and nothing else.

**Provenance convention.** Every colour quoted below is read from `record.pixel` on a record whose
`routes.pixel.measuredFrom === "graphic.png"`; all twelve filed records satisfy that. Type is read
from `record.style.type`, **except** on the five records whose `record.style.graphic.tag` is
`iframe` — the four Datawrapper charts and the Flourish chart — where the graphic's type is
`record.style.graphicFrame.type` and `record.style.type` is the publisher's own page furniture.
"Looked at" means a human read of a PNG in the reference directory; it founds geometry and text and
never a colour value.

---

## 0. The finding that governs everything else in this file

**`100.datavizproject.com` does not contain this form.** It is the one archive indexed by FORM and it
was drawn first, properly: all 100 thumbnails downloaded and looked at on three contact sheets, then
twenty-one bar- and rectangle-shaped candidates re-examined at full size. Not one of the hundred is a
waterfall. The nearest relative is **#40** — a staircase of a cumulative total with the increments
drawn as arcs above it — and it is already harvested by another family. Ferdio's dataset is three
countries at two dates, whose total moves 22 → 33; a bridge was available and was not drawn.

**And the url list does not contain it either.** `~/Downloads/infoviz-source-urls-alive.txt` has
**zero** of 3 827 lines matching `/waterfall|cascade/`. Correction 2 in `METHOD.md` says a keyword
selects a subject and never a form; this family is the sharper case — the form's *own name is a
subject*. A web search for "waterfall chart" on a newsroom domain returns landforms: fish climbing
a Congo waterfall, a Louis Vuitton runway, the world's tallest indoor waterfall.

**So the pool was built from the form's own vocabulary**, and what it found is a real fact about
the form rather than an accident of searching: **the desks that publish waterfall charts openly are
institutions and tool vendors, not newsrooms.** The five publications reached are the IEA, the ONS,
Datawrapper, Flourish and Storytelling with Data. No newsroom interactive was found in this form,
after searching by name in four languages, by the accounting sense ("bridge chart"), by alt-text
phrasing ("Waterfall chart showing"), and by subject on eleven desks that publish openly.

**One archive indexed by form was found, and it is not in `METHOD.md`'s table.**
`https://www.iea.org/data-and-statistics/charts?type=waterfall` — the IEA chart library, filterable
by chart type, reporting **278 waterfall charts**. Five were taken. It is one publication, and it is
the only place in this harvest where candidates could be drawn deliberately rather than guessed at.
The same library carries `?type=column|line|area|bar|pie`, so it is likely to pay for other
families too.

---

## 1. Yield

| family | archive | drawn | harvested | survived looking | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| waterfall | datavizproject | 100 | 0 | 0 | 0 |
| waterfall | url-list | 19 | 19 | 13 | 12 |
| waterfall | informationisbeautiful | 0 | 0 | 0 | 0 |
| waterfall | buried-signals | 0 | 0 | 0 | 0 |

**19 harvested, 13 reached a chart, 12 filed.** The six that never reached a chart:

| url | what the harvester actually photographed |
| --- | --- |
| `datawrapper.de/blog/waterfall-charts-guide` | the post's own 800 × 400 promo card |
| `datawrapper.de/blog/waterfall-charts` | the post's own 800 × 400 promo card |
| `datawrapper.de/academy/waterfall-chart-examples` | nothing — `pixel: not-applicable`; the gallery's charts are lazily created frames |
| `storytellingwithdata.com/…/what-is-a-waterfall` | a YouTube video thumbnail |
| `www150.statcan.gc.ca/…/892600052022001-eng.htm` | "Figure 6", a grouped-bar anatomy diagram |
| `digitalblog.ons.gov.uk/…/transformed-consumer-price-inflation-preview-launches/` | a screenshot of the CPI preview's page **header** |

That is 6 in 19, in line with the 1-in-3 this log has recorded since the line family — and the
failure mode has moved. Two of the six are the **article's own promo card**, which is a new entry in
the catalogue: a post *about* a chart type puts a montage of little charts at the top, and it is
both the largest graphic and near the top, so both of the picker's preferences point at it. It looks
exactly like a successful harvest.

**The thirteenth survived looking and was deleted by a guard.** `ons…/fig06/index.html`, the CPI
twin of the filed CPIH chart, reached its graphic cleanly — and
`two-records-that-agree-exactly-are-both-wrong` fired on the pair: `#424143` at **0.520 %**,
`#3670A0` at 0.03 %, `#2B689A` at 0.02 %, identical to five decimals. The cause is not site
contamination: the two figures carry the *same twelve category labels, the same legend and the same
source line, laid out identically*, so their ink layer is one object photographed twice. The guard
cannot distinguish that from what it was written for, and it should not try. What the twin taught is
written into the surviving record's own note; the record is not kept.

**What the six failures cost, and what they bought.** Three of them were replaced by better targets
found *because* they failed: the Datawrapper blog cards led to the Academy gallery and thence to four
charts at their own published urls (`datawrapper.de/_/<id>/`), where the graphic is the chart and
nothing else; the ONS blog's header screenshot led to the CPI preview prototype and thence to the
`dvc3148` chart bundle, where the waterfall lives as its own document. **A chart tool's own
"published chart" url is the cleanest harvest target in this corpus** — one document, one graphic,
the chart's type in a frame the harvester reads, and no article furniture to be mistaken for it.

---

## 2. Treatments proposed for filing

### `total-is-a-role-not-a-series` — imported

- evidence: `datawrapper-de-4dmeg`, `datawrapper-de-xhkuz` (datawrapper.de)
- evidence: `iea-org-data-and-statistics-charts-potential-reductions-in-average-hou`,
  `iea-org-data-and-statistics-charts-opportunities-to-reduce-methane-emi` (iea.org)
- detect: every bar declared an absolute total shares one fill, and no step uses that fill

The bars that state a level get one fill of their own, and the deltas get the other two. Alphabet's
four levels are `#4A606C` at **12.196 %** — the largest painted area in the chart, and a reading the
pixel route files under *neutral*, not chromatic; Nintendo's two are `#C4C4C4` at 6.799 %. The IEA
does it with a hue rather than a neutral: `#3E7AD3` at 10.301 % for all three levels of the
electricity-price bridge, `#49D3FF` at 9.596 % for both ends of the methane bridge.

**With a counter-example inside one of the two publications.** IEA's natural-gas bridge assigns hue
by series index, so `#3E7AD3` at 4.363 % is *both* the first step (Middle East) and the `Total
change` bar. Same house, same template, opposite decision — which is what makes this a treatment
worth stating rather than a habit worth copying.

### `signed-label-outside-the-bar` — imported

- evidence: `datawrapper-de-4dmeg`, `datawrapper-de-bprsn`, `datawrapper-de-xhkuz` (datawrapper.de)
- evidence: `ons-gov-uk-visualisations-dvc3148-fig02-index-html` (ons.gov.uk)
- detect: no text node lies inside a step's fill; every delta label carries an explicit `+` or `−`
  and is painted in that step's own colour; every total label is ink

`−$162.5B`, `+$29.8B`, `+10.9`, `−4.5`, `+0.05`, `−0.06` — outside the growing edge, in the step's
colour, with the totals in black above. ONS puts its label **beyond the arrowhead**, in the direction
of travel.

**The counter-evidence is measured, in this family, on this corpus.**
`storytellingwithdata-com-blog-2018-…` paints its values inside the bars in white; the light step is
`#BFBFBF` at 3.747 %, and white on that is about 1.9:1. The `−34`, `−45` and `−46` labels are the
hardest things on the plate to read. This is the exact failure `references/types/waterfall.md`
predicts, found in the wild, and the fix it names is the one the other four references use.

### `up-and-down-are-not-red-and-green` — imported

- evidence: `datawrapper-de-bprsn` `#3CA5A8` 5.983 % / `#F76D4C` 3.740 %,
  `datawrapper-de-zgupp` `#1F6D9C` 8.828 % / `#FA8C00` 8.021 % (datawrapper.de)
- evidence: `ons-gov-uk-visualisations-dvc3148-fig02-index-html` `#206095` 0.148 % / `#22D0B6`
  0.133 % (ons.gov.uk)
- evidence: `iea-org-…-forecast-changes-in-global-co2-emis` `#68F394` 0.715 % / `#FFF45A` 0.942 %
  (iea.org)
- detect: the two role hues are separated on an axis a deuteranope retains — blue/orange,
  teal/orange, blue/turquoise, green/yellow — and never red/green

Three publications, four different pairs, not one of them red/green. And the IEA's green/yellow pair
carries a second load: green is on the steps where **emissions fall**, so the hue means *good* rather
than *up*, in a subject where those are opposites.

**One exception, and it names its own condition.** `flourish-studio-blog-waterfall-charts` uses
`#70BA8A` 0.563 % / `#FA5D57` 0.516 % on six months of a share price, where the convention predates
the chart and the reader already holds it. The rule needs a subject test, not a blanket ban — which
is `palette`'s own doctrine ("the subject's own convention first") arriving from the other direction.

### `the-truncated-base-is-admitted-on-the-bar` — imported

- evidence: `datawrapper-de-bprsn` — the two total bars are drawn in a diagonal grey hatch
  (`#D2D3D3` 1.233 %, `#EBECEC` 1.056 %, `#E3E4E4` 0.817 %) because the axis starts near 388
  (datawrapper.de)
- evidence: `iea-org-…-forecast-changes-in-global-co2-emis` — every total is an **unfilled outline**
  with a `#49D3FF` (0.028 %) dot on its top edge, and `Note: Left axis is truncated` is set in bold
  **inside the plotting area** (iea.org)
- detect: if the value axis does not include zero, no absolute-total bar carries a solid fill, or the
  plot carries a truncation statement inside its own rectangle

A bridge whose axis is truncated is a length encoding that has stopped encoding length. Two
publications, two devices — hatch the bar, or hollow it and say so where the reader is looking —
and both are cheaper than the footnote nobody reads.

### `subtotal-restated-as-a-full-bar` — imported

- evidence: `datawrapper-de-4dmeg` — `Operating income` and `Income before taxes` sit on the zero
  baseline between the floating steps (datawrapper.de)
- evidence: `iea-org-…-potential-reductions-in-average-hou` — the middle `2030` bar restates the
  counterfactual level before four levers walk it down (iea.org)
- detect: a bar declared a subtotal starts at the baseline and its top equals the running level
  produced by the steps before it

This is the drawn form of the arithmetic check `references/types/waterfall.md` already demands. It
also makes the check available **to the reader**: revenue minus two costs must land on the top of
the operating-income bar, and a reader can see that it does.

### `order-is-chosen-from-the-answer` — imported, **and it corrects the doctrine**

- evidence: `ons-gov-uk-visualisations-dvc3148-fig02-index-html` — twelve COICOP divisions sorted by
  signed contribution, `+0.05` down to `−0.06` (ons.gov.uk)
- evidence: `datawrapper-de-4dmeg` (income-statement order), `datawrapper-de-xhkuz` (calendar order),
  `datawrapper-de-bprsn` (grouped, then editorial order within each group) (datawrapper.de)
- detect: if the row key is a date or a declared accounting sequence, the rows are in that sequence;
  otherwise the rows are monotone in the signed delta

`skills/chart-beat/references/types/waterfall.md` currently says: *"Rows stay in story order, never
resorted by magnitude — the sequence itself is the argument, and sorting it by size answers a
different, less interesting question."* **That is right for a time bridge and wrong for a
contributions bridge**, and ONS is the proof: twelve COICOP divisions have no sequence at all, so
sorting by signed value does not destroy an argument, it *supplies* one. The deleted CPI twin makes
it sharper still — it sorts the other way, falls first, because its headline ended down. The order
is picked per chart, from the answer.

The rule that survives both cases: **the sequence is the argument when there is a sequence; when
there is none, the sort must be monotone in the signed delta and its direction should carry the
reader toward the result.**

### `a-zero-step-is-still-drawn` — derived

- detect: for every row whose delta rounds to zero at the printed precision, the render contains a
  mark on that row and prints the zero; a row that produces no mark fails
- provenBy: render the family's beat with a zero-valued row and look at it
- seen at: `ons-gov-uk-visualisations-dvc3148-fig02-index-html` (Furniture, Health, Education each
  get a grey dot on the row rule and a printed `0.00`)
- the failure it prevents, measured: `iea-org-…-year-on-year-change-in-natural-gas-` has a category
  label, a tick and **nothing else** where `North America` should be. Its contribution is zero, so no
  rectangle is drawn, and the row reads as missing data rather than as no change.

`derived` rather than `imported` because the fact is in the beat's own numbers — this row's delta is
zero — and there is nothing for a second publication to corroborate. One desk shows the fix and one
shows the failure, which is the strongest form this evidence could take and still not be two uses of
a practice.

### `the-bridge-reconciles` — derived

- detect: walk the rows in order, tracking the running level; every bar declared an absolute total
  must equal the level the preceding deltas produced, to the precision the chart prints
- provenBy: render the family's beat, then break one delta and watch the guard go red
- why it must be code and not a rule of thumb: each bar shows only its own delta, so a reader has no
  way to catch the error by looking — which the doctrine already says, and which nothing currently
  checks

This is the one fatal error of the form and it is invisible in the picture. Four of the twelve
records print enough labels to be reconciled by eye, and **only one of the four lands exactly**:
`bprsn`, where −4.5 −4.4 −1.1 +10.9 −3.9 +2.9 +8.3 = +8.2 and 398.7 + 8.2 = 406.9. Alphabet misses
by 0.1 (158.8 − 26.7 = 132.1 against a printed 132.2); Nintendo's nine deltas sum to +5.9 against a
7.5 → 13.6 span of +6.1; the Germany population bridge only closes if every label's rounding is
assumed in the right direction. All four gaps are almost certainly rounding in the *labels* rather
than error in the *data* — and that is the point: from the picture alone, a reader cannot tell those
two apart, and neither can a reviewer. Only a check against the rows can.

---

## 3. Treatments that are real and are **not** proposed, because they rest on one publication

Named here so a second wave knows what to target. Each is stated as what a second desk would have to
be found doing.

- **`group-the-steps-and-print-the-group-net`** — datawrapper.de only. `bprsn` splits its seven steps
  with a dotted rule and prints `← Renewable energy +0.9 TWh` / `→ Non-renewable energy +7.3 TWh`;
  `zgupp` puts two `#EDEDED` (12.611 %) bands behind its steps, names each one and writes a sentence
  of context inside it. Needs a second desk that groups steps and states the group's net.
- **`a-step-can-be-a-stack`** — iea.org only. The methane bridge stacks six abatement measures inside
  the oil-and-gas step; the Southeast Asia bridge stacks every bar, totals and steps alike, by
  country. Needs a second desk stacking a step.
- **`totals-as-level-markers-when-the-axis-is-zoomed`** — datawrapper.de only. `zgupp` draws
  83.1M / 83.4M / 83.5M as a dot on a short rule rather than as bars, which is the only way a bridge
  can be drawn when the steps are millions and the levels are tens of millions. The IEA's hollow
  outline is close but is still a bar. Needs a second desk drawing the level as a marker.
- **`the-accent-is-the-level-not-the-change`** — storytellingwithdata.com only, and it is a community
  submission rather than a desk's work, which weakens it further. The five monthly balances are
  `#009BFF` at 5.813 % — the only chromatic reading in the record — and both step roles are greys
  (`#7F7F7F` 4.391 % adds, `#BFBFBF` 3.747 % subtracts), separated by lightness rather than hue.
  A complete inversion of `total-is-a-role-not-a-series`, and it would be worth a great deal to find
  a second one.
- **`tint-the-stretch-of-steps-the-headline-names`** — datawrapper.de only. `xhkuz` puts `#F4F9FC`
  at **29.055 %** behind 2016-2021 and white behind 2022-2025, so the title's two clauses are drawn
  as two backgrounds. This is very close to the existing `era-bands` treatment and may simply BE it,
  applied to a bridge; the parent should check rather than file a second name for one idea.

---

## 4. Directions proposed

A direction needs one reference, being a coherent whole.

### `iea-chart-library` — from `iea-org-…-potential-reductions-in-average-hou`

Ground `#FFFFFF` 85.61 %. One hue for every level (`#3E7AD3` 10.301 %), a categorical ramp for the
named steps (`#68F394` 0.749 %, `#FFB743` 0.633 %, `#FFF45A` 0.323 %, `#00ADA1` 0.245 %), gridlines
`#E6E6E6` 0.830 %, ink `#000000` 0.245 %. Type `Graphik`: 12/400 ticks and axis title
(`EUR/MWh (2025, MER)`), 12/500 category labels (`Higher RES share`), wrapped to two lines rather
than rotated. **No value labels anywhere** — magnitudes from the axis, exact values from the tooltip
only. The register of a chart library: comparable across 278 charts, unwilling to say anything a
template cannot say for all of them.

### `ons-contributions-bridge` — from `ons-gov-uk-visualisations-dvc3148-fig02-index-html`

Ground `#FFFFFF` 93.55 %, and the plate is line work: the heaviest mark on it is the row rules,
`#ECECEC` at **2.262 %**, more coverage than every coloured mark combined. Steps are **arrows, not
bars** — magnitude and sign in one stroke, no fill, no baseline. Rises `#206095` 0.148 %, falls
`#22D0B6` 0.133 %, endpoints as open rings on a magenta stem `#871A5B` 0.039 %, zeros as muted dots
(`#727173` 0.213 %). Type `Open Sans` 14/400 for categories, **14/600 for values** — the numbers one
weight heavier than their names — and 16/400 for the source in `rgb(112, 112, 113)`. Vertical, one
row per category, so twelve long division names need no rotation and no truncation.

### `datawrapper-editorial-bridge` — from `datawrapper-de-4dmeg`

Ground `#FFFFFF` 75.46 %. Neutral levels `#4A606C` 12.196 %, decreases `#E57A62` 4.444 %, the single
increase `#9AC9AC` 0.404 %, ink `#000000` 1.031 % / `#181818` 0.704 %, gridlines `#F3F3F3` 0.854 %.
Type `Roboto` throughout the frame: 22/700 title that **names both end totals**, 15/400 subtitle
naming entity, statement and unit, 13/400 labels with 13/700 on subtotal categories only, 11/400
source in `rgb(136, 136, 136)` with a `#0289CD` link. Two prose annotations in ink with curved
leaders, one of them a derived reading (`17% effective tax rate`) the bars do not contain.

### `flourish-dark-tape` — from `flourish-studio-blog-waterfall-charts`

Ground `#121212` at **94.07 %**, and that is what lets two role colours at half a percent each
(`#70BA8A` 0.563 %, `#FA5D57` 0.516 %) carry the whole plate. Gridlines `#636363` 0.470 % /
`#5D5D5D` 0.384 %, panel `#222222` 0.620 %. Type: `Lato` 32.2/700 title, `Source Sans Pro` 17.5/400
subtitle, `Lato` 14/400 axis, 12.6/400 source — **every run in `rgb(240, 240, 240)`**, hierarchy
entirely by size and weight. ~120 steps, no labels, no connectors; adjacency does the joining. The
register of a chart read as a shape rather than as an argument about named causes.

---

## 5. What the pool taught

**The form is scarce in the open web, and the scarcity is structural, not an artefact of searching.**
A waterfall answers a question that institutions ask constantly — how did this total become that
total — and that newsrooms mostly answer in prose. Twelve references from five publications, none of
them a newsroom, after four search vocabularies and eleven candidate desks. Reporting that as a
finding is more useful than padding it: the next wave should not spend a day looking for a Guardian
bridge chart.

**A chart tool's own published-chart url is the best harvest target this corpus has met.**
`datawrapper.de/_/<id>/` and `ons.gov.uk/visualisations/dvcNNNN/figNN/index.html` are documents whose
*only* content is the graphic. Both routes come back clean, the graphic is unambiguous, and on the
Datawrapper pages the frame's own type is read as well. Where a family's form is rare, the tool
galleries are where it is indexed.

**And a new failure mode for `METHOD.md`'s catalogue: the article's own promo card.** A post about a
chart type opens with a montage of small charts. It is the largest graphic on the page *and* it is
near the top, so both of the picker's preferences select it, and the record then looks like a
successful harvest of a chart when it is a harvest of a social-media card. Both Datawrapper blog
records failed this way and neither route reported anything but `ok`. It is not obviously fixable in
the picker — the card genuinely is a picture of charts — which makes it another reason step 3 cannot
be automated.

**A second wave should target, in order:** (1) a second desk that groups steps and prints the group's
net; (2) a second desk that draws a level as a marker rather than a bar; (3) the remaining 273 IEA
waterfall charts, if the parent decides that a form-indexed library is worth mining even at one
publication — it would not add evidence, but it would settle what the template can and cannot say.
