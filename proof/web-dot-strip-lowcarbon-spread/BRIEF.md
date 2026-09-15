---
format: web
type: dot-strip
---

# Beat — Le plancher européen est monté de 30 points, le plafond de 2 (web)

**Type:** dot strip. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Between 2000 and 2024 the **floor** of Europe's low-carbon electricity share rose **29,5 points**
(Poland, 1,6 % → 31,1 %) while the **ceiling** rose **2,1** (Sweden, 96,7 % → 98,8 %). The spread
between them closes by **27,4 points**, 95,1 → 67,6, and the median moves from **27,5 % to 70,6 %**.

The runner refuses to render if the floor did not rise far while the ceiling barely moved, if the
spread did not close by more than a fifth, or if the last rung of the control's ladder does not
OPEN the spread instead of closing it — that last one is the whole of what this page argues, and it
is asserted rather than described.

## The interaction, written before the code

### The reader's question, and the property of a dot strip that provokes it

*« 27 points d'écart en moins — c'est vrai de quoi, exactement ? »*

A dot strip is the most stripped-back distribution in the catalogue and the only **lossless** one.
One axis, one dot per case, no bin, no pack, no summary: every one of the sixteen countries is drawn
at its own exact value and nothing else is drawn at all. A histogram gives up exact position to buy
counts; a boxplot gives up fifteen of the sixteen to buy five numbers; a beeswarm gives up the
perpendicular — and some of the horizontal — to buy separation. This type gives up nothing, and what
it hands back for that is the one reading none of the others can give: **the shape of the field
itself**, read as a shape.

And a shape of what? Of a quantity **somebody defined**. « La part bas-carbone » is not a
measurement, it is a sum over a list of sources that a person chose — and in European electricity
that list is the argument, not the preamble to it. Nuclear is on it. Hydro is on it. Both were built
decades before either date on this plate. A still has to pick one list, print it in the caveat and
ask to be trusted; that is exactly what the static sibling does, and it is honest, and it is one
picture.

### The gesture: the reader chooses what counts

**`qualify.ts`, written for this beat — what counts as the thing the axis measures.** Four rungs,
each one taking one more source out of the numerator. The **denominator never changes**: it is total
generation, all nine columns, in every rung. So no dot is re-scaled, nothing is re-based, and every
position on the rail stays a real share of the same real total.

| rung | the axis measures | 2000 spread | 2024 spread | |
| --- | --- | ---: | ---: | --- |
| **le bas-carbone** *(default, the static plate)* | nucléaire + hydro + éolien + solaire + bioénergie | 95,1 | **67,6** | **−27,4** |
| **sans le nucléaire** | the same, less nuclear | 71,6 | **72,3** | **+0,7** |
| **ni l'hydraulique** | what was actually built since | 15,3 | **75,9** | **+60,6** |
| **ni la bioénergie** | wind and solar, and nothing else | 11,8 | **63,1** | **+51,3** |

**The convergence is a property of the legacy fleet, and it reverses the moment the legacy fleet
stops counting.** Take nuclear out and the spread does not close by a fifth — it does not close at
all, it opens by 0,7 of a point. Take hydro out as well and the sixteen, who in 2000 were all inside
a **15,3-point** band because nobody had built anything yet, are in 2024 spread over **75,9** — five
times wider. Same sixteen countries, same two dates, same rail, same denominator; whether Europe
converged or came apart depends entirely on which sources you agree to count.

### Why a still, a video and a scrolly all fall short of it

A still picks one list and the reader cannot know there was a list. A video and a scrolly can walk
all four, but **on the author's clock, in the author's order, once** — and this comparison is not a
walk, it is a back-and-forth. The reader who wants to know whether France's fall down the ladder is
bigger than Sweden's has to go back to the first rung and leave it again, twice, which is the one
thing a timeline cannot give. And the ladder's own direction is only legible as a return: rung three
is *further* from rung one than rung two is, and you can only see that by going back.

### Why it is a dot strip's gesture and nobody else's

Because a dot strip has **nothing to re-derive**. Re-define the measured quantity and each of its
sixteen marks takes a new position on the same rail and the chart is finished: the axis keeps its
meaning, the ticks keep their numbers, the lanes keep their dates, no layout is recomputed and the
reader re-learns nothing. Every other type has to rebuild something, and the rebuild is what destroys
the reading:

- a **histogram** re-bins, and its bars change position *and* height at once, so a reader cannot tell
  which of the two moved;
- a **beeswarm** re-packs, so marks move across the baseline as well — in a direction that carries no
  data at all — and the type's own aggregate statement, the swarm's width, is re-derived under the
  reader's hand;
- a **boxplot** re-derives five numbers and shows none of the sixteen, so there is nothing to check
  the new definition against;
- a **bar chart's** marks are lengths welded to labels, so a redefinition reads as sixteen separate
  numbers changing, one at a time, rather than as a field changing shape.

The reading this control hands back — *did the field converge or come apart* — is a statement about
the span and the density of sixteen positions and about no single one of them. That is the one
reading a dot strip exists to give, and re-qualifying is the only operation that changes it while
touching nothing the reader has already learned to read.

### What moves, what cuts, and what never moves at all

- **Nothing moves across the rail, ever.** Each country's perpendicular offset is a deterministic
  jitter derived from its own code — the type sheet's own device, so overlap shows through
  transparency instead of being resolved by pushing points apart — and it is **identical in all four
  rungs**. The only axis a mark can move along is the one that carries the data. This is refused in
  `qualify.ts` rather than hoped for.
- **Every dot moves LEFT or stays put**, at every rung, without exception: the ladder is a strict
  subtraction, so a share can only fall. That is the visible reason the owner's first arbitration
  asks for — the whole field moves the same way and the pill names what was taken out of it — and a
  rung that moved one mark right is refused in those words.
- **The rungs cut, and the reason is mechanical.** `interaction.mjs` resolves the mark under a
  pointer from `cx`/`cy` read once at init, which no CSS transform ever changes, so a dot animated
  along the rail would keep answering for the value it left — the worst answer this chart can give,
  since on this type the position **is** the datum. Each rung is therefore its own
  `<svg class="chart">`, drawn once at its own values; a hidden `<svg>` has no CTM and no focusable
  content, so pointer and keyboard only ever reach the rail on screen. Same discipline as `weigh.ts`,
  `floor.ts` and `descend.ts`, for the reason all three record.
- **What travels is the span bar**, one per lane: a bar under each rail running from that rung's
  floor to its ceiling, always rendered, its `left` and `width` generated per rung and transitioned.
  It is the reading itself — the two bars swap relative lengths between the first rung and the third
  — and it is the one element on the page whose movement a reader can see the reason for, because
  the movement *is* the reason.
- **No text moves.** Not one word. The lane headings, the four statistics each lane prints, the axis
  graduations, the two named countries and the span figures all sit at fixed anchors; the per-rung
  variants are separate spans at the same place, revealed by the same `:checked`. See the trap below
  for why that is not merely tidy.

### Ask a mark, and the answer is the rung's own question

Hover, tap or Tab any dot. All thirty-two answer, and **the answer is different in every rung,
because the question is**: the country, its share under *this* definition on *this* rail, its share
on the other rail, and **how many points the sources this rung has taken out are worth to it**. Under
« ni la bioénergie », France answers that the 82,4 points it has lost are the largest fall
of the sixteen; Ireland answers 5,7, the smallest. Neither number is on any plate. Every one of them
is derived in the runner from the frozen file and baked into the mark server-side; the browser
formats nothing.

### What was designed and NOT shipped

- **A fifth rung, « le fossile »** — the mirror of the first. Refused: it is the only rung that is not
  a subtraction from its predecessor, so the field would jump right instead of left and the one
  visible rule holding the ladder together would break for one pill. The same reading is available by
  reading the default rail from the other end, which costs nothing.
- **Connecting the two rails.** Refused, and it is the static sibling's own refusal: a dot strip that
  grows lines between its lanes has become a slope chart. The rails are two shapes. A country's
  movement between them is a reading the pointer gives — and now, down the ladder, a reading the
  pointer gives four times.

## The vocabulary: `qualify.ts`, written for this beat

Eighteen files already exist and none of them expresses it. The near misses, and why each one is a
miss rather than a near thing:

- **`withdraw.ts`** is the closest by its words and the furthest by its arithmetic. It takes a term
  out of a **sum** — a bridge's running total — and its whole vocabulary is about what the rest of
  the sum does without it: `resteps` (a step keeps its size and changes its start), `cuts` (the
  connectors the hole invalidates), `close` (the one bar measured from zero, re-drawn rather than
  moved). There is no running total here, no downstream, no closing level, and **no mark keeps its
  size while changing position**: every mark changes its VALUE, which is the only thing it has.
- **`descend.ts`** re-parents: a branch becomes the whole and a mark's size stops meaning "share of
  the root". That is a changed **denominator**, and a changed denominator is precisely what this
  ladder refuses — it is declared per rung and checked equal to the default's, because the honesty of
  the whole gesture is that only the numerator is being cut.
- **`weigh.ts`** changes what a mark is WORTH and therefore how much room it claims; every mark keeps
  its value and the packing is re-derived. Here it is the exact opposite: the value changes and
  nothing is re-derived at all.
- **`filter.ts`** removes marks — nothing leaves here, in any rung. **`level.ts`** and `datum.ts` lay
  a reference across or move a zero; the rail's zero never moves. **`cutoff.ts`** sweeps a threshold
  along the encoded quantity and partitions the marks into two sides; this changes the quantity
  itself and partitions nothing. **`brush.ts`** picks a span OF the axis; this changes what the axis
  measures. **`stack.ts`**, **`hold.ts`**, **`floor.ts`**, **`fold.ts`**, **`aim.ts`** are all a
  transform of a drawing that exists — a displacement, an affine, a shear, a reflection, a rotation —
  and every one of them is expressible as a `transform` on a drawn element. This one is not, and
  cannot be: a re-qualified mark is a different number.
- **`trace.ts`**, **`follow.ts`**, **`reorder.ts`**, **`count.ts`**, **`benchmark.ts`** follow a
  datum, walk an order, hand the axes round a circle, choose what is counted in a cyclic frame, or
  hand over a target. None of them touches what a position means.

So: **`qualify.ts` says WHAT COUNTS AS THE THING THE AXIS MEASURES** — one denominator, a declared
ladder of numerators, and every mark at the exact position its new value puts it at.

The mechanism is the shared one and nothing else: native `input[type=radio]` in a real `<fieldset>`,
plus CSS generated at build time (`:has()` + `:checked`). No script, no listener. With JavaScript off
the reader gets the complete default plate **and a working control**.

### Its refusals, each one a picture that would lie

- **A rung that adds instead of taking away.** Every mark, in every lane, must sit at or left of
  where the previous rung put it. A ladder whose pills say *sans le nucléaire* while a dot moves right
  is a ladder measuring something else, and the reader's only rule for reading it is gone.
- **A rung that takes nothing from anyone.** If no mark moves by more than a declared floor, the rung
  is its predecessor under a second name, which `directed-interaction.md` refuses outright.
- **A rung whose own reading equals the default's.** Measured separately from the one above, because
  a rung can move every mark and still hand back the same spread. The spread is the reading.
- **A mark that moves across the rail.** The perpendicular offset is jitter and carries nothing; a
  rung that changed it would show the reader movement in a direction with no data in it. Checked per
  mark against the default.
- **A changed denominator.** Declared per rung, required identical to the default's. This is the one
  refusal that separates this file from `descend.ts`, and it is the difference between "fewer sources
  count" and "the total is smaller".
- **A mark that leaves, or arrives**, on either lane. Every rung seats the same key set.
- **A value off the rail** — a share outside the axis the beat drew is a mark drawn nowhere.
- **A rung with no sentence**, and **a default that carries one** — the untouched picture is the
  claim, not a comparison.
- **An accessible name that does not contain its visible label** (WCAG 2.5.3).
- **A half-tagged datum**, **a vocabulary that emits no rules**, and **the blanket rule emitted after
  the default rail's reveal** — all three read back off the WRITTEN page by `assertOneQualifying`.
  The third is `weigh.ts`'s own finding, taken here as inherited rather than re-earned: two attribute
  selectors score identically, source order is the whole mechanism, and the only engine the base pair
  ever decides anything for is one without `:has()`, which neither the render path nor the verifier
  is.

## The type sheet's trap, and what it turned out to be here

`types/dot-strip.md` files one failure and it is not about the dots: the type's legend is **hand-built
rather than drawn from the shared legend system**, and on a real embed *"the space reserved for it and
the space it actually needed at that width had quietly drifted apart"* — eighteen pixels past the
frame's right edge. The prescribed fix is exact: **one function decides both how much room to reserve
AND where the content breaks, so the two can never disagree.**

Its literal form is absent — this page has no legend, because it has no colour to explain. **Its
reason is wide open and this control opened it a second time.** The page's hand-built chrome is the
statistics row each lane prints: *plancher · milieu · plafond · écart*, four numbers per lane per
rung, sixteen strings a rung never sees at once. The first design anchored each of them **at its own
value on the rail**, which is what the static sibling does and what reads best on the default rung.
Under « ni la bioénergie » the 2000 rail's floor is 0,0 %, its median 0,3 % and its ceiling 11,8 %:
three labels inside 12 % of an 880-unit rail, for three runs of text that are wider than that between
them.
That is the sheet's defect exactly — chrome laid out from one state's numbers, overrunning in a state
nobody measured — except that the second state is not a narrow viewport, it is a rung of the control.

So the fix is the sheet's own, applied to what this page actually has: `qualifyStatRow` measures
every rung's row for every lane in one pass and returns, from that same pass, both the rows and the
room — and it **refuses rather than wrapping**, because a row that wraps is a row whose reserved
height is a guess, which is the defect itself in its original costume. The numbers sit in a fixed row
above their rail rather than at their values, and the ticks on the rail carry the positions. Measured
on what shipped: the widest of the eight rows is **397,4 px of the 880 px** the frame gives it on
`creme` and 323,0 px on the other two. Nothing wraps, nothing collides, and nothing moves when a rung
changes — which is the owner's first arbitration, arrived at from the opposite direction.

## Treatments spent

- `the-distribution-is-furniture-and-the-case-is-ink` — the field is drawn in one achromatic tone in
  all four rungs; colour is spent on two cases and nowhere else.
- `context-in-neutral-at-the-subject-scale` — fifteen countries in the field's own tone, never fifteen
  hues, which is the static sibling's own measured refusal.
- `each-rail-is-headed-by-what-it-is` — each rail prints its own date and its own four statistics, so
  the two shapes are comparable without counting dots.
- `the-subject-is-ringed-not-recoloured` — **refused**, for the static sibling's reason: there is no
  category to keep, every mark is one country of sixteen, and colour encodes nothing before the accent
  is spent. The subject is recoloured.
- `value-on-the-mark` — **refused, and the owner's first arbitration is the reason.** The figure
  belongs to the span, and the span bar is the one object on this page that travels. A figure welded
  to it would be the only text on the page that moves, which is the thing he refused twice. So each
  rail's four numbers sit in a fixed row above it, one variant per rung, and the bar underneath is
  the same reading drawn as a length.

## The two accented cases, and why they are drawn in every rung

**Poland** is the subject — the floor in 2000, which is what the headline is about — and
`web-discipline.md` requires the accent on the subject to be drawn unconditionally. **France** is
derived, not chosen: it is the country that falls furthest down the ladder, **82,4 points**, and the
runner asserts that before it draws it.

What the two buy is the argument in two dots. Under « le bas-carbone » Poland is the floor of the
2024 rail (31,1 %, rank 1 of 16) and France sits near the top (94,9 %, rank 14). Under « ni la
bioénergie » they have **swapped sides**: France is 12,5 % and second from the bottom, Poland is
25,3 % and fifth. Poland loses 5,8 points to the ladder — almost the least of the sixteen — because it
has no nuclear and almost no hydro, so nearly all of its low-carbon electricity is something built in
the last twenty years. France loses 82,4 because almost none of its is.

## What the three renders show

**`creme`, « le bas-carbone » (the default, and the static sibling's own picture).** Two rails. The
2000 rail's field runs almost the whole width, thin at both ends and bunched between 15 and 45; the
2024 rail's starts a third of the way in and crowds the right half. Under each, a heavy bar from that
rail's floor to its ceiling: **1 294 px against 920** at 1440 wide, which is the headline drawn as two
lengths. Poland's accented dot is the left end of the upper bar and sits a third of the way along the
lower one — the floor that moved. France's is near the right end of both.

**`creme`, « sans le nucléaire ».** The two bars come out **almost exactly the same length** (974
against 984 px) — the reading the rung hands back, visible before the sentence under the control is
read. France's accented dot has fallen from near the right end of the 2024 rail to just past a
quarter, and the 2000 rail's ceiling has moved in from 96,7 to 72,8.

**`creme` and `nocturne`, « ni l'hydraulique ».** The one the control was built for, and it is the
first picture inverted: the 2000 bar is a **208 px stub** at the left edge with all sixteen dots
piled into it, several visibly darker where two overlap, and the 2024 bar runs **1 032 px** across
three quarters of the frame. On `nocturne` the mint reads cleanly off the muted purple field (1,96:1
painted) and the two bars are the strongest thing on the page.

**`creme`, « ni la bioénergie ».** 161 px against 859. The 2000 rail is a cluster against the left
inset — which is the fact, not a drawing problem: in 2000 nobody had built wind or solar, and the
spread of sixteen countries is 11,8 points.

**`rapport`** is `creme`'s geometry on a white ground with a deeper blue accent (4,98:1 painted);
nothing differs but the palette and the header treatment, which is what a direction is. Its checked
pill is a solid black slab, which is the branch's known systemic defect (b) arriving here unchanged —
the chrome is copied from a sibling vocabulary without variation, on purpose, so the trunk pass
rewrites all of them at once.

Three things the captures taught, all fixed above: five dots at 0,0 % drawn as half-moons, because a
circle centred on the frame's left edge is half outside the `viewBox` (now one padded mapping,
`qualifyPlace`, shared by the geometry and the bars); four pills 610 px wide in a 375 px window,
because the chrome copied from `weigh.ts` says `flex: 0 0 auto` where the owner's arbitration says
`0 1 auto` and a no-shrink row cannot wrap; and a fifteen-word title that left `nocturne` 28 px past
its own window with the source line off screen.

## Verification

- `verify-web.mjs` per direction: **creme 105 passed / 0 failed / 5 skipped, nocturne 93 / 0 / 5,
  rapport 93 / 0 / 5.** The skips are the filter's, which this beat has none of.
- Driven in a real browser at 1440 x 900, every pill clicked with real mouse events, **once with the
  script on and once with it off**. The two runs are identical to the byte on every measurement: one
  rail displayed, 32 dots, one statistics row per lane, exactly one sentence revealed, and the eight
  span bars at the same eight `left`/`width` pairs. The control is CSS; nothing here needs a script.
- Hover exercised in all three directions and in two rungs. Under « le bas-carbone », France answers
  *« France · 2024 : 94,9 % · 2000 : 90,7 % · rang 14 sur 16 en 2024, 15 en 2000 »*; under « ni la
  bioénergie », the same dot answers *« France · 2024 : 12,5 % · 82,4 points de moins qu'avec le
  nucléaire, l'hydraulique et la bioénergie · 2000 : 0,0 % · rang 2 sur 16 en 2024 »*. Different
  question, different answer, same mark. Exactly one dot takes `.mark-active` in every case, and it
  darkens off its own painted colour.
- The marks are round: measured in a driven browser at 1440 x 900, a dot is **19,0 x 19,8 px, ratio
  0,96**. The 880 x 334 frame is one the window does not have to take height away from at that size,
  which is the whole of why — systemic defect (a) is not fixed here, it is avoided by the frame.
- `bun test skills/chart-web/test skills/splash/test/web-interaction-changes-the-picture.test.ts
  skills/splash/test/no-cross-skill-imports.test.ts skills/splash/test/filter-vocabulary-parity.test.ts`
  — **410 pass, 1 fail**, the one being `chart-web — the canon's assets … preview.png is a current
  render of the seed`, a stale committed render of a seed this beat does not touch. And
  `bun test skills/splash/test/{a-directed-plate-names-no-colour-of-its-own,a-directed-layout-types-no-leading,a-leading-is-read-only-through-the-register,filters-are-declared-or-absent,number-format-honest,notes}.test.ts`
  — **310 pass, 0 fail**.

### Mutations

1. **A rung that adds a source back** (nuclear returned to « ni l'hydraulique »). Refused in all
   three directions, naming the first mark it caught: *"rung « ni l'hydraulique » moves NLD on lane
   2000 from 3.37 to 7.68 — to the RIGHT of the rung before it."* The runner exits 1 and takes the
   three stale renders off the disk, verified by listing the directory, which came back empty.
2. **`qualifyCss` dropped from the beat's stylesheet.** Refused by `assertOneQualifying` reading the
   written page back — *"nothing in the page's stylesheet reveals the rung «low-carbon»"*. This is
   `descend.ts`'s and `aim.ts`'s recorded hole, red here because the check was written from their
   record rather than discovered again.
3. **The blanket hide emitted AFTER the default rail's reveal.** Refused in all three directions.
   This is the mutation that went GREEN on `weigh.ts` and shipped a beeswarm with no marks in it in
   any engine without `:has()`; it is inherited as an ordering check rather than a presence one, and
   it fires.
4. **A rung that moves a mark across its rail** (the jitter scaled by 0,8 outside the default).
   Refused: *"moves BEL across lane 2000, from -21.78 to -17.42 … a rung that changes it shows a
   reader movement in a direction with nothing in it."*
5. **A statistics row too long for its room — and the first attempt STAYED GREEN.** Lengthening the
   row to *"plancher Pologne 1,6 % · milieu des seize 27,5 % · plafond Suède 96,7 % · écart du
   plancher au plafond 95,1 points de pourcentage"* rendered fine, because it still measured under
   880 px. That is a finding about the beat rather than about the guard: what shipped is **397,4 px
   of 880** at its widest, so there is more than twice the room, and the guard is nowhere near
   binding on this data. Pushed to a genuinely over-long row, it fires and names both numbers:
   *"lane 2024 heads rung renewable with 1246.0 px of text in 880.0 px of room."* Both halves are
   reported rather than only the red one.

## The case floor, which was found by measuring and not by looking

Painted at `fill-opacity: 0.72` and calibrated against the ground alone, the accent stood **1,18:1
against its own field on `creme`** and 1,25:1 on `rapport` — the transparency this type needs eating
exactly the separation the accent was calibrated for. A dot strip's accent is not marking a bar
against a background, it is marking two dots among thirty-two identical ones, so the component now
searches an adjustment clearing **both** 3:1 against the ground and a declared **1,6:1 against the
painted field**, and refuses if none does. Taken: 1,64 / 1,64 / 1,96. `PALETTE.md` carries the whole
table, and every colour in it is the composite the page paints rather than the fill it writes.

## The hard-coded `lineHeight`

This beat is not on `KNOWN-STATE.md`'s list of ten and it carries no `lineHeight` on any text style:
every text style spreads a register and adds nothing to it. The one number that looks like one is
`lineHeightPx` handed to `qualifyStatRow`, which is the reserved HEIGHT OF A ROW OF CHROME in CSS
pixels — the same class of decision `KNOWN-STATE.md` puts outside the register ("des décisions de
hauteur de composant, pas de rythme de texte") — and `a-directed-layout-types-no-leading` passes.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · 2000 and
2024. `data.csv` is a byte-for-byte copy of `proof/static-dot-strip-lowcarbon-spread/data.csv`. Every
rung's numerator is a sum over the file's own generation columns and every rung's denominator is the
sum over all nine, which is what makes a position on this rail a share of the same total in all four.
