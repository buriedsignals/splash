# Population pyramid — harvest and proposal

2026-09-08. Family harvested from zero references. Seven filed, six publications.

Paths: `docs/design-base/references/population-pyramid/`. Pool:
`scratchpad/pools/population-pyramid.txt`.

---

## The decision about the two histogram records, stated first

The histogram harvest, finishing an hour before this one started, filed two pages that are
population pyramids: `populationpyramid.net/world/2023/` and
`ourworldindata.org/global-population-pyramid`.

**Both are filed here as well, deliberately.** The precedent is ProPublica's *Workers' Compensation
Reforms by State*, filed under `heatmap` and `paired` — one page carrying two real forms — and the
arithmetic guard already knows about it: `two-records-that-agree-exactly-are-both-wrong` exempts two
records whose urls differ only in scheme, `www.` or a trailing slash. The reasons here are the same
and they are structural, not convenient:

- `populationpyramid.net` is the **canonical case of this form**. A family that draws two age
  distributions mirrored about a shared centre and does not hold the page named
  *populationpyramid.net* has a hole in it. It is a histogram *because* it is a pyramid, not the
  other way round.
- OWID's plate is the family's **upper bound**: nine states on one mirrored geometry, which is the
  answer to a question only this family asks ("what happens past two groups"). The histogram record
  reads it for when to stop binning; this one reads it for how far the mirroring stretches.

**Neither is re-used evidence.** Both were re-harvested here, not copied — the records below are this
harvest's own measurements — and both count as **one publication each** for the evidence floor,
whichever family cites them. Where a treatment below is supported by one of them, the count says so.

The re-harvest of `populationpyramid.net` was worth doing on its own: it came back with the identical
contamination for the **third** time (`#C8C8C8` at 51.619 % ground, `consent: null`, the French
consent panel across the right of the plate). That is no longer a transient; it is a reproducible
failure of the dismisser on that site.

---

## Yield

| archive | drawn | harvested | survived looking | filed |
| --- | ---: | ---: | ---: | ---: |
| `datavizproject` (100.datavizproject.com) | 100 | 0 | 0 | 0 |
| `url-list` | 6 | 6 | 0 | 0 |
| `search` | 19 | 18 | 8 | 7 |
| `informationisbeautiful` | 0 | — | — | — |
| `buried-signals` | 0 | — | — | — |
| **total** | **125** | **24** | **8** | **7** |

Seven records, **six publications**:

| record | publication | what it is |
| --- | --- | --- |
| `ons-…-dvc775-fig13-simplepyramid` | Office for National Statistics | 2018 filled, 2043 outlined, one plate |
| `ons-…-dvc550-pyramids` | Office for National Statistics *(same)* | two areas, two panels, shared percentage axis |
| `www12-statcan-…-pyramid` | Statistics Canada | geography 1 filled, geography 2 outlined |
| `populationpyramid-net-world-2023` | PopulationPyramid.net | the canonical plate; **palette contaminated** |
| `ourworldindata-org-global-population-pyramid` | Our World in Data | nine nested envelopes |
| `populationpyramids-org` | PopulationPyramids.org | teaching tool; **palette contaminated** |
| `datavizproject-com-…-population-pyramid-2` | Ferdio / Data Viz Project | catalogue exemplar, not a published data graphic |

### Where two hosts are one author — and where they are not

The instruction to check the host as a **proxy** for the design author paid off twice here, in both
directions.

- `ons.gov.uk/visualisations/dvc775/…` and `ons.gov.uk/visualisations/dvc550/…` are **one
  publication**, obviously — and they are also very nearly one *component*. A third ONS record,
  `dvc692`, was harvested, reached a real pyramid, read cleanly, and **is not filed**: it is the same
  component as dvc550, with identical mark colours and identical type keys, photographed under a
  different series. `METHOD.md` correction 18 records exactly this case on two other ONS figures, and
  the answer there was to keep one. dvc550 and dvc775 are kept because they draw **two different
  idioms** — a panel pair and an overlay — not two data sets through one idiom.
- `populationpyramid.net` and `populationpyramids.org` look like the same publication and **are
  not**. Different sites, different stacks (an inline `svg` against a React `<canvas>`), different
  type (`-apple-system` against Inter), different conventions (words at the head of each half against
  a swatch legend). They are counted separately, and the one thing they share is the defect below.
- Ferdio counts **once**, per correction 4, and — see below — is not counted at all for editorial
  practice.

---

## What the pool taught

**1. `100.datavizproject.com` holds nothing for this family, and that is now certain rather than
assumed.** Four labelled 5 × 5 contact sheets of all one hundred thumbnails were read. Not one of the
hundred is a back-to-back mirrored form about a shared central axis. The nearest misses — `#83`
(vertical stacked bars), `#85` (a diverging timeline), `#97` (paired horizontal bars, both
left-aligned) — are none of them pyramids. This is correction 16 exactly and for the stated reason:
the dataset is Scandinavian World Heritage site counts in 2004 and 2022, three countries and two
states, **and a population pyramid needs an ordered band dimension the dataset does not have.**
Ninety seconds, four Read calls, a certain zero. Cost of establishing it: nothing, because a sibling
family had already built the sheets.

**2. The url list is worse than useless for this family: 6 drawn, 6 harvested, 0 survived.** Twenty-
five of the 3 827 lines match any demography keyword; six were reachable and non-paywalled. All six
failed, and each failed a *different* way, which is the whole catalogue of `METHOD.md`'s failure
modes in one wave:

| url | what came back |
| --- | --- |
| `graphics.reuters.com/JAPAN-AGING/…` | full-bleed animated title card, *"Going gray"* — correction 1 |
| `graphics.wsj.com/2050-demographic-destiny/` | **`Oops, 504!`** |
| `zeit.de/…/east-west-exodus…` | consent wall, unclicked, over a map |
| `letemps.ch/…/vieillissement…` | reached a real graphic; it is a **treemap** |
| `graphics.reuters.com/USA-CENSUS/…` | reached a real graphic; it is **proportional circles** |
| `multimedia.scmp.com/2016/ageing/` | `Verification` — a bot check, not worked around |

Two of those six reached a real, well-drawn graphic that simply was not this form. That is correction
2 in its purest state: **a keyword filter selects a subject and this family is a form.**

**3. Statistical agencies are the seam for this family, and their chart-tool permalinks are the
cleanest targets in the whole corpus.** Correction 18 predicted this and it held completely.
`ons.gov.uk/visualisations/dvcNNNN/…/index.html` is one published chart on one page: no masthead, no
consent dialog, no hero, no second graphic, `consent: null`, `entry: null`, `documentTop: 0`. Every
picker rule `METHOD.md` records exists to survive a news page, and on these urls there is nothing to
survive. **Three of the four ONS permalinks harvested reached a real pyramid on the first attempt.**

The one that did not is instructive: `dvc0005/01-pop-pyramid/index.html` returned a complete,
correctly labelled, perfectly empty chart — axes, gutter, `100+`, `Under 1`, `2% 1% 0% 0% 1% 2%`, and
**no bars**. Both routes reported `ok`. It is deleted, not filed. A chart frame that never received
its data looks exactly like a chart to every automated check there is.

**4. Statistical agencies that are not permalinks are a different story.** INED returned
`Access denied`, Visual Capitalist and Data Revelations both returned Cloudflare's `Un instant…`,
INSEE's page is a table of contents with the pyramid one click further in, Australia's Centre for
Population serves a dashboard index, Eurostat's *Demography of Europe 2025* landed on its
*Acquisition of citizenship* section. Six agency or blog urls, six non-charts. **The permalink is the
target; the agency's article about it is not.**

**5. `search.sh` returned `results: []` on every attempt, from first call to last** — six siblings
running concurrently, exactly as warned. WebSearch carried the whole discovery load until its
session budget ran out at 200 calls. Nothing in this family's yield should be read as evidence about
what is published; it is evidence about what could be found in one afternoon.

**6. And a third costume for the opening beating the graphic, which is new.** The Datawrapper Academy
article *How to create a population pyramid* was harvested because correction 18 names Datawrapper
permalinks as ideal targets. What the picker returned was a **screenshot of the Datawrapper editor's
own Labels panel** — `Alignment · left / right`, `Show values`, `Number format 123.45k` — the largest
`img` on a tutorial page, well inside the article, near the top, past every rule. It is a picture of
a *user interface*, and there is no rule that could tell it from a chart. Following it up (the page's
real charts are inline, with no `dwcdn.net` permalink) cost a redirect and a fetch and returned
nothing. **A tutorial about a chart type is not a source of that chart type.**

---

## Treatments proposed

Kinds per `METHOD.md` correction 7. An `imported` treatment needs **two independent publications**,
counted at the publication.

### Ready to file

**`mirrored-axis-both-sides-positive`** — *imported.* Both halves count outward from a shared zero
and **both tick sets read as positive magnitudes**; the left side is never labelled negative, because
it is not a subtraction, it is the other group.

> **Six publications.** ONS dvc775 `400k 300k 200k 100k 0 | 0 100k 200k 300k 400k`; ONS dvc550
> `1 0.5 0 | 0 0.5 1`; StatCan `"0%"` × 8 tick labels; PopulationPyramid.net
> `10% 8% 6% 4% 2% 0% 2% 4% 6% 8% 10%`; OWID `70 Million 60 … 10 Million | 10 Million … 70 Million`;
> PopulationPyramids.org `394.6M 200.0M 100.0M 0.0M 100.0M 200.0M 300.0M 394.6M`; Ferdio
> `20% 10% 0% 10% 20%`. Seven records, six publications, **no dissent**. This is the most solidly
> evidenced single fact in the family and the type sheet already asserts it.

**`comparison-state-as-an-outline`** — *imported.* A second population — another date, another
geography — is drawn as a **bare outline tracing the same mirrored geometry over the filled bars**,
rather than as a second pair of bars or a second panel. Where the two agree there is nothing to see;
the line only leaves the fill where they differ.

> **Two independent publications, and the construction is identical in both.**
> ONS dvc775: `fill rgb(5, 61, 88)` × 199 (2018, one path per one-year band) and
> `stroke rgb(36, 167, 155)` × **2** (2043).
> StatCan: `fill rgb(175, 175, 175)` × 202 and `stroke rgb(110, 78, 163)` × **2**.
> **Exactly two strokes in both** — one continuous silhouette per side, not a stroke per band. That is
> what makes the overlay read as a shape over a shape instead of as noise. Two national statistical
> offices, two continents, two vendors: independent.
>
> **The caveat, stated.** StatCan's harvested state is its default, *Canada vs Canada — 2021*, so the
> outline traces the fill exactly and the record shows the *mechanism* rather than the mechanism
> doing its job on two different populations. ONS dvc775 shows it working. The treatment rests on ONS
> for the demonstration and StatCan for the independence.

**`name-each-half-in-words`** — *imported.* The two groups are named **in words, at or inside their
own half**, not keyed by a swatch legend. Colour distinguishes the halves; it does not have to carry
their identity, because the mirrored position already does.

> **Four publications for, one against.** PopulationPyramid.net: `Male` / `Female`,
> `sans-serif | 16 | 400` × 2, at the head of each half. OWID: `Men` / `Women` at display size at the
> foot of each half, across nine series, **with no legend anywhere on the plate**. ONS dvc550:
> `Male` / `Female`, `Open Sans | 15 | 600` × 4 — twice, once per panel. ONS dvc775: `Males` /
> `Females`, `Open Sans | 12 | 500` × 2, set small and grey *inside* the plate beside the gutter.
> Against: PopulationPyramids.org uses a swatch legend above the plate, and is the one record here
> whose halves have no other identification at all. Ferdio's specimen names neither half.

**`open-top-band-as-an-inequality`** — *imported.* The top age band is named as an inequality rather
than given a fictional ceiling, because the tail is real and open.

> **Three publications.** ONS: `90+` (dvc550) and `110 and over` (dvc775) — the same desk writing it
> two different ways. PopulationPyramid.net: `100+`. PopulationPyramids.org: `100+`.
> Ferdio's specimen closes at `70-80`, which is the tell that it is a specimen: a drawing has no
> living tail to account for. The `histogram` family reaches the same convention independently on
> Figure.NZ (`$1m and over`), which is corroboration from outside this family and is noted, not
> counted.

### Real, and short of evidence

**`the-ordered-axis-does-not-have-to-be-in-the-centre`** — *this is the harvest's most useful
finding, and it contradicts the type sheet.*

`skills/chart-beat/references/types/population-pyramid.md` states as a requirement: *"The category
(age) labels sit in a reserved gutter down the centre, between the two sides, never printed over a
bar."* Measured across six publications:

| centre gutter | left margin |
| --- | --- |
| ONS dvc775 (`1 … 101`, `110 and over`) | PopulationPyramid.net (`100+ 95-99 …`) |
| ONS dvc550 (`Age` written over the gutter) | PopulationPyramids.org (under a rotated `Age Groups`) |
| StatCan (`10 … 100`) | OWID (`10 years … 90 years`) |
| | Ferdio's specimen (`0-10 … 70-80`) |

**Two publications draw the gutter; four do not.** The type sheet asserts the minority practice as a
rule. The part of it that survives is the second clause — *never printed over a bar* — which all six
obey. The proposal is to replace the requirement with the constraint: the ordered axis gets a
reserved column of its own, and whether that column is between the sides or beside them is a
composition decision, driven by what the centre is needed for. PopulationPyramid.net gives the centre
to a value label on every band; OWID gives it to nine converging envelopes. **Neither has a centre to
spare.**

This is not filed as a treatment because it is a *correction to a type sheet*, and the type sheet is
outside this harvest's write scope. It is put here for whoever owns that file.

**`value-label-on-every-band`** — *imported, one publication.* PopulationPyramid.net prints the
percentage at the end of every bar on both sides — `sans-serif | 10 | 400` × 106, sample `"3.9%"` —
so the chart is also a table and nothing is estimated against the axis. Twenty-one bands × two sides
is the upper end of where it stays legible. **One publication. Not filed.**

**`half-opacity-fill-under-a-full-strength-outline`** — *imported, one publication.* ONS dvc550, and
the arithmetic is exact: the style route reports `fill rgb(0, 128, 128)` and `fill rgb(95, 118, 130)`;
the pixel route's leading entries are `#80BFBF` and `#AFBAC1`, which are those two colours at **50 %
over white to the integer**. The full-strength colour appears only as `#008080` at 0.500 % — the
silhouette `stroke`, four of them. The mass stays quiet and the outline stays crisp.
**One publication. Not filed.** It is a near neighbour of `comparison-state-as-an-outline` and the
two may turn out to be one idea seen twice.

**`the-outer-tick-states-the-domain`** — *imported, one publication.* PopulationPyramids.org labels
the outermost tick on each side with the data's own maximum — `394.6M`, twice — rather than rounding
up to a clean number, so the reader can see how much of the axis the longest band actually uses.
Nothing else in this family does it. **One publication. Not filed.**

**`spend-the-only-colour-on-the-comparison`** — *imported, and it is probably two publications, but
it is not filed on this evidence.* StatCan's plate is 32.501 % achromatic `#AFAFAF` and 0.717 %
chromatic `#6E4EA3`, and the purple is a line. ONS dvc775 is 22.824 % of one navy at hue 199.5, with
its entire second colour — the teal `rgb(36, 167, 155)` — carried by two hairline strokes and a
legend swatch, too thin to enter the pixel route's top six at all. Both spend their one accent
entirely on the thing being argued. **It is not filed because it is the same two records as
`comparison-state-as-an-outline`, restated as a colour rule** — the evidence floor counts
publications, and two treatments resting on the identical pair of records are one treatment with two
names until a third desk separates them.

### Refused

**Anything resting on Ferdio.** The Data Viz Project specimen is a *picture of a chart type* drawn
over invented numbers. Its red-and-navy pair (`#FF3F34` at 7.101 %, `#263252` at 7.073 %) is the
house pair on all hundred pages of `100.datavizproject.com` — a habit, which is what the floor exists
to exclude. It is filed for what it teaches about the geometry and it counts for nothing about
practice. The one number worth carrying out of it is arithmetic, not design: **the two halves cover
7.101 % and 7.073 % — 0.028 points apart** — which is a usable sanity check on any pyramid this
design base draws.

**Anything resting on `record.pixel` for the two contaminated records.** See below.

---

## Directions proposed

A direction needs one reference, being a coherent whole.

**`the-statistical-office-plate`** — from `ons-…-dvc775-fig13-simplepyramid`.
One hue and one accent, and the accent is two lines. Ground `#FFFFFF` at 58.439 %; a single navy
`#053D58` at 22.824 % carrying the whole of the data; **every one of the six leading chromatic
entries inside 0.2° of hue 199.5**, which is why the classifier calls the plate `sequential` when it
plainly holds two series. The second series is `rgb(36, 167, 155)`, and it exists as exactly two
strokes and one legend swatch. Type: `Open Sans | 12 | 400` × 107 in pure black — **one size and one
weight for every label on the plate**, ticks and bands and legend alike; the only thing set larger is
the source line at `16 | 700`. Furniture is three greys under half a per cent each. A whole published
design in one hue, one accent, one type size, and no gridlines.

**`the-ramp-read-as-time`** — from `ourworldindata-org-global-population-pyramid`.
The opposite pole, and the family's upper bound: nine dated populations as nested silhouettes,
ground down to `#FEFEFE` at 36.04 % — against ONS's 58 % and Ferdio's 82 % — because nine series is
simply a lot of ink. Three hue clusters at 225 (17.71 %), 161 (13.15 %) and 65 (13.19 %), which the
classifier calls `categorical` and the plate uses as a **sequence**: navy → teal → chartreuse, oldest
to newest, with the projected years at the light end so "this has not happened yet" is legible before
the caption is read. Eighteen direct labels on the shapes, on both halves, and **no legend anywhere**.
A ranked margin list — median age at five dates, in shape order — answers what the shapes only imply.

> This is the same plate as a `histogram` record. The direction is proposed once; whoever files it
> should cite one reference and note the dual filing.

---

## The defect this family is for

**Two independent publications in a family of six were measured through an unhandled consent overlay,
and both records reported `ok` on both routes with `consent: null`.**

| | `populationpyramid.net` | `populationpyramids.org` |
| --- | --- | --- |
| graphic | `svg` 595 × 536 | `canvas` 1104 × 500 |
| `consent` | `null` | `null` |
| routes | `style ok, pixel ok` | `style ok, pixel ok` |
| reported ground | `#C8C8C8` at **51.619 %** on a white plate | `#FFFFFF` at 49.547 %, mostly the modal's panel |
| leading chromatic | `#6C8AA3` 5.211 % — steelblue through grey | `#4CAF50` **1.256 % — the green *Tout accepter* button** |
| the panel | French, *Utilisation de Cookies et de Données Personnelles*, *Refuser tout* / *Tout accepter* | the same French panel, the same buttons |

Two unrelated sites, the same consent vendor, the same French copy, the same silent failure. The
harvester's dismisser knows OneTrust, Didomi, Quantcast and Sourcepoint and does a narrow text match
on buttons; **it matched none of these, three times on one url and once on the other.**

`METHOD.md` correction 3 says a modal contaminates silently and correction 15 says an arithmetic
guard is blind to contamination that *scales* with what it contaminates. This overlay does both at
once: it **multiplies** every colour on the plate, so `two-records-that-agree-exactly-are-both-wrong`
cannot see it — no two shares are equal, they are each scaled by a different amount over a different
clip. What caught it was a person looking at `#C8C8C8` at 51.62 % on a chart that is obviously white,
and then at a bar chart whose biggest colour is a button.

Both records are kept, both quote **no** colour, and both say why in their own `## What was not
verified`. The one adjacent finding: `populationpyramids.org`'s graphic is a `<canvas>`, so even with
the overlay gone **neither route could read its marks or its type**. Fixing the dismisser recovers
one of the two, not both.

---

## What a second wave should target

1. **The dismisser, first.** The French panel above is worth one narrow addition — it is a
   standardised vendor wall in front of two of this family's six publications, and it is the
   difference between a contaminated record and a clean one on the canonical page of the form.
2. **More chart-tool permalinks, from desks that are not ONS.** `datawrapper.de/_/<id>/` was not
   reached here; the Academy article carries its charts inline. Eurostat, Destatis, the US Census
   Bureau and the ABS all publish this form openly and none of them was reached at a permalink.
3. **A newsroom pyramid.** All seven records are from statistical offices, dedicated demography
   sites, or a chart catalogue. **Not one is from a newsroom**, and six url-list attempts produced
   none. The family has no evidence at all about how this form is drawn when it has to carry an
   argument rather than a dataset — no annotation, no highlighted cohort, no callout. Every treatment
   above is about the apparatus, and that is the shape of the gap.
