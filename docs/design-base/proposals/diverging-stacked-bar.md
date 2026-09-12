# Proposal — the DIVERGING STACKED BAR (Likert) family

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/` or `registers/`, and nothing has been rendered through the
engine. This family started from **zero references**.

**Family definition used:** ordered response levels stacked **outward from a shared centre** —
disagreement one way, agreement the other, a neutral level straddling the anchor or set aside.
Excluded, deliberately, and both were met in the pool: a 100 % stacked bar of Likert data anchored
on a shared **left** edge (Stack Overflow's 2024 AI survey, Flourish's own example literally titled
"Likert"), which is the alternative Datawrapper argues *for* against this form; and the population
pyramid, which diverges but is not an ordered opinion scale.

**Provenance convention.** Every colour quoted below is read from `record.pixel` on a record whose
`routes.pixel.measuredFrom === "graphic.png"`; all three filed records satisfy that. Type is read
from `record.style.type` **only where `record.style.typeSource` allows it**, and this family is the
sharpest case the corpus has produced of why that field exists — see §5. "Looked at" means a human
read of a PNG in the reference directory; two claims below (the neutral's straddle, and the order of
the ramp) were re-checked on a **cropped and enlarged** copy of the graphic before being written.

---

## 0. The findings that govern everything else in this file

**This form is nearly absent from published work, and that is a fact about the form, not about the
search.** Twenty references were harvested across three waves; **three** carried a diverging stacked
bar; **all three are specimens** — a chart-library example, a newsroom's chart-type catalogue, and a
statistics package's front page. **No published news graphic, and no published survey-institution
graphic, was reached in this form at all.** What the survey desks were found doing instead is
consistent enough to be the family's central finding:

| desk | what it draws for Likert data instead | evidence |
| --- | --- | --- |
| Datawrapper | 100 % stacked bar, left-anchored | its post *The case against diverging stacked bars* |
| Stack Overflow | 100 % stacked bar, left-anchored, five ordered levels | `survey.stackoverflow.co/2024/ai` |
| Flourish | 100 % stacked **column** + mean dot, in an example titled "Likert" | `public.flourish.studio/visualisation/16080969` |
| ONS | **plain single-colour bars** (`meta template="bar-chart"`, one `colour_palette`) and **lines** | `dvc2760/fig1,4,5`; `dvc3603/fig01-03` |
| Eurobarometer | a **pie**, with "Total 'Agree' 67 / Total 'Disagree' 28" called out | `europa.eu/eurobarometer/surveys/detail/3216` |
| Pew Research | none — its designers' own seven favourites of 2025 are two alluvials, three bars, a rose plot and a beeswarm | `pewresearch.org/short-reads/2025/12/15/...` |

A harvest that returned three references would normally read as a failed search. Here the same pool
returned six independent desks **choosing something else on purpose**, one of them having published
an argument for doing so. The scarcity is the result.

**`100.datavizproject.com` contains none of this form, certainly.** All 100 thumbnails were looked
at on four contact sheets (re-using sheets a sibling harvest had already built — ninety seconds and
four Read calls, as correction 16 recommends). Not one diverges from a centre; the nearest relatives
(#24, #58, #90, #97) are left-anchored 100 % stacked bars. Correction 16 predicted this exactly: the
archive's one dataset is Scandinavian World Heritage counts at two dates and carries no ordered
response scale, so **no page among the hundred can be this form**. Cost of establishing it: four
Read calls. Drawn 100, harvested 0.

**The url list contains none either.** `/likert|diverging|divergent/` returns one line, and it is
`por-ti-portugal.divergente.pt` — an outlet's *name*. `/survey|poll|opinion|attitude/` returns 143,
read by eye: election poll trackers, air **pollution** pieces, and **opinion**-section essays.
Correction 2 in its worst form: two of this family's three natural keywords are homonyms.

**A third archive indexed by FORM exists, and it is not in `METHOD.md`'s table.**
`https://ft-interactive.github.io/visual-vocabulary/` — the FT's Visual Vocabulary — serves a
working chart per form, in FT frames, and its index is a flat CSV:
`https://ft-interactive.github.io/visual-vocabulary/chartTypes.csv`, 74 rows, columns
`chartName,category,img,avail,description`, with `avail=TRUE` on 44 of them. Each `chartName` is a
directory: `…/visual-vocabulary/<chartName>/`. It carries `bar-diverging-stacked`, `spine-chart`,
`bump`, `priestley timeline`, `calendar-heatmap`, `sankey`, `waterfall`, `boxplot`, `violin`,
`population-pyramis` *(sic)* and more — **most of the families this programme is harvesting**, one
url each, one graphic each, no masthead and no consent wall. It belongs beside `100.datavizproject`
and the IEA library in the archives table, and the next family should read the CSV before it draws a
pool. What it is *not* is a newsroom's published practice — see §5.

---

## 1. Yield

| family | archive | drawn | harvested | survived looking | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| diverging-stacked-bar | datavizproject | 100 | 0 | 0 | 0 |
| diverging-stacked-bar | url-list | 3 827 (filtered to 0) | 0 | 0 | 0 |
| diverging-stacked-bar | informationisbeautiful | 640 (filtered to 0) | 0 | 0 | 0 |
| diverging-stacked-bar | buried-signals | 0 | 0 | 0 | 0 |
| diverging-stacked-bar | search | 20 | 20 | 3 | 3 |

**20 harvested, 3 reached this form, 3 filed.** The seventeen that did not, and what the harvester
actually photographed — the catalogue is in the pool file and reduces to five kinds:

| kind | count | examples |
| --- | ---: | --- |
| reached a real chart, **wrong form** | 6 | Pew (line), Stack Overflow (left-anchored Likert), Flourish (100 % column), Eurobarometer (pie), Peoples' Climate Vote (plain columns), Depict Data Studio (waffle) |
| the opening beat the graphic | 3 | ABC ×2 (a **video still**, a press **photograph**), Statistics Canada (a whole illustrated infographic) |
| no graphic outside the site's chrome | 3 | Data Revelations, Stephanie Evergreen, ABC's *Australia Talks* landing page |
| the graphic was the **page** | 2 | Plotly (a 9 000 × 9 000 page-wide `<svg>`), Observable (a slab of notebook code cells) |
| a chart, but **someone else's**, reproduced | 1 | Datawrapper's post photographed **The Pudding's** film-dialogue chart |
| load failure / placeholder | 2 | Reuters Institute (both routes failed), Flourish blog (3 kB lazy placeholder) |

Two of these are worth the parent's attention.

**A fourth costume for correction 1: the reproduction.** `datawrapper.de/blog/divergingbars` was
harvested cleanly — both routes `ok`, an `img` 640 × 616 well inside the article — and what it
photographed is **The Pudding's** chart, embedded in Datawrapper's post as an example of what to do
instead. Nothing in the record could catch it; the url says `datawrapper.de` and the record would
have filed a Pudding design as Datawrapper's. This is not the montage of correction 18 (which is a
picture *of* charts) and not the mock-up of correction 17 (which advertises an interactive that has
gone). It is a **single real chart by a named third party, correctly rendered, inside a post that
credits it in prose the harvester does not read.** Only looking caught it, again.

**A documentation page can be one enormous graphic.** Plotly's `horizontal-bar-charts` page returned
`svg 9000 × 9000` at `documentTop −10000`. The picker's largest-painted rule has no ceiling, so a
full-page SVG overlay wins outright and the record becomes a photograph of a website that says
`measuredFrom: "graphic.png"`. This is correction 15's shape — a true field about a wrong thing —
and unlike the masthead case there is a cheap discriminator available: a graphic wider or taller
than the viewport by an order of magnitude, or one whose `documentTop` is negative, is not a chart.
Recorded, not fixed.

---

## 2. Treatments proposed for filing

Three references, three independent hosts, three independent authors: `vega.github.io` (the Vega
project / UW Interactive Data Lab), `ft-interactive.github.io` (the Financial Times graphics desk)
and `jbryer.github.io` (Jason Bryer's R `likert` package, the software implementation of Heiberger &
Robbins' 2014 JSS paper). No two share a design author, so the evidence floor is satisfiable at two
publications — but only just, and every treatment below is filed on **two of three**.

### `ramp-deepens-outward` — imported

- kind: imported
- evidence: `vega-github-io-vega-lite-examples-bar-diverging-stack-transform-html` (vega.github.io)
- evidence: `jbryer-github-io-likert` (jbryer.github.io)
- detect: on each side of the centre, the fill adjacent to the anchor is lighter than the fill at
  the extreme; a side whose lightness does not increase monotonically inward fails

One ramp per side, palest beside the centre, deepest at the end, so strength of response reads as
colour intensity as well as as distance. Vega-Lite:
`#C30D24` → `#F3A583` ‖ `#CCCCCC` ‖ `#94C6DA` → `#1770AB` (RdBu). The `likert` package:
`#D8B365` → `#EBD9B2` ‖ `#ACD9D5` → `#5AB4AC` (ColorBrewer BrBG, 4-class). Both records carry
`pixel.shape: "diverging"`, so the pixel route agrees with the eye.

**With a counter-example, from the third publication.** The FT's specimen fails this on one side and
passes on the other: from the centre outward the disagree arm runs *strong* then *weak* while the
agree arm runs *weak* then *strong*. Its `pixel.shape` is `categorical`, its five fills are
`#1F5E99 #A7FF59 #00D9CA #EB3F50 #BF9413` — blue, acid green, teal, red, gold: a categorical set
applied to an ordered scale, with no neutral hue. Two desks obey the rule, the third demonstrates
what it costs to skip it, which is what makes this worth stating rather than assuming.

### `neutral-straddles-the-anchor` — imported

- kind: imported
- evidence: `vega-github-io-vega-lite-examples-bar-diverging-stack-transform-html` (vega.github.io)
- evidence: `ft-interactive-github-io-visual-vocabulary-bar-diverging-stacked` (ft-interactive.github.io)
- detect: the neutral level's segment contains the zero, with equal extent to each side; a neutral
  drawn wholly on one side, or absent from the centre while present in the data, fails

The undecided mass is laid symmetrically across the zero, half to each side, so that the anchor
falls *inside* it and "which way does this row lean" is answered by which arm is longer. Vega-Lite
does it with `#CCCCCC` — filed by the pixel route under **neutral**, not chromatic, at 3.318 %. The
FT does it with `#BF9413`, gold, chromatic. Two publications, two opposite decisions about whether
the neutral gets a hue, and the **same** decision about where it sits.

This claim was checked twice. On the FT graphic at full size the gold band reads as though it ends
at the zero gridline; on a 1.6× crop of the centre it plainly spans roughly −1 to +1 on every row.
The measurement that disagreed with the eye was the eye's, and the crop settled it.

### `one-legend-names-every-level-once` — imported

- kind: imported
- evidence: `vega-github-io-vega-lite-examples-bar-diverging-stack-transform-html` (vega.github.io)
- evidence: `jbryer-github-io-likert` (jbryer.github.io)
- evidence: `ft-interactive-github-io-visual-vocabulary-bar-diverging-stacked` (ft-interactive.github.io)
- detect: exactly one legend exists, it names every response level in the data, and no row carries
  a legend of its own

All three, unanimously — and they place it in three different positions (Vega-Lite at the right,
titled `Response`; the `likert` package below the whole figure, titled `Response`; the FT across the
top under the subtitle). **The placement is not the treatment.** What all three share is that the
scale is named once, off the bars, in the reading order the ramp runs.

---

## 3. Real, and NOT filed

Written down so they are not re-discovered from scratch, and so the day a second publication turns
up the work is a citation rather than a wave.

### `totals-outside-the-bar-ends` — one publication

The `likert` package prints the two numbers a reader of this form actually wants — total disagree,
total agree — **in the margins, outside the ink**, one at each end of every row: `50%`…`50%`,
`70%`…`30%`, `74%`…`26%`. No number is placed inside a segment anywhere in the chart. This dissolves
`diverging-stacked-bar.md`'s stated accessibility trap at a stroke: if no label sits on a fill,
there is no per-fill contrast to measure and no segment too small to hold its own text. It rests on
**jbryer.github.io alone**. Neither of the other two labels its bars at all (the FT's own config
says `labels=false`).

### `axis-reads-magnitude-not-sign` — one publication, and an active defect in the other two

The `likert` package's x axis runs `100 · 50 · 0 · 50 · 100`, mirrored, titled `Percentage`: nothing
is labelled negative because nothing *is* negative. Vega-Lite's runs `−40 … 0 … 100` and the FT's
runs `−15 … 0 … 20` **under a subtitle that says the unit is "Number of people"** — a count of
people labelled −10. Two of the three published a false axis label, and the reason is mechanical:
the negative arm is drawn by negating the data, and the axis then reports the trick rather than the
quantity. One publication cannot file it, and it is the strongest single candidate in this family.

### `rows-keep-their-given-order` — refused on correction 11's reasoning

All three keep rows in the order the data gives them and none re-sorts by result — including
Vega-Lite's `Question 8`, 100 % `Strongly agree`, which any sort would have moved to an end.
`skills/chart-beat/references/types/diverging-stacked-bar.md` already requires this. But **"order as
given" is also every one of these three tools' default**, and at this resolution a default cannot
honestly be told from a decision. That is exactly the reading that refused La Nación's basemap
labels in correction 11, and it refuses this. Filing it would put an uncertainty into the
foundation; the rule stays in the type reference, where it belongs, and out of `treatments/`.

---

## 4. Directions: none proposed, and the reason is a measurement

A direction needs a coherent whole — ground, accent, and a type register table. **Not one of the
three references can supply the type half honestly.**

| reference | `typeSource` | what that costs |
| --- | --- | --- |
| `jbryer-github-io-likert` | *the page only — the graphic is a raster and carries no type this route can read* | every family in the record (`Helvetica Neue`, `Menlo`) is the pkgdown site's furniture. Zero registers are measured. |
| `vega-github-io-…-transform-html` | *the page, which contains the graphic — the two are not separated* | only two tuples can be attributed at all, and only because their **sample strings** are chart content (`−40` at `sans-serif 10/400`, `Percentage` at `sans-serif 11/700`). Both are Vega's default theme, not a design. |
| `ft-interactive-…-bar-diverging-stacked` | *the page, which contains the graphic* — and here the page **is** the chart | the record declares `metric` at every size. **The webfont does not load on that GitHub Pages host**: the picture shows a serif fallback. Every size and weight is declared; every shape is the browser's substitute. |

The FT record is the one that would have produced a direction, and it is the one where a direction
would have been a fiction — a register table naming a typeface the reference never rendered. It is
filed as a reference with that stated in its own note, and **no direction is proposed**.

What the FT record *does* give, and what should be read from it instead of a direction, is a **scale
model**: one chart drawn into every FT output on one page, with three sizes per role and nothing
else changing — source `7.2 / 14 / 36`, labels and subtitle `9.6 / 18 / 48`, title `12 / 25 / 68` at
weight 600 against 400 elsewhere. One typeface, one weight pair, three sizes chosen per output.
That is directly transferable to a beat that must ship as still, web and video, and it is a ratio
rather than a value, so the unrendered webfont does not compromise it.

---

## 5. What the pool taught

**Specimen ≠ practice, and this family is the case that forces the distinction.** The waterfall
harvest filed Datawrapper, Flourish and Storytelling with Data as publications, and that was right
because each had published a chart *of something*. Here all three references are chart-type demos
over invented data — `Question 1 … Question 8`, `Movie A was a great movie`, a `data.csv` with
`Stringly disagree` misspelt in it and a source line reading `Thomson Reuters Datastream` under
numbers that came from nowhere. The three treatments in §2 are honestly evidenced *as the form's
canonical apparatus*. **None of them is evidence that a newsroom draws this, because none of the
three is a newsroom drawing it.** Any downstream use should carry that.

**Correction 16's bound is sharper than it reads.** It says a form whose data the Ferdio dataset
cannot express gets nothing from that archive. This family shows the same bound applies to a whole
*programme*: a form whose data a **desk does not collect** gets nothing from that desk. There is no
route from the 3 827-line url list to a Likert chart, because the newsrooms in it do not run
surveys; the desks that do run surveys are institutions, and this harvest watched six of them
choose a different chart.

**Three discovery channels failed in one day, and only one of them looked like a failure.**
`search.sh` returned `results: []` on every call after the first two — the shared SearXNG saturating
under seven parallel harvests, exactly as the brief warned, and a channel that answers `[]` is the
one that most resembles a measurement of absence. WebSearch then reached its session budget at
200/200. Both fallbacks were closed too: DuckDuckGo's lite endpoint refused the connection and
Mojeek answered with a captcha. **The last third of this pool was built by fetching known index
pages and reading them directly** — the FT's `chartTypes.csv`, ONS's `config.js` and
`meta name="template"`, Datawrapper's `dwcdn.net/<id>/full.png`, Nature's `/figures/<n>` pages, and
a small puppeteer script that dumps a page's images with their alt text (which is how Pew's seven
favourites of 2025 were read without harvesting one of them). Every one of those is cheaper than a
harvest and several are cheaper than a search:

- **`datawrapper.dwcdn.net/<id>/full.png`** renders any published Datawrapper chart as a PNG. Two
  candidates were triaged out of this pool with one `curl` and one Read each.
- **ONS's `visualisations/dvc<NNNN>/<fig>/config.js` and `<meta name="template">`** name the chart's
  form and its palette in plain text. Four ONS figures were eliminated without a browser.
- **`nature.com/articles/<id>/figures/<n>`** is one figure on one page with the caption as its
  `<title>`.

**And the one seam worth adding to the method is the FT's.** `chartTypes.csv` is a form index for
44 charts across nine categories, served from a static host, with a directory per form. It will pay
for most of the twenty-two families, and it costs one `curl`.
