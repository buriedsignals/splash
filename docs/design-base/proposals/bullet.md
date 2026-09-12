# Proposal — the BULLET family (measure vs. target, with a qualitative backdrop)

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/` or `registers/`; those directories were not touched, and
nothing proposed here has been rendered through the engine. This family started from **zero
references** and it now has **six**.

**Family definition used:** one measure drawn as a length from zero, judged against a **declared
target** carried on the same row as a mark of a *different kind*, optionally over qualitative bands.
Stephen Few, 2005, as a replacement for the dashboard gauge.

**Provenance convention.** Every colour quoted is read from `record.pixel` on a record whose
`routes.pixel.measuredFrom === "graphic.png"` — five of the six. The sixth (BBC) has
`routes.pixel.state === "not-applicable"` and **no colour is quoted from it anywhere**, in this file
or in its note. Type is read from `record.style.type` **only** where `record.style.typeSource` says
it is the graphic's; on three of the six it says *"the page only — the graphic is a raster and
carries no type this route can read"*, and those three quote no type at all. "Looked at" means a
human read of a PNG in the reference directory.

---

## 0. The finding, before anything else

**No news desk in this corpus publishes a bullet chart, and the reason is not that the form is
unavailable to them.** This is where the family diverges sharply from `boxplot`, whose zero was
explained by the desks' tool not offering the form. Here the opposite is true, three times over:

1. **Datawrapper ships it.** "Bullet bars" is one of its 23 chart types
   (`datawrapper.de/charts/bullet-bars`, `academy/how-to-create-a-bullet-bar-chart`), documented,
   annotatable since 2024, available on the free plan.
2. **The Financial Times' own published chart doctrine names it.** The Visual Vocabulary poster
   (`Financial-Times/chart-doctor`, `Visual-vocabulary-en.pdf`, v5, © FT 2016–2019, CC BY-SA) lists
   **Bullet** under *Magnitude*, draws the icon correctly — four rows, grey track, dark measure bar,
   vertical tick crossing it — and glosses it *"Good for showing a measurement against the context
   of a target or performance range."*
3. **And the only bullet chart found anywhere is the tool vendor's own demonstration of the tool.**

The form is in the tool, in the newsroom's doctrine, and not on the page. **That, and not a missing
capability, is this family's finding.**

### The three corroborations of the near-zero

- **`~/Downloads/infoviz-source-urls-alive.txt`, 3 827 published newsroom interactives, contains
  zero lines matching `/bullet/` as a form.** Fourteen match `bullet|target|kpi|pledge|goal|
  progress|on-track|quota|benchmark`; twelve are subject matches (World Cup goals, wildfire
  progression, cell-phone location tracking), and the two that could plausibly be form matches are
  both on Bloomberg, a paywalled desk the method excludes. `METHOD.md` correction 2 at its most
  extreme, again.
- **`100.datavizproject.com` draws the gauge three times and the bullet never.** All 100 thumbnails
  were downloaded (by headless Chrome — Cloudflare refuses `curl`), montaged into four labelled 5×5
  contact sheets and read. Not one bullet. `#2` (an arc with a grey track and three markers), `#35`
  and `#57` (donut gauges: a value arc on a pale ring, the number in the middle) are **gauges** —
  the exact form Few invented the bullet to replace — from a house that has evidently never needed
  the replacement. Three more (`#21`, `#74`, `#79`) are radial *bar* charts with no track, and are
  not counted. Eight encodings were considered at full size and refused in writing;
  the reasons are in the pool file. **Correction 16 governs the result**: the archive's dataset is
  three countries at two dates and carries no target, so a bullet is arithmetically impossible
  there, and a wave should not be spent finding that out. The gauges, however, are not impossible,
  and they were drawn.
- **Ten searches, zero newsroom pieces.** SearXNG through `search.sh` returned `results: []` on
  three queries — the shared instance saturating under six concurrent siblings, which is the
  brief's warning confirmed and **not** evidence of absence — and `WebSearch` then exhausted the
  session budget (200/200) after ten. Those ten returned, without one exception: BI vendor
  documentation (Tableau, Domo, Luzmo, Power BI, Datylon, Looker), teaching material
  (storytellingwithdata, Better Evaluation, Wikipedia, pbpython), and Datawrapper's own Academy.
  The remaining reach was directed crawling with `WebFetch`, `curl` and `gh`.

### What desks draw INSTEAD when they have a measure and a target

This is the finding worth having, and unlike the zero it is **evidenced**, by four independent
publications in the corpus and two more that were harvested and deleted:

| substitution | what it does | seen on |
| --- | --- | --- |
| **A shared rule across all rows, named on the line** | one dashed rule at the threshold, crossing every row's track, labelled `326 seats for a majority`, plus the verdict `0 seats to go` | **BBC**, UK election 2024 |
| **The target as a second bar** — thin saturated inside thick pale | value and target become two lengths, distinguished by thickness and chroma, not by mark kind | **Datawrapper** (its own bullet-bar type) |
| **The target as the GAP, stacked on the actual** | draw the shortfall as a labelled area rather than a tick, and let a met target's segment vanish | **ICAEW**, NATO defence spending |
| **The target as a numeric column outside the plot** | measure and target in different units, so the target's value is tabulated beside the bars in the plate's only foreign hue | **Statista**, NATO expenditure |
| **The qualitative bands promoted to the encoding** | count entities into the target's own bands and stack the counts | **Statista**, NATO 2 % timeline |
| **The target as a second column beside the actual** | two plain columns, `2025` and `32%`, with `x2.2` between them | IEA (harvested, deleted — wrong form) |
| **The neutral track with no target at all** | what a bullet degrades to when the data carries no goal | **Datawrapper** (its bar-chart default) |

**The one that should reach the type page** is the first. `skills/chart-beat/references/types/
bullet.md` currently insists every row gets its own scale and its own tick, because two KPIs in
different units cannot share an axis. That is right for a dashboard and wrong for the newsroom case
that actually ships: when the rows share a unit and a scale — seats, percent of GDP, doses — **one
shared rule is cheaper, faster and lets the rows be compared with each other as well as with the
target.** The BBC draws it that way and so, in a different costume, does Statista.

**And the type page's central rule is contradicted by the only implementation any desk can reach.**
The page says the target "renders as a distinct tick mark crossing the bar's own track, **not as a
second bar**". Datawrapper's bullet-bar type draws it as a second bar and offers no alternative. The
page can keep its rule — it is the better design — but it must say that the default tool does not
obey it, or a journalist following the page will be unable to produce what it asks for.

---

## 1. Yield

| family | archive | drawn | harvested | survived looking | proposed for filing |
| --- | --- | ---: | ---: | ---: | ---: |
| bullet | datavizproject | 100 | 0 | 0 | 0 |
| bullet | url-list | 14 | 6 | 0 | 0 |
| bullet | search | 10 | 10 | 6 | 6 |
| bullet | informationisbeautiful | 0 | 0 | 0 | 0 |
| bullet | buried-signals | 0 | 0 | 0 | 0 |
| **total** | | **124** | **16** | **6** | **6** |

**"Drawn" for `datavizproject` means all 100 thumbnails were downloaded and read on four contact
sheets** before anything was harvested — ninety seconds and four `Read` calls, and it bought a
certain zero. Nothing was harvested from it, so nothing could survive looking.

**"Drawn" for `url-list` is the 14 keyword matches.** Six candidates were harvested — five from the
list plus a Guardian atom url dereferenced out of one of them — and **none survived**:

| harvested | outcome |
| --- | --- |
| `theguardian.com/…/uk-general-election-results-2024-live-in-full` | **deleted** — consent dialog, *"Personalised advertising – it's your choice"*, unhandled |
| `theguardian.com/…/us-house-senate-and-governor-elections-2024-results…` | **deleted** — the same dialog |
| `reuters.com/graphics/USA-ELECTION/RESULTS/dwvkdgzdqpm/` | **deleted** — reached a real choropleth map |
| `politico.com/election-results/2018/house/` | **deleted** — Cloudflare bot check (*"Un instant…"*) |
| `npr.org/…/how-is-the-covid-19-vaccination-campaign-going-in-your-state` | **deleted** — reached a real hex cartogram. Right subject, wrong form |
| `interactive.guim.co.uk/atoms/…/main.html` | **deleted** — renders **blank**; see §4.2 |

Six harvests, six failures, and **four of the six are the failure modes `METHOD.md` already
catalogues** — two consent dialogs and two bot checks. The 1-in-3 the log records for news domains
was not achieved; it was **0 in 6**.

**All six survivors came from `search`**, and every one of them was found by knowing where the form
lives rather than by a search engine, because the search engines were gone.

**Independence, read off the url host, with the proxy corrected in both directions:**

| publication | records | note |
| --- | --- | --- |
| **Datawrapper** | 2 | `datawrapper.de` and `datawrapper.dwcdn.net` are **one design author under two hosts** — the CDN serves the same tool's charts. Counted **once**. |
| **BBC** | 1 | |
| **ICAEW** | 1 | a professional institute publishing a weekly chart with a named designer, not a newsroom |
| **Statista** | 2 | two "Chart of the Day" infographics from one desk in one house style. Counted **once** (correction 4). |

**Four publications, six records — and only one of the four is a news desk.**

---

## 2. Treatments proposed for filing

### 2.1 `target-named-on-the-line-that-draws-it` — imported

```
- kind: imported
- name: The threshold is named in words on the mark that draws it, and the shortfall is written out
- applies: the beat draws any declared target, threshold, quota, pledge or majority that a measure
  is judged against
- draws: annot, legend
- evidence: bbc-co-uk-news-election-2024-uk-results
- evidence: icaew-com-insights-viewpoints-on-the-news-2025-jun-2025-chart-of-the-w
- detect: for every target mark on the plate, a text run within the plate names what the target IS
  (its value and its meaning), and that run is anchored to the mark rather than to a caption or a
  legend elsewhere
```

Two publications: `bbc.co.uk`, `icaew.com`.

**The rule.** A target line with only a number beside it is a gridline. The words that make it a
target — *for a majority*, *of GDP* — belong on the mark, not in the standfirst.

**Where it was seen.** The BBC's dashed rule carries `326 seats for a majority` right-aligned at its
end, and beneath it `✓ 0 seats to go` — the derived quantity, target minus the leader's value,
floored at zero, written as text. ICAEW labels every stacked segment on a leader line to the outside
of its column: `Defence spending in 2024`, `Defence spending to 2.0 % of GDP`, `to 3.5 % of GDP`,
`Defence-related spending to 5.0 % of GDP`, and gives each its own value in pounds inside the
segment. Neither chart has a legend. Both are legible with the surrounding prose removed.

**Why it is more than a caption rule.** `bullet.md` already asks for the target to be a distinct
mark; it does not ask for it to be *named*, and an unnamed tick is exactly as mute as an unlabelled
band was for the boxplot family. The BBC's second half — writing the shortfall as a number — is the
part a beat can do for free, because a beat that carries a value and a target already carries the
difference.

**What limits it.** The BBC record has no pixel route (§4.1), so this treatment's evidence on that
side is geometry and text only. The claim is about words and their position, which is what was
actually read, but the parent should know the record is half-measured.

### 2.2 `neutral-track-to-the-ceiling` — imported

```
- kind: imported
- name: The measure sits in a neutral track that runs to the plot's ceiling, not to the target
- applies: a bar or column beat where the reader's question is "how much of the way there", and the
  source data carries no qualitative bands
- draws: marks
- evidence: datawrapper-de-fdwed
- evidence: bbc-co-uk-news-election-2024-uk-results
- detect: every measure mark sits inside a track of identical extent across all rows, the track's
  chroma is below the palette's chromatic floor, and the track's extent equals the axis ceiling
  rather than the target's position
```

Two publications: `datawrapper.de`, `bbc.co.uk`.

**The rule.** `bullet.md` says that when no bands are given, "the honest choice is a single neutral
track behind the bar, never an invented poor/ok/good split the source data doesn't actually
support." This is that rule, evidenced, plus the geometric detail the page does not state: **the
track runs to the ceiling.** A track that stops at the target turns "exceeded" into a bar that has
run off the end of its own container; a track that reaches the ceiling keeps the remainder legible
and lets the winner visibly overtop the line.

**Where it was seen.** Datawrapper's turnout chart draws `#F3F3F3` at **12.420 % of the frame** — the
largest non-white mark on the plate, larger than the teal accent at 8.343 % and more than three
times the red at 3.505 % — as a full-width band behind every one of eleven bars. The BBC gives every
party column a full-height track and the winning column crosses the majority rule inside it.

**Why the arithmetic matters.** The track outweighs both accents by area and still reads as
furniture. Lightness decides and area does not — the same mechanism the boxplot family filed under
`summary-in-neutral-case-in-colour`, arriving from a different direction. A designer sizing the
track by "how much ink can I afford" gets this wrong.

**What limits it.** The BBC half of the evidence is unmeasured for colour (§4.1); the claim there is
that a track exists and reaches the ceiling, which was read by eye. And Datawrapper's chart has no
target at all — it is the *control*, the same house's default with the goal removed. The parent may
judge that too loose. If so, this treatment has one publication and should wait.

### 2.3 `value-and-target-are-one-hue-at-two-chromas` — imported, and the weakest of the three

```
- kind: imported
- name: A measure and the target it is judged against are the same hue at two chromas, never two hues
- applies: the beat draws a value and its target as two marks of comparable kind
- draws: marks
- evidence: datawrapper-dwcdn-net-dig4f
- evidence: statista-com-chart-14636-defense-expenditures-of-nato-countries
- detect: the value mark and the target mark resolve to the same hue within a small tolerance, and
  are separated by chroma and lightness alone
```

Two publications: `datawrapper.dwcdn.net`, `statista.com`. **The caveat belongs in the filed
treatment, not only here.**

**The rule.** Two states of one quantity should not read as two categories. Hue says "different
thing"; chroma says "same thing, different state".

**Where it was seen, and the arithmetic is checkable in both records.** Datawrapper's bullet:
actual `#1D81A2` at **14.224 %**, hue **194.9°**, chroma 0.522; planned `#A1C4D7` at **7.034 %**, hue
**201.1°**, chroma 0.212. Six degrees apart, and `pixel.shape` reports `sequential, 1 cluster` —
the arithmetic agreeing with the intent. Statista's expenditure chart: 2025 `#0054AA` at **4.510 %**,
hue **210.336°**; 2014 `#67AFF9` at **2.641 %**, hue **210.407°**. **Seven hundredths of a degree
apart**, and its `pixel.shape` is `sequential, 1 cluster, 21 members`.

**Where the reading is a stretch, said plainly.** Statista's two bar states are **2014 and 2025**,
not value and target. Its target is elsewhere on the plate entirely — the green `#5E9205` column at
0.184 % of the frame. So the shared logic is real ("two states of one measure, one hue, two
chromas") and the *roles* are not the same. **If the parent judges that too loose, this treatment
has one publication and should wait**, exactly as `before-nested-in-after` waits.

---

## 3. Derived treatments proposed — each needs a render before it can be filed

`METHOD.md` correction 7 makes these possible: they draw facts a bullet beat's own data already
carries, so no second publication can corroborate them. The guard demands a `detect` **and** a
`provenBy`. **No render was produced by this harvest**, so each is conditional on the family's own
beat being drawn.

### 3.1 `the-shortfall-is-a-number-on-the-plate`

```
- kind: derived
- detect: the plate carries a text run stating target minus value (or its floor at zero) for the row
  the beat is about, and that run and the target mark are computed from one constant
- provenBy: (not rendered)
```
`0 seats to go` is the sentence a reader wants and a tick only implies. A beat that carries a value
and a target carries this already; not drawing it is the omission.

### 3.2 `a-row-without-a-target-is-refused`

```
- kind: derived
- detect: every row rendered as a bullet has both a value and a target; a row with a value and no
  target causes the component to refuse rather than to draw a bare bar among bullets
- provenBy: (not rendered)
```
`bullet.md`'s own words — "a row with a value but no target isn't a bullet, it's a bar pretending to
be one" — as a refusal rather than a warning, which is the version the boxplot proposal argued for
and the same argument applies.

### 3.3 `bands-only-when-the-source-carries-them`

```
- kind: derived
- detect: the count of qualitative band marks equals the count of thresholds present in the beat's
  own source data; where that count is zero, one neutral track is drawn and no band is
- provenBy: (not rendered)
```
The type page's strongest instruction — "a bullet chart must not manufacture judgement the
journalist didn't provide" — made measurable. And note that **no chart in this corpus draws
qualitative bands at all**: Datawrapper's type does not offer them, and the nearest thing found is
Statista's promotion of bands to the encoding itself. The bands are the least evidenced part of the
form.

### 3.4 `the-shared-rule-when-the-rows-share-a-unit`

```
- kind: derived
- detect: where every row's target is the same value in the same unit, one rule is drawn across all
  rows and no per-row tick is; where the targets or units differ, per-row ticks are drawn and no
  shared rule is
- provenBy: (not rendered)
```
The correction §0 argues for, expressed as a predicate the beat's own data decides. Filed as derived
because the predicate is "are these targets equal", which no external publication can vouch for.

---

## 4. What could NOT be filed, and what this harvest found out about the method

### 4.1 A chart made of `<div>`s is invisible to the graphic picker, and the record says "no graphic"

The BBC's seat chart is the strongest reference this family found and it has **no `graphic.png`**.
`findGraphic` looks for `svg | canvas | figure img | iframe`; the BBC builds this chart from styled
block elements, so the picker correctly reported *"no graphic outside the site's own chrome"* — and
the page's lead visual, above the fold, was never photographed.

This is a **new costume for `METHOD.md` correction 1**, and it is the honest inverse of the others:
correction 1, 17 and 18 are all cases where the harvester photographed the *wrong* thing and the
record looked fine. Here the harvester photographed *nothing* and the record says so, out loud, in
`routes.pixel.why`. **The mechanism worked and the reference is still half-measured.** The fix is
bounded — a fifth accepted graphic shape, "a block element with N children carrying non-default
backgrounds" — and it is not made here, because a selector that broad would start photographing
navigation bars, which is the failure corrections 13 and 14 were written to close.

The consequence for this file: **no colour is quoted from the BBC record**, and two of the three
proposed treatments lean on it for geometry and words only.

### 4.2 The chart-tool permalink trick does not generalise to a newsroom's own atoms

`METHOD.md` correction 18 says the cleanest harvest targets are chart-tool permalinks, and it paid
here — `datawrapper.dwcdn.net/Dig4F/` and `datawrapper.de/_/FdWeD/` are the two cleanest records in
the family, one chart per page, no masthead, no wall.

It was then tried on the Guardian. The consent dialog blocked both Guardian articles, so the
article's HTML was fetched with `curl` and the interactive's own atom url dereferenced out of it:
`interactive.guim.co.uk/atoms/2024/01/uk-election-2024-westminster/`. `/default/`,
`/default/index.html` and `/default/v/<ts>/index.html` all 404; `/default/v/<ts>/main.html` returns
**200 and 72 529 bytes** — and harvested, it renders a **blank white page**. The atom is a fragment
that boots against its host, not a standalone document. **A newsroom's own embed url is not a chart
permalink**, and the difference is that a chart tool's permalink is a product and an atom is an
implementation detail.

### 4.3 `pdftotext` scrambles a multi-column poster, and it nearly put a false claim in this file

The FT Visual Vocabulary was read to answer "is the bullet in a newsroom's own doctrine". Extracted
with `pdftotext`, the text immediately following `Bullet` is *"Good for showing discrete values of
varying size across multiple categories (eg earthquakes by continent)"* — which describes a bar
chart, and which would have made a very quotable finding: the FT names the form and has lost its
purpose.

It is **wrong**. Rendered at 110 dpi with `pdftoppm` and looked at, the Bullet cell reads *"Good for
showing a measurement against the context of a target or performance range"*, and its icon is Few's
anatomy drawn correctly — grey track, dark measure bar, vertical tick. The extracted sentence
belongs to a different cell in a different column. **`METHOD.md` correction 6 is the rule that
caught it** — a number, or a quote, written before it is checked is the worst defect this corpus can
carry — and what did the checking was rendering the page and looking at it, which is runbook step 3
applied to a source that was never going to be harvested.

The poster is **not filed**. A poster icon is not a chart with data, and
`doctrine/references/reference-set.md`'s standing rule covers it.

### 4.4 Candidates refused in writing

| candidate | why not |
| --- | --- |
| FT Visual Vocabulary poster | teaching material; the bullet cell is an icon, not a chart with data. Cited in §0 as a reading, not harvested. |
| `en.wikipedia.org/wiki/Bullet_graph` | a redraw of Few's own specification figure. Not an independent publication — every tutorial in the search results is the same design author at one remove. |
| Datawrapper Academy / marketing pages | vendor documentation. The *charts* on them were harvested at their permalinks; the pages were not. |
| Tableau, Domo, Luzmo, Power BI, Datylon, Looker | vendor documentation. Ten searches returned little else. |
| `iea.org` chart library, `?type=bar` (590 charts), `?q=target` (47) | three harvested, all deleted: stacked columns and paired columns. The IEA library has **no bullet type** in its own filter (`column, line, pie, bar, area, range column, waterfall, scatter`). Correction 18's second archive does not cover this family. |
| `atlanticcouncil.org` NATO tracker | reached a treemap — and it is slide **"1 of 5"** of a carousel the harvester cannot click through. Correction 10's cousin: four unseen slides, and the tracker is exactly the kind of piece that would carry the form. **The best single lead a second wave has.** |
| `visualcapitalist.com/which-countries-meet-natos-spending-target/` | Cloudflare bot check. A site declining automated reading; not worked around, and Firecrawl not spent on a page whose form was never established. |

**Firecrawl was not used.** Nothing in this pool was a chart of the right form behind a wall a paid
route would have crossed.

### 4.5 A register was not proposed

There is nothing to register. Three of the six graphics are rasters whose lettering the style route
cannot read at all (ICAEW, both Statista), one has no pixel route (BBC), and the only fully readable
apparatus is Datawrapper's — **one publication**. `METHOD.md`'s §6.1 note from the boxplot harvest
applies verbatim and this family is a second instance of it: with an `img`, the record carries one
type reading, it looks complete, and it is a reading of the wrong document. The repair suggested
there — a `style.typeIsOfTheGraphic: false` flag — has since landed as `style.typeSource`, and it
works: all three raster records say *"the page only — the graphic is a raster and carries no type
this route can read"*, and all three notes quote no type.

---

## 5. Direction

### 5.1 `chart-tool-plate` — measured on `datawrapper-dwcdn-net-dig4f`

One reference, which is what a direction takes. It is the only record in this family whose apparatus
is fully measured on both routes, because it is the only one served as its own document.

```
ground         #FFFFFF   74.357 %
measure        #1D81A2   14.224 %      h 194.9°  chroma 0.522
target         #A1C4D7    7.034 %      h 201.1°  chroma 0.212
furniture      #F4F4F4 2.005 % (alternate row band), #D8D8D8 0.689 %, #181818 0.247 %
shape          sequential, 1 cluster at hue 195, 3 members, 21.28 % of the frame
type (Roboto, the graphic's own document — style.typeSource confirms it)
  22 / 700  rgb(0,0,0)         title
  14 / 400  rgb(24,24,24)      subtitle, which names the unit
  12 / 700  rgb(24,24,24)      row name
  12 / 400  rgb(24,24,24)      legend, row prose, axis, annotation
  11 / 400  rgb(136,136,136)   credit;  link rgb(0,136,204)
marks          stroke rgb(24,24,24) ×2  — the zero rule and the annotation's leader
measuredFrom   datawrapper-dwcdn-net-dig4f
```

**What makes it a whole rather than a palette.** One family, four sizes, and the ink steps down with
the size — black, near-black, near-black, grey — so importance is never carried by size alone. The
entire chromatic budget is **one hue at two chromas** and it is spent on the only distinction the
chart makes. The subtitle names the unit (`billions of Euros`) and the row labels carry the story in
prose, so the plate needs no caption. The one directed annotation goes to the **smallest** bar.

**What must not be taken from it.** The axis: fourteen ticks at half-billion intervals, every label
rounded to a whole billion, so it reads `0b 1b 1b 2b 2b 3b 3b 4b 4b 5b 5b 6b 6b 7b`. On a chart whose
argument is the size of an overrun, the axis cannot be read to better than a billion — and there are
no value labels on the marks to make up for it. That is a defect on the vendor's own example, and it
is the one thing in this direction a beat should do differently.

---

## 6. What a second wave should target

Not more searching. Three specific things:

1. **The Atlantic Council NATO tracker's four unseen carousel slides** — a click-through the
   harvester does not do, on the one piece in this pool whose subject guarantees a target.
2. **`ons.gov.uk/visualisations/dvcNNNN/figNN/` permalinks.** The ONS publishes progress-against-
   target figures at exactly the kind of clean url correction 18 recommends. No bullet figure id was
   known here and the search routes were exhausted before one could be found.
3. **`gh api search/code` for a Datawrapper bullet type id.** Newsrooms that version their chart
   metadata in public repos would expose real `dwcdn` ids for published bullet charts. Queries for
   `"d3-bars-bullet"` and `"bars-bullet"` both returned malformed JSON from the GitHub API and were
   not retried; the generic query returned 710 hits of library code and no published chart id. The
   idea is sound and was not pursued to the end.

And one thing a second wave should **not** do: look for a bullet chart on a news domain by keyword.
This wave established, three ways, that it is not there.
