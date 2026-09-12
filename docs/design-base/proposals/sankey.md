# Proposal — the sankey / alluvial family

Written 2026-09-08 by the sankey harvest, for the parent to integrate. **Nothing here has been
filed**: `treatments/`, `directions/`, `registers/`, `METHOD.md` and the indexes were not touched.
The family started from zero references.

Family: a quantity that **splits and recombines as it moves through stages**, drawn as ribbons whose
thickness is the amount and whose ends are nodes. Corpus: `docs/design-base/references/sankey/`,
**seven records, five publications**, all seven measured on their own graphic
(`routes.pixel.measuredFrom === "graphic.png"`), all seven confirmed by eye.

| id | publication | what it is |
| --- | --- | --- |
| `100-datavizproject-com-data-type-viz42` | 100.datavizproject.com (Ferdio) | two-stage alluvial, separated ribbons, one crossing |
| `100-datavizproject-com-data-type-viz8` | 100.datavizproject.com (Ferdio) | the same data stacked flush, so the total is the subject |
| `100-datavizproject-com-data-type-viz44` | 100.datavizproject.com (Ferdio) | the same data in isometric 3D — the family's counter-example |
| `iea-org-data-and-statistics-data-tools-energy-sankey` | iea.org | world energy balance, ~40 nodes, 5 columns, 12 hues |
| `flowcharts-llnl-gov` | flowcharts.llnl.gov | the LLNL US energy flow chart, 2024 |
| `interactive-carbonbrief-org-carbon-offsets-2023-companies-html` | Carbon Brief | 40 companies × 60 countries, every ribbon neutral |
| `ec-europa-eu-eurostat-cache-sankey-energy-sankey-html` | ec.europa.eu (Eurostat) | the EU energy balance tool — **pixel record contaminated, see §5** |

---

## 1. The yield, for `METHOD.md`'s log

| family | archive | drawn | harvested | survived reading | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| sankey | datavizproject | 100 | 3 | 3 | 3 |
| sankey | url-list | 8 | 8 | 4 | 4 |

Pool file: `…/scratchpad/pools/sankey.txt`, rewritten per wave and never shared. Every one of the
seven filed directories was checked back against a url this harvest actually drew; none is foreign.

**Two things about that table need saying before anyone reads it as a quality measure.**

**The `url-list` row is not the url list.** `~/Downloads/infoviz-source-urls-alive.txt` was checked
first and contains **zero** matches for `sankey` and **zero** for `alluvial` across 3 827 urls. Its
ten `flow` matches are `webflow.com`, `flowingdata.com`, `socialflow` tracking parameters, Texas
wildflowers and a Washington Post piece about roses. That is correction 2 restated in this family's
own numbers: **a keyword selects a subject and this form has no subject.** The eight urls in that
row were found by web search and are stamped `url-list` because the harvester's `--archive` enum
admits four values and none of them is "found by searching". The stamp is the least wrong of four
options and a reader should know it.

**Eight urls, nine harvest runs.**
`carbonbrief.org/interactive-how-climate-finance-flows-around-the-world` was harvested twice, into
the same record directory, and deleted twice — see §5. The `harvested` column counts records, not
runs.

## 2. What the pool taught

**`100.datavizproject.com` is indexed by form and its index does not have this form in it.** The
site's own taxonomy is `shape-bar | circle | line | dot | rectangle | area | 3d | polygon | symbol`
and `property-length | position | amount | size`. There is no `shape-flow`, no `shape-ribbon`. A
sankey filed under `shape-area` sits beside a stacked area chart and a mountain-range chart, and
`shape-polygon` holds triangles. **So even the one archive indexed by form could not be queried for
this one.**

What worked instead: all 100 thumbnails were downloaded and read as four labelled 5 × 5 contact
sheets. Three of the hundred draw proportional-thickness ribbons between stage columns — `#8`, `#42`
and `#44`. Three more were looked at and **refused with a reason**: `#53` is three funnels (one flow,
one stage pair, no split), `#36` is a bar-comparison table with a decorative gradient bridge, `#29`
is a stacked area between two dates. Refusing them by eye took about ninety seconds and is the
cheapest step in this whole runbook.

**Where the second publication came from.** Energy, and it is not a coincidence. This form is the
native shape of an energy balance — everything in equals everything out, at every stage — so the
institutions that publish energy balances publish sankeys as their primary artifact and keep them
open: IEA, Eurostat, LLNL. Carbon Brief is the one newsroom-shaped publication in the family and it
reached its graphic on the piece where the sankey is the article. **The desks that publish this form
openly are agencies, not newspapers**, which is the opposite of the map family's problem and worth
recording for the next wave.

**Bot checks: none.** Consent dialogs: none dismissed (`record.consent` is `null` on all seven).
Firecrawl: **not used**, no credits spent.

## 3. Treatments to file — `imported`

Six, each with two or more independent publications read off the url host.

### 3.1 `node-label-carries-its-own-total`

```
kind      imported
name      A node names itself and its own quantity, in one register, in the same text run
applies   the beat draws flows between named nodes
draws     annotation
detect    every node mark in the diagram has a text run within one line-height of it that contains
          at least one numeral, and all such runs share one (family, size, weight) tuple
evidence  interactive-carbonbrief-org-carbon-offsets-2023-companies-html
evidence  ec-europa-eu-eurostat-cache-sankey-energy-sankey-html
evidence  flowcharts-llnl-gov
evidence  100-datavizproject-com-data-type-viz42
```

**Four publications**: Carbon Brief, Eurostat, LLNL, Ferdio. This is the most heavily evidenced
thing the family has, and it is heavily evidenced because a sankey **has no axis**. There is nowhere
else for a number to go.

Four different syntaxes, one rule: `Chevron (6,019m)` (Carbon Brief, in parentheses after the name);
`Imports` over `1 187 770 KTOE` (Eurostat, on two lines with the unit repeated); `Nuclear` over
`8.17` reversed out of the node's own fill (LLNL); `13` set outside the ribbon end against the stage
rule (Ferdio). The variation is in where, never in whether.

**And the register is flat.** Carbon Brief holds **394 tuples** of `PT Sans Narrow | 12 | 400` in
`rgb(51, 51, 51)` — one treatment for a node worth 9 607 m and for one worth `< 0.001m`. Eurostat
holds **40 tuples** of `Arial | 10.6 | 400` in `rgb(33, 37, 41)`, likewise flat. Two desks
independently refuse to rank nodes by type size, because the bar already ranks them.

### 3.2 `smallest-flow-is-drawn-and-labelled-not-dropped`

```
kind      imported
name      A flow too small to see is still drawn, still named, and its value written rather than
          rounded to zero or folded into "other"
applies   the beat draws flows AND at least one link is under 1 % of the largest
draws     geometry, annotation
detect    the number of link marks equals the number of links in the data, and every node with a
          drawn mark has a label
evidence  iea-org-data-and-statistics-data-tools-energy-sankey
evidence  interactive-carbonbrief-org-carbon-offsets-2023-companies-html
evidence  ec-europa-eu-eurostat-cache-sankey-energy-sankey-html
```

**Three publications.** The reason is arithmetic rather than taste, and it is the one rule in this
family that follows from what the form promises: **every node balances**, so a flow deleted for
being small breaks the promise invisibly. A reader has no way to audit a sankey by looking, so the
only protection is that nothing was dropped.

What the three do instead of dropping: IEA adds a **third type size** for them — the record carries
`Graphik | 9 | 400`, three occurrences, sampled on `Electricity imports`, under the node register's
own 10.4. Carbon Brief writes `< 0.001m` and draws a one-pixel tick. Eurostat draws
`Stock build 4 347 KTOE` as a hairline beside a `Final consumption` pipe two hundred pixels thick.

### 3.3 `ribbons-drawn-translucent`

```
kind      imported
name      Flow ribbons are drawn at partial alpha so a crossing reads as density rather than as a
          draw order
applies   the beat draws flows AND any two links cross
draws     geometry
detect    every link mark's fill or stroke has an alpha strictly below 1
evidence  iea-org-data-and-statistics-data-tools-energy-sankey
evidence  interactive-carbonbrief-org-carbon-offsets-2023-companies-html
```

**Two publications**, and both are measured in `record.style.marks` rather than inferred.

IEA: **every** ribbon fill is at 0.6 — `rgba(177, 177, 177, 0.6)` ×24, `rgba(73, 211, 255, 0.6)` ×22,
`rgba(255, 183, 67, 0.6)` ×22, `rgba(0, 173, 161, 0.6)` ×20, `rgba(99, 99, 99, 0.6)` ×16,
`rgba(255, 244, 90, 0.6)` ×12, `rgba(255, 117, 75, 0.6)` ×11, plus a second set of five at **0.25**
which is the same palette dimmed for the faint background flows.

Carbon Brief: `stroke rgba(0, 0, 0, 0.2)` ×**343** — every ribbon in the diagram, as a translucent
black stroke rather than a fill.

**Why it matters and not just how it looks.** An opaque ribbon makes the truth of a crossing depend
on which link was drawn last. LLNL is the control: its pipes are opaque, and at the left edge seven
thin flows run the whole width of the chart with one simply covering another. It survives only
because their hues differ.

### 3.4 `stage-named-above-its-own-column`

```
kind      imported
name      Each stage of the flow is named once, above its own column, in a lighter register than
          the node labels
applies   the beat draws flows through two or more explicit stages
draws     furniture
detect    for each stage column there is a text run horizontally within the column's extent and
          above its topmost node, and those runs share a register distinct from the node labels
evidence  iea-org-data-and-statistics-data-tools-energy-sankey
evidence  100-datavizproject-com-data-type-viz42
```

**Two publications.** IEA sets `Final consumption` and `Transformation` over their columns; Ferdio
sets `2004` and `2022` over the two rules. Two words of furniture stand in for the axis this form
cannot have. `100-datavizproject-com-data-type-viz8` does the same thing vertically and would be a
third record from the same publication, so it is not cited.

### 3.5 `source-hue-travels-through-every-stage`

```
kind      imported
name      A flow keeps the colour of where it came from, all the way to where it ends
applies   the beat draws flows AND the number of distinct sources is small enough for one to be
          followed by eye (observed: 9 and 12)
draws     palette
detect    for every link, the link mark's hue equals its source node's hue within a small tolerance,
          transitively back to a stage-0 node
evidence  iea-org-data-and-statistics-data-tools-energy-sankey
evidence  flowcharts-llnl-gov
```

**Two publications.** IEA: a ribbon leaving `Natural gas` is still blue when it arrives at
`Residential`, four columns later. LLNL: the nine source boxes each hold a hue and their ribbons
carry it into the sector boxes. It is the only mechanism by which "where did this fuel end up" is a
question the picture answers.

**It is one of two mutually exclusive answers and the predicate is the whole point** — see §3.6.

### 3.6 `category-on-the-node-neutral-on-the-ribbon`

```
kind      imported
name      When there are too many flows to follow one, the nodes carry the colour and every ribbon
          is the same unaccented neutral
applies   the beat draws flows AND the link count is past the point where one could be traced
          (observed: 343 links, and an unfiltered "all products" view)
draws     palette
detect    every link mark shares one fill/stroke colour, and that colour's chroma is below the
          neutral threshold
evidence  interactive-carbonbrief-org-carbon-offsets-2023-companies-html
evidence  ec-europa-eu-eurostat-cache-sankey-energy-sankey-html
```

**Two publications**, and it is the direct refusal of §3.5 rather than a variant of it. The seam
between them is not stylistic: at 40 × 60 nodes there is no hue a reader could trace, so spending
the palette on ribbons buys nothing and costs legibility.

Carbon Brief spends its whole chromatic budget on **one bit** — violet `#544CDC` for a company,
green `#02F59B` for a country — and those two together are **1.06 %** of the graphic against
**16.03 %** of neutral `#E0DFD5` ribbon. Eurostat, unfiltered, draws every pipe in one
`stroke rgb(125, 128, 136)` and its legend reads `Legend (top-down) — All products`; colour arrives
only when the reader narrows the question with the product filter.

**The measured corollary, which is not proposed as a rule and is stated with its counter-cases,
because a plausible invented number is the worst thing this corpus can carry.** Across the six
records whose pixels are trustworthy, the share of ink that is neutral rises with the number of
flows, and it crosses over:

| record | largest non-ground colour | runner-up |
| --- | --- | --- |
| Carbon Brief, 343 links | **neutral** `#E0DFD5` 16.03 % | hue `#544CDC` 0.53 % |
| IEA, ~100 links | **neutral** `#A1A1A1` 5.31 % | hue `#92E5FF` 4.25 % |
| LLNL, ~50 links | hue `#006000` 8.34 % | neutral `#B9B9B9` 7.98 % |
| Ferdio `#42`, 3 links | hue `#3274D8` 8.75 % | neutral `#283250` 2.82 % |
| Ferdio `#8`, 3 links | hue `#79B0F6` 8.09 % | neutral `#5E657C` 3.83 % |
| Ferdio `#44`, 3 links | hue `#EE5440` 1.46 % | neutral `#283250` 0.96 % |

So **two of six** have a neutral as their largest colour, and they are the two with the most flows;
LLNL sits on the line at a margin of 0.36 percentage points. The family's own type note calls the
neutral "the rest". At three flows that is right; at a hundred it is the majority of the picture.
What a beat should carry is that **the neutral's share grows with the link count**, not that grey
always wins.

## 4. Treatments to file — `derived`

These draw facts the beat's own data or geometry already carries. None has a `provenBy` yet, because
**no beat was rendered in this wave** — the boundary on this run was harvesting. Each is proposed
with its `detect`, and each **must not be filed until it has been drawn**, per the guard.

### 4.1 `flow-conserves-at-every-node`

```
kind      derived
name      Every node's inflow equals its outflow, and the beat refuses to render if it does not
applies   the beat draws flows through nodes that are neither declared sources nor declared sinks
draws     geometry
detect    for every node not declared source or sink, |Σ inbound − Σ outbound| ≤ ε · node total
provenBy  OWED — no sankey beat has been rendered
```

This is the family's single named failure mode and the one thing a reader cannot check by looking.
Four of the five publications here make an arithmetic claim at every node and **none of the seven
records verified it** — see every `What was not verified` in the corpus. A form whose whole promise
is unauditable from the picture has to be audited before the picture exists.

### 4.2 `one-pixels-per-unit-scale-across-every-column`

```
kind      derived
name      Ribbon thickness means the same quantity everywhere in the diagram
applies   the beat draws flows across two or more columns
draws     geometry
detect    max(thickness/value) / min(thickness/value) over all links ≤ 1 + ε
provenBy  OWED
```

The counter-example is in the corpus and it is measured: `100-datavizproject-com-data-type-viz44`
puts the same three flows in an isometric projection, where two ribbons at different depths are
drawn at different apparent scales **by construction**. The tell is downstream and diagnostic:
every value in `#44` is printed on the ribbon, because the thickness has stopped meaning anything.
**A flow diagram that cannot be read without a number on every ribbon has lost its geometry.**

### 4.3 `flow-name-never-carries-the-flow-colour-as-text`

```
kind      derived
name      A flow's name or value is set in ink, never in the flow's own hue, whatever the ground
applies   the beat labels a flow
draws     annotation, palette
detect    every text run belonging to a link is measured against the ground it sits on and clears
          the WCAG floor for its size; a run whose colour equals its link's colour fails outright
provenBy  OWED
```

The family's type note names this as a shipped failure on a dark tooltip. **This corpus finds it
twice more, on light grounds, in two different publications**, computed from each record's own
measured hexes:

| record | run | ground | ratio |
| --- | --- | --- | ---: |
| `flowcharts-llnl-gov` | `4.58` in natural-gas `#46AAF5` | `#FFFFFF` | **2.52 : 1** |
| `flowcharts-llnl-gov` | `13.56` in electricity `#E69A38` | `#FFFFFF` | **2.32 : 1** |
| `100-datavizproject-com-data-type-viz8` | white `SE +15%` on tint `#79B0F6` | — | **2.25 : 1** |
| `100-datavizproject-com-data-type-viz8` | white `DK +150%` on tint `#F6988C` | — | **2.15 : 1** |

And the diagnosis is precise rather than a blanket ban: LLNL's **dark** sources carry text fine —
`#006000` 7.86 : 1, `#911391` 7.76 : 1, `#CC0001` 5.89 : 1. The rule that holds is not "never colour
the label", it is "the label's colour is chosen against the ground, and a palette built for **area**
will contain values that cannot carry **text**". Ferdio's own saturated end caps are the
near miss: `#3274D8` clears the body-text floor at **4.54 : 1**, and `#EE5440` at **3.51 : 1**
clears only the large-text one. It lightened the ribbon body for softness and put the white label on
the light half.

## 5. Refusals, deletions and one contaminated record

**Three records were deleted rather than filed**, per the runbook's step 3.

| url | what the harvester actually photographed |
| --- | --- |
| `carbonbrief.org/interactive-how-climate-finance-flows-around-the-world` | its own **newsletter modal**, both times, dead centre over the sankey |
| `supplychains.trase.earth/` | the hero photograph of the marketing page |
| `supplychains.trase.earth/explore/supply-chain` | **the same hero** — the SPA never resolved the route in-session |

The Carbon Brief climate-finance piece is a real sankey and is visible around the edges of the
modal. It was re-harvested once and the modal returned; the harvester's consent handler does not
match it because it is a newsletter, not a consent platform, and working past it would be reaching
around something the site put there. **It is not filed and it is a good candidate for a later wave
with `--via-firecrawl`.** `flowcharts.llnl.gov/commodities/energy` was also harvested and deleted:
that page is a grid of state thumbnails and the picker honestly reported
`no graphic outside the site's own chrome`.

**One filed record's pixel reading must never be cited: `ec-europa-eu-eurostat-cache-sankey-energy-sankey-html`.**

The picker chose an `svg` at `x: 0, y: 0, w: 1440, h: 900` — Eurostat's application SVG spans the
whole viewport and lies under the site header and footer, so photographing the element photographed
the page. On top of that, the tool opened its guided-tour modal with a **grey veil** over
everything. The modal itself is `position: fixed` and was correctly hidden before the shot; the veil
is inside the SVG and was not. What `record.pixel` therefore holds — ground `#999999` at 68.42 %,
`#14337C` at 6.82 %, `#10244F` at 3.24 % — is a dimmed screenshot of the Eurostat website, and both
routes reported `ok` on it.

This is **correction 3 recurring and correction 15 confirmed**: `measuredFrom: "graphic.png"` was
true the whole time. The record is filed rather than deleted because the diagram *was* reached — the
whole flow, every node, every label is legible in `graphic.png` and §3.1, §3.2 and §3.6 all read it
from there — and its note says so at the top rather than in a footnote. It is cited for its
**structure and its style route**, never for a colour.

**A new failure shape for `METHOD.md`, if the parent wants it.** A graphic element that spans the
entire viewport is not a graphic, it is a page. `findGraphic` excludes chrome by **where it lives**;
it has no rule for an element that *contains* the chrome. A candidate whose bounding box is the
viewport, at `x: 0, y: 0`, is measuring everything.

**Independence, stated so nobody counts it wrong.** Two records in the family are Carbon Brief:
`interactive.carbonbrief.org` and (had it survived) `www.carbonbrief.org`. A guard reading
independence off the hostname would treat those as two publications. **They are one**, and no
treatment above cites more than one Carbon Brief record. Likewise the three Ferdio records are one
publication, and §3.4 deliberately cites only `viz42` where `viz8` would have been a free second id.

**One thing this family cannot yet evidence.** IEA sets its **balancing terms in italic** —
`record.style.type` carries `Graphik | 10.4 | 400 | italic`, six occurrences, sampled on `Stocks`,
used for `Own use & losses`, `Transfers`, `Statistical differences`, `Non-specified`. A residual is
a different kind of thing from a destination and one typographic axis separates them without a
legend. It is plainly real, it is the exact analogue of the map register's *water in italic*, and it
rests on **one publication**. It is not proposed for filing. What a second wave should look for is
**a sankey from a desk that is not the IEA which sets its residuals apart typographically.**

## 6. Directions

A direction is a coherent whole and rests on one reference by design.

### 6.1 `balance` — measured from `iea-org-data-and-statistics-data-tools-energy-sankey`

White ground at 70.5 %. Nodes as hairline vertical ticks that carry no fill at all, so the ribbons
own every pixel of colour; the only filled nodes are the grey stage rails (`fill rgb(228, 228, 228)`,
five marks). Twelve hues, **all of them at 0.6 alpha**, plus the same twelve dimmed to 0.25 for the
background flows — and a neutral `#A1A1A1` that is larger than any of them at 5.31 %. Type is
`Graphik` in three ranks and nothing else: `10.4 / 400` for a node, `10.4 / 400 italic` for a
residual, `9 / 400` for a flow too small to matter. Column names in the light register above their
column.

The whole apparatus says: *many things, most of which you are not being asked to track.*

### 6.2 `ledger` — measured from `interactive-carbonbrief-org-carbon-offsets-2023-companies-html`

A warm cream ground `#F9F8ED` at 74.8 % — paper, not white. The flows are a single neutral
`#E0DFD5` at **16.03 %**, drawn as `stroke rgba(0, 0, 0, 0.2)` so that bundles darken; one step off
the ground at **1.26 : 1**, which only works because the mass is enormous. Two accents and no more,
carrying one bit each: `#544CDC` at 5.71 : 1 against the ground, `#02F59B` at **1.35 : 1** and doing
no work that could be relied on. Every label in the diagram — all 394 — is `PT Sans Narrow 12 / 400`
in `rgb(51, 51, 51)`, no hierarchy at all; the chart's own title is `PT Sans Narrow 28 / 700` and the
unit is a `PT Sans 16 / 400` subhead beneath it, because there is no axis to hang it on.

The whole apparatus says: *a very long list, and the shape of it.*

## 7. What a second wave should target

1. **A second publication for the italic residual register** (§5). Not more sankeys — one from a
   desk that is not the IEA and that marks its balancing terms.
2. **A newsroom.** Five publications and four of them are agencies or a national laboratory. The
   form's open publishers are institutions; a newspaper desk's sankey would change what the family
   can say about editorial framing, and is the one voice missing.
3. **Carbon Brief's climate-finance piece via Firecrawl.** It is a real sankey, twice blocked by the
   publisher's own newsletter modal, and it would be the family's second Carbon Brief piece — useful
   for reading, useless for corroboration.
4. **An interaction.** Not one record in this family was hovered. The form's named accessibility
   trap lives in the tooltip and nothing here tested one.
5. **The renders §4 owes.** Three derived treatments with `detect` written and `provenBy` unpaid.
