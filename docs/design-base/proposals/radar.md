# Proposal — the radar / spider / polar-profile family

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/` or `registers/`, and nothing has been rendered.

**Family definition used:** three or more axes radiating from one shared centre, each item's
readings on those axes forming a closed shape or a ring of wedges, where the READ is the shape. The
polar-area variant (equal-angle wedges, radius carries value) is included, because the three desks
that draw it call it a radar and use it for the radar's job. Excluded, after looking: circular bar
charts and polar dot arrangements, which are bar charts bent round a circle; star glyphs whose spoke
COUNT is the value; and triangle/perimeter charts with no centre and no shared radial scale. Four
`100.datavizproject.com` pages were rejected on exactly those grounds.

**This family started from zero references.** It also started with a warning: the tree's own
`skills/chart-beat/references/types/radar.md` is largely a list of the form's failure modes, and
most of the design literature agrees. The instruction was to measure what desks publish rather than
argue from principle. What follows is that measurement, and it comes out **for** the form — but only
in one professional neighbourhood, and only when the desks pay for it in a specific way.

---

# 0. How the pool was drawn, and what it cost

## 0.1 `100.datavizproject.com` — one hundred pages, one radar

The only archive indexed by FORM, and the only one from which a family can be drawn deliberately
(`METHOD.md`, correction 2). Its 300 px thumbnails were downloaded for **all one hundred pages** —
the 72 not previously harvested and the 28 already in the corpus — assembled into four contact
sheets and **looked at**. That triage is the cheap version of runbook step 3 and it is worth
recording as a technique: one hundred pages of a form-indexed archive can be classified from
thumbnails in four Read calls, and the two candidates it produced were both correct calls about what
the page contained.

Exactly **one** page draws a radar: `#81`. One more, `#32`, was harvested on the thumbnail's
evidence and turned out to be a triangle whose three EDGES are bars — no centre, no radial scale. It
was deleted rather than filed. `#13` (star glyphs, spoke count = value), `#52`, `#91`, `#92` (area
triangles and diamonds), `#14`, `#20`, `#59`, `#94` (circular/polar but bar- or dot-encoded) were
rejected from the thumbnail and never harvested.

**One radar in one hundred encodings of one dataset is itself a finding.** A studio commissioned to
exhaust the space of ways to draw three countries' World Heritage counts reached for a radar once.

## 0.2 `~/Downloads/infoviz-source-urls-alive.txt` — zero

`grep -iE "radar|spider|star-plot|polar"` over 3 827 urls returns four hits, all of them the word
"polar" in *polarization* and *polar vortex*. **Nothing was drawn from this pool and nothing was
harvested from it.** Correction 2 says a keyword filter selects a subject and never a form; here it
did not even select a subject.

## 0.3 Search — the seam, and it is one profession wide

Ten candidates were found with WebSearch. (`~/.claude/scripts/search.sh` was tried first and
returned `results: []` on every query for the whole session while the container was up — thirteen
sibling harvests were on it at once. Noted so the next wave does not read the zero as a finding
about the web.) These records carry `archive: "url-list"` because the enum has four values and none
of them is "search"; they were **not** drawn from the url-list file.

**The search itself is evidence.** A general query for published radar work returns chart-tool
marketing — Flourish, Canva, AnyChart, Highcharts, Plotly, a dozen "free radar chart maker" pages —
plus the design literature's standing objection (`data-to-viz.com/caveat/spider.html`, and a piece
titled *Radar plots must die*). Queries scoped to news desks return the phrase "under the radar" and
no charts. **Mainstream newsrooms are not in this pool at all.** What is in it is football
analytics, and there the form is not a novelty but institutional furniture: the two desks that own
it — StatsBomb and Opta — have each published explainers about their own radar, revised its design
across a decade, and shipped it as a product.

Also refused along the way, and worth naming:

- **`jfresh.substack.com` player card** — hockey's most widely circulated player profile. It reached
  its graphic and the graphic is a **grid of percentile tiles**, not a radar. Deleted, not filed.
  The nearest analytics culture to football's chose the other encoding for the same job.
- **`v-dem.net/data_analysis/RadarGraph`** — a research institute's Country Radar Chart tool. It
  loaded and said *"No data selected."* A new failure mode for the log, distinct from corrections 10
  and 12: not a door in front of the graphic, but a **form** the graphic does not exist without. The
  entry-click handler cannot help; the harvester would have to make an editorial selection.
- **`oecdbetterlifeindex.org`** — Cloudflare "Vérification de sécurité en cours". A site declining
  automated reading. Not worked around.
- **`skillcorner.com`** — hero title card plus a consent bar the handler did not match.
- **`statsbomb.com/2014/01/radar-love-…`** — 301s to a Hudl sales contact form. The article survives
  only on `blogarchive.statsbomb.com`, which is where both filed StatsBomb records come from.

## 0.4 Yield

| family | archive | drawn | harvested | survived looking | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| radar | datavizproject | 100 | 2 | 1 | 1 |
| radar | url-list (the file) | 3 827 | 0 | 0 | 0 |
| radar | url-list (search) | 10 | 10 | 5 | 5 |

**Twelve harvested, six reached a real radar: 1 in 2**, against the 1-in-3 the log records for news
domains. Not because the harvester improved — because the pool was drawn almost entirely from desks
whose entire business is publishing this chart openly. The moment the pool leaves those desks
(OECD, V-Dem, SkillCorner, a redirected blog) it returns nothing.

**Six records, three publications:** `100.datavizproject.com` (Ferdio, 1), `blogarchive.statsbomb.com`
(StatsBomb, 2), `theanalyst.com` + `dataviz.theanalyst.com` (Opta Analyst, 3 — one publication, read
off the host, per correction 4).

---

# 1. Proposed treatments — `imported`, and evidenced

Every treatment below cites records from **two or more distinct publications**, independence read
off the url host.

## 1.1 `radius-carries-a-printed-quantity` — the one rule the whole family obeys

- kind: imported
- applies: every radar, always
- draws: value, scale
- evidence: `100-datavizproject-com-data-type-viz81`
- evidence: `blogarchive-statsbomb-com-articles-soccer-understanding-statsbomb-rada`
- evidence: `blogarchive-statsbomb-com-articles-soccer-introducing-and-explaining-f`
- evidence: `theanalyst-com-articles-introducing-opta-radars-compare-players`
- evidence: `theanalyst-com-articles-opta-player-radars-comparison-tool`
- evidence: `dataviz-theanalyst-com-player-comparison-radars`
- publications: 3
- detect: every spoke in the delivered artifact resolves to at least one numeral — a tick label on
  the spoke, a value printed in or beside its mark, or a row in a companion table keyed to that
  spoke's name. A spoke with no reachable number is a failure.

**Six records out of six, three publications out of three, by four different mechanisms.** This is
the strongest single result of the harvest.

- Ferdio (`#81`) runs dashed ticks outward along each of three spokes and prints `5 / 10 / 15`.
- StatsBomb (Kane) prints **each spoke's own full scale in its own units** along the spoke — `0.57
  0.52 0.48 …` for xG, `3.9 3.7 3.4 …` for Shots — and then repeats every value as a percentile in
  a companion column.
- StatsBomb (Lahm) does the same on the plate and adds a **two-row value table underneath**
  (`TK 3.3 · INT 2.71 · P% 89.67 …`).
- Opta, in all three records, **prints the percentile inside the wedge**: `92`, `80`, `19`, `1`.

Not one of the six asks a reader to judge a radius by eye. The type reference calls the shape "the
read"; what these desks actually publish is a shape **with the numbers on it**, and the shape is the
index into the numbers rather than a substitute for them.

**This is where the anti-radar literature and the practice actually part company.** The objection is
that area is a bad channel and axis order distorts it. Every desk here agrees, implicitly, and pays
the same price: the geometry gets you to the right spoke, the numeral tells you the value.

## 1.2 `value-on-the-mark` — already filed; radar is its strongest case

`docs/design-base/treatments/value-on-the-mark.md` exists, cites Ferdio `viz1` and Information is
Beautiful, and its stated rationale — *"an encoding that trades accuracy for shape owes the reader
the numbers it gave up"* — is written as if for this family.

**Proposed: add the three Opta records as evidence.** They carry something the two existing citations
do not: the **bottom of the scale**. On `dataviz-theanalyst-com-player-comparison-radars`, Goals sits
at the 1st percentile and Aerials Won at the 3rd. As geometry these are slivers a few pixels deep
with the numeral floating outside them; the mark is unreadable and the number is not. On
`theanalyst-com-articles-introducing-opta-radars-compare-players` a **zero** is drawn as no wedge at
all. Between those two plates the whole low end of a polar-area encoding is documented, and the rule
that saves it is this one.

## 1.3 `the-ceiling-is-drawn`

- kind: imported
- applies: any radar whose radius is a percentage, a percentile or a bounded index
- draws: scale
- evidence: `theanalyst-com-articles-introducing-opta-radars-compare-players`
- evidence: `blogarchive-statsbomb-com-articles-soccer-understanding-statsbomb-rada`
- publications: 2
- detect: the outermost gridline of the delivered artifact is drawn and is the scale's declared
  maximum; a radar whose furniture stops short of its own top of scale fails

Opta's 2023 static plate draws a **light full circle at the 100th percentile** with dashed rings
inside it, so every wedge is read against a visible top. StatsBomb's concentric rings terminate at
the top of each spoke's printed range and the outermost is drawn.

**And this family carries its own counter-example, which is why the rule is worth filing rather than
assuming.** `dataviz-theanalyst-com-player-comparison-radars` is the same Opta instrument with the
card furniture stripped: no ring, no ceiling. On that plate `89` and `91` are visibly the long ones
and there is no way to see whether `61` is near the top or the middle. Same desk, same design, same
day; the only difference is one light circle, and the reading is measurably worse without it.

## 1.4 `the-population-is-captioned`

- kind: imported
- applies: any radar whose radius is a rank, a percentile or a comparison against a peer set
- draws: annot
- evidence: `theanalyst-com-articles-introducing-opta-radars-compare-players`
- evidence: `theanalyst-com-articles-opta-player-radars-comparison-tool`
- evidence: `blogarchive-statsbomb-com-articles-soccer-understanding-statsbomb-rada`
- publications: 2
- detect: the delivered artifact carries a text run naming the comparison population and its
  qualifying threshold, within the graphic's own bounds — not in the article prose around it

Opta's static plate: *"Percentile comparison vs. top five European league forwards over the last 15
years (1,350+ minutes)"*, under the chart. Opta's tool: *"Defender template. Percentile rank vs
defenders with at least 500 minutes played"*, on the card. StatsBomb's Kane plate carries season,
competition, `36.7 90s played (35 appearances)` and the template's name across the top.

A percentile with no stated population is not a measurement, and the two desks that live off
percentile radars both put the denominator inside the picture, because the picture is what leaves the
page.

## 1.5 `a-companion-panel-answers-what-the-shape-cannot`

- kind: imported
- applies: a radar carrying a single item's profile
- draws: value, annot
- evidence: `blogarchive-statsbomb-com-articles-soccer-understanding-statsbomb-rada`
- evidence: `blogarchive-statsbomb-com-articles-soccer-introducing-and-explaining-f`
- evidence: `theanalyst-com-articles-opta-player-radars-comparison-tool`
- publications: 2
- detect: the delivered artifact contains a second panel, keyed to the same spoke names, carrying a
  reading the radial geometry does not encode

**The generalisation is looser than the other four and the looseness is stated here rather than
hidden.** StatsBomb pairs the radar with **twelve density ridges** — the whole population per metric,
the player's mark on it, the percentile printed (`0.48 P89`) — which is rarity, a thing a radius
cannot say. The Lahm plate pairs it with a value table, which is the cheap version. Opta's tool pairs
it with a **similarity table** — the four players whose shapes are nearest, with a percentage — which
is not rarity but neighbourhood.

What the three share is the structural claim: **a radar is one panel of a two-panel object.** What
they do not share is what the second panel says. The parent may reasonably decide this is two
treatments (`paired-distribution`, `nearest-profiles`), each on one publication and therefore neither
fileable — that is the honest alternative and it is recommended if the generalisation feels forced.

---

# 2. Proposed treatments — real, and **not fileable**: one publication each

Each of these is plainly a designed decision, and each rests on a single desk. Per correction 4 they
are **not** proposed for filing. They are recorded so a second wave knows what to target: not more
radars, radars **from elsewhere**.

| candidate | what it is | evidence | publication |
| --- | --- | --- | --- |
| `wedges-not-a-polygon` | equal-angle filled wedges instead of a joined perimeter, so a zero can be drawn as absence rather than as a vertex | 3 Opta records | Opta only |
| `spokes-grouped-and-the-groups-named` | colour blocks the circle into metric families and the family names (`ATTACKING / POSSESSION / PHYSICAL`) are printed at the hub — the direct answer to the axis-order problem | `theanalyst-com-articles-introducing-opta-radars-compare-players` | Opta only |
| `outline-not-fill-when-shapes-overlap` | two closed unfilled perimeters with vertex dots, so the enclosed shape stays wholly readable | `100-datavizproject-com-data-type-viz81` | Ferdio only |
| `bowed-edge-between-spokes` | the perimeter bows outward between vertices, so the edge reads as a link and not as interpolation between two spokes | `100-datavizproject-com-data-type-viz81` | Ferdio only |
| `spoke-named-by-an-icon` | a flag disc beyond the outer tick instead of a rotated word | `100-datavizproject-com-data-type-viz81` | Ferdio only |
| `family-colour-lightened-before-a-numeral-is-set-on-it` | declared `rgb(229,32,47)` / `rgb(250,165,26)` / `rgb(158,7,174)`, painted `#EB5863` / `#FBBB53` / `#B645C2` — the source triad is lightened at draw time so white numerals survive on it | `theanalyst-com-articles-opta-player-radars-comparison-tool`, `dataviz-theanalyst-com-player-comparison-radars` | Opta only |

**`wedges-not-a-polygon` is the one to chase.** It is the largest single design divergence in the
family and it fixes a real defect — on a joined polygon a near-zero still contributes a visible edge,
on wedges it vanishes honestly — and it is one desk's house style until a second one is found.

---

# 3. Proposed treatments — `derived`

Facts the beat's own data or geometry carries. Each owes a `detect` and a `provenBy`; **no
`provenBy` exists yet**, because this harvest rendered nothing. They cannot be filed until one does.

## 3.1 `axis-order-is-declared`

- kind: derived
- draws: scale
- detect: the spoke order in the delivered artifact equals the order declared in the beat's own
  field list; a radar built from an unordered map or an object with no stated key order fails
- provenBy: — (not rendered)

The type reference names this as the form's structural weak point: polygon AREA moves with axis
order and count while the numbers do not. The beat's data already carries an order; the failure is
that nothing currently forces the drawing to be a function of it rather than of iteration order. This
is derived, not imported, because the fact is in the beat.

## 3.2 `a-reversed-spoke-prints-its-numbers`

- kind: derived
- draws: scale, value
- detect: any spoke whose declared direction of goodness is inverted carries a printed scale or a
  printed value; a reversed spoke drawn bare is a failure
- provenBy: — (not rendered)

Measured on `blogarchive-statsbomb-com-articles-soccer-introducing-and-explaining-f`: Fouls,
Dispossessed and Dribbled Past run **inward-increasing** — `0.44` at the outside on Fouls — because
for those metrics more is worse. **Nothing on the plate announces it.** The inversion is legible only
from the printed sequence. A beat that declares `higherIsBetter: false` on a field already holds the
fact; the treatment is that the drawing must then be unable to omit the numbers.

## 3.3 `the-hub-is-a-hole`

- kind: derived
- draws: scale
- detect: the inner radius of the delivered artifact is greater than zero whenever the spoke count
  is six or more
- provenBy: — (not rendered)

Geometry, not taste: n wedge apexes or n polygon vertices converging on one point blot at n ≥ 6, and
a visible hub also makes it plain that the radial scale does not begin at the centre.
`dataviz-theanalyst-com-player-comparison-radars` punches a white disc for exactly this reason;
`100-datavizproject-com-data-type-viz81` marks its origin with a small arrowhead instead. The fact is
in the geometry, so it is derived rather than imported, and the two records are illustration rather
than evidence.

---

# 4. Proposed directions — one reference each

A direction is a coherent whole; `METHOD.md` step 5 gives it one reference because averaging two
would produce neither. Three are proposed; the parent may want only one, and **`percentile-wheel` is
the recommendation** if only one is taken, because it is the design a reader is most likely to have
already seen.

## 4.1 `percentile-wheel` — from `theanalyst-com-articles-introducing-opta-radars-compare-players`

Ground `#F7F7F7` at 75.15 % — a warm neutral card, not white. Three mark families at `#885BD2`
(262.8°), `#E26970` (356.4°), `#FD74AA` (336.2°), covering 4.48 / 2.73 / 2.57 %. Furniture at three
barely separated near-whites — `#F9F9F9`, `#F7F6F9`, `#F9F6F6` — so ring and gridlines sit almost at
the ground's own value and the plate is carried entirely by the wedges and their numerals. Type in
that record is the article's, not the graphic's, but the **instrument's own voice** is measured
directly on the sibling records: **Big Shoulders Text**, condensed, `14 / 400 / tracking 1.2 /
uppercase` for spoke labels, `24 / 700 / tracking 0.6` for the subject's name, `12 / 600` grey
`rgb(128,128,128)` for the period, with **IBM Plex Mono `12 / 800` uppercase** for table column
heads. Ink `rgb(29,10,48)`, a near-black violet.

The characteristic move: **near-invisible furniture, loud marks, every number set inside its own
mark.** It only works because of 1.1.

## 4.2 `instrument` — from `blogarchive-statsbomb-com-articles-soccer-understanding-statsbomb-rada`

Ground `#FFFFFF` at 78.43 %. One filled polygon at `#0B539F` (210.8°, 2.44 %) over a sand plate at
`#DEB887` (33.8°, 2.13 %) — a near-complementary pair the classifier reads as `diverging`. Grid in
two greys, `#DDDDDD` at **5.67 %** and `#CCCCCC` at 1.45 %. Warm accents `#DB2429` and `#171E64`
below 0.4 %.

The characteristic move: **the chart is a measuring instrument and looks like one** — full printed
scales on every spoke, a companion column of distributions, the denominator stated across the top.
It spends nearly six per cent of the plate on its own scaffolding and earns it.

The same publication's older plate
(`blogarchive-statsbomb-com-articles-soccer-introducing-and-explaining-f`) is the **before** picture
and is not proposed as a direction: `#CDCDCD` at **14.17 %** of the plate in grey bands, two club
colours at 8.49 % and 8.44 % on a single-item chart, ground down to 58.85 %. The generational change
is one number — grid ink cut from 14.17 % to 5.67 % — and it is the clearest argument in this family
that a radar's scaffolding is where the design lives.

## 4.3 `outline` — from `100-datavizproject-com-data-type-viz81`

Ground `#FFFFFF` at **98.53 %**. Two unfilled perimeters at `#ED5440` (6.9°, 0.128 %) and `#3274D8`
(216.1°, 0.101 %). Furniture two steps of near-white, `#D2DADC` 0.046 % and `#F2F4F5` 0.042 %
(the record's third neutral, `#FEF4F3` 0.031 %, is a tint of the red below the chroma floor). Ticks
and spokes at the very bottom of the ink scale.

The characteristic move: **a radar that is almost entirely paper.** Two hundredths of a per cent of
ink carries the whole figure. It is the opposite pole from `instrument` and it is only available
because the chart has three spokes and two shapes. It does not scale: at twelve spokes this
direction would be unreadable, which is worth writing into the direction rather than discovering
later.

---

# 5. What the pool taught

**1. The form is alive, and it lives in one profession.** Two desks — StatsBomb and Opta — have
between them published explainers about their own radar, revised it across a decade, shipped it as a
product with a save button, and built a similarity engine on top of it. That is not a chart type
being tolerated; it is a chart type being invested in. Any claim that the radar is simply a bad form
has to account for it.

**2. And nowhere else.** Zero hits in 3 827 newsroom interactives. One page in one hundred at
Ferdio. Nothing from a general news desk, in any language searched. The nearest neighbouring
analytics culture — hockey — reached its most-circulated player profile by choosing a **percentile
tile grid instead**. `skills/chart-beat/references/types/radar.md` says the form is for comparing a
small number of items across a small number of dimensions where shape is the read; the measured
answer is narrower than that. **It is for a repeated, templated profile of one entity against a
named peer population, published by a desk that draws the same chart every week.** A one-off radar in
a news story has no evidence behind it in this corpus.

**3. Every serious publisher of the form pays the same tax, and it is the numbers.** Six records,
three publications, four mechanisms, no exceptions (1.1). The literature's objection — that a radius
is a poor channel and area is worse — is not refuted by these desks; it is **conceded and paid for**.
This is the single thing the parent should take from the harvest.

**4. The axis-order problem has a published answer, and it is one publication short of filing.**
Opta groups spokes into named metric families, colours by family and prints the family names on the
plate. That converts an arbitrary order into a stated one. Nobody else in the pool does it.

**5. Two facts about measurement, for the log.**

- **A palette share is a property of a crop, not of a design.** The same Opta instrument, same desk,
  same day, reads `#B645C2` at **2.22 %** when the clip is a page-sized frame and at **15.69 %** when
  it is the bare 630 px SVG. Nothing was contaminated and nothing was wrong; the denominator changed.
  Correction 15 warns that `measuredFrom: "graphic.png"` is necessary and not sufficient. This is the
  benign twin of that warning: two honest records of one design disagree by a factor of seven, and
  only the graphic's own bounds explain it.
- **Declared marks and rendered pixels differ, systematically and on purpose.** Opta's SVG declares
  `rgb(229,32,47)` / `rgb(250,165,26)` / `rgb(158,7,174)`; the pixel route reads `#EB5863` /
  `#FBBB53` / `#B645C2`. The gap is not error — it is the design lightening each family so a white
  numeral survives on it. **A record that carried only the style route would have reported the
  saturated triad and been wrong about the plate**, which is the case for both routes, made from the
  other direction than the one `harvest.mjs`'s header comment makes it.

**6. Two failure modes to add to the log.** A tool that renders **nothing until a selection is made**
(`v-dem.net`) is not the door of corrections 10 and 12 — the entry-click handler cannot open it,
because what is missing is an editorial choice, not a click. And a **triage by thumbnail** over a
form-indexed archive is cheap and reliable enough to be the default first step for any family drawn
from `100.datavizproject.com`: one hundred pages, four Read calls, two candidates, both correct about
what the page contained.

---

# 6. What a second wave should target

Not more radars. **Radars from a fourth publication**, and specifically:

- a desk that draws **wedges rather than a joined polygon**, to file `wedges-not-a-polygon`;
- a desk that **names its spoke groups on the plate**, to file the axis-order answer;
- any radar at all **outside sports analytics**, because six records from three publications and one
  profession is a narrow foundation for a form the tree's own type reference already distrusts. The
  candidates that failed here — V-Dem, OECD, ESG scorecards — are the right neighbourhood and every
  one of them was blocked by a wall or a form rather than by not existing.
