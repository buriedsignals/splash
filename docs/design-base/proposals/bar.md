# Proposal — the bar / column family

Written 2026-09-07 by the bar harvest, for the parent to integrate. **Re-verified 2026-09-08 against
the records as re-harvested after corrections 13 and 14, and re-verified a second time after the
three repairs that landed on top of them** — the hidden masthead, the page-lead tiebreak, and the
sticky-graphic exemption. Nothing here has been filed: this file proposes, it does not write into
`treatments/`, `directions/` or `registers/`.

## What the three repairs changed

The bar family kept all seven of its references, lost none of its four treatment proposals, and
**gains one**. Of the three repairs, only the first touches this family — and it touches every
colour number in it.

**Repair 1 — the masthead is gone from the plate, and it is gone from the pixels, not just from the
record.** Rows 0–8 of all five Ferdio `graphic.png` files are now `#FFFFFF` where the previous
harvest wrote solid `rgb(50, 116, 218)`. Every Ferdio blue share fell, and each fell by the same
amount:

| record | blue before | blue now | fall |
| --- | ---: | ---: | ---: |
| `100-datavizproject-com-data-type-viz19` | `#3274D9` **0.63 %** | `#3274D8` **0.2666 %** | 0.36 pp |
| `100-datavizproject-com-data-type-viz6` | `#3274D8` 2.58 % | `#3274D8` **2.2137 %** | 0.37 pp |
| `100-datavizproject-com-data-type-viz23` | `#3274D8` 3.07 % | `#3274D8` **2.7088 %** | 0.36 pp |
| `100-datavizproject-com-data-type-viz24` | `#3274D8` 3.98 % | `#3274D8` **3.6190 %** | 0.36 pp |
| `100-datavizproject-com-data-type-viz47` | `#3274D8` 5.17 % | `#3274D8` **4.8075 %** | 0.36 pp |

The strip this file's own method note **B** measured was **2 472 px, 0.365 % of every frame,
identical in all five**. The five falls are 0.36–0.37 pp. **The prediction was the mutation test**,
and the repair passed it. So did the second half of the prediction: note B argued that `viz19`
reported `#3274D9` rather than `#3274D8` *because its bucket was a blend of nav and chart* — three
14 px diamonds against 2 472 px of nav. With the nav hidden, `viz19` reports `#3274D8`, the same hex
as the other four, at 0.2666 %. **The hex converged the moment the contaminant left.**

**And that is what re-founds the colour claims this file refused.** The refusal was never about the
blue's share alone; it was that a sixth blue of unknown provenance sat in the same region of the
palette as Ferdio's own blues, so no statement about a *ramp* of blues could be made safely. It can
now, and it turns out to be the most precise thing this family has measured — see
`chip-one-step-darker-than-the-mark-it-sits-on` below, which is new.

**Repairs 2 and 3 change nothing here, and the records say why.** All seven now carry
`style.graphic.documentTop` and `style.graphic.nearTheTop`, and every one of the seven is
`nearTheTop: true` — Ferdio ×5 at `documentTop: 172`, Information is Beautiful at `176`, Our World
in Data at `212`. **No record in this family points at a different object than it did**: the tags
and dimensions are identical to the previous pass (`img` 823 × 823 ×5, `img` 1280 × 11243, `svg`
729 × 454). No page in this family carried a second graphic for the size/lead tiebreak to arbitrate,
and no reference here is scroll-driven, so the sticky exemption never fires. Still none carries a
`graphicFrame`; all seven carry `routes.pixel.measuredFrom: "graphic.png"`.

**Unchanged, and checked rather than assumed.** `ourworldindata-org-grapher-co2-emissions-by-fuel-line`
reports ground `#FFFFFF` at **78.73 %** and one chromatic pole `#7088B0` at **19.23 %**, `ramped: 0`,
`shape: monochrome` — the same to four decimals as before. The Information is Beautiful poster reports
`#1C1C1C` **56.16 %**, `#E80E8A` **33.68 %**, `#F794E0` **7.01 %** — also unchanged; four rows of an
11 243 px plate is 0.036 %, under the precision either number is reported at. The `atlas` direction
rests on the first of those and is untouched by all three repairs.

**Died this pass: treatment 2's `detect`, again, and this time from inside its founding publication.**
The hue clause is *confirmed* by measurement — all three Information is Beautiful header words sit
within **0.5°** of the segment they name — but Ferdio's `#24` names its three classes in a header
cell over them in near-black `#0B1629`, matching nothing, and would go red. See caveat three.

**Died this pass: "the header words are lifted in lightness."** This file asserted that, and the
pixels refuse it for two of the three. Measured on `graphic.png`: the teal header `#11A1B5` is
*darker* than its segment `#7DBCC4` (L 0.39 vs 0.63) and more than twice as saturated (S 0.83 vs
0.38); the plum header `#75164C` is very slightly darker than its segment `#821553` and essentially
the same colour. Only the grey is lifted (`#717171` L 0.44 over `#4E4E4E` L 0.31). **What is held
constant is hue, to within half a degree, and nothing else is held constant at all.** The rule
survives; this file's explanation of it did not.

**Died again, for the same reason as before: the Ferdio half of the `category` register**, and the
whole of `one-colour-per-entity-across-every-view`, `unit-word-follows-the-magnitude`,
`stack-is-level-plus-growth` and `the-column-is-made-of-countable-units`. The repairs bought better
numbers, not a second desk. Every one of those still rests on one publication.

## The harvest, in numbers

| archive | drawn | harvested | survived looking | filed |
| --- | ---: | ---: | ---: | ---: |
| datavizproject | 8 | 8 | 5 | 5 |
| informationisbeautiful | 8 | 8 | 1 | 1 |
| url-list | 26 | 25 | 1 | 1 |
| **total** | **42** | **41** | **7** | **7** |

Two waves on the url list. Wave 1 (14) was drawn from open desks on bar-suggestive subjects; one
candidate — ProPublica's *americas-highest-incomes-and-taxes-revealed* — crashed the browser
(`ConnectionClosedError`) and left a record with no `measured.json`, since removed. Wave 2 (12) was
drawn deliberately from **twelve different publications**, to buy the independence the evidence
floor needs. **It returned zero bar charts.**

Seven references survive, from **three publications**: Our World in Data, Information is Beautiful,
and Ferdio (`100.datavizproject.com`). Every bar chart in this family came from a desk whose product
*is* charts. That is the single most important thing this harvest learned, and no repair has changed
it.

The 34 harvested records that did not survive, counted by cause:

| cause | n | examples |
| --- | ---: | --- |
| reached a real graphic that is not a bar chart | 15 | a dumbbell chart, a bubble scatter, a heatmap, two choropleths, two globes, three isotype pieces, a dot cloud, a small-multiple map set, a line chart, a slopegraph |
| reached the piece's hero, title card or illustration instead of its graphic | 6 | Reuters *Olympics*, Kontinentalist, `ig.ft.com`, two Pudding pieces, The Marshall Project |
| bot check | 3 | Cloudflare on `axios.com` and `economist.com`, a Vercel checkpoint on `startribune.com` |
| wall the handler did not cross | 2 | Boston Globe subscription overlay, `dr.dk`'s Danish consent dialog |
| empty or unloaded frame | 2 | IIB *Diversity in Tech*, `projects.thestar.com` |
| reached something real but nothing legible could be read from it | 3 | Pudding *country radio*, ABC *tax cuts to scale*, Reuters *Global Race* |
| a real bar chart, dropped as adding nothing | 3 | Ferdio `#27`, `#83`, `#88` |

Two more graphics were reached **through** a dialog the handler did not dismiss — the Guardian's
choropleth under a privacy panel, IIB's under a newsletter modal — and are counted in the first row,
because in both cases what was behind the dialog was not a bar chart either.

---

## Treatments proposed

### 1. `no-value-axis-when-every-bar-is-labelled` — **imported**, ready to file

```
kind      imported
name      A bar chart that prints every value draws no value axis
applies   the beat is a bar or column chart AND every bar carries its own printed value
draws     value  (and it REMOVES axis)
priority  4
evidence  ourworldindata-org-grapher-co2-emissions-by-fuel-line                    (ourworldindata.org)
evidence  100-datavizproject-com-data-type-viz6                                    (100.datavizproject.com)
evidence  informationisbeautiful-net-visualizations-how-much-do-music-artists-ea   (informationisbeautiful.net)
detect    every bar in the delivered artifact has a text run whose box lies inside it or within one
          line-height of its end; AND the artifact carries no tick text and no gridline path along
          the value dimension. A zero rule is permitted; a scale is not.
```

**Three independent publications now**, all three re-read off `graphic.png` on 2026-09-08. Our World
in Data's *CO₂ emissions by fuel or industry* has six bars, six value labels to the right of each
bar end (`15.8 billion t`, `12.5 billion t`, `8.01 billion t`, `1.47 billion t`, `424 million t`,
`416 million t`), a hairline vertical zero rule, and no x axis, no ticks, no gridlines. Ferdio's
`#6` has three range bars, six endpoint values in chips reversed white on the mark, and no scale at
all; Ferdio's `#24` does it with percentages — `18 / 23 / 59` over `30 / 24 / 46`, printed inside
the segments, no axis anywhere.

**The third publication is new this pass** and it comes from re-reading a graphic the previous pass
only read for its header. Information is Beautiful's `% CUT` column is a 100 % stacked bar per row,
and every segment carries its own percentage inside itself — `100`; `15`/`85`; `33`/`66`; `40`/`60`;
`30`/`47`/`23`; `30`/`70`. Under the column header there is a hairline rule and **nothing else**: no
ticks, no gridlines, no `0 %`/`100 %` end caps. Read at x 830–1105, y 500–1400 of that record's own
`graphic.png`.

**Why it is more than tidying.** This tree's `value-on-the-mark` (priority 3) already says print the
number on the mark. It stops there, and the result in practice is a chart that carries the answer
twice — once on the mark and once as a scale nobody now needs. The axis is not neutral furniture: it
is the second-largest ink object on most bar charts, and it competes with the marks for the reader's
first fixation. Where every value is printed, deleting it is free.

**What limits it**, checked against the pictures rather than inferred. It requires that every bar can
carry its number without collision — the same predicate `value-on-the-mark` already carries — and,
as treatment 5 below now shows, that the number can be *seen* where it is printed. Ferdio's `#47`
draws a full 0–16 tick ladder and prints no values at all (its in-bar type is `'04` and `'22`, which
name the *segments*, not their sizes). Ferdio's `#19` draws a 0–15 axis with gridlines and prints
only the **derived** change; the endpoint values the scale encodes are never printed. Both keep their
axes and are right to.

### 2. `series-named-where-the-reader-is-already-looking` — **imported**, ready to file, with three caveats

```
kind      imported
name      The category key is carried by type already on the plate, never by a swatch block
applies   the beat draws more than one named series or segment class AND every class can be named
          in place — inside its own mark, or in a header cell that sits over it
draws     value, body
priority  6
evidence  100-datavizproject-com-data-type-viz47                                   (100.datavizproject.com)
evidence  informationisbeautiful-net-visualizations-how-much-do-music-artists-ea   (informationisbeautiful.net)
detect    the artifact carries no detached swatch legend; AND every series or segment class is named
          either (a) by a text run inside one of its own marks, or (b) by a text run in a header cell
          whose horizontal extent overlaps that class's marks in at least one row of the beat.
          Where the header text is chromatic its hue must be within 10 degrees of that class's mark
          fill (lightness and saturation may differ freely); a header set in a neutral is admissible
          only when every header in the row is set in the same neutral.
```

Ferdio's `#47` sets `'04` and `'22` in white inside the blocks they name. Information is Beautiful's
*Selling Out* colours the words of its `% CUT` column header to match the segments beneath them.
Neither draws a swatch.

**Caveat one — the hue clause is measured, and it is exact.** On `graphic.png`, sampled at
x 830–1105, y 528–552 for the header and y 560–1400 for the segments:

| class | header word | hue | segment fill | hue | Δ hue |
| --- | --- | ---: | --- | ---: | ---: |
| distributor / retailer | `#11A1B5` | 187.3° | `#7DBCC4` | 186.8° | 0.5° |
| label | `#717171` | — | `#4E4E4E` | — | neutral |
| artist | `#75164C` | 326.1° | `#821553` | 325.9° | 0.2° |

An exact-*fill* `detect` would go red on its own founding reference; a hue detect at 10° passes with
19° of headroom. **What is NOT true is this file's previous explanation of the mechanism** — that the
words were "lifted in lightness so 14 px type survives on a `#1C1C1C` ground". Two of the three go
the other way. `#11A1B5` is darker than `#7DBCC4` (L 0.39 vs 0.63) and 2.2× more saturated (S 0.83
vs 0.38); `#75164C` is marginally darker than `#821553`. Only `#717171` is lifted over `#4E4E4E`.
The desk holds the hue and moves whatever else it needs to.

**Caveat two — `applies` needs a guard, and the same desk supplies the counter-example.** Ferdio's
`#19` draws a detached diamond swatch below its plot — `◆ 2004` in `#3274D8`, `◆ 2022` in `#EE5440`,
both words in a neutral `#717D86` — and `#23` draws a three-item key in its bottom-right corner
whose words are all one neutral `#444C67` over three coloured rules (`#3274D8`, `#F05440`,
`#253239`). So "never a swatch" is not this publication's rule; it is what this publication does
**when the classes can be named in place**. `#19`'s diamonds are 14 px markers with no room inside
them, and `#23`'s totals belong to no segment. The `applies` clause is written to say so, rather
than letting the two records read as contradictions.

**Caveat three — NEW, and it is why the `detect` above has an (a)/(b) shape.** Ferdio's `#24` names
`DK`, `NO` and `SE` in a header row sitting directly over the segments of its first bar, draws no
swatch anywhere, and sets all three header words in the same near-black `#0B1629` — matching no
segment fill at all (`#F05440`, `#283250`, `#3274D8`). It satisfies `applies` in full and the
previous `detect` would have refused it, **from inside the publication that founds the treatment.**
Worse, the header binds positionally to bar 1 only: in bar 2 the segments shift (`18/23/59` becomes
`30/24/46`) and the `NO` header no longer sits over Norway's block. What carries the key across the
second bar is the colour, not the position. The revised `detect` admits both devices and refuses only
what both publications actually refuse — **a detached block of swatches**.

**The mechanism caveat, kept from the first version.** The publications reach the same outcome by
different mechanisms — inside the mark, versus in the coloured header. The evidence floor is written
about publication independence and this clears it, but a reader could fairly call the rule broad. It
is proposed as one treatment because the act is one act: *the key rides on type the reader is already
reading.* If the parent prefers, it splits into `series-named-inside-the-mark` (Ferdio only — **one
publication, would be refused**) and `legend-is-the-coloured-header` (IIB only — **one publication,
would be refused**), which is precisely why they are proposed together.

Note its neighbour: `direct-end-label-in-the-series-colour` already forbids a detached legend for
line series. This is the bar family's form of the same instinct, and the parent may prefer to widen
that treatment rather than add this one.

### 3. `stack-total-beyond-the-stack` — **derived**, NOT ready to file

```
kind      derived
name      A stacked bar prints its total past its own end
applies   the beat draws a stacked bar or column of two or more segments
draws     value
priority  5
detect    for every stack, a text run lies within one line-height beyond the stack's far end, its
          content equals the sum of that stack's segment values, and its fill is a neutral rather
          than any segment's own fill
provenBy  ** NOT YET RENDERED **
```

A stack hides the one number it is most often about: the total. The reader has to add. The sum is a
fact the beat's own series carries, so this is `derived` and owes no publication — it owes a render,
and **this harvest did not produce one**, because rendering means touching `shared/` and `skills/`,
which is outside this agent's boundary. It cannot be filed until step 6 and step 7 of the runbook are
done. Flagged rather than filed. No repair changes its status.

Seen in the wild at Ferdio's `#23`, and re-sampled off the corrected `graphic.png` this pass: a
callout pill above each column carrying `8`, `10`, `15` while the segments carry `5`+`3`, `4`+`6`,
`13`+`2`. The three sums check. The pill's ink is **`#253239`** with white type — sampled in the
three pill boxes at (400,88)–(448,128), (258,246)–(305,286) and (328,382)–(376,422), where it is
1 390, 1 459 and 1 219 px against 148, 97 and 52 px of white type. It is a neutral that belongs to
neither the blue nor the red segment, and the same `#253239` is the third rule in that record's own
legend, labelled `Total`. The `detect`'s "a neutral rather than any segment's own fill" is that
observation, not a guess.

### 4. `change-printed-between-the-two-states` — **derived**, NOT ready to file

```
kind      derived
name      When a bar beat draws two states, the change between them is printed between them
applies   the beat draws the same categories at two declared states (two dates, before/after)
draws     annot
priority  5
detect    for every category, a text run lies between the two marks' own coordinates and its content
          equals the change computed from the beat's two declared values
provenBy  ** NOT YET RENDERED **
```

Same shape of argument as this tree's `crossing-marked`: the delta is arithmetic the beat's own data
already contains, and leaving it to the reader is leaving the finding on the floor. Ferdio's `#19`
prints `+150%`, `+60%`, `+15%` in white inside the connector between its two diamonds, and then
**orders the rows by that number** — read top to bottom the graphic is DK, NO, SE, so Sweden, the
largest country on both dates, sits last because the subject is growth. Checked against the picture
and against `#23`'s and `#47`'s segment values: 4 → 10 is +150 %, 5 → 8 is +60 %, 13 → 15 is +15 %.

Same limitation as #3: no render, so not filed.

### 5. `chip-one-step-darker-than-the-mark-it-sits-on` — **derived**, NOT ready to file — **NEW**

```
kind      derived
name      A value printed on a mark gets a chip one step darker than the mark, until the type clears
applies   the beat prints a value on or inside a data mark AND the mark's fill does not carry the
          value's ink at the non-text contrast floor
draws     value
priority  4
detect    for every printed value whose box lies inside a mark, either the mark's own fill and the
          value's ink meet 3:1, or a filled shape lies between them whose fill shares the mark's hue
          to within 5 degrees, is darker than the mark, and meets 3:1 against the value's ink
provenBy  ** NOT YET RENDERED **
```

**This is the treatment repair 1 made visible.** With an unattributed sixth blue in every Ferdio
frame, no claim about a *ramp* of Ferdio blues could be made; with the masthead hidden, the ramp is
flat on the plate and reads off it exactly. Ferdio gives each entity **three steps of one hue**, and
uses them structurally — the light step is the second state, the base is the first, and the chip
that carries a printed number is one step darker than whatever it sits on. Sampled by run-length
along y = 289 / 410 / 533 of `100-datavizproject-com-data-type-viz6/graphic.png`:

| entity | 2nd-state fill | base fill | chip on the base | chip on the 2nd state |
| --- | --- | --- | --- | --- |
| Denmark | `#F37666` | `#F05440` | `#D5433D` | `#F05440` |
| Norway | `#424B65` | `#283250` | `#17203B` | `#283250` |
| Sweden | `#5495EC` | `#3274D8` | `#2561C9` | `#3274D8` |

The same three base fills are confirmed independently on `#24` and `#47`, and the same light steps on
`#47`.

**And the arithmetic is the argument.** White type against each of those fills, WCAG:

| fill | white on it | verdict |
| --- | ---: | --- |
| `#F37666` Denmark light | **2.77 : 1** | below the 3:1 non-text floor |
| `#5495EC` Sweden light | **3.05 : 1** | at the floor |
| `#F05440` Denmark base | 3.47 : 1 | clears |
| `#3274D8` Sweden base | 4.54 : 1 | clears |
| `#D5433D` Denmark chip | 4.47 : 1 | clears |
| `#2561C9` Sweden chip | 5.78 : 1 | clears |
| `#283250` / `#17203B` Norway | 12.63 / 16.07 : 1 | clears |

Every number Ferdio prints inside a chip clears 3:1 **because of the chip**. Denmark's `10` printed
straight onto `#F37666` would have been 2.77:1.

**Both publications break the floor where they skip the device, and this is measured, not asserted.**
Ferdio's `#47` prints `'22` in white directly on Denmark's `#F37666` — **2.77 : 1**. Information is
Beautiful prints `15` in white directly on `#7DBCC4` — **2.13 : 1**, its worst reading in the piece.
Two desks that both know the device fail without it, in the same corpus, on the same act.

**Why `derived` and not `imported`.** It cites no publication because there is nothing for a second
one to corroborate: the fact is the beat's own — its accent, its printed ink, and the contrast
between them, all of which the beat already declares. It is the missing half of `value-on-the-mark`,
which says print the number on the mark and says nothing about being able to read it there.

**NOT ready to file**, on the same boundary as #3 and #4: it owes a `provenBy` render, and rendering
means touching `shared/` and `skills/`.

---

## Directions proposed

### `atlas` — measured from `ourworldindata-org-grapher-co2-emissions-by-fuel-line`, **partial**

```
name          Atlas
measuredFrom  ourworldindata-org-grapher-co2-emissions-by-fuel-line
ground        #FFFFFF
accent        #7088B0
pad           NOT MEASURED
header        stack
headRule      false
stroke        { series: n/a, rule: hairline zero rule only }
```

Every value below carries the route that produced it. **None of it moved in any of the three
repairs**: this reference's graphic is an `svg`, it cleared the picker before and after, its
`documentTop` is 212 with `nearTheTop: true`, and `measuredFrom` is `graphic.png` in every harvest.

| register | family | size | weight | italic | tracking | case | ink | route |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |
| display | Playfair Display | 25 | 600 | no | 0 | none | `rgb(45,46,45)` | style |
| eyebrow | — | — | — | — | — | — | — | **not on the chart** |
| body | Lato | 13 | 700 | no | 0 | none | `rgb(91,91,91)` | style (`Data source:`) |
| axis | — | — | — | — | — | — | — | **the chart draws none** |
| annot | — | — | — | — | — | — | — | **not on the chart** |
| value | Lato | 12 | 400 | no | 0 | none | `rgb(91,91,91)` | style (`15.8 billion t`) |
| category | Lato | 12 | **700** | no | 0 | none | `rgb(91,91,91)` | style (`Coal`) |

- `ground: #FFFFFF` — pixel route on `graphic.png`, modal colour, **78.73 %** coverage.
- `accent: #7088B0` — pixel route, the single chromatic cluster at 217.5°, **19.23 %**, with two
  tints below it (`#92A5C3` 0.27 %, `#7E94B8` 0.04 %); `ramped: 0`, and the palette reads
  **monochrome**. One muted slate blue, no category colours.
- **The accent as drawn is not the accent as declared.** The style route reads the bar fill as
  `rgb(76, 106, 156)` = `#4C6A9C`, six marks. Sampled on the plate at (150,20)–(600,55) the bars are
  a solid `#7088B0`, which is `#4C6A9C` at 0.8 opacity over white to the unit on every channel
  (0.8·76 + 0.2·255 = 111.8 → `0x70`; 135.8 → `0x88`; 175.8 → `0xB0`). The direction should carry the
  composited value, because that is the colour a reader sees and the colour a contrast gate has to
  measure.
- The two type inks were re-checked against the plate this pass. `Coal` at 12/700 reaches `#5B5B5B`
  = `rgb(91,91,91)`, the style route's own value; `15.8 billion t` at 12/400 never reaches full ink
  (its darkest antialiased pixels are `#999999`–`#BDBDBD`), which is what a lighter weight at the
  same size and the same declared fill looks like on a plate. The two routes agree.
- A second display line sits *beside* the title on the same baseline — `World, 2024`, Lato 18 / 700
  in `rgb(118,118,118)`. The subject and the date, in a quieter register, inline. **The direction
  vocabulary has no word for this**; it is neither `display` nor `eyebrow` nor a standfirst.

**One scope note the corrected record makes visible.** `graphic.png` here is the **plot only** —
729 × 454, from the top of the Coal bar to the bottom of Flaring. The title, the `World, 2024`, the
`Table / Line / Bar` tabs, the time slider and the `Data source:` line all sit on the same white card
*outside* the captured element, and the style route that read them is page-wide: the same array also
holds `Search for a country or region`, `Subscribe` and `Browse by topic`. The four type rows above
are identified by the content of their `sample` — they are the Grapher card's own furniture and not
the site's — but they are identified, not scoped. Say so in the record rather than letting a
page-wide array read as a graphic-scoped one.

**Recommendation: do not file this as a complete direction.** Three of the seven registers are
absent from the reference rather than measured quietly, and `pad` was never measured. It is proposed
so the measurements are not lost, and because `ground`, `accent`, `display`, `value` and `category`
are real, checked numbers.

**And still no second direction — the reason is unchanged by all three repairs.**

*Type.* Six of the seven graphics are **rasters** — five Ferdio `img` panels at 823 × 823, one IIB
`img` poster at 1280 × 11243. The pixel route reaches their colour; nothing reaches their type,
because their type is painted into the file. The style route on those six returns the *page's*
words — Ferdio's `stevie-sans` navigation and `Borgia Pro` description, IIB's `IBM Plex Sans` and
`Quicksand` article furniture. **A direction needs type, so the pixel route alone can never yield
one.** That limit on §6.1's claim survives all three repairs intact. Note that none of these six is
an `<iframe>`, so correction 14's `graphicFrame` route — which recovers `Inter Tight` for the rest of
the IIB archive — does not reach them either: a poster served as one `<img>` has no second document
to read type out of.

*And colour, for the one dark candidate.* IIB's poster measures a real, tempting direction — ground
`#1C1C1C` at 56.16 %, `#E80E8A` at 33.68 %, `#F794E0` at 7.01 %, `shape: sequential`. **It must not
be filed**, and the reason is a fault none of the three repairs reaches: that magenta is not the bar
chart. It is a field of nested ellipses in the poster's *streams* section, which owns most of the
poster's 11 243 px of height — sampled at (300,9000)–(900,9400) it is solid `#E80E8A`, and at
(300,10100)–(800,10300) solid `#F794E0`. The bar table's own segments, sampled in their own box at
x 830–1105, y 560–1400 (231 000 px), are `#1C1C1C` **53.75 %**, `#821553` **21.78 %**, `#7DBCC4`
**9.74 %**, `#4E4E4E` **5.84 %**. The graphic is right; the *chart inside the graphic* is not the
one measured. See method note **B**.

---

## Apparatus registers proposed

### `category` — **NOT ready to file. One publication.**

```
kind         apparatus
name         The voice that names a nominal category, as distinct from a measured scale
families     chart
derivesFrom  value  — same family, same size, same ink, ONE WEIGHT STEP HEAVIER
evidence     ourworldindata-org-grapher-co2-emissions-by-fuel-line   (ourworldindata.org)
evidence     ** REFUSED — see below **
```

`axis` is filed in this corpus as *"the quiet voice that names a measured scale"* — tick values,
their unit, years along a time axis. A bar chart's row and column labels are not that. They name an
**entity**, they are the reader's entry point rather than the answer, and Our World in Data sets them
differently.

Measured at Our World in Data: `Coal` is **Lato 12 / 700** and `15.8 billion t` is **Lato 12 / 400**,
both `rgb(91, 91, 91)`, and the plate agrees (see the `atlas` notes above). Same family, same size,
same ink; weight alone separates the name of the thing from its quantity. That derivation — `value`,
one weight step heavier — is what the register would carry, so a direction that records no `category`
still gets a correct one.

**The second leg is withdrawn, and this pass re-measured all three Ferdio candidates rather than
two.** Ferdio does distinguish name from quantity in every one of its five records, and by a
different device each time:

- `#47`: category labels sample `#7A8092`; axis numbers sample `#888D9E`. **The same grey.** What
  separates them is size, not weight, and there is no printed value in the chart at all.
- `#6`: the category is near-black `#0B1629`, set large and heavy; its values are **white, reversed
  inside a chip of the entity's own hue darkened** (treatment 5). No shared family, size, ink or
  weight step.
- `#19`: the category is `#68747E` and the axis numbers are `#929BA2` — again two neutrals separated
  by lightness rather than by weight, and again with no printed value anywhere in the plot.

Three devices, none of them "`value`, one weight step heavier". **The register stands on one
publication and should be held** until a second desk is measured setting `category` as `value` plus a
weight step. It is proposed rather than filed so the Our World in Data measurement is not lost.

Information is Beautiful was checked as a possible second leg this pass and is not one. Its table
headers (`platform`, `format`, `retail price`) and its row values are not a family/size/ink pair
separated by weight; the headers are small grey, the values are white or magenta, and the one column
whose header IS matched to its data is matched by hue, which is treatment 2 and not this register.

---

## What could NOT be filed, and why

**`unit-word-follows-the-magnitude`.** Our World in Data writes `15.8 billion t` and `424 million t`
on the same chart, so every value keeps three significant figures and no reader has to parse
`0.424 billion`. Re-read off `graphic.png` and confirmed again. It is a small, real, transferable
decision. **One publication.** Refused.

**`one-colour-per-entity-across-every-view`.** Now measurable to the channel, which it was not
before repair 1. Across `#6`, `#24` and `#47` — three unrelated encodings of one dataset — Denmark is
always the red `#F05440` / `#EE5440`, Norway always the navy `#283250`, Sweden always the blue
`#3274D8`, and each carries the same lighter second step (`#F37666`, `#424B65`, `#5495EC`). The
reader who has read one panel can read the next without the key. The `#F05440` / `#EE5440` split is
one channel of red (240 vs 238) between records, below any editorial threshold and almost certainly
the panel's own export rather than a decision. **One publication**, and it is a claim about a *set*
of beats rather than one beat, which `applies` and `detect` have no way to express. Refused twice
over, and recorded because it is the most transferable thing Ferdio does.

**`stack-is-level-plus-growth`.** Ferdio's `#23` stacks [2004 count, increase since] rather than
[2004, 2022], so no number in the picture has to be subtracted from another to get the story. **One
publication.** Refused. It may be re-proposed as `derived` once someone can render it.

**`the-column-is-made-of-countable-units`.** Ferdio's `#83` divides each column into one square per
site so the reader can count instead of measuring, and `#88` shows the unfilled remainder to a common
ceiling as ghost dots. **One publication**, and neither record was kept: `#83` teaches nothing `#23`
does not once the value is printed, and `#88` carries no labels at all. Refused, and the references
deleted rather than filed.

**`rows-ordered-by-the-quantity-compared`.** The strongest lever this family found, and **the data
model has no slot for it.** `draws` is defined as *"what it adds, named by register"*, and ordering
adds nothing — it changes geometry. Our World in Data sorts descending; Ferdio's `#19` sorts by the
derived change (DK, NO, SE); Ferdio's `#47` is left in the source table's alphabetical order
(Denmark, Norway, Sweden against values 10, 8, 15) and reads flatter for it — all three confirmed
again by looking at the plates. This is a gap in §5.2, not a missing reference, and it is the
parent's to close.

**`total` as a register** (the stack's total, in a neutral belonging to no segment — Ferdio `#23`'s
pill, measured at `#253239` with white type, and named `Total` in that record's own legend against a
rule of the same `#253239`). One publication, and it derives cleanly from `value` at a neutral ink.
Not proposed.

**A second direction.** See above: type is unreachable on six rasters — and unreachable *by the
`graphicFrame` route too*, because a poster served as one `<img>` has no second document — and the
seventh dark candidate measures the wrong chart inside the right graphic.

**The Pudding's *They won't play a lady on country radio*** reached a real graphic — a dense field of
one hairline rule per play, with blue and orange rules marking the rare ones — and it was **deleted
rather than filed**. The harvester captured the graphic and none of its labels: no title, no axis, no
key was ever in frame, so nothing could be said about what the columns are without inventing it.
A fourth publication was worth a great deal to this family and it was still not worth that.

---

## What the method itself got wrong

**A. Parallel agents share one scratchpad, and pool files collide.** Five families were harvested at
once into a shared session scratchpad. A sibling agent wrote its own `pool-iib.txt` over mine between
my write and my read; the harvest ran on *its* pool and put **ten wrong references into
`references/bar/`** — all reported `style ok, pixel ok`. It was caught only because the printed ids
did not match the urls drawn. `METHOD.md`'s "Parallel safety" section covers the corpus and the
indexes and says nothing about the pools. **Pools belong in a per-family subdirectory**, and the
runbook should say so. Unchanged by any repair.

**B. The masthead rule this note proposed has landed, it worked, and it had a failure mode this note
did not foresee.** The previous version proposed: *an element that intersects a `position: fixed`
element must be captured with that element hidden, or the record must declare the overlap.* That is
what repair 1 implements, and its effect on this family is the table at the top of this file — five
falls of 0.36–0.37 pp against a predicted 0.365 %, and `viz19`'s hex converging from `#3274D9` to
the `#3274D8` the other four report. What this note **did not** foresee is that a scrollytelling
graphic is itself `position: sticky`, so a rule that hides fixed and sticky elements for the length
of the photograph hides the subject. Repair 3 is that exemption. The lesson worth keeping in
`METHOD.md` is not the rule but its shape: **a harvester repair that hides page furniture must
enumerate what it is allowed to hide, never what it is allowed to keep** — the graphic and its
holders are the one thing whose CSS position is not evidence of chrome.

*The residue the repairs do not reach — the chart inside the graphic.* IIB's poster is one image
containing a bar table, an ellipse field and a callout system. `#E80E8A` at 33.68 % is measured on
the right object and describes the **wrong chart**: the family's bars, in their own box at
x 830–1105 / y 560–1400, are `#821553` 21.78 %, `#7DBCC4` 9.74 % and `#4E4E4E` 5.84 % — together
under 4 % of the poster as a whole. A record whose graphic is a multi-chart poster **cannot found a
family direction from a whole-graphic palette**, and nothing in the record currently says so.
Proposed field: `graphic.composite: true` when the graphic's aspect ratio or content indicates a
poster rather than a single chart, and a refusal to measure a direction from a composite.
`style.graphic.ratio` is already **0.11** on this record; the flag is the interpretation, not new
measurement.

*One thing that works as designed.* `two-records-that-agree-exactly-are-both-wrong` would have caught
the old nav contamination and is silent on the new records, correctly: the five Ferdio blues spread
0.2666 % → 4.8075 %, which is five different charts rather than one website.

**C. `shape` reads two categorical identities as `diverging`.** All five Ferdio records report
`shape: diverging`, `ramped: 2`, on clusters at hue 216° and hue 7°. Nothing in any of the five is
diverging. Those are **two of three categorical entity colours** — Sweden `#3274D8`, Denmark
`#F05440`, with Norway's `#283250` sorted into `neutral` because its chroma is low. Unchanged by
repair 1: hiding the masthead moved the shares but not the classification, which is the point — the
classifier was never reading the contaminant, it was reading the wrong thing about the real data. A
classifier that sees two hue poles and says "diverging" will push a wrong `shape` into any direction
measured from a categorical chart, and this family has five of them. Proposed: a two-pole palette is
only `diverging` when the poles sit either side of a light or neutral midpoint that carries real
coverage.

**D. Correction 2 is confirmed, and harder than it reads.** Twelve candidates, twelve different open
desks, subjects chosen to imply bars — rankings, comparisons, splits, budgets. **Zero bar charts.**
A keyword filter over a url list selects a subject and can never select a form. For this family the
url list produced exactly one usable reference in 26, and it was a chart-first publication
(ourworldindata.org) rather than a newsroom.

**E. Bot checks have spread well past SCMP.** In one wave: Cloudflare's "Vérification de sécurité"
on `axios.com` and `economist.com`, a Vercel security checkpoint on `startribune.com`. The
`METHOD.md` line that bot checks "are not fixable this way and should not be" still holds; what has
changed is how many desks now sit behind one. Budget for it in the draw.

**F. The consent handler has language gaps.** `dr.dk` answers with **`TILLAD ALLE`** and
`kontinentalist.com` with **`Ok, I understand`**; neither is in `CONSENT_WORDS`, and both dialogs
stood over the graphic in the capture. Two cheap additions. Not made here — `scripts/` is outside
this agent's boundary.

**G. A graphic can be too tall to photograph.** ABC's *stage three tax cuts to scale* has a scroll
strip whose element is **1000 × 129 000 px**; `element.screenshot()` produced a 16 × 2000 thumbnail
in which nothing is legible. IIB's own panel arrives at **1280 × 11 243**, `ratio 0.11` — legible,
but 14.4 million pixels of which the family's subject is under 4 %. The harvester should record the
aspect ratio it already computes as a **flag**, not just a field: past some ratio a record is a
poster, and a poster is not a chart. Repair 2's `documentTop` / `nearTheTop` is the same shape of
improvement applied to *which* graphic; this one is about *what kind*.

**H. `§5.2`'s `draws` field cannot describe a treatment that reorders.** See
`rows-ordered-by-the-quantity-compared` above.

**I. NEW — a record cannot be checked against the contrast floor, because nothing in it says which
colour is ink.** `pixel.chromatic` and `pixel.neutral` are a bag of fills with shares. Treatment 5
above rests on white type sitting on `#F37666` at 2.77:1 and on `#7DBCC4` at 2.13:1, and **neither
fact is derivable from either record** — both had to be found by sampling boxes by hand and computing
the ratios outside the corpus. Two of this family's three publications break the non-text floor
somewhere in a filed reference, and the corpus is silent about it. Proposed: the pixel route records,
per chromatic cluster, whether a run of near-`#FFFFFF` or near-`#000000` pixels of type size sits
inside it, and the ratio if so. Without that, every treatment about legibility on a mark has to be
argued from outside the data the corpus collects.

---

## Notes that are now stale in the reference records themselves

Not edited here — the `NOTES.md` files were written 2026-09-07, before either re-harvest, and are
outside this task's boundary. Re-checked this pass: **all seven still carry their 2026-09-07 mtime**,
and two of them contradict their own `measured.json`:

- `informationisbeautiful-net-…-music-artists-ea/NOTES.md` still says under `readAs` that
  "`largestGraphic: null`… the pixel route measured the **page screenshot**", and that "only the top
  of the table was in frame". The record now carries `graphic: {tag: "img", 1280 × 11243,
  documentTop: 176, nearTheTop: true}`, `measuredFrom: graphic.png`, `shape: sequential`, and the
  whole poster is in frame, ellipse field included. What that note says about the *design* — the
  coloured column header, the percentage inside each segment, the callout that defines a column —
  is confirmed by the corrected plate and should be kept.
- The five Ferdio `NOTES.md` describe their palettes from the contaminated wave.

Both need a re-read pass by whoever owns those records.

---

## Suggested rows for the yield log in `METHOD.md`

Not written here — `METHOD.md` is outside this agent's boundary. Unchanged by all three repairs: the
same seven references survived, and none was lost or gained.

```
| bar | datavizproject         |  8 |  8 | 5 | 5 |
| bar | informationisbeautiful |  8 |  8 | 1 | 1 |
| bar | url-list               | 26 | 25 | 1 | 1 |
```
