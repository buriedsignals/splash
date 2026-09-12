# Proposal — the ranking family

Bump charts, ordered lists, league tables, brackets — anything whose subject is **position** rather
than magnitude. Harvested 2026-09-07, re-harvested 2026-09-08 after the graphic-picker repair
(`METHOD.md` corrections 13 and 14), and **re-harvested again after three further repairs** — the
fixed masthead inside the element photograph, the graphic the url actually names, and the
scrollytelling graphic the masthead repair had itself made invisible. Ten references filed under
`docs/design-base/references/ranking/`. Nothing outside that directory and this file was touched.

---

## What the three repairs changed

The second draft of this proposal was written on records that were themselves still wrong in three
places. All three are now fixed, and all three moved this family. What follows is the accounting,
with reference ids and hex values, before anything is proposed.

### Repair 1 — the masthead was inside the photograph, and on Ferdio it outweighed the chart

`element.screenshot()` scrolls its target into view, and a `position: fixed` nav is then painted over
the target's first rows. `withFloatingChromeHidden` now hides anything floating for the length of the
photograph and restores it after.

`100.datavizproject.com`'s panel starts 172 px down under a fixed nav, so **every Ferdio clip carried
2 472 px of solid `rgb(50, 116, 218)`** — about three rows of an 823 × 824 crop, and 0.365 % of
every frame. That figure is the harvester's own, recorded in `harvest.mjs`, and this family's
arithmetic reproduces it independently.
The arithmetic closes to three decimal places on all three records:

| record | blue, before | blue, now | Δ | ground, before | ground, now | Δ |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `100-datavizproject-com-data-type-viz2` | `#3274D9` 0.527 % | `#3274D8` 0.162 % | 0.365 % | 92.05 % | 92.416 % | +0.366 % |
| `100-datavizproject-com-data-type-viz40` | `#3274DA` 0.438 % | `#3274D8` 0.073 % | 0.365 % | 97.74 % | 98.103 % | +0.363 % |
| `100-datavizproject-com-data-type-viz89` | `#3274D9` 0.564 % | `#3274D8` 0.199 % | 0.365 % | 90.67 % | 91.039 % | +0.369 % |

Six independent deltas, all 0.363–0.369 %, all within rounding of 2 472 px in a 678 152-px crop. The strip sat
over white margin, so white gained exactly what blue lost.

**This reverses the second draft's reversal, and the reversal was the interesting half.** That draft
took `#3274DA` back from "nav-bar contaminant" to "the measured accent of the graphic itself, and it
is Sweden". Measured clean, both halves of that sentence are true at once and neither is the whole
truth: the graphic **does** draw Sweden in a blue of its own, and it is `#3274D8`, and on
`viz40` **83.3 % of the blue that record reported was the nav bar** (69.3 % on `viz2`, 64.7 % on
`viz89`). Three pixel rows of chrome outweighed an entire Swedish flag five to one. `METHOD.md`
correction 13's warning — "which happens to be the same blue the charts are drawn in" — survived one
repair and was still doing damage after it, and no eye could have caught it, because both the
contaminant and the subject are Sweden-blue.

The clean Ferdio accents, read off `graphic.png`: Denmark `#EE5440`, Sweden `#3274D8`, Norway
`#283250` (filed under neutral, being a navy), the Swedish cross `#EDCB41`. `#3274DA` and `#3274D9`
appear in no record in this family.

### Repair 2 — the largest graphic on the page need not be the piece the url names

This was **correction G** in the second draft, and it is fixed. Size still leads; among graphics of
comparable size (within `COMPARABLE_AREA_SHARE` = 0.75) inside the first two screens, the one the
page leads with wins. Records now also carry `style.graphic.documentTop` and
`style.graphic.nearTheTop`.

`informationisbeautiful-net-visualizations-major-llms-ranked-by-perform` measured a treemap five
screens down — *What are people using ChatGPT for?*, `img 1280 × 903` at `y: 5248`, a different IIB
piece and not a ranking. It now measures **`iframe 1380 × 830 at documentTop 164`, the piece the url
names**, and it carries a **third `graphicFrame`** in this family. Its palette is entirely new and
none of the old one survives:

| what died | what replaced it |
| --- | --- |
| ground `#A3D393` 21.24 % (the treemap's green) | ground `#FFFFFF` **89.717 %** |
| `#F9A223` 21.13 %, `#FFD83D` 16.80 %, one hue cluster at 36° holding 49 % of the plate | eight chromatics, one per named category, none above 0.31 %: `#595D9D` 0.301 %, `#F5854E` 0.266 %, `#AC65AD` 0.266 %, `#FFE433` 0.220 %, `#DD67A1` 0.147 %, `#D15549` 0.085 %, `#33A59D` 0.050 %, `#7EC46B` 0.046 % |
| `style.type` = IBM Plex Sans / Quicksand, the publisher's article furniture | `style.graphicFrame.type` = **Inter Tight**, ten tuples, on `vizsweet.com` |

That record is the largest single gain of this pass and a direction is proposed from it below.

### Repair 3 — the graphic and its holders are exempt from repair 1

A scrollytelling graphic is itself `position: sticky`, and repair 1 hid it: ABC's canvas came back
97.76 % cream, zero chromatic. The graphic and whatever contains it are now exempt, and the graphic
is given `GRAPHIC_SETTLE_MS` = 2 500 ms to draw after being scrolled into view.

**No record in this family is scrollytelling, and none regressed.** What the settle *did* buy here is
that all three `vizsweet` frames now render fully before they are photographed.

### And correction H — the modal — is fixed, incidentally, which is not the same as handled

`informationisbeautiful-net-visualizations-top-500-passwords-visualized` carried a newsletter modal
into a corrected record: `#FFFFFF` at 9.75 % was the modal's white panel, `#F06292` at 1.73 % its
pink border. **Neither hex appears anywhere in the record now**, and the poster is no longer under a
scrim: sampled directly, `graphic.png` reaches `#E3E3E3` in the title and `#CD3029` in the legend's
first swatch, so nothing is dimming it.

It was not fixed by anything aimed at modals. `withFloatingChromeHidden` hides **every**
`position: fixed | sticky` element, and a newsletter modal is one. A modal that is `absolute`, or in
the normal flow, would still be photographed. The correction is kept below in that narrower form, and
what it asked for — a record able to say which of its two routes is contaminated — still does not
exist.

### What died in this pass

| hex | cited as | what it was |
| --- | --- | --- |
| `#3274DA` 0.438 %, `#3274D9` 0.527 % / 0.564 % | "the measured accent of the graphic itself, and it is Sweden" | 64–83 % nav bar. Sweden is `#3274D8` at 0.073 / 0.162 / 0.199 %. |
| `#A3D393` 21.24 %, `#F9A223` 21.13 %, `#FFD83D` 16.80 % | the LLM record's palette, already named as another piece's | another piece's, and now gone: that record measures its own frame. |
| `#FFFFFF` 9.75 %, `#F06292` 1.73 % | the passwords record's modal panel and border, named as contamination | gone. The floating-chrome repair removed them. |
| `#CD4932` 1.43 %, `#F2ECE2` 31.57 %, `#49227C` 0.68 % | NPR's accent, header field and sponsor advert — cited in that record's `NOTES.md` | all three were whole-page readings. That record's pixel route now measures a 240 × 362 book cover and founds none of them. See correction J. |

### What survived unchanged, and it is most of the family

- **All four imported treatments and all three derived ones.** Not one rests on a colour.
- **`espn-com-espn-feature-story-id-23519390-espn-world-fame-100-2018`, to the third decimal.** Ground
  `#1C1B1B` 34.444 %, `#F0B74B` 0.296 %, the eight skin-and-jersey chromatics, `shape: sequential`,
  one cluster at 39°. Its graphic is still `img 441 × 248 at documentTop 351`. ESPN's masthead is not
  in the crop and never was.
- **`informationisbeautiful-net-visualizations-which-is-the-best-performing`**, the `console`
  reference, to the third decimal: `#26232C` 93.827 %, clusters 48° 0.382 % / 110° 0.188 % /
  199° 0.051 %, `#FED63E` 0.110 %, `#64BB52` 0.074 %, `#CC472E` 0.037 %, `#F05337` 0.031 %,
  `#0399DC` 0.026 %.
- **`informationisbeautiful-net-visualizations-best-in-show-whats-the-top-d`**: `#F7F1E1` 81.823 %,
  `#A13330` 0.947 %, `#50447A` 0.875 %, `#D7856A` 0.853 %, `#739458` 0.585 %, `#6E2037` 0.387 %,
  `#B7881F` 0.342 %, furniture `#364E4D` 1.393 %.
- **`projects-propublica-org-graphics-ncaa-bracket-2017`**: pixel route still `not-applicable`, and
  still right.
- **The arithmetic guard still passes.** Grouping all ten records' chromatic and neutral lists and
  comparing `(hex, share)` pairs returns **zero** cross-record duplicates. Hex-only collisions are
  five, and all five are inside the three Ferdio records, which is one house drawing one dataset in
  one palette — the correct answer, not a contaminant.

---

## The harvest, in numbers

| archive | drawn | harvested | survived reading | filed |
| --- | ---: | ---: | ---: | ---: |
| url-list | 21 | 21 | 3 | 3 |
| informationisbeautiful | 5 | 5 | 4 | 4 |
| datavizproject | 6 | 6 | 3 | 3 |
| **total** | **32** | **32** | **10** | **10** |

*(The second draft's table said 2 for url-list and did not sum to its own total of 10. The url-list
survivors are ProPublica, ESPN and NPR — `apps-npr-org-best-books-2013` carries `archive: url-list`.
Corrected here.)*

Every one of the 32 came back `style ok, pixel ok`. Twenty-two of them had not reached a ranking.

**What the 22 actually were:** nine full-bleed hero photographs or title illustrations (ESPN ×6,
Pudding, Radio-Canada, ABC, Politico, Globo's 3D render); three dead or unstyled shells (ESPN's 2017
NFLRank returned a bare footer, Globo's *corrida dos 100 gols* returned an unstyled `globo.com`
wordmark, Público returned "Página não encontrada"); one redirect (`projects.fivethirtyeight.com`
now lands on the ABC News homepage); one consent/notification dialog over an opening (Guardian, La
Nación); three Ferdio encodings that turned out not to be rankings (a pairwise difference matrix, a
change scatter, an illegible before/after wedge); one duplicate form from a desk already
represented; and **one failure mode that is not in `METHOD.md`** — see correction D below.

**Of the ten filed, what each one now measures.**

- **Seven found colour on their own graphic**: the three Ferdio charts, IIB's *Best in Show*, IIB's
  Marvel scatter, IIB's LLM scatter (new this pass), IIB's passwords cloud (whose colour is
  nonetheless unusable — see the refusal).
- **One founds a single accent from a photograph**: ESPN, `#F0B74B` 0.296 %.
- **One founds nothing**: `apps-npr-org-best-books-2013`, whose graphic is a 240 × 362 book cover.
- **One reports honestly that it has none**: `projects-propublica-org-graphics-ncaa-bracket-2017`, an
  HTML bracket, and it is the only such record in this family.

**Where the yield went, and it is a domain fact worth recording.** ESPN alone accounted for 7 of the
22, and 6 of the 7 failed the *same* way: an ESPN feature opens on a full-bleed hero and puts its
ranking below it. ESPN publishes rankings constantly and serves openly, and it is still nearly
unharvestable by this harvester. The one that worked — *World Fame 100* — is the one whose ranking
starts inside the first viewport.

**And this family draws better from a url list than `METHOD.md`'s correction 2 predicts.** That
correction says a keyword filter selects a SUBJECT and never a FORM. For ranking the two coincide:
`rank`, `top 100`, `best`, `bracket`, `medallero`, `ranking das escolas` all name an ordering. The
form-indexed draw was still the most exact — `100.datavizproject.com` carries a `property-position`
facet, and 14 of its 100 pieces carry `property-position` **and** the overtake story
`story-denmark-norway`, which is precisely this family. See correction F.

---

## What `reference-set.md` row 7 already covers, and what it does not

Row 7 (*deviation from a local expected rank*, The Pudding, NBA redraft) settles **which entry in a
ranking deserves emphasis**: anchor each entry to its own rank-specific expectation, not to the
extremes. That lesson is filed and this harvest does not duplicate it.

It says nothing about four things that turned out to be where the published work actually is:

1. **How a reader finds a named entry in a long list.** Row 7's chart has two hundred entries and
   the lesson is about which of them to colour, not how to reach one.
2. **How membership change — entries and exits — is drawn.**
3. **That a composite rank must show what it is made of.**
4. **That the criterion itself can be a control the reader turns.**

All four are addressed below, and all four survive all three repairs intact.

---

## Treatments proposed

### 1. `ranking-shows-its-ingredients` — **imported**, ready to file

- kind: imported
- name: A ranking built from a composite score names the components that produced it
- applies: the beat's rank field is derived from more than one input
- draws: `body` (the declaration form) · `value` (the per-entry form)
- priority: 9
- evidence: `projects-propublica-org-graphics-ncaa-bracket-2017` — the standfirst
  (`Tiempos Text | 15 | 400`, 43 runs) names all five factors, above the bracket
- evidence: `espn-com-espn-feature-story-id-23519390-espn-world-fame-100-2018` — every card carries
  three labelled figures: 18 runs of `Publico Text Web | 14 | 700` in `rgb(217, 217, 217)`, six
  visible cards × three figures, under grey labels in `bentonsans | 11 | 400`
- evidence: `informationisbeautiful-net-visualizations-best-in-show-whats-the-top-d` — a six-icon
  legend at the origin of the axis it makes, headed "our data score" (intelligence, costs, longevity,
  grooming, ailments, appetite), read off the graphic itself rather than off the page
- detect: for a beat whose rank is composite, the delivered artifact carries **either** a text run
  naming each input, **or** a per-entry group of runs equal in number to the inputs. Neither present
  = failure.

**Three independent publications**, on three different continents, in three different forms — prose
above, per-entry below, legend inside. That range is what makes it a practice rather than a habit.

**What three repairs changed here: nothing, and that is the point.** All three citations are counts
of text runs and one visual reading of a poster. None of them touched a palette, which is why none of
them moved when every Ferdio palette in the family did.

**Why it matters more here than elsewhere.** A ranking is an assertion the data does not make on its
own: someone chose the weights. ESPN's own card shows why the declaration is not decoration — read
off the capture, Ronaldo is first on `100 / $40m / 121.7m`, LeBron second on `63 / $55m / 40.8m`,
Messi third on `134 / $25m / 88.1m`, and **no single column is monotone down the first three ranks**.
Printing the parts is what lets a reader disagree with the order, which is the difference between a
ranking that argues and one that asserts.

### 2. `rank-is-printed-on-the-entry` — **imported**, ready to file

- kind: imported
- name: An entry's position travels with the entry, not only with its slot
- applies: the beat is a ranking with more than one screen, more than one round, or any reordering
- draws: `rank` (the apparatus register proposed below; falls back to `value`)
- priority: 8
- evidence: `projects-propublica-org-graphics-ncaa-bracket-2017` — 63 runs of `graphik | 10 | 400`
  in `rgb(119, 119, 119)`, each the school's seed set immediately before its name, against 132 runs
  of `graphik | 12 | 400` for the names
- evidence: `espn-com-espn-feature-story-id-23519390-espn-world-fame-100-2018` — the rank as a
  display-scale numeral in the accent, laid on the lower edge of each entry's portrait
- detect: every entry mark in the delivered artifact has a text run carrying its rank inside its own
  bounding box, or within one line-height of its label

**Two independent publications, two opposite treatments of the same rule.** ProPublica sets the rank
two points down and grey; ESPN sets it at display scale in gold. What is common is not the styling —
it is that **the ordinal is attached to the entity**, so a reader who finds a school in round three,
or arrives forty cards down a scroll, still has the number. ProPublica's whole finding ("a 12 seed in
the final") is unreadable without it.

**Still the most literal citation in the family.** ESPN's `graphic.png` is a single entry's portrait,
and the gold numeral is *in the crop* — the ordinal is inside the entity's own bounding box in the
most literal sense the harvester can express. `#F0B74B` at 0.296 % of that crop is the numeral, and
it is corroborated by the style route's mark `fill rgb(240, 183, 75)`.

*What is NOT filed here: the small-quiet-prefix treatment, which rests on ProPublica alone. See the
refusals.*

### 3. `the-instruction-sits-with-the-list` — **imported**, ready to file

- kind: imported
- name: A ranking the reader can act on says so, in one quiet line between the header and the list
- applies: the delivered artifact carries any control over the list — filter, sort, search, drill
- draws: `body`
- priority: 4
- evidence: `projects-propublica-org-graphics-ncaa-bracket-2017` —
  `Tiempos Text | 15 | 400 | italic`, "Click any game in the bracket below to view more information
  on how both schools fare…", directly above the bracket
- evidence: `apps-npr-org-best-books-2013` — `Gotham SSm | 14 | 400`, "Choose your own adventure! Use
  the categories below to search through more than 200 standout titles… (You can also combine
  categories!) Then click on the books' covers…", directly above the rail
- evidence: `informationisbeautiful-net-visualizations-major-llms-ranked-by-perform` —
  `Inter Tight | 13.2 | 400`, `CLICK LEGEND ITEMS TO FILTER`, between the deck and the legend,
  **measured on the graphic's own frame**
- detect: an interactive delivered artifact whose list carries a control also carries a text run in
  the body register, inside the header block, naming that control's action

Three publications. Common shape: **quiet register, header block, names the action.** Not a tooltip,
not a help icon, not below. NPR's names three affordances in one sentence.

**What repair 2 changed.** The first draft cited the LLM record for this line; the second draft moved
the citation to the Marvel record because the LLM record's measured graphic was a treemap five
screens away. **The original citation is now correct and measured**, so it moves back. IIB does the
same thing on all three of its frames, in three sizes and the same slot — Marvel
`Inter Tight | 12 | 400` in `rgb(139,139,139)`, `USE THE LEGEND TO FILTER`; LLM
`Inter Tight | 13.2 | 400`, `CLICK LEGEND ITEMS TO FILTER`; passwords
`Questrial | 14.8 | 400 | italic`, "select a category below to filter". Three plates, one desk, and
under `METHOD.md` correction 4 the desk counts once.

*(The LLM record's stored sample reads `LICK LEGEND ITEMS TO FILTER`; the graphic reads
`CLICK LEGEND ITEMS TO FILTER`. The sampler clips one leading character. Recorded so nobody
downstream reads it as the site's own typo.)*

### 4. `re-rank-control-names-its-criterion` — **imported**, ready to file

- kind: imported
- name: Where a ranking can be ordered more than one way, the control states the order in force
- applies: the delivered artifact offers more than one ordering
- draws: `control` (the apparatus register proposed below; falls back to `body`)
- priority: 6
- evidence: `informationisbeautiful-net-visualizations-which-is-the-best-performing` — three pills on
  the graphic's bottom edge reading `size: no metric`, `y-axis: % budget recovered`, `x-axis: year`;
  measured as `Inter Tight | 14 | 600` in `rgb(245, 244, 246)`, three runs, one per pill, with the
  axis titles beside them at `Inter Tight | 14 | 700`
- evidence: `espn-com-espn-feature-story-id-23519390-espn-world-fame-100-2018` — a pill floating
  fixed at the bottom centre of the viewport reading `OVERALL RANK ▲`
- detect: the artifact's re-order control carries a text run containing the name of the active
  criterion. A control labelled only "sort", "options" or a glyph fails.

Two independent publications, two content domains, the same solution: **the label is the readout.**
A reader who has scrolled past the header still knows what the order means.

The ESPN half is still a visual reading — see the note under `podium`'s refusal about which of ESPN's
black uppercase runs is which.

*NOT filed: the placement — and repair 2 turned that from a caution into a refutation.* The second
draft declined to call bottom-edge a practice on two records. The LLM frame now supplies a third from
the same desk, and it puts its controls at the **top right**: a search field and
`show only` at `Inter Tight | 16 | 600`. One house, two plates, opposite edges. Placement is not part
of this treatment.

*(`show only: all` is a filter naming its active state, not a re-order control naming its criterion.
It is cited under the `control` register, not here.)*

### 5. `exits-are-drawn` — **derived**, needs a render and a detect before filing

- kind: derived
- name: An entry that leaves the ranking stays in its last position, in the quiet register
- applies: the beat's ranking has two or more states AND membership differs between them
- draws: `annot` (the struck/greyed treatment) on the entry's own mark
- priority: 7
- detect: the count of distinct entities drawn equals the count of distinct entities **across all
  states**, not the count in the final state
- provenBy: *not yet rendered — the parent owes this before filing*

**Why no publication floor applies.** Membership per state is a fact the beat's own data carries.
A ranking that draws only its final state silently discards half its own membership, and the reader
cannot tell an entry that was never there from one that fell out. That is `METHOD.md`'s correction 7
exactly.

**Illustrated, not evidenced, by** `projects-propublica-org-graphics-ncaa-bracket-2017`, where the
style route reads it directly and every re-harvest still does: the single tuple
`graphik | 12 | 400` carries **both** `rgb(0, 0, 0)` and `rgb(119, 119, 119)` — one size, one weight,
two inks, survivors black and the eliminated grey, struck through, still in their slots. The capture
confirms it by eye across all four regions.

**What limits it.** A ranking whose churn is large — a weekly chart where forty of a hundred entries
turn over — would be swamped. The predicate should probably carry a ceiling on the share of entities
that may be absent from the final state, and that ceiling has not been measured.

### 6. `both-ranked-states-are-drawn` — **derived**, needs a render and a detect before filing

- kind: derived
- name: A beat comparing two ranked moments draws both, at their true positions, on one shared scale
- applies: the beat carries two ranked states of the same entities
- draws: the series mark, twice per entity
- priority: 7
- detect: for N entities and two states, the artifact carries 2N entity marks on one scale
- provenBy: *not yet rendered*

**Why derived.** The earlier state is the beat's own series. Drawing only the later one throws away
half the data and turns an overtake into two unconnected numbers.

**Illustrated by three Ferdio encodings**, which are one publication and therefore evidence nothing:
`viz2` (both states as dots on one arc, joined, each dot carrying its own year reversed out of it),
`viz40` (earlier state as a pale ghost of the same flag), `viz89` (the two states mirrored above and
below one shared numeric scale, 2004 above and 2022 below, each year set as a giant ghost numeral
behind its own row). All three re-read on the clean crops; all three are what the drafts said.

**And the ghost is now measurable, on clean pixels.** In `viz40` the pale 2004 flags outweigh the
solid 2022 ones they duplicate — `#FACBC5` 0.090 % against Denmark's `#EE5440` 0.084 %, `#C1D5F3`
0.046 % against Sweden's `#3274D8` 0.073 % — which is what "same glyph, paler ink" predicts and what
the contaminated record could not have shown.

### 7. `signed-rank-change-on-the-connector` — **derived**, needs a render and a detect before filing

- kind: derived
- name: The connector between an entity's two states carries the signed change as a number
- applies: `both-ranked-states-are-drawn` applies AND the states are joined by a connector
- draws: `value`
- priority: 8
- detect: each connector has a text run within one line-height of its apex whose value equals the
  difference between the two states it joins, carrying its sign
- provenBy: *not yet rendered*

Arithmetic on the beat's own two states, so no publication is owed. **Illustrated by**
`100-datavizproject-com-data-type-viz40`, whose three arcs are labelled `+6`, `+3`, `+2`, each at the
apex and each in its entity's own colour — Denmark's `#EE5440` (0.084 % of the graphic), Norway's
`#283250` (0.081 %, filed under neutral because it is a navy), Sweden's `#3274D8` (0.073 %). Those
three shares are now the chart's own; the number the second draft printed for Sweden, 0.438 %, was
83 % nav bar.

---

## Directions

### `ledger` — **REFUSED**, and the refusal is unchanged

Measured from `projects-propublica-org-graphics-ncaa-bracket-2017`. Its ground `#FFFFFF` and its
accent `#C52000` both rested on the pixel route agreeing with the style route. The record's pixel
route still reads:

> `not-applicable` — "no graphic outside the site's own chrome — a palette read from the page would
> be the site's navigation and banners, not this piece's design"

That is correct: an HTML bracket is not an `svg`, a `canvas`, an `img` or an `iframe`, and the only
graphic element on the page is ProPublica's own furniture — the `#007DC1` masthead bar visible across
the top of `screenshot.png`. The record founds **no** colour claim, so it cannot found a direction.
`#C52000` survives as a **DOM ink** (`graphik | 13 | 700` and `graphik | 10 | 700`, Princeton and its
seed, visible red in the capture) and under the corrected rule a DOM ink cannot carry a direction's
accent.

**What survives from it.** The whole type table below, which is style-route work on a page whose
graphic *is* its HTML, and which no repair has touched. It is the evidence base for treatments 1, 2,
3 and 5 and for the `rank` register — **not** a direction.

| register | family | size | weight | italic | tracking | case | ink | source |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |
| display | serif | 34 | 700 | no | 0 | none | ink | measured (Tiempos Text, `rgb(0,0,0)`) |
| eyebrow | serif | 15 | 700 | no | 0 | uppercase | muted | measured (the region headers `EAST`, `rgb(68,68,68)`) |
| body | serif | 15 | 400 | no | 0 | none | ink | measured, 43 runs |
| annot | serif | 15 | 400 | **yes** | 0 | none | ink | measured — the instruction line is italic |
| value | sans | 12 | 400 | no | 0 | none | ink | measured (graphik; carries both `rgb(0,0,0)` and `rgb(119,119,119)`) |
| rank | sans | 10 | 400 | no | 0 | none | muted | measured (graphik, `rgb(119,119,119)`, 63 runs) |

Serif prose against sans furniture throughout, and the reader never has to ask whether a piece of
text is the article or the data. That observation stands; it is a register relationship, not a
palette, and it is offered to whoever files the `rank` register.

### `podium` — **REFUSED**, and the graphic has not changed

Measured from `espn-com-espn-feature-story-id-23519390-espn-world-fame-100-2018`. The pixel route is
`ok` and `measuredFrom` is `graphic.png`, so this one clears the rule on paper and fails it on
sight. **The graphic is a photograph.** The picker still isolates the 441 × 248 portrait on the
second card — LeBron James, smiling, in front of a blurred arena, with the top of a gold `2` entering
the bottom of the frame — now recorded at `documentTop 351`, `nearTheTop: true`. Repair 2 could not
help: there is no larger or earlier rival, because every card on the page is a portrait of exactly
this size. Read that image and the record explains itself:

- ground `#1C1B1B` at 34.444 % is the arena behind the subject, not a designed ground. That it lands
  one unit from ESPN's declared body ground `rgb(28, 28, 28)` is a coincidence and is **not** spent
  here as corroboration; two numbers agreeing for unrelated reasons is the exact failure
  `METHOD.md` correction 13 is about.
- eight of the ten chromatics — `#945B5B`, `#8B5453`, `#9A5D5D`, `#A26464`, `#9D6262`, `#AB6B6B`,
  `#A56A6A`, `#834D4C`, `#845352`, a dusty-rose ramp from 0.147 % down to 0.041 % — are skin and
  jersey.
- `shape: sequential`, `ramped: 1`, one cluster at hue 39° — that is a photograph's histogram, and it
  would be read downstream as a palette decision.

**The one thing that does survive** is `#F0B74B` at 0.296 %, the rank numeral, which is in the crop,
is corroborated by the style route's mark `fill rgb(240, 183, 75)`, and is visible to the eye in both
the crop and the page capture. It is cited under treatment 2 and under the `rank` register. It is one
accent with no ground beside it, and one accent is not a direction.

**A dispute the repairs leave standing.** The second draft recorded "one measurement disagrees with
the eye": four runs of `bentonsansbold | 11 | 400 | uppercase` in `rgb(0, 0, 0)`, sampling
"Endorsements", which on a near-black ground would be invisible while the capture shows those labels
plainly legible in grey. The resolution is that they are **not** the card labels. The card labels are
the 30-run `bentonsans | 11 | 400` tuple, whose inks are `rgb(177,177,177)`, `rgb(114,114,114)` and
`rgb(153,153,153)`. The four black uppercase runs belong to the ordering control — the capture shows
`OVERALL RANK ▲` set black on a white pill, and the filter glyph at bottom-left opens onto exactly
four criteria (overall rank, search score, endorsements, social following). That is a reading of the
capture and not a measured attribution, and it is written here as the former.

### `console` — **CONFIRMED**, measured from `informationisbeautiful-net-visualizations-which-is-the-best-performing`

Every number in this direction survives the three repairs to the third decimal place: this record was
already photographing the right frame, and IIB's masthead is not in the crop. What repair 2 adds is a
**sibling from the same house on a light ground**, and that sibling refutes two of the second draft's
readings while strengthening a third. Both are marked below.

- ground: `#26232C` — **measured**, pixel route on `graphic.png`, 93.827 % coverage. Not black; a
  warm-shifted near-black at hue 260°.
- accents: **measured, categorical.** `shape: categorical`, `ramped: 2`, three hue clusters —
  48° (0.382 %, 13 shades), 110° (0.188 %, 8), 199° (0.051 %, 2). Named: `#FED63E` 0.110 %,
  `#64BB52` 0.074 %, `#CC472E` 0.037 %, `#F05337` 0.031 %, `#0399DC` 0.026 %.
- **Both routes agree on this palette, on the same object.** The legend's label inks, read by the
  style route inside the frame, are `rgb(206, 71, 46)`, `rgb(240, 83, 55)`, `rgb(250, 162, 36)` and
  `rgb(255, 215, 62)` — `#CE472E`, `#F05337`, `#FAA224`, `#FFD73E` — and three of the four are in the
  pixel set to within two units (`#CC472E`, `#F05337`, `#FED63E`). *Narrowed:* the record's `colors`
  field is **capped at four entries** (`harvest-styles.mjs:258`), so this is four of at least six
  inks, not the whole legend. `#FAA224` is real — sampled directly in the legend band — and simply
  falls outside the top ten by share.
- furniture: `#393640` at 1.081 % — the axis, its ticks and the dotted `BREAKEVEN` rule; `#FFFFFF` at
  0.550 % — the title and the uncoloured legend items.
- pad, headRule, stroke: **not measured.** The frame reports no column measure and no mark stroke
  width. Do not invent them.
- header: `centre` — **read from the capture**: title and instruction line centred over a full-bleed
  plot whose axes cross at the middle of the plate.

| register | family | size | weight | italic | tracking | case | ink | source |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |
| display | sans | 45.2 | **400** | no | 0 | none | `#FFFFFF` | measured (Inter Tight, 1 run) |
| eyebrow | sans | 12 | 400 | no | 0 | none | `rgb(139,139,139)` | measured — `USE THE LEGEND TO FILTER`, set in capitals in the source, `text-transform: none` |
| body | — | — | — | — | — | — | — | **not measured.** The piece carries no prose; derive from `axis`. |
| axis | sans | 14 | 400 | no | 0 | none | `rgb(233,231,236)` / `rgb(245,244,246)` | measured, 18 runs, sample `2008` — the tick labels. The axis **titles** are 14/700 |
| annot | — | — | — | — | — | — | — | **NOT MEASURED.** *Corrected:* the second draft gave `annot` the 18-run 14/400 tuple, which is the same tuple as `axis`. There is no separately measured annotation register on this plate; `BREAKEVEN` is drawn, not typeset. |
| value | — | — | — | — | — | — | — | **NOT MEASURED.** The point labels are drawn inside the plot and are absent from the frame's type table. |
| control | sans | 14 | 600 | no | 0 | none | `rgb(245,244,246)` | measured, 3 runs — one per pill |
| legend | sans | 14 | 400 | no | 0 | **uppercase** | the mark's own colour | measured, 10 runs — one per category |
| credit | sans | 14.3 | 400 / 600 | no | 0 | none | `rgb(233,231,236)` | measured (byline 6 runs, wordmark 1) |
| rank | — | — | — | — | — | — | — | **NOT MEASURED.** This piece prints no ordinal; it ranks by position on a scale. |

**What distinguishes it, re-checked against the sibling.**

- *Survives, and is now provably a decision.* The display face is set at **400**, not bold. Its two
  house siblings both set theirs at 600 (`Inter Tight | 45.2 | 600` on the LLM frame,
  `Questrial | 45.2 | 600` on the passwords frame). One plate in three departs, so it is a choice.
- *Narrowed.* The **size** 45.2 is not this plate's decision — all three `vizsweet` frames carry a
  45.2 display, and the passwords frame carries the LLM frame's 25.8 deck as well. The hierarchy
  `12 / 14 / 45.2` is partly the embed template's, and only the weight is the plate's own.
- *Survives on this plate; refuted as a house rule.* "The category legend is the only element allowed
  colour in its type, and the only element that is uppercase; colour in type means *this word is a
  mark*." True here, and **false on the same desk's LLM plate**, whose eight legend labels are set in
  `rgb(26, 26, 26)` — black, mixed case, beside coloured swatches. Transfer this as a decision one
  plate made, never as IIB's grammar.
- *Survives.* Controls are set one weight up from the labels they sit beside (600 against 400) and
  nothing else on the plate is 600. The sibling agrees in kind (16/600 `show only` against 16/400
  labels), which makes it a desk rule with two instances — and one publication.

**Its limit, stated.** One publication and a house style, and everything below the plot's top edge is
drawn inside a third-party embed. Its type is transferable; its palette is IIB's brand and should be
treated as a *shape* (categorical, three clusters, ~0.1 % each on a 94 % ground) rather than as five
hexes to copy.

### `almanac` — **NEW**, measured from `informationisbeautiful-net-visualizations-major-llms-ranked-by-perform`

This direction could not exist before this pass. The record measured a treemap five screens down; it
now measures `iframe 1380 × 830 at documentTop 164`, both routes on the same object, and the object is
**a ranking** — the only fully measured direction in this family taken from a piece that actually
ranks. `METHOD.md` step 5: a direction needs one reference, and this is one.

- ground: `#FFFFFF` — **measured**, pixel route on `graphic.png`, 89.717 % coverage. Plain white, and
  the deliberate opposite of `console`.
- accents: **measured, categorical, and one per named category.** The legend names eight companies;
  the palette returns exactly eight hues above 0.04 %, in legend order: `#D15549` 0.085 % (anthropic),
  `#F5854E` 0.266 % (chinese), `#FFE433` 0.220 % (google), `#7EC46B` 0.046 % (meta), `#33A59D`
  0.050 % (mistral), `#595D9D` 0.301 % (openAI), `#AC65AD` 0.266 % (other), `#DD67A1` 0.147 % (xAI).
  `shape: categorical`, `ramped: 3`, clusters 236° (0.376 %, 3 shades), 20° (0.743 %, 11), 299°
  (0.511 %, 6).
- **The marks are the legend key at exactly 80 % opacity on white, and the arithmetic closes on every
  channel.** Sampled from the legend swatches: anthropic `#C52B1C`, chinese `#F26722`, google
  `#FFDD00`, meta `#5EB546`, mistral `#008F85`, openAI `#303584`, other `#973F98`, xAI `#D44189`.
  Composite `#303584` at α over white and solve: 48α + 255(1−α) = 0x59, 53α + 255(1−α) = 0x5D,
  132α + 255(1−α) = 0x9D → α = 0.802, 0.802, 0.797. `#F26722` at 0.8 gives `#F4854E` against a
  measured `#F5854E`; `#C52B1C` at 0.8 gives `#D05549` against a measured `#D15549`. So **the key is
  the colour at full strength and the plot is the same colour at 80 %**, which is why overlapping
  bubbles darken back toward the key — and why the palette's ninth and tenth chromatics, `#333682`
  0.040 % and `#F26D2B` 0.038 %, are the key colours reappearing where marks pile up.
- **Both routes agree on the ink, exactly.** The style route reports every type run in
  `rgb(26, 26, 26)`; the pixel route's second neutral is `#1A1A1A` at 1.320 %. Same number, two
  routes, one object.
- furniture: `#E4E4E4` at 1.831 % — the search field's fill (sampled `#E5E5E5`) and the plot's pale
  dotted rules (sampled `#E3E3E3`), binned together; `#545454` at 0.250 % — a **second, darker rule
  weight**, used only for the two named thresholds, sampled on the `89.8 = human expert` rule.
- pad, headRule, stroke: **not measured.** The frame reports no column measure and no mark stroke
  width.
- header: `stack`, flush left — title, deck, instruction, then the legend as a full-width row, with
  the two controls parked at the top right on the legend's own band. Read from the capture.

| register | family | size | weight | italic | tracking | case | ink | source |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |
| display | sans | 45.2 | 600 | no | 0 | none | `#1A1A1A` | measured (Inter Tight, 1 run) |
| deck | sans | 25.8 | 400 | no | 0 | none | `#1A1A1A` | measured, 1 run — "ranked by capabilities, sized by billion parameters used for training" |
| eyebrow | sans | 13.2 | 400 | no | 0 | none | `#1A1A1A` | measured, 1 run — `CLICK LEGEND ITEMS TO FILTER`, set in capitals in the source |
| body | — | — | — | — | — | — | — | **not measured.** No prose on the plate. |
| axis | sans | 16 | **700** | no | 0 | none | `#1A1A1A` | measured, 12 runs, sample `100` — tick labels and the scale's name `MMLU` |
| legend | sans | 16 | 400 | no | 0 | none | `#1A1A1A` / `#0B0B0B` | measured, 11 runs — eight categories plus the two encoding keys. **Not** in the mark's colour |
| control | sans | 16 | 600 | no | 0 | none | `#0B0B0B` | measured, 1 run — `show only` |
| annot | sans | 14 | 400 | no | 0 | none | `#1A1A1A` | measured, 2 runs, sample `▲ 70+ IDEAL ▲` — the plate carries exactly two boxed thresholds, the second `89.8 = human expert` |
| credit | sans | 14.8 | 400 / 600 | no | 0 | none | `#1A1A1A` | measured (byline, wordmark, source line) |
| value | — | — | — | — | — | — | — | **NOT MEASURED.** All ~120 point labels are drawn inside the plot and absent from the frame's type table, exactly as on `console`. |
| rank | — | — | — | — | — | — | — | **NOT MEASURED.** No ordinal; rank is height on the scale. |

**What distinguishes it.** One sans at **one size, 16**, for the legend, the controls and the axis,
separated only by weight — 400 label, 600 control, 700 axis. Colour is confined to the marks: not one
type run on the plate is chromatic. Every mark is named where it sits, so there is no lookup and no
second reading. And the scale carries two **named absolute levels** in boxed labels at the left edge,
drawn on a rule weight nobody else on the plate uses, which is what turns a position into a meaning.

**Its limits, stated plainly.**

- **It is the same publication as `console`, and the same embed engine.** A corpus that files both
  files one house twice. `METHOD.md` step 5 permits it — a direction needs one reference — but the
  parent should decide whether that is what it wants, because the family's *only* two measurable
  directions both come from `vizsweet.com` frames on `informationisbeautiful.net`.
- **The 45.2 display and the 25.8 deck are the embed template's**, shared with the passwords frame.
- **Density is this piece's own.** A hundred and twenty labelled bubbles on one plate works because
  the reader is scanning for a name they already hold; a beat with ten entries would look empty in
  this direction and a beat with a thousand would be unreadable in it.

### Grounds that were measured and still cannot carry a direction

- `informationisbeautiful-net-visualizations-best-in-show-whats-the-top-d` — a genuinely clean
  reading, and the family's only light-ground *poster*: `#F7F1E1` at 81.823 %, categorical, clusters
  at 2° (3.065 %, 17 shades), 253° (0.912 %) and 93° (0.585 %), named `#A13330`, `#50447A`,
  `#D7856A`, `#739458`, `#6E2037`, `#B7881F`, with `#364E4D` at 1.393 % as the furniture. **No type**:
  the poster is a raster, it carries no `graphicFrame`, and the record's `style.type` is IIB's article
  furniture. A ground and a palette with no register table is not a direction.
- the three Ferdio charts — `#FFFFFF` at 91.039–98.103 %, two or three hue clusters at 7°, 216° and
  47°, named `#3274D8`, `#EE5440`, `#EDCB41`, `#283250`. Same problem, same reason: rasters, no frame,
  no measurable type. And one publication three times over (`METHOD.md` correction 4).
- **`informationisbeautiful-net-visualizations-top-500-passwords-visualized` — new to this list, and
  it is the interesting one.** Its record is no longer contaminated: the modal is gone, nothing dims
  the plate, it has a `graphicFrame` with a full type table, and its ground `#000000` at 53.991 % is
  real. It still founds no usable colour, and the reason is a property of the *piece*, not of the
  harvest. **The pixel route is a histogram, and this plate's histogram is dominated by its faintest
  ink.** Size encodes frequency, so 248 of the 499 words are 9 px and near-black; the measured
  chromatics are nine dark reds from `#3B0E0C` 0.712 % down to `#621714` 0.309 %, while the legend's
  own first swatch — sampled directly — is `#CD3029`, and every pixel above luminance 140 in the
  whole 1 322 040-px frame totals **0.44 %**. The measured accent is not the accent, and no repair to
  the harvester would change that. A word cloud's palette has to be read off its key, and the pixel
  route does not know where the key is.

---

## Apparatus registers proposed

### `rank` — proposed, with a stated gap

- kind: apparatus
- name: The voice a ranking sets its ordinal in
- families: ranking
- derivesFrom: `value`
- evidence: `projects-propublica-org-graphics-ncaa-bracket-2017`
- evidence: `espn-com-espn-feature-story-id-23519390-espn-world-fame-100-2018`

The ordinal is not `value` — `value` is a quantity attached to a mark, and a rank is the mark's
*place in the order*, which is the thing being encoded rather than a number about it. It is not
`annot` either: it is never a sentence and never optional. Both references keep it as its own voice
and neither lets it share a register with anything else. ProPublica: `graphik | 10 | 400` in
`rgb(119, 119, 119)`, two points below the entry name and grey. ESPN: a display-scale numeral in the
accent, on the portrait.

**The gap, stated.** ESPN's numerals still do not appear in the style route's type table, so the
register's *size and family* are one-sided. Its **ink** is not: `#F0B74B` is measured in the pixels of
the entry card itself and corroborated by the style route's mark fill. Whether one measured ink and
one measured type tuple clear the evidence floor is the parent's call. It is put here as a question
and not as a filing.

**And a hole this pass makes visible.** Both of the family's measurable directions — `console` and
`almanac` — print **no ordinal at all**; both rank by position on a scale. The register has two
references and neither of them is a direction, so nothing in this family both sets a rank in type and
has a measured plate around it.

### `control` — proposed, and probably not this family's to own

- kind: apparatus
- name: The voice a reader-facing control on the graphic is set in
- families: ranking (**but see below**)
- derivesFrom: `body`
- evidence: `espn-com-espn-feature-story-id-23519390-espn-world-fame-100-2018` — the floating
  `OVERALL RANK ▲` pill
- evidence: `apps-npr-org-best-books-2013` — 26 category tabs at `Gotham SSm | 15 | 400` in the
  accent `rgb(205, 73, 50)`, a `Covers | List` toggle, and a status line at `Gotham SSm | 24 | 500`
- evidence: `informationisbeautiful-net-visualizations-which-is-the-best-performing` — three pills at
  `Inter Tight | 14 | 600`, measured on the graphic's own frame

Three publications, so the floor is met. **But it is almost certainly not ranking-specific** — any
interactive family needs it, and `chart-web` and `scrolly` have controls today with no register to
set them in. It is proposed here because ranking is where a list long enough to need controls
actually arises, and it is flagged so the parent can move it rather than let this family squat on a
shared voice.

**One measured detail worth carrying with it**, from NPR: *the current state of the list is set
larger than the controls that set it* — the status line "Showing all books" at 24/500 against the 26
category labels at 15/400. A reader can never be looking at a filtered subset and think it is the
whole. One publication.

**And a second, from IIB, now measured twice on two plates:** *the control is set one weight above
the labels around it.* Marvel, `Inter Tight | 14 | 600` against a plate that is otherwise uniformly
400. LLM, `Inter Tight | 16 | 600` `show only` against `Inter Tight | 16 | 400` legend labels — same
size, one weight up, the difference carried by weight alone. Two plates is enough to say the desk has
a rule rather than a habit-of-one, and it is still **one publication** (`METHOD.md` correction 4), so
it is not filed. NPR and IIB agree in kind — the control and the state it reports are lifted out of
the plate — and disagree in mechanism, size against weight.

---

## What could NOT be filed, and why

Nine things that are real, that were seen, and that the evidence does not carry. **A refusal written
down is worth more than a lever stretched.** All nine survive; repair 2 turned two of them from
descriptions into measurements, and one of them from a hunch into a refutation.

| candidate | seen on | why refused |
| --- | --- | --- |
| `named-threshold-on-the-rank-scale` — a rule across the scale carrying a named absolute level (`89.8 = human expert`, `▲ 70+ IDEAL ▲`, `BREAKEVEN`) so a position means something absolute | IIB ×2 (LLM, Marvel) | **one publication** — but no longer an unmeasurable one. The LLM frame's `Inter Tight \| 14 \| 400` tuple has **count 2**, sample `▲ 70+ IDEAL ▲`, and the plate carries exactly two boxed thresholds; its rule is drawn at `#545454`, a weight used nowhere else, against the `#E3E3E3` grid. Marvel's `BREAKEVEN` is drawn rather than typeset and is visible in `graphic.png` only. Also overlaps the filed line-family treatments `crossing-marked` and `area-to-reference`, which already handle a *declared* reference level as `derived`. If a ranking beat declares its own threshold, that path exists and should be used. |
| `one-entry-takes-a-size-step` — the subject entry set one point up as well as in the accent | ProPublica | **one publication.** Measured exactly (132 names at 12/400, one at 13/700; 63 seeds at 10/400, one at 10/700), and still the cleanest single measurement in this harvest — no repair touched it, because it is a style-route count. The colour half is already filed as `accent-marks-the-thread`; the size half waits for a second desk. Worth noting the piece separates the two — the size step marks *the final*, the accent marks *the surprise*, and its opponent takes the size step without the accent (`graphik \| 13 \| 400`, grey). |
| `ghost-marks-the-earlier-state` — the earlier state as a pale copy of the same glyph | Ferdio ×2 | **one publication** (one desk, one designer, one dataset — `METHOD.md` correction 4 exactly). Now measured on clean pixels: `#FACBC5` 0.090 % and `#C1D5F3` 0.046 % against the solids they duplicate. Filed instead in its weaker, derived form as `both-ranked-states-are-drawn`. |
| `occupied-tick-takes-the-entity-colour` — the scale's ticks stay neutral except where an entity lands | Ferdio (viz40) | **one publication.** Confirmed on the clean graphic: the staircase numbers run 1–15 in grey, and 8, 10 and 15 are set bold in navy, red and blue. Its sibling `viz89` uses the same scale and does **not** do it, which is a useful negative from the same desk. Pure style, so no derived path either. |
| `state-label-inside-the-mark` — the year reversed out of the dot, so two states need no legend and no second axis | Ferdio (viz2) | **one publication.** Confirmed on the clean graphic: `'04` and `'22` reversed white out of each dot. |
| `two-states-mirrored-across-one-shared-scale` — 2004 above the axis, 2022 below, one scale, each year set as a giant ghost numeral behind its own row | Ferdio (viz89) | **one publication.** And its own limit: it works for three entities and would not for thirty. |
| `label-is-the-mark` — the entry's name set at the size its rank earns, with no separate mark | IIB (passwords) | **one publication** — and the measurement is undisturbed by the modal's departure, because it was always a type reading. The frame's type table is seven sizes of one face at one weight and one ink: `Rubik \| 400 \| rgb(242,242,242)` at **9 (248 runs), 19 (124), 29 (67), 39 (30), 49 (18), 59 (10), 70 (2)**. The counts sum to 499 — the whole top-500 list is on the plate — and size is the only channel carrying frequency. Adjacent to the filed `mark-depicts-its-subject`, and arguably a case of it. |
| `named-quadrants` — the two-by-two's regions named in the display register at the corners | IIB (Best in Show) | **one publication.** Confirmed on the graphic: `Inexplicably Overrated`, `Hot Dogs!`, `The Rightly Ignored`, `Overlooked Treasures`. Also editorially loaded in a way a newsroom would have to own: "Inexplicably Overrated" is a judgement, at display scale, over named subjects. |
| `search-field-in-the-graphic-header` | IIB (LLM) | **one publication** — and repair 2 turned this from a reading of a capture into a measurement: the LLM frame carries `Inter Tight \| 16 \| 600` `show only` beside a search input, on the graphic's own top-right band. NPR answers the same question with a category rail and ESPN with an unlabelled glyph — three different mechanisms, not one practice. What they share is already filed as `the-instruction-sits-with-the-list`. |

### And one question with no evidence at all: **ties**

Ten references, and **not one handles a tie explicitly.** No shared rank number, no shared slot, no
"=4", no tie-break disclosure. ProPublica's bracket cannot tie by construction. ESPN's hundred are
strictly ordered with no equal ranks visible. The IIB scatters have no ordinal at all. The Ferdio
encodings have three entities. Three re-harvests changed none of this — it is a hole in the draw, not
a measurement artefact.

That is a genuine hole rather than an oversight, and it should be recorded as one: a league table, an
examination league, a medal table and an index ranking all tie routinely, and this corpus currently
has nothing to say about how a tie is drawn or how the tie-break is disclosed. **A second wave for
this family should be drawn to answer that specific question** — official league tables, examination
rankings, medal tables where two countries share a place — rather than drawn for more rankings in
general. That is the shape correction 8 recommends and it applies here.

**And a second target, sharpened by this pass:** a ranking whose graphic is neither a raster nor a
third-party embed. Of the ten records, only four carry type belonging to the graphic itself —
ProPublica and NPR, whose graphics are page HTML, and IIB's three `vizsweet` frames, which are one
desk. This family now has two measurable directions and **both of them are the same embed on the same
site**.

---

## What the method itself got wrong

### A. Two records that agree with each other to five decimal places are both wrong — **fixed, and still passing**

`METHOD.md` correction 3 gives the rule "a measurement that disagrees with the eye is the eye's to
win". This family found its sibling, and the eye would never have caught it: across the four
`informationisbeautiful.net` records, **seven `(hex, share)` pairs were bit-identical** — `#D4537A`
0.00696, `#EAAB4A` 0.00683, `#ECB445` 0.00651, `#E69B53` 0.00635, `#DE7B64` 0.00630, `#E28B5B`
0.00627, `#D65C76` 0.00612 — the site's pink-to-amber "Learn to do data-viz" promotional banner.

This is now `METHOD.md` correction 13's `two-records-that-agree-exactly-are-both-wrong`.
**Re-verified on the current corpus:** grouping this family's ten records' chromatic and neutral
lists returns **zero** cross-record `(hex, share)` duplicates. Seven hexes are shared across records
without their shares. Five — `#EE5440`, `#3274D8`, `#EF5D4A`, `#283250`, `#EDCB41` — are shared only
among the three Ferdio charts, which is one designer drawing one dataset in one palette. The other
two are `#FFFFFF` and `#010101`, white and near-black, which cross houses and mean nothing. The
guard distinguishes a contaminant from a house correctly.

The rule remains worth running after every wave, because it is arithmetic rather than judgement.
**It would not, however, have caught repair 1**: a 0.365 % strip identical across three records is
too small to show up as a shared *top-ten* entry once it has been merged into a colour the chart
already draws. What catches that is the delta table at the head of this file — comparing a record
against its own previous self — and nothing in the method does that today.

### B. `measuredFrom: screenshot.png` is a downgrade the record does not label as one — **fixed**

The corrected records either isolate a graphic or say `not-applicable` with a reason.
`projects-propublica-org-graphics-ncaa-bracket-2017` is the family's worked example of the honest
answer: an HTML bracket has no graphic element, the record says so, and it founds no colour.

### C. A style route that reached only the wrapper is also reported `ok` — **now three-quarters fixed**

Seven of the ten survivors once had a style route that measured the publisher's template —
`IBM Plex Sans` / `Quicksand` for all four IIB records, `stevie-sans` / `Borgia Pro` for all three
Ferdio ones. `METHOD.md` correction 14 fixed two of them; **repair 2 fixed a third**, and the LLM
record now carries a `graphicFrame` speaking Inter Tight. Three of the four IIB records are now
measured on their own document.

**The rest is not fixable by this route**: five of the ten graphics are rasters (three Ferdio, IIB's
*Best in Show*, and NPR's book cover), and a raster has no DOM to read. Those records' `style.type`
remains the publisher's furniture. It is correctly filed under `style`, not under `graphicFrame`, so
the two can be told apart — but a reader of the JSON still has to know that `style.type` on a raster
record describes the page, not the picture.

### D. A failure mode not in `METHOD.md`: the orientation lock

ESPN's *2018 NFLRank* served a full-screen black page reading **"PLEASE ROTATE YOUR DEVICE"** to a
1440 × 900 desktop viewport. Both routes reported `ok`; the pixel route measured a black field and
six words. It is not a paywall, not a consent dialog, not a bot check and not a hero — it is a
breakpoint bug in a nine-year-old feature. It belongs on the failure list beside them, because it
looks like a successful harvest.

### E. `ENTRY_WORDS` is missing one word, and it is the obvious one

NPR's *Songs We Love 2014* is exactly what correction 12's entry-screen handler was written for: a
single-viewport title card whose only control is a `▶ PLAY` button, with the ranked list behind it.
`ENTRY_WORDS` covers `start`, `explore`, `enter`, `begin`, `view the…`, `see the…`, `launch`,
`open the map` — and not `play`. The door was built and this piece was locked out by one word. *Not
fixed here: `scripts/` is outside this agent's write boundary.* Adding `play` (and probably
`listen`, `watch`, `read the…`) is a one-line change with a measured reference behind it.

### F. Correction 2 has an exception, and this family is it

Correction 2 says "a chart family cannot be drawn from a URL list — a keyword filter selects a
SUBJECT, never a FORM." For **ranking** the subject and the form coincide: `rank`, `ranking`,
`top 100`, `best`, `greatest`, `bracket`, `medallero`, `ranking das escolas`, `power rankings`,
`league table` all name an ordering rather than a topic. Of the 21 url-list candidates drawn on those
keywords, **three turned out not to be rankings** — Globo's *Medalhas Radicais*, an infographic about
four medals; ABC's *Game Changers*, an unranked set of players to watch; and NPR's *Book Concierge*,
which **declines** to order and says so above the fold. The third was filed anyway, as an apparatus
reference and as this family's deliberate negative case, which is why the url-list row above reads
three survivors and not two. Of the remaining 18, all that were reached turned out to be rankings,
and those that were not reached failed at the *harvester* (heroes, dead pages, an orientation lock),
not at the draw. The correction should be narrowed to "a keyword filter selects a subject **unless the
form has a name in ordinary language**", which ranking has and a temporal line does not.

`100.datavizproject.com` is still the only archive that can be drawn by form *exactly*, and this
wave found how: its index items carry `story-*`, `property-*` and `shape-*` classes in the DOM.
`property-position` is this family; **14 of the 100 carry `property-position` together with the
overtake story `story-denmark-norway`.** A three-line browser evaluation over the index gives the
whole facet table, and it should be written down for the next family rather than rediscovered.

### G. The largest graphic on the page need not be the piece's own — **FIXED, and verified**

`informationisbeautiful-net-visualizations-major-llms-ranked-by-perform` measured a treemap
(`img 1280 × 903` at `y: 5248`, 1 155 840 px) instead of the piece's own frame, because the picker
took the largest. Size still leads and position now breaks the tie between graphics of **comparable**
size: an earlier candidate inside the first two screens wins when it is within 75 % of the largest.
The named frame is 1 380 × 830 = 1 145 400 px, **99.1 %** of the treemap — comparable, and earlier, so
it wins. (`harvest-styles.mjs` records the frame as 1 380 × 806 and the ratio as 96 %; the frame
measures 830 px tall in this record, and the conclusion is the same either way.)
`style.graphic` on that record now reads `iframe 1380 × 830 at documentTop 164`, `nearTheTop: true`.

**What it cost to get right, recorded because it is the useful part.** Preferring anything near the
top — the obvious fix — made ABC's mullet record measure a 900 × 230 banner instead of its
1 440 × 900 canvas: one error traded for another six times smaller. Position alone is the wrong rule.

### H. A modal can survive into a corrected record — **fixed, incidentally**

`informationisbeautiful-net-visualizations-top-500-passwords-visualized` opened the right iframe and
photographed it through a newsletter modal: `#FFFFFF` 9.75 % the white panel, `#F06292` 1.73 % the
pink border, nine of ten chromatics near-black because of the scrim. **None of that is in the record
now**, and direct sampling of `graphic.png` confirms no scrim: the title reaches `#E3E3E3` and the
first legend swatch `#CD3029`.

**It was not fixed by anything that knows what a modal is.** `withFloatingChromeHidden` hides every
`position: fixed | sticky` element for the length of the photograph, and a newsletter modal happens
to be one. A modal positioned `absolute`, or one in the normal flow, would still be photographed, and
the harvester would still report `ok`. The claim that generalised — **two routes on one record can be
contaminated independently, and a record needs to be able to say so per route** — is still true and
still unimplemented: this record's type was clean the whole time and nothing in the schema could say
so.

### I. **New — a fixed masthead inside an element photograph is invisible, small, and decisive**

Repair 1's own finding, restated as a method rule because it is the second time this exact shape has
cost this corpus a reading. `element.screenshot()` scrolls its target into view; anything `fixed`
then paints over the target's first rows; the strip is a fraction of a percent and looks like
nothing.

It mattered here because **the contaminant and the subject were the same colour**. 2 472 px — about
three rows of an 823-px-wide crop, 0.365 % of the frame — was 83.3 % of `viz40`'s entire reported blue,
69.3 % of `viz2`'s and 64.7 % of `viz89`'s. No eye catches that; the previous pass looked at the
clean-*looking* number and wrote a confident reversal on it. The general rule:

> **A palette read from an element photograph is a reading of everything that was painted where that
> element was, not of the element.** Two independent decisions — what to measure, and what was on top
> of it — and only the first one had a guard.

The cheap detector is not the arithmetic guard (a merged 0.365 % does not surface as a shared
top-ten entry). It is a **delta against the record's own previous self**: six numbers all moving by
0.363–0.369 % is a signature no chart produces.

### J. **New — the records were re-harvested and the notes beside them were not**

Every one of the ten `NOTES.md` files in this family still quotes the contaminated palette.
`METHOD.md` step 3 says look at the pixels; step 4 says write the note. Three re-harvests have run
step 2 and nothing has re-run steps 3 and 4, so the corpus now contains ten prose descriptions of
photographs that no longer exist:

| note | hexes it still asserts | what the record now says |
| --- | --- | --- |
| the three Ferdio notes | `#3274DA` | `#3274D8` at a third of the share |
| `apps-npr-org-best-books-2013` | `#F2ECE2` 31.57 %, `#FFFFFF` 25.72 %, accent `#CD4932` 1.43 %, a purple sponsor advert at `#49227C` | ground `#D2E4F2` 4.244 %, a brown ramp — a photograph of a desert on a book jacket. None of the four hexes exists in the record. |
| `espn-…-world-fame-100-2018` | `#F7C458`, `#CB8331`, `#1C1C1C` | `#F0B74B` 0.296 %, ground `#1C1B1B` |
| `projects-propublica-…-ncaa-bracket-2017` | `#007DC1` | pixel route `not-applicable` |
| the four IIB notes | `#D4537A`, `#EAAB4A`, `#ECB445`, `#D65C76`, `#DE7B64`, `#E28B5B`, `#E69B53` — the promotional banner | not one of the seven appears in any record in this family |

The NPR note is the worst of them, because it reads as careful work: it names an accent, corroborates
it across both routes, and even catches the sponsor advert in the corner. All of it was true of the
whole-page capture and none of it is true of the record. `NOTES.md` is outside this agent's write
boundary; this is flagged rather than fixed, and it is almost certainly **corpus-wide**, not
ranking-only.

### K. **New — the picker returns the first of two hundred identical thumbnails, and it is still not the graphic**

`apps-npr-org-best-books-2013` measured a 240 × 406 book cover at `y: 4864` before repair 2 and
measures a 240 × 362 book cover at `documentTop 492` after it. Repair 2 worked exactly as designed —
every cover in the grid is the same size, so all of them are "comparable" and the topmost wins — and
the answer is still wrong in kind. Its palette is now the desert photograph on the jacket of
*Lawrence in Arabia*: ground `#D2E4F2` 4.244 % (sky), a single hue cluster at 29° holding 4.93 % over
24 shades, `shape: sequential`.

The page's graphic is the **grid**, not a member of it, and no member of it is the piece.
`projects-propublica-org-graphics-ncaa-bracket-2017` already models the honest answer for this shape
of page: report none.

> **Proposed rule:** when the top rivals are many and near-identical in size — say four or more
> candidates within `COMPARABLE_AREA_SHARE` of the largest — the page is showing a grid, and the
> honest `pixel` state is `not-applicable` with that reason, not a photograph of one tile.

Under that rule this family would have **nine** records founding colour claims and one honest refusal
instead of ProPublica's one, and no reader downstream would be handed a book jacket labelled as a
ranking's palette.

---

## Suggested rows for the yield log in `METHOD.md`

*(For the parent to add — `METHOD.md` is outside this agent's write boundary.)*

| family | archive | drawn | harvested | survived reading | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| ranking | url-list | 21 | 21 | 3 | 3 |
| ranking | informationisbeautiful | 5 | 5 | 4 | 4 |
| ranking | datavizproject | 6 | 6 | 3 | 3 |

**And a line for the corrections log, if the parent wants it there:** of ten filed ranking
references, seven found colour on their own graphic, one founds a single accent off a photograph, one
isolated a book cover and founds nothing, and one honestly reports having no graphic at all. The
family files **seven treatments** (four imported, three derived), **two apparatus registers** and
**two directions** — `console` on a `#26232C` ground and `almanac` on `#FFFFFF`, both measured on
`vizsweet` frames embedded in `informationisbeautiful.net`, which is one publication twice and is
flagged as such. It **refuses `ledger`** (its record founds no colour), **refuses `podium`** (its
record's graphic is a photograph of LeBron James), and refuses nine treatments for want of a second
desk.
