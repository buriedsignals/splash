---
format: web
type: pictogram
---

# Beat — Seize pays sur quarante sont au-dessus de 75 % bas-carbone, et ils ne font qu'un tiers de l'électricité (web)

**Type:** pictogram (isotype). **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Of the **40** European countries that report 2024 generation, **16 are above 75 %** low-carbon,
**18 are below 60 %**, and **6** are in between — the static sibling's own claim, drawn the static
sibling's own way, one square one country. Then the page hands the reader the thing the still had
to choose for them: **what one square is worth.**

Every part is derived in the runner from the frozen file and asserted there before anything is
drawn. The beat refuses to render if the three blocks do not account for every country, if the
middle block is not a minority of the field, or if any of the four units resolves a block to zero
squares.

## The interaction, written before the code

### What this type's own gesture is, and why the eight siblings' gestures are not it

A pictogram is the only type in this catalogue that asks the reader to **count instead of measure**.
A bar has a length you recover off an axis; a square is a thing you point at with your finger. The
price of that is stated on the type sheet in one sentence: *"the unit each icon stands for has to be
stated to the reader explicitly — 'each icon = 1,000 people' — or the count is uninterpretable no
matter how carefully the icons themselves are drawn."* **The unit is not a setting of this chart.
It is the whole argument.** Change it and the same file produces a different headline, a different
winner, and a different answer to the only question the beat asks, which is *how many*.

A still can do exactly one thing about that: pick a unit, print it in the caveat, and ask to be
trusted. **This page is the other answer** — the reader holds the unit, and watches the count change
under a field that never moves.

So the control is `assets/unit.ts`, written for this beat: **what one square stands for.** The
field's grid is fixed — every block keeps its own rows, and no square ever changes place — and what
changes is how many of them are inked, and how far the last one is filled.

| option | squares in all | ≥ 75 % | 60–75 % | < 60 % |
| --- | ---: | ---: | ---: | ---: |
| **un pays** (default, and the static plate) | 40 | **16** (40,0 %) | 6 (15,0 %) | 18 (45,0 %) |
| **100 TWh d'électricité** | 49,85 | 16,52 (33,1 %) | 4,35 (8,7 %) | **28,98 (58,1 %)** |
| **100 TWh bas-carbone** | 30,55 | 15,00 (49,1 %) | 2,91 (9,5 %) | **12,65 (41,4 %)** |
| **100 TWh fossile** | 19,30 | 1,53 (7,9 %) | 1,44 (7,5 %) | **16,33 (84,6 %)** |

Three readings a still of this beat cannot hold at the same time, and they are the reason the
control has four options and not two:

- the sixteen cleanest countries are **40 % of the field and 33 % of the electricity**;
- the eighteen below 60 % make **41,4 % of Europe's low-carbon electricity** — 1 264,8 TWh against
  the sixteen's 1 499,6, or **84 % as much**. The dirty end of the continent is also, in absolute
  terms, nearly half of its clean generation;
- and **84,6 % of its fossil electricity**, which is the same eighteen countries seen from the
  other side.

### The controls

**1. « Un carré, ça vaut quoi au juste ? »**
*Gesture:* toggle a comparison — `unit.ts`, a new vocabulary (see below).
*What changes in the picture:* nothing moves. Every square keeps its seat in its block's grid; ink
runs into the field or drains out of it, and the last inked square of each block is filled to its
own remainder. Each block's figure, in the gutter beside the field it counts, is replaced in place.

**2. « Ce carré-là, c'est qui ? »**
*Gesture:* ask a mark (hover, tap, Tab).
*What changes in the picture:* the square itself darkens from its own fill by a sought dose, and
answers with **a different kind of reading in every option**, which is the half of the gesture a
tooltip on a still could never have. Under « un pays » a square is a country and answers with its
name, its share, its generation and its rank. Under a terawatt-hour unit a square is no longer
anybody: it is the k-th hundred terawatt-hours of its block, and it answers with **which countries
fill it** — one, or two with the hand-over between them. That is how a reader finds out that
France alone fills 5,33 of the ≥ 75 % block's 15,00 low-carbon squares, and that Russia alone fills
12,09 of the < 60 % block's 28,98 electricity squares.

### The fraction, which is this type's second trap and this page's own subject

The static sibling refused the terawatt-hour unit in one sentence, and it was right to: *"A square
standing for 10.4 TWh would be a length in disguise, and the fractional last square would be the
tell."* **This page keeps the refusal and draws the tell.** The default option — the picture a
reader with no script never leaves — is the static plate exactly: one square, one country, and not
a part-square anywhere on the page. Every other unit ends each of its three blocks on a partial
square, and that is not a blemish to be tidied away: it is the page saying in its own ink that it
has stopped counting things and started measuring a quantity.

The remainders are measured, not hoped for. The smallest on this data is **0,331 of a square**,
under « 100 TWh fossile » in the < 60 % block — **11,3 user units of ink** out of the glyph's 34,
which is why it is visible at all. `unit.ts` refuses a remainder thinner than a declared sliver
rather than letting it round silently to nothing, which is the failure the type sheet calls *"a
correctness failure indistinguishable, on the page, from data simply being missing."*

And it is clipped at the **glyph's own ink**, never at the cell. The cell's pitch is 40 units and
the glyph's ink is 34 of them, so a remainder clipped on the pitch — the obvious way to write it —
would put the first 15 % of every fraction inside the gap where nothing is drawn, and any remainder
under 0,15 would vanish with no visual trace. Stated as an arithmetic in the vocabulary, refused
there, and mutated.

### What is deliberately NOT shipped, and the measurement behind each refusal

- **A ghost square for every empty cell in the grid.** The grid is sized by the largest option
  (17, 6 and 29 cells), so under « 100 TWh fossile » the ≥ 75 % block would show 1,5 inked squares
  against 15,5 ghosts. Refused: a ghost is a denominator, and there is no denominator here — the
  three blocks' capacities are a fact about the *widest* unit, not about the data. Empty cells draw
  ink of width zero and say nothing.
- **The static sibling's per-country colour ramp.** On that plate every square is shaded by its own
  country's share, which is a real second reading. It cannot survive this control: under a
  terawatt-hour unit a square is not a country and has no share to be shaded by, so the ramp would
  either lie or have to disappear when an option is chosen — and a plate that repaints itself under
  a control the reader pressed for a different reason is the owner's first arbitrage exactly.
  Colour here belongs to the BLOCK, which is true in all four options. `PALETTE.md` carries the
  measurement.
- **A fifth option at a finer unit (1 icon = 10 TWh).** Refused on the type sheet's own rule: it
  resolves to 498,5 squares, which is not a field anybody counts. `unit.ts` refuses a count past a
  declared ceiling for that reason, and the ceiling is what the grid can hold.
- **A running total under the pointer.** The block figures already print the count; a cumulative
  share on every square would be the same arithmetic in a second place.

## The vocabulary: `unit.ts`, written for this beat

Nine vocabularies already exist and the near misses are close enough to be worth naming.

`weigh.ts` is the closest and it fails on the thing this file is about. A weighing says *what a mark
is WORTH*, and it spends that on the mark's SIZE — `weighRadii` portions one ink budget out over
marks whose count never changes. Here the count is the whole encoding and the size is explicitly
not: the type sheet's own rule is *"icons are all rendered at one shared size across the entire
chart — never scaled per-value, since size is explicitly not the encoding here, count is."* A
vocabulary whose every rule is about how big a mark is cannot express a control whose whole product
is how many there are.

`filter.ts` removes marks; nothing leaves here — the three blocks are all present in all four
options, and it is their LENGTH that changes. `withdraw.ts` subtracts a term from a running sum and
re-lands the rest of a sequence; there is no sequence and no running total. `count.ts` is the one
whose name collides and whose arithmetic is the furthest away: it decides *which of a closed shape's
terms are counted in it*, and its product is a polygon's vertices. `level.ts` lays a reference
across a plot that stays; `fold.ts` lays one half over the other; `brush.ts` picks a span of an axis;
`stack.ts` and `hold.ts` are per-member displacements and affines; `aim.ts` re-points a
displacement; `datum.ts` moves the zero every mark is measured FROM, which is the closest in spirit
— somebody's editorial choice handed to the reader — and the furthest in arithmetic, since a datum
is a subtraction that changes every mark's sign and this is a division that changes how many marks
there are.

So `unit.ts` says **what one icon stands for**: a quantity, a unit per icon, and the field of whole
icons plus one partial that the pair resolves to.

Its own refusals, each one a thing a unit change can get wrong:

- **an undeclared unit** — the sheet's own number-one failure, made mechanical: every option states
  what one icon is worth in a `per` field, and that string must appear in the option's visible label
  AND in its accessible name. A pill reading "l'électricité" is refused.
- **a unit that is not a readable number** — the sheet names the readable ones: *"1, 2, 5, and their
  powers of ten"*. Anything else is refused, because a square worth 137 TWh makes the reader do
  arithmetic they cannot do.
- **a remainder that vanishes** — a non-zero fraction whose ink would be thinner than the declared
  sliver.
- **a remainder clipped off the cell instead of the glyph** — the widths a beat says it will draw
  are recomputed here from the counts and refused on a mismatch, and a glyph whose ink equals its
  cell is refused outright, because then the two references coincide and the distinction the sheet
  names cannot be made at all.
- **a block that draws nothing** — an option under which a block resolves to zero icons. The sheet:
  it *"must never simply vanish from the chart as if the category had no data at all."*
- **a field that overflows its own grid**, and **a count past the ceiling a reader can count.**
- **an option that is the default under a second name** — every block's count equal to the
  default's — and **two options that draw the same field.**
- **an option with no sentence, no figure per block, or an accessible name that does not contain the
  visible one** (WCAG 2.5.3, checked rather than hoped for).

The mechanism is the shared one and nothing else: native `input[type=radio]` in a real `<fieldset>`,
plus CSS generated at build time (`:has()` + `:checked`). No script, no listener. With JavaScript
off the reader gets the complete default field **and a working control**.

It emits `chart-stack-…` ids, `data-stack-note` and `data-stack-total`, which is the format's
**discovery contract** rather than a copy-paste slip — `aim.ts` and `hold.ts` make the same choice
for the same reason, and `interaction-plan.ts` and `verify-web.mjs` are both keyed on exactly those
three spellings.

## Why the ink can be interpolated here, and how

The owner's fourth arbitrage: a state change lerps rather than jumps, and `display` does not
transition — what transitions is a property on an element that is **always rendered**.

This beat can honour it completely, and the reason is the design decision above: **no square ever
moves.** The inked rectangle of every cell is drawn ONCE, in a single always-rendered layer, and
each option sets its `width` — an SVG geometry property, and a real CSS property in every engine
this format targets. Ink runs into the field and drains out of it over 420 ms. Nothing is repainted,
nothing is re-laid-out, and no word travels.

What that costs, and how it is paid: `interaction.mjs` resolves the mark under a pointer from
coordinates read ONCE at init, and a square's *reading* is different in every option — under one it
is Sweden, under another it is the fifth hundred terawatt-hours of its block. So the answering layer
is per-option: each option draws its own `.pt` set and its own transparent copy of that option's
inked rectangles, in its own `<svg class="chart">`, and the stylesheet reveals one. A hidden `<svg>`
has no CTM and no focusable content, so pointer and keyboard only ever reach the option on screen.
The visible ink is not in any of them: it is the shared layer underneath, which is why it can
travel while the readings cut.

## Nothing on this page moves without a reason the reader can see

The owner's first arbitrage, and this composition is built around it rather than excused to it:

- **No square moves, in any state.** The grid is fixed at the widest option's capacity and every
  cell keeps its seat.
- **No text moves.** The three block names sit in the plot's own left gutter, at fixed CSS sizes, in
  a column the geometry never touches. Each block's figure is four spans stacked at one place, and
  the stylesheet reveals one: the digits change, the span does not travel.
- What does move is the ink, under a control whose pills say what one square is worth. That is the
  reason, and it is the picture itself.

## The type sheet's trap, and what it turned out to be here

`types/pictogram.md` names two, and this page is built on both rather than beside them. The first —
**an undeclared unit** — is the control's own legend, and it is enforced at the declaration. The
second — **a fractional remainder clipped at the wrong reference, which silently rounds a real
fraction down to nothing** — is the arithmetic `unit.ts` owns, and its numbers are in "The fraction"
above.

The third thing the sheet says is the one that decided the shape of the whole beat: *"not so fine
that even the biggest category sprawls into dozens of icons."* It is why the unit ladder stops at
100 TWh, and it is why there is no free-running slider here: a slider would let the reader ask for a
field nobody can count, and a pictogram that cannot be counted has given up the only thing it has
over a bar chart.

## Treatments

The arbiter offers ten on this beat's facts once it is told what it actually is — `units: { count:
40, thing: "un pays" }` and `interaction: { readerParameter: true }`, both of which are literally
true here and neither of which the premier jet declared, which is why its brief claimed two
pictogram treatments the arbiter had never offered it.

- `a-quantity-is-made-countable-by-drawing-its-units` — **spent, and it is the reason this beat
  exists.** Forty squares rather than three bars, so a reader counts instead of estimating a length.
  ProPublica's own words for it — *"every subsequent argument is a rearrangement of the same
  units"* — describe this page's control exactly.
- `a-countable-field-is-paired-with-its-own-figure` — **spent, once per block, in the gutter beside
  the field it counts**, and spent in the honest register: *"a field of things is counted in things,
  so its own figure is a count."* The figures read `16,0 carrés`, not `40,0 %`. The percentages are
  in the revealed sentence, where they belong, because that is prose and not a rail.
- `the-default-state-carries-the-whole-reading` — **spent.** The default option is the static
  sibling's plate: 16 / 6 / 18, the title's own claim, nothing partial, nothing revealed. Every
  other option is an addition.
- `the-readers-own-input-is-restated-in-words` — **spent.** Each option's sentence rewrites the
  claim against the unit the reader set, in the beat's own hand and with figures the plate does not
  carry.
- `the-one-interaction-sits-on-the-plate` — **spent.** The `<fieldset>` sits between the caveat and
  the field, not in prose above or below it.
- `accent-marks-the-thread` — **spent.** The accent marks the ≥ 75 % block in every state; no option
  can move it, and there is no "largest value" for it to drift onto.
- `the-state-you-are-in-is-louder-than-the-controls` — **refused, and the refusal is the shared
  chrome.** The selected pill is inverted rather than enlarged, which is the segmented treatment
  every sibling vocabulary copies and which a trunk pass is about to rewrite for all sixteen at
  once. Making this beat's louder on its own would leave it the only one out of step.
- `value-on-the-mark` — **refused.** There are 40 to 51 marks and the value a mark carries is
  different in every option; printed on the plate it would be up to 51 numbers redrawn under a
  control, which is the first arbitrage's own failure case. The pointer carries it instead, and the
  block figures carry the aggregate.
- `the-subject-is-ringed-not-recoloured` — **refused**, for the reason its own text gives: it exists
  *"so it keeps its category"*, and here the category IS the colour. A ring round a square would
  also be the one ring on a plate of squares, which reads as a mark of a different kind.
- `raw-under-smoothed` — **refused.** It applies on the mark count and the noisiness of the share
  series, and there is no smoothed centre on this plate to lay anything under: a pictogram has no
  value axis at all.

## The one line of chrome this beat does not share, and where it is kept

`unitChromeCss` is a byte-for-byte copy of its sibling vocabularies' pill treatment — the selected
pill's `background: var(--ink); color: var(--ground)` included, which is a known defect being fixed
at the trunk and must stay identical so that pass finds all sixteen the same. The overflow this beat
has is not shared, so its fix is not kept in there: the siblings' pills are two or three words
("les habitants", "le CO2") and this control's are the UNIT ITSELF, which is the one string it may
not shorten. Four of them come to 521 px; `flex: 0 0 auto` on the options row cannot shrink, so
`flex-wrap: wrap` never fires, and `verify-web` measured the document at **545 px in a 375 px
window**. One `flex-shrink: 1`, emitted from the component's own stylesheet rather than from inside
the copied block, lets the row wrap onto two lines at its own pills' width — which is also the value
the standing arbitrage about hugging frames names.

## The stretch, measured — this type draws SHAPES, so it is the evidence the trunk pass wants

The format puts `preserveAspectRatio="none"` on the `<svg>` and lets `.chart-plot` give height back
under `max-height: 100dvh`, so a square is only square when the cell it is stretched into happens to
have the viewBox's own ratio. **Every number below is one cell, measured in the browser off
`getBoundingClientRect`, against a viewBox of 824 x 206:**

| window | the `<svg>` in px | scale x | scale y | one square | shape |
| --- | --- | ---: | ---: | --- | --- |
| 1512 x 860 (the owner's own) | 1360 x 339 | 1,6505 | 1,6468 | **56,12 x 55,99** | 1,002x wider |
| 1512 x 620 | 1360 x 333 | 1,6505 | 1,6186 | 56,12 x 55,03 | 1,020x wider |
| 1920 x 800 | 1768 x 434 | 2,1456 | 2,1057 | 72,95 x 71,59 | 1,019x wider |
| 3440 x 900 | 3288 x 632 | 3,9903 | 3,0693 | 135,67 x 104,36 | **1,300x wider** |
| 1280 x 720 | 1128 x 285 | 1,3689 | 1,3858 | 46,54 x 47,12 | 0,988x (taller) |
| 768 x 1024 | 616 x 167 | 0,7476 | 0,8098 | 25,42 x 27,53 | 0,923x (taller) |
| 375 x 812 | 223 x 120 | 0,2706 | 0,5825 | **9,20 x 19,81** | **0,464x — 2,15x TALLER** |

Three things in that table are worth the trunk pass's attention, and none of them is fixed here:

1. **At the window the defect was reported on, this beat's squares are square to 0,23 %.** The
   connected scatter measured 1,41x horizontal at 1512 x 860; this beat measures 1,002x at the same
   window. The difference is not the `preserveAspectRatio` — both carry it — it is that this beat's
   declared ratio (4,31:1) leaves the figure at 626 px in an 860 px window, so the height clamp
   never fires. **The distortion is a function of the gap between the beat's own aspect ratio and
   the box the window leaves it**, which means a fix keyed only on "wide short window" would find
   nothing here and still be needed.
2. **The worst case is the phone, and it runs the other way.** At 375 x 812 the plot's own
   `min-height: 120px` FLOOR pins the height while the width collapses to 223 px, so a square comes
   out 9,20 x 19,81 px — 2,15 times taller than wide, a larger absolute distortion than any wide
   case in the table, and one the height clamp cannot help with because the floor is a minimum.
3. **The y-gutter is a second, independent source and it is the one that dominates at small
   widths.** `.chart-plot` is `grid-template-columns: var(--y-gutter) 1fr`, so the drawing gets the
   plot's width minus a FIXED number of CSS pixels while the plot's declared `aspect-ratio` is in
   geometry units. The gutter is 7,1 % of the plot at 1512 px and **31,8 %** at 375 px. This beat
   declares its ratio as `(824 + 65) / 206`, counting the gutter as 65 user units, which is exact at
   one plot width and drifts either side of it. That is the format's documented gutter drift, and on
   a type whose mark is a SHAPE it is not absorbable.

A local counter-scale was not built, deliberately — and note that the premier jet of this beat DID
build one, switching the `<svg>` to `preserveAspectRatio="xMidYMid meet"`. That is removed: it
letterboxes the drawing inside its cell, which is a different picture from the one every sibling
ships, and the trunk fix should not have to undo sixteen local escapes.

## Verification

- `verify-web.mjs`: **creme 89 passed / 0 failed / 7 skipped, nocturne 89 / 0 / 7, rapport
  89 / 0 / 7.** The skipped are the filter checks, the filter control's own affordance and the
  "pointing THROUGH the overlay" pair — this beat has no filter and draws no HTML label over its
  plot, both of which are its own shape rather than an omission.
- Driven in a real browser at 1512 x 860, every pill clicked, **with the script on and with it off**,
  in all three directions. The two runs are byte-identical in every reading, which is the whole claim
  the mechanism makes — and the numbers are read back off the rendered `getBBox()` widths rather than
  off the declaration:

  | state | ≥ 75 % | 60–75 % | < 60 % | figures printed | sentence revealed |
  | --- | --- | --- | --- | --- | --- |
  | un pays | 16 whole, no part | 6 whole, no part | 18 whole, no part | 16,0 / 6,0 / 18,0 carrés | none — it is the claim |
  | 100 TWh d'électricité | 16 + 0,522 | 4 + 0,348 | 28 + 0,979 | 16,5 / 4,3 / 29,0 carrés | 58,1 % of the electricity |
  | 100 TWh bas-carbone | 14 + 0,996 | 2 + 0,910 | 12 + 0,648 | 15,0 / 2,9 / 12,6 carrés | 41,4 % of the low-carbon |
  | 100 TWh fossile | 1 + 0,527 | 1 + 0,438 | 16 + 0,331 | 1,5 / 1,4 / 16,3 carrés | 84,6 % of the fossil |

  Each state reveals exactly one figure per block and exactly one sentence, and exactly one answering
  layer is displayed — 40, 51, 31 and 21 focusable squares respectively, which is `ceil` of each
  option's own counts and nothing else.
- **The transition was caught mid-flight rather than asserted.** A no-script run that read the
  widths back 120 ms after the click found the ≥ 75 % block at 0,189 of a square where the settled
  value is 0,522, and the < 60 % block at 18 whole where the settled value is 28 — i.e. the ink was
  measurably in motion between two states on a page with no JavaScript running at all. Re-read at
  600 ms, every number is the settled one.
- Hover exercised in all three directions on France's own square: the square itself takes the sought
  colour off its own fill (nocturne `#53e1c1` to `#87ead4`), **no dot is drawn on top of it** — the
  `.pt` is `data-mark-ref` and the format keeps it transparent — no neighbouring square moves, and
  the answer is `France · 94,9 % de son électricité est bas-carbone · 561,8 TWh produits, dont
  533,1 bas-carbone · rang 7 sur 40`. Under a terawatt-hour unit the same square answers with a
  different KIND of reading: which countries fill it, and the fraction each puts in.
- `bun test skills/chart-web/test skills/splash/test/web-interaction-changes-the-picture.test.ts
  skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/filter-vocabulary-parity.test.ts`
  — **410 pass, 1 fail**, the one being `chart-web — the canon's assets … preview.png is a current
  render of the seed`, a stale committed render of a seed this beat does not touch and which the
  connected-scatter beat records failing in the same words. And
  `bun test skills/splash/test/{a-directed-plate-names-no-colour-of-its-own,a-directed-layout-types-no-leading,a-leading-is-read-only-through-the-register,filters-are-declared-or-absent,number-format-honest,notes}.test.ts`
  — **310 pass, 0 fail**.
- `grep -n lineHeight` over the component returns nothing: this beat is not on `KNOWN-STATE.md`'s
  list of ten and does not join it. Checked rather than assumed.

### What the three renders actually look like

- **creme.** The three blocks read as three at a glance, and the five-gap makes the sixteen
  countable without moving the eye back. The middle block's tone is a real third step and it is the
  closest pair on the plate (1,422:1) — visible, and the honest ceiling of a three-step ramp.
- **nocturne.** The strongest of the three: the field is a teal band on a dark navy ground and the
  neutral block reads as clearly out of the argument. The `annot` register sets the control's
  sentence in letterspaced caps, which runs to two lines on the longest of the three notes.
- **rapport.** Tightest type, and the one where the partial squares read most clearly as partial —
  the 12,6 block ends on a two-thirds square nobody could mistake for a whole one.
- **The one honest blemish, named rather than hidden.** Under « 100 TWh bas-carbone » the ≥ 75 %
  block's remainder is **0,996 of a square**, which is drawn as a square 33,9 units wide against a
  whole one's 34. A reader counting by eye counts fifteen and is right to: the gutter figure says
  15,0. It is a true number that happens to look like a whole one, and it is the opposite failure
  from the one `unit.ts` refuses — where that one hides a fraction that exists, this one shows a
  fraction nobody can see. No guard can tell them apart, so it is written down instead.
- **The answer box sits over the control at the first block's row**, because the format anchors it
  above the mark it names and this beat's first block is the row under the pills. That is the
  format's own anchoring, unchanged here.

### Mutations

1. **The hover step made to walk toward the GROUND instead of the ink.** Refused in all three
   directions, naming the measured value — 1,627:1 on creme, 1,617:1 on rapport, 2,032:1 on
   nocturne — the runner exits 1, and all three stale renders come off the disk. This guard did not
   exist until this beat went looking for a defect in the sibling idiom and found an ASSUMPTION
   instead: "darken" is only right because `deriveFurniture` hands `nocturne` an ink of `#FFFFFF`,
   and the first measurement said otherwise because it read the ink off the direction FILE rather
   than off the derived prop. The sibling rule is correct on all three filed directions. What it
   was missing is a check that it stays correct, and that is now there.
2. **`unitCss` dropped from the beat's stylesheet** — the hole `descend.ts` records and `aim.ts` paid
   for a second time. Refused in all three: *"every cell would keep whatever width its attribute gave
   it, in every state at once."* Without the guard the page ships a field in which every square is
   drawn at zero width, every attribute perfectly correct.
3. **The default field's widths emitted BEFORE the blanket that zeroes them.** Refused in all three.
   Two attribute selectors score identically, so source order is the entire mechanism, and the swap
   ships a field with nothing in it in every state.
4. **The sliver raised to 12 units, one notch above the thinnest remainder the data produces
   (11,27).** Refused, naming the block and the arithmetic: *"'100 TWh d'électricité' in block 'mid'
   leaves a remainder of 0.3480 of an icon, which is 11.83 units of ink against a sliver of 12."*
5. **A square made worth 137 TWh.** Refused: *"The readable units are 1, 2, 5 and their powers of
   ten."*
6. **The partial clipped on the CELL'S PITCH instead of the glyph's own ink — AND THIS ONE WENT
   GREEN.** Five characters changed in `unitInkWidths`; `assertUnitDeclaration` silent, `renderWeb`
   silent, `assertOneUnit` silent, and all 89 of `verify-web`'s checks passing in three directions.
   What shipped was the last square of each block drawn 7,26 units wide where its value says 11,27,
   and — this is the part with no visual trace at all — **any remainder under 0,150 of a square
   drawn as nothing whatsoever**, which is the type sheet's own *"correctness failure
   indistinguishable, on the page, from data simply being missing."* The cause is this family's
   recorded one arriving at a sixteenth vocabulary: there were TWO derivations of one arithmetic on
   the page, this file's (which the stylesheet emits) and the beat's (which the answering layers
   carry), and nothing compared them. `assertUnitDeclaration` now takes the ink the beat says it
   will draw and refuses a disagreement. Re-run, the mutation is refused in all three directions,
   naming both numbers, and the runner exits 1.
7. **A pill that drops the unit it stands for** ("le fossile"). Refused: *"stands for '100 TWh
   fossile' and does not say so on its own pill"* — the type sheet's number-one failure, made
   mechanical.
8. **An accessible name that no longer contains its visible label.** Refused as the WCAG 2.5.3
   failure.
9. **The declared plan made to name a gesture the format has no word for** ("change-the-unit").
   Refused by `assertInteractionPlan` with the repertoire quoted back, which is also the proof that
   the plan this beat wrote before the code is read at render time rather than filed and forgotten.
   The gesture this control really is remains `toggle-a-comparison`: the unit is what is being
   toggled, and the format's own word for that is the one on the list.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2024.
`data.csv` is a byte-for-byte copy of `proof/static-pictogram-europe-lowcarbon/data.csv`. Low-carbon
is the sum of the file's own six low-carbon columns; fossil is the sum of its three fossil columns;
a country's share is the first over the two. Ukraine reports no 2024 generation and is not drawn —
a unit grid counts things, and a square for a country with no reading would be counted.
