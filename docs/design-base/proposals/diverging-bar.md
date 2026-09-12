# Proposal — the DIVERGING BAR family

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/` or `registers/`, and nothing has been rendered through the
engine. This family started from **zero references**.

**Family definition used:** bars growing in two directions from a shared zero or a shared centre.
Two sub-shapes were treated as one family — **signed**, one series straddling zero (net change, vote
margin, anomaly), and **back-to-back**, two groups mirrored about a centre.

**And two sub-shapes were deliberately EXCLUDED, because the corpus already has families for them.**
`references/population-pyramid/` and `references/diverging-stacked-bar/` both exist and were both
being harvested in this same wave. Age-sex pyramids and centred Likert stacks are theirs. Section 2
below records the five references this harvest reached that belong to them, with their urls, because
four of the five are not in the sibling's set and should not be lost.

**Provenance convention.** Every colour quoted is read from `record.pixel` on a record whose
`routes.pixel.measuredFrom === "graphic.png"`; all seven filed records satisfy that. Type is read
from `record.style.typeSource`, which is one of three answers and is quoted per reference:
`graphicFrame` on the three Datawrapper records (the graphic is an `iframe` and speaks for itself),
*the page which contains the graphic* on ONS and Our World in Data, and **the page ONLY, because the
graphic is a raster** on Ferdio and Statista — where no type claim is made about the graphic at all,
and the shapes of the lettering are recorded as "looked at". "Looked at" means a human read of a PNG
in the reference directory; it founds geometry and text and never a colour value.

---

## 1. Yield

| family | archive | drawn | harvested | survived looking | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| diverging-bar | url-list | 3 827 → 9 | 0 | 0 | 0 |
| diverging-bar | datavizproject | 100 | 1 | 1 | 1 |
| diverging-bar | search | 35 | 15 | 11 | 6 |
| diverging-bar | informationisbeautiful | 0 | 0 | 0 | 0 |
| diverging-bar | buried-signals | 0 | 0 | 0 | 0 |

"Drawn" for `search` counts 35 candidate urls: the 15 harvested plus 20 that were triaged by
screenshot first and rejected without being harvested (12 Datawrapper gallery charts that turned out
to be left-anchored bars, tables or box plots; 3 further ONS `dvc` figures; 2 IEA bar charts;
`climate.gov`, which answered **403 from CloudFront** and is a site declining automated reading;
`abs.gov.au`, whose pyramid sits behind a control; and `river.datawrapper.de`, a gallery landing
page). The pool file records every one with its reason.

**Seven filed, across five publications** — Ferdio, Datawrapper, the ONS, Our World in Data,
Statista. "Survived looking" counts a record that reached the piece's own graphic **and** that
graphic is this form.

Of the sixteen harvested, four never reached this form and are deleted:

| id | what the harvester actually photographed |
| --- | --- |
| `ec-europa-eu-eurostat-statistics-explained-index-php` | a raster **table** of dependency ratios, 5 333 px down the page |
| `datawrapper-de-zwzgi` | a real split bar — see below, it is not the form and it is instructive |
| `populationpyramid-net-australia-2025` | its graphic with a consent modal painted across the female half — **twice** |
| `statista-com-chart-36574-…-voluntary-redistricting` | three panels of ordinary columns, all positive |

And a fifth failure was repaired rather than deleted: the first harvest of
`ourworldindata.org/grapher/annual-change-forest-area` photographed a **line chart**, both routes
`ok`. See §4.

**The `zwzgi` deletion is worth keeping.** Datawrapper's *"Income gains for all, then only for top
earners"* has a domain that straddles zero — the bottom fifth's 1980–2009 gain is **−4 %** — and it
is drawn as two left-anchored split-bar columns. The −4 % row is a **label with no mark at all**.
That is precisely the failure `references/types/diverging-bar.md` exists to prevent, drawn by the
tool vendor whose gallery it came from, and it is the strongest argument in this harvest for the
form: a diverging domain drawn as a plain bar does not merely read badly, it silently loses the
value. It is not filed because it is not the form; the url is in the pool file.

**`populationpyramid.net` is `METHOD.md` correction 3 verbatim, and the record could not tell.**
`record.consent` is `null` on both attempts — the harvester found no button it recognised (the
"Tout accepter" control is inside the CMP's own frame), so nothing was clicked and nothing was
recorded, while a 300 px dialog sat over half the graphic. Both routes reported `ok`. Only looking
caught it, on both attempts, which is why it is deleted rather than filed with a caveat.

---

## 2. What was reached and handed to the sibling families

Five references reached a real graphic of this general shape and belong elsewhere in the corpus.
They are **not filed here** and their directories were removed rather than left as duplicates.

| url | form | family that owns it | already there? |
| --- | --- | --- | --- |
| `ons.gov.uk/visualisations/dvc550/pyramids/pyramids/index.html` | age-sex pyramid ×2 panels | `population-pyramid` | **yes**, same id |
| `ons.gov.uk/visualisations/dvc692/pyramids/pyramids.html` | age-sex pyramid, UK projection | `population-pyramid` | no |
| `ons.gov.uk/visualisations/dvc2226/figure_9/wrapper.html` | small-multiple pyramids with a **magenta stepped outline** for the comparison population | `population-pyramid` | no |
| `datawrapper.de/_/1vSJX/` | German population projection, green/purple split bar | `population-pyramid` | no |
| `pewresearch.org/global/2025/06/11/…/gap_2025_06_11_us-image-2025_01_06/` | 24-country centred Likert stack, navy vs two olives, region-grouped, median summary row | `diverging-stacked-bar` | no (that family has a different Pew chart) |

Two things in that list are worth a sibling's time. **ONS draws its pyramid's sides in opposite
orders on two different pieces** — `dvc550` and `dvc692` put Male left, `dvc2226` puts Female left —
so no side convention can be claimed for that desk. And **Pew's column headers ARE its legend**,
set in the series colours above the plate, with the `%` sign written on the first row only.

---

## 3. Treatments proposed for filing

Independence was read off the url host and then **checked by hand for the proxy problem the wave was
warned about**: five hosts, five distinct design authors, no shared studio, no re-publication of
another desk's plate, no wordmark from one appearing on another. `datawrapper.de` supplies three of
the seven records and counts **once**.

### `zero-rule-painted-over-the-bars` — imported

- evidence: `datawrapper-de-xfo0j` (datawrapper.de)
- evidence: `statista-com-chart-15723-…` (statista.com)
- evidence: `ourworldindata-org-grapher-annual-change-forest-area` (ourworldindata.org)
- detect: a vertical rule exists at the zero coordinate, spans the full plot height, and is painted
  after the bars

Three publications, three weights. Datawrapper draws a dark hairline the full height of the plot,
over both the `#F3F3F3` row tracks and the bars. Statista draws a dark rule the full height of each
of its two panels. Our World in Data draws a pale hairline and **nothing else** — no axis, no ticks,
no gridlines. In all three the rule is on top: a bar's fill never covers the line it grew from.

### `value-beyond-the-growing-tip-in-ink` — imported

- evidence: `statista-com-chart-15723-…` (statista.com)
- evidence: `ourworldindata-org-grapher-annual-change-forest-area` (ourworldindata.org)
- detect: every value label's anchor is beyond its bar's end, and its fill is the page ink, never the
  bar's fill

Statista puts `−63` and `+5` outside every tip in dark navy. Our World in Data puts
`-1.92 million ha` outside every tip in `rgb(91, 91, 91)`, and — the detail worth copying — puts the
**category name immediately in front of the value**, so `Brazil -1.92 million ha` travels outward
with the negative bar and `China` stays by the zero line with `1.94 million ha` beyond the tip. One
phrase, both directions, no second rule for negatives.

**With a third answer inside the third publication, which is why this treatment is stated as a
floor and not as a law.** Datawrapper flips: the label sits **inside** the fill in white when the bar
can hold it and outside in ink when it cannot (`0.5 %` in `xFO0J`, `0.3 %` in `d8VDj`, applied per
cell rather than per row). `references/types/diverging-bar.md` names only the ink-outside answer and
warns that a label in the bar's own accent hue has failed contrast here before. Datawrapper's inside
label is **white on the fill**, not the fill's hue on the ground, so it is not that failure — it is a
fourth position the doc does not describe. Worth naming before a renderer meets it.

### `sign-is-direction-and-hue-only-doubles-it` — imported

- evidence, one hue for both signs: `ons-gov-uk-visualisations-dvc1583-fig3-pi-index-html` (ons.gov.uk)
- evidence, one hue for both signs: `ourworldindata-org-grapher-annual-change-forest-area` (ourworldindata.org)
- evidence, one hue per sign: `statista-com-chart-15723-…` (statista.com)
- evidence, one hue per sign: `datawrapper-de-xfo0j` (datawrapper.de)
- detect: the zero rule is drawn, and the set of fills is either size 1 or size 2 with a 1-to-1 map
  onto `sign(value)` — never a fill that appears on both signs *and* a fill that does not

**Four publications, two answers, two each.** The ONS gives its cyan to `Factories` (+300) and to
`Warehouses` (−500) alike, spending its only other tone on the *aggregate* row rather than on a
sign. Our World in Data gives all four bars `#7088B0` at 16.461 % and the pixel route reads the
palette as **monochrome**. Statista and Datawrapper split by sign.

`references/types/diverging-bar.md` currently says *"Exactly two hues, one per sign"*. **Two of the
four publications that draw this form do not.** The condition that separates them is visible: the
one-hue charts have four bars and label every one of them; the two-hue charts have eight and sixteen
rows and one of Statista's two signs is rare. State the rule as *direction carries the sign; a
second hue is a redundancy you buy when the reader cannot hold the whole plate in one look* — not as
a cap.

### `the-two-sign-hues-are-warm-against-cool` — imported

- evidence: `statista-com-chart-15723-…` — `Loss` orange `#FF7D3B` / `Gain` teal (statista.com)
- evidence: `datawrapper-de-xfo0j` — `#D04F37` / `#2B668C` (datawrapper.de)
- detect: where two sign fills exist, they differ in warmth, and the pair is not red-with-green

Both desks that do split by sign pick **warm against cool**, and neither picks red against green.
This is the one claim in `references/types/diverging-bar.md` the corpus corroborates without
qualification. Statista names its two hues in an explicit legend (`Loss` / `Gain`) — the only legend
in the family — and Datawrapper leaves them to the row labels.

**One measurement gap, stated rather than smoothed.** Statista's `Gain` teal does not appear in the
record's top-ten chromatic entries at all: the gains are four short bars in sixteen rows. Its hue is
**looked at, not measured**, and no hex is quoted for it. The absence is itself the chart's subject.

### `the-side-names-sit-at-the-centre-and-are-the-legend` — imported

- evidence: `100-datavizproject-com-data-type-viz74` — `2004` | `2022` astride a short rule at the
  top of the axis (100.datavizproject.com)
- evidence: `datawrapper-de-mx3uv`, `datawrapper-de-d8vdj` — `Men Women` / `Women Men` astride the
  gutter (datawrapper.de)
- detect: in a back-to-back chart, the two group names are placed adjacent to the centre axis and no
  colour key exists anywhere on the plate

Adjacency does the legend's work. Ferdio goes one step further and puts the **category** names
(`SE`, `DK`, `NO`) in the same centre channel, which frees both outer edges for values and removes
the label column entirely — that part rests on Ferdio alone and is **not** proposed for filing;
the ONS pyramids handed to `population-pyramid` in §2 corroborate it, and that is the sibling's to
file.

### `time-orders-the-rows-when-the-category-is-a-date` — imported

- evidence: `datawrapper-de-xfo0j` — 2020 → 1992, reverse chronological (datawrapper.de)
- evidence: `statista-com-chart-15723-…` — 1962 → 2022, chronological (statista.com)
- detect: where the category is a date, row order follows the date and not `|value|`

`references/types/diverging-bar.md` says *"Sort categories by value, descending"*. Of the five
publications here, exactly one — Our World in Data — does. Two order by date. The ONS orders by
**hierarchy**, putting the aggregate row first and its three components under it. Sorting by value is
the right default for a flat comparison and it is wrong for the two shapes this family most often
carries: a time series of signed values, and a total with its parts.

---

## 4. Not proposed, and why

**`label-flips-inside-the-fill-when-it-fits` — one publication.** Datawrapper does it in all three of
its records; nobody else in this corpus does it at all. Real, and waiting.

**`accent-marks-the-row-not-the-side` — one publication.** `d8VDj` greys five of six rows and gives
`Bisexual` one violet **on both halves**, carrying the mute through to the category label's weight
and the value label's colour. `mX3uV`, from the same desk, does the opposite — it accents the argued
*side*, drawing men in a pale neutral the pixel route files as non-chromatic and women in the plate's
only saturated hue. Two good, opposite decisions, one publication between them.

**`the-centre-channel-carries-the-category-labels` — one publication** (Ferdio), see above.

**`the-plus-is-written` — one publication.** Statista writes `+5`, `+8`, `+3`. Our World in Data
writes the minus and omits the plus. Datawrapper writes **neither** — `xFO0J`'s margins are
`4.5 %`, `2.5 %`, `0.5 %`, unsigned on both sides of the zero, which puts the entire burden of sign
on direction and colour. `references/types/diverging-bar.md` asks for explicit `+`/`−`; one desk in
five obliges.

**`an-aggregate-must-not-look-like-a-category` — a defect, not a practice.** Our World in Data draws
`World` identically to Brazil and four times longer than it; a reader scanning for the largest loss
finds a total. The ONS does the opposite and gives its `Total Private Industrial` row the only dark
fill on the plate. That is one publication doing it right against one doing it wrong, which is not
evidence — it is a hypothesis, and it is the one I would spend the next wave testing.

---

## 5. Directions proposed

A direction needs one reference, being a coherent whole.

### `statista-chart-of-the-day` — from `statista-com-chart-15723-…`

Ground `#F5F9FC` (56.582 %) with the panels on a second near-white `#ECF1F7` (21.717 %), so the plot
separates from the plate with no border. Ink is a dark navy `#0F2741` (1.310 %), not black. Two
diverging panels side by side sharing one row index, one legend and — measured off the raster — one
length scale, with the panel WIDTH varying instead of the scale (≈2.48 px per seat in the House
panel, ≈2.3 in the Senate one, the gap being the antialiasing of an 8 px bar). Three
independent colour systems on one plate — sign (orange/teal), party (`#CF0203` / `#0C3D81`, on the
row label only), and neutral banding (`#9DB3BB`, `#CBD5DC`, `#DCE4EB`). A coloured keyline down the
left of the title block picks up the `Loss` hue. Headline as argument, deck as measure, CC badge and
wordmark in the footer. **Type is not measured** — the poster is a raster and
`style.typeSource` says so.

### `datawrapper-published-chart` — from `datawrapper-de-xfo0j` (with `mX3uV`, `d8VDj`)

White ground, a `#F3F3F3` full-width row track behind every bar on **both** sides of the zero (16.626 %
of the plate — the second-largest painted area, and what makes the centre legible without an axis).
Roboto throughout, from `graphicFrame`: 22/700 title, 15/400 subtitle, 13/400 labels, 13/700 for the
one thing that must stand out, 13/400 italic for the caveat, 11/400 source in `rgb(136, 136, 136)`.
Title states the finding, subtitle states the measure. No axis ticks; a directional caption instead
(`More votes for the Democratic candidate`). Annotations in ink in the empty half, with a curved
leader when they point at a row. An author credit and a `Get the data` link on the source line.

### `ons-embedded-fragment` — from `ons-gov-uk-visualisations-dvc1583-fig3-pi-index-html`

The chart's own `visualisations/dvcNNNN/…/index.html` document, carrying **no title, no unit, no
source and no caption** — all four are the parent article's job. One type tuple for the entire
document: Open Sans 14/400 in `rgb(0, 0, 0)`, category names and axis numbers identical in size,
weight and colour. Gridlines at every tick (`#E5E5E5` 1.104 %, `#CCCCCC` 0.657 %), zero among them
with no extra weight. Two tints of one hue, `#003C57` for the aggregate and `#27A0CC` for its
components. Nothing on the plate is typographically louder than anything else. **This is the
cleanest harvest target in the family and it is the least self-sufficient artifact** — the same
property produces both.

---

## 6. What the pool taught

**The url list holds nothing, and the reason is the form's vocabulary.** 3 827 lines;
`/diverging|divergent|butterfly|tornado|pyramid|swing/` returns nine, of which four are literal
tornadoes, one is a Portuguese outlet named *Divergente*, and four are US "swing state" pieces —
one of which, Reuters', is already recorded in this corpus as having no graphic outside the site's
chrome. `/population-pyramid|net-migration|anomaly|likert|winners-and-losers/` returns zero.
`METHOD.md` correction 2 in its sharpest form so far: **this form's own names are a landform, a
weather event and a shape of building.**

**`100.datavizproject.com` contains exactly one, and correction 16 predicts it exactly.** All 100
thumbnails were downloaded and looked at on four labelled 5×5 contact sheets (ninety seconds, four
Read calls, as the method now recommends). Ferdio's dataset is three countries at two dates and
**every one of the six changes is an increase** — 5→8, 4→10, 13→15 — so no bar among the hundred can
straddle zero. The only diverging construction the data permits is a back-to-back mirror of the two
dates, and Ferdio drew it twice: **#74** as arcs (filed) and **#45** as split semicircles, which is
an area encoding and belongs to the paired family. The brief's expectation that "this archive should
pay you well" was half right — it pays one, and the ceiling is the data's, not the archive's.

**A new discovery route, and it cost one curl.** With the WebSearch budget exhausted and `search.sh`
returning `[]`, the richest reference in this family was found by fetching **a publication's own
chart index and grepping the slugs for the form's vocabulary**:
`curl statista.com/chartoftheday/ | grep -oE 'href="/chart/[0-9]+/[a-z0-9-]+/"'` → eighteen
permalinks, one of them `…/the-neat-seat-loss-gain-by-the-presidents-party-…`. That is
correction 18's chart-permalink insight reached without a search engine: **where a desk publishes
one chart per url, its index is a form-searchable archive, because the slug is the title.** Statista,
Datawrapper, the ONS and Our World in Data all have one.

**An interactive's url can name a chart TYPE, and the bare url is a different chart.**
`ourworldindata.org/grapher/annual-change-forest-area` opens on a **world map**; the diverging bar is
`?tab=discrete-bar&time=2015`. The first harvest photographed the *line* tab, both routes `ok`,
`measuredFrom: "graphic.png"`, `nearTheTop: true` — a complete-looking record of the wrong chart.
This is a fifth costume for correction 1 and the first where the harvester was right about
everything: it found the piece's own graphic, and the piece has four. **For a Grapher-style url the
tab must be in the pool line**, and the record should be read as one state of an interactive rather
than as a fixed graphic.

**Three sibling families overlap this one, and a naive pool walks straight into them.** Eleven
harvested records reached a real diverging graphic; **five of them belonged to
`population-pyramid` or `diverging-stacked-bar`**, and one, `ons…/dvc550`, was already filed by the
sibling under a byte-identical id. The arithmetic guard would not have caught it —
`two-records-that-agree-exactly-are-both-wrong` exempts two records of the same page by design, for
the ProPublica case. Nothing in the corpus stops one form being filed twice under two family names;
only reading the sibling's directory does.

**Both search routes failed in ways that look like measurement.** `~/.claude/scripts/search.sh`
returned `{"results": []}` on all three attempts across ninety minutes, and `WebSearch` reported
`200 of 200` used mid-harvest. Each returns a well-formed empty answer. Everything after that point
was found by fetching known indexes directly, which is why §6's discovery route exists at all.

---

## 7. Guards

```
bun test skills/splash/test/a-record-names-its-route.test.ts \
         skills/splash/test/design-base-records-are-complete.test.ts \
         skills/splash/test/the-type-comes-from-the-document-the-graphic-is-in.test.ts \
         skills/splash/test/two-records-that-agree-exactly-are-both-wrong.test.ts
```

**12 pass, 1 fail, and the failure is not this family's** — `marimekko/iea-org-…-nitrogen-based-
fertiliser-consumpti` had no `NOTES.md` at the moment of the run, a sibling harvest still in flight.
No assertion in any of the four names `diverging-bar`. All seven records carry an archive, both
routes `ok`, `measuredFrom: "graphic.png"`, a `typeSource`, and the five required note sections.
