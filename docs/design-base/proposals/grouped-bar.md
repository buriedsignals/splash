# Proposal — the GROUPED BAR family

Harvested 2026-09-08, from zero references. What this harvest thinks should be FILED, for the parent
to integrate. **Nothing here has been written into `treatments/`, `directions/` or `registers/`;
those are the parent's to touch.** Nothing was committed or staged.

Family: a chart whose value is **bar length from a shared zero baseline**, with the bars **nested
into groups** — outer band per category, inner band per series.

## Where the line against `paired/` was drawn, and why it did not collide

A grouped bar with exactly two bars per group is also a paired comparison, so the two families
overlap by construction. The line taken here:

- **`grouped-bar`** — the encoding is bar length from a shared zero, and the grouping is a nested
  band. A two-bar group counts.
- **`paired/`** — the pair relation is itself the subject and is drawn by something *other* than
  nested bars: a slope segment, a dumbbell, a connector, two facing panels.

Where a piece is literally two bars in a band, it is filed here, because the decisions being
harvested — band gaps, legend order, colour consistency across groups, label placement — are this
family's questions and not the pair's.

**Checked against the corpus rather than asserted.** `paired/` holds Ferdio `viz3, 6, 17, 19, 30,
36, 54, 85`; `bar/` holds `viz6, 19, 23, 24, 47`. This family drew `viz25, 27, 39, 84, 99`. **Zero
overlap.** No reference is duplicated across families.

## Provenance convention used throughout

Every claim says which file it was read from.

- **`record.pixel`** — a measurement in `measured.json` taken with
  `routes.pixel.measuredFrom === "graphic.png"`. True of all nine filed records.
- **`style route`** — `record.style`, the live DOM.
- **looked at** — a human reading of a PNG in the reference directory. Founds geometry and text,
  never a colour value.
- **measured here** — a number computed in this harvest from a reference's own `graphic.png` or
  from a hex the record carries. Two such numbers appear below (Pew's bar-length scale; the WCAG
  contrast table) and both are reproducible from the files.

**Where the type comes from.** The five Ferdio records carry
`style.typeSource: "the page only — the graphic is a raster and carries no type this route can
read"`. **No typeface is attributed to any Ferdio graphic anywhere in this family.** The ONS, Pew
and IEA records carry `"the page, which contains the graphic — the two are not separated"`; for the
two ONS chart-permalinks the page *is* the chart, so the attribution is effectively clean, while on
the Pew and IEA pages only the tuples whose samples are chart strings are attributed to the graphic,
and the notes say so per record.

## Yield

| archive | drawn | harvested | survived looking | filed |
| --- | ---: | ---: | ---: | ---: |
| datavizproject | 8 | 8 | 5 | 5 |
| search (chart-tool permalinks + IEA + agencies) | 15 | 15 | 4 | 4 |
| url-list | 0 | 0 | — | — |
| informationisbeautiful | 0 | 0 | — | — |
| buried-signals | 0 | 0 | — | — |
| **total** | **23** | **23** | **9** | **9** |

**Every one of the 23 harvests reached a real graphic.** Not one hero photograph, not one consent
wall behind which nothing was measured, not one promotional montage. That is the first wave's
lesson working: chart-tool permalinks and a form-indexed archive have nothing for the picker to get
wrong. The fourteen losses were **all** form mismatches — a stacked bar, a single-series bar, an
area trapezoid — caught at step 3 by looking, and their records were deleted rather than filed.

One exception, and it is not a loss of the same kind: **bls.gov returned "Access Denied … bot
activity that doesn't conform to BLS usage policy is prohibited."** The site is declining automated
reading. It was not worked around and the record was deleted.

## The four publications, and the independence read

| publication | host | references |
| --- | --- | ---: |
| Ferdio | `100.datavizproject.com` | 5 |
| Office for National Statistics | `ons.gov.uk` | 2 |
| Pew Research Center | `pewresearch.org` | 1 |
| International Energy Agency | `iea.org` | 1 |

**Four hosts, four design authors.** No two of these are one author wearing two names — the failure
mode `leebyron.com`/`archive.nytimes.com` and `moneyhub.co.nz`/`figure.nz` recorded yesterday. The
two ONS records are **one publication and are counted once** everywhere below.

**One near-miss worth recording.** `ethnicity-facts-figures.service.gov.uk` was harvested as a
candidate fifth publication. It turned out to be a single-series bar and was deleted on form — but
had it survived, it would have needed a caveat: it is a different UK government body from ONS
publishing through the **same GOV.UK design system**, so the host would have said "independent"
while the design author was, at the level that matters here, shared. The host is a proxy and this
is the shape of the case where it lies.

---

# Treatments proposed for filing

Five. All `imported`; each cites two independent publications.

## T1 — `panel-per-group-on-one-shared-scale`

- kind: imported
- evidence: `100-datavizproject-com-data-type-viz99` (Ferdio)
- evidence: `pewresearch-org-chart-self-reported-voting-patterns-in-2024-election-v` (Pew)
- publications: 2 ✔

**The rule.** When the groups start to crowd, split them: give each group its own panel with its own
baseline rule, and keep **one shared value scale** across all the panels.

**Why it is more than a layout preference.** The type's own reference already says "move to small
multiples" past a handful of groups. What the evidence adds is the condition that makes the move
honest — the shared scale — and the mark that makes it legible: **each panel gets a baseline rule
exactly as wide as its own group**, so the panel reads as a chart rather than a fragment.

**And it was measured, not assumed.** Pew's four strips look like they cannot share a scale (one
strip holds `49, 56` and another holds `1, 2`). Sampling the declared fills out of that record's own
`graphic.png` gives, per bar, printed value → length in pixels: red `34→24, 44→31, 21→15, 22→15`;
slate `51→35, 38→26, 25→17, 15→10`; grey `12→7, 11→7, 49→33, 56→38`. That is **0.67–0.71 px per
unit across all three drawn strips — one scale.** Splitting a group into panels does not have to
cost the cross-group comparison, and at Pew it does not.

**The transpose, named honestly.** Ferdio panels the **category** (one panel per country, two bars
inside). Pew strips the **series** (one strip per candidate, four bars inside). These are transposes
of each other, and treating them as one treatment is the strongest claim in this proposal. What is
common and what the rule should be written against: the group is split, the scale is kept, and each
split gets its own baseline. **If the parent judges the transpose too large a generalisation, the
Ferdio half stands alone as `panel-per-category` and then has one publication and cannot be filed.**

## T2 — `same-hue-family-never-adjacent`

- kind: imported
- evidence: `100-datavizproject-com-data-type-viz25` (Ferdio)
- evidence: `pewresearch-org-chart-self-reported-voting-patterns-in-2024-election-v` (Pew)
- publications: 2 ✔

**The rule.** Order the series within a group so that two members of the same hue family never sit
next to each other. This is a **placement** decision, not a palette decision, and it costs nothing.

**Why.** `skills/chart-beat/references/types/grouped-bar.md` names the trap precisely — membership
in a colourblind-safe set is not the whole story, because "the safety a CVD-safe set promises is a
property of which colours end up sitting next to each other." The corpus shows both sides of it.

**The positive cases.** Ferdio's three-series plates run **Norway navy `#283250`, Denmark coral
`#EE5440`, Sweden blue `#3274D8`** — navy and blue are the two members nearest in hue, and the warm
is placed *between* them, in every group, on `viz25` and again on `viz39`. Pew runs **red `#BF3B27`,
slate `#456A83`, a gold rule `#F5CF95`, grey `#C6C8CA`**: no two adjacent strips share a family.

**The counter-case, from a fourth publication.** IEA's `iea-total-oil-stocks-may-2026` puts
`#0044FF` (224°) and `#49D3FF` (195°) adjacent in every group — **29° apart, one hue family** — with
no value labels, no in-bar text, and a legend that sits below the plot and outside the 1440 × 900
capture. `record.pixel` reports the palette shape as **`sequential`, one cluster at 195° with six
members**: the measurement agrees that these are one family. The desk's own repair is a 1 px black
outline on every bar, which is what keeps the boundary visible at all.

## T3 — `the-comparison-series-is-a-neutral`

- kind: imported
- evidence: `ons-gov-uk-visualisations-dvc2203-groupedbarchart-index-html` (ONS)
- evidence: `pewresearch-org-chart-self-reported-voting-patterns-in-2024-election-v` (Pew)
- publications: 2 ✔

**The rule.** In a grouped bar where one series is the argument and another is only its reference —
the earlier year, the comparison population, the residual category — draw the arguing series in a
hue and the reference series in a **neutral**. A two-series grouped bar rarely needs two hues.

**The evidence.** ONS draws 2011 in `rgb(160, 159, 160)` and 2021 in the house blue
`rgb(32, 96, 149)`, on `dvc2203`; and non-disabled adults in `rgb(170, 170, 170)` against disabled
adults in the same `rgb(32, 96, 149)`, on `dvc847`. Both are style-route mark tallies —
4 + 4 and 15 + 15, category count × series count exactly. Pew gives four series a party red, a party
slate, and `rgb(198, 200, 202)` for **"Did not vote"**, which is deliberately not a party colour.

**What the palette shape says.** Both ONS records read **`sequential`, a single cluster at 207°** —
the palette measurement itself reports that there is only one chromatic series on the plate, which
is the treatment stated in the numbers.

## T4 — `every-bar-labelled-lets-the-axis-go`

- kind: imported
- evidence: `100-datavizproject-com-data-type-viz25` (Ferdio)
- evidence: `pewresearch-org-chart-self-reported-voting-patterns-in-2024-election-v` (Pew)
- publications: 2 ✔

**The rule.** Where every bar in a grouped chart carries its printed value, the value axis, its ticks
and its gridlines can go. The axis exists to let a reader estimate a length; nothing has to be
estimated.

**The evidence, and the shape of the choice across the whole corpus.** Ferdio's `viz25` has no axis,
no ticks, no gridlines and not even a baseline rule — six bars, six numbers, and the labels sit
*inside the feet of the bars* so that they align into a row that does the baseline's work. `viz84`
and `viz99` do the same. Pew has no axis and no gridline either, and prints all sixteen values.
Against them, ONS's `dvc847` keeps an axis and prints nothing (fifteen categories × two series — too
many to label), and IEA keeps an axis and prints nothing.

The corpus therefore shows a clean one-directional rule and one desk that does both: `dvc2203` has
four groups, an axis **and** every value printed. So the rule is a licence, not an obligation.

**The counter-case that matters.** Ferdio's `viz39` — the isometric plate — has neither an axis a
reader can read against *nor* a printed value anywhere. That is the state the rule forbids.

## T5 — `the-group-boundary-is-drawn`

- kind: imported
- evidence: `100-datavizproject-com-data-type-viz84` (Ferdio)
- evidence: `iea-org-data-and-statistics-charts-iea-total-oil-stocks-may-2026` (IEA)
- evidence: `pewresearch-org-chart-self-reported-voting-patterns-in-2024-election-v` (Pew)
- publications: 3 ✔

**The rule.** State the group boundary with a mark, not with gap width alone: a hairline between
groups, or a tick on the baseline at each boundary.

**Why it is not fussiness.** With only two or three bars per group, whitespace alone does not
distinguish "two groups of two" from "one group of four" — the reader has to measure two gaps and
compare them. A mark removes the measurement.

**The three uses, all different marks.** Ferdio's `viz84` sets a **full-height hairline** between
2004 and 2022. IEA ticks its **baseline rule** with short verticals at each group boundary, so the
axis states the grouping. Pew separates its strips with a **2 px × 116 px rule** — and there the
rule does double duty, because the fourth series (`Another candidate`, values 1–2) has no bars at
all: at 0.69 px/unit those bars would be a hairline, so the desk draws the rule where the bars
would be and sets the numbers beside it. **A series whose values round to nothing is admitted as
text against a rule rather than faked as geometry.**

**The limit, from the corpus's own dissent.** Both ONS figures use gap width alone — at 4 groups and
at 15 — and both are legible. The rule should be scoped to small group counts, where the gap ratio
is ambiguous; at fifteen rows the repetition itself establishes the rhythm.

---

# Treatments NOT proposed, because they rest on one publication

Recorded here so a later wave knows what to target, per the map family's precedent.

| candidate | what it is | rests on | needs |
| --- | --- | --- | --- |
| `legend-ordered-as-the-bars-are` | if a legend is used it sits before the plot and its entries run in the same order as the bars within a group | ONS ×2 — **one publication** | a second desk that draws a legend for a grouped bar. IEA has one and it was below the fold, unread |
| `label-inside-when-it-fits-outside-when-it-does-not` | the value label sits inside the bar when the bar can hold it and outside when it cannot, decided per bar | ONS `dvc2203` alone | a second desk applying the *conditional*. Ferdio's `viz25` is always inside, Pew always outside — neither is evidence of the rule |
| `value-label-carries-two-units` | `**7.5%** (4.2 million)` — the encoded unit bold, the concrete one regular, one size | ONS `dvc2203` alone | a second desk |
| `hue-is-the-category-tint-is-the-series` | invert the usual mapping for a before/after: one hue per category, two lightnesses for the two states | Ferdio `viz27` alone | a second desk. The tint step must be a real lightness step, not an opacity knock-back — `#3274D8`/`#5495EC`, `#EE5440`/`#F37666`, `#283250`/`#424B65` |
| `the-composite-bar-names-its-own-composition` | a bar that merges entities is labelled `DK + NO`, not given an invented name | Ferdio `viz84` alone | a second desk |

**And one candidate that is `derived`, not `imported`, and is therefore blocked on something else.**
`change-between-the-two-bars-of-a-group` — where a group holds exactly two bars, join their caps and
set the change larger than either level, because the beat's own two values already contain it.
Ferdio's `viz99` draws it (`150%`, `60%`, `15.4%`, each larger and bolder than the `4`/`10` above the
caps). As a `derived` treatment it owes no second publication, but the guard demands a `detect` and
a `provenBy` render, and **this harvest rendered nothing**. It is proposed as a candidate, not as a
filing.

---

# Direction proposed for filing

## `dossier` — measured from Pew

- measuredFrom: `pewresearch-org-chart-self-reported-voting-patterns-in-2024-election-v`
- ground: `#FFFFFF` — `record.pixel`, modal, **83.298 %**; the style route independently reports the
  page ground as `rgb(255, 255, 255)`
- ink: `rgb(42, 42, 42)` — carries display, title, series header, category and value alike
- muted: `rgb(86, 86, 86)` (deck, date) and `rgb(129, 129, 129)` (note)
- accents: `#BF3B27` and `#456A83` — `record.pixel` at **3.214 %** (8°) and **3.451 %** (204°),
  matching the style route's `fill rgb(191,59,39)` and `fill rgb(69,106,131)` **exactly**

**Registers**, all from the style route on the live DOM. Every row's `sample` is a string from the
chart or its immediate furniture, which is how each was attributed to the graphic rather than to the
page's masthead.

| register | family | size | weight | italic | tracking | case | ink | sample |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |
| display | `abril-text` (serif) | 35 | 700 | no | 0 | none | ink | *Self-reported voting patterns…* |
| title | `franklin-gothic-urw` | 18 | 700 | no | 0 | none | ink | *Self-reported voting patterns…* |
| eyebrow | `franklin-gothic-urw` | 12 | 700 | no | 0.2 | none | ink | `Chart` |
| deck | `Georgia` (serif) | 14 | 400 | **yes** | 0 | none | muted | *% of U.S. adults in each engagement group…* |
| series | `franklin-gothic-urw` | 12 | 700 | no | 0 | none | ink | `Donald Trump` |
| axis | `franklin-gothic-urw` | 12 | 400 | no | 0 | none | ink | `Outsiders` |
| value | `franklin-gothic-urw` | 12 | **200** | no | 0 | none | ink | `22` |

**What makes it coherent, and worth a direction rather than a treatment.** The chart's entire
hierarchy is carried by **weight at one size in one colour** — 200 for the values, 400 for the
categories, 700 for the series names, all at 12 px in `rgb(42,42,42)`. The numbers are the
*quietest* text on the plate. Above it, two serifs do the two jobs sans cannot: `abril-text` for the
page display and an *italic* `Georgia` for the deck, which is written as a sentence with a literal
blank the series name fills in — *"% of U.S. adults in each engagement group who say they voted for
___ in the 2024 election."*

**And no register sets type in the accent.** The accents are mark-only. So the second-measurement
rule that trips `rapport` — a hue that is a legitimate mark failing text contrast as a label — never
arises here, and the direction ships without an escalation clause.

**What would have to be chosen rather than measured**, and is therefore flagged for the parent:
`pad`, `header`, `headRule`, and an `annot` register — the record carries no annotation run.

**Not proposed as a direction: ONS.** `dvc847` carries exactly **two type tuples for the entire
chart** — `Open Sans 12/400` ×35 for legend, categories and ticks alike, and `Open Sans 16/700` ×1
for the source line. That is a real and admirable discipline, and it is not enough rows to fill a
register table without inventing five of them.

---

# What the pool taught

**1. `100.datavizproject.com` paid, and it paid because this form is what the dataset can hold.**
Correction 16 says the archive is bounded by its dataset — two states per country, three countries,
no durations and no flows. This family *is* two series across three categories, which is the shape
that dataset has, so eight candidates were visible on the contact sheets and five survived. Compare
the sankey family's three. **The contact sheet is now proven twice**: four 5×5 montages of all 100
thumbnails, ninety seconds of tooling and four Read calls, and the answer was certain. (No
ImageMagick on this machine; PIL built the sheets in eight lines.)

**2. A thumbnail lies about form more than it lies about subject, and only the full plate settles
it.** Three of the eight drawn from the contact sheet were not grouped bars at all: `viz9` reads as
a group of three columns and is a width-encoded stacked bar; `viz47` reads as a pair and is a
stacked growth bar; `viz60` reads as bar pairs and is a two-point area trapezoid. A 300 px thumbnail
cannot distinguish "three bars side by side" from "one bar in three parts". **Contact sheets are for
drawing a pool, never for filing one.**

**3. Correction 18's second archive does not hold for this family, and there is a cheap fix.**
`iea.org/data-and-statistics/charts?type=<t>` selects **orientation**, not grouped-versus-stacked:
`column` means vertical and `bar` means horizontal. Of the 24 charts on page 1 of each,
**20 declared `data-chart-stacking="normal"` or `"percent"`** and were stacked. Filing `?type=column`
as a grouped-bar index would have cost a whole wave.

The fix is that every IEA chart page carries its own form in its HTML —
`data-chart-charttype` and `data-chart-stacking` — readable with `curl` and `grep`, no browser
needed. Filtering on `stacking=""` cut 24 candidates to 4 for the price of 24 plain fetches.
**It is necessary and not sufficient**: three of those four were single-series. A future wave should
also read `data-chart-series`. And a caution paid for here: **fetching eight listing pages in
parallel tripped a Cloudflare interstitial**; a 1.5 s-spaced sequential loop over 24 chart pages did
not.

**4. The chart-tool permalink is the best target in this corpus and the claim is now quantified.**
Twenty-three harvests, twenty-three graphics reached, zero heroes, zero walls, zero montages —
against the 1-in-3 this log records for news domains. `ons.gov.uk/visualisations/dvc<NNNN>/<fig>/`
and `pewresearch.org/chart/<slug>/` both serve one chart on one page. The whole apparatus of
corrections 1, 13, 14, 17 and 18 exists to survive a news page; on these urls there is nothing to
survive. **The corollary is that the pool is no longer the bottleneck — independent publications
are**, which is the same conclusion correction 8 reached from the opposite direction.

**5. The url list has nothing for a chart family, and this is now a measurement rather than a
belief.** 3 827 lines. Filtering for chart-tool permalinks — the one route correction 18 endorses —
returns **9 lines**, of which two are ONS `dvc` urls (neither a grouped bar) and seven are homepages
and blog posts *about* Datawrapper and Flourish. Filtering for the subjects that most often carry a
grouped bar returns **4 lines**: one Nightingale post *about* charts (correction 18's montage trap),
and three Washington Post, which METHOD excludes as paywalled. Nothing was drawn, and the zero is
reported as a zero.

**6. `~/.claude/scripts/search.sh` returned `results: []` on every call across the whole session,
and WebSearch was exhausted at 200 calls session-wide before the second batch.** Both are shared
across the parallel wave. Neither empty result was read as absence: the pool was rebuilt from
direct archive navigation instead, which is how the IEA filter above was found. **A wave of seven
agents saturates the shared search infrastructure, and a family that starts late should plan to
navigate archives directly rather than search.**

**7. bls.gov declines automated reading, in plain words.** *"Access Denied … bot activity that
doesn't conform to BLS usage policy is prohibited."* Not worked around, per correction 8's ruling on
SCMP. It is a shame, because BLS's *Economics Daily* offers its charts in a `Grouped · Sorted`
toggle and would have been an excellent fifth publication.

---

# The finding this harvest did not expect, and cannot resolve alone

**Three of the four publications draw their reference series below the WCAG non-text floor against
their own ground.** Computed here from each record's own declared or measured hex against `#FFFFFF`:

| publication | arguing series | vs white | reference series | vs white |
| --- | --- | ---: | --- | ---: |
| ONS `dvc2203` | `#206095` | **6.63:1** | `#A09FA0` | **2.64:1** |
| ONS `dvc847` | `#206095` | **6.63:1** | `#AAAAAA` | **2.32:1** |
| Pew | `#BF3B27` / `#456A83` | **5.43:1** / **5.77:1** | `#C6C8CA` | **1.68:1** |
| IEA | `#0044FF` | **6.42:1** | `#49D3FF` | **1.74:1** |
| Ferdio | `#3274D8` / `#EE5440` / `#283250` | **4.54:1** / **3.51:1** / **12.63:1** | — | — |

Every arguing series clears 3:1 comfortably. **Every reference series fails it.** Ferdio is the only
desk in the family all of whose series clear the floor, and Ferdio is the only desk that does not
use a reference-series-as-neutral at all.

**Why this matters here and not elsewhere.** `skills/splash/…/palette` refuses an accent a reader
cannot see, measured against the WCAG non-text floor, at the proposal and again when the answer is
read back. Applied literally to T3 — the treatment this harvest most wants to file — the gate would
**refuse every published example of it**. IEA even shows what a desk does when it notices: it
outlines every bar in 1 px black, which is a fix for visibility, not for contrast.

Three readings are available and this harvest does not choose between them:

1. **The desks are wrong**, and a comparison series a reader can barely see is a real accessibility
   defect that four publications share.
2. **The floor is the wrong instrument for a reference series.** A grey bar's job is to be a
   backdrop the coloured bar is read against; its contrast that matters is against the *arguing
   series*, not against the paper. `#206095` against `#A09FA0` is a strong pair.
3. **The floor is right and the treatment needs a rider** — draw the reference series in a neutral,
   but a neutral that still clears 3:1, which would put it around `#767676`.

This is a decision for the parent, and T3 should not be filed until it is made, because filing it as
written would put a rule into the foundation that the project's own palette gate refuses.

---

# Summary for the integrator

- **9 references filed**, 4 publications, every one measured on its own `graphic.png`.
- **5 treatments proposed**, each with 2+ independent publications: `panel-per-group-on-one-shared-scale`,
  `same-hue-family-never-adjacent`, `the-comparison-series-is-a-neutral`,
  `every-bar-labelled-lets-the-axis-go`, `the-group-boundary-is-drawn`.
- **1 direction proposed**: `dossier`, from Pew — a full six-register table, one size, three weights,
  two serifs, accents mark-only.
- **5 treatments withheld** for want of a second publication, plus 1 `derived` candidate withheld for
  want of a render.
- **1 open decision** that blocks `the-comparison-series-is-a-neutral`: the WCAG floor against the
  reference series.
- **2 corrections offered to `METHOD.md`**, which this harvest did not write into it: the IEA
  `?type=` filter is orientation and not form (with `data-chart-stacking` as the cheap fix), and a
  contact sheet draws a pool but cannot file one.
