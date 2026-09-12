# Proposal — the heatmap / matrix family

What this harvest thinks should be FILED, for the parent to integrate. Nothing here has been written
into `treatments/`, `directions/` or `registers/`; those directories were not touched.

Family: a grid of cells addressed by two categorical axes, where the cell carries the value.
Corpus: `docs/design-base/references/heatmap/`, eleven records, all measured on their own
`graphic.png`. Revised 2026-09-08 against the corpus's final state — after `METHOD.md` corrections 13
and 14 **and** after the three repairs that followed them (§0).

## 0. What this second pass changed

Three further repairs landed after `METHOD.md` corrections 13 and 14: the **fixed masthead** that was
being photographed with the graphic, the rule that **the largest graphic on a page need not be the
piece the url names**, and the exemption for a **`position: sticky` scrollytelling graphic**. This
section says what each did to this family, and carries forward the one withdrawal from the previous
pass that still stands. Every number below is `record.pixel` on a record whose
`routes.pixel.measuredFrom` is `graphic.png`; that is true of all eleven.

### Repair 1 — the masthead was in the clip, and every Ferdio number was wrong by the same amount

`element.screenshot()` scrolls the element into view, and `100.datavizproject.com` then paints its
`position: fixed` nav across the first rows of the clip. 2 472 px of solid `rgb(50, 116, 218)` — the
same blue Ferdio draws its charts in — sat in all five records, identically. On an 824 × 823 clip
(678 152 px) that is **0.3645 %** — and subtracting each new share from the one this file printed
before gives 0.360, 0.361, 0.364, 0.368 and 0.369 %, every one within half a hundredth of that
figure. (The five deltas are computed against the previous pass's two-decimal figures, so their own
last digit is not exact; their agreement is the point.) Nothing but a constant overlay produces
that.

| record | blue, previous pass | blue, now | ground, now |
| --- | ---: | ---: | ---: |
| `100-datavizproject-com-data-type-viz49` | `#3274D9` 3.02 % | `#3274D8` **2.651 %** | `#FFFFFF` 81.522 % |
| `100-datavizproject-com-data-type-viz35` | `#3274D9` 1.94 % | `#3274DA` **1.580 %** | `#FFFFFF` 93.045 % |
| `100-datavizproject-com-data-type-viz96` | `#3274D9` 1.42 % | `#3274D8` **1.059 %** | `#FFFFFF` 91.567 % |
| `100-datavizproject-com-data-type-viz100` | `#3274D9` 0.88 % | `#3274D8` **0.516 %** | `#FFFFFF` 95.730 % |
| `100-datavizproject-com-data-type-viz77` | `#3274D9` 0.66 % | `#3274D8` **0.292 %** | `#FFFFFF` 97.440 % |

**It did more than shrink a share: it inverted a ranking.** With the nav in the clip the blue was the
top chromatic entry on all five records. Measured on the graphic alone it leads on **two** — `viz35`
and `viz96` — and Ferdio's coral leads the other three: `#EE5440` at 2.659 % on `viz49` against the
blue's 2.651 %, at 0.552 % on `viz100` against 0.516 %, and at 0.457 % on `viz77` against 0.292 %.
Twice now, a statement about "Ferdio's dominant hue" has turned out to be a statement about a
navigation bar. This file makes none.

**The hex moved too**, which is the same fact from the other side: a block of pure `#3274DA` no
longer pulls the cluster mean, so four of the five records now name the charts' own `#3274D8` and
only `viz35` — the one whose blue is a large flat donut ring — still reads `#3274DA`.

### Repair 2 — no picked object in this family moved

All eleven records now carry `style.graphic.documentTop` and `style.graphic.nearTheTop`.
**`nearTheTop` is `true` on all eleven, and not one pick changed**: the five Ferdio records are still
`img 823 × 823` at `documentTop 172`; `colours-in-cultures` is `img 1280 × 889` at 176,
`most-common-pin-codes` `img 1280 × 1033` at 176, `tooth-law-whats-halal-whats-` `img 1280 × 2126`
at 176; `which-fish-best-safest-healt` is `svg 1380 × 1403` at 164;
`didoesdigital-com-growing-seasonality` is `svg 1912 × 1912` at 906; and ProPublica is `svg 960 × 670`
at 659. Every one of the eleven `graphic.png` files was opened and is the piece its url names.

The case the repair was written for is genuinely present here and did not bite. ProPublica's page
carries **three dated cartograms and a legend as well as** the state × year table, so a larger or
comparable rival was plausible; the record still picks the table. The three Information is Beautiful
posters are each a single tall `<img>` with nothing of comparable size beside them.

### Repair 3 — nothing in this family is sticky, and one record moved anyway

No reference here is scroll-driven, none has `position: sticky` holders, and none came back
near-empty or falsely `monochrome`. `which-fish` reads `monochrome` and that is the piece: one
saturated colour on the canvas (§3).

What repair 3 *also* changed — the graphic is given time to draw after being brought into view — is
the only mechanism in this pass that touches `didoesdigital-com-growing-seasonality`, and that
record's palette did move. Its three hue clusters now read **hue 161 at 5.715 %, hue 359 at 2.881 %,
hue 49 at 0.866 %**, against the 5.67 / 2.90 / 1.22 % this file printed; `#F5D6A3` (hue 37,
0.899 %) is now a chromatic entry in its own right rather than a member of the yellow cluster.
**The two numbers §6.2 actually rests on did not move** — ground `#FAF9FB` at 82.434 %, accent
`#24BC8C` at 2.118 %, both agreeing with the style route (`rgb(250, 249, 251)`;
`fill rgb(36, 188, 140)` on 372 runs). I am not attributing the cluster move: the record carries no
before-state, and the piece is a d3 fan with transitions and a month control, so a redraw taken at a
different instant is enough to explain it on its own. It is recorded, not explained.

Every other record in the family reports the same ground, the same accent and the same palette shape
as the previous pass, to three significant figures: `#000000` 56.3 % (Pin Point), `#FFFFFF` 61.0 %
(Tooth & Law), `#CBCAC3` 81.5 % (Colours In Culture), `#BCE3F9` 32.6 % (Which Fish), `#FFFFFF` 22.7 %
and `#FFFFE0` 10.4 % (ProPublica). Information is Beautiful's nav is not fixed and ProPublica's sits
above the picked element, so repair 1 had nothing to take off them.

### What survived this pass

All three proposed treatments (§2.1, §2.2, §2.3), all six evidence additions (§3), the `legend`
register unblock (§4), the refusal to add a family register (§5), both directions (§6.1 `dossier`,
§6.2 `potager`) and every refusal in §7.

**The reason so little moved is worth saying plainly, because it is luck as much as method.** Ferdio
is one publication, so correction 4 keeps it out of every evidence floor in this file, and no
treatment, register or direction here is founded on a Ferdio colour. Only two claims touch a Ferdio
number at all, and neither is a blue: §3's `context-in-neutral-at-the-subject-scale` row cites the
grey `Avg.` band on `viz100` at `#B0BDC3` 0.390 %, unchanged because the nav was blue and this is
grey; and §2.3's counter-example cites `viz49`'s **ground**, which moved from 81.2 to 81.522 % and
is sharper for it. Had this family filed anything on Ferdio's palette, it would have filed it twice
wrong.

**Four things this pass corrected without changing a conclusion**, all of them mine and all of them
found by re-deriving rather than re-reading: `viz49`'s ground (§2.3); ProPublica's four pole
lightnesses and its neutral, where one of the four was outside the range printed and the detect's
margin was overstated as an order of magnitude when it is a factor of six (§2.3); ProPublica's cell
geometry, where the gutter count and the label column were both wrong (§6.1); and
`colours-in-cultures`'s ink, named as `#1D1D1B` when every word on that poster is white (§7).

### What the previous repair withdrew, and it stays withdrawn

The eleven-stop ramp string this file once printed for *Pin Point* —

> `#FFFFFF → #FFF394 → #FBE184 → #F5CE72 → #E9A951 → #DB8136 → #CF581F → #C94317 → #9D7152 →
> #434342 → #242423`

— remains **withdrawn**. It was an eyedropper pass over `screenshot.png`, made when that record's
pixel route was a reading of the whole 1440 × 900 page. Eight of its values appear in no corrected
record. Two survive (`#DB8136` at 0.869 % of the graphic, `#242423` at 0.151 %) and `#434342` is one
digit from the corrected `#434343` at 0.138 %, which is what an eyedropper on a compressed raster
does. The ramp was read off the right object by the wrong method, and this file does not cite it.
What replaces it — ground `#000000` at 56.3 %, one warm cluster at hue 21 holding 37.7 % across 24
colours, `#D15F23` at 16.7 % — is in §2.3 and was re-read off `graphic.png` again on this pass.

### One thing this proposal still cannot fix

All eleven `NOTES.md` in `references/heatmap/` are dated 2026-09-07 23:0x. They are two repair passes
old, and eight of them contradict their own `measured.json` in writing. The boundary on this run is
`proposals/heatmap.md` only, so they are left as they are and named here again. **They should be
re-read before anything downstream cites them.** The `NOTES.md` for `most-common-pin-codes` still
prints the withdrawn ramp string as though it were measured, and every Ferdio note that quotes a blue
share quotes it inflated by the same 0.3645 points.

## 1. The yield, for `METHOD.md`'s log

| family | archive | drawn | harvested | survived reading | filed |
| --- | --- | ---: | ---: | ---: | ---: |
| heatmap | url-list | 25 | 25 | 2 | 2 |
| heatmap | informationisbeautiful | 9 | 9 | 4 | 4 |
| heatmap | datavizproject | 9 | 9 | 7 | 5 |

Forty-three drawn, forty-three reported `style ok, pixel ok` by both routes, **thirteen reached a
real matrix**, eleven filed. Two records reached a real matrix and were deleted anyway as
redundant: `viz37` (a dot with a 45° shadow in a table) and `viz87` (sized circles in a matrix)
restate `viz35`'s lesson with weaker marks, and correction 4 exists precisely to stop one desk's
variations being counted as a practice.

**Both routes reported `ok` on all forty-three at a moment when eight of the eleven survivors were
photographing a website.** That is correction 13's finding arriving in this family's own numbers,
and it is the reason the yield column above cannot be read as a quality column: reaching a real
matrix and measuring a real matrix were two different things until the repair.

Pools: `/tmp/pool-heatmap-dvp.txt`, `-iib.txt`, `-urllist.txt`, `-urllist-2.txt`. Every one of the
eleven filed directories was checked back against the urls actually drawn; none is foreign.

## 2. Treatments to file

### 2.1 `scale-classes-named-in-words` — imported

```
kind      imported
name      The classes of a colour scale are named in words where the value has no unit
applies   the beat encodes a value by colour AND that value is ordinal, a rank, or an index with no
          unit a reader can use
draws     legend
priority  7 (suggested; it competes for the same corner as any other key)
detect    every named class of the scale — or, on a continuous ramp, each end of it — has a text run
          within one line-height of the swatch it names, and at least one of those runs is not
          purely numeric
evidence  informationisbeautiful-net-visualizations-which-fish-best-safest-healt
evidence  projects-propublica-org-graphics-workers-comp-reform-by-state
```

Two publications: `informationisbeautiful.net`, `projects.propublica.org`. **Survives every repair
unchanged** — it is a claim about words, and both records' type is measured.

**The rule.** When the quantity behind a colour scale has no unit a reader can spend, do not print
numbers on the key. Name the classes.

**Where it was seen.** ProPublica's ramp is labelled `Cut Benefits` and `Raised Benefits` — an index
of legislative change with no natural unit, named at both poles instead, with nothing at all on the
pale-yellow midpoint. *Which Fish are Okay to Eat?* goes further and puts the definition in the row
header: `YES — abundant, well-managed or caught in an eco-friendly way`, `MAYBE — fish are flagged
for concern, and may be trawler-caught`, `NO — vulnerable or endangered species, caught or farmed in
harmful ways`. The key and the axis are the same object and there is no separate legend at all. The
style route measures those headers inside the SVG: `Quicksand | 32 | 700 | -0.4` for the class name,
`Quicksand | 15 | 700 | -0.4` for the definition beneath it.

**Where ProPublica's evidence physically sits, stated plainly.** The picked graphic on that record
is the state × year table (`svg`, 960 × 670, at page y = 659). Its legend and its three dated
cartograms sit **above** that element in the same page, so they are read from `record.style.type`
(page-wide) and from `screenshot.png`, not from `graphic.png`. On a graphics microsite —
`projects.propublica.org/graphics/…` — the page's furniture is the piece's furniture, so this is a
seam to declare rather than a contamination; but it is a seam, and a reader of this file should know
where each number came from.

**What limits it.** Where the value DOES have a unit, the Guardian's
`Multiple of £25,000 — 2 3 4 5 6 10+` is the better answer, and this treatment must not fire. The
predicate is doing real work.

### 2.2 `scale-label-in-its-own-class-colour` — imported

```
kind      imported
name      A scale's class label is set in that class's own colour
applies   a colour key exists — a ramp with named ends, or a set of named categorical bands — AND
          the class's own colour clears the text-contrast floor against the ground
draws     legend
priority  7
detect    each class label's computed fill equals the fill of the class it names, rather than the
          furniture ink
evidence  projects-propublica-org-graphics-workers-comp-reform-by-state
evidence  informationisbeautiful-net-visualizations-tooth-law-whats-halal-whats-
```

Two publications: `projects.propublica.org`, `informationisbeautiful.net`. **Survives, and the
Tooth & Law half is better evidenced than it was.**

**The rule.** The label carries the colour it names, so there is nothing to pair.

**Where it was seen.** ProPublica's two legend end-labels are measured by the style route as
`Helvetica Neue | 10 | 400 | normal | 0 | none`, sample `Raised Benefits`, carrying
`rgb(39, 135, 118)` and `rgb(128, 28, 25)` — the green pole and the red pole — alongside black. That
tuple is a type measurement and the repair did not touch it.

*Tooth & Law* does the same thing on a categorical axis, and the corrected pixel record now names
the colours the old eyedropper had to guess at: `KOSHER` in the orange-red of its own band
(`#B83E17`, 3.76 % of the graphic), `both` in the dark red-brown of its own (`#613116`, 10.4 %),
`HALAL` in the light blue of its own (`#87CBF1`, 1.07 %). The poster carries no legend because it
does not need one — and it repeats the device in prose two-thirds of the way down, where
**`NOT KOSHER`** sets `KOSHER` in the band's orange-red and `NOT` in ink, and **`HALAL NO-NO`** sets
`HALAL` in the band's blue and `NO-NO` in ink. That lower block was below the old capture's fold and
is in the record for the first time.

**One correction to the earlier reading.** This file previously gave the halal class as `#728E86`.
`#728E86` is measured (6.28 % of the graphic, in the neutral list) but it is not the class colour:
it is what the halal band's translucent blue produces *over the tan `NEITHER` band it overlaps*. The
class colour, and the colour of the word, is `#87CBF1`. The treatment holds either way; the hex was
wrong.

**What limits it, and it is a hard limit.** A pale class cannot label itself. ProPublica's poles are
the two dark ends of its ramp, which is why it works there; the pale-yellow midpoint is labelled by
nothing. **The predicate above must include the contrast test, and the treatment must fall back to
ink for any class that fails it** — otherwise this treatment ships an unreadable key and the
contrast gate catches it after the fact instead of before. *Tooth & Law* is itself near that edge:
`#87CBF1` on white is a light-on-light pairing that clears no text floor, and it is legible in the
poster only because it is set very large.

### 2.3 `the-scale-is-oriented-against-the-ground` — imported

```
kind      imported
name      The classes that carry the argument depart the ground; the neutral class sits nearest it
applies   the beat encodes a value by colour
draws     legend
priority  9 (a floor, like accent-marks-the-thread, not an option)
detect    |L(loudest class) − L(ground)| > |L(neutral or lowest class) − L(ground)|, measured as
          relative luminance on the delivered artifact
evidence  informationisbeautiful-net-visualizations-most-common-pin-codes
evidence  projects-propublica-org-graphics-workers-comp-reform-by-state
```

Two publications: `informationisbeautiful.net`, `projects.propublica.org`. **Survives — on new
numbers.** The eleven-stop ramp string is withdrawn (§0); what follows is `record.pixel` from
`graphic.png` on both references, plus what the eye reads off those same files.

**The rule.** The ramp's direction is a function of the ground, not of a convention. Dark-means-more
is not a law; departing-the-ground-means-more is.

**Where it was seen, from both sides.** *Pin Point* sits on black — pixel route, `graphic.png`:
ground `#000000` at **56.3 %**, shape `sequential`, one warm cluster at hue 21 holding **37.7 %**
across 24 colours, `#D15F23` at 16.7 %, white `#FEFEFE` at 0.30 %, and a near-black tail
`#242423` / `#2B2B2B` / `#333333` / `#434343`. The key, read off `graphic.png`, runs white through
yellow and orange to three greys and is labelled `most common` at the white end and `least` at the
grey end: **the most common class is the one furthest from the ground.**

ProPublica sits on white and runs both poles dark — pixel route, `graphic.png`: ground `#FFFFFF` at
**22.7 %** (the 1 px and 2 px cell gutters), shape `diverging`, `ramped: 2`, two clusters at hue 8
(**45.7 %**, 21 colours) and hue 156 (3.67 %, 3 colours). The neutral `no change` class is
`#FFFFE0` at **10.4 %** — a pale yellow a shade off the paper — and the poles are `#BA5B51` /
`#AE4E46` and `#529F8B` / `#7DB7A0`.

**These three L figures are corrected on this pass; the previous pass's were wrong and the
conclusion is not.** It gave "all four at L ≈ 0.47 – 0.52 … the detect is satisfied by an order of
magnitude: 0.52 against 0.04". The record's own `l` values are `#AE4E46` 0.478, `#529F8B` 0.473,
`#BA5B51` 0.524 and **`#7DB7A0` 0.604** — the fourth is outside the range that was printed — against
a ground at 0.99989 and the neutral `#FFFFE0` at **0.939**, not 0.96. So the smallest pole distance
is 0.396 and the neutral distance is **0.061**: the detect is satisfied by a factor of about six, not
by an order of magnitude. One caveat the earlier wording hid: `record.pixel` reports HSL lightness,
while the `detect` above names **relative luminance**, which is not the same quantity. The two agree
on the ordering here by a wide margin, and any guard implementing this treatment must compute
luminance itself rather than read `l` out of a record.

Two grounds, two opposite ramps, one rule.

**The corpus holds its counter-example, and two repairs have now sharpened it twice.** Ferdio's
`viz49` puts a ramp whose low end is **white** on a ground the corrected record measures as
`#FFFFFF` at **81.522 % of the graphic itself** — not, as this file once said, on a `#F4F7F7` page,
which was the DVP site's background and not the picture, and not at the 81.2 % the previous pass
printed, which was that share minus the 0.3645 % of masthead blue lying across the top of the clip.
Looked at again on this pass, the leftmost swatch of that `0 … 15` key is white held together by a
hairline: a cell of value 0 would be indistinguishable from no cell. Nothing in that dataset reaches
0, so it does not bite — the scale is built so that it would.

## 3. Evidence to ADD to treatments already filed

None of these unblocks anything; each is a second family meeting a rule that was filed on the first.
**All six survive both repair passes**, and four of them are better founded than they were, because
the record they cite is now a reading of the graphic. The two Ferdio rows were re-checked against the
post-masthead record: `#B0BDC3` on `viz49`'s neighbour `viz100` still reads 0.390 %, and the printed
cell values (`5 4 13 / 8 10 15`, `4 10 6 150 %`) were re-read off `graphic.png`.

| treatment | add | why |
| --- | --- | --- |
| `value-on-the-mark` | `100-datavizproject-com-data-type-viz49` | the count printed inside every heatmap cell (`5 4 13 / 8 10 15`) — the repair for colour's inability to be read back to a number |
| `value-on-the-mark` | `100-datavizproject-com-data-type-viz100` | number and bar in the same table cell |
| `mark-depicts-its-subject` | `informationisbeautiful-net-visualizations-which-fish-best-safest-healt` | a fish per fish; the cell is readable without its label |
| `mark-depicts-its-subject` | `informationisbeautiful-net-visualizations-tooth-law-whats-halal-whats-` | animal silhouettes; the marks carry no text at all |
| `context-in-neutral-at-the-subject-scale` | `100-datavizproject-com-data-type-viz100` | the `Avg.` row drawn in grey (`#B0BDC3`, 0.39 % of the graphic), at the same row height and the same bar scale, so the aggregate cannot be read as a fourth country |
| `accent-marks-the-thread` | `informationisbeautiful-net-visualizations-which-fish-best-safest-healt` | the one saturated colour on the canvas (`#F28166`, 1.90 % of the graphic) is spent entirely on the `NO` class — the subject, not the largest group |

The last row is the strongest measurement in this family and it did not move: that record's pixel
route has always read `graphic.png`, reports the palette as **`monochrome` with `ramped: 0`** and
lists exactly **one** hue cluster (hue 12, 16 colours, 2.59 %) beside three pale blues and four
greys. The style route agrees from the other side: of the SVG's declared mark fills, `rgb(242, 129,
102)` on 39 marks is the only chromatic one; the rest are `rgb(102,102,102)`, `rgb(60,60,59)`,
`rgb(157,157,156)` and white.

## 4. Apparatus register — `legend` is unblocked

`METHOD.md`'s map section records `legend` as blocked at one publication, the Guardian, after two
waves and 28 candidates. **This harvest brings two more, and they are two different desks.** The
repair does not touch this: both new citations are claims about words and their placement, and both
survive.

```
kind        apparatus
name        The voice a graphic names its own colour scale in
families    chart, map, video          (see the caveat below)
derivesFrom body
evidence    theguardian-com-society-ng-interactive-2015-sep-02-unaffordable-countr   [map, existing]
evidence    projects-propublica-org-graphics-workers-comp-reform-by-state            [heatmap, new]
evidence    informationisbeautiful-net-visualizations-most-common-pin-codes          [heatmap, new]
```

Three publications: `theguardian.com`, `projects.propublica.org`, `informationisbeautiful.net`.

**What the three show, and they do not agree, which is the point.** The Guardian names its **unit**
and leaves its top class open (`Multiple of £25,000 — 2 3 4 5 6 10+`). ProPublica names its **poles**
in words and sets each name in its own pole's hue. Information is Beautiful names its **ends** in
words with no unit at all, because the quantity is a rank. Three answers to one question — what does
a reader need in order to read a colour back — and the register is the voice all three are spoken
in, not any one of the three answers.

**A fourth answer the repair uncovered, and it is not a fourth publication.** `colours-in-cultures`
carries a key that names **only the classes the eye cannot separate**: `Yellow / Gold` and
`Grey / Silver`, four swatches, while the other eight hues in the encoding — red, green, blue,
purple, orange, pink, brown, black — go unlabelled because a reader can name them from the swatch.
That block sat below the old capture's 900 px fold and is in the record for the first time. It is
`informationisbeautiful.net` again, so it corroborates nothing the Pin Point citation does not
already carry; it is worth writing into the register's prose as the sharpest statement of what a
legend is FOR — the classes a reader cannot name unaided, and no others.

**The derivation factor is proposed at one measurement and should not be trusted yet.** On
ProPublica, still the only reference here whose legend type is measurable, the legend is `10 px`
against `axis` at `13 px` and `body` at `15 px` — a legend/body ratio of **0.67**, against the 0.88
that `axis` uses. One measurement, and the repair produced no second one: the other two legends in
this family (`viz49`'s `0 … 15`, `colours-in-cultures`'s four swatches) are inside rasters served as
a single `<img>`, so their type is unmeasurable by any route. Either take 0.67 and say it rests on
one reading, or hold the factor until a second measurable legend is harvested. Deriving from `axis`
would be the better fit numerically and is wrong structurally: a map has a legend and no axis.

**The `families` line is a guess and needs the parent's ruling.** `axis.md` says `chart, video`;
`place.md` says `map`. A legend appears in all of them, and this family's own directory is
`heatmap`, which is not one of those names. The register taxonomy and the corpus directory taxonomy
are not the same vocabulary, and this proposal does not resolve it.

## 5. No other apparatus register is needed

The heatmap family was expected to want a register of its own. It does not, and the repair did not
change that.

- The number printed inside a cell is `value`. `viz49` and `viz100` both use it and neither asks for
  anything `value` does not already carry.
- The row and column headers of a matrix are `axis` — a categorical scale is still a scale, and
  ProPublica sets its year headers in `Helvetica Neue | 13 | 400`, the same quiet voice `axis`
  describes.
- The class definitions in *Which Fish*'s row header are `annot` doing what `annot` is for.
- The one thing this family genuinely needs that the core does not have is the **legend**, and the
  legend is not this family's own — the map family needed it first.

**A family that adds no register is a good outcome**, not a thin one: it is evidence that the
core-plus-apparatus split is holding.

## 6. Directions

### 6.1 `dossier` — file it

Measured off `projects-propublica-org-graphics-workers-comp-reform-by-state`, whose pixel route read
`graphic.png` **through all three repairs**, so no number here has moved at any point. The accent is re-sourced to
satisfy the rule that a colour claim comes from `record.pixel`.

```
id            dossier
name          Dossier d'enquête
measuredFrom  projects-propublica-org-graphics-workers-comp-reform-by-state
ground        #FFFFFF        pixel route, graphic.png, 22.7 % (the cell gutters); style route, the
                             page's own ground: rgb(255, 255, 255). Both routes agree.
accent        #AE4E46        pixel route, graphic.png, 1.15 % — the deepest red class the picture
                             actually paints at any size, on the pole the story is about. The SVG
                             declares two fills deeper still, read by the STYLE route only:
                             rgb(151, 53, 48) on one cell and rgb(140, 41, 36) — the #8C2924 this
                             file used to name as the accent — on six. Six cells is ≈0.70 % of the
                             graphic and it is not in the record's ten chromatic entries, whose
                             tenth is #529F8B at 0.69 %; it is named here and not founded on.
header        centre         title, italic byline and standfirst all on the axis
headRule      false          no hairline under the header block; the table carries its own
```

| register | family | size | weight | italic | tracking | case | ink | route |
| --- | --- | ---: | ---: | --- | ---: | --- | --- | --- |
| display | sans-condensed | 34 | 700 | no | 0 | none | ink | style: `jaf-bernina-sans-condensed \| 34 \| 700` |
| eyebrow | serif | 11 | 700 | no | 0.22 | none | ink | style: `ff-tisa-web-pro \| 11 \| 700 \| 0.22`, sample `SOURCES:` |
| body | serif | 15 | 400 | no | 0.15 | none | ink | style: `ff-tisa-web-pro \| 15 \| 400 \| 0.15`, the standfirst |
| annot | serif | 14 | 400 | **yes** | 0 | none | muted | style: `ff-tisa-web-pro \| 14 \| 400 \| italic`, `rgb(119, 119, 119)` |
| value | — | — | — | — | — | — | — | **not measured — this matrix prints no values** |
| axis | sans | 13 | 400 | no | 0 | none | ink | style: `Helvetica Neue \| 13 \| 400`, sample `2002` |
| legend | sans | 10 | 400 | no | 0 | none | **accent** | style: `Helvetica Neue \| 10 \| 400`, sample `Raised Benefits`, colours `rgb(39,135,118)` / `rgb(128,28,25)` |

Row labels inside the matrix sit at `Helvetica Neue | 10 | 400`, the same tuple as the legend.

**What route each row came from, said once and plainly.** Correction 14 removed the style route's
own graphic detection: `record.style.type` is now a reading of the whole PAGE, never of the picked
element. On an article with an embedded chart that would make the table above the publisher's
furniture rather than the piece's. Here it does not, because the reference is a standalone graphics
page on `projects.propublica.org/graphics/` whose headline, byline, standfirst and source line
belong to this graphic and nothing else. The one row that is unambiguously page chrome — the
`ProPublica` masthead at `ff-meta-serif-web-1 | 38.4 | 700`, the `Donate` button, `Share on
Facebook`, `© Copyright 2017` — is excluded above and named here so the exclusion is visible.

**Why this reference and not another.** Its pixel route measured `graphic.png` — the matrix element
itself — and its style route read a live SVG whose page is the piece's own page. It is the only
reference in this family of which that is true and which is also a newsroom.

**Three things this direction carries that the repository has never used**, and all three are
measured rather than chosen: an italic run, tracked runs at 0.15 / 0.22 / 0.26, and a **200 weight**
(`ff-tisa-web-pro | 15.5 | 200`, `Helvetica | 13 | 200`) — lighter than anything in the 122
components measured on 2026-09-07.

**Not measured, and must not be invented:** `pad`, `stroke.series`. What IS measured is the cell
geometry, and this pass re-derived it from the raw pixels of `graphic.png` rather than carrying the
previous figures forward: **rows 11 px with a 2 px gutter** — scanning down x = 500 gives exactly 50
painted runs of 11 px separated by exactly 49 white runs of 2 px, a 13 px pitch, then a 22 px bottom
margin — and **columns 68 px with a 1 px gutter**, a 69 px pitch, 13 columns whose boundaries fall at
x = 129, 198, 267, 336, 405, 475, 544, 613, 682, 752, 821, 890, 959. So if the direction model wants
a `rule` weight, `2` is a measured number with a stated meaning.

Two corrections to the previous pass's version of this paragraph, both small and both mine: the
gutters between 50 rows are **49**, not 50; and the label column is **60 px** (cells begin at
x = 60), not 46 — the state abbreviations occupy x = 0 – 29 and the remaining 30 px are empty.
`value` is unmeasured and must be reported as derived, not printed as though it had been read.

### 6.2 `potager` — a candidate, and the parent may prefer to hold it

Measured off `didoesdigital-com-growing-seasonality`, whose pixel route has read `graphic.png`
through every repair, and whose type is a live SVG. **The two fields this direction rests on did not
move; its cluster shares did (§0, repair 3).**

```
ground   #FAF9FB   pixel route, graphic.png, 82.434 %; style route, rgb(250, 249, 251). Both agree.
accent   #24BC8C   pixel route 2.118 %; style route, marks: fill rgb(36, 188, 140), 372 runs — the
                   largest group. Palette shape categorical, ramped 1, three clusters (hue 161 at
                   5.715 %, hue 359 at 2.881 %, hue 49 at 0.866 %) — these three shares differ from
                   the 5.67 / 2.90 / 1.22 % of the previous pass and the move is unexplained.
header   stack
```

| register | family | size | weight | italic | tracking | case | route |
| --- | --- | ---: | ---: | --- | ---: | --- | --- |
| display | sans | 24 | 700 | no | 0 | none | `Quicksand \| 24 \| 700` |
| eyebrow | sans | 16 | 400 | no | **1.6** | **uppercase** | `Quicksand \| 16 \| 400 \| 1.6 \| uppercase`, sample `green` |
| body | sans | 16 | 400 | no | 0 | none | `Quicksand \| 16 \| 400`, 276 runs |
| axis | sans | 24 | 400 | no | 0 | none | `Quicksand \| 24 \| 400`, sample `Jan` |
| annot | — | — | — | — | — | — | **not measured** |
| value | — | — | — | — | — | — | **not measured** |
| legend | — | — | — | — | — | — | **not measured** — the piece has no legend; the produce list is one |

**Two reasons to hold it.** Three of the six core registers are unmeasured, and the publication is
one designer's personal site with no desk behind it — which the evidence floor tolerates (it counts
publications, not newsrooms) but which a reader of `directions/` deserves to be told. It carries a
tracked-uppercase eyebrow and a 900 weight (`Quicksand | 16 | 900 | 1.6`, sample `fresh`), both of
which the repository lacks, so it is not worth discarding either.

**One thing to note if it is filed.** The piece's produce chips are `Arial | 16 | 400` on 78 runs —
unstyled browser default on `<button>` elements, not a choice. A direction taken from this reference
must not carry that tuple into any register.

**Two seams found by looking on this pass, neither of them fatal, both of which the parent should
see before filing.** First, the picked element is an `svg 1912 × 1912` at `x: -236` — a box wider
than the viewport, whose photograph therefore contains the page's own HTML controls (state radio
buttons, a `Hide out of season foods` checkbox, the `← September →` month stepper, the produce
chips). The pixel route's numbers are honest for that box and both routes agree on the ground, but
82.434 % is a share of a box that is substantially page. Second, `display` in the table above is
given as `Quicksand | 24 | 700`, whose sample is `A visual guide to seasonal fruit and veg`; the
record's largest run is `Quicksand | 48 | 700`, sample **`Can I Eat It Yet?`**, which is the site's
own H1, and the graphic's own title (`What's in season in Australia?`, plainly visible in
`graphic.png`) is in no distinctly-keyed run at all. **Which of the two is `display` is a judgement,
not a measurement, and this file does not have the standing to make it silently.**

### 6.3 No direction from the three Information is Beautiful rasters, and none from Ferdio

**The refusal stands; its stated reason was half wrong and is corrected here.** This file previously
gave two reasons: that the style route reached only the site's chrome, and that the pixel route
measured `screenshot.png` so the grounds and palette shapes were readings of a page. **The second
reason is no longer true.** *Pin Point*, *Tooth & Law* and *Colours In Culture* all now measure
`graphic.png`, and their grounds and palette shapes are readings of the posters — `#000000` at
56.3 %, `#FFFFFF` at 61.0 %, `#CBCAC3` at 81.5 % respectively. Those numbers are usable and §2.2 and
§2.3 now use them.

**The first reason survives intact and is sufficient.** All three are posters served as a single
large `<img>` (`tag: "img"`, 1280 px wide). There is no type inside a raster for any route to read,
and `record.style.type` on those three is exactly what correction 14 names: the publisher's article
furniture — `IBM Plex Sans` for the standfirst and the related-piece cards, `Quicksand` for the nav
and the `New! Learn to do data-viz` promo strip, `rgb(240, 98, 146)` for `Our mission`. A direction
needs family, size, weight, italic, tracking and case per register; not one of those is available
inside the graphic, and inventing them from a raster is exactly the defect `METHOD.md` correction 6
records.

**One IIB reference is still the exception, and it is still not proposed — re-examined on this pass,
both refusing reasons survive.** `which-fish-best-safest-healt` is an inline SVG, so its own type IS
measured and separable from the chrome: `Quicksand | 32 | 700 | -0.4` (`NO`), `| 19 | 700`
(`Pacific`), `| 15 | 700 | -0.4` (`vulnerable or`), `| 14 | 500` (`Pollock`, 95 runs),
`| 13.5 | 500` (`TOXINS`), `| 10 | 500` (`(CANADA TRAWL)`, 106 runs), `| 16 | 400` (the source
line), `| 23 | 400 | -0.8` (`I care about:`). Nothing in the three repairs touched it: the record
picks the same `svg 1380 × 1403` at `documentTop 164`, `nearTheTop: true`, and its ground, its one
cluster and its accent all read exactly as they did.

**Reason one — `display` is unmeasured, and this pass checked it properly rather than restating it.**
`graphic.png` plainly carries the title *Which Fish are Okay to Eat?* across the top of the picture,
so the claim needed testing, not repeating. The record's twenty-four type keys were enumerated and
their samples listed in full; there is no run for the title, and the largest Quicksand run inside the
graphic is the `32 | 700 | -0.4` of the class name `NO`. Why the title is unread is not something the
record can settle — outlined lettering is the likeliest explanation and the record does not say so —
but what it does settle is that **no route measured it**, so a `display` row taken from this
reference would be invented rather than read. That is `METHOD.md` correction 6 exactly.

**Reason two — `ground` would be a choice, not a measurement.** The pixel route ranks the three band
grounds `#BCE3F9` at 32.573 %, `#D4ECFB` at 22.395 % and `#E1F2FC` at 20.993 %, with `#FFFFFF` at
12.501 % for the column gutters. The style route declares all three as one `rect` each
(`rgb(188,227,249)`, `rgb(212,236,251)`, `rgb(225,242,252)`). Looking at the picture settles what the
numbers only suggest: the three are **the encoding**, one pale blue per class, palest at `YES` and
deepest at `NO`. A `ground` field would have to pick one of the three, and picking the largest would
name the `NO` band's blue as the paper the piece is drawn on, which is the opposite of true.

It is named here again so a later wave knows this reference is closer to a direction than the other
three IIB rasters — and knows precisely which two fields it would have to invent to get there.

The five Ferdio records fail on type in the same way — `tag: "img"`, 823 × 823 — and would in any
case be one house style, which `§6.1` of the spec already says carries little direction value.

## 7. What could NOT be filed, and why

Five real practices, each seen once. A refusal recorded is worth more than a lever stretched.
**Every refusal below survives both repair passes**; two of them are now better documented, which
changes nothing about the floor.

| practice | seen on | why it is not filed |
| --- | --- | --- |
| **Annotate a REGION of the grid, not a cell** — bracket a block with a dashed rectangle and name it in prose, keeping a second, smaller callout scale for single cells | `informationisbeautiful-net-visualizations-most-common-pin-codes` | **one publication.** This is the treatment this family most obviously needs — a heatmap's finding is a shape far more often than a cell, and no filed treatment can draw a shape. It waits for a second desk. |
| **Draw half a symmetric matrix** — where the cell function is `f(a,b) = −f(b,a)`, only the lower triangle carries anything, and each cell shows the winner's mark over the margin (`+11`, `+2`) | `100-datavizproject-com-data-type-viz96` | **one publication** (Ferdio). `viz77` is the same desk and does not count — correction 4. |
| **Every cell carries its qualification in a smaller second register** — species name at `Quicksand \| 14 \| 500` (95 runs) over the condition at `Quicksand \| 10 \| 500` (106 runs): `(NORTH SEA OTTER TRAWLED, SEINE NETTED)` | `informationisbeautiful-net-visualizations-which-fish-best-safest-healt` | **one publication.** `informationisbeautiful-net-visualizations-billions-2` in the line family does the same thing and is the same desk. |
| **Encode an ordinal class twice** — band ground AND mark colour | `which-fish`, `tooth-law` | **one publication**, both Information is Beautiful. |
| **The quiet end of a ramp must still be visible as a cell** | — | **no precedent at all, only violations.** `viz49` puts white at the low end of a `#FFFFFF` graphic; *Pin Point* puts `#242423` at the low end of a `#000000` one. I believe the rule; the corpus contains two counter-examples and zero supports, so it is not a treatment, and §2.3 was narrowed to the half that IS evidenced. |

**What the repair added to two of those refusals, without moving them.** *Pin Point*'s region
annotations are **three**, not the two previously recorded — `using same two pairs of numbers` across
the top, `Those using their birth date in DD/MM or MM/DD formats` down the left, and `People using
their birth year (19xx)` along the bottom — with four cell-scale leader labels (`7410`, `4321`,
`2580`, `1234`) kept at a visibly smaller scale, and a fifth apparatus the old fold hid entirely: a
`most common` / `least common` PIN list beneath the matrix and a two-swatch `27 % of all PIN
numbers` callout. And the double-encoding practice is now measured on both sides rather than read by
eye — `which-fish` declares three band grounds one rect each (`rgb(225,242,252)`,
`rgb(212,236,251)`, `rgb(188,227,249)`, ranked 21.0 / 22.4 / 32.6 % by the pixel route) while its
marks step `rgb(60,60,59)` → `rgb(157,157,156)` → `rgb(242,129,102)`. Better evidence, same desk,
same refusal.

**One more, filed as a treatment but flagged:** `subject-colour-is-the-encoding` — where the value
being shown is itself a colour or carries one a reader already holds, paint the cell in it and
delete the legend. `informationisbeautiful-net-visualizations-colours-in-cultures` and
`didoesdigital-com-growing-seasonality` are two publications and it would pass the floor.
**It is NOT proposed for filing** because `skills/palette/references/subject-conventions.md` already
owns this claim, rests it on Lin et al. (EuroVis 2013) rather than on two records, and deliberately
caps its table at four entries with a stated bar. Filing a treatment that restates it would put a
second, weaker authority beside a stronger one.

**The repair turned the first of those two references from an assertion into a measurement**, and
that is what it now offers that file. `colours-in-cultures` measures, on `graphic.png`: a warm-grey
ground `#CBCAC3` at 81.535 %, palette shape `categorical`, and eight hues that ARE the
data — `#E20613` red, `#FFE500` yellow, `#33AA52` green, `#4980C0` blue, `#A777B1` purple,
`#F29101` orange, `#ED7BA2` pink, `#A9713D` brown — across five hue clusters.

**One correction to the previous pass, made by looking rather than by reading the list.** This file
gave `#1D1D1B` (0.894 %) as that poster's *ink*. It is not. Every word on the poster — the title, the
A–J and 1–84 index, the spoke numbers, the legend labels, the source line — is set in **white**, and
`#1D1D1B` is the near-black that is one of the eight encoded classes, the black cells in the ring.
The white type shares `#FEFEFE` (1.148 %) with the white *class*, which is the same collision from
the other end. On a poster whose subject is colour, no neutral in the record can be assumed to be
furniture, and this one was.

Beside it,
`didoesdigital` groups its produce under `GREEN` / `PURPLE` / `YELLOW` / `RED` / `ORANGE` / `BROWN` /
`WHITE`, each chip in its group's own colour. And `colours-in-cultures` carries the qualification the
paper's example does not: **a key survives for exactly the classes the swatch cannot name** —
`Yellow / Gold`, `Grey / Silver` — and for nothing else. That pair of instances, and that
qualification, belong in `subject-conventions.md`'s evidence rather than in a new treatment.
**Parent's call.**

**And one derivation this harvest could not make.** Every rule in §2 wants to be `derived` rather
than `imported` — the ramp's orientation follows from the beat's own ground, which `PALETTE.md`
already carries. `derived` is unreachable here: the guard requires `provenBy` pointing at a render,
this repository has no heatmap beat to render, and the boundary on this harvest forbids writing one.
All three are filed `imported` and all three found their two publications, so nothing is lost — but
if a heatmap beat is ever built, §2.3 in particular should be reconsidered as `derived`.

## 8. What the method itself got wrong

### 8.1 One blue, measured three times, wrong twice — closed by corrections 13 and 14 and by the masthead repair

**This section is kept as a closed record, because the numbers it produced are the cleanest
statement of the defect this family can offer.** It described, from the inside, exactly what
correction 13 then named: on all five `100.datavizproject.com` records
`routes.pixel.measuredFrom` was `screenshot.png`, the style route's `graphic` field read
`{"tag":"svg","x":80,"y":0,"w":280,"h":80}` on every one of them — `logo-100.svg`, the wordmark in
the header bar — and the top chromatic entry on every record was `#3274DA` at **8.6 – 10.5 %**,
which is Ferdio's 1440 × 80 blue navigation bar as a fraction of a 1440 × 900 shot.

**What the first repair produced.** All five records now pick
`{"tag":"img","x":308,"y":172,"w":823,"h":823}` — the visualisation, which is neither an inline SVG
nor a `<figure> img`, and which the old `svg, canvas, figure img, picture img` selector could not
see. Measured on it, the same blue read `#3274D9` at **0.66 % (viz77), 0.88 % (viz100), 1.42 %
(viz96), 1.94 % (viz35), 3.02 % (viz49)**. The blue was always in the chart too — that is what made
the contaminated number so convincing — but at roughly a tenth of the share the record was
reporting. The gap between 8.6 – 10.5 % and 0.66 – 3.02 % was the navigation bar as a fraction of
the page.

**And the second repair proved that even those numbers were the navigation bar.** Correcting WHICH
element is photographed does not stop a `position: fixed` element being painted over the photograph.
The nav followed the clip: 2 472 px of `rgb(50, 116, 218)` — 0.3645 % of an 824 × 823 shot —
survived into all five "corrected" records, identically, and this file printed it as the charts' own
blue. Hidden for the length of the photograph, the blue is `#3274D8` at **0.292 % (viz77), 0.516 %
(viz100), 1.059 % (viz96), 1.580 % (viz35), 2.651 % (viz49)** — and `#3274DA` on `viz35`, the only
record whose blue survives as pure enough to hold that hex on its own.

**Three measurements of one colour, in one week: 8.6 – 10.5 %, then 0.66 – 3.02 %, now
0.292 – 2.651 %.** Each intermediate figure looked like a measurement and was quoted downstream.
`two-records-that-agree-exactly-are-both-wrong` caught the first, because there the five records
agreed to five decimals. **It could not have caught the second**, and that is the part worth
keeping: after repair 1 the five shares were 0.66 / 0.88 / 1.42 / 1.94 / 3.02 %, all different, so
nothing agreed with anything. The contaminant was a constant ADDEND, not a constant value, and no
guard in the corpus looks for a constant difference. What found it was the shape of the arithmetic —
five deltas all within half a hundredth of the 0.3645 % a 2 472 px overlay occupies — and that shape
only exists once there is a before and an after to subtract. **A corpus that overwrites its records in place cannot
run that check on itself.**

The three Information is Beautiful posters, which the same section reported as `graphic: null` with
a full-width yellow-to-pink promotional banner inside their page shot, now pick their poster
directly at 1280 px wide. Correction 14's rule — a class-name match counts only while the thing it
matched is smaller than half the document — is what let them through.

**What remains open, and is not this harvest's to fix.** This section named
`references/line/100-datavizproject-com-data-type-viz1` and `…-viz57` as carrying the same defect.
Those are the line family's records and were outside this run's boundary then and now; the parent
should confirm they were re-harvested **after the masthead repair, not only after correction 13** —
they sit on the same site behind the same fixed nav, so any blue share quoted for them from the
first re-harvest is 0.3645 points too high. Inside this family, the eleven
`NOTES.md` still describe the pre-repair measurements in prose (§0, last subsection) and have not
been rewritten.

### 8.2 The consent word list is anchored, so it misses every compound label

`CONSENT_WORDS` matches the WHOLE label (`^…$`). `zeit.de` answers with **"Zustimmen und weiter"**;
`zustimmen` is in the list and the label is not, so the dialog stood through both zeit.de
candidates and both were lost. A leading-anchor or contains-match on the same short word list would
have taken them. (`hs.fi` presented a button labelled exactly `OK`, which IS in the list, and its
dialog was still standing at capture — that one is unexplained and worth a look.)

Unaffected by the repair: all eleven surviving records report `consent: null` and `entry: null`, so
nothing in this family was read through a dismissed dialog or a clicked entry screen.

### 8.3 Correction 12's entry-screen opener cannot see an unlabelled control

`ENTRY_WORDS` matches a control's text. Both ESPN longform pieces open on a title card whose only
control is an **icon button with no text at all** — a blue square, a chevron. This is the same class
as `kashmir-documentary`, which correction 12 left unreached, and it is now two more. A page that is
a single viewport tall, has a title and a byline and exactly one control below them, is an entry
screen whether or not the control says so.

### 8.4 A keyword filter cannot find this family in the url list, and now there is a number for it

Correction 2 says a keyword filter selects a SUBJECT, never a FORM. This family measured the size of
that: **`heatmap|matrix` matches exactly one url in 3 827**, and it is a linear-algebra explainer.
Drawing instead by subject *shape* — a value over two categorical axes: state × year, player × team,
food × rule, day × month — returned **2 usable out of 25**. The two form-indexed archives returned
9 out of 18.

**The recommendation for the next family is blunt: draw the url list last and small.** Its yield
here was 8 %, against 44 % for Information is Beautiful and 56 % for Ferdio, and it consumed more
than half the wall-clock of the harvest.

### 8.5 Bot checks and CDN blocks are now a third of the url-list failures

Of 25 url-list candidates: Cloudflare "Vérification de sécurité" on `axios.com` and `science.org`,
a Vercel security checkpoint on `startribune.com`, two CloudFront `403`s on `publico.pt`, a
subscription wall on `smh.com.au` and another on `apps.bostonglobe.com`, and undismissed consent
dialogs on `zeit.de` ×2 and `hs.fi`. **Ten of twenty-five were walls rather than bad choices**, and
an eleventh — the Guardian's COP26 piece — was read through a privacy dialog covering the lower
third of the capture. None was retried through Firecrawl, because in no case was there evidence the
piece behind the wall was a matrix, and spending credits on a guess is the wrong use of the route.

### 8.6 What worked

Correction 3's remedy — re-harvest a capture the eye disagrees with — cleared the newsletter modal
across *Which Fish are Okay to Eat?* on the first retry, and the second capture is the record.

### 8.7 What the repair teaches this family, in one line

The contaminated records did not look wrong. Eight of eleven reported `style ok, pixel ok`, carried
grounds and shares to five decimals, and produced an eleven-stop sequential ramp coherent enough
that it read as the strongest single measurement in the file. It was sampled off the right object by
the wrong method, on a page shot the record had already declared it was measuring — and the
declaration was in the record the whole time, in `routes.pixel.measuredFrom`. **The field that would
have caught it was present and was not read.** Any downstream consumer of this corpus should treat
`measuredFrom` as a precondition rather than as metadata, and no colour claim in this file is made
without it.

### 8.8 And what the second pass teaches, which is the harder half

`measuredFrom: "graphic.png"` was true of all five Ferdio records on the previous pass, and all five
were still measuring a navigation bar. **The precondition §8.7 asks for is necessary and it is not
sufficient**: it says which element was addressed, not what was painted over the photograph at the
moment the shutter opened. A `position: fixed` masthead, a consent dialog, a newsletter modal
(`METHOD.md` correction 3) and a lazy-loading placeholder all defeat it in exactly the same way, and
in every one of those cases both routes report `ok`.

There is no field that would have caught this one, and inventing another flag is the wrong lesson.
What caught it was a person opening `graphic.png` and a sibling agent noticing 2 472 identical pixels
in every clip from one host. That is step 3 of the runbook, and step 3 has now caught the same class
of defect four times: the hero photograph, the newsletter modal, the wordmark, the masthead.
**The step that cannot be automated is the only one with a perfect record.**
