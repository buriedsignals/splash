# Proposal — the scatter / bubble family

What this harvest thinks should be **filed**, for the parent to integrate. Nothing here has been
written into `treatments/`, `directions/`, `registers/` or the code, and nothing has been rendered.

**Family definition used:** two quantitative variables, at least one carried by position, no time
axis. Two records are filed at the family's edge (one axis is time) and say so in their own notes.

---

# 0. What this pass changed

This file has now been revised twice. The first revision answered `METHOD.md` corrections 13 and 14
— the pixel route had been photographing the **website** rather than the piece. The corpus has since
been repaired three more times, one of them because of what this family reported, and every record
below was re-harvested on **2026-09-08**. All thirteen still report
`routes.pixel.measuredFrom: "graphic.png"`; none is `not-applicable`, none is `screenshot.png`; all
thirteen now also carry `style.graphic.documentTop` and `style.graphic.nearTheTop`, and
`nearTheTop` is **true on all thirteen** — every record measures a graphic the page leads with.

## Repair 1 — anything floating is hidden for the length of the photograph

**This is the repair this family's previous pass forced, and it worked.** That pass measured three
rows of `100.datavizproject.com`'s fixed navigation bar inside all four Ferdio clips — 96 % of
`viz72`'s entire reported blue, 84 % of `viz70`'s, 43 % of `viz7`'s — and refused, on that basis, to
let any colour claim in this file rest on a Ferdio record.

The residue is gone. Measured directly on the four current `graphic.png` files, the top sixty rows
of `viz7`, `viz70` and `viz72` contain **zero** non-white pixels; `viz93` contains **20**, and they
are the crown of its blue donut and the `13%` beside it. **The blanket refusal is lifted.**

What the four plates now report, on their own pixels:

| record | ground | red | blue | navy, filed as a *neutral* | shape |
| --- | --- | --- | --- | --- | --- |
| `100-datavizproject-com-data-type-viz7` | `#FFFFFF` 97.38 % | `#EE5440` 0.417 % | `#3274D8` 0.377 % | `#283250` 0.385 % | diverging, 2 |
| `100-datavizproject-com-data-type-viz70` | `#FFFFFF` 98.08 % | `#EE5440` 0.0298 % | `#3274D8` 0.0290 % | — | diverging, 2 |
| `100-datavizproject-com-data-type-viz72` | `#FFFFFF` 98.03 % | `#F05440` 0.0105 % | `#3274DA` 0.00988 % | `#0B1629` 0.0815 % | diverging, 2 |
| `100-datavizproject-com-data-type-viz93` | `#FFFFFF` 95.57 % | `#ED5440` 0.272 % | `#3274D8` 0.563 % | `#283250` 0.414 % | diverging, 2 |

Three things follow, and they are set out in 1.6, 5.1, 5.3 and 5.4.

- **1.6's Ferdio evidence is now measured rather than eye-read.** `#7`'s three label chips are
  `#3274D8` (Sweden), `#EE5440` (Denmark) and `#283250` (Norway) — the same three fills its three
  dots carry, on a `#FFFFFF` plate.
- **The old §5.1 is dead in every particular**, including its closing arithmetic: `viz70` and
  `viz72` no longer agree at 0.394 % and 0.374 %, they read 0.0290 % and 0.00988 %, a factor of
  three apart. The suspicious agreement *was* the navigation bar, exactly as
  `two-records-that-agree-exactly-are-both-wrong` predicts.
- **The old §5.4's third bullet is dead.** `viz72` no longer reports `sequential, 1 cluster`; all
  four Ferdio records now report `diverging, 2 clusters` at 7° and 216°. The defect that survives is
  smaller and singular: the navy third entity is still below the chromatic floor, so the classifier
  counts two where a reader sees three (5.3).

**And repair 1 is not complete.** One band of the ABC's own section navigation is inside that
record's `graphic.png`. See 5.1, which now names it.

## Repair 2 — the largest graphic on a page need not be the piece the url names

This family carries six `informationisbeautiful.net` records, more than any other, and the picker's
new tie-break — size leads, but among graphics within 75 % of the largest the one the page leads
with wins — is aimed squarely at that archive. **All six were re-checked against their pixels, and
all six are the piece the url names.** None changed:

| record | what the plate says it is | `documentTop` | ground |
| --- | --- | ---: | --- |
| `…-best-in-show-whats-the-top-d` | *Best in Show: The Ultimate Data Dog* | 176 | `#F7F1E1` 81.82 % |
| `…-caffeine-and-calories` | *The Buzz vs The Bulge / Caffeine and calories* | 176 | `#FDFDFC` 8.14 % |
| `…-hollywood-2023-hits-flops` | *Hollywood Hits & Flops 2023 so far* | 164 | `#FFF0F0` 85.68 % |
| `…-snake-oil-scientific-evidenc` | *Snake Oil Supplements?* | 176 | `#FFFFFF` 46.25 % |
| `…-star-wars-last-jedi-one-of-t` | *Movies Critics Loved, But Audiences Really Didn't* | 176 | `#333333` 90.12 % |
| `…-the-microbescope-infectious-` | *The MicrobeScope* | 258 | `#FCFCFC` 91.96 % |

Repair 2 **confirms** this family rather than correcting it, and that is worth writing down: a
tie-break that changes nothing on six records from the archive it was written for is evidence the
rule is narrow, which is what a rule of that kind should be. The one record it plainly did move is
ABC's, below.

## Repair 3 — a scrollytelling graphic is itself `position: sticky`

`echelle` is measured off ABC's *Rich school, poor school*, whose graphic is a 10 520 px scroll
canvas held sticky while the prose travels over it — precisely the thing repair 1 would have hidden.
It now reads:

```
ground   #FEFEFE  83.90 %   on an svg 700 x 10 520 at documentTop 1082, nearTheTop: true
accents  #68E1CF  1.203 %   #FCA0A1  1.000 %   #5890FD  0.666 %
shape    categorical, 3 clusters at 171 / 359 / 220 degrees
```

**Both earlier numbers are withdrawn.** The first pass reported `#FFFFFF` at 89.9 % on a
700 × 10 520 canvas; the revision reported `#FEFEFE` at 84.8 % on a 748 × 10 394 one. The record now
names a 700 × 10 520 `svg` again and reports `#FEFEFE` at **83.90 %**, and — unlike either
predecessor — the plate is demonstrably **drawn**: read in eight slices, it carries the full
beeswarm of some 8 500 circles in three sector colours, every callout card with its photograph, the
dashed `THE RICHEST 1%` rule and the prose cards. Three passes, three numbers, one of which is a
picture of the finished graphic. That is the one this file quotes.

## What this pass found that no previous pass could

- **ABC separates its axis name from its axis values by ink as well as weight, and the record's
  computed colours say otherwise.** Both runs report `rgb(0, 0, 0)`. Measured on the pixels,
  `INCOME` is painted at grey **`#AAAAAA`** (0.262 % of the frame, in the record's own neutral list)
  and `$105,000,000` beneath it at **`#CCCCCD`** (0.146 %). For an SVG `<text>` with its own `fill`,
  `record.style.type[].colors` is the CSS `color` property and **not what is painted**. New in 5.9.
- **The style route reads the PAGE, so where a page carries two graphics its tuples are a union of
  both** — and the ABC page carries two. `ABCSansRegular 12 / 400 / trk 2.3`, sample `$50m`, which
  the previous pass paired with `INCOME` as treatment 1.3's ABC evidence, **is not a string that
  appears anywhere on this graphic**; its siblings `Enter your school to see its income and
  expenditure.` and `Bigger circle=Bigger capital expenditure` place it on the page's *other*
  graphic, a school lookup. **1.3's ABC row is rewritten** onto evidence that is string-matched to
  the plate, and 2.7 and 3.2 are caveated. 1.3 still stands on three publications.
- **`METHOD.md` correction 6, in miniature and in our favour.** `viz7`'s own `NOTES.md` records a
  hand crop taken when the record could not be trusted: `#EE5440` at 0.47 %, `#3274D8` at 0.43 %.
  The repaired harvester says 0.417 % and 0.377 % on a slightly larger box. A hand crop that agrees
  with the machine to within a twentieth of a point is worth recording as a fact about the method.

## What survived unchanged, and what is still refused

Every treatment proposed for filing survives, including the two the last pass promoted out of the
refused table. `threshold-rule-named-in-words` (1.5) and `label-chip-carries-the-class` (1.6) were
re-checked on the current numbers and on the current pixels: both still clear the floor at two
independent publications, and 1.5 gained a *third* instance at Information is Beautiful (*Snake Oil
Supplements*' `WORTH IT LINE`) which corroborates nothing and shows the shape's range. Every refusal
in section 2 still refuses. **`ground` is still meaningless on a gradient plate** — *Caffeine and
Calories*' paper is a vertical ramp and the field reports the top 8 % of it (5.7) — and **the
MicrobeScope's welcome modal still contaminates the pixel route while its type stays clean** (5.2),
re-checked on the current `graphic.png` and visible in it.

*Carried forward from the previous revision so the audit trail is not lost.* An audit of the first
version of this file found nine hexes cited in it that appear in no record. Eight —
`#D4537A` `#EAAB4A` `#ECB445` `#E69B53` `#DE7B64` `#E28B5B` `#D65C76` `#EEBB41` — were the
Information is Beautiful **promotional banner**, and were quoted as the *diagnosis* of a
contamination, never as evidence. The ninth, `#4FE0C0`, was the code-side `nocturne` direction's
accent, quoted from the spec, which itself records it as never having been measured. None founded a
treatment, a register or a direction, and none appears in this file.

---

## Yield

| archive | drawn | harvested | survived looking | proposed for filing |
| --- | ---: | ---: | ---: | ---: |
| datavizproject | 8 | 8 | 4 | 4 |
| informationisbeautiful | 10 | 10 | 6 | 6 |
| url-list | 12 | 11 | 3 | 3 |
| **total** | **30** | **29** | **13** | **13** |

One url did not harvest: `projects.propublica.org/americas-highest-incomes-and-taxes-revealed/`
crashed the headless browser (`ConnectionClosedError`) on three separate attempts, twice inside a
pool and once alone. Its half-written directory was deleted rather than left as a record with no
`measured.json`.

**The url list paid almost nothing, again.** Twelve newsroom urls, **one** reached a real graphic
(ABC). The other ten reached a hero illustration (Kontinentalist, Pudding ×2, The Markup, Texas
Tribune), a photograph (Guardian), a newsletter modal over an illustration (Texas Tribune), a green
lazy-load placeholder (ABC, *Sam Kerr*) or a chart that was not of this family (ABC, *FIFA 2023* —
a radial flower). Two Information is Beautiful urls chosen by subject also turned out not to be of
this family (*Plenty More Fish* is a map; *Which Fish* is a table).

**A parallel-safety incident, and the check that closes it.** The first three pool files were
written to the shared scratchpad root under generic names (`pool-dvp.txt`, `pool-iib.txt`,
`pool-urllist.txt`); two of the three were gone by the time the second harvest ran, overwritten or
removed by one of the four sibling agents working the same tree. `METHOD.md`'s parallel-safety
section covers the *corpus* directories and says nothing about the pool files, and a pool file is
exactly where a collision is invisible: the harvester would have reported `style ok, pixel ok` on
another family's urls and written them into `references/scatter/`.

Two things closed it and both belong in the runbook:

1. **Namespace every pool file by family** — the pools for this harvest are now
   `pool-scatter-dvp.txt`, `pool-scatter-iib.txt`, `pool-scatter-urllist.txt` in a `scatter/`
   subdirectory of the scratchpad.
2. **Reconcile the reference directories against the drawn urls before writing anything.** Every one
   of the thirteen filed directories was checked, by reading each `measured.json`'s own `url` back
   against the thirty urls actually drawn. All thirteen matched; **no alien reference is in this
   family's directory.** This check costs one script and is the only thing that would catch the
   failure, because nothing goes red.

**What actually worked was looking at 100 thumbnails.** `100.datavizproject.com` is indexed by
`shape-*` and `property-*` in the class attribute of its index page, and its 100 thumbnails were
downloaded and assembled into two contact sheets, which reduced a 100-item archive to eight
form-correct candidates in one look. This is the only reliable form-based draw the three archives
offer, and it confirms `METHOD.md` correction 2 rather than working around it.

## Publications reached

| publication | records | usable as independent evidence |
| --- | ---: | --- |
| `informationisbeautiful.net` | 6 | yes, as **one** publication |
| `100.datavizproject.com` | 4 | yes, as **one** publication |
| `ourworldindata.org` | 2 | yes, as **one** publication |
| `abc.net.au` | 1 | yes, as **one** publication |

Four publications, so an imported treatment is possible in this family — which is more than the map
family had after two waves. But the *interesting* practices cluster at Information is Beautiful, and
that is where most of the refusals below still come from.

**One naming trap, because it caused confusion in the first pass.** The record
`informationisbeautiful-net-visualizations-star-wars-last-jedi-one-of-t` is the plate titled
***Movies Critics Loved, But Audiences Really Didn't***. It is one reference, not two, and both
names appear below.

**What may found a TYPE claim in this family.** **Five** of the thirteen carry type that is genuinely
the graphic's: the two Our World in Data records, *The MicrobeScope* and ABC (live `<svg>` with its
own text), and Hollywood (through its `graphicFrame`). The other **eight** — four Ferdio and four
Information is Beautiful posters served as a single `<img>` — have no readable graphic type at all,
and their `record.style.type` is the publisher's furniture. Nothing below takes a type claim from
those. *The previous version of this paragraph said "six … the other five", which is eleven; the
arithmetic is corrected here.* *And of the six, ABC's tuple list is a union of its page's two graphics, so
this file builds only on tuples it could match to a string visible on the plate (5.9).*

**What may found a COLOUR claim, which this pass changes.** All thirteen. Every record measures its
own graphic, and repair 1 has taken the site chrome out of the four `100.datavizproject.com` clips,
so the blanket refusal the previous pass imposed on Ferdio colour is lifted (5.1). **Two colour
refusals remain, and they are about the plate rather than the route:** *The MicrobeScope*, whose
plate is dimmed behind its own welcome modal (5.2), and *Caffeine and Calories*, whose paper is a
vertical gradient so that `ground` has nothing to name (5.7).

---

# 1. Treatments proposed for filing

## 1.1 `bubble-label-scales-with-its-mark` — imported

```
kind      imported
name      A bubble's label is set at a size proportional to the bubble
applies   the beat encodes a quantity in mark area AND names individual marks
draws     value
priority  4
evidence  ourworldindata-org-grapher-life-expectancy-vs-gdp-per-capita
evidence  informationisbeautiful-net-visualizations-snake-oil-scientific-evidenc
detect    across the named marks in the delivered artifact, the rank order of label font-size
          matches the rank order of mark area, and the label size range spans at least 1.3x
```

**The rule.** Where the mark's area carries a quantity, set the mark's own label at a size that
tracks it. A big subject is named in big type.

**Where it was seen, and how each was read.** Our World in Data: **measured** by the style route,
one type tuple per named country — `India 14.3`, `United States 12.6`, `Indonesia 12.5`,
`Pakistan 12.4`, `Nigeria 12.3`, `Russia 12.1`, `DR Congo 11.9`, `South Africa 11.7`, `Kenya 11.6`,
`Angola 11.5`, `Mali 11.4`, `Central African Republic 11.2`, `Lesotho 11.1`; and the same rank
order again on a second, differently-populated chart
(`ourworldindata-org-grapher-co2-emissions-vs-gdp`: `Turkey 11.8`, `Tanzania 11.7`, `Nepal 11.5`,
`Sweden 11.3`, `Kyrgyzstan 11.2`, `Latvia 11.1`). Every one of those tuples is present in the
corrected records, unchanged, and the graphic confirms them: `China` and `India` are the largest
names on the plate, `Chad` and `Lesotho` the smallest. Information is Beautiful, *Snake Oil
Supplements*: **read from the pixels** — the plate is a raster served as one `<img>`, so no tuple
exists and its `style.type` is the publisher's furniture — `garlic / blood pressure` set large
inside its circle down to `rhodiola rosea L. / fatigue` at a few points inside its own.

**The two publications place the label differently** — OWID outside the circle, IIB inside it — and
that difference is the point: the rule is about the *size*, and it survives both placements.

**What limits it.** It only works where the size range is wide enough to be visible and narrow
enough that the smallest label is still legible. IIB's answer at the small end is to keep shrinking
the type; Our World in Data's is to stop naming. Both are legitimate and the arbiter must choose
one; nothing here decides which.

*One thing the plate shows that the rule does not carry, seen in this pass: on Snake Oil the label
sits INSIDE the mark and its ink flips with the mark's own fill — white on the deep blue at
`STRONG`, near-black on the pale yellow at `NONE`. That is 1.6's contrast logic applied to a mark
rather than to a chip, and it is the reason the shrinking labels stay readable all the way down.*

## 1.2 `size-key-is-a-specimen-of-the-mark` — imported

```
kind      imported
name      The size legend is the chart's own mark, outlined, at two or three sizes, named
applies   the beat encodes a quantity in mark area
draws     key            <- proposed register, see section 3
priority  6
evidence  ourworldindata-org-grapher-life-expectancy-vs-gdp-per-capita
evidence  informationisbeautiful-net-visualizations-snake-oil-scientific-evidenc
detect    the delivered artifact carries two or more unfilled marks of the SAME path as its data
          marks, at different scales, sharing an edge or a tangent, with a text run naming the
          size variable within one line-height of them
```

**The rule.** Draw the size key as the mark itself, unfilled, at two or three sizes nested on a
shared lower tangent, and caption it with the name of the variable the area carries.

**Where it was seen.** Our World in Data: two concentric circles labelled `1.4B` and `600M`, bottoms
aligned, under the caption `Circles sized by Population` — and, measured, **the caption's own
numbers are set at the sizes of their circles** (`1.4B` at `Lato 11`, `600M` at `Lato 9.4`), so the
key demonstrates 1.1 as well as the size channel. Both tuples are in both corrected OWID records.
Information is Beautiful, *Snake Oil Supplements*: three outlined circles of increasing radius on a
shared baseline, captioned `Popularity` with `(google hits)` beneath.

**Three further uses at the same desk**, which corroborate nothing but show the shape's range:
*Hollywood Hits & Flops* draws the key as an outlined **triangle**, because a triangle is its mark,
beside the words `budget ($m)`; *Movies Critics Loved* draws a single ring captioned `BUDGET`, which
is one specimen and therefore does not satisfy the detect above; and *Best in Show* — read in this
pass — draws its `SIZE` key as **three dog silhouettes**, its own mark, at three sizes on a shared
baseline captioned `sml med lrge`, with `INTELLIGENCE` beside it as two silhouettes captioned
`dumb clever`. That is the treatment done with a pictogram rather than a circle, which is the
strongest evidence in this file that the rule is about the *specimen* and not about the shape.

**Values or no values, and say which.** Our World in Data labels the specimens with numbers because
its area scale is readable quantitatively. All three IIB keys carry **no** numbers, which is an
honest statement that their size channel is ordinal. A key that invents values it cannot support is
worse than a key with none.

## 1.3 `key-caption-names-its-variable` — imported

```
kind      imported
name      Apparatus text is one size; weight separates the name from what is subordinate to it
applies   the beat draws an axis, a key, or a labelled block of figures
draws     axis, key, annot
priority  5
evidence  ourworldindata-org-grapher-life-expectancy-vs-gdp-per-capita
evidence  abc-net-au-news-2019-08-13-rich-school-poor-school-australias-great-ed
evidence  informationisbeautiful-net-visualizations-hollywood-2023-hits-flops
detect    within one apparatus block, the name run and its subordinate run(s) share a font-size to
          within 0.5px and differ by at least 200 in font-weight
```

**The rule.** An axis title and its unit, a key caption and its qualifier, a scale's name and its
ticks — all one size, with **weight** rather than size marking what is the name and what is
subordinate to it.

**Where it was seen — now three publications, all measured.**

- **Our World in Data**, on the axis: `Lato 12 / 700` sets `GDP per capita` and `Lato 12 / 400` sets
  `(international-$ in 2011 prices; plotted on a logarithmic axis)` — same size, same colour
  `rgb(91, 91, 91)`, weight alone separating them; and on the key, `Lato 10 / 400` `Circles sized by`
  against `Lato 11 / 700` `Population`.
- **ABC**, in the callout card — **rewritten in this pass, because the previous evidence was a
  different graphic's.** `ABCSans 13 / 700` sets the label and `ABCSans 13 / 400` sets its value,
  both `rgb(34, 34, 34)`, on every row of every card: `Income $98.1m`, `Cap. exp. $103.5m`,
  `Cap. exp. govt. $455,466`. Same size, 300 of weight apart, same ink, and both strings are visible
  on the plate.
  *What was withdrawn, and why.* The previous pass wrote *"`ABCSans 12 / 700` sets `INCOME` and
  `ABCSansRegular 12 / 400` sets `$50m`"*. `INCOME` is real and is on the plate; **`$50m` is not a
  string that appears anywhere on this graphic** — its axis reads `$105,000,000`, `$100,000,000` …
  `$0`. The style route measures the whole page, and this page carries a second graphic, a school
  lookup, whose siblings `Enter your school to see its income and expenditure.` and
  `Bigger circle=Bigger capital expenditure` sit in the same tuple list. See 5.9.
  *And the axis still does the thing, measured on the pixels rather than on a tuple.* `INCOME` and
  `$105,000,000` are set at the same size with the same tracking, the name heavier and painted
  `#AAAAAA`, the values lighter and painted `#CCCCCD` — both of which are in this record's own
  neutral list. ABC separates by ink **as well as** weight, which is more than the rule asks for and
  is not what its computed colours report: both runs say `rgb(0, 0, 0)`.
- **Information is Beautiful**, *Hollywood Hits & Flops*, **read off the `graphicFrame`**: the four
  channel pills above the plot set the channel name at
  `Source Serif Pro 13 / 600` and the variable it carries at `Source Serif Pro 13 / 400`, both in
  `rgb(15, 8, 8)` — `colour: worldwide gross ($m)`, and the same construction on `x-axis:`,
  `y-axis:` and `size:`. Exactly 200 of weight apart, exactly the same size. The piece's own note
  had already spotted it as *"the same bold-name / regular-variable construction Our World in Data
  uses on its axis titles, arrived at from the other direction"* — but before correction 14 the
  frame's type was invisible and the record carried `IBM Plex Sans` instead. *Re-read in this pass
  against the current `graphicFrame`: all ten of its tuples are unchanged, and the plate confirms the
  four pills by eye — `colour: worldwide gross ($m)`, `x-axis: imdb rating`, `y-axis: budget
  recovered`, `size: budget ($m)`.*

**Three desks, three continents, three different subordinates** (a unit qualifier at OWID, a labelled
figure at ABC, a channel's current variable at IIB), the same mechanism.

*One consequence of the rewrite, stated rather than hidden: ABC's instance is now an **annotation**
block, not an axis or a key, so the treatment's `applies` line should read "the beat draws an axis,
a key, or a labelled block of figures". The mechanism is unchanged; the block it was found in is
not the one the previous wording claimed.*

**What limits it.** It presumes the direction's apparatus register has two weights available. A
direction whose apparatus family ships one weight cannot express this and must fall back to size,
which is what the rule exists to avoid; the glyph/weight-coverage guard (spec §7.2) is the right
place to catch it.

**One thing it does NOT extend to.** Hollywood applies it on the key and **not** on the axis: its
axis names are `Fjalla One 21.6 / 700` where its ticks are `Source Serif Pro 16.8 / 700` — another
family, another size. The rule is a practice about one apparatus block at a time, not a house style.

## 1.4 `singled-out-mark-is-restroked-and-led-to-prose` — imported

```
kind      imported
name      The mark the beat is about changes its STROKE and carries a leader to a block of prose
applies   the beat names a subject among many marks AND the fill channel already carries a category
draws     annot
priority  8
evidence  abc-net-au-news-2019-08-13-rich-school-poor-school-australias-great-ed
evidence  informationisbeautiful-net-visualizations-star-wars-last-jedi-one-of-t
detect    exactly the marks the beat names carry a stroke that no other mark carries, and each is
          joined by a path to a text block whose first run names that mark
```

**The rule.** In a crowd, distinguish the subject by its **outline**, not by giving it a new fill,
and run a curved leader from it to a short block of prose that names it and says why it is there.

**Where it was seen.** ABC: in a field of 8 500 circles the called-out ones keep their sector colour
and **gain** a black ring — the corrected `graphic.png` shows this unambiguously at every scroll
depth — then a thin curve carries to a bordered card holding the school's name in the mark's own
colour (`ABCSans 14 / 700`, whose measured `colors` are the three sector hues), its own figures as
labelled key/value pairs (`ABCSans 13 / 700` key, regular value), a sentence at `ABCSans 13 / 400`,
and a photograph of what the money built. Information is Beautiful, *Movies Critics Loved*:
*The Last Jedi* **loses** its fill and is drawn as an open ring where every other mark is a disc,
with a dashed curve to four lines of prose.

**The two are not identical and the difference is recorded here rather than smoothed over.** One
adds a stroke, the other removes a fill. What both do is spend the *stroke* channel on the callout
so the *fill* channel is not spent twice — which is the transferable part, and is why the rule is
worded as "changes its stroke".

**What limits it.** A leader that crosses other marks is worse than no leader. Both references curve
their leader into empty space, which the arbiter must be able to find; where it cannot, the
treatment must decline rather than draw through the cloud.

## 1.5 `threshold-rule-named-in-words` — imported, promoted last pass, RE-CHECKED and confirmed

```
kind      imported
name      A declared threshold is drawn as a full-span rule and named in words on the rule itself
applies   the beat declares a threshold or reference level its reader is meant to read across
draws     annot
priority  7
evidence  abc-net-au-news-2019-08-13-rich-school-poor-school-australias-great-ed
evidence  informationisbeautiful-net-visualizations-hollywood-2023-hits-flops
detect    for each declared threshold the delivered artifact carries a full-span rule at that
          coordinate and a text run whose measured box intersects the rule, whose string is not
          that coordinate as the axis formats its own ticks
```

**The rule.** Where a beat declares a line the reader is meant to read across, draw the line all the
way and put its **meaning** on it, in words, in the apparatus voice. The number stays on the axis
for whoever wants it.

**Where it was seen.** ABC: a dashed full-width rule across the income column, labelled
`THE RICHEST 1%` — measured, `ABCSans 12 / 700 / tracking 2.5 / uppercase`, `rgb(0, 0, 0)` — with
the article's own sentence set beside it (*"The richest 1% of schools spent $3 billion. The poorest
50% spent $2.6 billion combined."*). Information is Beautiful, *Hollywood Hits & Flops*, through the
`graphicFrame`: a vertical dotted rule at imdb 7 carrying a hairline-outlined chip reading
`WORTH WATCHING>>>` at its top, and a horizontal rule near 0 % carrying `↓FLOP↓` at its left. The
frame reports one tuple for these, `Source Serif Pro 16.8 / 400`, three runs, `rgb(50, 0, 0)`,
sample `↓FLOP↓`; the second chip's identity with it is read from the pixels, not asserted from the
count. *Both re-checked in this pass against the current `graphic.png` and the current
`graphicFrame`, unchanged.*

**A third instance, at the same desk, found by looking in this pass.** *Snake Oil Supplements* draws
a dotted full-span horizontal rule across its bubble field carrying an outlined chip that reads
`WORTH IT LINE` — an editorial threshold at a declared interior coordinate, named on itself, exactly
like Hollywood's. It corroborates nothing under correction 4, being Information is Beautiful again.
What it does is show the shape holding across two very different plates at one desk, and it is
recorded for that reason alone. The plate is a raster served as one `<img>`, so there is no tuple
for it; the reading is from the pixels.

**Why this is filable where 2.1 is not.** 2.1 is a gloss past the last tick — an axis END named in
words — and every published instance of it is at one desk. This is narrower and different: a rule
at a **declared interior coordinate**, named on itself. Two desks, two continents, two grammars of
threshold: ABC's is a quantile its own data computes, IIB's is an editorial verdict. What transfers
is neither the quantile nor the verdict but the placement — **the words sit on the rule**, so the
reader never has to carry a number from the axis to the line.

**What limits it, and what is not proven.** Both references put at most two named rules on a plate.
Nothing here evidences what happens at four, and a plate of named rules would be a second grid
competing with the first. **This treatment has not been rendered**; like every proposal in this file
it owes `METHOD.md` step 6.

## 1.6 `label-chip-carries-the-class` — imported, promoted last pass, RE-CHECKED and strengthened

```
kind      imported
name      The mark's label sits in a filled chip whose fill is the mark's own class
applies   the beat names individual marks AND the colour channel carries a category
draws     value
priority  6
evidence  100-datavizproject-com-data-type-viz7
evidence  informationisbeautiful-net-visualizations-caffeine-and-calories
detect    every named mark's label sits on a filled rect whose fill equals that mark's own class
          fill, the label's ink is set for contrast against that fill rather than against the
          ground, and the artifact carries no detached swatch legend
```

**The rule.** Put the label in a filled pill coloured as the mark's class. The label then *is* the
key, and it reads against a fill you control rather than against whatever the plate happens to be
doing underneath it.

**Where it was seen, both from the pixels — and Ferdio's half is now MEASURED, which the previous
pass had refused itself.** Ferdio `#7`: `Sweden` in white on a **`#3274D8`** pill, `Norway` on
**`#283250`**, `Denmark` on **`#EE5440`**, each pill a constant distance directly above its dot and
joined to it by a two-pixel stem of the same colour, on a `#FFFFFF` plate at 97.38 %. Those three
hexes are the record's own — its two largest chromatic buckets plus the navy the chroma split files
as a neutral (5.3) — and until repair 1 removed the navigation bar from the clip, no colour in this
family could be taken from a `100.datavizproject.com` record at all. Information is Beautiful,
*Caffeine vs. Calories*: `L. Hot Chocolate & whipped cream`, `Dark chocolate bar`, `Iced Coffee` in
warm brown chips; `Big Mac`, `Fries`, `Glass of wine`, `Blueberry muffin`, `Butter Croissant` in
cool blue-grey chips. Two classes, no key. The IIB plate is a raster, so that half rests on no
tuple, and neither record's `style.type` was consulted for either.

**The two spend the channel at different grains, and that is recorded rather than smoothed over.**
At Ferdio the chip's fill is one *entity* out of three; at IIB it is one *class* of many members.
Both are the colour channel's own category, which is the transferable part.

**Why it is not `direct-end-label-in-the-series-colour`.** That treatment (filed, line family) sets
the label's **ink** in the series' colour at the series' end. This sets the label's **ground**, which
is the move that survives a busy or gradient plate — IIB's paper is a vertical gradient, and a
coloured ink on it would fail somewhere down the ramp. They are alternatives, and a direction should
not be asked to do both at once.

**What limits it.** A chip is an opaque box laid over the plot; on a dense cloud it hides marks the
reader may need. Both references have room. Where the plate does not, the treatment must decline.

---

# 2. Treatments proposed but NOT fileable, and exactly why

These are worth more written down than filed on a stretched lever.

## 2.1 `verbal-pole-on-the-axis` — real, and refused: one publication

**Rule.** Past the last tick, name in words what that end of the scale *means*.

Four published uses, **all at `informationisbeautiful.net`**:

- *Movies Critics Loved* — the x axis ends past `40%` with `AUDIENCE REALLY HATES`, read from the
  pixels.
- *The MicrobeScope* — a whole second, verbal scale down the right margin: `extremely deadly` /
  `death likely` at 100 %, `deadly` / `high chance of death` at 40 %, `quite deadly` /
  `unlucky or unhealthy` at 10 %, `less deadly` / `high-risk groups (infants, the aged)` at 0.1 %.
  **Measured since correction 14, and unchanged in this pass**: `Quicksand 10 / 500 / tracking −0.8`,
  `rgb(157, 157, 157)`, sample `high risk groups (infants, the aged)`, with the tier above it at
  `Quicksand 12 / 500 / tracking −0.8`.
- *Snake Oil Supplements* — the entire y axis is verbal: `EVIDENCE` in a filled black chip at the
  head of a dotted rule, then `STRONG`, `GOOD` … `NONE` in outlined white chips down it.
- *Hollywood Hits & Flops* — `WORTH WATCHING>>>` and `↓FLOP↓`, which have been split out into 1.5
  because they name **interior thresholds**, not the ends of a scale, and ABC does the same thing.

Four pieces from one desk is a house habit, which is precisely what the evidence floor exists to
exclude — the same refusal `METHOD.md` records against `place` (two ProPublica maps) and still
records against `legend` (one Guardian map). Nothing at ABC, Our World in Data or Ferdio glosses an
axis END in words.

**What a second wave must target:** a desk that is not Information is Beautiful glossing an axis in
words. Not more IIB.

## 2.2 `scale-transform-named-in-the-axis-title` — one publication

Our World in Data writes `plotted on a logarithmic axis` inside the axis title on **every**
transformed axis, and — the corrected graphics make this visible — **only** where the axis is
transformed: on `co2-emissions-vs-gdp` both titles carry it, and on
`life-expectancy-vs-gdp-per-capita` only the x does, the y being linear. That is a better reading
than the first pass had, and it is still one publication, plausibly one component: the two charts
render from the same Grapher code, so "two charts" may be one decision taken once. Refused twice
over.

## 2.3 `quadrant-named-in-words` — one publication as imported; proposable as derived, unproven

*Best in Show* crosses its axes at the origin and names **all four** corners — `Inexplicably
Overrated`, `Hot Dogs!`, `The Rightly Ignored`, `Overlooked Treasures` — set at the second-largest
size on the plate (the title is larger) and in a much lighter slate than any other run. One
publication.

It could instead be **derived**, on the `era-bands` pattern — a beat that declares a reference value
on each axis and a name for a quadrant carries everything needed:

```
kind      derived
applies   the beat declares a reference value on BOTH axes AND names at least one quadrant
draws     annot
detect    two full-span rules at the declared coordinates, and a text run inside each named
          quadrant, positioned at that quadrant's outer corner
provenBy  — NOT SUPPLIED
```

**It cannot be filed as proposed.** `design-base-records-are-complete.test.ts` requires a derived
treatment to carry both a `detect` and a `provenBy`, and this harvest rendered nothing. It is an
honest candidate for whoever runs `METHOD.md` step 6, not a filing.

## 2.4 `identity-line-on-a-same-unit-scatter` — derived, unproven

Where both axes carry the same variable at two dates, the y = x line is what makes "above the line"
mean "grew". Ferdio's `#7` draws the square, the equal 0–15 scales and the shared gridlines and
**does not draw the line** — re-read in this pass on a clip with no navigation bar on it, and the
omission is unambiguous: `2022` on x, `2004` on y, both 0–15, three chips, no diagonal. Derived (the
line is arithmetic on the beat's own extents), needs a `detect` and a `provenBy`, has neither.

## 2.5 `absolute-against-relative` — probably not a treatment at all

Ferdio's `#72` scatters *absolute change* against *percentual change* — two derivations of one
underlying pair, which rank the entities differently (Denmark +6 / +150 %, Norway +3 / +60 %,
Sweden +2 / +15 %; all three read off the corrected plate). It needs no published precedent: any
beat with a before and an after already holds both numbers.

But it is not an *addition* to a graphic the way every filed treatment is (`era-bands` shades,
`crossing-marked` marks, `value-on-the-mark` prints). It is a choice of **what chart to draw**, and
the spec has no axis for that — DVP's `STORY / PROPERTY / SHAPE` taxonomy is reused only as an index
vocabulary (§6.1). **Raised for the parent as a gap in the model, not filed as a treatment.**

## 2.6 Refused for being one publication, listed so a second wave knows what to look for

| idea | seen at | what a second desk would have to do |
| --- | --- | --- |
| hollow ring = before, filled disc = after, joined by a dotted arc, the **later** state labelled and the earlier one bare — with a two-specimen key (`○ 2004` `● 2022`) rather than none | Ferdio `#70` | any before/after scatter carrying time in outline-vs-fill |
| the value axis runs **through** the cloud, ticks in opaque white chips **on** the rule, and the axis name repeated at both ends | IIB *Caffeine and Calories* | any scatter with a centred value axis |
| a categorical key set as **coloured words with no swatches** | IIB *Best in Show*, *MicrobeScope* and *Movies Critics Loved* — same desk three times | any desk keying colour without swatches; OWID and ABC both use swatches |
| the mark carries a part-to-whole reading (a two-tone donut at the point, each arc's value printed in the entity's own colour, the entity's flag at the centre) | Ferdio `#93` | a second desk putting a composite mark at a scatter point |
| point label carries a smaller, greyer qualifier line beneath it (`Chickenpox / Shingles` over `Varicella`) — **now measured**, `-apple-system 12 / 400` over `-apple-system 10 / 400` in `rgb(170,170,170)` | IIB *MicrobeScope*, and inside the chip at *Caffeine and Calories* | a second desk scoping a point label with a sub-line |
| every encoding channel exposed as a named control (`x-axis:`, `size:`, `colour:`) — **now measured** through the `graphicFrame` | IIB *Hollywood* | a second desk naming its channels in the interface |
| the colour key is a ramp bar labelled **only at its ends** (`low`, `max`), refusing a precision it has not got | IIB *Hollywood* | a second desk labelling a continuous key at its ends alone |
| the size key is repeated at the **head and the foot** of a tall poster, identically, so a reader who arrives at either end has it — new in this pass | IIB *Snake Oil Supplements* | a second desk repeating its key on a long plate |

*Every row above was re-read against its `graphic.png` in this pass. The two rows that read Ferdio
plates — `#70`'s two-specimen key and `#93`'s composite mark — are the ones repair 1 most affected,
and both are confirmed: `#70` carries `○ 2004  ● 2022` bottom centre with only the filled 2022 state
labelled (`SE`, `DK`, `NO`, each in its own colour), and `#93` carries `Before 2004 ◐ After 2004`
bottom right with each donut's two arcs printed as percentages beside it.*

## 2.7 One refusal that is a stretch I chose not to make

**"State the encodings in the running prose."** ABC does it properly — *"Circles are sized by total
spend on new facilities and renovations in that period"* in the standfirst, and the beeswarm then
carries no size key at all. *Corrected in this pass: the ABC **page** does carry a size statement,
`Bigger circle=Bigger capital expenditure` at `ABCSans 18 / 700`. It is not on this graphic. It sits
with `Enter your school to see its income and expenditure.` and `Total income includes federal and
state/territory recurrent…` on the page's other graphic, the school lookup (5.9). The claim about
the beeswarm stands; the claim about the page did not.* The only second candidate is IIB's
*Caffeine and Calories* subtitle,
`Caffeine and calories`, which names the two variables but is really just a title. Counting it would
have bought a second publication with a reading nobody would defend. Not filed.

---

# 3. Apparatus registers this family needs

**The question asked was whether a scatter's two axes and its size legend are one register or
several. The measurements say: the two axes are ONE, and the keys are a SECOND.**

## 3.1 The two axes need no second register — evidenced, negative

`axis` (already filed, `derivesFrom: body`, families `chart, video`) covers both axes and no `axisX`
/ `axisY` split is warranted.

- **Our World in Data**: the x title's bold/regular construction (`Lato 12 / 700` +
  `Lato 12 / 400`) is reproduced on the y title. On `co2-emissions-vs-gdp` the corrected
  `graphic.png` shows both titles at once — `Per capita emissions` bold with
  `(tonnes per person; plotted on a logarithmic axis)` regular above the plot, `GDP per capita` bold
  with its own parenthetical below it — same size, same grey, same weight split, neither rotated.
  *Caveat kept, and it is now a smaller one: the style route names only the x title's sample in its
  tuples, so the y title's identity with it is read from the pixels. Those pixels are now the
  graphic itself rather than a page screenshot, which is what corrections 13 and 14 bought here. Both
  titles were re-read on the current `graphic.png` in this pass.*
- **Ferdio** `#7`, `#72`, `#93`: both axis titles are the same grey at the same size, the y merely
  rotated, and at a size above the tick values. `#70` likewise. *Re-read in this pass on clips with
  no navigation bar in them: `2004` / `2022`, `Number of sites` / `Share of Scandinavian sites`,
  `Percentual change` / `Absolute change`, `2022` / `2004` — four plates, eight titles, one voice.*

Recommendation: **add `scatter` to the existing `axis` register's `families` line**, and add these
records to its evidence. No new register, no new record — the existing one is simply extended.

## 3.2 `key` — a NEW register, and the evidence is there

```
- kind: apparatus
- name: The voice a graphic names its encoding channels in
- families: scatter
- derivesFrom: body
- evidence: ourworldindata-org-grapher-life-expectancy-vs-gdp-per-capita
- evidence: abc-net-au-news-2019-08-13-rich-school-poor-school-australias-great-ed
- evidence: informationisbeautiful-net-visualizations-hollywood-2023-hits-flops
```

**Why it is not `axis`.** All three publications set it differently from their own axis, measured:

| | axis | key |
| --- | --- | --- |
| Our World in Data | `Lato 12 / 700` + `Lato 12 / 400`, `rgb(91,91,91)` | `Lato 10 / 400` `Circles sized by`, `Lato 11 / 700` `Population`, values at `Lato 11` and `Lato 9.4` |
| ABC | `ABCSans 12 / 700 / tracking 2.5` `INCOME`, painted `#AAAAAA`; ticks painted `#CCCCCD` | `ABCSansRegular 14 / 400 / tracking 0` `Catholic` — see the caveat |
| IIB *Hollywood* (`graphicFrame`) | `Fjalla One 21.6 / 700` `BUDGET RECOVERED`; ticks `Source Serif Pro 16.8 / 700` | `Source Serif Pro 13 / 600` + `13 / 400` for the channel pills |

Different size at all three desks; at ABC also a different tracking and a different family variant;
at IIB a different **family** altogether.

**The ABC row is caveated in this pass, and it costs the register a publication rather than its
life.** `ABCSansRegular 14 / 400`, sample `Catholic`, is three runs on the ABC page — the three
school sectors — and the record's `marks` carry exactly three single-instance swatch fills in the
three sector colours (`rgb(252, 160, 161)`, `rgb(103, 225, 206)`, `rgb(74, 110, 255)`), which is a
three-swatch legend. But **it is not inside the 700 × 10 520 element the record photographs**: read
in eight slices, that clip has no legend on it. Since the style route measures the page and this
page carries two graphics (5.9), the sector key cannot be placed on the plate from the record alone.

Discount it, and `key` still rests on **two** publications whose evidence is both string-matched and
visible on their own plates: Our World in Data's `Circles sized by` / `Population` under its two
nested circles, and IIB *Hollywood*'s four channel pills. Two independent publications on two
continents, measured by the style route rather than by eye. That clears the floor `legend` failed in
the map family, and the second of the two is one the pre-repair record could not have supplied.

**Why `body` and not `annot`.** A key names the encoding; it is the graphic speaking about its own
instrument, which is what `axis` does, and `axis` derives from `body`.

**One thing that does NOT fit, stated rather than hidden.** `resolveRegister` derives an unrecorded
apparatus register at **0.88× body**. That is a good fit at Our World in Data (body `Lato 13` →
11.4, measured key 10–11) and a poor one at ABC (card prose `ABCSans 13` → 11.4, measured key 14 —
the key is *larger* than the prose). The ratio is a code constant this harvest did not touch and
should not be adjusted on one counter-example; it is recorded so the next family has two data points
instead of none.

**Whether this also unlocks the map family's `legend`.** Possibly — the Guardian's map legend, ABC's
sector key and OWID's size key may be the same voice under two names. That is the parent's call and
would want the Guardian record re-read against these three; **this proposal does not claim it.**

## 3.3 `quadrant` — proposed and refused

*Best in Show* sets `Inexplicably Overrated`, `Hot Dogs!`, `The Rightly Ignored` and
`Overlooked Treasures` at the second-largest size on the plate and in a far lighter slate than
anything else, which is plainly its own voice and not `display`, `annot` or `key`. One publication,
and the plate is a raster served as one `<img>` with no `graphicFrame`, so even that one has no
tuple — the colour of that plate is now measured, but its type is not, and it will not be until the
poster is read some other way. **Not proposed for filing.**

## 3.4 A defect in the CORE register table, found by this family

`value` is defined in the spec (§4) as *"a number attached to a mark"*. In this family almost no
mark carries a number; every mark carries a **name**, and the name is the thing the direction must
be able to set. The line family already stretched it the same way —
`direct-end-label-in-the-series-colour` declares `draws: value` and draws country names, and both
new treatments above (1.5 aside) do the same.

The **voice** is right — it is the mark speaking for itself — so this is not a request for a sixth
core register. It is a wording defect: `value` should read *"the text attached to a mark — its
number, or its name"*. Flagged for the parent; the core table is outside this harvest's boundary.

---

# 4. Directions

## 4.1 `echelle` — proposed, measured off ABC

```
id            echelle
name          Échelle éditoriale — serif narrative over a sans instrument
measuredFrom  abc-net-au-news-2019-08-13-rich-school-poor-school-australias-great-ed
ground        #FEFEFE
accent        #68E1CF
pad           NOT MEASURED
header        NOT MEASURED
headRule      NOT MEASURED
stroke        NOT MEASURED
```

**Ground and accent, restated from the record repair 3 produced.** `#FEFEFE` at **83.90 %**
coverage, pixel route, `measuredFrom: graphic.png` on an `svg` **700 × 10 520** at `documentTop`
1082, `nearTheTop: true`, which is the whole scroll canvas. The palette is **categorical**, three
hue clusters at 171° / 359° / 220°: `#68E1CF` (**1.203 %**), `#FCA0A1` (**1.000 %**),
`#5890FD` (**0.666 %**), with `#E9E9E9` (0.458 %) / `#D4D4D4` (0.196 %) gridlines and `#555555`
(0.157 %) ink.

*Two earlier readings are withdrawn, not one.* The first pass reported `#FFFFFF` at 89.9 % on
700 × 10 520; the previous revision reported `#FEFEFE` at 84.8 % on 748 × 10 394. Neither is quoted
anywhere in this file. What distinguishes the current record from both is not arithmetic but the
picture: repair 3 exempts a scrollytelling graphic from the rule that hides floating elements, and
gives it time to draw after being brought into view, and this clip is **drawn** — read in eight
slices it carries the whole beeswarm, every callout, the named threshold rule and the prose cards.

**A second furniture step this pass adds, measured on the pixels.** The axis's *name* and the axis's
*values* are painted in two different greys: `INCOME` at **`#AAAAAA`** (0.262 %) and
`$105,000,000` at **`#CCCCCD`** (0.146 %), both of which are in this record's own neutral list. A
direction taking `echelle` should carry both, because the two-step ramp is what makes the ABC's
apparatus recede without disappearing. It is invisible in the style route, which reports
`rgb(0, 0, 0)` for both (5.9).

**`accent` is the largest chromatic bucket and NOT a semantic accent, and this matters** — see 4.3.

**Registers** — every row below is a style-route tuple from this record. The table now says which
rows this pass could **match to a string visible inside the photographed graphic** and which are the
ABC page's, because the style route reads the page and this page carries two graphics (5.9). A
direction may legitimately take its display voice from the article it sits in; it should not do so
without knowing that is what it is doing.

| register | tuple | painted on | on the plate? | ink |
| --- | --- | --- | --- | --- |
| display | `abcserif 32 / 700 / trk 0 / none`, `rgb(0,0,0)`, sample `Capital funding: A two-tier system` | the piece's section head | **no** — the article's | ink |
| eyebrow | **NOT MEASURED ON THE PLATE** | — | — | — |
| body | `ABCSerif 17 / 400 / trk 0 / none`, `rgb(51,51,51)` | the narrative card over the graphic | **yes** — *"Australia's four richest schools spent more on new facilities…"* | ink |
| axis (name) | `ABCSans 12 / 700 / trk 2.5 / none`, `rgb(0,0,0)`, painted `#AAAAAA` | the axis name `INCOME` | **yes** | muted |
| axis (values) | **no tuple identified** — painted `#CCCCCD` | `$105,000,000` … `$0` | **yes**, by pixels only | muted |
| key | `ABCSansRegular 14 / 400 / trk 0 / none`, `rgb(0,0,0)`, sample `Catholic` | the sector legend | **no** — not inside the clip, see 3.2 | muted |
| annot | `ABCSans 13 / 400 / trk 0 / none`, `rgb(85,85,85)` | the callout card's prose | **yes** — *"Extensive redevelopment includes a $21m music school…"* | muted |
| value | `ABCSans 14 / 700 / trk 0 / none`, colours `rgb(6,175,147)` / `rgb(207,113,114)` / `rgb(88,144,253)` | the callout card's subject name, in the mark's own colour | **yes** — `Wesley College,` + `VIC` at `14 / 900` | accent |

A further tuple in the axis name's exact voice, `ABCSans 12 / 700 / tracking 2.5 / uppercase`,
sample `The richest 1%`, is the named threshold rule of treatment 1.5 — **on the plate**, seen. And
the callout card's labelled figures, `ABCSans 13 / 700` `Income` against `ABCSans 13 / 400` value,
both `rgb(34,34,34)`, are treatment 1.3's ABC instance as this pass rewrites it.

*The previous version of this table listed `ABCSansRegular 12 / 400 / trk 2.3`, sample `$50m`, as
the axis tick values. It is withdrawn: that string is on the page's other graphic (5.9).*

**What is genuinely characteristic of this direction, and measured:** three families in play
(`abcsans`, `ABCSans`/`ABCSansRegular`, `abcserif`/`ABCSerif`), **serif for narrative and sans for
instrument**, tracking of 2.0–2.5 on every scale label and none anywhere else, and one italic run on
the page (`abcsans 12 / 400 / italic`, sample `(Supplied)`).

**Why it is proposed anyway with four unmeasured fields.** `pad`, `header`, `headRule` and `stroke`
need pixel geometry this harvest did not take, and `eyebrow` does not exist on the plate. The parent
should either measure them before filing or file with those four derived and reported as derived —
`resolveRegister` already reports `derivedFrom` so that nothing inferred looks measured. **Filing it
with invented values would be the defect `METHOD.md` correction 6 exists to prevent.**

## 4.2 Four measured colour readings that CANNOT become directions

Three come from Information is Beautiful and the fourth, new in this pass, from Ferdio. Two of the
three IIB plates are posters served as one `<img>`, so the style route reaches the **publisher's
article furniture** and none of the plate's; the third has a `graphicFrame` and therefore has type,
but only ten tuples of it; and the Ferdio plates are rasters too. A direction needs seven register
rows. These are offered as ground/palette readings to graft onto a direction whose type is measured
elsewhere, and are **not proposed as directions**.

**Every number below is the record's own** — `pixel` on `graphic.png` — not a hand crop, and all
three are unchanged by this pass's three repairs: repair 2 confirmed the picker had the named piece
in every case (see §0), and none of the three carries a floating element for repair 1 to remove.

**`informationisbeautiful-net-visualizations-star-wars-last-jedi-one-of-t`** (*Movies Critics
Loved*) — the corpus's **first measured dark ground**, which spec §7.3 records as missing (the
code-side `nocturne` direction has never been measured):

- ground `#333333` at **90.1 %**, with `#3B3B3B` (1.28 %) and `#434343` (0.46 %) as its own gridline
  steps and `#ABABAB` (0.29 %) as furniture.
- palette **categorical, 3 hue clusters** at 50°, 105°, 187°: `#FFD300` 0.76 %, `#F7931E` 0.40 %,
  `#8CF968` 0.40 %, `#0CDBF8` 0.18 %, `#D48CE5` 0.14 % — five genre colours plus a grey sixth, keyed
  as coloured words along the foot of the plate.
- the shape of the thing: **90.1 % ground, under 2 % chromatic ink.** A dark plate works here
  because almost nothing is on it.

**`informationisbeautiful-net-visualizations-best-in-show-whats-the-top-d`** — a warm paper with a
non-black ink:

- ground `#F7F1E1` at **81.8 %**; ink `#364E4D` at **1.39 %** — a dark slate-**green**, not black,
  and reported as a *neutral* rather than as palette.
- palette **categorical, 3 hue clusters** at 2°, 253°, 93°, the largest members being `#A13330`
  0.95 %, `#50447A` 0.87 %, `#D7856A` 0.85 %, `#739458` 0.59 %.

**`informationisbeautiful-net-visualizations-hollywood-2023-hits-flops`** — a third non-white
ground, and the only one of the three whose type exists at all:

- ground `#FFF0F0` at **85.7 %**, a pale pink, with `#F2E4E4` at 7.13 % as the shaded flop band
  beneath the 0 % rule.
- the colour channel is a **continuous ramp**, `low` → `max`, and the record's `shape: diverging`
  with clusters at 0° (1.47 %) and 210° (0.26 %) is the classifier splitting one ramp and counting
  the near-black title ink as a hue. See 5.4.

**A fourth reading, unlocked by repair 1 and still not a direction.** The four Ferdio plates are now
honestly measurable and they are a coherent whole: `#FFFFFF` at 95.57–98.08 %, a fixed triad of
`#EE5440` red, `#3274D8` blue and `#283250` navy, `#E6EAEC`-family gridlines, all four plates
`diverging, 2 clusters` at 7° and 216° because the navy falls below the chromatic floor (5.3). That
is a ground and a palette. It is **not** a direction, and the reason has not changed: Ferdio's
charts are rasters served as `<img>`, so `record.style.type` reaches only the site's own furniture
(`stevie-sans`, `Borgia Pro`) and the plate's type is unreadable. A direction needs seven register
rows. This one has none.

**One reading that is NOT offered even now.** `informationisbeautiful-net-visualizations-caffeine-and-calories`
measures its own graphic and still yields no usable ground: the plate's paper is a **vertical
gradient**, so `ground` reports `#FDFDFC` at 8.1 % and the eight largest neutrals are eight tints of
the same tan ramp. The record is not wrong; the field has no meaning on a gradient. Confirmed again
in this pass by looking at the plate — the paper runs from a deep tan at the head to near-white at
the foot. Recorded in 5.7.

## 4.3 The finding that bears on spec §9's open question to Tom

`doctrine/references/visual-system.md` holds that exactly one semantic accent exists.
**All thirteen references in this family encode a categorical set or a continuous ramp in colour,
and not one of them has a single semantic accent:**

| reference | colour channel carries | palette shape, from the current record |
| --- | --- | --- |
| OWID ×2 | continent | categorical; 6 keyed members, 3 hue clusters (177° / 305° / 9°) |
| ABC rich-school | school sector | categorical, 3 clusters (171° / 359° / 220°) |
| IIB *Best in Show* | kennel group | categorical, 3 clusters; 7 groups keyed as coloured words |
| IIB *Hollywood* | worldwide gross | a continuous `low`→`max` ramp, reported `diverging` |
| IIB *Snake Oil* | **a ramp redundant with the y axis, plus one exception class in orange** | reported `categorical`, 3 clusters (55° / 208° / 148°) |
| IIB *MicrobeScope* | `microbe type` — keyed as coloured words (`virus`, …, `Helvetica Neue 13 / 400` in the marks' own colours) | **colour not usable — dimmed plate, see 5.2** |
| IIB *Movies Critics Loved* | genre | categorical, 3 clusters; 5 hues plus a grey |
| Ferdio ×4 | entity | a fixed triad — `#EE5440` / `#3274D8` / `#283250` — one member of which reads as neutral (5.3); all four now `diverging`, 2 clusters (7° / 216°) |
| IIB *Caffeine and Calories* | class, carried **in the label chip's fill** — the marks themselves are monochrome silhouettes | `monochrome`, 1 cluster (27°) |

A scatter's marks are, almost by definition, peers: the colour channel is where the *class* lives,
and "one accent" has nowhere to go. The one record that looked like an exception in the first pass —
*Caffeine and Calories*, filed as carrying nothing in colour — turns out to carry its class too,
just in the chip rather than the mark, which is treatment 1.6.

This is not an argument against the doctrine — it is a measurement that the doctrine's colour rule
was written for a chart with a subject and a background, and that this family has neither.
**It should go to Tom with §9's question, not be resolved here.**

---

# 5. What the method itself got wrong, measured in this harvest

## 5.1 The Ferdio strip is gone, and the same species has surfaced on ABC

The previous version of this section reported that all four `100.datavizproject.com` clips still
caught three rows of the site's fixed navigation bar, that the strip was 96 % of `viz72`'s entire
reported blue, 84 % of `viz70`'s and 43 % of `viz7`'s, and that **no colour claim anywhere in this
proposal could therefore rest on a Ferdio record**. Repair 1 closed it: `withFloatingChromeHidden`
hides every `position: fixed | sticky` element for the length of the photograph and restores it
afterwards.

**Measured on the four current clips**, counting non-white pixels in the top sixty rows: `viz7` 0,
`viz70` 0, `viz72` 0, `viz93` 20 — and those twenty are the top of its blue donut and the `13%`
beside it, not a strip. The refusal is lifted, the numbers it rested on are dead, and what the four
plates now report is in §0. `two-records-that-agree-exactly-are-both-wrong` was right about the
cause: `viz70` and `viz72` no longer agree at 0.394 % and 0.374 %, they read 0.0290 % and 0.00988 %.

**What has surfaced in its place is on ABC, and it is bigger.** A band of the ABC's own section
navigation — `Politics  World  Business  Analysis  Sport`, on its own opaque white plate — is inside
`abc-net-au-…-rich-school-poor-school-australias-great-ed/graphic.png`. Measured: its ink occupies
rows **4735–4755** of the 10 520-row clip, x 5–447, and its plate interrupts the graphic's own
dashed centre rule for rows **4718–4765** — roughly 48 × 700 px, **0.46 %** of the frame. It whites
out a slice of the beeswarm and clips the foot of the *Scotch College, VIC* callout card.

It does **not** perturb the colour reading meaningfully — the plate is white on a `#FEFEFE` ground
and its ink is about 1 500 dark pixels, 0.02 % — so nothing in §4.1 rests on it. It matters because
of what it says about the repair: **hiding floating elements once, before the photograph, is not
enough for a 10 520 px element on a 900 px viewport.** Taking that picture forces Chrome to walk the
element, which re-runs the page's own scroll handlers; a site that writes to the same inline
`style.visibility` the harvester wrote to wins the last write. The mechanism is inferred and is not
proven here — proving it would mean re-running the harvester, which this pass may not do. The
**residue** is measured, and it is in a record.

**The fix is cheap and is not made here**, being outside this pass's boundary: re-apply the hide
immediately before each capture pass rather than once at the top, or use `visibility: hidden
!important` set through a stylesheet the page cannot overwrite by assigning to `el.style`.

## 5.2 A first-run overlay is not a consent dialog, and the harvester will not clear it

**Re-checked on the current record and it still holds, which is now three harvests running.**
*The MicrobeScope* opens on its own welcome modal — *"Welcome to the MicrobeScope. Hover over
diseases to find out more about them, or click on the stories below to watch them unfold."* with a
`Get started!` button — which **dims the whole plate**. It survived the re-harvest, so it is the
piece's first-run state rather than an intermittent banner. Repair 1 did not remove it either, which
narrows what it can be: the overlay is not `position: fixed` or `sticky`, or it would have gone with
the section navigation. It is neither a consent wall (the handler's word list does not and should not match
`Get started!`) nor an entry screen (the page is far taller than one viewport, so `openEntry`'s
ratio guard correctly declines). It is a third category, and correction 12's warning applies:
widening either selector far enough to catch it would start clicking arbitrary things.

**Correction 14 made this record's contamination sharper, not smaller, and that is a gain.** The pixel
route measures the graphic — and the graphic is behind the overlay. `ground` `#FCFCFC` at
**91.96 %** is the **dimmed** paper, and the largest chromatic bucket, `#37BC9B` at **0.4415 %**, is
the **modal's own button**, which is visible in `graphic.png` as a teal pill in the middle of the
plate. The mark hues below it (`#F4C1DE` 0.053 %, `#FEDEC5` 0.022 %) are washed versions of the real
ones. Before the repair this record's colour was wrong because it was the website's; now it is wrong
because it is the overlay's. **No colour claim is made from it, and its
`shape: categorical, 3 clusters (165° / 326° / 26°)` is not quoted anywhere above.**

Its **type is very nearly unaffected** — computed styles do not care about an overlay — which is why
2.1 and 2.6 can cite measured tuples from it: `-apple-system 12 / 400` for the point names in their
marks' colours, `-apple-system 10 / 400` `rgb(170,170,170)` for the qualifier line, `-apple-system
11 / 400` uppercase for `microbe type`, and `Quicksand 10 / 500 / trk −0.8` for
`high risk groups (infants, the aged)` with the tier above it at `Quicksand 12 / 500 / trk −0.8`.
*One honesty this pass adds: the modal contributes its own tuples too —* `-apple-system 21 / 700 /
trk −0.53` `The MicrobeScope` *and* `-apple-system 16 / 400` `Welcome to the MicrobeScope. Hover
over diseases to find out…` *— so "unaffected" was too strong. The plate's own runs are intact; the
list they sit in has two rows in it that are the overlay's.*

The class is worth naming in `METHOD.md`, because "both routes green, plate dimmed" is exactly the
failure mode corrections 1 and 3 exist to make visible, and it is now the only colour refusal left
in this family.

## 5.3 The chroma split classes a near-black categorical member as furniture

Ferdio's triad is red `#EE5440`, blue `#3274D8` and navy `#283250`. The navy's chroma falls below
the route's chromatic floor, so it is reported as a **neutral** — `#283250` at **0.3853 %** on
`viz7` and **0.4138 %** on `viz93`, sitting in the neutral list directly beneath the ground and
above the gridlines — and the palette comes back as `diverging, 2 clusters` at 7° and 216° where a
reader sees **three entities in three colours**.

The first pass could only infer this from a hand crop; the second could show it but not quote it,
having refused every Ferdio colour. This pass can do both, and **on all four plates rather than
two**: `viz72`'s navy buckets separately at `#0B1629` (0.0815 %) because its single navy dot is
small enough to be dominated by its own antialiasing, and `viz70`'s does not reach the neutral
top ten at all. One design decision, four different arithmetic fates, none of them the word "navy".

This is the far end of spec §6.2 defect 3, which the spec itself predicted: *"the same failure waits
at the other pole for a warm near-black ink."* It has now been observed — but on a **mark**, not on
ink. The rule "low chroma means furniture" is right about paper and wrong about a deliberately dark
categorical member. No fix is proposed; it is recorded with the four records that show it.

## 5.4 The shape classifier disagrees with the eye three times, in three different ways

- *Hollywood Hits & Flops*: reported `diverging`, clusters at 0° (1.47 %) and 210° (0.26 %); it is a
  **single sequential ramp** labelled `low`→`max` running dark blue → magenta → orange, plus a warm
  near-black title ink (`#320000`, 0.556 %) counted as a hue. *Unchanged across all three passes,
  and now confirmed by looking at the frame's own ramp bar, which is labelled at its ends alone.*
- *Snake Oil Supplements*: reported `categorical`, clusters at 55° / 208° / 148°. **The first pass
  read this as "two categories" and was wrong.** Looked at, the plate is a **continuous vertical
  ramp** — deep blue at `STRONG`, through teal and green, to pale yellow at `NONE` — redundant with
  the verbal y axis, **plus one exception class in orange** (`One to Watch`, `#F47B20` at 2.71 %,
  keyed at both the head and the foot of the poster). The classifier is sampling three bands of one
  ramp and calling them three categories. The old bullet stays withdrawn.
- Ferdio `#72`: **the previous version of this bullet is dead and is replaced.** It reported
  `sequential, 1 cluster` at 216° and blamed three stacked defects, of which two were the navigation
  bar. With the strip gone the record reports `diverging, 2 clusters` at 7° and 216° — and the plate
  still carries **three dots in three colours**. One defect survives where three were claimed, and
  it is 5.3 alone: the navy is below the chroma floor. *A cleaner instrument does not make the
  classifier agree with the eye; it makes the disagreement legible.*

`METHOD.md`'s correction 3 rule applies and the eye wins in all three records.

## 5.4b Bot checks have spread past SCMP

Not encountered in this harvest — every one of the thirty urls either loaded or crashed the browser
— but reported by a sibling family and worth carrying in the runbook beside correction 11:
Cloudflare now challenges `axios.com` and `economist.com`, and `startribune.com` answers a Vercel
checkpoint. `startribune.com` is 49 urls of the alive list and was inside this family's plausible
draw. `--via-firecrawl` is the route for a wall, it costs credits, and it should be chosen rather
than fallen into.

## 5.5 The `archive` field can name a pool the url is not in

`ourworldindata.org` appears **nowhere** in `~/Downloads/infoviz-source-urls-alive.txt`
(`grep -ic` returns 0, re-checked in this pass), yet the line family's own OWID record and both of
this family's are recorded as `archive: url-list`. `ARCHIVES` in `harvest.mjs` offers no value for a
url drawn deliberately by form, and correction 2 makes deliberate drawing the *only* way to build a
chart family. Both records say so in their own front matter; a fifth archive value (`targeted`)
would make it mechanical.

## 5.6 `provenBy` blocks every derived treatment a harvest-only pass can find

Two of the strongest ideas here (2.3, 2.4) are `derived` and neither can be filed, because the guard
requires a `provenBy` render and a harvesting agent renders nothing. That is the guard working, not
a fault — but it means **a harvest wave can only ever propose derived treatments**, and someone must
run `METHOD.md` step 6 for them to exist. Worth saying out loud in the runbook. The same is true one
step earlier of every `imported` treatment in section 1, including the two new ones: none has been
rendered.

## 5.7 `ground` has no meaning on a gradient plate, and the record cannot say so

`informationisbeautiful-net-visualizations-caffeine-and-calories` measures its own graphic, cleanly,
and reports `ground` `#FDFDFC` at **8.1 %** — followed by `#D5CDBB` 6.84 %, `#DAD3C3` 6.77 %,
`#EAE5DC` 5.50 %, `#EDEAE2` 5.44 %, `#E4DED3` 5.37 %, `#CDC2AD` 5.10 %, `#C2B69C` 4.34 %. Those are
not furniture. They are eight tints of one **vertical gradient** that runs the height of the poster,
and the "ground" is the top 8 % of it.

Nothing is red, nothing is contaminated, and the number is arithmetically correct. But a direction
that took `#FDFDFC` as this plate's ground would be taking a value that covers a twelfth of it. The
record needs a way to say *the ground is a ramp, here are its ends*, and it has none. Recorded as a
gap in the pixel route's model rather than a defect in this reference.

*This also bears on `visual-system.md`'s ban on a gradient ground — "any gradient or texture on the
ground competes with the marks for the reader's contrast budget". IIB spends the gradient
deliberately and pays for it with treatment 1.6: every label sits in an opaque chip precisely
because the paper underneath it changes. That is a coherent whole and it is not a counter-example to
the doctrine so much as an illustration of what the doctrine's rule buys you the right to skip.*

## 5.8 The reference `NOTES.md` files still carry pre-repair figures, and this proposal did not touch them

Flagged, not fixed, because this pass writes only this file. **Ten of the thirteen** notes quote at
least one number the re-harvest has superseded. Two worked examples, both re-checked in this pass:

- `100-datavizproject-com-data-type-viz7/NOTES.md` still describes `#3274DA at 8.7 % of the page
  shot` and a hand `crop 308,170,824,730` workaround, from which it read `#EE5440` at 0.47 % and
  `#3274D8` at 0.43 %. The record now says 0.417 % and 0.377 % on the whole 824 × 823 clip. *The
  hand crop was right to within a twentieth of a point, which is worth keeping as a fact about the
  method rather than as a measurement.*
- `abc-net-au-…/NOTES.md` still reports ground `#FFFFFF` at 89.9 % on a `700 × 10 520` canvas. The
  record now says `#FEFEFE` at **83.90 %** on a `700 × 10 520` canvas — the same element, a
  different picture of it, because repair 3 let it draw. A note that agrees with the record's
  *dimensions* and disagrees with its *numbers* is the hardest kind to spot.

The **structural** readings in those notes are all confirmed by looking; only the "What it does with
style" figures are stale. Whoever integrates this should re-run the notes against the current
`measured.json` files.

## 5.9 The style route reads the PAGE, and a page can carry two graphics

Repair 2 gives the *pixel* route a rule for choosing between two graphics on one page. The *style*
route has no such rule and by design does not want one: since correction 14 it no longer looks for a
graphic at all, and `record.style.type` is the whole page's type. Where the graphic is an
`<iframe>`, `graphicFrame.type` separates the two cleanly, which is why *Hollywood* can be read.
Where both graphics are in the **same document**, nothing separates them, and the tuple list is a
union with no marker on it.

**Measured on ABC.** The record's 37 tuples include `Enter your school to see its income and
expenditure.` (`ABCSans 20 / 400`), `Total income includes federal and state/territory recurrent…`
(`ABCSans 19.8 / 400`), `Bigger circle=Bigger capital expenditure` (`ABCSans 18 / 700`) and
`ABCSansRegular 12 / 400 / trk 2.3`, sample `$50m`. None of those four strings is anywhere in the
700 × 10 520 clip, read in eight slices. They are the page's second graphic, a school lookup. The
previous pass used one of them as treatment 1.3's ABC evidence and as `echelle`'s axis row; both are
rewritten above.

**Why nothing went red.** Every one of those tuples is a true measurement of a real run of type on
the page this record names. The record is not wrong. It simply cannot say *which graphic*, and a
reader assembling a direction out of seven register rows will assume one.

**What would close it, and it is not free.** The style route would have to be asked for the type
*inside the picked element* as well as the type on the page — the same shape as `graphicFrame`, one
level down, for a same-document graphic. Until then the honest discipline is the one this file now
follows: **match every tuple you are going to build on to a string you can see on the plate**, and
mark the ones you cannot.

---

# 6. What was deleted, and why

Sixteen of the twenty-nine harvested records were removed rather than filed. Nothing in this list
changed at any of the five repairs: these are records of pages that never showed their subject, and
none of the repairs would make them readable. One thing repair 2 is worth saying about them: four of
the seven "never reached a graphic" records stopped at a **hero illustration**, which is both the
largest graphic on its page and the one the page leads with. Repair 2 changes nothing there — size
already chose it, and position agrees. **Repair 2 solves the two-graphics problem; the hero is still
open**, and it is `METHOD.md` correction 1, unclosed since the line family.

**Never reached a graphic (7).** Pudding *upward mobility* (hero illustration), Pudding
*songwriters* (title card), The Markup *dollars to megabits* (hero illustration), Texas Tribune
*outcomes* (hero illustration under a newsletter modal), Kontinentalist *HDB housing* (hero
illustration), Guardian *World Cup 2018* (a photograph), ABC *Sam Kerr* (an unresolved lazy-load
placeholder — a flat green field).

**Reached something real that is not of this family (7).** IIB *Plenty More Fish in the Sea* (a
map), IIB *Which Fish are Okay to Eat* (a table), ABC *FIFA 2023 best player data* (a radial
flower), Ferdio `#12` (nested proportional circles, no axes), `#45` (split circles, no axes), `#78`
(circle packing, no axes), `#10` (a dumbbell chart on a rotated 45° number line).

**Reached something real and redundant (2).** IIB *Snake Oil Superfoods* — the same desk and the
same chart engine as *Snake Oil Supplements* with a different palette; correction 4 says two records
from one desk are not two uses, so the second was discarded rather than filed as corroboration. IIB
*Major LLMs ranked by performance* — a bubble chart with a **time** x axis, teaching nothing that
*Movies Critics Loved* does not, and the family already carries one time-axis record at its edge.

**Failed to harvest (1).** ProPublica *America's highest incomes and taxes revealed* — three
attempts, three browser crashes. Its directory was deleted rather than left with a `screenshot.png`
and no `measured.json`.

A record of a page that never showed its subject is worse than no record: it gets indexed as though
it had.
