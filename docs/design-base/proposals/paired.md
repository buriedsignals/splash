# Proposal — the PAIRED COMPARISON family

What this harvest thinks should be FILED, for the parent to integrate. Nothing here has been written
into `treatments/`, `directions/` or `registers/`; those are the parent's to touch.

Family: anything that draws **two states of the same entities** — slope charts, dumbbells,
before/after pairs, group-vs-group comparisons, and the pieces that collapse the pair to one number.

## What this pass changed

This is the second revision. The first was written against records that `METHOD.md` corrections 13
and 14 had just repaired; **three further repairs have landed since**, two of them found by this
family's own previous report. Every claim below has been re-checked against the current records in
`references/paired/` and against the pixels themselves.

**Provenance convention used throughout.** Every evidence line says which file it was read from.
`record.pixel` means a measurement in `measured.json` taken with
`routes.pixel.measuredFrom === "graphic.png"`; `style route` means `record.style`; **looked at**
means a human reading of a PNG in the reference directory, which founds geometry and text but never
a colour value. No record in this family carries a `graphicFrame`, so `record.style.type` is the
type route everywhere here.

### Repair 1 — the fixed masthead was being photographed with the graphic

`element.screenshot()` scrolls the element into view, and `100.datavizproject.com`'s
`position: fixed` nav was then painted over the graphic's first rows — 2 472 px of solid
`rgb(50, 116, 218)` in every clip, the same blue Ferdio draws its charts in. It is now hidden for the
length of the photograph, and **every Ferdio colour share in this file has moved**:

| reference | before this pass | now |
| --- | --- | --- |
| `100-datavizproject-com-data-type-viz54` | `#3274D9` 0.682 %, `#EE5440` 0.328 % | `#EE5440` **0.328 %**, `#3274D8` **0.317 %** |
| `100-datavizproject-com-data-type-viz17` | — | `#EE5440` **0.382 %**, `#3274D8` **0.368 %** |
| `100-datavizproject-com-data-type-viz3` | `#3274DA` 0.599 % | `#3274DA` **0.234 %** (`#B9D6FA` 0.206 %, `#EE5440` 0.164 %, `#F7ADA4` 0.066 % all unmoved) |

Only the blue moved, on every one of the eight, which is exactly the fingerprint of a masthead in the
frame: the contaminant had one hue. `#3274DA` now appears in **one** record in this family — viz3,
as Sweden's 2022 ink — and in no other, where before the repairs it was the whole archive's palette.
The eight grounds now run `#FFFFFF` **79.288 – 97.478 %**, and the poles are 216° / 7° on seven
records and 212° / 7° on `…-viz85`.

### Repair 2 — the page's lead graphic can beat the largest, and it fixed finding G's clean case

Records now carry `style.graphic.documentTop` and `style.graphic.nearTheTop`, and among graphics of
comparable size the one the page leads with wins.

**`informationisbeautiful-net-visualizations-spotify-apple-music-tidal-mu` is now the right poster.**
The previous pass found its `graphic.png` was *Who Owns Spotify?* — a treemap 1280 × 816, ground
`#F7AE95` 46.8 %, sequential at 44° — a different piece on the same page, and cited the piece the url
names off `screenshot.png` instead. `graphic.png` is now **1280 × 693 at `documentTop` 176**,
`nearTheTop: true`, and **looking at it, it is *Money Too Tight to Mention?***: nine curved
connectors between an "average artist revenue per play" rail and a "total users (millions)" rail,
each in its service's own hue. Its palette is the record's now: ground `#1C1C1C` **90.041 %**,
categorical, clusters at **289° / 60° / 188°**, chromatic `#D48CE5` 0.163 %, `#999954` 0.159 %,
`#008A9E` 0.151 %, `#0071BB` 0.104 %, `#EB008B` 0.073 %, `#8AA1E6` 0.072 %, `#EECA17` 0.059 %.

This is the fourth publication for the segment rule, and it is no longer read off a screenshot.

### Repair 3 — a scrollytelling graphic was hidden by repair 1, and unhiding it recovered a chart

`abc-net-au-news-2018-12-13-how-life-has-changed-for-people-your-age-10` is the reference this
repair was written for, and it is **the single largest change in this family's evidence.**

The record still selects the same element — `svg 390 × 479 at documentTop 17713` — but the element is
now given time to draw after being brought into view, and what it draws is **a slope chart**, not the
"decorative navy panel with faint line-art beakers, houses and a lightbulb" two earlier passes filed.
Looked at, `graphic.png` carries: two dark rails capped `1981` and `2016`; a cyan and a yellow
straight segment between them; endpoint values `0.7%` `2.2%` `13.4%` `14%`; and two delta pills,
`+1900%` filled yellow and `+509%` filled cyan, dark type on the fill. The line-art is still faintly
visible **behind** the chart — it was the paper all along, which is why the earlier pass's inference
that "the panel is a patch of the very paper the slope charts are drawn on" reached a right answer
from a photograph of nothing.

The palette moved with it, and the two routes now **independently agree**, which they could not
before:

| value | pixel route on `graphic.png` | style route on the live DOM |
| --- | --- | --- |
| ground `#175482` | modal, **87.040 %** | page ground `rgb(23, 84, 130)` |
| accent `#FFD70D` | chromatic, **0.996 %** | `fill rgb(255, 215, 13)`, **81 marks** |
| further accent `#34E7D8` | chromatic, **0.882 %** | `fill rgb(52, 231, 216)`, **66 marks** |
| furniture `#0E334F` | **0.152 %** | `stroke rgb(14, 51, 79)`, **117 marks** |
| annot ink `#B0E6FF` | **0.048 %** | `ABCSans-bold 15 / 700`, `rgb(176, 230, 255)` |

Palette shape is now **diverging**, clusters at **50°** (the yellow) and **175°** (the cyan) — the two
series. It used to be `monochrome`, then `chromatic[0] = #144C75` at 1.72 %, and neither was a
description of a chart. The `odyssee` direction below is rewritten on this, and the caveat that asked
the parent whether it could be filed at all is **withdrawn**.

`abc-net-au-news-2019-08-13-rich-school-poor-school-australias-great-ed` came back from the same
repair intact rather than changed: `svg 700 × 10520` at `documentTop` 1082, ground `#FEFEFE`
**83.904 %**, **categorical**, three clusters at 171° / 359° / 220° — `#68E1CF` 1.203 %,
`#FCA0A1` 1.000 %, `#5890FD` 0.666 %. That is the beeswarm's three school sectors, and looking at it
down its full 10 520 px it is the beeswarm end to end. The intermediate state the repair note
describes — 97.76 % cream, zero chromatic, `monochrome` — is gone.

### What this pass found on its own, and it is a reading defect not a harvester one

**Two numbers beside a pair are not a delta.** The previous draft cited Reuters for
`the-change-is-printed`: *"`33% 32%`, `24% 24%`, `31% 30%` … printed between the two bars of each
state's highlighted pair."* Looked at again, magnified, on `graphic-legend.png`: `34%` sits on the
2016 bar and `32%` on the 2023 bar. They are **the two levels**, one per mark. The change — two
points — is printed nowhere on that plate. Reuters is dropped from that treatment and from the
`delta` register, and the register does not survive the loss. See finding K.

### What survived all of it unchanged

Five records are effectively identical across every repair, because they were already measuring their
own graphic: both ProPublica pieces, The Marshall Project, Information is Beautiful *gender pay gap*,
Information is Beautiful *star wars*. Everything the `dumbbell` direction states is therefore unmoved
— `#FFFFFF` 95.206 %, `#6A2A51` 0.230 %, `#C6CC7D` 0.226 %, `#B2B2B2` 1.367 %, `#CCCCCC` 0.768 %,
`#EEEEEE` 0.648 %, diverging at 323° and 65°, 81 fills of each pole in the style route's mark
inventory. `informationisbeautiful-net-visualizations-climate-change-deniers-vs-th` is unchanged too:
ground `#231F20` **81.724 %**, `#AEDEE4` 0.712 %, `#57B6DD` 0.634 %, `#CC3366` 0.406 %, `#659941`
0.321 %.

## The yield

The draw is unchanged — it is a historical fact about the pool. What changed is the last column.

| family | archive | drawn | harvested | survived looking | filed as references |
| --- | --- | ---: | ---: | ---: | ---: |
| paired | datavizproject | 10 | 10 | 8 | 8 |
| paired | informationisbeautiful | 5 | 5 | 4 | 4 |
| paired | url-list | 18 | 18 | 7 | 7 |

Thirty-three drawn, thirty-three harvested, **nineteen survived looking, fourteen deleted.**

Of the nineteen, after three repairs — the count that matters, and it has moved twice:

- **fourteen measure the graphic the claims are about** (was twelve) — the eight Ferdio pieces, IIB
  *gender pay gap*, IIB *climate change deniers*, IIB *star wars*, ProPublica *miseducation*, and now
  **IIB *spotify*** (repair 2) and **ABC *how life has changed*** (repair 3);
- **two measure a different real graphic on the right page** — ProPublica *workers comp* (the
  state × year matrix rather than the three cartograms above it) and ABC *rich school poor school*
  (the beeswarm rather than the paired bar chart further down). Both are now defensible rather than
  defective: see finding G;
- **one measures the right element in the wrong state** — The Marshall Project, caught before its
  reveal runs (`METHOD.md` correction 5, still open);
- **one measures something that is not a graphic** — The Pudding, the opening title card;
- **one measures nothing** — Reuters, which now says so.

The three pools behave completely differently and the numbers say why.

- **`100.datavizproject.com` yielded 10 / 10** because it is indexed by FORM and the dataset it
  encodes — three entities, two years — is *itself* a paired comparison, so every one of its hundred
  pieces is in this family by construction. Two were then deleted as redundant within one desk, not
  as failures. This is the archive that makes a form-defined family drawable at all
  (`METHOD.md` correction 2, confirmed). Its colour evidence is now **entirely** the harvester's own
  output, and after repair 1 it is finally the chart's own colour rather than the site's.
- **`informationisbeautiful.net` yielded 4 / 5**, and after repair 2 all four measure the poster the
  url names. The one loss was a newsletter modal over a scatter that was not a paired comparison
  anyway.
- **The url list yielded 7 / 18 — 39 %, and after three repairs 4 of those 7 photograph the chart the
  claim is about**, up from 3. ProPublica *miseducation* and ABC *how life has changed* do;
  ProPublica *workers comp* and ABC *rich school poor school* reach a real graphic from the same
  page; The Pudding, The Marshall Project and Reuters do not.

Eleven of the fourteen deletions were the failure modes `METHOD.md` already names: title cards
(Kontinentalist, Rest of World ×2, flags-of-inequality), an entry screen the handler does not match
("Click anywhere to begin", theplotline), a consent wall the word list does not match (zeit.de), a
slide deck behind a PLAY control (socialpolicylab), a newsletter modal (IIB). Three were honest
misses of the family: a table (realtimeinequality), a scaled-figure small-multiple (ProPublica
*limb*), a choropleth (Guardian).

## Treatments proposed for filing

### 1. `the-change-is-printed`

- kind: `imported`
- applies: the beat draws two states of the same entities and the change between them is the finding
- draws: `value`
- priority: 8
- evidence: `100-datavizproject-com-data-type-viz54` — **looked at, `graphic.png`** — the end label
  `Sweden +15.4%`, `Denmark +150%`, `Norway +60%`, set after the entity's name at the end of each
  slope
- evidence: `abc-net-au-news-2018-12-13-how-life-has-changed-for-people-your-age-10` — **looked at,
  the record's own `graphic.png`** — a pill filled with the series' own colour, dark type on the
  fill, `+1900%` on yellow and `+509%` on cyan, set beside the later value. The two fills are
  corroborated by both routes: `record.pixel` reads `#FFD70D` 0.996 % and `#34E7D8` 0.882 %, and the
  style route counts `fill rgb(255, 215, 13)` ×81 and `fill rgb(52, 231, 216)` ×66. The same desk
  draws `- 83%`, `- 73%`, `- 75%`, `+50%` and `+55%` the same way on the panels visible in
  `graphic-scrolled.png`
- detect: for each entity in a paired beat, the delivered artifact carries a text node matching
  `[+−-]?\d+(\.\d+)?\s*%?` whose value equals the change computed from that entity's two plotted
  values, positioned outside both endpoint marks' bounding boxes

**Rule.** A paired comparison states the change as a number, in a place of its own, rather than
leaving it to be measured off the two marks. The slope, the gap or the offset gives direction and
rough size; the printed number closes it.

**Two independent publications, not three.** The previous draft claimed Reuters as a third and it was
a misreading of a picture: `34% 32%` is the pair of levels, one number per bar, and Reuters prints no
change anywhere on that plate. What remains is Ferdio and ABC, on two continents, and it clears the
floor.

**One desk does it six ways within one project**, all six now visible on the records' own graphics —
end label `#54`; inside the connector in white on its own gradient `#19`; under the paired stems and
over the entity's name, with an up-arrow, `#3` (`60%`, `150%`, `15%`); over an inked run of cells
`#30` (`+3`, `+6`, `+2`); in a headed `Change` column `#36`; and on the travel leader in the entity's
own ink `#85`. The *place* varies; the presence does not.

**Where it can go wrong, and one reference is the warning.** ABC's overweight panel labels
`54% → 81%` as `+50%` and `42% → 65%` as `+55%`. The arithmetic is correct — these are relative
changes — and both are readable as "50 percentage points" by anyone who does not stop; the true gaps
are 27 and 23 points. A change computed on an already-percentage quantity needs its word. That
belongs in the treatment's own limits section. (The heart-disease and stroke panels on the same page
carry `- 83%` and `- 73%` on rates per 100,000, where the hazard does not arise — so the desk is not
being careless, the quantity is.)

**One reference in the family declines it.** `100-datavizproject-com-data-type-viz17` is a bump chart
of the same three countries and prints no delta at all — looked at, its numbers are the two ranks
inside the marks (`13`, `15`, `5`, `10`, `4`, `8`). The treatment is `applies`-gated on the change
*being* the finding, which on a rank chart it is not.

### 2. `base-plus-difference-in-one-mark`

- kind: `imported`
- applies: both states share a zero and one contains the other, so the later value is the earlier
  plus a difference
- draws: the mark; `annot` for the unit declaration
- priority: 7
- evidence: `themarshallproject-org-2021-08-30-the-black-mortality-gap-and-a-centur` — the
  counterfactual drawn as a dot field, **`record.pixel` on `graphic.png`**: ground `#F6F6F4`
  69.753 %, then `#000000` **10.646 %**, `#3E3E3D` **7.348 %**, `#7B7B7A` **6.023 %**, `#B8B8B7`
  **4.968 %**, palette `monochrome`, empty `chromatic` — and the excess stacked on it in red at one
  dot per death, **looked at on `graphic-scrolled.png`**. The red is `#FF0B3A`, style-route measured
  as the ink of the emphatic `acumin-pro 21 / 700` run and of the site's `Pressura 14` furniture
- evidence: `100-datavizproject-com-data-type-viz6` — **looked at, `graphic.png`** — one rounded bar
  per country running to the 2022 value with the segment past the 2004 stop in a lighter tint of the
  same hue (`#3274D8` 2.214 % against `#5495EC` 0.211 % on Sweden; `#F05440` 0.730 % against
  `#F37666` 0.861 % on Denmark, `record.pixel`) — and `…-viz30`, where the interval between the two
  values is an inked run of countable cells on a rail of grey ones (`#D0D9DB` at **9.642 %**), the
  endpoint cells at full tone and the interval in the tint (`#EE5440` 0.587 % against `#F6988C`
  1.523 %; `#3274D8` 0.584 % against `#79B0F6` 0.300 %)
- detect: per entity the artifact carries exactly one mark whose extent spans both values, filled in
  two inks with the boundary at the earlier value, and no second mark at the earlier value

**Rule.** Draw one mark, not two: the base, and the difference continued on it in a second ink. The
change becomes a segment rather than a gap, so nothing is subtracted by eye, and the difference gets
a shape — The Marshall Project's red rim has an age profile, which is the finding.

**Two independent publications** (The Marshall Project, Ferdio), and after repair 1 the Ferdio tint
pairs are measured on the chart rather than around a masthead.

**One correction to the previous draft's own reading, and it is small but it is a number.** It called
The Marshall Project's `#000000 / #3E3E3D / #7B7B7A / #B8B8B7` "a four-step grey ramp that IS the
counterfactual mark". Magnified, the graphic is a field of sub-pixel **black** dots on cream: the
three greys are the route's quantisation of partial dot coverage, not four designed inks. The
measurement is right; the description was an inference. What the pixel route states outright is that
the mark is black on `#F6F6F4` and that it covers about 29 % of the plate.

What is *not* available is the red's coverage — the first draft cited `#FF0B3A` at 3.1 %, read off
`graphic-scrolled.png`; the record's own pixel route sees the pre-reveal state and reports no
chromatic colour at all. The red is evidenced as an ink, not as a share.

### 3. `both-states-named-where-the-marks-are`

- kind: `imported`
- applies: any paired beat
- draws: `axis`
- priority: 6
- evidence: `100-datavizproject-com-data-type-viz54` — **looked at, `graphic.png`** — a dark chip
  capping each rail, `2004`, `2022`; and `…-viz3` (`'04` / `'22` under each pair of stems), `…-viz17`
  and `…-viz36` (column heads over the plot), `…-viz30` (`'04` / `'22` on the endpoint cells
  themselves), `…-viz6` (chips on the bar itself), `…-viz85` (the two rails labelled at their left
  ends)
- evidence: `abc-net-au-news-2018-12-13-how-life-has-changed-for-people-your-age-10` — **looked at,
  the record's own `graphic.png`** — `1981` and `2016` set above their own rails, with no ticks
  anywhere. This line was read off `graphic-scrolled.png` before repair 3; it is now on the record's
  own file
- evidence: `informationisbeautiful-net-visualizations-spotify-apple-music-tidal-mu` — **looked at,
  the record's own `graphic.png`** — `average artist revenue per play` and `total users (millions)`
  set as column heads directly over their own rails, and nothing between them
- evidence: `informationisbeautiful-net-visualizations-gender-pay-gap` — **looked at,
  `screenshot.png`** — `● Female  ● Male` inline above the plot, beside the controls, for 81 pairs
- evidence: `reuters-com-graphics-usa-election-swing-states-myvmadqlzvr` — **looked at,
  `graphic-legend.png` and `graphic-scrolled.png`** — two labelled circles `2016` / `2023` in the
  key directly over the panels, and `2016 ▾` / `2023 ▾` chips on the sloping roofline of the second
  chart
- detect: the artifact carries a text node for each state's name within the plot's own bounding box
  or in the band directly above it, and no state name appears **only** in a key below the plot

**Rule.** The two states are named at the marks — a dated rail cap, a chip on the axis, a column head,
a two-dot key directly above the plot — never in a caption underneath or in a key off to one side.
**Five publications**; it is close to universal in this family, which is itself the evidence.

**Two corrections to the detect that the records force, and both still hold.**

- No pixel budget. The first draft required the name to be **within 40 px above** the plot. On IIB
  *gender pay gap* the key sits at roughly y 285 and `style.graphic.y` is **378** — 93 px. The
  threshold is refuted by its own strongest reference. The rule is *above, not below*, and putting a
  number on it would be `METHOD.md` correction 12's 24-px guard all over again.
- `100-datavizproject-com-data-type-viz19` **fails it**, from the same desk as six references that
  pass: looked at, its `◆ 2004  ◆ 2022` key is below the plot and the two states are named nowhere
  else. Ferdio is not consistent about this, and the treatment's limits section should say so rather
  than let a reader infer universality from six agreeing records of one house.

### 4. `pair-collapsed-names-both-terms`

- kind: `imported`
- applies: the beat draws a difference or a ratio rather than the two states themselves
- draws: `display`, `body`
- priority: 7
- evidence: `projects-propublica-org-miseducation` — **looked at, `screenshot.png`** — "School
  districts where White students are more likely to be in an Advanced Placement class or gifted and
  talented program, compared with **Black** students", with the compared term set in blue and
  regenerated from the `RACE` control. The control and the compared term share the style route's
  `rgb(98, 132, 171)`; the map ramp is `#90BCD2` 1.556 % / `#5498BA` 0.671 % / `#3A7390` 0.379 % /
  `#274D60` 0.299 % (`record.pixel`, sequential, one cluster at 200°)
- evidence: `informationisbeautiful-net-visualizations-star-wars-last-jedi-one-of-t` — **looked at,
  `graphic.png`** — the display line *Movies Critics Loved,* / *But Audiences Really Didn't* in two
  inks, with the deck *"% gap between audience & critics 'rotten tomatoes' score"* naming the derived
  measure in full
- detect: where the plotted value is a difference or ratio of two named series, both series' names
  appear in the display or deck text

**Rule.** Collapsing a pair to one number is legitimate and it destroys the levels. The compensation
is that the sentence beside the graphic must carry both terms. Two independent publications.

**And the colour half of it has one publication, so it is not in the detect.** The first draft
claimed the compared term's fill *matches* the ramp's; measured, ProPublica's control ink
`rgb(98, 132, 171)` is not any of the four ramp classes, it is the same blue family. Star Wars does
not do it at all — its two display inks are white and grey and there is no control to match. "Colour
the compared term to match the selector" is one desk's practice, worth a line in the treatment's
prose and not in its predicate.

### 5. `mirrored-about-a-shared-centre`

- kind: `imported`
- applies: the beat compares exactly two entities across several measures
- draws: layout — closest existing field is the direction's `header: split`, but this is a body
  layout rather than a header one, so it may want a field of its own
- priority: 5
- evidence: `pudding-cool-2022-11-upward-mobility` — **looked at, `graphic-scrolled.png`** — one `0%`
  at the top, arcs growing left for GARDENA and right for FREMONT, `50%` ticked on both sides, each
  side's four readings listed at its own outer edge and aligned to it. The record's own `graphic.png`
  is the opening title card, so no colour claim is founded on this reference
- evidence: `informationisbeautiful-net-visualizations-climate-change-deniers-vs-th` — two columns
  about a `vs` in the gutter, the left block left-aligned and the right block right-aligned, and the
  disputed evidence drawn once in the middle in NEITHER side's colour. **`record.pixel` on
  `graphic.png`**: ground `#231F20` **81.724 %**; THE GLOBAL WARMING SKEPTICS in `#CC3366`
  **0.406 %**, THE SCIENTIFIC CONSENSUS in `#659941` **0.321 %**, and the shared
  Arctic-temperature/CO₂ charts in the gutter in `#57B6DD` **0.634 %** and `#AEDEE4` **0.712 %** —
  the two largest chromatic inks on the plate belong to neither side
- detect: the two entities' marks share one origin and grow in opposite directions on one scale;
  each side's text block is aligned to the frame edge nearest it

**Rule.** A two-entity comparison is symmetric about one shared zero, each side growing outward, and
each side's type aligned to its own outer edge so the two blocks frame the centre. Two independent
publications, in two different media — a radial chart and a prose layout — which is what makes it a
composition rule rather than a chart trick.

**The strongest thing in the IIB reference is a corollary worth carrying into the treatment's text:
the shared evidence goes in the gutter, in neither side's colour.** A comparison whose evidence wears
one side's accent has already decided. The numbers say the gutter's two blues outweigh both partisan
inks combined — 1.346 % against 0.727 % — and looking at the plate confirms what they are: every
hockey-stick, ice-core and CO₂ chart on the poster is drawn once, in the middle, in blue.

### 6. `emphasis-by-outline-not-by-recolouring`

- kind: `imported`
- applies: the beat marks a subject set inside a larger population that is already colour-coded
- draws: `annot`
- priority: 4
- evidence: `informationisbeautiful-net-visualizations-star-wars-last-jedi-one-of-t` — **looked at,
  `graphic.png`** — *The Last Jedi* drawn as an outlined ring with a leader to a four-line note,
  keeping its category's green (`#8CF968` 0.396 %, the Sci-fi / Fantasy class in the footer key)
  while every other film of that category is a filled disc
- evidence: `abc-net-au-news-2019-08-13-rich-school-poor-school-australias-great-ed` — **looked at,
  `graphic.png`** — in a beeswarm of thousands of schools coloured by sector
  (`#68E1CF` 1.203 %, `#FCA0A1` 1.000 %, `#5890FD` 0.666 %, `record.pixel`, categorical), the named
  schools are drawn larger with a dark navy ring and a leader to a card, and **keep their sector
  fill**. Dozens of them, down the length of a 10 520 px scrollytelling column
- detect: the emphasised marks differ from their peers by stroke and by the presence of a label, and
  their **hue** remains the hue their category would otherwise give them

**Rule.** Emphasise with an outline and a label, not by recolouring. The emphasis is then additive
and costs the encoding no channel — the marked entity keeps whatever its category already says about
it.

**Both lines are on their record's own graphic, and Reuters is still out.** The first draft's second
publication was Reuters, on a claim ("the seven battleground states ringed in purple while keeping
their party's red or blue fill") that no capture in that reference directory shows and that the
record cannot support — its style-route mark inventory is exactly two entries,
`fill rgb(214, 64, 0)` ×26 and `fill rgb(64, 64, 64)` ×25, and its pixel route is `not-applicable`.
That evidence stays dropped.

**And the detect has to be about hue, not fill.** On star wars the emphasised mark drops its fill and
carries the category hue in the stroke; on ABC it keeps the fill and adds a neutral ring. "The fill
remains the category's" is false of the first; "the hue remains the category's" is true of both.

### 7. `one-scale-drawn-once-outside-the-panels` — proposed, but probably not this family's

- kind: `imported`
- applies: the beat draws N panels of identical geometry
- draws: `legend`
- priority: 4
- evidence: `projects-propublica-org-graphics-workers-comp-reform-by-state` — **looked at,
  `screenshot.png`** — three dated cartograms (2002 / 2008 / 2014) of the same 50-state tile grid,
  with a single vertical ramp at the far left poled `Cut Benefits` / `Raised Benefits`, and each panel
  titled with its date alone
- evidence: `reuters-com-graphics-usa-election-swing-states-myvmadqlzvr` — **looked at,
  `graphic-legend.png`** — seven state panels of five education categories each, and the key drawn
  once above all of them: two labelled circles `2016` / `2023`, then three specimen bar-pairs labelled
  `LOSS`, `FLAT`, `GAIN`
- detect: a legend or scale element appears exactly once for N ≥ 3 panels of equal geometry, outside
  every panel's bounding box

This is real and evidenced by two publications, but it is a **small-multiples** rule that this family
happened to walk into. **It should probably be filed to whatever family owns small multiples rather
than here**, and the parent should route it. Recorded rather than quietly kept.

*(The first draft described the Reuters legend as "a specimen tile with `80%▸` and `20%▸`" over a
51-tile cartogram. That is a different graphic on the same page and no capture in the reference shows
it. What is above is what the reference's own files show.)*

## Registers

### `legend` (apparatus) — **and this family still unblocks it**

`METHOD.md`'s correction 11 closes with: *"`legend` is still one publication. The Guardian draws one;
no second desk has been read that does."* This family read three more desks, and none of the three
repairs touched any of the readings:

- evidence: `projects-propublica-org-miseducation` — **looked at, `screenshot.png`** — every class
  labelled with its unit (`1-2 times as likely`, not `1-2`), and the three out-of-scale categories
  (`Not Available`, `Less Likely`, `No Black or no White students enrolled`) set at the head of the
  strip in three unrelated hues — grey, green, pink — before the ordered blue ramp begins, each with
  its own words. Type: `graphik 9.9 / 400` (sample `Not Available`) and `Graphik 10.8 / 400` (sample
  `(White students are this number of times as likely to be in …)`), style route
- evidence: `projects-propublica-org-graphics-workers-comp-reform-by-state` — a vertical ramp poled
  `Cut Benefits` / `Raised Benefits`. Type: **`Helvetica 13 / 200, tracking 0.26`** (4 runs, sample
  `Cut Benefits`) and `Helvetica Neue 10 / 400` (202 runs, sample `Raised Benefits`), whose inks are
  the ramp's own poles, `rgb(39, 135, 118)` — exactly the top class fill — and `rgb(128, 28, 25)`, one
  step darker than the darkest fill `rgb(140, 41, 36)` (style route, exact)
- evidence: `informationisbeautiful-net-visualizations-gender-pay-gap` — `● Female  ● Male` inline
  above the plot. Type: **Cabin Condensed 14 / 400**, `rgb(36, 39, 49)` (style route), which finding I
  shows is the *piece's* typeface and not the publisher's
- evidence: `reuters-com-graphics-usa-election-swing-states-myvmadqlzvr` — specimen marks labelled
  `LOSS` / `FLAT` / `GAIN` plus two labelled colour circles, **looked at on `graphic-legend.png`**.
  Its type could **not** be isolated: every candidate key (`Source Sans Pro 12 / 700`, sample `ME`;
  `14 / 700`, sample `10`) is shared with the cartogram's state codes. This reference evidences the
  legend's PRESENCE and geometry, not its voice

The two ProPublica records are **one publication**, and are counted once. That is ProPublica,
Information is Beautiful and Reuters, plus the Guardian already on file: **four publications for the
apparatus, and two — ProPublica and Information is Beautiful — with a measured type spec.** Two is
the floor, so the register can be filed. It derives from `axis` — a legend is the graphic naming its
own scale, which is what an axis label is.

### `delta` (apparatus) — **withdrawn; see the refusals**

The previous draft proposed it and asked the parent to decide whether its evidence was enough. The
answer this pass reaches is no, and the reason is arithmetic rather than taste. It is written up
under "what could NOT be filed".

## Directions proposed

Each is measured off ONE reference. **Provenance is stated for every value**, and where the harvester
did not reach the graphic that is said out loud rather than glossed.

### `dumbbell` — measured from `informationisbeautiful-net-visualizations-gender-pay-gap`

Clean provenance, and untouched by all three repairs: `routes.pixel.measuredFrom` is `graphic.png`,
the 1380 × 1650 inline `<svg>` itself. Every figure below is identical across every version of this
record.

- ground: `#FFFFFF` — pixel route, modal colour, **95.206 % coverage**
- accent: `#6A2A51` — pixel route, hue cluster at **323°**, 0.230 % coverage; style route counts
  **81 fills** of `rgb(106, 42, 81)`
- further accent: `#C6CC7D` — the second pole, **65°**, 0.226 %, also **81 fills**. The palette reads
  **diverging, two clusters, both ramped.** The direction record's single `accent` field cannot hold
  a two-pole comparison; this needs `palette`'s further-accents mechanism.
- furniture: `#B2B2B2` (1.367 %) the connector, `#CCCCCC` (0.768 %) gridlines, `#EEEEEE` (0.648 %)
  group separators
- pad: **30** — the graphic's own left offset in the 1440 viewport (`style.graphic.x`). This is what
  was measured; whether it is the design's intended pad was not established.
- header: `stack` — title, then controls and legend on one line, then the plot
- headRule: `false`
- stroke: **not measured.** The connector's width and the dot radius were not read.

| register | family | size | weight | italic | tracking | case | ink |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| display | Varela Round | 48 | 400 | no | **−2.4** | none | `#242731`, selected term `#6A2A51`, unselected `#CCCCCC` |
| eyebrow | — | — | — | — | — | — | **absent; derive** |
| body | — | — | — | — | — | — | **absent from the graphic; see below** |
| axis | Cabin Condensed | 14 | 400 | no | 0 | none | `#242731` |
| annot | Cabin Condensed | 13 | 700 | no | 0 | none | `#242731` |
| value | — | — | — | — | — | — | **absent; derive** |
| legend | Cabin Condensed | 14 | 400 | no | 0 | none | `#242731` |

**The `body` row, and the reason generalises.** An earlier draft filed `body: IBM Plex Sans
18 / 400 #4F4F56`. Measured across all four Information is Beautiful references in this family,
`IBM Plex Sans` and `Quicksand` appear on **every** one and `Cabin Condensed` and `Varela Round` on
**this one alone**. IBM Plex Sans 18 / 400 in `rgb(79, 79, 86)` is IIB's article body style — the
publisher's furniture, in exactly the sense `METHOD.md` correction 14 names — and does not belong in
a direction measured off the graphic. The piece's own voice is Varela Round for its title and credit
line, Cabin Condensed for everything inside the plot. The row-label column carries its own header
(`job / category of job`, Cabin Condensed 14 / 700) at the axis's baseline.

Style route on the whole page: four families, **zero italic runs**, and every tracked or
case-transformed run belongs to one of the two publisher families. **The graphic itself uses no
italic, no case transform, and one tracking value, the display's −2.4.** Its hierarchy is size,
weight and a single rounded/condensed contrast.

### `dossier` — measured from `themarshallproject-org-2021-08-30-the-black-mortality-gap-and-a-centur`

Provenance with one caveat, and it is `METHOD.md` correction 5's, not any of the three repairs':
`measuredFrom` is `graphic.png`, the canvas itself — but the harvester still catches it **before its
reveal runs**, so that file's palette is `monochrome` with an empty `chromatic`. Repair 3's
scroll-and-wait did not reach this one; correction 5 is still open. The accent below is evidenced by
the style route, not by the pixel route.

- ground: `#F6F6F4` — pixel route, **69.753 %**
- accent: `#FF0B3A` — **style route only**: the ink of the emphatic `acumin-pro 21 / 700` run inside
  the graphic's annotation, and of the site's `Pressura 14` furniture. **The pixel route does not see
  it**, because the state it photographs has not drawn it yet. Its coverage is unknown; the 3.1 %
  an earlier draft quoted was measured on a hand-taken `graphic-scrolled.png` and is withdrawn
- mark: `#000000` (**10.646 %**) — a field of sub-pixel dots, one per death, which the route also
  reports at `#3E3E3D` (**7.348 %**), `#7B7B7A` (**6.023 %**) and `#B8B8B7` (**4.968 %**) as partial
  coverage of the same ink. About 29 % of the plate, and it is the mark rather than decoration —
  the one thing in this direction the pixel route states outright
- pad: **151** — the canvas's left offset in the 1440 viewport (`style.graphic.x`), measured, not
  designed
- header: `stack`
- headRule: `false`
- stroke: **not measured** — the mark is a dot field with no strokes

| register | family | size | weight | italic | tracking | case | ink |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| display | MillerBold (serif) | 55 | 500 | no | 0 | none | `#0B0B0B` |
| eyebrow | Pressura (mono) | 12.5 | 400 | no | **0.1** | **uppercase** | `#353535` |
| body | Utopia-Std (serif) | 23 | 400 | no | 0 | none | `#0B0B0B` |
| axis | acumin-pro | 12 | 300 | no | 0 | none | `#0B0B0B` |
| annot | acumin-pro | 21 | 400 | no | 0 | none | `#0B0B0B` |
| annot / value | acumin-pro | 21 | **700** | no | 0 | none | `#0B0B0B`, accent `#FF0B3A` on the emphatic run |
| deck | PressuraLight (mono) | 22 | 400 | no | **−0.2** | none | `#0B0B0B` |

**One honest merge.** An earlier draft listed `annot` at 21 / 400-700 and `value` at 21 / 700 as
separate rows. The style route sees **one** key for the bold run — `acumin-pro 21 / 700`, 6 runs,
inks `#0B0B0B`, `#FF0B3A` and `#000000` — carrying both jobs. A direction that splits it is inventing
a distinction the page does not draw.

**Four families, three jobs, and the assignment never wavers**: a serif for reading (Utopia body at
104 runs, Miller display, with two italic runs for cited titles), a humanist sans for the graphic's
own voice, and a **monospace, uppercase, negatively tracked at −0.2** for every piece of furniture —
dateline, section labels, byline, photo credits. This is the most legible register system in the
family and the one a newsroom could adopt wholesale.

### `odyssee` — measured from `abc-net-au-news-2018-12-13-how-life-has-changed-for-people-your-age-10`

**Rewritten. Repair 3 turned this from the family's weakest direction into one of its two strongest.**
`routes.pixel.measuredFrom` is `graphic.png`, and that file is now the chart: a slope-chart panel,
two rails capped `1981` and `2016`, two series, two delta pills, drawn on the article's navy paper.
Two earlier passes described the same file as a decorative panel, and it was — because the graphic
had not drawn yet. **Every value below is now confirmed by both routes independently**, which is the
first time that is true of any reference in this family.

- ground: **`#175482`** — pixel route, **87.040 %** of `graphic.png`; style route reads the page
  ground as `rgb(23, 84, 130)`, the same colour
- accent: **`#34E7D8`** (cyan) — pixel route **0.882 %**, cluster at **175°**; style route
  `fill rgb(52, 231, 216)`, **66 marks**
- further accent: **`#FFD70D`** (yellow) — pixel route **0.996 %**, cluster at **50°**; style route
  `fill rgb(255, 215, 13)`, **81 marks**
- ink on ground: `#F7FFF7` (style route, 74 fills) and `#EBEBEB` for prose
- furniture: **`#0E334F`** — the rails. Pixel route **0.152 %**; style route
  `stroke rgb(14, 51, 79)`, **117 marks**
- annot ink: **`#B0E6FF`** — pixel route **0.048 %**; style route `ABCSans-bold 15 / 700`,
  `rgb(176, 230, 255)`
- pad: **285** — `style.graphic.x`, the panel's own left offset in the 1440 viewport; measured, not
  designed, and the panel sits left of the 653 px text column rather than inside it
- header: `stack`
- headRule: `false`
- stroke: not measured
- palette shape: **diverging**, two clusters at **50°** and **175°** — and this is now a true
  description of the chart, where before the repair the record said `monochrome` and was describing
  an undrawn panel

| register | family | size | weight | italic | tracking | case | ink | runs |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | ---: |
| display | abcserif | 40 | 700 | no | 0 | none | `#EBEBEB` | 1 |
| eyebrow | ABCSans-bold | 12 | 900 | no | 0 | **uppercase** | `#F7FFF7` | 61 |
| body | abcsans | 18 | 400 | no | 0 | none | `#EBEBEB` | 102 |
| axis | ABCSans-bold | 12 | 700 | no | 0 | none | `#F7FFF7` | 280 |
| annot | ABCSans-bold | 15 | 700 | no | 0 | none | `#B0E6FF` | 41 |
| value | ABCSans-bold | 15 | 900 | no | 0 | none | `#F7FFF7` | 86 |

Zero italic runs; tracking 0 throughout the graphic. **The hierarchy is carried by weight alone —
400 / 700 / 900 — plus one serif/sans contrast.** This is the family's only dark-ground direction,
and the ground is a saturated navy rather than a near-black, which is the thing worth carrying.

**The `delta` row is gone from this table, and its absence is the honest state.** The pill is real
and it is on the record's own graphic; its type is not measurable. Every `ABCSans-bold` run the style
route sees on that page is set in `#F7FFF7` or white, and the pill's type is dark navy on the fill.
Its size can be estimated by eye at about 12 and its family inferred from the page, and neither is a
measurement. See the `delta` refusal.

## What could NOT be filed, and why

**A refusal written down is worth more than a lever stretched.** Seven here now, and one of them is a
demotion this pass had to make.

### `delta` (apparatus register) — **withdrawn: two publications for the apparatus, zero for its voice**

A register's content is a type spec. This one has none that any route in this corpus produced.

- **Reuters is dropped.** It was the register's only exactly-measured evidence line —
  *"Source Sans Pro 12–14 / 700 in the furniture grey `rgb(102, 102, 102)`, set between the two bars
  of the pair"* — and looked at again on `graphic-legend.png`, magnified, `34%` sits on the 2016 bar
  and `32%` on the 2023 bar. Those are **two levels**, not a change. There is no delta on that plate
  to have a voice.
- **Ferdio can never supply one.** All eight records serve their chart as a raster `<img>`; their
  `style.type` is `stevie-sans` and `Borgia Pro`, which is `100.datavizproject.com`'s own chrome
  (`Hire us`, `Previous`, `We can visualize your own story`). Finding H. Their *placement* evidence
  is excellent and is measured on their own pixels — inside the connector `#19`, after the entity's
  name `#54`, under a `Change` heading `#36`, on the travel leader `#85`, over the cell run `#30`,
  under the stems `#3` — and placement is not what a register carries.
- **ABC is one publication and its type is an eye reading.** Repair 3 put the pill on the record's own
  `graphic.png`, which is a real gain — the container, the fill and the dark-on-fill contrast are now
  visible on the record itself rather than on a walked capture. But the style route cannot isolate the
  pill's key, so the ink, the size and the weight are all inferences.

The distinction the register proposes is real and I still believe it: **a value states a level and
belongs to a mark; a delta is signed, belongs to the relation between two marks, and is repeatedly
given its own container** — a pill, a ribbon interior, a headed column, a leader terminus. Two
publications draw that container. Zero publications in this corpus let a route read the type inside
it. **What would file it is one paired beat from a desk that draws its chart in live DOM text and
prints a delta** — which Ferdio structurally cannot be and Reuters turns out not to be.

One more thing the pixels say against it, and it should be in the record of the refusal:
`100-datavizproject-com-data-type-viz36` sets its delta (`150%` bold over `Increase`) in **exactly
the same treatment as its values** (`4` bold over `World Heritage Sites`). At least one desk gives
the delta its own place and its own container but not its own voice.

### `the-pair-is-one-hue-at-two-strengths` — **still ONE publication after all three repairs**

This was an early draft's priority-9 treatment, on three publications. It is Ferdio alone, and this
pass re-checked whether de-contaminated Ferdio and re-drawn ABC records could re-found it. **They
cannot.**

What survives is real and pixel-clean, and looking at the three graphics confirms it three
geometries deep. `100-datavizproject-com-data-type-viz3` draws Sweden's 2004 in `#B9D6FA` (0.206 %)
and its 2022 in `#3274DA` (0.234 %); Denmark's in `#F7ADA4` (0.066 %) and `#EE5440` (0.164 %);
Norway's in a grey-navy `#8F94A4` (0.115 %) and `#283250` (0.158 %) — three pairs on one plate.
`…-viz6` runs one bar to the 2022 value with the earlier segment in the same hue lightened
(`#3274D8` 2.214 % / `#5495EC` 0.211 %). `…-viz30` inks the endpoint cells at full tone and the
interval between them in the tint (`#EE5440` 0.587 % / `#F6988C` 1.523 %). Three geometries, one
rule, **one desk** (`METHOD.md` correction 4).

What the repairs did NOT do:

- **ABC's re-drawn record does not do it.** `graphic.png` now shows the real chart, and its two
  series are **two hues** — cyan `#34E7D8` at 175° and yellow `#FFD70D` at 50°, `diverging`. Each
  series keeps one hue across both of its observations, which is the opposite arrangement. The
  paired bar chart that *does* draw one blue at two strengths (`Recurrent government funding` pale
  against `Income allocated to capital projects` dark) is on the *other* ABC reference, is visible in
  its `graphic-scrolled.png`, and is still not what the record measures — that record measures the
  beeswarm, categorical, three sectors.
- **Reuters still founds nothing.** Its pixel route is `not-applicable`. `#C1B6DB` and `#6A51A3` are
  in no record — see finding F′, which is unchanged and which this pass re-verified by grepping the
  corpus: **zero `measured.json` in the whole design base contains any of the four hexes.**
- **IIB *spotify*, newly correct, is evidence against.** Its nine connectors each carry their
  service's own hue end to end — `#D48CE5`, `#008A9E`, `#0071BB`, `#EB008B`, `#EECA17` — nine hues,
  categorical, not one hue at nine strengths.
- **And IIB *gender pay gap* contradicts the rule outright**, as it always did: `#6A2A51` at 323° and
  `#C6CC7D` at 65°, diverging, both ramped, 0.230 % and 0.226 %. That is the cleanest pixel evidence
  in the family and it is evidence *against*.

**A second desk drawing one hue at two strengths would file this**, and the desk that appears to do it
is already in the reference directory — ABC's paired bar chart just is not the graphic its record
photographs. That is a targeted re-harvest, not a new draw.

### `connector-is-neutral-furniture` — ONE publication, and the contradiction is now three desks deep

The clearest single idea in the family and it rests on `informationisbeautiful-net-visualizations-gender-pay-gap`
alone: the rule joining the two dots is `#B2B2B2` at **1.367 %** against two poles at 0.230 % and
0.226 % — by coverage the largest non-ground ink on the plate, and by hue it belongs to nothing. It
says "these two are the same job" and nothing else, which is what lets 81 pairs share one plate.
Untouched by all three repairs; this record was always clean.

Nothing corroborates it, and after this pass **three references actively contradict it**, on three
desks:

- `100-datavizproject-com-data-type-viz19` makes the connector the loudest mark on the row and prints
  the delta inside it, in white on its own gradient;
- ABC draws the segment in the **series'** colour, `#34E7D8` and `#FFD70D`, now on the record's own
  graphic;
- IIB *spotify* draws each of its nine connectors in the **entity's** colour, now on the record's own
  graphic.

Those are coherent decisions, not errors: they are the opposite answer to who owns the space between
a pair. One desk neutralises it, three colour it. **A second desk drawing a neutral connector would
file this**, and after this pass the odds look worse rather than better.

### `the-legend-teaches-the-geometry` — ONE publication

`reuters-com-graphics-usa-election-swing-states-myvmadqlzvr` draws a legend of **specimen marks** —
three miniature bar-pairs labelled `LOSS`, `FLAT`, `GAIN`, each showing the vertical offset that
means it — beside two labelled circles for the two dates. It teaches the reader the part of the
encoding they could not have guessed, which is the geometry, and does not waste space on the part
they could.

It is the single best idea I looked at in this family and it is one desk. Not filed. Note that the
capture it is read from, `graphic-legend.png`, was taken with a consent dialog open across the bottom
of the frame — the whole plate is desaturated by the dialog's scrim, which is why nothing about its
**colour** is claimed anywhere in this proposal.

### `no-change-drawn-in-neutral-and-numbered` — ONE publication, and better stated than before

Also Reuters, on `graphic-legend.png`: Georgia's "some college" pair — 2016 and 2023 both 28 % — and
Pennsylvania's, both 24 %, are the only two pairs on the plate drawn in **grey** rather than purple,
and they are among the pairs carrying their two numbers. **This pass's correction to the Reuters
reading makes the observation sharper, not weaker**: what is printed is the pair of levels, and the
desk prints them precisely where the shape has run out of things to say, because two equal bars look
like a drawing error until the numbers say they are not. One desk. Not filed.

### `before-nested-in-after` — **NOT unblocked**

This harvest was asked to look for a second, independent desk doing it. **It did not find one**, and
none of the three repairs changed that.

`100-datavizproject-com-data-type-viz27` was harvested precisely because it is the nesting in a
second geometry — the '04 bar drawn narrow and saturated *in front of* a wider, tinted '22 bar — and
it was **deleted**, because Ferdio doing it twice is still Ferdio doing it (correction 4). No
newsroom reference in this family nests one state inside the other. The closest is
`base-plus-difference-in-one-mark` above, which The Marshall Project and Ferdio share and which is a
different rule: the states are *concatenated* along one mark, not *contained* one within the other.

The treatment stays unfiled.

## The segment rule — evidence check, not a proposal

The owner has accepted the recommendation and `treatments/segment-between-two-named-states.md` is
filed. This section exists only to state, plainly and on the current records, that the evidence cited
for it is right — and to name the two places where the filed record's wording is more confident than
its files.

**The four publications, re-verified reference by reference, on the current corpus:**

| publication | reference id | what it draws | what file it is on NOW |
| --- | --- | --- | --- |
| Ferdio | `100-datavizproject-com-data-type-viz54` | a straight segment between two observations, rails capped `2004` / `2022`, no axis between them | the record's own `graphic.png` — **verified by eye this pass** |
| Ferdio | `100-datavizproject-com-data-type-viz17` | a straight segment, column heads `2004` / `2022` over the plot | the record's own `graphic.png` — **verified by eye this pass** |
| ABC | `abc-net-au-news-2018-12-13-how-life-has-changed-for-people-your-age-10` | straight cyan and yellow segments between rails capped `1981` and `2016` | **the record's own `graphic.png`, as of repair 3.** Previously read off `graphic-scrolled.png`; that capture still corroborates the "across a whole article of panels" half, which the record's single panel does not show |
| Reuters | `reuters-com-graphics-usa-election-swing-states-myvmadqlzvr` | the pair as a column's sloping roofline between a `2016 ▾` and a `2023 ▾` chip | **`graphic-scrolled.png` only.** This record's pixel route is `not-applicable` and it has no `graphic.png` at all. The filed treatment's table says "the graphic"; the honest phrase is *a walked capture kept beside the record*, admissible for geometry and text under this file's provenance convention, and for nothing else |
| Information is Beautiful | `informationisbeautiful-net-visualizations-spotify-apple-music-tidal-mu` | nine curved connectors between an "average artist revenue per play" rail and a "total users (millions)" rail, column heads directly over each rail | **the record's own `graphic.png`, as of repair 2.** The filed treatment's table says "the piece's own capture", which was true before this pass and is now an understatement |

Both files the filed treatment hedged on have improved, and the one it overstated is Reuters. Neither
changes the count: four publications draw the segment, and dropping Reuters would still leave three.

**The two limits it names are both confirmed on the pixels this pass:**

- `100-datavizproject-com-data-type-viz19` fails the naming half — looked at, its `◆ 2004 ◆ 2022` key
  is below the plot and the states are named nowhere else. It is also the one Ferdio piece that runs
  its segment **along a continuous value axis** (0 / 5 / 10 / 15, gridlines through the marks), so it
  fails both halves of the predicate at once. The treatment therefore refuses a real published
  dumbbell, which is worth knowing and is not an argument against it.
- The 93 px figure is exact: IIB *gender pay gap*'s key sits at roughly y 285 and `style.graphic.y`
  is **378**.

**And one factual correction the filed treatment needs.** Its closing paragraph says: *"Ferdio's
`#17` and `#54` give each country a hue … `#19`, `#36` and `#85` give the hues to the dates instead
and reduce the countries to two-letter codes."* Looked at, **`#85` belongs in the first group, not
the second**: its `DK` chip is red in both 2004 and 2022, `NO` is dark navy in both, `SE` is blue in
both, and the dates are named on the rails. It reduces the countries to two-letter codes *and* gives
them the hue. The correct membership is:

- **the entity owns the hue** — `#3`, `#6`, `#17`, `#30`, `#54`, `#85` (six records)
- **the date owns the hue** — `#19` (blue 2004 diamond, red 2022 diamond), `#36` (red 2004 column,
  blue 2022 column)

The constraint stands and the count of six stands; only the membership was wrong.

### One finding that is not a lever

**The accent belongs to the entity or to the date, and never to both.** Both arrangements work; doing
both makes two accents and neither reads. It is a real constraint, visible on six records' own pixels
rather than on a crop, and I could not turn it into a treatment with a `detect`, so it is recorded
here for the doctrine rather than filed as a lever. The membership above is the corrected version.

## What the method itself got wrong

Eleven things now. Three were closed by corrections 13 and 14; two more are closed by the repairs
this pass verified; one stands; two are this proposal's own defects; three are structural.

### A. `largestGraphic` picks the site's own logo on `100.datavizproject.com` — **CLOSED**

An early draft found this and described it correctly: on every one of the eight Ferdio references the
harvester selected an `svg` **280 × 80 at `y: 0`**, the DVP wordmark, and the pixel route fell back to
photographing the whole page. `…-viz54` filed a 44.9 / 44.5 ground split and `#3274DA` at **8.662 %** —
the fixed navigation bar, which happens to be the same blue the charts are drawn in.

`METHOD.md` correction 13 closes it and the current records prove the close: all eight select the
chart `<img>` at `308, 172, 823 × 823`, all eight read **diverging**, poles at 216° / 7° (212° / 7°
on `…-viz85`), white ground at **79.288 – 97.478 %**.

**The five DVP references filed under `line` carried the same defect** and should be confirmed
re-harvested by whoever owns that family.

### B. The pixel route's chromatic palette can be a SITE BANNER, and three records will agree about it — **CLOSED**

The three dark-ground Information is Beautiful references once reported the **identical** four
chromatic colours — `#D4537A` 0.70 %, `#EAAB4A` 0.68 %, `#ECB445` 0.65 %, `#E69B53` 0.63 %, clusters
at 342° and 37° — for three completely different pictures: the pink→amber *"New! Learn to do
data-viz"* promotional bar across the top of every page on the site. It is still visible in each
record's `screenshot.png`, which is how it was caught.

This was worse than a single bad reading, because **three records corroborating each other is exactly
the shape of a trustworthy measurement**, and it is why the audit found those four hexes cited in
three separate proposals by three agents who could not see each other's work. Verified closed this
pass: **zero `measured.json` in the whole design base contains any of the four**, and the three
records now report three unrelated palettes (`#231F20` 81.7 %; `#333333` 90.1 %; `#1C1C1C` 90.0 %).

Symptom to look for, if it ever returns: `routes.pixel.measuredFrom: "screenshot.png"` plus identical
chromatic values across records from one host.

### C. A saturated GROUND destroys the palette shape — **CLOSED, and by repair 3 rather than by the exclusion**

An early draft argued that a saturated ground legitimately enters the chromatic set and buries the
encoding, and that the fix was to exclude the modal colour after naming it as the ground. That is now
the behaviour: ABC *how life has changed* had `chromatic[0] = #175482` at **92.064 %**, then
`#144C75` at 1.72 %.

What the previous pass could not fix, and said so, was that the record's palette shape was
`monochrome` — *"a correct description of a decorative navy panel; a shape is only as good as the
object under it."* **Repair 3 fixed the object.** The record is now `diverging`, `#FFD70D` 0.996 % and
`#34E7D8` 0.882 %, clusters at 50° and 175°. The ground exclusion was necessary and it was not
sufficient; what made the number mean something was making the graphic draw.

### D. The consent word list matches whole labels, and German consent buttons are phrases — **stands**

`zeit.de` returned a full-page consent wall. Its accept button reads **"Zustimmen und weiter"**;
`CONSENT_WORDS` anchors on `^…$` and contains `zustimmen`, so it did not fire. The same shape will
miss "Alle akzeptieren", "Akzeptieren und weiter", "Tout accepter et continuer", "Accept and
continue". A prefix match on a button whose label *begins* with an accept word would have crossed
this wall, and it is a smaller change than it sounds.

Two known limitations were also confirmed rather than discovered: `theplotline.org` opens on
"Click anywhere to begin" — an entry that is neither a button nor a link, exactly the
`kashmir-documentary` case in correction 12 — and `divides.socialpolicylab.org` puts its graphics
behind a `PLAY` control and arrow-key navigation, which nothing in the harvester reaches.

### E. Url-list survivors were unrecognisable in their own record — **stands, now at 2 of 7**

Reuters, ABC ×2 and The Pudding all once photographed as title cards, decorative panels or the wrong
graphic; The Marshall Project photographed the right element in the wrong animation state. Every one
reported `style ok, pixel ok`. The count has fallen twice: to four when Reuters started reporting
honestly that it has nothing, and now to **two** — The Pudding's title card and The Marshall
Project's pre-reveal canvas. ABC *how life has changed* is fixed outright.

The recovered captures kept in the reference directories as `graphic-scrolled.png` (and
`graphic-legend.png` for Reuters) came from a **scratchpad-only** script that walks the whole page in
700 px steps, waits, then photographs every graphic element above 320 × 200. `measured.json` was
never touched. **And that is exactly where the four dead hex values came from.** See F′.

### F′. A capture kept beside a record reads as part of the record — **the sharpest defect in these five reports, and it is ours**

`#C1B6DB`, `#6A51A3`, `#B8DAEA`, `#1D81A2` were never in any record. They were produced by running
`pixel-palette.mjs` — the real route, correctly — over `graphic-scrolled.png`, a file a previous wave
captured itself and stored in the reference directory next to `measured.json`. The numbers are honest
measurements of the file they name. The defect is that the note then reports them **in the record's
voice**: *"the pixel route classifies `#6A51A3` as chromatic and `#C1B6DB` as neutral furniture at
6.0 %."*

Nothing downstream can tell that sentence from a reading of `measured.json`. That is `METHOD.md`
correction 6's exact warning wearing a new costume: not an invented number, but a real number
attributed to a channel that never produced it.

**Re-verified this pass.** `grep -ril` across the whole design base returns exactly three files
containing any of the four hexes: this proposal, `references/paired/reuters-…/NOTES.md`, and
`references/paired/abc-…-rich-school-poor-school-…/NOTES.md`. **Zero `measured.json`.** The Reuters
record's pixel route reads `not-applicable` — *"no graphic outside the site's own chrome"* — so the
sentence naming "the pixel route" is checkable, and it fails.

**Two rules would close it**: a recovered capture is never measured for colour unless the measurement
is written back into the record; and a sentence naming "the pixel route" must be checkable against
`routes.pixel`.

### G. Which DOCUMENT was fixed, then which GRAPHIC — **mostly closed by repairs 2 and 3**

Corrections 13 and 14 stopped the harvester photographing the website. They did not stop it
photographing the wrong drawing on the right page. Repair 2 (lead-graphic tie-break) and repair 3
(sticky scrollytelling) close most of what was left. The previous pass's table, re-measured:

| reference | previous pass | now |
| --- | --- | --- |
| `informationisbeautiful-…-spotify-apple-music-tidal-mu` | *Who Owns Spotify?*, a treemap 1280 × 816 | **FIXED by repair 2** — *Money Too Tight to Mention?*, 1280 × 693 at `documentTop` 176 |
| `abc-net-au-…-how-life-has-changed` | a 390 × 479 decorative panel | **FIXED by repair 3** — the same element, drawn: a slope chart with two named rails |
| `projects-propublica-org-graphics-workers-comp-reform-by-state` | "the matrix, not the cartograms" | **not a defect.** The three cartograms are ~200 × 200 each, far below 75 % of the matrix's 960 × 670, so size correctly leads. Both are real graphics on one page, which is why this record is filed under `heatmap/` too |
| `abc-net-au-…-rich-school-poor-school` | "a beeswarm, not the paired bar chart" | **not a defect.** The beeswarm is the article's lead graphic at `documentTop` 1082, `nearTheTop: true`; the paired bar chart is a secondary figure much further down. The record measures what the page leads with, which is the rule |
| `pudding-cool-2022-11-upward-mobility` | the opening title card | **STANDS, and no rule can reach it.** The title card is 1280 × 768 at `documentTop` **26** — both the largest graphic and the one nearest the top. It is an outline US map with a photograph of a child, and the piece is a mirrored radial comparison of two cities |
| `themarshallproject-org-…-black-mortality-gap` | the right canvas, before its reveal | **STANDS** — correction 5, untouched. Repair 3's wait reaches a scroll-drawn graphic; it does not reach one whose reveal is driven by continued scrolling past it |

Two remain, and they are two different problems. The Pudding is the honest limit of a
position-and-size heuristic: a piece whose opening image is deliberately the biggest and topmost
thing on the page. The Marshall Project is correction 5.

### H. A raster graphic has no measurable type at all — **stands**

All eight Ferdio references serve their chart as an `<img>`. Their `style.type` is therefore
`stevie-sans` and `Borgia Pro` at 1–6 runs a key — `100.datavizproject.com`'s own chrome, with
samples like `Hire us`, `Previous` and `We can visualize your own story`. The same is true of the
three Information is Beautiful posters, whose type is IIB's article furniture.

This is `METHOD.md` correction 14 without an iframe to open: there is no frame, there are no glyphs,
there is nothing to read. **Any type claim about a Ferdio or a poster drawing is unevidencable by this
corpus**, and it is now the proximate cause of the `delta` register's withdrawal. A record whose
graphic is a raster should probably declare its style route `not-applicable for the graphic` the way
a Firecrawl record declares its pixel route, rather than filing the host's type beside a picture of
somebody else's chart.

### I. Two type families that appear on every page of a host are the host's — **stands, and it is a usable test**

Counting type runs by family across this family's four Information is Beautiful references:

| family | gender pay gap | climate | star wars | spotify |
| --- | ---: | ---: | ---: | ---: |
| IBM Plex Sans | 56 | **79** | 50 | 69 |
| Quicksand | 20 | 21 | 20 | 20 |
| Cabin Condensed | **112** | 0 | 0 | 0 |
| Varela Round | **14** | 0 | 0 | 0 |

(The climate column read 78 in the previous draft; recounted, it is 79.)

IBM Plex Sans and Quicksand are on every page; Cabin Condensed and Varela Round on exactly one. The
first pair is the publisher's article furniture, the second is the piece's own voice — and this is
what corrected the `dumbbell` direction's `body` row. **Three or more records from one host is all it
takes to separate them**, and it costs nothing but counting. Where a family harvests only one or two
references per host, it cannot run this test and should say so rather than file the host's type as
the graphic's.

### J. Two routes agreeing on the same value is the only corroboration a single record can offer — **new**

Repair 3 produced the first reference in this family where the pixel route and the style route,
looking at the same object by different means, name the **same five colours**: `#175482`, `#FFD70D`,
`#34E7D8`, `#0E334F`, `#B0E6FF`. Finding B is the reason this matters. Three records from one host
agreeing is not corroboration — it is one contaminant seen three times. Two *routes* agreeing on one
record is corroboration, because the routes share no code path and no failure mode: one reads a PNG,
the other reads computed styles.

**This is a check the corpus could run and does not.** Where a record's pixel accents and its style
route's most-counted fills name different colours, one of the two is measuring something else — which
is precisely the state ABC *how life has changed* was in for two waves, reporting `ok` on both routes
throughout.

### K. Two numbers beside a pair are not a delta — **new, and it is this proposal's own reading defect**

The previous draft read Reuters' `34% 32%` as a printed change and built two things on it: the third
publication of `the-change-is-printed`, and the only exactly-measured evidence line of the `delta`
register. Magnified, the two numbers sit one on each bar. They are levels.

It cost a treatment one publication (it survives at two) and a register its life. The general shape
is worth writing down because it is not a harvester defect and no guard can catch it: **a number
adjacent to a pair of marks is a level until you have checked it against the two plotted values.**
The check is arithmetic and takes seconds — 34 and 32 are the endpoints; a delta would have read
`-2`, `-2 pts` or `-6%` — and the previous pass did not run it, on a plate it had already opened,
because the numbers *looked* like the thing it was hunting for.

`METHOD.md` correction 6 says a number written before it is checked is the worst defect this corpus
can carry. This is its sibling: a number **read** before it is checked.
