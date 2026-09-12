# Proposal — the streamgraph family

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/`, `registers/` or the code, and nothing has been rendered.

**Family definition used, and it is the whole difficulty:** a stacked composition over time with
**no fixed baseline** — the layers are displaced about a moving centre and the value is read as
band thickness. A stacked area pinned to zero is NOT in this family, however organic its top edge.
That test was applied to every candidate, and it is what disqualified most of them.

Harvested 2026-09-08. Five records filed, from **three independent publications** (see §2 —
the guard would count four hosts, and four would be wrong).

---

# 0. The five records

| record | publication | what it is | routes |
| --- | --- | --- | --- |
| `100-datavizproject-com-data-type-viz42` | Ferdio | "a sorted stream graph", 3 countries, 2 dates | style ok · pixel ok on `graphic.png` |
| `archive-nytimes-com-screenshots-…-REVENUE_GRAPHIC` | NYT / Byron | *The Ebb and Flow of Movies*, 1986–2008 | style **not-applicable** · pixel ok on `graphic.png` |
| `leebyron-com-streamgraph` | NYT / Byron | the InfoVis 2008 paper's own figure | style ok · pixel ok on `graphic.png` |
| `gds-odsss-github-io-unhcr-dataviz-platform-…-streamgraph` | UNHCR | persons of concern, 6 categories, 1991–2020 | style ok · pixel ok on `graphic.png` |
| `unhcr-github-io-dataviz-streamgraph-explorer` | UNHCR | origins/destinations mirrored, 1951–2016 | style ok · pixel ok on `graphic.png` |

All five report `routes.pixel.measuredFrom: "graphic.png"`; none is `screenshot.png` and none is
`not-applicable`. All five carry `style.graphic.nearTheTop: true`. No record in this family carries
a `graphicFrame`. Every colour quoted anywhere in this file or in the five notes comes from that
record's own `pixel` block; no hex is quoted that its own `measured.json` does not hold.

**Two records need their state declared out loud before anything is built on them.**

1. **`archive-nytimes-…` was measured on a photograph of a whole page**, not on a clipped chart. The
   plate contains the 2008 masthead, the section nav, the footer and a third-party advertisement;
   `#418CD5` at 0.23 % is that advertisement, not the piece. This is the precedent `METHOD.md`
   correction 11 set for the SCMP record ("measured on the page, which its note now states"). The
   four warm ramp entries quoted from it are the chart — they are the only warm family on the page —
   and nothing else from its palette is used.
2. **`archive-nytimes-…`'s style route was corrected by hand.** The url is a bare JPEG served as its
   own document; it has no text nodes, so the harvester returned `state: "ok"` on an empty type
   list, which `a-record-names-its-route` refuses and should refuse. It now reads
   `not-applicable` with its reason. Everything said about that piece's typography is **read off the
   image**, and the note says so. No number was invented.

---

# 1. What was thrown away, and why it matters more than usual here

Fourteen references were harvested. **Five survived looking.** The nine that did not are listed
because the failures are the finding:

| candidate | what the harvester actually reached |
| --- | --- |
| `informationisbeautiful.net/…/mountains-out-of-molehills` | a real graphic, and **not this form** — three tiers of overlapping areas, each on its own flat baseline |
| `engaging-data.com/baby-name-visualizer` | a real graphic, and **not this form** — Baby-Name-Voyager stacked area, y axis `0 → 1.0M`, bottom edge pinned flat at zero |
| `pudding.cool/2023/10/genre` | a ranked list behind "Click to continue"; the chart is one click away and there is no evidence it is a streamgraph |
| `pudding.cool/projects/music-history` | the hero title card |
| `research.google.com/bigpicture/music` | the Big Picture landing illustration (a drawing of a girl and a kite) |
| `bewitched.com/live-vis.html` | a bubble cloud of country names |
| `baby-names.jetpack.ai` | an entry screen reading `TYPE A NAME` |
| `flowingdata.com/2009/08/10/…` | a Cloudflare "Vérification de sécurité" bot check |
| `randalolson.com/2014/10/26/the-ebb-and-flow-of-movies-redux` | **the wrong figure on the right page** — the post's 752 × 467 line chart, while its three real streamgraphs are 605 px wide `<img>`s further down |

Two of these are worth carrying forward as method, not as bookkeeping.

**The stacked area is the dominant false positive for this family, and it is not a harvesting bug.**
Two of the nine reached a genuine, well-made, published chart of *almost* this form and were
refused on the baseline test alone. Both were reached by searches whose sources called them
streamgraphs. Anything the next wave draws from a keyword will be roughly half stacked areas, and
only step 3 can tell.

**The Olson miss is a bounded harvester improvement.** `largestGraphic` picks the biggest painted
graphic above a floor; on a blog post with several figures the biggest is not the one the post is
about. Nothing else on that page is a streamgraph and the record was deleted rather than filed as
one. The three real figures are at
`randalolson.com/assets/2014/10/ebb-flow-{top-10-5-years,2014-movies,2013-movies}-*.png` and one of
them was looked at outside the corpus: it is a genuine streamgraph, drawn with RAW-engine defaults,
with a lightness ramp on total sales and **zero labels of any kind**. It is not filed, because
pointing the harvester at a bare image url produces a record whose style route has nothing to read.

---

# 2. Counting publications honestly, and where the guard would get it wrong

`design-base-records-are-complete` reads independence off each cited record's **url host**. On this
family that arithmetic over-counts, twice:

- `leebyron.com` and `archive.nytimes.com` are two hosts and **one voice**. Lee Byron is an author
  of the NYT box-office chart and the first author of the paper whose figure the other record is.
  The paper's own page says so: the Times chart "was based on a similar visualization, developed by
  the first author".
- `gds-odsss.github.io` and `unhcr.github.io` are two hosts and **one publisher**. Both are UNHCR.

So: **three publications, not five and not four.**

| P | publication | records |
| --- | --- | --- |
| P1 | Ferdio | `100-datavizproject-com-data-type-viz42` |
| P2 | Lee Byron / The New York Times | `leebyron-com-streamgraph`, `archive-nytimes-com-screenshots-…` |
| P3 | UNHCR | `gds-odsss-github-io-…`, `unhcr-github-io-dataviz-streamgraph-explorer` |

Every evidence line below is counted against P1/P2/P3, not against hosts. **If a treatment is filed
from this proposal, the parent should check that the guard's host arithmetic and this table agree
before trusting a green test.** Two of the treatments below would pass the guard on host count and
fail on the honest count; they are marked `NOT FILED` for exactly that reason.

---

# 3. Treatments proposed — `imported`

## 3.1 `label-inside-the-band-at-its-thickest-interior-point` — FILE

- kind: `imported`
- evidence: `100-datavizproject-com-data-type-viz42` (P1)
- evidence: `archive-nytimes-com-screenshots-www-nytimes-com-interactive-2008-02-23` (P2)
- evidence: `unhcr-github-io-dataviz-streamgraph-explorer` (P3)

**Three independent publications, all three of them, and none of them uses a legend for the series.**

- Ferdio: `SE`, `DK`, `NO` in white, mid-band, mid-run.
- NYT: `• Transformers`, `• Ratatouille`, `• I Am Legend` in a small serif on the fill, each with a
  leader dot, each at that film's own peak week.
- UNHCR Explorer: `Afghanistan` at its 1980s–90s bulge, `Iraq` after 2003, `Colombia` and
  `Syrian Arab Rep.` at the right-hand end where they are widest — **and independently in both the
  origins and the destinations stack**, at whichever point each stack's band is fattest.

None of the three ever places a label at the first or last step. This is the practice the
chart-beat type reference already asserts (`references/types/streamgraph.md`, "The one thing that
goes wrong") and it now has three desks behind it instead of an assertion.

## 3.2 `no-value-axis-under-a-free-baseline` — FILE

- kind: `imported`
- evidence: `100-datavizproject-com-data-type-viz42` (P1)
- evidence: `archive-nytimes-com-screenshots-www-nytimes-com-interactive-2008-02-23` (P2)

Two independent publications draw no y-axis at all, and each replaces it with something better
suited to a form that has no origin:

- **Ferdio prints the value at both ends, outside the stack, level with each band** — `13 / 5 / 4`
  on the left, `15 / 10 / 8` on the right, in grey, outside the two date rules.
- **The Times spends a legend on prose instead**: *"Height shows weekly box office revenue"* —
  *"Width shows longevity"* — *"The area of the shape (and its color) corresponds to the film's
  total domestic gross"*.

**And the corpus carries its own counter-example, which is why this should be filed rather than
assumed.** `gds-odsss-github-io-…` (P3) kept a value axis over a centred offset and its ticks read
`60M · 40M · 20M · 0 · −20M · −40M · −60M`. Five of those seven labels describe a negative number of
displaced people. The axis is not merely useless under a free baseline; it prints falsehoods.

A `detect` is also available for this one — *if the stack offset is not zero-baseline, no value axis
is rendered* — so the parent may prefer to file it as `derived` and cite the two publications in
prose. Either kind is defensible; it is proposed as `imported` because two desks demonstrably do it.

## 3.3 `time-is-the-only-scaffold` — FILE, weakly

- kind: `imported`
- evidence: `100-datavizproject-com-data-type-viz42` (P1)
- evidence: `gds-odsss-github-io-unhcr-dataviz-platform-tools-d3-d3-streamgraph-htm` (P3)

Vertical rules and nothing horizontal. Ferdio draws exactly two verticals, one per date; UNHCR draws
faint verticals every five years — the near-whites `#F4F4F4` 1.17 %, `#E3E3E3` 0.35 % and `#ECECEC`
0.25 % in that record's own `pixel.neutral` — and no horizontal gridline anywhere. The NYT plate
(P2) has no gridlines at all, which does not contradict it.

Weak because it is close to a corollary of 3.2 — there is nothing to hang a horizontal gridline on
once the axis is gone. Filed separately or folded into 3.2 at the parent's discretion.

## 3.4 `colour-carries-a-second-quantity` — **NOT FILED**, one publication

- kind: `imported`
- evidence: `archive-nytimes-com-screenshots-…` (P2) — a `$862M → 250 → 100 → 25 → 1` ramp, pale gold
  to dark red, keyed to each film's TOTAL gross while thickness carries the weekly one. Measured on
  the plate: `#FCDCAB` 0.27 %, `#F5BE63` 1.99 %, `#BB7B62` 3.22 %, `#BB5137` 0.98 %.
- evidence: `leebyron-com-streamgraph` (P2) — one hue, many values; the pixel route calls the shape
  `sequential`, `#B3BCE4` 4.56 % down to `#52556A` 4.21 %.

**Both records are P2. The floor refuses this, and the floor is right** — this is one designer's
answer, twice. It is real, it is the single most load-bearing idea in the family (it is what makes
7 500 bands survivable), and it needs a second desk. Randal Olson's redux does the same thing
(darker blue = more total sales) and could not be filed; that is the nearest thing to a second
publication anyone has found.

## 3.5 `a-ranked-read-out-panel-keyed-by-the-band-colour` — **NOT FILED**, one publication

- kind: `imported`
- evidence: `unhcr-github-io-dataviz-streamgraph-explorer` (P3)

The strongest single mechanism in this harvest, and it rests on one desk. Right of the plate:
`Selected year 2016` at Lato 56, `Total from origins to destinations 67,635,713`, then twenty rows —
`Syrian Arab Rep.: 12,642,995`, `Colombia: 7,734,617`, `Iraq: 5,611,517` … — each with a bar behind
the text **in that country's own band colour**, length proportional to the value. One column is
simultaneously the legend, a bar chart and the exact figure.

The Times answers the same need differently, with a `Find Movie` search box. Two publications, two
mechanisms, one problem — which is not enough to file either as a practice.

## 3.6 `the-residual-category-has-no-hue` — **NOT FILED**, one publication

- kind: `imported`
- evidence: `gds-odsss-github-io-…` (P3) — "Others of concern" is the only one of six bands with no
  hue (`#9A9A9A`, filed by the route as neutral); the five named categories take
  `#0072BC`, `#18375F`, `#00B398`, `#E1CC0D`, `#EF4A60`.

Colour spent on the categories with a name worth carrying, withheld from the bucket. One desk.

## 3.7 `a-legend-that-names-what-each-geometry-means` — **NOT FILED**, one publication

- kind: `imported`
- evidence: `archive-nytimes-com-screenshots-…` (P2) — four properties, four sentences: height,
  width, area, colour.

## 3.8 `uniform-lightness-so-every-band-holds-dark-text` — **NOT FILED**, one publication

- kind: `imported`
- evidence: `unhcr-github-io-dataviz-streamgraph-explorer` (P3) — `#FE9DBD`, `#E4B276`, `#33CAF7`,
  `#D1ADF3`, `#F89FCD`, `#7CCC98`, `#D1BA71`: hue rotates freely, lightness barely moves, no band is
  dark. It is the structural way to guarantee the accessibility trap in §5 can never fire, and it
  costs distinguishability at a distance. One desk, and the only one in the corpus whose palette the
  pixel route calls `categorical`.

---

# 4. Treatments proposed — `derived`

Each owes a `detect` and a `provenBy`. **No render was made here** — the runbook's steps 6 and 7 are
the parent's, and `provenBy` is left as owed rather than invented.

## 4.1 `label-at-the-thickest-interior-step`

- kind: `derived`
- the fact the beat carries: the stacked geometry knows, per series, the step at which that band is
  thickest.
- detect: for every series label, its x lies strictly between the first and last step, **and** at
  that series' `argmax` thickness.
- provenBy: owed.
- corroborated in passing by 3.1, which is the imported half of the same idea. The derived half is
  what makes it checkable rather than a habit.

## 4.2 `ink-measured-against-the-band-it-sits-on`

- kind: `derived`
- the fact the beat carries: the fill under each label is known exactly, because the beat drew it.
- detect: every in-band label's contrast against **its own fill** is ≥ 4.5:1; the choice between
  light and dark ink is made per band from that measurement, never from a single brightness
  threshold applied across the palette.
- provenBy: owed.
- `skills/chart-beat/references/types/streamgraph.md` records a shipped failure of exactly this —
  white text chosen by a naive brightness rule, landing on a mid-toned green band, under the floor.
  **No reference in this corpus proves the fix**; UNHCR's uniform-lightness palette (3.8) makes the
  question moot rather than answering it, and Ferdio never has to choose because all three of its
  fills happen to be dark. This is a rule the corpus should own rather than import.

## 4.3 `value-order-is-draw-order-so-a-crossing-shows`

- kind: `derived`
- the fact the beat carries: at every step the series have a rank, and the beat knows whether two
  ranks swap anywhere in the span.
- detect: the drawn layer order at each step equals the value order at that step; and when a swap
  exists in the data, it is visible in the drawing.
- provenBy: owed.
- Ferdio's `#42` is what the treatment looks like drawn — the red `DK` ribbon climbs over the navy
  `NO` one mid-span, which is one of the two stories that page tags itself with. A fixed layer order
  would have hidden it. Cited as illustration, not as evidence: this is one publication, and a
  derived treatment does not need one.

## 4.4 `series-capped-and-the-remainder-named`

- kind: `derived`
- the fact the beat carries: the number of series, and their values.
- detect: when the series count exceeds the type's limit, the tail is folded into ONE named residual
  band rather than dropped or drawn; the residual is drawn without a hue.
- provenBy: owed.
- The type reference's `<!-- limit: series > 7 -->` states the cap and not the remedy. Dropping the
  tail changes the total, which is the one quantity this form actually states well.

---

# 5. What the pool taught, against what the tree already believed

`skills/chart-beat/references/types/streamgraph.md` was read first. Three of its claims are
corroborated by this harvest, and **two are contradicted by two of the three publications**.

**Corroborated.**
- "Every in-band label has to state its value directly, INSIDE the band … and it can only do that
  honestly at an INTERIOR point, never right at either end." Three publications, three for three.
- "A streamgraph with no in-band labels at all is a chart of pure impression with no way back to a
  number." `leebyron-com-streamgraph` is that chart, and it is unreadable as data by design.
- The accessibility trap is real and unproven here. See 4.2.

**Contradicted — "Colour is categorical, one hue per series."** Two of the three publications do
the opposite. The Times keys colour to a *second quantity* on a sequential ramp; the paper's own
figure is a single hue in many values, and the pixel route independently classifies it as
`sequential`. Only UNHCR is categorical. The honest rule is conditional: **colour is categorical
when the series have names a reader will look for, and sequential when there are more bands than
names a reader can hold** — and the second case is what the form was invented for.

**Contradicted — "capped near seven … beyond that, individual bands stop being visually separable
regardless of how carefully they're coloured."** The Times draws ~7 500 bands and the UNHCR Explorer
draws well over twenty per stack, and both are legible, because neither is asking the reader to
separate individual bands by hue. They scale by two other means: a ramp that groups by tone (P2),
and **a label whose size scales with its band**, so the long tail degrades into texture instead of
disappearing (P3). The cap holds *for the categorical case*, which is where it should be written.

**A fourth thing the pool taught, which the type reference does not mention at all.** Every one of
the three publications answers the "no way back to a number" problem with a distinct, deliberate
mechanism placed OUTSIDE the drawing: end labels outside the stack (P1), a search box and a prose
legend (P2), a ranked read-out panel keyed by band colour (P3). None of them tries to solve it
inside the plot. That looks like the family's central design decision, and none of the three
mechanisms yet has two desks behind it.

---

# 6. Directions proposed

A direction needs one reference, being a coherent whole.

## 6.1 `unhcr-streamgraph-explorer` — propose

- measuredFrom: `unhcr-github-io-dataviz-streamgraph-explorer`
- White ground at 76.16 %. A **uniform-lightness pastel categorical set** — `#FE9DBD`, `#E4B276`,
  `#33CAF7`, `#D1ADF3`, `#F89FCD`, `#7CCC98`, `#D1BA71` — no dark band, no saturated band. Grey
  `#808080` at 1.85 % for a total strip drawn once outside both stacks; near-white `#DDDDDD` /
  `#ECECEC` / `#E4E4E4` for five-year verticals; near-black `#010101` at 0.56 % for the single year
  cursor, the only saturated mark on the plate.
- Lato throughout, one family at six sizes: `14/400` for filter labels and in-band names (84 of
  them), `18.2/400` for the read-out rows, `20.2/400` for the year row, `21/700 uppercase` for
  `ORIGINS` and `DESTINATIONS`, `16/700` in UNHCR blue `rgb(0,114,188)` for panel headings, and
  `56/400 uppercase` for the selected year. **The largest type on the page is the number the chart
  cannot state.**
- The whole: two mirrored stacks about one shared time axis with the year labels in the gutter, and
  the exact numbers exiled to a column at the right.

## 6.2 `ebb-and-flow` — propose, with its measurement caveat

- measuredFrom: `archive-nytimes-com-screenshots-www-nytimes-com-interactive-2008-02-23`
- White ground (65.27 %, diluted by page chrome — see §0). A **warm sequential ramp** on a second
  quantity: `#FCDCAB` → `#F5BE63` → `#BB7B62` → `#BB5137`. No categorical palette, no axis, no
  gridline; a row of month names with the year set larger and greyer beneath the January boundary.
  Serif in-band labels with leader dots, on a small minority of bands.
- **The caveat is load-bearing**: this direction is measured on a photograph of a whole 2008 web
  page. The ramp is the piece; the ground share and everything neutral are the page. A parent
  filing this should carry that sentence with it.

## 6.3 `ferdio-42` — propose, weakly

- measuredFrom: `100-datavizproject-com-data-type-viz42`
- `#FFFFFF` at 82.49 % — three ribbons on a very empty field. `#3274D8` 8.75 %, `#EE5440` 4.37 %,
  `#283250` 2.82 % (the last is a MARK, the `NO` band, and the pixel route files it under `neutral`;
  a reader of that record should not mistake it for furniture). Genuine furniture is two steps of
  near-white and a grey for the date rules and the six end numbers.
- Weak as a direction because two time steps is not a temporal reading, and because a gapped
  three-ribbon plate does not generalise to the ten-band case the form exists for.

---

# 7. Yield

| family | archive | drawn | harvested | survived reading | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| streamgraph | datavizproject | 1 | 1 | 1 | 1 |
| streamgraph | informationisbeautiful | 1 | 1 | 0 | 0 |
| streamgraph | url-list | 12 | 12 | 4 | 4 |

**datavizproject: 1 drawn out of 100 pages read.** All 100 `viz` pages were fetched and their own
descriptive sentence read, which is how that archive names its form. Exactly one — `viz42`, "a
sorted stream graph" — draws this family. `viz29` ("area chart with overlapping areas"), `viz16`
("3D area graph") and `viz62` ("combined tree map and area chart") were checked and rejected on the
baseline test. **The seventy unharvested pages contain no second streamgraph**, and the next family
to draw from this archive can take that as read: the form appears once in a hundred.

**informationisbeautiful: 1 drawn, 0 survived.** `mountains-out-of-molehills` is the only piece on
that site with a plausible claim to the form, and it is not one — three tiers of overlapping areas
on three flat baselines. `METHOD.md` correction 8 records a previous wave calling an IIB piece "a
stream graph" while looking for maps; if it was this one, that judgement should be revised.

**url-list: 12 drawn, 4 survived — a yield of 1 in 3**, exactly the rate the log already records for
news domains, but reached by a different failure profile: only one of the eight losses was a wall
(flowingdata's Cloudflare check). The rest were the harvester reaching a real thing that was the
wrong thing, and two of them were real charts of the neighbouring form.

## What the pool taught about the pool

**There is almost no editorial streamgraph on the open web.** This was searched hard — roughly a
dozen `search.sh` queries (SearXNG began returning empty result sets partway through and the sweep
moved to `WebSearch`), seven `WebSearch` queries in English and German, and a delegated search
agent that returned nineteen candidates. A domain-restricted sweep of sixteen openly-publishing
desks was attempted and refused: the search tool declined eight of the sixteen hosts outright. The
delegated agent's own conclusion is worth recording: *"the only live editorial pieces found were the
UNHCR refugee visualization and Randal Olson's box office analysis — formal streamgraph journalism
is rare."* Sixteen of its nineteen candidates were library demos, Observable notebooks, bl.ocks
gists and CodePens.

Three structural reasons, all visible in what survived:

1. **The canonical piece is dead.** *The Ebb and Flow of Movies* is Flash; the NYT archive's own
   capsule metadata says `"hasFlash": true`. The form's most famous artifact can only be read as a
   photograph, and only because the publisher archived one.
2. **The form is mostly a demo.** Both UNHCR records and the Byron record are the form being
   *shown*, not the form being *used to say something*. Only the Times record is a piece of
   journalism, and it is eighteen years old.
3. **The neighbouring form ate the use case.** Two of the strongest candidates — Baby Name Voyager
   and IIB's media-fears timeline — are the same subject, the same era, the same organic look, on a
   fixed baseline. Desks that wanted this read appear to have chosen the stacked area.

**What a second wave should target**, therefore, is not more streamgraphs — it is a **fourth
publication** that does one specific thing, and there are three worth naming:
a desk that is not Byron/NYT keying colour to a second quantity (3.4);
a desk that is not UNHCR putting the numbers in a ranked panel beside the plot (3.5);
and a desk that is not UNHCR proving the in-band label ink was contrast-checked (4.2), which is the
one failure this form has actually shipped in production.

Three culture and music desks were tried and none paid: The Pudding's genre piece puts its chart
behind a click, its music-history project behind a title card, and Google's Music Timeline no longer
serves a chart at `research.google.com/bigpicture/music`.
