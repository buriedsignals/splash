---
format: web
type: stacked-bar
medium: chart
grounding: supported
---

# Beat — L'Espagne a ajouté plus d'électricité bas-carbone que la France depuis 2000 (web)

**Type:** stacked bar. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

**Spain added +118,9 TWh of low-carbon electricity between 2000 and 2024 against France's +50,1,
having started five times lower (96,7 against 483,0 TWh). France is still the largest producer, at
533,1 TWh.** Four things asserted in the runner before anything is drawn: that the largest adder is
*not* the largest producer, that it added more, that the leader started several times higher, and
that the leader still holds the largest total.

## The interaction, written before the code

### The reader's question, and the property of a stacked bar that provokes it

*« L'Espagne a ajouté 119 TWh — mais de quoi ? Et qui d'autre en a construit autant ? »*

A stacked bar hands the reader exactly **one** comparison for free, and it is not a matter of taste:
only the bottom segment is measured from a common baseline. Every segment above it starts at that
row's own partial sum, so its two ends are two numbers the reader cannot separate by eye — a band
that ends further right may be the shorter one. The totals are honest and every internal comparison
is not, and that is the type's whole structural weakness. `types/stacked-bar.md` says so in the
strongest terms it has: *"Precise comparison of an INNER segment across columns is exactly what this
type can't give you."*

This plate stacks the sixteen countries' 2024 low-carbon electricity by **source**, in a fixed order
— nucléaire, hydraulique, éolien, solaire, « biomasse et autres ». So the question the
headline provokes is the question the drawing structurally cannot answer. Spain's +118,9 TWh is
almost entirely solar and wind (58,3 and 62,2, against 0,01 and 4,7 in 2000: **115,7 of the 118,9**).
Both of those bands float. Measured on this beat's own frozen file, on the axis the plate actually
draws:

| the band | the longest in Europe | where it ENDS on the axis | the band that ends furthest right |
| --- | --- | ---: | --- |
| nucléaire | France, 380,4 | 380 | France — it *is* the baseline band |
| hydraulique | France, 71,1 | 452 | France, 452 |
| éolien | Allemagne, **141,6** | **165** | France, **497** (45,4 TWh) |
| solaire | Allemagne, **74,1** | **240** | France, **522** (24,9 TWh) |
| biomasse et autres | Allemagne, **51,3** | **291** | France, **533** (11,3 TWh) |

France's nuclear base pushes every one of her bands to the far right of the plate whatever their
size. A reader scanning right edges — the only thing a stack lets an eye do accurately above the
baseline — ranks France first on wind, first on solar and first on biomass, when she is fourth on all
three.

### The gesture: **`rebase.ts` — one band is given the baseline the stack could not give it**

The reader picks a source. Under every bar, in a slim lane of its own, a **rail** grows from the
plate's own zero to that country's band for that source, at the plate's own scale, against the plate's
own graduations. **Nothing in the stack moves.** No bar, no segment, no tick, no word: the sixteen
stacks stay exactly as they were drawn, so the one comparison the type gives honestly — the totals,
and the additions the headline is about — is never taken away to buy the other one. The reader gets
both at once, in the same row: *where the band sits* (composition, which the stack says well) and
*how long it is* (magnitude, which the stack cannot say at all).

| option | the rail carries | the worst misread the stack commits |
| --- | --- | --- |
| **l'empilement seul** *(default, the plate)* | nothing — every rail is zero wide | — |
| **l'hydraulique** | each row's hydro, from zero | Autriche 45,7 ends at 46 · Espagne 34,4 ends at 89 — **19** of 120 pairs ranked backwards |
| **l'éolien** | each row's wind, from zero | Royaume-Uni 83,3 ends at 130 · France 45,4 ends at 497 — **28** of 120 |
| **le solaire** | each row's solar, from zero | Italie 36,0 ends at 111 · France 24,9 ends at 522 — **33** of 120 |
| **la biomasse et les autres** | each row's bioenergy plus other renewables, from zero | Italie 22,9 ends at 134 · France 11,3 ends at 533 — **25** of 120 |

The "pairs ranked backwards" figure is the reading, and it is derived rather than asserted by
adjective: of the 120 ordered pairs of countries, that many have the longer band ending further LEFT
than the shorter one. It is computed once, in `rebaseInversions`, and read by the refusal and by the
sentence alike — one function, two readers, because the last time this repository derived one
identity twice a whole map emptied with nothing red.

### The option that was designed and REFUSED — by the vocabulary, on real data

**« le nucléaire ».** Refused by `assertRebaseDeclaration`, with **0 inversions of 120**. Nuclear is
the band on the baseline, so its right edge *is* its length and the stack already ranks it exactly
right. A rail under it would draw a second copy of a line the reader can already measure. This is
not a near miss that happened to fail — it is the type's own structure coming back out of the data,
and it is the refusal this vocabulary exists to make: **a band the stack already ranks correctly
needs no baseline.** It is still named in the runner rather than quietly absent, so a future data
update puts it back through the refusal instead of through nobody's memory.

### Six bands became five, and the ramp is why

The first form of this beat drew all six of the file's low-carbon columns. The colour ramp measured
it and the type sheet had already said it. On `creme`, the six steps of the linear ramp stood
**1,400 · 1,415 · 1,079 · 1,015 · 1,016** apart: the top three bands were the same colour to any eye,
because three independent clamps against the same floor against the same ground land on the same
value BY CONSTRUCTION — a defect this branch has written down twice already. `types/stacked-bar.md`
carries the same finding as a hard limit (`limit: series > 5`): past roughly five series a stack
*"turns into an unreadable ribbon — group the smallest into 'Other' rather than adding a sixth
colour"*. So bioenergy and the file's own "other renewables" column — whose largest value anywhere is
Italy's 5,67 TWh — are one band, and the ramp is now walked in CONTRAST rather than in mix, with the
separation between neighbours measured and refused under 1,2:1. Shipped: **1,210 – 1,249:1** on the
two light directions, **1,371 – 1,377:1** on `nocturne`. `PALETTE.md` carries the whole table.

The readable floor below is therefore a guard with nothing left to catch on this data — the merged
band's longest rail is Germany's 51,3 TWh. It is verified by mutation rather than by the corpus, and
that is said here rather than left to look like a live refusal.

### Why a still, a video and a scrolly all fall short of it

A still must pick one source and print one rail — and then it is a different chart about a different
claim, because the plate's own subject is the ADDITION and its own honest reading is the total. A
video or a scrolly can walk all four, **on the author's clock, in the author's order, once.** But the
reading here is a back-and-forth: the reader who wants to know whether Spain out-built Germany on
solar and then lost to it on wind has to leave « le solaire », go to « l'éolien » and come back, which
is the one thing a timeline cannot give. And the argument itself is only legible as a return — the
whole point is that the same sixteen bars, untouched, support one ranking when you read their right
edges and a different one when you read the rails, and you can only see that by switching back and
forth while the stack stands still.

### Why it is a stacked bar's gesture and no neighbour's

Every near miss here is a vocabulary that **moves the drawing**, and this one is defined by not
moving it:

- **`floor.ts`** — *what the picture may STAND ON*: the reader lays a band flat to earn it a
  baseline. That is the obvious gesture for this type and it is refused twice over. First it is
  taken: `floor.ts` is the streamgraph's and `proof/webx-electricity-mix` already did it on a
  100 %-stacked column with `stack.ts`. Second, and this is the real reason, **this type's own sheet
  forbids the operation**: `types/stacked-bar.md` requires a stacking order *"IDENTICAL across every
  single column"* and says a reordered stack *"also shifts the position of every segment sitting above
  the swap"*. Laying a band flat in a stacked bar is a reorder. The band would get its baseline by
  destroying the composition and the totals' positions — buying one comparison with the only one the
  type gives honestly.
- **`stack.ts`** — *what may MOVE*: one rigid `{ key, dx, dy }` per member. Nothing here has a `dx`
  or a `dy`. The stack is drawn once and never displaced.
- **`align.ts`** — *what every interval is lined up on*: the gantt's, and the closest in spirit. It
  translates each mark so a chosen origin lands on a shared rule, and it may never change a length.
  It is a translation of the drawn mark; this is a **second mark**, at a length the drawn one already
  has, on a baseline the drawn one cannot reach without giving up its place in the sum.
- **`withdraw.ts`** — *what is TAKEN OUT of a sum*: the waterfall's. Nothing is taken out of anything;
  all six sources are drawn in every state and every total is unchanged.
- **`qualify.ts`** — *WHAT COUNTS as the thing the axis measures*: the dot strip's. Every mark there
  takes a new VALUE. No value changes here — the rail's length is the band's length, checked against
  the segment the component drew.
- **`datum.ts`** moves a diverging zero; this zero never moves, and it is the fact the whole control
  rests on. **`filter.ts`** removes marks; all sixteen rows and all six bands are drawn in every
  state. **`level.ts`** lays a reference across the plot to measure other marks against; a rail is not
  a reference, it is the mark itself drawn a second time. **`benchmark.ts`** hands over a target,
  **`brush.ts`** picks a span OF the axis, **`fold.ts`** lays something OVER what is drawn,
  **`descend.ts`** re-parents a whole, **`cutoff.ts`** sweeps a threshold, **`reorder.ts`**,
  **`follow.ts`**, **`trace.ts`**, **`count.ts`**, **`weigh.ts`**, **`hold.ts`**, **`aim.ts`**,
  **`unit.ts`**, **`carry.ts`**, **`side.ts`** touch order, path, weight, factor, direction or shape.

So: **`rebase.ts` says WHICH BAND IS MEASURED FROM THE COMMON ZERO** — a second mark, at the drawn
band's own length, on the plate's own scale, drawn beside a stack that does not move.

### Its refusals, each one a picture that would lie

- **A rail whose length is not the band's.** The declaration comes from the runner and the drawing
  comes from the component's own `rows` prop; the two are compared segment by segment. A rail that
  disagreed with its band is one quantity drawn at two lengths on one row.
- **A rail that starts anywhere but zero.** Structural: the vocabulary owns one end and generates
  only a width. A rail with its own origin would be the stack again, one lane lower.
- **A source with zero inversions** — the band the stack already ranks correctly. Fires on
  « le nucléaire », which is why the ladder has four rungs and not five.
- **A source whose longest rail is under the readable floor**, in CSS pixels at the narrowest width
  this format is verified at — derived from the cell this beat's own gutters leave at 375, never
  typed as a value in the data's unit.
- **A rail off the rail** — a value outside `[0, axisMax]` is drawn nowhere.
- **A row that loses its rail, or gains one.** Every non-default option seats every drawn row exactly
  once, zeroes included: a country with none of a source has a rail of length zero, which is a
  reading, not an absence.
- **A rung with no sentence, and a default that carries one** — the untouched picture is the claim,
  not a comparison.
- **An accessible name that does not contain its visible label** (WCAG 2.5.3).
- **A vocabulary that emits no rules**, and **the blanket rule emitted after the default's own** —
  both read back off the WRITTEN page by `assertOneRebasing`. The second is `weigh.ts`'s finding,
  inherited rather than re-earned: two attribute selectors score identically, source order is the
  whole mechanism, and the only engine the base pair ever decides anything for is one without
  `:has()`.

The mechanism is the shared one and nothing else: native `input[type=radio]` in a real `<fieldset>`,
plus CSS generated at build time (`:has()` + `:checked`). No script, no listener. With JavaScript off
the reader gets the complete plate **and a working control**.

### Ask a mark — and it is the segment that answers, never a dot on top of it

Hover, tap or Tab any segment. All 72 answer with the source, its TWh in 2024, its share of that
country's low-carbon total, **its rank among the sixteen on that source**, and what it was in 2000.
The rank is the reading the plate cannot draw and the rail cannot print — Spain's solar answers
*2e sur 16*, France's *4e sur 16* — and every one of them is derived in the runner from the frozen
file and baked into the mark server-side; the browser formats nothing.

The segment itself is what lights up, in a colour searched off **its own fill** until a measured
separation is cleared, per tone and per direction. The premier jet shipped an invisible
`circle.pt` over each segment with no `data-mark-ref`, so the format's own stylesheet filled it with
`--muted`: a grey dot floating over the bar, which is the owner's arbitration 2 exactly. Fixed here.

## Treatments spent

- `the-stack-gives-back-the-total-it-hides` — each bar prints its own 2024 total and its addition
  since 2000, in a gutter of its own outside the plot, and the ranking is built on that total.
- `a-segment-not-starting-at-zero-carries-its-own-number` — every segment wide enough prints its TWh
  inside itself; and the control is this treatment carried through to its conclusion, since a number
  inside a band still does not let a reader compare it to the band two rows down. Where the 2000 tick
  crosses such a figure — on five of the sixteen rows — the figure carries a halo in its own band's
  fill, because a chip of ground would punch a hole in the band and a chip of the band's fill would
  break the tick into two pieces a reader reads as a gap.
- **The earlier total is a tick on the bar, not a second bar.** The headline is about the ADDITION,
  and an addition is the distance between a mark and the end of the bar it sits on.
- `value-on-the-mark` — **refused for the rail**, and the owner's first arbitration is the reason. A
  figure welded to a rail's tip would be the only text on the page that moves. The rail is read
  against the graduations the plate already draws, which is the whole of what a common baseline buys.

## The two hard-coded `lineHeight`s, and the lever each one was standing in for

`KNOWN-STATE.md` names this beat twice on its list of ten. Both are gone, and neither was arbitrary:

- **`lineHeight: 1.05` on the sixteen country names**, holding up a `white-space: normal` that let a
  long name wrap in a 92 px gutter typed once. The lever is the GUTTER, and it is now measured —
  `measureText` on the sixteen names, in the axis register `registerOf` resolves, at the weight each
  one will actually be set in (the two named rows at 700). The names are back on one line under the
  shared `.axis-label` rule and the register owns its leading.
- **`lineHeight: 1.1` on the total-and-addition label**, holding up a wrap inside a 200-geometry-unit
  right margin of the plot — which is 329 px on a laptop and 69 px on a phone, so no single number
  could ever be right. The lever is the trunk's own third column: the totals now live in
  `--end-gutter`, outside the plot, measured in CSS pixels in the value register, so their room is
  the same at every viewport. `a-directed-layout-types-no-leading` passes.

## What the three renders show

**`creme`, « l'empilement seul » (the default, and the plate the page ships in).** Sixteen stacks
from a shared zero, France's running almost the full width and nearly all of it one band; the rail
lane under every bar is empty. The 2000 ticks sit far right on France and Sweden and hard against the
origin on Poland, the Netherlands and Spain — which is the headline drawn as a distance.

**`creme`, « l'éolien ».** The argument in one gesture. Germany's rail is **234 px** at 1440 wide,
the longest on the plate, under a bar that is second; France's rail is a third of it under the
longest bar on the plate, whose wind band ends further right than anyone's. Britain's rail is second
and its bar is fourth. Nothing in the stack moved: the plot's top edge is at the same pixel in all
five states (216 px on `creme`, 215 on `nocturne`, 212 on `rapport`), and so is the first bar's.

**`creme`, « l'hydraulique ».** Fourteen rails of sixteen are visible and two are not — Denmark's
0,02 TWh and the Netherlands' 0,09 are under half a pixel. That is the fact and not a drawing
problem: those two countries have essentially no hydro, and the rail is drawn at zero rather than
withheld.

**`nocturne`.** The mint ramp on the marine ground is the widest-spread of the three (1,371 – 1,377:1
between neighbours against 1,210 – 1,249 on the light ones), so the five bands separate best here.
The chosen pill's mint ring on the marine wash is the clearest of the three selection cues. The
control's sentence is set in the direction's own annot voice — small caps, tracked — which reads
louder than its content deserves; it is the direction's treatment and the dot strip's own precedent,
and it is left alone.

**`rapport`** is `creme`'s geometry on white with a deeper blue. **Its chosen pill is a pale wash
with a blue ring and black words, not a solid black slab** — the branch's systemic defect (b), fixed
in the trunk before this beat was written and inherited here by calling `control-chrome.ts` rather
than copying it.

**What all three still show, and it is not fixed here.** The 2000 tick crosses a segment's own figure
on five of sixteen rows. The halo thins the tick around the digits and both stay readable, but the
tick is visibly interrupted at `74` on Germany and `83` on Britain. Naming it rather than calling it
solved.

## Verification

- `verify-web.mjs` per direction: **creme 101 passed / 0 failed / 6 skipped, nocturne 99 / 0 / 5,
  rapport 93 / 0 / 5.** The skips are the filter's, which this beat has none of, plus one typeface
  attribution the build-time scan cannot make.
- **The plot cell carries its own viewBox.** Driven in Chrome at 1512x860, 1440x900, 1280x1024 and
  375x812, `svg.chart.getBoundingClientRect()` against `svg.viewBox.baseVal`: anisotropy
  `scaleX / scaleY` is **1,0000** on ten of the twelve measurements and **1,0001 / 1,0002** on the
  other two, against a bar of ±0,005.
- **Driven once with the script on and once with it off**, at 1440 x 900, every pill clicked with
  real mouse events. The two runs are identical to the byte on every measurement: the same rail count
  per option (0 · 14 · 16 · 16 · 16), the same widest rail per option (118 · 234 · 122 · 85 px on
  `creme`), one sentence revealed, the note row the same 39 px whatever is chosen, and the plot's top
  edge and the first bar's top edge at the same pixel in every state. The control is CSS; nothing
  here needs a script.
- **The chosen pill, on the painted pixel**, after the 120 ms transition: wash **1,409 / 1,619 /
  1,410:1** against the ground, ring **6,637 / 10,797 / 7,090:1**, chosen words on the wash
  **14,49 / 10,98 / 14,89:1**, unchosen words **6,13 / 7,28 / 6,19:1**. A wash and a ring, at a
  twelfth of an ink slab's weight.
- **Every family a text node names is embedded**, exact match, in all three directions: creme 6
  asked / 6 carried, nocturne 5 / 5, rapport 5 / 5, `assertFontsEmbedded` green on each.
- `bun test skills/chart-web/test/` — **203 pass, 0 fail**. `bun test` over nine splash guards
  (interaction, cross-skill imports, filter parity, no colour of its own, no leading, leading through
  the register, filters declared or absent, number format, notes) — **548 pass, 0 fail**.
  `bunx tsc --noEmit` — no error on either file.

## Mutations — six, all red, none green

1. **A rung that rebases the baseline band** (« le nucléaire » added to the ladder). Red twice: the
   runner refuses first, *"nucléaire: the stack ranks every pair the right way round"*, and the
   vocabulary's own `assertRebaseDeclaration`, called directly on the same bands, refuses with
   *"0 of 120 pairs are inverted … true of exactly one band per stack: the one on the baseline"*. The
   runner's is an uncaught throw at module level rather than a per-direction refusal — recorded
   because a crash can look like a pass; here it exits 1 before any page is written, so no stale
   render can be mistaken for a fresh one.
2. **`rebaseCss` dropped from the beat's own stylesheet.** Refused in all three directions by
   `assertOneRebasing` reading the written page back — *"nothing in the page's stylesheet answers the
   option"*. This is `descend.ts`'s and `aim.ts`'s recorded hole, red here because the check was
   written from their record rather than discovered again.
3. **The blanket rule emitted AFTER the options' widths.** Refused in all three directions. This is
   the mutation that went GREEN on `weigh.ts` and shipped a beeswarm with no marks in it in any
   engine without `:has()`; it is inherited as an ordering check rather than a presence one, and it
   fires.
4. **Six bands asked of a one-hue ramp** (the separation floor raised to 1,45). Refused in all three,
   naming both numbers: *"#1757b6 and #2c66bb … stand 1,211:1 apart"*.
5. **A rail whose length is not its band's** (every declared value scaled by 1,02). Refused:
   *"rails FRA at 72,5424 while the stack draws that band 71,12 long"* — the runner's derivation
   against the component's, which is the only reason that check is a check.
6. **The readable floor raised past every rail.** Refused, naming the rail in both units:
   *"71,12 in the data's unit (106,0 geometry units), under the 125 this beat measured"*, and the
   floor differs per direction because the gutters do.

Every mutation was restored and the three renders verified byte-identical to their pre-mutation
copies before anything was committed.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2000 and
2024. `data.csv` is a byte-for-byte copy of `proof/static-stacked-bar-lowcarbon-growth/data.csv`.
